/* ==========================================================================
   PawPal Frontend Multi-Page Auth & Data Simulation Engine
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initial Data & LocalStorage Setup
    const DEFAULT_USER = {
        phone: '0987654321',
        name: 'Nguyễn Văn A',
        password: 'Pawpal@123', // meets complex requirements (number + special char + length >= 8)
        points: 50,
        membership: 'Hạng Bạc',
        isTemporary: false,
        bookings: [
            { id: 'BK-1082', service: 'Spa & Grooming', date: '24/05/2026', time: '15:00', status: 'Đã xác nhận' }
        ]
    };

    // Load users from localStorage or initialize default
    if (!localStorage.getItem('pawpal_users')) {
        localStorage.setItem('pawpal_users', JSON.stringify([DEFAULT_USER]));
    }

    // State Variables
    let currentOtp = null;
    let otpTimerInterval = null;
    let resendTimerInterval = null;
    let lockTimerInterval = null;
    let loginFailedCount = {};

    // Page Detection
    const loginFormContainer = document.getElementById('loginFormContainer');
    const isLoginPage = !!loginFormContainer;
    const isDashboardPage = !!document.getElementById('dashBookingsList');
    const isHomePage = !isLoginPage && !isDashboardPage;

    // Path resolution based on current page location
    // Detect which subdir we're in to compute correct relative paths
    const _path = window.location.pathname;
    const _isRoot       = !_path.includes('/pages/');
    const _isPublicDir  = _path.includes('/pages/public/');
    const _isUserDir    = _path.includes('/pages/user/');
    const _isServicesDir = _path.includes('/pages/services/');
    const _isShopDir    = _path.includes('/pages/shop/');
    const _isAdminDir   = _path.includes('/pages/admin/');
    const _isInPagesSubdir = !_isRoot; // any pages/* dir

    // Helper: build correct URL from any page to a known named destination
    function _url(dest) {
        // dest options: 'root', 'login', 'dashboard', 'admin', 'booking', 'shop'
        if (_isRoot) {
            const map = {
                root:      'pages/public/landing.html',
                login:     'pages/public/login.html',
                dashboard: 'pages/user/dashboard.html',
                admin:     'pages/admin/index.html',
                booking:   'pages/services/booking.html',
                shop:      'pages/shop/shop.html',
            };
            return map[dest] || dest;
        }
        if (_isPublicDir) {
            const map = {
                root:      'landing.html',
                login:     'login.html',
                dashboard: '../user/dashboard.html',
                admin:     '../admin/index.html',
                booking:   '../services/booking.html',
                shop:      '../shop/shop.html',
            };
            return map[dest] || dest;
        }
        if (_isUserDir) {
            const map = {
                root:      '../public/landing.html',
                login:     '../public/login.html',
                dashboard: 'dashboard.html',
                admin:     '../admin/index.html',
                booking:   '../services/booking.html',
                shop:      '../shop/shop.html',
            };
            return map[dest] || dest;
        }
        if (_isServicesDir) {
            const map = {
                root:      '../public/landing.html',
                login:     '../public/login.html',
                dashboard: '../user/dashboard.html',
                admin:     '../admin/index.html',
                booking:   'booking.html',
                shop:      '../shop/shop.html',
            };
            return map[dest] || dest;
        }
        if (_isShopDir) {
            const map = {
                root:      '../public/landing.html',
                login:     '../public/login.html',
                dashboard: '../user/dashboard.html',
                admin:     '../admin/index.html',
                booking:   '../services/booking.html',
                shop:      'shop.html',
            };
            return map[dest] || dest;
        }
        if (_isAdminDir) {
            const map = {
                root:      '../public/landing.html',
                login:     '../public/login.html',
                dashboard: '../user/dashboard.html',
                admin:     'index.html',
                booking:   '../services/booking.html',
                shop:      '../shop/shop.html',
            };
            return map[dest] || dest;
        }
        // fallback
        return dest;
    }

    // Legacy aliases kept for any remaining code that uses them
    const pathPrefix = _isRoot ? '' : '../../';
    const pagePrefix = _isRoot ? 'pages/' : '';

    // Booking change state and hold helpers
    const BOOKING_SLOTS = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00'];
    const BOOKING_BUSY_SLOTS = ['09:00','10:30','14:00','15:30'];
    const STAFF_MEMBERS = [
        { id: 'NV01', name: 'Thảo', role: 'Chăm sóc Spa' },
        { id: 'NV02', name: 'Hưng', role: 'Chuyên viên Grooming' },
        { id: 'NV03', name: 'Linh', role: 'Chăm sóc Pet Hotel' },
        { id: 'NV04', name: 'Minh', role: 'Bảo mẫu VIP' }
    ];
    const HOLD_STORAGE_KEY = 'pawpal_booking_holds';
    const CURRENT_CHANGE_HOLD_KEY = 'pawpal_current_change_hold';
    let changeBookingState = null;

    // Toast Container
    const toastContainer = document.getElementById('toastContainer');

    // Ensure a safe global opener exists early so dashboard can call it before auth module
    window._queuedChangeBookingRequests = window._queuedChangeBookingRequests || [];
    window._actualOpenChangeBookingModal = window._actualOpenChangeBookingModal || null;
    window.openChangeBookingModal = function(booking) {
        if (typeof window._actualOpenChangeBookingModal === 'function') {
            return window._actualOpenChangeBookingModal(booking);
        }
        console.log('auth: queueing openChangeBookingModal request until actual handler is ready', booking);
        window._queuedChangeBookingRequests.push(booking);
    };

    // Safe helper to bind event listeners
    function safeBind(el, event, handler) {
        if (el) el.addEventListener(event, handler);
    }

    // ==========================================================================
    // Global State Core Helpers
    // ==========================================================================

    function getUsersList() {
        return JSON.parse(localStorage.getItem('pawpal_users')) || [];
    }

    function saveUsersList(users) {
        localStorage.setItem('pawpal_users', JSON.stringify(users));
    }

    function getLoggedInUser() {
        return localStorage.getItem('pawpal_logged_in_user');
    }

    function getBookingHolds() {
        try {
            const raw = localStorage.getItem(HOLD_STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch {
            return [];
        }
    }

    function saveBookingHolds(holds) {
        const valid = holds.filter(h => !isHoldExpired(h));
        localStorage.setItem(HOLD_STORAGE_KEY, JSON.stringify(valid));
    }

    function isHoldExpired(hold) {
        return new Date(hold.expiresAt) <= new Date();
    }

    function cleanupExpiredHolds() {
        const holds = getBookingHolds();
        const active = holds.filter(h => !isHoldExpired(h));
        if (active.length !== holds.length) saveBookingHolds(active);
    }

    function getActiveHolds() {
        cleanupExpiredHolds();
        return getBookingHolds().filter(h => !isHoldExpired(h));
    }

    function getChangeHoldKey(bookingId, date, slot) {
        return `${bookingId}|${date}|${slot}`;
    }

    function releaseCurrentChangeHold() {
        if (!changeBookingState?.currentHoldId) return;
        const holds = getActiveHolds().filter(h => h.id !== changeBookingState.currentHoldId);
        saveBookingHolds(holds);
        localStorage.removeItem(CURRENT_CHANGE_HOLD_KEY);
        changeBookingState.currentHoldId = null;
    }

    function startChangeHoldCountdown() {
        if (!changeBookingState?.currentHoldId) return;
        if (changeBookingState.holdTimer) return;
        changeBookingState.holdTimer = setInterval(() => {
            const hold = getActiveHolds().find(h => h.id === changeBookingState.currentHoldId);
            if (!hold) {
                updateChangeBookingHoldBanner();
                clearInterval(changeBookingState.holdTimer);
                changeBookingState.holdTimer = null;
                return;
            }
            updateChangeBookingHoldBanner();
        }, 1000);
    }

    function stopChangeHoldCountdown() {
        if (changeBookingState?.holdTimer) {
            clearInterval(changeBookingState.holdTimer);
            changeBookingState.holdTimer = null;
        }
    }

    function getCurrentUser() {
        const loggedInPhone = getLoggedInUser();
        if (!loggedInPhone) return null;
        const users = getUsersList();
        return users.find(u => u.phone === loggedInPhone) || null;
    }

    function saveCurrentUser(user) {
        const users = getUsersList();
        const idx = users.findIndex(u => u.phone === user.phone);
        if (idx >= 0) {
            users[idx] = user;
        } else {
            users.push(user);
        }
        saveUsersList(users);
    }

    function parseBookingDateTime(dateString, timeString) {
        if (!dateString) return null;
        const parts = dateString.split('/').map(p => p.trim());
        if (parts.length !== 3) return null;
        const [day, month, year] = parts;
        return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${timeString || '00:00'}:00`);
    }

    function formatBookingDate(dateString) {
        if (!dateString) return '';
        const d = parseBookingDateTime(dateString, '00:00');
        if (!d || isNaN(d)) return dateString;
        return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function getMinutesUntilBooking(booking) {
        const dt = parseBookingDateTime(booking.date, booking.time);
        if (!dt) return Infinity;
        return Math.round((dt - new Date()) / 60000);
    }

    function canModifyBooking(booking) {
        if (!booking || !booking.status) return false;
        if (['Đang thực hiện','Đã tiếp nhận','Hoàn thành','Đã hủy'].includes(booking.status)) return false;
        const minutes = getMinutesUntilBooking(booking);
        return minutes > 120;
    }

    function canCancelBooking(booking) {
        if (!booking || !booking.status) return false;
        if (['Đang thực hiện','Đã tiếp nhận','Hoàn thành','Đã hủy'].includes(booking.status)) return false;
        const minutes = getMinutesUntilBooking(booking);
        return minutes > 120;
    }

    function recordBookingAudit(booking, action, note) {
        if (!booking) return;
        booking.auditTrail = booking.auditTrail || [];
        booking.auditTrail.push({
            action,
            note,
            actor: getCurrentUser()?.phone || 'guest',
            timestamp: new Date().toISOString(),
        });
    }

    function getServiceCategory(booking) {
        if (!booking?.service) return 'spa';
        return booking.service.toLowerCase().includes('hotel') ? 'hotel' : 'spa';
    }

    function getBookingCategoryLabel(booking) {
        return getServiceCategory(booking) === 'hotel' ? 'Pet Hotel' : 'Spa & Grooming';
    }

    function loadBookingServiceForChange(booking) {
        if (!booking) return null;
        const category = getServiceCategory(booking);
        return STATE_SERVICES ? STATE_SERVICES.find(s => s.isHotel === (category === 'hotel')) : null;
    }

    function setLoggedInUser(phone) {
        localStorage.setItem('pawpal_logged_in_user', phone);
    }

    function logoutUser() {
        localStorage.removeItem('pawpal_logged_in_user');
        updateHeaderState();
        alert('Đã đăng xuất tài khoản.');
        window.location.href = _url('root');
    }

    function formatPhone(phone) {
        if (!phone) return '';
        return phone.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
    }

    // Password strength calculation
    function getPasswordStrength(password) {
        if (!password) return 0;
        let score = 0;
        if (password.length >= 8) score++;
        if (/\d/.test(password)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
        return score; // 0, 1, 2, or 3
    }

    function updateStrengthBar(bar, label, score) {
        if (!bar || !label) return;
        bar.className = 'strength-bar';
        if (score === 0) {
            bar.style.width = '0%';
            label.textContent = 'Yếu';
            label.style.color = '#ef4444';
        } else if (score === 1) {
            bar.style.width = '33%';
            bar.style.backgroundColor = '#ef4444'; // Red
            label.textContent = 'Yếu';
            label.style.color = '#ef4444';
        } else if (score === 2) {
            bar.style.width = '66%';
            bar.style.backgroundColor = '#f97316'; // Orange
            label.textContent = 'Trung bình';
            label.style.color = '#f97316';
        } else if (score === 3) {
            bar.style.width = '100%';
            bar.style.backgroundColor = '#22c55e'; // Green
            label.textContent = 'Mạnh';
            label.style.color = '#22c55e';
        }
    }

    // Show Toast Zalo/SMS Message
    function showSmsToast(header, message, actionText = null, actionCallback = null) {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        
        let actionHtml = '';
        if (actionText && actionText !== '') {
            actionHtml = `<p><a href="#" class="toast-action">${actionText}</a></p>`;
        }

        toast.innerHTML = `
            <div class="toast-header">💬 SMS GATEWAY • ${header}</div>
            <div class="toast-body">
                <p>${message}</p>
                ${actionHtml}
            </div>
        `;
        
        toastContainer.appendChild(toast);

        // Click Action callback
        if (actionCallback) {
            const actionLink = toast.querySelector('.toast-action');
            if (actionLink) {
                actionLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    actionCallback();
                    toast.remove();
                });
            }
        }

        // Auto remove toast after 10 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            setTimeout(() => toast.remove(), 400);
        }, 10000);
    }

    // Show success toast (green, non-SMS)
    function showToastSuccess(message) {
        if (!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = 'toast-message toast-success';
        toast.innerHTML = `
            <div class="toast-header" style="background:linear-gradient(135deg,#16a34a,#15803d);">✅ THÀNH CÔNG</div>
            <div class="toast-body"><p>${message}</p></div>
        `;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(50px)';
            setTimeout(() => toast.remove(), 400);
        }, 4000);
    }

    // Update Header states
    function updateHeaderState() {
        const loggedInPhone = getLoggedInUser();
        const navLoginBtn = document.querySelector('.login-btn');
        
        if (!navLoginBtn) return;

        if (loggedInPhone) {
            const users = getUsersList();
            const user = users.find(u => u.phone === loggedInPhone);
            if (user) {
                const initials = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
                navLoginBtn.href = _url('dashboard');
                navLoginBtn.innerHTML = `
                    <div style="display:flex; align-items:center; gap:8px;">
                        <div style="width:28px; height:28px; border-radius:50%; background-color:var(--color-accent); color:var(--color-primary-dark); display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700;">${initials}</div>
                        <span style="font-size:0.85rem; font-weight:600; color:#ffffff;">${user.name.split(' ').pop()} | <span style="color:var(--color-accent);">${user.points}P</span></span>
                    </div>
                `;
                return;
            }
        }
        
        // Return to standard login button pointing to login page
        navLoginBtn.href = _url('login');
        navLoginBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
            <span>Đăng nhập</span>
        `;
    }

    // Run header state check on all pages
    updateHeaderState();

    // ==========================================================================
    // 1. HOME PAGE SPECIFIC LOGIC (index.html)
    // ==========================================================================
    if (isHomePage) {
        const bookingForm = document.getElementById('bookingForm');
        if (bookingForm) {
            bookingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                const phone = document.getElementById('bookingPhone').value.trim();
                const name = document.getElementById('bookingName').value.trim();
                const service = document.getElementById('bookingService').value;

                if (!phone || !name) return;

                const users = getUsersList();
                let user = users.find(u => u.phone === phone);
                
                const newBooking = {
                    id: 'BK-' + Math.floor(1000 + Math.random() * 9000),
                    service: service,
                    date: new Date().toLocaleDateString('vi-VN'),
                    time: '10:00 (Hôm nay)',
                    status: 'Đã xác nhận'
                };

                if (!user) {
                    // Create temporary guest profile
                    user = {
                        phone: phone,
                        name: name,
                        password: '', // blank password until activation
                        points: 0,
                        membership: 'Hạng Bạc',
                        isTemporary: true,
                        bookings: [newBooking]
                    };
                    users.push(user);
                    saveUsersList(users);

                    // Send SMS Toast notification with Activation URL Link
                    setTimeout(() => {
                        showSmsToast('CHÀO MỪNG KHÁCH MỚI', `Cảm ơn bạn đã đặt lịch tại PawPal. Nhấn vào đây để thiết lập mật khẩu, kích hoạt tài khoản chính thức và nhận ngay <strong>50 Paw Points</strong>.`, 'Thiết lập mật khẩu ngay', () => {
                            window.location.href = _url('login') + `?activate=${phone}`;
                        });
                    }, 2000);

                } else {
                    // Add booking to existing user
                    user.bookings.push(newBooking);
                    saveUsersList(users);
                }

                alert('Đặt lịch thành công! PawPal sẽ gửi xác nhận qua SMS/Zalo sau vài giây.');
                bookingForm.reset();
                const bookingWidget = document.getElementById('booking');
                if (bookingWidget) {
                    bookingWidget.classList.remove('open');
                }
            });
        }
    }

    // ==========================================================================
    // 2. LOGIN PAGE SPECIFIC LOGIC (login.html)
    // ==========================================================================
    if (isLoginPage) {
        // --- GUARD: Nếu đã đăng nhập thì redirect thẳng về dashboard ---
        if (getLoggedInUser()) {
            window.location.href = _url('dashboard');
            return;
        }

        const tabLoginBtn = document.getElementById('tabLoginBtn');
        const tabRegisterBtn = document.getElementById('tabRegisterBtn');
        const registerFormContainer = document.getElementById('registerFormContainer');
        const forgetPassContainer = document.getElementById('forgetPassContainer');
        const forgetPassBtn = document.getElementById('forgetPassBtn');
        const backToLoginBtn = document.getElementById('backToLoginBtn');
        const authPageTabs = document.getElementById('authPageTabs');
        const activationFormContainer = document.getElementById('activationFormContainer');

        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const forgetPassForm = document.getElementById('forgetPassForm');
        const activationForm = document.getElementById('activationForm');

        // Form switching
        safeBind(tabLoginBtn, 'click', showLoginForm);
        safeBind(tabRegisterBtn, 'click', showRegisterForm);
        safeBind(forgetPassBtn, 'click', showForgetPassForm);
        safeBind(backToLoginBtn, 'click', showLoginForm);

        // Tab Admin
        const tabAdminBtn = document.getElementById('tabAdminBtn');
        const adminFormContainer = document.getElementById('adminFormContainer');
        safeBind(tabAdminBtn, 'click', showAdminLoginForm);

        function showAdminLoginForm() {
            if (tabLoginBtn) tabLoginBtn.classList.remove('active');
            if (tabRegisterBtn) tabRegisterBtn.classList.remove('active');
            if (tabAdminBtn) tabAdminBtn.classList.add('active');
            if (loginFormContainer) loginFormContainer.classList.remove('active');
            if (registerFormContainer) registerFormContainer.classList.remove('active');
            if (forgetPassContainer) forgetPassContainer.classList.remove('active');
            if (activationFormContainer) activationFormContainer.classList.remove('active');
            if (adminFormContainer) adminFormContainer.classList.add('active');
            if (authPageTabs) authPageTabs.style.display = 'flex';
            setTimeout(() => document.getElementById('adminPhone')?.focus(), 100);
        }

        function showLoginForm() {
            if (tabLoginBtn) tabLoginBtn.classList.add('active');
            if (tabRegisterBtn) tabRegisterBtn.classList.remove('active');
            if (loginFormContainer) loginFormContainer.classList.add('active');
            if (registerFormContainer) registerFormContainer.classList.remove('active');
            if (forgetPassContainer) forgetPassContainer.classList.remove('active');
            if (activationFormContainer) activationFormContainer.classList.remove('active');
            if (authPageTabs) authPageTabs.style.display = 'flex';
        }

        function showRegisterForm() {
            if (tabLoginBtn) tabLoginBtn.classList.remove('active');
            if (tabRegisterBtn) tabRegisterBtn.classList.add('active');
            if (loginFormContainer) loginFormContainer.classList.remove('active');
            if (registerFormContainer) registerFormContainer.classList.add('active');
            if (forgetPassContainer) forgetPassContainer.classList.remove('active');
            if (activationFormContainer) activationFormContainer.classList.remove('active');
            if (authPageTabs) authPageTabs.style.display = 'flex';
        }

        function showForgetPassForm() {
            if (loginFormContainer) loginFormContainer.classList.remove('active');
            if (registerFormContainer) registerFormContainer.classList.remove('active');
            if (forgetPassContainer) forgetPassContainer.classList.add('active');
            if (activationFormContainer) activationFormContainer.classList.remove('active');
            if (authPageTabs) authPageTabs.style.display = 'none';
        }

        function showActivationForm(phone, name) {
            if (loginFormContainer) loginFormContainer.classList.remove('active');
            if (registerFormContainer) registerFormContainer.classList.remove('active');
            if (forgetPassContainer) forgetPassContainer.classList.remove('active');
            if (activationFormContainer) activationFormContainer.classList.add('active');
            if (authPageTabs) authPageTabs.style.display = 'none';

            const activationName = document.getElementById('activationName');
            if (activationName) activationName.textContent = name;
            if (activationForm) activationForm.dataset.phone = phone;
        }

        // --- Form validations ---
        const registerPhone = document.getElementById('registerPhone');
        const registerPassword = document.getElementById('registerPassword');
        const registerConfirmPassword = document.getElementById('registerConfirmPassword');
        const registerSubmitBtn = document.getElementById('registerSubmitBtn');
        const registerPhoneError = document.getElementById('registerPhoneError');
        const registerPasswordError = document.getElementById('registerPasswordError');

        if (registerForm) {
            registerPhone.addEventListener('input', validateRegisterForm);
            registerPassword.addEventListener('input', validateRegisterForm);
            registerConfirmPassword.addEventListener('input', validateRegisterForm);
        }

        function validateRegisterForm() {
            const phone = registerPhone.value.trim();
            const pass = registerPassword.value;
            const confirmPass = registerConfirmPassword.value;
            
            let phoneValid = false;
            let passMatch = false;

            if (phone.length > 0) {
                const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
                if (phoneRegex.test(phone)) {
                    registerPhoneError.style.display = 'none';
                    phoneValid = true;
                } else {
                    registerPhoneError.style.display = 'block';
                    phoneValid = false;
                }
            } else {
                registerPhoneError.style.display = 'none';
            }

            if (confirmPass.length > 0) {
                if (pass === confirmPass) {
                    registerPasswordError.style.display = 'none';
                    passMatch = true;
                } else {
                    registerPasswordError.style.display = 'block';
                    passMatch = false;
                }
            } else {
                registerPasswordError.style.display = 'none';
            }

            if (phoneValid && passMatch && pass.length >= 8 && document.getElementById('registerName').value.trim() !== '') {
                registerSubmitBtn.removeAttribute('disabled');
            } else {
                registerSubmitBtn.setAttribute('disabled', 'true');
            }
        }

        // --- Activation password check ---
        const activationPassword = document.getElementById('activationPassword');
        const activationConfirmPassword = document.getElementById('activationConfirmPassword');
        const activationStrengthBar = document.getElementById('activationStrengthBar');
        const activationStrengthLabel = document.getElementById('activationStrengthLabel');
        const activationSubmitBtn = document.getElementById('activationSubmitBtn');
        const activationPasswordError = document.getElementById('activationPasswordError');

        if (activationPassword) {
            activationPassword.addEventListener('input', () => {
                const val = activationPassword.value;
                const strength = getPasswordStrength(val);
                updateStrengthBar(activationStrengthBar, activationStrengthLabel, strength);
                validateActivationForm();
            });
            activationConfirmPassword.addEventListener('input', validateActivationForm);
        }

        function validateActivationForm() {
            const pass = activationPassword.value;
            const confirmPass = activationConfirmPassword.value;
            const strength = getPasswordStrength(pass);

            let match = false;
            if (confirmPass.length > 0) {
                if (pass === confirmPass) {
                    activationPasswordError.style.display = 'none';
                    match = true;
                } else {
                    activationPasswordError.style.display = 'block';
                    match = false;
                }
            } else {
                activationPasswordError.style.display = 'none';
            }

            if (match && strength >= 2 && pass.length >= 8) {
                activationSubmitBtn.removeAttribute('disabled');
            } else {
                activationSubmitBtn.setAttribute('disabled', 'true');
            }
        }

        // --- OTP Dialog handler ---
        const otpVerifyModal = document.getElementById('otpVerifyModal');
        const verifyOtpBtn = document.getElementById('verifyOtpBtn');
        const resendOtpBtn = document.getElementById('resendOtpBtn');
        const otpSingleInput = document.getElementById('otpSingleInput');
        const otpTimerText = document.getElementById('otpTimerText');
        const resendCountdown = document.getElementById('resendCountdown');
        const cancelOtpBtn = document.getElementById('cancelOtpBtn');
        let otpFailCount = 0;

        safeBind(cancelOtpBtn, 'click', () => {
            otpVerifyModal.classList.remove('open');
            currentOtp = null;
            otpFailCount = 0;
        });

        function launchOtpVerification(phone, mode) {
            currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
            otpFailCount = 0;

            // Gửi SMS toast — click để auto-fill
            setTimeout(() => {
                showSmsToast('XÁC THỰC OTP', `Mã OTP của bạn là: <strong style="font-size:1.15rem; color:var(--color-accent);">${currentOtp}</strong> (hiệu lực 5 phút).`, 'Nhập nhanh OTP', () => {
                    if (otpSingleInput) {
                        otpSingleInput.value = currentOtp;
                        otpSingleInput.classList.add('is-valid');
                        verifyOtpBtn.removeAttribute('disabled');
                    }
                });
            }, 800);

            // Reset input
            if (otpSingleInput) {
                otpSingleInput.value = '';
                otpSingleInput.classList.remove('is-valid', 'is-error');
            }
            verifyOtpBtn.setAttribute('disabled', 'true');
            otpVerifyModal.classList.add('open');
            setTimeout(() => otpSingleInput?.focus(), 300);

            // Live validate khi gõ
            if (otpSingleInput) {
                otpSingleInput.oninput = () => {
                    const val = otpSingleInput.value.replace(/\D/g, '').slice(0, 6);
                    otpSingleInput.value = val;
                    otpSingleInput.classList.remove('is-valid', 'is-error');
                    if (val.length === 6) {
                        verifyOtpBtn.removeAttribute('disabled');
                    } else {
                        verifyOtpBtn.setAttribute('disabled', 'true');
                    }
                };
                // Enter = submit
                otpSingleInput.onkeydown = (e) => {
                    if (e.key === 'Enter' && otpSingleInput.value.length === 6) {
                        verifyOtpBtn.click();
                    }
                };
            }

            // 5 mins countdown
            let totalSeconds = 300;
            clearInterval(otpTimerInterval);
            if (otpTimerText) otpTimerText.textContent = '05:00';
            otpTimerInterval = setInterval(() => {
                totalSeconds--;
                const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
                const secs = (totalSeconds % 60).toString().padStart(2, '0');
                if (otpTimerText) otpTimerText.textContent = `${mins}:${secs}`;
                
                if (totalSeconds <= 0) {
                    clearInterval(otpTimerInterval);
                    currentOtp = null;
                    if (otpSingleInput) {
                        otpSingleInput.value = '';
                        otpSingleInput.classList.remove('is-valid', 'is-error');
                    }
                    verifyOtpBtn.setAttribute('disabled', 'true');
                    otpVerifyModal.classList.remove('open');
                    showSmsToast('OTP HẾT HẠN', 'Mã OTP đã hết hiệu lực. Vui lòng nhấn "Gửi lại mã" để nhận mã mới.');
                }
            }, 1000);

            // 60s resend lock
            let resendSeconds = 60;
            resendOtpBtn.setAttribute('disabled', 'true');
            if (resendCountdown) resendCountdown.textContent = '60';
            resendOtpBtn.textContent = `Gửi lại mã (60s)`;
            clearInterval(resendTimerInterval);
            
            resendTimerInterval = setInterval(() => {
                resendSeconds--;
                if (resendCountdown) resendCountdown.textContent = resendSeconds;
                resendOtpBtn.textContent = `Gửi lại mã (${resendSeconds}s)`;
                if (resendSeconds <= 0) {
                    clearInterval(resendTimerInterval);
                    resendOtpBtn.removeAttribute('disabled');
                    resendOtpBtn.textContent = 'Gửi lại mã';
                }
            }, 1000);

            resendOtpBtn.onclick = () => launchOtpVerification(phone, mode);

            verifyOtpBtn.onclick = () => {
                const enteredOtp = otpSingleInput ? otpSingleInput.value.trim() : '';

                // Lock sau 3 lần sai — theo quy trình 3.1.2
                if (otpFailCount >= 3) {
                    showSmsToast('TÀI KHOẢN TẠM KHÓA', 'Bạn đã nhập sai OTP quá 3 lần. Vui lòng thử lại sau 15 phút.');
                    otpVerifyModal.classList.remove('open');
                    currentOtp = null;
                    return;
                }

                if (enteredOtp === currentOtp) {
                    clearInterval(otpTimerInterval);
                    clearInterval(resendTimerInterval);
                    if (otpSingleInput) otpSingleInput.classList.add('is-valid');
                    otpFailCount = 0;

                    setTimeout(() => {
                        otpVerifyModal.classList.remove('open');
                    }, 400);
                    
                    if (mode === 'register') {
                        const newUser = {
                            phone: registerPhone.value.trim(),
                            name: document.getElementById('registerName').value.trim(),
                            password: registerPassword.value,
                            points: 50,
                            membership: 'Hạng Bạc',
                            isTemporary: false,
                            bookings: []
                        };
                        const users = getUsersList();
                        users.push(newUser);
                        saveUsersList(users);

                        setLoggedInUser(newUser.phone);
                        const welcomeGiftModal = document.getElementById('welcomeGiftModal');
                        if (welcomeGiftModal) welcomeGiftModal.classList.add('open');
                    } else if (mode === 'loginOtp') {
                        const phoneVal = document.getElementById('loginPhone').value.trim();
                        let users = getUsersList();
                        let user = users.find(u => u.phone === phoneVal);
                        
                        if (!user) {
                            user = {
                                phone: phoneVal,
                                name: 'Khách hàng',
                                password: '',
                                points: 0,
                                membership: 'Hạng Bạc',
                                isTemporary: true,
                                bookings: []
                            };
                            users.push(user);
                            saveUsersList(users);
                        }
                        
                        setLoggedInUser(phoneVal);
                        showToastSuccess('Đăng nhập thành công! Đang chuyển hướng...');
                        setTimeout(() => { window.location.href = _url('dashboard'); }, 1200);
                    }
                } else {
                    otpFailCount++;
                    if (otpSingleInput) {
                        otpSingleInput.classList.add('is-error');
                        otpSingleInput.value = '';
                        setTimeout(() => {
                            otpSingleInput.classList.remove('is-error');
                            otpSingleInput.focus();
                        }, 600);
                    }
                    const remaining = 3 - otpFailCount;
                    if (remaining > 0) {
                        showSmsToast('OTP SAI', `Mã OTP không chính xác. Còn ${remaining} lần thử.`);
                    }
                }
            };
        }

        // --- Register submit ---
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = registerPhone.value.trim();
            const users = getUsersList();
            if (users.find(u => u.phone === phone)) {
                alert('Số điện thoại đăng ký đã tồn tại trong hệ thống.');
                return;
            }
            launchOtpVerification(phone, 'register');
        });

        // --- Login Toggle and Submit ---
        const toggleLoginMethodBtn = document.getElementById('toggleLoginMethodBtn');
        const loginPasswordGroup = document.getElementById('loginPasswordGroup');
        const loginOtpGroup = document.getElementById('loginOtpGroup');
        const sendOtpLoginBtn = document.getElementById('sendOtpLoginBtn');
        let isOtpLogin = false;

        safeBind(toggleLoginMethodBtn, 'click', () => {
            isOtpLogin = !isOtpLogin;
            if (isOtpLogin) {
                loginPasswordGroup.style.display = 'none';
                loginOtpGroup.style.display = 'block';
                toggleLoginMethodBtn.textContent = 'Đăng nhập bằng mật khẩu';
            } else {
                loginPasswordGroup.style.display = 'block';
                loginOtpGroup.style.display = 'none';
                toggleLoginMethodBtn.textContent = 'Đăng nhập bằng OTP';
            }
        });

        safeBind(sendOtpLoginBtn, 'click', () => {
            const phone = document.getElementById('loginPhone').value.trim();
            if (!phone || phone.length < 10) {
                alert('Vui lòng nhập số điện thoại hợp lệ.');
                return;
            }
            launchOtpVerification(phone, 'loginOtp');
        });

        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = document.getElementById('loginPhone').value.trim();
            const loginPhoneError = document.getElementById('loginPhoneError');
            const loginPasswordError = document.getElementById('loginPasswordError');

            if (isCurrentlyLocked()) {
                alert('Tài khoản hiện đang bị khóa tạm thời.');
                return;
            }

            const users = getUsersList();
            const user = users.find(u => u.phone === phone);

            if (!user) {
                loginPhoneError.textContent = 'Số điện thoại chưa được đăng ký.';
                loginPhoneError.style.display = 'block';
                // Hiện nút "Đăng ký ngay"
                const registerPrompt = document.getElementById('registerPrompt');
                if (registerPrompt) registerPrompt.style.display = 'flex';
                return;
            } else {
                loginPhoneError.style.display = 'none';
                const registerPrompt = document.getElementById('registerPrompt');
                if (registerPrompt) registerPrompt.style.display = 'none';
            }

            if (isOtpLogin) {
                alert('Vui lòng click nút "Gửi OTP" và điền mã để hoàn thành.');
                return;
            }

            // Xác thực mật khẩu
            if (user.password === document.getElementById('loginPassword').value) {
                loginFailedCount[phone] = 0;

                // Kiểm tra thiết bị lạ (suspicious login)
                const knownDeviceKey = `pawpal_known_device_${phone}`;
                const deviceFingerprint = `${navigator.userAgent}|${screen.width}x${screen.height}`;
                const knownDevice = localStorage.getItem(knownDeviceKey);
                if (!knownDevice) {
                    localStorage.setItem(knownDeviceKey, deviceFingerprint);
                } else if (knownDevice !== deviceFingerprint) {
                    sessionStorage.setItem('pawpal_suspicious_login', '1');
                    showSmsToast('CẢNH BÁO BẢO MẬT', `Phát hiện đăng nhập bất thường vào tài khoản PawPal của bạn từ thiết bị mới. Nếu không phải bạn, hãy đổi mật khẩu ngay.`);
                    localStorage.setItem(knownDeviceKey, deviceFingerprint);
                }

                setLoggedInUser(phone);
                // Ghi nhận lịch sử đăng nhập
                const users2 = getUsersList();
                const u2 = users2.find(usr => usr.phone === phone);
                if (u2) {
                    u2.loginHistory = u2.loginHistory || [];
                    u2.loginHistory.push({
                        time: new Date().toLocaleString('vi-VN'),
                        device: navigator.userAgent.includes('Mobile') ? 'Thiết bị di động' : 'Máy tính',
                        location: 'Việt Nam',
                        suspicious: sessionStorage.getItem('pawpal_suspicious_login') === '1',
                    });
                    if (u2.loginHistory.length > 10) u2.loginHistory = u2.loginHistory.slice(-10);
                    saveUsersList(users2);
                }

                showToastSuccess('Đăng nhập thành công! Đang chuyển hướng...');
                setTimeout(() => { window.location.href = _url('dashboard'); }, 1200);
            } else {
                loginFailedCount[phone] = (loginFailedCount[phone] || 0) + 1;
                if (loginFailedCount[phone] >= 5) {
                    lockAccount(phone);
                } else {
                    loginPasswordError.textContent = `Mật khẩu không chính xác. (Sai ${loginFailedCount[phone]}/5 lần)`;
                    loginPasswordError.style.display = 'block';
                }
            }
        });

        // --- Password Recovery Submit ---
        forgetPassForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = document.getElementById('forgetPhone').value.trim();
            const forgetPhoneErrEl = document.getElementById('forgetPhoneError');
            const users = getUsersList();
            const user = users.find(u => u.phone === phone);

            if (!user) {
                if (forgetPhoneErrEl) {
                    forgetPhoneErrEl.textContent = 'Số điện thoại này chưa có tài khoản trong hệ thống.';
                    forgetPhoneErrEl.style.display = 'block';
                }
                return;
            }

            if (forgetPhoneErrEl) forgetPhoneErrEl.style.display = 'none';

            setTimeout(() => {
                showSmsToast('KHÔI PHỤC MẬT KHẨU', `Yêu cầu lấy lại mật khẩu. Click vào link này để đặt mật khẩu mới: ${_url('login')}?activate=${phone}`, 'Khôi phục mật khẩu ngay', () => {
                    showActivationForm(phone, user.name);
                });
            }, 1200);

            showToastSuccess('Liên kết khôi phục đã được gửi qua SMS. Vui lòng kiểm tra điện thoại.');
        });

        // --- Activation Submit (Set password first time) ---
        activationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = activationForm.dataset.phone;
            const pass = activationPassword.value;

            let users = getUsersList();
            let user = users.find(u => u.phone === phone);

            if (user) {
                user.password = pass;
                user.isTemporary = false;
                user.points = user.points + 50;
                saveUsersList(users);

                setLoggedInUser(phone);
                const welcomeGiftModal = document.getElementById('welcomeGiftModal');
                if (welcomeGiftModal) welcomeGiftModal.classList.add('open');
            }
        });

        // Close Welcome Gift redirection
        const closeGiftBtn = document.getElementById('closeGiftBtn');
        safeBind(closeGiftBtn, 'click', () => {
            window.location.href = _url('dashboard');
        });

        // --- Admin Login Form Submit ---
        const adminLoginForm = document.getElementById('adminLoginForm');
        if (adminLoginForm) {
            adminLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const phone = document.getElementById('adminPhone').value.trim();
                const pass  = document.getElementById('adminPassword').value;
                const phoneErr = document.getElementById('adminPhoneError');
                const passErr  = document.getElementById('adminPasswordError');

                phoneErr.style.display = 'none';
                passErr.style.display  = 'none';

                const users = getUsersList();
                const user  = users.find(u => u.phone === phone);

                if (!user) {
                    phoneErr.textContent = 'Số điện thoại chưa được đăng ký.';
                    phoneErr.style.display = 'block';
                    return;
                }
                if (user.password !== pass) {
                    passErr.textContent = 'Mật khẩu không chính xác.';
                    passErr.style.display = 'block';
                    return;
                }

                // Lưu session admin và redirect
                sessionStorage.setItem('pawpal_admin_phone', phone);
                window.location.href = _url('admin');
            });
        }

        // Lock state helpers
        function lockAccount(phone) {
            const lockUntil = Date.now() + 30 * 60 * 1000;
            localStorage.setItem('pawpal_lock_until', lockUntil.toString());
            localStorage.setItem('pawpal_locked_phone', phone);
            const lockOverlay = document.getElementById('lockOverlay');
            if (lockOverlay) lockOverlay.classList.add('open');
            startLockCountdown(lockUntil);
        }

        function checkLockState() {
            const lockUntil = localStorage.getItem('pawpal_lock_until');
            if (lockUntil) {
                const timeRemaining = parseInt(lockUntil) - Date.now();
                const lockOverlay = document.getElementById('lockOverlay');
                if (timeRemaining > 0) {
                    if (lockOverlay) lockOverlay.classList.add('open');
                    startLockCountdown(parseInt(lockUntil));
                } else {
                    localStorage.removeItem('pawpal_lock_until');
                    localStorage.removeItem('pawpal_locked_phone');
                    if (lockOverlay) lockOverlay.classList.remove('open');
                }
            }
        }

        function isCurrentlyLocked() {
            const lockUntil = localStorage.getItem('pawpal_lock_until');
            if (lockUntil) {
                return (parseInt(lockUntil) - Date.now()) > 0;
            }
            return false;
        }

        function startLockCountdown(untilTime) {
            const lockTimerText = document.getElementById('lockTimerText');
            clearInterval(lockTimerInterval);
            
            const updateTimer = () => {
                const remaining = untilTime - Date.now();
                if (remaining <= 0) {
                    clearInterval(lockTimerInterval);
                    localStorage.removeItem('pawpal_lock_until');
                    localStorage.removeItem('pawpal_locked_phone');
                    const lockOverlay = document.getElementById('lockOverlay');
                    if (lockOverlay) lockOverlay.classList.remove('open');
                } else {
                    const totalSecs = Math.floor(remaining / 1000);
                    const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
                    const secs = (totalSecs % 60).toString().padStart(2, '0');
                    if (lockTimerText) lockTimerText.textContent = `${mins}:${secs}`;
                }
            };

            updateTimer();
            lockTimerInterval = setInterval(updateTimer, 1000);
        }

        // --- URL Parameter Action checks ---
        function checkUrlParams() {
            const urlParams = new URLSearchParams(window.location.search);
            const activatePhone = urlParams.get('activate');
            if (activatePhone) {
                const users = getUsersList();
                const user = users.find(u => u.phone === activatePhone);
                if (user) {
                    // Hiện form activation cho cả tài khoản tạm lẫn tài khoản quên mật khẩu
                    setTimeout(() => {
                        showActivationForm(user.phone, user.name);
                    }, 500);
                }
            }
        }

        checkLockState();
        checkUrlParams();

        // Tự động mở tab Admin nếu có ?tab=admin trong URL
        const urlTabParam = new URLSearchParams(window.location.search).get('tab');
        if (urlTabParam === 'admin') {
            showAdminLoginForm();
        }

        // ── "Đăng ký ngay" button trong register prompt ──────────────────────
        const registerNowBtn = document.getElementById('registerNowBtn');
        safeBind(registerNowBtn, 'click', () => {
            // Prefill SĐT vào form đăng ký nếu đã nhập
            const phoneVal = document.getElementById('loginPhone').value.trim();
            showRegisterForm();
            if (phoneVal) {
                const regPhone = document.getElementById('registerPhone');
                if (regPhone) {
                    regPhone.value = phoneVal;
                    validateRegisterForm();
                }
            }
        });

        // ── Validation form quên mật khẩu ────────────────────────────────────
        const forgetPhoneInput = document.getElementById('forgetPhone');
        const forgetPhoneError = document.getElementById('forgetPhoneError');
        const forgetPassSubmitBtn = document.getElementById('forgetPassSubmitBtn');

        if (forgetPhoneInput) {
            forgetPhoneInput.addEventListener('input', () => {
                const val = forgetPhoneInput.value.trim();
                const phoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
                if (val.length === 0) {
                    forgetPhoneError.style.display = 'none';
                    if (forgetPassSubmitBtn) forgetPassSubmitBtn.setAttribute('disabled', 'true');
                } else if (!phoneRegex.test(val)) {
                    forgetPhoneError.textContent = 'Số điện thoại không đúng định dạng Việt Nam (10 số, bắt đầu 03/05/07/08/09).';
                    forgetPhoneError.style.display = 'block';
                    if (forgetPassSubmitBtn) forgetPassSubmitBtn.setAttribute('disabled', 'true');
                } else {
                    forgetPhoneError.style.display = 'none';
                    if (forgetPassSubmitBtn) forgetPassSubmitBtn.removeAttribute('disabled');
                }
            });
        }

        // ── Suspicious Login Banner ───────────────────────────────────────────
        function checkSuspiciousLogin() {
            const flag = sessionStorage.getItem('pawpal_suspicious_login');
            if (flag === '1') {
                const banner = document.getElementById('suspiciousBanner');
                if (banner) {
                    banner.style.display = 'block';
                    sessionStorage.removeItem('pawpal_suspicious_login');
                }
            }
        }

        const dismissBannerBtn = document.getElementById('dismissBannerBtn');
        safeBind(dismissBannerBtn, 'click', () => {
            const banner = document.getElementById('suspiciousBanner');
            if (banner) {
                banner.style.animation = 'bannerSlideOut 0.3s ease forwards';
                setTimeout(() => { banner.style.display = 'none'; }, 300);
            }
        });

        const changePassFromBannerBtn = document.getElementById('changePassFromBannerBtn');
        safeBind(changePassFromBannerBtn, 'click', () => {
            window.location.href = _url('dashboard') + '?tab=security';
        });

        checkSuspiciousLogin();

    } // end if (isLoginPage)

    // ==========================================================================
    // 3. DASHBOARD PAGE SPECIFIC LOGIC (dashboard.html)
    // ==========================================================================
    if (isDashboardPage) {
        // --- ROUTE GUARD ---
        const loggedInPhone = getLoggedInUser();
        if (!loggedInPhone) {
            window.location.href = _url('login');
            return;
        }

        // Get user profile
        const users = getUsersList();
        const user = users.find(u => u.phone === loggedInPhone);

        // Bind logout
        const dashboardLogoutBtn = document.getElementById('dashboardLogoutBtn');
        safeBind(dashboardLogoutBtn, 'click', logoutUser);

        // Tab switches
        const dashTabBtns = document.querySelectorAll('.dash-tab-btn');
        const dashTabContents = document.querySelectorAll('.dash-tab-content');

        dashTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-dash-tab');
                dashTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                dashTabContents.forEach(c => c.classList.remove('active'));
                const contentEl = document.getElementById(tabId);
                if (contentEl) contentEl.classList.add('active');
            });
        });

        // Render profile fields
        if (user) {
            const dashNames = document.querySelectorAll('#dashName');
            const dashPhones = document.querySelectorAll('#dashPhone');
            const dashPoints = document.querySelectorAll('#dashPoints');
            const dashBadges = document.querySelectorAll('#dashBadge');
            const dashAvatars = document.querySelectorAll('#dashAvatar');

            dashNames.forEach(el => { el.textContent = user.name; });
            dashPhones.forEach(el => { el.textContent = formatPhone(user.phone); });
            dashPoints.forEach(el => { el.textContent = `${user.points} Points`; });
            dashBadges.forEach(el => { el.textContent = user.membership; });
            dashAvatars.forEach(el => { el.textContent = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(); });

            // Handle temporary restrictions
            const redeemPointsBtns = document.querySelectorAll('#redeemPointsBtn');
            const redeemRestrictedNotes = document.querySelectorAll('#redeemRestrictedNote');
            const oldPasswordGroup = document.getElementById('oldPasswordGroup');
            const securityTabTitle = document.getElementById('securityTabTitle');

            if (user.isTemporary) {
                redeemPointsBtns.forEach(btn => { btn.setAttribute('disabled', 'true'); });
                redeemRestrictedNotes.forEach(note => { note.style.display = 'block'; });
                if (securityTabTitle) securityTabTitle.textContent = 'Thiết lập mật khẩu lần đầu';
                if (oldPasswordGroup) oldPasswordGroup.style.display = 'none';
            } else {
                redeemPointsBtns.forEach(btn => { btn.removeAttribute('disabled'); });
                redeemRestrictedNotes.forEach(note => { note.style.display = 'none'; });
                if (securityTabTitle) securityTabTitle.textContent = 'Cấu hình mật khẩu';
                if (oldPasswordGroup) oldPasswordGroup.style.display = 'block';
            }

            renderDashboardBookings(user.bookings);
        }

        // Change password strength inside Dashboard
        const newPassword = document.getElementById('newPassword');
        const confirmNewPassword = document.getElementById('confirmNewPassword');
        const newPasswordStrengthBar = document.getElementById('newPasswordStrengthBar');
        const newPasswordStrengthLabel = document.getElementById('newPasswordStrengthLabel');
        const newPasswordError = document.getElementById('newPasswordError');
        const changePasswordSubmitBtn = document.getElementById('changePasswordSubmitBtn');

        if (newPassword) {
            newPassword.addEventListener('input', () => {
                const val = newPassword.value;
                const strength = getPasswordStrength(val);
                updateStrengthBar(newPasswordStrengthBar, newPasswordStrengthLabel, strength);
                validateChangePasswordForm();
            });
            confirmNewPassword.addEventListener('input', validateChangePasswordForm);
        }

        function validateChangePasswordForm() {
            const pass = newPassword.value;
            const confirmPass = confirmNewPassword.value;
            const strength = getPasswordStrength(pass);

            let match = false;
            if (confirmPass.length > 0) {
                if (pass === confirmPass) {
                    newPasswordError.style.display = 'none';
                    match = true;
                } else {
                    newPasswordError.style.display = 'block';
                    match = false;
                }
            } else {
                newPasswordError.style.display = 'none';
            }

            if (match && strength >= 2 && pass.length >= 8) {
                changePasswordSubmitBtn.removeAttribute('disabled');
            } else {
                changePasswordSubmitBtn.setAttribute('disabled', 'true');
            }
        }

        // Change Password form submit
        const changePasswordForm = document.getElementById('changePasswordForm');
        if (changePasswordForm) {
            changePasswordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                let users = getUsersList();
                let u = users.find(usr => usr.phone === loggedInPhone);
                if (!u) return;

                const oldPassVal = document.getElementById('oldPassword').value;
                const newPassVal = newPassword.value;

                if (u.isTemporary) {
                    u.password = newPassVal;
                    u.isTemporary = false;
                    u.points = u.points + 50;
                    saveUsersList(users);
                    alert('Thiết lập mật khẩu thành công! Nhận quà chào mừng 50 Points.');
                    window.location.reload();
                } else {
                    if (u.password !== oldPassVal) {
                        alert('Mật khẩu cũ không chính xác.');
                        return;
                    }
                    u.password = newPassVal;
                    saveUsersList(users);
                    alert('Thay đổi mật khẩu thành công!');
                    changePasswordForm.reset();
                    updateStrengthBar(newPasswordStrengthBar, newPasswordStrengthLabel, 0);
                }
            });
        }

        // Send OTP button in security tab
        const sendOtpSecurityBtn = document.getElementById('sendOtpSecurityBtn');
        safeBind(sendOtpSecurityBtn, 'click', () => {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            showSmsToast('OTP ĐỔI MẬT KHẨU', `Mã OTP đổi mật khẩu là: <strong style="font-size:1.1rem; color:var(--color-accent);">${otpCode}</strong>.`, 'Sử dụng OTP', () => {
                document.getElementById('oldPassword').value = user.password; // fill correct pass
                alert('Mã OTP xác thực thành công.');
            });
        });

        // Booking management
        function renderDashboardBookings(bookings) {
            const dashBookingsList = document.getElementById('dashBookingsList');
            const bookingEmpty = document.getElementById('bookingEmpty');
            if (!dashBookingsList) return;
            dashBookingsList.innerHTML = '';

            if (!bookings || bookings.length === 0) {
                if (bookingEmpty) dashBookingsList.appendChild(bookingEmpty);
                return;
            }

            bookings.forEach((bk, index) => {
                const canChange = canModifyBooking(bk) && !user.isTemporary && (bk.changeCount || 0) < 2;
                const canCancel = canCancelBooking(bk) && !user.isTemporary;
                const changeLabel = (bk.changeCount || 0) >= 2 ? 'Đã đạt giới hạn thay đổi' : 'Thay đổi lịch';

                const card = document.createElement('div');
                card.className = 'dash-booking-card';
                card.innerHTML = `
                    <div class="booking-card-info">
                        <h5 style="margin: 0 0 4px 0; font-family: var(--font-primary); font-size: 1rem; color: var(--color-primary-dark); font-weight: 700;">${bk.service || 'Chưa có dịch vụ'}</h5>
                        <p style="margin: 0; font-size: 0.85rem; color: var(--color-text-light);">📅 Ngày: ${bk.date || '—'} | ⏰ Khung giờ: ${bk.time || '—'}</p>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: var(--color-text-light);">Trạng thái: <strong style="color:var(--color-primary);">${bk.status}</strong></p>
                        ${bk.changeCount ? `<p style="margin: 4px 0 0 0; font-size: 0.8rem; color:#79797a;">Đã thay đổi ${bk.changeCount} lần</p>` : ''}
                    </div>
                    <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center; justify-content:flex-end;">
                        <button class="btn-change-booking-dash" data-index="${index}" ${canChange ? '' : 'disabled'}>${changeLabel}</button>
                        ${canCancel ? `<button class="btn-cancel-booking-dash" data-index="${index}">Hủy lịch</button>` : `<span style="font-size:0.78rem;color:#a3a3a3;">Không thể hủy</span>`}
                    </div>
                `;

                if (canChange) {
                    card.querySelector('.btn-change-booking-dash').addEventListener('click', () => {
                        openChangeBookingModal(bk);
                    });
                }

                const cancelBtn = card.querySelector('.btn-cancel-booking-dash');
                if (cancelBtn) {
                    cancelBtn.addEventListener('click', () => {
                        if (user.isTemporary) {
                            alert('Bạn phải thiết lập mật khẩu bảo mật trong tab Bảo mật trước khi tiến hành hủy lịch.');
                            return;
                        }
                        const confirmPass = prompt('Nhập mật khẩu tài khoản để xác nhận hủy lịch hẹn:');
                        if (confirmPass === user.password) {
                            if (!canCancel) {
                                alert('Quá thời gian cho phép hủy trực tuyến. Vui lòng liên hệ Admin để được hỗ trợ.');
                                return;
                            }
                            if (confirm('Bạn chắc chắn muốn hủy lịch hẹn chăm sóc này?')) {
                                bk.status = 'Đã hủy';
                                recordBookingAudit(bk, 'cancel', 'Hủy lịch trực tuyến');
                                saveCurrentUser(user);
                                renderDashboardBookings(user.bookings);
                                alert('Đã hủy lịch hẹn thành công.');
                            }
                        } else if (confirmPass !== null) {
                            alert('Mật khẩu không chính xác. Thao tác hủy lịch bị chặn.');
                        }
                    });
                }

                dashBookingsList.appendChild(card);
            });
        }

        function openChangeBookingModal(booking) {
            if (!booking) return;
            changeBookingState = {
                originalBooking: booking,
                selectedDate: null,
                selectedSlot: null,
                selectedStaffId: null,
                selectedStaffName: null,
                currentHoldId: null,
                holdTimer: null,
            };

            const modal = document.getElementById('bookingChangeModal');
            const overlay = document.getElementById('bookingChangeOverlay');
            const note = document.getElementById('changeBookingNote');
            const summary = document.getElementById('changeBookingSummary');
            const dateInput = document.getElementById('changeBookingDate');
            const confirmBtn = document.getElementById('changeBookingConfirmBtn');

            if (note) note.textContent = 'Lưu ý: khung giờ mới sẽ được giữ trong 15 phút. Nếu không xác nhận, lịch cũ sẽ vẫn được giữ nguyên.';
            if (summary) {
                summary.innerHTML = `
                    <div style="margin-bottom:12px;padding:14px;background:#f8fafc;border:1px solid #d1d5db;border-radius:12px;">
                        <strong>Thông tin lịch cũ</strong><br>
                        ${booking.service} — ${booking.date} lúc ${booking.time}<br>
                        Trạng thái: <strong>${booking.status}</strong>
                    </div>
                `;
            }
            if (dateInput) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.min = today;
                dateInput.value = booking.date.split('/').reverse().join('-');
                changeBookingState.selectedDate = dateInput.value;
            }
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Xác nhận thay đổi';
            }
            renderChangeTimeslotGrid();
            renderChangeStaffList();
            if (overlay) overlay.addEventListener('click', closeChangeBookingModal);
            document.getElementById('changeBookingCloseBtn').addEventListener('click', closeChangeBookingModal);
            document.getElementById('changeBookingCancelBtn').addEventListener('click', closeChangeBookingModal);
            if (dateInput) {
                dateInput.addEventListener('change', () => {
                    changeBookingState.selectedDate = dateInput.value;
                    releaseCurrentChangeHold();
                    renderChangeTimeslotGrid();
                    updateChangeBookingHoldBanner();
                });
            }
            if (modal) {
                modal.classList.add('open');
                document.body.style.overflow = 'hidden';
            }
        }

        function closeChangeBookingModal() {
            if (!changeBookingState) return;
            releaseCurrentChangeHold();
            stopChangeHoldCountdown();
            const modal = document.getElementById('bookingChangeModal');
            if (modal) modal.classList.remove('open');
            document.body.style.overflow = '';
            changeBookingState = null;
        }

        window._actualOpenChangeBookingModal = openChangeBookingModal;
        console.log('auth: actual openChangeBookingModal handler is ready');
        if (Array.isArray(window._queuedChangeBookingRequests) && window._queuedChangeBookingRequests.length) {
            console.log('auth: flushing queued change booking requests', window._queuedChangeBookingRequests.length);
            window._queuedChangeBookingRequests.forEach(q => {
                try { window._actualOpenChangeBookingModal(q); } catch (e) { console.error('auth: queued change booking request failed', e); }
            });
            window._queuedChangeBookingRequests = [];
        }

        function renderChangeTimeslotGrid() {
            const grid = document.getElementById('changeTimeslotGrid');
            if (!grid || !changeBookingState) return;
            grid.innerHTML = BOOKING_SLOTS.map(slot => {
                const busy = BOOKING_BUSY_SLOTS.includes(slot);
                const hold = getActiveHolds().find(h => h.date === changeBookingState.selectedDate && h.slot === slot && h.bookingId !== changeBookingState.originalBooking.id);
                const heldByOther = hold && hold.id !== changeBookingState.currentHoldId;
                const selected = changeBookingState.selectedSlot === slot;
                return `
                    <button class="timeslot-btn ${selected ? 'selected' : ''} ${heldByOther ? 'held' : ''}" type="button" data-slot="${slot}" ${busy || heldByOther ? 'disabled' : ''}>
                        ${slot}${busy ? '<br><small>Đầy</small>' : heldByOther ? '<br><small>Đang chờ</small>' : ''}
                    </button>`;
            }).join('');

            grid.querySelectorAll('.timeslot-btn:not(:disabled)').forEach(btn => {
                btn.addEventListener('click', () => {
                    changeBookingState.selectedSlot = btn.dataset.slot;
                    renderChangeTimeslotGrid();
                    updateChangeBookingHoldBanner();
                    maybeCreateChangeHold();
                });
            });
        }

        function renderChangeStaffList() {
            const list = document.getElementById('changeStaffList');
            if (!list || !changeBookingState) return;
            list.innerHTML = STAFF_MEMBERS.map(member => {
                const selected = changeBookingState.selectedStaffId === member.id;
                return `
                    <div class="staff-card ${selected ? 'selected' : ''}" data-id="${member.id}" role="button" tabindex="0">
                        <div class="staff-card-avatar">${member.name.slice(0, 1)}</div>
                        <div class="staff-card-info">
                            <h4>${member.name}</h4>
                            <p>${member.role}</p>
                        </div>
                        <div class="staff-card-status">${selected ? 'Đã chọn' : 'Chọn'}</div>
                    </div>`;
            }).join('');
            list.querySelectorAll('.staff-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = card.dataset.id;
                    const staff = STAFF_MEMBERS.find(s => s.id === id);
                    if (!staff) return;
                    changeBookingState.selectedStaffId = staff.id;
                    changeBookingState.selectedStaffName = staff.name;
                    renderChangeStaffList();
                    maybeCreateChangeHold();
                });
            });
        }

        function maybeCreateChangeHold() {
            if (!changeBookingState) return;
            if (!changeBookingState.selectedDate || !changeBookingState.selectedSlot || !changeBookingState.selectedStaffId) return;
            const key = getChangeHoldKey(changeBookingState.originalBooking.id, changeBookingState.selectedDate, changeBookingState.selectedSlot);
            const existing = getActiveHolds().find(h => h.key === key);
            if (existing && existing.id !== changeBookingState.currentHoldId) {
                alert('Khung giờ này đang được giữ bởi khách khác. Vui lòng chọn lịch khác.');
                return;
            }
            if (changeBookingState.currentHoldId) {
                const current = getActiveHolds().find(h => h.id === changeBookingState.currentHoldId);
                if (current && current.key !== key) {
                    releaseCurrentChangeHold();
                }
            }
            if (changeBookingState.currentHoldId) {
                const current = getActiveHolds().find(h => h.id === changeBookingState.currentHoldId);
                if (current) {
                    current.date = changeBookingState.selectedDate;
                    current.slot = changeBookingState.selectedSlot;
                    current.staffId = changeBookingState.selectedStaffId;
                    current.staffName = changeBookingState.selectedStaffName;
                    current.expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
                    current.key = key;
                    saveBookingHolds(getActiveHolds().map(h => h.id === current.id ? current : h));
                    updateChangeBookingHoldBanner();
                    return;
                }
            }
            const hold = {
                id: 'HOLD-' + Math.floor(100000 + Math.random() * 900000),
                bookingId: changeBookingState.originalBooking.id,
                service: changeBookingState.originalBooking.service,
                date: changeBookingState.selectedDate,
                slot: changeBookingState.selectedSlot,
                staffId: changeBookingState.selectedStaffId,
                staffName: changeBookingState.selectedStaffName,
                expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
                key,
            };
            const holds = getActiveHolds();
            holds.push(hold);
            saveBookingHolds(holds);
            localStorage.setItem(CURRENT_CHANGE_HOLD_KEY, hold.id);
            changeBookingState.currentHoldId = hold.id;
            updateChangeBookingHoldBanner();
        }

        function updateChangeBookingHoldBanner() {
            const banner = document.getElementById('changeBookingHoldBanner');
            if (!banner || !changeBookingState) return;
            const hold = getActiveHolds().find(h => h.id === changeBookingState.currentHoldId);
            if (hold) {
                const diff = Math.max(0, new Date(hold.expiresAt) - new Date());
                if (diff <= 0) {
                    banner.style.display = 'none';
                    stopChangeHoldCountdown();
                    return;
                }
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                const timeText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                banner.innerHTML = `
                    <div class="booking-hold-banner-row">
                        <div class="booking-hold-banner-text">
                            🛡️ Bạn đang giữ chỗ ${hold.date} lúc ${hold.slot} với nhân viên <strong>${hold.staffName}</strong>.
                        </div>
                        <div class="booking-hold-countdown">Còn lại <strong>${timeText}</strong></div>
                    </div>`;
                banner.style.display = 'block';
                startChangeHoldCountdown();
                document.getElementById('changeBookingConfirmBtn').disabled = false;
            } else {
                banner.style.display = 'none';
                document.getElementById('changeBookingConfirmBtn').disabled = true;
            }
        }

        function confirmChangeBooking() {
            if (!changeBookingState || !changeBookingState.originalBooking) return;
            if (!changeBookingState.selectedDate || !changeBookingState.selectedSlot || !changeBookingState.selectedStaffId) {
                alert('Vui lòng chọn ngày, giờ và nhân viên mới.');
                return;
            }
            const booking = changeBookingState.originalBooking;
            if (!canModifyBooking(booking)) {
                alert('Quá thời gian để thay đổi lịch trực tuyến. Vui lòng liên hệ Hotline.');
                return;
            }
            booking.previousSchedule = { date: booking.date, time: booking.time };
            booking.date = changeBookingState.selectedDate.split('-').reverse().join('/');
            booking.time = changeBookingState.selectedSlot;
            booking.staff = changeBookingState.selectedStaffName;
            booking.status = 'Đã đặt';
            booking.changeCount = (booking.changeCount || 0) + 1;
            recordBookingAudit(booking, 'change', `Chuyển từ ${booking.previousSchedule?.date || ''} ${booking.previousSchedule?.time || ''} sang ${booking.date} ${booking.time}`);
            saveCurrentUser(user);
            releaseCurrentChangeHold();
            closeChangeBookingModal();
            renderDashboardBookings(user.bookings);
            alert('Thay đổi lịch hẹn thành công. Lịch cũ đã được giải phóng và lịch mới đã được cập nhật.');
        }

        document.getElementById('changeBookingConfirmBtn')?.addEventListener('click', confirmChangeBooking);

        // ── Lịch sử đăng nhập (User Story 2c) ──────────────────────────────
        function renderLoginHistory() {
            const container = document.getElementById('loginHistoryList');
            if (!container) return;
            const history = user.loginHistory || [];
            if (history.length === 0) {
                container.innerHTML = '<p style="color:var(--color-text-light);font-size:0.85rem;">Chưa có lịch sử đăng nhập nào được ghi nhận.</p>';
                return;
            }
            container.innerHTML = history.slice().reverse().slice(0, 5).map(entry => `
                <div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border:1px solid rgba(42,89,68,0.08);border-radius:10px;margin-bottom:8px;background:#f8fafc;">
                    <div>
                        <p style="margin:0;font-size:0.88rem;font-weight:600;color:var(--color-primary-dark);">${entry.device || 'Trình duyệt Web'}</p>
                        <p style="margin:2px 0 0 0;font-size:0.78rem;color:var(--color-text-light);">${entry.location || 'Việt Nam'} · ${entry.time || ''}</p>
                    </div>
                    <span style="font-size:0.75rem;padding:3px 10px;border-radius:20px;background:${entry.suspicious ? '#fee2e2' : '#dcfce7'};color:${entry.suspicious ? '#dc2626' : '#16a34a'};font-weight:600;">${entry.suspicious ? '⚠️ Bất thường' : '✓ Bình thường'}</span>
                </div>
            `).join('');
        }

        // Ghi nhận lần đăng nhập hiện tại
        function recordCurrentLogin() {
            const users = getUsersList();
            const u = users.find(usr => usr.phone === loggedInPhone);
            if (!u) return;
            u.loginHistory = u.loginHistory || [];
            const now = new Date();
            const entry = {
                time: now.toLocaleString('vi-VN'),
                device: navigator.userAgent.includes('Mobile') ? 'Thiết bị di động' : 'Máy tính',
                location: 'Việt Nam',
                suspicious: false,
            };
            u.loginHistory.push(entry);
            if (u.loginHistory.length > 10) u.loginHistory = u.loginHistory.slice(-10);
            saveUsersList(users);
        }

        recordCurrentLogin();
        renderLoginHistory();
    }

    // ==========================================================================
    // SESSION TIMEOUT — User Story 2c (áp dụng mọi trang khi đã đăng nhập)
    // ==========================================================================
    function getLoggedInUserForSession() {
        return localStorage.getItem('pawpal_logged_in_user');
    }

    if (getLoggedInUserForSession()) {
        const SESSION_WARN_MS  = 55 * 60 * 1000; // 55 phút
        const SESSION_LIMIT_MS = 60 * 60 * 1000; // 60 phút
        const SESSION_KEY = 'pawpal_session_last_activity';

        function refreshActivity() {
            localStorage.setItem(SESSION_KEY, Date.now().toString());
        }

        function getIdleMs() {
            const last = parseInt(localStorage.getItem(SESSION_KEY) || '0');
            return last ? Date.now() - last : 0;
        }

        // Khởi tạo activity nếu chưa có
        if (!localStorage.getItem(SESSION_KEY)) refreshActivity();

        // Reset timer khi có tương tác
        ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => {
            document.addEventListener(evt, refreshActivity, { passive: true });
        });

        // Popup cảnh báo session
        let sessionWarnShown = false;
        let sessionCheckInterval = null;

        function createSessionWarningPopup() {
            if (document.getElementById('sessionWarnPopup')) return;
            const popup = document.createElement('div');
            popup.id = 'sessionWarnPopup';
            popup.style.cssText = `
                position:fixed;bottom:24px;right:24px;z-index:9999;
                background:#fff;border:1px solid #f97316;border-radius:16px;
                box-shadow:0 8px 24px rgba(0,0,0,0.15);padding:20px 24px;
                max-width:320px;font-family:var(--font-primary,sans-serif);
            `;
            popup.innerHTML = `
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                    <span style="font-size:1.4rem;">⏰</span>
                    <strong style="color:#c2410c;font-size:0.95rem;">Phiên đăng nhập sắp hết hạn</strong>
                </div>
                <p style="margin:0 0 14px 0;font-size:0.85rem;color:#555;">Bạn không có thao tác trong một thời gian. Phiên sẽ kết thúc sau <strong id="sessionCountdownText">5:00</strong>.</p>
                <button id="sessionExtendBtn" style="width:100%;padding:10px;background:var(--color-primary,#2a5944);color:#fff;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-size:0.9rem;">Tiếp tục đăng nhập</button>
            `;
            document.body.appendChild(popup);

            document.getElementById('sessionExtendBtn').addEventListener('click', () => {
                refreshActivity();
                sessionWarnShown = false;
                popup.remove();
            });
        }

        function updateSessionCountdown() {
            const idleMs = getIdleMs();
            const remaining = SESSION_LIMIT_MS - idleMs;
            const text = document.getElementById('sessionCountdownText');
            if (text) {
                const mins = Math.floor(remaining / 60000);
                const secs = Math.floor((remaining % 60000) / 1000);
                text.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
            }
        }

        sessionCheckInterval = setInterval(() => {
            const idleMs = getIdleMs();

            if (idleMs >= SESSION_LIMIT_MS) {
                // Hết phiên — đăng xuất
                clearInterval(sessionCheckInterval);
                localStorage.removeItem('pawpal_logged_in_user');
                localStorage.removeItem(SESSION_KEY);
                alert('Phiên đăng nhập đã kết thúc, vui lòng đăng nhập lại!');
                window.location.href = _url('login');
                return;
            }

            if (idleMs >= SESSION_WARN_MS && !sessionWarnShown) {
                sessionWarnShown = true;
                createSessionWarningPopup();
            }

            if (sessionWarnShown) {
                updateSessionCountdown();
            }
        }, 1000);
    }

});


