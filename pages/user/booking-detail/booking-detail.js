/* ==========================================================================
   Booking Detail Page - booking-detail.js
   US 5-1: Thay doi lich (Time check, Error banner)
   US 6-1, 6-2: Huy lich
   ========================================================================== */

import { API } from '/scripts/api/api.js';
import { statusLabels, formatDate, formatPrice } from '../bookings/bookings.js';

// ============================================================
// SUPABASE HELPERS cho booking-detail
// ============================================================

/**
 * Sync 1 booking cụ thể từ Supabase vào localStorage theo bookingId (appointment_code hoặc UUID)
 */
async function syncSingleBookingFromSupabase(bookingId, currentUser) {
    const db = window.SupabaseClient;
    if (!db || !currentUser) return null;

    try {
        // Tìm customer UUID
        let customerId = currentUser.id;
        if (currentUser._source !== 'supabase') {
            const { data: found } = await db
                .from('customer').select('id')
                .eq('phone_main', currentUser.phone).limit(1);
            if (!found?.length) return null;
            customerId = found[0].id;
        }

        // Tìm theo appointment_code hoặc UUID
        const { data, error } = await db
            .from('appointment')
            .select(`
                id, appointment_code, appointment_date, appointment_time,
                appointment_status, payment_status, note, change_count,
                service (
                    service_name, service_category,
                    service_price_matrix ( unit_price, pet_species )
                ),
                pet_profile ( id, pet_code, pet_name, breed, species )
            `)
            .eq('customer_id', customerId)
            .or(`appointment_code.eq.${bookingId},id.eq.${bookingId}`)
            .limit(1);

        if (error || !data?.length) return null;
        const b = data[0];

        // Preserve pointsAwarded từ localStorage
        const local = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const existing = local.find(lb =>
            String(lb.id) === String(bookingId) ||
            String(lb._supabaseId) === String(b.id)
        );

        const booking = {
            id:              b.appointment_code || b.id,
            _supabaseId:     b.id,
            userId:          currentUser.id,
            date:            b.appointment_date,
            time:            b.appointment_time?.slice(0, 5) || '',
            timeStart:       b.appointment_time?.slice(0, 5) || '',
            timeEnd:         existing?.timeEnd           || '',
            status:          mapBookingStatus(b.appointment_status),
            bookingStatus:   b.appointment_status,
            paymentStatus:   b.payment_status,
            service:         b.service?.service_name     || '',
            serviceName:     b.service?.service_name     || '',
            serviceCategory: b.service?.service_category || '',
            petId:           b.pet_profile?.pet_code     || b.pet_profile?.id || '',
            petName:         b.pet_profile?.pet_name     || '',
            petBreed:        b.pet_profile?.breed        || '',
            staff:           existing?.staff             || '',
            changeCount:     b.change_count              || existing?.changeCount || 0,
            cancelCount:     existing?.cancelCount       || 0,
            note:            b.note || '',
            price:           getBookingPrice(b.service?.service_price_matrix, b.pet_profile?.species),
            pointsAwarded:   existing?.pointsAwarded     || false,
            pointsEarned:    existing?.pointsEarned      || 0,
            _source:         'supabase',
        };

        // Upsert vào localStorage
        const others = local.filter(lb =>
            String(lb.id) !== String(booking.id) &&
            String(lb._supabaseId) !== String(b.id)
        );
        localStorage.setItem('pawpal_bookings', JSON.stringify([booking, ...others]));
        console.log('[BookingDetail] ✅ Synced từ Supabase:', booking.id);
        return booking;
    } catch (err) {
        console.warn('[BookingDetail] Supabase sync error:', err.message);
        return null;
    }
}

function mapBookingStatus(status) {
    return { 'PENDING': 'pending', 'CONFIRMED': 'confirmed', 'COMPLETED': 'completed', 'CANCELLED': 'cancelled', 'NO_SHOW': 'cancelled' }[status] || 'pending';
}

function getBookingPrice(priceMatrix, petSpecies) {
    if (!priceMatrix?.length) return 0;
    const match = priceMatrix.find(p => p.pet_species === petSpecies);
    return (match || priceMatrix[0])?.unit_price || 0;
}

