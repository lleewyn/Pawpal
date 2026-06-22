/**
 * dashboard.js - User Dashboard Logic
 * US 2-3: Đổi mật khẩu với thanh đo độ mạnh
 * Tuân thủ design.md
 */

// Import auth functions
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
    setCurrentUser(updatedUser);
}

// Toast function - reuse from auth.js pattern
function showToast(type, message, duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        alert(message);
        return;
    }

    const toastId = 'toast-' + Date.now();
    const icons = {
        success: '',
        error: '',
        info: 'ℹ',
        warning: ''
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

// Main Dashboard Init
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = '/pages/public/login.html';
        return;
    }

    // Load user profile data and dashboard widgets
    loadProfileData(currentUser);
    loadUpcomingBookings(currentUser);
    loadMyPets(currentUser);
    loadRecentOrders(currentUser);

    // Password Strength Meter (US 2-3 AC2.3.1)
    initPasswordStrengthMeter();

    // Change Password Form (US 2-3)
    initChangePasswordForm();

    // Toggle password visibility
    initPasswordToggles();

    // Check if temporary account and show warning
    if (currentUser.is_temporary) {
        const warning = document.getElementById('tempAccountWarning');
        if (warning) {
            warning.style.display = 'block';
        }
    }

    // Initialize profile edit controls
    initProfileEditForm(currentUser);
    initAddressEditForm(currentUser);
    initNotificationSettings(currentUser);
});

// Load Profile Data
function loadProfileData(user) {
    // Basic info
    document.getElementById('profileName').textContent = user.name || '-';
    document.getElementById('profileEmail').textContent = user.email || 'Chưa cập nhật';
    document.getElementById('profilePhone').textContent = user.phone || '-';
    
    // Gender
    let genderText = 'Chưa cập nhật';
    if (user.gender === 'male') genderText = 'Nam';
    else if (user.gender === 'female') genderText = 'Nữ';
    else if (user.gender === 'other') genderText = 'Khác';
    document.getElementById('profileGender').textContent = genderText;

    // DOB
    document.getElementById('profileDob').textContent = user.dob ? formatDateDisplay(user.dob) : 'Chưa cập nhật';
    
    // Default Address
    document.getElementById('profileAddress').textContent = user.address || 'Chưa thiết lập địa chỉ mặc định';
    
    // Dashboard Stats và Welcome
    document.getElementById('welcomeName').textContent = user.name ? user.name.split(' ').pop() : 'bạn';
    document.getElementById('statPoints').textContent = user.points || 0;
    
    const accountType = user.is_temporary ? 'Tài khoản tạm' : 'Thành viên';
    document.getElementById('statAccountType').textContent = accountType;
}

function formatDateDisplay(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString('vi-VN');
}

function initProfileEditForm(user) {
    const editButton = document.getElementById('btnEditProfile');
    const cancelButton = document.getElementById('btnCancelProfileEdit');
    const form = document.getElementById('profileUpdateForm');

    const nameInput = document.getElementById('profileNameInput');
    const emailInput = document.getElementById('profileEmailInput');
    const phoneInput = document.getElementById('profilePhoneInput');
    const genderInput = document.getElementById('profileGenderInput');
    const dobInput = document.getElementById('profileDobInput');
    const editSection = document.getElementById('profileEditSection');
    const displaySection = document.getElementById('profileDisplaySection');

    if (!editButton || !cancelButton || !form || !nameInput || !phoneInput || !editSection) return;

    function openEditForm() {
        nameInput.value = user.name || '';
        if(emailInput) emailInput.value = user.email || '';
        phoneInput.value = user.phone || '';
        if(genderInput) genderInput.value = user.gender || '';
        if(dobInput) dobInput.value = user.dob || '';
        
        editSection.style.display = 'block';
        if(displaySection) displaySection.style.display = 'none';
        editButton.style.display = 'none';
    }

    function closeEditForm() {
        editSection.style.display = 'none';
        if(displaySection) displaySection.style.display = 'flex';
        editButton.style.display = 'inline-block';
    }

    editButton.addEventListener('click', (e) => {
        e.preventDefault();
        openEditForm();
    });

    cancelButton.addEventListener('click', (e) => {
        e.preventDefault();
        closeEditForm();
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const updatedName = nameInput.value.trim();
        const updatedEmail = emailInput ? emailInput.value.trim() : '';
        const updatedPhone = phoneInput.value.trim();
        const updatedGender = genderInput ? genderInput.value : '';
        const updatedDob = dobInput ? dobInput.value : '';

        if (!updatedName || !updatedPhone) {
            showToast('warning', 'Vui lòng nhập tên và số điện thoại.');
            return;
        }

        const updatedUser = {
            ...user,
            name: updatedName,
            email: updatedEmail,
            phone: updatedPhone,
            gender: updatedGender,
            dob: updatedDob,
        };

        updateCurrentUserRecord(updatedUser);
        loadProfileData(updatedUser);
        
        // Update welcome name
        document.getElementById('welcomeName').textContent = updatedUser.name ? updatedUser.name.split(' ').pop() : 'bạn';
        
        closeEditForm();
        showToast('success', 'Đã cập nhật thông tin thành công!');
    });
}

