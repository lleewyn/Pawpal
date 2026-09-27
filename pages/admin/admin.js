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

        // Các module khác tạm hiển thị placeholder thiết kế
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
            loadModule(title);
        });
    });

    // Mặc định nạp module của nút active ban đầu
    const activeBtn = document.querySelector('.sidebar-menu-btn.active');
    if (activeBtn) {
        loadModule(activeBtn.getAttribute('data-title'));
    }

    // Khởi tạo Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
});
