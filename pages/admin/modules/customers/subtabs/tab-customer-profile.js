// tab-customer-profile.js - Subtab Hồ sơ khách hàng 360° Pawpal-er
(function() {
    'use strict';

    const PawpalCustomers = window.PawpalCustomers = window.PawpalCustomers || {};
    PawpalCustomers.subtabs = PawpalCustomers.subtabs || {};

    let currentEditingAddresses = [];
    let initialEditingAddressesSnapshot = '';
    let currentEditingPetCustId = null;
    let currentEditPetIndex = null;
    let relatedDetailListener = null;

    function openRelatedHistory(moduleName, tabId, recordId) {
        if (relatedDetailListener) window.removeEventListener('admin:module-show', relatedDetailListener);
        const open = () => {
            if (moduleName === 'Bán hàng') window.PawpalOrdersModule?.openOrderDetail?.(recordId);
            else window.PawpalServices?.openBookingDetail?.(recordId);
        };
        sessionStorage.setItem('pawpal_admin_active_module', moduleName);
        if (moduleName === 'Bán hàng') {
            sessionStorage.setItem('pawpal_admin_order_selected_id', recordId);
            sessionStorage.setItem('pawpal_admin_order_subtab', tabId);
            if (window.PawpalOrders?.state) window.PawpalOrders.state.selectedOrderId = recordId;
        } else {
            sessionStorage.setItem('pawpal_admin_service_selected_id', recordId);
            sessionStorage.setItem('pawpal_admin_services_active_subtab', tabId);
            if (window.PawpalServices?.state) window.PawpalServices.state.selectedBookingId = recordId;
        }
        const menu = document.querySelector(`.sidebar-menu-btn[data-title="${moduleName}"]`);
        if (menu) {
            relatedDetailListener = event => {
                window.removeEventListener('admin:module-show', relatedDetailListener);
                relatedDetailListener = null;
                if (event.detail?.module === moduleName) open();
            };
            window.addEventListener('admin:module-show', relatedDetailListener);
            menu.click();
        } else {
            open();
            window.location.hash = '#' + tabId;
        }
    }

    function getCust(id) {
        return (PawpalCustomers.getCustomer && PawpalCustomers.getCustomer(id)) || PawpalCustomers.state?.customerDatabase?.[id];
    }

    // Chuyển đổi giữa 5 tabs con trong Drawer Hồ sơ
    function switchDrawerTab(targetPanelId) {
        const drawerTabs = document.querySelectorAll('.drawer-tab-btn');
        const drawerPanels = document.querySelectorAll('.drawer-tab-panel');

        drawerTabs.forEach(t => {
            const selected=t.getAttribute('data-drawertab')===targetPanelId;
            t.classList.toggle('active',selected);t.setAttribute('role','tab');t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;t.id||='profile-tab-'+t.dataset.drawertab;t.setAttribute('aria-controls',t.dataset.drawertab);
        });

        drawerPanels.forEach(panel => {
            panel.classList.toggle('active', panel.id === targetPanelId);
            panel.setAttribute('role','tabpanel');panel.setAttribute('aria-labelledby','profile-tab-'+panel.id);
        });

        sessionStorage.setItem('pawpal_admin_customer_drawertab', targetPanelId);
        const kind = { 'dtab-orders': 'orders', 'dtab-bookings': 'bookings', 'dtab-complaints': 'complaints' }[targetPanelId];
        if (kind && !document.hidden && (!sessionStorage.getItem('pawpal_admin_active_module') || sessionStorage.getItem('pawpal_admin_active_module') === 'Khách hàng') && document.getElementById('subtab-tab-profile')?.classList.contains('active')) {
            const currentCustId = sessionStorage.getItem('pawpal_admin_customer_id');
            const cust = getCust(currentCustId);
            if (cust && typeof PawpalCustomers.fetchCustomerProfile360 === 'function') {
                const render = { orders: renderDrawerOrders, bookings: renderDrawerBookings, complaints: renderDrawerComplaints }[kind];
                const task = PawpalCustomers.fetchCustomerProfile360(cust, { kind, page: cust._historyPages?.[kind] || 1 });
                render(currentCustId);
                task.then(() => {
                    if (sessionStorage.getItem('pawpal_admin_customer_id') !== currentCustId || getCust(currentCustId) !== cust) return;
                    render(currentCustId);
                    updateHistoryBadges(cust);
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
                        <span class="pet-card-name">${esc(pet.name)}</span><span class="pet-profile-code">${esc(pet.id || 'Chưa có mã')}</span>
                        ${pet.status==='inactive'?'<span class="admin-badge badge-neutral">Ngừng theo dõi</span>':''}
                    </div>
                    <div class="pet-card-actions">
                        <button type="button" class="btn-pet-action btn-pet-view-profile admin-btn admin-btn-secondary" data-pet-id="${esc(pet.id || ('PET-' + (idx+1)))}" data-pet-name="${esc(pet.name)}">Xem hồ sơ bé</button>
                        <button type="button" class="btn-pet-action btn-pet-edit" data-cust-id="${esc(custId)}" data-pet-index="${idx}">Sửa</button>
                        <button type="button" class="btn-pet-action btn-pet-delete ${pet.status==='inactive'?'':'is-destructive'}" data-cust-id="${esc(custId)}" data-pet-index="${idx}">${pet.status==='inactive'?'Khôi phục':'Gỡ bé cưng'}</button>
                    </div>
                </div>
                <div class="pet-card-body">
                    <div><span>Loài và giống</span><span>${esc([pet.species,pet.breed].filter(Boolean).join(' · ') || 'Chưa ghi nhận')}</span></div>
                    <div><span>Cân nặng</span><span>${Number(pet.weight)>0&&Number.isFinite(Number(pet.weight)) ? esc(pet.weight) + ' kg' : 'Chưa ghi nhận'}</span></div>
                    <div><span>Cảnh báo an toàn</span><span>${esc(pet.safetyNote || '—')}</span></div><div><span>Dị ứng</span><span>${esc(pet.allergy || '—')}</span></div><div><span>Tập tính</span><span>${esc(pet.routine || '—')}</span></div>
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

        container.querySelectorAll('.btn-pet-delete').forEach(button=>button.addEventListener('click',()=>{
            const id=button.dataset.custId,index=Number(button.dataset.petIndex),customer=getCust(id),pet=customer?.pets[index];if(!pet)return;
            const restore=pet.status==='inactive';
            PawpalCustomers.showCustomerConfirmModal({title:restore?'Khôi phục bé cưng':'Gỡ bé cưng khỏi danh sách',
                message:restore?`Khôi phục theo dõi bé ${pet.name}?`:`Gỡ bé ${pet.name}? Hồ sơ chưa có lịch sử sẽ được xóa. Nếu đã có lịch sử, hệ thống sẽ ngừng theo dõi và giữ nguyên lịch sử.`,
                acceptText:restore?'Khôi phục':'Gỡ bé cưng',onAccept:async()=>{
                    try{
                        const {data,error}=await window.getSupabaseClient().rpc('remove_customer_pet',{p_customer_id:customer.dbId,p_pet_id:pet.dbId,p_expected_updated_at:pet.updatedAt,p_restore:restore});if(error)throw error;
                        await PawpalCustomers.refreshCustomerData();renderDrawerPets(id);
                        PawpalCustomers.showToast(data.result==='deleted'?'Đã xóa hồ sơ chưa có lịch sử.':data.result==='restored'?'Đã khôi phục theo dõi bé cưng.':'Đã ngừng theo dõi bé cưng và giữ nguyên lịch sử.','success');
                    }catch(error){PawpalCustomers.showToast(error.code==='PT409'?'Hồ sơ bé cưng đã thay đổi. Vui lòng làm mới.':'Không thể gỡ hồ sơ bé cưng. Vui lòng thử lại.','warning');}
                }});
        }));
    }

    function historyPage(tbody,items,custId,rerender){
        const cust=getCust(custId),kind=tbody.id.includes('Orders')?'orders':tbody.id.includes('Bookings')?'bookings':'complaints',total=Math.ceil((cust?._historyCounts?.[kind]??items.length)/10),current=cust?._historyPages?.[kind]||1;
        let pager=document.getElementById(tbody.id+'Pager');
        if(!pager){pager=document.createElement('div');pager.id=tbody.id+'Pager';pager.className='admin-pagination-bar';const table=tbody.closest('table');(table.closest('.table-responsive-wrapper') || table).after(pager);}
        pager.innerHTML=total>1?`<div class="pagination-controls"><button type="button" class="pagination-btn" data-page="${current-1}" ${current===1?'disabled':''}>&lt;</button>${Array.from({length:Math.min(total,current+2)-Math.max(1,current-2)+1},(_,n)=>{const i=Math.max(1,current-2)+n-1;return `<button type="button" class="pagination-btn ${i+1===current?'active':''}" data-page="${i+1}">${i+1}</button>`;}).join('')}<button type="button" class="pagination-btn" data-page="${current+1}" ${current===total?'disabled':''}>&gt;</button></div>`:'';
        pager.querySelectorAll('[data-page]').forEach(b=>b.addEventListener('click',()=>{PawpalCustomers.fetchCustomerProfile360(cust,{kind,page:Number(b.dataset.page)}).then(()=>{if(sessionStorage.getItem('pawpal_admin_customer_id')===custId){rerender(custId);updateHistoryBadges(cust);}});rerender(custId);}));
        return items;
    }
    function historyUnavailable(tbody, cust) {
        const kind = tbody.id.includes('Orders') ? 'orders' : tbody.id.includes('Bookings') ? 'bookings' : 'complaints';
        const status = cust?._historyStatus?.[kind] || 'idle';
        if (status !== 'loaded') {
            const message = status === 'error' ? 'Không tải được lịch sử. Vui lòng mở lại tab để thử lại.'
                : status === 'loading' ? 'Đang tải lịch sử...' : 'Chọn tab để tải lịch sử.';
            tbody.innerHTML = `<tr><td colspan="6">${message}</td></tr>`;
            document.getElementById(tbody.id + 'Pager')?.replaceChildren();
            return true;
        }
        return false;
    }

    function updateHistoryBadges(cust) {
        for (const [kind, id] of [['orders', 'badgeCountOrders'], ['bookings', 'badgeCountBookings'], ['complaints', 'badgeCountComplaints']]) {
            const badge = document.getElementById(id);
            if (!badge) continue;
            const count = cust?._historyCounts?.[kind];
            badge.textContent = count === undefined ? '' : String(count);
            badge.style.display = Number(count) > 0 ? 'inline-flex' : 'none';
        }
    }

    function renderDrawerOrders(custId) {
        const tbody = document.getElementById('drawerOrdersTbody');
        if (!tbody) return;
        if(historyUnavailable(tbody,getCust(custId)))return;
        const cust = getCust(custId);
        let orders = [...(cust?.orders || [])];

        if (orders.length === 0) {
            historyPage(tbody,[],custId,renderDrawerOrders);
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Khách hàng chưa có lịch sử mua hàng.</td></tr>`;
            return;
        }

        tbody.innerHTML = historyPage(tbody,orders,custId,renderDrawerOrders).map(ord => `
            <tr>
                <td>
                    <a href="javascript:void(0)" class="user-name-link btn-jump-order-code" data-order-id="${esc(ord.id)}" style="font-weight: 600; color: var(--text-heading); text-decoration: none;">${esc(ord.id)}</a>
                </td>
                <td>${esc(ord.date)}</td>
                <td>${esc(ord.total)}</td>
                <td><span class="admin-badge customer-order-state ${esc(ord.paymentClass || (ord.payment === 'Đã thanh toán' ? 'badge-success' : 'badge-warning'))}">${esc(ord.payment)}</span></td>
                <td><span class="admin-badge customer-order-state ${esc(ord.statusClass)}">${esc(ord.status)}</span></td>
                <td><button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-order-action" data-order-id="${esc(ord.id)}">Xem chi tiết đơn</button></td>
            </tr>
        `).join('');

        const jumpToOrder = (ordId) => {
            openRelatedHistory('Bán hàng', 'tab-order-detail', ordId);
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
        if(historyUnavailable(tbody,getCust(custId)))return;
        const bookings = getCust(custId)?.bookings || [];

        if (bookings.length === 0) {
            historyPage(tbody,[],custId,renderDrawerBookings);
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Khách hàng chưa có lịch hẹn dịch vụ nào.</td></tr>`;
            return;
        }

        tbody.innerHTML = historyPage(tbody,bookings,custId,renderDrawerBookings).map(b => `
            <tr>
                <td><strong>${esc(b.id)}</strong></td>
                <td>${esc(b.date)}</td>
                <td>${esc(b.service)}</td>
                <td>${esc(b.staff)}</td>
                <td><span class="admin-badge ${esc(b.statusClass)}">${esc(b.status)}</span></td>
                <td><button type="button" class="admin-btn admin-btn-secondary btn-sm btn-view-booking-action" data-booking-id="${esc(b.id)}">Xem nhật ký</button></td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-view-booking-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const bId = btn.getAttribute('data-booking-id');
                openRelatedHistory('Dịch vụ', 'tab-service-detail', bId);
            });
        });
    }

    // Render Tab Khiếu nại
    function renderDrawerComplaints(custId) {
        const tbody = document.getElementById('drawerComplaintsTbody');
        if (!tbody) return;
        if(historyUnavailable(tbody,getCust(custId)))return;
        const complaints = getCust(custId)?.complaints || [];

        if (complaints.length === 0) {
            historyPage(tbody,[],custId,renderDrawerComplaints);
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">Khách hàng không có phản ánh hay khiếu nại nào.</td></tr>`;
            return;
        }

        tbody.innerHTML = historyPage(tbody,complaints,custId,renderDrawerComplaints).map(c => `
            <tr>
                <td><strong>${esc(c.id)}</strong></td>
                <td>${esc(c.date)}</td>
                <td>${esc(c.issue)}</td>
                <td><span class="admin-badge badge-danger">${esc(c.level)}</span></td>
                <td><span class="admin-badge ${esc(c.statusClass)}">${esc(c.status)}</span></td>
                <td><button type="button" class="admin-btn admin-btn-primary btn-sm btn-view-ticket-action" data-ticket-id="${esc(c.id)}">Mở phiếu xử lý</button></td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.btn-view-ticket-action').forEach(btn => {
            btn.addEventListener('click', () => {
                const tId = btn.getAttribute('data-ticket-id');
                sessionStorage.setItem('pawpal_admin_ticket_id', tId);
                sessionStorage.setItem('pawpal_admin_complaint_selected_id', tId);
                PawpalCustomers.showToast(`Chuyển đến xử lý phiếu khiếu nại ${tId} tại phân hệ Khiếu nại!`);
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
            headlineTier.className = `admin-badge customer-tier-badge ${data.tierBadgeClass || 'badge-neutral'}`;
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
            if (alertText) {
                const ticket=data.complaints?.find(item=>!item.isClosed);
                const summary=ticket?PawpalCustomers.ticketSummary(ticket):null;
                alertText.textContent=summary?'• '+summary.issue+' · '+summary.meta:data.emergencyAlert;
                alertText.title=summary?.fullText||data.emergencyAlert;
            }
        } else {
            if (banner) banner.style.display = 'none';
        }

        // Tab 1: Cá nhân
        if (document.getElementById('profileValCustId')) document.getElementById('profileValCustId').textContent = data.id;
        if (document.getElementById('profileValFullName')) document.getElementById('profileValFullName').textContent = data.name;
        if (document.getElementById('profileValPhone')) document.getElementById('profileValPhone').textContent = data.phone+(data.phoneUnverified?' · Chưa xác minh':'');
        const displayOptional = (value, fallback = 'Chưa cập nhật') => {
            const normalized = value === null || value === undefined || String(value).trim().toLowerCase() === 'null' || String(value).trim().toLowerCase() === 'undefined' ? '' : String(value).trim();
            return normalized || fallback;
        };
        if (document.getElementById('profileValEmail')) document.getElementById('profileValEmail').textContent = displayOptional(data.email);
        if (document.getElementById('profileValGender')) document.getElementById('profileValGender').textContent = displayOptional(data.gender);
        if (document.getElementById('profileValDob')) document.getElementById('profileValDob').textContent = data.dob || 'Chưa cập nhật';
        if (document.getElementById('drawerCustNote')) document.getElementById('drawerCustNote').value = data.note || '';
        const noteRead=document.getElementById('customerNoteReadView');if(noteRead)noteRead.textContent=data.note||'Chưa có ghi chú';
        const noteEditor=document.getElementById('customerNoteEditor');if(noteEditor)noteEditor.hidden=true;
        const noteEdit=document.getElementById('customerNoteEdit');if(noteEdit)noteEdit.hidden=false;
        const authStatusEl = document.getElementById('profileValAuthStatus');
        if (authStatusEl) {
            const authBadgeClass = data.status === 'LOCKED' ? 'badge-danger' : (data.status === 'TEMP' ? 'badge-warning' : 'badge-success');
            authStatusEl.innerHTML = `<span class="admin-badge ${authBadgeClass}">${data.status === 'LOCKED' ? 'Hồ sơ đã khóa' : 'Hồ sơ đang hoạt động'}</span><span style="margin-left:8px">${PawpalCustomers.escapeHtml(data.customerTypeLabel || 'Chưa xác định loại khách')}</span>`;
        }

        // Sổ địa chỉ
        renderDrawerAddresses(custId);

        if (document.getElementById('drawerCustNote')) document.getElementById('drawerCustNote').dataset.version = data.updatedAt;

        // Tab 2: Thú cưng
        renderDrawerPets(custId);

        // Tab 3: Đơn hàng
        renderDrawerOrders(custId);

        // Tab 4: Lịch hẹn
        renderDrawerBookings(custId);

        // Tab 5: Khiếu nại
        renderDrawerComplaints(custId);

        // Only the visible history tab loads rows; personal details need no history request.
        updateHistoryBadges(data);
        if (document.getElementById('subtab-tab-profile')?.classList.contains('active')) {
            switchDrawerTab(sessionStorage.getItem('pawpal_admin_customer_drawertab') || 'dtab-personal');
        }

        PawpalCustomers.updateBreadcrumb(data.name);
    }

    // V1 address fields stay separate; existing IDs and postal codes are retained.
    let editingCustomerSnapshot = null;
    function updateAddressValuesFromDOM() {
        document.querySelectorAll('#editCustAddressList .address-row-card').forEach((card,index) => {
            for (const key of ['receiverName','receiverPhone','streetAddress','province','postalCode']) {
                currentEditingAddresses[index][key] = card.querySelector(`[data-field="${key}"]`).value.trim();
            }
        });
    }
    function renderModalAddressList() {
        const container=document.getElementById('editCustAddressList');
        if (currentEditingAddresses.length && !currentEditingAddresses.some(a=>a.isDefault)) currentEditingAddresses[0].isDefault=true;
        container.innerHTML=currentEditingAddresses.map((a,index)=>`
            <div class="address-row-card ${a.isDefault?'is-default':''}" data-index="${index}">
                <div class="address-row-meta">
                    <label class="address-radio-label"><input type="radio" name="default_address_radio" value="${index}" ${a.isDefault?'checked':''}><span class="default-badge">${a.isDefault?'Địa chỉ mặc định':'Đặt làm mặc định'}</span></label>
                    <button type="button" class="btn-remove-address" data-index="${index}">Xóa</button>
                </div>
                <div class="form-row-two-col">
                    <div><label class="form-label">Người nhận <span style="color:#DC2626">*</span></label><input class="admin-input" data-field="receiverName" value="${esc(a.receiverName)}"></div>
                    <div><label class="form-label">Số điện thoại người nhận <span style="color:#DC2626">*</span></label><input type="tel" class="admin-input" data-field="receiverPhone" value="${esc(a.receiverPhone)}"></div>
                </div>
                <label class="form-label">Địa chỉ chi tiết <span style="color:#DC2626">*</span></label><input class="admin-input address-input-val" data-field="streetAddress" value="${esc(a.streetAddress)}">
                <div class="form-row-two-col">
                    <div><label class="form-label">Tỉnh hoặc thành phố <span style="color:#DC2626">*</span></label><input class="admin-input" data-field="province" value="${esc(a.province)}"></div>
                    <div><label class="form-label">Mã bưu chính</label><input class="admin-input" data-field="postalCode" value="${esc(a.postalCode)}"></div>
                </div>
                <div class="edit-address-error" style="color:#DC2626;font-size:12px" role="alert"></div>
            </div>`).join('') || '<p>Chưa có địa chỉ nhận hàng.</p>';
        container.querySelectorAll('[name="default_address_radio"]').forEach(r=>r.addEventListener('change',()=>{
            updateAddressValuesFromDOM(); currentEditingAddresses.forEach((a,i)=>a.isDefault=i===Number(r.value)); renderModalAddressList();
        }));
        container.querySelectorAll('.btn-remove-address').forEach(b=>b.addEventListener('click',()=>{
            updateAddressValuesFromDOM(); currentEditingAddresses.splice(Number(b.dataset.index),1); renderModalAddressList();
        }));
    }
    const modalEdit=document.getElementById('modalEditCustomer');
    function openEditCustomerModal(custId) {
        const data=getCust(custId || document.getElementById('profileValCustId')?.textContent);
        if (!modalEdit || !data?.dbId) return;
        editingCustomerSnapshot={...data};
        const values={editCustId:data.id,editCustFullName:data.fullNameRaw || '',editCustPhone:data.phone==='—'?'':data.phone,
            editCustEmail:data.email==='Chưa cập nhật'?'':data.email,editCustGender:data.genderRaw || '',editCustDob:data.dobRaw || ''};
        const genders={nam:'MALE',nữ:'FEMALE',nu:'FEMALE',male:'MALE',female:'FEMALE',other:'OTHER',khac:'OTHER','khác':'OTHER'};
        values.editCustGender=genders[String(values.editCustGender).toLowerCase()] || '';
        for (const [id,value] of Object.entries(values)) {
            const input=document.getElementById(id); input.value=value; input.setCustomValidity(''); input.removeAttribute('aria-invalid');
        }
        document.querySelectorAll('#modalEditCustomer .edit-field-error').forEach(e=>e.textContent='');
        const tier=document.getElementById('editCustTier');
        tier.innerHTML='<option value="">Chưa có hạng</option>'+(PawpalCustomers.state.membershipTiers || []).map(t=>`<option value="${esc(t.id)}">${esc(t.tier_name)}</option>`).join('');
        if(data.membershipTierId && !Array.from(tier.options).some(o=>o.value===data.membershipTierId)) {
            tier.insertAdjacentHTML('beforeend',`<option value="${esc(data.membershipTierId)}">${esc(data.tierName)}</option>`);
        }
        tier.value=data.membershipTierId || '';
        const phone=document.getElementById('editCustPhone'); phone.required=Boolean(values.editCustPhone);
        let contactNote=document.getElementById('editCustPhoneSource');
        if(!contactNote){contactNote=document.createElement('p');contactNote.id='editCustPhoneSource';contactNote.className='text-muted';contactNote.style.cssText='font-size:11.5px;margin:4px 0 0';phone.after(contactNote);}
        contactNote.textContent=data.phoneUnverified?'Khách tự cung cấp, chưa xác minh.':'';contactNote.hidden=!data.phoneUnverified;
        phone.closest('.form-group').querySelector('label').innerHTML='Số điện thoại'+(phone.required?' <span style="color:#DC2626">*</span>':'');
        currentEditingAddresses=(data.addresses || []).map(a=>({...a}));
        initialEditingAddressesSnapshot=JSON.stringify(currentEditingAddresses);
        renderModalAddressList(); modalEdit.style.display='flex';
    }

    function closeEditModal() {
        if (modalEdit) modalEdit.style.display = 'none';
    }

    // Modal Thêm Thú cưng
    const modalAddPet = document.getElementById('modalAddPet');
    let addPetTaxonomy, addingPetCustomer;
    function openAddPetModal() {
        addingPetCustomer=getCust(document.getElementById('profileValCustId')?.textContent);
        if(!modalAddPet || !addingPetCustomer?.dbId)return;
        document.getElementById('formAddPet').reset();addPetTaxonomy?.reset();
        ['Name','Species','Breed','Weight','Allergy','Routine','Alert'].forEach(key=>PawpalCustomers.setFieldError('addPet'+key,''));
        modalAddPet.style.display='flex';
    }
    function closeAddPetModal() {
        if (modalAddPet) modalAddPet.style.display = 'none';
    }

    // Modal Sửa Thú cưng
    const modalEditPet = document.getElementById('modalEditPet');
    let editPetTaxonomy, editingPetSnapshot;
    async function openEditPetModal(custId,petIndex){
        if(PawpalCustomers.state.listLoadStatus==='loading'){PawpalCustomers.showToast('Đang cập nhật hồ sơ. Vui lòng đợi một chút.','warning');return;}
        const customer=getCust(custId),pet=customer?.pets[petIndex];if(!pet || !modalEditPet)return;
        currentEditingPetCustId=custId;currentEditPetIndex=petIndex;editingPetSnapshot={...pet,customerDbId:customer.dbId};
        document.getElementById('formEditPet').reset();editPetTaxonomy.reset();
        const values={Name:pet.name,Weight:Number.isFinite(Number(pet.weight))?pet.weight:'',Allergy:pet.allergy || '',Routine:pet.routine || '',Alert:pet.safetyNote || ''};
        for(const [key,value] of Object.entries(values))document.getElementById('editPet'+key).value=value;
        ['Name','Species','Breed','Weight','Allergy','Routine','Alert'].forEach(key=>PawpalCustomers.setFieldError('editPet'+key,''));
        modalEditPet.style.display='flex';
        const snapshot=editingPetSnapshot;
        try{await editPetTaxonomy.set(pet,()=>editingPetSnapshot===snapshot);}catch{PawpalCustomers.showToast('Không thể tải danh mục loài và giống. Hãy thử lại.','warning');}
    }
    function closeEditPetModal() {
        if (modalEditPet) modalEditPet.style.display = 'none';
    }

    function initProfileTab() {
        // Drawer Subtabs switching
        const drawerTabs = document.querySelectorAll('.drawer-tab-btn');
        document.querySelector('.drawer-subtabs-bar')?.setAttribute('role','tablist');
        drawerTabs.forEach(tab => {
            tab.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const tabs=[...drawerTabs],index=tabs.indexOf(tab),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;switchDrawerTab(tabs[next].dataset.drawertab);tabs[next].focus();};
            tab.addEventListener('click', () => {
                const targetPanelId = tab.getAttribute('data-drawertab');
                switchDrawerTab(targetPanelId);
            });
        });
        const selectedTab=[...drawerTabs].find(tab=>tab.classList.contains('active'))||drawerTabs[0];
        if(selectedTab){drawerTabs.forEach(tab=>{tab.setAttribute('role','tab');tab.setAttribute('aria-selected',String(tab===selectedTab));tab.tabIndex=tab===selectedTab?0:-1;});}
        const actions=document.querySelector('.drawer-action-buttons');
        if(actions&&!document.getElementById('customerCopyPhone')){const copy=document.createElement('button');copy.type='button';copy.id='customerCopyPhone';copy.className='action-btn-pill';copy.textContent='Sao chép số';copy.onclick=async()=>{const id=document.getElementById('profileValCustId')?.textContent,cust=getCust(id);if(!cust?.phone)return PawpalCustomers.showToast('Khách chưa có số điện thoại.','warning');try{await navigator.clipboard.writeText(cust.phone);PawpalCustomers.showToast('Đã sao chép số điện thoại.','success');}catch{PawpalCustomers.showToast('Không thể sao chép. Vui lòng chọn số trong hồ sơ.','warning');}};actions.append(copy);}

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
                currentEditingAddresses.push({ receiverName: document.getElementById('editCustFullName').value.trim(), receiverPhone: document.getElementById('editCustPhone').value.trim(), streetAddress: '', province: '', postalCode: '', isDefault: isFirst });
                renderModalAddressList();
                setTimeout(() => {
                    const inputs = document.querySelectorAll('#editCustAddressList .address-input-val');
                    if (inputs.length > 0) inputs[inputs.length - 1].focus();
                }, 50);
            });
        }

        if (formEdit) {
            const saveButton=document.getElementById('btnSubmitEditCustomer');
            let saving=false;
            const fieldError=(id,message)=>{
                const input=document.getElementById(id); let error=document.getElementById(id+'Error');
                if(!error){error=document.createElement('div');error.id=id+'Error';error.className='edit-field-error';error.style.cssText='color:#DC2626;font-size:12px;margin-top:4px';input.parentElement.appendChild(error);}
                error.textContent=message;input.setAttribute('aria-invalid',String(Boolean(message)));input.setAttribute('aria-describedby',error.id);
            };
            const fieldIds=['editCustFullName','editCustPhone','editCustEmail','editCustGender','editCustDob','editCustTier'];
            fieldIds.forEach(id=>document.getElementById(id).addEventListener('input',()=>fieldError(id,'')));
            async function saveProfile(){
                if(saving || !editingCustomerSnapshot) return;
                const value=id=>document.getElementById(id).value.trim();
                const name=value('editCustFullName').replace(/\s+/g,' '),phone=value('editCustPhone'),email=value('editCustEmail');
                const gender=value('editCustGender'),dob=value('editCustDob'),tier=value('editCustTier');
                const errors={};
                if(name.length<2 || name.length>200) errors.editCustFullName='Họ tên cần từ 2 đến 200 ký tự.';
                const previousPhone=editingCustomerSnapshot.phone==='—'?'':editingCustomerSnapshot.phone;
                if((previousPhone && !phone) || (phone!==previousPhone && phone && !/^0[0-9]{9}$/.test(phone))) errors.editCustPhone='Nhập số điện thoại gồm 10 chữ số, bắt đầu bằng 0.';
                if(email && (email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) errors.editCustEmail='Nhập email liên hệ hợp lệ.';
                const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
                if(dob && dob>today) errors.editCustDob='Ngày sinh không được ở tương lai.';
                updateAddressValuesFromDOM();
                const addressesChanged=JSON.stringify(currentEditingAddresses)!==initialEditingAddressesSnapshot;
                let invalidAddress=false;
                document.querySelectorAll('#editCustAddressList .address-row-card').forEach((card,index)=>{
                    const a=currentEditingAddresses[index];
                    const bad=addressesChanged && ['receiverName','receiverPhone','streetAddress','province'].some(key=>!a[key]?.trim());
                    card.querySelector('.edit-address-error').textContent=bad?'Nhập đủ người nhận, số điện thoại, địa chỉ và tỉnh/thành.':'';
                    invalidAddress ||= bad;
                });
                fieldIds.forEach(id=>fieldError(id,errors[id] || ''));
                if(Object.keys(errors).length || invalidAddress){document.getElementById(Object.keys(errors)[0])?.focus();return;}
                saving=true;saveButton.disabled=true;saveButton.textContent='Đang lưu';
                try{
                    const {error}=await window.getSupabaseClient().rpc('update_customer_profile',{
                        p_customer_id:editingCustomerSnapshot.dbId,p_expected_updated_at:editingCustomerSnapshot.updatedAt,
                        p_full_name:name,p_phone:phone || null,p_email:email || null,p_gender:gender || null,p_date_of_birth:dob || null,
                        p_tier_id:tier || null,p_addresses:addressesChanged?currentEditingAddresses.map(a=>({id:a.rawId || null,receiver_name:a.receiverName,receiver_phone:a.receiverPhone,street_address:a.streetAddress,province:a.province,postal_code:a.postalCode || null,is_default:a.isDefault})):null
                    });
                    if(error){
                        if(error.message?.includes('customer_phone_exists')){fieldError('editCustPhone','Số điện thoại đã thuộc về khách khác.');return;}
                        if(error.code==='PT409' || error.message?.includes('customer_profile_changed')){PawpalCustomers.showToast('Hồ sơ đã được cập nhật ở nơi khác. Hãy đóng form, làm mới rồi mở lại để sửa.','warning');return;}
                        throw error;
                    }
                    const custId=editingCustomerSnapshot.id;
                    closeEditModal();await PawpalCustomers.refreshCustomerData({ledger:true});
                    renderDrawerCustomerProfile(custId);
                    PawpalCustomers.showToast(PawpalCustomers.state.listLoadStatus==='error'?'Đã lưu hồ sơ nhưng chưa tải lại được danh sách.':'Đã cập nhật hồ sơ khách hàng.',PawpalCustomers.state.listLoadStatus==='error'?'warning':'success');
                }catch(error){console.error('[Customers] V1 profile update failed:',error.code || 'connection');PawpalCustomers.showToast('Chưa thể lưu hồ sơ. Vui lòng kiểm tra kết nối và thử lại.','danger');}
                finally{saving=false;saveButton.disabled=false;saveButton.textContent='Lưu thay đổi';}
            }
            saveButton.addEventListener('click',saveProfile);
            formEdit.addEventListener('submit',e=>{e.preventDefault();saveProfile();});
        }

        // Modal Thêm Pet
        const btnOpenAddPet = document.getElementById('btnOpenAddPetModal');
        const btnCloseAddPet = document.getElementById('btnCloseAddPet');
        const btnCancelAddPet = document.getElementById('btnCancelAddPet');
        const formAddPet = document.getElementById('formAddPet');

        if (btnOpenAddPet) btnOpenAddPet.addEventListener('click', openAddPetModal);
        if (btnCloseAddPet) btnCloseAddPet.addEventListener('click', closeAddPetModal);
        if (btnCancelAddPet) btnCancelAddPet.addEventListener('click', closeAddPetModal);

        addPetTaxonomy=PawpalCustomers.bindPetTaxonomy('addPet');
        let petAdding=false;
        async function saveAddedPet(){
            if(petAdding || !addingPetCustomer?.dbId)return;
            const value=key=>document.getElementById('addPet'+key).value.trim();
            const errors={},name=value('Name'),weight=value('Weight');
            if(!name || name.length>200)errors.Name='Nhập tên bé cưng, tối đa 200 ký tự.';
            if(!addPetTaxonomy.speciesId())errors.Species='Chọn loài trong danh mục.';
            if(!addPetTaxonomy.breedId())errors.Breed='Chọn giống thuộc loài đã chọn.';
            if(weight && (!Number.isFinite(Number(weight)) || Number(weight)<=0 || Number(weight)>1000))errors.Weight='Cân nặng phải lớn hơn 0 và không quá 1.000 kg.';
            for(const key of ['Allergy','Routine','Alert'])if(value(key).length>2000)errors[key]='Nội dung tối đa 2.000 ký tự.';
            ['Name','Species','Breed','Weight','Allergy','Routine','Alert'].forEach(key=>PawpalCustomers.setFieldError('addPet'+key,errors[key] || ''));
            if(Object.keys(errors).length)return;
            const payload={p_customer_id:addingPetCustomer.dbId,p_name:name,p_breed_id:addPetTaxonomy.breedId(),p_weight:weight?Number(weight):null,p_safety_note:value('Alert') || null,p_allergy:value('Allergy') || null,p_routine:value('Routine') || null};
            const signature=JSON.stringify(payload);let pending;
            try{pending=JSON.parse(sessionStorage.getItem('pawpal_customer_pet_request') || 'null');}catch{}
            if(pending?.signature!==signature)pending={signature,id:crypto.randomUUID()};
            sessionStorage.setItem('pawpal_customer_pet_request',JSON.stringify(pending));
            const button=document.getElementById('btnSubmitAddPet');petAdding=true;button.disabled=true;button.textContent='Đang lưu';
            try{
                const {error}=await window.getSupabaseClient().rpc('add_customer_pet',{...payload,p_pet_id:pending.id});if(error)throw error;
                sessionStorage.removeItem('pawpal_customer_pet_request');closeAddPetModal();
                const id=addingPetCustomer.id;await PawpalCustomers.refreshCustomerData();renderDrawerPets(id);
                PawpalCustomers.showToast('Đã lưu bé cưng vào hồ sơ khách hàng.','success');
            }catch(error){PawpalCustomers.showToast('Chưa xác nhận được lần lưu. Bạn có thể lưu lại cùng nội dung để kiểm tra, hệ thống không tạo trùng.','warning');}
            finally{petAdding=false;button.disabled=false;button.textContent='Lưu bé cưng';}
        }
        document.getElementById('btnSubmitAddPet')?.addEventListener('click',saveAddedPet);
        formAddPet?.addEventListener('submit',e=>{e.preventDefault();saveAddedPet();});

        // Modal Sửa Pet
        const btnCloseEditPet = document.getElementById('btnCloseEditPet');
        const btnCancelEditPet = document.getElementById('btnCancelEditPet');
        const formEditPet = document.getElementById('formEditPet');

        if (btnCloseEditPet) btnCloseEditPet.addEventListener('click', closeEditPetModal);
        if (btnCancelEditPet) btnCancelEditPet.addEventListener('click', closeEditPetModal);

        editPetTaxonomy=PawpalCustomers.bindPetTaxonomy('editPet');
        let petEditing=false;
        async function saveEditedPet(){
            if(petEditing || !editingPetSnapshot)return;
            const value=key=>document.getElementById('editPet'+key).value.trim();
            const name=value('Name'),weight=value('Weight'),errors={};
            if(!name || name.length>200)errors.Name='Nhập tên bé cưng, tối đa 200 ký tự.';
            if(!editPetTaxonomy.speciesId())errors.Species='Chọn loài trong danh mục.';
            if(!editPetTaxonomy.breedId())errors.Breed='Chọn giống thuộc loài đã chọn.';
            if(weight && (!Number.isFinite(Number(weight)) || Number(weight)<=0 || Number(weight)>1000))errors.Weight='Cân nặng phải lớn hơn 0 và không quá 1.000 kg.';
            for(const key of ['Allergy','Routine','Alert'])if(value(key).length>2000)errors[key]='Nội dung tối đa 2.000 ký tự.';
            ['Name','Species','Breed','Weight','Allergy','Routine','Alert'].forEach(key=>PawpalCustomers.setFieldError('editPet'+key,errors[key] || ''));
            if(Object.keys(errors).length)return;
            const button=document.getElementById('btnSubmitEditPet');petEditing=true;button.disabled=true;button.textContent='Đang lưu';
            try{
                const {error}=await window.getSupabaseClient().rpc('update_customer_pet',{
                    p_customer_id:editingPetSnapshot.customerDbId,p_pet_id:editingPetSnapshot.dbId,p_expected_updated_at:editingPetSnapshot.updatedAt,
                    p_name:name,p_breed_id:editPetTaxonomy.breedId(),p_weight:weight?Number(weight):null,
                    p_safety_note:value('Alert') || null,p_allergy:value('Allergy') || null,p_routine:value('Routine') || null
                });
                if(error)throw error;
                closeEditPetModal();await PawpalCustomers.refreshCustomerData();renderDrawerPets(currentEditingPetCustId);
                PawpalCustomers.showToast('Đã cập nhật bé cưng.','success');
            }catch(error){PawpalCustomers.showToast(error.code==='PT409'?'Hồ sơ bé cưng đã thay đổi. Hãy đóng form và mở lại sau khi làm mới.':'Không thể lưu bé cưng. Vui lòng thử lại.','warning');}
            finally{petEditing=false;button.disabled=false;button.textContent='Lưu cập nhật';}
        }
        document.getElementById('btnSubmitEditPet')?.addEventListener('click',saveEditedPet);
        formEditPet?.addEventListener('submit',e=>{e.preventDefault();saveEditedPet();});

        // Notes use the version displayed with the profile, not an inferred customer.
        const btnSaveNote=document.getElementById('btnSaveCustomerNote');
        const editNote=document.getElementById('customerNoteEdit'),cancelNote=document.getElementById('customerNoteCancel'),noteEditor=document.getElementById('customerNoteEditor');
        if(editNote)editNote.onclick=()=>{noteEditor.hidden=false;editNote.hidden=true;document.getElementById('drawerCustNote')?.focus();};
        if(cancelNote)cancelNote.onclick=()=>{noteEditor.hidden=true;editNote.hidden=false;document.getElementById('drawerCustNote').value=document.getElementById('customerNoteReadView').textContent==='Chưa có ghi chú'?'':document.getElementById('customerNoteReadView').textContent;};
        btnSaveNote?.addEventListener('click',async()=>{
            if(btnSaveNote.disabled)return;
            const input=document.getElementById('drawerCustNote');
            const cust=getCust(document.getElementById('profileValCustId')?.textContent);
            if(!cust?.dbId)return;
            btnSaveNote.disabled=true;
            input.readOnly=true;if(cancelNote)cancelNote.disabled=true;
            try{
                const {error}=await window.getSupabaseClient().rpc('save_customer_note',{p_customer_id:cust.dbId,p_expected_updated_at:input.dataset.version,p_note:input.value});
                if(error)throw error;
                await PawpalCustomers.refreshCustomerData();renderDrawerCustomerProfile(cust.id);
                PawpalCustomers.showToast('Đã lưu ghi chú khách hàng.','success');
            }catch(error){PawpalCustomers.showToast(error.code==='PT409'?'Hồ sơ đã thay đổi. Vui lòng làm mới trước khi lưu ghi chú.':'Không thể lưu ghi chú. Vui lòng thử lại.','warning');}
            finally{btnSaveNote.disabled=false;input.readOnly=false;if(cancelNote)cancelNote.disabled=false;}
        });

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
