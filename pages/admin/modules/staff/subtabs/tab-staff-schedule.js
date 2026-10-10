// tab-staff-schedule.js - Subtab Lịch làm việc và Phân ca Pawpal-er
(function() {
    'use strict';

    const PawpalStaff = window.PawpalStaff = window.PawpalStaff || {};
    PawpalStaff.subtabs = PawpalStaff.subtabs || {};

    let currentScheduleView = 'DAY';
    let currentScheduleDate = new Date().toISOString().split('T')[0];

    function renderScheduleTable() {
        if (currentScheduleView === 'DAY') {
            renderScheduleDayTable();
        } else {
            renderScheduleWeekTable();
        }
        renderLiveWorkstations();
        renderLeaveRequestsList();
    }

    function renderScheduleDayTable() {
        const tbody = document.getElementById('scheduleDayTableBody');
        if (!tbody) return;
        const staffList = PawpalStaff.state?.mockStaff || [];
        const roster = PawpalStaff.state?.mockRoster || {};

        tbody.innerHTML = staffList.map(staff => {
            const dayRoster = (roster[currentScheduleDate] && roster[currentScheduleDate][staff.id]) || [staff.shift];
            const shiftStr = dayRoster.map(sh => {
                if (sh === 'MORNING') return 'Ca sáng (07:30 - 15:30)';
                if (sh === 'AFTERNOON') return 'Ca chiều (13:30 - 21:30)';
                if (sh === 'EVENING') return 'Ca tối (17:00 - 22:00)';
                if (sh === 'LEAVE') return 'Nghỉ phép';
                return 'Nghỉ ca';
            }).join(', ');

            return `
                <tr>
                    <td style="font-weight: 600;">${staff.id}</td>
                    <td>
                        <div style="font-weight: 600; color: var(--text-heading);">${staff.name}</div>
                        <div style="font-size: 11.5px; color: var(--text-muted);">${staff.position}</div>
                    </td>
                    <td>${shiftStr}</td>
                    <td style="text-align: center;">
                        <span class="admin-badge ${staff.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}">${staff.status === 'ACTIVE' ? 'Đang làm' : 'Vắng mặt'}</span>
                    </td>
                    <td style="text-align: center;">
                        <button type="button" class="admin-btn admin-btn-secondary btn-sm btn-edit-shift" data-staff-id="${staff.id}">Đổi ca</button>
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
    }

    function renderScheduleWeekTable() {
        const tbody = document.getElementById('scheduleWeekTableBody');
        if (!tbody) return;
        const staffList = PawpalStaff.state?.mockStaff || [];

        tbody.innerHTML = staffList.map(staff => `
            <tr>
                <td style="font-weight: 600;">${staff.name}</td>
                <td>Ca sáng</td>
                <td>Ca sáng</td>
                <td>Ca chiều</td>
                <td>Ca chiều</td>
                <td>Nghỉ phép</td>
                <td>Ca sáng</td>
                <td>Ca chiều</td>
            </tr>
        `).join('');
    }

    function renderLiveWorkstations() {
        const container = document.getElementById('liveWorkstationsContainer');
        if (!container) return;
        const workstations = PawpalStaff.state?.mockWorkstations || [];

        if (workstations.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); padding: 12px;">Đang tải trạng thái bàn làm việc...</div>';
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

    function renderLeaveRequestsList() {
        const container = document.getElementById('leaveRequestsListContainer');
        const badge = document.getElementById('schedulePendingBadge');
        const requests = PawpalStaff.state?.mockLeaveSwapRequests || [];

        if (badge) {
            badge.textContent = requests.length;
            badge.style.display = requests.length > 0 ? 'inline-block' : 'none';
        }

        if (!container) return;

        if (requests.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; padding: 12px;">Không có đơn xin nghỉ phép nào đang chờ duyệt.</div>';
            return;
        }

        container.innerHTML = requests.map(req => `
            <div class="leave-request-item" style="padding: 10px 0; border-bottom: 1px solid var(--border-neutral);">
                <div style="display: flex; justify-content: space-between;">
                    <strong>${req.staffName}</strong>
                    <span class="admin-badge badge-warning">Chờ duyệt</span>
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Ngày nghỉ: ${req.date} (${req.shift}) • Lý do: ${req.reason}</div>
            </div>
        `).join('');
    }

    function openShiftModal(dateStr, shiftKey, preselectedStaffId) {
        const modal = document.getElementById('modalShiftAssign');
        if (!modal) return;
        modal.setAttribute('data-target-staff', preselectedStaffId || '');
        modal.setAttribute('data-target-date', dateStr || currentScheduleDate);
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

        renderScheduleTable();
    }

    PawpalStaff.subtabs.schedule = {
        init: initScheduleSubtab,
        renderScheduleTable,
        renderLiveWorkstations,
        renderLeaveRequestsList,
        openShiftModal
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initScheduleSubtab);
    } else {
        initScheduleSubtab();
    }
})();
