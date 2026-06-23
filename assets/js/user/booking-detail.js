/* ==========================================================================
   Booking Detail Page — booking-detail.js
   US 5-1: Thay đổi lịch (Time check, Error banner)
   US 6-1, 6-2: Hủy lịch
   ========================================================================== */

import { mockBookings, statusLabels, formatDate, formatPrice } from './bookings.js';

let currentBooking = null;
let bannerTimeout = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function () {
    const urlParams = new URLSearchParams(window.location.search);
    const bookingId = urlParams.get('id');

    if (!bookingId) {
        alert('Không tìm thấy thông tin lịch hẹn');
        window.location.href = 'bookings.html';
        return;
    }

    loadBookingDetail(bookingId);
});

// Load booking detail from data
function loadBookingDetail(bookingId) {
    const storedBookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
    currentBooking = Array.isArray(storedBookings)
        ? storedBookings.find(b => b.id === bookingId) || mockBookings.find(b => b.id === bookingId)
        : mockBookings.find(b => b.id === bookingId);

    if (!currentBooking) {
        alert('Không tìm thấy lịch hẹn này');
        window.location.href = 'bookings.html';
        return;
    }

    // Render booking detail
    renderBookingDetail(currentBooking);

    // Check if booking can be modified (US 5-1)
    checkBookingModifiability(currentBooking);
}

// Render booking detail to page
function renderBookingDetail(booking) {
    // Header status badge
    const headerStatusBadge = document.getElementById('headerStatusBadge');
    headerStatusBadge.className = `badge-status badge-${booking.status}`;
    headerStatusBadge.textContent = statusLabels[booking.status];

    // Status info in summary card
    const statusInfo = document.getElementById('statusInfo');
    if (statusInfo) {
        statusInfo.innerHTML = `<span class="badge-status badge-${booking.status}">${statusLabels[booking.status]}</span>`;
    }

    // Summary card
    document.getElementById('bookingCode').textContent = booking.id;
    document.getElementById('bannerBookingCode').textContent = booking.id;

    const petBreed = booking.petBreed || 'Poodle';
    const petWeight = booking.petWeight || '5kg';
    document.getElementById('petInfo').innerHTML = `${booking.petEmoji} ${booking.petName} (${petBreed}, ${petWeight})`;

    const servicePackage = booking.package ? ` - ${booking.package}` : '';
    document.getElementById('serviceInfo').textContent = `${booking.service}${servicePackage}`;

    // Date/time
    let dateTimeText = formatDate(booking.date);
    if (booking.timeStart) {
        dateTimeText += ` | ${booking.timeStart} - ${booking.timeEnd}`;
    } else if (booking.dateEnd) {
        dateTimeText = `${dateTimeText} - ${formatDate(booking.dateEnd)}`;
    }
    document.getElementById('dateTimeInfo').textContent = dateTimeText;

    // Staff
    if (booking.staff) {
        document.getElementById('staffInfo').innerHTML = ` ${booking.staff}`;
    } else {
        document.getElementById('staffInfo').textContent = 'Chưa phân công';
    }

    // Price
    document.getElementById('priceInfo').textContent = ` ${formatPrice(booking.price)}`;

    // Note
    if (booking.note) {
        document.getElementById('noteRow').classList.remove('d-none');
        document.getElementById('noteInfo').textContent = booking.note;
    }
}


// US 5-1: Check if booking can be modified
function checkBookingModifiability(booking) {
    const btnChangeSchedule = document.getElementById('btnChangeSchedule');
    const btnCancelBooking = document.getElementById('btnCancelBooking');

    // Calculate time difference
    const now = new Date();
    let bookingDateTime;

    if (booking.timeStart) {
        // Parse date and time
        const [year, month, day] = booking.date.split('-');
        const [hours, minutes] = booking.timeStart.split(':');
        bookingDateTime = new Date(year, month - 1, day, hours, minutes);
    } else {
        // For hotel bookings without specific time, use start of day
        bookingDateTime = new Date(booking.date);
        bookingDateTime.setHours(9, 0, 0, 0); // Assume 9:00 AM check-in
    }

    const diffMinutes = (bookingDateTime - now) / (1000 * 60);

    // US 5-1: Ẩn nút "Thay đổi lịch" nếu < 120 phút (2 tiếng) HOẶC đang thực hiện/hoàn thành/đã hủy
    const canModify = diffMinutes >= 120 && booking.status !== 'in-progress' && booking.status !== 'completed' && booking.status !== 'cancelled';

    if (!canModify) {
        btnChangeSchedule.classList.add('d-none');
    } else {
        btnChangeSchedule.style.display = 'inline-flex';
    }

    // US 6-1: Ẩn nút "Hủy lịch hẹn" nếu < 1440 phút (24 tiếng) HOẶC không phải là pending/confirmed
    const canCancel = diffMinutes >= 1440 && (booking.status === 'pending' || booking.status === 'confirmed');

    if (!canCancel) {
        btnCancelBooking.classList.add('d-none');
    } else {
        btnCancelBooking.style.display = 'inline-flex';
    }
}

// Handle change schedule button click
function handleChangeSchedule() {
    const btnChangeSchedule = document.getElementById('btnChangeSchedule');

    // US 5-1: If button is disabled, show error banner
    if (btnChangeSchedule.disabled) {
        showErrorBanner();
        return;
    }

    // Navigate to change schedule page (to be implemented)
    alert('Tính năng thay đổi lịch đang được phát triển');
    // window.location.href = `booking-change.html?id=${currentBooking.id}`;
}

