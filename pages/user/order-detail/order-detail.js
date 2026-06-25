/**
 * ORDER DETAIL PAGE - Tuân thủ 100% design.md
 * - NO emoji
 * - Timeline với pulse animation
 * - Phân quyền Member vs Guest
 * - Auto-complete sau 3 ngày
 */

let currentOrder = null;
let isGuest = false; // Giả định: false = Member, true = Guest

function resolveDataUrl(path) {
    const scriptSrc = document.currentScript?.src || window.location.href;
    return new URL(path, scriptSrc).href;
}

// Get order ID from URL
function getOrderIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
}

// Load order detail
async function loadOrderDetail() {
    const orderId = getOrderIdFromURL();
    
    if (!orderId) {
        showError('Không tìm thấy mã đơn hàng');
        return;
    }
    
    try {
        // First try localStorage cache (orders created by the app)
        const localOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
        currentOrder = Array.isArray(localOrders) ? localOrders.find(o => String(o.id) === String(orderId)) : null;

        // Fallback to the seeded data file when local storage is empty
        if (!currentOrder) {
            const response = await fetch(resolveDataUrl('../../../data/orders.json'));
            const orders = await response.json();
            currentOrder = Array.isArray(orders) ? orders.find(order => String(order.id) === String(orderId)) : null;
        }

        if (!currentOrder) {
            showError('Không tìm thấy đơn hàng');
            return;
        }
        
        // Check if auto-complete needed
        checkAutoComplete();
        
        // Render order details
        renderOrderHeader();
        renderDeliveryInfo();
        renderPaymentInfo();
        renderProducts();
        renderSummary();
        renderTimeline();
        renderActions();
        
        // Inject review buttons/forms for completed orders (US 11-1, 11-2)
        if ((currentOrder.status === 'completed') && typeof ReviewHandler !== 'undefined') {
            const orderTimeline = Array.isArray(currentOrder.timeline) ? currentOrder.timeline : [];
            const deliveredEntry = orderTimeline.find(t => t.status === 'delivered' || t.status === 'completed');
            const deliveredDate  = deliveredEntry
                ? new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(deliveredEntry.timestamp))
                : '';
            const products = currentOrder.products.map(p => ({ ...p, deliveredDate }));
            ReviewHandler.init(currentOrder.id, products);
        }
        
    } catch (error) {
        console.error('Lỗi load đơn hàng:', error);
        showError('Không thể tải thông tin đơn hàng');
    }
}

// Check auto-complete (3 days after delivered)
function checkAutoComplete() {
    if (currentOrder.status !== 'delivered') return;
    
    const orderTimeline = Array.isArray(currentOrder.timeline) ? currentOrder.timeline : [];
    const deliveredTimeline = orderTimeline.find(t => t.status === 'delivered');
    if (!deliveredTimeline) return;
    
    const deliveredTime = new Date(deliveredTimeline.timestamp);
    const now = new Date();
    const hoursPassed = (now - deliveredTime) / (1000 * 60 * 60);
    
    if (hoursPassed >= 72) {
        // Auto complete
        currentOrder.status = 'completed';
        orderTimeline.push({
            status: 'completed',
            timestamp: new Date().toISOString(),
            title: 'Hoàn thành',
            description: 'Tự động hoàn thành sau 3 ngày giao hàng'
        });
        currentOrder.timeline = orderTimeline;
        // Persist ngay để reload lại không bị trùng
        saveOrderToLocalStorage(currentOrder);
        console.log('Đơn hàng tự động hoàn thành');
    }
}

// Render order header
function renderOrderHeader() {
    document.getElementById('order-id').textContent = currentOrder.id;
    document.getElementById('order-created-date').textContent = 
        'Đặt ngày ' + formatDate(currentOrder.createdAt);
    
    const statusBadge = document.getElementById('order-status-badge');
    statusBadge.textContent = getStatusLabel(currentOrder.status);
    statusBadge.className = `status-badge status-${currentOrder.status}`;
}

// Render delivery info
function renderDeliveryInfo() {
    document.getElementById('receiver-name').textContent = currentOrder.delivery.name;
    document.getElementById('receiver-phone').textContent = currentOrder.delivery.phone;
    document.getElementById('receiver-address').textContent = currentOrder.delivery.address;
}

// Render payment info
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

// Render products
function renderProducts() {
    const container = document.getElementById('products-list');
    
    container.innerHTML = currentOrder.products.map(product => `
        <div class="product-item">
            <img src="${product.image}" 
                 alt="${product.name}" 
                 class="product-item-img"
                 loading="lazy">
            <div class="product-item-info">
                <h4 class="product-item-name">${product.name}</h4>
                <p class="product-item-meta">x${product.quantity}</p>
            </div>
            <div class="product-item-price">${formatCurrency(product.total)}</div>
        </div>
    `).join('');
}

