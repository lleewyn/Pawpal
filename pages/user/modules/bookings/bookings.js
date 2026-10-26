
import { API } from '/scripts/api/api.js';
import { cancelCustomerBooking, quoteCustomerBookingMove, moveCustomerBooking } from '/scripts/shared/customer-booking.mjs';
import { watchCustomerTables } from '/scripts/shared/customer-realtime.mjs';
import { parseVietnamDateTimeInput } from '/scripts/shared/booking-time.mjs';




export const statusLabels = {
    dang_giu_cho: 'Đang giữ chỗ',
    cho_xac_nhan: 'Chờ xác nhận',
    da_xac_nhan: 'Đã xác nhận',
    da_check_in: 'Đã tiếp nhận',
    dang_thuc_hien: 'Đang thực hiện',
    da_hoan_tat: 'Hoàn thành',
    da_huy: 'Đã hủy',
    da_het_han: 'Đã hết hạn',
    vang_mat: 'Vắng mặt',
    pending: 'Chờ xác nhận',
    upcoming: 'Đã xác nhận',
    confirmed: 'Đã xác nhận',
    accepted: 'Đã tiếp nhận',
    'in-progress': 'Đang thực hiện',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy'
};

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



function hasServiceReview(booking) {
    return booking.items?.length > 0 && booking.items.every(item => (booking.reviewedItemIds || []).includes(item.id));
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
        stopBookingsRealtime = watchCustomerTables(client, user?.id, ['appointment', 'appointment_item', 'payment', 'review'], () => {
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
    const endAt = booking.scheduledEndAt ? new Date(booking.scheduledEndAt) : null;
    const expectedEnd = endAt && !Number.isNaN(endAt.getTime()) ? endAt.toLocaleString('vi-VN', { timeZone:'Asia/Ho_Chi_Minh', day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '';
    const visibleNote = String(booking.note || '').replace(/\[Pawpal\s+(intake|handover)(?:\s+v\d+)?\][\s\S]*?\[\/Pawpal\s+\1\]/gi, ' ').replace(/\[Pawpal\s+(?:intake|handover)(?:\s+v\d+)?\][\s\S]*$/gi, '').trim();
    const serviceItems = (booking.items || []).filter(item=>item.name).map(item=>`${escapeHtml(item.name)}${Number(item.quantity)>1?' × '+Number(item.quantity):''}`).join('<br>');

    const diaryQuery = petId ? `?id=${encodeURIComponent(petId)}&sessionId=${encodeURIComponent(bookingId)}` : '';
    const alreadyReviewed = normalizedStatus === 'completed' && hasServiceReview(booking);

    let actionButtonsHtml = '';

    // 1. Phản ánh dịch vụ
    if (normalizedStatus === 'completed') {
        actionButtonsHtml += `
            <a class="btn-booking-action btn-action-complaint" href="#support-create?type=service&bookingId=${encodeURIComponent(bookingId)}" onclick="event.stopPropagation()" title="Gửi phản ánh hoặc khiếu nại ca dịch vụ này">
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
                <a class="btn-booking-action btn-action-review" href="#booking-detail?id=${encodeURIComponent(bookingId)}&section=service-review" onclick="event.stopPropagation()">
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
    // Trang SPA giữ nguyên vị trí cuộn khi đổi route: cuộn về đầu để trang mới không mở ở vùng footer
    card.onclick = () => {
        window.scrollTo(0, 0);
        window.location.hash = `#booking-detail?id=${encodeURIComponent(bookingId)}`;
    };
    card.setAttribute('aria-label', `Xem chi tiết lịch hẹn ${petName}`);

    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            window.scrollTo(0, 0);
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
        <div class="booking-card-details">
            <div><span class="booking-detail-label">Mã lịch hẹn</span><span class="booking-detail-value">${escapeHtml(bookingId)}</span></div>
            ${expectedEnd ? `<div><span class="booking-detail-label">Kết thúc dự kiến</span><span class="booking-detail-value">${escapeHtml(expectedEnd)}</span></div>` : ''}
            ${Number.isFinite(booking.netPaid) ? `<div><span class="booking-detail-label">Đã thanh toán sau hoàn</span><span class="booking-detail-value">${formatPrice(booking.netPaid)}</span></div>` : ''}
            ${serviceItems ? `<div class="booking-details-wide"><span class="booking-detail-label">Dịch vụ đã đặt</span><span class="booking-detail-value">${serviceItems}</span></div>` : ''}
            ${visibleNote ? `<div class="booking-details-wide"><span class="booking-detail-label">Ghi chú</span><span class="booking-detail-value booking-note-preview">${escapeHtml(visibleNote)}</span></div>` : ''}
        </div>
        ${actionButtonsHtml ? `
            <div class="booking-card-footer-actions">
                <div class="booking-card-actions-group">
                    ${actionButtonsHtml}
                </div>
            </div>
        ` : ''}
    `;

    card.querySelectorAll('a.btn-booking-action').forEach((link) => {
        link.addEventListener('click', () => window.scrollTo(0, 0));
    });

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
    return date.toLocaleDateString('vi-VN', { timeZone:'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function calculateNights(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function resolveBookingStatus(booking) {
    return booking?.status || 'pending';
}

function getBookingScheduledAt(booking) {
    if (booking?.scheduledStartAt) {
        const instant = new Date(booking.scheduledStartAt);
        if (!Number.isNaN(instant.getTime())) return instant;
    }
    if (!booking?.date) return null;
    const isHotel = String(booking?.serviceCategory || booking?.category || booking?.service_type || '').toLowerCase() === 'hotel' || String(booking?.service || booking?.serviceName || '').toLowerCase().includes('hotel');
    const time = booking.time || booking.timeStart || (isHotel ? '12:00' : '09:00');
    return parseVietnamDateTimeInput(`${booking.date}T${time}`);
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
        // window.showToast (scripts/shared/auth.js) nhận (type, message) và không có kiểu 'danger'
        window.showToast(type === 'danger' ? 'error' : type, message);
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
    openBookingCancelModal(booking, () => loadBookings(document.querySelector('.booking-filter-tab.active, .filter-tab.active')?.dataset.status || 'all'));
}

export function openBookingCancelModal(booking, onSaved) {
    document.getElementById('quickCancelBookingModal')?.remove();
    const modal = document.createElement('dialog');
    modal.id = 'quickCancelBookingModal';
    modal.style.cssText = 'position:fixed;inset:0;margin:auto;width:540px;max-width:92vw;padding:26px 30px;border:1px solid #ECF2EE;border-radius:9px;color:#203A2C;background:#fff;';
    modal.innerHTML = `<form onsubmit="return false;" style="display:grid;gap:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
        <h3 style="margin:0;color:#236B48;font-size:20px;">Hủy lịch hẹn</h3>
        <button type="button" class="btn-green-outline" data-close-modal="quickCancelBookingModal">Đóng</button>
      </div>
      <p style="margin:0;">Hủy lịch <strong>${escapeHtml(booking.serviceName || booking.service)}</strong> của <strong>${escapeHtml(booking.petName)}</strong>?</p>
      <div><label for="bookingCancelReason" class="form-label">Lý do hủy <span style="color:#DC2626;">*</span></label>
        <textarea id="bookingCancelReason" class="form-control" rows="3" maxlength="2000" required style="border-radius:9px;"></textarea>
      </div>
      <p id="bookingCancelError" role="alert" style="margin:0;color:#DC2626;" hidden></p>
      <div style="display:flex;justify-content:flex-end;gap:12px;">
        <button type="button" class="btn-green-outline" data-close-modal="quickCancelBookingModal">Giữ lịch</button>
        <button type="button" class="btn-cta" id="quickConfirmCancelBtn">Xác nhận hủy</button>
      </div>
    </form>`;
    document.body.appendChild(modal);
    modal.querySelector('form').addEventListener('submit',e=>e.preventDefault());
    modal.querySelectorAll('[data-close-modal]').forEach(button=>button.addEventListener('click',()=>modal.close()));
    modal.addEventListener('click',e=>{const r=modal.getBoundingClientRect();if(e.target===modal&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))modal.close();});
    modal.addEventListener('close',()=>modal.remove(),{once:true});
    const requestId=crypto.randomUUID();
    modal.querySelector('#quickConfirmCancelBtn').addEventListener('click',async e=>{
        const button=e.currentTarget;if(button.disabled)return;
        const reason=modal.querySelector('#bookingCancelReason'),error=modal.querySelector('#bookingCancelError');
        error.hidden=true;
        if(!reason.value.trim()){error.textContent='Vui lòng nhập lý do hủy lịch.';error.hidden=false;reason.focus();return;}
        button.disabled=true;
        try{
            const db=window.getSupabaseClient?.() || window.SupabaseClient;
            const user=window.getCurrentUser?.() || JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            await cancelCustomerBooking(db,user,booking,reason.value,requestId);
            modal.close();showToast('Đã hủy lịch hẹn.','success');await onSaved?.();
        }catch(err){error.textContent=err.message;error.hidden=false;}
        finally{button.disabled=false;}
    });
    modal.showModal();
}

function openQuickRescheduleModal(booking) {
    openBookingMoveModal(booking, () => loadBookings(document.querySelector('.booking-filter-tab.active, .filter-tab.active')?.dataset.status || 'all'));
}

export function openBookingMoveModal(booking,onSaved) {
    document.getElementById('quickRescheduleBookingModal')?.remove();
    const modal=document.createElement('dialog');modal.id='quickRescheduleBookingModal';
    modal.style.cssText='position:fixed;inset:0;margin:auto;width:600px;max-width:94vw;max-height:92vh;overflow:auto;padding:26px 30px;border:1px solid #ECF2EE;border-radius:9px;color:#203A2C;background:#fff;overscroll-behavior:contain;';
    modal.innerHTML=`<form onsubmit="return false;" style="display:grid;gap:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
        <h3 style="margin:0;color:#236B48;font-size:20px;">Đổi lịch hẹn</h3>
        <button type="button" class="btn-green-outline" data-close-modal="quickRescheduleBookingModal">Đóng</button>
      </div>
      <p style="margin:0;"><strong>${escapeHtml(booking.serviceName || booking.service)}</strong> của <strong>${escapeHtml(booking.petName)}</strong></p>
      <div><label for="bookingMoveStart" class="form-label">Thời gian bắt đầu mới <span style="color:#DC2626;">*</span></label>
        <input type="datetime-local" id="bookingMoveStart" class="form-control" required style="border-radius:9px;">
      </div>
      <div><label for="bookingMoveReason" class="form-label">Lý do đổi lịch <span style="color:#DC2626;">*</span></label>
        <textarea id="bookingMoveReason" class="form-control" rows="2" maxlength="2000" required style="border-radius:9px;"></textarea>
      </div>
      <button type="button" class="btn-green-outline" id="bookingMoveQuote">Xem giá và lịch mới</button>
      <div id="bookingMovePreview" role="status" hidden>
        <p id="bookingMoveEnd" style="margin:0;"></p><p id="bookingMoveTotal" style="margin:0;font-weight:600;color:#236B48;"></p>
        <p style="margin:0;">Sau khi đổi, lịch sẽ chờ cửa hàng xác nhận lại.</p>
      </div>
      <p id="bookingMoveError" role="alert" hidden style="margin:0;color:#DC2626;"></p>
      <div style="display:flex;justify-content:flex-end;gap:12px;">
        <button type="button" class="btn-green-outline" data-close-modal="quickRescheduleBookingModal">Giữ lịch</button>
        <button type="button" class="btn-cta" id="quickConfirmRescheduleBtn" disabled>Xác nhận đổi lịch</button>
      </div>
    </form>`;
    document.body.appendChild(modal);
    const start=modal.querySelector('#bookingMoveStart'),reason=modal.querySelector('#bookingMoveReason'),error=modal.querySelector('#bookingMoveError');
    const preview=modal.querySelector('#bookingMovePreview'),quoteButton=modal.querySelector('#bookingMoveQuote'),save=modal.querySelector('#quickConfirmRescheduleBtn');
    const user=window.getCurrentUser?.() || JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const db=window.getSupabaseClient?.() || window.SupabaseClient;
    const requestId=crypto.randomUUID();let quote=null,version=0;
    const invalidate=()=>{++version;quote=null;save.disabled=true;preview.hidden=true;error.hidden=true;};
    start.addEventListener('input',invalidate);
    reason.addEventListener('input',()=>{error.hidden=true;});
    modal.querySelector('form').addEventListener('submit',e=>e.preventDefault());
    modal.querySelectorAll('[data-close-modal]').forEach(button=>button.addEventListener('click',()=>modal.close()));
    modal.addEventListener('click',e=>{const r=modal.getBoundingClientRect();if(e.target===modal&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))modal.close();});
    modal.addEventListener('close',()=>{++version;modal.remove();},{once:true});
    quoteButton.addEventListener('click',async()=>{
        const parsed=parseVietnamDateTimeInput(start.value);if(!parsed){error.textContent='Vui lòng chọn thời gian mới theo giờ Việt Nam.';error.hidden=false;start.focus();return;}
        invalidate();const current=version;quoteButton.disabled=true;
        try{
            const result=await quoteCustomerBookingMove(db,user,booking,parsed.toISOString());
            if(!modal.isConnected || current!==version)return;
            quote=result;preview.hidden=false;
            modal.querySelector('#bookingMoveEnd').textContent='Kết thúc dự kiến: '+new Date(result.end_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});
            modal.querySelector('#bookingMoveTotal').textContent='Tổng tiền mới: '+formatPrice(Number(result.total));save.disabled=false;
        }catch(err){if(modal.isConnected&&current===version){error.textContent=err.message;error.hidden=false;}}
        finally{quoteButton.disabled=false;}
    });
    save.addEventListener('click',async()=>{
        if(save.disabled || !quote)return;
        error.hidden=true;if(!reason.value.trim()){error.textContent='Vui lòng nhập lý do đổi lịch.';error.hidden=false;reason.focus();return;}
        save.disabled=true;quoteButton.disabled=true;start.disabled=true;reason.disabled=true;
        try{
            await moveCustomerBooking(db,user,booking,quote,reason.value,requestId);
            modal.close();showToast('Đã đổi lịch. Lịch đang chờ cửa hàng xác nhận lại.','success');await onSaved?.();
        }catch(err){if(modal.isConnected){invalidate();error.textContent=err.message;error.hidden=false;}}
        finally{quoteButton.disabled=false;start.disabled=false;reason.disabled=false;}
    });
    modal.showModal();
}
