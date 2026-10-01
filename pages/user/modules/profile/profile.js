/**
 * modules/profile/profile.js - Module logic cho Quản lý tài khoản & Cài đặt Pawpal
 */

import { API } from '/scripts/api/api.js';

const CURRENT_USER_KEY = 'pawpal_current_user';
const PAWPAL_USERS_KEY = 'pawpal_users_db';

function getCurrentUser() {
    return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
}

function setCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}



// 2. Tải và hiển thị dữ liệu Profile
async function loadProfileData(user) {
    if (!user) return;

    // Header stats
    const welcomeEl = document.getElementById('welcomeName');
    if (welcomeEl) welcomeEl.textContent = user.name || user.fullName || 'bạn';

    const pointsEl = document.getElementById('statPoints');
    if (pointsEl) pointsEl.textContent = (user.points || user.pawPoints || 0).toLocaleString('vi-VN');

    const tierEl = document.getElementById('statAccountType');
    if (tierEl) tierEl.textContent = user.membershipTier || user.tier || 'Thành viên mới';

    const petsCountEl = document.getElementById('statPetsCount');
    const userPets = (user.pets || []).length;
    if (petsCountEl) petsCountEl.textContent = userPets;

    // Personal Info Card
    const nameEl = document.getElementById('profileName');
    if (nameEl) nameEl.textContent = user.name || user.fullName || '-';

    const emailEl = document.getElementById('profileEmail');
    if (emailEl) emailEl.textContent = user.email || 'Chưa cập nhật';

    const phoneEl = document.getElementById('profilePhone');
    if (phoneEl) phoneEl.textContent = user.phone || '-';

    const addressEl = document.getElementById('profileAddress');
    if (addressEl) {
        addressEl.textContent = user.address || (user.addresses && user.addresses[0]?.street) || 'Chưa thiết lập địa chỉ mặc định';
    }

    // Modal Edit Form inputs
    const nameInput = document.getElementById('profileNameInput');
    if (nameInput) nameInput.value = user.name || user.fullName || '';

    const emailInput = document.getElementById('profileEmailInput');
    if (emailInput) emailInput.value = user.email || '';

    const phoneInput = document.getElementById('profilePhoneInput');
    if (phoneInput) phoneInput.value = user.phone || '';
}

// 3. Tải danh sách thú cưng
async function loadMyPets(user) {
    const container = document.getElementById('myPetsContainerHorizontal');
    if (!container) return;

    const pets = user.pets || [];
    if (pets.length === 0) {
        container.innerHTML = `
            <div class="p-3 text-muted">
                Bạn chưa đăng ký bé cưng nào.
                <a href="#pets" class="text-success ms-2 font-weight-bold">+ Thêm ngay</a>
            </div>
        `;
        return;
    }

    let html = '';
    pets.forEach(pet => {
        const petAvatar = pet.avatar || pet.image || '/assets/images/default-pet.png';
        html += `
            <div class="pet-avatar-item">
                <a href="#pets" style="text-decoration: none;">
                    <img src="${petAvatar}" alt="${pet.name || 'Pet'}" class="pet-avatar-img" onerror="this.src='/assets/images/default-pet.png'">
                    <div class="pet-avatar-name">${pet.name || 'Bé cưng'}</div>
                    <div class="pet-avatar-breed">${pet.breed || pet.species || ''}</div>
                </a>
            </div>
        `;
    });

    html += `
        <div class="pet-avatar-item">
            <a href="#pets" style="text-decoration: none;">
                <div class="add-pet-circle">+</div>
                <div class="pet-avatar-name">Thêm mới</div>
                <div class="pet-avatar-breed">Đăng ký thêm</div>
            </a>
        </div>
    `;

    container.innerHTML = html;
}

