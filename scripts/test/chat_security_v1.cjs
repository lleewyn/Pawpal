const assert=require('node:assert/strict'),{randomUUID,createHash}=require('node:crypto');
const {browserPage,admin,service,ok}=require('./customer_completion_helpers.cjs');
const {createHandler}=require('../../api/admin-chat.js');
(async()=>{
 const {browser}=await browserPage(),id=randomUUID(),guest=randomUUID(),secret=randomUUID(),foreignSession=randomUUID();
 try{
  await ok(service.from('guest_session').insert({id:guest,token_hash:createHash('sha256').update(secret).digest('hex'),expires_at:new Date(Date.now()+3600000).toISOString()}));
  await ok(service.from('chat_conversation').insert({id,guest_session_id:guest,status:'bot_handling',sentiment_level:2,sentiment_trend:'stable',channel:'web'}));
  const at=new Date().toISOString();await ok(service.from('chat_message').insert(Array.from({length:35},(_,i)=>({id:randomUUID(),conversation_id:id,sender_type:'system',content:'Cursor '+i,raw_content:'Restricted original',is_toxic:false,sentiment_score:0,created_at:at}))));
  const first=await ok(admin.rpc('get_admin_chat_messages',{p_conversation:id})),last=first.at(-1);
  const second=await ok(admin.rpc('get_admin_chat_messages',{p_conversation:id,p_before_at:last.created_at,p_before_id:last.id}));
  assert.equal(first.length,30);assert.equal(second.length,5);assert.equal(new Set([...first,...second].map(m=>m.id)).size,35);assert.ok(first.every(m=>!('raw_content'in m)));
  assert.ok((await admin.from('chat_message').select('raw_content').eq('conversation_id',id)).error);
  assert.equal(await ok(admin.rpc('read_admin_chat_raw',{p_message_id:first[0].id})),'Restricted original');
  assert.ok((await admin.from('chat_conversation').update({status:'resolved'}).eq('id',id)).error);
  const get=()=>ok(service.from('chat_conversation').select('updated_at').eq('id',id).single());
  await ok(admin.rpc('act_admin_chat',{p_request_id:randomUUID(),p_conversation_id:id,p_expected_updated_at:(await get()).updated_at,p_action:'take',p_content:''}));
  await ok(admin.rpc('resolve_admin_chat',{p_request_id:randomUUID(),p_conversation_id:id,p_expected_updated_at:(await get()).updated_at,p_reason:'resolved_complete',p_notes:'Guest verification',p_send_survey:true}));
  assert.equal((await ok(service.from('chat_message').select('id').eq('conversation_id',id).eq('metadata->>type','csat_invitation'))).length,1);
  const handler=createHandler({serviceClient:service,verify:async()=>({authorized:false,status:401,message:'Unauthorized'})});
  const call=async body=>{let status=200,result;await handler({method:'POST',body,headers:{}},{setHeader(){},status(n){status=n;return this;},json(value){result=value;}});return {status,result};};
  const body={action:'feedback',conversationId:id,sessionToken:secret,score:3,comment:'Guest verification feedback'};
  assert.equal((await call({...body,sessionToken:randomUUID()})).status,403);assert.equal((await call({...body,score:6})).status,400);
  assert.equal((await call(body)).status,200);assert.equal((await call(body)).status,200);assert.equal((await call({...body,score:4})).status,409);
  assert.equal((await ok(service.from('chat_feedback').select('score').eq('conversation_id',id).single())).score,3);
  const context=await ok(admin.rpc('get_staff_login_context'));
  const other=(await ok(service.from('staff').select('id').neq('id',context.staff.id).limit(1)))[0];
  await ok(service.from('admin_copilot_history').insert({session_id:foreignSession,staff_id:other.id,role:'user',content:'Private other-staff conversation'}));
  assert.equal((await ok(admin.from('admin_copilot_history').select('id').eq('session_id',foreignSession))).length,0);
  await ok(admin.rpc('delete_admin_copilot_session',{p_session:foreignSession}));assert.equal((await ok(service.from('admin_copilot_history').select('id').eq('session_id',foreignSession))).length,1);
  console.log('PASS equal-timestamp history cursor, restricted originals, audited raw read, denied direct writes, invited guest feedback ownership/validation/replay and cross-staff history isolation.');
 }finally{
  await browser.close();await ok(service.from('admin_copilot_history').delete().eq('session_id',foreignSession));await ok(service.from('chat_feedback').delete().eq('conversation_id',id));await ok(service.from('chat_message').delete().eq('conversation_id',id));await ok(service.from('chat_conversation').delete().eq('id',id));await ok(service.from('guest_session').delete().eq('id',guest));
 }
})().catch(e=>{console.error(e.stack);process.exitCode=1});
