import {loadCustomerBookingMoveServices,loadCustomerBookingMoveDaySlots,moveCustomerBooking} from '/scripts/shared/customer-booking.mjs';
import {vietnamDateTimeInput} from '/scripts/shared/booking-time.mjs';
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>Number(value).toLocaleString('vi-VN')+' đ';
const time=value=>new Date(value).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'});

export function openBookingMoveSlots(booking,onSaved,{db,user,onSuccess=()=>{}}){
 document.getElementById('quickRescheduleBookingModal')?.remove();
 const modal=document.createElement('dialog');modal.id='quickRescheduleBookingModal';modal.className='booking-move-dialog';
 modal.innerHTML=`<form onsubmit="return false;" class="booking-move-form">
  <div class="booking-move-heading"><h3>Đổi lịch hẹn</h3><button type="button" class="btn-green-outline" data-close-modal="quickRescheduleBookingModal">Đóng</button></div>
  <p class="booking-move-context"><strong>${escape(booking.serviceName||booking.service)}</strong> của <strong>${escape(booking.petName)}</strong></p>
  <div class="booking-move-fields"><div><label for="bookingMoveService" class="form-label">Gói dịch vụ mới <span class="required">*</span></label><select id="bookingMoveService" class="form-control" disabled><option value="">Đang tải gói dịch vụ…</option></select></div>
  <div><label for="bookingMoveDay" class="form-label">Ngày hẹn mới <span class="required">*</span></label><input type="date" id="bookingMoveDay" class="form-control" required></div></div>
  <button type="button" class="btn-green-outline" id="bookingMoveQuote" disabled>Xem giá và khung giờ mới</button>
  <p id="bookingMoveLoading" role="status" hidden>Đang kiểm tra giá và lịch làm việc…</p>
  <section id="bookingMoveSlots" aria-label="Khung giờ có thể đổi" hidden><p class="booking-move-slots-label">Chọn khung giờ mới</p><div id="bookingMoveSlotList" class="booking-move-slot-list"></div><p id="bookingMoveEmpty" hidden>Không có khung giờ phù hợp trong ngày này. Vui lòng chọn ngày hoặc gói dịch vụ khác.</p></section>
  <div id="bookingMovePreview" role="status" hidden><p id="bookingMoveEnd"></p><p id="bookingMoveWorker"></p><div id="bookingMoveTotal"></div><p>Sau khi đổi, lịch sẽ chờ cửa hàng xác nhận lại.</p></div>
  <div><label for="bookingMoveReason" class="form-label">Lý do đổi lịch <span class="required">*</span></label><select id="bookingMoveReason" class="form-control" required><option value="">Chọn lý do đổi lịch</option><option>Bận việc đột xuất</option><option>Bé cưng không khỏe</option><option>Thay đổi gói dịch vụ</option><option>Thay đổi thời gian chăm sóc</option><option>Thời tiết không thuận lợi</option></select></div>
  <p id="bookingMoveError" role="alert" hidden></p>
  <div class="booking-move-actions"><button type="button" class="btn-green-outline" data-close-modal="quickRescheduleBookingModal">Giữ lịch</button><button type="button" class="btn-cta" id="quickConfirmRescheduleBtn" disabled>Xác nhận đổi lịch</button></div>
 </form>`;
 document.body.append(modal);
 const get=id=>modal.querySelector('#'+id),service=get('bookingMoveService'),day=get('bookingMoveDay'),reason=get('bookingMoveReason'),error=get('bookingMoveError'),loading=get('bookingMoveLoading'),slots=get('bookingMoveSlots'),list=get('bookingMoveSlotList'),preview=get('bookingMovePreview'),search=get('bookingMoveQuote'),save=get('quickConfirmRescheduleBtn');
 let quote=null,epoch=0,busy=false,ready=false,quotes=[],previousTotal=Number(booking.price||0),requestId=null,requestBody=null;
 const today=vietnamDateTimeInput(new Date()).slice(0,10);day.min=today;day.max=vietnamDateTimeInput(new Date(Date.now()+90*86400000)).slice(0,10);
 day.value=booking.scheduledStartAt?vietnamDateTimeInput(new Date(booking.scheduledStartAt)).slice(0,10):today;if(day.value<today)day.value=today;
 const invalidate=()=>{epoch++;quote=null;quotes=[];save.disabled=true;preview.hidden=true;slots.hidden=true;loading.hidden=true;error.hidden=true;search.disabled=!ready;};
 service.addEventListener('change',invalidate);day.addEventListener('input',invalidate);reason.addEventListener('change',()=>{error.hidden=true;});
 modal.querySelector('form').addEventListener('submit',event=>event.preventDefault());
 modal.querySelectorAll('[data-close-modal]').forEach(button=>button.onclick=()=>{if(!busy)modal.close();});
 modal.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 modal.addEventListener('click',event=>{const r=modal.getBoundingClientRect();if(!busy&&event.target===modal&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))modal.close();});
 modal.addEventListener('close',()=>{epoch++;modal.remove();},{once:true});
 const fail=err=>{error.textContent=err.message;error.hidden=false;};
 (async()=>{
  try{
   const data=await loadCustomerBookingMoveServices(db,user,booking);if(!modal.isConnected)return;
   service.replaceChildren();for(const item of data.services)service.add(new Option(item.name,item.id));
   if(data.services.some(item=>item.id===data.current_service_id))service.value=data.current_service_id;
   ready=data.services.length>0;service.disabled=!ready;search.disabled=!ready;
   if(!ready)fail(Error('Chưa có gói dịch vụ phù hợp với bé để đổi. Vui lòng liên hệ cửa hàng.'));
  }catch(err){if(modal.isConnected)fail(err);}
 })();
 search.onclick=async()=>{
  if(busy||!ready||!day.reportValidity())return;
  invalidate();const current=epoch;search.disabled=true;loading.hidden=false;
  try{
   const data=await loadCustomerBookingMoveDaySlots(db,user,booking,day.value,service.value);
   if(!modal.isConnected||current!==epoch)return;
   quotes=data.slots;previousTotal=Number(data.previous_total??booking.price??0);list.replaceChildren();slots.hidden=false;get('bookingMoveEmpty').hidden=quotes.length>0;
   for(const [index,item]of quotes.entries()){
    const button=document.createElement('button');button.type='button';button.className='btn-green-outline booking-move-slot';button.dataset.moveSlot=String(index);button.setAttribute('aria-pressed','false');button.textContent=time(item.start_at)+' · '+money(item.total);
    button.onclick=()=>{
     if(busy)return;quote=item;list.querySelectorAll('button').forEach(node=>{const selected=node===button;node.classList.toggle('selected',selected);node.setAttribute('aria-pressed',String(selected));});
     preview.hidden=false;get('bookingMoveEnd').textContent='Giờ mới: '+time(item.start_at)+'–'+time(item.end_at);get('bookingMoveWorker').textContent=item.staff_name?'KTV phụ trách: '+item.staff_name:'';
     const delta=Number(item.total)-previousTotal;const lines=['Giá gói cũ: '+money(previousTotal),'Giá gói mới: '+money(item.total),delta>0?'Cần bù: '+money(delta)+' (thanh toán tại quầy)':delta<0?'Dư: '+money(-delta)+' (cửa hàng đối soát)':'Không chênh lệch'];get('bookingMoveTotal').replaceChildren(...lines.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));save.disabled=false;error.hidden=true;
    };list.append(button);
   }
  }catch(err){if(modal.isConnected&&current===epoch)fail(err);}
  finally{if(modal.isConnected&&current===epoch){loading.hidden=true;search.disabled=false;}}
 };
 save.onclick=async()=>{
  if(busy||!quote||!reason.reportValidity())return;
  const body=JSON.stringify([quote.version,quote.start_at,quote.serviceId,reason.value]);if(body!==requestBody){requestId=crypto.randomUUID();requestBody=body;}
  busy=true;modal.querySelectorAll('button,input,select').forEach(node=>node.disabled=true);error.hidden=true;
  try{await moveCustomerBooking(db,user,booking,quote,reason.value,requestId);modal.close();onSuccess();await onSaved?.();}
  catch(err){if(modal.isConnected){invalidate();fail(err);}}
  finally{busy=false;if(modal.isConnected){modal.querySelectorAll('button,input,select').forEach(node=>node.disabled=false);save.disabled=true;}}
 };
 modal.showModal();return modal;
}
