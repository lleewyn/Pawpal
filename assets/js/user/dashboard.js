/* ==========================================================================
   dashboard.js — Phần 1: Pet ID Management
   localStorage key: pawpal_pets
   ========================================================================== */

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'pawpal_pets';
const MAX_PHOTO_MB = 5;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// ── State ─────────────────────────────────────────────────────────────────────
let pets = [];           // active pets
let editingId = null;    // null = add new, string = editing existing
let deleteTargetId = null;

// ── Storage helpers ───────────────────────────────────────────────────────────
function loadPets() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const all = raw ? JSON.parse(raw) : [];
        // Chỉ hiển thị bé chưa bị soft-delete
        pets = all.filter(p => !p.deleted);
    } catch {
        pets = [];
    }
}

function loadOrderSummary() {
    const raw = localStorage.getItem('pawpal_orders');
    if (!raw) return { total: 0, processing: 0, shipping: 0, completed: 0 };
    try {
        const orders = JSON.parse(raw);
        const summary = { total: orders.length, processing: 0, shipping: 0, completed: 0 };
        orders.forEach(order => {
            if (['Chờ xác nhận', 'Đang chuẩn bị hàng'].includes(order.orderStatus)) summary.processing++;
            else if (order.orderStatus === 'Đang giao') summary.shipping++;
            else if (order.orderStatus === 'Hoàn thành') summary.completed++;
        });
        return summary;
    } catch {
        return { total: 0, processing: 0, shipping: 0, completed: 0 };
    }
}

function renderOrderSummaryTab() {
    const summary = loadOrderSummary();
    const el1 = document.getElementById('dashOrdersCount');
    const el2 = document.getElementById('dashOrdersProcessing');
    const el3 = document.getElementById('dashOrdersShipping');
    const el4 = document.getElementById('dashOrdersCompleted');
    if (el1) el1.textContent = summary.total;
    if (el2) el2.textContent = summary.processing;
    if (el3) el3.textContent = summary.shipping;
    if (el4) el4.textContent = summary.completed;
}

function savePets() {
    try {
        // Đọc toàn bộ (kể cả deleted) để không mất soft-delete records
        const raw = localStorage.getItem(STORAGE_KEY);
        const all = raw ? JSON.parse(raw) : [];

        pets.forEach(p => {
            const idx = all.findIndex(a => a.id === p.id);
            if (idx >= 0) all[idx] = p;
            else all.push(p);
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    } catch (e) {
        console.error('dashboard.js savePets:', e);
    }
}

// ── ID generator ──────────────────────────────────────────────────────────────
function generatePetId() {
    const num = Math.floor(1000 + Math.random() * 9000);
    return `PP-${num}`;
}

// ── Age calculator ────────────────────────────────────────────────────────────
function calcAge(birthday) {
    if (!birthday) return null;
    const birth = new Date(birthday);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12
                 + (now.getMonth() - birth.getMonth());
    if (months < 12) return `${months} tháng tuổi`;
    const years = Math.floor(months / 12);
    return `${years} tuổi`;
}

// ── Render danh sách Pawport cards ────────────────────────────────────────────
function renderPetList() {
    const list  = document.getElementById('petidList');
    const empty = document.getElementById('petidEmpty');
    if (!list || !empty) return;

    if (pets.length === 0) {
        list.innerHTML = '';
        empty.style.display = 'flex';
        return;
    }

    empty.style.display = 'none';
    list.innerHTML = pets.map(buildPawportCard).join('');

    // Bind edit / delete buttons
    list.querySelectorAll('.btn-pawport-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = `pet-form.html?id=${btn.dataset.id}`;
        });
    });
    list.querySelectorAll('.btn-pawport-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            openDeleteModal(btn.dataset.id);
        });
    });
    list.querySelectorAll('.pawport-card').forEach(card => {
        card.addEventListener('click', () => {
            window.location.href = `pet-profile.html?id=${card.dataset.id}`;
        });
        card.style.cursor = 'pointer';
    });
}

function buildPawportCard(pet) {
    const age = calcAge(pet.birthday);
    const photoHtml = pet.photo
        ? `<img src="${pet.photo}" alt="${pet.name}">`
        : `<div class="pawport-photo-placeholder"><span style="font-size:2rem;">${pet.species === 'Chó' ? '🐶' : '🐱'}</span></div>`;

    const allergyHtml = pet.allergies
        ? `<span class="pawport-allergy-badge">⚠️ ${pet.allergies}</span>`
        : '';

    const ageHtml = age
        ? `<div class="pawport-detail"><strong>Tuổi:</strong> ${age}</div>`
        : '';

    return `
    <div class="pawport-card" data-id="${pet.id}">
        <div class="pawport-header">
            <span class="pawport-header-label">PAWPORT • VIỆT NAM</span>
            <span class="pawport-id-badge">${pet.id}</span>
        </div>
        <div class="pawport-body">
            <div class="pawport-photo">${photoHtml}</div>
            <div class="pawport-info">
                <h4 class="pawport-name">${pet.name}</h4>
                <div class="pawport-detail">
                    <strong>Loài:</strong> ${pet.species}
                    ${pet.breed ? `· ${pet.breed}` : ''}
                </div>
                <div class="pawport-detail"><strong>Cân nặng:</strong> ${pet.weight} kg</div>
                ${ageHtml}
                ${allergyHtml}
            </div>
        </div>
        <div class="pawport-footer">
            <button class="btn-pawport-edit" data-id="${pet.id}">✏️ Sửa</button>
            <button class="btn-pawport-delete" data-id="${pet.id}">🗑️ Xóa</button>
        </div>
    </div>`;
}

