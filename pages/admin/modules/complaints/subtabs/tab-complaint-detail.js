// V1: server-authorized transitions; no local mutation of ticket business state.
(function () {
 'use strict';
 const mod = window.PawpalComplaints;
 const $ = id => document.getElementById(id);
 const escapeHtml = mod.escapeHtml;
 const client = () => mod.getDbClient();
 const tickets = () => [...mod.state.serviceComplaints, ...mod.state.orderComplaints];
 const current = () => tickets().find(t => t.id === mod.state.currentTicketId || t.rawId === mod.state.currentTicketId);
 const text = (id,value) => { if ($(id)) $(id).textContent = value ?? '—'; };
 const show = (id,value) => { if ($(id)) $(id).style.display = value ? '' : 'none'; };
 const finished = t => ['resolved','closed'].includes(t.status);
 const statusNames = {new:'Chờ tiếp nhận',processing:'Đang xử lý',waiting_customer:'Chờ khách phản hồi',waiting_manager_approval:'Chờ duyệt phương án',reprocessing:'Đang xử lý lại',resolved:'Đã giải quyết',closed:'Đã đóng',waiting_return:'Chờ nhận hàng',refunding:'Đang hoàn tiền'};
 const optionNames = {points:'Cộng Paw Points',voucher:'Tặng voucher',explain:'Giải thích và phản hồi',reject:'Từ chối khiếu nại',refund:'Hoàn tiền',rma_refund:'Trả hàng và hoàn tiền',rma_exchange:'Đổi sản phẩm',redo_service:'Làm lại dịch vụ',change_staff:'Đổi kỹ thuật viên'};
 const directAward = type => ['points','voucher'].includes(type);
 const hasAmount = type => ['refund','rma_refund','points'].includes(type);
 let renderVersion = 0;
 let replyMedia=null,replyTicket=null,gallery=null,replySaving=false,replyInit=null;
 async function ensureReplyMedia(t){
  if(replyTicket!==t.rawId){replyMedia?.close();replyMedia=null;replyInit=null;replyTicket=t.rawId;delete $('btnSubmitReply').dataset.requestId;}
  if(replyInit)return replyInit;
  if(!replyMedia){replyInit=(async()=>{
   const {createEvidenceMediaEditor}=await import('/scripts/shared/evidence-media.mjs');
   if(current()?.rawId!==t.rawId)return null;
   $('complaintReplyMedia').replaceChildren();
   replyMedia=createEvidenceMediaEditor({root:$('complaintReplyMedia'),db:client(),purpose:'ticket_image'});
   $('btnSubmitReply').dataset.requestId ||=crypto.randomUUID();
   await replyMedia.reset({target:$('btnSubmitReply').dataset.requestId,context:t.rawId});
   return replyMedia;
  })();try{return await replyInit;}finally{if(replyTicket===t.rawId)replyInit=null;}}
  return replyMedia;
 }
 async function readAll(build){const rows=[];for(let offset=0;;offset+=500){const {data,error}=await build().range(offset,offset+499);if(error)throw error;rows.push(...data);if(data.length<500)return rows;}}
 function readDetailResource(ticket, resource, fetcher) {
  const store=window.PawpalDataStore;
  return store ? store.fetch(`complaints:detail:${ticket.rawId}:${resource}:${store.buildKey(resource)}`,fetcher,{
   ttlMs:store.TTL.OPERATIONAL,backgroundRevalidate:false
  }) : fetcher();
 }
 function captureModal(id) {
  const t=current(), modal=$(id); if (!t || !modal) return null;
  Object.assign(modal.dataset,{requestId:crypto.randomUUID(),ticketId:t.rawId,version:t.updated_at});
  modal.classList.add('active'); return modal;
 }
 async function act(action, details, button, modal) {
  const t=current(); if(!t || button?.disabled) return false;
  const owner=modal || button;
  if(!owner.dataset.requestId) owner.dataset.requestId=crypto.randomUUID();
  if(button) button.disabled=true;
  try {
   const {error}=await client().rpc('act_admin_complaint',{
    p_request_id:owner.dataset.requestId,p_ticket_id:modal?.dataset.ticketId || t.rawId,
    p_expected_updated_at:modal?.dataset.version || t.updated_at,p_action:action,p_details:details
   });
   if(error) throw error;
   await mod.loadComplaintsModuleData({force:true});
   delete owner.dataset.requestId;
   modal?.classList.remove('active');
   mod.showToast('Đã lưu thay đổi.','success'); return true;
  } catch(error) {
   const message=mod.errorMessage(error);
   text(modal ? modal.id+'Error' : 'complaintActionError',message); return false;
  } finally { if(button) button.disabled=false; }
 }
 async function renderTicketDetail(id) {
  const version=++renderVersion;
  gallery?.clear();
  const t=tickets().find(t=>t.id===(id || mod.state.currentTicketId) || t.rawId===(id || mod.state.currentTicketId));
  show('complaintDetailData',Boolean(t && mod.state.isLoaded && !mod.state.loadError));
  show('complaintDetailPlaceholder',!t || !mod.state.isLoaded || Boolean(mod.state.loadError));
  if(!t || mod.state.loadError) {text('complaintDetailPlaceholder',mod.state.loadError || 'Chọn một khiếu nại để xem hồ sơ.');mod.updateBreadcrumb(null);return;}
  mod.state.currentTicketId=t.id; mod.state.currentActiveTicket=t;
  if(!replySaving&&!finished(t))ensureReplyMedia(t).catch(()=>{if(version===renderVersion)text('complaintReplyMedia','Không mở được công cụ đính kèm ảnh.');});
  if(version!==renderVersion)return;
  $('complaintReplyMedia').inert=finished(t)||replySaving;
  sessionStorage.setItem('pawpal_admin_complaint_selected_id',t.id); mod.updateBreadcrumb(t.id);
  text('viewTicketCode',t.id);text('detailTicketTitle',t.title);text('viewTicketStatusBadge',statusNames[t.status] || t.status);
  text('viewTicketPriorityBadge',({khan_cap:'Khẩn cấp',high:'Cao',medium:'Trung bình',low:'Thấp'})[t.priority]);
  const statusBadgeEl = $('viewTicketStatusBadge');
  const statusBadgeClass = {
    new: 'badge-warning',
    open: 'badge-warning',
    processing: 'badge-info',
    in_progress: 'badge-info',
    waiting_customer: 'badge-warning',
    waiting_manager_approval: 'badge-warning',
    reprocessing: 'badge-danger',
    resolved: 'badge-success',
    closed: 'badge-neutral'
  };
  if (statusBadgeEl) statusBadgeEl.className = `admin-badge ${statusBadgeClass[t.status] || 'badge-neutral'}`;
  const priorityBadgeEl = $('viewTicketPriorityBadge');
  const priorityBadgeClass = {
    khan_cap: 'priority-critical',
    high: 'priority-high',
    medium: 'priority-medium',
    low: 'priority-low'
  };
  if (priorityBadgeEl) priorityBadgeEl.className = `admin-badge priority-chip ${priorityBadgeClass[t.priority] || 'priority-medium'}`;
  text('viewTicketCustomerName',t.customerName);text('viewTicketCustomerPhone',t.phone);
  text('viewTicketCustomerContent',t.content);text('detailComplaintCreatedTime',t.createdAt);
  text('viewTicketRefInfo',t.bookingId || t.orderId || 'Chưa xác minh giao dịch');
  const waiting=t.status==='waiting_customer' && Boolean(t.customerReplyDueAt);
  show('complaintReplyDueLabel',waiting);show('complaintReplyDue',waiting);
  if(waiting)text('complaintReplyDue',mod.formatDateTime(t.customerReplyDueAt)+(Date.now()>=Date.parse(t.customerReplyDueAt)?' · Đã hết hạn':''));
  show('btnOpenComplaintSource',Boolean(t.bookingId || t.orderId));
  text('viewTicketStaffAssigned',t.staffAssigned);text('complaintPerformedBy',t.staffExecuted);show('complaintPerformedBy',Boolean(t.bookingId));show('complaintPerformedByLabel',Boolean(t.bookingId));text('viewTicketPetNotes',[t.petName,t.petNotes].filter(Boolean).join(' · ') || '—');
  text('viewTicketDemand',(t.customerDemand || 'Chưa ghi nhận yêu cầu')+(Number(t.requested_amount)>0?' · '+Number(t.requested_amount).toLocaleString('vi-VN')+' đ':''));
  text('viewResolutionNote',t.resolution_note || 'Chưa có phương án');
  text('viewResolutionBadge',optionNames[t.resolution_type] || t.resolution_type || '—');
  text('viewRefundAmount',t.approved_amount == null ? 'Chưa duyệt' : Number(t.approved_amount).toLocaleString('vi-VN')+(t.resolution_type==='points'?' điểm':' đ'));
  text('complaintCustomerRating',t.rating == null ? 'Chưa có đánh giá' : t.rating + '/5 sao');
  text('complaintRatingComment',t.ratingComment || '');
  show('complaintRating',finished(t)||t.rating!=null);
  text('complaintLifecycleNote',t.autoCloseReason==='no_customer_reply'?'Đã đóng do khách không bổ sung thông tin.':
   t.autoCloseReason==='resolved_expired'?'Đã đóng sau 3 ngày không có phản hồi.':
   t.status==='waiting_customer'&&!t.customerReplyDueAt?'Phiếu chưa có hạn phản hồi. Gửi lại yêu cầu bổ sung để khách đọc nội dung và bắt đầu thời hạn 72 giờ.':
   t.status==='reprocessing'&&t.rating<3&&t.rating!=null?'Cần quản lý tiếp nhận. Khách đánh giá dưới 3 sao.':'');
  show('managerApprovalPanel',t.status==='waiting_manager_approval');
  const reopenExpired=t.autoCloseReason==='resolved_expired' ||
   (t.autoCloseReason==='no_customer_reply' && Date.now()>=Date.parse(t.closedAtRaw)+7*86400000);
  show('btnReopenTicket',finished(t)&&!reopenExpired); show('btnCloseComplaint',t.status==='resolved');
  ['btnAssignHandler','btnRequestMoreInfo','btnOpenResolveModal','btnSubmitReply'].forEach(id=>{if($(id))$(id).disabled=finished(t);});
  show('btnRequestMoreInfo',Boolean(t.customerId));
  text('btnCompleteComplaint',directAward(t.resolution_type)?'Thực hiện bồi hoàn':'Liên kết kết quả thực hiện');
  show('btnCompleteComplaint',t.status==='processing' && Boolean(t.resolved_by) && Boolean(t.resolution_type));
  show('btnLinkComplaintSource',!finished(t) && !t.bookingId && !t.orderId);
  text('complaintAttachments','Đang tải tệp đính kèm…');
  loadAttachments(t,version);
  renderEvidence(t,version).catch(()=>{
   if(version!==renderVersion)return;
   text('viewTicketCheckinHealth','Không tải được biên bản.');
   text('viewTicketStaffLogNote','Không tải được nhật ký.');
   text('complaintOrderLines','Không tải được sản phẩm trong đơn.');
  });
  text('viewTicketTimeline','Đang tải lịch sử…');text('complaintActionError','');
  try {
   const messages=await readDetailResource(t,'messages',async()=>{
    const messages=[];
   for(let offset=0;;offset+=500){
    const {data,error}=await client().from('support_ticket_message').select('id,sender_type,sender_account_id,content,is_internal,created_at').eq('ticket_id',t.rawId).order('created_at').order('id').range(offset,offset+499);
    if(error)throw error;messages.push(...data);if(data.length<500)break;
   }
    return messages;
   });
   if(version!==renderVersion)return;
   $('viewTicketTimeline').innerHTML=messages.map(m=>{
    const author=mod.state.cachedStaff.find(s=>s.auth_user_id===m.sender_account_id)?.full_name || (['staff','cskh','nhan_vien'].includes(m.sender_type)?'Nhân viên':m.sender_type==='system'?'Hệ thống':['user','customer','khach_hang'].includes(m.sender_type)?t.customerName:'Người gửi');
    return `<article class="complaint-history-entry"><strong>${escapeHtml(author)}</strong> <span>${escapeHtml(mod.formatDateTime(m.created_at))} · ${m.is_internal?'Nội bộ':'Trao đổi'}</span>${m.id===t.customerFollowupMessageId?' <strong class="admin-badge badge-info">Phản hồi mới</strong>':''}<p>${escapeHtml(m.content)}</p></article>`;
   }).join('') || 'Chưa có lịch sử trao đổi.';
   const audit={data:await readDetailResource(t,'audit',()=>readAll(()=>client().from('audit_log').select('id,description,created_at').eq('entity_id',t.rawId).eq('action','COMPLAINT_ACTION').order('created_at',{ascending:false}).order('id',{ascending:false})))};
   if(version!==renderVersion)return;
   const events=(audit.data || []).flatMap(a=>{try{return [JSON.parse(a.description)];}catch{return [];}});
   const proposal=events.find(e=>e.action==='propose');
   text('viewProposedAmount',proposal?Number(proposal.voucher_amount ?? proposal.details.amount ?? 0).toLocaleString('vi-VN')+(proposal.details.option==='points'?' điểm':' đ')+(proposal.details.voucher_code?' · '+proposal.details.voucher_code:''):'Chưa có đề xuất có thể duyệt');
   text('complaintLinkedResults',audit.error?'Không tải được kết quả liên kết.':audit.data.flatMap(a=>{try{const d=JSON.parse(a.description);return d.action==='complete'?[`${mod.formatDateTime(a.created_at)} · ${d.result_id || d.details.evidence_id}${d.details.replacement_order_id?' · Đơn đổi mới: '+d.details.replacement_order_id:''}${d.details.return_request_id?' · Hàng trả: '+d.details.return_request_id:''}`]:[];}catch{return [];}}).join('\n') || 'Chưa liên kết kết quả thực hiện.');
  } catch(error) {if(version===renderVersion)text('viewTicketTimeline','Không tải được lịch sử: '+error.message);}
 }
 async function loadAttachments(t,version) {
  try {
   const {data:attachments,error:attachmentError}=await client().rpc('list_ticket_media',{p_ticket:t.rawId});
   if(attachmentError)throw attachmentError;
   if(version!==renderVersion)return;
   const {createEvidenceGallery}=await import('/scripts/shared/evidence-gallery.mjs');
   if(version!==renderVersion)return;
   gallery=createEvidenceGallery({root:$('complaintAttachments'),db:client()});await gallery.render(attachments||[]);
   if(version!==renderVersion)return;
  } catch {
   if(version===renderVersion)text('complaintAttachments','Không tải được tệp đính kèm. Vui lòng tải lại phiếu.');
  }
 }
 async function renderEvidence(t,version) {
  show('complaintOrderEvidence',Boolean(t.orderId));
  show('complaintServiceEvidence',Boolean(t.bookingId));
  show('viewTicketPetNotes',Boolean(t.bookingId));
  if(t.orderId){
   const order=mod.state.cachedOrders.find(row=>row.order_code===t.orderId || row.id===t.orderId);
   text('complaintOrderDelivery',[t.deliveryStatus,t.trackingCode].filter(Boolean).join(' · '));
   text('complaintOrderLines','Đang tải sản phẩm…');
   if(!order){text('complaintOrderLines','Không tìm thấy đơn hàng.');return;}
   const lines=await readDetailResource(t,'order-lines',()=>readAll(()=>client().from('sales_order_detail').select('product_name_snapshot,sku_snapshot,quantity').eq('order_id',order.id).order('id')));
   if(version===renderVersion)text('complaintOrderLines',lines.map(line=>[line.product_name_snapshot,line.sku_snapshot,'Số lượng '+line.quantity].filter(Boolean).join(' · ')).join('\n') || 'Chưa có sản phẩm trong đơn.');
   return;
  }
  text('viewTicketCheckinHealth','Đang tải biên bản…');
  text('viewTicketStaffLogNote','Đang tải nhật ký…');
  const appt=mod.state.cachedAppointments.find(a=>a.appointment_code===t.bookingId || a.id===t.bookingId);
  if(!appt){text('viewTicketCheckinHealth','Chưa liên kết lịch hẹn.');text('viewTicketStaffLogNote','—');return;}
  const [records,logs]=await readDetailResource(t,'evidence',()=>Promise.all([
   readAll(()=>client().from('appointment_record').select('id,record_type,condition_note,safety_note_snapshot,allergy_note_snapshot,recorded_at,customer_confirmation_status').eq('appointment_id',appt.id).order('recorded_at',{ascending:false}).order('id')),
   readAll(()=>client().from('care_log').select('id,description,observed_condition,recorded_at').eq('appointment_id',appt.id).order('recorded_at',{ascending:false}).order('id'))
  ]));
  if(version!==renderVersion)return;
  text('viewTicketCheckinHealth',records.map(r=>`${mod.formatDateTime(r.recorded_at)} · ${r.record_type==='checkin' || r.record_type==='check_in'?'Tiếp nhận':r.record_type==='handover'?'Bàn giao':'Biên bản'}: ${r.condition_note} · ${r.customer_confirmation_status==='confirmed'?'Khách đã xác nhận':'Chưa xác nhận'}`).join('\n') || 'Chưa có biên bản.');
  text('viewTicketStaffLogNote',logs.map(r=>`${mod.formatDateTime(r.recorded_at)}: ${r.description || ''}${r.observed_condition?' · '+r.observed_condition:''}`).join('\n') || 'Chưa có nhật ký.');
 }
 async function openAssignHandlerModal() {
  const modal=captureModal('assignHandlerModalOverlay');if(!modal)return;
  const input=$('searchAssignStaff'),selected=$('selectAssignStaff'),dropdown=$('assignStaffDropdown');
  input.value='';selected.value='';$('inputAssignNote').value='';text('assignHandlerError','');dropdown.style.display='none';input.disabled=true;
  try {
   const {data,error}=await client().rpc('get_admin_complaint_handlers');if(error)throw error;
   const render=()=>{selected.value='';dropdown.innerHTML=data.filter(s=>s.full_name.toLocaleLowerCase().includes(input.value.toLocaleLowerCase())).map(s=>`<button type="button" class="customer-autocomplete-item" data-staff-id="${s.id}">${escapeHtml(s.full_name)}</button>`).join('') || 'Không có nhân viên phù hợp.';dropdown.style.display='block';dropdown.querySelectorAll('[data-staff-id]').forEach(b=>b.onclick=()=>{selected.value=b.dataset.staffId;input.value=b.textContent;dropdown.style.display='none';});};
   input.oninput=render;input.onfocus=render;input.onblur=()=>setTimeout(()=>dropdown.style.display='none',150);
  } catch(error){text('assignHandlerError',mod.errorMessage(error));}finally{input.disabled=false;}
 }
 function openRequestMoreInfoModal(){if(captureModal('requestMoreInfoModalOverlay')){$('inputRequestMessage').value='';$('selectRequestChannel').value='portal';text('requestMoreInfoModalOverlayError','');}}
 function resolutionVisibility(){
  const option=$('selectResolveOption').value;
  show('complaintAmountGroup',hasAmount(option));
  text('complaintAmountLabel',option==='points'?'Số Paw Points đề xuất':'Số tiền đề xuất');
  $('complaintVoucherGroup').hidden=option!=='voucher';
  text('complaintResolutionHint',['explain','reject'].includes(option)?'Lưu kết quả giải quyết kèm lý do.':'Quản lý phải duyệt phương án trước khi thực hiện.');
 }
 function bindEvidence(prefix,rows,onSelect){
  const input=$(prefix+'Search'),selected=$(prefix+'Id'),dropdown=$(prefix+'Dropdown');
  input.value='';selected.value='';dropdown.style.display='none';
  const render=()=>{dropdown.innerHTML=rows.filter(r=>r.label.toLocaleLowerCase().includes(input.value.toLocaleLowerCase())).slice(0,30).map(r=>`<button type="button" class="customer-autocomplete-item" data-id="${r.id}">${escapeHtml(r.label)}</button>`).join('') || 'Chưa có kết quả phù hợp.';dropdown.style.display='block';dropdown.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{selected.value=b.dataset.id;input.value=b.textContent;dropdown.style.display='none';onSelect?.(b.dataset.id);});};
  input.oninput=()=>{selected.value='';onSelect?.(null);render();};input.onfocus=render;input.onblur=()=>setTimeout(()=>dropdown.style.display='none',150);
 }
 async function openResolveModal(mode='resolve'){
  const modal=captureModal('resolveTicketModalOverlay');if(!modal)return;
  const t=current();modal.dataset.mode=mode;
  $('btnConfirmResolveTicket').disabled=false;
  $('complaintEvidenceSearch').disabled=false;
  $('complaintReplacementSearch').readOnly=mode==='complete' && t.resolution_type==='rma_exchange';
  $('inputResolveNote').value='';$('inputResolveAmount').value='';$('selectResolveOption').value='explain';text('resolveTicketModalOverlayError','');
  $('complaintVoucherGroup').hidden=true;$('complaintVoucherCode').value='';
  show('complaintOptionGroup',mode==='resolve');show('complaintEvidenceGroup',mode==='link_source'||(mode==='complete'&&!directAward(t.resolution_type)));show('complaintReplacementGroup',mode==='complete' && ['rma_exchange','rma_refund'].includes(t.resolution_type));
  text('complaintReplacementLabel',t.resolution_type==='rma_refund'?'Yêu cầu trả hàng đã nhận':'Đơn hàng đổi mới đã giao');
  show('complaintAmountGroup',false);
  text('complaintResolutionTitle',({resolve:'Phương án xử lý',complete:directAward(t.resolution_type)?'Thực hiện bồi hoàn':'Liên kết kết quả thực hiện',close:'Đóng phiếu',reopen:'Mở lại phiếu',link_source:'Liên kết giao dịch'})[mode]);
  text('btnConfirmResolveTicket',mode==='resolve'?'Lưu phương án':'Xác nhận');
  text('complaintResolutionHint',mode==='complete'?(directAward(t.resolution_type)?'Xác nhận thực hiện đúng phương án đã được quản lý duyệt.':'Thực hiện phương án tại Bán hàng hoặc Dịch vụ, sau đó chọn kết quả đã hoàn tất ở đây.'):'Nhập lý do để lưu vào lịch sử xử lý.');
  if(mode==='resolve')resolutionVisibility();
  if(mode==='link_source'){
   const isOrder=mod.state.orderComplaints.some(c=>c.rawId===t.rawId);modal.dataset.sourceKind=isOrder?'order':'service';
   bindEvidence('complaintEvidence',(isOrder?mod.state.cachedOrders:mod.state.cachedAppointments).filter(r=>r.customer_id===t.customerId).map(r=>({id:r.id,label:r.order_code || r.appointment_code})));return;
  }
  if(mode!=='complete'||directAward(t.resolution_type))return;
  const requestId=modal.dataset.requestId;
  const isCurrent=()=>modal.dataset.requestId===requestId && modal.classList.contains('active');
  const confirm=$('btnConfirmResolveTicket');
  confirm.disabled=true;
  $('complaintEvidenceSearch').disabled=true;
  bindEvidence('complaintEvidence',[]);
  bindEvidence('complaintReplacement',[]);
  try{
   let rows=[],replacementRows=[];
   const order=mod.state.cachedOrders.find(o=>o.order_code===t.orderId || o.id===t.orderId);
   const original=mod.state.cachedAppointments.find(a=>a.appointment_code===t.bookingId || a.id===t.bookingId);
   if(['refund','rma_refund'].includes(t.resolution_type)){
    const source=order || original;
    if(!source)throw Error('Phiếu chưa có giao dịch đã xác minh.');
    const data=await readAll(()=>client().from('refund_transaction').select('id,refund_code,refunded_amount,ticket_id,return_request_id,payment:payment_id!inner(customer_id,order_id,appointment_id)').eq('refund_status','succeeded').eq('payment.customer_id',t.customerId).eq(order?'payment.order_id':'payment.appointment_id',source.id).eq('refunded_amount',t.approved_amount || 0).order('id'));
    rows=data.filter(r=>!r.ticket_id||r.ticket_id===t.rawId).map(r=>({id:r.id,returnId:r.return_request_id,label:`${r.refund_code} · ${Number(r.refunded_amount).toLocaleString('vi-VN')} đ`}));
    if(t.resolution_type==='rma_refund'){
     if(!order)throw Error('Phiếu chưa có đơn hàng đã xác minh.');
     const returns=await readAll(()=>client().from('return_request').select('id,reason').eq('sales_order_id',order.id).in('request_status',['received','completed']).order('id'));
     replacementRows=returns.map(r=>({id:r.id,label:r.reason+' · '+r.id}));
     rows=rows.filter(r=>replacementRows.some(item=>!r.returnId||item.id===r.returnId));
    }
   }else if(t.resolution_type==='rma_exchange'){
    if(!order)throw Error('Phiếu chưa có đơn hàng đã xác minh.');
    const data=await readAll(()=>client().from('sales_replacement')
      .select('order_id,returned:return_request_id!inner(id,reason,sales_order_id,request_status),replacement:order_id!inner(order_code,order_status,customer_id)')
      .eq('kind','exchange').eq('returned.sales_order_id',order.id).in('returned.request_status',['received','completed'])
      .eq('replacement.customer_id',t.customerId).in('replacement.order_status',['delivered','completed']).order('order_id'));
    rows=data.map(r=>({id:r.returned.id,label:r.returned.reason+' · '+r.replacement.order_code, replacement:{id:r.order_id,label:r.replacement.order_code}}));
   }else{
    if(!original?.pet_id)throw Error('Phiếu chưa có lịch hẹn và hồ sơ bé cưng đã xác minh.');
    const originalItems=await readAll(()=>client().from('appointment_item').select('service_id').eq('appointment_id',original.id).order('id'));
    const services=new Set(originalItems.map(item=>item.service_id).filter(Boolean));
    const appointments=await readAll(()=>client().from('appointment').select('id,appointment_code,scheduled_start_at,created_at,items:appointment_item(service_id)').eq('customer_id',t.customerId).eq('pet_id',original.pet_id).eq('appointment_status','completed').order('id'));
    rows=appointments.filter(a=>a.items.some(item=>services.has(item.service_id)) &&
      (t.resolution_type==='change_staff' || (a.id!==original.id && Date.parse(a.created_at)>=Date.parse(t.createdAtRaw))))
      .map(a=>({id:a.id,label:a.appointment_code+' · '+mod.formatDateTime(a.scheduled_start_at)}));
   }
   if(!isCurrent())return;
   bindEvidence('complaintEvidence',rows,id=>{
    const result=rows.find(row=>row.id===id);
    if(t.resolution_type==='rma_exchange'){
     $('complaintReplacementId').value=result?.replacement.id || '';
     $('complaintReplacementSearch').value=result?.replacement.label || '';
    }else if(t.resolution_type==='rma_refund'){
     bindEvidence('complaintReplacement',result?replacementRows.filter(r=>!result.returnId||r.id===result.returnId):[]);
    }
   });
   if(!rows.length)text('resolveTicketModalOverlayError','Chưa có kết quả hoàn tất phù hợp trong Bán hàng hoặc Dịch vụ.');
   confirm.disabled=!rows.length;
  }catch(error){if(isCurrent())text('resolveTicketModalOverlayError','Không tải được kết quả: '+error.message);}
  finally{if(isCurrent())$('complaintEvidenceSearch').disabled=false;}
 }
 function init(){
  const root=$('subtab-tab-complaint-detail');if(!root || root.dataset.v1Bound)return;root.dataset.v1Bound='true';
  const bind=(id,fn)=>{if($(id))$(id).onclick=fn;};
  bind('btnAssignHandler',openAssignHandlerModal);bind('btnRequestMoreInfo',openRequestMoreInfoModal);bind('btnOpenResolveModal',()=>openResolveModal());
  bind('btnCloseComplaint',()=>openResolveModal('close'));bind('btnReopenTicket',()=>openResolveModal('reopen'));bind('btnCompleteComplaint',()=>openResolveModal('complete'));
  bind('btnLinkComplaintSource',()=>openResolveModal('link_source'));
  bind('btnOpenComplaintSource',()=>{
   const t=current(),order=mod.state.cachedOrders.find(o=>o.order_code===t.orderId || o.id===t.orderId),appt=mod.state.cachedAppointments.find(a=>a.appointment_code===t.bookingId || a.id===t.bookingId);
   if(order){sessionStorage.setItem('pawpal_admin_order_selected_id',order.id);sessionStorage.setItem('pawpal_admin_order_subtab','tab-order-detail');if(window.PawpalOrders?.state)window.PawpalOrders.state.selectedOrderId=order.id;document.querySelector('[data-title="Bán hàng"]')?.click();}
   else if(appt){sessionStorage.setItem('pawpal_admin_service_selected_id',appt.id);sessionStorage.setItem('pawpal_admin_services_active_subtab','tab-service-detail');if(window.PawpalServices?.state)window.PawpalServices.state.selectedBookingId=appt.id;document.querySelector('[data-title="Dịch vụ"]')?.click();}
  });
  bind('btnManagerApproveProposal',()=>act('approve',{note:$('complaintApprovalNote').value.trim()},$('btnManagerApproveProposal')));
  bind('btnManagerRejectProposal',()=>act('reject_proposal',{note:$('complaintApprovalNote').value.trim()},$('btnManagerRejectProposal')));
  $('selectResolveOption').onchange=resolutionVisibility;
  bind('btnConfirmResolveTicket',()=>{
   const modal=$('resolveTicketModalOverlay'),mode=modal.dataset.mode,note=$('inputResolveNote').value.trim(),option=$('selectResolveOption').value;
   const details={note};let action=mode;
   if(mode==='resolve'){action=['explain','reject'].includes(option)?'resolve':'propose';details.option=option;details.amount=hasAmount(option)?Number($('inputResolveAmount').value):0;if(option==='voucher')details.voucher_code=$('complaintVoucherCode').value.trim();}
   if(mode==='complete'&&!directAward(current().resolution_type)){
    const type=current().resolution_type;
    details.evidence_id=$('complaintEvidenceId').value || null;
    const linked=$('complaintReplacementId').value;
    if(!details.evidence_id || (['rma_exchange','rma_refund'].includes(type) && !linked)){
     text('resolveTicketModalOverlayError','Chọn đầy đủ kết quả thực hiện trước khi xác nhận.');return;
    }
    if(type==='rma_exchange')details.replacement_order_id=linked;
    if(type==='rma_refund')details.return_request_id=linked;
   }
   if(mode==='link_source'){details.evidence_id=$('complaintEvidenceId').value || null;details.source_kind=modal.dataset.sourceKind;}
   return act(action,details,$('btnConfirmResolveTicket'),modal);
  });
  bind('btnConfirmAssignHandler',async()=>{
   const modal=$('assignHandlerModalOverlay'),button=$('btnConfirmAssignHandler'),staff=$('selectAssignStaff').value,note=$('inputAssignNote').value.trim();
   text('assignHandlerError','');if(!staff || note.length<2){text('assignHandlerError','Chọn nhân viên và nhập lý do.');return;}if(button.disabled)return;button.disabled=true;
   try{const {error}=await client().rpc('assign_admin_complaint',{p_request_id:modal.dataset.requestId,p_ticket_id:modal.dataset.ticketId,p_expected_updated_at:modal.dataset.version,p_staff_id:staff,p_note:note});if(error)throw error;await mod.loadComplaintsModuleData({force:true});modal.classList.remove('active');mod.showToast('Đã phân công xử lý.','success');}catch(error){text('assignHandlerError',mod.errorMessage(error));}finally{button.disabled=false;}
  });
  bind('btnSendRequestInfo',()=>{
   const note=$('inputRequestMessage').value.trim();
   if(note.length<2){text('requestMoreInfoModalOverlayError','Nhập cụ thể thông tin hoặc hình ảnh khách cần bổ sung.');return;}
   return act('request_info',{note,channel:$('selectRequestChannel').value},$('btnSendRequestInfo'),$('requestMoreInfoModalOverlay'));
  });
  bind('btnSubmitReply',async()=>{
   const t=current(),button=$('btnSubmitReply');if(!t||button.disabled||replySaving)return;
   const note=$('replyContentInput').value.trim();if(note.length<2){text('complaintActionError','Nhập nội dung trao đổi trước khi lưu.');return;}
   const internal=$('complaintInternalMessage').checked,editor=await ensureReplyMedia(t);if(!editor||current()?.rawId!==t.rawId)return;
   replySaving=true;$('complaintReplyMedia').inert=true;$('replyContentInput').disabled=true;$('complaintInternalMessage').disabled=true;
   try{
    button.disabled=true;const ids=await editor.prepare();button.disabled=false;
    if(current()?.rawId!==t.rawId)return;
    if(await act('message',{note,internal,media_asset_ids:ids},button)){
     editor.saved();editor.close();replyMedia=null;
     if(current()?.rawId===t.rawId){$('replyContentInput').value='';await ensureReplyMedia(t);}
    }
   }catch(error){text('complaintActionError',error.message);}
   finally{replySaving=false;button.disabled=finished(current()||t);$('complaintReplyMedia').inert=button.disabled;$('replyContentInput').disabled=false;$('complaintInternalMessage').disabled=false;if(current()&&current().rawId!==t.rawId)await ensureReplyMedia(current());}
  });
  document.querySelectorAll('#assignHandlerModalOverlay,#requestMoreInfoModalOverlay,#resolveTicketModalOverlay').forEach(modal=>{
   modal.querySelector('form')?.addEventListener('submit',e=>e.preventDefault());
   modal.onclick=e=>{if(e.target===modal)modal.classList.remove('active');};
   modal.querySelectorAll('[data-close-modal]').forEach(b=>b.onclick=()=>modal.classList.remove('active'));
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelectorAll('.complaints-module .admin-modal-overlay.active').forEach(m=>m.classList.remove('active'));});
 }
 mod.subtabs.detail={init,renderTicketDetail,openAssignHandlerModal,openRequestMoreInfoModal,openResolveModal};
 mod.openAssignHandlerModal=openAssignHandlerModal;mod.openRequestMoreInfoModal=openRequestMoreInfoModal;
 init();
})();
