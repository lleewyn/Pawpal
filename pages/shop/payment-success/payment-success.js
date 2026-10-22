

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderId = urlParams.get('orderId') || urlParams.get('vnp_TxnRef');
    
    if (!orderId) {
        window.location.href = '/pages/shop/shop.html';
        return;
    }

    // Xử lý phản hồi từ Cổng thanh toán VNPAY chính thức
    const vnpResponseCode = urlParams.get('vnp_ResponseCode');
    if (vnpResponseCode) {
        if (vnpResponseCode === '00') {
            const transactionNo = urlParams.get('vnp_TransactionNo') || `VNP${Date.now()}`;
            updateOrderAfterVNPay(orderId, 'paid', 'preparing', transactionNo);
        } else {
            alert('Giao dịch VNPAY không thành công hoặc bạn đã hủy giao dịch. Đơn hàng vẫn được lưu ở trạng thái "Chờ thanh toán" (thời hạn 15 phút).');
            window.location.href = '/pages/user/#orders?status=pending_payment';
            return;
        }
    }
    
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

        displayOrderInfo(resolvedOrder);
        setupGuestActivationCard(resolvedOrder);

        setupTrackingLink(resolvedOrder);
    });
    
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
                id, order_code, customer_id, order_status, shipping_status,
                shipping_fee_snapshot, receiver_name_snapshot, receiver_phone_snapshot,
                street_address_snapshot, province_snapshot, created_at,
                sales_order_detail (
                    id, quantity, unit_price, discount_amount,
                    product_name_snapshot, sku_snapshot
                ),
                payment ( id, payment_method, payment_status, amount )
            `)
            .or(`order_code.eq.${orderId},id.eq.${orderId}`)
            .limit(1);

        if (error || !data?.length) return localOrder;

        const row = data[0];
        const payRow = (row.payment && row.payment[0]) || {};
        return {
            orderId: row.order_code || row.id || orderId,
            id: row.order_code || row.id || orderId,
            shipping: {
                name: row.receiver_name_snapshot || localOrder?.shipping?.name || '',
                phone: row.receiver_phone_snapshot || localOrder?.shipping?.phone || '',
                address: row.street_address_snapshot || localOrder?.shipping?.address || '',
                district: localOrder?.shipping?.district || '',
                city: row.province_snapshot || localOrder?.shipping?.city || '',
            },
            payment: {
                method: payRow.payment_method || localOrder?.payment?.method || 'cod',
                status: String(
                    localOrder?.payment?.status === 'paid'
                        ? 'paid'
                        : (payRow.payment_status || localOrder?.payment?.status || 'PENDING')
                ).toLowerCase(),
            },
            items: (row.sales_order_detail || []).map((item) => ({
                id: item.id || '',
                name: item.product_name_snapshot || 'Sản phẩm',
                image: '',
                quantity: item.quantity || 1,
                price: item.unit_price || 0,
            })),
            pricing: {
                subtotal: localOrder?.pricing?.subtotal || 
                          (row.sales_order_detail || []).reduce((acc, item) => acc + ((item.unit_price || 0) * (item.quantity || 1)), 0),
                shippingFee: Number(row.shipping_fee_snapshot ?? localOrder?.pricing?.shippingFee ?? 0),
                pointsDiscount: localOrder?.pricing?.pointsDiscount || 0,
                voucherDiscount: localOrder?.pricing?.voucherDiscount || 0,
                grandTotal: Number(payRow.amount ?? localOrder?.pricing?.grandTotal ?? 0),
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

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    
    if (currentUser && !currentUser.is_temporary) {
        card.classList.add('d-none');
        return;
    }

    const phone = order?.shipping?.phone;
    if (!phone) {
        card.classList.add('d-none');
        return;
    }

    card.classList.remove('d-none');
    phoneDisplay.textContent = phone;
    activateLink.href = `/login?action=guest-activate&phone=${encodeURIComponent(phone)}`;
}

function setupTrackingLink(order) {
    const anchors = Array.from(document.querySelectorAll('a'));
    const trackBtns = anchors.filter(a => {
        const href = a.getAttribute('href') || '';
        return a.id === 'btn-track-order-success' || href.includes('/pages/user/#orders') || href.includes('/pages/user/orders/') || href.endsWith('/orders.html') || href.endsWith('orders.html');
    });

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const isLoggedInUser = Boolean(currentUser && (currentUser.id || currentUser.phone) && !currentUser.is_temporary);
    const guestPhone = order?.shipping?.phone || (currentUser?.phone) || '';

    trackBtns.forEach(btn => {
        const id = order.id || order.orderId || order.orderID || orderIdFrom(order);
        if (isLoggedInUser) {
            if (id) {
                btn.href = `/user#order-detail?id=${encodeURIComponent(id)}`;
            } else {
                btn.href = '/pages/user/#orders';
            }
        } else {
            btn.href = guestPhone
                ? `/return-guest?phone=${encodeURIComponent(guestPhone)}`
                : '/return-guest';
        }
    });
}

