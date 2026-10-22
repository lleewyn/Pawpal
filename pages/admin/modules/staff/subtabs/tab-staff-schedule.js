// tab-staff-schedule.js - Subtab Lịch làm việc và Phân ca Pawpal-er
(function() {
    'use strict';

    const PawpalStaff = window.PawpalStaff = window.PawpalStaff || {};
    PawpalStaff.subtabs = PawpalStaff.subtabs || {};

    let currentScheduleView = 'DAY';
    let currentScheduleDate = new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Bangkok',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());


    function dayOffset(dateString, amount) {
        const date = new Date(`${dateString}T00:00:00Z`);
        date.setUTCDate(date.getUTCDate() + amount);
        return date.toISOString().slice(0, 10);
    }

    let schedulePage=1,editingSchedule=null,scheduleRequest=null,selectedShiftStaff=null;
    const el=id=>document.getElementById(id);
    const localTime=value=>{
        const date=new Date(value),shifted=new Date(date.getTime()+7*3600000);
        return shifted.toISOString().slice(0,16);
    };
    function scheduleError(error){return ({staff_schedule_changed:'Ca đã thay đổi. Đóng và mở lại để kiểm tra.',staff_schedule_forbidden:'Bạn chưa có quyền phân ca.',staff_has_service_booking:'Nhân viên đang có lịch dịch vụ trong khoảng này. Cần xử lý lịch dịch vụ trước khi ghi nghỉ.',invalid_staff_schedule:'Chọn nhân viên, nhập đủ giờ bắt đầu/kết thúc và lý do nếu nghỉ hoặc hủy.',staff_request_conflict:'Yêu cầu đã được ghi với nội dung khác. Mở lại ca để đối chiếu.'})[error?.message]||(error?.code==='23P01'?'Khoảng thời gian bị trùng với ca đang có.':'Không thể lưu ca. Kiểm tra thông tin và thử lại.');}
    function renderScheduleTable(){
        if(!PawpalStaff.state.isLoaded)return;
        const picker=el('scheduleDatePicker');if(picker&&!picker.value)picker.value=currentScheduleDate;
        el('scheduleDayViewWrapper').hidden=currentScheduleView!=='DAY';el('scheduleWeekViewWrapper').hidden=currentScheduleView!=='WEEK';
        let start=currentScheduleDate;if(currentScheduleView==='WEEK'){const d=new Date(start+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);start=d.toISOString().slice(0,10);}
        const end=dayOffset(start,currentScheduleView==='WEEK'?7:1),from=Date.parse(start+'T00:00:00+07:00'),to=Date.parse(end+'T00:00:00+07:00');
        const role=el('scheduleFilterPosition')?.value||'ALL';
        const availability=el('scheduleFilterShift')?.value||'ALL';
        const rows=PawpalStaff.state.schedules.filter(s=>Date.parse(s.start_at)<to&&Date.parse(s.end_at)>from).filter(s=>role==='ALL'||PawpalStaff.state.staff.find(v=>v.rawId===s.staff_id)?.role===role).filter(s=>availability==='ALL'||s.availability_status===availability).sort((a,b)=>Date.parse(a.start_at)-Date.parse(b.start_at)||a.id.localeCompare(b.id));
        const people=[...new Set(rows.map(s=>s.staff_id))];
        schedulePage=Math.max(1,Math.min(schedulePage,Math.ceil(people.length/10)||1));
        const visible=new Set(people.slice((schedulePage-1)*10,schedulePage*10));
        const body=el('scheduleTableBody');body.replaceChildren();
        const week=el('scheduleWeekViewWrapper');week.replaceChildren();
        const make=(tag,css,text)=>{const node=document.createElement(tag);node.className=css;if(text!==undefined)node.textContent=text;return node;};
        const hours=milliseconds=>new Intl.NumberFormat('vi-VN',{maximumFractionDigits:2}).format(milliseconds/3600000)+' giờ';
        const dayLabel=value=>new Date(value+'T00:00:00+07:00').toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit'});
        const shiftCard=(schedule,showName=false)=>{
            const staff=PawpalStaff.state.staff.find(s=>s.rawId===schedule.staff_id),card=make('div','staff-calendar-shift'+(schedule.schedule_status!=='active'?' is-cancelled':''));card.dataset.scheduleId=schedule.id;
            if(showName)card.append(make('strong','staff-calendar-name',staff?.name||'—'));
            const first=localTime(schedule.start_at),last=localTime(schedule.end_at);
            card.append(make('div','staff-calendar-time',first.slice(11)+' – '+last.slice(11)));
            if(first.slice(0,10)!==last.slice(0,10))card.append(make('div','staff-calendar-meta',dayLabel(first.slice(0,10))+' → '+dayLabel(last.slice(0,10))));
            const state=make('div','staff-calendar-state'),inactive=schedule.schedule_status!=='active';
            state.append(make('span','admin-badge '+(inactive?'badge-neutral':schedule.availability_status==='available'?'badge-success':'badge-warning'),inactive?(schedule.schedule_status==='cancelled'?'Đã hủy':'Không hiệu lực'):({available:'Đi làm',leave:'Nghỉ phép',absent:'Vắng mặt',unavailable:'Không khả dụng'})[schedule.availability_status]||schedule.availability_status));
            state.append(make('span','staff-calendar-meta',hours(Date.parse(schedule.end_at)-Date.parse(schedule.start_at))));card.append(state);
            if(schedule.reason)card.append(make('p','staff-calendar-note',schedule.reason));
            const button=make('button','admin-btn admin-btn-secondary staff-calendar-edit','Xem và sửa');button.type='button';button.onclick=()=>openShiftModal(null,null,null,schedule);card.append(button);return card;
        };
        if(!rows.length)body.append(make('p','staff-calendar-empty','Chưa có ca trong ngày đang xem.'));
        for(const id of visible){
            const staff=PawpalStaff.state.staff.find(s=>s.rawId===id),shifts=rows.filter(s=>s.staff_id===id),card=make('article','staff-calendar-person');card.dataset.staffId=id;
            const header=make('div','staff-calendar-person-header'),identity=make('div','staff-calendar-identity'),avatar=make('span','staff-calendar-avatar',(staff?.name||'').trim().split(/\s+/).slice(-2).map(s=>s[0]).join(''));
            const position=({'cham_soc_thu_cung':'Chăm sóc thú cưng'})[staff?.position]||staff?.position||'—';
            const label=make('div','');label.append(make('h3','staff-calendar-name',staff?.name||'—'),make('div','staff-calendar-meta',position));identity.append(avatar,label);header.append(identity);card.append(header);
            const total=shifts.filter(s=>s.schedule_status==='active'&&s.availability_status==='available').reduce((sum,s)=>sum+Math.max(0,Math.min(to,Date.parse(s.end_at))-Math.max(from,Date.parse(s.start_at))),0);
            card.append(make('div','staff-calendar-total',hours(total)+' làm việc trong ngày'));
            for(const schedule of shifts)card.append(shiftCard(schedule));body.append(card);
        }
        for(let index=0;index<7;index++){
            const date=dayOffset(start,index),left=Date.parse(date+'T00:00:00+07:00'),right=Date.parse(dayOffset(date,1)+'T00:00:00+07:00'),column=make('section','staff-calendar-day');column.dataset.date=date;
            column.append(make('h3','staff-calendar-day-title',(index===6?'Chủ nhật':'Thứ '+(index+2))+' · '+dayLabel(date)));
            const shifts=rows.filter(s=>visible.has(s.staff_id)&&Date.parse(s.start_at)<right&&Date.parse(s.end_at)>left);
            if(!shifts.length)column.append(make('p','staff-calendar-empty','Chưa có ca'));
            for(const schedule of shifts)column.append(shiftCard(schedule,true));week.append(column);
        }
        let pager=el('staffSchedulePager');if(!pager){pager=make('div','staff-calendar-pager');pager.id='staffSchedulePager';el('scheduleDayViewWrapper').closest('.admin-card').after(pager);}
        pager.replaceChildren();const pages=Math.ceil(people.length/10)||1;pager.hidden=!people.length;
        for(const [text,target] of [['<',schedulePage-1],[String(schedulePage),schedulePage],['>',schedulePage+1]]){const button=document.createElement('button');button.type='button';button.className='admin-btn';button.textContent=text;button.style.cssText='border:none;background:transparent';if(target===schedulePage&&text!=='<'&&text!=='>')button.style.cssText='border:none;background:#236B48;color:white';button.disabled=target<1||target>pages;button.onclick=()=>{schedulePage=target;renderScheduleTable();};pager.append(button);}
        renderLiveWorkstations();renderLeaveRequestsList();
    }
    function openShiftModal(dateStr,unused,preselectedStaffId=null,schedule=null){
        const form=el('shiftModalForm');form.reset();editingSchedule=schedule?structuredClone(schedule):null;scheduleRequest=crypto.randomUUID();selectedShiftStaff=schedule?.staff_id||preselectedStaffId||null;
        const staff=PawpalStaff.state.staff.find(s=>s.rawId===selectedShiftStaff||s.id===selectedShiftStaff);selectedShiftStaff=staff?.rawId||null;
        el('shiftStaffSearch').value=staff?.name||'';el('shiftInputStart').value=schedule?localTime(schedule.start_at):'';el('shiftInputEnd').value=schedule?localTime(schedule.end_at):'';
        el('shiftAvailability').value=schedule?.availability_status||'available';el('shiftStatus').value=schedule?.schedule_status||'active';el('shiftReason').value=schedule?.reason||'';el('shiftAlertBanner').textContent='';el('shiftAlertBanner').style.display='none';
        el('shiftStatus').disabled=!schedule;el('shiftModalOverlay').classList.add('active');
        const input=el('shiftStaffSearch'),popover=el('shiftStaffOptions');
        const render=()=>{popover.replaceChildren();for(const s of PawpalStaff.state.staff.filter(s=>PawpalStaff.matchSearch(s.name+' '+s.position,input.value))){const button=document.createElement('button');button.type='button';button.className='admin-btn';button.style.cssText='display:block;width:100%;text-align:left;background:transparent;border:none';button.textContent=s.name+' · '+s.position;button.onclick=()=>{selectedShiftStaff=s.rawId;input.value=s.name;popover.style.display='none';};popover.append(button);}popover.style.display=popover.childElementCount?'block':'none';};
        input.onfocus=render;input.oninput=()=>{selectedShiftStaff=null;render();};input.onblur=()=>setTimeout(()=>popover.style.display='none',120);input.onkeydown=e=>{if(e.key==='Escape')popover.style.display='none';};popover.style.display='none';
    }
    async function saveCustomShift(){
        const button=el('btnSaveShift');if(button.disabled)return;button.disabled=true;
        try{
            const start=el('shiftInputStart').value,end=el('shiftInputEnd').value;
            if(!selectedShiftStaff||!start||!end)throw Error('invalid_staff_schedule');
            const details={staff_id:selectedShiftStaff,start_at:new Date(start+':00+07:00').toISOString(),end_at:new Date(end+':00+07:00').toISOString(),availability_status:el('shiftAvailability').value,schedule_status:el('shiftStatus').value,reason:el('shiftReason').value.trim()};
            const {error}=await window.getSupabaseClient().rpc('save_admin_staff_schedule',{p_request_id:scheduleRequest,p_schedule_id:editingSchedule?.id||scheduleRequest,p_expected_updated_at:editingSchedule?.updated_at||null,p_details:details});if(error)throw error;
            await PawpalStaff.loadStaffModuleData({force:true});currentScheduleDate=start.slice(0,10);el('scheduleDatePicker').value=currentScheduleDate;renderScheduleTable();el('shiftModalOverlay').classList.remove('active');PawpalStaff.showToast('Đã lưu ca làm việc.','success');
        }catch(error){el('shiftAlertBanner').textContent=scheduleError(error);el('shiftAlertBanner').style.display='block';}
        finally{button.disabled=false;}
    }


    function renderLiveWorkstations() {
        const container = document.getElementById('liveWorkstationsGrid') || document.getElementById('liveWorkstationsContainer');
        if (!container) return;
        const workstations = PawpalStaff.state?.workstations || [];

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
    async function reviewRequest(id,approve){
        const client=await requireStaffAuth();const {error}=await client.rpc('review_admin_staff_shift_request',{p_request_id:id,p_approve:approve});if(error)throw error;
        await PawpalStaff.loadStaffModuleData({force:true});renderScheduleTable();renderLeaveRequestsList(currentTrayFilter);
    }
    async function saveShiftRequest(approveImmediately,button){
        if(button.disabled)return;button.disabled=true;const modal=document.getElementById('leaveSwapModalOverlay'),errorEl=document.getElementById('staffShiftRequestError');errorEl.textContent='';
        try{
            const rows=PawpalStaff.state.schedules,source=rows.find(r=>r.id===document.getElementById('requestSourceSchedule').value),target=rows.find(r=>r.id===document.getElementById('requestTargetSchedule').value),kind=document.getElementById('requestKind').value;
            if(!source||(kind==='SWAP'&&!target))throw Error('Chọn ca làm việc thực tế cần xử lý.');
            const details={request_type:kind,schedule_id:source.id,expected_updated_at:source.updated_at,reason:document.getElementById('requestReason').value.trim(),...(kind==='SWAP'?{target_schedule_id:target.id,target_expected_updated_at:target.updated_at}:{leave_type:document.getElementById('requestLeaveType').value})};
            if(details.reason.length<3)throw Error('Nhập lý do ít nhất 3 ký tự.');
            const {error}=await (await requireStaffAuth()).rpc('save_admin_staff_shift_request',{p_request_id:modal.dataset.requestId,p_details:details,p_approve:approveImmediately});if(error)throw error;
            await PawpalStaff.loadStaffModuleData({force:true});renderScheduleTable();renderLeaveRequestsList(currentTrayFilter);modal.classList.remove('active');PawpalStaff.showToast(approveImmediately?'Đã duyệt đơn và áp dụng ca làm việc.':'Đã lưu đơn chờ duyệt.','success');
        }catch(error){errorEl.textContent=({staff_schedule_changed:'Ca đã thay đổi. Đóng và mở lại để chọn ca mới.',staff_has_service_booking:'Cần chuyển giao lịch dịch vụ trước khi nghỉ hoặc đổi ca.',staff_not_available:'Nhân viên chưa đủ điều kiện nhận ca.',staff_request_conflict:'Yêu cầu đã được xử lý với nội dung khác. Đóng và mở lại.'})[error.message]||error.message;}
        finally{button.disabled=false;}
    }

    let currentTrayFilter = 'ALL';

    function renderLeaveRequestsList(filterStatus = 'ALL') {
        currentTrayFilter = filterStatus;
        const container = document.getElementById('leaveRequestsListContainer');
        const countPendingEl = document.getElementById('countFilterReqPending');
        const trayPendingCountEl = document.getElementById('trayPendingCount');

        PawpalStaff.state.shiftRequests ||= [];
        const requests = PawpalStaff.state.shiftRequests;
        const pendingCount = requests.filter(r => r.status?.toLowerCase() === 'pending' || r.status === 'cho_duyet').length;

        if (countPendingEl) countPendingEl.textContent = pendingCount;
        if (trayPendingCountEl) trayPendingCountEl.textContent = pendingCount;

        if (!container) return;
        if(!PawpalStaff.state.isLoaded){container.textContent='Đang tải đơn nghỉ và đổi ca…';return;}
        if(PawpalStaff.state.requestError){container.textContent=/permission denied|row.level security/i.test(PawpalStaff.state.requestError) ? 'Phiên quản trị chưa được phép đọc đơn. Vui lòng đăng nhập lại tại /admin/login; nếu vẫn lỗi, kiểm tra liên kết Auth và quyền nhân sự.' : /schema cache|does not exist/i.test(PawpalStaff.state.requestError) ? 'Chưa có bảng đơn nghỉ/đổi ca. Cần chạy migration staff_shift_request.' : 'Không tải được đơn nghỉ/đổi ca. Vui lòng tải lại và kiểm tra kết nối.';return;}
        const safe=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

        let filtered = requests;
        if (filterStatus !== 'ALL') {
            if (filterStatus === 'PENDING') {
                filtered = requests.filter(r => r.status?.toLowerCase() === 'pending' || r.status === 'cho_duyet');
            } else if (filterStatus === 'APPROVED') {
                filtered = requests.filter(r => r.status?.toLowerCase() === 'approved' || r.status === 'da_duyet');
            } else if (filterStatus === 'REJECTED') {
                filtered = requests.filter(r => r.status?.toLowerCase() === 'rejected' || r.status === 'tu_choi');
            } else {
                filtered = requests.filter(r => r.status === filterStatus);
            }
        }

        if (filtered.length === 0) {
            container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px; text-align: center; padding: 24px;">Không có đơn xin nghỉ phép nào trong mục này.</div>';
            return;
        }

        container.innerHTML = filtered.map(req => {
            const isPending = req.status?.toLowerCase() === 'pending' || req.status === 'cho_duyet';
            const isApproved = req.status?.toLowerCase() === 'approved' || req.status === 'da_duyet';
            const isRejected = req.status?.toLowerCase() === 'rejected' || req.status === 'tu_choi';
            const badgeClass = isApproved ? 'badge-success' : (isRejected ? 'badge-danger' : 'badge-warning');
            const badgeText = isApproved ? 'Đã duyệt' : (isRejected ? 'Từ chối' : 'Chờ duyệt');

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

    let incidentAppointments=[];
    async function openIncidentReportModal(staffId=null,bookingId=null){
        const modal=document.getElementById('incidentReportModalOverlay');modal.dataset.requestId=crypto.randomUUID();document.getElementById('incidentInputNote').value='';document.getElementById('staffIncidentError').textContent='';document.getElementById('incidentInputExtend').value='0';
        const people=document.getElementById('incidentInputStaff'),bookings=document.getElementById('incidentInputBooking');people.replaceChildren(new Option('Chọn nhân viên',''),...PawpalStaff.state.staff.map(s=>new Option(s.name,s.rawId)));if(staffId)people.value=staffId;PawpalStaff.enhanceEntitySelect(people);
        bookings.replaceChildren(new Option('Đang tải lịch dịch vụ',''));modal.classList.add('active');
        try{
            incidentAppointments=await PawpalStaff.readRows(()=>window.getSupabaseClient().from('appointment').select('id,appointment_code,staff_id,updated_at,scheduled_start_at,items:appointment_item(staff_id,status),trips:taxi_trip(driver_staff_id,status)').not('appointment_status','in','(completed,cancelled,no_show)').order('scheduled_start_at').order('id'));
            const render=()=>{const selected=bookings.value;bookings.replaceChildren(new Option('Chọn lịch dịch vụ',''),...incidentAppointments.filter(a=>a.staff_id===people.value||(a.items||[]).some(i=>i.staff_id===people.value&&!['completed','cancelled'].includes(i.status))||(Array.isArray(a.trips)?a.trips:a.trips?[a.trips]:[]).some(t=>t.driver_staff_id===people.value&&!['completed','cancelled'].includes(t.status))).map(a=>new Option(a.appointment_code+' · '+new Date(a.scheduled_start_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'}),a.id)));bookings.value=selected||bookingId||'';PawpalStaff.enhanceEntitySelect(bookings);};people.onchange=render;render();
        }catch(error){document.getElementById('staffIncidentError').textContent='Không tải được lịch dịch vụ. Đóng và thử lại.';}
    }
    async function saveIncidentReport(button){
        if(button.disabled)return;button.disabled=true;const errorEl=document.getElementById('staffIncidentError');errorEl.textContent='';
        try{
            const apt=incidentAppointments.find(a=>a.id===document.getElementById('incidentInputBooking').value),staffId=document.getElementById('incidentInputStaff').value;
            const details={type:document.getElementById('incidentInputType').value,severity:document.getElementById('incidentInputSeverity').value,requested_extension_minutes:Number(document.getElementById('incidentInputExtend').value),note:document.getElementById('incidentInputNote').value.trim()};
            if(!apt||!staffId||details.note.length<3)throw Error('Chọn nhân viên, lịch được giao và mô tả sự cố ít nhất 3 ký tự.');
            const {error}=await window.getSupabaseClient().rpc('record_admin_staff_incident',{p_request_id:document.getElementById('incidentReportModalOverlay').dataset.requestId,p_appointment_id:apt.id,p_expected_updated_at:apt.updated_at,p_staff_id:staffId,p_details:details});if(error)throw error;
            document.getElementById('incidentReportModalOverlay').classList.remove('active');PawpalStaff.showToast('Đã lưu biên bản sự cố và thời gian đề nghị.','success');
        }catch(error){errorEl.textContent=error.message==='staff_work_changed'?'Lịch dịch vụ đã thay đổi. Đóng và mở lại để kiểm tra.':error.message;}
        finally{button.disabled=false;}
    }

    function openLeaveSwapModal(mode='LEAVE'){
        const modal=document.getElementById('leaveSwapModalOverlay');if(!modal)return;
        modal.dataset.requestId=crypto.randomUUID();document.getElementById('staffShiftRequestError').textContent='';document.getElementById('requestReason').value='';
        const kind=document.getElementById('requestKind');kind.value=mode;
        const options=PawpalStaff.state.schedules.filter(s=>s.schedule_status==='active'&&s.availability_status==='available').map(s=>{
            const name=PawpalStaff.state.staff.find(p=>p.rawId===s.staff_id)?.name||'—';return {id:s.id,label:name+' · '+new Date(s.start_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'})+' – '+new Date(s.end_at).toLocaleString('vi-VN',{timeZone:'Asia/Bangkok'})};
        });
        for(const id of ['requestSourceSchedule','requestTargetSchedule']){
            const select=document.getElementById(id);select.replaceChildren(new Option('Chọn ca làm việc',''),...options.map(o=>new Option(o.label,o.id)));PawpalStaff.enhanceEntitySelect(select);
        }
        const toggle=()=>{document.getElementById('requestTargetGroup').style.display=kind.value==='SWAP'?'':'none';document.getElementById('requestLeaveGroup').style.display=kind.value==='LEAVE'?'':'none';};kind.onchange=toggle;toggle();modal.classList.add('active');
    }

    function initScheduleSubtab() {
        for(const id of ['leaveSwapModalForm','incidentReportModalForm'])document.getElementById(id)?.addEventListener('submit',event=>event.preventDefault());
        // Toggle view DAY / WEEK
        const btnDay = document.getElementById('btnScheduleViewDay');
        const btnWeek = document.getElementById('btnScheduleViewWeek');

        if (btnDay) {
            btnDay.addEventListener('click', () => {
                currentScheduleView = 'DAY';
                schedulePage=1;
                if (btnDay) btnDay.classList.add('active');
                if (btnWeek) btnWeek.classList.remove('active');
                renderScheduleTable();
            });
        }

        if (btnWeek) {
            btnWeek.addEventListener('click', () => {
                currentScheduleView = 'WEEK';
                schedulePage=1;
                if (btnWeek) btnWeek.classList.add('active');
                if (btnDay) btnDay.classList.remove('active');
                renderScheduleTable();
            });
        }

        const datePicker = document.getElementById('scheduleDatePicker');
        const setScheduleDate = (date) => {
            schedulePage=1;
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
        document.getElementById('btnSaveShift').onclick=saveCustomShift;
        document.getElementById('shiftModalForm').addEventListener('submit',e=>e.preventDefault());

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
