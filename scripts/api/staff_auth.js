const { createClient } = require('@supabase/supabase-js');

function getSupabaseAdmin() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
        throw new Error('Thiếu cấu hình SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong file .env');
    }
    return createClient(url, key, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

/**
 * Cấp mới hoặc cập nhật tài khoản đăng nhập Supabase Auth cho nhân sự
 */
async function provisionAccount(req, res) {
    try {
        const {
            staffId,
            email,
            password,
            systemRole = 'STAFF',
            permissions = [],
            mustChangePassword = true
        } = req.body;

        if (!staffId || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp mã nhân viên, email công vụ và mật khẩu khởi tạo.'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu phải có độ dài tối thiểu 6 ký tự.'
            });
        }

        const supabase = getSupabaseAdmin();

        // 1. Kiểm tra thông tin nhân viên trong bảng public.staff
        const { data: staff, error: staffErr } = await supabase
            .from('staff')
            .select('id, full_name, phone_number, auth_user_id, account_status')
            .eq('id', staffId)
            .single();

        if (staffErr || !staff) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hồ sơ nhân viên trong cơ sở dữ liệu.'
            });
        }

        let authUserId = staff.auth_user_id;

        // 2. Nếu đã có auth_user_id, cập nhật mật khẩu và email
        if (authUserId) {
            const { error: updateAuthErr } = await supabase.auth.admin.updateUserById(authUserId, {
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    role: systemRole,
                    full_name: staff.full_name,
                    user_type: 'STAFF'
                }
            });

            if (updateAuthErr) {
                return res.status(400).json({
                    success: false,
                    message: 'Không thể cập nhật tài khoản Supabase Auth: ' + updateAuthErr.message
                });
            }
        } else {
            // 3. Nếu chưa có, tạo user mới trong auth.users
            const { data: newAuthUser, error: createAuthErr } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true,
                user_metadata: {
                    role: systemRole,
                    full_name: staff.full_name,
                    user_type: 'STAFF'
                }
            });

            if (createAuthErr) {
                // Nếu email đã tồn tại trong auth.users, tra cứu lại user id đó
                if (createAuthErr.message?.includes('already been registered') || createAuthErr.code === 'email_exists') {
                    const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
                    if (!listErr && usersData?.users) {
                        const matchedUser = usersData.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
                        if (matchedUser) {
                            authUserId = matchedUser.id;
                            // Cập nhật lại mật khẩu cho user này
                            await supabase.auth.admin.updateUserById(authUserId, {
                                password: password,
                                email_confirm: true,
                                user_metadata: {
                                    role: systemRole,
                                    full_name: staff.full_name,
                                    user_type: 'STAFF'
                                }
                            });
                        }
                    }
                }

                if (!authUserId) {
                    return res.status(400).json({
                        success: false,
                        message: 'Không thể tạo tài khoản Supabase Auth: ' + createAuthErr.message
                    });
                }
            } else {
                authUserId = newAuthUser.user.id;
            }
        }

        // 4. Cập nhật bảng public.staff
        const { error: updateStaffErr } = await supabase
            .from('staff')
            .update({
                auth_user_id: authUserId,
                account_status: 'ACTIVE',
                system_role: systemRole,
                permissions: permissions,
                must_change_password: Boolean(mustChangePassword),
                updated_at: new Date().toISOString()
            })
            .eq('id', staffId);

        if (updateStaffErr) {
            return res.status(500).json({
                success: false,
                message: 'Đã tạo tài khoản Auth nhưng không thể cập nhật bảng staff: ' + updateStaffErr.message
            });
        }

        // 5. Ghi nhật ký Audit Log
        try {
            await supabase.from('audit_log').insert({
                user_id: staffId,
                action: 'STAFF_ACCOUNT_PROVISIONED',
                entity: 'staff',
                entity_id: staffId,
                old_data: null,
                new_data: {
                    auth_user_id: authUserId,
                    system_role: systemRole,
                    account_status: 'ACTIVE'
                }
            });
        } catch (auditErr) {}

        return res.json({
            success: true,
            message: 'Cấp tài khoản đăng nhập hệ thống thành công!',
            authUserId: authUserId,
            accountStatus: 'ACTIVE',
            systemRole: systemRole
        });

    } catch (err) {
        console.error('[staff_auth.provisionAccount] Exception:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi cấp tài khoản: ' + err.message
        });
    }
}

