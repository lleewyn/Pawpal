// Existing signed-in Vercel member session. Private facts stay in browser memory.
async(page)=>{const p=await page.context().newPage(),checks=[],metrics=[];try{
 p.on('response',async r=>{if(new URL(r.url()).pathname==='/api/admin-chat')metrics.push({action:JSON.parse(r.request().postData()||'{}').action,status:r.status(),bytes:(await r.body().catch(()=>new Uint8Array())).length});});
 await p.goto('https://pawpalgr3.vercel.app/');const signed=await p.evaluate(async()=>!!(await getSupabaseClient().auth.getSession()).data.session);if(!signed)return {signedIn:false};
 await p.waitForFunction(()=>window.__pawpalFabInitialized===true);await p.locator('#fabAiBtn').click();await p.waitForFunction(()=>getComputedStyle(document.querySelector('#fabChatPanel')).opacity==='1');
 const cases=[['Tôi có lịch nào sắp tới?',{kind:'appointments',page:0,mode:'upcoming'}],['Đơn hàng của tôi đang ở đâu?',{kind:'orders',page:0}],['Tôi có những bé nào?',{kind:'pets',page:0}],['Tôi còn bao nhiêu Paw Points?',{kind:'loyalty',page:0}],['Lịch sử điểm của tôi',{kind:'point_history',page:0}],['Ví ưu đãi của tôi',{kind:'wallet',page:0}],['Nhật ký chăm sóc của tôi',{kind:'care',page:0}],['Hotel của tôi đã đặt thế nào?',{kind:'hotel',page:0}],['Taxi của tôi đón ở đâu?',{kind:'taxi',page:0}],['Yêu cầu hỗ trợ của tôi xử lý đến đâu?',{kind:'support',page:0}]];
 for(const [question,request]of cases){
  const advanced=['point_history','wallet','care','hotel','taxi','support'].includes(request.kind);
  const oracle=await p.evaluate(async({request,advanced})=>{const r=await getSupabaseClient().rpc(advanced?'read_member_chat_details':'read_member_chat_context',{p_request:request});return {data:r.data,error:r.error?.code};},{request,advanced});if(oracle.error)throw Error('Oracle '+request.kind+': '+oracle.error);
  await p.locator('#fabChatNewBtn').click();await p.locator('#fabChatInput').fill(question);const t=Date.now();await p.locator('#fabChatSend').click();await p.waitForFunction(()=>!document.querySelector('#fabChatSend').disabled&&!document.querySelector('.fab-send-state'),null,{timeout:30000});
  const reply=await p.locator('.fab-chat-bubble--bot .fab-message-content').last().innerText(),rows=oracle.data.items;
  const matches=rows.length?rows.every(row=>request.kind==='loyalty'?reply.includes(row.points.toLocaleString('vi-VN')+' Paw Points')&&(!row.tier||reply.includes(row.tier)):request.kind==='point_history'?reply.includes(row.points.toLocaleString('vi-VN')+' điểm'):reply.includes(row.code)):reply.includes('chưa tìm thấy');
  const links=await p.locator('.fab-chat-bubble--bot a[href^="/user#"]').count();checks.push({kind:request.kind,oracleRows:rows.length,pass:matches&&links>0&&!reply.includes('undefined'),elapsedMs:Date.now()-t});if(!matches)throw Error('Mismatch '+request.kind);
 }
 return {checks,metrics,pass:checks.every(x=>x.pass),scope:'Real Vercel UI/API/Cloud and caller-JWT bounded oracle. No private fields/tokens exported, no Gemini or business mutation. Own diagnostic chats only.'};
}catch(e){return {checks,metrics,error:e.message};}finally{await p.close();}}
