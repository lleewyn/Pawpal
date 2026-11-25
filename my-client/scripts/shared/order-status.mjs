const aliases = {
    cho_xac_nhan: 'pending', pending: 'pending', placed: 'pending', pending_payment: 'pending', cho_thanh_toan: 'pending',
    cho_lay_hang: 'preparing', dang_chuan_bi: 'preparing', confirmed: 'preparing', da_xac_nhan: 'preparing', packing: 'preparing', dang_dong_goi: 'preparing', 'in-progress': 'preparing',
    dang_giao: 'shipping', dang_giao_hang: 'shipping', delivering: 'shipping', shipped: 'shipping', shipping: 'shipping',
    da_giao: 'delivered', da_giao_hang: 'delivered', delivered: 'delivered', da_hoan_tat: 'completed', done: 'completed', completed: 'completed',
    da_huy: 'cancelled', cancelled: 'cancelled', canceled: 'cancelled', thanh_toan_that_bai: 'cancelled',
    tra_hang: 'returned', da_tra_hang: 'returned', return: 'returned', return_pending: 'returned', return_approved: 'returned', refunded: 'returned', returned: 'returned'
};
export function normalizeOrderStatus(status) {
    const value = String(status || '').trim().toLowerCase();
    return aliases[value] || value || 'pending';
}
export function getStatusLabel(status) {
    const labels = { pending: 'Chờ xác nhận', preparing: 'Chờ lấy hàng', shipping: 'Đang giao', delivered: 'Đã giao', completed: 'Hoàn thành', cancelled: 'Đã hủy', returned: 'Trả hàng' };
    return labels[normalizeOrderStatus(status)] || 'Đang cập nhật';
}
