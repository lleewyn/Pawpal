/* ==========================================================================
   booking.js — 4-step booking flow, load dịch vụ từ dichvu.csv
   ========================================================================== */

// ── State ─────────────────────────────────────────────────────────────────────
const state = {
    currentStep: 1,
    services: [],          // all services from CSV
    activeType: 'spa',     // 'spa' | 'hotel'
    selectedService: null, // service object
    isMember: false,
    memberPets: [],
    selectedPetId: null,
    petInfo: {},
    schedule: {
        date: null,
        slot: null,
        checkIn: null,
        checkOut: null,
        nights: 0,
    },
    selectedStaffId: null,
    selectedStaffName: null,
    currentHoldId: null,
    addons: {
        meal: false,
        walk: false, walkQty: 1,
        play: false, playQty: 1,
        bath: false, bathQty: 1,
    }
};

// ── Time slots (simulated availability) ──────────────────────────────────────
const ALL_SLOTS = ['08:00','08:30','09:00','09:30','10:00','10:30',
                   '11:00','13:00','13:30','14:00','14:30','15:00',
                   '15:30','16:00','16:30','17:00'];

// Slots that are "busy" — in real app this comes from backend
const BUSY_SLOTS = ['09:00','10:30','14:00','15:30'];

const STAFF_MEMBERS = [
    { id: 'NV01', name: 'Thảo', role: 'Chăm sóc Spa' },
    { id: 'NV02', name: 'Hưng', role: 'Chuyên viên Grooming' },
    { id: 'NV03', name: 'Linh', role: 'Chăm sóc Pet Hotel' },
    { id: 'NV04', name: 'Minh', role: 'Bảo mẫu VIP' }
];

const HOLD_STORAGE_KEY = 'pawpal_booking_holds';
const CURRENT_HOLD_KEY = 'pawpal_current_booking_hold';
let holdBannerTimer = null;

// ── Parse CSV ─────────────────────────────────────────────────────────────────
function parseCSV(text) {
    const records = [];
    let cur = [];
    let field = '';
    let inQ = false;
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            inQ = !inQ;
        } else if (ch === '\t' && !inQ) {
            cur.push(field);
            field = '';
        } else if (ch === '\n' && !inQ) {
            cur.push(field);
            records.push(cur);
            cur = [];
            field = '';
        } else if (ch === '\r' && !inQ) {
            // skip \r if not in quotes
        } else {
            field += ch;
        }
    }
    if (field || cur.length > 0) {
        cur.push(field);
        if (cur.length > 1 || cur[0].trim() !== '') records.push(cur);
    }
    
    if (records.length === 0) return [];
    
    const headers = records[0];
    return records.slice(1).map(row => {
        const obj = {};
        headers.forEach((h, i) => { 
            if (h) obj[h.trim()] = (row[i] || '').trim(); 
        });
        return obj;
    }).filter(row => Object.keys(row).length > 0 && Object.values(row).some(v => v));
}

function mapService(row) {
    const k = Object.keys(row);
    return {
        category:  row[k[0]] || '',
        id:        row[k[1]] || '',
        name:      row[k[2]] || '',
        petType:   row[k[3]] || '',
        weight:    row[k[4]] || '',
        price:     row[k[5]] || '',
        priceNum:  parseInt((row[k[5]] || '0').replace(/\D/g, '')) || 0,
        duration:  row[k[7]] || '',
        desc:      row[k[8]] || '',
        status:    row[k[10]] || '',
        isHotel:   (row[k[1]] || '').startsWith('HTL'),
    };
}

