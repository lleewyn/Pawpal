/* ==========================================================================
   Bookings List Page
   Loads seeded bookings from /data/bookings.json through the API cache.
   ========================================================================== */

import { API } from '/scripts/api/api.js';

// ============================================================
// SUPABASE SYNC — load bookings từ Supabase vào localStorage
// ============================================================
async function syncBookingsFromSupabase(currentUser) {
    const db = window.SupabaseClient;
    if (!db || !currentUser) return;

    try {
        // Tìm customer UUID nếu dùng mock id
        let customerId = currentUser.id;
        if (currentUser._source !== 'supabase') {
            const { data: found } = await db
                .from('customer')
                .select('id')
                .eq('phone_main', currentUser.phone)
                .limit(1);
            if (!found?.length) return;
            customerId = found[0].id;
        }

        const { data, error } = await db
            .from('appointment')
            .select(`
                id, appointment_code, appointment_date, appointment_time,
                appointment_status, payment_status, note, change_count,
                service ( 
                    service_name, service_category, estimated_duration,
                    service_price_matrix ( unit_price, pet_species )
                ),
                pet_profile ( id, pet_code, pet_name, breed, species )
            `)
            .eq('customer_id', customerId)
            .order('appointment_date', { ascending: false });

        if (error) { console.error('[Bookings] Supabase error:', error.message); return; }

        const bookings = (data || []).map(b => {
            // Preserve pointsAwarded flag từ localStorage để tránh cộng điểm lại
            const existing = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
            const localBooking = existing.find(lb =>
                String(lb.id) === String(b.appointment_code || b.id) ||
                String(lb._supabaseId) === String(b.id)
            );

            return {
                id:              b.appointment_code || b.id,
                _supabaseId:     b.id,
                userId:          currentUser.id,
                _supabaseUserId: customerId,
                date:            b.appointment_date,
                time:            b.appointment_time?.slice(0, 5) || '',
                timeStart:       b.appointment_time?.slice(0, 5) || '',
                status:          mapAppointmentStatus(b.appointment_status),
                bookingStatus:   b.appointment_status,
                paymentStatus:   b.payment_status,
                service:         b.service?.service_name      || '',
                serviceName:     b.service?.service_name      || '',
                serviceCategory: b.service?.service_category  || '',
                petId:           b.pet_profile?.pet_code      || b.pet_profile?.id || '',
                petName:         b.pet_profile?.pet_name      || '',
                petBreed:        b.pet_profile?.breed         || '',
                changeCount:     b.change_count               || 0,
                note:            b.note || '',
                price:           getPriceFromMatrix(b.service?.service_price_matrix, b.pet_profile?.species),
                // Giữ nguyên flag đã tích điểm để tránh cộng lại
                pointsAwarded:   localBooking?.pointsAwarded  || false,
                pointsEarned:    localBooking?.pointsEarned   || 0,
                _source:         'supabase',
            };
        });

        // Merge bookings từ Supabase vào local thay vì ghi đè hoàn toàn
        const local = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const merged = local.map(lb => {
            const fromSb = bookings.find(b => String(b.id) === String(lb.id) || String(b._supabaseId) === String(lb._supabaseId));
            return fromSb ? { ...lb, ...fromSb } : lb;
        });
        bookings.forEach(b => {
            if (!merged.some(m => String(m.id) === String(b.id) || String(m._supabaseId) === String(b._supabaseId))) {
                merged.push(b);
            }
        });
        localStorage.setItem('pawpal_bookings', JSON.stringify(merged));
        console.log('[Bookings] ✅ Synced từ Supabase:', bookings.length, 'lịch hẹn');
    } catch (err) {
        console.warn('[Bookings] Supabase sync error:', err.message);
    }
}

function mapAppointmentStatus(status) {
    const map = {
        'PENDING':   'pending',
        'CONFIRMED': 'confirmed',
        'COMPLETED': 'completed',
        'CANCELLED': 'cancelled',
        'NO_SHOW':   'cancelled',
    };
    return map[status] || 'pending';
}

