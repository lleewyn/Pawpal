export async function loadIntakeStaffPicker({db,bookingId,modal,select,submit}){
 const request=crypto.randomUUID();select.dataset.intakeStaffRequest=request;
 const modalBookingId=modal.dataset.bookingId;
 const current=()=>select.isConnected&&select.dataset.intakeStaffRequest===request&&modal.dataset.bookingId===modalBookingId;
 let hint=select.parentElement.querySelector('.intake-staff-hint');
 if(!hint){hint=document.createElement('p');hint.className='intake-staff-hint';hint.setAttribute('role','status');hint.style.cssText='font-size:12px;line-height:1.7;margin:8px 0 0;color:#4f7a65';select.after(hint);}
 const option=(text,value='')=>{const node=document.createElement('option');node.textContent=text;node.value=value;return node;};
 const sync=()=>{
  if(select._entityInput){select._entityInput.disabled=select.disabled;select._entityInput.value=select.value?select.selectedOptions[0]?.textContent||'':'';}
  const popover=select.parentElement.querySelector('.customer-autocomplete-popover');
  if(popover){popover.replaceChildren();popover.style.display='none';}
 };
 select.replaceChildren(option('Đang tải KTV đủ điều kiện…'));select.disabled=true;submit.disabled=true;modal.intakeStaffCandidates=[];hint.textContent='';
 sync();
 try{
  const {data,error}=await db.rpc('admin_intake_staff_candidates',{p_appointment:bookingId});
  if(error || !Array.isArray(data?.staff))throw new Error('Không tải được danh sách KTV. Vui lòng thử lại.');
  const {staff:candidates,assigned_staff_id:assignedStaffId,required_levels:requiredLevels=[]}=data;
  if(!current())return;
  modal.intakeStaffCandidates=candidates;
  select.replaceChildren(option(candidates.length?'Chọn KTV tiếp nhận':'Chưa có KTV đủ điều kiện'));
  for(const staff of candidates)select.append(option(staff.full_name+(staff.level_name?' · '+staff.level_name:''),staff.id));
  const currentBooking = (window.PawpalServices?.state?.bookingsData || []).find(b => b.id === bookingId || b.dbId === bookingId);
  const targetStaffId = assignedStaffId || currentBooking?.staffId;
  if(targetStaffId && candidates.some(staff=>staff.id===targetStaffId)){
    select.value=targetStaffId;
  } else if (!targetStaffId && candidates.length === 1) {
    select.value=candidates[0].id;
  }
  const required=requiredLevels.length?'Cấp độ yêu cầu: '+requiredLevels.join(', ')+'. ':'';
  hint.textContent=candidates.length?required:required+'Chưa có KTV đủ điều kiện tiếp nhận ca. Cần kiểm tra cấp độ chuyên môn và lịch phân công nhân sự.';
  hint.style.color=candidates.length?'#4f7a65':'#DC2626';select.disabled=!candidates.length;submit.disabled=!select.value;
  select.onchange=()=>{submit.disabled=!select.value;};
  sync();
 }catch(error){
  if(!current())return;select.replaceChildren(option('Không tải được danh sách KTV'));hint.textContent='Không tải được danh sách KTV. Vui lòng thử lại.';hint.style.color='#DC2626';
  sync();
 }
}
