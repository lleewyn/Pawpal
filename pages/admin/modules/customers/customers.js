// customers.js - Phân hệ Quản lý Khách hàng Pawpal-er
(function() {
    function initCustomersModule() {
        const subtabsContainer = document.getElementById('headerSubtabsGroup');
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        const moduleTitleEl = document.getElementById('headerModuleTitle');

        if (moduleTitleEl) {
            moduleTitleEl.textContent = '';
            moduleTitleEl.style.display = 'none';
        }

        // 1. Render 3 Sub-tabs trực tiếp lên Header Bar (thuần chữ, không icon, phân tách bằng |)
        if (subtabsContainer) {
            subtabsContainer.innerHTML = `
                <button type="button" class="header-subtab-btn active" data-subtab="tab-list">Khách hàng</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-profile">Hồ sơ</button>
                <span class="header-subtab-divider">|</span>
                <button type="button" class="header-subtab-btn" data-subtab="tab-pawpoint">Pawpoint</button>
            `;
        }

        // 2. Chuyển đổi giữa 3 Sub-tabs khi bấm nút trên Header Bar
        const headerSubtabBtns = document.querySelectorAll('.header-subtab-btn');
        const subtabPanels = document.querySelectorAll('.subtab-content');

        function updateBreadcrumb(custName) {
            if (!deepBreadcrumbEl) return;
            if (custName) {
                deepBreadcrumbEl.innerHTML = `
                    <span class="breadcrumb-separator">/</span>
                    <span class="breadcrumb-detail-name">${custName}</span>
                `;
            } else {
                deepBreadcrumbEl.innerHTML = '';
            }
        }

        function switchSubtab(targetSubtab) {
            headerSubtabBtns.forEach(btn => {
                if (btn.getAttribute('data-subtab') === targetSubtab) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            subtabPanels.forEach(panel => {
                if (panel.id === `subtab-${targetSubtab}`) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });

            // Khi ở tab Hồ sơ, luôn hiển thị đường dẫn tinh gọn / [Tên khách hàng]
            if (targetSubtab === 'tab-profile') {
                const currentName = sessionStorage.getItem('pawpal_admin_customer_name') || 
                                    document.getElementById('drawerCustomerName')?.textContent?.trim() || 
                                    'Nguyễn Văn An';
                updateBreadcrumb(currentName);
            } else {
                updateBreadcrumb(null);
            }

            // Lưu trạng thái subtab để khi reload trang vẫn giữ nguyên
            sessionStorage.setItem('pawpal_admin_customer_subtab', targetSubtab);
            try {
                history.replaceState(null, '', '#' + targetSubtab);
            } catch (e) {}

            if (window.lucide) lucide.createIcons();
        }

        headerSubtabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetSubtab = btn.getAttribute('data-subtab');
                switchSubtab(targetSubtab);
            });
        });

        // 3. Chuyển đổi giữa 5 tabs con trong Drawer Hồ sơ
        const drawerTabs = document.querySelectorAll('.drawer-tab-btn');
        const drawerPanels = document.querySelectorAll('.drawer-tab-panel');

        function switchDrawerTab(targetPanelId) {
            drawerTabs.forEach(t => {
                if (t.getAttribute('data-drawertab') === targetPanelId) {
                    t.classList.add('active');
                } else {
                    t.classList.remove('active');
                }
            });

            drawerPanels.forEach(panel => {
                if (panel.id === targetPanelId) {
                    panel.classList.add('active');
                } else {
                    panel.classList.remove('active');
                }
            });

            sessionStorage.setItem('pawpal_admin_customer_drawertab', targetPanelId);
            if (window.lucide) lucide.createIcons();
        }

        drawerTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetPanelId = tab.getAttribute('data-drawertab');
                switchDrawerTab(targetPanelId);
            });
        });

        // 4. Mở Hồ sơ khi click vào Họ tên hoặc nút Xem trong dropdown
        document.querySelectorAll('.btn-open-profile-drawer').forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                const custId = trigger.getAttribute('data-id');
                const row = trigger.closest('tr');
                const custName = row?.querySelector('.user-name-link')?.textContent?.trim() || 
                                 row?.querySelector('.user-name-cell')?.textContent?.trim() || custId;

                // Đóng tất cả dropdown nếu đang mở
                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
                document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));

                sessionStorage.setItem('pawpal_admin_customer_id', custId);
                sessionStorage.setItem('pawpal_admin_customer_name', custName);

                // Kích hoạt sub-tab Hồ sơ trên Header Bar (sẽ tự động gọi updateBreadcrumb(custName))
                switchSubtab('tab-profile');

                const headlineName = document.getElementById('drawerCustomerName');
                if (headlineName) headlineName.textContent = custName;
                if (custId) {
                    const custIdEl = document.getElementById('profileValCustId');
                    if (custIdEl) custIdEl.textContent = custId;
                    const phone = row?.querySelectorAll('td')[2]?.textContent?.trim() || '';
                    const email = row?.querySelector('.user-sub-cell')?.textContent?.trim() || '';
                    if (document.getElementById('profileValFullName')) document.getElementById('profileValFullName').textContent = custName;
                    if (phone && document.getElementById('profileValPhone')) document.getElementById('profileValPhone').textContent = phone;
                    if (email && document.getElementById('profileValEmail')) document.getElementById('profileValEmail').textContent = email;
                    renderDrawerAddresses(custId);
                }
            });
        });

        // 5. Đóng/Mở menu tác vụ 3 chấm (...)
        document.querySelectorAll('.btn-action-more').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const menu = btn.nextElementSibling;
                const isShown = menu?.classList.contains('show');

                // Đóng dropdown khác
                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
                document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));

                if (!isShown && menu) {
                    menu.classList.add('show');
                    btn.classList.add('active');
                }
            });
        });

        // Bấm ra ngoài tự động đóng menu 3 chấm
        document.addEventListener('click', () => {
            document.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
            document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));
        });

        // 6. Modal Tiếp nhận tại quầy (Quick Add)
        const modalAdd = document.getElementById('modalAddCustomer');
        const btnOpenAdd = document.getElementById('btnOpenAddCustomerModal');
        const btnCloseAdd = document.getElementById('btnCloseAddCustomer');
        const btnCancelAdd = document.getElementById('btnCancelAddCustomer');
        const formAdd = document.getElementById('formAddCustomerQuick');

        if (btnOpenAdd && modalAdd) {
            btnOpenAdd.addEventListener('click', () => {
                modalAdd.style.display = 'flex';
            });
        }
        function closeAddModal() {
            if (modalAdd) modalAdd.style.display = 'none';
        }
        if (btnCloseAdd) btnCloseAdd.addEventListener('click', closeAddModal);
        if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeAddModal);
        if (formAdd) {
            formAdd.addEventListener('submit', (e) => {
                e.preventDefault();
                alert('Đã tạo thành công tài khoản tạm cho khách hàng tại quầy!');
                formAdd.reset();
                closeAddModal();
            });
        }

        // 7. Modal Điều chỉnh Pawpoint
        const modalAdjust = document.getElementById('modalAdjustPoints');
        const btnOpenAdjust = document.getElementById('btnOpenAdjustPointsModal');
        const btnCloseAdjust = document.getElementById('btnCloseAdjustPoints');
        const btnCancelAdjust = document.getElementById('btnCancelAdjustPoints');
        const formAdjust = document.getElementById('formAdjustPoints');

        if (btnOpenAdjust && modalAdjust) {
            btnOpenAdjust.addEventListener('click', () => {
                modalAdjust.style.display = 'flex';
            });
        }
        function closeAdjustModal() {
            if (modalAdjust) modalAdjust.style.display = 'none';
        }
        if (btnCloseAdjust) btnCloseAdjust.addEventListener('click', closeAdjustModal);
        if (btnCancelAdjust) btnCancelAdjust.addEventListener('click', closeAdjustModal);
        if (formAdjust) {
            formAdjust.addEventListener('submit', (e) => {
                e.preventDefault();
                alert('Đã cập nhật bù điểm Pawpoint thành công!');
                formAdjust.reset();
                closeAdjustModal();
            });
        }

        // 8. Tác vụ Khóa / Mở khóa tài khoản từ menu 3 chấm
        document.querySelectorAll('.btn-lock-user, .btn-unlock-user').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const row = btn.closest('tr');
                const badge = row?.querySelector('.admin-badge.badge-success, .admin-badge.badge-danger, .admin-badge.badge-warning');
                const isLock = btn.classList.contains('btn-lock-user');

                if (isLock && badge) {
                    row.classList.add('row-locked');
                    badge.className = 'admin-badge badge-danger';
                    badge.textContent = 'Bị khóa';
                    btn.className = 'dropdown-item text-success btn-unlock-user';
                    btn.innerHTML = `<span>Mở khóa tài khoản</span>`;
                    alert('Đã khóa tài khoản khách hàng!');
                } else if (!isLock && badge) {
                    row.classList.remove('row-locked');
                    badge.className = 'admin-badge badge-success';
                    badge.textContent = 'Đang hoạt động';
                    btn.className = 'dropdown-item text-danger btn-lock-user';
                    btn.innerHTML = `<span>Khóa tài khoản</span>`;
                    alert('Đã mở khóa tài khoản khách hàng!');
                }

                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
                document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));
                if (window.lucide) lucide.createIcons();
            });
        });

        // 9. CHỈNH SỬA HỒ SƠ KHÁCH HÀNG & QUẢN LÝ SỔ ĐỊA CHỈ (MODAL 3)
        // Store lưu trữ địa chỉ cho từng khách hàng (mỗi khách có thể có nhiều địa chỉ, 1 địa chỉ mặc định)
        const customerAddressesStore = {
            'CUST-001': [
                { address: '120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP.HCM', isDefault: true },
                { address: 'Toà nhà Bitexco, 2 Hải Triều, Bến Nghé, Quận 1, TP.HCM', isDefault: false }
            ],
            'CUST-002': [
                { address: '45 Lê Duẩn, Phường Bến Nghé, Quận 1, TP.HCM', isDefault: true }
            ],
            'CUST-003': [
                { address: 'Tiếp nhận trực tiếp tại quầy Pawpal Pet Center', isDefault: true }
            ],
            'CUST-004': [
                { address: '88 Nguyễn Trãi, Phường 3, Quận 5, TP.HCM', isDefault: true }
            ],
            'CUST-005': [
                { address: '15 Thảo Điền, Phường Thảo Điền, TP. Thủ Đức', isDefault: true }
            ]
        };

        // State tạm cho danh sách địa chỉ đang chỉnh sửa trong modal
        let currentEditingAddresses = [];

        function renderDrawerAddresses(custId) {
            const container = document.getElementById('profileValAddressContainer');
            if (!container) return;
            const list = customerAddressesStore[custId] || [
                { address: '120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP.HCM', isDefault: true }
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

            // Đảm bảo luôn có ít nhất 1 địa chỉ được đánh dấu mặc định
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

            // Sự kiện chọn radio làm địa chỉ mặc định
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

            // Sự kiện xóa địa chỉ
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

        // Khởi tạo danh sách địa chỉ ban đầu trên Drawer
        renderDrawerAddresses('CUST-001');

        // Khôi phục Sub-tab và Hồ sơ khách hàng khi F5 / Reload trang (URL Hash hoặc SessionStorage)
        const hashSubtab = window.location.hash ? window.location.hash.replace('#', '') : null;
        const validSubtabs = ['tab-list', 'tab-profile', 'tab-pawpoint'];
        let initialSubtab = 'tab-list';

        if (hashSubtab && validSubtabs.includes(hashSubtab)) {
            initialSubtab = hashSubtab;
        } else {
            const savedSubtab = sessionStorage.getItem('pawpal_admin_customer_subtab');
            if (savedSubtab && validSubtabs.includes(savedSubtab)) {
                initialSubtab = savedSubtab;
            }
        }

        if (initialSubtab !== 'tab-list') {
            switchSubtab(initialSubtab);
            if (initialSubtab === 'tab-profile') {
                const savedCustId = sessionStorage.getItem('pawpal_admin_customer_id') || 'CUST-001';
                const savedCustName = sessionStorage.getItem('pawpal_admin_customer_name') || 'Nguyễn Văn An';

                const headlineName = document.getElementById('drawerCustomerName');
                if (headlineName) headlineName.textContent = savedCustName;
                if (document.getElementById('profileValFullName')) document.getElementById('profileValFullName').textContent = savedCustName;
                if (document.getElementById('profileValCustId')) document.getElementById('profileValCustId').textContent = savedCustId;
                renderDrawerAddresses(savedCustId);
                updateBreadcrumb(savedCustName);
            }
        }

        // Khôi phục tab con trong Drawer nếu có
        const savedDrawerTab = sessionStorage.getItem('pawpal_admin_customer_drawertab');
        if (savedDrawerTab && document.getElementById(savedDrawerTab)) {
            switchDrawerTab(savedDrawerTab);
        }

        // Bắt sự kiện nút Thêm địa chỉ trong modal
        const btnAddAddressItem = document.getElementById('btnAddAddressItem');
        if (btnAddAddressItem) {
            btnAddAddressItem.addEventListener('click', () => {
                updateAddressValuesFromDOM();
                const isFirst = currentEditingAddresses.length === 0;
                currentEditingAddresses.push({
                    address: '',
                    isDefault: isFirst
                });
                renderModalAddressList();
                setTimeout(() => {
                    const inputs = document.querySelectorAll('#editCustAddressList .address-input-val');
                    if (inputs.length > 0) {
                        inputs[inputs.length - 1].focus();
                    }
                }, 50);
            });
        }

        // 9. Modal Chỉnh sửa hồ sơ khách hàng (Modal 3)
        const modalEdit = document.getElementById('modalEditCustomer');
        const btnOpenEdit = document.getElementById('btnOpenEditProfileModal');
        const btnCloseEdit = document.getElementById('btnCloseEditCustomer');
        const btnCancelEdit = document.getElementById('btnCancelEditCustomer');
        const formEdit = document.getElementById('formEditCustomer');

        function openEditCustomerModal(custId) {
            if (!modalEdit) return;
            const currentId = custId || document.getElementById('profileValCustId')?.textContent || 'CUST-001';
            const fullName = document.getElementById('profileValFullName')?.textContent || document.getElementById('drawerCustomerName')?.textContent || '';
            const phone = document.getElementById('profileValPhone')?.textContent || '';
            const email = document.getElementById('profileValEmail')?.textContent || '';
            const gender = document.getElementById('profileValGender')?.textContent || 'Nam';
            const dob = document.getElementById('profileValDob')?.textContent || '';

            if (document.getElementById('editCustId')) document.getElementById('editCustId').value = currentId;
            if (document.getElementById('editCustFullName')) document.getElementById('editCustFullName').value = fullName;
            if (document.getElementById('editCustPhone')) document.getElementById('editCustPhone').value = phone;
            if (document.getElementById('editCustEmail')) document.getElementById('editCustEmail').value = email;
            if (document.getElementById('editCustGender')) document.getElementById('editCustGender').value = gender;
            
            if (dob && dob.includes('/')) {
                const parts = dob.split('/');
                if (parts.length === 3 && document.getElementById('editCustDob')) {
                    document.getElementById('editCustDob').value = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }

            // Nạp danh sách địa chỉ cho khách hàng
            const existingAddresses = customerAddressesStore[currentId] || [
                { address: '120 Nguyễn Thị Minh Khai, Phường 6, Quận 3, TP.HCM', isDefault: true }
            ];
            currentEditingAddresses = JSON.parse(JSON.stringify(existingAddresses));
            renderModalAddressList();

            modalEdit.style.display = 'flex';
        }

        function closeEditModal() {
            if (modalEdit) modalEdit.style.display = 'none';
        }

        if (btnOpenEdit) {
            btnOpenEdit.addEventListener('click', () => openEditCustomerModal());
        }
        if (btnCloseEdit) btnCloseEdit.addEventListener('click', closeEditModal);
        if (btnCancelEdit) btnCancelEdit.addEventListener('click', closeEditModal);

        // Nút Sửa hồ sơ từ menu 3 chấm ngoài bảng danh sách
        document.querySelectorAll('.btn-edit-user-table').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const custId = btn.getAttribute('data-id');
                const row = btn.closest('tr');
                const name = row?.querySelector('.user-name-link')?.textContent?.trim() || '';
                const phone = row?.querySelectorAll('td')[2]?.textContent?.trim() || '';
                const email = row?.querySelector('.user-sub-cell')?.textContent?.trim() || '';

                document.querySelectorAll('.action-dropdown-menu.show').forEach(m => m.classList.remove('show'));
                document.querySelectorAll('.btn-action-more.active').forEach(b => b.classList.remove('active'));

                openEditCustomerModal(custId);
                if (document.getElementById('editCustFullName')) document.getElementById('editCustFullName').value = name;
                if (document.getElementById('editCustPhone')) document.getElementById('editCustPhone').value = phone;
                if (document.getElementById('editCustEmail')) document.getElementById('editCustEmail').value = email;
            });
        });

        if (formEdit) {
            formEdit.addEventListener('submit', (e) => {
                e.preventDefault();
                const custId = document.getElementById('editCustId')?.value || 'CUST-001';
                const newName = document.getElementById('editCustFullName')?.value || '';
                const newPhone = document.getElementById('editCustPhone')?.value || '';
                const newEmail = document.getElementById('editCustEmail')?.value || '';
                const newGender = document.getElementById('editCustGender')?.value || 'Nam';
                const newDobRaw = document.getElementById('editCustDob')?.value || '';

                // Cập nhật giá trị địa chỉ từ DOM
                updateAddressValuesFromDOM();
                const validAddresses = currentEditingAddresses.filter(a => a.address.trim() !== '');
                if (validAddresses.length === 0) {
                    alert('Vui lòng nhập ít nhất một địa chỉ nhận hàng!');
                    return;
                }
                if (!validAddresses.some(a => a.isDefault)) {
                    validAddresses[0].isDefault = true;
                }

                // Lưu danh sách địa chỉ mới
                customerAddressesStore[custId] = validAddresses;

                let formattedDob = newDobRaw;
                if (newDobRaw && newDobRaw.includes('-')) {
                    const p = newDobRaw.split('-');
                    formattedDob = `${p[2]}/${p[1]}/${p[0]}`;
                }

                // Cập nhật thông tin trong Drawer Hồ sơ
                if (document.getElementById('profileValFullName')) document.getElementById('profileValFullName').textContent = newName;
                if (document.getElementById('drawerCustomerName')) document.getElementById('drawerCustomerName').textContent = newName;
                if (document.getElementById('profileValPhone')) document.getElementById('profileValPhone').textContent = newPhone;
                if (document.getElementById('profileValEmail')) document.getElementById('profileValEmail').textContent = newEmail;
                if (document.getElementById('profileValGender')) document.getElementById('profileValGender').textContent = newGender;
                if (document.getElementById('profileValDob') && formattedDob) document.getElementById('profileValDob').textContent = formattedDob;
                
                // Render lại danh sách địa chỉ trên Drawer
                renderDrawerAddresses(custId);

                if (deepBreadcrumbEl && deepBreadcrumbEl.innerHTML.trim() !== '') {
                    deepBreadcrumbEl.innerHTML = `
                        <span class="breadcrumb-separator">/</span>
                        <span class="breadcrumb-detail-name">${newName}</span>
                    `;
                }
                sessionStorage.setItem('pawpal_admin_customer_name', newName);

                // Cập nhật lên dòng dữ liệu trong bảng danh sách
                document.querySelectorAll('#customerTableTbody tr').forEach(row => {
                    const idCell = row.querySelector('td:first-child')?.textContent?.trim();
                    if (idCell === custId) {
                        const link = row.querySelector('.user-name-link');
                        if (link) link.textContent = newName;
                        const sub = row.querySelector('.user-sub-cell');
                        if (sub) sub.textContent = newEmail;
                        const phoneCell = row.querySelectorAll('td')[2]?.querySelector('strong');
                        if (phoneCell) phoneCell.textContent = newPhone;
                    }
                });

                alert(`Đã cập nhật thành công hồ sơ của khách hàng ${newName}!`);
                closeEditModal();
            });
        }

        // 10. THÊM THÚ CƯNG MỚI (MODAL 4)
        const modalAddPet = document.getElementById('modalAddPet');
        const btnOpenAddPet = document.getElementById('btnOpenAddPetModal');
        const btnCloseAddPet = document.getElementById('btnCloseAddPet');
        const btnCancelAddPet = document.getElementById('btnCancelAddPet');
        const formAddPet = document.getElementById('formAddPet');
        const petCardsContainer = document.getElementById('petCardsListContainer');

        if (btnOpenAddPet && modalAddPet) {
            btnOpenAddPet.addEventListener('click', () => {
                modalAddPet.style.display = 'flex';
            });
        }
        function closeAddPetModal() {
            if (modalAddPet) modalAddPet.style.display = 'none';
        }
        if (btnCloseAddPet) btnCloseAddPet.addEventListener('click', closeAddPetModal);
        if (btnCancelAddPet) btnCancelAddPet.addEventListener('click', closeAddPetModal);

        if (formAddPet) {
            formAddPet.addEventListener('submit', (e) => {
                e.preventDefault();
                const petName = document.getElementById('addPetName')?.value || 'Bé cưng';
                const species = document.getElementById('addPetSpecies')?.value || 'Chó';
                const breed = document.getElementById('addPetBreed')?.value || '';
                const weight = document.getElementById('addPetWeight')?.value || '';
                const vaccine = document.getElementById('addPetVaccine')?.value || 'Chưa cập nhật';
                const alertNote = document.getElementById('addPetAlert')?.value || 'Bình thường';

                const newPetCard = document.createElement('div');
                newPetCard.className = 'pet-detail-card';
                newPetCard.innerHTML = `
                    <div class="pet-card-head">
                        <span class="pet-card-name">${petName} (${species} ${breed ? '- ' + breed : ''})</span>
                        <span class="admin-badge ${alertNote !== 'Bình thường' ? 'badge-warning' : 'badge-neutral'}">${alertNote}</span>
                    </div>
                    <div class="pet-card-body">
                        <div><strong>Loài:</strong> ${species} ${breed ? '(' + breed + ')' : ''}</div>
                        <div><strong>Cân nặng:</strong> ${weight ? weight + ' kg' : 'Chưa cân'}</div>
                        <div><strong>Tiền sử tiêm chủng:</strong> ${vaccine}</div>
                        <div><strong>Tính cách / Lưu ý:</strong> ${alertNote}</div>
                    </div>
                `;
                if (petCardsContainer) {
                    petCardsContainer.prepend(newPetCard);
                }
                alert(`Đã thêm thành công bé cưng ${petName} vào hồ sơ!`);
                formAddPet.reset();
                closeAddPetModal();
            });
        }

        // 11. Gửi lại SMS kích hoạt tài khoản
        const btnResendSms = document.getElementById('btnResendSmsToken');
        if (btnResendSms) {
            btnResendSms.addEventListener('click', () => {
                const phone = document.getElementById('profileValPhone')?.textContent || 'khách hàng';
                alert(`Đã gửi lại tin nhắn SMS chứa liên kết tạo mật khẩu đến số ${phone}!`);
            });
        }

        // 12. Điều hướng liên kết chéo trên đầu Hồ sơ (Cross-module quick actions)
        document.querySelector('.btn-link-service')?.addEventListener('click', () => {
            const custName = document.getElementById('drawerCustomerName')?.textContent || '';
            const btn = document.querySelector('.sidebar-menu-btn[data-title="Dịch vụ"]');
            alert(`Tự động điền thông tin ${custName} và chuyển sang phân hệ Dịch vụ!`);
            if (btn) btn.click();
        });

        document.querySelector('.btn-link-order')?.addEventListener('click', () => {
            const custName = document.getElementById('drawerCustomerName')?.textContent || '';
            const btn = document.querySelector('.sidebar-menu-btn[data-title="Bán hàng"]');
            alert(`Tự động điền thông tin ${custName} và chuyển sang phân hệ Bán hàng để lên đơn!`);
            if (btn) btn.click();
        });

        document.querySelector('.btn-link-complaint')?.addEventListener('click', () => {
            const custName = document.getElementById('drawerCustomerName')?.textContent || '';
            const btn = document.querySelector('.sidebar-menu-btn[data-title="Khiếu nại"]');
            alert(`Mở phiếu hỗ trợ cho khách hàng ${custName} tại phân hệ Khiếu nại!`);
            if (btn) btn.click();
        });

        // Khởi tạo icon Lucide
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomersModule);
    } else {
        initCustomersModule();
    }
})();
