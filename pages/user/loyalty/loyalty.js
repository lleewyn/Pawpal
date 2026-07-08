/**
 * loyalty.js — Xử lý nghiệp vụ Ưu đãi và Thành viên (Quy trình 3.1.13)
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Tải thông tin người dùng từ localStorage
    let currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
    if (!currentUser) {
        currentUser = {
            phone: null,
            name: 'Khách vãng lai',
            points: 0,
            is_temporary: true
        };
    }

    // Đảm bảo đồng bộ points từ Users DB
    const users = JSON.parse(localStorage.getItem('pawpal_users_db') || '[]');
    const userInDb = currentUser.phone ? users.find(u => u.phone === currentUser.phone) : null;
    if (userInDb) {
        currentUser.points = userInDb.points;
        currentUser.is_temporary = userInDb.is_temporary;
        localStorage.setItem('pawpal_current_user', JSON.stringify(currentUser));
    }

    if (window.getSupabaseClient || window.SupabaseClient) {
        currentUser = await syncLoyaltyFromSupabase(currentUser);
    }

    // Tải vouchers từ API (Supabase) hoặc JSON file
    let vouchersMock = [];
    try {
        let apiVouchers = [];
        if (window.API && typeof window.API.getVouchers === 'function') {
            apiVouchers = await window.API.getVouchers();
        } else {
            const response = await fetch('/data/vouchers-redeem.json');
            if (response.ok) {
                apiVouchers = await response.json();
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
        }

        window.PawPalVoucherRedeemSeed = apiVouchers;
        
        const POINTS_TABLE = [
            { points: 50,   maxValue: 9999     },
            { points: 100,  maxValue: 29999    },
            { points: 300,  maxValue: 59999    },
            { points: 500,  maxValue: 99999    },
            { points: 1000, maxValue: Infinity }
        ];
        function calcPointsCost(v) {
            if (v.pointsCost > 0) return v.pointsCost;
            const val = v.type === 'fixed' ? v.value : (v.maxDiscount || v.value || 0);
            const row = POINTS_TABLE.find(t => val <= t.maxValue);
            return row ? row.points : Math.ceil(val / 150);
        }

        vouchersMock = apiVouchers
            .filter(v => calcPointsCost(v) > 0) // Chỉ hiện voucher cần điểm
            .map((v, idx) => ({
                id: v.id || `VOUCHER-${idx}`,
                code: v.code || `CODE-${idx}`,
                name: v.name || v.id || `VOUCHER-${idx + 1}`,
                value: v.type === 'fixed'
                    ? `${new Intl.NumberFormat('vi-VN').format(v.value)}đ`
                    : v.type === 'percentage'
                    ? `Giảm ${v.value}% (Tối đa ${new Intl.NumberFormat('vi-VN').format(v.maxDiscount || 0)})`
                    : v.description,
                pointsCost: calcPointsCost(v),
                quantity: v.maxUsage ? Math.max(0, v.maxUsage - (v.usageCount || 0)) : (Number.isFinite(Number(v.quantity)) ? Number(v.quantity) : Math.max(10, 50 - idx * 5)),
                terms: [
                    `Áp dụng cho: ${(v.applicableFor || []).join(', ') || 'Tất cả'}`,
                    v.minOrderValue ? `Đơn tối thiểu: ${new Intl.NumberFormat('vi-VN').format(Number(v.minOrderValue) || 0)}đ` : null,
                    v.maxDiscount ? `Giảm tối đa: ${new Intl.NumberFormat('vi-VN').format(Number(v.maxDiscount) || 0)}đ` : null
                ].filter(Boolean).join(' • '),
                _raw: v
            }));

        window.PawPalVoucherRedeemList = vouchersMock;

        if (!vouchersMock.length) {
            vouchersMock = [{
                id: 'VOUCHER-DEMO-1',
                code: 'DEMO50',
                name: 'Voucher đổi điểm giảm 50.000đ',
                value: 'Giảm 50.000đ',
                pointsCost: 100,
                quantity: 1,
                terms: 'Áp dụng cho: Tất cả'
            }];
            window.PawPalVoucherRedeemList = vouchersMock;
        }
        
        console.log('Transformed vouchers:', vouchersMock.length, 'items');
    } catch (error) {
        console.error('Lỗi tải vouchers:', error);
        vouchersMock = [];
    }

    // Cập nhật giao diện
    renderLoyaltyPage(currentUser, vouchersMock);
    renderMyVouchers(currentUser);

    // Kiểm tra xem có quà nào đang chờ khôi phục luồng đổi quà không (US 13-3)
    checkPendingRedeem(currentUser);
});

async function syncLoyaltyFromSupabase(user) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !user?.phone) return user;

    try {
        const { data, error } = await db
            .from('customer')
            .select(`
                id,
                phone_main,
                email,
                customer_profile ( full_name ),
                customer_membership ( total_paw_points, membership_tier ( tier_name, discount_percent ) )
            `)
            .eq('phone_main', user.phone)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.warn('[Loyalty] Supabase customer lookup error:', error.message || error);
            return user;
        }

        if (!data) {
            return user;
        }

        const profile = data.customer_profile?.[0] || {};
        const membership = data.customer_membership?.[0] || {};
        const tier = membership.membership_tier || {};

        const updatedUser = {
            ...user,
            id: data.id || user.id,
            name: profile.full_name || user.name || 'Khách vãng lai',
            email: data.email || user.email || '',
            phone: data.phone_main || user.phone,
            points: membership.total_paw_points ?? user.points ?? 0,
            tier: tier.tier_name || user.tier || 'Đồng',
            _source: 'supabase',
        };

        localStorage.setItem('pawpal_current_user', JSON.stringify(updatedUser));
        return updatedUser;
    } catch (err) {
        console.warn('[Loyalty] Supabase sync exception:', err);
        return user;
    }
}

async function findSupabaseCustomerIdByPhone(phone) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !phone) return null;

    try {
        const { data, error } = await db
            .from('customer')
            .select('id')
            .eq('phone_main', phone)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.warn('[Loyalty] Cannot resolve customer id:', error.message || error);
            return null;
        }
        return data?.id || null;
    } catch (err) {
        console.warn('[Loyalty] findSupabaseCustomerIdByPhone exception:', err);
        return null;
    }
}

async function getMembershipTierId(tierName = 'Đồng') {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db) return null;

    try {
        const { data, error } = await db
            .from('membership_tier')
            .select('id')
            .eq('tier_name', tierName)
            .limit(1)
            .maybeSingle();

        if (error) {
            console.warn('[Loyalty] Cannot resolve membership tier:', error.message || error);
            return null;
        }
        return data?.id || null;
    } catch (err) {
        console.warn('[Loyalty] getMembershipTierId exception:', err);
        return null;
    }
}

async function updateSupabaseMembershipPoints(customerId, points) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !customerId) return false;

    try {
        const { data: existing, error: existingError } = await db
            .from('customer_membership')
            .select('id')
            .eq('customer_id', customerId)
            .limit(1)
            .maybeSingle();

        if (existingError) {
            console.warn('[Loyalty] membership lookup error:', existingError.message || existingError);
            return false;
        }

        if (existing) {
            const { error } = await db
                .from('customer_membership')
                .update({ total_paw_points: points })
                .eq('customer_id', customerId);
            if (error) {
                console.warn('[Loyalty] membership update failed:', error.message || error);
                return false;
            }
            return true;
        }

        const tierId = await getMembershipTierId('Đồng');
        const { error } = await db.from('customer_membership').insert({
            customer_id: customerId,
            membership_tier_id: tierId,
            total_paw_points: points,
        });

        if (error) {
            console.warn('[Loyalty] membership insert failed:', error.message || error);
            return false;
        }
        return true;
    } catch (err) {
        console.warn('[Loyalty] updateSupabaseMembershipPoints exception:', err);
        return false;
    }
}

async function createPawPointTransaction(customerId, points, balanceAfter, description) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !customerId) return false;

    try {
        const { error } = await db.from('paw_point_transaction').insert({
            customer_id: customerId,
            points,
            balance_after: balanceAfter,
            description,
            created_at: new Date().toISOString(),
        });

        if (error) {
            console.warn('[Loyalty] paw_point_transaction insert failed:', error.message || error);
            return false;
        }
        return true;
    } catch (err) {
        console.warn('[Loyalty] createPawPointTransaction exception:', err);
        return false;
    }
}

async function persistLoyaltyRedemption(user, voucherInfo) {
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    if (!db || !user?.phone) return;

    const customerId = user.id || await findSupabaseCustomerIdByPhone(user.phone);
    if (!customerId) {
        console.warn('[Loyalty] Cannot persist redemption, missing customerId');
        return;
    }

    await updateSupabaseMembershipPoints(customerId, user.points);
    await createPawPointTransaction(
        customerId,
        -voucherInfo.pointsCost,
        user.points,
        `Đổi ưu đãi ${voucherInfo.name}`
    );

    const voucherId = voucherInfo._raw?.id || voucherInfo.id;
    if (voucherId && voucherId.length >= 32) { // check if valid uuid
        const { error: cvErr } = await db.from('customer_voucher').insert({
            customer_id: customerId,
            voucher_id: voucherId,
            acquired_method: 'PROMOTION',
            voucher_status: 'AVAILABLE',
            acquired_at: new Date().toISOString()
        });
        if (cvErr) console.warn('[Loyalty] customer_voucher insert failed:', cvErr);
    }
}

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
            // Tính ngày hết hạn động: lastTransactionAt + 12 tháng
            const lastTx = user.lastTransactionAt || user.createdAt || null;
            const expiryDate = lastTx
                ? new Date(new Date(lastTx).getTime() + 365 * 24 * 60 * 60 * 1000)
                : null;
            const daysUntilExpiry = expiryDate
                ? Math.ceil((expiryDate - Date.now()) / (1000 * 60 * 60 * 24))
                : null;

            if (expiryDate && daysUntilExpiry <= 30 && daysUntilExpiry > 0) {
                warningBanner.classList.remove('d-none');
                warningBanner.innerHTML = `
                    <div class="warning-banner-content">
                        <span class="warning-icon">⚠️</span>
                        <span>Bạn có <strong>${user.points}</strong> điểm Paw Points sắp hết hạn sử dụng vào ngày
                        <strong>${expiryDate.toLocaleDateString('vi-VN')}</strong>. Hãy đổi ưu đãi ngay nhé!</span>
                    </div>
                `;
            } else {
                warningBanner.classList.add('d-none');
            }
        } else {
            warningBanner.classList.add('d-none');
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
            <div class="loyalty-top-flex">
                <div class="pawpass-card-wrapper">
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

                <div class="loyalty-card-details-panel">
                    <div class="points-balance-summary">
                        <span class="label">Điểm tích lũy hiện tại:</span>
                        <strong id="current-points-display">${user.points} Paw Points</strong>
                    </div>
                    <div class="progress-upgrade-label">Tiến trình nâng hạng:</div>
                    <div class="progress-upgrade-wrapper">
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <span class="progress-stats">${new Intl.NumberFormat('vi-VN').format(currentSpend)}đ / ${new Intl.NumberFormat('vi-VN').format(nextTierLimit)}đ</span>
                    </div>
                    <p class="upgrade-remaining-desc">${upgradeText}</p>
                </div>
            </div>
        `;
    }

    // 4. Render danh sách voucher
    const gridEl = document.getElementById('vouchers-grid');
    if (gridEl) {
        gridEl.innerHTML = vouchers.map(v => renderVoucherCard(v, user)).join('');
        
        // Gắn sự kiện click cho các nút Đổi (nếu đủ điểm)
        // Dùng event delegation trên grid để tránh sai selector
        gridEl.addEventListener('click', (e) => {
            const btn = e.target.closest('.redeem-btn');
            if (!btn || btn.disabled) return;
            const card = btn.closest('.voucher-card-shopee');
            if (!card) return;
            const vId = card.dataset.id;
            const vInfo = vouchers.find(v => v.id === vId);
            if (!vInfo) return;
            btn.disabled = true;
            triggerRedeem(vId, user, btn);
        });
    }
}

async function renderMyVouchers(user) {
    const container = document.getElementById('my-vouchers-list');
    if (!container) return;

    let myVouchers = [];
    const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;

    if (db && user.id) {
        try {
            const { data, error } = await db
                .from('customer_voucher')
                .select(`
                    id, acquired_at, voucher_status,
                    voucher ( voucher_code, voucher_name, required_points, end_date )
                `)
                .eq('customer_id', user.id)
                .order('acquired_at', { ascending: false });

            if (!error && data) {
                myVouchers = data.map(cv => ({
                    code: cv.voucher?.voucher_code || 'VOUCHER',
                    name: cv.voucher?.voucher_name || 'Voucher ưu đãi',
                    pointsCost: cv.voucher?.required_points || 0,
                    createdAt: cv.acquired_at,
                    validUntil: cv.voucher?.end_date,
                    status: cv.voucher_status || 'AVAILABLE'
                }));
            }
        } catch (err) {
            console.warn('[Loyalty] get my_vouchers error:', err);
        }
    }

    // Fallback to local
    if (!myVouchers.length) {
        myVouchers = JSON.parse(localStorage.getItem('pawpal_my_vouchers') || '[]')
            .filter(v => v.ownerPhone === user.phone);
    }

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
                <div class="my-voucher-meta">Đổi: ${voucher.pointsCost} điểm</div>
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
            // Trả về vị trí cÅ© mượt mà
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

    // 3. Tiến hành đổi điểm — hiện modal xác nhận trước
    const vouchersList = Object.fromEntries((window.PawPalVoucherRedeemList || []).map(v => [v.id, v]));
    const voucherInfo = vouchersList[voucherId];
    if (!voucherInfo) return;

    // Modal xác nhận
    const confirmId = 'redeem-confirm-modal';
    const existingModal = document.getElementById(confirmId);
    if (existingModal) existingModal.remove();

    const el = document.createElement('div');
    el.id = confirmId;
    el.className = 'modal fade';
    el.tabIndex = -1;
    el.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Xác nhận đổi ưu đãi</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                </div>
                <div class="modal-body">
                    <p>Bạn có chắc chắn muốn sử dụng <strong>${voucherInfo.pointsCost} điểm</strong> để đổi lấy ưu đãi <strong>${voucherInfo.name}</strong>?</p>
                    <p class="text-muted small">Điểm bị trừ sẽ không thể hoàn lại.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn-gray" data-bs-dismiss="modal" id="redeem-cancel-btn">Để sau</button>
                    <button type="button" class="btn-orange" id="redeem-confirm-btn">Xác nhận đổi</button>
                </div>
            </div>
        </div>`;
    document.body.appendChild(el);

    const confirmModal = new bootstrap.Modal(el);
    confirmModal.show();

    document.getElementById('redeem-cancel-btn').addEventListener('click', () => resetUI());

    document.getElementById('redeem-confirm-btn').addEventListener('click', () => {
        confirmModal.hide();
        doRedeem(voucherInfo, user, sliderContainer, resetUI);
    });
}

async function doRedeem(voucherInfo, user, sliderContainer, resetUI) {
    // Trừ điểm trong Database
    const users = JSON.parse(localStorage.getItem('pawpal_users_db') || '[]');
    const userIdx = users.findIndex(u => u.phone === user.phone);
    
    if (userIdx !== -1) {
        if (users[userIdx].points >= voucherInfo.pointsCost) {
            users[userIdx].points -= voucherInfo.pointsCost;
            localStorage.setItem('pawpal_users_db', JSON.stringify(users));
            
            // Cập nhật session user
            user.points = users[userIdx].points;
            localStorage.setItem('pawpal_current_user', JSON.stringify(user));

            // Sinh mã voucher đưa vào "Voucher của tôi" (Dự phòng ở localStorage)
            const voucherCode = voucherInfo.code || ('PAWPAL-' + Math.random().toString(36).substring(2, 8).toUpperCase());
            const myVouchers = JSON.parse(localStorage.getItem('pawpal_my_vouchers') || '[]');
            const expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            myVouchers.push({
                ownerPhone: user.phone,
                code: voucherCode,
                name: voucherInfo.name,
                pointsCost: voucherInfo.pointsCost,
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

            // Persist loyalty update to Supabase if available
            if (window.getSupabaseClient || window.SupabaseClient) {
                await persistLoyaltyRedemption(user, voucherInfo);
            }

            // Toast báo thành công
            showToast('success', `Đổi điểm thành công! Mã ưu đãi của bạn: ${voucherCode}`);

            renderMyVouchers(user);

            // Reload lại danh sách voucher sau 1.5 giây để cập nhật trạng thái các voucher khác (ví dụ: thiếu điểm sau khi trừ)
            setTimeout(() => {
                location.reload();
            }, 1500);
        } else {
            // Không đủ điểm — thông báo rõ ràng
            resetUI();
            showToast('error', `Số điểm hiện tại chưa đủ để đổi ưu đãi này. Cần ${voucherInfo.pointsCost} điểm, bạn đang có ${users[userIdx].points} điểm.`);
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
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title fw-bold">
                                Bảo mật tài khoản
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <p>
                                Bạn cần thiết lập mật khẩu tài khoản để sử dụng tính năng đổi điểm thưởng Paw Points.
                            </p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn-gray" data-bs-dismiss="modal">Để sau</button>
                            <button type="button" class="btn-orange" id="btn-redirect-setup-pwd">Thiết lập mật khẩu ngay</button>
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
        
        window.location.href = `/pages/public/login/login.html?action=setup-password&token=${tokenObj.token}`;
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


