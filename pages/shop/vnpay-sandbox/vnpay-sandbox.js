// ==========================================================================
// CỔNG THANH TOÁN VNPAY SANDBOX - SCRIPT
// ==========================================================================

const VNPAY_BANKS = [
    { code: 'VCB', name: 'Vietcombank', fullName: 'Ngân hàng TMCP Ngoại thương VN' },
    { code: 'BIDV', name: 'BIDV', fullName: 'Ngân hàng TMCP Đầu tư và Phát triển VN' },
    { code: 'CTG', name: 'VietinBank', fullName: 'Ngân hàng TMCP Công thương VN' },
    { code: 'VBA', name: 'Agribank', fullName: 'Ngân hàng Nông nghiệp và PTNT VN' },
    { code: 'TCB', name: 'Techcombank', fullName: 'Ngân hàng TMCP Kỹ thương VN' },
    { code: 'MB', name: 'MBBank', fullName: 'Ngân hàng TMCP Quân đội' },
    { code: 'ACB', name: 'ACB', fullName: 'Ngân hàng TMCP Á Châu' },
    { code: 'VPB', name: 'VPBank', fullName: 'Ngân hàng TMCP Việt Nam Thịnh Vượng' },
    { code: 'TPB', name: 'TPBank', fullName: 'Ngân hàng TMCP Tiên Phong' },
    { code: 'STB', name: 'Sacombank', fullName: 'Ngân hàng TMCP Sài Gòn Thương Tín' },
    { code: 'HDB', name: 'HDBank', fullName: 'Ngân hàng TMCP Phát triển TP.HCM' },
    { code: 'VIB', name: 'VIB', fullName: 'Ngân hàng TMCP Quốc tế VN' }
];

let vnpayState = {
    orderId: null,
    order: null,
    amount: 0,
    timerInterval: null,
    selectedBank: null
};

document.addEventListener('DOMContentLoaded', () => {
    initVNPAY();
    setupTabs();
    renderBanks();
    setupForms();
    setupSandboxDock();
});

