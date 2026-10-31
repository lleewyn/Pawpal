// Run with Playwright in the existing authenticated Admin context. No Gemini.
async(page)=>{const p=await page.context().newPage(),checks=[];try{
 await p.goto('http://localhost:4000/admin#tab-ai-copilot');await p.locator('#copilotInput').waitFor({timeout:20000});
 const cases=[
 ['Hotel còn phòng ngày mai không?','hotel.availability'],['Lượt lưu trú hôm nay','hotel.stays'],['Chuyến Taxi hôm nay','taxi.trips'],
 ['Lịch Spa ngày mai buổi sáng','appointment.search'],['Lịch hẹn hôm nay theo KTV: QA-ADMIN-NOT-FOUND','appointment.search'],
 ['So sánh thực thu tuần này và tuần trước','revenue.compare'],['So sánh thực thu tháng này và tháng trước','revenue.compare'],
 ['Việc cần xử lý hôm nay','operations.pending'],['Bảng giá chi tiết Hotel: Dịch Vụ Daycare','catalog.price_rows'],
 ['Đơn hàng ORD-QA-NOT-FOUND','order.lookup'],['Khiếu nại chưa xử lý hôm nay','ticket.open'],['Sản phẩm sắp hết hàng','inventory.low_stock'],
 ['Danh sách hội thoại hôm nay','conversation.list'],['Doanh thu tuần này','revenue.summary'],['Đơn hủy chưa hoàn','order.refund_pending'],
 ['Lịch trực hôm nay','staff.schedule'],['Đánh giá một sao hôm nay','review.list'],['Bài viết bản nháp','content.list'],
 ['Hotline cửa hàng','settings.read'],['Khách này có thú cưng và đơn hàng mới nhất?: CUS-QA-NOT-FOUND','clarify'],
 ['Khách này có lịch sắp tới và khiếu nại nào còn mở?: CUS-QA-NOT-FOUND','clarify'],
 ['Xóa khách hàng CUS-QA-NOT-FOUND','refuse.write'],['Khách sạn còn phòng không?','clarify'],['Giá tắm bé 7kg','clarify']
 ];
 // Choose a bounded batch without changing the user's existing tab or session.
 const batch=Number(globalThis.__pawpalAdminBatch||0),selected=cases.slice(batch*8,batch*8+8);
 for(const [question,intent]of selected){
  // Stay below the existing 10 requests/minute guard, including adjacent batches.
  await new Promise(resolve=>setTimeout(resolve,9000));
  await p.locator('#btnNewCopilotSession').click();await p.locator('#copilotInput').fill(question);
  const t=Date.now(),[r]=await Promise.all([p.waitForResponse(r=>new URL(r.url()).pathname==='/api/admin-chat'&&r.request().method()==='POST'&&JSON.parse(r.request().postData()||'{}').question===question,{timeout:30000}),p.locator('#btnSendCopilot').click()]);const data=await r.json();
  await p.waitForFunction(()=>!document.querySelector('#btnSendCopilot').disabled,null,{timeout:25000});
  const bubble=r.ok()?await p.locator('.copilot-msg.msg-ai .copilot-msg-bubble').last().innerText():'';
  checks.push({question,status:r.status(),intent:data.answer_type,error:data.error,expected:intent,pass:r.ok()&&data.answer_type===intent&&bubble.trim().length>0,readCalls:data.resource_usage?.calls,bytes:data.resource_usage?.bytes,scope:data.scope,ms:Date.now()-t});if(!r.ok())break;
 }
 return {batch,checks,scope:'Actual localhost Admin UI/API and Cloud. Own new diagnostic chat sessions only. No private source rows exported. No Gemini or business mutations.'};
}catch(e){return {checks,error:e.message};}finally{await p.close();}}
