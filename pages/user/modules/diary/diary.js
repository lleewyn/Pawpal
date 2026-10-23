/**
 * modules/diary/diary.js - Module Nhật ký chăm sóc PawPal
 * Nhật ký chăm sóc chỉ đọc từ Supabase Cloud.
 */
import { getPets } from '/scripts/api/petService.js?v=20261001-dedup';

let liveDiaryState = {};
let currentPetId = null;
let currentPetObject = null;
let currentSessionId = null;
let diaryHashHandler = null;
let diaryChannel = null;
let diaryRefreshTimer;

// user.js nạp lại module mỗi lần vào trang; gỡ listener cũ để không vẽ đè nhật ký của lần trước
export function dispose() {
    if (diaryHashHandler) window.removeEventListener('hashchange', diaryHashHandler);
    diaryHashHandler = null;
    clearTimeout(diaryRefreshTimer);
    const db = window.getSupabaseClient?.() || window.SupabaseClient;
    if (diaryChannel) db?.removeChannel(diaryChannel);
    diaryChannel = null;
}

function getTrackerLogs() { return liveDiaryState; }
function saveTrackerLogs(logs) { liveDiaryState = logs; }

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
    toast.textContent = msg;
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

    dispose();
    diaryHashHandler = async () => {
        if (window.location.hash.includes('diary')) {
            const targetPetId = getRouteParam('id') || getRouteParam('pet') || getRouteParam('petId');
            const targetSessionId = getRouteParam('sessionId') || getRouteParam('session');
            const petChanged = targetPetId && String(targetPetId) !== String(currentPetId);
            const sessionChanged = targetSessionId && String(targetSessionId) !== String(currentSessionId);
            if (targetPetId && (petChanged || sessionChanged)) {
                await selectAndLoadPet(targetPetId, targetSessionId, { allowDefaultFallback: false });
            } else if (!targetPetId) {
                const defaultId = await getDefaultPetIdToLoad();
                if (defaultId && defaultId !== currentPetId) {
                    await selectAndLoadPet(defaultId);
                }
            }
        }
    };
    window.addEventListener('hashchange', diaryHashHandler);
    const db = window.getSupabaseClient?.() || window.SupabaseClient;
    if (db?.channel) {
        diaryChannel = db.channel('own-pet-diary');
        for (const table of ['care_log','care_log_media','appointment','pet_profile','pet_weight_history']) {
            diaryChannel.on('postgres_changes', {event:'*',schema:'public',table}, () => {
                clearTimeout(diaryRefreshTimer);
                diaryRefreshTimer = setTimeout(() => {
                    if (currentPetId && window.location.hash.includes('diary')) {
                        selectAndLoadPet(currentPetId,currentSessionId,{allowDefaultFallback:false})
                            .catch(() => showToast('Không thể cập nhật nhật ký. Vui lòng tải lại.', 'error'));
                    }
                },250);
            });
        }
        diaryChannel.subscribe();
    }

    const petIdFromUrl = getRouteParam('id') || getRouteParam('pet') || getRouteParam('petId');
    const sessionIdFromUrl = getRouteParam('sessionId') || getRouteParam('session');

    let targetPetId = petIdFromUrl || (petSelector && petSelector.value);
    if (!targetPetId) {
        targetPetId = await getDefaultPetIdToLoad();
    }

        if (targetPetId) {
            await selectAndLoadPet(targetPetId, sessionIdFromUrl, { allowDefaultFallback: !petIdFromUrl });
        } else {
            showEmptyPetState();
        }
    } catch (error) {
        showToast('Không thể tải nhật ký chăm sóc. Vui lòng thử lại.', 'error');
        const wrapper = document.getElementById('timelineWrapper');
        if (wrapper) { wrapper.textContent = 'Không thể tải nhật ký chăm sóc. Vui lòng thử lại.'; wrapper.setAttribute('role', 'alert'); }
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
    const titleEl = emptyState?.querySelector('.empty-title');
    const descEl = emptyState?.querySelector('.empty-desc');
    const actionEl = emptyState?.querySelector('.btn-add-pet-cta');

    if (skeletonEl) skeletonEl.classList.add('d-none');
    if (dashboardState) dashboardState.classList.remove('d-none');
    if (diaryContent) diaryContent.classList.add('d-none');
    if (emptyState) emptyState.classList.remove('d-none');
    if (petSelector) petSelector.value = '';
    if (titleEl) titleEl.textContent = 'Chưa có hồ sơ bé cưng';
    if (descEl) descEl.textContent = 'Bạn chưa đăng ký bé cưng nào trong hệ thống. Hãy thêm bé cưng để theo dõi nhật ký chăm sóc thời gian thực!';
    if (actionEl) {
        actionEl.href = '#pets';
        actionEl.textContent = 'Thêm bé cưng ngay';
    }

    updateDiaryBreadcrumb('');
}

