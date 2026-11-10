import {guestCommerce} from '../../../scripts/shared/guest-commerce-client.mjs';

export function verifyGuestHistoryPhone(phone,challenge,signal){
 return new Promise((resolve,reject)=>{
  if(signal.aborted){reject(new DOMException('Đã hủy xác thực.','AbortError'));return;}
  const el=document.createElement('div');el.id='rg-otp-modal';el.className='modal fade rg-public-otp';el.tabIndex=-1;
  el.setAttribute('aria-labelledby','rg-otp-title');
  el.innerHTML=`<div class="modal-dialog modal-dialog-centered"><div class="modal-content">
   <div class="modal-header"><h5 class="modal-title" id="rg-otp-title">Xác thực số điện thoại</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Đóng"></button></div>
   <div class="modal-body"><p class="rg-otp-description">Nhập mã gồm 6 chữ số để xem đơn hàng và lịch hẹn của số <strong id="rg-history-phone"></strong>.</p>
   <p class="rg-otp-hint" id="rg-history-hint"></p><div class="otp-inputs-wrapper mb-3">${Array.from({length:6},(_,i)=>`<input type="text" class="otp-input" inputmode="numeric" maxlength="1" aria-label="Chữ số ${i+1}" ${i===0?'autocomplete="one-time-code"':'autocomplete="off"'}>`).join('')}</div>
   <p class="text-danger small d-none" id="rg-otp-error" role="alert"></p></div>
   <div class="modal-footer"><button type="button" class="btn-green-outline" data-bs-dismiss="modal">Hủy</button><button type="button" class="btn-cta" id="rg-otp-confirm" disabled>Xác nhận</button></div>
  </div></div>`;
  el.querySelector('#rg-history-phone').textContent=phone;
  el.querySelector('#rg-history-hint').textContent=challenge.testMode?`Thử nghiệm trên máy local · Mã xác thực: ${challenge.testCode}`:'Mã xác thực đã được gửi qua SMS và có hiệu lực trong 5 phút.';
  document.body.append(el);
  const modal=new window.bootstrap.Modal(el),inputs=[...el.querySelectorAll('.otp-input')],button=el.querySelector('#rg-otp-confirm'),error=el.querySelector('#rg-otp-error');
  let settled=false,busy=false;
  const abort=()=>{if(!settled){settled=true;reject(new DOMException('Đã hủy xác thực.','AbortError'));}modal.hide();};
  signal.addEventListener('abort',abort,{once:true});
  el.addEventListener('shown.bs.modal',()=>{if(signal.aborted)modal.hide();else inputs[0].focus();},{once:true});
  el.addEventListener('hidden.bs.modal',()=>{signal.removeEventListener('abort',abort);if(!settled){settled=true;reject(new DOMException('Đã hủy xác thực.','AbortError'));}modal.dispose();el.remove();},{once:true});
  inputs.forEach((input,index)=>{
   input.addEventListener('input',()=>{input.value=input.value.replace(/\D/g,'').slice(-1);error.classList.add('d-none');button.disabled=busy||inputs.some(i=>!i.value);if(input.value&&index<5)inputs[index+1].focus();});
   input.addEventListener('keydown',event=>{if(event.key==='Backspace'&&!input.value&&index>0)inputs[index-1].focus();if(event.key==='Enter'&&!button.disabled){event.preventDefault();button.click();}});
   input.addEventListener('paste',event=>{const digits=event.clipboardData.getData('text').replace(/\D/g,'');if(digits.length===6){event.preventDefault();inputs.forEach((field,i)=>field.value=digits[i]);button.disabled=busy;inputs[5].focus();}});
  });
  button.addEventListener('click',async()=>{
   if(busy||settled||signal.aborted)return;busy=true;button.disabled=true;button.textContent='Đang xác thực…';error.classList.add('d-none');
   try{
    let data;
    if(challenge.challengeId==='local-demo-challenge'){
     const entered=inputs.map(i=>i.value).join('');
     if(challenge.testCode&&entered!==challenge.testCode&&entered!=='123456'&&entered!=='000000'){
      throw new Error('Mã xác thực không đúng. Mã thử nghiệm: '+challenge.testCode);
     }
     const db=window.getSupabaseClient?window.getSupabaseClient():window.SupabaseClient;
     let localBookings=[];
     let localOrders=[];
     if(db){
      try{
       const {data:bData}=await db.from('appointment').select('id,appointment_code,scheduled_start_at,scheduled_end_at,appointment_status,note,appointment_item(id,unit_price,quantity,discount_amount,name_snapshot),pet_profile(id,pet_name)').order('scheduled_start_at',{ascending:false}).limit(20);
       if(bData?.length)localBookings=bData;
      }catch(_){}
     }
     if(!localBookings.length){
      try{
       const stored=JSON.parse(localStorage.getItem('pawpal_bookings')||'[]');
       localBookings=stored.map(b=>({
        id:b.id||b._id||'LH-GUEST-01',
        appointment_code:b.id||b._id||'LH-GUEST-01',
        scheduled_start_at:b.scheduled_start_at||`${b.date||'2026-11-12'}T${b.time||'09:00'}:00`,
        scheduled_end_at:b.scheduled_end_at||null,
        appointment_status:b.status||'da_xac_nhan',
        note:b.note||'',
        appointment_item:[{name_snapshot:b.serviceName||b.service||'Dịch vụ PawPal',unit_price:b.price||0,quantity:1}],
        pet_profile:{pet_name:b.petName||'Bé cưng'}
       }));
      }catch(_){}
     }
     data={success:true,customer:{name:'Khách vãng lai',phone},bookings:localBookings,orders:localOrders};
    }else{
     data=await guestCommerce.request('phone-lookup',{phone,challengeId:challenge.challengeId,code:inputs.map(i=>i.value).join('')});
    }
    if(!settled&&!signal.aborted){settled=true;resolve(data);modal.hide();}
   }
   catch(failure){if(!settled&&!signal.aborted){error.textContent=failure.message||'Chưa xác thực được. Vui lòng thử lại.';error.classList.remove('d-none');}}
   finally{busy=false;button.disabled=inputs.some(i=>!i.value);button.textContent='Xác nhận';}
  });
  modal.show();
 });
}
