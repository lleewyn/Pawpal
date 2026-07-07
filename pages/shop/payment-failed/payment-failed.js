/**
 * Payment Failed Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    if (!orderId) {
        window.location.href = '/pages/shop/shop.html';
        return;
    }

    resolveFailedPaymentInfo(orderId).then((orderData) => {
        displayErrorInfo(orderId, orderData);
    });

    const retryBtn = document.getElementById('btn-retry');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            window.location.href = '/pages/shop/checkout/checkout.html';
        });
    }
});

async function resolveFailedPaymentInfo(orderId) {
    const fallbackOrder = JSON.parse(localStorage.getItem('pawpal_current_order') || 'null');
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !orderId) return fallbackOrder;

    try {
        const { data, error } = await db
            .from('sales_order')
            .select(`
                id, order_code, order_status, payment_status,
                subtotal, shipping_fee, discount_amount, total_amount, created_at
            `)
            .or(`order_code.eq.${orderId},id.eq.${orderId}`)
            .limit(1);

        if (error || !data?.length) return fallbackOrder;

        const row = data[0];
        return {
            orderId: row.order_code || row.id || orderId,
            id: row.order_code || row.id || orderId,
            orderStatus: row.order_status || fallbackOrder?.orderStatus || fallbackOrder?.status || '',
            payment: {
                method: fallbackOrder?.payment?.method || 'cod',
                status: String(row.payment_status || fallbackOrder?.payment?.status || 'failed').toLowerCase(),
            },
            pricing: {
                subtotal: row.subtotal || 0,
                shippingFee: row.shipping_fee || 0,
                pointsDiscount: fallbackOrder?.pricing?.pointsDiscount || 0,
                voucherDiscount: fallbackOrder?.pricing?.voucherDiscount || 0,
                grandTotal: row.total_amount || 0,
            },
            items: fallbackOrder?.items || [],
            shipping: fallbackOrder?.shipping || {},
        };
    } catch (err) {
        console.warn('[payment-failed] resolveFailedPaymentInfo error:', err?.message || err);
        return fallbackOrder;
    }
}

function displayErrorInfo(orderId, orderData = null) {
    document.getElementById('order-id').textContent = orderData?.orderId || orderId;

    const now = new Date();
    document.getElementById('error-time').textContent = formatDateTime(now);

    const transactionId = `TXN-${(orderData?.orderId || orderId)}-FAILED`;
    document.getElementById('transaction-id').textContent = transactionId;

    const status = String(orderData?.payment?.status || '').toLowerCase();
    const orderStatus = String(orderData?.orderStatus || '').toLowerCase();
    const amount = Number(orderData?.pricing?.grandTotal || 0);

    const reasonMap = {
        failed: 'Thanh toán bị từ chối hoặc không thể hoàn tất.',
        cancelled: 'Người dùng đã hủy thao tác thanh toán.',
        expired: 'Phiên thanh toán đã hết hạn.',
        pending: 'Giao dịch đang chờ xử lý nhưng chưa hoàn tất.',
    };

    let reason = reasonMap[status] || 'Giao dịch không thể hoàn tất.';
    if (!status && orderStatus === 'cancelled') {
        reason = 'Đơn hàng đã bị hủy trong quá trình thanh toán.';
    } else if (!status && amount > 0) {
        reason = `Giao dịch ${formatCurrency(amount)} chưa được xác nhận thành công.`;
    }

    document.getElementById('error-reason').textContent = reason;
}

function formatDateTime(date) {
    return new Intl.DateTimeFormat('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}
