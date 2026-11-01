(function(){
 'use strict';
 const app=window.PawpalChatbot=window.PawpalChatbot||{};app.subtabs=app.subtabs||{};
 const detailQuestion=/^(Nội dung bài viết|Nội dung đánh giá): [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12} phần ([1-9][0-9]{0,4}) bản [a-f0-9]{32}$/;

 function formatTimeAgo(dateStr){
  if(!dateStr)return '';
  const diff=Math.floor((Date.now()-new Date(dateStr).getTime())/1000);
  if(diff<60)return 'Vừa xong';
  if(diff<3600)return Math.floor(diff/60)+' phút trước';
  if(diff<86400)return Math.floor(diff/3600)+' giờ trước';
  const d=new Date(dateStr);
  return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
 }

 function renderMarkdown(rawText){
  if(!rawText)return '';
  const escape=(str)=>str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const lines=rawText.split(/\r?\n/);
  const html=[];
  let inList=false,listLevel=0,inTable=false,tableRows=[];

  const formatInline=(text)=>{
   let s=escape(text);
   s=s.replace(/`([^`]+)`/g,'<code class="copilot-inline-code">$1</code>');
   s=s.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
   s=s.replace(/(^|[^*])\*([^*]+)\*/g,'$1<em>$2</em>');
   return s;
  };

  const flushTable=()=>{
   if(!inTable||tableRows.length===0)return;
   let tblHtml='<div class="copilot-table-wrapper"><table class="copilot-table">';
   let isFirst=true;
   for(const row of tableRows){
    if(/^\s*\|?([\s-:]+\|)+[\s-:]*$/.test(row))continue;
    let cells=row.split('|').map(c=>c.trim());
    if(row.trim().startsWith('|'))cells.shift();
    if(row.trim().endsWith('|'))cells.pop();
    if(isFirst){
     tblHtml+='<thead><tr>'+cells.map(c=>'<th>'+formatInline(c)+'</th>').join('')+'</tr></thead><tbody>';
     isFirst=false;
    }else{
     tblHtml+='<tr>'+cells.map(c=>'<td>'+formatInline(c)+'</td>').join('')+'</tr>';
    }
   }
   if(!isFirst)tblHtml+='</tbody>';
   tblHtml+='</table></div>';
   html.push(tblHtml);
   tableRows=[];
   inTable=false;
  };

  const flushList=()=>{
   while(listLevel>0){html.push('</ul>');listLevel--;}
   inList=false;
  };

  for(let i=0;i<lines.length;i++){
   let line=lines[i];
   if(/^\s*\|.*\|\s*$/.test(line)){
    flushList();inTable=true;tableRows.push(line);continue;
   }else if(inTable){
    flushTable();
   }

   let bulletMatch=line.match(/^(\s*)([*+-]|\d+\.)\s+(.*)$/);
   if(bulletMatch){
    let indent=bulletMatch[1].length;
    let content=bulletMatch[3];
    let level=(indent>=4||(indent>=2&&line.startsWith('  ')))?2:1;
    if(!inList){inList=true;html.push('<ul>');listLevel=1;}
    if(level>listLevel){html.push('<ul>');listLevel=level;}
    else if(level<listLevel){while(listLevel>level){html.push('</ul>');listLevel--;}}
    html.push('<li>'+formatInline(content)+'</li>');
    continue;
   }else if(inList){
    flushList();
   }

   let headMatch=line.match(/^(#{1,4})\s+(.*)$/);
   if(headMatch){
    let hLevel=headMatch[1].length;
    let hText=formatInline(headMatch[2]);
    html.push('<h'+Math.min(hLevel+2,6)+' style="color:#236B48;margin:10px 0 6px 0;font-weight:600;">'+hText+'</h'+Math.min(hLevel+2,6)+'>');
    continue;
   }

   if(!line.trim())continue;
   html.push('<p>'+formatInline(line)+'</p>');
  }

  if(inTable)flushTable();
  if(inList)flushList();
  return html.join('');
 }

 async function typewriteText(container,timelineEl,fullText){
  container.innerHTML=renderMarkdown(fullText||'');
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||document.hidden){if(timelineEl)timelineEl.scrollTop=timelineEl.scrollHeight;return;}
  // Reveal the validated reply locally; keep final Markdown DOM, not partial syntax.
  const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT),parts=[];let node,total=0;
  while((node=walker.nextNode())){const chars=Array.from(node.textContent);if(chars.length){parts.push({node,chars});total+=chars.length;node.textContent='';}}
  if(!total)return;
  const blocks=[...container.querySelectorAll('p,li,ul,ol,table,thead,tbody,tr,h3,h4,h5,h6')];blocks.forEach(e=>e.classList.add('copilot-stream-hidden'));
  container.setAttribute('aria-busy','true');container.classList.add('copilot-is-revealing');
  const started=performance.now(),duration=Math.min(2400,Math.max(600,total*2));let index=0,shown=0,inPart=0;
  await new Promise(resolve=>{const tick=()=>{
   const wanted=document.hidden||!container.isConnected?total:Math.min(total,Math.ceil(total*(performance.now()-started)/duration));
   while(index<parts.length&&shown<wanted){const part=parts[index],take=Math.min(part.chars.length-inPart,wanted-shown);inPart+=take;shown+=take;part.node.textContent=part.chars.slice(0,inPart).join('');
    for(let el=part.node.parentElement;el&&el!==container;el=el.parentElement)el.classList.remove('copilot-stream-hidden');
    if(inPart===part.chars.length){index++;inPart=0;}
   }
   if(timelineEl)timelineEl.scrollTop=timelineEl.scrollHeight;
   if(shown>=total)resolve();else setTimeout(tick,30);
  };tick();});
  blocks.forEach(e=>e.classList.remove('copilot-stream-hidden'));container.classList.remove('copilot-is-revealing');container.setAttribute('aria-busy','false');
 }

 function init(){
  const send=document.getElementById('btnSendCopilot'),input=document.getElementById('copilotInput'),timeline=document.getElementById('copilotMessagesArea'),list=document.getElementById('copilotSessionsList');
  if(!send||!document.getElementById('subtab-tab-ai-copilot')?.classList.contains('active'))return;
  if(send.dataset.copilotBound){app.subtabs.copilot.reload?.();return;}send.dataset.copilotBound='true';
  const client=window.getSupabaseClient();let sessions=[],active=sessionStorage.getItem('pawpal_copilot_active_session_id'),busy=false,request,page=1;
  let sessionsLoading=true,sessionsLoaded=false,sessionsError=null,historyLoadingId=null,historyError=null;
  localStorage.removeItem('pawpal_copilot_sessions');sessionStorage.removeItem('pawpal_copilot_sessions');

  const reads=new Map(),details=new Map();let totalSessions=0,loadVersion=0;
  async function api(method,body,params={},force=false){
   const session=(await client.auth.getSession()).data.session;if(!session)throw Error('Phiên đăng nhập đã hết hạn.');
   const suffix=new URLSearchParams(typeof params==='number'?{offset:params}:params).toString();
   const key=session.user.id+':'+suffix;
   const previous=reads.get(key);
   if(method==='GET'&&!force&&previous){if(previous.promise)return previous.promise;if(Date.now()-previous.at<30000)return previous.data;}
   const job=(async()=>{
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),30000);
    let response;
    try{response=await fetch('/api/admin-chat'+(suffix?'?'+suffix:''),{method,signal:controller.signal,headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});}
    catch(error){throw Error(error.name==='AbortError'?'Trợ lý phản hồi quá lâu. Câu hỏi vẫn được giữ để bạn thử lại.':'Mất kết nối. Câu hỏi vẫn được giữ để bạn thử lại.');}
    finally{clearTimeout(timer);}
    const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Không thể kết nối trợ lý.');
    if(method==='GET')reads.set(key,{at:Date.now(),data:result});
    else {reads.clear();if(method==='DELETE'){details.delete(body.sessionId);if(active===body.sessionId)active=null;}}
    return result;
   })();
   if(method==='GET')reads.set(key,{promise:job});
   try{return await job;}catch(error){reads.delete(key);throw error;}
  }

  async function openSession(id,{force=false,older=false}={}){
   if(busy||historyLoadingId===id)return;const version=loadVersion;
   const previous=details.get(id);
   historyLoadingId=id;historyError=null;render();
   try{
   const result=await api('GET',null,{sessionId:id,offset:older?(previous?.messages.length||0):0,withTitle:!sessions.some(s=>s.id===id)?'1':'0'},force);
   if(version!==loadVersion||busy)return;
   const summary=sessions.find(s=>s.id===id);
   details.set(id,{id,title:summary?.title||result.title||previous?.title||'Phiên mới',updated:summary?.updated,
    messages:older?[...new Map([...result.history,...(previous?.messages||[])].map(row=>[row.id,row])).values()]:result.history,hasMore:result.hasMore});
   }catch(error){if(version!==loadVersion||busy)return;historyError={id,message:error.message};throw error;}
   finally{if(version===loadVersion&&historyLoadingId===id){historyLoadingId=null;if(id===active)render();}}
  }

  function render(){
   timeline.replaceChildren();const current=details.get(active)||sessions.find(s=>s.id===active);
   const loading=sessionsLoading||historyLoadingId===active&&active!=null,failed=historyError?.id===active?historyError.message:null;
   timeline.setAttribute('aria-busy',String(busy||loading));list.setAttribute('aria-busy',String(sessionsLoading));
   const reload=document.getElementById('btnSyncRagData');if(reload){reload.disabled=busy||loading;reload.textContent=loading?'Đang tải lịch sử':'Tải lại lịch sử';}
   document.getElementById('currentCopilotSessionTitle').textContent=current?.title||(loading?'Đang tải lịch sử…':'Phiên mới');
   const messages=current?.messages||[];
   if(loading){const notice=document.createElement('div');notice.className='copilot-history-loading';notice.setAttribute('role','status');const label=document.createElement('div');label.className='copilot-loading-title';label.textContent='Đang tải lịch sử trò chuyện';const dots=document.createElement('span');dots.className='copilot-loading-dots';dots.setAttribute('aria-hidden','true');for(let i=0;i<3;i++){const dot=document.createElement('span');dot.textContent='.';dots.append(dot);}label.append(dots);const hint=document.createElement('div');hint.className='copilot-loading-hint';hint.textContent='Mình đang lấy các phiên và tin nhắn gần đây. Bạn chờ một chút nhé.';notice.append(label,hint);timeline.append(notice);}
   if(failed){const notice=document.createElement('div');notice.className='copilot-history-error';notice.setAttribute('role','status');notice.textContent='Chưa tải được lịch sử. '+failed;const retry=document.createElement('button');retry.type='button';retry.className='admin-btn admin-btn-secondary';retry.textContent='Thử tải lại';retry.onclick=()=>load({force:true}).catch(error=>app.showToast?.(error.message,'error'));notice.append(document.createElement('br'),retry);timeline.append(notice);}
   if(!messages.length&&!loading&&!failed){
    const emptyNotice=document.createElement('div');
    emptyNotice.className='copilot-empty-notice';
    emptyNotice.textContent='Nhập câu hỏi hoặc chọn gợi ý tác vụ bên dưới để tra cứu dữ liệu PawPal.';
    timeline.append(emptyNotice);
   }
   if(current?.hasMore){
    const more=document.createElement('button');more.type='button';more.className='admin-btn admin-btn-secondary';more.textContent='Tải tin nhắn cũ hơn';
    more.onclick=async()=>{more.disabled=true;try{await openSession(active,{older:true});}catch(error){app.showToast?.(error.message,'error');more.disabled=false;}};
    timeline.append(more);
   }
   for(const row of messages){
    const card=document.createElement('div');card.className='copilot-msg '+(row.role==='user'?'msg-user':'msg-ai');
    const heading=document.createElement('div');heading.className='copilot-msg-header';
    heading.textContent=(row.role==='user'?'Bạn':'Trợ lý')+' · '+new Date(row.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
    const content=document.createElement('div');content.className='copilot-msg-bubble';
    if(row.role==='user'){
     content.classList.add('copilot-user-content');const cursor=String(row.content||'').match(detailQuestion);content.textContent=cursor?cursor[1]+' — Phần '+cursor[2]:row.content;
    }else{
     content.innerHTML=renderMarkdown(row.content);
    }
    card.append(heading,content);
    if(row.delivery==='failed'){
     const notice=document.createElement('div');notice.className='copilot-delivery-notice';notice.setAttribute('role','status');
     notice.textContent='Chưa nhận được phản hồi. Bạn có thể gửi lại câu hỏi.';card.append(notice);
    }
    if(row.content_partial){
     const more=document.createElement('button');more.type='button';more.className='admin-btn admin-btn-secondary';more.textContent='Đọc tiếp tin nhắn';
     more.onclick=async()=>{more.disabled=true;try{
      const part=await api('GET',null,{view:'message_part',messageId:row.id,offset:row.content_offset,revision:row.content_revision});
      if(part.id!==row.id||part.revision!==row.content_revision||part.offset!==row.content_offset||typeof part.content!=='string'||!Number.isSafeInteger(part.next_offset)||part.next_offset<=part.offset||typeof part.hasMore!=='boolean')throw Error('Chưa xác nhận được phần tin nhắn tiếp theo.');
      row.content+=part.content;row.content_offset=part.next_offset;row.content_partial=part.hasMore;render();
     }catch(error){app.showToast?.(error.message,'error');more.disabled=false;}};
     card.append(more);
    }
    const destinations={'#tab-list':'Mở khách hàng','#tab-order-list':'Mở đơn hàng','#tab-order-products':'Mở sản phẩm và kho','#tab-service-bookings':'Mở lịch hẹn','#tab-service-catalog':'Mở bảng giá','#tab-chatbot-rules':'Mở quy định','#tab-live-support':'Mở trực chat','#tab-pet-list':'Mở thú cưng','#tab-order-promos':'Mở khuyến mãi','#tab-staff-list':'Mở nhân sự','#tab-staff-schedule':'Mở lịch làm việc','#tab-content-management':'Mở bài viết','#tab-system-config':'Mở cấu hình'};
    const next=row.continuation||row.metadata?.continuation;if(row.role!=='user'&&next?.type==='open_module'&&Object.hasOwn(destinations,next.href)){const link=document.createElement('a');link.className='admin-btn admin-btn-secondary';link.href=next.href;link.textContent=destinations[next.href];card.append(link);}
    if(row.role!=='user'&&next?.type==='ask_question'&&typeof next.question==='string'&&detailQuestion.test(next.question)){
     const more=document.createElement('button');more.type='button';more.className='admin-btn admin-btn-secondary';more.textContent='Đọc phần tiếp';more.disabled=busy;
     more.onclick=()=>{if(busy)return;input.value=next.question;submit();};card.append(more);
    }
    timeline.append(card);
   }
   timeline.scrollTop=timeline.scrollHeight;list.replaceChildren();

   const filtered=sessions;
   const total=Math.max(1,Math.ceil(totalSessions/10));
   if(sessionsLoading||sessionsError||!sessionsLoaded){const notice=document.createElement('div');notice.className='copilot-session-empty';notice.setAttribute('role','status');notice.textContent=sessionsLoading?'Đang tải các phiên chat…':sessionsError?'Chưa tải được danh sách phiên. Bạn có thể thử tải lại.':'Lịch sử chưa được tải. Bạn có thể bấm Tải lại lịch sử.';list.append(notice);}
   else if(!filtered.length){
    const empty=document.createElement('div');empty.className='copilot-session-empty';empty.textContent='Không tìm thấy phiên chat phù hợp.';list.append(empty);
   }else{
    for(const s of filtered){
     const item=document.createElement('div');
     item.className='copilot-session-item '+(s.id===active?'active':'');
     item.addEventListener('click',()=>{
      if(busy)return;
      loadVersion++;sessionsLoading=false;historyLoadingId=null;active=s.id;sessionStorage.setItem('pawpal_copilot_active_session_id',active);openSession(active).catch(error=>app.showToast?.(error.message,'error'));
     });

     const rowTop=document.createElement('div');rowTop.className='copilot-session-row-top';
     const titleEl=document.createElement('div');titleEl.className='copilot-session-title';titleEl.textContent=s.title;titleEl.title=s.title;
     const delBtn=document.createElement('button');delBtn.type='button';delBtn.className='btn-del-session';delBtn.textContent='✕';delBtn.title='Xóa phiên này';
     delBtn.addEventListener('click',(e)=>{
      e.stopPropagation();if(busy)return;
      app.showChatbotConfirmModal?.({
       title:'Xóa phiên trợ lý',message:'Xóa lịch sử phiên chat này?',confirmText:'Xóa phiên',isDanger:true,
       onConfirm:async()=>{try{await api('DELETE',{sessionId:s.id});await load({force:true});}catch(err){app.showToast?.(err.message,'error');}}
      });
     });
     rowTop.append(titleEl,delBtn);

     const metaEl=document.createElement('div');metaEl.className='copilot-session-meta';
     const countSpan=document.createElement('span');countSpan.textContent=(s.message_count??s.messages?.length??0)+' tin nhắn';
     const timeSpan=document.createElement('span');timeSpan.textContent=formatTimeAgo(s.updated);
     metaEl.append(countSpan,timeSpan);

     item.append(rowTop,metaEl);list.append(item);
    }
   }

   if(sessionsLoading||sessionsError||!sessionsLoaded)return;
   const pager=document.createElement('div');pager.className='rules-pagination-wrap';
   pager.classList.add('copilot-session-pager');
   for(const [text,disabled,delta,isActive] of [['<',page===1,-1,false],[String(page),false,0,true],['>',page===total,1,false]]){
    const b=document.createElement('button');b.type='button';
    b.className='rules-page-btn '+(isActive?'active':'');
    b.textContent=text;b.disabled=disabled||busy;
    if(delta!==0){b.onclick=(e)=>{e.stopPropagation();page+=delta;load().catch(error=>app.showToast?.(error.message,'error'));};}
    pager.append(b);
   }
   list.append(pager);
  }

  async function load({force=false}={}){
   const activeModule=sessionStorage.getItem('pawpal_admin_active_module');
   if(busy||document.hidden||(activeModule&&activeModule!=='Chatbot')||!document.getElementById('subtab-tab-ai-copilot')?.classList.contains('active'))return;
   const version=++loadVersion;
   sessionsLoading=true;sessionsError=null;historyLoadingId=null;historyError=null;render();
   const query=document.getElementById('inputCopilotSessionSearch')?.value||'';
   try{
   const result=await api('GET',null,{view:'sessions',page,query},force);
   if(version!==loadVersion)return;
   sessionsLoading=false;sessionsLoaded=true;sessions=result.sessions;page=result.page;totalSessions=result.total;
   if(!active)active=sessions[0]?.id||crypto.randomUUID();
   sessionStorage.setItem('pawpal_copilot_active_session_id',active);
   if(document.hidden)return;
   if(sessions.some(s=>s.id===active)||!details.has(active)){
    await openSession(active,{force});
    if(version===loadVersion&&!details.get(active)?.messages.length&&sessions.length){active=sessions[0].id;sessionStorage.setItem('pawpal_copilot_active_session_id',active);await openSession(active,{force});}
   } else if(force)await openSession(active,{force});
   if(version===loadVersion&&!busy)render();
   }catch(error){if(version!==loadVersion||busy)return;sessionsError=error.message;if(!details.get(active)?.messages?.length)historyError={id:active,message:error.message};throw error;}
   finally{if(version===loadVersion){sessionsLoading=false;render();}}
  }
  app.subtabs.copilot.reload=load;

  function fresh(){if(busy)return;loadVersion++;sessionsLoading=false;historyLoadingId=null;historyError=null;active=crypto.randomUUID();details.set(active,{id:active,title:'Phiên mới',messages:[]});sessionStorage.setItem('pawpal_copilot_active_session_id',active);input.value='';request=null;render();input.focus();}

  async function submit(){
   const question=input.value.trim();if(busy||!question)return;if(question.length>2000)return app.showToast?.('Câu hỏi tối đa 2.000 ký tự.','error');
   loadVersion++;
   sessionsLoading=false;historyLoadingId=null;historyError=null;
   const selected=app.state?.currentConversation,conversationId=selected?.id||null;
   const candidate=selected?.customerId?(/^\+?[\d .-]{9,15}$/.test(selected.phone||'')?selected.phone:selected.customerName):null;
   const readContext=typeof candidate==='string'&&candidate.trim().length>=3&&candidate.length<=120?{customerQuery:candidate.trim()}:{};
   if(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selected?.customerId||''))readContext.customerId=selected.customerId;
   active=active||crypto.randomUUID();const key=JSON.stringify([active,question,conversationId,readContext]);if(request?.key!==key)request={key,id:crypto.randomUUID()};
   busy=true;send.disabled=true;const sendLabel=send.textContent;send.textContent='Đang tra cứu';

   let currSession=details.get(active);
   if(!currSession){
    currSession={id:active,title:question.slice(0,80),messages:[],updated:new Date().toISOString()};
    details.set(active,currSession);
   }
   const pendingMessage=request.message||(request.message={role:'user',content:question,created_at:new Date().toISOString()});
   delete pendingMessage.delivery;
   if(!currSession.messages.includes(pendingMessage))currSession.messages.push(pendingMessage);
   render();
   timeline.setAttribute('aria-busy','true');

   const thinkingCard=document.createElement('div');
   thinkingCard.className='copilot-msg msg-ai copilot-thinking-card';
   thinkingCard.setAttribute('role','status');
   const statusTitle=document.createElement('div');statusTitle.className='copilot-loading-title';statusTitle.textContent='Đang tra cứu dữ liệu';
   const dots=document.createElement('span');dots.className='copilot-loading-dots';dots.setAttribute('aria-hidden','true');for(let i=0;i<3;i++){const dot=document.createElement('span');dot.textContent='.';dots.append(dot);}statusTitle.append(dots);
   const statusHint=document.createElement('div');statusHint.className='copilot-loading-hint';statusHint.textContent='Mình đang kiểm tra thông tin bạn cần. Bạn chờ một chút nhé.';
   thinkingCard.append(statusTitle,statusHint);
   timeline.append(thinkingCard);
   timeline.scrollTop=timeline.scrollHeight;

   try{
    const result=await api('POST',{sessionId:active,requestId:request.id,question,conversationId,readContext});
    thinkingCard.remove();
    send.textContent='Đang trả lời';
    const replyText=result.reply||'';

    const aiMsg={role:'assistant',content:replyText,created_at:new Date().toISOString(),continuation:result.continuation||null};
    currSession.messages.push(aiMsg);
    if(input.value.trim()===question)input.value='';

    const aiCard=document.createElement('div');aiCard.className='copilot-msg msg-ai';
    const heading=document.createElement('div');heading.className='copilot-msg-header';heading.textContent='Trợ lý · Vừa xong';
    const contentBubble=document.createElement('div');contentBubble.className='copilot-msg-bubble';
    aiCard.append(heading,contentBubble);
    timeline.append(aiCard);

    await typewriteText(contentBubble,timeline,replyText);
    request=null;
    currSession.updated=aiMsg.created_at;
    const existing=sessions.find(s=>s.id===active);
    if(existing){existing.updated=aiMsg.created_at;existing.message_count=currSession.messages.length;}
    else if(!document.getElementById('inputCopilotSessionSearch')?.value){sessions.unshift({id:active,title:currSession.title,updated:aiMsg.created_at,message_count:currSession.messages.length});sessions=sessions.slice(0,10);totalSessions++;}
    render();
   }
   catch(error){
    thinkingCard.remove();
    pendingMessage.delivery='failed';
    app.showToast?.(error.message,'error');
   }
   finally{
    busy=false;send.disabled=false;send.textContent=sendLabel;timeline.setAttribute('aria-busy','false');render();
   }
  }

  send.addEventListener('click',submit);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}});
  document.getElementById('btnNewCopilotSession')?.addEventListener('click',fresh);
  let searchTimer;document.getElementById('inputCopilotSessionSearch')?.addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>{page=1;load().catch(error=>app.showToast?.(error.message,'error'));},250);});
  document.getElementById('btnClearCopilotChat')?.addEventListener('click',()=>{
   if(busy||!details.get(active)?.messages.length)return;
   const target=active;app.showChatbotConfirmModal?.({title:'Xóa phiên trợ lý',message:'Xóa lịch sử phiên này của bạn?',confirmText:'Xóa phiên',isDanger:true,onConfirm:async()=>{
    try{await api('DELETE',{sessionId:target});await load({force:true});}catch(error){app.showToast?.(error.message,'error');}
   }});
  });
  document.getElementById('btnSyncRagData')?.addEventListener('click',async()=>{try{await load({force:true});app.showToast?.('Đã tải lại lịch sử.','success');}catch(error){app.showToast?.(error.message,'error');}});
  document.querySelectorAll('.copilot-pill-btn').forEach(b=>b.addEventListener('click',()=>{if(!busy){input.value=b.dataset.prompt;input.focus();}}));
  const badge=document.getElementById('copilotModelBadge');if(badge)badge.textContent='Chỉ tra cứu';
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load().catch(error=>app.showToast?.(error.message,'error'));});
  load().catch(error=>app.showToast?.(error.message,'error'));
 }

 app.subtabs.copilot={init};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
