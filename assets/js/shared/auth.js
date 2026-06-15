/**
 * auth.js — Logic xác thực, đăng ký, OTP và tài khoản tạm thời của PawPal.
 * Quản lý kho lưu trữ giả lập qua localStorage.
 */

// ============================================================
// 1. MOCK DATABASE
// ============================================================
const PAWPAL_USERS_KEY  = 'pawpal_users_db';
const CURRENT_USER_KEY  = 'pawpal_current_user';
const TEMP_TOKENS_KEY   = 'pawpal_temp_tokens';

function initMockDatabase() {
    if (!localStorage.getItem(PAWPAL_USERS_KEY)) {
        const defaultUsers = [
            {
                name: "Admin PawPal",
                phone: "0900000000",
                password: "Admin@123",
                role: "admin",
                is_temporary: false,
                points: 100
            },
            {
                name: "Nguyễn Văn A",
                phone: "0912345678",
                password: "Test@1234",
                role: "customer",
                is_temporary: false,
                points: 120
            },
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
        const defaultTokens = [
            {
                token: "token-hop-le-48h",
                phone: "0987654321",
                createdAt: Date.now()
            },
            {
                token: "token-het-han-48h",
                phone: "0911111111",
                createdAt: Date.now() - (50 * 60 * 60 * 1000)
            }
        ];
        localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(defaultTokens));
    }
}

function getUsers()          { return JSON.parse(localStorage.getItem(PAWPAL_USERS_KEY)) || []; }
function saveUsers(users)    { localStorage.setItem(PAWPAL_USERS_KEY, JSON.stringify(users)); }
function getCurrentUser()    { return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null; }

function setCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    document.dispatchEvent(new CustomEvent('auth_state_changed', { detail: user }));
}

function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    window.location.href = '/pages/public/landing.html';
}

// ============================================================
// 2. TOAST & ERROR BANNER
// ============================================================
function showToast(type, message, duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toastId = 'toast-' + Date.now();
    const icons   = { success: '✓', error: '✕', info: 'i', warning: '!' };
    const titles  = { success: 'Thành công', error: 'Lỗi', info: 'Thông báo', warning: 'Cảnh báo' };

    container.insertAdjacentHTML('beforeend', `
        <div id="${toastId}" class="toast-custom toast-${type}">
            <span class="toast-icon">${icons[type] || 'i'}</span>
            <div class="toast-content">
                <div class="toast-title">${titles[type] || 'Thông báo'}</div>
                <p class="toast-message">${message}</p>
            </div>
            <button type="button" class="toast-close" aria-label="Đóng">&times;</button>
        </div>
    `);

    const el = document.getElementById(toastId);
    el.querySelector('.toast-close').addEventListener('click', () => removeToast(el));
    setTimeout(() => removeToast(el), duration);
}

function removeToast(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
}

