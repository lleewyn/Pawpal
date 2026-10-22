export async function resolveAuthenticatedCustomerId(db, requestedUser) {
    if (!requestedUser) throw new Error('Vui lòng đăng nhập để tải dữ liệu.');
    const requestedId = typeof requestedUser === 'object' ? (requestedUser.id || requestedUser.custId) : requestedUser;
    if (!requestedId) throw new Error('Vui lòng đăng nhập để tải dữ liệu.');

    if (db?.auth) {
        const auth = await db.auth.getUser();
        if (auth?.error || !auth?.data?.user?.id) throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        if (auth?.data?.user?.id) {
            const { data, error } = await db.from('customer')
                .select('id, contact_email, customer_status')
                .eq('auth_user_id', auth.data.user.id)
                .maybeSingle();

            if (!error && data?.id) {
                if (String(data.id) !== String(requestedId)) throw new Error('Hồ sơ không thuộc phiên đăng nhập hiện tại. Vui lòng tải lại trang.');
                const status = String(data.customer_status || '').toLowerCase();
                if (status === 'locked' || status === 'da_khoa') {
                    throw new Error('Tài khoản đã bị tạm khóa. Vui lòng liên hệ hỗ trợ.');
                }
                return data.id;
            }
            throw new Error('Không tìm thấy hồ sơ của phiên đăng nhập hiện tại.');
        }
    }

    // Nếu requestedId là UUID hợp lệ, kiểm tra nhanh qua id
    if (typeof requestedId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestedId)) {
        try {
            const { data } = await db.from('customer')
                .select('id, customer_status')
                .eq('id', requestedId)
                .maybeSingle();
            if (data?.id) return data.id;
        } catch (_) {}
    }

    // Fallback: Tìm qua số điện thoại nếu user object có phone
    const phone = typeof requestedUser === 'object' ? (requestedUser.phone || requestedUser.phone_main) : null;
    if (phone) {
        const cleanPhone = String(phone).replace(/\D/g, '');
        try {
            const { data } = await db.from('customer_phone')
                .select('customer_id')
                .eq('phone_number', cleanPhone)
                .limit(1);
            if (data?.length) return data[0].customer_id;
        } catch (_) {}
    }

    return requestedId;
}
