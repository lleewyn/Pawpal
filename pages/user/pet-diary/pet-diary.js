/* ==========================================================================
   pet-diary.js — Pet Diary & Service Tracking (ĐÃ SỬA)
   ========================================================================== */

import { getTrackerLogs, saveTrackerLogs, calcAge, fmtDate, showToast } from '../pet-profile/pet-profile.js';
import { getPets } from '/assets/js/api/petService.js';

const DEMO_STAFF_PRIMARY = 'Nguyễn Thị Mai';
const DEMO_STAFF_RECEPTION = 'Trần Văn Nam';
const TIMELINE_FALLBACK_IMAGES = {
    dry: '/assets/images/tracker/belu-1.png',
    bath: '/assets/images/tracker/belu-2.png',
    receive: '/assets/images/tracker/belu-3.png',
    trim: '/assets/images/services/spa/gallery/cust_khach_1_dang_chai_long.jpg',
    complete: '/assets/images/services/spa/gallery/cust_khach_1_dang_nghi_ngoi.jpg',
    default: '/assets/images/services/spa/gallery/cust_khach_1_dang_tam.jpg'
};

let currentPetId = null;
let currentSessionId = null;

// ── Init ──────────────────────────────────────────────────────────────────────
export function initPetDiary() {
    localStorage.removeItem('pawpal_tracker_db');
    localStorage.removeItem('pawpal_pet_tracker_logs');
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
    } else if (petSelector && petSelector.value) {
        handlePetChange({ target: petSelector });
    } else {
        if (typeof renderActiveServicesDashboard === 'function') {
            renderActiveServicesDashboard();
        }
    }
}

// ── Pet Selector ──────────────────────────────────────────────────────────────
async function populatePetSelector() {
    const selector = document.getElementById('petSelector');
    if (!selector) return;

    const pets = (await getPets()).filter((pet) => !pet.isArchived);

    while (selector.options.length > 1) selector.remove(1);

    pets.forEach(pet => {
        const option = document.createElement('option');
        option.value = pet.id;
        
        const speciesName = getSpeciesDisplay(pet);
        const label = `${pet.name} - ${speciesName}${pet.breed ? ` (${pet.breed})` : ''}`;
        
        option.textContent = label;
        selector.appendChild(option);
    });
}

function getSpeciesDisplay(pet) {
    if (!pet) return 'Thú cưng';
    if (pet.species === 'other' && pet.otherSpecies && pet.otherSpecies.trim() !== '') {
        return pet.otherSpecies.trim();
    }
    const map = { dog: 'Chó', cat: 'Mèo', rabbit: 'Thỏ' };
    return map[pet.species] || 'Thú cưng';
}

// ── Handle Pet Change ─────────────────────────────────────────────────────────
function handlePetChange(e) {
    const petId = e.target.value;
    const emptyState = document.getElementById('emptyState');
    const diaryContent = document.getElementById('diaryContent');

    if (!petId) {
        const dashboardState = document.getElementById('dashboardState');
        if (dashboardState) dashboardState.style.display = 'block';
        if (typeof renderActiveServicesDashboard === 'function') {
            renderActiveServicesDashboard();
        }
        if (diaryContent) diaryContent.style.display = 'none';
        return;
    }

    const dashboardState = document.getElementById('dashboardState');
    if (dashboardState) dashboardState.style.display = 'none';
    if (emptyState) emptyState.style.display = 'none';
    if (diaryContent) diaryContent.style.display = 'block';

    currentPetId = petId;
    loadPetDiary(petId);
}

// ── Load Diary ────────────────────────────────────────────────────────────────
async function loadPetDiary(petId) {
    const pets = await getPets();
    const pet = pets.find(p => String(p.id) === String(petId));
    if (!pet) {
        showToast('Không tìm thấy thông tin bé cưng', 'error');
        return;
    }

    renderPetInfoCard(pet);

    const logs = getOrSeedTrackerLogs(pet);
    const { currentSession, history = [] } = logs;

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

function readPetDiarySeed() {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '/data/pet-diary-seed.json', false);
        xhr.send(null);
        if (xhr.status >= 200 && xhr.status < 300) {
            return JSON.parse(xhr.responseText);
        }
    } catch (error) {
        console.warn('[pet-diary] Cannot load seed data:', error);
    }
    return null;
}

function replaceTokens(value, pet) {
    if (typeof value === 'string') {
        return value.replace(/\{petName\}/g, pet.name).replace(/\{petId\}/g, pet.id);
    }
    if (Array.isArray(value)) {
        return value.map(item => replaceTokens(item, pet));
    }
    if (value && typeof value === 'object') {
        const next = {};
        Object.entries(value).forEach(([key, child]) => {
            next[key] = replaceTokens(child, pet);
        });
        return next;
    }
    return value;
}

function seedDemoLogs(pet) {
    const seed = readPetDiarySeed();
    if (!seed) return { currentSession: null, history: [] };

    const now = new Date();
    const currentSession = {
        id: `SVC-${pet.id}-002`,
        service: seed.currentSession.service,
        date: now.toISOString().split('T')[0],
        status: seed.currentSession.status,
        timeline: (seed.currentSession.timeline || []).map(item => ({
            ...replaceTokens(item, pet),
            timestamp: new Date(now.getTime() - Number(item.offsetMinutes || 0) * 60000).toISOString()
        })),
        invoice: null
    };

    const history = (seed.history || []).map(entry => {
        const baseDate = new Date(now.getTime() - Number(entry.daysAgo || 0) * 86400000);
        return {
            id: `SVC-${pet.id}-${entry.idSuffix || '000'}`,
            service: entry.service,
            date: baseDate.toISOString().split('T')[0],
            status: entry.status,
            timeline: (entry.timeline || []).map(item => ({
                ...replaceTokens(item, pet),
                timestamp: new Date(baseDate.getTime() - Number(item.offsetMinutes || 0) * 60000).toISOString()
            })),
            invoice: entry.invoice ? replaceTokens(entry.invoice, pet) : null
        };
    });

    return { currentSession, history };
}

