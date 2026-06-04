const ORDERS_KEY = 'pawpal_orders';

const ORDER_STATUS_GROUPS = {
    all:            () => true,
    pendingPayment: o => o.paymentStatus === 'Chưa thanh toán',
    processing:     o => ['Chờ xác nhận', 'Đang chuẩn bị hàng'].includes(o.orderStatus),
    shipping:       o => o.orderStatus === 'Đang giao',
    completed:      o => o.orderStatus === 'Hoàn thành',
    cancelled:      o => ['Đã hủy', 'Hoàn trả'].includes(o.orderStatus),
};

const STATUS_CONFIG = {
    'Chờ xác nhận':       { cls: 'status-pending' },
    'Đang chuẩn bị hàng': { cls: 'status-warning' },
    'Đang giao':          { cls: 'status-info'    },
    'Hoàn thành':         { cls: 'status-success' },
    'Đã hủy':             { cls: 'status-danger'  },
    'Hoàn trả':           { cls: 'status-danger'  },
    'Cần kiểm tra':       { cls: 'status-default' },
};

// States where cancel is NOT allowed
const NO_CANCEL_STATES = ['Đang giao', 'Hoàn thành', 'Đã hủy', 'Hoàn trả'];

let currentOrderFilter = 'all';
let currentDetailCode  = null;

// ── Data helpers ──────────────────────────────────────────────────────────────
function loadOrders() {
    try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); }
    catch { return []; }
}

function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function sortOrders(orders) {
    return [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// ── Formatting helpers ────────────────────────────────────────────────────────
function formatPrice(value) {
    return Number(value).toLocaleString('vi-VN') + 'đ';
}

function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' · ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function getStatusBadge(status) {
    const cfg = STATUS_CONFIG[status] || { cls: 'status-default' };
    return `<span class="status-badge ${cfg.cls}">${status || 'Chưa rõ'}</span>`;
}

// ── Order list ────────────────────────────────────────────────────────────────
function renderOrders() {
    const orders = sortOrders(loadOrders()).filter(ORDER_STATUS_GROUPS[currentOrderFilter]);
    const list   = document.getElementById('ordersList');
    const count  = document.getElementById('ordersCount');
    const empty  = document.getElementById('ordersEmpty');

    count.textContent = orders.length;

    if (!orders.length) {
        list.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';
    list.innerHTML = orders.map(buildOrderCard).join('');
    bindOrderCardButtons();
}

function buildOrderCard(order) {
    const first       = order.cart[0] || {};
    const thumb       = first.img || '';
    const totalQty    = order.cart.reduce((s, i) => s + i.qty, 0);
    const imgFallback = 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=90&h=90&fit=crop';
    const payBadge    = order.paymentStatus === 'Đã thanh toán'
        ? '<span class="status-badge status-success" style="font-size:0.78rem;padding:5px 10px;">Đã thanh toán</span>'
        : '<span class="status-badge status-pending" style="font-size:0.78rem;padding:5px 10px;">Chưa thanh toán</span>';

    return `
        <article class="order-card" data-order="${order.code}">
            <div class="order-card-top">
                <div class="order-card-left">
                    <div class="order-card-code">${order.code}</div>
                    <div class="order-card-meta">${formatDate(order.createdAt)}</div>
                </div>
                ${getStatusBadge(order.orderStatus)}
            </div>
            <div class="order-card-body">
                <div class="order-card-product">
                    <img src="${thumb}" alt="${first.name || 'Sản phẩm'}"
                         onerror="this.src='${imgFallback}'">
                    <div>
                        <div class="order-card-title">${first.name || 'Sản phẩm PawPal'}</div>
                        <div class="order-card-subtitle">${totalQty} sản phẩm · ${order.cart.length} loại</div>
                    </div>
                </div>
                <div class="order-card-summary">
                    <div><span>Tổng đơn</span><strong>${formatPrice(order.total)}</strong></div>
                    <div><span>Thanh toán</span>${payBadge}</div>
                </div>
            </div>
            <div class="order-card-actions">
                <button type="button" class="btn-cta order-detail-btn" data-order="${order.code}">
                    Xem chi tiết đơn hàng
                </button>
            </div>
        </article>`;
}

function bindOrderCardButtons() {
    document.querySelectorAll('.order-detail-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            openOrderDetailModal(btn.dataset.order);
        });
    });
}

function renderFilterBar() {
    document.querySelectorAll('.orders-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.orders-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentOrderFilter = btn.dataset.filter;
            renderOrders();
        });
    });
}

