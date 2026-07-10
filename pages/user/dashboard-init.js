

// Authentication Guard
(function () {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
    if (!currentUser) {
        alert('Vui lòng đăng nhập để truy cập trang này');
        window.location.href = '/pages/public/login/login.html';
        return;
    }
})();

document.addEventListener('DOMContentLoaded', function initMobileSidebarOverlay() {
    const toggleBtn = document.getElementById('dashboardSidebarToggle');
    const backdrop = document.getElementById('dashboardSidebarBackdrop');
    // Bỏ tìm sidebar tĩnh vì components.js có thể ghi đè div#user-sidebar
    if (!toggleBtn || !backdrop) return;

    const setOpen = (open) => {
        document.body.classList.toggle('dashboard-sidebar-open', open);
        backdrop.hidden = !open;
        toggleBtn.setAttribute('aria-expanded', String(open));
    };

    toggleBtn.addEventListener('click', () => {
        setOpen(!document.body.classList.contains('dashboard-sidebar-open'));
    });

    backdrop.addEventListener('click', () => setOpen(false));

    window.addEventListener('resize', () => {
        if (window.innerWidth > 1024) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') setOpen(false);
    });

    setOpen(false);
});

// Load sidebar synchronously if #user-sidebar exists
(function loadSidebar() {
    const sidebarContainer = document.getElementById('user-sidebar');
    if (!sidebarContainer) return;

    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', '../../components/user-sidebar/user-sidebar.html', false);
        xhr.send();
        if (xhr.status === 200) {
            sidebarContainer.innerHTML = xhr.responseText;
        } else {
            sidebarContainer.innerHTML = '<div class="dashboard-sidebar"><p class="text-center p-4 text-muted">Không tải được thanh điều hướng.</p></div>';
            console.warn('[dashboard-init] Cannot load sidebar:', xhr.status, xhr.statusText);
        }
    } catch (error) {
        sidebarContainer.innerHTML = '<div class="dashboard-sidebar"><p class="text-center p-4 text-muted">Không tải được thanh điều hướng.</p></div>';
        console.warn('[dashboard-init] Sidebar load error:', error);
    }
})();

// ── Breadcrumb Auto-Inject ──────────────────────────────────────────────────
(function injectBreadcrumb() {
    // Map path segments → breadcrumb config
    // { label, parent: { label, href } | null }
    const BREADCRUMB_MAP = {
        'dashboard':      { label: 'Tổng quan tài khoản', parent: null },
        'pet-profile':    { label: 'Hồ sơ của tôi',       parent: null },
        'pet-diary':      { label: 'Nhật ký chăm sóc',    parent: { label: 'Bé cưng', href: '../pet-profile/pet-profile.html' } },
        'bookings':       { label: 'Lịch hẹn của tôi',    parent: null },
        'booking-detail': { label: 'Chi tiết lịch hẹn',   parent: { label: 'Lịch hẹn', href: '../bookings/bookings.html' } },
        'orders':         { label: 'Đơn hàng của tôi',    parent: null },
        'order-detail':   { label: 'Chi tiết đơn hàng',   parent: { label: 'Đơn hàng', href: '../orders/orders.html' } },
        'return-detail':  { label: 'Chi tiết đổi trả',    parent: { label: 'Đơn hàng', href: '../orders/orders.html' } },
        'loyalty':        { label: 'Paw Points',           parent: null },
        'wishlist':       { label: 'Yêu thích',            parent: null },
        'settings':       { label: 'Cài đặt',              parent: null },
        'support-tickets':{ label: 'Yêu cầu hỗ trợ',      parent: null },
        'support-create': { label: 'Gửi yêu cầu mới',     parent: { label: 'Yêu cầu hỗ trợ', href: '../support-tickets/support-tickets.html' } },
    };

    // Detect current page from URL
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    // e.g. ["pages","user","support-tickets","support-tickets.html"]
    const pageFolder = pathParts.find(p => BREADCRUMB_MAP[p]) || null;
    if (!pageFolder) return;

    const config = BREADCRUMB_MAP[pageFolder];

    // Build breadcrumb HTML — only show for pages that have a parent (sub-pages)
    // Top-level pages already have sidebar navigation, no breadcrumb needed
    if (!config.parent) return;

    const items = [
        `<li class="breadcrumb-item"><a href="${config.parent.href}">${config.parent.label}</a></li>`,
        `<li class="breadcrumb-item active">${config.label}</li>`
    ];

    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'breadcrumb');
    nav.className = 'user-breadcrumb';
    nav.innerHTML = `<ol class="breadcrumb">${items.join('')}</ol>`;

    // Inject: try col-lg-9 first (sidebar layout), then orders-main-content / order-detail-main
    function tryInject() {
        const targets = [
            document.querySelector('.col-lg-9'),
            document.querySelector('.orders-main-content'),
            document.querySelector('.order-detail-main'),
        ];
        const target = targets.find(el => el !== null);
        if (target) {
            target.insertBefore(nav, target.firstChild);
        }
    }

    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', tryInject);
    } else {
        tryInject();
    }
})();
