import {parseVietnamDateTimeInput,vietnamDateTimeInput} from '/scripts/shared/booking-time.mjs';
import {bookingMoveError} from '/scripts/shared/customer-booking.mjs?v=20261125_move_error';

export function openGuestBookingMoveDialog(booking,phone,{request,onSaved=()=>{}}){
 const previous=document.getElementById('guestBookingMoveDialog');if(previous){previous.close();previous.remove();}
 const hotel=!!booking.isHotel||booking.logistics?.kind==='pet_hotel'||/hotel|khách\s*sạn|lưu\s*trú/i.test([booking.serviceName,booking.serviceCategory,booking.type].filter(Boolean).join(' '));
 const dialog=document.createElement('dialog');dialog.id='guestBookingMoveDialog';dialog.className='rg-booking-move-dialog';dialog.setAttribute('aria-labelledby','guestMoveTitle');
 dialog.innerHTML=`<form class="rg-booking-move-form" onsubmit="return false;">
  <header class="rg-booking-move-heading"><h3 id="guestMoveTitle">Đổi lịch hẹn</h3><button type="button" class="btn-green-outline" data-close-modal="guestBookingMoveDialog">Đóng</button></header>
  <p id="guestMoveContext"></p>
  <div><label for="guestMoveStart">Thời gian bắt đầu mới <span class="required">*</span></label><input type="datetime-local" class="form-control" id="guestMoveStart" required></div>
  ${hotel?'<div><label for="guestMoveEnd">Thời gian trả phòng mới <span class="required">*</span></label><input type="datetime-local" class="form-control" id="guestMoveEnd" required></div>':''}
  <div><label for="guestMoveReason">Lý do đổi lịch <span class="required">*</span></label><textarea class="form-control" id="guestMoveReason" rows="3" maxlength="2000" required></textarea></div>
  <section id="guestMovePreview" role="status" hidden><p id="guestMoveEndPreview"></p><p id="guestMoveTotal"></p><p>Sau khi đổi, cửa hàng sẽ xác nhận lại lịch hẹn.</p></section>
  <p id="guestMoveFeedback" role="alert" hidden></p>
  <footer class="rg-booking-move-actions"><button type="button" class="btn-green-outline" data-close-modal="guestBookingMoveDialog">Giữ lịch</button><button type="button" class="btn-cta" id="guestMoveSave">Xem giá và lịch mới</button></footer>
 </form>`;
 const get=id=>dialog.querySelector('#'+id),start=get('guestMoveStart'),end=get('guestMoveEnd'),reason=get('guestMoveReason'),feedback=get('guestMoveFeedback'),preview=get('guestMovePreview'),save=get('guestMoveSave');
 get('guestMoveContext').textContent=[booking.serviceName||'Lịch hẹn dịch vụ',booking.petName].filter(Boolean).join(' · ');
 const existing=booking.scheduledStartAt?new Date(booking.scheduledStartAt):parseVietnamDateTimeInput(`${booking.date}T${booking.timeStart||booking.time||'09:00'}`);
 start.min=vietnamDateTimeInput(Math.ceil((Date.now()+2*3600000)/60000)*60000);
 if(end){if(booking.scheduledEndAt&&Number.isFinite(Date.parse(booking.scheduledEndAt)))end.value=vietnamDateTimeInput(new Date(booking.scheduledEndAt));end.min=start.value;}
 let quote=null,epoch=0,pending=false,confirming=false,requestId=crypto.randomUUID();
 const dismiss=()=>{if(!confirming)dialog.close();};
 const invalidate=()=>{epoch++;quote=null;preview.hidden=true;feedback.hidden=true;save.textContent='Xem giá và lịch mới';if(!confirming)save.disabled=false;};
 dialog.querySelector('form').addEventListener('submit',event=>event.preventDefault());
 dialog.querySelectorAll('[data-close-modal]').forEach(button=>button.onclick=dismiss);
 dialog.addEventListener('cancel',event=>{if(confirming)event.preventDefault();});
 dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dismiss();});
 dialog.addEventListener('close',()=>{epoch++;dialog.remove();},{once:true});
 for(const field of [start,end,reason].filter(Boolean))field.addEventListener('input',()=>{invalidate();if(end&&start.value)end.min=start.value;});
 const fail=text=>{feedback.textContent=text;feedback.hidden=false;};
 save.onclick=async()=>{
  if(pending||confirming)return;
  if(!start.reportValidity()||!reason.reportValidity()||(end&&!end.reportValidity()))return;
  const parsed=parseVietnamDateTimeInput(start.value),parsedEnd=end?parseVietnamDateTimeInput(end.value):null;
  if(!parsed){fail('Vui lòng chọn thời gian bắt đầu mới hợp lệ.');return;}
  if(+parsed<Date.now()+2*3600000){fail('Giờ mới phải cách hiện tại ít nhất 2 tiếng. Vui lòng chọn giờ khác.');return;}
  if(existing&&start.value===vietnamDateTimeInput(existing)){fail('Giờ mới trùng với giờ hẹn hiện tại. Vui lòng chọn giờ khác.');return;}
  if(end&&(!parsedEnd||+parsedEnd<=+parsed)){fail('Thời gian trả phòng phải sau thời gian bắt đầu.');return;}
  const current=epoch,commit=!!quote,expectedQuote=quote;
  pending=true;confirming=commit;save.disabled=true;feedback.hidden=true;save.textContent=commit?'Đang đổi lịch…':'Đang xem giá…';
  if(commit)dialog.querySelectorAll('button,input,textarea').forEach(node=>node.disabled=true);
  try{
   const result=await request('phone-lookup',{phone,moveRequest:{id:requestId,bookingId:booking._supabaseId,grant:booking.moveGrant,start:parsed.toISOString(),end:parsedEnd?.toISOString()||null,reason:reason.value.trim(),confirm:commit,version:expectedQuote?.version}});
   if(!dialog.isConnected||current!==epoch)return;
   if(commit){
    if(result.bookingId!==booking._supabaseId)throw Error('Chưa nhận được xác nhận đổi lịch. Vui lòng tra cứu lại để kiểm tra.');
    dialog.close();await onSaved();return;
   }
   const value=result.quote;
   if(!value?.version||value.id!==booking._supabaseId||!Number.isFinite(Number(value.total))||!Number.isFinite(Date.parse(value.end_at)))throw Error('Chưa đọc được báo giá mới. Vui lòng thử lại.');
   quote=value;preview.hidden=false;
   get('guestMoveEndPreview').textContent='Kết thúc dự kiến: '+new Date(value.end_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',dateStyle:'short',timeStyle:'short'});
   get('guestMoveTotal').textContent='Tổng tiền mới: '+Number(value.total).toLocaleString('vi-VN')+' đ';
   save.textContent='Xác nhận đổi lịch';
  }catch(error){if(dialog.isConnected&&current===epoch){
   quote=null;preview.hidden=true;
   const serverCode=error.message?.match(/^Không thể đổi lịch: ([a-z0-9_]+)$/)?.[1];
   fail(serverCode?bookingMoveError({message:serverCode}).message:error.message||'Chưa đổi được lịch hẹn. Vui lòng thử lại.');
   save.textContent='Xem giá và lịch mới';
  }}
  finally{
   pending=false;confirming=false;
   if(dialog.isConnected){dialog.querySelectorAll('button,input,textarea').forEach(node=>node.disabled=false);if(current!==epoch)save.textContent=quote?'Xác nhận đổi lịch':'Xem giá và lịch mới';}
  }
 };
 document.body.append(dialog);dialog.showModal();return dialog;
}
