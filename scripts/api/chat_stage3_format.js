'use strict';
const labels={'customer.pets':'Thú cưng theo chủ nuôi','pet.lookup':'Thú cưng','payment.order':'Thanh toán và hoàn tiền của đơn','order.refund_pending':'Đơn hủy chưa hoàn đủ','appointment.search':'Lịch hẹn theo điều kiện','ticket.lookup':'Phiếu hỗ trợ','conversation.list':'Hội thoại','points.lookup':'Số dư Pawpoint','offer.list':'Ưu đãi đang hiệu lực','staff.lookup':'Nhân viên','staff.schedule':'Lịch trực','review.list':'Đánh giá','content.list':'Bài viết','report.operations':'Chỉ số vận hành','settings.read':'Cấu hình kinh doanh được phép đọc'};
Object.assign(labels,{'content.read':'Nội dung bài viết','review.read':'Nội dung đánh giá','catalog.price_rows':'Mức giá chi tiết'});
Object.assign(labels,{'hotel.availability':'Phòng Hotel theo khoảng','hotel.stays':'Lượt lưu trú Hotel','taxi.trips':'Chuyến Taxi'});
function row(intent,r,text,status){
 const number=v=>{if(!((typeof v==='number'||typeof v==='string'&&v.trim()!=='')&&Number.isFinite(Number(v))))throw Error('invalid_stage3_number');return Number(v);};
 const integer=(v,minimum=-Infinity,maximum=Infinity)=>{const n=number(v);if(!Number.isSafeInteger(n)||n<minimum||n>maximum)throw Error('invalid_stage3_number');return n;};
 const money=v=>number(v).toLocaleString('vi-VN')+' đ';
 const when=v=>new Date(v).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'});
 if(['hotel.stays','taxi.trips'].includes(intent)){for(const v of (intent==='hotel.stays'?[r.check_in_at,r.check_out_at]:[r.outbound_at,...(r.return_at?[r.return_at]:[])]))if(typeof v!=='string'||!v.trim()||!Number.isFinite(Date.parse(v)))throw Error('invalid_stage3_date');}
 let value='';
 if(intent==='hotel.availability'){if(typeof r.available!=='boolean'||typeof r.reserved!=='boolean'||typeof r.occupied!=='boolean'||r.available!==( !r.reserved&&!r.occupied))throw Error('invalid_room_availability');return `- ${text(r.code)} — ${text(r.name)}; sức chứa cấu hình ${integer(r.capacity,1)}; ${r.available?'có thể nhận trọn khoảng':r.occupied?'đang có bé lưu trú':'vướng lịch giữ trong khoảng'}.`;}
 if(intent==='hotel.stays')return `- ${text(r.code)} — ${text(r.appointment_code)}; bé ${text(r.name)}; phòng ${text(r.room)} (${text(r.room_type)}); ${status(r.status)}; ${when(r.check_in_at)}–${when(r.check_out_at)}; mức ghi trên phiếu ${money(r.price)}/${integer(r.billing_minutes,1)} phút, chưa phải tổng tiền.`;
 if(intent==='taxi.trips'){if(!['round_trip','one_way'].includes(r.trip_type)||number(r.distance)<0||number(r.price)<0)throw Error('invalid_taxi_trip');return `- ${text(r.code)} — bé ${text(r.name)}; ${status(r.status)}; ${when(r.outbound_at)}${r.return_at?'–'+when(r.return_at):''}; ${r.trip_type==='round_trip'?'khứ hồi':'một chiều'}; ${number(r.distance)}km, giá chuyến ${money(r.price)}; đón ${text(r.pickup)}, trả ${text(r.dropoff)}.`;}
 if(['content.read','review.read'].includes(intent)){
  if(typeof r.body!=='string'||Array.from(r.body).length>2000||!Number.isSafeInteger(r.part)||!Number.isSafeInteger(r.parts)||r.part<1||r.part>r.parts||!/^[a-f0-9]{32}$/.test(r.revision))throw Error('invalid_detail_part');
  return `**${text(r.name)}** — ${status(r.status)}. Phần ${r.part}/${r.parts}.\n\n${r.body}`;
 }
 if(intent==='catalog.price_rows'){
  const range=(from,to,unit)=>`từ ${from} ${to==null?'trở lên':'đến dưới '+to} ${unit}`;
  const unit=r.billing_minutes==null?null:integer(r.billing_minutes,1,525600);
  value=r.kind==='hotel'?`${text(r.name)}: ${money(r.price)}${unit?'/'+(unit===1440?'24 giờ':unit+' phút'):'; nguồn này chưa xác nhận đơn vị tính, cần xem bảng giá trước khi báo khách'}`:r.kind==='taxi'?`${range(r.distance_from,r.distance_to,'km')}, ${range(r.weight_from,r.weight_to,'kg')}: ${money(r.price)}, phụ phí ${money(r.surcharge)}`:`${range(r.weight_from,r.weight_to,'kg')}: ${money(r.price)}`;
  return `- ${value}.`;
 }
 if(['customer.pets','pet.lookup'].includes(intent))value=[text(r.name),text(r.breed),r.owner?'Chủ nuôi '+text(r.owner):'',r.notes?'Lưu ý '+text(r.notes):''].filter(Boolean).join('; ');
 else if(['payment.order','order.refund_pending'].includes(intent)){
  if(Math.abs(number(r.net)-(number(r.collected)-number(r.refunded)))>0.001)throw Error('invalid_stage3_amount');
  value=`đã thu ${money(r.collected)}, đã hoàn ${money(r.refunded)}, chênh lệch ${money(r.net)}; ${integer(r.pending_refunds,0)} yêu cầu hoàn đang chờ`;
 }
 else if(intent==='appointment.search')value=`${status(r.status)}, ${when(r.scheduled_at)}; ${text(r.services)}`;
 else if(intent==='points.lookup')value=`${text(r.name)}: ${integer(r.balance).toLocaleString('vi-VN')} điểm`;
 else if(intent==='staff.schedule')value=`${text(r.name)}; ${when(r.start_at)}–${when(r.end_at)}; ${status(r.status)}`;
 else if(intent==='review.list')value=`${integer(r.rating,1,5)}/5; ${status(r.status)}; ${text(r.excerpt)}`;
 else if(intent==='report.operations')return `- ${text(r.name)}: ${integer(r.count,0)}.`;
 else if(intent==='settings.read'){const names={store_name:'Tên cửa hàng',hotline:'Số điện thoại cửa hàng',address:'Địa chỉ',weekday_open:'Giờ mở cửa ngày thường',weekday_close:'Giờ đóng cửa ngày thường',weekend_open:'Giờ mở cửa cuối tuần',weekend_close:'Giờ đóng cửa cuối tuần',free_cancel_hours:'Số giờ được hủy miễn phí',slot_capacity:'Số lịch tối đa mỗi khung giờ'};return `- ${names[r.code]||'Cấu hình'}: ${text(r.value)}${r.truncated?' (nội dung rút gọn)':''}.`;}
 else value=[text(r.name),r.status?status(r.status):'',text(r.detail)].filter(Boolean).join('; ');
 return `- ${text(r.code)} — ${value}${r.truncated?' (nội dung rút gọn)':''}.`;
}
module.exports={labels,row};