/** Sync cancel lên Supabase */
async function cancelBookingOnSupabase(booking) {
    const db = window.SupabaseClient;
    if (!db || !booking?._supabaseId) return;
    try {
        await db.from('appointment')
            .update({ appointment_status: 'CANCELLED' })
            .eq('id', booking._supabaseId);
        console.log('[BookingDetail] Cancel synced to Supabase');
    } catch (err) {
        console.warn('[BookingDetail] cancelBookingOnSupabase error:', err.message);
    }
}

/** Sync reschedule lên Supabase */
async function rescheduleBookingOnSupabase(booking) {
    const db = window.SupabaseClient;
    if (!db || !booking?._supabaseId) return;
    try {
        const serviceCategory = String(booking?.serviceCategory || booking?.category || booking?.service_type || '').toLowerCase();
        await db.from('appointment')
            .update({
                appointment_date:   booking.date,
                appointment_time:   serviceCategory === 'hotel' ? null : (booking.timeStart || booking.time) + ':00',
                appointment_status: 'PENDING',
                change_count:       booking.changeCount || 0,
            })
            .eq('id', booking._supabaseId);
        console.log('[BookingDetail] Reschedule synced to Supabase');
    } catch (err) {
        console.warn('[BookingDetail] rescheduleBookingOnSupabase error:', err.message);
    }
}

let currentBooking = null;
let currentPet = null;
let currentCareLog = null;
let bannerTimeout = null;
let currentServiceReviewRating = 0;

document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('id');

    if (!bookingId) {
        showToast('Không tìm thấy thông tin lịch hẹn', 'error');
        setTimeout(() => { window.location.href = '../bookings/bookings.html'; }, 1500);
        return;
    }

    await loadBookingDetail(bookingId);
});

