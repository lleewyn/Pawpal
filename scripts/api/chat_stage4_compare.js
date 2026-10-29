'use strict';
const {period}=require('./chat_stage3_planner.js');
const readTools=require('./chat_read_tools.js');
const normalize=value=>String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/[?!.,]/g,'').replace(/\s+/g,' ').trim();
function planComparison(question,now=new Date()){
 const q=normalize(question);
 if(!/thuc thu|doanh thu|doanh so|loi nhuan/.test(q)||!/so sanh|\bso\b|\bvoi\b|chenh lech|\bhon\b/.test(q))return null;
 const clarify=answer=>({intent:'clarify',answer});
 if(!/thuc thu/.test(q)||/doanh thu|doanh so|loi nhuan/.test(q))return clarify('So sánh hiện hỗ trợ thực thu: tiền thu thành công trừ tiền hoàn thành công theo thời điểm giao dịch. Hãy dùng “Thực thu tuần này so tuần trước”; doanh số và lợi nhuận cần công thức riêng.');
 const match=q.match(/^(?:so sanh )?thuc thu (hom nay|tuan nay|thang nay) (?:so (?:voi )?|voi )(hom qua|tuan truoc|thang truoc)$/)
  ||q.match(/^(?:so sanh )?(hom nay|tuan nay|thang nay) thuc thu (?:so (?:voi )?|voi )(hom qua|tuan truoc|thang truoc)$/);
 if(!match)return clarify('Hãy ghi hai kỳ rõ ràng, ví dụ “Thực thu hôm nay so hôm qua”, “Tuần này thực thu so tuần trước” hoặc “Thực thu tháng này so tháng trước”. Chưa hỗ trợ thêm bộ lọc chi nhánh hoặc phân nhóm trong câu so sánh này.');
 const previousFor={'hom nay':'hom qua','tuan nay':'tuan truoc','thang nay':'thang truoc'};
 if(previousFor[match[1]]!==match[2])return clarify('Hai kỳ cần cùng loại: hôm nay/hôm qua, tuần này/tuần trước hoặc tháng này/tháng trước.');
 const current=period(match[1],now).filters,previous=period(match[2],now).filters;
 const currentStart=Date.parse(current.start_at),currentEnd=Math.min(+now,Date.parse(current.end_at));
 if(currentEnd<=currentStart)return clarify('Kỳ hiện tại vừa bắt đầu, chưa có khoảng thời gian để so sánh. Hãy thử lại sau.');
 const previousStart=Date.parse(previous.start_at),uncapped=previousStart+(currentEnd-currentStart),previousEnd=Math.min(uncapped,Date.parse(previous.end_at));
 return {intent:'revenue.compare',filters:{period:match[1]==='hom nay'?'day':match[1]==='tuan nay'?'week':'month',comparison:'previous_elapsed',current:{start_at:current.start_at,end_at:new Date(currentEnd).toISOString()},previous:{start_at:previous.start_at,end_at:new Date(previousEnd).toISOString()},previous_capped:previousEnd<uncapped}};
}
async function answerComparison({route,caller,staff,budget,validateFacts}){
 // Prepare every source before launching either read. Permissions and filters are fixed.
 const keys=['current','previous'],prepared=keys.map(key=>readTools.prepare('revenue.summary',route.filters[key],staff.permissions));
 const results=await Promise.allSettled(prepared.map(async descriptor=>{
  const data=await budget.run(caller,descriptor);validateFacts(data);
  if(!Number.isFinite(Date.parse(data.as_of))||['start_at','end_at'].some(key=>Date.parse(data.scope?.[key])!==Date.parse(descriptor.filters[key])))throw Error('invalid_comparison_scope');
  if(Number(data.collected)<0||Number(data.refunded)<0)throw Error('invalid_comparison_amount');
  return data;
 }));
 if(results.every(r=>r.status==='rejected'))throw results[0].reason;
 const current=results[0].status==='fulfilled'?results[0].value:null,previous=results[1].status==='fulfilled'?results[1].value:null;
 const money=v=>Number(v).toLocaleString('vi-VN',{maximumFractionDigits:2})+' đ';
 const when=v=>new Date(v).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
 const limitations=['Thực thu là thu thành công trừ hoàn thành công theo thời điểm giao dịch, không phải giá trị đơn tạo trong kỳ.','Hai kỳ được đọc riêng; dữ liệu có thể cập nhật giữa hai lần đọc.'];
 if(route.filters.previous_capped)limitations.push('Tháng trước ngắn hơn: kỳ đối chiếu dừng ở cuối tháng trước, không vượt sang tháng sau.');
 const lines=['**So sánh thực thu**','So từ đầu kỳ đến thời điểm hỏi với cùng khoảng thời gian của kỳ trước; không so kỳ đang dở với toàn bộ kỳ trước.'];
 for(let i=0;i<keys.length;i++){
  const key=keys[i],data=key==='current'?current:previous,label=key==='current'?'Kỳ hiện tại':'Kỳ trước',range=route.filters[key];
  lines.push(`**${label}: ${when(range.start_at)} đến trước ${when(range.end_at)}**`);
  if(data)lines.push(`Đã thu ${money(data.collected)}; đã hoàn ${money(data.refunded)}; thực thu **${money(data.net)}**.\nDữ liệu đọc lúc ${when(data.as_of)}.`);
  else{lines.push('Chưa đọc được dữ liệu kỳ này; không coi là bằng 0.');limitations.push(label+' chưa có kết quả xác nhận; lỗi nguồn hoặc quyền không phải dữ liệu rỗng.');}
 }
 let delta=null,percent=null;
 if(current&&previous){
  delta=Number(current.net)-Number(previous.net);if(!Number.isFinite(delta))throw Error('invalid_comparison_amount');lines.push(`Chênh lệch thực thu: **${delta>0?'+':''}${money(delta)}**.`);
  if(Number(previous.net)>0){percent=delta/Number(previous.net)*100;if(Number.isFinite(percent))lines.push(`Thay đổi so kỳ trước: ${percent>0?'+':''}${percent.toLocaleString('vi-VN',{maximumFractionDigits:2})}%.`);else{percent=null;limitations.push('Tỷ lệ vượt giới hạn số học; chưa xác nhận phần trăm thay đổi.');}}
  else limitations.push(Number(previous.net)===0?'Không tính tỷ lệ phần trăm vì thực thu kỳ trước bằng 0.':'Không tính tỷ lệ phần trăm vì thực thu kỳ trước âm.');
 }else{limitations.push('Kết quả từng phần: chưa đủ hai kỳ để tính chênh lệch hoặc kết luận tăng/giảm.');}
 lines.push('Phạm vi: '+limitations.join(' '));
 return {answer_type:'revenue.compare',scope:route.filters,reply:lines.join('\n\n'),facts:{current,previous,delta,percent},source:keys.map((key,i)=>results[i].status==='fulfilled'?`${key}: ${results[i].value.source}`:null).filter(Boolean).join('; '),as_of:current?.as_of||previous?.as_of||null,limitations,continuation:null,partial:!current||!previous,resource_usage:budget.snapshot()};
}
module.exports={planComparison,answerComparison};
