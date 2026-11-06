// Role-specific operations live in this domain; management initialization requires verified ADMIN.
(function(){
    'use strict';
    const allowed=()=>window.PawpalAdminAccess?.isStaff()&&PawpalAdminAccess.state.user.permissions.includes('work.chat.handle');
    const el=(tag,text,cls)=>{const node=document.createElement(tag);if(text!=null)node.textContent=text;if(cls)node.className=cls;return node;};
    async function rpc(name,args){const{data,error}=await getSupabaseClient().rpc(name,args);if(error)throw error;return data;}
    const pending=new Map();let dialog;
    function build(){
        if(dialog)return dialog;
        const overlay=el('div',null,'admin-modal-overlay staff-workspace-modal');overlay.id='staffChatResolutionModal';overlay.setAttribute('aria-hidden','true');const card=el('div',null,'admin-modal-card');card.setAttribute('role','dialog');card.setAttribute('aria-modal','true');card.setAttribute('aria-labelledby','staffChatResolutionTitle');const form=el('form');form.noValidate=true;form.setAttribute('onsubmit','return false;');
        const header=el('div',null,'workspace-modal-header'),title=el('h2','Kết thúc hội thoại'),close=el('button','Đóng','btn-modal-close');title.id='staffChatResolutionTitle';close.type='button';close.dataset.closeModal=overlay.id;header.append(title,close);const summary=el('p','','workspace-care-log-summary');summary.id='staffChatResolutionSummary';
        const reasonGroup=el('div',null,'workspace-form-field'),reasonLabel=el('label','Kết quả hỗ trợ '),reason=el('select',null,'admin-input');reason.id='staffChatResolutionReason';reason.required=true;reasonLabel.htmlFor=reason.id;reasonLabel.append(el('span','*','workspace-required'));for(const[value,text]of [['','Chọn kết quả'],['resolved_complete','Đã giải quyết'],['service_consulted','Đã tư vấn dịch vụ'],['order_tracked','Đã hỗ trợ đơn hàng'],['ticket_created','Đã tiếp nhận khiếu nại'],['customer_left','Khách đã rời hội thoại']])reason.append(new Option(text,value));reasonGroup.append(reasonLabel,reason);
        const noteGroup=el('div',null,'workspace-form-field'),noteLabel=el('label','Ghi chú nội bộ'),note=el('textarea',null,'admin-input');note.id='staffChatResolutionNote';noteLabel.htmlFor=note.id;note.rows=3;note.maxLength=8000;noteGroup.append(noteLabel,note);
        const surveyLabel=el('label',null,'workspace-intake-confirmation'),survey=el('input');survey.id='staffChatResolutionSurvey';survey.type='checkbox';surveyLabel.append(survey,el('span','Gửi lời mời đánh giá trong hội thoại'));
        const confirmLabel=el('label',null,'workspace-intake-confirmation'),confirm=el('input');confirm.id='staffChatResolutionConfirmed';confirm.type='checkbox';confirm.required=true;confirmLabel.append(confirm,el('span','Đã hoàn tất hỗ trợ và sẵn sàng kết thúc '),el('span','*','workspace-required'));
        const message=el('p','','workspace-error');message.setAttribute('role','alert');const footer=el('div',null,'workspace-modal-footer'),cancel=el('button','Hủy','admin-btn admin-btn-secondary'),save=el('button','Kết thúc hội thoại','admin-btn admin-btn-primary');save.id='staffChatResolutionSave';cancel.type=save.type='button';cancel.dataset.closeModal=overlay.id;footer.append(cancel,save);form.append(header,summary,reasonGroup,noteGroup,surveyLabel,confirmLabel,message,footer);card.append(form);overlay.append(card);document.body.append(overlay);
        const state={id:null,row:null,generation:0,loading:true,blocked:false,saving:false,unresolved:null,onSaved:null,returnFocus:null};const key=()=>PawpalAdminAccess.state.user.id+':'+state.id;
        for(const input of [reason,note,survey])input.addEventListener('input',()=>{confirm.checked=false;});
        function controls(){reason.disabled=note.disabled=survey.disabled=state.loading||state.blocked||state.saving||!!state.unresolved;confirm.disabled=save.disabled=state.loading||state.blocked||state.saving;save.textContent=state.saving?'Đang kết thúc':state.unresolved?'Đối chiếu kết quả':'Kết thúc hội thoại';}
        function closeDialog(){state.generation++;overlay.classList.remove('active');overlay.setAttribute('aria-hidden','true');if(state.returnFocus?.isConnected)state.returnFocus.focus();}
        overlay.addEventListener('click',event=>{if(event.target===overlay||event.target.closest('[data-close-modal="'+overlay.id+'"]'))closeDialog();});overlay.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();return;}if(event.key!=='Tab')return;const nodes=[...overlay.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(node=>node.offsetParent!==null),first=nodes[0],last=nodes.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}});form.addEventListener('submit',event=>event.preventDefault());
        async function receipt(attempt){const result=await rpc('get_staff_chat_receipt',{p_request_id:attempt.p_request_id});return result?.request_id===attempt.p_request_id&&result.conversation_id===attempt.p_conversation_id&&result.operation==='resolve';}
        save.onclick=async()=>{
            if(!allowed()||state.loading||state.blocked||state.saving)return;
            if(!state.unresolved&&!reason.value){message.textContent='Chọn kết quả hỗ trợ.';reason.focus();return;}if(!confirm.checked){message.textContent='Xác nhận đã hoàn tất hỗ trợ trước khi kết thúc.';confirm.focus();return;}
            const attempt=state.unresolved||{p_request_id:crypto.randomUUID(),p_conversation_id:state.id,p_expected_updated_at:state.row.updated_at,p_reason:reason.value,p_notes:note.value.trim(),p_send_survey:survey.checked},attemptKey=key(),generation=state.generation;pending.set(attemptKey,attempt);state.saving=true;controls();message.textContent='';
            const finish=()=>{pending.delete(attemptKey);if(generation!==state.generation)return;const callback=state.onSaved;closeDialog();if(allowed())callback?.();};
            try{if(state.unresolved&&await receipt(attempt)){finish();return;}const result=await rpc('resolve_admin_chat',attempt);if(result!==attempt.p_request_id)throw Error('invalid_resolution_result');finish();}
            catch(error){try{if(await receipt(attempt)){finish();return;}}catch{}if(generation!==state.generation)return;const definitive=['42501','22023','PT409'].includes(error.code);if(definitive)pending.delete(attemptKey);state.unresolved=definitive?null:attempt;state.blocked=definitive;confirm.checked=false;message.textContent=error.code==='42501'?'Hội thoại không còn do bạn xử lý. Đóng và tải lại.':error.code==='PT409'?'Hội thoại đã thay đổi. Đóng và mở lại để kiểm tra.':'Chưa xác nhận kết thúc thành công. Đối chiếu lại trước khi thử tiếp.';}
            finally{state.saving=false;if(generation===state.generation)controls();}
        };
        async function open({conversationId,onSaved}={}){
            if(state.saving||!allowed())return;state.id=conversationId;state.row=null;state.loading=true;state.blocked=false;state.unresolved=pending.get(key())||null;state.onSaved=onSaved;state.returnFocus=document.activeElement;const generation=++state.generation;form.reset();summary.textContent='';message.textContent='';controls();overlay.classList.add('active');overlay.setAttribute('aria-hidden','false');close.focus();
            try{if(state.unresolved&&await receipt(state.unresolved)){if(generation!==state.generation)return;pending.delete(key());state.blocked=true;state.loading=false;message.textContent='Hội thoại đã kết thúc thành công. Đóng và tải lại danh sách.';controls();state.onSaved?.();return;}
                const data=await rpc('get_staff_workspace',{p_kind:'conversations',p_query:'',p_id:conversationId,p_page:1});if(generation!==state.generation)return;const row=data.items.find(item=>item.id===conversationId&&item.status==='agent_handling');if(!row){state.blocked=true;message.textContent='Không tìm thấy hội thoại đang do bạn xử lý.';}else{state.row=row;summary.textContent=row.ai_summary||'Hội thoại đang do bạn hỗ trợ.';if(state.unresolved){reason.value=state.unresolved.p_reason;note.value=state.unresolved.p_notes;survey.checked=state.unresolved.p_send_survey;message.textContent='Lần kết thúc trước chưa rõ kết quả. Đối chiếu cùng yêu cầu trước khi thao tác mới.';}}state.loading=false;controls();
            }catch{if(generation===state.generation){state.blocked=true;message.textContent='Không tải đủ dữ liệu hội thoại. Đóng và mở lại để kiểm tra.';controls();}}
        }
        dialog={open,clear:()=>{closeDialog();pending.clear();state.row=state.unresolved=state.onSaved=null;form.reset();summary.textContent=message.textContent='';}};return dialog;
    }
    window.addEventListener('hashchange',()=>dialog?.clear());
    window.PawpalStaffChatResolution=Object.freeze({open:options=>{if(allowed())return build().open(options);},closeAll:()=>dialog?.clear()});
})();

