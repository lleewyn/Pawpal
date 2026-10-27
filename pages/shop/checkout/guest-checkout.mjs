import {guestCart,isGuestShopper,normalizeGuestLines} from '/scripts/shared/guest-cart.mjs';
import {guestCommerce} from '/scripts/shared/guest-commerce-client.mjs';
import {readGuestCheckoutPreferences,writeGuestCheckoutPreferences,clearGuestCheckoutPreferences} from '/scripts/shared/guest-checkout-preferences.mjs';
import {showGuestRecoveryCode} from '/scripts/shared/guest-recovery.mjs';
import {editGuestContact} from '/scripts/shared/guest-contact-editor.mjs';
const selectionKey='pawpal_guest_checkout_selection_v1',journalKey='pawpal_guest_order_request_v1';
const money=n=>Number(n).toLocaleString('vi-VN')+' đ';
function node(tag,text,className=''){const n=document.createElement(tag);n.className=className;if(text!=null)n.textContent=text;return n;}
export async function initGuestCheckout(){
 const page=document.querySelector('.checkout-page');if(!page||page.dataset.guestReady)return;page.dataset.guestReady='true';
 document.body.classList.add('checkout-public-page');
 page.classList.remove('checkout-loading');page.setAttribute('aria-busy','false');
 page.innerHTML=`<div class="container-xl py-4 checkout-main-container"><h1>Thanh toán</h1><a href="/cart">Quay lại giỏ hàng</a>
 <p id="guest-checkout-feedback" role="status" aria-live="polite"></p>
 <form id="guest-checkout-form" class="checkout-section mt-3"><fieldset id="guest-checkout-fields" class="border-0 p-0"><div class="row g-3">
 <div class="col-md-6"><label class="form-label" for="guest-name">Họ và tên <span class="text-danger">*</span></label><input class="form-control" id="guest-name" autocomplete="name" required maxlength="150"></div>
 <div class="col-md-6"><label class="form-label" for="guest-phone">Số điện thoại <span class="text-danger">*</span></label><input class="form-control" id="guest-phone" type="tel" autocomplete="tel" required maxlength="40"></div>
 <div class="col-md-6"><label class="form-label" for="guest-delivery">Nhận hàng</label><select class="form-select" id="guest-delivery"><option value="">Nhận tại cửa hàng</option></select></div>
 <div class="col-md-6"><label class="form-label" for="guest-payment">Thanh toán</label><select class="form-select" id="guest-payment" required></select></div>
 <div id="guest-address-fields" class="col-12 d-none"><div class="row g-3">
 <div class="col-md-6"><label class="form-label" for="guest-receiver">Tên người nhận <span class="text-danger">*</span></label><input class="form-control" id="guest-receiver" maxlength="300" autocomplete="shipping name"></div>
 <div class="col-md-6"><label class="form-label" for="guest-receiver-phone">Số điện thoại người nhận <span class="text-danger">*</span></label><input class="form-control" id="guest-receiver-phone" type="tel" maxlength="40" autocomplete="shipping tel"></div>
 <div class="col-md-8"><label class="form-label" for="guest-street">Địa chỉ nhận hàng <span class="text-danger">*</span></label><input class="form-control" id="guest-street" maxlength="1000" autocomplete="shipping street-address"></div>
 <div class="col-md-4"><label class="form-label" for="guest-province">Tỉnh hoặc thành phố <span class="text-danger">*</span></label><input class="form-control" id="guest-province" maxlength="200" autocomplete="shipping address-level1"></div></div></div>
 <div class="col-md-6"><label class="form-label" for="guest-voucher">Mã giảm giá</label><input class="form-control" id="guest-voucher" maxlength="100"></div>
 <div class="col-md-6"><label class="form-label" for="guest-note">Ghi chú</label><textarea class="form-control" id="guest-note" rows="3" maxlength="4000"></textarea></div>
 </div></fieldset><div id="guest-quote-lines" class="py-3"></div><p id="guest-quote-total" class="fw-bold"></p>
 <div class="d-flex gap-3"><button class="btn btn-secondary" type="button" id="guest-quote-button">Kiểm tra đơn hàng</button><button class="btn btn-primary" type="button" id="guest-place-order" disabled>Đặt hàng</button></div></form>
 <section id="guest-order-result" class="checkout-section mt-3 d-none" aria-live="polite"></section></div>`;
 const get=id=>page.querySelector('#'+id),feedback=get('guest-checkout-feedback'),form=get('guest-checkout-form'),fields=get('guest-checkout-fields'),quoteButton=get('guest-quote-button'),submit=get('guest-place-order');
 let lines=[],mode='cart',quote=null,busy=false,journal=null,ready=false;
 quoteButton.disabled=true;
 const active=()=>page.isConnected&&isGuestShopper();
 function say(message){feedback.textContent=message;}
 const addressIds=['guest-receiver','guest-receiver-phone','guest-street','guest-province'];
 const labels={'guest-name':'Vui lòng nhập họ và tên.','guest-phone':'Vui lòng nhập số điện thoại Việt Nam hợp lệ.','guest-payment':'Vui lòng chọn phương thức thanh toán.','guest-receiver':'Vui lòng nhập tên người nhận.','guest-receiver-phone':'Vui lòng nhập số điện thoại người nhận hợp lệ.','guest-street':'Vui lòng nhập địa chỉ nhận hàng.','guest-province':'Vui lòng nhập tỉnh hoặc thành phố.'};
 function fieldError(input,message){input.setAttribute('aria-invalid',String(!!message));get(input.id+'-error').textContent=message;}
 for(const input of fields.querySelectorAll('input,textarea,select')){
  const error=node('p','','text-danger small mb-0');error.id=input.id+'-error';error.setAttribute('aria-live','polite');input.after(error);input.setAttribute('aria-describedby',error.id);input.setAttribute('aria-invalid','false');
 }
 function validate(){
  let first=null;const delivery=!!get('guest-delivery').value;
  for(const input of fields.querySelectorAll('input,textarea,select')){
   const value=input.value.trim(),skip=!delivery&&addressIds.includes(input.id);
   let valid=skip||Boolean(input.checkValidity()&&(!input.required||value)&&(input.maxLength==null||input.maxLength<0||input.value.length<=input.maxLength));
   if(!skip&&['guest-phone','guest-receiver-phone'].includes(input.id))valid=valid&&/^(?:0\d{9}|(?:\+84|0084|84)\d{9})$/.test(value.replace(/[\s().-]/g,''));
   const message=input.maxLength>0&&input.value.length>input.maxLength?'Nội dung không được vượt quá '+input.maxLength+' ký tự.':labels[input.id]||'Vui lòng kiểm tra nội dung đã nhập.';
   fieldError(input,valid?'':message);if(!valid&&!first)first=input;
  }
  first?.focus();return !first;
 }
 function saveJournal(value){sessionStorage.setItem(journalKey,JSON.stringify(value));journal=value;}
 function payload(){
  const delivery=!!get('guest-delivery').value,code=get('guest-voucher').value.trim();
  const details={delivery,discount_mode:code?'voucher':'none',note:get('guest-note').value};if(code)details.voucher_code=code;
  if(delivery)Object.assign(details,{delivery_option_id:get('guest-delivery').value,receiver_name:get('guest-receiver').value.trim(),receiver_phone:get('guest-receiver-phone').value,street_address:get('guest-street').value.trim(),province:get('guest-province').value.trim()});
  return {contact:{name:get('guest-name').value.trim(),phone:get('guest-phone').value},details,lines,paymentMethodId:get('guest-payment').value};
 }
 async function receipt(){const response=await guestCommerce.request('order-receipt',{requestId:journal.id});return {...response.order,recoveryCode:response.recoveryCode};}
 async function showReceipt(order){
  if(!active())return;
  // Mark cleanup intent before changing the cart. An interrupted cleanup is never
  // blindly repeated on reload, which could subtract a later tab's additions twice.
  if(journal.phase!=='confirmed'){saveJournal({...journal,phase:'confirmed',cleanup:'started'});
   try{if(journal.mode==='cart')await guestCart().consume(journal.lines);saveJournal({...journal,cleanup:'done'});}catch{say('Đơn đã được tạo. Vui lòng kiểm tra lại sản phẩm còn trong giỏ hàng.');}
  }
  if(journal.mode==='buynow'){sessionStorage.removeItem('pawpal_buynow_cart');sessionStorage.removeItem('pawpal_is_buynow');}
  sessionStorage.removeItem(selectionKey);form.classList.add('d-none');
  clearGuestCheckoutPreferences(sessionStorage,{mode:journal.mode,lines:journal.lines});
  const result=get('guest-order-result');result.classList.remove('d-none');result.replaceChildren(node('h2','Đã tạo đơn hàng'),node('p','Mã đơn: '+order.code),node('p','Trạng thái: '+({pending:'Chờ xác nhận',confirmed:'Đã xác nhận',completed:'Hoàn tất',cancelled:'Đã hủy',shipping:'Đang giao'}[order.status]||'Đang xử lý')),node('p','Tổng tiền: '+money(order.total)),node('p','Thanh toán: '+({pending:'Chờ thanh toán',partial:'Đã thanh toán một phần',paid:'Đã thanh toán',not_required:'Không cần thanh toán',refunded:'Đã hoàn tiền'}[order.paymentStatus]||'Chờ đối soát')));
  for(const line of order.lines||[])result.append(node('p',line.name+' × '+line.quantity));
  showGuestRecoveryCode(result,order.recoveryCode);
  const lookup=node('a','Tra cứu đơn hàng','btn btn-secondary');lookup.href='/return-guest?'+new URLSearchParams({order:journal.id});result.append(lookup);
  const next=node('button','Tiếp tục mua sắm','btn btn-secondary');next.type='button';next.onclick=()=>{sessionStorage.removeItem(journalKey);window.location.assign('/shop');};result.append(next);
  window.updateCartBadge?.();
 }
 function invalidateQuote(){quote=null;submit.disabled=true;get('guest-quote-total').textContent='';}
 form.addEventListener('submit',event=>event.preventDefault());
 form.addEventListener('input',invalidateQuote);form.addEventListener('change',invalidateQuote);
 for(const event of ['input','change'])form.addEventListener(event,({target})=>{if(get(target.id+'-error'))fieldError(target,'');});
 get('guest-voucher').addEventListener('change',()=>{try{writeGuestCheckoutPreferences(sessionStorage,{mode,lines},get('guest-voucher').value);}catch(error){say(error.message);}});
 get('guest-delivery').onchange=()=>{
  const delivery=!!get('guest-delivery').value;get('guest-address-fields').classList.toggle('d-none',!delivery);
  for(const id of addressIds){get(id).required=delivery;if(!delivery)fieldError(get(id),'');}
 };
 async function withBusy(operation){if(busy||!ready||!active())return;busy=true;fields.disabled=true;quoteButton.disabled=true;submit.disabled=true;try{await operation();}catch(error){if(active())say(error.message||'Chưa xử lý được yêu cầu.');}finally{busy=false;if(active()){fields.disabled=false;quoteButton.disabled=false;submit.disabled=!quote;}}}
 quoteButton.onclick=()=>{if(busy||!ready||!validate())return;return withBusy(async()=>{
  writeGuestCheckoutPreferences(sessionStorage,{mode,lines},get('guest-voucher').value);
  if(journal){try{await showReceipt(await receipt());return;}catch(error){if(error.status!==404)throw error;}}
  const result=await guestCommerce.request('order-quote',{details:payload().details,lines});if(!active())return;
  quote=result.quote;get('guest-quote-lines').replaceChildren(...quote.lines.map(line=>node('p',line.name+' × '+line.quantity+' — '+money(line.unitPrice*line.quantity))));
  get('guest-quote-total').textContent='Tổng thanh toán: '+money(quote.total)+' (phí giao hàng '+money(quote.shipping_fee)+', giảm giá '+money(quote.voucher_discount)+')';say('Vui lòng kiểm tra thông tin trước khi đặt hàng.');
 });};
 submit.onclick=()=>{if(busy||!ready||!validate())return;return withBusy(async()=>{
  if(!quote)return;
  if(journal){try{await showReceipt(await receipt());return;}catch(error){if(error.status!==404)throw error;}}
  const requestId=journal?.id||crypto.randomUUID();saveJournal({id:requestId,phase:'submitted',mode,lines});
  try{
   await guestCommerce.request('order-create',{...payload(),requestId,expectedQuote:quote.version});
   say('');await showReceipt(await receipt());
  }catch(error){invalidateQuote();say(error.uncertain?'Chưa xác định được kết quả. Hãy kiểm tra lại đơn trước khi gửi tiếp.':error.message);}
 });};
 const changed=()=>{if(page.isConnected&&!isGuestShopper())location.reload();};
 document.addEventListener('auth_state_changed',changed);window.addEventListener('storage',event=>{if(event.key==='pawpal_current_user'||event.key===null)changed();});
 try{
  journal=JSON.parse(sessionStorage.getItem(journalKey)||'null');
  if(journal){
   if(typeof journal.id!=='string'||!['submitted','confirmed'].includes(journal.phase)||!['cart','buynow'].includes(journal.mode))throw Error('Chưa đọc được yêu cầu trước. Vui lòng tra cứu đơn hàng để kiểm tra.');
   lines=normalizeGuestLines(journal.lines);mode=journal.mode;
   try{await showReceipt(await receipt());return;}catch(error){if(error.status!==404)throw error;say('Yêu cầu trước chưa có kết quả. Bạn có thể nhập lại thông tin và kiểm tra với cùng mã yêu cầu.');}
  }else if(new URLSearchParams(location.search).get('buynow')==='true'){
   mode='buynow';const items=JSON.parse(sessionStorage.getItem('pawpal_buynow_cart')||'[]');lines=normalizeGuestLines(items.map(item=>({variant_id:item.variantId||item.product_variant_id,quantity:Number(item.quantity)})));
  }else{
   const saved=sessionStorage.getItem(selectionKey);lines=saved?normalizeGuestLines(JSON.parse(saved)):guestCart().read();
   const current=guestCart().read();if(lines.some(line=>!current.some(item=>item.variant_id===line.variant_id&&item.quantity>=line.quantity)))throw Error('Giỏ hàng đã thay đổi. Vui lòng quay lại chọn sản phẩm.');
  }
  if(!lines.length)throw Error('Giỏ hàng đang trống. Vui lòng chọn sản phẩm.');
  const preferences=readGuestCheckoutPreferences(sessionStorage,{mode,lines});if(preferences)get('guest-voucher').value=preferences.voucherCode;
  const db=window.getSupabaseClient?.()||window.SupabaseClient;if(!db)throw Error('Chưa kết nối được thông tin nhận hàng.');
  const {data,error}=await db.rpc('customer_shop_options');if(error)throw error;if(!active())return;
  for(const option of data.delivery_options||[])get('guest-delivery').append(new Option(option.name+' — '+money(option.fee),option.id));
  for(const method of data.payment_methods||[])get('guest-payment').append(new Option(method.name,method.id));
  const preferred=(data.payment_methods||[]).find(method=>String(method.short_name).toLowerCase()==='cod');if(preferred)get('guest-payment').value=preferred.id;
  if(!get('guest-payment').options.length)throw Error('Chưa có phương thức thanh toán khả dụng.');
  const context=await guestCommerce.request('context',{page:1});if(!active())return;
  if(context.contact){get('guest-name').value=context.contact.name||'';get('guest-phone').value=context.contact.phone||'';get('guest-name').readOnly=get('guest-phone').readOnly=true;
   const edit=node('button','Sửa liên hệ','btn btn-secondary'),editor=node('div',null,'checkout-section mt-3');edit.type='button';form.before(edit,editor);
   edit.onclick=async()=>{if(busy)return;busy=true;fields.disabled=true;edit.disabled=quoteButton.disabled=submit.disabled=true;invalidateQuote();try{const fresh=await editGuestContact(editor);if(fresh){get('guest-name').value=fresh.contact.name;get('guest-phone').value=fresh.contact.phone;}}catch(error){say(error.message);}finally{busy=false;fields.disabled=false;edit.disabled=quoteButton.disabled=false;}};
  }
  ready=true;quoteButton.disabled=false;
 }catch(error){say(error.message||'Không thể tải thông tin thanh toán.');quoteButton.disabled=true;submit.disabled=true;}
}
