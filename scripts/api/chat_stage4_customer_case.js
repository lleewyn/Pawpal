'use strict';
const readTools=require('./chat_read_tools.js');
const normalize=value=>String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[?!.]/g,'').replace(/\s+/g,' ').trim();
const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const fail=()=>Object.assign(Error('invalid_customer_case_result'),{code:'XX000'});
function planCustomerCase(question,context={}){
 const raw=String(question),head=normalize(raw.split(/[:：]/)[0]);
 const commerce=/khach|chu nuoi/.test(head)&&/thu cung|be cung/.test(head)&&/\bdon\b/.test(head);
 if(!commerce&&(!/khach|chu nuoi/.test(head)||!/lich/.test(head)||!/khieu nai|phieu ho tro/.test(head)))return null;
 const clarify=answer=>({intent:'clarify',answer});
 if(commerce){
  const match=/^(?:khach(?: hang)? nay|khach hang|chu nuoi)(?: co)? (?:nhung )?(?:thu cung|be cung)(?: nao)? va don(?: hang)?(?: duoc tao)? (?:moi nhat|gan nhat)(?: nao)?$/.test(head)
   ||/^(?:thu cung|be cung) va don(?: hang)?(?: duoc tao)? (?:moi nhat|gan nhat) cua khach(?: hang)?$/.test(head);
  if(!match)return clarify('Luồng này xem hồ sơ thú cưng và đơn được tạo mới nhất của một khách, gồm mọi trạng thái. Ví dụ “Khách này có thú cưng và đơn hàng mới nhất?”. Hãy hỏi riêng nếu cần thêm trạng thái, khoảng ngày hoặc nhóm thông tin khác.');
  const explicit=raw.split(/[:：]/).slice(1).join(':').trim(),query=explicit||(uuid(context.customerId)?context.customerId:context.customerQuery);
  if(typeof query!=='string'||query.trim().length<3||query.length>120||/[\u0000-\u001f]/.test(query))return clarify('Hãy chọn hội thoại của khách hoặc ghi mã khách, số điện thoại chính xác hay họ tên đầy đủ sau dấu hai chấm.');
  return {intent:'customer.case',filters:{query:query.trim(),kind:'pets_orders'}};
 }
 const pattern=/^(?:khach(?: hang)? nay|khach hang|chu nuoi)(?: co)? lich (sap toi(?: gan nhat)?|vua qua(?: gan nhat)?|gan nhat) (?:va|kem) (?:khieu nai|phieu ho tro)(?: nao)? (?:con mo|chua ket thuc)$/;
 const alternate=/^lich (sap toi(?: gan nhat)?|vua qua(?: gan nhat)?|gan nhat) va (?:khieu nai|phieu ho tro)(?: nao)? (?:con mo|chua ket thuc) cua khach(?: hang)?$/;
 const match=head.match(pattern)||head.match(alternate);
 if(!match)return clarify('Luồng kết hợp này hỗ trợ lịch sắp tới hoặc vừa qua gần nhất và phiếu hỗ trợ còn mở của một khách. Ví dụ: “Khách này có lịch sắp tới và khiếu nại nào còn mở?” hoặc thêm “: mã khách” vào cuối câu. Chưa hỗ trợ thêm điều kiện khác.');
 if(match[1]==='gan nhat')return clarify('Bạn muốn xem lịch sắp tới hay lịch vừa qua gần nhất? Hãy ghi rõ “lịch sắp tới” hoặc “lịch vừa qua” để tránh đọc sai khoảng thời gian.');
 const explicit=raw.split(/[:：]/).slice(1).join(':').trim(),query=explicit||(uuid(context.customerId)?context.customerId:context.customerQuery);
 if(typeof query!=='string'||query.trim().length<3||query.length>120||/[\u0000-\u001f]/.test(query))return clarify('Hãy chọn hội thoại của khách hoặc ghi mã khách, số điện thoại chính xác hay họ tên đầy đủ sau dấu hai chấm.');
 return {intent:'customer.case',filters:{query:query.trim(),direction:match[1].startsWith('sap toi')?'upcoming':'recent'}};
}
async function answerCustomerCase({route,caller,staff,budget,text,status}){
 const resolver=readTools.prepare('internal.customer_resolve',{query:route.filters.query},staff.permissions);
 const dummy='00000000-0000-0000-0000-000000000001';
 const commerce=route.filters.kind==='pets_orders';
 const requests=commerce?[{key:'pets',tool:'internal.customer_pets',filters:{customerId:dummy}},{key:'order',tool:'internal.customer_latest_order',filters:{customerId:dummy}}]:[{key:'appointment',tool:'internal.customer_appointment',filters:{customerId:dummy,direction:route.filters.direction}},{key:'tickets',tool:'internal.customer_tickets',filters:{customerId:dummy}}];
 const allowed=requests.map(r=>{try{readTools.prepare(r.tool,r.filters,staff.permissions);return true;}catch(error){if(error.code==='42501')return false;throw error;}});
 if(!allowed.some(Boolean))throw Object.assign(Error('customer_case_forbidden'),{code:'42501'});
 const identity=await budget.run(caller,resolver);
 if(!Number.isSafeInteger(identity.total)||identity.total<0||identity.total>2||identity.items.length!==identity.total||identity.scope?.query!==route.filters.query)throw fail();
 const continuation={type:'open_module',href:'#tab-list'};
 if(identity.total!==1)return {answer_type:'clarify',scope:{},reply:identity.total===0?'Không tìm thấy khách theo thông tin chính xác đã cung cấp. Hãy kiểm tra mã khách, số điện thoại hoặc họ tên đầy đủ.':'Có nhiều khách phù hợp. Hãy dùng mã khách hoặc mã định danh chính xác; chưa đọc dữ liệu liên quan để tránh trộn khách.',continuation,limitations:['Chưa xác định duy nhất một khách.'],resource_usage:budget.snapshot()};
 const customer=identity.items[0];if(!uuid(customer.id)||typeof customer.code!=='string'||!customer.code.trim()||typeof customer.name!=='string')throw fail();
 const customerId=customer.id.toLowerCase();
 const results=await Promise.all(requests.map(async(r,index)=>{
  if(!allowed[index])return {status:'forbidden',data:null};
  try{
   const data=await budget.run(caller,readTools.prepare(r.tool,{...r.filters,customerId},staff.permissions));
   if(data.scope?.customerId!==customerId||!Number.isFinite(Date.parse(data.as_of))||!Number.isSafeInteger(data.total)||data.total<0)throw fail();
   if(r.key==='appointment'){
    if(data.scope.direction!==route.filters.direction||data.total>1||data.items.length!==data.total||data.items.some(item=>typeof item.code!=='string'||!Number.isFinite(Date.parse(item.scheduled_at))))throw fail();
   }else if(r.key==='order'){
    if(data.total>1||data.items.length!==data.total||data.items.some(item=>item.customer_id!==customerId||typeof item.code!=='string'||!item.code.trim()||typeof item.status!=='string'||!Number.isFinite(Date.parse(item.created_at))))throw fail();
   }else{
    if(data.items.length>data.total||new Set(data.items.map(item=>item.code)).size!==data.items.length||data.items.some(item=>typeof item.code!=='string'||!item.code.trim()))throw fail();
    if(r.key==='tickets'&&data.items.some(item=>['completed','resolved','closed','rejected','cancelled','da_giai_quyet','da_dong','tu_choi'].includes(item.status)))throw fail();
    if(r.key==='pets'&&data.items.some(item=>item.customer_id!==customerId||typeof item.name!=='string'||typeof item.status!=='string'||!Number.isFinite(Date.parse(item.created_at))))throw fail();
   }
   return {status:'ok',data};
  }catch(error){return {status:error.code==='42501'?'forbidden':'unavailable',data:null};}
 }));
 if(commerce){
  const [pets,order]=results,partial=results.some(r=>r.status!=='ok');
  const limitations=['Các nguồn được đọc riêng theo cùng mã khách đã xác định, dữ liệu có thể thay đổi giữa các lần đọc.','Thú cưng gồm các trạng thái hồ sơ, không khẳng định mọi hồ sơ đều đang hoạt động.','Đơn mới nhất tính theo thời điểm tạo và mã định danh khi trùng thời điểm, gồm cả bản nháp hoặc đã hủy. Không suy ra thanh toán, hoàn tiền hoặc giao hàng từ trạng thái đơn.'];
  const lines=[`**${text(customer.name)} — ${text(customer.code)}**`,'**Thú cưng trong hồ sơ**'];
  const when=v=>new Date(v).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),unavailable=r=>r.status==='forbidden'?'Chưa có quyền hoặc không còn truy cập được nguồn này.':'Chưa đọc được nguồn này; không coi là không có dữ liệu.';
  const petStates={active:'Hoạt động',inactive:'Không hoạt động',deceased:'Đã mất',archived:'Đã lưu trữ'};
  if(pets.status==='ok'){
   lines.push(`Có **${pets.data.total}** hồ sơ thú cưng.`);
   lines.push(...pets.data.items.map(item=>{const info=[text(item.species||''),text(item.breed||'')].filter(Boolean).join(', '),label=Object.hasOwn(petStates,item.status)?petStates[item.status]:'Chưa có nhãn trạng thái';return `- ${text(item.code)} — ${text(item.name)}${info?'; '+info:''}; ${label}.`;}));
   if(pets.data.total>pets.data.items.length)limitations.push(`Đang hiển thị ${pets.data.items.length}/${pets.data.total} hồ sơ mới nhất; mở phân hệ để kiểm tra thêm.`);
   lines.push('Dữ liệu thú cưng đọc lúc '+when(pets.data.as_of)+'.');
  }else lines.push(unavailable(pets));
  lines.push('**Đơn được tạo mới nhất — mọi trạng thái**');
  if(order.status==='ok'){
   const item=order.data.items[0],label=item?status(item.status):null;
   lines.push(item?`${text(item.code)} — ${typeof label!=='string'||label===item.status?'Chưa có nhãn trạng thái':label}; tạo lúc ${when(item.created_at)}.`:'Không có đơn được phép đọc của khách này.');
   lines.push('Dữ liệu đơn đọc lúc '+when(order.data.as_of)+'.');
  }else lines.push(unavailable(order));
  if(partial)limitations.push('Kết quả từng phần: nguồn thiếu quyền hoặc chưa đọc được không được coi là rỗng.');
  lines.push('Phạm vi: '+limitations.join(' '));
  return {answer_type:'customer.case',scope:{customerId,kind:'pets_orders'},reply:lines.join('\n\n'),facts:{customer,pets,order},partial,source:[identity.source,...results.filter(r=>r.status==='ok').map(r=>r.data.source)].join('; '),as_of:pets.data?.as_of||order.data?.as_of||identity.as_of||null,limitations,continuation,resource_usage:budget.snapshot()};
 }
 const [appointment,tickets]=results,partial=results.some(r=>r.status!=='ok');
 const limitations=['Lịch và phiếu hỗ trợ được đọc riêng theo đúng mã khách đã xác định; dữ liệu có thể cập nhật giữa các lần đọc.','Chỉ đếm phiếu có liên kết khách trực tiếp; chưa suy ra khách từ đơn hoặc lịch khi phiếu chưa gắn khách.'];
 const unavailable=result=>result.status==='forbidden'?'Chưa có quyền hoặc không còn truy cập được nguồn này.':'Chưa đọc được nguồn này; không coi là không có dữ liệu.';
 const when=v=>new Date(v).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
 const lines=[`**${text(customer.name)} — ${text(customer.code)}**`,route.filters.direction==='upcoming'?'**Lịch sắp tới gần nhất**':'**Lịch vừa qua gần nhất**'];
 if(appointment.status==='ok'){
  const item=appointment.data.items[0];lines.push(item?`${text(item.code)} — ${status(item.status)}, ${when(item.scheduled_at)}. ${text(item.services||'')}`:'Không có lịch phù hợp trong phạm vi tra cứu.');
  lines.push('Dữ liệu lịch đọc lúc '+when(appointment.data.as_of)+'.');
 }else lines.push(unavailable(appointment));
 lines.push('**Khiếu nại còn mở gắn trực tiếp với khách**');
 if(tickets.status==='ok'){
  lines.push(`Có **${tickets.data.total}** phiếu chưa kết thúc.`);
  lines.push(...tickets.data.items.map(item=>`- ${text(item.code)} — ${text(item.subject)}, ${status(item.status)}.`));
  if(tickets.data.total>tickets.data.items.length)limitations.push(`Đang hiển thị ${tickets.data.items.length}/${tickets.data.total} phiếu mới nhất; mở hồ sơ khách để kiểm tra thêm.`);
  lines.push('Dữ liệu phiếu đọc lúc '+when(tickets.data.as_of)+'.');
 }else lines.push(unavailable(tickets));
 if(partial)limitations.push('Kết quả từng phần: nguồn chưa đọc được hoặc thiếu quyền không được coi là rỗng.');
 lines.push('Phạm vi: '+limitations.join(' '));
 return {answer_type:'customer.case',scope:{customerId,direction:route.filters.direction},reply:lines.filter(Boolean).join('\n\n'),facts:{customer,appointment,tickets},partial,source:[identity.source,...results.filter(r=>r.status==='ok').map(r=>r.data.source)].join('; '),as_of:appointment.data?.as_of||tickets.data?.as_of||identity.as_of||null,limitations,continuation,resource_usage:budget.snapshot()};
}
module.exports={planCustomerCase,answerCustomerCase};