// 4. Tải lịch hẹn sắp tới
async function loadUpcomingBooking(user) {
    const container = document.getElementById('upcomingBookingCardContainer');
    if (!container) return;

    let bookings = [];
    try {
        const local = JSON.parse(localStorage.getItem('pawpal_bookings') || '[]');
        bookings = local.filter(b => String(b.userId || b.userPhone) === String(user.id || user.phone));
    } catch (e) {
        console.warn('[Profile] Lỗi đọc booking:', e);
    }

    const upcoming = bookings.find(b => !['cancelled', 'completed'].includes(String(b.status || '').toLowerCase()));
    if (!upcoming) {
        container.innerHTML = `
            <div class="p-3 text-muted">
                Bạn chưa có lịch hẹn dịch vụ nào sắp tới.
                <a href="/pages/services/booking/booking.html" class="text-success ms-2">Đặt lịch ngay</a>
            </div>
        `;
        return;
    }

    const dateVal = upcoming.date || upcoming.schedule?.date || 'Hôm nay';
    const serviceName = upcoming.serviceName || upcoming.selectedService?.name || 'Dịch vụ chăm sóc';
    const timeVal = upcoming.time || upcoming.schedule?.slot || '';

    container.innerHTML = `
        <div class="upcoming-booking-card">
            <div class="booking-date-badge">
                <span class="badge-month">LỊCH HẸN</span>
                <span class="badge-day">${dateVal}</span>
            </div>
            <div class="booking-info">
                <h4 class="booking-service-title">${serviceName}</h4>
                <div class="booking-meta-list">
                    <span class="booking-meta-item">Giờ: ${timeVal}</span>
                    <span class="booking-meta-item">Bé: ${upcoming.petName || 'Bé cưng'}</span>
                </div>
            </div>
            <div class="booking-actions">
                <a href="#bookings" class="btn btn-outline-success btn-sm">Xem chi tiết</a>
            </div>
        </div>
    `;
}

// 5. Tải đơn hàng gần đây
async function loadRecentOrders(user) {
    const container = document.getElementById('recentOrdersContainer');
    if (!container) return;

    let orders = [];
    try {
        const local = JSON.parse(localStorage.getItem('pawpal_orders') || '[]');
        orders = local.filter(o => {
            const uid = String(o.userId || '');
            const phone = String(o.userPhone || o.shipping?.phone || '');
            return (user.id && uid === String(user.id)) || (user.phone && phone === String(user.phone));
        });
    } catch (e) {
        console.warn('[Profile] Lỗi đọc orders:', e);
    }

    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="text-muted p-3">Chưa có đơn hàng nào.</p>';
        return;
    }

    orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    const recent = orders.slice(0, 3);

    let html = '';
    recent.forEach(order => {
        const orderCode = order.code || (order.id ? `#${order.id}` : '#ORD');
        const price = (order.total || order.pricing?.total || 0).toLocaleString('vi-VN') + 'đ';
        html += `
            <div class="order-item-card mb-2 p-2 border-bottom d-flex justify-content-between align-items-center">
                <div>
                    <div class="font-weight-bold text-dark">${orderCode}</div>
                    <small class="text-muted">${order.status || 'Đang xử lý'}</small>
                </div>
                <div class="text-success font-weight-bold">${price}</div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// 6. Xử lý chỉnh sửa thông tin cá nhân
function initProfileEditModal(user) {
    const btnEdit = document.getElementById('btnEditProfile');
    const modalEl = document.getElementById('profileEditModal');
    const btnSave = document.getElementById('btnSaveProfile');
    if (!btnEdit || !modalEl || !btnSave) return;

    let modalInstance = null;
    if (window.bootstrap?.Modal) {
        modalInstance = new bootstrap.Modal(modalEl);
    }

    btnEdit.addEventListener('click', () => {
        if (modalInstance) modalInstance.show();
    });

    btnSave.addEventListener('click', async () => {
        const nameVal = document.getElementById('profileNameInput')?.value.trim();
        const emailVal = document.getElementById('profileEmailInput')?.value.trim();
        const phoneVal = document.getElementById('profilePhoneInput')?.value.trim();

        if (!nameVal || !phoneVal) {
            alert('Vui lòng nhập họ tên và số điện thoại');
            return;
        }

        const updatedUser = {
            ...user,
            name: nameVal,
            fullName: nameVal,
            email: emailVal,
            phone: phoneVal
        };

        setCurrentUser(updatedUser);
        loadProfileData(updatedUser);

        if (modalInstance) modalInstance.hide();
        alert('Cập nhật thông tin thành công!');
    });
}

// Hàm khởi tạo chính của module Profile
export function init() {
    const user = getCurrentUser();
    if (!user) return;

    loadProfileData(user);
    loadMyPets(user);
    loadUpcomingBooking(user);
    loadRecentOrders(user);
    initProfileEditModal(user);
}

// Tự động chạy nếu tải qua script tag thường
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
