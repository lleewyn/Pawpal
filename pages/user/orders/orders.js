
import { API } from '/scripts/api/api.js';

const ordersState = {
    allOrders: [],
    filteredOrders: [],
    currentTab: 'all',
    currentPage: 1,
    ordersPerPage: 10,
    searchQuery: '',
    returns: [],
    reviews: []
};

async function loadOrders() {
    try {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        
        if (!currentUser) {
            showEmptyState('Vui lòng đăng nhập để xem đơn hàng.');
            return;
        }

        if (!window.SupabaseClient) {
            await new Promise(r => setTimeout(r, 300));
        }

        let remoteOrders = [];
        try {
            if (currentUser && currentUser.id) {
                const res = await API.getUserOrders(currentUser.id);
                if (Array.isArray(res)) remoteOrders = res;
            }
        } catch (e) {
            console.warn('[Orders] API.getUserOrders error:', e);
        }

        // 1. Lấy đơn hàng từ localStorage (được tạo qua checkout hoặc thanh toán)
        const localOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
        
        // 2. Lọc đơn thuộc về user hiện tại
        const userPhone = String(currentUser?.phone || '').trim();
        const userId = String(currentUser?.id || '').trim();
        
        let matchingLocalOrders = localOrders.filter(o => {
            const oUserId = String(o.userId || '');
            const oPhone = String(o.userPhone || o.shipping?.phone || o.delivery?.phone || '');
            if (userId && (oUserId === userId || oUserId === 'USER-001')) return true;
            if (userPhone && oPhone === userPhone) return true;
            if (!userId && !userPhone) return true;
            return false;
        });

        // 3. Nếu cả local lẫn remote đều trống, nạp mẫu từ /data/orders.json cho demo
        if (matchingLocalOrders.length === 0 && remoteOrders.length === 0) {
            try {
                const res = await fetch('/data/orders.json');
                const sampleOrders = await res.json();
                if (Array.isArray(sampleOrders)) {
                    matchingLocalOrders = sampleOrders;
                }
            } catch (err) {
                console.warn('[Orders] Không thể nạp sample orders:', err);
            }
        }

        // 4. Hợp nhất danh sách đơn hàng
        const orderMap = new Map();
        matchingLocalOrders.forEach(order => {
            const key = String(order.id || order.orderId || order._supabaseId || '');
            if (key) orderMap.set(key, order);
        });

        remoteOrders.forEach(order => {
            const key = String(order.id || order.order_code || order._supabaseId || '');
            if (key) {
                const existing = orderMap.get(key);
                orderMap.set(key, { ...order, ...(existing || {}) });
            }
        });

        // 5. Chuẩn hóa từng đơn hàng
        const mergedList = Array.from(orderMap.values()).map(order => {
            const products = Array.isArray(order.products) && order.products.length > 0
                ? order.products
                : (Array.isArray(order.items) && order.items.length > 0 ? order.items : []);
            
            const normalizedProducts = products.map(p => ({
                id: p.id || p.productId || '',
                name: p.name || p.title || 'Sản phẩm',
                image: p.image || p.img || '/assets/images/shared/product_placeholder.png',
                quantity: Number(p.quantity ?? p.qty) || 1,
                price: Number(p.price ?? p.unitPrice) || 0,
                total: Number(p.total) || ((Number(p.price) || 0) * (Number(p.quantity) || 1))
            }));

            const grandTotal = Number(
                order.pricing?.grandTotal ?? order.pricing?.total ?? order.total ?? 0
            );

            return {
                ...order,
                id: order.id || order.orderId || `ORD-${Date.now()}`,
                products: normalizedProducts,
                pricing: {
                    ...(order.pricing || {}),
                    total: grandTotal,
                    grandTotal: grandTotal
                },
                paymentMethod: (order.paymentMethod || order.payment?.method || 'cod').toLowerCase(),
                paymentStatus: String(order.paymentStatus || order.payment?.status || (order.paymentMethod === 'cod' ? 'pending_payment' : 'pending')).toLowerCase(),
                status: order.status || 'pending',
                createdAt: order.createdAt || new Date().toISOString()
            };
        });

        ordersState.allOrders = mergedList;
        ordersState.filteredOrders = ordersState.allOrders;

        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (db) {
            try {
                const [returnsRes, reviewsRes] = await Promise.all([
                    db.from('return_request').select('sales_order_id').eq('customer_id', currentUser.id),
                    db.from('review').select('sales_order_id').eq('customer_id', currentUser.id)
                ]);
                if (returnsRes.data) ordersState.returns = returnsRes.data.map(r => r.sales_order_id);
                if (reviewsRes.data) ordersState.reviews = reviewsRes.data.map(r => r.sales_order_id);
            } catch(e) {
                console.error('Error fetching returns/reviews', e);
            }
        }

        checkAndExpirePendingOrders();
        updateStats();
        updateTabCounts();
        applyFilters();
        startPendingOrdersTicker();
    } catch (error) {
        console.error('Lỗi load đơn hàng:', error);
        showEmptyState('Không thể tải đơn hàng. Vui lòng thử lại sau.');
    }
}

