/* ==========================================================================
   pet-diary.js — Pet Diary & Timeline Logic (US 7-1, 7-2, 7-3)
   ========================================================================== */

import { getPets, fmtDate, showToast } from './pet-profile.js';

// Mock data for demonstration
const MOCK_TIMELINE_DATA = [
    {
        id: 1,
        status: 'Đã hoàn thành chăm sóc',
        time: '15:30',
        date: '2026-06-12',
        description: 'Bé đã hoàn thành quá trình spa và grooming. Bé rất ngoan và vui vẻ trong suốt quá trình.',
        staff: 'Nguyễn Mai Anh',
        images: [],
        type: 'completed',
        invoice: {
            code: 'HD-123456',
            items: [
                { name: 'Spa & Grooming - Gói Premium', price: 150000 },
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
        date: '2026-06-12',
        description: 'Bé đang được sấy lông với nhiệt độ phù hợp. Bé trông rất đáng yêu!',
        staff: 'Nguyễn Mai Anh',
        images: [],
        type: 'in_progress'
    },
    {
        id: 3,
        status: 'Ghi chú khẩn',
        time: '14:20',
        date: '2026-06-12',
        description: 'Bé tỏ ra hơi căng thẳng khi vào bồn tắm. Chúng em đã dành thêm thời gian để bé làm quen và giờ bé đã bình tĩnh hơn.',
        staff: 'Nguyễn Mai Anh',
        images: [],
        type: 'urgent',
        urgent: true
    },
    {
        id: 4,
        status: 'Đang tắm',
        time: '14:00',
        date: '2026-06-12',
        description: 'Bé đang được tắm với sữa tắm chuyên dụng cho da nhạy cảm.',
        staff: 'Nguyễn Mai Anh',
        images: [],
        type: 'in_progress'
    },
    {
        id: 5,
        status: 'Đã check-in',
        time: '13:45',
        date: '2026-06-12',
        description: 'Bé đã được tiếp nhận tại PawPal. Chúng em sẽ bắt đầu quy trình spa ngay.',
        staff: 'Trần Văn Nam',
        images: [],
        type: 'check_in'
    }
];

// Mock chat data for urgent notes (AC1.4 - US 7-1)
const MOCK_CHAT_DATA = {
    3: [ // noteId 3 (urgent note above)
        {
            id: 1,
            sender: 'Nguyễn Mai Anh',
            text: 'Xin chào chủ nhân, bé tỏ ra hơi căng thẳng khi vào bồn tắm. Chúng em đã cho bé uống nước và vuốt ve.',
            timestamp: '2026-06-12T14:22:00',
            isStaff: true
        },
        {
            id: 2,
            sender: 'Bạn',
            text: 'Dạ, bé có bị sao không ạ? Em lo lắm!',
            timestamp: '2026-06-12T14:23:00',
            isStaff: false
        },
        {
            id: 3,
            sender: 'Nguyễn Mai Anh',
            text: 'Dạ, hiện tại bé đã bình tĩnh hơn rồi ạ. Chúng em đang theo dõi sát sao. Nếu có gì em sẽ báo ngay cho chủ nhé!',
            timestamp: '2026-06-12T14:25:00',
            isStaff: true
        }
    ]
};

const MOCK_HISTORY_DATA = [
    {
        id: 'current',
        date: '12/06/2026',
        service: 'Spa & Grooming',
        status: 'Đang thực hiện',
        active: true,
        timeline: MOCK_TIMELINE_DATA
    },
    {
        id: 'past1',
        date: '05/06/2026',
        service: 'Spa & Grooming',
        status: 'Hoàn thành',
        active: false,
        timeline: []
    },
    {
        id: 'past2',
        date: '28/05/2026',
        service: 'Pet Hotel (2 đêm)',
        status: 'Hoàn thành',
        active: false,
        timeline: []
    }
];

let currentPetId = null;
let currentServiceId = 'current';

/**
 * Initialize Pet Diary page
 */
export function initPetDiary() {
    console.log('[Pet Diary] Initializing...');
    
    // Populate pet selector
    populatePetSelector();
    
    // Listen to pet selection change
    const petSelector = document.getElementById('petSelector');
    if (petSelector) {
        petSelector.addEventListener('change', handlePetChange);
    }
    
    // Check URL params (for direct access)
    const urlParams = new URLSearchParams(window.location.search);
    const petIdFromUrl = urlParams.get('id');
    if (petIdFromUrl && petSelector) {
        petSelector.value = petIdFromUrl;
        handlePetChange({ target: petSelector });
    }
}

/**
 * Populate pet selector dropdown
 */
function populatePetSelector() {
    const selector = document.getElementById('petSelector');
    if (!selector) return;
    
    const pets = getPets();
    
    // Clear existing options (except first)
    while (selector.options.length > 1) {
        selector.remove(1);
    }
    
    // Add pet options
    pets.forEach(pet => {
        const option = document.createElement('option');
        option.value = pet.id;
        option.textContent = `${pet.emoji} ${pet.name} - ${pet.breed}`;
        selector.appendChild(option);
    });
}

/**
 * Handle pet selection change
 */
function handlePetChange(e) {
    const petId = e.target.value;
    
    if (!petId) {
        // No pet selected - show empty state
        document.getElementById('emptyState').style.display = 'block';
        document.getElementById('diaryContent').style.display = 'none';
        return;
    }
    
    // Hide empty state, show content
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('diaryContent').style.display = 'block';
    
    // Load pet diary
    currentPetId = petId;
    loadPetDiary(petId);
}

/**
 * Load pet diary data
 */
function loadPetDiary(petId) {
    const pets = getPets();
    const pet = pets.find(p => p.id === petId);
    
    if (!pet) {
        showToast('Không tìm thấy thông tin bé cưng', 'error');
        return;
    }
    
    // Render pet info card
    renderPetInfoCard(pet);
    
    // Render timeline
    renderTimeline(MOCK_TIMELINE_DATA);
    
    // Render history sidebar
    renderHistorySidebar(MOCK_HISTORY_DATA);
    
    // Check if service is in progress (show live stream)
    const hasActiveService = MOCK_TIMELINE_DATA.some(item => item.type === 'in_progress');
    const liveStreamSection = document.getElementById('liveStreamSection');
    if (liveStreamSection) {
        liveStreamSection.style.display = hasActiveService ? 'block' : 'none';
        
        // Set current service name
        const currentServiceName = document.getElementById('currentServiceName');
        if (currentServiceName) {
            currentServiceName.textContent = 'Spa & Grooming';
        }
    }
    
    // Bind live stream button
    const btnWatchLive = document.getElementById('btnWatchLive');
    if (btnWatchLive) {
        btnWatchLive.addEventListener('click', openLiveStreamModal);
    }
}

/**
 * Render pet info card
 */
function renderPetInfoCard(pet) {
    const container = document.getElementById('petInfoCard');
    if (!container) return;
    
    container.innerHTML = `
        <img src="${pet.image}" alt="${pet.name}" class="pet-info-avatar">
        <div class="pet-info-details">
            <h4>${pet.emoji} ${pet.name}</h4>
            <div class="pet-info-meta">
                <span>📋 Pet ID: ${pet.id}</span>
                <span>🐾 ${pet.breed}</span>
                <span>⚖️ ${pet.weight}kg</span>
                ${pet.age ? `<span>🎂 ${pet.age} tuổi</span>` : ''}
            </div>
        </div>
    `;
}

/**
 * Render timeline
 */
function renderTimeline(timelineData) {
    const container = document.getElementById('timelineWrapper');
    const emptyTimeline = document.getElementById('emptyTimeline');
    
    if (!container) return;
    
    if (!timelineData || timelineData.length === 0) {
        container.innerHTML = '';
        if (emptyTimeline) emptyTimeline.style.display = 'block';
        return;
    }
    
    if (emptyTimeline) emptyTimeline.style.display = 'none';
    
    container.innerHTML = timelineData.map(item => {
        const isUrgent = item.urgent || item.type === 'urgent';
        const isCompleted = item.type === 'completed';
        
        let content = `
            <div class="timeline-item ${isUrgent ? 'timeline-item-urgent' : ''}">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                    ${isUrgent ? '<div class="timeline-urgent-badge"><span class="timeline-urgent-icon">⚠️</span> GHI CHÚ KHẨN</div>' : ''}
                    <div class="timeline-time">${item.time}</div>
                    <h4 class="timeline-status">${item.status}</h4>
                    <p class="timeline-description">${item.description}</p>
                    <div class="timeline-staff">
                        <span>👤</span>
                        <span>${item.staff}</span>
                    </div>
                    
                    ${isUrgent ? createChatBoxHTML(item.id) : ''}
                    ${isCompleted && item.invoice ? createInvoiceBlockHTML(item.invoice) : ''}
                </div>
            </div>
        `;
        
        return content;
    }).join('');
    
    // Load chat messages for urgent items
    timelineData.forEach(item => {
        if (item.urgent || item.type === 'urgent') {
            loadChatMessages(item.id);
            bindChatInputEvents(item.id);
        }
    });
}

/**
 * Create chat box HTML (AC1.4 - US 7-1)
 */
function createChatBoxHTML(noteId) {
    return `
        <div class="urgent-chat-box" id="chatBox-${noteId}">
            <div class="chat-box-header">
                <h4 class="chat-box-title">💬 Trò chuyện với nhân viên</h4>
            </div>
            <div class="chat-messages-container" id="chatMessages-${noteId}"></div>
            <div class="chat-input-group">
                <input 
                    type="text" 
                    class="chat-input" 
                    id="chatInput-${noteId}"
                    placeholder="Nhập tin nhắn..."
                    maxlength="500"
                    aria-label="Tin nhắn"
                />
                <button class="btn-send-message" id="btnSend-${noteId}">
                    Gửi
                </button>
            </div>
        </div>
    `;
}

/**
 * Create invoice block HTML (AC1.5 - US 7-1)
 */
function createInvoiceBlockHTML(invoice) {
    return `
        <div class="timeline-invoice-block">
            <div class="invoice-header">
                <h4 class="invoice-title">💰 Hóa đơn dịch vụ</h4>
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
                ✅ ${invoice.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
            </div>
        </div>
    `;
}

/**
 * Load chat messages for a note
 */
function loadChatMessages(noteId) {
    const container = document.getElementById(`chatMessages-${noteId}`);
    if (!container) return;
    
    const messages = MOCK_CHAT_DATA[noteId] || [];
    
    container.innerHTML = messages.map(msg => `
        <div class="chat-message ${msg.isStaff ? 'chat-message-staff' : 'chat-message-customer'}">
            <div class="chat-message-header">
                <span class="chat-sender-name">${msg.sender}</span>
                <span class="chat-time">${formatTime(msg.timestamp)}</span>
            </div>
            <div class="chat-text">${escapeHtml(msg.text)}</div>
        </div>
    `).join('');
    
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

/**
 * Bind chat input events
 */
function bindChatInputEvents(noteId) {
    const input = document.getElementById(`chatInput-${noteId}`);
    const btnSend = document.getElementById(`btnSend-${noteId}`);
    
    if (!input || !btnSend) return;
    
    // Send on button click
    btnSend.addEventListener('click', () => sendChatMessage(noteId));
    
    // Send on Enter key
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            sendChatMessage(noteId);
        }
    });
}

