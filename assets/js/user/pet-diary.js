/* ==========================================================================
   pet-diary.js — Pet Diary & Service Tracking (US 7-1, 7-2, 7-3)
   Data source: pawpal_pets + pawpal_tracker_logs in localStorage
   ========================================================================== */

import { getPets, getTrackerLogs, saveTrackerLogs, calcAge, fmtDate, showToast } from './pet-profile.js';

const DEMO_STAFF_PRIMARY = 'Nguyễn Thị Mai';
const DEMO_STAFF_RECEPTION = 'Trần Văn Nam';

let currentPetId = null;
let currentSessionId = null;

// ── Init ──────────────────────────────────────────────────────────────────────

export function initPetDiary() {
    populatePetSelector();

    const petSelector = document.getElementById('petSelector');
    if (petSelector) {
        petSelector.addEventListener('change', handlePetChange);
    }

    // Handle ?id= URL param
    const urlParams = new URLSearchParams(window.location.search);
    const petIdFromUrl = urlParams.get('id');
    if (petIdFromUrl && petSelector) {
        petSelector.value = petIdFromUrl;
        handlePetChange({ target: petSelector });
    }
}

// ── Pet Selector ──────────────────────────────────────────────────────────────

function populatePetSelector() {
    const selector = document.getElementById('petSelector');
    if (!selector) return;

    const pets = getPets().filter(p => !p.archived);

    while (selector.options.length > 1) selector.remove(1);

    pets.forEach(pet => {
        const option = document.createElement('option');
        option.value = pet.id;
        const label = [pet.name, pet.species, pet.breed ? `(${pet.breed})` : '']
            .filter(Boolean).join(' ');
        option.textContent = label;
        selector.appendChild(option);
    });
}

