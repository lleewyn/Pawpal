const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {browserPage,admin,service,ok,infra}=require('./customer_completion_helpers.cjs');
(async()=>{
 const {browser,page}=await browserPage(),id=randomUUID();let ticket;
 try {
  const customer=(await ok(service.from('customer').select('id').limit(1)))[0];
  await ok(service.from('chat_conversation').insert({id,customer_id:customer.id,status:'bot_handling',sentiment_level:2,sentiment_trend:'stable',channel:'web'}));
  const get=()=>ok(service.from('chat_conversation').select('*').eq('id',id).single());
  let c=await get();
  const args={p_id:randomUUID(),p_conversation_id:id,p_expected_updated_at:c.updated_at,p_ref_id:null,p_category:'order',p_subject:'Chat complaint verification',p_priority:'normal'};
  assert.equal((await admin.rpc('create_chat_complaint',args)).error.code,'42501');
  await ok(admin.rpc('act_admin_chat',{p_request_id:randomUUID(),p_conversation_id:id,p_expected_updated_at:c.updated_at,p_action:'take',p_content:''}));
  c=await get();args.p_expected_updated_at=c.updated_at;
  const foreignOrder=(await ok(service.from('sales_order').select('id').neq('customer_id',customer.id).limit(1)))[0];
  if(foreignOrder)assert.equal((await admin.rpc('create_chat_complaint',{...args,p_ref_id:foreignOrder.id})).error.code,'22023');
  await page.locator('[data-title="Chatbot"]').click();await page.waitForFunction(()=>window.PawpalChatbot?.state.liveLoaded);
  await page.evaluate(async id=>{sessionStorage.setItem('pawpal_admin_chatbot_conv_id',id);await PawpalChatbot.loadInboxSummary();},id);
  await page.locator('#btnChatActionsDots').click();await page.locator('#btnConvertToTicket').click();
  await page.locator('#inputConvertTicketTitle').fill(args.p_subject);
  await page.screenshot({path:infra+'/chat-complaint-v1.private.png'});
  await page.route('**/rest/v1/rpc/create_chat_complaint',route=>route.abort());
  await page.locator('#btnConfirmConvertTicket').click();await page.waitForFunction(()=>!document.getElementById('btnConfirmConvertTicket').disabled);
  assert.equal(await page.locator('#inputConvertTicketTitle').inputValue(),args.p_subject);
  await page.unroute('**/rest/v1/rpc/create_chat_complaint');
  await page.locator('#btnConfirmConvertTicket').click();await page.waitForFunction(()=>!document.getElementById('btnConfirmConvertTicket').disabled);
  ticket=(await ok(service.from('support_ticket').select('*').eq('customer_id',customer.id).eq('subject',args.p_subject)))[0];
  assert.ok(ticket);assert.ok(ticket.description.includes(id));assert.equal(ticket.priority,'normal');assert.equal(ticket.status,'pending');
  args.p_id=ticket.id;await ok(admin.rpc('create_chat_complaint',args));
  assert.equal((await admin.rpc('create_chat_complaint',{...args,p_subject:'Changed'})).error.code,'PT409');
  console.log('PASS chat complaint ownership, foreign-order rejection, browser save, network draft, source linkage and replay conflict.');
 }finally{await browser.close();if(ticket){await ok(service.from('support_ticket_message').delete().eq('ticket_id',ticket.id));await ok(service.from('support_ticket').delete().eq('id',ticket.id));}await ok(service.from('chat_message').delete().eq('conversation_id',id));await ok(service.from('chat_conversation').delete().eq('id',id));}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
