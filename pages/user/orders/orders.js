/**
 * ORDERS PAGE
 * Reads seeded orders from /data/orders.json through the API cache.
 */

import { API } from '/scripts/api/api.js';

// ============================================================================
// Supabase Sync — Đồng bộ đơn hàng từ Supabase vào localStorage
// ============================================================================
async function syncOrdersFromSupabase(currentUser) {
    const db = window.SupabaseClient;
    if (!db || !currentUser) return;
    try {
        // Tìm customer UUID nếu dùng mock id
        let customerId = currentUser.id;
        if (currentUser._source !== 'supabase') {
            const { data: found } = await db.from('customer').select('id').eq('phone_main', currentUser.phone).limit(1);
            if (!found?.length) return;
            customerId = found[0].id;
        }

        const { data, error } = await db
            .from('sales_order')
            .select(`
                id, order_code, order_status, payment_status,
                subtotal, shipping_fee, discount_amount, total_amount,
                created_at, updated_at, note,
                sales_order_detail (
                    id, quantity, unit_price, discount_amount, subtotal,
                    product ( id, product_name, image_urls, sku )
                ),
                customer_address ( receiver_name, receiver_phone, province, street_address )
            `)
            .eq('customer_id', customerId)
            .order('created_at', { ascending: false });

        if (error) { console.error('[Orders] Supabase error:', error.message); return; }

        const orders = (data || []).map(o => {
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
            return {
                id:          o.order_code || o.id,
                _supabaseId: o.id,
                userId:      currentUser.id,
                userPhone:   currentUser.phone,
                status:      mapOrderStatus(o.order_status),
                orderStatus: o.order_status,
                paymentStatus: (o.payment_status || '').toLowerCase(),
                paymentMethod: 'cod',
                products,
                pricing: {
                    subtotal:    o.subtotal,
                    shippingFee: o.shipping_fee,
                    discount:    o.discount_amount,
                    total:       o.total_amount,
                },
                shipping: addr ? {
                    name:    addr.receiver_name  || '',
                    phone:   addr.receiver_phone || '',
                    address: [addr.street_address, addr.province].filter(Boolean).join(', '),
                } : {},
                note:      o.note || '',
                createdAt: o.created_at,
                updatedAt: o.updated_at,
                _source:   'supabase',
            };
        });

        // Preserve pointsAwarded từ local
        const local = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
        const withFlags = orders.map(o => {
            const existing = local.find(l => String(l.id) === String(o.id));
            return { ...o, pointsAwarded: existing?.pointsAwarded || false, pointsEarned: existing?.pointsEarned || 0 };
        });

        const others = local.filter(l =>
            String(l.userId) !== String(currentUser.id) &&
            String(l.userPhone) !== String(currentUser.phone)
        );
        localStorage.setItem('pawpal_orders', JSON.stringify([...withFlags, ...others]));
        localStorage.setItem('pawpal_orders_supabase_synced', String(currentUser.phone));
        console.log('[Orders] ✅ Synced từ Supabase:', orders.length, 'đơn hàng');
    } catch (err) {
        console.warn('[Orders] Supabase sync error:', err.message);
    }
}

function mapOrderStatus(status) {
    return {
        'PENDING':   'placed',
        'CONFIRMED': 'preparing',
        'PACKING':   'preparing',
        'PREPARING': 'preparing',
        'SHIPPING':  'shipping',
        'SHIPPED':   'shipping',
        'DELIVERED': 'delivered',
        'COMPLETED': 'completed',
        'CANCELLED': 'cancelled',
        'RETURNED':  'cancelled',
    }[status] || 'placed';
}

function normalizeImageUrl(url) {
    if (!url) return '';
    // Thêm / vào đầu nếu là relative path không có leading slash
    if (!url.startsWith('http') && !url.startsWith('/')) return '/' + url;
    return url;
}

const ordersState = {
    allOrders: [],
    filteredOrders: [],
    currentTab: 'all',
    currentPage: 1,
    ordersPerPage: 10,
    searchQuery: ''
};

