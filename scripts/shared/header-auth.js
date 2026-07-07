/**
 * header-auth.js — Cập nhật header dựa trên trạng thái đăng nhập
 */

(function() {
    function getUsers() {
        try {
            return JSON.parse(localStorage.getItem('pawpal_users_db')) || [];
        } catch {
            return [];
        }
    }

    function reconcileUserSession(user, users) {
        if (!user) return null;

        const sameIdentityUsers = (users || []).filter((candidate) => {
            if (user.id && candidate.id && String(candidate.id) === String(user.id)) return true;
            if (user.phone && candidate.phone && String(candidate.phone) === String(user.phone)) return true;
            return false;
        });

        if (!sameIdentityUsers.length) return user;

        const preferredUser = sameIdentityUsers.find((candidate) => !candidate.is_temporary) || sameIdentityUsers[0];
        return { ...preferredUser, ...user, is_temporary: Boolean(preferredUser.is_temporary) };
    }

    function getCurrentUser() {
        try {
            const rawUser = JSON.parse(localStorage.getItem('pawpal_current_user')) || null;
            const user = reconcileUserSession(rawUser, getUsers());
            if (user && JSON.stringify(user) !== JSON.stringify(rawUser)) {
                localStorage.setItem('pawpal_current_user', JSON.stringify(user));
            }
            return user;
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
        return mockNotifications.map(n => `
            <div class="notification-item ${n.isRead ? '' : 'notification-item--unread'}">
                <div class="notification-item__icon">
                    ${n.icon}
                </div>
                <div class="notification-item__content">
                    <p class="notification-item__title">${n.title}</p>
                    <span class="notification-item__time">${n.time}</span>
                    <a href="${n.url}" class="notification-item__link">View full notification</a>
                </div>
                ${!n.isRead ? '<div class="notification-item__dot"></div>' : ''}
            </div>
        `).join('');
    }

    // Định nghĩa hàm lưu giỏ hàng toàn cục
    window.saveCart = function(cart) {
        localStorage.setItem('pawpal_cart', JSON.stringify(cart));
        const currentUser = (typeof window.getCurrentUser === 'function')
            ? window.getCurrentUser()
            : JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            
        if (currentUser && window.API && window.API.saveUserCart) {
            window.API.saveUserCart(currentUser.id || currentUser.phone || currentUser.phone_main || null, cart).then(() => {
                if (window.updateCartBadge) window.updateCartBadge();
            });
        } else {
            if (window.updateCartBadge) window.updateCartBadge();
        }
    };

    // Định nghĩa hàm lưu danh sách yêu thích toàn cục
    window.saveWishlist = function(productIds, serviceIds = []) {
        const currentUser = (typeof window.getCurrentUser === 'function')
            ? window.getCurrentUser()
            : JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            
        const phone = currentUser ? currentUser.phone : null;
        const pKey = phone ? `pawpal_wishlist_${phone}` : 'pawpal_wishlist_guest';
        const sKey = phone ? `pawpal_wishlist_services_${phone}` : 'pawpal_wishlist_services_guest';
        
        localStorage.setItem(pKey, JSON.stringify(productIds));
        localStorage.setItem(sKey, JSON.stringify(serviceIds));
        
        if (currentUser && window.API && window.API.saveUserWishlist) {
            window.API.saveUserWishlist(currentUser.id || currentUser.phone || currentUser.phone_main || null, {
                productIds: productIds,
                serviceIds: serviceIds
            });
        }
    };

    // Định nghĩa hàm cập nhật badge giỏ hàng toàn cục
    window.updateCartBadge = async function(forceSync = false) {
        let cart = [];
        const currentUser = (typeof window.getCurrentUser === 'function')
            ? window.getCurrentUser()
            : JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            
        if (forceSync && currentUser && window.API && window.API.getUserCart) {
            cart = await window.API.getUserCart(currentUser.id || currentUser.phone || currentUser.phone_main || null);
            localStorage.setItem('pawpal_cart', JSON.stringify(cart));
        } else {
            cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
        }
        
        const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);
        
        // Badge trên desktop header
        const cartBadge = document.querySelector('.cart-badge');
        if (cartBadge) {
            cartBadge.textContent = totalItems;
            cartBadge.style.display = totalItems > 0 ? 'flex' : 'none';
        }
        
        // Badge trên mobile nav drawer
        const cartBadgeMobile = document.querySelector('.cart-badge-mobile');
        if (cartBadgeMobile) {
            cartBadgeMobile.textContent = totalItems > 0 ? `(${totalItems})` : '';
        }
    };

    function setMobileGroupVisibility(elements, isVisible) {
        elements.forEach(el => {
            const item = el.closest('.nav-item') || el;
            item.style.setProperty('display', isVisible ? '' : 'none', 'important');
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
            if (label.includes('??ng nh?p') || label.includes('??ng k?') || label.includes('login') || label.includes('register')) {
                link.style.setProperty('display', isUser ? 'none' : '', 'important');
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

    async function updateHeaderAuth() {
        const isGuestLookupPage = window.location.pathname.includes('/return-guest/');
        const user = isGuestLookupPage ? null : await resolveUserDisplayName(getCurrentUser());
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
            if (lookupBtn) lookupBtn.style.display = 'none';
            if (lookupDivider) lookupDivider.style.display = 'none';
            
            // Thay bằng: Giỏ hàng + Avatar + Tên + Dropdown
            const userName = String(user.name || user.full_name || '').trim() || user.phone || 'Khách hàng';
            const userInitial = userName.charAt(0).toUpperCase();
            
            authActions.innerHTML = `
                <div class="notification-menu-wrapper me-3">
                    <button class="notification-btn position-relative" id="headerNotificationBtn" title="Thông báo" style="background: none; border: none; display: flex; align-items: center; justify-content: center; color: var(--color-text-dark); padding: 0;">
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
                        <div class="dropdown-divider" style="margin: 0;"></div>
                        <div class="notification-list" id="headerNotificationList">
                            ${renderNotifications()}
                        </div>
                        <div class="notification-dropdown-footer">
                            <a href="#">See all</a>
                        </div>
                    </div>
                </div>
                <a href="${root}pages/shop/cart/cart.html" class="cart-btn position-relative me-3" id="headerCartBtn" title="Giỏ hàng của tôi" style="display: flex; align-items: center; justify-content: center; color: var(--color-text-dark); transition: var(--transition-smooth);">
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
                        <a href="${root}pages/user/dashboard/dashboard.html" class="dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            Tài khoản của tôi
                        </a>
                        <a href="${root}pages/user/pet-profile/pet-profile.html" class="dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="10" r="3"/>
                                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/>
                            </svg>
                            Hồ sơ của tôi
                        </a>
                        <a href="${root}pages/user/bookings/bookings.html" class="dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            Lịch hẹn của tôi
                        </a>
                        <a href="${root}pages/user/orders/orders.html" class="dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <path d="M16 10a4 4 0 0 1-8 0"></path>
                            </svg>
                            Đơn hàng của tôi
                        </a>
                        <a href="${root}pages/user/wishlist/wishlist.html" class="dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                            </svg>
                            Yêu thích
                        </a>
                        <a href="${root}pages/user/pet-diary/pet-diary.html" class="dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                            </svg>
                            Nhật ký chăm sóc
                        </a>
                        <a href="${root}pages/user/loyalty/loyalty.html" class="dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                            Paw Points
                        </a>
                        <a href="${root}pages/user/settings/settings.html" class="dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.92 0 1.71.57 2 1.39.06.19.1.4.1.61a2 2 0 0 1-2 2h-.09c-.65 0-1.24.39-1.51 1z"></path>
                            </svg>
                            Cài đặt
                        </a>
                        <div class="dropdown-divider"></div>
                        <button class="dropdown-item dropdown-item-danger" id="btnLogout">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Đăng xuất
                        </button>
                    </div>
                </div>
            `;
            
            // Cập nhật Mobile Nav
            setMobileGroupVisibility(mobileGuestOnly, false);
            setMobileGroupVisibility(mobileUserOnly, true);
            setMobileGroupVisibility(mobileTempOnly, false);
            syncMobileAuthLinks('user');
            setupMobileAccountToggle();
            
            // Attach dropdown toggle handler
            setupUserDropdown();
            
        } else if (user && user.is_temporary) {
            if (primaryNavigation) primaryNavigation.classList.add('nav-auth-temp');
            // Tài khoản tạm: hiển thị như chưa đăng nhập (không show badge/nút kích hoạt)
            if (lookupBtn) lookupBtn.style.display = '';
            if (lookupDivider) lookupDivider.style.display = '';

            authActions.innerHTML = `
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

            setupLogoutButtons();
            
        } else {
            if (primaryNavigation) primaryNavigation.classList.add('nav-auth-guest');
            // Chưa đăng nhập: Giữ nguyên UI mặc định
            if (lookupBtn) lookupBtn.style.display = '';
            if (lookupDivider) lookupDivider.style.display = '';
            
            // Khôi phục nút Đăng nhập / Đăng ký cho guest (ẩn giỏ hàng theo yêu cầu)
            authActions.innerHTML = `
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
            // Toggle dropdown
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
        }
        
        // Close dropdown when clicking outside
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

    function setupMobileAccountToggle() {
        const accountGroup = document.querySelector('.mobile-account-group');
        const toggle = document.querySelector('.mobile-account-toggle');
        if (!accountGroup || !toggle) return;

        if (toggle.dataset.bound === '1') return;
        toggle.dataset.bound = '1';

        toggle.addEventListener('click', () => {
            const isOpen = accountGroup.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(isOpen));
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
    
    // Run when header is injected
    document.addEventListener('headerInjected', updateHeaderAuth);
    
    // Also run if header already exists (for pages that don't use components.js)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', updateHeaderAuth);
    } else {
        updateHeaderAuth();
    }
    
    // Listen for auth state changes
    document.addEventListener('auth_state_changed', updateHeaderAuth);
})();
