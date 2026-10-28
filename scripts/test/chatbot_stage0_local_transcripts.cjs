// Real local Auth + PostgREST + active API + widget. All fixtures stay in task-owned DB.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),assert=require('node:assert/strict'),jwt=require('jsonwebtoken');
const {AsyncLocalStorage}=require('node:async_hooks');
const {createClient}=require('@supabase/supabase-js');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {createHandler}=require('../../api/admin-chat.js');
if(!process.argv.includes('--local-fixtures')){console.log('No connection. Pass --local-fixtures for isolated local fixture tests.');process.exit(0);}
const out='docs/chatbot/stage0-2026-10-28',env=JSON.parse(fs.readFileSync(out+'/local-environment.txt','utf8'));
if(env.status!=='READY'||!/^pawpal_chatbot_g0_[a-f0-9]{12}$/.test(env.database))throw Error('local_environment_not_ready');
const config=JSON.parse(fs.readFileSync(path.join(env.privateDir,'connection.private.txt'),'utf8'));
assert.equal(config.database,env.database);assert.equal(config.ownerMarker,env.ownerMarker);
for(const key of ['api','auth','rest'])assert.equal(new URL(config[key]).hostname,'127.0.0.1');
const report={capturedAt:new Date().toISOString(),database:env.database,scope:'Task-owned local clone only; real GoTrue JWT, PostgREST, active API handler and original widget. No Cloud/AI.',cases:[],ui:[],load:[],blockedWrites:0,aiCalls:0};
const als=new AsyncLocalStorage(),metrics=[];let measurement=false,server,browser;
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const anon=jwt.sign({role:'anon',iss:'supabase',aud:'authenticated'},config.jwtSecret,{expiresIn:'1h'}),serviceKey=jwt.sign({role:'service_role',iss:'supabase',aud:'authenticated'},config.jwtSecret,{expiresIn:'1h'});
function ok(r){if(r.error){const m=r.error.message?.match(/column "([^"]+)" of relation "([^"]+)"/);throw Object.assign(Error('fixture_or_read_failed'),{code:r.error.code,column:m?.[1],table:m?.[2]});}return r.data;}
async function measuredFetch(input,init={}){
 const u=new URL(typeof input==='string'?input:input.url);if(u.origin!==config.api)throw Error('external_network_forbidden');
 const method=init.method||'GET';if(measurement&&!['GET','HEAD'].includes(method))throw Error('measurement_write_forbidden');
 const start=performance.now(),r=await fetch(input,{...init,signal:AbortSignal.timeout(10000)}),bytes=(await r.clone().arrayBuffer()).byteLength;
 const m={route:u.pathname,method,status:r.status,bytes,ms:Math.round((performance.now()-start)*100)/100};als.getStore()?.push(m);return r;
}
const service=createClient(config.api,serviceKey,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:measuredFetch}});
const handler=createHandler({serviceClient:service,generateReply:async()=>{report.aiCalls++;throw Error('ai_forbidden');}});
function sessionClient(){return createClient(config.api,anon,{auth:{persistSession:false,autoRefreshToken:false}});}
async function api(label,body,token){const rows=[],start=performance.now();let result;
 await als.run(rows,async()=>{const r=await fetch(config.api+'/api/admin-chat',{method:'POST',headers:{'Content-Type':'application/json','x-stage0-label':label,...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});result={status:r.status,body:await r.json()};});
 const recorded=metrics.findLast(m=>m.label===label);return {...result,metric:{label,status:result.status,ms:Math.round((performance.now()-start)*100)/100,apiBytes:Buffer.byteLength(JSON.stringify(result.body)),internal:recorded?.internal||[]}};
}
async function serve(req,res){
 const u=new URL(req.url,config.api);
 if(u.pathname==='/api/admin-chat'){
  const chunks=[];for await(const chunk of req)chunks.push(chunk);let body;try{body=JSON.parse(Buffer.concat(chunks).toString()||'{}');}catch{res.writeHead(400);return res.end();}
  if(!['public_read','public_list'].includes(body.action)){report.blockedWrites++;res.writeHead(405);return res.end('{}');}
  const internal=[],label=req.headers['x-stage0-label']||'widget';
  await als.run(internal,async()=>{
   const shim={statusCode:200,setHeader:(...a)=>res.setHeader(...a),status(code){this.statusCode=code;return this;},json(value){res.writeHead(this.statusCode,{'Content-Type':'application/json'});res.end(JSON.stringify(value));return this;}};
   await handler({method:'POST',headers:req.headers,socket:req.socket,body},shim);
  });metrics.push({label,internal});return;
 }
 const prefix=u.pathname.startsWith('/auth/v1/')?'/auth/v1':u.pathname.startsWith('/rest/v1/')?'/rest/v1':null;
 if(prefix){
  if(measurement&&!['GET','HEAD'].includes(req.method)){report.blockedWrites++;res.writeHead(405);return res.end('{}');}
  const upstream=(prefix==='/auth/v1'?config.auth:config.rest)+u.pathname.slice(prefix.length)+u.search;
  const body=[];for await(const chunk of req)body.push(chunk);const headers={...req.headers};delete headers.host;delete headers['content-length'];delete headers.connection;
  const response=await fetch(upstream,{method:req.method,headers,...(body.length?{body:Buffer.concat(body)}:{}),signal:AbortSignal.timeout(10000)});
  res.writeHead(response.status,{'Content-Type':response.headers.get('content-type')||'application/json'});return res.end(Buffer.from(await response.arrayBuffer()));
 }
 if(u.pathname==='/widget'){res.writeHead(200,{'Content-Type':'text/html'});return res.end('<!doctype html><html><body>'+fs.readFileSync('components/fab/fab.html','utf8')+'</body></html>');}
 res.writeHead(404);res.end();
}
(async()=>{
 server=http.createServer((req,res)=>serve(req,res).catch(()=>{if(!res.headersSent)res.writeHead(503);res.end('{}');}));await new Promise((resolve,reject)=>{server.on('error',reject);server.listen(18080,'127.0.0.1',resolve);});
 const suffix=crypto.randomBytes(5).toString('hex'),password=crypto.randomBytes(20).toString('hex')+'!';
 async function member(label){
  const phone='095'+String(crypto.randomInt(1000000,10000000)),email='stage0-'+label+'-'+suffix+'@example.invalid';
  const u=ok(await service.auth.admin.createUser({email,password,email_confirm:true,phone:'+84'+phone.slice(1),phone_confirm:true,app_metadata:{pawpal_test:true,user_type:'CUSTOMER'}})).user;
  // Fixture setup only: this old local clone has no complete_customer_auth RPC.
  const customer=crypto.randomUUID();ok(await service.from('customer').insert({id:customer,auth_user_id:u.id,customer_code:'G0-'+suffix+'-'+label,customer_status:'active',contact_email:email}));
  ok(await service.from('customer_profile').insert({customer_id:customer,full_name:'QA chatbot '+label}));
  const client=sessionClient(),login=ok(await client.auth.signInWithPassword({email,password}));return {customer,session:login.session};
 }
 const a=await member('A'),b=await member('B'),guestToken=crypto.randomUUID()+crypto.randomUUID(),otherGuest=crypto.randomUUID()+crypto.randomUUID();
 const memberChat=crypto.randomUUID(),guestChat=crypto.randomUUID();
 ok(await service.rpc('open_public_chat',{p_id:memberChat,p_customer:a.customer,p_guest_hash:null}));ok(await service.rpc('open_public_chat',{p_id:guestChat,p_customer:null,p_guest_hash:hash(guestToken)}));
 const time=Date.now()-40000;
 for(const id of [memberChat,guestChat]){
  ok(await service.from('chat_message').insert(Array.from({length:35},(_,i)=>({id:crypto.randomUUID(),conversation_id:id,sender_type:'bot',content:'QA stage0 message '+i,raw_content:'QA private original '+i,is_toxic:false,sentiment_score:2,metadata:{private_probe:'must_not_escape'},created_at:new Date(time+i*1000).toISOString()}))));
  ok(await service.from('chat_conversation').update({internal_note:'QA INTERNAL ONLY',updated_at:new Date().toISOString()}).eq('id',id));
 }
 report.fixture={members:2,guestConversations:1,memberConversations:1,messagesPerConversation:35,onlyTaskDatabase:true};measurement=true;
 const contexts=[{name:'guest',conversation:guestChat,sessionToken:guestToken},{name:'member',conversation:memberChat,token:a.session.access_token}];
 for(const c of contexts){
  const base={action:'public_read',conversationId:c.conversation,...(c.sessionToken?{sessionToken:c.sessionToken}:{})};
  const full=await api(c.name+'-full',base,c.token);assert.equal(full.status,200);assert.equal(full.body.messages.length,30);assert.ok(full.body.messages.every(m=>!('raw_content'in m)&&Object.keys(m.metadata).length===0));assert.ok(!JSON.stringify(full.body).includes('QA INTERNAL ONLY'));
  const revision=await api(c.name+'-revision',{...base,since:full.body.updatedAt},c.token);assert.equal(revision.status,200);assert.equal(revision.body.notModified,true);assert.equal(revision.body.messages,undefined);
  const first=full.body.messages.at(-1),older=await api(c.name+'-older',{...base,beforeAt:first.created_at,beforeId:first.id},c.token);assert.equal(older.status,200);assert.equal(older.body.messages.length,5);
  const denied=await api(c.name+'-other-owner',{...base,...(c.sessionToken?{sessionToken:otherGuest}:{})},c.token?b.session.access_token:undefined);assert.equal(denied.status,403);
  report.cases.push({name:c.name,full:full.metric,revision:revision.metric,older:older.metric,denied:denied.metric,publicProjectionSafe:true});c.revision=full.body.updatedAt;
 }
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const c of contexts){
  const page=await browser.newPage();await page.route('**/*',route=>new URL(route.request().url()).origin===config.api?route.continue():route.abort());await page.goto(config.api+'/widget');
  await page.addScriptTag({content:fs.readFileSync('scripts/vendor/supabase.js','utf8')});
  await page.evaluate(async({url,key,c,session})=>{
   const client=supabase.createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});window.getSupabaseClient=()=>client;
   if(session){const r=await client.auth.setSession(session);if(r.error)throw Error('local_browser_auth_failed');}
   if(c.sessionToken){localStorage.setItem('pawpal_chat_guest_v1',c.sessionToken);localStorage.setItem('pawpal_chat_guest_v1_at',Date.now());}
   sessionStorage.setItem('pawpal_chat_active_'+(session?.user.id||'guest'),c.conversation);
  },{url:config.api,key:anon,c,session:c.token?a.session:null});
  const before=metrics.length;await page.addScriptTag({content:fs.readFileSync('components/fab/fab.js','utf8')});await page.evaluate(()=>initFab());await page.locator('#fabAiBtn').click();
  await page.waitForFunction(()=>document.querySelectorAll('.fab-chat-bubble').length===30,{},{timeout:15000});
  await page.waitForTimeout(11000);
  const rows=metrics.slice(before),warmRead=rows.filter(r=>r.internal.length===(c.name==='guest'?2:3)).length;
  assert.ok(rows.length>=2);assert.ok(warmRead>=1);report.ui.push({name:c.name,apiReads:rows.length,internalCalls:rows.map(r=>r.internal.length),idleWindowMs:11000,warmRevisionReads:warmRead,renderedMessages:await page.locator('.fab-chat-bubble').count()});await page.close();
 }
 // Twenty reads, exactly two concurrent tasks, only loopback/isolated database.
 const c=contexts[1];for(let round=0;round<10;round++){
  const pair=await Promise.all([0,1].map(i=>api('load-'+round+'-'+i,{action:'public_read',conversationId:c.conversation,since:c.revision},c.token)));
  for(const r of pair){assert.equal(r.status,200);assert.equal(r.body.notModified,true);report.load.push(r.metric);}
 }
 const times=report.load.map(r=>r.ms).sort((a,b)=>a-b);report.loadSummary={n:20,maxConcurrentTasks:2,p50Ms:times[9],p95Ms:times[18],maxMs:times[19],totalApiBytes:report.load.reduce((n,r)=>n+r.apiBytes,0),totalInternalCalls:report.load.reduce((n,r)=>n+r.internal.length,0),scope:'Local fixture smoke only; not a Cloud capacity/SLO claim.'};
 assert.equal(report.blockedWrites,0);assert.equal(report.aiCalls,0);report.status='PASS';
})().catch(e=>{report.status='INCOMPLETE';report.error={name:e.name,code:e.code||null,column:e.column,table:e.table};process.exitCode=1;})
.finally(async()=>{if(browser)await browser.close();if(server)await new Promise(resolve=>server.close(resolve));fs.writeFileSync(out+'/local-transcript-baseline.txt',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,cases:report.cases.length,ui:report.ui,load:report.loadSummary,error:report.error}));});
