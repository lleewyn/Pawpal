/**
 * MODULE CẤU HÌNH HỆ THỐNG (PAWPAL ADMIN)
 * Tuân thủ nghiêm ngặt 100% AGENTS.md và ADMIN_DESIGN_SYSTEM.md:
 * - 3 Subtabs Header Bar: Banner và Khuyến mãi | Quản lý Nội dung | Cấu hình Hệ thống (Text-only, phân tách bởi '|')
 * - Tự động đồng bộ State và Hash (#tab-banner-promos, #tab-content-management, #tab-system-config)
 * - Subtab 1: Quản lý Banner, Bảng Voucher, Chính sách PawPoints, Thông báo Website
 * - Subtab 2: Quản lý Blog và Cẩm nang (Tạo, Sửa, Lọc theo Danh mục và Trạng thái)
 * - Subtab 3: 4 Card Cấu hình vận hành (Thanh toán, Giao hàng, Đặt lịch, Kết nối đối tác)
 */

(function initSettingsModule() {
    console.log('Khởi tạo Module Cấu hình Hệ thống...');

    // Helper: Hiển thị Toast Notification nhẹ nhàng chuẩn AGENTS.md
    function showToast(message, type = 'info') {
        let container = document.getElementById('adminToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'adminToastContainer';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        const bgColors = {
            success: '#DCEEE2',
            warning: '#F5E8D3',
            danger: '#F7DCDC',
            info: '#DCEAF2'
        };
        const textColors = {
            success: '#165335',
            warning: '#734718',
            danger: '#8F2424',
            info: '#20495E'
        };

        const bg = bgColors[type] || bgColors.info;
        const color = textColors[type] || textColors.info;

        toast.style.cssText = `
            background: ${bg};
            color: ${color};
            padding: 10px 16px;
            border-radius: 9px;
            font-size: 13px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            pointer-events: auto;
            transition: opacity 0.25s ease, transform 0.25s ease;
            opacity: 0;
            transform: translateY(-8px);
            max-width: 380px;
            line-height: 1.45;
            white-space: pre-line;
        `;
        toast.textContent = message;

        container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-8px)';
            setTimeout(() => toast.remove(), 250);
        }, 3500);
    }

    // Helper: Custom Confirm Modal cho phân hệ Cấu hình
    function showSettingsConfirmModal({ title = 'Xác nhận thao tác', message, onConfirm, onCancel, confirmText = 'Đồng ý', isDanger = false }) {
        const modal = document.getElementById('modalConfirmSettingsAction');
        const titleEl = document.getElementById('confirmSettingsActionTitle');
        const msgEl = document.getElementById('confirmSettingsActionMessage');
        const btnAccept = document.getElementById('btnAcceptSettingsConfirm');
        const btnCancel = document.getElementById('btnCancelSettingsConfirm');
        const btnClose = document.getElementById('btnCloseConfirmSettingsModal');

        if (!modal) {
            if (window.confirm(message)) {
                if (typeof onConfirm === 'function') onConfirm();
            } else {
                if (typeof onCancel === 'function') onCancel();
            }
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (btnAccept) {
            btnAccept.textContent = confirmText;
            if (isDanger) {
                btnAccept.style.backgroundColor = '#DC2626';
                btnAccept.style.color = '#FFFFFF';
            } else {
                btnAccept.style.backgroundColor = '';
                btnAccept.style.color = '';
            }
        }

        const cleanup = () => {
            modal.classList.remove('active');
            if (btnAccept) btnAccept.onclick = null;
            if (btnCancel) btnCancel.onclick = null;
            if (btnClose) btnClose.onclick = null;
        };

        if (btnAccept) {
            btnAccept.onclick = () => {
                cleanup();
                if (typeof onConfirm === 'function') onConfirm();
            };
        }

        if (btnCancel) {
            btnCancel.onclick = () => {
                cleanup();
                if (typeof onCancel === 'function') onCancel();
            };
        }

        if (btnClose) {
            btnClose.onclick = () => {
                cleanup();
                if (typeof onCancel === 'function') onCancel();
            };
        }

        modal.classList.add('active');
    }

    // -------------------------------------------------------------
    // 1. DỮ LIỆU VÀ CƠ CHẾ LƯU TRỮ TẬP TRUNG (SSOT LOCALSTORAGE)
    // -------------------------------------------------------------
    const defaultBanners = [
        {
            id: 'bn-001',
            title: 'Ưu đãi Spa Mùa Hè 30%',
            cta: 'Đặt lịch ngay',
            url: '/pages/public/services/',
            startDate: '2026-09-01',
            endDate: '2026-09-30', // Sắp hết hạn trong 24 giờ (Zero Miss Alert)
            status: 'active',
            imageText: 'Banner_Spa_Summer.jpg'
        },
        {
            id: 'bn-002',
            title: 'Khai trương diện mạo mới PawPal',
            cta: 'Xem chi tiết',
            url: '/pages/public/about/',
            startDate: '2026-05-01',
            endDate: '2026-12-31',
            status: 'active',
            imageText: 'Banner_Grand_Opening.jpg'
        },
        {
            id: 'bn-003',
            title: 'Combo Khách sạn Thú cưng VIP',
            cta: 'Giữ phòng ngay',
            url: '/pages/public/services/#hotel',
            startDate: '2026-04-10',
            endDate: '2026-11-10',
            status: 'paused',
            imageText: 'Banner_Pet_Hotel.jpg'
        }
    ];

    const defaultVouchers = [
        {
            code: 'PAWPAL30K',
            name: 'Giảm 30K cho đơn hàng đầu tiên',
            type: 'fixed',
            target: 'Shop',
            value: 30000,
            minOrder: 150000,
            limit: 200,
            used: 86,
            validDate: 'Đến 31/12/2026',
            status: 'active'
        },
        {
            code: 'SPASUMMER20',
            name: 'Ưu đãi 20% Dịch vụ Spa và Grooming',
            type: 'percent',
            target: 'Spa',
            value: 20,
            minOrder: 200000,
            limit: 100,
            used: 96, // Còn 4 lượt -> Sắp cạn quota khẩn cấp (Zero Miss Alert)
            validDate: 'Đến 30/10/2026',
            status: 'active'
        },
        {
            code: 'HOTELVIP50',
            name: 'Giảm 50K gửi Pet Hotel từ 3 ngày',
            type: 'fixed',
            target: 'Hotel',
            value: 50000,
            minOrder: 500000,
            limit: 50,
            used: 50, // Đã hết 100% lượt phát hành (Zero Miss Alert)
            validDate: 'Đến 15/11/2026',
            status: 'expired'
        },
        {
            code: 'FREESHIPQ1',
            name: 'Miễn phí giao hàng nội thành',
            type: 'fixed',
            target: 'System',
            value: 25000,
            minOrder: 300000,
            limit: 500,
            used: 120,
            validDate: 'Đến 31/12/2026',
            status: 'active'
        }
    ];

    const defaultNotifications = [
        {
            id: 'notif-1',
            content: 'PawPal mở rộng khung giờ phục vụ Spa đến 21:00 các ngày cuối tuần!',
            type: 'Top-bar',
            status: 'active'
        },
        {
            id: 'notif-2',
            content: 'Thông báo: PawPal tạm ngưng dịch vụ Pet Taxi từ 12:00 - 14:00 để bảo dưỡng phương tiện đón trả.',
            type: 'Popup',
            status: 'active'
        }
    ];

    const defaultArticles = [
        {
            id: 'art-001',
            title: '5 Dấu hiệu nhận biết bé cún của bạn đang bị sốc nhiệt mùa hè',
            author: 'Chuyên viên Chăm sóc Minh Anh',
            category: 'Chó',
            views: 1420,
            status: 'published',
            updatedAt: '25/09/2026',
            summary: 'Hướng dẫn sơ cứu khẩn cấp khi thú cưng bị thở dốc, mắt lờ đờ hoặc mệt mỏi trong thời tiết nắng nóng oi bức.',
            ragSynced: true,
            ragKeywords: ['Sốc nhiệt', 'Sơ cứu cún', 'Thời tiết nóng', 'Hạ nhiệt an toàn'],
            ragSummary: 'Cung cấp hướng dẫn sơ cứu nhanh cho cún bị sốc nhiệt: đưa vào bóng râm, dùng khăn mát lau bàn chân và nách, cho uống nước mát từng ngụm nhỏ, lập tức đưa đến cơ sở thú y gần nhất nếu hôn mê.'
        },
        {
            id: 'art-002',
            title: 'Chế độ dinh dưỡng khoa học giúp lông mèo mềm mượt giảm rụng',
            author: 'Chuyên viên Dinh dưỡng PawPal',
            category: 'Dinh dưỡng',
            views: 980,
            status: 'published',
            updatedAt: '22/09/2026',
            summary: 'Bổ sung Omega 3, kẽm và dầu cá hồi đúng cách vào khẩu phần ăn hàng ngày của các bé mèo cưng.',
            ragSynced: true,
            ragKeywords: ['Dinh dưỡng mèo', 'Mượt lông', 'Omega 3', 'Dầu cá hồi', 'Giảm rụng lông'],
            ragSummary: 'Khuyến nghị bổ sung acid béo Omega 3 và Omega 6, kẽm hữu cơ từ dầu cá hồi Na Uy. Liều lượng 1-2 giọt mỗi bữa ăn giúp da khỏe và giảm rụng lông 60% sau 4 tuần.'
        },
        {
            id: 'art-003',
            title: 'Kinh nghiệm lần đầu gửi bé tại Khách sạn thú cưng Pet Hotel',
            author: 'Ban Quản lý PawPal',
            category: 'Mẹo chăm sóc',
            views: 650,
            status: 'published',
            updatedAt: '18/09/2026',
            summary: 'Những vật dụng cần mang theo và cách giúp bé nhanh chóng làm quen với môi trường lưu trú mới.',
            ragSynced: false,
            ragKeywords: ['Pet Hotel', 'Khách sạn thú cưng', 'Lưu trú', 'Chuẩn bị đồ dùng'],
            ragSummary: 'Checklist gửi thú cưng: sổ tiêm ngừa đầy đủ, thức ăn quen thuộc, đồ chơi yêu thích có mùi quen thuộc. Quy trình check-in và gửi hình ảnh camera 24/7 cho chủ nuôi.'
        },
        {
            id: 'art-004',
            title: 'Quy trình khử trùng và vệ sinh lồng sấy chuẩn quốc tế tại PawPal',
            author: 'Đội ngũ Kỹ thuật viên',
            category: 'Grooming',
            views: 310,
            status: 'draft',
            updatedAt: '15/09/2026',
            summary: 'Minh bạch quy trình bảo đảm an toàn sức khỏe tuyệt đối cho thú cưng khi sử dụng dịch vụ tại cửa hàng.',
            ragSynced: false,
            ragKeywords: ['Grooming', 'Khử trùng tia UV', 'Lồng sấy thông minh', 'Vệ sinh spa'],
            ragSummary: 'Tiêu chuẩn vô trùng thiết bị Spa tại PawPal bằng đèn UV-C và dung dịch khử khuẩn sinh học chuyên dụng sau mỗi lượt thú cưng, kiểm soát độ ẩm và nhiệt độ sấy an toàn 38 độ C.'
        }
    ];

    const defaultAuditLogs = [
        {
            time: '29/09/2026 14:15',
            actor: 'Quản trị viên (Admin)',
            targetModules: 'Khách hàng và Bán hàng',
            actionText: 'Tỷ lệ PawPoints: 1 điểm = 100 VNĐ (Khấu trừ thanh toán)',
            status: 'Đã đồng bộ SSOT'
        },
        {
            time: '28/09/2026 09:30',
            actor: 'Quản trị viên (Admin)',
            targetModules: 'Dịch vụ và Nhân sự',
            actionText: 'Thời gian hủy miễn phí: 2 giờ → 4 giờ',
            status: 'Đã đồng bộ SSOT'
        },
        {
            time: '25/09/2026 16:45',
            actor: 'Quản trị viên (Admin)',
            targetModules: 'Bán hàng',
            actionText: 'Kích hoạt phương thức thanh toán VNPay QR',
            status: 'Đã đồng bộ SSOT'
        }
    ];

    // Khởi tạo các biến lấy từ localStorage nếu có, nếu chưa thì nạp default
    function getStoredItem(key, fallback) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : fallback;
        } catch (e) {
            return fallback;
        }
    }

    function setStoredItem(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
            window.dispatchEvent(new Event('pawpal_settings_updated'));
        } catch (e) {
            console.error('Lỗi lưu cấu hình vào localStorage:', e);
        }
    }

    const defaultSystemConfig = {
        storeInfo: {
            brandName: 'PawPal Pet Center',
            companyName: 'CÔNG TY CỔ PHẦN PAWPAL VIỆT NAM',
            hotline: '1900 888 999',
            emergencyPhone: '0901 234 567',
            email: 'cskh@pawpal.vn',
            address: '120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh',
            taxId: '0316889988',
            zaloUrl: 'https://zalo.me/0901234567',
            facebookUrl: 'https://facebook.com/pawpalvietnam'
        },
        operatingHours: {
            weekday: { open: '08:00', close: '20:00' },
            weekend: { open: '08:00', close: '21:00' },
            holidayNotice: 'Mở cửa phục vụ xuyên suốt tất cả các ngày lễ và Tết Nguyên Đán.'
        },
        hotelRules: {
            checkInTime: '14:00',
            checkOutTime: '12:00',
            lateCheckOutFeePerHalfDay: 100000,
            includedMealsPerDay: 3,
            cameraAccessEnabled: true
        },
        bookingPolicy: {
            freeCancelHours: 4,
            lateCancelFee: 50000,
            allowPickStaff: true,
            slotCapacityMax: 4,
            timeSlots: ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']
        },
        shippingPolicy: {
            freeShippingThreshold: 300000,
            innerCityFee: 25000,
            outerCityFee: 35000,
            expressFee: 45000,
            primaryPartner: 'ghn',
            partnerName: 'Giao Hàng Nhanh (GHN Express)',
            shopId: 'PAWPAL_Q1_STORE',
            apiKey: 'ghn_prod_secret_token_12345'
        },
        paymentMethods: {
            cod: { enabled: true, name: 'Thanh toán khi nhận hàng (COD)', fee: 0 },
            bank: {
                enabled: true,
                name: 'Chuyển khoản QR Banking',
                bankName: 'vietcombank',
                accountNumber: '999888666',
                accountHolder: 'CONG TY CP PAWPAL VIET NAM',
                syntax: 'PAWPAL [MA_DON_HANG] [SDT]'
            },
            momo: { enabled: true, name: 'Ví điện tử MoMo', merchantId: 'MOMO_PAWPAL_PROD' },
            vnpay: { enabled: true, name: 'Cổng thanh toán VNPay', tmnCode: 'PAWPALVN' }
        },
        pawpointsPolicy: {
            pointValueVnd: 100,
            spendToPointsRatio: 10000,
            registerBonus: 50,
            firstOrderBonus: 100,
            firstBookingBonus: 100,
            birthdayBonus: 200
        }
    };

    let mockBanners = getStoredItem('pawpal_settings_banners', defaultBanners);
    let mockVouchers = getStoredItem('pawpal_settings_vouchers', defaultVouchers);
    let mockNotifications = getStoredItem('pawpal_settings_notices', defaultNotifications);
    let mockArticles = getStoredItem('pawpal_settings_articles', defaultArticles);
    let mockAuditLogs = getStoredItem('pawpal_settings_audit_logs', defaultAuditLogs);
    let mockSystemConfig = getStoredItem('pawpal_settings_system_config', defaultSystemConfig);

    // -------------------------------------------------------------
    // 2. KHỞI TẠO SUBTABS TRÊN HEADER BAR (CHUẨN AGENTS.MD)
    // -------------------------------------------------------------
    const subtabsContainer = document.getElementById('headerSubtabsGroup');
    const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');

    function renderHeaderSubtabs(activeTabId) {
        if (!subtabsContainer) return;
        subtabsContainer.innerHTML = `
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-banner-promos' ? 'active' : ''}" data-tab="tab-banner-promos">Banner và Khuyến mãi</button>
            <span class="subtab-divider">|</span>
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-content-management' ? 'active' : ''}" data-tab="tab-content-management">Quản lý Nội dung</button>
            <span class="subtab-divider">|</span>
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-system-config' ? 'active' : ''}" data-tab="tab-system-config">Cấu hình Hệ thống</button>
            <span class="subtab-divider">|</span>
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-audit-logs' ? 'active' : ''}" data-tab="tab-audit-logs">Nhật ký Cấu hình</button>
        `;

        subtabsContainer.querySelectorAll('.header-subtab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                switchSubtab(tab);
            });
        });
    }

    function switchSubtab(tabId) {
        document.querySelectorAll('.settings-module-wrapper .subtab-content').forEach(sec => {
            sec.classList.remove('active');
        });

        const activeSec = document.getElementById(`subtab-${tabId}`);
        if (activeSec) activeSec.classList.add('active');

        renderHeaderSubtabs(tabId);
        window.location.hash = `#${tabId}`;
        sessionStorage.setItem('pawpal_admin_settings_subtab', tabId);

        if (deepBreadcrumbEl) deepBreadcrumbEl.innerHTML = '';

        if (tabId === 'tab-banner-promos') {
            renderZeroMissAlerts();
            renderBanners();
            renderVouchers();
            renderNotifications();
        } else if (tabId === 'tab-content-management') {
            renderArticles();
        } else if (tabId === 'tab-system-config') {
            renderSystemConfigCards();
        } else if (tabId === 'tab-audit-logs') {
            renderAuditLogs();
        }
    }

    // -------------------------------------------------------------
    // 3. LOGIC GIÁM SÁT ZERO MISS VÀ CẢNH BÁO KHẨN CẤP (GIAI ĐOẠN 1)
    // -------------------------------------------------------------
    let currentActiveVoucherCode = null;

    function isBannerExpiring(banner) {
        if (banner.status !== 'active') return false;
        // Kiểm tra banner có ngày kết thúc trước hoặc trong ngày 2026-10-01 (còn <= 24h - 48h)
        return banner.endDate <= '2026-10-01';
    }

    function isVoucherZeroMiss(voucher) {
        // Hết sạch lượt dùng
        if (voucher.used >= voucher.limit) return true;
        // Còn dưới 10 lượt và đang hoạt động
        if (voucher.status === 'active' && (voucher.limit - voucher.used <= 10)) return true;
        return false;
    }

    function renderZeroMissAlerts() {
        const warnVouchers = mockVouchers.filter(isVoucherZeroMiss);
        const warnBanners = mockBanners.filter(isBannerExpiring);
        const totalAlerts = warnVouchers.length + warnBanners.length;

        // Cập nhật các thẻ KPI nhanh
        const statZeroMissEl = document.getElementById('statZeroMissAlerts');
        if (statZeroMissEl) statZeroMissEl.textContent = totalAlerts;

        const statTotalEl = document.getElementById('statTotalVouchers');
        if (statTotalEl) statTotalEl.textContent = mockVouchers.length;

        const statActiveEl = document.getElementById('statActiveVouchers');
        if (statActiveEl) statActiveEl.textContent = mockVouchers.filter(v => v.status === 'active').length;

        const statBannerEl = document.getElementById('statActiveBanners');
        if (statBannerEl) statBannerEl.textContent = mockBanners.filter(b => b.status === 'active').length;

        // Cập nhật Thanh Cảnh Báo Zero Miss Strip
        const alertBar = document.getElementById('settingsAlertBar');
        const alertMsg = document.getElementById('alertStripMessage');
        const btnFilter = document.getElementById('btnFilterZeroMiss');

        if (alertBar && alertMsg) {
            if (totalAlerts > 0) {
                alertBar.classList.remove('is-safe');
                alertMsg.innerHTML = `Có <strong>${warnVouchers.length} Voucher</strong> sắp cạn hoặc hết quota và <strong>${warnBanners.length} Banner</strong> sắp hết hạn trong 24 giờ. Cần gia hạn ngay để không đứt gãy luồng khách hàng!`;
                if (btnFilter) {
                    btnFilter.textContent = 'Lọc mục cần xử lý';
                    btnFilter.style.display = 'inline-flex';
                }
            } else {
                alertBar.classList.add('is-safe');
                alertMsg.innerHTML = 'Toàn bộ Voucher và Banner đang trong hạn mức an toàn. Hệ thống vận hành ổn định không rủi ro!';
                if (btnFilter) {
                    btnFilter.textContent = 'Xem tất cả Voucher';
                }
            }
        }
    }

    // -------------------------------------------------------------
    // 4. RENDER SUB-TAB 1: BANNER, VOUCHER, PAWPOINTS, NOTICES
    // -------------------------------------------------------------
    function renderBanners() {
        const container = document.getElementById('bannerCardsContainer');
        if (!container) return;

        container.innerHTML = '';
        mockBanners.forEach(b => {
            const isExpiring = isBannerExpiring(b);
            const card = document.createElement('div');
            card.className = 'banner-item-card';

            const alertTagHtml = isExpiring
                ? `<div style="margin-top: 4px;"><span class="banner-alert-tag">Hết hạn trong 24h</span></div>`
                : '';

            const extendBtnHtml = isExpiring
                ? `<button type="button" class="banner-action-btn btn-extend-banner" data-id="${b.id}" style="color: #236B48; border-color: #C3DEC7; background-color: #F4FAF6;">Gia hạn 30 ngày</button>`
                : '';

            card.innerHTML = `
                <div class="banner-preview-img">${b.imageText}</div>
                <div class="banner-card-info">
                    <span class="banner-card-title">${b.title}</span>
                    <span class="banner-card-meta">CTA: <strong>${b.cta}</strong> | Link: ${b.url}</span>
                    <span class="banner-card-meta">Hiệu lực: ${b.startDate} đến ${b.endDate}</span>
                    ${alertTagHtml}
                </div>
                <div class="banner-card-actions">
                    <span class="admin-badge ${b.status === 'active' ? 'badge-active' : 'badge-neutral'}">${b.status === 'active' ? 'Đang bật' : 'Tạm tắt'}</span>
                    <div style="display: flex; gap: 6px;">
                        ${extendBtnHtml}
                        <button type="button" class="banner-action-btn btn-edit-banner" data-id="${b.id}">Sửa</button>
                        <button type="button" class="banner-action-btn btn-toggle-banner ${b.status === 'active' ? 'is-pause' : 'is-enable'}" data-id="${b.id}">${b.status === 'active' ? 'Tắt' : 'Bật'}</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        // Bắt sự kiện bật/tắt banner
        container.querySelectorAll('.btn-toggle-banner').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const banner = mockBanners.find(i => i.id === id);
                if (banner) {
                    banner.status = banner.status === 'active' ? 'paused' : 'active';
                    setStoredItem('pawpal_settings_banners', mockBanners);
                    renderBanners();
                    renderZeroMissAlerts();
                }
            });
        });

        // Bắt sự kiện một chạm gia hạn banner 30 ngày
        container.querySelectorAll('.btn-extend-banner').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const banner = mockBanners.find(i => i.id === id);
                if (banner) {
                    banner.endDate = '2026-10-30';
                    setStoredItem('pawpal_settings_banners', mockBanners);
                    renderBanners();
                    renderZeroMissAlerts();
                    showToast(`Đã gia hạn Banner "${banner.title}" thêm 30 ngày thành công! Hiệu lực mới đến ngày ${banner.endDate}.`, 'success');
                }
            });
        });
    }

    function renderVouchers() {
        const tbody = document.getElementById('vouchersTableBody');
        if (!tbody) return;

        const keyword = (document.getElementById('searchVoucherInput')?.value || '').toLowerCase().trim();
        const targetFilter = document.getElementById('filterVoucherTarget')?.value || 'all';
        const statusFilter = document.getElementById('filterVoucherStatus')?.value || 'all';

        const filtered = mockVouchers.filter(v => {
            if (targetFilter !== 'all' && v.target !== targetFilter) return false;
            
            if (statusFilter === 'zero-miss') {
                if (!isVoucherZeroMiss(v)) return false;
            } else if (statusFilter !== 'all' && v.status !== statusFilter) {
                return false;
            }

            if (keyword) {
                return v.code.toLowerCase().includes(keyword) || v.name.toLowerCase().includes(keyword);
            }
            return true;
        });

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 24px; color: var(--text-muted);">Không tìm thấy voucher phù hợp.</td></tr>`;
            return;
        }

        filtered.forEach(v => {
            let statusBadge = '';
            if (v.status === 'active') statusBadge = '<span class="admin-badge badge-active">Hoạt động</span>';
            else if (v.status === 'paused') statusBadge = '<span class="admin-badge badge-warning">Tạm dừng</span>';
            else statusBadge = '<span class="admin-badge badge-neutral">Hết hạn</span>';

            const discountDisp = v.type === 'percent' ? `${v.value}%` : `${v.value.toLocaleString('vi-VN')} VNĐ`;

            // Xác định vạch cảnh báo mép trái duy nhất trên dòng bảng
            let rowAlertClass = '';
            let quotaDisplay = `${v.used}/${v.limit}`;

            if (v.used >= v.limit) {
                rowAlertClass = 'row-alert-danger';
                quotaDisplay = `<strong>${v.used}/${v.limit}</strong><span style="display:block; font-size:11.5px; color:#DC2626; font-weight:600;">Hết sạch lượt</span>`;
            } else if (v.status === 'active' && (v.limit - v.used <= 10)) {
                rowAlertClass = 'row-alert-warning';
                quotaDisplay = `<strong>${v.used}/${v.limit}</strong><span style="display:block; font-size:11.5px; color:#D97706; font-weight:600;">Còn ${v.limit - v.used} lượt</span>`;
            }

            const tr = document.createElement('tr');
            if (rowAlertClass) tr.className = rowAlertClass;

            tr.innerHTML = `
                <td><strong style="color: #236B48;">${v.code}</strong></td>
                <td>${v.name}</td>
                <td>${v.type === 'percent' ? 'Giảm %' : 'Giảm tiền'}</td>
                <td><span class="admin-badge badge-neutral">${v.target}</span></td>
                <td><strong>${discountDisp}</strong></td>
                <td>${v.minOrder > 0 ? v.minOrder.toLocaleString('vi-VN') + ' đ' : 'Không'}</td>
                <td>${quotaDisplay}</td>
                <td>${v.validDate}</td>
                <td>${statusBadge}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn-action-trigger btn-voucher-more" data-code="${v.code}" title="Tác vụ">•••</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Bắt sự kiện click nút 3 chấm để mở dropdown
        tbody.querySelectorAll('.btn-voucher-more').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const code = btn.getAttribute('data-code');
                openVoucherActionMenu(e.currentTarget, code);
            });
        });
    }

    function openVoucherActionMenu(triggerBtn, code) {
        currentActiveVoucherCode = code;
        const dropdown = document.getElementById('voucherActionDropdown');
        if (!dropdown) return;

        const rect = triggerBtn.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${Math.max(10, rect.right - 195)}px`;
        dropdown.style.display = 'flex';
    }

    function closeVoucherActionMenu() {
        const dropdown = document.getElementById('voucherActionDropdown');
        if (dropdown) dropdown.style.display = 'none';
        currentActiveVoucherCode = null;
    }

    function renderNotifications() {
        const container = document.getElementById('notificationsListContainer');
        if (!container) return;

        container.innerHTML = '';
        if (mockNotifications.length === 0) {
            container.innerHTML = '<div style="padding: 16px; text-align: center; color: var(--text-muted); font-size: 13px;">Chưa có thông báo nào.</div>';
            return;
        }

        // Cập nhật thanh Xem trước Top-bar thời gian thực
        const activeTopbar = mockNotifications.find(n => n.type === 'Top-bar' && n.status === 'active');
        const prevTextEl = document.getElementById('topbarLivePreviewText');
        const prevBarEl = document.getElementById('topbarLivePreviewBar');
        if (prevTextEl && prevBarEl) {
            if (activeTopbar) {
                prevTextEl.textContent = activeTopbar.content;
                prevBarEl.style.opacity = '1';
            } else {
                prevTextEl.textContent = '(Hiện không có thông báo Top-bar nào đang kích hoạt)';
                prevBarEl.style.opacity = '0.6';
            }
        }

        mockNotifications.forEach(n => {
            const isAct = n.status === 'active';
            const statusBadge = isAct
                ? '<span class="admin-badge badge-active">Đang hiện</span>'
                : '<span class="admin-badge badge-neutral">Tạm tắt</span>';

            const row = document.createElement('div');
            row.className = 'notification-row-item';
            row.innerHTML = `
                <span class="notice-content-text" style="flex: 1;">${n.content}</span>
                <span class="admin-badge badge-neutral">${n.type}</span>
                ${statusBadge}
                <div style="display: flex; gap: 8px; align-items: center; margin-left: 8px;">
                    <button type="button" class="btn-text-action btn-toggle-notice" data-id="${n.id}">
                        ${isAct ? 'Tạm tắt' : 'Kích hoạt'}
                    </button>
                    <button type="button" class="btn-text-action text-danger btn-delete-notice" data-id="${n.id}">
                        Xóa
                    </button>
                </div>
            `;
            container.appendChild(row);
        });

        // Gắn sự kiện đổi trạng thái và xóa thông báo
        container.querySelectorAll('.btn-toggle-notice').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const notif = mockNotifications.find(item => item.id === id);
                if (notif) {
                    notif.status = notif.status === 'active' ? 'inactive' : 'active';
                    renderNotifications();
                }
            });
        });

        container.querySelectorAll('.btn-delete-notice').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const idx = mockNotifications.findIndex(item => item.id === id);
                if (idx !== -1) {
                    mockNotifications.splice(idx, 1);
                    renderNotifications();
                }
            });
        });
    }

    // -------------------------------------------------------------
    // 5. RENDER SUB-TAB 2: BÀI VIẾT (BLOG VÀ CẨM NANG - GIAI ĐOẠN 3)
    // -------------------------------------------------------------
    let currentActiveArticleId = null;

    function renderArticles() {
        const tbody = document.getElementById('articlesTableBody');
        if (!tbody) return;

        const keyword = (document.getElementById('searchArticleInput')?.value || '').toLowerCase().trim();
        const catFilter = document.getElementById('filterArticleCategory')?.value || 'all';
        const statusFilter = document.getElementById('filterArticleStatus')?.value || 'all';

        const filtered = mockArticles.filter(a => {
            if (catFilter !== 'all' && a.category !== catFilter) return false;
            if (statusFilter !== 'all' && a.status !== statusFilter) return false;
            if (keyword) return a.title.toLowerCase().includes(keyword);
            return true;
        });

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 24px; color: var(--text-muted);">Không tìm thấy bài viết nào phù hợp.</td></tr>`;
            return;
        }

        filtered.forEach(a => {
            let statusBadge = '';
            if (a.status === 'published') statusBadge = '<span class="admin-badge badge-active">Công khai</span>';
            else if (a.status === 'draft') statusBadge = '<span class="admin-badge badge-neutral">Bản nháp</span>';
            else statusBadge = '<span class="admin-badge badge-warning">Tạm ẩn</span>';

            const ragBadge = a.ragSynced
                ? '<span class="admin-badge badge-active">Đã nạp RAG</span>'
                : '<span class="admin-badge badge-warning">Chưa nạp RAG</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div class="article-thumb-img">Ảnh bìa</div></td>
                <td><strong style="color: var(--text-main); font-size: 13.5px;">${a.title}</strong></td>
                <td>${a.author}</td>
                <td><span class="admin-badge badge-neutral">${a.category}</span></td>
                <td>${a.views.toLocaleString('vi-VN')}</td>
                <td>${ragBadge}</td>
                <td>${statusBadge}</td>
                <td>${a.updatedAt}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn-action-trigger btn-article-more" data-id="${a.id}" title="Tác vụ bài viết">•••</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Bắt sự kiện click nút 3 chấm để mở dropdown tác vụ bài viết
        tbody.querySelectorAll('.btn-article-more').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-id');
                openArticleActionMenu(e.currentTarget, id);
            });
        });

        updateArticleKpis();
    }

    function updateArticleKpis() {
        const total = mockArticles.length;
        const pub = mockArticles.filter(a => a.status === 'published').length;
        const draft = mockArticles.filter(a => a.status === 'draft').length;
        const hidden = mockArticles.filter(a => a.status === 'hidden').length;

        const tEl = document.getElementById('statTotalArticles');
        const pEl = document.getElementById('statPublishedArticles');
        const dEl = document.getElementById('statDraftArticles');
        const hEl = document.getElementById('statHiddenArticles');

        if (tEl) tEl.textContent = total;
        if (pEl) pEl.textContent = pub;
        if (dEl) dEl.textContent = draft;
        if (hEl) hEl.textContent = hidden;
    }

    function openArticleActionMenu(triggerBtn, articleId) {
        currentActiveArticleId = articleId;
        closeVoucherActionMenu();
        const dropdown = document.getElementById('articleActionDropdown');
        if (!dropdown) return;

        const rect = triggerBtn.getBoundingClientRect();
        dropdown.style.top = `${rect.bottom + 4}px`;
        dropdown.style.left = `${Math.max(10, rect.right - 210)}px`;
        dropdown.style.display = 'flex';
    }

    function closeArticleActionMenu() {
        const dropdown = document.getElementById('articleActionDropdown');
        if (dropdown) dropdown.style.display = 'none';
        currentActiveArticleId = null;
    }

    // -------------------------------------------------------------
    // 6. RENDER SUB-TAB 3: CẤU HÌNH HỆ THỐNG VÀ AUDIT LOG (GIAI ĐOẠN 2)
    // -------------------------------------------------------------
    let isSafeModeLocked = true;
    let pendingImpactCallback = null;

    function renderSystemConfigCards() {
        const cfg = mockSystemConfig;
        if (!cfg) return;

        // Card 1: Store Profile
        if (cfg.storeInfo) {
            const brandEl = document.getElementById('dispStoreBrand');
            const hotlineEl = document.getElementById('dispStoreHotline');
            const emailEl = document.getElementById('dispStoreEmail');
            const addrEl = document.getElementById('dispStoreAddress');
            const taxEl = document.getElementById('dispStoreTaxId');
            if (brandEl) brandEl.textContent = cfg.storeInfo.brandName || 'PawPal Pet Center';
            if (hotlineEl) hotlineEl.textContent = cfg.storeInfo.hotline || '1900 888 999';
            if (emailEl) emailEl.textContent = cfg.storeInfo.email || 'cskh@pawpal.vn';
            if (addrEl) addrEl.textContent = cfg.storeInfo.address || '120 Nguyễn Thị Minh Khai, P.6, Q.3, TP.HCM';
            if (taxEl) taxEl.textContent = cfg.storeInfo.taxId || '0316889988';
        }

        // Card 2: Payment Gateways
        if (cfg.paymentMethods) {
            const codBadge = document.getElementById('statusCodBadge');
            const bankBadge = document.getElementById('statusBankBadge');
            const momoBadge = document.getElementById('statusMomoBadge');
            const vnpayBadge = document.getElementById('statusVnpayBadge');
            const countBadge = document.getElementById('badgePaymentCount');

            let activeCount = 0;
            if (codBadge) {
                const en = Boolean(cfg.paymentMethods.cod?.enabled);
                codBadge.className = en ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
                codBadge.textContent = en ? 'Bật' : 'Tắt';
                if (en) activeCount++;
            }
            if (bankBadge) {
                const en = Boolean(cfg.paymentMethods.bank?.enabled);
                bankBadge.className = en ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
                bankBadge.textContent = en ? 'Bật' : 'Tắt';
                if (en) activeCount++;
            }
            if (momoBadge) {
                const en = Boolean(cfg.paymentMethods.momo?.enabled);
                momoBadge.className = en ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
                momoBadge.textContent = en ? 'Bật' : 'Tắt';
                if (en) activeCount++;
            }
            if (vnpayBadge) {
                const en = Boolean(cfg.paymentMethods.vnpay?.enabled);
                vnpayBadge.className = en ? 'admin-badge badge-active' : 'admin-badge badge-neutral';
                vnpayBadge.textContent = en ? 'Bật' : 'Tắt';
                if (en) activeCount++;
            }
            if (countBadge) {
                countBadge.textContent = `${activeCount} Cổng hoạt động`;
            }
        }

        // Card 3: Shipping & Delivery
        if (cfg.shippingPolicy) {
            const freeShipEl = document.getElementById('dispFreeShipThreshold');
            const stdFeesEl = document.getElementById('dispStandardShippingFees');
            const expFeeEl = document.getElementById('dispExpressShippingFee');
            const apiStatusEl = document.getElementById('dispShippingApiStatus');
            const partnerBadge = document.getElementById('dispShippingPartnerBadge');

            if (freeShipEl) freeShipEl.textContent = `Đơn từ ${(cfg.shippingPolicy.freeShippingThreshold || 300000).toLocaleString('vi-VN')} đ`;
            if (stdFeesEl) stdFeesEl.textContent = `${(cfg.shippingPolicy.innerCityFee || 25000).toLocaleString('vi-VN')} đ / ${(cfg.shippingPolicy.outerCityFee || 35000).toLocaleString('vi-VN')} đ`;
            if (expFeeEl) expFeeEl.textContent = `${(cfg.shippingPolicy.expressFee || 45000).toLocaleString('vi-VN')} đ (Grab / Aha)`;
            if (apiStatusEl) apiStatusEl.textContent = `${(cfg.shippingPolicy.partnerName || 'GHN Express').split(' ')[0]} (Shop ID: ${cfg.shippingPolicy.shopId || 'PAWPAL_Q1'})`;
            if (partnerBadge) partnerBadge.textContent = cfg.shippingPolicy.partnerName || 'GHN Express';
        }

        // Card 4: Booking Policy & Operating Hours
        if (cfg.operatingHours && cfg.hotelRules && cfg.bookingPolicy) {
            const opHoursEl = document.getElementById('dispOperatingHours');
            const hotelEl = document.getElementById('dispHotelCheckInOut');
            const capEl = document.getElementById('dispSlotCapacity');
            const cancelEl = document.getElementById('dispCancelPolicy');

            if (opHoursEl) opHoursEl.textContent = `${cfg.operatingHours.weekday?.open || '08:00'} - ${cfg.operatingHours.weekday?.close || '20:00'} (T7/CN: ${cfg.operatingHours.weekend?.close || '21:00'})`;
            if (hotelEl) hotelEl.textContent = `Nhận sau ${cfg.hotelRules.checkInTime || '14:00'} • Trả trước ${cfg.hotelRules.checkOutTime || '12:00'}`;
            if (capEl) capEl.textContent = `Tối đa ${cfg.bookingPolicy.slotCapacityMax || 4} bé / Khung giờ`;
            if (cancelEl) cancelEl.textContent = `Trước ${cfg.bookingPolicy.freeCancelHours || 4} giờ • Phí trễ ${(cfg.bookingPolicy.lateCancelFee || 50000).toLocaleString('vi-VN')} đ`;
        }
    }

    function renderAuditLogs() {
        const tbody = document.getElementById('auditLogTableBody');
        if (!tbody) return;

        // Cập nhật 4 Thẻ KPI trên Subtab 4
        const totalLogs = mockAuditLogs.length;
        const syncedLogs = mockAuditLogs.filter(l => l.status === 'Đã đồng bộ SSOT').length;
        const lastMod = mockAuditLogs[0]?.targetModules || 'Chưa có';

        const totalEl = document.getElementById('statTotalAuditLogs');
        const syncedEl = document.getElementById('statSyncedAuditLogs');
        const lastModEl = document.getElementById('statLastModule');
        const safeModeEl = document.getElementById('statSafeModeStatus');

        if (totalEl) totalEl.textContent = totalLogs;
        if (syncedEl) syncedEl.textContent = syncedLogs;
        if (lastModEl) lastModEl.textContent = lastMod;
        if (safeModeEl) {
            safeModeEl.textContent = isSafeModeLocked ? 'Đang bật' : 'Đã mở';
            safeModeEl.className = isSafeModeLocked ? 'kpi-val text-warning' : 'kpi-val text-success';
        }

        // Lọc dữ liệu theo Từ khóa và Phân hệ
        const keyword = (document.getElementById('searchAuditLogInput')?.value || '').toLowerCase().trim();
        const targetFilter = document.getElementById('filterAuditTargetModule')?.value || 'all';

        const filtered = mockAuditLogs.filter(log => {
            if (targetFilter !== 'all' && !log.targetModules.includes(targetFilter)) return false;
            if (keyword) {
                return (
                    log.actionText.toLowerCase().includes(keyword) ||
                    log.actor.toLowerCase().includes(keyword) ||
                    log.targetModules.toLowerCase().includes(keyword)
                );
            }
            return true;
        });

        tbody.innerHTML = '';
        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">Không tìm thấy nhật ký thay đổi nào phù hợp.</td></tr>`;
            return;
        }

        filtered.forEach(log => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><span style="font-size: 12.5px; color: var(--text-muted);">${log.time}</span></td>
                <td><strong>${log.actor}</strong></td>
                <td><span class="admin-badge badge-neutral">${log.targetModules}</span></td>
                <td><span style="color: var(--text-main); font-weight: 500;">${log.actionText}</span></td>
                <td><span class="admin-badge badge-active">${log.status}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    function openImpactConfirmationModal({ title, desc, affectedModules, onConfirm }) {
        const modal = document.getElementById('impactConfirmModalOverlay');
        const descEl = document.getElementById('impactModalDesc');
        const boxEl = document.getElementById('impactAffectedModulesBox');
        if (!modal || !descEl || !boxEl) {
            if (onConfirm) onConfirm();
            return;
        }

        descEl.innerHTML = `Bạn đang chuẩn bị thay đổi <strong>${title}</strong>. Theo quy tắc Nguồn Dữ Liệu Duy Nhất (SSOT), cấu hình này sẽ tự động đồng bộ ngay lập tức sang các phân hệ sau:`;
        boxEl.innerHTML = '';

        affectedModules.forEach(mod => {
            const row = document.createElement('div');
            row.className = 'impact-module-item';
            row.innerHTML = `
                <div>
                    <div class="impact-module-name">${mod.name}</div>
                    <div class="impact-module-note">${mod.note}</div>
                </div>
                <span class="admin-badge badge-active">Sẵn sàng đồng bộ</span>
            `;
            boxEl.appendChild(row);
        });

        pendingImpactCallback = onConfirm;
        modal.style.display = 'flex';
    }

    // -------------------------------------------------------------
    // 7. GẮN SỰ KIỆN LỌC VÀ MODALS
    // -------------------------------------------------------------
    function setupSettingsEvents() {
        // Chuyển Tab con trong Sub-tab 1 (Voucher, Banner, PawPoints, Thông báo)
        document.querySelectorAll('.settings-subtabs-bar .settings-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTabId = btn.getAttribute('data-settingstab');
                if (!targetTabId) return;

                document.querySelectorAll('.settings-subtabs-bar .settings-tab-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.querySelectorAll('#subtab-tab-banner-promos .settings-tab-panel').forEach(p => p.classList.remove('active'));
                const targetPanel = document.getElementById(targetTabId);
                if (targetPanel) targetPanel.classList.add('active');

                if (targetTabId === 'mkt-vouchers') renderVouchers();
                else if (targetTabId === 'mkt-banners') renderBanners();
                else if (targetTabId === 'mkt-notices') renderNotifications();
            });
        });

        // Lọc Voucher
        document.getElementById('searchVoucherInput')?.addEventListener('input', renderVouchers);
        document.getElementById('filterVoucherTarget')?.addEventListener('change', renderVouchers);
        document.getElementById('filterVoucherStatus')?.addEventListener('change', renderVouchers);

        // Lọc Bài viết
        document.getElementById('searchArticleInput')?.addEventListener('input', renderArticles);
        document.getElementById('filterArticleCategory')?.addEventListener('change', renderArticles);
        document.getElementById('filterArticleStatus')?.addEventListener('change', renderArticles);

        // --- MODAL BANNER ---
        const bannerModal = document.getElementById('bannerModalOverlay');
        document.getElementById('btnOpenBannerModal')?.addEventListener('click', () => {
            if (bannerModal) bannerModal.style.display = 'flex';
        });
        document.getElementById('btnCancelBannerModal')?.addEventListener('click', () => {
            if (bannerModal) bannerModal.style.display = 'none';
        });
        document.getElementById('btnDismissBannerModal')?.addEventListener('click', () => {
            if (bannerModal) bannerModal.style.display = 'none';
        });
        document.getElementById('btnSaveBanner')?.addEventListener('click', () => {
            const title = document.getElementById('inputBannerTitle')?.value.trim();
            if (!title) {
                showToast('Vui lòng nhập tiêu đề Banner!', 'warning');
                return;
            }
            mockBanners.unshift({
                id: 'bn-' + Date.now(),
                title: title,
                cta: document.getElementById('inputBannerCta')?.value || 'Xem ngay',
                url: document.getElementById('inputBannerUrl')?.value || '/pages/public/',
                startDate: document.getElementById('inputBannerStartDate')?.value || '2026-06-01',
                endDate: document.getElementById('inputBannerEndDate')?.value || '2026-12-31',
                status: 'active',
                imageText: 'Banner_Custom.jpg'
            });
            setStoredItem('pawpal_settings_banners', mockBanners);
            bannerModal.style.display = 'none';
            renderBanners();
            showToast('Đã thêm Banner mới và đồng bộ sang Website thành công!', 'success');
        });

        // --- MODAL VOUCHER (GIAI ĐOẠN 3: TỰ ĐỘNG HÓA VÀ XEM TRƯỚC TRỰC QUAN) ---
        const voucherModal = document.getElementById('voucherModalOverlay');
        function updateVoucherLivePreview() {
            const code = document.getElementById('inputVoucherCode')?.value.trim().toUpperCase() || 'PAWPAL30K';
            const name = document.getElementById('inputVoucherName')?.value.trim() || 'Tên chương trình ưu đãi';
            const type = document.getElementById('inputVoucherType')?.value || 'fixed';
            const val = parseFloat(document.getElementById('inputVoucherValue')?.value) || 0;
            const minOrder = parseFloat(document.getElementById('inputVoucherMinOrder')?.value) || 0;
            const target = document.getElementById('inputVoucherTarget')?.value || 'System';

            const prevCodeEl = document.getElementById('prevCode');
            const prevNameEl = document.getElementById('prevName');
            const prevDiscountEl = document.getElementById('prevDiscount');
            const prevTargetEl = document.getElementById('prevTarget');
            const prevCondEl = document.getElementById('prevCondition');

            if (prevCodeEl) prevCodeEl.textContent = code;
            if (prevNameEl) prevNameEl.textContent = name;
            if (prevDiscountEl) {
                if (type === 'percent') {
                    prevDiscountEl.textContent = val > 0 ? `Giảm ${val}%` : 'Giảm 0%';
                } else {
                    prevDiscountEl.textContent = val > 0 ? `Giảm ${val.toLocaleString('vi-VN')} VNĐ` : 'Giảm 0 VNĐ';
                }
            }
            if (prevTargetEl) {
                const targetMap = {
                    'System': 'Toàn hệ thống',
                    'Spa': 'Dịch vụ Spa',
                    'Hotel': 'Pet Hotel',
                    'Shop': 'Sản phẩm'
                };
                prevTargetEl.textContent = targetMap[target] || target;
            }
            if (prevCondEl) {
                prevCondEl.textContent = `Đơn tối thiểu: ${minOrder.toLocaleString('vi-VN')} VNĐ`;
            }
        }

        const openVoucherHandler = () => {
            if (voucherModal) {
                voucherModal.style.display = 'flex';
                updateVoucherLivePreview();
            }
        };
        document.getElementById('btnOpenVoucherModal')?.addEventListener('click', openVoucherHandler);
        document.getElementById('btnOpenVoucherModalHeader')?.addEventListener('click', openVoucherHandler);
        document.getElementById('btnCancelVoucherModal')?.addEventListener('click', () => {
            if (voucherModal) voucherModal.style.display = 'none';
        });
        document.getElementById('btnDismissVoucherModal')?.addEventListener('click', () => {
            if (voucherModal) voucherModal.style.display = 'none';
        });

        // Nút sinh mã tự động thông minh
        document.getElementById('btnAutoGenerateVoucherCode')?.addEventListener('click', () => {
            const target = document.getElementById('inputVoucherTarget')?.value || 'System';
            const prefixMap = {
                'System': 'PAW',
                'Spa': 'SPA',
                'Hotel': 'HOTEL',
                'Shop': 'SHOP'
            };
            const prefix = prefixMap[target] || 'PAW';
            const randNum = Math.floor(100 + Math.random() * 900);
            const year = '2026';
            const generatedCode = `${prefix}-${year}-${randNum}`;
            const codeInput = document.getElementById('inputVoucherCode');
            if (codeInput) {
                codeInput.value = generatedCode;
                updateVoucherLivePreview();
            }
        });

        // Cập nhật Live Preview khi gõ các trường dữ liệu voucher
        ['inputVoucherCode', 'inputVoucherName', 'inputVoucherType', 'inputVoucherValue', 'inputVoucherMinOrder', 'inputVoucherTarget'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', updateVoucherLivePreview);
                el.addEventListener('change', updateVoucherLivePreview);
            }
        });

        document.getElementById('btnSaveVoucher')?.addEventListener('click', () => {
            const code = document.getElementById('inputVoucherCode')?.value.trim().toUpperCase();
            const name = document.getElementById('inputVoucherName')?.value.trim();
            const val = parseFloat(document.getElementById('inputVoucherValue')?.value) || 0;
            if (!code || !name || val <= 0) {
                showToast('Vui lòng nhập đầy đủ mã, tên và giá trị giảm của Voucher!', 'warning');
                return;
            }
            mockVouchers.unshift({
                code: code,
                name: name,
                type: document.getElementById('inputVoucherType')?.value || 'fixed',
                target: document.getElementById('inputVoucherTarget')?.value || 'System',
                value: val,
                minOrder: parseFloat(document.getElementById('inputVoucherMinOrder')?.value) || 0,
                limit: parseInt(document.getElementById('inputVoucherLimit')?.value, 10) || 100,
                used: 0,
                validDate: 'Đến 31/12/2026',
                status: 'active'
            });
            setStoredItem('pawpal_settings_vouchers', mockVouchers);
            voucherModal.style.display = 'none';
            renderVouchers();
            showToast(`Đã tạo thành công Voucher ${code} và đồng bộ sang phân hệ Bán hàng!`, 'success');
        });

        // --- MODAL PAWPOINTS ---
        const pawpointsModal = document.getElementById('pawpointsModalOverlay');
        const openPawpointsHandler = () => {
            if (pawpointsModal) pawpointsModal.style.display = 'flex';
        };
        document.getElementById('btnOpenPawpointsModal')?.addEventListener('click', openPawpointsHandler);
        document.getElementById('btnEditPawpointsLink')?.addEventListener('click', openPawpointsHandler);
        document.getElementById('btnEditPawpointsSubLink')?.addEventListener('click', openPawpointsHandler);
        document.getElementById('btnCancelPawpointsModal')?.addEventListener('click', () => {
            if (pawpointsModal) pawpointsModal.style.display = 'none';
        });
        document.getElementById('btnDismissPawpointsModal')?.addEventListener('click', () => {
            if (pawpointsModal) pawpointsModal.style.display = 'none';
        });
        document.getElementById('btnSavePawpointsPolicy')?.addEventListener('click', () => {
            if (isSafeModeLocked) {
                showToast('Khóa an toàn cấu hình đang BẬT! Vui lòng vào tab "Cấu hình Hệ thống" và bấm "Mở khóa để sửa" trước khi lưu thay đổi điểm thưởng PawPoints.', 'warning');
                return;
            }
            const pointVal = document.getElementById('inputCfgPointValue')?.value || '100';
            const regPts = document.getElementById('inputCfgRegisterPoints')?.value || '50';

            openImpactConfirmationModal({
                title: 'Chính sách Điểm thưởng PawPoints',
                desc: 'Thay đổi tỷ lệ quy đổi điểm và điểm thưởng thành viên.',
                affectedModules: [
                    { name: 'Phân hệ Khách hàng', note: 'Tính toán lại công thức tích lũy và cập nhật hiển thị điểm trong Hồ sơ 360°' },
                    { name: 'Phân hệ Bán hàng', note: 'Áp dụng tỷ lệ trừ tiền trực tiếp vào hóa đơn POS và Web Checkout' }
                ],
                onConfirm: () => {
                    const parsedVal = parseInt(pointVal, 10);
                    document.getElementById('dispPointValue').textContent = `1 điểm = ${parsedVal.toLocaleString('vi-VN')} VNĐ`;
                    const kpiEl = document.getElementById('kpiPointRate');
                    if (kpiEl) kpiEl.textContent = `1đ = ${parsedVal.toLocaleString('vi-VN')}đ`;
                    document.getElementById('dispRegisterPoints').textContent = `+${regPts} điểm`;
                    pawpointsModal.style.display = 'none';

                    const now = new Date();
                    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    mockAuditLogs.unshift({
                        time: timeStr,
                        actor: 'Quản trị viên (Admin)',
                        targetModules: 'Khách hàng và Bán hàng',
                        actionText: `Cập nhật PawPoints: 1 điểm = ${parsedVal.toLocaleString('vi-VN')} VNĐ, Thưởng đăng ký +${regPts} điểm`,
                        status: 'Đã đồng bộ SSOT'
                    });
                    setStoredItem('pawpal_settings_audit_logs', mockAuditLogs);
                    setStoredItem('pawpal_settings_pawpoint_rate', parsedVal);
                    renderAuditLogs();
                    showToast('Đã lưu chính sách PawPoints và đồng bộ thành công sang phân hệ Khách hàng và Bán hàng!', 'success');
                }
            });
        });

        // --- MODAL THÔNG BÁO WEBSITE ---
        const noticeModal = document.getElementById('notificationModalOverlay');
        const openNoticeHandler = () => {
            if (noticeModal) noticeModal.style.display = 'flex';
        };
        document.getElementById('btnOpenNotificationModal')?.addEventListener('click', openNoticeHandler);
        document.getElementById('btnAddNoticeLink')?.addEventListener('click', openNoticeHandler);
        document.getElementById('btnCancelNoticeModal')?.addEventListener('click', () => {
            if (noticeModal) noticeModal.style.display = 'none';
        });
        document.getElementById('btnDismissNoticeModal')?.addEventListener('click', () => {
            if (noticeModal) noticeModal.style.display = 'none';
        });
        document.getElementById('btnSaveNotice')?.addEventListener('click', () => {
            const content = document.getElementById('inputNoticeContent')?.value.trim();
            if (!content) {
                showToast('Vui lòng nhập nội dung thông báo!', 'warning');
                return;
            }
            mockNotifications.unshift({
                id: 'notif-' + Date.now(),
                content: content,
                type: document.getElementById('inputNoticeType')?.value === 'topbar' ? 'Top-bar' : 'Popup',
                status: 'active'
            });
            setStoredItem('pawpal_settings_notices', mockNotifications);
            noticeModal.style.display = 'none';
            renderNotifications();
            showToast('Đã lưu và đồng bộ thông báo mới sang Website!', 'success');
        });

        // --- MODAL BÀI VIẾT ---
        const articleModal = document.getElementById('articleModalOverlay');
        document.getElementById('btnOpenCreateArticleModal')?.addEventListener('click', () => {
            if (articleModal) articleModal.style.display = 'flex';
        });
        document.getElementById('btnCancelArticleModal')?.addEventListener('click', () => {
            if (articleModal) articleModal.style.display = 'none';
        });
        document.getElementById('btnDismissArticleModal')?.addEventListener('click', () => {
            if (articleModal) articleModal.style.display = 'none';
        });
        document.getElementById('btnSaveArticle')?.addEventListener('click', () => {
            const title = document.getElementById('inputArticleTitle')?.value.trim();
            const summary = document.getElementById('inputArticleSummary')?.value.trim() || '';
            const content = document.getElementById('inputArticleContent')?.value.trim() || '';
            const category = document.getElementById('inputArticleCategory')?.value || 'Mẹo chăm sóc';
            const status = document.getElementById('inputArticleStatus')?.value || 'published';

            if (!title) {
                showToast('Vui lòng nhập tiêu đề bài viết!', 'warning');
                return;
            }

            // Tự động phân tách thực thể và từ khóa cốt lõi cho RAG
            const autoKeywords = [category, 'PawPal'];
            title.split(' ').filter(w => w.length > 3).slice(0, 4).forEach(w => autoKeywords.push(w));

            mockArticles.unshift({
                id: 'art-' + Date.now(),
                title: title,
                author: 'Quản trị viên',
                category: category,
                views: 0,
                status: status,
                updatedAt: 'Hôm nay',
                summary: summary,
                ragSynced: true,
                ragKeywords: autoKeywords,
                ragSummary: summary || (content.length > 180 ? content.slice(0, 180) + '...' : content) || 'Tóm tắt bài viết tự động nạp vào Chatbot.'
            });
            setStoredItem('pawpal_settings_articles', mockArticles);
            articleModal.style.display = 'none';
            renderArticles();
            showToast('Đã lưu bài viết và đồng bộ dữ liệu sang tri thức RAG của Chatbot!', 'success');
        });

        // --- MODALS SUB-TAB 3: CẤU HÌNH VẬN HÀNH VÀ HỆ THỐNG ---
        // Modal 1: Thông tin Cửa hàng và Chi nhánh
        const storeModal = document.getElementById('storeProfileModalOverlay');
        document.getElementById('btnConfigureStoreProfile')?.addEventListener('click', () => {
            const si = mockSystemConfig.storeInfo || {};
            const brandInput = document.getElementById('inputStoreBrandName');
            const companyInput = document.getElementById('inputStoreCompanyName');
            const hotlineInput = document.getElementById('inputStoreHotline');
            const emergInput = document.getElementById('inputStoreEmergency');
            const emailInput = document.getElementById('inputStoreEmail');
            const taxInput = document.getElementById('inputStoreTaxId');
            const addrInput = document.getElementById('inputStoreAddress');
            const zaloInput = document.getElementById('inputStoreZalo');
            const fbInput = document.getElementById('inputStoreFacebook');

            if (brandInput) brandInput.value = si.brandName || 'PawPal Pet Center';
            if (companyInput) companyInput.value = si.companyName || 'CÔNG TY CỔ PHẦN PAWPAL VIỆT NAM';
            if (hotlineInput) hotlineInput.value = si.hotline || '1900 888 999';
            if (emergInput) emergInput.value = si.emergencyPhone || '0901 234 567';
            if (emailInput) emailInput.value = si.email || 'cskh@pawpal.vn';
            if (taxInput) taxInput.value = si.taxId || '0316889988';
            if (addrInput) addrInput.value = si.address || '120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh';
            if (zaloInput) zaloInput.value = si.zaloUrl || 'https://zalo.me/0901234567';
            if (fbInput) fbInput.value = si.facebookUrl || 'https://facebook.com/pawpalvietnam';

            if (storeModal) storeModal.style.display = 'flex';
        });

        const closeStoreModalHandler = () => {
            if (storeModal) storeModal.style.display = 'none';
        };
        document.getElementById('btnCancelStoreProfileModal')?.addEventListener('click', closeStoreModalHandler);
        document.getElementById('btnDismissStoreProfileModal')?.addEventListener('click', closeStoreModalHandler);

        document.getElementById('btnSaveStoreProfile')?.addEventListener('click', () => {
            if (isSafeModeLocked) {
                showToast('Khóa an toàn cấu hình đang BẬT! Vui lòng bấm "Mở khóa để sửa" ở bảng Nhật ký Cấu hình trước khi thay đổi thông tin cửa hàng.', 'warning');
                return;
            }

            const brand = document.getElementById('inputStoreBrandName')?.value.trim() || 'PawPal Pet Center';
            const company = document.getElementById('inputStoreCompanyName')?.value.trim() || 'CÔNG TY CỔ PHẦN PAWPAL VIỆT NAM';
            const hotline = document.getElementById('inputStoreHotline')?.value.trim() || '1900 888 999';
            const emerg = document.getElementById('inputStoreEmergency')?.value.trim() || '0901 234 567';
            const email = document.getElementById('inputStoreEmail')?.value.trim() || 'cskh@pawpal.vn';
            const taxId = document.getElementById('inputStoreTaxId')?.value.trim() || '0316889988';
            const address = document.getElementById('inputStoreAddress')?.value.trim() || '120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP. Hồ Chí Minh';
            const zalo = document.getElementById('inputStoreZalo')?.value.trim() || 'https://zalo.me/0901234567';
            const fb = document.getElementById('inputStoreFacebook')?.value.trim() || 'https://facebook.com/pawpalvietnam';

            openImpactConfirmationModal({
                title: 'Thông tin Cửa hàng và Chi nhánh',
                desc: 'Cập nhật Hotline, Địa chỉ, Email và Thông tin Pháp lý của PawPal.',
                affectedModules: [
                    { name: 'User Portal và Website Footer', note: `Đồng bộ Hotline ${hotline}, Email ${email} và Địa chỉ ${address}` },
                    { name: 'Hóa đơn VAT và Đơn hàng', note: `Đồng bộ Mã số thuế ${taxId} và Tên công ty xuất hóa đơn` }
                ],
                onConfirm: () => {
                    mockSystemConfig.storeInfo = {
                        brandName: brand,
                        companyName: company,
                        hotline: hotline,
                        emergencyPhone: emerg,
                        email: email,
                        address: address,
                        taxId: taxId,
                        zaloUrl: zalo,
                        facebookUrl: fb
                    };

                    setStoredItem('pawpal_settings_system_config', mockSystemConfig);
                    if (storeModal) storeModal.style.display = 'none';

                    const now = new Date();
                    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    mockAuditLogs.unshift({
                        time: timeStr,
                        actor: 'Quản trị viên (Admin)',
                        targetModules: 'Cửa hàng, User Portal và Bán hàng',
                        actionText: `Cập nhật thông tin cửa hàng: Hotline ${hotline}, Email ${email}`,
                        status: 'Đã đồng bộ SSOT'
                    });
                    setStoredItem('pawpal_settings_audit_logs', mockAuditLogs);

                    renderSystemConfigCards();
                    renderAuditLogs();
                    showToast('Đã cập nhật thông tin cửa hàng và đồng bộ sang User Portal thành công!', 'success');
                }
            });
        });

        // Modal 2: Phương thức Thanh toán
        const paymentModal = document.getElementById('paymentConfigModalOverlay');
        document.getElementById('btnConfigurePayment')?.addEventListener('click', () => {
            const pm = mockSystemConfig.paymentMethods || {};
            const toggleCod = document.getElementById('toggleCodEnabled');
            const toggleBank = document.getElementById('toggleBankEnabled');
            const toggleMomo = document.getElementById('toggleMomoEnabled');
            const toggleVnpay = document.getElementById('toggleVnpayEnabled');

            if (toggleCod) toggleCod.checked = Boolean(pm.cod?.enabled !== false);
            if (toggleBank) toggleBank.checked = Boolean(pm.bank?.enabled !== false);
            if (toggleMomo) toggleMomo.checked = Boolean(pm.momo?.enabled !== false);
            if (toggleVnpay) toggleVnpay.checked = Boolean(pm.vnpay?.enabled !== false);

            const bankSelect = document.getElementById('inputPaymentBank');
            const accNoInput = document.getElementById('inputPaymentAccNo');
            const accHolderInput = document.getElementById('inputPaymentAccHolder');
            const syntaxInput = document.getElementById('inputPaymentSyntax');

            if (bankSelect && pm.bank?.bankName) bankSelect.value = pm.bank.bankName;
            if (accNoInput) accNoInput.value = pm.bank?.accountNumber || '999888666';
            if (accHolderInput) accHolderInput.value = pm.bank?.accountHolder || 'CONG TY CP PAWPAL VIET NAM';
            if (syntaxInput) syntaxInput.value = pm.bank?.syntax || 'PAWPAL [MA_DON_HANG] [SDT]';

            if (paymentModal) paymentModal.style.display = 'flex';
        });

        const closePaymentModalHandler = () => {
            if (paymentModal) paymentModal.style.display = 'none';
        };
        document.getElementById('btnCancelPaymentModal')?.addEventListener('click', closePaymentModalHandler);
        document.getElementById('btnDismissPaymentModal')?.addEventListener('click', closePaymentModalHandler);

        document.getElementById('btnSavePaymentConfig')?.addEventListener('click', () => {
            if (isSafeModeLocked) {
                showToast('Khóa an toàn cấu hình đang BẬT! Vui lòng bấm "Mở khóa để sửa" trước khi lưu cấu hình cổng thanh toán.', 'warning');
                return;
            }

            const codEn = document.getElementById('toggleCodEnabled')?.checked || false;
            const bankEn = document.getElementById('toggleBankEnabled')?.checked || false;
            const momoEn = document.getElementById('toggleMomoEnabled')?.checked || false;
            const vnpayEn = document.getElementById('toggleVnpayEnabled')?.checked || false;

            const bankName = document.getElementById('inputPaymentBank')?.value || 'vietcombank';
            const accNo = document.getElementById('inputPaymentAccNo')?.value || '999888666';
            const accHolder = document.getElementById('inputPaymentAccHolder')?.value || 'CONG TY CP PAWPAL VIET NAM';
            const syntax = document.getElementById('inputPaymentSyntax')?.value || 'PAWPAL [MA_DON_HANG] [SDT]';

            openImpactConfirmationModal({
                title: 'Cấu hình Cổng Thanh toán',
                desc: 'Cập nhật danh sách cổng thanh toán trực tuyến và thông tin QR Banking.',
                affectedModules: [
                    { name: 'Phân hệ Bán hàng và User Portal Checkout', note: `Trạng thái cổng: COD (${codEn ? 'Bật' : 'Tắt'}), QR Bank (${bankEn ? 'Bật' : 'Tắt'}), MoMo (${momoEn ? 'Bật' : 'Tắt'}), VNPay (${vnpayEn ? 'Bật' : 'Tắt'})` }
                ],
                onConfirm: () => {
                    mockSystemConfig.paymentMethods = {
                        cod: { enabled: codEn, name: 'Thanh toán khi nhận hàng (COD)', fee: 0 },
                        bank: {
                            enabled: bankEn,
                            name: 'Chuyển khoản QR Banking',
                            bankName: bankName,
                            accountNumber: accNo,
                            accountHolder: accHolder,
                            syntax: syntax
                        },
                        momo: { enabled: momoEn, name: 'Ví điện tử MoMo', merchantId: 'MOMO_PAWPAL_PROD' },
                        vnpay: { enabled: vnpayEn, name: 'Cổng thanh toán VNPay', tmnCode: 'PAWPALVN' }
                    };

                    setStoredItem('pawpal_settings_system_config', mockSystemConfig);
                    if (paymentModal) paymentModal.style.display = 'none';

                    const now = new Date();
                    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    mockAuditLogs.unshift({
                        time: timeStr,
                        actor: 'Quản trị viên (Admin)',
                        targetModules: 'Bán hàng và User Portal',
                        actionText: `Cấu hình thanh toán: COD (${codEn ? 'Bật' : 'Tắt'}), Bank (${bankEn ? 'Bật' : 'Tắt'}), MoMo (${momoEn ? 'Bật' : 'Tắt'}), VNPay (${vnpayEn ? 'Bật' : 'Tắt'})`,
                        status: 'Đã đồng bộ SSOT'
                    });
                    setStoredItem('pawpal_settings_audit_logs', mockAuditLogs);

                    renderSystemConfigCards();
                    renderAuditLogs();
                    showToast('Đã cập nhật cổng thanh toán và đồng bộ sang phân hệ Bán hàng và User Portal thành công!', 'success');
                }
            });
        });

        // Modal 3: Đơn vị Giao hàng và Biểu phí Vận chuyển
        const shippingModal = document.getElementById('shippingConfigModalOverlay');
        document.getElementById('btnConfigureShipping')?.addEventListener('click', () => {
            const sp = mockSystemConfig.shippingPolicy || {};
            const freeThresholdInput = document.getElementById('inputFreeShippingThreshold');
            const innerFeeInput = document.getElementById('inputInnerCityFee');
            const outerFeeInput = document.getElementById('inputOuterCityFee');
            const expressFeeInput = document.getElementById('inputExpressFee');
            const providerSelect = document.getElementById('inputShippingProvider');
            const shopIdInput = document.getElementById('inputShippingShopId');
            const apiKeyInput = document.getElementById('inputShippingApiKey');

            if (freeThresholdInput) freeThresholdInput.value = sp.freeShippingThreshold || 300000;
            if (innerFeeInput) innerFeeInput.value = sp.innerCityFee || 25000;
            if (outerFeeInput) outerFeeInput.value = sp.outerCityFee || 35000;
            if (expressFeeInput) expressFeeInput.value = sp.expressFee || 45000;
            if (providerSelect && sp.primaryPartner) providerSelect.value = sp.primaryPartner;
            if (shopIdInput) shopIdInput.value = sp.shopId || 'PAWPAL_Q1_STORE';
            if (apiKeyInput) apiKeyInput.value = sp.apiKey || 'ghn_prod_secret_token_12345';

            if (shippingModal) shippingModal.style.display = 'flex';
        });

        const closeShippingModalHandler = () => {
            if (shippingModal) shippingModal.style.display = 'none';
        };
        document.getElementById('btnCancelShippingModal')?.addEventListener('click', closeShippingModalHandler);
        document.getElementById('btnDismissShippingModal')?.addEventListener('click', closeShippingModalHandler);

        document.getElementById('btnSaveShippingConfig')?.addEventListener('click', () => {
            if (isSafeModeLocked) {
                showToast('Khóa an toàn cấu hình đang BẬT! Vui lòng bấm "Mở khóa để sửa" trước khi lưu cấu hình vận chuyển.', 'warning');
                return;
            }

            const freeThreshold = parseInt(document.getElementById('inputFreeShippingThreshold')?.value || '300000', 10);
            const innerFee = parseInt(document.getElementById('inputInnerCityFee')?.value || '25000', 10);
            const outerFee = parseInt(document.getElementById('inputOuterCityFee')?.value || '35000', 10);
            const expressFee = parseInt(document.getElementById('inputExpressFee')?.value || '45000', 10);
            const provider = document.getElementById('inputShippingProvider')?.value || 'ghn';
            const shopId = document.getElementById('inputShippingShopId')?.value || 'PAWPAL_Q1_STORE';
            const apiKey = document.getElementById('inputShippingApiKey')?.value || 'ghn_prod_secret_token_12345';

            const partnerNameMap = {
                ghn: 'Giao Hàng Nhanh (GHN Express)',
                ghtk: 'Giao Hàng Tiết Kiệm (GHTK)',
                grab: 'GrabExpress Siêu Tốc'
            };

            openImpactConfirmationModal({
                title: 'Cấu hình Đơn vị Vận chuyển và Biểu phí',
                desc: 'Cập nhật mức Miễn phí ship và biểu phí giao vận toàn hệ thống.',
                affectedModules: [
                    { name: 'User Portal Shop và Checkout', note: `Áp dụng Miễn phí ship đơn từ ${freeThreshold.toLocaleString('vi-VN')} VNĐ, Phí nội thành ${innerFee.toLocaleString('vi-VN')} VNĐ` },
                    { name: 'Phân hệ Bán hàng (Admin POS)', note: `Đồng bộ đối tác 3PL ${partnerNameMap[provider] || 'GHN'}` }
                ],
                onConfirm: () => {
                    mockSystemConfig.shippingPolicy = {
                        freeShippingThreshold: freeThreshold,
                        innerCityFee: innerFee,
                        outerCityFee: outerFee,
                        expressFee: expressFee,
                        primaryPartner: provider,
                        partnerName: partnerNameMap[provider] || 'GHN Express',
                        shopId: shopId,
                        apiKey: apiKey
                    };

                    setStoredItem('pawpal_settings_system_config', mockSystemConfig);
                    if (shippingModal) shippingModal.style.display = 'none';

                    const now = new Date();
                    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    mockAuditLogs.unshift({
                        time: timeStr,
                        actor: 'Quản trị viên (Admin)',
                        targetModules: 'Bán hàng và User Shop',
                        actionText: `Cập nhật biểu phí giao hàng: Freeship từ ${freeThreshold.toLocaleString('vi-VN')} VNĐ, Đối tác ${partnerNameMap[provider] || 'GHN'}`,
                        status: 'Đã đồng bộ SSOT'
                    });
                    setStoredItem('pawpal_settings_audit_logs', mockAuditLogs);

                    renderSystemConfigCards();
                    renderAuditLogs();
                    showToast('Đã lưu cấu hình vận chuyển và đồng bộ sang User Portal và Bán hàng thành công!', 'success');
                }
            });
        });

        // Modal 4: Chính sách Đặt lịch, Giờ mở cửa và Pet Hotel
        const bookingPolicyModal = document.getElementById('bookingPolicyModalOverlay');
        document.getElementById('btnConfigureBookingPolicy')?.addEventListener('click', () => {
            const oh = mockSystemConfig.operatingHours || {};
            const hr = mockSystemConfig.hotelRules || {};
            const bp = mockSystemConfig.bookingPolicy || {};

            const wkOpenInput = document.getElementById('inputWeekdayOpen');
            const wkCloseInput = document.getElementById('inputWeekdayClose');
            const weOpenInput = document.getElementById('inputWeekendOpen');
            const weCloseInput = document.getElementById('inputWeekendClose');

            if (wkOpenInput) wkOpenInput.value = oh.weekday?.open || '08:00';
            if (wkCloseInput) wkCloseInput.value = oh.weekday?.close || '20:00';
            if (weOpenInput) weOpenInput.value = oh.weekend?.open || '08:00';
            if (weCloseInput) weCloseInput.value = oh.weekend?.close || '21:00';

            const checkInInput = document.getElementById('inputHotelCheckIn');
            const checkOutInput = document.getElementById('inputHotelCheckOut');
            const hotelLateFeeInput = document.getElementById('inputHotelLateFee');

            if (checkInInput) checkInInput.value = hr.checkInTime || '14:00';
            if (checkOutInput) checkOutInput.value = hr.checkOutTime || '12:00';
            if (hotelLateFeeInput) hotelLateFeeInput.value = hr.lateCheckOutFeePerHalfDay || 100000;

            const slotCapInput = document.getElementById('inputSlotCapacity');
            const freeCancelInput = document.getElementById('inputFreeCancelHours');
            const lateCancelFeeInput = document.getElementById('inputLateCancelFee');
            const allowPickStaffSelect = document.getElementById('inputAllowPickStaff');

            if (slotCapInput) slotCapInput.value = bp.slotCapacityMax || 4;
            if (freeCancelInput) freeCancelInput.value = bp.freeCancelHours || 4;
            if (lateCancelFeeInput) lateCancelFeeInput.value = bp.lateCancelFee || 50000;
            if (allowPickStaffSelect) allowPickStaffSelect.value = bp.allowPickStaff ? 'yes' : 'no';

            if (bookingPolicyModal) bookingPolicyModal.style.display = 'flex';
        });

        const closeBookingModalHandler = () => {
            if (bookingPolicyModal) bookingPolicyModal.style.display = 'none';
        };
        document.getElementById('btnCancelBookingPolicyModal')?.addEventListener('click', closeBookingModalHandler);
        document.getElementById('btnDismissBookingPolicyModal')?.addEventListener('click', closeBookingModalHandler);

        document.getElementById('btnSaveBookingPolicy')?.addEventListener('click', () => {
            if (isSafeModeLocked) {
                showToast('Khóa an toàn cấu hình đang BẬT! Vui lòng bấm "Mở khóa để sửa" ở bảng Nhật ký Cấu hình trước khi thay đổi quy tắc đặt lịch.', 'warning');
                return;
            }

            const wkOpen = document.getElementById('inputWeekdayOpen')?.value || '08:00';
            const wkClose = document.getElementById('inputWeekdayClose')?.value || '20:00';
            const weOpen = document.getElementById('inputWeekendOpen')?.value || '08:00';
            const weClose = document.getElementById('inputWeekendClose')?.value || '21:00';

            const checkIn = document.getElementById('inputHotelCheckIn')?.value || '14:00';
            const checkOut = document.getElementById('inputHotelCheckOut')?.value || '12:00';
            const hotelLateFee = parseInt(document.getElementById('inputHotelLateFee')?.value || '100000', 10);

            const slotCapacity = parseInt(document.getElementById('inputSlotCapacity')?.value || '4', 10);
            const freeHours = parseInt(document.getElementById('inputFreeCancelHours')?.value || '4', 10);
            const lateFee = parseInt(document.getElementById('inputLateCancelFee')?.value || '50000', 10);
            const allowPickStaff = document.getElementById('inputAllowPickStaff')?.value === 'yes';

            openImpactConfirmationModal({
                title: 'Chính sách Đặt lịch, Giờ mở cửa và Pet Hotel',
                desc: 'Quy tắc hủy lịch hẹn, giờ nhận/trả Pet Hotel và công suất ca phục vụ.',
                affectedModules: [
                    { name: 'Phân hệ Dịch vụ và User Booking Portal', note: `Giờ mở cửa ${wkOpen}-${wkClose} (Cuối tuần đến ${weClose}), Pet Hotel Check-in ${checkIn}/Check-out ${checkOut}` },
                    { name: 'Phân hệ Nhân sự', note: `Công suất tối đa ${slotCapacity} bé/khung giờ, Chỉ định nhân viên: ${allowPickStaff ? 'Cho phép' : 'Tự động'}` }
                ],
                onConfirm: () => {
                    mockSystemConfig.operatingHours = {
                        weekday: { open: wkOpen, close: wkClose },
                        weekend: { open: weOpen, close: weClose },
                        holidayNotice: 'Mở cửa phục vụ xuyên suốt tất cả các ngày lễ và Tết Nguyên Đán.'
                    };
                    mockSystemConfig.hotelRules = {
                        checkInTime: checkIn,
                        checkOutTime: checkOut,
                        lateCheckOutFeePerHalfDay: hotelLateFee,
                        includedMealsPerDay: 3,
                        cameraAccessEnabled: true
                    };
                    mockSystemConfig.bookingPolicy = {
                        freeCancelHours: freeHours,
                        lateCancelFee: lateFee,
                        allowPickStaff: allowPickStaff,
                        slotCapacityMax: slotCapacity,
                        timeSlots: mockSystemConfig.bookingPolicy?.timeSlots || ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']
                    };

                    setStoredItem('pawpal_settings_system_config', mockSystemConfig);
                    if (bookingPolicyModal) bookingPolicyModal.style.display = 'none';

                    const now = new Date();
                    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    mockAuditLogs.unshift({
                        time: timeStr,
                        actor: 'Quản trị viên (Admin)',
                        targetModules: 'Dịch vụ, Nhân sự và User Booking',
                        actionText: `Chính sách đặt lịch: Giờ mở cửa ${wkOpen}-${wkClose}, Hủy miễn phí trước ${freeHours}h, Phí trễ ${lateFee.toLocaleString('vi-VN')} đ`,
                        status: 'Đã đồng bộ SSOT'
                    });
                    setStoredItem('pawpal_settings_audit_logs', mockAuditLogs);

                    renderSystemConfigCards();
                    renderAuditLogs();
                    showToast('Đã áp dụng chính sách đặt lịch mới và đồng bộ sang phân hệ Dịch vụ và Nhân sự thành công!', 'success');
                }
            });
        });

        // --- SỰ KIỆN ZERO MISS VÀ TÁC VỤ DROPDOWN 3 CHẤM (GIAI ĐOẠN 1) ---
        // Nút lọc mục Zero Miss trên thanh thông báo
        document.getElementById('btnFilterZeroMiss')?.addEventListener('click', () => {
            const statusFilter = document.getElementById('filterVoucherStatus');
            if (statusFilter) {
                if (statusFilter.value === 'zero-miss') {
                    statusFilter.value = 'all';
                } else {
                    statusFilter.value = 'zero-miss';
                }
                renderVouchers();
                const tableCard = document.querySelector('.settings-master-card');
                if (tableCard) {
                    tableCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });

        // Gia hạn thêm 50 lượt cho Voucher đang chọn
        document.getElementById('btnActionExtendQuota')?.addEventListener('click', () => {
            if (!currentActiveVoucherCode) return;
            const voucher = mockVouchers.find(v => v.code === currentActiveVoucherCode);
            if (voucher) {
                voucher.limit += 50;
                if (voucher.status === 'expired' && voucher.used < voucher.limit) {
                    voucher.status = 'active';
                }
                setStoredItem('pawpal_settings_vouchers', mockVouchers);
                renderVouchers();
                renderZeroMissAlerts();
                closeVoucherActionMenu();
                showToast(`Đã gia hạn thêm 50 lượt phát hành cho Voucher ${voucher.code} thành công! Hạn mức mới: ${voucher.used}/${voucher.limit} lượt.`, 'success');
            }
        });

        // Bật/tắt trạng thái Voucher
        document.getElementById('btnActionToggleStatus')?.addEventListener('click', () => {
            if (!currentActiveVoucherCode) return;
            const voucher = mockVouchers.find(v => v.code === currentActiveVoucherCode);
            if (voucher) {
                voucher.status = voucher.status === 'active' ? 'paused' : 'active';
                setStoredItem('pawpal_settings_vouchers', mockVouchers);
                renderVouchers();
                renderZeroMissAlerts();
                closeVoucherActionMenu();
                showToast(`Voucher ${voucher.code} hiện đã được chuyển sang trạng thái: ${voucher.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}.`, 'info');
            }
        });

        // Xóa Voucher
        document.getElementById('btnActionDeleteVoucher')?.addEventListener('click', () => {
            if (!currentActiveVoucherCode) return;
            const idx = mockVouchers.findIndex(v => v.code === currentActiveVoucherCode);
            if (idx !== -1) {
                const code = mockVouchers[idx].code;
                showSettingsConfirmModal({
                    title: 'Xóa Voucher',
                    message: `Bạn có chắc chắn muốn xóa Voucher ${code} khỏi hệ thống?`,
                    confirmText: 'Xóa Voucher',
                    isDanger: true,
                    onConfirm: () => {
                        mockVouchers.splice(idx, 1);
                        setStoredItem('pawpal_settings_vouchers', mockVouchers);
                        renderVouchers();
                        renderZeroMissAlerts();
                        closeVoucherActionMenu();
                        showToast(`Đã xóa thành công Voucher ${code}.`, 'success');
                    }
                });
            }
        });

        // --- SỰ KIỆN TÁC VỤ BÀI VIẾT VÀ TRI THỨC AI RAG (GIAI ĐOẠN 3) ---
        const ragModal = document.getElementById('articleRagModalOverlay');
        const closeRagModalHandler = () => {
            if (ragModal) ragModal.style.display = 'none';
        };
        document.getElementById('btnCancelRagModal')?.addEventListener('click', closeRagModalHandler);
        document.getElementById('btnDismissRagModal')?.addEventListener('click', closeRagModalHandler);

        // Xem tóm tắt RAG từ dropdown
        document.getElementById('btnActionViewRag')?.addEventListener('click', () => {
            if (!currentActiveArticleId) return;
            const article = mockArticles.find(a => a.id === currentActiveArticleId);
            if (!article) return;

            const titleEl = document.getElementById('ragArticleTitle');
            const catEl = document.getElementById('ragArticleCategory');
            const statusEl = document.getElementById('ragArticleStatus');
            const kwsBox = document.getElementById('ragKeywordsBox');
            const contentBox = document.getElementById('ragContentBox');

            if (titleEl) titleEl.textContent = article.title;
            if (catEl) catEl.textContent = article.category;
            if (statusEl) {
                statusEl.className = article.ragSynced ? 'admin-badge badge-active' : 'admin-badge badge-warning';
                statusEl.textContent = article.ragSynced ? 'Đã nạp RAG' : 'Chưa nạp RAG';
            }

            if (kwsBox) {
                kwsBox.innerHTML = '';
                const kws = article.ragKeywords || ['Chăm sóc thú cưng', 'Cẩm nang PawPal'];
                kws.forEach(kw => {
                    const pill = document.createElement('span');
                    pill.className = 'rag-keyword-pill';
                    pill.textContent = kw;
                    kwsBox.appendChild(pill);
                });
            }

            if (contentBox) {
                contentBox.textContent = article.ragSummary || article.summary || 'Chưa có dữ liệu trích xuất RAG.';
            }

            closeArticleActionMenu();
            if (ragModal) ragModal.style.display = 'flex';
        });

        // Đồng bộ lại vào Chatbot từ dropdown bài viết
        document.getElementById('btnActionSyncRag')?.addEventListener('click', () => {
            if (!currentActiveArticleId) return;
            const article = mockArticles.find(a => a.id === currentActiveArticleId);
            if (article) {
                article.ragSynced = true;
                setStoredItem('pawpal_settings_articles', mockArticles);
                renderArticles();
                closeArticleActionMenu();
                showToast(`Đã nạp thành công bài viết "${article.title}" vào cơ sở tri thức RAG của Chatbot PawPal!`, 'success');
            }
        });

        // Nút đồng bộ trong Modal RAG
        document.getElementById('btnSyncRagArticle')?.addEventListener('click', () => {
            if (!currentActiveArticleId) return;
            const article = mockArticles.find(a => a.id === currentActiveArticleId);
            if (article) {
                article.ragSynced = true;
                setStoredItem('pawpal_settings_articles', mockArticles);
                const statusEl = document.getElementById('ragArticleStatus');
                if (statusEl) {
                    statusEl.className = 'admin-badge badge-active';
                    statusEl.textContent = 'Đã nạp RAG';
                }
                renderArticles();
                showToast(`Đã nạp và đồng bộ bài viết "${article.title}" vào Chatbot thành công!`, 'success');
            }
        });

        // Đổi trạng thái Công khai / Tạm ẩn từ dropdown
        document.getElementById('btnActionToggleArticleStatus')?.addEventListener('click', () => {
            if (!currentActiveArticleId) return;
            const article = mockArticles.find(a => a.id === currentActiveArticleId);
            if (article) {
                article.status = article.status === 'published' ? 'hidden' : 'published';
                setStoredItem('pawpal_settings_articles', mockArticles);
                renderArticles();
                closeArticleActionMenu();
                showToast(`Bài viết "${article.title}" hiện đã chuyển sang trạng thái: ${article.status === 'published' ? 'Công khai' : 'Tạm ẩn'}.`, 'info');
            }
        });

        // Xóa bài viết từ dropdown
        document.getElementById('btnActionDeleteArticle')?.addEventListener('click', () => {
            if (!currentActiveArticleId) return;
            const idx = mockArticles.findIndex(a => a.id === currentActiveArticleId);
            if (idx !== -1) {
                const title = mockArticles[idx].title;
                showSettingsConfirmModal({
                    title: 'Xóa bài viết',
                    message: `Bạn có chắc chắn muốn xóa bài viết "${title}" khỏi hệ thống?`,
                    confirmText: 'Xóa bài viết',
                    isDanger: true,
                    onConfirm: () => {
                        mockArticles.splice(idx, 1);
                        setStoredItem('pawpal_settings_articles', mockArticles);
                        renderArticles();
                        closeArticleActionMenu();
                        showToast(`Đã xóa thành công bài viết "${title}".`, 'success');
                    }
                });
            }
        });

        // Đóng dropdown menu khi click ra ngoài window
        window.addEventListener('click', (e) => {
            const voucherDropdown = document.getElementById('voucherActionDropdown');
            if (voucherDropdown && !voucherDropdown.contains(e.target)) {
                closeVoucherActionMenu();
            }
            const articleDropdown = document.getElementById('articleActionDropdown');
            if (articleDropdown && !articleDropdown.contains(e.target)) {
                closeArticleActionMenu();
            }
        });

        // --- SUBTAB 3: LIVE HEALTHCHECK KIỂM TRA ĐỐI TÁC API ---
        document.getElementById('btnConfigurePartners')?.addEventListener('click', () => {
            const ghnBadge = document.getElementById('pingGhnBadge');
            const momoBadge = document.getElementById('pingMomoBadge');
            const vnpayBadge = document.getElementById('pingVnpayBadge');

            if (ghnBadge) { ghnBadge.className = 'admin-badge badge-warning'; ghnBadge.textContent = 'Đang đo ping...'; }
            if (momoBadge) { momoBadge.className = 'admin-badge badge-warning'; momoBadge.textContent = 'Đang đo ping...'; }
            if (vnpayBadge) { vnpayBadge.className = 'admin-badge badge-warning'; vnpayBadge.textContent = 'Đang đo ping...'; }

            setTimeout(() => {
                const ghnPing = Math.floor(Math.random() * 8) + 15; // 15-22ms
                const momoPing = Math.floor(Math.random() * 10) + 20; // 20-29ms
                const vnpayPing = Math.floor(Math.random() * 12) + 24; // 24-35ms

                if (ghnBadge) { ghnBadge.className = 'admin-badge badge-active'; ghnBadge.textContent = `Trực tuyến (${ghnPing}ms)`; }
                if (momoBadge) { momoBadge.className = 'admin-badge badge-active'; momoBadge.textContent = `Trực tuyến (${momoPing}ms)`; }
                if (vnpayBadge) { vnpayBadge.className = 'admin-badge badge-active'; vnpayBadge.textContent = `Trực tuyến (${vnpayPing}ms)`; }

                showToast(`Live Healthcheck: GHN (${ghnPing}ms), MoMo (${momoPing}ms), VNPay (${vnpayPing}ms). Kênh kết nối thông suốt!`, 'success');
            }, 350);
        });

        // --- SỰ KIỆN GIAI ĐOẠN 2: KHÓA AN TOÀN VÀ XÁC NHẬN TÁC ĐỘNG ĐA PHÂN HỆ ---
        function updateSafeModeUI() {
            const badge1 = document.getElementById('safeModeBadge');
            const btn1 = document.getElementById('btnToggleSafeMode');
            const badge2 = document.getElementById('safeModeBadgeAudit');
            const btn2 = document.getElementById('btnToggleSafeModeAudit');
            const kpiStatus = document.getElementById('statSafeModeStatus');

            if (isSafeModeLocked) {
                if (badge1) { badge1.className = 'safe-mode-badge'; badge1.textContent = 'Khóa an toàn: Đang bật'; }
                if (btn1) btn1.textContent = 'Mở khóa để sửa';
                if (badge2) { badge2.className = 'safe-mode-badge'; badge2.textContent = 'Khóa an toàn: Đang bật'; }
                if (btn2) btn2.textContent = 'Mở khóa để sửa';
                if (kpiStatus) { kpiStatus.textContent = 'Đang bật'; kpiStatus.className = 'kpi-val text-warning'; }
            } else {
                if (badge1) { badge1.className = 'safe-mode-badge is-unlocked'; badge1.textContent = 'Khóa an toàn: Đã mở'; }
                if (btn1) btn1.textContent = 'Bật lại khóa an toàn';
                if (badge2) { badge2.className = 'safe-mode-badge is-unlocked'; badge2.textContent = 'Khóa an toàn: Đã mở'; }
                if (btn2) btn2.textContent = 'Bật lại khóa an toàn';
                if (kpiStatus) { kpiStatus.textContent = 'Đã mở'; kpiStatus.className = 'kpi-val text-success'; }
            }
        }

        const handleSafeModeToggle = () => {
            isSafeModeLocked = !isSafeModeLocked;
            updateSafeModeUI();
            if (isSafeModeLocked) {
                showToast('Đã BẬT Khóa an toàn! Toàn bộ tham số cấu hình lõi được bảo vệ chống thao tác nhầm.', 'warning');
            } else {
                showToast('Đã MỞ KHÓA thành công! Bạn có thể chỉnh sửa các chính sách và cấu hình vận hành.', 'success');
            }
        };

        document.getElementById('btnToggleSafeMode')?.addEventListener('click', handleSafeModeToggle);
        document.getElementById('btnToggleSafeModeAudit')?.addEventListener('click', handleSafeModeToggle);

        // Lọc và tìm kiếm trên Subtab 4: Nhật ký Cấu hình
        document.getElementById('searchAuditLogInput')?.addEventListener('input', () => {
            renderAuditLogs();
        });
        document.getElementById('filterAuditTargetModule')?.addEventListener('change', () => {
            renderAuditLogs();
        });

        document.getElementById('btnConfirmAndSyncImpact')?.addEventListener('click', () => {
            if (pendingImpactCallback) {
                pendingImpactCallback();
                pendingImpactCallback = null;
            }
            const modal = document.getElementById('impactConfirmModalOverlay');
            if (modal) modal.style.display = 'none';
        });

        const closeImpactModalHandler = () => {
            pendingImpactCallback = null;
            const modal = document.getElementById('impactConfirmModalOverlay');
            if (modal) modal.style.display = 'none';
        };
        document.getElementById('btnDismissImpactModal')?.addEventListener('click', closeImpactModalHandler);
        document.getElementById('btnCancelImpactModal')?.addEventListener('click', closeImpactModalHandler);
    }

    // -------------------------------------------------------------
    // 6. KHỞI TẠO VÀ XỬ LÝ HASH BAN ĐẦU
    // -------------------------------------------------------------
    setupSettingsEvents();

    const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
    const savedTab = sessionStorage.getItem('pawpal_admin_settings_subtab');
    const validTabs = ['tab-banner-promos', 'tab-content-management', 'tab-system-config', 'tab-audit-logs'];

    let initTab = 'tab-banner-promos';
    if (validTabs.includes(hash)) {
        initTab = hash;
    } else if (validTabs.includes(savedTab)) {
        initTab = savedTab;
    }

    switchSubtab(initTab);
})();
