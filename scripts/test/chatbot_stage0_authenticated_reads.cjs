// Bounded, read-only UI baseline. Auth sign-in creates its normal Auth session only.
// Never send chat, create conversation/customer, call AI or mutate business data.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createClient}=require('@supabase/supabase-js');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {settings,infra}=require('../database/v1/cloud_connection.cjs');
if(!process.argv.includes('--read-cloud')){console.log('No connection. Pass --read-cloud for bounded authenticated reads.');process.exit(0);}
const folder='docs/chatbot/stage0-2026-10-28';
const base='https://pawpalgr3.vercel.app',sha=v=>crypto.createHash('sha256').update(v).digest('hex');
const readRpcs=new Set(['get_staff_login_context','get_admin_chat_inbox_page','get_admin_chat_messages','admin_chat_rule_page','admin_copilot_session_page']);
const readTables=new Set(['customer_profile','customer','customer_phone','pet_profile','sales_order','appointment','support_ticket','customer_point_balance','customer_membership','chatbot_canned_response','chatbot_knowledge_faq','chatbot_profanity_filter','chatbot_compensation_policy','chatbot_handover_rule','chatbot_scenario_matrix']);
const report={capturedAt:new Date().toISOString(),scope:'Local module HTML/JS mounted in isolated Chrome; actual Cloud JWT and DB reads; GET copilot history from deployed API; guest history for a fresh unregistered token only. No business writes or AI.',steps:[],blocked:[],nodeRequests:[]};
let browser;
const files=['pages/admin/modules/chatbot/chatbot.html','pages/admin/modules/chatbot/chatbot.js','pages/admin/modules/chatbot/subtabs/tab-chatbot-live.js','pages/admin/modules/chatbot/subtabs/tab-chatbot-copilot.js','pages/admin/modules/chatbot/subtabs/tab-chatbot-rules.js','pages/admin/admin-data-store.js','scripts/api/supabase-client.js','components/fab/fab.js'];
report.localSources=files.map(file=>({file,sha256:sha(fs.readFileSync(file))}));
async function instrument(page){
 await page.evaluate(()=>{
  window.audit={rows:[],pending:0,last:performance.now(),max:80,blocked:[],wsSent:0,wsReceived:0};
  const native=window.fetch.bind(window);
  window.fetch=async(input,init={})=>{
   const u=new URL(typeof input==='string'?input:input.url,location.href),method=init.method||'GET';
   const measured=u.pathname.startsWith('/rest/v1/')||u.pathname.startsWith('/auth/v1/')||u.pathname==='/api/admin-chat';
   if(!measured)return native(input,init);
   if(audit.rows.length+audit.pending>=audit.max)throw Error('stage0_request_cap');
   const started=performance.now();audit.pending++;audit.last=started;
   try{const response=await native(input,init);const body=await response.clone().arrayBuffer();audit.rows.push({route:u.pathname,method,status:response.status,decodedBytes:body.byteLength,ms:Math.round((performance.now()-started)*100)/100});return response;}
   catch(e){audit.rows.push({route:u.pathname,method,error:e.name});throw e;}
   finally{audit.pending--;audit.last=performance.now();}
  };
 });
 page.on('websocket',socket=>{socket.on('framesent',e=>page.evaluate(n=>{audit.wsSent+=n;},Buffer.byteLength(e.payload)).catch(()=>{}));socket.on('framereceived',e=>page.evaluate(n=>{audit.wsReceived+=n;},Buffer.byteLength(e.payload)).catch(()=>{}));});
}
async function settle(page){await page.waitForFunction(()=>audit.pending===0&&performance.now()-audit.last>500,{},{timeout:25000});}
async function step(page,name,action){
 await settle(page);const index=await page.evaluate(()=>audit.rows.length),started=performance.now();
 await action();await settle(page);
 const observed=await page.evaluate(index=>({requests:audit.rows.slice(index),channels:window.getSupabaseClient?.()?.getChannels().length??0,wsSent:audit.wsSent,wsReceived:audit.wsReceived}),index);
 report.steps.push({name,elapsedMs:Math.round(performance.now()-started),...observed,requestCount:observed.requests.length,decodedBytes:observed.requests.reduce((n,r)=>n+(r.decodedBytes||0),0)});
 console.log('Measured '+name+': '+observed.requests.length+' requests.');
}
async function guard(page){
 await page.route('**/*',async route=>{
  const r=route.request(),u=new URL(r.url()),method=r.method();
  if(u.hostname==='cpzuvaplseielhgcnqrn.supabase.co'){
   if(method==='OPTIONS')return route.continue();
   if(u.pathname==='/auth/v1/user'&&method==='GET')return route.continue();
   if(u.pathname.startsWith('/rest/v1/')){
    const name=u.pathname.split('/').at(-1),rpc=u.pathname.includes('/rpc/');
    if(rpc&&method==='POST'&&readRpcs.has(name)||!rpc&&['GET','HEAD'].includes(method)&&readTables.has(name))return route.continue();
   }
  }
  if(u.origin===base&&u.pathname==='/api/admin-chat'){
   if(method==='GET')return route.continue();
   let body;try{body=r.postDataJSON();}catch{}
   if(method==='POST'&&body?.action==='public_list')return route.continue();
  }
  if(u.origin===base&&u.pathname==='/__stage0_readonly')return route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><head></head><body></body></html>'});
  if(u.origin===base&&method==='GET'&&u.pathname.endsWith('.css')){
   const file=path.resolve('.'+u.pathname);if(file.startsWith(process.cwd()+path.sep)&&fs.existsSync(file))return route.fulfill({status:200,contentType:'text/css',body:fs.readFileSync(file,'utf8')});
  }
  // Do not persist URLs, query strings, bodies, credentials or business content.
  report.blocked.push({route:u.pathname,method});return route.abort();
 });
}
(async()=>{
 const {config}=settings();const credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
 const email=credentials.match(/^Email: (.+)$/m)?.[1].trim(),password=credentials.match(/^Password: (.+)$/m)?.[1].trim();
 if(!email||!password)throw Error('qa_credentials_unavailable');
 const auth=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:async(input,init)=>{const t=performance.now(),r=await fetch(input,{...init,signal:AbortSignal.timeout(15000)});report.nodeRequests.push({route:new URL(String(input)).pathname,status:r.status,ms:Math.round(performance.now()-t)});return r;}}});
 const login=await auth.auth.signInWithPassword({email,password});if(login.error||!login.data.session)throw Error('qa_signin_failed');
 const context=await auth.rpc('get_staff_login_context');if(context.error||!context.data?.is_active)throw Error('qa_context_failed');
 browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();await guard(page);await page.goto(base+'/__stage0_readonly');await instrument(page);
 await page.addScriptTag({content:fs.readFileSync('scripts/vendor/supabase.js','utf8')});
 await page.evaluate(cfg=>{window.__PAWPAL_SUPABASE_CONFIG__={url:cfg.url,anonKey:cfg.key,required:true};}, {url:config.DESTINATION_SUPABASE_URL,key:config.DESTINATION_SUPABASE_ANON_KEY});
 await page.addScriptTag({content:fs.readFileSync('scripts/api/supabase-client.js','utf8')});
 await page.evaluate(async({access_token,refresh_token,staff})=>{
  const r=await getSupabaseClient().auth.setSession({access_token,refresh_token});if(r.error)throw Error('browser_auth_failed');
  sessionStorage.setItem('pawpal_admin_active_module','Chatbot');sessionStorage.setItem('pawpal_admin_chatbot_subtab','tab-live-support');
  const admin={...staff,id:staff.id,permissions:staff.permission_codes||[],system_role:'ADMIN'};localStorage.setItem('pawpal_admin_user',JSON.stringify(admin));sessionStorage.setItem('pawpal_admin_user',JSON.stringify(admin));
 },{access_token:login.data.session.access_token,refresh_token:login.data.session.refresh_token,staff:context.data.staff});
 await page.setContent('<link rel="stylesheet" href="/pages/admin/admin.css"><link rel="stylesheet" href="/pages/admin/modules/chatbot/chatbot.css">'+fs.readFileSync(files[0],'utf8'));
 await page.addScriptTag({content:fs.readFileSync('pages/admin/admin-data-store.js','utf8')});
 await step(page,'admin-local-cold-live',async()=>{
  for(const file of files.slice(1,5))await page.addScriptTag({content:fs.readFileSync(file,'utf8')});
  await page.evaluate(()=>PawpalChatbot.switchSubtab('tab-live-support'));
  await page.waitForFunction(()=>PawpalChatbot.state.liveLoaded,{},{timeout:25000});
 });
 await step(page,'admin-local-warm-inbox',()=>page.evaluate(()=>PawpalChatbot.loadInboxSummary({page:1})));
 const hasMember=await page.evaluate(()=>PawpalChatbot.state.liveConversations.some(c=>c.customerId));
 if(hasMember){
  await step(page,'admin-local-cold-member-context',()=>page.evaluate(async()=>{const c=PawpalChatbot.state.liveConversations.find(c=>c.customerId);PawpalChatbot.state.currentConversation=c;await PawpalChatbot.loadConversationDetails(c);}));
  await step(page,'admin-local-warm-member-context',()=>page.evaluate(()=>PawpalChatbot.loadConversationDetails(PawpalChatbot.state.currentConversation)));
 }else report.memberContext='No member on first inbox page; did not scan other pages.';
 await step(page,'admin-local-cold-copilot-history',()=>page.evaluate(()=>PawpalChatbot.switchSubtab('tab-ai-copilot')));
 await step(page,'admin-local-cold-rules',()=>page.evaluate(()=>PawpalChatbot.switchSubtab('tab-chatbot-rules')));
 await step(page,'admin-local-warm-tabs',()=>page.evaluate(async()=>{PawpalChatbot.switchSubtab('tab-ai-copilot');await new Promise(r=>setTimeout(r,100));PawpalChatbot.switchSubtab('tab-chatbot-rules');}));
 await step(page,'admin-local-idle-12s',()=>page.waitForTimeout(12000));
 report.adminState=await page.evaluate(()=>({liveError:Boolean(PawpalChatbot.state.liveLoadError),realtimeHealthy:PawpalChatbot.state.isRealtimeHealthy,channels:getSupabaseClient().getChannels().length}));
 // A separate unauthenticated context has no access to the staff session.
 const guest=await browser.newPage();await guard(guest);await guest.goto(base+'/__stage0_readonly');await instrument(guest);
 await guest.addScriptTag({content:fs.readFileSync('scripts/vendor/supabase.js','utf8')});
 await guest.evaluate(cfg=>{window.__PAWPAL_SUPABASE_CONFIG__={url:cfg.url,anonKey:cfg.key,required:true};},{url:config.DESTINATION_SUPABASE_URL,key:config.DESTINATION_SUPABASE_ANON_KEY});
 await guest.addScriptTag({content:fs.readFileSync('scripts/api/supabase-client.js','utf8')});
 await guest.setContent(fs.readFileSync('components/fab/fab.html','utf8'));
 await step(guest,'guest-local-cold-widget-no-conversation',async()=>{await guest.addScriptTag({content:fs.readFileSync('components/fab/fab.js','utf8')});await guest.evaluate(()=>initFab());await guest.locator('#fabAiBtn').click();});
 await step(guest,'guest-local-empty-history',()=>guest.evaluate(async()=>{
  const token=localStorage.getItem('pawpal_chat_guest_v1');const r=await fetch('/api/admin-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'public_list',sessionToken:token,offset:0})});const d=await r.json();if(!r.ok||!d.ok||d.conversations.length)throw Error('unexpected_guest_history');
 }));
 await step(guest,'guest-local-idle-12s-no-conversation',()=>guest.waitForTimeout(12000));
 report.status=report.blocked.length?'REVIEW':'PASS';
})().catch(e=>{report.status='INCOMPLETE';report.error={name:e.name,code:e.code||null,kind:e.message?.startsWith('qa_')?e.message:'harness_or_network_error'};process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close();fs.mkdirSync(folder,{recursive:true});fs.writeFileSync(folder+'/authenticated-reads.txt',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,steps:report.steps.length,blocked:report.blocked,error:report.error}));});