async function loadBookingDetail(bookingId) {
    await API.initData();

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');

    // Sync booking cụ thể từ Supabase trước
    if (window.SupabaseClient && currentUser) {
        await syncSingleBookingFromSupabase(bookingId, currentUser);
    }

    const userBookings = currentUser ? await API.getUserBookings(currentUser.id) : [];
    currentBooking = userBookings.find((b) => String(b.id || b._id) === String(bookingId) || b.code === bookingId);

    if (!currentBooking) {
        showToast('Không tìm thấy lịch hẹn này', 'error');
        setTimeout(() => { window.location.href = '../bookings/bookings.html'; }, 1500);
        return;
    }

    const userPets = currentUser ? await API.getUserPets(currentUser.id) : [];
    currentPet = userPets.find((pet) => String(pet._id || pet.id) === String(currentBooking.petId)) || null;
    const careLogs = await API.getCareLogs();
    currentCareLog = currentBooking.petId ? (careLogs[currentBooking.petId] || null) : null;

    const careLogButton = document.getElementById('btnViewCareLog');
    if (careLogButton) {
        careLogButton.onclick = () => {
            const petId = currentBooking.petId || currentPet?._id || currentPet?.id;
            if (!petId) {
                showToast('Không tìm thấy mã bé cưng để mở nhật ký chăm sóc.', 'error');
                return;
            }
            const sessionId = currentBooking.id || '';
            const query = `id=${encodeURIComponent(petId)}${sessionId ? `&sessionId=${encodeURIComponent(sessionId)}` : ''}`;
            window.location.href = `/pages/user/pet-diary/pet-diary.html?${query}`;
        };
    }

    renderBookingDetail(currentBooking);
    renderServiceReviewSection(currentBooking);
    checkBookingModifiability(currentBooking);

    // Cộng điểm Paw Points khi booking hoàn thành (BPMN 3.1.13)
    awardBookingLoyaltyPoints(currentBooking, currentUser);

    // Scroll đến section đánh giá nếu điều hướng từ danh sách lịch hẹn
    if (window.location.hash === '#service-review') {
        setTimeout(() => {
            const target = document.getElementById('serviceReviewSection')
                        || document.querySelector('.service-review-section');
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 200);
    }
}

function renderBookingDetail(booking) {
    const normalizedStatus = resolveBookingStatus(booking);
    const petName = booking.petName || currentPet?.name || booking.petInfo?.petName || booking.petId || 'Bé cưng';
    const petBreed = booking.petBreed || booking.petInfo?.breed || '';
    const petWeight = booking.petWeight || booking.petInfo?.weight || '';
    const serviceName = booking.service || booking.serviceName || booking.selectedService?.name || 'Dịch vụ PawPal';
    const servicePackage = booking.package ? ` - ${booking.package}` : '';

    document.getElementById('headerStatusBadge').className = `badge-status badge-${normalizedStatus}`;
    document.getElementById('headerStatusBadge').textContent = statusLabels[normalizedStatus] || normalizedStatus;

    const statusInfo = document.getElementById('statusInfo');
    if (statusInfo) {
        statusInfo.innerHTML = `<span class="badge-status badge-${normalizedStatus}">${statusLabels[normalizedStatus] || normalizedStatus}</span>`;
    }

    document.getElementById('bookingCode').textContent = booking.id;
    document.getElementById('bannerBookingCode').textContent = booking.id;
    document.getElementById('petInfo').textContent = `${petName}${petBreed || petWeight ? ` (${[petBreed, petWeight].filter(Boolean).join(', ')})` : ''}`;
    document.getElementById('serviceInfo').textContent = `${serviceName}${servicePackage}`;

    let dateTimeText = formatDate(booking.date || booking.schedule?.date);
    if (booking.timeStart) {
        dateTimeText += ` | ${booking.timeStart}${booking.timeEnd ? ` - ${booking.timeEnd}` : ''}`;
    } else if (booking.time) {
        dateTimeText += ` | ${booking.time}`;
    } else if (booking.schedule?.slot) {
        dateTimeText += ` | ${booking.schedule.slot}`;
    } else if (booking.dateEnd) {
        dateTimeText = `${dateTimeText} - ${formatDate(booking.dateEnd)}`;
    }
    document.getElementById('dateTimeInfo').textContent = dateTimeText;
    document.getElementById('staffInfo').textContent = booking.staff || 'Chưa phân công';
    document.getElementById('priceInfo').textContent = formatPrice(booking.price || 0);

    if (booking.note) {
        document.getElementById('noteRow').classList.remove('d-none');
        document.getElementById('noteInfo').textContent = booking.note;
    }

    const careLogSection = document.getElementById('careLogActionSection');
    if (careLogSection) {
        const hasCareLog = currentCareLog && (
            currentCareLog.currentSession ||
            (Array.isArray(currentCareLog.history) && currentCareLog.history.length > 0)
        );
        careLogSection.classList.toggle('d-none', !(normalizedStatus === 'completed' && hasCareLog));
    }
}

function renderServiceReviewSection(booking) {
    const section = document.getElementById('serviceReviewSection');
    if (!section) return;

    const normalizedStatus = resolveBookingStatus(booking);
    const reviewKey = getServiceReviewKey(booking);
    const existingReview = loadServiceReview(reviewKey);
    const statusEl = document.getElementById('serviceReviewStatus');
    const hintEl = document.getElementById('serviceReviewHint');
    const textarea = document.getElementById('serviceReviewComment');

    section.classList.toggle('d-none', normalizedStatus !== 'completed');

    if (normalizedStatus !== 'completed') return;

    currentServiceReviewRating = Number(existingReview?.rating || 0);
    if (statusEl) {
        statusEl.textContent = existingReview ? 'Đã đánh giá' : 'Chưa đánh giá';
    }
    if (hintEl) {
        hintEl.textContent = existingReview
            ? `Bạn đã đánh giá ${existingReview.rating}/5 sao.`
            : 'Hãy chọn mức độ hài lòng của bạn.';
    }
    if (textarea) {
        textarea.value = existingReview?.comment || '';
        textarea.disabled = Boolean(existingReview);
    }

    syncServiceStarUI(currentServiceReviewRating);

    const submitBtn = document.getElementById('btnSubmitServiceReview');
    if (submitBtn) {
        submitBtn.disabled = Boolean(existingReview);
        submitBtn.textContent = existingReview ? 'Đã gửi đánh giá' : 'Gửi đánh giá';
        submitBtn.onclick = handleSubmitServiceReview;
    }

    const starButtons = document.querySelectorAll('#serviceStarRow .service-star-btn');
    starButtons.forEach((btn) => {
        btn.onclick = () => {
            if (textarea?.disabled) return;
            currentServiceReviewRating = Number(btn.dataset.rating || 0);
            syncServiceStarUI(currentServiceReviewRating);
        };
    });
}

function syncServiceStarUI(rating) {
    document.querySelectorAll('#serviceStarRow .service-star-btn').forEach((btn) => {
        const value = Number(btn.dataset.rating || 0);
        btn.classList.toggle('active', value <= rating && rating > 0);
    });
}

function getServiceReviewKey(booking) {
    return `pawpal_service_review_${booking.id || booking.code || ''}`;
}

function loadServiceReview(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null');
    } catch (_) {
        return null;
    }
}

