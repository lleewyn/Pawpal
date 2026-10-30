const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<body></body>'}));await page.goto('http://localhost:4000');await page.setContent(fs.readFileSync('components/fab/fab.html','utf8'));
 await page.evaluate(()=>{
  window.clock=Date.now();Date.now=()=>clock;window.calls=[];window.replyMode='temporary';window.setInterval=fn=>{window.tick=fn;return 1;};sessionStorage.setItem('pawpal_chat_active_guest','10000000-0000-4000-8000-000000000001');
  window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}});
  window.fetch=async(_url,init)=>{const b=JSON.parse(init.body);calls.push({action:b.action,at:clock});if(replyMode==='healthy')return {ok:true,status:200,json:async()=>({ok:true,messages:[],hasMore:false,status:'bot_handling',updatedAt:'v1'})};return {ok:false,status:503,json:async()=>({ok:false,error:'Chat chưa sẵn sàng',...(replyMode==='missing'?{retryable:false}:{})})};};
 });await page.addScriptTag({content:fs.readFileSync('components/fab/fab.js','utf8')});await page.click('#fabAiBtn');await page.waitForFunction(()=>calls.length===1&&document.querySelector('#fabChatStatus').textContent.includes('chưa'));await page.fill('#fabChatInput','Giá Pet Hotel');
 const count=()=>page.evaluate(()=>calls.length),tick=ms=>page.evaluate(async ms=>{clock+=ms;await tick();},ms);
 await tick(10000);await tick(10000);assert.equal(await count(),1);await tick(10000);assert.equal(await count(),2);
 await tick(30000);assert.equal(await count(),2);await tick(30000);assert.equal(await count(),3);await tick(60000);assert.equal(await count(),3);await tick(60000);assert.equal(await count(),4);
 assert.equal(await page.inputValue('#fabChatInput'),'Giá Pet Hotel');
 await page.evaluate(()=>replyMode='missing');await tick(120000);const blocked=await count();await tick(3600000);assert.equal(await count(),blocked);
 await page.evaluate(()=>replyMode='healthy');await page.click('#fabChatClose');await tick(3600000);assert.equal(await count(),blocked);await page.click('#fabAiBtn');await page.waitForFunction(()=>calls.length>0&&document.querySelector('#fabChatStatus').textContent==='Hỗ trợ tự động');const recovered=await count();await tick(10000);assert.equal(await count(),recovered);await tick(20000);assert.equal(await count(),recovered+1);
 assert.equal(await page.inputValue('#fabChatInput'),'Giá Pet Hotel');console.log('PASS Chrome: 503 backs off 30/60/120s, permanent missing-RPC pauses polling, close stops reads, manual reopen recovers and draft survives.');
}finally{await browser.close();}})().catch(e=>{console.error(e.stack);process.exitCode=1;});
