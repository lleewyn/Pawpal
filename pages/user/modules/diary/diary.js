/**
 * modules/diary/diary.js - Module Nhật ký chăm sóc PawPal
 * Đồng bộ đa tầng: Supabase -> Admin Bookings -> Care Logs -> Seed Fallback
 */
import { getPets } from '/scripts/api/petService.js?v=20261001-dedup';

const TRACKER_LOGS_KEY = 'pawpal_pet_tracker_logs';

let careLogsCache = null;
let petSeedCache = null;
let currentPetId = null;
let currentPetObject = null;
let currentSessionId = null;
let isHashListenerAttached = false;

const DEMO_STAFF_PRIMARY = 'Nguyễn Thị Mai';
const DEMO_STAFF_RECEPTION = 'Trần Văn Nam';

const TIMELINE_FALLBACK_IMAGES = {
    cat: {
        receive: '/assets/images/services/spa/process/chai_long_meo1.jpeg',
        bath: '/assets/images/services/spa/process/tam_meo.jpg',
        dry: '/assets/images/services/spa/process/say_long1.jpg',
        trim: '/assets/images/services/spa/process/process_cat_long_cat_long_meo.jpg',
        complete: '/assets/images/services/spa/process/process_nghi_ngoi_nghi_ngoi1.jpg',
        default: '/assets/images/services/spa/process/tam_meo.jpg'
    },
    dog: {
        receive: '/assets/images/services/spa/process/process_chai_long_chai_long.jpg',
        bath: '/assets/images/services/spa/process/tam_cho1.jpg',
        dry: '/assets/images/services/spa/process/say_long2.jpg',
        trim: '/assets/images/services/spa/process/process_cat_long_cat_long.jpg',
        complete: '/assets/images/services/spa/process/process_nghi_ngoi_nghi_ngoi.jpg',
        default: '/assets/images/services/spa/process/spa01.webp'
    },
    default: {
        receive: '/assets/images/services/spa/process/massage.jpg',
        bath: '/assets/images/services/spa/process/process_tam_tam.jpg',
        dry: '/assets/images/services/spa/process/process_say_say_long.jpg',
        trim: '/assets/images/services/spa/process/cat_long1.jpg',
        complete: '/assets/images/services/spa/process/nghi_ngoi1.jpg',
        default: '/assets/images/services/spa/process/spa01.webp'
    }
};

