// Browser regression with controlled transport, including auth change and acknowledgement/read failures.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const p=await browser.newPage();await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<body></body>'}));await p.goto('http://localhost:4000/');await p.setContent(fs.readFileSync('components/fab/fab.html','utf8'));
  await p.evaluate(()=>{
   window.calls=[];window.saved=[];window.hold=true;window.failSend=false;window.failRead=false;window.release=null;window.session=null;
   window.setInterval=()=>1;
   window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session}}),onAuthStateChange(fn){window.authChanged=fn;}}});
   window.fetch=async(_url,init)=>{
    const b=JSON.parse(init.body);calls.push(b);
    if(b.action==='public_send'){
     if(hold)await new Promise(r=>release=r);
     if(failSend){failSend=false;throw Error('Mất mạng kiểm thử');}
     if(!saved.some(m=>m.id===b.requestId))saved.push({id:b.requestId,content:b.question,sender_type:'guest',created_at:new Date().toISOString()},{id:crypto.randomUUID(),content:'Câu trả lời kiểm thử',sender_type:'bot',created_at:new Date(Date.now()+1).toISOString()});
    }
    if(b.action==='public_read'&&failRead){failRead=false;throw Error('Chưa tải được phản hồi kiểm thử');}
    return {ok:true,status:200,json:async()=>({ok:true,status:'bot_handling',messages:saved.slice().reverse(),hasMore:false,updatedAt:String(calls.length)})};
   };
  });
  await p.addScriptTag({content:fs.readFileSync('components/fab/fab.js','utf8')});await p.click('#fabAiBtn');
  await p.fill('#fabChatInput','Câu hỏi đầu');await p.click('#fabChatSend');await p.waitForFunction(()=>!!release);
  assert.equal(await p.locator('.fab-chat-bubble--user').innerText().then(t=>t.includes('Câu hỏi đầu')),true);
  assert.equal(await p.inputValue('#fabChatInput'),'');assert.match(await p.locator('.fab-send-state').innerText(),/đang trả lời/);
  assert.equal(await p.locator('#fabChatSend').isDisabled(),true);assert.equal(await p.locator('#fabChatMessages').getAttribute('aria-busy'),'true');
  await p.fill('#fabChatInput','Nháp tiếp theo');await p.evaluate(()=>{hold=false;release();});await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled);
  assert.equal(await p.locator('.fab-chat-bubble--user').count(),1);assert.equal(await p.locator('.fab-send-state').count(),0);assert.equal(await p.inputValue('#fabChatInput'),'Nháp tiếp theo');
  await p.evaluate(()=>{failSend=true;});await p.fill('#fabChatInput','Câu hỏi lỗi');await p.click('#fabChatSend');await p.getByRole('button',{name:'Gửi lại',exact:true}).waitFor();
  assert.equal(await p.inputValue('#fabChatInput'),'Câu hỏi lỗi');assert.equal(await p.locator('#fabChatMessages').getAttribute('aria-busy'),'false');
  await p.fill('#fabChatInput','Giữ nháp khác');await p.getByRole('button',{name:'Gửi lại',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled);
  assert.equal(await p.inputValue('#fabChatInput'),'Giữ nháp khác');assert.equal(await p.locator('.fab-chat-bubble--user').count(),2);
  assert.equal(await p.evaluate(()=>{const r=calls.filter(x=>x.action==='public_send'&&x.question==='Câu hỏi lỗi');return r.length===2&&r[0].requestId===r[1].requestId;}),true);
  await p.evaluate(()=>{failRead=true;});await p.fill('#fabChatInput','Đã gửi nhưng đọc lỗi');await p.click('#fabChatSend');await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled);
  assert.match(await p.locator('.fab-send-state').innerText(),/Đã gửi/);assert.equal(await p.getByRole('button',{name:'Gửi lại',exact:true}).count(),0);
  await p.click('#fabChatClose');await p.click('#fabAiBtn');await p.waitForFunction(()=>!document.querySelector('.fab-send-state'));assert.equal(await p.locator('.fab-chat-bubble--user').count(),3);
  await p.evaluate(()=>{hold=true;release=null;});await p.fill('#fabChatInput','Không được lộ sang tài khoản khác');await p.click('#fabChatSend');await p.waitForFunction(()=>!!release);
  await p.evaluate(()=>{session={user:{id:'other-user'}};authChanged('SIGNED_IN',session);release();});await p.waitForFunction(()=>!document.querySelector('.fab-send-state'));
  assert.equal(await p.locator('#fabChatMessages').innerText().then(t=>t.includes('Không được lộ')),false);
  console.log('PASS Chrome: immediate question/waiting, no duplicate on reconciliation, preserves next draft, safe same-ID retry, acknowledged read failure recovery and identity isolation. Controlled transport only.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
