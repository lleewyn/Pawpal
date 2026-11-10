import {guestCommerce} from './guest-commerce-client.mjs';
export async function editGuestContact(root){
 const snapshot=await guestCommerce.request('profile-read',{});if(!root.isConnected)return null;
 return new Promise(resolve=>{
  const prevOverflow=document.body.style.overflow;
  document.body.style.overflow='hidden';
  root.innerHTML=`<div class="booking-owner-modal" id="guestContactModalOverlay">
   <div class="booking-owner-dialog" role="dialog" aria-modal="true" aria-labelledby="guestContactTitle" tabindex="-1">
    <header>
     <h3 id="guestContactTitle">Sửa thông tin liên hệ</h3>
     <button type="button" class="booking-owner-close" id="guestContactModalClose" aria-label="Đóng">Đóng</button>
    </header>
    <div class="booking-owner-content">
     <form class="booking-form" onsubmit="return false;">
      <div class="form-group">
       <label class="form-label" for="guestEditName">Họ và tên <span class="required">*</span></label>
       <input class="form-control" id="guestEditName" required maxlength="150" autocomplete="name" aria-describedby="guestEditNameError">
       <p id="guestEditNameError" class="field-error" aria-live="polite"></p>
      </div>
      <div class="form-group">
       <label class="form-label" for="guestEditPhone">Số điện thoại <span class="required">*</span></label>
       <input class="form-control" id="guestEditPhone" type="tel" required maxlength="40" autocomplete="tel" aria-describedby="guestEditPhoneError">
       <p id="guestEditPhoneError" class="field-error" aria-live="polite"></p>
      </div>
      <p class="field-note">Số điện thoại do bạn cung cấp chưa được xác minh. Thay đổi chỉ áp dụng cho hồ sơ, không sửa thông tin trên đơn đã đặt.</p>
      <p id="guestEditError" class="field-error" role="alert"></p>
      <div class="booking-inline-actions">
       <button type="button" id="guestEditCancel" class="btn-green-outline">Hủy</button>
       <button type="button" id="guestEditSave" class="btn-cta">Lưu thay đổi</button>
      </div>
     </form>
    </div>
   </div>
  </div>`;
  const get=id=>root.querySelector('#'+id),name=get('guestEditName'),phone=get('guestEditPhone'),save=get('guestEditSave'),cancel=get('guestEditCancel'),overlay=get('guestContactModalOverlay');
  name.value=snapshot.contact.name||'';phone.value=snapshot.contact.phone||'';let busy=false,submitted=null,updated=false;const requestId=crypto.randomUUID();
  root.querySelector('form').onsubmit=event=>event.preventDefault();
  for(const input of [name,phone]){input.setAttribute('aria-invalid','false');input.oninput=()=>{get(input.id+'Error').textContent='';input.setAttribute('aria-invalid','false');};}
  const close=result=>{
   if(busy)return;
   document.removeEventListener('keydown',onKey);
   document.body.style.overflow=prevOverflow;
   root.replaceChildren();
   resolve(result);
  };
  const onKey=e=>{if(e.key==='Escape')close(null);};
  document.addEventListener('keydown',onKey);
  cancel.onclick=()=>close(null);
  get('guestContactModalClose').onclick=()=>close(null);
  overlay.onclick=e=>{if(e.target===overlay)close(null);};
  save.onclick=async()=>{
   if(busy)return;let first;
   for(const [input,valid,message] of [[name,name.value.trim().length>0&&name.value.length<=150,'Vui lòng nhập họ và tên, tối đa 150 ký tự.'],[phone,/^(?:0\d{9}|(?:\+84|0084|84)\d{9})$/.test(phone.value.trim().replace(/[\s().-]/g,'')),'Vui lòng nhập số điện thoại Việt Nam hợp lệ.']]){get(input.id+'Error').textContent=valid?'':message;input.setAttribute('aria-invalid',String(!valid));if(!valid&&!first)first=input;}
   if(first){first.focus();return;}
   const payload={requestId,revision:snapshot.contact.revision,contact:{name:name.value.trim(),phone:phone.value}};
   if(submitted&&submitted!==JSON.stringify(payload)){get('guestEditError').textContent='Thông tin của yêu cầu trước chưa được xác nhận. Hãy gửi lại nguyên nội dung hoặc tải lại hồ sơ trước khi sửa tiếp.';return;}
   submitted=JSON.stringify(payload);busy=true;save.disabled=cancel.disabled=name.disabled=phone.disabled=true;
   try{
    if(!updated){await guestCommerce.request('profile-update',payload);updated=true;}
    if(!root.isConnected)return;
    const fresh=await guestCommerce.request('context',{page:1});
    busy=false;
    close(fresh);
   }
   catch(error){
    busy=false;
    if(root.isConnected){get('guestEditError').textContent=error.message;if(get('guestEditSave'))save.disabled=cancel.disabled=name.disabled=phone.disabled=false;}
   }
  };
  name.focus();
 });
}
