// tab-staff-list.js - Subtab Danh sách nhân sự Pawpal-er
(function() {
    'use strict';

    const PawpalStaff = window.PawpalStaff = window.PawpalStaff || {};
    PawpalStaff.subtabs = PawpalStaff.subtabs || {};

    let currentStaffPage = 1;
    const STAFF_PAGE_SIZE = 10;

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getFilteredStaffList() {
        const staffList = PawpalStaff.state?.mockStaff || [];
        const searchInput = document.getElementById('staffSearchInput');
        const roleFilter = document.getElementById('staffFilterRole');
        const shiftFilter = document.getElementById('staffFilterShift');
        const statusFilter = document.getElementById('staffFilterStatus');
        const retrainToggle = document.getElementById('staffFilterRetrainOnly');

        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const role = roleFilter ? roleFilter.value : 'ALL';
        const shift = shiftFilter ? shiftFilter.value : 'ALL';
        const status = statusFilter ? statusFilter.value : 'ALL';
        const isRetrainOnly = retrainToggle ? retrainToggle.classList.contains('active') : false;

        const toUnaccent = PawpalStaff.toUnaccent || (str => str);

        return staffList.filter(s => {
            if (query) {
                const qUnaccent = toUnaccent(query);
                const matchName = toUnaccent(s.name || '').includes(qUnaccent) || (s.name || '').toLowerCase().includes(query);
                const matchId = (s.id || '').toLowerCase().includes(query);
                const matchPhone = (s.phone || '').includes(query);
                const matchEmail = (s.email || '').toLowerCase().includes(query);
                const matchPos = toUnaccent(s.position || '').includes(qUnaccent);
                if (!matchName && !matchId && !matchPhone && !matchEmail && !matchPos) return false;
            }

            if (role !== 'ALL' && s.role !== role) return false;
            if (shift !== 'ALL' && s.shift !== shift) return false;
            if (status !== 'ALL' && s.status !== status) return false;

            if (isRetrainOnly) {
                if (s.skillResult !== 'RETRAIN' && s.skillResult !== 'FAIL' && !s.serviceLocked) {
                    return false;
                }
            }

            return true;
        });
    }

    function renderStaffPagination(totalPages) {
        const pagContainer = document.getElementById('staffPagination');
        if (!pagContainer) return;

        if (totalPages === 0) {
            pagContainer.innerHTML = '';
            pagContainer.style.display = 'none';
            return;
        }
        pagContainer.style.display = 'flex';

        const actualPages = Math.max(1, totalPages);
        let html = '';
        const prevDisabled = currentStaffPage === 1 ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${prevDisabled}" data-page="prev" ${prevDisabled ? 'disabled' : ''} title="Trang trước">&lt;</button>`;

        for (let p = 1; p <= actualPages; p++) {
            const activeClass = p === currentStaffPage ? 'active' : '';
            html += `<button type="button" class="btn-pagination ${activeClass}" data-page="${p}">${p}</button>`;
        }

        const nextDisabled = currentStaffPage === actualPages ? 'disabled' : '';
        html += `<button type="button" class="btn-pagination ${nextDisabled}" data-page="next" ${nextDisabled ? 'disabled' : ''} title="Trang sau">&gt;</button>`;

        pagContainer.innerHTML = html;

        pagContainer.querySelectorAll('.btn-pagination').forEach(btn => {
            btn.addEventListener('click', () => {
                const pageAction = btn.getAttribute('data-page');
                if (pageAction === 'prev') {
                    if (currentStaffPage > 1) {
                        currentStaffPage--;
                        renderStaffList();
                    }
                } else if (pageAction === 'next') {
                    if (currentStaffPage < actualPages) {
                        currentStaffPage++;
                        renderStaffList();
                    }
                } else {
                    const targetP = parseInt(pageAction, 10);
                    if (targetP && targetP !== currentStaffPage) {
                        currentStaffPage = targetP;
                        renderStaffList();
                    }
                }
            });
        });
    }

    function renderStaffList() {
        const tbody = document.getElementById('staffListTableBody');
        if (!tbody) return;
        const staffList = PawpalStaff.state?.mockStaff || [];
        if (staffList.length === 0) return;
        tbody.innerHTML = '';

        const list = getFilteredStaffList();
        const totalPages = Math.ceil(list.length / STAFF_PAGE_SIZE);

        if (currentStaffPage > totalPages && totalPages > 0) {
            currentStaffPage = totalPages;
        }
        if (currentStaffPage < 1) currentStaffPage = 1;

        if (list.length === 0) {
            const emptyTr = document.createElement('tr');
            emptyTr.innerHTML = `
                <td colspan="8" style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 13.5px;">
                    Không tìm thấy nhân viên nào phù hợp với điều kiện lọc hiện tại. 
                    <button type="button" id="btnResetStaffFilters" style="background: none; border: none; color: #236B48; font-weight: 600; text-decoration: underline; cursor: pointer; padding: 0 4px; font-size: 13.5px;">Xóa bộ lọc</button>
                </td>
            `;
            tbody.appendChild(emptyTr);
            document.getElementById('btnResetStaffFilters')?.addEventListener('click', clearAllStaffFilters);
            renderStaffPagination(0);
            return;
        }

        const startIndex = (currentStaffPage - 1) * STAFF_PAGE_SIZE;
        const pageList = list.slice(startIndex, startIndex + STAFF_PAGE_SIZE);

        pageList.forEach(staff => {
            let statusBadge = '';
            if (staff.status === 'ACTIVE') statusBadge = '<span class="admin-badge badge-success">Đang làm việc</span>';
            else if (staff.status === 'LEAVE') statusBadge = '<span class="admin-badge badge-warning">Nghỉ phép</span>';
            else if (staff.status === 'PAUSE') statusBadge = '<span class="admin-badge badge-neutral">Tạm nghỉ</span>';
            else statusBadge = '<span class="admin-badge badge-danger">Nghỉ việc</span>';

            let shiftText = staff.shift === 'MORNING' ? 'Ca sáng' : staff.shift === 'AFTERNOON' ? 'Ca chiều' : staff.shift === 'EVENING' ? 'Ca tối' : staff.shift === 'NIGHT' ? 'Ca khuya' : 'Toàn thời gian';

            let skillText = '';
            if (staff.skillResult === 'PASS') {
                skillText = `<span style="color: var(--text-main); font-size: 13px;">${staff.skillExam || 'Đạt tiêu chuẩn'}</span>`;
            } else if (staff.skillResult === 'RETRAIN') {
                skillText = `<span class="alert-indicator text-warning" style="font-weight: 500;">• ${staff.skillExam || 'Cần đào tạo lại'}</span>`;
            } else {
                skillText = `<span class="alert-indicator text-danger" style="font-weight: 500;">• ${staff.skillExam || 'Chưa đạt'}</span>`;
            }

            let lockStatusText = staff.serviceLocked
                ? `<div style="font-size: 11.5px; color: #DC2626; font-weight: 500; margin-top: 2px;">• Tạm khóa nhận việc</div>`
                : `<div style="font-size: 11.5px; color: var(--text-muted); font-weight: 500; margin-top: 2px;">• Sẵn sàng nhận lịch</div>`;

            const tr = document.createElement('tr');

            if (staff.status === 'RESIGNED') {
                tr.classList.add('row-locked');
            }
            if (staff.skillResult === 'FAIL') {
                tr.classList.add('row-highlight-danger');
            } else if (staff.skillResult === 'RETRAIN' || staff.serviceLocked) {
                tr.classList.add('row-highlight-warning');
            }

            tr.innerHTML = `
                <td>${staff.id}</td>
                <td><a href="javascript:void(0)" class="user-link-text btn-view-profile" data-id="${staff.id}" title="${escapeHtml(staff.name)}">${escapeHtml(staff.name)}</a></td>
                <td>${staff.position}</td>
                <td>${staff.phone}</td>
                <td>${shiftText}</td>
                <td>
                    <div style="display: flex; flex-direction: column; align-items: flex-start;">
                        ${skillText}
                        ${lockStatusText}
                    </div>
                </td>
                <td>${statusBadge}</td>
                <td style="text-align: center;">
                    <button class="btn-action-trigger btn-staff-action" data-id="${staff.id}">•••</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        renderStaffPagination(totalPages);
        attachActionDropdowns();
        attachProfileLinkEvents();
    }

    function clearAllStaffFilters() {
        const searchInput = document.getElementById('staffSearchInput');
        const roleFilter = document.getElementById('staffFilterRole');
        const shiftFilter = document.getElementById('staffFilterShift');
        const statusFilter = document.getElementById('staffFilterStatus');
        const retrainToggle = document.getElementById('staffFilterRetrainOnly');

        if (searchInput) searchInput.value = '';
        if (roleFilter) roleFilter.value = 'ALL';
        if (shiftFilter) shiftFilter.value = 'ALL';
        if (statusFilter) statusFilter.value = 'ALL';
        if (retrainToggle) retrainToggle.classList.remove('active');

        currentStaffPage = 1;
        renderStaffList();
    }

    function attachActionDropdowns() {
        const triggers = document.querySelectorAll('.btn-staff-action');
        const dropdown = document.getElementById('staffActionDropdown');
        if (!dropdown) return;

        triggers.forEach(trigger => {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                document.querySelectorAll('.action-dropdown-menu').forEach(m => m.style.display = 'none');
                
                const rect = trigger.getBoundingClientRect();
                dropdown.style.display = 'flex';
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = (rect.right - 180) + 'px';
                dropdown.setAttribute('data-current-id', trigger.getAttribute('data-id'));
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.action-dropdown-menu') && !e.target.closest('.btn-staff-action')) {
                dropdown.style.display = 'none';
            }
        });

        // Xử lý các action trong dropdown
        dropdown.querySelectorAll('.dropdown-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.style.display = 'none';
                const staffId = dropdown.getAttribute('data-current-id');
                const action = item.getAttribute('data-action');

                if (action === 'profile') {
                    if (PawpalStaff.openStaffProfile) PawpalStaff.openStaffProfile(staffId);
                } else if (action === 'edit') {
                    openStaffModal(staffId);
                } else if (action === 'lock') {
                    openReassignModal(staffId);
                }
            });
        });
    }

    function attachProfileLinkEvents() {
        document.querySelectorAll('.btn-view-profile').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const staffId = link.getAttribute('data-id');
                if (staffId && PawpalStaff.openStaffProfile) {
                    PawpalStaff.openStaffProfile(staffId);
                }
            });
        });
    }

    function renderStaffAlertBar() {
        const bar = document.getElementById('staffAlertStrip');
        if (!bar) return;
        const staffList = PawpalStaff.state?.mockStaff || [];

        const retrainList = staffList.filter(s => s.skillResult === 'RETRAIN' || s.skillResult === 'FAIL' || s.serviceLocked);
        if (retrainList.length === 0) {
            bar.style.display = 'none';
            return;
        }

        bar.style.display = 'flex';
        const container = bar.querySelector('.staff-alert-items');
        if (container) {
            container.innerHTML = retrainList.map(s => `
                <div class="alert-item-tag" data-staff-id="${s.id}">
                    <strong>${s.name}</strong> (${s.position}) - ${s.serviceLocked ? 'Khóa nhận lịch' : 'Cần đào tạo lại'}
                </div>
            `).join('');
        }
    }

    function openStaffModal(staffId = null) {
        const modal = document.getElementById('modalStaffForm');
        if (!modal) return;
        const staffList = PawpalStaff.state?.mockStaff || [];
        const staff = staffId ? staffList.find(s => s.id === staffId || s.rawId === staffId) : null;

        const titleEl = document.getElementById('modalStaffFormTitle');
        if (titleEl) titleEl.textContent = staff ? 'Chỉnh sửa hồ sơ nhân sự' : 'Thêm nhân sự mới';

        const nameInput = document.getElementById('staffFormName');
        const phoneInput = document.getElementById('staffFormPhone');
        const emailInput = document.getElementById('staffFormEmail');
        const roleSelect = document.getElementById('staffFormRole');
        const shiftSelect = document.getElementById('staffFormShift');
        const statusSelect = document.getElementById('staffFormStatus');
        const noteInput = document.getElementById('staffFormNote');

        if (staff) {
            if (nameInput) nameInput.value = staff.name || '';
            if (phoneInput) phoneInput.value = staff.phone || '';
            if (emailInput) emailInput.value = staff.email || '';
            if (roleSelect) roleSelect.value = staff.role || 'Groomer';
            if (shiftSelect) shiftSelect.value = staff.shift || 'MORNING';
            if (statusSelect) statusSelect.value = staff.status || 'ACTIVE';
            if (noteInput) noteInput.value = staff.note || '';
            modal.setAttribute('data-editing-id', staff.id);
        } else {
            if (nameInput) nameInput.value = '';
            if (phoneInput) phoneInput.value = '';
            if (emailInput) emailInput.value = '';
            if (roleSelect) roleSelect.value = 'Groomer';
            if (shiftSelect) shiftSelect.value = 'MORNING';
            if (statusSelect) statusSelect.value = 'ACTIVE';
            if (noteInput) noteInput.value = '';
            modal.removeAttribute('data-editing-id');
        }

        modal.classList.add('active');
    }

    function openReassignModal(staffId) {
        const staffList = PawpalStaff.state?.mockStaff || [];
        const staff = staffList.find(s => s.id === staffId);
        if (!staff) return;

        PawpalStaff.showStaffConfirmModal({
            title: staff.serviceLocked ? 'Mở khóa nhận lịch' : 'Khóa an toàn nhận lịch',
            message: staff.serviceLocked
                ? `Bạn có chắc muốn mở khóa nhận việc cho nhân viên ${staff.name}?`
                : `Khóa an toàn sẽ tạm ngừng gán ca mới cho ${staff.name} cho đến khi hoàn thành kỳ sát hạch. Bạn có đồng ý?`,
            confirmText: staff.serviceLocked ? 'Mở khóa' : 'Khóa nhận việc',
            isDanger: !staff.serviceLocked,
            onConfirm: async () => {
                staff.serviceLocked = !staff.serviceLocked;
                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client && staff.rawId) {
                        await client.from('staff').update({ service_locked: staff.serviceLocked }).eq('id', staff.rawId);
                    }
                } catch (e) {}
                renderStaffList();
                renderStaffAlertBar();
                PawpalStaff.showToast(staff.serviceLocked ? `Đã tạm khóa nhận việc của ${staff.name}!` : `Đã mở khóa nhận việc cho ${staff.name}!`);
            }
        });
    }

    function initStaffListSubtab() {
        const searchInput = document.getElementById('staffSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                currentStaffPage = 1;
                renderStaffList();
            });
        }

        const roleFilter = document.getElementById('staffFilterRole');
        if (roleFilter) {
            roleFilter.addEventListener('change', () => {
                currentStaffPage = 1;
                renderStaffList();
            });
        }

        const shiftFilter = document.getElementById('staffFilterShift');
        if (shiftFilter) {
            shiftFilter.addEventListener('change', () => {
                currentStaffPage = 1;
                renderStaffList();
            });
        }

        const statusFilter = document.getElementById('staffFilterStatus');
        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                currentStaffPage = 1;
                renderStaffList();
            });
        }

        const retrainToggle = document.getElementById('staffFilterRetrainOnly');
        if (retrainToggle) {
            retrainToggle.addEventListener('click', () => {
                retrainToggle.classList.toggle('active');
                currentStaffPage = 1;
                renderStaffList();
            });
        }

        // Nút thêm nhân sự mới
        const btnAddStaff = document.getElementById('btnOpenAddStaffModal');
        if (btnAddStaff) {
            btnAddStaff.addEventListener('click', () => openStaffModal());
        }

        // Xuất file CSV nhân sự
        const btnExportStaff = document.getElementById('btnExportStaffReport');
        if (btnExportStaff) {
            btnExportStaff.addEventListener('click', () => {
                const staffList = PawpalStaff.state?.mockStaff || [];
                const headers = ['Mã NV', 'Họ tên', 'Vị trí', 'Số điện thoại', 'Email', 'Ca làm việc', 'Năng lực tay nghề', 'Trạng thái'];
                const rows = staffList.map(s => [
                    `"${s.id || ''}"`,
                    `"${s.name || ''}"`,
                    `"${s.position || ''}"`,
                    `"${s.phone || ''}"`,
                    `"${s.email || ''}"`,
                    `"${s.shift || ''}"`,
                    `"${s.skillExam || ''}"`,
                    `"${s.status || ''}"`
                ]);

                const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                const now = new Date();
                const dateStr = `${now.getFullYear()}${String(now.getMonth()+1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
                link.setAttribute('href', url);
                link.setAttribute('download', `danh_sach_nhan_su_pawpal_${dateStr}.csv`);
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
                PawpalStaff.showToast('Đã xuất thành công danh sách nhân sự sang file CSV!');
            });
        }

        // Submit form nhân sự
        const btnSubmitStaffForm = document.getElementById('btnSubmitStaffForm');
        if (btnSubmitStaffForm) {
            btnSubmitStaffForm.addEventListener('click', async () => {
                const modal = document.getElementById('modalStaffForm');
                const editingId = modal?.getAttribute('data-editing-id');
                const name = document.getElementById('staffFormName')?.value.trim();
                const phone = document.getElementById('staffFormPhone')?.value.trim();
                const email = document.getElementById('staffFormEmail')?.value.trim();
                const role = document.getElementById('staffFormRole')?.value;
                const shift = document.getElementById('staffFormShift')?.value;
                const status = document.getElementById('staffFormStatus')?.value;
                const note = document.getElementById('staffFormNote')?.value.trim();

                if (!name || !phone) {
                    PawpalStaff.showToast('Vui lòng nhập đầy đủ họ tên và số điện thoại!', 'warning');
                    return;
                }

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    if (client) {
                        if (editingId) {
                            const staffList = PawpalStaff.state?.mockStaff || [];
                            const staff = staffList.find(s => s.id === editingId);
                            if (staff && staff.rawId) {
                                await client.from('staff').update({
                                    full_name: name,
                                    phone_number: phone,
                                    email: email,
                                    role: role,
                                    shift: shift,
                                    status: status === 'ACTIVE' ? 'active' : (status === 'LEAVE' ? 'leave' : 'locked'),
                                    specialization: note
                                }).eq('id', staff.rawId);
                            }
                        } else {
                            await client.from('staff').insert({
                                full_name: name,
                                phone_number: phone,
                                email: email,
                                role: role,
                                shift: shift,
                                status: 'active',
                                specialization: note
                            });
                        }
                    }
                } catch (e) {
                    console.error('Error saving staff:', e);
                }

                await PawpalStaff.loadStaffModuleData();
                renderStaffList();
                renderStaffAlertBar();
                PawpalStaff.showToast(editingId ? 'Đã cập nhật hồ sơ nhân sự!' : 'Đã thêm nhân sự mới thành công!');
                if (modal) modal.classList.remove('active');
            });
        }

        renderStaffList();
        renderStaffAlertBar();
    }

    PawpalStaff.subtabs.list = {
        init: initStaffListSubtab,
        renderStaffList,
        renderStaffAlertBar,
        openStaffModal,
        openReassignModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStaffListSubtab);
    } else {
        initStaffListSubtab();
    }
})();
