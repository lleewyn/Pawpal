function initFab(){
 if(window.__pawpalFabInitialized)return;
 const $=id=>document.getElementById(id),panel=$('fabChatPanel'),messages=$('fabChatMessages'),input=$('fabChatInput'),send=$('fabChatSend');
 if(!panel||!messages||!input||!send)return;window.__pawpalFabInitialized=true;
 const client=window.getSupabaseClient?.();let active=null,rows=[],status='bot_handling',version=null,busy=false,request=null,historyPage=0,more=false,polling=false,newPage=null;
 const tokenKey='pawpal_chat_guest_v1';let guest=localStorage.getItem(tokenKey);let issued=Number(localStorage.getItem(tokenKey+'_at'));
 if(!guest||!issued||Date.now()-issued>7*86400000){guest=crypto.randomUUID()+crypto.randomUUID();issued=Date.now();localStorage.setItem(tokenKey,guest);localStorage.setItem(tokenKey+'_at',issued);}
 let identity='guest',epoch=0;const pending=new Set(),partReads=new Map();
 const handoffKey='pawpal_chat_member_handoff_v1';let resumingHandoff=false;
 function pendingHandoff(){try{const value=JSON.parse(sessionStorage.getItem(handoffKey)||'null');if(value&&value.guestIssued===issued&&Date.now()-value.at>=0&&Date.now()-value.at<1800000&&/^[0-9a-f-]{36}$/i.test(value.conversation)&&typeof value.draft==='string'&&value.draft.length<=2000)return value;}catch{}sessionStorage.removeItem(handoffKey);return null;}
 function membershipPrompt(){
  let prompt=$('fabMemberPrompt');if(prompt){prompt.scrollIntoView?.({block:'nearest'});return;}
  prompt=document.createElement('section');prompt.id='fabMemberPrompt';prompt.className='fab-member-prompt';prompt.setAttribute('aria-labelledby','fabMemberPromptTitle');
  const title=document.createElement('h3');title.id='fabMemberPromptTitle';title.textContent='Chat với nhân viên';
  const text=document.createElement('p');text.textContent='Đăng nhập hoặc thiết lập mật khẩu thành viên để tiếp tục.';
  const note=document.createElement('p');note.className='fab-member-prompt-note';note.textContent='Hội thoại và bản nháp của bạn được giữ nguyên.';prompt.append(title,text,note);
  const actions=document.createElement('div');actions.className='fab-member-prompt-actions';
  for(const [label,url]of [['Đăng nhập hoặc kích hoạt','/login'],['Đăng ký thành viên','/login?action=register']]){const button=document.createElement('button');button.type='button';button.className='fab-member-prompt-button';button.textContent=label;
   button.onclick=async()=>{if(busy)return;const stamp=epoch;busy=true;syncControls();try{await ensure();current(stamp);sessionStorage.setItem(handoffKey,JSON.stringify({conversation:active,guestIssued:issued,draft:input.value,at:Date.now()}));sessionStorage.setItem('pawpal_redirect_after_login','/user');location.assign(url);}catch(error){showError(error);}finally{if(stamp===epoch){busy=false;syncControls();}}};actions.append(button);}
  const back=document.createElement('button');back.type='button';back.className='fab-member-prompt-back';back.textContent='Tiếp tục hỏi trợ lý';back.onclick=()=>{prompt.remove();messages.classList.remove('fab-member-prompt-open');input.focus();};
  const contact=document.createElement('a');contact.className='fab-member-prompt-contact';contact.href='/contact';contact.textContent='Hỗ trợ kích hoạt và thanh toán';prompt.append(actions,back,contact);messages.classList.add('fab-member-prompt-open');messages.append(prompt);messages.scrollTop=messages.scrollHeight;
 }
 async function resumeHandoff(){
  const value=pendingHandoff();if(!value||identity==='guest'||resumingHandoff||busy)return;
  if(value.owner&&value.owner!==identity){sessionStorage.removeItem(handoffKey);return;}
  value.owner=identity;sessionStorage.setItem(handoffKey,JSON.stringify(value));const stamp=epoch;resumingHandoff=true;busy=true;syncControls();
  try{await api('public_claim',{conversationId:value.conversation});current(stamp);active=value.conversation;rows=[];version=null;remember();input.value=value.draft;panel.classList.add('open');await read(true);current(stamp);if(status==='bot_handling'){await api('public_mode',{conversationId:active,mode:'waiting_agent'});current(stamp);await read(true);}sessionStorage.removeItem(handoffKey);}
  catch(error){if(!error.stale){panel.classList.add('open');input.value=value.draft;showError(error);}}
  finally{if(stamp===epoch){busy=false;resumingHandoff=false;syncControls();}}
 }
 let mediaDraft=null,mediaGallery=null,mediaReady=null;
 async function mediaHeaders(){const stamp=epoch,session=(await client?.auth.getSession())?.data?.session;current(stamp);if((session?.user?.id||'guest')!==identity)throw stale();return session?{Authorization:'Bearer '+session.access_token}:{'X-Pawpal-Chat-Session':guest};}
 function initChatMedia(){
  if(mediaReady)return mediaReady;
  mediaReady=import('/scripts/shared/chat-media.mjs').then(module=>{
   const root=document.createElement('div');root.id='fabChatMediaDraft';input.closest('.fab-chat-input-row').before(root);
   root.style.padding='6px 14px';
   mediaDraft=module.createChatMediaDraft({root,headers:mediaHeaders,getContext:async()=>({conversation:await ensure(),message:request.id})});
   mediaGallery=module.createChatMediaGallery({headers:mediaHeaders});
   if(recovery?.mediaAssetIds?.length)mediaDraft.restore(recovery.mediaAssetIds);
  }).catch(error=>{mediaReady=null;throw error;});return mediaReady;
 }
 let readFailures=0,nextReadAt=0,readBlocked=false;
 function deferReads(error){if(error.stale)return;if(error.retryable===false||[400,401,403,410].includes(error.status)){readBlocked=true;return;}readFailures++;nextReadAt=Date.now()+30000*2**Math.min(readFailures-1,2);}
 function resetReads(){readFailures=0;readBlocked=false;nextReadAt=Date.now()+30000;}
 const recoveryKey='pawpal_chat_pending_v1';let recovery=null,submission=null;
 function clearRecovery(){recovery=null;sessionStorage.removeItem(recoveryKey);}
 function persistRecovery(value){try{const encoded=JSON.stringify(value);sessionStorage.setItem(recoveryKey,encoded);if(sessionStorage.getItem(recoveryKey)!==encoded)throw Error('storage_unavailable');recovery=value;}catch{throw Error('Không thể giữ mã gửi an toàn. Vui lòng kiểm tra bộ nhớ trình duyệt rồi thử lại.');}}
 function restoreRecovery(){
  recovery=null;try{const value=JSON.parse(sessionStorage.getItem(recoveryKey)||'null');
   const valid=value&&value.owner===identity&&(identity!=='guest'||value.guestIssued===issued)&&typeof value.conversation==='string'&&/^[0-9a-f-]{36}$/i.test(value.conversation)&&Number.isFinite(value.at)&&Date.now()-value.at>=0&&Date.now()-value.at<1800000&&typeof value.needsOpen==='boolean'&&(value.question===null||typeof value.question==='string'&&value.question.length>0&&value.question.length<=2000&&/^[0-9a-f-]{36}$/i.test(value.requestId||''));
   if(!valid||active&&active!==value.conversation){clearRecovery();return;}
   recovery=value;if(!value.needsOpen){active=value.conversation;remember();}
   if(value.question){input.value=value.question;request={id:value.requestId,key:JSON.stringify([value.conversation,value.question])};submission={id:value.requestId,question:value.question,at:value.at,phase:'failed'};if(value.mediaAssetIds?.length)void initChatMedia().then(()=>{mediaDraft.restore(value.mediaAssetIds);mediaDraft.freeze(true);});}
  }catch{recovery=null;sessionStorage.removeItem(recoveryKey);}
 }
 const stale=()=>Object.assign(Error('Phiên trò chuyện đã thay đổi.'),{stale:true});
 const current=stamp=>{if(stamp!==epoch)throw stale();};
 async function api(action,body={}){
  const stamp=epoch;
  const session=(await client?.auth.getSession())?.data?.session;
  current(stamp);if((session?.user?.id||'guest')!==identity)throw stale();
  const controller=new AbortController();pending.add(controller);const timeout=setTimeout(()=>controller.abort(),30000);
  try{
   const streaming=action==='public_send';
   const response=await fetch('/api/admin-chat',{method:'POST',signal:controller.signal,headers:{'Content-Type':'application/json',...(streaming?{Accept:'text/event-stream'}:{}),...(session?.access_token?{Authorization:'Bearer '+session.access_token}:{})},body:JSON.stringify({action,sessionToken:guest,...body,...(streaming?{stream:true}:{})})});
   const data=streaming&&response.headers?.get('content-type')?.includes('text/event-stream')?await readStream(response,stamp):await response.json();current(stamp);if(!response.ok||!data.ok)throw Object.assign(Error(data.error||'Không thể kết nối chat.'),{status:response.status,retryable:data.retryable,code:data.code});if(action==='public_read')resetReads();return data;
  }catch(error){current(stamp);if(action==='public_read'||action==='public_send')deferReads(error);if(error.name==='AbortError')throw Error('Phản hồi quá lâu. Nội dung vẫn được giữ để bạn thử lại.');throw error;}
  finally{clearTimeout(timeout);pending.delete(controller);}
 }
 async function readStream(response,stamp){
  const reader=response.body.getReader(),decoder=new TextDecoder();let buffer='',done=null,total=0;
  try{while(true){const chunk=await reader.read();current(stamp);if(chunk.done)break;total+=chunk.value.byteLength;if(total>131072)throw Error('Phản hồi quá dài. Bạn mở lại chat để kiểm tra nhé.');buffer+=decoder.decode(chunk.value,{stream:true}).replace(/\r\n/g,'\n');
    let boundary;while((boundary=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);const type=frame.match(/^event: (\w+)$/m)?.[1],raw=frame.match(/^data: (.*)$/m)?.[1];if(!raw)continue;const data=JSON.parse(raw);
     if(type==='error')throw Object.assign(Error(data.error||'PawPal chưa trả lời xong. Bạn thử gửi lại nhé.'),{status:data.status,retryable:data.retryable,code:data.code});
     if(type==='done'){if(data.ok!==true)throw Error('Chưa xác nhận gửi.');done=data;}
     else if(!done&&submission&&type==='reset'){submission.answer='';updateStreamPreview();}
     else if(!done&&submission&&type==='delta'){if(typeof data.text!=='string'||(submission.answer||'').length+data.text.length>16000)throw Error('Phản hồi chưa hợp lệ.');submission.answer=(submission.answer||'')+data.text;updateStreamPreview();}
    }
   }if(!done)throw Error('Kết nối bị ngắt khi PawPal đang trả lời. Bạn thử gửi lại nhé.');return done;
  }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 }
 function updateStreamPreview(){
  let bubble=$('fabStreamPreview');if(!submission?.answer){bubble?.remove();return;}
  const atBottom=messages.scrollHeight-messages.scrollTop-messages.clientHeight<120;
  if(!bubble){bubble=document.createElement('div');bubble.id='fabStreamPreview';bubble.className='fab-chat-bubble fab-chat-bubble--bot';const label=document.createElement('div');label.className='fab-msg-time';label.textContent='PawPal · Đang trả lời';const content=document.createElement('div');content.className='fab-stream-content';content.style.whiteSpace='pre-wrap';bubble.append(label,content);messages.insertBefore(bubble,messages.querySelector('.fab-send-state'));}
  bubble.querySelector('.fab-stream-content').textContent=submission.answer;if(atBottom)messages.scrollTop=messages.scrollHeight;
 }
 function notify(text){$('fabChatStatus').textContent=text;}
 function showError(error){if(!error.stale){notify(error.message);if(error.code==='MEMBERSHIP_REQUIRED')membershipPrompt();}}
 function syncControls(){
  const closed=['resolved','closed','completed','blocked'].includes(status);input.disabled=closed;send.disabled=busy||closed;
  const attach=$('fabChatAttachBtn');if(attach){attach.hidden=identity==='guest';attach.disabled=identity==='guest'||busy||closed;}
  input.readOnly=Boolean(busy&&mediaDraft?.count()||recovery?.mediaAssetIds?.length&&submission?.phase==='failed');
  const button=$('fabHandoverBtn');if(button){button.textContent=status==='waiting_agent'?'Hỏi lại trợ lý':'Gặp chuyên viên';button.disabled=busy||['agent_handling','resolved','closed','completed','blocked'].includes(status);}
  messages.querySelectorAll('.fab-answer-unhelpful').forEach(button=>button.disabled=busy||status!=='bot_handling');
 }
 function setMode(){
  syncControls();
  const labels={bot_handling:'Hỗ trợ tự động',waiting_agent:'Đang chờ nhân viên',agent_handling:'Nhân viên đang hỗ trợ',resolved:'Đã hoàn tất',closed:'Đã đóng',completed:'Đã hoàn tất',blocked:'Tạm khóa'};
  notify(labels[status]||'Đang xử lý');$('fabChatTitleText').textContent='PawPal hỗ trợ';
  const handoffNotice=$('fabHandoffNotice');if(handoffNotice){handoffNotice.hidden=!['waiting_agent','agent_handling'].includes(status);handoffNotice.textContent=status==='agent_handling'?'CSKH đã tiếp nhận cuộc trò chuyện.':'Đã chuyển cuộc trò chuyện sang chờ CSKH tiếp nhận.';}
 }
 function remember(){if(active)sessionStorage.setItem('pawpal_chat_active_'+identity,active);}
 function render(){
  messages.classList.remove('fab-member-prompt-open');
  mediaGallery?.clear();const mediaSlots=[];
  messages.replaceChildren();if(!rows.length&&!submission){
   const empty=document.createElement('div');empty.className='fab-chat-welcome';
   empty.innerHTML='<span class="fab-welcome-label">Chào bạn, PawPal đây!</span><h3>Mình có thể giúp gì cho bé?</h3><p>Hỏi về dịch vụ, cách đặt lịch hoặc những điều cần chuẩn bị khi đưa bé đến PawPal.</p><div class="fab-welcome-prompts"></div><small>Trợ lý tự động hỗ trợ thông tin ban đầu. Đăng nhập hoặc thiết lập mật khẩu thành viên để chọn “Gặp chuyên viên”.</small>';
   for(const prompt of ['Tư vấn dịch vụ tắm và cắt tỉa','Cách đặt lịch cho bé','Cần chuẩn bị gì khi gửi bé?']){const button=document.createElement('button');button.type='button';button.textContent=prompt;button.onclick=()=>{input.value=prompt;input.focus();};empty.querySelector('.fab-welcome-prompts').append(button);}
   messages.append(empty);
  }
  if(more){const b=document.createElement('button');b.type='button';b.className='fab-chat-read-btn';b.textContent='Tin nhắn trước';b.onclick=async()=>{const target=active;b.disabled=true;try{const first=rows[0];const data=await api('public_read',{conversationId:target,beforeAt:first.created_at,beforeId:first.id});if(active!==target)return;const old=data.messages.slice().reverse();more=typeof data.hasMore==='boolean'?data.hasMore:old.length===30;rows=[...old,...rows];const height=messages.scrollHeight;render();messages.scrollTop=messages.scrollHeight-height;}catch(error){showError(error);b.disabled=false;}};messages.append(b);}
  if(newPage){const b=document.createElement('button');b.type='button';b.className='fab-chat-read-btn';b.textContent='Xem tin nhắn mới';b.onclick=()=>{rows=newPage.rows;more=newPage.more;newPage=null;render();messages.scrollTop=messages.scrollHeight;};messages.append(b);}
  for(const row of rows){
   const div=document.createElement('div');div.className='fab-chat-bubble '+(['customer','guest'].includes(row.sender_type)?'fab-chat-bubble--user':row.sender_type==='staff'?'fab-chat-bubble--staff':'fab-chat-bubble--bot');
   const name=document.createElement('div');name.className='fab-msg-time';name.textContent=({staff:'Nhân viên',bot:'Pawpal',system:'Hệ thống',guest:'Bạn',customer:'Bạn'})[row.sender_type]+' · '+new Date(row.created_at).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'});div.append(name);
   if(row.metadata?.type==='csat_invitation'&&row.metadata.submitted){const thanks=document.createElement('p');thanks.textContent='Pawpal đã nhận đánh giá. Cảm ơn bạn!';div.append(thanks);}
   else if(row.metadata?.type==='csat_invitation'){
    const label=document.createElement('p');label.textContent='Bạn hài lòng với hỗ trợ vừa rồi chứ?';div.append(label);
    const select=document.createElement('select');select.className='fab-feedback-score';select.append(new Option('Chọn mức đánh giá',''));for(let i=1;i<=5;i++)select.append(new Option(i+'/5',String(i)));
    const comment=document.createElement('input');comment.placeholder='Góp ý thêm';comment.maxLength=2000;comment.className='fab-feedback-comment';
    const submit=document.createElement('button');submit.type='button';submit.className='fab-csat-submit-btn';submit.textContent='Gửi đánh giá';
    submit.onclick=async()=>{if(!select.value)return;submit.disabled=true;try{await api('feedback',{conversationId:active,score:Number(select.value),comment:comment.value.trim()});row.metadata.submitted=true;div.textContent='Pawpal đã nhận đánh giá. Cảm ơn bạn!';}catch(error){showError(error);submit.disabled=false;}};
    div.append(select,comment,submit);
   }else{const content=document.createElement('div');content.className='fab-message-content';content.style.whiteSpace='pre-wrap';
    const value=String(row.content||'');let start=0;
    if(row.sender_type==='bot')for(const match of value.matchAll(/\[([^\]\n]{1,100})\]\((\/[^\s)]{1,200})\)/g)){
     const safe=/^\/(?:booking(?:\?service=[0-9a-f-]{36})?|product-detail\?id=[0-9a-f-]{36}|shop|services|return-guest|contact|login|user#(?:orders|bookings|pets|loyalty|diary|support|support-create|(?:order-detail|booking-detail)\?id=[0-9a-f-]{36}))$/.test(match[2]);if(!safe)continue;
     content.append(document.createTextNode(value.slice(start,match.index)));const a=document.createElement('a');a.className='fab-answer-link';a.textContent=match[1];a.href=match[2];if(match[2]==='/login'&&identity==='guest')a.onclick=event=>{event.preventDefault();membershipPrompt();};if(match[2]==='/user#support-create')a.onclick=openSupportRequest;content.append(a);start=match.index+match[0].length;
    }
    content.append(document.createTextNode(value.slice(start)));div.append(content);
    if(row.content_partial){const b=document.createElement('button');b.type='button';b.className='fab-chat-read-btn';b.textContent='Đọc tiếp tin nhắn';
     b.onclick=async()=>{const target=active,offset=row.content_offset,revision=row.content_revision,key=epoch+':'+target+':'+row.id+':'+offset+':'+revision;b.disabled=true;
      try{if(!partReads.has(key))partReads.set(key,api('public_read_part',{conversationId:target,messageId:row.id,offset,revision}).finally(()=>partReads.delete(key)));const data=await partReads.get(key);if(active!==target)return;
       if(data.id!==row.id||data.offset!==offset||data.revision!==revision||typeof data.content!=='string'||!Number.isSafeInteger(data.next_offset)||data.next_offset<=offset||typeof data.hasMore!=='boolean')throw Error('Chưa xác nhận được phần tin nhắn tiếp theo.');
       const live=rows.find(r=>r.id===row.id);if(!live||live.content_revision!==revision||live.content_offset!==offset)return;
       live.content+=data.content;live.content_offset=data.next_offset;live.content_partial=data.hasMore;render();
      }catch(error){showError(error);b.disabled=false;}};div.append(b);
    }
   }
   if(row.sender_type==='bot'&&status==='bot_handling'&&row===rows.filter(r=>r.sender_type==='bot').at(-1)){
    const feedback=document.createElement('button');feedback.type='button';feedback.className='fab-chat-read-btn fab-answer-unhelpful';feedback.textContent='Chưa hữu ích, gặp CSKH';
    feedback.disabled=busy;feedback.onclick=()=>{if(!busy&&status==='bot_handling')$('fabHandoverBtn')?.click();};div.append(feedback);
   }
   messages.append(div);
   for(const item of row.media||[])mediaSlots.push({root:div,asset:item.asset_id});
  }
  if(mediaSlots.length)void initChatMedia().then(()=>mediaGallery.render(mediaSlots));
  if(submission){
   if(!rows.some(r=>r.id===submission.id)){
    const bubble=document.createElement('div');bubble.className='fab-chat-bubble fab-chat-bubble--user';bubble.dataset.pendingRequest='true';
    const name=document.createElement('div');name.className='fab-msg-time';name.textContent='Bạn · '+new Date(submission.at).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'});
    const content=document.createElement('div');content.className='fab-message-content';content.style.whiteSpace='pre-wrap';content.textContent=submission.question;bubble.append(name,content);messages.append(bubble);
   }
   const note=document.createElement('div');note.className='fab-send-state';note.setAttribute('role','status');
   const waiting=['sending','reading'].includes(submission.phase);
   note.textContent=waiting?(status==='bot_handling'?'PawPal đang trả lời…':'Đang gửi tin nhắn…'):submission.phase==='failed'?'Chưa xác nhận gửi. Nội dung đã được giữ.':'Đã gửi. Chưa tải được phản hồi; bạn mở lại chat để kiểm tra.';
   if(submission.phase==='failed'){const retry=document.createElement('button');retry.type='button';retry.className='fab-chat-read-btn';retry.textContent='Gửi lại';retry.disabled=busy;const question=submission.question;retry.onclick=()=>submit(question);note.append(retry);}
   messages.append(note);messages.setAttribute('aria-busy',String(waiting));
  }else messages.setAttribute('aria-busy','false');
  updateStreamPreview();
  setMode();
 }
 async function read(force=false){
  if(!active)return;const target=active;const data=await api('public_read',{conversationId:target,...(!force&&version?{since:version}:{})});if(active!==target)return;
  status=data.status;version=data.updatedAt;const recoveredRead=submission&&!busy&&submission.phase==='read_failed';if(recoveredRead)submission=null;if(data.notModified){if(recoveredRead)render();else setMode();return;}
  const incoming=data.messages.slice().reverse(),pageMore=typeof data.hasMore==='boolean'?data.hasMore:incoming.length===30;
  const map=new Map(rows.map(r=>[r.id,r]));
  if(rows.length&&!incoming.some(r=>map.has(r.id))){
   if(pageMore&&!force){const height=messages.scrollHeight,scroll=messages.scrollTop;newPage={rows:incoming,more:pageMore};render();messages.scrollTop=scroll+messages.scrollHeight-height;return;}
   rows=incoming;more=pageMore;newPage=null;render();if(force)messages.scrollTop=messages.scrollHeight;return;
  }
  newPage=null;incoming.forEach(r=>{const previous=map.get(r.id);if(r.content_revision&&r.content_revision===previous?.content_revision&&previous.content_offset>r.content_offset)Object.assign(r,{content:previous.content,content_offset:previous.content_offset,content_partial:previous.content_partial});map.set(r.id,r);});rows=[...map.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
  if(!rows.length||rows[0]?.id===incoming[0]?.id)more=typeof data.hasMore==='boolean'?data.hasMore:incoming.length===30;
  const atBottom=messages.scrollHeight-messages.scrollTop-messages.clientHeight<120;render();if(atBottom||force)messages.scrollTop=messages.scrollHeight;
 }
 async function ensure(){const stamp=epoch;if(!active){const value=recovery||{owner:identity,guestIssued:issued,conversation:crypto.randomUUID(),needsOpen:true,question:null,at:Date.now()};persistRecovery(value);await api('public_open',{conversationId:value.conversation});current(stamp);active=value.conversation;remember();if(value.question)persistRecovery({...value,needsOpen:false});else clearRecovery();}return active;}
 async function submit(override){
  const question=typeof override==='string'?override:input.value.trim()||(mediaDraft?.count()?'[Hình ảnh]':'');if(busy||input.disabled||!question)return;if(question.length>2000)return notify('Tin nhắn tối đa 2.000 ký tự.');const stamp=epoch;busy=true;mediaDraft?.freeze(true);syncControls();let sendError=null,sendStarted=false;
  try{
   const target=active||recovery?.conversation||crypto.randomUUID(),key=JSON.stringify([target,question]);if(!request||request.key!==key&&!mediaDraft?.count()&&!recovery?.mediaAssetIds?.length)request={id:crypto.randomUUID(),key};else request.key=key;
   persistRecovery({owner:identity,guestIssued:issued,conversation:target,needsOpen:!active,question,requestId:request.id,mediaAssetIds:recovery?.mediaAssetIds||[],at:Date.now()});
   submission={id:request.id,question,at:Date.now(),phase:'sending'};if(input.value.trim()===question)input.value='';render();messages.scrollTop=messages.scrollHeight;
   await ensure();current(stamp);
   const mediaAssetIds=mediaDraft?.count()?await mediaDraft.prepare():(recovery?.mediaAssetIds||[]);current(stamp);
   persistRecovery({...recovery,mediaAssetIds});mediaDraft?.sent();sendStarted=true;
   await api('public_send',{conversationId:active,question,requestId:request.id,mediaAssetIds});current(stamp);mediaDraft?.saved();submission.phase='reading';request=null;clearRecovery();await read(true);current(stamp);submission=null;
  }catch(error){if(stamp===epoch){if(!sendStarted)mediaDraft?.freeze(false);sendError=error;if(submission){submission.answer='';submission.phase=submission.phase==='reading'?'read_failed':'failed';if(submission.phase==='failed'&&!input.value)input.value=question;}}}finally{if(stamp===epoch){busy=false;render();messages.scrollTop=messages.scrollHeight;if(sendError)showError(sendError);}}
 }
 function fresh(){if(busy)return;sessionStorage.removeItem(handoffKey);mediaDraft?.clear();mediaGallery?.clear();resetReads();clearRecovery();submission=null;active=null;rows=[];version=null;more=false;newPage=null;request=null;input.value='';sessionStorage.removeItem('pawpal_chat_active_'+identity);$('fabChatHistoryView').style.display='none';$('fabChatMainView').style.display='flex';status='bot_handling';render();}
 async function history(){
  if(busy)return;const view=$('fabChatHistoryView'),list=$('fabHistoryList');view.style.display='flex';$('fabChatMainView').style.display='none';list.textContent='Đang tải...';
  try{const data=await api('public_list',{offset:historyPage*10});list.replaceChildren();if(!data.conversations.length)list.textContent='Chưa có hội thoại.';
   for(const c of data.conversations){const button=document.createElement('button');button.type='button';button.className='fab-history-card';button.classList.toggle('active',c.id===active);
    const info=document.createElement('span');info.className='fab-history-card-info';
    const title=document.createElement('span');title.className='fab-history-card-title';title.textContent=new Date(c.created_at).toLocaleDateString('vi-VN',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',year:'numeric'});
    const meta=document.createElement('span');meta.className='fab-history-card-meta';meta.textContent='Bắt đầu lúc '+new Date(c.created_at).toLocaleTimeString('vi-VN',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'});
    info.append(title,meta);const action=document.createElement('span');action.className='fab-history-card-open';action.textContent='Xem lại';button.append(info,action);
    button.onclick=async()=>{if(busy)return;mediaDraft?.clear();clearRecovery();request=null;submission=null;active=c.id;rows=[];version=null;more=false;newPage=null;remember();view.style.display='none';$('fabChatMainView').style.display='flex';try{await read(true);}catch(error){showError(error);}};list.append(button);}
   if(historyPage>0||data.conversations.length===10){const pagination=document.createElement('nav');pagination.className='fab-history-pagination';pagination.setAttribute('aria-label','Trang lịch sử trò chuyện');
    for(const [label,disabled,delta]of [['<',historyPage===0,-1],['>',data.conversations.length<10,1]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',delta<0?'Trang trước':'Trang sau');b.disabled=disabled;b.onclick=()=>{historyPage+=delta;history();};pagination.append(b);if(delta<0){const page=document.createElement('span');page.textContent=String(historyPage+1);page.setAttribute('aria-current','page');pagination.append(page);}}
    list.append(pagination);
   }
  }catch(error){if(!error.stale)list.textContent=error.message;}
 }
 $('fabAiBtn')?.addEventListener('click',()=>{panel.classList.toggle('open');if(panel.classList.contains('open')){input.focus();read().catch(showError);}});
 $('fabChatClose')?.addEventListener('click',()=>panel.classList.remove('open'));
 function openSupportRequest(event){
  panel.classList.remove('open');
  if(identity==='guest'){event.preventDefault();sessionStorage.setItem('pawpal_redirect_after_login','/user#support-create');location.assign('/login');}
 }
 $('fabSupportRequestLink')?.addEventListener('click',openSupportRequest);
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel.classList.contains('open')){panel.classList.remove('open');$('fabAiBtn')?.focus();}});
 $('fabChatExpand')?.addEventListener('click',()=>panel.classList.toggle('expanded'));
 $('fabChatNewBtn')?.addEventListener('click',fresh);$('fabHistoryNewBtn')?.addEventListener('click',fresh);$('fabChatHistoryBtn')?.addEventListener('click',()=>{historyPage=0;history();});
 $('fabHistoryBackBtn')?.addEventListener('click',()=>{$('fabChatHistoryView').style.display='none';$('fabChatMainView').style.display='flex';});
 $('fabHandoverBtn')?.addEventListener('click',async()=>{if(busy)return;if(identity==='guest'&&status!=='waiting_agent'){membershipPrompt();return;}if(pendingHandoff()){await resumeHandoff();return;}const stamp=epoch;busy=true;syncControls();try{await ensure();current(stamp);await api('public_mode',{conversationId:active,mode:status==='waiting_agent'?'bot_handling':'waiting_agent'});current(stamp);await read(true);}catch(error){showError(error);}finally{if(stamp===epoch){busy=false;syncControls();}}});
 send.addEventListener('click',submit);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}});
 document.querySelectorAll('.fab-chat-suggest').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.prompt||b.textContent;input.focus();}));
 if($('fabChatAttachBtn')){$('fabChatAttachBtn').disabled=true;$('fabChatAttachBtn').hidden=true;$('fabChatAttachBtn').textContent='Ảnh';$('fabChatAttachBtn').onclick=()=>{if(identity!=='guest'&&!busy&&!input.disabled)initChatMedia().catch(showError);};}
 window.addEventListener('scroll',()=>$('fabBookingBtn')?.classList.toggle('visible',scrollY>400),{passive:true});
 function adopt(next){if(next===identity)return;mediaDraft?.clear();mediaGallery?.clear();epoch++;resumingHandoff=false;for(const controller of pending)controller.abort();resetReads();identity=next;active=sessionStorage.getItem('pawpal_chat_active_'+identity);rows=[];submission=null;version=null;more=false;newPage=null;request=null;historyPage=0;busy=false;polling=false;status='bot_handling';input.value='';send.disabled=false;$('fabHistoryList').replaceChildren();restoreRecovery();render();if(panel.classList.contains('open'))read(true).catch(showError);}
 client?.auth.onAuthStateChange((_event,session)=>{const next=session?.user?.id||'guest';if(identity!=='guest'&&next!==identity)sessionStorage.removeItem(handoffKey);adopt(next);setTimeout(()=>resumeHandoff(),0);});
 (async()=>{const stamp=epoch;const session=(await client?.auth.getSession())?.data?.session;if(stamp!==epoch)return;const next=session?.user?.id||'guest';if(next!==identity)adopt(next);else{active=sessionStorage.getItem('pawpal_chat_active_'+identity);restoreRecovery();render();}await resumeHandoff();})();
 const timer=setInterval(async()=>{if(readBlocked||Date.now()<nextReadAt||polling||busy||document.hidden||!panel.isConnected||!panel.classList.contains('open')||!active)return;const stamp=epoch;polling=true;try{await read();}catch(error){showError(error);}finally{if(stamp===epoch)polling=false;}},10000);
 window.addEventListener('beforeunload',()=>{clearInterval(timer);for(const controller of pending)controller.abort();},{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initFab);else initFab();
