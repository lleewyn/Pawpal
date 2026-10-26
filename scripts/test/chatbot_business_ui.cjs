// Offline UI regression. All API/DB calls intercepted; no customer messages or live writes.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1440,height:1050}});let posts=[],reads=0,fail=true;const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());
  if(u.pathname==='/api/admin-chat'){
   if(route.request().method()==='POST'){
    posts.push(route.request().postDataJSON());await new Promise(r=>setTimeout(r,80));
    return route.fulfill({status:fail?503:200,contentType:'application/json',body:JSON.stringify(fail?{ok:false,error:'Nguồn chưa sẵn sàng. Câu hỏi được giữ.'}:{ok:true,reply:'SKU dưới ngưỡng: **25**. Hiển thị 20/25 kết quả.'})});
   }
   reads++;return route.fulfill({contentType:'application/json',body:JSON.stringify(u.searchParams.get('view')==='sessions'?{ok:true,sessions:[],total:0,page:1}:{ok:true,history:[],hasMore:false})});
  }
  return route.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'});
 });
 await page.goto('http://localhost:3001/',{waitUntil:'domcontentloaded'});
 await page.setContent(fs.readFileSync('pages/admin/modules/chatbot/chatbot.html','utf8'));
 for(const f of ['pages/admin/admin.css','pages/admin/modules/chatbot/chatbot.css'])await page.addStyleTag({content:fs.readFileSync(f,'utf8')});
 await page.evaluate(()=>{
  sessionStorage.clear();localStorage.clear();sessionStorage.setItem('pawpal_admin_active_module','Chatbot');
  window.dbWrites=[];window.notifications=[];
  const client={
   auth:{getSession:async()=>({data:{session:{access_token:'offline',user:{id:'test-actor'}}}})},
   rpc:async(name,args)=>{
    if(name==='get_admin_chat_inbox_page')return {data:{page:1,total:1,counts:{all:1,urgent:0,active:1},rows:[{id:'10000000-0000-4000-8000-000000000001',status:'agent_handling',assigned_staff_id:'actor',created_at:'2026-10-25T00:00:00Z',updated_at:'2026-10-25T00:00:00Z'}]}};
    if(['adjust_admin_chat_points','create_chat_complaint','transfer_admin_chat','resolve_admin_chat'].includes(name)){dbWrites.push({name,args});return {data:{}};}
    return {data:[]};
   },
   from(table){const q={select(){return q},eq(){return q},in(){return q},order(){return q},limit(){return q},range(){return q},maybeSingle(){return q},then(resolve){resolve({data:table==='chatbot_compensation_policy'?[{id:'policy',issue_type:'Chính sách thử',max_points:10,approval_required:false}]:[]});}};return q;},
   channel(){const c={on(){return c},subscribe(){return c},unsubscribe(){},send(){}};return c;},removeChannel(){}
  };window.getSupabaseClient=()=>client;
 });
 for(const file of ['chatbot.js','subtabs/tab-chatbot-live.js'])await page.addScriptTag({content:fs.readFileSync('pages/admin/modules/chatbot/'+file,'utf8')});
 await page.waitForFunction(()=>PawpalChatbot.state.liveLoaded);
 assert.equal(await page.evaluate(()=>PawpalChatbot.state.currentConversation),null,'Must not auto-select first case');
 assert.equal(await page.locator('#btnRewardPoints').isDisabled(),true);
 await page.evaluate(()=>{for(let i=0;i<10;i++)PawpalChatbot.subtabs.live.init();document.getElementById('btnRewardPoints').dispatchEvent(new MouseEvent('click',{bubbles:true}));});
 assert.equal(await page.locator('#rewardPointsModalOverlay').evaluate(e=>e.classList.contains('active')),false);
 await page.evaluate(()=>{
  PawpalChatbot.showToast=(message)=>notifications.push(message);
  window.caseA={id:'10000000-0000-4000-8000-000000000001',customerId:'20000000-0000-4000-8000-000000000001',customerName:'Khách thử',status:'agent_handling',isHandover:true,updatedAtRaw:'2026-10-25T00:00:00Z',slaDeadline:new Date(Date.now()+120000).toISOString(),messages:[],pets:[]};
  PawpalChatbot.state.currentConversation=caseA;PawpalChatbot.subtabs.live.renderCurrentChat();
 });
 await page.locator('#btnChatActionsDots').click();await page.locator('#btnRewardPoints').click();await page.waitForFunction(()=>!document.getElementById('btnConfirmRewardPoints').disabled);
 await page.locator('#selectRewardReason').selectOption('policy');await page.locator('#inputCustomRewardPoints').fill('5');
 await page.evaluate(()=>PawpalChatbot.state.currentConversation={...caseA,id:'case-B',customerId:'customer-B'});
 await page.locator('#btnConfirmRewardPoints').click();assert.equal(await page.evaluate(()=>dbWrites.length),0,'Switching case must block confirmation');
 await page.evaluate(()=>PawpalChatbot.closeModal('rewardPointsModalOverlay'));
 await page.evaluate(()=>{PawpalChatbot.state.currentConversation=caseA;document.querySelectorAll('.subtab-content').forEach(e=>e.classList.remove('active'));document.getElementById('subtab-tab-ai-copilot').classList.add('active');});
 await page.addScriptTag({content:fs.readFileSync('pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js','utf8')});
 await page.waitForFunction(()=>document.getElementById('btnSendCopilot').dataset.copilotBound);
 await page.locator('#copilotInput').fill('Có bao nhiêu SKU dưới ngưỡng?');
 await page.locator('#btnSendCopilot').click();await page.waitForFunction(()=>!document.getElementById('btnSendCopilot').disabled);
 assert.equal(await page.locator('#copilotInput').inputValue(),'Có bao nhiêu SKU dưới ngưỡng?');assert.equal(await page.locator('#copilotMessagesArea .msg-user').count(),0,'Failed send must not leave phantom user entry');
 const beforeReads=reads;fail=false;await page.locator('#btnSendCopilot').click();await page.waitForFunction(()=>!document.getElementById('btnSendCopilot').disabled);
 assert.equal(posts.length,2);assert.equal(posts[0].requestId,posts[1].requestId);assert.equal(reads,beforeReads,'Successful send must not reload history');
 assert.equal(await page.locator('#copilotInput').inputValue(),'');assert.equal(await page.locator('#copilotMessagesArea .msg-user').count(),1);assert.equal(await page.locator('#copilotMessagesArea .msg-ai').count(),1);
 fs.mkdirSync('docs/verification/chatbot-business',{recursive:true});await page.screenshot({path:'docs/verification/chatbot-business/copilot.png'});
 assert.deepEqual(errors,[]);console.log('PASS no automatic case selection, init x10, wrong-case award blocked, draft/requestId retained on 503, no phantom history, no post-send history reload, confirmed reply rendered. Offline API/DB only.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
