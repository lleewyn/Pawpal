/* ==========================================================================
   return-guest.js — Tra cứu lịch dịch vụ / đơn hàng
   ========================================================================== */

const BOOKING_STATUS = {
    upcoming:      { label: 'Đã xác nhận',    cls: 'rg-badge-confirmed' },
    confirmed:     { label: 'Đã xác nhận',    cls: 'rg-badge-confirmed' },
    pending:       { label: 'Chờ xác nhận',   cls: 'rg-badge-pending' },
    'in-progress': { label: 'Đang thực hiện', cls: 'rg-badge-inprogress' },
    completed:     { label: 'Hoàn thành',     cls: 'rg-badge-completed' },
    cancelled:     { label: 'Đã hủy',         cls: 'rg-badge-cancelled' },
};

const ORDER_STATUS = {
    pending_payment: { label: 'Chờ thanh toán', cls: 'rg-badge-pending' },
    preparing:       { label: 'Đang chuẩn bị',  cls: 'rg-badge-inprogress' },
    shipping:        { label: 'Đang giao hàng', cls: 'rg-badge-shipping' },
    delivered:       { label: 'Đã giao',        cls: 'rg-badge-confirmed' },
    completed:       { label: 'Hoàn thành',     cls: 'rg-badge-completed' },
    cancelled:       { label: 'Đã hủy',         cls: 'rg-badge-cancelled' },
};

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    const form      = document.getElementById('rg-form');
    const errorBox  = document.getElementById('rg-error');
    const resultsEl = document.getElementById('rg-results');

    errorBox.style.display  = 'none';
    resultsEl.style.display = 'none';

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const phone = document.getElementById('rg-phone').value.trim();
        if (!phone) return;

        const btn = form.querySelector('button[type=submit]');
        btn.disabled    = true;
        btn.textContent = 'Đang tìm...';

        const data     = await loadData();
        const bookings = findBookingsByPhone(phone, data);
        const orders   = findOrdersByPhone(phone, data);

        btn.disabled    = false;
        btn.textContent = 'Tìm kiếm';

        if (!bookings.length && !orders.length) {
            resultsEl.style.display = 'none';
            errorBox.style.display  = 'block';
            return;
        }

        errorBox.style.display  = 'none';
        resultsEl.style.display = 'block';
        renderResults(bookings, orders);
    });
});

// ── Data ──────────────────────────────────────────────────────────────────
async function loadData() {
    const [bookingsRaw, ordersRaw, usersRaw, petsRaw] = await Promise.all([
        fetchJSON('/data/bookings.json'),
        fetchJSON('/data/orders.json'),
        fetchJSON('/data/users.json'),
        fetchJSON('/data/pets.json'),
    ]);

    // Merge với localStorage để phản ánh thay đổi user đã thực hiện
    const localBookings = safeParseArray('pawpal_bookings');
    const localOrders   = safeParseArray('pawpal_orders');
    const localPets     = safeParseArray('pawpal_pets');

    const bookingsMap = new Map((bookingsRaw || []).map(b => [b.id, b]));
    localBookings.forEach(b => { if (b.id) bookingsMap.set(b.id, b); });

    const ordersMap = new Map((ordersRaw || []).map(o => [o.id, o]));
    localOrders.forEach(o => { if (o.id) ordersMap.set(o.id, o); });

    // Merge pets: seed từ file + user tự thêm từ localStorage
    const petsMap = new Map((petsRaw || []).map(p => [p.id, p]));
    localPets.forEach(p => { if (p.id) petsMap.set(p.id, p); });

    return {
        bookings: [...bookingsMap.values()],
        orders:   [...ordersMap.values()],
        users:    usersRaw || [],
        pets:     [...petsMap.values()],
    };
}

async function fetchJSON(url) {
    try {
        const r = await fetch(url);
        return r.ok ? r.json() : [];
    } catch (_) { return []; }
}

function safeParseArray(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]') || []; }
    catch (_) { return []; }
}

function normalizePhone(p) {
    return String(p || '').replace(/\D/g, '').replace(/^84/, '0');
}

