// Final phase-4 boundaries, using the same owned real Auth/REST/Realtime database.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {createHandler}=require('../../api/admin-chat.js'),{createStaffAuthHandlers}=require('../api/staff_auth.js');
module.exports=async({session,sql,id,authId,origin,folder,pass,serviceCaller,installAssistantHandler})=>{
 const contexts=[],pages=[];let sequence=18000;
 // The schema-only review clone omits the two configuration rows seeded by migration 136.
 sql('INSERT INTO pawpal_private.chat_read_slot(slot) VALUES(1),(2) ON CONFLICT DO NOTHING');
 const open=async(n,hash='tab-staff-profile')=>{const context=await session(id(n));contexts.push(context);const page=await context.newPage();pages.push(page);await page.goto(origin+'/admin#'+hash);await page.waitForFunction(()=>window.PawpalAdminAccess?.state.role);return page;};
 const rpc=(page,name,args)=>page.evaluate(async({name,args})=>{const r=await getSupabaseClient().rpc(name,args);return {data:r.data,error:r.error&&{code:r.error.code,message:r.error.message}};},{name,args});
 const readySignal=p=>p.waitForFunction(()=>window.getSupabaseClient?.()?.getChannels().some(c=>c.topic.startsWith('realtime:workspace-')&&c.state==='joined'));
 const staff=await open(1),peer=await open(2),manager=await open(3);
 const originalAccess=sql("SELECT pg_get_functiondef('public.set_admin_staff_access(uuid,uuid,timestamptz,text[],text[],text)'::regprocedure)");
 sql(fs.readFileSync('scripts/database/v1/184_staff_access_audit.sql','utf8'));
 const change=async(role)=>{const request=id(sequence++),version=sql(`SELECT updated_at FROM public.staff WHERE id='${id(1)}'`);const result=await rpc(manager,'set_admin_staff_access',{p_request_id:request,p_staff_id:id(1),p_expected_updated_at:version,p_roles:[role],p_permissions:[],p_reason:'Phase 4 isolated acceptance'});assert.equal(result.error,null,JSON.stringify(result));return {request,version};};
 try{
  const rawTables=['staff','staff_schedule','payment','refund_transaction','product_variant','audit_log','notification','admin_copilot_history','chat_message'];
  for(const table of rawTables){const result=await staff.evaluate(async table=>{const db=getSupabaseClient();const json=await db.from(table).select('*').limit(5),csv=await db.from(table).select('*').limit(5).csv(),head=await db.from(table).select('*',{count:'exact',head:true});return {headCount:head.count,headError:head.error?head.status:null,rows:json.data,error:json.error?.code,csv:csv.data,csvError:csv.error?.code};},table);assert.ok(result.error||result.rows?.length===0,table+' JSON');assert.ok([401,403].includes(result.headError)||result.headCount===0,table+' exact count '+JSON.stringify({count:result.headCount,status:result.headError}));assert.ok(result.csvError||String(result.csv||'').trim().split(/\r?\n/).filter(Boolean).length<=1,table+' CSV');}
  pass('STAFF direct JSON and CSV exports cannot bypass raw money/cost/staff/audit/notification/chat/history RLS');
  for(const name of ['search_admin_sales_customers','search_admin_sales_variants']){const result=await rpc(staff,name,{p_query:'QA'});assert.equal(result.error?.code,'42501',name);const positive=await rpc(manager,name,{p_query:'QA'});assert.equal(positive.error,null,name+' ADMIN');}
  for(const [kind,key]of [['appointments',21],['conversations',31],['self',2]]){const result=await rpc(staff,'get_staff_workspace',{p_kind:kind,p_query:'',p_id:id(key),p_page:1});assert.ok(result.error||!result.data.items.some(row=>row.id===id(key)),kind+' foreign identity');}
  pass('Legacy search RPCs remain ADMIN-only; scoped work searches reject foreign assignment and forged self IDs');
  const note=id(sequence++),audit=id(sequence++);
  sql(`INSERT INTO public.notification(id,customer_id,notification_type,title,content) VALUES('${note}','${id(10)}','qa','PRIVATE_NOTIFICATION_CANARY','PRIVATE_NOTIFICATION_BODY');INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES('${audit}','${id(3)}','QA_PRIVATE','staff','${id(1)}','PRIVATE_AUDIT_CANARY')`);
  for(const p of [staff,peer]){const result=await p.evaluate(async({note,audit})=>{const db=getSupabaseClient(),n=await db.from('notification').select('*').eq('id',note),a=await db.from('audit_log').select('*').eq('id',audit),update=await db.from('audit_log').update({description:'forged'}).eq('id',audit).select(),del=await db.from('audit_log').delete().eq('id',audit).select(),insert=await db.from('audit_log').insert({action:'FORGED',entity_name:'staff',entity_id:audit,description:'forged'});return {n:n.data,a:a.data,update:update.data,del:del.data,insertError:insert.error?.code};},{note,audit});assert.ok(!result.n?.length&&!result.a?.length&&!result.update?.length&&!result.del?.length);assert.ok(result.insertError);}
  assert.equal(sql(`SELECT description FROM public.audit_log WHERE id='${audit}'`),'PRIVATE_AUDIT_CANARY');
  assert.equal((await manager.evaluate(async audit=>(await getSupabaseClient().from('audit_log').select('description').eq('id',audit)).data,audit))[0].description,'PRIVATE_AUDIT_CANARY');
  pass('Private notification/audit canaries remain hidden; STAFF cannot forge, edit or delete audit evidence; ADMIN positive read succeeds');
  // Verify real postgres_changes payloads on the two ancillary surfaces, including a malicious unfiltered listener.
  for(const p of [staff,peer,manager])await p.evaluate(async()=>{window.__ancillary=[];await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Ancillary subscribe timeout')),15000);getSupabaseClient().channel('ancillary-boundary').on('postgres_changes',{event:'*',schema:'public',table:'audit_log'},p=>__ancillary.push(p)).on('postgres_changes',{event:'*',schema:'public',table:'notification'},p=>__ancillary.push(p)).subscribe(s=>{if(s==='SUBSCRIBED'){clearTimeout(timer);resolve();}});});});
  sql(`INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES('${id(3)}','QA_PRIVATE_APPEND','staff','${id(1)}','PRIVATE_AUDIT_APPENDED');UPDATE public.notification SET content='PRIVATE_NOTIFICATION_UPDATED' WHERE id='${note}'`);
  await manager.waitForFunction(()=>__ancillary.some(p=>p.table==='audit_log'));await new Promise(r=>setTimeout(r,600));
  assert.equal(await staff.evaluate(()=>__ancillary.length),0);assert.equal(await peer.evaluate(()=>__ancillary.length),0);
  pass('Actual unfiltered Realtime audit/notification subscriptions deliver no private INSERT/UPDATE payload to either STAFF');
  const second=await staff.context().newPage();await second.goto(origin+'/admin#tab-live-support?id='+id(30));await second.locator('.staff-workspace').waitFor();await Promise.all([readySignal(staff),readySignal(second)]);
  const promotion=await change('ADMIN');await Promise.all([staff.waitForFunction(()=>window.PawpalAdminAccess?.state.role==='ADMIN'),second.waitForFunction(()=>window.PawpalAdminAccess?.state.role==='ADMIN')]);
  assert.ok((await rpc(staff,'get_staff_login_context')).data.staff.permission_codes.includes('payment.read'));
  // Keep an attacker-controlled channel alive outside the target tab's cleanup lifecycle.
  const promotedToken=await staff.evaluate(async()=>(await getSupabaseClient().auth.getSession()).data.session.access_token);
  await manager.evaluate(async token=>{const cfg=SupabaseClientConfig,db=supabase.createClient(cfg.url,cfg.anonKey,{auth:{persistSession:false,autoRefreshToken:false}});await db.auth.getSession();await db.realtime.setAuth(token);window.__keptClient=db;window.__keptAudit=[];await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Kept-channel subscription timeout')),15000);db.channel('kept-admin-channel').on('postgres_changes',{event:'*',schema:'public',table:'audit_log'},p=>__keptAudit.push(p.new.description)).subscribe(s=>{if(s==='SUBSCRIBED'){clearTimeout(timer);resolve();}});});},promotedToken);
  sql(`INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES('${id(3)}','QA_KEPT_CHANNEL','staff','${id(1)}','KEPT_ADMIN_POSITIVE')`);await manager.waitForFunction(()=>__keptAudit.includes('KEPT_ADMIN_POSITIVE'));
  pass('PQ-24: a real management RPC promotes STAFF on two open tabs through actual Realtime, without sign-out or trusting cached roles');
  await staff.goto(origin+'/admin#tab-dashboard');await staff.locator('#dashboardRevenue').waitFor();
  await Promise.all([readySignal(staff),readySignal(second)]);
  await staff.evaluate(()=>{sessionStorage.setItem('pawpal_copilot_read_context','OLD_ADMIN_CANARY');window.__oldAdminRealm=true;});
  const downgrade=await change('STAFF');await Promise.all([staff.waitForFunction(()=>window.PawpalAdminAccess?.state.role==='STAFF'),second.waitForFunction(()=>window.PawpalAdminAccess?.state.role==='STAFF')]);
  assert.equal(await staff.evaluate(()=>window.__oldAdminRealm),undefined);assert.equal(await staff.evaluate(()=>sessionStorage.getItem('pawpal_copilot_read_context')),null);
  assert.equal(await staff.locator('#dashboardRevenue').count(),0);
  assert.equal((await rpc(staff,'admin_copilot_extended_facts',{p_intent:'revenue.summary',p_filters:{start_at:'2026-11-06T00:00:00+07:00',end_at:'2026-11-07T00:00:00+07:00'}})).error?.code,'42501');
  sql(`INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES('${id(3)}','QA_KEPT_CHANNEL','staff','${id(1)}','MUST_NOT_REACH_DEMOTED_CHANNEL')`);await new Promise(r=>setTimeout(r,900));assert.equal(await manager.evaluate(()=>__keptAudit.includes('MUST_NOT_REACH_DEMOTED_CHANNEL')),false);assert.ok(await manager.evaluate(()=>__keptClient.getChannels().some(c=>c.state==='joined')));await manager.evaluate(()=>__keptClient.removeAllChannels());
  pass('An attacker-kept ADMIN subscription with its original token stops receiving audit payload after demotion even without client teardown');
  pass('PQ-23: demotion on two live tabs destroys the old ADMIN realm/cache and immediately denies aggregate revenue with the existing Auth token');
  for(const [entry,before,after]of [[promotion,'STAFF','ADMIN'],[downgrade,'ADMIN','STAFF']]){const evidence=JSON.parse(sql(`SELECT jsonb_build_object('actor',staff_id,'at',created_at,'target',entity_id,'details',description::jsonb) FROM public.audit_log WHERE action='STAFF_ACCESS_CHANGE' AND description::jsonb->>'request_id'='${entry.request}'`));assert.equal(evidence.actor,id(3));assert.equal(evidence.target,id(1));assert.ok(evidence.at);assert.equal(evidence.details.actor_auth_id,authId(3));assert.deepEqual(evidence.details.before_roles,[before]);assert.deepEqual(evidence.details.after_roles,[after]);}
  const auditCount=sql("SELECT count(*) FROM public.audit_log WHERE action='STAFF_ACCESS_CHANGE'");const repeat=await rpc(manager,'set_admin_staff_access',{p_request_id:downgrade.request,p_staff_id:id(1),p_expected_updated_at:downgrade.version,p_roles:['STAFF'],p_permissions:[],p_reason:'Phase 4 isolated acceptance'});assert.equal(repeat.error,null);assert.equal(sql("SELECT count(*) FROM public.audit_log WHERE action='STAFF_ACCESS_CHANGE'"),auditCount);
  pass('Role-change evidence records actor/Auth/target/time and complete before/after roles; replay does not duplicate evidence');
  // Disconnect transport only: a missed assignment event must be recovered from the server on reconnect.
  const originalChatStatus=sql(`SELECT status FROM public.chat_conversation WHERE id='${id(30)}'`);sql(`UPDATE public.chat_conversation SET status='agent_handling' WHERE id='${id(30)}'`);
  sql(`UPDATE public.chat_conversation SET assigned_staff_id='${id(1)}' WHERE id='${id(30)}'`);await second.goto(origin+'/admin#tab-live-support?id='+id(30));await second.locator('.staff-workspace textarea').waitFor();await readySignal(second);
  await second.locator('.staff-workspace textarea').fill('ASSIGNMENT_DRAFT_CANARY');await second.evaluate(()=>getSupabaseClient().realtime.disconnect());
  sql(`UPDATE public.chat_conversation SET assigned_staff_id='${id(2)}' WHERE id='${id(30)}'`);await second.evaluate(()=>getSupabaseClient().realtime.connect());
  await second.waitForFunction(()=>![...document.querySelectorAll('textarea')].some(n=>n.value.includes('ASSIGNMENT_DRAFT_CANARY')));
  assert.equal((await rpc(second,'get_staff_workspace',{p_kind:'conversations',p_query:'',p_id:id(30),p_page:1})).data.items.length,0);
  pass('A real WebSocket disconnect misses reassignment; resubscription rechecks ownership and clears the obsolete conversation and draft');
  sql(`UPDATE public.chat_conversation SET assigned_staff_id='${id(1)}' WHERE id='${id(30)}'`);
  await second.goto(origin+'/admin#tab-live-support?id='+id(30));await second.locator('.staff-workspace textarea').waitFor();await readySignal(second);await second.locator('.staff-workspace textarea').fill('BACKGROUND_DRAFT_CANARY');
  await manager.bringToFront();await second.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});sql(`UPDATE public.chat_conversation SET assigned_staff_id='${id(2)}' WHERE id='${id(30)}'`);
  await second.waitForFunction(()=>![...document.querySelectorAll('textarea')].some(n=>n.value.includes('BACKGROUND_DRAFT_CANARY')));
  pass('The hidden-document branch (headless visibility override, real transport) still clears reassigned work and its draft');
  sql(`UPDATE public.chat_conversation SET assigned_staff_id='${id(1)}' WHERE id='${id(30)}'`);
  await Promise.all([readySignal(staff),readySignal(second)]);const oldToken=await staff.evaluate(async()=>(await getSupabaseClient().auth.getSession()).data.session.access_token);
  sql(`UPDATE public.staff SET employment_status='inactive' WHERE id='${id(1)}'`);await Promise.all([staff.waitForFunction(()=>window.PawpalAdminAccess?.state.role===null),second.waitForFunction(()=>window.PawpalAdminAccess?.state.role===null)]);
  for(const p of [staff,second])await p.waitForFunction(()=>getSupabaseClient().getChannels().length===0);
  const denied=await fetch(origin+'/rest/v1/rpc/get_staff_workspace',{method:'POST',headers:{apikey:serviceCaller.supabaseKey,Authorization:'Bearer '+oldToken,'Content-Type':'application/json'},body:JSON.stringify({p_kind:'self'})});assert.equal(denied.status,403);
  pass('PQ-25: suspension removes every channel and work view in both tabs; a captured pre-suspension token cannot call the work RPC');
  sql(`UPDATE public.staff SET employment_status='active' WHERE id='${id(1)}';UPDATE public.chat_conversation SET status='${originalChatStatus}' WHERE id='${id(30)}'`);
  // Run the production answer API with real rows; no provider is needed for deterministic facts.
  const auth=createStaffAuthHandlers({url:origin,anonKey:serviceCaller.supabaseKey,serviceKey:serviceCaller.supabaseKey});let modelCalls=0;
  installAssistantHandler(createHandler({verify:auth.verifyStaffCaller,serviceClient:serviceCaller,generateReply:async()=>{modelCalls++;throw Error('Facts must not invoke a provider');}}));
  const fresh=await open(1),token=await fresh.evaluate(async()=>(await getSupabaseClient().auth.getSession()).data.session.access_token),managerToken=await manager.evaluate(async()=>(await getSupabaseClient().auth.getSession()).data.session.access_token);
  const post=async(question,t=token)=>{const response=await fetch(origin+'/api/admin-chat',{method:'POST',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:JSON.stringify({requestId:id(sequence++),sessionId:id(18900),question,stream:false})});return {status:response.status,body:await response.json()};};
  const beforeMoney=sql('SELECT count(*) FROM public.refund_transaction');
  for(const question of ['Doanh thu toàn cửa hàng hôm nay','Danh sách nhân sự toàn hệ thống','Hoàn tiền đơn hàng SO-QA']){const result=await post(question);assert.ok(result.status>=400,JSON.stringify(result));assert.ok(!result.body.reply);}
  assert.equal(sql('SELECT count(*) FROM public.refund_transaction'),beforeMoney);assert.equal(modelCalls,0);
  pass('PQ-19: real HTTP STAFF requests for store revenue, all staff and refunds disclose no answer and perform no financial mutation');
  const own=await post('Hồ sơ nhân viên');assert.equal(own.status,200);assert.ok(own.body.reply.includes('An'));
  const foreign=await fetch(origin+'/api/admin-chat',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({requestId:id(sequence++),sessionId:id(18901),question:'Tóm tắt hội thoại',conversationId:id(31),stream:false})});assert.equal(foreign.status,403);assert.equal(modelCalls,0);
  pass('PQ-20: actual answer API returns own staff facts and denies another employee conversation before provider dispatch');
  const order=id(18920);sql(`INSERT INTO public.sales_order(id,order_code,customer_id,order_status) VALUES('${order}','QA-P4-REVENUE','${id(10)}','pending');INSERT INTO public.sales_order_detail(order_id,product_variant_id,product_name_snapshot,sku_snapshot,quantity,unit_price,discount_amount) VALUES('${order}','${id(42)}','QA revenue product','QA-P4-REVENUE',1,1000000,0)`);
  const method=sql('SELECT id FROM public.payment_method_config ORDER BY id LIMIT 1');
  for(const [n,amount,at]of [[1,123456,'2026-11-06T10:00:00+07:00'],[2,777777,'2026-11-07T00:00:00+07:00']])sql(`INSERT INTO public.payment(id,payment_code,customer_id,payment_method_config_id,payment_type,amount,transaction_status,succeeded_at,idempotency_key,order_id) VALUES('${id(18910+n)}','QA-P4-PAY-${n}','${id(10)}','${method}','sale',${amount},'succeeded','${at}','qa-p4-payment-${n}','${order}')`);
  const revenue=await post('Doanh thu ngày 06/11/2026',managerToken);assert.equal(revenue.status,200,JSON.stringify(revenue));assert.ok(revenue.body.reply.includes('123.456'),revenue.body.reply);assert.ok(!revenue.body.reply.includes('777.777'));assert.equal(modelCalls,0);
  pass('PQ-21: ADMIN real HTTP assistant reports the exact seeded daily collection and excludes a payment at the next-day boundary');
  const moneyExport=await fresh.evaluate(async()=>{const db=getSupabaseClient(),rows=await db.from('payment').select('id,amount'),count=await db.from('payment').select('*',{count:'exact',head:true}),csv=await db.from('payment').select('id,amount').csv();return {rows:rows.data,count:count.count,countStatus:count.status,csv:csv.data};});assert.deepEqual(moneyExport.rows,[]);assert.ok(moneyExport.count===0||moneyExport.countStatus===403);assert.ok(!String(moneyExport.csv||'').includes('123456')&&!String(moneyExport.csv||'').includes('777777'));
  pass('PQ-22: populated real payment canaries remain absent from STAFF JSON, exact counts and CSV while ADMIN revenue reads both under date filtering');
  const clearOwn=await rpc(fresh,'delete_staff_copilot_session',{p_session:id(18900)});assert.equal(clearOwn.error,null);
  sql(fs.readFileSync('scripts/database/v1/184_staff_access_audit.rollback.sql','utf8'));assert.equal(sql("SELECT pg_get_functiondef('public.set_admin_staff_access(uuid,uuid,timestamptz,text[],text[],text)'::regprocedure)"),originalAccess);assert.equal(sql("SELECT count(*) FROM public.audit_log WHERE action='STAFF_ACCESS_CHANGE'"),auditCount);
  pass('Rollback 184 restores the exact access workflow while retaining immutable role-change evidence');
 }finally{installAssistantHandler(null);for(const context of contexts)await context.close();}
};
