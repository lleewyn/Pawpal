/**
 * modules/settings/settings.js - Logic cho Module Cài đặt tài khoản PawPal
 * Chuẩn AGENTS.md: 9px radius, Flat Solid, Text-Only, Auto-Save, Zero JSON Mock
 */

const PAWPAL_USERS_KEY = 'pawpal_users_db';
const CURRENT_USER_KEY = 'pawpal_current_user';

function getSupabaseClient() {
    return window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
}

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
    } catch (e) {
        return null;
    }
}

function getUsers() {
    try {
        return JSON.parse(localStorage.getItem(PAWPAL_USERS_KEY)) || [];
    } catch (e) {
        return [];
    }
}

function saveUsers(users) {
    try {
        localStorage.setItem(PAWPAL_USERS_KEY, JSON.stringify(users));
    } catch (e) {}
}

function updateCurrentUserRecord(updatedUser) {
    const users = getUsers();
    const userIndex = users.findIndex(u => String(u.phone) === String(updatedUser.phone) || (u.id && u.id === updatedUser.id));
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updatedUser };
        saveUsers(users);
    }
    try {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(updatedUser));
    } catch (e) {}
}

function showToast(type, message, duration = 3000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container-custom';
        document.body.appendChild(container);
    }

    const toastColors = {
        success: { bg: '#236B48', label: 'Thành công' },
        error: { bg: '#8F2424', label: 'Lỗi' },
        info: { bg: '#20495E', label: 'Thông báo' },
        warning: { bg: '#734718', label: 'Lưu ý' }
    };
    const cfg = toastColors[type] || toastColors.success;

    const toast = document.createElement('div');
    toast.style.cssText = `
        background: #ffffff;
        border: 1px solid #E2ECE5;
        border-radius: 9px;
        padding: 10px 16px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        min-width: 260px;
        max-width: 360px;
        color: #203A2C;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        opacity: 1;
        transition: opacity 0.25s ease;
    `;

    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 700; font-size: 13px; color: ${cfg.bg};">${cfg.label}:</span>
            <span style="font-size: 13px; color: #203A2C;">${message}</span>
        </div>
        <button type="button" style="border: none; background: transparent; color: #4F7A65; font-size: 16px; cursor: pointer; padding: 0 4px;">&times;</button>
    `;

    toast.querySelector('button').addEventListener('click', () => toast.remove());
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 250);
    }, duration);
}

function calculatePasswordStrength(password) {
    let score = 0;
    if (!password || password.length === 0) return { score: 0 };
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password) || /[^a-zA-Z0-9]/.test(password)) score++;
    return { score: Math.min(score, 3) };
}

function initPasswordStrengthMeter() {
    const newPassword = document.getElementById('newPassword');
    const strengthLabel = document.getElementById('strengthLabel');
    const seg1 = document.getElementById('strengthSeg1');
    const seg2 = document.getElementById('strengthSeg2');
    const strengthSeg3 = document.getElementById('strengthSeg3');

    if (!newPassword || !strengthLabel) return;

    newPassword.addEventListener('input', () => {
        const password = newPassword.value;
        const strength = calculatePasswordStrength(password);

        if (seg1) seg1.className = 'strength-bar-segment';
        if (seg2) seg2.className = 'strength-bar-segment';
        if (strengthSeg3) strengthSeg3.className = 'strength-bar-segment';

        if (strength.score === 0) {
            strengthLabel.textContent = 'Trống';
            strengthLabel.style.color = '#4F7A65';
        } else if (strength.score === 1) {
            if (seg1) seg1.classList.add('weak');
            strengthLabel.textContent = 'Yếu';
            strengthLabel.style.color = '#DC2626';
        } else if (strength.score === 2) {
            if (seg1) seg1.classList.add('medium');
            if (seg2) seg2.classList.add('medium');
            strengthLabel.textContent = 'Trung bình';
            strengthLabel.style.color = '#D97706';
        } else {
            if (seg1) seg1.classList.add('strong');
            if (seg2) seg2.classList.add('strong');
            if (strengthSeg3) strengthSeg3.classList.add('strong');
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
    const errEl = document.getElementById('confirmPasswordError');

    if (!newPassword || !confirmNewPassword || !btnSubmit) return;

    const isCurrentValid = currentPassword ? currentPassword.value.trim().length > 0 : true;
    const isPasswordValid = /^(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/s.test(newPassword.value) && newPassword.value.length <= 128;
    const isConfirmMatch = confirmNewPassword.value === newPassword.value;
    const isConfirmFilled = confirmNewPassword.value.length > 0;

    if (isConfirmFilled && !isConfirmMatch) {
        confirmNewPassword.classList.add('is-invalid');
        if (errEl) errEl.classList.add('d-block');
    } else {
        confirmNewPassword.classList.remove('is-invalid');
        if (errEl) errEl.classList.remove('d-block');
    }

    btnSubmit.disabled = !(isCurrentValid && isPasswordValid && isConfirmMatch && isConfirmFilled);
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
            confirmNewPassword.classList.remove('is-invalid');
            const errEl = document.getElementById('confirmPasswordError');
            if (errEl) errEl.classList.remove('d-block');
            btnSubmit.disabled = true;
        });
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = getCurrentUser();
        if (!user) return;

        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Đang lưu...';

        try {
            if (!currentPassword?.value || !newPassword.value || newPassword.value !== confirmNewPassword.value) throw new Error('Vui lòng kiểm tra mật khẩu hiện tại và mật khẩu nhập lại.');
            const result = await window.PawpalCustomerAuth.request('change-password', {
                currentPassword: currentPassword.value,
                newPassword: newPassword.value
            }, true);
            await window.PawpalCustomerAuth.accept(result);
        } catch (dbErr) {
            showToast('error', dbErr.message || 'Không thể cập nhật mật khẩu. Vui lòng thử lại.');
            btnSubmit.textContent = 'Cập nhật mật khẩu';
            validateChangePasswordForm();
            return;
        }

        const warning = document.getElementById('tempAccountWarning');
        if (warning) warning.classList.add('d-none');

        showToast('success', 'Mật khẩu đã được cập nhật thành công!');
        form.reset();
        btnSubmit.textContent = 'Cập nhật mật khẩu';
        btnSubmit.disabled = true;
        const strengthLabel = document.getElementById('strengthLabel');
        if (strengthLabel) {
            strengthLabel.textContent = 'Trống';
            strengthLabel.style.color = '#4F7A65';
        }
        ['strengthSeg1', 'strengthSeg2', 'strengthSeg3'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.className = 'strength-bar-segment';
        });
    });
}

function initPasswordToggles() {
    document.querySelectorAll('.btn-toggle-password-text').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            if (!input) return;

            if (input.type === 'password') {
                input.type = 'text';
                btn.textContent = 'Ẩn';
            } else {
                input.type = 'password';
                btn.textContent = 'Hiện';
            }
        });
    });
}

function initNotificationSettings(user) {
    const emailCheckbox = document.getElementById('notifyEmail');
    const smsCheckbox = document.getElementById('notifySMS');

    if (!emailCheckbox || !smsCheckbox) return;

    const settings = user.notificationPreferences || { email: true, sms: false };
    emailCheckbox.checked = Boolean(settings.email);
    smsCheckbox.checked = Boolean(settings.sms);

    const savePreferences = () => {
        const updatedPreferences = {
            email: emailCheckbox.checked,
            sms: smsCheckbox.checked,
        };
        const updatedUser = {
            ...user,
            notificationPreferences: updatedPreferences,
        };
        updateCurrentUserRecord(updatedUser);
        showToast('success', 'Đã lưu tùy chọn thông báo');
    };

    emailCheckbox.addEventListener('change', savePreferences);
    smsCheckbox.addEventListener('change', savePreferences);
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
            showToast('success', 'Đã lưu tùy chọn ngôn ngữ');
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
                showToast('info', `Đã hủy liên kết tài khoản ${nameEl.textContent}`);
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

function initPrivacyActions(user) {
    const btnExport = document.getElementById('btnExportUserData');
    const btnDeactivate = document.getElementById('btnDeactivateAccount');

    if (btnExport) {
        btnExport.addEventListener('click', async () => {
            btnExport.disabled = true;
            btnExport.textContent = 'Đang tải...';
            try {
                const client = getSupabaseClient();
                let exportPets = [];
                let exportAppts = [];
                let exportOrders = [];

                if (client && user.id) {
                    const [pRes, aRes, oRes] = await Promise.all([
                        client.from('pet_profile').select('*').eq('customer_id', user.id),
                        client.from('appointment').select('*').eq('customer_id', user.id),
                        client.from('sales_order').select('*').eq('customer_id', user.id)
                    ]);
                    exportPets = pRes.data || [];
                    exportAppts = aRes.data || [];
                    exportOrders = oRes.data || [];
                }

                if (exportPets.length === 0) {
                    try { exportPets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]'); } catch (e) {}
                }
                if (exportAppts.length === 0) {
                    try { exportAppts = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]'); } catch (e) {}
                }
                if (exportOrders.length === 0) {
                    try { exportOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]'); } catch (e) {}
                }
                
                const exportData = {
                    user: { id: user.id, name: user.name, phone: user.phone, email: user.email },
                    pets: exportPets,
                    appointments: exportAppts,
                    orders: exportOrders,
                    exportedAt: new Date().toISOString()
                };

                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
                const downloadAnchor = document.createElement('a');
                downloadAnchor.setAttribute("href", dataStr);
                downloadAnchor.setAttribute("download", `pawpal_data_${Date.now()}.json`);
                document.body.appendChild(downloadAnchor);
                downloadAnchor.click();
                downloadAnchor.remove();

                showToast('success', 'Đã tải về toàn bộ bản sao dữ liệu của bạn');
            } catch (err) {
                showToast('error', 'Không thể tạo tệp dữ liệu');
            } finally {
                btnExport.disabled = false;
                btnExport.textContent = 'Tải dữ liệu';
            }
        });
    }

    if (btnDeactivate) {
        btnDeactivate.addEventListener('click', async () => {
            const confirmed = window.confirm('Bạn có chắc chắn muốn tạm dừng hoạt động tài khoản này? Bạn có thể đăng nhập lại bất cứ lúc nào để kích hoạt lại.');
            if (confirmed) {
                const currentUser = getCurrentUser();
                if (currentUser) {
                    const updatedUser = { ...currentUser, status: 'LOCKED', isLocked: true };
                    updateCurrentUserRecord(updatedUser);
                    
                    // Cập nhật lên Supabase Live DB
                    try {
                        const client = getSupabaseClient();
                        if (client && currentUser.id) {
                            await client.from('customer').update({
                                account_status: 'LOCKED'
                            }).eq('id', currentUser.id);
                        }
                    } catch (dbErr) {
                        console.warn('[Settings] Lỗi cập nhật trạng thái tạm khóa lên Supabase:', dbErr);
                    }
                }
                showToast('warning', 'Tài khoản đã được đặt sang trạng thái tạm dừng.');
            }
        });
    }
}

let isInitRunning = false;

// Khởi tạo toàn bộ module Cài đặt
export function init() {
    if (isInitRunning) return;
    isInitRunning = true;
    try {
        const user = getCurrentUser();
        if (!user) return;

        if (user.is_temporary) {
            const warning = document.getElementById('tempAccountWarning');
            if (warning) warning.classList.remove('d-none');
        }

        if (typeof window.setUserSubBreadcrumb === 'function') {
            window.setUserSubBreadcrumb('', 'settings');
        }

        initPasswordStrengthMeter();
        initChangePasswordForm();
        initPasswordToggles();
        initNotificationSettings(user);
        initLanguageAndUnit(user);
        initSocialAccounts(user);
        initPrivacyActions(user);
    } finally {
        isInitRunning = false;
    }
}

export const initSettings = init;
window.initSettings = init;
