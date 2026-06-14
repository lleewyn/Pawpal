/**
 * ORDERS PAGE - Tuân thủ 100% design.md
 * - NO emoji trong code
 * - Dùng text characters: → • ▶
 */

// State Management
const ordersState = {
    allOrders: [],
    filteredOrders: [],
    currentTab: 'all',
    currentPage: 1,
    ordersPerPage: 10,
    searchQuery: ''
};

// Load orders data
async function loadOrders() {
    try {
        const response = await fetch('/data/orders.json');
        const orders = await response.json();
        
        // Giả sử user hiện tại là USER-123
        ordersState.allOrders = orders.filter(order => order.userId === 'USER-123');
        ordersState.filteredOrders = ordersState.allOrders;
        
        updateStats();
        updateTabCounts();
        renderOrders();
    } catch (error) {
        console.error('Lỗi load đơn hàng:', error);
        showEmptyState('Không thể tải đơn hàng. Vui lòng thử lại sau.');
    }
}

// Update statistics
function updateStats() {
    const processingStatuses = ['pending_payment', 'preparing', 'shipping', 'delivered'];
    const processingCount = ordersState.allOrders.filter(
        order => processingStatuses.includes(order.status)
    ).length;
    
    const completedCount = ordersState.allOrders.filter(
        order => order.status === 'completed'
    ).length;
    
    const totalSpent = ordersState.allOrders
        .filter(order => order.paymentStatus === 'paid')
        .reduce((sum, order) => sum + order.pricing.total, 0);
    
    document.getElementById('processing-count').textContent = processingCount;
    document.getElementById('completed-count').textContent = completedCount;
    document.getElementById('total-spent').textContent = formatCurrency(totalSpent);
}

// Update tab counts
function updateTabCounts() {
    const statuses = ['all', 'pending_payment', 'preparing', 'shipping', 'delivered', 'completed', 'cancelled'];
    
    statuses.forEach(status => {
        let count = 0;
        if (status === 'all') {
            count = ordersState.allOrders.length;
        } else {
            count = ordersState.allOrders.filter(order => order.status === status).length;
        }
        
        const countElement = document.getElementById(`count-${status}`);
        if (countElement) {
            countElement.textContent = `(${count})`;
        }
    });
}

// Filter by status
function filterByStatus(status) {
    ordersState.currentTab = status;
    ordersState.currentPage = 1;
    applyFilters();
}

// Search orders
function searchOrders(query) {
    ordersState.searchQuery = query.toLowerCase();
    ordersState.currentPage = 1;
    applyFilters();
}

// Apply all filters
function applyFilters() {
    let filtered = ordersState.allOrders;
    
    // Filter by status
    if (ordersState.currentTab !== 'all') {
        filtered = filtered.filter(order => order.status === ordersState.currentTab);
    }
    
    // Filter by search query
    if (ordersState.searchQuery) {
        filtered = filtered.filter(order => {
            const matchId = order.id.toLowerCase().includes(ordersState.searchQuery);
            const matchProducts = order.products.some(p => 
                p.name.toLowerCase().includes(ordersState.searchQuery)
            );
            return matchId || matchProducts;
        });
    }
    
    ordersState.filteredOrders = filtered;
    renderOrders();
}

// Render orders
function renderOrders() {
    const container = document.getElementById('orders-list');
    
    if (ordersState.filteredOrders.length === 0) {
        showEmptyState('Không tìm thấy đơn hàng nào');
        return;
    }
    
    const startIndex = (ordersState.currentPage - 1) * ordersState.ordersPerPage;
    const endIndex = startIndex + ordersState.ordersPerPage;
    const ordersToShow = ordersState.filteredOrders.slice(startIndex, endIndex);
    
    container.innerHTML = ordersToShow.map(order => createOrderCard(order)).join('');
    renderPagination();
}