// ── Search ────────────────────────────────────────────────────────────────
function findBookingsByPhone(phone, { bookings, users, pets }) {
    const norm = normalizePhone(phone);
    const user = users.find(u => normalizePhone(u.phone) === norm);

    return bookings
        .filter(b =>
            normalizePhone(b.phone) === norm ||
            normalizePhone(b.customerPhone) === norm ||
            (user && String(b.userId) === String(user.id))
        )
        .map(b => {
            const pet = pets.find(p => String(p.id) === String(b.petId));
            return { ...b, petName: pet?.name || b.petName || 'Bé cưng' };
        });
}

function findOrdersByPhone(phone, { orders, users }) {
    const norm = normalizePhone(phone);
    const user = users.find(u => normalizePhone(u.phone) === norm);

    return orders.filter(o =>
        normalizePhone(o.delivery?.phone) === norm ||
        normalizePhone(o.phone) === norm ||
        (user && String(o.userId) === String(user.id))
    );
}

// ── Render ────────────────────────────────────────────────────────────────
function renderResults(bookings, orders) {
    const tabsEl = document.getElementById('rg-tabs');
    const listEl = document.getElementById('rg-list');

    tabsEl.innerHTML = `
        <button class="rg-tab active" data-filter="all">Tất cả (${bookings.length + orders.length})</button>
        <button class="rg-tab" data-filter="booking">Dịch vụ (${bookings.length})</button>
        <button class="rg-tab" data-filter="order">Đơn hàng (${orders.length})</button>`;

    tabsEl.querySelectorAll('.rg-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            tabsEl.querySelectorAll('.rg-tab').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const f = btn.dataset.filter;
            listEl.querySelectorAll('.rg-item').forEach(item => {
                item.style.display = (f === 'all' || item.dataset.type === f) ? '' : 'none';
            });
        });
    });

    listEl.innerHTML =
        bookings.map(b => buildBookingCard(b)).join('') +
        orders.map(o => buildOrderCard(o)).join('');
}

// ── Helpers ───────────────────────────────────────────────────────────────
function badge(statusMap, status) {
    const s = statusMap[status] || { label: status, cls: 'rg-badge-pending' };
    return `<span class="rg-badge ${s.cls}">${s.label}</span>`;
}

function fmtDate(d) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
    catch (_) { return d; }
}

function fmtPrice(n) {
    return new Intl.NumberFormat('vi-VN').format(n || 0) + 'đ';
}