function handleSubmitServiceReview() {
    if (!currentBooking) return;

    if (!currentServiceReviewRating) {
        showToast('Vui lòng chọn số sao đánh giá.', 'error');
        return;
    }

    const reviewKey = getServiceReviewKey(currentBooking);
    const commentEl = document.getElementById('serviceReviewComment');
    const review = {
        bookingId: currentBooking.id,
        service: currentBooking.service || currentBooking.serviceName || currentBooking.selectedService?.name || 'Dịch vụ PawPal',
        rating: currentServiceReviewRating,
        comment: commentEl ? commentEl.value.trim() : '',
        createdAt: new Date().toISOString()
    };

    localStorage.setItem(reviewKey, JSON.stringify(review));

    const statusEl = document.getElementById('serviceReviewStatus');
    const hintEl = document.getElementById('serviceReviewHint');
    if (statusEl) statusEl.textContent = 'Đã đánh giá';
    if (hintEl) hintEl.textContent = `Bạn đã đánh giá ${currentServiceReviewRating}/5 sao.`;
    if (commentEl) commentEl.disabled = true;

    const submitBtn = document.getElementById('btnSubmitServiceReview');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Đã gửi đánh giá';
    }

    showServiceReviewToast('Cảm ơn bạn đã gửi đánh giá cho dịch vụ này.');
}

