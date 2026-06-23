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
        alert('Khong tim thay thong tin lich hen');
        window.location.href = 'bookings.html';
        return;
    }

    await loadBookingDetail(bookingId);
});

async function loadBookingDetail(bookingId) {
    await API.initData();

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
    const userBookings = currentUser ? await API.getUserBookings(currentUser.id) : [];
    currentBooking = userBookings.find((booking) => booking.id === bookingId || booking.code === bookingId);

    if (!currentBooking) {
        alert('Khong tim thay lich hen nay');
        window.location.href = 'bookings.html';
        return;
    }

    renderBookingDetail(currentBooking);
    checkBookingModifiability(currentBooking);
}

function renderBookingDetail(booking) {
    const normalizedStatus = booking.status === 'upcoming' ? 'confirmed' : booking.status;
    const petName = booking.petName || booking.petInfo?.petName || booking.petId || 'Be cung';
    const petBreed = booking.petBreed || booking.petInfo?.breed || '';
    const petWeight = booking.petWeight || booking.petInfo?.weight || '';
    const serviceName = booking.service || booking.serviceName || booking.selectedService?.name || 'Dich vu PawPal';
    const servicePackage = booking.package ? ` - ${booking.package}` : '';

    const headerStatusBadge = document.getElementById('headerStatusBadge');
    headerStatusBadge.className = `badge-status badge-${normalizedStatus}`;
    headerStatusBadge.textContent = statusLabels[booking.status] || booking.status;

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
        dateTimeText += ` | ${booking.timeStart} - ${booking.timeEnd}`;
    } else if (booking.time) {
        dateTimeText += ` | ${booking.time}`;
    } else if (booking.schedule?.slot) {
        dateTimeText += ` | ${booking.schedule.slot}`;
    } else if (booking.dateEnd) {
        dateTimeText = `${dateTimeText} - ${formatDate(booking.dateEnd)}`;
    }
    document.getElementById('dateTimeInfo').textContent = dateTimeText;

    document.getElementById('staffInfo').textContent = booking.staff || 'Chua phan cong';
    document.getElementById('priceInfo').textContent = formatPrice(booking.price || 0);

    if (booking.note) {
        document.getElementById('noteRow').classList.remove('d-none');
        document.getElementById('noteInfo').textContent = booking.note;
    }
}

function checkBookingModifiability(booking) {
    const btnChangeSchedule = document.getElementById('btnChangeSchedule');
    const btnCancelBooking = document.getElementById('btnCancelBooking');

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
    const canModify = diffMinutes >= 120 && booking.status !== 'in-progress' && booking.status !== 'completed' && booking.status !== 'cancelled';
    const canCancel = diffMinutes >= 1440 && (booking.status === 'pending' || booking.status === 'confirmed' || booking.status === 'upcoming');

    if (!canModify) btnChangeSchedule.classList.add('d-none');
    else btnChangeSchedule.style.display = 'inline-flex';

    if (!canCancel) btnCancelBooking.classList.add('d-none');
    else btnCancelBooking.style.display = 'inline-flex';
}

function handleChangeSchedule() {
    const btnChangeSchedule = document.getElementById('btnChangeSchedule');
    if (btnChangeSchedule.disabled) {
        showErrorBanner();
        return;
    }

    alert('Tinh nang thay doi lich dang duoc phat trien');
}

function showErrorBanner() {
    const banner = document.getElementById('errorBanner');

    if (bannerTimeout) clearTimeout(bannerTimeout);

    banner.classList.remove('d-none');
    banner.classList.remove('hiding');

    bannerTimeout = setTimeout(() => {
        closeErrorBanner();
    }, 7000);
}

function closeErrorBanner() {
    const banner = document.getElementById('errorBanner');
    banner.classList.add('hiding');
    setTimeout(() => {
        banner.classList.add('d-none');
    }, 300);
}

window.closeErrorBanner = closeErrorBanner;

