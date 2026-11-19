const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountAdminStaffRequest(root,booking,{client,staff,onSaved,enhance=()=>{},canWrite=false,errorMessage=error=>error.message}){
 root.replaceChildren();if(!booking.requestedStaffId||!['pending','confirmed'].includes(booking.status))return;
 const title=document.createElement('h4');title.textContent=booking.staffConfirmationStatus==='confirmed'?'Nhân viên đã xác nhận':booking.staffConfirmationStatus==='awaiting_customer'?'Đang chờ khách đồng ý thay đổi':'Chờ xác nhận nhân viên';
 const note=document.createElement('p');
 note.textContent=booking.staffConfirmationStatus==='confirmed'
  ?'Đã phân công '+(booking.requestedStaffName||'nhân viên phụ trách')+' cho lịch hẹn.'
  :booking.staffConfirmationStatus==='awaiting_customer'
   ?'Đã gửi đề xuất nhân viên hoặc giờ hẹn mới. Chờ khách đồng ý trước khi cập nhật lịch.'
   :'Khách yêu cầu: '+(booking.requestedStaffName||'Đang cập nhật')+'. Phân ca cụ thể cho người này rồi xác nhận; nếu đổi người hoặc giờ, gửi đề xuất để khách đồng ý.';
 root.append(title,note);if(!canWrite)return;
 const form=document.createElement('form');form.className='future-staff-request-form';form.setAttribute('onsubmit','return false;');
 const local=new Date(Date.parse(booking.scheduledStartAt)+7*3600000).toISOString().slice(0,16);
 form.innerHTML=`<div class="staff-recurring-fields"><div class="form-group-item"><label>Nhân viên đề xuất <span style="color:#DC2626">*</span></label><select id="futureBookingStaff" class="admin-select" name="staff" required><option value="">Chọn nhân viên</option></select></div><label>Giờ đề xuất <span style="color:#DC2626">*</span><input type="datetime-local" class="admin-input" name="start" value="${esc(local)}" required></label><label>Lý do <span style="color:#DC2626">*</span><input type="text" class="admin-input" name="note" required minlength="3" maxlength="2000"></label></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="admin-btn admin-btn-primary" data-confirm>Xác nhận đúng nhân viên yêu cầu</button><button type="button" class="admin-btn admin-btn-secondary" data-propose>Gửi đề xuất cho khách</button></div><p role="status"></p>`;
 root.append(form);enhance();form.addEventListener('submit',event=>event.preventDefault());
 const feedback=form.querySelector('[role="status"]'),staffSelect=form.elements.staff;let busy=false;
 const renderStaff=rows=>{
  const current=staffSelect.value;
  staffSelect.replaceChildren(new Option('Chọn nhân viên',''));
  (rows||[]).filter(s=>s.id&&s.full_name&&s.employment_status!=='inactive'&&!s.service_locked).forEach(s=>staffSelect.add(new Option(s.full_name,s.id)));
  if([...staffSelect.options].some(option=>option.value===current))staffSelect.value=current;
  enhance();
  const search=staffSelect._entityInput;
  if(search?.nextElementSibling?.style.display==='block')search.dispatchEvent(new Event('input',{bubbles:true}));
 };
 renderStaff(staff);
 if(!staffSelect.options.length||staffSelect.options.length===1){
  feedback.textContent='Đang tải danh sách nhân viên…';
  (async()=>{
   try{
    let rows=[];
    const directory=await client.rpc('admin_service_staff_candidates');
    if(directory.error)throw directory.error;
    if(Array.isArray(directory.data))rows=directory.data;
    if(!rows.length){
     const fallback=await client.from('staff').select('id,full_name,job_title,specialization,staff_level_id,employment_status,service_locked').eq('employment_status','active').order('full_name');
     if(fallback.error)throw fallback.error;
     rows=fallback.data||[];
    }
    renderStaff(rows);
    feedback.textContent=rows.length?'Chọn nhân viên và giờ phù hợp. Hệ thống sẽ kiểm tra điều kiện nhận lịch khi gửi đề xuất.':'Chưa có nhân viên đang hoạt động để đề xuất.';
   }catch(error){feedback.textContent=errorMessage(error)||'Không tải được danh sách nhân viên. Vui lòng tải lại hồ sơ.';}
  })();
 }
 async function save(proposal){
  if(busy)return;if(proposal&&!form.reportValidity())return;
  busy=true;form.querySelectorAll('button').forEach(button=>button.disabled=true);feedback.textContent='Đang lưu…';
  try{
   const result=proposal?await client.rpc('propose_booking_staff',{p_id:booking.dbId,p_revision:booking.updatedAt,p_staff:form.elements.staff.value,p_start:new Date(form.elements.start.value+':00+07:00').toISOString(),p_note:form.elements.note.value.trim()})
    :await client.rpc('update_admin_service_booking',{p_id:booking.dbId,p_expected_updated_at:booking.updatedAt,p_action:'status',p_value:'confirmed',p_reason:'Xác nhận đúng nhân viên khách yêu cầu'});
   if(result.error)throw result.error;if(result.data!==booking.dbId)throw Error('Chưa xác minh được lịch hẹn đã lưu.');await onSaved();
  }catch(error){feedback.textContent=errorMessage(error);}finally{busy=false;form.querySelectorAll('button').forEach(button=>button.disabled=false);}
 }
 form.querySelector('[data-confirm]').disabled=booking.staffConfirmationStatus==='confirmed';
 form.querySelector('[data-confirm]').onclick=()=>save(false);form.querySelector('[data-propose]').onclick=()=>save(true);
}