function esc(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function canCancelOrder(o) {
    return ['pending_payment', 'preparing'].includes(o.status);
}

function canReturnOrder(o) {
    if (o.status !== 'completed') return false;
    // Trong vòng 7 ngày kể từ ngày hoàn thành
    const updatedAt = o.updatedAt || o.createdAt;
    if (!updatedAt) return false;
    const daysDiff = (new Date() - new Date(updatedAt)) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7;
}
function canModifyBooking(b) {
    if (!['pending', 'confirmed', 'upcoming'].includes(b.status)) return false;
    if ((b.changeCount || 0) >= 2) return false;
    try {
        const [y, m, d] = (b.date || '').split('-');
        const [h, min]  = (b.timeStart || b.time || '09:00').split(':');
        return (new Date(y, m - 1, d, h, min) - new Date()) > 2 * 3600 * 1000;
    } catch (_) { return false; }
}

function canCancelBooking(b) {
    if (!['pending', 'confirmed', 'upcoming'].includes(b.status)) return false;
    if ((b.cancelCount || 0) >= 3) return false;
    try {
        const [y, m, d] = (b.date || '').split('-');
        const [h, min]  = (b.timeStart || b.time || '09:00').split(':');
        return (new Date(y, m - 1, d, h, min) - new Date()) > 2 * 3600 * 1000;
    } catch (_) { return false; }
}

// ── Cards ─────────────────────────────────────────────────────────────────
function buildBookingCard(b) {
    const pet     = esc(b.petName || 'Bé cưng');
    const service = esc(b.serviceName || b.service || 'Dịch vụ');
    const date    = fmtDate(b.date || b.schedule?.date);
    const time    = b.timeStart || b.time || b.schedule?.slot || '';
    const staff   = esc(b.staff || 'Chưa phân công');
    const branch  = esc(b.branch || '');

    return `
    <div class="rg-item" data-type="booking">
        <div class="rg-item-header">
            <div>
                <h4 class="rg-item-name">${service}</h4>
                <div class="rg-item-meta">
                    <span>Mã: ${esc(b.id)}</span>
                    <span>${date}${time ? ' · ' + time : ''}</span>
                    <span>Bé: ${pet}</span>
                    ${branch ? `<span>${branch}</span>` : ''}
                </div>
            </div>
            <div style="text-align:right">
                <div class="rg-item-price">${fmtPrice(b.price)}</div>
                ${badge(BOOKING_STATUS, b.status)}
            </div>
        </div>
        <hr class="rg-divider">
        <div class="rg-summary">
            <div>
                <div class="rg-summary-label">Nhân viên</div>
                <div class="rg-summary-value">${staff}</div>
            </div>
            ${b.note ? `<div>
                <div class="rg-summary-label">Ghi chú</div>
                <div class="rg-summary-value">${esc(b.note)}</div>
            </div>` : ''}
        </div>
        ${canModifyBooking(b) || canCancelBooking(b) ? `
        <div class="rg-actions">
            ${canCancelBooking(b) ? `
            <button class="btn-green-outline" onclick="handleGuestBookingAction('${esc(b.id)}', 'cancel')">
                Hủy lịch
            </button>` : ''}
            ${canModifyBooking(b) ? `
            <button class="btn-green-outline" onclick="handleGuestBookingAction('${esc(b.id)}', 'change')">
                Đổi lịch
            </button>` : ''}
        </div>` : ''}
    </div>`;
}

function buildOrderCard(o) {
    const first   = o.products?.[0];
    const name    = esc(first?.name || 'Sản phẩm');
    const extra   = o.products?.length > 1 ? ` +${o.products.length - 1} sản phẩm` : '';
    const address = esc(o.delivery?.address || '');
    const paid    = o.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán';

    return `
    <div class="rg-item" data-type="order">
        <div class="rg-item-header">
            <div>
                <h4 class="rg-item-name">Đơn hàng: ${esc(o.id)}</h4>
                <div class="rg-item-meta">
                    <span>${name}${extra}</span>
                    <span>Ngày đặt: ${fmtDate(o.createdAt)}</span>
                    ${o.delivery?.name ? `<span>Nhận: ${esc(o.delivery.name)}</span>` : ''}
                </div>
            </div>
            <div style="text-align:right">
                <div class="rg-item-price">${fmtPrice(o.pricing?.total)}</div>
                ${badge(ORDER_STATUS, o.status)}
            </div>
        </div>
        <hr class="rg-divider">
        <div class="rg-summary">
            ${address ? `<div>
                <div class="rg-summary-label">Địa chỉ giao</div>
                <div class="rg-summary-value">${address}</div>
            </div>` : ''}
            <div>
                <div class="rg-summary-label">Thanh toán</div>
                <div class="rg-summary-value">${paid}</div>
            </div>
        </div>
        ${canCancelOrder(o) ? `
        <div class="rg-actions">
            <button class="btn-green-outline" onclick="handleGuestCancelOrder('${esc(o.id)}')">
                Hủy đơn hàng
            </button>
        </div>` : ''}
        ${canReturnOrder(o) ? `
        <div class="rg-actions">
            <button class="btn-green-outline" onclick="handleGuestReturnRequest('${esc(o.id)}')">
                Yêu cầu đổi trả
            </button>
        </div>` : ''}
    </div>`;
}

// ── Actions ───────────────────────────────────────────────────────────────
window.handleGuestBookingAction = function(bookingId, action) {
    const phone = document.getElementById('rg-phone').value.trim();
    if (!phone) { showToast('Vui lòng nhập số điện thoại trước.', 'info'); return; }

    const title  = action === 'cancel' ? 'Hủy lịch hẹn' : 'Đổi lịch hẹn';
    const desc   = action === 'cancel'
        ? 'Lịch hẹn sau khi hủy sẽ không thể khôi phục. Bạn có chắc muốn tiếp tục?'
        : 'Bạn có muốn thay đổi lịch hẹn này không? PawPal sẽ xác thực danh tính trước khi tiến hành.';

    showActionConfirm(title, desc, phone, () => {
        if (action === 'cancel') {
            // Sau khi xác nhận + OTP → hủy thẳng, không hỏi lại lần 2
            showOTPModal(phone, () => {
                confirmCancelBooking(bookingId);
                showUpsellModal(phone);
            });
        } else {
            showChangeScheduleModal(bookingId, phone);
        }
    });
};

window.handleGuestCancelOrder = function(orderId) {
    const phone = document.getElementById('rg-phone').value.trim();
    if (!phone) { showToast('Vui lòng nhập số điện thoại trước.', 'info'); return; }

    showSendOTPConfirm('Hủy đơn hàng', 'Đơn hàng sau khi hủy sẽ không thể khôi phục.', phone, () => {
        confirmCancelOrder(orderId);
    });
};
    showToast('Vui lòng liên hệ Hotline: 0987 654 321 để yêu cầu đổi trả.', 'info');
};

