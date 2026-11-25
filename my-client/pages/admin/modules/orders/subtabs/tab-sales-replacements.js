(function(){
 'use strict';
 const m=window.PawpalOrders,el=id=>document.getElementById(id),linkOf=r=>Array.isArray(r.replacement)?r.replacement[0]:r.replacement;
 const modal=document.createElement('div');modal.id='modalSalesReplacement';modal.className='admin-modal-overlay';
 modal.innerHTML=`<div class="admin-modal-card" style="width:940px;max-width:96vw;padding:26px 30px;overscroll-behavior:contain">
 <div class="modal-header-clean"><div class="modal-title-clean" id="salesReplacementTitle">Tạo đơn thay thế</div><button type="button" class="modal-btn-close-text" data-close-modal="modalSalesReplacement">Đóng</button></div>
 <form id="formSalesReplacement" onsubmit="return false;" style="display:flex;flex-direction:column;gap:16px">
 <p id="salesReplacementMeta" style="margin:0;color:#4F7A65;overflow-wrap:anywhere"></p>
 <div id="salesReplacementLines" style="display:flex;flex-direction:column;gap:16px"></div>
 <label class="form-label-clean" for="salesReplacementReason">Lý do <span style="color:#DC2626">*</span></label>
 <textarea id="salesReplacementReason" class="admin-input" rows="3" maxlength="2000" style="height:auto"></textarea>
 <label style="display:flex;gap:8px"><input type="checkbox" id="salesReplacementConfirmed">Tôi xác nhận sản phẩm và số lượng thay thế, không thu thêm tiền</label>
 <p id="salesReplacementError" role="alert" style="color:#DC2626;margin:0"></p>
 <div class="modal-footer-clean"><button type="button" class="admin-btn admin-btn-secondary" data-close-modal="modalSalesReplacement">Hủy</button><button type="button" class="admin-btn admin-btn-primary" id="btnSaveSalesReplacement">Tạo đơn thay thế</button></div></form></div>`;
 el('modalReturnRefund').parentElement.append(modal);
 let selected=null,busy=false,session=0;const choices=new Map(),requests=new Map();
 const messages={sales_replacement_exists:'Yêu cầu này đã có đơn thay thế. Tải lại để xem.',sales_return_changed:'Yêu cầu đã thay đổi. Đóng và mở lại để đối chiếu.',sales_replacement_state_invalid:'Đổi hàng cần nhận và kiểm định hàng cũ; gửi bù cần yêu cầu còn hiệu lực.',sales_replacement_refund_review_required:'Đơn đã có hoàn tiền hoặc bồi hoàn khác. Cần đối soát trước khi tiếp tục.',sales_replacement_variant_invalid:'Sản phẩm đã ngừng bán hoặc gửi bù khác SKU gốc.',sales_replacement_lines_invalid:'Sản phẩm và số lượng chưa khớp yêu cầu.',sales_request_conflict:'Yêu cầu đã được ghi với nội dung khác. Tải lại để đối chiếu.'};
 m.appendSalesReplacementControls=(section,order,r)=>{
  if(window.PAWPAL_SALES_REPLACEMENTS_ENABLED!==true)return;
  const link=linkOf(r);
  if(link?.order){
   const text=document.createElement('p');text.style.cssText='color:#4F7A65;margin:4px 0';
   const status={pending:'Đang chuẩn bị',confirmed:'Đã xác nhận',packing:'Đang đóng gói',shipped:'Đang giao',shipping:'Đang giao',completed:'Đã giao',delivered:'Đã giao',cancelled:'Đã hủy'};
   text.textContent=(link.kind==='resend'?'Gửi bù':'Đổi hàng')+' · '+link.order.order_code+' · '+(status[link.order.order_status]||'Cần đối soát')+(link.order.tracking_code?' · Vận đơn '+link.order.tracking_code:'')+' · Không thu thêm tiền';section.append(text);
   const button=document.createElement('button');button.type='button';button.className='admin-btn admin-btn-secondary';button.textContent='Xem đơn thay thế';
   button.onclick=async()=>{button.disabled=true;try{const target=await m.ensureOrder(link.order_id,{force:true});if(target)window.PawpalOrdersModule.openOrderDetail(target.id);}catch{m.helpers.showToast('Không tải được đơn thay thế.','warning');}finally{button.disabled=false;}};section.append(button);return;
  }
  if(!link&&((r.return_type==='exchange'&&r.request_status==='received')||(r.return_type==='resend'&&['pending','approved','received'].includes(r.request_status)))){
   const button=document.createElement('button');button.type='button';button.className='admin-btn admin-btn-secondary';button.textContent=r.return_type==='resend'?'Tạo đơn gửi bù':'Tạo đơn đổi hàng';button.onclick=()=>m.openSalesReplacement(order,r);section.append(button);
  }
 };
 m.openSalesReplacement=(order,r)=>{
  if(window.PAWPAL_SALES_REPLACEMENTS_ENABLED!==true)return;
  if(busy)return;selected={order:structuredClone(order),r:structuredClone(r)};++session;choices.clear();requests.clear();el('formSalesReplacement').reset();el('salesReplacementError').textContent='';
  el('salesReplacementTitle').textContent=r.return_type==='resend'?'Tạo đơn gửi bù':'Tạo đơn đổi hàng';
  el('salesReplacementMeta').textContent=order.id+' · '+(order.address||'Nhận tại cửa hàng')+' · Giao theo thông tin người nhận của đơn gốc, không thu thêm tiền.';
  el('salesReplacementLines').replaceChildren();
  for(const line of r.lines){
   const wrapper=document.createElement('div');wrapper.className='customer-autocomplete-wrapper';wrapper.style.cssText='position:relative;width:100%';
   const label=document.createElement('label');label.className='form-label-clean';label.textContent=(line.line?.product_name_snapshot||'Sản phẩm')+' × '+line.quantity;
   const input=document.createElement('input');input.type='text';input.className='admin-input';input.autocomplete='off';input.setAttribute('aria-label','Sản phẩm thay thế cho '+label.textContent);input.placeholder='Tìm tên sản phẩm hoặc SKU';
   const popover=document.createElement('div');popover.className='customer-autocomplete-popover';popover.style.cssText='display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;max-height:240px;overflow-y:auto;overscroll-behavior:contain;z-index:2500;border:1px solid #ECF2EE;border-radius:9px;background:#FFF;box-shadow:0 10px 28px rgba(35,107,72,.14)';
   choices.set(line.id,line.line?.product_variant_id||'');input.value=line.line?.sku_snapshot||'';
   input.readOnly=r.return_type==='resend';wrapper.append(label,input,popover);el('salesReplacementLines').append(wrapper);
   let timer,version=0;
   input.addEventListener('input',()=>{
    choices.set(line.id,'');el('salesReplacementConfirmed').checked=false;clearTimeout(timer);const current=++version,opening=session;popover.style.display='none';
    if(input.value.trim().length<2)return;
    timer=setTimeout(async()=>{try{
     const rows=await window.PawpalOrderV1.searchVariants(input.value.trim());
     if(current!==version||opening!==session||!modal.classList.contains('active'))return;
     popover.replaceChildren();
     for(const row of rows){const button=document.createElement('button');button.type='button';button.className='customer-autocomplete-item';button.style.cssText='display:block;width:100%;padding:9px 12px;text-align:left;border:none;background:transparent;color:#203A2C';button.textContent=row.name;button.onmousedown=e=>e.preventDefault();button.onclick=()=>{choices.set(line.id,row.variantId);input.value=row.name;popover.style.display='none';el('salesReplacementConfirmed').checked=false;};popover.append(button);}
     if(!rows.length)popover.textContent='Không có sản phẩm phù hợp.';popover.style.display='block';
    }catch{if(opening===session&&current===version)el('salesReplacementError').textContent='Không tìm được sản phẩm. Vui lòng thử lại.';}},300);
   });input.addEventListener('blur',()=>setTimeout(()=>{popover.style.display='none';},100));
  }
  modal.classList.add('active');
 };
 el('formSalesReplacement').addEventListener('submit',event=>event.preventDefault());
 el('btnSaveSalesReplacement').onclick=async()=>{
  if(busy||!selected)return;el('salesReplacementError').textContent='';const reason=el('salesReplacementReason').value.trim();
  if(reason.length<2||!el('salesReplacementConfirmed').checked||[...choices.values()].some(v=>!v)){el('salesReplacementError').textContent='Chọn đủ sản phẩm, nhập lý do và xác nhận phương án thay thế.';return;}
  const details={kind:selected.r.return_type,reason,confirmed:true,lines:selected.r.lines.map(d=>({return_detail_id:d.id,variant_id:choices.get(d.id),quantity:Number(d.quantity)}))};
  const signature=JSON.stringify({returnId:selected.r.id,version:selected.r.updated_at,details});if(!requests.has(signature))requests.set(signature,crypto.randomUUID());
  busy=true;el('btnSaveSalesReplacement').disabled=true;
  try{
   const request=requests.get(signature),{data,error}=await window.getSupabaseClient().rpc('create_admin_sales_replacement',{p_request_id:request,p_return_id:selected.r.id,p_expected_updated_at:selected.r.updated_at,p_details:details});
   if(error)throw error;if(data!==request)throw new Error('invalid_acknowledgement');
   modal.classList.remove('active');const order=await m.ensureOrder(selected.order.rawId,{force:true});if(order)m.renderSalesReturns(order);
   m.helpers.showToast('Đã tạo đơn thay thế và giữ kho. Mở đơn thay thế để xác nhận, giao hàng.');
  }catch(error){el('salesReplacementError').textContent=messages[error.message]||(error.code==='23514'?'Không đủ tồn khả dụng hoặc dữ liệu cần đối soát.':error.code==='42501'?'Bạn chưa có quyền tạo đơn thay thế.':'Không tạo được đơn thay thế. Giữ thông tin và thử lại.');}
  finally{busy=false;el('btnSaveSalesReplacement').disabled=false;}
 };
})();
