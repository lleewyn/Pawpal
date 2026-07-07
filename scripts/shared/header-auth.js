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

    // Định nghĩa hàm cập nhật badge giỏ hàng toàn cục
    window.updateCartBadge = async function() {
        const currentUser = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
        let cart = [];
        if (currentUser && window.API && window.API.getUserCart) {
            cart = await window.API.getUserCart(currentUser.id);
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
            item.style.display = isVisible ? '' : 'none';
        });
    }

    function updateHeaderAuth() {
        const user = getCurrentUser();
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
            const userName = user.name || 'Khách hàng';
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
                            Hồ sơ bé cưng
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
        }

        // Thực thi cập nhật số lượng badge tức thì
        window.updateCartBadge();
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