/* ==========================================================================
   1. TIỆN ÍCH DỮ LIỆU VÀ STORAGE
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

let isInitRunning = false;

export async function initPetDiary() {
    if (isInitRunning) return;
    isInitRunning = true;
    try {
        setupDiaryNavigation();
        setupDiaryImageModal();
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
                } else if (!targetPetId) {
                    const defaultId = await getDefaultPetIdToLoad();
                    if (defaultId && defaultId !== currentPetId) {
                        await selectAndLoadPet(defaultId);
                    }
                }
            }
        });
    }

    const petIdFromUrl = getRouteParam('id') || getRouteParam('pet') || getRouteParam('petId');
    const sessionIdFromUrl = getRouteParam('sessionId') || getRouteParam('session');

    let targetPetId = petIdFromUrl || (petSelector && petSelector.value);
    if (!targetPetId) {
        targetPetId = await getDefaultPetIdToLoad();
    }

        if (targetPetId) {
            await selectAndLoadPet(targetPetId);
            if (sessionIdFromUrl) {
                await openSessionFromUrlOrFallback(sessionIdFromUrl);
            }
        } else {
            showEmptyPetState();
        }
    } finally {
        isInitRunning = false;
    }
}

function setupDiaryNavigation() {
    // Điều hướng chọn bé trực quan qua pet-switch-pill trên đầu trang
}

async function renderPetSwitcherPills(activePetId) {
    const pillsContainer = document.getElementById('petSwitcherPills');
    if (!pillsContainer) return;

    const pets = (await getPets()).filter((pet) => !pet.isArchived);
    if (!pets.length) {
        pillsContainer.innerHTML = '';
        return;
    }

    const pillsMarkup = await Promise.all(pets.map(async (pet) => {
        const isActive = String(pet.id).toLowerCase() === String(activePetId).toLowerCase();
        const avatar = pet.avatar || '/assets/images/shared/default-pet.png';
        const logs = await getOrSeedTrackerLogs(pet);
        const isLive = Boolean(logs?.currentSession && logs.currentSession.status === 'Đang thực hiện');
        const liveTag = isLive ? `<span class="pill-live-tag">Đang spa</span>` : '';

        return `
            <button type="button" class="pet-switch-pill ${isActive ? 'active' : ''} ${isLive ? 'has-live-service' : ''}" data-pet-id="${escapeHtml(pet.id)}" title="Xem nhật ký ${escapeHtml(pet.name)}">
                <img src="${avatar}" alt="${escapeHtml(pet.name)}" class="pill-pet-avatar">
                <span class="pill-pet-name">${escapeHtml(pet.name)}</span>
                ${liveTag}
            </button>
        `;
    }));

    pillsContainer.innerHTML = pillsMarkup.join('');

    pillsContainer.querySelectorAll('.pet-switch-pill').forEach(btn => {
        btn.addEventListener('click', async () => {
            const petId = btn.getAttribute('data-pet-id');
            if (petId && petId !== currentPetId) {
                await selectAndLoadPet(petId);
            }
        });
    });
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

function updateDiaryBreadcrumb(petName) {
    if (typeof window.setUserSubBreadcrumb === 'function') {
        window.setUserSubBreadcrumb(petName, 'diary');
        return;
    }
    const list = document.getElementById('userBreadcrumbList');
    if (!list) return;
    if (petName) {
        list.innerHTML = `
            <li class="breadcrumb-item"><a href="/pages/public/landing/landing.html">Trang chủ</a></li>
            <li class="breadcrumb-item"><a href="#diary" id="btnBreadcrumbDiary">Nhật ký chăm sóc</a></li>
            <li class="breadcrumb-item active" id="userBreadcrumbCurrent">${escapeHtml(petName)}</li>
        `;
        document.title = `${petName} - Nhật ký chăm sóc - PawPal`;
        const link = document.getElementById('btnBreadcrumbDiary');
        if (link) {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showDashboardState();
            });
        }
    } else {
        list.innerHTML = `
            <li class="breadcrumb-item"><a href="/pages/public/landing/landing.html">Trang chủ</a></li>
            <li class="breadcrumb-item active" id="userBreadcrumbCurrent">Nhật ký chăm sóc</li>
        `;
        document.title = 'Nhật ký chăm sóc - PawPal';
    }
}

async function getDefaultPetIdToLoad() {
    try {
        const pets = (await getPets()).filter((pet) => !pet.isArchived);
        if (!pets || pets.length === 0) return null;

        // Ưu tiên 1: Bé đang có dịch vụ 'Đang thực hiện'
        for (const pet of pets) {
            const logs = await getOrSeedTrackerLogs(pet);
            if (logs?.currentSession && logs.currentSession.status === 'Đang thực hiện') {
                return pet.id;
            }
        }

        // Ưu tiên 2: Bé đầu tiên trong danh sách
        return pets[0].id;
    } catch (e) {
        console.warn('[diary] getDefaultPetIdToLoad error:', e);
        return null;
    }
}

function showEmptyPetState() {
    const dashboardState = document.getElementById('dashboardState');
    const diaryContent = document.getElementById('diaryContent');
    const emptyState = document.getElementById('emptyState');
    const petSelector = document.getElementById('petSelector');
    const skeletonEl = document.getElementById('diaryLoadingSkeleton');

    if (skeletonEl) skeletonEl.classList.add('d-none');
    if (dashboardState) dashboardState.classList.remove('d-none');
    if (diaryContent) diaryContent.classList.add('d-none');
    if (emptyState) emptyState.classList.remove('d-none');
    if (petSelector) petSelector.value = '';

    updateDiaryBreadcrumb('');
}

async function showDashboardState() {
    const defaultPetId = await getDefaultPetIdToLoad();
    if (defaultPetId) {
        await selectAndLoadPet(defaultPetId);
    } else {
        showEmptyPetState();
    }
}

window.pawpalShowDiaryDashboard = showDashboardState;

async function selectAndLoadPet(petId, targetSessionId = null) {
    const emptyState = document.getElementById('emptyState');
    const diaryContent = document.getElementById('diaryContent');
    const dashboardState = document.getElementById('dashboardState');
    const skeletonEl = document.getElementById('diaryLoadingSkeleton');

    if (!petId) {
        await showDashboardState();
        return;
    }

    const pets = await getPets();
    const pet = pets.find(p => 
        String(p.id).toLowerCase() === String(petId).toLowerCase() ||
        String(p.name).toLowerCase() === String(petId).toLowerCase()
    );

    if (!pet) {
        const fallbackId = await getDefaultPetIdToLoad();
        if (fallbackId && String(fallbackId) !== String(petId)) {
            await selectAndLoadPet(fallbackId, targetSessionId);
            return;
        }
        showEmptyPetState();
        return;
    }

    const petSelector = document.getElementById('petSelector');
    if (petSelector) {
        let matchedOption = Array.from(petSelector.options).find(opt => 
            opt.value.toLowerCase() === String(pet.id).toLowerCase() ||
            opt.value.toLowerCase() === String(petId).toLowerCase()
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
    // Giữ Skeleton hiển thị, chưa hiện diaryContent vội để tránh lộ khung rỗng
    if (skeletonEl) skeletonEl.classList.remove('d-none');
    if (diaryContent) diaryContent.classList.add('d-none');

    currentPetId = pet.id;
    currentPetObject = pet;

    // Cập nhật Breadcrumb: Trang chủ / Nhật ký chăm sóc / [Tên bé]
    updateDiaryBreadcrumb(currentPetObject.name);

    const targetHash = `#diary?id=${currentPetId}`;
    if (window.location.hash !== targetHash) {
        history.replaceState(null, '', targetHash);
    }

    await renderPetSwitcherPills(currentPetId);
    await loadPetDiary(currentPetId, targetSessionId);

    // KHI TOÀN BỘ DỮ LIỆU ĐÃ RENDER XONG: ẨN SKELETON VÀ HIỆN DIARYCONTENT
    if (skeletonEl) skeletonEl.classList.add('d-none');
    if (diaryContent) diaryContent.classList.remove('d-none');
}

window.selectAndLoadPet = selectAndLoadPet;

/* ==========================================================================
   3. TẢI VÀ ĐỒNG BỘ DỮ LIỆU NHẬT KÝ (MULTI-SOURCE SYNC)
   ========================================================================== */

