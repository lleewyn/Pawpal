// admin.js - Quản trị hệ thống Pawpal-er

// ====================================================================
// CHUẨN HÓA HÀM ĐỊNH DẠNG THỜI GIAN TOÀN HỆ THỐNG
// Định dạng hiển thị chuẩn: YYYY-MM-DD HH:mm (không giây), YYYY-MM-DD, HH:mm
// ====================================================================
function formatDateTime(dateInput) {
    if (!dateInput) return '—';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function formatDate(dateInput) {
    if (!dateInput) return '—';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

function formatTime(dateInput) {
    if (!dateInput) return '—';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
}

function toUnaccent(str) {
    if (!str) return '';
    return String(str)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, m => m === 'đ' ? 'd' : 'D')
        .toLowerCase()
        .trim();
}

function matchSearch(sourceText, searchTerm) {
    if (!searchTerm) return true;
    if (!sourceText) return false;
    const src = String(sourceText).toLowerCase();
    const query = String(searchTerm).toLowerCase().trim();
    if (src.includes(query)) return true;
    return toUnaccent(sourceText).includes(toUnaccent(searchTerm));
}

if (typeof window !== 'undefined') {
    window.formatDateTime = formatDateTime;
    window.formatDate = formatDate;
    window.formatTime = formatTime;
    window.toUnaccent = toUnaccent;
    window.matchSearch = matchSearch;
}

function getAdminSessionUser() {
    try {
        const raw = sessionStorage.getItem('pawpal_admin_user') 
                 || localStorage.getItem('pawpal_admin_user');
        if (raw) {
            const user = typeof raw === 'string' ? JSON.parse(raw) : raw;
            // Bảo mật nghiêm ngặt: Tuyệt đối không cho phép tài khoản Khách hàng truy cập Admin
            if (user && (user.role === 'customer' || user.system_role === 'CUSTOMER')) {
                sessionStorage.removeItem('pawpal_admin_user');
                localStorage.removeItem('pawpal_admin_user');
                return null;
            }
            if (user && (user.id || user.auth_user_id || user.email)) {
                return user;
            }
        }
    } catch (e) {}
    return null;
}

document.addEventListener('DOMContentLoaded', () => {
    // Tắt tính năng tự khôi phục vị trí cuộn của trình duyệt để triệt tiêu 100% hiện tượng trôi Header bar
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;

    // Khóa cứng cửa sổ window tại vị trí đỉnh để Header và Sidebar Brand luôn cố định tuyệt đối
    window.addEventListener('scroll', () => {
        if (window.scrollY !== 0 || window.scrollX !== 0) {
            window.scrollTo(0, 0);
        }
    }, { passive: false });

    const adminUser = getAdminSessionUser();
    if (!adminUser) {
        window.location.replace('/admin/login');
        return;
    }
    const headerUserTag = document.querySelector('.header-user-tag');
    if (headerUserTag && adminUser) {
        const name = adminUser.name || adminUser.full_name;
        const roleLabel = adminUser.system_role === 'ADMIN' ? 'Quản trị' : (adminUser.position || 'Nhân sự');
        headerUserTag.textContent = name ? `${name} (${roleLabel})` : 'Quản trị viên';
    }
    const sidebarBtns = document.querySelectorAll('.sidebar-menu-btn');
    const moduleTitleEl = document.getElementById('headerModuleTitle');
    const subtabsContainer = document.getElementById('headerSubtabsGroup');
    const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
    const contentArea = document.querySelector('.admin-preview-content');
    const headerSyncStatusEl = document.getElementById('headerSyncStatus');
    const btnHeaderRefreshEl = document.getElementById('btnHeaderRefresh');

    function updateHeaderSync(state = 'idle', customText = null) {
        if (!headerSyncStatusEl) return;
        headerSyncStatusEl.classList.remove('is-syncing', 'is-error');
        if (state === 'syncing') {
            headerSyncStatusEl.classList.add('is-syncing');
            headerSyncStatusEl.textContent = customText || 'Đang đồng bộ...';
        } else if (state === 'error') {
            headerSyncStatusEl.classList.add('is-error');
            headerSyncStatusEl.textContent = customText || 'Không thể đồng bộ';
        } else {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            headerSyncStatusEl.textContent = customText || `Đã đồng bộ lúc ${hh}:${mm}`;
        }
    }

    window.addEventListener('pawpal:data-refreshed', () => {
        updateHeaderSync('idle');
    });

    btnHeaderRefreshEl?.addEventListener('click', async () => {
        const activeMod = sessionStorage.getItem('pawpal_admin_active_module') || 'Dashboard';
        updateHeaderSync('syncing', 'Đang làm mới...');
        btnHeaderRefreshEl.disabled = true;
        btnHeaderRefreshEl.style.opacity = '0.6';

        try {
            if (activeMod === 'Dashboard' && window.PawpalDashboard?.loadDashboardData) {
                window.PawpalDataStore?.invalidate('dashboard:*');
                await window.PawpalDashboard.loadDashboardData({ force: true });
                window.PawpalDashboard.init?.();
            } else if (activeMod === 'Khách hàng' && window.PawpalCustomers?.loadCustomersModuleData) {
                window.PawpalDataStore?.invalidate('customers:*');
                await window.PawpalCustomers.loadCustomersModuleData({ force: true });
                window.PawpalCustomers.subtabs?.list?.renderCustomersTable?.();
            } else if (activeMod === 'Thú cưng' && window.PawpalPets?.loadPetsModuleData) {
                window.PawpalDataStore?.invalidate('pets:*');
                await window.PawpalPets.loadPetsModuleData({ force: true });
                window.PawpalPets.subtabs?.list?.renderPetsTable?.();
            } else if (activeMod === 'Dịch vụ' && window.PawpalServices?.loadServicesData) {
                window.PawpalDataStore?.invalidate('services:*');
                await window.PawpalServices.loadServicesData({ force: true });
                window.PawpalServices.subtabs?.bookings?.renderBookingsTable?.();
            } else if (activeMod === 'Bán hàng' && window.PawpalOrdersModule?.syncOrdersAndProductsFromSupabase) {
                window.PawpalDataStore?.invalidate('orders:*');
                await window.PawpalOrdersModule.syncOrdersAndProductsFromSupabase({ force: true });
            } else if (activeMod === 'Nhân sự' && window.PawpalStaff?.loadStaffModuleData) {
                window.PawpalDataStore?.invalidate('staff:*');
                await window.PawpalStaff.loadStaffModuleData({ force: true });
                window.PawpalStaff.subtabs?.list?.renderStaffTable?.();
            } else if (activeMod === 'Khiếu nại' && window.PawpalComplaints?.loadComplaintsModuleData) {
                window.PawpalDataStore?.invalidate('complaints:*');
                await window.PawpalComplaints.loadComplaintsModuleData({ force: true });
            } else if (activeMod === 'Cấu hình' && window.PawpalSettings?.loadSettingsModuleData) {
                window.PawpalDataStore?.invalidate('settings:*');
                await window.PawpalSettings.loadSettingsModuleData({ force: true });
            } else if (activeMod === 'Chatbot' && window.PawpalChatbot?.loadInboxSummary) {
                await window.PawpalChatbot.loadInboxSummary();
            }
            updateHeaderSync('idle');
        } catch (err) {
            console.warn('[Admin] Lỗi làm mới dữ liệu phân hệ:', err);
            updateHeaderSync('error', 'Lỗi làm mới');
        } finally {
            btnHeaderRefreshEl.disabled = false;
            btnHeaderRefreshEl.style.opacity = '1';
        }
    });

    // ====================================================================
    // MODULE HTML CACHE — Lưu HTML đã tải để không fetch lại khi quay về
    // ====================================================================
    const _moduleHtmlCache = new Map();

    // ====================================================================
    // MODULE DOM CACHE — Giữ nguyên DOM đã render, chuyển module = show/hide
    // ====================================================================
    const _moduleDomCache = new Map();   // moduleName → HTMLElement
    const _moduleScriptsLoaded = new Set(); // src string đã load → không load lại
    let _currentModule = null;

    // Header subtabs are rendered by the shell and may be replaced when a
    // module script initializes. Delegate the click so every render remains
    // functional, including the Cấu hình tabs.
    document.addEventListener('click', (event) => {
        const tabButton = event.target.closest('.header-subtab-btn');
        if (!tabButton) return;
        const tabId = tabButton.getAttribute('data-tab') || tabButton.getAttribute('data-subtab');
        if (!tabId) return;
        const moduleName = sessionStorage.getItem('pawpal_admin_active_module');
        const config = MODULE_SUBTABS_MAP[moduleName];
        if (!config || !config.subtabs.some(tab => tab.id === tabId)) return;
        event.preventDefault();
        config.storageKey && sessionStorage.setItem(config.storageKey, tabId);
        document.querySelectorAll('.admin-preview-content .subtab-content').forEach(section => {
            section.classList.toggle('active', section.id === `subtab-${tabId}`);
        });
        document.querySelectorAll('.header-subtab-btn').forEach(button => {
            const bTabId = button.getAttribute('data-tab') || button.getAttribute('data-subtab');
            button.classList.toggle('active', bTabId === tabId);
        });
        if (window.location.hash !== `#${tabId}`) history.pushState(null, '', `#${tabId}`);

        window.dispatchEvent(new CustomEvent('admin:subtab-change', {
            detail: { module: moduleName, tabId }
        }));
    });

    const MODULE_SUBTABS_MAP = {
        'Dashboard': {
            title: 'Dashboard',
            subtabs: []
        },
        'Khách hàng': {
            title: '',
            defaultTab: 'tab-list',
            storageKey: 'pawpal_admin_customer_subtab',
            subtabs: [
                { id: 'tab-list', label: 'Khách hàng' },
                { id: 'tab-profile', label: 'Hồ sơ' },
                { id: 'tab-pawpoint', label: 'Pawpoint' }
            ]
        },
        'Thú cưng': {
            title: '',
            defaultTab: 'tab-pet-list',
            storageKey: 'pawpal_admin_pet_subtab',
            subtabs: [
                { id: 'tab-pet-list', label: 'Thú cưng' },
                { id: 'tab-pet-profile', label: 'Hồ sơ' },
                { id: 'tab-pet-carelog', label: 'Nhật ký' },
                { id: 'tab-pet-reminders', label: 'Nhắc lịch' }
            ]
        },
        'Dịch vụ': {
            title: '',
            defaultTab: 'tab-service-bookings',
            storageKey: 'pawpal_admin_services_active_subtab',
            subtabs: [
                { id: 'tab-service-bookings', label: 'Lịch hẹn' },
                { id: 'tab-service-detail', label: 'Hồ sơ' },
                { id: 'tab-service-catalog', label: 'Bảng giá' },
                { id: 'tab-service-reviews', label: 'Đánh giá' }
            ]
        },
        'Bán hàng': {
            title: '',
            defaultTab: 'tab-order-list',
            storageKey: 'pawpal_admin_order_subtab',
            subtabs: [
                { id: 'tab-order-list', label: 'Đơn hàng' },
                { id: 'tab-order-detail', label: 'Hồ sơ' },
                { id: 'tab-order-products', label: 'Sản phẩm và Kho' },
                { id: 'tab-order-promos', label: 'Khuyến mãi' }
            ]
        },
        'Nhân sự': {
            title: '',
            defaultTab: 'tab-staff-list',
            storageKey: 'pawpal_admin_staff_active_subtab',
            subtabs: [
                { id: 'tab-staff-list', label: 'Nhân sự' },
                { id: 'tab-staff-profile', label: 'Hồ sơ' },
                { id: 'tab-staff-schedule', label: 'Lịch làm việc' },
                { id: 'tab-staff-assessment', label: 'Đánh giá' }
            ]
        },
        'Khiếu nại': {
            title: '',
            defaultTab: 'tab-complaint-services',
            storageKey: 'pawpal_admin_complaint_active_subtab',
            subtabs: [
                { id: 'tab-complaint-services', label: 'Theo dịch vụ' },
                { id: 'tab-complaint-orders', label: 'Theo đơn hàng' },
                { id: 'tab-complaint-detail', label: 'Hồ sơ' }
            ]
        },
        'Chatbot': {
            title: '',
            defaultTab: 'tab-live-support',
            storageKey: 'pawpal_admin_chatbot_subtab',
            subtabs: [
                { id: 'tab-live-support', label: 'Trực chat' },
                { id: 'tab-ai-copilot', label: 'Trợ lý AI' },
                { id: 'tab-chatbot-rules', label: 'Quy định' }
            ]
        },
        'Cấu hình': {
            title: '',
            defaultTab: 'tab-banner-promos',
            storageKey: 'pawpal_admin_settings_subtab',
            subtabs: [
                { id: 'tab-banner-promos', label: 'Banner và Khuyến mãi' },
                { id: 'tab-content-management', label: 'Bài viết' },
                { id: 'tab-system-config', label: 'Cấu hình' },
                { id: 'tab-audit-logs', label: 'Nhật ký' }
            ]
        }
    };

    function renderHeaderSubtabsInstant(moduleName) {
        const config = MODULE_SUBTABS_MAP[moduleName];
        if (!config) return;

        if (config.title) {
            if (moduleTitleEl) {
                moduleTitleEl.textContent = config.title;
                moduleTitleEl.style.display = 'inline-block';
            }
            if (subtabsContainer) subtabsContainer.innerHTML = '';
            if (deepBreadcrumbEl) deepBreadcrumbEl.innerHTML = '';
            return;
        }

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        if (!subtabsContainer) return;

        // Xác định subtab active hiện tại từ URL hash hoặc storage
        const currentHash = (window.location.hash || '').replace('#', '');
        const savedTab = config.storageKey ? sessionStorage.getItem(config.storageKey) : null;
        let activeTabId = config.defaultTab;

        if (currentHash && config.subtabs.some(s => s.id === currentHash)) {
            activeTabId = currentHash;
        } else if (savedTab && config.subtabs.some(s => s.id === savedTab)) {
            activeTabId = savedTab;
        }

        subtabsContainer.innerHTML = config.subtabs.map((s, idx) => {
            const isActive = s.id === activeTabId;
            const divider = idx < config.subtabs.length - 1 ? '<span class="subtab-divider">|</span>' : '';
            return `<button type="button" class="header-subtab-btn ${isActive ? 'active' : ''}" data-subtab="${s.id}" data-tab="${s.id}">${s.label}</button>${divider}`;
        }).join('');

        if (deepBreadcrumbEl && (!activeTabId.includes('profile') && !activeTabId.includes('detail'))) {
            deepBreadcrumbEl.innerHTML = '';
        }
    }

    function syncActiveSubtabPane(contentArea, moduleName) {
        if (!contentArea) return;
        const config = MODULE_SUBTABS_MAP[moduleName];
        if (!config || !config.subtabs || config.subtabs.length === 0) return;

        const currentHash = (window.location.hash || '').replace('#', '');
        const savedTab = config.storageKey ? sessionStorage.getItem(config.storageKey) : null;
        let targetTabId = config.defaultTab;

        if (currentHash && config.subtabs.some(s => s.id === currentHash)) {
            targetTabId = currentHash;
        } else if (savedTab && config.subtabs.some(s => s.id === savedTab)) {
            targetTabId = savedTab;
        }

        const sections = contentArea.querySelectorAll('.subtab-content');
        if (sections && sections.length > 0) {
            sections.forEach(sec => sec.classList.remove('active'));
            const targetSec = contentArea.querySelector(`#subtab-${targetTabId}`);
            if (targetSec) {
                targetSec.classList.add('active');
            } else if (sections[0]) {
                sections[0].classList.add('active');
                targetTabId = config.defaultTab || sections[0].id.replace('subtab-', '');
            }
        }

        if (targetTabId && window.location.hash !== '#' + targetTabId) {
            try {
                history.replaceState(null, '', '#' + targetTabId);
            } catch (e) {}
        }
    }

    // Version tĩnh cho cache-busting — cập nhật sau mỗi đợt deploy
    const MODULE_SCRIPT_VERSION = '20261017_r08';

    function resolveModulePath(path) {
        if (!path) return path;
        if (path.startsWith('/') || path.startsWith('http')) return path;
        return '/pages/admin/' + path;
    }

    async function loadModuleScripts(scriptPaths) {
        // Chỉ load script chưa từng được load — KHÔNG xóa/tạo lại script đã có
        const missing = scriptPaths.filter(src => !_moduleScriptsLoaded.has(src));
        if (!missing.length) return;

        // Các module dùng chung namespace nên phải nạp đúng thứ tự khai báo.
        // Promise.all đã khiến các script động khởi tạo song song và có thể
        // khiến cả phân hệ dừng tại skeleton sau một lần tải lại.
        for (const src of missing) {
            await new Promise((resolve) => {
            const script = document.createElement('script');
            script.className = 'dynamic-module-script';
            script.async = false; // Bắt buộc thực thi tuần tự theo đúng thứ tự khai báo trong mảng
            const fullSrc = resolveModulePath(src);
            script.src = fullSrc + (fullSrc.includes('?') ? '&' : '?') + 'v=' + MODULE_SCRIPT_VERSION;
            script.onload = () => {
                _moduleScriptsLoaded.add(src);
                resolve();
            };
            script.onerror = () => {
                console.error('Lỗi nạp script:', fullSrc);
                resolve();
            };
            document.body.appendChild(script);
            });
        }
    }

    // Prefetch HTML + Script của một module vào cache trong nền (không render, không chạy init)
    async function prefetchModule(moduleName) {
        const modCfg = MODULE_CONFIG[moduleName];
        if (!modCfg) return;
        // Prefetch HTML vào in-memory cache
        fetchModuleHtml(modCfg.html).catch(() => {});
        // Prefetch scripts vào HTTP cache của trình duyệt (0ms khi click thật)
        modCfg.scripts.filter(s => !_moduleScriptsLoaded.has(s)).forEach(src => {
            const fullSrc = resolveModulePath(src);
            fetch(fullSrc + (fullSrc.includes('?') ? '&' : '?') + 'v=' + MODULE_SCRIPT_VERSION, { priority: 'low' }).catch(() => {});
        });
    }

    // Fetch HTML module với in-memory cache — không gọi lại server khi quay về
    async function fetchModuleHtml(url) {
        const fullUrl = resolveModulePath(url);
        if (_moduleHtmlCache.has(fullUrl)) {
            return _moduleHtmlCache.get(fullUrl);
        }
        const res = await fetch(fullUrl + (fullUrl.includes('?') ? '&' : '?') + 'v=' + MODULE_SCRIPT_VERSION);
        if (!res.ok) return null;
        const html = await res.text();
        _moduleHtmlCache.set(fullUrl, html);
        return html;
    }

    // Bảng cấu hình tất cả modules — dùng chung cho loadModule & prefetchModule
    const MODULE_CONFIG = {
        'Dashboard':  {
            html: 'modules/dashboard/dashboard.html',
            scripts: ['modules/dashboard/dashboard.js'],
            postLoad: async () => { if (window.PawpalDashboard?.init) await window.PawpalDashboard.init(); }
        },
        'Khách hàng': {
            html: 'modules/customers/customers.html',
            scripts: ['modules/customers/customers.js', 'modules/customers/subtabs/tab-customer-list.js', 'modules/customers/subtabs/tab-customer-profile.js', 'modules/customers/subtabs/tab-customer-pawpoint.js'],
            postLoad: async () => {
                if (window.PawpalCustomers?.loadCustomersModuleData) {
                    const hasData = Object.keys(window.PawpalCustomers.state?.customerDatabase || {}).length > 0;
                    await window.PawpalCustomers.loadCustomersModuleData({ force: !hasData });
                }
                const customers = window.PawpalCustomers;
                customers?.subtabs?.pawpoint?.renderPawpointHistory?.();
                const profileId = sessionStorage.getItem('pawpal_admin_customer_id') || Object.keys(customers?.state?.customerDatabase || {})[0];
                customers?.subtabs?.profile?.renderDrawerCustomerProfile?.(profileId);
                if (window.PawpalCustomers?.subtabs?.list?.renderCustomersTable) {
                    window.PawpalCustomers.subtabs.list.renderCustomersTable();
                    window.PawpalCustomers.subtabs.list.updateCustomerKPIs();
                    if (window.PawpalCustomers.subtabs.list.renderComplaintBar) {
                        window.PawpalCustomers.subtabs.list.renderComplaintBar();
                    }
                }
            }
        },
        'Thú cưng':   {
            html: 'modules/pets/pets.html',
            scripts: ['modules/pets/pets.js', 'modules/pets/subtabs/tab-pet-list.js', 'modules/pets/subtabs/tab-pet-profile.js', 'modules/pets/subtabs/tab-pet-carelog.js', 'modules/pets/subtabs/tab-pet-reminders.js'],
            postLoad: async () => {
                if (window.PawpalPets?.init) await window.PawpalPets.init();
                if (window.PawpalPets?.subtabs?.list?.renderPetsTable) {
                    window.PawpalPets.subtabs.list.renderPetsTable();
                    window.PawpalPets.subtabs.list.updatePetKPIs();
                }
            }
        },
        'Dịch vụ':    {
            html: 'modules/services/services.html',
            scripts: ['modules/services/services.js', 'modules/services/subtabs/tab-service-bookings.js', 'modules/services/subtabs/tab-service-detail.js', 'modules/services/subtabs/tab-service-catalog.js', 'modules/services/subtabs/tab-service-reviews.js'],
            postLoad: async () => {
                if (sessionStorage.getItem('pawpal_admin_services_open_booking_modal') === 'true') {
                    await window.PawpalServices?.init?.();
                }
                if (window.PawpalServices?.subtabs?.bookings?.renderBookingsTable) {
                    window.PawpalServices.subtabs.bookings.renderBookingsTable();
                    window.PawpalServices.subtabs.bookings.updateKPIs();
                }
            }
        },
        'Bán hàng':   {
            html: 'modules/orders/orders.html',
            scripts: ['modules/orders/orders.js', 'modules/orders/subtabs/tab-order-list.js', 'modules/orders/subtabs/tab-order-detail.js', 'modules/orders/subtabs/tab-order-products.js', 'modules/orders/subtabs/tab-order-promos.js'],
            postLoad: async () => {
                if (window.PawpalOrders?.renderOrdersTable) window.PawpalOrders.renderOrdersTable();
            }
        },
        'Nhân sự':    {
            html: 'modules/staff/staff.html',
            scripts: ['modules/staff/staff.js', 'modules/staff/subtabs/tab-staff-list.js', 'modules/staff/subtabs/tab-staff-profile.js', 'modules/staff/subtabs/tab-staff-schedule.js', 'modules/staff/subtabs/tab-staff-assessment.js'],
            postLoad: async () => { if (window.PawpalStaff?.init) await window.PawpalStaff.init(); }
        },
        'Khiếu nại':  {
            html: 'modules/complaints/complaints.html',
            scripts: ['modules/complaints/complaints.js', 'modules/complaints/subtabs/tab-complaint-services.js', 'modules/complaints/subtabs/tab-complaint-orders.js', 'modules/complaints/subtabs/tab-complaint-detail.js'],
            postLoad: async () => {
                if (window.PawpalComplaints?.init) {
                    await window.PawpalComplaints.init();
                } else if (window.PawpalComplaints?.loadComplaintsModuleData) {
                    await window.PawpalComplaints.loadComplaintsModuleData();
                }
                window.PawpalComplaints?.subtabs?.services?.renderServiceComplaintsTable?.();
                window.PawpalComplaints?.subtabs?.orders?.renderOrderComplaintsTable?.();
                const selId = sessionStorage.getItem('pawpal_admin_complaint_selected_id');
                if (selId) {
                    window.PawpalComplaints?.subtabs?.detail?.renderTicketDetail?.(selId);
                }
            }
        },
        'Chatbot':    {
            html: 'modules/chatbot/chatbot.html',
            scripts: ['modules/chatbot/chatbot.js', 'modules/chatbot/subtabs/tab-chatbot-live.js', 'modules/chatbot/subtabs/tab-chatbot-copilot.js', 'modules/chatbot/subtabs/tab-chatbot-rules.js'],
            postLoad: async () => { if (window.PawpalChatbot?.init) await window.PawpalChatbot.init(); }
        },
        'Cấu hình':   {
            html: 'modules/settings/settings.html',
            scripts: ['modules/settings/settings.js', 'modules/settings/subtabs/tab-settings-banners.js', 'modules/settings/subtabs/tab-settings-content.js', 'modules/settings/subtabs/tab-settings-system.js', 'modules/settings/subtabs/tab-settings-audit.js'],
            postLoad: async () => {
                if (window.PawpalSettings?.init) {
                    await window.PawpalSettings.init();
                } else if (window.PawpalSettings?.loadSettingsModuleData) {
                    await window.PawpalSettings.loadSettingsModuleData();
                }
            }
        },
    };

    let _activeModuleLoadId = 0;

    // Nạp module tương ứng — dùng DOM cache để chuyển tab tức thì 0ms (Zero-Wait)
    let moduleLoadRevision = 0;
    async function loadModule(moduleName) {
        const loadRevision = ++moduleLoadRevision;
        if (!contentArea) return;
        const thisLoadId = ++_activeModuleLoadId;

        // Cập nhật module active
        sessionStorage.setItem('pawpal_admin_active_module', moduleName);
        sidebarBtns.forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-title') === moduleName);
        });

        // Render tức thì Header Bar để triệt tiêu 100% hiện tượng chớp/load header
        renderHeaderSubtabsInstant(moduleName);
        window.scrollTo(0, 0);
        if (contentArea) contentArea.scrollTop = 0;

        // Xóa sạch deep breadcrumb cũ để tránh rác từ các phân hệ khác (ví dụ: Khách #0254d từ Chatbot)
        if (deepBreadcrumbEl) deepBreadcrumbEl.innerHTML = '';

        // Nếu module hiện tại đã gắn đúng vào contentArea thì chỉ cần đồng bộ subtab
        if (_currentModule === moduleName && _moduleDomCache.has(moduleName)) {
            const activeEl = _moduleDomCache.get(moduleName);
            if (activeEl && activeEl.parentNode === contentArea) {
                if (moduleName !== 'Dashboard') syncActiveSubtabPane(activeEl, moduleName);
                return;
            }
        }

        // ── 1. Tháo (detach) module hiện tại khỏi contentArea (giữ nguyên DOM và state trong cache) ──
        if (_currentModule && _currentModule !== moduleName && _moduleDomCache.has(_currentModule)) {
            const currentEl = _moduleDomCache.get(_currentModule);
            if (currentEl && currentEl.parentNode === contentArea) {
                contentArea.removeChild(currentEl);
            }
        }

        // ── 2. Nếu module đã có DOM cache → gắn lại vào contentArea ngay lập tức (0ms) ───────────
        if (_moduleDomCache.has(moduleName)) {
            const cachedEl = _moduleDomCache.get(moduleName);
            if (cachedEl.parentNode !== contentArea) {
                contentArea.innerHTML = '';
                cachedEl.style.display = '';
                contentArea.appendChild(cachedEl);
            }
            _currentModule = moduleName;
            
            // Đồng bộ subtab active theo hash ngay lập tức
            if (moduleName !== 'Dashboard') syncActiveSubtabPane(cachedEl, moduleName);
            if (window.lucide) lucide.createIcons();
            
            if (moduleName === 'Cấu hình' && !window.PawpalSettings) {
                const articleBody = cachedEl.querySelector('#articlesTableBody');
                if (articleBody && articleBody.querySelector('.skeleton-text')) {
                    articleBody.removeAttribute('data-loading-skeleton');
                    articleBody.innerHTML = '<tr><td colspan="8" style="padding:28px;text-align:center;color:var(--text-muted);">Không thể khởi tạo cấu hình. Vui lòng tải lại trang.</td></tr>';
                }
            }

            // Dispatch event để module JS biết tab đã active trở lại ngay lập tức
            window.dispatchEvent(new CustomEvent('admin:module-show', { detail: { module: moduleName } }));

            // Tối ưu Giai đoạn 1 (PERF-01): Chạy postLoad trong nền (non-blocking) - KHÔNG AWAIT để chuyển tab tức thì 0ms!
            const modCfg = MODULE_CONFIG[moduleName];
            if (modCfg && modCfg.postLoad) {
                Promise.resolve().then(async () => {
                    if (thisLoadId !== _activeModuleLoadId) return;
                    try {
                        await modCfg.postLoad();
                        if (thisLoadId === _activeModuleLoadId && moduleName !== 'Dashboard') {
                            syncActiveSubtabPane(cachedEl, moduleName);
                        }
                    } catch (e) {
                        console.warn(`[Admin] postLoad nền ${moduleName}:`, e);
                    }
                });
            }

            return;
        }

        // ── 3. Lần đầu load: Hiện khung Skeleton Shell cấu trúc hoàn chỉnh thay cho spinner chữ thô ──
        contentArea.innerHTML = '';
        const moduleWrapper = document.createElement('div');
        moduleWrapper.className = 'admin-module-wrapper';
        moduleWrapper.style.width = '100%';
        moduleWrapper.style.height = '100%';
        moduleWrapper.innerHTML = `
            <div class="admin-module-skeleton-shell" aria-busy="true" aria-label="Đang nạp dữ liệu">
                <div class="shell-kpi-grid">
                    <div class="shell-kpi-card"><span class="skeleton-text" style="width: 90px; height: 12px;"></span><span class="skeleton-kpi"></span></div>
                    <div class="shell-kpi-card"><span class="skeleton-text" style="width: 100px; height: 12px;"></span><span class="skeleton-kpi"></span></div>
                    <div class="shell-kpi-card"><span class="skeleton-text" style="width: 85px; height: 12px;"></span><span class="skeleton-kpi"></span></div>
                    <div class="shell-kpi-card"><span class="skeleton-text" style="width: 110px; height: 12px;"></span><span class="skeleton-kpi"></span></div>
                    <div class="shell-kpi-card"><span class="skeleton-text" style="width: 95px; height: 12px;"></span><span class="skeleton-kpi"></span></div>
                </div>
                <div class="shell-master-card">
                    <div class="shell-toolbar">
                        <span class="skeleton-text" style="width: 280px; height: 36px; border-radius: var(--admin-radius);"></span>
                        <div style="display: flex; gap: 8px;">
                            <span class="skeleton-pill"></span>
                            <span class="skeleton-pill"></span>
                        </div>
                    </div>
                    <table class="admin-table" style="width: 100%;">
                        <tbody>
                            <tr class="skeleton-row"><td><span class="skeleton-text" style="width: 70px;"></span></td><td><span class="skeleton-text" style="width: 130px;"></span></td><td><span class="skeleton-text" style="width: 90px;"></span></td><td><span class="skeleton-badge"></span></td></tr>
                            <tr class="skeleton-row"><td><span class="skeleton-text" style="width: 80px;"></span></td><td><span class="skeleton-text" style="width: 150px;"></span></td><td><span class="skeleton-text" style="width: 100px;"></span></td><td><span class="skeleton-badge"></span></td></tr>
                            <tr class="skeleton-row"><td><span class="skeleton-text" style="width: 65px;"></span></td><td><span class="skeleton-text" style="width: 120px;"></span></td><td><span class="skeleton-text" style="width: 85px;"></span></td><td><span class="skeleton-badge"></span></td></tr>
                            <tr class="skeleton-row"><td><span class="skeleton-text" style="width: 90px;"></span></td><td><span class="skeleton-text" style="width: 140px;"></span></td><td><span class="skeleton-text" style="width: 110px;"></span></td><td><span class="skeleton-badge"></span></td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        contentArea.appendChild(moduleWrapper);

        const modCfg = MODULE_CONFIG[moduleName];
        if (modCfg) {
            try {
                const html = await fetchModuleHtml(modCfg.html);
                if (loadRevision !== moduleLoadRevision) return;
                if (thisLoadId !== _activeModuleLoadId) return; // Bị hủy bởi thao tác chuyển phân hệ mới hơn
                if (html) {
                    moduleWrapper.innerHTML = html;
                    if (moduleName !== 'Dashboard') syncActiveSubtabPane(moduleWrapper, moduleName);
                    if (window.lucide) lucide.createIcons();
                    // Lưu DOM module này vào cache ngay lập tức để chuyển tab tức thì 0ms
                    _moduleDomCache.set(moduleName, moduleWrapper);
                    _currentModule = moduleName;
                    await loadModuleScripts(modCfg.scripts);
                    // Một script có thể đã được đánh dấu loaded dù gặp lỗi runtime trước khi
                    // đăng ký namespace. Với Cấu hình, thử nạp lại core một lần để tránh
                    // giữ bảng ở skeleton vô hạn khi chuyển tab bằng hash.
                    if (moduleName === 'Cấu hình' && !window.PawpalSettings) {
                        const settingsCore = 'modules/settings/settings.js';
                        _moduleScriptsLoaded.delete(settingsCore);
                        document.querySelectorAll('script.dynamic-module-script').forEach(script => {
                            if (script.src.includes('/modules/settings/settings.js')) script.remove();
                        });
                        await loadModuleScripts([settingsCore]);
                        if (!window.PawpalSettings) {
                            const articleBody = moduleWrapper.querySelector('#articlesTableBody');
                            if (articleBody) {
                                articleBody.removeAttribute('data-loading-skeleton');
                                articleBody.innerHTML = '<tr><td colspan="8" style="padding:28px;text-align:center;color:var(--text-muted);">Không thể khởi tạo cấu hình. Vui lòng tải lại trang.</td></tr>';
                            }
                        }
                    }
                    if (loadRevision !== moduleLoadRevision) return;
                    if (thisLoadId !== _activeModuleLoadId) return;
                    if (modCfg.postLoad) {
                        try { await modCfg.postLoad(); } catch (err) { console.warn(`[Admin] postLoad ${moduleName}:`, err); }
                    }
                    if (loadRevision !== moduleLoadRevision) return;
                    if (moduleName !== 'Dashboard') syncActiveSubtabPane(moduleWrapper, moduleName);
                    window.dispatchEvent(new CustomEvent('admin:module-show', { detail: { module: moduleName } }));
                    return;
                }
            } catch (err) {
                console.error(`Không thể load module ${moduleName}:`, err);
            }
        }
        if (moduleTitleEl) {
            moduleTitleEl.textContent = moduleName;
            moduleTitleEl.style.display = 'inline-block';
        }
        if (subtabsContainer) subtabsContainer.innerHTML = '';
        if (deepBreadcrumbEl) deepBreadcrumbEl.innerHTML = '';
        moduleWrapper.innerHTML = `
            <div class="admin-card" style="padding: 32px; text-align: center; color: var(--text-muted);">
                <div style="font-size: 16px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Phân hệ ${moduleName}</div>
                <div>Đang sẵn sàng triển khai theo thứ tự duyệt của bạn.</div>
            </div>
        `;
        _moduleDomCache.set(moduleName, moduleWrapper);
        _currentModule = moduleName;
        if (window.lucide) lucide.createIcons();
    }

    function normalizeSubtabId(rawTabId) {
        if (!rawTabId) return rawTabId;
        const clean = String(rawTabId).split('?')[0].replace('#', '');
        const aliases = {
            'tab-customer-profile': 'tab-profile',
            'tab-customer': 'tab-list',
            'tab-customers': 'tab-list',
            'tab-complaints': 'tab-complaint-services',
            'tab-calendar': 'tab-service-bookings',
            'tab-inventory': 'tab-order-products',
            'tab-orders': 'tab-order-list',
            'tab-pets': 'tab-pet-list',
            'tab-services': 'tab-service-bookings'
        };
        return aliases[clean] || clean;
    }

    function resolveModuleFromHash(hash) {
        if (!hash) return null;
        const base = String(hash).split('?')[0];
        if (base.startsWith('#tab-service') || base.startsWith('#tab-booking') || base.startsWith('#tab-calendar') || base === '#services') return 'Dịch vụ';
        if (base.startsWith('#tab-order') || base.startsWith('#tab-inventory')) return 'Bán hàng';
        if (base.startsWith('#tab-staff')) return 'Nhân sự';
        if (base.startsWith('#tab-complaint')) return 'Khiếu nại';
        if (base.startsWith('#tab-chatbot') || base.startsWith('#tab-ai-') || base.startsWith('#tab-live-support')) return 'Chatbot';
        if (base.startsWith('#tab-setting') || base.startsWith('#tab-banner') || base.startsWith('#tab-blog') || base.startsWith('#tab-system') || base.startsWith('#tab-content') || base.startsWith('#tab-audit') || base === '#settings') return 'Cấu hình';
        if (base.startsWith('#tab-pet')) return 'Thú cưng';
        if (base.startsWith('#tab-list') || base.startsWith('#tab-profile') || base.startsWith('#tab-pawpoint') || base.startsWith('#tab-customer')) return 'Khách hàng';
        if (base.startsWith('#tab-dashboard')) return 'Dashboard';
        return null;
    }

    function handleEntityDeepLink(targetMod, cleanHash, params) {
        if (!targetMod || !params) return;
        try {
            if (targetMod === 'Khách hàng' && cleanHash === 'tab-profile') {
                const custId = params.get('id') || params.get('customerId') || params.get('customer_id');
                const custName = params.get('name') || params.get('customerName') || params.get('customer_name');
                if (custId) sessionStorage.setItem('pawpal_admin_customer_id', custId);
                if (custName) sessionStorage.setItem('pawpal_admin_customer_name', custName);
                if (window.PawpalCustomers) {
                    const resolvedCust = (custId || custName) && window.PawpalCustomers.getCustomer 
                        ? window.PawpalCustomers.getCustomer(custId || custName) 
                        : null;
                    const finalId = resolvedCust ? resolvedCust.id : (custId || custName);
                    if (finalId && window.PawpalCustomers.subtabs?.profile?.renderDrawerCustomerProfile) {
                        window.PawpalCustomers.subtabs.profile.renderDrawerCustomerProfile(finalId);
                    }
                    if (window.PawpalCustomers.switchSubtab) {
                        window.PawpalCustomers.switchSubtab('tab-profile');
                    }
                }
            } else if (targetMod === 'Khiếu nại' && cleanHash === 'tab-complaint-detail') {
                const ticketId = params.get('id') || params.get('ticketId') || params.get('ticket_id');
                if (ticketId) {
                    sessionStorage.setItem('pawpal_admin_complaint_selected_id', ticketId);
                    if (window.PawpalComplaints?.openTicketDetail) {
                        window.PawpalComplaints.openTicketDetail(ticketId);
                    }
                    if (window.PawpalComplaints?.switchSubtab) {
                        window.PawpalComplaints.switchSubtab('tab-complaint-detail');
                    }
                }
            } else if (targetMod === 'Bán hàng' && cleanHash === 'tab-order-detail') {
                const orderId = params.get('id') || params.get('orderId') || params.get('order_id') || params.get('code');
                if (orderId) {
                    sessionStorage.setItem('pawpal_admin_order_selected_id', orderId);
                    sessionStorage.setItem('pawpal_admin_order_id', orderId);
                    if (window.PawpalOrders?.switchSubtab) {
                        window.PawpalOrders.switchSubtab('tab-order-detail');
                    }
                }
            } else if (targetMod === 'Thú cưng' && cleanHash === 'tab-pet-profile') {
                const petId = params.get('id') || params.get('petId') || params.get('pet_id');
                if (petId) {
                    sessionStorage.setItem('pawpal_admin_pet_id', petId);
                    if (window.openPetProfile) {
                        window.openPetProfile(petId);
                    }
                    if (window.PawpalPets?.switchSubtab) {
                        window.PawpalPets.switchSubtab('tab-pet-profile');
                    }
                }
            } else if (targetMod === 'Dịch vụ' && cleanHash === 'tab-service-detail') {
                const bookingId = params.get('id') || params.get('bookingId') || params.get('booking_id');
                if (bookingId) {
                    sessionStorage.setItem('pawpal_admin_service_selected_id', bookingId);
                    if (window.PawpalServices?.switchSubtab) {
                        window.PawpalServices.switchSubtab('tab-service-detail');
                    }
                }
            }
        } catch (e) {
            console.warn('[Admin DeepLink] Lỗi xử lý tham số điều hướng:', e);
        }
    }

    function getTargetHashForModule(moduleName) {
        if (moduleName === 'Dashboard') return '#tab-dashboard';
        if (moduleName === 'Khách hàng') {
            const saved = sessionStorage.getItem('pawpal_admin_customer_subtab');
            return saved ? '#' + saved : '#tab-list';
        }
        if (moduleName === 'Thú cưng') {
            const saved = sessionStorage.getItem('pawpal_admin_pet_subtab');
            return saved ? '#' + saved : '#tab-pet-list';
        }
        if (moduleName === 'Dịch vụ') {
            const saved = sessionStorage.getItem('pawpal_admin_services_active_subtab');
            return saved ? '#' + saved : '#tab-service-bookings';
        }
        if (moduleName === 'Bán hàng') {
            const saved = sessionStorage.getItem('pawpal_admin_order_subtab');
            return saved ? '#' + saved : '#tab-order-list';
        }
        if (moduleName === 'Nhân sự') {
            const saved = sessionStorage.getItem('pawpal_admin_staff_active_subtab');
            return saved ? '#' + saved : '#tab-staff-list';
        }
        if (moduleName === 'Khiếu nại') {
            const saved = sessionStorage.getItem('pawpal_admin_complaint_active_subtab');
            return saved ? '#' + saved : '#tab-complaint-services';
        }
        if (moduleName === 'Chatbot') {
            const saved = sessionStorage.getItem('pawpal_admin_chatbot_subtab');
            return saved ? '#' + saved : '#tab-live-support';
        }
        if (moduleName === 'Cấu hình') {
            const saved = sessionStorage.getItem('pawpal_admin_settings_subtab');
            return saved ? '#' + saved : '#tab-banner-promos';
        }
        return '';
    }

    // Gắn sự kiện click và hover prefetch sidebar
    sidebarBtns.forEach(btn => {
        // Hover → prefetch ngay (tải trước HTML + script trong nền, không render)
        btn.addEventListener('mouseenter', () => {
            const title = btn.getAttribute('data-title');
            if (title && title !== _currentModule) {
                prefetchModule(title);
            }
        }, { passive: true });

        btn.addEventListener('click', () => {
            const title = btn.getAttribute('data-title');
            const currentMod = sessionStorage.getItem('pawpal_admin_active_module');
            
            // Tự động đóng drawer sidebar trên mobile khi chọn mục
            if (adminLayout) {
                adminLayout.classList.remove('mobile-sidebar-open');
            }

            if (currentMod === title) return;

            sidebarBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sessionStorage.setItem('pawpal_admin_active_module', title);

            // Đồng bộ hash URL ngay lập tức khi bấm đổi phân hệ
            const targetHash = getTargetHashForModule(title);
            if (targetHash && window.location.hash !== targetHash) {
                try {
                    history.pushState(null, '', targetHash);
                } catch (e) {
                    window.location.hash = targetHash;
                }
            }

            loadModule(title);
        });
    });

    // Xác định module cần nạp ban đầu theo URL Hash, nút active hoặc sessionStorage
    const currentHash = window.location.hash || '';
    let initialModule = resolveModuleFromHash(currentHash);

    if (!initialModule) {
        const activeBtn = document.querySelector('.sidebar-menu-btn.active');
        if (activeBtn) initialModule = activeBtn.getAttribute('data-title');
    }

    if (!initialModule) {
        initialModule = sessionStorage.getItem('pawpal_admin_active_module') || 'Bán hàng';
    }

    sidebarBtns.forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-title') === initialModule);
    });

    sessionStorage.setItem('pawpal_admin_active_module', initialModule);

    // Nếu URL có hash hợp lệ cho initialModule, lưu ngay vào storage của module đó
    const [initialHashBase, initialQueryString] = currentHash.split('?');
    const initialConfig = MODULE_SUBTABS_MAP[initialModule];
    const cleanInitialHash = normalizeSubtabId(initialHashBase.replace('#', ''));
    if (initialConfig && initialConfig.subtabs.some(s => s.id === cleanInitialHash)) {
        if (initialConfig.storageKey) sessionStorage.setItem(initialConfig.storageKey, cleanInitialHash);
    } else if (!window.location.hash) {
        const defaultHash = getTargetHashForModule(initialModule);
        if (defaultHash) {
            try {
                history.replaceState(null, '', defaultHash);
            } catch (e) {}
        }
    }

    if (initialQueryString) {
        handleEntityDeepLink(initialModule, cleanInitialHash, new URLSearchParams(initialQueryString));
    }

    loadModule(initialModule).then(() => {
        if (initialQueryString) {
            setTimeout(() => handleEntityDeepLink(initialModule, cleanInitialHash, new URLSearchParams(initialQueryString)), 200);
        }
    });
    
    // Tải trước toàn bộ 9 template HTML và scripts của các phân hệ quan trọng trong nền
    // Giúp khi bấm sang phân hệ mới, HTML & scripts đã có sẵn trong memory/disk cache (0ms network)
    setTimeout(() => {
        Object.values(MODULE_CONFIG).forEach(cfg => {
            if (cfg && cfg.html) fetchModuleHtml(cfg.html).catch(() => {});
        });
        prefetchModule('Dashboard');
        prefetchModule('Thú cưng');
        prefetchModule('Dịch vụ');
        prefetchModule('Bán hàng');
        prefetchModule('Khách hàng');
    }, 1200);

    // Lắng nghe thay đổi URL Hash liên phân hệ để chuyển module mượt mà
    window.addEventListener('hashchange', () => {
        const fullHash = window.location.hash || '';
        const [hashBase, queryString] = fullHash.split('?');
        const targetMod = resolveModuleFromHash(hashBase);
        const currentMod = sessionStorage.getItem('pawpal_admin_active_module');
        const rawCleanHash = (hashBase || '').replace('#', '');
        const cleanHash = normalizeSubtabId(rawCleanHash);
        const searchParams = new URLSearchParams(queryString || '');

        if (queryString) {
            handleEntityDeepLink(targetMod, cleanHash, searchParams);
        }

        if (targetMod && targetMod !== currentMod) {
            sidebarBtns.forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-title') === targetMod);
            });
            sessionStorage.setItem('pawpal_admin_active_module', targetMod);
            const cfg = MODULE_SUBTABS_MAP[targetMod];
            if (cfg && cfg.subtabs.some(s => s.id === cleanHash)) {
                if (cfg.storageKey) sessionStorage.setItem(cfg.storageKey, cleanHash);
            }
            loadModule(targetMod).then(() => {
                if (queryString) {
                    setTimeout(() => handleEntityDeepLink(targetMod, cleanHash, searchParams), 150);
                }
            });
        } else if (targetMod) {
            const cfg = MODULE_SUBTABS_MAP[targetMod];
            if (cfg && cfg.subtabs.some(s => s.id === cleanHash)) {
                if (cfg.storageKey) sessionStorage.setItem(cfg.storageKey, cleanHash);
            }
            renderHeaderSubtabsInstant(targetMod);
            // Dùng moduleWrapper từ DOM cache nếu có, không thì fallback contentArea
            const modEl = _moduleDomCache.get(targetMod) || contentArea;
            syncActiveSubtabPane(modEl, targetMod);
            window.dispatchEvent(new CustomEvent('admin:subtab-change', {
                detail: { module: targetMod, tabId: cleanHash }
            }));
            if (queryString) {
                setTimeout(() => handleEntityDeepLink(targetMod, cleanHash, searchParams), 50);
            }
        }
    });

    // Thu gọn / Mở rộng Sidebar & Lưu trạng thái vào localStorage
    const adminLayout = document.querySelector('.admin-layout');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');
    const btnMobileMenuToggle = document.getElementById('btnMobileMenuToggle');
    const adminSidebarOverlay = document.getElementById('adminSidebarOverlay');

    // Nút mở Menu trên Mobile
    if (btnMobileMenuToggle && adminLayout) {
        btnMobileMenuToggle.addEventListener('click', () => {
            adminLayout.classList.toggle('mobile-sidebar-open');
        });
    }

    // Nhấp vào màn mờ backdrop để đóng Sidebar trên Mobile
    if (adminSidebarOverlay && adminLayout) {
        adminSidebarOverlay.addEventListener('click', () => {
            adminLayout.classList.remove('mobile-sidebar-open');
        });
    }

    // Đóng drawer khi nhấp vào nút chân sidebar
    document.querySelectorAll('.admin-sidebar-footer a, .admin-sidebar-footer button').forEach(el => {
        el.addEventListener('click', () => {
            if (adminLayout) adminLayout.classList.remove('mobile-sidebar-open');
        });
    });

    // Nút Đăng xuất ở chân Sidebar
    const btnSidebarLogout = document.getElementById('btnSidebarLogout');
    if (btnSidebarLogout) {
        btnSidebarLogout.addEventListener('click', async () => {
            try {
                sessionStorage.removeItem('pawpal_admin_active_module');
                sessionStorage.removeItem('pawpal_admin_user');
                sessionStorage.removeItem('pawpal_current_user');
                sessionStorage.removeItem('pawpal_user_role');
                localStorage.removeItem('pawpal_admin_user');
                localStorage.removeItem('pawpal_current_user');
                if (window.PawpalStorage && typeof window.PawpalStorage.remove === 'function') {
                    window.PawpalStorage.remove('pawpal_admin_user');
                    window.PawpalStorage.remove('pawpal_current_user');
                }
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (client && client.auth && typeof client.auth.signOut === 'function') {
                    await client.auth.signOut();
                }
            } catch (e) {}
            window.location.replace('/admin/login');
        });
    }

    // Khôi phục trạng thái sidebar đã lưu (chỉ trên màn hình desktop > 768px)
    const isSidebarCollapsed = localStorage.getItem('pawpal_admin_sidebar_collapsed') === 'true';
    if (isSidebarCollapsed && adminLayout && window.innerWidth > 768) {
        adminLayout.classList.add('sidebar-collapsed');
    }

    if (btnToggleSidebar && adminLayout) {
        btnToggleSidebar.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                adminLayout.classList.remove('mobile-sidebar-open');
                return;
            }
            adminLayout.classList.toggle('sidebar-collapsed');
            const collapsed = adminLayout.classList.contains('sidebar-collapsed');
            localStorage.setItem('pawpal_admin_sidebar_collapsed', collapsed ? 'true' : 'false');
            if (window.lucide) {
                lucide.createIcons();
            }
        });
    }

    // ====================================================================
    // CƠ CHẾ TỰ ĐỘNG GẮN VÀ ĐIỀU KHIỂN NÚT X XÓA TÌM KIẾM TOÀN HỆ THỐNG
    // Tự động kích hoạt trên mọi ô tìm kiếm (.search-box-wrapper)
    // ====================================================================
    document.addEventListener('input', (e) => {
        const input = e.target;
        if (!input || !input.matches('.search-box-wrapper input')) return;
        const wrapper = input.closest('.search-box-wrapper');
        if (!wrapper) return;
        
        let btn = wrapper.querySelector('.btn-clear-search, .btn-search-clear-x');
        if (!btn) {
            btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn-clear-search';
            btn.title = 'Xóa nội dung tìm kiếm';
            btn.setAttribute('aria-label', 'Xóa tìm kiếm');
            btn.textContent = '✕';
            wrapper.appendChild(btn);
        }
        btn.style.display = input.value.trim().length > 0 ? 'inline-flex' : 'none';
    });

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-clear-search, .btn-search-clear-x');
        if (!btn) return;
        const wrapper = btn.closest('.search-box-wrapper');
        if (!wrapper) return;
        const input = wrapper.querySelector('input');
        if (!input) return;
        
        e.preventDefault();
        input.value = '';
        btn.style.display = 'none';
        input.focus();
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Chuẩn hóa Empty state cho mọi phân hệ có tìm kiếm/bộ lọc.
    const ensureEmptyStateReset = (root = document) => {
        root.querySelectorAll('td, .empty-state, [class*="empty-state"]').forEach(node => {
            if (node.querySelector('button, a, .global-reset-filters')) return;
            const text = (node.textContent || '').toLowerCase();
            if (text.includes('xóa bộ lọc')) return;
            if (!text.includes('không tìm thấy') && !text.includes('không có dữ liệu')) return;
            const scope = node.closest('section, .admin-card, .module-content') || document;
            const hasControls = scope.querySelector('input[type="search"], input[type="text"], select');
            if (!hasControls) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'global-reset-filters';
            button.textContent = 'Xóa bộ lọc';
            button.style.cssText = 'background:none;border:none;color:#236B48;font-weight:600;text-decoration:underline;cursor:pointer;padding:0 4px;font-size:13.5px;';
            button.addEventListener('click', () => {
                scope.querySelectorAll('input[type="search"], input[type="text"]').forEach(input => {
                    input.value = '';
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                });
                scope.querySelectorAll('select').forEach(select => {
                    const all = Array.from(select.options).find(option => /tất cả|all/i.test(option.textContent) || option.value === 'ALL');
                    if (all) select.value = all.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                });
            });
            node.append(' ', button);
        });
    };
    const ensureToolbarReset = (root = document) => {
        root.querySelectorAll('.search-box-wrapper').forEach(searchBox => {
            const scope = searchBox.closest('section, .admin-card, .module-content') || searchBox.parentElement;
            if (!scope || scope.querySelector('.global-toolbar-reset')) return;
            const controls = scope.querySelectorAll('input[type="search"], input[type="text"], select');
            if (controls.length < 2) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'admin-btn-clear-filters global-toolbar-reset';
            button.textContent = 'Xóa bộ lọc';
            button.style.display = 'none';
            button.addEventListener('click', () => {
                controls.forEach(control => {
                    if (control.tagName === 'SELECT') {
                        const all = Array.from(control.options).find(option => /tất cả|all/i.test(option.textContent) || option.value === 'ALL');
                        if (all) control.value = all.value;
                    } else control.value = '';
                    control.dispatchEvent(new Event('input', { bubbles: true }));
                    control.dispatchEvent(new Event('change', { bubbles: true }));
                });
            });
            const host = searchBox.closest('.filter-row-bottom, .filter-row, .filter-controls, .toolbar-filters')
                || scope.querySelector('.filter-row-bottom, .filter-row, .filter-controls, .toolbar-filters')
                || searchBox.parentElement || scope;
            host.appendChild(button);
            const update = () => {
                const active = Array.from(controls).some(control => control.tagName === 'SELECT'
                    ? control.value && !/^ALL$/i.test(control.value)
                    : control.value.trim());
                button.style.display = active ? 'inline-flex' : 'none';
            };
            controls.forEach(control => control.addEventListener('input', update));
            controls.forEach(control => control.addEventListener('change', update));
            update();
        });
    };
    const renderTableSkeleton = (tbody, { columns = null, rows = 4 } = {}) => {
        if (!tbody) return;
        const colCount = columns || tbody.closest('table')?.querySelectorAll('thead th').length || 6;
        tbody.dataset.loadingSkeleton = 'true';
        tbody.innerHTML = Array.from({ length: rows }, (_, index) => {
            const cells = Array.from({ length: colCount }, (__, cIdx) => {
                if (cIdx === 0 && colCount >= 6) {
                    return '<td style="text-align: center;"><span class="skeleton-avatar"></span></td>';
                }
                const width = Math.min(160, Math.max(50, 60 + ((cIdx * 23 + index * 17) % 75)));
                return `<td><span class="skeleton-text" style="width: ${width}px;"></span></td>`;
            }).join('');
            return `<tr class="skeleton-row admin-auto-skeleton">${cells}</tr>`;
        }).join('');
    };

    window.PawpalAdmin = window.PawpalAdmin || {};
    window.PawpalAdmin.renderTableSkeleton = renderTableSkeleton;

    const ensureTableSkeleton = (root = document) => {
        root.querySelectorAll('table tbody').forEach(tbody => {
            if (tbody.dataset.loadingSkeleton === 'true') return;
            const textContent = (tbody.textContent || '').trim().toLowerCase();
            const isTextLoading = tbody.children.length === 1 && (
                textContent.includes('đang tải') ||
                textContent.includes('đang nạp') ||
                textContent.includes('đang kiểm tra') ||
                textContent.includes('loading')
            );
            if (!tbody.children.length || isTextLoading) {
                renderTableSkeleton(tbody, { rows: 4 });
            }
        });
    };
    ensureEmptyStateReset();
    ensureToolbarReset();
    ensureTableSkeleton();
    new MutationObserver(() => { ensureEmptyStateReset(); ensureToolbarReset(); ensureTableSkeleton(); }).observe(document.body, { childList: true, subtree: true });

    // Global Modal Handler: Tự động đóng modal toàn hệ thống khi bấm nút Đóng, Hủy bỏ, click outside hoặc phím ESC
    document.addEventListener('click', (e) => {
        // 1. Click vào nút đóng header (.modal-btn-close-text, .modal-btn-close, .btn-close-modal, [data-dismiss="modal"])
        const closeBtn = e.target.closest('.modal-btn-close-text, .modal-btn-close, .btn-close-modal, [data-dismiss="modal"]');
        if (closeBtn) {
            const modal = closeBtn.closest('.admin-modal-overlay');
            if (modal) {
                modal.classList.remove('active');
            }
            return;
        }

        // 2. Click vào nút Hủy / Hủy bỏ ở footer modal
        const cancelBtn = e.target.closest('.modal-footer-clean .admin-btn-secondary, .modal-footer .admin-btn-secondary, .modal-footer-clean [id^="btnCancel"], .modal-footer [id^="btnCancel"]');
        if (cancelBtn) {
            const btnText = (cancelBtn.textContent || '').trim().toLowerCase();
            if (btnText === 'hủy bỏ' || btnText === 'hủy' || btnText === 'đóng' || cancelBtn.id.toLowerCase().includes('cancel') || cancelBtn.id.toLowerCase().includes('close')) {
                const modal = cancelBtn.closest('.admin-modal-overlay');
                if (modal) {
                    modal.classList.remove('active');
                }
                return;
            }
        }

        // 3. Click ngoài viền thẻ card (click vào chính overlay)
        if (e.target.classList.contains('admin-modal-overlay')) {
            e.target.classList.remove('active');
        }
    });

    // Nhấn phím Escape để đóng modal đang mở
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' || e.key === 'Esc') {
            const activeModal = document.querySelector('.admin-modal-overlay.active');
            if (activeModal) {
                activeModal.classList.remove('active');
            }
        }
    });

    // Khởi tạo Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
});
