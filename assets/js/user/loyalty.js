/**
 * loyalty.js — Xử lý nghiệp vụ Ưu đãi và Thành viên (Quy trình 3.1.13)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Tải thông tin người dùng từ localStorage
    let currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
    
    // Nếu chưa đăng nhập, guard chuyển hướng
    if (!currentUser) {
        alert('Vui lòng đăng nhập để truy cập trang này.');
        window.location.href = '/pages/public/login.html';
        return;
    }

    // Mock data chi tiêu mặc định nếu chưa có
    if (currentUser.spend === undefined) {
        currentUser.spend = 5200000; // Mặc định 5.2 triệu để lên hạng Vàng demo
        localStorage.setItem('pawpal_current_user', JSON.stringify(currentUser));
    }

    // Đảm bảo đồng bộ points từ Users DB
    const users = JSON.parse(localStorage.getItem('pawpal_users_db') || '[]');
    const userInDb = users.find(u => u.phone === currentUser.phone);
    if (userInDb) {
        currentUser.points = userInDb.points;
        currentUser.is_temporary = userInDb.is_temporary;
        localStorage.setItem('pawpal_current_user', JSON.stringify(currentUser));
    }

    // Tải vouchers từ JSON file
    let vouchersMock = [];
    try {
        // Thử fetch từ absolute path
        const response = await fetch('/data/vouchers.json');
        console.log('Fetch vouchers.json:', response.status, response.ok);
        
        if (response.ok) {
            const vouchersData = await response.json();
            console.log('Loaded vouchers data:', vouchersData.length, 'items');
            
            // Transform từ format JSON sang format UI
            vouchersMock = vouchersData
                .filter(v => v.active) // Chỉ lấy những vouchers đang hoạt động
                .map((v, idx) => ({
                    id: `VOUCHER-${idx}`,
                    name: v.description.split(' - ')[0] || v.code,
                    value: v.type === 'fixed' 
                        ? `${new Intl.NumberFormat('vi-VN').format(v.value)}đ`
                        : v.type === 'percentage'
                        ? `Giảm ${v.value}% (Tối đa ${new Intl.NumberFormat('vi-VN').format(v.maxDiscount || 0)})`
                        : v.description,
                    pointsCost: Math.ceil(v.value / 1000) * 50, // Tính điểm từ giá trị
                    quantity: v.maxUsage - v.usageCount,
                    terms: v.description
                }));
            
            console.log('Transformed vouchers:', vouchersMock.length, 'items');
        } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
    } catch (error) {
        console.error('Lỗi tải vouchers từ JSON:', error);
        // Fallback nếu không load được JSON
        console.log('Sử dụng fallback mock data');
        vouchersMock = [
            {
                id: 'VOUCHER-SPA-50K',
                name: 'Voucher Giảm giá dịch vụ Spa 50k',
                value: '50.000đ',
                pointsCost: 100,
                quantity: 15,
                terms: 'Áp dụng cho mọi dịch vụ tắm rửa và cắt tỉa lông.'
            },
            {
                id: 'VOUCHER-PETSHOP-10',
                name: 'Voucher Mua sắm hạt hạt 10%',
                value: 'Giảm 10% (Tối đa 100k)',
                pointsCost: 150,
                quantity: 3,
                terms: 'Áp dụng cho đơn hàng phụ kiện và thức ăn thú cưng.'
            },
            {
                id: 'VOUCHER-HOTEL-FREE',
                name: 'Voucher Miễn phí 1 đêm lưu trú Hotel',
                value: 'Lưu trú miễn phí',
                pointsCost: 300,
                quantity: 5,
                terms: 'Áp dụng cho phòng tiêu chuẩn Standard.'
            },
            {
                id: 'VOUCHER-OUT-OF-STOCK',
                name: 'Voucher Cắt tỉa lông chuyên nghiệp',
                value: '100.000đ',
                pointsCost: 200,
                quantity: 0,
                terms: 'Hạn dùng trong vòng 30 ngày kể từ lúc đổi.'
            }
        ];
    }

    // Cập nhật giao diện
    renderLoyaltyPage(currentUser, vouchersMock);
    renderMyVouchers(currentUser);

    // Kiểm tra xem có quà nào đang chờ khôi phục luồng đổi quà không (US 13-3)
    checkPendingRedeem(currentUser);
});

// Hàm hiển thị toàn bộ nội dung trang Loyalty
function renderLoyaltyPage(user, vouchers) {
    // 1. Phân hạng dựa trên tổng chi tiêu
    // Bạc: < 5tr, Vàng: 5tr - 15tr, Kim Cương: > 15tr
    let tierName = 'Hạng Bạc (Silver)';
    let tierClass = 'tier-silver';
    let nextTierName = 'Hạng Vàng';
    let nextTierLimit = 5000000;
    let currentSpend = user.spend || 0;

    if (currentSpend >= 15000000) {
        tierName = 'Hạng Kim Cương (Diamond)';
        tierClass = 'tier-diamond';
        nextTierName = 'Tối đa';
        nextTierLimit = 15000000;
    } else if (currentSpend >= 5000000) {
        tierName = 'Hạng Vàng (Gold)';
        tierClass = 'tier-gold';
        nextTierName = 'Hạng Kim Cương';
        nextTierLimit = 15000000;
    }

    // 2. Banner cảnh báo điểm sắp hết hạn (US 13-5)
    const warningBanner = document.getElementById('loyalty-warning-banner');
    if (warningBanner) {
        if (user.points >= 50) {
            // Giả lập điểm sắp hết hạn trong 30 ngày tới
            warningBanner.style.display = 'block';
            warningBanner.innerHTML = `
                <div class="warning-banner-content">
                    <span class="warning-icon"></span>
                    <span>Bạn có <strong>50</strong> điểm Paw Points sắp hết hạn sử dụng vào ngày 15/07/2026. Hãy đổi ưu đãi ngay nhé!</span>
                </div>
            `;
        } else {
            warningBanner.style.display = 'none';
        }
    }

    // 3. Render Virtual Card và Progress
    const cardEl = document.getElementById('loyalty-card-wrapper');
    if (cardEl) {
        const progressPercent = Math.min((currentSpend / nextTierLimit) * 100, 100);
        const remainingToUpgrade = nextTierLimit - currentSpend;

        let upgradeText = `Bạn cần chi tiêu thêm ${new Intl.NumberFormat('vi-VN').format(remainingToUpgrade)}đ để đạt ${nextTierName}`;
        if (currentSpend >= 15000000) {
            upgradeText = 'Bạn đã đạt cấp bậc cao nhất của PawPal!';
        }

        // Multipliers và Perks mapping
        let pointsMultiplier = "1x Points";
        let mainPerk = "Cập nhật Care-Log";
        if (tierClass === 'tier-gold') {
            pointsMultiplier = "1.5x Points";
            mainPerk = "Giảm 10% dịch vụ";
        } else if (tierClass === 'tier-diamond') {
            pointsMultiplier = "2x Points";
            mainPerk = "Đưa đón miễn phí";
        }

        cardEl.innerHTML = `
            <div class="loyalty-top-flex" style="display: flex; flex-wrap: wrap; gap: var(--space-md); align-items: stretch; margin-bottom: var(--space-lg);">
                <div class="pawpass-card-wrapper" style="width: 340px; max-width: 100%; flex-shrink: 0;">
                    <div id="pawpassVirtualCard" class="pawpass-virtual-card ${tierClass}">
                        <div class="card-shimmer"></div>
                        <div class="card-glow-element"></div>
                        <div class="card-header-brand">
                            <span class="brand-name">PawPal <strong>PawPass</strong></span>
                            <span class="card-chip"></span>
                        </div>
                        <div class="card-body-info">
                            <span class="card-tier-label" id="virtualCardTier">${tierClass === 'tier-silver' ? 'Hạng Bạc' : (tierClass === 'tier-gold' ? 'Hạng Vàng' : 'Hạng Kim Cương')}</span>
                            <div class="pet-owner-info">
                                <span class="pet-name">VIP PET PASS</span>
                                <span class="owner-name" id="virtualCardOwner">${user.name}</span>
                            </div>
                        </div>
                        <div class="card-footer-metrics">
                            <div class="metric-group">
                                <span class="m-label">TÍCH ĐIỂM</span>
                                <span class="m-val" id="virtualCardPoints">${pointsMultiplier}</span>
                            </div>
                            <div class="metric-group text-end">
                                <span class="m-label">ĐẶC QUYỀN CHÍNH</span>
                                <span class="m-val" id="virtualCardPerk">${mainPerk}</span>
                            </div>
                        </div>
                        <div class="card-logo-watermark"></div>
                    </div>
                </div>

                <div class="loyalty-card-details-panel" style="flex: 1; min-width: 280px; display: flex; flex-direction: column; justify-content: center; margin-bottom: 0; padding: var(--space-md);">
                    <div class="points-balance-summary" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--color-border); padding-bottom: var(--space-sm); margin-bottom: var(--space-sm);">
                        <span class="label" style="font-weight: 600; color: var(--color-text-dark);">Điểm tích lũy hiện tại:</span>
                        <strong id="current-points-display" style="font-size: 1.6rem; color: var(--color-primary-dark);">${user.points} Paw Points</strong>
                    </div>
                    <div class="progress-upgrade-label" style="font-weight: 600; font-size: var(--fs-small); margin-bottom: 8px;">Tiến trình nâng hạng:</div>
                    <div class="progress-upgrade-wrapper" style="margin-bottom: 8px;">
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <span class="progress-stats" style="font-size: var(--fs-small); font-weight: 700;">${new Intl.NumberFormat('vi-VN').format(currentSpend)}đ / ${new Intl.NumberFormat('vi-VN').format(nextTierLimit)}đ</span>
                    </div>
                    <p class="upgrade-remaining-desc" style="margin: 0; font-size: var(--fs-small); font-style: italic; opacity: 0.85;">${upgradeText}</p>
                </div>
            </div>
        `;
    }

    // 4. Render danh sách voucher
    const gridEl = document.getElementById('vouchers-grid');
    if (gridEl) {
        gridEl.innerHTML = vouchers.map(v => renderVoucherCard(v, user)).join('');
        
        // Gắn sự kiện click cho các nút Đổi (nếu đủ điểm)
        vouchers.forEach(v => {
            if (v.quantity > 0 && user.points >= v.pointsCost) {
                const btn = document.querySelector(`.voucher-card[data-id="${v.id}"] .redeem-btn`);
                if (btn) {
                    btn.addEventListener('click', (e) => {
                        // Disable button to prevent double submit
                        btn.disabled = true;
                        const voucherCard = btn.closest('.voucher-card');
                        const footer = voucherCard ? voucherCard.querySelector('.voucher-card-footer') : null;
                        triggerRedeem(v.id, user, footer || btn);
                    });
                }
            }
        });
    }
}

function renderMyVouchers(user) {
    const container = document.getElementById('my-vouchers-list');
    if (!container) return;

    const myVouchers = JSON.parse(localStorage.getItem('pawpal_my_vouchers') || '[]')
        .filter(v => v.ownerPhone === user.phone);

    if (!myVouchers.length) {
        container.innerHTML = `
            <div class="no-my-vouchers">
                <p>Bạn chưa có voucher nào. Đổi điểm ngay để nhận voucher hấp dẫn!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = myVouchers.map(v => renderMyVoucherCard(v)).join('');
}

function renderMyVoucherCard(voucher) {
    const createdDate = new Date(voucher.createdAt);
    const expiresAt = new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const createdLabel = createdDate.toLocaleDateString('vi-VN');
    const expiryLabel = expiresAt.toLocaleDateString('vi-VN');

    return `
        <div class="my-voucher-card">
            <div class="my-voucher-card-body">
                <div class="my-voucher-code">${voucher.code}</div>
                <div class="my-voucher-name">${voucher.name}</div>
                <div class="my-voucher-meta">Đổi: ${voucher.pointsCost} Points</div>
                <div class="my-voucher-meta">Ngày đổi: ${createdLabel}</div>
                <div class="my-voucher-meta">Hạn dùng: ${expiryLabel}</div>
            </div>
            <div class="my-voucher-status">Chưa sử dụng</div>
        </div>
    `;
}

// Render từng voucher card
function renderVoucherCard(voucher, user) {
    const isOutOfStock = voucher.quantity <= 0;
    const isInsufficientPoints = user.points < voucher.pointsCost;

    let statusClass = 'available';
    let actionHtml = '';

    if (isOutOfStock) {
        statusClass = 'out-of-stock';
        actionHtml = `
            <div class="voucher-status-label out-of-stock-label">Đã hết quà</div>
        `;
    } else if (isInsufficientPoints) {
        statusClass = 'insufficient';
        actionHtml = `
            <div class="voucher-status-label locked-label">Không đủ điểm</div>
        `;
    } else {
        actionHtml = `
            <button class="redeem-btn" data-id="${voucher.id}">Đổi ngay</button>
        `;
    }

    return `
        <div class="voucher-card-shopee ${statusClass}" data-id="${voucher.id}">
            <div class="voucher-icon">🎁</div>
            <div class="voucher-content">
                <div class="voucher-header">
                    <h4 class="voucher-title">${voucher.name}</h4>
                    <span class="voucher-points">${voucher.pointsCost} pts</span>
                </div>
                <p class="voucher-subtitle">${voucher.value}</p>
            </div>
            <div class="voucher-action">
                ${actionHtml}
            </div>
        </div>
    `;
}

// Hàm khởi tạo Slider kéo trượt bằng touch/mouse event
function initSlider(voucherId, user) {
    const container = document.getElementById(`slider-${voucherId}`);
    if (!container) return;

    const handle = container.querySelector('.slider-handle');
    const text = container.querySelector('.slider-text');
    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let maxDrag = 0;

    const onStart = (e) => {
        isDragging = true;
        startX = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        maxDrag = container.clientWidth - handle.clientWidth;
        handle.style.transition = 'none';
        text.style.userSelect = 'none';
    };

    const onMove = (e) => {
        if (!isDragging) return;
        const x = e.type.startsWith('touch') ? e.touches[0].clientX : e.clientX;
        currentX = x - startX;

        // Giới hạn khoảng kéo từ 0 đến maxDrag
        if (currentX < 0) currentX = 0;
        if (currentX > maxDrag) currentX = maxDrag;

        handle.style.transform = `translateX(${currentX}px)`;
        
        // Mờ dần dòng chữ hướng dẫn
        const opacity = 1 - (currentX / maxDrag);
        text.style.opacity = opacity;
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;

        // Nếu kéo qua 90% hành trình, coi như đổi thành công
        if (currentX >= maxDrag * 0.9) {
            handle.style.transform = `translateX(${maxDrag}px)`;
            text.style.opacity = '0';
            triggerRedeem(voucherId, user, container);
        } else {
            // Trả về vị trí cũ mượt mà
            handle.style.transition = 'transform 0.3s ease';
            handle.style.transform = 'translateX(0px)';
            text.style.transition = 'opacity 0.3s ease';
            text.style.opacity = '1';
        }
        currentX = 0;
    };

    handle.addEventListener('mousedown', onStart);
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);

    handle.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchmove', onMove, { passive: true });
    document.addEventListener('touchend', onEnd);
}

// Hàm xử lý đổi quà
function triggerRedeem(voucherId, user, sliderContainer) {
    // helper to reset UI (slider or button)
    const resetUI = () => {
        try {
            const handle = sliderContainer && sliderContainer.querySelector && sliderContainer.querySelector('.slider-handle');
            const text = sliderContainer && sliderContainer.querySelector && sliderContainer.querySelector('.slider-text');
            if (handle) {
                handle.style.transform = 'translateX(0px)';
            }
            if (text) {
                text.style.opacity = '1';
            }
            // if sliderContainer itself is a button element
            if (sliderContainer && sliderContainer.classList && sliderContainer.classList.contains('redeem-btn')) {
                sliderContainer.disabled = false;
            } else if (sliderContainer) {
                const btn = sliderContainer.querySelector && sliderContainer.querySelector('.redeem-btn');
                if (btn) btn.disabled = false;
            }
        } catch (e) {
            // ignore
        }
    };

    // 1. Kiểm tra tài khoản tạm (US 13-3)
    if (user.is_temporary) {
        resetUI();
        // Mở popup bảo mật tài khoản
        showSecurityModal(voucherId);
        return;
    }

    // 2. Mô phỏng 5% lỗi hệ thống để kiểm thử Rollback (US 13-4)
    const isSystemError = Math.random() < 0.05;
    if (isSystemError) {
        resetUI();
        showToast('error', 'Hệ thống bận, vui lòng thử lại sau. Điểm của bạn đã được giữ an toàn.');
        return;
    }

    // 3. Tiến hành đổi điểm thành công
    const vouchersList = {
        'VOUCHER-SPA-50K': {
            cost: 100,
            name: 'Voucher Giảm giá dịch vụ Spa 50k',
            type: 'fixed',
            value: 50000,
            minOrderValue: 0,
            maxDiscount: null,
            applicableFor: ['all']
        },
        'VOUCHER-PETSHOP-10': {
            cost: 150,
            name: 'Voucher Mua sắm hạt hạt 10%',
            type: 'percentage',
            value: 10,
            minOrderValue: 200000,
            maxDiscount: 100000,
            applicableFor: ['all']
        },
        'VOUCHER-HOTEL-FREE': {
            cost: 300,
            name: 'Voucher Miễn phí 1 đêm lưu trú Hotel',
            type: 'fixed',
            value: 100000,
            minOrderValue: 0,
            maxDiscount: null,
            applicableFor: ['all']
        }
    };

    const voucherInfo = vouchersList[voucherId];
    if (!voucherInfo) return;

    // Trừ điểm trong Database
    const users = JSON.parse(localStorage.getItem('pawpal_users_db') || '[]');
    const userIdx = users.findIndex(u => u.phone === user.phone);
    
    if (userIdx !== -1) {
        if (users[userIdx].points >= voucherInfo.cost) {
            users[userIdx].points -= voucherInfo.cost;
            localStorage.setItem('pawpal_users_db', JSON.stringify(users));
            
            // Cập nhật session user
            user.points = users[userIdx].points;
            localStorage.setItem('pawpal_current_user', JSON.stringify(user));

            // Sinh mã voucher đưa vào "Voucher của tôi"
            const voucherCode = 'PAWPAL-' + Math.random().toString(36).substring(2, 8).toUpperCase();
            const myVouchers = JSON.parse(localStorage.getItem('pawpal_my_vouchers') || '[]');
            const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            myVouchers.push({
                ownerPhone: user.phone,
                code: voucherCode,
                name: voucherInfo.name,
                pointsCost: voucherInfo.cost,
                type: voucherInfo.type,
                value: voucherInfo.value,
                minOrderValue: voucherInfo.minOrderValue,
                maxDiscount: voucherInfo.maxDiscount,
                applicableFor: voucherInfo.applicableFor,
                validUntil: expiryDate,
                createdAt: new Date().toISOString(),
                source: 'loyalty'
            });
            localStorage.setItem('pawpal_my_vouchers', JSON.stringify(myVouchers));
            localStorage.setItem('pawpal_applied_voucher_code', voucherCode);

            // Hiển thị giao diện thành công (button or footer)
            try {
                if (sliderContainer) {
                    sliderContainer.innerHTML = `<div class="redeem-success-btn">Đã đổi thành công!</div>`;
                }
            } catch (e) {
                // ignore
            }
            
            // Cập nhật số điểm hiển thị
            const pointsDisplay = document.getElementById('current-points-display');
            if (pointsDisplay) {
                pointsDisplay.innerHTML = `${user.points} <span class="points-unit">Paw Points</span>`;
            }

            // Toast báo thành công
            showToast('success', `Đổi điểm thành công! Mã ưu đãi của bạn: ${voucherCode}`);

            // Reload lại danh sách voucher sau 1.5 giây để cập nhật trạng thái các voucher khác (ví dụ: thiếu điểm sau khi trừ)
            setTimeout(() => {
                location.reload();
            }, 1500);
        }
    }
}

// Hiển thị Modal bảo mật tài khoản tạm (US 13-3)
function showSecurityModal(voucherId) {
    // Tạo modal động bằng JS nếu chưa có
    let modalEl = document.getElementById('security-auth-modal');
    if (!modalEl) {
        const modalHtml = `
            <div class="modal fade" id="security-auth-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content" style="border: none; border-radius: var(--card-border-radius); box-shadow: var(--shadow-card-hover);">
                        <div class="modal-header" style="border: none; padding: var(--space-md) var(--space-md) 0 var(--space-md);">
                            <h5 class="modal-title fw-bold" style="color: var(--color-primary-dark); font-family: var(--font-heading); font-size: var(--fs-h3);">
                                Bảo mật tài khoản
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body" style="padding: var(--space-md);">
                            <p style="color: var(--color-text-dark); font-size: var(--fs-body); margin: 0;">
                                Bạn cần thiết lập mật khẩu tài khoản để sử dụng tính năng đổi điểm thưởng Paw Points.
                            </p>
                        </div>
                        <div class="modal-footer" style="border: none; padding: 0 var(--space-md) var(--space-md) var(--space-md); gap: 8px;">
                            <button type="button" class="btn-gray" data-bs-dismiss="modal" style="margin: 0;">Để sau</button>
                            <button type="button" class="btn-orange" id="btn-redirect-setup-pwd" style="margin: 0;">Thiết lập mật khẩu ngay</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('security-auth-modal');
    }

    const bootstrapModal = new bootstrap.Modal(modalEl);
    bootstrapModal.show();

    // Ràng buộc sự kiện nút chuyển hướng
    const btnRedirect = document.getElementById('btn-redirect-setup-pwd');
    btnRedirect.onclick = () => {
        // Lưu voucherId cần đổi vào sessionStorage để sau khi đặt mật khẩu thành công thì quay lại đổi ngay
        sessionStorage.setItem('pending_redeem_voucher', voucherId);
        bootstrapModal.hide();
        
        // Đẩy đi tới trang thiết lập mật khẩu
        const tokens = JSON.parse(localStorage.getItem('pawpal_temp_tokens') || '[]');
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
        let tokenObj = tokens.find(t => t.phone === currentUser.phone);
        if (!tokenObj) {
            tokenObj = { token: 'token-dynamic-' + Math.random().toString(36).substr(2, 9), phone: currentUser.phone, createdAt: Date.now() };
            tokens.push(tokenObj);
            localStorage.setItem('pawpal_temp_tokens', JSON.stringify(tokens));
        }
        
        window.location.href = `/pages/public/login.html?action=setup-password&token=${tokenObj.token}`;
    };
}

// Kiểm tra xem có yêu cầu đổi quà nào đang chờ khôi phục sau khi đổi pass không (US 13-3 / AC3.2)
function checkPendingRedeem(user) {
    const pendingVoucherId = sessionStorage.getItem('pending_redeem_voucher');
    if (pendingVoucherId && !user.is_temporary) {
        sessionStorage.removeItem('pending_redeem_voucher');
        showToast('info', 'Chào mừng bạn trở thành thành viên chính thức! Hệ thống đang tự động khôi phục yêu cầu đổi ưu đãi của bạn...');
        
        // Tự động trigger đổi quà sau 2 giây
        setTimeout(() => {
            const voucherCard = document.querySelector(`.voucher-card[data-id="${pendingVoucherId}"]`);
            if (voucherCard) {
                const sliderContainer = voucherCard.querySelector('.slider-container');
                if (sliderContainer) {
                    triggerRedeem(pendingVoucherId, user, sliderContainer);
                }
            }
        }, 2000);
    }
}