function showErrorBanner(message, parentEl) {
    const existing = parentEl.querySelector('.auth-error-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.className = 'auth-error-banner';
    banner.innerHTML = message;
    parentEl.insertBefore(banner, parentEl.firstChild);

    setTimeout(() => {
        banner.style.opacity = '0';
        banner.style.transition = 'opacity 0.3s ease';
        setTimeout(() => banner.remove(), 300);
    }, 7000);
}

// ============================================================
// 3. PASSWORD VALIDATION + STRENGTH
// ============================================================

// Quy tắc: tối thiểu 8 ký tự, ít nhất 1 chữ số, 1 ký tự đặc biệt (3.1.2)
function validatePassword(password) {
    const hasLength  = password.length >= 8;
    const hasDigit   = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()\-_=+\[\]{}|;':",.<>?\/~`]/.test(password);

    if (!hasLength) return { valid: false, strength: 'weak',   label: 'Yếu — cần ít nhất 8 ký tự' };
    if (!hasDigit && !hasSpecial) return { valid: false, strength: 'weak',   label: 'Yếu — thiếu chữ số và ký tự đặc biệt' };
    if (!hasDigit || !hasSpecial) return { valid: false, strength: 'medium', label: 'Trung bình — cần thêm chữ số hoặc ký tự đặc biệt' };
    return { valid: true, strength: 'strong', label: 'Mạnh' };
}

function updatePasswordReqs(password, reqsListId) {
    const list = document.getElementById(reqsListId);
    if (!list) return;

    const hasLength  = password.length >= 8;
    const hasDigit   = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()\-_=+\[\]{}|;':",.<>?\/~`]/.test(password);

    list.querySelector('#req-length')?.classList.toggle('met', hasLength);
    list.querySelector('#req-digit')?.classList.toggle('met', hasDigit);
    list.querySelector('#req-special')?.classList.toggle('met', hasSpecial);
}

function updateStrengthBar(fillId, labelId, password) {
    const fillEl  = document.getElementById(fillId);
    const labelEl = document.getElementById(labelId);
    if (!fillEl || !labelEl) return;

    if (!password) {
        fillEl.className = 'strength-fill';
        fillEl.style.width = '0';
        labelEl.textContent = '';
        labelEl.className = 'strength-label';
        return;
    }

    const result = validatePassword(password);
    fillEl.className  = 'strength-fill ' + result.strength;
    labelEl.textContent = result.label;
    labelEl.className   = 'strength-label ' + result.strength;
}

// ============================================================
// 4. OTP INPUTS: Reusable 6-box handler
// ============================================================
function initOtpInputs(selector, onComplete) {
    const inputs = document.querySelectorAll(selector);
    if (!inputs.length) return;

    inputs.forEach((input, i) => {
        input.addEventListener('input', (e) => {
            const val = e.target.value;
            if (!/^[0-9]$/.test(val)) { e.target.value = ''; return; }

            if (i < inputs.length - 1) {
                inputs[i + 1].disabled = false;
                inputs[i + 1].focus();
            } else {
                let code = '';
                inputs.forEach(inp => code += inp.value);
                if (code.length === 6) onComplete(code);
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace') {
                if (input.value === '' && i > 0) {
                    inputs[i].disabled = true;
                    inputs[i - 1].focus();
                } else {
                    input.value = '';
                }
            }
        });
    });
}

function resetOtpInputs(selector) {
    const inputs = document.querySelectorAll(selector);
    inputs.forEach((inp, i) => {
        inp.value = '';
        inp.disabled = i > 0;
        inp.classList.remove('otp-error');
    });
    if (inputs[0]) inputs[0].focus();
}

// ============================================================
// 5. COUNTDOWN TIMER
// ============================================================
function startCountdown(timerId, resendBtnId, onExpire) {
    const timerEl   = document.getElementById(timerId);
    const resendBtn = document.getElementById(resendBtnId);
    if (!timerEl) return;

    if (resendBtn) resendBtn.disabled = true;

    let duration = 5 * 60;

    const tick = () => {
        const m = String(Math.floor(duration / 60)).padStart(2, '0');
        const s = String(duration % 60).padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;

        if (duration <= 0) {
            if (resendBtn) resendBtn.disabled = false;
            if (onExpire) onExpire();
            return;
        }
        duration--;
        setTimeout(tick, 1000);
    };

    tick();
}

// ============================================================
// 6. SECTION MANAGER — show/hide sections
// ============================================================
const ALL_SECTIONS = [
    'loginForm', 'registerForm',
    'otpSection', 'congratsSection',
    'setupPasswordSection', 'setupExpiredSection',
    'forgotPhoneSection', 'forgotOtpSection', 'forgotNewPasswordSection'
];

function showSection(id, showTabs = null) {
    const authTabs = document.getElementById('authTabs');

    ALL_SECTIONS.forEach(sid => {
        const el = document.getElementById(sid);
        if (!el) return;

        if (sid === 'loginForm' || sid === 'registerForm') {
            el.classList.remove('active-form');
        } else {
            el.classList.add('d-none');
        }
    });

    const target = document.getElementById(id);
    if (!target) return;

    if (id === 'loginForm' || id === 'registerForm') {
        target.classList.add('active-form');
    } else {
        target.classList.remove('d-none');
    }

    if (authTabs) {
        if (showTabs === false) {
            authTabs.style.display = 'none';
        } else if (showTabs === true) {
            authTabs.style.display = 'flex';
            if (id === 'loginForm') {
                document.getElementById('tabLogin')?.classList.add('active');
                document.getElementById('tabRegister')?.classList.remove('active');
            } else if (id === 'registerForm') {
                document.getElementById('tabRegister')?.classList.add('active');
                document.getElementById('tabLogin')?.classList.remove('active');
            }
        }
    }
}

// ============================================================
// 7. KHÓA TÍNH NĂNG TÀI KHOẢN TẠM (US 1-2)
// ============================================================
function enforceTemporaryAccountLock() {
    const currentUser = getCurrentUser();
    const isTemp = currentUser && currentUser.is_temporary;

    const currentPath = window.location.pathname.toLowerCase();
    if (isTemp && currentPath.includes('/pages/user/')) {
        const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
        let tokenObj = tokens.find(t => t.phone === currentUser.phone);
        if (!tokenObj) {
            tokenObj = {
                token: 'token-dynamic-' + Math.random().toString(36).substr(2, 9),
                phone: currentUser.phone,
                createdAt: Date.now()
            };
            tokens.push(tokenObj);
            localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(tokens));
        }
        window.location.href = `/pages/public/login.html?action=setup-password&token=${tokenObj.token}`;
        return;
    }

    document.addEventListener('headerInjected', () => applyLockingUI(isTemp));
    applyLockingUI(isTemp);
}