function handleCancelBooking() {
    const btnCancelBooking = document.getElementById('btnCancelBooking');
    if (btnCancelBooking.disabled) return;

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;

    if (currentUser && currentUser.is_temporary) {
        showGuestCancelOTPFlow(currentUser);
        return;
    }

    const cancelModal = new bootstrap.Modal(document.getElementById('cancelModal'));
    document.getElementById('modalBookingCode').textContent = currentBooking.id;
    cancelModal.show();

    document.getElementById('confirmCancelBtn').onclick = function () {
        confirmCancelBooking();
        cancelModal.hide();
    };
}

function showGuestCancelOTPFlow(user) {
    let otpModalEl = document.getElementById('guestOtpModal');
    if (!otpModalEl) {
        otpModalEl = document.createElement('div');
        otpModalEl.id = 'guestOtpModal';
        otpModalEl.className = 'modal fade';
        otpModalEl.tabIndex = -1;
        otpModalEl.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Xac thuc SDT khach hang</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>PawPal da gui ma xac thuc (OTP) qua SMS den so dien thoai <strong>${user.phone}</strong>.</p>
                        <div class="form-group mb-3">
                            <label for="cancelOtpInput" class="form-label fw-bold">Nhap ma OTP (Ma test: 555666)</label>
                            <input type="text" id="cancelOtpInput" class="form-control text-center otp-input" maxlength="6" placeholder="******">
                            <div class="invalid-feedback d-none" id="cancelOtpError">Ma OTP khong chinh xac, vui long thu lai.</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" data-bs-dismiss="modal">Huy bo</button>
                        <button type="button" class="btn-cta" id="confirmCancelOtpBtn">Xac nhan OTP</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(otpModalEl);
    }

    const modal = new bootstrap.Modal(otpModalEl);
    modal.show();
    showToast('Ma OTP test cua ban la: 555666', 'success');

    const otpInput = document.getElementById('cancelOtpInput');
    const otpError = document.getElementById('cancelOtpError');
    const confirmOtpBtn = document.getElementById('confirmCancelOtpBtn');

    otpInput.value = '';
    otpError.classList.add('d-none');

    confirmOtpBtn.onclick = () => {
        if (otpInput.value === '555666') {
            modal.hide();
            showGuestActionChoices(user);
        } else {
            otpError.classList.remove('d-none');
        }
    };
}

function showGuestActionChoices(user) {
    let choicesModalEl = document.getElementById('guestChoicesModal');
    if (!choicesModalEl) {
        choicesModalEl = document.createElement('div');
        choicesModalEl.id = 'guestChoicesModal';
        choicesModalEl.className = 'modal fade';
        choicesModalEl.tabIndex = -1;
        choicesModalEl.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Yeu cau kich hoat mat khau</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center">
                        <p class="cancel-desc">De tu huy lich truc tuyen tren website, ban vui long thiet lap mat khau cho tai khoan de bao ve thong tin nhe!</p>
                        <div class="d-flex flex-column gap-2 mt-4">
                            <button class="btn-cta" id="choiceSetupPassBtn">Thiet lap mat khau ngay</button>
                            <a href="tel:0987654321" class="btn-green-outline text-decoration-none" id="choiceCallHotlineBtn">Goi Hotline ho tro huy thu cong</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(choicesModalEl);
    }

    const modal = new bootstrap.Modal(choicesModalEl);
    modal.show();

    document.getElementById('choiceSetupPassBtn').onclick = () => {
        modal.hide();
        const tokens = JSON.parse(localStorage.getItem('pawpal_temp_tokens') || '[]');
        let tokenObj = tokens.find((token) => token.phone === user.phone);
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
    };
}

function confirmCancelBooking() {
    const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
    const index = bookings.findIndex((booking) => booking.id === currentBooking.id);

    if (index !== -1) {
        bookings[index].status = 'cancelled';
        localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
    }

    currentBooking.status = 'cancelled';
    showToast('Da huy lich hen thanh cong', 'success');

    setTimeout(() => {
        window.location.href = 'bookings.html';
    }, 1500);
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast-custom toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${type === 'success' ? '' : 'i'}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;

    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

window.handleChangeSchedule = handleChangeSchedule;
window.handleCancelBooking = handleCancelBooking;

document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const banner = document.getElementById('errorBanner');
        if (banner && banner.style.display !== 'none') {
            closeErrorBanner();
        }
    }
});
