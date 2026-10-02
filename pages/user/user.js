/**
 * user.js - Bộ điều phối Single-Page Application (SPA Module Router) cho PawPal User Portal
 */

(function () {
    // 1. Kiểm tra trạng thái đăng nhập
    function checkAuth() {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
        if (!currentUser) {
            sessionStorage.setItem('pawpal_redirect_after_login', window.location.href);
            alert('Vui lòng đăng nhập để truy cập trang này');
            window.location.href = '/pages/public/login/login.html';
            return false;
        }
        return true;
    }

    if (!checkAuth()) return;

    // 2. Định nghĩa cấu hình Routing
    const ROUTE_CONFIG = {
        'profile': {
            title: 'Tài khoản của tôi - PawPal',
            breadcrumb: 'Tổng quan tài khoản',
            modulePath: 'modules/profile/profile.html',
            moduleScript: 'modules/profile/profile.js',
            moduleCss: 'modules/profile/profile.css',
            sidebarId: 'nav-dashboard',
            aliases: ['dashboard']
        },
        'settings': {
            title: 'Cài đặt - PawPal',
            breadcrumb: 'Cài đặt',
            modulePath: 'modules/settings/settings.html',
            moduleScript: 'modules/settings/settings.js',
            moduleCss: 'modules/settings/settings.css',
            sidebarId: 'nav-security',
            aliases: ['security']
        },
        'pets': {
            title: 'Hồ sơ bé cưng - PawPal',
            breadcrumb: 'Hồ sơ bé cưng',
            modulePath: 'modules/pets/pets.html',
            moduleScript: 'modules/pets/pets.js',
            moduleCss: 'modules/pets/pets.css',
            sidebarId: 'nav-pets',
            aliases: ['pet-profile']
        },
        'diary': {
            title: 'Nhật ký chăm sóc - PawPal',
            breadcrumb: 'Nhật ký chăm sóc',
            modulePath: 'modules/diary/diary.html',
            moduleScript: 'modules/diary/diary.js',
            moduleCss: 'modules/diary/diary.css',
            sidebarId: 'nav-diary',
            aliases: ['pet-diary']
        },
        'bookings': {
            title: 'Lịch hẹn của tôi - PawPal',
            breadcrumb: 'Lịch hẹn của bé',
            modulePath: 'modules/bookings/bookings.html',
            moduleScript: 'modules/bookings/bookings.js',
            moduleCss: 'modules/bookings/bookings.css',
            sidebarId: 'nav-bookings',
            aliases: ['booking']
        },
        'booking-detail': {
            title: 'Chi tiết lịch hẹn - PawPal',
            breadcrumb: 'Chi tiết lịch hẹn',
            parentRoute: 'bookings',
            parentBreadcrumb: 'Lịch hẹn của bé',
            modulePath: 'modules/bookings/booking-detail.html',
            moduleScript: 'modules/bookings/booking-detail.js',
            moduleCss: 'modules/bookings/booking-detail.css',
            sidebarId: 'nav-bookings'
        },
        'orders': {
            title: 'Đơn hàng của tôi - PawPal',
            breadcrumb: 'Đơn hàng của bé',
            modulePath: 'modules/orders/orders.html',
            moduleScript: 'modules/orders/orders.js',
            moduleCss: 'modules/orders/orders.css',
            sidebarId: 'nav-orders',
            aliases: ['order']
        },
        'order-detail': {
            title: 'Chi tiết đơn hàng - PawPal',
            breadcrumb: 'Chi tiết đơn hàng',
            parentRoute: 'orders',
            parentBreadcrumb: 'Đơn hàng của bé',
            modulePath: 'modules/orders/order-detail.html',
            moduleScript: 'modules/orders/order-detail.js',
            moduleCss: 'modules/orders/order-detail.css',
            sidebarId: 'nav-orders'
        },
        'return-detail': {
            title: 'Chi tiết đổi trả - PawPal',
            breadcrumb: 'Chi tiết đổi trả',
            parentRoute: 'orders',
            parentBreadcrumb: 'Đơn hàng của bé',
            modulePath: 'modules/orders/return-detail.html',
            moduleScript: 'modules/orders/return-detail.js',
            moduleCss: 'modules/orders/return-detail.css',
            sidebarId: 'nav-orders'
        },
        'wishlist': {
            title: 'Sản phẩm yêu thích - PawPal',
            breadcrumb: 'Yêu thích',
            modulePath: 'modules/wishlist/wishlist.html',
            moduleScript: 'modules/wishlist/wishlist.js',
            moduleCss: 'modules/wishlist/wishlist.css',
            sidebarId: 'nav-wishlist'
        },
        'loyalty': {
            title: 'Paw Points - PawPal',
            breadcrumb: 'Paw Points',
            modulePath: 'modules/loyalty/loyalty.html',
            moduleScript: 'modules/loyalty/loyalty.js',
            moduleCss: 'modules/loyalty/loyalty.css',
            sidebarId: 'nav-loyalty'
        },
        'support': {
            title: 'Yêu cầu hỗ trợ - PawPal',
            breadcrumb: 'Hỗ trợ',
            modulePath: 'modules/support/support.html',
            moduleScript: 'modules/support/support.js',
            moduleCss: 'modules/support/support.css',
            sidebarId: 'nav-support',
            aliases: ['support-tickets']
        },
        'support-create': {
            title: 'Gửi yêu cầu hỗ trợ - PawPal',
            breadcrumb: 'Gửi yêu cầu mới',
            parentRoute: 'support',
            parentBreadcrumb: 'Hỗ trợ',
            modulePath: 'modules/support/support-create.html',
            moduleScript: 'modules/support/support-create.js',
            moduleCss: 'modules/support/support.css',
            sidebarId: 'nav-support'
        }
    };

    // Tìm route chuẩn từ hash hoặc alias
    function resolveRoute(hashStr) {
        if (!hashStr) return 'profile';
        const clean = hashStr.replace(/^#\/?/, '').split('?')[0].toLowerCase();
        if (ROUTE_CONFIG[clean]) return clean;

        for (const [key, conf] of Object.entries(ROUTE_CONFIG)) {
            if (conf.aliases && conf.aliases.includes(clean)) {
                return key;
            }
        }
        return 'profile';
    }

    // 3. Trình nạp CSS động
    function loadModuleCss(cssHref) {
        const existingLink = document.getElementById('dynamic-user-module-css');
        if (existingLink) existingLink.remove();

        if (!cssHref) return;
        const fullHref = (cssHref.startsWith('/') ? cssHref : `/pages/user/${cssHref}`) + '?v=' + Date.now();
        const link = document.createElement('link');
        link.id = 'dynamic-user-module-css';
        link.rel = 'stylesheet';
        link.href = fullHref;
        document.head.appendChild(link);
    }

    // 4. Trình nạp Script động
    async function loadModuleScript(scriptSrc, isModule = false) {
        const existingScript = document.getElementById('dynamic-user-module-script');
        if (existingScript) existingScript.remove();

        if (!scriptSrc) return;
        const fullSrc = (scriptSrc.startsWith('/') ? scriptSrc : `/pages/user/${scriptSrc}`) + '?v=' + Date.now();
        if (isModule) {
            try {
                const mod = await import(fullSrc);
                if (mod && typeof mod.init === 'function') {
                    await mod.init();
                }
                return;
            } catch (err) {
                console.warn('[user.js] dynamic import fallback to script tag:', err);
            }
        }
        const script = document.createElement('script');
        script.id = 'dynamic-user-module-script';
        if (isModule) script.type = 'module';
        script.src = fullSrc;
        document.body.appendChild(script);
    }

    // 5. Cập nhật Breadcrumb & Title
    function updateBreadcrumb(routeKey, subTitle = '') {
        const config = ROUTE_CONFIG[routeKey] || ROUTE_CONFIG['profile'];
        const list = document.getElementById('userBreadcrumbList');
        if (!list) return;

        if (config.parentRoute) {
            let currentText = subTitle;
            if (!currentText) {
                const hash = window.location.hash || '';
                const qIdx = hash.indexOf('?');
                if (qIdx !== -1) {
                    const params = new URLSearchParams(hash.substring(qIdx + 1));
                    const id = params.get('id') || params.get('orderId') || params.get('bookingId');
                    if (id) {
                        currentText = id.startsWith('#') ? id : '#' + id;
                    }
                } else if (window.location.search) {
                    const params = new URLSearchParams(window.location.search);
                    const id = params.get('id') || params.get('orderId') || params.get('bookingId');
                    if (id) {
                        currentText = id.startsWith('#') ? id : '#' + id;
                    }
                }
            }
            if (!currentText) currentText = config.breadcrumb;

            document.title = `${currentText} - ${config.parentBreadcrumb} - PawPal`;
            list.innerHTML = `
                <li class="breadcrumb-item"><a href="/pages/public/landing/landing.html">Trang chủ</a></li>
                <li class="breadcrumb-item"><a href="#${config.parentRoute}" class="breadcrumb-parent-link">${config.parentBreadcrumb}</a></li>
                <li class="breadcrumb-item active" id="userBreadcrumbCurrent">${String(currentText).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>
            `;
            const parentLink = list.querySelector('.breadcrumb-parent-link');
            if (parentLink) {
                parentLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (window.location.hash === `#${config.parentRoute}`) {
                        window.dispatchEvent(new HashChangeEvent('hashchange'));
                    } else {
                        window.location.hash = `#${config.parentRoute}`;
                    }
                });
            }
        } else if (subTitle) {
            document.title = `${subTitle} - ${config.breadcrumb} - PawPal`;
            list.innerHTML = `
                <li class="breadcrumb-item"><a href="/pages/public/landing/landing.html">Trang chủ</a></li>
                <li class="breadcrumb-item"><a href="#${routeKey}" class="breadcrumb-parent-link">${config.breadcrumb}</a></li>
                <li class="breadcrumb-item active" id="userBreadcrumbCurrent">${String(subTitle).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>
            `;
            const parentLink = list.querySelector('.breadcrumb-parent-link');
            if (parentLink) {
                parentLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (routeKey === 'diary' && typeof window.pawpalShowDiaryDashboard === 'function') {
                        window.pawpalShowDiaryDashboard();
                    } else if (routeKey === 'pets' && typeof window.switchToPetListScreen === 'function') {
                        window.switchToPetListScreen();
                    } else if (routeKey === 'orders' && typeof window.pawpalShowOrderList === 'function') {
                        window.pawpalShowOrderList();
                    } else if (routeKey === 'bookings' && typeof window.pawpalShowBookingList === 'function') {
                        window.pawpalShowBookingList();
                    } else {
                        if (window.location.hash === `#${routeKey}`) {
                            window.dispatchEvent(new HashChangeEvent('hashchange'));
                        } else {
                            window.location.hash = `#${routeKey}`;
                        }
                    }
                });
            }
        } else {
            document.title = config.title;
            list.innerHTML = `
                <li class="breadcrumb-item"><a href="/pages/public/landing/landing.html">Trang chủ</a></li>
                <li class="breadcrumb-item active" id="userBreadcrumbCurrent">${config.breadcrumb}</li>
            `;
        }
    }

    window.setUserSubBreadcrumb = function(subTitle, routeKey = 'diary') {
        updateBreadcrumb(routeKey, subTitle);
    };

    // 6. Highlight active menu item trong User Sidebar
    function highlightActiveSidebar(routeKey) {
        const config = ROUTE_CONFIG[routeKey];
        if (!config) return;

        const sidebarLinks = document.querySelectorAll('#user-sidebar .sidebar-link');
        sidebarLinks.forEach(link => link.classList.remove('active'));

        let targetLink = null;
        if (config.sidebarId) {
            targetLink = document.getElementById(config.sidebarId);
        }

        if (!targetLink) {
            sidebarLinks.forEach(link => {
                const href = (link.getAttribute('href') || '').toLowerCase();
                if (href.includes(routeKey) || (config.aliases && config.aliases.some(al => href.includes(al)))) {
                    targetLink = link;
                }
            });
        }

        if (targetLink) {
            targetLink.classList.add('active');
        }
    }

    // 7. Hàm chính: Tải module
    async function loadModule(routeKey) {
        const contentContainer = document.getElementById('userAppContent');
        if (!contentContainer) return;

        const config = ROUTE_CONFIG[routeKey] || ROUTE_CONFIG['profile'];
        updateBreadcrumb(routeKey);
        highlightActiveSidebar(routeKey);

        // Nạp trực tiếp module chuẩn từ modules/ để tránh hiện tượng tải 2 bước
        if (config.modulePath) {
            try {
                const fullModuleUrl = (config.modulePath.startsWith('/') ? config.modulePath : `/pages/user/${config.modulePath}`) + `?v=${Date.now()}`;
                const res = await fetch(fullModuleUrl);
                if (res.ok) {
                    const html = await res.text();
                    contentContainer.innerHTML = `<div class="user-module-view">${html}</div>`;
                    if (config.moduleCss) loadModuleCss(config.moduleCss);
                    if (config.moduleScript) await loadModuleScript(config.moduleScript, true);
                    if (window.lucide) window.lucide.createIcons();
                    return;
                }
            } catch (e) {
                console.error(`[user.js] Lỗi nạp module ${config.modulePath}:`, e);
            }
        }

        // Trường hợp không tìm thấy
        contentContainer.innerHTML = `
            <div class="card p-5 text-center border-0 shadow-sm rounded-4">
                <h4 class="text-danger mb-2">Phân hệ đang được hoàn thiện</h4>
                <p class="text-muted">Chúng tôi đang cập nhật phân hệ ${config.breadcrumb}. Vui lòng quay lại sau.</p>
                <div><a href="#profile" class="btn btn-outline-success btn-sm px-3">Quay lại tổng quan</a></div>
            </div>
        `;
    }

    // 8. Quản lý Slide-In Detail Drawer (Xem chi tiết tại chỗ)
    const detailDrawer = document.getElementById('userDetailDrawer');
    const detailDrawerBackdrop = document.getElementById('userDetailDrawerBackdrop');
    const detailDrawerBody = document.getElementById('userDetailDrawerBody');
    const drawerTitleEl = document.getElementById('drawerHeaderTitle');
    const btnDrawerClose = document.getElementById('btnUserDrawerClose');

    async function openDetailDrawer(type, id) {
        if (!detailDrawer || !detailDrawerBody) return;

        document.body.classList.add('user-drawer-open');
        if (detailDrawerBackdrop) detailDrawerBackdrop.hidden = false;

        detailDrawerBody.innerHTML = `
            <div class="user-module-loading-box">
                <div class="spinner-border text-success" role="status"></div>
                <p class="mt-3 text-muted">Đang tải thông tin chi tiết...</p>
            </div>
        `;

        if (type === 'order') {
            if (drawerTitleEl) drawerTitleEl.textContent = `Chi tiết đơn hàng #${id}`;
            try {
                const res = await fetch(`/pages/user/modules/orders/order-detail.html?v=${Date.now()}`);
                if (res.ok) {
                    const text = await res.text();
                    const doc = new DOMParser().parseFromString(text, 'text/html');
                    const mainContent = doc.querySelector('.order-detail-main') || doc.body;
                    detailDrawerBody.innerHTML = mainContent.innerHTML;

                    // Tải CSS chi tiết đơn hàng
                    loadModuleCss('/pages/user/modules/orders/order-detail.css');

                    // Thiết lập URL param ảo cho order-detail.js đọc đúng mã đơn
                    window.history.replaceState(null, '', `?id=${encodeURIComponent(id)}`);

                    // Nạp script chi tiết đơn hàng
                    await loadModuleScript('/pages/user/modules/orders/order-detail.js', true);
                    if (window.lucide) window.lucide.createIcons();
                }
            } catch (err) {
                console.error('[user.js] Lỗi tải chi tiết đơn hàng:', err);
                detailDrawerBody.innerHTML = '<div class="alert alert-danger p-3">Không thể tải thông tin đơn hàng này.</div>';
            }
        } else if (type === 'booking') {
            if (drawerTitleEl) drawerTitleEl.textContent = `Chi tiết lịch hẹn #${id}`;
            try {
                const res = await fetch(`/pages/user/modules/bookings/booking-detail.html?v=${Date.now()}`);
                if (res.ok) {
                    const text = await res.text();
                    const doc = new DOMParser().parseFromString(text, 'text/html');
                    const mainContent = doc.querySelector('.booking-detail-content') || doc.body;
                    detailDrawerBody.innerHTML = mainContent.innerHTML;

                    // Tải CSS chi tiết lịch hẹn
                    loadModuleCss('/pages/user/modules/bookings/booking-detail.css');

                    window.history.replaceState(null, '', `?id=${encodeURIComponent(id)}`);
                    await loadModuleScript('/pages/user/modules/bookings/booking-detail.js', true);
                    if (window.lucide) window.lucide.createIcons();
                }
            } catch (err) {
                console.error('[user.js] Lỗi tải chi tiết lịch hẹn:', err);
                detailDrawerBody.innerHTML = '<div class="alert alert-danger p-3">Không thể tải thông tin lịch hẹn này.</div>';
            }
        }
    }

    function closeDetailDrawer() {
        document.body.classList.remove('user-drawer-open');
        if (detailDrawerBackdrop) detailDrawerBackdrop.hidden = true;

        // Xóa query param tạm thời trong URL
        const cleanUrl = window.location.pathname + window.location.hash.split('?')[0];
        window.history.replaceState(null, '', cleanUrl);
    }

    if (btnDrawerClose) btnDrawerClose.addEventListener('click', closeDetailDrawer);
    if (detailDrawerBackdrop) detailDrawerBackdrop.addEventListener('click', closeDetailDrawer);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('user-drawer-open')) {
            closeDetailDrawer();
        }
    });

    // 9. Bắt sự kiện click xem chi tiết đơn hàng / lịch hẹn trên toàn trang
    function attachDetailClickInterceptors() {
        const appContent = document.getElementById('userAppContent');
        if (!appContent) return;

        appContent.addEventListener('click', function (e) {
            // Xem chi tiết đơn hàng
            const orderLink = e.target.closest('a[href*="order-detail.html"]');
            if (orderLink) {
                const href = orderLink.getAttribute('href') || '';
                const match = href.match(/[?&]id=([^&#]+)/);
                if (match) {
                    e.preventDefault();
                    e.stopPropagation();
                    const orderId = decodeURIComponent(match[1]);
                    window.location.hash = `#order-detail?id=${encodeURIComponent(orderId)}`;
                    return;
                }
            }

            // Xem chi tiết lịch hẹn
            const bookingLink = e.target.closest('a[href*="booking-detail.html"]');
            if (bookingLink) {
                const href = bookingLink.getAttribute('href') || '';
                const match = href.match(/[?&]id=([^&#]+)/);
                if (match) {
                    e.preventDefault();
                    e.stopPropagation();
                    const bookingId = decodeURIComponent(match[1]);
                    window.location.hash = `#booking-detail?id=${encodeURIComponent(bookingId)}`;
                    return;
                }
            }
        });
    }

    // 10. Chặn click trên Sidebar để điều hướng mượt bằng Hash
    function attachSidebarInterceptors() {
        const sidebarContainer = document.getElementById('user-sidebar');
        if (!sidebarContainer) return;

        sidebarContainer.addEventListener('click', function (e) {
            const link = e.target.closest('.sidebar-link');
            if (!link) return;

            const href = link.getAttribute('href');
            if (!href || href === '#' || href.startsWith('javascript:')) return;

            // Kiểm tra nếu là link đăng xuất thì không chặn
            if (link.id === 'nav-logout' || href.includes('logout')) return;

            e.preventDefault();

            // Đóng drawer chi tiết nếu đang mở
            closeDetailDrawer();

            // Tìm route tương ứng với link
            let matchedRoute = 'profile';
            const lowerHref = href.toLowerCase();
            const linkTab = link.getAttribute('data-tab');

            if (linkTab === 'security' || lowerHref.includes('settings')) {
                matchedRoute = 'settings';
            } else if (lowerHref.includes('pet-profile') || lowerHref.includes('pet')) {
                matchedRoute = 'pets';
            } else if (lowerHref.includes('pet-diary') || lowerHref.includes('diary')) {
                matchedRoute = 'diary';
            } else if (lowerHref.includes('booking')) {
                matchedRoute = 'bookings';
            } else if (lowerHref.includes('order')) {
                matchedRoute = 'orders';
            } else if (lowerHref.includes('wishlist')) {
                matchedRoute = 'wishlist';
            } else if (lowerHref.includes('loyalty')) {
                matchedRoute = 'loyalty';
            } else if (lowerHref.includes('support')) {
                matchedRoute = 'support';
            }

            // Đổi URL Hash
            window.location.hash = `#${matchedRoute}`;

            // Đóng menu mobile nếu đang mở
            document.body.classList.remove('user-sidebar-open', 'dashboard-sidebar-open');
            const backdrop = document.getElementById('userSidebarBackdrop');
            if (backdrop) backdrop.hidden = true;
        });
    }

    // 11. Xử lý mở/đóng Sidebar trên Mobile
    function initMobileSidebar() {
        const toggleBtn = document.getElementById('userSidebarToggle');
        const backdrop = document.getElementById('userSidebarBackdrop');
        const closeBtn = document.getElementById('userSidebarClose');
        if (!toggleBtn) return;

        const setOpen = (open) => {
            document.body.classList.toggle('user-sidebar-open', open);
            document.body.classList.toggle('dashboard-sidebar-open', open);
            if (backdrop) backdrop.hidden = !open;
            toggleBtn.setAttribute('aria-expanded', String(open));
        };

        toggleBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            setOpen(!document.body.classList.contains('user-sidebar-open'));
        };

        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                setOpen(false);
            };
        }

        if (backdrop) {
            backdrop.onclick = (e) => {
                e.preventDefault();
                setOpen(false);
            };
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && document.body.classList.contains('user-sidebar-open')) {
                setOpen(false);
            }
        });
    }

    // 12. Lắng nghe thay đổi Hash và Khởi chạy SPA
    function initRouter() {
        const handleRoute = () => {
            const rawHash = window.location.hash;
            const route = resolveRoute(rawHash);
            sessionStorage.setItem('pawpal_user_active_tab', route);
            loadModule(route);
        };

        window.addEventListener('hashchange', handleRoute);

        // Khởi động lần đầu
        const initialHash = window.location.hash || sessionStorage.getItem('pawpal_user_active_tab');
        if (initialHash) {
            if (!window.location.hash && initialHash) {
                window.location.hash = initialHash.startsWith('#') ? initialHash : `#${initialHash}`;
            } else {
                handleRoute();
            }
        } else {
            window.location.hash = '#profile';
        }
    }

    // 13. Đợi DOM và User-Sidebar sẵn sàng
    function startUserPortal() {
        initMobileSidebar();
        attachDetailClickInterceptors();
        initRouter();

        // Kiểm tra định kỳ xem components.js đã inject sidebar chưa
        const checkSidebarInterval = setInterval(() => {
            const links = document.querySelectorAll('#user-sidebar .sidebar-link');
            if (links.length > 0) {
                clearInterval(checkSidebarInterval);
                attachSidebarInterceptors();
                const currentRoute = resolveRoute(window.location.hash);
                highlightActiveSidebar(currentRoute);
            }
        }, 100);

        setTimeout(() => clearInterval(checkSidebarInterval), 5000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startUserPortal);
    } else {
        startUserPortal();
    }

})();
