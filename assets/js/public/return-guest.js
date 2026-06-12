/* ==========================================================================
   return-guest.js — Service Lookup Logic (US 7-2)
   ========================================================================== */

// Mock data for demonstration
const MOCK_LOOKUP_DATA = {
    "0901234567": {
        phone: "0901234567",
        services: [
            {
                id: "S001",
                petName: "Bé Bông",
                serviceName: "Spa + Grooming",
                date: "2026-06-15",
                time: "10:00 - 11:30",
                staff: "Minh An",
                price: 180000,
                status: "in-progress",
                timeline: [
                    {
                        id: 1,
                        status: 'Đã hoàn thành chăm sóc',
                        time: '15:30',
                        date: '2026-06-15',
                        description: 'Bé đã hoàn thành quá trình spa và grooming. Bé rất ngoan và vui vẻ trong suốt quá trình.',
                        staff: 'Nguyễn Mai Anh',
                        type: 'completed',
                        invoice: {
                            code: 'HD-123456',
                            items: [
                                { name: 'Spa + Grooming - Gói Premium', price: 150000 },
                                { name: 'Cắt tỉa lông chuyên nghiệp', price: 30000 }
                            ],
                            total: 180000,
                            paid: true
                        }
                    },
                    {
                        id: 2,
                        status: 'Đang sấy lông',
                        time: '14:45',
                        date: '2026-06-15',
                        description: 'Bé đang được sấy lông với nhiệt độ phù hợp. Bé trông rất đáng yêu!',
                        staff: 'Nguyễn Mai Anh',
                        type: 'in_progress'
                    },
                    {
                        id: 3,
                        status: 'Ghi chú khẩn',
                        time: '14:20',
                        date: '2026-06-15',
                        description: 'Bé tỏ ra hơi căng thẳng khi vào bồn tắm. Chúng em đã dành thêm thời gian để bé làm quen và giờ bé đã bình tĩnh hơn.',
                        staff: 'Nguyễn Mai Anh',
                        type: 'urgent',
                        urgent: true
                    }
                ]
            },
            {
                id: "S002",
                petName: "Miu",
                serviceName: "Pet Hotel (3 đêm)",
                dateRange: "10/06/2026 - 13/06/2026",
                price: 450000,
                status: "completed",
                timeline: []
            }
        ],
        orders: [
            {
                id: "DH-123456",
                date: "2026-06-08",
                total: 350000,
                status: "shipping",
                statusText: "Đang giao hàng"
            }
        ]
    }
};

let currentPhone = null;
let currentData = null;

/**
 * Initialize page
 */
document.addEventListener('DOMContentLoaded', init);

function init() {
    console.log('[Return Guest] Initializing...');
    
    // Bind form submit
    const form = document.getElementById('lookupForm');
    if (form) {
        form.addEventListener('submit', handleLookupSubmit);
    }
    
    // Bind lookup again button
    const btnLookupAgain = document.getElementById('btnLookupAgain');
    if (btnLookupAgain) {
        btnLookupAgain.addEventListener('click', resetToSearch);
    }
    
    // Bind tab buttons
    const tabServices = document.getElementById('tabServices');
    const tabOrders = document.getElementById('tabOrders');
    
    if (tabServices) {
        tabServices.addEventListener('click', () => switchTab('services'));
    }
    if (tabOrders) {
        tabOrders.addEventListener('click', () => switchTab('orders'));
    }
    
    // Check URL params (for direct access with phone)
    const urlParams = new URLSearchParams(window.location.search);
    const phoneFromUrl = urlParams.get('phone');
    if (phoneFromUrl) {
        document.getElementById('phoneInput').value = phoneFromUrl;
        handleLookup(phoneFromUrl);
    }
}

/**
 * Handle form submit
 */
function handleLookupSubmit(e) {
    e.preventDefault();
    
    const phoneInput = document.getElementById('phoneInput');
    const phone = phoneInput.value.trim();
    
    // Validate
    if (!/^[0-9]{10}$/.test(phone)) {
        phoneInput.classList.add('error');
        showToast('Vui lòng nhập đúng 10 số điện thoại', 'error');
        return;
    }
    
    phoneInput.classList.remove('error');
    handleLookup(phone);
}

