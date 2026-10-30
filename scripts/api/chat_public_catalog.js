'use strict';
const fold=v=>String(v).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().replace(/[?!.,]/g,'').replace(/\s+/g,' ').trim();
function plan(question){
 const q=fold(question);
 const explanation=/la gi|dung de|huong dan|(?:^| )cach |o dau|chinh sach|quy dinh|dieu kien|dang ky|tham gia|doi thuong/.test(q);
 const record=/\b(?:ord|cus|apt)-[a-z0-9-]+/.test(q);
 const privateData=/doanh thu|loi nhuan|luong nhan vien|gia von|danh sach khach|ho so khach|so dien thoai.*khach|lich su (chat|giao dich)|don (hang )?cua|lich hen cua|(?:paw ?points?|diem|hang) cua|(?:so du|bao nhieu|con).*paw ?points?|so du diem|bao nhieu diem|diem con/.test(q);
 if((record||privateData)&&!explanation)return {reply:'Thông tin này thuộc hồ sơ riêng hoặc hoạt động nội bộ. Bạn có thể xem thông tin của chính mình qua mục tra cứu đã xác minh hoặc tài khoản đã đăng nhập; mình không cung cấp hồ sơ của người khác.',understood:false};
 if(/dat ho|mua ho|tao don|xac nhan dat/.test(q)&&!explanation)return {reply:'Mình có thể hướng dẫn bạn đặt lịch hoặc mua hàng. Bạn chọn dịch vụ/sản phẩm, kiểm tra thông tin tại màn hình đặt rồi xác nhận nhé; câu chat này chưa tạo đơn hay lịch thay bạn.',understood:false};
 if(!/\bgia\b|bao nhieu tien|bang gia/.test(q)){
  if(/tu van|gioi thieu|cac goi|dich vu.*nao|chon.*dich vu|nen chon/.test(q)){
   if(/san pham|\bsku\b/.test(q))return null;
   const groups=[[/\b(?:grooming|spa|tam)\b|cat tia/,'grooming_info'],[/hotel|khach san|luu tru/,'hotel_info'],[/taxi|dua don/,'taxi_info']].filter(([pattern])=>pattern.test(q));
   if(groups.length===1)return {kind:groups[0][1],query:''};
   if(groups.length>1||/dich vu|cac goi/.test(q))return {reply:'Bạn muốn tìm hiểu tắm và cắt tỉa, Pet Hotel hay Pet Taxi? Cho mình biết nhu cầu của bé để mình hướng dẫn phù hợp nhé.',understood:false};
  }
  return null;
 }
 const explicitProduct=String(question).trim().match(/^(?:giá|gia)\s+(?:sản phẩm|san pham|SKU)\s+(.+?)[?!.]*$/iu);
 if(explicitProduct){const query=explicitProduct[1].trim();if(query.length>=3&&query.length<=120)return {kind:'product',query};}
 const groups=[[/hotel|khach san|luu tru/,'pet_hotel'],[/taxi|dua don/,'pet_taxi'],[/\b(?:grooming|spa|tam)\b|cat tia/,'grooming_spa']].filter(([pattern])=>pattern.test(q));
 if(groups.length===1)return {kind:groups[0][1],query:''};
 if(groups.length>1)return {reply:'Mình có thể tra giá tắm và cắt tỉa, Pet Hotel hoặc Pet Taxi. Bạn muốn xem nhóm nào trước, và nhu cầu của bé là gì?',understood:false};
 const product=String(question).trim().match(/^(?:giá|gia)\s+(?:sản phẩm\s+|san pham\s+|SKU\s+)?(.+?)(?:\s+(?:bao nhiêu|bao nhieu))?[?!.]*$/iu);
 if(product){const query=product[1].replace(/[?!.]+$/,'').trim();if(query.length>=3&&query.length<=120&&!/^(dich vu|san pham|ban|ca|bao nhieu)$/i.test(fold(query)))return {kind:'product',query};}
 return {reply:'Bạn muốn hỏi giá tắm/cắt tỉa, Pet Hotel, Pet Taxi hay sản phẩm nào? Với sản phẩm, hãy ghi “Giá” kèm tên hoặc mã SKU cụ thể.',understood:false};
}
function format(data,route){
 if(!data||data.kind!==route.kind||data.query!==route.query||!Array.isArray(data.items)||data.items.length>10||Buffer.byteLength(JSON.stringify(data))>16384||!Number.isFinite(Date.parse(data.as_of)))throw Error('invalid_public_catalog');
 const number=v=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw Error('invalid_public_price');return v.toLocaleString('vi-VN',{maximumFractionDigits:4});};
 const money=v=>number(v)+' đ';
 const range=(a,b,unit)=>{const start=number(a);return b==null?`từ ${start} ${unit}`:`từ ${start} đến dưới ${number(b)} ${unit}`;};
 if(['grooming_info','hotel_info','taxi_info'].includes(route.kind)){
  if(data.items.length>5)throw Error('invalid_public_catalog');
  if(!data.items.length)return {reply:'Mình chưa tìm thấy gói đang mở phù hợp. Bạn có thể chọn Gặp chuyên viên để được tư vấn thêm nhé.',understood:false};
  const lines=data.items.map(r=>{if(typeof r.name!=='string'||!r.name.trim()||!Number.isSafeInteger(r.duration)||r.duration<0)throw Error('invalid_public_catalog');return '• '+r.name+(r.duration>0?' — thời lượng dự kiến '+number(r.duration)+' phút.':'.');});
  const follow=route.kind==='grooming_info'?'Bé là chó hay mèo, khoảng bao nhiêu kg và bạn muốn tắm vệ sinh hay cắt tỉa? Mình sẽ hướng dẫn bạn xem gói phù hợp.':route.kind==='hotel_info'?'Bạn dự định gửi bé từ ngày nào đến ngày nào? Bạn có thể xem loại phòng và kiểm tra thời gian tại bước đặt lịch.':'Bạn cần đón và đưa bé giữa những khu vực nào? Tuyến đường, thời gian và báo giá cần kiểm tra tại bước đặt.';
  return {reply:'Một số gói PawPal đang cung cấp:\n'+lines.join('\n')+'\n\n'+follow,understood:true};
 }
 if(!data.items.length)return {reply:'Chưa tìm thấy giá đang có hiệu lực phù hợp. Bạn vui lòng kiểm tra tên/mã sản phẩm hoặc chọn gặp nhân viên; PawPal chưa xác nhận báo giá cho yêu cầu này.',understood:false};
 const lines=data.items.map(r=>{if(typeof r.name!=='string'||!r.name.trim())throw Error('invalid_public_catalog');const price=money(r.price);if(route.kind==='product'){if(typeof r.code!=='string'||!r.code.trim())throw Error('invalid_public_catalog');return `${r.name} — ${r.code}: ${price}.`;}if(route.kind==='grooming_spa')return `${r.name} — ${range(r.weight_from,r.weight_to,'kg')}: ${price}.`;if(route.kind==='pet_hotel')return `${r.name}: ${price}/ngày.`;return `Pet Taxi — ${range(r.distance_from,r.distance_to,'km')}, ${range(r.weight_from,r.weight_to,'kg')}: giá cơ bản ${price}, phụ phí cấu hình ${money(r.surcharge)}.`;});
 const caveat=route.kind==='product'?'Giá niêm yết của biến thể đang bật; chưa gồm phí giao nhận hoặc ưu đãi cá nhân, chưa xác nhận còn hàng.':'Các mức cấu hình đang hiệu lực, chưa phải báo giá xác nhận cho bé hoặc lịch cụ thể. Cần kiểm tra cân nặng, tuyến đường, thời gian lưu trú và phụ phí tại bước đặt; chưa xác nhận lịch/phòng trống.';
 return {reply:lines.join('\n')+'\n\nDanh sách tối đa 10 mức, có thể chưa đầy đủ. '+caveat+' Dữ liệu lúc '+new Date(data.as_of).toLocaleString('vi-VN',{timeZone:'Asia/Ho_Chi_Minh'})+'.',understood:true};
}
const requestsStaff=question=>{const q=fold(question);return !/(?:khong|chua|ko) (?:can|muon)|dung chuyen/.test(q)&&/(?:gap|noi chuyen (?:truc tiep )?voi|ket noi(?: voi)?|chuyen (?:cho|sang)|can) (?:nhan vien|chuyen vien)|ho tro truc tiep/.test(q);};
module.exports={plan,format,requestsStaff};