async function loadOrders() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        if (window.SupabaseClient && currentUser) {
            await syncOrdersFromSupabase(currentUser);
        }

        await API.initData();

        if (!currentUser) {
            showEmptyState('Vui lòng đăng nhập để xem đơn hàng.');
            return;
        }

        const orders = await API.getUserOrders(currentUser.id);
        const normalizedOrders = Array.isArray(orders) ? orders : [];
        const uniqueOrders = Array.from(
            normalizedOrders.reduce((map, order) => {
                const key = String(order?._supabaseId || order?.id || '');
                if (!key) return map;
                if (!map.has(key)) {
                    map.set(key, order);
                    return map;
                }

                const existing = map.get(key);
                if (currentUser._source === 'supabase' && existing?._source !== 'supabase' && order?._source === 'supabase') {
                    map.set(key, order);
                }
                return map;
            }, new Map()).values()
        );

        ordersState.allOrders = currentUser._source === 'supabase'
            ? uniqueOrders.filter((order) => order._source === 'supabase' || order._supabaseId)
            : uniqueOrders;
        ordersState.filteredOrders = ordersState.allOrders;

        updateStats();
        updateTabCounts();
        renderOrders();
    } catch (error) {
        console.error('Lỗi load đơn hàng:', error);
        showEmptyState('Không thể tải đơn hàng. Vui lòng thử lại sau.');
    }
}

function updateStats() {
    const processingStatuses = ['pending', 'pending_payment', 'preparing', 'shipping', 'delivered'];
    const processingCount = ordersState.allOrders.filter((order) => processingStatuses.includes(order.status)).length;
    const completedCount = ordersState.allOrders.filter((order) => order.status === 'completed').length;
    const totalSpent = ordersState.allOrders
        .filter((order) => order.paymentStatus === 'paid')
        .reduce((sum, order) => {
            // Đọc cả `total` lẫn `grandTotal` để tương thích đơn cũ và mới
            const amount = toNumber(order.pricing?.total)
                        || toNumber(order.pricing?.grandTotal);
            return sum + amount;
        }, 0);

    document.getElementById('processing-count').textContent = processingCount;
    document.getElementById('completed-count').textContent = completedCount;
    document.getElementById('total-spent').textContent = formatCurrency(totalSpent);
}

