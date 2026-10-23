// Documentation audit: compare enum.md with the captured OpenAPI dictionary, no DB writes.
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const fields=new Map();let table;
for(const line of fs.readFileSync(path.join(root,'docs/testing/generated/PAWPAL_GD1_TU_DIEN_DU_LIEU.md'),'utf8').split('\n')){
 if(line.startsWith('### '))table=line.slice(4).trim();
 if(!table||!line.startsWith('| '))continue;
 const p=line.split('|').map(x=>x.trim());if(p.length!==9||p[1]==='Cột'||!p[1])continue;
 fields.set(table+'.'+p[1],{type:p[3],default:p[5],values:p[6]==='Không công bố'?null:p[6].split(', ')});
}
const targets={account_status:['customer.account_status'],gender:['customer_profile.gender','pet_profile.gender'],reward_type:['reward_rule.reward_type'],trigger_event:['reward_rule.trigger_event'],voucher_type:['voucher.type'],applicable_for:['voucher.applicable_for'],acquired_method:['customer_voucher.acquired_method'],voucher_status:['customer_voucher.voucher_status'],species:['pet_profile.species'],pet_status:['pet_profile.status'],service_category:['service.service_category','care_action.service_category'],service_status:['service.status'],groomer_level:['service.groomer_level'],pet_type:['service.pet_type'],room_type:['hotel_room_type.room_type'],room_status:['hotel_room.status'],price_status:['service_price_matrix.status'],taxi_rule_status:['taxi_price_rule.status'],appointment_status:['appointment.appointment_status'],payment_status:['sales_order.payment_status','appointment.payment_status'],media_type:['care_log_media.media_type'],supplier_status:['supplier.status'],purchase_order_status:['purchase_order.order_status'],product_status:['product.status','product_variant.status'],cart_status:['cart.cart_status'],reservation_status:['stock_reservation.status'],transaction_type:['inventory_transaction.transaction_type'],payment_type:['payment.payment_type'],transaction_status:['payment.transaction_status'],available_status:['payment_method_config.available','delivery_option_config.available'],review_type:['review.review_type'],review_status:['review.review_status'],sender_type:['support_ticket_message.sender_type','chat_message.sender_type'],channel:['support_ticket.channel','chat_conversation.channel'],category_ticket:['support_ticket.category'],priority:['support_ticket.priority'],ticket_status:['support_ticket.status'],resolution_type:['support_ticket.resolution_type','return_request.resolution_type'],return_type:['return_request.return_type'],request_status:['return_request.request_status'],refund_type:['refund_transaction.refund_type'],refund_method:['refund_transaction.refund_method'],refund_status:['refund_transaction.refund_status'],staff_role:['staff.role','staff_public_view.role'],availability_status:['staff_schedule.availability_status'],promotion_status:['promotion.status'],discount_type:['promotion.discount_type'],banner_status:['banner.status'],blog_status:['blog_post.status'],notification_type:['notification.notification_type'],setting_type:['pawpal_setting.setting_type'],order_status:['sales_order.order_status'],shift:['staff_schedule.shift'],schedule_status:['staff_schedule.schedule_status'],category_status:['product_category.status','blog_category.status'],hotel_booking_status:['hotel_booking.status'],shift_request_type:['staff_shift_request.request_type'],shift_request_status:['staff_shift_request.status']};
const rows=[];let concepts=0;
for(const line of fs.readFileSync(path.join(root,'docs/archive/database/enum.md'),'utf8').split(/\r?\n/)){
 const p=line.split('\t').map(x=>x.trim());if(p.length<3||!/^[a-z_]\w*$/.test(p[0]))continue;
 concepts++;const expected=p[2].split(',').map(x=>x.trim()).filter(Boolean);
 for(const name of targets[p[0]]||[]){
  const f=fields.get(name);if(!f){rows.push({concept:p[0],name,type:'Không có trong từ điển',expected,status:'Chưa xác định cột',missing:[],extra:[],default:'—'});continue;}
  const missing=f.values?expected.filter(x=>!f.values.includes(x)):[],extra=f.values?f.values.filter(x=>!expected.includes(x)):[];
  const d=f.default.replace(/^"|"$/g,'');
  let status=f.values?(missing.length||extra.length?'Lệch enum đã công bố':'Khớp tập enum'):'Không công bố enum — cần CHECK/quy tắc';
  if(!f.values&&['boolean','boolean / items: boolean'].includes(f.type))status='Khác biểu diễn: boolean, không phải enum chuỗi';
  if(!f.values&&!['Không công bố','Không xuất giá trị nhạy cảm'].includes(d)&&!expected.includes(d)&&!['true','false'].includes(d))status+='; default ngoài bộ giá trị thiết kế';
  rows.push({concept:p[0],name,type:f.type,expected,status,missing,extra,default:f.default});
 }
 if(!targets[p[0]])rows.push({concept:p[0],name:'Chưa gắn cột',type:'—',expected,status:'Cần xác định phạm vi',missing:[],extra:[],default:'—'});
}
const lines=['# Giai đoạn 1 — Đối chiếu enum.md với metadata Supabase','',
 'Nguồn thiết kế bổ sung: enum.md. Nguồn triển khai: từ điển OpenAPI đã chụp trong giai đoạn 1. Không sửa enum.md, CDSLfinal.md hoặc database. Các liên kết khái niệm → cột là phạm vi đối chiếu khai báo, không khẳng định cột text có ràng buộc enum.', '',
 `Đã kiểm tra ${concepts} khái niệm thiết kế trên ${rows.length} liên kết cột.`, '',
 '## Kết quả','', '| Khái niệm | Bảng.cột / kiểu live | Tập giá trị enum.md | Kết quả | Default live | Thiếu / ngoài enum live |','|---|---|---|---|---|---|'];
for(const r of rows)lines.push(`| ${r.concept} | ${r.name} / ${r.type} | ${r.expected.join(', ')} | ${r.status} | ${r.default} | Thiếu: ${r.missing.join(', ')||'—'}; ngoài: ${r.extra.join(', ')||'—'} |`);
lines.push('', '## Cách xử lý','',
 '- “Khớp tập enum” chỉ xác nhận tập giá trị, chưa xác nhận default/NULL/trigger/quy tắc chuyển trạng thái.',
 '- “Lệch enum” phải được chốt giữa thiết kế và triển khai; không tự chọn một phía rồi sửa hàng loạt.',
 '- Text/varchar có thể được CHECK hoặc function kiểm soát. Không tự gửi giá trị mới từ enum.md khi chưa kiểm tra catalog và consumer hiện tại.',
 '- Boolean available có thể cần ánh xạ UI, không đổi kiểu database thành chuỗi vì tài liệu có available_status.',
 '- Các default text ngoài bộ giá trị thiết kế là đầu mối cần đối chiếu; chưa kết luận dữ liệu bản ghi hiện có đều lệch.');
fs.writeFileSync(path.join(root,'docs/testing/generated/PAWPAL_GD1_DOI_CHIEU_ENUM_THIET_KE.md'),lines.join('\n')+'\n');
console.log(`${concepts} concepts, ${rows.length} column bindings; ${rows.filter(r=>r.status.startsWith('Khớp')).length} enum matches; ${rows.filter(r=>r.status.startsWith('Lệch')).length} enum mismatches.`);
for(const r of rows.filter(r=>r.status.startsWith('Lệch')||r.status.includes('default ngoài')))console.log(r.name+': '+r.status);
