import { API } from '/scripts/api/api.js';

let currentOrder = null;
let isGuest = false; // Giả định: false = Member, true = Guest

async function syncSingleOrderFromSupabase(orderId, currentUser) {
    const db = window.SupabaseClient;
    if (!db || !currentUser) return null;
    try {
        let customerId = currentUser.id;
        if (currentUser._source !== 'supabase') {
            const { data: found } = await db.from('customer').select('id').eq('phone_main', currentUser.phone).limit(1);
            if (!found?.length) return null;
            customerId = found[0].id;
        }

        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
        let query = db
            .from('sales_order')
            .select(`
                id, order_code, order_status, payment_status,
                total_amount,
                created_at, updated_at, note,
                sales_order_detail (
                    id, quantity, unit_price, discount_amount, subtotal,
                    product ( id, product_name, image_urls, sku )
                ),
                customer_address ( receiver_name, receiver_phone, province, street_address ),
                payment ( payment_method_id, transaction_status )
            `)
            .eq('customer_id', customerId)
            .limit(1);

        query = isUUID ? query.eq('id', orderId) : query.eq('order_code', orderId);
        const { data, error } = await query;

        if (error || !data?.length) return null;
        const o = data[0];

        const details = o.sales_order_detail || [];
        const products = details.map(d => ({
            id:       d.product?.id || '',
            name:     d.product?.product_name || 'Sản phẩm',
            sku:      d.product?.sku || '',
            image:    normalizeImageUrl(d.product?.image_urls?.[0]),
            quantity: d.quantity,
            price:    d.unit_price,
            total:    d.subtotal,
        }));
        const addr = o.customer_address;

        const local = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
        const existing = local.find(l => String(l.id) === String(o.order_code || o.id) || String(l._supabaseId) === String(o.id));
        const localPaymentStatus = String(existing?.paymentStatus || existing?.payment?.status || '').toLowerCase();
        const remotePaymentStatus = String(o.payment_status || '').toLowerCase();
        const paymentStatus = localPaymentStatus === 'paid' ? 'paid' : remotePaymentStatus;
        
        const dbPayment = o.payment && o.payment.length > 0 ? o.payment[0] : null;
        const dbPaymentMethod = dbPayment?.payment_method_id?.toLowerCase() || 'cod';
        const paymentMethod = existing?.paymentMethod || dbPaymentMethod;

        const dbStatus = mapOrderStatus(o.order_status);
        const isLocalTerminal = existing && (existing.status === 'completed' || existing.status === 'cancelled');
        const finalStatus = isLocalTerminal ? existing.status : dbStatus;
        const finalOrderStatus = isLocalTerminal ? (existing.orderStatus || existing.order_status) : o.order_status;

        const calculatedSubtotal = products.reduce((sum, p) => sum + (p.total || (p.price * p.quantity)), 0);
        const subtotal = existing?.pricing?.subtotal || calculatedSubtotal;
        const discount = existing?.pricing?.discount || 0;
        const shippingFee = existing?.pricing?.shippingFee !== undefined 
            ? existing.pricing.shippingFee 
            : Math.max(0, (o.total_amount || 0) - subtotal + discount);

        const order = {
            id:          o.order_code || o.id,
            _supabaseId: o.id,
            userId:      currentUser.id,
            userPhone:   currentUser.phone,
            status:      finalStatus,
            orderStatus: finalOrderStatus,
            paymentStatus,
            paymentMethod: paymentMethod,
            products,
            pricing: {
                subtotal:    subtotal,
                shippingFee: shippingFee,
                discount:    discount,
                total:       o.total_amount,
            },
            shipping: addr ? {
                name:    addr.receiver_name  || '',
                phone:   addr.receiver_phone || '',
                address: [addr.street_address, addr.province].filter(Boolean).join(', '),
            } : {},
            note:          o.note || '',
            createdAt:     o.created_at,
            updatedAt:     o.updated_at,
            pointsAwarded: existing?.pointsAwarded || false,
            pointsEarned:  existing?.pointsEarned  || 0,
            timeline:      existing?.timeline || buildTimelineFromStatus(o.order_status, o.created_at, o.updated_at),
            _source:       'supabase',
        };

        const others = local.filter(l => String(l.id) !== String(order.id) && String(l._supabaseId) !== String(o.id));
        localStorage.setItem('pawpal_orders', JSON.stringify([order, ...others]));
        console.log('[OrderDetail] ✅ Synced từ Supabase:', order.id);
        return order;
    } catch (err) {
        console.warn('[OrderDetail] Supabase sync error:', err.message);
        return null;
    }
}