function orderIdFrom(order) {
    return order && (order.orderId || order.id || order.orderID || null);
}

function displayOrderInfo(order) {
    document.getElementById('order-id').textContent = order.orderId;
    
    const shipping = order.shipping || {};
    const cleanAddressParts = [];
    const rawAddr = (shipping.address || '').trim();
    const rawDistrict = (shipping.district || '').trim();
    const rawCity = (shipping.city || '').trim();

    if (rawAddr) cleanAddressParts.push(rawAddr);
    if (rawDistrict && !rawAddr.toLowerCase().includes(rawDistrict.toLowerCase())) {
        cleanAddressParts.push(rawDistrict);
    }
    if (rawCity && !rawAddr.toLowerCase().includes(rawCity.toLowerCase()) && !rawDistrict.toLowerCase().includes(rawCity.toLowerCase())) {
        cleanAddressParts.push(rawCity);
    }

    const fullAddressStr = cleanAddressParts.join(', ');

    document.getElementById('shipping-address').innerHTML = `
        <div class="shipping-info-block">
            <div class="shipping-recipient">
                <span class="shipping-name">${shipping.name || 'Khách hàng'}</span>
                ${shipping.phone ? `<span class="shipping-phone-pill">${shipping.phone}</span>` : ''}
            </div>
            <div class="shipping-address-text">${fullAddressStr || 'Chưa có địa chỉ'}</div>
        </div>
    `;
    
    const now = new Date();
    document.getElementById('order-time').textContent = formatDateTime(now);
    
    const paymentMethodNames = {
        cod: 'Thanh toán khi nhận hàng (COD)',
        momo: 'Ví điện tử MoMo',
        vnpay: 'Cổng thanh toán VNPay',
        vietqr: 'Quét mã VietQR',
        zalopay: 'Ví điện tử ZaloPay',
        bank: 'Chuyển khoản ngân hàng'
    };
    const payMethod = (order.payment?.method || order.paymentMethod || '').toLowerCase();
    document.getElementById('payment-method').textContent = 
        paymentMethodNames[payMethod] || order.payment?.method || 'Thanh toán online';

    // Cập nhật huy hiệu trạng thái thanh toán và tiêu đề trang
    const isPaid = (order.payment?.status === 'paid' || order.paymentStatus === 'paid');
    const isCOD = payMethod === 'cod';
    const statusBadge = document.getElementById('payment-status-badge');
    const statusText = document.getElementById('payment-status-text');
    const statusIcon = document.getElementById('payment-status-icon');
    const resultTitle = document.querySelector('.result-title');
    const resultSubtitle = document.querySelector('.result-subtitle');

    if (statusBadge && statusText) {
        if (isPaid) {
            statusBadge.className = 'status-badge status-paid';
            statusText.textContent = 'ĐÃ THANH TOÁN';
            if (statusIcon) {
                statusIcon.innerHTML = `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`;
            }
            if (resultTitle) resultTitle.textContent = 'Thanh toán thành công!';
            if (resultSubtitle) resultSubtitle.innerHTML = 'Cảm ơn bạn đã tin tưởng PawPal.<br>Giao dịch thanh toán trực tuyến của bạn đã hoàn tất.';
        } else if (isCOD) {
            statusBadge.className = 'status-badge status-pending';
            statusText.textContent = 'CHƯA THANH TOÁN (COD)';
            if (statusIcon) {
                statusIcon.innerHTML = `<svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`;
            }
            if (resultTitle) resultTitle.textContent = 'Đặt hàng thành công!';
            if (resultSubtitle) resultSubtitle.innerHTML = 'Cảm ơn bạn đã tin tưởng PawPal.<br>Đơn hàng COD của bạn đã được ghi nhận. Vui lòng thanh toán tiền mặt cho shipper khi nhận hàng.';
        } else {
            statusBadge.className = 'status-badge status-pending';
            statusText.textContent = 'CHỜ THANH TOÁN';
            if (resultTitle) resultTitle.textContent = 'Đơn hàng đang chờ thanh toán';
            if (resultSubtitle) resultSubtitle.innerHTML = 'Cảm ơn bạn đã tin tưởng PawPal.<br>Đơn hàng đang chờ bạn hoàn tất thanh toán trực tuyến (thời hạn 15 phút).';
        }
    }
    
    const productsContainer = document.getElementById('order-products');
    productsContainer.innerHTML = '';
    
    (order.items || []).forEach(item => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'product-item';
        itemDiv.innerHTML = `
            <img src="${item.image || '/assets/images/default-pet.png'}" alt="${item.name}" class="product-item-img">
            <div class="product-item-info">
                <h4>${item.name}</h4>
                <p class="product-qty">Số lượng: ${item.quantity}</p>
            </div>
            <span class="product-item-price">${formatCurrency(item.price * item.quantity)}</span>
        `;
        productsContainer.appendChild(itemDiv);
    });
    
    document.getElementById('subtotal').textContent = formatCurrency(order.pricing.subtotal);
    document.getElementById('shipping-fee').textContent = 
        order.pricing.shippingFee === 0 ? 'Miễn phí' : formatCurrency(order.pricing.shippingFee);
    
    if (order.pricing.pointsDiscount > 0) {
        document.getElementById('points-row').classList.remove('d-none');
        document.getElementById('points-discount').textContent = `-${formatCurrency(order.pricing.pointsDiscount)}`;
    }
    
    if (order.pricing.voucherDiscount > 0) {
        document.getElementById('voucher-row').classList.remove('d-none');
        document.getElementById('voucher-discount').textContent = `-${formatCurrency(order.pricing.voucherDiscount)}`;
    }
    
    document.getElementById('grand-total').textContent = formatCurrency(order.pricing.grandTotal);
}

