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
 const optionNames = {explain:'Giải thích và phản hồi',reject:'Từ chối khiếu nại',refund:'Hoàn tiền',rma_refund:'Trả hàng và hoàn tiền',rma_exchange:'Đổi sản phẩm',redo_service:'Làm lại dịch vụ',change_staff:'Đổi kỹ thuật viên'};
 let renderVersion = 0;
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
   delete owner.dataset.requestId;
   await mod.loadComplaintsModuleData({force:true});
   modal?.classList.remove('active');
   mod.showToast('Đã lưu thay đổi.','success'); return true;
  } catch(error) {
   const message=mod.errorMessage(error);
   text(modal ? modal.id+'Error' : 'complaintActionError',message); return false;
  } finally { if(button) button.disabled=false; }
 }
 async function renderTicketDetail(id) {
  const version=++renderVersion;
  const t=tickets().find(t=>t.id===(id || mod.state.currentTicketId) || t.rawId===(id || mod.state.currentTicketId));
  show('complaintDetailData',Boolean(t && mod.state.isLoaded && !mod.state.loadError));
  show('complaintDetailPlaceholder',!t || !mod.state.isLoaded || Boolean(mod.state.loadError));
  if(!t || mod.state.loadError) {text('complaintDetailPlaceholder',mod.state.loadError || 'Chọn một khiếu nại để xem hồ sơ.');mod.updateBreadcrumb(null);return;}
  mod.state.currentTicketId=t.id; mod.state.currentActiveTicket=t;
  sessionStorage.setItem('pawpal_admin_complaint_selected_id',t.id); mod.updateBreadcrumb(t.id);
  text('viewTicketCode',t.id);text('detailTicketTitle',t.title);text('viewTicketStatusBadge',statusNames[t.status] || t.status);
  text('viewTicketPriorityBadge',({khan_cap:'Khẩn cấp',high:'Cao',medium:'Trung bình',low:'Thấp'})[t.priority]);
  text('viewTicketCustomerName',t.customerName);text('viewTicketCustomerPhone',t.phone);
  text('viewTicketCustomerContent',t.content);text('detailComplaintCreatedTime',t.createdAt);
  text('viewTicketRefInfo',t.bookingId || t.orderId || 'Chưa liên kết giao dịch');
  show('btnOpenComplaintSource',Boolean(t.bookingId || t.orderId));
  text('viewTicketStaffAssigned',t.staffAssigned);text('viewTicketPetNotes',t.petNotes || '—');
  text('viewTicketDemand',(t.customerDemand || 'Chưa ghi nhận yêu cầu')+(Number(t.requested_amount)>0?' · '+Number(t.requested_amount).toLocaleString('vi-VN')+' đ':''));
  text('viewResolutionNote',t.resolution_note || 'Chưa có phương án');
  text('viewResolutionBadge',optionNames[t.resolution_type] || t.resolution_type || '—');
  text('viewRefundAmount',t.approved_amount == null ? 'Chưa duyệt' : Number(t.approved_amount).toLocaleString('vi-VN')+' đ');
  show('managerApprovalPanel',t.status==='waiting_manager_approval');
  show('btnReopenTicket',finished(t)); show('btnCloseComplaint',t.status==='resolved');
  ['btnAssignHandler','btnRequestMoreInfo','btnOpenResolveModal','btnSubmitReply'].forEach(id=>{if($(id))$(id).disabled=finished(t);});
  show('btnCompleteComplaint',t.status==='processing' && Boolean(t.resolved_by) && Boolean(t.resolution_type));
  show('btnLinkComplaintSource',!finished(t) && !t.bookingId && !t.orderId);
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
    return `<article class="complaint-history-entry"><strong>${escapeHtml(author)}</strong> <span>${escapeHtml(mod.formatDateTime(m.created_at))} · ${m.is_internal?'Nội bộ':'Trao đổi'}</span><p>${escapeHtml(m.content)}</p></article>`;
   }).join('') || 'Chưa có lịch sử trao đổi.';
   const attachments=await readDetailResource(t,'attachments',async()=>{
    const attachments=[];
   for(let i=0;i<messages.length;i+=100){
    const {data,error}=await client().from('support_ticket_message_attachment').select('file_url,file_name').in('message_id',messages.slice(i,i+100).map(m=>m.id)).order('id');
    if(error)throw error;attachments.push(...data);
   }
    return attachments;
   });
   if(version!==renderVersion)return;
   $('complaintAttachments').innerHTML=attachments.filter(a=>{try{return new URL(a.file_url).protocol==='https:';}catch{return false;}}).map(a=>`<p><a href="${escapeHtml(a.file_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(a.file_name || 'Tệp đính kèm')}</a></p>`).join('') || 'Chưa có tệp đính kèm.';
   const audit={data:await readDetailResource(t,'audit',()=>readAll(()=>client().from('audit_log').select('id,description,created_at').eq('entity_id',t.rawId).eq('action','COMPLAINT_ACTION').order('created_at',{ascending:false}).order('id',{ascending:false})))};
   if(version!==renderVersion)return;
   const events=(audit.data || []).flatMap(a=>{try{return [JSON.parse(a.description)];}catch{return [];}});
   const proposal=events.find(e=>e.action==='propose');
   text('viewProposedAmount',proposal?Number(proposal.details.amount || 0).toLocaleString('vi-VN')+' đ':'Chưa có đề xuất có thể duyệt');
   text('complaintLinkedResults',audit.error?'Không tải được kết quả liên kết.':audit.data.flatMap(a=>{try{const d=JSON.parse(a.description);return d.action==='complete'?[`${mod.formatDateTime(a.created_at)} · ${d.details.evidence_id}${d.details.replacement_order_id?' · Đơn đổi mới: '+d.details.replacement_order_id:''}${d.details.return_request_id?' · Hàng trả: '+d.details.return_request_id:''}`]:[];}catch{return [];}}).join('\n') || 'Chưa liên kết kết quả thực hiện.');
   await renderEvidence(t,version);
  } catch(error) {if(version===renderVersion)text('viewTicketTimeline','Không tải được lịch sử: '+error.message);}
 }
 async function renderEvidence(t,version) {
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
 function openRequestMoreInfoModal(){if(captureModal('requestMoreInfoModalOverlay')){$('inputRequestMessage').value='';text('requestMoreInfoModalOverlayError','');}}
 function resolutionVisibility(){
  const option=$('selectResolveOption').value;
  show('complaintAmountGroup',['refund','rma_refund'].includes(option));
  text('complaintResolutionHint',['explain','reject'].includes(option)?'Lưu kết quả giải quyết kèm lý do.':'Đề xuất cần quản trị duyệt. Thực hiện tại Bán hàng hoặc Dịch vụ rồi liên kết kết quả thực tế.');
 }
 function bindEvidence(prefix,rows){
  const input=$(prefix+'Search'),selected=$(prefix+'Id'),dropdown=$(prefix+'Dropdown');
  input.value='';selected.value='';dropdown.style.display='none';
  const render=()=>{selected.value='';dropdown.innerHTML=rows.filter(r=>r.label.toLocaleLowerCase().includes(input.value.toLocaleLowerCase())).slice(0,30).map(r=>`<button type="button" class="customer-autocomplete-item" data-id="${r.id}">${escapeHtml(r.label)}</button>`).join('') || 'Chưa có kết quả phù hợp.';dropdown.style.display='block';dropdown.querySelectorAll('[data-id]').forEach(b=>b.onclick=()=>{selected.value=b.dataset.id;input.value=b.textContent;dropdown.style.display='none';});};
  input.oninput=render;input.onfocus=render;input.onblur=()=>setTimeout(()=>dropdown.style.display='none',150);
 }
 async function openResolveModal(mode='resolve'){
  const modal=captureModal('resolveTicketModalOverlay');if(!modal)return;
  const t=current();modal.dataset.mode=mode;
  $('inputResolveNote').value='';$('inputResolveAmount').value='';$('selectResolveOption').value='explain';text('resolveTicketModalOverlayError','');
  show('complaintOptionGroup',mode==='resolve');show('complaintEvidenceGroup',['complete','link_source'].includes(mode));show('complaintReplacementGroup',mode==='complete' && ['rma_exchange','rma_refund'].includes(t.resolution_type));
  text('complaintReplacementLabel',t.resolution_type==='rma_refund'?'Yêu cầu trả hàng đã nhận':'Đơn hàng đổi mới đã giao');
  show('complaintAmountGroup',false);
  text('complaintResolutionTitle',({resolve:'Phương án xử lý',complete:'Liên kết kết quả thực hiện',close:'Đóng phiếu',reopen:'Mở lại phiếu',link_source:'Liên kết giao dịch'})[mode]);
  text('btnConfirmResolveTicket',mode==='resolve'?'Lưu phương án':'Xác nhận');
  text('complaintResolutionHint',mode==='complete'?'Chỉ chọn kết quả đã hoàn tất, thuộc đúng khách và giao dịch liên quan.':'Nhập lý do để lưu vào lịch sử xử lý.');
  if(mode==='resolve')resolutionVisibility();
  if(mode==='link_source'){
   const isOrder=mod.state.orderComplaints.some(c=>c.rawId===t.rawId);modal.dataset.sourceKind=isOrder?'order':'service';
   bindEvidence('complaintEvidence',(isOrder?mod.state.cachedOrders:mod.state.cachedAppointments).filter(r=>r.customer_id===t.customerId).map(r=>({id:r.id,label:r.order_code || r.appointment_code})));return;
  }
  if(mode!=='complete')return;
  $('complaintEvidenceSearch').disabled=true;
  $('complaintEvidenceId').value='';$('complaintEvidenceSearch').value='';
  $('complaintEvidenceDropdown').style.display='none';
  try{
   let rows=[];
   const readAll=async(build)=>{const rows=[];for(let i=0;;i+=500){const {data,error}=await build().range(i,i+499);if(error)throw error;rows.push(...data);if(data.length<500)return rows;}};
   if(['refund','rma_refund'].includes(t.resolution_type)){
    const data=await readAll(()=>client().from('refund_transaction').select('id,refund_code,refunded_amount,payment:payment_id!inner(customer_id,order_id,appointment_id)').eq('refund_status','succeeded').eq('payment.customer_id',t.customerId).order('id'));
    rows=data.map(r=>({id:r.id,label:`${r.refund_code} · ${Number(r.refunded_amount).toLocaleString('vi-VN')} đ`}));
    if(t.resolution_type==='rma_refund'){
     const order=mod.state.cachedOrders.find(o=>o.order_code===t.orderId || o.id===t.orderId);
     const returns=await readAll(()=>client().from('return_request').select('id,reason').eq('sales_order_id',order.id).eq('request_status','received').order('id'));
     bindEvidence('complaintReplacement',returns.map(r=>({id:r.id,label:r.reason+' · '+r.id})));
    }
   }else if(t.resolution_type==='rma_exchange'){
    const order=mod.state.cachedOrders.find(o=>o.order_code===t.orderId || o.id===t.orderId);
    const data=await readAll(()=>client().from('return_request').select('id,reason').eq('sales_order_id',order.id).eq('request_status','received').order('id'));
    rows=data.map(r=>({id:r.id,label:r.reason+' · '+r.id}));
    bindEvidence('complaintReplacement',mod.state.cachedOrders.filter(o=>o.customer_id===t.customerId && o.id!==order.id && ['delivered','completed'].includes(o.order_status)).map(o=>({id:o.id,label:o.order_code})));
   }else{
    const original=mod.state.cachedAppointments.find(a=>a.appointment_code===t.bookingId || a.id===t.bookingId);
    rows=mod.state.cachedAppointments.filter(a=>a.customer_id===t.customerId && (a.id!==original?.id || t.resolution_type==='change_staff') && a.pet_id===original?.pet_id && a.appointment_status==='completed').map(a=>({id:a.id,label:a.appointment_code+' · '+mod.formatDateTime(a.scheduled_start_at)}));
   }
   if(modal.dataset.ticketId!==t.rawId)return;bindEvidence('complaintEvidence',rows);
  }catch(error){text('resolveTicketModalOverlayError','Không tải được kết quả: '+error.message);}
  finally{$('complaintEvidenceSearch').disabled=false;}
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
   if(mode==='resolve'){action=['explain','reject'].includes(option)?'resolve':'propose';details.option=option;details.amount=['refund','rma_refund'].includes(option)?Number($('inputResolveAmount').value):0;}
   if(mode==='complete'){details.evidence_id=$('complaintEvidenceId').value || null;if(current().resolution_type==='rma_exchange')details.replacement_order_id=$('complaintReplacementId').value || null;if(current().resolution_type==='rma_refund')details.return_request_id=$('complaintReplacementId').value || null;}
   if(mode==='link_source'){details.evidence_id=$('complaintEvidenceId').value || null;details.source_kind=modal.dataset.sourceKind;}
   return act(action,details,$('btnConfirmResolveTicket'),modal);
  });
  bind('btnConfirmAssignHandler',async()=>{
   const modal=$('assignHandlerModalOverlay'),button=$('btnConfirmAssignHandler'),staff=$('selectAssignStaff').value,note=$('inputAssignNote').value.trim();
   text('assignHandlerError','');if(!staff || note.length<2){text('assignHandlerError','Chọn nhân viên và nhập lý do.');return;}if(button.disabled)return;button.disabled=true;
   try{const {error}=await client().rpc('assign_admin_complaint',{p_request_id:modal.dataset.requestId,p_ticket_id:modal.dataset.ticketId,p_expected_updated_at:modal.dataset.version,p_staff_id:staff,p_note:note});if(error)throw error;await mod.loadComplaintsModuleData({force:true});modal.classList.remove('active');mod.showToast('Đã phân công xử lý.','success');}catch(error){text('assignHandlerError',mod.errorMessage(error));}finally{button.disabled=false;}
  });
  bind('btnSendRequestInfo',()=>act('request_info',{note:$('inputRequestMessage').value.trim(),channel:$('selectRequestChannel').value},$('btnSendRequestInfo'),$('requestMoreInfoModalOverlay')));
  bind('btnSubmitReply',async()=>{if(await act('message',{note:$('replyContentInput').value.trim(),internal:$('complaintInternalMessage').checked},$('btnSubmitReply')))$('replyContentInput').value='';});
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
