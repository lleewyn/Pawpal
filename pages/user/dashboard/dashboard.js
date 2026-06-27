/**
 * dashboard.js - User Dashboard Logic
 * US 2-3: Đổi mật khẩu với thanh đo độ mạnh
 * Tuan thu design.md
 */

import { API } from '/scripts/api/api.js';

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

function setCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function buildAddressLabel(address) {
    if (!address || typeof address !== 'object') return '';

    return [address.street, address.district, address.city]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(', ');
}

function normalizeAddressEntry(address, fallbackUser = {}) {
    if (!address) return null;

    if (typeof address === 'string') {
        const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
        const city = parts.length > 0 ? parts[parts.length - 1] : '';
        const district = parts.length > 1 ? parts[parts.length - 2] : '';
        const street = parts.slice(0, Math.max(parts.length - 2, 1)).join(', ') || parts[0] || '';

        return {
            id: `addr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            label: 'Địa chỉ đã lưu',
            name: fallbackUser.name || '',
            phone: fallbackUser.phone || '',
            street,
            district,
            city,
            note: '',
            isDefault: true
        };
    }

    return {
        id: address.id || `addr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        label: address.label || 'Địa chỉ đã lưu',
        name: address.name || fallbackUser.name || '',
        phone: address.phone || fallbackUser.phone || '',
        street: address.street || address.address || '',
        district: address.district || '',
        city: address.city || '',
        note: address.note || '',
        isDefault: Boolean(address.isDefault)
    };
}

function getStructuredAddresses(user) {
    const addresses = Array.isArray(user?.addresses) ? user.addresses : [];
    const normalized = addresses
        .map((address) => normalizeAddressEntry(address, user))
        .filter(Boolean);

    if (!normalized.length && user?.address) {
        const legacyAddress = normalizeAddressEntry(user.address, user);
        if (legacyAddress) normalized.push(legacyAddress);
    }

    return normalized.map((address, index) => ({
        ...address,
        isDefault: index === 0 ? true : Boolean(address.isDefault)
    }));
}

function updateCurrentUserRecord(updatedUser) {
    const users = getUsers();
    const userIndex = users.findIndex((user) => String(user.phone) === String(updatedUser.phone) || (user.id && user.id === updatedUser.id));
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...updatedUser };
        saveUsers(users);
    }
    setCurrentUser(updatedUser);
}

