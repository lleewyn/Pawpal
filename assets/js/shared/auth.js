/**
 * auth.js — Logic xác thực, đăng ký, OTP và tài khoản tạm thời của PawPal.
 * Quản lý kho lưu trữ giả lập qua localStorage.
 */

// --- 1. MOCK DATABASE SETUP ---
const PAWPAL_USERS_KEY = 'pawpal_users_db';
const CURRENT_USER_KEY = 'pawpal_current_user';
const TEMP_TOKENS_KEY = 'pawpal_temp_tokens';

// Initialize default users if not exists
function initMockDatabase() {
    if (!localStorage.getItem(PAWPAL_USERS_KEY)) {
        const defaultUsers = [
            {
                name: "Admin PawPal",
                phone: "0900000000",
                password: "adminpassword",
                role: "admin",
                is_temporary: false,
                points: 100
            },
            {
                name: "Nguyễn Văn A",
                phone: "0912345678",
                password: "password123",
                role: "customer",
                is_temporary: false,
                points: 120
            },
            // Một tài khoản tạm đã có sẵn để demo
            {
                name: "Khách Vãng Lai Demo",
                phone: "0987654321",
                role: "customer",
                is_temporary: true,
                points: 0
            }
        ];
        localStorage.setItem(PAWPAL_USERS_KEY, JSON.stringify(defaultUsers));
    }

    if (!localStorage.getItem(TEMP_TOKENS_KEY)) {
        // Token kích hoạt demo
        const defaultTokens = [
            {
                token: "token-hop-le-48h",
                phone: "0987654321",
                createdAt: Date.now() // Vừa tạo, còn hạn
            },
            {
                token: "token-het-han-48h",
                phone: "0911111111",
                createdAt: Date.now() - (50 * 60 * 60 * 1000) // Quá 48 tiếng
            }
        ];
        localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(defaultTokens));
    }
}

// Lấy danh sách users
function getUsers() {
    return JSON.parse(localStorage.getItem(PAWPAL_USERS_KEY)) || [];
}

// Lưu danh sách users
function saveUsers(users) {
    localStorage.setItem(PAWPAL_USERS_KEY, JSON.stringify(users));
}

// Lấy user hiện tại đang đăng nhập
function getCurrentUser() {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
}

// Đăng nhập user
function setCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    // Dispatch event để cập nhật giao diện
    document.dispatchEvent(new CustomEvent('auth_state_changed', { detail: user }));
}

// Đăng xuất
function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = '/pages/public/landing.html';
}

