// Business routing is deterministic. The model never selects SQL, permissions or mutations.
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const text=v=>String(v??'').replace(/[|\r\n]/g,' ').slice(0,600);
const labels={'appointment.list':'Lịch hẹn','inventory.low_stock':'SKU dưới ngưỡng tồn tối thiểu','ticket.open':'Khiếu nại chưa kết thúc','customer.lookup':'Khách hàng','order.lookup':'Đơn hàng','catalog.product':'Biến thể sản phẩm','catalog.service':'Dịch vụ'};
const statuses={pending:'Chờ duyệt',confirmed:'Chờ phục vụ',checked_in:'Đã tiếp nhận',in_progress:'Đang thực hiện',completed:'Hoàn tất',cancelled:'Đã hủy',no_show:'Không đến',active:'Hoạt động',inactive:'Tạm ngừng',open:'Đang mở',new:'Mới',investigating:'Đang xác minh',resolved:'Đã giải quyết',closed:'Đã đóng',processing:'Đang xử lý'};
const status=v=>statuses[v]||v||'Chưa xác định';
function plan(question,now=new Date()){
 const q=normalize(question);
 const write=/\b(tu dong|hay|giup toi|thuc hien|tien hanh)\b.*\b(cong diem|tang diem|hoan tien|gui tin|xoa|sua don|dat lich|chuyen ca)\b/.test(q)||/^(cong diem|tang diem|hoan tien|gui tin|xoa|sua don|dat lich|chuyen ca)\b/.test(q);
 if(write&&!/soan|huong dan|quy trinh|cach |mau |nhap/.test(q))return {intent:'refuse.write'};
 const local=new Date(now.getTime()+7*3600000).toISOString().slice(0,10);
 let date=local,hasDate=/hom nay|ngay mai|hom qua|\d{1,2}\/\d{1,2}/.test(q);
 if(/ngay mai/.test(q))date=new Date(Date.parse(local+'T00:00:00+07:00')+86400000+7*3600000).toISOString().slice(0,10);
 if(/hom qua/.test(q))date=new Date(Date.parse(local+'T00:00:00+07:00')-86400000+7*3600000).toISOString().slice(0,10);
 const explicit=q.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);
 if(explicit){date=`${explicit[3]||local.slice(0,4)}-${explicit[2].padStart(2,'0')}-${explicit[1].padStart(2,'0')}`;const parsed=new Date(date+'T00:00:00+07:00');if(!Number.isFinite(parsed.getTime())||new Date(parsed.getTime()+7*3600000).toISOString().slice(0,10)!==date)return {intent:'clarify',answer:'Ngày chưa hợp lệ. Hãy nhập ngày theo dạng ngày/tháng/năm.'};}
 if(/tuan|thang nay|thang truoc|nam nay|den ngay|tu ngay/.test(q))return {intent:'clarify',answer:'Bạn muốn xem ngày nào? Hiện hỗ trợ từng ngày theo giờ Việt Nam, ví dụ 25/10/2026.'};
 const dates={start_at:date+'T00:00:00+07:00',end_at:new Date(Date.parse(date+'T00:00:00+07:00')+86400000).toISOString()};
 if(/soan|viet.*(loi|tin|tra loi)|ban nhap/.test(q))return {intent:'draft.reply'};
 if(/tom tat.*(hoi thoai|ca chat|cuoc chat)/.test(q))return {intent:'conversation.summary'};
 if(/quy trinh|huong dan|chinh sach|cach xu ly/.test(q))return {intent:'workflow.guide'};
 if(/lich hen|lich spa|lich.*(cho phuc vu|cho duyet)|lich.*hom nay/.test(q)){
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
  const query=question.match(/\bCUS-[\w-]+|\b0\d{8,10}\b/i)?.[0]||question.split(/[:：]/).slice(1).join(':').trim();
  return query?{intent:'customer.lookup',filters:{query}}:{intent:'clarify',answer:'Hãy nhập mã khách, số điện thoại hoặc tên sau dấu hai chấm. Ví dụ: Khách hàng: Nguyễn An.'};
 }
 if(/don hang|ma don/.test(q)){
  const query=question.split(/[:：]/).slice(1).join(':').trim()||question.match(/\b(?:ORD|SO|DH|POS)-[\w-]+/i)?.[0];
  return query?{intent:'order.lookup',filters:{query}}:{intent:'clarify',answer:'Hãy cung cấp mã đơn. Ví dụ: Đơn hàng: mã đơn cần tìm.'};
 }
 if(/san pham|hang hoa|dich vu|goi spa/.test(q)){
  const query=question.split(/[:：]/).slice(1).join(':').trim();
  if(!query&&/gia|bao nhieu tien/.test(q))return {intent:'clarify',answer:'Hãy ghi tên hoặc SKU sau dấu hai chấm để tra đúng giá biến thể. Ví dụ: Sản phẩm: TP-HAT-01.'};
  return {intent:/san pham|hang hoa/.test(q)?'catalog.product':'catalog.service',filters:{query}};
 }
 return {intent:'capabilities'};
}
function formatFacts(data){
 const n=Number(data.total);if(!Number.isSafeInteger(n)||n<0||!Array.isArray(data.items))throw Error('invalid_copilot_facts');
 const title=labels[data.intent]||'Kết quả';const scope=data.scope||{};
 const date=scope.start_at?new Date(scope.start_at).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'Toàn bộ dữ liệu bạn được phép xem';
 const category={grooming_spa:'Spa và cắt tỉa',pet_hotel:'Khách sạn thú cưng',pet_taxi:'Đưa đón thú cưng'}[scope.category];
 const rows=data.items.map(r=>{
  if(data.intent==='inventory.low_stock')return `- ${text(r.name)} — SKU ${text(r.sku)}: tồn ${r.stock}, tối thiểu ${r.minimum}.`;
  if(data.intent==='appointment.list')return `- ${text(r.code)} — ${status(r.status)}, ${new Date(r.scheduled_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'})}; ${text(r.services)}.`;
  if(data.intent==='catalog.product')return `- ${text(r.name)} — ${text(r.sku)}, ${text(r.variant)}: ${Number(r.price).toLocaleString('vi-VN')}đ.`;
  if(data.intent==='catalog.service')return `- ${text(r.code)} — ${text(r.name)}: ${text(r.description)}.`;
  if(data.intent==='customer.lookup')return `- ${text(r.code)} — ${text(r.name)}, ${text(r.phone)}, ${status(r.status)}.`;
  if(data.intent==='ticket.open')return `- ${text(r.code)} — ${text(r.subject)}, ${status(r.status)}, ưu tiên ${text(r.priority)}.`;
  return `- ${text(r.code)} — ${status(r.status)}, giao hàng ${status(r.shipping_status)}${r.tracking_code?', vận đơn '+text(r.tracking_code):''}.`;
 });
 return [`${title}: **${n}**${data.unit?' '+data.unit:''}.`,`${date}${category?' · '+category:''}${scope.status?' · '+status(scope.status):''}.`,
  data.intent==='inventory.low_stock'?'Điều kiện: tồn kho **nhỏ hơn** tồn tối thiểu; chỉ SKU đang bán.':'',
  n?`Hiển thị ${data.items.length}/${n} kết quả.`:'Không có kết quả trong phạm vi đã truy vấn thành công.',...rows,
  data.limitations||'',`Nguồn: ${title.toLowerCase()} trên hệ thống. Cập nhật lúc ${new Date(data.as_of).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})} (giờ Việt Nam).`].filter(Boolean).join('\n\n');
}
async function answer({question,caller,staff,conversationId,generateReply,history,now}){
 const route=plan(question,now);const request={answer_type:route.intent,scope:route.filters||{},limitations:[]};
 if(labels[route.intent]){const {data,error}=await caller.rpc('admin_copilot_facts',{p_intent:route.intent,p_filters:route.filters||{}});if(error)throw error;return {reply:formatFacts(data),...request,facts:data,source:data.source,as_of:data.as_of};}
 if(route.intent==='refuse.write')return {...request,reply:'Tôi chỉ tra cứu, phân tích, hướng dẫn và soạn nháp. Tôi không tự cộng điểm, hoàn tiền, gửi tin, sửa đơn, đặt lịch hoặc xóa dữ liệu. Nhân viên cần kiểm tra và thực hiện thao tác theo quyền ở phân hệ tương ứng.'};
 if(route.intent==='clarify')return {...request,reply:route.answer};
 if(route.intent==='capabilities')return {...request,reply:'Tôi hỗ trợ:\n- Tra lịch hẹn theo ngày và nhóm dịch vụ.\n- Đếm SKU dưới ngưỡng tồn tối thiểu.\n- Xem khiếu nại chưa kết thúc.\n- Tìm khách hàng hoặc đơn theo mã.\n- Tra sản phẩm, giá biến thể và dịch vụ.\n- Tóm tắt hội thoại đã chọn, soạn nháp và hướng dẫn xử lý.\n\nVí dụ: “Hôm nay có bao nhiêu lịch Spa chờ phục vụ?”, “Khách hàng: tên hoặc số điện thoại”, “Sản phẩm: SKU”. Tôi chỉ xem dữ liệu trong quyền của bạn; không tự thực hiện nghiệp vụ.'};
 const context={mode:route.intent,limitations:['Chỉ soạn nháp để nhân viên kiểm tra; không tự gửi, không hứa ưu đãi hoặc thời gian chưa được xác nhận.']};
 if(route.intent==='conversation.summary'||conversationId){
  if(!conversationId)return {...request,reply:'Hãy chủ động chọn một hội thoại ở tab Trực chat trước khi yêu cầu tóm tắt ca.'};
  if(!staff.permissions.includes('chat_message.read')||!staff.permissions.includes('chat_conversation.read'))throw Object.assign(Error('copilot_forbidden'),{code:'42501'});
  const r=await caller.rpc('admin_copilot_chat_context',{p_conversation:conversationId});if(r.error)throw r.error;
  context.messages=(r.data||[]).slice(0,12).reverse().map(m=>({sender:m.sender_type,content:String(m.content||'').slice(0,800)}));
  if(route.intent==='conversation.summary'&&!context.messages.length)return {...request,reply:'Hội thoại đã chọn chưa có nội dung để tóm tắt trong phạm vi bạn được xem.'};
  context.limitations.push('Chỉ sử dụng tối đa 12 tin gần nhất đã lọc, không phải toàn bộ lịch sử.');
 }
 if(staff.permissions.includes('chatbot_knowledge_faq.read')){
  const category=/hoan tien|boi hoan|cong diem/.test(normalize(question))?'bồi hoàn':/giao hang/.test(normalize(question))?'giao hàng':/dat lich/.test(normalize(question))?'đặt lịch':null;
  if(category){const r=await caller.from('chatbot_knowledge_faq').select('question,answer,category').eq('is_active',true).ilike('question','%'+category+'%').order('priority',{ascending:false}).order('id').limit(5);if(r.error)throw r.error;context.faq=(r.data||[]).map(r=>({question:String(r.question||'').slice(0,200),answer:String(r.answer||'').slice(0,1200),category:r.category}));}
 }
 const reply=await generateReply(question,context,history||[]);
 if(typeof reply!=='string'||!reply.trim()||reply.length>16000)throw Error('invalid_ai_response');
 return {...request,reply:'**Bản nháp AI — cần kiểm tra**\n\n'+reply+'\n\nPhạm vi: '+context.limitations.join(' '),source:context.faq?.length?'FAQ đang bật và thông tin bạn cung cấp':'Thông tin bạn cung cấp'+(context.messages?' và tối đa 12 tin gần nhất đã lọc':''),limitations:context.limitations};
}
module.exports={plan,formatFacts,answer};