// Render summary
function renderSummary() {
    document.getElementById('subtotal').textContent = 
        formatCurrency(currentOrder.pricing.subtotal);
    document.getElementById('shipping-fee').textContent = 
        formatCurrency(currentOrder.pricing.shippingFee);
    document.getElementById('discount').textContent = 
        currentOrder.pricing.discount > 0 
            ? '-' + formatCurrency(currentOrder.pricing.discount)
            : '0đ';
    document.getElementById('total').textContent = 
        formatCurrency(currentOrder.pricing.total);
}

// Render timeline
function renderTimeline() {
    const container = document.getElementById('order-timeline');
    
    // Find current active status
    const statusOrder = ['placed', 'confirmed', 'preparing', 'shipping', 'delivered', 'completed'];
    const currentIndex = statusOrder.indexOf(currentOrder.status);
    
    container.innerHTML = currentOrder.timeline.map((item, index) => {
        let itemClass = 'timeline-item';
        
        // Determine item state
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

// Render action buttons
function renderActions() {
    const actionsContainer = document.getElementById('order-actions');
    const guestNotice = document.getElementById('guest-notice');
    
    if (isGuest) {
        // Guest mode - hide actions, show notice
        actionsContainer.classList.add('d-none');
        guestNotice.classList.remove('d-none');
        return;
    }
    
    // Member mode - show actions based on status
    let buttons = [];
    
    switch(currentOrder.status) {
        case 'pending':
        case 'pending_payment':
            buttons.push(`
                <button class="btn-cta" onclick="payNow()">
                    Thanh toán ngay
                </button>
                <button class="btn-danger-outline" onclick="cancelOrder()">
                    Hủy đơn hàng
                </button>
            `);
            break;
            
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
            
        case 'completed':
            // 1. Kiểm tra cửa sổ 7 ngày từ ngày hoàn thành
            const completedEntry = currentOrder.timeline
                ? currentOrder.timeline.slice().reverse().find(t => t.status === 'completed')
                : null;
            const completedAt = completedEntry ? new Date(completedEntry.timestamp) : new Date(currentOrder.createdAt || 0);
            const daysPassed = (Date.now() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
            const withinReturnWindow = daysPassed <= 7;

            // 2. Return logic
            const returnsList = JSON.parse(localStorage.getItem('pawpal_returns') || '[]');
            const alreadyReturned = returnsList.some(r => r.orderId === currentOrder.id);

            // 3. Check if order has any product reviewed to disable return
            const reviewedList = JSON.parse(localStorage.getItem('pawpal_reviewed') || '[]');
            const hasAnyReviewed = reviewedList.some(r => r.orderId === currentOrder.id);

            if (alreadyReturned) {
                buttons.push(`
                    <a href="/pages/user/return-detail/return-detail.html?orderId=${currentOrder.id}" class="btn-track-order text-decoration-none">
                        Chi tiết đổi trả
                    </a>
                `);
            } else if (!withinReturnWindow) {
                buttons.push(`
                    <button class="btn-track-order" disabled title="Đã quá 7 ngày kể từ ngày nhận hàng, không thể yêu cầu đổi trả.">
                        Hết hạn đổi trả
                    </button>
                `);
            } else if (hasAnyReviewed) {
                buttons.push(`
                    <button class="btn-track-order" disabled title="Giao dịch đã được đánh giá, không thể đổi trả.">
                        Đã đánh giá (Không thể đổi trả)
                    </button>
                `);
            } else {
                buttons.push(`
                    <button class="btn-track-order" onclick="openRMADrawer('${currentOrder.id}')">
                        Yêu cầu trả hàng/hoàn tiền
                    </button>
                `);
            }

            // 2. Review logic
            const reviewed = JSON.parse(localStorage.getItem('pawpal_reviewed') || '[]');
            const allReviewed = currentOrder.products.every(p =>
                reviewed.some(r => r.orderId === currentOrder.id && r.productId === p.id)
            );
            if (allReviewed) {
                 buttons.push(`
                    <button class="btn-review border-0" onclick="showOrderReviewsModal('${currentOrder.id}')">
                        Xem đánh giá
                    </button>
                `);
            }

            // 3. Reorder
            buttons.push(`
                <button class="btn-view-detail border-0" onclick="reorder('${currentOrder.id}')">
                    Mua lại
                </button>
            `);
            break;
    }
    
    actionsContainer.innerHTML = buttons.join('');
    actionsContainer.style.display = buttons.length > 0 ? 'flex' : 'none';
}

// Action handlers
function payNow() {
    alert(`Chuyển đến trang thanh toán cho đơn hàng ${currentOrder.id}`);
    // TODO: Redirect to payment page
}

function restoreStockForOrder(order) {
    // Hoàn trả tồn kho khi đơn hàng bị hủy
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
    // Hiện modal xác nhận thay vì confirm() native
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

    document.getElementById('confirmCancelOrderBtn').addEventListener('click', () => {
        modal.hide();
        restoreStockForOrder(currentOrder);

        // Ghi nhận yêu cầu hoàn tiền nếu đã thanh toán online
        if (currentOrder.paymentMethod && currentOrder.paymentMethod !== 'cod' && currentOrder.paymentStatus === 'paid') {
            const refunds = JSON.parse(localStorage.getItem('pawpal_refunds') || '[]');
            refunds.push({
                orderId: currentOrder.id,
                amount: currentOrder.pricing?.total || 0,
                paymentMethod: currentOrder.paymentMethod,
                status: 'pending_refund',
                createdAt: new Date().toISOString()
            });
            localStorage.setItem('pawpal_refunds', JSON.stringify(refunds));
        }

        currentOrder.status = 'cancelled';
        const orderTimeline = Array.isArray(currentOrder.timeline) ? currentOrder.timeline : (currentOrder.timeline = []);
        orderTimeline.push({
            status: 'cancelled',
            timestamp: new Date().toISOString(),
            title: 'Đã hủy',
            description: 'Khách hàng đã hủy đơn hàng'
        });
        saveOrderToLocalStorage(currentOrder);
        window.location.href = './orders.html';
    });
}

window.cancelOrder = cancelOrder;

function contactHotline() {
    alert('Đang kết nối đến tổng đài CSKH: 1900 xxxx...');
    // TODO: Initiate call or show hotline modal
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

    document.getElementById('confirmReceivedBtn').addEventListener('click', () => {
        modal.hide();
        currentOrder.status = 'completed';
        const orderTimeline = Array.isArray(currentOrder.timeline) ? currentOrder.timeline : (currentOrder.timeline = []);
        orderTimeline.push({
            status: 'completed',
            timestamp: new Date().toISOString(),
            title: 'Hoàn thành',
            description: 'Khách hàng xác nhận đã nhận hàng'
        });
        saveOrderToLocalStorage(currentOrder);
        location.reload();
    });
}

window.confirmReceived = confirmReceived;

function saveOrderToLocalStorage(order) {
    const allOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
    const index = allOrders.findIndex(o => o.id === order.id);
    if (index !== -1) {
        allOrders[index] = order;
        localStorage.setItem('pawpal_orders', JSON.stringify(allOrders));
    }
}

function showOrderReviewsModal(orderId) {
    const allReviews = JSON.parse(localStorage.getItem('pawpal_reviews') || '[]');
    const myReviews = allReviews.filter(r => r.orderId === orderId);
    
    if (myReviews.length === 0) {
        alert('Bạn chưa viết đánh giá nào cho đơn hàng này.');
        return;
    }

    let reviewItems = myReviews.map(r => {
        let stars = '&#9733;'.repeat(r.rating) + '&#9734;'.repeat(5 - r.rating);
        return `
            <div class="review-item">
                <div class="review-stars">${stars}</div>
                <p class="review-comment">${r.comment || '<i>Không có nhận xét</i>'}</p>
            </div>
        `;
    }).join('');

    // Create a simple modal
    const modalHtml = `
        <div id="review-modal-overlay" class="review-modal-overlay">
            <div class="review-modal-content">
                <button onclick="document.getElementById('review-modal-overlay').remove()" class="review-modal-close">&times;</button>
                <h3 class="review-modal-title">Đánh giá của bạn</h3>
                <div class="review-modal-body">
                    ${reviewItems}
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

window.showOrderReviewsModal = showOrderReviewsModal;

function reorder(orderId) {
    alert(`Đã thêm các sản phẩm của đơn hàng ${orderId} vào giỏ hàng`);
}

// Show error
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
        'confirmed': 'Đã xác nhận',
        'preparing': 'Đang chuẩn bị',
        'shipping': 'Đang giao',
        'delivered': 'Đã giao hàng',
        'completed': 'Hoàn thành',
        'cancelled': 'Đã hủy'
    };
    return labels[status] || status;
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Components are injected by components.js (loaded via defer)
    
    // Check if guest mode (from URL param)
    const params = new URLSearchParams(window.location.search);
    isGuest = params.get('guest') === 'true';
    
    // Load order detail
    loadOrderDetail();
});
