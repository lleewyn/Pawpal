export function cartQuantity(item) {
    const primary = Number(item?.quantity);
    const legacy = Number(item?.qty);
    if (Number.isSafeInteger(primary) && primary > 0) return primary;
    if (Number.isSafeInteger(legacy) && legacy > 0) return legacy;
    return 1;
}

export function normalizeCartItems(items) {
    if (!Array.isArray(items)) throw new Error('Dữ liệu giỏ hàng không hợp lệ.');
    const grouped = new Map();
    for (const item of items) {
        const rawId = item?.id || item?.product_id;
        if (!rawId) throw new Error('Sản phẩm trong giỏ hàng không hợp lệ.');
        const raw = item.quantity ?? item.qty ?? 1;
        const quantity = Number(raw);
        if (!Number.isSafeInteger(quantity) || quantity < 1) throw new Error('Số lượng sản phẩm phải là số nguyên lớn hơn 0.');
        const id = String(rawId);
        const previous = grouped.get(id);
        const total = (previous?.quantity || 0) + quantity;
        if (!Number.isSafeInteger(total)) throw new Error('Số lượng sản phẩm không hợp lệ.');
        grouped.set(id, { ...previous, ...item, id, product_id: item.product_id || id, quantity: total, qty: total });
    }
    return [...grouped.values()];
}

export function publishCart(items, ownerId = null) {
    const normalized = normalizeCartItems(items);
    const activeUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (ownerId && activeUser?.id !== ownerId) return normalized;
    localStorage.setItem('pawpal_cart', JSON.stringify(normalized));
    if (ownerId) localStorage.setItem('pawpal_cart_owner', String(ownerId));
    document.dispatchEvent(new CustomEvent('cart_updated', { detail: { ownerId, items: normalized } }));
    return normalized;
}

export function voucherBelongsToUser(voucher, user) {
    const phone = value => String(value || '').replace(/\D/g, '').replace(/^84(?=\d{9}$)/, '0');
    return Boolean(user?.id && !user.is_temporary && phone(user.phone) && phone(voucher?.ownerPhone) === phone(user.phone));
}
