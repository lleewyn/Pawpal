// tab-customer-list.js - Subtab Danh sách khách hàng Pawpal-er
(function() {
    'use strict';

    const PawpalCustomers = window.PawpalCustomers = window.PawpalCustomers || {};
    PawpalCustomers.subtabs = PawpalCustomers.subtabs || {};

    let currentCustomerPage = 1;
    const CUSTOMER_PAGE_SIZE = 10;
    let currentCustomerFilter = 'ALL'; // ALL, MEMBER, TEMP, LOCKED, COMPLAINT
    let activeMoreBtn = null;
    let dupFoundCustId = null;

    function formatCustomerPetsCell(pets) {
        if (!pets || pets.length === 0) {
            return `<span class="customer-pet-sub">Chưa có thú cưng</span>`;
        }
        if (pets.length === 1) {
            const p = pets[0];
            const breedText = p.breed || (p.species === 'CAT' || p.species === 'Mèo' ? 'Mèo' : 'Chó');
            return `
                <div class="customer-pet-cell">${p.name}</div>
                <div class="customer-pet-sub">${breedText}</div>
            `;
        }
        const mainPet = pets[0];
        const moreCount = pets.length - 1;
        const allBreeds = pets.map(p => p.breed || (p.species === 'CAT' || p.species === 'Mèo' ? 'Mèo' : 'Chó')).filter(Boolean).join(', ');
        const fullTooltip = pets.map(p => `${p.name} (${p.breed || p.species})`).join(', ');

        return `
            <div class="customer-pet-cell">${mainPet.name} <span class="customer-pet-more">(+${moreCount} bé)</span></div>
            <div class="customer-pet-sub" title="${fullTooltip}">${allBreeds}</div>
        `;
    }

    function isRealPetAlert(note) {
        if (!note || note === 'Bình thường') return false;
        const l = note.toLowerCase().trim();
        if (l.includes('thân thiện') || l.includes('ngoan') || l.includes('dễ chăm sóc') || l.includes('dễ thương') || l.includes('năng động') || l.includes('bình thường') || l.includes('lông dài')) {
            return false;
        }
        return true;
    }

    function updateCustomerKPIs() {
        const totalEl = document.getElementById('custStatTotal');
        const memberEl = document.getElementById('custStatMember');
        const guestEl = document.getElementById('custStatGuest');
        const lockedEl = document.getElementById('custStatLocked');
        const complaintEl = document.getElementById('custStatComplaint');

        const allCusts = Object.values(PawpalCustomers.state.customerDatabase || {});
        const totalCount = allCusts.length;
        const memberCount = allCusts.filter(c => c.status === 'ACTIVE').length;
        const guestCount = allCusts.filter(c => c.status === 'TEMP').length;
        const lockedCount = allCusts.filter(c => c.status === 'LOCKED').length;
        const complaintCount = allCusts.filter(c => c.emergencyAlert || (c.complaints && c.complaints.some(tc => tc.status === 'Đang xử lý'))).length;

        if (totalEl) totalEl.textContent = totalCount.toLocaleString('vi-VN');
        if (memberEl) memberEl.textContent = memberCount.toLocaleString('vi-VN');
        if (guestEl) guestEl.textContent = guestCount.toLocaleString('vi-VN');
        if (lockedEl) lockedEl.textContent = lockedCount.toLocaleString('vi-VN');
        if (complaintEl) complaintEl.textContent = complaintCount.toLocaleString('vi-VN');
    }

    function renderCustomerPagination(totalPages) {
        const pagBar = document.getElementById('customerPaginationBar');
        const pagControls = document.getElementById('customerPaginationControls');
        if (!pagBar || !pagControls) return;

        if (totalPages === 0) {
            pagBar.style.display = 'none';
            return;
        }
        pagBar.style.display = 'flex';

        let html = '';
        const prevDisabled = currentCustomerPage === 1 ? 'disabled' : '';
        html += `<button type="button" class="pagination-btn ${prevDisabled}" data-page="prev" title="Trang trước">&lt;</button>`;

        for (let p = 1; p <= totalPages; p++) {
            const activeClass = p === currentCustomerPage ? 'active' : '';
            html += `<button type="button" class="pagination-btn ${activeClass}" data-page="${p}">${p}</button>`;
        }

        const nextDisabled = currentCustomerPage === totalPages ? 'disabled' : '';
        html += `<button type="button" class="pagination-btn ${nextDisabled}" data-page="next" title="Trang sau">&gt;</button>`;

        pagControls.innerHTML = html;

        pagControls.querySelectorAll('.pagination-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pageAction = btn.getAttribute('data-page');
                if (pageAction === 'prev') {
                    if (currentCustomerPage > 1) {
                        currentCustomerPage--;
                        renderCustomersTable();
                    }
                } else if (pageAction === 'next') {
                    if (currentCustomerPage < totalPages) {
                        currentCustomerPage++;
                        renderCustomersTable();
                    }
                } else {
                    const targetP = parseInt(pageAction, 10);
                    if (targetP && targetP !== currentCustomerPage) {
                        currentCustomerPage = targetP;
                        renderCustomersTable();
                    }
                }
            });
        });
    }

    function clearAllCustomerFilters() {
        const searchInput = document.getElementById('custSearchInput');
        const filterTier = document.getElementById('custFilterTier');
        const filterStatus = document.getElementById('custFilterStatus');
        const btnClearCustSearch = document.getElementById('btnClearCustSearch');
        const btnCustClearFilters = document.getElementById('btnCustClearFilters');

        if (searchInput) searchInput.value = '';
        if (btnClearCustSearch) btnClearCustSearch.style.display = 'none';
        if (btnCustClearFilters) btnCustClearFilters.style.display = 'none';
        if (filterTier) filterTier.value = 'ALL';
        if (filterStatus) filterStatus.value = 'ALL';

        currentCustomerFilter = 'ALL';
        currentCustomerPage = 1;

        const btnFilterComplaint = document.getElementById('btnFilterComplaintOnly');
        if (btnFilterComplaint) btnFilterComplaint.classList.remove('active');
        document.querySelectorAll('#tab-customer-list .kpi-card, .customers-kpi-grid .kpi-card-clickable').forEach(c => c.classList.remove('active'));
        renderCustomersTable();
    }

    function renderCustomersTable() {
        const tbody = document.getElementById('customerTableTbody');
        if (!tbody) return;

        const query = (document.getElementById('custSearchInput')?.value || '').trim();
        const selectedTier = document.getElementById('custFilterTier')?.value || 'ALL';
        const selectedStatus = document.getElementById('custFilterStatus')?.value || 'ALL';
        const btnCustClearFilters = document.getElementById('btnCustClearFilters');

        const isAnyFilterActive = Boolean(
            query ||
            selectedTier !== 'ALL' ||
            selectedStatus !== 'ALL' ||
            currentCustomerFilter !== 'ALL'
        );
        if (btnCustClearFilters) {
            btnCustClearFilters.style.display = isAnyFilterActive ? 'inline-flex' : 'none';
        }

        const allCusts = Object.values(PawpalCustomers.state.customerDatabase || {});

        const filtered = allCusts.filter(c => {
            let matchQuery = !query;
            if (query) {
                const qParts = query.includes(' - ') ? query.split(' - ').map(s => s.trim()) : [query];
                matchQuery = qParts.some(part => 
                    PawpalCustomers.matchSearch(c.id, part) ||
                    PawpalCustomers.matchSearch(c.name, part) ||
                    PawpalCustomers.matchSearch(c.phone, part) ||
                    PawpalCustomers.matchSearch(c.email, part) ||
                    (c.pets && c.pets.some(p => PawpalCustomers.matchSearch(p.name, part) || PawpalCustomers.matchSearch(p.breed, part) || PawpalCustomers.matchSearch(p.species, part)))
                );
            }

            const matchTier = (selectedTier === 'ALL') || (c.tier === selectedTier);

            let matchCategory = true;
            if (currentCustomerFilter === 'MEMBER') {
                matchCategory = (c.status === 'ACTIVE');
            } else if (currentCustomerFilter === 'TEMP') {
                matchCategory = (c.status === 'TEMP');
            } else if (currentCustomerFilter === 'LOCKED') {
                matchCategory = (c.status === 'LOCKED');
            } else if (currentCustomerFilter === 'COMPLAINT') {
                matchCategory = Boolean(c.emergencyAlert || (c.complaints && c.complaints.some(tc => tc.status !== 'Đã giải quyết')));
            }

            const matchStatus = (selectedStatus === 'ALL') || (c.status === selectedStatus);

            return matchQuery && matchTier && matchCategory && matchStatus;
        });

        const totalPages = Math.ceil(filtered.length / CUSTOMER_PAGE_SIZE) || 1;
        if (currentCustomerPage > totalPages) currentCustomerPage = totalPages;

        const startIdx = (currentCustomerPage - 1) * CUSTOMER_PAGE_SIZE;
        const pageItems = filtered.slice(startIdx, startIdx + CUSTOMER_PAGE_SIZE);

        if (pageItems.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px; font-size: 13.5px;">
                        Không tìm thấy khách hàng nào phù hợp với bộ lọc hiện tại. 
                        <button type="button" id="btnResetCustomerFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4px; font-size: 13.5px;">Xóa bộ lọc</button>
                    </td>
                </tr>
            `;
            document.getElementById('btnResetCustomerFilters')?.addEventListener('click', clearAllCustomerFilters);
            renderCustomerPagination(0);
            return;
        }

        tbody.innerHTML = pageItems.map(c => {
            const isLocked = (c.status === 'LOCKED');
            const activeComplaint = c.complaints && c.complaints.find(tc => tc.status !== 'Đã giải quyết');
            const hasEmergency = Boolean(c.emergencyAlert || activeComplaint);
            const alertPet = (c.pets && Array.isArray(c.pets)) ? c.pets.find(p => isRealPetAlert(p.alertNote)) : null;
            const hasPetAlert = Boolean(alertPet);

            // Vạch border-left duy nhất ở td:first-child theo AGENTS.md
            let firstTdBorder = 'border-left: 3px solid transparent;';
            if (hasEmergency) {
                firstTdBorder = 'border-left: 3px solid #DC2626 !important;';
            } else if (hasPetAlert) {
                firstTdBorder = 'border-left: 3px solid #D97706 !important;';
            }

            const rowLockedClass = isLocked ? 'row-locked' : '';
            const rowComplaintClass = hasEmergency ? 'row-highlight-complaint' : '';

            let alertBadgeHtml = '<span style="color: var(--text-muted); opacity: 0.35; font-size: 13px;">—</span>';
            if (hasEmergency) {
                const ticket = activeComplaint || (c.complaints && c.complaints[0]);
                const ticketId = ticket?.id || '';
                const ticketStatus = ticket?.status || 'Chưa xử lý';
                alertBadgeHtml = `<span class="alert-indicator text-danger">• ${ticketId} · ${ticketStatus}</span>`;
            } else if (hasPetAlert && alertPet) {
                alertBadgeHtml = `<span class="alert-indicator text-warning">• ${alertPet.name}: ${alertPet.alertNote}</span>`;
            }

            let statusBadgeHtml = '<span class="admin-badge badge-success">Đang hoạt động</span>';
            if (isLocked) {
                statusBadgeHtml = '<span class="admin-badge badge-danger">Bị khóa</span>';
            } else if (c.status === 'TEMP') {
                statusBadgeHtml = '<span class="admin-badge badge-neutral">Tạm thời</span>';
            }

            return `
                <tr class="${rowLockedClass} ${rowComplaintClass}" data-id="${c.id}">
                    <td style="${firstTdBorder}"><strong>${c.id}</strong></td>
                    <td>
                        <div class="user-name-cell">
                            <a href="javascript:void(0)" class="user-name-link btn-open-profile-drawer" data-id="${c.id}">${c.name}</a>
                        </div>
                        <div class="user-sub-cell">${c.email && c.email !== 'Chưa cập nhật' ? c.email : 'Khách tiếp nhận tại quầy'}</div>
                    </td>
                    <td><strong>${c.phone}</strong></td>
                    <td>
                        ${formatCustomerPetsCell(c.pets)}
                    </td>
                    <td>
                        <span class="admin-badge ${c.tierBadgeClass || 'badge-tier-silver'}">${c.tierName || 'Bạc'}</span>
                        <span class="points-val">${(c.points || 0).toLocaleString('vi-VN')} điểm</span>
                    </td>
                    <td>${alertBadgeHtml}</td>
                    <td>${statusBadgeHtml}</td>
                    <td style="width: 70px; min-width: 70px; text-align: center; padding: 8px 10px;">
                        <button type="button" class="btn-action-more" data-id="${c.id}" title="Tác vụ">•••</button>
                    </td>
                </tr>
            `;
        }).join('');

        renderCustomerPagination(totalPages);
    }

    // Dải cảnh báo khiếu nại đầu bảng
    function renderComplaintBar() {
        const container = document.getElementById('custComplaintItemsContainer');
        const bar = document.getElementById('custComplaintAlertBar');
        if (!container) return;

        const activeComplaints = [];
        Object.values(PawpalCustomers.state.customerDatabase || {}).forEach(cust => {
            if (cust.complaints && cust.complaints.length > 0) {
                cust.complaints.filter(tc => tc.status === 'Đang xử lý').forEach(tc => {
                    activeComplaints.push({
                        id: cust.id,
                        name: cust.name,
                        ticket: tc.id,
                        reason: tc.issue
                    });
                });
            }
        });

        if (activeComplaints.length === 0) {
            if (bar) bar.style.display = 'none';
            return;
        }

        if (bar) bar.style.display = 'flex';

        container.innerHTML = activeComplaints.map(item => `
            <div class="complaint-item-tag" data-id="${item.id}" title="Xem hồ sơ ${item.name} (${item.ticket})">
                <span class="tag-ticket">${item.ticket}</span>
                <span class="tag-cust">${item.name}</span>
                <span class="tag-reason">(${item.reason})</span>
            </div>
        `).join('');

        container.querySelectorAll('.complaint-item-tag').forEach(tag => {
            tag.addEventListener('click', (e) => {
                e.stopPropagation();
                const custId = tag.getAttribute('data-id');
                sessionStorage.setItem('pawpal_admin_customer_id', custId);
                sessionStorage.setItem('pawpal_admin_customer_name', PawpalCustomers.state.customerDatabase?.[custId]?.name || custId);
                if (PawpalCustomers.subtabs.profile) {
                    PawpalCustomers.subtabs.profile.renderDrawerCustomerProfile(custId);
                }
                PawpalCustomers.switchSubtab('tab-profile');
            });
        });
    }

    // Global Dropdown Tác vụ 3 chấm (Direct body portal)
    let globalActionDropdown = document.getElementById('customerGlobalActionDropdown');
    function ensureGlobalDropdown() {
        if (!globalActionDropdown) {
            globalActionDropdown = document.getElementById('customerGlobalActionDropdown');
            if (!globalActionDropdown) {
                globalActionDropdown = document.createElement('div');
                globalActionDropdown.id = 'customerGlobalActionDropdown';
                globalActionDropdown.className = 'action-dropdown-menu';
                globalActionDropdown.innerHTML = `
                    <button type="button" class="dropdown-item" data-action="profile">
                        Xem hồ sơ 360°
                    </button>
                    <button type="button" class="dropdown-item" data-action="edit">
                        Sửa hồ sơ
                    </button>
                    <button type="button" class="dropdown-item" data-action="adjust-points">
                        Điều chỉnh điểm
                    </button>
                    <button type="button" class="dropdown-item" data-action="toggle-lock">
                        <span id="globalDropdownLockText">Khóa tài khoản</span>
                    </button>
                `;
                document.body.appendChild(globalActionDropdown);
            }
        }
        return globalActionDropdown;
    }

    function closeGlobalDropdown() {
        const dd = ensureGlobalDropdown();
        if (dd) {
            dd.style.display = 'none';
            dd.classList.remove('show');
        }
        if (activeMoreBtn) {
            activeMoreBtn.classList.remove('active');
            activeMoreBtn = null;
        }
    }

    function toggleGlobalDropdown(btn) {
        const dd = ensureGlobalDropdown();
        if (!btn || !dd) return;
        const custId = btn.getAttribute('data-id');
        const cust = PawpalCustomers.state.customerDatabase?.[custId];
        if (!cust) return;

        if (activeMoreBtn === btn && dd.style.display === 'flex') {
            closeGlobalDropdown();
            return;
        }

        closeGlobalDropdown();
        activeMoreBtn = btn;
        btn.classList.add('active');

        dd.setAttribute('data-id', custId);
        const lockItem = dd.querySelector('[data-action="toggle-lock"]');
        const lockText = dd.querySelector('#globalDropdownLockText');
        if (lockItem && lockText) {
            if (cust.status === 'LOCKED') {
                lockItem.className = 'dropdown-item text-success';
                lockText.textContent = 'Mở khóa tài khoản';
            } else {
                lockItem.className = 'dropdown-item text-danger';
                lockText.textContent = 'Khóa tài khoản';
            }
        }

        const rect = btn.getBoundingClientRect();
        const menuWidth = 180;
        const menuHeight = 160;

        let left = rect.right - menuWidth;
        if (left < 10) left = 10;
        if (left + menuWidth > window.innerWidth - 10) {
            left = window.innerWidth - menuWidth - 10;
        }

        let top = rect.bottom + 6;
        if (top + menuHeight > window.innerHeight - 10) {
            top = rect.top - menuHeight - 6;
        }

        dd.style.position = 'fixed';
        dd.style.top = `${top}px`;
        dd.style.left = `${left}px`;
        dd.style.zIndex = '99999';
        dd.style.display = 'flex';
        dd.classList.add('show');
    }

    // Xuất CSV danh sách khách hàng
    function getCustomersInCurrentFilter() {
        const query = (document.getElementById('custSearchInput')?.value || '').trim();
        const selectedTier = document.getElementById('custFilterTier')?.value || 'ALL';
        const selectedStatus = document.getElementById('custFilterStatus')?.value || 'ALL';

        return Object.values(PawpalCustomers.state.customerDatabase || {}).filter(c => {
            const matchesQuery = !query || [c.id, c.name, c.phone, c.email, ...(c.pets || []).flatMap(p => [p.name, p.breed, p.species])]
                .some(value => PawpalCustomers.matchSearch(value, query));
            const matchesTier = selectedTier === 'ALL' || c.tier === selectedTier;
            const matchesStatus = selectedStatus === 'ALL' || c.status === selectedStatus;
            const matchesCategory = currentCustomerFilter !== 'COMPLAINT' || Boolean(c.emergencyAlert || (c.complaints || []).some(t => t.status !== 'Đã giải quyết'));
            return matchesQuery && matchesTier && matchesStatus && matchesCategory;
        });
    }

    function exportCustomersToCSV() {
        const allCusts = getCustomersInCurrentFilter();
        if (!allCusts || allCusts.length === 0) {
            PawpalCustomers.showToast('Không có dữ liệu khách hàng để xuất!', 'warning');
            return;
        }

        const headers = [
            'Mã khách hàng',
            'Họ và tên',
            'Số điện thoại',
            'Email',
            'Giới tính',
            'Ngày sinh',
            'Hạng thành viên',
            'Điểm Pawpoint',
            'Trạng thái tài khoản',
            'Số lượng thú cưng',
            'Danh sách thú cưng',
            'Địa chỉ mặc định',
            'Ghi chú'
        ];

        const rows = allCusts.map(c => {
            const petsList = (c.pets || []).map(p => `${p.name} (${p.species || 'Chó/Mèo'})`).join('; ');
            const defaultAddr = (c.addresses || []).find(a => a.isDefault)?.address || (c.addresses?.[0]?.address || '');
            const statusText = c.status === 'ACTIVE' ? 'Đang hoạt động' : (c.status === 'TEMP' ? 'Tài khoản tạm' : 'Bị khóa');

            return [
                c.id || '',
                c.name || '',
                c.phone || '',
                c.email || '',
                c.gender || '',
                c.dob || '',
                c.tierName || c.tier || '',
                c.points || 0,
                statusText,
                (c.pets || []).length,
                petsList,
                defaultAddr,
                c.note || ''
            ];
        });

        const csvRows = [
            headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
            ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ];

        const csvContent = '\uFEFF' + csvRows.join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        link.setAttribute('href', url);
        link.setAttribute('download', `Pawpal_Danh_Sach_Khach_Hang_${dateStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        PawpalCustomers.showToast(`Đã xuất báo cáo ${allCusts.length} khách hàng theo bộ lọc hiện tại ra file CSV!`);
    }

    // Modal Tiếp nhận tại quầy (Quick Add)
    const modalAdd = document.getElementById('modalAddCustomer');
    const quickAddPhoneInput = document.getElementById('quickAddPhone');
    const quickAddPhoneAlert = document.getElementById('quickAddPhoneAlert');
    const quickAddDupName = document.getElementById('quickAddDupName');
    const quickAddDupId = document.getElementById('quickAddDupId');

    function closeAddModal() {
        if (modalAdd) modalAdd.style.display = 'none';
        if (quickAddPhoneAlert) quickAddPhoneAlert.style.display = 'none';
        dupFoundCustId = null;
    }

    function initCustomerListTab() {
        const btnOpenAdd = document.getElementById('btnOpenAddCustomerModal');
        const btnCloseAdd = document.getElementById('btnCloseAddCustomer');
        const btnCancelAdd = document.getElementById('btnCancelAddCustomer');
        const formAdd = document.getElementById('formAddCustomerQuick');
        const btnOpenDupCustomer = document.getElementById('btnOpenDupCustomer');

        if (btnOpenAdd && modalAdd) {
            btnOpenAdd.addEventListener('click', () => {
                modalAdd.style.display = 'flex';
                if (quickAddPhoneAlert) quickAddPhoneAlert.style.display = 'none';
                dupFoundCustId = null;
            });
        }
        if (btnCloseAdd) btnCloseAdd.addEventListener('click', closeAddModal);
        if (btnCancelAdd) btnCancelAdd.addEventListener('click', closeAddModal);

        document.querySelectorAll('#quickAddBreedChips .reason-quick-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const input = document.getElementById('quickAddPetBreed');
                if (input) {
                    input.value = chip.textContent.trim();
                    input.focus();
                }
            });
        });

        if (quickAddPhoneInput) {
            quickAddPhoneInput.addEventListener('input', () => {
                const cleanPhone = quickAddPhoneInput.value.replace(/[^0-9]/g, '').trim();
                if (cleanPhone.length >= 9) {
                    const existing = Object.values(PawpalCustomers.state.customerDatabase || {}).find(c => c.phone && c.phone.replace(/[^0-9]/g, '').trim() === cleanPhone);
                    if (existing) {
                        dupFoundCustId = existing.id;
                        if (quickAddDupName) quickAddDupName.textContent = existing.name;
                        if (quickAddDupId) quickAddDupId.textContent = existing.id;
                        if (quickAddPhoneAlert) quickAddPhoneAlert.style.display = 'block';
                        return;
                    }
                }
                dupFoundCustId = null;
                if (quickAddPhoneAlert) quickAddPhoneAlert.style.display = 'none';
            });
        }

        if (btnOpenDupCustomer) {
            btnOpenDupCustomer.addEventListener('click', () => {
                if (dupFoundCustId) {
                    const existingCustomerId = dupFoundCustId;
                    const existingCustomer = PawpalCustomers.state.customerDatabase?.[existingCustomerId];
                    closeAddModal();
                    sessionStorage.setItem('pawpal_admin_customer_id', existingCustomerId);
                    sessionStorage.setItem('pawpal_admin_customer_name', existingCustomer?.name || '');
                    if (PawpalCustomers.subtabs.profile) {
                        PawpalCustomers.subtabs.profile.renderDrawerCustomerProfile(existingCustomerId);
                    }
                    PawpalCustomers.switchSubtab('tab-profile');
                }
            });
        }

        if (formAdd) {
            formAdd.addEventListener('submit', async (e) => {
                e.preventDefault();
                if (dupFoundCustId) {
                    PawpalCustomers.showToast(`Số điện thoại này đã thuộc về khách hàng ${PawpalCustomers.state.customerDatabase?.[dupFoundCustId]?.name}! Vui lòng kiểm tra lại.`, 'warning');
                    return;
                }

                const nameInput = document.getElementById('quickAddName');
                const name = (nameInput?.value || '').replace(/\s+/g, ' ').trim();
                const phone = (document.getElementById('quickAddPhone')?.value || '').trim();
                const phoneInput = document.getElementById('quickAddPhone');
                const petNameInput = document.getElementById('quickAddPetName');
                const rawPetName = petNameInput?.value || '';
                const petName = rawPetName.replace(/\s+/g, ' ').trim();
                if (rawPetName && !petName && petNameInput) {
                    petNameInput.value = '';
                }
                const petSpecies = document.getElementById('quickAddPetSpecies')?.value || 'DOG';
                const petBreed = document.getElementById('quickAddPetBreed')?.value || 'Chưa cập nhật';
                const petWeightInput = document.getElementById('quickAddPetWeight');
                const petWeightRaw = (petWeightInput?.value || '').trim();
                const petWeight = petWeightRaw === '' ? '' : Number(petWeightRaw);
                const validationErrors = [];
                const nameError = !name ? 'Họ tên là thông tin bắt buộc.' : (name.length < 2 ? 'Họ tên phải có ít nhất 2 ký tự.' : '');
                const phoneError = /^\d{10}$/.test(phone) ? '' : 'Số điện thoại phải gồm đúng 10 chữ số.';
                const weightError = petWeightRaw !== '' && (!Number.isFinite(petWeight) || petWeight <= 0) ? 'Cân nặng phải là số lớn hơn 0.' : '';
                if (nameInput) nameInput.setCustomValidity(nameError);
                if (phoneInput) phoneInput.setCustomValidity(phoneError);
                if (petWeightInput) petWeightInput.setCustomValidity(weightError);
                if (nameError) validationErrors.push(nameError);
                if (phoneError) validationErrors.push(phoneError);
                if (weightError) validationErrors.push(weightError);
                if (validationErrors.length) {
                    [nameInput, phoneInput, petWeightInput].find(input => input && input.validationMessage)?.reportValidity();
                    PawpalCustomers.showToast(validationErrors.join(' '), 'warning');
                    return;
                }
                const initialAddress = document.getElementById('quickAddAddress')?.value || 'Tiếp nhận trực tiếp tại quầy Pawpal Center';

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    PawpalCustomers.showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                try {
                    const activationToken = (window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
                    const activationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
                    
                    const { data: newCust, error: custErr } = await client.from('customer').insert({
                        email: null,
                        phone_main: phone || null,
                        account_status: 'ACTIVE',
                        is_temporary: true,
                        note: 'Khách tiếp nhận nhanh tại quầy.',
                        activation_token: activationToken,
                        activation_token_expires_at: activationExpiresAt
                    }).select().single();

                    if (custErr || !newCust) {
                        console.error('[Customers] Lỗi tạo customer:', custErr);
                        PawpalCustomers.showToast('Không thể tạo hồ sơ khách hàng trên CSDL!', 'danger');
                        return;
                    }

                    await client.from('customer_profile').insert({
                        customer_id: newCust.id,
                        full_name: name,
                        gender: 'OTHER'
                    });

                    await client.from('customer_membership').insert({
                        customer_id: newCust.id,
                        total_paw_points: 0
                    });

                    if (initialAddress && initialAddress.trim()) {
                        await client.from('customer_address').insert({
                            customer_id: newCust.id,
                            receiver_name: name,
                            receiver_phone: phone || '',
                            street_address: initialAddress.trim(),
                            is_default: true
                        });
                    }

                    await client.from('customer_activation_sms').insert({
                        customer_id: newCust.id,
                        phone: phone,
                        activation_url: `${window.location.origin}/pages/public/activate-account.html?token=${encodeURIComponent(activationToken)}`,
                        status: 'pending'
                    });

                    if (petName && petName.trim()) {
                        const spec = petSpecies === 'CAT' ? 'cat' : (petSpecies === 'OTHER' ? 'other' : 'dog');
                        await client.from('pet_profile').insert({
                            customer_id: newCust.id,
                            pet_name: petName.trim(),
                            species: spec,
                            breed: petBreed || 'Chưa cập nhật',
                            weight: petWeight === '' ? null : petWeight
                        });
                    }

                    await PawpalCustomers.loadCustomersModuleData();
                    renderCustomersTable();
                    updateCustomerKPIs();
                    PawpalCustomers.showToast(`Đã tạo thành công hồ sơ khách hàng ${name} vào CSDL!`, 'success');
                    formAdd.reset();
                    closeAddModal();
                } catch (err) {
                    console.error('[Customers] Lỗi tạo khách hàng:', err);
                    PawpalCustomers.showToast('Đã xảy ra lỗi khi tạo khách hàng!', 'danger');
                }
            });
        }

        // Global dropdown actions
        const dd = ensureGlobalDropdown();
        dd.addEventListener('click', (e) => {
            const item = e.target.closest('.dropdown-item');
            if (!item) return;
            e.stopPropagation();

            const action = item.getAttribute('data-action');
            const custId = dd.getAttribute('data-id');
            closeGlobalDropdown();

            if (!custId || !PawpalCustomers.state.customerDatabase?.[custId]) return;

            if (action === 'profile') {
                sessionStorage.setItem('pawpal_admin_customer_id', custId);
                sessionStorage.setItem('pawpal_admin_customer_name', PawpalCustomers.state.customerDatabase[custId].name || custId);
                if (PawpalCustomers.subtabs.profile) {
                    PawpalCustomers.subtabs.profile.renderDrawerCustomerProfile(custId);
                }
                PawpalCustomers.switchSubtab('tab-profile');
            } else if (action === 'edit') {
                if (PawpalCustomers.subtabs.profile) {
                    PawpalCustomers.subtabs.profile.openEditCustomerModal(custId);
                }
            } else if (action === 'adjust-points') {
                if (PawpalCustomers.subtabs.pawpoint) {
                    PawpalCustomers.subtabs.pawpoint.openAdjustPointsModal(PawpalCustomers.state.customerDatabase[custId].phone);
                }
            } else if (action === 'toggle-lock') {
                const custObj = PawpalCustomers.state.customerDatabase[custId];
                if (!custObj || !custObj.dbId) return;

                const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                if (!client) {
                    PawpalCustomers.showToast('Lỗi kết nối CSDL Supabase!', 'danger');
                    return;
                }

                const isLocking = custObj.status !== 'LOCKED';
                const newStatus = isLocking ? 'LOCKED' : 'ACTIVE';

                (async () => {
                    try {
                        const { error: lockErr } = await client
                            .from('customer')
                            .update({ account_status: newStatus })
                            .eq('id', custObj.dbId);

                        if (lockErr) {
                            console.error('[Customers] Lỗi cập nhật trạng thái:', lockErr);
                            PawpalCustomers.showToast('Không thể cập nhật trạng thái tài khoản trên CSDL!', 'danger');
                            return;
                        }

                        await PawpalCustomers.loadCustomersModuleData();
                        renderCustomersTable();
                        updateCustomerKPIs();
                        PawpalCustomers.showToast(isLocking ? `Đã khóa tài khoản khách hàng ${custObj.name}!` : `Đã mở khóa tài khoản khách hàng ${custObj.name}!`, 'success');
                    } catch (err) {
                        console.error('[Customers] Lỗi cập nhật trạng thái:', err);
                        PawpalCustomers.showToast('Đã xảy ra lỗi khi cập nhật trạng thái!', 'danger');
                    }
                })();
            }
        });

        // Đóng dropdown khi click ra ngoài hoặc scroll
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.btn-action-more') && !e.target.closest('#customerGlobalActionDropdown')) {
                closeGlobalDropdown();
            }
        });
        window.addEventListener('resize', closeGlobalDropdown);
        const scrollContainer = document.querySelector('.table-responsive-wrapper');
        if (scrollContainer) scrollContainer.addEventListener('scroll', closeGlobalDropdown);

        // Click trên bảng
        const customerTable = document.getElementById('customerDataTable');
        if (customerTable) {
            customerTable.addEventListener('click', (e) => {
                const btnMore = e.target.closest('.btn-action-more');
                if (btnMore) {
                    e.stopPropagation();
                    toggleGlobalDropdown(btnMore);
                    return;
                }

                const userLink = e.target.closest('.user-name-link');
                if (userLink) {
                    e.stopPropagation();
                    const custId = userLink.getAttribute('data-id');
                    sessionStorage.setItem('pawpal_admin_customer_id', custId);
                    sessionStorage.setItem('pawpal_admin_customer_name', PawpalCustomers.state.customerDatabase?.[custId]?.name || '');
                    if (PawpalCustomers.subtabs.profile) {
                        PawpalCustomers.subtabs.profile.renderDrawerCustomerProfile(custId);
                    }
                    PawpalCustomers.switchSubtab('tab-profile');
                    closeGlobalDropdown();
                    return;
                }
            });
        }

        // Bộ lọc & KPI Cards
        const filterStatusSelect = document.getElementById('custFilterStatus');
        const filterTierSelect = document.getElementById('custFilterTier');
        const btnFilterComplaint = document.getElementById('btnFilterComplaintOnly');
        const btnComplaintStripFilter = document.getElementById('btnFilterComplaintQuick');
        const searchInput = document.getElementById('custSearchInput');

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                currentCustomerPage = 1;
                renderCustomersTable();
            });

            searchInput.addEventListener('change', () => {
                const val = (searchInput.value || '').trim();
                if (val.includes(' - ')) {
                    const [nPart, pPart] = val.split(' - ').map(s => s.trim().toLowerCase());
                    const matched = Object.values(PawpalCustomers.state.customerDatabase || {}).find(c => 
                        (c.phone && c.phone.toLowerCase() === pPart) || 
                        (c.name && c.name.toLowerCase() === nPart)
                    );
                    if (matched) {
                        sessionStorage.setItem('pawpal_admin_customer_id', matched.id);
                        sessionStorage.setItem('pawpal_admin_customer_name', matched.name);
                        if (PawpalCustomers.subtabs.profile) {
                            PawpalCustomers.subtabs.profile.renderDrawerCustomerProfile(matched.id);
                        }
                    }
                }
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        if (filterStatusSelect) {
            filterStatusSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'ALL') currentCustomerFilter = 'ALL';
                else if (val === 'ACTIVE') currentCustomerFilter = 'MEMBER';
                else if (val === 'TEMP') currentCustomerFilter = 'TEMP';
                else if (val === 'LOCKED') currentCustomerFilter = 'LOCKED';
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        if (filterTierSelect) {
            filterTierSelect.addEventListener('change', () => {
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        if (btnFilterComplaint) {
            btnFilterComplaint.addEventListener('click', () => {
                if (currentCustomerFilter === 'COMPLAINT') {
                    currentCustomerFilter = 'ALL';
                    btnFilterComplaint.classList.remove('active');
                } else {
                    currentCustomerFilter = 'COMPLAINT';
                    btnFilterComplaint.classList.add('active');
                }
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        if (btnComplaintStripFilter) {
            btnComplaintStripFilter.addEventListener('click', () => {
                currentCustomerFilter = 'COMPLAINT';
                if (btnFilterComplaint) btnFilterComplaint.classList.add('active');
                document.querySelectorAll('.customers-kpi-grid .kpi-card-clickable').forEach(c => {
                    c.classList.toggle('active', c.getAttribute('data-kpi-filter') === 'COMPLAINT');
                });
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        }

        document.getElementById('btnCustClearFilters')?.addEventListener('click', clearAllCustomerFilters);

        document.querySelectorAll('.customers-kpi-grid .kpi-card-clickable').forEach(card => {
            card.addEventListener('click', () => {
                const filter = card.getAttribute('data-kpi-filter');
                document.querySelectorAll('.customers-kpi-grid .kpi-card-clickable').forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                currentCustomerFilter = filter;
                if (btnFilterComplaint) {
                    btnFilterComplaint.classList.toggle('active', filter === 'COMPLAINT');
                }
                if (filterStatusSelect) {
                    if (filter === 'ALL') filterStatusSelect.value = 'ALL';
                    else if (filter === 'LOCKED') filterStatusSelect.value = 'LOCKED';
                    else if (filter === 'TEMP') filterStatusSelect.value = 'TEMP';
                    else if (filter === 'MEMBER') filterStatusSelect.value = 'ACTIVE';
                }
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        });

        document.getElementById('btnExportCustomerReport')?.addEventListener('click', exportCustomersToCSV);
    }

    PawpalCustomers.subtabs.list = {
        init: initCustomerListTab,
        renderCustomersTable,
        updateCustomerKPIs,
        renderComplaintBar,
        clearAllCustomerFilters,
        exportCustomersToCSV
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCustomerListTab);
    } else {
        initCustomerListTab();
    }
})();
