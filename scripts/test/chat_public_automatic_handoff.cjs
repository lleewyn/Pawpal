// Actual public gateway + optional installed SQL in a rollback-only transaction; no external AI calls.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createHandler}=require('../../api/admin-chat.js');
(async()=>{
 const samples=[],cases=[
  ['Tôi bị mất tiền khi thanh toán','billing_dispute'],
  ['Tôi bị trừ tiền MoMo nhưng đã hủy đơn và chưa được hoàn tiền','billing_dispute'],
  ['Bị trừ tiền VNPay rồi nhưng đơn chưa xác nhận','billing_dispute'],
  ['Tôi nhận hàng rồi nhưng shop giao sai hàng','service_complaint'],
  ['Hàng hỏng rồi shop ơi','service_complaint'],
  ['Hàng bị vỡ khi nhận','service_complaint'],
  ['Tôi muốn gặp nhân viên','direct_request'],
  ['Bé sau khi cắt tỉa bị chảy máu','medical_emergency'],
  ['Shop có dịch vụ tắm không?','normal']
 ];
 for(const [question,kind] of cases){
  const conversation=randomUUID(),owner=randomUUID(),calls=[];let models=0,faqReads=0;
  const service={auth:{getUser:async()=>({data:{user:{id:'auth-owner'}}})},from(table){
   const value=()=>table==='customer'?{id:owner}:table==='chat_conversation'?{id:conversation,customer_id:owner,status:'bot_handling',updated_at:'2026-10-27T00:00:00Z'}:table==='chat_message'?null:[];
   if(table==='chatbot_knowledge_faq')faqReads++;
   const q={select:()=>q,eq:()=>q,order:()=>q,limit:()=>q,maybeSingle:async()=>({data:value(),error:null}),then:resolve=>resolve({data:value(),error:null})};return q;
  },rpc:async(name,args)=>{calls.push(args);return {data:{},error:null};}};
  const handler=createHandler({serviceClient:service,generateReply:async()=>{models++;return 'PawPal có dịch vụ tắm. (Nguồn: chatbot_knowledge_faq)';}});
  const res={statusCode:200,setHeader(){},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
  await handler({method:'POST',headers:{authorization:'Bearer offline'},socket:{remoteAddress:conversation},body:{action:'public_send',conversationId:conversation,requestId:randomUUID(),question}},res);
  assert.equal(res.statusCode,200,JSON.stringify(res.body));assert.equal(calls.length,1);
  const handover=kind!=='normal';assert.equal(calls[0].p_handover,handover);assert.equal(models,handover?0:1);assert.equal(faqReads,handover?0:1);
  assert.ok(!/chatbot_knowledge_faq|\(Nguồn:/i.test(calls[0].p_reply));if(handover)assert.ok(calls[0].p_reply.includes('nhân viên'));
  samples.push({kind,args:calls[0]});
 }
 console.log('PASS 9 public gateway cases: financial/lost-money/MoMo/VNPay/delivery/damage/emergency/human request send handoff flag without FAQ/AI; ordinary FAQ stays automatic and source-free.');
 if(!process.argv.includes('--cloud'))return;
 const {connect}=require('../database/v1/service_import_connection.cjs');const db=await connect();let count=0;
 try{
  await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
  await db.query(fs.readFileSync('scripts/database/v1/124_chat_automatic_handoff.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
  const user=randomUUID(),staffUser=randomUUID(),owner=randomUUID(),staff=randomUUID();await db.query('INSERT INTO auth.users(id) VALUES($1),($2)',[user,staffUser]);await db.query('INSERT INTO public.customer(id,auth_user_id,customer_code) VALUES($1,$2,$3)',[owner,user,'QA-HANDOFF-'+owner]);
  await db.query("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES($1,$2,'QA handoff staff','QA','active',false)",[staff,staffUser]);await db.query('SET LOCAL ROLE service_role');
  const row=async id=>(await db.query('SELECT status,is_urgent,assigned_staff_id,sla_deadline::text,updated_at::text FROM public.chat_conversation WHERE id=$1',[id])).rows[0];
  for(const {kind,args:a} of samples){
   const chat=randomUUID(),msg=randomUUID();await db.query('SELECT public.open_public_chat($1,$2,NULL)',[chat,owner]);const before=await row(chat);
   const params=[msg,chat,before.updated_at,user,null,a.p_raw,a.p_content,a.p_toxic,a.p_level,a.p_reply,a.p_handover];
   for(let i=0;i<2;i++)await db.query('SELECT public.post_public_chat_message($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',params);
   const after=await row(chat);assert.equal(after.status,kind==='normal'?'bot_handling':'waiting_agent',kind);assert.equal(after.is_urgent,a.p_level>=4);assert.equal(after.assigned_staff_id,null);
   assert.equal(Number((await db.query('SELECT count(*) n FROM public.chat_message WHERE id=$1',[msg])).rows[0].n),1);
   if(kind!=='normal'){
    await db.query('SELECT public.post_public_chat_message($1,$2,$3,$4,NULL,$5,$5,false,2,NULL,false)',[randomUUID(),chat,after.updated_at,user,'QA follow-up']);const next=await row(chat);assert.equal(next.status,'waiting_agent');assert.equal(next.sla_deadline,after.sla_deadline);
   }
   count++;
  }
  // Existing deployed clients can omit the new optional parameter.
  const legacy=randomUUID();await db.query('SELECT public.open_public_chat($1,$2,NULL)',[legacy,owner]);let revision=await row(legacy);
  await db.query("SELECT public.post_public_chat_message($1,$2,$3,$4,NULL,'QA legacy billing','QA legacy billing',false,4,NULL)",[randomUUID(),legacy,revision.updated_at,user]);assert.equal((await row(legacy)).status,'waiting_agent');
  await db.query("UPDATE public.chat_conversation SET status='agent_handling',assigned_staff_id=$2 WHERE id=$1",[legacy,staff]);revision=await row(legacy);
  await db.query("SELECT public.post_public_chat_message($1,$2,$3,$4,NULL,'QA agent followup','QA agent followup',false,4,NULL,true)",[randomUUID(),legacy,revision.updated_at,user]);revision=await row(legacy);assert.equal(revision.status,'agent_handling');assert.equal(revision.assigned_staff_id,staff);
  await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query('ROLLBACK');
  fs.writeFileSync('docs/verification/sync/chat-automatic-handoff-rollback.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',cases:count,checks:['Actual gateway payloads save and route atomically','Normal message remains bot-handled','Retry creates no duplicate message','Follow-up keeps handoff deadline','Ten-argument legacy call remains valid','Assigned agent is preserved','All constraints pass'],scope:'Migration, synthetic owner/actor/conversations/messages all ROLLBACK; no external AI, real customer messages or Logs'},null,2)+'\n');
  console.log('PASS 9 live RPC handoff cases, atomic persistence, retries/deadline, legacy compatibility and assigned-agent preservation. All DDL and fixtures rolled back.');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}
})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