function getBookingHolds() {
    try {
        const raw = localStorage.getItem(HOLD_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveBookingHolds(holds) {
    const valid = holds.filter(h => !isHoldExpired(h));
    localStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify(valid));
}

function isHoldExpired(hold) {
    return new Date(hold.expiresAt) <= new Date();
}

function cleanupExpiredHolds() {
    const holds = getBookingHolds();
    const active = holds.filter(h => !isHoldExpired(h));
    if (active.length !== holds.length) {
        saveBookingHolds(active);
    }
}

function getActiveHolds() {
    return getBookingHolds().filter(h => !isHoldExpired(h));
}

function getHoldKey(hold) {
    if (hold.serviceId && hold.slot && hold.date) {
        return `${hold.serviceId}|${hold.date}|${hold.slot}`;
    }
    if (hold.serviceId && hold.checkIn && hold.checkOut) {
        return `${hold.serviceId}|${hold.checkIn}|${hold.checkOut}|HOTEL`;
    }
    return '';
}

function getSelectedScheduleKey() {
    if (state.selectedService?.isHotel) {
        return `${state.selectedService.id}|${state.schedule.checkIn || ''}|${state.schedule.checkOut || ''}|HOTEL`;
    }
    return `${state.selectedService?.id || ''}|${state.schedule.date || ''}|${state.schedule.slot || ''}`;
}

function findHoldForCurrentSelection() {
    const key = getSelectedScheduleKey();
    if (!key) return null;
    return getActiveHolds().find(h => getHoldKey(h) === key);
}

function isSlotHeldByOther() {
    const currentKey = getSelectedScheduleKey();
    if (!currentKey) return false;
    const hold = getActiveHolds().find(h => getHoldKey(h) === currentKey);
    return hold && hold.id !== state.currentHoldId;
}

function stopHoldCountdown() {
    if (holdBannerTimer) {
        clearInterval(holdBannerTimer);
        holdBannerTimer = null;
    }
}

function startHoldCountdown() {
    stopHoldCountdown();
    if (!state.currentHoldId) return;
    holdBannerTimer = setInterval(() => {
        const hold = getActiveHolds().find(h => h.id === state.currentHoldId);
        if (!hold) {
            updateBookingHoldBanner();
            stopHoldCountdown();
            return;
        }
        updateBookingHoldBanner();
    }, 1000);
}

function releaseCurrentHold() {
    if (!state.currentHoldId) return;
    const holds = getActiveHolds().filter(h => h.id !== state.currentHoldId);
    saveBookingHolds(holds);
    localStorage.removeItem(CURRENT_HOLD_KEY);
    state.currentHoldId = null;
    stopHoldCountdown();
}

function createHold() {
    if (!state.selectedService) return;
    const key = getSelectedScheduleKey();
    if (!key) return;

    if (isSlotHeldByOther()) {
        alert('Xin lỗi, lịch này vừa được giữ bởi khách hàng khác. Vui lòng chọn lịch khác.');
        return;
    }

    if (state.currentHoldId) {
        const existing = getActiveHolds().find(h => h.id === state.currentHoldId);
        if (existing) {
            if (getHoldKey(existing) !== key) {
                releaseCurrentHold();
            } else {
                existing.staffId = state.selectedStaffId || existing.staffId;
                existing.staffName = state.selectedStaffName || existing.staffName;
                existing.expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                const holds = getActiveHolds().map(h => h.id === existing.id ? existing : h);
                saveBookingHolds(holds);
                localStorage.setItem(CURRENT_HOLD_KEY, existing.id);
                state.currentHoldId = existing.id;
                updateBookingHoldBanner();
                return;
            }
        }
    }

    const hold = {
        id: 'HOLD-' + Math.floor(100000 + Math.random() * 900000),
        ownerPhone: state.petInfo.ownerPhone || 'guest',
        ownerName: state.petInfo.ownerName || 'Khách hàng',
        serviceId: state.selectedService.id,
        serviceName: state.selectedService.name,
        date: state.schedule.date || state.schedule.checkIn || '',
        slot: state.schedule.slot || 'HOTEL',
        checkIn: state.schedule.checkIn || '',
        checkOut: state.schedule.checkOut || '',
        staffId: state.selectedStaffId || '',
        staffName: state.selectedStaffName || '',
        expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
    };

    const holds = getActiveHolds();
    holds.push(hold);
    saveBookingHolds(holds);
    localStorage.setItem(CURRENT_HOLD_KEY, hold.id);
    state.currentHoldId = hold.id;
    updateBookingHoldBanner();
}

function updateBookingHoldBanner() {
    const banner = document.getElementById('bookingHoldBanner');
    if (!banner) return;

    const hold = getActiveHolds().find(h => h.id === state.currentHoldId);
    if (hold) {
        const diff = Math.max(0, new Date(hold.expiresAt) - new Date());
        if (diff <= 0) {
            banner.style.display = 'none';
            stopHoldCountdown();
            return;
        }
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        const scheduleText = hold.slot !== 'HOTEL' ? `${hold.date} lúc ${hold.slot}` : `${hold.date}`;
        banner.innerHTML = `
            <div class="booking-hold-banner-row">
                <div class="booking-hold-banner-text">
                    <strong>🛡️ Giữ chỗ thành công</strong><br>
                    Bạn đang giữ lịch ${scheduleText} với nhân viên <strong>${hold.staffName || 'Ngẫu nhiên'}</strong>.
                </div>
                <div class="booking-hold-countdown">Còn lại <strong>${timeText}</strong></div>
            </div>
        `;
        banner.style.display = 'block';
        if (!holdBannerTimer) startHoldCountdown();
    } else {
        banner.style.display = 'none';
        stopHoldCountdown();
    }
}

function loadCurrentHold() {
    cleanupExpiredHolds();
    const holdId = localStorage.getItem(CURRENT_HOLD_KEY);
    if (!holdId) return;
    const hold = getActiveHolds().find(h => h.id === holdId);
    if (!hold) {
        localStorage.removeItem(CURRENT_HOLD_KEY);
        return;
    }

    state.currentHoldId = hold.id;
    state.selectedStaffId = hold.staffId;
    state.selectedStaffName = hold.staffName;
    state.selectedService = state.services.find(s => s.id === hold.serviceId) || state.selectedService;
    if (state.selectedService) {
        state.activeType = state.selectedService.isHotel ? 'hotel' : 'spa';
    }
    if (hold.date) {
        state.schedule.date = hold.date;
        state.schedule.slot = hold.slot !== 'HOTEL' ? hold.slot : null;
    }
    if (hold.checkIn) {
        state.schedule.checkIn = hold.checkIn;
        state.schedule.checkOut = hold.checkOut;
    }
}

// ── Step navigation ───────────────────────────────────────────────────────────
function goToStep(n) {
    // Update panels
    document.querySelectorAll('.booking-step-panel').forEach(p => p.classList.remove('active'));
    document.getElementById('step' + n).classList.add('active');

    // Update stepper
    document.querySelectorAll('.step').forEach(s => {
        const num = parseInt(s.dataset.step);
        s.classList.remove('active', 'done');
        if (num === n) s.classList.add('active');
        if (num < n)  s.classList.add('done');
    });

    // Update step lines
    document.querySelectorAll('.step-line').forEach((line, i) => {
        line.classList.toggle('done', i < n - 1);
    });

    state.currentStep = n;
    updateSummary();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Step 1: Service list ──────────────────────────────────────────────────────
function renderServiceList() {
    const list = document.getElementById('svcSelectList');
    document.querySelectorAll('.svc-type-tab').forEach(t => t.classList.toggle('active', t.dataset.type === state.activeType));
    const filtered = state.services.filter(s =>
        state.activeType === 'spa' ? !s.isHotel : s.isHotel
    );

    list.innerHTML = filtered.map(svc => {
        const statusStr = (svc.status || '').toLowerCase();
        const isPaused = statusStr.includes('ngưng') || statusStr.includes('ngng') || statusStr.includes('tạm') || statusStr.includes('tm');
        const isSelected = state.selectedService?.id === svc.id;
        return `
        <div class="svc-select-card ${isSelected ? 'selected' : ''} ${isPaused ? 'paused' : ''}"
             data-id="${svc.id}" role="button" tabindex="${isPaused ? -1 : 0}"
             aria-label="Chọn ${svc.name}">
            <div class="svc-select-radio"></div>
            <div class="svc-select-info">
                <p class="svc-select-name">${svc.name}</p>
                <p class="svc-select-meta">
                    🐾 ${svc.petType.includes('/') ? 'Chó & Mèo' : svc.petType} &nbsp;·&nbsp;
                    ⚖️ ${svc.weight} &nbsp;·&nbsp;
                    ⏱ ${svc.duration}
                </p>
                <p class="svc-select-meta" style="margin-top:3px;color:var(--color-text-light);">${svc.desc}</p>
            </div>
            <div class="svc-select-price">
                <p class="svc-price-main">${svc.price}</p>
                <p class="svc-price-duration">${svc.isHotel ? 'mỗi đêm' : svc.duration}</p>
            </div>
            ${isPaused ? '<span class="svc-paused-badge">Tạm ngưng</span>' : ''}
        </div>`;
    }).join('');

    // Bind click
    list.querySelectorAll('.svc-select-card:not(.paused)').forEach(card => {
        card.addEventListener('click', () => selectService(card.dataset.id));
        card.addEventListener('keydown', e => { if (e.key === 'Enter') selectService(card.dataset.id); });
    });
}

function selectService(id) {
    state.selectedService = state.services.find(s => s.id === id) || null;
    state.selectedStaffId = null;
    state.selectedStaffName = null;
    state.schedule = { date: null, slot: null, checkIn: null, checkOut: null, nights: 0 };
    releaseCurrentHold();
    renderServiceList();
    renderStaffList();
    document.getElementById('step2Next').disabled = !state.selectedService;
    updateSummary();
}

// ── Step 3: Time slots ────────────────────────────────────────────────────────
function renderTimeSlots() {
    const grid = document.getElementById('timeslotGrid');
    grid.innerHTML = ALL_SLOTS.map(slot => {
        const busy = BUSY_SLOTS.includes(slot);
        const hold = getActiveHolds().find(h =>
            h.date === state.schedule.date && h.slot === slot && h.serviceId === state.selectedService?.id
        );
        const heldByOther = hold && hold.id !== state.currentHoldId;
        const selected = state.schedule.slot === slot;
        return `<button class="timeslot-btn ${selected ? 'selected' : ''} ${heldByOther ? 'held' : ''}"
                    data-slot="${slot}" ${(busy || heldByOther) ? 'disabled' : ''}
                    aria-label="${slot}${busy ? ' (đã đầy)' : heldByOther ? ' (Đang chờ)' : ''}">
                    ${slot}${busy ? '<br><small>Đầy</small>' : heldByOther ? '<br><small>Đang chờ</small>' : ''}
                </button>`;
    }).join('');

    grid.querySelectorAll('.timeslot-btn:not(:disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            const priorSlot = state.schedule.slot;
            state.schedule.slot = btn.dataset.slot;
            if (priorSlot && priorSlot !== state.schedule.slot) {
                releaseCurrentHold();
            }
            renderTimeSlots();
            checkStep3Valid();
            maybeCreateHold();
        });
    });
}

