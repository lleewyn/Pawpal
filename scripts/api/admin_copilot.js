// Business routing is deterministic. The model never selects SQL, permissions or mutations.
const readTools=require('./chat_read_tools.js');
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const text=v=>String(v??'').replace(/[|\r\n]/g,' ').slice(0,600);
const labels={'appointment.list':'Lịch hẹn','inventory.low_stock':'Sản phẩm tồn kho thấp','ticket.open':'Khiếu nại chưa kết thúc','customer.lookup':'Khách hàng','order.lookup':'Đơn hàng','catalog.product':'Sản phẩm','catalog.service':'Dịch vụ','catalog.service_price':'Bảng giá dịch vụ','revenue.summary':'Thực thu','knowledge.search':'Thông tin tra cứu'};
const needsContext=question=>/^(the\b|vay\b|con\b|ngay mai\b|mai\b|ngay mot\b)|cau (hoi )?(tren|truoc)|nhu (tren|vay)/.test(normalize(question).trim());
const statuses={pending:'Chờ duyệt',confirmed:'Chờ phục vụ',checked_in:'Đã tiếp nhận',in_progress:'Đang thực hiện',completed:'Hoàn tất',cancelled:'Đã hủy',no_show:'Không đến',active:'Hoạt động',inactive:'Tạm ngừng',open:'Đang mở',new:'Mới',investigating:'Đang xác minh',resolved:'Đã giải quyết',closed:'Đã đóng',processing:'Đang xử lý'};
const status=v=>statuses[v]||v||'Chưa xác định';
function plan(question,now=new Date()){
 const q=normalize(question).trim().replace(/\s+/g,' ').replace(/\blich henh\b/g,'lich hen').replace(/\bton kh0\b/g,'ton kho');
 const write=/\b(tu dong|hay|giup toi|thuc hien|tien hanh)\b.*\b(cong diem|tang diem|hoan tien|gui tin|xoa|sua don|dat lich|chuyen ca)\b/.test(q)||/^(cong diem|tang diem|hoan tien|gui tin|xoa|sua don|dat lich|chuyen ca)\b/.test(q);
 if(write&&!/soan|huong dan|quy trinh|cach |mau |nhap/.test(q))return {intent:'refuse.write'};
 const local=new Date(now.getTime()+7*3600000).toISOString().slice(0,10);
 let date=local,hasDate=/hom nay|ngay mai|hom qua|\d{1,2}\/\d{1,2}/.test(q);
 if(/ngay mai|\bmai va (ngay )?mot/.test(q))date=new Date(Date.parse(local+'T00:00:00+07:00')+86400000+7*3600000).toISOString().slice(0,10);
 else if(/ngay mot/.test(q))date=new Date(Date.parse(local+'T00:00:00+07:00')+2*86400000+7*3600000).toISOString().slice(0,10);
 if(/hom qua/.test(q))date=new Date(Date.parse(local+'T00:00:00+07:00')-86400000+7*3600000).toISOString().slice(0,10);
 const explicit=q.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
 if(explicit){date=`${explicit[3]||local.slice(0,4)}-${explicit[2].padStart(2,'0')}-${explicit[1].padStart(2,'0')}`;const parsed=new Date(date+'T00:00:00+07:00');if(!Number.isFinite(parsed.getTime())||new Date(parsed.getTime()+7*3600000).toISOString().slice(0,10)!==date)return {intent:'clarify',answer:'Ngày chưa hợp lệ. Hãy nhập ngày theo dạng ngày/tháng/năm.'};}
 if(/tuan|thang nay|thang truoc|nam nay|den ngay|tu ngay/.test(q))return {intent:'clarify',answer:'Bạn muốn xem ngày nào? Hiện hỗ trợ từng ngày theo giờ Việt Nam, ví dụ 25/10/2026.'};
 hasDate=hasDate||/ngay mot|\bmai va (ngay )?mot/.test(q);
 const dates={start_at:date+'T00:00:00+07:00',end_at:new Date(Date.parse(date+'T00:00:00+07:00')+(/mai va (ngay )?mot/.test(q)?2:1)*86400000).toISOString()};
 if(/soan|viet.*(loi|tin|tra loi)|ban nhap/.test(q))return {intent:'draft.reply'};
 if(/tom tat.*(hoi thoai|ca chat|cuoc chat)/.test(q))return {intent:'conversation.summary'};
 if(/quy trinh|huong dan|chinh sach|cach xu ly/.test(q))return {intent:'workflow.guide'};
 if(/doanh thu|thuc thu|tien thu|tong thu/.test(q))return {intent:'revenue.summary',filters:dates};
 if(/lich hen|lich spa|lich.*(cho phuc vu|cho duyet)|lich.*hom nay/.test(q)){
  if(/chua (phan cong|co ktv)|theo (ktv|nhan vien)|buoi |\b(sang|chieu|toi)\b/.test(q))return {intent:'clarify',answer:'Bạn muốn xem lịch theo ngày nào? Bộ lọc theo buổi hoặc phân công chưa được hỗ trợ trong tra cứu này. Bạn có thể mở mục Lịch hẹn để kiểm tra.'};
  if(!hasDate)return {intent:'clarify',answer:'Bạn muốn xem lịch ngày nào? Ví dụ: lịch Spa chờ phục vụ hôm nay.'};
  const filters={...dates};if(/spa|grooming|cat tia|tam say/.test(q))filters.category='grooming_spa';else if(/khach san|hotel/.test(q))filters.category='pet_hotel';else if(/taxi|dua don/.test(q))filters.category='pet_taxi';
  if(/cho phuc vu|da xac nhan/.test(q))filters.status='confirmed';else if(/cho duyet|cho xac nhan/.test(q))filters.status='pending';else if(/dang (lam|thuc hien)/.test(q))filters.status='in_progress';else if(/hoan tat|hoan thanh/.test(q))filters.status='completed';
  return {intent:'appointment.list',filters};
 }
 if(/ton kho|sku.*(nguong|thieu)|sap het hang|ton thap|ton.*duoi.*nguong/.test(q)){
  if(/tren nguong|bang nguong|<=|lon hon/.test(q))return {intent:'clarify',answer:'Bạn cần điều kiện tồn kho nào? Hiện truy vấn đã hỗ trợ SKU có tồn kho nhỏ hơn tồn tối thiểu (không bao gồm bằng ngưỡng).'};
  return {intent:'inventory.low_stock',filters:{}};
 }
 if(/khieu nai|ticket|phieu ho tro/.test(q))return {intent:'ticket.open',filters:/24 gio/.test(q)?{start_at:new Date(now.getTime()-86400000).toISOString(),end_at:now.toISOString()}:hasDate?dates:{}};
 if(/khach hang|chu nuoi|\bCUS-/.test(question)||/khach hang|chu nuoi|\b0\d{8,10}\b/.test(q)){
  const query=question.match(/\bCUS-[\w-]+|\b0\d{8,10}\b/i)?.[0]||question.split(/[:：]/).slice(1).join(':').trim()||question.match(/(?:khách hàng|chủ nuôi|khach hang|chu nuoi)\s+(?:tên|ten|là|la)\s+(.+)$/iu)?.[1]?.trim();
  return query?{intent:'customer.lookup',filters:{query}}:{intent:'clarify',answer:'Hãy nhập mã khách, số điện thoại hoặc tên sau dấu hai chấm. Ví dụ: Khách hàng: Nguyễn An.'};
 }
 if(/don hang|ma don/.test(q)){
  const query=question.split(/[:：]/).slice(1).join(':').trim()||question.match(/\b(?:ORD|SO|DH|POS)-[\w-]+/i)?.[0];
  return query?{intent:'order.lookup',filters:{query}}:{intent:'clarify',answer:'Hãy cung cấp mã đơn. Ví dụ: Đơn hàng: mã đơn cần tìm.'};
 }
 if(/gia|bao nhieu tien|tinh phi/.test(q)&&/dich vu|taxi|hotel|khach san|spa|tam|cat tia/.test(q)){
  const filters={query:question.split(/[:：]/).slice(1).join(':').trim()};
  if(/taxi|dua don/.test(q))filters.category='pet_taxi';else if(/hotel|khach san/.test(q))filters.category='pet_hotel';else if(/spa|cat tia|tam/.test(q))filters.category='grooming_spa';
  return {intent:'catalog.service_price',filters};
 }
 if(/san pham|hang hoa|dich vu|goi spa/.test(q)){
  const query=question.split(/[:：]/).slice(1).join(':').trim();
  if(!query&&/gia|bao nhieu tien/.test(q))return {intent:'clarify',answer:'Hãy ghi tên hoặc SKU sau dấu hai chấm để tra đúng giá biến thể. Ví dụ: Sản phẩm: TP-HAT-01.'};
  return {intent:/san pham|hang hoa/.test(q)?'catalog.product':'catalog.service',filters:{query}};
 }
 if(!/ho tro.*gi|ban lam duoc gi|chuc nang/.test(q)&&q.trim().split(/\s+/).length>=3)return {intent:'knowledge.search',filters:{query:question.slice(0,120)}};
 return {intent:'capabilities'};
}
function contextualPlan(question,history=[],now=new Date(),readContext={}){
 const reference=normalize(question).trim();
 if(/^(?:thong tin )?(?:khach(?: hang)?|chu nuoi) nay\??$/.test(reference))return readContext.customerQuery?{intent:'customer.lookup',filters:{query:readContext.customerQuery}}:{intent:'clarify',answer:'Hãy chọn hội thoại của khách hàng hoặc cung cấp tên, mã khách hay số điện thoại cần tra cứu.'};
 if(/^(?:thong tin )?don(?: hang)? nay\??$/.test(reference))return readContext.orderCode?{intent:'order.lookup',filters:{query:readContext.orderCode}}:{intent:'clarify',answer:'Hãy cung cấp mã đơn cần tra cứu. Hội thoại đang mở có thể có nhiều đơn hàng.'};
 const route=plan(question,now);if(!needsContext(question))return route;
 for(const turn of history.slice().reverse()){
  if(turn.role!=='user')continue;const previous=plan(String(turn.content||''),now);
  if(previous.intent==='appointment.list'){
   const next=plan('Lịch hẹn '+question,now);
   if(next.intent==='appointment.list')return {...next,filters:{...previous.filters,...next.filters}};
  }
 }
 return route;
}
function formatFacts(data,{includeSource=true}={}){
 const numeric=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v));
 if(!data||!numeric(data.total))throw Error('invalid_copilot_facts');
 const n=Number(data.total);if(!Number.isSafeInteger(n)||n<0||!Array.isArray(data.items)||data.items.length>n||n===0&&data.items.length)throw Error('invalid_copilot_facts');
 if(data.intent==='revenue.summary'&&(!['collected','refunded','net'].every(k=>numeric(data[k]))||Math.abs(Number(data.net)-(Number(data.collected)-Number(data.refunded)))>0.001))throw Error('invalid_copilot_facts');
 if(data.intent==='inventory.low_stock'&&data.items.some(r=>!numeric(r.stock)||!numeric(r.minimum)))throw Error('invalid_copilot_facts');
 const title=labels[data.intent]||'Kết quả';const scope=data.scope||{};
 const date=scope.start_at?new Date(scope.start_at).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'';
 const category={grooming_spa:'Spa và cắt tỉa',pet_hotel:'Khách sạn thú cưng',pet_taxi:'Đưa đón thú cưng'}[scope.category];
 const rows=data.items.map(r=>{
  if(data.intent==='inventory.low_stock')return `- ${text(r.name)} — SKU ${text(r.sku)}: tồn ${r.stock}, tối thiểu ${r.minimum}.`;
  if(data.intent==='appointment.list')return `- ${text(r.code)} — ${status(r.status)}, ${new Date(r.scheduled_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'})}; ${text(r.services)}.`;
  if(data.intent==='catalog.product')return `- ${text(r.name)} — ${text(r.sku)}, ${text(r.variant)}: ${Number(r.price).toLocaleString('vi-VN')}đ.`;
  if(data.intent==='catalog.service')return `- ${text(r.code)} — ${text(r.name)}: ${text(r.description)}.`;
  if(data.intent==='knowledge.search')return `${text(r.question)}\n${String(r.answer||'')}`;
  if(data.intent==='catalog.service_price'){
   const rules=(r.prices||[]).map(p=>p.kind==='taxi'?`${p.distance_from}–${p.distance_to??'trở lên'} km, ${p.weight_from}–${p.weight_to??'trở lên'} kg: ${Number(p.price).toLocaleString('vi-VN')} đ${Number(p.surcharge)?', phụ phí '+Number(p.surcharge).toLocaleString('vi-VN')+' đ':''}`:p.kind==='hotel'?`${text(p.name)}: ${Number(p.price).toLocaleString('vi-VN')} đ/ngày`:`${p.weight_from}–${p.weight_to??'trở lên'} kg: ${Number(p.price).toLocaleString('vi-VN')} đ`);
   return `- **${text(r.name)}**: ${rules.length?rules.join('; '):'chưa có mức giá đang áp dụng.'}`;
  }
  if(data.intent==='customer.lookup')return `- ${text(r.code)} — ${text(r.name)}, ${text(r.phone)}, ${status(r.status)}.`;
  if(data.intent==='ticket.open')return `- ${text(r.code)} — ${text(r.subject)}, ${status(r.status)}, ưu tiên ${text(r.priority)}.`;
  return `- ${text(r.code)} — ${status(r.status)}, giao hàng ${status(r.shipping_status)}${r.tracking_code?', vận đơn '+text(r.tracking_code):''}.`;
 });
 let heading=data.intent==='appointment.list'?`Ngày ${date} có **${n} lịch hẹn**${category?' '+category:''}${scope.status?' ở trạng thái '+status(scope.status).toLowerCase():''}.`:data.intent==='inventory.low_stock'?(n?`Có **${n} mã hàng đang bán** có tồn kho thấp hơn mức tối thiểu đã cấu hình.`:'Hiện không có mã hàng đang bán nào có tồn kho thấp hơn mức tối thiểu đã cấu hình.'):`${title}: **${n}**${data.unit?' '+data.unit:''}.`;
 if(data.intent==='revenue.summary')heading=`Ngày ${date}: đã thu **${Number(data.collected).toLocaleString('vi-VN')} đ**, đã hoàn **${Number(data.refunded).toLocaleString('vi-VN')} đ**.\n\nThực thu: **${Number(data.net).toLocaleString('vi-VN')} đ**. Chỉ tính giao dịch thành công theo thời điểm thu/hoàn, không phải tổng giá trị đơn tạo trong ngày.`;
 if(n===0){
  const empty={'knowledge.search':'Chưa tìm thấy thông tin phù hợp trong kho tri thức đang bật. Bạn vui lòng nêu cụ thể nội dung cần tra cứu.','catalog.service_price':'Chưa có dịch vụ đang hoạt động phù hợp để tra bảng giá.','catalog.service':'Không tìm thấy dịch vụ phù hợp.','catalog.product':'Không tìm thấy sản phẩm phù hợp.','customer.lookup':'Không tìm thấy khách hàng phù hợp.','order.lookup':'Không tìm thấy đơn hàng phù hợp.','ticket.open':'Hiện không có khiếu nại chưa kết thúc phù hợp với điều kiện tra cứu.'};
  heading=empty[data.intent]||heading;
 }
 return [heading,...rows,...(data.guidance||[]).map(item=>`${text(item.question)}\n${String(item.answer||'')}`),n>data.items.length&&data.intent!=='revenue.summary'?`Đang hiển thị ${data.items.length}/${n} kết quả.`:'',data.limitations||'',includeSource?`Dữ liệu cập nhật lúc ${new Date(data.as_of).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}.`:''].filter(Boolean).join('\n\n');
}
async function answerInternal({question,caller,staff,conversationId,generateReply,history,now,readBudget,readContext}){
 const budget=readBudget||readTools.createReadBudget();
 const route=contextualPlan(question,history,now,readContext);const request={answer_type:route.intent,scope:route.filters||{},limitations:[]};
 if(labels[route.intent]){
  const prepared=readTools.prepare(route.intent,route.filters||{},staff.permissions);
  request.plan={version:1,audience:'staff',intent:prepared.intent,filters:prepared.filters,operation:['appointment.list','ticket.open','inventory.low_stock'].includes(route.intent)?'count_and_list':'lookup',readOnly:true};
  request.continuation=prepared.target?{type:'open_module',href:prepared.target}:null;
  const fetch=filters=>budget.run(caller,readTools.prepare(route.intent,filters,staff.permissions));
  if(route.intent==='appointment.list'&&(Date.parse(route.filters.end_at)-Date.parse(route.filters.start_at))===2*86400000){
   const start=Date.parse(route.filters.start_at),middle=new Date(start+86400000).toISOString();const daily=await Promise.all([fetch({...route.filters,end_at:middle}),fetch({...route.filters,start_at:middle})]);
   return {...request,reply:daily.map(d=>formatFacts(d,{includeSource:false})).join('\n\n'),facts:{daily,total:daily.reduce((n,d)=>n+Number(d.total),0)},as_of:daily[0].as_of,resource_usage:budget.snapshot()};
  }
  const data=await fetch(route.filters||{});return {reply:formatFacts(data),...request,facts:data,source:data.source,as_of:data.as_of,resource_usage:budget.snapshot()};
 }
 if(route.intent==='refuse.write')return {...request,reply:'Tôi chỉ tra cứu, phân tích, hướng dẫn và soạn nháp. Tôi không tự cộng điểm, hoàn tiền, gửi tin, sửa đơn, đặt lịch hoặc xóa dữ liệu. Nhân viên cần kiểm tra và thực hiện thao tác theo quyền ở phân hệ tương ứng.'};
 if(route.intent==='clarify')return {...request,reply:route.answer};
 if(route.intent==='capabilities')return {...request,reply:'Tôi hỗ trợ:\n- Tra lịch hẹn theo ngày và nhóm dịch vụ.\n- Đếm SKU dưới ngưỡng tồn tối thiểu.\n- Xem khiếu nại chưa kết thúc.\n- Tìm khách hàng hoặc đơn theo mã.\n- Tra sản phẩm, giá biến thể và dịch vụ.\n- Tóm tắt hội thoại đã chọn, soạn nháp và hướng dẫn xử lý.\n\nVí dụ: “Hôm nay có bao nhiêu lịch Spa chờ phục vụ?”, “Khách hàng: tên hoặc số điện thoại”, “Sản phẩm: SKU”. Tôi chỉ xem dữ liệu trong quyền của bạn; không tự thực hiện nghiệp vụ.'};
 const context={mode:route.intent,limitations:['Chỉ soạn nháp để nhân viên kiểm tra; không tự gửi, không hứa ưu đãi hoặc thời gian chưa được xác nhận.']};
 if(route.intent==='conversation.summary'||conversationId){
  if(!conversationId)return {...request,reply:'Hãy chủ động chọn một hội thoại ở tab Trực chat trước khi yêu cầu tóm tắt ca.'};
  if(!staff.permissions.includes('chat_message.read')||!staff.permissions.includes('chat_conversation.read'))throw Object.assign(Error('copilot_forbidden'),{code:'42501'});
  const messages=await budget.run(caller,readTools.prepare('conversation.context',{conversationId},staff.permissions));
  context.messages=messages.slice(0,12).reverse().map(m=>({sender:m.sender_type,content:String(m.content||'').slice(0,800)}));
  if(route.intent==='conversation.summary'&&!context.messages.length)return {...request,reply:'Hội thoại đã chọn chưa có nội dung để tóm tắt trong phạm vi bạn được xem.'};
  context.limitations.push('Chỉ sử dụng tối đa 12 tin gần nhất đã lọc, không phải toàn bộ lịch sử.');
 }
 if(route.intent==='workflow.guide'){
  const data=await budget.run(caller,readTools.prepare('knowledge.search',{query:question.slice(0,120)},staff.permissions));
  if(!data.items?.length)return {...request,reply:'Chưa có hướng dẫn phù hợp trong kho tri thức đang bật. Bạn vui lòng kiểm tra quy trình hiện hành trước khi tư vấn cho khách.'};
  context.faq=data.items;
 }else if(staff.permissions.includes('chatbot_knowledge_faq.read')){
  const category=/hoan tien|boi hoan|cong diem/.test(normalize(question))?'bồi hoàn':/giao hang/.test(normalize(question))?'giao hàng':/dat lich/.test(normalize(question))?'đặt lịch':null;
  if(category){const data=await budget.run(caller,readTools.prepare('knowledge.search',{query:category},staff.permissions));context.faq=data.items.map(r=>({question:String(r.question||'').slice(0,200),answer:String(r.answer||'').slice(0,1200)}));}
 }
 let reply=await generateReply(question,context,history||[]);
 if(typeof reply!=='string'||!reply.trim()||reply.length>16000)throw Error('invalid_ai_response');
 reply=reply.replace(/^(?:\s*(?:\*\*)?Bản nháp AI[^\n]*(?:\n|$))+/giu,'').split(/\n\s*(?:\*\*)?Phạm vi\s*:/iu)[0].trim();
 if(!reply)throw Error('invalid_ai_response');
 const heading=route.intent==='draft.reply'?'Bản nháp AI — cần kiểm tra':route.intent==='conversation.summary'?'Tóm tắt hội thoại':'Hướng dẫn tham khảo';
 return {...request,reply:'**'+heading+'**\n\n'+reply+'\n\nPhạm vi: '+context.limitations.join(' '),source:context.faq?.length?'FAQ đang bật và thông tin bạn cung cấp':'Thông tin bạn cung cấp'+(context.messages?' và tối đa 12 tin gần nhất đã lọc':''),limitations:context.limitations,resource_usage:budget.snapshot()};
}
async function answer(args){
 const result=await answerInternal(args);
 const route=result.answer_type,filters=result.scope||{};
 const entity=route?.split('.')[0]||'conversation';
 return {contract_version:1,source:null,as_of:null,limitations:[],continuation:null,
  plan:{version:1,audience:'staff',intent:route,entity,filters,period:filters.start_at?{start:filters.start_at,end:filters.end_at,timeZone:'Asia/Ho_Chi_Minh'}:null,relations:[],readOnly:true},
  ...result,
  ...(result.plan?{plan:{entity,period:filters.start_at?{start:filters.start_at,end:filters.end_at,timeZone:'Asia/Ho_Chi_Minh'}:null,relations:[],...result.plan}}:{})};
}
module.exports={plan,contextualPlan,needsContext,formatFacts,answer};
