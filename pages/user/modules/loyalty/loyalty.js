/**
 * modules/loyalty/loyalty.js - Module logic cho Điểm thưởng và Ưu đãi Paw Points
 * Chuẩn AGENTS.md: Giữ nguyên UI/UX thẻ thành viên, 9px radius, Flat Solid, Text-Only, Real Ticket Aesthetic
 */

import { API } from '/scripts/api/api.js';

const CURRENT_USER_KEY = 'pawpal_current_user';
const PAWPAL_MY_VOUCHERS_KEY = 'pawpal_my_vouchers_db';

function getCurrentUser() {
    try {
        let user = JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || {
            phone: '0901234567',
            name: 'Nguyễn Văn A',
            points: 250,
            spend: 3500000,
            is_temporary: false
        };

        // Đồng bộ dữ liệu điểm mới nhất từ Admin Customers Data nếu có
        try {
            const adminDataRaw = sessionStorage.getItem('pawpal_admin_customers_data') || localStorage.getItem('pawpal_admin_customers_data');
            if (adminDataRaw && user.phone) {
                const adminData = JSON.parse(adminDataRaw);
                const cleanPhone = user.phone.replace(/[^0-9]/g, '');
                const matched = Object.values(adminData).find(c => c.phone && c.phone.replace(/[^0-9]/g, '') === cleanPhone);
                if (matched) {
                    if (matched.points !== undefined) user.points = matched.points;
                    if (matched.tierName) user.tier = matched.tierName;
                    if (matched.name) user.name = matched.name;
                    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
                }
            }
        } catch (err) {}

        return user;
    } catch (e) {
        return {
            phone: null,
            name: 'Khách hàng',
            points: 0,
            spend: 0,
            is_temporary: true
        };
    }
}

function setCurrentUser(user) {
    try {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    } catch (e) {}
}

