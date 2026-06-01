const ORDERS_KEY = 'pawpal_orders';

const STATUS_CONFIG = {
    'Chờ xác nhận':       { cls: 'status-pending' },
    'Đang chuẩn bị hàng': { cls: 'status-warning' },
    'Đang giao':          { cls: 'status-info'    },
    'Hoàn thành':         { cls: 'status-success' },
    'Đã hủy':             { cls: 'status-danger'  },
    'Hoàn trả':           { cls: 'status-danger'  },
    'Cần kiểm tra':       { cls: 'status-default' },
};

const NO_CANCEL_STATES = ['Đang giao', 'Hoàn thành', 'Đã hủy', 'Hoàn trả'];

// ── Helpers ───────────────────────────────────────────────────────────────────
function loadOrders() {
    try { return JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]'); }
    catch { return []; }
}

function saveOrders(orders) {
    localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
}

function formatPrice(value) {
    return Number(value).toLocaleString('vi-VN') + 'đ';
}

function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
        + ' · ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatDateLong(value) {
    if (!value) return '-';
    const d = new Date(value);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        + ' - ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getStatusBadgeHTML(status, cls) {
    const c = cls || (STATUS_CONFIG[status] || { cls: 'status-default' }).cls;
    return `<span class="status-badge ${c}">${status || 'Chưa rõ'}</span>`;
}

// ── Render page ───────────────────────────────────────────────────────────────
function renderOrderDetail(order) {
    // Show content
    document.getElementById('odContent').style.display = 'block';

    // Page title
    document.title = `PawPal - Đơn hàng ${order.code}`;

    // Header
    document.getElementById('odCode').textContent    = order.code;
    document.getElementById('odCreatedAt').textContent = formatDate(order.createdAt);
    document.getElementById('odTotal').textContent   = formatPrice(order.total);

    document.getElementById('odOrderStatus').innerHTML = getStatusBadgeHTML(order.orderStatus || 'Chờ xác nhận');
    document.getElementById('odPaymentStatus').innerHTML = getStatusBadgeHTML(
        order.paymentStatus || 'Chưa thanh toán',
        order.paymentStatus === 'Đã thanh toán' ? 'status-success' : 'status-warning'
    );

    // Shipping info
    document.getElementById('odName').textContent    = order.form?.name    || '-';
    document.getElementById('odPhone').textContent   = order.form?.phone   || '-';
    document.getElementById('odAddress').textContent = [
        order.form?.address, order.form?.ward, order.form?.district, order.form?.province
    ].filter(Boolean).join(', ') || '-';
    document.getElementById('odNote').textContent    = order.form?.note    || 'Không có';

    // Payment info
    const methodLabel = order.method === 'COD'
        ? 'Thanh toán khi nhận hàng (COD)'
        : `Thanh toán trực tuyến${order.onlineMethod ? ' (' + order.onlineMethod + ')' : ''}`;
    document.getElementById('odPaymentMethod').textContent = methodLabel;
    document.getElementById('odCoupon').textContent   = order.coupon?.code  || 'Không sử dụng';
    document.getElementById('odSubtotal').textContent = formatPrice(order.subtotal  || 0);
    document.getElementById('odShipping').textContent = (order.shippingCost === 0)
        ? 'Miễn phí 🎉' : formatPrice(order.shippingCost || 0);
    document.getElementById('odDiscount').textContent = order.discount > 0
        ? `-${formatPrice(order.discount)}` : '0đ';
    document.getElementById('odTotalBottom').textContent = formatPrice(order.total);

    // Products
    renderProducts(order.cart || []);

    // Timeline
    const history = (order.statusHistory && order.statusHistory.length > 0)
        ? order.statusHistory
        : [{ status: order.orderStatus || 'Chờ xác nhận', timestamp: order.createdAt, note: 'Đơn hàng đã được đặt thành công.' }];
    renderTimeline(history);

    // Action buttons
    bindActions(order);
}

