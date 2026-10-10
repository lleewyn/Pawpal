/**
 * modules/profile/profile.js - Module logic cho Quản lý tài khoản Pawpal
 * Chuẩn AGENTS.md: 9px radius, Flat Solid, Text-Only, Toast Notifications, Address Book
 */

import { API } from '/scripts/api/api.js';
import { getPets } from '/scripts/api/petService.js';
import { applyProfileSnapshot, saveCustomerProfile } from '/scripts/shared/customer-profile.mjs';

const CURRENT_USER_KEY = 'pawpal_current_user';
const PAWPAL_USERS_KEY = 'pawpal_users_db';

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(CURRENT_USER_KEY)) || null;
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

// 1. Helper lấy Supabase Client
function getSupabaseClient() {
    return window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
}

// Đồng bộ dữ liệu Profile từ Supabase Live Database
async function syncUserProfileFromSupabase(user, cache = true) {
    if (!user) return user;
    try {
        const client = getSupabaseClient();
        if (!client) throw new Error('Không thể kết nối dữ liệu hồ sơ.');

        let customerId = user.id;
        const phone = user.phone || user.phone_main || '';

        let custRecord = null;
        if (customerId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
            const { data } = await client.from('customer').select('*').eq('id', customerId).maybeSingle();
            custRecord = data;
        }

        if (!custRecord && phone) {
            const cleanPhone = phone.replace(/[^0-9]/g, '');
            const { data } = await client.from('customer').select('*').eq('phone_main', cleanPhone).maybeSingle();
            custRecord = data;
        }

        if (custRecord) {
            customerId = custRecord.id;
            const [profRes, memRes, addrRes] = await Promise.all([
                client.from('customer_profile').select('*').eq('customer_id', customerId).maybeSingle(),
                client.from('customer_membership').select('*').eq('customer_id', customerId).maybeSingle(),
                client.from('customer_address').select('*').eq('customer_id', customerId).order('is_default', { ascending: false })
            ]);
            if (profRes.error || memRes.error || addrRes.error) throw new Error('Không thể tải hồ sơ mới nhất.');

            const profile = profRes.data || {};
            const membership = memRes.data || {};
            const dbAddresses = (addrRes.data || []).map(a => ({
                id: a.id,
                street: [a.street_address, a.ward, a.district, a.province].filter(Boolean).join(', ') || a.street_address || '',
                rawStreet: a.street_address || '',
                ward: a.ward || '',
                district: a.district || '',
                province: a.province || '',
                isDefault: Boolean(a.is_default),
                receiverName: a.receiver_name || '',
                receiverPhone: a.receiver_phone || ''
            }));

            const tierMap = {
                'TIER_DIAMOND': 'Kim Cương',
                'TIER_GOLD': 'Vàng',
                'TIER_SILVER': 'Bạc',
                'TIER_MEMBER': 'Thành viên'
            };

            const updatedUser = {
                ...user,
                id: customerId,
                name: profile.full_name || user.name || 'Khách hàng',
                fullName: profile.full_name || user.name || 'Khách hàng',
                phone: custRecord.phone_main || user.phone || '',
                email: custRecord.email || user.email || '',
                status: custRecord.account_status || 'ACTIVE',
                isLocked: custRecord.account_status === 'LOCKED',
                points: Number(membership.total_paw_points ?? 0),
                pawPoints: Number(membership.total_paw_points ?? 0),
                membershipTier: tierMap[membership.tier_id] || user.membershipTier || 'Thành viên',
                addresses: dbAddresses
            };

            const snapshot = await client.rpc('customer_profile_snapshot');
            if (snapshot.error) throw new Error('Không thể tải hồ sơ mới nhất.');
            const freshUser = applyProfileSnapshot(updatedUser, snapshot.data);
            if (cache) setCurrentUser(freshUser);
            return freshUser;
        }
    } catch (err) {
        console.warn('[Profile] Lỗi đồng bộ dữ liệu từ Supabase:', err);
        throw err;
    }
    throw new Error('Không tìm thấy hồ sơ khách hàng.');
}