// ── Order detail modal ────────────────────────────────────────────────────────
function openOrderDetailModal(orderCode) {
    const orders = loadOrders();
    const order  = orders.find(o => o.code === orderCode);

    if (!order) {
        showToast('Không thể tải dữ liệu đơn hàng, vui lòng thử lại sau.', 'danger');
        return;
    }

    currentDetailCode = orderCode;

    // Header
    document.getElementById('detailOrderCode').textContent = order.code;

    // Status badges
    document.getElementById('detailOrderStatus').innerHTML   = getStatusBadge(order.orderStatus || 'Chờ xác nhận');
    document.getElementById('detailPaymentStatus').innerHTML = `<span class="status-badge ${
        order.paymentStatus === 'Đã thanh toán' ? 'status-success' : 'status-warning'
    }">${order.paymentStatus || 'Chưa thanh toán'}</span>`;

    document.getElementById('detailCreatedAt').textContent = formatDate(order.createdAt);
    document.getElementById('detailTotal').textContent     = formatPrice(order.total);

    // Shipping info
    document.getElementById('detailName').textContent    = order.form?.name    || '-';
    document.getElementById('detailPhone').textContent   = order.form?.phone   || '-';
    document.getElementById('detailAddress').textContent = [
        order.form?.address, order.form?.ward, order.form?.district, order.form?.province
    ].filter(Boolean).join(', ') || '-';
    document.getElementById('detailNote').textContent    = order.form?.note    || 'Không có';

    // Payment info
    const methodLabel = order.method === 'COD'
        ? 'Thanh toán khi nhận hàng (COD)'
        : `Thanh toán trực tuyến${order.onlineMethod ? ' (' + order.onlineMethod + ')' : ''}`;
    document.getElementById('detailPaymentMethod').textContent = methodLabel;
    document.getElementById('detailCoupon').textContent   = order.coupon?.code  || 'Không sử dụng';
    document.getElementById('detailSubtotal').textContent = formatPrice(order.subtotal  || 0);
    document.getElementById('detailShipping').textContent = (order.shippingCost === 0) ? 'Miễn phí 🎉' : formatPrice(order.shippingCost || 0);
    document.getElementById('detailDiscount').textContent = order.discount > 0 ? `-${formatPrice(order.discount)}` : '0đ';

    // Product list
    const productsFallback = 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=80&h=80&fit=crop';
    document.getElementById('detailProductList').innerHTML = (order.cart || []).map(item => `
        <div class="detail-product-item">
            <img src="${item.img || ''}" alt="${item.name}"
                 onerror="this.src='${productsFallback}'">
            <div class="detail-product-info">
                <strong>${item.name}</strong>
                <span>x${item.qty} · ${formatPrice(item.price)} / sản phẩm</span>
                ${item.brand ? `<span class="detail-product-brand">${item.brand}</span>` : ''}
            </div>
            <div class="detail-product-price">${formatPrice(item.price * item.qty)}</div>
        </div>`).join('');

    // Timeline — fallback for orders saved before statusHistory was added
    const history = (order.statusHistory && order.statusHistory.length > 0)
        ? order.statusHistory
        : [{ status: order.orderStatus || 'Chờ xác nhận', timestamp: order.createdAt, note: 'Đơn hàng đã được đặt thành công.' }];

    document.getElementById('detailTimeline').innerHTML = history.map((ev, idx) => {
        const isLast   = idx === history.length - 1;
        const dotClass = isLast ? 'timeline-dot timeline-dot-active' : 'timeline-dot';
        return `
            <div class="timeline-item">
                <div class="timeline-dot-col">
                    <div class="${dotClass}"></div>
                    ${!isLast ? '<div class="timeline-line"></div>' : ''}
                </div>
                <div class="timeline-content">
                    <span class="timeline-time">${formatDate(ev.timestamp)}</span>
                    <p class="timeline-status"><strong>${ev.status}</strong></p>
                    <p class="timeline-note">${ev.note || 'Trạng thái đơn hàng được cập nhật.'}</p>
                </div>
            </div>`;
    }).join('');

    // Footer buttons
    bindModalFooterButtons(order);

    showModal();
}

function bindModalFooterButtons(order) {
    const status = order.orderStatus || 'Chờ xác nhận';

    // Cancel: only visible for cancellable statuses
    const cancelBtn = document.getElementById('cancelOrderBtn');
    if (cancelBtn) {
        const canCancel = !NO_CANCEL_STATES.includes(status);
        cancelBtn.style.display = canCancel ? 'inline-flex' : 'none';
        cancelBtn.onclick = () => cancelOrder(order.code);
    }

    // Rebuy
    const rebuyBtn = document.getElementById('rebuyOrderBtn');
    if (rebuyBtn) rebuyBtn.onclick = () => rebuyOrder(order);

    // Review: only active when completed
    const reviewBtn = document.getElementById('reviewOrderBtn');
    if (reviewBtn) {
        const done = status === 'Hoàn thành';
        reviewBtn.disabled = !done;
        reviewBtn.style.opacity = done ? '1' : '0.45';
        reviewBtn.title = done ? '' : 'Chỉ có thể đánh giá sau khi đơn hoàn thành';
        reviewBtn.onclick = done ? () => showToast('Tính năng đánh giá sản phẩm đang được phát triển 🐾') : null;
    }

    // Return/exchange: active after delivered or in transit
    const returnBtn = document.getElementById('returnOrderBtn');
    if (returnBtn) {
        const canReturn = ['Hoàn thành', 'Đang giao'].includes(status);
        returnBtn.disabled = !canReturn;
        returnBtn.style.opacity = canReturn ? '1' : '0.45';
        returnBtn.title = canReturn ? '' : 'Chỉ có thể yêu cầu khi đơn đã được giao';
        returnBtn.onclick = canReturn ? () => showToast('Tính năng yêu cầu đổi/trả đang được phát triển 🐾') : null;
    }
}