async function loadPetDiary(petId, targetSessionId = null) {
    const pets = await getPets();
    const pet = pets.find(p => String(p.id) === String(petId));
    if (!pet) {
        showToast('Không tìm thấy thông tin bé cưng', 'error');
        return;
    }
    currentPetObject = pet;
    updateDiaryBreadcrumb(pet.name);

    // 1. Thử đồng bộ từ Supabase nếu có client
    let logs = null;
    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (client) {
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

    // Chọn phiên dịch vụ kích hoạt
    let activeSession = null;
    if (targetSessionId) {
        activeSession = allSessions.find(s => String(s.id) === String(targetSessionId));
    }
    if (!activeSession) {
        activeSession = currentSession || (allSessions.length > 0 ? allSessions[0] : null);
    }

    renderPetInfoCard(pet, currentSession);
    renderServiceStepper(activeSession, pet);

    renderHistorySidebar(allSessions.map(s => ({
        ...s,
        isCurrent: activeSession ? (String(s.id) === String(activeSession.id)) : s.isCurrent
    })));

    if (activeSession) {
        currentSessionId = activeSession.id;
        renderTimeline(activeSession.timeline, activeSession);
    } else {
        currentSessionId = null;
        renderTimeline([], null);
    }
}

async function syncPetDiaryFromSupabase(pet) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
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
    const s = String(status || '').toLowerCase().trim();
    const map = {
        'dang_giu_cho':   'Đang giữ chỗ',
        'cho_xac_nhan':   'Chờ xác nhận',
        'da_xac_nhan':    'Đã xác nhận',
        'da_check_in':    'Đã tiếp nhận',
        'dang_thuc_hien': 'Đang thực hiện',
        'da_hoan_tat':    'Hoàn thành',
        'da_huy':         'Đã hủy',
        'da_het_han':     'Đã hết hạn',
        'vang_mat':       'Vắng mặt',
        'pending':        'Chờ xác nhận',
        'confirmed':      'Đã xác nhận',
        'completed':      'Hoàn thành',
        'cancelled':      'Đã hủy',
        'no_show':        'Vắng mặt',
        'in_progress':    'Đang thực hiện',
        'in-progress':    'Đang thực hiện'
    };
    return map[s] || status || 'Đang thực hiện';
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
        service: booking.serviceName || 'Spa và Grooming',
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

    if (!baseData.history) baseData.history = [];

    // Gộp ca từ pet.carelogs (đồng bộ từ Admin Hồ sơ 360° & Quản lý thú cưng)
    if (Array.isArray(pet.carelogs) && pet.carelogs.length > 0) {
        pet.carelogs.forEach((cl, idx) => {
            const clId = cl.careId || `CL-${pet.id}-${idx}`;
            if (!baseData.history.some(h => h.id === clId)) {
                const dateParts = (cl.time || '').split(' ');
                const dateStr = dateParts[1] ? dateParts[1].split('/').reverse().join('-') : (dateParts[0] || '2026-05-18');
                const timeStr = dateParts[0] && dateParts[0].includes(':') ? dateParts[0] : '14:30';
                
                const careSession = {
                    id: clId,
                    service: cl.service || 'Tắm sấy và Cắt tỉa tạo phom',
                    date: dateStr,
                    status: 'Hoàn thành',
                    technician: cl.ktv || 'Hoàng Tuấn • Bàn 2',
                    beforePhoto: cl.imgBefore || '/assets/images/services/spa/process/process_chai_long_chai_long.jpg',
                    afterPhoto: cl.imgAfter || '/assets/images/services/spa/process/process_nghi_ngoi_nghi_ngoi.jpg',
                    checklist: cl.checklist || { ear: true, nail: true, anal: true, skin: true },
                    ownerMessage: cl.ownerMessage || 'Bé rất ngoan và hoàn thành tốt toàn bộ dịch vụ!',
                    rating: cl.rating || 5,
                    reviewText: cl.reviewText || '',
                    reviewSubmitted: Boolean(cl.reviewText || cl.rating),
                    timeline: [
                        {
                            id: `${clId}-4`,
                            status: 'Hoàn thành dịch vụ và Sẵn sàng đón bé',
                            timestamp: `${dateStr}T${timeStr}:00`,
                            description: cl.ownerMessage || 'Bé đã hoàn tất toàn bộ quy trình chăm sóc, sạch thơm và xinh xắn.',
                            staff: cl.ktv || 'Hoàng Tuấn • Bàn 2',
                            type: 'completed',
                            image: cl.imgAfter
                        },
                        {
                            id: `${clId}-3`,
                            status: 'Cắt tỉa tạo phom và Chăm sóc chi tiết',
                            timestamp: `${dateStr}T13:45:00`,
                            description: 'Cắt tỉa gọn gàng lông bàn chân, tạo dáng khuôn mặt tròn xinh xắn.',
                            staff: cl.ktv || 'Hoàng Tuấn • Bàn 2',
                            type: 'in_progress',
                            image: cl.imgBefore
                        },
                        {
                            id: `${clId}-2`,
                            status: 'Tắm sạch và Vệ sinh 4 mục',
                            timestamp: `${dateStr}T13:00:00`,
                            description: 'Vệ sinh tai, cắt mài móng, vắt tuyến hôi và tắm dưỡng thảo mộc dịu nhẹ.',
                            staff: cl.ktv || 'Hoàng Tuấn • Bàn 2',
                            type: 'in_progress',
                            image: '/assets/images/services/spa/process/process_tam_tam.jpg'
                        },
                        {
                            id: `${clId}-1`,
                            status: 'Tiếp nhận bé và Kiểm tra thể trạng',
                            timestamp: `${dateStr}T12:30:00`,
                            description: `Kiểm tra cân nặng ${pet.weight || '8.5kg'}, tiếp nhận yêu cầu từ phụ huynh.`,
                            staff: 'Trần Văn Nam',
                            type: 'check_in',
                            image: '/assets/images/services/spa/process/massage.jpg'
                        }
                    ],
                    invoice: {
                        code: `HD-${clId}`,
                        items: [
                            { name: cl.service || 'Tắm sấy và Cắt tỉa tạo phom', price: 350000 },
                            { name: 'Vệ sinh 4 mục chuyên sâu', price: 0 }
                        ],
                        total: 350000,
                        paid: true
                    }
                };
                baseData.history.unshift(careSession);
            }
        });
    }

    // Gộp ca từ allLogs[pet.id]?.sessions (đồng bộ từ Admin Groomer Workbench Subtab 3)
    if (Array.isArray(allLogs[pet.id]?.sessions)) {
        allLogs[pet.id].sessions.forEach(ss => {
            if (!baseData.history.some(h => h.id === ss.id)) {
                const dateStr = ss.date || new Date().toISOString().split('T')[0];
                const ssSession = {
                    id: ss.id,
                    service: ss.serviceName || 'Tắm sấy toàn diện và Vệ sinh 4 mục',
                    date: dateStr,
                    status: 'Hoàn thành',
                    technician: ss.technician || 'Hoàng Tuấn • Bàn 2',
                    beforePhoto: ss.beforePhoto,
                    afterPhoto: ss.afterPhoto,
                    checklist: ss.checklist || { ear: true, nail: true, anal: true, skin: true },
                    ownerMessage: ss.ownerMessage || 'Bé rất ngoan và hoàn thành tốt dịch vụ!',
                    rating: ss.rating || 5,
                    reviewText: ss.reviewText || '',
                    reviewSubmitted: Boolean(ss.reviewText || ss.rating),
                    timeline: [
                        {
                            id: `${ss.id}-4`,
                            status: 'Hoàn thành dịch vụ',
                            timestamp: `${dateStr}T${ss.time || '15:00'}:00`,
                            description: ss.ownerMessage || 'Bé rất ngoan và hoàn thành tốt dịch vụ!',
                            staff: ss.technician || 'Hoàng Tuấn • Bàn 2',
                            type: 'completed',
                            image: ss.afterPhoto
                        },
                        {
                            id: `${ss.id}-3`,
                            status: 'Tắm sấy và Tạo phom',
                            timestamp: `${dateStr}T14:15:00`,
                            description: 'Đã hoàn tất tắm sấy và cắt tỉa theo yêu cầu.',
                            staff: ss.technician || 'Hoàng Tuấn • Bàn 2',
                            type: 'in_progress',
                            image: ss.beforePhoto
                        }
                    ],
                    invoice: {
                        code: `HD-${ss.id}`,
                        items: [
                            { name: ss.serviceName || 'Tắm sấy toàn diện và Vệ sinh 4 mục', price: 350000 }
                        ],
                        total: 350000,
                        paid: true
                    }
                };
                baseData.history.unshift(ssSession);
            }
        });
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
   4. RENDER GIAO DIỆN HỒ SƠ VÀ DÒNG THỜI GIAN
   ========================================================================== */

function renderPetInfoCard(pet, currentSession) {
    const container = document.getElementById('petInfoCard');
    if (!container) return;

    const age = calcAge(pet.dob);
    const weightText = formatWeightDisplay(pet.weight || pet.weightNum);
    const speciesText = getSpeciesDisplay(pet);
    const breedText = pet.breed ? pet.breed : '';

    const avatarHtml = pet.avatar
        ? `<img src="${pet.avatar}" alt="${escapeHtml(pet.name)}" class="pet-info-avatar">`
        : `<div class="pet-info-avatar-placeholder">
               <span class="pet-avatar-text">${escapeHtml((pet.name || 'P').charAt(0).toUpperCase())}</span>
           </div>`;

    const isLiveActive = Boolean(currentSession && currentSession.status === 'Đang thực hiện');

    container.innerHTML = `
        <div class="pet-info-header-wrap">
            <div class="pet-info-left">
                <div class="pet-avatar-wrapper ${isLiveActive ? 'avatar-in-spa' : ''}">
                    ${avatarHtml}
                    ${isLiveActive ? '<span class="avatar-live-indicator" title="Bé đang được chăm sóc tại Spa"></span>' : ''}
                </div>
                <div class="pet-info-details">
                    <div class="pet-title-row">
                        <h3 class="pet-title-name">${escapeHtml(pet.name)}</h3>
                        <span class="pet-code-pill">${escapeHtml(pet.id || pet.code || 'Bé cưng')}</span>
                    </div>
                    <div class="pet-info-tags">
                        <span class="pet-meta-tag tag-species">
                            ${escapeHtml(speciesText)}${breedText ? ` • ${escapeHtml(breedText)}` : ''}
                        </span>
                        ${weightText ? `
                        <span class="pet-meta-tag tag-weight">
                            ${escapeHtml(weightText)}
                        </span>` : ''}
                        ${age ? `
                        <span class="pet-meta-tag tag-age">
                            ${escapeHtml(age)}
                        </span>` : ''}
                    </div>
                </div>
            </div>
            <div class="pet-info-right">
                ${isLiveActive ? `
                <div class="pet-status-live-banner">
                    <span class="live-pulse-dot"></span>
                    <span class="live-text">Đang làm Spa</span>
                </div>
                ` : `
                <div class="pet-status-idle-banner">
                    <span class="idle-text">Nghỉ ngơi tại nhà</span>
                </div>
                `}
                <a href="/pages/services/booking/booking.html?petId=${encodeURIComponent(pet.id || '')}" class="btn-pet-new-booking" title="Đặt lịch hẹn spa/khám mới cho bé">
                    <span>+ Đặt lịch mới</span>
                </a>
            </div>
        </div>
    `;
}

function renderServiceStepper(currentSession, pet) {
    const container = document.getElementById('serviceStepperCard');
    if (!container) return;

    if (!currentSession) {
        container.innerHTML = '';
        container.classList.add('d-none');
        return;
    }

    container.classList.remove('d-none');

    let currentStep = 1;
    const timeline = currentSession.timeline || [];
    const latestEvent = timeline.length > 0 ? timeline[0] : null;
    const statusStr = ((latestEvent?.status || '') + ' ' + (latestEvent?.description || '')).toLowerCase();

    if (currentSession.status === 'Hoàn thành' || statusStr.includes('hoàn thành')) {
        currentStep = 4;
    } else if (statusStr.includes('cắt') || statusStr.includes('tỉa') || statusStr.includes('tạo kiểu') || statusStr.includes('chải')) {
        currentStep = 3;
    } else if (statusStr.includes('tắm') || statusStr.includes('sấy') || statusStr.includes('massage')) {
        currentStep = 2;
    } else {
        currentStep = 1;
    }

    const steps = [
        { num: 1, title: 'Tiếp nhận', sub: 'Khám và Check-in' },
        { num: 2, title: 'Tắm và Sấy', sub: 'Thư giãn dịu nhẹ' },
        { num: 3, title: 'Cắt tỉa và Spa', sub: 'Tạo kiểu xinh xắn' },
        { num: 4, title: 'Hoàn tất', sub: 'Sẵn sàng đón bé' }
    ];

    const progressPercent = currentStep === 1 ? 0 : (currentStep === 2 ? 28 : (currentStep === 3 ? 56 : 84));

    container.innerHTML = `
        <div class="stepper-header">
            <div class="stepper-title-group">
                <div class="stepper-service-name">
                    <h4>${escapeHtml(currentSession.service || 'Spa và Grooming')}</h4>
                </div>
                <span class="stepper-time-badge">${formatDate(currentSession.date)}</span>
            </div>
            <div class="stepper-status-badge ${currentSession.status === 'Hoàn thành' ? 'status-finished' : 'status-ongoing'}">
                ${currentSession.status === 'Hoàn thành' ? 'Đã hoàn tất' : 'Tiến trình trực tiếp'}
            </div>
        </div>

        <div class="stepper-track-wrapper">
            <div class="stepper-progress-bar" style="width: ${progressPercent}%;"></div>
            <div class="stepper-steps">
                ${steps.map(step => {
                    const isDone = step.num < currentStep || currentStep === 4;
                    const isActive = step.num === currentStep && currentStep !== 4;
                    let stateClass = 'pending';
                    if (isDone) stateClass = 'done';
                    else if (isActive) stateClass = 'active';

                    return `
                        <div class="stepper-step ${stateClass}">
                            <div class="step-circle">
                                <span>${step.num}</span>
                            </div>
                            <div class="step-content">
                                <span class="step-name">${step.title}</span>
                                <span class="step-desc">${step.sub}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
}

function buildCareLogShowcaseHtml(session) {
    if (!session) return '';
    const beforePhoto = session.beforePhoto || (session.photos && session.photos[0]);
    const afterPhoto = session.afterPhoto || (session.photos && session.photos[1]);
    const ownerMessage = session.ownerMessage;
    const technician = session.technician || DEMO_STAFF_PRIMARY;
    const rating = session.rating || 5;
    const reviewText = session.reviewText || '';
    const hasReview = Boolean(session.reviewSubmitted);

    if (!beforePhoto && !afterPhoto && !ownerMessage) {
        return '';
    }

    return `
        <div class="carelog-showcase-card" id="careLogShowcaseCard">
            <div class="showcase-header">
                <div class="showcase-title-group">
                    <h4 class="showcase-title">Tổng kết dịch vụ và Bàn giao bé</h4>
                </div>
                <span class="showcase-badge-success">Đã nghiệm thu</span>
            </div>

            ${(beforePhoto || afterPhoto) ? `
            <div class="before-after-grid">
                ${beforePhoto ? `
                <div class="photo-compare-col" onclick="window.openDiaryImageModal('${beforePhoto}', 'Ảnh trước khi làm — ${escapeHtml(currentPetObject?.name || '')}')" title="Bấm để xem ảnh phóng to">
                    <span class="photo-compare-tag tag-before">Trước khi làm</span>
                    <img src="${beforePhoto}" alt="Trước khi làm" class="photo-compare-img" loading="lazy" />
                    <span class="photo-compare-overlay">Phóng to</span>
                </div>` : ''}
                ${afterPhoto ? `
                <div class="photo-compare-col" onclick="window.openDiaryImageModal('${afterPhoto}', 'Ảnh sau khi hoàn thiện — ${escapeHtml(currentPetObject?.name || '')}')" title="Bấm để xem ảnh phóng to">
                    <span class="photo-compare-tag tag-after">Sau khi hoàn thiện</span>
                    <img src="${afterPhoto}" alt="Sau khi hoàn thiện" class="photo-compare-img" loading="lazy" />
                    <span class="photo-compare-overlay">Phóng to</span>
                </div>` : ''}
            </div>` : ''}

            <div class="hygiene-proof-section">
                <div class="hygiene-proof-title">
                    <span>Chứng thực vệ sinh 4 mục tiêu chuẩn</span>
                    <span style="font-size: 11px; font-weight: 600; color: #165335;">4/4 mục đạt chuẩn</span>
                </div>
                <div class="hygiene-proof-grid">
                    <div class="hygiene-item">
                        <span class="hygiene-item-check">✓</span>
                        <span>Vệ sinh tai sạch sẽ</span>
                    </div>
                    <div class="hygiene-item">
                        <span class="hygiene-item-check">✓</span>
                        <span>Cắt và mài móng an toàn</span>
                    </div>
                    <div class="hygiene-item">
                        <span class="hygiene-item-check">✓</span>
                        <span>Vắt tuyến hôi sạch sẽ</span>
                    </div>
                    <div class="hygiene-item">
                        <span class="hygiene-item-check">✓</span>
                        <span>Chăm sóc và dưỡng da lông</span>
                    </div>
                </div>
            </div>

            ${ownerMessage ? `
            <div class="technician-advice-box">
                <div class="technician-advice-title">Lời dặn dò từ chuyên viên (${escapeHtml(technician)}):</div>
                <p class="technician-advice-desc">${escapeHtml(ownerMessage)}</p>
            </div>` : ''}

            <div class="user-review-box">
                <div class="user-review-header">
                    <h5 class="user-review-title">Đánh giá chất lượng dịch vụ</h5>
                    ${!hasReview ? `
                    <div class="star-rating-widget" id="starRatingWidget">
                        <button type="button" class="star-btn active" data-val="1">★</button>
                        <button type="button" class="star-btn active" data-val="2">★</button>
                        <button type="button" class="star-btn active" data-val="3">★</button>
                        <button type="button" class="star-btn active" data-val="4">★</button>
                        <button type="button" class="star-btn active" data-val="5">★</button>
                    </div>` : ''}
                </div>

                ${hasReview ? `
                <div class="submitted-review-view">
                    <div class="submitted-review-stars">${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}</div>
                    <p class="m-0">${escapeHtml(reviewText || 'Dịch vụ rất tốt, bé được chăm sóc chu đáo!')}</p>
                </div>` : `
                <div class="user-review-input-group">
                    <textarea class="user-review-textarea" id="txtUserReview" placeholder="Chia sẻ cảm nhận của bạn về trải nghiệm của bé tại PawPal...">${escapeHtml(reviewText)}</textarea>
                    <button type="button" class="btn-submit-review" id="btnSubmitReview" onclick="window.submitCareLogReview('${session.id}')">Gửi đánh giá</button>
                </div>`}
            </div>
        </div>
    `;
}

window.submitCareLogReview = function(sessionId) {
    const txtEl = document.getElementById('txtUserReview');
    const reviewText = txtEl ? txtEl.value.trim() : '';
    const ratingWidget = document.getElementById('starRatingWidget');
    let selectedRating = 5;
    if (ratingWidget) {
        const activeStars = ratingWidget.querySelectorAll('.star-btn.active');
        selectedRating = activeStars.length || 5;
    }

    // 1. Cập nhật vào trackerLogs
    const allLogs = getTrackerLogs();
    if (currentPetId && allLogs[currentPetId]) {
        const petLogs = allLogs[currentPetId];
        let target = null;
        if (petLogs.currentSession?.id === sessionId) target = petLogs.currentSession;
        else if (petLogs.history) target = petLogs.history.find(s => s.id === sessionId);

        if (target) {
            target.rating = selectedRating;
            target.reviewText = reviewText;
            target.reviewSubmitted = true;
            saveTrackerLogs(allLogs);
        }
    }

    // 2. Cập nhật vào petsData / pawpal_admin_pets_data nếu có
    try {
        const rawAdminPets = sessionStorage.getItem('pawpal_admin_pets_data') || localStorage.getItem('pawpal_admin_pets_data');
        if (rawAdminPets) {
            const adminPets = JSON.parse(rawAdminPets);
            const petObj = adminPets.find(p => String(p.code || p.id).toLowerCase() === String(currentPetId).toLowerCase());
            if (petObj && Array.isArray(petObj.carelogs)) {
                const logItem = petObj.carelogs.find(cl => cl.careId === sessionId || sessionId.includes(cl.careId || ''));
                if (logItem) {
                    logItem.rating = selectedRating;
                    logItem.reviewText = reviewText;
                }
                sessionStorage.setItem('pawpal_admin_pets_data', JSON.stringify(adminPets));
                localStorage.setItem('pawpal_admin_pets_data', JSON.stringify(adminPets));
            }
        }
    } catch (e) {
        console.warn('Sync review to admin pets error:', e);
    }

    showToast('Cảm ơn bạn đã gửi đánh giá! Ý kiến của bạn giúp PawPal phục vụ bé ngày càng tốt hơn.');
    if (currentPetId) {
        selectAndLoadPet(currentPetId, sessionId);
    }
};

function renderTimeline(timeline, activeSession = null) {
    const wrapper = document.getElementById('timelineWrapper');
    const emptyTimeline = document.getElementById('emptyTimeline');
    if (!wrapper) return;

    let showcaseHtml = '';
    if (activeSession) {
        showcaseHtml = buildCareLogShowcaseHtml(activeSession);
    }

    if ((!timeline || timeline.length === 0) && !showcaseHtml) {
        wrapper.innerHTML = '';
        if (emptyTimeline) emptyTimeline.classList.remove('d-none');
        return;
    }

    if (emptyTimeline) emptyTimeline.classList.add('d-none');

    const sorted = [...(timeline || [])].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const timelineItemsHtml = sorted.map((item, idx) => buildTimelineItemHtml(item, sorted.length - idx, sorted.length)).join('');
    wrapper.innerHTML = showcaseHtml + timelineItemsHtml;

    // Gắn sự kiện đánh giá sao
    const ratingWidget = document.getElementById('starRatingWidget');
    if (ratingWidget) {
        const starBtns = ratingWidget.querySelectorAll('.star-btn');
        starBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const val = index + 1;
                starBtns.forEach((b, i) => {
                    if (i < val) b.classList.add('active');
                    else b.classList.remove('active');
                });
            });
        });
    }

    sorted.forEach(item => {
        if (item.urgent || item.type === 'urgent') {
            loadChatMessages(item.id);
            bindChatInputEvents(item.id);
        }
    });
}

