const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {browserPage,admin,service,ok,infra}=require('./customer_completion_helpers.cjs');
(async()=>{
 const {browser,page}=await browserPage(),id=randomUUID();
 try {
  const customer=(await ok(service.from('customer').select('id').limit(1)))[0];
  await ok(service.from('chat_conversation').insert({id,customer_id:customer.id,status:'bot_handling',sentiment_level:2,sentiment_trend:'stable',channel:'web'}));
  const get=()=>ok(service.from('chat_conversation').select('*').eq('id',id).single());
  let c=await get();
  const request={p_request_id:randomUUID(),p_conversation_id:id,p_expected_updated_at:c.updated_at,p_reason:'resolved_complete',p_notes:'Resolution summary'};
  assert.equal((await admin.rpc('resolve_admin_chat',request)).error.code,'42501');
  await ok(admin.rpc('act_admin_chat',{p_request_id:randomUUID(),p_conversation_id:id,p_expected_updated_at:c.updated_at,p_action:'take',p_content:''}));
  c=await get();request.p_expected_updated_at=c.updated_at;
  await page.locator('[data-title="Chatbot"]').click();await page.waitForFunction(()=>window.PawpalChatbot?.state.liveLoaded);
  await page.evaluate(async id=>{sessionStorage.setItem('pawpal_admin_chatbot_conv_id',id);await PawpalChatbot.loadInboxSummary();},id);
  await page.locator('#btnHeaderResolveChat').click();
  await page.locator('#textareaResolveNotes').fill('Resolution summary');
  await page.screenshot({path:infra+'/chat-resolution-v1.private.png'});
  await page.route('**/rest/v1/rpc/resolve_admin_chat',route=>route.abort());
  await page.locator('#btnConfirmResolveChat').click();await page.waitForFunction(()=>!document.getElementById('btnConfirmResolveChat').disabled);
  assert.equal(await page.locator('#textareaResolveNotes').inputValue(),'Resolution summary');assert.equal((await get()).status,'agent_handling');
  await page.unroute('**/rest/v1/rpc/resolve_admin_chat');
  await page.locator('#btnConfirmResolveChat').click();
  await page.waitForFunction(()=>!document.getElementById('btnConfirmResolveChat').disabled);
  c=await get();assert.equal(c.status,'resolved');assert.equal(c.assigned_staff_id,null);assert.ok(c.resolved_by);assert.ok(c.resolved_at);assert.equal(c.resolved_reason,'resolved_complete');assert.equal(c.internal_note,'Resolution summary');
  const audit=(await ok(service.from('audit_log').select('id').eq('entity_id',id).eq('action','CHAT_ADMIN_RESOLVE')))[0];
  request.p_request_id=audit.id;
  await ok(admin.rpc('resolve_admin_chat',request));
  assert.equal((await admin.rpc('resolve_admin_chat',{...request,p_notes:'Changed'})).error.code,'PT409');
  assert.equal((await admin.rpc('resolve_admin_chat',{...request,p_request_id:randomUUID()})).error.code,'PT409');
  assert.equal((await ok(service.from('chat_message').select('id').eq('id',audit.id))).length,1);
  console.log('PASS resolution ownership, browser failure preserves draft, atomic persisted result, idempotency and conflicts.');
 }finally{await browser.close();await ok(service.from('chat_message').delete().eq('conversation_id',id));await ok(service.from('chat_conversation').delete().eq('id',id));}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
