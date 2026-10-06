// admin.js - Quản trị hệ thống Pawpal-er
document.addEventListener('DOMContentLoaded', () => {
    const sidebarBtns = document.querySelectorAll('.sidebar-menu-btn');
    const moduleTitleEl = document.getElementById('headerModuleTitle');
    const subtabsContainer = document.getElementById('headerSubtabsGroup');
    const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
    const contentArea = document.querySelector('.admin-preview-content');

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
                { id: 'tab-complaint-services', label: 'Dịch vụ' },
                { id: 'tab-complaint-orders', label: 'Đơn hàng' },
                { id: 'tab-complaint-reports', label: 'Báo cáo SLA' }
            ]
        },
        'Chatbot': {
            title: '',
            defaultTab: 'tab-live-support',
            storageKey: 'pawpal_admin_chatbot_subtab',
            subtabs: [
                { id: 'tab-live-support', label: 'Hỗ trợ trực tuyến' },
                { id: 'tab-chatbot-flow', label: 'Kịch bản bot' },
                { id: 'tab-ai-training', label: 'Huấn luyện AI' }
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
            sidebarBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const title = btn.getAttribute('data-title');
            sessionStorage.setItem('pawpal_admin_active_module', title);

            // Đồng bộ hash URL ngay lập tức khi bấm đổi phân hệ
            const targetHash = getTargetHashForModule(title);
            if (targetHash && resolveModuleFromHash(window.location.hash) !== title) {
                try {
                    history.replaceState(null, '', targetHash);
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
        }
    });

    // Thu gọn / Mở rộng Sidebar & Lưu trạng thái vào localStorage
    const adminLayout = document.querySelector('.admin-layout');
    const btnToggleSidebar = document.getElementById('btnToggleSidebar');

    // Khôi phục trạng thái sidebar đã lưu
    const isSidebarCollapsed = localStorage.getItem('pawpal_admin_sidebar_collapsed') === 'true';
    if (isSidebarCollapsed && adminLayout) {
        adminLayout.classList.add('sidebar-collapsed');
    }

    if (btnToggleSidebar && adminLayout) {
        btnToggleSidebar.addEventListener('click', () => {
            adminLayout.classList.toggle('sidebar-collapsed');
            const collapsed = adminLayout.classList.contains('sidebar-collapsed');
            localStorage.setItem('pawpal_admin_sidebar_collapsed', collapsed ? 'true' : 'false');
            if (window.lucide) {
                lucide.createIcons();
            }
        });
    }

    // Khởi tạo Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
});
