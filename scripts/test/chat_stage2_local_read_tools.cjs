// Marker-owned local clone, real Auth/JWT/RPC/API; no Cloud or model calls.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto'),jwt=require('jsonwebtoken'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js'),{createHandler}=require('../../api/admin-chat.js'),{createStaffAuthHandlers}=require('../api/staff_auth.js');
if(!process.argv.includes('--local-fixtures')){console.log('No connection. Use --local-fixtures.');process.exit(0);}
const index=process.argv.indexOf('--evidence-dir'),out=index<0?'docs/chatbot/stage2-read-tools-2026-10-28':process.argv[index+1];
if(!/^docs\/chatbot\/stage2-[a-z0-9-]+$/.test(out))throw Error('invalid_evidence_directory');
const env=JSON.parse(fs.readFileSync(out+'/local-environment.txt','utf8'));
if(env.status!=='READY'||!/^pawpal_chatbot_g0_[a-f0-9]{12}$/.test(env.database))throw Error('invalid_fixture');
const cfg=JSON.parse(fs.readFileSync(path.join(env.privateDir,'connection.private.txt'),'utf8'));for(const name of ['api','auth','rest'])assert.equal(new URL(cfg[name]).hostname,'127.0.0.1');
const anon=jwt.sign({role:'anon',aud:'authenticated'},cfg.jwtSecret,{expiresIn:'1h'}),key=jwt.sign({role:'service_role',aud:'authenticated'},cfg.jwtSecret,{expiresIn:'1h'});
const report={capturedAt:new Date().toISOString(),scope:'Local only, Auth JWT and actual handler/RPC; no Cloud/AI',checks:[],modelCalls:0,requests:[]};let server;
const guardedFetch=async(input,init)=>{const url=new URL(String(input));assert.equal(url.origin,cfg.api);const record={route:url.pathname,method:init?.method||'GET'};report.requests.push(record);const response=await fetch(input,{...init,signal:AbortSignal.timeout(15000)});if(!response.ok){const d=await response.clone().json().catch(()=>({}));record.status=response.status;record.code=d.code;record.message=d.message;}return response;};
const options={auth:{persistSession:false,autoRefreshToken:false},global:{fetch:guardedFetch}},service=createClient(cfg.api,key,options),verify=createStaffAuthHandlers({url:cfg.api,anonKey:anon,serviceKey:key,fetch:guardedFetch}).verifyStaffCaller;
const handler=createHandler({serviceClient:service,verify,generateReply:async()=>{report.modelCalls++;throw Error('model_forbidden');}});
const ok=r=>{if(r.error)throw Object.assign(Error('local_request_failed'),{code:r.error.code});return r.data;};
async function identity(admin){const id=crypto.randomUUID(),email='g2-'+id+'@example.invalid',password=crypto.randomBytes(20).toString('hex')+'!';const u=ok(await service.auth.admin.createUser({email,password,email_confirm:true})).user;
 ok(await service.from('staff').insert({id,auth_user_id:u.id,full_name:'QA registry',job_title:'QA',employment_status:'active',must_change_password:false}));
 if(admin)ok(await service.from('staff_role').insert({staff_id:id,role_code:'ADMIN'}));else ok(await service.from('staff_permission').insert(['admin_copilot_history.read','admin_copilot_history.write'].map(permission_code=>({staff_id:id,permission_code}))));
 const client=createClient(cfg.api,anon,options),session=ok(await client.auth.signInWithPassword({email,password})).session;return {id,client,session};}