// US 5-1: Show error banner
function showErrorBanner() {
    const banner = document.getElementById('errorBanner');

    // Clear any existing timeout
    if (bannerTimeout) {
        clearTimeout(bannerTimeout);
    }

    // Show banner
    banner.classList.remove('d-none');
    banner.classList.remove('hiding');

    // Auto hide after 7 seconds (US 5-1 requirement)
    bannerTimeout = setTimeout(() => {
        closeErrorBanner();
    }, 7000);
}

// Close error banner
function closeErrorBanner() {
    const banner = document.getElementById('errorBanner');
    banner.classList.add('hiding');

    // Hide completely after animation
    setTimeout(() => {
        banner.classList.add('d-none');
    }, 300);
}

// Make closeErrorBanner globally accessible
window.closeErrorBanner = closeErrorBanner;


// US 6-1: Handle cancel booking button click
function handleCancelBooking() {
    const btnCancelBooking = document.getElementById('btnCancelBooking');

    // If button is disabled, do nothing
    if (btnCancelBooking.disabled) {
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;

    if (currentUser && currentUser.is_temporary) {
        // Khách vãng lai: Yêu cầu xác thực OTP trước
        showGuestCancelOTPFlow(currentUser);
    } else {
        // Thành viên bình thường: Hiện modal xác nhận luôn
        const cancelModal = new bootstrap.Modal(document.getElementById('cancelModal'));
        document.getElementById('modalBookingCode').textContent = currentBooking.id;
        cancelModal.show();

        // Handle confirm cancel button
        document.getElementById('confirmCancelBtn').onclick = function () {
            confirmCancelBooking();
            cancelModal.hide();
        };
    }
}

// Show OTP flow for Guest Cancellation
function showGuestCancelOTPFlow(user) {
    // Generate mock OTP dialog
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
                        <h5 class="modal-title">Xác thực SĐT khách hàng</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <p>PawPal đã gửi mã xác thực (OTP) qua SMS đến số điện thoại <strong>${user.phone}</strong>.</p>
                        <div class="form-group mb-3">
                            <label for="cancelOtpInput" class="form-label" class="fw-bold">Nhập mã OTP (Mã test: 555666)</label>
                            <input type="text" id="cancelOtpInput" class="form-control text-center" class="otp-input" maxlength="6" placeholder="******">
                            <div class="invalid-feedback d-none" id="cancelOtpError">Mã OTP không chính xác, vui lòng thử lại.</div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-secondary" data-bs-dismiss="modal">Hủy bỏ</button>
                        <button type="button" class="btn-cta" id="confirmCancelOtpBtn">Xác nhận OTP</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(otpModalEl);
    }

    const modal = new bootstrap.Modal(otpModalEl);
    modal.show();

    // Trigger SMS toast
    showToast('Mã OTP test của bạn là: 555666', 'success');

    const otpInput = document.getElementById('cancelOtpInput');
    const otpError = document.getElementById('cancelOtpError');
    const confirmOtpBtn = document.getElementById('confirmCancelOtpBtn');

    otpInput.value = '';
    otpError.classList.add('d-none');

    confirmOtpBtn.onclick = () => {
        if (otpInput.value === '555666') {
            modal.hide();
            // Show choices dialog
            showGuestActionChoices(user);
        } else {
            otpError.classList.remove('d-none');
        }
    };
}

// Show action choices for Guest Cancellation: Setup Password or Call Hotline
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
                        <h5 class="modal-title">Yêu cầu kích hoạt mật khẩu</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body text-center">
                        <p class="cancel-desc">Để tự hủy lịch trực tuyến trên website, bạn vui lòng thiết lập mật khẩu cho tài khoản để bảo vệ thông tin nhé!</p>
                        <div class="d-flex flex-column gap-2 mt-4">
                            <button class="btn-cta" id="choiceSetupPassBtn"> Thiết lập mật khẩu ngay</button>
                            <a href="tel:0987654321" class="btn-green-outline" class="text-decoration-none" id="choiceCallHotlineBtn"> Gọi Hotline hỗ trợ hủy thủ công</a>
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
        // Lookup temp token or generate a new one
        const tokens = JSON.parse(localStorage.getItem('pawpal_temp_tokens') || '[]');
        let tokenObj = tokens.find(t => t.phone === user.phone);
        if (!tokenObj) {
            tokenObj = {
                token: 'token-temp-' + Math.floor(100000 + Math.random() * 900000),
                phone: user.phone,
                createdAt: Date.now()
            };
            tokens.push(tokenObj);
            localStorage.setItem('pawpal_temp_tokens', JSON.stringify(tokens));
        }

        // Redirect to setup password form
        window.location.href = `/pages/public/login.html#setup-password?token=${tokenObj.token}`;
    };
}

// US 6-2: Confirm cancel booking
function confirmCancelBooking() {
    // Update booking status in localStorage bookings database
    const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
    const index = bookings.findIndex(b => b.id === currentBooking.id);

    if (index !== -1) {
        bookings[index].status = 'cancelled';
        localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
    }

    currentBooking.status = 'cancelled';

    // Show success toast
    showToast('Đã hủy lịch hẹn thành công', 'success');

    // Redirect back to bookings list after 1.5 seconds
    setTimeout(() => {
        window.location.href = 'bookings.html';
    }, 1500);
}

// Show toast notification
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast-custom toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${type === 'success' ? '' : 'ℹ'}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;

    toastContainer.appendChild(toast);

    // Show toast
    setTimeout(() => toast.classList.add('show'), 10);

    // Hide and remove after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Make functions globally accessible
window.handleChangeSchedule = handleChangeSchedule;
window.handleCancelBooking = handleCancelBooking;

// Keyboard accessibility: ESC to close banner
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        const banner = document.getElementById('errorBanner');
        if (banner && banner.style.display !== 'none') {
            closeErrorBanner();
        }
    }
});