function mapOrderStatus(status) {
    return {
        'PENDING':   'placed',
        'CONFIRMED': 'confirmed',
        'PREPARING': 'preparing',
        'SHIPPING':  'shipping',
        'DELIVERED': 'delivered',
        'COMPLETED': 'completed',
        'CANCELLED': 'cancelled',
    }[status] || 'placed';
}

function normalizeImageUrl(url) {
    if (!url) return '';
    if (!url.startsWith('http') && !url.startsWith('/')) return '/' + url;
    return url;
}

function buildTimelineFromStatus(orderStatus, createdAt, updatedAt) {
    const statusFlow = [
        { status: 'placed',    title: 'Đặt hàng thành công',  desc: 'Đơn hàng đã được ghi nhận.' },
        { status: 'confirmed', title: 'Đã xác nhận',           desc: 'Cửa hàng đã xác nhận đơn.' },
        { status: 'preparing', title: 'Đang chuẩn bị hàng',    desc: 'Cửa hàng đang đóng gói sản phẩm.' },
        { status: 'shipping',  title: 'Đang giao hàng',         desc: 'Đơn hàng đang trên đường đến bạn.' },
        { status: 'delivered', title: 'Đã giao hàng',           desc: 'Đơn hàng đã được giao thành công.' },
        { status: 'completed', title: 'Hoàn thành',             desc: 'Giao dịch hoàn tất.' },
    ];

    const localStatus = mapOrderStatus(orderStatus);
    const statusOrder = statusFlow.map(s => s.status);
    const currentIdx = statusOrder.indexOf(localStatus);

    if (localStatus === 'cancelled') {
        return [
            { status: 'placed',    title: 'Đặt hàng thành công', timestamp: createdAt,  description: '' },
            { status: 'cancelled', title: 'Đã hủy',               timestamp: updatedAt || createdAt, description: 'Đơn hàng đã bị hủy.' },
        ];
    }

    return statusFlow.slice(0, Math.max(currentIdx + 1, 1)).map((step, idx) => ({
        status:      step.status,
        title:       step.title,
        timestamp:   idx === 0 ? createdAt : (idx === currentIdx ? (updatedAt || createdAt) : null),
        description: idx === currentIdx ? step.desc : '',
    })).filter(s => s.timestamp); // bỏ bước chưa có timestamp
}

function resolveDataUrl(path) {
    const scriptSrc = document.currentScript?.src || window.location.href;
    return new URL(path, scriptSrc).href;
}

function getOrderIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

async function loadOrderDetail() {
    const orderId = getOrderIdFromURL();
    
    if (!orderId) {
        showError('Không tìm thấy mã đơn hàng');
        return;
    }
    
    try {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        if (window.SupabaseClient && currentUser) {
            await syncSingleOrderFromSupabase(orderId, currentUser);
            if (!window.pawpalReviews) {
                window.pawpalReviews = await API.getUserReviews(currentUser.id);
            }
        }

        const localOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
        currentOrder = Array.isArray(localOrders) ? localOrders.find(o => String(o.id) === String(orderId)) : null;

        if (!currentOrder) {
            const response = await fetch(resolveDataUrl('../../../data/orders.json'));
            const orders = await response.json();
            currentOrder = Array.isArray(orders) ? orders.find(order => String(order.id) === String(orderId)) : null;
        }

        if (!currentOrder) {
            showError('Không tìm thấy đơn hàng');
            return;
        }
        
        checkAutoComplete();
        
        renderOrderHeader();
        renderDeliveryInfo();
        renderPaymentInfo();
        renderProducts();
        renderSummary();
        renderTimeline();
        renderActions();
        
        if ((currentOrder.status === 'completed') && typeof ReviewHandler !== 'undefined') {
            const orderTimeline = Array.isArray(currentOrder.timeline) ? currentOrder.timeline : [];
            const deliveredEntry = orderTimeline.find(t => t.status === 'delivered' || t.status === 'completed');
            const deliveredDate  = deliveredEntry
                ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(deliveredEntry.timestamp))
                : '';
            const products = currentOrder.products.map(p => ({ ...p, deliveredDate }));
            ReviewHandler.init(currentOrder.id, products);
            scrollToReviewAnchor();

            if (window.location.hash === '#reviews' && ReviewHandler.hasOrderReviewed(currentOrder.id)) {
                setTimeout(() => showOrderReviewsModal(currentOrder.id), 300);
            }

            window.addEventListener('pawpal:reviewSubmitted', (e) => {
                if (String(e.detail.orderId) === String(currentOrder.id)) {
                    renderActions();
                }
            }, { once: true });
        }
        
    } catch (error) {
        console.error('Lỗi load đơn hàng:', error);
        showError('Không thể tải thông tin đơn hàng');
    }
}

