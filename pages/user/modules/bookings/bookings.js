
import { API } from '/scripts/api/api.js';
import { updateCustomerBooking } from '/scripts/shared/customer-booking.mjs';
import { watchCustomerTables } from '/scripts/shared/customer-realtime.mjs';



async function changeOnSupabase(bookingId, changes) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const booking = allBookings.find(b => String(b.id) === String(bookingId) || String(b._id) === String(bookingId));
    return updateCustomerBooking(db, user, booking, changes);
}

const statusAliases = {
    pending: ['pending', 'cho_xac_nhan', 'dang_giu_cho'],
    confirmed: ['confirmed', 'upcoming', 'da_xac_nhan'],
    accepted: ['accepted', 'da_check_in'],
    'in-progress': ['in-progress', 'dang_thuc_hien'],
    completed: ['completed', 'da_hoan_tat'],
    cancelled: ['cancelled', 'da_huy', 'da_het_han', 'vang_mat']
};

let allBookings = [];
let currentPetMap = new Map();

const DEFAULT_PET_AVATARS = {
    dog: '/assets/images/publics/dogcute3.jpg',
    cat: '/assets/images/publics/catcute5.jpg',
    rabbit: '/assets/images/publics/pet1.jpg',
    hamster: '/assets/images/publics/pet2.jpg',
    other: '/assets/images/publics/catcute5.jpg'
};

function getBookingPetAvatar(petObj, booking) {
    if (petObj?.image && petObj.image !== '/assets/images/placeholder.webp' && !petObj.image.includes('default-pet.png') && !petObj.image.includes('pet.jpg')) {
        return petObj.image;
    }
    if (petObj?.avatar && !petObj.avatar.includes('pet.jpg') && !petObj.avatar.includes('default-pet.png')) {
        return petObj.avatar;
    }
    if (booking?.petAvatar && !booking.petAvatar.includes('pet.jpg') && !booking.petAvatar.includes('default-pet.png')) {
        return booking.petAvatar;
    }

    const rawType = (petObj?.type || petObj?.species || booking?.petSpecies || booking?.petBreed || booking?.petName || '').toLowerCase();
    if (rawType.includes('mèo') || rawType.includes('cat') || rawType.includes('cà phê') || rawType.includes('mun') || rawType.includes('mimi') || rawType.includes('beo')) {
        return DEFAULT_PET_AVATARS.cat;
    }
    if (rawType.includes('chó') || rawType.includes('dog') || rawType.includes('corgi') || rawType.includes('poodle') || rawType.includes('golden') || rawType.includes('husky') || rawType.includes('lu')) {
        return DEFAULT_PET_AVATARS.dog;
    }
    if (rawType.includes('thỏ') || rawType.includes('rabbit')) {
        return DEFAULT_PET_AVATARS.rabbit;
    }
    if (rawType.includes('hamster') || rawType.includes('chuột')) {
        return DEFAULT_PET_AVATARS.hamster;
    }
    return DEFAULT_PET_AVATARS.cat;
}

function getServiceReviewKey(booking) {
    return `pawpal_service_review_${booking.id || booking.code || ''}`;
}

function hasServiceReview(booking) {
    try {
        return Boolean(localStorage.getItem(getServiceReviewKey(booking)));
    } catch {
        return false;
    }
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const cleaned = String(text).replace(/\s*&\s*/g, ' và ');
    const div = document.createElement('div');
    div.textContent = cleaned;
    return div.innerHTML;
}

let isInitRunning = false;
let bookingsLoadVersion = 0;
let stopBookingsRealtime;
export function dispose() {
    ++bookingsLoadVersion;
    stopBookingsRealtime?.();
}

export async function init() {
    if (isInitRunning) return;
    isInitRunning = true;
    try {
        if (!document.getElementById('bookingsList')) return;
        if (typeof window.setUserSubBreadcrumb === 'function') {
            window.setUserSubBreadcrumb('', 'bookings');
        }
        initFilterTabs();
        await loadBookings('all');
        const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        stopBookingsRealtime = watchCustomerTables(client, user?.id, ['appointment'], () => {
            const active = document.querySelector('.booking-filter-tab.active, .filter-tab.active');
            loadBookings(active?.dataset.status || 'all');
        });
    } finally {
        isInitRunning = false;
    }
}

