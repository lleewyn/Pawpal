/**
 * modules/diary/diary.js - Module Nhật ký chăm sóc PawPal
 * Đồng bộ đa tầng: Supabase -> Admin Bookings -> Care Logs -> Seed Fallback
 */
import { getPets } from '/scripts/api/petService.js?v=20261001-dedup';

const TRACKER_LOGS_KEY = 'pawpal_pet_tracker_logs';

let careLogsCache = null;
let petSeedCache = null;
let currentPetId = null;
let currentSessionId = null;
let isHashListenerAttached = false;

const DEMO_STAFF_PRIMARY = 'Nguyễn Thị Mai';
const DEMO_STAFF_RECEPTION = 'Trần Văn Nam';

const TIMELINE_FALLBACK_IMAGES = {
    dry: '/assets/images/publics/dogcute3.jpg',
    bath: '/assets/images/publics/dogcute6.jpg',
    receive: '/assets/images/publics/catcute5.jpg',
    trim: '/assets/images/publics/catcute8.jpg',
    complete: '/assets/images/publics/dogcute8.jpg',
    default: '/assets/images/publics/pet3.jpg'
};

/* ==========================================================================
   1. TIỆN ÍCH DỮ LIỆU & STORAGE
   ========================================================================== */

function getTrackerLogs() {
    try {
        const raw = localStorage.getItem(TRACKER_LOGS_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch {
        return {};
    }
}

function saveTrackerLogs(logs) {
    try {
        localStorage.setItem(TRACKER_LOGS_KEY, JSON.stringify(logs));
    } catch (e) {
        console.error('saveTrackerLogs error:', e);
    }
}

async function fetchJsonSafely(url) {
    try {
        const res = await fetch(url + '?v=' + Date.now());
        if (res.ok) {
            return await res.json();
        }
    } catch (e) {
        console.warn(`[diary] fetch ${url} failed:`, e);
    }
    return null;
}

function getRouteParam(paramName) {
    // 1. Kiểm tra search params (?id=...)
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.has(paramName)) return searchParams.get(paramName);

    // 2. Kiểm tra hash query (#diary?id=...)
    const hash = window.location.hash || '';
    if (hash.includes('?')) {
        const hashQuery = hash.substring(hash.indexOf('?') + 1);
        const hashParams = new URLSearchParams(hashQuery);
        if (hashParams.has(paramName)) return hashParams.get(paramName);
    }
    return null;
}

function calcAge(birthday) {
    if (!birthday) return 'Chưa biết';
    const birth = new Date(birthday);
    const now = new Date();
    if (isNaN(birth.getTime())) return 'Chưa biết';
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 0) return 'Chưa biết';
    if (months < 12) return months + ' tháng';
    const years = Math.floor(months / 12);
    const remainMonths = months % 12;
    return remainMonths > 0 ? (years + ' tuổi ' + remainMonths + ' tháng') : (years + ' tuổi');
}

function fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function showToast(msg, type = 'success') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container-custom';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'toast toast-' + type;
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

function getSpeciesDisplay(pet) {
    if (!pet) return 'Thú cưng';
    if (pet.species === 'other' && pet.otherSpecies && pet.otherSpecies.trim() !== '') {
        return pet.otherSpecies.trim();
    }
    const map = { dog: 'Chó', cat: 'Mèo', rabbit: 'Thỏ' };
    return map[pet.species] || 'Thú cưng';
}

function formatWeightDisplay(weightVal) {
    if (!weightVal) return '';
    const num = parseFloat(weightVal);
    if (!isNaN(num) && num > 0) return `${num} kg`;
    const cleaned = String(weightVal).replace(/\s*kg$/i, '').trim();
    return cleaned ? `${cleaned} kg` : '';
}

/* ==========================================================================
   2. KHỞI TẠO MODULE & ĐIỀU HƯỚNG
   ========================================================================== */

