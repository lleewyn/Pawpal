const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {browserPage,admin,service,ok,infra}=require('./customer_completion_helpers.cjs');
const {createHandler}=require('../../api/admin-chat.js');
(async()=>{
 const {browser,page:adminPage}=await browserPage();const context=await browser.newContext({viewport:{width:1100,height:900}}),page=await context.newPage();let conversation,guest;
 try{
  const handler=createHandler({serviceClient:service,generateReply:async()=> 'Verified public FAQ response'});
  const call=async body=>{let status=200,result;await handler({method:'POST',body,headers:{}},{setHeader(){},status(n){status=n;return this;},json(value){result=value;}});return {status,result};};
  await page.route('**/api/admin-chat',async route=>{const result=await call(route.request().postDataJSON());await route.fulfill({status:result.status,contentType:'application/json',body:JSON.stringify(result.result)});});
  await page.goto('http://localhost:3001/components/fab/fab.html');await page.addStyleTag({url:'http://localhost:3001/components/fab/fab.css'});await page.addScriptTag({url:'http://localhost:3001/components/fab/fab.js'});
  await page.locator('#fabAiBtn').click();await page.locator('#fabChatInput').fill('Public verification <img src=x onerror=window.__publicXss=1>');await page.locator('#fabChatSend').click();
  await page.waitForFunction(()=>document.getElementById('fabChatMessages').textContent.includes('Verified public FAQ response'));
  assert.equal(await page.evaluate(()=>window.__publicXss),undefined);
  conversation=await page.evaluate(()=>sessionStorage.getItem('pawpal_chat_active_guest'));
  const c=await ok(service.from('chat_conversation').select('*').eq('id',conversation).single());guest=c.guest_session_id;assert.ok(guest);assert.equal(c.customer_id,null);
  assert.equal((await call({action:'public_read',conversationId:conversation,sessionToken:randomUUID()})).status,403);
  await page.locator('#fabHandoverBtn').click();await page.waitForFunction(()=>document.getElementById('fabChatStatus').textContent.includes('Đang chờ'));
  let current=await ok(service.from('chat_conversation').select('updated_at').eq('id',conversation).single());
  await ok(admin.rpc('act_admin_chat',{p_request_id:randomUUID(),p_conversation_id:conversation,p_expected_updated_at:current.updated_at,p_action:'take',p_content:''}));
  current=await ok(service.from('chat_conversation').select('updated_at').eq('id',conversation).single());
  await ok(admin.rpc('act_admin_chat',{p_request_id:randomUUID(),p_conversation_id:conversation,p_expected_updated_at:current.updated_at,p_action:'send',p_content:'Verified staff reply to guest'}));
  await page.waitForFunction(()=>document.getElementById('fabChatMessages').textContent.includes('Verified staff reply to guest'),{timeout:20000});
  current=await ok(service.from('chat_conversation').select('updated_at').eq('id',conversation).single());
  await ok(admin.rpc('resolve_admin_chat',{p_request_id:randomUUID(),p_conversation_id:conversation,p_expected_updated_at:current.updated_at,p_reason:'resolved_complete',p_notes:'Public verification complete',p_send_survey:true}));
  await page.locator('.fab-feedback-score').waitFor({timeout:20000});await page.locator('.fab-feedback-score').selectOption('4');await page.locator('.fab-feedback-comment').fill('Verified guest feedback');
  await page.screenshot({path:infra+'/chat-public-v1.private.png'});
  await page.locator('.fab-csat-submit-btn').click();await page.waitForFunction(()=>document.getElementById('fabChatMessages').textContent.includes('đã nhận đánh giá'));
  assert.equal((await ok(service.from('chat_feedback').select('score').eq('conversation_id',conversation).single())).score,4);
  console.log('PASS public guest creation, bot persistence, denied foreign owner, human handover, staff reply delivery and invited guest rating from browser.');
 }finally{await context.close();await browser.close();if(conversation){await ok(service.from('chat_feedback').delete().eq('conversation_id',conversation));await ok(service.from('chat_moderation_log').delete().eq('conversation_id',conversation));await ok(service.from('chat_message').delete().eq('conversation_id',conversation));await ok(service.from('chat_conversation').delete().eq('id',conversation));}if(guest)await ok(service.from('guest_session').delete().eq('id',guest));}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
