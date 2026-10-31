// Requires a separate, explicit approval for exactly this one Gemini question (max4 provider attempts).
async(page)=>{
 const context=await page.context().browser().newContext({viewport:{width:1280,height:900}}),p=await context.newPage();let sends=0;
 try{
  p.on('request',r=>{if(new URL(r.url()).pathname==='/api/admin-chat'&&JSON.parse(r.postData()||'{}').action==='public_send')sends++;});
  await p.goto('http://localhost:4000/');await p.locator('#fabAiBtn').click();await p.waitForFunction(()=>getComputedStyle(document.querySelector('#fabChatPanel')).opacity==='1');
  await p.evaluate(()=>{window.streamObservations=[];window.streamStart=performance.now();const target=document.querySelector('#fabChatMessages');window.streamObserver=new MutationObserver(()=>{const text=document.querySelector('.fab-stream-content')?.textContent;if(text&&(!streamObservations.length||streamObservations.at(-1).length!==text.length))streamObservations.push({ms:Math.round(performance.now()-streamStart),length:text.length,busy:document.querySelector('#fabChatSend').disabled});});streamObserver.observe(target,{childList:true,subtree:true,characterData:true});});
  const question='PawPal có những dịch vụ gì?';await p.locator('#fabChatInput').fill(question);await p.evaluate(()=>streamStart=performance.now());
  const [response]=await Promise.all([p.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin-chat'&&JSON.parse(r.request().postData()||'{}').action==='public_send',{timeout:35000}),p.locator('#fabChatSend').click()]);
  await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled&&!document.querySelector('.fab-send-state'),null,{timeout:35000});
  const reply=await p.locator('.fab-chat-bubble--bot .fab-message-content').last().innerText(),observations=await p.evaluate(()=>{streamObserver.disconnect();return {changes:streamObservations,completedMs:Math.round(performance.now()-streamStart)};});
  let events=[],wireReadError=null;try{const wire=await response.text();events=wire.split('\n\n').filter(Boolean).map(s=>({type:s.match(/^event: (\w+)/m)?.[1],data:JSON.parse(s.match(/^data: (.*)/m)?.[1]||'{}')}));}catch(error){wireReadError=error.message;}
  await p.screenshot({path:'D:/Aboutme/Pawpal-infra/browser-check/guest-stream-model-final.png'});
  return {pass:response.ok()&&response.headers()['content-type']?.includes('text/event-stream')&&observations.changes.some(x=>x.busy)&&/Hotel/.test(reply)&&/Taxi/.test(reply)&&sends===1,status:response.status(),wireReadError,events:events.map(x=>({type:x.type,...(x.type==='delta'?{characters:x.data.text.length}:{})})),reply,observations,sends,scope:'One approved real Gemini UI question, isolated new guest and empty history; no manual retry; existing provider cap max4; no customer profiles.'};
 }finally{await context.close();}
}