function getStageMetadata(status, desc) {
    const text = `${status || ''} ${desc || ''}`.toLowerCase();
    if (text.includes('sấy')) {
        return {
            badgeText: 'Sấy lông và Thư giãn',
            badgeBg: '#FEF3C7',
            badgeColor: '#B45309',
            mood: 'Bé rất ngoan ngoãn, thích được sấy ấm và vuốt ve',
            themeClass: 'stage-dry',
            stepNumber: '02'
        };
    }
    if (text.includes('tắm')) {
        return {
            badgeText: 'Tắm sạch và Dưỡng lông',
            badgeBg: '#E0F2FE',
            badgeColor: '#0369A1',
            mood: 'Bé hợp tác tốt, sảng khoái với bọt sữa tắm dịu nhẹ',
            themeClass: 'stage-bath',
            stepNumber: '02'
        };
    }
    if (text.includes('cắt') || text.includes('tỉa') || text.includes('chải') || text.includes('tạo kiểu')) {
        return {
            badgeText: 'Cắt tỉa và Tạo phom',
            badgeBg: '#FCE7F3',
            badgeColor: '#BE185D',
            mood: 'Tạo kiểu xinh xắn, ngoan ngoãn đứng cho chuyên viên cắt tỉa',
            themeClass: 'stage-trim',
            stepNumber: '03'
        };
    }
    if (text.includes('hoàn thành') || text.includes('chờ đón')) {
        return {
            badgeText: 'Hoàn thành xuất sắc',
            badgeBg: '#DCFCE7',
            badgeColor: '#15803D',
            mood: 'Bé thơm tho, sạch đẹp và đã sẵn sàng chờ phụ huynh đón',
            themeClass: 'stage-complete',
            stepNumber: '04'
        };
    }
    return {
        badgeText: 'Tiếp nhận và Thăm khám',
        badgeBg: '#EEF5F1',
        badgeColor: '#236B48',
        mood: 'Bé đã vào phòng chờ, tinh thần thoải mái và vui vẻ',
        themeClass: 'stage-receive',
        stepNumber: '01'
    };
}