// ── Cancel order ──────────────────────────────────────────────────────────────
function cancelOrder(orderCode) {
    const orders = loadOrders();
    const idx    = orders.findIndex(o => o.code === orderCode);
    if (idx === -1) { showToast('Không tìm thấy đơn hàng.', 'danger'); return; }

    const order = orders[idx];
    if (NO_CANCEL_STATES.includes(order.orderStatus)) {
        showToast('Đơn hàng này không thể hủy ở trạng thái hiện tại.', 'danger');
        return;
    }

    if (!confirm(`Bạn có chắc muốn hủy đơn hàng ${orderCode}?\nThao tác này không thể hoàn tác.`)) return;

    const now = new Date().toISOString();
    orders[idx].orderStatus  = 'Đã hủy';
    orders[idx].updatedAt    = now;
    orders[idx].statusHistory = orders[idx].statusHistory || [];
    orders[idx].statusHistory.push({
        status:    'Đã hủy',
        timestamp: now,
        note:      'Khách hàng yêu cầu hủy đơn hàng.'
    });

    saveOrders(orders);
    closeModal();
    renderOrders();
    showToast(`Đã hủy đơn hàng ${orderCode}`, 'info');
}

// ── Re-buy order ──────────────────────────────────────────────────────────────
function rebuyOrder(order) {
    const cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
    (order.cart || []).forEach(item => {
        const existing = cart.find(c => c.sku === item.sku);
        if (existing) {
            const max = existing.maxStock || item.maxStock || 99;
            existing.qty = Math.min(existing.qty + item.qty, max);
        } else {
            cart.push({ ...item });
        }
    });
    localStorage.setItem('pawpal_cart', JSON.stringify(cart));
    showToast(`✅ Đã thêm ${order.cart.length} sản phẩm vào giỏ hàng`);
    setTimeout(() => { window.location.href = 'shop.html'; }, 1200);
}

// ── Modal open / close ────────────────────────────────────────────────────────
function showModal() {
    const modal = document.getElementById('orderDetailModal');
    if (!modal) return;
    modal.style.display = 'flex';
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('orderDetailModal');
    if (!modal) return;
    modal.style.display = 'none';
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentDetailCode = null;
}

function bindDetailModal() {
    document.getElementById('orderDetailClose')?.addEventListener('click', closeModal);
    document.getElementById('orderDetailOverlay')?.addEventListener('click', closeModal);
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3500);
}

// ── Cross-tab storage sync (realtime notification simulation) ─────────────────
function syncOrderNotifications(oldValue, newValue) {
    if (!oldValue || !newValue) return;
    try {
        const prev = JSON.parse(oldValue);
        const curr = JSON.parse(newValue);
        const byCode = Object.fromEntries(prev.map(o => [o.code, o]));
        curr.forEach(o => {
            const before = byCode[o.code];
            if (!before) return;
            if (before.orderStatus !== o.orderStatus)
                showToast(`📦 Đơn hàng ${o.code}: ${o.orderStatus}`, 'info');
            if (before.paymentStatus !== o.paymentStatus)
                showToast(`💳 Thanh toán ${o.code} đã cập nhật`, 'info');
        });
    } catch { /* ignore */ }
}

// ── Init ──────────────────────────────────────────────────────────────────────
function initOrdersPage() {
    renderFilterBar();
    bindDetailModal();
    document.getElementById('ordersRefreshBtn')?.addEventListener('click', renderOrders);
    renderOrders();

    // Cross-tab real-time sync
    window.addEventListener('storage', event => {
        if (event.key !== ORDERS_KEY) return;
        syncOrderNotifications(event.oldValue, event.newValue);
        renderOrders();
        // Re-render open modal if the order being viewed changed
        if (currentDetailCode) openOrderDetailModal(currentDetailCode);
    });

    // Deep-link: ?order=PP-XXXXXX → open the modal directly
    const code = new URLSearchParams(window.location.search).get('order');
    if (code) openOrderDetailModal(code);
}

window.addEventListener('DOMContentLoaded', initOrdersPage);