function showServiceReviewToast(message) {
    let container = document.getElementById('service-review-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'service-review-toast-container';
        container.style.cssText = 'position:fixed;top:92px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:10px;max-width:360px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = 'background:#2d7d46;color:#fff;padding:12px 16px;border-radius:12px;box-shadow:0 8px 22px rgba(0,0,0,.15);font-size:0.92rem;';
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
}

function checkBookingModifiability(booking) {
    const btnChange = document.getElementById('btnChangeSchedule');
    const btnCancel = document.getElementById('btnCancelBooking');

    const scheduledAt = getBookingScheduledAt(booking);
    if (!scheduledAt) {
        btnChange.classList.add('d-none');
        btnCancel.classList.add('d-none');
        return;
    }

    const now = new Date();
    const diffMinutes = (scheduledAt - now) / (1000 * 60);
    const changeLimitReached = (booking.changeCount || 0) >= 2;

    const currentStatus = resolveBookingStatus(booking);
    const canModify = diffMinutes >= 120
        && !['in-progress', 'completed', 'cancelled'].includes(currentStatus)
        && !changeLimitReached;

    const canCancel = diffMinutes >= 120
        && ['pending', 'confirmed', 'upcoming', 'accepted'].includes(currentStatus)
        && (booking.cancelCount || 0) < 3;

    btnChange.classList.toggle('d-none', !canModify);
    btnCancel.classList.toggle('d-none', !canCancel);
}

// ── Thay đổi lịch ────────────────────────────────────────────────────────
function handleChangeSchedule() {
    const btnChange = document.getElementById('btnChangeSchedule');
    if (!btnChange || btnChange.disabled) {
        showErrorBanner();
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    if (currentUser && currentUser.is_temporary) {
        // Guest: OTP → chọn lịch mới → upsell mật khẩu
        showGuestOTPModal(currentUser, () => showChangeScheduleModal(currentUser));
        return;
    }

    showChangeScheduleModal(null);
}

function showChangeScheduleModal(user = null) {
    const modalId = 'changeScheduleModal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const isHotelBooking = String(currentBookingState?.serviceCategory || currentBookingState?.category || currentBookingState?.service_type || '').toLowerCase() === 'hotel';
    const slots = (window.PawPalBookingConfig?.slots) || [
        '08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'
    ];
    const staffs = (window.PawPalBookingConfig?.staffs) || [
        { name: 'Phân bổ ngẫu nhiên', desc: 'PawPal tự động chọn nhân viên trống lịch', id: 'random' },
        { name: 'Nguyễn Minh An',     desc: 'Chuyên viên Spa • 3 năm kinh nghiệm',      id: 'staff1' },
        { name: 'Trần An Nhiên',      desc: 'Bảo mẫu Hotel • Cực kỳ nhẹ nhàng',         id: 'staff2' },
        { name: 'Lê Hoàng Tiến',     desc: 'Chuyên viên cắt tỉa Grooming',              id: 'staff3' }
    ];

    // slots render với disabled ban đầu — chỉ enable sau khi chọn ngày
    const slotsHtml = slots.map(s =>
        `<button class="slot-time-btn" data-time="${s}" disabled style="opacity:0.4;cursor:not-allowed;">${s}</button>`
    ).join('');

    const staffHtml = staffs.map(s => {
        const initials = s.name === 'Phân bổ ngẫu nhiên' ? 'NG' : s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return `
            <div class="staff-card" data-name="${s.name}" tabindex="-1" role="button"
                style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;cursor:not-allowed;opacity:0.4;transition:all .2s;pointer-events:none;">
                <div style="width:36px;height:36px;border-radius:50%;background:var(--color-primary-light,#e8f5e9);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;color:var(--color-primary-dark,#2e7d32);flex-shrink:0;">${initials}</div>
                <div>
                    <div style="font-weight:700;font-size:0.88rem;color:var(--color-primary-dark,#2e7d32);">${s.name}</div>
                    <div style="font-size:0.75rem;color:#64748b;">${s.desc}</div>
                </div>
            </div>`;
    }).join('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    const modalEl = document.createElement('div');
    modalEl.id = modalId;
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${isHotelBooking ? 'Đổi ngày lưu trú' : 'Chọn lịch mới'}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small mb-3">${isHotelBooking ? 'Pet Hotel chỉ cần đổi ngày, không cần chọn giờ hay nhân viên.' : 'Chọn ngày trước, sau đó chọn giờ và nhân viên.'}</p>

                    <div class="mb-1 fw-semibold" style="font-size:0.88rem;">Chọn ngày</div>
                    <input type="date" id="changeDatePicker" class="form-control mb-4" min="${minDate}" style="max-width:220px;">

                    ${isHotelBooking ? '' : `
                    <div class="mb-1 fw-semibold" style="font-size:0.88rem;">Chọn giờ</div>
                    <div class="slot-time-grid mb-3" id="changeSlotGrid">${slotsHtml}</div>
                    <div id="holdBanner" class="d-none mb-3" style="font-size:0.82rem;padding:8px 12px;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;color:#7a5c00;">
                        <strong>Giữ chỗ tạm thời:</strong> Giờ <strong id="holdSlotLabel"></strong> được giữ riêng cho bạn trong <strong id="holdCountdown"></strong>
                    </div>

                    <div class="mb-1 fw-semibold" style="font-size:0.88rem;">Chọn nhân viên</div>
                    <div id="changeStaffList" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-bottom:12px;">${staffHtml}</div>

                    <div class="slot-selected-info mt-2 d-none" id="slotSelectedInfo" style="font-size:0.85rem;color:var(--color-primary-dark,#2e7d32);display:flex;align-items:center;gap:6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Đã chọn: <strong id="slotSelectedText"></strong>
                    </div>
                    `}

                    <div class="mt-3">
                        <label class="form-label fw-semibold" style="font-size:0.88rem;">Ghi chú <span class="text-muted fw-normal">(tuỳ chọn)</span></label>
                        <textarea class="form-control" id="changeNotes" rows="2" placeholder="Ví dụ: tôi cần chuyển sang buổi chiều..."></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Huỷ</button>
                    <button type="button" class="btn-cta" id="confirmChangeBtn" disabled>Xác nhận thay đổi</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modalEl);

    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    let selectedDate = '';
    let selectedTime = null;
    let selectedStaff = isHotelBooking ? 'Bảo mẫu khách sạn' : null;
    let holdInterval = null;

    function clearHoldTimer() {
        if (holdInterval) { clearInterval(holdInterval); holdInterval = null; }
        document.getElementById('holdBanner')?.classList.add('d-none');
    }

    function startHoldTimer(slot) {
        if (isHotelBooking) return;
        clearHoldTimer();
        let remaining = 15 * 60;
        const banner   = document.getElementById('holdBanner');
        const label    = document.getElementById('holdSlotLabel');
        const countdown = document.getElementById('holdCountdown');
        label.textContent = slot;
        banner.classList.remove('d-none');

        function tick() {
            const m = Math.floor(remaining / 60).toString().padStart(2, '0');
            const s = (remaining % 60).toString().padStart(2, '0');
            countdown.textContent = `${m}:${s}`;
            if (remaining <= 0) {
                clearHoldTimer();
                // Giải phóng slot — reset giờ đã chọn
                selectedTime = null;
                modalEl.querySelectorAll('.slot-time-btn').forEach(b => b.classList.remove('active'));
                banner.innerHTML = `<strong>Hết thời gian giữ chỗ!</strong> Vui lòng chọn lại giờ.`;
                banner.style.background = '#fff3cd';
                banner.style.borderColor = '#ffeeba';
                banner.classList.remove('d-none');
                refresh();
            }
            remaining--;
        }
        tick();
        holdInterval = setInterval(tick, 1000);
    }

    // Dọn hold timer khi đóng modal
    modalEl.addEventListener('hidden.bs.modal', () => clearHoldTimer());

    function enableTimeAndStaff() {
        if (isHotelBooking) return;
        modalEl.querySelectorAll('.slot-time-btn').forEach(b => {
            b.disabled = false;
            b.style.opacity = '';
            b.style.cursor = '';
        });
        modalEl.querySelectorAll('.staff-card').forEach(c => {
            c.style.opacity = '';
            c.style.cursor = '';
            c.style.pointerEvents = '';
            c.tabIndex = 0;
        });
    }

    function refresh() {
        const infoEl    = document.getElementById('slotSelectedInfo');
        const textEl    = document.getElementById('slotSelectedText');
        const confirmBtn = document.getElementById('confirmChangeBtn');
        if (selectedDate && (isHotelBooking || (selectedTime && selectedStaff))) {
            const d = new Date(selectedDate + 'T00:00:00');
            const dateLabel = d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
            textEl.textContent = isHotelBooking ? `${dateLabel}` : `${dateLabel} lúc ${selectedTime} • ${selectedStaff}`;
            infoEl?.classList.remove('d-none');
            confirmBtn.disabled = false;
        } else {
            infoEl?.classList.add('d-none');
            confirmBtn.disabled = true;
        }
    }

    document.getElementById('changeDatePicker').addEventListener('change', (e) => {
        selectedDate = e.target.value;
        if (!isHotelBooking) {
            // Reset giờ khi đổi ngày
            selectedTime = null;
            clearHoldTimer();
            modalEl.querySelectorAll('.slot-time-btn').forEach(b => b.classList.remove('active'));
            // Mở khóa giờ + nhân viên
            enableTimeAndStaff();
        }
        refresh();
    });

    if (!isHotelBooking) {
        modalEl.querySelectorAll('.slot-time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!selectedDate) return;
                modalEl.querySelectorAll('.slot-time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                selectedTime = btn.dataset.time;
                startHoldTimer(selectedTime);
                refresh();
            });
        });

        modalEl.querySelectorAll('.staff-card').forEach(card => {
            card.addEventListener('click', () => {
                if (!selectedDate) return;
                modalEl.querySelectorAll('.staff-card').forEach(c => {
                    c.style.borderColor = '#e2e8f0';
                    c.style.background = '';
                });
                card.style.borderColor = 'var(--color-primary, #4caf50)';
                card.style.background = 'var(--color-primary-light, #e8f5e9)';
                selectedStaff = card.dataset.name;
                refresh();
            });
        });
    }

    document.getElementById('confirmChangeBtn').addEventListener('click', () => {
        if (!selectedDate || (!isHotelBooking && (!selectedTime || !selectedStaff))) return;
        clearHoldTimer();

        const notes = document.getElementById('changeNotes').value.trim();
        currentBooking.date = selectedDate;
        if (isHotelBooking) {
            currentBooking.time = '';
            currentBooking.timeStart = '';
            currentBooking.timeEnd = '';
            currentBooking.staff = 'Bảo mẫu khách sạn';
        } else {
            currentBooking.time = selectedTime;
            currentBooking.timeStart = selectedTime;
            currentBooking.timeEnd = '';
            currentBooking.staff = selectedStaff;
        }
        currentBooking.changeCount = (currentBooking.changeCount || 0) + 1;
        if (notes) currentBooking.note = `Yêu cầu đổi lịch: ${notes}`;

        const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const idx = bookings.findIndex(b => b.id === currentBooking.id);
        if (idx !== -1) {
            bookings[idx] = { ...bookings[idx], ...currentBooking };
            localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
        }

        rescheduleBookingOnSupabase(currentBooking); // sync Supabase
        showToast('Đã thay đổi lịch hẹn thành công!', 'success');
        renderBookingDetail(currentBooking);
        checkBookingModifiability(currentBooking);
        bootstrap.Modal.getInstance(modalEl)?.hide();

        if (user) {
            setTimeout(() => showUpsellPasswordModal(user), 800);
        }
    });
}