export async function initPetDiary() {
    await populatePetSelector();

    const petSelector = document.getElementById('petSelector');
    if (petSelector) {
        petSelector.removeEventListener('change', handlePetChange);
        petSelector.addEventListener('change', handlePetChange);
    }

    if (!isHashListenerAttached) {
        isHashListenerAttached = true;
        window.addEventListener('hashchange', async () => {
            if (window.location.hash.includes('diary')) {
                const targetPetId = getRouteParam('id') || getRouteParam('pet') || getRouteParam('petId');
                if (targetPetId && targetPetId !== currentPetId) {
                    await selectAndLoadPet(targetPetId);
                }
            }
        });
    }

    const petIdFromUrl = getRouteParam('id') || getRouteParam('pet') || getRouteParam('petId');
    const sessionIdFromUrl = getRouteParam('sessionId') || getRouteParam('session');

    if (petIdFromUrl) {
        await selectAndLoadPet(petIdFromUrl);
        if (sessionIdFromUrl) {
            await openSessionFromUrlOrFallback(sessionIdFromUrl);
        }
    } else if (petSelector && petSelector.value) {
        await selectAndLoadPet(petSelector.value);
    } else {
        await renderActiveServicesDashboard();
    }
}

async function populatePetSelector() {
    const selector = document.getElementById('petSelector');
    if (!selector) return;

    const pets = (await getPets()).filter((pet) => !pet.isArchived);

    while (selector.options.length > 1) selector.remove(1);

    pets.forEach(pet => {
        const option = document.createElement('option');
        option.value = String(pet.id);
        
        const speciesName = getSpeciesDisplay(pet);
        const label = `${pet.name} - ${speciesName}${pet.breed ? ` (${pet.breed})` : ''}`;
        
        option.textContent = label;
        selector.appendChild(option);
    });
}

async function handlePetChange(e) {
    const petId = e.target.value;
    await selectAndLoadPet(petId);
}

async function selectAndLoadPet(petId) {
    const emptyState = document.getElementById('emptyState');
    const diaryContent = document.getElementById('diaryContent');
    const dashboardState = document.getElementById('dashboardState');

    if (!petId) {
        currentPetId = null;
        if (dashboardState) dashboardState.classList.remove('d-none');
        if (diaryContent) diaryContent.classList.add('d-none');
        await renderActiveServicesDashboard();
        return;
    }

    const pets = await getPets();
    const pet = pets.find(p => 
        String(p.id).toLowerCase() === String(petId).toLowerCase() ||
        String(p.name).toLowerCase() === String(petId).toLowerCase()
    );

    const petSelector = document.getElementById('petSelector');
    if (petSelector) {
        let matchedOption = Array.from(petSelector.options).find(opt => 
            opt.value.toLowerCase() === String(petId).toLowerCase() ||
            (pet && opt.value.toLowerCase() === String(pet.id).toLowerCase())
        );

        if (!matchedOption && pet) {
            matchedOption = document.createElement('option');
            matchedOption.value = String(pet.id);
            const speciesName = getSpeciesDisplay(pet);
            matchedOption.textContent = `${pet.name} - ${speciesName}${pet.breed ? ` (${pet.breed})` : ''}`;
            petSelector.appendChild(matchedOption);
        }

        if (matchedOption) {
            petSelector.value = matchedOption.value;
        }
    }

    if (dashboardState) dashboardState.classList.add('d-none');
    if (emptyState) emptyState.classList.add('d-none');
    if (diaryContent) diaryContent.classList.remove('d-none');

    currentPetId = pet ? pet.id : petId;
    await loadPetDiary(currentPetId);
}

/* ==========================================================================
   3. TẢI VÀ ĐỒNG BỘ DỮ LIỆU NHẬT KÝ (MULTI-SOURCE SYNC)
   ========================================================================== */

async function loadPetDiary(petId) {
    const pets = await getPets();
    const pet = pets.find(p => String(p.id) === String(petId));
    if (!pet) {
        showToast('Không tìm thấy thông tin bé cưng', 'error');
        return;
    }

    renderPetInfoCard(pet);

    // 1. Thử đồng bộ từ Supabase nếu có client
    let logs = null;
    if (window.SupabaseClient) {
        logs = await syncPetDiaryFromSupabase(pet);
    }
    
    // 2. Nếu chưa có, lấy từ Admin Services Bookings hoặc care-logs.json hoặc seed fallback
    if (!logs) {
        logs = await getOrSeedTrackerLogs(pet);
    } else {
        const localLogs = getTrackerLogs()[pet.id] || {};
        logs.chatMessages = localLogs.chatMessages || {};
        
        const allLogs = getTrackerLogs();
        allLogs[pet.id] = logs;
        saveTrackerLogs(allLogs);
    }

    const { currentSession, history = [] } = logs;

    const allSessions = [];
    if (currentSession) allSessions.push({ ...currentSession, isCurrent: true });
    [...history].reverse().forEach(s => allSessions.push({ ...s, isCurrent: false }));

    renderHistorySidebar(allSessions);

    if (currentSession) {
        currentSessionId = currentSession.id;
        renderTimeline(currentSession.timeline);
    } else if (history.length > 0) {
        currentSessionId = history[0].id;
        renderTimeline(history[0].timeline);
    } else {
        currentSessionId = null;
        renderTimeline([]);
    }
}