function initFilterTabs() {
    const tabs = document.querySelectorAll('.booking-filter-tab, .filter-tab');
    tabs.forEach((tab) => {
        tab.addEventListener('click', function () {
            tabs.forEach((item) => {
                item.classList.remove('active');
                item.setAttribute('aria-selected', 'false');
            });

            this.classList.add('active');
            this.setAttribute('aria-selected', 'true');
            renderBookings(this.dataset.status);
        });
    });
}

async function loadBookings(status) {
    const loadVersion = ++bookingsLoadVersion;
    try {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        if (!currentUser) throw new Error('Vui lòng đăng nhập để xem lịch hẹn.');
        const liveBookings = await API.getUserBookings(currentUser);
        if (loadVersion !== bookingsLoadVersion) return;
        allBookings = liveBookings;
        const userPets = currentUser ? await API.getUserPets(currentUser) : [];
        if (loadVersion !== bookingsLoadVersion) return;
        
        currentPetMap = new Map();
        (Array.isArray(userPets) ? userPets : []).forEach((pet) => {
            if (pet._id) currentPetMap.set(String(pet._id), pet);
            if (pet.id) currentPetMap.set(String(pet.id), pet);
            if (pet.pet_code) currentPetMap.set(String(pet.pet_code), pet);
            if (pet.name) currentPetMap.set(String(pet.name).trim().toLowerCase(), pet);
            if (pet.pet_name) currentPetMap.set(String(pet.pet_name).trim().toLowerCase(), pet);
        });

        renderBookings(status);
    } catch (error) {
        if (loadVersion !== bookingsLoadVersion) return;
        console.error('Cannot load bookings:', error);
        allBookings = [];
        currentPetMap = new Map();
        renderBookings(status);
        const empty = document.getElementById('emptyState');
        if (empty) {
            empty.style.display = '';
            empty.textContent = 'Không thể tải lịch hẹn. Vui lòng thử lại.';
        }
    }
}

function renderBookings(status) {
    const bookingsList = document.getElementById('bookingsList');
    const emptyState = document.getElementById('emptyState');
    if (!bookingsList || !emptyState) return;

    let filteredBookings = [...allBookings];
    
    const uniqueMap = new Map();
    for (const b of filteredBookings) {
        const petKey = String(b.petId || b.petName || b.pet_profile?.pet_name || 'pet');
        const srvKey = String(b.service || b.serviceName || b.service?.service_name || 'srv');
        const dateKey = String(b.date || b.schedule?.date || '');
        const timeKey = String(b.timeStart || b.time || b.schedule?.slot || '');
        const key = `${petKey}-${srvKey}-${dateKey}-${timeKey}`.toLowerCase();
        
        if (!uniqueMap.has(key)) {
            uniqueMap.set(key, b);
        } else {
            const existing = uniqueMap.get(key);
            const existingHasPrice = Number(existing.price) > 0;
            const newHasPrice = Number(b.price) > 0;
            
            if (!existingHasPrice && newHasPrice) {
                uniqueMap.set(key, b); // Ghi đè bằng bản ghi có giá
            } else if (b._source === 'supabase' && existing._source !== 'supabase') {
                uniqueMap.set(key, b); // Ưu tiên supabase
            }
        }
    }
    filteredBookings = Array.from(uniqueMap.values());
    
    const counts = { all: filteredBookings.length, pending: 0, confirmed: 0, 'in-progress': 0, completed: 0, cancelled: 0 };
    filteredBookings.forEach(booking => {
        const resolved = resolveBookingStatus(booking);
        Object.keys(counts).forEach(key => {
            if (key !== 'all' && statusAliases[key] && statusAliases[key].includes(resolved)) {
                counts[key]++;
            }
        });
    });

    document.querySelectorAll('.booking-filter-tab, .filter-tab').forEach(tab => {
        const tabStatus = tab.dataset.status;
        const countSpan = tab.querySelector('.tab-count');
        const count = counts[tabStatus] || 0;
        if (countSpan) {
            countSpan.textContent = `(${count})`;
        } else {
            if (!tab.dataset.originalText) {
                tab.dataset.originalText = tab.innerText.replace(/\(\d+\)/g, '').trim();
            }
            tab.innerText = `${tab.dataset.originalText} (${count})`;
        }
    });

    if (status !== 'all') {
        const allowedStatuses = statusAliases[status] || [status];
        filteredBookings = filteredBookings.filter((booking) => allowedStatuses.includes(resolveBookingStatus(booking)));
    } else {
        const statusOrder = { 'in-progress': 1, pending: 2, upcoming: 3, confirmed: 3, accepted: 4, completed: 5, cancelled: 6 };
        filteredBookings.sort((a, b) => (statusOrder[resolveBookingStatus(a)] || 99) - (statusOrder[resolveBookingStatus(b)] || 99));
    }

    const skeletonEl = document.getElementById('bookingsSkeleton');
    if (skeletonEl) skeletonEl.remove();

    bookingsList.querySelectorAll('.booking-card').forEach((card) => card.remove());

    if (filteredBookings.length === 0) {
        emptyState.classList.remove('d-none');
        return;
    }

    emptyState.classList.add('d-none');
    filteredBookings.forEach((booking) => bookingsList.appendChild(createBookingCard(booking)));
}

