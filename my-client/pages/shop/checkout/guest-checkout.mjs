import {guestCart,isGuestShopper,normalizeGuestLines} from '/scripts/shared/guest-cart.mjs';
import {guestCommerce} from '/scripts/shared/guest-commerce-client.mjs';
import {readGuestCheckoutPreferences,writeGuestCheckoutPreferences,clearGuestCheckoutPreferences} from '/scripts/shared/guest-checkout-preferences.mjs';
import {renderTransactionReceipt} from '/scripts/shared/transaction-receipt.mjs';
import {editGuestContact} from '/scripts/shared/guest-contact-editor.mjs';
const selectionKey='pawpal_guest_checkout_selection_v1',journalKey='pawpal_guest_order_request_v1';
const money=n=>Number(n).toLocaleString('vi-VN')+' đ';
// Administrative names: https://datafiles.chinhphu.vn/cpp/files/vbpq/2025/6/202qh.signed.pdf
const provinces=['An Giang','Bắc Ninh','Cà Mau','Cao Bằng','Cần Thơ','Đà Nẵng','Đắk Lắk','Điện Biên','Đồng Nai','Đồng Tháp','Gia Lai','Hà Nội','Hà Tĩnh','Hải Phòng','Hồ Chí Minh','Huế','Hưng Yên','Khánh Hòa','Lai Châu','Lâm Đồng','Lạng Sơn','Lào Cai','Nghệ An','Ninh Bình','Phú Thọ','Quảng Ngãi','Quảng Ninh','Quảng Trị','Sơn La','Tây Ninh','Thái Nguyên','Thanh Hóa','Tuyên Quang','Vĩnh Long'];
function node(tag,text,className=''){const n=document.createElement(tag);n.className=className;if(text!=null)n.textContent=text;return n;}
export async function initGuestCheckout(){
 const page=document.querySelector('.checkout-page');if(!page||page.dataset.guestReady)return;page.dataset.guestReady='true';
 page.classList.remove('checkout-loading');page.setAttribute('aria-busy','false');
 const steps=page.querySelector('.checkout-steps');
 page.innerHTML=`<div class="container-xl py-4 py-md-5 checkout-main-container">
 <div id="guest-checkout-steps"></div><a href="/cart" class="btn-address-link">Quay lại giỏ hàng</a>
 <p id="guest-checkout-feedback" role="status" aria-live="polite"></p>
 <form id="guest-checkout-form"><fieldset id="guest-checkout-fields" class="border-0 p-0"><div class="row g-4">
 <div class="col-lg-7"><section class="checkout-section mb-4"><h2 class="section-title">Thông tin liên hệ</h2><div class="row g-3">
 <div class="col-md-6"><label class="form-label" for="guest-name">Họ và tên <span class="text-danger">*</span></label><input class="form-control" id="guest-name" autocomplete="name" required maxlength="150"></div>
 <div class="col-md-6"><label class="form-label" for="guest-phone">Số điện thoại <span class="text-danger">*</span></label><input class="form-control" id="guest-phone" type="tel" autocomplete="tel" required maxlength="40"></div>
 </div></section>
 <section class="checkout-section mb-4"><h2 class="section-title" id="guest-delivery-heading">Phương thức vận chuyển</h2>
 <div class="delivery-options" id="guest-delivery-choices" role="radiogroup" aria-labelledby="guest-delivery-heading" aria-required="true" aria-describedby="guest-delivery-error"></div>
 <select id="guest-delivery" hidden required><option value=""></option><option value="pickup">Nhận tại cửa hàng</option></select>
 <div id="guest-address-fields" class="mt-3 d-none"><div class="row g-3">
 <div class="col-md-6"><label class="form-label" for="guest-receiver">Tên người nhận <span class="text-danger">*</span></label><input class="form-control" id="guest-receiver" maxlength="300" autocomplete="shipping name"></div>
 <div class="col-md-6"><label class="form-label" for="guest-receiver-phone">Số điện thoại người nhận <span class="text-danger">*</span></label><input class="form-control" id="guest-receiver-phone" type="tel" maxlength="40" autocomplete="shipping tel"></div>
 <div class="col-md-8"><label class="form-label" for="guest-street">Địa chỉ nhận hàng <span class="text-danger">*</span></label><input class="form-control" id="guest-street" maxlength="1000" autocomplete="shipping street-address"></div>
 <div class="col-md-4"><label class="form-label" for="guest-province">Tỉnh hoặc thành phố <span class="text-danger">*</span></label><select class="form-select" id="guest-province" autocomplete="shipping address-level1"><option value="">Chọn tỉnh hoặc thành phố</option>${provinces.map(name=>`<option value="${name}">${name}</option>`).join('')}</select></div></div></div></section>
 <section class="checkout-section"><h2 class="section-title" id="guest-payment-heading">Phương thức thanh toán</h2>
 <div id="guest-payment-choices" class="delivery-options" role="radiogroup" aria-labelledby="guest-payment-heading" aria-required="true" aria-describedby="guest-payment-error"></div>
 <select id="guest-payment" hidden required><option value=""></option></select>
 <label class="form-label mt-3" for="guest-note">Ghi chú</label><textarea class="form-control" id="guest-note" rows="3" maxlength="4000"></textarea></section></div>
 <div class="col-lg-5"><div class="order-summary-sticky"><section class="checkout-section"><h2 class="section-title">Tóm tắt đơn hàng</h2>
 <div id="guest-quote-lines" class="order-items mb-3"><p class="small text-muted mb-0">Kiểm tra đơn hàng để xem chi tiết sản phẩm và tổng tiền.</p></div>
 <div class="voucher-section mb-3"><label class="form-label fw-semibold" for="guest-voucher">Mã giảm giá</label><input class="form-control rounded-3" id="guest-voucher" maxlength="100" placeholder="Nhập mã giảm giá" autocomplete="off"></div>
 <div class="order-totals" aria-live="polite">
 <div id="guest-quote-breakdown" class="d-none"></div><div class="total-row grand-total"><span>Tổng thanh toán</span><span id="guest-quote-total">—</span></div>
 </div>
 <button class="btn btn-secondary w-100 mt-3" type="button" id="guest-quote-button">Kiểm tra đơn hàng</button>
 <button class="btn btn-primary btn-lg w-100 mt-2" type="button" id="guest-place-order" disabled>Đặt hàng</button>
 </section></div></div></div></fieldset></form>
 <section id="guest-order-result" class="checkout-section mt-3 d-none" aria-live="polite"></section></div>`;
 if(steps)page.querySelector('#guest-checkout-steps').append(steps);
 const get=id=>page.querySelector('#'+id),feedback=get('guest-checkout-feedback'),form=get('guest-checkout-form'),fields=get('guest-checkout-fields'),quoteButton=get('guest-quote-button'),submit=get('guest-place-order');
 let lines=[],paymentMethods=[],mode='cart',quote=null,busy=false,journal=null,ready=false;
 quoteButton.disabled=true;fields.disabled=true;form.setAttribute('aria-busy','true');
 submit.textContent='Đang tải thanh toán…';feedback.textContent='Đang tải thông tin thanh toán, vui lòng chờ.';
 const active=()=>page.isConnected&&isGuestShopper();
 function say(message){feedback.textContent=message;}
 const addressIds=['guest-receiver','guest-receiver-phone','guest-street','guest-province'];
 const labels={'guest-name':'Vui lòng nhập họ và tên.','guest-phone':'Vui lòng nhập số điện thoại Việt Nam hợp lệ.','guest-payment':'Vui lòng chọn phương thức thanh toán.','guest-receiver':'Vui lòng nhập tên người nhận.','guest-receiver-phone':'Vui lòng nhập số điện thoại người nhận hợp lệ.','guest-street':'Vui lòng nhập địa chỉ nhận hàng.','guest-province':'Vui lòng chọn tỉnh hoặc thành phố.'};
 function fieldError(input,message){
  input.setAttribute('aria-invalid',String(!!message));
  get(input.id+'-choices')?.setAttribute('aria-invalid',String(!!message));
  get(input.id+'-error').textContent=message;
 }
 function syncChoiceCards(select){
  for(const radio of get(select.id+'-choices').querySelectorAll('input')){
   radio.checked=radio.value===select.value;
   radio.closest('label').classList.toggle('selected',radio.checked);
  }
 }
 function renderChoiceCards(id,options,payment=false){
  const group=get(id+'-choices'),select=get(id);
  group.replaceChildren(...options.map(option=>{
   const card=node('label',null,payment?'payment-method-card':'delivery-option');
   const radio=node('input');radio.type='radio';radio.name=id+'-choice';radio.value=option.id;
   const info=node('div',null,payment?'payment-info':'delivery-info');
   info.append(node('h4',option.name));
   if(option.description)info.append(node('p',option.description));
   card.append(radio,info);
   if(!payment)card.append(node('span',option.fee?money(option.fee):'Miễn phí','delivery-fee'));
   radio.onchange=event=>{
    event.stopPropagation();
    select.value=radio.value;syncChoiceCards(select);select.dispatchEvent(new Event('change',{bubbles:true}));
   };
   return card;
  }));
  syncChoiceCards(select);
 }
 const editableFields=[...fields.querySelectorAll('input,textarea,select')];
 for(const input of editableFields){
  const error=node('p','','text-danger small mb-0');error.id=input.id+'-error';error.setAttribute('aria-live','polite');input.after(error);input.setAttribute('aria-describedby',error.id);input.setAttribute('aria-invalid','false');
 }
 const isDelivery=()=>!['','pickup'].includes(get('guest-delivery').value);
 labels['guest-delivery']='Vui lòng chọn hình thức nhận hàng.';
 function validate(){
  let first=null;const delivery=isDelivery();
  for(const input of editableFields){
   const value=input.value.trim(),skip=!delivery&&addressIds.includes(input.id);
   let valid=skip||Boolean(input.checkValidity()&&(!input.required||value)&&(input.maxLength==null||input.maxLength<0||input.value.length<=input.maxLength));
   if(!skip&&['guest-phone','guest-receiver-phone'].includes(input.id))valid=valid&&/^(?:0\d{9}|(?:\+84|0084|84)\d{9})$/.test(value.replace(/[\s().-]/g,''));
   const message=input.maxLength>0&&input.value.length>input.maxLength?'Nội dung không được vượt quá '+input.maxLength+' ký tự.':labels[input.id]||'Vui lòng kiểm tra nội dung đã nhập.';
   fieldError(input,valid?'':message);if(!valid&&!first)first=input;
  }
  (first?.hidden?get(first.id+'-choices')?.querySelector('input'):first)?.focus();return !first;
 }
 function saveJournal(value){sessionStorage.setItem(journalKey,JSON.stringify(value));journal=value;}
 function payload(){
  const delivery=isDelivery(),code=get('guest-voucher').value.trim();
  const details={delivery,discount_mode:code?'voucher':'none',note:get('guest-note').value};if(code)details.voucher_code=code;
  if(delivery)Object.assign(details,{delivery_option_id:get('guest-delivery').value,receiver_name:get('guest-receiver').value.trim(),receiver_phone:get('guest-receiver-phone').value,street_address:get('guest-street').value.trim(),province:get('guest-province').value.trim()});
  return {contact:{name:get('guest-name').value.trim(),phone:get('guest-phone').value},details,lines,paymentMethodId:get('guest-payment').value};
 }
 async function receipt(){const response=await guestCommerce.request('order-receipt',{requestId:journal.id});return {...response.order,recoveryCode:response.recoveryCode};}
 async function showReceipt(order){
  if(!active())return;
  // Reload can restore this receipt, while a new checkout has its own history entry.
  history.replaceState({...history.state,guestOrderReceiptId:journal.id},'');
  say('');
  // Mark cleanup intent before changing the cart. An interrupted cleanup is never
  // blindly repeated on reload, which could subtract a later tab's additions twice.
  if(journal.phase!=='confirmed'){saveJournal({...journal,phase:'confirmed',cleanup:'started'});
   try{if(journal.mode==='cart')await guestCart().consume(journal.lines);saveJournal({...journal,cleanup:'done'});}catch{say('Đơn đã được tạo. Vui lòng kiểm tra lại sản phẩm còn trong giỏ hàng.');}
  }
  if(journal.mode==='buynow'){sessionStorage.removeItem('pawpal_buynow_cart');sessionStorage.removeItem('pawpal_is_buynow');}
  sessionStorage.removeItem(selectionKey);form.classList.add('d-none');
  clearGuestCheckoutPreferences(sessionStorage,{mode:journal.mode,lines:journal.lines});
  const result=get('guest-order-result');result.classList.remove('d-none');document.body.classList.add('checkout-public-page','checkout-receipt-page');
  renderTransactionReceipt(result,{
   title:order.status==='cancelled'?'Đơn hàng đã được hủy':'PawPal đã nhận đơn hàng của bạn!',
   status:({pending:'Chờ xác nhận',confirmed:'Đã xác nhận',completed:'Hoàn tất',cancelled:'Đã hủy',shipping:'Đang giao'}[order.status]||'Đang xử lý'),
   code:order.code,codeLabel:'Mã đơn hàng',
   details:[['Tổng tiền',money(order.total)],['Thanh toán',({pending:'Chờ thanh toán',partial:'Đã thanh toán một phần',paid:'Đã thanh toán',not_required:'Không cần thanh toán',refunded:'Đã hoàn tiền'}[order.paymentStatus]||'Chờ đối soát')]],
   lines:order.lines||[],notice:order.status==='cancelled'?'Bạn có thể tiếp tục chọn những món bé yêu thích tại cửa hàng.':'Thông tin đơn hàng đã được lưu. Bạn có thể theo dõi trạng thái xử lý và thanh toán trong phần tra cứu.',
   lookupHref:'/return-guest?'+new URLSearchParams({order:journal.id}),lookupLabel:'Tra cứu đơn hàng',
   againLabel:'Tiếp tục mua sắm',onAgain:()=>{sessionStorage.removeItem(journalKey);window.location.assign('/shop');},
   activationTarget:'/user#orders',recoveryCode:order.recoveryCode
  });
  result.querySelector('h1').focus();
  window.updateCartBadge?.();
 }
 function invalidateQuote(){
  quote=null;submit.disabled=true;get('guest-quote-total').textContent='—';
  get('guest-quote-breakdown').classList.add('d-none');
  get('guest-quote-lines').replaceChildren(node('p','Kiểm tra đơn hàng để xem chi tiết sản phẩm và tổng tiền.','small text-muted mb-0'));
 }
 form.addEventListener('submit',event=>event.preventDefault());
 form.addEventListener('input',invalidateQuote);form.addEventListener('change',invalidateQuote);
 for(const event of ['input','change'])form.addEventListener(event,({target})=>{if(get(target.id+'-error'))fieldError(target,'');});
 get('guest-voucher').addEventListener('change',()=>{try{writeGuestCheckoutPreferences(sessionStorage,{mode,lines},get('guest-voucher').value);}catch(error){say(error.message);}});
 get('guest-delivery').onchange=()=>{
  const delivery=isDelivery();get('guest-address-fields').classList.toggle('d-none',!delivery);
  syncChoiceCards(get('guest-delivery'));
  for(const id of addressIds){get(id).required=delivery;if(!delivery)fieldError(get(id),'');}
  const method=get('guest-payment'),selection=get('guest-delivery').value;
  const choices=selection?paymentMethods.filter(option=>String(option.short_name).toLowerCase()===(delivery?'cod':'cash')):[];
  method.replaceChildren(new Option(selection?'Chọn phương thức thanh toán':'Chọn cách nhận hàng trước',''),...choices.map(option=>new Option(option.name,option.id)));
  if(choices.length===1)method.value=choices[0].id;
  renderChoiceCards('guest-payment',choices,true);
  if(!selection)get('guest-payment-choices').append(node('p','Chọn cách nhận hàng để xem phương thức thanh toán.','small text-muted mb-0'));
  fieldError(method,selection&&!choices.length?'Hình thức nhận hàng này chưa có phương thức thanh toán.':'');
 };
 async function withBusy(operation){if(busy||!ready||!active())return;busy=true;fields.disabled=true;quoteButton.disabled=true;submit.disabled=true;submit.textContent='Đang xử lý…';form.setAttribute('aria-busy','true');try{await operation();}catch(error){if(active())say(error.message||'Chưa xử lý được yêu cầu.');}finally{busy=false;form.setAttribute('aria-busy','false');if(active()){fields.disabled=false;quoteButton.disabled=false;submit.disabled=!quote;submit.textContent='Đặt hàng';}}}
 async function refreshQuote(){
  writeGuestCheckoutPreferences(sessionStorage,{mode,lines},get('guest-voucher').value);
  const result=await guestCommerce.request('order-quote',{details:payload().details,lines});if(!active())return;
  quote=result.quote;
  const lineTotal=line=>line.unitPrice*line.quantity-Number(line.discount||0);
  const row=(label,value)=>{const div=node('div',null,'total-row');div.append(node('span',label),node('span',value));return div;};
  const reviewed=quote;
  const thumbnails=new Map();
  get('guest-quote-lines').replaceChildren(...quote.lines.map(line=>{
   const item=node('div',null,'order-item'),info=node('div',null,'order-item-info');
   const image=node('img',null,'order-item-img');
   image.src='/assets/images/shop/products/placeholder.webp';image.alt='';
   if(line.variantId)thumbnails.set(line.variantId,image);
   info.append(node('h4',line.name),node('p','Số lượng '+line.quantity,'order-item-qty'));
   item.append(image,info,node('span',money(lineTotal(line)),'order-item-price'));return item;
  }));
  if(thumbnails.size&&window.DataLoader?.loadCartProducts){
   void window.DataLoader.loadCartProducts([...thumbnails.keys()],{fallback:false}).then(products=>{
    if(quote!==reviewed||!active())return;
    for(const product of products||[])for(const variant of product.variants||[]){
     const image=thumbnails.get(variant.id),source=variant.images?.[0]||product.image;
     if(image&&source)image.src=source;
    }
   }).catch(()=>{});
  }
  const breakdown=get('guest-quote-breakdown');
  breakdown.replaceChildren(row('Tổng tiền hàng',money(quote.lines.reduce((sum,line)=>sum+lineTotal(line),0))),row('Phí vận chuyển',money(quote.shipping_fee)));
  if(Number(quote.voucher_discount)>0)breakdown.append(row('Giảm giá','−'+money(quote.voucher_discount)));
  breakdown.classList.remove('d-none');get('guest-quote-total').textContent=money(quote.total);
 }
 quoteButton.onclick=()=>{if(busy||!ready||!validate())return;return withBusy(async()=>{
  writeGuestCheckoutPreferences(sessionStorage,{mode,lines},get('guest-voucher').value);
  if(journal){try{await showReceipt(await receipt());return;}catch(error){if(error.status!==404)throw error;}}
  await refreshQuote();say('Vui lòng kiểm tra thông tin trước khi đặt hàng.');
 });};
 submit.onclick=()=>{if(busy||!ready||!validate())return;return withBusy(async()=>{
  if(journal){try{await showReceipt(await receipt());return;}catch(error){if(error.status!==404)throw error;}}
  if(!active()||!quote)return;
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
  if(journal?.phase==='confirmed'&&history.state?.guestOrderReceiptId!==journal.id){
   sessionStorage.removeItem(journalKey);
   journal=null;
  }
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
  const [{data,error},context]=await Promise.all([db.rpc('customer_shop_options'),guestCommerce.request('context',{page:1})]);if(error)throw error;if(!active())return;
  const deliveries=[...(data.delivery_options||[]),{id:'pickup',name:'Nhận tại cửa hàng',fee:0}];
  for(const option of deliveries.filter(option=>option.id!=='pickup'))get('guest-delivery').append(new Option(option.name,option.id));
  renderChoiceCards('guest-delivery',deliveries);
  paymentMethods=(data.payment_methods||[]).filter(method=>['cod','cash'].includes(String(method.short_name).toLowerCase())&&Number(method.fee||0)===0);
  if(!paymentMethods.length)throw Error('Chưa có phương thức thanh toán khả dụng.');
  get('guest-delivery').onchange();
  if(context.contact){get('guest-name').value=context.contact.name||'';get('guest-phone').value=context.contact.phone||'';get('guest-name').readOnly=get('guest-phone').readOnly=true;
   const edit=node('button','Sửa liên hệ','btn btn-secondary'),editor=node('div',null,'checkout-section mt-3');edit.type='button';form.before(edit,editor);
   edit.onclick=async()=>{if(busy)return;busy=true;fields.disabled=true;edit.disabled=quoteButton.disabled=submit.disabled=true;invalidateQuote();try{const fresh=await editGuestContact(editor);if(fresh){get('guest-name').value=fresh.contact.name;get('guest-phone').value=fresh.contact.phone;}}catch(error){say(error.message);}finally{busy=false;fields.disabled=false;edit.disabled=quoteButton.disabled=false;}};
  }
  ready=true;fields.disabled=false;form.setAttribute('aria-busy','false');quoteButton.disabled=false;submit.textContent='Đặt hàng';if(!journal)say('');
 }catch(error){say(error.message||'Không thể tải thông tin thanh toán. Vui lòng tải lại trang để thử lại.');form.setAttribute('aria-busy','false');quoteButton.disabled=true;submit.disabled=true;submit.textContent='Chưa thể đặt hàng';}
}