// ── Bước 1: Xác nhận hành động (Đồng ý → tự gửi OTP) ────────────────────
function showActionConfirm(title, desc, phone, onConfirm) {
    const existing = document.getElementById('rg-action-confirm-modal');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'rg-action-confirm-modal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${esc(title)}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-0">${esc(desc)}</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Huỷ bỏ</button>
                    <button type="button" class="btn-cta" id="rg-action-confirm-btn">Đồng ý</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    document.getElementById('rg-action-confirm-btn').addEventListener('click', () => {
        modal.hide();
        // Sau khi đồng ý → tự động gửi OTP (không cần user nhấn "Gửi OTP" nữa)
        showOTPModal(phone, onConfirm);
    });
}

// ── Bước 2: Xác nhận gửi OTP (dùng cho hủy đơn hàng) ────────────────────
function showSendOTPConfirm(title, desc, phone, onConfirm) {
    const existing = document.getElementById('rg-send-otp-modal');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'rg-send-otp-modal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">${esc(title)}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="mb-1">${esc(desc)}</p>
                    <p class="text-muted small">Để xác nhận, PawPal sẽ gửi mã OTP đến số <strong>${esc(phone)}</strong>.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Huỷ bỏ</button>
                    <button type="button" class="btn-cta" id="rg-send-otp-btn">Gửi OTP</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    document.getElementById('rg-send-otp-btn').addEventListener('click', () => {
        modal.hide();
        showOTPModal(phone, onConfirm);
    });
}

// ── OTP Modal ─────────────────────────────────────────────────────────────
function showOTPModal(phone, onSuccess) {
    const existing = document.getElementById('rg-otp-modal');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'rg-otp-modal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Xác thực số điện thoại</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body text-center py-4">
                    <p class="text-muted small mb-4">Mã OTP 6 số đã được gửi đến <strong>${esc(phone)}</strong>.<br><span class="text-muted" style="font-size:0.8rem">(Mã test: 555666)</span></p>
                    <div class="otp-inputs-wrapper mb-3">
                        ${Array.from({length:6}, (_,i) =>
                            `<input type="text" class="otp-input" maxlength="1" pattern="[0-9]" inputmode="numeric"${i>0?' disabled':''}>`
                        ).join('')}
                    </div>
                    <div class="text-danger small d-none" id="rg-otp-error">Mã OTP không đúng, vui lòng thử lại.</div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Huỷ</button>
                    <button type="button" class="btn-cta" id="rg-otp-confirm" disabled>Xác nhận</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    const inputs = el.querySelectorAll('.otp-input');
    const confirmBtn = document.getElementById('rg-otp-confirm');
    const errorEl = document.getElementById('rg-otp-error');

    // Auto-focus và navigate giữa các ô
    inputs.forEach((input, idx) => {
        input.addEventListener('input', () => {
            input.value = input.value.replace(/\D/g, '').slice(0, 1);
            errorEl.classList.add('d-none');
            inputs.forEach(i => i.classList.remove('otp-error'));

            if (input.value && idx < 5) {
                inputs[idx + 1].disabled = false;
                inputs[idx + 1].focus();
            }

            // Kiểm tra đủ 6 số
            const code = [...inputs].map(i => i.value).join('');
            confirmBtn.disabled = code.length < 6;
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && idx > 0) {
                inputs[idx - 1].focus();
                inputs[idx - 1].value = '';
                if (idx > 0) inputs[idx].disabled = true;
                confirmBtn.disabled = true;
            }
        });
    });

    confirmBtn.addEventListener('click', () => {
        const code = [...inputs].map(i => i.value).join('');
        if (code === '555666') {
            modal.hide();
            onSuccess();
        } else {
            inputs.forEach(i => i.classList.add('otp-error'));
            errorEl.classList.remove('d-none');
        }
    });
}