// Create order card HTML
function createOrderCard(order) {
    const firstProduct = order.products[0];
    const remainingCount = order.products.length - 1;
    const statusLabel = getStatusLabel(order.status);
    const isCompleted = order.status === 'completed';

    // Check if all products already reviewed
    const reviewed = JSON.parse(localStorage.getItem('pawpal_reviewed') || '[]');
    const allReviewed = isCompleted && order.products.every(p =>
        reviewed.some(r => r.orderId === order.id && r.productId === p.id)
    );

    const reviewActionHTML = isCompleted
        ? allReviewed
            ? `<span class="reviewed-label" aria-label="Đã đánh giá tất cả sản phẩm">&#10003; Đã đánh giá</span>`
            : `<a href="/pages/user/order-detail.html?id=${order.id}#reviews"
                  class="btn-write-review"
                  aria-label="Viết đánh giá đơn hàng ${order.id}">
                   &#9998; Viết đánh giá
               </a>`
        : '';

    // Calculate if return is allowed (completed status and completed within 7 days)
    const completedDate = new Date(order.updatedAt || order.createdAt);
    const now = new Date();
    const diffMs = now - completedDate;
    const diffHours = diffMs / (1000 * 60 * 60);
    const returnAllowed = isCompleted && (diffHours <= 168); // 7 days = 168 hours
    
    // Check if order has already requested return
    const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
    const alreadyReturned = returnsList.some(r => r.orderId === order.id);

    let returnActionHTML = '';

    if (returnAllowed) {
        if (alreadyReturned) {
            returnActionHTML = `
                <a href="/pages/user/return-detail.html?orderId=${order.id}" class="btn-track-order" style="text-decoration: none;">
                    &#10003; Chi tiết đổi trả
                </a>
            `;
        } else {
            const diffDays = Math.max(0, 7 - Math.floor(diffMs / (1000 * 60 * 60 * 24)));
            returnActionHTML = `
                <button class="btn-track-order" onclick="openRMADrawer('${order.id}')">
                    &#8634; Yêu cầu Đổi trả (Còn ${diffDays} ngày)
                </button>
            `;
        }
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
            <div class="order-card-body">
                <div class="product-preview">
                    <img src="${firstProduct.image}" 
                         alt="${firstProduct.name}" 
                         class="product-thumb"
                         loading="lazy">
                    <div class="product-info">
                        <h4 class="product-name">${firstProduct.name}</h4>
                        ${remainingCount > 0 ? 
                            `<p class="product-meta">và ${remainingCount} sản phẩm khác</p>` 
                            : ''}
                    </div>
                </div>
                <div class="order-summary">
                    <span class="summary-label">Tổng tiền:</span>
                    <span class="summary-value">${formatCurrency(order.pricing.total)}</span>
                </div>
            </div>
            <div class="order-card-footer" style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                <a href="/pages/user/order-detail.html?id=${order.id}" 
                   class="btn-view-detail">Xem chi tiết</a>
                ${reviewActionHTML}
                ${returnActionHTML}
                <button class="btn-track-order" onclick="trackOrder('${order.id}')">
                    Theo dõi đơn hàng
                </button>
            </div>
        </article>
    `;
}

// Show empty state
function showEmptyState(message) {
    const container = document.getElementById('orders-list');
    container.innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">•</div>
            <p class="empty-state-text">${message}</p>
        </div>
    `;
    document.getElementById('pagination').style.display = 'none';
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(ordersState.filteredOrders.length / ordersState.ordersPerPage);
    
    if (totalPages <= 1) {
        document.getElementById('pagination').style.display = 'none';
        return;
    }
    
    document.getElementById('pagination').style.display = 'flex';
    
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    const pageNumbers = document.getElementById('page-numbers');
    
    prevBtn.disabled = ordersState.currentPage === 1;
    nextBtn.disabled = ordersState.currentPage === totalPages;
    
    let pagesHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= ordersState.currentPage - 1 && i <= ordersState.currentPage + 1)) {
            pagesHTML += `
                <button class="page-btn ${i === ordersState.currentPage ? 'active' : ''}" 
                        onclick="goToPage(${i})">${i}</button>
            `;
        } else if (i === ordersState.currentPage - 2 || i === ordersState.currentPage + 2) {
            pagesHTML += '<span>...</span>';
        }
    }
    
    pageNumbers.innerHTML = pagesHTML;
}

// Go to page
function goToPage(page) {
    ordersState.currentPage = page;
    renderOrders();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Track order (placeholder)
function trackOrder(orderId) {
    alert(`Chức năng theo dõi đơn hàng ${orderId} đang được phát triển`);
}

// Utility: Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Utility: Format date
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

// Utility: Get status label
function getStatusLabel(status) {
    const labels = {
        'pending_payment': 'Chờ thanh toán',
        'preparing': 'Đang chuẩn bị',
        'shipping': 'Đang giao',
        'delivered': 'Đã giao hàng',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
    };
    return labels[status] || status;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Components are injected by components.js (loaded via defer)
    
    // Load orders
    loadOrders();
    
    // Tab click handlers
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.currentTarget.classList.add('active');
            filterByStatus(e.currentTarget.dataset.status);
        });
    });
    
    // Search
    const searchInput = document.getElementById('order-search');
    const searchBtn = document.getElementById('search-btn');
    
    searchBtn.addEventListener('click', () => {
        searchOrders(searchInput.value);
    });
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchOrders(searchInput.value);
        }
    });
    
    // Pagination
    document.getElementById('prev-page').addEventListener('click', () => {
        if (ordersState.currentPage > 1) {
            goToPage(ordersState.currentPage - 1);
        }
    });
    
    document.getElementById('next-page').addEventListener('click', () => {
        const totalPages = Math.ceil(ordersState.filteredOrders.length / ordersState.ordersPerPage);
        if (ordersState.currentPage < totalPages) {
            goToPage(ordersState.currentPage + 1);
        }
    });
});