function renderStaffList() {
    const list = document.getElementById('staffList');
    if (!list) return;
    list.innerHTML = STAFF_MEMBERS.map(member => {
        const selected = state.selectedStaffId === member.id;
        return `
            <div class="staff-card ${selected ? 'selected' : ''}" data-id="${member.id}" role="button" tabindex="0">
                <div class="staff-card-avatar">${member.name.slice(0, 1)}</div>
                <div class="staff-card-info">
                    <h4>${member.name}</h4>
                    <p>${member.role}</p>
                </div>
                <div class="staff-card-status">${selected ? 'Đã chọn' : 'Chọn'}</div>
            </div>`;
    }).join('');

    list.querySelectorAll('.staff-card').forEach(card => {
        card.addEventListener('click', () => selectStaff(card.dataset.id));
    });
}

function selectStaff(staffId) {
    const staff = STAFF_MEMBERS.find(s => s.id === staffId);
    if (!staff) return;
    state.selectedStaffId = staff.id;
    state.selectedStaffName = staff.name;
    renderStaffList();
    maybeCreateHold();
    checkStep3Valid();
    updateSummary();
}

function maybeCreateHold() {
    const svc = state.selectedService;
    if (!svc) return;
    if (svc.isHotel) {
        if (state.schedule.checkIn && state.schedule.checkOut && state.selectedStaffId) {
            createHold();
        }
    } else {
        if (state.schedule.date && state.schedule.slot && state.selectedStaffId) {
            createHold();
        }
    }
}

