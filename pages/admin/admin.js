// admin.js - Quản trị hệ thống Pawpal-er
document.addEventListener('DOMContentLoaded', () => {
    const sidebarBtns = document.querySelectorAll('.sidebar-menu-btn');
    const moduleTitleEl = document.getElementById('headerModuleTitle');
    const subtabsContainer = document.getElementById('headerSubtabsGroup');
    const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
    const contentArea = document.querySelector('.admin-preview-content');

    // Nạp module tương ứng
    async function loadModule(moduleName) {
        if (!contentArea) return;

        // Reset Header Subtabs và Breadcrumb trước khi nạp module mới
        if (subtabsContainer) subtabsContainer.innerHTML = '';
        if (deepBreadcrumbEl) deepBreadcrumbEl.innerHTML = '';

        if (moduleName === 'Dashboard') {
            if (moduleTitleEl) {
                moduleTitleEl.textContent = 'Dashboard';
                moduleTitleEl.style.display = 'inline-block';
            }
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
            if (moduleTitleEl) {
                moduleTitleEl.textContent = '';
                moduleTitleEl.style.display = 'none';
            }
            try {
                const res = await fetch('modules/customers/customers.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    
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
            if (moduleTitleEl) {
                moduleTitleEl.textContent = '';
                moduleTitleEl.style.display = 'none';
            }
            try {
                const res = await fetch('modules/pets/pets.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    
                    // Khởi tạo Lucide
                    if (window.lucide) lucide.createIcons();

                    // Tải và chạy script tương tác của module Thú cưng
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
            if (moduleTitleEl) {
                moduleTitleEl.textContent = '';
                moduleTitleEl.style.display = 'none';
            }
            try {
                const res = await fetch('modules/services/services.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    
                    // Khởi tạo Lucide
                    if (window.lucide) lucide.createIcons();

                    // Tải và chạy script tương tác của module Dịch vụ
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
            if (moduleTitleEl) {
                moduleTitleEl.textContent = '';
                moduleTitleEl.style.display = 'none';
            }
            try {
                const res = await fetch('modules/orders/orders.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    
                    // Khởi tạo Lucide
                    if (window.lucide) lucide.createIcons();

                    // Tải và chạy script tương tác của module Bán hàng
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
            if (moduleTitleEl) {
                moduleTitleEl.textContent = '';
                moduleTitleEl.style.display = 'none';
            }
            // Subtabs và DeepBreadcrumb sẽ được quản lý chuẩn trong staff.js
            if (subtabsContainer) subtabsContainer.innerHTML = '';
            if (deepBreadcrumbEl) deepBreadcrumbEl.innerHTML = '';
            
            try {
                const res = await fetch('modules/staff/staff.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    
                    // Khởi tạo Lucide
                    if (window.lucide) lucide.createIcons();

                    // Tải và chạy script tương tác của module Nhân sự
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
            if (moduleTitleEl) {
                moduleTitleEl.textContent = '';
                moduleTitleEl.style.display = 'none';
            }
            if (subtabsContainer) subtabsContainer.innerHTML = '';
            if (deepBreadcrumbEl) deepBreadcrumbEl.innerHTML = '';
            
            try {
                const res = await fetch('modules/complaints/complaints.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    
                    // Khởi tạo Lucide
                    if (window.lucide) lucide.createIcons();

                    // Tải và chạy script tương tác của module Khiếu nại
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
            if (moduleTitleEl) {
                moduleTitleEl.textContent = '';
                moduleTitleEl.style.display = 'none';
            }
            if (subtabsContainer) subtabsContainer.innerHTML = '';
            if (deepBreadcrumbEl) deepBreadcrumbEl.innerHTML = '';
            
            try {
                const res = await fetch('modules/chatbot/chatbot.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    
                    // Khởi tạo Lucide
                    if (window.lucide) lucide.createIcons();

                    // Tải và chạy script tương tác của module Chatbot
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
            if (moduleTitleEl) {
                moduleTitleEl.textContent = '';
                moduleTitleEl.style.display = 'none';
            }
            if (subtabsContainer) subtabsContainer.innerHTML = '';
            if (deepBreadcrumbEl) deepBreadcrumbEl.innerHTML = '';
            
            try {
                const res = await fetch('modules/settings/settings.html?v=' + Date.now());
                if (res.ok) {
                    const html = await res.text();
                    contentArea.innerHTML = html;
                    
                    // Khởi tạo Lucide
                    if (window.lucide) lucide.createIcons();

                    // Tải và chạy script tương tác của module Cấu hình
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

    // Gắn sự kiện click sidebar
    sidebarBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            sidebarBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const title = btn.getAttribute('data-title');
            sessionStorage.setItem('pawpal_admin_active_module', title);
            loadModule(title);
        });
    });

    // Xác định module cần nạp ban đầu theo URL Hash, nút active hoặc sessionStorage
    const currentHash = window.location.hash || '';
    let initialModule = null;

    if (currentHash.startsWith('#tab-service') || currentHash.startsWith('#tab-booking')) {
        initialModule = 'Dịch vụ';
    } else if (currentHash.startsWith('#tab-order')) {
        initialModule = 'Bán hàng';
    } else if (currentHash.startsWith('#tab-staff')) {
        initialModule = 'Nhân sự';
    } else if (currentHash.startsWith('#tab-complaint')) {
        initialModule = 'Khiếu nại';
    } else if (currentHash.startsWith('#tab-chatbot') || currentHash.startsWith('#tab-ai-') || currentHash.startsWith('#tab-live-support')) {
        initialModule = 'Chatbot';
    } else if (currentHash.startsWith('#tab-setting') || currentHash.startsWith('#tab-banner') || currentHash.startsWith('#tab-blog') || currentHash.startsWith('#tab-system')) {
        initialModule = 'Cấu hình';
    } else if (currentHash.startsWith('#tab-pet')) {
        initialModule = 'Thú cưng';
    } else if (currentHash.startsWith('#tab-list') || currentHash.startsWith('#tab-profile') || currentHash.startsWith('#tab-pawpoint')) {
        initialModule = 'Khách hàng';
    }

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

    sessionStorage.setItem('pawpal_admin_active_module', initialModule);
    loadModule(initialModule);

    // Khởi tạo Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
});
