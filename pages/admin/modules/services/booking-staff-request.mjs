const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function mountAdminStaffRequest(root,booking,{client,staff,onSaved,enhance=()=>{},canWrite=false,errorMessage=error=>error.message}){
 root.replaceChildren();if(!booking.requestedStaffId||!['pending','confirmed'].includes(booking.status))return;
 const title=document.createElement('h4');title.textContent=booking.staffConfirmationStatus==='confirmed'?'Nhân viên đã xác nhận':booking.staffConfirmationStatus==='awaiting_customer'?'Đang chờ khách đồng ý thay đổi':'Chờ xác nhận nhân viên';
 const note=document.createElement('p');note.textContent='Khách yêu cầu: '+(booking.requestedStaffName||'Đang cập nhật')+'. Phân ca cụ thể cho người này rồi xác nhận; nếu đổi người hoặc giờ, gửi đề xuất để khách đồng ý.';
 root.append(title,note);if(!canWrite)return;
 const form=document.createElement('form');form.className='future-staff-request-form';form.setAttribute('onsubmit','return false;');
 const local=new Date(Date.parse(booking.scheduledStartAt)+7*3600000).toISOString().slice(0,16);
 form.innerHTML=`<div class="staff-recurring-fields"><div class="form-group-item"><label>Nhân viên đề xuất <span style="color:#DC2626">*</span></label><select id="futureBookingStaff" class="admin-select" name="staff" required><option value="">Chọn nhân viên</option>${staff.filter(s=>s.employment_status==='active'&&!s.service_locked).map(s=>`<option value="${esc(s.id)}">${esc(s.full_name)}</option>`).join('')}</select></div><label>Giờ đề xuất <span style="color:#DC2626">*</span><input type="datetime-local" class="admin-input" name="start" value="${esc(local)}" required></label><label>Lý do <span style="color:#DC2626">*</span><input type="text" class="admin-input" name="note" required minlength="3" maxlength="2000"></label></div><div style="display:flex;gap:10px;flex-wrap:wrap"><button type="button" class="admin-btn admin-btn-primary" data-confirm>Xác nhận đúng nhân viên yêu cầu</button><button type="button" class="admin-btn admin-btn-secondary" data-propose>Gửi đề xuất cho khách</button></div><p role="status"></p>`;
 root.append(form);enhance();form.addEventListener('submit',event=>event.preventDefault());
 const feedback=form.querySelector('[role="status"]');let busy=false;
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
