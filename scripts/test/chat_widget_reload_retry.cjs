// Reload real widget with one controlled pending send; offline transport only.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
let browser;
(async()=>{
 browser=await chromium.launch({channel:'chrome',headless:true});
 for(const failAction of ['public_open','public_send']){
  const page=await browser.newPage();let owner='A',fail=true,calls=[];
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html><body>'+fs.readFileSync('components/fab/fab.html','utf8')+'</body></html>'}));
  await page.exposeFunction('qaSession',()=>({data:{session:{user:{id:owner},access_token:'token-'+owner}}}));
  await page.exposeFunction('qaCall',body=>{calls.push(body);if(fail&&body.action===failAction){fail=false;return {failed:true};}return {ok:true,...(body.action==='public_read'?{status:'bot_handling',updatedAt:'v1',messages:[]}:{})};});
  await page.addInitScript(()=>{window.getSupabaseClient=()=>({auth:{getSession:()=>qaSession(),onAuthStateChange(){}}});window.fetch=async(_url,init)=>{const body=await qaCall(JSON.parse(init.body));if(body.failed)throw new TypeError('network ack lost');return {ok:true,json:async()=>body};};});
  const load=async()=>{await page.addScriptTag({content:fs.readFileSync('components/fab/fab.js','utf8')});await page.waitForTimeout(60);};
  await page.goto('http://localhost:3001/');await load();await page.fill('#fabChatInput','pending private question');await page.click('#fabChatSend');
  await page.waitForFunction(()=>!document.getElementById('fabChatSend').disabled);
  const before=calls.length;await page.reload();await load();
  assert.equal(await page.inputValue('#fabChatInput'),'pending private question','pending draft must survive reload');assert.equal(calls.length,before,'reload must not auto-send or reconcile using extra API calls');
  await page.click('#fabChatSend');await page.waitForFunction(()=>document.getElementById('fabChatInput').value==='');
  const attempts=calls.filter(c=>c.action===failAction);assert.equal(attempts.length,2);assert.equal(attempts[0].conversationId,attempts[1].conversationId);
  if(failAction==='public_send')assert.equal(attempts[0].requestId,attempts[1].requestId);
  assert.ok(!(await page.evaluate(()=>JSON.stringify({...sessionStorage}))).includes('pending private question'),'ack clears persisted pending draft');
  // Another failed send then a different identity reload must discard the old draft.
  fail=true;await page.click('#fabChatNewBtn');await page.fill('#fabChatInput','A-only private question');await page.click('#fabChatSend');await page.waitForFunction(()=>!document.getElementById('fabChatSend').disabled);
  owner='B';await page.reload();await load();assert.equal(await page.inputValue('#fabChatInput'),'');
  assert.ok(!(await page.evaluate(()=>JSON.stringify({...sessionStorage}))).includes('A-only private question'),'switching identity clears previous owner pending data');
  // An expired record must not repopulate a draft or trigger a request.
  await page.evaluate(()=>sessionStorage.setItem('pawpal_chat_pending_v1',JSON.stringify({owner:'B',conversation:'10000000-0000-4000-8000-000000000001',needsOpen:true,question:'expired private text',requestId:'20000000-0000-4000-8000-000000000002',at:Date.now()-1800001})));
  const count=calls.length;await page.reload();await load();assert.equal(await page.inputValue('#fabChatInput'),'');assert.equal(calls.length,count);assert.equal(await page.evaluate(()=>sessionStorage.getItem('pawpal_chat_pending_v1')),null);
  // Refuse sending if the pending id cannot be persisted before network dispatch.
  await page.evaluate(()=>{const native=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='pawpal_chat_pending_v1')throw new DOMException('Full','QuotaExceededError');return native.call(this,k,v);};});
  await page.fill('#fabChatInput','keep if storage full');await page.click('#fabChatSend');await page.waitForFunction(()=>!document.getElementById('fabChatSend').disabled);assert.equal(calls.length,count);assert.equal(await page.inputValue('#fabChatInput'),'keep if storage full');
  await page.close();console.log('PASS '+failAction+': reload preserves ID/draft, no automatic requests, acknowledgement clears storage and account switch discards old draft.');
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
