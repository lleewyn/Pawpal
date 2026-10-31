// Regression for controls staying disabled after a send; no clock/poll advance.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const p=await browser.newPage();
  await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<body></body>'}));
  await p.goto('http://localhost:4000/');
  await p.setContent(fs.readFileSync('components/fab/fab.html','utf8'));
  await p.evaluate(()=>{
   window.calls=[];window.serverMode='bot_handling';window.failMode=false;
   window.setInterval=()=>1;
   window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}});
   window.fetch=async(_url,init)=>{
    const b=JSON.parse(init.body);calls.push(b.action);
    if(b.action==='public_mode'&&failMode)return {ok:false,status:503,json:async()=>({ok:false,error:'Chưa chuyển được kiểm thử'})};
    if(b.action==='public_mode')serverMode=b.mode;
    return {ok:true,status:200,json:async()=>({ok:true,conversationId:b.conversationId,messages:[],hasMore:false,status:serverMode,updatedAt:String(calls.length)})};
   };
  });
  await p.addScriptTag({content:fs.readFileSync('components/fab/fab.js','utf8')});
  await p.click('#fabAiBtn');await p.fill('#fabChatInput','Giá Pet Hotel');await p.click('#fabChatSend');
  await p.waitForFunction(()=>calls.includes('public_send')&&calls.includes('public_read')&&!document.querySelector('#fabChatSend').disabled);
  assert.equal(await p.locator('#fabHandoverBtn').isEnabled(),true,'handover must unlock without waiting for the next poll');
  await p.fill('#fabChatInput','Bản nháp chưa gửi');await p.evaluate(()=>failMode=true);await p.click('#fabHandoverBtn');
  await p.waitForFunction(()=>document.querySelector('#fabChatStatus').textContent==='Chưa chuyển được kiểm thử');
  assert.equal(await p.locator('#fabHandoverBtn').isEnabled(),true);
  assert.equal(await p.inputValue('#fabChatInput'),'Bản nháp chưa gửi');
  await p.evaluate(()=>failMode=false);await p.click('#fabHandoverBtn');
  await p.waitForFunction(()=>document.querySelector('#fabHandoverBtn').textContent==='Hỏi lại trợ lý'&&!document.querySelector('#fabHandoverBtn').disabled);
  await p.evaluate(()=>serverMode='blocked');await p.click('#fabChatClose');await p.click('#fabAiBtn');
  await p.waitForFunction(()=>document.querySelector('#fabChatStatus').textContent==='Tạm khóa');
  assert.equal(await p.locator('#fabHandoverBtn').isDisabled(),true);
  assert.equal(await p.locator('#fabChatSend').isDisabled(),true);
  console.log('PASS Chrome controls: immediate handover after send, failed handover preserves error/draft and unlocks retry, successful handover unlocks return, blocked case stays locked. Offline transport only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
