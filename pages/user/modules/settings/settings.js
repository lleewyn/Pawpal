/**
 * modules/settings/settings.js - Logic cho Module Cài đặt tài khoản PawPal
 */

const PAWPAL_USERS_KEY = 'pawpal_users_db';
const CURRENT_USER_KEY = 'pawpal_current_user';

function getCurrentUser() {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
}

function getUsers() {
    return JSON.parse(localStorage.getItem(PAWPAL_USERS_KEY)) || [];
}

function saveUsers(users) {
    localStorage.setItem(PAWPAL_USERS_KEY, JSON.stringify(users));
}

function updateCurrentUserRecord(updatedUser) {
    const users = getUsers();
    const userIndex = users.findIndex(u => String(u.phone) === String(updatedUser.phone) || (u.id && u.id === updatedUser.id));
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updatedUser };
        saveUsers(users);
    }
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
}

function showToast(type, message, duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        alert(message);
        return;
    }

    const toastId = 'toast-' + Date.now();
    const toastColors = {
        success: { bg: '#236B48', accent: '#DCEEE2' },
        error: { bg: '#DC2626', accent: '#FEE2E2' },
        info: { bg: '#20495E', accent: '#DCEAF2' },
        warning: { bg: '#D97706', accent: '#FEF3C7' }
    };
    const cfg = toastColors[type] || toastColors.info;

    const toastHtml = `
        <div id="${toastId}" style="
            display:flex;
            align-items:flex-start;
            gap:12px;
            background:#ffffff;
            border:1px solid ${cfg.accent};
            box-shadow:0 8px 24px rgba(20, 40, 30, 0.12);
            border-radius:12px;
            padding:12px 16px;
            min-width:300px;
            max-width:400px;
            color:#203A2C;
            margin-bottom:10px;
            animation: userModuleFadeIn 0.2s ease-out;
        ">
            <div style="
                width:24px;
                height:24px;
                flex:0 0 24px;
                border-radius:50%;
                background:${cfg.accent};
                color:${cfg.bg};
                display:flex;
                align-items:center;
                justify-content:center;
                font-weight:700;
                font-size:12px;
            ">${type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '!' : 'i'}</div>
            <div style="flex:1; min-width:0;">
                <div style="font-weight:700; font-size:0.9rem; color:#203A2C;">${type === 'success' ? 'Thành công' : type === 'error' ? 'Lỗi' : type === 'warning' ? 'Cảnh báo' : 'Thông báo'}</div>
                <div style="font-size:0.85rem; color:#4F7A65; margin-top:2px;">${message}</div>
            </div>
            <button type="button" class="toast-close" style="
                border:none;
                background:transparent;
                color:#94A3B8;
                font-size:18px;
                cursor:pointer;
                padding:0;
            ">&times;</button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHtml);
    const toastEl = document.getElementById(toastId);
    if (!toastEl) return;

    toastEl.querySelector('.toast-close').addEventListener('click', () => toastEl.remove());
    setTimeout(() => {
        if (toastEl.parentNode) toastEl.remove();
    }, duration);
}

function calculatePasswordStrength(password) {
    let score = 0;
    if (password.length === 0) return { score: 0 };
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password)) score++;
    return { score: Math.min(score, 4) };
}

function initPasswordStrengthMeter() {
    const newPassword = document.getElementById('newPassword');
    const strengthLabel = document.getElementById('strengthLabel');
    const seg1 = document.getElementById('strengthSeg1');
    const seg2 = document.getElementById('strengthSeg2');
    const seg3 = document.getElementById('strengthSeg3');

    if (!newPassword || !strengthLabel) return;

    newPassword.addEventListener('input', () => {
        const password = newPassword.value;
        const strength = calculatePasswordStrength(password);

        if (seg1) seg1.className = 'strength-bar-segment';
        if (seg2) seg2.className = 'strength-bar-segment';
        if (seg3) seg3.className = 'strength-bar-segment';

        if (strength.score === 0) {
            strengthLabel.textContent = 'Trống';
            strengthLabel.style.color = '#4F7A65';
        } else if (strength.score <= 1) {
            if (seg1) seg1.classList.add('weak');
            strengthLabel.textContent = 'Yếu';
            strengthLabel.style.color = '#DC2626';
        } else if (strength.score <= 2) {
            if (seg1) seg1.classList.add('medium');
            if (seg2) seg2.classList.add('medium');
            strengthLabel.textContent = 'Trung bình';
            strengthLabel.style.color = '#D97706';
        } else {
            if (seg1) seg1.classList.add('strong');
            if (seg2) seg2.classList.add('strong');
            if (seg3) seg3.classList.add('strong');
            strengthLabel.textContent = 'Mạnh';
            strengthLabel.style.color = '#236B48';
        }

        validateChangePasswordForm();
    });
}

function validateChangePasswordForm() {
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmNewPassword = document.getElementById('confirmNewPassword');
    const btnSubmit = document.getElementById('btnUpdateSecurity');

    if (!newPassword || !confirmNewPassword || !btnSubmit) return;

    const strength = calculatePasswordStrength(newPassword.value);
    const isPasswordValid = strength.score >= 1 && newPassword.value.length >= 8;
    const isConfirmValid = confirmNewPassword.value === newPassword.value && confirmNewPassword.value.length > 0;
    const isCurrentValid = currentPassword ? currentPassword.value.length > 0 : true;

    if (confirmNewPassword.value.length > 0 && !isConfirmValid) {
        confirmNewPassword.classList.add('is-invalid');
    } else {
        confirmNewPassword.classList.remove('is-invalid');
    }

    btnSubmit.disabled = !(isPasswordValid && isConfirmValid && isCurrentValid);
}

function initChangePasswordForm() {
    const form = document.getElementById('changePasswordForm');
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmNewPassword = document.getElementById('confirmNewPassword');
    const btnSubmit = document.getElementById('btnUpdateSecurity');
    const btnCancel = document.getElementById('btnCancelSecurity');

    if (!form || !btnSubmit) return;

    if (currentPassword) currentPassword.addEventListener('input', validateChangePasswordForm);
    if (confirmNewPassword) confirmNewPassword.addEventListener('input', validateChangePasswordForm);

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            form.reset();
            const strengthLabel = document.getElementById('strengthLabel');
            if (strengthLabel) {
                strengthLabel.textContent = 'Trống';
                strengthLabel.style.color = '#4F7A65';
            }
            ['strengthSeg1', 'strengthSeg2', 'strengthSeg3'].forEach(id => {
                const el = document.getElementById(id);
                if (el) el.className = 'strength-bar-segment';
            });
            btnSubmit.disabled = true;
        });
    }

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        if (!user) return;

        const updatedUser = {
            ...user,
            password: newPassword.value,
            is_temporary: false
        };

        updateCurrentUserRecord(updatedUser);

        // Ẩn warning nếu có
        const warning = document.getElementById('tempAccountWarning');
        if (warning) warning.classList.add('d-none');

        showToast('success', 'Mật khẩu đã được cập nhật thành công!');
        form.reset();
        btnSubmit.disabled = true;
    });
}

function initPasswordToggles() {
    document.querySelectorAll('.btn-toggle-password-custom').forEach(btn => {
        btn.addEventListener('click', () => {
            const wrapper = btn.closest('.password-input-wrapper-custom');
            const input = wrapper ? wrapper.querySelector('input') : btn.previousElementSibling;
            if (!input) return;

            if (input.type === 'password') {
                input.type = 'text';
                btn.innerHTML = `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
            } else {
                input.type = 'password';
                btn.innerHTML = `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
            }
        });
    });
}

function initPasswordAccordion() {
    const toggleBtn = document.getElementById('togglePasswordBtn');
    const formContainer = document.getElementById('passwordFormContainer');
    const icon = document.getElementById('passwordToggleIcon');

    if (toggleBtn && formContainer && icon) {
        toggleBtn.addEventListener('click', () => {
            const isHidden = formContainer.classList.contains('d-none');
            if (isHidden) {
                formContainer.classList.remove('d-none');
                icon.style.transform = 'rotate(0deg)';
            } else {
                formContainer.classList.add('d-none');
                icon.style.transform = 'rotate(180deg)';
            }
        });
    }
}

function initNotificationSettings(user) {
    const form = document.getElementById('notificationSettingsForm');
    const emailCheckbox = document.getElementById('notifyEmail');
    const smsCheckbox = document.getElementById('notifySMS');

    if (!form || !emailCheckbox || !smsCheckbox) return;

    const settings = user.notificationPreferences || { email: true, sms: false };
    emailCheckbox.checked = Boolean(settings.email);
    smsCheckbox.checked = Boolean(settings.sms);

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const updatedPreferences = {
            email: emailCheckbox.checked,
            sms: smsCheckbox.checked,
        };
        const updatedUser = {
            ...user,
            notificationPreferences: updatedPreferences,
        };
        updateCurrentUserRecord(updatedUser);
        showToast('success', 'Cài đặt thông báo đã được lưu!');
    });
}

function initLanguageAndUnit(user) {
    const languageSelect = document.getElementById('languageSelect');
    const unitKgBtn = document.getElementById('unitKgBtn');
    const unitLbBtn = document.getElementById('unitLbBtn');

    if (languageSelect) {
        const savedLang = localStorage.getItem('pawpal_language') || 'vi';
        languageSelect.value = savedLang;
        languageSelect.addEventListener('change', () => {
            localStorage.setItem('pawpal_language', languageSelect.value);
            showToast('success', 'Đã lưu tùy chọn ngôn ngữ!');
        });
    }

    if (unitKgBtn && unitLbBtn) {
        const savedUnit = localStorage.getItem('pawpal_weight_unit') || 'kg';
        function setUnit(unit) {
            localStorage.setItem('pawpal_weight_unit', unit);
            if (unit === 'kg') {
                unitKgBtn.classList.add('active');
                unitLbBtn.classList.remove('active');
            } else {
                unitKgBtn.classList.remove('active');
                unitLbBtn.classList.add('active');
            }
        }
        setUnit(savedUnit);

        unitKgBtn.addEventListener('click', () => {
            setUnit('kg');
            showToast('success', 'Đã chuyển đơn vị sang kg');
        });
        unitLbBtn.addEventListener('click', () => {
            setUnit('lb');
            showToast('success', 'Đã chuyển đơn vị sang lb');
        });
    }
}

function initSocialAccounts(user) {
    document.querySelectorAll('.social-link-item-custom').forEach(item => {
        const nameEl = item.querySelector('.social-name-custom');
        const statusEl = item.querySelector('.social-email-custom');
        const btn = item.querySelector('.btn-social-action-custom');

        if (!nameEl || !statusEl || !btn) return;

        btn.addEventListener('click', () => {
            const isConnected = btn.classList.contains('disconnect-btn');
            if (isConnected) {
                statusEl.textContent = 'Chưa liên kết';
                btn.textContent = 'Liên kết';
                btn.className = 'btn-social-action-custom connect-btn';
                showToast('success', `Đã hủy liên kết tài khoản ${nameEl.textContent}`);
            } else {
                const mockEmail = user.email || `${(user.name || 'user').toLowerCase().replace(/\s+/g, '')}@gmail.com`;
                statusEl.textContent = mockEmail;
                btn.textContent = 'Huỷ';
                btn.className = 'btn-social-action-custom disconnect-btn';
                showToast('success', `Đã liên kết tài khoản ${nameEl.textContent} thành công!`);
            }
        });
    });
}

// Khởi tạo toàn bộ module Cài đặt
export function init() {
    const user = getCurrentUser();
    if (!user) return;

    if (user.is_temporary) {
        const warning = document.getElementById('tempAccountWarning');
        if (warning) warning.classList.remove('d-none');
    }

    initPasswordStrengthMeter();
    initChangePasswordForm();
    initPasswordToggles();
    initPasswordAccordion();
    initNotificationSettings(user);
    initLanguageAndUnit(user);
    initSocialAccounts(user);
}

// Tự động chạy nếu tải qua script tag thường
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