function checkAndExpirePendingOrders() {
    let hasChanges = false;
    const now = Date.now();

    ordersState.allOrders.forEach((order) => {
        const isOnline = ['vnpay', 'momo', 'zalopay', 'vietqr'].includes((order.paymentMethod || order.payment?.method || '').toLowerCase());
        const isPaid = order.paymentStatus === 'paid' || order.payment?.status === 'paid';
        const isPending = order.status === 'pending_payment' || order.status === 'pending' || order.status === 'placed';

        if (isPending && !isPaid && isOnline && order.paymentExpiry) {
            const expiryTime = new Date(order.paymentExpiry).getTime();
            if (now >= expiryTime) {
                order.status = 'cancelled';
                order.paymentStatus = 'expired';
                order.cancelReason = 'Quá thời hạn thanh toán trực tuyến (15 phút)';
                if (!Array.isArray(order.timeline)) order.timeline = [];
                order.timeline.push({
                    status: 'cancelled',
                    title: 'Tự động hủy đơn hàng',
                    description: 'Đơn hàng tự động hủy do quá thời hạn thanh toán 15 phút',
                    timestamp: new Date().toISOString()
                });
                hasChanges = true;
            }
        }
    });

    if (hasChanges) {
        try {
            const allLocalOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
            ordersState.allOrders.forEach((updatedOrder) => {
                const idx = allLocalOrders.findIndex(o => String(o.id) === String(updatedOrder.id));
                if (idx !== -1) {
                    allLocalOrders[idx] = { ...allLocalOrders[idx], ...updatedOrder };
                }
            });
            localStorage.setItem('pawpal_orders', JSON.stringify(allLocalOrders));
        } catch (e) {
            console.error('Error saving expired orders to localStorage', e);
        }
    }

    return hasChanges;
}

let pendingOrdersTicker = null;
function startPendingOrdersTicker() {
    if (pendingOrdersTicker) clearInterval(pendingOrdersTicker);
    pendingOrdersTicker = setInterval(() => {
        const timerChips = document.querySelectorAll('.order-pending-countdown');
        if (!timerChips || timerChips.length === 0) return;

        let needsRefresh = false;
        const now = Date.now();

        timerChips.forEach((chip) => {
            const expiryStr = chip.getAttribute('data-expiry');
            if (!expiryStr) return;
            const diff = new Date(expiryStr).getTime() - now;
            const clockEl = chip.querySelector('.countdown-clock');

            if (diff <= 0) {
                if (clockEl) clockEl.textContent = '00:00 (Hết hạn)';
                needsRefresh = true;
            } else {
                const totalSeconds = Math.floor(diff / 1000);
                const minutes = Math.floor(totalSeconds / 60);
                const seconds = totalSeconds % 60;
                if (clockEl) {
                    clockEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
                }
            }
        });

        if (needsRefresh) {
            const hasExpired = checkAndExpirePendingOrders();
            if (hasExpired) {
                updateStats();
                updateTabCounts();
                applyFilters();
            }
        }
    }, 1000);
}

