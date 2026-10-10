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
            }
        }
    }

    async function loadModuleScripts(scriptPaths) {
        document.querySelectorAll('.dynamic-module-script').forEach(el => el.remove());
        const oldScript = document.getElementById('dynamic-module-script');
        if (oldScript) oldScript.remove();

        for (const src of scriptPaths) {
            await new Promise((resolve) => {
                const script = document.createElement('script');
                script.className = 'dynamic-module-script';
                script.src = src + (src.includes('?') ? '&' : '?') + 'v=' + Date.now();
                script.onload = resolve;
                script.onerror = () => {
                    console.error('Lỗi nạp script:', src);
                    resolve();
                };
                document.body.appendChild(script);
            });
        }
    }

    // Nạp module tương ứng
    async function loadModule(moduleName) {
        if (!contentArea) return;

        // Render tức thì Header Bar để triệt tiêu 100% hiện tượng chớp/load header
        renderHeaderSubtabsInstant(moduleName);
        contentArea.innerHTML = '<div class="admin-module-loading" role="status" aria-live="polite"><span class="admin-loading-spinner"></span><span>Đang tải dữ liệu...</span></div>';

        if (moduleName === 'Dashboard') {
            try {
                const res = await fetch('modules/dashboard/dashboard.html?v=' + Date.now());
                if (res.ok) {
                    contentArea.innerHTML = await res.text();
                    await loadModuleScripts(['modules/dashboard/dashboard.js']);
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
                    
                    if (window.lucide) lucide.createIcons();

                    await loadModuleScripts([
                        'modules/customers/customers.js',
                        'modules/customers/subtabs/tab-customer-list.js',
                        'modules/customers/subtabs/tab-customer-profile.js',
                        'modules/customers/subtabs/tab-customer-pawpoint.js'
                    ]);
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

                    await loadModuleScripts([
                        'modules/pets/pets.js',
                        'modules/pets/subtabs/tab-pet-list.js',
                        'modules/pets/subtabs/tab-pet-profile.js',
                        'modules/pets/subtabs/tab-pet-carelog.js',
                        'modules/pets/subtabs/tab-pet-reminders.js'
                    ]);
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

                    await loadModuleScripts([
                        'modules/services/services.js',
                        'modules/services/subtabs/tab-service-bookings.js',
                        'modules/services/subtabs/tab-service-detail.js',
                        'modules/services/subtabs/tab-service-catalog.js',
                        'modules/services/subtabs/tab-service-reviews.js'
                    ]);
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

                    await loadModuleScripts([
                        'modules/orders/orders.js',
                        'modules/orders/subtabs/tab-order-list.js',
                        'modules/orders/subtabs/tab-order-detail.js',
                        'modules/orders/subtabs/tab-order-products.js',
                        'modules/orders/subtabs/tab-order-promos.js'
                    ]);
                    return;
                }
            } catch (err) {
                console.error('Không thể load modules/orders/orders.html:', err);
            }
        }

        if (moduleName === 'Nhân sự') {
            try {
                const res = await fetch('modules/staff/staff.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    syncActiveSubtabPane(contentArea, moduleName);
                    
                    if (window.lucide) lucide.createIcons();

                    await loadModuleScripts([
                        'modules/staff/staff.js',
                        'modules/staff/subtabs/tab-staff-list.js',
                        'modules/staff/subtabs/tab-staff-profile.js',
                        'modules/staff/subtabs/tab-staff-schedule.js',
                        'modules/staff/subtabs/tab-staff-assessment.js'
                    ]);
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

                    await loadModuleScripts([
                        'modules/complaints/complaints.js',
                        'modules/complaints/subtabs/tab-complaint-services.js',
                        'modules/complaints/subtabs/tab-complaint-orders.js',
                        'modules/complaints/subtabs/tab-complaint-detail.js'
                    ]);
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

                    await loadModuleScripts([
                        'modules/chatbot/chatbot.js',
                        'modules/chatbot/subtabs/tab-chatbot-live.js',
                        'modules/chatbot/subtabs/tab-chatbot-copilot.js',
                        'modules/chatbot/subtabs/tab-chatbot-rules.js'
                    ]);
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

                    await loadModuleScripts([
                        'modules/settings/settings.js',
                        'modules/settings/subtabs/tab-settings-banners.js',
                        'modules/settings/subtabs/tab-settings-content.js',
                        'modules/settings/subtabs/tab-settings-system.js',
                        'modules/settings/subtabs/tab-settings-audit.js'
                    ]);
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
    const ensureTableSkeleton = (root = document) => {
        root.querySelectorAll('table tbody').forEach(tbody => {
            if (tbody.children.length || tbody.dataset.loadingSkeleton === 'true') return;
            const columns = tbody.closest('table')?.querySelectorAll('thead th').length || 1;
            tbody.dataset.loadingSkeleton = 'true';
            tbody.innerHTML = Array.from({ length: 3 }, (_, index) => {
                const cells = Array.from({ length: columns }, () => '<td><span class="skeleton-text" style="width: ' + (55 + (index * 11)) + 'px;"></span></td>').join('');
                return '<tr class="skeleton-row admin-auto-skeleton">' + cells + '</tr>';
            }).join('');
        });
    };
    ensureEmptyStateReset();
    ensureToolbarReset();
    ensureTableSkeleton();
    new MutationObserver(() => { ensureEmptyStateReset(); ensureToolbarReset(); ensureTableSkeleton(); }).observe(document.body, { childList: true, subtree: true });

    // Khởi tạo Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
});
