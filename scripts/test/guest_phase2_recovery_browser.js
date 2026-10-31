async(page)=>{
 const context=await page.context().browser().newContext(),p=await context.newPage(),checks=[];
 let abortOnce=true;const ids=[];
 try{
  await p.route('**/api/admin-chat',async route=>{
   const b=JSON.parse(route.request().postData()||'{}');
   if(b.action==='public_send'){ids.push(b.requestId);if(abortOnce){abortOnce=false;const response=await route.fetch();if(!response.ok())throw Error('Underlying send failed');await route.abort('failed');return;}}
   await route.continue();
  });
  await p.goto('http://localhost:4000/',{waitUntil:'domcontentloaded'});await p.locator('#fabAiBtn').click();
  const question='Paw Points là gì?';await p.locator('#fabChatInput').fill(question);await p.locator('#fabChatSend').click();
  await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled&&document.querySelector('#fabChatInput').value.length>0&&document.querySelector('#fabChatStatus').textContent!=='Hỗ trợ tự động',null,{timeout:20000});
  checks.push({flow:'Lost response after real server persist keeps draft and permits retry',pass:await p.locator('#fabChatInput').inputValue()===question});
  const ownId=await p.evaluate(()=>sessionStorage.getItem('pawpal_chat_active_guest'));
  checks.push({flow:'Pending record exists before reload',record:await p.evaluate(()=>{const v=JSON.parse(sessionStorage.getItem('pawpal_chat_pending_v1')||'null');return v&&{owner:v.owner,guestIssued:v.guestIssued,issued:Number(localStorage.getItem('pawpal_chat_guest_v1_at')),needsOpen:v.needsOpen,question:v.question,age:Date.now()-v.at,uuid:/^[0-9a-f-]{36}$/i.test(v.conversation),request:/^[0-9a-f-]{36}$/i.test(v.requestId),sameActive:v.conversation===sessionStorage.getItem('pawpal_chat_active_guest')};})});
  await p.reload({waitUntil:'domcontentloaded'});await p.locator('#fabAiBtn').click();
  await p.waitForFunction(q=>document.querySelector('#fabChatInput').value===q,question,{timeout:10000});
  const [response]=await Promise.all([p.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin-chat'&&r.request().method()==='POST'&&JSON.parse(r.request().postData()||'{}').action==='public_send',{timeout:20000}),p.locator('#fabChatSend').click()]);
  const rawAck=await response.text(),ack=response.headers()['content-type']?.includes('text/event-stream')?JSON.parse(rawAck.split('\n\n').find(x=>x.startsWith('event: done\n')).split('\ndata: ')[1]):JSON.parse(rawAck);await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled&&document.querySelector('#fabChatInput').value==='',null,{timeout:15000});
  checks.push({flow:'Reload retry reuses requestId, server replays, transcript has no duplicate',pass:response.ok()&&ack.replayed===true&&ids.length===2&&ids[0]===ids[1]&&await p.locator('.fab-message-content').count()===2,status:response.status()});
  await p.locator('#fabChatNewBtn').click();await p.locator('#fabChatInput').fill('7kg');
  const [clarify]=await Promise.all([p.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin-chat'&&r.request().method()==='POST'&&JSON.parse(r.request().postData()||'{}').action==='public_send',{timeout:20000}),p.locator('#fabChatSend').click()]);
  await p.waitForFunction(()=>document.querySelectorAll('.fab-message-content').length>=2,null,{timeout:15000});
  checks.push({flow:'Short ambiguous question asks topic without denying guest',pass:clarify.ok()&&(await p.locator('.fab-message-content').last().innerText()).includes('Bạn đang hỏi')});
  await p.locator('#fabChatInput').fill('a'.repeat(2001));const before=ids.length,max=await p.locator('#fabChatInput').getAttribute('maxlength');
  if(max&&Number(max)<=2000)checks.push({flow:'Input length bound enforced by field',pass:(await p.locator('#fabChatInput').inputValue()).length<=2000});
  else{await p.locator('#fabChatSend').click();await p.waitForFunction(()=>document.querySelector('#fabChatStatus').textContent.includes('2.000'),null,{timeout:5000});checks.push({flow:'Oversize input refused before public_send',pass:ids.length===before});}
  const isolated=await page.context().browser().newContext(),b=await isolated.newPage();
  try{
   await b.goto('http://localhost:4000/',{waitUntil:'domcontentloaded'});await b.locator('#fabAiBtn').click();await b.locator('#fabChatHistoryBtn').click();
   await b.waitForFunction(()=>document.querySelector('#fabHistoryList')?.innerText.includes('Chưa có hội thoại'),null,{timeout:15000});
   checks.push({flow:'Another guest has an empty independent history',pass:true});
   const denied=await b.evaluate(async conversationId=>{const r=await fetch('/api/admin-chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'public_read',conversationId,sessionToken:localStorage.getItem('pawpal_chat_guest_v1')})});const d=await r.json();return {status:r.status,noMessages:!d.messages};},ownId);
   checks.push({flow:'Another guest cannot read owned diagnostic conversation',pass:denied.status===403&&denied.noMessages,status:denied.status});
  }finally{await isolated.close();}
  // Response injection is isolated renderer security testing, not a runtime source.
  await p.unroute('**/api/admin-chat');
  await p.route('**/api/admin-chat',async route=>{const body=JSON.parse(route.request().postData()||'{}');if(body.action!=='public_read'){await route.continue();return;}const response=await route.fetch(),data=await response.json();const bot=data.messages?.find(m=>m.sender_type==='bot');if(bot)bot.content='[Unsafe](javascript:alert(1)) [External](//example.invalid/) <img src=x onerror="window.__phase2xss=true"> [Safe](/shop)';await route.fulfill({response,json:data});});
  await p.reload({waitUntil:'domcontentloaded'});await p.locator('#fabAiBtn').click();await p.waitForFunction(()=>document.querySelector('#fabChatMessages')?.innerText.includes('Unsafe'),null,{timeout:15000});
  const safe=await p.locator('.fab-chat-bubble--bot').last().evaluate(e=>({links:[...e.querySelectorAll('a')].map(a=>a.getAttribute('href')),images:e.querySelectorAll('img').length,xss:!!window.__phase2xss,text:e.textContent.includes('<img')}));
  checks.push({flow:'Renderer refuses external/javascript links and HTML execution',pass:safe.links.length===1&&safe.links[0]==='/shop'&&safe.images===0&&!safe.xss&&safe.text});
  return {checks,scope:'Real local UI/API; one intentional response loss, one expected403 and one isolated response-injection renderer check. Diagnostic conversations only.'};
 }catch(e){return {checks,error:e.message,diagnostic:await p.evaluate(()=>({draft:document.querySelector('#fabChatInput')?.value,status:document.querySelector('#fabChatStatus')?.textContent,hasPending:!!sessionStorage.getItem('pawpal_chat_pending_v1'),hasActive:!!sessionStorage.getItem('pawpal_chat_active_guest')})).catch(()=>null)};}finally{await context.close();}
}
