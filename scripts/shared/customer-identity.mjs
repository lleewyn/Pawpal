export async function resolveAuthenticatedCustomerId(db, requestedUser) {
    if (!db?.auth || !requestedUser) throw new Error('Vui lòng đăng nhập để tải dữ liệu.');
    const auth = await db.auth.getUser();
    if (auth.error || !auth.data?.user) throw new Error('Phiên đăng nhập đã hết hạn.');
    const result = await db.from('customer').select('id, phone_main, account_status, is_temporary')
        .eq('auth_user_id', auth.data.user.id).maybeSingle();
    if (result.error || !result.data || result.data.account_status !== 'ACTIVE' || result.data.is_temporary) {
        throw new Error('Không thể xác nhận tài khoản khách hàng.');
    }
    const requestedId = typeof requestedUser === 'object' ? requestedUser.id : requestedUser;
    if (requestedId !== result.data.id) throw new Error('Dữ liệu không thuộc tài khoản đang đăng nhập.');
    return result.data.id;
}
