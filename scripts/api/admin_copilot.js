// Business routing is deterministic. The model never selects SQL, permissions or mutations.
const readTools=require('./chat_read_tools.js');
const {planStage3}=require('./chat_stage3_planner.js');
const stage3Format=require('./chat_stage3_format.js');
const {planComparison,answerComparison}=require('./chat_stage4_compare.js');
const {planCustomerCase,answerCustomerCase}=require('./chat_stage4_customer_case.js');
const {planPending,answerPending}=require('./chat_stage4_pending.js');
const normalize=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d');
const isToolGuide=question=>{const q=normalize(question);return /\b(tro ly|chatbot)( admin)?\b/.test(q)&&/tra cuu/.test(q)&&/nhu the nao|duoc (nhung )?gi/.test(q);};
const text=v=>String(v??'').replace(/[|\r\n]/g,' ').slice(0,600);
const labels={'appointment.list':'Lịch hẹn','inventory.low_stock':'Sản phẩm tồn kho thấp','ticket.open':'Khiếu nại chưa kết thúc','customer.lookup':'Khách hàng','order.lookup':'Đơn hàng','catalog.product':'Sản phẩm','catalog.service':'Dịch vụ','catalog.service_price':'Bảng giá dịch vụ','revenue.summary':'Thực thu','knowledge.search':'Thông tin tra cứu'};
Object.assign(labels,stage3Format.labels);
const needsContext=question=>/^(the\b|vay\b|con\b|ngay mai\b|mai\b|ngay mot\b|trang\s+\d+)|cau (hoi )?(tren|truoc)|nhu (tren|vay)/.test(normalize(question).trim());
const statuses={pending:'Chờ duyệt',confirmed:'Chờ phục vụ',checked_in:'Đã tiếp nhận',in_progress:'Đang thực hiện',completed:'Hoàn tất',cancelled:'Đã hủy',no_show:'Không đến',active:'Hoạt động',inactive:'Tạm ngừng',open:'Đang mở',new:'Mới',investigating:'Đang xác minh',resolved:'Đã giải quyết',closed:'Đã đóng',processing:'Đang xử lý',published:'Đã đăng',draft:'Bản nháp',archived:'Đã lưu trữ',terminated:'Đã nghỉ việc',available:'Có mặt',off:'Nghỉ',busy:'Đang bận',waiting_agent:'Chờ nhân viên',agent_handling:'Nhân viên đang hỗ trợ',bot_handling:'Hỗ trợ tự động',blocked:'Bị khóa'};
const status=v=>statuses[v]||v||'Chưa xác định';
function plan(question,now=new Date(),readContext={}){
 question=require('./chat_admin_natural.js').rewrite(question);
 const pageSuffix=String(question).match(/\s+trang\s+(\d+)\s*\??$/iu);
 if(pageSuffix){const previous=plan(String(question).slice(0,pageSuffix.index),now,readContext);if(readTools.definitions[previous.intent]?.keys.includes('page'))return {...previous,filters:{...previous.filters,page:pageSuffix[1]}};return previous.intent==='refuse.write'?previous:{intent:'clarify',answer:'Tra cứu này chưa hỗ trợ chuyển trang. Hãy nêu lại phạm vi cần xem.'};}
 const q=normalize(question).trim().replace(/\s+/g,' ').replace(/\blich henh\b/g,'lich hen').replace(/\bton kh0\b/g,'ton kho');
 if(isToolGuide(question))return {intent:'workflow.guide'};
 const write=/\b(tu dong|hay|giup toi|thuc hien|tien hanh)\b.*\b(cong diem|tang diem|hoan tien|gui tin|xoa|sua don|dat lich|chuyen ca)\b/.test(q)||/^(cong diem|tang diem|hoan tien|gui tin|xoa|sua don|dat lich|chuyen ca)\b/.test(q);
 if(write&&/nhu the nao|lam sao/.test(q))return {intent:'workflow.guide'};
 if(write&&!/soan|huong dan|quy trinh|cach |mau |nhap/.test(q))return {intent:'refuse.write'};
 if(/soan|viet.*(loi|tin|tra loi)/.test(q)||/ban nhap/.test(q)&&!/bai viet/.test(q))return {intent:'draft.reply'};
 if(/tom tat.*(hoi thoai|ca chat|cuoc chat)/.test(q))return {intent:'conversation.summary'};
 if(/quy trinh|huong dan|chinh sach|cach xu ly/.test(q))return {intent:'workflow.guide'};
 const natural=require('./chat_admin_natural.js').route(question,readContext,now);if(natural)return natural;
 const customerCase=planCustomerCase(question,readContext);if(customerCase)return customerCase;
 const pending=planPending(question,now);if(pending)return pending;
 const comparison=planComparison(question,now);if(comparison)return comparison;
 const expanded=planStage3(question,now,readContext);if(expanded)return expanded;
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
 const page=reference.match(/^trang\s+(\d+)\??$/);if(page){for(const turn of history.slice().reverse()){if(turn.role!=='user'||/^trang\s+\d+\??$/.test(normalize(turn.content||'')))continue;const previous=plan(String(turn.content||''),now);return readTools.definitions[previous.intent]?.keys.includes('page')?{...previous,filters:{...previous.filters,page:page[1]}}:{intent:'clarify',answer:'Hãy nhắc lại đối tượng hoặc điều kiện tra cứu kèm số trang để tránh chuyển nhầm dữ liệu.'};}return {intent:'clarify',answer:'Hãy cung cấp lại điều kiện tra cứu cùng số trang.'};}
 if(/^(?:thong tin )?(?:khach(?: hang)?|chu nuoi) nay\??$/.test(reference))return readContext.customerQuery?{intent:'customer.lookup',filters:{query:readContext.customerQuery}}:{intent:'clarify',answer:'Hãy chọn hội thoại của khách hàng hoặc cung cấp tên, mã khách hay số điện thoại cần tra cứu.'};
 if(/^(?:thong tin )?don(?: hang)? nay\??$/.test(reference))return readContext.orderCode?{intent:'order.lookup',filters:{query:readContext.orderCode}}:{intent:'clarify',answer:'Hãy cung cấp mã đơn cần tra cứu. Hội thoại đang mở có thể có nhiều đơn hàng.'};
 const route=plan(question,now,readContext);if(!needsContext(question))return route;
 for(const turn of history.slice().reverse()){
  if(turn.role!=='user')continue;const previous=plan(String(turn.content||''),now);
  if(['appointment.list','appointment.search'].includes(previous.intent)){
   const next=plan('Lịch hẹn '+question,now);
   if(['appointment.list','appointment.search'].includes(next.intent)){const filters={...previous.filters,...next.filters};delete filters.page;return {...next,intent:previous.intent==='appointment.search'?'appointment.search':next.intent,filters};}
  }
 }
 return route;
}
function draftReadPlan(question,now,readContext){
 if(isToolGuide(question))return null;
 const raw=String(question),split=raw.search(/[:：]/),prefix=split<0?raw:raw.slice(0,split),suffix=split<0?'':raw.slice(split);
 let subject=prefix.trim();for(let i=0;i<3;i++)subject=subject.replace(/^(?:hãy\s+)?(?:soạn|soan|viết|viet|bản nháp|ban nhap|hướng dẫn|huong dan|quy trình|quy trinh)\s+/iu,'').trim();subject+=suffix;
 const candidate=plan(subject,now,readContext);
 return candidate.intent==='clarify'||labels[candidate.intent]&&candidate.intent!=='knowledge.search'?candidate:null;
}
function formatFacts(data,{includeSource=true}={}){
 const numeric=v=>(typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v));
 if(!data||!numeric(data.total))throw Error('invalid_copilot_facts');
 const n=Number(data.total);if(!Number.isSafeInteger(n)||n<0||!Array.isArray(data.items)||data.items.length>n||n===0&&data.items.length)throw Error('invalid_copilot_facts');
 if(data.intent==='revenue.summary'&&(!['collected','refunded','net'].every(k=>numeric(data[k]))||Math.abs(Number(data.net)-(Number(data.collected)-Number(data.refunded)))>0.001))throw Error('invalid_copilot_facts');
 if(data.intent==='inventory.low_stock'&&data.items.some(r=>!numeric(r.stock)||!numeric(r.minimum)))throw Error('invalid_copilot_facts');
 if(data.intent==='hotel.availability'&&(!Number.isSafeInteger(data.available)||!Number.isSafeInteger(data.unavailable)||data.available<0||data.unavailable<0||data.available+data.unavailable!==n))throw Error('invalid_hotel_capacity');
 const title=labels[data.intent]||'Kết quả';const scope=data.scope||{};
 const date=scope.start_at?new Date(scope.start_at).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):'';
 const category={grooming_spa:'Spa và cắt tỉa',pet_hotel:'Khách sạn thú cưng',pet_taxi:'Đưa đón thú cưng'}[scope.category];
 const rows=data.items.map(r=>{
  if(stage3Format.labels[data.intent])return stage3Format.row(data.intent,r,text,status);
  if(data.intent==='inventory.low_stock')return `- ${text(r.name)} — SKU ${text(r.sku)}: tồn ${r.stock}, tối thiểu ${r.minimum}.`;
  if(data.intent==='appointment.list')return `- ${text(r.code)} — ${status(r.status)}, ${new Date(r.scheduled_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Ho_Chi_Minh'})}; ${text(r.services)}.`;
  if(data.intent==='catalog.product')return `- ${text(r.name)} — ${text(r.sku)}, ${text(r.variant)}: ${Number(r.price).toLocaleString('vi-VN')}đ.`;
  if(data.intent==='catalog.service')return `- ${text(r.code)} — ${text(r.name)}: ${text(r.description)}.`;
  if(data.intent==='knowledge.search')return `${text(r.question)}\n${String(r.answer||'')}`;
  if(data.intent==='catalog.service_price'){
   const rules=(r.prices||[]).map(p=>p.kind==='taxi'?`${p.distance_from}–${p.distance_to??'trở lên'} km, ${p.weight_from}–${p.weight_to??'trở lên'} kg: ${Number(p.price).toLocaleString('vi-VN')} đ${Number(p.surcharge)?', phụ phí '+Number(p.surcharge).toLocaleString('vi-VN')+' đ':''}`:p.kind==='hotel'?`${text(p.name)}: ${Number(p.price).toLocaleString('vi-VN')} đ${Number.isSafeInteger(p.billing_minutes)&&p.billing_minutes>0?'/'+(p.billing_minutes===1440?'24 giờ':p.billing_minutes+' phút'):' (nguồn này chưa xác nhận đơn vị tính)'}`:`${p.weight_from}–${p.weight_to??'trở lên'} kg: ${Number(p.price).toLocaleString('vi-VN')} đ`);
   return `- **${text(r.name)}** (${text(r.code)}): ${rules.length?rules.join('; '):'chưa có mức giá đang áp dụng.'}`;
  }
  if(data.intent==='customer.lookup')return `- ${text(r.code)} — ${text(r.name)}, ${text(r.phone)}, ${status(r.status)}.`;
  if(data.intent==='ticket.open')return `- ${text(r.code)} — ${text(r.subject)}, ${status(r.status)}, ưu tiên ${text(r.priority)}.`;
  return `- ${text(r.code)} — ${status(r.status)}, giao hàng ${status(r.shipping_status)}${r.tracking_code?', vận đơn '+text(r.tracking_code):''}.`;
 });
 let heading=data.intent==='appointment.list'?`Ngày ${date} có **${n} lịch hẹn**${category?' '+category:''}${scope.status?' ở trạng thái '+status(scope.status).toLowerCase():''}.`:data.intent==='inventory.low_stock'?(n?`Có **${n} mã hàng đang bán** có tồn kho thấp hơn mức tối thiểu đã cấu hình.`:'Hiện không có mã hàng đang bán nào có tồn kho thấp hơn mức tối thiểu đã cấu hình.'):`${title}: **${n}**${data.unit?' '+data.unit:''}.`;
 if(data.intent==='revenue.summary')heading=`Ngày ${date}: đã thu **${Number(data.collected).toLocaleString('vi-VN')} đ**, đã hoàn **${Number(data.refunded).toLocaleString('vi-VN')} đ**.\n\nThực thu: **${Number(data.net).toLocaleString('vi-VN')} đ**. Chỉ tính giao dịch thành công theo thời điểm thu/hoàn, không phải tổng giá trị đơn tạo trong ngày.`;
 if(scope.start_at&&Date.parse(scope.end_at)-Date.parse(scope.start_at)>86400000)heading=heading.replace(/^Ngày [^:]+:/,`Trong kỳ từ ${date} đến ${new Date(Date.parse(scope.end_at)-1).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}:`);
 if(stage3Format.labels[data.intent])heading=`**${title}**${scope.start_at?` — ${date}${date!==new Date(Date.parse(scope.end_at)-1).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})?' đến '+new Date(Date.parse(scope.end_at)-1).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}):''}`:''}\n\n${n?`Mình tìm thấy **${n} ${data.unit||'kết quả phù hợp'}**.`:'Mình chưa tìm thấy kết quả phù hợp trong phạm vi bạn được xem. Bạn có thể thử điều kiện khác nhé.'}`;
 if(data.intent==='hotel.availability')heading+=` Có **${data.available} phòng** có thể nhận trọn khoảng; **${data.unavailable} phòng** vướng lịch giữ hoặc đang ở. Đây không phải số bé tối đa và chưa giữ phòng.`;
 if(['hotel.availability','hotel.stays','taxi.trips'].includes(data.intent)&&scope.start_at&&scope.end_at){const clock=v=>new Date(v).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});heading+=` Khoảng kiểm tra: từ ${clock(scope.start_at)} đến trước ${clock(scope.end_at)} theo giờ Việt Nam. Khoảng hỏi theo ngày bao gồm trọn ngày kết thúc, chưa mặc định giờ nhận/trả của một đặt lịch.`;}
 if(data.intent==='appointment.search'&&scope.staff_name)heading+=` KTV: **${text(scope.staff_name)}**.`;
 const friendly=require('./chat_admin_presentation.js').present(data,{rows,text,includeSource});if(friendly)return friendly;
 if(n===0){
  const empty={'knowledge.search':'Chưa tìm thấy thông tin phù hợp trong kho tri thức đang bật. Bạn vui lòng nêu cụ thể nội dung cần tra cứu.','catalog.service_price':'Chưa có dịch vụ đang hoạt động phù hợp để tra bảng giá.','catalog.service':'Không tìm thấy dịch vụ phù hợp.','catalog.product':'Không tìm thấy sản phẩm phù hợp.','customer.lookup':'Không tìm thấy khách hàng phù hợp.','order.lookup':'Không tìm thấy đơn hàng phù hợp.','ticket.open':'Hiện không có khiếu nại chưa kết thúc phù hợp với điều kiện tra cứu.'};
  heading=empty[data.intent]||heading;
 }
 return [heading,...rows,...(data.guidance||[]).map(item=>`${text(item.question)}\n${String(item.answer||'')}`),Number(data.pages)>1?`Trang ${data.page}/${data.pages}.${data.page<data.pages?` Bạn có thể hỏi “trang ${data.page+1}” để xem tiếp.`:''}`:n>data.items.length&&data.intent!=='revenue.summary'?`Đang hiển thị ${data.items.length}/${n} kết quả.`:'',data.limitations?.length?'**Lưu ý**\n\n'+(Array.isArray(data.limitations)?data.limitations.join(' '):data.limitations):'',includeSource?`*Cập nhật lúc ${new Date(data.as_of).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})}.*`:''].filter(Boolean).join('\n\n');
}
function partialFacts(request,facts,reason,target,budget){
 return {...request,scope:facts.scope||{},reply:['**Dữ liệu đã tra cứu**\n\n'+formatFacts(facts),reason,'Chỉ xác nhận dữ liệu hiển thị; chưa có nội dung AI để áp dụng xử lý.',target?'Bạn có thể mở phân hệ liên quan bằng nút bên dưới để tiếp tục kiểm tra.':null].filter(Boolean).join('\n\n'),facts,source:facts.source||null,as_of:facts.as_of||null,limitations:[...(Array.isArray(facts.limitations)?facts.limitations:[]),reason],continuation:target?{type:'open_module',href:target}:null,resource_usage:budget.snapshot()};
}
async function answerInternal({question,caller,staff,conversationId,generateReply,history,now,readBudget,readContext}){
 const budget=readBudget||readTools.createReadBudget();
 const route=contextualPlan(question,history,now,readContext);const request={answer_type:route.intent,scope:route.filters||{},limitations:[]};
 if(route.intent==='revenue.compare')return answerComparison({route,caller,staff,budget,validateFacts:formatFacts});
 if(route.intent==='customer.case')return answerCustomerCase({route,caller,staff,budget,text,status});
 if(route.intent==='operations.pending')return answerPending({route,caller,staff,budget,formatFacts});
 if(labels[route.intent]){
  const prepared=readTools.prepare(route.intent,route.filters||{},staff.permissions);
  request.plan={version:1,audience:'staff',intent:prepared.intent,filters:prepared.filters,operation:['appointment.list','ticket.open','inventory.low_stock'].includes(route.intent)?'count_and_list':'lookup',readOnly:true};
  request.continuation=prepared.target?{type:'open_module',href:prepared.target}:null;
  const fetch=filters=>budget.run(caller,readTools.prepare(route.intent,filters,staff.permissions));
  if(route.intent==='appointment.list'&&(Date.parse(route.filters.end_at)-Date.parse(route.filters.start_at))===2*86400000){
   const start=Date.parse(route.filters.start_at),middle=new Date(start+86400000).toISOString();const daily=await Promise.all([fetch({...route.filters,end_at:middle}),fetch({...route.filters,start_at:middle})]);
   return {...request,reply:daily.map(d=>formatFacts(d,{includeSource:false})).join('\n\n'),facts:{daily,total:daily.reduce((n,d)=>n+Number(d.total),0)},as_of:daily[0].as_of,resource_usage:budget.snapshot()};
  }
  const data=await fetch(route.filters||{});
  if(data.staff_match_count===0||data.staff_match_count>1)return {...request,reply:data.staff_match_count===0?'Không tìm thấy KTV theo họ tên đầy đủ hoặc mã đã cung cấp. Chưa tra cứu lịch; hãy kiểm tra lại thông tin nhân viên.':`Có ${data.staff_match_count} nhân viên trùng tên. Hãy tra “Nhân viên: họ tên”, rồi dùng mã nhân viên để chọn đúng người; chưa tra cứu lịch.`,continuation:{type:'open_module',href:'#tab-staff-list'},facts:data,source:data.source,as_of:data.as_of,resource_usage:budget.snapshot()};
  if(data.ambiguous)return {...request,reply:`Có ${data.total} đối tượng phù hợp. Hãy cung cấp mã hoặc đường dẫn chính xác để tránh đọc nhầm nội dung.`,source:data.source,as_of:data.as_of,resource_usage:budget.snapshot()};
  let continuation=request.continuation;const item=data.items?.[0];
  if(['content.read','review.read'].includes(route.intent)&&item?.has_more){
   if(!/^[0-9a-f-]{36}$/.test(item.code)||!/^[a-f0-9]{32}$/.test(item.revision)||!Number.isSafeInteger(item.part))throw Error('invalid_detail_cursor');
   continuation={type:'ask_question',question:`${route.intent==='content.read'?'Nội dung bài viết':'Nội dung đánh giá'}: ${item.code} phần ${item.part+1} bản ${item.revision}`};
  }
  return {reply:formatFacts(data),...request,continuation,limitations:Array.isArray(data.limitations)?data.limitations:[],facts:data,source:data.source,as_of:data.as_of,resource_usage:budget.snapshot()};
 }
 if(route.intent==='refuse.write')return {...request,reply:'Tôi chỉ tra cứu, phân tích, hướng dẫn và soạn nháp. Tôi không tự cộng điểm, hoàn tiền, gửi tin, sửa đơn, đặt lịch hoặc xóa dữ liệu. Nhân viên cần kiểm tra và thực hiện thao tác theo quyền ở phân hệ tương ứng.'};
 if(route.intent==='clarify')return {...request,reply:route.answer};
 if(route.intent==='capabilities')return {...request,reply:'Tôi hỗ trợ tra cứu theo quyền:\n- Hai nhóm cần kiểm tra: đơn hủy chưa hoàn đủ và lịch chờ phục vụ chưa có KTV.\n- Hồ sơ thú cưng và đơn được tạo mới nhất của một khách.\n- Lịch sắp tới/vừa qua và khiếu nại còn mở của một khách.\n- Khách hàng, thú cưng và số dư Pawpoint.\n- Đơn hàng, thanh toán và đơn hủy chưa hoàn đủ.\n- Lịch hẹn theo ngày, buổi và tình trạng phân công KTV.\n- Khiếu nại và hội thoại hỗ trợ.\n- Sản phẩm, tồn kho, bảng giá dịch vụ và ưu đãi đang hiệu lực.\n- Nhân viên, lịch trực, bài viết, đánh giá và cấu hình kinh doanh được phép đọc.\n- Thực thu và ba chỉ số vận hành theo khoảng tối đa 31 ngày.\n- So sánh thực thu ngày/tuần/tháng này với kỳ trước theo phần thời gian đã trôi qua.\n- Tóm tắt hội thoại đã chọn, soạn nháp và hướng dẫn khi có nguồn phù hợp.\n\nVí dụ: “Lịch Spa chiều mai chưa có KTV”, “Thú cưng của khách: CUS-001”, “Đơn hủy chưa hoàn”, “Lịch trực tuần này”. Tra cứu mới hiển thị tối đa 10 dòng mỗi trang; có thể hỏi tiếp “trang 2”. Tôi chỉ xem dữ liệu trong quyền của bạn; không tự thực hiện nghiệp vụ.'};
 const context={mode:route.intent,limitations:['Chỉ soạn nháp để nhân viên kiểm tra; không tự gửi, không hứa ưu đãi hoặc thời gian chưa được xác nhận.']};
 let supportingTarget=null;
 if(['draft.reply','workflow.guide'].includes(route.intent)){
  const supporting=draftReadPlan(question,now,readContext);
  if(supporting){
   if(supporting.intent==='clarify')return {...request,reply:supporting.answer,resource_usage:budget.snapshot()};
   const prepared=readTools.prepare(supporting.intent,supporting.filters||{},staff.permissions);
   supportingTarget=prepared.target||null;
   const data=await budget.run(caller,prepared);
   if(data.staff_match_count===0||data.staff_match_count>1)return {...request,reply:'Chưa xác định duy nhất một KTV. Hãy kiểm tra họ tên đầy đủ hoặc dùng mã nhân viên trước khi soạn nội dung.',resource_usage:budget.snapshot()};
   if(!data.total&&supporting.intent!=='revenue.summary')return {...request,reply:'Chưa có dữ liệu phù hợp để soạn nội dung cho đối tượng này. Hãy kiểm tra mã hoặc điều kiện tra cứu.',resource_usage:budget.snapshot()};
   formatFacts(data); // Validate quantitative invariants before supplying any facts to a model.
   if(data.ambiguous||supporting.filters?.query&&data.total>1&&['customer.lookup','order.lookup','pet.lookup','payment.order','points.lookup'].includes(supporting.intent))return {...request,reply:`Có ${data.total} kết quả phù hợp. Hãy cung cấp mã chính xác để tránh soạn nội dung cho nhầm đối tượng.`,resource_usage:budget.snapshot()};
   context.facts=data;context.limitations.push('Thông tin nghiệp vụ chỉ lấy từ kết quả tra cứu trong quyền của bạn; danh sách hiển thị có thể là một trang, không phải toàn bộ bản ghi.');if(data.items.some(r=>r.has_more||r.part>1))context.limitations.push('Chỉ có một phần nội dung gốc; không được coi bản nháp là tóm tắt toàn bộ tài liệu.');
  }
 }
 if((route.intent==='conversation.summary'||conversationId)&&!(route.intent==='workflow.guide'&&budget.snapshot().calls>=2)){
  if(!conversationId)return {...request,reply:'Hãy chủ động chọn một hội thoại ở tab Trực chat trước khi yêu cầu tóm tắt ca.'};
  if(!staff.permissions.includes('chat_message.read')||!staff.permissions.includes('chat_conversation.read'))throw Object.assign(Error('copilot_forbidden'),{code:'42501'});
  const messages=await budget.run(caller,readTools.prepare('conversation.context',{conversationId},staff.permissions));
  context.messages=messages.slice(0,12).reverse().map(m=>({sender:m.sender_type,content:String(m.content||'').slice(0,800)}));
  if(route.intent==='conversation.summary'&&!context.messages.length)return {...request,reply:'Hội thoại đã chọn chưa có nội dung để tóm tắt trong phạm vi bạn được xem.'};
  context.limitations.push('Chỉ sử dụng tối đa 12 tin gần nhất đã lọc, không phải toàn bộ lịch sử.');
 }else if(conversationId&&route.intent==='workflow.guide')context.limitations.push('Hướng dẫn này chưa đối chiếu nội dung hội thoại đang chọn; cần kiểm tra trước khi áp dụng.');
 if(route.intent==='workflow.guide'){
  const data=await budget.run(caller,readTools.prepare('knowledge.search',{query:question.slice(0,120)},staff.permissions));
  const faq=(data.items||[]).filter(row=>typeof row.answer==='string'&&row.answer.trim());
  if(!faq.length){
   const missing='Chưa có hướng dẫn phù hợp trong kho tri thức đang bật. Bạn vui lòng kiểm tra quy trình hiện hành trước khi tư vấn cho khách.';
   const facts=context.facts;
   if(facts)return partialFacts(request,facts,missing+' Chưa đủ nguồn để hướng dẫn cách xử lý.',supportingTarget,budget);
   const target=readTools.definitions['knowledge.search'].target;
   return {...request,reply:missing+'\n\nBạn có thể mở phân hệ liên quan bằng nút bên dưới để tiếp tục kiểm tra.',facts:null,source:data.source||null,as_of:data.as_of||null,limitations:[missing],continuation:{type:'open_module',href:target},resource_usage:budget.snapshot()};
  }
  context.faq=faq;
 }else if(staff.permissions.includes('chatbot_knowledge_faq.read')){
  const category=/hoan tien|boi hoan|cong diem/.test(normalize(question))?'bồi hoàn':/giao hang/.test(normalize(question))?'giao hàng':/dat lich/.test(normalize(question))?'đặt lịch':null;
  if(category&&budget.snapshot().calls<3){const data=await budget.run(caller,readTools.prepare('knowledge.search',{query:category},staff.permissions));context.faq=data.items.map(r=>({question:String(r.question||'').slice(0,200),answer:String(r.answer||'').slice(0,1200)}));}else if(category)context.limitations.push('Chưa đối chiếu chính sách cho bản nháp này; cần kiểm tra trước khi gửi.');
 }
 let reply;
 try{
  reply=await generateReply(question,context,history||[]);
  if(typeof reply!=='string'||!reply.trim()||reply.length>16000)throw Error('invalid_ai_response');
  reply=reply.replace(/^(?:\s*(?:\*\*)?Bản nháp AI[^\n]*(?:\n|$))+/giu,'').split(/(?:^|\n)\s*(?:\*\*)?Phạm vi\s*:/iu)[0].trim();
  if(!reply)throw Error('invalid_ai_response');
 }catch(error){
  if(context.facts&&['ai_unconfigured','ai_environment_key_unavailable','ai_key_pool_unavailable','ai_key_pool_exhausted','invalid_ai_response'].includes(error.message)&&!error.code)return partialFacts(request,context.facts,'Không tạo được nội dung AI. Dữ liệu dưới đây là kết quả tra cứu, không phải bản nháp hoặc hướng dẫn đã hoàn tất.',supportingTarget,budget);
  throw error;
 }
 const heading=route.intent==='draft.reply'?'Bản nháp AI — cần kiểm tra':route.intent==='conversation.summary'?'Tóm tắt hội thoại':'Hướng dẫn tham khảo';
 return {...request,reply:'**'+heading+'**\n\n'+reply+'\n\nPhạm vi: '+context.limitations.join(' '),source:[context.facts?.source,context.faq?.length?'FAQ đang bật':null,context.messages?'Tối đa 12 tin gần nhất đã lọc':null,'Thông tin bạn cung cấp'].filter(Boolean).join('; '),as_of:context.facts?.as_of||null,limitations:context.limitations,resource_usage:budget.snapshot()};
}
async function answer(args){
 const result=await answerInternal(args);
 if(result.answer_type==='capabilities')result.reply+='\n\nHotel: hỏi “Hotel còn phòng ngày mai không?” để xem số phòng có thể nhận trọn khoảng, hoặc “Lượt lưu trú hôm nay”. Taxi: hỏi “Chuyến Taxi hôm nay”. Đây là tra cứu, chưa xác nhận giữ phòng hay điều phối tài xế.';
 const route=result.answer_type,filters=result.scope||{};
 const entity=route?.split('.')[0]||'conversation';
 return {contract_version:1,source:null,as_of:null,limitations:[],continuation:null,
  plan:{version:1,audience:'staff',intent:route,entity,filters,period:filters.start_at?{start:filters.start_at,end:filters.end_at,timeZone:'Asia/Ho_Chi_Minh'}:null,relations:[],readOnly:true},
  ...result,
  ...(result.plan?{plan:{entity,period:filters.start_at?{start:filters.start_at,end:filters.end_at,timeZone:'Asia/Ho_Chi_Minh'}:null,relations:[],...result.plan}}:{})};
}
module.exports={plan,contextualPlan,needsContext,formatFacts,answer};

