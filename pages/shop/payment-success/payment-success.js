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
    
    resolveOrderData(orderId, orderData).then((resolvedOrder) => {
        if (!resolvedOrder) {
            window.location.href = '/pages/shop/shop.html';
            return;
        }

        // Display order info
        displayOrderInfo(resolvedOrder);
        setupGuestActivationCard(resolvedOrder);

        // Setup tracking link based on user auth status
        setupTrackingLink(resolvedOrder);
    });
    
    // Setup copy button
    document.getElementById('btn-copy-order').addEventListener('click', copyOrderId);
});

async function resolveOrderData(orderId, fallbackOrder) {
    const localOrder = fallbackOrder || JSON.parse(localStorage.getItem('pawpal_current_order') || 'null');
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;

    if (!db || !orderId) return localOrder;

    try {
        const { data, error } = await db
            .from('sales_order')
            .select(`
                id, order_code, customer_id, order_status, payment_status,
                subtotal, shipping_fee, discount_amount, total_amount, created_at,
                sales_order_detail (
                    id, quantity, unit_price, subtotal,
                    product ( id, product_name, image_urls )
                ),
                customer_address ( receiver_name, receiver_phone, province, street_address )
            `)
            .or(`order_code.eq.${orderId},id.eq.${orderId}`)
            .limit(1);

        if (error || !data?.length) return localOrder;

        const row = data[0];
        const shipping = row.customer_address || {};
        return {
            orderId: row.order_code || row.id || orderId,
            id: row.order_code || row.id || orderId,
            shipping: {
                name: shipping.receiver_name || '',
                phone: shipping.receiver_phone || '',
                address: shipping.street_address || '',
                district: '',
                city: shipping.province || '',
            },
            payment: {
                method: localOrder?.payment?.method || 'cod',
                status: String(row.payment_status || localOrder?.payment?.status || 'PENDING').toLowerCase(),
            },
            items: (row.sales_order_detail || []).map((item) => ({
                id: item.product?.id || '',
                name: item.product?.product_name || 'Sản phẩm',
                image: item.product?.image_urls?.[0] || '',
                quantity: item.quantity || 1,
                price: item.unit_price || 0,
            })),
            pricing: {
                subtotal: row.subtotal || 0,
                shippingFee: row.shipping_fee || 0,
                pointsDiscount: localOrder?.pricing?.pointsDiscount || 0,
                voucherDiscount: localOrder?.pricing?.voucherDiscount || 0,
                grandTotal: row.total_amount || 0,
            },
        };
    } catch (err) {
        console.warn('[payment-success] resolveOrderData error:', err?.message || err);
        return localOrder;
    }
}

function setupGuestActivationCard(order) {
    const card = document.getElementById('guestActivationCard');
    const phoneDisplay = document.getElementById('guestPhoneDisplay');
    const activateLink = document.getElementById('btn-guest-activate');

    if (!card || !phoneDisplay || !activateLink) {
        return;
    }

    const users = JSON.parse(localStorage.getItem('pawpal_users_db') || '[]');
    const tempUser = users.find(u => u.phone === order.shipping.phone && u.is_temporary);
    if (!tempUser) {
        card.classList.add('d-none');
        return;
    }

    card.classList.remove('d-none');
    phoneDisplay.textContent = tempUser.phone;
    activateLink.href = `../../public/login/login.html?action=guest-activate&phone=${encodeURIComponent(tempUser.phone)}`;
}

function setupTrackingLink(order) {
    // Find any anchor that links to the orders list and convert it into a direct
    // link to the created order's detail. Match both absolute and relative hrefs.
    const anchors = Array.from(document.querySelectorAll('a'));
    const trackBtns = anchors.filter(a => {
        const href = a.getAttribute('href') || '';
        return href.includes('/pages/user/orders/') || href.endsWith('/orders.html') || href.endsWith('orders.html');
    });

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const isLoggedInUser = Boolean(currentUser && (currentUser.id || currentUser.phone) && !currentUser.is_temporary);
    const isSamePhone = currentUser && order.shipping && currentUser.phone === order.shipping.phone;

    trackBtns.forEach(btn => {
        // Prefer linking to the order detail page with the normalized `id` if available
        const id = order.id || order.orderId || order.orderID || orderIdFrom(order);
        if (isLoggedInUser) {
            if (id) {
                btn.href = `/pages/user/order-detail/order-detail.html?id=${encodeURIComponent(id)}`;
            } else {
                btn.href = '/pages/user/orders/orders.html';
            }
        } else {
            btn.href = '/pages/public/return-guest/return-guest.html';
        }
    });
}

function orderIdFrom(order) {
    return order && (order.orderId || order.id || order.orderID || null);
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
        document.getElementById('points-row').classList.remove('d-none');
        document.getElementById('points-discount').textContent = `-${formatCurrency(order.pricing.pointsDiscount)}`;
    }
    
    // Voucher discount (conditional)
    if (order.pricing.voucherDiscount > 0) {
        document.getElementById('voucher-row').classList.remove('d-none');
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