/**
 * Send chat message
 */
function sendChatMessage(noteId) {
    const input = document.getElementById(`chatInput-${noteId}`);
    const container = document.getElementById(`chatMessages-${noteId}`);
    
    if (!input || !container) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    // Create message object
    const newMessage = {
        id: Date.now(),
        sender: 'Bạn',
        text: message,
        timestamp: new Date().toISOString(),
        isStaff: false
    };
    
    // Add to mock data
    if (!MOCK_CHAT_DATA[noteId]) {
        MOCK_CHAT_DATA[noteId] = [];
    }
    MOCK_CHAT_DATA[noteId].push(newMessage);
    
    // Append to UI
    appendChatMessage(noteId, newMessage);
    
    // Clear input
    input.value = '';
    
    // Demo: Staff auto-reply after 2s
    setTimeout(() => {
        const staffReply = {
            id: Date.now(),
            sender: 'Nguyễn Mai Anh',
            text: 'Dạ, chúng em đã nhận được tin nhắn của chủ. Bé vẫn đang rất khỏe mạnh ạ! 🐾',
            timestamp: new Date().toISOString(),
            isStaff: true
        };
        MOCK_CHAT_DATA[noteId].push(staffReply);
        appendChatMessage(noteId, staffReply);
    }, 2000);
}