// ── Cancel Booking Modal ──────────────────────────────────────────────────
function showCancelConfirmModal(bookingId, phone) {
    const existing = document.getElementById('rg-cancel-modal');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.id = 'rg-cancel-modal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Xác nhận hủy lịch hẹn</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Bạn có chắc muốn hủy lịch hẹn <strong>${esc(bookingId)}</strong>?</p>
                    <p class="text-muted small">Lịch đã hủy sẽ không thể khôi phục.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Quay lại</button>
                    <button type="button" class="btn-cta" id="rg-cancel-confirm">Xác nhận hủy</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    document.getElementById('rg-cancel-confirm').addEventListener('click', () => {
        modal.hide();
        confirmCancelBooking(bookingId);
        showUpsellModal(phone);
    });
}

function confirmCancelBooking(bookingId) {
    const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
    const idx = bookings.findIndex(b => b.id === bookingId);
    if (idx !== -1) {
        bookings[idx].status = 'cancelled';
        bookings[idx].cancelCount = (bookings[idx].cancelCount || 0) + 1;
        localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
    }
    showToast('Đã hủy lịch hẹn thành công!', 'success');
    // Re-search để cập nhật UI
    setTimeout(() => document.getElementById('rg-form').dispatchEvent(new Event('submit')), 1000);
}

// ── Cancel Order ──────────────────────────────────────────────────────────
function confirmCancelOrder(orderId) {
    const orders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
        orders[idx].status = 'cancelled';
        localStorage.setItem('pawpal_orders', JSON.stringify(orders));
    }
    showToast('Đã hủy đơn hàng thành công!', 'success');
    setTimeout(() => document.getElementById('rg-form').dispatchEvent(new Event('submit')), 1000);
}

