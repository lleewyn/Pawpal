const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const localTime=value=>new Date(Date.parse(value)+7*3600000).toISOString().slice(0,16);
const displayTime=value=>new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'}).format(new Date(value));
const confirmationErrors={
 staff_schedule_forbidden:'Bạn chưa có quyền bổ sung ca làm. Có thể xác nhận khi nhân viên đã có ca phù hợp.',
 booking_shift_must_cover:'Ca làm phải bao trọn giờ hẹn và không dài quá 24 giờ.',
 booking_shift_overlap:'Khoảng giờ này giao với ca đang có. Kiểm tra lại giờ bắt đầu và kết thúc ca.',
 staff_not_available:'Nhân viên có lịch nghỉ hoặc không thể nhận ca trong khoảng giờ này.',
 booking_has_started:'Giờ hẹn đã qua. Kiểm tra lại lịch trước khi xác nhận.',
 preferred_staff_unavailable:'Nhân viên không còn đủ điều kiện hoặc có lịch trùng giờ. Vui lòng kiểm tra lại.',
 proposal_staff_unavailable:'Nhân viên đề xuất không còn trống hoặc chưa đủ điều kiện nhận lịch. Vui lòng chọn nhân viên hoặc giờ khác.',
 staff_request_conflict:'Yêu cầu đã được xử lý với nội dung khác. Vui lòng mở lại hồ sơ để đối chiếu.'
};
export function mountAdminStaffRequest(root,booking,{client,staff,onSaved,enhance=()=>{},canWrite=false,canSchedule=false,canViewSchedule=false,errorMessage=error=>error.message}){
 root.replaceChildren();if(!booking.requestedStaffId||!['pending','confirmed'].includes(booking.status))return;
 const confirmed=booking.staffConfirmationStatus==='confirmed',awaiting=booking.staffConfirmationStatus==='awaiting_customer';
 const title=document.createElement('h4');title.textContent=confirmed?'Nhân viên đã xác nhận':awaiting?'Đang chờ khách đồng ý thay đổi':'Phân công nhân viên';
 const note=document.createElement('p');note.className='staff-request-summary';
 note.innerHTML=`<strong>${esc(booking.requestedStaffName||'Đang cập nhật')}</strong> · ${esc(displayTime(booking.scheduledStartAt))} – ${esc(displayTime(booking.scheduledEndAt))}`;
 root.append(title,note);
 if(confirmed){
  const saved=document.createElement('p');saved.textContent='Đã phân công và đồng bộ lịch làm việc.';root.append(saved);
  if(canViewSchedule){const link=document.createElement('a');link.className='admin-btn admin-btn-secondary';link.href='#tab-staff-schedule';link.textContent='Xem lịch nhân sự';root.append(link);}
 }
 if(awaiting){const pending=document.createElement('p');pending.textContent='Lịch hiện tại được giữ nguyên trong khi chờ khách đồng ý đề xuất.';root.append(pending);}
 if(!canWrite)return;
 const form=document.createElement('form');form.className='future-staff-request-form';form.setAttribute('onsubmit','return false;');
 form.innerHTML=`${!awaiting&&!confirmed?`<div class="staff-request-actions"><button type="button" class="admin-btn admin-btn-primary" data-confirm>Phân công và xác nhận</button>${canSchedule?'<button type="button" class="admin-btn admin-btn-secondary" data-shift-toggle aria-expanded="false">Điều chỉnh ca làm</button>':''}<button type="button" class="admin-btn admin-btn-secondary" data-proposal-toggle aria-expanded="false">Đề xuất thay đổi</button></div>
 ${canSchedule?`<div data-shift-fields hidden><div class="staff-recurring-fields"><label>Bắt đầu ca <span class="required">*</span><input type="datetime-local" class="admin-input" name="shiftStart" value="${esc(localTime(booking.scheduledStartAt))}" required></label><label>Kết thúc ca <span class="required">*</span><input type="datetime-local" class="admin-input" name="shiftEnd" value="${esc(localTime(booking.scheduledEndAt))}" required></label></div></div><p class="staff-request-hint">Dùng ca phù hợp đã có; nếu thiếu, bổ sung ca theo giờ hẹn. Bạn có thể điều chỉnh giờ ca trước khi xác nhận.</p>`:'<p class="staff-request-hint">Nhân viên cần có ca làm phù hợp để xác nhận lịch hẹn.</p>'}`:'<button type="button" class="admin-btn admin-btn-secondary" data-proposal-toggle aria-expanded="false">Đề xuất thay đổi</button>'}
 <div data-proposal-fields hidden></div><p role="status" aria-live="polite"></p>`;
 root.append(form);form.addEventListener('submit',event=>event.preventDefault());
 const feedback=form.querySelector('[role="status"]');let busy=false,acknowledged=false,proposalLoaded=false,request=null,requestBody=null;
 const confirmButton=form.querySelector('[data-confirm]');
 function toggle(button,panel){panel.hidden=!panel.hidden;button.setAttribute('aria-expanded',String(!panel.hidden));}
 const shiftToggle=form.querySelector('[data-shift-toggle]');
 if(shiftToggle)shiftToggle.onclick=()=>toggle(shiftToggle,form.querySelector('[data-shift-fields]'));
 form.querySelector('[data-proposal-toggle]').onclick=async()=>{
  const panel=form.querySelector('[data-proposal-fields]'),button=form.querySelector('[data-proposal-toggle]');toggle(button,panel);
  if(panel.hidden&&feedback.textContent==='Đang tải danh sách nhân viên…')feedback.textContent='';
  if(proposalLoaded)return;proposalLoaded=true;
  panel.innerHTML=`<div class="staff-recurring-fields"><div class="form-group-item"><label for="futureBookingStaff">Nhân viên đề xuất <span class="required">*</span></label><select id="futureBookingStaff" class="admin-select" name="staff" required><option value="">Chọn nhân viên</option></select></div><label>Giờ đề xuất <span class="required">*</span><input type="datetime-local" class="admin-input" name="start" value="${esc(localTime(booking.scheduledStartAt))}" required></label><label>Lý do <span class="required">*</span><input type="text" class="admin-input" name="note" required minlength="3" maxlength="2000"></label></div><p class="staff-request-hint">Nếu thiếu ca làm, hệ thống bổ sung ca cho nhân viên mới theo giờ đề xuất. Lịch hẹn chỉ đổi khi khách đồng ý.</p><div class="staff-request-actions"><button type="button" class="admin-btn admin-btn-secondary" data-propose>Gửi đề xuất cho khách</button></div>`;
  const staffSelect=form.elements.staff;
  const renderStaff=rows=>{
   staffSelect.replaceChildren(new Option('Chọn nhân viên',''));
   (rows||[]).filter(s=>s.id&&s.full_name&&s.employment_status!=='inactive'&&!s.service_locked).forEach(s=>staffSelect.add(new Option(s.full_name,s.id)));
   enhance();
  };
  renderStaff(staff);panel.querySelector('[data-propose]').onclick=()=>save(true);
  if(staffSelect.options.length>1)return;
  feedback.textContent='Đang tải danh sách nhân viên…';
  try{
   const result=await client.rpc('admin_service_staff_candidates');if(result.error)throw result.error;
   if(!root.isConnected)return;renderStaff(result.data||[]);
   feedback.textContent=panel.hidden?'':result.data?.length?'':'Chưa có nhân viên đang hoạt động để đề xuất.';
  }catch(error){if(root.isConnected){feedback.textContent=errorMessage(error)||'Không tải được danh sách nhân viên.';proposalLoaded=false;}}
 };
 async function save(proposal){
  if(busy||acknowledged)return;
  if(proposal){
   for(const field of [form.elements.staff,form.elements.start,form.elements.note])if(!field.reportValidity())return;
  }else if(form.querySelector('[data-shift-fields]')&&!form.querySelector('[data-shift-fields]').hidden){
   for(const field of [form.elements.shiftStart,form.elements.shiftEnd])if(!field.reportValidity())return;
  }
  const args=proposal?{p_id:booking.dbId,p_revision:booking.updatedAt,p_staff:form.elements.staff.value,p_start:new Date(form.elements.start.value+':00+07:00').toISOString(),p_note:form.elements.note.value.trim()}
   :{p_id:booking.dbId,p_revision:booking.updatedAt,p_shift_start:form.elements.shiftStart?.value?new Date(form.elements.shiftStart.value+':00+07:00').toISOString():booking.scheduledStartAt,p_shift_end:form.elements.shiftEnd?.value?new Date(form.elements.shiftEnd.value+':00+07:00').toISOString():booking.scheduledEndAt};
  if(!proposal){const body=JSON.stringify(args);if(body!==requestBody){request=crypto.randomUUID();requestBody=body;}args.p_request=request;}
  busy=true;const controls=[...form.querySelectorAll('button,input,select')].map(control=>[control,control.disabled]);controls.forEach(([control])=>control.disabled=true);feedback.textContent='Đang lưu…';
  try{
   const result=await client.rpc(proposal?'propose_booking_staff':'confirm_booking_staff_with_schedule',args);
   if(result.error)throw result.error;if(result.data!==booking.dbId)throw Error('Chưa xác minh được lịch hẹn đã lưu.');
   acknowledged=true;
   window.PawpalDataStore?.invalidate('staff:schedules*');
   await onSaved();
   if(root.contains(form))feedback.textContent=proposal?'Đã gửi đề xuất cho khách.':'Đã phân công, xác nhận và đồng bộ lịch làm việc.';
  }catch(error){
   feedback.textContent=acknowledged?'Đã lưu thành công nhưng chưa tải lại được hồ sơ. Vui lòng mở lại để kiểm tra.':confirmationErrors[error.message]||errorMessage(error);
  }finally{busy=false;controls.forEach(([control,disabled])=>control.disabled=disabled||acknowledged);}
 }
 if(confirmButton)confirmButton.onclick=()=>save(false);
}