function checkStep3Valid() {
    const svc = state.selectedService;
    let valid = false;
    if (svc?.isHotel) {
        valid = !!(state.schedule.checkIn && state.schedule.checkOut &&
                   state.schedule.checkOut > state.schedule.checkIn &&
                   state.selectedStaffId && !isSlotHeldByOther());
    } else {
        valid = !!(state.schedule.date && state.schedule.slot && state.selectedStaffId &&
                   !isSlotHeldByOther());
    }
    document.getElementById('step3Next').disabled = !valid;
    updateSummary();
}

// ── Step 4: Confirm summary ───────────────────────────────────────────────────
function buildConfirmSummary() {
    const svc = state.selectedService;
    const pet = state.petInfo;
    const sch = state.schedule;

    let dateStr = '';
    let priceStr = svc?.price || '—';

    if (svc?.isHotel && sch.checkIn && sch.checkOut) {
        const nights = Math.round((new Date(sch.checkOut) - new Date(sch.checkIn)) / 86400000);
        dateStr = `Check-in: ${formatDate(sch.checkIn)}<br>Check-out: ${formatDate(sch.checkOut)}<br>${nights} đêm`;
        
        let total = svc.priceNum * nights;
        let addonStr = '';
        if(state.addons.meal) { total += 30000 * nights; addonStr += `<br><small style="color:var(--color-text-light)">+ Dinh dưỡng riêng (${nights} ngày)</small>`; }
        if(state.addons.walk) { total += 40000 * state.addons.walkQty; addonStr += `<br><small style="color:var(--color-text-light)">+ Dạo ngoài trời (${state.addons.walkQty} lượt)</small>`; }
        if(state.addons.play) { total += 20000 * state.addons.playQty; addonStr += `<br><small style="color:var(--color-text-light)">+ Chơi tương tác (${state.addons.playQty} lượt)</small>`; }
        if(state.addons.bath) { total += 150000 * state.addons.bathQty; addonStr += `<br><small style="color:var(--color-text-light)">+ Tắm vệ sinh (${state.addons.bathQty} lượt)</small>`; }
        
        priceStr = formatVND(total) + `<br><small style="font-weight:normal;color:var(--color-text-light)">(${nights} đêm × ${svc.price})</small>${addonStr}`;
    } else if (sch.date && sch.slot) {
        dateStr = `${formatDate(sch.date)} lúc ${sch.slot}`;
    }

    document.getElementById('confirmSummary').innerHTML = `
        <div class="confirm-warning-note">
            <strong>📌 Lưu ý:</strong> Mức giá hiển thị chỉ là giá dự kiến dựa trên số cân nặng do khách hàng tự khai báo. Khi khách hàng mang bé cưng đến cửa hàng, nhân viên xin phép cân lại thực tế để áp mức giá niêm yết chính xác nhất.
        </div>
        <div class="confirm-row">
            <span class="confirm-icon">✂️</span>
            <div class="confirm-row-content">
                <p class="confirm-row-label">Dịch vụ</p>
                <p class="confirm-row-value">${svc?.name || '—'}<br>
                    <small style="font-weight:500;color:var(--color-text-light);">${svc?.category || ''}</small>
                </p>
            </div>
            <button class="confirm-edit-btn" onclick="goToStep(1)">Sửa</button>
        </div>
        <div class="confirm-row">
            <span class="confirm-icon">🐾</span>
            <div class="confirm-row-content">
                <p class="confirm-row-label">Thú cưng</p>
                <p class="confirm-row-value">${pet.petName || '—'} (${pet.petType || ''})
                    ${pet.petBreed ? '· ' + pet.petBreed : ''}
                    ${pet.petWeight ? '· ' + pet.petWeight + 'kg' : ''}
                    ${pet.groomingStyle ? '<br><small style="color:var(--color-text-light)">✂️ Kiểu cắt: ' + pet.groomingStyle + '</small>' : ''}
                </p>
            </div>
            <button class="confirm-edit-btn" onclick="goToStep(2)">Sửa</button>
        </div>
        <div class="confirm-row">
            <span class="confirm-icon">👤</span>
            <div class="confirm-row-content">
                <p class="confirm-row-label">Chủ nuôi</p>
                <p class="confirm-row-value">${pet.ownerName || '—'} · ${pet.ownerPhone || '—'}</p>
            </div>
            <button class="confirm-edit-btn" onclick="goToStep(2)">Sửa</button>
        </div>
        <div class="confirm-row">
            <span class="confirm-icon">�</span>
            <div class="confirm-row-content">
                <p class="confirm-row-label">Nhân viên</p>
                <p class="confirm-row-value">${state.selectedStaffName || 'Ngẫu nhiên'}</p>
            </div>
            <button class="confirm-edit-btn" onclick="goToStep(3)">Sửa</button>
        </div>
        <div class="confirm-row">
            <span class="confirm-icon">�📅</span>
            <div class="confirm-row-content">
                <p class="confirm-row-label">Lịch hẹn</p>
                <p class="confirm-row-value">${dateStr || '—'}</p>
            </div>
            <button class="confirm-edit-btn" onclick="goToStep(3)">Sửa</button>
        </div>
        <div class="confirm-row">
            <span class="confirm-icon">💰</span>
            <div class="confirm-row-content">
                <p class="confirm-row-label">Tổng tiền</p>
                <p class="confirm-row-value price">${priceStr}</p>
            </div>
        </div>`;
}