/**
 * Lấy giá từ service_price_matrix theo species của pet.
 * Fallback về giá đầu tiên nếu không match species.
 */
function getPriceFromMatrix(priceMatrix, petSpecies) {
    if (!priceMatrix || !priceMatrix.length) return 0;
    const match = priceMatrix.find(p => p.pet_species === petSpecies);
    return (match || priceMatrix[0])?.unit_price || 0;
}

// ── Sync cancel lên Supabase ───────────────────────────────────────────────
async function cancelOnSupabase(bookingId) {
    const db = window.SupabaseClient;
    if (!db) return;
    try {
        const local = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const booking = local.find(b => String(b.id) === String(bookingId) || String(b._id) === String(bookingId));
        const supabaseId = booking?._supabaseId;
        if (supabaseId) {
            await db.from('appointment').update({ appointment_status: 'CANCELLED' }).eq('id', supabaseId);
        }
    } catch (err) {
        console.warn('[Bookings] cancelOnSupabase error:', err.message);
    }
}

// ── Sync reschedule lên Supabase ───────────────────────────────────────────
async function rescheduleOnSupabase(bookingId, date, time) {
    const db = window.SupabaseClient;
    if (!db) return;
    try {
        const local = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const booking = local.find(b => String(b.id) === String(bookingId) || String(b._id) === String(bookingId));
        const supabaseId = booking?._supabaseId;
        if (supabaseId) {
            await db.from('appointment').update({
                appointment_date: date,
                appointment_time: time + ':00',
                appointment_status: 'PENDING',
            }).eq('id', supabaseId);
        }
    } catch (err) {
        console.warn('[Bookings] rescheduleOnSupabase error:', err.message);
    }
}