function applyLockingUI(isTemp) {
    if (!isTemp) return;

    const navLinks = document.querySelectorAll('.nav-menu a, .navbar-nav a, .auth-actions a, .header-actions a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;

        const isPublic = ['landing.html', 'services.html', 'booking.html', 'shop.html',
                          'about.html', 'blog.html', 'contact.html', 'login.html']
                          .some(p => href.includes(p));

        if (!isPublic && (href.includes('/user/') || href.includes('/admin/'))) {
            link.classList.add('nav-link-locked');
            link.addEventListener('click', (e) => {
                e.preventDefault();
                showLockedTooltip(link);
            });
        }
    });
}

let currentTooltip = null;
function showLockedTooltip(target) {
    if (currentTooltip) currentTooltip.remove();

    const tooltip = document.createElement('div');
    tooltip.className = 'locked-tooltip-custom';
    tooltip.textContent = 'Hãy thiết lập mật khẩu ngay để trở thành thành viên của Pawpal, mở khóa ngay các tính năng thú vị!';
    document.body.appendChild(tooltip);
    currentTooltip = tooltip;

    const rect = target.getBoundingClientRect();
    tooltip.style.left = `${rect.left + rect.width / 2 + window.scrollX}px`;
    tooltip.style.top  = `${rect.top + window.scrollY}px`;

    setTimeout(() => {
        tooltip.style.opacity = '0';
        tooltip.style.transition = 'opacity 0.3s ease';
        setTimeout(() => { if (currentTooltip === tooltip) tooltip.remove(); }, 300);
    }, 4000);
}

// ============================================================
// 8. URL ROUTING — đọc ?action= từ URL
// ============================================================
function handleLoginRouting() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    const params = new URLSearchParams(window.location.search);
    const hash   = window.location.hash;

    let action = params.get('action');
    let token  = params.get('token');

    if (!action && hash) {
        const h = hash.substring(1);
        if (h === 'register' || h === 'login') {
            action = h;
        } else if (h.startsWith('setup-password')) {
            action = 'setup-password';
            const m = h.match(/token=([^&]+)/);
            if (m) token = m[1];
        }
    }

    if (action === 'register') {
        showSection('registerForm', true);

    } else if (action === 'setup-password' && token) {
        const tokens   = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
        const tokenData = tokens.find(t => t.token === token);

        if (tokenData && (Date.now() - tokenData.createdAt) <= 48 * 60 * 60 * 1000) {
            const sec = document.getElementById('setupPasswordSection');
            if (sec) {
                sec.dataset.phone = tokenData.phone;
                sec.dataset.token = token;
            }
            showSection('setupPasswordSection', false);
        } else {
            showSection('setupExpiredSection', false);
        }

    } else {
        // Mặc định: login
        showSection('loginForm', true);
    }
}