function showToast(type, message, duration = 5000) {
    const container = document.getElementById('toastContainer');
    if (!container) {
        alert(message);
        return;
    }

    const toastId = `toast-${Date.now()}`;
    const icons = {
        success: '',
        error: '',
        info: 'i',
        warning: ''
    };

    const titles = {
        success: 'Thành công',
        error: 'Loi',
        info: 'Thong bao',
        warning: 'Canh bao'
    };

    const toastHtml = `
        <div id="${toastId}" class="toast-custom toast-${type}">
            <span class="toast-icon">${icons[type] || 'i'}</span>
            <div class="toast-content">
                <div class="toast-title">${titles[type] || 'Thong bao'}</div>
                <p class="toast-message">${message}</p>
            </div>
            <button type="button" class="toast-close" aria-label="Dong">&times;</button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);

    toastElement.querySelector('.toast-close').addEventListener('click', () => {
        removeToast(toastElement);
    });

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

document.addEventListener('DOMContentLoaded', async () => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = '/pages/public/login/login.html';
        return;
    }

    await API.initData();
    const freshUser = getCurrentUser() || currentUser;

    loadProfileData(freshUser);
    await loadUpcomingBookings(freshUser);
    await loadMyPets(freshUser);
    await loadRecentOrders(freshUser);

    if (currentUser.is_temporary) {
        const warning = document.getElementById('tempAccountWarning');
        if (warning) warning.classList.remove('d-none');
    }

    initProfileEditForm(freshUser);
    initAddressEditForm(freshUser);
});

function loadProfileData(user) {
    const addresses = getStructuredAddresses(user);
    const primaryAddress = addresses[0];
    document.getElementById('profileName').textContent = user.name || '-';
    document.getElementById('profileEmail').textContent = user.email || 'Chưa cập nhật';
    document.getElementById('profilePhone').textContent = user.phone || '-';

    let genderText = 'Chưa cập nhật';
    if (user.gender === 'male') genderText = 'Nam';
    else if (user.gender === 'female') genderText = 'Nữ';
    else if (user.gender === 'other') genderText = 'Khác';
    document.getElementById('profileGender').textContent = genderText;

    document.getElementById('profileDob').textContent = user.dob ? formatDateDisplay(user.dob) : 'Chưa cập nhật';
    document.getElementById('profileAddress').textContent = buildAddressLabel(primaryAddress) || user.address || 'Chưa thiết lập địa chỉ mặc định';

    document.getElementById('welcomeName').textContent = user.name ? user.name.split(' ').pop() : 'bạn';
    document.getElementById('statPoints').textContent = user.points || 0;
    document.getElementById('statAccountType').textContent = user.is_temporary ? 'Tài khoản tạm' : getMemberTierLabel(user);
}

function getMemberTierLabel(user) {
    if (!user) return 'Thành viên';
    // Prefer explicit tier property if present
    if (user.tier && typeof user.tier === 'string' && user.tier.trim() !== '') {
        return user.tier;
    }

    // Fallback by points thresholds
    const points = Number(user.points) || 0;
    if (points >= 5000) return 'Kim cương';
    if (points >= 1000) return 'Vàng';
    return 'Bạc';
}

function formatDateDisplay(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return isoString;
    return date.toLocaleDateString('vi-VN');
}

function initProfileEditForm(user) {
    const editButton = document.getElementById('btnEditProfile');
    const form = document.getElementById('profileUpdateForm');
    const saveButton = document.getElementById('btnSaveProfile');
    const nameInput = document.getElementById('profileNameInput');
    const emailInput = document.getElementById('profileEmailInput');
    const phoneInput = document.getElementById('profilePhoneInput');
    const addressesList = document.getElementById('addressesList');
    const newAddressStreetInput = document.getElementById('newAddressStreetInput');
    const newAddressDistrictInput = document.getElementById('newAddressDistrictInput');
    const newAddressCityInput = document.getElementById('newAddressCityInput');
    const addAddressBtn = document.getElementById('btnAddAddress');

    if (!editButton || !form || !saveButton || !nameInput || !phoneInput) return;

    let modalInstance = null;
    const modalEl = document.getElementById('profileEditModal');
    if (modalEl) modalInstance = new bootstrap.Modal(modalEl);

    let editingAddresses = [];

    function renderAddresses(addresses) {
        addressesList.innerHTML = '';
        (addresses || []).forEach((addr, idx) => {
            const div = document.createElement('div');
            div.className = 'd-flex align-items-center mb-2 gap-2';
            div.innerHTML = `
                <input class="form-control form-control-sm address-item" data-idx="${idx}" value="${buildAddressLabel(addr)}" readonly>
                <button type="button" class="btn btn-sm btn-outline-danger btn-remove-address">X</button>
            `;
            addressesList.appendChild(div);
            div.querySelector('.btn-remove-address').addEventListener('click', () => {
                editingAddresses.splice(idx, 1);
                editingAddresses = editingAddresses.map((address, index) => ({
                    ...address,
                    isDefault: index === 0
                }));
                renderAddresses(editingAddresses);
            });
        });
    }

    editButton.addEventListener('click', (e) => {
        e.preventDefault();
        const current = getCurrentUser() || user;
        nameInput.value = current.name || '';
        emailInput.value = current.email || '';
        phoneInput.value = current.phone || '';
        newAddressStreetInput.value = '';
        newAddressDistrictInput.value = '';
        newAddressCityInput.value = '';
        editingAddresses = getStructuredAddresses(current);
        renderAddresses(editingAddresses);
        if (modalInstance) modalInstance.show();
    });

    addAddressBtn && addAddressBtn.addEventListener('click', () => {
        const street = newAddressStreetInput.value.trim();
        const district = newAddressDistrictInput.value.trim();
        const city = newAddressCityInput.value.trim();

        if (!street || !district || !city) {
            showToast('warning', 'Vui lòng nhập đầy đủ địa chỉ chi tiết, quận/huyện và thành phố/tỉnh.');
            return;
        }

        editingAddresses.push({
            id: `addr-${Date.now()}`,
            label: editingAddresses.length === 0 ? 'Địa chỉ mặc định' : `Địa chỉ ${editingAddresses.length + 1}`,
            name: nameInput.value.trim() || user.name || '',
            phone: phoneInput.value.trim() || user.phone || '',
            street,
            district,
            city,
            note: '',
            isDefault: editingAddresses.length === 0
        });

        newAddressStreetInput.value = '';
        newAddressDistrictInput.value = '';
        newAddressCityInput.value = '';
        renderAddresses(editingAddresses);
    });

    saveButton.addEventListener('click', () => {
        const updatedName = nameInput.value.trim();
        const updatedEmail = emailInput.value.trim();
        const updatedPhone = phoneInput.value.trim();
        if (!updatedName || !updatedPhone) {
            showToast('warning', 'Vui lòng nhập tên và số điện thoại.');
            return;
        }
        const addresses = editingAddresses.map((address, index) => ({
            ...address,
            name: updatedName,
            phone: updatedPhone,
            isDefault: index === 0
        }));
        const updatedUser = {
            ...user,
            name: updatedName,
            email: updatedEmail,
            phone: updatedPhone,
            addresses: addresses,
            address: buildAddressLabel(addresses[0]) || ''
        };
        updateCurrentUserRecord(updatedUser);
        loadProfileData(updatedUser);
        if (modalInstance) modalInstance.hide();
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

    if (!btnEdit || !viewCard || !editCard || !btnSave || !btnCancel || !addressInput) return;

    btnEdit.addEventListener('click', () => {
        addressInput.value = user.address || '';
        viewCard.classList.add('d-none');
        editCard.classList.remove('d-none');
    });

    btnCancel.addEventListener('click', () => {
        editCard.classList.add('d-none');
        viewCard.classList.remove('d-none');
    });

    btnSave.addEventListener('click', () => {
        const updatedAddress = addressInput.value.trim();
        const normalizedPrimary = normalizeAddressEntry(updatedAddress, user);
        const otherAddresses = getStructuredAddresses(user).slice(1);
        const updatedUser = {
            ...user,
            address: updatedAddress,
            addresses: normalizedPrimary ? [normalizedPrimary, ...otherAddresses] : otherAddresses
        };

        updateCurrentUserRecord(updatedUser);
        loadProfileData(updatedUser);

        editCard.classList.add('d-none');
        viewCard.classList.remove('d-none');
        showToast('success', 'Đã cập nhật địa chỉ thành công!');
        user.address = updatedAddress;
    });
}

async function loadUpcomingBookings(user) {
    const container = document.getElementById('upcomingBookingCardContainer');
    if (!container) return;

    const allBookings = await API.getUserBookings(user.id);
    const upcoming = (allBookings || [])
        .filter((booking) => isUpcomingBooking(booking))
        .sort((a, b) => getBookingScheduledTime(a) - getBookingScheduledTime(b));

    if (!upcoming.length) {
        container.innerHTML = '<p class="text-muted p-3">Chưa có lịch hẹn sắp tới.</p>';
        return;
    }

    const booking = upcoming[0];
    const rawDate = booking.date || booking.schedule?.date || '';

    let monthStr = 'THANG 12';
    let dayStr = '24';
    if (rawDate) {
        const partsYMD = rawDate.split('-');
        if (partsYMD.length === 3) {
            dayStr = partsYMD[2];
            monthStr = `THANG ${parseInt(partsYMD[1], 10)}`;
        }
    }

    const petName = booking.petName || booking.petInfo?.petName || booking.petId || 'Be cung';
    const petBreed = booking.petInfo?.breed || '';
    const serviceName = booking.serviceName || booking.selectedService?.name || 'Dịch vụ chăm sóc';
    const timeVal = booking.time || booking.schedule?.slot || '';
    const branchVal = booking.branch || 'Chi nhanh mac dinh';

    container.innerHTML = `
        <div class="upcoming-booking-card">
            <div class="booking-date-badge">
                <span class="badge-month">${monthStr}</span>
                <span class="badge-day">${dayStr}</span>
            </div>
            <div class="booking-info">
                <h4 class="booking-service-title">${serviceName}</h4>
                <div class="booking-meta-list">
                    <span class="booking-meta-item">Pet: ${petName} ${petBreed ? `(${petBreed})` : ''}</span>
                    <span class="booking-meta-item">Gio: ${timeVal}</span>
                    <span class="booking-meta-item">Chi nhanh: ${branchVal}</span>
                </div>
            </div>
            <div class="booking-actions">
                <a href="../booking-detail/booking-detail.html?id=${booking.id}" class="btn btn-green-outline btn-sm" style="border-color: var(--color-primary); color: #ffffff; background-color: var(--color-primary);">Chi tiết lịch hẹn</a>
            </div>
        </div>
    `;
}

function isUpcomingBooking(booking) {
    const status = String(booking?.status || booking?.bookingStatus || 'upcoming').toLowerCase();
    if (['cancelled', 'completed'].includes(status)) return false;

    const scheduledTime = getBookingScheduledTime(booking);
    return scheduledTime ? scheduledTime >= Date.now() : true;
}

function getBookingScheduledTime(booking) {
    const date = booking?.date || booking?.schedule?.date;
    if (!date) return 0;

    const time = booking?.time || booking?.timeStart || booking?.schedule?.slot || '00:00';
    const scheduled = new Date(`${date}T${time}:00`);
    return Number.isNaN(scheduled.getTime()) ? 0 : scheduled.getTime();
}

function normalizeOrderStatus(status) {
    const raw = String(status || '').toLowerCase().trim();
    if (raw === 'pending' || raw === 'return_pending' || raw === 'chờ xác nhận') {
        return 'pending_payment';
    }
    if (raw === 'dang giao') return 'shipping';
    if (raw === 'dang xac nhan') return 'pending_payment';
    return raw;
}

async function loadMyPets(user) {
    const container = document.getElementById('myPetsContainerHorizontal');
    if (!container) return;

    const userPets = await API.getUserPets(user.id);

    const statsCountEl = document.getElementById('statPetsCount');
    if (statsCountEl) statsCountEl.textContent = userPets.length;

    let html = '';
    userPets.forEach((pet) => {
        const avatarHtml = pet.avatar || pet.photo
            ? `<img src="${pet.avatar || pet.photo}" class="pet-image-circle" alt="${pet.name}" style="object-fit: cover;">`
            : `<div class="pet-placeholder-circle">${pet.name.charAt(0).toUpperCase()}</div>`;

        html += `
            <div class="pet-avatar-item">
                ${avatarHtml}
                <div class="pet-avatar-name">${pet.name}</div>
                <div class="pet-avatar-breed">${pet.breed || pet.species || 'Chưa rõ'}</div>
            </div>
        `;
    });

    html += `
        <div class="pet-avatar-item">
            <a href="/pages/user/pet-profile/pet-profile.html" style="text-decoration: none;">
                <div class="add-pet-circle">+</div>
                <div class="pet-avatar-name">Thêm mới</div>
                <div class="pet-avatar-breed">Đăng ký thêm</div>
            </a>
        </div>
    `;

    container.innerHTML = html;
}

async function loadRecentOrders(user) {
    const container = document.getElementById('recentOrdersContainer');
    if (!container) return;

    const userOrders = await API.getUserOrders(user.id);
    if (!userOrders || userOrders.length === 0) {
        container.innerHTML = '<p class="text-muted p-3">Chưa có đơn hàng nào.</p>';
        return;
    }

    userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const recent = userOrders.slice(0, 3);

    let html = '';
    recent.forEach((order) => {
        const orderNum = order.id ? order.id.replace('ORD-', '') : (order.code || '').replace('DH-', '');
        const summary = order.products
            ? order.products.map((item) => item.name).join(', ')
            : (order.cart ? order.cart.map((item) => item.name).join(', ') : 'Sản phẩm mua sắm');
        const price = `${(order.pricing ? order.pricing.total : order.total).toLocaleString('vi-VN')}d`;

        const status = normalizeOrderStatus(order.status || order.orderStatus);
        let badgeClass = 'status-giao';
        let statusText = 'Chờ thanh toán';
        if (status === 'preparing') {
            badgeClass = 'status-giao';
            statusText = 'Đang chuẩn bị';
        } else if (status === 'shipping') {
            badgeClass = 'status-giao';
            statusText = 'Đang giao';
        } else if (status === 'delivered') {
            badgeClass = 'status-nhan';
            statusText = 'Đã giao';
        } else if (status === 'completed') {
            badgeClass = 'status-nhan';
            statusText = 'Hoàn thành';
        } else if (status === 'cancelled') {
            badgeClass = 'status-nhan';
            statusText = 'Đã hủy';
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

