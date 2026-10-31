// Offline transport only. Tests actual widget incremental rendering and failure recovery.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage();await p.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<body></body>'}));await p.goto('http://localhost:4000/');await p.setContent(fs.readFileSync('components/fab/fab.html','utf8'));
 await p.evaluate(()=>{
  window.setInterval=()=>1;window.saved=[];window.mode='stream';window.sends=[];
  window.getSupabaseClient=()=>({auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange(){}}});
  window.fetch=async(_url,init)=>{
   const b=JSON.parse(init.body);
   if(b.action==='public_send'){
    sends.push(b);window.lastSend=b;
    if(mode==='legacy'){if(!saved.some(x=>x.id===b.requestId))saved.push({id:b.requestId,content:b.question,sender_type:'guest',created_at:new Date().toISOString()},{id:crypto.randomUUID(),content:'PawPal gửi bạn thông tin nhé.',sender_type:'bot',created_at:new Date(Date.now()+1).toISOString()});return new Response(JSON.stringify({ok:true}),{headers:{'Content-Type':'application/json'}});}
    return new Response(new ReadableStream({start(c){window.streamController=c;}}),{headers:{'Content-Type':'text/event-stream'}});
   }
   return new Response(JSON.stringify({ok:true,messages:saved.slice().reverse(),hasMore:false,status:'bot_handling',updatedAt:String(sends.length)}),{headers:{'Content-Type':'application/json'}});
  };
  window.emit=(type,data)=>streamController.enqueue(new TextEncoder().encode('event: '+type+'\ndata: '+JSON.stringify(data)+'\n\n'));
 });await p.addScriptTag({content:fs.readFileSync('components/fab/fab.js','utf8')});await p.click('#fabAiBtn');await p.fill('#fabChatInput','Dịch vụ công khai');await p.click('#fabChatSend');await p.waitForFunction(()=>!!window.streamController);
 await p.evaluate(()=>{emit('reset',{});emit('delta',{text:'PawPal gửi bạn '});});await p.waitForFunction(()=>document.querySelector('.fab-stream-content')?.textContent==='PawPal gửi bạn ');
 assert.equal(await p.locator('#fabChatSend').isDisabled(),true);assert.equal(await p.locator('.fab-chat-bubble--user').count(),1);assert.equal(await p.evaluate(()=>sends[0].stream),true);
 await p.fill('#fabChatInput','Nháp tiếp theo');
 // Split one UTF-8 frame mid-character to check TextDecoder state.
 await p.evaluate(()=>{const frame=new TextEncoder().encode('event: delta\ndata: '+JSON.stringify({text:'thông tin cho bé 🐾.'})+'\n\n');const index=frame.findIndex(x=>x>=240)+1;streamController.enqueue(frame.slice(0,index));streamController.enqueue(frame.slice(index));});
 await p.waitForFunction(()=>document.querySelector('.fab-stream-content')?.textContent.endsWith('bé 🐾.'));
 await p.evaluate(()=>{const b=lastSend;saved.push({id:b.requestId,content:b.question,sender_type:'guest',created_at:new Date().toISOString()},{id:crypto.randomUUID(),content:'PawPal gửi bạn thông tin cho bé 🐾.',sender_type:'bot',created_at:new Date(Date.now()+1).toISOString()});emit('done',{ok:true});streamController.close();});
 await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled&&!document.querySelector('#fabStreamPreview'));
 assert.equal(await p.locator('.fab-chat-bubble--user').count(),1);assert.equal(await p.locator('.fab-chat-bubble--bot').count(),1);assert.equal(await p.inputValue('#fabChatInput'),'Nháp tiếp theo');
 await p.click('#fabChatNewBtn');await p.fill('#fabChatInput','Câu ngắt kết nối');await p.evaluate(()=>streamController=null);await p.click('#fabChatSend');await p.waitForFunction(()=>!!streamController);
 await p.evaluate(()=>{emit('delta',{text:'Bản nháp trả lời chưa lưu'});});await p.locator('#fabStreamPreview').waitFor();await p.evaluate(()=>streamController.close());await p.getByRole('button',{name:'Gửi lại',exact:true}).waitFor();
 assert.equal(await p.locator('#fabStreamPreview').count(),0);assert.equal(await p.inputValue('#fabChatInput'),'Câu ngắt kết nối');
 await p.evaluate(()=>mode='legacy');await p.getByRole('button',{name:'Gửi lại',exact:true}).click();await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled);
 assert.equal(await p.evaluate(()=>sends.at(-1).requestId===sends.at(-2).requestId),true);
 await p.click('#fabChatNewBtn');await p.evaluate(()=>{mode='stream';streamController=null;});await p.fill('#fabChatInput','Thử đổi lượt model');await p.click('#fabChatSend');await p.waitForFunction(()=>!!streamController);
 await p.evaluate(()=>{emit('delta',{text:'Lượt cũ'});});await p.locator('#fabStreamPreview').waitFor();await p.evaluate(()=>{emit('reset',{});emit('delta',{text:'<img src=x onerror=alert(1)> Lượt mới'});});await p.waitForFunction(()=>document.querySelector('.fab-stream-content')?.textContent.includes('Lượt mới'));
 assert.equal(await p.locator('#fabStreamPreview img').count(),0);assert.equal((await p.locator('#fabStreamPreview').innerText()).includes('Lượt cũ'),false);
 await p.evaluate(()=>{emit('error',{ok:false,status:409,error:'Chưa lưu được câu trả lời kiểm thử.'});streamController.close();});await p.getByRole('button',{name:'Gửi lại',exact:true}).waitFor();assert.equal(await p.locator('#fabStreamPreview').count(),0);
 console.log('PASS Chrome SSE: text arrives incrementally before done, UTF-8 splits, no duplicate final reply, next draft retained, interrupted/error preview removed, same-ID retry, reset between attempts, plain text rendering and legacy JSON fallback. No external AI.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
