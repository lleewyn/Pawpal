// Uses the already signed-in member context. Never returns private record contents/identifiers.
async(page)=>{
 const p=await page.context().newPage(),checks=[],metrics=[];
 try{
  p.on('response',async r=>{if(new URL(r.url()).pathname==='/api/admin-chat'){const b=JSON.parse(r.request().postData()||'{}');metrics.push({action:b.action,status:r.status(),bytes:(await r.body().catch(()=>new Uint8Array())).length});}});
  await p.goto('http://localhost:4000/');await p.locator('#fabAiBtn').click();await p.waitForFunction(()=>getComputedStyle(document.querySelector('#fabChatPanel')).opacity==='1');
  const signed=await p.evaluate(async()=>!!(await getSupabaseClient().auth.getSession()).data.session);if(!signed)throw Error('Member session missing');
  const cases=[['Tôi có lịch nào sắp tới?',{kind:'appointments',page:0,mode:'upcoming'}],['Đơn hàng của tôi đang ở đâu?',{kind:'orders',page:0}],['Tôi có những bé nào?',{kind:'pets',page:0}],['Tôi còn bao nhiêu Paw Points?',{kind:'loyalty',page:0}]];
  for(const [question,request]of cases){
   await p.locator('#fabChatNewBtn').click();
   const oracle=await p.evaluate(async request=>{const r=await getSupabaseClient().rpc('read_member_chat_context',{p_request:request});return {data:r.data,error:r.error?.code};},request);if(oracle.error)throw Error('Oracle '+request.kind+': '+oracle.error);
   await p.locator('#fabChatInput').fill(question);const [response]=await Promise.all([p.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin-chat'&&JSON.parse(r.request().postData()||'{}').action==='public_send'),p.locator('#fabChatSend').click()]);
   await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled&&!document.querySelector('.fab-send-state'),null,{timeout:25000});
   const reply=await p.locator('.fab-chat-bubble--bot .fab-message-content').last().innerText();
   const expected=oracle.data.items;let matches=expected.every(row=>request.kind==='loyalty'?reply.includes(row.points.toLocaleString('vi-VN')+' Paw Points')&&(!row.tier||reply.includes(row.tier)):reply.includes(row.code));
   if(!expected.length)matches=reply.includes('chưa tìm thấy');
   const accountLink=await p.locator('.fab-chat-bubble--bot a[href^="/user#"]').count();
   checks.push({kind:request.kind,status:response.status(),oracleRows:expected.length,pass:response.ok()&&matches&&accountLink>0,oneUserBubble:await p.locator('.fab-chat-bubble--user').count()===1});
   if(!matches)throw Error('Oracle mismatch '+request.kind);
   const a=p.locator('.fab-chat-bubble--bot a[href^="/user#"]').last(),href=await a.getAttribute('href');await a.click();await p.waitForURL(url=>url.hash===new URL(href,'http://localhost:4000').hash,{timeout:10000});checks.push({flow:'Account link '+request.kind,pass:true});
   await p.goto('http://localhost:4000/');await p.locator('#fabAiBtn').click();await p.waitForFunction(()=>getComputedStyle(document.querySelector('#fabChatPanel')).opacity==='1');
  }
  for(const question of ['Đơn hàng của tôi trang 2','Lịch hẹn của Lan','Hủy đơn hàng của tôi','Paw Points là gì?']){
   await p.locator('#fabChatNewBtn').click();await p.locator('#fabChatInput').fill(question);await p.locator('#fabChatSend').click();await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled&&!document.querySelector('.fab-send-state'),null,{timeout:25000});const reply=await p.locator('.fab-chat-bubble--bot .fab-message-content').last().innerText();checks.push({flow:question,pass:question.includes('Lan')?reply.includes('người khác'):question.includes('Hủy')?reply.includes('chưa thay đổi'):question.includes('là gì')?reply.includes('điểm'):reply.includes('tài khoản')});
  }
  return {checks,metrics,pass:checks.every(x=>x.pass),scope:'Actual signed-in browser/API/Cloud; four bounded caller-JWT oracles, only own data inspected in memory; no private text/IDs/tokens exported; no model or business mutation'};
 }catch(e){return {checks,metrics,error:e.message};}finally{await p.close();}
}
