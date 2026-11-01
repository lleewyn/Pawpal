'use strict';
// Presentation only: formatFacts validates counts and every row before calling here.
function present(data,{rows,text,includeSource=true}){
 const scope=data.scope||{},n=Number(data.total),date=v=>new Date(v).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'}),clock=v=>new Date(v).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
 const first=scope.start_at?date(scope.start_at):'',last=scope.end_at?date(Date.parse(scope.end_at)-1):'',period=first?(first===last?'ngày '+first:'từ '+first+' đến '+last):'trong phạm vi bạn đang xem';
 const pager=Number(data.pages)>1?`Trang ${data.page}/${data.pages}.${data.page<data.pages?' Bạn có thể hỏi “trang '+(data.page+1)+'” để xem tiếp.':''}`:'';
 const updated=includeSource&&data.as_of?'*Cập nhật lúc '+clock(data.as_of)+'.*':'';
 if(data.intent==='staff.schedule'){
  const heading=`**Lịch trực ${first?period:'hiện tại'}**`;
  const body=n?`Mình tìm thấy **${n} ca trực** phù hợp.\n\n${rows.join('\n')}`:'Mình chưa tìm thấy lịch trực phù hợp trong phạm vi bạn được xem. Bạn có thể thử ngày khác hoặc mở **Lịch làm việc** để kiểm tra thêm nhé.';
  const notes=n?(Array.isArray(data.limitations)?data.limitations.join(' '):data.limitations||''):'';
  return [heading,body,pager,notes?'**Lưu ý**\n\n'+notes:'',updated].filter(Boolean).join('\n\n');
 }
 if(data.intent!=='hotel.availability')return null;
 const available=Number(data.available),unavailable=Number(data.unavailable),heading='**Phòng Hotel '+period+'**';
 const summary=!n?'Mình chưa tìm thấy phòng đang hoạt động phù hợp trong phạm vi bạn được xem.':available?`Mình tìm thấy **${available} phòng có thể nhận trọn khoảng này**${unavailable?` trong ${n} phòng được kiểm tra. **${unavailable} phòng** đang vướng lịch giữ hoặc có bé lưu trú`:''}.`:`Hiện **${n} phòng được kiểm tra đều đang vướng lịch giữ hoặc có bé lưu trú**. Bạn có thể thử khoảng ngày khác nhé.`;
 const table=data.items.length?['| Phòng | Loại phòng | Sức chứa |'+(unavailable?' Trạng thái |':''),'| --- | --- | --- |'+(unavailable?' --- |':''),...data.items.map(r=>`| ${text(r.code)} | ${text(r.name)} | ${Number(r.capacity)} bé |`+(unavailable?` ${r.available?'Có thể nhận':r.occupied?'Đang có bé lưu trú':'Vướng lịch giữ'} |`:''))].join('\n'):'';
 const note=n?'Sức chứa là số bé cấu hình cho từng phòng. Kết quả tra cứu **chưa giữ phòng**; bạn cần kiểm tra lại khi lưu đặt lịch.':'';
 const interval=scope.start_at&&scope.end_at?`Khoảng kiểm tra: từ ${clock(scope.start_at)} đến trước ${clock(scope.end_at)} theo giờ Việt Nam. Ngày kết thúc được tính trọn ngày, chưa mặc định giờ nhận/trả của một đặt lịch.`:'';
 return [heading,summary,table,pager,note?'**Lưu ý**\n\n'+note:'',interval,updated].filter(Boolean).join('\n\n');
}
module.exports={present};
