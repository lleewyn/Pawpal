// tab-customer-profile.js - Subtab Hồ sơ khách hàng 360° Pawpal-er
(function() {
    'use strict';

    const PawpalCustomers = window.PawpalCustomers = window.PawpalCustomers || {};
    PawpalCustomers.subtabs = PawpalCustomers.subtabs || {};

    let currentEditingAddresses = [];
    let initialEditingAddressesSnapshot = '';
    let currentEditingPetCustId = null;
    let currentEditPetIndex = null;

    function getCust(id) {
        return (PawpalCustomers.getCustomer && PawpalCustomers.getCustomer(id)) || PawpalCustomers.state?.customerDatabase?.[id];
    }

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
        if (targetPanelId === 'dtab-bookings' || targetPanelId === 'dtab-orders' || targetPanelId === 'dtab-complaints') {
            const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id');
            const cust = getCust(currentCustId);
            if (cust && typeof PawpalCustomers.fetchCustomerProfile360 === 'function') {
                PawpalCustomers.fetchCustomerProfile360(cust, { force: true }).then(() => {
                    renderDrawerOrders(currentCustId);
                    renderDrawerBookings(currentCustId);
                    renderDrawerComplaints(currentCustId);
                });
            }
        }
        if (window.lucide) lucide.createIcons();
    }

    const esc = (s) => (PawpalCustomers.escapeHtml ? PawpalCustomers.escapeHtml(s) : String(s || ''));

    // Render Sổ địa chỉ trong Drawer
    function renderDrawerAddresses(custId) {
        const container = document.getElementById('profileValAddressContainer');
        if (!container) return;
        const cust = getCust(custId);
        const list = cust?.addresses || [
            { address: 'Tiếp nhận trực tiếp tại quầy Pawpal Pet Center', isDefault: true }
        ];

        container.innerHTML = list.map(item => `
            <div class="drawer-address-row" style="${!item.isDefault ? 'color: var(--text-muted);' : ''}">
                <span class="admin-badge ${item.isDefault ? 'badge-success' : 'badge-neutral'}" style="font-size: 11px; padding: 2px 7px;">
                    ${item.isDefault ? 'Mặc định' : 'Phụ'}
                </span>
                <span>${esc(item.address)}</span>
            </div>
        `).join('');
    }

    // Render Danh sách Thú cưng trong Drawer
    function renderDrawerPets(custId) {
        const container = document.getElementById('petCardsListContainer');
        if (!container) return;
        const cust = getCust(custId);
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
            <div class="pet-detail-card" data-pet-id="${esc(pet.id || ('PET-' + idx))}">
                <div class="pet-card-head">
                    <div class="pet-card-head-left">
                        <span class="pet-card-name">${esc(pet.name)} (Mã: ${esc(pet.id || ('PET-' + (idx+1)))})</span>
                        <span class="admin-badge ${pet.alertNote && pet.alertNote !== 'Bình thường' ? 'badge-warning' : 'badge-neutral'}">
                            ${esc(pet.alertNote || 'Bình thường')}
                        </span>
                    </div>
                    <div class="pet-card-actions">
                        <button type="button" class="btn-pet-action btn-pet-view-profile admin-badge badge-neutral" data-pet-id="${esc(pet.id || ('PET-' + (idx+1)))}" data-pet-name="${esc(pet.name)}">Xem hồ sơ bé</button>
                        <button type="button" class="btn-pet-action btn-pet-edit" data-cust-id="${esc(custId)}" data-pet-index="${idx}">Sửa</button>
                        <button type="button" class="btn-pet-action btn-pet-delete" data-cust-id="${esc(custId)}" data-pet-index="${idx}">Xóa</button>
                    </div>
                </div>
                <div class="pet-card-body">
                    <div><strong>Loài:</strong> ${esc(pet.species)} ${pet.breed ? '(' + esc(pet.breed) + ')' : ''}</div>
                    <div><strong>Cân nặng:</strong> ${pet.weight ? esc(pet.weight) + ' kg' : 'Chưa cân'}</div>
                    <div><strong>Tiền sử tiêm chủng:</strong> ${esc(pet.vaccine || 'Chưa cập nhật')}</div>
                    <div><strong>Tính cách / Lưu ý:</strong> ${esc(pet.alertNote || 'Bình thường')}</div>
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
                const pet = getCust(cId)?.pets[pIdx];
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
                            await PawpalCustomers.loadCustomersModuleData({ force: true });
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
        const cust = getCust(custId);
        let orders = [...(cust?.orders || [])];

        try {
            const rawOrders = sessionStorage.getItem('pawpal_admin_orders_data');
            if (rawOrders) {
                const allOrders = JSON.parse(rawOrders);
                const custName = cust?.name?.toLowerCase();
                const custPhone = cust?.phone;
                const mappedUserId = cust?.dbId || custId;

                const matchedOrders = allOrders.filter(o =>
                    (custId && (o.userId === custId || o.customerId === custId)) ||
                    (mappedUserId && (o.userId === mappedUserId || o.customerId === mappedUserId))
                );

                matchedOrders.forEach(mo => {
                    if (!orders.some(ord => ord.id === mo.id)) {
                        orders.unshift({
                            id: mo.id,
                            date: PawpalCustomers.formatDate(mo.createdAt),
                            total: Number(mo.total).toLocaleString('vi-VN') + ' đ',
                            payment: (window.PawpalEnum?.paymentStatus(mo.paymentStatus)?.label) || (mo.paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'),
                            paymentClass: (window.PawpalEnum?.paymentStatus(mo.paymentStatus)?.badgeClass) || 'badge-warning',
                            status: (window.PawpalEnum?.orderStatus(mo.status)?.label) || 'Chờ xác nhận',
                            statusClass: (window.PawpalEnum?.orderStatus(mo.status)?.badgeClass) || 'badge-warning'
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
        const bookings = getCust(custId)?.bookings || [];

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
        const complaints = getCust(custId)?.complaints || [];

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
        const content = document.getElementById('customerProfileData');
        const placeholder = document.getElementById('customerProfilePlaceholder');
        const state = PawpalCustomers.state;
        const data = getCust(custId);
        if (!state.hasLoadedCustomers || !data) {
            if (content) content.hidden = true;
            if (placeholder) {
                placeholder.hidden = false;
                const loading = !state.hasLoadedCustomers && state.listLoadStatus !== 'error';
                placeholder.setAttribute('aria-busy', String(loading));
                if (!loading) placeholder.textContent = state.listLoadStatus === 'error'
                    ? 'Không thể tải hồ sơ khách hàng. Vui lòng tải lại trang.'
                    : 'Không tìm thấy hồ sơ khách hàng.';
            }
            PawpalCustomers.updateBreadcrumb(null);
            return;
        }
        if (placeholder) {
            placeholder.hidden = true;
            placeholder.setAttribute('aria-busy', 'false');
        }
        if (content) content.hidden = false;

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
        const phoneDigits = String(data.phone || '').replace(/\D/g, '');
        const hasValidPhone = phoneDigits.length >= 9 && phoneDigits.length <= 11;
        const btnCall = document.querySelector('.drawer-action-buttons a[href^="tel:"]');
        const btnZalo = document.querySelector('.drawer-action-buttons a[href*="zalo.me"]');
        if (btnCall) {
            btnCall.style.display = hasValidPhone ? '' : 'none';
            if (hasValidPhone) btnCall.href = `tel:${phoneDigits}`;
        }
        if (btnZalo) {
            btnZalo.style.display = hasValidPhone ? '' : 'none';
            if (hasValidPhone) btnZalo.href = `https://zalo.me/${phoneDigits}`;
        }

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
            authStatusEl.innerHTML = `<span class="admin-badge ${authBadgeClass}">${data.status === 'LOCKED' ? 'Tài khoản bị khóa' : (data.status === 'TEMP' ? 'Tài khoản tạm' : 'Đang hoạt động')}</span>${hasValidPhone ? '<button type="button" class="admin-btn admin-btn-secondary btn-sm" id="btnResendSmsToken" style="font-size: 11.5px; padding: 3px 8px;">Gửi lại SMS</button>' : ''}`;
            authStatusEl.querySelector('#btnResendSmsToken')?.addEventListener('click', async () => {
                const btn = authStatusEl.querySelector('#btnResendSmsToken');
                if (btn) btn.disabled = true;
                try {
                    const client = PawpalCustomers.getSupabaseClient();
                    if (client) {
                        const { error: notifErr } = await client.from('notification').insert({
                            customer_id: data.dbId || null,
                            notification_type: 'cap_nhat_yeu_cau_ho_tro',
                            title: 'Liên kết tạo mật khẩu Pawpal',
                            content: `Mã xác thực kích hoạt tài khoản Pawpal của bạn đã được gửi đến số ${phoneDigits}.`,
                            is_read: false,
                            sent_at: new Date().toISOString()
                        });
                        if (notifErr) {
                            console.warn('[Customers] Ghi thông báo SMS outbox lỗi:', notifErr);
                        }
                    }
                    PawpalCustomers.showToast(`Đã xếp hàng tin nhắn SMS kích hoạt đến số ${phoneDigits}.`);
                } catch (err) {
                    console.error('[Customers] Lỗi gửi lại SMS:', err);
                    PawpalCustomers.showToast('Không thể gửi SMS lúc này. Vui lòng thử lại sau.', 'danger');
                } finally {
                    if (btn) btn.disabled = false;
                }
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

        // Lazy fetch hồ sơ 360° (Đơn hàng, Lịch hẹn, Khiếu nại)
        if (typeof PawpalCustomers.fetchCustomerProfile360 === 'function') {
            PawpalCustomers.fetchCustomerProfile360(data, { force: true }).then(() => {
                renderDrawerOrders(custId);
                renderDrawerBookings(custId);
                renderDrawerComplaints(custId);
                const bOrd = document.getElementById('badgeCountOrders');
                const bApp = document.getElementById('badgeCountBookings');
                const bCmp = document.getElementById('badgeCountComplaints');
                if (bOrd) {
                    bOrd.textContent = (data.orders || []).length;
                    bOrd.style.display = data.orders?.length > 0 ? 'inline-flex' : 'none';
                }
                if (bApp) {
                    bApp.textContent = (data.bookings || []).length;
                    bApp.style.display = data.bookings?.length > 0 ? 'inline-flex' : 'none';
                }
                if (bCmp) {
                    bCmp.textContent = (data.complaints || []).length;
                    bCmp.style.display = data.complaints?.length > 0 ? 'inline-flex' : 'none';
                }
            });
        }

        // Cập nhật số đếm badge trên các tabs con
        const badgeOrders = document.getElementById('badgeCountOrders');
        const badgeBookings = document.getElementById('badgeCountBookings');
        const badgeComplaints = document.getElementById('badgeCountComplaints');
        if (badgeOrders) {
            badgeOrders.textContent = (data.orders || []).length;
            badgeOrders.style.display = data.orders?.length > 0 ? 'inline-flex' : 'none';
        }
        if (badgeBookings) {
            badgeBookings.textContent = (data.bookings || []).length;
            badgeBookings.style.display = data.bookings?.length > 0 ? 'inline-flex' : 'none';
        }
        if (badgeComplaints) {
            badgeComplaints.textContent = (data.complaints || []).length;
            badgeComplaints.style.display = data.complaints?.length > 0 ? 'inline-flex' : 'none';
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
        const data = getCust(currentId) || {};

        if (document.getElementById('editCustId')) document.getElementById('editCustId').value = currentId;
        if (document.getElementById('editCustFullName')) document.getElementById('editCustFullName').value = data.name || '';
        if (document.getElementById('editCustPhone')) document.getElementById('editCustPhone').value = data.phone || '';
        // Khách vãng lai/tài khoản tạm có thể chưa có số điện thoại; chỉ bắt buộc
        // SĐT đối với hồ sơ thành viên để không chặn việc sửa các trường khác.
        const editPhoneInput = document.getElementById('editCustPhone');
        const editPhoneLabel = editPhoneInput?.closest('.form-group')?.querySelector('label');
        const isTemporaryCustomer = data.status === 'TEMP' || data.isMember === false;
        if (editPhoneInput) {
            editPhoneInput.required = !isTemporaryCustomer;
            editPhoneInput.setCustomValidity('');
        }
        if (editPhoneLabel) {
            editPhoneLabel.innerHTML = isTemporaryCustomer
                ? 'Số điện thoại'
                : 'Số điện thoại <span style="color: #DC2626;">*</span>';
        }
        if (document.getElementById('editCustEmail')) {
            const editableEmail = data.email && !/^(chưa cập nhật|chua cap nhat|null|undefined)$/i.test(String(data.email).trim()) ? data.email : '';
            document.getElementById('editCustEmail').value = editableEmail;
        }
        if (document.getElementById('editCustGender')) document.getElementById('editCustGender').value = data.gender || 'Nam';
        if (document.getElementById('editCustTier')) document.getElementById('editCustTier').value = data.tier || 'GOLD';
        
        const editDobInput = document.getElementById('editCustDob');
        if (editDobInput) {
            editDobInput.value = '';
            const dob = data.dob || data.dobRaw || '';
            if (dob) {
                if (dob.includes('/')) {
                    const parts = dob.split('/');
                    if (parts.length === 3) {
                        editDobInput.value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                    }
                } else if (/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
                    editDobInput.value = dob;
                }
            }
        }

        const existingAddresses = data.addresses || [
            { address: 'Tiếp nhận trực tiếp tại quầy Pawpal Center', isDefault: true }
        ];
        currentEditingAddresses = JSON.parse(JSON.stringify(existingAddresses));
        initialEditingAddressesSnapshot = JSON.stringify(currentEditingAddresses);
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

        const btnSubmitEdit = document.getElementById('btnSubmitEditCustomer');
        if (btnSubmitEdit && formEdit) {
            btnSubmitEdit.addEventListener('click', () => {
                if (formEdit.requestSubmit) formEdit.requestSubmit();
                else formEdit.dispatchEvent(new Event('submit', { cancelable: true }));
            });
        }

            formEdit.addEventListener('submit', async (e) => {
                e.preventDefault();
                const custId = document.getElementById('editCustId')?.value || 'CUST-001';
                const newName = document.getElementById('editCustFullName')?.value || '';
                const newPhone = document.getElementById('editCustPhone')?.value || '';
                const rawEmail = document.getElementById('editCustEmail')?.value || '';
                const newEmail = /^(chưa cập nhật|chua cap nhat|null|undefined)$/i.test(rawEmail.trim()) ? '' : rawEmail.trim();
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
                const addressesChanged = JSON.stringify(validAddresses) !== JSON.stringify(JSON.parse(initialEditingAddressesSnapshot || '[]').filter(a => a.address && a.address.trim() !== ''));

                const custObj = PawpalCustomers.state.customerDatabase?.[custId];
                const custDbId = custObj?.dbId;
                const isTemporaryCustomer = custObj?.status === 'TEMP' || custObj?.isMember === false;
                const phoneDigits = newPhone.replace(/\D/g, '');
                if (!isTemporaryCustomer && (phoneDigits.length < 9 || phoneDigits.length > 11)) {
                    PawpalCustomers.showToast('Vui lòng nhập số điện thoại hợp lệ từ 9 đến 11 số!', 'warning');
                    return;
                }

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    PawpalCustomers.showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                try {
                    if (custDbId) {
                        const { error: customerUpdateError } = await client.from('customer').update({
                            email: newEmail || null,
                            phone_main: newPhone || null
                        }).eq('id', custDbId);
                        if (customerUpdateError) throw customerUpdateError;

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

                        if (addressesChanged) {
                            const { error: addressDeleteError } = await client.from('customer_address').delete().eq('customer_id', custDbId);
                            if (addressDeleteError) throw addressDeleteError;
                            const addrInserts = validAddresses.map(a => ({
                                customer_id: custDbId,
                                receiver_name: newName,
                                receiver_phone: newPhone,
                                street_address: a.address,
                                is_default: !!a.isDefault
                            }));
                            if (addrInserts.length > 0) {
                                const { error: addressInsertError } = await client.from('customer_address').insert(addrInserts);
                                if (addressInsertError) throw addressInsertError;
                            }
                        }

                        // C-08: Lưu hạng thành viên vào customer_membership và đảm bảo điểm sàn của hạng
                        const tierFloors = { 'DIAMOND': 3000, 'GOLD': 1000, 'SILVER': 300, 'MEMBER': 0 };
                        const minFloor = tierFloors[newTier] !== undefined ? tierFloors[newTier] : 0;
                        const currentPts = Number(custObj?.membership?.points || custObj?.points || 0);
                        const finalPts = Math.max(currentPts, minFloor);
                        const { error: memTierError } = await client.from('customer_membership')
                            .upsert({ customer_id: custDbId, total_paw_points: finalPts });
                        // CUS-F03: Ghi nhận vết kiểm toán audit_log có actor và timestamp
                        try {
                            const staffId = sessionStorage.getItem('pawpal_staff_id') || 'd0000000-5555-5555-5555-555555555555';
                            await client.from('audit_log').insert({
                                staff_id: staffId,
                                action: 'UPDATE',
                                entity_name: 'customer_profile',
                                description: `Cập nhật hồ sơ khách hàng: ${newName} (${custId})`,
                                created_at: new Date().toISOString()
                            });
                        } catch (auditErr) {
                            console.warn('[Customers] Ghi nhận audit_log lỗi:', auditErr);
                        }
                    }

                    await PawpalCustomers.loadCustomersModuleData({ force: true });
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

        const btnSubmitAddPet = document.getElementById('btnSubmitAddPet');
        if (btnSubmitAddPet && formAddPet) {
            btnSubmitAddPet.addEventListener('click', () => {
                if (formAddPet.requestSubmit) formAddPet.requestSubmit();
                else formAddPet.dispatchEvent(new Event('submit', { cancelable: true }));
            });
        }

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
                        const genPetCode = 'PET-' + (window.crypto?.randomUUID ? window.crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase() : Date.now().toString(36).toUpperCase());
                        const { error: petErr } = await client.from('pet_profile').insert({
                            customer_id: custDbId,
                            pet_code: genPetCode,
                            pet_name: petName,
                            species: spec,
                            breed: breed || 'Chưa cập nhật',
                            weight: weight ? parseFloat(weight) : null,
                            vaccination_history: vaccine || 'Chưa cập nhật',
                            allergy: (alertNote && alertNote !== 'Bình thường') ? alertNote : 'Không',
                            status: 'ACTIVE'
                        });
                        if (petErr) throw petErr;
                    }

                    await PawpalCustomers.loadCustomersModuleData({ force: true });
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

        const btnSubmitEditPet = document.getElementById('btnSubmitEditPet');
        if (btnSubmitEditPet && formEditPet) {
            btnSubmitEditPet.addEventListener('click', () => {
                if (formEditPet.requestSubmit) formEditPet.requestSubmit();
                else formEditPet.dispatchEvent(new Event('submit', { cancelable: true }));
            });
        }

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

                    await PawpalCustomers.loadCustomersModuleData({ force: true });
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
                    await PawpalCustomers.loadCustomersModuleData({ force: true });
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