/**
 * Handle lookup
 */
async function handleLookup(phone) {
    currentPhone = phone;
    
    // Show loading (optional)
    // TODO: Add loading spinner
    
    // Mock API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Get data
    const data = MOCK_LOOKUP_DATA[phone];
    
    if (!data) {
        showErrorState('Không tìm thấy dịch vụ hoặc đơn hàng nào với số điện thoại này.');
        return;
    }
    
    currentData = data;
    showResultsView();
    renderResults();
}

/**
 * Show error state (inline under form)
 */
function showErrorState(message) {
    // Hide results if showing
    document.getElementById('resultsWrapper').style.display = 'none';
    
    // Show inline error under form
    const errorInline = document.getElementById('errorInline');
    const errorMessageInline = document.getElementById('errorMessageInline');
    
    errorMessageInline.textContent = message;
    errorInline.style.display = 'block';
    
    // Keep hero visible
    document.getElementById('lookupHero').style.display = 'flex';
    
    // Shake the input for visual feedback
    const phoneInput = document.getElementById('phoneInput');
    phoneInput.classList.add('error');
    phoneInput.focus();
}

/**
 * Show results view
 */
function showResultsView() {
    // Hide error message if visible
    document.getElementById('errorInline').style.display = 'none';
    
    document.getElementById('lookupHero').style.display = 'none';
    document.getElementById('resultsWrapper').style.display = 'block';
    
    // Update compact search bar
    document.getElementById('compactPhoneInput').value = currentPhone;
    
    // Update URL without reload
    const newUrl = new URL(window.location);
    newUrl.searchParams.set('phone', currentPhone);
    window.history.pushState({}, '', newUrl);
}

/**
 * Reset to search
 */
function resetToSearch() {
    document.getElementById('lookupHero').style.display = 'flex';
    document.getElementById('resultsWrapper').style.display = 'none';
    document.getElementById('errorInline').style.display = 'none';
    document.getElementById('phoneInput').value = '';
    document.getElementById('phoneInput').classList.remove('error');
    document.getElementById('phoneInput').focus();
    
    // Clear URL params
    window.history.pushState({}, '', window.location.pathname);
    
    currentPhone = null;
    currentData = null;
}

/**
 * Render results
 */
function renderResults() {
    if (!currentData) return;
    
    const services = currentData.services || [];
    const orders = currentData.orders || [];
    
    // Update badges
    document.getElementById('servicesBadge').textContent = services.length;
    document.getElementById('ordersBadge').textContent = orders.length;
    
    // Update result count
    const totalResults = services.length + orders.length;
    document.getElementById('resultCount').textContent = `Tìm thấy ${totalResults} kết quả`;
    
    // Render services
    renderServices(services);
    
    // Render orders
    renderOrders(orders);
    
    // Show appropriate tab
    if (services.length > 0) {
        switchTab('services');
    } else if (orders.length > 0) {
        switchTab('orders');
    }
}

/**
 * Render services
 */
