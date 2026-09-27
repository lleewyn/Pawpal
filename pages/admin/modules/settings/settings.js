/**
 * MODULE CẤU HÌNH HỆ THỐNG (PAWPAL ADMIN)
 * Tuân thủ nghiêm ngặt 100% AGENTS.md & ADMIN_DESIGN_SYSTEM.md:
 * - 3 Subtabs Header Bar: Banner và Khuyến mãi | Quản lý Nội dung | Cấu hình Hệ thống (Text-only, phân tách bởi '|')
 * - Tự động đồng bộ State và Hash (#tab-banner-promos, #tab-content-management, #tab-system-config)
 * - Subtab 1: Quản lý Banner, Bảng Voucher, Chính sách PawPoints, Thông báo Website
 * - Subtab 2: Quản lý Blog & Cẩm nang (Tạo, Sửa, Lọc theo Danh mục và Trạng thái)
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
            startDate: '2026-06-01',
            endDate: '2026-08-31',
            status: 'active',
            imageText: 'Banner_Spa_Summer.jpg'
        },
        {
            id: 'bn-002',
            title: 'Khai trương Chi nhánh Quận 1',
            cta: 'Xem chi tiết',
            url: '/pages/public/about/',
            startDate: '2026-05-01',
            endDate: '2026-05-30',
            status: 'active',
            imageText: 'Banner_Grand_Opening.jpg'
        },
        {
            id: 'bn-003',
            title: 'Combo Khách sạn Thú cưng VIP',
            cta: 'Giữ phòng ngay',
            url: '/pages/public/services/#hotel',
            startDate: '2026-04-10',
            endDate: '2026-05-10',
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
            name: 'Ưu đãi 20% Dịch vụ Spa & Grooming',
            type: 'percent',
            target: 'Spa',
            value: 20,
            minOrder: 200000,
            limit: 100,
            used: 45,
            validDate: 'Đến 30/08/2026',
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
            used: 50,
            validDate: 'Đến 15/05/2026',
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
            summary: 'Hướng dẫn sơ cứu khẩn cấp khi thú cưng bị thở dốc, mắt lờ đờ hoặc mệt mỏi trong thời tiết nắng nóng oi bức.'
        },
        {
            id: 'art-002',
            title: 'Chế độ dinh dưỡng khoa học giúp lông mèo mềm mượt giảm rụng',
            author: 'Chuyên viên Dinh dưỡng PawPal',
            category: 'Dinh dưỡng',
            views: 980,
            status: 'published',
            updatedAt: '22/09/2026',
            summary: 'Bổ sung Omega 3, kẽm và dầu cá hồi đúng cách vào khẩu phần ăn hàng ngày của các bé mèo cưng.'
        },
        {
            id: 'art-003',
            title: 'Kinh nghiệm lần đầu gửi bé tại Khách sạn thú cưng Pet Hotel',
            author: 'Ban Quản trị PawPal',
            category: 'Mẹo chăm sóc',
            views: 650,
            status: 'published',
            updatedAt: '18/09/2026',
            summary: 'Những vật dụng cần mang theo và cách giúp bé nhanh chóng làm quen với môi trường lưu trú mới.'
        },
        {
            id: 'art-004',
            title: 'Quy trình khử trùng và vệ sinh lồng sấy chuẩn quốc tế tại PawPal',
            author: 'Đội ngũ Kỹ thuật viên',
            category: 'Grooming',
            views: 310,
            status: 'draft',
            updatedAt: '15/09/2026',
            summary: 'Minh bạch quy trình bảo đảm an toàn sức khỏe tuyệt đối cho thú cưng khi sử dụng dịch vụ tại cửa hàng.'
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
            renderBanners();
            renderVouchers();
            renderNotifications();
        } else if (tabId === 'tab-content-management') {
            renderArticles();
        }
    }

    // -------------------------------------------------------------
    // 3. RENDER SUB-TAB 1: BANNER, VOUCHER, PAWPOINTS, NOTICES
    // -------------------------------------------------------------
    function renderBanners() {
        const container = document.getElementById('bannerCardsContainer');
        if (!container) return;

        container.innerHTML = '';
        mockBanners.forEach(b => {
            const card = document.createElement('div');
            card.className = 'banner-item-card';
            card.innerHTML = `
                <div class="banner-preview-img">${b.imageText}</div>
                <div class="banner-card-info">
                    <span class="banner-card-title">${b.title}</span>
                    <span class="banner-card-meta">CTA: <strong>${b.cta}</strong> | Link: ${b.url}</span>
                    <span class="banner-card-meta">Hiệu lực: ${b.startDate} đến ${b.endDate}</span>
                </div>
                <div class="banner-card-actions">
                    <span class="admin-badge ${b.status === 'active' ? 'badge-active' : 'badge-neutral'}">${b.status === 'active' ? 'Đang bật' : 'Tạm tắt'}</span>
                    <div style="display: flex; gap: 6px;">
                        <button type="button" class="user-name-link btn-edit-banner" data-id="${b.id}">Sửa</button>
                        <button type="button" class="user-name-link btn-toggle-banner" data-id="${b.id}" style="color: ${b.status === 'active' ? '#B45309' : '#236B48'};">${b.status === 'active' ? 'Tắt' : 'Bật'}</button>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });

        container.querySelectorAll('.btn-toggle-banner').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                const banner = mockBanners.find(i => i.id === id);
                if (banner) {
                    banner.status = banner.status === 'active' ? 'paused' : 'active';
                    renderBanners();
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
            if (statusFilter !== 'all' && v.status !== statusFilter) return false;
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

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong style="color: #236B48;">${v.code}</strong></td>
                <td>${v.name}</td>
                <td>${v.type === 'percent' ? 'Giảm %' : 'Giảm tiền'}</td>
                <td><span class="admin-badge badge-neutral">${v.target}</span></td>
                <td><strong>${discountDisp}</strong></td>
                <td>${v.minOrder > 0 ? v.minOrder.toLocaleString('vi-VN') + ' đ' : 'Không'}</td>
                <td>${v.used}/${v.limit}</td>
                <td>${v.validDate}</td>
                <td>${statusBadge}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn-action-trigger" onclick="alert('Đang mở tùy chọn quản lý cho mã ${v.code}')">•••</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function renderNotifications() {
        const container = document.getElementById('notificationsListContainer');
        if (!container) return;

        container.innerHTML = '';
        mockNotifications.forEach(n => {
            const row = document.createElement('div');
            row.className = 'notification-row-item';
            row.innerHTML = `
                <span class="notice-content-text">${n.content}</span>
                <span class="admin-badge badge-neutral">${n.type}</span>
                <span class="admin-badge badge-active">Đang hiện</span>
            `;
            container.appendChild(row);
        });
    }

    // -------------------------------------------------------------
    // 4. RENDER SUB-TAB 2: BÀI VIẾT (BLOG & CẨM NANG)
    // -------------------------------------------------------------
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
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 24px; color: var(--text-muted);">Không tìm thấy bài viết nào phù hợp.</td></tr>`;
            return;
        }

        filtered.forEach(a => {
            let statusBadge = '';
            if (a.status === 'published') statusBadge = '<span class="admin-badge badge-active">Công khai</span>';
            else if (a.status === 'draft') statusBadge = '<span class="admin-badge badge-neutral">Bản nháp</span>';
            else statusBadge = '<span class="admin-badge badge-warning">Tạm ẩn</span>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><div class="article-thumb-img">Ảnh bìa</div></td>
                <td><strong style="color: var(--text-main); font-size: 13.5px;">${a.title}</strong></td>
                <td>${a.author}</td>
                <td><span class="admin-badge badge-neutral">${a.category}</span></td>
                <td>${a.views.toLocaleString('vi-VN')}</td>
                <td>${statusBadge}</td>
                <td>${a.updatedAt}</td>
                <td style="text-align: center;">
                    <button type="button" class="btn-action-trigger" onclick="alert('Đang mở bài viết: ${a.title}')">•••</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // -------------------------------------------------------------
    // 5. GẮN SỰ KIỆN LỌC VÀ MODALS
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

        // --- MODAL VOUCHER ---
        const voucherModal = document.getElementById('voucherModalOverlay');
        const openVoucherHandler = () => {
            if (voucherModal) voucherModal.style.display = 'flex';
        };
        document.getElementById('btnOpenVoucherModal')?.addEventListener('click', openVoucherHandler);
        document.getElementById('btnOpenVoucherModalHeader')?.addEventListener('click', openVoucherHandler);
        document.getElementById('btnCancelVoucherModal')?.addEventListener('click', () => {
            if (voucherModal) voucherModal.style.display = 'none';
        });
        document.getElementById('btnDismissVoucherModal')?.addEventListener('click', () => {
            if (voucherModal) voucherModal.style.display = 'none';
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
            const pointVal = document.getElementById('inputCfgPointValue')?.value || '1000';
            const regPts = document.getElementById('inputCfgRegisterPoints')?.value || '50';
            document.getElementById('dispPointValue').textContent = `1 điểm = ${parseInt(pointVal, 10).toLocaleString('vi-VN')} VNĐ`;
            document.getElementById('dispRegisterPoints').textContent = `+${regPts} điểm`;
            pawpointsModal.style.display = 'none';
            alert('Đã cập nhật chính sách điểm thưởng PawPoints toàn hệ thống!');
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
            if (!title) {
                alert('Vui lòng nhập tiêu đề bài viết!');
                return;
            }
            mockArticles.unshift({
                id: 'art-' + Date.now(),
                title: title,
                author: 'Quản trị viên',
                category: document.getElementById('inputArticleCategory')?.value || 'Mẹo chăm sóc',
                views: 0,
                status: document.getElementById('inputArticleStatus')?.value || 'published',
                updatedAt: 'Hôm nay',
                summary: document.getElementById('inputArticleSummary')?.value || ''
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
            paymentModal.style.display = 'none';
            alert('Đã cập nhật cấu hình thanh toán và đồng bộ sang phân hệ Bán hàng!');
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
            shippingModal.style.display = 'none';
            alert('Đã lưu cấu hình đơn vị vận chuyển!');
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
            bookingPolicyModal.style.display = 'none';
            alert('Đã áp dụng chính sách đặt lịch mới sang phân hệ Dịch vụ!');
        });

        document.getElementById('btnConfigurePartners')?.addEventListener('click', () => {
            alert('Đang kiểm tra kết nối API đối tác:\n- GHN Express: 200 OK (Đang hoạt động)\n- MoMo Gateway: 200 OK (Đang hoạt động)\n- VNPay Engine: 200 OK (Đang hoạt động)');
        });
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
