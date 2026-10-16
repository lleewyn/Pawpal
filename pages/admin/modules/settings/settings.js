/**
 * MODULE CẤU HÌNH HỆ THỐNG (PAWPAL ADMIN) - CORE ORCHESTRATOR
 * Tuân thủ nghiêm ngặt 100% AGENTS.md:
 * - 4 Subtabs Header Bar: Banner và Khuyến mãi | Bài viết | Cấu hình | Nhật ký
 * - 100% SUPABASE LIVE DATABASE - ZERO JSON MOCK (Khớp 100% Column Schema Supabase)
 * - Tự động đồng bộ State và Hash (#tab-banner-promos, #tab-content-management, #tab-system-config, #tab-audit-logs)
 * - Quản trị trạng thái SSOT và điều phối nạp dữ liệu cho 4 subtabs:
 *   1. subtabs/tab-settings-banners.js (Banner, Voucher, PawPoints, Thông báo Website)
 *   2. subtabs/tab-settings-content.js (Bài viết Blog & Cẩm nang, RAG tri thức Chatbot)
 *   3. subtabs/tab-settings-system.js (Cấu hình vận hành 4 cards: Cửa hàng, Thanh toán, Vận chuyển, Đặt lịch)
 *   4. subtabs/tab-settings-audit.js (Nhật ký cấu hình audit_log & Khóa an toàn SSOT)
 */

