/**
 * user.js - Bộ điều phối Single-Page Application (SPA Module Router) cho PawPal User Portal
 */

(async function () {
    let pageLeaving=false;
    window.addEventListener('pagehide',()=>{pageLeaving=true;});
    window.addEventListener('beforeunload',()=>{pageLeaving=true;});
    let redirecting = false;
    function requireLogin() {
        if (redirecting) return false;
        redirecting = true;
        try { sessionStorage.removeItem('pawpal_current_user'); } catch (e) {}
        try { localStorage.removeItem('pawpal_current_user'); } catch (e) {}
        const loc = typeof window !== 'undefined' ? window.location : (typeof location !== 'undefined' ? location : {});
        try { sessionStorage.setItem('pawpal_redirect_after_login', (loc.pathname || '') + (loc.search || '') + (loc.hash || '')); } catch (e) {}
        if (loc) {
            loc.href = '/login';
            if (typeof loc.replace === 'function') {
                try { loc.replace('/login'); } catch (e) {}
            }
        }
        return false;
    }
    // 1. Kiểm tra trạng thái đăng nhập & Bảo vệ cô lập 2 chiều
    function checkAuth() {
        let currentUser = null;
        try {
            currentUser = JSON.parse(localStorage.getItem('pawpal_current_user'));
        } catch(e) {}

        if (!currentUser) {
            return requireLogin();
        }

        if (currentUser.status === 'da_khoa' || currentUser.account_status === 'da_khoa' || currentUser.customer_status === 'locked' || currentUser.customer_status === 'da_khoa') {
            localStorage.removeItem('pawpal_current_user');
            sessionStorage.removeItem('pawpal_current_user');
            if (typeof alert === 'function') alert('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ bộ phận chăm sóc khách hàng.');
            const loc = typeof window !== 'undefined' ? window.location : location;
            if (loc) loc.href = '/login?reason=account-locked';
            return false;
        }

        if (currentUser.is_temporary) {
            if (typeof window !== 'undefined' && window.location) {
                window.location.href = `/login?action=guest-activate&phone=${encodeURIComponent(currentUser.phone || '')}`;
            }
            return false;
        }

        // BẢO VỆ CÔ LẬP 2 CHIỀU: Chặn tuyệt đối tài khoản Quản trị / Nhân sự truy cập Cổng Khách hàng
        if (currentUser.system_role === 'ADMIN' || currentUser.system_role === 'STAFF' || currentUser.system_role === 'MANAGER' || currentUser.role === 'admin' || currentUser.role === 'staff') {
            localStorage.removeItem('pawpal_current_user');
            sessionStorage.removeItem('pawpal_current_user');
            if (typeof alert === 'function') alert('Tài khoản công vụ Quản trị viên / Nhân sự không được phép truy cập Cổng Khách hàng. Hệ thống sẽ chuyển hướng bạn về Cổng Quản trị.');
            if (typeof window !== 'undefined' && window.location) window.location.href = '/admin/login';
            return false;
        }

        if (currentUser.role && currentUser.role !== 'customer') {
            localStorage.removeItem('pawpal_current_user');
            sessionStorage.removeItem('pawpal_current_user');
            if (typeof window !== 'undefined' && window.location) window.location.href = '/login';
            return false;
        }

        return true;
    }

    if (!checkAuth()) return;
    if (typeof document !== 'undefined') {
        document.addEventListener('click', event => {
            if (!checkAuth()) { event.preventDefault(); event.stopImmediatePropagation(); }
        }, true);
        document.addEventListener('submit', event => {
            if (!checkAuth()) { event.preventDefault(); event.stopImmediatePropagation(); }
        }, true);
    }
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('storage', event => {
            if (event.storageArea === localStorage && (!event.key || event.key === 'pawpal_current_user')) checkAuth();
        });
        window.addEventListener('focus', checkAuth);
        window.addEventListener('pageshow', checkAuth);
    }
    
    function currentOwner() {
        try { return String(JSON.parse(localStorage.getItem('pawpal_current_user'))?.id || ''); }
        catch { return ''; }
    }
    const portalOwner = currentOwner();
    async function verifyPortalOwner() {
        if (!portalOwner || !window.PawpalCustomerAuth?.request) return requireLogin();
        try {
            const result = await window.PawpalCustomerAuth.request('me', {}, true);
            const verifiedUser = result?.user || {};
            const verifiedStatus = verifiedUser.account_status || verifiedUser.status || verifiedUser.customer_status;
            if (verifiedStatus === 'da_khoa' || verifiedStatus === 'locked') {
                localStorage.removeItem('pawpal_current_user');
                sessionStorage.removeItem('pawpal_current_user');
                alert('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ bộ phận hỗ trợ khách hàng.');
                window.location.replace('/login?reason=account-locked');
                return false;
            }
            if (!checkAuth()) return false;
            if (currentOwner() !== portalOwner) {
                window.location.reload();
                return false;
            }
            if (String(verifiedUser.id) !== portalOwner) return requireLogin();
            // The authenticated /me response refreshes the profile, not the Supabase session.
            const profile = JSON.stringify(window.PawpalCustomerAuth.cleanUser(verifiedUser));
            localStorage.setItem('pawpal_current_user', profile);
            sessionStorage.setItem('pawpal_current_user', profile);
            return true;
        } catch (err) {
            if(pageLeaving)return false;
            console.warn('[UserPortal] Không thể xác nhận phiên khách hàng:', err.message);
            localStorage.removeItem('pawpal_current_user');
            sessionStorage.removeItem('pawpal_current_user');
            return requireLogin();
        }
    }
    const verified = verifyPortalOwner();

    const { createLatestRenderer } = await import('/scripts/shared/latest-render.mjs');
    const moduleRenderer = createLatestRenderer();
    // Session-only previews never cross an authenticated customer boundary.
    const moduleHtmlCache = new Map();
    const routePreviewCache = new Map();
    let displayedRouteKey = null;
    const assetVersion = 'account-20261124-customer-loading';
    function routeCacheKey(routeKey) {
        return `${portalOwner}:${routeKey}:${window.location.hash.split('?')[1] || ''}`;
    }

    function loadModuleHtml(path) {
        const url = (path.startsWith('/') ? path : '/pages/user/' + path) + '?v=' + assetVersion;
        if (!moduleHtmlCache.has(url)) {
            const pending = fetch(url).then(response => {
                if (!response.ok) throw new Error('Không thể tải nội dung tài khoản.');
                return response.text();
            }).catch(error => { moduleHtmlCache.delete(url); throw error; });
            moduleHtmlCache.set(url, pending);
        }
        return moduleHtmlCache.get(url);
    }

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
        const clean = hashStr.replace(/^#\/?/, '').split('?')[0].split('/')[0].toLowerCase();
        if (clean === 'notifications') {
            if (typeof window.openAllNotificationsModal === 'function') {
                setTimeout(() => window.openAllNotificationsModal(), 50);
            }
            const prev = sessionStorage.getItem('pawpal_user_active_tab') || 'profile';
            return prev !== 'notifications' ? prev : 'profile';
        }
        if (ROUTE_CONFIG[clean]) return clean;

        for (const [key, conf] of Object.entries(ROUTE_CONFIG)) {
            if (conf.aliases && conf.aliases.includes(clean)) {
                return key;
            }
        }
        return 'profile';
    }

    // 3. Trình nạp CSS động
    const preloaded = new Set();
    function preloadRouteAssets(routeKey) {
        const config = ROUTE_CONFIG[routeKey];
        const connection = navigator.connection;
        if (!config || connection?.saveData || /2g/.test(connection?.effectiveType || '')) return;
        loadModuleHtml(config.modulePath).catch(() => {});
        for (const [path, rel, as] of [[config.moduleCss, 'preload', 'style'], [config.moduleScript, 'modulepreload']]) {
            if (!path || preloaded.has(path)) continue;
            preloaded.add(path);
            const link = document.createElement('link');
            link.rel = rel;
            if (as) link.as = as;
            link.href = '/pages/user/' + path + '?v=' + assetVersion;
            link.addEventListener('error', () => { preloaded.delete(path); link.remove(); }, {once:true});
            document.head.appendChild(link);
        }
    }

    let cancelPendingStyle;
    function loadModuleCss(cssHref) {
        const existingLink = document.getElementById('dynamic-user-module-css');
        cancelPendingStyle?.();
        if (!cssHref) {
            if (existingLink) existingLink.remove();
            return Promise.resolve();
        }
        const fullHref = (cssHref.startsWith('/') ? cssHref : `/pages/user/${cssHref}`) + '?v=' + assetVersion;
        if (existingLink?.getAttribute('href') === fullHref) return Promise.resolve();
        const link = document.createElement('link');
        link.id = 'dynamic-user-module-css-pending';
        link.rel = 'stylesheet';
        link.href = fullHref;
        return new Promise((resolve, reject) => {
            cancelPendingStyle = () => {
                link.remove();
                cancelPendingStyle = null;
                resolve();
            };
            link.addEventListener('load', () => {
                if (!link.isConnected) return;
                cancelPendingStyle = null;
                if (existingLink) existingLink.remove();
                link.id = 'dynamic-user-module-css';
                resolve();
            }, { once: true });
            link.addEventListener('error', () => {
                if (!link.isConnected) return;
                cancelPendingStyle = null;
                link.remove();
                reject(new Error(`Không thể tải giao diện module: ${cssHref}`));
            }, { once: true });
            document.head.appendChild(link);
        });
    }

    // 4. Trình nạp Script động
    let activeModuleDispose;
    async function loadModuleScript(scriptSrc, ticket) {
        const existingScript = document.getElementById('dynamic-user-module-script');
        if (existingScript) existingScript.remove();

        if (!scriptSrc) return;
        const fullSrc = (scriptSrc.startsWith('/') ? scriptSrc : `/pages/user/${scriptSrc}`) + '?v=' + assetVersion;
        const mod = await import(fullSrc);
        if (!moduleRenderer.isCurrent(ticket) || currentOwner() !== portalOwner) return;
        activeModuleDispose = typeof mod.dispose === 'function' ? mod.dispose : null;
        if (typeof mod.init === 'function') await mod.init();
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
        if (currentOwner() !== portalOwner) return;
        const ticket = moduleRenderer.begin();
        const contentContainer = document.getElementById('userAppContent');
        if (!contentContainer) return;
        preloadRouteAssets(routeKey);
        if (displayedRouteKey && contentContainer.getAttribute('aria-busy') !== 'true') {
            const view = contentContainer.querySelector('.user-module-view');
            // Never retain passwords or an unfinished edit form in a preview.
            if (view && !view.querySelector('input[type="password"], form, #ordersSkeleton, #bookingsSkeleton')) {
                routePreviewCache.delete(displayedRouteKey);
                routePreviewCache.set(displayedRouteKey, { view:view.cloneNode(true), savedAt:Date.now() });
                if (routePreviewCache.size > 6) routePreviewCache.delete(routePreviewCache.keys().next().value);
            }
        }
        activeModuleDispose?.();
        activeModuleDispose = null;
        const nextRouteKey = routeCacheKey(routeKey);
        displayedRouteKey = nextRouteKey;
        document.getElementById('userRoutePreview')?.remove();
        const cachedPreview = routePreviewCache.get(nextRouteKey);
        let preview;
        if (cachedPreview && Date.now() - cachedPreview.savedAt < 60000) {
            preview = cachedPreview.view.cloneNode(true);
            preview.id = 'userRoutePreview';
            preview.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'));
            preview.setAttribute('aria-hidden', 'true');
            preview.inert = true;
            preview.style.cssText = 'position:absolute;inset:0;z-index:2;background:white;pointer-events:none';
        }

        const config = ROUTE_CONFIG[routeKey] || ROUTE_CONFIG['profile'];
        updateBreadcrumb(routeKey);
        highlightActiveSidebar(routeKey);
        contentContainer.setAttribute('aria-busy', 'true');
        contentContainer.innerHTML = `<div class="user-route-skeleton" role="status" aria-label="Đang tải nội dung">
            <div class="pawpal-skeleton" style="width:38%;height:28px"></div>
            <div class="user-route-skeleton-stats">${Array.from({ length: 3 }, () => `<div class="user-route-skeleton-panel" aria-hidden="true"><div class="pawpal-skeleton" style="width:50%;height:24px"></div><div class="pawpal-skeleton" style="width:75%;height:14px"></div></div>`).join('')}</div>
            <div class="user-route-skeleton-panel" aria-hidden="true">${Array.from({ length: 5 }, () => `<div class="user-route-skeleton-row"><div class="pawpal-skeleton" style="width:65%;height:18px"></div><div class="pawpal-skeleton" style="width:20%;height:18px"></div></div>`).join('')}</div>
        </div>`;
        if (preview) contentContainer.appendChild(preview);

        // Nạp trực tiếp module chuẩn từ modules/ để tránh hiện tượng tải 2 bước
        if (config.modulePath) {
            try {
                {
                    const html = await loadModuleHtml(config.modulePath);
                    if (!moduleRenderer.isCurrent(ticket)) return;
                    if (config.moduleCss) await loadModuleCss(config.moduleCss);
                    if (!moduleRenderer.isCurrent(ticket)) return;
                    await moduleRenderer.commit(ticket, async () => {
                        contentContainer.innerHTML = `<div class="user-module-view">${html}</div>`;
                        if (preview) contentContainer.appendChild(preview);
                        if (routeKey === 'pets') {
                            const petParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
                            const hasPetDeepLink = petParams.get('action') === 'create'
                                || Boolean(petParams.get('id') || petParams.get('edit'));
                            if (hasPetDeepLink) {
                                contentContainer.querySelector('#petListView')?.classList.add('d-none');
                                contentContainer.querySelector('#petDetailView')?.classList.remove('d-none');
                            }
                        }
                        if (config.moduleScript) await loadModuleScript(config.moduleScript, ticket);
                        if (moduleRenderer.isCurrent(ticket)) {
                            contentContainer.setAttribute('aria-busy', 'false');
                            preview?.remove();
                            contentContainer.querySelector('.user-module-view')?.classList.add('user-route-ready');
                            if (window.lucide) window.lucide.createIcons();
                        }
                    });
                    return;
                }
            } catch (e) {
                console.error(`[user.js] Lỗi nạp module ${config.modulePath}:`, e);
            }
        }

        // Trường hợp không tìm thấy
        await moduleRenderer.commit(ticket, () => {
            contentContainer.setAttribute('aria-busy', 'false');
            contentContainer.innerHTML = `
            <div class="card p-5 text-center border-0 shadow-sm rounded-4" role="status">
                <h4 class="text-danger mb-2">Không thể tải nội dung</h4>
                <p class="text-muted">Vui lòng tải lại trang hoặc chọn phân hệ khác.</p>
                <div><a href="#profile" class="btn btn-outline-success btn-sm px-3">Quay lại tổng quan</a></div>
            </div>
        `; });
    }

    // 8. Quản lý Slide-In Detail Drawer (Xem chi tiết tại chỗ)
    const detailDrawer = document.getElementById('userDetailDrawer');
    const detailDrawerBackdrop = document.getElementById('userDetailDrawerBackdrop');
    const detailDrawerBody = document.getElementById('userDetailDrawerBody');
    const drawerTitleEl = document.getElementById('drawerHeaderTitle');
    const btnDrawerClose = document.getElementById('btnUserDrawerClose');

    let drawerRequest = 0;
    async function openDetailDrawer(type, id) {
        if (!detailDrawer || !detailDrawerBody) return;
        const ticket = ++drawerRequest;
        document.body.classList.add('user-drawer-open');
        detailDrawer.setAttribute('aria-hidden', 'false');
        detailDrawerBackdrop.hidden = false;
        drawerTitleEl.textContent = type === 'order' ? 'Tóm tắt đơn hàng' : 'Tóm tắt lịch hẹn';
        detailDrawerBody.setAttribute('aria-busy', 'true');
        detailDrawerBody.innerHTML = `<div role="status" aria-label="Đang tải thông tin chi tiết">${Array.from({length:3},()=>'<div class="user-drawer-skeleton-card"><div class="pawpal-skeleton" style="width:65%;height:20px"></div><div class="pawpal-skeleton" style="width:100%;height:64px"></div></div>').join('')}</div>`;
        try {
            const { API } = await import('/scripts/api/api.js');
            const user = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            if (!user) throw new Error('Vui lòng đăng nhập.');
            const items = type === 'order' ? await API.getUserOrders(user.id, {id}) : await API.getUserBookings(user, {id});
            if (ticket !== drawerRequest) return;
            const item = items.find(row => [row.id, row.code, row._supabaseId, row.order_code, row.appointment_code].some(value => String(value) === String(id)));
            if (!item) throw new Error('Không tìm thấy thông tin.');
            const content = document.createElement('div');
            content.className = 'user-route-ready';
            const rows = type === 'order'
                ? [['Mã đơn', item.id], ['Trạng thái', ({pending:'Chờ xác nhận',confirmed:'Đã xác nhận',shipping:'Đang giao',delivered:'Đã giao',completed:'Hoàn thành',cancelled:'Đã hủy'})[item.status] || 'Đang xử lý'], ['Tổng tiền', new Intl.NumberFormat('vi-VN', {style:'currency',currency:'VND'}).format(item.pricing?.total ?? item.total ?? 0)], ...((item.products || item.items || []).map(product => [product.name || product.title || 'Sản phẩm', `Số lượng: ${product.quantity || 1}`]))]
                : [['Mã lịch hẹn', item.id], ['Bé cưng', item.petName], ['Dịch vụ', item.serviceName || item.service], ['Ngày hẹn', item.date], ['Giờ hẹn', item.timeStart || item.time]];
            rows.forEach(([label, value]) => {
                const row = document.createElement('p');
                const heading = document.createElement('strong');
                heading.textContent = label + ': ';
                row.append(heading, document.createTextNode(String(value ?? '—')));
                content.append(row);
            });
            detailDrawerBody.replaceChildren(content);
        } catch (error) {
            if (ticket !== drawerRequest) return;
            const status = document.createElement('p');
            status.setAttribute('role', 'status');
            status.textContent = error.message || 'Không thể tải thông tin. Vui lòng thử lại.';
            detailDrawerBody.replaceChildren(status);
        } finally {
            if (ticket === drawerRequest) detailDrawerBody.setAttribute('aria-busy', 'false');
        }
    }
    function closeDetailDrawer() {
        ++drawerRequest;
        document.body.classList.remove('user-drawer-open');
        detailDrawer?.setAttribute('aria-hidden', 'true');
        detailDrawerBody?.setAttribute('aria-busy', 'false');
        if (detailDrawerBackdrop) detailDrawerBackdrop.hidden = true;
    }
    document.addEventListener('click', event => {
        const button = event.target.closest('[data-open-detail-drawer]');
        if (!button) return;
        const params = new URLSearchParams(window.location.hash.split('?')[1] || window.location.search);
        const id = params.get('id') || params.get('orderId') || params.get('bookingId');
        if (id) openDetailDrawer(button.dataset.openDetailDrawer, id);
    });

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

        let intentTimer;
        const warmLink = event => {
            clearTimeout(intentTimer);
            const link = event.target.closest('.sidebar-link');
            const route = Object.keys(ROUTE_CONFIG).find(key => !ROUTE_CONFIG[key].parentRoute && ROUTE_CONFIG[key].sidebarId === link?.id);
            if (route && route !== resolveRoute(window.location.hash)) intentTimer = setTimeout(() => preloadRouteAssets(route), 150);
        };
        sidebarContainer.addEventListener('pointerover', warmLink);
        sidebarContainer.addEventListener('pointerleave', () => clearTimeout(intentTimer));
        sidebarContainer.addEventListener('focusin', warmLink);
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
            } else if (lowerHref.includes('diary')) {
                matchedRoute = 'diary';
            } else if (lowerHref.includes('pet')) {
                matchedRoute = 'pets';
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
            const rawHash = window.location.hash || '';
            if (rawHash.includes('notifications')) {
                if (typeof window.openAllNotificationsModal === 'function') {
                    window.openAllNotificationsModal();
                }
            }
            const route = resolveRoute(rawHash);
            sessionStorage.setItem('pawpal_user_active_tab', route);
            loadModule(route);
        };

        window.addEventListener('hashchange', handleRoute);

        // Khởi động trực tiếp phân hệ mục tiêu ngay lập tức
        const targetRoute = resolveRoute(window.location.hash || sessionStorage.getItem('pawpal_user_active_tab') || 'profile');
        let routeQuery = window.location.hash.includes('?') ? window.location.hash.slice(window.location.hash.indexOf('?')) : '';
        if (!routeQuery && targetRoute === 'pets') {
            const pathPetId = window.location.hash.replace(/^#\/?pets\/?/i, '').split('?')[0];
            if (pathPetId) routeQuery = `?id=${encodeURIComponent(decodeURIComponent(pathPetId))}`;
        }
        if (window.location.hash !== `#${targetRoute}${routeQuery}` && !window.location.hash.includes('notifications')) {
            window.history.replaceState(null, '', `#${targetRoute}${routeQuery}`);
        }
        handleRoute();
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

    preloadRouteAssets(resolveRoute(window.location.hash || sessionStorage.getItem('pawpal_user_active_tab') || 'profile'));
    if (!await verified || currentOwner() !== portalOwner) return;
    const clearPreviousOwner = () => {
        if (currentOwner() === portalOwner) return;
        moduleRenderer.begin();
        routePreviewCache.clear();
        closeDetailDrawer();
        detailDrawerBody?.replaceChildren();
        activeModuleDispose?.();
        activeModuleDispose = null;
        document.getElementById('userAppContent')?.replaceChildren();
        if (checkAuth()) window.location.reload();
    };
    window.addEventListener('storage', clearPreviousOwner);
    window.addEventListener('pageshow', clearPreviousOwner);
    document.addEventListener('auth_state_changed', clearPreviousOwner);
    window.addEventListener('pawpal:reviewSubmitted', async event => {
        if (!event.detail?.orderId || currentOwner() !== portalOwner) return;
        const { invalidateCustomerCache } = await import('/scripts/shared/customer-cache.mjs');
        invalidateCustomerCache('orders', portalOwner);
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startUserPortal, { once: true });
    } else {
        startUserPortal();
    }

})();