function handlePetChange(e) {
    const petId = e.target.value;
    const emptyState = document.getElementById('emptyState');
    const diaryContent = document.getElementById('diaryContent');

    if (!petId) {
        if (emptyState) emptyState.style.display = 'block';
        if (diaryContent) diaryContent.style.display = 'none';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (diaryContent) diaryContent.style.display = 'block';

    currentPetId = petId;
    loadPetDiary(petId);
}

// ── Load Diary ────────────────────────────────────────────────────────────────

function loadPetDiary(petId) {
    const pets = getPets();
    const pet = pets.find(p => p.id === petId);
    if (!pet) {
        showToast('Không tìm thấy thông tin bé cưng', 'error');
        return;
    }

    renderPetInfoCard(pet);

    const logs = getOrSeedTrackerLogs(pet);
    const { currentSession, history = [] } = logs;

    // Build session list for sidebar: current first, then history newest→oldest
    const allSessions = [];
    if (currentSession) allSessions.push({ ...currentSession, isCurrent: true });
    [...history].reverse().forEach(s => allSessions.push({ ...s, isCurrent: false }));
    renderHistorySidebar(allSessions);

    if (currentSession) {
        currentSessionId = currentSession.id;
        renderTimeline(currentSession.timeline);
    } else {
        currentSessionId = null;
        renderTimeline([]);
    }
}

// ── Tracker Logs ──────────────────────────────────────────────────────────────

function getOrSeedTrackerLogs(pet) {
    const allLogs = getTrackerLogs();
    if (allLogs[pet.id]) return allLogs[pet.id];

    const seeded = seedDemoLogs(pet);
    allLogs[pet.id] = seeded;
    saveTrackerLogs(allLogs);
    return seeded;
}

function seedDemoLogs(pet) {
    const now = new Date();
    const ago = (minutes) => new Date(now.getTime() - minutes * 60 * 1000).toISOString();

    const pastBase = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const pastDateStr = pastBase.toISOString().split('T')[0];
    const pastAgo = (minutes) => new Date(pastBase.getTime() - minutes * 60 * 1000).toISOString();

    return {
        currentSession: {
            id: `SVC-${pet.id}-002`,
            service: 'Spa & Grooming',
            date: now.toISOString().split('T')[0],
            status: 'Đang thực hiện',
            timeline: [
                {
                    id: 3,
                    status: 'Đang sấy lông',
                    timestamp: ago(10),
                    description: `${pet.name} đang được sấy lông với nhiệt độ phù hợp. Bé rất ngoan và hợp tác.`,
                    staff: DEMO_STAFF_PRIMARY,
                    type: 'in_progress'
                },
                {
                    id: 2,
                    status: 'Đang tắm',
                    timestamp: ago(45),
                    description: `${pet.name} đang được tắm sạch với sữa tắm chuyên dụng cho da nhạy cảm.`,
                    staff: DEMO_STAFF_PRIMARY,
                    type: 'in_progress'
                },
                {
                    id: 1,
                    status: 'Đã tiếp nhận',
                    timestamp: ago(60),
                    description: `${pet.name} đã được tiếp nhận tại PawPal. Mã hồ sơ: ${pet.id}. Chúng em sẽ bắt đầu quy trình ngay.`,
                    staff: DEMO_STAFF_RECEPTION,
                    type: 'check_in'
                }
            ],
            invoice: null
        },
        history: [
            {
                id: `SVC-${pet.id}-001`,
                service: 'Cắt tỉa lông',
                date: pastDateStr,
                status: 'Hoàn thành',
                timeline: [
                    {
                        id: 3,
                        status: 'Hoàn thành',
                        timestamp: pastAgo(30),
                        description: `${pet.name} đã hoàn thành dịch vụ cắt tỉa lông. Bé trông rất đẹp và sạch sẽ!`,
                        staff: DEMO_STAFF_PRIMARY,
                        type: 'completed',
                        invoice: {
                            code: `HD-${pet.id}-001`,
                            items: [{ name: 'Cắt tỉa lông tiêu chuẩn', price: 80000 }],
                            total: 80000,
                            paid: true
                        }
                    },
                    {
                        id: 2,
                        status: 'Đang cắt tỉa',
                        timestamp: pastAgo(90),
                        description: `Đang thực hiện cắt tỉa lông cho ${pet.name}.`,
                        staff: DEMO_STAFF_PRIMARY,
                        type: 'in_progress'
                    },
                    {
                        id: 1,
                        status: 'Đã tiếp nhận',
                        timestamp: pastAgo(120),
                        description: `${pet.name} đã được tiếp nhận. Mã hồ sơ: ${pet.id}.`,
                        staff: DEMO_STAFF_RECEPTION,
                        type: 'check_in'
                    }
                ],
                invoice: {
                    code: `HD-${pet.id}-001`,
                    items: [{ name: 'Cắt tỉa lông tiêu chuẩn', price: 80000 }],
                    total: 80000,
                    paid: true
                }
            }
        ]
    };
}

// ── Render: Pet Info Card ─────────────────────────────────────────────────────

function renderPetInfoCard(pet) {
    const container = document.getElementById('petInfoCard');
    if (!container) return;

    const age = calcAge(pet.birthday);

    const avatarHtml = pet.photo
        ? `<img src="${pet.photo}" alt="${escapeHtml(pet.name)}" class="pet-info-avatar">`
        : `<div class="pet-info-avatar-placeholder">
               <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                   <circle cx="12" cy="8" r="4"/>
                   <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
               </svg>
           </div>`;

    container.innerHTML = `
        ${avatarHtml}
        <div class="pet-info-details">
            <h4>${escapeHtml(pet.name)}</h4>
            <div class="pet-info-meta">
                <span>
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
                    </svg>
                    ${escapeHtml(pet.id)}
                </span>
                ${pet.species ? `<span>${escapeHtml(pet.species)}</span>` : ''}
                ${pet.breed ? `<span>${escapeHtml(pet.breed)}</span>` : ''}
                ${pet.weight ? `<span>${escapeHtml(String(pet.weight))} kg</span>` : ''}
                ${age ? `<span>${escapeHtml(age)}</span>` : ''}
            </div>
        </div>
    `;
}

// ── Render: Timeline ──────────────────────────────────────────────────────────

function renderTimeline(timeline) {
    const wrapper = document.getElementById('timelineWrapper');
    const emptyTimeline = document.getElementById('emptyTimeline');
    if (!wrapper) return;

    if (!timeline || timeline.length === 0) {
        wrapper.innerHTML = '';
        if (emptyTimeline) emptyTimeline.style.display = 'block';
        return;
    }

    if (emptyTimeline) emptyTimeline.style.display = 'none';

    // Sort newest-to-oldest (AC3.2.1)
    const sorted = [...timeline].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    wrapper.innerHTML = sorted.map(item => buildTimelineItemHtml(item)).join('');

    sorted.forEach(item => {
        if (item.urgent || item.type === 'urgent') {
            loadChatMessages(item.id);
            bindChatInputEvents(item.id);
        }
    });
}

function buildTimelineItemHtml(item) {
    const isUrgent = item.urgent || item.type === 'urgent';
    const isCompleted = item.type === 'completed';
    const timeStr = formatTimestamp(item.timestamp);

    return `
        <div class="timeline-item ${isUrgent ? 'timeline-item-urgent' : ''}">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
                ${isUrgent ? `
                <div class="timeline-urgent-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    GHI CHÚ KHẨN
                </div>` : ''}
                <div class="timeline-time">${timeStr}</div>
                <h4 class="timeline-status">${escapeHtml(item.status)}</h4>
                <p class="timeline-description">${escapeHtml(item.description)}</p>
                <div class="timeline-staff">
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                    </svg>
                    <span>${escapeHtml(item.staff)}</span>
                </div>
                ${isUrgent ? buildChatBoxHtml(item.id) : ''}
                ${isCompleted && item.invoice ? buildInvoiceBlockHtml(item.invoice) : ''}
            </div>
        </div>
    `;
}

// ── Chat Box ──────────────────────────────────────────────────────────────────

function buildChatBoxHtml(noteId) {
    return `
        <div class="urgent-chat-box" id="chatBox-${noteId}">
            <div class="chat-box-header">
                <h4 class="chat-box-title">Trò chuyện với nhân viên</h4>
            </div>
            <div class="chat-messages-container" id="chatMessages-${noteId}"></div>
            <div class="chat-input-group">
                <input type="text" class="chat-input" id="chatInput-${noteId}"
                    placeholder="Nhập tin nhắn..." maxlength="500" aria-label="Tin nhắn" />
                <button class="btn-send-message" id="btnSend-${noteId}">Gửi</button>
            </div>
        </div>
    `;
}

function buildChatMessageHtml(msg) {
    return `
        <div class="chat-message ${msg.isStaff ? 'chat-message-staff' : 'chat-message-customer'}">
            <div class="chat-message-header">
                <span class="chat-sender-name">${escapeHtml(msg.sender)}</span>
                <span class="chat-time">${formatTimestamp(msg.timestamp, 'time-only')}</span>
            </div>
            <div class="chat-text">${escapeHtml(msg.text)}</div>
        </div>
    `;
}

function loadChatMessages(noteId) {
    const container = document.getElementById(`chatMessages-${noteId}`);
    if (!container || !currentPetId) return;

    const allLogs = getTrackerLogs();
    const messages = allLogs[currentPetId]?.chatMessages?.[noteId] || [];

    container.innerHTML = messages.map(msg => buildChatMessageHtml(msg)).join('');
    container.scrollTop = container.scrollHeight;
}

function bindChatInputEvents(noteId) {
    const input = document.getElementById(`chatInput-${noteId}`);
    const btnSend = document.getElementById(`btnSend-${noteId}`);
    if (!input || !btnSend) return;

    btnSend.addEventListener('click', () => sendChatMessage(noteId));
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); sendChatMessage(noteId); }
    });
}