// ── Render: Pet Info Card (ĐÃ SỬA) ───────────────────────────────────────────
function renderPetInfoCard(pet) {
    const container = document.getElementById('petInfoCard');
    if (!container) return;

    const age = calcAge(pet.dob);

    const avatarHtml = pet.avatar
        ? `<img src="${pet.avatar}" alt="${pet.name}" class="pet-info-avatar">`
        : `<div class="pet-info-avatar-placeholder">
               <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                   <circle cx="12" cy="8" r="4"/>
                   <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
               </svg>
           </div>`;

    container.innerHTML = `
        ${avatarHtml}
        <div class="pet-info-details">
            <h4>${pet.name}</h4>
            <div class="pet-info-meta">
                <span>${pet.id}</span>
                <span>${getSpeciesDisplay(pet)}</span>
                ${pet.breed ? `<span>${pet.breed}</span>` : ''}
                ${pet.weight ? `<span>${pet.weight} kg</span>` : ''}
                ${age ? `<span>${age}</span>` : ''}
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
        if (emptyTimeline) emptyTimeline.classList.remove('d-none');
        return;
    }

    if (emptyTimeline) emptyTimeline.classList.add('d-none');

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
    const imageUrl = resolveTimelineImageUrl(item);

    return `
        <div class="timeline-item ${isUrgent ? 'timeline-item-urgent' : ''}">
            <div class="timeline-dot"></div>
            <div class="timeline-content timeline-content-with-image">
                <div class="timeline-item-main">
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
                ${imageUrl ? `
                <div class="timeline-photo">
                    <img src="${imageUrl}" alt="${escapeHtml(item.status)}" class="timeline-item-image" />
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

function resolveTimelineImageUrl(item) {
    if (!item || typeof item !== 'object') return '';

    const candidates = [
        item.image,
        item.photo,
        item.imageUrl,
        item.photoUrl,
        item.imageSrc,
        item.photoSrc,
        item.thumbnail,
        item.thumbnailUrl,
        item.src,
        item.url,
        item.media?.[0]?.src,
        item.media?.[0]?.image,
        item.media?.[0]?.photo,
        item.media?.[0]?.url,
        item.image?.src,
        item.photo?.src,
        item.image?.url,
        item.photo?.url,
        item.media?.src,
        item.media?.image,
        item.media?.photo,
        item.media?.url
    ];

    const rawImage = candidates.find(value => typeof value === 'string' && value.trim() !== '')
        || getTimelineFallbackImage(item);

    try {
        const url = new URL(rawImage, window.location.href);
        return url.href;
    } catch (err) {
        return rawImage;
    }
}

function getTimelineFallbackImage(item) {
    const status = `${item.status || ''} ${item.description || ''}`.toLowerCase();

    if (status.includes('sấy')) return TIMELINE_FALLBACK_IMAGES.dry;
    if (status.includes('tắm')) return TIMELINE_FALLBACK_IMAGES.bath;
    if (status.includes('tiếp nhận')) return TIMELINE_FALLBACK_IMAGES.receive;
    if (status.includes('cắt') || status.includes('tỉa') || status.includes('chải')) {
        return TIMELINE_FALLBACK_IMAGES.trim;
    }
    if (status.includes('hoàn thành')) return TIMELINE_FALLBACK_IMAGES.complete;

    return TIMELINE_FALLBACK_IMAGES.default;
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


async function renderActiveServicesDashboard() {
    const dashboardState = document.getElementById('dashboardState');
    const emptyState = document.getElementById('emptyState');
    const activeContainer = document.getElementById('activeServicesContainer');
    const grid = document.getElementById('activeServicesGrid');
    const template = document.getElementById('activeServiceCardTemplate');

    if (!dashboardState || !emptyState || !activeContainer || !grid || !template) return;

    const pets = (await getPets()).filter((pet) => !pet.isArchived);
    const activeSessions = [];

    pets.forEach(pet => {
        const logs = getOrSeedTrackerLogs(pet);
        if (logs && logs.currentSession) {
            activeSessions.push({ pet, session: logs.currentSession });
        }
    });

    if (activeSessions.length === 0) {
        dashboardState.style.display = 'block';
        emptyState.style.display = 'block';
        activeContainer.style.display = 'none';
        return;
    }

    // Has active services
    dashboardState.style.display = 'block';
    emptyState.style.display = 'none';
    activeContainer.style.display = 'block';
    grid.innerHTML = '';

    activeSessions.forEach(item => {
        const latestEvent = item.session.timeline && item.session.timeline.length > 0 ? item.session.timeline[0] : null;
        const statusText = latestEvent ? latestEvent.status : item.session.status;
        const petImage = item.pet.avatar || '/assets/images/shared/default-pet.png';

        const clone = template.content.cloneNode(true);
        
        const img = clone.querySelector('.active-service-avatar');
        img.src = petImage;
        img.alt = item.pet.name;

        clone.querySelector('.active-service-name').textContent = item.pet.name;
        clone.querySelector('.active-service-type').textContent = item.session.service;
        clone.querySelector('.active-service-badge').textContent = statusText;

        const btn = clone.querySelector('.active-service-btn');
        btn.addEventListener('click', () => {
            const selector = document.getElementById('petSelector');
            if (selector) {
                selector.value = item.pet.id;
                selector.dispatchEvent(new Event('change'));
            }
        });

        grid.appendChild(clone);
    });
}