// ── Summary sidebar ───────────────────────────────────────────────────────────
function updateSummary() {
    const svc = state.selectedService;
    const pet = state.petInfo;
    const sch = state.schedule;
    const hasData = svc || pet.petName;

    document.getElementById('summaryEmpty').style.display  = hasData ? 'none' : 'flex';
    document.getElementById('summaryContent').style.display = hasData ? 'flex' : 'none';

    if (!hasData) return;

    const show = (id, val) => {
        const row = document.getElementById(id);
        const valEl = document.getElementById(id + 'Val');
        if (!row || !valEl) return;
        row.style.display = val ? 'flex' : 'none';
        valEl.innerHTML = val || '';
    };

    show('sumService', svc ? svc.name : null);
    show('sumPet', pet.petName ? `${pet.petName} (${pet.petType || '?'})` : null);
    show('sumOwner', pet.ownerName ? `${pet.ownerName} · ${pet.ownerPhone}` : null);
    show('sumStaff', state.selectedStaffName ? state.selectedStaffName : null);

    let dateStr = null;
    if (svc?.isHotel && sch.checkIn && sch.checkOut) {
        const nights = Math.round((new Date(sch.checkOut) - new Date(sch.checkIn)) / 86400000);
        dateStr = `${formatDate(sch.checkIn)} → ${formatDate(sch.checkOut)} (${nights}đ)`;
    } else if (sch.date && sch.slot) {
        dateStr = `${formatDate(sch.date)} · ${sch.slot}`;
    }
    show('sumDate', dateStr);

    // Price
    let priceStr = svc?.price || null;
    if (svc?.isHotel && sch.checkIn && sch.checkOut) {
        const nights = Math.round((new Date(sch.checkOut) - new Date(sch.checkIn)) / 86400000);
        if (nights > 0) {
            let total = svc.priceNum * nights;
            if(state.addons.meal) total += 30000 * nights;
            if(state.addons.walk) total += 40000 * state.addons.walkQty;
            if(state.addons.play) total += 20000 * state.addons.playQty;
            if(state.addons.bath) total += 150000 * state.addons.bathQty;
            priceStr = formatVND(total);
        }
    }
    document.getElementById('sumPriceVal').textContent = priceStr || '—';
    document.getElementById('sumMemberNote').style.display = svc ? 'block' : 'none';
}

