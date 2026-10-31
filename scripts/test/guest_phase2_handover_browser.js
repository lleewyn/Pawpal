async(page)=>{
 const ctx=await page.context().browser().newContext(),g=await ctx.newPage(),a=await page.context().newPage(),checks=[];
 const send=async(text)=>{await g.locator('#fabChatInput').fill(text);const [r]=await Promise.all([g.waitForResponse(r=>r.url().endsWith('/api/admin-chat')&&JSON.parse(r.request().postData()||'{}').action==='public_send'),g.locator('#fabChatSend').click()]);await g.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled);if(!r.ok())throw Error('Guest send '+r.status());};
 try{
  await g.goto('http://localhost:4000/',{waitUntil:'domcontentloaded'});await g.locator('#fabAiBtn').click();await send('Paw Points là gì?');
  checks.push({flow:'Handover enabled immediately after answer',pass:await g.locator('#fabHandoverBtn').isEnabled()});
  const id=await g.evaluate(()=>sessionStorage.getItem('pawpal_chat_active_guest'));
  await g.locator('#fabHandoverBtn').click();await g.waitForFunction(()=>document.querySelector('#fabChatStatus').textContent==='Đang chờ nhân viên');
  checks.push({flow:'Guest queues own conversation',pass:true});
  await a.goto('http://localhost:4000/admin#tab-live-support',{waitUntil:'domcontentloaded'});await a.waitForFunction(()=>window.PawpalChatbot?.state.liveLoaded===true,null,{timeout:20000});
  await a.locator('#filterTabAll').click();let index=-1;
  for(let n=0;n<5;n++){index=await a.evaluate(id=>PawpalChatbot.state.liveConversations.findIndex(c=>c.id===id),id);if(index>=0)break;const next=a.locator('#chatInboxPager button').filter({hasText:'>'});if(!await next.count()||await next.isDisabled())break;await next.click();await a.waitForFunction(()=>PawpalChatbot.state.liveLoaded===true);}
  if(index<0)throw Error('Own diagnostic conversation not on bounded inbox pages');
  await a.locator('.conversation-item').nth(index).click();await a.waitForFunction(id=>PawpalChatbot.state.currentConversation?.id===id&&PawpalChatbot.state.currentConversation.messagesLoaded,id);
  await a.locator('#btnToggleTakeover').click();await a.waitForFunction(()=>document.querySelector('#btnToggleTakeover').textContent.includes('Trả'));
  const reply='Kiểm thử browser đợt 2: nhân viên đã nhận yêu cầu.';await a.locator('#chatMessageInput').fill(reply);await a.locator('#btnSendLiveMessage').click();await a.getByText(reply,{exact:true}).last().waitFor();
  const start=Date.now();await g.bringToFront();await g.getByText(reply,{exact:true}).waitFor({timeout:45000});
  checks.push({flow:'Admin takes and replies; guest updates without reopening',pass:true,foregroundLatencyMs:Date.now()-start});
  const back='Kiểm thử browser đợt 2: khách đã nhận phản hồi.';await send(back);await a.bringToFront();await a.getByText(back,{exact:true}).last().waitFor({timeout:45000});checks.push({flow:'Guest reply automatically reaches Admin UI',pass:true});
  await a.locator('#btnHeaderResolveChat').click();await a.locator('#textareaResolveNotes').fill('Hoàn tất ca kiểm thử browser khách vãng lai đợt 2.');await a.locator('#checkboxSendCsatSurvey').check();await a.locator('#btnConfirmResolveChat').click();await a.waitForFunction(()=>PawpalChatbot.state.currentConversation?.status==='resolved',null,{timeout:15000});
  await g.bringToFront();await g.locator('#fabChatClose').click();await g.locator('#fabAiBtn').click();await g.locator('.fab-feedback-score').waitFor();await g.locator('.fab-feedback-score').selectOption('5');await g.locator('.fab-feedback-comment').fill('Ca kiểm thử giao diện đã hoàn tất.');await g.locator('.fab-csat-submit-btn').click();await g.getByText('Pawpal đã nhận đánh giá. Cảm ơn bạn!',{exact:true}).waitFor();
  checks.push({flow:'Own case resolved, CSAT submitted and composer locked',pass:await g.locator('#fabChatSend').isDisabled()});
  await g.locator('#fabChatNewBtn').click();await send('Cho tôi gặp người thật');await g.waitForFunction(()=>document.querySelector('#fabChatStatus').textContent==='Đang chờ nhân viên');await g.locator('#fabHandoverBtn').click();await g.waitForFunction(()=>document.querySelector('#fabChatStatus').textContent==='Hỗ trợ tự động');checks.push({flow:'Natural request for human and return to bot work',pass:true});
  return {checks,scope:'Two actual UIs and live database; only own diagnostic conversation selected/modified. Resolution refresh explicitly reopens widget; staff reply measured foreground polling.'};
 }catch(e){return {checks,error:e.message,adminPath:new URL(a.url()).pathname};}finally{await a.close();await ctx.close();}
}
