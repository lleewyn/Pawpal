// login.js - Xử lý logic đăng nhập Cổng Quản trị Pawpal-er

(function() {
    const formLogin = document.getElementById('formAdminLogin');
    const inputEmail = document.getElementById('inputAdminEmail');
    const inputPassword = document.getElementById('inputAdminPassword');
    const btnSubmit = document.getElementById('btnSubmitAdminLogin');
    const errorMsg = document.getElementById('loginErrorMessage');
    const btnToggleView = document.getElementById('btnTogglePasswordView');

    const sectionLogin = document.getElementById('sectionLogin');
    const sectionChangePass = document.getElementById('sectionFirstChangePassword');
    const formChangePass = document.getElementById('formFirstChangePassword');
    const inputNewPass = document.getElementById('inputNewPassword');
    const inputConfirmPass = document.getElementById('inputConfirmPassword');
    const btnSubmitChangePass = document.getElementById('btnSubmitChangePass');
    const changePassErrorMsg = document.getElementById('changePassErrorMessage');

    let currentAuthenticatedUser = null;
    let currentStaffRecord = null;

    // Ẩn/Hiện mật khẩu
    if (btnToggleView && inputPassword) {
        btnToggleView.addEventListener('click', () => {
            const isPass = inputPassword.type === 'password';
            inputPassword.type = isPass ? 'text' : 'password';
            btnToggleView.textContent = isPass ? 'Ẩn' : 'Hiện';
        });
    }

    function showError(msg) {
        if (errorMsg) {
            errorMsg.textContent = msg;
            errorMsg.style.display = 'block';
        }
    }

    function clearError() {
        if (errorMsg) {
            errorMsg.textContent = '';
            errorMsg.style.display = 'none';
        }
    }

    function showChangePassError(msg) {
        if (changePassErrorMsg) {
            changePassErrorMsg.textContent = msg;
            changePassErrorMsg.style.display = 'block';
        }
    }

    // Xử lý nạp Supabase Client
    function getDb() {
        return window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    }

    // Xử lý Đăng nhập Cổng Quản trị
    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            clearError();

            const email = inputEmail.value.trim();
            const password = inputPassword.value;

            if (!email || !password) {
                showError('Vui lòng nhập đầy đủ Email công vụ và Mật khẩu.');
                return;
            }

            const db = getDb();
            if (!db) {
                showError('Không thể kết nối đến máy chủ xác thực. Vui lòng thử lại sau.');
                return;
            }

            btnSubmit.disabled = true;
            btnSubmit.textContent = 'Đang xác thực...';

            try {
                // 1. Xác thực thông tin đăng nhập qua Supabase Auth
                const { data: authData, error: authErr } = await db.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (authErr || !authData?.user) {
                    showError('Email hoặc mật khẩu không chính xác.');
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Đăng nhập hệ thống';
                    return;
                }

                const authUser = authData.user;
                currentAuthenticatedUser = authUser;

                // 2. KIỂM TRA CÔ LẬP 2 CHIỀU: Xác thực quyền hạn nhân sự (STAFF/ADMIN)
                let isStaff = false;
                let isActive = false;
                let staffRecord = null;

                try {
                    const { data: checkData, error: rpcErr } = await db.rpc('check_user_account_type', {
                        check_auth_id: authUser.id
                    });
                    if (!rpcErr && Array.isArray(checkData) && checkData.length > 0) {
                        isStaff = checkData[0].user_type === 'STAFF';
                        isActive = checkData[0].is_active;
                    }
                } catch (e) {}

                // Truy vấn trực tiếp hồ sơ nhân sự trong bảng public.staff
                const { data: staffList, error: staffErr } = await db
                    .from('staff')
                    .select('*')
                    .eq('auth_user_id', authUser.id)
                    .limit(1);

                if (!staffErr && staffList && staffList.length > 0) {
                    staffRecord = staffList[0];
                    isStaff = true;
                    isActive = staffRecord.account_status === 'ACTIVE';
                }

                if (!isStaff) {
                    // TÀI KHOẢN KHÁCH HÀNG HOẶC KHÔNG THUỘC STAFF -> TỪ CHỐI VÀ ĐĂNG XUẤT NGAY LẬP TỨC
                    await db.auth.signOut();
                    showError('Tài khoản này không có quyền truy cập Cổng Quản trị Pawpal-er. Vui lòng đăng nhập tại Cổng Khách hàng.');
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Đăng nhập hệ thống';
                    return;
                }

                // 3. Kiểm tra trạng thái hoạt động của nhân viên
                if (!isActive || staffRecord?.account_status !== 'ACTIVE') {
                    await db.auth.signOut();
                    showError('Tài khoản công vụ của bạn đã bị khóa hoặc tạm ngưng hoạt động. Vui lòng liên hệ Quản lý.');
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Đăng nhập hệ thống';
                    return;
                }

                if (!staffRecord) {
                    await db.auth.signOut();
                    showError('Không tìm thấy thông tin hồ sơ nhân viên tương ứng.');
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Đăng nhập hệ thống';
                    return;
                }

                const staff = staffRecord;
                currentStaffRecord = staff;

                // 5. Kiểm tra yêu cầu đổi mật khẩu ở lần đăng nhập đầu tiên
                if (staff.must_change_password) {
                    sectionLogin.classList.remove('active');
                    sectionChangePass.classList.add('active');
                    inputNewPass.focus();
                    return;
                }

                // 6. Đăng nhập thành công -> Cập nhật last_login_at và chuyển hướng vào Admin
                await finalizeAdminLogin(staff, authUser);

            } catch (err) {
                console.error('[AdminLogin] Exception:', err);
                showError('Đã xảy ra sự cố trong quá trình xác thực. Vui lòng thử lại.');
                btnSubmit.disabled = false;
                btnSubmit.textContent = 'Đăng nhập hệ thống';
            }
        });
    }

    // Xử lý Lưu mật khẩu mới lần đầu
    if (formChangePass) {
        formChangePass.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (changePassErrorMsg) changePassErrorMsg.style.display = 'none';

            const newPass = inputNewPass.value;
            const confirmPass = inputConfirmPass.value;

            if (!newPass || newPass.length < 6) {
                showChangePassError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
                return;
            }
            if (newPass !== confirmPass) {
                showChangePassError('Xác nhận mật khẩu không khớp. Vui lòng nhập lại.');
                return;
            }

            btnSubmitChangePass.disabled = true;
            btnSubmitChangePass.textContent = 'Đang cập nhật mật khẩu...';

            const db = getDb();
            try {
                // Cập nhật mật khẩu trong Supabase Auth
                const { error: updateAuthErr } = await db.auth.updateUser({
                    password: newPass
                });

                if (updateAuthErr) {
                    showChangePassError('Lỗi cập nhật mật khẩu: ' + updateAuthErr.message);
                    btnSubmitChangePass.disabled = false;
                    btnSubmitChangePass.textContent = 'Lưu mật khẩu và vào hệ thống';
                    return;
                }

                // Cập nhật must_change_password = false trong bảng public.staff
                if (currentStaffRecord) {
                    await db.from('staff').update({
                        must_change_password: false,
                        updated_at: new Date().toISOString()
                    }).eq('id', currentStaffRecord.id);
                }

                await finalizeAdminLogin(currentStaffRecord, currentAuthenticatedUser);

            } catch (err) {
                console.error('[ChangePassword] Exception:', err);
                showChangePassError('Không thể cập nhật mật khẩu: ' + err.message);
                btnSubmitChangePass.disabled = false;
                btnSubmitChangePass.textContent = 'Lưu mật khẩu và vào hệ thống';
            }
        });
    }

    // Hoàn tất phiên đăng nhập và chuyển hướng
    async function finalizeAdminLogin(staff, authUser) {
        const db = getDb();
        try {
            if (staff?.id) {
                await db.from('staff').update({
                    last_login_at: new Date().toISOString()
                }).eq('id', staff.id);
            }
        } catch (e) {}

        const adminSession = {
            id: staff.id,
            rawId: staff.id,
            auth_user_id: authUser.id,
            name: staff.full_name || 'Nhân viên PawPal',
            full_name: staff.full_name || 'Nhân viên PawPal',
            phone: staff.phone_number || staff.phone || '',
            email: authUser.email || staff.email || '',
            role: (staff.system_role || 'ADMIN').toLowerCase(),
            system_role: staff.system_role || 'STAFF',
            position: staff.specialization || staff.role || 'Quản trị viên',
            permissions: Array.isArray(staff.permissions) ? staff.permissions : [],
            _source: 'supabase_auth'
        };

        localStorage.setItem('pawpal_admin_user', JSON.stringify(adminSession));
        sessionStorage.setItem('pawpal_admin_user', JSON.stringify(adminSession));

        // Cô lập nghiêm ngặt: Tuyệt đối không để tài khoản công vụ ghi đè lên session Khách hàng
        try {
            const cusUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            if (cusUser && (cusUser.system_role === 'ADMIN' || cusUser.system_role === 'STAFF' || cusUser.role === 'admin')) {
                localStorage.removeItem('pawpal_current_user');
                sessionStorage.removeItem('pawpal_current_user');
            }
        } catch (e) {}

        window.location.replace('/admin');
    }
})();