function renderProducts(cart) {
    const fallback = 'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=80&h=80&fit=crop';
    document.getElementById('odProductList').innerHTML = cart.map(item => `
        <div class="detail-product-item">
            <img src="${item.img || ''}" alt="${item.name}"
                 onerror="this.src='${fallback}'">
            <div class="detail-product-info">
                <strong>${item.name}</strong>
                <span>x${item.qty} · ${formatPrice(item.price)} / sản phẩm</span>
                ${item.brand ? `<span class="detail-product-brand">${item.brand}</span>` : ''}
            </div>
            <div class="detail-product-price">${formatPrice(item.price * item.qty)}</div>
        </div>`).join('') || '<p style="color:#9ca3af;font-size:.9rem;">Không có sản phẩm.</p>';
}

function renderTimeline(history) {
    document.getElementById('odTimeline').innerHTML = history.map((ev, idx) => {
        const isLast   = idx === history.length - 1;
        const dotClass = isLast ? 'timeline-dot timeline-dot-active' : 'timeline-dot';
        return `
            <div class="timeline-item">
                <div class="timeline-dot-col">
                    <div class="${dotClass}"></div>
                    ${!isLast ? '<div class="timeline-line"></div>' : ''}
                </div>
                <div class="timeline-content">
                    <span class="timeline-time">${formatDateLong(ev.timestamp)}</span>
                    <p class="timeline-status"><strong>${ev.status}</strong></p>
                    <p class="timeline-note">${ev.note || 'Trạng thái đơn hàng được cập nhật.'}</p>
                </div>
            </div>`;
    }).join('');
}

// ── Action buttons ────────────────────────────────────────────────────────────
function bindActions(order) {
    const status = order.orderStatus || 'Chờ xác nhận';

    // Cancel — only shown for cancellable states
    const cancelBtn = document.getElementById('odCancelBtn');
    const canCancel = !NO_CANCEL_STATES.includes(status);
    cancelBtn.style.display = canCancel ? 'inline-flex' : 'none';
    cancelBtn.onclick = () => cancelOrder(order.code);

    // Re-buy
    document.getElementById('odRebuyBtn').onclick = () => rebuyOrder(order);

    // Review — only active when completed
    const reviewBtn = document.getElementById('odReviewBtn');
    const done = status === 'Hoàn thành';
    reviewBtn.disabled = !done;
    reviewBtn.style.opacity = done ? '1' : '0.4';
    reviewBtn.title = done ? '' : 'Chỉ có thể đánh giá sau khi đơn hoàn thành';
    reviewBtn.onclick = done
        ? () => showToast('Tính năng đánh giá sản phẩm đang được phát triển 🐾')
        : null;

    // Return / complaint — active when shipped or completed
    const returnBtn = document.getElementById('odReturnBtn');
    const canReturn = ['Hoàn thành', 'Đang giao'].includes(status);
    returnBtn.disabled = !canReturn;
    returnBtn.style.opacity = canReturn ? '1' : '0.4';
    returnBtn.title = canReturn ? '' : 'Chỉ có thể yêu cầu sau khi đơn đã giao';
    returnBtn.onclick = canReturn
        ? () => showToast('Tính năng khiếu nại / đổi trả đang được phát triển 🐾')
        : null;
}

// ── Cancel ────────────────────────────────────────────────────────────────────
function cancelOrder(orderCode) {
    const orders = loadOrders();
    const idx    = orders.findIndex(o => o.code === orderCode);
    if (idx === -1) { showToast('Không tìm thấy đơn hàng.', 'danger'); return; }

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
    showToast(`Đã hủy đơn hàng ${orderCode}`, 'info');

    // Re-render the page with updated data
    setTimeout(() => renderOrderDetail(orders[idx]), 400);
}

// ── Re-buy ────────────────────────────────────────────────────────────────────
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
    showToast(`Đã thêm ${order.cart.length} sản phẩm vào giỏ hàng ✅`);
    setTimeout(() => { window.location.href = 'shop.html'; }, 1200);
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
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ── Init ──────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    const code = new URLSearchParams(window.location.search).get('order');

    if (!code) {
        document.getElementById('odNotFound').style.display = 'grid';
        return;
    }

    const orders = loadOrders();
    const order  = orders.find(o => o.code === code);

    if (!order) {
        document.getElementById('odNotFound').style.display = 'grid';
        return;
    }

    renderOrderDetail(order);

    // Cross-tab sync: re-render if this order changes in another tab
    window.addEventListener('storage', event => {
        if (event.key !== ORDERS_KEY) return;
        const updated = loadOrders().find(o => o.code === code);
        if (updated) renderOrderDetail(updated);
    });
});