// ── Modal: Mở form thêm mới ───────────────────────────────────────────────────
function openAddModal() {
    editingId = null;
    resetForm();
    document.getElementById('petidModalTitle').textContent = 'Thêm hồ sơ bé cưng';
    document.getElementById('petidModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

// ── Modal: Mở form sửa ────────────────────────────────────────────────────────
function openEditModal(id) {
    const pet = pets.find(p => p.id === id);
    if (!pet) return;

    editingId = id;
    resetForm();
    document.getElementById('petidModalTitle').textContent = 'Sửa hồ sơ bé cưng';

    // Fill form
    document.getElementById('petidEditId').value   = pet.id;
    document.getElementById('petidName').value      = pet.name;
    document.getElementById('petidSpecies').value   = pet.species;
    document.getElementById('petidBreed').value     = pet.breed || '';
    document.getElementById('petidWeight').value    = pet.weight;
    document.getElementById('petidBirthday').value  = pet.birthday || '';
    document.getElementById('petidAllergies').value = pet.allergies || '';
    document.getElementById('petidNotes').value     = pet.notes || '';

    // Preview ảnh nếu có
    if (pet.photo) {
        const preview = document.getElementById('petidPhotoPreview');
        preview.innerHTML = `<img src="${pet.photo}" alt="${pet.name}" style="width:100%;height:100%;object-fit:cover;">`;
    }

    document.getElementById('petidModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    document.getElementById('petidModal').classList.remove('open');
    document.body.style.overflow = '';
    editingId = null;
}

function resetForm() {
    document.getElementById('petidForm').reset();
    document.getElementById('petidEditId').value = '';

    // Reset photo preview
    const preview = document.getElementById('petidPhotoPreview');
    preview.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
        <span>Ảnh bé</span>`;
    preview.dataset.photoData = '';

    // Clear errors
    ['petidNameErr','petidSpeciesErr','petidWeightErr','petidPhotoError'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '';
    });
    ['petidName','petidSpecies','petidWeight'].forEach(id => {
        document.getElementById(id)?.classList.remove('error');
    });
}

// ── Photo upload handler ──────────────────────────────────────────────────────
function handlePhotoUpload(file) {
    const errEl = document.getElementById('petidPhotoError');

    if (!ALLOWED_TYPES.includes(file.type)) {
        errEl.textContent = 'Định dạng không hỗ trợ. Vui lòng chọn JPG, PNG hoặc WEBP.';
        return;
    }
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) {
        errEl.textContent = `Dung lượng ảnh vượt quá ${MAX_PHOTO_MB}MB.`;
        return;
    }

    errEl.textContent = '';
    const reader = new FileReader();
    reader.onload = e => {
        const preview = document.getElementById('petidPhotoPreview');
        preview.innerHTML = `<img src="${e.target.result}" alt="preview" style="width:100%;height:100%;object-fit:cover;">`;
        preview.dataset.photoData = e.target.result;
    };
    reader.readAsDataURL(file);
}

// ── Validate form ─────────────────────────────────────────────────────────────
function validatePetForm() {
    let valid = true;

    const name    = document.getElementById('petidName').value.trim();
    const species = document.getElementById('petidSpecies').value;
    const weight  = parseFloat(document.getElementById('petidWeight').value);

    // Name
    const nameErr = document.getElementById('petidNameErr');
    if (!name) {
        nameErr.textContent = 'Vui lòng nhập tên bé.';
        document.getElementById('petidName').classList.add('error');
        valid = false;
    } else {
        // Kiểm tra tên trùng trong cùng tài khoản (trừ bé đang sửa)
        const duplicate = pets.find(p =>
            p.name.toLowerCase() === name.toLowerCase() && p.id !== editingId
        );
        if (duplicate) {
            nameErr.textContent = 'Tên bé đã tồn tại. Vui lòng thêm ký hiệu phân biệt (VD: Bông 2).';
            document.getElementById('petidName').classList.add('error');
            valid = false;
        } else {
            nameErr.textContent = '';
            document.getElementById('petidName').classList.remove('error');
        }
    }

    // Species
    const speciesErr = document.getElementById('petidSpeciesErr');
    if (!species) {
        speciesErr.textContent = 'Vui lòng chọn loài.';
        document.getElementById('petidSpecies').classList.add('error');
        valid = false;
    } else {
        speciesErr.textContent = '';
        document.getElementById('petidSpecies').classList.remove('error');
    }

    // Weight
    const weightErr = document.getElementById('petidWeightErr');
    if (!weight || weight <= 0 || weight > 100) {
        weightErr.textContent = 'Vui lòng nhập cân nặng hợp lệ (0.1 – 100 kg).';
        document.getElementById('petidWeight').classList.add('error');
        valid = false;
    } else {
        weightErr.textContent = '';
        document.getElementById('petidWeight').classList.remove('error');
    }

    return valid;
}

// ── Submit form ───────────────────────────────────────────────────────────────
function handleFormSubmit(e) {
    e.preventDefault();
    if (!validatePetForm()) return;

    const photoData = document.getElementById('petidPhotoPreview').dataset.photoData || '';

    const petData = {
        id:        editingId || generatePetId(),
        name:      document.getElementById('petidName').value.trim(),
        species:   document.getElementById('petidSpecies').value,
        breed:     document.getElementById('petidBreed').value.trim(),
        weight:    parseFloat(document.getElementById('petidWeight').value),
        birthday:  document.getElementById('petidBirthday').value || '',
        allergies: document.getElementById('petidAllergies').value.trim(),
        notes:     document.getElementById('petidNotes').value.trim(),
        photo:     photoData || (editingId ? (pets.find(p => p.id === editingId)?.photo || '') : ''),
        deleted:   false,
        createdAt: editingId
            ? (pets.find(p => p.id === editingId)?.createdAt || new Date().toISOString())
            : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    if (editingId) {
        // Cập nhật
        const idx = pets.findIndex(p => p.id === editingId);
        if (idx >= 0) pets[idx] = petData;
    } else {
        // Thêm mới
        pets.push(petData);
    }

    savePets();
    renderPetList();
    closeModal();
    showToast(editingId ? `✅ Đã cập nhật hồ sơ ${petData.name}` : `✅ Đã thêm hồ sơ ${petData.name}`);
}

// ── Delete modal ──────────────────────────────────────────────────────────────
function openDeleteModal(id) {
    deleteTargetId = id;
    document.getElementById('petidDeleteModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    document.getElementById('petidDeleteModal').classList.remove('open');
    document.body.style.overflow = '';
    deleteTargetId = null;
}

function confirmDelete() {
    if (!deleteTargetId) return;

    // Soft delete — đánh dấu deleted, không xóa khỏi storage
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const all = raw ? JSON.parse(raw) : [];
        const idx = all.findIndex(p => p.id === deleteTargetId);
        if (idx >= 0) {
            all[idx].deleted = true;
            all[idx].deletedAt = new Date().toISOString();
            localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        }
    } catch (e) {
        console.error('dashboard.js confirmDelete:', e);
    }

    const pet = pets.find(p => p.id === deleteTargetId);
    pets = pets.filter(p => p.id !== deleteTargetId);
    renderPetList();
    closeDeleteModal();
    showToast(`🗑️ Đã xóa hồ sơ ${pet?.name || ''}. Có thể khôi phục trong 30 ngày.`);
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ── Tab switching (reuse existing pattern) ────────────────────────────────────
function initTabs() {
    document.querySelectorAll('.dash-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.dashTab;
            document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.dash-tab-content').forEach(c => c.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(target)?.classList.add('active');

            // Render tab-specific content khi chuyển sang tab đó
            if (target === 'dash-petid') renderPetList();
            if (target === 'dash-orders') renderOrderSummaryTab();
        });
    });
}

// ── Bind all events ───────────────────────────────────────────────────────────
function bindEvents() {
    // Nút thêm bé mới (header + empty state)
    document.getElementById('btnAddPet')?.addEventListener('click', openAddModal);
    document.getElementById('btnAddPetEmpty')?.addEventListener('click', openAddModal);

    // Modal close
    document.getElementById('petidModalClose')?.addEventListener('click', closeModal);
    document.getElementById('petidModalOverlay')?.addEventListener('click', closeModal);
    document.getElementById('petidCancelBtn')?.addEventListener('click', closeModal);

    // Form submit
    document.getElementById('petidForm')?.addEventListener('submit', handleFormSubmit);

    // Photo upload
    document.getElementById('petidPhotoInput')?.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (file) handlePhotoUpload(file);
    });

    // Drag & drop ảnh vào preview
    const preview = document.getElementById('petidPhotoPreview');
    if (preview) {
        preview.addEventListener('dragover', e => { e.preventDefault(); preview.style.borderColor = 'var(--color-primary)'; });
        preview.addEventListener('dragleave', () => { preview.style.borderColor = ''; });
        preview.addEventListener('drop', e => {
            e.preventDefault();
            preview.style.borderColor = '';
            const file = e.dataTransfer.files?.[0];
            if (file) handlePhotoUpload(file);
        });
    }

    // Delete modal
    document.getElementById('petidDeleteCancel')?.addEventListener('click', closeDeleteModal);
    document.getElementById('petidDeleteOverlay')?.addEventListener('click', closeDeleteModal);
    document.getElementById('petidDeleteConfirm')?.addEventListener('click', confirmDelete);

    // Escape key
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeModal();
            closeDeleteModal();
        }
    });

    // Logout button
    document.getElementById('dashboardLogoutBtn')?.addEventListener('click', () => {
        if (confirm('Bạn có chắc muốn đăng xuất?')) {
            window.location.href = 'login.html';
        }
    });
}

// ── Load & render user info từ localStorage ───────────────────────────────────
function loadUserInfo() {
    try {
        const raw = localStorage.getItem('pawpal_user');
        if (!raw) return;
        const user = JSON.parse(raw);

        const nameEl   = document.getElementById('dashName');
        const phoneEl  = document.getElementById('dashPhone');
        const pointsEl = document.getElementById('dashPoints');
        const badgeEl  = document.getElementById('dashBadge');
        const avatarEl = document.getElementById('dashAvatar');

        if (nameEl  && user.name)   nameEl.textContent  = user.name;
        if (phoneEl && user.phone)  phoneEl.textContent = user.phone;
        if (pointsEl && user.points !== undefined)
            pointsEl.textContent = `${user.points.toLocaleString('vi-VN')} Points`;

        // Hạng thành viên
        const rank = user.rank || 'Bạc';
        const rankMap = {
            'Bạc':       { label: '🥈 Hạng Bạc',       bg: '#e2e8f0', color: '#475569' },
            'Vàng':      { label: '🥇 Hạng Vàng',      bg: '#fef3c7', color: '#92400e' },
            'Kim cương': { label: '💎 Kim Cương',       bg: '#ede9fe', color: '#5b21b6' },
        };
        const rankInfo = rankMap[rank] || rankMap['Bạc'];
        if (badgeEl) {
            badgeEl.textContent = rankInfo.label;
            badgeEl.style.background = rankInfo.bg;
            badgeEl.style.color      = rankInfo.color;
        }

        // Avatar initials
        if (avatarEl && user.name) {
            const parts = user.name.trim().split(' ');
            avatarEl.textContent = parts[parts.length - 1].charAt(0).toUpperCase();
        }
    } catch (e) {
        console.error('dashboard.js loadUserInfo:', e);
    }
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
    loadPets();
    loadUserInfo();
    initTabs();
    bindEvents();

    // Render ngay nếu tab Pet ID đang active
    const activePetTab = document.querySelector('.dash-tab-btn.active[data-dash-tab="dash-petid"]');
    if (activePetTab) renderPetList();

    // Xử lý URL param ?tab=xxx (ví dụ: từ suspicious login banner)
    const urlTab = new URLSearchParams(window.location.search).get('tab');
    if (urlTab) {
        const targetBtn = document.querySelector(`.dash-tab-btn[data-dash-tab="dash-${urlTab}"]`);
        if (targetBtn) {
            targetBtn.click();
            // Scroll nhẹ xuống dashboard content
            setTimeout(() => {
                document.querySelector('.dashboard-page-main')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 300);
        }
    }
}

document.addEventListener('DOMContentLoaded', init);

/* ==========================================================================
   Phần 2 — Booking List & Cancel
   localStorage key: pawpal_bookings, pawpal_cancel_log
   ========================================================================== */

const BOOKING_KEY     = 'pawpal_bookings';
const CANCEL_LOG_KEY  = 'pawpal_cancel_log';
const CANCEL_LIMIT    = 3;   // số lần hủy tối đa trong 7 ngày
const CANCEL_WINDOW   = 7;   // ngày
const MIN_CANCEL_HOURS = 2;  // phải hủy trước ít nhất 2 tiếng

let bookings = [];
let cancelTargetId = null;
let activeBookingFilter = 'all';
let trackerLogsStore = {};
let histPage = 1;
const HIST_PAGE_SIZE = 6;

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
    'Chờ xác nhận':   { cls: 'status-pending',    icon: '🕐' },
    'Đã đặt':         { cls: 'status-confirmed',   icon: '✅' },
    'Đang thực hiện': { cls: 'status-inprogress',  icon: '🔄' },
    'Hoàn thành':     { cls: 'status-done',        icon: '🎉' },
    'Đã hủy':         { cls: 'status-cancelled',   icon: '❌' },
};

// ── Load bookings ─────────────────────────────────────────────────────────────
function loadBookings() {
    try {
        const raw = localStorage.getItem(BOOKING_KEY);
        bookings = raw ? JSON.parse(raw) : [];
    } catch {
        bookings = [];
    }
}

function loadAllTrackerLogs() {
    try {
        const raw = localStorage.getItem('pawpal_tracker_logs');
        trackerLogsStore = raw ? JSON.parse(raw) : {};
    } catch {
        trackerLogsStore = {};
    }
}

function saveTrackerLogs() {
    try {
        localStorage.setItem('pawpal_tracker_logs', JSON.stringify(trackerLogsStore));
    } catch (e) { console.warn('saveTrackerLogs', e); }
}

// Migrate bookings: ensure each booking has `petId` linking to pets array when possible
function migrateBookingPetIds() {
    try {
        loadPets();
        let modified = false;
        bookings.forEach(b => {
            if (!b.petId) {
                const name = (b.petInfo?.petName || '').toString().trim().toLowerCase();
                if (name) {
                    const p = pets.find(px => px.name && px.name.toLowerCase() === name);
                    if (p) {
                        b.petId = p.id;
                        modified = true;
                    }
                }
            }
        });
        if (modified) saveBookings();
    } catch (e) {
        console.warn('migrateBookingPetIds:', e);
    }
}

function saveBookings() {
    localStorage.setItem(BOOKING_KEY, JSON.stringify(bookings));
}

// ── Cancel log helpers ────────────────────────────────────────────────────────
function getCancelLog() {
    try {
        const raw = localStorage.getItem(CANCEL_LOG_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function recordCancel() {
    const log = getCancelLog();
    log.push(new Date().toISOString());
    localStorage.setItem(CANCEL_LOG_KEY, JSON.stringify(log));
}

function recentCancelCount() {
    const log = getCancelLog();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - CANCEL_WINDOW);
    return log.filter(ts => new Date(ts) > cutoff).length;
}

function isBookingLocked() {
    return recentCancelCount() >= CANCEL_LIMIT;
}

// ── Can cancel check ──────────────────────────────────────────────────────────
function canCancel(booking) {
    if (!['Chờ xác nhận', 'Đã đặt'].includes(booking.status)) return false;

    // Lấy thời gian hẹn
    let appointmentTime = null;
    if (booking.schedule?.date && booking.schedule?.slot) {
        appointmentTime = new Date(`${booking.schedule.date}T${booking.schedule.slot}:00`);
    } else if (booking.schedule?.checkIn) {
        appointmentTime = new Date(`${booking.schedule.checkIn}T08:00:00`);
    }

    if (!appointmentTime) return true; // không xác định được giờ → cho phép hủy
    const hoursLeft = (appointmentTime - new Date()) / 3600000;
    return hoursLeft >= MIN_CANCEL_HOURS;
}

function getBookingDateTime(booking) {
    if (!booking) return null;
    let appointmentTime = null;
    if (booking.schedule?.date && booking.schedule?.slot) {
        appointmentTime = new Date(`${booking.schedule.date}T${booking.schedule.slot}:00`);
    } else if (booking.schedule?.checkIn) {
        appointmentTime = new Date(`${booking.schedule.checkIn}T08:00:00`);
    }
    return appointmentTime;
}

function getMinutesUntilBooking(booking) {
    const dt = getBookingDateTime(booking);
    if (!dt) return Infinity;
    return Math.round((dt - new Date()) / 60000);
}

function canChangeBooking(booking) {
    if (!['Chờ xác nhận', 'Đã đặt'].includes(booking.status)) return false;
    return getMinutesUntilBooking(booking) > 120;
}

// ── Format helpers ────────────────────────────────────────────────────────────
function formatBookingDate(booking) {
    const sch = booking.schedule;
    if (!sch) return '—';
    if (sch.checkIn && sch.checkOut) {
        return `${fmtDate(sch.checkIn)} → ${fmtDate(sch.checkOut)}`;
    }
    if (sch.date && sch.slot) {
        return `${fmtDate(sch.date)} · ${sch.slot}`;
    }
    return '—';
}

function fmtDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + (dateStr.length === 10 ? 'T00:00:00' : ''));
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtCreatedAt(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ── Render booking list ───────────────────────────────────────────────────────
function renderBookingList() {
    const listEl  = document.getElementById('dashBookingsList');
    const emptyEl = document.getElementById('bookingEmpty');
    if (!listEl || !emptyEl) return;

    const filtered = activeBookingFilter === 'all'
        ? bookings
        : bookings.filter(b => b.status === activeBookingFilter);

    // Sắp xếp: mới nhất lên đầu
    const sorted = [...filtered].sort((a, b) =>
        new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    if (sorted.length === 0) {
        listEl.innerHTML = '';
        emptyEl.style.display = 'flex';
        return;
    }

    emptyEl.style.display = 'none';
    listEl.innerHTML = sorted.map(buildBookingCard).join('');

    // Bind cancel buttons
    listEl.querySelectorAll('.btn-booking-cancel').forEach(btn => {
        btn.addEventListener('click', () => openCancelModal(btn.dataset.id));
    });
    listEl.querySelectorAll('.btn-booking-change').forEach(btn => {
        btn.addEventListener('click', () => {
            const booking = bookings.find(b => b.code === btn.dataset.id);
            if (!booking) return;
            const isChangeable = canChangeBooking(booking);
            if (!isChangeable) {
                alert('Không thể thay đổi lịch hẹn trong vòng 2 giờ trước giờ hẹn. Vui lòng chọn lịch khác hoặc liên hệ Hotline.');
                return;
            }
            const serviceId = booking.selectedService?.id || '';
            const url = `booking.html?service=${encodeURIComponent(serviceId)}&source=dashboard&bookingId=${encodeURIComponent(booking.code)}`;
            window.location.href = url;
        });
    });

    // Make in-progress bookings link to tracker tab when clicking the card
    listEl.querySelectorAll('.booking-card').forEach(card => {
        const code = card.dataset.code;
        const booking = bookings.find(b => b.code === code);
        if (!booking) return;
        if (booking.status === 'Đang thực hiện' || booking.status === 'Đã tiếp nhận') {
            card.style.cursor = 'pointer';
            card.addEventListener('click', (e) => {
                // avoid interfering with button clicks inside the card
                if (e.target.closest('button') || e.target.closest('a')) return;
                goToTrackerForBooking(code);
            });
        }
    });
}

function buildBookingCard(booking) {
    const status = booking.status || 'Chờ xác nhận';
    const cfg    = STATUS_CONFIG[status] || { cls: 'status-pending', icon: '🕐' };
    // Prefer linked pet record when available
    let petName = booking.petInfo?.petName || '—';
    let petType = booking.petInfo?.petType || '';
    if (booking.petId) {
        loadPets();
        const linked = pets.find(p => p.id === booking.petId);
        if (linked) {
            petName = linked.name || petName;
            petType = linked.species || petType;
        }
    }
    const svcName = booking.selectedService?.name || '—';
    const svcCat  = booking.selectedService?.category || '';
    const dateStr = formatBookingDate(booking);
    const price   = booking.selectedService?.price || '—';
    const owner   = booking.petInfo?.ownerName || '—';
    const canCancelThis = canCancel(booking);
    const canChangeThis = canChangeBooking(booking);
    const locked  = isBookingLocked();

    // Footer note
    let footerNote = `Đặt lúc: ${fmtCreatedAt(booking.createdAt)}`;
    if (status === 'Đã hủy') footerNote = `Đã hủy · ${fmtCreatedAt(booking.cancelledAt || booking.createdAt)}`;
    if (status === 'Hoàn thành') footerNote = `Hoàn thành · ${fmtCreatedAt(booking.completedAt || booking.createdAt)}`;

    // Action buttons
    let actionsHtml = '';
    if (['Chờ xác nhận', 'Đã đặt'].includes(status)) {
        actionsHtml += `<button class="btn-booking-change" data-id="${booking.code}">Thay đổi lịch</button>`;
    }
    if (canCancelThis && !locked) {
        actionsHtml += `<button class="btn-booking-cancel" data-id="${booking.code}">Hủy lịch</button>`;
    } else if (canCancelThis && locked) {
        actionsHtml += `<span style="font-size:0.72rem;color:#dc2626;font-weight:600;">🔒 Tính năng đặt lịch tạm khóa</span>`;
    } else if (['Chờ xác nhận','Đã đặt'].includes(status) && !canCancelThis) {
        actionsHtml += `<span style="font-size:0.72rem;color:var(--color-text-light);font-weight:500;">Gọi Hotline để hủy</span>`;
    }
    const changeNote = ['Chờ xác nhận','Đã đặt'].includes(status) && !canChangeThis ? '<div class="booking-action-note" style="font-size:0.78rem; color:#7c7c7c; margin-top:6px;">Đổi lịch chỉ được phép trước 2 giờ. Vui lòng chọn thời điểm khác.</div>' : '';
    if (status === 'Hoàn thành') {
        actionsHtml += `<a href="booking.html?service=${encodeURIComponent(booking.selectedService?.id || '')}" class="btn-booking-rebook">Đặt lại</a>`;
    }

    return `
    <div class="booking-card" data-code="${booking.code}">
        <div class="booking-card-header">
            <span class="booking-card-code">${booking.code || 'PP-000000'}</span>
            <span class="booking-status-badge ${cfg.cls}">${cfg.icon} ${status}</span>
        </div>
        <div class="booking-card-body">
            <div class="booking-info-row">
                <span class="booking-info-label">Dịch vụ</span>
                <span class="booking-info-value">${svcName}<br>
                    <small style="font-weight:500;color:var(--color-text-light);">${svcCat}</small>
                </span>
            </div>
            <div class="booking-info-row">
                <span class="booking-info-label">Thú cưng</span>
                <span class="booking-info-value">${petName} ${petType ? `(${petType})` : ''}</span>
            </div>
            <div class="booking-info-row">
                <span class="booking-info-label">Lịch hẹn</span>
                <span class="booking-info-value">${dateStr}</span>
            </div>
            <div class="booking-info-row">
                <span class="booking-info-label">Tổng tiền</span>
                <span class="booking-info-value" style="color:var(--color-primary);font-weight:700;">${price}</span>
            </div>
        </div>
        <div class="booking-card-footer">
            <span class="booking-footer-note">${footerNote}</span>
            <div class="booking-footer-actions">${actionsHtml}</div>
            ${changeNote}
        </div>
    </div>`;
}

// ── Cancel modal ──────────────────────────────────────────────────────────────
function openCancelModal(code) {
    cancelTargetId = code;
    const warningEl = document.getElementById('bookingCancelWarning');
    if (warningEl) {
        const count = recentCancelCount();
        warningEl.style.display = count >= CANCEL_LIMIT - 1 ? 'block' : 'none';
    }
    document.getElementById('bookingCancelModal').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeCancelModal() {
    document.getElementById('bookingCancelModal').classList.remove('open');
    document.body.style.overflow = '';
    cancelTargetId = null;
}

function confirmCancelBooking() {
    if (!cancelTargetId) return;

    const idx = bookings.findIndex(b => b.code === cancelTargetId);
    if (idx < 0) { closeCancelModal(); return; }

    bookings[idx].status      = 'Đã hủy';
    bookings[idx].cancelledAt = new Date().toISOString();
    saveBookings();
    recordCancel();

    renderBookingList();
    closeCancelModal();

    const count = recentCancelCount();
    if (count >= CANCEL_LIMIT) {
        showToast('⚠️ Bạn đã hủy quá 3 lần trong 7 ngày. Tính năng đặt lịch tạm khóa.', 'error');
    } else {
        showToast(`✅ Đã hủy lịch hẹn ${cancelTargetId}`);
    }
}

// Navigate to tracker tab and pre-select the pet + booking
function goToTrackerForBooking(code) {
    loadPets();
    loadBookings();
    const booking = bookings.find(b => b.code === code);
    if (!booking) return;

    // Prefer explicit petId on booking, fallback to matching by name
    const petMatch = pets.find(p => p.name.toLowerCase() === (booking.petInfo?.petName || '').toLowerCase());
    const petId = booking.petId || (petMatch ? petMatch.id : (pets[0] ? pets[0].id : ''));

    // Activate tracker tab by clicking its button
    const trackerBtn = document.querySelector('.dash-tab-btn[data-dash-tab="dash-tracker"]');
    if (trackerBtn) trackerBtn.click();

    // Wait a bit for tracker to render, then set selects
    setTimeout(() => {
        const petSelect = document.getElementById('trackerPetSelect');
        const bookingSelect = document.getElementById('trackerBookingSelect');
        if (petSelect && petId) {
            petSelect.value = petId;
            petSelect.dispatchEvent(new Event('change'));
        }
        if (bookingSelect) {
            // ensure options populated
            const opt = Array.from(bookingSelect.options).find(o => o.value === code);
            if (opt) {
                bookingSelect.value = code;
                bookingSelect.dispatchEvent(new Event('change'));
            }
        }
    }, 120);
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
function initBookingFilters() {
    document.querySelectorAll('.booking-filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.booking-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            activeBookingFilter = btn.dataset.filter;
            renderBookingList();
        });
    });
}

// ── Bind cancel modal events ──────────────────────────────────────────────────
function bindBookingEvents() {
    document.getElementById('bookingCancelNo')?.addEventListener('click', closeCancelModal);
    document.getElementById('bookingCancelOverlay')?.addEventListener('click', closeCancelModal);
    document.getElementById('bookingCancelYes')?.addEventListener('click', confirmCancelBooking);
}

// ── Extend initTabs to render bookings ────────────────────────────────────────
// Patch: khi chuyển sang tab booking thì render
const _origInitTabs = initTabs;
// Override tab switching để thêm booking render
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.dash-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.dashTab === 'dash-booking') {
                loadBookings();
                renderBookingList();
            }
        });
    });
});

// ── Extend init ───────────────────────────────────────────────────────────────
const _origInit = init;
document.addEventListener('DOMContentLoaded', () => {
    loadBookings();
    migrateBookingPetIds();
    initBookingFilters();
    bindBookingEvents();

    // Render ngay nếu tab booking đang active
    const activeBookingTab = document.querySelector('.dash-tab-btn.active[data-dash-tab="dash-booking"]');
    if (activeBookingTab) renderBookingList();
});


/* ==========================================================================
   Phần 3 — Tracker / Nhật ký chăm sóc
   Dữ liệu demo được sinh từ bookings trong localStorage
   ========================================================================== */

// ── Cấu hình các bước quy trình theo loại dịch vụ ────────────────────────────
const SPA_STEPS = [
    { key: 'checkin',   icon: '🏠', label: 'Tiếp nhận & kiểm tra sức khỏe' },
    { key: 'bath',      icon: '🛁', label: 'Tắm & vệ sinh' },
    { key: 'dry',       icon: '💨', label: 'Sấy khô & chải lông' },
    { key: 'groom',     icon: '✂️', label: 'Cắt tỉa & tạo kiểu' },
    { key: 'finish',    icon: '✨', label: 'Hoàn thiện & chụp ảnh kỷ niệm' },
    { key: 'checkout',  icon: '🎀', label: 'Bàn giao & tổng kết' },
];

const HOTEL_STEPS = [
    { key: 'checkin',   icon: '🏠', label: 'Check-in & kiểm tra sức khỏe' },
    { key: 'settle',    icon: '🛏️', label: 'Ổn định phòng & làm quen' },
    { key: 'meal',      icon: '🍖', label: 'Bữa ăn & uống nước' },
    { key: 'play',      icon: '🎾', label: 'Vui chơi & vận động' },
    { key: 'rest',      icon: '😴', label: 'Nghỉ ngơi & ngủ trưa' },
    { key: 'health',    icon: '💊', label: 'Kiểm tra sức khỏe định kỳ' },
    { key: 'checkout',  icon: '🎀', label: 'Check-out & tổng kết' },
];

// Ảnh demo — local + Unsplash placeholder theo từng bước
const DEMO_IMAGES_BY_STEP = {
    // Spa steps
    checkin:  [
        '../../assets/images/tracker/belu-1.png',
        'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80',
    ],
    bath:     [
        '../../assets/images/tracker/belu-2.png',
        'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=400&q=80',
    ],
    dry:      [
        'https://images.unsplash.com/photo-1601758124510-52d02ddb7cbd?w=400&q=80',
    ],
    groom:    [
        '../../assets/images/tracker/belu-3.png',
        'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=400&q=80',
    ],
    finish:   [
        'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&q=80',
    ],
    checkout: [
        'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=400&q=80',
    ],
    // Hotel steps
    settle:   [
        'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&q=80',
    ],
    meal:     [
        '../../assets/images/tracker/belu-1.png',
        'https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=400&q=80',
    ],
    play:     [
        '../../assets/images/tracker/belu-2.png',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80',
    ],
    rest:     [
        '../../assets/images/tracker/belu-3.png',
    ],
    health:   [
        'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?w=400&q=80',
    ],
};

const DEMO_STAFF = ['Minh Anh', 'Thanh Hà', 'Quốc Bảo', 'Thu Trang', 'Hải Đăng'];
const DEMO_MOODS = [
    { key: 'happy',  label: '😊 Vui vẻ',   cls: 'mood-happy'  },
    { key: 'calm',   label: '😌 Bình tĩnh', cls: 'mood-calm'   },
    { key: 'active', label: '⚡ Năng động', cls: 'mood-active' },
    { key: 'tired',  label: '😴 Mệt mỏi',  cls: 'mood-tired'  },
];

// Mood phù hợp theo từng bước
const STEP_MOOD_MAP = {
    checkin:  'calm',
    bath:     'calm',
    dry:      'happy',
    groom:    'active',
    finish:   'happy',
    checkout: 'happy',
    settle:   'calm',
    meal:     'happy',
    play:     'active',
    rest:     'tired',
    health:   'calm',
};

// ── Tracker logs storage helpers ─────────────────────────────────────────────
const TRACKER_LOGS_KEY = 'pawpal_tracker_logs';

function loadTrackerLogs(bookingCode) {
    try {
        const raw = localStorage.getItem(TRACKER_LOGS_KEY);
        if (!raw) return null;
        const all = JSON.parse(raw);
        return all[bookingCode] || null;
    } catch { return null; }
}

// ── Sinh dữ liệu nhật ký demo từ một booking ─────────────────────────────────
function generateTrackerLogs(booking) {
    // Ưu tiên dùng logs đã lưu trong localStorage nếu có
    const savedLogs = loadTrackerLogs(booking.code);
    if (savedLogs && savedLogs.length > 0) return savedLogs;

    const isHotel = (booking.selectedService?.category || '').toLowerCase().includes('hotel')
                 || (booking.selectedService?.name || '').toLowerCase().includes('hotel');
    const steps = isHotel ? HOTEL_STEPS : SPA_STEPS;

    const status = booking.status || 'Chờ xác nhận';
    let completedCount = 0;
    if (status === 'Đang thực hiện') completedCount = Math.floor(steps.length * 0.5);
    else if (status === 'Hoàn thành') completedCount = steps.length;

    const sch = booking.schedule || {};
    const baseDate = sch.date || sch.checkIn || new Date().toISOString().slice(0, 10);
    const baseTime = new Date(`${baseDate}T08:00:00`);
    const petName  = booking.petInfo?.petName || 'bé';

    return steps.map((step, i) => {
        const isDone   = i < completedCount;
        const isLive   = i === completedCount && status === 'Đang thực hiện';
        const stepTime = new Date(baseTime.getTime() + i * 45 * 60000);

        const staffName = DEMO_STAFF[i % DEMO_STAFF.length];

        // Mood theo bước, fallback theo index
        const moodKey  = STEP_MOOD_MAP[step.key] || DEMO_MOODS[i % DEMO_MOODS.length].key;
        const mood     = DEMO_MOODS.find(m => m.key === moodKey) || DEMO_MOODS[0];

        // Ảnh: lấy từ map theo bước, chọn theo index để đa dạng
        const stepImages = DEMO_IMAGES_BY_STEP[step.key] || [];
        const image = (isDone && stepImages.length > 0)
            ? stepImages[i % stepImages.length]
            : null;

        // Ghi chú chi tiết
        const note = (isDone || isLive) ? generateStepNote(step.key, petName, booking) : null;

        return {
            key:       step.key,
            icon:      step.icon,
            label:     step.label,
            time:      stepTime.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
            date:      stepTime.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }),
            isDone,
            isLive,
            isPending: !isDone && !isLive,
            staff:     (isDone || isLive) ? staffName : null,
            mood:      isDone ? mood : null,
            note,
            image,
        };
    });
}

function generateStepNote(stepKey, petName, booking) {
    const svcName  = booking?.selectedService?.name || 'dịch vụ';
    const breed    = booking?.petInfo?.breed || '';
    const weight   = booking?.petInfo?.weight || '';
    const allergies = booking?.petInfo?.notes || booking?.petInfo?.allergies || '';
    const allergyNote = allergies
        ? ` Đã lưu ý: <em>${allergies.slice(0, 60)}${allergies.length > 60 ? '...' : ''}</em>.`
        : '';

    const notes = {
        checkin: `${petName} đã được tiếp nhận lúc mở cửa. Nhân viên kiểm tra tổng quát: mắt sáng, lông sạch, nhiệt độ cơ thể bình thường (38.5°C). Cân nặng ghi nhận: ${weight ? weight + ' kg' : 'đã ghi nhận'}.${allergyNote}`,

        bath: `${petName} được tắm bằng sữa tắm ${breed ? 'chuyên dụng cho ' + breed : 'cao cấp'}, pH cân bằng, không gây kích ứng da. Nước ấm 37°C, thời gian tắm ~20 phút. Lông và da sạch hoàn toàn.`,

        dry: `Sấy khô bằng máy sấy chuyên nghiệp ở nhiệt độ thấp, an toàn cho da nhạy cảm. Chải lông kỹ từng lớp — lông ${petName} mềm mượt, bồng bềnh và thơm tho.`,

        groom: `Cắt tỉa theo yêu cầu của chủ nuôi cho dịch vụ <strong>${svcName}</strong>. Tỉa móng, vệ sinh tai, làm sạch vùng mắt. Kết quả: ${petName} trông gọn gàng và dễ thương hơn hẳn.`,

        finish: `Hoàn thiện: xịt nước hoa thú cưng nhẹ nhàng, đeo nơ/bandana theo sở thích. Chụp ảnh kỷ niệm cho ${petName}. Nhân viên đánh giá: bé rất ngoan và hợp tác trong suốt buổi.`,

        checkout: `${petName} đã được bàn giao cho chủ nuôi. Nhân viên tổng kết buổi chăm sóc, hướng dẫn chăm sóc tại nhà sau khi tắm. Hẹn gặp lại lần sau! 🐾`,

        settle: `${petName} đã được dẫn vào phòng riêng, làm quen với không gian mới. Bé tỏ ra tò mò và khám phá xung quanh. Đã đặt đồ chơi quen thuộc và chăn mềm theo yêu cầu.`,

        meal: `${petName} ăn hết khẩu phần ${allergies ? '(đã điều chỉnh theo lưu ý dị ứng)' : 'tiêu chuẩn'}. Uống đủ nước. Nhân viên ghi nhận: bé ăn ngon miệng, không có dấu hiệu bất thường về tiêu hóa.`,

        play: `${petName} được ra khu vui chơi 30 phút. Bé chạy nhảy năng động, tương tác tốt với nhân viên và đồ chơi. Không có dấu hiệu căng thẳng hay lo lắng.`,

        rest: `${petName} đang nghỉ ngơi yên tĩnh trong phòng riêng. Điều hòa duy trì 26°C, ánh sáng dịu. Bé nằm thoải mái trên đệm mềm — trông rất ngoan và bình yên.`,

        health: `Kiểm tra sức khỏe định kỳ: nhiệt độ 38.4°C (bình thường), nhịp tim đều, mắt và mũi sạch. Không có dấu hiệu bất thường. ${petName} trong tình trạng sức khỏe tốt.`,
    };
    return notes[stepKey] || `Bước hoàn thành tốt. ${petName} trong trạng thái ổn định.`;
}

// ── Render tracker ────────────────────────────────────────────────────────────
function renderTracker() {
    const petSelect     = document.getElementById('trackerPetSelect');
    const bookingBar    = document.getElementById('trackerBookingBar');
    const bookingSelect = document.getElementById('trackerBookingSelect');
    const liveBanner    = document.getElementById('trackerLiveBanner');
    const liveText      = document.getElementById('trackerLiveText');
    const timeline      = document.getElementById('trackerTimeline');
    const emptyNoPet    = document.getElementById('trackerEmptyNoPet');
    const emptyNoBook   = document.getElementById('trackerEmptyNoBooking');
    const emptyNoLog    = document.getElementById('trackerEmptyNoLog');

    if (!petSelect || !timeline) return;

    // Ẩn tất cả empty states
    [emptyNoPet, emptyNoBook, emptyNoLog].forEach(el => el && (el.style.display = 'none'));
    timeline.innerHTML = '';
    if (liveBanner) liveBanner.style.display = 'none';
    if (bookingBar) bookingBar.style.display = 'none';

    // Kiểm tra có bé không
    if (pets.length === 0) {
        emptyNoPet && (emptyNoPet.style.display = 'flex');
        return;
    }

    // Populate pet select
    const currentPetVal = petSelect.value;
    petSelect.innerHTML = '<option value="">-- Chọn bé --</option>'
        + pets.map(p => `<option value="${p.id}">${p.species === 'Chó' ? '🐶' : '🐱'} ${p.name}</option>`).join('');
    
    if (currentPetVal && pets.some(p => p.id === currentPetVal)) {
        petSelect.value = currentPetVal;
    } else if (pets.length > 0) {
        petSelect.value = pets[0].id;
    }

    const selectedPetId = petSelect.value;
    if (!selectedPetId) return;

    const selectedPet = pets.find(p => p.id === selectedPetId);
    if (!selectedPet) return;

    // Lọc bookings theo petId khi có, fallback về tên nếu chưa có petId
    const petBookings = bookings.filter(b => {
        const byId = b.petId ? b.petId === selectedPetId : false;
        const byName = !b.petId && b.petInfo?.petName?.toLowerCase() === selectedPet.name.toLowerCase();
        return (byId || byName) && b.status !== 'Đã hủy';
    });

    if (petBookings.length === 0) {
        emptyNoBook && (emptyNoBook.style.display = 'flex');
        return;
    }

    // Hiện booking selector
    if (bookingBar) bookingBar.style.display = 'flex';
    const currentBookVal = bookingSelect ? bookingSelect.value : '';
    if (bookingSelect) {
        bookingSelect.innerHTML = petBookings.map(b => {
            const sch = b.schedule || {};
            const dateLabel = sch.date ? fmtDate(sch.date)
                            : sch.checkIn ? `${fmtDate(sch.checkIn)} → ${fmtDate(sch.checkOut)}`
                            : 'Không rõ ngày';
            return `<option value="${b.code}">${b.code} · ${b.selectedService?.name || 'Dịch vụ'} · ${dateLabel}</option>`;
        }).join('');
        if (currentBookVal) bookingSelect.value = currentBookVal;
    }

    const selectedCode = bookingSelect ? bookingSelect.value : petBookings[0]?.code;
    const selectedBooking = petBookings.find(b => b.code === selectedCode) || petBookings[0];
    if (!selectedBooking) {
        emptyNoLog && (emptyNoLog.style.display = 'flex');
        return;
    }

    // If booking is completed, ensure live session is closed in tracker logs
    closeLiveSessionIfCompleted(selectedBooking);

    // Sinh logs
    const logs = generateTrackerLogs(selectedBooking);
    const hasAnyDone = logs.some(l => l.isDone || l.isLive || (l.note && l.note.toString().trim() !== ''));

    // If there are no updates yet, show waiting message to customer
    const waitingEl = document.getElementById('trackerWaitingForStaff');
    if (!hasAnyDone) {
        if (waitingEl) waitingEl.style.display = 'flex';
        return;
    } else {
        if (waitingEl) waitingEl.style.display = 'none';
    }

    // Live banner
    const isLiveSession = selectedBooking.status === 'Đang thực hiện';
    if (liveBanner && isLiveSession) {
        liveBanner.style.display = 'flex';
        if (liveText) liveText.textContent = `${selectedPet.name} đang được chăm sóc tại PawPal`;
    }

    // Progress bar
    renderTrackerProgress(logs, timeline);

    // Summary bar (chỉ khi hoàn thành)
    if (selectedBooking.status === 'Hoàn thành') {
        renderTrackerSummary(selectedBooking, logs, timeline);
    }

    // Render từng bước
    logs.forEach((log, idx) => {
        if (log.isPending) return; // Chỉ hiện bước đã xong hoặc đang live
        const item = buildTrackerItem(log, idx);
        timeline.insertAdjacentHTML('beforeend', item);
    });

    // Bind urgent reply forms and display replies
    timeline.querySelectorAll('.tracker-item[data-urgent="true"]').forEach(itemEl => {
        const key = itemEl.datasetLogKey || itemEl.getAttribute('data-log-key');
        // replies render
        const replyList = itemEl.querySelector('.urgent-replies');
        const form = itemEl.querySelector('.urgent-reply-form');
        if (form) {
            form.addEventListener('submit', (ev) => {
                ev.preventDefault();
                const input = form.querySelector('input[name="urgentReply"]');
                if (!input) return;
                const val = input.value.trim();
                if (!val) return;
                const bookingCode = bookingSelect ? bookingSelect.value : (selectedBooking && selectedBooking.code);
                customerReplyToUrgent(bookingCode, itemEl.getAttribute('data-log-key'), val);
            });
        }
    });

    // Bind lightbox
    timeline.querySelectorAll('.tracker-media-item[data-src]').forEach(el => {
        el.addEventListener('click', () => openLightbox(el.dataset.src));
    });

    // Also render recommendations & historical lists up-to-date
    loadAllTrackerLogs();
    renderRecommendationsWidget();
    renderHistoricalLogs();
}

// ── Historical logs rendering ─────────────────────────────────────────────────
function renderHistoricalLogs() {
    loadBookings();
    loadPets();
    loadAllTrackerLogs();
    const container = document.getElementById('historicalLogsList');
    if (!container) return;
    const closed = bookings.filter(b => b.status === 'Hoàn thành').sort((a,b)=> new Date(b.completedAt || b.createdAt)-new Date(a.completedAt||a.createdAt));
    const totalPages = Math.max(1, Math.ceil(closed.length / HIST_PAGE_SIZE));
    if (histPage > totalPages) histPage = totalPages;
    const start = (histPage-1)*HIST_PAGE_SIZE;
    const pageItems = closed.slice(start, start+HIST_PAGE_SIZE);
    container.innerHTML = pageItems.map(buildHistoricalCard).join('') || '<p style="color:#666">Chưa có phiên đã hoàn tất.</p>';
    bindHistoryDetailButtons(container);
}

function bindHistoryDetailButtons(container) {
    container.querySelectorAll('.history-detail-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const code = btn.dataset.hist;
            if (code) openHistoryDetailModal(code);
        });
    });
}

function buildHistoricalCard(booking) {
    const date = formatBookingDate(booking);
    const svc = booking.selectedService?.name || 'Dịch vụ';
    const staff = booking.completedBy || (booking.petInfo && booking.petInfo.staff) || '—';
    return `
    <div class="history-card" style="border:1px solid rgba(0,0,0,0.04);padding:10px;border-radius:10px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">
        <div>
            <div style="font-weight:700">${booking.code}</div>
            <div style="font-size:0.9rem;color:#666">${date} · ${svc}</div>
            <div style="font-size:0.85rem;color:#666;margin-top:6px">Nhân viên: ${staff}</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
            <button class="btn-green-outline history-detail-btn" data-hist="${booking.code}">Xem chi tiết</button>
            <a class="btn-cta" href="booking.html?petId=${encodeURIComponent(booking.petId||'')}&service=${encodeURIComponent(booking.selectedService?.id||'')}">Đặt lại</a>
        </div>
    </div>`;
}

function openHistoryDetailModal(code) {
    loadAllTrackerLogs();
    const logs = trackerLogsStore[code] || [];
    const booking = bookings.find(b=>b.code===code) || {};
    const title = `${booking.code || code} · ${booking.selectedService?.name || ''} · ${formatBookingDate(booking)}`;
    document.getElementById('historyDetailTitle').textContent = title;
    const summary = document.getElementById('historyDetailSummary');
    summary.innerHTML = `<div style="font-size:0.95rem;color:#444"><strong>Thú cưng:</strong> ${booking.petInfo?.petName||'—'} · <strong>Chủ:</strong> ${booking.petInfo?.ownerName||'—'}</div>`;
    const timeline = document.getElementById('historyDetailTimeline');
    timeline.innerHTML = '';
    logs.forEach((l, idx)=>{
        // reuse buildTrackerItem markup
        const itemHtml = buildTrackerItem(l, idx);
        timeline.insertAdjacentHTML('beforeend', itemHtml);
    });
    document.getElementById('historyDetailModal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

// ── Recommendation engine (simple, runs once per day on load) ───────────────
function generateRecommendations() {
    loadPets(); loadBookings(); loadAllTrackerLogs();
    const todayStr = new Date().toISOString().slice(0,10);
    const lastRun = localStorage.getItem('pawpal_recommendations_last_run');
    if (lastRun === todayStr) return; // already generated today

    const recs = JSON.parse(localStorage.getItem('pawpal_user_recommendations') || '[]');
    const newRecs = [];

    // simple breed/service cycle mapping (days)
    const breedCycles = {
        'poodle': 28,
        'defaultDog': 35,
        'defaultCat': 30,
    };

    pets.forEach(p => {
        // find last completed booking for this pet with grooming/spa category
        const petBookings = bookings.filter(b => (b.petId === p.id || (b.petInfo && b.petInfo.petName && b.petInfo.petName.toLowerCase() === p.name.toLowerCase())) && b.status === 'Hoàn thành');
        if (!petBookings.length) return;
        const last = petBookings.sort((a,b)=> new Date(b.completedAt||b.createdAt) - new Date(a.completedAt||a.createdAt))[0];
        const svcName = last.selectedService?.name || '';
        const svcId = last.selectedService?.id || '';
        const lastDateStr = (last.completedAt || last.createdAt || '').slice(0,10);
        if (!lastDateStr) return;

        // determine cycle
        const breedKey = (p.breed || '').toLowerCase();
        let C = breedCycles['defaultDog'];
        if (breedKey.includes('poodle')) C = breedCycles['poodle'];
        if ((p.species || '').toLowerCase().includes('mèo') || (p.species||'').toLowerCase().includes('cat')) C = breedCycles['defaultCat'];

        const lastDate = new Date(lastDateStr + 'T00:00:00');
        const nextDate = new Date(lastDate.getTime() + C * 86400000);
        const today = new Date();
        if (today >= nextDate) {
            const title = `Đã ${Math.round((today - lastDate)/86400000)} ngày kể từ lần cuối ${svcName}`;
            const message = `Đã ${Math.round((today - lastDate)/86400000)} ngày kể từ lần cuối ${p.name} sử dụng ${svcName}. Gợi ý đặt lịch tiếp theo.`;
            // avoid duplicate for same lastDate
            const exists = recs.concat(newRecs).some(r => r.petId === p.id && r.serviceId === svcId && r.lastServiceDate === lastDateStr);
            if (!exists) {
                newRecs.push({ petId: p.id, petName: p.name, serviceId: svcId, title, message, lastServiceDate: lastDateStr, generatedAt: new Date().toISOString() });
            }
        }
    });

    const final = recs.concat(newRecs);
    localStorage.setItem('pawpal_user_recommendations', JSON.stringify(final));
    localStorage.setItem('pawpal_recommendations_last_run', todayStr);
}

function renderRecommendationsWidget() {
    const list = document.getElementById('recommendList');
    if (!list) return;
    const recs = JSON.parse(localStorage.getItem('pawpal_user_recommendations') || '[]');
    if (!recs.length) { list.innerHTML = '<div style="color:#666">Không có gợi ý nào hôm nay.</div>'; return; }
    list.innerHTML = recs.map(r => `
        <div style="padding:8px;border-bottom:1px dashed #eee;">
            <div style="font-weight:700">${r.title}</div>
            <div style="font-size:0.9rem;color:#666;margin:6px 0">${r.message}</div>
            <a class="btn-cta" href="booking.html?petId=${encodeURIComponent(r.petId||'')}&service=${encodeURIComponent(r.serviceId||'')}">Đặt lịch ngay</a>
        </div>
    `).join('');
}

// ── Render progress bar ───────────────────────────────────────────────────────
function renderTrackerProgress(logs, container) {
    const total = logs.length;
    const done  = logs.filter(l => l.isDone).length;
    const pct   = Math.round((done / total) * 100);

    const wrap = document.createElement('div');
    wrap.className = 'tracker-progress-wrap';
    wrap.innerHTML = `
        <div class="tracker-progress-label">
            <span>Tiến độ chăm sóc</span>
            <span>${done}/${total} bước · ${pct}%</span>
        </div>
        <div class="tracker-progress-bar-bg">
            <div class="tracker-progress-bar-fill" style="width: ${pct}%"></div>
        </div>`;
    container.appendChild(wrap);
}

// ── Render summary bar ────────────────────────────────────────────────────────
function renderTrackerSummary(booking, logs, container) {
    const svcName  = booking.selectedService?.name || '—';
    let petName  = booking.petInfo?.petName || '—';
    if (booking.petId) {
        loadPets();
        const p = pets.find(x => x.id === booking.petId);
        if (p) petName = p.name || petName;
    }
    const dateStr  = formatBookingDate(booking);
    const staffSet = [...new Set(logs.filter(l => l.staff).map(l => l.staff))];

    const bar = document.createElement('div');
    bar.className = 'tracker-summary-bar';
    bar.innerHTML = `
        <div class="tracker-summary-item">
            <span class="tracker-summary-label">Dịch vụ</span>
            <span class="tracker-summary-value">${svcName}</span>
        </div>
        <div class="tracker-summary-divider"></div>
        <div class="tracker-summary-item">
            <span class="tracker-summary-label">Thú cưng</span>
            <span class="tracker-summary-value">${petName}</span>
        </div>
        <div class="tracker-summary-divider"></div>
        <div class="tracker-summary-item">
            <span class="tracker-summary-label">Ngày</span>
            <span class="tracker-summary-value">${dateStr}</span>
        </div>
        <div class="tracker-summary-divider"></div>
        <div class="tracker-summary-item">
            <span class="tracker-summary-label">Nhân viên</span>
            <span class="tracker-summary-value">${staffSet.slice(0, 2).join(', ')}</span>
        </div>`;
    container.appendChild(bar);
}

// ── Build một tracker item HTML ───────────────────────────────────────────────
function buildTrackerItem(log, idx) {
    const badgeCls  = log.isLive ? 'badge-live' : 'badge-done';
    const badgeText = log.isLive ? '🔴 Đang thực hiện' : '✅ Hoàn thành';
    const liveCls   = log.isLive ? 'is-live' : '';

    const staffHtml = log.staff ? `
        <div class="tracker-card-staff">
            <div class="tracker-staff-avatar">${log.staff.charAt(0)}</div>
            <span>Nhân viên: <strong>${log.staff}</strong></span>
        </div>` : '';

    const moodHtml = log.mood ? `
        <span class="tracker-mood-tag ${log.mood.cls}">${log.mood.label}</span>` : '';

    const noteHtml = log.note ? `
        <p class="tracker-card-note">${log.note}</p>` : '';

    const imageHtml = log.image ? `
        <div class="tracker-media-grid">
            <div class="tracker-media-item" data-src="${log.image}" role="button" aria-label="Xem ảnh lớn">
                <img src="${log.image}" alt="${log.label}" loading="lazy">
                <div class="media-overlay">🔍</div>
            </div>
        </div>` : '';

    const urgentAttr = log.urgent ? ' data-urgent="true" data-log-key="' + (log.key || '') + '"' : ' data-log-key="' + (log.key || '') + '"';
    const repliesHtml = (log.replies && log.replies.length)
        ? `<div class="urgent-replies">${log.replies.map(r => `<div class="urgent-reply"><strong>${r.from === 'customer' ? 'Bạn' : r.from}:</strong> ${r.text} <span class="reply-time">· ${new Date(r.at).toLocaleString('vi-VN')}</span></div>`).join('')}</div>`
        : '';
    const replyFormHtml = log.urgent ? `
        <form class="urgent-reply-form" style="margin-top:8px;display:flex;gap:8px;align-items:center;">
            <input name="urgentReply" placeholder="Gửi phản hồi cho nhân viên..." style="flex:1;padding:8px;border-radius:8px;border:1px solid #e5e7eb;">
            <button class="btn-green-outline" type="submit" style="white-space:nowrap;">Gửi</button>
        </form>` : '';

    return `
    <div class="tracker-item ${liveCls}"${urgentAttr} style="animation-delay: ${idx * 0.08}s">
        <div class="tracker-item-dot">${log.icon}</div>
        <div class="tracker-card">
            <div class="tracker-card-header">
                <span class="tracker-card-time">${log.date} · ${log.time}</span>
                <span class="tracker-card-step-badge ${badgeCls}">${badgeText}</span>
            </div>
            <div class="tracker-card-body">
                <h5 class="tracker-card-title">${log.icon} ${log.label}</h5>
                ${noteHtml}
                ${staffHtml}
                ${moodHtml}
                ${imageHtml}
                ${repliesHtml}
                ${replyFormHtml}
            </div>
        </div>
    </div>`;
}

// ── Lightbox ──────────────────────────────────────────────────────────────────
function openLightbox(src) {
    let lb = document.getElementById('trackerLightbox');
    if (!lb) {
        lb = document.createElement('div');
        lb.id = 'trackerLightbox';
        lb.className = 'tracker-lightbox';
        lb.innerHTML = `
            <button class="tracker-lightbox-close" aria-label="Đóng">✕</button>
            <img src="" alt="Ảnh nhật ký">`;
        document.body.appendChild(lb);
        lb.querySelector('.tracker-lightbox-close').addEventListener('click', closeLightbox);
        lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
    }
    lb.querySelector('img').src = src;
    lb.classList.add('open');
    document.body.style.overflow = 'hidden';
}

function closeLightbox() {
    const lb = document.getElementById('trackerLightbox');
    if (lb) lb.classList.remove('open');
    document.body.style.overflow = '';
}

// ── SMS outbox (simulation) ─────────────────────────────────────────────────
function sendSmsNotification(phone, message) {
    try {
        const key = 'pawpal_sms_outbox';
        const raw = localStorage.getItem(key);
        const outbox = raw ? JSON.parse(raw) : [];
        const entry = { to: phone, message, sentAt: new Date().toISOString() };
        outbox.push(entry);
        localStorage.setItem(key, JSON.stringify(outbox));
        console.log('[SMS OUTBOX]', entry);
        showToast(`🔔 Đã gửi SMS tới ${phone}`);
    } catch (e) {
        console.warn('sendSmsNotification error', e);
    }
}

// ── Urgent note creator (staff) and customer reply handling ────────────────
function addUrgentNote(bookingCode, noteText, staffName = 'Nhân viên') {
    if (!bookingCode || !noteText) return;
    try {
        const key = 'pawpal_tracker_logs';
        const raw = localStorage.getItem(key);
        const logs = raw ? JSON.parse(raw) : {};
        const arr = logs[bookingCode] || [];
        const now = new Date();
        const date = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
        const time = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        const urgent = {
            key: `urgent_${now.getTime()}`,
            icon: '⚠️',
            label: 'Ghi chú khẩn',
            time, date,
            isDone: false, isLive: true, isPending: false,
            staff: staffName,
            note: noteText,
            urgent: true,
            replies: []
        };
        // insert urgent note at top so customer sees immediately
        arr.unshift(urgent);
        logs[bookingCode] = arr;
        localStorage.setItem(key, JSON.stringify(logs));

        // Find booking to get phone
        loadBookings();
        const booking = bookings.find(b => b.code === bookingCode);
        const phone = booking?.petInfo?.phone || '';
        if (phone) sendSmsNotification(phone, `PawPal: Ghi chú khẩn cho ${bookingCode} — ${noteText}`);

        // persist
        trackerLogsStore[bookingCode] = arr;
        saveTrackerLogs();

        // If tracker visible for this booking, re-render
        const activeTrackerTab = document.querySelector('.dash-tab-btn.active[data-dash-tab="dash-tracker"]');
        if (activeTrackerTab) {
            loadPets(); loadBookings(); renderTracker();
        }
    } catch (e) { console.warn('addUrgentNote', e); }
}

function customerReplyToUrgent(bookingCode, urgentKey, replyText) {
    if (!bookingCode || !urgentKey || !replyText) return;
    try {
        const key = 'pawpal_tracker_logs';
        const raw = localStorage.getItem(key);
        const logs = raw ? JSON.parse(raw) : {};
        const arr = logs[bookingCode] || [];
        const idx = arr.findIndex(l => l.key === urgentKey);
        if (idx === -1) return;
        const now = new Date().toISOString();
        arr[idx].replies = arr[idx].replies || [];
        arr[idx].replies.push({ from: 'customer', text: replyText, at: now });
        logs[bookingCode] = arr;
        trackerLogsStore = logs;
        saveTrackerLogs();
        showToast('✅ Đã gửi phản hồi tới nhân viên');
        // re-render if tracker open
        const activeTrackerTab = document.querySelector('.dash-tab-btn.active[data-dash-tab="dash-tracker"]');
        if (activeTrackerTab) renderTracker();
    } catch (e) { console.warn('customerReplyToUrgent', e); }
}

// ── Close live session when booking completed ──────────────────────────────
function closeLiveSessionIfCompleted(booking) {
    if (!booking || booking.status !== 'Hoàn thành') return;
    try {
        const key = 'pawpal_tracker_logs';
        const raw = localStorage.getItem(key);
        const logs = raw ? JSON.parse(raw) : {};
        const arr = logs[booking.code] || [];
        let changed = false;
        arr.forEach(l => {
            if (l.isLive) { l.isLive = false; changed = true; }
            if (l.isPending) { l.isPending = false; l.isDone = true; changed = true; }
        });
        if (changed) {
            logs[booking.code] = arr;
            trackerLogsStore = logs;
            saveTrackerLogs();
        }
    } catch (e) { console.warn('closeLiveSessionIfCompleted', e); }
}

// ── Init tracker tab ──────────────────────────────────────────────────────────
function initTracker() {
    const petSelect     = document.getElementById('trackerPetSelect');
    const bookingSelect = document.getElementById('trackerBookingSelect');

    petSelect?.addEventListener('change', () => {
        // Reset booking select khi đổi bé
        if (bookingSelect) bookingSelect.innerHTML = '';
        renderTracker();
    });

    bookingSelect?.addEventListener('change', renderTracker);
}

// ── Patch tab switching để render tracker khi chuyển tab ─────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTracker();

    document.querySelectorAll('.dash-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.dashTab === 'dash-tracker') {
                loadPets();
                loadBookings();
                renderTracker();
            }
        });
    });

    // Render ngay nếu tab tracker đang active
    const activeTrackerTab = document.querySelector('.dash-tab-btn.active[data-dash-tab="dash-tracker"]');
    if (activeTrackerTab) {
        loadPets();
        loadBookings();
        loadAllTrackerLogs();
        generateRecommendations();
        renderRecommendationsWidget();
        renderHistoricalLogs();
        renderTracker();
    }

    // Escape key đóng lightbox
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeLightbox();
    });
    // History modal events
    document.getElementById('historyDetailClose')?.addEventListener('click', () => {
        document.getElementById('historyDetailModal').style.display = 'none';
        document.body.style.overflow = '';
    });
    document.getElementById('historyDetailOverlay')?.addEventListener('click', () => {
        document.getElementById('historyDetailModal').style.display = 'none';
        document.body.style.overflow = '';
    });
    // Pagination
    document.getElementById('histPrevBtn')?.addEventListener('click', () => { if (histPage>1){ histPage--; renderHistoricalLogs(); } });
    document.getElementById('histNextBtn')?.addEventListener('click', () => { histPage++; renderHistoricalLogs(); });
});