// ── Validation ────────────────────────────────────────────────────────────────
// ── Pet Selection (Member Flow) ───────────────────────────────────────────────────
function renderPetSelection() {
    const list = document.getElementById('memberPetList');
    if (!list) return;

    list.innerHTML = state.memberPets.map(pet => {
        const isSelected = state.selectedPetId === pet.id;
        const avatar = pet.photo ? `<img src="${pet.photo}" alt="${pet.name}">` : (pet.species === 'Mèo' ? '🐱' : '🐶');
        return `
        <div class="pet-select-card ${isSelected ? 'selected' : ''}" data-id="${pet.id}" role="button" tabindex="0">
            <div class="pet-avatar">${avatar}</div>
            <div class="pet-info-short">
                <h4>${pet.name}</h4>
                <p>${pet.breed || pet.species} · ${pet.weight}kg</p>
            </div>
            <div class="pet-card-radio"></div>
        </div>
        `;
    }).join('') + `
        <div class="btn-add-pet-card" role="button" tabindex="0">
            <span class="icon-add">➕</span>
            <span>Thêm bé mới</span>
        </div>
    `;

    list.querySelectorAll('.btn-add-pet-card').forEach(btn => {
        btn.addEventListener('click', () => {
            window.location.href = 'pet-form.html';
        });
    });

    list.querySelectorAll('.pet-select-card').forEach(card => {
        card.addEventListener('click', () => {
            const petId = card.dataset.id;
            const pet = state.memberPets.find(p => p.id === petId);
            
            if (pet) {
                // Kiểm tra ràng buộc thiếu thông tin (Tên, giống loài, cân nặng) theo quy tắc 3.1.3
                if (!pet.weight || pet.weight <= 0 || !pet.name || !pet.species) {
                    window.location.href = `pet-form.html?id=${pet.id}&redirect=booking`;
                    return;
                }

                state.selectedPetId = petId;
                renderPetSelection();
                
                const user = JSON.parse(localStorage.getItem('pawpal_user') || '{}');
                state.petInfo = {
                    ownerName: user.name || '',
                    ownerPhone: user.phone || '',
                    petName: pet.name,
                    petType: pet.species,
                    petBreed: pet.breed,
                    petWeight: pet.weight,
                    petNote: pet.notes || '',
                    groomingStyle: document.getElementById('memberGroomingStyle')?.value.trim() || ''
                };
                updateSummary();
            }
        });
    });
}

// ── Validation ────────────────────────────────────────────────────────────────
function validatePetInfo() {
    if (state.isMember) {
        if (!state.selectedPetId) {
            alert('Vui lòng chọn một bé cưng để đặt lịch!');
            return false;
        }
        const pet = state.memberPets.find(p => p.id === state.selectedPetId);
        const user = JSON.parse(localStorage.getItem('pawpal_user') || '{}');
        state.petInfo = {
            ownerName: user.name || '',
            ownerPhone: user.phone || '',
            petName: pet.name,
            petType: pet.species,
            petBreed: pet.breed,
            petWeight: pet.weight,
            petNote: pet.notes || '',
            groomingStyle: document.getElementById('memberGroomingStyle').value.trim() || ''
        };
        return true;
    }

    let valid = true;
    const fields = [
        { id: 'ownerName',  errId: 'ownerNameErr',  msg: 'Vui lòng nhập họ tên.' },
        { id: 'ownerPhone', errId: 'ownerPhoneErr', msg: 'Vui lòng nhập số điện thoại hợp lệ.',
          test: v => /^(0[3-9]\d{8})$/.test(v.replace(/\s/g,'')) },
        { id: 'petName',    errId: 'petNameErr',    msg: 'Vui lòng nhập tên bé.' },
        { id: 'petType',    errId: 'petTypeErr',    msg: 'Vui lòng chọn loài.' },
        { id: 'petWeight',  errId: 'petWeightErr',  msg: 'Vui lòng nhập cân nặng hợp lệ.',
          test: v => parseFloat(v) > 0 },
    ];

    fields.forEach(f => {
        const el = document.getElementById(f.id);
        const errEl = document.getElementById(f.errId);
        const val = el.value.trim();
        const fail = !val || (f.test && !f.test(val));
        errEl.textContent = fail ? f.msg : '';
        el.classList.toggle('error', fail);
        if (fail) valid = false;
    });

    if (valid) {
        state.petInfo = {
            ownerName:  document.getElementById('ownerName').value.trim(),
            ownerPhone: document.getElementById('ownerPhone').value.trim(),
            petName:    document.getElementById('petName').value.trim(),
            petType:    document.getElementById('petType').value,
            petBreed:   document.getElementById('petBreed').value.trim(),
            petWeight:  document.getElementById('petWeight').value.trim(),
            petNote:    document.getElementById('petNote').value.trim(),
            groomingStyle: document.getElementById('petGroomingStyle').value.trim(),
        };
    }
    return valid;
}