function renderServices(services) {
    const container = document.getElementById('servicesGrid');
    const emptyState = document.getElementById('emptyServices');
    
    if (services.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    container.innerHTML = services.map(service => {
        const statusClass = service.status === 'in-progress' ? 'status-in-progress' : 
                           service.status === 'completed' ? 'status-completed' : 'status-confirmed';
        const statusText = service.status === 'in-progress' ? 'Đang thực hiện' :
                          service.status === 'completed' ? 'Hoàn thành' : 'Đã xác nhận';
        
        return `
            <div class="service-card">
                <div class="service-card-header">
                    <div class="service-card-info">
                        <h3 class="service-card-title">${service.petName} - ${service.serviceName}</h3>
                        <div class="service-card-meta">
                            <span>${service.dateRange || service.date}</span>
                            ${service.time ? `<span>${service.time}</span>` : ''}
                            <span>Nhân viên: ${service.staff}</span>
                        </div>
                    </div>
                    <div class="service-card-price">${formatCurrency(service.price)}</div>
                </div>
                <div class="service-status-badge ${statusClass}">${statusText}</div>
                
                ${service.timeline && service.timeline.length > 0 ? `
                    <button class="btn-toggle-timeline" onclick="toggleTimeline('${service.id}')">
                        <span id="timeline-icon-${service.id}">▶</span>
                        Xem nhật ký bé cưng
                    </button>
                    <div class="timeline-accordion" id="timeline-${service.id}">
                        <div class="accordion-timeline-wrapper">
                            ${renderTimeline(service.timeline)}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    }).join('');
}

/**
 * Render timeline (reuse from pet-diary)
 */
function renderTimeline(timelineData) {
    return timelineData.map(item => {
        const isUrgent = item.urgent || item.type === 'urgent';
        const isCompleted = item.type === 'completed';
        
        return `
            <div class="timeline-item ${isUrgent ? 'timeline-item-urgent' : ''}">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    ${isUrgent ? '<div class="timeline-urgent-badge">GHI CHÚ KHẨN</div>' : ''}
                    <div class="timeline-time">${item.time}</div>
                    <h4 class="timeline-status">${item.status}</h4>
                    <p class="timeline-description">${item.description}</p>
                    <div class="timeline-staff">
                        <span>Nhân viên: ${item.staff}</span>
                    </div>
                    
                    ${isCompleted && item.invoice ? renderInvoice(item.invoice) : ''}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Render invoice
 */
function renderInvoice(invoice) {
    return `
        <div class="timeline-invoice-block">
            <div class="invoice-header">
                <h4 class="invoice-title">Hóa đơn dịch vụ</h4>
                <span class="invoice-code">${invoice.code}</span>
            </div>
            <div class="invoice-items">
                ${invoice.items.map(item => `
                    <div class="invoice-item">
                        <span class="invoice-item-name">${item.name}</span>
                        <span class="invoice-item-price">${formatCurrency(item.price)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="invoice-total">
                <span class="invoice-total-label">Tổng thanh toán:</span>
                <span class="invoice-total-amount">${formatCurrency(invoice.total)}</span>
            </div>
            <div class="invoice-status-badge">
                ${invoice.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
            </div>
        </div>
    `;
}

/**
 * Toggle timeline accordion
 */
window.toggleTimeline = function(serviceId) {
    const timeline = document.getElementById(`timeline-${serviceId}`);
    const icon = document.getElementById(`timeline-icon-${serviceId}`);
    
    if (timeline.classList.contains('expanded')) {
        timeline.classList.remove('expanded');
        icon.textContent = '▶';
    } else {
        timeline.classList.add('expanded');
        icon.textContent = '▼';
    }
};

/**
 * Render orders
 */
function renderOrders(orders) {
    const container = document.getElementById('ordersGrid');
    const emptyState = document.getElementById('emptyOrders');
    
    if (orders.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    container.innerHTML = orders.map(order => {
        const statusClass = order.status === 'shipping' ? 'order-status-shipping' : 'order-status-delivered';
        
        return `
            <div class="order-card">
                <div class="order-card-header">
                    <h4 class="order-card-code">Đơn hàng ${order.id}</h4>
                </div>
                <div class="order-card-meta">
                    <span>${order.date}</span>
                    <span>${formatCurrency(order.total)}</span>
                </div>
                <div class="order-status-badge ${statusClass}">
                    ${order.statusText}
                </div>
                <a href="/pages/user/order-detail.html?id=${order.id}" class="btn-view-order">
                    Xem chi tiết →
                </a>
            </div>
        `;
    }).join('');
}

/**
 * Switch tab
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.lookup-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.getElementById(`tab${tabName.charAt(0).toUpperCase() + tabName.slice(1)}`).classList.add('active');
    
    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
        pane.style.display = 'none';
    });
    const activePane = document.getElementById(`${tabName}Pane`);
    activePane.classList.add('active');
    activePane.style.display = 'block';
}

/**
 * Format currency
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
    // Simple toast implementation
    const toast = document.createElement('div');
    toast.className = `toast-notification toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? 'var(--color-danger)' : 'var(--color-primary)'};
        color: white;
        padding: 16px 24px;
        border-radius: var(--border-radius-pill);
        box-shadow: var(--shadow-card);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