const pass=name=>{report.checks.push({name,status:'PASS'});console.log('PASS '+name);};
(async()=>{
 server=http.createServer(async(req,res)=>{try{const u=new URL(req.url,cfg.api),chunks=[];for await(const c of req)chunks.push(c);
  if(u.pathname==='/api/admin-chat'){const body=JSON.parse(Buffer.concat(chunks).toString()||'{}');return handler({method:req.method,headers:req.headers,socket:req.socket,query:Object.fromEntries(u.searchParams),body},{statusCode:200,setHeader:(...a)=>res.setHeader(...a),status(n){this.statusCode=n;return this;},json(d){res.writeHead(this.statusCode,{'Content-Type':'application/json'});res.end(JSON.stringify(d));return this;}});}
  const prefix=u.pathname.startsWith('/auth/v1/')?'/auth/v1':u.pathname.startsWith('/rest/v1/')?'/rest/v1':null;if(!prefix){res.writeHead(404);return res.end();}
  const headers={...req.headers};delete headers.host;delete headers['content-length'];delete headers.connection;
  const r=await fetch((prefix==='/auth/v1'?cfg.auth:cfg.rest)+u.pathname.slice(prefix.length)+u.search,{method:req.method,headers,...(chunks.length?{body:Buffer.concat(chunks)}:{}),signal:AbortSignal.timeout(10000)});res.writeHead(r.status,{'Content-Type':r.headers.get('content-type')||'application/json'});res.end(Buffer.from(await r.arrayBuffer()));
 }catch{if(!res.headersSent)res.writeHead(503);res.end('{}');}});await new Promise((resolve,reject)=>{server.on('error',reject);server.listen(18080,'127.0.0.1',resolve);});
 const admin=await identity(true),limited=await identity(false),sessionId=crypto.randomUUID();
 const send=async(actor,question,extra={})=>{const r=await fetch(cfg.api+'/api/admin-chat',{method:'POST',headers:{Authorization:'Bearer '+actor.session.access_token,'Content-Type':'application/json'},body:JSON.stringify({sessionId,requestId:crypto.randomUUID(),question,...extra}),signal:AbortSignal.timeout(15000)});return {status:r.status,body:await r.json()};};
 let r=await send(admin,'Có bao nhiêu SKU dưới ngưỡng?');assert.equal(r.status,200);assert.equal(r.body.contract_version,1);assert.equal(r.body.plan.intent,'inventory.low_stock');assert.equal(r.body.resource_usage.calls,1);assert.ok(r.body.resource_usage.bytes<=32768);assert.equal(r.body.continuation.href,'#tab-order-products');pass('Authorized JWT performs one registered facts call and returns v1 contract within byte budget');
 const before=report.requests.filter(r=>r.route==='/rest/v1/rpc/run_admin_chat_read').length;r=await send(limited,'Có bao nhiêu SKU dưới ngưỡng?');assert.equal(r.status,403);assert.equal(report.requests.filter(r=>r.route==='/rest/v1/rpc/run_admin_chat_read').length,before);pass('History-only staff denied before invoking business RPC');
 r=await send(admin,'lich henh spa hom nay cho phuc vu');assert.equal(r.status,200);assert.equal(r.body.plan.intent,'appointment.list');assert.equal(r.body.plan.period.timeZone,'Asia/Ho_Chi_Minh');pass('Unaccented typo variant uses existing bounded appointment RPC');
 r=await send(admin,'thế ngày mai thì sao?');assert.equal(r.status,200);assert.equal(r.body.plan.intent,'appointment.list');assert.equal(r.body.resource_usage.calls,2);pass('Follow-up uses shared budget for one private history read plus one facts read');
 r=await send(admin,'khách này',{readContext:{customerQuery:'QA-no-match'}});assert.equal(r.status,200);assert.equal(r.body.plan.intent,'customer.lookup');pass('Validated selected-page hint becomes caller-scoped lookup, not elevated access');
 r=await send(admin,'Có bao nhiêu SKU dưới ngưỡng?',{readContext:{table:'customer'}});assert.equal(r.status,400);pass('Unknown page-context parameter rejected');
 assert.equal(report.modelCalls,0);report.status='PASS';
})().catch(e=>{report.status='INCOMPLETE';report.error={name:e.name,code:e.code||null,message:e.message?.slice(0,180)};process.exitCode=1;})
.finally(async()=>{if(server)await new Promise(resolve=>server.close(resolve));fs.writeFileSync(out+'/local-results.txt',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:report.status,checks:report.checks.length,modelCalls:report.modelCalls,error:report.error}));});