function showToast(type, message, duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container-custom';
        document.body.appendChild(container);
    }

    const toastColors = {
        success: { bg: '#236B48', label: 'Thành công' },
        error: { bg: '#8F2424', label: 'Lỗi' },
        info: { bg: '#20495E', label: 'Thông báo' },
        warning: { bg: '#734718', label: 'Lưu ý' }
    };
    const cfg = toastColors[type] || toastColors.success;

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: #ffffff;
        border: 1px solid #E2ECE5;
        border-radius: 9px;
        padding: 10px 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        min-width: 260px;
        max-width: 380px;
        color: #203A2C;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        opacity: 1;
        transition: opacity 0.25s ease;
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 13px; color: ${cfg.bg};">${cfg.label}:</span>
            <span style="font-size: 13px; color: #203A2C;">${message}</span>
        </div>
        <button type="button" style="border: none; background: transparent; color: #4F7A65; font-size: 16px; cursor: pointer; padding: 0 4px;">&times;</button>
    `;

    toast.querySelector('button').addEventListener('click', () => toast.remove());
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const cleaned = String(text).replace(/\s*&\s*/g, ' và ');
    const div = document.createElement('div');
    div.textContent = cleaned;
    return div.innerHTML;
}

function formatApplicableTerms(applicable) {
    if (!applicable || !applicable.length) return 'Toàn bộ dịch vụ và sản phẩm';
    const dict = {
        'all': 'Tất cả dịch vụ và sản phẩm',
        'care': 'Dịch vụ Spa và Chăm sóc',
        'services': 'Dịch vụ chăm sóc PawPal',
        'shop': 'Cửa hàng và Phụ kiện',
        'food': 'Thức ăn và Dinh dưỡng',
        'hotel': 'Khách sạn thú cưng',
        'grooming': 'Cắt tỉa và Tạo kiểu',
        'toys': 'Đồ chơi thú cưng'
    };
    return applicable.map(k => dict[String(k).toLowerCase()] || k).join(', ');
}

export async function initLoyalty() {
    let currentUser = getCurrentUser();

    if (typeof window.setUserSubBreadcrumb === 'function') {
        window.setUserSubBreadcrumb('', 'loyalty');
    }

    if (window.getSupabaseClient || window.SupabaseClient) {
        currentUser = await syncLoyaltyFromSupabase(currentUser);
    }

    let vouchersMock = [];
    try {
        let apiVouchers = [];
        if (typeof API.getVouchers === 'function') {
            apiVouchers = await API.getVouchers();
        }

        const POINTS_TABLE = [
            { points: 50,   maxValue: 30000    },
            { points: 100,  maxValue: 50000    },
            { points: 200,  maxValue: 100000   },
            { points: 300,  maxValue: 150000   },
            { points: 500,  maxValue: 250000   },
            { points: 1000, maxValue: Infinity }
        ];

        function calcPointsCost(v) {
            if (v.pointsCost > 0) return v.pointsCost;
            const val = v.type === 'fixed' ? v.value : (v.maxDiscount || (v.value ? v.value * 2500 : 0));
            const row = POINTS_TABLE.find(t => val <= t.maxValue);
            return row ? row.points : 100;
        }

        if (!apiVouchers || apiVouchers.length === 0) {
            apiVouchers = [
                {
                    id: 'VOUCHER-01',
                    code: 'PAWFIRST10',
                    name: 'Voucher Chào bạn mới 50.000đ',
                    type: 'fixed',
                    value: 50000,
                    pointsCost: 100,
                    quantity: 45,
                    applicableFor: ['all'],
                    minOrderValue: 200000,
                    discountDisplay: '50K'
                },
                {
                    id: 'VOUCHER-02',
                    code: 'PETCARE50',
                    name: 'Voucher Spa và Vệ sinh 50.000đ',
                    type: 'fixed',
                    value: 50000,
                    pointsCost: 100,
                    quantity: 30,
                    applicableFor: ['care'],
                    minOrderValue: 150000,
                    discountDisplay: '50K'
                },
                {
                    id: 'VOUCHER-03',
                    code: 'LUCKY15',
                    name: 'Giảm 15% Đơn hàng thân thiết',
                    type: 'percentage',
                    value: 15,
                    pointsCost: 200,
                    quantity: 20,
                    applicableFor: ['all'],
                    minOrderValue: 400000,
                    maxDiscount: 100000,
                    discountDisplay: '15%'
                },
                {
                    id: 'VOUCHER-04',
                    code: 'PAWHOTEL100K',
                    name: 'Voucher Khách sạn 100.000đ',
                    type: 'fixed',
                    value: 100000,
                    pointsCost: 300,
                    quantity: 25,
                    applicableFor: ['services'],
                    minOrderValue: 500000,
                    discountDisplay: '100K'
                },
                {
                    id: 'VOUCHER-05',
                    code: 'FREESHIP50',
                    name: 'Miễn phí giao nhận bé cưng',
                    type: 'fixed',
                    value: 30000,
                    pointsCost: 50,
                    quantity: 50,
                    applicableFor: ['all'],
                    minOrderValue: 150000,
                    discountDisplay: 'FREE'
                },
                {
                    id: 'VOUCHER-06',
                    code: 'PAWGROOM200K',
                    name: 'Voucher Cắt tỉa tạo kiểu 200.000đ',
                    type: 'fixed',
                    value: 200000,
                    pointsCost: 500,
                    quantity: 15,
                    applicableFor: ['services'],
                    minOrderValue: 800000,
                    discountDisplay: '200K'
                }
            ];
        }

        vouchersMock = apiVouchers.map((v, idx) => {
            const cost = calcPointsCost(v);
            let discountStr = 'Ưu đãi';
            if (v.discountDisplay) {
                discountStr = v.discountDisplay;
            } else if (v.type === 'fixed') {
                discountStr = v.value >= 1000 ? `${Math.round(v.value / 1000)}K` : `${v.value}đ`;
            } else if (v.type === 'percentage') {
                discountStr = `${v.value}%`;
            }

            let rawName = v.name || v.voucher_name || '';
            let voucherName = rawName;
            
            // Map technical voucher codes or empty names to clear Vietnamese names
            if (!voucherName || voucherName === v.code) {
                const codeUpper = String(v.code || '').toUpperCase();
                if (codeUpper.includes('FIRST') || codeUpper.includes('PAWFIRST')) {
                    voucherName = 'Voucher Chào bạn mới';
                } else if (codeUpper.includes('CARE') || codeUpper.includes('PETCARE')) {
                    voucherName = 'Voucher Spa và Chăm sóc';
                } else if (codeUpper.includes('LUCKY')) {
                    voucherName = 'Giảm 15% Đơn hàng thân thiết';
                } else if (codeUpper.includes('HOTEL')) {
                    voucherName = 'Voucher Khách sạn thú cưng';
                } else if (codeUpper.includes('SHIP') || codeUpper.includes('FREESHIP')) {
                    voucherName = 'Miễn phí giao nhận bé cưng';
                } else if (codeUpper.includes('GROOM')) {
                    voucherName = 'Voucher Cắt tỉa tạo kiểu';
                } else if (v.type === 'percentage') {
                    voucherName = `Giảm ${v.value}% Đơn hàng`;
                } else if (v.type === 'fixed') {
                    voucherName = `Giảm ${new Intl.NumberFormat('vi-VN').format(v.value)}đ`;
                } else {
                    voucherName = `Ưu đãi #${idx + 1}`;
                }
            }

            const appTerms = formatApplicableTerms(v.applicableFor);
            const minOrdStr = v.minOrderValue ? `Đơn tối thiểu ${new Intl.NumberFormat('vi-VN').format(Number(v.minOrderValue) || 0)}đ` : 'Không giới hạn đơn';

            return {
                id: v.id || `VOUCHER-${idx + 1}`,
                code: v.code || `PAW-${idx + 1}`,
                name: voucherName.replace(/\s*&\s*/g, ' và '),
                discountDisplay: discountStr,
                pointsCost: cost,
                quantity: v.maxUsage ? Math.max(0, v.maxUsage - (v.usageCount || 0)) : (Number.isFinite(Number(v.quantity)) ? Number(v.quantity) : 30),
                terms: `Áp dụng: ${appTerms} • ${minOrdStr}`,
                _raw: v
            };
        });

        window.PawPalVoucherRedeemList = vouchersMock;
    } catch (error) {
        console.error('Lỗi tải vouchers:', error);
        vouchersMock = [];
    }

    renderLoyaltyPage(currentUser, vouchersMock);
    renderMyVouchers(currentUser);
}

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
                is_temporary,
                customer_profile ( full_name ),
                customer_membership ( total_paw_points, membership_tier ( tier_name, discount_percent ) )
            `)
            .eq('phone_main', user.phone)
            .limit(1)
            .maybeSingle();

        if (error || !data) return user;

        const profile = data.customer_profile?.[0] || {};
        const membership = data.customer_membership?.[0] || {};
        const tier = membership.membership_tier || {};
        const isTemp = data.is_temporary !== undefined ? Boolean(data.is_temporary) : Boolean(user.is_temporary);

        const updatedUser = {
            ...user,
            id: data.id || user.id,
            name: profile.full_name || user.name || 'Khách hàng',
            email: data.email || user.email || '',
            phone: data.phone_main || user.phone,
            is_temporary: isTemp,
            points: membership.total_paw_points ?? user.points ?? 0,
            tier: tier.tier_name || user.tier || 'Đồng',
            _source: 'supabase',
        };

        setCurrentUser(updatedUser);
        return updatedUser;
    } catch (err) {
        return user;
    }
}

function renderLoyaltyPage(user, vouchers) {
    let tierClass = 'tier-silver';
    let tierTitle = 'Hạng Bạc (Silver)';
    let nextTierName = 'Hạng Vàng';
    let nextTierLimit = 5000000;
    let currentSpend = user.spend || 0;

    if (currentSpend >= 15000000) {
        tierClass = 'tier-diamond';
        tierTitle = 'Hạng Kim Cương (Diamond)';
        nextTierName = 'Tối đa';
        nextTierLimit = 15000000;
    } else if (currentSpend >= 5000000) {
        tierClass = 'tier-gold';
        tierTitle = 'Hạng Vàng (Gold)';
        nextTierName = 'Hạng Kim Cương';
        nextTierLimit = 15000000;
    }

    const warningBanner = document.getElementById('loyalty-warning-banner');
    if (warningBanner) {
        if (user.points >= 50) {
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
                        <span class="warning-badge-text">Lưu ý</span>
                        <span>Bạn có <strong>${user.points}</strong> điểm Paw Points sắp hết hạn vào ngày
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

    const cardEl = document.getElementById('loyalty-card-wrapper');
    if (cardEl) {
        const progressPercent = Math.min((currentSpend / nextTierLimit) * 100, 100);
        const remainingToUpgrade = nextTierLimit - currentSpend;

        let upgradeText = `Bạn cần chi tiêu thêm ${new Intl.NumberFormat('vi-VN').format(remainingToUpgrade)}đ để đạt ${nextTierName}`;
        if (currentSpend >= 15000000) {
            upgradeText = 'Bạn đã đạt cấp bậc thành viên cao nhất của PawPal!';
        }

        let pointsMultiplier = "1x Points";
        let mainPerk = "Tích điểm và Chăm sóc";
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
                            <span class="card-tier-label" id="virtualCardTier">${escapeHtml(tierTitle)}</span>
                            <div class="pet-owner-info">
                                <span class="pet-name">VIP PET PASS</span>
                                <span class="owner-name" id="virtualCardOwner">${escapeHtml(user.name || 'Khách hàng')}</span>
                            </div>
                        </div>
                        <div class="card-footer-metrics">
                            <div class="metric-group">
                                <span class="m-label">TÍCH ĐIỂM</span>
                                <span class="m-val" id="virtualCardPoints">${pointsMultiplier}</span>
                            </div>
                            <div class="metric-group text-end">
                                <span class="m-label">ĐẶC QUYỀN CHÍNH</span>
                                <span class="m-val" id="virtualCardPerk">${escapeHtml(mainPerk)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="loyalty-card-details-panel">
                    <div class="points-balance-summary">
                        <span class="label">Điểm tích lũy hiện tại:</span>
                        <strong id="current-points-display">${user.points} <span class="points-unit">Paw Points</span></strong>
                    </div>
                    <div class="progress-upgrade-label">Tiến trình nâng hạng:</div>
                    <div class="progress-upgrade-wrapper">
                        <div class="progress-bar-container">
                            <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                        </div>
                        <span class="progress-stats">${new Intl.NumberFormat('vi-VN').format(currentSpend)}đ / ${new Intl.NumberFormat('vi-VN').format(nextTierLimit)}đ</span>
                    </div>
                    <p class="upgrade-remaining-desc">${escapeHtml(upgradeText)}</p>
                </div>
            </div>
        `;
    }

    const gridEl = document.getElementById('vouchers-grid');
    if (gridEl) {
        if (!vouchers || vouchers.length === 0) {
            gridEl.innerHTML = `
                <div class="empty-state text-center py-4 w-100" style="grid-column: 1 / -1;">
                    <p class="text-muted mb-0">Hiện tại chưa có ưu đãi đổi điểm nào.</p>
                </div>
            `;
        } else {
            gridEl.innerHTML = vouchers.map(v => renderVoucherCard(v, user)).join('');
            
            gridEl.querySelectorAll('.redeem-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const vId = btn.getAttribute('data-id');
                    const vInfo = vouchers.find(v => String(v.id) === String(vId));
                    if (!vInfo) return;
                    triggerRedeem(vInfo, user);
                });
            });

            gridEl.querySelectorAll('.voucher-ticket-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.redeem-btn')) return;
                    const vId = card.getAttribute('data-id');
                    const vInfo = vouchers.find(v => String(v.id) === String(vId));
                    if (!vInfo) return;
                    showVoucherDetailModal(vInfo, user, false);
                });
            });
        }
    }
}

