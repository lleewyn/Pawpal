export async function resolveAuthenticatedCustomerId(db, requestedUser) {
    if (!requestedUser) throw new Error('Vui lòng đăng nhập để tải dữ liệu.');
    const requestedId = typeof requestedUser === 'object' ? requestedUser.id : requestedUser;
    if (!requestedId) throw new Error('Vui lòng đăng nhập để tải dữ liệu.');

    if (db?.auth) {
        try {
            const auth = await db.auth.getUser();
            if (auth.data?.user) {
                const result = await db.from('customer').select('id, phone_main, account_status, is_temporary')
                    .eq('auth_user_id', auth.data.user.id).maybeSingle();
                if (result.data && result.data.account_status === 'ACTIVE' && !result.data.is_temporary) {
                    return result.data.id;
                }
            }
        } catch (_) {}
    }

    try {
        const { data } = await db.from('customer').select('id, phone_main, account_status, is_temporary')
            .eq('id', requestedId).maybeSingle();
        if (data?.id) return data.id;
    } catch (_) {}

    return requestedId;
}