/**
 * Đặt lại mật khẩu tạm cho nhân sự
 */
async function resetPassword(req, res) {
    try {
        const { staffId, newPassword } = req.body;

        if (!staffId || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp mã nhân viên và mật khẩu mới.'
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'Mật khẩu mới phải có tối thiểu 6 ký tự.'
            });
        }

        const supabase = getSupabaseAdmin();

        const { data: staff, error: staffErr } = await supabase
            .from('staff')
            .select('id, full_name, auth_user_id')
            .eq('id', staffId)
            .single();

        if (staffErr || !staff || !staff.auth_user_id) {
            return res.status(404).json({
                success: false,
                message: 'Nhân viên này chưa được cấp tài khoản đăng nhập.'
            });
        }

        // Cập nhật mật khẩu trong auth.users
        const { error: authErr } = await supabase.auth.admin.updateUserById(staff.auth_user_id, {
            password: newPassword
        });

        if (authErr) {
            return res.status(400).json({
                success: false,
                message: 'Lỗi khi cập nhật mật khẩu: ' + authErr.message
            });
        }

        // Đánh dấu yêu cầu đổi mật khẩu ở lần đăng nhập tới
        await supabase
            .from('staff')
            .update({
                must_change_password: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', staffId);

        return res.json({
            success: true,
            message: 'Đã đặt lại mật khẩu tạm thành công!'
        });

    } catch (err) {
        console.error('[staff_auth.resetPassword] Exception:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi đặt lại mật khẩu: ' + err.message
        });
    }
}

/**
 * Khóa hoặc Mở khóa tài khoản công vụ
 */
async function toggleAccountStatus(req, res) {
    try {
        const { staffId, targetStatus } = req.body;

        if (!staffId || !['ACTIVE', 'LOCKED'].includes(targetStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ. Chỉ chấp nhận ACTIVE hoặc LOCKED.'
            });
        }

        const supabase = getSupabaseAdmin();

        const { data: staff, error: staffErr } = await supabase
            .from('staff')
            .select('id, full_name, auth_user_id')
            .eq('id', staffId)
            .single();

        if (staffErr || !staff) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy hồ sơ nhân viên.'
            });
        }

        // Cập nhật trong bảng staff
        const { error: updateErr } = await supabase
            .from('staff')
            .update({
                account_status: targetStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', staffId);

        if (updateErr) {
            return res.status(500).json({
                success: false,
                message: 'Không thể cập nhật trạng thái tài khoản: ' + updateErr.message
            });
        }

        // Nếu có auth_user_id, đồng bộ ban duration trong Supabase Auth
        if (staff.auth_user_id) {
            try {
                if (targetStatus === 'LOCKED') {
                    await supabase.auth.admin.updateUserById(staff.auth_user_id, {
                        ban_duration: '876000h' // Khóa 100 năm
                    });
                } else {
                    await supabase.auth.admin.updateUserById(staff.auth_user_id, {
                        ban_duration: 'none' // Mở khóa
                    });
                }
            } catch (banErr) {
                console.warn('[staff_auth] Không thể cập nhật ban_duration trong auth.users:', banErr.message);
            }
        }

        return res.json({
            success: true,
            accountStatus: targetStatus,
            message: targetStatus === 'LOCKED' ? 'Đã khóa tài khoản công vụ thành công!' : 'Đã mở khóa tài khoản thành công!'
        });

    } catch (err) {
        console.error('[staff_auth.toggleAccountStatus] Exception:', err);
        return res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống khi cập nhật trạng thái: ' + err.message
        });
    }
}

module.exports = {
    provisionAccount,
    resetPassword,
    toggleAccountStatus
};
