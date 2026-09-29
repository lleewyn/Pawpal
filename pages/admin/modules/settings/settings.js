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

    // -------------------------------------------------------------
    // 1. DỮ LIỆU MẪU MÔ PHỎNG (MOCK DATA)
    // -------------------------------------------------------------
    const mockBanners = [
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
            title: 'Khai trương Chi nhánh Quận 1',
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

    const mockVouchers = [
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

    const mockNotifications = [
        {
            id: 'notif-1',
            content: 'PawPal mở rộng khung giờ phục vụ Spa đến 21:00 các ngày cuối tuần!',
            type: 'Top-bar',
            status: 'active'
        },
        {
            id: 'notif-2',
            content: 'Thông báo: Chi nhánh Quận 1 tạm ngưng tiếp nhận Pet Taxi từ 12:00 - 14:00 để bảo dưỡng phương tiện.',
            type: 'Popup',
            status: 'active'
        }
    ];

    const mockArticles = [
        {
            id: 'art-001',
            title: '5 Dấu hiệu nhận biết bé cún của bạn đang bị sốc nhiệt mùa hè',
            author: 'Bác sĩ Thú y Minh Anh',
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
            author: 'Ban Quản trị PawPal',
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

    const mockAuditLogs = [
        {
            time: '29/09/2026 14:15',
            actor: 'Quản trị viên (Admin)',
            targetModules: 'Khách hàng và Bán hàng',
            actionText: 'Tỷ lệ PawPoints: 1 điểm = 500 VNĐ → 1.000 VNĐ',
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
                    renderBanners();
                    renderZeroMissAlerts();
                    alert(`Đã gia hạn Banner "${banner.title}" thêm 30 ngày thành công! Hiệu lực mới đến ngày ${banner.endDate}.`);
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
    // 6. RENDER SUB-TAB 3: NHẬT KÝ AUDIT LOG VÀ TÁC ĐỘNG ĐA PHÂN HỆ (GIAI ĐOẠN 2)
    // -------------------------------------------------------------
    let isSafeModeLocked = true;
    let pendingImpactCallback = null;

    function renderAuditLogs() {
        const tbody = document.getElementById('auditLogTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (mockAuditLogs.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">Chưa có lịch sử thay đổi cấu hình nào.</td></tr>`;
            return;
        }

        mockAuditLogs.forEach(log => {
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
                alert('Vui lòng nhập tiêu đề Banner!');
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
            bannerModal.style.display = 'none';
            renderBanners();
            alert('Đã thêm Banner mới và đồng bộ sang Website thành công!');
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
                alert('Vui lòng nhập đầy đủ mã, tên và giá trị giảm của Voucher!');
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
            voucherModal.style.display = 'none';
            renderVouchers();
            alert(`Đã tạo thành công Voucher ${code} và đồng bộ sang phân hệ Bán hàng!`);
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
                alert('CẢNH BÁO AN TOÀN:\nKhóa an toàn cấu hình đang BẬT để chống sửa nhầm tham số lõi!\nVui lòng vào tab "Cấu hình Hệ thống" và bấm "Mở khóa để sửa" trước khi lưu thay đổi điểm thưởng PawPoints.');
                return;
            }
            const pointVal = document.getElementById('inputCfgPointValue')?.value || '1000';
            const regPts = document.getElementById('inputCfgRegisterPoints')?.value || '50';

            openImpactConfirmationModal({
                title: 'Chính sách Điểm thưởng PawPoints',
                desc: 'Thay đổi tỷ lệ quy đổi điểm và điểm thưởng thành viên.',
                affectedModules: [
                    { name: 'Phân hệ Khách hàng', note: 'Tính toán lại công thức tích lũy và cập nhật hiển thị điểm trong Hồ sơ 360°' },
                    { name: 'Phân hệ Bán hàng', note: 'Áp dụng tỷ lệ trừ tiền trực tiếp vào hóa đơn POS và Web Checkout' }
                ],
                onConfirm: () => {
                    document.getElementById('dispPointValue').textContent = `1 điểm = ${parseInt(pointVal, 10).toLocaleString('vi-VN')} VNĐ`;
                    document.getElementById('dispRegisterPoints').textContent = `+${regPts} điểm`;
                    pawpointsModal.style.display = 'none';

                    const now = new Date();
                    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    mockAuditLogs.unshift({
                        time: timeStr,
                        actor: 'Quản trị viên (Admin)',
                        targetModules: 'Khách hàng và Bán hàng',
                        actionText: `Cập nhật PawPoints: 1 điểm = ${parseInt(pointVal, 10).toLocaleString('vi-VN')} VNĐ, Thưởng đăng ký +${regPts} điểm`,
                        status: 'Đã đồng bộ SSOT'
                    });
                    renderAuditLogs();
                    alert('Đã lưu chính sách PawPoints và đồng bộ thành công sang phân hệ Khách hàng và Bán hàng!');
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
                alert('Vui lòng nhập nội dung thông báo!');
                return;
            }
            mockNotifications.unshift({
                id: 'notif-' + Date.now(),
                content: content,
                type: document.getElementById('inputNoticeType')?.value === 'topbar' ? 'Top-bar' : 'Popup',
                status: 'active'
            });
            noticeModal.style.display = 'none';
            renderNotifications();
            alert('Đã lưu và đồng bộ thông báo mới sang Website!');
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
                alert('Vui lòng nhập tiêu đề bài viết!');
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
            articleModal.style.display = 'none';
            renderArticles();
            alert('Đã lưu bài viết và đồng bộ dữ liệu sang tri thức RAG của Chatbot!');
        });

        // --- MODALS SUB-TAB 3: CẤU HÌNH VẬN HÀNH ---
        const paymentModal = document.getElementById('paymentConfigModalOverlay');
        document.getElementById('btnConfigurePayment')?.addEventListener('click', () => {
            if (paymentModal) paymentModal.style.display = 'flex';
        });
        document.getElementById('btnCancelPaymentModal')?.addEventListener('click', () => {
            if (paymentModal) paymentModal.style.display = 'none';
        });
        document.getElementById('btnDismissPaymentModal')?.addEventListener('click', () => {
            if (paymentModal) paymentModal.style.display = 'none';
        });
        document.getElementById('btnSavePaymentConfig')?.addEventListener('click', () => {
            if (isSafeModeLocked) {
                alert('CẢNH BÁO AN TOÀN:\nKhóa an toàn cấu hình đang BẬT!\nVui lòng bấm "Mở khóa để sửa" trước khi lưu cấu hình cổng thanh toán.');
                return;
            }
            openImpactConfirmationModal({
                title: 'Cấu hình Cổng Thanh toán',
                desc: 'Cập nhật danh sách cổng thanh toán trực tuyến.',
                affectedModules: [
                    { name: 'Phân hệ Bán hàng', note: 'Tự động mở/đóng cổng quét mã MoMo và VNPay trên màn hình POS và thanh toán Web' }
                ],
                onConfirm: () => {
                    paymentModal.style.display = 'none';
                    const now = new Date();
                    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    mockAuditLogs.unshift({
                        time: timeStr,
                        actor: 'Quản trị viên (Admin)',
                        targetModules: 'Bán hàng',
                        actionText: 'Cấu hình thanh toán: Xác nhận kết nối MoMo và VNPay QR',
                        status: 'Đã đồng bộ SSOT'
                    });
                    renderAuditLogs();
                    alert('Đã cập nhật cổng thanh toán và đồng bộ sang phân hệ Bán hàng!');
                }
            });
        });

        const shippingModal = document.getElementById('shippingConfigModalOverlay');
        document.getElementById('btnConfigureShipping')?.addEventListener('click', () => {
            if (shippingModal) shippingModal.style.display = 'flex';
        });
        document.getElementById('btnCancelShippingModal')?.addEventListener('click', () => {
            if (shippingModal) shippingModal.style.display = 'none';
        });
        document.getElementById('btnDismissShippingModal')?.addEventListener('click', () => {
            if (shippingModal) shippingModal.style.display = 'none';
        });
        document.getElementById('btnSaveShippingConfig')?.addEventListener('click', () => {
            if (isSafeModeLocked) {
                alert('CẢNH BÁO AN TOÀN:\nKhóa an toàn cấu hình đang BẬT!\nVui lòng bấm "Mở khóa để sửa" trước khi lưu cấu hình vận chuyển.');
                return;
            }
            openImpactConfirmationModal({
                title: 'Cấu hình Đơn vị Vận chuyển',
                desc: 'Cập nhật đối tác giao vận và phương thức giao hàng.',
                affectedModules: [
                    { name: 'Phân hệ Bán hàng', note: 'Đồng bộ biểu phí ship COD và bảng giá giao hàng tức thời Ahamove / GrabExpress' }
                ],
                onConfirm: () => {
                    shippingModal.style.display = 'none';
                    const now = new Date();
                    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    mockAuditLogs.unshift({
                        time: timeStr,
                        actor: 'Quản trị viên (Admin)',
                        targetModules: 'Bán hàng',
                        actionText: 'Cập nhật đơn vị vận chuyển: Kích hoạt GHN và Ahamove',
                        status: 'Đã đồng bộ SSOT'
                    });
                    renderAuditLogs();
                    alert('Đã lưu cấu hình vận chuyển và đồng bộ sang phân hệ Bán hàng!');
                }
            });
        });

        const bookingPolicyModal = document.getElementById('bookingPolicyModalOverlay');
        document.getElementById('btnConfigureBookingPolicy')?.addEventListener('click', () => {
            if (bookingPolicyModal) bookingPolicyModal.style.display = 'flex';
        });
        document.getElementById('btnCancelBookingPolicyModal')?.addEventListener('click', () => {
            if (bookingPolicyModal) bookingPolicyModal.style.display = 'none';
        });
        document.getElementById('btnDismissBookingPolicyModal')?.addEventListener('click', () => {
            if (bookingPolicyModal) bookingPolicyModal.style.display = 'none';
        });
        document.getElementById('btnSaveBookingPolicy')?.addEventListener('click', () => {
            if (isSafeModeLocked) {
                alert('CẢNH BÁO AN TOÀN:\nKhóa an toàn cấu hình đang BẬT!\nVui lòng bấm "Mở khóa để sửa" ở bảng Nhật ký Cấu hình trước khi thay đổi quy tắc đặt lịch.');
                return;
            }
            const freeHours = document.getElementById('inputFreeCancelHours')?.value || '4';
            const lateFee = document.getElementById('inputLateCancelFee')?.value || '50000';

            openImpactConfirmationModal({
                title: 'Chính sách Đặt lịch Dịch vụ',
                desc: 'Quy tắc hủy lịch hẹn và phí hủy muộn cho dịch vụ Spa và Hotel.',
                affectedModules: [
                    { name: 'Phân hệ Dịch vụ', note: `Áp dụng thời gian hủy miễn phí trước ${freeHours} giờ và phí phạt ${parseInt(lateFee, 10).toLocaleString('vi-VN')} VNĐ` },
                    { name: 'Phân hệ Nhân sự', note: 'Tự động tính toán lại quyền giữ slot ca trực cho chuyên viên chăm sóc' }
                ],
                onConfirm: () => {
                    bookingPolicyModal.style.display = 'none';
                    const now = new Date();
                    const timeStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    mockAuditLogs.unshift({
                        time: timeStr,
                        actor: 'Quản trị viên (Admin)',
                        targetModules: 'Dịch vụ và Nhân sự',
                        actionText: `Chính sách đặt lịch: Hủy miễn phí trước ${freeHours} giờ, Phí hủy muộn ${parseInt(lateFee, 10).toLocaleString('vi-VN')} VNĐ`,
                        status: 'Đã đồng bộ SSOT'
                    });
                    renderAuditLogs();
                    alert('Đã áp dụng chính sách đặt lịch mới và đồng bộ sang phân hệ Dịch vụ và Nhân sự!');
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
                renderVouchers();
                renderZeroMissAlerts();
                closeVoucherActionMenu();
                alert(`Đã gia hạn thêm 50 lượt phát hành cho Voucher ${voucher.code} thành công!\nHạn mức mới: ${voucher.used}/${voucher.limit} lượt.`);
            }
        });

        // Bật/tắt trạng thái Voucher
        document.getElementById('btnActionToggleStatus')?.addEventListener('click', () => {
            if (!currentActiveVoucherCode) return;
            const voucher = mockVouchers.find(v => v.code === currentActiveVoucherCode);
            if (voucher) {
                voucher.status = voucher.status === 'active' ? 'paused' : 'active';
                renderVouchers();
                renderZeroMissAlerts();
                closeVoucherActionMenu();
                alert(`Voucher ${voucher.code} hiện đã được chuyển sang trạng thái: ${voucher.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}.`);
            }
        });

        // Xóa Voucher
        document.getElementById('btnActionDeleteVoucher')?.addEventListener('click', () => {
            if (!currentActiveVoucherCode) return;
            const idx = mockVouchers.findIndex(v => v.code === currentActiveVoucherCode);
            if (idx !== -1) {
                const code = mockVouchers[idx].code;
                if (confirm(`Bạn có chắc chắn muốn xóa Voucher ${code} khỏi hệ thống?`)) {
                    mockVouchers.splice(idx, 1);
                    renderVouchers();
                    renderZeroMissAlerts();
                    closeVoucherActionMenu();
                    alert(`Đã xóa thành công Voucher ${code}.`);
                }
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
                renderArticles();
                closeArticleActionMenu();
                alert(`Đã nạp thành công bài viết "${article.title}" vào cơ sở tri thức RAG của Chatbot PawPal!`);
            }
        });

        // Nút đồng bộ trong Modal RAG
        document.getElementById('btnSyncRagArticle')?.addEventListener('click', () => {
            if (!currentActiveArticleId) return;
            const article = mockArticles.find(a => a.id === currentActiveArticleId);
            if (article) {
                article.ragSynced = true;
                const statusEl = document.getElementById('ragArticleStatus');
                if (statusEl) {
                    statusEl.className = 'admin-badge badge-active';
                    statusEl.textContent = 'Đã nạp RAG';
                }
                renderArticles();
                alert(`Đã nạp và đồng bộ bài viết "${article.title}" vào Chatbot thành công!`);
            }
        });

        // Đổi trạng thái Công khai / Tạm ẩn từ dropdown
        document.getElementById('btnActionToggleArticleStatus')?.addEventListener('click', () => {
            if (!currentActiveArticleId) return;
            const article = mockArticles.find(a => a.id === currentActiveArticleId);
            if (article) {
                article.status = article.status === 'published' ? 'hidden' : 'published';
                renderArticles();
                closeArticleActionMenu();
                alert(`Bài viết "${article.title}" hiện đã chuyển sang trạng thái: ${article.status === 'published' ? 'Công khai' : 'Tạm ẩn'}.`);
            }
        });

        // Xóa bài viết từ dropdown
        document.getElementById('btnActionDeleteArticle')?.addEventListener('click', () => {
            if (!currentActiveArticleId) return;
            const idx = mockArticles.findIndex(a => a.id === currentActiveArticleId);
            if (idx !== -1) {
                const title = mockArticles[idx].title;
                if (confirm(`Bạn có chắc chắn muốn xóa bài viết "${title}" khỏi hệ thống?`)) {
                    mockArticles.splice(idx, 1);
                    renderArticles();
                    closeArticleActionMenu();
                    alert(`Đã xóa thành công bài viết "${title}".`);
                }
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

                alert(`Kết quả kiểm tra đối tác bên thứ ba (Live Healthcheck):\n- GHN Express API: 200 OK (${ghnPing}ms)\n- MoMo Merchant Gateway: 200 OK (${momoPing}ms)\n- VNPay Payment Engine: 200 OK (${vnpayPing}ms)\n\nToàn bộ kênh kết nối đang thông suốt, không phát hiện nghẽn mạng!`);
            }, 350);
        });

        // --- SỰ KIỆN GIAI ĐOẠN 2: KHÓA AN TOÀN VÀ XÁC NHẬN TÁC ĐỘNG ĐA PHÂN HỆ ---
        document.getElementById('btnToggleSafeMode')?.addEventListener('click', () => {
            isSafeModeLocked = !isSafeModeLocked;
            const badge = document.getElementById('safeModeBadge');
            const btn = document.getElementById('btnToggleSafeMode');
            if (isSafeModeLocked) {
                if (badge) {
                    badge.className = 'safe-mode-badge';
                    badge.textContent = 'Khóa an toàn: Đang bật';
                }
                if (btn) btn.textContent = 'Mở khóa để sửa';
                alert('Đã BẬT Khóa an toàn! Toàn bộ tham số cấu hình lõi được bảo vệ chống thao tác nhầm.');
            } else {
                if (badge) {
                    badge.className = 'safe-mode-badge is-unlocked';
                    badge.textContent = 'Khóa an toàn: Đã mở';
                }
                if (btn) btn.textContent = 'Bật lại khóa an toàn';
                alert('Đã MỞ KHÓA thành công! Bạn có thể chỉnh sửa các chính sách và cấu hình vận hành.');
            }
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

    const savedTab = sessionStorage.getItem('pawpal_admin_settings_subtab');
    const hash = window.location.hash;

    let initTab = 'tab-banner-promos';
    if (hash === '#tab-content-management' || savedTab === 'tab-content-management') {
        initTab = 'tab-content-management';
    } else if (hash === '#tab-system-config' || savedTab === 'tab-system-config') {
        initTab = 'tab-system-config';
    } else if (hash === '#tab-banner-promos' || savedTab === 'tab-banner-promos') {
        initTab = 'tab-banner-promos';
    }

    switchSubtab(initTab);
})();