function sendChatMessage(noteId) {
    const input = document.getElementById(`chatInput-${noteId}`);
    if (!input || !currentPetId) return;

    const text = input.value.trim();
    if (!text) return;

    const newMsg = {
        id: Date.now(),
        sender: 'Bạn',
        text,
        timestamp: new Date().toISOString(),
        isStaff: false
    };

    const allLogs = getTrackerLogs();
    if (!allLogs[currentPetId]) return;
    if (!allLogs[currentPetId].chatMessages) allLogs[currentPetId].chatMessages = {};
    if (!allLogs[currentPetId].chatMessages[noteId]) allLogs[currentPetId].chatMessages[noteId] = [];
    allLogs[currentPetId].chatMessages[noteId].push(newMsg);
    saveTrackerLogs(allLogs);

    appendChatMessage(noteId, newMsg);
    input.value = '';

    // Demo auto-reply after 2s
    setTimeout(() => {
        const reply = {
            id: Date.now(),
            sender: DEMO_STAFF_PRIMARY,
            text: 'Dạ, chúng em đã nhận được tin nhắn của chủ. Bé vẫn đang rất khỏe mạnh ạ!',
            timestamp: new Date().toISOString(),
            isStaff: true
        };
        const logsNow = getTrackerLogs();
        if (logsNow[currentPetId]?.chatMessages?.[noteId]) {
            logsNow[currentPetId].chatMessages[noteId].push(reply);
            saveTrackerLogs(logsNow);
        }
        appendChatMessage(noteId, reply);
    }, 2000);
}