function awardLoyaltyPoints(order) {
    if (order.pointsAwarded) return;

    const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (!user || user.is_temporary) return;

    const grandTotal = Number(
        order.pricing?.total ?? order.pricing?.grandTotal ?? 0
    );
    if (grandTotal <= 0) return;

    const pointsEarned = Math.floor(grandTotal / 1000);
    if (pointsEarned <= 0) return;

    const users = JSON.parse('[]' || '[]');
    const idx = users.findIndex(u => u.phone === user.phone);
    if (idx !== -1) {
        users[idx].points  = (users[idx].points  || 0) + pointsEarned;
        users[idx].spend   = (users[idx].spend   || 0) + grandTotal;
        users[idx].lastTransactionAt = new Date().toISOString();

        user.points  = users[idx].points;
        user.spend   = users[idx].spend;
        user.lastTransactionAt = users[idx].lastTransactionAt;
        localStorage.setItem('pawpal_current_user', JSON.stringify(user));
    }

    order.pointsAwarded  = true;
    order.pointsEarned   = pointsEarned;

    console.log(`[Loyalty] +${pointsEarned} Paw Points cho đơn ${order.id} (${grandTotal.toLocaleString('vi-VN')}đ)`);
}

function checkAutoComplete() {
    if (currentOrder.status !== 'delivered') return;
    
    const orderTimeline = Array.isArray(currentOrder.timeline) ? currentOrder.timeline : [];
    const deliveredTimeline = orderTimeline.find(t => t.status === 'delivered');
    if (!deliveredTimeline) return;
    
    const deliveredTime = new Date(deliveredTimeline.timestamp);
    const now = new Date();
    const hoursPassed = (now - deliveredTime) / (1000 * 60 * 60);
    
    if (hoursPassed >= 72) {
        awardLoyaltyPoints(currentOrder);

        currentOrder.status = 'completed';
        orderTimeline.push({
            status: 'completed',
            timestamp: new Date().toISOString(),
            title: 'Hoàn thành',
            description: 'Tự động hoàn thành sau 3 ngày giao hàng'
        });
        currentOrder.timeline = orderTimeline;
        saveOrderToLocalStorage(currentOrder);
        console.log('Đơn hàng tự động hoàn thành');
    }
}

function renderOrderHeader() {
    document.getElementById('order-id').textContent = currentOrder.id;
    document.getElementById('order-created-date').textContent = 
        'Đặt ngày ' + formatDate(currentOrder.createdAt);
    
    const ONLINE_METHODS = ['vnpay', 'momo', 'zalopay', 'vietqr'];
    const payMethod = (currentOrder.paymentMethod || currentOrder.payment?.method || '').toLowerCase();
    const isPaid = currentOrder.paymentStatus === 'paid' || currentOrder.payment?.status === 'paid';
    const isPendingOnlinePaid = (currentOrder.status === 'pending' || currentOrder.status === 'pending_payment')
                             && isPaid && ONLINE_METHODS.includes(payMethod);

    const displayStatus = isPendingOnlinePaid ? 'preparing'   // dùng class xanh/vàng thay vì đỏ
                        : currentOrder.status === 'pending' ? 'pending_payment'
                        : currentOrder.status;
    const displayLabel  = isPendingOnlinePaid ? 'Đã thanh toán — Chờ xác nhận'
                        : getStatusLabel(currentOrder.status);

    const statusBadge = document.getElementById('order-status-badge');
    statusBadge.textContent = displayLabel;
    statusBadge.className = `status-badge status-${displayStatus}`;
}

function renderDeliveryInfo() {
    const delivery = currentOrder.delivery || currentOrder.shipping || {};
    document.getElementById('receiver-name').textContent = delivery.name || '—';
    document.getElementById('receiver-phone').textContent = delivery.phone || '—';
    document.getElementById('receiver-address').textContent = delivery.address || delivery.street || '—';
}

function renderPaymentInfo() {
    const methodLabels = {
        'cod': 'COD - Thanh toán khi nhận hàng',
        'vnpay': 'VNPay',
        'momo': 'MoMo'
    };
    
    document.getElementById('payment-method').textContent = 
        methodLabels[currentOrder.paymentMethod] || currentOrder.paymentMethod;
    
    const statusElement = document.getElementById('payment-status');
    if (currentOrder.paymentStatus === 'paid') {
        statusElement.textContent = 'Đã thanh toán';
        statusElement.className = 'payment-status paid';
    } else {
        statusElement.textContent = 'Chưa thanh toán';
        statusElement.className = 'payment-status unpaid';
    }
}

