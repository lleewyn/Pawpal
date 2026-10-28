// Real widget code with controlled offline transport; no Cloud, database or AI.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
let browser;
async function mount(options={}){
 const page=await browser.newPage();await page.route('**/*',route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await page.goto('http://localhost:3001/');
 await page.setContent(fs.readFileSync('components/fab/fab.html','utf8'));
 await page.evaluate(options=>{
  window.session={user:{id:'A'},access_token:'token-A'};window.calls=[];window.held=[];window.hold=new Set(options.hold||[]);
  window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session}}),onAuthStateChange(cb){window.changeAuth=next=>{session={user:{id:next},access_token:'token-'+next};cb('SIGNED_IN',session);};}}});
  sessionStorage.setItem('pawpal_chat_active_A','chat-A');sessionStorage.setItem('pawpal_chat_active_B',options.sameConversation?'chat-A':'chat-B');
  window.fetch=async(_url,init)=>{
   const body=JSON.parse(init.body),row={body,token:init.headers.Authorization};calls.push(row);
   if(hold.has(body.action))return new Promise((resolve,reject)=>{
    const pending={row,resolve:body=>resolve({ok:true,json:async()=>body}),reject};held.push(pending);
    if(options.observeAbort)init.signal?.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});
   });
   return {ok:true,json:async()=>body.action==='public_read'?{ok:true,status:'bot_handling',updatedAt:'v-'+body.conversationId,messages:[]}:{ok:true,conversations:[],conversationId:body.conversationId}};
  };
  if(options.fastTimeout){const native=setTimeout;window.setTimeout=(fn,ms,...args)=>native(fn,ms===30000?25:ms,...args);}
 },options);
 await page.addScriptTag({content:fs.readFileSync('components/fab/fab.js','utf8')});await page.waitForFunction(()=>typeof changeAuth==='function');await page.waitForTimeout(30);return page;
}
const message=text=>({id:'fixture-'+text,sender_type:'bot',content:text,metadata:{},created_at:'2026-10-28T01:00:00Z'});
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});
 let p=await mount({hold:['public_read'],sameConversation:true});await p.click('#fabAiBtn');await p.waitForFunction(()=>held.length===1);
 await p.evaluate(()=>changeAuth('B'));await p.waitForFunction(()=>held.length===2);
 await p.evaluate(msg=>{held[1].resolve({ok:true,status:'bot_handling',updatedAt:'B',messages:[msg]});},message('B visible'));
 await p.waitForFunction(()=>document.getElementById('fabChatMessages').textContent.includes('B visible'));
 await p.evaluate(msg=>{held[0].resolve({ok:true,status:'bot_handling',updatedAt:'A',messages:[msg]});},message('A SECRET'));
 await p.waitForTimeout(40);assert.ok(!(await p.locator('#fabChatMessages').textContent()).includes('A SECRET'),'old owner response must not render even if conversation ID is restored unchanged');await p.close();
 console.log('PASS stale transcript after account change does not render.');

 p=await mount({hold:['public_list']});await p.click('#fabChatHistoryBtn');await p.waitForFunction(()=>held.length===1);await p.evaluate(()=>changeAuth('B'));
 await p.evaluate(()=>held[0].resolve({ok:true,conversations:[{id:'A-private-history',created_at:'2026-01-01T00:00:00Z'}]}));await p.waitForTimeout(40);
 assert.equal(await p.locator('.fab-history-card').count(),0,'old owner history must not populate after account change');await p.close();console.log('PASS stale history is discarded.');

 p=await mount({hold:['public_open']});await p.click('#fabChatNewBtn');await p.fill('#fabChatInput','A pending text');await p.click('#fabChatSend');await p.waitForFunction(()=>held.length===1);await p.evaluate(()=>changeAuth('B'));
 await p.fill('#fabChatInput','B draft');await p.evaluate(()=>held[0].resolve({ok:true,conversationId:held[0].row.body.conversationId}));await p.waitForTimeout(50);
 assert.equal(await p.evaluate(()=>calls.filter(c=>c.body.action==='public_send').length),0,'old open must not continue as new user');assert.equal(await p.inputValue('#fabChatInput'),'B draft');await p.close();console.log('PASS identity change cancels pending open/send continuation.');

 p=await mount({hold:['public_send']});await p.fill('#fabChatInput','same text');await p.click('#fabChatSend');await p.waitForFunction(()=>held.length===1);await p.evaluate(()=>changeAuth('B'));await p.fill('#fabChatInput','same text');
 await p.evaluate(()=>held[0].resolve({ok:true}));await p.waitForTimeout(40);assert.equal(await p.inputValue('#fabChatInput'),'same text','late success must not clear new owner draft');await p.close();console.log('PASS late send acknowledgement cannot clear another account draft.');

 p=await mount({hold:['public_send'],observeAbort:true,fastTimeout:true});await p.fill('#fabChatInput','retry safely');await p.click('#fabChatSend');
 await p.waitForFunction(()=>!document.getElementById('fabChatSend').disabled,{},{timeout:1500});assert.equal(await p.inputValue('#fabChatInput'),'retry safely');
 await p.evaluate(()=>hold.delete('public_send'));await p.click('#fabChatSend');await p.waitForFunction(()=>document.getElementById('fabChatInput').value==='');
 const ids=await p.evaluate(()=>calls.filter(c=>c.body.action==='public_send').map(c=>c.body.requestId));assert.equal(ids.length,2);assert.equal(ids[0],ids[1],'retry must reuse request ID');await p.close();console.log('PASS timeout unlocks UI, preserves draft and reuses request ID.');

 p=await mount({hold:['public_send']});await p.fill('#fabChatInput','A message');await p.click('#fabChatSend');await p.waitForFunction(()=>held.length===1);
 await p.evaluate(()=>changeAuth('B'));await p.fill('#fabChatInput','B message');await p.click('#fabChatSend');await p.waitForFunction(()=>held.length===2);
 await p.evaluate(()=>held[0].resolve({ok:true}));await p.waitForTimeout(40);
 assert.equal(await p.locator('#fabChatSend').isDisabled(),true,'old finally must not unlock a new owner send');
 await p.press('#fabChatInput','Enter');assert.equal(await p.evaluate(()=>calls.filter(c=>c.body.action==='public_send').length),2,'pending B send must not duplicate');
 await p.evaluate(()=>held[1].resolve({ok:true}));await p.waitForFunction(()=>!document.getElementById('fabChatSend').disabled);await p.close();console.log('PASS old completion cannot unlock or duplicate new account send.');

 p=await mount({hold:['public_open']});await p.click('#fabChatNewBtn');await p.click('#fabHandoverBtn');await p.waitForFunction(()=>held.length===1);await p.evaluate(()=>changeAuth('B'));
 await p.evaluate(()=>held[0].resolve({ok:true}));await p.waitForTimeout(40);
 assert.equal(await p.evaluate(()=>calls.filter(c=>c.body.action==='public_mode').length),0,'old handover must not change new account mode');await p.close();console.log('PASS pending handover cannot continue in a new account.');

 p=await mount({hold:['public_send']});await p.fill('#fabChatInput','single send');await p.click('#fabChatSend');await p.waitForFunction(()=>held.length===1);
 await p.press('#fabChatInput','Enter');await p.press('#fabChatInput','Enter');assert.equal(await p.evaluate(()=>calls.filter(c=>c.body.action==='public_send').length),1);
 await p.evaluate(()=>held[0].reject(new TypeError('network failed')));await p.waitForFunction(()=>!document.getElementById('fabChatSend').disabled);
 assert.equal(await p.inputValue('#fabChatInput'),'single send');await p.evaluate(()=>hold.delete('public_send'));await p.click('#fabChatSend');await p.waitForFunction(()=>document.getElementById('fabChatInput').value==='');
 const retryIds=await p.evaluate(()=>calls.filter(c=>c.body.action==='public_send').map(c=>c.body.requestId));assert.equal(retryIds.length,2);assert.equal(retryIds[0],retryIds[1]);await p.close();console.log('PASS repeated Enter coalesces; network retry keeps original request ID.');
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
