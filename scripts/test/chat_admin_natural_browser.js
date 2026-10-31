// Actual Admin UI/API, existing staff context. No model prompts, no business mutations.
async(page)=>{const p=await page.context().newPage(),checks=[];try{
 await p.goto('http://localhost:4000/admin#tab-ai-copilot');await p.locator('#copilotInput').waitFor({timeout:20000});
 const cases=[['Lịch ngày mai','appointment.list'],['Khách hàng QA-NATURAL-NOT-FOUND','customer.lookup'],['Thú cưng QA-NATURAL-NOT-FOUND','pet.lookup'],['Sản phẩm Royal Canin','catalog.product'],['Điểm của khách CUS-QA-NOT-FOUND','points.lookup'],['Hotel hôm nay','appointment.list'],['Khách sạn còn phòng không?','clarify'],['Giá tắm bé 7kg','clarify']];
 for(const [question,intent]of cases){
  await p.locator('#btnNewCopilotSession').click();await p.locator('#copilotInput').fill(question);
  const t=Date.now(),[r]=await Promise.all([p.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin-chat'&&r.request().method()==='POST'&&JSON.parse(r.request().postData()||'{}').question===question,{timeout:30000}),p.locator('#btnSendCopilot').click()]);const data=await r.json();
  await p.waitForFunction(()=>!document.querySelector('#btnSendCopilot').disabled,null,{timeout:25000});
  checks.push({question,status:r.status(),intent:data.answer_type,expected:intent,pass:r.ok()&&data.answer_type===intent,readCalls:data.resource_usage?.calls,ms:Date.now()-t});if(!r.ok())break;
 }
 return {checks,scope:'Actual localhost Admin UI/API and Cloud, new own diagnostic sessions only, source contents/IDs not exported. No model or business mutation.'};
}catch(e){return {checks,error:e.message};}finally{await p.close();}}