function copyOrderId() {
    const orderId = document.getElementById('order-id').textContent;
    navigator.clipboard.writeText(orderId).then(() => {
        const copyBtn = document.getElementById('btn-copy-order');
        if (copyBtn) {
            copyBtn.innerHTML = `<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
            setTimeout(() => {
                copyBtn.innerHTML = `<svg width="15" height="15" fill="currentColor" viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
            }, 1800);
        }
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

function updateOrderAfterVNPay(orderId, paymentStatus, orderStatus, transactionNo) {
    try {
        const localOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
        const idx = localOrders.findIndex(o => String(o.id) === String(orderId) || String(o.orderId) === String(orderId));
        if (idx !== -1) {
            localOrders[idx].paymentStatus = paymentStatus;
            localOrders[idx].status = orderStatus;
            localOrders[idx].vnpayTransactionNo = transactionNo;
            if (!Array.isArray(localOrders[idx].timeline)) localOrders[idx].timeline = [];
            localOrders[idx].timeline.push({
                status: 'paid',
                title: 'Thanh toán thành công qua VNPAY',
                description: `Giao dịch VNPAY thành công. Mã giao dịch: #${transactionNo}`,
                timestamp: new Date().toISOString()
            });
            localStorage.setItem('pawpal_orders', JSON.stringify(localOrders));
        }

        let currentOrder = JSON.parse(localStorage.getItem('pawpal_current_order') || 'null');
        if (currentOrder && (String(currentOrder.id) === String(orderId) || String(currentOrder.orderId) === String(orderId))) {
            currentOrder.paymentStatus = paymentStatus;
            currentOrder.status = orderStatus;
            currentOrder.vnpayTransactionNo = transactionNo;
            if (!currentOrder.payment) currentOrder.payment = {};
            currentOrder.payment.status = paymentStatus;
            localStorage.setItem('pawpal_current_order', JSON.stringify(currentOrder));
        } else if (idx !== -1) {
            localStorage.setItem('pawpal_current_order', JSON.stringify(localOrders[idx]));
        }

        // Đồng bộ trực tiếp lên Supabase nếu có kết nối
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (db && orderId) {
            const isUUID = typeof orderId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
            let updateQuery = db.from('sales_order').update({
                order_status: 'da_xac_nhan',
                updated_at: new Date().toISOString()
            });
            updateQuery = isUUID ? updateQuery.eq('id', orderId) : updateQuery.eq('order_code', orderId);
            updateQuery.select('id').maybeSingle().then(({ data }) => {
                if (data?.id) {
                    db.from('payment').update({
                        payment_status: 'da_thanh_toan',
                        updated_at: new Date().toISOString()
                    }).eq('order_id', data.id).then(() => {});
                }
            }).catch(e => console.warn('[PaymentSuccess] Supabase update order status failed:', e));
        }
    } catch (e) {
        console.warn('Lỗi cập nhật đơn hàng sau thanh toán VNPAY:', e);
    }
}

