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

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str).replace(/[&<>"']/g, m => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[m]);
    }
    PawpalSettings.escapeHtml = escapeHtml;

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
            console.error('[PawpalSettings] Không tìm thấy modal xác nhận tác động liên phân hệ. Hủy thao tác để đảm bảo an toàn.');
            showToast('Không thể hiển thị hộp thoại xác nhận tác động liên phân hệ. Thao tác đã bị hủy để đảm bảo an toàn!', 'danger');
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

    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    PawpalSettings.escapeHtml = escapeHtml;

    // Helper: Ghi nhật ký cấu hình vào bảng audit_log Supabase
    async function logSystemAudit(action, entityName, description) {
        try {
            const client = getSupabaseClient();
            if (!client) return;

            let staffId = null;
            try {
                const { data: authData } = await client.auth.getUser();
                if (authData?.user?.id) staffId = authData.user.id;
            } catch (e) {}

            if (!staffId) {
                try {
                    const adminUser = JSON.parse(localStorage.getItem('pawpal_admin_user') || sessionStorage.getItem('pawpal_admin_user') || '{}');
                    if (adminUser?.id) staffId = adminUser.id;
                } catch (e) {}
            }

            const { error } = await client.from('audit_log').insert([{
                staff_id: staffId || null,
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
            companyName: 'Pawpal Pet Center',
            hotline: '',
            emergencyPhone: '',
            email: '',
            address: '',
            taxId: '',
            zaloUrl: '',
            facebookUrl: ''
        },
        paymentMethods: {
            cod: { enabled: true, name: 'Thanh toán khi nhận hàng (COD)', fee: 0 },
            bank: {
                enabled: false,
                name: 'Chuyển khoản QR Banking',
                bankName: '',
                accountNumber: '',
                accountHolder: '',
                syntax: 'PAWPAL [Mã đơn]'
            },
            momo: { enabled: false, name: 'Ví điện tử MoMo', merchantId: '' },
            vnpay: { enabled: false, name: 'Cổng thanh toán VNPay', tmnCode: '' }
        },
        shippingPolicy: {
            freeShippingThreshold: 300000,
            innerCityFee: 25000,
            outerCityFee: 35000,
            expressFee: 45000,
            primaryPartner: 'ghn',
            partnerName: 'Giao Hàng Nhanh (GHN Express)',
            shopId: '',
            apiKey: ''
        },
        operatingHours: {
            weekday: { open: '08:00', close: '20:00' },
            weekend: { open: '08:00', close: '21:00' },
            holidayNotice: ''
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
        websiteNotices: []
    };

    PawpalSettings.state = {
        bannersList: [],
        vouchersList: [],
        articlesList: [],
        notificationsList: [],
        auditLogsList: [],
        hasSystemConfig: false,
        systemConfig: JSON.parse(localStorage.getItem('pawpal_admin_system_config') || 'null') || DEFAULT_SYSTEM_CONFIG,
        isSafeModeLocked: true,
        currentActiveVoucherCode: null,
        currentActiveArticleId: null
    };

    // [CFG-35] Chuẩn hóa Canonical Policy Service & Cross-Module SLA Accessor
    window.PawpalPolicy = {
        getBookingCutoffHours() {
            return PawpalSettings.state?.systemConfig?.bookingPolicy?.freeCancelHours ?? 4;
        },
        getTicketSlaHours(priority = 'NORMAL') {
            const p = String(priority).toUpperCase();
            if (p === 'HIGH' || p === 'URGENT') return 4;
            if (p === 'LOW') return 48;
            return 24;
        },
        getRosterMaxDailyHours() {
            return 8;
        },
        getPointConversionRate() {
            return PawpalSettings.state?.systemConfig?.pawpointsPolicy?.pointValueVnd ?? 100;
        }
    };
    PawpalSettings.getCanonicalPolicy = (key) => {
        if (key === 'bookingCutoffHours') return window.PawpalPolicy.getBookingCutoffHours();
        if (key === 'pointRate') return window.PawpalPolicy.getPointConversionRate();
        return null;
    };

    async function persistSystemConfig(newCfg) {
        if (PawpalSettings.state?.isSafeModeLocked) {
            throw new Error('Khóa an toàn hệ thống đang bật. Vui lòng mở khóa cấu hình trước khi thực hiện thay đổi.');
        }
        if (!newCfg || typeof newCfg !== 'object') {
            throw new Error('Dữ liệu cấu hình hệ thống không hợp lệ.');
        }

        const client = getSupabaseClient();
        if (!client) {
            throw new Error('Không thể kết nối cơ sở dữ liệu Supabase. Vui lòng kiểm tra phiên đăng nhập.');
        }

        try {
            const { error } = await client.from('pawpal_setting').upsert([{
                setting_key: 'system_config',
                setting_value: JSON.stringify(newCfg),
                setting_type: 'json',
                description: 'Cấu hình vận hành hệ thống Pawpal',
                updated_at: new Date().toISOString()
            }], { onConflict: 'setting_key' });

            if (error) throw error;

            // Chỉ cập nhật state và localStorage sau khi CSDL đã commit thành công
            PawpalSettings.state.systemConfig = JSON.parse(JSON.stringify(newCfg));
            PawpalSettings.state.hasSystemConfig = true;
            localStorage.setItem('pawpal_admin_system_config', JSON.stringify(newCfg));
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
    // Đồng bộ Supabase Live Database qua PawpalDataStore
    async function fetchPromosData({ force = false } = {}) {
        const fetcher = async () => {
            const client = getSupabaseClient();
            if (!client) throw new Error('Chưa kết nối cơ sở dữ liệu');
            const [bannersRes, vouchersRes, notifsRes] = await Promise.all([
                client.from('banner').select('*').order('created_at', { ascending: false }),
                client.from('voucher').select('*').order('created_at', { ascending: false }),
                client.from('notification').select('*').order('sent_at', { ascending: false })
            ]);
            if (bannersRes.error) throw bannersRes.error;
            if (vouchersRes.error) throw vouchersRes.error;
            return {
                banners: bannersRes.data || [],
                vouchers: vouchersRes.data || [],
                notifs: notifsRes.data || []
            };
        };

        try {
            let res;
            if (window.PawpalDataStore) {
                res = await window.PawpalDataStore.fetch('settings:promos', fetcher, {
                    ttlMs: window.PawpalDataStore.TTL_TIERS.CATALOG,
                    force
                });
            } else {
                res = await fetcher();
            }

            const banners = res.banners || [];
            const vouchers = res.vouchers || [];
            const notifs = res.notifs || [];

            PawpalSettings.state.bannersList = banners.map(b => {
                let sDate = b.start_date ? b.start_date.substring(0, 10) : '';
                let eDate = b.end_date ? b.end_date.substring(0, 10) : '';
                const isActive = b.status === 'dang_hien_thi' || b.status === 'ACTIVE' || b.is_active === true;
                return {
                    id: b.id,
                    title: b.title || 'Banner ưu đãi PawPal',
                    cta: b.button_text || b.cta_text || 'Xem ngay',
                    url: b.link || b.link_url || '/pages/public/services/',
                    startDate: sDate || 'Chưa định ngày',
                    endDate: eDate || 'Chưa định ngày',
                    status: isActive ? 'active' : 'paused',
                    imageText: b.image_url ? b.image_url.split('/').pop() : 'Banner_Pawpal.jpg',
                    imageUrl: b.image_url || '',
                    endDateRaw: eDate
                };
            });

            PawpalSettings.state.vouchersList = vouchers.map(v => {
                const code = v.voucher_code || v.code || 'PAWPALCARE';
                const name = v.voucher_name || v.name || ('Voucher ' + code);
                const isPercent = (v.type === 'percentage' || v.type === 'percent' || !!v.discount_percent);
                const val = Number(v.discount_value ?? v.discount_amount ?? v.discount_percent ?? 0);
                let endDateStr = v.end_date ? ('Đến ' + formatDate(v.end_date)) : 'Không thời hạn';

                let target = 'Shop';
                const appFor = (Array.isArray(v.applicable_for) ? v.applicable_for.join(',') : String(v.applicable_for || v.applicable_service || '')).toLowerCase();
                if (appFor.includes('spa') || appFor.includes('care')) target = 'Spa';
                else if (appFor.includes('hotel')) target = 'Hotel';
                else if (appFor.includes('taxi')) target = 'Taxi';
                else if (appFor.includes('all') || appFor.includes('system')) target = 'System';
                else if (appFor.includes('shop') || appFor.includes('store') || appFor.includes('cửa hàng')) target = 'Shop';

                let status = 'active';
                if (v.is_active === false) status = 'paused';
                const hasLimit = (v.max_usage !== null && v.max_usage !== undefined) || (v.total_usage_limit !== null && v.total_usage_limit !== undefined);
                const maxUse = hasLimit ? Number(v.max_usage ?? v.total_usage_limit) : null;
                const curUse = Number(v.usage_count || v.current_usage_count || 0);
                if ((v.end_date && Date.parse(v.end_date) < Date.now()) || (maxUse !== null && maxUse > 0 && curUse >= maxUse)) {
                    status = 'expired';
                }

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

            const websiteNotices = PawpalSettings.state?.systemConfig?.websiteNotices;
            if (Array.isArray(websiteNotices) && websiteNotices.length > 0) {
                PawpalSettings.state.notificationsList = websiteNotices;
            } else if (notifs && notifs.length > 0) {
                PawpalSettings.state.notificationsList = notifs.map(n => ({
                    id: n.id,
                    content: n.content || n.title || 'Thông báo từ hệ thống PawPal',
                    type: (String(n.notification_type || n.type || '').toUpperCase() === 'POPUP' || n.type === 'popup') ? 'POPUP' : 'TOPBAR',
                    date: formatDate(n.sent_at || n.created_at || new Date()),
                    isActive: Boolean(n.is_active ?? true)
                }));
            } else {
                PawpalSettings.state.notificationsList = [];
            }

            PawpalSettings.subtabs.banners?.renderBanners?.();
            PawpalSettings.subtabs.banners?.renderVouchers?.();
            PawpalSettings.subtabs.banners?.renderZeroMissAlerts?.();
            PawpalSettings.subtabs.banners?.updateBannerKpis?.();
            PawpalSettings.subtabs.banners?.renderNotifications?.();
            return res;
        } catch (err) {
            console.error('[Settings] Lỗi nạp promos/vouchers:', err);
            PawpalSettings.subtabs.banners?.renderVouchers?.();
            return null;
        }
    }

    async function fetchContentData({ force = false } = {}) {
        const fetcher = async () => {
            const client = getSupabaseClient();
            if (!client) throw new Error('Chưa kết nối cơ sở dữ liệu');
            const [blogsRes, categoriesRes] = await Promise.all([
                client.from('blog_post').select('id, title, category_id, view_count, status, updated_at, created_at, summary, rag_synced, rag_keywords, rag_summary').order('created_at', { ascending: false }),
                client.from('blog_category').select('id, category_name, description').order('display_order')
            ]);
            if (blogsRes.error) throw blogsRes.error;
            return {
                blogs: blogsRes.data || [],
                categories: categoriesRes.data || []
            };
        };

        try {
            let res;
            if (window.PawpalDataStore) {
                res = await window.PawpalDataStore.fetch('settings:content', fetcher, {
                    ttlMs: window.PawpalDataStore.TTL_TIERS.CATALOG,
                    force
                });
            } else {
                res = await fetcher();
            }

            const blogs = res.blogs || [];
            const categoriesData = res.categories || [];
            PawpalSettings.state.blogCategoriesList = categoriesData.filter(c => c && c.category_name && c.category_name.trim());

            const ragSyncedIds = PawpalSettings.state?.systemConfig?.ragSyncedArticleIds || [];
            PawpalSettings.state.articlesList = blogs.map(a => {
                const catObj = categoriesData.find(category => category.id === a.category_id);
                const categoryName = catObj?.description || catObj?.category_name || 'Chưa phân loại';

                let status = 'draft';
                const sUpper = (a.status || '').toUpperCase();
                if (sUpper === 'PUBLISHED' || sUpper === 'DA_DANG' || sUpper === 'ACTIVE') status = 'published';
                else if (sUpper === 'DRAFT' || sUpper === 'BAN_NHAP') status = 'draft';
                else if (sUpper === 'ARCHIVED' || sUpper === 'HIDDEN' || sUpper === 'DA_AN') status = 'hidden';
                else if (sUpper === 'PENDING_REVIEW' || sUpper === 'CHO_DUYET') status = 'pending_review';
                else status = 'draft';

                const dateObj = a.updated_at ? new Date(a.updated_at) : (a.created_at ? new Date(a.created_at) : new Date());
                const dateStr = formatDate(dateObj);
                const isRag = status === 'published' && (ragSyncedIds.includes(a.id) || Boolean(a.rag_synced ?? a.ragSynced ?? false));
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

            PawpalSettings.subtabs.content?.renderArticles?.();
            PawpalSettings.subtabs.content?.updateArticleKpis?.();
            PawpalSettings.subtabs.content?.populateBlogCategories?.();
            return res;
        } catch (err) {
            console.error('[Settings] Lỗi nạp nội dung blog:', err);
            PawpalSettings.subtabs.content?.renderArticles?.();
            return null;
        }
    }

    async function fetchSystemConfigData({ force = false } = {}) {
        const fetcher = async () => {
            const client = getSupabaseClient();
            if (!client) throw new Error('Chưa kết nối cơ sở dữ liệu');
            const [appSettingsRes, servicesRes, productsRes] = await Promise.all([
                client.from('pawpal_setting').select('*'),
                client.from('service').select('id, service_code, service_name, estimated_duration').order('service_name'),
                client.from('product').select('id, sku, product_name, sale_price').order('product_name').limit(50)
            ]);
            return {
                appSettings: appSettingsRes.data || [],
                services: servicesRes.data || [],
                products: productsRes.data || []
            };
        };

        try {
            let res;
            if (window.PawpalDataStore) {
                res = await window.PawpalDataStore.fetch('settings:system', fetcher, {
                    ttlMs: window.PawpalDataStore.TTL_TIERS.STATIC_CONFIG,
                    force
                });
            } else {
                res = await fetcher();
            }

            PawpalSettings.state.servicesList = res.services || [];
            PawpalSettings.state.productsList = res.products || [];

            const appSettingsData = res.appSettings || [];
            PawpalSettings.state.hasSystemConfig = false;
            if (appSettingsData.length > 0) {
                appSettingsData.forEach(row => {
                    if (row.setting_key === 'system_config' && row.setting_value) {
                        try {
                            let parsed = row.setting_value;
                            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                            if (typeof parsed === 'string') parsed = JSON.parse(parsed);
                            if (parsed && typeof parsed === 'object') {
                                // CFG-01: Bảo mật không phơi nhiễm token/secret
                                if (parsed.shippingPolicy) delete parsed.shippingPolicy.apiKey;
                                PawpalSettings.state.systemConfig = parsed;
                                PawpalSettings.state.hasSystemConfig = true;
                            }
                        } catch (e) {
                            console.error('[Settings] Không đọc được system_config:', e.message);
                        }
                    }
                });
            }

            PawpalSettings.subtabs.system?.renderSystemConfigCards?.();
            updateSafeModeUI();
            return res;
        } catch (err) {
            console.error('[Settings] Lỗi nạp system_config:', err);
            return null;
        }
    }

    async function fetchAuditData({ force = false } = {}) {
        const fetcher = async () => {
            const client = getSupabaseClient();
            if (!client) throw new Error('Chưa kết nối cơ sở dữ liệu');
            const { data, error } = await client
                .from('audit_log')
                .select('id, staff_id, action, entity_name, description, status, error, sync_status, created_at, staff:staff_id(full_name)')
                .order('created_at', { ascending: false })
                .limit(50);
            if (error) throw error;
            return data || [];
        };

        try {
            let audits;
            if (window.PawpalDataStore) {
                audits = await window.PawpalDataStore.fetch('settings:audit', fetcher, {
                    ttlMs: window.PawpalDataStore.TTL_TIERS.OPERATIONAL,
                    force
                });
            } else {
                audits = await fetcher();
            }

            if (audits && audits.length > 0) {
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
                    const auditStatus = l.status || (l.error ? 'Thất bại' : (l.sync_status || 'Đã ghi nhận'));
                    return {
                        id: l.id,
                        time: timeStr,
                        actor: actorName,
                        targetModules: targetModMap[l.entity_name] || 'Hệ thống',
                        actionText: l.description || l.action || 'Thao tác cấu hình hệ thống',
                        status: auditStatus
                    };
                });
            } else {
                PawpalSettings.state.auditLogsList = [];
            }

            PawpalSettings.subtabs.audit?.renderAuditLogs?.();
            return audits;
        } catch (err) {
            console.error('[Settings] Lỗi nạp audit_log:', err);
            PawpalSettings.subtabs.audit?.renderAuditLogs?.();
            return [];
        }
    }

    PawpalSettings.fetchPromosData = fetchPromosData;
    PawpalSettings.fetchContentData = fetchContentData;
    PawpalSettings.fetchSystemConfigData = fetchSystemConfigData;
    PawpalSettings.fetchAuditData = fetchAuditData;

    let loadSettingsPromise = null;

    async function loadSettingsModuleData(options = {}) {
        if (loadSettingsPromise && !options.force) {
            return loadSettingsPromise;
        }

        loadSettingsPromise = (async () => {
            try {
                PawpalSettings.state.loadError = null;
                await Promise.allSettled([
                    fetchPromosData(options),
                    fetchContentData(options),
                    fetchSystemConfigData(options),
                    fetchAuditData(options)
                ]);
                PawpalSettings.state.isLoaded = true;
            } catch (err) {
                PawpalSettings.state.loadError = 'Không thể tải cấu hình. Vui lòng tải lại trang.';
                console.error('[Settings] Lỗi nạp dữ liệu:', err);
            }
        })().finally(() => {
            loadSettingsPromise = null;
        });

        return loadSettingsPromise;
    }
    PawpalSettings.loadSettingsModuleData = loadSettingsModuleData;

    // Lắng nghe mutation liên phân hệ
    if (window.PawpalDataStore) {
        window.PawpalDataStore.subscribeMutations((mutation) => {
            if (mutation.entity === 'voucher' || mutation.entity === 'banner' || mutation.entity === 'notification') {
                window.PawpalDataStore.invalidate('settings:promos*');
                if (mutation.entity === 'voucher') {
                    window.PawpalDataStore.invalidate('orders:vouchers*');
                }
            } else if (mutation.entity === 'blog_post' || mutation.entity === 'blog_category') {
                window.PawpalDataStore.invalidate('settings:content*');
            } else if (mutation.entity === 'pawpal_setting') {
                window.PawpalDataStore.invalidate('settings:system*');
                window.PawpalDataStore.invalidate('dashboard:*');
            } else if (mutation.entity === 'audit_log') {
                window.PawpalDataStore.invalidate('settings:audit*');
            }
        });
    }

    // -------------------------------------------------------------
    // SUPABASE REALTIME CHANNEL SYNC (CFG-09: Debounce 300ms)
    // -------------------------------------------------------------
    function debouncedLoadSettings(table) {
        if (window.PawpalDataStore?.handleRealtimeChange) {
            window.PawpalDataStore.handleRealtimeChange({
                moduleName: 'Cấu hình',
                invalidatePattern: table ? `settings:${table}:*` : 'settings:*',
                onActiveRefresh: async () => {
                    await loadSettingsModuleData({ force: true });
                },
                debounceMs: 300
            });
        } else if (sessionStorage.getItem('pawpal_admin_active_module') === 'Cấu hình') {
            loadSettingsModuleData({ force: true });
        }
    }

    function setupSettingsRealtimeChannel() {
        const client = getSupabaseClient();
        if (!client || typeof client.channel !== 'function') return;

        try {
            const channel = client.channel('admin-settings-global-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'banner' }, () => debouncedLoadSettings('banner'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'voucher' }, () => debouncedLoadSettings('voucher'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_post' }, () => debouncedLoadSettings('blog_post'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'notification' }, () => debouncedLoadSettings('notification'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'audit_log' }, () => debouncedLoadSettings('audit_log'))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'pawpal_setting' }, () => debouncedLoadSettings('pawpal_setting'))
                .subscribe();

            window.PawpalDataStore?.recordMetric?.('channel-add', 'admin-settings-global-sync');

            window.addEventListener('beforeunload', () => {
                if (channel) {
                    client.removeChannel(channel);
                    window.PawpalDataStore?.recordMetric?.('channel-remove', 'admin-settings-global-sync');
                }
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

    // CFG-10: Scope chuyển subtab chuẩn chỉ trong phạm vi các tab thuộc phân hệ Cấu hình
    function switchSubtab(tabId) {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Cấu hình') return;
        if (!VALID_SETTINGS_TABS.includes(tabId)) return;

        VALID_SETTINGS_TABS.forEach(t => {
            const sec = document.getElementById(`subtab-${t}`);
            if (sec) sec.classList.remove('active');
        });

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

    window.addEventListener('focus', () => {
        if (sessionStorage.getItem('pawpal_admin_active_module') === 'Cấu hình') {
            loadSettingsModuleData();
        }
    });

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