// ── Change Schedule Modal ─────────────────────────────────────────────────
function showChangeScheduleModal(bookingId, phone) {
    const existing = document.getElementById('rg-change-modal');
    if (existing) existing.remove();

    const slots = (window.PawPalBookingConfig?.slots) || [
        '08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00'
    ];
    const staffs = (window.PawPalBookingConfig?.staffs) || [
        { name: 'Phân bổ ngẫu nhiên', desc: 'PawPal tự động chọn nhân viên trống lịch', id: 'random' },
        { name: 'Nguyễn Minh An',     desc: 'Chuyên viên Spa • 3 năm kinh nghiệm',      id: 'staff1' },
        { name: 'Trần An Nhiên',      desc: 'Bảo mẫu Hotel • Cực kỳ nhẹ nhàng',         id: 'staff2' },
        { name: 'Lê Hoàng Tiến',     desc: 'Chuyên viên cắt tỉa Grooming',              id: 'staff3' }
    ];

    // Disabled cho đến khi chọn ngày
    const slotsHtml = slots.map(s =>
        `<button class="rg-slot-time" data-time="${s}" disabled style="opacity:0.4;cursor:not-allowed;">${s}</button>`
    ).join('');

    const staffHtml = staffs.map(s => {
        const initials = s.name === 'Phân bổ ngẫu nhiên' ? '🎲' : s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return `
            <div class="rg-staff-card" data-name="${s.name}" tabindex="-1" role="button"
                style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;cursor:not-allowed;opacity:0.4;transition:all .2s;pointer-events:none;">
                <div style="width:36px;height:36px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;color:#2e7d32;flex-shrink:0;">${initials}</div>
                <div>
                    <div style="font-weight:700;font-size:0.88rem;color:#2e7d32;">${s.name}</div>
                    <div style="font-size:0.75rem;color:#64748b;">${s.desc}</div>
                </div>
            </div>`;
    }).join('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    const el = document.createElement('div');
    el.id = 'rg-change-modal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Chọn lịch mới — ${esc(bookingId)}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p class="text-muted small mb-3">Chọn ngày trước, sau đó chọn giờ và nhân viên.</p>

                    <div class="mb-1 fw-semibold" style="font-size:0.88rem;">Chọn ngày</div>
                    <input type="date" id="rg-date-picker" class="form-control mb-4" min="${minDate}" style="max-width:220px;">

                    <div class="mb-1 fw-semibold" style="font-size:0.88rem;">Chọn giờ</div>
                    <div class="rg-time-grid mb-3" id="rg-slot-grid">${slotsHtml}</div>
                    <div id="rg-hold-banner" class="d-none mb-3" style="font-size:0.82rem;padding:8px 12px;background:#fff8e1;border:1px solid #ffe082;border-radius:8px;color:#7a5c00;">
                        ⏳ <strong>Giữ chỗ tạm thời:</strong> Giờ <strong id="rg-hold-label"></strong> được giữ riêng cho bạn trong <strong id="rg-hold-countdown"></strong>
                    </div>

                    <div class="mb-1 fw-semibold" style="font-size:0.88rem;">Chọn nhân viên</div>
                    <div id="rg-staff-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-bottom:12px;">${staffHtml}</div>

                    <div class="rg-slot-selected mt-2 d-none" id="rg-slot-info" style="font-size:0.85rem;color:#2e7d32;display:flex;align-items:center;gap:6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Đã chọn: <strong id="rg-slot-text"></strong>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Huỷ</button>
                    <button type="button" class="btn-cta" id="rg-change-confirm" disabled>Xác nhận đổi lịch</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    let selDate = '', selTime = null, selStaff = null;
    let holdInterval = null;

    function clearHoldTimer() {
        if (holdInterval) { clearInterval(holdInterval); holdInterval = null; }
        document.getElementById('rg-hold-banner').classList.add('d-none');
    }

    function startHoldTimer(slot) {
        clearHoldTimer();
        let remaining = 15 * 60;
        const banner    = document.getElementById('rg-hold-banner');
        const label     = document.getElementById('rg-hold-label');
        const countdown = document.getElementById('rg-hold-countdown');
        label.textContent = slot;
        banner.style.background = '#fff8e1';
        banner.style.borderColor = '#ffe082';
        banner.classList.remove('d-none');

        function tick() {
            const m = Math.floor(remaining / 60).toString().padStart(2, '0');
            const s = (remaining % 60).toString().padStart(2, '0');
            countdown.textContent = `${m}:${s}`;
            if (remaining <= 0) {
                clearHoldTimer();
                selTime = null;
                el.querySelectorAll('.rg-slot-time').forEach(b => b.classList.remove('active'));
                banner.innerHTML = `⚠️ <strong>Hết thời gian giữ chỗ!</strong> Vui lòng chọn lại giờ.`;
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

    el.addEventListener('hidden.bs.modal', () => clearHoldTimer());

    function enableTimeAndStaff() {
        el.querySelectorAll('.rg-slot-time').forEach(b => {
            b.disabled = false;
            b.style.opacity = '';
            b.style.cursor = '';
        });
        el.querySelectorAll('.rg-staff-card').forEach(c => {
            c.style.opacity = '';
            c.style.cursor = '';
            c.style.pointerEvents = '';
            c.tabIndex = 0;
        });
    }

    function refresh() {
        const info = document.getElementById('rg-slot-info');
        const txt  = document.getElementById('rg-slot-text');
        const btn  = document.getElementById('rg-change-confirm');
        if (selDate && selTime && selStaff) {
            const d = new Date(selDate + 'T00:00:00');
            txt.textContent = `${d.toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' })} lúc ${selTime} • ${selStaff}`;
            info.classList.remove('d-none');
            btn.disabled = false;
        } else {
            info.classList.add('d-none');
            btn.disabled = true;
        }
    }

    document.getElementById('rg-date-picker').addEventListener('change', (e) => {
        selDate = e.target.value;
        selTime = null;
        clearHoldTimer();
        el.querySelectorAll('.rg-slot-time').forEach(b => b.classList.remove('active'));
        enableTimeAndStaff();
        refresh();
    });

    el.querySelectorAll('.rg-slot-time').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!selDate) return;
            el.querySelectorAll('.rg-slot-time').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selTime = btn.dataset.time;
            startHoldTimer(selTime);
            refresh();
        });
    });

    el.querySelectorAll('.rg-staff-card').forEach(card => {
        card.addEventListener('click', () => {
            if (!selDate) return;
            el.querySelectorAll('.rg-staff-card').forEach(c => {
                c.style.borderColor = '#e2e8f0';
                c.style.background = '';
            });
            card.style.borderColor = '#4caf50';
            card.style.background = '#e8f5e9';
            selStaff = card.dataset.name;
            refresh();
        });
    });

    document.getElementById('rg-change-confirm').addEventListener('click', () => {
        if (!selDate || !selTime || !selStaff) return;
        clearHoldTimer();
        const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const idx = bookings.findIndex(b => b.id === bookingId);
        if (idx !== -1) {
            bookings[idx].date = selDate;
            bookings[idx].time = selTime;
            bookings[idx].timeStart = selTime;
            bookings[idx].staff = selStaff;
            bookings[idx].changeCount = (bookings[idx].changeCount || 0) + 1;
            localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
        }
        modal.hide();
        showToast('Đã đổi lịch hẹn thành công!', 'success');
        showUpsellModal(phone);
        setTimeout(() => document.getElementById('rg-form').dispatchEvent(new Event('submit')), 1200);
    });
}
    const staffs = (window.PawPalBookingConfig?.staffs) || [
        { name: 'Phân bổ ngẫu nhiên', desc: 'PawPal tự động chọn nhân viên trống lịch', id: 'random' },
        { name: 'Nguyễn Minh An',     desc: 'Chuyên viên Spa • 3 năm kinh nghiệm',      id: 'staff1' },
        { name: 'Trần An Nhiên',      desc: 'Bảo mẫu Hotel • Cực kỳ nhẹ nhàng',         id: 'staff2' },
        { name: 'Lê Hoàng Tiến',     desc: 'Chuyên viên cắt tỉa Grooming',              id: 'staff3' }
    ];

    const dayTabsHtml = days.map((d, i) =>
        `<button class="rg-slot-day${i === 0 ? ' active' : ''}" data-idx="${i}">
            ${d.toLocaleDateString('vi-VN', { weekday:'short', day:'2-digit', month:'2-digit' })}
        </button>`
    ).join('');

    const slotsHtml = slots.map(s =>
        `<button class="rg-slot-time" data-time="${s}">${s}</button>`
    ).join('');

    const staffHtml = staffs.map(s => {
        const initials = s.name === 'Phân bổ ngẫu nhiên' ? '🎲' : s.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        return `
            <div class="rg-staff-card" data-name="${s.name}" tabindex="0" role="button" style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:10px;cursor:pointer;transition:all .2s;">
                <div style="width:36px;height:36px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.85rem;color:#2e7d32;flex-shrink:0;">${initials}</div>
                <div>
                    <div style="font-weight:700;font-size:0.88rem;color:#2e7d32;">${s.name}</div>
                    <div style="font-size:0.75rem;color:#64748b;">${s.desc}</div>
                </div>
            </div>`;
    }).join('');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    const el = document.createElement('div');
    el.id = 'rg-change-modal';
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Chọn lịch mới — ${esc(bookingId)}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <div class="mb-1 fw-semibold" style="font-size:0.88rem;">Chọn ngày</div>
                    <input type="date" id="rg-date-picker" class="form-control mb-4" min="${minDate}" style="max-width:220px;">

                    <div class="mb-1 fw-semibold" style="font-size:0.88rem;">Chọn giờ</div>
                    <div class="rg-time-grid mb-4">${slotsHtml}</div>

                    <div class="mb-1 fw-semibold" style="font-size:0.88rem;">Chọn nhân viên</div>
                    <div id="rg-staff-list" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-bottom:12px;">${staffHtml}</div>

                    <div class="rg-slot-selected mt-2 d-none" id="rg-slot-info" style="font-size:0.85rem;color:#2e7d32;display:flex;align-items:center;gap:6px;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                        Đã chọn: <strong id="rg-slot-text"></strong>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-green-outline" data-bs-dismiss="modal">Huỷ</button>
                    <button type="button" class="btn-cta" id="rg-change-confirm" disabled>Xác nhận đổi lịch</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const modal = new bootstrap.Modal(el);
    modal.show();

    let selDate = '', selTime = null, selStaff = null;

    function refresh() {
        const info = document.getElementById('rg-slot-info');
        const txt  = document.getElementById('rg-slot-text');
        const btn  = document.getElementById('rg-change-confirm');
        if (selDate && selTime && selStaff) {
            const d = new Date(selDate + 'T00:00:00');
            const dateLabel = d.toLocaleDateString('vi-VN', { weekday:'long', day:'2-digit', month:'2-digit', year:'numeric' });
            txt.textContent = `${dateLabel} lúc ${selTime} • ${selStaff}`;
            info.classList.remove('d-none');
            btn.disabled = false;
        } else {
            info.classList.add('d-none');
            btn.disabled = true;
        }
    }

    document.getElementById('rg-date-picker').addEventListener('change', (e) => {
        selDate = e.target.value;
        selTime = null;
        el.querySelectorAll('.rg-slot-time').forEach(b => b.classList.remove('active'));
        refresh();
    });

    el.querySelectorAll('.rg-slot-time').forEach(btn => {
        btn.addEventListener('click', () => {
            el.querySelectorAll('.rg-slot-time').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selTime = btn.dataset.time;
            refresh();
        });
    });

    el.querySelectorAll('.rg-staff-card').forEach(card => {
        card.addEventListener('click', () => {
            el.querySelectorAll('.rg-staff-card').forEach(c => {
                c.style.borderColor = '#e2e8f0';
                c.style.background = '';
            });
            card.style.borderColor = '#4caf50';
            card.style.background = '#e8f5e9';
            selStaff = card.dataset.name;
            refresh();
        });
    });

    document.getElementById('rg-change-confirm').addEventListener('click', () => {
        if (!selDate || !selTime || !selStaff) return;
        const bookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        const idx = bookings.findIndex(b => b.id === bookingId);
        if (idx !== -1) {
            bookings[idx].date = selDate;
            bookings[idx].time = selTime;
            bookings[idx].timeStart = selTime;
            bookings[idx].staff = selStaff;
            bookings[idx].changeCount = (bookings[idx].changeCount || 0) + 1;
            localStorage.setItem('pawpal_bookings', JSON.stringify(bookings));
        }
        modal.hide();
        showToast('Đã đổi lịch hẹn thành công!', 'success');
        showUpsellModal(phone);
        setTimeout(() => document.getElementById('rg-form').dispatchEvent(new Event('submit')), 1200);
    });
}