function renderProducts() {
    const container = document.getElementById('products-list');
    const products = Array.isArray(currentOrder.products) ? currentOrder.products : [];

    if (!products.length) {
        container.innerHTML = '<p class="text-muted small">Không có thông tin sản phẩm.</p>';
        return;
    }

    container.innerHTML = products.map(product => `
        <div class="product-item">
            <img src="${product.image || ''}" 
                 alt="${product.name || 'Sản phẩm'}" 
                 class="product-item-img"
                 loading="lazy">
            <div class="product-item-info">
                <h4 class="product-item-name">${product.name || 'Sản phẩm'}</h4>
                <p class="product-item-meta">x${product.quantity || 1}</p>
            </div>
            <div class="product-item-price">${formatCurrency(toNumber(product.total))}</div>
        </div>
    `).join('');
}

function renderSummary() {
    const subtotal    = toNumber(currentOrder.pricing?.subtotal);
    const shippingFee = toNumber(currentOrder.pricing?.shippingFee);
    const discount = toNumber(currentOrder.pricing?.discount)
                  || toNumber(currentOrder.pricing?.voucherDiscount)
                   + toNumber(currentOrder.pricing?.pointsDiscount);
    const total = resolveOrderTotal(currentOrder.pricing, subtotal, shippingFee, discount);

    document.getElementById('subtotal').textContent =
        formatCurrency(subtotal);
    document.getElementById('shipping-fee').textContent =
        formatCurrency(shippingFee);
    document.getElementById('discount').textContent =
        discount > 0
            ? '-' + formatCurrency(discount)
            : '0đ';
    document.getElementById('total').textContent =
        formatCurrency(total);
}

function renderTimeline() {
    const container = document.getElementById('order-timeline');
    
    const statusOrder = ['placed', 'confirmed', 'preparing', 'shipping', 'delivered', 'completed'];
    const currentIndex = statusOrder.indexOf(currentOrder.status);
    
    const timeline = currentOrder.timeline || buildTimelineFromStatus(currentOrder.orderStatus || currentOrder.status, currentOrder.createdAt, currentOrder.updatedAt || currentOrder.createdAt);
    
    container.innerHTML = timeline.map((item, index) => {
        let itemClass = 'timeline-item';
        
        const itemStatusIndex = statusOrder.indexOf(item.status);
        if (itemStatusIndex < currentIndex) {
            itemClass += ' completed';
        } else if (itemStatusIndex === currentIndex) {
            itemClass += ' active';
        } else {
            itemClass += ' pending';
        }
        
        return `
            <div class="${itemClass}">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    <h4 class="timeline-title">${item.title}</h4>
                    <p class="timeline-time">${formatDate(item.timestamp)}</p>
                    ${item.description ? 
                        `<p class="timeline-desc">${item.description}</p>` 
                        : ''}
                </div>
            </div>
        `;
    }).join('');
}