function getStoredMyVouchers() {
    try {
        return JSON.parse(localStorage.getItem(PAWPAL_MY_VOUCHERS_KEY) || '[]');
    } catch (e) {
        return [];
    }
}

function saveStoredMyVouchers(list) {
    try {
        localStorage.setItem(PAWPAL_MY_VOUCHERS_KEY, JSON.stringify(list));
    } catch (e) {}
}

async function renderMyVouchers(user) {
    const container = document.getElementById('my-vouchers-list');
    const countLabel = document.getElementById('myVouchersCountLabel');
    if (!container) return;

    let myVouchers = getStoredMyVouchers();

    if (countLabel) {
        countLabel.textContent = `${myVouchers.length} voucher khả dụng`;
    }

    if (!myVouchers || myVouchers.length === 0) {
        container.innerHTML = `
            <div class="no-my-vouchers">
                <p class="mb-0">Bạn chưa có voucher nào trong ví. Hãy đổi điểm thưởng ở danh sách bên dưới nhé!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = myVouchers.map((v, idx) => renderMyVoucherCard(v, idx)).join('');

    container.querySelectorAll('.btn-ticket-copy').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const code = btn.getAttribute('data-code');
            if (code) {
                navigator.clipboard.writeText(code).then(() => {
                    showToast('success', `Đã sao chép mã: ${code}`);
                }).catch(() => {
                    showToast('info', `Mã voucher của bạn: ${code}`);
                });
            }
        });
    });

    container.querySelectorAll('.btn-ticket-use').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });

    container.querySelectorAll('.my-voucher-ticket-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (e.target.closest('.btn-ticket-copy') || e.target.closest('.btn-ticket-use')) return;
            const idx = parseInt(card.getAttribute('data-idx'), 10);
            const myV = myVouchers[idx];
            if (!myV) return;
            showVoucherDetailModal(myV, user, true);
        });
    });
}

function renderMyVoucherCard(voucher, idx) {
    const createdDate = voucher.createdAt ? new Date(voucher.createdAt) : new Date();
    const expiresAt = voucher.expiresAt ? new Date(voucher.expiresAt) : new Date(createdDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiryLabel = expiresAt.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const discountStr = voucher.discountDisplay || 'Ưu đãi';

    return `
        <div class="my-voucher-ticket-card" data-idx="${idx}">
            <div class="my-ticket-stub">
                <span class="ticket-discount-num">${escapeHtml(discountStr)}</span>
                <span class="ticket-discount-tag">ĐÃ ĐỔI</span>
            </div>
            <div class="my-ticket-body">
                <div class="my-ticket-code-row">
                    <span class="my-ticket-code">${escapeHtml(voucher.code)}</span>
                    <span class="voucher-status-badge badge-available">Khả dụng</span>
                </div>
                <h4 class="my-ticket-name" title="${escapeHtml(voucher.name)}">${escapeHtml(voucher.name)}</h4>
                <div class="ticket-code-row">
                    <span class="my-ticket-meta">HSD: <strong>${escapeHtml(expiryLabel)}</strong></span>
                    <span class="ticket-detail-hint">Chi tiết &gt;</span>
                </div>
            </div>
            <div class="my-ticket-action">
                <button type="button" class="btn-ticket-copy" data-code="${escapeHtml(voucher.code)}">Sao chép</button>
                <a href="#orders" class="btn-ticket-use">Dùng ngay</a>
            </div>
        </div>
    `;
}

function renderVoucherCard(voucher, user) {
    const isOutOfStock = voucher.quantity <= 0;
    const isInsufficientPoints = user.points < voucher.pointsCost;

    let statusClass = 'available';
    let actionHtml = '';

    if (isOutOfStock) {
        statusClass = 'out-of-stock';
        actionHtml = `<span class="voucher-status-badge badge-out-of-stock">Đã hết quà</span>`;
    } else if (isInsufficientPoints) {
        statusClass = 'insufficient';
        actionHtml = `<span class="voucher-status-badge badge-locked">Cần ${voucher.pointsCost} pts</span>`;
    } else {
        actionHtml = `<button type="button" class="redeem-btn" data-id="${voucher.id}">Đổi ngay</button>`;
    }

    return `
        <div class="voucher-ticket-card ${statusClass}" data-id="${voucher.id}">
            <div class="ticket-stub">
                <span class="ticket-discount-num">${escapeHtml(voucher.discountDisplay || 'Ưu đãi')}</span>
                <span class="ticket-discount-tag">GIẢM GIÁ</span>
            </div>
            <div class="ticket-body">
                <div class="ticket-title-row">
                    <h4 class="ticket-title" title="${escapeHtml(voucher.name)}">${escapeHtml(voucher.name)}</h4>
                    <span class="ticket-points-badge">${voucher.pointsCost} pts</span>
                </div>
                <p class="ticket-terms" title="${escapeHtml(voucher.terms)}">${escapeHtml(voucher.terms)}</p>
                <div class="ticket-code-row">
                    <span class="ticket-code-sub">Mã: <code>${escapeHtml(voucher.code)}</code></span>
                    <span class="ticket-detail-hint">Chi tiết &gt;</span>
                </div>
            </div>
            <div class="ticket-action">
                ${actionHtml}
            </div>
        </div>
    `;
}

function showVoucherDetailModal(voucher, user, isMyVoucher = false) {
    const modalId = 'voucher-detail-modal';
    let modalEl = document.getElementById(modalId);
    if (!modalEl) {
        const modalHtml = `
            <div class="modal fade loyalty-modal-wrapper" id="${modalId}" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered loyalty-modal-dialog">
                    <div class="modal-content loyalty-modal-content">
                        <div class="modal-header loyalty-modal-header">
                            <h5 class="modal-title loyalty-modal-title">Chi tiết mã giảm giá</h5>
                            <button type="button" class="btn-modal-close" data-bs-dismiss="modal" aria-label="Đóng">&times;</button>
                        </div>
                        <div class="modal-body loyalty-modal-body" id="voucherDetailModalBody">
                            <!-- Nội dung chi tiết voucher -->
                        </div>
                        <div class="modal-footer loyalty-modal-footer" id="voucherDetailModalFooter">
                            <!-- Nút thao tác -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById(modalId);
    }

    const raw = voucher._raw || {};
    const code = voucher.code || 'PAWPAL';
    const discountStr = voucher.discountDisplay || 'Ưu đãi';
    const name = voucher.name || 'Voucher Ưu Đãi';
    const pointsCost = voucher.pointsCost || 100;

    let discountDetailText = 'Giảm giá trực tiếp';
    if (raw.type === 'percentage' || (voucher.type === 'percentage')) {
        const val = raw.value || voucher.value || 15;
        const maxD = raw.maxDiscount ? ` (Tối đa ${new Intl.NumberFormat('vi-VN').format(raw.maxDiscount)}đ)` : '';
        discountDetailText = `Giảm ${val}% trên tổng hóa đơn${maxD}`;
    } else if (raw.type === 'fixed' || voucher.value) {
        const val = raw.value || voucher.value || 50000;
        discountDetailText = `Giảm trực tiếp ${new Intl.NumberFormat('vi-VN').format(val)}đ`;
    } else if (discountStr === 'FREE') {
        discountDetailText = 'Miễn phí hoàn toàn phí giao nhận thú cưng';
    }

    let minOrderText = 'Không giới hạn giá trị đơn hàng';
    if (raw.minOrderValue || voucher.minOrderValue) {
        const minVal = Number(raw.minOrderValue || voucher.minOrderValue);
        minOrderText = `Đơn hàng từ ${new Intl.NumberFormat('vi-VN').format(minVal)}đ`;
    }

    const applicableText = formatApplicableTerms(raw.applicableFor || voucher.applicableFor);

    let expiryText = '30 ngày kể từ thời điểm đổi voucher';
    if (isMyVoucher && voucher.expiresAt) {
        const exp = new Date(voucher.expiresAt);
        expiryText = `Đến hết ngày ${exp.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    }

    const bodyEl = document.getElementById('voucherDetailModalBody');
    const footerEl = document.getElementById('voucherDetailModalFooter');

    if (bodyEl) {
        const isInsufficientPoints = !isMyVoucher && user.points < pointsCost;
        const missingPoints = Math.max(0, pointsCost - user.points);

        bodyEl.innerHTML = `
            <div class="voucher-detail-header-card">
                <div class="voucher-detail-header-stub">
                    <span class="ticket-discount-num">${escapeHtml(discountStr)}</span>
                    <span class="ticket-discount-tag">${isMyVoucher ? 'VÍ CỦA TÔI' : 'GIẢM GIÁ'}</span>
                </div>
                <div class="voucher-detail-header-body">
                    <h4 class="voucher-detail-title">${escapeHtml(name)}</h4>
                    <div class="voucher-detail-code-row">
                        <span class="voucher-detail-code-badge">${escapeHtml(code)}</span>
                        <button type="button" class="btn-code-copy-inline" id="btnCopyModalCode" data-code="${escapeHtml(code)}">Sao chép</button>
                    </div>
                </div>
            </div>

            <table class="voucher-detail-spec-table">
                <tbody>
                    <tr>
                        <td class="spec-label">Mức giảm:</td>
                        <td class="spec-value">${escapeHtml(discountDetailText)}</td>
                    </tr>
                    <tr>
                        <td class="spec-label">Đơn tối thiểu:</td>
                        <td class="spec-value">${escapeHtml(minOrderText)}</td>
                    </tr>
                    <tr>
                        <td class="spec-label">Phạm vi áp dụng:</td>
                        <td class="spec-value">${escapeHtml(applicableText)}</td>
                    </tr>
                    <tr>
                        <td class="spec-label">Hạn sử dụng:</td>
                        <td class="spec-value">${escapeHtml(expiryText)}</td>
                    </tr>
                    ${!isMyVoucher ? `
                    <tr>
                        <td class="spec-label">Điểm quy đổi:</td>
                        <td class="spec-value">
                            <span style="color: #236B48; font-weight: 700;">${pointsCost} Paw Points</span>
                            ${isInsufficientPoints ? `<span style="font-size: 0.78rem; color: #734718; background: #F5E8D3; padding: 2px 7px; border-radius: 6px; margin-left: 6px; font-weight: 500;">Cần thêm ${missingPoints} pts (Bạn có ${user.points} pts)</span>` : ''}
                        </td>
                    </tr>
                    ` : `
                    <tr>
                        <td class="spec-label">Trạng thái:</td>
                        <td class="spec-value"><span class="voucher-status-badge badge-available">Khả dụng trong ví</span></td>
                    </tr>
                    `}
                </tbody>
            </table>

            <div class="voucher-instructions-box">
                <div class="voucher-instructions-title">Hướng dẫn sử dụng mã:</div>
                <ol>
                    <li>Sao chép mã giảm giá hoặc đổi mã vào ví voucher cá nhân.</li>
                    <li>Áp dụng mã tại bước Đặt lịch dịch vụ hoặc Thanh toán đơn hàng mua sắm.</li>
                    <li>Mỗi đơn hàng được áp dụng 01 mã voucher ưu đãi hợp lệ.</li>
                </ol>
            </div>
        `;

        const btnCopyInline = bodyEl.querySelector('#btnCopyModalCode');
        if (btnCopyInline) {
            btnCopyInline.onclick = () => {
                navigator.clipboard.writeText(code).then(() => {
                    showToast('success', `Đã sao chép mã: ${code}`);
                }).catch(() => {
                    showToast('info', `Mã voucher: ${code}`);
                });
            };
        }
    }

    if (footerEl) {
        if (isMyVoucher) {
            footerEl.innerHTML = `
                <button type="button" class="btn-modal-cancel" data-bs-dismiss="modal">Đóng</button>
                <button type="button" class="btn-modal-cancel" id="btnModalCopyAction" style="background: #ffffff; color: #236B48; border-color: #236B48;">Sao chép mã</button>
                <a href="#orders" class="btn-modal-confirm text-decoration-none" id="btnModalUseNowAction">Dùng ngay</a>
            `;

            const btnModalCopy = footerEl.querySelector('#btnModalCopyAction');
            if (btnModalCopy) {
                btnModalCopy.onclick = () => {
                    navigator.clipboard.writeText(code).then(() => {
                        showToast('success', `Đã sao chép mã: ${code}`);
                    });
                };
            }

            const btnModalUseNow = footerEl.querySelector('#btnModalUseNowAction');
            if (btnModalUseNow) {
                btnModalUseNow.onclick = () => {
                    closeDetailModal();
                };
            }
        } else {
            const isOutOfStock = voucher.quantity <= 0;
            const isInsufficientPoints = user.points < pointsCost;

            if (isOutOfStock) {
                footerEl.innerHTML = `
                    <button type="button" class="btn-modal-cancel" data-bs-dismiss="modal">Đóng</button>
                    <button type="button" class="btn-modal-confirm" disabled style="background: #E2ECE5; color: #718E80; cursor: not-allowed; border: none;">Đã hết quà</button>
                `;
            } else if (isInsufficientPoints) {
                footerEl.innerHTML = `
                    <button type="button" class="btn-modal-cancel" data-bs-dismiss="modal">Đóng</button>
                    <button type="button" class="btn-modal-confirm" disabled style="background: #E2ECE5; color: #718E80; cursor: not-allowed; border: none;">Đổi ngay (${pointsCost} pts)</button>
                `;
            } else {
                footerEl.innerHTML = `
                    <button type="button" class="btn-modal-cancel" data-bs-dismiss="modal">Đóng</button>
                    <button type="button" class="btn-modal-confirm" id="btnModalRedeemAction">Đổi ngay (${pointsCost} pts)</button>
                `;

                const btnModalRedeem = footerEl.querySelector('#btnModalRedeemAction');
                if (btnModalRedeem) {
                    btnModalRedeem.onclick = () => {
                        closeDetailModal();
                        triggerRedeem(voucher, user);
                    };
                }
            }
        }
    }

    const openDetailModal = () => {
        if (modalEl.parentNode !== document.body) {
            document.body.appendChild(modalEl);
        }
        modalEl.classList.add('show');
        modalEl.style.display = 'flex';
        modalEl.removeAttribute('aria-hidden');
        document.body.classList.add('modal-open');
    };

    const closeDetailModal = () => {
        modalEl.classList.remove('show');
        modalEl.style.display = 'none';
        modalEl.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    };

    modalEl.querySelectorAll('[data-bs-dismiss="modal"], .btn-modal-close').forEach(btn => {
        btn.onclick = closeDetailModal;
    });

    modalEl.onclick = (e) => {
        if (e.target === modalEl) closeDetailModal();
    };

    openDetailModal();
}

function triggerRedeem(voucherInfo, user) {
    if (user.is_temporary) {
        showSecurityModal(voucherInfo.id);
        return;
    }

    const modalId = 'redeem-confirm-modal';
    let modalEl = document.getElementById(modalId);
    if (!modalEl) {
        const modalHtml = `
            <div class="modal fade loyalty-modal-wrapper" id="${modalId}" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered loyalty-modal-dialog">
                    <div class="modal-content loyalty-modal-content">
                        <div class="modal-header loyalty-modal-header">
                            <h5 class="modal-title loyalty-modal-title">Xác nhận đổi ưu đãi</h5>
                            <button type="button" class="btn-modal-close" data-bs-dismiss="modal" aria-label="Đóng">&times;</button>
                        </div>
                        <div class="modal-body loyalty-modal-body" id="redeemModalBody">
                            <!-- Nội dung xác nhận -->
                        </div>
                        <div class="modal-footer loyalty-modal-footer">
                            <button type="button" class="btn-modal-cancel" data-bs-dismiss="modal">Để sau</button>
                            <button type="button" class="btn-modal-confirm" id="btnConfirmRedeemAction">Xác nhận đổi</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById(modalId);
    }

    const bodyEl = document.getElementById('redeemModalBody');
    if (bodyEl) {
        bodyEl.innerHTML = `
            <p>Bạn có chắc chắn muốn sử dụng <strong>${voucherInfo.pointsCost} Paw Points</strong> để đổi lấy <strong>${escapeHtml(voucherInfo.name)}</strong>?</p>
            <p class="text-muted small mb-0">Điểm sau khi đổi sẽ được trừ trực tiếp và mã ưu đãi sẽ được lưu vào mục Voucher của tôi.</p>
        `;
    }

    const openModal = () => {
        if (modalEl.parentNode !== document.body) {
            document.body.appendChild(modalEl);
        }
        modalEl.classList.add('show');
        modalEl.style.display = 'flex';
        modalEl.removeAttribute('aria-hidden');
        document.body.classList.add('modal-open');
    };

    const closeModal = () => {
        modalEl.classList.remove('show');
        modalEl.style.display = 'none';
        modalEl.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    };

    modalEl.querySelectorAll('[data-bs-dismiss="modal"], .btn-modal-close, .btn-modal-cancel').forEach(btn => {
        btn.onclick = closeModal;
    });

    modalEl.onclick = (e) => {
        if (e.target === modalEl) closeModal();
    };

    const btnConfirm = document.getElementById('btnConfirmRedeemAction');
    if (btnConfirm) {
        btnConfirm.onclick = () => {
            closeModal();
            doRedeem(voucherInfo, user);
        };
    }

    openModal();
}