function initAddressEditForm(user) {
    const btnEdit = document.getElementById('btnEditAddress');
    const btnSave = document.getElementById('btnSaveAddress');
    const btnCancel = document.getElementById('btnCancelAddress');
    const viewCard = document.getElementById('addressCardView');
    const editCard = document.getElementById('addressCardEdit');
    const addressInput = document.getElementById('profileAddressInput');

    if (!btnEdit || !viewCard || !editCard) return;

    btnEdit.addEventListener('click', () => {
        addressInput.value = user.address || '';
        viewCard.style.display = 'none';
        editCard.style.display = 'block';
    });

    btnCancel.addEventListener('click', () => {
        editCard.style.display = 'none';
        viewCard.style.display = 'block';
    });

    btnSave.addEventListener('click', () => {
        const updatedAddress = addressInput.value.trim();
        const updatedUser = { ...user, address: updatedAddress };
        
        updateCurrentUserRecord(updatedUser);
        loadProfileData(updatedUser);
        
        editCard.style.display = 'none';
        viewCard.style.display = 'block';
        showToast('success', 'Đã cập nhật địa chỉ thành công!');
        
        // Cần update biến user trong closure nếu muốn edit tiếp đúng data (mặc dù updateCurrentUserRecord đã làm)
        user.address = updatedAddress;
    });
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
        showToast('success', 'Cài đặt thông báo của bạn đã được lưu.');
    });
}

