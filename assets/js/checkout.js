/* ==========================================================================
   checkout.js — Xử lý trang thanh toán PawPal
   ========================================================================== */

const VALID_COUPONS = {
    'PAWPAL10': { type: 'percent',  value: 10, desc: 'Giảm 10%' },
    'MEMBER15': { type: 'percent',  value: 15, desc: 'Giảm 15%' },
    'SUMMER20': { type: 'percent',  value: 20, desc: 'Giảm 20%' },
    'FREESHIP': { type: 'shipping', value: 0,  desc: 'Miễn phí vận chuyển' },
};

let cart = [];
let appliedCoupon = null;
let orderData = {};
let paymentLock = false;

function formatPrice(num) {
    return num.toLocaleString('vi-VN') + 'đ';
}

function generateOrderCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'PP-';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function calcTotals(subtotal) {
    let discount = 0;
    let shippingCost = subtotal >= 300000 ? 0 : 30000;
    let discountLabel = '';
    if (appliedCoupon) {
        if (appliedCoupon.type === 'percent') {
            discount = Math.round(subtotal * appliedCoupon.value / 100);
            discountLabel = `Giảm ${appliedCoupon.value}% (${appliedCoupon.code})`;
        } else if (appliedCoupon.type === 'shipping') {
            shippingCost = 0;
            discountLabel = `Miễn ship (${appliedCoupon.code})`;
        }
    }
    return { discount, shippingCost, total: Math.max(0, subtotal - discount + shippingCost), discountLabel };
}

// ── Render order summary ──────────────────────────────────────────────────────
function renderOrderSummary() {
    if (cart.length === 0) {
        window.location.href = 'shop.html';
        return;
    }

    const itemsEl   = document.getElementById('orderItems');
    const subtotalEl = document.getElementById('summarySubtotal');
    const discountRow = document.getElementById('summaryDiscountRow');
    const discountLabelEl = document.getElementById('summaryDiscountLabel');
    const discountEl = document.getElementById('summaryDiscount');
    const shippingEl = document.getElementById('summaryShipping');
    const totalEl    = document.getElementById('summaryTotal');
    const pawPtsEl   = document.getElementById('pawPointsEarn');

    itemsEl.innerHTML = cart.map(item => `
        <div class="order-item">
            <img class="order-item-img" src="${item.img}" alt="${item.name}"
                 onerror="this.src='https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=52&h=52&fit=crop'">
            <div class="order-item-info">
                <p class="order-item-name">${item.name}</p>
                <p class="order-item-qty">x${item.qty} · ${item.brand || ''}</p>
            </div>
            <span class="order-item-price">${formatPrice(item.price * item.qty)}</span>
        </div>`).join('');

    const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const { discount, shippingCost, total, discountLabel } = calcTotals(subtotal);

    subtotalEl.textContent = formatPrice(subtotal);

    if (discount > 0) {
        discountRow.style.display = 'flex';
        discountLabelEl.textContent = discountLabel;
        discountEl.textContent = `-${formatPrice(discount)}`;
    } else if (appliedCoupon && appliedCoupon.type === 'shipping') {
        discountRow.style.display = 'flex';
        discountLabelEl.textContent = discountLabel;
        discountEl.textContent = 'Miễn phí 🎉';
    } else {
        discountRow.style.display = 'none';
    }

    shippingEl.textContent = shippingCost === 0 ? 'Miễn phí 🎉' : formatPrice(shippingCost);
    totalEl.textContent = formatPrice(total);
    const pawPoints = Math.floor(total / 1000);
    if (pawPtsEl) pawPtsEl.textContent = pawPoints.toLocaleString('vi-VN');
}

// ── Form validation ───────────────────────────────────────────────────────────
function validateField(inputId, errorId, check, message) {
    const input = document.getElementById(inputId);
    const err   = document.getElementById(errorId);
    if (!input) return true;
    const valid = check(input.value);
    input.classList.toggle('error', !valid);
    input.classList.toggle('valid', valid);
    if (err) err.textContent = valid ? '' : message;
    return valid;
}

