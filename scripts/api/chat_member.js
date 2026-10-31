'use strict';
const {fold}=require('./chat_public_guest.js');
const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const paths={appointments:'/user#bookings',orders:'/user#orders',pets:'/user#pets',loyalty:'/user#loyalty',point_history:'/user#loyalty',wallet:'/user#loyalty',care:'/user#diary',hotel:'/user#bookings',taxi:'/user#bookings',support:'/user#support'};
const labels={appointments:'Lịch hẹn',orders:'Đơn hàng',pets:'Hồ sơ bé',loyalty:'Điểm và hạng',point_history:'Lịch sử điểm',wallet:'Ví ưu đãi',care:'Nhật ký chăm sóc',hotel:'Lưu trú Hotel',taxi:'Chuyến Taxi',support:'Yêu cầu hỗ trợ'};
const detailKinds=['point_history','wallet','care','hotel','taxi','support'];
const link=kind=>`[${labels[kind]}](${paths[kind]})`;
const isFollowup=question=>/^(?:xem (?:tiep|them)|trang \d+|don (?:dau|thu)|lich (?:dau|thu)|be (?:dau|thu))/.test(fold(question));
const neutralSupport=question=>/^(?:(?:xem|tra cuu|kiem tra) )?(?:yeu cau ho tro|phieu ho tro)(?: cua (?:toi|minh))?(?: (?:xu ly (?:den dau|the nao)|dang o trang thai nao|trang thai|trang \d+))?[?!.]*$/.test(fold(question));
function plan(question,recent=[]){
 const q=fold(question);
 if(/cua (?:nguoi khac|khach|nhan vien|admin|anh |chi )|ho so khach|doanh thu|gia von|luong nhan vien/.test(q)||/(?:don(?: hang)?|lich(?: hen)?|ho so(?: be)?|thu cung|diem|paw ?points?|hang thanh vien) cua (?!(?:toi|minh|ban|tai khoan|chinh minh)\b)/.test(q))return {reply:'PawPal chỉ tra thông tin thuộc tài khoản bạn đang đăng nhập, không cung cấp hồ sơ người khác hoặc dữ liệu nội bộ. Bạn muốn xem lịch hẹn, đơn hàng, hồ sơ bé hay điểm của mình nhé?',understood:false};
 if(/la gi|chinh sach|quy dinh|dieu kien|can bao nhieu diem|bao nhieu diem.*(?:len hang|doi)|cach (?:dat|mua)|huong dan/.test(q))return null;
 let base=null,skipped=0;
 if(isFollowup(question)){
  for(const old of recent.slice(0,4)){if(/^(?:xem (?:tiep|them))/.test(fold(old))){skipped++;continue;}base=plan(old,[]);if(base?.request)break;if(!isFollowup(old))break;}
  if(!base?.request)return {reply:'Bạn muốn xem tiếp đơn hàng, lịch hẹn hay hồ sơ bé? Bạn nói rõ nhóm và số trang giúp PawPal nhé.',understood:false};
  if(/^(?:don|lich|be) (?:dau|thu)/.test(q))return {reply:'Bạn gửi mã đơn, mã lịch hoặc mã bé trong danh sách để PawPal chọn đúng nhé. Thứ tự có thể thay đổi khi có dữ liệu mới.',understood:false};
 }
 const code=String(question).match(/\b(?:ORD|BKG|APT|PET|TKT|SUP|HTL)-[a-z0-9-]+\b/i)?.[0]?.toUpperCase();
 if(code&&code.length>64)return {reply:'Mã bạn gửi quá dài. Bạn kiểm tra lại mã đơn, lịch hoặc bé trong tài khoản giúp PawPal nhé.',understood:false};
 const id=String(question).match(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i)?.[0];
 const groups=[[/don hang|don (?:cua|nao|gan|va)|(?:xem|tra|ma|huy|doi) don|\bord-/.test(q),'orders'],[/lich hen|lich (?:cua|nao|sap|hom nay|mai|va)|\b(?:bkg|apt)-/.test(q),'appointments'],[/thu cung|ho so be|cac be|nhung be|be (?:cua|ten|nha toi)|thong tin be|\bpet-/.test(q),'pets'],[/paw ?points?|so du diem|diem (?:cua|con|thuong)|bao nhieu diem|(?:toi|minh).*con.*diem|(?:toi|minh) (?:(?:dang|o|thuoc|la) ){0,3}hang(?: nao| gi|$)|hang thanh vien|^(?:hang cua|xem hang|kiem tra hang)/.test(q),'loyalty']].filter(([yes])=>yes).map(([,kind])=>kind);
 if(groups.length>1)return {reply:'PawPal sẽ tra từng phần cho rõ nhé. Bạn muốn xem lịch hẹn, đơn hàng, hồ sơ bé hay điểm và hạng trước?',understood:false};
 const advanced=[[/lich su.*(?:diem|paw)|diem.*(?:da cong|da tru|bien dong)/.test(q),'point_history'],[/vi uu dai|vi voucher|voucher cua|uu dai cua|ma giam.*cua|(?:toi|minh).*(?:co|con).*voucher/.test(q),'wallet'],[/nhat ky|tien trinh cham soc|cham soc.*cua toi/.test(q),'care'],[/(?:hotel|luu tru|khach san).*(?:cua toi|cua minh|da dat)|(?:phong|ngay nhan|ngay tra).*cua toi/.test(q)||/(?:hotel|luu tru|khach san)/.test(q)&&!!(code||id),'hotel'],[/taxi.*(?:cua toi|cua minh|da dat)|chuyen (?:dua don|taxi)/.test(q)||/(?:taxi|dua don)/.test(q)&&!!(code||id),'taxi'],[/yeu cau ho tro|phieu ho tro|khieu nai cua|\b(?:tkt|sup)-/.test(q),'support']].filter(([yes])=>yes).map(([,kind])=>kind);
 if(advanced.length>1)return {reply:'Bạn muốn PawPal tra phần nào trước: nhật ký, Hotel, Taxi, lịch sử điểm, ví ưu đãi hay yêu cầu hỗ trợ?',understood:false};
 const kind=advanced[0]||groups[0]||base?.request.kind;if(!kind)return null;
 if(/^(?:cach|lam sao|o dau)|cach (?:xem|tra|kiem tra)/.test(q))return {reply:'Bạn mở '+link(kind)+' trong tài khoản để xem và thao tác nhé. PawPal cũng có thể tra thông tin của bạn ngay trong chat khi bạn hỏi cụ thể.',understood:true};
 if(/huy|doi lich|doi gio|tao don|dat ho|mua ho|cap nhat|chinh sua|doi diem|tru diem|cong diem/.test(q))return {reply:'PawPal có thể giúp bạn tra thông tin, còn thao tác thay đổi cần bạn kiểm tra và xác nhận ở '+link(kind)+' nhé. Câu chat này chưa thay đổi dữ liệu của bạn.',understood:true};
 const pageMatch=q.match(/\btrang\s+(\d+)\b/),next=/^xem (?:tiep|them)/.test(q);
 const page=pageMatch?Number(pageMatch[1])-1:next?(base?.request.page||0)+skipped+1:0;
 if(!Number.isInteger(page)||page<0||page>99||kind==='loyalty'&&page!==0)return {reply:'Bạn chọn trang từ1 đến100 cho danh sách nhé. Điểm và hạng hiện tại chỉ cần một lượt xem. '+link(kind),understood:false};
 if(/thang|nam ngoai|tuan truoc|tuan sau|tu ngay|den ngay/.test(q)&&kind==='appointments')return {reply:'PawPal hiện có thể tra lịch hôm nay, ngày mai, sắp tới hoặc lịch đã qua. Bạn chọn một khoảng này, hoặc mở '+link(kind)+' để lọc thêm nhé.',understood:false};
 const request={kind,page};
 if(base?.request&&isFollowup(question))Object.assign(request,base.request,{page});
 if(code)request.code=code;else if(id)request.id=id;
 if(kind==='appointments'&&!code&&!id&&!base?.request){request.mode=/hom nay/.test(q)?'today':/ngay mai|\bmai\b/.test(q)?'tomorrow':/sap toi|sap den|gan nhat/.test(q)?'upcoming':/da qua|truoc day/.test(q)?'past':'all';}
 if(kind==='pets'&&!code&&!id){const name=String(question).match(/(?:bé tên|be ten|thông tin bé|thong tin be|hồ sơ bé|ho so be)\s+(.+?)[?!.]*$/iu)?.[1]?.trim();if(name&&!/^(?:của|cua|nhà|nha) (?:tôi|toi|minh|mình)/iu.test(name)){if(name.length>80)return {reply:'Bạn gửi tên hoặc mã bé ngắn gọn để PawPal tra đúng hồ sơ nhé.',understood:false};request.name=name;}}
 return {request};
}
const text=(value,max=180)=>typeof value==='string'?value.slice(0,max).trim():'';
const money=n=>{if(typeof n!=='number'||!Number.isFinite(n)||n<0)throw Error('invalid_member_money');return n.toLocaleString('vi-VN',{maximumFractionDigits:2})+' đ';};
const date=value=>{if(typeof value!=='string'||!Number.isFinite(Date.parse(value)))throw Error('invalid_member_date');return new Date(value).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit',year:'numeric'});};
const status=value=>({pending:'Chờ xác nhận',confirmed:'Đã xác nhận',in_progress:'Đang thực hiện',checked_in:'Đã tiếp nhận',completed:'Đã hoàn tất',cancelled:'Đã hủy',draft:'Bản nháp',processing:'Đang xử lý',preparing:'Đang chuẩn bị',packing:'Đang đóng gói',shipped:'Đã bàn giao vận chuyển',shipping:'Đang giao',in_transit:'Đang vận chuyển',delivered:'Đã giao',failed:'Chưa thành công',returned:'Đã trả hàng',active:'Đang hoạt động',inactive:'Ngừng hoạt động'})[value]||'Đang cập nhật';
function format(data,route,owner){
 const r=route.request,kind=r.kind;
 if(!data||data.customer_id!==owner||data.kind!==kind||data.page!==r.page||typeof data.has_more!=='boolean'||!Array.isArray(data.items)||data.items.length>5||Buffer.byteLength(JSON.stringify(data))>16384||!Number.isFinite(Date.parse(data.as_of)))throw Error('invalid_member_context');
 if(kind==='loyalty'){
  if(data.items.length!==1||!Number.isSafeInteger(data.items[0].points)||data.has_more)throw Error('invalid_member_loyalty');const row=data.items[0];
  return {reply:'Bạn hiện có '+row.points.toLocaleString('vi-VN')+' Paw Points nhé. '+(text(row.tier)?'Hạng đang được ghi nhận là '+text(row.tier,100)+'.':'PawPal chưa thấy hạng được gán cho tài khoản này.')+'\nBạn có thể xem lịch sử điểm và điều kiện sử dụng tại '+link(kind)+'.',understood:true};
 }
 if(detailKinds.includes(kind))return formatDetails(data,route);
 if(!data.items.length)return {reply:'PawPal chưa tìm thấy '+({orders:'đơn hàng',appointments:'lịch hẹn',pets:'hồ sơ bé'})[kind]+' khớp yêu cầu trong tài khoản của bạn'+(kind==='appointments'?' ở khoảng thời gian đã chọn':'')+'. Bạn kiểm tra lại mã/bộ lọc hoặc mở '+link(kind)+' nhé.',understood:true};
 const lines=data.items.map(row=>{
  if(!uuid(row.id)||!text(row.code)||typeof row.status!=='string')throw Error('invalid_member_item');
  if(kind==='pets'){
   if(!text(row.name))throw Error('invalid_member_pet');
   let line='• '+text(row.name)+' — '+text(row.code)+'. '+[text(row.species),text(row.breed)].filter(Boolean).join(' · ')+'.';
   if(row.birth_date){date(row.birth_date);line+=' Ngày sinh đã ghi: '+new Date(row.birth_date).toLocaleDateString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})+'.';}
   if(['male','female'].includes(row.gender))line+=' Giới tính: '+(row.gender==='male'?'Đực':'Cái')+'.';
   if(row.weight!=null){if(typeof row.weight!=='number'||!Number.isFinite(row.weight)||row.weight<=0)throw Error('invalid_member_weight');line+=' Cân nặng ghi nhận: '+row.weight+'kg'+(row.measured_at?' ('+date(row.measured_at)+')':'')+'.';}else line+=' Chưa có lần cân được ghi nhận.';
   if(text(row.allergy))line+=' Dị ứng đã ghi: '+text(row.allergy,300)+'.';if(text(row.safety_note))line+=' Lưu ý: '+text(row.safety_note,300)+'.';return line;
  }
  const path=kind==='orders'?'/user#order-detail?id=':'/user#booking-detail?id=';
  let line='• '+text(row.code)+' — '+status(row.status)+'. ';
  if(kind==='appointments')line+=date(row.start_at)+(text(row.pet)?' · Bé '+text(row.pet):'')+(text(row.service)?' · '+text(row.service):'')+'.';
  else line+='Tạo lúc '+date(row.created_at)+'.'+(row.shipping_status?' Giao nhận: '+status(row.shipping_status)+'.':'');
  line+=row.total==null?' Chưa có tổng tiền xác nhận.':' Tổng tiền hiện ghi nhận: '+money(row.total)+'.';
  if(kind==='orders')line+=' Thanh toán thành công: '+money(row.paid)+'. Đã hoàn thành công: '+money(row.refunded)+'.';
  return line+' [Xem chi tiết]('+path+row.id+')';
 });
 const next=data.has_more?'\nBạn hỏi “'+labels[kind]+' của tôi trang '+(r.page+2)+'” để xem tiếp nhé.':'';
 return {reply:'PawPal gửi bạn thông tin thuộc tài khoản đang đăng nhập nhé:\n\n'+lines.join('\n\n')+next+'\n'+link(kind)+(kind==='orders'?'\nTrạng thái đơn hàng và thanh toán được theo dõi riêng.':''),understood:true};
}
function formatDetails(data,route){
 const kind=route.request.kind;
 if(!data.items.length)return {reply:'PawPal chưa tìm thấy '+labels[kind].toLowerCase()+' khớp yêu cầu trong tài khoản của bạn. Bạn kiểm tra mã hoặc mở '+link(kind)+' nhé.',understood:true};
 const lines=data.items.map(row=>{
  if(!uuid(row.id))throw Error('invalid_member_detail');
  if(kind==='point_history'){if(!Number.isSafeInteger(row.points))throw Error('invalid_member_points');return '• '+date(row.created_at)+' — '+(row.points>0?'+':'')+row.points.toLocaleString('vi-VN')+' điểm. '+(text(row.description,400)||'Chưa có mô tả.');}
  if(kind==='wallet'){
   if(!text(row.code)||!text(row.name)||typeof row.is_active!=='boolean')throw Error('invalid_member_voucher');
   const now=Date.parse(data.as_of),expired=row.expired_at&&Date.parse(row.expired_at)<now||row.end_date&&row.end_date<new Date(now+7*3600000).toISOString().slice(0,10);
   const voucherStatus=expired?'Đã hết hạn':!row.is_active?'Đang ngừng áp dụng':row.status==='available'?'Chưa sử dụng':row.status==='used'?'Đã sử dụng':row.status==='expired'?'Đã hết hạn':'Đang cập nhật';
   const amount=row.discount_type==='percent'?(typeof row.discount_value==='number'&&row.discount_value>=0&&row.discount_value<=100?row.discount_value+'%':(()=>{throw Error('invalid_discount')})()):row.discount_type==='fixed'?money(row.discount_value):'theo điều kiện của mã';
   return '• '+text(row.name)+' — '+text(row.code)+'. '+voucherStatus+'. Mức giảm: '+amount+'. Giá trị đơn tối thiểu: '+money(row.minimum_order_amount)+'.'+(row.expired_at?' Hạn ví: '+date(row.expired_at)+'.':'')+(row.start_date&&row.end_date?' Thời gian chương trình: '+row.start_date+' đến '+row.end_date+'.':'')+' Chỉ xác nhận áp dụng khi kiểm tra ở bước đặt/mua.';
  }
  if(kind==='support')return '• '+text(row.code)+' — '+text(row.subject)+'. '+({[row.status]:'Đang cập nhật',pending:'Chờ tiếp nhận',processing:'Đang xử lý',waiting_customer:'Chờ bạn phản hồi',waiting_manager_approval:'Đang xem xét',resolved:'Đã giải quyết',closed:'Đã đóng',completed:'Đã hoàn tất',reprocessing:'Đang xử lý lại'})[row.status]+'. Tạo lúc '+date(row.created_at)+'.'+(text(row.description,600)?' Nội dung: '+text(row.description,600):'')+(text(row.latest_reply,600)?' Trao đổi công khai gần nhất: '+text(row.latest_reply,600):'')+(text(row.resolution,600)?' Kết quả: '+text(row.resolution,600):'');
  if(!uuid(row.appointment_id)||!text(row.code))throw Error('invalid_member_appointment_detail');
  const bookingLink=' [Xem lịch liên quan](/user#booking-detail?id='+row.appointment_id+')';
  if(kind==='care')return '• '+date(row.recorded_at)+' · '+text(row.pet)+' · '+text(row.code)+' — '+text(row.action)+'. '+text(row.description,600)+(text(row.condition,400)?' Quan sát đã ghi: '+text(row.condition,400)+'.':'')+bookingLink;
  if(kind==='hotel')return '• '+text(row.code)+(text(row.booking_code)?' · '+text(row.booking_code):'')+' · Bé '+text(row.pet)+'. '+({[row.status]:'Đang cập nhật',pending:'Chờ nhận phòng',reserved:'Đã giữ phòng',checked_in:'Đang lưu trú',checked_out:'Đã trả phòng',cancelled:'Đã hủy'})[row.status]+'. Nhận: '+date(row.check_in_at)+'; trả: '+date(row.check_out_at)+'. Phòng: '+(text(row.room)||'Chưa gán')+(text(row.room_type)?' · '+text(row.room_type):'')+'. Mức giá lưu trú ghi trên phiếu: '+money(row.daily_price)+' (tổng cuối cùng xem lịch liên quan).'+(text(row.diet,400)?' Khẩu phần: '+text(row.diet,400):'')+(text(row.care,400)?' Chăm sóc: '+text(row.care,400):'')+bookingLink;
  if(typeof row.distance!=='number'||row.distance<=0||!Number.isFinite(row.distance))throw Error('invalid_member_taxi');
  return '• '+text(row.code)+' · Bé '+text(row.pet)+'. '+({[row.status]:'Đang cập nhật',pending:'Chờ điều phối',assigned:'Đã phân công',in_progress:'Đang thực hiện',completed:'Đã hoàn tất',cancelled:'Đã hủy'})[row.status]+'. '+(row.trip_type==='round_trip'?'Khứ hồi':row.trip_type==='one_way'?'Một chiều':'Loại chuyến theo phiếu')+'. Đón: '+text(row.pickup,400)+'; trả: '+text(row.dropoff,400)+'. '+row.distance+'km; giá chuyến ghi nhận: '+money(row.price)+'.'+(row.outbound_at?' Đi: '+date(row.outbound_at)+'.':'')+(row.return_at?' Về: '+date(row.return_at)+'.':'')+bookingLink;
 });
 return {reply:'PawPal gửi bạn '+labels[kind].toLowerCase()+' thuộc tài khoản của bạn nhé:\n\n'+lines.join('\n\n')+(data.has_more?'\nBạn hỏi “'+labels[kind]+' của tôi trang '+(route.request.page+2)+'” để xem tiếp nhé.':'')+'\n'+link(kind)+(kind==='care'?'\nĐây là ghi nhận chăm sóc, không phải chẩn đoán thú y.':''),understood:true};
}
async function read(caller,request){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);try{let call=caller.rpc(detailKinds.includes(request.kind)?'read_member_chat_details':'read_member_chat_context',{p_request:request});if(typeof call.abortSignal==='function')call=call.abortSignal(controller.signal);const result=await call;if(result.error)throw result.error;return result.data;}finally{clearTimeout(timer);}
}
module.exports={plan,format,read,isFollowup,paths,neutralSupport};
