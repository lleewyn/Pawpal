export async function resolveAuthenticatedCustomerId(db, requestedUser) {
    if (!requestedUser) throw new Error('Vui lòng đăng nhập để tải dữ liệu.');
    const requestedId = typeof requestedUser === 'object' ? requestedUser.id : requestedUser;
    if (!requestedId) throw new Error('Vui lòng đăng nhập để tải dữ liệu.');

    if (db?.auth) {
        const auth = await db.auth.getUser();
        if (auth?.error || !auth?.data?.user) {
            throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }

        const result = await db.from('customer').select('id, phone_main, account_status, is_temporary')
            .eq('auth_user_id', auth.data.user.id).maybeSingle();

        if (result?.error || !result?.data) {
            throw new Error('Không tìm thấy thông tin khách hàng tương ứng với phiên đăng nhập.');
        }

        const status = result.data.account_status;
        const isActive = status === 'ACTIVE' || status === 'dang_hoat_dong';
        if (!isActive || result.data.is_temporary) {
            throw new Error('Tài khoản chưa kích hoạt hoặc đã bị khóa.');
        }

        if (requestedId && requestedId !== result.data.id) {
            throw new Error('Danh tính yêu cầu không thuộc tài khoản đang đăng nhập.');
        }

        return result.data.id;
    }

    try {
        const { data } = await db.from('customer').select('id, phone_main, account_status, is_temporary')
            .eq('id', requestedId).maybeSingle();
        if (data?.id) return data.id;
    } catch (_) {}

    return requestedId;
}