function isPetInfoComplete() {
    if (state.isMember) {
        return !!state.selectedPetId;
    }

    const ownerName = document.getElementById('ownerName')?.value.trim();
    const ownerPhone = document.getElementById('ownerPhone')?.value.trim();
    const petName = document.getElementById('petName')?.value.trim();
    const petType = document.getElementById('petType')?.value;
    const petWeight = document.getElementById('petWeight')?.value.trim();
    return !!(ownerName && ownerPhone && petName && petType && petWeight);
}

function isStep3Valid() {
    const svc = state.selectedService;
    if (!svc) return false;
    if (svc.isHotel) {
        return !!(state.schedule.checkIn && state.schedule.checkOut && state.schedule.checkOut > state.schedule.checkIn && state.selectedStaffId && !isSlotHeldByOther());
    }
    return !!(state.schedule.date && state.schedule.slot && state.selectedStaffId && !isSlotHeldByOther());
}

function canNavigateToStep(n) {
    if (n === 1) return true;
    if (n === 2) return isPetInfoComplete();
    if (n === 3) return isPetInfoComplete() && !!state.selectedService;
    if (n === 4) return isPetInfoComplete() && !!state.selectedService && isStep3Valid();
    return false;
}

// ── Booking submission ────────────────────────────────────────────────────────
function submitBooking() {
    const code = 'PP-' + Math.floor(100000 + Math.random() * 900000);
    document.getElementById('bookingCode').textContent = code;

    // Save to localStorage (demo)
    const booking = {
        code,
        service: state.selectedService,
        petInfo: state.petInfo,
        schedule: state.schedule,
        createdAt: new Date().toISOString(),
        status: 'Chờ xác nhận',
    };
    const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
    bookings.push(booking);
    localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));

    document.getElementById('successModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatVND(num) {
    return num.toLocaleString('vi-VN') + 'đ';
}

function setMinDates() {
    const today = new Date().toISOString().split('T')[0];
    ['bookingDate','checkInDate','checkOutDate'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.min = today;
    });
}

// ── Bind all events ───────────────────────────────────────────────────────────
function bindEvents() {
    // Step 1
    document.querySelectorAll('.svc-type-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.svc-type-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            state.activeType = tab.dataset.type;
            state.selectedService = null;
            document.getElementById('step2Next').disabled = true;
            renderServiceList();
            updateSummary();
        });
    });

    document.querySelectorAll('.step').forEach(step => {
        step.addEventListener('click', () => {
            const target = parseInt(step.dataset.step, 10);
            if (canNavigateToStep(target)) {
                goToStep(target);
            } else if (target > state.currentStep) {
                alert('Vui lòng hoàn thành các bước trước để tiếp tục.');
            }
        });
        step.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                step.click();
            }
        });
    });

    document.getElementById('step1Next').addEventListener('click', () => {
        if (validatePetInfo()) {
            goToStep(2);
        }
    });

    // Step 2
    document.getElementById('step2Back').addEventListener('click', () => goToStep(1));
    document.getElementById('step2Next').addEventListener('click', () => {
        if (!state.selectedService) {
            alert('Vui lòng chọn dịch vụ trước khi tiếp tục.');
            return;
        }
        const isHotel = state.selectedService?.isHotel;
        document.getElementById('hotelDateRange').style.display = isHotel ? 'block' : 'none';
        document.getElementById('spaSchedule').style.display    = isHotel ? 'none' : 'block';
        document.getElementById('hotelAddonsSection').style.display = isHotel ? 'block' : 'none';
        renderTimeSlots();
        renderStaffList();
        updateBookingHoldBanner();
        goToStep(3);
    });

    document.getElementById('useLastGroomingStyle')?.addEventListener('change', e => {
        const input = document.getElementById('petGroomingStyle');
        if (e.target.checked) {
            input.value = 'Kiểu Gấu Bông (Lần trước)';
            input.disabled = true;
        } else {
            input.value = '';
            input.disabled = false;
        }
    });

    document.getElementById('memberUseLastGroomingStyle')?.addEventListener('change', e => {
        const input = document.getElementById('memberGroomingStyle');
        if (e.target.checked) {
            input.value = 'Kiểu Gấu Bông (Lần trước)';
            input.disabled = true;
            if(state.petInfo) state.petInfo.groomingStyle = input.value;
        } else {
            input.value = '';
            input.disabled = false;
            if(state.petInfo) state.petInfo.groomingStyle = '';
        }
        updateSummary();
    });
    
    document.getElementById('memberGroomingStyle')?.addEventListener('input', e => {
        if(state.petInfo) state.petInfo.groomingStyle = e.target.value.trim();
        updateSummary();
    });

    // Step 3
    document.getElementById('step3Back').addEventListener('click', () => goToStep(2));
    document.getElementById('step3Next').addEventListener('click', () => {
        buildConfirmSummary();
        goToStep(4);
    });

    document.getElementById('bookingDate').addEventListener('change', e => {
        releaseCurrentHold();
        state.schedule.date = e.target.value;
        state.schedule.slot = null;
        renderTimeSlots();
        updateBookingHoldBanner();
        checkStep3Valid();
    });

    document.getElementById('checkInDate').addEventListener('change', e => {
        releaseCurrentHold();
        state.schedule.checkIn = e.target.value;
        document.getElementById('checkOutDate').min = e.target.value;
        updateHotelNights();
        updateBookingHoldBanner();
        checkStep3Valid();
        maybeCreateHold();
    });

    document.getElementById('checkOutDate').addEventListener('change', e => {
        releaseCurrentHold();
        state.schedule.checkOut = e.target.value;
        updateHotelNights();
        updateBookingHoldBanner();
        checkStep3Valid();
        maybeCreateHold();
    });

    // Step 4
    document.getElementById('step4Back').addEventListener('click', () => goToStep(3));

    document.getElementById('policyCheck').addEventListener('change', e => {
        document.getElementById('confirmBookingBtn').disabled = !e.target.checked;
    });

    document.getElementById('confirmBookingBtn').addEventListener('click', submitBooking);

    // Pre-select service from URL param (e.g. ?service=SPA01)
    const urlParams = new URLSearchParams(window.location.search);
    const preService = urlParams.get('service');
    if (preService) {
        const found = state.services.find(s => s.id === preService);
        if (found) {
            state.activeType = found.isHotel ? 'hotel' : 'spa';
            document.querySelectorAll('.svc-type-tab').forEach(t => {
                t.classList.toggle('active', t.dataset.type === state.activeType);
            });
            renderServiceList();
            selectService(preService);
        }
    }

    // Addons
    ['addonMeal', 'addonWalk', 'addonPlay', 'addonBath'].forEach(id => {
        const cb = document.getElementById(id);
        if(cb) {
            cb.addEventListener('change', e => {
                const key = id.replace('addon', '').toLowerCase();
                state.addons[key] = e.target.checked;
                const ctrl = document.getElementById('qty' + id.replace('addon', '') + 'Ctrl');
                if(ctrl) ctrl.style.display = e.target.checked ? 'flex' : 'none';
                updateHotelNights();
                updateSummary();
            });
        }
    });
}