function renderActions() {
    const actionsContainer = document.getElementById('order-actions');
    const guestNotice = document.getElementById('guest-notice');
    const statusNotes = [];
    
    if (isGuest) {
        actionsContainer.classList.add('d-none');
        guestNotice.classList.remove('d-none');
        return;
    }
    
    let buttons = [];
    
    switch(currentOrder.status) {
        case 'placed':
        case 'pending':
        case 'pending_payment': {
            const isPaid   = currentOrder.paymentStatus === 'paid'
                          || currentOrder.payment?.status === 'paid';
            const ONLINE_METHODS = ['vnpay', 'momo', 'zalopay', 'vietqr'];
            const payMethod = (currentOrder.paymentMethod || currentOrder.payment?.method || '').toLowerCase();
            const isCOD     = payMethod === 'cod';
            const isOnline  = ONLINE_METHODS.includes(payMethod);

            if (isPaid && isOnline) {
            } else if (!isPaid && isOnline) {
                buttons.push(`
                    <button class="btn-cta" onclick="payNow()">
                        Thanh toán ngay
                    </button>
                `);
            }

            buttons.push(`
                <button class="btn-danger-outline" onclick="cancelOrder()">
                    Hủy đơn hàng
                </button>
            `);
            break;
        }
            
        case 'preparing':
            buttons.push(`
                <button class="btn-green-outline" onclick="contactHotline()">
                    Liên hệ hotline
                </button>
                <button class="btn-danger-outline" onclick="cancelOrder()">
                    Hủy đơn hàng
                </button>
            `);
            break;
            
        case 'shipping':
            buttons.push(`
                <button class="btn-green-outline" onclick="contactHotline()">
                    Liên hệ hotline
                </button>
            `);
            break;
            
        case 'delivered':
            buttons.push(`
                <button class="btn-cta" onclick="confirmReceived()">
                    Xác nhận đã nhận hàng
                </button>
            `);
            break;

        case 'completed': {
            const completedEntry = currentOrder.timeline
                ? currentOrder.timeline.slice().reverse().find(t => t.status === 'completed')
                : null;
            const completedAt = completedEntry ? new Date(completedEntry.timestamp) : new Date(currentOrder.createdAt || 0);
            const daysPassed = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
            const withinReturnWindow = daysPassed <= 7;

            const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
            const alreadyReturned = returnsList.some(r => r.orderId === currentOrder.id);

            const orderAlreadyReviewed = typeof ReviewHandler !== 'undefined'
                ? ReviewHandler.hasOrderReviewed(currentOrder.id)
                : false;

            if (alreadyReturned) {
                buttons.push(`
                    <a href="/pages/user/return-detail/return-detail.html?orderId=${currentOrder.id}" class="btn-track-order text-decoration-none">
                        Chi tiết đổi trả
                    </a>
                `);
            } else if (!withinReturnWindow) {
                statusNotes.push(`
                    <span class="order-warning-text order-inline-note" title="Đã quá 7 ngày kể từ ngày nhận hàng, không thể yêu cầu đổi trả.">
                        Hết hạn đổi trả
                    </span>
                `);
            } else if (orderAlreadyReviewed) {
                statusNotes.push(`
                    <span class="order-reviewed-note order-inline-note" title="Giao dịch đã được đánh giá, không thể đổi trả.">
                        Đã đánh giá
                    </span>
                `);
            } else {
                buttons.push(`
                    <button class="btn-track-order" onclick="openRMADrawer('${currentOrder.id}')">
                        Yêu cầu trả hàng/hoàn tiền
                    </button>
                `);
            }
            
            if (orderAlreadyReviewed) {
                buttons.push(`
                    <button class="btn-review border-0" onclick="showOrderReviewsModal('${currentOrder.id}')">
                        Xem đánh giá
                    </button>
                `);
            }

            buttons.push(`
                <button class="btn-view-detail border-0" onclick="reorder('${currentOrder.id}')">
                    Mua lại
                </button>
            `);
            break;
        }

        case 'cancelled': {
            const isPaidCancelled = currentOrder.paymentStatus === 'paid'
                                 || currentOrder.payment?.status === 'paid';
            const isRefunded      = currentOrder.paymentStatus === 'refunded';
            const isPendingRefund = currentOrder.paymentStatus === 'pending_refund';
            const isCODCancelled  = currentOrder.paymentMethod === 'cod';

            if (isRefunded) {
                statusNotes.push(`
                    <span class="order-reviewed-note order-inline-note" style="color:var(--color-success);">
                        Đã hoàn tiền
                    </span>
                `);
            } else if (isPendingRefund || isPaidCancelled && !isCODCancelled) {
                statusNotes.push(`
                    <span class="order-warning-text order-inline-note" title="Yêu cầu hoàn tiền đã được ghi nhận, đang xử lý.">
                        Đang xử lý hoàn tiền
                    </span>
                `);
            }

            buttons.push(`
                <button class="btn-view-detail border-0" onclick="reorder('${currentOrder.id}')">
                    Đặt lại
                </button>
            `);
            break;
        }

        case 'return_pending': {
            const rmaList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
            const rma = rmaList.find(r => String(r.orderId) === String(currentOrder.id));
            if (rma) {
                buttons.push(`
                    <a href="/pages/user/return-detail/return-detail.html?orderId=${currentOrder.id}" class="btn-track-order text-decoration-none">
                        Theo dõi đổi trả
                    </a>
                `);
            }
            buttons.push(`
                <button class="btn-green-outline" onclick="contactHotline()">
                    Liên hệ hotline
                </button>
            `);
            break;
        }
    }
    
    actionsContainer.innerHTML = `
        ${statusNotes.length ? `<div class="order-status-notes">${statusNotes.join('')}</div>` : ''}
        <div class="order-actions-buttons">${buttons.join('')}</div>
    `;
    actionsContainer.style.display = buttons.length > 0 ? 'flex' : 'none';
}

function payNow() {
    const ONLINE_METHODS = ['vnpay', 'momo', 'zalopay', 'vietqr'];
    const payMethod = (currentOrder.paymentMethod || currentOrder.payment?.method || '').toLowerCase();
    if (!ONLINE_METHODS.includes(payMethod)) return; // Guard: COD/unknown không gọi được

    currentOrder.shipping = currentOrder.delivery || currentOrder.shipping || {};
    currentOrder.items = (currentOrder.products || []).map(p => ({
        productId: p.id,
        name: p.name,
        image: p.image,
        quantity: p.quantity,
        price: p.price,
        total: p.total
    }));
    localStorage.setItem('pawpal_current_order', JSON.stringify(currentOrder));

    window.location.href = `/pages/shop/payment-success/payment-success.html?orderId=${currentOrder.id}`;
}

