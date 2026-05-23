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

    // Subdirectory Detection & Dynamic Paths Prefix
    const isInPagesSubdir = window.location.pathname.includes('/pages/');
    const pathPrefix = isInPagesSubdir ? '../' : '';
    const pagePrefix = isInPagesSubdir ? '' : 'pages/';

    // Toast Container
    const toastContainer = document.getElementById('toastContainer');

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

    function setLoggedInUser(phone) {
        localStorage.setItem('pawpal_logged_in_user', phone);
    }

    function logoutUser() {
        localStorage.removeItem('pawpal_logged_in_user');
        updateHeaderState();
        alert('Đã đăng xuất tài khoản.');
        window.location.href = pathPrefix + 'index.html';
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
                navLoginBtn.href = pagePrefix + "dashboard.html";
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
        navLoginBtn.href = pagePrefix + "login.html";
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
                            window.location.href = pagePrefix + `login.html?activate=${phone}`;
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
        const otpDigits = document.querySelectorAll('.otp-digit');
        const otpTimerText = document.getElementById('otpTimerText');
        const resendCountdown = document.getElementById('resendCountdown');
        const cancelOtpBtn = document.getElementById('cancelOtpBtn');

        safeBind(cancelOtpBtn, 'click', () => otpVerifyModal.classList.remove('open'));

        function launchOtpVerification(phone, mode) {
            currentOtp = Math.floor(100000 + Math.random() * 900000).toString();
            
            setTimeout(() => {
                showSmsToast('XÁC THỰC OTP', `Mã OTP của bạn là: <strong style="font-size:1.15rem; color:var(--color-accent);">${currentOtp}</strong> (hiệu lực 5 phút).`, 'Nhập nhanh OTP', () => {
                    const digits = currentOtp.split('');
                    otpDigits.forEach((el, index) => {
                        el.value = digits[index] || '';
                    });
                    verifyOtpBtn.removeAttribute('disabled');
                });
            }, 800);

            otpDigits.forEach(el => el.value = '');
            verifyOtpBtn.setAttribute('disabled', 'true');
            otpVerifyModal.classList.add('open');

            setTimeout(() => otpDigits[0].focus(), 300);

            otpDigits.forEach((digit, index) => {
                digit.addEventListener('keyup', (e) => {
                    if (e.key >= '0' && e.key <= '9') {
                        if (index < otpDigits.length - 1) otpDigits[index + 1].focus();
                    } else if (e.key === 'Backspace') {
                        if (index > 0) otpDigits[index - 1].focus();
                    }
                    
                    const allFilled = Array.from(otpDigits).every(el => el.value !== '');
                    if (allFilled) {
                        verifyOtpBtn.removeAttribute('disabled');
                    } else {
                        verifyOtpBtn.setAttribute('disabled', 'true');
                    }
                });
            });

            // 5 mins countdown
            let totalSeconds = 300;
            clearInterval(otpTimerInterval);
            otpTimerText.textContent = '05:00';
            otpTimerInterval = setInterval(() => {
                totalSeconds--;
                const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
                const secs = (totalSeconds % 60).toString().padStart(2, '0');
                otpTimerText.textContent = `${mins}:${secs}`;
                
                if (totalSeconds <= 0) {
                    clearInterval(otpTimerInterval);
                    currentOtp = null;
                    alert('Mã OTP đã hết hạn.');
                    otpVerifyModal.classList.remove('open');
                }
            }, 1000);

            // 60s resend lock
            let resendSeconds = 60;
            resendOtpBtn.setAttribute('disabled', 'true');
            resendCountdown.textContent = '60';
            resendOtpBtn.textContent = `Gửi lại mã (${resendSeconds}s)`;
            clearInterval(resendTimerInterval);
            
            resendTimerInterval = setInterval(() => {
                resendSeconds--;
                resendCountdown.textContent = resendSeconds;
                resendOtpBtn.textContent = `Gửi lại mã (${resendSeconds}s)`;
                
                if (resendSeconds <= 0) {
                    clearInterval(resendTimerInterval);
                    resendOtpBtn.removeAttribute('disabled');
                    resendOtpBtn.textContent = 'Gửi lại mã';
                }
            }, 1000);

            resendOtpBtn.onclick = () => launchOtpVerification(phone, mode);

            verifyOtpBtn.onclick = () => {
                const enteredOtp = Array.from(otpDigits).map(el => el.value).join('');
                if (enteredOtp === currentOtp) {
                    clearInterval(otpTimerInterval);
                    clearInterval(resendTimerInterval);
                    otpVerifyModal.classList.remove('open');
                    
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
                        alert('Đăng nhập thành công!');
                        window.location.href = pagePrefix + "dashboard.html";
                    }
                } else {
                    alert('Mã OTP xác thực không chính xác.');
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
                return;
            } else {
                loginPhoneError.style.display = 'none';
            }

            if (isOtpLogin) {
                alert('Vui lòng click nút "Gửi OTP" và điền mã để hoàn thành.');
                return;
            }

            if (user.password === document.getElementById('loginPassword').value) {
                loginFailedCount[phone] = 0;
                setLoggedInUser(phone);
                alert('Đăng nhập thành công!');
                window.location.href = pagePrefix + "dashboard.html";
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
            const users = getUsersList();
            const user = users.find(u => u.phone === phone);

            if (!user) {
                alert('Số điện thoại chưa được đăng ký.');
                return;
            }

            setTimeout(() => {
                showSmsToast('KHÔI PHỤC MẬT KHẨU', `Yêu cầu lấy lại mật khẩu. Click vào link này để đặt mật khẩu mới: login.html?activate=${phone}`, 'Khôi phục mật khẩu', () => {
                    showActivationForm(phone, user.name);
                });
            }, 1200);

            alert('Yêu cầu khôi phục mật khẩu đã được gửi. Kiểm tra Zalo/SMS.');
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
            window.location.href = pagePrefix + "dashboard.html";
        });

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
                if (user && user.isTemporary) {
                    setTimeout(() => {
                        showActivationForm(user.phone, user.name);
                    }, 500);
                }
            }
        }

        checkLockState();
        checkUrlParams();
    }

    // ==========================================================================
    // 3. DASHBOARD PAGE SPECIFIC LOGIC (dashboard.html)
    // ==========================================================================
    if (isDashboardPage) {
        // --- ROUTE GUARD ---
        const loggedInPhone = getLoggedInUser();
        if (!loggedInPhone) {
            window.location.href = pagePrefix + "login.html";
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
            const dashName = document.getElementById('dashName');
            const dashPhone = document.getElementById('dashPhone');
            const dashPoints = document.getElementById('dashPoints');
            const dashBadge = document.getElementById('dashBadge');
            const dashAvatar = document.getElementById('dashAvatar');

            if (dashName) dashName.textContent = user.name;
            if (dashPhone) dashPhone.textContent = formatPhone(user.phone);
            if (dashPoints) dashPoints.textContent = `${user.points} Points`;
            if (dashBadge) dashBadge.textContent = user.membership;
            if (dashAvatar) dashAvatar.textContent = user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

            // Handle temporary restrictions
            const redeemPointsBtn = document.getElementById('redeemPointsBtn');
            const redeemRestrictedNote = document.getElementById('redeemRestrictedNote');
            const oldPasswordGroup = document.getElementById('oldPasswordGroup');
            const securityTabTitle = document.getElementById('securityTabTitle');

            if (user.isTemporary) {
                if (redeemPointsBtn) redeemPointsBtn.setAttribute('disabled', 'true');
                if (redeemRestrictedNote) redeemRestrictedNote.style.display = 'block';
                if (securityTabTitle) securityTabTitle.textContent = 'Thiết lập mật khẩu lần đầu';
                if (oldPasswordGroup) oldPasswordGroup.style.display = 'none';
            } else {
                if (redeemPointsBtn) redeemPointsBtn.removeAttribute('disabled');
                if (redeemRestrictedNote) redeemRestrictedNote.style.display = 'none';
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

        // Booking cancellation
        function renderDashboardBookings(bookings) {
            const dashBookingsList = document.getElementById('dashBookingsList');
            const noBookingsMsg = document.getElementById('noBookingsMsg');
            if (!dashBookingsList) return;
            dashBookingsList.innerHTML = '';

            if (!bookings || bookings.length === 0) {
                if (noBookingsMsg) dashBookingsList.appendChild(noBookingsMsg);
                return;
            }

            bookings.forEach((bk, index) => {
                const card = document.createElement('div');
                card.className = 'dash-booking-card';
                card.innerHTML = `
                    <div class="booking-card-info">
                        <h5 style="margin: 0 0 4px 0; font-family: var(--font-primary); font-size: 1rem; color: var(--color-primary-dark); font-weight: 700;">${bk.service}</h5>
                        <p style="margin: 0; font-size: 0.85rem; color: var(--color-text-light);">📅 Ngày: ${bk.date} | ⏰ Khung giờ: ${bk.time}</p>
                        <p style="margin: 4px 0 0 0; font-size: 0.85rem; color: var(--color-text-light);">Trạng thái: <strong style="color:var(--color-primary);">${bk.status}</strong></p>
                    </div>
                    <button class="btn-cancel-booking-dash" data-index="${index}">Hủy lịch</button>
                `;

                card.querySelector('.btn-cancel-booking-dash').addEventListener('click', () => {
                    if (user.isTemporary) {
                        alert('Bạn phải thiết lập mật khẩu bảo mật trong tab Bảo mật trước khi tiến hành hủy lịch.');
                        return;
                    }
                    const confirmPass = prompt('Nhập mật khẩu tài khoản để xác nhận hủy lịch hẹn:');
                    if (confirmPass === user.password) {
                        if (confirm('Bạn chắc chắn muốn hủy lịch hẹn chăm sóc này?')) {
                            user.bookings.splice(index, 1);
                            saveUsersList(users);
                            renderDashboardBookings(user.bookings);
                            alert('Đã hủy lịch hẹn thành công.');
                        }
                    } else if (confirmPass !== null) {
                        alert('Mật khẩu không chính xác. Thao tác hủy lịch bị chặn.');
                    }
                });

                dashBookingsList.appendChild(card);
            });
        }
    }
});