// ── Hủy lịch ─────────────────────────────────────────────────────────────
function handleCancelBooking() {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;

    if (currentUser && currentUser.is_temporary) {
        // Guest: xác nhận → OTP → hủy → upsell mật khẩu
        showCancelConfirmModal(() => {
            showGuestOTPModal(currentUser, () => {
                confirmCancelBooking(() => showUpsellPasswordModal(currentUser));
            });
        });
        return;
    }

    // Thành viên: xác nhận → hủy
    showCancelConfirmModal(() => {
        confirmCancelBooking(null);
    });
}

function showCancelConfirmModal(onConfirm) {
    const cancelModal = new bootstrap.Modal(document.getElementById('cancelModal'));
    document.getElementById('modalBookingCode').textContent = currentBooking.id;
    cancelModal.show();
    document.getElementById('confirmCancelBtn').onclick = function () {
        cancelModal.hide();
        onConfirm();
    };
}

// ── OTP Modal dùng chung (guest) ──────────────────────────────────────────
function showGuestOTPModal(user, onSuccess) {
    const modalId = 'guestOtpModal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const modalEl = document.createElement('div');
    modalEl.id = modalId;
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Xác thực số điện thoại</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted mb-3">Mã OTP đã được gửi đến số <strong>${user.phone}</strong>.</p>
                    <div class="mb-2">
                        <label class="form-label fw-semibold">Mã OTP <span class="text-muted small fw-normal">(Mã test: 555666)</span></label>
                        <input type="text" id="otpInput" class="form-control text-center fw-bold fs-4"
                            maxlength="6" placeholder="_ _ _ _ _ _" autocomplete="one-time-code">
                        <div class="text-danger small mt-1 d-none" id="otpError">Mã OTP không đúng, vui lòng thử lại.</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Huỷ</button>
                    <button type="button" class="btn-cta" id="confirmOtpBtn">Xác nhận</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modalEl);

    const modal = new bootstrap.Modal(modalEl);
    modal.show();
    showToast('Mã OTP test: 555666', 'success');

    document.getElementById('confirmOtpBtn').addEventListener('click', () => {
        const val = document.getElementById('otpInput').value.trim();
        if (val === '555666') {
            modal.hide();
            onSuccess();
        } else {
            document.getElementById('otpError').classList.remove('d-none');
        }
    });
}

