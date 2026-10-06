/**
 * header-auth.js — Cập nhật header dựa trên trạng thái đăng nhập
 */

(function() {
    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
        } catch {
            return null;
        }
    }

    function getRootPath() {
        const pathname = window.location.pathname;
        const searchTerms = ['/pages/', '/assets/'];
        for (const term of searchTerms) {
            const idx = pathname.toLowerCase().indexOf(term);
            if (idx !== -1) {
                const subPath = pathname.substring(idx + 1); // "pages/public/landing/landing.html"
                const depth = subPath.split('/').length - 1;
                return '../'.repeat(depth) || './';
            }
        }
        return './';
    }

    const mockNotifications = [
        {
            id: 1,
            isRead: false,
            title: "Khuyến mãi 20% Dịch vụ Spa cuối tuần này",
            time: "cách đây 2 giờ",
            url: "#",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>`
        },
        {
            id: 2,
            isRead: false,
            title: "Bé Cún đã hoàn thành dịch vụ Tắm và Cắt tỉa.",
            time: "cách đây 4 giờ",
            url: "#",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
        },
        {
            id: 3,
            isRead: true,
            title: "Nhắc nhở: Lịch hẹn Khám sức khỏe ngày mai (05/07)",
            time: "cách đây 1 ngày",
            url: "#",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
        },
        {
            id: 4,
            isRead: true,
            title: "Bạn có hoạt động sắp hết hạn (Mã giảm giá Paw10)",
            time: "cách đây 4 ngày 6 giờ",
            url: "#",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`
        },
        {
            id: 5,
            isRead: true,
            title: "Đơn hàng #PP-2894 đã được giao thành công.",
            time: "cách đây 9 ngày 11 giờ",
            url: "#",
            icon: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"></rect><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon><circle cx="5.5" cy="18.5" r="2.5"></circle><circle cx="18.5" cy="18.5" r="2.5"></circle></svg>`
        }
    ];

    function renderNotifications() {
        if (!mockNotifications || !mockNotifications.length) {
            return `
                <div style="padding: 24px; text-align: center; color: #4F7A65; font-size: 13.5px;">
                    Bạn không có thông báo mới nào.
                </div>
            `;
        }
        return mockNotifications.map(n => `
            <a href="${n.url || '#'}" class="notification-item ${n.isRead ? '' : 'notification-item--unread'}">
                <div class="notification-item__content">
                    <p class="notification-item__title">${n.title}</p>
                    <span class="notification-item__time">${n.time}</span>
                </div>
                ${!n.isRead ? '<div class="notification-item__dot"></div>' : ''}
            </a>
        `).join('');
    }

    window.updateCartBadge = async function() {
        let totalItems = 0;
        let hasLocalCart = false;
        try {
            const rawCart = localStorage.getItem('pawpal_cart');
            if (rawCart !== null) {
                hasLocalCart = true;
                const cartList = JSON.parse(rawCart);
                if (Array.isArray(cartList)) {
                    totalItems = cartList.length;
                }
            }
        } catch(e) {}

        const currentUser = (typeof window.getCurrentUser === 'function')
            ? window.getCurrentUser()
            : (function() { try { return JSON.parse(localStorage.getItem('pawpal_current_user')) || null; } catch { return null; }})();
            
        if (!hasLocalCart && currentUser && currentUser.id && window.API && window.API.getUserCart) {
            try {
                const cart = await window.API.getUserCart(currentUser.id);
                if (Array.isArray(cart)) {
                    totalItems = cart.length;
                }
            } catch (e) {
                console.error("Failed to update cart badge", e);
            }
        }
        
        // Badge trên desktop header
        const cartBadges = document.querySelectorAll('.cart-badge');
        cartBadges.forEach(badge => {
            if (totalItems > 0) {
                badge.textContent = totalItems > 99 ? '99+' : totalItems;
                badge.style.display = 'flex';
                badge.classList.add('d-flex');
                badge.classList.remove('d-none');
            } else {
                badge.textContent = '0';
                badge.style.display = 'none';
                badge.classList.add('d-none');
                badge.classList.remove('d-flex');
            }
        });
        
        // Badge trên mobile nav drawer
        const cartBadgeMobile = document.querySelector('.cart-badge-mobile');
        if (cartBadgeMobile) {
            cartBadgeMobile.textContent = totalItems > 0 ? `(${totalItems})` : '';
        }
    };

    function setMobileGroupVisibility(elements, isVisible) {
        elements.forEach(el => {
            const item = el.closest('.nav-item') || el;
            if (isVisible) {
                item.classList.remove('d-none');
                item.classList.remove('d-none');
            } else {
                item.classList.add('d-none');
                item.classList.add('d-none');
            }
        });
    }


    function syncMobileAuthLinks(state) {
        const nav = document.getElementById('primaryNavigation');
        if (!nav) return;

        const loginLinks = nav.querySelectorAll(
            'a[href*="login.html"], a[href*="login/login.html"], a[href*="#register"], a[href*="action=register"]'
        );
        const guestLoginItems = nav.querySelectorAll(
            '.mobile-guest-only, .nav-link-cta-mobile, .mobile-auth-login, a[href*="login.html"], a[href*="login/login.html"], a[href*="#register"], a[href*="action=register"]'
        );
        const userOnlyItems = nav.querySelectorAll('.mobile-user-only');
        const tempOnlyItems = nav.querySelectorAll('.mobile-temp-only');

        const isUser = state === 'user';
        const isTemp = state === 'temp';

        loginLinks.forEach((link) => {
            const label = (link.textContent || '').trim().toLowerCase();
            if (label.includes('đăng nhập') || label.includes('đăng ký') || label.includes('login') || label.includes('register')) {
                if (isUser) {
                    link.classList.add('d-none');
                    link.classList.add('d-none');
                } else {
                    link.classList.remove('d-none');
                    link.classList.remove('d-none');
                }
            }
        });

        setMobileGroupVisibility(guestLoginItems, !isUser && !isTemp);
        setMobileGroupVisibility(userOnlyItems, isUser);
        setMobileGroupVisibility(tempOnlyItems, isTemp);
    }

    async function resolveUserDisplayName(user) {
        if (!user) return user;
        const currentName = String(user.name || '').trim();
        const currentPhone = String(user.phone || '').trim();
        const looksLikePhone = /^\d{8,15}$/.test(currentName.replace(/\s+/g, '')) || (currentPhone && currentName === currentPhone);
        const looksLikeEmail = currentName.includes('@');
        if (currentName && !looksLikePhone && !looksLikeEmail) return user;

        const db = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
        if (!db || !user.id) return user;

        try {
            const { data, error } = await db
                .from('customer')
                .select(`
                    phone_main,
                    email,
                    customer_profile ( full_name )
                `)
                .eq('id', user.id)
                .limit(1);

            if (error || !data || !data.length) return user;

            const row = data[0];
            const profile = Array.isArray(row.customer_profile) ? (row.customer_profile[0] || {}) : (row.customer_profile || {});
            const resolvedName = String(profile.full_name || '').trim()
                || (currentName && !currentName.includes('@') ? currentName : '')
                || String(row.phone_main || user.phone || '').trim()
                || 'Khách hàng';
            const updatedUser = {
                ...user,
                name: resolvedName,
                phone: row.phone_main || user.phone || '',
                email: row.email || user.email || '',
            };

            localStorage.setItem('pawpal_current_user', JSON.stringify(updatedUser));
            return updatedUser;
        } catch (err) {
            console.warn('[header-auth] Cannot resolve user display name:', err);
            return user;
        }
    }

    function updateHeaderAuth() {
        const isGuestLookupPage = window.location.pathname.includes('/return-guest/');
        const user = isGuestLookupPage ? null : getCurrentUser();
        const authActions = document.querySelector('.auth-actions');
        const lookupBtn = document.querySelector('.lookup-btn');
        const lookupDivider = document.querySelector('.lookup-divider');
        const primaryNavigation = document.getElementById('primaryNavigation');
        
        const mobileGuestOnly = document.querySelectorAll('.mobile-guest-only');
        const mobileUserOnly = document.querySelectorAll('.mobile-user-only');
        const mobileTempOnly = document.querySelectorAll('.mobile-temp-only');
        document
            .querySelectorAll('#primaryNavigation .mobile-guest-only, #primaryNavigation .mobile-user-only, #primaryNavigation .mobile-temp-only, #primaryNavigation .nav-link-cta-mobile')
            .forEach(el => {
                const item = el.closest('.nav-item');
                if (!item) return;
                item.classList.remove('d-lg-none');
                item.classList.add('mobile-drawer-only');
            });
        
        if (!authActions) return; // Header chưa load
        
        const root = getRootPath();
        if (primaryNavigation) {
            primaryNavigation.classList.remove('nav-auth-user', 'nav-auth-temp', 'nav-auth-guest');
        }
        
        if (user && !user.is_temporary) {
            if (primaryNavigation) primaryNavigation.classList.add('nav-auth-user');
            // User đã đăng nhập chính thức
            // Ẩn: Tra cứu, Đăng nhập, Đăng ký và divider
            if (lookupBtn) lookupBtn.classList.add('d-none');
            if (lookupDivider) lookupDivider.classList.add('d-none');
            
            // Thay bằng: Giỏ hàng + Avatar + Tên + Dropdown
            const userName = String(user.name || user.full_name || '').trim() || user.phone || 'Khách hàng';
            const userInitial = userName.charAt(0).toUpperCase();

            // Cập nhật tên nền từ Supabase nếu cần
            resolveUserDisplayName(user).then((resolved) => {
                if (resolved && resolved.name && resolved.name !== userName) {
                    const nameEl = document.querySelector('.user-name');
                    if (nameEl) nameEl.textContent = resolved.name;
                    const infoNameEl = document.querySelector('.user-info-name');
                    if (infoNameEl) infoNameEl.textContent = resolved.name;
                }
            }).catch(() => {});
            
            authActions.innerHTML = `
                <div class="notification-menu-wrapper me-3">
                    <button class="notification-btn position-relative" id="headerNotificationBtn" title="Thông báo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <span class="notification-badge" id="notificationBadge">${mockNotifications.filter(n => !n.isRead).length}</span>
                    </button>
                    <div class="notification-dropdown" id="notificationDropdown">
                        <div class="notification-dropdown-header">
                            <span>Thông báo</span>
                            <button class="btn-mark-all-read" id="btnMarkAllRead">Đọc tất cả</button>
                        </div>
                        <div class="notification-list" id="headerNotificationList">
                            ${renderNotifications()}
                        </div>
                        <div class="notification-dropdown-footer">
                            <a href="${root}pages/user/#notifications" id="btnSeeAllNotis">Xem tất cả</a>
                        </div>
                    </div>
                </div>
                <a href="${root}pages/shop/cart/cart.html" class="cart-btn position-relative me-3" id="headerCartBtn" title="Giỏ hàng của tôi">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span class="cart-badge">0</span>
                </a>
                <div class="user-menu-wrapper">
                    <button class="user-menu-toggle" id="userMenuToggle">
                        <div class="user-avatar">${userInitial}</div>
                        <span class="user-name">${userName}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                    <div class="user-dropdown" id="userDropdown">
                        <div class="dropdown-header">
                            <div class="user-avatar-large">${userInitial}</div>
                            <div class="user-info">
                                <div class="user-info-name">${userName}</div>
                                <div class="user-info-phone">${user.phone || ''}</div>
                                <div class="user-info-points">${user.points || 0} Paw Points</div>
                            </div>
                        </div>
                        <div class="dropdown-divider"></div>
                        <a href="${root}pages/user/#profile" class="dropdown-item">Tài khoản của tôi</a>
                        <a href="${root}pages/user/#pets" class="dropdown-item">Hồ sơ bé cưng</a>
                        <a href="${root}pages/user/#bookings" class="dropdown-item">Lịch hẹn của bé</a>
                        <a href="${root}pages/user/#orders" class="dropdown-item">Đơn hàng của bé</a>
                        <a href="${root}pages/user/#wishlist" class="dropdown-item">Yêu thích</a>
                        <a href="${root}pages/user/#diary" class="dropdown-item">Nhật ký chăm sóc</a>
                        <a href="${root}pages/user/#loyalty" class="dropdown-item">Paw Points</a>
                        <a href="${root}pages/user/#settings" class="dropdown-item">Cài đặt</a>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item dropdown-item-danger" id="btnLogout">Đăng xuất</button>
                    </div>
                </div>
            `;
            
            // Cập nhật Mobile Nav
            setMobileGroupVisibility(mobileGuestOnly, false);
            setMobileGroupVisibility(mobileUserOnly, true);
            setMobileGroupVisibility(mobileTempOnly, false);
            syncMobileAuthLinks('user');
            setupMobileAccountToggle();
            
            // Gắn sự kiện đóng mở dropdown
            setupUserDropdown();
            
        } else if (user && user.is_temporary) {
            if (primaryNavigation) primaryNavigation.classList.add('nav-auth-temp');
            if (lookupBtn) lookupBtn.classList.remove('d-none');
            if (lookupDivider) lookupDivider.classList.remove('d-none');

            authActions.innerHTML = `
                <div class="notification-menu-wrapper me-3">
                    <button class="notification-btn position-relative" id="headerNotificationBtn" title="Thông báo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <span class="notification-badge" id="notificationBadge">${mockNotifications.filter(n => !n.isRead).length}</span>
                    </button>
                    <div class="notification-dropdown" id="notificationDropdown">
                        <div class="notification-dropdown-header">
                            <span>Thông báo</span>
                            <button class="btn-mark-all-read" id="btnMarkAllRead">Đọc tất cả</button>
                        </div>
                        <div class="notification-list" id="headerNotificationList">
                            ${renderNotifications()}
                        </div>
                        <div class="notification-dropdown-footer">
                            <a href="${root}pages/user/#notifications" id="btnSeeAllNotis">Xem tất cả</a>
                        </div>
                    </div>
                </div>
                <a href="${root}pages/shop/cart/cart.html" class="cart-btn position-relative me-3" id="headerCartBtn" title="Giỏ hàng của tôi">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span class="cart-badge">0</span>
                </a>
                <a href="${root}pages/public/login/login.html" class="login-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Đăng nhập</span>
                </a>
                <a href="${root}pages/public/login/login.html?action=register" class="btn-signup">Đăng ký</a>
            `;

            // Mobile Nav
            setMobileGroupVisibility(mobileGuestOnly, false);
            setMobileGroupVisibility(mobileUserOnly, false);
            setMobileGroupVisibility(mobileTempOnly, true);
            syncMobileAuthLinks('temp');
            setupMobileAccountToggle();
            setupUserDropdown();
            
        } else {
            if (primaryNavigation) primaryNavigation.classList.add('nav-auth-guest');
            if (lookupBtn) lookupBtn.classList.remove('d-none');
            if (lookupDivider) lookupDivider.classList.remove('d-none');
            
            authActions.innerHTML = `
                <div class="notification-menu-wrapper me-3">
                    <button class="notification-btn position-relative" id="headerNotificationBtn" title="Thông báo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                        </svg>
                        <span class="notification-badge" id="notificationBadge">${mockNotifications.filter(n => !n.isRead).length}</span>
                    </button>
                    <div class="notification-dropdown" id="notificationDropdown">
                        <div class="notification-dropdown-header">
                            <span>Thông báo</span>
                            <button class="btn-mark-all-read" id="btnMarkAllRead">Đọc tất cả</button>
                        </div>
                        <div class="notification-list" id="headerNotificationList">
                            ${renderNotifications()}
                        </div>
                        <div class="notification-dropdown-footer">
                            <a href="${root}pages/user/#notifications" id="btnSeeAllNotis">Xem tất cả</a>
                        </div>
                    </div>
                </div>
                <a href="${root}pages/shop/cart/cart.html" class="cart-btn position-relative me-3" id="headerCartBtn" title="Giỏ hàng của tôi">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span class="cart-badge">0</span>
                </a>
                <a href="${root}pages/public/login/login.html" class="login-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Đăng nhập</span>
                </a>
                <a href="${root}pages/public/login/login.html#register" class="btn-signup">Đăng ký</a>
            `;
            
            // Cập nhật Mobile Nav
            setMobileGroupVisibility(mobileGuestOnly, true);
            setMobileGroupVisibility(mobileUserOnly, false);
            setMobileGroupVisibility(mobileTempOnly, false);
            syncMobileAuthLinks('guest');
            setupMobileAccountToggle();
            setupUserDropdown();
        }

        // Thực thi cập nhật số lượng badge tức thì
        window.updateCartBadge(true);
    }
    
    function setupUserDropdown() {
        const toggle = document.getElementById('userMenuToggle');
        const dropdown = document.getElementById('userDropdown');
        const notiToggle = document.getElementById('headerNotificationBtn');
        const notiDropdown = document.getElementById('notificationDropdown');
        
        if (toggle && dropdown) {
            // Đóng/mở dropdown
            toggle.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('show');
                if (notiDropdown) notiDropdown.classList.remove('show');
            });
        }

        if (notiToggle && notiDropdown) {
            notiToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                notiDropdown.classList.toggle('show');
                if (dropdown) dropdown.classList.remove('show');
            });

            const btnMarkAll = notiDropdown.querySelector('#btnMarkAllRead');
            if (btnMarkAll) {
                btnMarkAll.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    mockNotifications.forEach(n => n.isRead = true);
                    const list = document.getElementById('headerNotificationList');
                    if (list) list.innerHTML = renderNotifications();
                    const badge = document.getElementById('notificationBadge');
                    if (badge) {
                        badge.style.display = 'none';
                        badge.textContent = '0';
                    }
                    try {
                        const notis = JSON.parse(localStorage.getItem('pawpal_notifications') || '[]');
                        if (Array.isArray(notis)) {
                            notis.forEach(n => n.read = true);
                            localStorage.setItem('pawpal_notifications', JSON.stringify(notis));
                            document.dispatchEvent(new CustomEvent('notifications_updated'));
                        }
                    } catch(err) {}
                });
            }
            const btnSeeAll = notiDropdown.querySelector('#btnSeeAllNotis');
            if (btnSeeAll) {
                btnSeeAll.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    notiDropdown.classList.remove('show');
                    openAllNotificationsModal();
                });
            }
        }
        
        // Đóng dropdown khi click ra ngoài (ngoại trừ dropdown)
        document.addEventListener('click', (e) => {
            if (dropdown && !e.target.closest('.user-menu-wrapper')) {
                dropdown.classList.remove('show');
            }
            if (notiDropdown && !e.target.closest('.notification-menu-wrapper')) {
                notiDropdown.classList.remove('show');
            }
        });
        
        setupLogoutButtons();
    }

    // -------------------------------------------------------------
    // POPUP MODAL TRUNG TÂM THÔNG BÁO (MODAL THEO CHUẨN AGENTS.MD)
    // -------------------------------------------------------------
    function formatNotiTime(timeStr) {
        if (!timeStr) return '';
        const date = new Date(timeStr);
        if (isNaN(date.getTime())) return timeStr;
        const diffMs = Date.now() - date.getTime();
        const diffMin = Math.floor(diffMs / 60000);
        if (diffMin < 1) return 'Vừa xong';
        if (diffMin < 60) return `${diffMin} phút trước`;
        const diffHour = Math.floor(diffMin / 60);
        if (diffHour < 24) return `${diffHour} giờ trước`;
        const diffDay = Math.floor(diffHour / 24);
        if (diffDay < 7) return `${diffDay} ngày trước`;
        const hours = String(date.getHours()).padStart(2, '0');
        const mins = String(date.getMinutes()).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const y = date.getFullYear();
        return `${hours}:${mins} • ${d}/${m}/${y}`;
    }

    function getNotiCategoryName(noti) {
        const type = String(noti.type || '').toLowerCase();
        const title = String(noti.title || '').toLowerCase();
        if (type === 'service' || title.includes('dịch vụ') || title.includes('spa') || title.includes('lịch') || title.includes('khám')) return 'Dịch vụ';
        if (type === 'order' || title.includes('đơn hàng') || title.includes('giao')) return 'Đơn hàng';
        if (type === 'promo' || title.includes('khuyến mãi') || title.includes('giảm giá') || title.includes('voucher') || title.includes('pawpoint')) return 'Ưu đãi';
        return 'Thông báo';
    }

    function openAllNotificationsModal(initialNoti = null) {
        let overlay = document.getElementById('pawpalAllNotiModalOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pawpalAllNotiModalOverlay';
            overlay.className = 'pawpal-noti-modal-overlay';
            overlay.innerHTML = `
                <div class="pawpal-noti-modal-card pawpal-noti-modal-2col" role="dialog" aria-modal="true">
                    <div class="pawpal-noti-modal-header" id="notiModalHeader">
                        <div>
                            <h3 class="pawpal-noti-modal-title" id="notiModalMainTitle">Trung tâm thông báo</h3>
                        </div>
                        <div class="d-flex align-items-center gap-3">
                            <button type="button" class="btn-modal-mark-all" id="btnModalMarkAllRead">Đọc tất cả</button>
                            <button type="button" class="btn-close-noti-modal" id="btnCloseNotiModal">&times;</button>
                        </div>
                    </div>
                    
                    <div class="pawpal-noti-modal-split-body">
                        <!-- Cột Trái: Tabs Lọc & Danh Sách Thông Báo -->
                        <div class="pawpal-noti-left-col">
                            <div class="pawpal-noti-modal-tabs" id="notiModalTabs">
                                <button type="button" class="noti-tab-btn active" data-tab="all">Tất cả</button>
                                <span class="noti-tab-divider">|</span>
                                <button type="button" class="noti-tab-btn" data-tab="unread">Chưa đọc</button>
                                <span class="noti-tab-divider">|</span>
                                <button type="button" class="noti-tab-btn" data-tab="service">Dịch vụ</button>
                                <span class="noti-tab-divider">|</span>
                                <button type="button" class="noti-tab-btn" data-tab="order">Đơn hàng</button>
                            </div>
                            <div class="pawpal-noti-items-scroll" id="notiModalListBody">
                                <!-- Danh sách thông báo -->
                            </div>
                        </div>

                        <!-- Cột Phải: Khung Chi Tiết Thông Báo -->
                        <div class="pawpal-noti-right-col" id="notiModalDetailPane">
                            <!-- Chi tiết thông báo đang chọn -->
                        </div>
                    </div>

                    <div class="pawpal-noti-modal-footer" id="notiModalFooter">
                        <button type="button" class="btn-modal-close-action" id="btnFooterCloseNotiModal">Đóng</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            // Gắn sự kiện đóng
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeNotiModal();
            });
            overlay.querySelector('#btnCloseNotiModal').addEventListener('click', closeNotiModal);
            overlay.querySelector('#btnFooterCloseNotiModal').addEventListener('click', closeNotiModal);

            // Đánh dấu đã đọc tất cả
            overlay.querySelector('#btnModalMarkAllRead').addEventListener('click', () => {
                mockNotifications.forEach(n => n.isRead = true);
                try {
                    const notis = JSON.parse(localStorage.getItem('pawpal_notifications') || '[]');
                    if (Array.isArray(notis)) {
                        notis.forEach(n => n.read = true);
                        localStorage.setItem('pawpal_notifications', JSON.stringify(notis));
                        document.dispatchEvent(new CustomEvent('notifications_updated'));
                    }
                } catch(e) {}
                const badge = document.getElementById('notificationBadge');
                if (badge) {
                    badge.style.display = 'none';
                    badge.textContent = '0';
                }
                const headerList = document.getElementById('headerNotificationList');
                if (headerList) headerList.innerHTML = renderNotifications();
                renderModalNotiList('all');
            });

            // Tabs chuyển đổi
            overlay.querySelectorAll('.noti-tab-btn').forEach(tabBtn => {
                tabBtn.addEventListener('click', () => {
                    overlay.querySelectorAll('.noti-tab-btn').forEach(b => b.classList.remove('active'));
                    tabBtn.classList.add('active');
                    renderModalNotiList(tabBtn.dataset.tab);
                });
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && overlay.classList.contains('show')) {
                    closeNotiModal();
                }
            });
        }

        function closeNotiModal() {
            overlay.classList.remove('show');
            document.body.style.overflow = '';
        }

        let currentSelectedNotiId = null;

        function renderDetailPane(noti) {
            const detailPane = overlay.querySelector('#notiModalDetailPane');
            if (!detailPane) return;

            if (!noti) {
                detailPane.innerHTML = `
                    <div class="pawpal-noti-detail-empty">
                        <p class="pawpal-noti-detail-empty-title">Chi tiết thông báo</p>
                        <p class="pawpal-noti-detail-empty-desc">Chọn một thông báo từ danh sách bên trái để xem nội dung đầy đủ.</p>
                    </div>
                `;
                return;
            }

            // Đánh dấu đã đọc
            noti.isRead = true;
            const matched = mockNotifications.find(x => String(x.id) === String(noti.id));
            if (matched) matched.isRead = true;
            try {
                const notis = JSON.parse(localStorage.getItem('pawpal_notifications') || '[]');
                if (Array.isArray(notis)) {
                    const found = notis.find(x => String(x.id) === String(noti.id));
                    if (found) found.read = true;
                    localStorage.setItem('pawpal_notifications', JSON.stringify(notis));
                    document.dispatchEvent(new CustomEvent('notifications_updated'));
                }
            } catch(e) {}

            // Cập nhật giao diện thẻ bên trái
            const activeCard = overlay.querySelector(`.pawpal-noti-modal-item[data-id="${noti.id}"]`);
            if (activeCard) {
                activeCard.classList.remove('unread');
                activeCard.classList.add('selected');
                const dot = activeCard.querySelector('.pawpal-noti-unread-dot');
                if (dot) dot.remove();
            }

            const category = getNotiCategoryName(noti);
            const formattedTime = formatNotiTime(noti.time);
            const root = getRootPath();
            
            // Xử lý link đích nếu có
            let actionText = '';
            let targetUrl = noti.url || '#';
            if (category === 'Dịch vụ') {
                actionText = 'Xem lịch hẹn của bé';
                if (!noti.url || noti.url === '#') targetUrl = `${root}pages/user/#bookings`;
            } else if (category === 'Đơn hàng') {
                actionText = 'Xem đơn hàng của bé';
                if (!noti.url || noti.url === '#') targetUrl = `${root}pages/user/#orders`;
            } else if (category === 'Ưu đãi') {
                actionText = 'Xem ưu đãi Paw Points';
                if (!noti.url || noti.url === '#') targetUrl = `${root}pages/user/#loyalty`;
            } else if (noti.url && noti.url !== '#' && noti.url !== '') {
                actionText = 'Đến trang liên kết';
            }

            detailPane.innerHTML = `
                <div class="pawpal-noti-detail-pane-content">
                    <div class="d-flex align-items-center justify-content-between mb-2">
                        <span class="pawpal-noti-category-badge">${category}</span>
                        <span class="pawpal-noti-detail-time">${formattedTime}</span>
                    </div>
                    <h4 class="pawpal-noti-detail-title">${noti.title}</h4>
                    <div class="pawpal-noti-detail-content">
                        ${noti.content || 'Không có nội dung chi tiết cho thông báo này.'}
                    </div>
                    ${actionText ? `
                        <div class="pawpal-noti-detail-action mt-4">
                            <a href="${targetUrl}" class="btn-noti-action-cta" id="btnNotiDetailCTA">${actionText}</a>
                        </div>
                    ` : ''}
                </div>
            `;

            detailPane.querySelector('#btnNotiDetailCTA')?.addEventListener('click', (e) => {
                const href = e.currentTarget.getAttribute('href');
                if (href && href !== '#' && href !== '') {
                    closeNotiModal();
                    if (window.location.pathname.includes('/pages/user/') && href.includes('#')) {
                        const targetHash = href.substring(href.indexOf('#'));
                        window.location.hash = targetHash;
                        if (typeof window.handleHashRouting === 'function') {
                            window.handleHashRouting();
                        }
                    }
                }
            });
        }

        function renderModalNotiList(filterType = 'all', targetNotiId = null) {
            const listContainer = overlay.querySelector('#notiModalListBody');

            let items = [];
            try {
                const stored = JSON.parse(localStorage.getItem('pawpal_notifications') || '[]');
                if (Array.isArray(stored) && stored.length > 0) {
                    items = stored.map(s => ({
                        id: s.id,
                        title: s.title,
                        content: s.content || s.message,
                        time: s.time,
                        isRead: Boolean(s.read),
                        type: s.type || 'info',
                        url: s.link || '#'
                    }));
                }
            } catch(e) {}

            if (!items.length) {
                items = mockNotifications;
            }

            let filtered = items;
            if (filterType === 'unread') {
                filtered = items.filter(n => !n.isRead);
            } else if (filterType === 'service') {
                filtered = items.filter(n => n.type === 'service' || (n.title || '').toLowerCase().includes('dịch vụ') || (n.title || '').toLowerCase().includes('spa') || (n.title || '').toLowerCase().includes('lịch'));
            } else if (filterType === 'order') {
                filtered = items.filter(n => n.type === 'order' || (n.title || '').toLowerCase().includes('đơn hàng'));
            }

            if (!filtered.length) {
                listContainer.innerHTML = `
                    <div class="pawpal-noti-empty">
                        Không có thông báo nào trong mục này.
                    </div>
                `;
                renderDetailPane(null);
                return;
            }

            // Chọn thông báo mục tiêu hoặc thông báo đầu tiên
            let selectedItem = null;
            if (targetNotiId) {
                selectedItem = filtered.find(x => String(x.id) === String(targetNotiId));
            }
            if (!selectedItem && filtered.length > 0) {
                selectedItem = filtered[0];
            }
            currentSelectedNotiId = selectedItem ? selectedItem.id : null;

            listContainer.innerHTML = filtered.map(n => {
                const category = getNotiCategoryName(n);
                const displayTime = formatNotiTime(n.time);
                const isSelected = selectedItem && String(selectedItem.id) === String(n.id);
                return `
                    <div class="pawpal-noti-modal-item ${n.isRead ? '' : 'unread'} ${isSelected ? 'selected' : ''}" data-id="${n.id}">
                        ${!n.isRead ? '<span class="pawpal-noti-unread-dot"></span>' : ''}
                        <div class="pawpal-noti-modal-item-content">
                            <div class="d-flex align-items-center justify-content-between mb-1">
                                <span class="pawpal-noti-category-badge">${category}</span>
                                <span class="pawpal-noti-modal-item-time">${displayTime}</span>
                            </div>
                            <div class="pawpal-noti-modal-item-title">${n.title}</div>
                            <div class="pawpal-noti-modal-item-text">${n.content || ''}</div>
                        </div>
                    </div>
                `;
            }).join('');

            // Gắn sự kiện click cho từng item
            listContainer.querySelectorAll('.pawpal-noti-modal-item').forEach(itemEl => {
                itemEl.addEventListener('click', () => {
                    const id = itemEl.dataset.id;
                    const notiObj = items.find(x => String(x.id) === String(id));
                    if (notiObj) {
                        listContainer.querySelectorAll('.pawpal-noti-modal-item').forEach(el => el.classList.remove('selected'));
                        itemEl.classList.add('selected');
                        currentSelectedNotiId = id;
                        renderDetailPane(notiObj);
                    }
                });
            });

            // Hiển thị chi tiết của item được chọn vào cột phải
            renderDetailPane(selectedItem);
        }

        const initialId = initialNoti ? initialNoti.id : null;
        renderModalNotiList('all', initialId);
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    window.openAllNotificationsModal = openAllNotificationsModal;

    function setupMobileAccountToggle() {
        const accountGroup = document.querySelector('.mobile-account-group');
        const toggle = document.querySelector('.mobile-account-toggle');
        if (!accountGroup || !toggle) return;

        if (toggle.dataset.bound === '1') return;
        toggle.dataset.bound = '1';

        toggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = accountGroup.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(isOpen));
            console.log('Toggle clicked, isOpen:', isOpen);
        });
    }

    function setupLogoutButtons() {
        // Gắn sự kiện click đăng xuất cho cả nút desktop và mobile
        document.querySelectorAll('#btnLogout, .mobile-logout-btn').forEach(btn => {
            // Tránh lặp sự kiện bằng cách clone và thay thế
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (confirm('Bạn có chắc muốn đăng xuất?')) {
                    localStorage.removeItem('pawpal_current_user');
                    window.location.href = '/pages/public/landing/landing.html';
                }
            });
        });
    }
    
    // -------------------------------------------------------------
    // TÍCH HỢP DẢI THÔNG BÁO TOP-BAR TỪ PHÂN HỆ CẤU HÌNH ADMIN (GIAI ĐOẠN 2)
    // -------------------------------------------------------------
    function renderDynamicTopBarNotice() {
        try {
            const notices = JSON.parse(localStorage.getItem('pawpal_settings_notices') || '[]');
            const activeTopNotice = notices.find(n => n.status === 'active' && (n.type === 'Top-bar' || n.type === 'topbar'));
            
            // Tìm hoặc tạo container Topbar
            let topBarEl = document.getElementById('pawpal-public-topbar-notice');
            if (!activeTopNotice) {
                if (topBarEl) topBarEl.remove();
                return;
            }

            if (!topBarEl) {
                topBarEl = document.createElement('div');
                topBarEl.id = 'pawpal-public-topbar-notice';
                topBarEl.style.cssText = `
                    background-color: #236B48;
                    color: #FFFFFF;
                    font-size: 13px;
                    font-weight: 500;
                    text-align: center;
                    padding: 8px 16px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    z-index: 1050;
                    position: relative;
                    letter-spacing: 0.1px;
                `;
                const siteHeader = document.getElementById('site-header') || document.body;
                if (siteHeader === document.body) {
                    document.body.insertBefore(topBarEl, document.body.firstChild);
                } else {
                    siteHeader.parentNode.insertBefore(topBarEl, siteHeader);
                }
            }

            topBarEl.innerHTML = `
                <span>${activeTopNotice.content}</span>
                <button type="button" id="btnCloseTopBarNotice" style="background: none; border: none; color: rgba(255,255,255,0.8); cursor: pointer; font-size: 14px; padding: 0 4px; line-height: 1;" title="Đóng">✕</button>
            `;

            document.getElementById('btnCloseTopBarNotice')?.addEventListener('click', () => {
                topBarEl.style.display = 'none';
            });
        } catch (e) {
            console.warn('Lỗi hiển thị topbar notice:', e);
        }
    }

    // -------------------------------------------------------------
    // ĐIỀU KHIỂN MENU MOBILE DRAWER (HAMBURGER BUTTON)
    // -------------------------------------------------------------
    function initMobileNavigation() {
        const toggleBtn = document.getElementById('mobileNavToggle');
        const nav = document.getElementById('primaryNavigation');
        if (!toggleBtn || !nav) return;

        if (toggleBtn.dataset.mobileNavReady === 'true' && nav.dataset.mobileNavReady === 'true') {
            return;
        }

        let mobileOverlay = null;
        function createOverlay() {
            if (mobileOverlay) return;
            mobileOverlay = document.createElement('div');
            mobileOverlay.className = 'mobile-nav-overlay';
            mobileOverlay.style.position = 'fixed';
            mobileOverlay.style.inset = '0';
            mobileOverlay.style.background = 'rgba(0,0,0,0.45)';
            mobileOverlay.style.zIndex = '9995';
            mobileOverlay.style.opacity = '0';
            mobileOverlay.style.transition = 'opacity 220ms ease';
            document.body.appendChild(mobileOverlay);
            mobileOverlay.addEventListener('click', closeDrawer);
            requestAnimationFrame(() => {
                if (mobileOverlay) mobileOverlay.style.opacity = '1';
            });
        }

        function removeOverlay() {
            if (!mobileOverlay) return;
            mobileOverlay.style.opacity = '0';
            setTimeout(() => {
                if (mobileOverlay && mobileOverlay.parentNode) mobileOverlay.parentNode.removeChild(mobileOverlay);
                mobileOverlay = null;
            }, 240);
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeDrawer();
        });

        // Đóng menu khi click ra ngoài drawer
        document.addEventListener('click', (e) => {
            if (!nav.classList.contains('show')) return;
            if (nav.contains(e.target) || toggleBtn.contains(e.target)) return;
            closeDrawer();
        });

        let wasMobile = window.innerWidth < 1250;
        window.addEventListener('resize', () => {
            const isMobile = window.innerWidth < 1250;
            if (isMobile !== wasMobile) {
                closeDrawer();
            }
            wasMobile = isMobile;
        });

        nav.classList.remove('show');
        toggleBtn.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
        nav.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
        nav.querySelectorAll('.dropdown-toggle').forEach(dt => {
            dt.setAttribute('aria-expanded', 'false');
            const svg = dt.querySelector('svg');
            if (svg) svg.style.transform = 'rotate(0deg)';
        });

        function openDrawer() {
            nav.classList.add('show');
            const header = document.querySelector('.main-header');
            if (header) header.classList.add('nav-open');
            toggleBtn.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
            createOverlay();
            if (typeof setupMobileAccountToggle === 'function') setupMobileAccountToggle();
            if (typeof setupLogoutButtons === 'function') setupLogoutButtons();
        }

        function closeDrawer() {
            nav.classList.remove('show');
            const header = document.querySelector('.main-header');
            if (header) header.classList.remove('nav-open');
            toggleBtn.setAttribute('aria-expanded', 'false');
            document.body.style.overflow = '';
            removeOverlay();
            nav.querySelectorAll('.dropdown-toggle svg').forEach(svg => svg.style.transform = 'rotate(0deg)');
            nav.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
            nav.querySelectorAll('.dropdown-toggle').forEach(dt => {
                dt.classList.remove('show');
                dt.setAttribute('aria-expanded', 'false');
            });
        }

        toggleBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const isOpen = nav.classList.contains('show');
            if (isOpen) {
                closeDrawer();
            } else {
                openDrawer();
            }
        };

        nav.querySelectorAll('a').forEach(link => {
            if (!link.classList.contains('dropdown-toggle') && link.dataset.mobileNavCloseBound !== 'true') {
                link.addEventListener('click', (e) => {
                    // Nếu là link chuyển hash hoặc url thì đóng drawer
                    closeDrawer();
                });
                link.dataset.mobileNavCloseBound = 'true';
            }
        });

        const dropdownToggles = nav.querySelectorAll('.dropdown-toggle');
        dropdownToggles.forEach(dt => {
            if (dt.dataset.mobileDropdownBound === 'true') return;
            
            dt.addEventListener('click', (e) => {
                if (window.innerWidth < 1250) {
                    e.preventDefault();
                    e.stopPropagation();
                    const parentItem = dt.closest('.nav-item.dropdown') || dt.parentElement;
                    const menu = parentItem ? parentItem.querySelector('.dropdown-menu') : dt.nextElementSibling;
                    if (menu) {
                        const isCurrentlyOpen = menu.classList.contains('show');
                        // Đóng các dropdown khác để tránh tràn màn hình mobile
                        nav.querySelectorAll('.dropdown-menu.show').forEach(m => {
                            if (m !== menu) m.classList.remove('show');
                        });
                        nav.querySelectorAll('.dropdown-toggle').forEach(t => {
                            if (t !== dt) {
                                t.classList.remove('show');
                                t.setAttribute('aria-expanded', 'false');
                                const s = t.querySelector('svg');
                                if (s) s.style.transform = 'rotate(0deg)';
                            }
                        });

                        menu.classList.toggle('show', !isCurrentlyOpen);
                        dt.classList.toggle('show', !isCurrentlyOpen);
                        dt.setAttribute('aria-expanded', String(!isCurrentlyOpen));
                        const svg = dt.querySelector('svg');
                        if (svg) svg.style.transform = !isCurrentlyOpen ? 'rotate(180deg)' : 'rotate(0deg)';
                    }
                }
            });
            
            dt.dataset.mobileDropdownBound = 'true';
        });

        if (typeof setupMobileAccountToggle === 'function') setupMobileAccountToggle();
        if (typeof setupLogoutButtons === 'function') setupLogoutButtons();

        toggleBtn.dataset.mobileNavReady = 'true';
        nav.dataset.mobileNavReady = 'true';
    }

    window.initMobileNavigation = initMobileNavigation;

    // Chạy khi header được chèn vào HTML
    document.addEventListener('headerInjected', () => {
        updateHeaderAuth();
        renderDynamicTopBarNotice();
        initMobileNavigation();
    });
    
    // Also run if header already exists (for pages that don't use components.js)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            updateHeaderAuth();
            renderDynamicTopBarNotice();
            initMobileNavigation();
        });
    } else {
        updateHeaderAuth();
        renderDynamicTopBarNotice();
        initMobileNavigation();
    }
    
    // Lắng nghe thay đổi trạng thái đăng nhập, giỏ hàng và cấu hình cập nhật
    document.addEventListener('auth_state_changed', updateHeaderAuth);
    document.addEventListener('cart_updated', () => {
        if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
    });
    window.addEventListener('pawpal_settings_updated', renderDynamicTopBarNotice);
    window.addEventListener('storage', (e) => {
        if (e.key === 'pawpal_settings_notices') {
            renderDynamicTopBarNotice();
        }
        if (e.key === 'pawpal_cart') {
            if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
        }
    });
    window.addEventListener('focus', () => {
        if (typeof window.updateCartBadge === 'function') window.updateCartBadge();
    });
})();
