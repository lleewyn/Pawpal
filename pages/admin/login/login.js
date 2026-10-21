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

    async function loadStaffContext(db) {
        const { data, error } = await db.rpc('get_staff_login_context');
        if (error) throw new Error('Không thể kiểm tra quyền đăng nhập. Vui lòng thử lại.');
        return data;
    }

    async function clearAdminLogin(db) {
        currentAuthenticatedUser = null;
        currentStaffRecord = null;
        localStorage.removeItem('pawpal_admin_user');
        sessionStorage.removeItem('pawpal_admin_user');
        await db.auth.signOut({ scope: 'local' });
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

                // V1: trạng thái công việc và quyền lấy từ quan hệ vai trò trên máy chủ.
                const context = await loadStaffContext(db);
                const staffRecord = context?.staff;

                if (!context?.is_staff || !staffRecord) {
                    // TÀI KHOẢN KHÁCH HÀNG HOẶC KHÔNG THUỘC STAFF -> TỪ CHỐI VÀ ĐĂNG XUẤT NGAY LẬP TỨC
                    await clearAdminLogin(db);
                    showError('Tài khoản này không có quyền truy cập Cổng Quản trị Pawpal-er. Vui lòng đăng nhập tại Cổng Khách hàng.');
                    btnSubmit.disabled = false;
                    btnSubmit.textContent = 'Đăng nhập hệ thống';
                    return;
                }

                // 3. Kiểm tra trạng thái hoạt động của nhân viên
                if (!context.is_active) {
                    await clearAdminLogin(db);
                    showError('Tài khoản công vụ của bạn đã bị khóa hoặc tạm ngưng hoạt động. Vui lòng liên hệ Quản lý.');
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

                // Auth quản lý thời điểm đăng nhập; không ghi last_login_at vào staff V1.
                if (!staff.permission_codes?.length) {
                    await clearAdminLogin(db);
                    showError('Tài khoản chưa được cấp quyền quản trị. Vui lòng liên hệ Quản lý.');
                    return;
                }
                await finalizeAdminLogin(staff, authUser);

            } catch (err) {
                console.error('[AdminLogin] Exception:', err);
                await clearAdminLogin(db);
                showError(err.message || 'Đã xảy ra sự cố trong quá trình xác thực. Vui lòng thử lại.');
            } finally {
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
                const { data: sessionData, error: sessionError } = await db.auth.getSession();
                if (sessionError || !sessionData?.session?.access_token) throw new Error('Phiên đăng nhập đã hết hạn.');
                const response = await fetch('/api/admin/auth/complete-password-change', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + sessionData.session.access_token },
                    body: JSON.stringify({ password: newPass })
                });
                if (!response.ok) throw new Error('Không thể hoàn tất đổi mật khẩu công vụ. Vui lòng thử lại.');
                const { data: renewed, error: renewError } = await db.auth.signInWithPassword({ email: currentAuthenticatedUser.email, password: newPass });
                if (renewError || !renewed?.user) throw new Error('Mật khẩu đã đổi. Vui lòng đăng nhập lại.');
                const context = await loadStaffContext(db);
                if (!context?.is_active || context.staff?.must_change_password || !context.staff?.permission_codes?.length) {
                    await clearAdminLogin(db);
                    throw new Error('Tài khoản chưa có quyền quản trị. Vui lòng liên hệ Quản lý.');
                }
                await finalizeAdminLogin(context.staff, renewed.user);

            } catch (err) {
                console.error('[ChangePassword] Exception:', err);
                showChangePassError('Không thể cập nhật mật khẩu: ' + err.message);
                btnSubmitChangePass.disabled = false;
                btnSubmitChangePass.textContent = 'Lưu mật khẩu và vào hệ thống';
            } finally {
                btnSubmitChangePass.disabled = false;
                btnSubmitChangePass.textContent = 'Lưu mật khẩu và vào hệ thống';
            }
        });
    }

    // Hoàn tất phiên đăng nhập và chuyển hướng
    async function finalizeAdminLogin(staff, authUser) {
        const roles = Array.isArray(staff.access_roles) ? staff.access_roles : [];
        const primaryRole = roles.includes('ADMIN') ? 'ADMIN' : (roles[0] || 'STAFF');

        const adminSession = {
            id: staff.id,
            rawId: staff.id,
            auth_user_id: authUser.id,
            name: staff.full_name || 'Nhân viên PawPal',
            full_name: staff.full_name || 'Nhân viên PawPal',
            phone: staff.phone_number || staff.phone || '',
            email: authUser.email || staff.email || '',
            role: primaryRole.toLowerCase(),
            system_role: primaryRole,
            access_roles: roles,
            position: staff.job_title || staff.specialization || 'Nhân viên',
            permissions: Array.isArray(staff.permission_codes) ? staff.permission_codes : [],
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

        window.location.replace('/admin#tab-list');
    }
})();