// ── Confirm Cancel ────────────────────────────────────────────────────────
function confirmCancelBooking(onDone) {
    const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
    const idx = bookings.findIndex(b => b.id === currentBooking.id);
    if (idx !== -1) {
        bookings[idx].cancelCount = (bookings[idx].cancelCount || 0) + 1;
        bookings[idx].status = 'cancelled';
        localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
    }

    currentBooking.status = 'cancelled';
    cancelBookingOnSupabase(currentBooking); // sync Supabase (không await để không block UI)
    showToast('Đã hủy lịch hẹn thành công', 'success');

    if (onDone) {
        setTimeout(onDone, 800);
    } else {
        setTimeout(() => { window.location.href = '../bookings/bookings.html'; }, 1500);
    }
}

// ── Upsell mật khẩu (sau khi guest hủy thành công) ───────────────────────
function showUpsellPasswordModal(user) {
    const modalId = 'upsellPasswordModal';
    const existing = document.getElementById(modalId);
    if (existing) existing.remove();

    const modalEl = document.createElement('div');
    modalEl.id = modalId;
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.setAttribute('data-bs-backdrop', 'static'); // không đóng khi click ngoài
    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-body text-center py-4 px-4">
                    <div class="mb-3" style="font-size:2.5rem">🐾</div>
                    <h5 class="fw-bold mb-2" style="color:var(--color-primary-dark)">Lịch hẹn đã được hủy!</h5>
                    <p class="text-muted mb-4">Thiết lập mật khẩu để quản lý lịch hẹn, tích điểm Paw Points và nhận nhiều ưu đãi độc quyền dành cho thành viên.</p>
                    <div class="d-flex flex-column gap-2">
                        <button class="btn-cta w-100" id="upsellSetupBtn">Thiết lập mật khẩu ngay</button>
                        <button class="btn-green-outline w-100" id="upsellSkipBtn">Bỏ qua, quay về tra cứu</button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.appendChild(modalEl);

    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    document.getElementById('upsellSetupBtn').addEventListener('click', () => {
        // Tạo token tạm để điều hướng thiết lập mật khẩu
        const tokens = JSON.parse(localStorage.getItem('pawpal_temp_tokens') || '[]');
        let tokenObj = tokens.find(t => t.phone === user.phone);
        if (!tokenObj) {
            tokenObj = {
                token: `token-temp-${Math.floor(100000 + Math.random() * 900000)}`,
                phone: user.phone,
                createdAt: Date.now()
            };
            tokens.push(tokenObj);
            localStorage.setItem('pawpal_temp_tokens', JSON.stringify(tokens));
        }
        window.location.href = `/pages/public/login/login.html#setup-password?token=${tokenObj.token}`;
    });

    document.getElementById('upsellSkipBtn').addEventListener('click', () => {
        modal.hide();
        window.location.href = '/pages/public/return-guest/return-guest.html';
    });
}

