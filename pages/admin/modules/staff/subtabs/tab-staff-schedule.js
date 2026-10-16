// tab-staff-schedule.js - Subtab Lịch làm việc và Phân ca Pawpal-er
(function() {
    'use strict';

    const PawpalStaff = window.PawpalStaff = window.PawpalStaff || {};
    PawpalStaff.subtabs = PawpalStaff.subtabs || {};

    let currentScheduleView = 'DAY';
    let currentScheduleDate = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

    const supportedShifts = new Set(['MORNING', 'AFTERNOON', 'EVENING']);
    const shiftLabels = { MORNING: 'Ca sáng', AFTERNOON: 'Ca chiều', EVENING: 'Ca tối', NIGHT: 'Ca khuya' };

    function dayOffset(dateString, amount) {
        const date = new Date(`${dateString}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() + amount);
        return date.toISOString().slice(0, 10);
    }

    function getFilteredStaffList(scope = 'DAY') {
        const roleFilter = document.getElementById('scheduleFilterPosition')?.value || 'ALL';
        const shiftFilter = document.getElementById('scheduleFilterShift')?.value || 'ALL';
        const roster = PawpalStaff.state?.mockRoster || {};
        const matchesShift = (staff) => {
            if (shiftFilter === 'ALL') return true;
            if (scope === 'WEEK') {
                const monday = new Date(`${currentScheduleDate}T00:00:00Z`);
                monday.setUTCDate(monday.getUTCDate() - (monday.getUTCDay() + 6) % 7);
                return Array.from({ length: 7 }, (_, index) => {
                    const date = new Date(monday);
                    date.setUTCDate(date.getUTCDate() + index);
                    return roster[date.toISOString().slice(0, 10)]?.[staff.id]?.includes(shiftFilter);
                }).some(Boolean);
            }
            return roster[currentScheduleDate]?.[staff.id]?.includes(shiftFilter);
        };
        return (PawpalStaff.state?.mockStaff || []).filter(staff =>
            (roleFilter === 'ALL' || staff.role === roleFilter) && matchesShift(staff)
        );
    }

    function renderScheduleTable() {
        if (!PawpalStaff.state.isLoaded) return;
        const picker = document.getElementById('scheduleDatePicker');
        if (picker && !picker.value) picker.value = currentScheduleDate;
        ['Morning','Afternoon','Evening','Night'].forEach((label,i)=>{
            const shift=['MORNING','AFTERNOON','EVENING','NIGHT'][i];
            const count=Object.values(PawpalStaff.state.mockRoster?.[currentScheduleDate] || {}).filter(shifts=>shifts.includes(shift)).length;
            const el=document.getElementById('quota'+label+'Count');if(el)el.textContent=`${count} nhân sự`;
            const badge=document.getElementById('quota'+label+'Badge');
            if(badge) {
                badge.textContent = count >= 2 ? 'Đạt định biên' : (count > 0 ? 'Cần thêm 1 KTV' : 'Chưa phân ca');
                badge.className = 'quota-status-pill ' + (count >= 2 ? 'pill-ok' : (count > 0 ? 'pill-warning' : 'pill-danger'));
            }
        });
        const active=document.getElementById('liveWorkstationsActiveCount');if(active)active.textContent='Chưa có dữ liệu bàn dịch vụ';
        const dayWrapper = document.getElementById('scheduleDayViewWrapper');
        const weekWrapper = document.getElementById('scheduleWeekViewWrapper');
        if (dayWrapper) dayWrapper.style.display = currentScheduleView === 'DAY' ? '' : 'none';
        if (weekWrapper) weekWrapper.style.display = currentScheduleView === 'WEEK' ? '' : 'none';
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
        const staffList = getFilteredStaffList('DAY');
        const roster = PawpalStaff.state?.mockRoster || {};

        if (staffList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 28px 16px; color: var(--text-muted); font-size: 13.5px;">
                        Không có nhân sự phù hợp với bộ lọc hiện tại.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = staffList.map(staff => {
            const dayRoster = (roster[currentScheduleDate] && roster[currentScheduleDate][staff.id]) || [];
            const isMorning = dayRoster.includes('MORNING');
            const isAfternoon = dayRoster.includes('AFTERNOON');
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
        const staffList = getFilteredStaffList('WEEK');

        const monday=new Date(currentScheduleDate+'T00:00:00Z');
        monday.setUTCDate(monday.getUTCDate()-(monday.getUTCDay()+6)%7);
        const dates=Array.from({length:7},(_,i)=>{const day=new Date(monday);day.setUTCDate(day.getUTCDate()+i);return day.toISOString().slice(0,10);});
        const labels=['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
        const escape=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
        const header=document.getElementById('scheduleWeekHeaderRow');
        if(header) header.innerHTML='<th>Mã NV</th><th>Họ tên</th>'+dates.map((date,i)=>`<th>${labels[i]}<br>${date.slice(8,10)}/${date.slice(5,7)}</th>`).join('')+'<th>Tổng giờ</th>';
        const shifts={MORNING:'Sáng',AFTERNOON:'Chiều',EVENING:'Tối',NIGHT:'Khuya'};
        tbody.innerHTML=staffList.map(staff=>{
            let hours=0;
            const cells=dates.map(date=>{const list=PawpalStaff.state.mockRoster?.[date]?.[staff.id]||[];hours+=list.length*4;return `<td>${list.map(shift=>shifts[shift]||escape(shift)).join(', ')||'—'}</td>`;}).join('');
            return `<tr><td>${escape(staff.id)}</td><td>${escape(staff.name)}</td>${cells}<td>${hours.toFixed(1)}h</td></tr>`;
        }).join('');
    }

    function renderLiveWorkstations() {
        const container = document.getElementById('liveWorkstationsGrid') || document.getElementById('liveWorkstationsContainer');
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

    async function requireStaffAuth() {
        const client=window.getSupabaseClient();
        const {data,error}=await client.auth.getUser();
        if(error||!data?.user) throw new Error('Phiên xác thực Supabase của quản trị chưa có hoặc đã hết hạn. Vui lòng đăng nhập lại tại /admin/login.');
        return client;
    }
    async function reviewRequest(id,approve) {
        const client=await requireStaffAuth();
        const {data,error}=await client.rpc('pawpal_review_staff_shift_request',{p_request_id:id,p_approve:approve}).single();
        if(error) throw error;
        if(!data?.id || data.status!==(approve?'APPROVED':'REJECTED')) throw new Error('Không xác minh được kết quả duyệt đơn.');
        await PawpalStaff.loadStaffModuleData({force:true});
        renderScheduleTable();renderLeaveRequestsList(currentTrayFilter);
    }
    async function saveShiftRequest(approveImmediately,button) {
        if(button.disabled) return;
        button.disabled=true;
        let savedId=null;
        try {
            const modal=document.getElementById('leaveSwapModalOverlay');
            const mode=modal.dataset.mode||'LEAVE';
            const staffList=PawpalStaff.state.mockStaff||[];
            const find=id=>staffList.find(staff=>staff.id===id)?.rawId;
            const value=id=>document.getElementById(id)?.value?.trim()||'';
            let payload;
            if(mode==='LEAVE') {
                payload={request_type:'LEAVE',staff_id:find(value('leaveInputStaff')),replacement_staff_id:find(value('leaveInputReplacement'))||null,leave_type:value('leaveInputType'),start_date:value('leaveInputStartDate'),end_date:value('leaveInputEndDate'),shift:value('leaveInputScope'),reason:value('leaveInputReason')};
            } else {
                payload={request_type:'SWAP',staff_id:find(value('swapInputStaffFrom')),target_staff_id:find(value('swapInputStaffTo')),start_date:value('swapInputDateFrom'),end_date:value('swapInputDateFrom'),shift:value('swapInputShiftFrom'),target_date:value('swapInputDateTo'),target_shift:value('swapInputShiftTo'),reason:value('swapInputReason')};
                if(payload.staff_id===payload.target_staff_id) throw new Error('Hai nhân viên đổi ca phải khác nhau.');
                if(!payload.target_staff_id||!payload.target_date||!['MORNING','AFTERNOON','EVENING'].includes(payload.target_shift)) throw new Error('Vui lòng chọn nhân viên, ngày và ca đổi hợp lệ.');
            }
            if(!payload.staff_id||!payload.start_date||!payload.end_date||!['ALL','MORNING','AFTERNOON','EVENING'].includes(payload.shift)) throw new Error('Vui lòng chọn nhân viên, ngày và ca hợp lệ; ca khuya chưa được hỗ trợ.');
            const days=(Date.parse(payload.end_date)-Date.parse(payload.start_date))/86400000;
            if(!Number.isFinite(days)||days<0||days>31) throw new Error('Khoảng ngày không hợp lệ hoặc vượt 32 ngày.');
            if(payload.reason.length<3) throw new Error('Vui lòng nhập lý do ít nhất 3 ký tự.');
            if(payload.replacement_staff_id===payload.staff_id) throw new Error('Người trực thay phải khác nhân viên xin nghỉ.');
            const client=await requireStaffAuth();
            const {data,error}=await client.from('staff_shift_request').insert(payload).select('id,status').single();
            if(error) throw error;
            if(!data?.id||data.status!=='PENDING') throw new Error('Không xác minh được đơn đã lưu.');
            savedId=data.id;
            modal.classList.remove('active');
            if(approveImmediately) await reviewRequest(savedId,true);
            else {await PawpalStaff.loadStaffModuleData({force:true});renderLeaveRequestsList();}
            PawpalStaff.showToast(approveImmediately?'Đã duyệt đơn và lưu lịch làm việc.':'Đã lưu đơn chờ duyệt vào CSDL.','success');
        } catch(err) {
            if(savedId) {
                await PawpalStaff.loadStaffModuleData({force:true});
                renderScheduleTable();
                renderLeaveRequestsList(currentTrayFilter);
            }
            PawpalStaff.showToast((savedId?'Đơn đã lưu chờ duyệt nhưng chưa áp dụng lịch. ':'Không lưu được đơn. ')+err.message,'danger');
        } finally {button.disabled=false;}
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
        if(!PawpalStaff.state.isLoaded){container.textContent='Đang tải đơn nghỉ và đổi ca…';return;}
        if(PawpalStaff.state.requestError){container.textContent=/permission denied|row.level security/i.test(PawpalStaff.state.requestError) ? 'Phiên quản trị chưa được phép đọc đơn. Vui lòng đăng nhập lại tại /admin/login; nếu vẫn lỗi, kiểm tra liên kết Auth và quyền nhân sự.' : /schema cache|does not exist/i.test(PawpalStaff.state.requestError) ? 'Chưa có bảng đơn nghỉ/đổi ca. Cần chạy migration staff_shift_request.' : 'Không tải được đơn nghỉ/đổi ca. Vui lòng tải lại và kiểm tra kết nối.';return;}
        const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

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
                            <strong style="color: var(--text-heading); font-size: 13.5px;">${safe(req.staffName)}</strong>
                            <span class="admin-badge ${badgeClass}">${badgeText}</span>
                            <span style="font-size: 11.5px; color: var(--text-muted);">${req.type === 'LEAVE' ? 'Nghỉ phép' : 'Đề xuất đổi ca'}</span>
                        </div>
                        <div style="font-size: 12.5px; color: var(--text-main);">
                            <span>Thời gian: <strong>${safe(req.date)}</strong> (${safe(req.shiftLabel||req.shift)})</span>
                            ${req.swapWithName ? `<span style="margin-left: 8px; color: #236B48;">• Đổi với: ${safe(req.swapWithName)}</span>` : ''}
                        </div>
                        <div style="font-size: 12px; color: var(--text-muted);">Lý do: ${safe(req.reason)}</div>
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

        container.querySelectorAll('.btn-approve-req,.btn-reject-req').forEach(btn=>{
            btn.addEventListener('click',async()=>{
                if(btn.disabled)return;btn.disabled=true;
                try {await reviewRequest(btn.dataset.id,btn.classList.contains('btn-approve-req'));PawpalStaff.showToast('Đã lưu kết quả xử lý đơn.','success');}
                catch(err){PawpalStaff.showToast('Không thể xử lý đơn: '+err.message,'danger');btn.disabled=false;}
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

    async function openIncidentReportModal(staffId = null, bookingId = null) {
        const modal = document.getElementById('incidentReportModalOverlay');
        if (!modal) return;

        const staffList = PawpalStaff.state?.mockStaff || [];
        const staffSelect = document.getElementById('incidentInputStaff');
        const bookingSelect = document.getElementById('incidentInputBooking');

        if (staffSelect) staffSelect.innerHTML = staffList.map(s => `<option value="${s.rawId}" ${s.id === staffId ? 'selected' : ''}>${s.name} (${s.position})</option>`).join('');

        if (bookingSelect) {
            bookingSelect.disabled = true;
            bookingSelect.innerHTML = '<option value="">Đang tải ca dịch vụ…</option>';
            try {
                const client = await requireStaffAuth();
                const { data: appointments, error } = await client
                    .from('appointment')
                    .select('id,appointment_code,pet_id,service_id,appointment_time,appointment_status')
                    .eq('appointment_date', currentScheduleDate)
                    .in('appointment_status', ['CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'])
                    .order('appointment_time', { ascending: true });
                if (error) throw error;
                const petIds = [...new Set((appointments || []).map(item => item.pet_id).filter(Boolean))];
                const serviceIds = [...new Set((appointments || []).map(item => item.service_id).filter(Boolean))];
                const [petsResult, servicesResult] = await Promise.all([
                    petIds.length ? client.from('pet_profile').select('id,pet_name').in('id', petIds) : Promise.resolve({ data: [], error: null }),
                    serviceIds.length ? client.from('service').select('id,service_name').in('id', serviceIds) : Promise.resolve({ data: [], error: null })
                ]);
                if (petsResult.error || servicesResult.error) throw (petsResult.error || servicesResult.error);
                const pets = new Map((petsResult.data || []).map(item => [item.id, item.pet_name]));
                const services = new Map((servicesResult.data || []).map(item => [item.id, item.service_name]));
                const options = (appointments || []).map(item => ({
                    id: item.id,
                    label: `${item.appointment_code} · ${pets.get(item.pet_id) || 'Bé chưa có tên'} · ${services.get(item.service_id) || 'Dịch vụ'} · ${(item.appointment_time || '').slice(0, 5)}`
                }));
                bookingSelect.innerHTML = options.length
                    ? options.map(item => `<option value="${item.id}" ${item.id === bookingId ? 'selected' : ''}>${item.label}</option>`).join('')
                    : '<option value="">Không có ca dịch vụ đang xử lý trong ngày</option>';
                bookingSelect.disabled = options.length === 0;
            } catch (error) {
                bookingSelect.innerHTML = '<option value="">Không tải được ca dịch vụ</option>';
                PawpalStaff.showToast('Không thể tải ca dịch vụ: ' + error.message, 'danger');
            }
        }

        const noteInput = document.getElementById('incidentInputNote');
        if (noteInput) noteInput.value = '';

        modal.classList.add('active');
    }

    async function saveIncidentReport(button) {
        if (button.disabled) return;
        const staffId = document.getElementById('incidentInputStaff')?.value;
        const appointmentId = document.getElementById('incidentInputBooking')?.value;
        const type = document.getElementById('incidentInputType')?.value;
        const extendMinutes = Number(document.getElementById('incidentInputExtend')?.value || 0);
        const severity = document.getElementById('incidentInputSeverity')?.value;
        const note = document.getElementById('incidentInputNote')?.value.trim() || '';
        if (!staffId || !appointmentId || !type || !severity) {
            PawpalStaff.showToast('Hãy chọn nhân sự và ca dịch vụ đang xử lý trước khi lưu biên bản.', 'danger');
            return;
        }
        if (note.length < 3) {
            PawpalStaff.showToast('Hãy ghi rõ mô tả sự cố ít nhất 3 ký tự.', 'danger');
            return;
        }
        button.disabled = true;
        try {
            const client = await requireStaffAuth();
            const description = [
                '[Pawpal incident v1]',
                `appointment_id=${appointmentId}`,
                `incident_type=${type}`,
                `severity=${severity}`,
                `extend_minutes=${extendMinutes}`,
                `note=${encodeURIComponent(note)}`
            ].join('\t');
            const { data, error } = await client.from('audit_log').insert({
                staff_id: staffId,
                action: 'OTHER',
                entity_name: 'appointment_incident',
                description
            }).select('id,staff_id,entity_name,description').single();
            if (error) throw error;
            if (!data?.id || data.staff_id !== staffId || data.entity_name !== 'appointment_incident') {
                throw new Error('Không xác minh được biên bản vừa ghi.');
            }
            document.getElementById('incidentReportModalOverlay')?.classList.remove('active');
            PawpalStaff.showToast('Đã lưu biên bản sự cố vào CSDL. Thời gian gia hạn được ghi nhận để điều phối ca.', 'success');
        } catch (error) {
            PawpalStaff.showToast('Không lưu được biên bản sự cố: ' + error.message, 'danger');
        } finally {
            button.disabled = false;
        }
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
        let currentAssignedIds = new Set();
        const nightOption = shiftSelect?.querySelector('option[value="NIGHT"]');
        if(nightOption) nightOption.disabled=true;
        function resetAssigned() {
            const date=dateInput.value, shift=shiftSelect.value;
            currentAssignedIds=new Set(staffList.filter(staff=>(roster[date]?.[staff.id]||[]).includes(shift)).map(staff=>staff.id));
        }
        resetAssigned();
        if(preselectedStaffId) currentAssignedIds.add(preselectedStaffId);

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
            shiftSelect.onchange = () => { resetAssigned(); renderModalStaffLists(); };
        }

        if(dateInput) dateInput.onchange=()=>{resetAssigned();renderModalStaffLists();};
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

        const datePicker = document.getElementById('scheduleDatePicker');
        const setScheduleDate = (date) => {
            currentScheduleDate = date;
            if (datePicker) datePicker.value = date;
            renderScheduleTable();
        };
        document.getElementById('btnPrevDay')?.addEventListener('click', () => setScheduleDate(dayOffset(currentScheduleDate, currentScheduleView === 'WEEK' ? -7 : -1)));
        document.getElementById('btnNextDay')?.addEventListener('click', () => setScheduleDate(dayOffset(currentScheduleDate, currentScheduleView === 'WEEK' ? 7 : 1)));
        document.getElementById('btnToday')?.addEventListener('click', () => setScheduleDate(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())));
        document.getElementById('scheduleFilterPosition')?.addEventListener('change', renderScheduleTable);
        document.getElementById('scheduleFilterShift')?.addEventListener('change', renderScheduleTable);

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
            btnSaveShift.addEventListener('click', async () => {
                const modal = document.getElementById('shiftModalOverlay');
                const dateInput = document.getElementById('shiftInputDate');
                const shiftSelect = document.getElementById('shiftInputShift');
                const d = dateInput?.value || currentScheduleDate;
                const sh = shiftSelect?.value || 'MORNING';

                if(btnSaveShift.disabled) return;
                btnSaveShift.disabled=true;
                try {
                    const times={MORNING:['08:00','12:00'],AFTERNOON:['13:00','17:00'],EVENING:['17:30','21:30']};
                    if(!d || !times[sh]) throw new Error('Ca khuya chưa được CSDL hỗ trợ; vui lòng chọn ca sáng, chiều hoặc tối.');
                    const client=window.getSupabaseClient();
                    const assignedIds=Array.from(modal.querySelectorAll('#shiftAssignedStaff .btn-remove-from-shift')).map(b=>b.dataset.id);
                    const staffList=PawpalStaff.state.mockStaff||[];
                    const selected=assignedIds.map(id=>staffList.find(staff=>staff.id===id));
                    if(selected.some(staff=>!staff?.rawId)) throw new Error('Không xác định được nhân viên đã chọn.');
                    const {data:rows,error}=await client.from('staff_schedule').select('*').eq('work_date',d);
                    if(error) throw error;
                    const expected=(PawpalStaff.state.schedules||[]).filter(row=>row.work_date===d && row.shift===sh);
                    const current=rows.filter(row=>row.shift===sh);
                    const signature=list=>list.map(row=>[row.id,row.updated_at,row.schedule_status].join('|')).sort().join(';');
                    if(signature(expected)!==signature(current)) throw new Error('Lịch đã thay đổi ở phiên khác; tải lại trước khi phân ca.');
                    for(const staff of selected) {
                        const other=rows.filter(row=>row.staff_id===staff.rawId && row.shift!==sh && row.schedule_status!=='OFF');
                        const hours=other.reduce((sum,row)=>{const start=Date.parse('2000-01-01T'+row.start_time),end=Date.parse('2000-01-01T'+row.end_time);return sum+(end-start)/3600000;},0);
                        if(hours+4>8) throw new Error(staff.name+' vượt giới hạn 8 giờ trong ngày.');
                    }
                    const selectedUuids=new Set(selected.map(staff=>staff.rawId));
                    for(const row of current) {
                        const wants=selectedUuids.has(row.staff_id);
                        if(!wants && ['WORKING','COMPLETED'].includes(row.schedule_status)) throw new Error('Không thể bỏ ca đã bắt đầu hoặc đã hoàn thành.');
                        if(current.filter(r=>r.staff_id===row.staff_id).length>1) throw new Error('Có lịch trùng nhân viên trong ca; cần rà soát trước khi lưu.');
                    }
                    for(const row of current) {
                        const status=selectedUuids.has(row.staff_id) ? (row.schedule_status==='OFF'?'SCHEDULED':row.schedule_status) : 'OFF';
                        if(status===row.schedule_status) continue;
                        const {data,error}=await client.from('staff_schedule').update({schedule_status:status}).eq('id',row.id).eq('schedule_status',row.schedule_status).select('id,schedule_status').single();
                        if(error) throw error;
                        if(!data?.id || data.schedule_status!==status) throw new Error('Không xác minh được lịch đã cập nhật.');
                    }
                    const additions=selected.filter(staff=>!current.some(row=>row.staff_id===staff.rawId)).map(staff=>({staff_id:staff.rawId,work_date:d,shift:sh,start_time:times[sh][0],end_time:times[sh][1],schedule_status:'SCHEDULED'}));
                    if(additions.length) {
                        const {data,error}=await client.from('staff_schedule').insert(additions).select('id,staff_id');
                        if(error) throw error;
                        if(data.length!==additions.length) throw new Error('Không xác minh được đủ lịch phân ca đã thêm.');
                    }
                    await PawpalStaff.loadStaffModuleData({force:true});
                    if(PawpalStaff.state.scheduleError) throw new Error('Đã ghi nhưng chưa tải lại được lịch; vui lòng F5 để đối chiếu.');
                    currentScheduleDate=d;
                    const picker=document.getElementById('scheduleDatePicker');if(picker)picker.value=d;
                    renderScheduleTable();
                    PawpalStaff.showToast('Đã lưu phân ca vào CSDL.','success');
                } catch(err) {
                    await PawpalStaff.loadStaffModuleData({force:true});renderScheduleTable();
                    PawpalStaff.showToast('Không thể hoàn tất phân ca: '+err.message+' Kiểm tra lịch hiện tại trước khi thử lại.','danger');return;
                } finally {btnSaveShift.disabled=false;}
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

        const pendingButton=document.getElementById('btnSubmitLeavePending');
        if(pendingButton)pendingButton.addEventListener('click',()=>saveShiftRequest(false,pendingButton));
        const approveButton=document.getElementById('btnApproveLeaveImmediately');
        if(approveButton)approveButton.addEventListener('click',()=>saveShiftRequest(true,approveButton));

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
            btnSaveIncidentReport.addEventListener('click', () => saveIncidentReport(btnSaveIncidentReport));
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
        renderLeaveRequestsList(currentTrayFilter);
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
