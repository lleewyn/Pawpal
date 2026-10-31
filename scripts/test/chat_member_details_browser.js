// Existing member session, live local API/Cloud. Exports booleans/counts only.
async(page)=>{const p=await page.context().newPage(),checks=[];try{
 await p.goto('http://localhost:4000/');await p.locator('#fabAiBtn').click();await p.waitForFunction(()=>getComputedStyle(document.querySelector('#fabChatPanel')).opacity==='1');
 const cases=[['Lịch sử điểm của tôi','point_history'],['Ví ưu đãi của tôi','wallet'],['Nhật ký chăm sóc của tôi','care'],['Hotel của tôi đã đặt thế nào?','hotel'],['Taxi của tôi đón ở đâu?','taxi'],['Yêu cầu hỗ trợ của tôi xử lý đến đâu?','support']];
 for(const [question,kind]of cases){
  const oracle=await p.evaluate(async kind=>{const r=await getSupabaseClient().rpc('read_member_chat_details',{p_request:{kind,page:0}});return {data:r.data,error:r.error?.code};},kind);if(oracle.error)throw Error('Oracle '+kind+': '+oracle.error);
  await p.locator('#fabChatNewBtn').click();await p.locator('#fabChatInput').fill(question);const [r]=await Promise.all([p.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin-chat'&&JSON.parse(r.request().postData()||'{}').action==='public_send'),p.locator('#fabChatSend').click()]);await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled&&!document.querySelector('.fab-send-state'),null,{timeout:25000});
  const reply=await p.locator('.fab-chat-bubble--bot .fab-message-content').last().innerText();
  const expected=oracle.data.items,matches=expected.length?expected.every(row=>kind==='point_history'?reply.includes(row.points.toLocaleString('vi-VN')+' điểm'):kind==='care'?reply.includes(row.code)&&reply.includes(row.action):reply.includes(row.code)):reply.includes('chưa tìm thấy');
  checks.push({kind,status:r.status(),oracleRows:expected.length,pass:r.ok()&&matches&&!reply.includes('undefined'),hasAccountLink:await p.locator('.fab-chat-bubble--bot a[href^="/user#"]').count()>0});
  if(!matches)throw Error('Mismatch '+kind);
 }
 return {checks,pass:checks.every(c=>c.pass&&c.hasAccountLink),scope:'Real signed-in browser/localAPI/Cloud; six caller-JWT oracles, no private fields exported. Read-only business data; own diagnostic chats only; no Gemini.'};
}catch(e){return {checks,error:e.message};}finally{await p.close();}}
