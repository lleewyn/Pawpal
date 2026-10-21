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

    function sanitizePetDescriptor(value) {
        const normalized = String(value ?? '').trim();
        if (!normalized || /^\d+$/.test(normalized)) return '';
        const lowered = normalized.toLowerCase();
        if (['chưa rõ', 'chưa cập nhật', 'unknown', 'null', 'undefined'].includes(lowered)) return '';
        if (lowered === 'cat') return 'Mèo';
        if (lowered === 'dog') return 'Chó';
        return normalized;
    }

    function getPetDescriptor(pet) {
        return sanitizePetDescriptor(pet?.breed) || sanitizePetDescriptor(pet?.species) || '—';
    }

    const esc = (s) => (PawpalCustomers.escapeHtml ? PawpalCustomers.escapeHtml(s) : String(s || ''));

    function formatCustomerPetsCell(pets) {
        if (!pets || pets.length === 0) {
            return `<span class="customer-pet-sub">Chưa có thú cưng</span>`;
        }
        if (pets.length === 1) {
            const p = pets[0];
            const breedText = esc(getPetDescriptor(p));
            return `
                <div class="customer-pet-cell">${esc(p.name)}</div>
                <div class="customer-pet-sub">${breedText}</div>
            `;
        }
        const mainPet = pets[0];
        const moreCount = pets.length - 1;
        const cleanDescriptors = pets.map(getPetDescriptor).filter(value => value !== '—');
        const allBreeds = esc([...new Set(cleanDescriptors)].join(', ') || '—');
        const fullTooltip = esc(pets.map(p => `${p.name} (${getPetDescriptor(p)})`).join(', '));

        return `
            <div class="customer-pet-cell">${esc(mainPet.name)} <span class="customer-pet-more">(+${moreCount} bé)</span></div>
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
        if (!PawpalCustomers.state.hasLoadedCustomers) {
            if (PawpalCustomers.state.listLoadStatus !== 'error') return;
            ['custStatTotal', 'custStatMember', 'custStatGuest', 'custStatLocked', 'custStatComplaint'].forEach(id => {
                const element = document.getElementById(id);
                if (element) element.textContent = '—';
            });
            return;
        }
        const totalEl = document.getElementById('custStatTotal');
        const memberEl = document.getElementById('custStatMember');
        const guestEl = document.getElementById('custStatGuest');
        const lockedEl = document.getElementById('custStatLocked');
        const complaintEl = document.getElementById('custStatComplaint');

        const allCusts = Object.values(PawpalCustomers.state.customerDatabase || {});
        const totalCount = allCusts.length;
        const memberCount = allCusts.filter(c => c.isMember).length;
        const guestCount = allCusts.filter(c => c.status === 'TEMP').length;
        const lockedCount = allCusts.filter(c => c.status === 'LOCKED').length;
        const complaintCount = allCusts.filter(c => c.complaints?.some(tc => !tc.isClosed)).length;

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
        if (!PawpalCustomers.state.hasLoadedCustomers) {
            if (PawpalCustomers.state.listLoadStatus === 'error') {
                delete tbody.dataset.loadingSkeleton;
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 30px; color: var(--text-muted);">Không thể tải danh sách khách hàng. Vui lòng tải lại trang.</td></tr>';
            }
            return;
        }
        delete tbody.dataset.loadingSkeleton;

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

        const filtered = getCustomersInCurrentFilter();

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
            const isSuspended = (c.status === 'SUSPENDED');
            const isLocked = (c.status === 'LOCKED') || isSuspended;
            const activeComplaint = c.complaints && c.complaints.find(tc => !tc.isClosed);
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
                const ticketId = esc(ticket?.id || '');
                const ticketStatus = esc(ticket?.status || 'Chưa xử lý');
                alertBadgeHtml = `<span class="alert-indicator text-danger">• ${ticketId} · ${ticketStatus}</span>`;
            } else if (hasPetAlert && alertPet) {
                alertBadgeHtml = `<span class="alert-indicator text-warning">• ${esc(alertPet.name)}: ${esc(alertPet.alertNote)}</span>`;
            }

            let statusBadgeHtml = '<span class="admin-badge badge-success">Đang hoạt động</span>';
            if (isSuspended) {
                statusBadgeHtml = '<span class="admin-badge badge-warning">Tạm khóa</span>';
            } else if (c.status === 'LOCKED') {
                statusBadgeHtml = '<span class="admin-badge badge-danger">Đã khóa</span>';
            } else if (c.status === 'TEMP') {
                statusBadgeHtml = '<span class="admin-badge badge-neutral">Vãng lai</span>';
            }

            const subCellHtml = c.status === 'TEMP'
                ? 'Khách vãng lai tại quầy'
                : (c.email && c.email !== 'Chưa cập nhật' ? esc(c.email) : 'Chưa cập nhật email');

            const tierPointsHtml = `<span class="admin-badge ${esc(c.tierBadgeClass || 'badge-neutral')}">${esc(c.tierName || 'Chưa có hạng')}</span><span class="points-val">${(c.points || 0).toLocaleString('vi-VN')} điểm</span>`;

            return `
                <tr class="${rowLockedClass} ${rowComplaintClass}" data-id="${esc(c.id)}">
                    <td style="${firstTdBorder}"><strong class="customer-code-text" title="${esc(c.id)}">${esc(c.id)}</strong></td>
                    <td>
                        <div class="user-name-cell">
                            <a href="javascript:void(0)" class="user-name-link btn-open-profile-drawer" data-id="${esc(c.id)}">${esc(c.name)}</a>
                        </div>
                        <div class="user-sub-cell">${subCellHtml}</div>
                    </td>
                    <td><strong>${esc(c.phone)}</strong></td>
                    <td>
                        ${formatCustomerPetsCell(c.pets)}
                    </td>
                    <td>
                        ${tierPointsHtml}
                    </td>
                    <td>${alertBadgeHtml}</td>
                    <td>${statusBadgeHtml}</td>
                    <td style="width: 70px; min-width: 70px; text-align: center; padding: 8px 10px;">
                        <button type="button" class="btn-action-more" data-id="${esc(c.id)}" title="Tác vụ">•••</button>
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
                cust.complaints.filter(tc => !tc.isClosed).forEach(tc => {
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
            <div class="complaint-item-tag" data-id="${esc(item.id)}" title="Xem hồ sơ ${esc(item.name)} (${esc(item.ticket)})">
                <span class="tag-ticket">${esc(item.ticket)}</span>
                <span class="tag-cust">${esc(item.name)}</span>
                <span class="tag-reason">(${esc(item.reason)})</span>
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
                lockText.textContent = 'Mở khóa hồ sơ';
            } else {
                lockItem.className = 'dropdown-item text-danger';
                lockText.textContent = 'Khóa hồ sơ';
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
                matchCategory = c.isMember;
            } else if (currentCustomerFilter === 'TEMP') {
                matchCategory = (c.status === 'TEMP');
            } else if (currentCustomerFilter === 'LOCKED') {
                matchCategory = (c.status === 'LOCKED' || c.status === 'SUSPENDED');
            } else if (currentCustomerFilter === 'COMPLAINT') {
                matchCategory = Boolean(c.complaints?.some(tc => !tc.isClosed));
            }

            const matchStatus = (selectedStatus === 'ALL') ||
                (selectedStatus === 'LOCKED' && (c.status === 'LOCKED' || c.status === 'SUSPENDED')) ||
                (c.status === selectedStatus);

            return matchQuery && matchTier && matchCategory && matchStatus;
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

        const userRole = (sessionStorage.getItem('pawpal_admin_system_role') || sessionStorage.getItem('pawpal_user_role') || 'ADMIN').toUpperCase();
        const canViewFullPii = userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'CSKH';

        const rows = allCusts.map(c => {
            const petsList = (c.pets || []).map(p => `${p.name} (${p.species || 'Chó/Mèo'})`).join('; ');
            const defaultAddr = (c.addresses || []).find(a => a.isDefault)?.address || (c.addresses?.[0]?.address || '');
            const statusText = c.status === 'ACTIVE' ? 'Đang hoạt động' : (c.status === 'TEMP' ? 'Tài khoản tạm' : 'Bị khóa');
            const cleanPhone = (c.phone || '').trim();
            const phoneDisplay = canViewFullPii
                ? cleanPhone
                : (cleanPhone.length >= 7 ? cleanPhone.slice(0, 3) + '••••' + cleanPhone.slice(-3) : '••••');

            return [
                c.id || '',
                c.name || '',
                phoneDisplay,
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

        const sanitizeCsvCell = (val) => {
            let s = String(val === null || val === undefined ? '' : val);
            if (/^[=+\-@\t\r]/.test(s)) {
                s = "'" + s;
            }
            return `"${s.replace(/"/g, '""')}"`;
        };

        const csvRows = [
            headers.map(sanitizeCsvCell).join(','),
            ...rows.map(row => row.map(sanitizeCsvCell).join(','))
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

        // Taxonomy comes exclusively from the V1 catalog.
        let taxonomy = { species: [], breeds: [] };
        let taxonomyLoading = null;
        async function loadTaxonomy() {
            if (taxonomyLoading) return taxonomyLoading;
            const db = window.getSupabaseClient();
            taxonomyLoading = Promise.all([
                db.from('pet_species').select('id, species_name').eq('is_active', true).order('species_name'),
                db.from('pet_breed').select('id, species_id, breed_name').eq('is_active', true).order('breed_name')
            ]).then(results => {
                for (const result of results) if (result.error) throw result.error;
                const clean = value => value && !/^\d+$|^(chưa rõ|chưa cập nhật|unknown|null|undefined)$/i.test(value.trim());
                taxonomy = { species: results[0].data.filter(s => clean(s.species_name)), breeds: results[1].data.filter(b => clean(b.breed_name)) };
            }).finally(() => { taxonomyLoading = null; });
            return taxonomyLoading;
        }
        const speciesInput = document.getElementById('quickAddPetSpecies');
        const breedInput = document.getElementById('quickAddPetBreed');
        const resetSelection = input => {
            input.value = ''; delete input.dataset.id; input.style.display = '';
            input.parentElement.querySelector('.quick-selected-card')?.remove();
        };
        function wireTaxonomy(input, dropdown, rows, nameOf, onSelect) {
            function render() {
                const list = rows().filter(row => PawpalCustomers.matchSearch(nameOf(row), input.value));
                dropdown.innerHTML = list.map(row => `<div class="autocomplete-item" data-id="${esc(row.id)}"><div class="autocomplete-item-name">${esc(nameOf(row))}</div></div>`).join('') || '<div class="autocomplete-empty">Không có lựa chọn phù hợp trong danh mục.</div>';
                dropdown.style.display = 'block';
            }
            input.addEventListener('focus', async () => {
                try { await loadTaxonomy(); render(); }
                catch { dropdown.innerHTML = '<div class="autocomplete-empty">Không thể tải danh mục. Vui lòng thử lại.</div>'; dropdown.style.display = 'block'; }
            });
            input.addEventListener('input', () => { delete input.dataset.id; render(); });
            dropdown.addEventListener('click', event => {
                const row = rows().find(r => r.id === event.target.closest('[data-id]')?.dataset.id);
                if (!row) return;
                input.value = nameOf(row); input.dataset.id = row.id;
                const error = document.getElementById(input.id + 'Error');
                if (error) error.textContent = '';
                input.setAttribute('aria-invalid', 'false');
                input.style.display = 'none'; dropdown.style.display = 'none';
                const card = document.createElement('div'); card.className = 'adjust-customer-selected-card quick-selected-card';
                card.innerHTML = `<span>${esc(nameOf(row))}</span><button type="button" class="btn-text-add-address">✕ Bỏ chọn</button>`;
                card.querySelector('button').addEventListener('click', () => { resetSelection(input); onSelect?.(); input.focus(); });
                input.parentElement.appendChild(card); onSelect?.();
            });
            document.addEventListener('click', event => { if (!input.parentElement.contains(event.target)) dropdown.style.display = 'none'; });
        }
        wireTaxonomy(speciesInput, document.getElementById('quickAddPetSpeciesDropdown'), () => taxonomy.species, s => s.species_name, () => resetSelection(breedInput));
        wireTaxonomy(breedInput, document.getElementById('quickAddPetBreedDropdown'), () => taxonomy.breeds.filter(b => b.species_id === speciesInput.dataset.id), b => b.breed_name);

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
            const saveButton = document.getElementById('btnSubmitAddCustomer');
            let saving = false;
            const fieldError = (id, message) => {
                const input = document.getElementById(id);
                let error = document.getElementById(id + 'Error');
                if (!error) { error = document.createElement('div'); error.id = id + 'Error'; error.style.cssText = 'color:#DC2626;font-size:12px;margin-top:4px;'; input.parentElement.appendChild(error); }
                error.textContent = message; input.setAttribute('aria-invalid', String(Boolean(message)));
                input.setAttribute('aria-describedby', error.id);
            };
            const fields = ['quickAddName','quickAddPhone','quickAddPetName','quickAddPetSpecies','quickAddPetBreed','quickAddPetWeight','quickAddAddress','quickAddProvince'];
            fields.forEach(id => document.getElementById(id).addEventListener('input', () => fieldError(id, '')));
            async function saveCustomer() {
                if (saving) return;
                const value = id => document.getElementById(id).value.trim();
                const name = value('quickAddName').replace(/\s+/g, ' '), phone = value('quickAddPhone');
                const petName = value('quickAddPetName'), weightText = value('quickAddPetWeight');
                const address = value('quickAddAddress'), province = value('quickAddProvince');
                const errors = {};
                if (name.length < 2 || name.length > 200) errors.quickAddName = 'Họ tên cần từ 2 đến 200 ký tự.';
                if (!/^0[0-9]{9}$/.test(phone)) errors.quickAddPhone = 'Nhập số điện thoại gồm 10 chữ số, bắt đầu bằng 0.';
                if (dupFoundCustId) errors.quickAddPhone = 'Số điện thoại đã thuộc về khách khác. Bạn có thể mở hồ sơ có sẵn.';
                if (petName.length > 200) errors.quickAddPetName = 'Tên bé cưng tối đa 200 ký tự.';
                if (!petName && (speciesInput.value || breedInput.value || weightText)) errors.quickAddPetName = 'Nhập tên bé cưng khi có thông tin thú cưng.';
                if (petName && !speciesInput.dataset.id) errors.quickAddPetSpecies = 'Chọn loài từ danh mục.';
                if (petName && !taxonomy.breeds.some(b => b.id === breedInput.dataset.id && b.species_id === speciesInput.dataset.id)) errors.quickAddPetBreed = 'Chọn giống thuộc loài đã chọn.';
                if (weightText && (!Number.isFinite(Number(weightText)) || Number(weightText) <= 0 || Number(weightText) > 1000)) errors.quickAddPetWeight = 'Cân nặng phải lớn hơn 0 và không quá 1.000 kg.';
                if (address && !province) errors.quickAddProvince = 'Nhập tỉnh hoặc thành phố của địa chỉ.';
                if (province && !address) errors.quickAddAddress = 'Nhập địa chỉ nhận hàng hoặc để trống cả hai trường.';
                fields.forEach(id => fieldError(id, errors[id] || ''));
                if (Object.keys(errors).length) { document.getElementById(Object.keys(errors)[0]).focus(); return; }
                saving = true; saveButton.disabled = true; saveButton.textContent = 'Đang lưu';
                try {
                    const { error } = await window.getSupabaseClient().rpc('create_customer_quick', {
                        p_full_name: name, p_phone: phone, p_address: address || null, p_province: province || null,
                        p_pet_name: petName || null, p_breed_id: petName ? breedInput.dataset.id : null,
                        p_weight: weightText ? Number(weightText) : null
                    });
                    if (error) {
                        if (error.message?.includes('customer_phone_exists')) { fieldError('quickAddPhone', 'Số điện thoại đã được sử dụng. Vui lòng mở hồ sơ có sẵn.'); return; }
                        throw error;
                    }
                    formAdd.reset(); resetSelection(speciesInput); resetSelection(breedInput);
                    closeAddModal();
                    await PawpalCustomers.loadCustomersModuleData({ force: true });
                    PawpalCustomers.showToast('Đã lưu hồ sơ khách hàng.', 'success');
                    if (PawpalCustomers.state.listLoadStatus === 'error') PawpalCustomers.showToast('Đã lưu khách nhưng chưa tải lại được danh sách. Vui lòng làm mới.', 'warning');
                } catch (error) {
                    console.error('[Customers] V1 intake failed:', error.code || 'connection');
                    PawpalCustomers.showToast('Chưa thể lưu hồ sơ. Vui lòng kiểm tra kết nối và thử lại.', 'danger');
                } finally { saving = false; saveButton.disabled = false; saveButton.textContent = 'Lưu khách hàng'; }
            }
            saveButton.addEventListener('click', saveCustomer);
            formAdd.addEventListener('submit', event => { event.preventDefault(); saveCustomer(); });
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
                    PawpalCustomers.subtabs.pawpoint.openAdjustPointsModal(custId);
                }
            } else if (action === 'toggle-lock') {
                const custObj = PawpalCustomers.state.customerDatabase[custId];
                if (!custObj || !custObj.dbId) return;
                const isLocking = custObj.status !== 'LOCKED';
                const newStatus = isLocking ? 'locked' : 'active';
                const expectedUiStatus = isLocking ? 'LOCKED' : 'ACTIVE';
                PawpalCustomers.showCustomerConfirmModal({
                    title: isLocking ? 'Khóa hồ sơ khách hàng' : 'Mở khóa hồ sơ khách hàng',
                    message: isLocking
                        ? `Bạn có chắc chắn muốn khóa hồ sơ của ${custObj.name}?`
                        : `Bạn có chắc chắn muốn mở khóa hồ sơ của ${custObj.name}?`,
                    acceptText: isLocking ? 'Khóa hồ sơ' : 'Mở khóa hồ sơ',
                    onAccept: async () => {
                        const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                        if (!client) {
                            PawpalCustomers.showToast('Không thể kết nối cơ sở dữ liệu.', 'danger');
                            return;
                        }
                        try {
                            const {error:lockErr}=await client.rpc('set_customer_status',{
                                p_customer_id:custObj.dbId,p_expected_updated_at:custObj.updatedAt,p_status:newStatus
                            });
                            if(lockErr){
                                PawpalCustomers.showToast(lockErr.code==='PT409'?'Hồ sơ đã thay đổi. Vui lòng làm mới rồi thử lại.':'Không thể cập nhật trạng thái hồ sơ.','warning');
                                return;
                            }
                            await PawpalCustomers.loadCustomersModuleData({ force: true });
                            const refreshedCustomer = PawpalCustomers.state.customerDatabase?.[custId];
                            if (!refreshedCustomer || refreshedCustomer.status !== expectedUiStatus) {
                                PawpalCustomers.showToast('Trạng thái chưa được đồng bộ. Vui lòng tải lại và thử lại.', 'danger');
                                return;
                            }
                            renderCustomersTable();
                            updateCustomerKPIs();
                            PawpalCustomers.showToast(isLocking ? `Đã khóa hồ sơ khách hàng ${custObj.name}.` : `Đã mở khóa hồ sơ khách hàng ${custObj.name}.`, 'success');
                        } catch (err) {
                            console.error('[Customers] Lỗi cập nhật trạng thái:', err);
                            PawpalCustomers.showToast('Đã xảy ra lỗi khi cập nhật trạng thái.', 'danger');
                        }
                    }
                });
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
                if (filterStatusSelect) filterStatusSelect.value = 'ALL';
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
                if (searchInput) searchInput.value = '';
                if (filterTierSelect) filterTierSelect.value = 'ALL';
                if (filterStatusSelect) {
                    if (filter === 'LOCKED') filterStatusSelect.value = 'LOCKED';
                    else if (filter === 'TEMP') filterStatusSelect.value = 'TEMP';
                    else if (filter === 'MEMBER') filterStatusSelect.value = 'ACTIVE';
                    else filterStatusSelect.value = 'ALL';
                }
                currentCustomerPage = 1;
                renderCustomersTable();
            });
        });

        document.getElementById('btnExportCustomerReport')?.addEventListener('click', exportCustomersToCSV);

        renderCustomersTable();
        updateCustomerKPIs();
        renderComplaintBar();
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