async function doRedeem(voucherInfo, user) {
    if (user.points >= voucherInfo.pointsCost) {
        user.points -= voucherInfo.pointsCost;
        setCurrentUser(user);

        // Đồng bộ trừ điểm sang pawpal_admin_customers_data và ghi lịch sử Pawpoint
        try {
            const cleanPhone = (user.phone || '').replace(/[^0-9]/g, '');
            const syncAdminData = (storage) => {
                const raw = storage.getItem('pawpal_admin_customers_data');
                if (raw) {
                    const data = JSON.parse(raw);
                    const matched = Object.values(data).find(c => c.phone && c.phone.replace(/[^0-9]/g, '') === cleanPhone);
                    if (matched) {
                        matched.points = user.points;
                        storage.setItem('pawpal_admin_customers_data', JSON.stringify(data));
                    }
                }
            };
            syncAdminData(sessionStorage);
            syncAdminData(localStorage);

            // Thêm vào lịch sử giao dịch Pawpoint Admin
            const rawHist = localStorage.getItem('pawpal_admin_pawpoint_history') || sessionStorage.getItem('pawpal_admin_pawpoint_history');
            let hist = rawHist ? JSON.parse(rawHist) : [];
            const now = new Date();
            const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth()+1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            hist.unshift({
                id: 'PWH-' + String(hist.length + 1).padStart(3, '0'),
                time: timeStr,
                custId: user.id || 'CUST-001',
                custName: user.name || 'Khách hàng',
                phone: user.phone || '',
                type: 'SUB',
                points: voucherInfo.pointsCost,
                balance: user.points,
                reason: `Đổi ưu đãi: ${voucherInfo.name}`
            });
            localStorage.setItem('pawpal_admin_pawpoint_history', JSON.stringify(hist));
            sessionStorage.setItem('pawpal_admin_pawpoint_history', JSON.stringify(hist));
        } catch (e) {
            console.warn('Lỗi đồng bộ điểm voucher sang admin:', e);
        }

        const newVoucherCode = voucherInfo.code || ('PAW-' + Math.random().toString(36).substring(2, 8).toUpperCase());
        const myVouchers = getStoredMyVouchers();
        const newVoucherItem = {
            id: 'MY-VOUCHER-' + Date.now(),
            code: newVoucherCode,
            name: voucherInfo.name,
            discountDisplay: voucherInfo.discountDisplay,
            pointsCost: voucherInfo.pointsCost,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'AVAILABLE'
        };
        myVouchers.unshift(newVoucherItem);
        saveStoredMyVouchers(myVouchers);

        // Update real-time UI
        const pointsDisplay = document.getElementById('current-points-display');
        if (pointsDisplay) {
            pointsDisplay.innerHTML = `${user.points} <span class="points-unit">Paw Points</span>`;
        }

        renderMyVouchers(user);
        renderLoyaltyPage(user, window.PawPalVoucherRedeemList || []);

        showToast('success', `Đổi điểm thành công! Mã ưu đãi của bạn: ${newVoucherCode}`);
    } else {
        showToast('error', `Số điểm hiện tại chưa đủ để đổi ưu đãi này.`);
    }
}

