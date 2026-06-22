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
                const subPath = pathname.substring(idx + 1); // "pages/public/landing.html"
                const depth = subPath.split('/').length - 1;
                return '../'.repeat(depth) || './';
            }
        }
        return './';
    }

    // Định nghĩa hàm cập nhật badge giỏ hàng toàn cục
    window.updateCartBadge = function() {
        const cart = JSON.parse(localStorage.getItem('pawpal_cart') || '[]');
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        
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

    function updateHeaderAuth() {
        const user = getCurrentUser();
        const authActions = document.querySelector('.auth-actions');
        const lookupBtn = document.querySelector('.lookup-btn');
        const lookupDivider = document.querySelector('.lookup-divider');
        
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
        
        if (user && !user.is_temporary) {
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
                        <span class="notification-badge" id="notificationBadge" style="position: absolute; top: -5px; right: -5px; background: var(--color-danger); color: white; border-radius: 50%; min-width: 16px; height: 16px; padding: 0 4px; font-size: 10px; display: none; align-items: center; justify-content: center; font-weight: 700; border: 1.5px solid var(--color-bg-white); line-height: 1;">0</span>
                    </button>
                    <div class="notification-dropdown" id="notificationDropdown">
                        <div class="notification-dropdown-header">
                            <span>Thông báo</span>
                            <button class="btn-mark-all-read" id="btnMarkAllRead">Đọc tất cả</button>
                        </div>
                        <div class="dropdown-divider" style="margin: 0;"></div>
                        <div class="notification-list" id="headerNotificationList">
                            <!-- JS render notifications here -->
                        </div>
                    </div>
                </div>
                <a href="${root}pages/shop/cart.html" class="cart-btn position-relative me-3" id="headerCartBtn" title="Giỏ hàng của tôi" style="display: flex; align-items: center; justify-content: center; color: var(--color-text-dark); transition: var(--transition-smooth);">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="9" cy="21" r="1"></circle>
                        <circle cx="20" cy="21" r="1"></circle>
                        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                    </svg>
                    <span class="cart-badge" style="position: absolute; top: -5px; right: -5px; background: var(--color-danger); color: white; border-radius: 50%; min-width: 16px; height: 16px; padding: 0 4px; font-size: 10px; display: none; align-items: center; justify-content: center; font-weight: 700; border: 1.5px solid var(--color-bg-white); line-height: 1;">0</span>
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
                        <a href="${root}pages/user/dashboard.html" class="dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                            Tài khoản của tôi
                        </a>
                        <a href="${root}pages/user/pet-profile.html" class="dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="10" r="3"/>
                                <path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 1 0-16 0c0 3 2.7 6.9 8 11.7z"/>
                            </svg>
                            Hồ sơ bé cưng
                        </a>
                        <a href="${root}pages/user/bookings.html" class="dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                            Lịch hẹn của tôi
                        </a>
                        <a href="${root}pages/user/orders.html" class="dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <path d="M16 10a4 4 0 0 1-8 0"></path>
                            </svg>
                            Đơn hàng của tôi
                        </a>
                        <a href="${root}pages/user/pet-diary.html" class="dropdown-item">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                            </svg>
                            Nhật ký chăm sóc
                        </a>
                        <a href="${root}pages/user/loyalty.html" class="dropdown-item">
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
            mobileGuestOnly.forEach(el => el.style.display = 'none');
            mobileUserOnly.forEach(el => el.style.display = 'block');
            mobileTempOnly.forEach(el => el.style.display = 'none');
            
            // Attach dropdown toggle handler
            setupUserDropdown();
            
        } else if (user && user.is_temporary) {
            // Tài khoản tạm: Hiển thị cảnh báo
            if (lookupBtn) lookupBtn.style.display = 'none';
            if (lookupDivider) lookupDivider.style.display = 'none';
            
            authActions.innerHTML = `
                <div class="temp-account-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>Tài khoản tạm</span>
                </div>
                <a href="${root}pages/public/login.html?action=setup-password" class="btn-signup">Kích hoạt tài khoản</a>
            `;
            
            // Cập nhật Mobile Nav
            mobileGuestOnly.forEach(el => el.style.display = 'none');
            mobileUserOnly.forEach(el => el.style.display = 'none');
            mobileTempOnly.forEach(el => el.style.display = 'block');
            
            // Setup logout handlers for mobile logout
            setupLogoutButtons();
            
        } else {
            // Chưa đăng nhập: Giữ nguyên UI mặc định
            if (lookupBtn) lookupBtn.style.display = '';
            if (lookupDivider) lookupDivider.style.display = '';
            
            // Khôi phục nút Đăng nhập / Đăng ký mặc định trên desktop
            authActions.innerHTML = `
                <a href="${root}pages/public/login.html" class="login-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Đăng nhập</span>
                </a>
                <a href="${root}pages/public/login.html#register" class="btn-signup">Đăng ký</a>
            `;
            
            // Cập nhật Mobile Nav
            mobileGuestOnly.forEach(el => el.style.display = 'block');
            mobileUserOnly.forEach(el => el.style.display = 'none');
            mobileTempOnly.forEach(el => el.style.display = 'none');
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
                    window.location.href = '/pages/public/landing.html';
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
