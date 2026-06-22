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
    const addressInputEdit = document.getElementById('profileAddressInputEdit');
    const editSection = document.getElementById('profileEditSection');
    const displaySection = document.getElementById('profileDisplaySection');

    if (!editButton || !cancelButton || !form || !nameInput || !phoneInput || !editSection) return;

    function openEditForm() {
        nameInput.value = user.name || '';
        if(emailInput) emailInput.value = user.email || '';
        phoneInput.value = user.phone || '';
        if(genderInput) genderInput.value = user.gender || '';
        if(dobInput) dobInput.value = user.dob || '';
        if(addressInputEdit) addressInputEdit.value = user.address || '';
        
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
        const updatedAddress = addressInputEdit ? addressInputEdit.value.trim() : '';

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
            address: updatedAddress
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



// Load Upcoming Bookings
function loadUpcomingBookings(user) {
    const container = document.getElementById('upcomingBookingCardContainer');
    if (!container) return;
    
    const allBookings = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
    // Filter bookings for current user, only keep non-cancelled and non-completed ones
    const upcoming = allBookings.filter(b => 
        (b.phone === user.phone || (b.petInfo && b.petInfo.phone === user.phone)) &&
        b.status !== 'Đã hủy' && 
        b.status !== 'Hoàn thành'
    );
    
    if (upcoming.length === 0) {
        // Fallback mockup data
        const demoBooking = {
            code: 'PP-5555',
            selectedService: { name: 'Grooming & Spa Cao Cấp' },
            petInfo: { petName: 'Bé Bông', breed: 'Poodle' },
            schedule: { slot: '14:00 PM - 16:00 PM', date: '2026-12-24' }
        };
        upcoming.push(demoBooking);
    }
    
    // Sort by date ascending (assuming format YYYY-MM-DD or DD/MM/YYYY)
    upcoming.sort((a, b) => {
        const dateA = new Date(a.schedule.date || a.schedule.checkIn || '');
        const dateB = new Date(b.schedule.date || b.schedule.checkIn || '');
        return dateA - dateB;
    });
    
    const booking = upcoming[0];
    const rawDate = booking.schedule.date || booking.schedule.checkIn || '';
    
    let monthStr = 'THÁNG 12';
    let dayStr = '24';
    
    if (rawDate) {
        const partsYMD = rawDate.split('-');
        if (partsYMD.length === 3) {
            dayStr = partsYMD[2];
            monthStr = 'THÁNG ' + parseInt(partsYMD[1], 10);
        } else {
            const partsDMY = rawDate.split('/');
            if (partsDMY.length === 3) {
                dayStr = partsDMY[0];
                monthStr = 'THÁNG ' + parseInt(partsDMY[1], 10);
            }
        }
    }
    
    const petName = booking.petInfo ? booking.petInfo.petName : 'Bé cưng';
    const petBreed = booking.petInfo && booking.petInfo.breed ? booking.petInfo.breed : '';
    const serviceName = booking.selectedService ? booking.selectedService.name : 'Dịch vụ chăm sóc';
    const timeVal = booking.schedule.slot || `${booking.schedule.checkIn} - ${booking.schedule.checkOut}`;
    
    container.innerHTML = `
        <div class="upcoming-booking-card">
            <div class="booking-date-badge">
                <span class="badge-month">${monthStr}</span>
                <span class="badge-day">${dayStr}</span>
            </div>
            <div class="booking-info">
                <h4 class="booking-service-title">${serviceName}</h4>
                <div class="booking-meta-list">
                    <span class="booking-meta-item">🐾 ${petName} ${petBreed ? `(${petBreed})` : ''}</span>
                    <span class="booking-meta-item">🕒 ${timeVal}</span>
                    <span class="booking-meta-item">📍 Chi nhánh Quận 1</span>
                </div>
            </div>
            <div class="booking-actions">
                <a href="orders.html?tab=booking&code=${booking.code}" class="btn btn-green-outline btn-sm" style="border-color: var(--color-primary); color: #ffffff; background-color: var(--color-primary);">Chi tiết lịch hẹn</a>
                <a href="/pages/public/chat.html" class="btn btn-outline-secondary btn-sm">Hoãn lịch</a>
            </div>
        </div>
    `;
}

// Load My Pets
function loadMyPets(user) {
    const container = document.getElementById('myPetsContainerHorizontal');
    if (!container) return;
    
    const allPets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
    const userPets = allPets.filter(p => p.ownerPhone === user.phone || !p.ownerPhone); // fallback for seed data without ownerPhone
    
    // Update stats count
    const statsCountEl = document.getElementById('statPetsCount');
    if (statsCountEl) {
        statsCountEl.textContent = userPets.length;
    }
    
    let html = '';
    
    userPets.forEach(pet => {
        let avatarHtml = '';
        if (pet.photo) {
            avatarHtml = `<img src="${pet.photo}" class="pet-image-circle" alt="${pet.name}">`;
        } else {
            avatarHtml = `<div class="pet-placeholder-circle">${pet.name.charAt(0).toUpperCase()}</div>`;
        }
        
        html += `
            <div class="pet-avatar-item">
                ${avatarHtml}
                <div class="pet-avatar-name">${pet.name}</div>
                <div class="pet-avatar-breed">${pet.breed || pet.species || 'Chưa rõ'}</div>
            </div>
        `;
    });
    
    // Append the "Thêm mới" button circle
    html += `
        <div class="pet-avatar-item">
            <a href="pet-profile.html" style="text-decoration: none;">
                <div class="add-pet-circle">+</div>
                <div class="pet-avatar-name">Thêm mới</div>
                <div class="pet-avatar-breed">Đăng ký thêm</div>
            </a>
        </div>
    `;
    
    container.innerHTML = html;
}

// Load Recent Orders
function loadRecentOrders(user) {
    const container = document.getElementById('recentOrdersContainer');
    if (!container) return;
    
    const allOrders = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
    // Filter orders by user phone
    const userOrders = allOrders.filter(o => o.phone === user.phone || (o.form && o.form.phone === user.phone));
    
    if (userOrders.length === 0) {
        // Fallback mockup data
        const demoOrders = [
            {
                code: 'DH-5592',
                cart: [{ name: 'Hạt Royal Canin, Đồ chơi xương gặm...' }],
                total: 450000,
                orderStatus: 'Đang giao'
            },
            {
                code: 'DH-5480',
                cart: [{ name: 'Cát vệ sinh đậu nành 6L (x2)' }],
                total: 280000,
                orderStatus: 'Hoàn thành'
            },
            {
                code: 'DH-5321',
                cart: [{ name: 'Sữa tắm dưỡng lông mượt' }],
                total: 195000,
                orderStatus: 'Hoàn thành'
            }
        ];
        userOrders.push(...demoOrders);
    }
    
    // Sort by date descending
    userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    // Take top 3
    const recent = userOrders.slice(0, 3);
    let html = '';
    
    recent.forEach(order => {
        const orderNum = order.code.replace('DH-', '');
        const summary = order.cart ? order.cart.map(item => item.name).join(', ') : 'Sản phẩm mua sắm';
        const price = order.total ? order.total.toLocaleString('vi-VN') + 'đ' : '0đ';
        
        let badgeClass = 'status-nhan';
        let statusText = 'ĐÃ NHẬN';
        
        if (order.orderStatus === 'Đang giao') {
            badgeClass = 'status-giao';
            statusText = 'ĐANG GIAO';
        } else if (order.orderStatus === 'Chờ xác nhận') {
            badgeClass = 'status-giao';
            statusText = 'CHỜ DUYỆT';
        }
        
        html += `
            <div class="order-item-card">
                <div class="order-icon-box">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-shopping-bag" viewBox="0 0 24 24">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <path d="M16 10a4 4 0 0 1-8 0"></path>
                    </svg>
                </div>
                <div class="order-info">
                    <div class="order-code">#ORD-${orderNum}</div>
                    <div class="order-summary" title="${summary}">${summary}</div>
                    <div class="order-price">${price}</div>
                </div>
                <span class="status-badge ${badgeClass}">${statusText}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Tab Navigation - Removed, handled by URL parameters in inline script

// AC2.3.1: Password Strength Meter




// Change Password Form







