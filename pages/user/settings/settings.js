/**
 * settings.js - Settings Tab Logic
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
    const userIndex = users.findIndex(u => String(u.phone) === String(updatedUser.phone) || u.id && u.id === updatedUser.id);
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updatedUser };
        saveUsers(users);
    }
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
}

// Toast notification helper
function showToast(type, message, duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        alert(message);
        return;
    }

    const toastId = 'toast-' + Date.now();
    const icons = {
        success: '✓',
        error: '✗',
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

    // Close button event
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

// Dom Loaded Initialization
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = '/pages/public/login/login.html';
        return;
    }

    // Check temp account warning banner
    if (currentUser.is_temporary) {
        const warning = document.getElementById('tempAccountWarning');
        if (warning) {
            warning.classList.remove('d-none');
        }
    }

    // Initialize widgets & settings
    initPasswordStrengthMeter();
    initChangePasswordForm();
    initPasswordToggles();
    initNotificationSettings(currentUser);
    initLanguageAndUnit(currentUser);
    initSocialAccounts(currentUser);
    initPasswordAccordion();
});

// Password strength meter logic
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
        
        // Clear all segments classes
        if (seg1) seg1.className = 'strength-bar-segment';
        if (seg2) seg2.className = 'strength-bar-segment';
        if (seg3) seg3.className = 'strength-bar-segment';
        
        if (strength.score === 0) {
            strengthLabel.textContent = 'Trống';
            strengthLabel.style.color = 'var(--color-text-light)';
        } else if (strength.score <= 2) {
            if (seg1) seg1.classList.add('weak');
            strengthLabel.textContent = 'Yếu';
            strengthLabel.style.color = 'var(--color-danger)';
        } else if (strength.score <= 3) {
            if (seg1) seg1.classList.add('medium');
            if (seg2) seg2.classList.add('medium');
            strengthLabel.textContent = 'Trung bình';
            strengthLabel.style.color = 'var(--color-accent)';
        } else {
            if (seg1) seg1.classList.add('strong');
            if (seg2) seg2.classList.add('strong');
            if (seg3) seg3.classList.add('strong');
            strengthLabel.textContent = 'Mạnh';
            strengthLabel.style.color = 'var(--color-success)';
        }
        
        validateChangePasswordForm();
    });
}

function calculatePasswordStrength(password) {
    let score = 0;
    if (password.length === 0) return { score: 0 };
    
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    return { score: Math.min(score, 4) };
}

// Validate and update password form
function initChangePasswordForm() {
    const form = document.getElementById('changePasswordForm');
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmNewPassword = document.getElementById('confirmNewPassword');
    const btnSubmit = document.getElementById('btnUpdateSecurity');
    const btnCancel = document.getElementById('btnCancelSecurity');
    
    if (!form) return;
    
    [newPassword, confirmNewPassword, currentPassword].forEach(input => {
        if (input) {
            input.addEventListener('input', validateChangePasswordForm);
            input.addEventListener('blur', validateChangePasswordForm);
        }
    });

    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            form.reset();
            resetPasswordStrengthUI();
            validateChangePasswordForm();
        });
    }
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const currentUser = getCurrentUser();
        const users = getUsers();
        
        if (currentPassword.value !== currentUser.password) {
            showToast('error', 'Mật khẩu hiện tại không đúng');
            currentPassword.classList.add('is-invalid');
            return;
        }
        
        currentPassword.classList.remove('is-invalid');
        
        const userIdx = users.findIndex(u => String(u.phone) === String(currentUser.phone));
        if (userIdx !== -1) {
            users[userIdx].password = newPassword.value;
            // Also turn off temporary status if it was active
            if (users[userIdx].is_temporary) {
                users[userIdx].is_temporary = false;
                currentUser.is_temporary = false;
                const warning = document.getElementById('tempAccountWarning');
                if (warning) warning.classList.add('d-none');
            }
            saveUsers(users);
            
            currentUser.password = newPassword.value;
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
            
            showToast('success', 'Cập nhật mật khẩu thành công!');
            form.reset();
            resetPasswordStrengthUI();
            btnSubmit.disabled = true;
        }
    });
}

function resetPasswordStrengthUI() {
    const seg1 = document.getElementById('strengthSeg1');
    const seg2 = document.getElementById('strengthSeg2');
    const seg3 = document.getElementById('strengthSeg3');
    const strengthLabel = document.getElementById('strengthLabel');
    if (seg1) seg1.className = 'strength-bar-segment';
    if (seg2) seg2.className = 'strength-bar-segment';
    if (seg3) seg3.className = 'strength-bar-segment';
    if (strengthLabel) {
        strengthLabel.textContent = 'Trống';
        strengthLabel.style.color = 'var(--color-text-light)';
    }
}

function validateChangePasswordForm() {
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmNewPassword = document.getElementById('confirmNewPassword');
    const btnSubmit = document.getElementById('btnUpdateSecurity');
    
    if (!newPassword || !confirmNewPassword || !btnSubmit) return;
    
    const strength = calculatePasswordStrength(newPassword.value);
    const isPasswordValid = strength.score >= 2; 
    const isConfirmValid = confirmNewPassword.value === newPassword.value && confirmNewPassword.value.length > 0;
    const isCurrentValid = currentPassword.value.length > 0;
    
    if (confirmNewPassword.value.length > 0 && !isConfirmValid) {
        confirmNewPassword.classList.add('is-invalid');
    } else {
        confirmNewPassword.classList.remove('is-invalid');
    }
    
    btnSubmit.disabled = !(isPasswordValid && isConfirmValid && isCurrentValid);
}

// Password toggle eye icon
function initPasswordToggles() {
    document.querySelectorAll('.btn-toggle-password-custom').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = btn.previousElementSibling;
            if (!input) return;
            
            if (input.type === 'password') {
                input.type = 'text';
                btn.innerHTML = `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
            } else {
                input.type = 'password';
                btn.innerHTML = `<svg class="eye-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
            }
        });
    });
}

// Accordion collapse/expand for Password
function initPasswordAccordion() {
    const toggleBtn = document.getElementById('togglePasswordBtn');
    const formContainer = document.getElementById('passwordFormContainer');
    const icon = document.getElementById('passwordToggleIcon');
    
    if (toggleBtn && formContainer && icon) {
        toggleBtn.addEventListener('click', () => {
            if (formContainer.style.display === 'none') {
                formContainer.classList.remove('d-none');
                icon.style.transform = 'rotate(180deg)';
            } else {
                formContainer.classList.add('d-none');
                icon.style.transform = 'rotate(0deg)';
            }
        });
    }
}

// Notification Settings switch
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
        showToast('success', 'Cài đặt thông báo của bạn đã được lưu.');
    });
}

// Language and weight unit switcher
function initLanguageAndUnit(user) {
    const languageSelect = document.getElementById('languageSelect');
    const unitKgBtn = document.getElementById('unitKgBtn');
    const unitLbBtn = document.getElementById('unitLbBtn');
    
    if (languageSelect) {
        const savedLang = localStorage.getItem('pawpal_language') || 'vi';
        languageSelect.value = savedLang;
        
        languageSelect.addEventListener('change', () => {
            localStorage.setItem('pawpal_language', languageSelect.value);
            showToast('success', 'Đã cập nhật ngôn ngữ thành công!');
        });
    }
    
    if (unitKgBtn && unitLbBtn) {
        const savedUnit = localStorage.getItem('pawpal_weight_unit') || 'kg';
        
        function setUnit(unit) {
            localStorage.setItem('pawpal_weight_unit', unit);
            if (unit === 'kg') {
                unitKgBtn.classList.add('active');
                unitLbBtn.classList.remove('active');
                unitKgBtn.style.background = '#fff';
                unitKgBtn.style.color = 'var(--color-text-dark)';
                unitLbBtn.style.background = 'transparent';
                unitLbBtn.style.color = 'var(--color-text-light)';
            } else {
                unitKgBtn.classList.remove('active');
                unitLbBtn.classList.add('active');
                unitKgBtn.style.background = 'transparent';
                unitKgBtn.style.color = 'var(--color-text-light)';
                unitLbBtn.style.background = '#fff';
                unitLbBtn.style.color = 'var(--color-text-dark)';
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

// Social Accounts disconnect/connect toggles
function initSocialAccounts(user) {
    const googleStatus = document.getElementById('googleLinkStatus');
    const facebookStatus = document.getElementById('facebookLinkStatus');
    
    document.querySelectorAll('.social-link-item-custom').forEach(item => {
        const nameEl = item.querySelector('.social-name-custom');
        const statusEl = item.querySelector('.social-email-custom');
        const btn = item.querySelector('.btn-social-action-custom');
        
        if (!nameEl || !statusEl || !btn) return;
        
        const platform = nameEl.textContent.trim().toLowerCase();
        
        btn.addEventListener('click', () => {
            const isConnected = btn.classList.contains('disconnect-btn');
            
            if (isConnected) {
                // Perform disconnect
                statusEl.textContent = 'Chưa liên kết';
                btn.textContent = 'Liên kết';
                btn.className = 'btn-social-action-custom connect-btn';
                btn.style.background = 'var(--color-primary-light, #e2f0e9)';
                btn.style.color = 'var(--color-primary, #2a5944)';
                showToast('success', `Đã hủy liên kết tài khoản ${nameEl.textContent}`);
            } else {
                // Perform connect (mock email binding)
                const mockEmail = user.email || `${user.name.toLowerCase().replace(/\s+/g, '')}@gmail.com`;
                statusEl.textContent = mockEmail;
                btn.textContent = 'Huỷ';
                btn.className = 'btn-social-action-custom disconnect-btn';
                btn.style.background = '#f1f5f9';
                btn.style.color = 'var(--color-text-dark)';
                showToast('success', `Đã liên kết tài khoản ${nameEl.textContent} thành công!`);
            }
        });
    });
}
