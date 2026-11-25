// Explicit user-approved business configuration, not a schema migration or default seed.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),{connect}=require('./service_import_connection.cjs');
if(!process.argv.includes('--apply-cloud')){console.log('No network. Use --apply-cloud only after user approval of the five-minute SLA.');process.exit(0);}
const id='b739d239-155d-43af-b8e5-8ab77cbfd678';
(async()=>{const db=await connect();let applied=false;try{
 await db.query("SET statement_timeout='8s';SET lock_timeout='3s';BEGIN");
 await db.query("SELECT pg_advisory_xact_lock(hashtextextended('pawpal-approved-direct-handoff-sla',109))");
 const fingerprint=async()=> (await db.query("SELECT count(*)::integer n,md5(coalesce(string_agg(id::text||updated_at::text||coalesce(sla_deadline::text,'NULL'),'|' ORDER BY id),'')) hash FROM public.chat_conversation")).rows[0];
 const before=await fingerprint();
 const active=(await db.query("SELECT id,sla_seconds FROM public.chatbot_handover_rule WHERE trigger_type='direct_request' AND is_active")).rows;
 assert.ok(active.length===0||(active.length===1&&active[0].id===id&&active[0].sla_seconds===300),'Unexpected existing direct rules: stop without replacing business configuration');
 let created=false;
 if(!active.length){
  const credential=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8'),email=credential.match(/^Email: (.+)$/m)[1].trim();
  const actor=(await db.query('SELECT s.id FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id WHERE lower(u.email)=lower($1) AND s.employment_status=\'active\'',[email])).rows[0];assert.ok(actor);
  await db.query("INSERT INTO public.chatbot_handover_rule(id,condition_name,trigger_type,threshold_value,auto_assign_role,sla_seconds,is_active) VALUES($1,$2,'direct_request',0,NULL,300,true)",[id,'Khách yêu cầu gặp chuyên viên']);
  await db.query("INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES($1,'CONFIGURE_CHAT_SLA','chatbot_handover_rule',$2,$3)",[actor.id,id,JSON.stringify({source:'explicit user approval 2026-10-26',sla_seconds:300,trigger_type:'direct_request',existing_conversations_changed:false,automatic_assignment:false})]);created=true;
 }
 assert.deepEqual(await fingerprint(),before);await db.query('COMMIT');applied=true;
 // One rollback-only conversation proves the installed rule without messaging real users.
 await db.query('BEGIN');const uid=randomUUID(),customer=randomUUID(),chat=randomUUID();
 await db.query('INSERT INTO auth.users(id) VALUES($1)',[uid]);await db.query('INSERT INTO public.customer(id,auth_user_id,customer_code) VALUES($1,$2,$3)',[customer,uid,'E2E-SLA-'+customer]);
 await db.query("SELECT set_config('request.jwt.claim.role','service_role',true)");await db.query('SET LOCAL ROLE service_role');
 await db.query('SELECT public.open_public_chat($1,$2,NULL)',[chat,customer]);await db.query("SELECT public.set_public_chat_mode($1,'waiting_agent')",[chat]);
 const first=(await db.query('SELECT sla_deadline::text deadline,extract(epoch FROM(sla_deadline-clock_timestamp())) remaining,assigned_staff_id FROM public.chat_conversation WHERE id=$1',[chat])).rows[0];assert.ok(Number(first.remaining)>290&&Number(first.remaining)<=300);assert.equal(first.assigned_staff_id,null);
 await db.query("SELECT public.set_public_chat_mode($1,'waiting_agent')",[chat]);const second=(await db.query('SELECT sla_deadline::text deadline FROM public.chat_conversation WHERE id=$1',[chat])).rows[0];assert.equal(second.deadline,first.deadline);
 await db.query('RESET ROLE');await db.query('ROLLBACK');assert.deepEqual(await fingerprint(),before);
 assert.equal((await db.query('SELECT EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=$1) OR EXISTS(SELECT 1 FROM auth.users WHERE id=$2) remains',[chat,uid])).rows[0].remains,false);
 const evidence={timestamp:new Date().toISOString(),status:'PASS',environment:'Supabase Cloud cpzuvaplseielhgcnqrn',configuration:{id,trigger_type:'direct_request',sla_seconds:300,is_active:true,auto_assign_role:null},created,checks:{existingConversationsUnchanged:true,newHandoffDeadlineFiveMinutes:true,retryKeepsDeadline:true,noAutomaticAssignment:true,rollbackFixtureRemoved:true},existingConversationCount:before.n,scope:'One approved persistent SLA rule and configuration audit; one rollback-only synthetic handoff, no existing chat writes, no Logs or load test'};
 fs.writeFileSync('docs/verification/sync/chat-sla-5min-cloud.txt',JSON.stringify(evidence,null,2)+'\n');console.log('PASS: five-minute direct handoff SLA configured; old conversations unchanged; new deadline/retry verified; fixture rolled back.');
}catch(e){await db.query('RESET ROLE').catch(()=>{});await db.query('ROLLBACK').catch(()=>{});console.error('SLA configuration/check failed:',e.code||e.name,e.message,'configurationCommitted='+applied);process.exitCode=1;}finally{await db.end();}})().catch(e=>{console.error(e.code||e.name);process.exitCode=1;});