// 2. Tải và hiển thị dữ liệu Profile
async function loadProfileData(user) {
    if (!user) return;

    // Kiểm tra trạng thái tài khoản bị khóa trực tiếp từ Database
    let isAccountLocked = Boolean(user.isLocked || user.status === 'LOCKED');
    const lockAlertEl = document.getElementById('userAccountLockAlert');
    if (lockAlertEl) {
        if (isAccountLocked) lockAlertEl.classList.remove('d-none');
        else lockAlertEl.classList.add('d-none');
    }

    // Header stats
    const welcomeEl = document.getElementById('welcomeName');
    if (welcomeEl) welcomeEl.textContent = user.name || user.fullName || 'bạn';

    const pointsEl = document.getElementById('statPoints');
    if (pointsEl) pointsEl.textContent = (user.points || user.pawPoints || 0).toLocaleString('vi-VN');

    const tierEl = document.getElementById('statAccountType');
    if (tierEl) tierEl.textContent = user.membershipTier || user.tier || 'Thành viên';

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

// 3. Tải danh sách thú cưng từ Supabase Live DB
function getPetDefaultAvatar(species) {
    const s = String(species || '').toLowerCase();
    if (s.includes('chó') || s.includes('dog')) return '/assets/images/publics/dogcute3.jpg';
    if (s.includes('mèo') || s.includes('cat')) return '/assets/images/publics/catcute5.jpg';
    if (s.includes('thỏ') || s.includes('rabbit')) return '/assets/images/publics/pet1.jpg';
    if (s.includes('hamster') || s.includes('chuột')) return '/assets/images/publics/hamster.jpg';
    return '/assets/images/publics/pet.png';
}

async function loadMyPets(user) {
    const container = document.getElementById('myPetsContainerHorizontal');
    if (!container) return;

    let pets = [];
    try {
        const allPets = await getPets(user?.id);
        pets = (allPets || []).filter(p => !p.isArchived && !p.archived);
    } catch (e) {
        console.warn('[Profile] Lỗi tải pet từ petService:', e);
    }

    const petsCountEl = document.getElementById('statPetsCount');
    if (petsCountEl) petsCountEl.textContent = pets.length;

    if (pets.length === 0) {
        container.innerHTML = `
            <div class="p-3 text-muted">
                Bạn chưa đăng ký bé cưng nào.
                <a href="#pets" class="text-success ms-2 font-weight-bold">Thêm bé ngay</a>
            </div>
        `;
        return;
    }

    let html = '';
    pets.forEach(pet => {
        const petAvatar = pet.avatar || getPetDefaultAvatar(pet.species);
        const speciesLabel = pet.species === 'dog' ? 'Chó' : pet.species === 'cat' ? 'Mèo' : pet.species === 'rabbit' ? 'Thỏ' : 'Thú cưng';
        const fallbackSrc = getPetDefaultAvatar(pet.species);
        html += `
            <div class="pet-avatar-item pawpal-smooth-entrance">
                <a href="#pets" style="text-decoration: none;">
                    <img src="${petAvatar}" alt="${escapeHtml(pet.name || 'Bé cưng')}" class="pet-image-circle" onerror="this.onerror=null; this.src='${fallbackSrc}';">
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

// 4. Tải lịch hẹn sắp tới từ Supabase Live DB
async function loadUpcomingBooking(user) {
    const container = document.getElementById('upcomingBookingCardContainer');
    if (!container) return;

    let upcoming = null;
    try {
        const client = getSupabaseClient();
        if (client && user.id) {
            const { data, error } = await client.from('appointment')
                .select('id, appointment_code, appointment_date, appointment_time, appointment_status, service:service_id(service_name), pet_profile:pet_id(pet_name)')
                .eq('customer_id', user.id)
                .in('appointment_status', ['PENDING', 'CONFIRMED', 'IN_PROGRESS'])
                .order('appointment_date', { ascending: true })
                .limit(1);

            if (!error && data && data.length > 0) {
                const b = data[0];
                const srv = Array.isArray(b.service) ? b.service[0] : b.service;
                const pet = Array.isArray(b.pet_profile) ? b.pet_profile[0] : b.pet_profile;
                upcoming = {
                    id: b.appointment_code || b.id,
                    date: b.appointment_date,
                    time: b.appointment_time ? b.appointment_time.slice(0, 5) : '',
                    serviceName: srv?.service_name || 'Dịch vụ chăm sóc',
                    petName: pet?.pet_name || 'Bé cưng'
                };
            }
        }
    } catch (e) {
        console.warn('[Profile] Lỗi tải booking từ Supabase:', e);
    }

    if (!upcoming) {
        container.innerHTML = `
            <div class="p-3 text-muted d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span>Bạn chưa có lịch hẹn dịch vụ nào sắp tới.</span>
                <a href="/pages/services/booking/booking.html" class="btn-booking-detail-action">Đặt lịch ngay</a>
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

    const serviceName = String(upcoming.serviceName || 'Dịch vụ chăm sóc').replace(/\s*&\s*/g, ' và ');
    const timeVal = upcoming.time || 'Theo lịch hẹn';
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

// 5. Tải đơn hàng gần đây từ Supabase Live DB
async function loadRecentOrders(user) {
    const container = document.getElementById('recentOrdersContainer');
    if (!container) return;

    let orders = [];
    try {
        const client = getSupabaseClient();
        if (client && user.id) {
            const { data, error } = await client.from('sales_order')
                .select('*')
                .eq('customer_id', user.id)
                .order('created_at', { ascending: false })
                .limit(3);

            if (!error && data && data.length > 0) {
                orders = data.map(o => ({
                    code: o.order_code || `#${o.id}`,
                    total: Number(o.total_amount || 0),
                    status: (o.order_status || 'PENDING').toLowerCase(),
                    createdAt: o.created_at
                }));
            }
        }
    } catch (e) {
        console.warn('[Profile] Lỗi tải đơn hàng từ Supabase:', e);
    }

    if (!orders || orders.length === 0) {
        container.innerHTML = '<p class="text-muted p-3">Chưa có đơn hàng nào gần đây.</p>';
        return;
    }

    const statusMap = {
        'completed': { label: 'Hoàn thành', cls: 'status-completed' },
        'done': { label: 'Hoàn thành', cls: 'status-completed' },
        'delivering': { label: 'Đang giao', cls: 'status-delivering' },
        'shipping': { label: 'Đang giao', cls: 'status-delivering' },
        'in-progress': { label: 'Đang chuẩn bị', cls: 'status-in-progress' },
        'confirmed': { label: 'Đã xác nhận', cls: 'status-in-progress' },
        'pending': { label: 'Chờ xác nhận', cls: 'status-pending' },
        'cancelled': { label: 'Đã hủy', cls: 'status-cancelled' }
    };

    let html = '';
    orders.forEach(order => {
        const orderCode = order.code || '#ORD';
        const price = (order.total || 0).toLocaleString('vi-VN') + 'đ';
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
    let editUser = user;
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
        editUser = currentUser;
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
                rawStreet: street,
                province: city || '',
                district: district || '',
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

        const currentUser = editUser;

        if (phoneVal !== currentUser.phone) {
            showToast('error', 'Không thể thay số điện thoại đăng nhập tại đây');
            return;
        }
        if (btnSave.disabled) return;
        btnSave.disabled = true;
        try {
            const updatedUser = await saveCustomerProfile(getSupabaseClient(), currentUser, {
                name: nameVal, email: emailVal, addresses: tempAddresses
            });
            setCurrentUser(updatedUser);
            user = updatedUser;
            tempAddresses = updatedUser.addresses.map(a => ({ ...a }));
            loadProfileData(updatedUser);
            closeModal();
            showToast('success', 'Cập nhật thông tin cá nhân thành công');
        } catch (error) {
            showToast('error', error.message || 'Không thể lưu hồ sơ. Vui lòng thử lại.');
        } finally {
            btnSave.disabled = false;
        }
    });
}

let isInitRunning = false;
let profileChannel;
let profileClient;
let refreshTimer;
let refreshVersion = 0;
let profileModal;

export function dispose() {
    clearTimeout(refreshTimer);
    ++refreshVersion;
    if (profileChannel && profileClient) profileClient.removeChannel(profileChannel);
    profileChannel = null;
    if (profileModal?.parentNode === document.body) profileModal.remove();
    document.body.classList.remove('modal-open');
}

function watchProfile(user) {
    profileClient = getSupabaseClient();
    if (!profileClient?.channel) return;
    const refresh = () => {
        clearTimeout(refreshTimer);
        const version = ++refreshVersion;
        refreshTimer = setTimeout(async () => {
            try {
                const fresh = await syncUserProfileFromSupabase(user, false);
                if (version !== refreshVersion) return;
                setCurrentUser(fresh);
                loadProfileData(fresh);
            } catch { /* Keep the current view; a save still requires a matching revision. */ }
        }, 200);
    };
    profileChannel = profileClient.channel(`customer-profile-${user.id}`);
    for (const table of ['customer_profile', 'customer_address', 'customer_membership']) {
        profileChannel.on('postgres_changes', { event: '*', schema: 'public', table, filter: `customer_id=eq.${user.id}` }, refresh);
    }
    profileChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'customer', filter: `id=eq.${user.id}` }, refresh).subscribe();
}

// Hàm khởi tạo chính của module Profile
export async function init() {
    if (isInitRunning) return;
    isInitRunning = true;
    try {
        let user = getCurrentUser();
        if (!user) return;

        if (typeof window.setUserSubBreadcrumb === 'function') {
            window.setUserSubBreadcrumb('', 'profile');
        }

        // Đồng bộ thời gian thực từ Supabase Live Database trước khi render để tránh giật giao diện
        if (window.getSupabaseClient || window.SupabaseClient) {
            const freshUser = await syncUserProfileFromSupabase(user);
            if (freshUser) user = freshUser;
        }

        // Tải và hiển thị dữ liệu chuẩn một lần duy nhất
        loadProfileData(user);
        await Promise.all([loadMyPets(user), loadUpcomingBooking(user), loadRecentOrders(user)]);
        initProfileEditModal(user);
        profileModal = document.getElementById('profileEditModal');
        watchProfile(user);
    } finally {
        isInitRunning = false;
    }
}

export const initProfile = init;
window.initProfile = init;