function createBookingCard(booking) {
    const card = document.createElement('div');
    card.className = 'booking-card pawpal-smooth-entrance';
    const normalizedStatus = resolveBookingStatus(booking);
    const scheduledAt = getBookingScheduledAt(booking);
    const now = new Date();
    const diffMinutes = scheduledAt ? (scheduledAt - now) / (1000 * 60) : 999;
    const isWithin2Hours = diffMinutes < 120;

    const changeCount = Number(booking.changeCount || 0);
    const cancelCount = Number(booking.cancelCount || 0);
    const isChangeLimited = changeCount >= 2;

    // 1. Quy trình 3.1.5: Chỉ cho phép đổi lịch khi trạng thái là "confirmed" (Đã xác nhận)
    const canModify = (normalizedStatus === 'confirmed') && !isChangeLimited;

    // 2. Nghiệp vụ Hủy lịch: Chỉ cho phép hủy khi pending hoặc confirmed. Khóa hoàn toàn khi in-progress, accepted, completed, cancelled.
    const canCancel = ['pending', 'confirmed'].includes(normalizedStatus);
    
    const petKey = String(booking.petId || '');
    const petNameLower = String(booking.petName || booking.petInfo?.petName || '').trim().toLowerCase();
    const petObj = currentPetMap.get(petKey) || (petNameLower ? currentPetMap.get(petNameLower) : null);
    const petId = booking.petId || petObj?._id || petObj?.id || '';
    const bookingId = booking.id || booking._id || '';
    const petAvatar = getBookingPetAvatar(petObj, booking);
    const petName = booking.petName || petObj?.name || petObj?.pet_name || booking.petInfo?.petName || booking.petId || 'Bé cưng';
    const serviceName = (booking.service || booking.serviceName || booking.selectedService?.name || 'Dịch vụ PawPal').replace(/\s*&\s*/g, ' và ');
    const dateTimeText = buildDateTimeText(booking);

    const diaryQuery = petId ? `?id=${encodeURIComponent(petId)}&sessionId=${encodeURIComponent(bookingId)}` : '';
    const alreadyReviewed = normalizedStatus === 'completed' && hasServiceReview(booking);

    let actionButtonsHtml = '';

    // 1. Phản ánh dịch vụ
    if (normalizedStatus === 'completed') {
        actionButtonsHtml += `
            <a class="btn-booking-action btn-action-complaint" href="../support-create/support-create.html?type=service&bookingId=${encodeURIComponent(bookingId)}" onclick="event.stopPropagation()" title="Gửi phản ánh hoặc khiếu nại ca dịch vụ này">
                Phản ánh dịch vụ
            </a>
        `;
    }

    // 2. Hủy lịch
    if (canCancel) {
        actionButtonsHtml += `
            <button type="button" class="btn-booking-action btn-action-cancel btn-cancel-booking ${isWithin2Hours ? 'disabled' : ''}" 
                data-booking-id="${bookingId}" 
                title="${isWithin2Hours ? 'Đã quá thời gian tự hủy lịch (< 2 tiếng). Vui lòng gọi Hotline để được hỗ trợ.' : 'Hủy lịch hẹn này'}">
                Hủy lịch
            </button>
        `;
    }

    // 3. Đổi lịch
    if (canModify) {
        actionButtonsHtml += `
            <button type="button" class="btn-booking-action btn-action-modify btn-change-schedule ${isWithin2Hours ? 'disabled' : ''}" 
                data-booking-id="${bookingId}" 
                title="${isWithin2Hours ? 'Đã quá thời gian tự thay đổi lịch (< 2 tiếng). Vui lòng gọi Hotline để được hỗ trợ.' : 'Thay đổi ngày giờ lịch hẹn'}">
                Đổi lịch
            </button>
        `;
    }

    // 4. Đánh giá
    if (normalizedStatus === 'completed') {
        if (!alreadyReviewed) {
            actionButtonsHtml += `
                <a class="btn-booking-action btn-action-review" href="#booking-detail?id=${encodeURIComponent(bookingId)}#service-review" onclick="event.stopPropagation()">
                    Đánh giá
                </a>
            `;
        } else {
            actionButtonsHtml += `<span class="badge-reviewed-9px">Đã đánh giá</span>`;
        }
    }

    // 5. Nút chính Primary CTA (Vàng hổ phách #E5A83B): Xem nhật ký / Theo dõi trực tiếp
    if (normalizedStatus === 'in-progress' && petId) {
        actionButtonsHtml += `
            <a class="btn-booking-action btn-action-primary" href="#diary${diaryQuery}" onclick="event.stopPropagation()">
                Theo dõi trực tiếp
            </a>
        `;
    } else if (normalizedStatus === 'completed' && petId) {
        actionButtonsHtml += `
            <a class="btn-booking-action btn-action-primary" href="#diary${diaryQuery}" onclick="event.stopPropagation()">
                Xem nhật ký
            </a>
        `;
    }

    card.className = `booking-card pawpal-smooth-entrance status-${normalizedStatus}`;
    card.tabIndex = 0;
    card.setAttribute('role', 'link');
    card.onclick = () => {
        window.location.hash = `#booking-detail?id=${encodeURIComponent(bookingId)}`;
    };
    card.setAttribute('aria-label', `Xem chi tiết lịch hẹn ${petName}`);

    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            window.location.hash = `#booking-detail?id=${encodeURIComponent(bookingId)}`;
        }
    });

    card.innerHTML = `
        <div class="booking-card-main-content">
            <div class="booking-pet-avatar-wrapper">
                <img src="${petAvatar}" alt="${escapeHtml(petName)}" class="booking-pet-avatar" onerror="this.onerror=null; this.src='/assets/images/publics/catcute5.jpg';">
            </div>
            <div class="booking-info-col">
                <div class="booking-title-row">
                    <h4 class="booking-pet-name">${escapeHtml(petName)}</h4>
                    <span class="booking-dot-sep">•</span>
                    <span class="booking-service-name">${escapeHtml(serviceName)}</span>
                </div>
                <div class="booking-meta-row">
                    <span class="booking-datetime">Thời gian: ${dateTimeText}</span>
                    ${booking.staff ? `<span class="booking-meta-item">• Nhân viên: ${escapeHtml(booking.staff)}</span>` : ''}
                    ${booking.branch ? `<span class="booking-meta-item">• Chi nhánh: ${escapeHtml(booking.branch)}</span>` : ''}
                </div>
                ${changeCount > 0 ? `<div class="booking-alert-note ${isChangeLimited ? 'limit-reached' : ''}">Đã đổi lịch: ${changeCount} lần${isChangeLimited ? ' (Đã hết lượt đổi)' : ''}</div>` : ''}
            </div>
            <div class="booking-status-price-col">
                <span class="booking-badge-status status-${normalizedStatus}">${statusLabels[normalizedStatus] || normalizedStatus}</span>
                <span class="booking-price-value">${formatPrice(booking.price || 0)}</span>
            </div>
        </div>
        ${actionButtonsHtml ? `
            <div class="booking-card-footer-actions">
                <div class="booking-card-actions-group">
                    ${actionButtonsHtml}
                </div>
            </div>
        ` : ''}
    `;

    const changeBtn = card.querySelector('.btn-change-schedule');
    if (changeBtn) {
        changeBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (isWithin2Hours) {
                showToast('Đã quá thời gian tự thay đổi lịch hẹn (< 2 tiếng). Ca hẹn sắp diễn ra, vui lòng liên hệ Hotline 1900 1234 để được hỗ trợ.', 'danger');
                return;
            }
            openQuickRescheduleModal(booking);
        });
    }

    const cancelBtn = card.querySelector('.btn-cancel-booking');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (isWithin2Hours) {
                showToast('Chỉ được phép tự hủy lịch trước giờ bắt đầu tối thiểu 2 tiếng. Ca hẹn sắp diễn ra, vui lòng liên hệ Hotline 1900 1234 để được hỗ trợ.', 'danger');
                return;
            }
            const currentUser = (window.getCurrentUser && window.getCurrentUser()) || JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
            if (currentUser && Number(currentUser.cancelCount || 0) >= 3) {
                showToast('Tài khoản của bạn đã vượt quá ngưỡng hủy lịch cho phép (> 3 lần). Chức năng đặt và quản lý lịch trực tuyến của bạn đã bị tạm khóa. Vui lòng gọi Hotline 1900 1234.', 'danger');
                return;
            }
            openQuickCancelModal(booking);
        });
    }

    return card;
}

