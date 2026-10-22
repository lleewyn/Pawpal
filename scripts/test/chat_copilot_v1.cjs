const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {browserPage,admin,service,ok,infra}=require('./customer_completion_helpers.cjs');
const {createHandler}=require('../../api/admin-chat.js');
(async()=>{
 const {browser,page}=await browserPage();let session,benchmarkBefore;
 try{
  const context=await ok(admin.rpc('get_staff_login_context'));const auth={authorized:true,caller:admin,staff:{...context.staff,permissions:context.staff.permission_codes},user:{id:context.staff.auth_user_id}};
  let generations=0;const handler=createHandler({verify:async()=>auth,serviceClient:service,generateReply:async(question,data)=>{generations++;assert.ok(data.chatbot_knowledge_faq);return 'Stage verification response';}});
  const call=async(method,body)=>{let status=200,result;await handler({method,body,query:{}},{setHeader(){},status(n){status=n;return this;},json(data){result=data;}});return {status,result};};
  const body={requestId:randomUUID(),sessionId:randomUUID(),question:'Stage verification question'};session=body.sessionId;
  assert.equal((await call('POST',body)).status,200);assert.equal((await call('POST',body)).result.replayed,true);assert.equal(generations,1);
  assert.equal((await call('POST',{...body,question:'Changed'})).status,409);
  assert.equal((await ok(service.from('admin_copilot_history').select('id').eq('session_id',session))).length,2);
  benchmarkBefore=await ok(service.from('chatbot_scenario_matrix').select('id,benchmark_status'));
  const benchmark=await call('POST',{action:'benchmark'});assert.equal(benchmark.status,200);assert.equal(benchmark.result.summary.total,benchmarkBefore.length);
  const tools=await ok(service.from('chatbot_scenario_matrix').select('benchmark_status').not('expected_tool_call','is',null).neq('expected_tool_call',''));assert.ok(tools.every(row=>row.benchmark_status==='pending'));
  await page.route('**/api/admin-chat*',async route=>{
   const req=route.request();const url=new URL(req.url());let status=200,data;
   await handler({method:req.method(),body:req.postDataJSON(),query:{offset:url.searchParams.get('offset')}},{setHeader(){},status(n){status=n;return this;},json(value){data=value;}});
   await route.fulfill({status,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.locator('[data-title="Chatbot"]').click();await page.locator('[data-tab="tab-ai-copilot"]').click();
  await page.waitForFunction(()=>document.getElementById('copilotMessagesArea').textContent.includes('Stage verification response'));
  await page.screenshot({path:infra+'/chat-copilot-v1.private.png'});
  await page.locator('#copilotInput').fill('Preserved draft');await page.route('**/api/admin-chat*',r=>r.abort());
  await page.locator('#btnSendCopilot').click();await page.waitForFunction(()=>!document.getElementById('btnSendCopilot').disabled);assert.equal(await page.locator('#copilotInput').inputValue(),'Preserved draft');
  console.log('PASS Copilot persisted paired history, replay/conflict, one model invocation, browser rendering and network draft.');
 }finally{await browser.close();if(session)await ok(service.from('admin_copilot_history').delete().eq('session_id',session));if(benchmarkBefore)for(const row of benchmarkBefore)await ok(service.from('chatbot_scenario_matrix').update({benchmark_status:row.benchmark_status}).eq('id',row.id));}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
