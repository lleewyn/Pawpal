// Small, actor-scoped recovery journal. No address, token, prices or customer PII.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key = customerId => `pawpal_checkout_request:${customerId}`;

export function readCheckoutRequest(storage, customerId) {
    const raw = storage.getItem(key(customerId));
    if (!raw) return null;
    let value;
    try { value = JSON.parse(raw); } catch { throw new Error('Chưa đọc được yêu cầu đặt hàng trước. Vui lòng kiểm tra đơn hàng trước khi đặt tiếp.'); }
    if (!uuid.test(value?.id || '') || !['submitted', 'confirmed'].includes(value.phase)) {
        throw new Error('Chưa xác minh được yêu cầu đặt hàng trước. Vui lòng kiểm tra danh sách đơn hàng.');
    }
    return {id: value.id, phase: value.phase, cartCleaned: value.cartCleaned === true};
}

export function writeCheckoutRequest(storage, customerId, id, {confirmed = false, cartCleaned = false} = {}) {
    if (!customerId || !uuid.test(id || '')) throw new Error('Yêu cầu đặt hàng không hợp lệ.');
    storage.setItem(key(customerId), JSON.stringify({id, phase: confirmed ? 'confirmed' : 'submitted', cartCleaned: !!cartCleaned}));
    if (readCheckoutRequest(storage, customerId)?.id !== id) throw new Error('Không thể giữ mã yêu cầu để thử lại an toàn.');
}

export function clearCheckoutRequest(storage, customerId, id) {
    if (readCheckoutRequest(storage, customerId)?.id === id) storage.removeItem(key(customerId));
}