// ============================================================
// 9. TOGGLE SHOW/HIDE PASSWORD
// ============================================================
function initPasswordToggles() {
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            if (!input) return;
            const isHidden = input.type === 'password';
            input.type = isHidden ? 'text' : 'password';
            btn.innerHTML = isHidden
                ? `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`
                : `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
        });
    });
}

// ============================================================
// 10. LUỒNG ĐĂNG NHẬP 2 BƯỚC (US 2-1)
// ============================================================
function initLoginFlow() {
    const loginForm        = document.getElementById('loginForm');
    const tabLogin         = document.getElementById('tabLogin');
    const tabRegister      = document.getElementById('tabRegister');
    const stepPhone        = document.getElementById('loginStepPhone');
    const stepPassword     = document.getElementById('loginStepPassword');
    const loginPhoneInput  = document.getElementById('loginPhone');
    const loginPhoneDisp   = document.getElementById('loginPhoneDisplay');
    const loginPasswordInp = document.getElementById('loginPassword');
    const btnContinue      = document.getElementById('btnLoginContinue');
    const btnChangePhone   = document.getElementById('btnChangePhone');
    const triggerForgot    = document.getElementById('triggerForgot');

    if (!loginForm || !btnContinue) return;

    // Tab switching
    tabLogin?.addEventListener('click', () => {
        window.history.pushState({}, '', '?action=login');
        showSection('loginForm', true);
        resetLoginToStep1();
    });

    tabRegister?.addEventListener('click', () => {
        window.history.pushState({}, '', '?action=register');
        showSection('registerForm', true);
    });

    function resetLoginToStep1() {
        stepPhone.classList.remove('d-none');
        stepPassword.classList.add('d-none');
        loginPhoneInput.value = '';
        loginPhoneInput.classList.remove('is-invalid');
        if (loginPasswordInp) loginPasswordInp.value = '';
        hideSmsCodeArea();
    }

    // Validate SĐT realtime
    loginPhoneInput?.addEventListener('input', () => loginPhoneInput.classList.remove('is-invalid'));

    loginPhoneInput?.addEventListener('blur', () => {
        const val = loginPhoneInput.value.trim();
        if (val && !/^0[0-9]{9}$/.test(val)) {
            loginPhoneInput.classList.add('is-invalid');
        }
    });

    // --- Nút TIẾP TỤC: kiểm tra SĐT → phân nhánh ---
    btnContinue?.addEventListener('click', () => {
        const phone = loginPhoneInput.value.trim();

        if (!/^0[0-9]{9}$/.test(phone)) {
            loginPhoneInput.classList.add('is-invalid');
            document.getElementById('loginPhoneFeedback').textContent = 'Số điện thoại không đúng định dạng';
            return;
        }

        const users = getUsers();
        const user  = users.find(u => u.phone === phone);

        if (!user) {
            // SĐT không tồn tại → chuyển sang đăng ký
            showErrorBanner(
                `Số điện thoại chưa được đăng ký. <a href="?action=register" style="color:var(--color-danger);font-weight:700;text-decoration:underline;">Đăng ký ngay</a>`,
                stepPhone
            );
            loginPhoneInput.classList.add('is-invalid');
            return;
        }

        if (user.is_temporary) {
            // Tài khoản tạm → redirect setup password
            const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
            let tokenObj = tokens.find(t => t.phone === phone);
            if (!tokenObj) {
                tokenObj = {
                    token: 'token-dynamic-' + Math.random().toString(36).substr(2, 9),
                    phone: phone,
                    createdAt: Date.now()
                };
                tokens.push(tokenObj);
                localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(tokens));
            }
            window.location.href = `?action=setup-password&token=${tokenObj.token}`;
            return;
        }

        // Thành viên chính thức → hiện ô mật khẩu
        if (loginPhoneDisp) loginPhoneDisp.textContent = phone;
        stepPhone.classList.add('d-none');
        stepPassword.classList.remove('d-none');
        loginPasswordInp?.focus();
    });

    // Nút ĐỔI SĐT
    btnChangePhone?.addEventListener('click', () => {
        resetLoginToStep1();
    });

    // Link QUÊN MẬT KHẨU
    triggerForgot?.addEventListener('click', (e) => {
        e.preventDefault();
        showSection('forgotPhoneSection', false);
        document.getElementById('forgotPhone')?.focus();
    });

    // Nút ĐĂNG NHẬP NHANH BẰNG SMS
    const btnLoginBySMS = document.getElementById('btnLoginBySMS');
    btnLoginBySMS?.addEventListener('click', () => {
        const phone = loginPhoneInput.value.trim() || loginPhoneDisp?.textContent;
        if (!phone) return;

        showToast('info', `Mã OTP đăng nhập nhanh đã gửi về SĐT của bạn (demo: 123456)`, 6000);
        console.log('[SMS Simulation] Mã OTP đăng nhập: 123456');

        const smsArea = document.getElementById('loginSmsCodeArea');
        if (smsArea) {
            smsArea.classList.remove('d-none');
            resetOtpInputs('.login-otp-input');
        }

        startCountdown('loginSmsTimer', 'btnResendLoginSms', () => {});
    });

    // Gửi lại OTP đăng nhập SMS
    document.getElementById('btnResendLoginSms')?.addEventListener('click', () => {
        showToast('info', 'Đã gửi lại mã OTP đăng nhập (demo: 123456)', 5000);
        resetOtpInputs('.login-otp-input');
        startCountdown('loginSmsTimer', 'btnResendLoginSms', () => {});
    });

    // OTP inputs đăng nhập SMS
    initOtpInputs('.login-otp-input', (code) => {
        if (code === '123456') {
            const phone = loginPhoneInput.value.trim() || loginPhoneDisp?.textContent;
            const users = getUsers();
            const user  = users.find(u => u.phone === phone);
            if (user) {
                setCurrentUser(user);
                showToast('success', 'Đăng nhập thành công!', 2000);
                setTimeout(() => {
                    window.location.href = user.role === 'admin'
                        ? '/pages/admin/index.html'
                        : '/pages/user/dashboard.html';
                }, 2000);
            }
        } else {
            showToast('error', 'Mã OTP không đúng. Vui lòng nhập 123456 để test.');
            resetOtpInputs('.login-otp-input');
        }
    });

    // --- Form submit: đăng nhập bằng mật khẩu ---
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const phone    = loginPhoneInput.value.trim();
        const password = loginPasswordInp?.value || '';
        const users    = getUsers();
        const user     = users.find(u => u.phone === phone && u.password === password);

        if (user) {
            setCurrentUser(user);
            showToast('success', 'Đăng nhập thành công!', 2000);
            setTimeout(() => {
                window.location.href = user.role === 'admin'
                    ? '/pages/admin/index.html'
                    : '/pages/user/dashboard.html';
            }, 2000);
        } else {
            showErrorBanner(
                'Mật khẩu không đúng. Vui lòng thử lại hoặc <a href="#" id="inlineForgotLink" style="color:var(--color-danger);font-weight:700;text-decoration:underline;">quên mật khẩu?</a>',
                stepPassword
            );
            setTimeout(() => {
                document.getElementById('inlineForgotLink')?.addEventListener('click', (e) => {
                    e.preventDefault();
                    triggerForgot?.click();
                });
            }, 100);
            loginPasswordInp?.classList.add('is-invalid');
        }
    });

    function hideSmsCodeArea() {
        const area = document.getElementById('loginSmsCodeArea');
        if (area) area.classList.add('d-none');
    }
}

// ============================================================
// 11. LUỒNG ĐĂNG KÝ + OTP (US 1-1)
// ============================================================
function initRegisterFlow() {
    const registerForm       = document.getElementById('registerForm');
    const regName            = document.getElementById('registerName');
    const regPhone           = document.getElementById('registerPhone');
    const regPassword        = document.getElementById('registerPassword');
    const regConfirmPassword = document.getElementById('registerConfirmPassword');
    const btnRegisterSubmit  = document.getElementById('btnRegisterSubmit');

    if (!registerForm) return;

    // Validate realtime
    function validateRegisterForm() {
        const isNameValid    = regName.value.trim().length > 0;
        const isPhoneValid   = /^0[0-9]{9}$/.test(regPhone.value.trim());
        const pwResult       = validatePassword(regPassword.value);
        const isPassValid    = pwResult.valid;
        const isConfirmValid = regConfirmPassword.value === regPassword.value && regConfirmPassword.value.length > 0;

        if (regPhone.value.trim().length > 0 && !isPhoneValid) {
            regPhone.classList.add('is-invalid');
        } else {
            regPhone.classList.remove('is-invalid');
        }

        if (regConfirmPassword.value.length > 0 && !isConfirmValid) {
            regConfirmPassword.classList.add('is-invalid');
        } else {
            regConfirmPassword.classList.remove('is-invalid');
        }

        btnRegisterSubmit.disabled = !(isNameValid && isPhoneValid && isPassValid && isConfirmValid);
    }

    [regName, regPhone, regPassword, regConfirmPassword].forEach(inp => {
        inp.addEventListener('input', validateRegisterForm);
        inp.addEventListener('blur',  validateRegisterForm);
    });

    regPassword.addEventListener('input', () => {
        updateStrengthBar('registerStrengthFill', 'registerStrengthLabel', regPassword.value);
        updatePasswordReqs(regPassword.value, 'registerPwReqs');
    });

    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // Guard: nếu dữ liệu chưa hợp lệ (Enter bypass disabled button), hiện lỗi thay vì tiếp tục
        const pwResult = validatePassword(regPassword.value);
        if (!regName.value.trim() || !/^0[0-9]{9}$/.test(regPhone.value.trim())) {
            showErrorBanner('Vui lòng điền đầy đủ họ tên và số điện thoại hợp lệ.', registerForm);
            return;
        }
        if (!pwResult.valid) {
            showErrorBanner('Mật khẩu chưa đạt yêu cầu. Cần ít nhất 8 ký tự, 1 chữ số và 1 ký tự đặc biệt.', registerForm);
            regPassword.focus();
            return;
        }
        if (regConfirmPassword.value !== regPassword.value) {
            showErrorBanner('Mật khẩu xác nhận chưa khớp.', registerForm);
            regConfirmPassword.focus();
            return;
        }

        const users    = getUsers();
        const existing = users.find(u => u.phone === regPhone.value.trim());
        if (existing && !existing.is_temporary) {
            showErrorBanner(
                'Số điện thoại này đã được đăng ký tài khoản. <a href="?action=login" style="color:var(--color-danger);font-weight:700;text-decoration:underline;">Đăng nhập ngay</a>',
                registerForm
            );
            return;
        }

        showSection('otpSection', false);
        resetOtpInputs('#otpSection .otp-input');
        showToast('info', 'Mã OTP xác thực đã gửi về SĐT của bạn (demo: 555666)', 6000);

        startCountdown('otpTimer', 'btnResendOtp', () => {
            showToast('warning', 'Mã OTP đã hết hiệu lực. Nhấn "Gửi lại mã" để nhận mã mới.');
        });
    });

    // Gửi lại OTP đăng ký
    document.getElementById('btnResendOtp')?.addEventListener('click', () => {
        showToast('info', 'Mã OTP mới đã gửi về SĐT của bạn (demo: 555666)', 6000);
        resetOtpInputs('#otpSection .otp-input');
        startCountdown('otpTimer', 'btnResendOtp', () => {});
    });

    // OTP inputs đăng ký
    initOtpInputs('#otpSection .otp-input', (code) => {
        if (code === '555666') {
            registerSuccess();
        } else {
            showToast('error', 'Mã OTP chưa chính xác. Vui lòng nhập 555666 để test.');
            resetOtpInputs('#otpSection .otp-input');
        }
    });

    function registerSuccess() {
        const users = getUsers();
        let userIdx = users.findIndex(u => u.phone === regPhone.value.trim());
        const newUser = {
            name: regName.value.trim(),
            phone: regPhone.value.trim(),
            password: regPassword.value,
            role: 'customer',
            is_temporary: false,
            points: 50
        };

        if (userIdx !== -1) {
            users[userIdx] = newUser;
        } else {
            users.push(newUser);
        }
        saveUsers(users);
        setCurrentUser(newUser);

        showSection('congratsSection', false);

        // Đếm số điểm thưởng
        const counterEl = document.getElementById('pointsCounter');
        if (counterEl) {
            let cur = 0;
            const stepTime = Math.floor(1500 / 50);
            const timer = setInterval(() => {
                cur += 1;
                counterEl.textContent = cur;
                if (cur >= 50) {
                    clearInterval(timer);
                    setTimeout(() => { window.location.href = '/pages/public/landing.html'; }, 2000);
                }
            }, stepTime);
        }
    }
}

// ============================================================
// 12. LUỒNG QUÊN MẬT KHẨU 3 BƯỚC (US 2-2)
// ============================================================
function initForgotPasswordFlow() {
    // Bước 1: Nhập SĐT
    const forgotPhoneForm = document.getElementById('forgotPhoneForm');
    const forgotPhoneInp  = document.getElementById('forgotPhone');

    document.getElementById('btnForgotBackToLogin')?.addEventListener('click', () => {
        showSection('loginForm', true);
        forgotPhoneInp.value = '';
        forgotPhoneInp.classList.remove('is-invalid');
    });

    forgotPhoneInp?.addEventListener('input', () => forgotPhoneInp.classList.remove('is-invalid'));
    forgotPhoneInp?.addEventListener('blur', () => {
        const val = forgotPhoneInp.value.trim();
        if (val && !/^0[0-9]{9}$/.test(val)) forgotPhoneInp.classList.add('is-invalid');
    });

    forgotPhoneForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = forgotPhoneInp.value.trim();

        if (!/^0[0-9]{9}$/.test(phone)) {
            forgotPhoneInp.classList.add('is-invalid');
            return;
        }

        const users = getUsers();
        if (!users.find(u => u.phone === phone)) {
            showErrorBanner(
                'Số điện thoại chưa được đăng ký. <a href="?action=register" style="color:var(--color-danger);font-weight:700;text-decoration:underline;">Đăng ký ngay</a>',
                forgotPhoneForm
            );
            forgotPhoneInp.classList.add('is-invalid');
            return;
        }

        // Lưu SĐT để dùng ở bước sau
        forgotPhoneForm.dataset.phone = phone;

        showSection('forgotOtpSection', false);
        resetOtpInputs('.forgot-otp-input');
        showToast('info', 'Mã OTP định danh đã được gửi thành công về số điện thoại của bạn, hiệu lực trong 5 phút (demo: 111222)', 7000);
        console.log('[SMS Simulation] Mã OTP khôi phục mật khẩu: 111222');

        startCountdown('forgotOtpTimer', 'btnForgotResendOtp', () => {
            showToast('warning', 'Mã OTP đã hết hiệu lực. Nhấn "Gửi lại mã" để nhận mã mới.');
        });
    });

    // Bước 2: Nhập OTP
    document.getElementById('btnForgotOtpBack')?.addEventListener('click', () => {
        showSection('forgotPhoneSection', false);
    });

    document.getElementById('btnForgotResendOtp')?.addEventListener('click', () => {
        showToast('info', 'Đã gửi lại mã OTP (demo: 111222)', 5000);
        resetOtpInputs('.forgot-otp-input');
        startCountdown('forgotOtpTimer', 'btnForgotResendOtp', () => {});
    });

    initOtpInputs('.forgot-otp-input', (code) => {
        if (code === '111222') {
            // Bước 3: Đặt mật khẩu mới
            const phone = forgotPhoneForm?.dataset.phone || '';
            const sec   = document.getElementById('forgotNewPasswordSection');
            if (sec) sec.dataset.phone = phone;
            showSection('forgotNewPasswordSection', false);
        } else {
            showToast('error', 'Mã OTP không đúng. Vui lòng nhập 111222 để test.');
            resetOtpInputs('.forgot-otp-input');
        }
    });

    // Bước 3: Đặt mật khẩu mới
    const forgotNewPass        = document.getElementById('forgotNewPassword');
    const forgotConfirmNewPass = document.getElementById('forgotConfirmNewPassword');
    const btnForgotNewSubmit   = document.getElementById('btnForgotNewPasswordSubmit');

    function validateForgotNewPassword() {
        if (!forgotNewPass || !forgotConfirmNewPass || !btnForgotNewSubmit) return;
        const result     = validatePassword(forgotNewPass.value);
        const isConfirm  = forgotConfirmNewPass.value === forgotNewPass.value && forgotConfirmNewPass.value.length > 0;

        if (forgotConfirmNewPass.value.length > 0 && !isConfirm) {
            forgotConfirmNewPass.classList.add('is-invalid');
        } else {
            forgotConfirmNewPass.classList.remove('is-invalid');
        }

        btnForgotNewSubmit.disabled = !(result.valid && isConfirm);
    }

    forgotNewPass?.addEventListener('input', () => {
        updateStrengthBar('forgotStrengthFill', 'forgotStrengthLabel', forgotNewPass.value);
        validateForgotNewPassword();
    });
    forgotConfirmNewPass?.addEventListener('input', validateForgotNewPassword);

    document.getElementById('forgotNewPasswordForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const phone = document.getElementById('forgotNewPasswordSection')?.dataset.phone;
        if (!phone) return;

        const users   = getUsers();
        const userIdx = users.findIndex(u => u.phone === phone);
        if (userIdx !== -1) {
            users[userIdx].password = forgotNewPass.value;
            saveUsers(users);

            showToast('success', 'Mật khẩu mới đã được cập nhật thành công! Vui lòng đăng nhập lại.', 4000);
            setTimeout(() => {
                window.location.href = '?action=login';
            }, 3000);
        }
    });
}

// ============================================================
// 13. LUỒNG THIẾT LẬP MẬT KHẨU — TÀI KHOẢN TẠM (US 2-4)
// ============================================================
function initSetupPasswordFlow() {
    const setupForm     = document.getElementById('setupPasswordForm');
    const setupPass     = document.getElementById('setupPassword');
    const setupConfirm  = document.getElementById('setupConfirmPassword');
    const setupCheckbox = document.getElementById('setupTermsCheckbox');
    const btnSetup      = document.getElementById('btnSetupSubmit');

    if (!setupForm) return;

    function validateSetupForm() {
        const result     = validatePassword(setupPass.value);
        const isConfirm  = setupConfirm.value === setupPass.value && setupConfirm.value.length > 0;
        const isChecked  = setupCheckbox?.checked || false;

        if (setupConfirm.value.length > 0 && !isConfirm) {
            setupConfirm.classList.add('is-invalid');
        } else {
            setupConfirm.classList.remove('is-invalid');
        }

        // Nút chỉ sáng khi ĐỦ cả 2 điều kiện: mật khẩu hợp lệ + đã tick chính sách (AC2.4.1)
        btnSetup.disabled = !(result.valid && isConfirm && isChecked);
    }

    setupPass.addEventListener('input', () => {
        updateStrengthBar('setupStrengthFill', 'setupStrengthLabel', setupPass.value);
        validateSetupForm();
    });
    setupConfirm.addEventListener('input', validateSetupForm);
    setupCheckbox?.addEventListener('change', validateSetupForm);

    setupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const sec   = document.getElementById('setupPasswordSection');
        const phone = sec?.dataset.phone;
        const token = sec?.dataset.token;
        if (!phone) return;

        const users   = getUsers();
        const userIdx = users.findIndex(u => u.phone === phone);

        if (userIdx !== -1) {
            users[userIdx].password     = setupPass.value;
            users[userIdx].is_temporary = false;
            users[userIdx].points       = (users[userIdx].points || 0) + 50;
            saveUsers(users);
            setCurrentUser(users[userIdx]);

            // Xoá token đã dùng
            if (token) {
                const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
                localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(tokens.filter(t => t.token !== token)));
            }

            showToast('success', 'Kích hoạt thành viên thành công! Bạn nhận thêm 50 điểm thưởng.', 4000);

            // AC2.4.2: redirect về dashboard với dữ liệu lịch sử đã gộp
            setTimeout(() => {
                window.location.href = '/pages/user/dashboard.html';
            }, 2500);
        }
    });

    // Gửi lại link khi hết hạn
    document.getElementById('btnRequestNewLink')?.addEventListener('click', () => {
        const phone = document.getElementById('expiredPhone')?.value?.trim();
        if (!/^0[0-9]{9}$/.test(phone)) {
            showToast('error', 'Vui lòng nhập số điện thoại hợp lệ.');
            return;
        }

        const token  = 'token-dynamic-' + Math.random().toString(36).substr(2, 9);
        const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
        tokens.push({ token, phone, createdAt: Date.now() });
        localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(tokens));

        showToast('success', 'Đã gửi link mới qua SMS. Vui lòng kiểm tra điện thoại.', 6000);
        console.log(`[SMS Simulation] Setup link: ${window.location.origin}/pages/public/login.html?action=setup-password&token=${token}`);
    });
}

// ============================================================
// 14. ADMIN QUICK-ADD CUSTOMER (US 1-3)
// ============================================================
function initAdminQuickAddCustomer() {
    const btnQuickAdd = document.getElementById('btnAdminQuickAddCustomer');
    if (!btnQuickAdd) return;

    btnQuickAdd.addEventListener('click', () => {
        const modalEl = document.getElementById('adminQuickAddModal');
        if (modalEl) new bootstrap.Modal(modalEl).show();
    });

    const formQuickAdd = document.getElementById('adminQuickAddForm');
    formQuickAdd?.addEventListener('submit', (e) => {
        e.preventDefault();

        const name      = document.getElementById('qaName')?.value;
        const phone     = document.getElementById('qaPhone')?.value;
        const submitBtn = formQuickAdd.querySelector('button[type="submit"]');

        if (!name || !/^[0-9]{10}$/.test(phone)) {
            alert('Họ tên và Số điện thoại 10 số là bắt buộc.');
            return;
        }

        const origContent = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Đang lưu...`;

        setTimeout(() => {
            const users    = getUsers();
            const existing = users.find(u => u.phone === phone);

            if (!existing) {
                users.push({
                    name, phone,
                    role: 'customer',
                    is_temporary: true,
                    points: 0,
                    pet: {
                        name: document.getElementById('qaPetName')?.value,
                        species: document.getElementById('qaPetSpecies')?.value,
                        weight: document.getElementById('qaPetWeight')?.value
                    }
                });
                saveUsers(users);
            }

            const token  = 'token-dynamic-' + Math.random().toString(36).substr(2, 9);
            const tokens = JSON.parse(localStorage.getItem(TEMP_TOKENS_KEY)) || [];
            tokens.push({ token, phone, createdAt: Date.now() });
            localStorage.setItem(TEMP_TOKENS_KEY, JSON.stringify(tokens));

            showAdminToast(`Đã tạo tài khoản tạm + gửi SMS kích hoạt thành công!<br><a href="/pages/public/login.html?action=setup-password&token=${token}" target="_blank" style="color:var(--color-accent);font-weight:bold;">Mở liên kết kích hoạt (Simulated SMS)</a>`);

            submitBtn.disabled = false;
            submitBtn.innerHTML = origContent;

            const modalInstance = bootstrap.Modal.getInstance(document.getElementById('adminQuickAddModal'));
            if (modalInstance) modalInstance.hide();
            formQuickAdd.reset();

            if (typeof renderAdminUsersList === 'function') renderAdminUsersList();
        }, 1000);
    });
}

