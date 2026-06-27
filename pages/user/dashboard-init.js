const USER_SAMPLE_SEED_URL = '/data/user-sample-seed.json';

function safeParseJSON(value, fallback) {
    try {
        return JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

function readJSONSync(url) {
    try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send(null);

        if (xhr.status >= 200 && xhr.status < 300) {
            return safeParseJSON(xhr.responseText, null);
        }
    } catch (error) {
        console.warn('[dashboard-init] Cannot load sample data:', error);
    }

    return null;
}

function seedLocalStorageIfNeeded() {
    const sampleData = readJSONSync(USER_SAMPLE_SEED_URL);
    if (!sampleData) return;

    Object.entries(sampleData).forEach(([key, value]) => {
        const existingRaw = localStorage.getItem(key);
        if (existingRaw === null) {
            localStorage.setItem(key, JSON.stringify(value));
            return;
        }

        const parsed = safeParseJSON(existingRaw, null);
        if (Array.isArray(value) && Array.isArray(parsed) && parsed.length === 0) {
            localStorage.setItem(key, JSON.stringify(value));
            return;
        }

        if (value && typeof value === 'object' && !Array.isArray(value) && parsed && typeof parsed === 'object' && Object.keys(parsed).length === 0) {
            localStorage.setItem(key, JSON.stringify(value));
        }
    });

    if (!localStorage.getItem('pawpal_mock_data_version')) {
        localStorage.setItem('pawpal_mock_data_version', '2026-06-24-user-sample-seed-v1');
    }
}

seedLocalStorageIfNeeded();

// Authentication Guard
(function () {
    const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
    if (!currentUser) {
        alert('Vui lòng đăng nhập để truy cập trang này');
        window.location.href = '/pages/public/login/login.html';
        return;
    }
})();

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
        'pet-profile':    { label: 'Hồ sơ bé cưng',       parent: null },
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
