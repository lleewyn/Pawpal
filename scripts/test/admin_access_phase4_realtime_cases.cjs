const fs=require('node:fs'),assert=require('node:assert/strict');
module.exports=async({browser,session,sql,id,authId,origin,folder,pass,serviceCaller,installAssistantHandler})=>{
 for(const name of ['177_staff_copilot_reads','178_staff_copilot_history','179_staff_copilot_customer_relations','180_staff_copilot_booking_reads','181_staff_copilot_request_budget','182_staff_copilot_source_validation'])sql(fs.readFileSync('scripts/database/v1/'+name+'.sql','utf8'));
 // The review dump excludes publications. Recreate representative published surfaces only in this owned clone.
 sql("DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN CREATE PUBLICATION supabase_realtime; END IF; END $$;ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversation,public.chat_message,public.notification,public.audit_log");
 const contexts=[],pages=[];
 for(const n of [1,2,3]){const context=await session(id(n));contexts.push(context);const page=await context.newPage();pages.push(page);await page.goto(origin+'/admin#tab-staff-profile');await page.waitForFunction(()=>typeof getSupabaseClient==='function');await page.evaluate(async()=>{
  window.__realtimeEvents=[];window.__realtimeStatuses=[];
  const db=getSupabaseClient();const{data}=await db.auth.getSession();await db.realtime.setAuth(data.session.access_token);
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Isolated Realtime subscription timeout')),20000);window.__realtimeProbe=db.channel('access-e2e-'+data.session.user.id).on('postgres_changes',{event:'*',schema:'public',table:'chat_message'},payload=>window.__realtimeEvents.push({type:payload.eventType,new:payload.new,old:payload.old})).subscribe(status=>{window.__realtimeStatuses.push(status);if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){clearTimeout(timer);reject(Error('Isolated Realtime subscription failed: '+status));}});});
 });}
 pass('Two STAFF and one ADMIN real Auth sessions subscribe through the isolated WebSocket and PostgreSQL logical replication pipeline');
 sql(`INSERT INTO public.chat_message(id,conversation_id,sender_type,content,raw_content,sentiment_score) VALUES ('${id(16000)}','${id(30)}','bot','RT_SAFE_CANARY','RT_RAW_PRIVATE_CANARY',1)`);
 await pages[2].waitForFunction(()=>__realtimeEvents.some(e=>e.type==='INSERT'&&e.new.content==='RT_SAFE_CANARY'),{timeout:15000});
 sql(`UPDATE public.chat_message SET content='RT_CHANGED_CANARY' WHERE id='${id(16000)}'`);await pages[2].waitForFunction(()=>__realtimeEvents.some(e=>e.type==='UPDATE'&&e.new.content==='RT_CHANGED_CANARY'),{timeout:15000});
 sql(`DELETE FROM public.chat_message WHERE id='${id(16000)}'`);await pages[2].waitForFunction(()=>__realtimeEvents.some(e=>e.type==='DELETE'),{timeout:15000});await new Promise(resolve=>setTimeout(resolve,1200));
 const findings=[];for(let i=0;i<pages.length;i++){const events=await pages[i].evaluate(()=>__realtimeEvents);findings.push({role:i===2?'ADMIN':'STAFF',actor:i+1,events:events.map(e=>({type:e.type,newKeys:Object.keys(e.new||{}),oldKeys:Object.keys(e.old||{}),canaryId:e.old?.id===id(16000)||e.new?.id===id(16000)}))});}
 fs.writeFileSync(folder+'/payload-findings.txt',JSON.stringify({scope:'Actual isolated Realtime payloads; synthetic canaries only',findings},null,2)+'\n');
 assert.ok(findings[2].events.some(e=>e.type==='INSERT'));assert.ok(findings[2].events.some(e=>e.type==='UPDATE'));assert.ok(findings[2].events.some(e=>e.type==='DELETE'));
 pass('ADMIN positive controls receive committed INSERT, UPDATE and DELETE events from the actual logical-replication stream');
 for(const f of findings.slice(0,2))assert.equal(f.events.filter(e=>e.type!=='DELETE').length,0,'STAFF business row payload');
 pass('STAFF raw-table INSERT and UPDATE payloads remain blocked by the fixed-role RLS boundary');
 const deletes=findings.slice(0,2).flatMap(f=>f.events.filter(e=>e.type==='DELETE'));
 assert.equal(deletes.length,2,'Reproduce the original forbidden primary-key exposure before applying remediation');
 pass('Before-fix control reproduces forbidden DELETE primary keys for both STAFF identities');
 const originalFlags=sql("SELECT pubinsert||','||pubupdate||','||pubdelete||','||pubtruncate FROM pg_publication WHERE pubname='supabase_realtime'");
 const originalDefinitions=sql("SELECT string_agg(pg_get_functiondef(oid),E'\\n' ORDER BY oid) FROM pg_proc WHERE oid IN ('public.get_staff_login_context()'::regprocedure,'public.own_notifications_snapshot()'::regprocedure,'public.own_notifications_snapshot(integer,integer,boolean)'::regprocedure)");
 sql(fs.readFileSync('scripts/database/v1/183_safe_realtime_signals.sql','utf8'));
 assert.equal(sql("SELECT pubinsert AND pubupdate AND NOT pubdelete AND NOT pubtruncate FROM pg_publication WHERE pubname='supabase_realtime'"),'t');
 pass('Migration 183 applies atomically and retains published INSERT/UPDATE while replacing unsafe DELETE/TRUNCATE');
 for(const page of pages)await page.evaluate(async()=>{
  __realtimeEvents=[];window.__signalEvents=[];
  const db=getSupabaseClient();await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Signal subscription timeout')),20000);db.channel('signal-unfiltered-probe').on('postgres_changes',{event:'*',schema:'public',table:'workspace_signal'},p=>__signalEvents.push(p)).subscribe(s=>{if(s==='SUBSCRIBED'){clearTimeout(timer);resolve();}else if(['CHANNEL_ERROR','TIMED_OUT'].includes(s)){clearTimeout(timer);reject(Error('Signal subscribe '+s));}});});
 });
 sql(`INSERT INTO public.chat_message(id,conversation_id,sender_type,content,raw_content,sentiment_score) VALUES ('${id(16001)}','${id(30)}','bot','RT_FIXED_CANARY','RT_FIXED_PRIVATE_CANARY',1)`);
 await pages[2].waitForFunction(()=>__realtimeEvents.some(e=>e.type==='INSERT'&&e.new.content==='RT_FIXED_CANARY'));
 sql(`UPDATE public.chat_message SET content='RT_FIXED_CHANGED' WHERE id='${id(16001)}'`);await pages[2].waitForFunction(()=>__realtimeEvents.some(e=>e.type==='UPDATE'&&e.new.content==='RT_FIXED_CHANGED'));
 sql(`DELETE FROM public.chat_message WHERE id='${id(16001)}'`);
 await pages[2].waitForFunction(()=>__signalEvents.length>0);
 await new Promise(resolve=>setTimeout(resolve,1500));
 const after=[];
 for(let i=0;i<pages.length;i++){
  const actual=await pages[i].evaluate(()=>({events:__realtimeEvents,signals:__signalEvents}));
  assert.equal(actual.events.filter(e=>e.type==='DELETE').length,0);
  if(i<2)assert.equal(actual.events.length,0,'No forbidden STAFF business payload after fix');
  for(const signal of actual.signals){assert.equal(signal.new.auth_user_id,authId(i+1),'Unfiltered subscriber still sees only own signal');assert.deepEqual(Object.keys(signal.new).sort(),['auth_user_id','domain','revision','updated_at']);}
  const access=await pages[i].evaluate(async()=>{const db=getSupabaseClient();const read=await db.from('workspace_signal').select('*');const write=await db.from('workspace_signal').update({domain:'access'}).not('auth_user_id','is',null);return {rows:read.data,error:read.error,writeError:write.error};});
  assert.equal(access.error,null);assert.ok(access.rows.every(r=>r.auth_user_id===authId(i+1)));assert.ok(access.writeError,'Signals cannot be forged');
  after.push({actor:i+1,rawEventTypes:actual.events.map(e=>e.type),signalCount:actual.signals.length,signalKeys:actual.signals.map(s=>Object.keys(s.new)),ownRows:access.rows.length,writeDenied:!!access.writeError});
 }
 assert.ok(after[2].signalCount>0,'ADMIN refresh signal after DELETE');
 fs.writeFileSync(folder+'/after-fix-findings.txt',JSON.stringify({scope:'Actual isolated Auth/Realtime after migration 183',after},null,2)+'\n');
 pass('After-fix real transport suppresses all raw DELETE keys; ADMIN INSERT/UPDATE remain live and opaque DELETE refresh is delivered');
 pass('Unfiltered STAFF/ADMIN signal subscriptions and SELECT enforce own Auth identity; signal writes denied');
 const signalCounts=await Promise.all(pages.map(p=>p.evaluate(()=>__signalEvents.length)));
 sql(`BEGIN;SELECT pawpal_private.emit_workspace_signal(ARRAY['${authId(1)}']::uuid[],'chat');SELECT pawpal_private.emit_workspace_signal(ARRAY['${authId(1)}']::uuid[],'service');COMMIT;`);
 await pages[0].waitForFunction(n=>__signalEvents.length>n,signalCounts[0]);await new Promise(r=>setTimeout(r,700));
 assert.equal(await pages[0].evaluate(()=>__signalEvents.length),signalCounts[0]+1);
 assert.equal(await pages[1].evaluate(()=>__signalEvents.length),signalCounts[1]);
 pass('Multiple changes in one transaction coalesce to one own signal; the other unfiltered STAFF subscriber receives nothing');
 const email='rt-customer-'+Date.now()+'@example.invalid',password=require('node:crypto').randomBytes(24).toString('hex');
 const customerAuth=await serviceCaller.auth.admin.createUser({email,password,email_confirm:true});assert.equal(customerAuth.error,null);const customerAuthId=customerAuth.data.user.id;
 sql(`UPDATE public.customer SET auth_user_id='${customerAuthId}' WHERE id='${id(10)}'`);
 const config=await pages[0].evaluate(()=>SupabaseClientConfig),customerContext=await browser.newContext();contexts.push(customerContext);
 await customerContext.route('https://*.supabase.co/**',()=>{throw Error('Cloud customer request forbidden');});
 await customerContext.addInitScript(config=>{window.__PAWPAL_SUPABASE_CONFIG__={...config,required:true};},config);
 // A real local document preserves Chrome's loopback address-space classification for WebSocket access.
 const customer=await customerContext.newPage();await customer.goto(origin+'/components/fab/fab.html');await customer.addScriptTag({url:origin+'/scripts/vendor/supabase.js'});await customer.addScriptTag({url:origin+'/scripts/api/supabase-client.js'});
 await customer.evaluate(async({email,password})=>{const db=getSupabaseClient(),login=await db.auth.signInWithPassword({email,password});if(login.error)throw Error('Customer sign in failed');window.__customerRefresh=0;window.__customerSnapshotError=null;window.__customerChannel=db.channel('existing-wishlist-consumer').on('postgres_changes',{event:'*',schema:'public',table:'wishlist_service'},async()=>{const result=await db.rpc('own_notifications_snapshot');__customerSnapshotError=result.error?.code||null;__customerRefresh++;}).subscribe();},{email,password});
 try{await customer.waitForFunction(()=>getSupabaseClient().getChannels().some(c=>c.topic.includes('customer-workspace-')&&c.state==='joined'));}catch(error){fs.writeFileSync(folder+'/customer-diagnostics.txt',JSON.stringify(await customer.evaluate(async()=>{const db=getSupabaseClient(),result=await db.rpc('get_workspace_signal_context'),{data}=await db.auth.getSession();return {channels:db.getChannels().map(c=>({signal:c.topic.includes('customer-workspace-'),state:c.state})),endpoint:String(db.realtime.endPoint).split('?')[0],connectionState:db.realtime.connectionState(),capabilityError:result.error?.code,enabled:result.data?.enabled,identityMatches:result.data?.auth_user_id===data.session?.user?.id,status:SupabaseClientStatus};}),null,2));throw error;}
 const wishlist=sql(`INSERT INTO public.wishlist(customer_id) VALUES('${id(10)}') ON CONFLICT(customer_id) DO UPDATE SET updated_at=now() RETURNING id`),service=sql('SELECT id FROM public.service ORDER BY id LIMIT 1');
 sql(`INSERT INTO public.wishlist_service(wishlist_id,service_id) VALUES('${wishlist}','${service}') ON CONFLICT DO NOTHING`);
 await customer.waitForFunction(()=>__customerRefresh>0);await new Promise(r=>setTimeout(r,400));const beforeDelete=await customer.evaluate(()=>__customerRefresh);
 sql(`DELETE FROM public.wishlist_service WHERE wishlist_id='${wishlist}' AND service_id='${service}'`);
 await customer.waitForFunction(n=>__customerRefresh>n,beforeDelete);assert.equal(await customer.evaluate(()=>__customerSnapshotError),null);
 pass('Real customer Auth and shared client refetch the authorized snapshot after a wishlist child DELETE through an own signal');
 await customer.evaluate(async()=>{await getSupabaseClient().removeChannel(__customerChannel);});const removedCount=await customer.evaluate(()=>__customerRefresh);
 sql(`SELECT pawpal_private.emit_workspace_signal(ARRAY['${customerAuthId}']::uuid[],'refresh')`);await new Promise(r=>setTimeout(r,800));assert.equal(await customer.evaluate(()=>__customerRefresh),removedCount);
 pass('Removing a customer business channel also removes its signal refetch callback');
 await require('./admin_access_phase4_completion_cases.cjs')({session,sql,id,authId,origin,folder,pass,serviceCaller,installAssistantHandler});
 await pages[0].evaluate(async()=>{await PawpalAdminAccess.verify();window.__accessInvalidated=0;window.addEventListener('pawpal:access-invalidated',()=>__accessInvalidated++);});
 await pages[0].waitForFunction(()=>getSupabaseClient().getChannels().some(c=>c.topic.includes('workspace-')&&c.state==='joined'));
 sql(`UPDATE auth.users SET banned_until=now()+interval '1 hour' WHERE id='${authId(1)}'`);
 await pages[0].waitForFunction(()=>__accessInvalidated>0&&!document.documentElement.dataset.adminRole,{timeout:15000});
 pass('Auth suspension emits an opaque own signal and the actual Admin access listener invalidates the open STAFF UI without focus or polling');
 for(const context of contexts)await context.close();
 sql(`UPDATE auth.users SET banned_until=NULL WHERE id='${authId(1)}'`);
 await require('./admin_access_phase4_copilot_ui_cases.cjs')({session,sql,id,authId,origin,folder,pass,serviceCaller,installAssistantHandler,migrationsApplied:true});
 sql(fs.readFileSync('scripts/database/v1/183_safe_realtime_signals.rollback.sql','utf8'));
 assert.equal(sql("SELECT pubinsert||','||pubupdate||','||pubdelete||','||pubtruncate FROM pg_publication WHERE pubname='supabase_realtime'"),originalFlags);
 assert.equal(sql("SELECT string_agg(pg_get_functiondef(oid),E'\\n' ORDER BY oid) FROM pg_proc WHERE oid IN ('public.get_staff_login_context()'::regprocedure,'public.own_notifications_snapshot()'::regprocedure,'public.own_notifications_snapshot(integer,integer,boolean)'::regprocedure)"),originalDefinitions);
 assert.equal(sql("SELECT to_regclass('public.workspace_signal') IS NULL AND NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname IN ('v183_workspace_signal','v183_auth_signal'))"),'t');
 pass('Rollback restores original publication flags and exact capability function definitions and removes signal schema/triggers');
};
