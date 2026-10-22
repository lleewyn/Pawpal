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
        const staffList = PawpalStaff.state?.staff || [];
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
        const staffList = PawpalStaff.state?.staff || [];
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

            const hasSchedule=PawpalStaff.getStaffWorkingSchedules(s.rawId).length>0;
            if ((shift==='ASSIGNED'&&!hasSchedule)||(shift==='UNASSIGNED'&&hasSchedule)) return false;
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
        const staffList = PawpalStaff.state?.staff || [];
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

            const shiftText=escapeHtml(PawpalStaff.formatStaffSchedule(PawpalStaff.getNearestStaffSchedule(staff.rawId)));

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
                <td>${escapeHtml(staff.position==='cham_soc_thu_cung'?'Chăm sóc thú cưng':staff.position)}</td>
                <td>${escapeHtml(staff.phone)}</td>
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
                if(item.getAttribute('data-action')==='delete')item.textContent='Ngừng việc';
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
                        openStaffModal(staffId);
                        document.getElementById('staffEmploymentStatus').value='resigned';
                        document.getElementById('staffChangeReason').focus();
                    }
                });
            });
        }
    }

    function attachProfileLinkEvents() {
        document.querySelectorAll('.btn-view-profile').forEach(link=>{
            link.onclick=e=>{e.preventDefault();const id=link.getAttribute('data-id');if(id)PawpalStaff.openStaffProfile?.(id);};
        });
    }

    function renderStaffAlertBar() {
        const bar = document.getElementById('staffAlertBar') || document.getElementById('staffAlertStrip');
        if (!bar) return;
        const staffList = PawpalStaff.state?.staff || [];

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
        const staffList = PawpalStaff.state?.staff || [];
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
            if (dobInput) dobInput.value = parseToInputDate(staff.dob) || '';
            if (joinDateInput) joinDateInput.value = parseToInputDate(staff.join_date) || '';
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
            if (dobInput) dobInput.value = '';
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

        PawpalStaff.state.profileEditSnapshot=staff?structuredClone(staff.raw):null;PawpalStaff.state.profileSaveRequest=crypto.randomUUID();
        document.getElementById('staffProfileError').textContent='';
        const accountTitle=document.getElementById('staffEnableAccountToggle').closest('.account-toggle-row')?.previousElementSibling;if(accountTitle)accountTitle.style.display=staff?'none':'';
        document.querySelectorAll('#staffModalOverlay .detail-section-title').forEach(title=>{if(title.textContent.includes('Tài khoản đăng nhập')||title.dataset.accountHeading){title.dataset.accountHeading='true';title.textContent=staff?'Trạng thái công việc':'Tài khoản đăng nhập hệ thống';}});
        const permissionGrid=document.getElementById('staffPermissionsGrid');permissionGrid.style.display='none';permissionGrid.previousElementSibling.style.display='none';
        document.getElementById('staffEmploymentStatus').value=staff?staff.raw.employment_status.toLowerCase():'active';
        document.getElementById('staffServiceLocked').checked=staff?.raw.service_locked||false;
        document.getElementById('staffChangeReason').value='';
        if(staff){nameInput.value=staff.raw.full_name;phoneInput.value=staff.raw.phone_number||'';emailInput.value=staff.raw.email||'';addrInput.value=staff.raw.address||'';dobInput.value=staff.raw.dob||'';joinDateInput.value=staff.raw.hire_date||'';posSelect.value=staff.raw.job_title;accountSection.style.display='none';enableAccountToggle.closest('label').style.display='none';}
        else{dobInput.value='';joinDateInput.value='';posSelect.value='';enableAccountToggle.closest('label').style.display='';}
        if(!staff)PawpalStaff.state.profileNewId=crypto.randomUUID();
        configureStaffAccess(staff);
        modal.classList.add('active');
    }

    let handoverSnapshot=null,handoverPage=1;
    function renderHandoverRows(){
        const state=handoverSnapshot,body=document.getElementById('reassignBookingsTableBody');body.querySelectorAll('select').forEach(select=>select._entityPopover?.remove());body.replaceChildren();
        if(!state.tasks.length){const td=body.insertRow().insertCell();td.colSpan=5;td.textContent='Không có công việc chưa hoàn tất. Có thể xác nhận khóa nhận việc.';}
        for(const task of state.tasks.slice((handoverPage-1)*10,handoverPage*10)){
            const row=body.insertRow(),profile=Array.isArray(task.customer?.customer_profile)?task.customer.customer_profile[0]:task.customer?.customer_profile;
            for(const text of [task.appointment_code,[profile?.full_name,task.pet?.pet_name].filter(Boolean).join(' · ')||'—',task.items.map(i=>i.name_snapshot).join(', '),new Date(task.scheduled_start_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'})])row.insertCell().textContent=text;
            const select=document.createElement('select');select.className='admin-select reassign-select-row';select.dataset.bookingRawId=task.id;select.append(new Option('Chọn nhân viên',''),...state.replacements.map(s=>new Option(s.name+' · '+s.position,s.rawId)));select.value=state.choices.get(task.id)||'';select.onchange=()=>state.choices.set(task.id,select.value);row.insertCell().append(select);PawpalStaff.enhanceEntitySelect(select);
        }
        let pager=document.getElementById('staffHandoverPager');if(!pager){pager=document.createElement('div');pager.id='staffHandoverPager';pager.style.cssText='display:flex;justify-content:center;gap:8px;margin-top:6px';body.closest('.table-responsive-wrapper').after(pager);}
        pager.replaceChildren();const pages=Math.ceil(state.tasks.length/10)||1;for(const [text,target] of [['<',handoverPage-1],[String(handoverPage),handoverPage],['>',handoverPage+1]]){const button=document.createElement('button');button.type='button';button.className='admin-btn';button.style.cssText=target===handoverPage&&text!=='<'&&text!=='>'?'border:none;background:#236B48;color:white':'border:none;background:transparent';button.textContent=text;button.disabled=target<1||target>pages;button.onclick=()=>{handoverPage=target;renderHandoverRows();};pager.append(button);}
    }
    async function openReassignModal(staffId){
        const staff=PawpalStaff.state.staff.find(s=>s.id===staffId||s.rawId===staffId);if(!staff)return;
        const modal=document.getElementById('reassignModalOverlay'),button=document.getElementById('btnConfirmReassign');
        handoverSnapshot={staff:structuredClone(staff.raw),request:crypto.randomUUID(),tasks:[],choices:new Map(),ready:false,replacements:PawpalStaff.state.staff.filter(s=>s.rawId!==staff.rawId&&s.status==='ACTIVE'&&!s.serviceLocked)};handoverPage=1;
        document.getElementById('reassignModalForm').reset();document.getElementById('staffHandoverError').textContent='';document.getElementById('reassignModalWarningText').textContent='Bàn giao công việc chưa hoàn tất của '+staff.name+' trước khi khóa nhận dịch vụ.';button.disabled=true;modal.classList.add('active');
        const select=document.getElementById('reassignSelectAllStaff');select.replaceChildren(new Option('Chọn nhân viên',''),...handoverSnapshot.replacements.map(s=>new Option(s.name+' · '+s.position,s.rawId)));if(select._entityInput)select._entityInput.value='';else PawpalStaff.enhanceEntitySelect(select);
        select.onchange=()=>{for(const task of handoverSnapshot.tasks)handoverSnapshot.choices.set(task.id,select.value);renderHandoverRows();};
        const current=handoverSnapshot;
        try{
            const tasks=await PawpalStaff.readRows(()=>window.getSupabaseClient().from('appointment').select('id,appointment_code,staff_id,updated_at,scheduled_start_at,scheduled_end_at,customer:customer_id(customer_profile(full_name)),pet:pet_id(pet_name),items:appointment_item(id,staff_id,status,name_snapshot),trips:taxi_trip(id,driver_staff_id,status)').not('appointment_status','in','(completed,cancelled,no_show)').order('scheduled_start_at').order('id'));
            if(handoverSnapshot!==current)return;
            current.tasks=tasks.filter(a=>a.staff_id===staff.rawId||a.items.some(i=>i.staff_id===staff.rawId&&!['completed','cancelled'].includes(i.status))||(Array.isArray(a.trips)?a.trips:a.trips?[a.trips]:[]).some(t=>t.driver_staff_id===staff.rawId&&!['completed','cancelled'].includes(t.status)));current.ready=true;renderHandoverRows();
        }catch(error){document.getElementById('staffHandoverError').textContent='Không tải được công việc. Đóng và mở lại để kiểm tra.';}
        finally{button.disabled=!current.ready;}
    }
    async function saveHandover(){
        const state=handoverSnapshot,button=document.getElementById('btnConfirmReassign');if(!state?.ready||button.disabled)return;button.disabled=true;
        try{
            const {error}=await window.getSupabaseClient().rpc('handover_admin_staff_work',{p_request_id:state.request,p_staff_id:state.staff.id,p_expected_updated_at:state.staff.updated_at,p_reason:document.getElementById('staffHandoverReason').value.trim(),p_handover:state.tasks.map(a=>({appointment_id:a.id,expected_updated_at:a.updated_at,replacement_staff_id:state.choices.get(a.id)||null}))});if(error)throw error;
            await PawpalStaff.loadStaffModuleData({force:true});renderStaffList();renderStaffAlertBar();document.getElementById('reassignModalOverlay').classList.remove('active');PawpalStaff.showToast('Đã bàn giao và khóa nhận dịch vụ.','success');
        }catch(error){const messages={staff_handover_incomplete:'Còn công việc chưa được bàn giao. Đóng và mở lại để kiểm tra.',staff_work_changed:'Công việc đã thay đổi. Đóng và mở lại để đối chiếu.',staff_profile_changed:'Hồ sơ nhân viên đã thay đổi. Mở lại để kiểm tra.',staff_not_eligible:'Chọn nhân viên đang làm việc, không bị khóa nhận việc cho từng ca.',staff_level_required:'Nhân viên thay thế chưa đủ cấp độ chuyên môn.',staff_not_available:'Nhân viên thay thế có lịch nghỉ trong khoảng này.',staff_schedule_conflict:'Nhân viên thay thế đang có công việc trùng giờ.',invalid_staff_handover:'Nhập lý do và chọn đủ nhân viên thay thế.'};document.getElementById('staffHandoverError').textContent=messages[error.message]||'Không thể bàn giao. Toàn bộ đợt được giữ nguyên; kiểm tra dữ liệu và quyền thực hiện.';}
        finally{button.disabled=false;}
    }

    let accessDraft=null;const authRetries=new Map();
    const profileFields=['full_name','phone_number','job_title','specialization','hire_date','email','address','dob','service_locked','staff_level_id','employment_status'];
    async function callStaffAccount(path,body){
        const {data}=await window.getSupabaseClient().auth.getSession();if(!data.session?.access_token)throw Error('Vui lòng đăng nhập lại.');
        const response=await fetch('/api/admin/staff/'+path,{method:'POST',headers:{Authorization:'Bearer '+data.session.access_token,'Content-Type':'application/json'},body:JSON.stringify(body)});
        let result;try{result=await response.json();}catch{throw Error('Không thể đọc kết quả quản lý tài khoản.');}
        if(!response.ok||!result.success)throw Error((result.message||'Không thể hoàn tất yêu cầu.')+' Mã yêu cầu '+body.requestId);return result;
    }
    async function reloadStaffAccount(){
        const original=PawpalStaff.state.profileEditSnapshot;if(!original)return;
        await PawpalStaff.loadStaffModuleData({force:true});const current=PawpalStaff.state.staff.find(s=>s.rawId===original.id);if(!current)return;
        if(profileFields.some(k=>current.raw[k]!==original[k])){document.getElementById('staffProfileError').textContent='Hồ sơ có thay đổi mới. Đóng và mở lại trước khi sửa thông tin cá nhân.';document.getElementById('btnSaveStaff').disabled=true;}
        else PawpalStaff.state.profileEditSnapshot={...original,updated_at:current.raw.updated_at,must_change_password:current.raw.must_change_password,login_email:current.raw.login_email};
        accessDraft.staff=current;updateAccountStatus(current);renderStaffList();renderStaffAlertBar();
    }
    function updateAccountStatus(staff){
        const locked=staff?.accountStatus==='da_khoa';document.getElementById('staffAccountStatusBadge').textContent=locked?'Đang khóa đăng nhập':'Auth đang mở';
        document.getElementById('staffAccountStatusBadge').className='admin-badge '+(locked?'badge-danger':'badge-success');
        document.getElementById('btnStaffToggleLockAccount').textContent=locked?'Mở khóa đăng nhập':'Khóa đăng nhập';
        document.getElementById('staffMustChangePasswordCheckbox').checked=staff?.raw.must_change_password??true;
        document.getElementById('staffAccountEmail').value=staff?.raw.login_email||'';
    }
    function permissionTitle(code){
        const [table,action]=code.split('.'),names={customer:'khách hàng',customer_profile:'hồ sơ khách',customer_phone:'điện thoại khách',customer_address:'địa chỉ khách',pet_profile:'thú cưng',pet_weight_log:'cân nặng',appointment:'lịch dịch vụ',appointment_item:'dịch vụ trong lịch',appointment_record:'biên bản dịch vụ',care_log:'nhật ký chăm sóc',service:'danh mục dịch vụ',sales_order:'đơn bán hàng',sales_order_detail:'dòng đơn hàng',product:'sản phẩm',product_variant:'biến thể',inventory:'tồn kho',inventory_transaction:'sổ kho',payment:'khoản thu',refund_transaction:'khoản hoàn',staff:'nhân sự',staff_role:'vai trò nhân viên',staff_permission:'quyền riêng',staff_schedule:'lịch làm việc',staff_shift_request:'yêu cầu nghỉ và đổi ca',staff_assessment:'đánh giá nhân viên',access_role:'danh mục vai trò',role_permission:'quyền của vai trò',permission:'danh mục quyền',review:'đánh giá khách',review_response:'phản hồi đánh giá',support_ticket:'phiếu phản ánh',audit_log:'nhật ký quản trị'};
        return (action==='write'?'Thay đổi ':'Xem ')+(names[table]||'dữ liệu '+table);
    }
    function renderAccessChoices(){
        const draft=accessDraft;if(!draft?.ready)return;
        const roles=document.getElementById('staffAccountRoles');roles.replaceChildren();
        const inherited=new Set(draft.rolePermissions.filter(r=>draft.roles.has(r.role_code)).map(r=>r.permission_code));
        for(const role of draft.catalogRoles){const label=document.createElement('label');label.className='perm-checkbox';const input=document.createElement('input');input.type='checkbox';input.value=role.code;input.checked=draft.roles.has(role.code);input.onchange=()=>{if(input.checked)draft.roles.add(role.code);else draft.roles.delete(role.code);renderAccessChoices();};label.append(input,document.createTextNode(role.code==='ADMIN'?'Quản trị viên':role.role_name));roles.append(label);}
        const grid=document.getElementById('staffPermissionsGrid');grid.replaceChildren();
        const query=document.getElementById('staffPermissionSearch').value;
        const list=draft.catalogPermissions.filter(p=>PawpalStaff.matchSearch(permissionTitle(p.code)+' '+p.code,query));
        for(const permission of list.slice(0,draft.visible)){
            const label=document.createElement('label');label.className='perm-checkbox';label.style.cssText='display:flex;align-items:flex-start;gap:8px;margin:8px 0';const input=document.createElement('input');input.type='checkbox';input.value=permission.code;input.checked=inherited.has(permission.code)||draft.permissions.has(permission.code);input.disabled=inherited.has(permission.code);input.onchange=()=>{if(input.checked)draft.permissions.add(permission.code);else draft.permissions.delete(permission.code);};
            const text=document.createElement('span');text.textContent=permissionTitle(permission.code)+(inherited.has(permission.code)?' · Thừa hưởng':'');const code=document.createElement('small');code.textContent=permission.code;code.style.cssText='display:block;color:#4F7A65';text.append(code);label.append(input,text);grid.append(label);
        }
        const more=document.getElementById('staffPermissionMore');more.hidden=list.length<=draft.visible;more.style.display=more.hidden?'none':'';more.onclick=()=>{draft.visible+=20;renderAccessChoices();};
    }
    async function configureStaffAccess(staff){
        const token=PawpalStaff.state.profileSaveRequest;accessDraft={token,staff,roles:new Set(staff?.roles.map(r=>r.code)||[]),permissions:new Set(staff?.permissions||[]),visible:20,ready:false};
        const section=document.getElementById('staffAccountConfigSection');section.style.display='block';
        document.getElementById('staffAccountPassword').type='password';document.getElementById('btnShowStaffPassword').textContent='Hiện mật khẩu';
        document.getElementById('staffAccessDetails').open=false;
        const login=document.getElementById('staffAccountEmail');login.readOnly=!!staff;if(staff)login.value=staff.raw.login_email||'';
        const allow=document.getElementById('staffEnableAccountToggle');allow.disabled=!!staff;allow.closest('label').style.display='';allow.checked=staff?staff.accountStatus!=='da_khoa':false;
        document.getElementById('staffAccountStatusRow').style.display=staff?'flex':'none';document.getElementById('staffMustChangePasswordCheckbox').disabled=true;
        document.getElementById('staffAccountPassword').value='';document.getElementById('staffAccountError').textContent='';document.getElementById('staffAccessReason').value='';document.getElementById('staffPermissionSearch').value='';document.getElementById('staffPermissionsGrid').style.display='block';document.getElementById('staffPermissionsGrid').previousElementSibling.style.display='';document.getElementById('btnSaveStaffAccess').style.display=staff?'':'none';
        document.getElementById('staffAccessReasonGroup').style.display=staff?'':'none';if(staff)updateAccountStatus(staff);
        try{
            const [catalogRoles,catalogPermissions,rolePermissions]=await Promise.all([PawpalStaff.readRows(()=>window.getSupabaseClient().from('access_role').select('code,role_name').order('code')),PawpalStaff.readRows(()=>window.getSupabaseClient().from('permission').select('code,description').order('code')),PawpalStaff.readRows(()=>window.getSupabaseClient().from('role_permission').select('role_code,permission_code').order('role_code').order('permission_code'))]);
            if(accessDraft.token!==token)return;Object.assign(accessDraft,{catalogRoles,catalogPermissions,rolePermissions,ready:true});renderAccessChoices();
        }catch{document.getElementById('staffAccountError').textContent='Không tải được danh mục quyền. Đóng và mở lại trước khi quản lý tài khoản.';}
    }
    PawpalStaff.createStaffAccount=async profile=>{
        if(!accessDraft?.ready)throw Error('Chưa tải được danh mục quyền.');
        const result=await callStaffAccount('provision-account',{requestId:PawpalStaff.state.profileSaveRequest,staffId:PawpalStaff.state.profileNewId,profile,email:document.getElementById('staffAccountEmail').value.trim(),password:document.getElementById('staffAccountPassword').value,enableLogin:document.getElementById('staffEnableAccountToggle').checked,roles:[...accessDraft.roles],permissions:[...accessDraft.permissions]});return result.staffId;
    };
    function initStaffAccountActions(){
        document.getElementById('btnShowStaffPassword').onclick=e=>{const input=document.getElementById('staffAccountPassword');input.type=input.type==='password'?'text':'password';e.currentTarget.textContent=input.type==='password'?'Hiện mật khẩu':'Ẩn mật khẩu';};
        document.getElementById('staffPermissionSearch').oninput=()=>{if(accessDraft){accessDraft.visible=20;renderAccessChoices();}};
        const control=async(button,path,action)=>{
            const staff=accessDraft?.staff;if(!staff||button.disabled)return;button.disabled=true;
            try{
                const password=action==='reset'?document.getElementById('staffAccountPassword').value:null,key=staff.rawId+':'+action+':'+(password||'');
                if(!authRetries.has(key))authRetries.set(key,{requestId:crypto.randomUUID(),staffId:staff.rawId,expectedUpdatedAt:staff.raw.updated_at,action,...(password!==null?{password}:{})});
                await callStaffAccount(path,authRetries.get(key));authRetries.delete(key);await reloadStaffAccount();document.getElementById('staffAccountPassword').value='';document.getElementById('staffAccountError').textContent='';PawpalStaff.showToast('Đã xác nhận thay đổi tài khoản.','success');
            }catch(error){document.getElementById('staffAccountError').textContent=error.message;}
            finally{button.disabled=false;}
        };
        document.getElementById('btnStaffResetPasswordModal').onclick=event=>{
            const button=event.currentTarget;PawpalStaff.showStaffConfirmModal({title:'Đặt lại mật khẩu',message:'Đặt mật khẩu tạm đang nhập cho nhân viên này và yêu cầu đổi khi đăng nhập?',confirmText:'Xác nhận đặt lại',onConfirm:()=>control(button,'reset-password','reset')});
        };
        document.getElementById('btnStaffToggleLockAccount').onclick=event=>{
            const button=event.currentTarget,action=accessDraft?.staff?.accountStatus==='da_khoa'?'unlock':'lock';PawpalStaff.showStaffConfirmModal({title:action==='lock'?'Khóa đăng nhập':'Mở khóa đăng nhập',message:'Xác nhận thay đổi quyền đăng nhập của nhân viên đang xem?',confirmText:'Xác nhận',onConfirm:()=>control(button,'toggle-account-status',action)});
        };
        document.getElementById('btnSaveStaffAccess').onclick=()=>{
            if(!accessDraft?.ready||!accessDraft.staff)return;
            const draft={staff:structuredClone(accessDraft.staff.raw),roles:[...accessDraft.roles].sort(),permissions:[...accessDraft.permissions].sort(),reason:document.getElementById('staffAccessReason').value.trim()};
            PawpalStaff.showStaffConfirmModal({title:'Lưu quyền truy cập',message:'Xác nhận thay đổi vai trò và quyền riêng của nhân viên đang xem?',confirmText:'Lưu quyền truy cập',onConfirm:async()=>{
                const button=document.getElementById('btnSaveStaffAccess');if(button.disabled)return;button.disabled=true;
                try{const key=JSON.stringify(draft);accessDraft.requests||=new Map();if(!accessDraft.requests.has(key))accessDraft.requests.set(key,crypto.randomUUID());const {error}=await window.getSupabaseClient().rpc('set_admin_staff_access',{p_request_id:accessDraft.requests.get(key),p_staff_id:draft.staff.id,p_expected_updated_at:draft.staff.updated_at,p_roles:draft.roles,p_permissions:draft.permissions,p_reason:draft.reason});if(error)throw error;await reloadStaffAccount();document.getElementById('staffAccountError').textContent='';PawpalStaff.showToast('Đã lưu quyền truy cập.','success');}
                catch(error){document.getElementById('staffAccountError').textContent=error.message==='staff_last_admin_required'?'Cần giữ ít nhất một Admin đang hoạt động.':'Không thể lưu quyền. Kiểm tra lý do, quyền quản trị và phiên bản hồ sơ.';}
                finally{button.disabled=false;}
            }});
        };
    }

    function initStaffListSubtab() {
        initStaffAccountActions();
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
                const staffList = PawpalStaff.state?.staff || [];
                const csvCell=value=>{let text=String(value??'');if(/^\s*[=+\-@]/.test(text))text="'"+text;return '"'+text.replace(/"/g,'""')+'"';};
                const headers = ['Mã NV', 'Họ tên', 'Vị trí', 'Số điện thoại', 'Email', 'Ca làm việc', 'Năng lực tay nghề', 'Trạng thái'];
                const rows = staffList.map(s => [
                    s.id,s.name,s.position,s.phone,s.email,
                    PawpalStaff.formatStaffSchedule(PawpalStaff.getNearestStaffSchedule(s.rawId)),s.skillExam,s.status
                ].map(csvCell));

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
        const btnSaveStaff=document.getElementById('btnSaveStaff');
        btnSaveStaff.addEventListener('click',async()=>{
            if(btnSaveStaff.disabled)return;btnSaveStaff.disabled=true;
            const value=id=>document.getElementById(id)?.value.trim()||'',snapshot=PawpalStaff.state.profileEditSnapshot;
            try{
                const details={full_name:value('staffInputName'),phone_number:value('staffInputPhone'),email:value('staffInputEmail'),address:value('staffInputAddress'),dob:value('staffInputDob')||null,hire_date:value('staffInputJoinDate')||null,job_title:value('staffInputPosition'),specialization:value('staffInputSpecialization'),employment_status:value('staffEmploymentStatus'),service_locked:document.getElementById('staffServiceLocked').checked,staff_level_id:snapshot?.staff_level_id||null,reason:value('staffChangeReason')};
                if(!snapshot){await PawpalStaff.createStaffAccount?.(details);if(!PawpalStaff.createStaffAccount)throw Error('staff_creation_not_ready');}
                else{const {error}=await window.getSupabaseClient().rpc('save_admin_staff_profile',{p_request_id:PawpalStaff.state.profileSaveRequest,p_staff_id:snapshot.id,p_expected_updated_at:snapshot.updated_at,p_details:details});if(error)throw error;}
                await PawpalStaff.loadStaffModuleData({force:true});renderStaffList();renderStaffAlertBar();
                document.getElementById('staffAccountPassword').value='';
                document.getElementById('staffModalOverlay').classList.remove('active');PawpalStaff.showToast('Đã lưu hồ sơ nhân viên.','success');
            }catch(error){const messages={staff_profile_changed:'Hồ sơ đã thay đổi. Đóng và mở lại để kiểm tra.',staff_handover_required:'Cần bàn giao công việc chưa xong trước khi ngừng việc hoặc khóa phân công.',staff_last_admin_required:'Phải giữ ít nhất một Admin đang hoạt động.',staff_change_reason_required:'Nhập lý do đổi trạng thái.',staff_creation_not_ready:'Phần cấp tài khoản V1 đang được hoàn thiện.'};document.getElementById('staffProfileError').textContent=messages[error.message]||'Không thể lưu hồ sơ. Kiểm tra thông tin và quyền thực hiện.';}
            finally{btnSaveStaff.disabled=false;}
        });

        document.getElementById('btnConfirmReassign').onclick=saveHandover;
        document.getElementById('reassignModalForm').addEventListener('submit',e=>e.preventDefault());

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
