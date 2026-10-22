// Read-only checks against restored V1; no messages are fabricated or written.
const assert=require('node:assert/strict');
const {browserPage,admin,service,ok,infra,token}=require('./customer_completion_helpers.cjs');
const {randomUUID}=require('node:crypto');
(async()=>{
 const {browser,page}=await browserPage();
 try{
  const inbox=await ok(admin.rpc('get_admin_chat_inbox',{p_limit:100,p_offset:0}));
  for(const conversation of inbox){
   const messages=await ok(service.from('chat_message').select('id,content,created_at').eq('conversation_id',conversation.id).order('created_at',{ascending:false}).order('id',{ascending:false}).limit(1));
   assert.equal(conversation.latest_message?.id || null,messages[0]?.id || null);
   assert.equal(JSON.stringify(conversation).includes('raw_content'),false);
  }
  assert.equal((await admin.rpc('get_admin_chat_inbox',{p_limit:101,p_offset:0})).error.code,'22023');
  const denied=await fetch('http://localhost:8011/rpc/get_admin_chat_inbox',{method:'POST',headers:{Authorization:'Bearer '+token(randomUUID()),'Content-Type':'application/json'},body:JSON.stringify({p_limit:50,p_offset:0})});assert.equal(denied.status,403);
  const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
  await page.locator('[data-title="Chatbot"]').click();await page.waitForFunction(()=>window.PawpalChatbot?.state.liveLoaded);
  const actual=await page.evaluate(()=>PawpalChatbot.state.liveConversations.map(c=>c.id));
  assert.deepEqual(actual,inbox.slice(0,50).map(c=>c.id));
  await page.waitForTimeout(700);assert.deepEqual(errors,[]);
  await page.screenshot({path:infra+'/chat-inbox-v1.private.png'});
  console.log(`PASS ${inbox.length} inbox previews match actual latest messages; no raw content; bounds and non-staff rejected; browser source identities and REST/JS clean.`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
