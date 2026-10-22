(function(){
 'use strict';
 const app=window.PawpalChatbot=window.PawpalChatbot||{};app.subtabs=app.subtabs||{};
 function init(){
  const send=document.getElementById('btnSendCopilot'),input=document.getElementById('copilotInput'),timeline=document.getElementById('copilotMessagesArea'),list=document.getElementById('copilotSessionsList');
  if(!send||send.dataset.copilotBound)return;send.dataset.copilotBound='true';
  const client=window.getSupabaseClient();let sessions=[],active=sessionStorage.getItem('pawpal_copilot_active_session_id'),busy=false,request,page=1;
  localStorage.removeItem('pawpal_copilot_sessions');sessionStorage.removeItem('pawpal_copilot_sessions');
  async function api(method,body,offset){
   const session=(await client.auth.getSession()).data.session;if(!session)throw Error('Phiên đăng nhập đã hết hạn.');
   const response=await fetch('/api/admin-chat'+(offset===undefined?'':'?offset='+offset),{method,headers:{Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
   const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Không thể kết nối trợ lý.');return result;
  }
  function render(){
   timeline.replaceChildren();const current=sessions.find(s=>s.id===active);
   document.getElementById('currentCopilotSessionTitle').textContent=current?.title||'Phiên mới';
   const messages=current?.messages||[];
   if(!messages.length)timeline.textContent='Nhập câu hỏi để tra cứu dữ liệu và quy định được phép xem.';
   for(const row of messages){
    const card=document.createElement('div');card.className='copilot-msg '+(row.role==='user'?'msg-user':'msg-ai');
    const heading=document.createElement('div');heading.className='copilot-msg-header';heading.textContent=(row.role==='user'?'Bạn':'Trợ lý')+' · '+new Date(row.created_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
    const content=document.createElement('div');content.className='copilot-msg-bubble';content.style.whiteSpace='pre-wrap';content.textContent=row.content;card.append(heading,content);timeline.append(card);
   }
   timeline.scrollTop=timeline.scrollHeight;list.replaceChildren();
   const query=document.getElementById('inputCopilotSessionSearch').value.toLowerCase();const filtered=sessions.filter(s=>s.title.toLowerCase().includes(query));const total=Math.max(1,Math.ceil(filtered.length/10));page=Math.min(page,total);
   for(const s of filtered.slice((page-1)*10,page*10)){
    const button=document.createElement('button');button.type='button';button.className='admin-btn '+(s.id===active?'admin-btn-primary':'admin-btn-secondary');button.textContent=s.title;button.disabled=busy;button.addEventListener('click',()=>{active=s.id;sessionStorage.setItem('pawpal_copilot_active_session_id',active);render();});list.append(button);
   }
   const pager=document.createElement('div');pager.className='rules-pagination-wrap';
   for(const [text,disabled,delta]of [['<',page===1,-1],[String(page),true,0],['>',page===total,1]]){const b=document.createElement('button');b.type='button';b.className='admin-btn admin-btn-secondary';b.textContent=text;b.disabled=disabled||busy;b.onclick=()=>{page+=delta;render();};pager.append(b);}list.append(pager);
  }
  async function load(){
   const rows=[];for(let offset=0;;offset+=200){const result=await api('GET',null,offset);rows.push(...result.history);if(result.history.length<200)break;}
   const map=new Map();for(const row of rows){if(!map.has(row.session_id))map.set(row.session_id,{id:row.session_id,title:row.metadata?.session_title||row.content.slice(0,80),messages:[],updated:row.created_at});const s=map.get(row.session_id);s.messages.push(row);s.updated=row.created_at;}
   sessions=[...map.values()].sort((a,b)=>b.updated.localeCompare(a.updated));if(!sessions.some(s=>s.id===active))active=sessions[0]?.id||crypto.randomUUID();sessionStorage.setItem('pawpal_copilot_active_session_id',active);render();
  }
  function fresh(){if(busy)return;active=crypto.randomUUID();sessionStorage.setItem('pawpal_copilot_active_session_id',active);input.value='';request=null;render();input.focus();}
  async function submit(){
   const question=input.value.trim();if(busy||!question)return;if(question.length>2000)return app.showToast?.('Câu hỏi tối đa 2.000 ký tự.','error');
   active=active||crypto.randomUUID();const key=JSON.stringify([active,question]);if(request?.key!==key)request={key,id:crypto.randomUUID()};
   busy=true;send.disabled=true;render();
   try{await api('POST',{sessionId:active,requestId:request.id,question});if(input.value.trim()===question)input.value='';request=null;await load();}
   catch(error){app.showToast?.(error.message,'error');}
   finally{busy=false;send.disabled=false;render();}
  }
  send.addEventListener('click',submit);input.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}});
  document.getElementById('btnNewCopilotSession')?.addEventListener('click',fresh);
  document.getElementById('inputCopilotSessionSearch')?.addEventListener('input',()=>{page=1;render();});
  document.getElementById('btnClearCopilotChat')?.addEventListener('click',()=>{
   if(busy||!sessions.some(s=>s.id===active))return;
   const target=active;app.showChatbotConfirmModal?.({title:'Xóa phiên trợ lý',message:'Xóa lịch sử phiên này của bạn?',confirmText:'Xóa phiên',isDanger:true,onConfirm:async()=>{
    try{await api('DELETE',{sessionId:target});await load();}catch(error){app.showToast?.(error.message,'error');}
   }});
  });
  document.getElementById('btnSyncRagData')?.addEventListener('click',async()=>{try{await load();app.showToast?.('Đã tải lại lịch sử.','success');}catch(error){app.showToast?.(error.message,'error');}});
  document.querySelectorAll('.copilot-pill-btn').forEach(b=>b.addEventListener('click',()=>{if(!busy){input.value=b.dataset.prompt;input.focus();}}));
  const badge=document.getElementById('copilotModelBadge');if(badge)badge.textContent='Chỉ tra cứu';
  load().catch(error=>{timeline.textContent=error.message;list.textContent='Không tải được lịch sử.';});
 }
 app.subtabs.copilot={init};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
