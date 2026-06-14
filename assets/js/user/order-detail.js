/**
 * ORDER DETAIL PAGE - Tuân thủ 100% design.md
 * - NO emoji
 * - Timeline với pulse animation
 * - Phân quyền Member vs Guest
 * - Auto-complete sau 3 ngày
 */

let currentOrder = null;
let isGuest = false; // Giả định: false = Member, true = Guest

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
        const response = await fetch('/data/orders.json');
        const orders = await response.json();
        
        currentOrder = orders.find(order => order.id === orderId);
        
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
            const deliveredEntry = currentOrder.timeline.find(t => t.status === 'delivered' || t.status === 'completed');
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
    
    const deliveredTimeline = currentOrder.timeline.find(t => t.status === 'delivered');
    if (!deliveredTimeline) return;
    
    const deliveredTime = new Date(deliveredTimeline.timestamp);
    const now = new Date();
    const hoursPassed = (now - deliveredTime) / (1000 * 60 * 60);
    
    if (hoursPassed >= 72) {
        // Auto complete
        currentOrder.status = 'completed';
        currentOrder.timeline.push({
            status: 'completed',
            timestamp: new Date().toISOString(),
            title: 'Hoàn thành',
            description: 'Tự động hoàn thành sau 3 ngày giao hàng'
        });
        console.log('Đơn hàng tự động hoàn thành');
    }
}

// Render order header
function renderOrderHeader() {
    document.getElementById('order-id').textContent = currentOrder.id;
    document.getElementById('order-id-breadcrumb').textContent = currentOrder.id;
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
        actionsContainer.style.display = 'none';
        guestNotice.style.display = 'flex';
        return;
    }
    
    // Member mode - show actions based on status
    let buttons = [];
    
    switch(currentOrder.status) {
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
        case 'shipping':
            buttons.push(`
                <button class="btn-danger-outline" onclick="cancelOrder()">
                    Hủy đơn hàng
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
            buttons.push(`
                <button class="btn-green-outline" onclick="requestReturn()">
                    Yêu cầu đổi trả
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

function cancelOrder() {
    if (confirm('Bạn có chắc chắn muốn hủy đơn hàng này?')) {
        alert('Đơn hàng đã được hủy');
        // TODO: Call API to cancel order
        window.location.href = '/pages/user/orders.html';
    }
}

function confirmReceived() {
    if (confirm('Xác nhận bạn đã nhận được hàng?')) {
        currentOrder.status = 'completed';
        currentOrder.timeline.push({
            status: 'completed',
            timestamp: new Date().toISOString(),
            title: 'Hoàn thành',
            description: 'Khách hàng xác nhận đã nhận hàng'
        });
        
        alert('Cảm ơn bạn! Đơn hàng đã hoàn thành.');
        // TODO: Call API to update order
        location.reload();
    }
}

function writeReview() {
    // Handled by ReviewHandler.init — this is a fallback no-op
    console.log('[order-detail] writeReview called — ReviewHandler manages inline forms');
}

function requestReturn() {
    openReturnPanel();
}

// Show error
function showError(message) {
    document.querySelector('.order-detail-main').innerHTML = `
        <div class="empty-state">
            <div class="empty-state-icon">•</div>
            <p class="empty-state-text">${message}</p>
            <a href="/pages/user/orders.html" class="btn-cta" style="margin-top: var(--space-md)">
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
