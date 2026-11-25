const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderStaffSlots({staffRoot,slotsRoot,slots,onClear,onSelect,onInvalidTime=()=>{},isCurrent=()=>true}){
 slots=(slots||[]).map(slot=>{const staff=(slot.staff||[]).filter(person=>person.requires_confirmation!==true&&(!person.source||person.source==='scheduled'));return {...slot,staff,available:!!slot.available&&staff.length>0};});
 let worker=null,selectedSlot=null,busy=false,automatic=true,reserved=false;
 const people=()=>[...new Map(slots.filter(s=>s.available).flatMap(s=>s.staff||[]).map(s=>[s.id,s])).values()].sort((a,b)=>a.name.localeCompare(b.name,'vi'));
 const offered=()=>selectedSlot?(selectedSlot.staff||[]):people();
 async function update(){
  if(selectedSlot&&new Date(selectedSlot.start_at).getTime()<=Date.now()+7200000){
   worker=null;selectedSlot=null;onClear({staff:null,slot:null});
   await onInvalidTime();return;
  }
  if(automatic){
   const available=selectedSlot?.staff||[];
   const candidates=available;
   worker=candidates.length?candidates[Math.floor(Math.random()*candidates.length)]:null;
  }
  if(worker&&selectedSlot)worker=selectedSlot.staff?.find(s=>s.id===worker.id)||worker;
  onClear({staff:worker,slot:selectedSlot});draw();
  reserved=false;
  if(!worker||!selectedSlot)return;
  busy=true;draw();
  try{reserved=(await onSelect({staff:worker,slot:selectedSlot}))!==false;}finally{busy=false;draw();}
 }
 function chooseWorker(id){
  if(busy)return;
  const chosen=offered().find(s=>s.id===id);if(!chosen)return;
  if(worker?.id===id&&selectedSlot&&reserved&&new Date(selectedSlot.start_at).getTime()>Date.now()+7200000){automatic=false;draw();return;}
  automatic=false;
  worker=chosen;
  if(selectedSlot&&!selectedSlot.staff?.some(s=>s.id===id))selectedSlot=null;
  return update();
 }
 function draw(){
  if(!isCurrent())return;
  const workers=offered();
  staffRoot.innerHTML=`<p class="booking-staff-label">Chọn nhân viên chăm sóc</p><div class="booking-staff-options"><button type="button" data-random-staff ${busy||!workers.length?'disabled':''}>Chọn ngẫu nhiên</button>${workers.map(s=>`<button type="button" data-staff="${esc(s.id)}" class="${worker?.id===s.id?'selected':''}" aria-pressed="${worker?.id===s.id}" ${busy?'disabled':''}>${esc(s.name)}</button>`).join('')}</div><p id="bookingStaffChoice" class="field-note" aria-live="polite">${!workers.length?'Không có nhân viên phù hợp với ngày giờ đã chọn. Vui lòng chọn ngày khác.':worker?'Nhân viên chăm sóc: '+esc(worker.name)+'. Chọn giờ bên dưới để giữ chỗ 15 phút.':'Chọn nhân viên đang có ca phù hợp, hoặc chọn giờ trước để xem nhân viên còn trống.'}</p>`;
  const matching=slots.map((slot,index)=>({slot,index})).filter(({slot})=>slot.available&&(automatic||!worker||slot.staff?.some(s=>s.id===worker.id)));
  slotsRoot.innerHTML='<p class="booking-staff-label">Chọn khung giờ</p><div class="booking-day-slots">'+matching.map(({slot,index})=>`<button type="button" data-slot="${index}" ${busy||!slot.available?'disabled':''} class="${selectedSlot===slot?'selected':''}" aria-pressed="${selectedSlot===slot}">${new Date(slot.start_at).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'})}</button>`).join('')+'</div>'+(matching.length?'':'<p class="field-note">Nhân viên này không nhận lịch trong ngày giờ đang xem.</p>');
  staffRoot.querySelectorAll('[data-staff]').forEach(button=>button.onclick=()=>chooseWorker(button.dataset.staff));
  const random=staffRoot.querySelector('[data-random-staff]');
  random.classList.toggle('selected',automatic&&workers.length>0);random.setAttribute('aria-pressed',String(automatic&&workers.length>0));
  if(automatic)staffRoot.querySelector('#bookingStaffChoice').textContent=worker?`Hệ thống phân bổ: ${worker.name}. Đã chọn nhân viên đủ điều kiện cho khung giờ này.`:workers.length?'Chọn khung giờ để giữ chỗ trong 15 phút. Hệ thống sẽ phân bổ nhân viên; bạn cũng có thể chọn đích danh trước khi chọn giờ.':'Không có nhân viên phù hợp với ngày giờ đã chọn. Vui lòng chọn ngày khác.';
  random.onclick=()=>{if(!busy&&workers.length){automatic=true;worker=null;return update();}};
  slotsRoot.querySelectorAll('[data-slot]').forEach(button=>button.onclick=()=>{
   if(busy)return;
   const slot=slots[Number(button.dataset.slot)];if(!slot?.available)return;
   if(selectedSlot===slot&&worker&&reserved&&new Date(slot.start_at).getTime()>Date.now()+7200000)return;
   selectedSlot=slot;
   if(worker&&!slot.staff?.some(s=>s.id===worker.id))worker=null;
   return update();
  });
 }
 draw();
}
