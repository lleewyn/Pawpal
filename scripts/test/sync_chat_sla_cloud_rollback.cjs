// One synthetic conversation, rule fixtures and agents. Always rollback; no real messages.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fs=require('node:fs');
if(!process.argv.includes('--cloud')){console.log('No network. Use --cloud for rollback-only SLA rule checks.');process.exit(0);}
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();let queries=0;const checks=[];
 const [a,u,ca,staff,chat,slow,fast,inactive,unrelated]=Array.from({length:9},()=>randomUUID());
 const q=async(sql,args)=>{queries++;return db.query(sql,args);};
 const actor=async(id,role='authenticated')=>{await q('RESET ROLE');await q("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[id,role]);await q('SET LOCAL ROLE '+role);};
 const denied=async(fn,codes)=>{await q('SAVEPOINT denied');let error;try{await fn();}catch(e){error=e;}await q('ROLLBACK TO SAVEPOINT denied');await q('RELEASE SAVEPOINT denied');assert.ok(error);assert.ok(codes.includes(error.code),'Unexpected SQLSTATE '+error.code);};
 const pass=name=>checks.push({name,status:'PASS'});
 const row=async()=>(await q('SELECT id,status,assigned_staff_id,sla_deadline::text deadline,updated_at::text revision FROM public.chat_conversation WHERE id=$1',[chat])).rows[0];
 const mode=async value=>q('SELECT public.set_public_chat_mode($1,$2)',[chat,value]);
 const expected=async()=>(await q("SELECT min(sla_seconds) seconds FROM public.chatbot_handover_rule WHERE is_active AND trigger_type='direct_request'")).rows[0].seconds;
 const handoff=async()=>{
  const seconds=await expected(),before=Date.now();await mode('waiting_agent');const c=await row(),after=Date.now();
  if(seconds===null)assert.equal(c.deadline,null);else{const deadline=Date.parse(c.deadline);assert.ok(deadline>=before+seconds*1000-2000&&deadline<=after+seconds*1000+2000,'Deadline must be based on the rule and server clock');}
  return c;
 };
 try{
  await q("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
  await q('INSERT INTO auth.users(id) VALUES($1),($2)',[a,u]);
  await q('INSERT INTO public.customer(id,auth_user_id,customer_code) VALUES($1,$2,$3)',[ca,a,'E2E-SLA-'+ca]);
  await q("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES($1,$2,'E2E SLA Agent','QA','active',false)",[staff,u]);
  await q("INSERT INTO public.staff_role(staff_id,role_code) VALUES($1,'ADMIN')",[staff]);
  await actor('','service_role');await q('SELECT public.open_public_chat($1,$2,NULL)',[chat,ca]);
  const initial=await expected();
  await q("INSERT INTO public.chatbot_handover_rule(id,condition_name,trigger_type,threshold_value,auto_assign_role,sla_seconds,is_active) VALUES($1,'E2E unrelated','keyword',0,'ADMIN',0,true),($2,'E2E inactive','direct_request',0,'ADMIN',0,false)",[unrelated,inactive]);
  const installed=(await q("SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='public.chat_conversation'::regclass AND tgname='v1_chat_handoff_sla') value")).rows[0].value;
  let baseline='already_installed';
  if(!installed){
   await q('SAVEPOINT reproduce');await q("INSERT INTO public.chatbot_handover_rule(id,condition_name,trigger_type,threshold_value,auto_assign_role,sla_seconds) VALUES($1,'E2E direct rule','direct_request',0,'ADMIN',120)",[fast]);
   await mode('waiting_agent');assert.equal((await row()).deadline,null);baseline='REPRODUCED: active direct_request rule did not set SLA before migration';await q('ROLLBACK TO SAVEPOINT reproduce');await q('RELEASE SAVEPOINT reproduce');
  }
  await q('RESET ROLE');const migration=fs.readFileSync('scripts/database/v1/109_chat_handoff_sla.sql','utf8').replace(/^BEGIN;/,'').replace('COMMIT;','');assert.ok(!/\b(?:BEGIN|COMMIT)\s*;/i.test(migration));await q(migration);
  await actor('','service_role');let c=await handoff();assert.equal(await expected(),initial);pass('Inactive and unrelated rules do not create a fallback SLA; no configuration stays NULL');
  await mode('bot_handling');assert.equal((await row()).deadline,null);pass('Returning to bot clears stale SLA');
  await q("INSERT INTO public.chatbot_handover_rule(id,condition_name,trigger_type,threshold_value,auto_assign_role,sla_seconds) VALUES($1,'E2E slow direct','direct_request',0,'ADMIN',300),($2,'E2E fast direct','direct_request',0,'ADMIN',120)",[slow,fast]);
  c=await handoff();assert.equal(c.assigned_staff_id,null);assert.equal(await expected(),Math.min(initial??300,120));pass('Waiting deadline follows strictest active direct_request SLA; no arbitrary staff assignment');
  const first=c.deadline,revision=c.revision;
  await mode('waiting_agent');c=await row();assert.equal(c.deadline,first);assert.equal(c.revision,revision);pass('Handoff retry neither extends deadline nor changes revision');
  await q('UPDATE public.chatbot_handover_rule SET sla_seconds=60 WHERE id=$1',[fast]);await mode('waiting_agent');assert.equal((await row()).deadline,first);pass('Editing rule does not rewrite an already-waiting deadline');
  const message=randomUUID();await q("SELECT public.post_public_chat_message($1,$2,$3,$4,NULL,'E2E followup','E2E followup',false,2,NULL)",[message,chat,c.revision,a]);assert.equal((await row()).deadline,first);pass('Customer followup does not reset first-response deadline');
  await actor(a);await denied(()=>mode('bot_handling'),['42501']);await denied(()=>q('SELECT pawpal_private.set_chat_handoff_sla()'),['42501']);pass('Customer cannot call service-only mode RPC or private trigger function');
  await actor(u);c=await row();await q("SELECT public.act_admin_chat($1,$2,$3,'take','')",[randomUUID(),chat,c.revision]);assert.equal((await row()).deadline,first);pass('Agent take preserves historical waiting deadline for audit');
  c=await row();await q("SELECT public.act_admin_chat($1,$2,$3,'release','')",[randomUUID(),chat,c.revision]);assert.equal((await row()).deadline,null);pass('Admin release to bot also clears deadline through the same trigger');
  await actor('','service_role');c=await handoff();assert.equal(await expected(),Math.min(initial??60,60));pass('New handoff uses updated rule, not previous frozen deadline');
  await mode('bot_handling');await q('UPDATE public.chatbot_handover_rule SET sla_seconds=0 WHERE id=$1',[fast]);c=await handoff();assert.equal(await expected(),0);assert.ok(Date.parse(c.deadline)<=Date.now()+2000);pass('Zero-second SLA means immediate response, not missing configuration');
  await actor('','anon');await denied(()=>mode('bot_handling'),['42501']);pass('Guest cannot bypass service gateway to change SLA');
  await q('RESET ROLE');await q('ROLLBACK');const remains=(await q('SELECT EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=$1) OR EXISTS(SELECT 1 FROM public.customer WHERE id=$2) OR EXISTS(SELECT 1 FROM auth.users WHERE id=ANY($3::uuid[])) OR EXISTS(SELECT 1 FROM public.chatbot_handover_rule WHERE id=ANY($4::uuid[])) remains',[chat,ca,[a,u],[slow,fast,inactive,unrelated]])).rows[0].remains;assert.equal(remains,false);pass('Rollback removes conversation, rules and actors; migration DDL not committed');
  fs.writeFileSync('docs/verification/sync/chat-sla-cloud-rollback.txt',JSON.stringify({timestamp:new Date().toISOString(),environment:'Supabase Cloud cpzuvaplseielhgcnqrn',status:'PASS',baseline,checks,queries,scope:'Direct customer handoff SLA only; synthetic rules/conversation, role claims over SQL, always rollback; no existing rules changed, real messages, Logs, automatic matching or staff assignment'},null,2)+'\n');console.log('PASS',checks.length,'SLA rule checks;',queries,'SQL; fixtures/DDL rolled back.');
 }catch(error){await db.query('ROLLBACK').catch(()=>{});console.error('SLA check failed after',checks.length,'checks:',error.code||'',error.message);process.exitCode=1;}finally{await db.end();}
})().catch(error=>{console.error(error.code||'connection_failed');process.exitCode=1;});