;

// Role-scoped screens belong to this domain.
(function registerRoleViews(){
 const views=window.PawpalAdminViews;if(!views)return;const {date,money,status}=views.helpers;
 views.register("Chatbot",{columns:{conversations:[['Trạng thái', r => status(r.status)], ['Tóm tắt', 'ai_summary'], ['Cập nhật', r => date(r.updated_at)]],messages:[['Thời gian', r => date(r.created_at)], ['Người gửi', r => ({ staff: 'Nhân viên', customer: 'Khách hàng', bot: 'Trợ lý' })[r.sender_type] || 'Hệ thống'], ['Nội dung', 'content']],chat_queue:[['Thời gian', r => date(r.created_at)], ['Trạng thái', r => status(r.status)]]},
targets:{"conversations":"tab-live-support"},
render:async(ctx)=>{if(ctx.kind!=='conversations'||!ctx.id)return false;const {el,date,money,status,read,table,card,facts,go,root,kind,id,row,target,turn}=ctx;
                const conversations = await read('conversations', { id });
                if (!ctx.isCurrent()) return true;
                if (!conversations.length) { card(root).append(el('p', 'Không tìm thấy hội thoại được giao.')); return true; }
                const transcript=card(root,'Hội thoại được giao'),transcriptContent=el('div'),transcriptPager=el('nav',null,'workspace-pager');transcript.append(transcriptContent);transcriptPager.setAttribute('aria-label','Trang tin nhắn hội thoại');root.append(transcriptPager);let transcriptTurn=0;
                async function loadTranscript(page=1){const current=++transcriptTurn;transcriptContent.textContent='Đang tải';transcriptPager.replaceChildren();try{const rows=await read('messages',{id,page});if(!ctx.isCurrent()||current!==transcriptTurn)return true;transcriptContent.replaceChildren();table('messages',rows,transcriptContent);for(const[label,next]of [['<',page-1],[String(page),page],['>',page+1]]){const button=el('button',label,next===page?'active':'');button.type='button';button.disabled=next<1||next>page&&rows.length<10;button.onclick=()=>loadTranscript(next);transcriptPager.append(button);}}catch(error){if(ctx.isCurrent()&&current===transcriptTurn){transcriptContent.replaceChildren(el('p',error.message,'workspace-error'));transcriptPager.replaceChildren();}}}
                await loadTranscript();if(!ctx.isCurrent())return true;
                if (conversations[0].status === 'agent_handling') {
                    const composer = card(root), form = el('form', null, 'workspace-chat-composer'); form.setAttribute('onsubmit', 'return false;');
                    const label = el('label', 'Tin nhắn trả lời'), input = el('textarea', null, 'admin-input'), send = el('button', 'Gửi tin nhắn', 'admin-btn admin-btn-primary');
                    input.id = 'staffChatReply'; input.maxLength = 8000; input.rows = 3; input.required = true; label.htmlFor = input.id; send.type = 'button';
                    const star = el('span', ' *'); star.style.color = '#DC2626'; label.append(star);
                    const message = el('p', '', 'workspace-error'); message.setAttribute('role', 'alert');
                    const mode=el('select',null,'admin-input');mode.id='staffChatMode';mode.setAttribute('aria-label','Hình thức trao đổi');mode.append(new Option('Trả lời khách','send'),new Option('Ghi chú nội bộ','note'));const drafts={send:'',note:conversations[0].internal_note||''};let previousMode='send';
                    mode.onchange=()=>{drafts[previousMode]=input.value;previousMode=mode.value;input.value=drafts[mode.value];label.replaceChildren(el('span',mode.value==='note'?'Ghi chú nội bộ':'Tin nhắn trả lời'));if(mode.value==='send')label.append(star);input.required=mode.value==='send';send.textContent=mode.value==='note'?'Lưu ghi chú':'Gửi tin nhắn';message.textContent='';};
                    let pendingSend = null;
                    const submit = async () => {
                        if (send.disabled) return true;
                        const text = input.value.trim(); if (mode.value==='send'&&!text || text.length > 8000) { message.textContent = mode.value==='send'?'Nhập tin nhắn từ 1 đến 8000 ký tự.':'Ghi chú tối đa 8000 ký tự.'; input.focus(); return true; }
                        if (!pendingSend || pendingSend.p_content !== text || pendingSend.p_action!==mode.value) pendingSend = { p_request_id: crypto.randomUUID(), p_conversation_id: id,
                            p_expected_updated_at: conversations[0].updated_at, p_action: mode.value, p_content: text };
                        send.disabled = true;mode.disabled=input.disabled=true;message.textContent = '';
                        try {
                            const { error } = await window.getSupabaseClient().rpc('act_admin_chat', pendingSend);
                            if (error) throw error;
                            input.value = ''; pendingSend = null;
                            if (ctx.isCurrent()) await ctx.refresh();
                        } catch (error) {
                            try{const{data}=await getSupabaseClient().rpc('get_staff_chat_receipt',{p_request_id:pendingSend.p_request_id});if(data?.conversation_id===id&&data.operation===pendingSend.p_action){if(ctx.isCurrent())await ctx.refresh();return true;}}catch{}
                            message.textContent = error.code === '42501' ? 'Bạn không có quyền xử lý hội thoại này.' : error.code === 'PT409' ? 'Hội thoại đã thay đổi. Vui lòng tải lại.' : 'Chưa xác nhận gửi thành công. Giữ nguyên nội dung và thử lại.';
                            if(!['42501','PT409','22023'].includes(error.code)){mode.disabled=input.disabled=true;send.textContent='Thử lại nội dung';return true;}
                        } finally { send.disabled = false;if(mode.disabled&&!pendingSend){mode.disabled=input.disabled=false;} }
                    };
                    send.onclick = submit; form.addEventListener('submit', event => { event.preventDefault(); submit(); });
                    form.append(mode,label, input, message, send); composer.append(form);
                    const resolve=el('button','Kết thúc hội thoại','admin-btn admin-btn-secondary');resolve.type='button';resolve.onclick=()=>window.PawpalStaffChatResolution.open({conversationId:id,onSaved:()=>go('tab-support-queue')});composer.append(resolve);
                    if(PawpalAdminAccess.state.user.permissions.includes('work.complaint.handle')){const complaint=el('button','Tạo khiếu nại','admin-btn admin-btn-secondary');complaint.type='button';complaint.onclick=()=>PawpalStaffComplaintCreate.open({conversationId:id});composer.append(complaint);}
                }
                return true;return true;},
rowActions:{chat_queue:{enabled:()=>PawpalAdminAccess.state.user.permissions.includes('work.chat.handle'),render:(ctx)=>{const {el,go,read,kind,row,options}=ctx;
                const cell=el('td'),menu=el('details',null,'workspace-item-menu'),toggle=el('summary','•••'),take=el('button','Tiếp nhận','workspace-item-action'),message=el('p','','workspace-error');toggle.setAttribute('aria-label','Tác vụ tiếp nhận hội thoại');take.type='button';message.setAttribute('role','alert');
                take.onclick=async()=>{if(take.disabled)return;menu.open=false;take.disabled=true;message.textContent='';const requestId=crypto.randomUUID();
                    const finish=()=>go('tab-live-support',row.id);
                    try{const{data,error}=await getSupabaseClient().rpc('act_admin_chat',{p_request_id:requestId,p_conversation_id:row.id,p_expected_updated_at:row.updated_at,p_action:'take',p_content:''});if(error)throw error;if(data!==requestId)throw Error('invalid_chat_take');finish();}
                    catch(error){try{const{data}=await getSupabaseClient().rpc('get_staff_chat_receipt',{p_request_id:requestId});if(data?.request_id===requestId&&data.conversation_id===row.id&&data.operation==='take'){finish();return;}}catch{}message.textContent=['42501','PT409'].includes(error.code)?'Hội thoại đã thay đổi hoặc có người tiếp nhận. Tải lại hàng chờ.':'Chưa xác nhận tiếp nhận thành công. Tải lại danh sách để kiểm tra.';}
                    finally{take.disabled=false;}
                };menu.append(toggle,take);cell.append(menu,message);return cell;}}}});
})();