// ── Upsell mật khẩu ───────────────────────────────────────────────────────
function showUpsellModal(phone) {
    setTimeout(() => {
        const existing = document.getElementById('rg-upsell-modal');
        if (existing) existing.remove();

        const el = document.createElement('div');
        el.id = 'rg-upsell-modal';
        el.className = 'modal fade';
        el.tabIndex = -1;
        el.setAttribute('data-bs-backdrop', 'static');
        el.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body text-center py-4 px-4">
                        <div style="font-size:2.2rem;margin-bottom:12px">🐾</div>
                        <h5 class="fw-bold mb-2" style="color:var(--color-primary-dark)">Thao tác thành công!</h5>
                        <p class="text-muted mb-4">Thiết lập mật khẩu để quản lý lịch hẹn, tích điểm Paw Points và nhận nhiều ưu đãi thành viên.</p>
                        <div class="d-flex flex-column gap-2">
                            <button class="btn-cta w-100" id="rg-upsell-setup">Thiết lập mật khẩu ngay</button>
                            <button class="btn-green-outline w-100" id="rg-upsell-skip">Bỏ qua</button>
                        </div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(el);

        const modal = new bootstrap.Modal(el);
        modal.show();

        document.getElementById('rg-upsell-setup').addEventListener('click', () => {
            window.location.href = `/pages/public/login/login.html`;
        });
        document.getElementById('rg-upsell-skip').addEventListener('click', () => {
            modal.hide();
            window.location.href = '/pages/public/return-guest/return-guest.html';
        });
    }, 800);
}

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const t = document.createElement('div');
    t.className = `toast-custom toast-${type}`;
    t.innerHTML = `<div class="toast-content"><span class="toast-message">${msg}</span></div>`;
    container.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 4000);
}