async function syncPetDiaryFromSupabase(pet) {
    const db = window.SupabaseClient;
    if (!db) return null;

    try {
        const petUuid = pet._supabaseId || pet.id;
        
        const { data, error } = await db.from('care_log')
            .select(`
                id,
                appointment_id,
                description,
                health_status,
                recorded_at,
                care_action ( action_name ),
                appointment ( appointment_code, appointment_date, appointment_status, service (service_name) ),
                care_log_media ( media_url, Staff ( full_name ) )
            `)
            .eq('pet_id', petUuid)
            .order('recorded_at', { ascending: false });

        if (error) {
            console.error('[PetDiary] Supabase error:', error.message);
            return null;
        }

        if (!data || data.length === 0) return null;

        const sessionsMap = {};

        for (const log of data) {
            const aptId = log.appointment_id || 'no-appointment';
            if (!sessionsMap[aptId]) {
                sessionsMap[aptId] = {
                    id: log.appointment?.appointment_code || aptId,
                    service: log.appointment?.service?.service_name || 'Dịch vụ',
                    date: log.appointment?.appointment_date || log.recorded_at.split('T')[0],
                    status: mapAppointmentStatus(log.appointment?.appointment_status),
                    timeline: [],
                    invoice: null
                };
            }

            const mediaUrl = log.care_log_media?.[0]?.media_url || null;
            const staffName = log.care_log_media?.[0]?.Staff?.full_name || 'Nhân viên PawPal';

            sessionsMap[aptId].timeline.push({
                id: log.id,
                status: log.care_action?.action_name || 'Cập nhật',
                description: log.description,
                timestamp: log.recorded_at,
                staff: staffName,
                image: mediaUrl,
                urgent: log.health_status !== 'Tốt' && log.health_status !== 'Bình thường'
            });
        }

        const sessions = Object.values(sessionsMap).sort((a, b) => new Date(b.date) - new Date(a.date));
        if (sessions.length === 0) return null;

        let currentSession = null;
        let history = [];

        for (const session of sessions) {
            const isFinished = session.status === 'Hoàn thành' || session.status === 'Đã hủy';
            if (!currentSession && !isFinished) {
                currentSession = session;
            } else {
                history.push(session);
            }
        }

        return { currentSession, history, _source: 'supabase' };

    } catch (err) {
        console.warn('[PetDiary] Supabase sync error:', err.message);
        return null;
    }
}

function mapAppointmentStatus(status) {
    const map = {
        'PENDING': 'Chờ xác nhận',
        'CONFIRMED': 'Đã xác nhận',
        'COMPLETED': 'Hoàn thành',
        'CANCELLED': 'Đã hủy',
        'NO_SHOW': 'Đã hủy',
        'IN_PROGRESS': 'Đang thực hiện'
    };
    return map[status] || status || 'Đang thực hiện';
}

