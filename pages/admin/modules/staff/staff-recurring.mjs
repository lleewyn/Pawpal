const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const weekdays=['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
const displayDate=value=>value?String(value).slice(0,10).split('-').reverse().join('/'):'Không giới hạn';
export async function mountRecurringSchedule(root,{staff,client,enhanceSelect=()=>{}}){
 let rows=[],coverage=new Map(),editing=null,disposed=false,busy=false,page=1,total=0,readVersion=0,refreshTimer;
 root.innerHTML=`<h3>Lịch làm việc định kỳ</h3><p class="staff-calendar-meta">Tự tạo ca theo ngày trong 90 ngày tới. Ca chỉnh tay, ngày nghỉ và ca đã có lịch hẹn được ưu tiên.</p>
 <form class="staff-recurring-form" onsubmit="return false;">
 <div class="form-group-item"><label class="form-label-clean">Nhân viên <span style="color:#DC2626">*</span></label><select class="admin-select" name="staff" required><option value="">Chọn nhân viên</option>${staff.filter(s=>s.status==='ACTIVE').map(s=>`<option value="${esc(s.rawId)}">${esc(s.name)}</option>`).join('')}</select></div>
 <div class="form-group-item"><label class="form-label-clean">Ngày trong tuần <span style="color:#DC2626">*</span></label><div class="staff-recurring-days">${weekdays.map((name,index)=>`<label><input type="checkbox" name="weekday" value="${index+1}"> ${name}</label>`).join('')}</div></div>
 <div class="staff-recurring-fields"><label>Bắt đầu <span style="color:#DC2626">*</span><input class="admin-input" name="start" type="time" required></label><label>Kết thúc <span style="color:#DC2626">*</span><input class="admin-input" name="end" type="time" required></label><label>Áp dụng từ <span style="color:#DC2626">*</span><input class="admin-input" name="from" type="date" required></label><label>Đến ngày<input class="admin-input" name="to" type="date"></label></div>
 <label><input type="checkbox" name="active" checked> Đang áp dụng</label>
 <p class="staff-recurring-feedback" role="status"></p><div class="staff-recurring-actions"><button type="button" class="admin-btn admin-btn-secondary" data-reset>Nhập lịch mới</button><button type="button" class="admin-btn admin-btn-primary" data-save>Lưu lịch định kỳ</button></div></form><section class="admin-card customer-master-card staff-recurring-list" aria-labelledby="staffRecurringListTitle"></section><div class="staff-recurring-pager admin-pagination-bar"></div>`;
 const form=root.querySelector('form'),fields=form.elements,feedback=root.querySelector('[role="status"]'),list=root.querySelector('.staff-recurring-list');
 enhanceSelect(fields.staff);form.addEventListener('submit',event=>event.preventDefault());
 function reset(){editing=null;form.reset();fields.from.value=new Date(Date.now()+7*3600000).toISOString().slice(0,10);fields.staff.dispatchEvent(new Event('change'));feedback.textContent='';}
 function edit(row){if(busy)return;editing=row;fields.staff.value=row.staff_id;fields.staff.dispatchEvent(new Event('change'));fields.start.value=row.start_time.slice(0,5);fields.end.value=row.end_time.slice(0,5);fields.from.value=row.valid_from;fields.to.value=row.valid_to||'';fields.active.checked=row.is_active;form.querySelectorAll('[name="weekday"]').forEach(input=>input.checked=row.weekdays.includes(Number(input.value)));feedback.textContent='Đang sửa lịch định kỳ.';}
 function draw(){
  list.innerHTML=`<h3 class="admin-card-title" id="staffRecurringListTitle">Lịch định kỳ đã lưu</h3><div class="table-responsive-wrapper"><table class="admin-table staff-recurring-table"><thead><tr><th scope="col">Nhân viên</th><th scope="col">Ngày trong tuần</th><th scope="col">Giờ làm việc</th><th scope="col">Áp dụng từ</th><th scope="col">Đến ngày</th><th scope="col">Ca tự tạo đến</th><th scope="col">Trạng thái</th><th scope="col">Thao tác</th></tr></thead><tbody>${rows.length?rows.map((row,index)=>{
   const name=staff.find(s=>s.rawId===row.staff_id)?.name||'Nhân viên';
   const generatedThrough=coverage.get(row.id);
   return `<tr><td><strong>${esc(name)}</strong></td><td>${esc(row.weekdays.map(day=>weekdays[day-1]).join(', '))}</td><td class="staff-recurring-nowrap">${esc(row.start_time.slice(0,5))} – ${esc(row.end_time.slice(0,5))}</td><td class="staff-recurring-nowrap">${esc(displayDate(row.valid_from))}</td><td class="staff-recurring-nowrap">${esc(displayDate(row.valid_to))}</td><td class="staff-recurring-nowrap">${esc(generatedThrough?displayDate(generatedThrough):'—')}</td><td><span class="admin-badge ${row.is_active?'badge-active':'badge-neutral'}">${row.is_active?'Đang áp dụng':'Ngừng áp dụng'}</span></td><td><button type="button" class="staff-recurring-edit" data-edit="${index}" aria-label="Sửa lịch ${esc(name)}" title="Sửa lịch">•••</button></td></tr>`;
  }).join(''):'<tr><td colspan="8" class="staff-recurring-empty">Chưa có lịch làm việc định kỳ.</td></tr>'}</tbody></table></div>`;
  list.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>edit(rows[Number(button.dataset.edit)]));
  const pager=root.querySelector('.staff-recurring-pager');pager.replaceChildren();
  const pages=Math.ceil(total/10);
  if(pages>1){const add=(label,target,disabled)=>{const b=document.createElement('button');b.type='button';b.className='pagination-btn';b.textContent=label;b.disabled=disabled;if(label===String(page))b.setAttribute('aria-current','page');b.onclick=()=>load(target).catch(()=>feedback.textContent='Chưa tải được trang lịch. Vui lòng thử lại.');pager.append(b);};add('<',page-1,page===1);for(let i=Math.max(1,page-2);i<=Math.min(pages,page+2);i++)add(String(i),i,i===page);add('>',page+1,page===pages);}

 }
 async function load(target=page){
  const version=++readVersion;
  const {data,count,error}=await client.from('staff_recurring_schedule').select('*',{count:'exact'}).order('staff_id').order('id').range((target-1)*10,target*10-1);
  if(error)throw error;if(disposed||version!==readVersion)return;
  total=count??0;const last=Math.max(1,Math.ceil(total/10));if(target>last)return load(last);
  const generated=data.length?await client.rpc('staff_recurring_shift_coverage',{p_ids:data.map(row=>row.id)}):{data:[]};
  if(disposed||version!==readVersion)return;
  if(generated.error)throw generated.error;
  coverage=new Map(generated.data.map(row=>[row.recurring_schedule_id,row.generated_through]));
  rows=data;page=target;draw();
 }
 root.querySelector('[data-reset]').onclick=()=>{if(!busy)reset();};
 root.querySelector('[data-save]').onclick=async()=>{
  if(busy)return;
  const days=[...form.querySelectorAll('[name="weekday"]:checked')].map(input=>Number(input.value));
  if(!form.reportValidity()||!days.length||fields.end.value<=fields.start.value||fields.to.value&&fields.to.value<fields.from.value){feedback.textContent='Chọn nhân viên, ngày trong tuần và khoảng thời gian hợp lệ.';return;}
  busy=true;const button=root.querySelector('[data-save]');button.disabled=true;feedback.textContent='Đang lưu…';
  try{
   const {error}=await client.rpc('save_staff_recurring_schedule',{p_id:editing?.id||crypto.randomUUID(),p_revision:editing?.updated_at||null,p_details:{staff_id:fields.staff.value,weekdays:days,start_time:fields.start.value,end_time:fields.end.value,valid_from:fields.from.value,valid_to:fields.to.value||null,is_active:fields.active.checked}});
   if(error)throw error;await load();reset();feedback.textContent='Đã lưu lịch định kỳ và cập nhật ca làm theo ngày.';
  }catch(error){feedback.textContent=error.message==='staff_schedule_changed'?'Lịch đã thay đổi. Mở lại để cập nhật.':'Không thể lưu lịch định kỳ. Kiểm tra thông tin và quyền phân ca.';}finally{busy=false;button.disabled=false;}
 };
 reset();try{await load();}catch{feedback.textContent='Không tải được lịch định kỳ. Vui lòng thử lại.';}
 const refresh=()=>{clearTimeout(refreshTimer);refreshTimer=setTimeout(()=>{if(!disposed&&!root.hidden&&root.getClientRects().length)load().catch(()=>{feedback.textContent='Chưa cập nhật được danh sách lịch định kỳ.';});},250);};
 const channel=client.channel?.('admin-staff-recurring')
  .on('postgres_changes',{event:'*',schema:'public',table:'staff_recurring_schedule'},refresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'staff_schedule'},refresh).subscribe();
 return ()=>{disposed=true;readVersion++;clearTimeout(refreshTimer);if(channel)client.removeChannel(channel);};
}