function updateStats() {
    const processingStatuses = ['pending', 'pending_payment', 'preparing', 'shipping', 'delivered'];
    const processingCount = ordersState.allOrders.filter((order) => processingStatuses.includes(order.status)).length;
    const completedCount = ordersState.allOrders.filter((order) => order.status === 'completed').length;
    const totalSpent = ordersState.allOrders
        .filter((order) => order.paymentStatus === 'paid')
        .reduce((sum, order) => {
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
            const matchId = String(order.id || '').toLowerCase().includes(ordersState.searchQuery);
            const prods = Array.isArray(order.products) ? order.products : [];
            const matchProducts = prods.some((product) => String(product.name || '').toLowerCase().includes(ordersState.searchQuery));
            return matchId || matchProducts;
        });
    }

    filtered.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0);
        const dateB = new Date(b.createdAt || 0);
        return dateB - dateA;
    });

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
    const prods = Array.isArray(order.products) ? order.products : (Array.isArray(order.items) ? order.items : []);
    const firstProduct = prods.length > 0
        ? prods[0]
        : { name: 'Sản phẩm PawPal', image: '/assets/images/shared/product_placeholder.png', sku: '', quantity: 1, price: 0, total: 0 };
    const remainingCount = Math.max(0, prods.length - 1);
    const normalizedStatus = normalizeOrderStatus(order.status);

    const isPaid = order.paymentStatus === 'paid' || order.payment?.status === 'paid';
    const ONLINE_METHODS = ['vnpay', 'momo', 'zalopay', 'vietqr'];
    const payMethod = (order.paymentMethod || order.payment?.method || '').toLowerCase();
    const isOnline  = ONLINE_METHODS.includes(payMethod);

    const isPendingConfirm = (normalizedStatus === 'placed' || normalizedStatus === 'pending_payment') && isPaid && isOnline;
    const displayStatusLabel = isPendingConfirm ? 'Chờ xác nhận' : getStatusLabel(normalizedStatus);
    const displayStatusClass = isPendingConfirm ? 'status-preparing' : `status-${normalizedStatus}`;

    const isCompleted = normalizedStatus === 'completed';
    const productCount = Array.isArray(order.products)
        ? order.products.reduce((sum, product) => sum + (Number(product.quantity) || 1), 0)
        : 0;
    const paymentLabel = getPaymentMethodLabel(order.paymentMethod);
    const orderAlreadyReviewed = isCompleted && ordersState.reviews.includes(String(orderId));

    const reviewActionHTML = isCompleted
        ? orderAlreadyReviewed
            ? `<a class="btn-review" href="/pages/user/order-detail/order-detail.html?id=${orderId}#reviews" aria-label="Xem đánh giá đơn hàng ${orderId}">Xem đánh giá</a>`
            : `<a class="btn-review" href="/pages/user/order-detail/order-detail.html?id=${orderId}#reviews" aria-label="Đánh giá đơn hàng ${orderId}">Đánh giá</a>`
        : '';

    const alreadyReturned = ordersState.returns.includes(String(orderId));

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

    if ((normalizedStatus === 'placed' || normalizedStatus === 'pending_payment') && !isPaid && isOnline && order.paymentExpiry) {
        statusNoticeChips.push(`
            <span class="order-meta-chip meta-chip-warning order-pending-countdown" data-expiry="${order.paymentExpiry}" data-order-id="${orderId}">
                ⏳ Còn <strong class="countdown-clock">--:--</strong>
            </span>
        `);
    }

    const metaParts = [
        productCount > 0 ? `${productCount} sản phẩm` : '',
        paymentLabel,
        normalizedStatus === 'shipping' ? 'Đang giao tới bạn' : '',
        normalizedStatus === 'completed' ? 'Đơn đã hoàn tất' : '',
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
        const canPayNow = (normalizedStatus === 'placed' || normalizedStatus === 'pending_payment') && !isPaid && isOnline;
        footerButtonsHTML = `
            ${canPayNow ? `<button class="btn-cta text-decoration-none" onclick="openOrderPaymentModal('${orderId}')">Thanh toán ngay</button>` : ''}
            ${canPayNow ? `<button class="btn-track-order" onclick="openChangePaymentMethodModal('${orderId}')">Đổi phương thức</button>` : ''}
            ${detailActionHTML}
            <button class="btn-track-order" onclick="contactHotline('${orderId}')">
                Liên hệ hotline
            </button>
            <button class="btn-track-order text-danger border-danger" onclick="cancelOrder('${orderId}')">
                Hủy đơn hàng
            </button>
        `;
    } else if (normalizedStatus === 'completed') {
        footerButtonsHTML = `
            ${detailActionHTML}
            ${reviewActionHTML}
            ${reorderActionHTML}
            ${returnActionHTML}
            <a href="/pages/user/support-create/support-create.html?type=order&orderId=${orderId}" class="btn-complaint text-decoration-none" title="Khiếu nại sự cố về đơn hàng này">Phản ánh đơn</a>
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
                    <span class="summary-value">${formatCurrency(toNumber(order.pricing?.total ?? order.pricing?.grandTotal ?? order.total))}</span>
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

    document.getElementById('orders-cancel-confirm').addEventListener('click', async () => {
        modal.hide();

        const db = window.SupabaseClient;

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
        // Hoàn lại điểm PawPoints nếu đơn hàng có sử dụng điểm
        const pointsDiscount = Number(order.pricing?.pointsDiscount || 0);
        if (pointsDiscount > 0) {
            try {
                const pointsToRefund = Math.round(pointsDiscount / 1000);
                const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
                if (currentUser) {
                    currentUser.points = (Number(currentUser.points) || 0) + pointsToRefund;
                    localStorage.setItem('pawpal_current_user', JSON.stringify(currentUser));
                }
                const users = JSON.parse(localStorage.getItem('pawpal_users') || '[]');
                const uIdx = users.findIndex(u => String(u.id) === String(order.userId) || String(u.phone) === String(order.userPhone));
                if (uIdx !== -1) {
                    users[uIdx].points = (Number(users[uIdx].points) || 0) + pointsToRefund;
                    localStorage.setItem('pawpal_users', JSON.stringify(users));
                }
            } catch (err) {
                console.warn('Lỗi hoàn điểm khi hủy đơn:', err);
            }
        }

        const isPaid = order.paymentMethod && order.paymentMethod !== 'cod' && order.paymentStatus === 'paid';
        const newPaymentStatus = isPaid ? 'pending_refund' : 'cancelled';

        if (db) {
            try {
                const { error: cancelErr } = await db.from('sales_order').update({
                    order_status: 'CANCELLED',
                    payment_status: isPaid ? 'PENDING_REFUND' : 'CANCELLED',
                    updated_at: new Date().toISOString()
                }).eq('id', order.id);
                if (cancelErr) console.warn('[Orders] Supabase cancel error:', cancelErr);
            } catch (err) {
                console.warn('[Orders] Supabase cancel exception:', err);
            }
        }

        if (isPaid) {
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
        order.paymentStatus = newPaymentStatus;
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
        showOrdersToast(`Không tìm thấy đơn hàng ${orderId} để xác nhận.`, 'error');
        return;
    }

    const nowISO = new Date().toISOString();
    const currentTimeline = Array.isArray(order.timeline) ? order.timeline : [];
    
    const updatedOrder = {
        ...order,
        status: 'completed',
        orderStatus: 'COMPLETED',
        updatedAt: nowISO,
        timeline: [
            ...currentTimeline,
            {
                status: 'completed',
                timestamp: nowISO,
                title: 'Hoàn thành',
                description: 'Khách hàng xác nhận đã nhận hàng'
            }
        ]
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

    showOrdersToast(`Đã xác nhận đơn hàng ${orderId} thành công.`, 'success');
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

async function openOrderPaymentModal(orderId) {
    const order = ordersState.allOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;
    localStorage.setItem('pawpal_current_order', JSON.stringify(order));

    const payMethod = (order.paymentMethod || order.payment?.method || '').toLowerCase();
    if (payMethod === 'vnpay') {
        const grandTotal = order.pricing?.total || order.pricing?.grandTotal || 0;
        try {
            const vnpRes = await fetch('/api/vnpay/create-payment-url', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: order.id,
                    amount: grandTotal,
                    orderInfo: `Thanh toan don hang ${order.id} tai PawPal`
                })
            });
            const vnpData = await vnpRes.json();
            if (vnpData.success && vnpData.paymentUrl) {
                window.location.href = vnpData.paymentUrl;
                return;
            }
        } catch (err) {
            console.warn('[Orders] Lỗi tạo link VNPAY thật, fallback sang mô phỏng:', err);
        }
        window.location.href = `/pages/shop/vnpay-sandbox/vnpay-sandbox.html?orderId=${orderId}&amount=${grandTotal}`;
        return;
    }

    window.location.href = `/pages/user/order-detail/order-detail.html?id=${orderId}&pay=now`;
}
window.openOrderPaymentModal = openOrderPaymentModal;

function openChangePaymentMethodModal(orderId) {
    const order = ordersState.allOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;

    const modalId = 'orders-change-payment-modal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const currentMethod = (order.paymentMethod || order.payment?.method || 'vnpay').toLowerCase();

    const el = document.createElement('div');
    el.id = modalId;
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered" style="max-width: 480px;">
            <div class="modal-content" style="border-radius: 9px; border: 1px solid #ECF2EE;">
                <div class="modal-header" style="border-bottom: 1px solid #ECF2EE; padding: 18px 24px;">
                    <h5 class="modal-title" style="color: #236B48; font-weight: 700; font-size: 17px;">Đổi phương thức thanh toán</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body" style="padding: 20px 24px;">
                    <p class="text-muted small mb-3">Đơn hàng <strong>#${order.id}</strong> đang chờ thanh toán. Vui lòng chọn phương thức bạn muốn chuyển đổi:</p>
                    <div class="d-flex flex-column gap-2 mb-3" id="paymentMethodRadioGroup">
                        <label class="d-flex align-items-center gap-3 p-3 rounded cursor-pointer" style="border: 1px solid ${currentMethod === 'cod' ? '#236B48' : '#ECF2EE'}; background: ${currentMethod === 'cod' ? '#F4FAF6' : '#fff'}; border-radius: 9px;">
                            <input type="radio" name="newPayMethod" value="cod" ${currentMethod === 'cod' ? 'checked' : ''} style="accent-color: #236B48;">
                            <div class="flex-grow-1">
                                <div class="fw-bold" style="color: #203A2C; font-size: 14px;">Thanh toán khi nhận hàng (COD)</div>
                                <div class="text-muted small">Trả tiền mặt cho shipper khi nhận hàng (Không lo hết hạn 15 phút)</div>
                            </div>
                        </label>
                        <label class="d-flex align-items-center gap-3 p-3 rounded cursor-pointer" style="border: 1px solid ${currentMethod === 'vnpay' ? '#236B48' : '#ECF2EE'}; background: ${currentMethod === 'vnpay' ? '#F4FAF6' : '#fff'}; border-radius: 9px;">
                            <input type="radio" name="newPayMethod" value="vnpay" ${currentMethod === 'vnpay' ? 'checked' : ''} style="accent-color: #236B48;">
                            <div class="flex-grow-1">
                                <div class="fw-bold" style="color: #203A2C; font-size: 14px;">Cổng thanh toán VNPay</div>
                                <div class="text-muted small">Quét QR VNPAY, Thẻ ATM nội địa, Thẻ Visa/Mastercard</div>
                            </div>
                        </label>
                        <label class="d-flex align-items-center gap-3 p-3 rounded cursor-pointer" style="border: 1px solid ${currentMethod === 'vietqr' ? '#236B48' : '#ECF2EE'}; background: ${currentMethod === 'vietqr' ? '#F4FAF6' : '#fff'}; border-radius: 9px;">
                            <input type="radio" name="newPayMethod" value="vietqr" ${currentMethod === 'vietqr' ? 'checked' : ''} style="accent-color: #236B48;">
                            <div class="flex-grow-1">
                                <div class="fw-bold" style="color: #203A2C; font-size: 14px;">Quét mã VietQR</div>
                                <div class="text-muted small">Mở app ngân hàng quét mã QR chuyển khoản tức thì</div>
                            </div>
                        </label>
                        <label class="d-flex align-items-center gap-3 p-3 rounded cursor-pointer" style="border: 1px solid ${currentMethod === 'momo' ? '#236B48' : '#ECF2EE'}; background: ${currentMethod === 'momo' ? '#F4FAF6' : '#fff'}; border-radius: 9px;">
                            <input type="radio" name="newPayMethod" value="momo" ${currentMethod === 'momo' ? 'checked' : ''} style="accent-color: #236B48;">
                            <div class="flex-grow-1">
                                <div class="fw-bold" style="color: #203A2C; font-size: 14px;">Ví điện tử MoMo</div>
                                <div class="text-muted small">Quét mã bằng ứng dụng ví MoMo</div>
                            </div>
                        </label>
                        <label class="d-flex align-items-center gap-3 p-3 rounded cursor-pointer" style="border: 1px solid ${currentMethod === 'zalopay' ? '#236B48' : '#ECF2EE'}; background: ${currentMethod === 'zalopay' ? '#F4FAF6' : '#fff'}; border-radius: 9px;">
                            <input type="radio" name="newPayMethod" value="zalopay" ${currentMethod === 'zalopay' ? 'checked' : ''} style="accent-color: #236B48;">
                            <div class="flex-grow-1">
                                <div class="fw-bold" style="color: #203A2C; font-size: 14px;">Ví điện tử ZaloPay</div>
                                <div class="text-muted small">Quét mã bằng ứng dụng Zalo / ZaloPay</div>
                            </div>
                        </label>
                    </div>
                </div>
                <div class="modal-footer" style="border-top: 1px solid #ECF2EE; padding: 14px 24px;">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Đóng</button>
                    <button type="button" class="btn-cta" id="btn-confirm-change-payment">Xác nhận đổi</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    const radios = el.querySelectorAll('input[name="newPayMethod"]');
    radios.forEach(r => {
        r.addEventListener('change', () => {
            el.querySelectorAll('#paymentMethodRadioGroup label').forEach(lbl => {
                lbl.style.borderColor = '#ECF2EE';
                lbl.style.backgroundColor = '#fff';
            });
            const parent = r.closest('label');
            if (parent) {
                parent.style.borderColor = '#236B48';
                parent.style.backgroundColor = '#F4FAF6';
            }
        });
    });

    document.getElementById('btn-confirm-change-payment').addEventListener('click', async () => {
        const selectedRadio = el.querySelector('input[name="newPayMethod"]:checked');
        if (!selectedRadio) return;
        const newMethod = selectedRadio.value;
        modal.hide();

        const methodNames = {
            cod: 'Thanh toán khi nhận hàng (COD)',
            vnpay: 'Cổng thanh toán VNPay',
            vietqr: 'Quét mã VietQR',
            momo: 'Ví MoMo',
            zalopay: 'Ví ZaloPay'
        };

        order.paymentMethod = newMethod;
        if (!order.payment) order.payment = {};
        order.payment.method = newMethod;

        if (!Array.isArray(order.timeline)) order.timeline = [];

        if (newMethod === 'cod') {
            order.status = 'pending';
            order.paymentStatus = 'pending_payment';
            order.paymentExpiry = null;
            order.timeline.push({
                status: 'pending',
                title: 'Đổi phương thức thanh toán sang COD',
                description: 'Khách hàng đã đổi sang Thanh toán khi nhận hàng (COD). Đơn hàng đang chờ cửa hàng xác nhận.',
                timestamp: new Date().toISOString()
            });
        } else {
            order.timeline.push({
                status: 'pending_payment',
                title: `Đổi phương thức thanh toán sang ${methodNames[newMethod] || newMethod}`,
                description: `Khách hàng đã đổi phương thức thanh toán sang ${methodNames[newMethod] || newMethod}.`,
                timestamp: new Date().toISOString()
            });
        }

        order.updatedAt = new Date().toISOString();
        saveOrderToLocalStorage(order);

        const db = window.SupabaseClient;
        if (db) {
            try {
                await db.from('sales_order').update({
                    order_status: newMethod === 'cod' ? 'PENDING' : 'PENDING_PAYMENT',
                    updated_at: new Date().toISOString()
                }).eq('id', order.id);
            } catch (err) {
                console.warn('[Orders] Supabase update payment method error:', err);
            }
        }

        updateTabCounts();
        applyFilters();

        showOrdersToast(`Đã đổi phương thức thanh toán sang "${methodNames[newMethod]}" thành công!`, 'success');

        if (newMethod !== 'cod') {
            setTimeout(() => {
                openOrderPaymentModal(order.id);
            }, 600);
        }
    });
}
window.openChangePaymentMethodModal = openChangePaymentMethodModal;

document.addEventListener('DOMContentLoaded', () => {
    // Kiểm tra tab ban đầu từ URL parameter (ví dụ ?status=pending_payment hoặc ?tab=pending_payment)
    const urlParams = new URLSearchParams(window.location.search);
    const initialStatus = urlParams.get('status') || urlParams.get('tab');
    if (initialStatus) {
        ordersState.currentTab = initialStatus;
        const targetTab = document.querySelector(`.tab-btn[data-status="${initialStatus}"]`);
        if (targetTab) {
            document.querySelectorAll('.tab-btn').forEach((item) => item.classList.remove('active'));
            targetTab.classList.add('active');
        }
    }

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