(function initializeManagementDomain(){
    if (!window.PawpalAdminAccess?.isAdmin()) return;
/**
 * MODULE CHATBOT VÀ TRỰC CHAT CSKH (PAWPAL ADMIN) - CORE ORCHESTRATOR
 * Tuân thủ nghiêm ngặt 100% AGENTS.md:
 * - 3 Subtabs Header Bar: Trực chat | Trợ lý AI | Quy định
 * - 100% Supabase Live Database - Zero JSON mock & Zero fallback dữ liệu tĩnh
 * - Header Subtabs đồng bộ URL hash & sessionStorage
 * - Deep Breadcrumb cấp con khi đang xem hội thoại khách hàng: / [Tên khách hàng]
 * - Điều phối trạng thái dùng chung (state) và nạp dữ liệu cho 3 subtabs:
 *   1. subtabs/tab-chatbot-live.js (Trực chat CSKH 3 khu vực & SLA)
 *   2. subtabs/tab-chatbot-copilot.js (Trợ lý AI Gemini & RAG)
 *   3. subtabs/tab-chatbot-rules.js (Quy định & Màng lọc Toxic Shield)
 */

(function initChatbotModule() {
    'use strict';

    // Khởi tạo namespace hệ thống
    const PawpalChatbot = window.PawpalChatbot = window.PawpalChatbot || {};
    window.PawpalChatbotModule = PawpalChatbot;
    PawpalChatbot.subtabs = PawpalChatbot.subtabs || {};

    // Helper định dạng thời gian chuẩn hóa
    const formatDateTime = window.formatDateTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')} ${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    const formatDate = window.formatDate || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
    };

    const formatTime = window.formatTime || function(d) {
        if (!d) return '—';
        const dateObj = new Date(d);
        if (isNaN(dateObj.getTime())) return String(d);
        return `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
    };

    PawpalChatbot.formatDateTime = formatDateTime;
    PawpalChatbot.formatDate = formatDate;
    PawpalChatbot.formatTime = formatTime;

    console.log('Khởi tạo Core Orchestrator Chatbot & Trực chat (100% Supabase Live Database)...');

    // Khởi tạo Supabase Client
    const supabase = (typeof window.getSupabaseClient === 'function') 
        ? window.getSupabaseClient() 
        : (window.SupabaseClient || (typeof createClient === 'function' ? createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY) : null));

    PawpalChatbot.supabase = supabase;

    // Helper: Toast Notification chuẩn AGENTS.md
    function showToast(message, type = 'info') {
        let container = document.getElementById('adminToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'adminToastContainer';
            container.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 999999; display: flex; flex-direction: column; gap: 8px; pointer-events: none;';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        const bgColors = {
            success: '#DCEEE2',
            warning: '#F5E8D3',
            danger: '#F7DCDC',
            info: '#DCEAF2'
        };
        const textColors = {
            success: '#165335',
            warning: '#734718',
            danger: '#8F2424',
            info: '#20495E'
        };

        const bg = bgColors[type] || bgColors.info;
        const color = textColors[type] || textColors.info;

        toast.style.cssText = `
            background: ${bg};
            color: ${color};
            padding: 10px 16px;
            border-radius: 9px;
            font-size: 13px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            pointer-events: auto;
            transition: opacity 0.25s ease, transform 0.25s ease;
            opacity: 0;
            transform: translateY(-8px);
            max-width: 380px;
            line-height: 1.45;
            white-space: pre-line;
        `;
        toast.textContent = message;

        container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(-8px)';
            setTimeout(() => toast.remove(), 250);
        }, 3500);
    }
    PawpalChatbot.showToast = showToast;

    // Helper: Modal xác nhận thao tác chuẩn AGENTS.md
    function showChatbotConfirmModal({ title = 'Xác nhận thao tác', message, onConfirm, onCancel, confirmText = 'Đồng ý', isDanger = false }) {
        const modal = document.getElementById('modalConfirmChatbotAction');
        const titleEl = document.getElementById('confirmChatbotActionTitle');
        const msgEl = document.getElementById('confirmChatbotActionMessage');
        const btnAccept = document.getElementById('btnAcceptChatbotConfirm');
        const btnCancel = document.getElementById('btnCancelChatbotConfirm');
        const btnClose = document.getElementById('btnCloseConfirmChatbotModal');

        if (!modal) {
            if (window.confirm(message)) {
                if (typeof onConfirm === 'function') onConfirm();
            } else {
                if (typeof onCancel === 'function') onCancel();
            }
            return;
        }

        if (titleEl) titleEl.textContent = title;
        if (msgEl) msgEl.textContent = message;
        if (btnAccept) {
            btnAccept.textContent = confirmText;
            if (isDanger) {
                btnAccept.style.backgroundColor = '#DC2626';
                btnAccept.style.color = '#FFFFFF';
            } else {
                btnAccept.style.backgroundColor = '';
                btnAccept.style.color = '';
            }
        }

        const cleanup = () => {
            modal.classList.remove('active');
            modal.style.display = 'none';
            if (btnAccept) btnAccept.onclick = null;
            if (btnCancel) btnCancel.onclick = null;
            if (btnClose) btnClose.onclick = null;
        };

        if (btnAccept) {
            btnAccept.onclick = () => {
                cleanup();
                if (typeof onConfirm === 'function') onConfirm();
            };
        }

        if (btnCancel) {
            btnCancel.onclick = () => {
                cleanup();
                if (typeof onCancel === 'function') onCancel();
            };
        }

        if (btnClose) {
            btnClose.onclick = () => {
                cleanup();
                if (typeof onCancel === 'function') onCancel();
            };
        }

        openModal('modalConfirmChatbotAction');
    }
    PawpalChatbot.showConfirmModal = showChatbotConfirmModal;
    PawpalChatbot.showChatbotConfirmModal = showChatbotConfirmModal;

    function openChatbotConfirmModal(title, message, onConfirm, isDanger = true) {
        if (typeof title === 'object' && title !== null) {
            showChatbotConfirmModal(title);
        } else {
            showChatbotConfirmModal({
                title: title || 'Xác nhận thao tác',
                message: message || 'Bạn có chắc chắn muốn thực hiện thao tác này không?',
                onConfirm: onConfirm,
                isDanger: isDanger
            });
        }
    }
    PawpalChatbot.openConfirmModal = openChatbotConfirmModal;

    // Helper: Lightbox xem ảnh đính kèm toàn màn hình
    function openAdminImageLightbox(src, caption = '') {
        const overlay = document.getElementById('modalAdminImageLightbox');
        const imgEl = document.getElementById('imgAdminLightboxPreview');
        const captionEl = document.getElementById('captionAdminLightbox');
        const btnClose = document.getElementById('btnCloseAdminLightbox');

        if (!overlay || !imgEl) return;
        imgEl.src = src;
        if (captionEl) captionEl.textContent = caption || '';
        overlay.classList.add('active');
        overlay.style.display = 'flex';

        const closeLb = () => {
            overlay.classList.remove('active');
            overlay.style.display = 'none';
        };
        if (btnClose) btnClose.onclick = closeLb;
        overlay.onclick = (e) => {
            if (e.target === overlay) closeLb();
        };
    }
    PawpalChatbot.openImageLightbox = openAdminImageLightbox;

    // -------------------------------------------------------------
    // QUẢN LÝ TRẠNG THÁI CHUNG (GLOBAL STATE)
    // -------------------------------------------------------------
    PawpalChatbot.state = {
        liveConversations: [],
        currentConversation: null,
        currentFilterTab: sessionStorage.getItem('pawpal_admin_chatbot_filter_tab') || 'all',
        pendingAdminAttachment: null,
        currentAdminRoomChannel: null,
        isRealtimeHealthy: false,
        liveLoaded: false,
        liveLoadError: null
    };

    // -------------------------------------------------------------
    // PR-02: KIẾN TRÚC 2-TIER NẠP INBOX VÀ CHI TIẾT THEO YÊU CẦU
    // -------------------------------------------------------------
    let chatbotRealtimeChannel = null;
    let isInboxRefreshing = false;
    let hasPendingRefresh = false;
    let inboxDebounceTimer = null;
    const customerContextCache = new Map();
    const customerContextRequests = new Map();
    let customerContextSequence=0;

    function invalidateCustomerCache(customerId) {
        if (customerId) {customerContextCache.delete(customerId);customerContextRequests.delete(customerId);}
    }
    PawpalChatbot.invalidateCustomerCache = invalidateCustomerCache;

    // TIER 1: Tải tóm tắt danh sách hội thoại nhẹ (không join 8 bảng, không lấy raw_content)
    const inboxPages=new Map(),inboxRequests=new Map();
    let inboxVersion=0;
    async function loadInboxSummary(options = {}) {
        const limit = options.limit || 50;

        if (!supabase) {
            PawpalChatbot.state.liveLoadError = 'Không thể kết nối dữ liệu hội thoại.';
            PawpalChatbot.subtabs.live?.renderConversationsList?.();
            PawpalChatbot.subtabs.live?.renderCurrentChat?.();
            console.warn('[Chatbot] Supabase Client chưa khả dụng.');
            return;
        }

        const version=++inboxVersion;
        try {
            // 1. Chỉ lấy các cột cần thiết từ chat_conversation (không join chat_message(*) toàn bộ)
            const args={p_query:(document.getElementById('inboxSearchInput')?.value||'').trim(),p_filter:PawpalChatbot.state.currentFilterTab||'all',p_page:options.page||PawpalChatbot.state.inboxPage?.page||1};
            const key=JSON.stringify(args);
            if(!options.page)inboxPages.clear();
            PawpalChatbot.state.liveLoaded=false;PawpalChatbot.state.liveLoadError=null;
            PawpalChatbot.subtabs.live?.renderConversationsList?.();
            let payload=inboxPages.get(key);
            if(!payload || Date.now()-payload.at>30000){
                if(!inboxRequests.has(key))inboxRequests.set(key,supabase.rpc('get_admin_chat_inbox_view',args).then(result=>{if(result.error)throw result.error;return result.data;}).finally(()=>inboxRequests.delete(key)));
                payload={at:Date.now(),data:await inboxRequests.get(key)};
                if(inboxPages.size>=20)inboxPages.delete(inboxPages.keys().next().value);inboxPages.set(key,payload);
            }
            if(version!==inboxVersion)return;
            PawpalChatbot.state.inboxPage=payload.data;
            const dbConvs=payload.data.rows||[];
            PawpalChatbot.state.liveLoadError = null;

            if (!dbConvs || dbConvs.length === 0) {
                PawpalChatbot.state.liveConversations = [];
                PawpalChatbot.state.currentConversation = null;
                updateFilterBadges();
                PawpalChatbot.state.liveLoaded = true;
                PawpalChatbot.subtabs.live?.renderConversationsList?.();
                PawpalChatbot.subtabs.live?.renderCurrentChat?.();
                updateDeepBreadcrumb();
                return;
            }

            // Customer labels arrive in the same caller-scoped, bounded RPC.
            const profMap = {}, custMap = {};
            for(const row of dbConvs){if(row.customer_id){
                profMap[row.customer_id]={full_name:row.customer_profile?.full_name};
                custMap[row.customer_id]={email:row.customer_profile?.email,phone_main:row.customer_profile?.phone};
            }}
            const recentMsgsRes={data:dbConvs.map(c=>c.latest_message).filter(Boolean)};

            const latestMsgMap = {};
            (recentMsgsRes.data || []).forEach(m => {
                if (!latestMsgMap[m.conversation_id]) {
                    latestMsgMap[m.conversation_id] = m;
                }
            });

            // 3. Xây dựng danh sách hội thoại nhẹ Tier 1
            const realConvList = dbConvs.map(rc => {
                const prof = profMap[rc.customer_id] || {};
                const cust = custMap[rc.customer_id] || {};
                const latestMsg = latestMsgMap[rc.id];

                const custName = prof.full_name

                    || cust.email?.split('@')[0]
                    || (rc.customer_id ? `Khách #${rc.customer_id.slice(0, 5)}` : `Khách #${rc.id.slice(0, 5)}`);

                // CB-25: Không bịa số điện thoại giả, lấy chính xác phone_main từ bảng customer
                const phone = cust.phone_main || (rc.customer_id ? '—' : 'Khách vãng lai');
                const sLevel = rc.sentiment_level || 2;
                const sText = sLevel === 6 ? 'Mức độ 6: Khẩn cấp y tế' : (sLevel === 5 ? 'Mức độ 5: Mất kiểm soát' : (sLevel === 4 ? 'Mức độ 4: Tức giận cao độ' : (sLevel === 3 ? 'Mức độ 3: Thất vọng' : 'Mức độ 2: Trung tính')));

                const elapsedSec = Math.max(0, Math.floor((Date.now() - new Date(rc.updated_at || rc.created_at).getTime()) / 1000));
                const isHandover = Boolean(rc.assigned_staff_id) || rc.status === 'agent_handling';
                const isUrgent = Boolean(rc.is_urgent || sLevel >= 4);

                let cat = 'all';
                if (['resolved','closed','completed'].includes(rc.status)) cat = 'resolved';
                else if (isUrgent) cat = 'urgent';
                else if (isHandover) cat = 'active';

                // Nếu hội thoại đã có tin nhắn được nạp trước đó trong state, giữ lại để không bị chớp giật
                const existingConv = (PawpalChatbot.state.liveConversations || []).find(c => c.id === rc.id);

                const messages = existingConv && existingConv.messagesLoaded
                    ? existingConv.messages
                    : (latestMsg ? [{
                        id: latestMsg.id,
                        sender: ['customer','guest'].includes(latestMsg.sender_type) ? 'user' : (latestMsg.sender_type === 'staff' ? 'agent' : (latestMsg.sender_type === 'system' ? 'system' : 'bot')),
                        agentName: (latestMsg.sender_type === 'system' ? 'Hệ thống' : latestMsg.sender_type === 'staff' ? 'Chuyên viên CSKH' : 'PawPal Bot'),
                        time: new Date(latestMsg.created_at).toLocaleTimeString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }),
                        text: latestMsg.content || '',
                        isToxic: !!latestMsg.is_toxic,
                        activeMaskLevel: latestMsg.is_toxic ? 'words' : 'raw'
                    }] : []);

                return {
                    id: rc.id,
                    updatedAtRaw: rc.updated_at,
                    assignedStaffId: rc.assigned_staff_id,
                    status: rc.status,
                    slaDeadline: rc.sla_deadline,
                    isRealDb: true,
                    customerId: rc.customer_id,
                    customerName: custName,
                    phone: phone,
                    tier: existingConv?.tier || (rc.customer_id ? 'Thành viên' : 'Vãng lai'),
                    pawpoints: existingConv?.pawpoints ?? null,
                    contextError: existingConv?.contextError || false,
                    contextAt: existingConv?.contextAt || 0,
                    petsHasMore: existingConv?.petsHasMore || false,
                    ticketsHasMore: existingConv?.ticketsHasMore || false,
                    unreadCount: isUrgent ? 1 : 0,
                    updatedAt: new Date(rc.updated_at || rc.created_at).toLocaleTimeString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }),
                    sentimentLevel: sLevel,
                    sentimentText: sText,
                    sentimentTrend: rc.sentiment_trend || 'stable',
                    isVipAttention: Boolean(rc.ai_summary && rc.ai_summary.includes('VIP')) || (sLevel >= 4),
                    isHandover: isHandover,
                    isUrgent: isUrgent,
                    waitingSeconds: isHandover ? 0 : Math.min(elapsedSec, 999),
                    category: cat,
                    aiSummary: rc.ai_summary || 'Chưa có tóm tắt.',
                    internalNotes: rc.internal_note || '',
                    recentOrder: existingConv?.recentOrder || null,
                    recentBooking: existingConv?.recentBooking || null,
                    openTickets: existingConv?.openTickets || [],
                    pets: existingConv?.pets || [],
                    smartResponses: [],
                    messages: messages,
                    messagesLoaded: Boolean(existingConv?.messagesLoaded),
                    contextLoaded: Boolean(existingConv?.contextLoaded)
                };
            });

            if(version!==inboxVersion)return;
            PawpalChatbot.state.liveConversations = realConvList;

            // Đồng bộ conversation đang chọn
            const savedConvId = sessionStorage.getItem('pawpal_admin_chatbot_conv_id');
            const targetConv = (savedConvId && realConvList.find(c => c.id === savedConvId))
                || null;

            PawpalChatbot.state.currentConversation = targetConv;
            if (targetConv) {
                sessionStorage.setItem('pawpal_admin_chatbot_conv_id', targetConv.id);
                // Kích hoạt nạp chi tiết Tier 2 theo yêu cầu
                await loadConversationDetails(targetConv);
            }

            if(version!==inboxVersion)return;
            updateFilterBadges();
            PawpalChatbot.state.liveLoaded = true;
            PawpalChatbot.subtabs.live?.renderConversationsList?.();
            PawpalChatbot.subtabs.live?.renderCurrentChat?.();
            updateDeepBreadcrumb();

        } catch (err) {
            if(version!==inboxVersion)return;
            PawpalChatbot.state.liveLoadError = 'Không thể tải hội thoại. Vui lòng tải lại trang.';
            PawpalChatbot.subtabs.live?.renderConversationsList?.();
            PawpalChatbot.subtabs.live?.renderCurrentChat?.();
            console.error('[Chatbot] Lỗi nạp dữ liệu Inbox tóm tắt:', err);
        }
    }

    // TIER 2: Nạp tin nhắn đầy đủ (30 tin gần nhất) theo phiên hội thoại
    async function loadConversationMessages(convId, options = {}) {
        if (!supabase || !convId) throw Error('chat_client_unavailable');
        try {
            const {data,error}=await supabase.rpc('get_admin_chat_messages_bounded',{p_conversation:convId,p_before_at:options.beforeCreatedAt||null,p_before_id:options.beforeId||null});
            if (error) throw error;
            if(!data||!Array.isArray(data.messages)||typeof data.hasMore!=='boolean')throw Error('invalid_chat_message_page');
            const sorted = data.messages.slice().reverse();
            return {hasMore:data.hasMore,messages:sorted.map(m => ({
                id: m.id,
                createdAtRaw: m.created_at,
                sender: ['customer','guest'].includes(m.sender_type) ? 'user' : (m.sender_type === 'staff' ? 'agent' : (m.sender_type === 'system' ? 'system' : 'bot')),
                agentName: (m.sender_type === 'system' ? 'Hệ thống' : m.sender_type === 'staff' ? (m.staff_name || 'Nhân viên') : 'PawPal Bot'),
                time: new Date(m.created_at).toLocaleTimeString('vi-VN', {timeZone:'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' }),
                text: m.content || '',
                contentPartial:Boolean(m.content_partial),contentOffset:m.content_offset,contentRevision:m.content_revision,
                isToxic: !!m.is_toxic,
                activeMaskLevel: m.is_toxic ? 'words' : 'raw'
            }))};
        } catch (err) {
            console.error('[Chatbot] Lỗi nạp tin nhắn phiên:', err);
            throw err;
        }
    }

    // TIER 2: Nạp ngữ cảnh hồ sơ khách hàng (đơn hàng, lịch hẹn, ticket, thú cưng, điểm thưởng)
    async function loadCustomerContext(customerId) {
        if (!supabase || !customerId || customerId === 'guest') {
            return {
                pets: [],
                recentOrder: null,
                recentBooking: null,
                openTickets: [],
                pawpoints: 0,
                tier: 'Vãng lai'
            };
        }

        const cached=customerContextCache.get(customerId);
        if(cached&&Date.now()-cached.at<30000)return cached.data;
        if(customerContextRequests.has(customerId))return customerContextRequests.get(customerId).promise;
        const sequence=++customerContextSequence;
        const request=(async()=>{try {
            const {data:ctx,error}=await supabase.rpc('get_admin_chat_customer_panel',{p_customer:customerId});
            if(error)throw error;
            if(!ctx||!Array.isArray(ctx.pets)||!Array.isArray(ctx.openTickets))throw Error('invalid_customer_panel');
            if(customerContextRequests.get(customerId)?.sequence!==sequence)return {pets:[],openTickets:[],pawpoints:null,tier:'Chưa tải được hạng',error:true};
            if(customerContextCache.size>=50)customerContextCache.delete(customerContextCache.keys().next().value);
            customerContextCache.set(customerId,{at:Date.now(),data:ctx});
            return ctx;
        } catch (err) {
            console.error('[Chatbot] Lỗi nạp ngữ cảnh khách hàng:', err);
            return {
                pets: [],
                recentOrder: null,
                recentBooking: null,
                openTickets: [],
                pawpoints: null,
                tier: 'Chưa tải được hạng',error:true
            };
        }finally{if(customerContextRequests.get(customerId)?.sequence===sequence)customerContextRequests.delete(customerId);}})();
        customerContextRequests.set(customerId,{sequence,promise:request});return request;
    }

    // Nạp đầy đủ thông tin chi tiết phiên được chọn (Tier 2 on-demand)
    async function loadConversationDetails(conv) {
        if (!conv) return;

        const tasks = [];
        if (!conv.messagesLoaded) {
            tasks.push(loadConversationMessages(conv.id, { limit: 30 }).then(page => {
                conv.messages = page.messages;
                conv.hasMoreMessages=page.hasMore;
                conv.messagesLoaded = true;
            }));
        }

        if ((!conv.contextLoaded || Date.now()-(conv.contextAt||0)>=30000) && conv.customerId) {
            const contextRequest=conv.contextRequest=(conv.contextRequest||0)+1;
            tasks.push(loadCustomerContext(conv.customerId).then(ctx => {
                if(conv.contextRequest!==contextRequest)return;
                conv.pets = ctx.pets;
                conv.petsHasMore=Boolean(ctx.petsHasMore);conv.ticketsHasMore=Boolean(ctx.ticketsHasMore);conv.contextError=Boolean(ctx.error);
                conv.recentOrder = ctx.recentOrder;
                conv.recentBooking = ctx.recentBooking;
                conv.openTickets = ctx.openTickets;
                conv.pawpoints = ctx.pawpoints;
                conv.tier = ctx.tier;
                conv.contextLoaded = !ctx.error;
                conv.contextAt = ctx.error?0:Date.now();
            }));
        }

        if (tasks.length > 0) {
            try { await Promise.all(tasks); } catch(error) {conv.messagesLoaded=false;conv.messages=[];console.warn('[Chatbot] Conversation details unavailable');}
            if (PawpalChatbot.state.currentConversation && PawpalChatbot.state.currentConversation.id === conv.id) {
                PawpalChatbot.subtabs.live?.renderCurrentChat?.();
                PawpalChatbot.subtabs.live?.renderCustomerInfoPanel?.();
            }
        }
    }

    // Debounce và In-flight Coalescing cho làm mới Inbox
    function refreshInboxDebounced(delay = 350) {
        if (inboxDebounceTimer) clearTimeout(inboxDebounceTimer);
        inboxDebounceTimer = setTimeout(async () => {
            if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Chatbot') {
                return;
            }
            if (isInboxRefreshing) {
                hasPendingRefresh = true;
                return;
            }
            isInboxRefreshing = true;
            try {
                await loadInboxSummary();
            } catch (err) {
                console.error('[Chatbot] Lỗi refreshInboxDebounced:', err);
            } finally {
                isInboxRefreshing = false;
                if (hasPendingRefresh) {
                    hasPendingRefresh = false;
                    refreshInboxDebounced(100);
                }
            }
        }, delay);
    }

    // Phơi bày ra namespace toàn cục
    PawpalChatbot.loadInboxSummary = loadInboxSummary;
    PawpalChatbot.loadChatbotDataFromSupabase = loadInboxSummary; // Tương thích ngược
    PawpalChatbot.loadConversationMessages = loadConversationMessages;
    PawpalChatbot.loadCustomerContext = loadCustomerContext;
    PawpalChatbot.loadConversationDetails = loadConversationDetails;
    PawpalChatbot.refreshInboxDebounced = refreshInboxDebounced;

    function updateFilterBadges() {
        const convs = PawpalChatbot.state.liveConversations || [];
        const urgentCount = PawpalChatbot.state.inboxPage?.counts?.urgent??convs.filter(c => c.category === 'urgent').length;
        const activeCount = PawpalChatbot.state.inboxPage?.counts?.active??convs.filter(c => c.isHandover).length;
        const allCount = PawpalChatbot.state.inboxPage?.counts?.all??convs.length;

        const elUrgent = document.getElementById('urgentBadgeCount');
        const elActive = document.getElementById('activeBadgeCount');
        const elAll = document.getElementById('allBadgeCount');

        if (elUrgent) elUrgent.textContent = urgentCount > 0 ? urgentCount : '0';
        if (elActive) elActive.textContent = activeCount > 0 ? activeCount : '0';
        if (elAll) elAll.textContent = allCount > 0 ? allCount : '0';
    }

    function updateDeepBreadcrumb() {
        const deepBreadcrumbEl = document.getElementById('headerDeepBreadcrumb');
        if (!deepBreadcrumbEl) return;
        const currentMod = sessionStorage.getItem('pawpal_admin_active_module');
        if (currentMod !== 'Chatbot') return; // Không can thiệp nếu người dùng đang ở phân hệ khác
        const activeTabId = sessionStorage.getItem('pawpal_admin_chatbot_subtab') || 'tab-live-support';

        if (activeTabId === 'tab-live-support' && PawpalChatbot.state.currentConversation) {
            deepBreadcrumbEl.innerHTML = `<span class="breadcrumb-separator">/</span> <span class="breadcrumb-target">${PawpalChatbot.state.currentConversation.customerName}</span>`;
        } else {
            deepBreadcrumbEl.innerHTML = '';
        }
    }

    // -------------------------------------------------------------
    // SUPABASE REALTIME CHANNEL SYNC (PR-02: THÔNG MINH, KHÔNG THRASHING)
    // -------------------------------------------------------------
    function setupChatbotRealtimeSync() {
        if (!supabase || typeof supabase.channel !== 'function') return;

        try {
            if (chatbotRealtimeChannel) {
                try { supabase.removeChannel(chatbotRealtimeChannel); } catch (e) {}
                chatbotRealtimeChannel = null;
            }
            const existing = supabase.getChannels?.().find(ch => ch.topic === 'realtime:admin-chatbot-global-sync');
            if (existing) {
                try { supabase.removeChannel(existing); } catch (e) {}
            }

            chatbotRealtimeChannel = supabase.channel('admin-chatbot-global-sync')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_conversation' }, payload => {
                    const changedId=payload?.new?.id||payload?.old?.id;
                    for(const conversation of PawpalChatbot.state.liveConversations||[])if(!changedId||conversation.id===changedId)conversation.messagesLoaded=false;
                    const current=PawpalChatbot.state.currentConversation;
                    if(current&&(!changedId||current.id===changedId))current.messagesLoaded=false;
                    refreshInboxDebounced(350);
                })
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        PawpalChatbot.state.isRealtimeHealthy = true;
                    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                        PawpalChatbot.state.isRealtimeHealthy = false;
                    }
                });

            window.addEventListener('beforeunload', () => {
                if (chatbotRealtimeChannel) supabase.removeChannel(chatbotRealtimeChannel);
            });
        } catch (e) {
            console.warn('[Chatbot] Không thể mở realtime channel:', e.message);
        }
    }

    // -------------------------------------------------------------
    // QUẢN LÝ HEADER BAR SUBTABS (CHUẨN AGENTS.MD)
    // -------------------------------------------------------------
    const subtabsContainer = document.getElementById('headerSubtabsGroup');
    const VALID_CHATBOT_TABS = ['tab-live-support', 'tab-ai-copilot', 'tab-chatbot-rules'];

    function renderHeaderSubtabs(activeTabId) {
        if (!subtabsContainer) return;
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Chatbot') return;

        const existingBtns = subtabsContainer.querySelectorAll('.header-subtab-btn');
        const isChatbotBtns = existingBtns.length === 3 && Array.from(existingBtns).every(b => {
            const t = b.getAttribute('data-tab') || b.getAttribute('data-subtab');
            return VALID_CHATBOT_TABS.includes(t);
        });

        if (isChatbotBtns) {
            existingBtns.forEach(btn => {
                const tab = btn.getAttribute('data-tab') || btn.getAttribute('data-subtab');
                btn.classList.toggle('active', tab === activeTabId);
            });
            return;
        }

        subtabsContainer.innerHTML = `
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-live-support' ? 'active' : ''}" data-subtab="tab-live-support" data-tab="tab-live-support">Trực chat</button>
            <span class="subtab-divider header-subtab-divider">|</span>
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-ai-copilot' ? 'active' : ''}" data-subtab="tab-ai-copilot" data-tab="tab-ai-copilot">Trợ lý AI</button>
            <span class="subtab-divider header-subtab-divider">|</span>
            <button type="button" class="header-subtab-btn ${activeTabId === 'tab-chatbot-rules' ? 'active' : ''}" data-subtab="tab-chatbot-rules" data-tab="tab-chatbot-rules">Quy định</button>
        `;
    }

    subtabsContainer?.addEventListener('click', (e) => {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Chatbot') return;
        const btn = e.target.closest('.header-subtab-btn');
        if (!btn) return;
        const tab = btn.getAttribute('data-tab') || btn.getAttribute('data-subtab');
        if (tab && VALID_CHATBOT_TABS.includes(tab)) {
            switchSubtab(tab);
        }
    });

    function switchSubtab(tabId) {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Chatbot') return;
        if (!VALID_CHATBOT_TABS.includes(tabId)) return;

        document.querySelectorAll('.chatbot-module-wrapper .subtab-content').forEach(sec => {
            sec.classList.remove('active');
        });

        const activeSec = document.getElementById(`subtab-${tabId}`);
        if (activeSec) activeSec.classList.add('active');

        renderHeaderSubtabs(tabId);
        try {
            history.replaceState(null, '', `#${tabId}`);
        } catch (e) {
            window.location.hash = `#${tabId}`;
        }
        sessionStorage.setItem('pawpal_admin_chatbot_subtab', tabId);

        updateDeepBreadcrumb();

        // Kích hoạt lifecycle của subtab tương ứng
        if (tabId === 'tab-live-support') {
            PawpalChatbot.subtabs.live?.init?.();
        } else if (tabId === 'tab-ai-copilot') {
            PawpalChatbot.subtabs.copilot?.init?.();
        } else if (tabId === 'tab-chatbot-rules') {
            PawpalChatbot.subtabs.rules?.init?.();
        }
    }
    PawpalChatbot.switchSubtab = switchSubtab;

    // -------------------------------------------------------------
    // BỘ ĐIỀU KHIỂN VÀ QUẢN LÝ MODAL CHUẨN AGENTS.md (4 CÁCH ĐÓNG TỨC THÌ)
    // -------------------------------------------------------------
    const modalOpeners=new Map();
    function openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modalOpeners.set(modalId,document.activeElement);
        const dialog=modal.firstElementChild;
        if(dialog){dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.tabIndex=-1;const title=dialog.querySelector('h2,h3,.admin-modal-title');if(title){title.id||=modalId+'Title';dialog.setAttribute('aria-labelledby',title.id);}}
        modal.classList.add('active');
        modal.style.display = 'flex';
        // Focus vào input đầu tiên nếu có
        setTimeout(() => {
            const firstInput = modal.querySelector('input:not([type="hidden"]):not([readonly]), select, textarea');
            (firstInput || dialog)?.focus();
        }, 50);
    }

    function closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        modal.classList.remove('active');
        modal.style.display = 'none';
        const opener=modalOpeners.get(modalId);modalOpeners.delete(modalId);if(opener?.isConnected)opener.focus();
    }

    PawpalChatbot.openModal = openModal;
    PawpalChatbot.closeModal = closeModal;

    // Bộ lắng nghe toàn cục: đóng khi bấm nút có data-close-modal
    document.addEventListener('click', (e) => {
        const closeBtn = e.target.closest('[data-close-modal]');
        if (closeBtn) {
            const targetId = closeBtn.getAttribute('data-close-modal');
            if (targetId) closeModal(targetId);
            return;
        }

        // Đóng khi click ra vùng nền tối bên ngoài (Backdrop click)
        if (e.target.classList.contains('admin-modal-overlay')) {
            closeModal(e.target.id);
        }
    });

    // Đóng khi bấm phím Escape
    document.addEventListener('keydown', (e) => {
        const open=Array.from(document.querySelectorAll('.admin-modal-overlay.active, .admin-modal-overlay[style*="display: flex"]')).filter(el=>el.getClientRects().length).at(-1);
        if(e.key==='Tab'&&open){
            const controls=Array.from(open.querySelectorAll('button:not([disabled]),input:not([disabled]):not([type="hidden"]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"],a[href]')).filter(el=>el.getClientRects().length);
            const first=controls[0],last=controls.at(-1);
            if(!first){e.preventDefault();open.firstElementChild?.focus();}
            else if(e.shiftKey&&(document.activeElement===first||!open.contains(document.activeElement))){e.preventDefault();last.focus();}
            else if(!e.shiftKey&&(document.activeElement===last||!open.contains(document.activeElement))){e.preventDefault();first.focus();}
        }
        if (e.key === 'Escape' || e.keyCode === 27) {
            const activeOverlays = document.querySelectorAll('.admin-modal-overlay.active, .admin-modal-overlay[style*="display: flex"]');
            const top=Array.from(activeOverlays).filter(el=>el.getClientRects().length).at(-1);if(top){e.preventDefault();closeModal(top.id);}
        }
    });


    // -------------------------------------------------------------
    // KHỞI ĐỘNG MODULE (PR-02: TIẾT KIỆM TẢI, TẮT POLLING KHI REALTIME KHỎE)
    // -------------------------------------------------------------
    setupChatbotRealtimeSync();
    loadInboxSummary();

    window.addEventListener('focus', () => {
        refreshInboxDebounced(150);
    });

    // PR-02: Fallback polling 45s chỉ chạy khi Realtime mất kết nối và tab đang hiển thị
    setInterval(() => {
        if (sessionStorage.getItem('pawpal_admin_active_module') !== 'Chatbot') return;
        if (document.hidden) return;
        if (PawpalChatbot.state.isRealtimeHealthy) return;
        refreshInboxDebounced(0);
    }, 45000);

    const hash = window.location.hash ? window.location.hash.replace('#', '') : '';
    const savedTab = sessionStorage.getItem('pawpal_admin_chatbot_subtab');
    let initTab = 'tab-live-support';
    if (VALID_CHATBOT_TABS.includes(hash)) {
        initTab = hash;
    } else if (VALID_CHATBOT_TABS.includes(savedTab)) {
        initTab = savedTab;
    }
    switchSubtab(initTab);

    window.addEventListener('admin:subtab-change', (e) => {
        if (e.detail?.module === 'Chatbot' && VALID_CHATBOT_TABS.includes(e.detail.tabId)) {
            switchSubtab(e.detail.tabId);
        }
    });
})();

})();