function buildTimelineItemHtml(item, itemIndex, totalItems) {
    const isUrgent = item.urgent || item.type === 'urgent';
    const isCompleted = item.type === 'completed';
    const timeStr = formatTimestamp(item.timestamp);
    const imageUrl = resolveTimelineImageUrl(item, currentPetObject);
    const meta = getStageMetadata(item.status, item.description);
    const nodeLabel = meta.stepNumber || (itemIndex ? String(itemIndex).padStart(2, '0') : '01');

    return `
        <div class="timeline-story-card ${isUrgent ? 'timeline-item-urgent' : ''}" data-item-id="${item.id}">
            <!-- Node số thứ tự / công đoạn trên trục dọc (100% text-only) -->
            <div class="timeline-node-icon ${meta.themeClass}" title="${meta.badgeText}">
                <span class="timeline-node-text">${nodeLabel}</span>
            </div>

            <div class="story-card-body">
                <!-- Header của thẻ nhật ký -->
                <div class="story-card-header">
                    <div class="story-stage-info">
                        <span class="story-stage-badge" style="background: ${meta.badgeBg}; color: ${meta.badgeColor};">
                            ${meta.badgeText}
                        </span>
                        <span class="story-timestamp">${timeStr}</span>
                    </div>
                    <div class="story-staff-tag">
                        <span>Chăm sóc: ${escapeHtml(item.staff || DEMO_STAFF_PRIMARY)}</span>
                    </div>
                </div>

                ${isUrgent ? `
                <div class="timeline-urgent-banner">
                    <span>LƯU Ý QUAN TRỌNG TỪ NHÂN VIÊN</span>
                </div>` : ''}

                <!-- Tiêu đề và Lời nhắn -->
                <h4 class="story-card-title">${escapeHtml(item.status)}</h4>
                <p class="story-card-desc">${escapeHtml(item.description)}</p>

                <!-- Thanh tâm trạng bé -->
                <div class="story-pet-mood-pill">
                    <span class="mood-label">Tâm trạng bé:</span>
                    <span class="mood-text">${escapeHtml(meta.mood)}</span>
                </div>

                <!-- Ảnh chụp hoạt động thực tế (Story Photo) -->
                ${imageUrl ? `
                <div class="story-photo-wrap" onclick="window.openDiaryImageModal('${imageUrl}', '${escapeHtml(item.status)} — ${escapeHtml(timeStr)}')" title="Bấm để xem ảnh phóng to nét căng">
                    <img src="${imageUrl}" alt="${escapeHtml(item.status)}" class="story-photo-img" loading="lazy" />
                    <div class="story-photo-overlay">
                        <span class="story-zoom-btn">Phóng to</span>
                    </div>
                </div>
                ` : ''}

                <!-- Khung chat khẩn / Hóa đơn nếu có -->
                ${isUrgent ? buildChatBoxHtml(item.id) : ''}
                ${isCompleted && item.invoice ? buildInvoiceBlockHtml(item.invoice) : ''}

                <!-- Footer tương tác người dùng -->
                <div class="story-card-footer">
                    <button type="button" class="btn-story-like" onclick="window.toggleStoryLike(this)">
                        <span class="like-label">Yêu thích</span>
                        <span class="like-count">(1)</span>
                    </button>
                    <button type="button" class="btn-story-message" onclick="window.focusStoryChat('${item.id}')">
                        <span>Nhắn dặn dò</span>
                    </button>
                </div>
            </div>
        </div>
    `;
}