function showAdminToast(message) {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(container);
    }

    const id = 'toast-admin-' + Date.now();
    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `);

    const el      = document.getElementById(id);
    const bsToast = new bootstrap.Toast(el, { delay: 6000 });
    bsToast.show();
    el.addEventListener('hidden.bs.toast', () => el.remove());
}

// ============================================================
// 15. INIT TỔNG HỢP
// ============================================================
function initAuth() {
    initMockDatabase();
    enforceTemporaryAccountLock();
    initPasswordToggles();
    handleLoginRouting();
    initLoginFlow();
    initRegisterFlow();
    initForgotPasswordFlow();
    initSetupPasswordFlow();
    initAdminQuickAddCustomer();

    // Xử lý click link nội bộ trong cùng trang login.html
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (href && href.includes('login.html') && window.location.pathname.includes('login.html')) {
            e.preventDefault();
            window.history.pushState({}, '', href);
            handleLoginRouting();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuth);
} else {
    initAuth();
}

window.addEventListener('popstate', handleLoginRouting);

// Expose shared auth helpers globally — các trang khác (dashboard, header) dùng type="module" không thể import trực tiếp
window.PawPalAuth = {
    getCurrentUser,
    setCurrentUser,
    getUsers,
    saveUsers,
    logout,
    enforceTemporaryAccountLock,
    showToast,
};
