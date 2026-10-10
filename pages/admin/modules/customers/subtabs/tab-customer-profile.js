// tab-customer-profile.js - Subtab Hồ sơ khách hàng 360° Pawpal-er
(function() {
    'use strict';

    const PawpalCustomers = window.PawpalCustomers = window.PawpalCustomers || {};
    PawpalCustomers.subtabs = PawpalCustomers.subtabs || {};

    let currentEditingAddresses = [];
    let currentEditingPetCustId = null;
    let currentEditPetIndex = null;

    // Chuyển đổi giữa 5 tabs con trong Drawer Hồ sơ
    function switchDrawerTab(targetPanelId) {
        const drawerTabs = document.querySelectorAll('.drawer-tab-btn');
        const drawerPanels = document.querySelectorAll('.drawer-tab-panel');

        drawerTabs.forEach(t => {
            t.classList.toggle('active', t.getAttribute('data-drawertab') === targetPanelId);
        });

        drawerPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === targetPanelId);
        });

        sessionStorage.setItem('pawpal_admin_customer_drawertab', targetPanelId);
        if (window.lucide) lucide.createIcons();
    }

    // Render Sổ địa chỉ trong Drawer
    function renderDrawerAddresses(custId) {
        const container = document.getElementById('profileValAddressContainer');
        if (!container) return;
        const cust = PawpalCustomers.state.customerDatabase?.[custId];
        const list = cust?.addresses || [
            { address: 'Tiếp nhận trực tiếp tại quầy Pawpal Pet Center', isDefault: true }
        ];

        container.innerHTML = list.map(item => `
            <div class="drawer-address-row" style="${!item.isDefault ? 'color: var(--text-muted);' : ''}">
                <span class="admin-badge ${item.isDefault ? 'badge-success' : 'badge-neutral'}" style="font-size: 11px; padding: 2px 7px;">
                    ${item.isDefault ? 'Mặc định' : 'Phụ'}
                </span>
                <span>${item.address}</span>
            </div>
        `).join('');
    }

    // Render Danh sách Thú cưng trong Drawer
    function renderDrawerPets(custId) {
        const container = document.getElementById('petCardsListContainer');
        if (!container) return;
        const cust = PawpalCustomers.state.customerDatabase?.[custId];
        const pets = cust?.pets || [];

        if (pets.length === 0) {
            container.innerHTML = `
                <div style="padding: 24px; text-align: center; color: var(--text-muted); font-size: 13.5px;">
                    Khách hàng chưa có bé cưng nào trong danh sách theo dõi. Bấm <strong>Thêm bé cưng</strong> để tạo mới.
                </div>
            `;
            return;
        }

        container.innerHTML = pets.map((pet, idx) => `
            <div class="pet-detail-card" data-pet-id="${pet.id || ('PET-' + idx)}">
                <div class="pet-card-head">
                    <div class="pet-card-head-left">
                        <span class="pet-card-name">${pet.name} (Mã: ${pet.id || ('PET-' + (idx+1))})</span>
                        <span class="admin-badge ${pet.alertNote && pet.alertNote !== 'Bình thường' ? 'badge-warning' : 'badge-neutral'}">
                            ${pet.alertNote || 'Bình thường'}
                        </span>
                    </div>
                    <div class="pet-card-actions">
                        <button type="button" class="btn-pet-action btn-pet-view-profile admin-badge badge-neutral" data-pet-id="${pet.id || ('PET-' + (idx+1))}" data-pet-name="${pet.name}">Xem hồ sơ bé</button>
                        <button type="button" class="btn-pet-action btn-pet-edit" data-cust-id="${custId}" data-pet-index="${idx}">Sửa</button>
                        <button type="button" class="btn-pet-action btn-pet-delete" data-cust-id="${custId}" data-pet-index="${idx}">Xóa</button>
                    </div>
                </div>
                <div class="pet-card-body">
                    <div><strong>Loài:</strong> ${pet.species} ${pet.breed ? '(' + pet.breed + ')' : ''}</div>
                    <div><strong>Cân nặng:</strong> ${pet.weight ? pet.weight + ' kg' : 'Chưa cân'}</div>
                    <div><strong>Tiền sử tiêm chủng:</strong> ${pet.vaccine || 'Chưa cập nhật'}</div>
                    <div><strong>Tính cách / Lưu ý:</strong> ${pet.alertNote || 'Bình thường'}</div>
                </div>
            </div>
        `).join('');

        // Chuyển sang phân hệ Thú cưng
        container.querySelectorAll('.btn-pet-view-profile').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const petId = btn.getAttribute('data-pet-id');
                const petName = btn.getAttribute('data-pet-name') || 'Bé cưng';
                sessionStorage.setItem('pawpal_admin_pet_id', petId);
                sessionStorage.setItem('pawpal_admin_pet_name', petName);
                sessionStorage.setItem('pawpal_admin_pet_subtab', 'tab-pet-profile');
                PawpalCustomers.showToast(`Chuyển đến hồ sơ bé ${petName} (${petId}) tại phân hệ Thú cưng!`);
                const sidebarBtn = document.querySelector('.sidebar-menu-btn[data-title="Thú cưng"]');
                if (sidebarBtn) sidebarBtn.click();
            });
        });

        // Sửa bé cưng
        container.querySelectorAll('.btn-pet-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cId = btn.getAttribute('data-cust-id');
                const pIdx = parseInt(btn.getAttribute('data-pet-index'), 10);
                openEditPetModal(cId, pIdx);
            });
        });

        // Xóa bé cưng
        container.querySelectorAll('.btn-pet-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const cId = btn.getAttribute('data-cust-id');
                const pIdx = parseInt(btn.getAttribute('data-pet-index'), 10);
                const pet = PawpalCustomers.state.customerDatabase?.[cId]?.pets[pIdx];
                PawpalCustomers.showCustomerConfirmModal({
                    title: 'Xác nhận xóa thú cưng',
                    message: `Bạn có chắc chắn muốn xóa bé cưng <strong>${pet?.name || ''}</strong> khỏi hồ sơ của khách hàng này trên CSDL?`,
                    acceptText: 'Xóa thú cưng',
                    onAccept: async () => {
                        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                        if (!client) {
                            PawpalCustomers.showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                            return;
                        }
                        try {
                            if (pet?.dbId) {
                                const { error: delErr } = await client.from('pet_profile').delete().eq('id', pet.dbId);
                                if (delErr) {
                                    console.error('[Customers] Lỗi xóa thú cưng:', delErr);
                                    PawpalCustomers.showToast('Không thể xóa thú cưng khỏi CSDL!', 'danger');
                                    return;
                                }
                            }
                            await PawpalCustomers.loadCustomersModuleData();
                            renderDrawerPets(cId);
                            if (PawpalCustomers.subtabs.list) {
                                PawpalCustomers.subtabs.list.renderCustomersTable();
                                PawpalCustomers.subtabs.list.updateCustomerKPIs();
                            }
                            PawpalCustomers.showToast(`Đã xóa bé cưng ${pet?.name || ''} khỏi CSDL thành công!`, 'success');
                        } catch (err) {
                            console.error('[Customers] Lỗi xóa thú cưng:', err);
                            PawpalCustomers.showToast('Đã xảy ra lỗi khi xóa thú cưng!', 'danger');
                        }
                    }
                });
            });
        });
    }

    // Render Tab Đơn hàng
    function renderDrawerOrders(custId) {
        const tbody = document.getElementById('drawerOrdersTbody');
        if (!tbody) return;
        const cust = PawpalCustomers.state.customerDatabase?.[custId];
        let orders = [...(cust?.orders || [])];

        try {
            const rawOrders = sessionStorage.getItem('pawpal_admin_orders_data');
            if (rawOrders) {
                const allOrders = JSON.parse(rawOrders);
                const custName = cust?.name?.toLowerCase();
                const custPhone = cust?.phone;
                const custIdMap = { 'CUST-001': 'USER-001', 'CUST-002': 'USER-002', 'CUST-003': 'USER-003', 'CUST-004': 'USER-004', 'CUST-005': 'USER-005' };
                const mappedUserId = custIdMap[custId];

                const matchedOrders = allOrders.filter(o =>
                    o.userId === custId ||
                    o.userId === mappedUserId ||
                    (custPhone && o.phone && o.phone.replace(/[^0-9]/g, '') === custPhone.replace(/[^0-9]/g, '')) ||
                    (custName && o.customerName && o.customerName.toLowerCase() === custName)
                );

                matchedOrders.forEach(mo => {
                    if (!orders.some(ord => ord.id === mo.id)) {
                        orders.unshift({
                            id: mo.id,
                            date: PawpalCustomers.formatDate(mo.createdAt),
                            total: Number(mo.total).toLocaleString('vi-VN') + ' đ',
                            payment: mo.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán',
                            paymentClass: mo.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning',
                            status: mo.status === 'completed' ? 'Hoàn thành' : mo.status === 'shipping' ? 'Đang giao' : mo.status === 'confirmed' ? 'Đang chuẩn bị' : 'Chờ xác nhận',
                            statusClass: mo.status === 'completed' ? 'badge-success' : mo.status === 'shipping' ? 'badge-info' : 'badge-warning'
                        });
                    }
                });
            }
        } catch (e) {}

        if (orders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Khách hàng chưa có lịch sử mua hàng.</td></tr>`;
            return;
        }

        tbody.innerHTML = orders.map(ord => `
            <tr>
                <td>
                    <a href="javascript:void(0)" class="user-name-link btn-jump-order-code" data-order-id="${ord.id}" style="font-weight: 600; color: var(--text-heading); text-decoration: none;">${ord.id}</a>
                </td>
                <td>${ord.date}</td>
                <td>${ord.total}</td>
                <td><span class="admin-badge ${ord.paymentClass || (ord.payment === 'Đã thanh toán' ? 'badge-success' : 'badge-warning')}">${ord.payment}</span></td>
                <td><span class="admin-badge ${ord.statusClass}">${ord.status}</span></td>
                <td><button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-order-action" data-order-id="${ord.id}">Xem chi tiết đơn</button></td>
            </tr>
        `).join('');

        const jumpToOrder = (ordId) => {
            sessionStorage.setItem('pawpal_admin_order_id', ordId);
            sessionStorage.setItem('pawpal_admin_order_selected_id', ordId);
            sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-detail');
            sessionStorage.setItem('pawpal_admin_active_module', 'Bán hàng');
            PawpalCustomers.showToast(`Mở chi tiết đơn hàng ${ordId} tại phân hệ Bán hàng!`);
            const menuBtn = document.querySelector('.sidebar-menu-btn[data-title="Bán hàng"]');
            if (menuBtn) {
                menuBtn.click();
            } else {
                window.location.hash = '#tab-order-detail';
            }
        };

        tbody.querySelectorAll('.btn-jump-order-code, .btn-view-order-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const ordId = btn.getAttribute('data-order-id');
                jumpToOrder(ordId);
            });
        });
    }

    // Render Tab Lịch hẹn
    function renderDrawerBookings(custId) {
        const tbody = document.getElementById('drawerBookingsTbody');
        if (!tbody) return;
        const bookings = PawpalCustomers.state.customerDatabase?.[custId]?.bookings || [];

        if (bookings.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Khách hàng chưa có lịch hẹn dịch vụ nào.</td></tr>`;
            return;
        }

        tbody.innerHTML = bookings.map(b => `
            <tr>
                <td><strong>${b.id}</strong></td>
                <td>${b.date}</td>
                <td>${b.service}</td>
                <td>${b.staff}</td>
                <td><span class="admin-badge ${b.statusClass}">${b.status}</span></td>
                <td><button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-booking-action" data-booking-id="${b.id}">Xem nhật ký</button></td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-view-booking-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const bId = btn.getAttribute('data-booking-id');
                sessionStorage.setItem('pawpal_admin_booking_id', bId);
                PawpalCustomers.showToast(`Mở nhật ký quy trình chăm sóc lịch hẹn ${bId} tại phân hệ Dịch vụ!`);
                const menuBtn = document.querySelector('.sidebar-menu-btn[data-title="Dịch vụ"]');
                if (menuBtn) menuBtn.click();
            });
        });
    }

    // Render Tab Khiếu nại
    function renderDrawerComplaints(custId) {
        const tbody = document.getElementById('drawerComplaintsTbody');
        if (!tbody) return;
        const complaints = PawpalCustomers.state.customerDatabase?.[custId]?.complaints || [];

        if (complaints.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Khách hàng không có phản ánh hay khiếu nại nào.</td></tr>`;
            return;
        }

        tbody.innerHTML = complaints.map(c => `
            <tr>
                <td><strong>${c.id}</strong></td>
                <td>${c.date}</td>
                <td>${c.issue}</td>
                <td><span class="admin-badge badge-danger">${c.level}</span></td>
                <td><span class="admin-badge ${c.statusClass}">${c.status}</span></td>
                <td><button type="button" class="admin-btn admin-btn-primary btn-sm btn-view-ticket-action" data-ticket-id="${c.id}">Mở Ticket xử lý</button></td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-view-ticket-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const tId = btn.getAttribute('data-ticket-id');
                sessionStorage.setItem('pawpal_admin_ticket_id', tId);
                sessionStorage.setItem('pawpal_admin_complaint_selected_id', tId);
                PawpalCustomers.showToast(`Chuyển đến xử lý Ticket khiếu nại ${tId} tại phân hệ Khiếu nại!`);
                const menuBtn = document.querySelector('.sidebar-menu-btn[data-title="Khiếu nại"]');
                if (menuBtn) menuBtn.click();
            });
        });
    }

    // Render toàn bộ Hồ sơ khách hàng trong Drawer
    function renderDrawerCustomerProfile(custId) {
        let data = PawpalCustomers.state.customerDatabase?.[custId];
        if (!data) {
            data = {
                id: custId,
                name: 'Khách hàng ' + custId,
                phone: '0900000000',
                email: 'khachhang@email.com',
                gender: 'Nam',
                dob: '01/01/1990',
                tier: 'SILVER',
                tierName: 'Bạc',
                tierBadgeClass: 'badge-tier-silver',
                points: 0,
                status: 'ACTIVE',
                authStatus: 'Đã kích hoạt',
                note: 'Chưa có ghi chú đặc biệt.',
                emergencyAlert: null,
                addresses: [{ address: 'Tiếp nhận trực tiếp tại quầy Pawpal Pet Center', isDefault: true }],
                pets: [],
                orders: [],
                bookings: [],
                complaints: []
            };
            PawpalCustomers.state.customerDatabase[custId] = data;
        }

        // Headline
        const headlineName = document.getElementById('drawerCustomerName');
        const headlineTier = document.getElementById('drawerCustomerTier');
        const headlinePhoneBadge = document.querySelector('.drawer-user-headline .badge-success');
        if (headlineName) headlineName.textContent = data.name;
        if (headlineTier) {
            headlineTier.textContent = data.tierName;
            headlineTier.className = `admin-badge ${data.tierBadgeClass}`;
        }
        if (headlinePhoneBadge) headlinePhoneBadge.textContent = data.phone;

        // Nút thao tác một chạm Gọi điện, Zalo
        const btnCall = document.querySelector('.drawer-action-buttons a[href^="tel:"]');
        const btnZalo = document.querySelector('.drawer-action-buttons a[href*="zalo.me"]');
        if (btnCall) btnCall.href = `tel:${data.phone}`;
        if (btnZalo) btnZalo.href = `https://zalo.me/${data.phone}`;

        // Banner cảnh báo khẩn cấp
        const banner = document.getElementById('custEmergencyBanner');
        const alertText = document.getElementById('custEmergencyAlertText');
        if (data.emergencyAlert) {
            if (banner) banner.style.display = 'flex';
            if (alertText) alertText.textContent = data.emergencyAlert;
        } else {
            if (banner) banner.style.display = 'none';
        }

        // Tab 1: Cá nhân
        if (document.getElementById('profileValCustId')) document.getElementById('profileValCustId').textContent = data.id;
        if (document.getElementById('profileValFullName')) document.getElementById('profileValFullName').textContent = data.name;
        if (document.getElementById('profileValPhone')) document.getElementById('profileValPhone').textContent = data.phone;
        const displayOptional = (value, fallback = 'Chưa cập nhật') => {
            const normalized = value === null || value === undefined || String(value).trim().toLowerCase() === 'null' || String(value).trim().toLowerCase() === 'undefined' ? '' : String(value).trim();
            return normalized || fallback;
        };
        if (document.getElementById('profileValEmail')) document.getElementById('profileValEmail').textContent = displayOptional(data.email);
        if (document.getElementById('profileValGender')) document.getElementById('profileValGender').textContent = displayOptional(data.gender);
        if (document.getElementById('profileValDob')) document.getElementById('profileValDob').textContent = data.dob || 'Chưa cập nhật';
        if (document.getElementById('drawerCustNote')) document.getElementById('drawerCustNote').value = data.note || '';
        const authStatusEl = document.getElementById('profileValAuthStatus');
        if (authStatusEl) {
            const authBadgeClass = data.status === 'LOCKED' ? 'badge-danger' : (data.status === 'TEMP' ? 'badge-warning' : 'badge-success');
            authStatusEl.innerHTML = `<span class="admin-badge ${authBadgeClass}">${data.status === 'LOCKED' ? 'Tài khoản bị khóa' : (data.status === 'TEMP' ? 'Tài khoản tạm' : 'Đang hoạt động')}</span><button type="button" class="admin-btn admin-btn-secondary btn-sm" id="btnResendSmsToken" style="font-size: 11.5px; padding: 3px 8px;">Gửi lại SMS</button>`;
            authStatusEl.querySelector('#btnResendSmsToken')?.addEventListener('click', () => {
                PawpalCustomers.showToast(`Đã gửi lại tin nhắn SMS chứa liên kết tạo mật khẩu đến số ${data.phone}!`);
            });
        }

        // Sổ địa chỉ
        renderDrawerAddresses(custId);

        // Tab 2: Thú cưng
        renderDrawerPets(custId);

        // Tab 3: Đơn hàng
        renderDrawerOrders(custId);

        // Tab 4: Lịch hẹn
        renderDrawerBookings(custId);

        // Tab 5: Khiếu nại
        renderDrawerComplaints(custId);

        // Cập nhật số đếm badge trên các tabs con
        const badgeOrders = document.getElementById('badgeCountOrders');
        const badgeBookings = document.getElementById('badgeCountBookings');
        const badgeComplaints = document.getElementById('badgeCountComplaints');
        if (badgeOrders) {
            badgeOrders.textContent = data.orders.length;
            badgeOrders.style.display = data.orders.length > 0 ? 'inline-flex' : 'none';
        }
        if (badgeBookings) {
            badgeBookings.textContent = data.bookings.length;
            badgeBookings.style.display = data.bookings.length > 0 ? 'inline-flex' : 'none';
        }
        if (badgeComplaints) {
            badgeComplaints.textContent = data.complaints.length;
            badgeComplaints.style.display = data.complaints.length > 0 ? 'inline-flex' : 'none';
        }

        PawpalCustomers.updateBreadcrumb(data.name);
    }

    // Quản lý Sổ địa chỉ trong Modal 3
    function updateAddressValuesFromDOM() {
        const container = document.getElementById('editCustAddressList');
        if (!container) return;
        const cards = container.querySelectorAll('.address-row-card');
        cards.forEach((card, idx) => {
            if (currentEditingAddresses[idx]) {
                const input = card.querySelector('.address-input-val');
                if (input) currentEditingAddresses[idx].address = input.value;
            }
        });
    }

    function renderModalAddressList() {
        const container = document.getElementById('editCustAddressList');
        if (!container) return;

        if (currentEditingAddresses.length > 0 && !currentEditingAddresses.some(a => a.isDefault)) {
            currentEditingAddresses[0].isDefault = true;
        }

        container.innerHTML = currentEditingAddresses.map((item, index) => `
            <div class="address-row-card ${item.isDefault ? 'is-default' : ''}" data-index="${index}">
                <div class="address-row-meta">
                    <label class="address-radio-label">
                        <input type="radio" name="default_address_radio" value="${index}" ${item.isDefault ? 'checked' : ''}>
                        <span class="default-badge ${item.isDefault ? 'active' : ''}">
                            ${item.isDefault ? 'Địa chỉ mặc định' : 'Đặt làm mặc định'}
                        </span>
                    </label>
                    ${currentEditingAddresses.length > 1 && !item.isDefault ? `
                        <button type="button" class="btn-remove-address" data-index="${index}">Xóa</button>
                    ` : ''}
                </div>
                <input type="text" class="admin-input address-input-val" value="${item.address}" placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/TP..." required>
            </div>
        `).join('');

        container.querySelectorAll('input[name="default_address_radio"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const chosenIdx = parseInt(e.target.value, 10);
                updateAddressValuesFromDOM();
                currentEditingAddresses.forEach((addr, idx) => {
                    addr.isDefault = (idx === chosenIdx);
                });
                renderModalAddressList();
            });
        });

        container.querySelectorAll('.btn-remove-address').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const delIdx = parseInt(btn.getAttribute('data-index'), 10);
                updateAddressValuesFromDOM();
                currentEditingAddresses.splice(delIdx, 1);
                if (!currentEditingAddresses.some(a => a.isDefault) && currentEditingAddresses.length > 0) {
                    currentEditingAddresses[0].isDefault = true;
                }
                renderModalAddressList();
            });
        });
    }

    // Modal Chỉnh sửa hồ sơ khách hàng
    const modalEdit = document.getElementById('modalEditCustomer');
    function openEditCustomerModal(custId) {
        if (!modalEdit) return;
        const currentId = custId || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
        const data = PawpalCustomers.state.customerDatabase?.[currentId] || {};

        if (document.getElementById('editCustId')) document.getElementById('editCustId').value = currentId;
        if (document.getElementById('editCustFullName')) document.getElementById('editCustFullName').value = data.name || '';
        if (document.getElementById('editCustPhone')) document.getElementById('editCustPhone').value = data.phone || '';
        if (document.getElementById('editCustEmail')) document.getElementById('editCustEmail').value = data.email || '';
        if (document.getElementById('editCustGender')) document.getElementById('editCustGender').value = data.gender || 'Nam';
        if (document.getElementById('editCustTier')) document.getElementById('editCustTier').value = data.tier || 'GOLD';
        
        const dob = data.dob || '';
        if (dob && dob.includes('/')) {
            const parts = dob.split('/');
            if (parts.length === 3 && document.getElementById('editCustDob')) {
                document.getElementById('editCustDob').value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
            }
        }

        const existingAddresses = data.addresses || [
            { address: 'Tiếp nhận trực tiếp tại quầy Pawpal Center', isDefault: true }
        ];
        currentEditingAddresses = JSON.parse(JSON.stringify(existingAddresses));
        renderModalAddressList();

        modalEdit.style.display = 'flex';
    }

    function closeEditModal() {
        if (modalEdit) modalEdit.style.display = 'none';
    }

    // Modal Thêm Thú cưng
    const modalAddPet = document.getElementById('modalAddPet');
    function openAddPetModal() {
        if (modalAddPet) modalAddPet.style.display = 'flex';
    }
    function closeAddPetModal() {
        if (modalAddPet) modalAddPet.style.display = 'none';
    }

    // Modal Sửa Thú cưng
    const modalEditPet = document.getElementById('modalEditPet');
    function openEditPetModal(custId, petIndex) {
        if (!modalEditPet) return;
        currentEditingPetCustId = custId;
        currentEditPetIndex = petIndex;
        const pet = PawpalCustomers.state.customerDatabase?.[custId]?.pets[petIndex];
        if (!pet) return;

        if (document.getElementById('editPetId')) document.getElementById('editPetId').value = pet.id || '';
        if (document.getElementById('editPetName')) document.getElementById('editPetName').value = pet.name || '';
        if (document.getElementById('editPetSpecies')) document.getElementById('editPetSpecies').value = pet.species || 'Chó';
        if (document.getElementById('editPetBreed')) document.getElementById('editPetBreed').value = pet.breed || '';
        if (document.getElementById('editPetWeight')) document.getElementById('editPetWeight').value = pet.weight || '';
        if (document.getElementById('editPetVaccine')) document.getElementById('editPetVaccine').value = pet.vaccine || '';
        if (document.getElementById('editPetAlert')) document.getElementById('editPetAlert').value = pet.alertNote || 'Bình thường';

        modalEditPet.style.display = 'flex';
    }
    function closeEditPetModal() {
        if (modalEditPet) modalEditPet.style.display = 'none';
    }

    function initProfileTab() {
        // Drawer Subtabs switching
        const drawerTabs = document.querySelectorAll('.drawer-tab-btn');
        drawerTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPanelId = tab.getAttribute('data-drawertab');
                switchDrawerTab(targetPanelId);
            });
        });

        // Nút Sửa hồ sơ
        const btnOpenEdit = document.getElementById('btnOpenEditProfileModal');
        const btnCloseEdit = document.getElementById('btnCloseEditCustomer');
        const btnCancelEdit = document.getElementById('btnCancelEditCustomer');
        const formEdit = document.getElementById('formEditCustomer');
        const btnAddAddressItem = document.getElementById('btnAddAddressItem');

        if (btnOpenEdit) btnOpenEdit.addEventListener('click', () => openEditCustomerModal());
        if (btnCloseEdit) btnCloseEdit.addEventListener('click', closeEditModal);
        if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditModal);

        if (btnAddAddressItem) {
            btnAddAddressItem.addEventListener('click', () => {
                updateAddressValuesFromDOM();
                const isFirst = currentEditingAddresses.length === 0;
                currentEditingAddresses.push({ address: '', isDefault: isFirst });
                renderModalAddressList();
                setTimeout(() => {
                    const inputs = document.querySelectorAll('#editCustAddressList .address-input-val');
                    if (inputs.length > 0) inputs[inputs.length - 1].focus();
                }, 50);
            });
        }

        if (formEdit) {
            formEdit.addEventListener('submit', async (e) => {
                e.preventDefault();
                const custId = document.getElementById('editCustId')?.value || 'CUST-001';
                const newName = document.getElementById('editCustFullName')?.value || '';
                const newPhone = document.getElementById('editCustPhone')?.value || '';
                const newEmail = document.getElementById('editCustEmail')?.value || '';
                const newGender = document.getElementById('editCustGender')?.value || 'Nam';
                const newTier = document.getElementById('editCustTier')?.value || 'GOLD';
                const newDobRaw = document.getElementById('editCustDob')?.value || '';

                updateAddressValuesFromDOM();
                const validAddresses = currentEditingAddresses.filter(a => a.address.trim() !== '');
                if (validAddresses.length === 0) {
                    PawpalCustomers.showToast('Vui lòng nhập ít nhất một địa chỉ nhận hàng!', 'warning');
                    return;
                }
                if (!validAddresses.some(a => a.isDefault)) {
                    validAddresses[0].isDefault = true;
                }

                const custObj = PawpalCustomers.state.customerDatabase?.[custId];
                const custDbId = custObj?.dbId;

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    PawpalCustomers.showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                try {
                    if (custDbId) {
                        await client.from('customer').update({
                            email: newEmail || null,
                            phone_main: newPhone || null
                        }).eq('id', custDbId);

                        const genderVal = (newGender === 'Nữ' || newGender === 'FEMALE') ? 'FEMALE' : ((newGender === 'Nam' || newGender === 'MALE') ? 'MALE' : 'OTHER');
                        const profilePayload = {
                            full_name: newName,
                            gender: genderVal,
                            date_of_birth: newDobRaw || null
                        };
                        const { data: updatedProfiles, error: profileUpdateError } = await client
                            .from('customer_profile')
                            .update(profilePayload)
                            .eq('customer_id', custDbId)
                            .select('id');
                        if (profileUpdateError) throw profileUpdateError;
                        if (!updatedProfiles || updatedProfiles.length === 0) {
                            const { error: profileInsertError } = await client.from('customer_profile').insert({
                                customer_id: custDbId,
                                ...profilePayload
                            });
                            if (profileInsertError) throw profileInsertError;
                        }

                        await client.from('customer_address').delete().eq('customer_id', custDbId);
                        const addrInserts = validAddresses.map(a => ({
                            customer_id: custDbId,
                            receiver_name: newName,
                            receiver_phone: newPhone,
                            street_address: a.address,
                            is_default: !!a.isDefault
                        }));
                        if (addrInserts.length > 0) {
                            await client.from('customer_address').insert(addrInserts);
                        }
                    }

                    await PawpalCustomers.loadCustomersModuleData();
                    renderDrawerCustomerProfile(custId);
                    if (PawpalCustomers.subtabs.list) {
                        PawpalCustomers.subtabs.list.renderCustomersTable();
                        PawpalCustomers.subtabs.list.updateCustomerKPIs();
                    }
                    PawpalCustomers.showToast(`Đã cập nhật thành công hồ sơ của khách hàng ${newName} vào CSDL!`, 'success');
                    closeEditModal();
                } catch (err) {
                    console.error('[Customers] Lỗi cập nhật hồ sơ khách hàng:', err);
                    PawpalCustomers.showToast('Đã xảy ra lỗi khi cập nhật hồ sơ!', 'danger');
                }
            });
        }

        // Modal Thêm Pet
        const btnOpenAddPet = document.getElementById('btnOpenAddPetModal');
        const btnCloseAddPet = document.getElementById('btnCloseAddPet');
        const btnCancelAddPet = document.getElementById('btnCancelAddPet');
        const formAddPet = document.getElementById('formAddPet');

        if (btnOpenAddPet) btnOpenAddPet.addEventListener('click', openAddPetModal);
        if (btnCloseAddPet) btnCloseAddPet.addEventListener('click', closeAddPetModal);
        if (btnCancelAddPet) btnCancelAddPet.addEventListener('click', closeAddPetModal);

        document.querySelectorAll('#addPetBreedChips .reason-quick-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const input = document.getElementById('addPetBreed');
                if (input) {
                    input.value = chip.textContent.trim();
                    input.focus();
                }
            });
        });

        if (formAddPet) {
            formAddPet.addEventListener('submit', async (e) => {
                e.preventDefault();
                const petName = document.getElementById('addPetName')?.value || 'Bé cưng';
                const species = document.getElementById('addPetSpecies')?.value || 'Chó';
                const breed = document.getElementById('addPetBreed')?.value || '';
                const weight = document.getElementById('addPetWeight')?.value || '';
                const vaccine = document.getElementById('addPetVaccine')?.value || 'Chưa cập nhật';
                const alertNote = document.getElementById('addPetAlert')?.value || 'Bình thường';

                const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id') || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
                const custObj = PawpalCustomers.state.customerDatabase?.[currentCustId];
                const custDbId = custObj?.dbId;

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    PawpalCustomers.showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                try {
                    const spec = (species === 'Mèo' || species === 'CAT') ? 'cat' : ((species === 'Thỏ' || species === 'RABBIT') ? 'rabbit' : ((species === 'Khác' || species === 'OTHER') ? 'other' : 'dog'));
                    if (custDbId) {
                        const { error: petErr } = await client.from('pet_profile').insert({
                            customer_id: custDbId,
                            pet_name: petName,
                            species: spec,
                            breed: breed || 'Chưa cập nhật',
                            weight: weight ? parseFloat(weight) : null,
                            vaccination_history: vaccine || 'Chưa cập nhật',
                            allergy: (alertNote && alertNote !== 'Bình thường') ? alertNote : 'Không'
                        });
                        if (petErr) throw petErr;
                    }

                    await PawpalCustomers.loadCustomersModuleData();
                    renderDrawerPets(currentCustId);
                    if (PawpalCustomers.subtabs.list) {
                        PawpalCustomers.subtabs.list.renderCustomersTable();
                        PawpalCustomers.subtabs.list.updateCustomerKPIs();
                    }
                    PawpalCustomers.showToast(`Đã thêm thành công bé cưng ${petName} vào CSDL!`, 'success');
                    formAddPet.reset();
                    closeAddPetModal();
                } catch (err) {
                    console.error('[Customers] Lỗi thêm thú cưng:', err);
                    PawpalCustomers.showToast('Đã xảy ra lỗi khi thêm thú cưng!', 'danger');
                }
            });
        }

        // Modal Sửa Pet
        const btnCloseEditPet = document.getElementById('btnCloseEditPet');
        const btnCancelEditPet = document.getElementById('btnCancelEditPet');
        const formEditPet = document.getElementById('formEditPet');

        if (btnCloseEditPet) btnCloseEditPet.addEventListener('click', closeEditPetModal);
        if (btnCancelEditPet) btnCancelEditPet.addEventListener('click', closeEditPetModal);

        if (formEditPet) {
            formEditPet.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (!currentEditingPetCustId || currentEditPetIndex === null) return;
                const pet = PawpalCustomers.state.customerDatabase?.[currentEditingPetCustId]?.pets[currentEditPetIndex];
                if (!pet) return;

                const newPetName = document.getElementById('editPetName')?.value || pet.name;
                const newSpecies = document.getElementById('editPetSpecies')?.value || pet.species;
                const newBreed = document.getElementById('editPetBreed')?.value || '';
                const newWeight = document.getElementById('editPetWeight')?.value || '';
                const newVaccine = document.getElementById('editPetVaccine')?.value || 'Chưa cập nhật';
                const newAlert = document.getElementById('editPetAlert')?.value || 'Bình thường';

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    PawpalCustomers.showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                try {
                    const spec = (newSpecies === 'Mèo' || newSpecies === 'CAT') ? 'cat' : ((newSpecies === 'Thỏ' || newSpecies === 'RABBIT') ? 'rabbit' : ((newSpecies === 'Khác' || newSpecies === 'OTHER') ? 'other' : 'dog'));
                    if (pet.dbId) {
                        const { error: petErr } = await client.from('pet_profile').update({
                            pet_name: newPetName,
                            species: spec,
                            breed: newBreed || 'Chưa cập nhật',
                            weight: newWeight ? parseFloat(newWeight) : null,
                            vaccination_history: newVaccine || 'Chưa cập nhật',
                            allergy: (newAlert && newAlert !== 'Bình thường') ? newAlert : 'Không'
                        }).eq('id', pet.dbId);
                        if (petErr) throw petErr;
                    }

                    await PawpalCustomers.loadCustomersModuleData();
                    renderDrawerPets(currentEditingPetCustId);
                    if (PawpalCustomers.subtabs.list) {
                        PawpalCustomers.subtabs.list.renderCustomersTable();
                        PawpalCustomers.subtabs.list.updateCustomerKPIs();
                    }
                    PawpalCustomers.showToast(`Đã cập nhật thành công thông tin bé cưng ${newPetName} vào CSDL!`, 'success');
                    closeEditPetModal();
                } catch (err) {
                    console.error('[Customers] Lỗi cập nhật thú cưng:', err);
                    PawpalCustomers.showToast('Đã xảy ra lỗi khi cập nhật thú cưng!', 'danger');
                }
            });
        }

        // Lưu ghi chú
        const btnSaveNote = document.getElementById('btnSaveCustomerNote');
        if (btnSaveNote) {
            btnSaveNote.addEventListener('click', async () => {
                const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id') || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
                const noteVal = document.getElementById('drawerCustNote')?.value || '';
                const custObj = PawpalCustomers.state.customerDatabase?.[currentCustId];
                const custDbId = custObj?.dbId;

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    PawpalCustomers.showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                try {
                    if (custDbId) {
                        const { error: noteErr } = await client.from('customer').update({ note: noteVal }).eq('id', custDbId);
                        if (noteErr) throw noteErr;
                    }
                    await PawpalCustomers.loadCustomersModuleData();
                    PawpalCustomers.showToast('Đã lưu thành công ghi chú khách hàng vào CSDL!', 'success');
                } catch (err) {
                    console.error('[Customers] Lỗi lưu ghi chú:', err);
                    PawpalCustomers.showToast('Đã xảy ra lỗi khi lưu ghi chú!', 'danger');
                }
            });
        }

        // Điều hướng chéo
        document.querySelector('.btn-link-service')?.addEventListener('click', () => {
            const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id') || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
            const cust = PawpalCustomers.state.customerDatabase?.[currentCustId] || { name: document.getElementById('drawerCustomerName')?.textContent || 'Khách hàng' };
            const presetBooking = {
                custId: cust.id || currentCustId,
                custName: cust.name || '',
                ownerName: cust.name || '',
                custPhone: cust.phone || '',
                ownerPhone: cust.phone || '',
                petName: (cust.pets && cust.pets.length > 0) ? cust.pets[0].name : '',
                pets: cust.pets || []
            };
            sessionStorage.setItem('pawpal_admin_booking_preset', JSON.stringify(presetBooking));
            PawpalCustomers.showToast(`Đã thiết lập thông tin đặt lịch cho ${cust.name}, chuyển sang phân hệ Dịch vụ!`);
            const btn = document.querySelector('.sidebar-menu-btn[data-title="Dịch vụ"]');
            if (btn) btn.click();
        });

        document.querySelector('.btn-link-order')?.addEventListener('click', () => {
            const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id') || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
            const cust = PawpalCustomers.state.customerDatabase?.[currentCustId] || { name: document.getElementById('drawerCustomerName')?.textContent || 'Khách hàng' };
            const defaultAddr = cust.addresses?.find(a => a.isDefault)?.address || cust.addresses?.[0]?.address || '';
            const presetOrder = {
                custId: cust.id || currentCustId,
                custName: cust.name || '',
                ownerName: cust.name || '',
                custPhone: cust.phone || '',
                ownerPhone: cust.phone || '',
                address: defaultAddr
            };
            sessionStorage.setItem('pawpal_admin_order_preset', JSON.stringify(presetOrder));
            sessionStorage.setItem('pawpal_admin_order_subtab', 'tab-order-list');
            sessionStorage.setItem('pawpal_admin_active_module', 'Bán hàng');
            PawpalCustomers.showToast(`Đã thiết lập thông tin lên đơn cho ${cust.name}, chuyển sang phân hệ Bán hàng!`);
            const btn = document.querySelector('.sidebar-menu-btn[data-title="Bán hàng"]');
            if (btn) btn.click();
            else window.location.hash = '#tab-order-list';
        });

        document.querySelector('.btn-link-complaint')?.addEventListener('click', () => {
            const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id') || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
            const cust = PawpalCustomers.state.customerDatabase?.[currentCustId] || { name: document.getElementById('drawerCustomerName')?.textContent || 'Khách hàng' };
            const presetComplaint = {
                custId: cust.id || currentCustId,
                custName: cust.name || '',
                ownerName: cust.name || '',
                custPhone: cust.phone || '',
                ownerPhone: cust.phone || ''
            };
            sessionStorage.setItem('pawpal_admin_complaint_preset', JSON.stringify(presetComplaint));
            PawpalCustomers.showToast(`Mở phiếu tiếp nhận khiếu nại cho ${cust.name} tại phân hệ Khiếu nại!`);
            const btn = document.querySelector('.sidebar-menu-btn[data-title="Khiếu nại"]');
            if (btn) btn.click();
        });
    }

    PawpalCustomers.subtabs.profile = {
        init: initProfileTab,
        renderDrawerCustomerProfile,
        renderDrawerAddresses,
        renderDrawerPets,
        renderDrawerOrders,
        renderDrawerBookings,
        renderDrawerComplaints,
        switchDrawerTab,
        openEditCustomerModal,
        closeEditModal,
        openAddPetModal,
        openEditPetModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initProfileTab);
    } else {
        initProfileTab();
    }
})();