// --- TOAST NOTIFICATION SYSTEM ---
function showToast(type, message, duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        console.warn('Toast container not found');
        return;
    }

    const toastId = 'toast-' + Date.now();
    const icons = {
        success: '✓',
        error: '✕',
        info: 'ℹ',
        warning: '⚠'
    };

    const titles = {
        success: 'Thành công',
        error: 'Lỗi',
        info: 'Thông báo',
        warning: 'Cảnh báo'
    };

    const toastHtml = `
        <div id="${toastId}" class="toast-custom toast-${type}">
            <span class="toast-icon">${icons[type] || 'ℹ'}</span>
            <div class="toast-content">
                <div class="toast-title">${titles[type] || 'Thông báo'}</div>
                <p class="toast-message">${message}</p>
            </div>
            <button type="button" class="toast-close" aria-label="Đóng">&times;</button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);

    // Close button
    toastElement.querySelector('.toast-close').addEventListener('click', () => {
        removeToast(toastElement);
    });

    // Auto remove
    setTimeout(() => {
        removeToast(toastElement);
    }, duration);
}

function removeToast(toastElement) {
    toastElement.style.opacity = '0';
    toastElement.style.transform = 'translateX(100%)';
    setTimeout(() => {
        toastElement.remove();
    }, 300);
}

// --- ERROR BANNER DISPLAY ---
function showErrorBanner(message, parentForm) {
    // Remove existing banner
    const existingBanner = parentForm.querySelector('.auth-error-banner');
    if (existingBanner) {
        existingBanner.remove();
    }

    const banner = document.createElement('div');
    banner.className = 'auth-error-banner';
    banner.innerHTML = message;
    
    parentForm.insertBefore(banner, parentForm.firstChild);

    // Auto remove after 7 seconds
    setTimeout(() => {
        banner.style.opacity = '0';
        setTimeout(() => banner.remove(), 300);
    }, 7000);
}

// --- 2. XỬ LÝ LỌC TRANG VÀ KHÓA TÀI KHOẢN TẠM (US 1-2) ---
function enforceTemporaryAccountLock() {
    const currentUser = getCurrentUser();
    const isTemp = currentUser && currentUser.is_temporary;
    
    // Nếu là tài khoản tạm và đang truy cập trực tiếp vào trang User cá nhân -> Đẩy ra ngoài
    const currentPath = window.location.pathname.toLowerCase();
    const isUserPage = currentPath.includes('/pages/user/');
    
    if (isTemp && isUserPage) {
        // Chặn trực tiếp và chuyển hướng về trang thiết lập mật khẩu kèm token
        const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
        let tokenObj = tokens.find(t => t.phone === currentUser.phone);
        if (!tokenObj) {
            tokenObj = { token: 'token-dynamic-' + Math.random().toString(36).substr(2, 9), phone: currentUser.phone, createdAt: Date.now() };
            tokens.push(tokenObj);
            localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(tokens));
        }
        window.location.href = `/pages/public/login.html?action=setup-password&token=${tokenObj.token}`;
        return;
    }

    // Đợi Header được load xong để kiểm soát các click liên kết
    document.addEventListener('headerInjected', () => {
        applyLockingUI(isTemp);
    });
    // Chạy thêm một lượt phòng hờ Header đã inject trước đó
    applyLockingUI(isTemp);
}

function applyLockingUI(isTemp) {
    if (!isTemp) return;

    // Tìm các thẻ menu hoặc liên kết dẫn tới trang cá nhân / admin
    const navLinks = document.querySelectorAll('.nav-menu a, .navbar-nav a, .auth-actions a, .header-actions a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        // Chỉ cho phép đi các trang công khai: landing, services, booking, shop, about, blog, contact
        const isPublicPage = href.includes('landing.html') || 
                             href.includes('services.html') || 
                             href.includes('booking.html') || 
                             href.includes('shop.html') ||
                             href.includes('about.html') ||
                             href.includes('blog.html') ||
                             href.includes('contact.html') ||
                             href.includes('login.html');

        if (!isPublicPage && (href.includes('/user/') || href.includes('/admin/'))) {
            // Thiết lập trạng thái khóa
            link.classList.add('nav-link-locked');
            
            // Chặn click
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showLockedTooltip(link);
            });
        }
    });
}

// Hiển thị tooltip cảnh báo khóa tài khoản tạm thời
let currentTooltip = null;
function showLockedTooltip(targetElement) {
    if (currentTooltip) {
        currentTooltip.remove();
    }

    const tooltip = document.createElement('div');
    tooltip.className = 'locked-tooltip-custom';
    tooltip.textContent = 'Hãy thiết lập mật khẩu ngay để trở thành thành viên của Pawpal, mở khóa ngay các tính năng thú vị!';
    document.body.appendChild(tooltip);
    currentTooltip = tooltip;

    // Định vị tooltip
    const rect = targetElement.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
    tooltip.style.top = `${rect.top + window.scrollY}px`;

    // Tự động ẩn sau 4 giây
    setTimeout(() => {
        if (currentTooltip === tooltip) {
            tooltip.style.opacity = '0';
            tooltip.style.transition = 'opacity 0.3s ease';
            setTimeout(() => tooltip.remove(), 300);
        }
    }, 4000);
}

// --- 3. ĐIỀU HƯỚNG STATE TRÊN TRANG LOGIN.HTML ---
function handleLoginRouting() {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    
    let action = params.get('action');
    let token = params.get('token');

    // Hỗ trợ fallback từ hash nếu redirect server làm mất query parameters
    if (!action && hash) {
        const hashClean = hash.substring(1); // Bỏ dấu '#'
        if (hashClean === 'register' || hashClean === 'login') {
            action = hashClean;
        } else if (hashClean.startsWith('setup-password')) {
            action = 'setup-password';
            // Parse token từ hash dạng setup-password?token=xyz hoặc setup-password&token=xyz
            const tokenMatch = hashClean.match(/token=([^&]+)/);
            if (tokenMatch) {
                token = tokenMatch[1];
            }
        }
    }

    // Ẩn tất cả các sections
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const otpSection = document.getElementById('otpSection');
    const congratsSection = document.getElementById('congratsSection');
    const setupPasswordSection = document.getElementById('setupPasswordSection');
    const setupExpiredSection = document.getElementById('setupExpiredSection');
    const authTabs = document.getElementById('authTabs');

    if (!loginForm) return; // Không nằm trên trang login.html

    // Reset default view
    loginForm.classList.remove('active-form');
    registerForm.classList.remove('active-form');
    otpSection.classList.add('d-none');
    congratsSection.classList.add('d-none');
    setupPasswordSection.classList.add('d-none');
    setupExpiredSection.classList.add('d-none');
    authTabs.style.display = 'flex';

    if (action === 'register') {
        registerForm.classList.add('active-form');
        document.getElementById('tabRegister').classList.add('active');
        document.getElementById('tabLogin').classList.remove('active');
    } else if (action === 'setup-password' && token) {
        authTabs.style.display = 'none';
        
        // Kiểm tra tính hợp lệ của token
        const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
        const tokenData = tokens.find(t => t.token === token);

        if (tokenData) {
            const timeElapsed = Date.now() - tokenData.createdAt;
            const limit = 48 * 60 * 60 * 1000; // 48 tiếng

            if (timeElapsed <= limit) {
                // Hợp lệ
                setupPasswordSection.classList.remove('d-none');
                setupPasswordSection.dataset.phone = tokenData.phone;
                setupPasswordSection.dataset.token = token;
            } else {
                // Quá hạn
                setupExpiredSection.classList.remove('d-none');
            }
        } else {
            // Không tìm thấy token -> coi như hết hạn/lỗi
            setupExpiredSection.classList.remove('d-none');
        }
    } else {
        // Mặc định là login
        loginForm.classList.add('active-form');
        document.getElementById('tabLogin').classList.add('active');
        document.getElementById('tabRegister').classList.remove('active');
    }
}

// --- 4. FORM VALIDATION & INTERACTION ON LOGIN/REGISTER ---
function initAuthForms() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    // --- TỔNG HỢP TOGGLE ĐĂNG NHẬP / ĐĂNG KÝ ---
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const registerForm = document.getElementById('registerForm');

    tabLogin.addEventListener('click', () => {
        window.history.pushState({}, '', '?action=login');
        handleLoginRouting();
    });

    tabRegister.addEventListener('click', () => {
        window.history.pushState({}, '', '?action=register');
        handleLoginRouting();
    });

    // --- AN/HIỆN MẬT KHẨU ---
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            if (input.type === 'password') {
                input.type = 'text';
                btn.innerHTML = `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
            } else {
                input.type = 'password';
                btn.innerHTML = `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
            }
        });
    });

    // --- PHƯƠNG THỨC ĐĂNG NHẬP (MULTI-STEP & SMS IN NEW LAYOUT) ---
    const btnLoginContinue = document.getElementById('btnLoginContinue');
    const loginStepPhone = document.getElementById('loginStepPhone');
    const loginStepPassword = document.getElementById('loginStepPassword');
    const loginPhone = document.getElementById('loginPhone');
    const loginPhoneDisplay = document.getElementById('loginPhoneDisplay');
    const btnChangePhone = document.getElementById('btnChangePhone');
    const loginPassword = document.getElementById('loginPassword');
    const btnLoginSubmit = document.getElementById('btnLoginSubmit');

    // Handle "Continue" button in Step 1 of Login
    if (btnLoginContinue) {
        btnLoginContinue.addEventListener('click', (e) => {
            e.preventDefault();
            const phoneVal = loginPhone.value.trim();
            const feedback = document.getElementById('loginPhoneFeedback');
            
            if (!/^0[0-9]{9}$/.test(phoneVal)) {
                loginPhone.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Số điện thoại phải đủ 10 chữ số và bắt đầu bằng số 0';
                return;
            }
            loginPhone.classList.remove('is-invalid');

            const users = getUsers();
            const user = users.find(u => u.phone === phoneVal);

            if (!user) {
                // SĐT chưa tồn tại
                showErrorBanner(
                    'Số điện thoại chưa được đăng ký. Vui lòng <a href="?action=register" class="text-decoration-underline fw-bold" style="color: var(--color-danger);">Đăng ký ngay</a>',
                    loginForm
                );
            } else if (user.is_temporary) {
                // Tài khoản tạm của khách vãng lai -> Chuyển sang xác nhận OTP rồi thiết lập mật khẩu
                showToast('info', 'Tài khoản của bạn đang là tài khoản tạm thời. Hệ thống sẽ gửi mã OTP để xác thực.');
                
                loginForm.style.opacity = '0';
                setTimeout(() => {
                    loginForm.classList.remove('active-form');
                    const authTabs = document.getElementById('authTabs');
                    if (authTabs) authTabs.style.display = 'none';
                    
                    const forgotOtpSection = document.getElementById('forgotOtpSection');
                    forgotOtpSection.classList.remove('d-none');
                    forgotOtpSection.style.opacity = '1';
                    
                    forgotOtpSection.querySelector('.form-title').textContent = 'Xác thực kích hoạt tài khoản';
                    forgotOtpSection.querySelector('.form-subtitle').textContent = 'Mã xác thực 6 số đã được gửi đến SĐT của bạn.';
                    
                    window.isGuestActivationFlow = true;
                    window.guestActivationPhone = user.phone;
                    
                    const btnResend = document.getElementById('btnForgotResendOtp');
                    if (btnResend) {
                        btnResend.click(); // Trigger timer and clear inputs
                    }
                }, 300);
            } else {
                // Thành viên chính thức -> Cho nhập mật khẩu
                loginStepPhone.classList.add('d-none');
                loginStepPassword.classList.remove('d-none');
                if (loginPhoneDisplay) loginPhoneDisplay.textContent = phoneVal;
                if (loginPassword) loginPassword.focus();
            }
        });
    }

    // Handle change phone click in Step 2 of Login
    if (btnChangePhone) {
        btnChangePhone.addEventListener('click', () => {
            loginStepPassword.classList.add('d-none');
            loginStepPhone.classList.remove('d-none');
            if (loginPassword) loginPassword.value = '';
            const existingBanner = loginForm.querySelector('.auth-error-banner');
            if (existingBanner) existingBanner.remove();
        });
    }

    if (loginPassword) {
        loginPassword.addEventListener('input', () => {
            const existingBanner = loginForm.querySelector('.auth-error-banner');
            if (existingBanner) existingBanner.remove();
        });
    }
    
    if (loginPhone) {
        loginPhone.addEventListener('input', () => {
            const existingBanner = loginForm.querySelector('.auth-error-banner');
            if (existingBanner) existingBanner.remove();
            loginPhone.classList.remove('is-invalid');
        });
    }

    // --- FORM SUBMIT LOGIN (US 2-1) ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const phone = loginPhone.value.trim();
        const password = loginPassword.value;
        const users = getUsers();
        const user = users.find(u => u.phone === phone && u.password === password);

        if (user) {
            setCurrentUser(user);
            showToast('success', 'Đăng nhập thành công!', 2000);
            setTimeout(() => {
                if (user.role === 'admin') {
                    window.location.href = '/pages/admin/index.html';
                } else {
                    window.location.href = '/pages/user/dashboard.html';
                }
            }, 2000);
        } else {
            showErrorBanner('Mật khẩu không đúng. Vui lòng thử lại hoặc <a href="#" id="inlineForgotLink" class="text-decoration-underline fw-bold" style="color: var(--color-danger);">quên mật khẩu?</a>', loginForm);
            setTimeout(() => {
                const inlineForgotLink = document.getElementById('inlineForgotLink');
                if (inlineForgotLink) {
                    inlineForgotLink.addEventListener('click', (ev) => {
                        ev.preventDefault();
                        const triggerForgot = document.getElementById('triggerForgot');
                        if (triggerForgot) triggerForgot.click();
                    });
                }
            }, 100);
        }
    });

    // --- XÁC THỰC TRÊN FORM ĐĂNG KÝ (US 1-1 / AC1.1.1) ---
    const regName = document.getElementById('registerName');
    const regPhone = document.getElementById('registerPhone');
    const regPassword = document.getElementById('registerPassword');
    const regConfirmPassword = document.getElementById('registerConfirmPassword');
    const btnRegisterSubmit = document.getElementById('btnRegisterSubmit');

    // US 2-1: Enhanced phone validation on blur for signup
    if (regPhone) {
        regPhone.addEventListener('blur', () => {
            const phoneValue = regPhone.value.trim();
            const feedback = document.getElementById('registerPhoneFeedback');
            if (phoneValue.length > 0 && !/^0[0-9]{9}$/.test(phoneValue)) {
                regPhone.classList.add('is-invalid');
                if (feedback) feedback.textContent = 'Số điện thoại phải đủ 10 chữ số và bắt đầu bằng số 0';
            } else {
                regPhone.classList.remove('is-invalid');
            }
        });
        regPhone.addEventListener('input', () => {
            regPhone.classList.remove('is-invalid');
        });
    }

    // --- US 2-2: FORGOT PASSWORD FLOW ---
    const triggerForgot = document.getElementById('triggerForgot');
    const forgotPhoneSection = document.getElementById('forgotPhoneSection');
    const btnForgotBackToLogin = document.getElementById('btnForgotBackToLogin');
    const forgotPhoneForm = document.getElementById('forgotPhoneForm');
    const forgotPhone = document.getElementById('forgotPhone');
    
    const forgotOtpSection = document.getElementById('forgotOtpSection');
    const btnForgotOtpBack = document.getElementById('btnForgotOtpBack');
    const forgotOtpTimer = document.getElementById('forgotOtpTimer');
    const btnForgotResendOtp = document.getElementById('btnForgotResendOtp');
    const forgotOtpInputs = document.querySelectorAll('.forgot-otp-input');
    
    const forgotNewPasswordSection = document.getElementById('forgotNewPasswordSection');
    const forgotNewPasswordForm = document.getElementById('forgotNewPasswordForm');
    const forgotNewPassword = document.getElementById('forgotNewPassword');
    const forgotConfirmNewPassword = document.getElementById('forgotConfirmNewPassword');
    const btnForgotNewPasswordSubmit = document.getElementById('btnForgotNewPasswordSubmit');

    let forgotOtpInterval = null;

    if (triggerForgot && forgotPhoneSection) {
        triggerForgot.addEventListener('click', (e) => {
            e.preventDefault();
            
            loginForm.style.opacity = '0';
            loginForm.style.transition = 'opacity 0.3s ease';
            
            setTimeout(() => {
                loginForm.classList.remove('active-form');
                if (authTabs) authTabs.style.display = 'none';
                forgotPhoneSection.classList.remove('d-none');
                forgotPhoneSection.style.opacity = '0';
                forgotPhoneSection.style.transition = 'opacity 0.3s ease';
                
                setTimeout(() => {
                    forgotPhoneSection.style.opacity = '1';
                    forgotPhone.focus();
                }, 50);
            }, 300);
        });

        btnForgotBackToLogin.addEventListener('click', () => {
            forgotPhoneSection.style.opacity = '0';
            
            setTimeout(() => {
                forgotPhoneSection.classList.add('d-none');
                if (authTabs) authTabs.style.display = 'flex';
                loginForm.classList.add('active-form');
                loginForm.style.opacity = '0';
                
                setTimeout(() => {
                    loginForm.style.opacity = '1';
                }, 50);
            }, 300);
        });

        // Validate forgot password phone input
        forgotPhone.addEventListener('blur', () => {
            const phoneValue = forgotPhone.value.trim();
            if (phoneValue.length > 0 && !/^0[0-9]{9}$/.test(phoneValue)) {
                forgotPhone.classList.add('is-invalid');
            } else {
                forgotPhone.classList.remove('is-invalid');
            }
        });

        forgotPhone.addEventListener('input', () => {
            forgotPhone.classList.remove('is-invalid');
        });

        // Form submit - Step 1: Send OTP code
        forgotPhoneForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = forgotPhone.value.trim();
            
            if (!/^0[0-9]{9}$/.test(phone)) {
                forgotPhone.classList.add('is-invalid');
                return;
            }

            const users = getUsers();
            const userExists = users.find(u => u.phone === phone);
            
            if (!userExists) {
                showErrorBanner(
                    'Số điện thoại chưa được đăng ký trong hệ thống. Vui lòng kiểm tra lại hoặc <a href="?action=register" class="text-decoration-underline fw-bold" style="color: var(--color-danger);">đăng ký tài khoản mới</a>.',
                    forgotPhoneForm
                );
                return;
            }
            
            // Switch to OTP section
            forgotPhoneSection.classList.add('d-none');
            forgotOtpSection.classList.remove('d-none');
            
            forgotOtpInputs.forEach((input, idx) => {
                input.value = '';
                input.disabled = (idx > 0);
            });
            forgotOtpInputs[0].focus();
            
            showToast('info', 'Mã OTP xác thực đã được gửi về SMS: 555666', 6000);
            startForgotOtpTimer();
        });

        // Back from OTP to phone input
        btnForgotOtpBack.addEventListener('click', () => {
            forgotOtpSection.classList.add('d-none');
            forgotPhoneSection.classList.remove('d-none');
            if (forgotOtpInterval) clearInterval(forgotOtpInterval);
        });

        // Handle OTP input digits
        forgotOtpInputs.forEach((input, index) => {
            input.addEventListener('input', (e) => {
                const val = e.target.value;
                if (!/^[0-9]$/.test(val)) {
                    e.target.value = '';
                    return;
                }
                if (index < forgotOtpInputs.length - 1) {
                    forgotOtpInputs[index + 1].disabled = false;
                    forgotOtpInputs[index + 1].focus();
                } else {
                    checkForgotOtpSubmission();
                }
            });

            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace') {
                    if (input.value === '') {
                        if (index > 0) {
                            forgotOtpInputs[index - 1].focus();
                            forgotOtpInputs[index].disabled = true;
                        }
                    } else {
                        input.value = '';
                    }
                }
            });
        });

        function startForgotOtpTimer() {
            if (forgotOtpInterval) clearInterval(forgotOtpInterval);
            let duration = 300; // 5 mins
            btnForgotResendOtp.disabled = true;

            forgotOtpInterval = setInterval(() => {
                let minutes = Math.floor(duration / 60);
                let seconds = duration % 60;
                forgotOtpTimer.textContent = `${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;

                if (duration <= 0) {
                    clearInterval(forgotOtpInterval);
                    btnForgotResendOtp.disabled = false;
                }
                duration--;
            }, 1000);
        }

        if (btnForgotResendOtp) {
            btnForgotResendOtp.addEventListener('click', () => {
                showToast('info', 'Mã OTP xác thực mới đã gửi lại: 555666', 6000);
                startForgotOtpTimer();
                
                forgotOtpInputs.forEach((input, idx) => {
                    input.value = '';
                    input.disabled = (idx > 0);
                });
                forgotOtpInputs[0].focus();
            });
        }

        function checkForgotOtpSubmission() {
            let code = '';
            forgotOtpInputs.forEach(input => code += input.value);
            if (code === '555666') {
                clearInterval(forgotOtpInterval);
                forgotOtpSection.classList.add('d-none');
                
                if (window.isGuestActivationFlow) {
                    showToast('success', 'Xác thực OTP thành công! Vui lòng thiết lập mật khẩu bảo mật.');
                    const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
                    let tokenObj = { token: 'token-dynamic-' + Math.random().toString(36).substr(2, 9), phone: window.guestActivationPhone, createdAt: Date.now() };
                    tokens.push(tokenObj);
                    localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(tokens));
                    setTimeout(() => {
                        window.location.href = `/pages/public/login.html?action=setup-password&token=${tokenObj.token}`;
                    }, 1000);
                } else {
                    forgotNewPasswordSection.classList.remove('d-none');
                    forgotNewPassword.focus();
                }
            } else {
                showToast('error', 'Mã OTP chưa chính xác. Vui lòng nhập 555666 để test');
                forgotOtpInputs.forEach((input, idx) => {
                    input.value = '';
                    if (idx > 0) input.disabled = true;
                });
                forgotOtpInputs[0].focus();
            }
        }

        // New password formulation validation
        function validateForgotNewPasswordForm() {
            const isPassValid = forgotNewPassword.value.length >= 6;
            const isConfirmValid = forgotConfirmNewPassword.value === forgotNewPassword.value;
            
            if (forgotConfirmNewPassword.value.length > 0 && !isConfirmValid) {
                document.getElementById('forgotConfirmFeedback').textContent = 'Mật khẩu chưa khớp';
                forgotConfirmNewPassword.classList.add('is-invalid');
            } else {
                forgotConfirmNewPassword.classList.remove('is-invalid');
            }

            btnForgotNewPasswordSubmit.disabled = !(isPassValid && isConfirmValid);
        }

        forgotNewPassword.addEventListener('input', validateForgotNewPasswordForm);
        forgotConfirmNewPassword.addEventListener('input', validateForgotNewPasswordForm);

        forgotNewPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = forgotPhone.value.trim();
            const users = getUsers();
            const userIdx = users.findIndex(u => u.phone === phone);

            if (userIdx !== -1) {
                users[userIdx].password = forgotNewPassword.value;
                saveUsers(users);
                
                showToast('success', 'Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.');
                setTimeout(() => {
                    // Reset to login form step 1
                    forgotNewPasswordSection.classList.add('d-none');
                    if (authTabs) authTabs.style.display = 'flex';
                    loginForm.classList.add('active-form');
                    loginStepPassword.classList.add('d-none');
                    loginStepPhone.classList.remove('d-none');
                    loginPhone.value = phone;
                    loginPassword.value = '';
                    loginForm.reset();
                    forgotPhoneForm.reset();
                    forgotNewPasswordForm.reset();
                }, 2000);
            }
        });
    }

    // --- XÁC THỰC TRÊN FORM ĐĂNG KÝ (US 1-1 / AC1.1.1) ---

    function validateRegisterForm() {
        const isNameValid = regName.value.trim().length > 0;
        
        // Regex số điện thoại VN 10 số (bắt đầu bằng 0)
        const isPhoneValid = /^0[0-9]{9}$/.test(regPhone.value.trim());
        if (regPhone.value.trim().length > 0 && !isPhoneValid) {
            regPhone.classList.add('is-invalid');
        } else {
            regPhone.classList.remove('is-invalid');
        }

        const isPasswordValid = regPassword.value.length >= 6;
        
        const isConfirmValid = regConfirmPassword.value === regPassword.value;
        if (regConfirmPassword.value.length > 0 && !isConfirmValid) {
            regConfirmPassword.classList.add('is-invalid');
        } else {
            regConfirmPassword.classList.remove('is-invalid');
        }

        // Kích hoạt/Vô hiệu hoá nút Đăng ký
        if (isNameValid && isPhoneValid && isPasswordValid && isConfirmValid) {
            btnRegisterSubmit.disabled = false;
        } else {
            btnRegisterSubmit.disabled = true;
        }
    }

    [regName, regPhone, regPassword, regConfirmPassword].forEach(input => {
        input.addEventListener('input', validateRegisterForm);
        input.addEventListener('blur', validateRegisterForm);
    });

    // --- CHUYỂN FORM SANG KHUNG NHẬP OTP (US 1-1 / AC1.1.2) ---
    const otpSection = document.getElementById('otpSection');
    const authTabs = document.getElementById('authTabs');
    const otpTimer = document.getElementById('otpTimer');
    const btnResendOtp = document.getElementById('btnResendOtp');
    const otpInputs = document.querySelectorAll('#otpSection .otp-input');
    
    let otpCountdownInterval = null;

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Check trùng SĐT trong database
        const users = getUsers();
        const existing = users.find(u => u.phone === regPhone.value.trim());
        if (existing && !existing.is_temporary) {
            showToast('error', 'Số điện thoại này đã được đăng ký tài khoản chính thức!');
            return;
        }

        // Chuyển cảnh sang OTP mượt mà
        registerForm.style.opacity = '0';
        registerForm.style.transition = 'opacity 0.3s ease';
        setTimeout(() => {
            registerForm.classList.remove('active-form');
            authTabs.style.display = 'none';
            otpSection.classList.remove('d-none');
            otpSection.style.opacity = '1';
            
            // Focus và reset ô OTP
            otpInputs.forEach((input, idx) => {
                input.value = '';
                input.disabled = (idx > 0);
            });
            otpInputs[0].focus();
            
            // Toast thay vì Alert
            showToast('info', 'Mã OTP xác thực đã gửi về SMS: 555666', 6000);
            
            startOtpTimer();
        }, 300);
    });

    // Logic nhập liệu 6 ô OTP độc lập
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            // Chỉ nhận số
            if (!/^[0-9]$/.test(val)) {
                e.target.value = '';
                return;
            }

            // Nhảy focus sang ô tiếp theo
            if (index < otpInputs.length - 1) {
                otpInputs[index + 1].disabled = false;
                otpInputs[index + 1].focus();
            } else {
                // Ô cuối cùng gõ xong thì tự động gọi lệnh kiểm tra
                checkOtpSubmission();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (input.value === '') {
                    // Lùi về ô trước
                    if (index > 0) {
                        otpInputs[index - 1].focus();
                        otpInputs[index].disabled = true;
                    }
                } else {
                    input.value = '';
                }
            }
        });
    });

    function startOtpTimer() {
        if (otpCountdownInterval) clearInterval(otpCountdownInterval);
        let duration = 5 * 60; // 5 phút
        btnResendOtp.disabled = true;

        otpCountdownInterval = setInterval(() => {
            let minutes = Math.floor(duration / 60);
            let seconds = duration % 60;
            
            minutes = minutes < 10 ? '0' + minutes : minutes;
            seconds = seconds < 10 ? '0' + seconds : seconds;
            
            otpTimer.textContent = `${minutes}:${seconds}`;

            if (duration <= 0) {
                clearInterval(otpCountdownInterval);
                btnResendOtp.disabled = false;
            }
            duration--;
        }, 1000);
    }

    btnResendOtp.addEventListener('click', () => {
        showToast('info', 'Mã OTP xác thực mới đã gửi lại: 555666', 6000);
        startOtpTimer();
        
        otpInputs.forEach((input, idx) => {
            input.value = '';
            input.disabled = (idx > 0);
        });
        otpInputs[0].focus();
    });

    function checkOtpSubmission() {
        let otpCode = '';
        otpInputs.forEach(input => otpCode += input.value);

        if (otpCode.length === 6) {
            if (otpCode === '555666') {
                // Xác thực thành công!
                clearInterval(otpCountdownInterval);
                showRegisterSuccess();
            } else {
                showToast('error', 'Mã OTP chưa chính xác. Vui lòng nhập 555666 để test');
                // Clear inputs
                otpInputs.forEach((input, idx) => {
                    input.value = '';
                    if (idx > 0) input.disabled = true;
                });
                otpInputs[0].focus();
            }
        }
    }

    function showRegisterSuccess() {
        otpSection.classList.add('d-none');
        const congratsSection = document.getElementById('congratsSection');
        congratsSection.classList.remove('d-none');

        // Lưu user mới vào localStorage database
        const users = getUsers();
        
        // Nếu trước đó là tài khoản tạm thì chuyển đổi sang tài khoản chính thức
        let userIdx = users.findIndex(u => u.phone === regPhone.value.trim());
        const newUserObj = {
            name: regName.value.trim(),
            phone: regPhone.value.trim(),
            password: regPassword.value,
            role: "customer",
            is_temporary: false,
            points: 50 // Kích hoạt nhận 50 Paw Points
        };

        if (userIdx !== -1) {
            users[userIdx] = newUserObj;
        } else {
            users.push(newUserObj);
        }
        
        saveUsers(users);
        setCurrentUser(newUserObj);

        // Hiệu ứng tăng số điểm thưởng động (Points Counter Animation)
        const counterEl = document.getElementById('pointsCounter');
        let currentPoints = 0;
        const targetPoints = 50;
        const duration = 1500; // 1.5s
        const stepTime = Math.abs(Math.floor(duration / targetPoints));
        
        const timer = setInterval(() => {
            currentPoints += 1;
            counterEl.textContent = currentPoints;
            if (currentPoints >= targetPoints) {
                clearInterval(timer);
                
                // Tự động chuyển hướng về trang Dashboard người dùng sau 2 giây nữa
                setTimeout(() => {
                    window.location.href = '/pages/user/dashboard.html';
                }, 2000);
            }
        }, stepTime);
    }

    // --- THIẾT LẬP MẬT KHẨU TỪ SMS LINK (US 1-2 / AC1.2.2) ---
    const setupPasswordForm = document.getElementById('setupPasswordForm');
    const setupPass = document.getElementById('setupPassword');
    const setupConfirm = document.getElementById('setupConfirmPassword');
    const btnSetupSubmit = document.getElementById('btnSetupSubmit');

    function validateSetupForm() {
        const isPassValid = setupPass.value.length >= 6;
        const isConfirmValid = setupConfirm.value === setupPass.value;

        if (setupConfirm.value.length > 0 && !isConfirmValid) {
            setupConfirm.classList.add('is-invalid');
        } else {
            setupConfirm.classList.remove('is-invalid');
        }

        if (isPassValid && isConfirmValid) {
            btnSetupSubmit.disabled = false;
        } else {
            btnSetupSubmit.disabled = true;
        }
    }

    if (setupPasswordForm) {
        setupPass.addEventListener('input', validateSetupForm);
        setupConfirm.addEventListener('input', validateSetupForm);

        setupPasswordForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const phone = document.getElementById('setupPasswordSection').dataset.phone;
            const token = document.getElementById('setupPasswordSection').dataset.token;
            
            const users = getUsers();
            const userIdx = users.findIndex(u => u.phone === phone);
            
            if (userIdx !== -1) {
                users[userIdx].password = setupPass.value;
                users[userIdx].is_temporary = false; // Chuyển thành chính thức
                users[userIdx].points += 50; // Thưởng 50 Paw Points kích hoạt thành viên
                saveUsers(users);
                
                // Đăng nhập luôn
                setCurrentUser(users[userIdx]);
                
                // Xoá token đã dùng
                const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
                const updatedTokens = tokens.filter(t => t.token !== token);
                localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(updatedTokens));

                showToast('success', 'Kích hoạt tài khoản thành viên thành công! Bạn nhận thêm 50 điểm thưởng chào mừng.');
                setTimeout(() => {
                    window.location.href = '/pages/user/dashboard.html';
                }, 2000);
            }
        });
    }

    // Gửi lại link xác thực mới
    const btnRequestNewLink = document.getElementById('btnRequestNewLink');
    if (btnRequestNewLink) {
        btnRequestNewLink.addEventListener('click', () => {
            const phone = document.getElementById('expiredPhone').value;
            if (!/^[0-9]{10}$/.test(phone)) {
                showToast('error', 'Vui lòng nhập số điện thoại hợp lệ.');
                return;
            }

            // Tạo token mới
            const token = 'token-dynamic-' + Math.random().toString(36).substr(2, 9);
            const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
            tokens.push({
                token: token,
                phone: phone,
                createdAt: Date.now()
            });
            localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(tokens));

            showToast('success', 'Đã gửi link mới qua SMS. Vui lòng kiểm tra điện thoại của bạn.', 6000);
            console.log(`[SMS Simulation] Setup password link: ${window.location.origin}/pages/public/login.html?action=setup-password&token=${token}`);
        });
    }
}