// Load Upcoming Bookings
function loadUpcomingBookings(user) {
    const container = document.getElementById('upcomingBookingsContainer');
    const allBookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
    // Filter bookings for current user, sort by date/time (assuming upcoming)
    const userBookings = allBookings.filter(b => b.phone === user.phone);
    
    if (userBookings.length === 0) {
        container.innerHTML = '<p class="text-muted">Chưa có lịch hẹn nào sắp tới.</p>';
        return;
    }
    
    // Just show the first 2 for dashboard
    const displayBookings = userBookings.slice(0, 2);
    let html = '';
    displayBookings.forEach(booking => {
        html += `
            <div class="widget-list-item">
                <div class="widget-list-item-title">• ${booking.date} - ${booking.time}</div>
                <p class="widget-list-item-desc">${booking.petName || 'Bé cưng'} (${booking.serviceName || 'Dịch vụ'})</p>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Load My Pets
function loadMyPets(user) {
    const container = document.getElementById('myPetsContainer');
    const allPets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
    const userPets = allPets.filter(p => p.ownerPhone === user.phone);
    
    // Update stats
    document.getElementById('statPetsCount').textContent = userPets.length;
    
    if (userPets.length === 0) {
        container.innerHTML = '<p class="text-muted">Chưa có hồ sơ bé cưng.</p>';
        return;
    }
    
    const displayPets = userPets.slice(0, 3);
    let html = '';
    displayPets.forEach(pet => {
        html += `
            <div class="widget-list-item">
                <div class="widget-list-item-title">• ${pet.name}</div>
                <p class="widget-list-item-desc">${pet.breed || 'Chưa rõ giống'} - ${pet.age || '?'} tuổi</p>
            </div>
        `;
    });
    container.innerHTML = html;
}

// Load Recent Orders
function loadRecentOrders(user) {
    const container = document.getElementById('recentOrdersContainer');
    // Using mock data for orders since there's no actual orders DB yet
    const hasOrders = false; // Toggle to true to see mock orders
    
    if (!hasOrders) {
        container.innerHTML = '<p class="text-muted">Chưa có đơn hàng nào.</p>';
        return;
    }
    
    container.innerHTML = `
        <div class="widget-list-item">
            <div class="widget-list-item-title">Đơn #PP-10294</div>
            <p class="widget-list-item-desc">Trạng thái: Đang giao hàng</p>
        </div>
    `;
}

// Tab Navigation - Removed, handled by URL parameters in inline script

// AC2.3.1: Password Strength Meter
function initPasswordStrengthMeter() {
    const newPassword = document.getElementById('newPassword');
    const strengthBar = document.getElementById('strengthBarFill');
    const strengthLabel = document.getElementById('strengthLabel').querySelector('span');
    
    if (!newPassword || !strengthBar || !strengthLabel) return;
    
    newPassword.addEventListener('input', () => {
        const password = newPassword.value;
        const strength = calculatePasswordStrength(password);
        
        // Update bar
        strengthBar.className = 'strength-bar-fill';
        
        if (strength.score === 0) {
            strengthLabel.textContent = 'Chưa nhập';
            strengthLabel.style.color = 'var(--color-text-light)';
        } else if (strength.score <= 2) {
            strengthBar.classList.add('weak');
            strengthLabel.textContent = 'Yếu';
            strengthLabel.style.color = 'var(--color-danger)';
        } else if (strength.score <= 3) {
            strengthBar.classList.add('medium');
            strengthLabel.textContent = 'Trung bình';
            strengthLabel.style.color = 'var(--color-accent)';
        } else {
            strengthBar.classList.add('strong');
            strengthLabel.textContent = 'Mạnh';
            strengthLabel.style.color = 'var(--color-success)';
        }
        
        validateChangePasswordForm();
    });
}

function calculatePasswordStrength(password) {
    let score = 0;
    
    if (password.length === 0) return { score: 0 };
    
    // Length criteria
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    
    // Complexity criteria
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    
    return { score: Math.min(score, 4) };
}

// Change Password Form
function initChangePasswordForm() {
    const form = document.getElementById('changePasswordForm');
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmNewPassword = document.getElementById('confirmNewPassword');
    const btnSubmit = document.getElementById('btnUpdateSecurity');
    
    if (!form) return;
    
    [newPassword, confirmNewPassword, currentPassword].forEach(input => {
        if (input) {
            input.addEventListener('input', validateChangePasswordForm);
            input.addEventListener('blur', validateChangePasswordForm);
        }
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const currentUser = getCurrentUser();
        const users = getUsers();
        
        // Verify current password
        if (currentPassword.value !== currentUser.password) {
            showToast('error', 'Mật khẩu hiện tại không đúng');
            currentPassword.classList.add('is-invalid');
            return;
        }
        
        currentPassword.classList.remove('is-invalid');
        
        // Update password
        const userIdx = users.findIndex(u => u.phone === currentUser.phone);
        if (userIdx !== -1) {
            users[userIdx].password = newPassword.value;
            saveUsers(users);
            
            // Update current session
            currentUser.password = newPassword.value;
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(currentUser));
            
            showToast('success', 'Cập nhật mật khẩu thành công!');
            
            // Reset form
            form.reset();
            document.getElementById('strengthBarFill').className = 'strength-bar-fill';
            document.getElementById('strengthLabel').querySelector('span').textContent = 'Chưa nhập';
            btnSubmit.disabled = true;
        }
    });
}

function validateChangePasswordForm() {
    const currentPassword = document.getElementById('currentPassword');
    const newPassword = document.getElementById('newPassword');
    const confirmNewPassword = document.getElementById('confirmNewPassword');
    const btnSubmit = document.getElementById('btnUpdateSecurity');
    
    if (!newPassword || !confirmNewPassword || !btnSubmit) return;
    
    const strength = calculatePasswordStrength(newPassword.value);
    const isPasswordValid = strength.score >= 2; // Ít nhất trung bình (US 2-3 AC2.3.1)
    const isConfirmValid = confirmNewPassword.value === newPassword.value && confirmNewPassword.value.length > 0;
    const isCurrentValid = currentPassword.value.length > 0;
    
    // Validation feedback
    if (confirmNewPassword.value.length > 0 && !isConfirmValid) {
        confirmNewPassword.classList.add('is-invalid');
    } else {
        confirmNewPassword.classList.remove('is-invalid');
    }
    
    // Enable/disable submit button
    btnSubmit.disabled = !(isPasswordValid && isConfirmValid && isCurrentValid);
}

// Password Toggle Visibility
function initPasswordToggles() {
    document.querySelectorAll('.btn-toggle-password').forEach(btn => {
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


// Toggle password form
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('togglePasswordBtn');
    const formContainer = document.getElementById('passwordFormContainer');
    const icon = document.getElementById('passwordToggleIcon');
    
    if (toggleBtn && formContainer && icon) {
        toggleBtn.addEventListener('click', () => {
            if (formContainer.style.display === 'none') {
                formContainer.style.display = 'block';
                icon.style.transform = 'rotate(180deg)';
            } else {
                formContainer.style.display = 'none';
                icon.style.transform = 'rotate(0deg)';
            }
        });
    }
});