// Work-role DTOs intentionally do not use the management totals/formatters.
function planStaff(question,now=new Date(),history=[]){
 const q=normalize(question);
 if(/^(?:hay |vui long |giup toi |toi muon )?(?:hoan tien|duyet (?:huy|boi hoan|hoan tien)|phan cong|cap quyen|doi vai tro|doi gia|sua gia|khoa tai khoan|xoa tai khoan)\b/.test(q)||/danh sach.*nhan (?:su|vien)|nhan (?:su|vien).*toan (?:he thong|cua hang)/.test(q))throw Object.assign(Error('staff_tool_forbidden'),{code:'42501'});
 if(/doanh thu|thuc thu|tong thu|revenue|payroll|luong|hoa hong|danh gia|review|cau hinh|settings|api.?key|mat khau|password|secret|token|bai viet|blog/.test(q.split(/[:：]/)[0]))throw Object.assign(Error('staff_tool_forbidden'),{code:'42501'});
 if(/ho tro.*gi|ban lam duoc gi|chuc nang|tro ly.*tra cuu.*duoc/.test(q))return {intent:'capabilities'};
 if(/^trang\s+\d+\??$/.test(q.trim())&&!history.length)return {intent:'history.followup'};
 let route=history.length?contextualPlan(question,history,now,{}):plan(question,now,{});
 if(route.intent==='customer.pets')route={intent:'customer.case',filters:{query:route.filters.query,kind:'pets_only'}};
 if(route.intent==='catalog.service_price'&&(!route.filters?.query||route.filters.query.length<3))return {intent:'clarify',answer:'Hãy ghi mã hoặc tên đầy đủ của dịch vụ sau dấu hai chấm để tra đúng giá.'};
 return route;
}
function formatStaffFacts(data){
 const invalid=()=>{throw Object.assign(Error('invalid_staff_facts'),{code:'XX000'});};
 if(!data||data.audience!=='staff'||data.total_is_page!==true||data.page_size!==10||!Number.isSafeInteger(data.page)||data.page<1||!Array.isArray(data.items)||data.items.length>10||data.total!==data.items.length||!Number.isFinite(Date.parse(data.as_of)))invalid();
 const clean=v=>String(v??'').replace(/[\r\n\t<>]/g,' ').replace(/([\\`*_[\]{}|])/g,'\\$1').slice(0,1200);
 const number=(v,unit='')=>{if((typeof v!=='number'&&typeof v!=='string')||String(v).trim()===''||!Number.isFinite(Number(v))||Number(v)<0)invalid();return Number(v).toLocaleString('vi-VN')+unit;};
 const time=v=>{if(!Number.isFinite(Date.parse(v)))invalid();return new Date(v).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});};
 const title={...labels,'internal.customer_resolve':'Khách đã xác định','internal.customer_pets':'Thú cưng của khách','internal.customer_latest_order':'Đơn được tạo mới nhất','internal.customer_appointment':'Ca gần nhất được giao','internal.customer_tickets':'Khiếu nại được giao của khách','conversation.context':'Nội dung hội thoại được giao'}[data.intent]||'Kết quả trong quyền công việc';
 const lines=[`**${title} — trang ${data.page}**`,`${data.items.length} kết quả trên trang hiện tại. Không phải tổng toàn bộ dữ liệu.`];
 if(data.ambiguous){lines.push('Chưa xác định duy nhất dịch vụ. Hãy dùng mã dịch vụ chính xác.');if(data.items.length)invalid();}
 else if(!data.items.length)lines.push('Không có kết quả trong phạm vi và trang vừa đọc.');
 for(const r of data.items){
  const name=[r.code||r.sku,r.name||r.subject].filter(Boolean).map(clean).join(' — ');let detail;
  switch(data.intent){
  case 'customer.lookup':case 'internal.customer_resolve':detail=[name,r.phone?'SĐT '+clean(r.phone):''].filter(Boolean).join('; ');break;
  case 'pet.lookup':case 'internal.customer_pets':detail=name;break;
  case 'points.lookup':detail=`${name}; số dư ${number(r.balance,' điểm')}`;break;
  case 'order.lookup':case 'internal.customer_latest_order':detail=`${name}; ${clean(status(r.status))}${r.created_at?'; tạo lúc '+time(r.created_at):''}. Chưa suy ra thanh toán từ trạng thái đơn.`;break;
  case 'payment.order':{
   const values=['total','collected','refunded','net','remaining'];for(const k of values)number(r[k]);
   if(Math.abs(Number(r.net)-Number(r.collected)+Number(r.refunded))>0.01||Math.abs(Number(r.remaining)-Math.max(Number(r.total)-Number(r.net),0))>0.01)invalid();
   detail=`${name}; giá trị đơn ${number(r.total,' đ')}; đã thu ${number(r.collected,' đ')}; đã hoàn ${number(r.refunded,' đ')}; còn phải thu ${number(r.remaining,' đ')}`;break;
  }
  case 'catalog.product':detail=`${name}; giá bán ${number(r.price,' đ')}; tồn ${number(r.stock)}`;break;
  case 'inventory.low_stock':detail=`${name}; tồn ${number(r.stock)}; ngưỡng ${number(r.minimum)}`;break;
  case 'catalog.service':detail=`${name}; thời lượng ${number(r.duration_minutes,' phút')}`;break;
  case 'appointment.list':case 'appointment.search':case 'internal.customer_appointment':detail=`${name}; ${clean(status(r.status))}; ${time(r.scheduled_at)}`;break;
  case 'ticket.open':case 'ticket.lookup':case 'internal.customer_tickets':detail=`${name}; ${clean(status(r.status))}`;break;
  case 'conversation.list':detail=`${clean(r.id)}; ${clean(status(r.status))}${r.summary?'; '+clean(r.summary):''}`;break;
  case 'conversation.context':detail=`${r.sender_type==='staff'?'Nhân viên':r.sender_type==='customer'?'Khách':'Hội thoại'}: ${clean(r.content)}${r.truncated?' (nội dung đã rút gọn)':''}`;break;
  case 'staff.lookup':detail=`${name}; ${clean(r.job_title)}; ${clean(status(r.status))}`;break;
  case 'staff.schedule':detail=`${time(r.start_at)} đến ${time(r.end_at)}; ${clean(status(r.status))}`;break;
  case 'hotel.stays':detail=`${name}; phòng ${clean(r.room_number)}; ${time(r.check_in_at)} đến ${time(r.check_out_at)}; ${clean(status(r.status))}`;break;
  case 'taxi.trips':detail=`${clean(r.id)}; ${time(r.outbound_at)}; ${clean(r.pickup_address)} đến ${clean(r.dropoff_address)}; ${number(r.distance_km,' km')}; ${clean(status(r.status))}`;break;
  case 'knowledge.search':detail=`${clean(r.question)}: ${clean(r.answer)}${r.truncated?' (hướng dẫn đã rút gọn)':''}`;break;
  case 'offer.list':detail=`${name}; mức cấu hình ${number(r.discount_value)}; loại ${r.type==='percent'?'phần trăm':r.type==='fixed'?'số tiền cố định':'cần kiểm tra điều kiện'}; đơn tối thiểu ${number(r.minimum_order_amount||0,' đ')}; điểm yêu cầu ${number(r.required_points||0)}; phạm vi ${clean(r.applicable_for)}; ${clean(r.start_date)} đến ${clean(r.end_date)}. Chưa xác nhận ưu đãi áp dụng cho giao dịch cụ thể.`;break;
  case 'hotel.availability':
   if(typeof r.reserved!=='boolean'||typeof r.occupied!=='boolean'||r.available!==(!r.reserved&&!r.occupied))invalid();
   detail=`${name}; sức chứa cấu hình ${number(r.capacity)}; ${r.available?'có thể nhận trọn khoảng':r.occupied?'đang có bé lưu trú':'vướng lịch giữ trong khoảng'}`;break;
  case 'catalog.service_price':case 'catalog.price_rows':{
   detail=`${name}; giá cấu hình ${number(r.price,' đ')}`;
   if(r.weight_from!==undefined)detail+=`; từ ${number(r.weight_from,' kg')} đến ${r.weight_to===null?'không giới hạn':number(r.weight_to,' kg')+(r.weight_to_inclusive?' (gồm cận trên)':' (trước cận trên)')}`;
   if(r.distance_from!==undefined)detail+=`; từ ${number(r.distance_from,' km')} đến ${r.distance_to===null?'không giới hạn':number(r.distance_to,' km')+(r.distance_to_inclusive?' (gồm cận trên)':' (trước cận trên)')}`;
   if(r.surcharge!==undefined)detail+=`; phụ phí cấu hình ${number(r.surcharge,' đ')}`;
   if(r.billing_minutes!==undefined)detail+=`; mỗi kỳ ${number(r.billing_minutes,' phút')}`;
   if(r.variant_condition)detail+='; điều kiện '+clean(r.variant_condition);break;
  }
  default:invalid();
  }
  lines.push('- '+detail);
 }
 if(data.intent==='hotel.availability'){
  if(data.available_is_page!==true||data.available+data.unavailable!==data.items.length||data.available!==data.items.filter(r=>r.available).length)invalid();
  lines.push(`Trên trang này: ${number(data.available)} phòng có thể nhận, ${number(data.unavailable)} phòng vướng lịch hoặc đang ở. Chưa giữ phòng và chưa phải số bé tối đa.`);
 }
 if(['catalog.service_price','catalog.price_rows'].includes(data.intent))lines.push('Giá đang hiệu lực tại thời điểm đọc; chưa phải báo giá đã chốt cho lịch hẹn.');
 if(data.scope?.start_at&&data.scope?.end_at)lines.push(`Khoảng đọc: ${time(data.scope.start_at)} đến trước ${time(data.scope.end_at)}.`);
 lines.push('Đọc lúc '+time(data.as_of)+'. Chỉ trong quyền và phạm vi công việc hiện tại.');return lines.join('\n\n');
}
async function answerStaff({question,caller,staff,budget,history=[],conversationId,generateReply,beforeModel,now=new Date()}){
 const route=planStaff(question,now,history),read=async(intent,filters={})=>budget.run(caller,readTools.prepareStaff(intent,filters,staff));
 const reply=value=>({reply:value,answer_type:route.intent,resource_usage:budget.snapshot()});
 if(route.intent==='capabilities')return reply('Tôi hỗ trợ tra cứu khách và thú cưng, đơn và tiền theo mã đơn, lịch/phiếu/hội thoại được giao, tồn kho, dịch vụ/giá/phòng trống, ưu đãi, lịch cá nhân và hướng dẫn đang bật. Chỉ đọc trong quyền Nhân viên; không tự ghi nghiệp vụ hoặc gửi nội dung cho khách.');
 if(route.intent==='refuse.write')return reply('Trợ lý chỉ tra cứu và soạn nháp. Hãy thực hiện nghiệp vụ ở phân hệ được cấp quyền.');
 if(route.intent==='clarify'||route.intent==='history.followup')return reply(route.answer||'Hãy nêu lại đối tượng hoặc điều kiện cần tra cứu.');
 if(route.intent==='customer.case'){
  const identity=await read('internal.customer_resolve',{query:route.filters.query});
  if(identity.items.length!==1)return reply(identity.items.length?'Có nhiều khách trùng thông tin. Hãy cung cấp mã khách hoặc SĐT chính xác.':'Chưa xác định được khách. Hãy cung cấp mã khách, SĐT hoặc họ tên đầy đủ.');
  const customerId=identity.items[0].id,requests=route.filters.kind==='pets_only'?[['internal.customer_pets',{customerId}]]:route.filters.kind==='pets_orders'?[['internal.customer_pets',{customerId}],['internal.customer_latest_order',{customerId}]]:[['internal.customer_appointment',{customerId,direction:route.filters.direction}],['internal.customer_tickets',{customerId}]];
  // Native SQL serializes sources on the shared lease row; keep this sequence predictable.
  const sections=[formatStaffFacts(identity)];for(const[intent,filters]of requests)sections.push(formatStaffFacts(await read(intent,filters)));return reply(sections.join('\n\n'));
 }
 if(['draft.reply','conversation.summary','workflow.guide'].includes(route.intent)){
  const source={mode:route.intent,limitations:['Chỉ soạn nháp để kiểm tra, không gửi cho khách, không hứa ưu đãi/thời gian hoặc xác nhận nghiệp vụ chưa có trong nguồn.']};let hasSource=false;
  if(route.intent!=='workflow.guide'){
   if(!conversationId)return reply('Hãy chọn một hội thoại được giao trước khi yêu cầu soạn nháp hoặc tóm tắt.');
   const messages=await read('conversation.context',{conversationId});formatStaffFacts(messages);
   source.messages=messages.items.map(m=>({sender:m.sender_type,content:m.content,truncated:m.truncated}));hasSource=source.messages.length>0;
   source.limitations.push('Chỉ có một trang tối đa 10 tin đã lọc; không phải toàn bộ hội thoại.');
  }
  if(route.intent==='draft.reply'){
   const supporting=draftReadPlan(question,now,{});
   if(supporting){
    if(supporting.intent==='clarify')return reply(supporting.answer);
    const facts=await read(supporting.intent,supporting.filters||{});const formatted=formatStaffFacts(facts);
    if(!facts.items.length||facts.ambiguous||facts.items.length>1&&['customer.lookup','order.lookup','pet.lookup','payment.order','points.lookup','catalog.product'].includes(supporting.intent))return reply('Chưa xác định nguồn nghiệp vụ duy nhất để soạn nháp. Hãy bổ sung mã chính xác.');
    source.facts={formatted,as_of:facts.as_of};
   }
  }
  if(route.intent==='workflow.guide'){
   const query=question.split(/[:：]/).slice(1).join(':').trim()||question.slice(0,120),faq=await read('knowledge.search',{query});formatStaffFacts(faq);source.faq=faq.items.map(r=>({question:r.question,answer:r.answer,truncated:r.truncated}));hasSource=source.faq.length>0;
  }
  if(!hasSource)return reply('Chưa có nguồn phù hợp trong quyền hiện tại để soạn nội dung. Hãy kiểm tra hội thoại hoặc hướng dẫn đang bật.');
  if(typeof beforeModel!=='function')throw Object.assign(Error('staff_model_validation_required'),{code:'42501'});
  await beforeModel();
  const sanitize=require('./chat_model_privacy.js').sanitizeModelData;
  let generated=await generateReply(sanitize(question),sanitize(source),sanitize(history.map(m=>({role:m.role,content:m.content}))),{audience:'staff'});
  if(typeof generated!=='string'||!generated.trim()||generated.length>14000)throw Object.assign(Error('invalid_staff_draft'),{code:'XX000'});
  generated=generated.replace(/^(?:\s*(?:\*\*)?Bản nháp AI[^\n]*(?:\n|$))+/giu,'').trim();
  if(!generated)throw Object.assign(Error('invalid_staff_draft'),{code:'XX000'});
  return reply('Bản nháp AI — cần kiểm tra trước khi sử dụng.\n\n'+generated+'\n\nPhạm vi: chỉ các nguồn được phép vừa đọc và lịch sử còn quyền truy cập; nội dung có thể đã rút gọn.');
 }
 return reply(formatStaffFacts(await read(route.intent,route.filters||{})));
}
module.exports.planStaff=planStaff;module.exports.formatStaffFacts=formatStaffFacts;module.exports.answerStaff=answerStaff;