function validateForm() {
    const nameOk = validateField('shipName', 'errName',
        v => v.trim().length >= 2, 'Vui lòng nhập họ và tên hợp lệ');
    const phoneOk = validateField('shipPhone', 'errPhone',
        v => /^0\d{9}$/.test(v.trim()), 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0');
    const provOk = validateField('shipProvince', 'errProvince',
        v => v !== '', 'Vui lòng chọn Tỉnh/Thành phố');
    const distOk = validateField('shipDistrict', 'errDistrict',
        v => v.trim().length >= 2, 'Vui lòng nhập Quận/Huyện');
    const addrOk = validateField('shipAddress', 'errAddress',
        v => v.trim().length >= 5, 'Vui lòng nhập địa chỉ chi tiết');
    return nameOk && phoneOk && provOk && distOk && addrOk;
}

function getFormData() {
    return {
        name:     document.getElementById('shipName').value.trim(),
        phone:    document.getElementById('shipPhone').value.trim(),
        province: document.getElementById('shipProvince').value,
        district: document.getElementById('shipDistrict').value.trim(),
        ward:     document.getElementById('shipWard').value.trim(),
        address:  document.getElementById('shipAddress').value.trim(),
        note:     document.getElementById('shipNote').value.trim(),
    };
}

function getSelectedPayment() {
    const checked = document.querySelector('input[name="payment"]:checked');
    return checked ? checked.value : 'COD';
}

function getSelectedOnlineMethod() {
    const checked = document.querySelector('input[name="onlineMethod"]:checked');
    return checked ? checked.value : 'QR';
}

// ── Show / hide pages ─────────────────────────────────────────────────────────
function showPage(id) {
    ['checkoutPage', 'processingPage', 'successPage', 'failurePage'].forEach(p => {
        const el = document.getElementById(p);
        if (el) el.style.display = p === id ? (p === 'checkoutPage' ? 'block' : 'flex') : 'none';
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Checkout submit ───────────────────────────────────────────────────────────
function handleCheckout() {
    if (paymentLock) return;
    if (!validateForm()) {
        showToast('Vui lòng điền đầy đủ thông tin giao hàng', 'warning');
        const firstErr = document.querySelector('.form-input.error');
        if (firstErr) firstErr.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    paymentLock = true;
    const submitBtn = document.getElementById('checkoutSubmitBtn');
    submitBtn.disabled = true;
    document.getElementById('submitBtnText').textContent = 'Đang xử lý...';

    const form     = getFormData();
    const method   = getSelectedPayment();
    const subtotal = cart.reduce((s, c) => s + c.price * c.qty, 0);
    const { discount, shippingCost, total } = calcTotals(subtotal);

    orderData = {
        code:       generateOrderCode(),
        method,
        onlineMethod: method === 'ONLINE' ? getSelectedOnlineMethod() : null,
        form,
        cart: [...cart],
        subtotal, discount, shippingCost, total,
        coupon: appliedCoupon,
        pawPoints: Math.floor(total / 1000),
        createdAt: new Date().toISOString(),
    };

    if (method === 'COD') {
        setTimeout(() => completeOrder(), 600);
    } else {
        // Online payment: show processing screen, then success
        showPage('processingPage');
        setTimeout(() => completeOrder(), 3500);
    }
}

function completeOrder() {
    // Save order to localStorage history
    const orders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
    orders.unshift(orderData);
    localStorage.setItem('pawpal_orders', JSON.stringify(orders));

    // Clear cart and coupon
    localStorage.removeItem('pawpal_cart');
    localStorage.removeItem('pawpal_coupon');

    // Show success page
    showPage('successPage');
    updateStepIndicator();
    renderSuccessPage();
}

function renderSuccessPage() {
    document.getElementById('orderCode').textContent = orderData.code;

    const addr = [
        orderData.form.address,
        orderData.form.ward,
        orderData.form.district,
        orderData.form.province
    ].filter(Boolean).join(', ');

    const methodLabel = orderData.method === 'COD'
        ? 'Thanh toán khi nhận hàng (COD)'
        : `Thanh toán trực tuyến (${orderData.onlineMethod || ''})`;

    document.getElementById('successOrderInfo').innerHTML = `
        <div class="success-info-row">
            <span class="success-info-label">Người nhận</span>
            <span class="success-info-value">${orderData.form.name} · ${orderData.form.phone}</span>
        </div>
        <div class="success-info-row">
            <span class="success-info-label">Địa chỉ giao</span>
            <span class="success-info-value">${addr}</span>
        </div>
        <div class="success-info-row">
            <span class="success-info-label">Thanh toán</span>
            <span class="success-info-value">${methodLabel}</span>
        </div>
        <div class="success-info-row">
            <span class="success-info-label">Tổng tiền</span>
            <span class="success-info-value" style="color:var(--color-primary);font-size:1rem;">${formatPrice(orderData.total)}</span>
        </div>`;

    // Paw Points
    if (orderData.pawPoints > 0) {
        document.getElementById('successPawPoints').style.display = 'flex';
        document.getElementById('earnedPoints').textContent = orderData.pawPoints.toLocaleString('vi-VN');
    }

    // Copy order code
    document.getElementById('copyOrderCode').addEventListener('click', () => {
        navigator.clipboard.writeText(orderData.code).then(() => {
            showToast(`✅ Đã sao chép mã đơn hàng ${orderData.code}`);
        }).catch(() => {
            showToast('Không thể sao chép — vui lòng sao chép thủ công');
        });
    });
}

function updateStepIndicator() {
    const stepCheckout = document.getElementById('stepCheckout');
    const stepDone     = document.getElementById('stepDone');
    if (stepCheckout) {
        stepCheckout.classList.remove('active');
        stepCheckout.classList.add('done');
        stepCheckout.querySelector('.step-dot').textContent = '✓';
    }
    if (stepDone) {
        stepDone.classList.add('active');
    }
}

// ── Payment method toggle ─────────────────────────────────────────────────────
function bindPaymentToggle() {
    document.querySelectorAll('input[name="payment"]').forEach(radio => {
        radio.addEventListener('change', () => {
            const isOnline = radio.value === 'ONLINE';
            const subMethods = document.getElementById('onlineSubMethods');
            if (subMethods) subMethods.style.display = isOnline ? 'flex' : 'none';
            const submitText = document.getElementById('submitBtnText');
            if (submitText) {
                submitText.textContent = isOnline ? 'Thanh toán ngay →' : 'Đặt hàng ngay →';
            }
        });
    });
}

// ── Real-time form validation on blur ────────────────────────────────────────
function bindFormValidation() {
    const fields = [
        ['shipName', 'errName', v => v.trim().length >= 2, 'Vui lòng nhập họ và tên'],
        ['shipPhone', 'errPhone', v => /^0\d{9}$/.test(v.trim()), 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0'],
        ['shipProvince', 'errProvince', v => v !== '', 'Vui lòng chọn Tỉnh/Thành phố'],
        ['shipDistrict', 'errDistrict', v => v.trim().length >= 2, 'Vui lòng nhập Quận/Huyện'],
        ['shipAddress', 'errAddress', v => v.trim().length >= 5, 'Vui lòng nhập địa chỉ chi tiết'],
    ];

    fields.forEach(([inputId, errorId, check, msg]) => {
        const input = document.getElementById(inputId);
        if (!input) return;
        input.addEventListener('blur', () => validateField(inputId, errorId, check, msg));
        input.addEventListener('input', () => {
            if (input.classList.contains('error')) validateField(inputId, errorId, check, msg);
        });
    });

    // Phone: only allow digits
    const phoneInput = document.getElementById('shipPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', () => {
            phoneInput.value = phoneInput.value.replace(/\D/g, '').slice(0, 10);
        });
    }
}

// ── Cart validation banner ────────────────────────────────────────────────────
function showCartValidation() {
    const banner = document.getElementById('cartValidationBanner');
    if (!banner) return;
    const issues = [];
    cart.forEach(item => {
        if (!item.price || item.price <= 0) issues.push(`"${item.name}" có giá không hợp lệ`);
        if (item.qty <= 0) issues.push(`"${item.name}" có số lượng không hợp lệ`);
    });
    if (issues.length > 0) {
        banner.style.display = 'block';
        banner.innerHTML = `⚠️ <strong>Lưu ý:</strong> ${issues.join('; ')}. Vui lòng quay lại <a href="shop.html">giỏ hàng</a> để kiểm tra.`;
    }
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
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3500);
}

// ── Init ──────────────────────────────────────────────────────────────────────
function init() {
    cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
    appliedCoupon = JSON.parse(localStorage.getItem('pawpal_coupon') || 'null');

    if (cart.length === 0) {
        window.location.href = 'shop.html';
        return;
    }

    renderOrderSummary();
    showCartValidation();
    bindPaymentToggle();
    bindFormValidation();

    // Submit
    const submitBtn = document.getElementById('checkoutSubmitBtn');
    if (submitBtn) submitBtn.addEventListener('click', handleCheckout);

    // Retry button
    const retryBtn = document.getElementById('retryPaymentBtn');
    if (retryBtn) {
        retryBtn.addEventListener('click', () => {
            paymentLock = false;
            const submitBtn2 = document.getElementById('checkoutSubmitBtn');
            if (submitBtn2) {
                submitBtn2.disabled = false;
                const method = getSelectedPayment();
                document.getElementById('submitBtnText').textContent =
                    method === 'ONLINE' ? 'Thanh toán ngay →' : 'Đặt hàng ngay →';
            }
            showPage('checkoutPage');
        });
    }

    // Back to cart
    const backToCartBtn = document.getElementById('backToCartBtn');
    if (backToCartBtn) {
        backToCartBtn.addEventListener('click', () => {
            window.location.href = 'shop.html';
        });
    }

    // Keyboard: Enter on form fields
    document.querySelectorAll('.form-input').forEach(input => {
        input.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                const all = Array.from(document.querySelectorAll('.form-input'));
                const next = all[all.indexOf(input) + 1];
                if (next) next.focus();
                else handleCheckout();
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', init);