function getAdminBookings() {
    try {
        const raw = sessionStorage.getItem('pawpal_admin_services_bookings') || localStorage.getItem('pawpal_admin_services_bookings');
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function syncAdminBookingToSession(booking, pet) {
    if (!booking) return null;
    const timeline = (booking.timeline || []).map((t, idx) => {
        const timeStr = t.time || '10:00';
        const dateStr = booking.date || new Date().toISOString().split('T')[0];
        const isUrgent = Boolean(t.desc && (t.desc.toLowerCase().includes('dị ứng') || t.desc.toLowerCase().includes('khẩn') || t.desc.toLowerCase().includes('lưu ý')));
        return {
            id: `TL-${booking.id}-${idx}`,
            status: t.title || 'Tiến trình chăm sóc',
            description: t.desc || '',
            timestamp: `${dateStr}T${timeStr.length === 5 ? timeStr + ':00' : timeStr}`,
            staff: t.staff || booking.staff || DEMO_STAFF_PRIMARY,
            image: (t.images && t.images[0]) || null,
            urgent: isUrgent,
            type: t.done ? (idx === (booking.timeline.length - 1) && booking.status === 'completed' ? 'completed' : 'in_progress') : 'in_progress'
        };
    });

    let invoice = null;
    if (booking.price || booking.total) {
        invoice = {
            code: `HD-${booking.id}`,
            items: [
                { name: booking.serviceName || 'Dịch vụ chăm sóc', price: booking.price || booking.total || 0 }
            ],
            total: booking.total || booking.price || 0,
            paid: String(booking.paymentStatus || '').toLowerCase().includes('đã thanh toán')
        };
    }

    return {
        id: booking.id,
        service: booking.serviceName || 'Spa & Grooming',
        date: booking.date || new Date().toISOString().split('T')[0],
        status: booking.status === 'completed' ? 'Hoàn thành' : (booking.status === 'cancelled' ? 'Đã hủy' : 'Đang thực hiện'),
        timeline,
        invoice
    };
}

async function getOrSeedTrackerLogs(pet) {
    const allLogs = getTrackerLogs();
    
    // Kiểm tra xem Admin Bookings có ca mới nhất không
    const adminBookings = getAdminBookings();
    const petBookings = adminBookings.filter(b => 
        String(b.petId) === String(pet.id) || 
        String(b.petName || '').toLowerCase() === String(pet.name || '').toLowerCase()
    );

    // Ưu tiên 1: Đọc từ data/care-logs.json
    if (!careLogsCache) {
        careLogsCache = await fetchJsonSafely('/data/care-logs.json');
    }

    let baseData = null;
    if (careLogsCache && careLogsCache[pet.id]) {
        baseData = JSON.parse(JSON.stringify(careLogsCache[pet.id]));
    } else if (allLogs[pet.id]) {
        baseData = allLogs[pet.id];
    } else {
        // Ưu tiên 2: Fallback template với token substitution
        if (!petSeedCache) {
            petSeedCache = await fetchJsonSafely('/data/pet-diary-seed.json');
        }
        baseData = seedDemoLogs(pet, petSeedCache);
    }

    // Gộp ca thực tế từ Admin Services nếu có
    if (petBookings.length > 0) {
        const activeBooking = petBookings.find(b => b.status === 'in_progress' || b.status === 'confirmed');
        if (activeBooking && activeBooking.timeline && activeBooking.timeline.length > 0) {
            baseData.currentSession = syncAdminBookingToSession(activeBooking, pet);
        }

        const completedBookings = petBookings.filter(b => b.status === 'completed');
        completedBookings.forEach(cb => {
            const converted = syncAdminBookingToSession(cb, pet);
            if (converted && !baseData.history.some(h => h.id === converted.id)) {
                baseData.history.unshift(converted);
            }
        });
    }

    // Bảo tồn tin nhắn chat cũ
    if (allLogs[pet.id]?.chatMessages) {
        baseData.chatMessages = allLogs[pet.id].chatMessages;
    } else if (!baseData.chatMessages) {
        baseData.chatMessages = {};
    }

    allLogs[pet.id] = baseData;
    saveTrackerLogs(allLogs);
    return baseData;
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

function seedDemoLogs(pet, seed) {
    if (!seed) return { currentSession: null, history: [] };

    const now = new Date();
    const currentSession = seed.currentSession ? {
        id: `SVC-${pet.id}-002`,
        service: seed.currentSession.service,
        date: now.toISOString().split('T')[0],
        status: seed.currentSession.status,
        timeline: (seed.currentSession.timeline || []).map(item => ({
            ...replaceTokens(item, pet),
            timestamp: new Date(now.getTime() - Number(item.offsetMinutes || 0) * 60000).toISOString()
        })),
        invoice: null
    } : null;

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

    return { currentSession, history, chatMessages: {} };
}

/* ==========================================================================
   4. RENDER GIAO DIỆN HỒ SƠ & DÒNG THỜI GIAN
   ========================================================================== */

function renderPetInfoCard(pet) {
    const container = document.getElementById('petInfoCard');
    if (!container) return;

    const age = calcAge(pet.dob);
    const weightText = formatWeightDisplay(pet.weight || pet.weightNum);

    const avatarHtml = pet.avatar
        ? `<img src="${pet.avatar}" alt="${escapeHtml(pet.name)}" class="pet-info-avatar">`
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
                <span>${escapeHtml(pet.id)}</span>
                <span>${getSpeciesDisplay(pet)}</span>
                ${pet.breed ? `<span>${escapeHtml(pet.breed)}</span>` : ''}
                ${weightText ? `<span>${escapeHtml(weightText)}</span>` : ''}
                ${age ? `<span>${escapeHtml(age)}</span>` : ''}
            </div>
        </div>
    `;
}

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
                        <span>${escapeHtml(item.staff || DEMO_STAFF_PRIMARY)}</span>
                    </div>
                    ${isUrgent ? buildChatBoxHtml(item.id) : ''}
                    ${isCompleted && item.invoice ? buildInvoiceBlockHtml(item.invoice) : ''}
                </div>
                ${imageUrl ? `
                <div class="timeline-photo">
                    <img src="${imageUrl}" alt="${escapeHtml(item.status)}" class="timeline-item-image" loading="lazy" />
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

    let rawImage = candidates.find(value => typeof value === 'string' && value.trim() !== '')
        || getTimelineFallbackImage(item);

    if (rawImage && !rawImage.startsWith('http') && !rawImage.startsWith('data:') && !rawImage.startsWith('/')) {
        rawImage = '/' + rawImage;
    }

    try {
        const url = new URL(rawImage, window.location.href);
        return url.href;
    } catch {
        return rawImage;
    }
}

function getTimelineFallbackImage(item) {
    const status = `${item.status || ''} ${item.description || ''}`.toLowerCase();

    if (status.includes('sấy')) return TIMELINE_FALLBACK_IMAGES.dry;
    if (status.includes('tắm')) return TIMELINE_FALLBACK_IMAGES.bath;
    if (status.includes('tiếp nhận')) return TIMELINE_FALLBACK_IMAGES.receive;
    if (status.includes('cắt') || status.includes('tỉa') || status.includes('chải') || status.includes('tạo kiểu')) {
        return TIMELINE_FALLBACK_IMAGES.trim;
    }
    if (status.includes('hoàn thành')) return TIMELINE_FALLBACK_IMAGES.complete;

    return TIMELINE_FALLBACK_IMAGES.default;
}

/* ==========================================================================
   5. KHUNG CHAT TRAO ĐỔI VỚI NHÂN VIÊN
   ========================================================================== */

function buildChatBoxHtml(noteId) {
    return `
        <div class="urgent-chat-box" id="chatBox-${noteId}">
            <div class="chat-box-header">
                <h4 class="chat-box-title">Trò chuyện với nhân viên chăm sóc</h4>
            </div>
            <div class="chat-messages-container" id="chatMessages-${noteId}"></div>
            <div class="chat-input-group">
                <input type="text" class="chat-input" id="chatInput-${noteId}"
                    placeholder="Nhập tin nhắn phản hồi cho nhân viên..." maxlength="500" aria-label="Tin nhắn" />
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

    btnSend.onclick = () => sendChatMessage(noteId);
    input.onkeypress = (e) => {
        if (e.key === 'Enter') { e.preventDefault(); sendChatMessage(noteId); }
    };
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
    if (!allLogs[currentPetId]) allLogs[currentPetId] = { chatMessages: {} };
    if (!allLogs[currentPetId].chatMessages) allLogs[currentPetId].chatMessages = {};
    if (!allLogs[currentPetId].chatMessages[noteId]) allLogs[currentPetId].chatMessages[noteId] = [];
    allLogs[currentPetId].chatMessages[noteId].push(newMsg);
    saveTrackerLogs(allLogs);

    appendChatMessage(noteId, newMsg);
    input.value = '';

    setTimeout(() => {
        const reply = {
            id: Date.now(),
            sender: DEMO_STAFF_PRIMARY,
            text: 'Dạ PawPal đã nhận được dặn dò của bạn. Đội ngũ nhân viên đang chăm sóc bé rất cẩn thận ạ!',
            timestamp: new Date().toISOString(),
            isStaff: true
        };
        const logsNow = getTrackerLogs();
        if (logsNow[currentPetId]?.chatMessages?.[noteId]) {
            logsNow[currentPetId].chatMessages[noteId].push(reply);
            saveTrackerLogs(logsNow);
        }
        appendChatMessage(noteId, reply);
    }, 1800);
}

function appendChatMessage(noteId, msg) {
    const container = document.getElementById(`chatMessages-${noteId}`);
    if (!container) return;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = buildChatMessageHtml(msg);
    container.appendChild(wrapper.firstElementChild);
    container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
}

/* ==========================================================================
   6. HÓA ĐƠN & LỊCH SỬ DỊCH VỤ
   ========================================================================== */

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

async function openSessionFromUrlOrFallback(sessionId) {
    const historyItems = document.querySelectorAll('.history-item');
    const target = sessionId
        ? Array.from(historyItems).find((item) => item.dataset.sessionId === sessionId)
        : null;

    if (target) {
        target.click();
        return;
    }

    const firstHistory = historyItems[0];
    if (firstHistory) {
        firstHistory.click();
    }
}

/* ==========================================================================
   7. DASHBOARD DỊCH VỤ ĐANG CHẠY & BÉ CƯNG CHỌN NHANH
   ========================================================================== */

async function renderActiveServicesDashboard() {
    const dashboardState = document.getElementById('dashboardState');
    const emptyState = document.getElementById('emptyState');
    const activeContainer = document.getElementById('activeServicesContainer');
    const grid = document.getElementById('activeServicesGrid');
    const template = document.getElementById('activeServiceCardTemplate');
    const quickPetsSection = document.getElementById('quickPetsSection');
    const quickPetsGrid = document.getElementById('quickPetsGrid');

    if (!dashboardState) return;

    const pets = (await getPets()).filter((pet) => !pet.isArchived);
    const activeSessions = [];

    for (const pet of pets) {
        const logs = await getOrSeedTrackerLogs(pet);
        if (logs && logs.currentSession) {
            activeSessions.push({ pet, session: logs.currentSession });
        }
    }

    dashboardState.classList.remove('d-none');

    // 1. Dịch vụ đang diễn ra
    if (activeSessions.length > 0 && activeContainer && grid && template) {
        activeContainer.classList.remove('d-none');
        if (emptyState) emptyState.classList.add('d-none');
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
            btn.addEventListener('click', async () => {
                await selectAndLoadPet(item.pet.id);
            });

            grid.appendChild(clone);
        });
    } else {
        if (activeContainer) activeContainer.classList.add('d-none');
        if (emptyState) emptyState.classList.remove('d-none');
    }

    // 2. Danh sách bé cưng chọn nhanh (Quick-select Grid)
    if (quickPetsSection && quickPetsGrid) {
        const quickPetsTitle = quickPetsSection.querySelector('.quick-pets-title');
        const activePetIds = new Set(activeSessions.map(item => String(item.pet.id || item.pet.code || '')));
        
        // Loại bỏ hoàn toàn các bé đang có trong phần "Dịch vụ đang diễn ra" để triệt tiêu việc bị lặp
        const displayPets = pets.filter(pet => !activePetIds.has(String(pet.id || pet.code || '')));

        if (displayPets.length > 0) {
            quickPetsSection.classList.remove('d-none');
            if (quickPetsTitle) {
                quickPetsTitle.textContent = activeSessions.length > 0 ? 'Các bé cưng khác' : 'Bé cưng của bạn';
            }
            quickPetsGrid.innerHTML = displayPets.map(pet => {
                const petImage = pet.avatar || '/assets/images/shared/default-pet.png';
                const speciesName = getSpeciesDisplay(pet);
                const subText = pet.breed ? `${speciesName} • ${pet.breed}` : speciesName;
                return `
                    <div class="col-12 col-sm-8 col-md-6 col-lg-5 col-xl-4 d-flex justify-content-center">
                        <div class="quick-pet-card" data-pet-id="${escapeHtml(pet.id)}">
                            <img src="${petImage}" alt="${escapeHtml(pet.name)}" class="quick-pet-avatar">
                            <div class="quick-pet-info">
                                <h5 class="quick-pet-name">${escapeHtml(pet.name)}</h5>
                                <p class="quick-pet-meta">${escapeHtml(subText)}</p>
                            </div>
                            <button class="quick-pet-btn">Xem</button>
                        </div>
                    </div>
                `;
            }).join('');

            quickPetsGrid.querySelectorAll('.quick-pet-card').forEach(card => {
                card.addEventListener('click', async () => {
                    const petId = card.getAttribute('data-pet-id');
                    if (petId) {
                        await selectAndLoadPet(petId);
                    }
                });
            });
        } else {
            // Khi toàn bộ các bé đều đã có ở phần Dịch vụ đang diễn ra (hoặc chỉ có 1 bé), ẩn khối này để không bị trùng lặp
            quickPetsSection.classList.add('d-none');
        }
    }
}

/* ==========================================================================
   8. ĐỊNH DẠNG & BẢO VỆ
   ========================================================================== */

function formatTimestamp(isoStr, mode = 'full') {
    if (!isoStr) return '';
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
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

export const init = initPetDiary;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
