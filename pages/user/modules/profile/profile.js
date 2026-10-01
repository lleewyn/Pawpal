/**
 * modules/profile/profile.js - Module logic cho Quản lý tài khoản Pawpal
 * Chuẩn AGENTS.md: 9px radius, Flat Solid, Text-Only, Toast Notifications, Address Book
 */

import { API } from '/scripts/api/api.js';

const CURRENT_USER_KEY = 'pawpal_current_user';
const PAWPAL_USERS_KEY = 'pawpal_users_db';

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || {
            id: 'USER-001',
            name: 'Nguyễn Văn A',
            phone: '0901234567',
            email: 'quyen@gmail.com',
            points: 120,
            membershipTier: 'Bạc',
            addresses: [
                { id: 'addr-1', street: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh', isDefault: true }
            ]
        };
    } catch (e) {
        return null;
    }
}

function setCurrentUser(user) {
    try {
        localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
        const users = JSON.parse(localStorage.getItem(PAWPAL_USERS_KEY) || '[]');
        const idx = users.findIndex(u => String(u.phone) === String(user.phone) || (u.id && u.id === user.id));
        if (idx !== -1) {
            users[idx] = { ...users[idx], ...user };
            localStorage.setItem(PAWPAL_USERS_KEY, JSON.stringify(users));
        }
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

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const cleaned = String(text).replace(/\s*&\s*/g, ' và ');
    const div = document.createElement('div');
    div.textContent = cleaned;
    return div.innerHTML;
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

    let pets = [];
    try {
        const localPets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
        if (localPets.length > 0) {
            pets = localPets.filter(p => !p.archived);
        } else {
            pets = (user.pets || []).filter(p => !p.archived);
        }
    } catch (e) {
        pets = user.pets || [];
    }

    const petsCountEl = document.getElementById('statPetsCount');
    if (petsCountEl) petsCountEl.textContent = pets.length;

    // Personal Info Card
    const nameEl = document.getElementById('profileName');
    if (nameEl) nameEl.textContent = user.name || user.fullName || '-';

    const emailEl = document.getElementById('profileEmail');
    if (emailEl) emailEl.textContent = user.email || 'Chưa cập nhật';

    const phoneEl = document.getElementById('profilePhone');
    if (phoneEl) phoneEl.textContent = user.phone || '-';

    const addressEl = document.getElementById('profileAddress');
    if (addressEl) {
        let defAddr = '';
        if (Array.isArray(user.addresses) && user.addresses.length > 0) {
            const foundDef = user.addresses.find(a => a.isDefault) || user.addresses[0];
            defAddr = foundDef.street || foundDef.address || '';
        } else if (user.address) {
            defAddr = user.address;
        }
        addressEl.textContent = defAddr || 'Chưa thiết lập địa chỉ mặc định';
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

    let pets = [];
    try {
        const localPets = JSON.parse(localStorage.getItem('pawpal_pets') || '[]');
        if (localPets.length > 0) {
            pets = localPets.filter(p => !p.archived);
        } else {
            pets = (user.pets || []).filter(p => !p.archived);
        }
    } catch (e) {
        pets = user.pets || [];
    }

    if (pets.length === 0) {
        container.innerHTML = `
            <div class="p-3 text-muted">
                Bạn chưa đăng ký bé cưng nào.
                <a href="#pets" class="text-success ms-2 font-weight-bold">+ Thêm bé ngay</a>
            </div>
        `;
        return;
    }

    const defaultAvatars = {
        dog: '/assets/images/publics/dogcute3.jpg',
        cat: '/assets/images/publics/catcute5.jpg',
        rabbit: '/assets/images/publics/pet1.jpg',
        other: '/assets/images/publics/pet.jpg'
    };

    let html = '';
    pets.forEach(pet => {
        const petAvatar = pet.avatar || pet.image || defaultAvatars[pet.species] || defaultAvatars.other;
        const speciesLabel = pet.species === 'dog' ? 'Chó' : pet.species === 'cat' ? 'Mèo' : pet.species === 'rabbit' ? 'Thỏ' : 'Thú cưng';
        html += `
            <div class="pet-avatar-item">
                <a href="#pets" style="text-decoration: none;">
                    <img src="${petAvatar}" alt="${escapeHtml(pet.name || 'Bé cưng')}" class="pet-image-circle" onerror="this.src='/assets/images/publics/pet.jpg'">
                    <div class="pet-avatar-name">${escapeHtml(pet.name || 'Bé cưng')}</div>
                    <div class="pet-avatar-breed">${escapeHtml(pet.breed || speciesLabel)}</div>
                </a>
            </div>
        `;
    });

    html += `
        <div class="pet-avatar-item">
            <a href="#pets" style="text-decoration: none;">
                <div class="add-pet-circle">+</div>
                <div class="pet-avatar-name">Thêm mới</div>
                <div class="pet-avatar-breed">Đăng ký bé</div>
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
        bookings = local.filter(b => String(b.userId || b.userPhone || '') === String(user.id || user.phone || ''));
    } catch (e) {
        console.warn('[Profile] Lỗi đọc booking:', e);
    }

    const upcoming = bookings.find(b => !['cancelled', 'completed'].includes(String(b.status || '').toLowerCase()));
    if (!upcoming) {
        container.innerHTML = `
            <div class="p-3 text-muted d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span>Bạn chưa có lịch hẹn dịch vụ nào sắp tới.</span>
                <a href="/pages/services/booking/booking.html" class="btn-booking-detail-action">+ Đặt lịch ngay</a>
            </div>
        `;
        return;
    }

    let dateDisplay = 'Hôm nay';
    let monthDisplay = 'LỊCH HẸN';
    if (upcoming.date) {
        const d = new Date(upcoming.date);
        if (!isNaN(d.getTime())) {
            dateDisplay = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
            monthDisplay = `Tháng ${d.getMonth() + 1}`;
        } else {
            dateDisplay = upcoming.date;
        }
    }

    const rawService = upcoming.serviceName || upcoming.selectedService?.name || upcoming.service || 'Dịch vụ Spa và Làm đẹp';
    const serviceName = rawService.replace(/\s*&\s*/g, ' và ');
    const timeVal = upcoming.time || upcoming.schedule?.slot || 'Theo hẹn';
    const petName = upcoming.petName || 'Bé cưng';

    container.innerHTML = `
        <div class="upcoming-booking-card">
            <div class="booking-date-badge">
                <span class="badge-month">${escapeHtml(monthDisplay)}</span>
                <span class="badge-day">${escapeHtml(dateDisplay)}</span>
            </div>
            <div class="booking-info">
                <h4 class="booking-service-title">${escapeHtml(serviceName)}</h4>
                <div class="booking-meta-list">
                    <span class="booking-meta-item">Giờ hẹn: <strong>${escapeHtml(timeVal)}</strong></span>
                    <span class="booking-meta-item">Bé cưng: <strong>${escapeHtml(petName)}</strong></span>
                </div>
            </div>
            <div class="booking-actions">
                <a href="#bookings" class="btn-booking-detail-action">Xem chi tiết</a>
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
        container.innerHTML = '<p class="text-muted p-3">Chưa có đơn hàng nào gần đây.</p>';
        return;
    }

    orders.sort((a, b) => new Date(b.createdAt || b.date || 0) - new Date(a.createdAt || a.date || 0));
    const recent = orders.slice(0, 3);

    const statusMap = {
        'completed': { label: 'Hoàn thành', cls: 'status-completed' },
        'delivering': { label: 'Đang giao', cls: 'status-delivering' },
        'in-progress': { label: 'Đang chuẩn bị', cls: 'status-in-progress' },
        'pending': { label: 'Chờ xác nhận', cls: 'status-pending' },
        'cancelled': { label: 'Đã hủy', cls: 'status-cancelled' }
    };

    let html = '';
    recent.forEach(order => {
        const orderCode = order.code || (order.id ? `#${order.id}` : '#ORD');
        const price = (order.total || order.pricing?.total || order.totalAmount || 0).toLocaleString('vi-VN') + 'đ';
        const stKey = String(order.status || 'pending').toLowerCase();
        const stConfig = statusMap[stKey] || { label: order.status || 'Chờ xác nhận', cls: 'status-pending' };
        const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'Gần đây';

        html += `
            <a href="#orders" class="order-item-card">
                <div>
                    <div class="order-code-title">${escapeHtml(orderCode)}</div>
                    <div class="order-date-text">Ngày đặt: ${escapeHtml(orderDate)}</div>
                </div>
                <div class="order-right-meta">
                    <span class="order-price-text">${escapeHtml(price)}</span>
                    <span class="order-status-badge ${stConfig.cls}">${escapeHtml(stConfig.label)}</span>
                </div>
            </a>
        `;
    });

    container.innerHTML = html;
}

// 6. Xử lý Modal Chỉnh sửa thông tin cá nhân và Sổ địa chỉ
let tempAddresses = [];

function renderAddressesList() {
    const listContainer = document.getElementById('addressesContainerList');
    if (!listContainer) return;

    if (tempAddresses.length === 0) {
        listContainer.innerHTML = '<p class="text-muted small mb-0">Chưa có địa chỉ nào trong sổ địa chỉ.</p>';
        return;
    }

    let html = '';
    tempAddresses.forEach((addr, idx) => {
        const isDef = !!addr.isDefault;
        html += `
            <div class="address-item-card ${isDef ? 'is-default' : ''}">
                <div class="address-item-left">
                    <input type="radio" name="defaultAddressRadio" class="address-radio-input" data-idx="${idx}" ${isDef ? 'checked' : ''}>
                    <div class="address-text-wrap">
                        <span>${escapeHtml(addr.street || addr.address || '')}</span>
                        ${isDef ? '<span class="address-default-tag">Mặc định</span>' : ''}
                    </div>
                </div>
                ${!isDef ? `<button type="button" class="btn-delete-address" data-idx="${idx}">Xóa</button>` : ''}
            </div>
        `;
    });

    listContainer.innerHTML = html;

    listContainer.querySelectorAll('.address-radio-input').forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selectedIdx = parseInt(e.target.getAttribute('data-idx'), 10);
            tempAddresses.forEach((a, i) => { a.isDefault = (i === selectedIdx); });
            renderAddressesList();
        });
    });

    listContainer.querySelectorAll('.btn-delete-address').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const deleteIdx = parseInt(e.target.getAttribute('data-idx'), 10);
            tempAddresses.splice(deleteIdx, 1);
            if (tempAddresses.length > 0 && !tempAddresses.some(a => a.isDefault)) {
                tempAddresses[0].isDefault = true;
            }
            renderAddressesList();
        });
    });
}

