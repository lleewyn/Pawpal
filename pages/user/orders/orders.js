/**
 * ORDERS PAGE
 * Reads seeded orders from /data/orders.json through the API cache.
 */

import { API } from '/scripts/api/api.js';

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
        await API.initData();

        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        if (!currentUser) {
            showEmptyState('Vui long dang nhap de xem don hang.');
            return;
        }

        const orders = await API.getUserOrders(currentUser.id);
        ordersState.allOrders = Array.isArray(orders) ? orders : [];
        ordersState.filteredOrders = ordersState.allOrders;

        updateStats();
        updateTabCounts();
        renderOrders();
    } catch (error) {
        console.error('Loi load don hang:', error);
        showEmptyState('Không thể tải đơn hàng. Vui lòng thử lại sau.');
    }
}

function updateStats() {
    const processingStatuses = ['pending', 'pending_payment', 'preparing', 'shipping', 'delivered'];
    const processingCount = ordersState.allOrders.filter((order) => processingStatuses.includes(order.status)).length;
    const completedCount = ordersState.allOrders.filter((order) => order.status === 'completed').length;
    const totalSpent = ordersState.allOrders
        .filter((order) => order.paymentStatus === 'paid')
        .reduce((sum, order) => sum + toNumber(order.pricing?.total), 0);

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
    const firstProduct = order.products[0];
    const remainingCount = order.products.length - 1;
    const normalizedStatus = normalizeOrderStatus(order.status);
    const statusLabel = getStatusLabel(normalizedStatus);
    const isCompleted = normalizedStatus === 'completed';

    const reviewed = JSON.parse(localStorage.getItem('pawpal_reviewed') || '[]');
    const allReviewed = isCompleted && order.products.every((product) =>
        reviewed.some((item) => item.orderId === order.id && item.productId === product.id)
    );

    const reviewActionHTML = isCompleted
        ? allReviewed
            ? `<a href="/pages/user/order-detail/order-detail.html?id=${order.id}#reviews" class="btn-track-order text-decoration-none" aria-label="Xem đánh giá đơn hàng ${order.id}">Xem đánh giá</a>`
            : `<a href="/pages/user/order-detail/order-detail.html?id=${order.id}#reviews" class="btn-review text-decoration-none" aria-label="Đánh giá đơn hàng ${order.id}">Đánh giá</a>`
        : '';

    const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
    const alreadyReturned = returnsList.some((item) => item.orderId === order.id);

    const reviewedList = JSON.parse(localStorage.getItem('pawpal_reviewed') || '[]');
    const hasAnyReviewed = reviewedList.some((item) => item.orderId === order.id);

    let returnActionHTML = '';
    if (isCompleted) {
        // Kiểm tra cửa sổ 7 ngày
        const completedEntry = Array.isArray(order.timeline)
            ? order.timeline.slice().reverse().find(t => t.status === 'completed')
            : null;
        const completedAt = completedEntry ? new Date(completedEntry.timestamp) : new Date(order.createdAt || 0);
        const daysPassed = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
        const withinReturnWindow = daysPassed <= 7;

        if (alreadyReturned) {
            returnActionHTML = `
                <a href="/pages/user/return-detail/return-detail.html?orderId=${order.id}" class="btn-track-order text-decoration-none">
                    Chi tiết đổi trả
                </a>
            `;
        } else if (!withinReturnWindow) {
            returnActionHTML = `
                <button class="btn-track-order" disabled title="Đã quá 7 ngày, không thể yêu cầu đổi trả.">
                    Hết hạn đổi trả
                </button>
            `;
        } else if (hasAnyReviewed) {
            returnActionHTML = `
                <button class="btn-track-order" disabled title="Giao dịch đã được đánh giá, không thể đổi trả.">
                    Đã đánh giá (Không thể đổi trả)
                </button>
            `;
        } else {
            returnActionHTML = `
                <button class="btn-track-order" onclick="openRMADrawer('${order.id}')">
                    Yêu cầu trả hàng/hoàn tiền
                </button>
            `;
        }
    }

    const reorderActionHTML = isCompleted
        ? `<button class="btn-view-detail border-0" onclick="reorder('${order.id}')">Mua lại</button>`
        : '';

    let footerButtonsHTML = '';
    if (normalizedStatus === 'shipping') {
        footerButtonsHTML = `
                <button class="btn-track-order" onclick="contactHotline('${order.id}')">
                Liên hệ hotline
                </button>
        `;
    } else if (normalizedStatus === 'pending_payment' || normalizedStatus === 'preparing') {
        footerButtonsHTML = `
                <button class="btn-track-order" onclick="contactHotline('${order.id}')">
                Liên hệ hotline
                </button>
            <button class="btn-track-order text-danger border-danger" onclick="cancelOrder('${order.id}')">
                Hủy đơn hàng
            </button>
        `;
    } else if (order.status === 'completed') {
        footerButtonsHTML = `${returnActionHTML}${reviewActionHTML}${reorderActionHTML}`;
    }

            return `
        <article class="order-card" data-order-id="${order.id}">
            <div class="order-card-header">
                <div class="order-info">
                    <span class="order-id">Mã: ${order.id}</span>
                    <span class="order-date">${formatDate(order.createdAt)}</span>
                </div>
                <span class="status-badge status-${normalizedStatus}">
                    ${statusLabel}
                </span>
            </div>
            <div class="order-card-body" onclick="window.location.href='/pages/user/order-detail/order-detail.html?id=${order.id}'" title="Nhan de xem chi tiet don hang">
                <div class="product-preview">
                    <img src="${firstProduct.image}" alt="${firstProduct.name}" class="product-thumb" loading="lazy">
                    <div class="product-info">
                        <h4 class="product-name">${firstProduct.name}</h4>
                        ${remainingCount > 0 ? `<p class="product-meta">va ${remainingCount} san pham khac</p>` : ''}
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

    // Modal xác nhận
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

        // Hoàn trả tồn kho
        if (Array.isArray(order.products)) {
            try {
                const storedProducts = JSON.parse(localStorage.getItem('pawpal_products') || '[]');
                if (storedProducts.length) {
                    order.products.forEach(item => {
                        const idx = storedProducts.findIndex(p => String(p.id) === String(item.id));
                        if (idx !== -1) {
                            storedProducts[idx].stock = (Number(storedProducts[idx].stock) || 0) + (Number(item.quantity) || 0);
                            storedProducts[idx].inStock = true;
                        }
                    });
                    localStorage.setItem('pawpal_products', JSON.stringify(storedProducts));
                }
            } catch (e) {
                console.warn('cancelOrder stock restore error:', e);
            }
        }

        // Ghi nhận yêu cầu hoàn tiền nếu đã thanh toán online
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

function reorder(orderId) {
    showOrdersToast(`Đã thêm các sản phẩm của đơn hàng ${orderId} vào giỏ hàng.`, 'success');
}

window.reorder = reorder;

function showOrdersToast(message, type = 'info') {
    let container = document.getElementById('orders-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'orders-toast-container';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }
    const colors = { success: '#2a5944', error: '#dc3545', info: '#0d6efd', warning: '#ffc107' };
    const t = document.createElement('div');
    t.style.cssText = `background:${colors[type]||colors.info};color:${type==='warning'?'#000':'#fff'};padding:12px 18px;border-radius:8px;font-size:0.88rem;box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:320px;`;
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => { t.style.opacity='0'; t.style.transition='opacity .3s'; }, 3000);
    setTimeout(() => t.remove(), 3400);
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
        localStorage.setItem('pawpal_orders', JSON.stringify(allOrders));
    }
}

function getStatusLabel(status) {
    const labels = {
        pending: 'Chờ thanh toán',
        pending_payment: 'Chờ thanh toán',
        preparing: 'Đang chuẩn bị',
        shipping: 'Đang giao',
        delivered: 'Đã giao hàng',
        completed: 'Hoàn thành',
        cancelled: 'Đã hủy'
    };
    return labels[status] || status;
}

function normalizeOrderStatus(status) {
    if (status === 'pending') return 'pending_payment';
    if (status === 'return_pending') return 'pending_payment';
    return status;
}

document.addEventListener('DOMContentLoaded', () => {
    loadOrders();

    document.querySelectorAll('.tab-btn').forEach((btn) => {
        btn.addEventListener('click', (event) => {
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

