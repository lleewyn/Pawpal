
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');

    if (!orderId) {
        window.location.href = '/pages/shop/shop.html';
        return;
    }

    resolveFailedPaymentInfo(orderId).then((orderData) => {
        if (orderData?.payment?.status === 'succeeded') {
            window.location.replace('/user#order-detail?id=' + encodeURIComponent(orderId));
            return;
        }
        displayErrorInfo(orderId, orderData);
    });

    const retryBtn = document.getElementById('btn-retry');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            window.location.href = '/user#order-detail?id=' + encodeURIComponent(orderId);
        });
    }
});

async function resolveFailedPaymentInfo(orderId) {
    const fallbackOrder = null;
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !orderId) return fallbackOrder;

    try {
        const { data, error } = await db
            .from('sales_order')
            .select(`
                id, order_code, order_status, shipping_fee_snapshot, created_at,
                payment ( id, transaction_status, amount, succeeded_at, created_at )
            `)
            .eq(/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(orderId) ? 'id' : 'order_code', orderId)
            .order('created_at', { referencedTable: 'payment', ascending: false })
            .limit(1);

        if (error || !data?.length) return fallbackOrder;

        const row = data[0];
        const payRow = (row.payment && row.payment[0]) || {};
        return {
            orderId: row.order_code || row.id || orderId,
            id: row.order_code || row.id || orderId,
            orderStatus: row.order_status || fallbackOrder?.orderStatus || fallbackOrder?.status || '',
            payment: {
                method: payRow.payment_method || fallbackOrder?.payment?.method || 'cod',
                status: String(payRow.transaction_status || 'unknown').toLowerCase(),
                transactionId: payRow.id || null,
                recordedAt: payRow.created_at || null,
            },
            pricing: {
                subtotal: fallbackOrder?.pricing?.subtotal || 0,
                shippingFee: Number(row.shipping_fee_snapshot || 0),
                pointsDiscount: fallbackOrder?.pricing?.pointsDiscount || 0,
                voucherDiscount: fallbackOrder?.pricing?.voucherDiscount || 0,
                grandTotal: Number(payRow.amount || fallbackOrder?.pricing?.grandTotal || 0),
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

    document.getElementById('error-time').textContent = orderData?.payment?.recordedAt ? formatDateTime(new Date(orderData.payment.recordedAt)) : 'Chưa xác định';

    const transactionId = orderData?.payment?.transactionId || 'Chưa xác định';
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

    let reason = reasonMap[status] || 'Chưa xác định được kết quả thanh toán. Vui lòng kiểm tra trạng thái trong đơn hàng trước khi thanh toán lại.';
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
