// One synthetic conversation; all writes rolled back. Never sends real messages.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fs=require('node:fs');
if(!process.argv.includes('--cloud')){console.log('No network. Use --cloud for rollback-only chat checks.');process.exit(0);}
const {connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();let queries=0;const checks=[];
 const [a,b,ca,cb,s1,s2,u1,u2,chat,msg]=Array.from({length:10},()=>randomUUID());
 const q=async(sql,args)=>{queries++;return db.query(sql,args);};
 const actor=async(id,role='authenticated')=>{await q('RESET ROLE');await q("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[id,role]);await q('SET LOCAL ROLE '+role);};
 const denied=async(fn,codes)=>{await q('SAVEPOINT denied');let error;try{await fn();}catch(e){error=e;}await q('ROLLBACK TO SAVEPOINT denied');await q('RELEASE SAVEPOINT denied');assert.ok(error);assert.ok(codes.includes(error.code),'Unexpected SQLSTATE '+error.code);};
 const pass=name=>checks.push({name,status:'PASS'});
 const row=async()=>(await q('SELECT id,status,assigned_staff_id,internal_note,updated_at::text FROM public.chat_conversation WHERE id=$1',[chat])).rows[0];
 try{
  await q("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
  await q('INSERT INTO auth.users(id) VALUES($1),($2),($3),($4)',[a,b,u1,u2]);
  await q("INSERT INTO public.customer(id,auth_user_id,customer_code) VALUES($1,$2,$3),($4,$5,$6)",[ca,a,'E2E-CHAT-A-'+ca,cb,b,'E2E-CHAT-B-'+cb]);
  await q("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES($1,$2,'E2E Chat Agent1','QA','active',false),($3,$4,'E2E Chat Agent2','QA','active',false)",[s1,u1,s2,u2]);
  await q("INSERT INTO public.staff_role(staff_id,role_code) VALUES($1,'ADMIN'),($2,'ADMIN')",[s1,s2]);
  await actor('','service_role');for(let i=0;i<2;i++)assert.equal((await q('SELECT public.open_public_chat($1,$2,NULL) value',[chat,ca])).rows[0].value,chat);pass('Service gateway open retry uses one conversation for the same identity');
  await denied(()=>q('SELECT public.open_public_chat($1,$2,NULL)',[chat,cb]),['42501']);pass('Existing conversation cannot be reopened as another customer');
  for(let i=0;i<2;i++)await q("SELECT public.set_public_chat_mode($1,'waiting_agent')",[chat]);
  assert.equal((await row()).status,'waiting_agent');assert.equal(Number((await q("SELECT count(*) n FROM public.chat_message WHERE conversation_id=$1 AND sender_type='system'",[chat])).rows[0].n),1);pass('Handoff request retry keeps one waiting state and one system message');
  await actor(a);await denied(()=>q("SELECT public.set_public_chat_mode($1,'bot_handling')",[chat]),['42501']);await denied(()=>q("SELECT public.act_admin_chat($1,$2,$3,'take','')",[randomUUID(),chat,'2000-01-01T00:00:00Z']),['42501']);pass('Customer cannot bypass server gateway or take conversation as staff');
  await actor(u1);let c=await row();const take=randomUUID();for(let i=0;i<2;i++)await q("SELECT public.act_admin_chat($1,$2,$3,'take','')",[take,chat,c.updated_at]);c=await row();assert.equal(c.status,'agent_handling');assert.equal(c.assigned_staff_id,s1);pass('Agent take retry assigns one owner');
  await actor(u2);await denied(()=>q("SELECT public.act_admin_chat($1,$2,$3,'send','E2E wrong agent')",[randomUUID(),chat,c.updated_at]),['42501']);pass('Unassigned staff cannot send into another assigned conversation');
  await actor('','service_role');c=await row();
  for(let i=0;i<2;i++)await q("SELECT public.post_public_chat_message($1,$2,$3,$4,NULL,'E2E User message','E2E User message',false,2,NULL)",[msg,chat,c.updated_at,a]);
  assert.equal(Number((await q('SELECT count(*) n FROM public.chat_message WHERE id=$1',[msg])).rows[0].n),1);pass('Customer gateway message retry stores once during human handling without bot reply');
  await actor(u1);c=await row();const send=randomUUID();for(let i=0;i<2;i++)await q("SELECT public.act_admin_chat($1,$2,$3,'send','E2E Staff reply')",[send,chat,c.updated_at]);assert.equal(Number((await q('SELECT count(*) n FROM public.chat_message WHERE id=$1',[send])).rows[0].n),1);pass('Staff reply retry stores one public staff message');
  c=await row();const transfer=randomUUID();for(let i=0;i<2;i++)await q("SELECT public.transfer_admin_chat($1,$2,$3,$4,'E2E PRIVATE transfer note')",[transfer,chat,c.updated_at,s2]);c=await row();assert.equal(c.assigned_staff_id,s2);assert.ok(c.internal_note.includes('E2E PRIVATE'));assert.equal(Number((await q("SELECT count(*) n FROM public.chat_message WHERE conversation_id=$1 AND content LIKE '%E2E PRIVATE%'",[chat])).rows[0].n),0);pass('Transfer retry assigns new staff while private note never becomes public message');
  await denied(()=>q("SELECT public.act_admin_chat($1,$2,$3,'send','E2E former agent')",[randomUUID(),chat,c.updated_at]),['42501']);pass('Previous agent loses send permission after transfer');
  await actor(u2);const resolve=randomUUID();for(let i=0;i<2;i++)await q("SELECT public.resolve_admin_chat($1,$2,$3,'resolved_complete','E2E resolution',false)",[resolve,chat,c.updated_at]);assert.equal((await row()).status,'resolved');
  await actor('','service_role');await denied(()=>q("SELECT public.set_public_chat_mode($1,'waiting_agent')",[chat]),['PT409']);pass('Resolved conversation cannot silently reopen through mode request');
  await actor('','anon');await denied(()=>q('SELECT public.open_public_chat($1,$2,NULL)',[chat,ca]),['42501']);pass('Guest cannot invoke service-only chat creation RPC');
  await q('RESET ROLE');await q('ROLLBACK');const remains=(await q('SELECT EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=$1) OR EXISTS(SELECT 1 FROM public.chat_message WHERE conversation_id=$1) OR EXISTS(SELECT 1 FROM public.customer WHERE id=ANY($2::uuid[])) OR EXISTS(SELECT 1 FROM auth.users WHERE id=ANY($3::uuid[])) OR EXISTS(SELECT 1 FROM public.staff WHERE id=ANY($4::uuid[])) remains',[chat,[ca,cb],[a,b,u1,u2],[s1,s2]])).rows[0].remains;assert.equal(remains,false);pass('Rollback removes conversation, messages and all synthetic actors');
  fs.writeFileSync('docs/verification/sync/chat-handoff-cloud-rollback.txt',JSON.stringify({environment:'Supabase Cloud cpzuvaplseielhgcnqrn',timestamp:new Date().toISOString(),scope:'One conversation, two synthetic agents/customers; RPC/roles only; rollback; no real messaging or Logs',status:'PASS',queries,checks},null,2)+'\n');console.log('PASS',checks.length,'chat handoff checks;',queries,'SQL statements; rollback verified. Not HTTP/UI E2E.');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});console.error('Chat check failed after',checks.length,'checks:',e.code||'',e.message);process.exitCode=1;}finally{await db.end();}
})().catch(e=>{console.error(e.code||'connection_failed');process.exitCode=1;});