function showSecurityModal(voucherId) {
    let modalEl = document.getElementById('security-auth-modal');
    if (!modalEl) {
        const modalHtml = `
            <div class="modal fade loyalty-modal-wrapper" id="security-auth-modal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered loyalty-modal-dialog">
                    <div class="modal-content loyalty-modal-content">
                        <div class="modal-header loyalty-modal-header">
                            <h5 class="modal-title loyalty-modal-title">Bảo mật tài khoản</h5>
                            <button type="button" class="btn-modal-close" data-bs-dismiss="modal" aria-label="Đóng">&times;</button>
                        </div>
                        <div class="modal-body loyalty-modal-body">
                            <p>Bạn cần thiết lập mật khẩu tài khoản cá nhân để kích hoạt tính năng đổi điểm thưởng Paw Points.</p>
                        </div>
                        <div class="modal-footer loyalty-modal-footer">
                            <button type="button" class="btn-modal-cancel" data-bs-dismiss="modal">Để sau</button>
                            <a href="#settings" class="btn-modal-confirm text-decoration-none" id="btnRedirectSetupPwd">Thiết lập mật khẩu</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('security-auth-modal');
    }

    const openModal = () => {
        if (modalEl.parentNode !== document.body) {
            document.body.appendChild(modalEl);
        }
        modalEl.classList.add('show');
        modalEl.style.display = 'flex';
        modalEl.removeAttribute('aria-hidden');
        document.body.classList.add('modal-open');
    };

    const closeModal = () => {
        modalEl.classList.remove('show');
        modalEl.style.display = 'none';
        modalEl.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    };

    modalEl.querySelectorAll('[data-bs-dismiss="modal"], .btn-modal-close, .btn-modal-cancel').forEach(btn => {
        btn.onclick = closeModal;
    });

    const btnRedirect = document.getElementById('btnRedirectSetupPwd');
    if (btnRedirect) {
        btnRedirect.onclick = () => {
            closeModal();
        };
    }

    modalEl.onclick = (e) => {
        if (e.target === modalEl) closeModal();
    };

    openModal();
}

export const init = initLoyalty;

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLoyalty);
} else {
    initLoyalty();
}