function updateTabCounts() {
    const statuses = ['all', 'pending_payment', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled'];

    statuses.forEach((status) => {
        const count = status === 'all'
            ? ordersState.allOrders.length
            : ordersState.allOrders.filter((order) => normalizeOrderStatus(order.status) === status).length;

        const countElement = document.getElementById(`count-${status}`);
        if (countElement) countElement.textContent = `(${count})`;
    });
}

function filterByStatus(status) {
    ordersState.currentTab = status;
    ordersState.currentPage = 1;
    applyFilters();
}

function searchOrders(query) {
    ordersState.searchQuery = query.toLowerCase();
    ordersState.currentPage = 1;
    applyFilters();
}

function applyFilters() {
    let filtered = ordersState.allOrders;

    if (ordersState.currentTab !== 'all') {
        filtered = filtered.filter((order) => normalizeOrderStatus(order.status) === ordersState.currentTab);
    }

    if (ordersState.searchQuery) {
        filtered = filtered.filter((order) => {
            const matchId = order.id.toLowerCase().includes(ordersState.searchQuery);
            const matchProducts = order.products.some((product) => product.name.toLowerCase().includes(ordersState.searchQuery));
            return matchId || matchProducts;
        });
    }

    ordersState.filteredOrders = filtered;
    renderOrders();
}

function renderOrders() {
    const container = document.getElementById('orders-list');

    if (ordersState.filteredOrders.length === 0) {
        showEmptyState('Không tìm thấy đơn hàng nào');
        return;
    }

    const startIndex = (ordersState.currentPage - 1) * ordersState.ordersPerPage;
    const endIndex = startIndex + ordersState.ordersPerPage;
    const ordersToShow = ordersState.filteredOrders.slice(startIndex, endIndex);

    container.innerHTML = ordersToShow.map((order) => createOrderCard(order)).join('');
    renderPagination();
}

function createOrderCard(order) {
    const orderId = order.id || order._id || '';
    const firstProduct = (order.products && order.products.length > 0)
        ? order.products[0]
        : { name: 'Đơn hàng', image: '', sku: '', quantity: 1, price: 0, total: 0 };
    const remainingCount = order.products.length - 1;
    const normalizedStatus = normalizeOrderStatus(order.status);

    // Đọc paymentStatus từ cả 2 cấu trúc dữ liệu
    const isPaid = order.paymentStatus === 'paid' || order.payment?.status === 'paid';
    const ONLINE_METHODS = ['vnpay', 'momo', 'zalopay', 'vietqr'];
    const payMethod = (order.paymentMethod || order.payment?.method || '').toLowerCase();
    const isOnline  = ONLINE_METHODS.includes(payMethod);

    // Badge: pending + online + paid → "Chờ xác nhận" thay vì "Chờ thanh toán"
    const isPendingConfirm = (normalizedStatus === 'placed' || normalizedStatus === 'pending_payment') && isPaid && isOnline;
    const displayStatusLabel = isPendingConfirm ? 'Chờ xác nhận' : getStatusLabel(normalizedStatus);
    const displayStatusClass = isPendingConfirm ? 'status-preparing' : `status-${normalizedStatus}`;

    const isCompleted = normalizedStatus === 'completed';
    const productCount = Array.isArray(order.products)
        ? order.products.reduce((sum, product) => sum + (Number(product.quantity) || 1), 0)
        : 0;
    const paymentLabel = getPaymentMethodLabel(order.paymentMethod);
    // Dùng pawpal_order_reviewed (batch lock) để check toàn đơn đã submit chưa
    const orderReviewedList = JSON.parse(localStorage.getItem('pawpal_order_reviewed') || '[]');
    const orderAlreadyReviewed = isCompleted && orderReviewedList.includes(String(orderId));

    const reviewActionHTML = isCompleted
        ? orderAlreadyReviewed
            ? `<a class="btn-review" href="/pages/user/order-detail/order-detail.html?id=${orderId}#reviews" aria-label="Xem đánh giá đơn hàng ${orderId}">Xem đánh giá</a>`
            : `<a class="btn-review" href="/pages/user/order-detail/order-detail.html?id=${orderId}#reviews" aria-label="Đánh giá đơn hàng ${orderId}">Đánh giá</a>`
        : '';

    const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
    const alreadyReturned = returnsList.some((item) => String(item.orderId) === String(orderId));

    const reviewedList = JSON.parse(localStorage.getItem('pawpal_reviewed') || '[]');
    // hasAnyReviewed đã được tính ở trên từ `reviewed` array — dùng lại không khai báo lại

    let returnActionHTML = '';
    const statusNoticeChips = [];

    if (isCompleted) {
        if (orderAlreadyReviewed) {
            statusNoticeChips.push(`<span class="order-meta-chip meta-chip-success">Đã đánh giá</span>`);
        }

        const completedEntry = Array.isArray(order.timeline)
            ? order.timeline.slice().reverse().find((timelineItem) => timelineItem.status === 'completed')
            : null;
        const completedAt = completedEntry ? new Date(completedEntry.timestamp) : new Date(order.createdAt || 0);
        const daysPassed = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
        const withinReturnWindow = daysPassed <= 7;

        if (alreadyReturned) {
            returnActionHTML = `
                <a href="/pages/user/return-detail/return-detail.html?orderId=${orderId}" class="btn-track-order text-decoration-none">
                    Chi tiết đổi trả
                </a>
            `;
            statusNoticeChips.push(`<span class="order-meta-chip meta-chip-info">Đã yêu cầu đổi trả</span>`);
        } else if (!withinReturnWindow) {
            statusNoticeChips.push(`<span class="order-meta-chip meta-chip-warning" title="Đã quá 7 ngày, không thể yêu cầu đổi trả.">Hết hạn đổi trả</span>`);
        } else if (orderAlreadyReviewed) {
            statusNoticeChips.push(`<span class="order-meta-chip meta-chip-muted" title="Giao dịch đã được đánh giá, không thể đổi trả.">Hết hạn đổi trả</span>`);
        } else {
            returnActionHTML = `
                <button class="btn-track-order" onclick="openRMADrawer('${orderId}')">
                    Yêu cầu trả hàng/hoàn tiền
                </button>
            `;
        }
    }

    const metaParts = [
        productCount > 0 ? `${productCount} sản phẩm` : '',
        paymentLabel,
        normalizedStatus === 'shipping' ? 'Đang giao tới bạn' : '',
        normalizedStatus === 'completed' ? 'Đơn đã hoàn tất' : '',
        // Hiển thị đúng trạng thái: đã thanh toán chờ xác nhận vs chưa thanh toán
        (normalizedStatus === 'placed' || normalizedStatus === 'pending_payment') && isPaid && isOnline ? 'Đã thanh toán — chờ xác nhận' :
        (normalizedStatus === 'placed' || normalizedStatus === 'pending_payment') && !isPaid ? 'Chờ thanh toán' : '',
        normalizedStatus === 'preparing' ? 'Shop đang đóng gói' : ''
    ].filter(Boolean);

    const reorderActionHTML = isCompleted
        ? `<button class="btn-view-detail border-0" onclick="reorder('${orderId}')">Mua lại</button>`
        : '';

    const detailActionHTML = `<a href="/pages/user/order-detail/order-detail.html?id=${orderId}" class="btn-view-detail text-decoration-none">Xem chi tiết</a>`;

    let footerButtonsHTML = '';
    if (normalizedStatus === 'shipping') {
        footerButtonsHTML = `
            ${detailActionHTML}
            <button class="btn-track-order" onclick="contactHotline('${orderId}')">
                Liên hệ hotline
            </button>
        `;
    } else if (normalizedStatus === 'placed' || normalizedStatus === 'pending_payment' || normalizedStatus === 'preparing') {
        if (isPaid && isOnline) {
            // Đã thanh toán online, chờ admin xác nhận — không cho hủy, chỉ liên hệ hotline
            footerButtonsHTML = `
                ${detailActionHTML}
                <button class="btn-track-order" onclick="contactHotline('${orderId}')">
                    Liên hệ hotline
                </button>
            `;
        } else {
            // Chưa thanh toán hoặc đang chuẩn bị — cho hủy
            footerButtonsHTML = `
                ${detailActionHTML}
                <button class="btn-track-order" onclick="contactHotline('${orderId}')">
                    Liên hệ hotline
                </button>
                <button class="btn-track-order text-danger border-danger" onclick="cancelOrder('${orderId}')">
                    Hủy đơn hàng
                </button>
            `;
        }
    } else if (normalizedStatus === 'completed') {
        footerButtonsHTML = `
            ${detailActionHTML}
            ${reviewActionHTML}
            ${reorderActionHTML}
            ${returnActionHTML}
        `;
    } else if (normalizedStatus === 'delivered' || normalizedStatus === 'cancelled') {
        footerButtonsHTML = normalizedStatus === 'delivered'
            ? `
                ${detailActionHTML}
                <button class="btn-track-order" onclick="confirmOrderReceipt('${orderId}')">
                    Xác nhận đơn hàng
                </button>
            `
            : detailActionHTML;
    }

    const allMetaChips = [...metaParts.map((item) => `<span class="order-meta-chip">${item}</span>`), ...statusNoticeChips].join('');

    return `
        <article class="order-card" data-order-id="${orderId}">
            <div class="order-card-header">
                <div class="order-info">
                    <span class="order-id">Mã: ${orderId}</span>
                    <span class="order-date">${formatDate(order.createdAt)}</span>
                </div>
                <span class="status-badge ${displayStatusClass}">
                    ${displayStatusLabel}
                </span>
            </div>
            <div class="order-card-body" onclick="window.location.href='/pages/user/order-detail/order-detail.html?id=${orderId}'" title="Nhấn để xem chi tiết đơn hàng">
                <div class="product-preview">
                    <img src="${firstProduct.image}" alt="${firstProduct.name}" class="product-thumb" loading="lazy">
                    <div class="product-info">
                        <h4 class="product-name">${firstProduct.name}</h4>
                        ${remainingCount > 0 ? `<p class="product-meta">và ${remainingCount} sản phẩm khác</p>` : ''}
                        ${allMetaChips ? `<div class="order-meta-chips">${allMetaChips}</div>` : ''}
                    </div>
                </div>
                <div class="order-summary">
                    <span class="summary-label">Tổng tiền:</span>
                    <span class="summary-value">${formatCurrency(toNumber(order.pricing?.total))}</span>
                </div>
            </div>
            <div class="order-card-footer">
                ${footerButtonsHTML}
            </div>
        </article>
    `;
}

function showEmptyState(message) {
    const container = document.getElementById('orders-list');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">*</div>
            <p class="empty-state-text">${message}</p>
        </div>
    `;
    document.getElementById('pagination').classList.add('d-none');
}

function renderPagination() {
    const totalPages = Math.ceil(ordersState.filteredOrders.length / ordersState.ordersPerPage);

    if (totalPages <= 1) {
        document.getElementById('pagination').classList.add('d-none');
        return;
    }

    document.getElementById('pagination').classList.remove('d-none');

    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageNumbers = document.getElementById('page-numbers');

    prevBtn.disabled = ordersState.currentPage === 1;
    nextBtn.disabled = ordersState.currentPage === totalPages;

    let pagesHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= ordersState.currentPage - 1 && i <= ordersState.currentPage + 1)) {
            pagesHTML += `<button class="page-btn ${i === ordersState.currentPage ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
        } else if (i === ordersState.currentPage - 2 || i === ordersState.currentPage + 2) {
            pagesHTML += '<span>...</span>';
        }
    }

    pageNumbers.innerHTML = pagesHTML;
}

