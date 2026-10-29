'use strict';
const {period}=require('./chat_stage3_planner.js');
const readTools=require('./chat_read_tools.js');
const normalize=value=>String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[?!]/g,'').replace(/\s+/g,' ').trim();
function planPending(question,now=new Date()){
 const q=normalize(question),isOverview=/viec can (xu ly|kiem tra)/.test(q),isPair=/don huy/.test(q)&&/lich/.test(q)&&/chua (phan cong|co ktv)/.test(q);
 if(!isOverview&&!isPair)return null;
 const match=q.match(/^(?:tong hop |xem )?viec can (?:xu ly|kiem tra) (.+)$/)
  ||q.match(/^don huy chua hoan(?: du)? va lich cho phuc vu chua (?:phan cong ktv|co ktv) (.+)$/);
 const clarify=answer=>({intent:'clarify',answer});
 if(!match)return clarify('Bảng kiểm tra hiện gồm đơn hủy đã thu nhiều hơn đã hoàn và lịch chờ phục vụ chưa phân công KTV. Hãy ghi ngày hoặc kỳ, ví dụ “Việc cần kiểm tra hôm nay”. Chưa hỗ trợ kết luận quá hạn hoặc các nhóm việc khác.');
 const range=match[1];
 if(!/^(?:hom nay|ngay mai|hom qua|tuan nay|tuan truoc|thang nay|thang truoc|\d{1,2}\/\d{1,2}(?:\/\d{4})?|tu(?: ngay)? \d{1,2}\/\d{1,2}(?:\/\d{4})? den(?: ngay)? \d{1,2}\/\d{1,2}(?:\/\d{4})?)$/.test(range))return clarify('Hãy ghi ngày hoặc khoảng tối đa31 ngày; bộ lọc chi nhánh, SLA/quá hạn và nhóm việc khác chưa có trong bảng kiểm tra này.');
 try{return {intent:'operations.pending',filters:{appointments:{...period(range,now).filters,status:'confirmed',unassigned:'true'},refunds:'all_outstanding'}};}catch(error){return clarify(error.message);}
}
async function answerPending({route,caller,staff,budget,formatFacts}){
 const sources=[{key:'refunds',tool:'order.refund_pending',filters:{}},{key:'appointments',tool:'appointment.search',filters:route.filters.appointments}];
 const prepared=sources.map(source=>{try{return {descriptor:readTools.prepare(source.tool,source.filters,staff.permissions)};}catch(error){if(error.code==='42501')return {error};throw error;}});
 if(prepared.every(p=>p.error))throw prepared[0].error;
 const results=await Promise.all(prepared.map(async(p,index)=>{
  if(p.error)return {status:'forbidden',data:null,error:p.error};
  try{
   const data=await budget.run(caller,p.descriptor);formatFacts(data);
   if(!data.scope||typeof data.scope!=='object'||Array.isArray(data.scope)||!Number.isFinite(Date.parse(data.as_of))||Object.hasOwn(data.scope,'time_zone')&&data.scope.time_zone!=='Asia/Ho_Chi_Minh'||data.items.some(item=>typeof item.code!=='string'||!item.code.trim())||new Set(data.items.map(item=>item.code)).size!==data.items.length)throw Error('invalid_pending_source');
   if(index===0){
    if(!data.scope||Object.keys(data.scope).some(key=>key!=='time_zone')||data.items.some(item=>Number(item.net)<=0||Number(item.collected)<0||Number(item.refunded)<0))throw Error('invalid_pending_refunds');
   }else{
    const scope=data.scope||{},expected=route.filters.appointments;
    if(Object.keys(scope).some(key=>key!=='time_zone'&&!Object.hasOwn(expected,key))||scope.status!=='confirmed'||scope.unassigned!=='true'||['start_at','end_at'].some(key=>Date.parse(scope[key])!==Date.parse(expected[key]))||data.items.some(item=>item.status!=='confirmed'||!Number.isFinite(Date.parse(item.scheduled_at))||Date.parse(item.scheduled_at)<Date.parse(expected.start_at)||Date.parse(item.scheduled_at)>=Date.parse(expected.end_at)))throw Error('invalid_pending_appointments');
   }
   return {status:'ok',data};
  }catch(error){return {status:error.code==='42501'?'forbidden':'unavailable',data:null,error};}
 }));
 if(results.every(r=>r.status!=='ok'))throw results.find((r,index)=>!prepared[index].error)?.error||results[0].error;
 const limitations=['Chỉ kiểm tra hai nhóm: đơn hủy có số đã thu lớn hơn số đã hoàn và lịch chờ phục vụ chưa phân công KTV. Không phải danh sách mọi việc cần xử lý.','Đơn lấy toàn bộ tồn đọng, không lọc theo ngày tạo đơn; khoảng ngày chỉ áp dụng cho lịch.','Chênh lệch thanh toán cần đối soát, chưa phải khoản hoàn đã được phê duyệt. Chưa phân công KTV không chứng minh thiếu người hoặc quá hạn.','Không cộng tổng đơn và tổng lịch thành một chỉ số chung; các nguồn được đọc riêng và có thể thay đổi giữa các lần đọc.'];
 const lines=['**Hai nhóm việc cần kiểm tra**'];
 for(let i=0;i<sources.length;i++){
  lines.push(i===0?'**Đơn hủy chưa hoàn đủ — toàn bộ tồn đọng**':'**Lịch chờ phục vụ chưa phân công KTV — trong kỳ đã chọn**');
  const result=results[i];
  if(result.status==='ok')lines.push(formatFacts({...result.data,page:undefined,limitations:Array.isArray(result.data.limitations)?result.data.limitations.map(value=>String(value).replace(/\bsucceeded\b/g,'thành công')):result.data.limitations}));
  else lines.push(result.status==='forbidden'?'Chưa có quyền xem nguồn này; không coi là không có việc cần kiểm tra.':'Chưa đọc được nguồn này; không coi là không có việc cần kiểm tra.');
 }
 const partial=results.some(r=>r.status!=='ok');if(partial)limitations.push('Kết quả từng phần: chỉ các nhóm đọc thành công mới có số liệu được xác nhận.');
 if(results.some(r=>r.data&&r.data.total>r.data.items.length))limitations.push('Chỉ hiển thị trang đầu của mỗi nhóm. Muốn xem tiếp, hãy hỏi riêng nhóm đó, ví dụ “Đơn hủy chưa hoàn trang 2”, hoặc tra lịch trong cùng kỳ.');
 lines.push('Phạm vi: '+limitations.join(' '));
 const first=results.findIndex(r=>r.status==='ok'),target=prepared[first].descriptor.target;
 return {answer_type:'operations.pending',scope:route.filters,reply:lines.join('\n\n'),facts:Object.fromEntries(sources.map((source,index)=>[source.key,{status:results[index].status,data:results[index].data}])),partial,source:sources.map((source,index)=>results[index].status==='ok'?`${source.tool}: ${results[index].data.source}`:null).filter(Boolean).join('; '),as_of:results[first].data.as_of,limitations,continuation:target?{type:'open_module',href:target}:null,resource_usage:budget.snapshot()};
}
module.exports={planPending,answerPending};