// ── Error Banner ──────────────────────────────────────────────────────────
function showErrorBanner() {
    const banner = document.getElementById('errorBanner');
    if (bannerTimeout) clearTimeout(bannerTimeout);
    banner.classList.remove('d-none', 'hiding');
    bannerTimeout = setTimeout(closeErrorBanner, 7000);
}

function closeErrorBanner() {
    const banner = document.getElementById('errorBanner');
    banner.classList.add('hiding');
    setTimeout(() => banner.classList.add('d-none'), 300);
}

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
    let container = document.getElementById('toastContainer');
    // Fallback: tạo container tạm nếu chưa có trong DOM (ví dụ lỗi xảy ra trước khi trang render xong)
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast-custom toast-${type}`;
    toast.innerHTML = `<div class="toast-content"><span class="toast-message">${message}</span></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ── Tích điểm Paw Points khi booking hoàn thành (BPMN 3.1.13) ────────────
// Công thức: 10.000 VNĐ = 1 điểm — áp dụng cho cả dịch vụ lẫn sản phẩm
// Idempotent: dùng flag pointsAwarded trên booking để tránh cộng 2 lần
function awardBookingLoyaltyPoints(booking, user) {
    if (!booking || !user || user.is_temporary) return;

    const normalizedStatus = resolveBookingStatus(booking);
    if (normalizedStatus !== 'completed') return;
    if (booking.pointsAwarded) return;

    const price = Number(booking.price || 0);
    if (price <= 0) return;

    const pointsEarned = Math.floor(price / 10000);
    if (pointsEarned <= 0) return;

    // Cập nhật users_db
    const users = JSON.parse(localStorage.getItem('pawpal_users_db') || '[]');
    const idx = users.findIndex(u => u.phone === user.phone);
    if (idx !== -1) {
        users[idx].points = (users[idx].points || 0) + pointsEarned;
        users[idx].spend  = (users[idx].spend  || 0) + price;
        users[idx].lastTransactionAt = new Date().toISOString();
        localStorage.setItem('pawpal_users_db', JSON.stringify(users));

        // Sync session
        user.points = users[idx].points;
        user.spend  = users[idx].spend;
        user.lastTransactionAt = users[idx].lastTransactionAt;
        localStorage.setItem('pawpal_current_user', JSON.stringify(user));
    }

    // Đánh dấu đã cộng để tránh cộng lại khi reload
    booking.pointsAwarded = true;
    booking.pointsEarned  = pointsEarned;
    const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
    const bi = bookings.findIndex(b => b.id === booking.id);
    if (bi !== -1) {
        bookings[bi] = { ...bookings[bi], pointsAwarded: true, pointsEarned };
        localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
    }

    showToast(`Bạn vừa tích được +${pointsEarned} Paw Points cho dịch vụ này!`, 'success');
    console.log(`[Loyalty] +${pointsEarned} Paw Points cho booking ${booking.id} (${price.toLocaleString('vi-VN')}đ)`);
}

// ── Exports ───────────────────────────────────────────────────────────────
window.handleChangeSchedule = handleChangeSchedule;
window.handleCancelBooking = handleCancelBooking;
window.closeErrorBanner = closeErrorBanner;

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
    const time = booking.timeStart || booking.time || (isHotel ? '12:00' : '09:00');
    const scheduled = new Date(`${booking.date}T${time}:00`);
    return Number.isNaN(scheduled.getTime()) ? null : scheduled;
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const banner = document.getElementById('errorBanner');
        if (banner && !banner.classList.contains('d-none')) closeErrorBanner();
    }
});