function buildDateTimeText(booking) {
    let dateTimeText = formatDate(booking.date || booking.schedule?.date);

    if (booking.timeStart) {
        dateTimeText += ` - ${booking.timeStart}${booking.timeEnd ? ` đến ${booking.timeEnd}` : ''}`;
    } else if (booking.time) {
        dateTimeText += ` - ${booking.time}`;
    } else if (booking.schedule?.slot) {
        dateTimeText += ` - ${booking.schedule.slot}`;
    } else if (booking.dateEnd) {
        const nights = calculateNights(booking.date, booking.dateEnd);
        dateTimeText += ` - ${formatDate(booking.dateEnd)} (${nights} đêm)`;
    }

    return dateTimeText;
}

export function formatDate(dateString) {
    if (!dateString) return 'Chưa có ngày';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return dateString;
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function calculateNights(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function resolveBookingStatus(booking) {
    const rawStatus = booking?.status || 'upcoming';
    if (['cancelled', 'completed', 'in-progress', 'accepted', 'pending'].includes(rawStatus)) {
        return rawStatus;
    }

    const isHotel = String(booking?.serviceCategory || booking?.category || booking?.service_type || '').toLowerCase() === 'hotel' || String(booking?.service || booking?.serviceName || '').toLowerCase().includes('hotel');
    
    if (isHotel && booking.dateEnd) {
        const endDate = new Date(`${booking.dateEnd}T12:00:00`);
        const now = Date.now();
        if (!Number.isNaN(endDate.getTime())) {
            if (now > endDate.getTime() + 4 * 3600000) return 'completed';
            const startDate = new Date(`${booking.date}T12:00:00`);
            if (now >= startDate.getTime()) return 'in-progress';
            return 'confirmed';
        }
    }

    const scheduledAt = getBookingScheduledAt(booking);
    if (!scheduledAt) {
        return rawStatus === 'confirmed' ? 'accepted' : 'confirmed';
    }

    const now = Date.now();
    const hoursPast = (now - scheduledAt.getTime()) / (1000 * 60 * 60);

    if (hoursPast >= 4) return 'completed';
    if (hoursPast >= 1) return 'in-progress';
    if (hoursPast >= 0) return 'accepted';
    return 'confirmed';
}

function getBookingScheduledAt(booking) {
    if (!booking?.date) return null;
    const isHotel = String(booking?.serviceCategory || booking?.category || booking?.service_type || '').toLowerCase() === 'hotel' || String(booking?.service || booking?.serviceName || '').toLowerCase().includes('hotel');
    const time = booking.time || booking.timeStart || (isHotel ? '12:00' : '09:00');
    const scheduled = new Date(`${booking.date}T${time}:00`);
    return Number.isNaN(scheduled.getTime()) ? null : scheduled;
}

export function formatPrice(price) {
    if (!price && price !== 0) return 'Giá theo thực tế';
    let numPrice = Number(price);
    if (isNaN(numPrice) && typeof price === 'string') {
        numPrice = Number(price.replace(/[^\d]/g, ''));
    }
    if (!numPrice || numPrice <= 0) return 'Giá theo thực tế';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(numPrice);
}

window.BookingsData = {
    statusLabels,
    formatDate,
    formatPrice
};

function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
        window.showToast(message, type);
        return;
    }
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast-custom toast-${type}`;
    const bg = type === 'danger' ? '#ef4444' : (type === 'success' ? '#236B48' : (type === 'warning' ? '#d97706' : '#3b82f6'));
    toast.style.cssText = `background:${bg};color:#fff;padding:12px 18px;border-radius:9px;font-size:0.9rem;box-shadow:0 4px 12px rgba(0,0,0,0.15);`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openQuickCancelModal(booking) {
    const scheduledAt = getBookingScheduledAt(booking);
    const now = new Date();
    const diffMinutes = scheduledAt ? (scheduledAt - now) / (1000 * 60) : 999;

    if (diffMinutes < 120) {
        showToast('Chỉ được phép tự hủy lịch hẹn trước giờ bắt đầu tối thiểu 2 tiếng. Ca hẹn sắp diễn ra, vui lòng liên hệ Hotline 1900 1234 để được hỗ trợ.', 'danger');
        return;
    }

    const currentUser = (window.getCurrentUser && window.getCurrentUser()) || JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
    if (currentUser && Number(currentUser.cancelCount || 0) >= 3) {
        showToast('Tài khoản của bạn đã vượt quá ngưỡng hủy lịch cho phép (> 3 lần). Chức năng đặt và quản lý lịch trực tuyến của bạn đã bị tạm khóa. Vui lòng gọi Hotline 1900 1234.', 'danger');
        return;
    }

    const existing = document.getElementById('quickCancelBookingModal');
    if (existing) existing.remove();

    const petKey = String(booking.petId || '');
    const petObj = currentPetMap.get(petKey);
    const petName = booking.petName || petObj?.name || booking.petInfo?.petName || booking.petId || 'Bé cưng';
    const serviceName = booking.service || booking.serviceName || booking.selectedService?.name || 'Dịch vụ PawPal';
    const bookingId = booking.id || booking._id || '';

    const modalEl = document.createElement('div');
    modalEl.id = 'quickCancelBookingModal';
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Hủy lịch hẹn</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Bạn có chắc muốn hủy lịch <strong>${serviceName}</strong> của <strong>${petName}</strong> không?</p>
                    <p class="text-muted small mb-0">Lịch đã hủy sẽ không thể khôi phục.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Không</button>
                    <button type="button" class="btn-cta" id="quickConfirmCancelBtn">Xác nhận hủy</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modalEl);

    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    modalEl.querySelector('#quickConfirmCancelBtn').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        if (button.disabled) return;
        button.disabled = true;
        try {
            await changeOnSupabase(bookingId, { appointment_status: 'CANCELLED' });
            modal.hide();
            showToast('Đã hủy lịch hẹn thành công', 'success');
            await loadBookings(document.querySelector('.filter-tab.active')?.dataset.status || 'all');
        } catch (error) { showToast(error.message, 'error'); }
        finally { button.disabled = false; }

    });
}