/**
 * Append a chat message to container
 */
function appendChatMessage(noteId, message) {
    const container = document.getElementById(`chatMessages-${noteId}`);
    if (!container) return;
    
    const messageEl = document.createElement('div');
    messageEl.className = `chat-message ${message.isStaff ? 'chat-message-staff' : 'chat-message-customer'}`;
    messageEl.innerHTML = `
        <div class="chat-message-header">
            <span class="chat-sender-name">${escapeHtml(message.sender)}</span>
            <span class="chat-time">${formatTime(message.timestamp)}</span>
        </div>
        <div class="chat-text">${escapeHtml(message.text)}</div>
    `;
    
    container.appendChild(messageEl);
    
    // Auto-scroll to bottom with smooth animation
    container.scrollTo({
        top: container.scrollHeight,
        behavior: 'smooth'
    });
}

/**
 * Render history sidebar
 */
function renderHistorySidebar(historyData) {
    const container = document.getElementById('historyList');
    if (!container) return;
    
    container.innerHTML = historyData.map(item => `
        <div class="history-item ${item.active ? 'active' : ''}" data-service-id="${item.id}">
            <div class="history-date">${item.date}</div>
            <div class="history-service">${item.service}</div>
            <div class="history-status">${item.status === 'Đang thực hiện' ? '🟢' : '✅'} ${item.status}</div>
        </div>
    `).join('');
    
    // Bind click events
    container.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
            const serviceId = el.dataset.serviceId;
            loadServiceTimeline(serviceId);
            
            // Update active state
            container.querySelectorAll('.history-item').forEach(item => {
                item.classList.remove('active');
            });
            el.classList.add('active');
        });
    });
}

/**
 * Load service timeline
 */
function loadServiceTimeline(serviceId) {
    currentServiceId = serviceId;
    const service = MOCK_HISTORY_DATA.find(s => s.id === serviceId);
    
    if (service) {
        renderTimeline(service.timeline);
    } else {
        showToast('Không tìm thấy lịch sử dịch vụ', 'error');
    }
}

/**
 * Open live stream modal
 */
function openLiveStreamModal() {
    // TODO: Implement modal (keeping existing modal code if exists)
    showToast('Tính năng live-stream đang được phát triển', 'info');
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
 * Format time from ISO string
 */
function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