function initVNPAY() {
    const urlParams = new URLSearchParams(window.location.search);
    vnpayState.orderId = urlParams.get('orderId');
    const paramAmount = Number(urlParams.get('amount')) || 0;

    // Tìm order trong pawpal_orders hoặc pawpal_current_order
    const localOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
    let currentOrder = null;
    if (vnpayState.orderId) {
        currentOrder = localOrders.find(o => String(o.id) === String(vnpayState.orderId));
    }
    if (!currentOrder) {
        const cached = JSON.parse(localStorage.getItem('pawpal_current_order') || 'null');
        if (cached && (String(cached.orderId) === String(vnpayState.orderId) || String(cached.id) === String(vnpayState.orderId))) {
            currentOrder = cached;
        }
    }

    vnpayState.order = currentOrder;
    if (currentOrder) {
        vnpayState.orderId = currentOrder.id || currentOrder.orderId || vnpayState.orderId;
        vnpayState.amount = currentOrder.pricing?.total || currentOrder.pricing?.grandTotal || paramAmount;
    } else {
        vnpayState.orderId = vnpayState.orderId || `ORD-${Date.now()}`;
        vnpayState.amount = paramAmount || 450000;
    }

    // Hiển thị thông tin
    document.getElementById('display-order-id').textContent = vnpayState.orderId;
    document.getElementById('display-order-amount').textContent = formatVND(vnpayState.amount);
    document.getElementById('display-order-desc').textContent = `Thanh toán đơn hàng #${vnpayState.orderId} tại PawPal`;

    const qrAmountText = document.getElementById('vnpay-qr-amount-text');
    if (qrAmountText) {
        qrAmountText.textContent = formatVND(vnpayState.amount);
    }

    // Sinh mã QR VNPAY chân thực
    const qrImg = document.getElementById('vnpay-qr-img');
    if (qrImg) {
        // 1. Tạo ngay mã QR canvas sắc nét có logo VNPAY trung tâm
        qrImg.src = generateMockQRCode(vnpayState.orderId, vnpayState.amount);

        // 2. Thử nạp mã QR thực tế để camera điện thoại có thể nhận diện được
        const qrPayload = `https://vnpay.vn/pay?orderId=${encodeURIComponent(vnpayState.orderId)}&amount=${vnpayState.amount}&merchant=PAWPAL`;
        const onlineApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&margin=2&color=005baa&data=${encodeURIComponent(qrPayload)}`;
        
        const onlineImg = new Image();
        onlineImg.crossOrigin = 'anonymous';
        onlineImg.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = 260;
                c.height = 260;
                const ctx = c.getContext('2d');
                ctx.drawImage(onlineImg, 0, 0, 260, 260);
                drawVNPAYCenterLogo(ctx, 260);
                qrImg.src = c.toDataURL('image/png');
            } catch (e) {
                // Giữ nguyên canvas chất lượng cao nếu có lỗi cross-origin
            }
        };
        onlineImg.src = onlineApiUrl;
    }

    // Khởi động đồng hồ đếm ngược 15 phút
    startVNPAYTimer();

    // Nút hủy
    const btnCancel = document.getElementById('btn-cancel-vnpay');
    if (btnCancel) {
        btnCancel.addEventListener('click', handleCancelPayment);
    }
}

function startVNPAYTimer() {
    let expiryTimestamp = null;
    if (vnpayState.order?.paymentExpiry) {
        expiryTimestamp = new Date(vnpayState.order.paymentExpiry).getTime();
    } else {
        expiryTimestamp = Date.now() + 15 * 60 * 1000;
    }

    const timerEl = document.getElementById('vnpay-timer');

    const tick = () => {
        const diff = expiryTimestamp - Date.now();
        if (diff <= 0) {
            clearInterval(vnpayState.timerInterval);
            if (timerEl) timerEl.textContent = '00:00';
            alert('Thời hạn giao dịch VNPAY đã kết thúc. Đơn hàng đã tự động hủy.');
            expireCurrentOrder();
            window.location.href = '/pages/user/#orders?status=cancelled';
        } else {
            const sec = Math.floor(diff / 1000);
            const m = Math.floor(sec / 60);
            const s = sec % 60;
            if (timerEl) {
                timerEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
        }
    };

    tick();
    vnpayState.timerInterval = setInterval(tick, 1000);
}

function expireCurrentOrder() {
    if (!vnpayState.orderId) return;
    const localOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
    const idx = localOrders.findIndex(o => String(o.id) === String(vnpayState.orderId));
    if (idx !== -1) {
        localOrders[idx].status = 'cancelled';
        localOrders[idx].paymentStatus = 'expired';
        localOrders[idx].cancelReason = 'Quá thời hạn thanh toán VNPAY (15 phút)';
        localStorage.setItem('pawpal_orders', JSON.stringify(localOrders));
    }
}

/* ==========================================================================
   Tabs Management
   ========================================================================== */
function setupTabs() {
    const tabBtns = document.querySelectorAll('.vnpay-tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.vnpay-tab-content').forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}

/* ==========================================================================
   Tab 1: VNPAY-QR
   ========================================================================== */
document.getElementById('btn-simulate-qr-success')?.addEventListener('click', () => {
    handlePaymentSuccess('00');
});

/* ==========================================================================
   Tab 2: ATM Cards & Bank Grid
   ========================================================================== */
function renderBanks() {
    const container = document.getElementById('bank-selection-grid');
    if (!container) return;

    container.innerHTML = VNPAY_BANKS.map(bank => `
        <div class="bank-card-item" data-code="${bank.code}">
            <span class="bank-badge">${bank.code}</span>
            <span class="bank-title">${bank.name}</span>
            <span class="bank-sub">${bank.code}</span>
        </div>
    `).join('');

    container.querySelectorAll('.bank-card-item').forEach(card => {
        card.addEventListener('click', () => {
            const code = card.getAttribute('data-code');
            const bank = VNPAY_BANKS.find(b => b.code === code);
            selectBank(bank);
        });
    });
}

function selectBank(bank) {
    if (!bank) return;
    vnpayState.selectedBank = bank;

    document.getElementById('atm-step-select-bank').classList.add('d-none');
    document.getElementById('atm-step-card-info').classList.remove('d-none');
    document.getElementById('atm-step-otp').classList.add('d-none');

    document.getElementById('card-bank-code').textContent = bank.code;
    document.getElementById('card-bank-name').textContent = bank.fullName;
}

document.getElementById('btn-change-bank')?.addEventListener('click', () => {
    document.getElementById('atm-step-select-bank').classList.remove('d-none');
    document.getElementById('atm-step-card-info').classList.add('d-none');
    document.getElementById('atm-step-otp').classList.add('d-none');
});

// Điền nhanh thông tin thẻ ATM test
document.getElementById('btn-quick-fill-atm')?.addEventListener('click', () => {
    document.getElementById('atm-card-number').value = '9704 1985 2619 1432';
    document.getElementById('atm-card-holder').value = 'NGUYEN VAN A';
    document.getElementById('atm-issue-date').value = '07/15';
});

// Form ATM Submit -> qua bước OTP
document.getElementById('atm-card-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const cardNum = document.getElementById('atm-card-number').value.trim();
    if (!cardNum) {
        alert('Vui lòng nhập số thẻ');
        return;
    }

    document.getElementById('atm-step-card-info').classList.add('d-none');
    document.getElementById('atm-step-otp').classList.remove('d-none');
    const otpInput = document.getElementById('otp-input');
    if (otpInput) {
        otpInput.value = '123456';
        otpInput.focus();
    }
});

document.getElementById('btn-back-to-card')?.addEventListener('click', () => {
    document.getElementById('atm-step-card-info').classList.remove('d-none');
    document.getElementById('atm-step-otp').classList.add('d-none');
});

document.getElementById('btn-confirm-otp')?.addEventListener('click', () => {
    const otp = document.getElementById('otp-input').value.trim();
    if (otp.length < 4) {
        alert('Vui lòng nhập mã OTP xác thực');
        return;
    }
    handlePaymentSuccess('00');
});

/* ==========================================================================
   Tab 3: International Cards
   ========================================================================== */
document.getElementById('btn-quick-fill-visa')?.addEventListener('click', () => {
    document.getElementById('intl-card-number').value = '4000 0012 3456 7890';
    document.getElementById('intl-card-holder').value = 'NGUYEN VAN A';
    document.getElementById('intl-expiry').value = '12/28';
    document.getElementById('intl-cvv').value = '123';
});

document.getElementById('intl-card-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    handlePaymentSuccess('00');
});

/* ==========================================================================
   Payment Handlers (Success, Failed, Cancel)
   ========================================================================== */
function handlePaymentSuccess(responseCode = '00') {
    const loadingOverlay = document.getElementById('vnpay-loading-overlay');
    const resultOverlay = document.getElementById('vnpay-result-overlay');
    const resultIcon = document.getElementById('result-icon');
    const resultIconWrapper = document.getElementById('result-icon-wrapper');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const btnReturn = document.getElementById('btn-return-merchant');

    if (loadingOverlay) loadingOverlay.classList.remove('d-none');

    setTimeout(() => {
        if (loadingOverlay) loadingOverlay.classList.add('d-none');

        const transactionNo = `VNP${Math.floor(10000000 + Math.random() * 90000000)}`;

        // Cập nhật đơn hàng thành công
        finalizeOrderPayment(vnpayState.orderId, 'paid', 'preparing', transactionNo);

        if (resultIconWrapper) resultIconWrapper.className = 'result-icon-wrapper';
        if (resultIcon) resultIcon.textContent = '✓';
        if (resultTitle) resultTitle.textContent = 'Giao dịch thành công!';
        if (resultMessage) {
            resultMessage.innerHTML = `
                Mã giao dịch VNPAY: <strong>#${transactionNo}</strong><br>
                Số tiền: <strong>${formatVND(vnpayState.amount)}</strong><br>
                Trạng thái: <strong>Đã thanh toán (Mã phản hồi: ${responseCode})</strong>
            `;
        }

        if (resultOverlay) resultOverlay.classList.remove('d-none');

        const returnUrl = `/payment-success?orderId=${vnpayState.orderId}&vnp_ResponseCode=${responseCode}&vnp_TransactionNo=${transactionNo}`;

        if (btnReturn) {
            btnReturn.onclick = () => {
                window.location.href = returnUrl;
            };
        }

        setTimeout(() => {
            window.location.href = returnUrl;
        }, 2200);

    }, 1500);
}

function handlePaymentFailed(responseCode = '51', errorMsg = 'Tài khoản không đủ số dư để thực hiện giao dịch') {
    const loadingOverlay = document.getElementById('vnpay-loading-overlay');
    const resultOverlay = document.getElementById('vnpay-result-overlay');
    const resultIcon = document.getElementById('result-icon');
    const resultIconWrapper = document.getElementById('result-icon-wrapper');
    const resultTitle = document.getElementById('result-title');
    const resultMessage = document.getElementById('result-message');
    const btnReturn = document.getElementById('btn-return-merchant');

    if (loadingOverlay) loadingOverlay.classList.remove('d-none');

    setTimeout(() => {
        if (loadingOverlay) loadingOverlay.classList.add('d-none');

        if (resultIconWrapper) resultIconWrapper.className = 'result-icon-wrapper failed';
        if (resultIcon) resultIcon.textContent = '✗';
        if (resultTitle) resultTitle.textContent = 'Giao dịch không thành công';
        if (resultMessage) {
            resultMessage.innerHTML = `
                Mã lỗi: <strong>${responseCode}</strong><br>
                Lý do: <span class="text-danger">${errorMsg}</span><br>
                Đơn hàng của bạn vẫn được giữ ở trạng thái <strong>Chờ thanh toán</strong> (15 phút).
            `;
        }

        if (resultOverlay) resultOverlay.classList.remove('d-none');

        if (btnReturn) {
            btnReturn.textContent = 'Thử lại / Quay về danh sách đơn';
            btnReturn.onclick = () => {
                window.location.href = `/pages/user/#orders?status=pending_payment`;
            };
        }
    }, 1200);
}