function restoreStockForOrder(order) {
    if (!order || !Array.isArray(order.products)) return;
    try {
        const storedProducts = JSON.parse(localStorage.getItem('pawpal_products') || '[]');
        if (!storedProducts.length) return; // không có cache sản phẩm, bỏ qua

        order.products.forEach(item => {
            const idx = storedProducts.findIndex(p => String(p.id) === String(item.id));
            if (idx !== -1) {
                storedProducts[idx].stock = (Number(storedProducts[idx].stock) || 0) + (Number(item.quantity) || 0);
                storedProducts[idx].inStock = true;
            }
        });
        localStorage.setItem('pawpal_products', JSON.stringify(storedProducts));
    } catch (e) {
        console.warn('restoreStockForOrder error:', e);
    }
}

function cancelOrder() {
    const isPaidOnline = (currentOrder.paymentStatus === 'paid' || currentOrder.payment?.status === 'paid')
                      && currentOrder.paymentMethod !== 'cod';
    const refundAmount = (() => {
        if (!isPaidOnline) return 0;
        const subtotal    = toNumber(currentOrder.pricing?.subtotal);
        const shippingFee = toNumber(currentOrder.pricing?.shippingFee);
        const discount    = toNumber(currentOrder.pricing?.discount);
        return resolveOrderTotal(currentOrder.pricing, subtotal, shippingFee, discount);
    })();

    const refundNote = isPaidOnline
        ? `<div class="alert alert-warning py-2 px-3 mt-2 mb-0 small">
               Đơn hàng đã thanh toán qua <strong>${currentOrder.paymentMethod === 'vnpay' ? 'VNPay' : 'MoMo'}</strong>.
               Số tiền <strong>${formatCurrency(refundAmount)}</strong> sẽ được hoàn lại theo chính sách của cửa hàng.
           </div>`
        : '';

    const modalId = 'cancelOrderModal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = modalId;
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Xác nhận hủy đơn hàng</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Bạn có chắc chắn muốn hủy đơn hàng <strong>${currentOrder.id}</strong>?</p>
                    <p class="text-muted small">Đơn hàng sau khi hủy sẽ không thể khôi phục.</p>
                    ${refundNote}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Quay lại</button>
                    <button type="button" class="btn-danger-outline" id="confirmCancelOrderBtn">Xác nhận hủy</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    document.getElementById('confirmCancelOrderBtn').addEventListener('click', async () => {
        modal.hide();
        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        restoreStockForOrder(currentOrder);

        const isPaidOnline = currentOrder.paymentMethod && currentOrder.paymentMethod !== 'cod' && currentOrder.paymentStatus === 'paid';
        const newPaymentStatus = isPaidOnline ? 'pending_refund' : 'cancelled';

        if (db) {
            try {
                const { error: cancelErr } = await db.from('sales_order').update({
                    order_status: 'CANCELLED',
                    payment_status: isPaidOnline ? 'PENDING_REFUND' : 'CANCELLED',
                    note: cancelReason ? `[Lý do hủy: ${cancelReason}]` : null,
                    updated_at: new Date().toISOString()
                }).eq('id', currentOrder.id);
                if (cancelErr) console.warn('[OrderDetail] Supabase cancel error:', cancelErr);
            } catch (err) {
                console.warn('[OrderDetail] Supabase cancel exception:', err);
            }
        }

        if (isPaidOnline) {
            const refunds = JSON.parse(localStorage.getItem('pawpal_refunds') || '[]');
            const subtotal = toNumber(currentOrder.pricing?.subtotal);
            const shippingFee = toNumber(currentOrder.pricing?.shippingFee);
            const discount = toNumber(currentOrder.pricing?.discount);
            refunds.push({
                orderId: currentOrder.id,
                amount: resolveOrderTotal(currentOrder.pricing, subtotal, shippingFee, discount),
                paymentMethod: currentOrder.paymentMethod,
                status: 'pending_refund',
                reason: cancelReason,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('pawpal_refunds', JSON.stringify(refunds));
        }

        currentOrder.status = 'cancelled';
        currentOrder.paymentStatus = newPaymentStatus;
        const orderTimeline = Array.isArray(currentOrder.timeline) ? currentOrder.timeline : (currentOrder.timeline = []);
        orderTimeline.push({
            status: 'cancelled',
            timestamp: new Date().toISOString(),
            title: 'Đã hủy',
            description: isPaidOnline
                ? `Khách hàng đã hủy đơn hàng. Yêu cầu hoàn tiền ${formatCurrency(refundAmount)} đã được ghi nhận.`
                : 'Khách hàng đã hủy đơn hàng'
        });
        saveOrderToLocalStorage(currentOrder);
        window.location.href = '/pages/user/orders/orders.html';
    });
}

function scrollToReviewAnchor() {
    if (window.location.hash !== '#reviews') return;

    const target = document.getElementById('reviews') || document.querySelector('.order-reviews-heading');
    if (!target) {
        setTimeout(scrollToReviewAnchor, 120);
        return;
    }

    setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
}

window.cancelOrder = cancelOrder;

function contactHotline() {
    showPawPalToast('Tổng đài CSKH PawPal: 1900 xxxx — Vui lòng gọi để được hỗ trợ.', 'info');
}

window.contactHotline = contactHotline;

function confirmReceived() {
    const modalId = 'confirmReceivedModal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = modalId;
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Xác nhận đã nhận hàng</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Bạn xác nhận đã nhận được đơn hàng <strong>${currentOrder.id}</strong>?</p>
                    <p class="text-muted small">Sau khi xác nhận, đơn hàng sẽ chuyển sang trạng thái Hoàn thành.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Chưa nhận</button>
                    <button type="button" class="btn-cta" id="confirmReceivedBtn">Đã nhận hàng</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    document.getElementById('confirmReceivedBtn').addEventListener('click', function() {
        this.disabled = true;
        this.innerHTML = 'Đang xử lý...';
        modal.hide();

        const mainBtns = document.querySelectorAll('.btn-cta[onclick="confirmReceived()"]');
        mainBtns.forEach(btn => {
            btn.disabled = true;
            btn.style.display = 'none';
        });

        awardLoyaltyPoints(currentOrder);
        const pointsEarned = currentOrder.pointsEarned || 0;

        currentOrder.status = 'completed';
        currentOrder.orderStatus = 'COMPLETED';
        const orderTimeline = Array.isArray(currentOrder.timeline) ? currentOrder.timeline : (currentOrder.timeline = []);
        orderTimeline.push({
            status: 'completed',
            timestamp: new Date().toISOString(),
            title: 'Hoàn thành',
            description: 'Khách hàng xác nhận đã nhận hàng'
        });
        saveOrderToLocalStorage(currentOrder);
        if (window.API && typeof window.API.updateOrderStatus === 'function') {
            window.API.updateOrderStatus(currentOrder.id, 'COMPLETED').catch((err) => {
                console.warn('[OrderDetail] Failed to sync completed status:', err);
            });
        }

        if (pointsEarned > 0 && typeof showPawPalToast === 'function') {
            showPawPalToast(`Xác nhận thành công! Bạn vừa tích được +${pointsEarned} Paw Points.`, 'success');
            setTimeout(() => location.reload(), 1200);
        } else {
            location.reload();
        }
    });
}

window.confirmReceived = confirmReceived;

function saveOrderToLocalStorage(order) {
    const allOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
    const index = allOrders.findIndex(o => String(o.id) === String(order.id));
    if (index !== -1) {
        allOrders[index] = order;
    } else {
        allOrders.push(order);
    }
    localStorage.setItem('pawpal_orders', JSON.stringify(allOrders));
}

function showOrderReviewsModal(orderId) {
    const allReviews = JSON.parse(localStorage.getItem('pawpal_reviews') || '[]');
    const myReviews  = allReviews.filter(r => String(r.orderId) === String(orderId));

    if (myReviews.length === 0) {
        showPawPalToast('Không tìm thấy đánh giá cho đơn hàng này.', 'info');
        return;
    }

    function getProductName(productId) {
        if (!currentOrder || !Array.isArray(currentOrder.products)) return '';
        const p = currentOrder.products.find(x => String(x.id) === String(productId));
        return p ? p.name : '';
    }
    function getProductImg(productId) {
        if (!currentOrder || !Array.isArray(currentOrder.products)) return '';
        const p = currentOrder.products.find(x => String(x.id) === String(productId));
        return p ? p.image : '';
    }

    const reviewItems = myReviews.map(r => {
        const filledStars = '&#9733;'.repeat(r.rating);
        const emptyStars  = '&#9734;'.repeat(5 - r.rating);
        const productName = getProductName(r.productId);
        const productImg  = getProductImg(r.productId);
        const defaultBadge = r.isDefaultRating
            ? '<span class="review-modal-default-badge">Mặc định 5&#9733;</span>'
            : '';

        const mediaHTML = r.media && r.media.length
            ? `<div class="review-modal-media">${r.media.map((m, i) =>
                m.type === 'video'
                    ? `<video src="${m.src}" muted class="review-modal-thumb"></video>`
                    : `<img src="${m.src}" alt="Ảnh ${i + 1}" class="review-modal-thumb" loading="lazy">`
              ).join('')}</div>`
            : '';

        return `
            <div class="review-modal-item">
                <div class="review-modal-product">
                    ${productImg ? `<img src="${productImg}" alt="${productName}" class="review-modal-product-img">` : ''}
                    <span class="review-modal-product-name">${productName || 'Sản phẩm'}</span>
                </div>
                <div class="review-modal-stars" aria-label="${r.rating} sao">
                    <span class="stars-filled">${filledStars}</span><span class="stars-empty">${emptyStars}</span>
                    ${defaultBadge}
                </div>
                ${r.comment
                    ? `<p class="review-modal-comment">${r.comment}</p>`
                    : '<p class="review-modal-comment text-muted"><em>Không có nhận xét</em></p>'}
                ${mediaHTML}
            </div>`;
    }).join('');

    const existing = document.getElementById('review-modal-overlay');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', `
        <div id="review-modal-overlay" class="review-modal-overlay" role="dialog" aria-modal="true" aria-label="Xem đánh giá đơn hàng">
            <div class="review-modal-content">
                <button class="review-modal-close" onclick="document.getElementById('review-modal-overlay').remove()" aria-label="Đóng">&times;</button>
                <h3 class="review-modal-title">Đánh giá của bạn</h3>
                <div class="review-modal-body">
                    ${reviewItems}
                </div>
            </div>
        </div>
    `);

    document.getElementById('review-modal-overlay').addEventListener('click', function(e) {
        if (e.target === this) this.remove();
    });
}

window.showOrderReviewsModal = showOrderReviewsModal;

function reorder(orderId) {
    if (!currentOrder || !Array.isArray(currentOrder.products) || currentOrder.products.length === 0) {
        showPawPalToast('Không tìm thấy sản phẩm để mua lại.', 'error');
        return;
    }

    const cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');

    currentOrder.products.forEach((product) => {
        const productId = product.id != null ? String(product.id) : '';
        const quantity = Number(product.quantity || 1);

        if (!productId) return;

        const existing = cart.find(item => String(item.id) === productId);
        if (existing) {
            existing.quantity = (Number(existing.quantity) || 1) + quantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                brand: product.brand || '',
                price: Number(product.price || 0),
                quantity,
                image: product.image || '',
                stock: Number(product.stock || 99)
            });
        }
    });

    if (window.saveCart) window.saveCart(cart); else if (window.saveCart) window.saveCart(cart); else localStorage.setItem('pawpal_cart', JSON.stringify(cart));
    updateCartBadgeCount();

    showPawPalToast(`Đã thêm ${currentOrder.products.length} sản phẩm của đơn hàng ${orderId} vào giỏ hàng.`, 'success');
}

function showPawPalToast(message, type = 'info') {
    let container = document.getElementById('pawpal-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'pawpal-toast-container';
        container.style.cssText = 'position:fixed;top:92px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:360px;';
        document.body.appendChild(container);
    }

    const colors = {
        success: '#2d7d46',
        error: '#c44536',
        warning: '#d18b00',
        info: '#2b6cb0'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `background:${colors[type] || colors.info};color:#fff;padding:14px 16px;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.18);font-size:14px;line-height:1.45;`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(12px)';
        toast.style.transition = 'opacity .25s ease, transform .25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

function updateCartBadgeCount() {
    const cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    const badge = document.querySelector('.cart-count, .cart-badge');
    if (badge) {
        badge.textContent = totalItems;
        badge.classList.remove('d-none');
    }
}

function showError(message) {
    document.querySelector('.order-detail-main').innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">•</div>
            <p class="empty-state-text">${message}</p>
            <a href="/pages/user/orders/orders.html" class="btn-cta mt-4">
                Quay lại danh sách đơn hàng
            </a>
        </div>
    `;
}

function formatCurrency(amount) {
    const value = Number(amount);
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(Number.isFinite(value) ? value : 0);
}

function toNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

function resolveOrderTotal(pricing, subtotal = 0, shippingFee = 0, discount = 0) {
    const directTotal = toNumber(pricing?.total, NaN);
    if (Number.isFinite(directTotal) && directTotal > 0) {
        return directTotal;
    }

    const fallbackTotal = subtotal + shippingFee - discount;
    return fallbackTotal > 0 ? fallbackTotal : 0;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

function getStatusLabel(status) {
    const labels = {
        'placed':          'Chờ xử lý',
        'pending':         'Chờ thanh toán',
        'pending_payment': 'Chờ thanh toán',
        'confirmed':       'Đã xác nhận',
        'preparing':       'Đang chuẩn bị',
        'shipping':        'Đang giao',
        'delivered':       'Đã giao hàng',
        'completed':       'Hoàn thành',
        'cancelled':       'Đã hủy',
        'return_pending':  'Chờ duyệt đổi trả',
        'return_approved': 'Đổi trả được duyệt',
        'refunded':        'Đã hoàn tiền'
    };
    return labels[status] || status;
}

document.addEventListener('DOMContentLoaded', () => {
    
    const params = new URLSearchParams(window.location.search);
    isGuest = params.get('guest') === 'true';
    
    loadOrderDetail();
});