function goToPage(page) {
    ordersState.currentPage = page;
    renderOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.goToPage = goToPage;

function contactHotline(orderId) {
    showOrdersToast(`Tổng đài hỗ trợ đơn hàng ${orderId}: 1900 1234`, 'info');
}

window.contactHotline = contactHotline;

function cancelOrder(orderId) {
    const order = ordersState.allOrders.find((item) => item.id === orderId);
    if (!order) {
        showOrdersToast('Không tìm thấy đơn hàng để hủy.', 'error');
        return;
    }

    const modalId = 'orders-cancel-modal';
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
                    <p>Bạn có chắc chắn muốn hủy đơn hàng <strong>${orderId}</strong>?</p>
                    <p class="text-muted small">Đơn hàng sau khi hủy sẽ không thể khôi phục.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Quay lại</button>
                    <button type="button" class="btn-danger-outline" id="orders-cancel-confirm">Xác nhận hủy</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    document.getElementById('orders-cancel-confirm').addEventListener('click', () => {
        modal.hide();

        if (Array.isArray(order.products)) {
            try {
                const storedProducts = JSON.parse(localStorage.getItem('pawpal_products') || '[]');
                if (storedProducts.length) {
                    order.products.forEach((item) => {
                        const idx = storedProducts.findIndex((product) => String(product.id) === String(item.id));
                        if (idx !== -1) {
                            storedProducts[idx].stock = (Number(storedProducts[idx].stock) || 0) + (Number(item.quantity) || 0);
                            storedProducts[idx].inStock = true;
                        }
                    });
                    localStorage.setItem('pawpal_products', JSON.stringify(storedProducts));
                }
            } catch (error) {
                console.warn('cancelOrder stock restore error:', error);
            }
        }

        if (order.paymentMethod && order.paymentMethod !== 'cod' && order.paymentStatus === 'paid') {
            const refunds = JSON.parse(localStorage.getItem('pawpal_refunds') || '[]');
            refunds.push({
                orderId: order.id,
                amount: order.pricing?.total || 0,
                paymentMethod: order.paymentMethod,
                status: 'pending_refund',
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('pawpal_refunds', JSON.stringify(refunds));
        }

        order.status = 'cancelled';
        order.updatedAt = new Date().toISOString();
        saveOrderToLocalStorage(order);

        updateTabCounts();
        applyFilters();

        showOrdersToast(`Đơn hàng ${orderId} đã được hủy thành công.`, 'success');
    });
}

window.cancelOrder = cancelOrder;

function confirmOrderReceipt(orderId) {
    const order = ordersState.allOrders.find((item) => String(item.id) === String(orderId));
    if (!order) {
        showOrdersToast(`KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n hÃ ng ${orderId} Ä‘á»ƒ xÃ¡c nháº­n.`, 'error');
        return;
    }

    const updatedOrder = {
        ...order,
        status: 'completed',
        orderStatus: 'COMPLETED',
        updatedAt: new Date().toISOString(),
    };

    saveOrderToLocalStorage(updatedOrder);
    if (window.API && typeof window.API.updateOrderStatus === 'function') {
        window.API.updateOrderStatus(updatedOrder.id, 'COMPLETED').catch((err) => {
            console.warn('[Orders] Failed to sync completed status:', err);
        });
    }
    ordersState.allOrders = ordersState.allOrders.map((item) =>
        String(item.id) === String(orderId) ? updatedOrder : item
    );
    applyFilters();
    updateStats();
    updateTabCounts();

    showOrdersToast(`ÄÃ£ xÃ¡c nháº­n Ä‘Æ¡n hÃ ng ${orderId} thÃ nh cÃ´ng.`, 'success');
}

window.confirmOrderReceipt = confirmOrderReceipt;

function reorder(orderId) {
    const order = ordersState.allOrders.find((item) => String(item.id) === String(orderId));
    if (!order || !Array.isArray(order.products) || order.products.length === 0) {
        showOrdersToast(`Không tìm thấy sản phẩm để mua lại cho đơn hàng ${orderId}.`, 'error');
        return;
    }

    const cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
    order.products.forEach((product) => {
        const productId = product?.id == null ? '' : String(product.id);
        if (!productId) return;

        const quantity = Number(product.quantity || 1);
        const existing = cart.find((item) => String(item.id) === productId);
        if (existing) {
            existing.quantity = (Number(existing.quantity) || 1) + quantity;
            existing.qty = existing.quantity;
        } else {
            cart.push({
                id: product.id,
                name: product.name,
                brand: product.brand || '',
                price: Number(product.price || 0),
                quantity,
                image: product.image || '',
                stock: Number(product.stock || 99),
                category: product.category || null
            });
        }
    });

    if (window.saveCart) window.saveCart(cart); else if (window.saveCart) window.saveCart(cart); else localStorage.setItem('pawpal_cart', JSON.stringify(cart));

    const badge = document.querySelector('.cart-count, .cart-badge');
    if (badge) {
        badge.textContent = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
    }

    showOrdersToast(`Đã thêm các sản phẩm của đơn hàng ${orderId} vào giỏ hàng.`, 'success');
}

function hasReviewedOrder(order) {
    const reviewedList = JSON.parse(localStorage.getItem('pawpal_reviewed') || '[]');
    return reviewedList.some((item) => String(item.orderId) === String(order.id));
}

window.reorder = reorder;

function openQuickReviewModal(orderId) {
    const order = ordersState.allOrders.find((item) => String(item.id) === String(orderId));
    if (!order || !Array.isArray(order.products) || order.products.length === 0) {
        showOrdersToast('Không tìm thấy đơn hàng để đánh giá.', 'error');
        return;
    }

    const existing = document.getElementById('quickReviewModal');
    if (existing) existing.remove();

    const savedReviews = JSON.parse(localStorage.getItem('pawpal_reviews') || '[]');
    const savedByProduct = new Map(
        savedReviews
            .filter((item) => String(item.orderId) === String(order.id))
            .map((item) => [String(item.productId), item])
    );

    const productBlocks = order.products.map((product) => {
        const saved = savedByProduct.get(String(product.id)) || {};
        const rating = Number(saved.rating) || 5;
        const comment = saved.comment || '';
        const stars = [1, 2, 3, 4, 5].map((value) => `
            <button type="button" class="quick-review-star ${value <= rating ? 'active' : ''}" data-product-id="${product.id}" data-rating="${value}" aria-label="${value} sao">★</button>
        `).join('');

        return `
            <div class="quick-review-item" data-product-id="${product.id}">
                <div class="quick-review-product">
                    <img src="${product.image || '/assets/images/shop/products/placeholder.webp'}" alt="${product.name}" class="quick-review-thumb" loading="lazy">
                    <div>
                        <div class="quick-review-name">${product.name}</div>
                        <div class="quick-review-sub">Đánh giá sản phẩm này</div>
                    </div>
                </div>
                <div class="quick-review-stars">${stars}</div>
                <textarea class="quick-review-comment" rows="3" placeholder="Nhận xét về sản phẩm này...">${comment}</textarea>
            </div>
        `;
    }).join('');

    const el = document.createElement('div');
    el.id = 'quickReviewModal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Đánh giá đơn hàng ${order.id}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small mb-3">Chọn số sao và ghi nhận xét cho từng sản phẩm trong đơn. Bạn có thể bấm nút đánh giá ngay ở đây.</p>
                    <div class="quick-review-list">${productBlocks}</div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Để sau</button>
                    <button type="button" class="btn-cta" id="quickReviewSaveBtn">Lưu đánh giá</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    el.querySelectorAll('.quick-review-star').forEach((starBtn) => {
        starBtn.addEventListener('click', () => {
            const productId = String(starBtn.dataset.productId);
            const rating = Number(starBtn.dataset.rating);
            const item = el.querySelector(`.quick-review-item[data-product-id="${productId}"]`);
            if (!item) return;
            item.querySelectorAll('.quick-review-star').forEach((btn) => {
                btn.classList.toggle('active', Number(btn.dataset.rating) <= rating);
            });
        });
    });

    el.querySelector('#quickReviewSaveBtn').addEventListener('click', () => {
        const allReviews = JSON.parse(localStorage.getItem('pawpal_reviews') || '[]');
        const filtered = allReviews.filter((item) => String(item.orderId) !== String(order.id));
        const reviewedFlags = JSON.parse(localStorage.getItem('pawpal_reviewed') || '[]')
            .filter((item) => String(item.orderId) !== String(order.id));

        let hasAtLeastOneReview = false;
        el.querySelectorAll('.quick-review-item').forEach((itemEl) => {
            const productId = itemEl.dataset.productId;
            const activeStars = Array.from(itemEl.querySelectorAll('.quick-review-star.active'));
            const rating = activeStars.length ? Math.max(...activeStars.map((btn) => Number(btn.dataset.rating) || 0)) : 5;
            const comment = itemEl.querySelector('.quick-review-comment')?.value?.trim() || '';

            filtered.push({
                orderId: order.id,
                productId,
                productName: order.products.find((p) => String(p.id) === String(productId))?.name || '',
                rating,
                comment,
                createdAt: new Date().toISOString()
            });
            reviewedFlags.push({ orderId: order.id, productId, hasMedia: false });
            hasAtLeastOneReview = true;
        });

        localStorage.setItem('pawpal_reviews', JSON.stringify(filtered));
        localStorage.setItem('pawpal_reviewed', JSON.stringify(reviewedFlags));
        modal.hide();
        if (hasAtLeastOneReview) {
            showOrdersToast('Đã lưu đánh giá thành công.', 'success');
            applyFilters();
        }
    });
}

window.openQuickReviewModal = openQuickReviewModal;

function showOrdersToast(message, type = 'info') {
    let container = document.getElementById('orders-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'orders-toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }

    const colors = { success: '#2a5944', error: '#dc3545', info: '#0d6efd', warning: '#ffc107' };
    const toast = document.createElement('div');
    toast.style.cssText = `background:${colors[type] || colors.info};color:${type === 'warning' ? '#000' : '#fff'};padding:12px 18px;border-radius:8px;font-size:0.88rem;box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:320px;`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity .3s';
    }, 3000);
    setTimeout(() => toast.remove(), 3400);
}

function formatCurrency(amount) {
    const value = Number(amount);
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(Number.isFinite(value) ? value : 0);
}

function toNumber(value, fallback = 0) {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
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

function saveOrderToLocalStorage(order) {
    const allOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
    const index = allOrders.findIndex((item) => item.id === order.id);
    if (index !== -1) {
        allOrders[index] = order;
    } else {
        allOrders.push(order);
    }
    localStorage.setItem('pawpal_orders', JSON.stringify(allOrders));
}

function getStatusLabel(status) {
    const labels = {
        placed:          'Chờ xử lý',
        pending:         'Chờ thanh toán',
        pending_payment: 'Chờ thanh toán',
        confirmed:       'Đang chuẩn bị',
        preparing:       'Đang chuẩn bị',
        shipping:        'Đang giao',
        delivered:       'Đã giao hàng',
        completed:       'Hoàn thành',
        cancelled:       'Đã hủy',
        return_pending:  'Chờ duyệt đổi trả',
        return_approved: 'Đổi trả được duyệt',
        refunded:        'Đã hoàn tiền'
    };
    return labels[status] || status;
}

function normalizeOrderStatus(status) {
    if (status === 'pending') return 'pending_payment';
    if (status === 'confirmed') return 'preparing';
    // return_pending là trạng thái riêng — KHÔNG map về pending_payment
    return status;
}

function getPaymentMethodLabel(method) {
    const labels = {
        cod:           'Thanh toán khi nhận hàng (COD)',
        momo:          'Thanh toán MoMo',
        vnpay:         'VNPay',
        zalopay:       'ZaloPay',
        vietqr:        'VietQR',
        bank_transfer: 'Chuyển khoản ngân hàng',
        card:          'Thẻ ngân hàng',
        cash:          'Tiền mặt tại quầy',
        transfer:      'Chuyển khoản tại quầy'
    };
    return labels[method] || 'Thanh toán online';
}

document.addEventListener('DOMContentLoaded', () => {
    loadOrders();

    document.querySelectorAll('.tab-btn').forEach((button) => {
        button.addEventListener('click', (event) => {
            document.querySelectorAll('.tab-btn').forEach((item) => item.classList.remove('active'));
            event.currentTarget.classList.add('active');
            filterByStatus(event.currentTarget.dataset.status);
        });
    });

    const searchInput = document.getElementById('order-search');
    const searchBtn = document.getElementById('search-btn');

    searchBtn.addEventListener('click', () => {
        searchOrders(searchInput.value);
    });

    searchInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            searchOrders(searchInput.value);
        }
    });

    document.getElementById('prev-page').addEventListener('click', () => {
        if (ordersState.currentPage > 1) goToPage(ordersState.currentPage - 1);
    });

    document.getElementById('next-page').addEventListener('click', () => {
        const totalPages = Math.ceil(ordersState.filteredOrders.length / ordersState.ordersPerPage);
        if (ordersState.currentPage < totalPages) goToPage(ordersState.currentPage + 1);
    });
});