function finalizeOrderPayment(orderId, paymentStatus, orderStatus, transactionNo) {
    if (!orderId) return;

    try {
        const localOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
        const idx = localOrders.findIndex(o => String(o.id) === String(orderId));

        const timelineSuccess = {
            status: 'paid',
            title: 'Thanh toán thành công qua VNPAY',
            description: `Giao dịch VNPAY thành công. Mã giao dịch: #${transactionNo}`,
            timestamp: new Date().toISOString()
        };

        if (idx !== -1) {
            localOrders[idx].paymentStatus = paymentStatus;
            localOrders[idx].status = orderStatus;
            localOrders[idx].paymentMethod = 'vnpay';
            localOrders[idx].vnpayTransactionNo = transactionNo;
            if (!Array.isArray(localOrders[idx].timeline)) localOrders[idx].timeline = [];
            localOrders[idx].timeline.push(timelineSuccess);

            localStorage.setItem('pawpal_orders', JSON.stringify(localOrders));
        }

        // Cập nhật current order nếu có
        let currentOrder = JSON.parse(localStorage.getItem('pawpal_current_order') || 'null');
        if (currentOrder && (String(currentOrder.orderId) === String(orderId) || String(currentOrder.id) === String(orderId))) {
            currentOrder.paymentStatus = paymentStatus;
            currentOrder.status = orderStatus;
            currentOrder.vnpayTransactionNo = transactionNo;
            localStorage.setItem('pawpal_current_order', JSON.stringify(currentOrder));
        } else if (!currentOrder) {
            const fallbackOrder = {
                orderId: orderId,
                id: orderId,
                shipping: {
                    name: 'Khách hàng thử nghiệm',
                    phone: '0901234567',
                    address: '123 Đường Test Sandbox VNPay',
                    district: 'Quận 1',
                    city: 'TP. Hồ Chí Minh'
                },
                payment: {
                    method: 'vnpay',
                    status: paymentStatus
                },
                paymentStatus: paymentStatus,
                status: orderStatus,
                vnpayTransactionNo: transactionNo,
                pricing: {
                    grandTotal: vnpayState.amount || 350000,
                    subtotal: vnpayState.amount || 350000,
                    shippingFee: 0,
                    discount: 0
                },
                items: [
                    { id: 'mock-1', name: 'Đơn hàng mô phỏng VNPAY Sandbox', quantity: 1, price: vnpayState.amount || 350000 }
                ]
            };
            localStorage.setItem('pawpal_current_order', JSON.stringify(fallbackOrder));
        }
    } catch (e) {
        console.error('Lỗi lưu đơn hàng sau khi thanh toán VNPAY:', e);
    }
}

