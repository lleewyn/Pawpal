/* ==========================================================================
   Booking Detail Page - booking-detail.js
   US 5-1: Thay doi lich (Time check, Error banner)
   US 6-1, 6-2: Huy lich
   ========================================================================== */

import { API } from '/assets/js/api/api.js';
import { statusLabels, formatDate, formatPrice } from '../bookings/bookings.js';

let currentBooking = null;
let bannerTimeout = null;

document.addEventListener('DOMContentLoaded', async function () {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('id');

    if (!bookingId) {
        alert('Không tìm thấy thông tin lịch hẹn');
        window.location.href = '../bookings/bookings.html';
        return;
    }

    await loadBookingDetail(bookingId);
});

async function loadBookingDetail(bookingId) {
    await API.initData();

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const userBookings = currentUser ? await API.getUserBookings(currentUser.id) : [];
    currentBooking = userBookings.find((b) => b.id === bookingId || b.code === bookingId);

    if (!currentBooking) {
        alert('Không tìm thấy lịch hẹn này');
        window.location.href = '../bookings/bookings.html';
        return;
    }

    renderBookingDetail(currentBooking);
    checkBookingModifiability(currentBooking);
}

function renderBookingDetail(booking) {
    const normalizedStatus = booking.status === 'upcoming' ? 'confirmed' : booking.status;
    const petName = booking.petName || booking.petInfo?.petName || booking.petId || 'Bé cưng';
    const petBreed = booking.petBreed || booking.petInfo?.breed || '';
    const petWeight = booking.petWeight || booking.petInfo?.weight || '';
    const serviceName = booking.service || booking.serviceName || booking.selectedService?.name || 'Dịch vụ PawPal';
    const servicePackage = booking.package ? ` - ${booking.package}` : '';

    document.getElementById('headerStatusBadge').className = `badge-status badge-${normalizedStatus}`;
    document.getElementById('headerStatusBadge').textContent = statusLabels[booking.status] || booking.status;

    const statusInfo = document.getElementById('statusInfo');
    if (statusInfo) {
        statusInfo.innerHTML = `<span class="badge-status badge-${normalizedStatus}">${statusLabels[booking.status] || booking.status}</span>`;
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
}

function checkBookingModifiability(booking) {
    const btnChange = document.getElementById('btnChangeSchedule');
    const btnCancel = document.getElementById('btnCancelBooking');

    const now = new Date();
    let bookingDateTime;

    if (booking.timeStart) {
        const [year, month, day] = booking.date.split('-');
        const [hours, minutes] = booking.timeStart.split(':');
        bookingDateTime = new Date(year, month - 1, day, hours, minutes);
    } else {
        bookingDateTime = new Date(booking.date || booking.schedule?.date);
        bookingDateTime.setHours(9, 0, 0, 0);
    }

    const diffMinutes = (bookingDateTime - now) / (1000 * 60);
    const changeLimitReached = (booking.changeCount || 0) >= 2;

    const canModify = diffMinutes >= 120
        && !['in-progress', 'completed', 'cancelled'].includes(booking.status)
        && !changeLimitReached;

    const canCancel = diffMinutes >= 120
        && ['pending', 'confirmed', 'upcoming'].includes(booking.status);

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

    const today = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() + i + 1);
        return d;
    });

    const slots = ['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00', '17:00'];

    const dayTabsHtml = days.map((d, i) => {
        const label = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
        return `<button class="slot-day-tab${i === 0 ? ' active' : ''}" data-idx="${i}">${label}</button>`;
    }).join('');

    const slotsHtml = slots.map(s =>
        `<button class="slot-time-btn" data-time="${s}">${s}</button>`
    ).join('');

    const modalEl = document.createElement('div');
    modalEl.id = modalId;
    modalEl.className = 'modal fade';
    modalEl.tabIndex = -1;
    modalEl.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Chọn lịch mới</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small mb-3">Chọn ngày và giờ mới. Lịch cũ sẽ được giải phóng sau khi xác nhận.</p>
                    <div class="slot-day-tabs mb-3">${dayTabsHtml}</div>
                    <div class="slot-time-grid">${slotsHtml}</div>
                    <div class="slot-selected-info mt-3 d-none" id="slotSelectedInfo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Đã chọn: <strong id="slotSelectedText"></strong>
                    </div>
                    <div class="mt-4">
                        <label class="form-label fw-semibold">Ghi chú <span class="text-muted fw-normal">(tuỳ chọn)</span></label>
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

    let selectedDayIdx = 0;
    let selectedTime = null;

    function refresh() {
        const d = days[selectedDayIdx];
        const infoEl = document.getElementById('slotSelectedInfo');
        const textEl = document.getElementById('slotSelectedText');
        const confirmBtn = document.getElementById('confirmChangeBtn');
        if (selectedTime) {
            textEl.textContent = `${d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })} lúc ${selectedTime}`;
            infoEl.classList.remove('d-none');
            confirmBtn.disabled = false;
        } else {
            infoEl.classList.add('d-none');
            confirmBtn.disabled = true;
        }
    }

    modalEl.querySelectorAll('.slot-day-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            modalEl.querySelectorAll('.slot-day-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedDayIdx = parseInt(btn.dataset.idx);
            selectedTime = null;
            modalEl.querySelectorAll('.slot-time-btn').forEach(b => b.classList.remove('active'));
            refresh();
        });
    });

    modalEl.querySelectorAll('.slot-time-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            modalEl.querySelectorAll('.slot-time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedTime = btn.dataset.time;
            refresh();
        });
    });

    document.getElementById('confirmChangeBtn').addEventListener('click', () => {
        if (!selectedTime) return;

        const dateString = days[selectedDayIdx].toISOString().split('T')[0];
        const notes = document.getElementById('changeNotes').value.trim();

        currentBooking.date = dateString;
        currentBooking.time = selectedTime;
        currentBooking.timeStart = selectedTime;
        currentBooking.timeEnd = '';
        currentBooking.changeCount = (currentBooking.changeCount || 0) + 1;
        if (notes) currentBooking.note = `Yêu cầu đổi lịch: ${notes}`;

        const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const idx = bookings.findIndex(b => b.id === currentBooking.id);
        if (idx !== -1) {
            bookings[idx] = { ...bookings[idx], ...currentBooking };
            localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
        }

        showToast('Đã thay đổi lịch hẹn thành công!', 'success');
        renderBookingDetail(currentBooking);
        checkBookingModifiability(currentBooking);
        bootstrap.Modal.getInstance(modalEl)?.hide();

        // Nếu là guest → hiện upsell mật khẩu sau khi đổi
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
        // Redirect về trang tra cứu công khai
        window.location.href = '/pages/public/lookup/lookup.html';
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
    const container = document.getElementById('toastContainer');
    if (!container) return;
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

// ── Exports ───────────────────────────────────────────────────────────────
window.handleChangeSchedule = handleChangeSchedule;
window.handleCancelBooking = handleCancelBooking;
window.closeErrorBanner = closeErrorBanner;

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const banner = document.getElementById('errorBanner');
        if (banner && !banner.classList.contains('d-none')) closeErrorBanner();
    }
});