export const statusLabels = {
    pending:       'Chờ xác nhận',
    upcoming:      'Đã xác nhận',
    confirmed:     'Đã xác nhận',
    accepted:      'Đã tiếp nhận',
    'in-progress': 'Đang thực hiện',
    completed:     'Hoàn thành',
    cancelled:     'Đã hủy'
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
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');

        // Sync từ Supabase trước
        if (window.SupabaseClient && currentUser) {
            await syncBookingsFromSupabase(currentUser);
        }

        await API.initData();
        allBookings = currentUser ? await API.getUserBookings(currentUser.id) : [];
        const userPets = currentUser ? await API.getUserPets(currentUser.id) : [];
        
        currentPetMap = new Map();
        (Array.isArray(userPets) ? userPets : []).forEach((pet) => {
            if (pet._id) currentPetMap.set(String(pet._id), pet);
            if (pet.id) currentPetMap.set(String(pet.id), pet);
        });

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
        && ['confirmed', 'accepted'].includes(normalizedStatus)
        && cancelCount < 3;
    
    const petKey = String(booking.petId || '');
    const petObj = currentPetMap.get(petKey);
    const petId = booking.petId || petObj?._id || petObj?.id || '';
    const bookingId = booking.id || booking._id || '';

    const diaryQuery = petId ? `?id=${encodeURIComponent(petId)}&sessionId=${encodeURIComponent(bookingId)}` : '';
    const careLogLink = normalizedStatus === 'completed' && petId
        ? `<a class="booking-card-link" href="../pet-diary/pet-diary.html${diaryQuery}" onclick="event.stopPropagation()">Xem nhật ký chăm sóc</a>`
        : '';
    const alreadyReviewed = normalizedStatus === 'completed' && hasServiceReview(booking);
    const reviewedBadge = alreadyReviewed
        ? '<span class="booking-reviewed-badge">Đã đánh giá</span>'
        : '';
    const writeReviewBtn = normalizedStatus === 'completed' && !alreadyReviewed
        ? `<a class="btn-review text-decoration-none" href="../booking-detail/booking-detail.html?id=${bookingId}#service-review" onclick="event.stopPropagation()">Đánh giá</a>`
        : '';
    const detailPrompt = '<span class="booking-card-detail-hint">Nhấn để xem chi tiết</span>';
    const changeScheduleAction = canModify
        ? `<button type="button" class="btn-change-schedule" data-booking-id="${bookingId}">Đổi lịch</button>`
        : '';
    const cancelBookingAction = canCancel
        ? `<button type="button" class="btn-cancel-booking" data-booking-id="${bookingId}">Huỷ lịch</button>`
        : '';
    card.className = `booking-card status-${normalizedStatus}`;
    card.tabIndex = 0;
    card.setAttribute('role', 'link');
    card.onclick = () => {
        window.location.href = `../booking-detail/booking-detail.html?id=${bookingId}`;
    };

    const petName = booking.petName || petObj?.name || booking.petInfo?.petName || booking.petId || 'Bé cưng';
    const serviceName = booking.service || booking.serviceName || booking.selectedService?.name || 'Dịch vụ PawPal';
    const dateTimeText = buildDateTimeText(booking);
    card.setAttribute('aria-label', `Xem chi tiết lịch hẹn ${petName}`);

    card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            window.location.href = `../booking-detail/booking-detail.html?id=${bookingId}`;
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
                ${writeReviewBtn}
                ${reviewedBadge}
                ${detailPrompt}
                ${isChangeLimited ? '<span class="booking-limit-warning">Đã hết lượt đổi</span>' : ''}
                ${careLogLink}
            </div>
        </div>
    `;

    const changeBtn = card.querySelector('.btn-change-schedule');
    if (changeBtn) {
        changeBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            openQuickRescheduleModal(booking);
        });
    }

    const cancelBtn = card.querySelector('.btn-cancel-booking');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
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

function openQuickCancelModal(booking) {
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

    modalEl.querySelector('#quickConfirmCancelBtn').addEventListener('click', async () => {
        const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const idx = bookings.findIndex((b) => String(b.id || b._id) === String(bookingId));
        if (idx !== -1) {
            bookings[idx].status = 'cancelled';
            bookings[idx].cancelCount = (bookings[idx].cancelCount || 0) + 1;
            localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
        }
        await cancelOnSupabase(bookingId);
        modal.hide();
        showToast('Đã hủy lịch hẹn thành công!', 'success');
        loadBookings(document.querySelector('.filter-tab.active')?.dataset.status || 'all');
    });
}

function openQuickRescheduleModal(booking) {
    const existing = document.getElementById('quickRescheduleBookingModal');
    if (existing) existing.remove();

    const petKey = String(booking.petId || '');
    const petObj = currentPetMap.get(petKey);
    const petName = booking.petName || petObj?.name || booking.petInfo?.petName || booking.petId || 'Bé cưng';
    const serviceName = booking.service || booking.serviceName || booking.selectedService?.name || 'Dịch vụ PawPal';
    const bookingId = booking.id || booking._id || '';

    const configSlots = (window.PawPalBookingConfig?.slots) || ['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'];
    const configStaffs = (window.PawPalBookingConfig?.staffs) || [
        { name: 'Phân bổ ngẫu nhiên', desc: 'PawPal tự động chọn nhân viên trống lịch', id: 'random' },
        { name: 'Nguyễn Minh An',     desc: 'Chuyên viên Spa • 3 năm kinh nghiệm',      id: 'staff1' },
        { name: 'Trần An Nhiên',      desc: 'Bảo mẫu Hotel • Cực kỳ nhẹ nhàng',         id: 'staff2' },
        { name: 'Lê Hoàng Tiến',     desc: 'Chuyên viên cắt tỉa Grooming',              id: 'staff3' }
    ];
    const slotOptions = configSlots.map((slot) => `<button type="button" class="quick-slot-btn" data-slot="${slot}">${slot}</button>`).join('');
    const staffOptions = configStaffs.map((s) => {
        const initials = s.name === 'Phân bổ ngẫu nhiên' ? 'NG' : s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return `
            <div class="quick-staff-btn" data-staff="${s.name}" tabindex="0" role="button"
                style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:10px;text-align:left;">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--color-primary-light,#e8f5e9);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;color:var(--color-primary-dark,#2e7d32);flex-shrink:0;">${initials}</div>
                <div>
                    <div style="font-weight:700;font-size:0.88rem;color:var(--color-text-dark,#1e293b);">${s.name}</div>
                    <div style="font-size:0.75rem;color:#64748b;">${s.desc}</div>
                </div>
            </div>`;
    }).join('');
    const minDate = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    const modalEl = document.createElement('div');
    modalEl.id = 'quickRescheduleBookingModal';
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    const isHotelBooking = String(booking.serviceCategory || booking.category || booking.service_type || '').toLowerCase() === 'hotel' || String(serviceName).toLowerCase().includes('hotel');
    
    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${isHotelBooking ? 'Đổi ngày lưu trú' : 'Đổi lịch hẹn'}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small mb-3">${isHotelBooking ? 'Pet Hotel chỉ cần đổi ngày, không cần chọn giờ hay nhân viên.' : `Chọn ngày, giờ và nhân viên mới cho lịch <strong>${serviceName}</strong> của <strong>${petName}</strong>.`}</p>
                    <label class="form-label fw-semibold">Chọn ngày</label>
                    <input type="date" id="quickRescheduleDate" class="form-control mb-3" min="${minDate}">
                    ${isHotelBooking ? '' : `
                    <label class="form-label fw-semibold">Chọn giờ</label>
                    <div class="d-flex flex-wrap gap-2 mb-3" id="quickRescheduleSlots">${slotOptions}</div>
                    <label class="form-label fw-semibold">Chọn nhân viên</label>
                    <div class="mb-3" id="quickRescheduleStaffs" style="display:grid;grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));gap:12px;">${staffOptions}</div>
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
    let selectedStaff = isHotelBooking ? 'Bảo mẫu khách sạn' : '';
    const refreshState = () => {
        if (!isHotelBooking) {
            modalEl.querySelectorAll('.quick-slot-btn, .quick-staff-btn').forEach((btn) => btn.classList.remove('active'));
            modalEl.querySelectorAll('.quick-slot-btn').forEach((btn) => {
                if (btn.dataset.slot === selectedSlot) btn.classList.add('active');
            });
            modalEl.querySelectorAll('.quick-staff-btn').forEach((btn) => {
                if (btn.dataset.staff === selectedStaff) btn.classList.add('active');
            });
        }
        modalEl.querySelector('#quickConfirmRescheduleBtn').disabled = isHotelBooking ? !selectedDate : !(selectedDate && selectedSlot && selectedStaff);
    };

    modalEl.querySelector('#quickRescheduleDate').addEventListener('change', (e) => {
        selectedDate = e.target.value;
        refreshState();
    });
    if (!isHotelBooking) {
        modalEl.querySelectorAll('.quick-slot-btn').forEach((btn) => {
            btn.addEventListener('click', () => { selectedSlot = btn.dataset.slot; refreshState(); });
        });
        modalEl.querySelectorAll('.quick-staff-btn').forEach((btn) => {
            btn.addEventListener('click', () => { selectedStaff = btn.dataset.staff; refreshState(); });
        });
    }

    modalEl.querySelector('#quickConfirmRescheduleBtn').addEventListener('click', async () => {
        const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const idx = bookings.findIndex((b) => String(b.id || b._id) === String(bookingId));
        if (idx !== -1) {
            bookings[idx].date = selectedDate;
            if (!isHotelBooking) {
                bookings[idx].time = selectedSlot;
                bookings[idx].timeStart = selectedSlot;
                bookings[idx].staff = selectedStaff;
            } else {
                bookings[idx].time = '';
                bookings[idx].timeStart = '';
                bookings[idx].timeEnd = '';
                bookings[idx].staff = 'Bảo mẫu khách sạn';
            }
            bookings[idx].changeCount = (bookings[idx].changeCount || 0) + 1;
            localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
        }
        await rescheduleOnSupabase(bookingId, selectedDate, selectedSlot);
        modal.hide();
        showToast('Đã đổi lịch hẹn thành công!', 'success');
        loadBookings(document.querySelector('.filter-tab.active')?.dataset.status || 'all');
    });
}

