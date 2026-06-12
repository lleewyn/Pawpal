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
    
    // Display error info
    displayErrorInfo(orderId);
    
    // Setup retry button
    document.getElementById('btn-retry').addEventListener('click', () => {
        window.location.href = '/pages/shop/checkout.html';
    });
});

function displayErrorInfo(orderId) {
    // Order ID
    document.getElementById('order-id').textContent = orderId;
    
    // Error time
    const now = new Date();
    document.getElementById('error-time').textContent = formatDateTime(now);
    
    // Transaction ID
    const transactionId = `TXN-${orderId}-FAILED`;
    document.getElementById('transaction-id').textContent = transactionId;
    
    // Error reason (could be dynamic based on actual error)
    const errorReasons = [
        'Tài khoản không đủ số dư để thực hiện giao dịch',
        'Người dùng đã hủy thao tác thanh toán',
        'Thông tin thẻ không chính xác',
        'Giao dịch bị từ chối bởi ngân hàng',
        'Hết thời gian chờ thanh toán'
    ];
    const randomReason = errorReasons[Math.floor(Math.random() * errorReasons.length)];
    document.getElementById('error-reason').textContent = randomReason;
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