function initProfileEditModal(user) {
    const btnEdit = document.getElementById('btnEditProfile');
    const modalEl = document.getElementById('profileEditModal');
    const btnSave = document.getElementById('btnSaveProfile');
    const btnToggleAdd = document.getElementById('btnToggleAddAddressForm');
    const newAddressCollapse = document.getElementById('newAddressFormCollapse');
    const btnCancelAdd = document.getElementById('btnCancelAddAddress');
    const btnAddConfirm = document.getElementById('btnAddAddressConfirm');

    if (!btnEdit || !modalEl || !btnSave) return;

    const openModal = () => {
        if (modalEl.parentNode !== document.body) {
            document.body.appendChild(modalEl);
        }
        modalEl.classList.add('show');
        modalEl.style.display = 'flex';
        modalEl.removeAttribute('aria-hidden');
        document.body.classList.add('modal-open');
    };

    const closeModal = () => {
        modalEl.classList.remove('show');
        modalEl.style.display = 'none';
        modalEl.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    };

    modalEl.querySelectorAll('[data-bs-dismiss="modal"], .btn-modal-close, .btn-modal-cancel').forEach(btn => {
        btn.addEventListener('click', closeModal);
    });

    modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) {
            closeModal();
        }
    });

    btnEdit.addEventListener('click', () => {
        const currentUser = getCurrentUser() || user;
        const nameInput = document.getElementById('profileNameInput');
        const emailInput = document.getElementById('profileEmailInput');
        const phoneInput = document.getElementById('profilePhoneInput');

        if (nameInput) nameInput.value = currentUser.name || currentUser.fullName || '';
        if (emailInput) emailInput.value = currentUser.email || '';
        if (phoneInput) phoneInput.value = currentUser.phone || '';

        // Clone addresses
        if (Array.isArray(currentUser.addresses) && currentUser.addresses.length > 0) {
            tempAddresses = JSON.parse(JSON.stringify(currentUser.addresses));
        } else if (currentUser.address) {
            tempAddresses = [{ id: 'addr-1', street: currentUser.address, isDefault: true }];
        } else {
            tempAddresses = [];
        }

        renderAddressesList();
        if (newAddressCollapse) newAddressCollapse.classList.add('d-none');
        
        openModal();
    });

    if (btnToggleAdd && newAddressCollapse) {
        btnToggleAdd.addEventListener('click', () => {
            newAddressCollapse.classList.toggle('d-none');
            const streetIn = document.getElementById('newAddressStreetInput');
            const distIn = document.getElementById('newAddressDistrictInput');
            const cityIn = document.getElementById('newAddressCityInput');
            if (streetIn) streetIn.value = '';
            if (distIn) distIn.value = '';
            if (cityIn) cityIn.value = '';
            if (!newAddressCollapse.classList.contains('d-none') && streetIn) {
                streetIn.focus();
            }
        });
    }

    if (btnCancelAdd && newAddressCollapse) {
        btnCancelAdd.addEventListener('click', () => {
            newAddressCollapse.classList.add('d-none');
        });
    }

    if (btnAddConfirm) {
        btnAddConfirm.addEventListener('click', () => {
            const street = document.getElementById('newAddressStreetInput')?.value.trim();
            const district = document.getElementById('newAddressDistrictInput')?.value.trim();
            const city = document.getElementById('newAddressCityInput')?.value.trim();

            if (!street) {
                showToast('warning', 'Vui lòng nhập số nhà và tên đường');
                return;
            }

            const fullStreet = [street, district, city].filter(Boolean).join(', ');
            const isFirst = tempAddresses.length === 0;
            tempAddresses.push({
                id: 'addr-' + Date.now(),
                street: fullStreet,
                isDefault: isFirst
            });

            renderAddressesList();
            if (newAddressCollapse) newAddressCollapse.classList.add('d-none');
            showToast('success', 'Đã thêm địa chỉ vào sổ địa chỉ');
        });
    }

    btnSave.addEventListener('click', async () => {
        const nameVal = document.getElementById('profileNameInput')?.value.trim();
        const emailVal = document.getElementById('profileEmailInput')?.value.trim();
        const phoneVal = document.getElementById('profilePhoneInput')?.value.trim();

        if (!nameVal || !phoneVal) {
            showToast('error', 'Vui lòng nhập đầy đủ họ tên và số điện thoại');
            return;
        }

        const currentUser = getCurrentUser() || user;
        const defaultAddrObj = tempAddresses.find(a => a.isDefault) || tempAddresses[0];

        const updatedUser = {
            ...currentUser,
            name: nameVal,
            fullName: nameVal,
            email: emailVal,
            phone: phoneVal,
            addresses: tempAddresses,
            address: defaultAddrObj ? (defaultAddrObj.street || defaultAddrObj.address) : ''
        };

        setCurrentUser(updatedUser);
        loadProfileData(updatedUser);

        closeModal();
        showToast('success', 'Cập nhật thông tin cá nhân thành công!');
    });
}

// Hàm khởi tạo chính của module Profile
export function init() {
    const user = getCurrentUser();
    if (!user) return;

    if (typeof window.setUserSubBreadcrumb === 'function') {
        window.setUserSubBreadcrumb('', 'profile');
    }

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
