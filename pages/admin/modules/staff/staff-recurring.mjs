const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const weekdays=['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
export async function mountRecurringSchedule(root,{staff,client,enhanceSelect=()=>{}}){
 let rows=[],editing=null,disposed=false,busy=false;
 root.innerHTML=`<h3>Lịch làm việc định kỳ</h3><p class="staff-calendar-meta">Dùng để nhận yêu cầu đặt xa ngày. Ca phân theo ngày được ưu tiên; lịch hẹn chỉ xác nhận khi có ca cụ thể.</p>
 <form class="staff-recurring-form" onsubmit="return false;">
 <div class="form-group-item"><label class="form-label-clean">Nhân viên <span style="color:#DC2626">*</span></label><select class="admin-select" name="staff" required><option value="">Chọn nhân viên</option>${staff.filter(s=>s.status==='ACTIVE').map(s=>`<option value="${esc(s.rawId)}">${esc(s.name)}</option>`).join('')}</select></div>
 <div class="form-group-item"><label class="form-label-clean">Ngày trong tuần <span style="color:#DC2626">*</span></label><div class="staff-recurring-days">${weekdays.map((name,index)=>`<label><input type="checkbox" name="weekday" value="${index+1}"> ${name}</label>`).join('')}</div></div>
 <div class="staff-recurring-fields"><label>Bắt đầu <span style="color:#DC2626">*</span><input class="admin-input" name="start" type="time" required></label><label>Kết thúc <span style="color:#DC2626">*</span><input class="admin-input" name="end" type="time" required></label><label>Áp dụng từ <span style="color:#DC2626">*</span><input class="admin-input" name="from" type="date" required></label><label>Đến ngày<input class="admin-input" name="to" type="date"></label></div>
 <label><input type="checkbox" name="active" checked> Đang áp dụng</label>
 <p class="staff-recurring-feedback" role="status"></p><div class="staff-recurring-actions"><button type="button" class="admin-btn admin-btn-secondary" data-reset>Nhập lịch mới</button><button type="button" class="admin-btn admin-btn-primary" data-save>Lưu lịch định kỳ</button></div></form><div class="staff-recurring-list"></div>`;
 const form=root.querySelector('form'),fields=form.elements,feedback=root.querySelector('[role="status"]'),list=root.querySelector('.staff-recurring-list');
 enhanceSelect(fields.staff);form.addEventListener('submit',event=>event.preventDefault());
 function reset(){editing=null;form.reset();fields.from.value=new Date(Date.now()+7*3600000).toISOString().slice(0,10);fields.staff.dispatchEvent(new Event('change'));feedback.textContent='';}
 function edit(row){if(busy)return;editing=row;fields.staff.value=row.staff_id;fields.staff.dispatchEvent(new Event('change'));fields.start.value=row.start_time.slice(0,5);fields.end.value=row.end_time.slice(0,5);fields.from.value=row.valid_from;fields.to.value=row.valid_to||'';fields.active.checked=row.is_active;form.querySelectorAll('[name="weekday"]').forEach(input=>input.checked=row.weekdays.includes(Number(input.value)));feedback.textContent='Đang sửa lịch định kỳ.';}
 function draw(){
  list.innerHTML=rows.length?rows.map((row,index)=>`<div class="staff-recurring-row"><div><strong>${esc(staff.find(s=>s.rawId===row.staff_id)?.name||'Nhân viên')}</strong><p>${row.weekdays.map(day=>weekdays[day-1]).join(', ')} · ${esc(row.start_time.slice(0,5))}–${esc(row.end_time.slice(0,5))} · ${row.is_active?'Đang áp dụng':'Ngừng áp dụng'}</p><p>Từ ${esc(row.valid_from)}${row.valid_to?' đến '+esc(row.valid_to):''}</p></div><button type="button" class="admin-btn admin-btn-secondary" data-edit="${index}">Sửa lịch</button></div>`).join(''):'<p class="staff-calendar-meta">Chưa có lịch làm việc định kỳ.</p>';
  list.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>edit(rows[Number(button.dataset.edit)]));
 }
 async function load(){
  const all=[];for(let offset=0;;offset+=500){const {data,error}=await client.from('staff_recurring_schedule').select('*').order('staff_id').order('id').range(offset,offset+499);if(error)throw error;all.push(...data);if(data.length<500)break;}
  if(!disposed){rows=all;draw();}
 }
 root.querySelector('[data-reset]').onclick=()=>{if(!busy)reset();};
 root.querySelector('[data-save]').onclick=async()=>{
  if(busy)return;
  const days=[...form.querySelectorAll('[name="weekday"]:checked')].map(input=>Number(input.value));
  if(!form.reportValidity()||!days.length||fields.end.value<=fields.start.value||fields.to.value&&fields.to.value<fields.from.value){feedback.textContent='Chọn nhân viên, ngày trong tuần và khoảng thời gian hợp lệ.';return;}
  busy=true;const button=root.querySelector('[data-save]');button.disabled=true;feedback.textContent='Đang lưu…';
  try{
   const {error}=await client.rpc('save_staff_recurring_schedule',{p_id:editing?.id||crypto.randomUUID(),p_revision:editing?.updated_at||null,p_details:{staff_id:fields.staff.value,weekdays:days,start_time:fields.start.value,end_time:fields.end.value,valid_from:fields.from.value,valid_to:fields.to.value||null,is_active:fields.active.checked}});
   if(error)throw error;await load();reset();feedback.textContent='Đã lưu lịch định kỳ. Lịch hẹn đang chờ vẫn cần xác nhận sau khi phân ca cụ thể.';
  }catch(error){feedback.textContent=error.message==='staff_schedule_changed'?'Lịch đã thay đổi. Mở lại để cập nhật.':'Không thể lưu lịch định kỳ. Kiểm tra thông tin và quyền phân ca.';}finally{busy=false;button.disabled=false;}
 };
 reset();try{await load();}catch{feedback.textContent='Không tải được lịch định kỳ. Vui lòng thử lại.';}
 const channel=client.channel?.('admin-staff-recurring').on('postgres_changes',{event:'*',schema:'public',table:'staff_recurring_schedule'},()=>{if(!disposed&&!root.hidden)load().catch(()=>{feedback.textContent='Chưa cập nhật được danh sách lịch định kỳ.';});}).subscribe();
 return ()=>{disposed=true;if(channel)client.removeChannel(channel);};
}