function handleCancelPayment() {
    const isConfirmed = confirm('Bạn có muốn hủy giao dịch VNPAY? Đơn hàng vẫn được lưu ở trạng thái "Chờ thanh toán" (thời hạn 15 phút) tại mục Đơn hàng của bạn.');
    if (isConfirmed) {
        window.location.href = '/pages/user/#orders?status=pending_payment';
    }
}

/* ==========================================================================
   Sandbox Quick Dock Controls
   ========================================================================== */
function setupSandboxDock() {
    document.getElementById('btn-quick-success')?.addEventListener('click', () => {
        handlePaymentSuccess('00');
    });

    document.getElementById('btn-quick-fail')?.addEventListener('click', () => {
        handlePaymentFailed('51', 'Số dư tài khoản không đủ để thanh toán');
    });
}

/* ==========================================================================
   Utilities
   ========================================================================== */
function formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

function roundRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}

function drawVNPAYCenterLogo(ctx, size) {
    const badgeSize = Math.round(size * 0.26);
    const badgeX = (size - badgeSize) / 2;
    const badgeY = (size - badgeSize) / 2;

    // Nền trắng bo góc nổi bật
    ctx.save();
    ctx.shadowColor = 'rgba(0, 91, 170, 0.25)';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFFFFF';
    roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 8);
    ctx.fill();
    ctx.restore();

    // Viền xanh VNPAY
    ctx.strokeStyle = '#005BAA';
    ctx.lineWidth = 2;
    roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 8);
    ctx.stroke();

    // Logo VN (đỏ) PAY (xanh)
    ctx.font = `bold ${Math.round(badgeSize * 0.32)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const centerY = badgeY + badgeSize * 0.42;
    ctx.fillStyle = '#ED1C24';
    ctx.fillText('VN', badgeX + badgeSize * 0.32, centerY);
    ctx.fillStyle = '#005BAA';
    ctx.fillText('PAY', badgeX + badgeSize * 0.68, centerY);

    // Chữ QR nhỏ phía dưới
    ctx.fillStyle = '#005BAA';
    ctx.font = `bold ${Math.round(badgeSize * 0.20)}px sans-serif`;
    ctx.fillText('QR', badgeX + badgeSize * 0.5, badgeY + badgeSize * 0.74);
}

function generateMockQRCode(orderId, amount) {
    const size = 260;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Nền trắng
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    const modulesCount = 29; // Version 3 QR (29x29)
    const margin = 12;
    const moduleSize = (size - margin * 2) / modulesCount;

    function drawModule(r, c, color = '#005BAA') {
        ctx.fillStyle = color;
        ctx.fillRect(
            Math.round(margin + c * moduleSize),
            Math.round(margin + r * moduleSize),
            Math.ceil(moduleSize),
            Math.ceil(moduleSize)
        );
    }

    const grid = Array.from({ length: modulesCount }, () => Array(modulesCount).fill(null));

    // 1. Finder patterns (7x7) + Separator
    function addFinderPattern(startR, startC) {
        for (let r = -1; r <= 7; r++) {
            for (let c = -1; c <= 7; c++) {
                const gr = startR + r;
                const gc = startC + c;
                if (gr >= 0 && gr < modulesCount && gc >= 0 && gc < modulesCount) {
                    grid[gr][gc] = 0;
                }
            }
        }
        for (let r = 0; r < 7; r++) {
            for (let c = 0; c < 7; c++) {
                if (
                    r === 0 || r === 6 || c === 0 || c === 6 ||
                    (r >= 2 && r <= 4 && c >= 2 && c <= 4)
                ) {
                    grid[startR + r][startC + c] = 1;
                } else {
                    grid[startR + r][startC + c] = 0;
                }
            }
        }
    }

    addFinderPattern(0, 0);
    addFinderPattern(0, modulesCount - 7);
    addFinderPattern(modulesCount - 7, 0);

    // 2. Alignment pattern (5x5) at (20, 20)
    const alignR = 20;
    const alignC = 20;
    for (let r = -2; r <= 2; r++) {
        for (let c = -2; c <= 2; c++) {
            const gr = alignR + r;
            const gc = alignC + c;
            if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
                grid[gr][gc] = 1;
            } else {
                grid[gr][gc] = 0;
            }
        }
    }

    // 3. Timing patterns (row 6 & col 6)
    for (let i = 8; i < modulesCount - 8; i++) {
        if (grid[6][i] === null) grid[6][i] = (i % 2 === 0) ? 1 : 0;
        if (grid[i][6] === null) grid[i][6] = (i % 2 === 0) ? 1 : 0;
    }

    // 4. Dark module
    grid[modulesCount - 8][8] = 1;

    // 5. Vùng trung tâm dành cho logo VNPAY (chừa khoảng trống 9x9)
    const centerStart = 10;
    const centerEnd = 18;
    for (let r = centerStart; r <= centerEnd; r++) {
        for (let c = centerStart; c <= centerEnd; c++) {
            grid[r][c] = -1;
        }
    }

    // 6. Điền dữ liệu mã QR mật độ chuẩn (50/50)
    let seed = 0;
    const seedStr = String(orderId || 'VNPAY') + String(amount || '185000');
    for (let i = 0; i < seedStr.length; i++) {
        seed = ((seed << 5) - seed + seedStr.charCodeAt(i)) | 0;
    }

    function pseudoRandom() {
        seed = (seed * 9301 + 49297) % 233280;
        return seed / 233280;
    }

    for (let r = 0; r < modulesCount; r++) {
        for (let c = 0; c < modulesCount; c++) {
            if (grid[r][c] === null) {
                const mask = (r + c) % 2 === 0;
                const rnd = pseudoRandom() > 0.48;
                grid[r][c] = (mask ^ rnd) ? 1 : 0;
            }
        }
    }

    // Vẽ toàn bộ modules chuẩn màu xanh VNPAY
    for (let r = 0; r < modulesCount; r++) {
        for (let c = 0; c < modulesCount; c++) {
            if (grid[r][c] === 1) {
                drawModule(r, c, '#005BAA');
            }
        }
    }

    // 7. Vẽ Logo VNPAY ở giữa mã QR
    drawVNPAYCenterLogo(ctx, size);

    return canvas.toDataURL('image/png');
}
