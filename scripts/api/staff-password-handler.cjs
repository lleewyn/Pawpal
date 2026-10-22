// Server-side completion of a mandatory password change for the authenticated staff.
// Shared by local preview and Vercel; no service key enters browser code.
const { createClient } = require('@supabase/supabase-js');
module.exports = function createStaffPasswordHandler(config) {
    const options = { auth: { persistSession: false, autoRefreshToken: false }, ...(config.fetch?{global:{fetch:config.fetch}}:{}) };
    const service = createClient(config.url, config.serviceKey, options);
    return async (req, res) => {
        res.setHeader('Cache-Control', 'no-store');
        const bearer = req.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1];
        if (!bearer) return res.status(401).json({ error: 'Vui lòng đăng nhập lại.' });
        const password = req.body?.password;
        if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
            return res.status(400).json({ error: 'Mật khẩu phải có từ 6 đến 128 ký tự.' });
        }
        try {
            const caller = createClient(config.url, config.anonKey, {
                ...options, global: { ...(options.global||{}), headers: { Authorization: 'Bearer ' + bearer } }
            });
            const identity = await caller.auth.getUser(bearer);
            if (identity.error || !identity.data?.user) return res.status(401).json({ error: 'Phiên đăng nhập không hợp lệ.' });
            const context = await caller.rpc('get_staff_login_context');
            const staff = context.data?.staff;
            if (context.error || !context.data?.is_active || !staff?.must_change_password || staff.auth_user_id !== identity.data.user.id) {
                return res.status(403).json({ error: 'Không có yêu cầu đổi mật khẩu công vụ hợp lệ.' });
            }
            // Ignore caller-supplied IDs. Auth must accept the password before clearing the gate.
            const changed = await service.auth.admin.updateUserById(identity.data.user.id, { password });
            if (changed.error) return res.status(400).json({ error: 'Không thể cập nhật mật khẩu. Vui lòng thử lại.' });
            const updated = await service.from('staff').update({ must_change_password: false })
                .eq('id', staff.id).eq('auth_user_id', identity.data.user.id)
                .eq('employment_status', 'active').eq('must_change_password', true).select('id').single();
            if (updated.error) return res.status(503).json({ error: 'Mật khẩu đã đổi nhưng chưa hoàn tất xác nhận công vụ. Vui lòng thử lại.' });
            return res.json({ success: true });
        } catch {
            return res.status(503).json({ error: 'Không thể hoàn tất đổi mật khẩu công vụ.' });
        }
    };
};