function updateHotelNights() {
    const ci = state.schedule.checkIn;
    const co = state.schedule.checkOut;
    const display = document.getElementById('hotelNightsDisplay');
    if (ci && co && co > ci) {
        const nights = Math.round((new Date(co) - new Date(ci)) / 86400000);
        state.schedule.nights = nights;
        document.getElementById('hotelNightsText').textContent = `${nights} đêm`;
        
        let total = (state.selectedService?.priceNum || 0) * nights;
        if(state.addons) {
            if(state.addons.meal) total += 30000 * nights;
            if(state.addons.walk) total += 40000 * state.addons.walkQty;
            if(state.addons.play) total += 20000 * state.addons.playQty;
            if(state.addons.bath) total += 150000 * state.addons.bathQty;
        }

        document.getElementById('hotelTotalPrice').textContent = total > 0 ? '→ ' + formatVND(total) : '';
        display.style.display = 'flex';
    } else {
        display.style.display = 'none';
    }
}

window.updateAddonQty = function(id, change) {
    const input = document.getElementById(id);
    if (!input) return;
    let val = parseInt(input.value) + change;
    if (val < 1) val = 1;
    input.value = val;
    
    if (id === 'addonWalkQty') state.addons.walkQty = val;
    if (id === 'addonPlayQty') state.addons.playQty = val;
    if (id === 'addonBathQty') state.addons.bathQty = val;
    
    updateHotelNights();
    updateSummary();
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
    // Check Member Flow
    const userJson = localStorage.getItem('pawpal_user');
    if (userJson) {
        state.isMember = true;
        state.memberPets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
        const guestFlow = document.getElementById('guestFlow');
        const guestNote = document.getElementById('guestInfoNote');
        const memberFlow = document.getElementById('memberFlow');
        if (guestFlow) guestFlow.style.display = 'none';
        if (guestNote) guestNote.style.display = 'none';
        if (memberFlow) memberFlow.style.display = 'block';
        renderPetSelection();
    }

    try {
        const res = await fetch('../Docs/dichvu.csv');
        if (!res.ok) throw new Error('Không tải được dichvu.csv');
        const text = await res.text();
        state.services = parseCSV(text).map(mapService).filter(s => s.id);
        loadCurrentHold();

        setMinDates();
        renderServiceList();
        renderStaffList();
        updateBookingHoldBanner();
        bindEvents();
    } catch (err) {
        console.error('booking.js:', err);
        document.getElementById('svcSelectList').innerHTML =
            '<p style="color:var(--color-text-light);padding:20px;">⚠️ Không thể tải danh sách dịch vụ.</p>';
    }
}

document.addEventListener('DOMContentLoaded', init);
