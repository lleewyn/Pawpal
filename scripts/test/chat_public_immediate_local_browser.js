async(page)=>{
 const context=await page.context().browser().newContext({viewport:{width:390,height:844}}),p=await context.newPage(),calls=[];let release,held=false;
 try{
  await p.route('**/api/admin-chat',async route=>{const b=JSON.parse(route.request().postData()||'{}');calls.push(b.action);if(b.action==='public_send'&&!held){held=true;const r=await route.fetch();await new Promise(resolve=>release=resolve);await route.fulfill({response:r});}else await route.continue();});
  await p.goto('http://localhost:4000/');await p.locator('#fabAiBtn').click();await p.waitForFunction(()=>getComputedStyle(document.querySelector('#fabChatPanel')).opacity==='1');
  const question='Paw Points là gì?';await p.locator('#fabChatInput').fill(question);await p.locator('#fabChatSend').click();
  await p.locator('.fab-send-state').waitFor();const immediate={questionVisible:(await p.locator('.fab-chat-bubble--user').innerText()).includes(question),waiting:(await p.locator('.fab-send-state').innerText()).includes('PawPal đang trả lời'),inputCleared:await p.locator('#fabChatInput').inputValue()==='',sendDisabled:await p.locator('#fabChatSend').isDisabled(),welcomeHidden:await p.locator('.fab-chat-welcome').count()===0};
  await p.screenshot({path:'D:/Aboutme/Pawpal-infra/browser-check/guest-immediate-waiting.png'});
  await p.locator('#fabChatInput').fill('Nháp tiếp theo chưa gửi');
  const deadline=Date.now()+15000;while(!release&&Date.now()<deadline)await p.waitForTimeout(100);if(!release)throw Error('Real API response did not reach the controlled delivery gate');release();
  await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled&&!document.querySelector('.fab-send-state'),null,{timeout:15000});
  const final={oneUserBubble:await p.locator('.fab-chat-bubble--user').count()===1,realReply:(await p.locator('.fab-chat-bubble--bot').innerText()).includes('điểm'),nextDraftPreserved:await p.locator('#fabChatInput').inputValue()==='Nháp tiếp theo chưa gửi'};
  return {pass:Object.values(immediate).every(Boolean)&&Object.values(final).every(Boolean),immediate,final,calls,scope:'Actual localhost UI/API/Supabase; delivery of one real deterministic response held to observe waiting UI. No Gemini, no fake response content.'};
 }finally{release?.();await context.close();}
}
