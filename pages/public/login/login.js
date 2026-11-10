/** Customer authentication: credentials and OTP are verified by the server. */
(async function () {
    const { consumeLoginTarget } = await import('/scripts/shared/login-redirect.mjs');
    const byId = id => document.getElementById(id);
    const value = id => byId(id)?.value.trim() || '';
    const password = id => byId(id)?.value || '';
    const auth = () => window.PawpalCustomerAuth || {
        async request(action, body = {}, authenticated = false) {
            const headers = { 'Content-Type': 'application/json' };
            if (authenticated) {
                const client = window.getSupabaseClient?.() || window.SupabaseClient;
                const { data } = await client?.auth.getSession() || {};
                if (data?.session) headers.Authorization = `Bearer ${data.session.access_token}`;
            }
            const response = await fetch(`/api/customer/auth/${action}`, { method: 'POST', headers, body: JSON.stringify(body), cache: 'no-store' });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'Không thể xử lý yêu cầu.');
            return result;
        },
        async accept(result) {
            const {resetGuestSession}=await import('/scripts/shared/guest-session-boundary.mjs');
            await resetGuestSession();
            if (result.session) {
                const client = window.getSupabaseClient?.() || window.SupabaseClient;
                if (!client) throw new Error('Chưa tải được dịch vụ xác thực. Vui lòng thử lại.');
                const {error}=await client.auth.setSession(result.session);
                if(error)throw error;
            } else if(result.user&&!result.user.is_temporary){
                throw new Error('Chưa tạo được phiên đăng nhập. Vui lòng thử lại.');
            }
            const user = result.user;
            try {
                localStorage.setItem('pawpal_current_user', JSON.stringify(user));
                sessionStorage.setItem('pawpal_current_user', JSON.stringify(user));
            } catch {}
            document.dispatchEvent(new CustomEvent('auth_state_changed', { detail: user }));
            return user;
        }
    };
    const validPhone = phone => /^0\d{9}$/.test(phone);
    const validPassword = pass => /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/s.test(pass) && pass.length <= 128;
    let challenge = null;
    let timer;
    let busy = false;
    let routeVersion = 0;
    const sections = ['loginForm', 'registerForm', 'otpSection', 'forgotPhoneSection', 'forgotOtpSection', 'forgotNewPasswordSection', 'congratsSection', 'setupPasswordSection', 'setupExpiredSection', 'alreadyLoggedInSection'];
    function notice(message, error = false) {
        const container = byId('toastContainer');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast-custom show ' + (error ? 'toast-error' : 'toast-success');
        toast.setAttribute('role', 'alert');
        toast.textContent = message;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 6000);
    }
    function show(id) {
        for (const name of sections) {
            const element = byId(name);
            if (!element) continue;
            element.classList.toggle('d-none', name !== id);
            element.classList.toggle('active-form', name === id && ['loginForm', 'registerForm'].includes(name));
            element.style.opacity = name === id ? '1' : '';
        }
        if (byId('authTabs')) byId('authTabs').style.display = ['loginForm', 'registerForm'].includes(id) ? 'flex' : 'none';
    }
    function clearChallenge() { challenge = null; clearInterval(timer); }
    function renderTestCode(result, register) {
        document.getElementById('authTestOtp')?.remove();
        if (result.testMode !== true || !/^\d{6}$/.test(String(result.testCode || ''))) return;
        const note = document.createElement('p');
        note.id = 'authTestOtp';
        note.className = 'text-muted';
        note.textContent = `Mã thử nghiệm: ${result.testCode}. Chỉ dùng cho tài khoản thử nghiệm.`;
        byId(register ? 'otpSection' : 'forgotOtpSection')?.prepend(note);
    }
    async function run(button, operation) {
        if (busy) return;
        busy = true;
        if (button) button.disabled = true;
        try { await operation(); }
        catch (error) { notice(error.message || 'Không thể xử lý yêu cầu.', true); }
        finally { busy = false; if (button) button.disabled = false; }
    }
    function resetInputs(selector) {
        const inputs = [...document.querySelectorAll(selector)];
        inputs.forEach((input, index) => { input.value = ''; input.disabled = index > 0; });
        inputs[0]?.focus();
    }
    function countdown(register, seconds = 60) {
        clearInterval(timer);
        const label = byId(register ? 'otpTimer' : 'forgotOtpTimer');
        const button = byId(register ? 'btnResendOtp' : 'btnForgotResendOtp');
        const ends = Date.now() + seconds * 1000;
        if (button) button.disabled = true;
        const tick = () => {
            const left = Math.max(0, Math.ceil((ends - Date.now()) / 1000));
            if (label) label.textContent = String(Math.floor(left / 60)).padStart(2, '0') + ':' + String(left % 60).padStart(2, '0');
            if (!left) { clearInterval(timer); if (button) button.disabled = false; }
        };
        tick(); timer = setInterval(tick, 1000);
    }
    async function sendOtp(phone, purpose) {
        if (!validPhone(phone)) throw new Error('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.');
        const result = await auth().request('otp/request', { phone, purpose });
        clearChallenge();
        challenge = { id: result.challengeId, phone, purpose, code: '', linkGuest: result.linkGuest === true };
        const register = purpose === 'register';
        show(register ? 'otpSection' : 'forgotOtpSection');
        renderTestCode(result, register);
        if (byId('forgotPhone')) byId('forgotPhone').value = phone;
        resetInputs(register ? '#otpSection .otp-input' : '.forgot-otp-input');
        countdown(register, result.resendAfter);
        notice(result.testMode === true ? 'Mã thử nghiệm đã sẵn sàng, có hiệu lực trong 5 phút.' : 'Đã gửi mã xác thực. Mã có hiệu lực trong 5 phút.');
    }
    async function finish(passwordValue, name) {
        if(new URLSearchParams(location.search).get('demo_activation')==='1'){
            const {expiredDemoActivation}=await import('/scripts/shared/guest-activation-demo.mjs');
            if(expiredDemoActivation(location.search)){clearChallenge();show('setupExpiredSection');throw new Error('Link giả lập đã hết hạn 48 giờ.');}
        }
        if (!challenge) throw new Error('Vui lòng yêu cầu mã xác thực mới.');
        if (!validPassword(passwordValue)) throw new Error('Mật khẩu cần ít nhất 8 ký tự, một chữ số và một ký tự đặc biệt.');
        const result = await auth().request('otp/complete', { challengeId: challenge.id, code: challenge.code, password: passwordValue, name, ...(challenge.linkGuest ? { linkGuest: true } : {}) });
        await auth().accept(result);
        clearChallenge();
        for (const id of ['registerPassword', 'registerConfirmPassword', 'forgotNewPassword', 'forgotConfirmNewPassword', 'setupPassword', 'setupConfirmPassword']) if (byId(id)) byId(id).value = '';
        notice('Xác thực và lưu mật khẩu thành công.');
        window.location.href = consumeLoginTarget(sessionStorage, location.origin, new URLSearchParams(location.search).get('redirect'));
    }
    async function checkLoggedIn(version) {
        try {
            let u = JSON.parse(localStorage.getItem('pawpal_current_user') || 'null');
            if (!u?.is_temporary && !u?.system_role && (!u?.role || u.role === 'customer')) {
                const {verifyCustomerSession}=await import('/scripts/shared/customer-session.mjs');
                const client = window.getSupabaseClient?.() || window.SupabaseClient;
                const verified=await verifyCustomerSession(client);
                if(!verified || version!==routeVersion)return false;
                if(u?.auth_user_id!==verified.id){
                    const {user}=await auth().request('me', {}, true);
                    if(version!==routeVersion || user?.auth_user_id!==verified.id || !user.id)return false;
                    u=user;
                    localStorage.setItem('pawpal_current_user',JSON.stringify(u));
                    sessionStorage.setItem('pawpal_current_user',JSON.stringify(u));
                }
                const params = new URLSearchParams(window.location.search);
                const targetPhone = params.get('phone');
                if (targetPhone && targetPhone !== u.phone) {
                    show('alreadyLoggedInSection');
                    if (byId('loggedInNameDisplay')) byId('loggedInNameDisplay').textContent = u.name || u.full_name || 'Khách hàng';
                    if (byId('loggedInPhoneDisplay')) byId('loggedInPhoneDisplay').textContent = u.phone || '';
                    if (byId('loggedInAvatarDisplay')) byId('loggedInAvatarDisplay').textContent = (String(u.name || u.full_name || 'K').trim()).charAt(0).toUpperCase();
                    if (byId('loggedInSwitchNote')) {
                        byId('loggedInSwitchNote').textContent = `Bạn đang muốn truy cập cho số điện thoại ${targetPhone}. Vui lòng đăng xuất tài khoản hiện tại trước.`;
                    }
                    return true;
                }
                const dest = consumeLoginTarget(sessionStorage, location.origin, params.get('redirect'));
                show('alreadyLoggedInSection');
                if (byId('loggedInNameDisplay')) byId('loggedInNameDisplay').textContent = u.name || u.full_name || 'Khách hàng';
                if (byId('loggedInPhoneDisplay')) byId('loggedInPhoneDisplay').textContent = u.phone || '';
                if (byId('loggedInAvatarDisplay')) byId('loggedInAvatarDisplay').textContent = (String(u.name || u.full_name || 'K').trim()).charAt(0).toUpperCase();
                if (byId('loggedInSwitchNote')) {
                    byId('loggedInSwitchNote').textContent = 'Bạn đã đăng nhập thành công. Đang chuyển hướng về trang cá nhân...';
                }
                window.location.replace(dest);
                return true;
            }
        } catch (e) {}
        return false;
    }
    async function route() {
        const version = ++routeVersion;
        clearChallenge();
        if (await checkLoggedIn(version)) return;
        if(version!==routeVersion)return;
        const params = new URLSearchParams(window.location.search);
        const action = params.get('action') || window.location.hash.slice(1);
        if(action==='guest-activate'&&params.get('demo_activation')==='1'){
            const {expiredDemoActivation}=await import('/scripts/shared/guest-activation-demo.mjs');
            if(version!==routeVersion)return;
            if(expiredDemoActivation(window.location.search)){
                show('setupExpiredSection');return;
            }
            notice('Link thiết lập mật khẩu giả lập có hiệu lực 48 giờ. Không gửi SMS thật.');
        }
        if (action === 'register') {
            show('registerForm');
            if (params.get('phone')) byId('registerPhone').value = params.get('phone');
        } else if (['setup-password', 'guest-activate', 'guest-verify-otp'].includes(action)) {
            if (action === 'guest-activate' && !params.get('phone')) {
                show('loginForm');
                (async () => {
                    try {
                        const {guestCommerce} = await import('/scripts/shared/guest-commerce-client.mjs');
                        const context = await guestCommerce.request('context');
                        if (version !== routeVersion) return;
                        if (!context.initialized || !validPhone(context.contact?.phone)) throw new Error('Phiên đặt lịch đã hết hiệu lực. Vui lòng mở lại trang tra cứu hoặc liên hệ cửa hàng.');
                        byId('loginPhone').value = context.contact.phone;
                        byId('loginStepPhone').classList.add('d-none');
                        byId('loginStepSendOTP').classList.remove('d-none');
                        byId('loginStepPassword').classList.add('d-none');
                        byId('loginOtpPhoneDisplay').textContent = context.contact.phone;
                    } catch (error) { if (version === routeVersion) notice(error.message, true); }
                })();
            } else {
            const phone = params.get('phone');
            if (phone && validPhone(phone)) {
                show('loginForm');
                if (byId('loginPhone')) byId('loginPhone').value = phone;
                byId('loginStepPhone')?.classList.add('d-none');
                byId('loginStepSendOTP')?.classList.remove('d-none');
                byId('loginStepPassword')?.classList.add('d-none');
                if (byId('loginOtpPhoneDisplay')) byId('loginOtpPhoneDisplay').textContent = phone;
                notice('Số điện thoại này có tài khoản tạm. Vui lòng thiết lập mật khẩu để kích hoạt.');
            } else {
                show('forgotPhoneSection');
                if (phone && byId('forgotPhone')) byId('forgotPhone').value = phone;
                notice('Vui lòng xác thực số điện thoại bằng mã OTP để thiết lập mật khẩu.');
            }
            }
        } else {
            show('loginForm');
            if (params.get('phone') && byId('loginPhone')) byId('loginPhone').value = params.get('phone');
        }
        byId('tabLogin')?.classList.toggle('active', action !== 'register');
        byId('tabRegister')?.classList.toggle('active', action === 'register');
    }
    function init() {
        route();
        if (new URLSearchParams(location.search).get('reason') === 'session-expired') {
            const message = document.createElement('p');
            message.setAttribute('role', 'alert');
            message.textContent = 'Phiên đăng nhập không còn hiệu lực. Vui lòng đăng nhập để tiếp tục.';
            message.style.color = '#8F2424';
            byId('loginForm')?.prepend(message);
        }
        const on = (id, event, callback) => byId(id)?.addEventListener(event, callback);
        on('btnLogoutFromLogin', 'click', async () => {
            try {
                const client = window.getSupabaseClient?.() || window.SupabaseClient;
                if (client) await client.auth.signOut();
            } catch {}
            localStorage.removeItem('pawpal_current_user');
            sessionStorage.removeItem('pawpal_current_user');
            window.location.reload();
        });
        on('tabLogin', 'click', () => { history.pushState({}, '', '?action=login'); route(); });
        on('tabRegister', 'click', () => { history.pushState({}, '', '?action=register'); route(); });
        on('btnLoginContinue', 'click', () => run(byId('btnLoginContinue'), async () => {
            const phone = value('loginPhone');
            if (!validPhone(phone)) throw new Error('Vui lòng nhập số điện thoại hợp lệ.');
            const result = await auth().request('lookup', { phone });
            if (!result.exists) throw new Error('Số điện thoại chưa đăng ký. Vui lòng tạo tài khoản.');
            byId('loginStepPhone').classList.add('d-none');
            byId('loginStepSendOTP')?.classList.toggle('d-none', !result.isTemporary);
            byId('loginStepPassword').classList.toggle('d-none', result.isTemporary);
            if (byId('loginPhoneDisplay')) byId('loginPhoneDisplay').textContent = phone;
            if (byId('loginOtpPhoneDisplay')) byId('loginOtpPhoneDisplay').textContent = phone;
            if (!result.isTemporary) byId('loginPassword').focus();
        }));
        for (const id of ['btnChangePhone', 'btnChangePhoneOtp']) on(id, 'click', () => {
            clearChallenge();
            byId('loginStepPhone').classList.remove('d-none');
            byId('loginStepPassword').classList.add('d-none');
            byId('loginStepSendOTP')?.classList.add('d-none');
        });
        on('btnSendOTPGuest', 'click', () => run(byId('btnSendOTPGuest'), () => sendOtp(value('loginPhone'), 'activate')));
        on('btnSkipGuestSetup', 'click', () => { window.location.href = '/'; });
        on('loginForm', 'submit', event => {
            event.preventDefault();
            if (byId('loginStepPassword').classList.contains('d-none')) { byId('btnLoginContinue').click(); return; }
            run(byId('btnLoginSubmit'), async () => {
                const result = await auth().request('login', { phone: value('loginPhone'), password: password('loginPassword') });
                await auth().accept(result);
                byId('loginPassword').value = '';
                location.href = consumeLoginTarget(sessionStorage, location.origin, new URLSearchParams(location.search).get('redirect'));
            });
        });
        const validateRegister = () => {
            const pass = password('registerPassword');
            const confirm = password('registerConfirmPassword');
            const invalidPass = pass.length > 0 && !validPassword(pass);
            const mismatch = confirm.length > 0 && pass !== confirm;
            byId('registerPasswordFeedback').classList.toggle('d-block', invalidPass);
            byId('registerConfirmFeedback').classList.toggle('d-block', mismatch);
            for (const [id, invalid] of [['registerPassword', invalidPass], ['registerConfirmPassword', mismatch]]) {
                byId(id).classList.toggle('is-invalid', invalid);
                byId(id).setAttribute('aria-invalid', String(invalid));
            }
            byId('btnRegisterSubmit').disabled = busy || !(value('registerName') && validPhone(value('registerPhone')) && validPassword(pass) && pass === confirm);
        };
        for (const id of ['registerName', 'registerPhone', 'registerPassword', 'registerConfirmPassword']) {
            on(id, 'input', validateRegister);
            on(id, 'change', validateRegister);
        }
        validateRegister();
        on('registerForm', 'submit', event => {
            event.preventDefault();
            run(byId('btnRegisterSubmit'), async () => {
                if (!value('registerName') || !validPassword(password('registerPassword')) || password('registerPassword') !== password('registerConfirmPassword')) throw new Error('Vui lòng kiểm tra họ tên và mật khẩu.');
                await sendOtp(value('registerPhone'), 'register');
            }).finally(validateRegister);
        });
        for (const selector of ['#otpSection .otp-input', '.forgot-otp-input']) {
            const inputs = [...document.querySelectorAll(selector)];
            inputs.forEach((input, index) => {
                input.addEventListener('input', () => {
                    input.value = input.value.replace(/\D/g, '').slice(-1);
                    if (!input.value) return;
                    if (inputs[index + 1]) { inputs[index + 1].disabled = false; inputs[index + 1].focus(); return; }
                    const code = inputs.map(i => i.value).join('');
                    if (!challenge || code.length !== 6) return;
                    challenge.code = code;
                    if (challenge.purpose === 'register') run(null, async () => {
                        try { await finish(password('registerPassword'), value('registerName')); }
                        catch (error) { resetInputs('#otpSection .otp-input'); throw error; }
                    });
                    else show(challenge.purpose === 'activate' ? 'setupPasswordSection' : 'forgotNewPasswordSection');
                });
                input.addEventListener('keydown', event => {
                    if (event.key === 'Backspace' && !input.value && inputs[index - 1]) inputs[index - 1].focus();
                });
            });
        }
        for (const id of ['btnResendOtp', 'btnForgotResendOtp']) on(id, 'click', () => {
            const previous = challenge;
            if (previous) run(byId(id), () => sendOtp(previous.phone, previous.purpose)).then(() => { if (challenge) byId(id).disabled = true; });
        });
        on('triggerForgot', 'click', event => { event.preventDefault(); clearChallenge(); show('forgotPhoneSection'); byId('forgotPhone').value = value('loginPhone'); });
        on('forgotPhoneForm', 'submit', event => { event.preventDefault(); run(byId('forgotPhoneForm').querySelector('button[type=submit]'), () => sendOtp(value('forgotPhone'), 'reset')); });
        for (const id of ['btnForgotBackToLogin', 'btnForgotOtpBack']) on(id, 'click', () => { clearChallenge(); show(id === 'btnForgotOtpBack' ? 'forgotPhoneSection' : 'loginForm'); });
        const validateReset = () => {
            const pass = password('forgotNewPassword'), confirm = password('forgotConfirmNewPassword');
            const invalidPass = pass.length > 0 && !validPassword(pass);
            const mismatch = confirm.length > 0 && pass !== confirm;
            byId('forgotPasswordFeedback').classList.toggle('d-block', invalidPass);
            byId('forgotConfirmFeedback').classList.toggle('d-block', mismatch);
            for (const [id, invalid] of [['forgotNewPassword', invalidPass], ['forgotConfirmNewPassword', mismatch]]) {
                byId(id).classList.toggle('is-invalid', invalid);
                byId(id).setAttribute('aria-invalid', String(invalid));
            }
            byId('btnForgotNewPasswordSubmit').disabled = !(validPassword(pass) && pass === confirm);
        };
        for (const id of ['forgotNewPassword', 'forgotConfirmNewPassword']) {
            on(id, 'input', validateReset);
            on(id, 'change', validateReset);
        }
        on('forgotNewPasswordForm', 'submit', event => {
            event.preventDefault();
            run(byId('btnForgotNewPasswordSubmit'), async () => {
                if (password('forgotNewPassword') !== password('forgotConfirmNewPassword')) throw new Error('Mật khẩu nhập lại chưa khớp.');
                try { await finish(password('forgotNewPassword')); }
                catch (error) { show('forgotOtpSection'); resetInputs('.forgot-otp-input'); throw error; }
            });
        });
        on('btnRequestNewLink', 'click', () => { clearChallenge(); show('forgotPhoneSection'); });
        const validateSetup = () => {
            const pass = password('setupPassword'), confirm = password('setupConfirmPassword');
            const invalidPass = pass.length > 0 && !validPassword(pass);
            const mismatch = confirm.length > 0 && pass !== confirm;
            byId('setupPasswordFeedback').classList.toggle('d-block', invalidPass);
            byId('setupConfirmFeedback').classList.toggle('d-block', mismatch);
            for (const [id, invalid] of [['setupPassword', invalidPass], ['setupConfirmPassword', mismatch]]) {
                byId(id).classList.toggle('is-invalid', invalid);
                byId(id).setAttribute('aria-invalid', String(invalid));
            }
            byId('btnSetupSubmit').disabled = busy || !(validPassword(pass) && pass === confirm && byId('setupTermsCheckbox').checked);
        };
        for (const id of ['setupPassword', 'setupConfirmPassword', 'setupTermsCheckbox']) {
            on(id, 'input', validateSetup);
            on(id, 'change', validateSetup);
        }
        validateSetup();
        on('setupPasswordForm', 'submit', event => {
            event.preventDefault();
            if (!challenge || challenge.purpose !== 'activate') { notice('Vui lòng xác thực số điện thoại trước khi kích hoạt.', true); return; }
            if (!validPassword(password('setupPassword')) || password('setupPassword') !== password('setupConfirmPassword') || !byId('setupTermsCheckbox').checked) { validateSetup(); return; }
            run(byId('btnSetupSubmit'), () => finish(password('setupPassword'))).finally(validateSetup);
        });
        document.querySelectorAll('.btn-toggle-password').forEach(button => button.addEventListener('click', () => {
            const input = button.previousElementSibling;
            if (!input) return;
            input.type = input.type === 'password' ? 'text' : 'password';
            button.setAttribute('aria-label', input.type === 'password' ? 'Hiện mật khẩu' : 'Ẩn mật khẩu');
        }));
        // Header links may change only the hash on this shared auth page.
        document.addEventListener('click', event => {
            if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
            const link = event.target.closest?.('.main-header a[href]');
            if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
            const target = new URL(link.href, window.location.href);
            if (target.origin !== window.location.origin || target.pathname !== window.location.pathname) return;
            if (target.pathname !== '/login' && target.pathname !== '/pages/public/login/login.html') return;
            event.preventDefault();
            history.pushState({}, '', target.href);
            route();
        });
        window.addEventListener('hashchange', route);
        window.addEventListener('popstate', route);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