function appendChatMessage(noteId, msg) {
    const container = document.getElementById(`chatMessages-${noteId}`);
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildChatMessageHtml(msg);
    container.appendChild(wrapper.firstElementChild);
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

// ── Invoice Block ─────────────────────────────────────────────────────────────

function buildInvoiceBlockHtml(invoice) {
    return `
        <div class="timeline-invoice-block">
            <div class="invoice-header">
                <h4 class="invoice-title">Hóa đơn dịch vụ</h4>
                <span class="invoice-code">${escapeHtml(invoice.code)}</span>
            </div>
            <div class="invoice-items">
                ${invoice.items.map(item => `
                    <div class="invoice-item">
                        <span class="invoice-item-name">${escapeHtml(item.name)}</span>
                        <span class="invoice-item-price">${formatCurrency(item.price)}</span>
                    </div>
                `).join('')}
            </div>
            <div class="invoice-total">
                <span class="invoice-total-label">Tổng thanh toán:</span>
                <span class="invoice-total-amount">${formatCurrency(invoice.total)}</span>
            </div>
            <div class="invoice-status-badge ${invoice.paid ? 'invoice-paid' : 'invoice-unpaid'}">
                ${invoice.paid ? 'Đã thanh toán' : 'Chưa thanh toán'}
            </div>
        </div>
    `;
}

// ── Render: History Sidebar ───────────────────────────────────────────────────

function renderHistorySidebar(sessions) {
    const container = document.getElementById('historyList');
    if (!container) return;

    if (!sessions || sessions.length === 0) {
        container.innerHTML = '<p class="history-empty">Chưa có lịch sử dịch vụ</p>';
        return;
    }

    container.innerHTML = sessions.map(session => {
        const isActive = session.status === 'Đang thực hiện';
        return `
            <div class="history-item ${session.isCurrent ? 'active' : ''}" data-session-id="${session.id}">
                <div class="history-date">${formatDate(session.date)}</div>
                <div class="history-service">${escapeHtml(session.service)}</div>
                <div class="history-status ${isActive ? 'status-active' : 'status-done'}">${escapeHtml(session.status)}</div>
            </div>
        `;
    }).join('');

    container.querySelectorAll('.history-item').forEach(el => {
        el.addEventListener('click', () => {
            switchSession(el.dataset.sessionId);
            container.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
            el.classList.add('active');
        });
    });
}

function switchSession(sessionId) {
    if (!currentPetId) return;

    const allLogs = getTrackerLogs();
    const petLogs = allLogs[currentPetId];
    if (!petLogs) return;

    let session = null;
    if (petLogs.currentSession?.id === sessionId) {
        session = petLogs.currentSession;
    } else if (petLogs.history) {
        session = petLogs.history.find(s => s.id === sessionId);
    }

    if (!session) {
        showToast('Không tìm thấy dữ liệu phiên dịch vụ', 'error');
        return;
    }

    currentSessionId = session.id;
    renderTimeline(session.timeline);

}

// ── Utilities ─────────────────────────────────────────────────────────────────

function formatTimestamp(isoStr, mode = 'full') {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    if (mode === 'time-only') return time;
    const date = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time} — ${date}`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    return fmtDate(dateStr);
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = String(text ?? '');
    return div.innerHTML;
}
