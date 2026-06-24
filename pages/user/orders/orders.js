/**
 * ORDERS PAGE
 * Reads seeded orders from /data/orders.json through the API cache.
 */

import { API } from '/assets/js/api/api.js';

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
    const processingStatuses = ['pending_payment', 'preparing', 'shipping', 'delivered'];
    const processingCount = ordersState.allOrders.filter((order) => processingStatuses.includes(order.status)).length;
    const completedCount = ordersState.allOrders.filter((order) => order.status === 'completed').length;
    const totalSpent = ordersState.allOrders
        .filter((order) => order.paymentStatus === 'paid')
        .reduce((sum, order) => sum + order.pricing.total, 0);

    document.getElementById('processing-count').textContent = processingCount;
    document.getElementById('completed-count').textContent = completedCount;
    document.getElementById('total-spent').textContent = formatCurrency(totalSpent);
}

function updateTabCounts() {
    const statuses = ['all', 'pending_payment', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled'];

    statuses.forEach((status) => {
        const count = status === 'all'
            ? ordersState.allOrders.length
            : ordersState.allOrders.filter((order) => order.status === status).length;

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
        filtered = filtered.filter((order) => order.status === ordersState.currentTab);
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
    const statusLabel = getStatusLabel(order.status);
    const isCompleted = order.status === 'completed';

    const reviewed = JSON.parse(localStorage.getItem('pawpal_reviewed') || '[]');
    const allReviewed = isCompleted && order.products.every((product) =>
        reviewed.some((item) => item.orderId === order.id && item.productId === product.id)
    );

    const reviewActionHTML = isCompleted
        ? allReviewed
            ? `<a href="/pages/user/order-detail/order-detail.html?id=${order.id}#reviews" class="btn-track-order text-decoration-none" aria-label="Xem danh gia don hang ${order.id}">Xem danh gia</a>`
            : `<a href="/pages/user/order-detail/order-detail.html?id=${order.id}#reviews" class="btn-review text-decoration-none" aria-label="Danh gia don hang ${order.id}">Danh gia</a>`
        : '';

    const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
    const alreadyReturned = returnsList.some((item) => item.orderId === order.id);

    const reviewedList = JSON.parse(localStorage.getItem('pawpal_reviewed') || '[]');
    const hasAnyReviewed = reviewedList.some((item) => item.orderId === order.id);

    let returnActionHTML = '';
    if (isCompleted) {
        if (alreadyReturned) {
            returnActionHTML = `
                <a href="/pages/user/return-detail/return-detail.html?orderId=${order.id}" class="btn-track-order text-decoration-none">
                    Chi tiet doi tra
                </a>
            `;
        } else if (hasAnyReviewed) {
            returnActionHTML = `
                <button class="btn-track-order" disabled title="Giao dịch đã được đánh giá, không thể đổi trả.">
                    Da danh gia
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
    if (order.status === 'shipping') {
        footerButtonsHTML = `
                <button class="btn-track-order" onclick="contactHotline('${order.id}')">
                Liên hệ hotline
                </button>
        `;
    } else if (order.status === 'pending_payment' || order.status === 'preparing') {
        footerButtonsHTML = `
                <button class="btn-track-order" onclick="contactHotline('${order.id}')">
                Liên hệ hotline
                </button>
            <button class="btn-track-order text-danger border-danger" onclick="cancelOrder('${order.id}')">
                Huy don hang
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
                <span class="status-badge status-${order.status}">
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
                        <span class="summary-value">${formatCurrency(order.pricing.total)}</span>
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

function contactHotline(orderId) {
    alert(`Goi hotline ho tro cho don hang ${orderId}: 1900 1234`);
}

function cancelOrder(orderId) {
    if (confirm(`Ban co chac chan muon huy don hang ${orderId}?`)) {
        const order = ordersState.allOrders.find((item) => item.id === orderId);
        if (!order) {
            alert('Không tìm thấy đơn hàng để hủy.');
            return;
        }

        order.status = 'cancelled';
        order.updatedAt = new Date().toISOString();
        saveOrderToLocalStorage(order);

        updateTabCounts();
        applyFilters();

        alert(`Don hang ${orderId} da duoc chuyen sang trang thai Da huy.`);
    }
}

function reorder(orderId) {
    alert(`Da them cac san pham cua don hang ${orderId} vao gio hang`);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
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
        pending_payment: 'Chờ thanh toán',
        preparing: 'Đang chuẩn bị',
        shipping: 'Đang giao',
        delivered: 'Đã giao hàng',
        completed: 'Hoàn thành',
        cancelled: 'Đã hủy'
    };
    return labels[status] || status;
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