function resolveTimelineImageUrl(item, pet) {
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

    let rawImage = candidates.find(value => typeof value === 'string' && value.trim() !== '');

    // Nếu ảnh là ảnh chibi / clip-art cũ (như catcute, dogcute, cat10, pet3), ưu tiên thay thế bằng ảnh chụp Spa thực tế 100%
    if (rawImage && (rawImage.includes('catcute') || rawImage.includes('dogcute') || rawImage.includes('cat10') || rawImage.includes('/publics/'))) {
        rawImage = null;
    }

    if (!rawImage) {
        rawImage = getTimelineFallbackImage(item, pet);
    }

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

function getTimelineFallbackImage(item, pet) {
    const rawSpecies = (pet?.species || 'dog').toLowerCase();
    const speciesKey = rawSpecies === 'cat' ? 'cat' : (rawSpecies === 'dog' ? 'dog' : 'default');
    const group = TIMELINE_FALLBACK_IMAGES[speciesKey] || TIMELINE_FALLBACK_IMAGES.default;

    const status = `${item.status || ''} ${item.description || ''}`.toLowerCase();

    if (status.includes('sấy')) return group.dry;
    if (status.includes('tắm')) return group.bath;
    if (status.includes('tiếp nhận') || status.includes('kiểm tra')) return group.receive;
    if (status.includes('cắt') || status.includes('tỉa') || status.includes('chải') || status.includes('tạo kiểu')) {
        return group.trim;
    }
    if (status.includes('hoàn thành')) return group.complete;

    return group.default;
}

window.toggleStoryLike = function(btn) {
    if (!btn) return;
    const isLiked = btn.classList.contains('liked');
    const countEl = btn.querySelector('.like-count');
    let count = parseInt(countEl?.textContent || '0', 10);
    if (isLiked) {
        btn.classList.remove('liked');
        if (countEl) countEl.textContent = Math.max(0, count - 1);
    } else {
        btn.classList.add('liked');
        if (countEl) countEl.textContent = count + 1;
        btn.classList.add('animate-heart');
        setTimeout(() => btn.classList.remove('animate-heart'), 400);
    }
};

window.focusStoryChat = function(itemId) {
    let chatInput = document.getElementById(`chatInput-${itemId}`);
    if (chatInput) {
        chatInput.focus();
        chatInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
        const card = document.querySelector(`[data-item-id="${itemId}"] .story-card-body`);
        if (card) {
            let existingBox = card.querySelector('.urgent-chat-box');
            if (!existingBox) {
                const boxHtml = buildChatBoxHtml(itemId);
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = boxHtml;
                const footer = card.querySelector('.story-card-footer');
                card.insertBefore(tempDiv.firstElementChild, footer);
                loadChatMessages(itemId);
                bindChatInputEvents(itemId);
                const newInput = document.getElementById(`chatInput-${itemId}`);
                if (newInput) {
                    newInput.focus();
                    newInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }
};

function setupDiaryImageModal() {
    const modal = document.getElementById('diaryImageModal');
    const closeBtn = document.getElementById('diaryModalClose');
    const backdrop = document.getElementById('diaryModalBackdrop');
    const modalImg = document.getElementById('diaryModalImg');
    const modalCaption = document.getElementById('diaryModalCaption');

    if (!modal) return;

    const closeModal = () => {
        modal.classList.remove('show');
        setTimeout(() => { modal.style.display = 'none'; }, 200);
    };

    if (closeBtn) closeBtn.onclick = closeModal;
    if (backdrop) backdrop.onclick = closeModal;

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeModal();
        }
    });

    window.openDiaryImageModal = (src, caption) => {
        if (!modalImg) return;
        modalImg.src = src;
        if (modalCaption) modalCaption.textContent = caption || '';
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    };
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
   6. HÓA ĐƠN VÀ LỊCH SỬ DỊCH VỤ
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
    const countBadge = document.getElementById('historyCountBadge');
    if (countBadge) {
        countBadge.textContent = `${sessions ? sessions.length : 0} ca`;
    }
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
                <div class="history-status ${isActive ? 'status-active' : 'status-done'}">
                    ${escapeHtml(session.status)}
                </div>
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
    renderServiceStepper(session, currentPetObject);
    renderTimeline(session.timeline, session);
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
   7. DASHBOARD DỊCH VỤ ĐANG CHẠY VÀ BÉ CƯNG CHỌN NHANH
   ========================================================================== */

async function renderActiveServicesDashboard() {
    const dashboardState = document.getElementById('dashboardState');
    const emptyState = document.getElementById('emptyState');
    const activeContainer = document.getElementById('activeServicesContainer');
    const activeGrid = document.getElementById('activeServicesGrid');
    const pastContainer = document.getElementById('pastServicesContainer');
    const pastGrid = document.getElementById('pastServicesGrid');
    const quickPetsSection = document.getElementById('quickPetsSection');
    const quickPetsGrid = document.getElementById('quickPetsGrid');

    if (!dashboardState) return;

    const pets = (await getPets()).filter((pet) => !pet.isArchived);
    const activeSessions = [];
    const pastSessions = [];

    for (const pet of pets) {
        const logs = await getOrSeedTrackerLogs(pet);
        if (logs) {
            // 1. Ca đang diễn ra
            if (logs.currentSession && logs.currentSession.status === 'Đang thực hiện') {
                activeSessions.push({ pet, session: logs.currentSession });
            } else if (logs.currentSession && logs.currentSession.status === 'Hoàn thành') {
                pastSessions.push({ pet, session: logs.currentSession });
            }

            // 2. Ca lịch sử đã hoàn tất
            if (Array.isArray(logs.history)) {
                logs.history.forEach(session => {
                    if (!pastSessions.some(p => p.session.id === session.id)) {
                        pastSessions.push({ pet, session });
                    }
                });
            }
        }
    }

    // Sắp xếp các ca hoàn thành mới nhất lên đầu
    pastSessions.sort((a, b) => new Date(b.session.date) - new Date(a.session.date));

    dashboardState.classList.remove('d-none');

    // 1. Dịch vụ đang diễn ra
    if (activeSessions.length > 0 && activeContainer && activeGrid) {
        activeContainer.classList.remove('d-none');
        activeGrid.innerHTML = activeSessions.map(item => {
            const latestEvent = item.session.timeline && item.session.timeline.length > 0 ? item.session.timeline[0] : null;
            const statusText = latestEvent?.status || item.session.status || 'Đang thực hiện';
            const petImage = item.pet.avatar || '/assets/images/shared/default-pet.png';
            const serviceName = escapeHtml(item.session.service || 'Spa và Grooming').replace(/&/g, 'và');

            return `
                <div class="col-md-6 col-lg-5">
                    <div class="active-service-card">
                        <div class="active-service-pet-info">
                            <img src="${petImage}" alt="${escapeHtml(item.pet.name)}" class="active-service-avatar">
                            <div class="active-service-details">
                                <h5 class="active-service-name">${escapeHtml(item.pet.name)}</h5>
                                <p class="active-service-type">${serviceName}</p>
                                <span class="active-service-badge status-ongoing">${escapeHtml(statusText)}</span>
                            </div>
                        </div>
                        <button class="active-service-btn" type="button" data-pet-id="${escapeHtml(item.pet.id)}" data-session-id="${escapeHtml(item.session.id)}">
                            Vào xem nhật ký
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        activeGrid.querySelectorAll('.active-service-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await selectAndLoadPet(btn.getAttribute('data-pet-id'), btn.getAttribute('data-session-id'));
            });
        });
    } else {
        if (activeContainer) activeContainer.classList.add('d-none');
    }

    // 2. Lịch sử dịch vụ đã hoàn tất
    if (pastSessions.length > 0 && pastContainer && pastGrid) {
        pastContainer.classList.remove('d-none');
        pastGrid.innerHTML = pastSessions.map(item => {
            const petImage = item.pet.avatar || '/assets/images/shared/default-pet.png';
            const serviceName = escapeHtml(item.session.service || 'Spa và Grooming').replace(/&/g, 'và');
            const dateStr = formatDate(item.session.date);

            return `
                <div class="col-md-6 col-lg-5">
                    <div class="active-service-card past-service-card">
                        <div class="active-service-pet-info">
                            <img src="${petImage}" alt="${escapeHtml(item.pet.name)}" class="active-service-avatar">
                            <div class="active-service-details">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <h5 class="active-service-name m-0">${escapeHtml(item.pet.name)}</h5>
                                    <span class="active-service-date">${dateStr}</span>
                                </div>
                                <p class="active-service-type mb-2">${serviceName}</p>
                                <span class="active-service-badge status-completed">Hoàn thành</span>
                            </div>
                        </div>
                        <button class="active-service-btn" type="button" data-pet-id="${escapeHtml(item.pet.id)}" data-session-id="${escapeHtml(item.session.id)}">
                            Vào xem nhật ký
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        pastGrid.querySelectorAll('.active-service-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                await selectAndLoadPet(btn.getAttribute('data-pet-id'), btn.getAttribute('data-session-id'));
            });
        });
    } else {
        if (pastContainer) pastContainer.classList.add('d-none');
    }

    // 3. Trạng thái trống nếu không có ca nào
    if (activeSessions.length === 0 && pastSessions.length === 0) {
        if (emptyState) emptyState.classList.remove('d-none');
    } else {
        if (emptyState) emptyState.classList.add('d-none');
    }

    // 4. Danh sách bé cưng chọn nhanh (Quick-select Grid)
    if (quickPetsSection && quickPetsGrid) {
        if (pets.length > 0) {
            quickPetsSection.classList.remove('d-none');
            quickPetsGrid.innerHTML = pets.map(pet => {
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
                            <button class="quick-pet-btn" type="button">Xem nhật ký</button>
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
            quickPetsSection.classList.add('d-none');
        }
    }
}

/* ==========================================================================
   8. ĐỊNH DẠNG VÀ BẢO VỆ
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
    if (text === null || text === undefined) return '';
    // Tuân thủ AGENTS.md: Tuyệt đối không dùng ký hiệu & thay cho chữ "và" trong giao diện
    const cleanedText = String(text).replace(/\s*&\s*/g, ' và ');
    const div = document.createElement('div');
    div.textContent = cleanedText;
    return div.innerHTML;
}

export const init = initPetDiary;
window.initPetDiary = initPetDiary;