function showPetNotFoundState(petId) {
    const dashboardState = document.getElementById('dashboardState');
    const diaryContent = document.getElementById('diaryContent');
    const emptyState = document.getElementById('emptyState');
    const skeletonEl = document.getElementById('diaryLoadingSkeleton');
    const titleEl = emptyState?.querySelector('.empty-title');
    const descEl = emptyState?.querySelector('.empty-desc');
    const actionEl = emptyState?.querySelector('.btn-add-pet-cta');

    currentPetId = null;
    currentPetObject = null;

    if (skeletonEl) skeletonEl.classList.add('d-none');
    if (diaryContent) diaryContent.classList.add('d-none');
    if (dashboardState) dashboardState.classList.remove('d-none');
    if (emptyState) emptyState.classList.remove('d-none');
    if (titleEl) titleEl.textContent = 'Không tìm thấy nhật ký bé cưng';
    if (descEl) descEl.textContent = `Mã ${petId} không tồn tại hoặc không thuộc tài khoản đang đăng nhập.`;
    if (actionEl) {
        actionEl.href = '#diary';
        actionEl.textContent = 'Xem nhật ký của các bé';
    }
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

async function selectAndLoadPet(petId, targetSessionId = null, { allowDefaultFallback = true } = {}) {
    const emptyState = document.getElementById('emptyState');
    const diaryContent = document.getElementById('diaryContent');
    const dashboardState = document.getElementById('dashboardState');
    const skeletonEl = document.getElementById('diaryLoadingSkeleton');

    if (!petId) {
        await showDashboardState();
        return;
    }

    const requestedPetId = String(petId).trim();
    const pets = await getPets();
    const pet = pets.find(p => 
        String(p.id).toLowerCase() === requestedPetId.toLowerCase() ||
        String(p.code || '').toLowerCase() === requestedPetId.toLowerCase() ||
        String(p.name).toLowerCase() === requestedPetId.toLowerCase()
    );

    if (!pet) {
        if (allowDefaultFallback) {
            const fallbackId = await getDefaultPetIdToLoad();
            if (fallbackId && String(fallbackId) !== requestedPetId) {
                await selectAndLoadPet(fallbackId, targetSessionId);
                return;
            }
        }
        showPetNotFoundState(requestedPetId);
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

    const sessionQuery = targetSessionId ? `&sessionId=${encodeURIComponent(targetSessionId)}` : '';
    const targetHash = `#diary?id=${encodeURIComponent(currentPetId)}${sessionQuery}`;
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
    const logs = await syncPetDiaryFromSupabase(pet);
    liveDiaryState[pet.id] = logs;

    const { currentSession, history = [] } = logs;

    const allSessions = [];
    if (currentSession) allSessions.push({ ...currentSession, isCurrent: true });
    [...history].reverse().forEach(s => allSessions.push({ ...s, isCurrent: false }));

    // Chọn phiên dịch vụ kích hoạt. Khi mở từ một lịch hẹn cụ thể (targetSessionId) mà ca đó
    // chưa có nhật ký thì hiển thị trạng thái trống, không mở nhầm nhật ký của ca khác.
    let activeSession = null;
    if (targetSessionId) {
        activeSession = allSessions.find(s => String(s.id).toLowerCase() === String(targetSessionId).toLowerCase());
        if (!activeSession) showToast('Ca dịch vụ này chưa có nhật ký chăm sóc.', 'info');
    }
    if (!activeSession && !targetSessionId) {
        activeSession = currentSession || (allSessions.length > 0 ? allSessions[0] : null);
    }

    renderPetInfoCard(pet, currentSession);
    renderServiceStepper(activeSession, pet);

    renderHistorySidebar(allSessions.map(s => ({
        ...s,
        isCurrent: activeSession ? (String(s.id) === String(activeSession.id)) : (targetSessionId ? false : s.isCurrent)
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
    if (!db) throw new Error('Không thể kết nối nhật ký.');

    try {
        const petUuid = pet._supabaseId || pet.id;
        
        // 1. Tìm các lịch hẹn thuộc về bé cưng này
        let apptQuery = db.from('appointment')
            .select('id, appointment_code, scheduled_start_at, appointment_status, appointment_item(name_snapshot)').eq('customer_id',pet.userId);
        
        if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(petUuid)) {
            apptQuery = apptQuery.eq('pet_id', petUuid);
        } else {
            const { data: petRec } = await db.from('pet_profile').select('id').eq('pet_code', petUuid).limit(1);
            if (petRec?.length) {
                apptQuery = apptQuery.eq('pet_id', petRec[0].id);
            } else {
                return null;
            }
        }

        const { data: apptRows, error: apptErr } = await apptQuery;
        if (apptErr) throw apptErr;
        if (!apptRows?.length) return {currentSession:null,history:[]};

        const apptIds = apptRows.map(a => a.id);
        const apptMap = new Map(apptRows.map(a => [a.id, a]));

        // 2. Tải nhật ký chăm sóc theo danh sách appointment_id
        const { data, error } = await db.from('care_log')
            .select(`
                id,
                appointment_id,
                description,
                observed_condition,
                recorded_at,
                action_name_snapshot,
                care_action ( action_name ),
                care_log_media ( media_url )
            `)
            .in('appointment_id', apptIds)
            .order('recorded_at', { ascending: false });

        if (error) {
            throw error;
        }

        if (!data?.length) return {currentSession:null,history:[]};

        const sessionsMap = {};

        for (const log of data) {
            const aptId = log.appointment_id || 'no-appointment';
            const apt = apptMap.get(aptId);
            const serviceName = apt?.appointment_item?.[0]?.name_snapshot || 'Chăm sóc tại tiệm';
            const aptDate = apt?.scheduled_start_at ? apt.scheduled_start_at.split('T')[0] : log.recorded_at.split('T')[0];

            if (!sessionsMap[aptId]) {
                sessionsMap[aptId] = {
                    id: apt?.appointment_code || aptId,
                    service: serviceName,
                    date: aptDate,
                    status: mapAppointmentStatus(apt?.appointment_status),
                    timeline: [],
                    invoice: null
                };
            }

            const mediaUrl = log.care_log_media?.[0]?.media_url || null;
            const staffName = 'Kỹ thuật viên PawPal';

            sessionsMap[aptId].timeline.push({
                id: log.id,
                status: log.action_name_snapshot || log.care_action?.action_name || 'Cập nhật',
                description: log.description || log.observed_condition || '',
                timestamp: log.recorded_at,
                staff: staffName,
                image: mediaUrl,
                urgent: log.observed_condition && !['Tốt', 'Bình thường', 'Ổn định'].includes(log.observed_condition)
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
        throw err;
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

async function getOrSeedTrackerLogs(pet) {
 const logs = await syncPetDiaryFromSupabase(pet); liveDiaryState[pet.id] = logs; return logs;
}

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
                    <span>Đặt lịch mới</span>
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
        { num: 1, title: 'Tiếp nhận', sub: 'Bàn giao bé cưng' },
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
    const technician = session.technician || 'Nhân viên chăm sóc';
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

window.submitCareLogReview = function() { window.location.hash = '#bookings'; };

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
            badgeText: 'Cắt tỉa và Tạo form',
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
        badgeText: 'Tiếp nhận',
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
                        <span>Chăm sóc: ${escapeHtml(item.staff || 'Nhân viên chăm sóc')}</span>
                    </div>
                </div>

                ${isUrgent ? `
                <div class="timeline-urgent-banner">
                    <span>LƯU Ý QUAN TRỌNG TỪ NHÂN VIÊN</span>
                </div>` : ''}

                <!-- Tiêu đề và Lời nhắn -->
                <h4 class="story-card-title">${escapeHtml(item.status)}</h4>
                <p class="story-card-desc">${escapeHtml(item.description)}</p>

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
                    <button type="button" class="btn-story-message" onclick="window.location.hash='#support'">
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
    if (!rawImage) return '';

    if (rawImage && !rawImage.startsWith('http') && !rawImage.startsWith('data:') && !rawImage.startsWith('/')) {
        rawImage = '/' + rawImage;
    }

    try {
        const url = new URL(rawImage, window.location.href);
        return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
    } catch {
        return rawImage;
    }
}

function getTimelineFallbackImage() { return ''; }

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

function sendChatMessage() { window.location.hash = '#support'; }

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

    const targetHash = `#diary?id=${encodeURIComponent(currentPetId)}&sessionId=${encodeURIComponent(session.id)}`;
    if (window.location.hash !== targetHash) {
        history.replaceState(null, '', targetHash);
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
