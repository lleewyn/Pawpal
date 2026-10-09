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
    const raw = localStorage.getItem('pawpal_current_user') || sessionStorage.getItem('pawpal_current_user');
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (e) { return null; }
}
function enforceAdminAuth() {
    if (!getAdminSessionUser()) {
        window.location.replace('/pages/public/login/login.html?redirect=/pages/admin/index.html');
        return false;
    }
    return true;
}

if (!enforceAdminAuth()) { throw new Error('ADMIN_AUTH_REQUIRED'); }
window.addEventListener('pageshow', () => { if (!enforceAdminAuth()) return; });
document.addEventListener('DOMContentLoaded', () => {
    if (!enforceAdminAuth()) return;
    const sidebarBtns = document.querySelectorAll('.sidebar-menu-btn');
    const moduleTitleEl = document.getElementById('headerModuleTitle');
    const subtabsContainer = document.getElementById('headerSubtabsGroup');
    const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
    const contentArea = document.querySelector('.admin-preview-content');

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
        document.querySelectorAll('.header-subtab-btn').forEach(button => button.classList.toggle('active', button === tabButton));
        if (window.location.hash !== `#${tabId}`) history.pushState(null, '', `#${tabId}`);
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
                { id: 'tab-pet-profile', label: 'Hồ sơ pet' },
                { id: 'tab-pet-medical', label: 'Sổ tiêm' }
            ]
        },
        'Dịch vụ': {
            title: '',
            defaultTab: 'tab-service-bookings',
            storageKey: 'pawpal_admin_services_active_subtab',
            subtabs: [
                { id: 'tab-service-bookings', label: 'Lịch hẹn' },
                { id: 'tab-service-catalog', label: 'Danh mục dịch vụ' },
                { id: 'tab-service-pricing', label: 'Bảng giá' },
                { id: 'tab-service-reports', label: 'Báo cáo dịch vụ' }
            ]
        },
        'Bán hàng': {
            title: '',
            defaultTab: 'tab-order-list',
            storageKey: 'pawpal_admin_order_subtab',
            subtabs: [
                { id: 'tab-order-list', label: 'Đơn hàng' },
                { id: 'tab-order-catalog', label: 'Danh mục sản phẩm' },
                { id: 'tab-order-inventory', label: 'Tồn kho' },
                { id: 'tab-order-reports', label: 'Báo cáo doanh thu' }
            ]
        },
        'Nhân sự': {
            title: '',
            defaultTab: 'tab-staff-list',
            storageKey: 'pawpal_admin_staff_active_subtab',
            subtabs: [
                { id: 'tab-staff-list', label: 'Nhân viên' },
                { id: 'tab-staff-roster', label: 'Lịch trực KTV' },
                { id: 'tab-staff-timesheet', label: 'Chấm công' },
                { id: 'tab-staff-reports', label: 'Báo cáo hiệu suất' }
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
                { id: 'tab-live-support', label: 'Hỗ trợ trực tuyến' },
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
            }
        }
    }

    // Nạp module tương ứng
    async function loadModule(moduleName) {
        if (!contentArea) return;

        // Render tức thì Header Bar để triệt tiêu 100% hiện tượng chớp/load header
        renderHeaderSubtabsInstant(moduleName);

        if (moduleName === 'Dashboard') {
            try {
                const res = await fetch('modules/dashboard/dashboard.html?v=' + Date.now());
                if (res.ok) {
                    contentArea.innerHTML = await res.text();
                    const oldScript = document.getElementById('dynamic-module-script');
                    if (oldScript) oldScript.remove();
                    const script = document.createElement('script');
                    script.id = 'dynamic-module-script';
                    script.src = 'modules/dashboard/dashboard.js?v=' + Date.now();
                    document.body.appendChild(script);
                    return;
                }
            } catch (err) {
                console.error('Không thể load modules/dashboard/dashboard.html:', err);
            }
        }

        if (moduleName === 'Khách hàng') {
            try {
                const res = await fetch('modules/customers/customers.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    syncActiveSubtabPane(contentArea, moduleName);
                    
                    // Khởi tạo Lucide
                    if (window.lucide) lucide.createIcons();

                    // Tải và chạy script tương tác của module Khách hàng
                    const oldScript = document.getElementById('dynamic-module-script');
                    if (oldScript) oldScript.remove();

                    const script = document.createElement('script');
                    script.id = 'dynamic-module-script';
                    script.src = 'modules/customers/customers.js?v=' + Date.now();
                    document.body.appendChild(script);
                    return;
                }
            } catch (err) {
                console.error('Không thể load modules/customers/customers.html:', err);
            }
        }

        if (moduleName === 'Thú cưng') {
            try {
                const res = await fetch('modules/pets/pets.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    syncActiveSubtabPane(contentArea, moduleName);
                    
                    if (window.lucide) lucide.createIcons();

                    const oldScript = document.getElementById('dynamic-module-script');
                    if (oldScript) oldScript.remove();

                    const script = document.createElement('script');
                    script.id = 'dynamic-module-script';
                    script.src = 'modules/pets/pets.js?v=' + Date.now();
                    document.body.appendChild(script);
                    return;
                }
            } catch (err) {
                console.error('Không thể load modules/pets/pets.html:', err);
            }
        }

        if (moduleName === 'Dịch vụ') {
            try {
                const res = await fetch('modules/services/services.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    syncActiveSubtabPane(contentArea, moduleName);
                    
                    if (window.lucide) lucide.createIcons();

                    const oldScript = document.getElementById('dynamic-module-script');
                    if (oldScript) oldScript.remove();

                    const script = document.createElement('script');
                    script.id = 'dynamic-module-script';
                    script.src = 'modules/services/services.js?v=' + Date.now();
                    document.body.appendChild(script);
                    return;
                }
            } catch (err) {
                console.error('Không thể load modules/services/services.html:', err);
            }
        }

        if (moduleName === 'Bán hàng') {
            try {
                const res = await fetch('modules/orders/orders.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    syncActiveSubtabPane(contentArea, moduleName);
                    
                    if (window.lucide) lucide.createIcons();

                    const oldScript = document.getElementById('dynamic-module-script');
                    if (oldScript) oldScript.remove();

                    const script = document.createElement('script');
                    script.id = 'dynamic-module-script';
                    script.src = 'modules/orders/orders.js?v=' + Date.now();
                    document.body.appendChild(script);
                    return;
                }
            } catch (err) {
                console.error('Không thể load modules/orders/orders.html:', err);
            }
        }

        if (moduleName === 'Nhân sự') {
            const rawUser = localStorage.getItem('pawpal_current_user') || sessionStorage.getItem('pawpal_current_user');
            let currentUser = null;
            try { currentUser = rawUser ? JSON.parse(rawUser) : null; } catch (e) { currentUser = null; }
            const role = String(currentUser?.role || currentUser?.user_role || currentUser?.position || currentUser?.user_metadata?.role || '').toLowerCase();
            if (currentUser && !['admin', 'administrator', 'quản trị viên', 'quan tri vien'].includes(role)) {
                if (contentArea) contentArea.innerHTML = '<div class="admin-card" style="padding: 32px; text-align: center;"><strong>Không có quyền truy cập</strong><div style="margin-top: 8px; color: var(--text-muted);">Chỉ Quản trị viên được truy cập phân hệ Nhân sự.</div></div>';
                if (subtabsContainer) subtabsContainer.innerHTML = '';
                return;
            }
            try {
                const res = await fetch('modules/staff/staff.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    syncActiveSubtabPane(contentArea, moduleName);
                    
                    if (window.lucide) lucide.createIcons();

                    const oldScript = document.getElementById('dynamic-module-script');
                    if (oldScript) oldScript.remove();

                    const script = document.createElement('script');
                    script.id = 'dynamic-module-script';
                    script.src = 'modules/staff/staff.js?v=' + Date.now();
                    document.body.appendChild(script);
                    return;
                }
            } catch (err) {
                console.error('Không thể load modules/staff/staff.html:', err);
            }
        }

        if (moduleName === 'Khiếu nại') {
            try {
                const res = await fetch('modules/complaints/complaints.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    syncActiveSubtabPane(contentArea, moduleName);
                    
                    if (window.lucide) lucide.createIcons();

                    const oldScript = document.getElementById('dynamic-module-script');
                    if (oldScript) oldScript.remove();

                    const script = document.createElement('script');
                    script.id = 'dynamic-module-script';
                    script.src = 'modules/complaints/complaints.js?v=' + Date.now();
                    document.body.appendChild(script);
                    return;
                }
            } catch (err) {
                console.error('Không thể load modules/complaints/complaints.html:', err);
            }
        }

        if (moduleName === 'Chatbot') {
            try {
                const res = await fetch('modules/chatbot/chatbot.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    syncActiveSubtabPane(contentArea, moduleName);
                    
                    if (window.lucide) lucide.createIcons();

                    const oldScript = document.getElementById('dynamic-module-script');
                    if (oldScript) oldScript.remove();

                    const script = document.createElement('script');
                    script.id = 'dynamic-module-script';
                    script.src = 'modules/chatbot/chatbot.js?v=' + Date.now();
                    document.body.appendChild(script);
                    return;
                }
            } catch (err) {
                console.error('Không thể load modules/chatbot/chatbot.html:', err);
            }
        }

        if (moduleName === 'Cấu hình') {
            try {
                const res = await fetch('modules/settings/settings.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    syncActiveSubtabPane(contentArea, moduleName);
                    
                    if (window.lucide) lucide.createIcons();

                    const oldScript = document.getElementById('dynamic-module-script');
                    if (oldScript) oldScript.remove();

                    const script = document.createElement('script');
                    script.id = 'dynamic-module-script';
                    script.src = 'modules/settings/settings.js?v=' + Date.now();
                    document.body.appendChild(script);
                    return;
                }
            } catch (err) {
                console.error('Không thể load modules/settings/settings.html:', err);
            }
        }
        if (moduleTitleEl) {
            moduleTitleEl.textContent = moduleName;
            moduleTitleEl.style.display = 'inline-block';
        }
        if (subtabsContainer) subtabsContainer.innerHTML = '';
        if (deepBreadcrumbEl) deepBreadcrumbEl.innerHTML = '';
        contentArea.innerHTML = `
            <div class="admin-card" style="padding: 32px; text-align: center; color: var(--text-muted);">
                <div style="font-size: 16px; font-weight: 600; color: var(--text-main); margin-bottom: 8px;">Phân hệ ${moduleName}</div>
                <div>Đang sẵn sàng triển khai theo thứ tự duyệt của bạn.</div>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
    }

    function resolveModuleFromHash(hash) {
        if (!hash) return null;
        if (hash.startsWith('#tab-service') || hash.startsWith('#tab-booking') || hash === '#services') return 'Dịch vụ';
        if (hash.startsWith('#tab-order')) return 'Bán hàng';
        if (hash.startsWith('#tab-staff')) return 'Nhân sự';
        if (hash.startsWith('#tab-complaint')) return 'Khiếu nại';
        if (hash.startsWith('#tab-chatbot') || hash.startsWith('#tab-ai-') || hash.startsWith('#tab-live-support')) return 'Chatbot';
        if (hash.startsWith('#tab-setting') || hash.startsWith('#tab-banner') || hash.startsWith('#tab-blog') || hash.startsWith('#tab-system') || hash.startsWith('#tab-content') || hash.startsWith('#tab-audit') || hash === '#settings') return 'Cấu hình';
        if (hash.startsWith('#tab-pet')) return 'Thú cưng';
        if (hash.startsWith('#tab-list') || hash.startsWith('#tab-profile') || hash.startsWith('#tab-pawpoint') || hash.startsWith('#tab-customer')) return 'Khách hàng';
        if (hash.startsWith('#tab-dashboard')) return 'Dashboard';
        return null;
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

    // Gắn sự kiện click sidebar
    sidebarBtns.forEach(btn => {
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
        if (b.getAttribute('data-title') === initialModule) {
            b.classList.add('active');
        } else {
            b.classList.remove('active');
        }
    });

    // Đảm bảo hash khớp với initialModule nếu hash rỗng
    if (!window.location.hash) {
        const defaultHash = getTargetHashForModule(initialModule);
        if (defaultHash) {
            try {
                history.replaceState(null, '', defaultHash);
            } catch (e) {}
        }
    }

    sessionStorage.setItem('pawpal_admin_active_module', initialModule);
    loadModule(initialModule);

    // Lắng nghe thay đổi URL Hash liên phân hệ để chuyển module mượt mà
    window.addEventListener('hashchange', () => {
        const targetMod = resolveModuleFromHash(window.location.hash);
        const currentMod = sessionStorage.getItem('pawpal_admin_active_module');
        if (targetMod && targetMod !== currentMod) {
            sidebarBtns.forEach(b => {
                if (b.getAttribute('data-title') === targetMod) {
                    b.classList.add('active');
                } else {
                    b.classList.remove('active');
                }
            });
            sessionStorage.setItem('pawpal_admin_active_module', targetMod);
            loadModule(targetMod);
        } else if (targetMod) {
            renderHeaderSubtabsInstant(targetMod);
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
        btnSidebarLogout.addEventListener('click', () => {
            try {
                sessionStorage.removeItem('pawpal_admin_active_module');
                sessionStorage.removeItem('pawpal_current_user');
                sessionStorage.removeItem('pawpal_user_role');
                localStorage.removeItem('pawpal_current_user');
                if (window.PawpalStorage && typeof window.PawpalStorage.remove === 'function') {
                    window.PawpalStorage.remove('pawpal_current_user');
                }
                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (client && client.auth && typeof client.auth.signOut === 'function') {
                    client.auth.signOut();
                }
            } catch (e) {}
            window.location.replace('/pages/public/login/login.html');
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

    // Khởi tạo Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
});
