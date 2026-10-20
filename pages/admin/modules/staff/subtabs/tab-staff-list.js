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

    function updateStaffKpis() {
        if (!PawpalStaff.state.isLoaded) return;
        const staffList = PawpalStaff.state?.mockStaff || [];
        const total = staffList.length;
        const active = staffList.filter(s => s.status === 'ACTIVE').length;
        const leave = staffList.filter(s => s.status === 'LEAVE').length;
        const pause = staffList.filter(s => s.status === 'PAUSE').length;
        const retrain = staffList.filter(s => s.skillResult === 'RETRAIN' || s.skillResult === 'FAIL' || s.serviceLocked).length;

        const totalEl = document.getElementById('statTotalStaff');
        const activeEl = document.getElementById('statActiveStaff');
        const leaveEl = document.getElementById('statLeaveStaff');
        const pauseEl = document.getElementById('statPauseStaff');
        const retrainEl = document.getElementById('statRetrainStaff');

        if (totalEl) totalEl.textContent = total;
        if (activeEl) activeEl.textContent = active;
        if (leaveEl) leaveEl.textContent = leave;
        if (pauseEl) pauseEl.textContent = pause;
        if (retrainEl) retrainEl.textContent = retrain;
    }

    function getFilteredStaffList() {
        const staffList = PawpalStaff.state?.mockStaff || [];
        const searchInput = document.getElementById('staffSearchInput');
        const roleFilter = document.getElementById('staffFilterPosition') || document.getElementById('staffFilterRole');
        const shiftFilter = document.getElementById('staffFilterShift');
        const statusFilter = document.getElementById('staffFilterStatus');
        const retrainToggle = document.getElementById('btnFilterRetrainOnly') || document.getElementById('staffFilterRetrainOnly');
        const lockToggle = document.getElementById('btnFilterLockOnly');

        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        const role = roleFilter ? roleFilter.value : 'ALL';
        const shift = shiftFilter ? shiftFilter.value : 'ALL';
        const status = statusFilter ? statusFilter.value : 'ALL';
        const isRetrainOnly = retrainToggle ? retrainToggle.classList.contains('active') : false;
        const isLockOnly = lockToggle ? lockToggle.classList.contains('active') : false;

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

            if (role !== 'ALL') {
                const sRole = (s.role || '').toLowerCase();
                const sPos = (s.position || '').toLowerCase();
                const rLower = role.toLowerCase();
                const matchRole = sRole.includes(rLower) || sPos.includes(rLower) || (role === 'MEDICAL_CAREGIVER' && (sRole.includes('vet') || sRole.includes('caregiver') || sPos.includes('bác sĩ') || sPos.includes('bảo mẫu')));
                if (!matchRole) return false;
            }

            if (shift !== 'ALL' && s.shift !== shift) return false;
            if (status !== 'ALL' && s.status !== status) return false;

            if (isRetrainOnly) {
                if (s.skillResult !== 'RETRAIN' && s.skillResult !== 'FAIL' && !s.serviceLocked) {
                    return false;
                }
            }

            if (isLockOnly && !s.serviceLocked) {
                return false;
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
        if (PawpalStaff.state.loadError) {
            const target=document.getElementById('staffListTableBody');
            if(target)target.innerHTML='<tr><td colspan="8" style="padding:28px;text-align:center;">Không thể tải dữ liệu nhân sự. Vui lòng tải lại trang.</td></tr>';
            return;
        }
        if (!PawpalStaff.state.isLoaded) return;
        updateStaffKpis();
        const tbody = document.getElementById('staffListTableBody');
        if (!tbody) return;
        const staffList = PawpalStaff.state?.mockStaff || [];
        tbody.innerHTML = '';

        if (staffList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 13.5px;">
                        Chưa có dữ liệu nhân sự.
                    </td>
                </tr>
            `;
            renderStaffPagination(0);
            return;
        }

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

            let shiftText = staff.shift === 'MORNING' ? 'Ca sáng' : staff.shift === 'AFTERNOON' ? 'Ca chiều' : staff.shift === 'EVENING' ? 'Ca tối' : staff.shift === 'NIGHT' ? 'Ca khuya' : 'Chưa phân ca';

            let skillText = '';
            if (!staff.skillResult) { skillText = '<span>Chưa đánh giá</span>'; } else if (staff.skillResult === 'PASS') {
                skillText = `<span style="color: var(--text-main); font-size: 13px;">${staff.skillExam || 'Đạt tiêu chuẩn'}</span>`;
            } else if (staff.skillResult === 'RETRAIN') {
                skillText = `<span class="alert-indicator text-warning" style="font-weight: 500;">• ${staff.skillExam || 'Cần đào tạo lại'}</span>`;
            } else {
                skillText = `<span class="alert-indicator text-danger" style="font-weight: 500;">• ${staff.skillExam || 'Chưa đạt'}</span>`;
            }

            let lockStatusText = staff.serviceLocked
                ? `<div style="font-size: 11.5px; color: #DC2626; font-weight: 500; margin-top: 2px;">• Tạm khóa nhận việc</div>`
                : `<div style="font-size: 11.5px; color: var(--text-muted); font-weight: 500; margin-top: 2px;"></div>`;

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
        const roleFilter = document.getElementById('staffFilterPosition') || document.getElementById('staffFilterRole');
        const shiftFilter = document.getElementById('staffFilterShift');
        const statusFilter = document.getElementById('staffFilterStatus');
        const retrainToggle = document.getElementById('btnFilterRetrainOnly') || document.getElementById('staffFilterRetrainOnly');
        const lockToggle = document.getElementById('btnFilterLockOnly');
        const clearBtn = document.getElementById('btnStaffClearFilters');
        const clearSearchBtn = document.getElementById('btnClearStaffSearch');

        if (searchInput) searchInput.value = '';
        if (roleFilter) roleFilter.value = 'ALL';
        if (shiftFilter) shiftFilter.value = 'ALL';
        if (statusFilter) statusFilter.value = 'ALL';
        if (retrainToggle) retrainToggle.classList.remove('active');
        if (lockToggle) lockToggle.classList.remove('active');
        if (clearBtn) clearBtn.style.display = 'none';
        if (clearSearchBtn) clearSearchBtn.style.display = 'none';

        document.querySelectorAll('.staff-kpi-grid .kpi-card-clickable').forEach(c => {
            c.classList.toggle('active', c.getAttribute('data-kpi-filter') === 'ALL');
        });

        currentStaffPage = 1;
        renderStaffList();
    }

    let _isDropdownActionsBound = false;

    function attachActionDropdowns() {
        const triggers = document.querySelectorAll('.btn-staff-action');
        const dropdown = document.getElementById('staffActionDropdown');
        if (!dropdown) return;

        triggers.forEach(trigger => {
            trigger.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                document.querySelectorAll('.action-dropdown-menu').forEach(m => m.style.display = 'none');
                
                const rect = trigger.getBoundingClientRect();
                dropdown.style.display = 'flex';
                dropdown.style.top = (rect.bottom + 4) + 'px';
                dropdown.style.left = Math.max(10, rect.right - 180) + 'px';
                dropdown.setAttribute('data-current-id', trigger.getAttribute('data-id'));
            };
        });

        if (!_isDropdownActionsBound) {
            _isDropdownActionsBound = true;

            document.addEventListener('click', (e) => {
                if (!e.target.closest('.action-dropdown-menu') && !e.target.closest('.btn-staff-action')) {
                    dropdown.style.display = 'none';
                }
            });

            // Xử lý các action trong dropdown
            dropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
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
                    } else if (action === 'schedule') {
                        if (PawpalStaff.switchSubtab) PawpalStaff.switchSubtab('tab-staff-schedule');
                    } else if (action === 'assess') {
                        if (PawpalStaff.switchSubtab) PawpalStaff.switchSubtab('tab-staff-assessment');
                    } else if (action === 'delete') {
                        const staffList = PawpalStaff.state?.mockStaff || [];
                        const staff = staffList.find(s => s.id === staffId || s.rawId === staffId);
                        PawpalStaff.showStaffConfirmModal({
                            title: 'Xác nhận xóa nhân viên',
                            message: `Bạn có chắc chắn muốn xóa nhân viên ${staff?.name || ''} (${staffId}) khỏi hệ thống không?`,
                            confirmText: 'Xác nhận xóa',
                            isDanger: true,
                            onConfirm: async () => {
                                try {
                                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                                    if (!client) throw new Error('Chưa kết nối cơ sở dữ liệu Supabase.');
                                    if (!staff?.rawId) throw new Error('Không tìm thấy ID nhân viên hợp lệ.');
                                    const { error: delErr } = await client.from('staff').delete().eq('id', staff.rawId);
                                    if (delErr) throw delErr;

                                    PawpalStaff.state.mockStaff = (PawpalStaff.state?.mockStaff || []).filter(s => s.id !== staffId && s.rawId !== staffId);
                                    renderStaffList();
                                    renderStaffAlertBar();
                                    PawpalStaff.showToast('Đã xóa nhân viên khỏi hệ thống thành công.', 'success');
                                } catch (delErr) {
                                    console.error('Lỗi xóa nhân viên:', delErr);
                                    PawpalStaff.showToast(`Không thể xóa nhân viên: ${delErr?.message || 'Có dữ liệu ràng buộc hoặc lỗi quyền truy cập'}`, 'danger');
                                }
                            }
                        });
                    }
                });
            });
        }
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
        const bar = document.getElementById('staffAlertBar') || document.getElementById('staffAlertStrip');
        if (!bar) return;
        const staffList = PawpalStaff.state?.mockStaff || [];

        const retrainList = staffList.filter(s => s.skillResult === 'RETRAIN' || s.skillResult === 'FAIL' || s.serviceLocked);
        if (retrainList.length === 0) {
            bar.style.display = 'none';
            return;
        }

        bar.style.display = 'flex';
        const container = document.getElementById('staffAlertItemsContainer') || bar.querySelector('.alert-strip-items') || bar.querySelector('.staff-alert-items');
        if (container) {
            container.innerHTML = retrainList.map(s => `
                <div class="alert-item-tag" data-staff-id="${s.id}" style="cursor: pointer;">
                    <strong>${escapeHtml(s.name)}</strong> (${escapeHtml(s.position)}) - ${s.serviceLocked ? 'Khóa nhận việc' : 'Cần đào tạo lại'}
                </div>
            `).join('');

            container.querySelectorAll('.alert-item-tag').forEach(tag => {
                tag.addEventListener('click', () => {
                    const sId = tag.getAttribute('data-staff-id');
                    if (sId && PawpalStaff.openStaffProfile) {
                        PawpalStaff.openStaffProfile(sId);
                    }
                });
            });
        }
    }

    function parseToInputDate(dateStr) {
        if (!dateStr) return '';
        const s = String(dateStr).trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
        const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
        if (match) return `${match[3]}-${match[2]}-${match[1]}`;
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
            const yyyy = d.getFullYear();
            const mm = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
        return '';
    }

    function openStaffModal(staffId = null) {
        const modal = document.getElementById('staffModalOverlay');
        if (!modal) return;
        const staffList = PawpalStaff.state?.mockStaff || [];
        const staff = staffId ? staffList.find(s => s.id === staffId || s.rawId === staffId) : null;

        const titleEl = document.getElementById('staffModalTitle');
        if (titleEl) titleEl.textContent = staff ? 'Chỉnh sửa hồ sơ nhân viên' : 'Thêm nhân viên mới';

        const nameInput = document.getElementById('staffInputName');
        const phoneInput = document.getElementById('staffInputPhone');
        const emailInput = document.getElementById('staffInputEmail');
        const addrInput = document.getElementById('staffInputAddress');
        const dobInput = document.getElementById('staffInputDob');
        const joinDateInput = document.getElementById('staffInputJoinDate');
        const posSelect = document.getElementById('staffInputPosition');
        const shiftSelect = document.getElementById('staffInputShift');
        const specInput = document.getElementById('staffInputSpecialization');

        const enableAccountToggle = document.getElementById('staffEnableAccountToggle');
        const accountSection = document.getElementById('staffAccountConfigSection');
        const accountStatusRow = document.getElementById('staffAccountStatusRow');
        const accountEmailInput = document.getElementById('staffAccountEmail');
        const accountPassInput = document.getElementById('staffAccountPassword');

        if (staff) {
            modal.setAttribute('data-editing-id', staff.id);
            if (nameInput) nameInput.value = staff.name || '';
            if (phoneInput) phoneInput.value = staff.phone || '';
            if (emailInput) emailInput.value = (staff.email && staff.email !== 'Chưa cập nhật') ? staff.email : '';
            if (addrInput) addrInput.value = (staff.address && staff.address !== 'Chưa cập nhật') ? staff.address : '';
            if (dobInput) dobInput.value = parseToInputDate(staff.dob) || '1998-01-01';
            if (joinDateInput) joinDateInput.value = parseToInputDate(staff.join_date) || '2024-01-01';
            if (posSelect) posSelect.value = staff.position || 'Kỹ thuật viên grooming';
            if (shiftSelect) shiftSelect.value = staff.shift || 'MORNING';
            if (specInput) specInput.value = staff.note || '';

            const hasAccount = Boolean(staff.authUserId);
            if (enableAccountToggle) enableAccountToggle.checked = hasAccount;
            if (accountSection) accountSection.style.display = hasAccount ? 'block' : 'none';
            if (accountStatusRow) accountStatusRow.style.display = hasAccount ? 'flex' : 'none';
            if (accountEmailInput) accountEmailInput.value = staff.email !== 'Chưa cập nhật' ? (staff.email || '') : '';
            if (accountPassInput) accountPassInput.value = '';

            const statusBadge = document.getElementById('staffAccountStatusBadge');
            if (statusBadge) {
                if (hasAccount) {
                    statusBadge.textContent = staff.accountStatus === 'ACTIVE' ? 'Đang hoạt động' : 'Đã khóa';
                    statusBadge.className = 'admin-badge ' + (staff.accountStatus === 'ACTIVE' ? 'badge-success' : 'badge-danger');
                } else {
                    statusBadge.textContent = 'Chưa cấp tài khoản';
                    statusBadge.className = 'admin-badge badge-neutral';
                }
            }

            const roleSelect = document.getElementById('staffAccountSystemRole');
            if (roleSelect && staff.systemRole) {
                roleSelect.value = staff.systemRole;
            }

            // Đồng bộ checkbox phân quyền
            const staffPerms = Array.isArray(staff.permissions) ? staff.permissions : [];
            document.querySelectorAll('#staffPermissionsGrid input[type="checkbox"]').forEach(cb => {
                cb.checked = staffPerms.includes(cb.value);
            });
        } else {
            modal.removeAttribute('data-editing-id');
            if (nameInput) nameInput.value = '';
            if (phoneInput) phoneInput.value = '';
            if (emailInput) emailInput.value = '';
            if (addrInput) addrInput.value = '';
            if (dobInput) dobInput.value = '1998-01-01';
            if (joinDateInput) {
                const today = new Date().toISOString().split('T')[0];
                joinDateInput.value = today;
            }
            if (posSelect) posSelect.value = 'Kỹ thuật viên grooming';
            if (shiftSelect) shiftSelect.value = 'MORNING';
            if (specInput) specInput.value = '';

            if (enableAccountToggle) enableAccountToggle.checked = false;
            if (accountSection) accountSection.style.display = 'none';
            if (accountStatusRow) accountStatusRow.style.display = 'none';
            if (accountEmailInput) accountEmailInput.value = '';
            if (accountPassInput) accountPassInput.value = '';
        }

        modal.classList.add('active');
    }

    async function openReassignModal(staffId) {
        const modal = document.getElementById('reassignModalOverlay');
        if (!modal) return;

        const staffList = PawpalStaff.state?.mockStaff || [];
        const currentStaff = staffList.find(s => s.id === staffId || s.rawId === staffId) || staffList[0];
        if (!currentStaff) return;
        
        modal.setAttribute('data-target-staff-id', currentStaff.id);
        modal.setAttribute('data-target-staff-raw-id', currentStaff.rawId || '');

        const warningText = document.getElementById('reassignModalWarningText');
        if (warningText) {
            warningText.innerHTML = `Nhân viên <strong>${escapeHtml(currentStaff.name)} (${escapeHtml(currentStaff.id)})</strong> đang có các ca hẹn dịch vụ trong ngày. Vui lòng phân công lại nhân sự để tránh gián đoạn dịch vụ.`;
        }

        // N-14: Danh sách KTV khả dụng khác để thay thế:
        // Phải là nhân sự ACTIVE, không nghỉ phép (LEAVE), không bị khóa dịch vụ (serviceLocked) và có chuyên môn phù hợp
        const availableReplacements = staffList.filter(s => 
            (s.id !== currentStaff.id && s.rawId !== currentStaff.rawId) &&
            s.status === 'ACTIVE' && 
            !s.serviceLocked &&
            (s.role === 'Grooming' || s.role === 'Bác sĩ thú y' || s.role === 'Kỹ thuật viên' || (s.position && s.position.includes('Kỹ thuật viên')))
        );

        // Nạp options vào dropdown chuyển nhanh tất cả
        const selectAllStaff = document.getElementById('reassignSelectAllStaff');
        if (selectAllStaff) {
            selectAllStaff.innerHTML = '<option value="">-- Chọn nhân sự thay thế cho tất cả ca --</option>' + 
                availableReplacements.map(s => `<option value="${escapeHtml(s.rawId || s.id)}">${escapeHtml(s.name)} (${escapeHtml(s.position)})</option>`).join('');
        }

        const tbody = document.getElementById('reassignBookingsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:18px;color:var(--text-muted);">Đang tải danh sách ca hẹn thực tế từ CSDL...</td></tr>';
        }

        modal.classList.add('active');

        // N-12: Query danh sách ca hẹn thật từ CSDL Supabase theo staff_id
        const client = PawpalStaff.getSupabaseClient ? PawpalStaff.getSupabaseClient() : window.SupabaseClient;
        let realBookings = [];
        if (client && currentStaff.rawId) {
            try {
                const todayStr = new Date().toISOString().slice(0, 10);
                const { data: appts, error: apptErr } = await client
                    .from('appointment')
                    .select('id, appointment_code, appointment_date, appointment_time, appointment_status, service:service_id(service_name), pet:pet_id(pet_name)')
                    .eq('staff_id', currentStaff.rawId)
                    .gte('appointment_date', todayStr)
                    .in('appointment_status', ['da_xac_nhan', 'cho_xac_nhan', 'dang_thuc_hien'])
                    .order('appointment_date', { ascending: true })
                    .limit(20);

                if (!apptErr && Array.isArray(appts)) {
                    realBookings = appts.map(a => ({
                        id: a.appointment_code || a.id,
                        rawId: a.id,
                        customerName: 'Khách hàng',
                        petName: a.pet?.pet_name || 'Bé cưng',
                        service: a.service?.service_name || 'Dịch vụ chăm sóc',
                        time: `${a.appointment_date} ${a.appointment_time || ''}`
                    }));
                }
            } catch (e) {
                console.error('Lỗi khi tải lịch hẹn của KTV cần khóa:', e);
            }
        }

        if (tbody) {
            if (realBookings.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" style="text-align: center; padding: 24px; color: var(--text-muted);">
                            Nhân viên hiện không có ca hẹn dịch vụ nào cần điều phối lại trong CSDL.
                        </td>
                    </tr>
                `;
            } else {
                tbody.innerHTML = realBookings.map(b => `
                    <tr>
                        <td style="font-weight: 600; color: var(--text-heading);">${escapeHtml(b.id)}</td>
                        <td>
                            <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(b.petName)}</div>
                            <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(b.customerName)}</div>
                        </td>
                        <td><span class="admin-badge badge-primary">${escapeHtml(b.service)}</span></td>
                        <td style="font-weight: 500;">${escapeHtml(b.time)}</td>
                        <td>
                            <select class="admin-select reassign-select-row" data-booking-raw-id="${escapeHtml(b.rawId)}" style="height: 32px; padding: 2px 8px; font-size: 12px;">
                                <option value="">-- Chọn KTV --</option>
                                ${availableReplacements.map(s => `<option value="${escapeHtml(s.rawId || s.id)}">${escapeHtml(s.name)}</option>`).join('')}
                            </select>
                        </td>
                    </tr>
                `).join('');
            }
        }

        // Khi thay đổi dropdown chuyển nhanh tất cả -> áp dụng cho tất cả hàng
        if (selectAllStaff) {
            selectAllStaff.onchange = () => {
                const selectedVal = selectAllStaff.value;
                if (selectedVal) {
                    modal.querySelectorAll('.reassign-select-row').forEach(sel => {
                        sel.value = selectedVal;
                    });
                }
            };
        }
    }

    function initStaffListSubtab() {
        const searchInput = document.getElementById('staffSearchInput');
        const clearSearchBtn = document.getElementById('btnClearStaffSearch');
        let staffSearchTimer = null;
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                if (clearSearchBtn) {
                    clearSearchBtn.style.display = searchInput.value ? 'inline-flex' : 'none';
                }
                clearTimeout(staffSearchTimer);
                staffSearchTimer = setTimeout(() => {
                    currentStaffPage = 1;
                    renderStaffList();
                }, 300);
            });
        }
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                clearSearchBtn.style.display = 'none';
                currentStaffPage = 1;
                renderStaffList();
            });
        }

        const roleFilter = document.getElementById('staffFilterPosition') || document.getElementById('staffFilterRole');
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
                // Đồng bộ active KPI card
                const val = statusFilter.value;
                document.querySelectorAll('.staff-kpi-grid .kpi-card-clickable').forEach(c => {
                    c.classList.toggle('active', c.getAttribute('data-kpi-filter') === val);
                });
                currentStaffPage = 1;
                renderStaffList();
            });
        }

        const retrainToggle = document.getElementById('btnFilterRetrainOnly') || document.getElementById('staffFilterRetrainOnly');
        if (retrainToggle) {
            retrainToggle.addEventListener('click', () => {
                retrainToggle.classList.toggle('active');
                document.querySelectorAll('.staff-kpi-grid .kpi-card-clickable').forEach(c => {
                    if (c.getAttribute('data-kpi-filter') === 'RETRAIN') {
                        c.classList.toggle('active', retrainToggle.classList.contains('active'));
                    }
                });
                currentStaffPage = 1;
                renderStaffList();
            });
        }

        const lockToggle = document.getElementById('btnFilterLockOnly');
        if (lockToggle) {
            lockToggle.addEventListener('click', () => {
                lockToggle.classList.toggle('active');
                currentStaffPage = 1;
                renderStaffList();
            });
        }

        const clearFiltersBtn = document.getElementById('btnStaffClearFilters');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', clearAllStaffFilters);
        }

        // Lọc tương tác bằng thẻ KPI
        const kpiCards = document.querySelectorAll('.staff-kpi-grid .kpi-card-clickable');
        kpiCards.forEach(card => {
            card.addEventListener('click', () => {
                const filter = card.getAttribute('data-kpi-filter');
                kpiCards.forEach(c => c.classList.remove('active'));
                card.classList.add('active');

                const statusSelect = document.getElementById('staffFilterStatus');
                const retrainBtn = document.getElementById('btnFilterRetrainOnly') || document.getElementById('staffFilterRetrainOnly');

                if (filter === 'ALL') {
                    if (statusSelect) statusSelect.value = 'ALL';
                    if (retrainBtn) retrainBtn.classList.remove('active');
                } else if (filter === 'RETRAIN') {
                    if (statusSelect) statusSelect.value = 'ALL';
                    if (retrainBtn) retrainBtn.classList.add('active');
                } else {
                    if (statusSelect) statusSelect.value = filter;
                    if (retrainBtn) retrainBtn.classList.remove('active');
                }
                currentStaffPage = 1;
                renderStaffList();
            });
        });

        // Nút lọc nhanh trên thanh cảnh báo
        const btnFilterAlertQuick = document.getElementById('btnFilterStaffAlertQuick');
        if (btnFilterAlertQuick) {
            btnFilterAlertQuick.addEventListener('click', () => {
                const retrainCard = document.querySelector('.staff-kpi-grid [data-kpi-filter="RETRAIN"]');
                if (retrainCard) retrainCard.click();
            });
        }

        // Nút thêm nhân sự mới
        const btnAddStaff = document.getElementById('btnOpenAddStaffModal');
        if (btnAddStaff) {
            btnAddStaff.addEventListener('click', () => openStaffModal());
        }

        // Xuất file CSV nhân sự
        const btnExportStaff = document.getElementById('btnExportStaff') || document.getElementById('btnExportStaffReport');
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

        // Toggle cấu hình tài khoản
        const enableAccountToggle = document.getElementById('staffEnableAccountToggle');
        const accountSection = document.getElementById('staffAccountConfigSection');
        if (enableAccountToggle && accountSection) {
            enableAccountToggle.addEventListener('change', () => {
                accountSection.style.display = enableAccountToggle.checked ? 'block' : 'none';
            });
        }

        // Tự động đồng bộ hai chiều giữa Email công việc và Email đăng nhập
        const workEmailInput = document.getElementById('staffInputEmail');
        const loginEmailInput = document.getElementById('staffAccountEmail');
        if (workEmailInput && loginEmailInput) {
            workEmailInput.addEventListener('input', () => {
                if (!loginEmailInput.value || loginEmailInput.dataset.autoSynced !== 'false') {
                    loginEmailInput.value = workEmailInput.value;
                    loginEmailInput.dataset.autoSynced = 'true';
                }
            });
            loginEmailInput.addEventListener('input', () => {
                loginEmailInput.dataset.autoSynced = 'false';
                if (!workEmailInput.value) {
                    workEmailInput.value = loginEmailInput.value;
                }
            });
        }

        // Tạo mật khẩu ngẫu nhiên
        const btnGenPass = document.getElementById('btnGenerateRandomStaffPass');
        const staffPassInput = document.getElementById('staffAccountPassword');
        if (btnGenPass && staffPassInput) {
            btnGenPass.addEventListener('click', () => {
                const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*';
                const array = new Uint8Array(12);
                window.crypto.getRandomValues(array);
                let pass = '';
                for (let i = 0; i < array.length; i++) {
                    pass += chars[array[i] % chars.length];
                }
                staffPassInput.value = pass;
            });
        }

        // Submit form nhân sự
        const btnSaveStaff = document.getElementById('btnSaveStaff');
        if (btnSaveStaff) {
            btnSaveStaff.addEventListener('click', async () => {
                const modal = document.getElementById('staffModalOverlay');
                const editingId = modal?.getAttribute('data-editing-id');
                const name = document.getElementById('staffInputName')?.value.trim();
                const phone = document.getElementById('staffInputPhone')?.value.trim();
                const emailInputVal = document.getElementById('staffInputEmail')?.value.trim();
                const accountEmailVal = document.getElementById('staffAccountEmail')?.value.trim();
                const email = emailInputVal || accountEmailVal;
                const address = document.getElementById('staffInputAddress')?.value.trim();
                const dob = document.getElementById('staffInputDob')?.value;
                const joinDate = document.getElementById('staffInputJoinDate')?.value;
                const position = document.getElementById('staffInputPosition')?.value;
                const shift = document.getElementById('staffInputShift')?.value;
                const specialization = document.getElementById('staffInputSpecialization')?.value.trim();

                if (!name || !phone || !email || !shift) {
                    PawpalStaff.showToast('Vui lòng điền đầy đủ các thông tin bắt buộc!', 'warning');
                    return;
                }

                try {
                    const client = window.getSupabaseClient ? window.getSupabaseClient() : window.SupabaseClient;
                    const enableAccount = document.getElementById('staffEnableAccountToggle')?.checked;
                    const accountEmail = accountEmailVal || email;
                    const accountPassword = document.getElementById('staffAccountPassword')?.value.trim();
                    const systemRole = document.getElementById('staffAccountSystemRole')?.value || 'STAFF';
                    const mustChangePass = document.getElementById('staffMustChangePasswordCheckbox')?.checked ?? true;

                    // Thu thập danh sách quyền chi tiết được tích chọn
                    const permissions = [];
                    document.querySelectorAll('#staffPermissionsGrid input[type="checkbox"]:checked').forEach(cb => {
                        permissions.push(cb.value);
                    });

                    let targetStaffId = null;

                    if (!client) {
                        throw new Error('Chưa kết nối được cơ sở dữ liệu Supabase. Vui lòng kiểm tra lại phiên làm việc.');
                    }

                    const dbRole = PawpalStaff.mapPositionToDbRole ? PawpalStaff.mapPositionToDbRole(position) : 'cham_soc_thu_cung';

                    if (editingId) {
                        const staffList = PawpalStaff.state?.mockStaff || [];
                        const staff = staffList.find(s => s.id === editingId);
                        if (staff && staff.rawId) {
                            targetStaffId = staff.rawId;
                            const { error: updateErr } = await client.from('staff').update({
                                full_name: name,
                                phone_number: phone,
                                email: email,
                                address: address,
                                dob: dob || null,
                                hire_date: joinDate || null,
                                shift: shift,
                                role: dbRole,
                                specialization: specialization || position
                            }).eq('id', staff.rawId);
                            if (updateErr) throw updateErr;
                        } else {
                            throw new Error('Không tìm thấy mã định danh hồ sơ nhân sự cần cập nhật.');
                        }
                    } else {
                        const { data: newStaffData, error: insertErr } = await client.from('staff').insert({
                            full_name: name,
                            phone_number: phone,
                            email: email,
                            address: address,
                            dob: dob || null,
                            hire_date: joinDate || null,
                            shift: shift,
                            status: 'ACTIVE',
                            role: dbRole,
                            specialization: specialization || position
                        }).select('id').single();

                        if (insertErr) throw insertErr;
                        if (newStaffData) targetStaffId = newStaffData.id;
                    }

                    // Nếu có bật tùy chọn cấp tài khoản đăng nhập
                    if (enableAccount && targetStaffId) {
                        if (!accountEmail) {
                            PawpalStaff.showToast('Vui lòng nhập Email công vụ để cấp tài khoản!', 'warning');
                        } else if (!editingId && (!accountPassword || accountPassword.length < 6)) {
                            PawpalStaff.showToast('Mật khẩu khởi tạo phải có ít nhất 6 ký tự!', 'warning');
                        } else {
                            // Lấy token Bearer từ phiên đăng nhập Supabase của Admin
                            let adminBearerToken = null;
                            try {
                                if (client && client.auth) {
                                    const sess = await client.auth.getSession();
                                    adminBearerToken = sess?.data?.session?.access_token;
                                }
                            } catch (tokErr) {
                                console.warn('[PawpalStaff] Lấy admin token thất bại:', tokErr);
                            }

                            const reqHeaders = { 'Content-Type': 'application/json' };
                            if (adminBearerToken) {
                                reqHeaders['Authorization'] = `Bearer ${adminBearerToken}`;
                            }

                            const payload = {
                                staffId: targetStaffId,
                                email: accountEmail,
                                systemRole: systemRole,
                                permissions: permissions,
                                mustChangePassword: mustChangePass
                            };
                            if (accountPassword) {
                                payload.password = accountPassword;
                            }

                            try {
                                const resp = await fetch('/api/admin/staff/provision-account', {
                                    method: 'POST',
                                    headers: reqHeaders,
                                    body: JSON.stringify(payload)
                                });
                                const result = await resp.json().catch(() => ({}));
                                if (!resp.ok || !result.success) {
                                    console.warn('[PawpalStaff] Lỗi đồng bộ tài khoản Auth:', result.message);
                                    PawpalStaff.showToast('Lưu thông tin nhân viên thành công nhưng đồng bộ tài khoản Auth thất bại: ' + (result.message || 'Lỗi phân quyền'), 'warning');
                                }
                            } catch (fetchErr) {
                                console.warn('[PawpalStaff] Không thể kết nối endpoint provision-account:', fetchErr);
                            }
                        }
                    }
                } catch (e) {
                    console.error('[PawpalStaff] Error saving staff:', e);
                    PawpalStaff.showToast('Không thể lưu hồ sơ nhân sự: ' + (e.message || 'Lỗi cơ sở dữ liệu'), 'error');
                    return; // Chặn đứng, không đóng modal và không tạo trạng thái thành công ảo
                }

                // Cập nhật mock state đồng bộ
                if (editingId) {
                    const staff = (PawpalStaff.state?.mockStaff || []).find(s => s.id === editingId);
                    if (staff) {
                        staff.name = name;
                        staff.phone = phone;
                        staff.email = email;
                        staff.address = address;
                        staff.position = position;
                        staff.shift = shift;
                        staff.note = specialization;
                    }
                } else {
                    const newId = `EMP-${String((PawpalStaff.state?.mockStaff || []).length + 1).padStart(3, '0')}`;
                    PawpalStaff.state?.mockStaff?.unshift({
                        id: newId,
                        name: name,
                        phone: phone,
                        email: email,
                        address: address,
                        position: position,
                        shift: shift,
                        status: 'ACTIVE',
                        skillScore: 90,
                        skillResult: 'PASS',
                        skillExam: 'Đạt (90đ)',
                        note: specialization,
                        join_date: PawpalStaff.formatDateVN(joinDate)
                    });
                }

                await PawpalStaff.loadStaffModuleData({ force: true });
                renderStaffList();
                renderStaffAlertBar();

                // Nếu đang đứng ở Subtab Hồ sơ nhân viên thì re-render luôn tab Hồ sơ
                const activeSubtab = sessionStorage.getItem('pawpal_admin_staff_active_subtab');
                if (activeSubtab === 'tab-staff-profile' && PawpalStaff.subtabs.profile?.renderStaffProfile) {
                    const currentId = editingId || PawpalStaff.state?.selectedStaffId;
                    PawpalStaff.subtabs.profile.renderStaffProfile(currentId);
                }

                PawpalStaff.showToast(editingId ? 'Đã cập nhật hồ sơ nhân sự!' : 'Đã thêm nhân viên mới thành công!');
                if (modal) modal.classList.remove('active');
            });
        }

        // Xử lý xác nhận điều phối lại ca hẹn (Modal 6)
        const btnConfirmReassign = document.getElementById('btnConfirmReassign');
        if (btnConfirmReassign) {
            btnConfirmReassign.addEventListener('click', async () => {
                const modal = document.getElementById('reassignModalOverlay');
                const staffId = modal?.getAttribute('data-target-staff-id');
                const staffRawId = modal?.getAttribute('data-target-staff-raw-id');
                const staffList = PawpalStaff.state?.mockStaff || [];
                const staff = staffList.find(s => s.id === staffId || s.rawId === staffRawId);
                
                const client = PawpalStaff.getSupabaseClient ? PawpalStaff.getSupabaseClient() : window.SupabaseClient;
                if (client && staffRawId) {
                    btnConfirmReassign.disabled = true;
                    btnConfirmReassign.textContent = 'Đang xử lý...';
                    try {
                        // 1. Tạm khóa nhận dịch vụ cho nhân viên trong CSDL
                        const { error: lockErr } = await client
                            .from('staff')
                            .update({ service_locked: true, status: 'pause' })
                            .eq('id', staffRawId);
                        if (lockErr) throw lockErr;

                        // 2. Chuyển giao các ca hẹn đã chọn sang KTV mới
                        const reassignRows = modal.querySelectorAll('.reassign-select-row');
                        for (const row of reassignRows) {
                            const bookingRawId = row.getAttribute('data-booking-raw-id');
                            const newStaffRawId = row.value;
                            if (bookingRawId && newStaffRawId) {
                                const { error: reassignErr } = await client
                                    .from('appointment')
                                    .update({ staff_id: newStaffRawId })
                                    .eq('id', bookingRawId);
                                if (reassignErr) {
                                    console.error('Lỗi khi điều phối ca hẹn:', bookingRawId, reassignErr);
                                }
                            }
                        }
                    } catch (err) {
                        console.error('Lỗi khi khóa KTV và điều phối ca hẹn:', err);
                        PawpalStaff.showToast(`Lỗi CSDL khi điều phối: ${err.message || 'Không thể cập nhật'}`, 'danger');
                        btnConfirmReassign.disabled = false;
                        btnConfirmReassign.textContent = 'Xác nhận và Chuyển ca';
                        return;
                    } finally {
                        btnConfirmReassign.disabled = false;
                        btnConfirmReassign.textContent = 'Xác nhận và Chuyển ca';
                    }
                }

                if (staff) {
                    staff.serviceLocked = true;
                    staff.status = 'PAUSE';
                }
                PawpalStaff.showToast('Đã điều phối lại toàn bộ ca hẹn và tạm khóa KTV an toàn!', 'success');
                if (modal) modal.classList.remove('active');
                renderStaffList();
                renderStaffAlertBar();
            });
        }

        const btnDismissReassign = document.getElementById('btnDismissReassignModal');
        if (btnDismissReassign) {
            btnDismissReassign.addEventListener('click', async () => {
                const modal = document.getElementById('reassignModalOverlay');
                const staffId = modal?.getAttribute('data-target-staff-id');
                const staffRawId = modal?.getAttribute('data-target-staff-raw-id');
                const staffList = PawpalStaff.state?.mockStaff || [];
                const staff = staffList.find(s => s.id === staffId || s.rawId === staffRawId);

                const client = PawpalStaff.getSupabaseClient ? PawpalStaff.getSupabaseClient() : window.SupabaseClient;
                if (client && staffRawId) {
                    try {
                        const { error: lockErr } = await client
                            .from('staff')
                            .update({ service_locked: true, status: 'pause' })
                            .eq('id', staffRawId);
                        if (lockErr) throw lockErr;
                    } catch (err) {
                        console.error('Lỗi khi tạm khóa KTV:', err);
                        PawpalStaff.showToast(`Lỗi CSDL khi khóa KTV: ${err.message || 'Không thể cập nhật'}`, 'danger');
                        return;
                    }
                }

                if (staff) {
                    staff.serviceLocked = true;
                    staff.status = 'PAUSE';
                }
                PawpalStaff.showToast('Đã tạm khóa KTV! Ca hẹn chuyển vào hàng chờ điều phối.', 'info');
                if (modal) modal.classList.remove('active');
                renderStaffList();
                renderStaffAlertBar();
            });
        }

        // Đóng modal qua data-close-modal, click backdrop, và phím Escape
        document.querySelectorAll('[data-close-modal="staffModalOverlay"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = document.getElementById('staffModalOverlay');
                if (modal) modal.classList.remove('active');
            });
        });

        document.querySelectorAll('[data-close-modal="reassignModalOverlay"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = document.getElementById('reassignModalOverlay');
                if (modal) modal.classList.remove('active');
            });
        });

        const staffModalOverlay = document.getElementById('staffModalOverlay');
        if (staffModalOverlay) {
            staffModalOverlay.addEventListener('click', (e) => {
                if (e.target === staffModalOverlay) {
                    staffModalOverlay.classList.remove('active');
                }
            });
        }

        const reassignModalOverlay = document.getElementById('reassignModalOverlay');
        if (reassignModalOverlay) {
            reassignModalOverlay.addEventListener('click', (e) => {
                if (e.target === reassignModalOverlay) {
                    reassignModalOverlay.classList.remove('active');
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modalStaff = document.getElementById('staffModalOverlay');
                if (modalStaff && modalStaff.classList.contains('active')) {
                    modalStaff.classList.remove('active');
                }
                const modalReassign = document.getElementById('reassignModalOverlay');
                if (modalReassign && modalReassign.classList.contains('active')) {
                    modalReassign.classList.remove('active');
                }
            }
        });

        // Hỗ trợ kiểm thử tự động qua URL parameter v=modal1 hoặc v=modal6
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('v') === 'modal1' || urlParams.get('modal') === '1' || urlParams.get('modal') === 'staff') {
            setTimeout(() => {
                openStaffModal();
            }, 300);
        } else if (urlParams.get('v') === 'modal6' || urlParams.get('modal') === '6' || urlParams.get('modal') === 'reassign') {
            setTimeout(() => {
                openReassignModal('EMP-001');
            }, 300);
        }

        renderStaffList();
        renderStaffAlertBar();
    }

    window.addEventListener('pawpal:staff-data-loaded', () => {
        renderStaffList();
        renderStaffAlertBar();
    });

    PawpalStaff.subtabs.list = {
        init: initStaffListSubtab,
        renderStaffList,
        renderStaffAlertBar,
        updateStaffKpis,
        openStaffModal,
        openReassignModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initStaffListSubtab);
    } else {
        initStaffListSubtab();
    }
})();
