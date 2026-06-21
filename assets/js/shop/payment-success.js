/**
 * Payment Success Page JavaScript
 */

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId');
    
    if (!orderId) {
        window.location.href = '/pages/shop/shop.html';
        return;
    }
    
    // Load order data
    const orderData = JSON.parse(localStorage.getItem('pawpal_current_order') || 'null');
    
    if (!orderData) {
        window.location.href = '/pages/shop/shop.html';
        return;
    }
    
    // Display order info
    displayOrderInfo(orderData);
    
    // Setup copy button
    document.getElementById('btn-copy-order').addEventListener('click', copyOrderId);
    
    // Setup tracking link based on user auth status
    setupTrackingLink(orderData);
});

function setupTrackingLink(order) {
    const trackBtns = document.querySelectorAll('a[href="/pages/user/orders.html"]');
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const isLoggedInUser = Boolean(currentUser && (currentUser.id || currentUser.phone));
    const isSamePhone = currentUser && order.shipping && currentUser.phone === order.shipping.phone;

    trackBtns.forEach(btn => {
        if (isLoggedInUser && currentUser.id && order.userId === currentUser.id) {
            btn.href = `/pages/user/order-detail.html?id=${order.orderId}`;
        } else if (isLoggedInUser && isSamePhone) {
            btn.href = '/pages/user/orders.html';
        } else {
            btn.href = '/pages/public/return-guest.html';
        }
    });
}

function displayOrderInfo(order) {
    // Order ID
    document.getElementById('order-id').textContent = order.orderId;
    
    // Shipping address
    const shipping = order.shipping;
    document.getElementById('shipping-address').textContent = 
        `${shipping.name}, ${shipping.phone}\n${shipping.address}, ${shipping.district}, ${shipping.city}`;
    
    // Order time
    const now = new Date();
    document.getElementById('order-time').textContent = formatDateTime(now);
    
    // Payment method
    const paymentMethodNames = {
        cod: 'Thanh toán khi nhận hàng (COD)',
        momo: 'Ví điện tử MoMo',
        vnpay: 'Cổng thanh toán VNPay',
        bank: 'Chuyển khoản ngân hàng'
    };
    document.getElementById('payment-method').textContent = 
        paymentMethodNames[order.payment.method] || order.payment.method;
    
    // Products list
    const productsContainer = document.getElementById('order-products');
    productsContainer.innerHTML = '';
    
    order.items.forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'product-item';
        itemDiv.innerHTML = `
            <img src="${item.image}" alt="${item.name}" class="product-item-img">
            <div class="product-item-info">
                <h4>${item.name}</h4>
                <p class="product-qty">x${item.quantity}</p>
            </div>
            <span class="product-item-price">${formatCurrency(item.price * item.quantity)}</span>
        `;
        productsContainer.appendChild(itemDiv);
    });
    
    // Totals
    document.getElementById('subtotal').textContent = formatCurrency(order.pricing.subtotal);
    document.getElementById('shipping-fee').textContent = 
        order.pricing.shippingFee === 0 ? 'Miễn phí' : formatCurrency(order.pricing.shippingFee);
    
    // Points discount (conditional)
    if (order.pricing.pointsDiscount > 0) {
        document.getElementById('points-row').style.display = 'flex';
        document.getElementById('points-discount').textContent = `-${formatCurrency(order.pricing.pointsDiscount)}`;
    }
    
    // Voucher discount (conditional)
    if (order.pricing.voucherDiscount > 0) {
        document.getElementById('voucher-row').style.display = 'flex';
        document.getElementById('voucher-discount').textContent = `-${formatCurrency(order.pricing.voucherDiscount)}`;
    }
    
    document.getElementById('grand-total').textContent = formatCurrency(order.pricing.grandTotal);
}

function copyOrderId() {
    const orderId = document.getElementById('order-id').textContent;
    navigator.clipboard.writeText(orderId).then(() => {
        showToast('Đã sao chép mã đơn hàng', 'success');
    }).catch(() => {
        showToast('Không thể sao chép', 'error');
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
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

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
