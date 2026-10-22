const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {browserPage,admin,service,ok,infra}=require('./customer_completion_helpers.cjs');
(async()=>{
 const {browser,page}=await browserPage(),id=randomUUID();
 try {
  const order=(await ok(service.from('sales_order').select('customer_id').not('customer_id','is',null).limit(1)))[0];
  const customer=order ? {id:order.customer_id} : (await ok(service.from('customer').select('id').limit(1)))[0];
  await ok(service.from('chat_conversation').insert({id,customer_id:customer.id,status:'bot_handling',sentiment_level:2,sentiment_trend:'stable',channel:'web'}));
  await page.locator('[data-title="Chatbot"]').click();await page.waitForFunction(()=>window.PawpalChatbot?.state.liveLoaded);
  await page.evaluate(async id=>{sessionStorage.setItem('pawpal_admin_chatbot_conv_id',id);await PawpalChatbot.loadInboxSummary();},id);
  await page.locator('#btnChatActionsDots').click();await page.locator('#btnRewardPoints').click();
  await page.locator('#inputCustomRewardPoints').fill('5');
  await page.screenshot({path:infra+'/chat-points-v1.private.png'});
  await page.route('**/rest/v1/rpc/adjust_customer_points',r=>r.abort());
  await page.locator('#btnConfirmRewardPoints').click();await page.waitForFunction(()=>!document.getElementById('btnConfirmRewardPoints').disabled);
  assert.equal(await page.locator('#inputCustomRewardPoints').inputValue(),'5');
  await page.locator('#btnCancelRewardPoints').click();
  const c=await ok(service.from('chat_conversation').select('updated_at').eq('id',id).single());
  await ok(admin.rpc('act_admin_chat',{p_request_id:randomUUID(),p_conversation_id:id,p_expected_updated_at:c.updated_at,p_action:'take',p_content:''}));
  await page.evaluate(()=>PawpalChatbot.loadInboxSummary());
  await page.locator('#btnChatActionsDots').click();await page.locator('#btnEscalateManager').click();
  await page.locator('#selectEscalateTarget').fill('No available match');
  await page.screenshot({path:infra+'/chat-transfer-v1.private.png'});
  const locked=(await ok(service.from('staff').select('id').eq('must_change_password',true).limit(1)))[0];
  if(locked){const now=await ok(service.from('chat_conversation').select('updated_at').eq('id',id).single());assert.equal((await admin.rpc('transfer_admin_chat',{p_request_id:randomUUID(),p_conversation_id:id,p_expected_updated_at:now.updated_at,p_staff_id:locked.id,p_note:'Must reject locked staff'})).error.code,'22023');}
  await page.locator('#btnDismissEscalateModal').click();
  await page.locator('#btnOpenCannedModal').click();
  await page.waitForFunction(()=>document.getElementById('cannedResponsesList')?.textContent?.trim().length>0);
  await page.screenshot({path:infra+'/chat-canned-v1.private.png'});
  await page.locator('#btnCloseCannedModalBottom').click();
  if(await page.locator('.chat-order-info').isVisible()){
   await page.locator('.chat-order-info').click();
   await page.waitForFunction(()=>document.getElementById('trackingOrderSummary')?.textContent !== 'Đang tải...');
   await page.screenshot({path:infra+'/chat-order-v1.private.png'});
  }
  console.log('PASS manual point modal, failure retains draft; no ledger writes performed.');
 }finally{await browser.close();await ok(service.from('chat_message').delete().eq('conversation_id',id));await ok(service.from('chat_conversation').delete().eq('id',id));}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