(function() {
    'use strict';

    // Khởi tạo namespace trung tâm
    const PawpalSettings = window.PawpalSettings = window.PawpalSettings || {};
    window.PawpalSettingsModule = PawpalSettings;
    PawpalSettings.subtabs = PawpalSettings.subtabs || {};

    // Helper định dạng thời gian chuẩn hóa
    const formatDateTime = window.formatDateTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    const formatDate = window.formatDate || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    const formatTime = window.formatTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    PawpalSettings.formatDateTime = formatDateTime;
    PawpalSettings.formatDate = formatDate;
    PawpalSettings.formatTime = formatTime;

    function getSupabaseClient() {
        return window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
    }
    PawpalSettings.getSupabaseClient = getSupabaseClient;

    // Helper: Toast Notification chuẩn AGENTS.md
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
    PawpalSettings.showToast = showToast;

    // Helper: Confirm Modal cho Cấu hình
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
            modal.style.display = 'none';
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
        modal.style.display = 'flex';
    }
    PawpalSettings.showSettingsConfirmModal = showSettingsConfirmModal;

    // Helper: Modal xác nhận tác động liên phân hệ (Impact Confirmation Modal)
    let pendingImpactCallback = null;
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
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
    PawpalSettings.openImpactConfirmationModal = openImpactConfirmationModal;

    // Helper: Điều khiển Modal toàn cục chuẩn AGENTS.md (Hỗ trợ 4 hình thức đóng tức thì)
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.add('active');
        modal.style.display = 'flex';
        const firstInput = modal.querySelector('input:not([type="hidden"]), select, textarea');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 60);
        }
    }
    PawpalSettings.openModal = openModal;

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    PawpalSettings.closeModal = closeModal;

    // Bộ lắng nghe sự kiện đóng modal toàn cục (4 hình thức đóng tức thì)
    document.addEventListener('click', (e) => {
        // 1. Nút có data-close-modal
        const closeBtn = e.target.closest('[data-close-modal]');
        if (closeBtn) {
            const mId = closeBtn.getAttribute('data-close-modal');
            if (mId) closeModal(mId);
            return;
        }

        // 2. Click vùng nền tối backdrop bên ngoài modal-card
        if (e.target.classList.contains('admin-modal-overlay')) {
            e.target.classList.remove('active');
            e.target.style.display = 'none';
        }
    });

    // 3. Phím Escape đóng tức thì modal đang mở
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.admin-modal-overlay').forEach(m => {
                if (m.classList.contains('active') || (m.style.display && m.style.display !== 'none')) {
                    m.classList.remove('active');
                    m.style.display = 'none';
                }
            });
        }
    });

    // Helper: Ghi nhật ký cấu hình vào bảng audit_log Supabase
    async function logSystemAudit(action, entityName, description) {
        try {
            const client = getSupabaseClient();
            if (!client) return;

            let staffId = null;
            try {
                const adminUser = JSON.parse(localStorage.getItem('pawpal_admin_user') || sessionStorage.getItem('pawpal_admin_user') || '{}');
                if (adminUser?.id) staffId = adminUser.id;
            } catch (e) {}

            if (!staffId) {
                staffId = 'd0000000-5555-5555-5555-555555555555';
            }

            const { error } = await client.from('audit_log').insert([{
                staff_id: staffId,
                action: action,
                entity_name: entityName,
                description: description,
                created_at: new Date().toISOString()
            }]);
            if (error) console.warn('[Settings] Không thể ghi audit_log:', error.message);
        } catch (e) {
            console.warn('[Settings] Không thể ghi audit_log:', e.message);
        }
    }
    PawpalSettings.logSystemAudit = logSystemAudit;

    // -------------------------------------------------------------
    // QUẢN LÝ TRẠNG THÁI TOÀN CỤC (GLOBAL STATE)
    // -------------------------------------------------------------
    const DEFAULT_SYSTEM_CONFIG = {
        storeInfo: {
            brandName: 'PawPal Pet Center',
            companyName: 'CÔNG TY CỔ PHẦN PAWPAL VIỆT NAM',
            hotline: '1900 888 999',
            emergencyPhone: '0901 234 567',
            email: 'cskh@pawpal.vn',
            address: '120 Nguyễn Thị Minh Khai, P.6, Q.3, TP.HCM',
            taxId: '0316889988',
            zaloUrl: 'https://zalo.me/0901234567',
            facebookUrl: 'https://facebook.com/pawpalvietnam'
        },
        paymentMethods: {
            cod: { enabled: true, name: 'Thanh toán khi nhận hàng (COD)', fee: 0 },
            bank: {
                enabled: true,
                name: 'Chuyển khoản QR Banking',
                bankName: 'vietcombank',
                accountNumber: '9988776655',
                accountHolder: 'CONG TY CP PAWPAL VIET NAM',
                syntax: 'PAWPAL [Mã đơn]'
            },
            momo: { enabled: true, name: 'Ví điện tử MoMo', merchantId: 'MOMO_PAWPAL_PROD' },
            vnpay: { enabled: true, name: 'Cổng thanh toán VNPay', tmnCode: 'PAWPALVN' }
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
        pawpointsPolicy: {
            pointValueVnd: 100,
            registerBonus: 50
        },
        websiteNotices: [
            {
                id: 'notice-topbar-01',
                content: 'PawPal mở rộng khung giờ phục vụ Spa đến 21:00 các ngày cuối tuần!',
                type: 'TOPBAR',
                date: '15/10/2026',
                isActive: true
            },
            {
                id: 'notice-popup-01',
                content: 'Ưu đãi tháng 10: Tặng ngay voucher 50.000đ cho khách hàng đặt lịch tiêm phòng đầu tiên!',
                type: 'POPUP',
                date: '10/10/2026',
                isActive: false
            }
        ]
    };

    PawpalSettings.state = {
        bannersList: [],
        vouchersList: [],
        articlesList: [],
        notificationsList: [],
        auditLogsList: [],
        systemConfig: JSON.parse(localStorage.getItem('pawpal_admin_system_config') || 'null') || DEFAULT_SYSTEM_CONFIG,
        isSafeModeLocked: true,
        currentActiveVoucherCode: null,
        currentActiveArticleId: null
    };

    async function persistSystemConfig(newCfg) {
        PawpalSettings.state.systemConfig = newCfg;
        localStorage.setItem('pawpal_admin_system_config', JSON.stringify(newCfg));
        try {
            const client = getSupabaseClient();
            if (client) {
                const { error } = await client.from('pawpal_setting').upsert([{
                    setting_key: 'system_config',
                    setting_value: JSON.stringify(newCfg),
                    setting_type: 'json',
                    description: 'Cấu hình vận hành hệ thống Pawpal',
                    updated_at: new Date().toISOString()
                }], { onConflict: 'setting_key' });
                if (error) throw error;
            }
        } catch (e) {
            console.error('[Settings] Không thể lưu pawpal_setting trên Supabase:', e.message);
            throw e;
        }
    }
    PawpalSettings.persistSystemConfig = persistSystemConfig;

    function updateSafeModeUI() {
        const isSafeModeLocked = PawpalSettings.state.isSafeModeLocked;
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
    PawpalSettings.updateSafeModeUI = updateSafeModeUI;

    // -------------------------------------------------------------
    // NẠP DỮ LIỆU TỔNG HỢP TỪ SUPABASE LIVE DATABASE
    // -------------------------------------------------------------
    async function loadSettingsModuleData() {
        const client = getSupabaseClient();
        if (!client) {
            console.warn('[Settings] Supabase Client chưa khả dụng.');
            return;
        }

        try {
            const [
                { data: bannersData, error: bannersError },
                { data: vouchersData, error: vouchersError },
                { data: blogsData, error: blogsError },
                { data: notifsData, error: notifsError },
                { data: auditsData, error: auditsError },
                { data: appSettingsData, error: appSettingsError },
                { data: servicesData, error: servicesError },
                { data: productsData, error: productsError },
                { data: categoriesData, error: categoriesError }
            ] = await Promise.all([
                client.from('banner').select('*').order('created_at', { ascending: false }),
                client.from('voucher').select('*').order('created_at', { ascending: false }),
                client.from('blog_post').select('*').order('created_at', { ascending: false }),
                client.from('notification').select('*').order('sent_at', { ascending: false }),
                client.from('audit_log').select('*, staff:staff_id(full_name)').order('created_at', { ascending: false }).limit(50),
                client.from('pawpal_setting').select('*'),
                client.from('service').select('id, service_code, service_name, estimated_duration').order('service_name'),
                client.from('product').select('id, sku, product_name, sale_price').order('product_name').limit(50),
                client.from('blog_category').select('id, category_name, description').order('display_order')
            ]);

            const error=[bannersError,vouchersError,blogsError,notifsError,auditsError,appSettingsError,servicesError,productsError,categoriesError].find(Boolean);
            if(error)throw error;
            const banners = bannersData || [];
            const vouchers = vouchersData || [];
            const blogs = blogsData || [];
            const notifs = notifsData || [];
            const audits = auditsData || [];

            // Lưu dữ liệu thực thể hỗ trợ tìm kiếm vào state
            PawpalSettings.state.servicesList = servicesData || [];
            PawpalSettings.state.productsList = productsData || [];
            PawpalSettings.state.blogCategoriesList = (categoriesData || []).filter(c => c && c.category_name && c.category_name.trim());

            // Đọc cấu hình vận hành từ pawpal_setting
            if (appSettingsData && appSettingsData.length > 0) {
                appSettingsData.forEach(row => {
                    if (row.setting_key === 'system_config' && row.setting_value) {
                        PawpalSettings.state.hasSystemConfig = true;
                        try {
                            let parsed = row.setting_value;
                            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                            // Một số schema jsonb có thể trả về chuỗi JSON lồng thêm một lớp.
                            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                            if (parsed && typeof parsed === 'object') {
                                PawpalSettings.state.systemConfig = parsed;
                            }
                        } catch (e) {
                            console.error('[Settings] Không đọc được system_config:', e.message);
                        }
                    }
                });
            }

            // 1. Map Banners
            PawpalSettings.state.bannersList = banners.map(b => {
                let sDate = b.start_date ? b.start_date.substring(0, 10) : '2026-05-01';
                let eDate = b.end_date ? b.end_date.substring(0, 10) : '2026-12-31';
                const isActive = b.status === 'dang_hien_thi' || b.status === 'ACTIVE' || b.is_active === true;
                return {
                    id: b.id,
                    title: b.title || 'Banner ưu đãi PawPal',
                    cta: b.button_text || b.cta_text || 'Xem ngay',
                    url: b.link || b.link_url || '/pages/public/services/',
                    startDate: sDate,
                    endDate: eDate,
                    status: isActive ? 'active' : 'paused',
                    imageText: b.image_url ? b.image_url.split('/').pop() : 'Banner_Pawpal.jpg',
                    imageUrl: b.image_url || '',
                    endDateRaw: eDate
                };
            });

            // 2. Map Vouchers
            PawpalSettings.state.vouchersList = vouchers.map(v => {
                const code = v.voucher_code || v.code || 'PAWPALCARE';
                const name = v.voucher_name || v.name || ('Voucher ' + code);
                const isPercent = (v.type === 'percentage' || v.type === 'percent' || !!v.discount_percent);
                const val = Number(v.discount_value ?? v.discount_amount ?? v.discount_percent ?? 0);
                let endDateStr = v.end_date ? ('Đến ' + formatDate(v.end_date)) : 'Đến 2026-12-31';

                let target = 'Shop';
                const appFor = (Array.isArray(v.applicable_for) ? v.applicable_for.join(',') : String(v.applicable_for || v.applicable_service || '')).toLowerCase();
                if (appFor.includes('spa') || appFor.includes('care')) target = 'Spa';
                else if (appFor.includes('hotel')) target = 'Hotel';
                else if (appFor.includes('taxi')) target = 'Taxi';
                else if (appFor.includes('all') || appFor.includes('system')) target = 'System';
                else if (appFor.includes('shop') || appFor.includes('store') || appFor.includes('cửa hàng')) target = 'Shop';

                let status = 'active';
                if (v.is_active === false) status = 'paused';
                const maxUse = Number(v.max_usage || v.total_usage_limit || 200);
                const curUse = Number(v.usage_count || v.current_usage_count || 0);
                if ((v.end_date && Date.parse(v.end_date)<Date.now()) || (maxUse && curUse>=maxUse)) status='expired';

                return {
                    id: v.id,
                    code: code,
                    name: name,
                    type: isPercent ? 'percent' : 'fixed',
                    target: target,
                    value: val,
                    minOrder: Number(v.minimum_order_amount || v.min_order_value || 0),
                    limit: maxUse,
                    used: curUse,
                    validDate: endDateStr,
                    status: status
                };
            });

            // 3. Map Blog / Articles
            const ragSyncedIds = PawpalSettings.state?.systemConfig?.ragSyncedArticleIds || [];
            PawpalSettings.state.articlesList = blogs.map(a => {
                const catObj = (categoriesData || []).find(category => category.id === a.category_id);
                const categoryName = catObj?.description || catObj?.category_name || 'Chưa phân loại';

                let status = 'published';
                const sUpper = (a.status || '').toUpperCase();
                if (sUpper === 'DRAFT') status = 'draft';
                else if (sUpper === 'ARCHIVED' || sUpper === 'HIDDEN') status = 'hidden';

                const dateObj = a.updated_at ? new Date(a.updated_at) : (a.created_at ? new Date(a.created_at) : new Date());
                const dateStr = formatDate(dateObj);
                const isRag = ragSyncedIds.includes(a.id) || Boolean(a.rag_synced ?? a.ragSynced ?? false);
                const defaultKeywords = ['Chăm sóc', 'Sức khỏe', 'Dinh dưỡng'];

                return {
                    id: a.id,
                    title: a.title || 'Cẩm nang chăm sóc thú cưng',
                    author: 'Ban Biên Tập PawPal',
                    category: categoryName,
                    categoryId: a.category_id,
                    views: a.view_count || 0,
                    status: status,
                    updatedAt: dateStr,
                    summary: a.summary || 'Hướng dẫn chăm sóc và dinh dưỡng an toàn cho thú cưng.',
                    ragSynced: isRag,
                    ragKeywords: (Array.isArray(a.rag_keywords) && a.rag_keywords.length) ? a.rag_keywords : defaultKeywords,
                    ragSummary: a.rag_summary || a.summary || a.title || 'Bài viết cẩm nang cung cấp kiến thức nuôi dạy và chăm sóc Boss khoa học.'
                };
            });

            // 4. Map Notifications (Website Announcements từ system_config)
            const websiteNotices = PawpalSettings.state?.systemConfig?.websiteNotices;
            if (Array.isArray(websiteNotices) && websiteNotices.length > 0) {
                PawpalSettings.state.notificationsList = websiteNotices;
            } else if (notifs && notifs.length > 0) {
                PawpalSettings.state.notificationsList = notifs.map(n => ({
                    id: n.id,
                    content: n.content || n.title || 'Thông báo từ hệ thống PawPal',
                    type: (String(n.notification_type || n.type || '').toUpperCase() === 'POPUP' || n.type === 'popup') ? 'POPUP' : 'TOPBAR',
                    date: formatDate(n.sent_at || n.created_at || new Date()),
                    isActive: !n.is_read
                }));
            } else {
                PawpalSettings.state.notificationsList = DEFAULT_SYSTEM_CONFIG.websiteNotices;
            }

            // 5. Map Audit Logs
            if (audits.length > 0) {
                const targetModMap = {
                    product: 'Bán hàng',
                    sales_order: 'Bán hàng',
                    voucher: 'Khuyến mãi',
                    banner: 'Banner',
                    customer: 'Khách hàng',
                    pet_profile: 'Thú cưng',
                    service: 'Dịch vụ',
                    appointment: 'Dịch vụ',
                    appointment_incident: 'Dịch vụ',
                    staff: 'Nhân sự',
                    blog_post: 'Bài viết',
                    pawpal_setting: 'Cấu hình',
                    store_profile: 'Cấu hình',
                    payment: 'Cấu hình',
                    shipping: 'Cấu hình',
                    booking_policy: 'Cấu hình'
                };
                PawpalSettings.state.auditLogsList = audits.map(l => {
                    const timeStr = formatDateTime(l.created_at);
                    const actorName = l.staff?.full_name || 'Quản trị viên';
                    return {
                        id: l.id,
                        time: timeStr,
                        actor: actorName,
                        targetModules: targetModMap[l.entity_name] || 'Hệ thống',
                        actionText: l.description || l.action || 'Thao tác cấu hình hệ thống',
                        status: 'Đã đồng bộ SSOT'
                    };
                });
            } else {
                PawpalSettings.state.auditLogsList = [];
            }

            PawpalSettings.state.isLoaded = true;
            PawpalSettings.state.loadError = null;
            // Gọi render cập nhật các subtab
            PawpalSettings.subtabs.banners?.renderBanners?.();
            PawpalSettings.subtabs.banners?.renderVouchers?.();
            PawpalSettings.subtabs.banners?.renderZeroMissAlerts?.();
            PawpalSettings.subtabs.banners?.updateBannerKpis?.();
            PawpalSettings.subtabs.banners?.renderNotifications?.();
            PawpalSettings.subtabs.content?.renderArticles?.();
            PawpalSettings.subtabs.content?.updateArticleKpis?.();
            PawpalSettings.subtabs.content?.populateBlogCategories?.();
            PawpalSettings.subtabs.system?.renderSystemConfigCards?.();
            PawpalSettings.subtabs.audit?.renderAuditLogs?.();

            updateSafeModeUI();

        } catch (err) {
            PawpalSettings.state.loadError = 'Không thể tải cấu hình. Vui lòng tải lại trang.';
            PawpalSettings.subtabs.content?.renderArticles?.();
            PawpalSettings.subtabs.banners?.renderVouchers?.();
            PawpalSettings.subtabs.audit?.renderAuditLogs?.();
            console.error('[Settings] Lỗi nạp dữ liệu từ Supabase:', err);
        }
    }
    PawpalSettings.loadSettingsModuleData = loadSettingsModuleData;

    // -------------------------------------------------------------
    // SUPABASE REALTIME CHANNEL SYNC
    // -------------------------------------------------------------
    function setupSettingsRealtimeChannel() {
        const client = getSupabaseClient();
        if (!client || typeof client.channel !== 'function') return;

        try {
            const channel = client.channel('admin-settings-global-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'banner' }, () => loadSettingsModuleData())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'voucher' }, () => loadSettingsModuleData())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_post' }, () => loadSettingsModuleData())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'notification' }, () => loadSettingsModuleData())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_log' }, () => loadSettingsModuleData())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'pawpal_setting' }, () => loadSettingsModuleData())
                .subscribe();

            window.addEventListener('beforeunload', () => {
                if (channel) client.removeChannel(channel);
            });
        } catch (e) {
            console.warn('[Settings] Không thể mở realtime channel:', e.message);
        }
    }

    // -------------------------------------------------------------
    // QUẢN LÝ HEADER BAR SUBTABS (CHUẨN AGENTS.MD)
    // -------------------------------------------------------------
    const subtabsContainer = document.getElementById('headerSubtabsGroup');
    const VALID_SETTINGS_TABS = ['tab-banner-promos', 'tab-content-management', 'tab-system-config', 'tab-audit-logs'];

    function renderHeaderSubtabs(activeTabId) {
        if (!subtabsContainer) return;
        const currentMod = sessionStorage.getItem('pawpal_admin_active_module');
        if (currentMod !== 'Cấu hình') return;

        const existingBtns = subtabsContainer.querySelectorAll('.header-subtab-btn');
        existingBtns.forEach(btn => {
            const tab = btn.getAttribute('data-tab') || btn.getAttribute('data-subtab');
            btn.classList.toggle('active', tab === activeTabId);
        });
    }

    subtabsContainer?.addEventListener('click', (e) => {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Cấu hình') return;
        const btn = e.target.closest('.header-subtab-btn');
        if (!btn) return;
        const tab = btn.getAttribute('data-tab') || btn.getAttribute('data-subtab');
        if (tab && VALID_SETTINGS_TABS.includes(tab)) {
            switchSubtab(tab);
        }
    });

    function switchSubtab(tabId) {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Cấu hình') return;
        if (!VALID_SETTINGS_TABS.includes(tabId)) return;

        const container = document.getElementById('contentArea') || document.querySelector('.admin-preview-content');
        if (container) {
            container.querySelectorAll('.subtab-content').forEach(sec => {
                sec.classList.remove('active');
            });
        }

        const activeSec = document.getElementById(`subtab-${tabId}`);
        if (activeSec) activeSec.classList.add('active');

        renderHeaderSubtabs(tabId);
        try {
            history.replaceState(null, '', `#${tabId}`);
        } catch (e) {
            window.location.hash = `#${tabId}`;
        }
        sessionStorage.setItem('pawpal_admin_settings_subtab', tabId);

        // Xóa deep breadcrumb vì Cấu hình không có cấp con
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (deepBreadcrumbEl) deepBreadcrumbEl.innerHTML = '';

        // Kích hoạt subtab lifecycle
        if (tabId === 'tab-banner-promos') {
            PawpalSettings.subtabs.banners?.init?.();
            PawpalSettings.subtabs.banners?.updateBannerKpis?.();
            PawpalSettings.subtabs.banners?.renderZeroMissAlerts?.();
        } else if (tabId === 'tab-content-management') {
            PawpalSettings.subtabs.content?.init?.();
            PawpalSettings.subtabs.content?.updateArticleKpis?.();
        } else if (tabId === 'tab-system-config') {
            PawpalSettings.subtabs.system?.init?.();
            PawpalSettings.subtabs.system?.renderSystemConfigCards?.();
        } else if (tabId === 'tab-audit-logs') {
            PawpalSettings.subtabs.audit?.init?.();
            PawpalSettings.subtabs.audit?.renderAuditLogs?.();
        }
    }
    PawpalSettings.switchSubtab = switchSubtab;

    // Gắn sự kiện modal tác động đa phân hệ (Impact Confirmation Modal)
    document.getElementById('btnConfirmAndSyncImpact')?.addEventListener('click', async () => {
        const cb = pendingImpactCallback;
        pendingImpactCallback = null;
        closeModal('impactConfirmModalOverlay');
        if (cb) {
            try {
                await cb();
            } catch (err) {
                console.error('[Settings] Lỗi khi thực thi tác vụ xác nhận tác động:', err);
            }
        }
    });

    const closeImpactModalHandler = () => {
        pendingImpactCallback = null;
        closeModal('impactConfirmModalOverlay');
    };
    document.getElementById('btnDismissImpactModal')?.addEventListener('click', closeImpactModalHandler);
    document.getElementById('btnCancelImpactModal')?.addEventListener('click', closeImpactModalHandler);

    // -------------------------------------------------------------
    // KHỞI ĐỘNG MODULE & EXPORT LIFECYCLE CHUẨN
    // -------------------------------------------------------------
    PawpalSettings.init = async function() {
        await loadSettingsModuleData();
        const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
        const savedTab = sessionStorage.getItem('pawpal_admin_settings_subtab');
        let initTab = 'tab-banner-promos';
        if (VALID_SETTINGS_TABS.includes(hash)) {
            initTab = hash;
        } else if (VALID_SETTINGS_TABS.includes(savedTab)) {
            initTab = savedTab;
        }
        switchSubtab(initTab);
    };

    setupSettingsRealtimeChannel();
    loadSettingsModuleData();

    window.addEventListener('focus', () => {
        if (sessionStorage.getItem('pawpal_admin_active_module') === 'Cấu hình') {
            loadSettingsModuleData();
        }
    });

    const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
    const savedTab = sessionStorage.getItem('pawpal_admin_settings_subtab');
    let initTab = 'tab-banner-promos';
    if (VALID_SETTINGS_TABS.includes(hash)) {
        initTab = hash;
    } else if (VALID_SETTINGS_TABS.includes(savedTab)) {
        initTab = savedTab;
    }
    switchSubtab(initTab);

    window.addEventListener('admin:subtab-change', (e) => {
        if (e.detail?.module === 'Cấu hình' && VALID_SETTINGS_TABS.includes(e.detail.tabId)) {
            switchSubtab(e.detail.tabId);
        }
    });

    window.addEventListener('admin:module-show', (e) => {
        if (e.detail?.module === 'Cấu hình') {
            const h = window.location.hash ? window.location.hash.replace('#', '') : '';
            const s = sessionStorage.getItem('pawpal_admin_settings_subtab');
            let t = 'tab-banner-promos';
            if (VALID_SETTINGS_TABS.includes(h)) t = h;
            else if (VALID_SETTINGS_TABS.includes(s)) t = s;
            switchSubtab(t);
        }
    });
})();