// --- 5. ADMIN QUICK ADD CUSTOMER FORM INTEGRATION (US 1-3) ---
function initAdminQuickAddCustomer() {
    const btnQuickAdd = document.getElementById('btnAdminQuickAddCustomer');
    if (!btnQuickAdd) return;

    btnQuickAdd.addEventListener('click', () => {
        // Mở popup modal
        const modalEl = document.getElementById('adminQuickAddModal');
        if (modalEl) {
            const modal = new bootstrap.Modal(modalEl);
            modal.show();
        }
    });

    const formQuickAdd = document.getElementById('adminQuickAddForm');
    if (formQuickAdd) {
        formQuickAdd.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('qaName').value;
            const phone = document.getElementById('qaPhone').value;
            const petName = document.getElementById('qaPetName').value;
            const submitBtn = formQuickAdd.querySelector('button[type="submit"]');

            if (!name || !/^[0-9]{10}$/.test(phone)) {
                alert('Họ tên và Số điện thoại 10 số là bắt buộc.');
                return;
            }

            // Show Spinner và chặn click đúp (AC1.3.1)
            const origContent = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Đang lưu...`;

            setTimeout(() => {
                // Tạo tài khoản tạm trong database
                const users = getUsers();
                const existing = users.find(u => u.phone === phone);
                
                if (!existing) {
                    users.push({
                        name: name,
                        phone: phone,
                        role: "customer",
                        is_temporary: true,
                        points: 0,
                        pet: {
                            name: petName,
                            species: document.getElementById('qaPetSpecies').value,
                            weight: document.getElementById('qaPetWeight').value
                        }
                    });
                    saveUsers(users);
                }

                // Tạo Token thiết lập mật khẩu mới
                const token = 'token-dynamic-' + Math.random().toString(36).substr(2, 9);
                const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
                tokens.push({
                    token: token,
                    phone: phone,
                    createdAt: Date.now()
                });
                localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(tokens));

                // Phản hồi Toast thành công
                showAdminToast(`Đã khởi tạo tài khoản tạm và gửi link SMS kích hoạt mật khẩu cho khách thành công!<br><a href="/pages/public/login.html?action=setup-password&token=${token}" target="_blank" style="color:var(--color-accent); font-weight:bold;">Mở liên kết kích hoạt (Simulated SMS Link)</a>`);

                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerHTML = origContent;

                // Close Modal
                const modalInstance = bootstrap.Modal.getInstance(document.getElementById('adminQuickAddModal'));
                if (modalInstance) modalInstance.hide();
                formQuickAdd.reset();

                // Refresh Admin User List if function exists
                if (typeof renderAdminUsersList === 'function') renderAdminUsersList();

            }, 1000); // 1s simulation delay
        });
    }
}

function showAdminToast(message) {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = document.getElementById(toastId);
    const bsToast = new bootstrap.Toast(toastEl, { delay: 6000 });
    bsToast.show();

    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

function initAuth() {
    initMockDatabase();
    enforceTemporaryAccountLock();
    handleLoginRouting();
    initAuthForms();
    initAdminQuickAddCustomer();

    // Lắng nghe click vào bất kỳ link nào trỏ tới login.html khi đang ở chính trang login.html
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href) return;

        if (href.includes('login.html') && window.location.pathname.includes('login.html')) {
            e.preventDefault();
            // Đẩy state mới vào history và chạy lại router
            window.history.pushState({}, '', href);
            handleLoginRouting();
        }
    });
}

// --- INITIALIZE ALL ON LOAD ---
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}
window.addEventListener('popstate', handleLoginRouting);
