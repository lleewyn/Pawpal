// tab-staff-schedule.js - Subtab Lịch làm việc và Phân ca Pawpal-er
(function() {
    'use strict';

    const PawpalStaff = window.PawpalStaff = window.PawpalStaff || {};
    PawpalStaff.subtabs = PawpalStaff.subtabs || {};

    let currentScheduleView = 'DAY';
    let currentScheduleDate = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

    function renderScheduleTable() {
        if (!PawpalStaff.state.isLoaded) return;
        const picker = document.getElementById('scheduleDatePicker');
        if (picker && !picker.value) picker.value = currentScheduleDate;
        ['Morning','Afternoon','Evening','Night'].forEach((label,i)=>{
            const shift=['MORNING','AFTERNOON','EVENING','NIGHT'][i];
            const count=Object.values(PawpalStaff.state.mockRoster?.[currentScheduleDate] || {}).filter(shifts=>shifts.includes(shift)).length;
            const el=document.getElementById('quota'+label+'Count');if(el)el.textContent=`${count} nhân sự`;
            const badge=document.getElementById('quota'+label+'Badge');if(badge)badge.textContent='';
        });
        const active=document.getElementById('liveWorkstationsActiveCount');if(active)active.textContent='Chưa có dữ liệu bàn dịch vụ';
        if (currentScheduleView === 'DAY') {
            renderScheduleDayTable();
        } else {
            renderScheduleWeekTable();
        }
        renderLiveWorkstations();
        renderLeaveRequestsList();
    }

    function renderScheduleDayTable() {
        const tbody = document.getElementById('scheduleTableBody') || document.getElementById('scheduleDayTableBody');
        if (!tbody) return;
        const staffList = PawpalStaff.state?.mockStaff || [];
        const roster = PawpalStaff.state?.mockRoster || {};

        if (staffList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 13.5px;">
                        Chưa có dữ liệu phân ca nhân sự.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = staffList.map(staff => {
            const dayRoster = (roster[currentScheduleDate] && roster[currentScheduleDate][staff.id]) || [];
            const isMorning = dayRoster.includes('MORNING') || staff.shift === 'FULL_TIME';
            const isAfternoon = dayRoster.includes('AFTERNOON') || staff.shift === 'FULL_TIME';
            const isEvening = dayRoster.includes('EVENING');
            const isNight = dayRoster.includes('NIGHT');
            const isLeave = dayRoster.includes('LEAVE') || staff.status === 'LEAVE';

            let totalHours = 0;
            if (isLeave) {
                totalHours = 0;
            } else {
                if (isMorning) totalHours += 4;
                if (isAfternoon) totalHours += 4;
                if (isEvening) totalHours += 4;
                if (isNight) totalHours += 8;
            }

            const renderShiftCell = (active, shiftName) => {
                if (isLeave) return '<span style="color: var(--text-muted);">—</span>';
                if (active) {
                    return `<span class="shift-cell-pill pill-active" style="background: #EEF5F1; color: #236B48; font-weight: 600; padding: 3px 8px; border-radius: 6px; font-size: 12px; display: inline-block;">Có ca</span>`;
                }
                return '<span style="color: #AEC8B9;">—</span>';
            };

            return `
                <tr>
                    <td style="font-weight: 600;">${staff.id}</td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading); cursor: pointer;" class="btn-view-profile" data-id="${staff.id}">${staff.name}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${staff.position}</div>
                    </td>
                    <td style="text-align: center;">${renderShiftCell(isMorning, 'MORNING')}</td>
                    <td style="text-align: center;">${renderShiftCell(isAfternoon, 'AFTERNOON')}</td>
                    <td style="text-align: center;">${renderShiftCell(isEvening, 'EVENING')}</td>
                    <td style="text-align: center;">${renderShiftCell(isNight, 'NIGHT')}</td>
                    <td style="text-align: center;">
                        <span style="font-weight: 600; color: ${totalHours > 8 ? '#DC2626' : 'var(--text-heading)'};">${totalHours.toFixed(1)}h</span>
                        <button type="button" class="btn-edit-shift" data-staff-id="${staff.id}" style="margin-left: 6px; background: none; border: none; color: #236B48; text-decoration: underline; font-size: 11.5px; cursor: pointer;">Đổi</button>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.btn-edit-shift').forEach(btn => {
            btn.addEventListener('click', () => {
                const sId = btn.getAttribute('data-staff-id');
                openShiftModal(currentScheduleDate, 'MORNING', sId);
            });
        });

        tbody.querySelectorAll('.btn-view-profile').forEach(btn => {
            btn.addEventListener('click', () => {
                const sId = btn.getAttribute('data-id');
                if (sId && PawpalStaff.openStaffProfile) {
                    PawpalStaff.openStaffProfile(sId);
                }
            });
        });
    }

    function renderScheduleWeekTable() {
        const tbody = document.getElementById('scheduleWeekTableBody');
        if (!tbody) return;
        const staffList = PawpalStaff.state?.mockStaff || [];

        tbody.innerHTML = staffList.map(staff => `<tr><td>${staff.name}</td>${Array.from({length:7},(_,i)=>{
            const date = new Date(currentScheduleDate+'T00:00:00+07:00'); date.setUTCDate(date.getUTCDate()+i);
            const key = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
            return `<td>${(PawpalStaff.state.mockRoster?.[key]?.[staff.id] || []).join(', ') || '—'}</td>`;
        }).join('')}</tr>`).join('');
    }

    function renderLiveWorkstations() {
        const container = document.getElementById('liveWorkstationsContainer');
        if (!container) return;
        const workstations = PawpalStaff.state?.mockWorkstations || [];

        if (workstations.length === 0) {
            if (!PawpalStaff.state?.isLoaded) {
                container.innerHTML = Array.from({ length: 4 }, () => `
                    <div class="workstation-card idle" style="pointer-events: none;">
                        <div class="workstation-header">
                            <span class="skeleton-text" style="width: 55px;"></span>
                            <span class="skeleton-badge"></span>
                        </div>
                        <div class="workstation-body" style="margin-top: 8px;">
                            <span class="skeleton-text" style="width: 85%; margin-bottom: 5px;"></span>
                            <span class="skeleton-text" style="width: 60%; height: 11px;"></span>
                        </div>
                    </div>
                `).join('');
                return;
            }
            container.innerHTML = '<div style="color: var(--text-muted); padding: 12px; font-size: 13px;">Chưa có dữ liệu bàn làm việc trong ngày.</div>';
            return;
        }

        container.innerHTML = workstations.map((ws, idx) => `
            <div class="workstation-card ${ws.status === 'IN_SERVICE' ? 'in-service' : 'idle'}">
                <div class="workstation-header">
                    <strong>Bàn 0${idx + 1}</strong>
                    <span class="admin-badge ${ws.status === 'IN_SERVICE' ? 'badge-info' : 'badge-neutral'}">${ws.status === 'IN_SERVICE' ? 'Đang phục vụ' : 'Sẵn sàng'}</span>
                </div>
                <div class="workstation-body" style="font-size: 12.5px; margin-top: 6px;">
                    <div>KTV: <strong>${ws.staffName || 'Chưa phân công'}</strong></div>
                    ${ws.status === 'IN_SERVICE' ? `
                        <div style="color: var(--text-muted); margin-top: 2px;">Khách: ${ws.customerName} (${ws.petName})</div>
                        <div style="color: var(--text-heading); font-size: 12px; margin-top: 2px;">Dịch vụ: ${ws.serviceName}</div>
                    ` : ''}
                </div>
            </div>
        `).join('');
    }

    let currentTrayFilter = 'ALL';

    function renderLeaveRequestsList(filterStatus = 'ALL') {
        currentTrayFilter = filterStatus;
        const container = document.getElementById('leaveRequestsListContainer');
        const countPendingEl = document.getElementById('countFilterReqPending');
        const trayPendingCountEl = document.getElementById('trayPendingCount');

        PawpalStaff.state.mockLeaveSwapRequests ||= [];
        const requests = PawpalStaff.state.mockLeaveSwapRequests;
        const pendingCount = requests.filter(r => r.status === 'PENDING').length;

        if (countPendingEl) countPendingEl.textContent = pendingCount;
        if (trayPendingCountEl) trayPendingCountEl.textContent = pendingCount;

        if (!container) return;

        let filtered = requests;
        if (filterStatus !== 'ALL') {
            filtered = requests.filter(r => r.status === filterStatus);
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 24px;">Không có đơn xin nghỉ phép nào trong mục này.</div>';
            return;
        }

        container.innerHTML = filtered.map(req => {
            const isPending = req.status === 'PENDING';
            const badgeClass = req.status === 'APPROVED' ? 'badge-success' : (req.status === 'REJECTED' ? 'badge-danger' : 'badge-warning');
            const badgeText = req.status === 'APPROVED' ? 'Đã duyệt' : (req.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt');

            return `
                <div class="leave-request-card" style="padding: 12px 14px; border: 1px solid var(--border-neutral); border-radius: var(--admin-radius); background-color: #FFFFFF; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
                    <div style="display: flex; flex-direction: column; gap: 4px;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <strong style="color: var(--text-heading); font-size: 13.5px;">${req.staffName}</strong>
                            <span class="admin-badge ${badgeClass}">${badgeText}</span>
                            <span style="font-size: 11.5px; color: var(--text-muted);">${req.type === 'LEAVE' ? 'Nghỉ phép' : 'Đề xuất đổi ca'}</span>
                        </div>
                        <div style="font-size: 12.5px; color: var(--text-main);">
                            <span>Thời gian: <strong>${req.date}</strong> (${req.shift})</span>
                            ${req.swapWithName ? `<span style="margin-left: 8px; color: #236B48;">• Đổi với: ${req.swapWithName}</span>` : ''}
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted);">Lý do: ${req.reason}</div>
                    </div>
                    ${isPending ? `
                        <div style="display: flex; gap: 6px; flex-shrink: 0;">
                            <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-reject-req" data-id="${req.id}" style="border-color: #F7DCDC; color: #DC2626; height: 28px; padding: 0 10px; font-size: 12px;">Từ chối</button>
                            <button type="button" class="admin-btn admin-btn-primary btn-sm btn-approve-req" data-id="${req.id}" style="height: 28px; padding: 0 10px; font-size: 12px;">Duyệt đơn</button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        // Gắn sự kiện duyệt / từ chối
        container.querySelectorAll('.btn-approve-req').forEach(btn => {
            btn.addEventListener('click', () => {
                const reqId = btn.getAttribute('data-id');
                const target = requests.find(r => r.id === reqId);
                if (target) {
                    target.status = 'APPROVED';
                    PawpalStaff.showToast(`Đã duyệt đơn của ${target.staffName}!`, 'success');
                    renderLeaveRequestsList(currentTrayFilter);
                    renderScheduleTable();
                }
            });
        });

        container.querySelectorAll('.btn-reject-req').forEach(btn => {
            btn.addEventListener('click', () => {
                const reqId = btn.getAttribute('data-id');
                const target = requests.find(r => r.id === reqId);
                if (target) {
                    target.status = 'REJECTED';
                    PawpalStaff.showToast(`Đã từ chối đơn của ${target.staffName}!`, 'info');
                    renderLeaveRequestsList(currentTrayFilter);
                }
            });
        });
    }

    function openLeaveRequestsTrayModal() {
        const modal = document.getElementById('leaveRequestsTrayModal');
        if (!modal) return;
        renderLeaveRequestsList('ALL');

        const filterBtns = modal.querySelectorAll('.admin-btn-filter-toggle');
        filterBtns.forEach(b => b.classList.toggle('active', b.id === 'btnFilterReqAll'));

        modal.classList.add('active');
    }

    function openIncidentReportModal(staffId = null, bookingId = null) {
        const modal = document.getElementById('incidentReportModalOverlay');
        if (!modal) return;

        const staffList = PawpalStaff.state?.mockStaff || [];
        const staffSelect = document.getElementById('incidentInputStaff');
        const bookingSelect = document.getElementById('incidentInputBooking');

        if (staffSelect) {
            staffSelect.innerHTML = staffList.map(s => `<option value="${s.id}" ${s.id === staffId ? 'selected' : ''}>${s.name} (${s.position})</option>`).join('');
        }

        if (bookingSelect) {
            const mockBookings = [
                { id: 'BK-8901', table: 'Bàn 01', service: 'Grooming cắt tỉa tạo kiểu', pet: 'Bơ (Poodle)' },
                { id: 'BK-8902', table: 'Bàn 02', service: 'Tắm spa khử mùi và sấy', pet: 'Miu (Mèo Anh lông ngắn)' },
                { id: 'BK-8903', table: 'Bàn 03', service: 'Vệ sinh tai móng chuyên sâu', pet: 'Lu (Corgi)' }
            ];
            bookingSelect.innerHTML = mockBookings.map(b => `<option value="${b.id}" ${b.id === bookingId ? 'selected' : ''}>${b.table}: ${b.pet} - ${b.service}</option>`).join('');
        }

        const noteInput = document.getElementById('incidentInputNote');
        if (noteInput) noteInput.value = '';

        modal.classList.add('active');
    }

    function openShiftModal(dateStr, shiftKey = 'MORNING', preselectedStaffId = null) {
        const modal = document.getElementById('shiftModalOverlay');
        if (!modal) return;

        const dateInput = document.getElementById('shiftInputDate');
        const shiftSelect = document.getElementById('shiftInputShift');
        const availableContainer = document.getElementById('shiftAvailableStaff');
        const assignedContainer = document.getElementById('shiftAssignedStaff');
        const alertBanner = document.getElementById('shiftAlertBanner');

        const activeDate = dateStr || currentScheduleDate;
        if (dateInput) dateInput.value = activeDate;
        if (shiftSelect) shiftSelect.value = shiftKey || 'MORNING';
        if (alertBanner) alertBanner.style.display = 'none';

        const staffList = PawpalStaff.state?.mockStaff || [];
        const roster = PawpalStaff.state?.mockRoster || {};
        const currentAssignedIds = new Set(
            (roster[activeDate] && roster[activeDate][shiftSelect?.value || shiftKey]) || []
        );

        if (preselectedStaffId) {
            currentAssignedIds.add(preselectedStaffId);
        } else if (currentAssignedIds.size === 0 && staffList.length > 0) {
            // Gợi ý 2 nhân sự đầu tiên vào ca sáng/chiều
            currentAssignedIds.add(staffList[0].id);
            if (staffList.length > 1) currentAssignedIds.add(staffList[1].id);
        }

        function renderModalStaffLists() {
            if (availableContainer) {
                const available = staffList.filter(s => !currentAssignedIds.has(s.id));
                if (available.length === 0) {
                    availableContainer.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 12px;">Tất cả nhân sự đã được phân ca.</div>';
                } else {
                    availableContainer.innerHTML = available.map(s => `
                        <div class="shift-staff-item">
                            <div class="shift-staff-item-info">
                                <span class="shift-staff-name">${s.name}</span>
                                <span class="shift-staff-pos">${s.position}</span>
                            </div>
                            <button type="button" class="btn-shift-action btn-add-to-shift" data-id="${s.id}">Thêm</button>
                        </div>
                    `).join('');
                }
            }

            if (assignedContainer) {
                const assigned = staffList.filter(s => currentAssignedIds.has(s.id));
                if (assigned.length === 0) {
                    assignedContainer.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 12px;">Chưa có nhân sự trong ca trực.</div>';
                } else {
                    assignedContainer.innerHTML = assigned.map(s => `
                        <div class="shift-staff-item">
                            <div class="shift-staff-item-info">
                                <span class="shift-staff-name">${s.name}</span>
                                <span class="shift-staff-pos">${s.position}</span>
                            </div>
                            <button type="button" class="btn-shift-action btn-remove-from-shift" data-id="${s.id}" style="border-color: #F7DCDC; color: #DC2626;">Bỏ</button>
                        </div>
                    `).join('');
                }
            }

            availableContainer?.querySelectorAll('.btn-add-to-shift').forEach(b => {
                b.addEventListener('click', () => {
                    const id = b.getAttribute('data-id');
                    currentAssignedIds.add(id);
                    renderModalStaffLists();
                });
            });

            assignedContainer?.querySelectorAll('.btn-remove-from-shift').forEach(b => {
                b.addEventListener('click', () => {
                    const id = b.getAttribute('data-id');
                    currentAssignedIds.delete(id);
                    renderModalStaffLists();
                });
            });
        }

        renderModalStaffLists();

        if (shiftSelect) {
            shiftSelect.onchange = () => {
                renderModalStaffLists();
            };
        }

        modal.classList.add('active');
    }

    function openLeaveSwapModal(mode = 'LEAVE') {
        const modal = document.getElementById('leaveSwapModalOverlay');
        if (!modal) return;

        const staffList = PawpalStaff.state?.mockStaff || [];

        // Nạp danh sách nhân sự
        const leaveStaffSelect = document.getElementById('leaveInputStaff');
        const leaveReplaceSelect = document.getElementById('leaveInputReplacement');
        const swapFromSelect = document.getElementById('swapInputStaffFrom');
        const swapToSelect = document.getElementById('swapInputStaffTo');

        const staffOptions = staffList.map(s => `<option value="${s.id}">${s.name} (${s.position})</option>`).join('');

        if (leaveStaffSelect) leaveStaffSelect.innerHTML = staffOptions;
        if (leaveReplaceSelect) leaveReplaceSelect.innerHTML = '<option value="">-- Chưa có người thay --</option>' + staffOptions;
        if (swapFromSelect) swapFromSelect.innerHTML = staffOptions;
        if (swapToSelect) swapToSelect.innerHTML = staffOptions;

        // Set ngày mặc định
        const todayStr = currentScheduleDate || new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
        const nextDay = new Date(Date.now() + 86400000).toISOString().split('T')[0];

        const leaveStart = document.getElementById('leaveInputStartDate');
        const leaveEnd = document.getElementById('leaveInputEndDate');
        const swapFromDate = document.getElementById('swapInputDateFrom');
        const swapToDate = document.getElementById('swapInputDateTo');

        if (leaveStart) leaveStart.value = todayStr;
        if (leaveEnd) leaveEnd.value = todayStr;
        if (swapFromDate) swapFromDate.value = todayStr;
        if (swapToDate) swapToDate.value = nextDay;

        // Switch tab
        const tabLeaveBtn = document.getElementById('btnTabModeLeave');
        const tabSwapBtn = document.getElementById('btnTabModeSwap');
        const secLeave = document.getElementById('formSectionLeave');
        const secSwap = document.getElementById('formSectionSwap');

        function setTabMode(m) {
            if (m === 'LEAVE') {
                if (tabLeaveBtn) {
                    tabLeaveBtn.style.color = '#236B48';
                    tabLeaveBtn.style.fontWeight = '700';
                    tabLeaveBtn.style.borderBottom = '2px solid #236B48';
                }
                if (tabSwapBtn) {
                    tabSwapBtn.style.color = '#4F7A65';
                    tabSwapBtn.style.fontWeight = '500';
                    tabSwapBtn.style.borderBottom = 'none';
                }
                if (secLeave) secLeave.style.display = 'block';
                if (secSwap) secSwap.style.display = 'none';
                modal.setAttribute('data-mode', 'LEAVE');
            } else {
                if (tabSwapBtn) {
                    tabSwapBtn.style.color = '#236B48';
                    tabSwapBtn.style.fontWeight = '700';
                    tabSwapBtn.style.borderBottom = '2px solid #236B48';
                }
                if (tabLeaveBtn) {
                    tabLeaveBtn.style.color = '#4F7A65';
                    tabLeaveBtn.style.fontWeight = '500';
                    tabLeaveBtn.style.borderBottom = 'none';
                }
                if (secSwap) secSwap.style.display = 'block';
                if (secLeave) secLeave.style.display = 'none';
                modal.setAttribute('data-mode', 'SWAP');
            }
        }

        if (tabLeaveBtn) tabLeaveBtn.onclick = () => setTabMode('LEAVE');
        if (tabSwapBtn) tabSwapBtn.onclick = () => setTabMode('SWAP');

        setTabMode(mode);
        modal.classList.add('active');
    }

    function initScheduleSubtab() {
        // Toggle view DAY / WEEK
        const btnDay = document.getElementById('btnScheduleViewDay');
        const btnWeek = document.getElementById('btnScheduleViewWeek');

        if (btnDay) {
            btnDay.addEventListener('click', () => {
                currentScheduleView = 'DAY';
                if (btnDay) btnDay.classList.add('active');
                if (btnWeek) btnWeek.classList.remove('active');
                renderScheduleTable();
            });
        }

        if (btnWeek) {
            btnWeek.addEventListener('click', () => {
                currentScheduleView = 'WEEK';
                if (btnWeek) btnWeek.classList.add('active');
                if (btnDay) btnDay.classList.remove('active');
                renderScheduleTable();
            });
        }

        // Nút mở modal phân ca
        const btnOpenAssignShift = document.getElementById('btnOpenAssignShiftModal');
        if (btnOpenAssignShift) {
            btnOpenAssignShift.addEventListener('click', () => {
                openShiftModal(currentScheduleDate, 'MORNING');
            });
        }

        // Nút Lưu phân ca
        const btnSaveShift = document.getElementById('btnSaveShift');
        if (btnSaveShift) {
            btnSaveShift.addEventListener('click', () => {
                const modal = document.getElementById('shiftModalOverlay');
                const dateInput = document.getElementById('shiftInputDate');
                const shiftSelect = document.getElementById('shiftInputShift');
                const d = dateInput?.value || currentScheduleDate;
                const sh = shiftSelect?.value || 'MORNING';

                PawpalStaff.state.mockRoster = PawpalStaff.state.mockRoster || {};
                PawpalStaff.state.mockRoster[d] = PawpalStaff.state.mockRoster[d] || {};
                
                const assignedItems = modal?.querySelectorAll('#shiftAssignedStaff .btn-remove-from-shift') || [];
                const assignedIds = Array.from(assignedItems).map(b => b.getAttribute('data-id'));
                PawpalStaff.state.mockRoster[d][sh] = assignedIds;

                renderScheduleTable();
                PawpalStaff.showToast('Đã lưu phân ca làm việc thành công!', 'success');
                if (modal) modal.classList.remove('active');
            });
        }

        // Nút mở modal đơn xin nghỉ phép / đổi ca
        const btnOpenLeaveSwap = document.getElementById('btnOpenLeaveSwapModal');
        if (btnOpenLeaveSwap) {
            btnOpenLeaveSwap.addEventListener('click', () => openLeaveSwapModal('LEAVE'));
        }

        const btnOpenLeaveTray = document.getElementById('btnOpenLeaveModalFromTray');
        if (btnOpenLeaveTray) {
            btnOpenLeaveTray.addEventListener('click', () => openLeaveSwapModal('LEAVE'));
        }

        // Xử lý lưu đơn chờ duyệt
        const btnSubmitPending = document.getElementById('btnSubmitLeavePending');
        if (btnSubmitPending) {
            btnSubmitPending.addEventListener('click', () => {
                const modal = document.getElementById('leaveSwapModalOverlay');
                const mode = modal?.getAttribute('data-mode') || 'LEAVE';
                const staffList = PawpalStaff.state?.mockStaff || [];

                PawpalStaff.state.mockLeaveSwapRequests = PawpalStaff.state.mockLeaveSwapRequests || [];

                if (mode === 'LEAVE') {
                    const sId = document.getElementById('leaveInputStaff')?.value;
                    const staff = staffList.find(s => s.id === sId);
                    const startDate = document.getElementById('leaveInputStartDate')?.value;
                    const shiftScope = document.getElementById('leaveInputScope')?.value;
                    const reason = document.getElementById('leaveInputReason')?.value.trim() || 'Việc cá nhân';

                    PawpalStaff.state.mockLeaveSwapRequests.unshift({
                        id: `REQ-${Date.now()}`,
                        type: 'LEAVE',
                        staffId: sId,
                        staffName: staff ? staff.name : 'Nhân sự',
                        date: PawpalStaff.formatDateVN(startDate),
                        shift: shiftScope === 'ALL' ? 'Cả ngày' : 'Ca sáng',
                        reason: reason,
                        status: 'PENDING'
                    });
                } else {
                    const sFromId = document.getElementById('swapInputStaffFrom')?.value;
                    const sToId = document.getElementById('swapInputStaffTo')?.value;
                    const staffFrom = staffList.find(s => s.id === sFromId);
                    const staffTo = staffList.find(s => s.id === sToId);
                    const fromDate = document.getElementById('swapInputDateFrom')?.value;
                    const reason = document.getElementById('swapInputReason')?.value.trim() || 'Đổi ca';

                    PawpalStaff.state.mockLeaveSwapRequests.unshift({
                        id: `REQ-${Date.now()}`,
                        type: 'SWAP',
                        staffId: sFromId,
                        staffName: staffFrom ? staffFrom.name : 'Nhân sự',
                        swapWithName: staffTo ? staffTo.name : 'Nhân sự',
                        date: PawpalStaff.formatDateVN(fromDate),
                        shift: 'Đổi ca',
                        reason: reason,
                        status: 'PENDING'
                    });
                }

                renderLeaveRequestsList();
                PawpalStaff.showToast('Đã lưu đơn và chuyển vào danh sách chờ quản lý duyệt!', 'info');
                if (modal) modal.classList.remove('active');
            });
        }

        // Xử lý duyệt ngay và áp dụng
        const btnApproveImmediately = document.getElementById('btnApproveLeaveImmediately');
        if (btnApproveImmediately) {
            btnApproveImmediately.addEventListener('click', () => {
                const modal = document.getElementById('leaveSwapModalOverlay');
                const mode = modal?.getAttribute('data-mode') || 'LEAVE';
                const staffList = PawpalStaff.state?.mockStaff || [];

                if (mode === 'LEAVE') {
                    const sId = document.getElementById('leaveInputStaff')?.value;
                    const startDate = document.getElementById('leaveInputStartDate')?.value || currentScheduleDate;
                    const shiftScope = document.getElementById('leaveInputScope')?.value || 'MORNING';

                    PawpalStaff.state.mockRoster = PawpalStaff.state.mockRoster || {};
                    PawpalStaff.state.mockRoster[startDate] = PawpalStaff.state.mockRoster[startDate] || {};
                    
                    const currentInShift = PawpalStaff.state.mockRoster[startDate][shiftScope] || [];
                    PawpalStaff.state.mockRoster[startDate][shiftScope] = currentInShift.filter(id => id !== sId);
                }

                renderScheduleTable();
                PawpalStaff.showToast('Đã duyệt đơn và cập nhật trực tiếp vào lịch làm việc!', 'success');
                if (modal) modal.classList.remove('active');
            });
        }

        // Sự kiện mở modal Tray Đơn xin nghỉ và đổi ca (Modal 5)
        const btnOpenLeaveRequestsTray = document.getElementById('btnOpenLeaveRequestsTray');
        if (btnOpenLeaveRequestsTray) {
            btnOpenLeaveRequestsTray.addEventListener('click', () => {
                openLeaveRequestsTrayModal();
            });
        }

        const btnOpenLeaveModalFromTray = document.getElementById('btnOpenLeaveModalFromTray');
        if (btnOpenLeaveModalFromTray) {
            btnOpenLeaveModalFromTray.addEventListener('click', () => {
                const trayModal = document.getElementById('leaveRequestsTrayModal');
                if (trayModal) trayModal.classList.remove('active');
                openLeaveSwapModal('LEAVE');
            });
        }

        // Bộ lọc trạng thái đơn xin nghỉ trong Tray
        const filterReqButtons = [
            { id: 'btnFilterReqAll', status: 'ALL' },
            { id: 'btnFilterReqPending', status: 'PENDING' },
            { id: 'btnFilterReqApproved', status: 'APPROVED' },
            { id: 'btnFilterReqRejected', status: 'REJECTED' }
        ];

        filterReqButtons.forEach(btnConfig => {
            const btn = document.getElementById(btnConfig.id);
            if (btn) {
                btn.addEventListener('click', () => {
                    filterReqButtons.forEach(b => {
                        const el = document.getElementById(b.id);
                        if (el) el.classList.remove('active');
                    });
                    btn.classList.add('active');
                    renderLeaveRequestsList(btnConfig.status);
                });
            }
        });

        // Sự kiện mở modal Báo cáo sự cố ca trực (Modal 7)
        const btnOpenIncidentModal = document.getElementById('btnOpenIncidentReportModal');
        if (btnOpenIncidentModal) {
            btnOpenIncidentModal.addEventListener('click', () => {
                openIncidentReportModal();
            });
        }

        // Sự kiện lưu báo cáo sự cố (Modal 7)
        const btnSaveIncidentReport = document.getElementById('btnSaveIncidentReport');
        if (btnSaveIncidentReport) {
            btnSaveIncidentReport.addEventListener('click', () => {
                const modal = document.getElementById('incidentReportModalOverlay');
                const extendVal = document.getElementById('incidentInputExtend')?.value || '0';
                if (extendVal !== '0') {
                    PawpalStaff.showToast(`Đã ghi nhận sự cố và gia hạn +${extendVal} phút cho bàn dịch vụ!`, 'success');
                } else {
                    PawpalStaff.showToast('Đã lưu biên bản sự cố ca trực thành công!', 'success');
                }
                if (modal) modal.classList.remove('active');
            });
        }

        // Đóng modal qua data-close-modal, backdrop click, Escape key
        document.querySelectorAll('[data-close-modal="shiftModalOverlay"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = document.getElementById('shiftModalOverlay');
                if (modal) modal.classList.remove('active');
            });
        });

        document.querySelectorAll('[data-close-modal="leaveSwapModalOverlay"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = document.getElementById('leaveSwapModalOverlay');
                if (modal) modal.classList.remove('active');
            });
        });

        document.querySelectorAll('[data-close-modal="leaveRequestsTrayModal"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = document.getElementById('leaveRequestsTrayModal');
                if (modal) modal.classList.remove('active');
            });
        });

        document.querySelectorAll('[data-close-modal="incidentReportModalOverlay"]').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = document.getElementById('incidentReportModalOverlay');
                if (modal) modal.classList.remove('active');
            });
        });

        const shiftModalOverlay = document.getElementById('shiftModalOverlay');
        if (shiftModalOverlay) {
            shiftModalOverlay.addEventListener('click', (e) => {
                if (e.target === shiftModalOverlay) {
                    shiftModalOverlay.classList.remove('active');
                }
            });
        }

        const leaveSwapModalOverlay = document.getElementById('leaveSwapModalOverlay');
        if (leaveSwapModalOverlay) {
            leaveSwapModalOverlay.addEventListener('click', (e) => {
                if (e.target === leaveSwapModalOverlay) {
                    leaveSwapModalOverlay.classList.remove('active');
                }
            });
        }

        const leaveRequestsTrayModal = document.getElementById('leaveRequestsTrayModal');
        if (leaveRequestsTrayModal) {
            leaveRequestsTrayModal.addEventListener('click', (e) => {
                if (e.target === leaveRequestsTrayModal) {
                    leaveRequestsTrayModal.classList.remove('active');
                }
            });
        }

        const incidentReportModalOverlay = document.getElementById('incidentReportModalOverlay');
        if (incidentReportModalOverlay) {
            incidentReportModalOverlay.addEventListener('click', (e) => {
                if (e.target === incidentReportModalOverlay) {
                    incidentReportModalOverlay.classList.remove('active');
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modalShift = document.getElementById('shiftModalOverlay');
                if (modalShift && modalShift.classList.contains('active')) {
                    modalShift.classList.remove('active');
                }
                const modalLeave = document.getElementById('leaveSwapModalOverlay');
                if (modalLeave && modalLeave.classList.contains('active')) {
                    modalLeave.classList.remove('active');
                }
                const modalTray = document.getElementById('leaveRequestsTrayModal');
                if (modalTray && modalTray.classList.contains('active')) {
                    modalTray.classList.remove('active');
                }
                const modalIncident = document.getElementById('incidentReportModalOverlay');
                if (modalIncident && modalIncident.classList.contains('active')) {
                    modalIncident.classList.remove('active');
                }
            }
        });

        // URL Auto-open v=modal2 hoặc v=modal4 hoặc v=modal5 hoặc v=modal7
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('v') === 'modal2' || urlParams.get('modal') === '2' || urlParams.get('modal') === 'shift') {
            setTimeout(() => {
                openShiftModal(currentScheduleDate, 'MORNING');
            }, 300);
        } else if (urlParams.get('v') === 'modal4' || urlParams.get('modal') === '4' || urlParams.get('modal') === 'leave') {
            setTimeout(() => {
                openLeaveSwapModal('LEAVE');
            }, 300);
        } else if (urlParams.get('v') === 'modal5' || urlParams.get('modal') === '5' || urlParams.get('modal') === 'tray') {
            setTimeout(() => {
                openLeaveRequestsTrayModal();
            }, 300);
        } else if (urlParams.get('v') === 'modal7' || urlParams.get('modal') === '7' || urlParams.get('modal') === 'incident') {
            setTimeout(() => {
                openIncidentReportModal();
            }, 300);
        }

        renderScheduleTable();
    }

    window.addEventListener('pawpal:staff-data-loaded', () => {
        renderScheduleTable();
    });

    const datePicker = document.getElementById('scheduleDatePicker');
    datePicker?.addEventListener('change',()=>{if(datePicker.value){currentScheduleDate=datePicker.value;renderScheduleTable();}});

    PawpalStaff.subtabs.schedule = {
        init: initScheduleSubtab,
        renderScheduleTable,
        renderLiveWorkstations,
        renderLeaveRequestsList,
        openShiftModal,
        openLeaveSwapModal,
        openLeaveRequestsTrayModal,
        openIncidentReportModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScheduleSubtab);
    } else {
        initScheduleSubtab();
    }
})();
