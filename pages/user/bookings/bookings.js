/* ==========================================================================
   Bookings List Page
   Loads seeded bookings from /data/bookings.json through the API cache.
   ========================================================================== */

import { API } from '/scripts/api/api.js';

export const statusLabels = {
    upcoming: 'Đã xác nhận',
    confirmed: 'Đã xác nhận',
    accepted: 'Đã tiếp nhận',
    'in-progress': 'Đang thực hiện',
    completed: 'Hoàn thành',
    cancelled: 'Đã hủy'
};

const statusAliases = {
    confirmed: ['confirmed', 'upcoming'],
    accepted: ['accepted'],
    'in-progress': ['in-progress'],
    completed: ['completed'],
    cancelled: ['cancelled']
};

let allBookings = [];
let currentPetMap = new Map();

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

async function init() {
    if (!document.getElementById('bookingsList')) return;
    initFilterTabs();
    await loadBookings('all');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function initFilterTabs() {
    const tabs = document.querySelectorAll('.filter-tab');
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
    try {
        await API.initData();
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        allBookings = currentUser ? await API.getUserBookings(currentUser.id) : [];
        const userPets = currentUser ? await API.getUserPets(currentUser.id) : [];
        currentPetMap = new Map((Array.isArray(userPets) ? userPets : []).map((pet) => [String(pet.id), pet]));
        renderBookings(status);
    } catch (error) {
        console.error('Cannot load bookings:', error);
        allBookings = [];
        currentPetMap = new Map();
        renderBookings(status);
    }
}

function renderBookings(status) {
    const bookingsList = document.getElementById('bookingsList');
    const emptyState = document.getElementById('emptyState');
    if (!bookingsList || !emptyState) return;

    let filteredBookings = [...allBookings];
    if (status !== 'all') {
        const allowedStatuses = statusAliases[status] || [status];
        filteredBookings = filteredBookings.filter((booking) => allowedStatuses.includes(resolveBookingStatus(booking)));
    } else {
        const statusOrder = { upcoming: 1, confirmed: 1, accepted: 2, 'in-progress': 3, completed: 4, cancelled: 5 };
        filteredBookings.sort((a, b) => (statusOrder[resolveBookingStatus(a)] || 99) - (statusOrder[resolveBookingStatus(b)] || 99));
    }

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
    const normalizedStatus = resolveBookingStatus(booking);
    const changeCount = Number(booking.changeCount || 0);
    const cancelCount = Number(booking.cancelCount || 0);
    const isChangeLimited = changeCount >= 2;
    const scheduledAt = getBookingScheduledAt(booking);
    const diffMinutes = scheduledAt ? (scheduledAt.getTime() - Date.now()) / (1000 * 60) : Number.POSITIVE_INFINITY;
    const canModify = diffMinutes >= 120
        && !['in-progress', 'completed', 'cancelled'].includes(normalizedStatus)
        && !isChangeLimited;
    const canCancel = diffMinutes >= 120
        && ['pending', 'confirmed', 'upcoming', 'accepted'].includes(normalizedStatus)
        && cancelCount < 3;
    const petId = booking.petId || currentPetMap.get(String(booking.petId))?.id || '';
    const diaryQuery = petId ? `?id=${encodeURIComponent(petId)}&sessionId=${encodeURIComponent(booking.id || '')}` : '';
    const careLogLink = normalizedStatus === 'completed' && petId
        ? `<a class="booking-card-link" href="../pet-diary/pet-diary.html${diaryQuery}" onclick="event.stopPropagation()">Xem nhật ký chăm sóc</a>`
        : '';
    const reviewedBadge = normalizedStatus === 'completed' && hasServiceReview(booking)
        ? '<span class="booking-reviewed-badge">Đã đánh giá</span>'
        : '';
    const detailPrompt = '<span class="booking-card-detail-hint">Nhấn để xem chi tiết</span>';
    const changeScheduleAction = canModify
        ? `<a class="btn-change-schedule" href="../booking-detail/booking-detail.html?id=${booking.id}" onclick="event.stopPropagation()">Đổi lịch</a>`
        : '';
    const cancelBookingAction = canCancel
        ? `<a class="btn-cancel-booking" href="../booking-detail/booking-detail.html?id=${booking.id}" onclick="event.stopPropagation()">Huỷ lịch</a>`
        : '';
    card.className = `booking-card status-${normalizedStatus}`;
    card.tabIndex = 0;
    card.setAttribute('role', 'link');
    card.onclick = () => {
        window.location.href = `../booking-detail/booking-detail.html?id=${booking.id}`;
    };

    const petName = booking.petName || currentPetMap.get(String(booking.petId))?.name || booking.petInfo?.petName || booking.petId || 'Bé cưng';
    const serviceName = booking.service || booking.serviceName || booking.selectedService?.name || 'Dịch vụ PawPal';
    const dateTimeText = buildDateTimeText(booking);
    card.setAttribute('aria-label', `Xem chi tiết lịch hẹn ${petName}`);

    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            window.location.href = `../booking-detail/booking-detail.html?id=${booking.id}`;
        }
    });

    card.innerHTML = `
        <div class="booking-card-header">
            <div>
                <div class="booking-card-pet-service">
                    <span class="booking-card-pet-name">${petName}</span>
                    <span class="booking-card-service-separator">-</span>
                    <span class="booking-card-service-name">${serviceName}</span>
                </div>
                <div class="booking-card-datetime">
                    ${dateTimeText}
                </div>
                ${booking.staff ? `<div class="booking-card-staff">Nhân viên: ${booking.staff}</div>` : ''}
                ${booking.branch ? `<div class="booking-card-staff">Chi nhánh: ${booking.branch}</div>` : ''}
                ${changeCount > 0 ? `<div class="booking-card-staff ${isChangeLimited ? 'text-danger fw-semibold' : ''}">Đã đổi lịch: ${changeCount} lần${isChangeLimited ? ' - Đã đạt giới hạn đổi' : ''}</div>` : ''}
                ${cancelCount > 0 ? `<div class="booking-card-staff">Đã hủy lịch: ${cancelCount} lần</div>` : ''}
            </div>
            <span class="badge-status badge-${normalizedStatus}">${statusLabels[normalizedStatus] || normalizedStatus}</span>
        </div>
        <div class="booking-card-footer">
            <div class="booking-card-price">${formatPrice(booking.price || 0)}</div>
            <div class="booking-card-actions">
                ${changeScheduleAction}
                ${cancelBookingAction}
                ${detailPrompt}
                ${reviewedBadge}
                ${isChangeLimited ? '<span class="booking-limit-warning">Đã hết lượt đổi</span>' : ''}
                ${careLogLink}
            </div>
        </div>
    `;

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
    if (['cancelled', 'completed', 'in-progress', 'accepted'].includes(rawStatus)) {
        return rawStatus;
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
    const time = booking.time || booking.timeStart || '00:00';
    const scheduled = new Date(`${booking.date}T${time}:00`);
    return Number.isNaN(scheduled.getTime()) ? null : scheduled;
}

export function formatPrice(price) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(Number(price) || 0);
}

window.BookingsData = {
    statusLabels,
    formatDate,
    formatPrice
};

