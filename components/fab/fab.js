function initFab(){
 if(window.__pawpalFabInitialized)return;
 const $=id=>document.getElementById(id),panel=$('fabChatPanel'),messages=$('fabChatMessages'),input=$('fabChatInput'),send=$('fabChatSend');
 if(!panel||!messages||!input||!send)return;window.__pawpalFabInitialized=true;
 const client=window.getSupabaseClient?.();let active=null,rows=[],status='bot_handling',version=null,busy=false,request=null,historyPage=0,more=false,polling=false;
 const tokenKey='pawpal_chat_guest_v1';let guest=localStorage.getItem(tokenKey);let issued=Number(localStorage.getItem(tokenKey+'_at'));
 if(!guest||!issued||Date.now()-issued>7*86400000){guest=crypto.randomUUID()+crypto.randomUUID();localStorage.setItem(tokenKey,guest);localStorage.setItem(tokenKey+'_at',Date.now());}
 let identity='guest';
 async function api(action,body={}){
  const session=(await client?.auth.getSession())?.data?.session;
  const response=await fetch('/api/admin-chat',{method:'POST',headers:{'Content-Type':'application/json',...(session?.access_token?{Authorization:'Bearer '+session.access_token}:{})},body:JSON.stringify({action,sessionToken:guest,...body})});
  const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Không thể kết nối chat.');return data;
 }
 function notify(text){$('fabChatStatus').textContent=text;}
 function setMode(){
  const labels={bot_handling:'Hỗ trợ tự động',waiting_agent:'Đang chờ nhân viên',agent_handling:'Nhân viên đang hỗ trợ',resolved:'Đã hoàn tất',closed:'Đã đóng',completed:'Đã hoàn tất'};
  notify(labels[status]||'Đang xử lý');$('fabChatTitleText').textContent='PawPal hỗ trợ';
  const button=$('fabHandoverBtn');if(button){button.textContent=status==='waiting_agent'?'Hỏi lại trợ lý':'Gặp chuyên viên';button.disabled=busy||['agent_handling','resolved','closed','completed'].includes(status);}
 }
 function remember(){if(active)sessionStorage.setItem('pawpal_chat_active_'+identity,active);}
 function render(){
  messages.replaceChildren();if(!rows.length){
   const empty=document.createElement('div');empty.className='fab-chat-welcome';
   empty.innerHTML='<span class="fab-welcome-label">Chào bạn, PawPal đây!</span><h3>Mình có thể giúp gì cho bé?</h3><p>Hỏi về dịch vụ, cách đặt lịch hoặc những điều cần chuẩn bị khi đưa bé đến PawPal.</p><div class="fab-welcome-prompts"></div><small>Trợ lý tự động hỗ trợ thông tin ban đầu. Bạn có thể chọn “Gặp chuyên viên” khi cần tư vấn trực tiếp.</small>';
   for(const prompt of ['Tư vấn dịch vụ tắm và cắt tỉa','Cách đặt lịch cho bé','Cần chuẩn bị gì khi gửi bé?']){const button=document.createElement('button');button.type='button';button.textContent=prompt;button.onclick=()=>{input.value=prompt;input.focus();};empty.querySelector('.fab-welcome-prompts').append(button);}
   messages.append(empty);
  }
  if(more){const b=document.createElement('button');b.type='button';b.textContent='Tin nhắn trước';b.onclick=async()=>{b.disabled=true;try{const first=rows[0];const data=await api('public_read',{conversationId:active,beforeAt:first.created_at,beforeId:first.id});const old=data.messages.slice().reverse();more=old.length===30;rows=[...old,...rows];const height=messages.scrollHeight;render();messages.scrollTop=messages.scrollHeight-height;}catch(error){notify(error.message);b.disabled=false;}};messages.append(b);}
  for(const row of rows){
   const div=document.createElement('div');div.className='fab-chat-bubble '+(['customer','guest'].includes(row.sender_type)?'fab-chat-bubble--user':row.sender_type==='staff'?'fab-chat-bubble--staff':'fab-chat-bubble--bot');
   const name=document.createElement('div');name.className='fab-msg-time';name.textContent=({staff:'Nhân viên',bot:'Pawpal',system:'Hệ thống',guest:'Bạn',customer:'Bạn'})[row.sender_type]+' · '+new Date(row.created_at).toLocaleTimeString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit'});div.append(name);
   if(row.metadata?.type==='csat_invitation'&&row.metadata.submitted){const thanks=document.createElement('p');thanks.textContent='Pawpal đã nhận đánh giá. Cảm ơn bạn!';div.append(thanks);}
   else if(row.metadata?.type==='csat_invitation'){
    const label=document.createElement('p');label.textContent='Bạn hài lòng với hỗ trợ vừa rồi chứ?';div.append(label);
    const select=document.createElement('select');select.className='fab-feedback-score';select.append(new Option('Chọn mức đánh giá',''));for(let i=1;i<=5;i++)select.append(new Option(i+'/5',String(i)));
    const comment=document.createElement('input');comment.placeholder='Góp ý thêm';comment.maxLength=2000;comment.className='fab-feedback-comment';
    const submit=document.createElement('button');submit.type='button';submit.className='fab-csat-submit-btn';submit.textContent='Gửi đánh giá';
    submit.onclick=async()=>{if(!select.value)return;submit.disabled=true;try{await api('feedback',{conversationId:active,score:Number(select.value),comment:comment.value.trim()});row.metadata.submitted=true;div.textContent='Pawpal đã nhận đánh giá. Cảm ơn bạn!';}catch(error){notify(error.message);submit.disabled=false;}};
    div.append(select,comment,submit);
   }else{const content=document.createElement('div');content.className='fab-message-content';content.style.whiteSpace='pre-wrap';content.textContent=row.content;div.append(content);}
   messages.append(div);
  }
  setMode();
 }
 async function read(force=false){
  if(!active)return;const target=active;const data=await api('public_read',{conversationId:target,...(!force&&version?{since:version}:{})});if(active!==target)return;
  status=data.status;version=data.updatedAt;if(data.notModified){setMode();return;}
  const incoming=data.messages.slice().reverse();const map=new Map(rows.map(r=>[r.id,r]));incoming.forEach(r=>map.set(r.id,r));rows=[...map.values()].sort((a,b)=>a.created_at.localeCompare(b.created_at)||a.id.localeCompare(b.id));
  if(!rows.length||rows[0]?.id===incoming[0]?.id)more=incoming.length===30;
  const atBottom=messages.scrollHeight-messages.scrollTop-messages.clientHeight<120;render();if(atBottom||force)messages.scrollTop=messages.scrollHeight;
 }
 async function ensure(){if(!active){const next=crypto.randomUUID();await api('public_open',{conversationId:next});active=next;remember();}return active;}
 async function submit(){
  const question=input.value.trim();if(busy||!question)return;if(question.length>2000)return notify('Tin nhắn tối đa 2.000 ký tự.');busy=true;send.disabled=true;
  try{
   await ensure();const key=JSON.stringify([active,question]);if(request?.key!==key)request={id:crypto.randomUUID(),key};
   await api('public_send',{conversationId:active,question,requestId:request.id});if(input.value.trim()===question)input.value='';request=null;await read(true);
  }catch(error){notify(error.message);}finally{busy=false;send.disabled=false;}
 }
 function fresh(){if(busy)return;active=null;rows=[];version=null;more=false;request=null;input.value='';sessionStorage.removeItem('pawpal_chat_active_'+identity);$('fabChatHistoryView').style.display='none';$('fabChatMainView').style.display='flex';status='bot_handling';render();}
 async function history(){
  if(busy)return;const view=$('fabChatHistoryView'),list=$('fabHistoryList');view.style.display='flex';$('fabChatMainView').style.display='none';list.textContent='Đang tải...';
  try{const data=await api('public_list',{offset:historyPage*10});list.replaceChildren();if(!data.conversations.length)list.textContent='Chưa có hội thoại.';
   for(const c of data.conversations){const button=document.createElement('button');button.type='button';button.className='fab-history-card';button.classList.toggle('active',c.id===active);
    const info=document.createElement('span');info.className='fab-history-card-info';
    const title=document.createElement('span');title.className='fab-history-card-title';title.textContent=new Date(c.created_at).toLocaleDateString('vi-VN',{timeZone:'Asia/Bangkok',day:'2-digit',month:'2-digit',year:'numeric'});
    const meta=document.createElement('span');meta.className='fab-history-card-meta';meta.textContent='Bắt đầu lúc '+new Date(c.created_at).toLocaleTimeString('vi-VN',{timeZone:'Asia/Bangkok',hour:'2-digit',minute:'2-digit'});
    info.append(title,meta);const action=document.createElement('span');action.className='fab-history-card-open';action.textContent='Xem lại';button.append(info,action);
    button.onclick=async()=>{active=c.id;rows=[];version=null;more=false;remember();view.style.display='none';$('fabChatMainView').style.display='flex';try{await read(true);}catch(error){notify(error.message);}};list.append(button);}
   if(historyPage>0||data.conversations.length===10){const pagination=document.createElement('nav');pagination.className='fab-history-pagination';pagination.setAttribute('aria-label','Trang lịch sử trò chuyện');
    for(const [label,disabled,delta]of [['<',historyPage===0,-1],['>',data.conversations.length<10,1]]){const b=document.createElement('button');b.type='button';b.textContent=label;b.setAttribute('aria-label',delta<0?'Trang trước':'Trang sau');b.disabled=disabled;b.onclick=()=>{historyPage+=delta;history();};pagination.append(b);if(delta<0){const page=document.createElement('span');page.textContent=String(historyPage+1);page.setAttribute('aria-current','page');pagination.append(page);}}
    list.append(pagination);
   }
  }catch(error){list.textContent=error.message;}
 }
 $('fabAiBtn')?.addEventListener('click',()=>{panel.classList.toggle('open');if(panel.classList.contains('open')){input.focus();read().catch(e=>notify(e.message));}});
 $('fabChatClose')?.addEventListener('click',()=>panel.classList.remove('open'));
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&panel.classList.contains('open')){panel.classList.remove('open');$('fabAiBtn')?.focus();}});
 $('fabChatExpand')?.addEventListener('click',()=>panel.classList.toggle('expanded'));
 $('fabChatNewBtn')?.addEventListener('click',fresh);$('fabHistoryNewBtn')?.addEventListener('click',fresh);$('fabChatHistoryBtn')?.addEventListener('click',()=>{historyPage=0;history();});
 $('fabHistoryBackBtn')?.addEventListener('click',()=>{$('fabChatHistoryView').style.display='none';$('fabChatMainView').style.display='flex';});
 $('fabHandoverBtn')?.addEventListener('click',async()=>{if(busy)return;busy=true;try{await ensure();await api('public_mode',{conversationId:active,mode:status==='waiting_agent'?'bot_handling':'waiting_agent'});await read(true);}catch(error){notify(error.message);}finally{busy=false;setMode();}});
 send.addEventListener('click',submit);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}});
 document.querySelectorAll('.fab-chat-suggest').forEach(b=>b.addEventListener('click',()=>{input.value=b.dataset.prompt||b.textContent;input.focus();}));
 if($('fabChatAttachBtn')){$('fabChatAttachBtn').disabled=true;$('fabChatAttachBtn').hidden=true;}
 window.addEventListener('scroll',()=>$('fabBookingBtn')?.classList.toggle('visible',scrollY>400),{passive:true});
 client?.auth.onAuthStateChange((_event,session)=>{const next=session?.user?.id||'guest';if(next===identity)return;identity=next;active=sessionStorage.getItem('pawpal_chat_active_'+identity);rows=[];version=null;more=false;request=null;render();if(panel.classList.contains('open'))read(true).catch(e=>notify(e.message));});
 (async()=>{identity=(await client?.auth.getSession())?.data?.session?.user?.id||'guest';active=sessionStorage.getItem('pawpal_chat_active_'+identity);render();})();
 const timer=setInterval(async()=>{if(polling||busy||document.hidden||!panel.isConnected||!panel.classList.contains('open')||!active)return;polling=true;try{await read();}catch(error){notify(error.message);}finally{polling=false;}},10000);
 window.addEventListener('beforeunload',()=>clearInterval(timer),{once:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initFab);else initFab();
