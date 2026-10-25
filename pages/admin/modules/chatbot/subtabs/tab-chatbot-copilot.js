(function(){
 'use strict';
 const app=window.PawpalChatbot=window.PawpalChatbot||{};app.subtabs=app.subtabs||{};

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
   s=s.replace(/`([^`]+)`/g,'<code style="background:#EEF5F1;padding:2px 6px;border-radius:4px;font-size:12.5px;color:#236B48;font-family:monospace;">$1</code>');
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
   html.push('<p style="margin:0 0 8px 0;line-height:1.6;">'+formatInline(line)+'</p>');
  }

  if(inTable)flushTable();
  if(inList)flushList();
  return html.join('');
 }

 async function typewriteText(container,timelineEl,fullText){
  if(!fullText){container.innerHTML='';return;}
  const words=fullText.split(/(\s+)/);
  const total=words.length;
  const speedMs=Math.max(6,Math.min(18,Math.floor(1200/Math.max(1,total))));
  let current='';
  for(let i=0;i<total;i++){
   current+=words[i];
   if(i%2===0||i===total-1){
    container.innerHTML=renderMarkdown(current);
    if(timelineEl)timelineEl.scrollTop=timelineEl.scrollHeight;
    await new Promise(r=>setTimeout(r,speedMs));
   }
  }
  container.innerHTML=renderMarkdown(fullText);
  if(timelineEl)timelineEl.scrollTop=timelineEl.scrollHeight;
 }

 function init(){
  const send=document.getElementById('btnSendCopilot'),input=document.getElementById('copilotInput'),timeline=document.getElementById('copilotMessagesArea'),list=document.getElementById('copilotSessionsList');
  if(!send||!document.getElementById('subtab-tab-ai-copilot')?.classList.contains('active'))return;
  if(send.dataset.copilotBound){app.subtabs.copilot.reload?.();return;}send.dataset.copilotBound='true';
  const client=window.getSupabaseClient();let sessions=[],active=sessionStorage.getItem('pawpal_copilot_active_session_id'),busy=false,request,page=1;
  localStorage.removeItem('pawpal_copilot_sessions');sessionStorage.removeItem('pawpal_copilot_sessions');

  const reads=new Map(),details=new Map();let totalSessions=0,loadVersion=0;
  async function api(method,body,params={},force=false){
   const session=(await client.auth.getSession()).data.session;if(!session)throw Error('Phiên đăng nhập đã hết hạn.');
   const suffix=new URLSearchParams(typeof params==='number'?{offset:params}:params).toString();
   const key=session.user.id+':'+suffix;
   const previous=reads.get(key);
   if(method==='GET'&&!force&&previous){if(previous.promise)return previous.promise;if(Date.now()-previous.at<30000)return previous.data;}
   const job=(async()=>{
    const response=await fetch('/api/admin-chat'+(suffix?'?'+suffix:''),{method,headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Không thể kết nối trợ lý.');
    if(method==='GET')reads.set(key,{at:Date.now(),data:result});
    else {reads.clear();if(method==='DELETE'){details.delete(body.sessionId);if(active===body.sessionId)active=null;}}
    return result;
   })();
   if(method==='GET')reads.set(key,{promise:job});
   try{return await job;}catch(error){reads.delete(key);throw error;}
  }

  async function openSession(id,{force=false,older=false}={}){
   const previous=details.get(id);
   const result=await api('GET',null,{sessionId:id,offset:older?(previous?.messages.length||0):0,withTitle:!sessions.some(s=>s.id===id)?'1':'0'},force);
   const summary=sessions.find(s=>s.id===id);
   details.set(id,{id,title:summary?.title||result.title||previous?.title||'Phiên mới',updated:summary?.updated,
    messages:older?[...new Map([...result.history,...(previous?.messages||[])].map(row=>[row.id,row])).values()]:result.history,hasMore:result.hasMore});
   if(id===active)render();
  }

  function render(){
   timeline.replaceChildren();const current=details.get(active)||sessions.find(s=>s.id===active);
   document.getElementById('currentCopilotSessionTitle').textContent=current?.title||'Phiên mới';
   const messages=current?.messages||[];
   if(!messages.length){
    const emptyNotice=document.createElement('div');
    emptyNotice.style.cssText='display:flex;align-items:center;justify-content:center;height:100%;min-height:200px;color:#4F7A65;font-size:13.5px;text-align:center;padding:24px;';
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
     content.style.whiteSpace='pre-wrap';content.textContent=row.content;
    }else{
     content.innerHTML=renderMarkdown(row.content);
    }
    card.append(heading,content);timeline.append(card);
   }
   timeline.scrollTop=timeline.scrollHeight;list.replaceChildren();

   const filtered=sessions;
   const total=Math.max(1,Math.ceil(totalSessions/10));
   if(!filtered.length){
    const empty=document.createElement('div');empty.className='copilot-session-empty';empty.textContent='Không tìm thấy phiên chat phù hợp.';list.append(empty);
   }else{
    for(const s of filtered){
     const item=document.createElement('div');
     item.className='copilot-session-item '+(s.id===active?'active':'');
     item.addEventListener('click',()=>{
      if(busy)return;
      active=s.id;sessionStorage.setItem('pawpal_copilot_active_session_id',active);render();openSession(active).catch(error=>app.showToast?.(error.message,'error'));
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

   const pager=document.createElement('div');pager.className='rules-pagination-wrap';
   pager.style.cssText='margin-top:auto;padding-top:10px;flex-shrink:0;';
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
   if(document.hidden||(activeModule&&activeModule!=='Chatbot')||!document.getElementById('subtab-tab-ai-copilot')?.classList.contains('active'))return;
   const version=++loadVersion;
   const query=document.getElementById('inputCopilotSessionSearch')?.value||'';
   const result=await api('GET',null,{view:'sessions',page,query},force);
   if(version!==loadVersion)return;
   sessions=result.sessions;page=result.page;totalSessions=result.total;
   if(!active)active=sessions[0]?.id||crypto.randomUUID();
   sessionStorage.setItem('pawpal_copilot_active_session_id',active);
   render();
   if(document.hidden)return;
   if(sessions.some(s=>s.id===active)||!details.has(active)){
    await openSession(active,{force});
    if(version===loadVersion&&!details.get(active)?.messages.length&&sessions.length){active=sessions[0].id;sessionStorage.setItem('pawpal_copilot_active_session_id',active);await openSession(active,{force});}
   } else if(force)await openSession(active,{force});
  }
  app.subtabs.copilot.reload=load;

  function fresh(){if(busy)return;active=crypto.randomUUID();details.set(active,{id:active,title:'Phiên mới',messages:[]});sessionStorage.setItem('pawpal_copilot_active_session_id',active);input.value='';request=null;render();input.focus();}

  async function submit(){
   const question=input.value.trim();if(busy||!question)return;if(question.length>2000)return app.showToast?.('Câu hỏi tối đa 2.000 ký tự.','error');
   active=active||crypto.randomUUID();const key=JSON.stringify([active,question]);if(request?.key!==key)request={key,id:crypto.randomUUID()};
   busy=true;send.disabled=true;
   input.value='';

   let currSession=details.get(active);
   if(!currSession){
    currSession={id:active,title:question.slice(0,80),messages:[],updated:new Date().toISOString()};
    details.set(active,currSession);
   }
   currSession.messages.push({role:'user',content:question,created_at:new Date().toISOString()});
   render();

   const thinkingCard=document.createElement('div');
   thinkingCard.className='copilot-msg msg-ai copilot-thinking-card';
   thinkingCard.innerHTML=`<div class="copilot-msg-header">Trợ lý · Vừa xong</div><div class="copilot-msg-bubble" style="display:flex;align-items:center;gap:6px;padding:12px 16px;background-color:#F8FAF9;border:1px solid var(--border-neutral);border-radius:var(--admin-radius);color:#4F7A65;font-size:13.5px;"><span class="typing-dot-pulse" style="animation-delay:0s;"></span><span class="typing-dot-pulse" style="animation-delay:0.2s;"></span><span class="typing-dot-pulse" style="animation-delay:0.4s;"></span><span style="margin-left:6px;">Trợ lý đang tra cứu dữ liệu và soạn thảo câu trả lời...</span></div>`;
   timeline.append(thinkingCard);
   timeline.scrollTop=timeline.scrollHeight;

   try{
    const result=await api('POST',{sessionId:active,requestId:request.id,question});
    thinkingCard.remove();
    const replyText=result.reply||'';

    const aiMsg={role:'assistant',content:replyText,created_at:new Date().toISOString()};
    currSession.messages.push(aiMsg);

    const aiCard=document.createElement('div');aiCard.className='copilot-msg msg-ai';
    const heading=document.createElement('div');heading.className='copilot-msg-header';heading.textContent='Trợ lý · Vừa xong';
    const contentBubble=document.createElement('div');contentBubble.className='copilot-msg-bubble';
    aiCard.append(heading,contentBubble);
    timeline.append(aiCard);

    await typewriteText(contentBubble,timeline,replyText);
    request=null;
    await load({force:true});
   }
   catch(error){
    thinkingCard.remove();
    app.showToast?.(error.message,'error');
   }
   finally{
    busy=false;send.disabled=false;render();
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
  load().catch(error=>{timeline.textContent=error.message;list.textContent='Không tải được lịch sử.';});
 }

 app.subtabs.copilot={init};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