function openQuickRescheduleModal(booking) {
    const scheduledAt = getBookingScheduledAt(booking);
    const now = new Date();
    const diffMinutes = scheduledAt ? (scheduledAt - now) / (1000 * 60) : 999;

    if (diffMinutes < 120) {
        showToast('Đã quá thời gian tự thay đổi lịch tự động (< 2 tiếng). Ca hẹn sắp diễn ra, vui lòng liên hệ Hotline 1900 1234 để được hỗ trợ.', 'danger');
        return;
    }

    const changeCount = Number(booking.changeCount || 0);
    if (changeCount >= 2) {
        showToast('Bạn đã sử dụng hết 2 lần thay đổi lịch hẹn trực tuyến. Vui lòng liên hệ Hotline 1900 1234 để được hỗ trợ.', 'warning');
        return;
    }

    const existing = document.getElementById('quickRescheduleBookingModal');
    if (existing) existing.remove();

    const petKey = String(booking.petId || '');
    const petObj = currentPetMap.get(petKey);
    const petName = booking.petName || petObj?.name || booking.petInfo?.petName || booking.petId || 'Bé cưng';
    const serviceName = booking.service || booking.serviceName || booking.selectedService?.name || 'Dịch vụ PawPal';
    const bookingId = booking.id || booking._id || '';

    const configSlots = (window.PawPalBookingConfig?.slots) || ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'];
    const slotOptions = configSlots.map((slot) => `<button type="button" class="quick-slot-btn" data-slot="${slot}">${slot}</button>`).join('');
    const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const modalEl = document.createElement('div');
    modalEl.id = 'quickRescheduleBookingModal';
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    const isHotelBooking = false;
    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${isHotelBooking ? 'Đổi ngày lưu trú' : 'Đổi lịch hẹn'}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small mb-3">${isHotelBooking ? 'Pet Hotel chỉ cần đổi ngày, không cần chọn giờ hay nhân viên.' : `Chọn ngày và giờ mới cho lịch <strong>${serviceName}</strong> của <strong>${petName}</strong>.`}</p>
                    <label class="form-label fw-semibold">Chọn ngày</label>
                    <input type="date" id="quickRescheduleDate" class="form-control mb-3" min="${minDate}">
                    ${isHotelBooking ? '' : `
                    <label class="form-label fw-semibold">Chọn giờ</label>
                    <div class="d-flex flex-wrap gap-2 mb-3" id="quickRescheduleSlots">${slotOptions}</div>
                    `}
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Hủy</button>
                    <button type="button" class="btn-cta" id="quickConfirmRescheduleBtn" disabled>Xác nhận đổi lịch</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modalEl);

    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    let selectedDate = '';
    let selectedSlot = isHotelBooking ? '' : '';
    const refreshState = () => {
        if (!isHotelBooking) {
            modalEl.querySelectorAll('.quick-slot-btn').forEach((btn) => btn.classList.remove('active'));
            modalEl.querySelectorAll('.quick-slot-btn').forEach((btn) => {
                if (btn.dataset.slot === selectedSlot) btn.classList.add('active');
            });
        }
        modalEl.querySelector('#quickConfirmRescheduleBtn').disabled = isHotelBooking ? !selectedDate : !(selectedDate && selectedSlot);
    };

    modalEl.querySelector('#quickRescheduleDate').addEventListener('change', (e) => {
        selectedDate = e.target.value;
        refreshState();
    });
    if (!isHotelBooking) {
        modalEl.querySelectorAll('.quick-slot-btn').forEach((btn) => {
            btn.addEventListener('click', () => { selectedSlot = btn.dataset.slot; refreshState(); });
        });
    }

    modalEl.querySelector('#quickConfirmRescheduleBtn').addEventListener('click', async (event) => {
        const button = event.currentTarget;
        if (button.disabled) return;
        button.disabled = true;
        try {
            await changeOnSupabase(bookingId, { appointment_date: selectedDate,
                ...(selectedSlot ? { appointment_time: selectedSlot + ':00' } : {}), appointment_status: 'PENDING' });
            modal.hide();
            showToast('Đã đổi lịch hẹn thành công', 'success');
            await loadBookings(document.querySelector('.filter-tab.active')?.dataset.status || 'all');
        } catch (error) { showToast(error.message, 'error'); }
        finally { button.disabled = false; }

    });
}

