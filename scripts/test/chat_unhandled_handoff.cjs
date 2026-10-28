// API signal/context tests and optional rollback-only SQL counter/routing verification.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {createHandler}=require('../../api/admin-chat.js'),{parseCustomerReply}=require('../api/chat_understanding.js');
(async()=>{
 assert.equal(parseCustomerReply('Tôi chưa đủ thông tin để trả lời câu hỏi của bạn.').understood,false);
 assert.equal(parseCustomerReply('Bạn muốn hỏi về điều gì?').understood,false);
 assert.equal(parseCustomerReply(JSON.stringify({reply:'Bạn cần nói rõ hơn.',understood:false})).understood,false);
 assert.equal(parseCustomerReply(JSON.stringify({reply:'Dịch vụ tắm có trong danh mục.',understood:true})).understood,true);
 assert.equal(parseCustomerReply('{broken').understood,false);
 const conversation=randomUUID(),owner=randomUUID(),calls=[],generated=[],historyRows=[{sender_type:'bot',content:'Bạn muốn hỏi về dịch vụ nào?'},{sender_type:'customer',content:'Tôi muốn hỏi dịch vụ tắm.'}];
 const service={auth:{getUser:async()=>({data:{user:{id:'auth-owner'}}})},from(table){
  const value=()=>table==='customer'?{id:owner}:table==='chat_conversation'?{id:conversation,customer_id:owner,status:'bot_handling',updated_at:'2026-10-27T00:00:00Z'}:table==='chat_message'?historyRows:[];
  const q={select:()=>q,eq:()=>q,order:()=>q,limit:n=>{if(table==='chat_message')assert.equal(n,8);return q;},maybeSingle:async()=>({data:table==='chat_message'?null:value(),error:null}),then:resolve=>resolve({data:value(),error:null})};return q;
 },rpc:async(name,args)=>{calls.push(args);return {data:{},error:null};}};
 const handler=createHandler({serviceClient:service,generateReply:async(...args)=>{generated.push(args);return JSON.stringify({reply:args[0]==='thì sao'?'Dịch vụ tắm có trong danh mục.':'Bạn vui lòng mô tả rõ hơn.',understood:args[0]==='thì sao'});}});
 const invoke=async question=>{const res={statusCode:200,setHeader(){},status(c){this.statusCode=c;return this;},json(v){this.body=v;return this;}};await handler({method:'POST',headers:{authorization:'Bearer offline'},socket:{remoteAddress:'offline-unhandled'},body:{action:'public_send',conversationId:conversation,requestId:randomUUID(),question}},res);assert.equal(res.statusCode,200,JSON.stringify(res.body));return calls.at(-1);};
 assert.equal((await invoke('????')).p_understood,false);assert.equal(generated.length,0);
 assert.equal((await invoke('&&WIU#HGOURE')).p_understood,false);assert.equal(generated.length,1);
 const answered=await invoke('thì sao');assert.equal(answered.p_understood,true);assert.equal(answered.p_reply,'Dịch vụ tắm có trong danh mục.');assert.deepEqual(generated.at(-1)[2],[{role:'user',content:'Tôi muốn hỏi dịch vụ tắm.'},{role:'model',content:'Bạn muốn hỏi về dịch vụ nào?'}]);
 console.log('PASS structured/legacy understanding signals, punctuation-only clarification without AI, malformed output handling, last 8 turns in correct order, follow-up context and understood RPC flag. No external AI calls.');
 if(!process.argv.includes('--cloud'))return;
 const {connect}=require('../database/v1/service_import_connection.cjs');const db=await connect();const checks=[];
 try{
  await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");await db.query(fs.readFileSync('scripts/database/v1/125_chat_unhandled_handoff.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
  const user=randomUUID(),owner=randomUUID();await db.query('INSERT INTO auth.users(id) VALUES($1)',[user]);await db.query('INSERT INTO public.customer(id,auth_user_id,customer_code) VALUES($1,$2,$3)',[owner,user,'QA-LOOP-'+owner]);
  // Isolate a threshold-policy branch inside this transaction; no rule changes are committed.
  await db.query("UPDATE public.chatbot_handover_rule SET is_active=false WHERE trigger_type='bot_loop' AND is_active");await db.query('SET LOCAL ROLE service_role');
  const row=async id=>(await db.query('SELECT status,bot_unhandled_count,is_urgent,sla_deadline::text,updated_at::text FROM public.chat_conversation WHERE id=$1',[id])).rows[0];
  const open=async()=>{const id=randomUUID();await db.query('SELECT public.open_public_chat($1,$2,NULL)',[id,owner]);return id;};
  const send=async(chat,understood,{request=randomUUID(),reply='Bạn vui lòng nói rõ hơn.',version}={})=>{
   const current=await row(chat);const args=[request,chat,version||current.updated_at,user,null,'QA question '+request,'QA question '+request,false,2,reply,false,understood];
   await db.query('SELECT public.post_public_chat_message($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',args);return {row:await row(chat),args};
  };
  const chat=await open();let r=await send(chat,false);assert.equal(r.row.bot_unhandled_count,1);assert.equal(r.row.status,'bot_handling');
  await db.query('SELECT public.post_public_chat_message($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)',r.args);assert.equal((await row(chat)).bot_unhandled_count,1);checks.push('Retry of one failed turn is counted once');
  r=await send(chat,false);assert.equal(r.row.bot_unhandled_count,2);assert.equal(r.row.status,'bot_handling');
  r=await send(chat,false);assert.equal(r.row.bot_unhandled_count,3);assert.equal(r.row.status,'waiting_agent');assert.equal(r.row.is_urgent,true);
  const last=(await db.query("SELECT content,metadata FROM public.chat_message WHERE conversation_id=$1 AND sender_type='bot' ORDER BY created_at DESC,id DESC LIMIT 1",[chat])).rows[0];assert.ok(last.content.includes('nhân viên'));assert.equal(last.metadata.handover_reason,'bot_loop');checks.push('Third consecutive failed turn hands off atomically and replaces repeat clarification with truthful transfer message');
  const deadline=r.row.sla_deadline;r=await send(chat,true,{reply:null});assert.equal(r.row.bot_unhandled_count,3);assert.equal(r.row.sla_deadline,deadline);checks.push('Waiting-agent follow-up preserves counter and original response deadline');
  await db.query("SELECT public.set_public_chat_mode($1,'bot_handling')",[chat]);assert.equal((await row(chat)).bot_unhandled_count,0);r=await send(chat,false);assert.equal(r.row.bot_unhandled_count,1);assert.equal(r.row.status,'bot_handling');checks.push('Explicit resume starts a fresh bot counter');
  const reset=await open();await send(reset,false);r=await send(reset,true,{reply:'Đây là câu trả lời phù hợp.'});assert.equal(r.row.bot_unhandled_count,0);r=await send(reset,false);assert.equal(r.row.bot_unhandled_count,1);r=await send(reset,false);assert.equal(r.row.status,'bot_handling');checks.push('Useful answer resets consecutive counter; another conversation is isolated');
  const rule=randomUUID();await db.query("INSERT INTO public.chatbot_handover_rule(id,condition_name,trigger_type,threshold_value,sla_seconds,is_active) VALUES($1,'QA loop threshold','bot_loop',2,60,true)",[rule]);
  const configured=await open();await send(configured,false);r=await send(configured,false);assert.equal(r.row.status,'waiting_agent');assert.equal(r.row.bot_unhandled_count,2);assert.ok(Math.abs(Date.parse(r.row.sla_deadline)-Date.now()-60000)<3000);checks.push('Active bot_loop threshold and response deadline override defaults');
  const invalid=await open();await db.query('SAVEPOINT invalid_flag');let failure;try{await send(invalid,null);}catch(e){failure=e;}await db.query('ROLLBACK TO SAVEPOINT invalid_flag');await db.query('RELEASE SAVEPOINT invalid_flag');assert.equal(failure?.code,'22023');assert.equal((await row(invalid)).bot_unhandled_count,0);checks.push('Invalid signal cannot alter counter');
  const legacy=await open(),old=await row(legacy);await db.query("SELECT public.post_public_chat_message($1,$2,$3,$4,NULL,'QA legacy','QA legacy',false,2,'Answer')",[randomUUID(),legacy,old.updated_at,user]);assert.equal((await row(legacy)).bot_unhandled_count,0);checks.push('Original ten-argument gateway remains compatible');
  await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query('ROLLBACK');fs.writeFileSync('docs/verification/sync/chat-unhandled-handoff-rollback.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',checks,scope:'Migration, counters, policy branch, synthetic actor/customer/conversations/messages all ROLLBACK; no AI calls or Logs'},null,2)+'\n');
  console.log('PASS '+checks.length+' live SQL counter/handoff assertions; all DDL, rule changes and fixtures rolled back.');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}
})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
