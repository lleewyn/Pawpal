'use strict';
const normalize=s=>String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
const isoDay=d=>d.toISOString().slice(0,10);
function period(question,now=new Date()){
 const q=normalize(String(question).split(/[:：]/)[0]).replace(/\bkhuyen mai\b/g,'khuyenmai'),wall=new Date(now.getTime()+7*3600000),today=isoDay(wall),midnight=day=>Date.parse(day+'T00:00:00+07:00');let start=midnight(today),end=start+86400000,explicit=false;
 const day=(d,m,y)=>{const value=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`,t=midnight(value);if(!Number.isFinite(t)||isoDay(new Date(t+7*3600000))!==value)throw Error('Ngày tra cứu chưa hợp lệ.');return t;};
 const range=q.match(/tu(?: ngay)? (\d{1,2})\/(\d{1,2})(?:\/(\d{4}))? den(?: ngay)? (\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/);
 if(range){start=day(range[1],range[2],range[3]||wall.getUTCFullYear());end=day(range[4],range[5],range[6]||range[3]||wall.getUTCFullYear())+86400000;explicit=true;}
 else if(/tuan (nay|truoc)/.test(q)){const monday=(wall.getUTCDay()+6)%7;start-=monday*86400000;if(/tuan truoc/.test(q))start-=7*86400000;end=start+7*86400000;explicit=true;}
 else if(/thang (nay|truoc)/.test(q)){const month=wall.getUTCMonth()-(/thang truoc/.test(q)?1:0),year=wall.getUTCFullYear();start=midnight(isoDay(new Date(Date.UTC(year,month,1))));end=midnight(isoDay(new Date(Date.UTC(year,month+1,1))));explicit=true;}
 else {const match=q.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/);if(match){start=day(match[1],match[2],match[3]||wall.getUTCFullYear());explicit=true;}else if(/hom qua/.test(q)){start-=86400000;explicit=true;}else if(/\bmai\b/.test(q)){start+=86400000;explicit=true;}else if(/hom nay/.test(q))explicit=true;end=start+86400000;}
 if(end<=start||end-start>31*86400000)throw Error('Mỗi lượt hỗ trợ tối đa 31 ngày. Hãy chia khoảng thời gian cần xem.');
 if(/nam nay|quy (nay|truoc)|thang \d|tuan toi/.test(q))throw Error('Hãy ghi ngày bắt đầu và ngày kết thúc trong phạm vi 31 ngày.');
 return {filters:{start_at:new Date(start).toISOString(),end_at:new Date(end).toISOString()},explicit};
}
function appointmentPlan(question,now,staffQuery){
 const q=normalize(question),p=period(q,now);if(!p.explicit)return {intent:'clarify',answer:'Bạn muốn xem lịch ngày nào? Hãy ghi ngày hoặc kỳ trước phần tên KTV, ví dụ: Lịch Spa ngày mai theo KTV: họ tên đầy đủ.'};
 if(staffQuery!==undefined&&(staffQuery.trim().length<2||/chua (phan cong|co ktv)/.test(q)))return {intent:'clarify',answer:'Hãy cung cấp họ tên đầy đủ hoặc mã nhân viên; không kết hợp một KTV cụ thể với điều kiện chưa phân công.'};
 const f={...p.filters};if(/spa|grooming|cat tia|tam say/.test(q))f.category='grooming_spa';else if(/hotel|khach san/.test(q))f.category='pet_hotel';else if(/taxi|dua don/.test(q))f.category='pet_taxi';
 if(/chua (phan cong|co ktv)/.test(q))f.unassigned='true';if(staffQuery!==undefined)f.staff_query=staffQuery.trim();
 if(/\bchieu\b/.test(q))f.day_part='afternoon';else if(/\bsang\b/.test(q))f.day_part='morning';else if(/\btoi\b/.test(q))f.day_part='evening';
 if(/khong den/.test(q))f.status='no_show';else if(/da huy/.test(q))f.status='cancelled';else if(/da tiep nhan/.test(q))f.status='checked_in';else if(/cho phuc vu|da xac nhan/.test(q))f.status='confirmed';else if(/cho duyet|cho xac nhan/.test(q))f.status='pending';else if(/hoan tat|hoan thanh/.test(q))f.status='completed';else if(/dang (lam|thuc hien)/.test(q))f.status='in_progress';return {intent:'appointment.search',filters:f};
}
function planStage3(question,now=new Date(),context={}){
 const q=normalize(question);if(/soan|huong dan|quy trinh|chinh sach|tom tat/.test(q)||/ban nhap/.test(q)&&!/bai viet/.test(q))return null;
 const colon=String(question).split(/[:：]/).slice(1).join(':').trim().replace(/\s+trang\s+\d+\s*$/iu,'');
 const identifier=String(question).match(/\b(?:CUS|PET|ORD|SO|DH|POS|TK|APT)-[\w-]+|\b0\d{8,10}\b/i)?.[0];
 const query=colon||identifier||'',page=q.match(/\btrang (\d+)\b/)?.[1];
 const emit=(intent,filters={})=>({intent,filters:{...filters,...(page?{page}:{})}}),need=(intent,hint)=>{const value=query||hint;if(!value||value.trim().length<3)return {intent:'clarify',answer:'Hãy cung cấp mã, tên hoặc số điện thoại sau dấu hai chấm để xác định đúng đối tượng.'};return emit(intent,{query:value});};
 let dates;const dated=()=>dates||(dates=period(q,now));
 try{
  const staffMarker=String(question).match(/\s+(?:(?:theo|của|cua)\s+(?:KTV|nhân viên|nhan vien|kỹ thuật viên|ky thuat vien)\s*:?\s*|(?:KTV|nhân viên|nhan vien|kỹ thuật viên|ky thuat vien)\s*:\s*)(.*)$/iu);
  if(staffMarker&&/lich (hen|spa|taxi|khach san|dich vu)/.test(normalize(String(question).slice(0,staffMarker.index))))return appointmentPlan(String(question).slice(0,staffMarker.index),now,staffMarker[1]);
  if(/noi dung (?:day du (?:cua )?)?(bai viet|danh gia)|doc (?:day du )?(bai viet|danh gia)|chi tiet (bai viet|danh gia)/.test(q)){
   const cursor=String(question).match(/\s+phần\s+(\d+)(?:\s+bản\s+([a-f0-9]{32}))?\s*$/iu)||q.match(/\s+phan\s+(\d+)(?:\s+ban\s+([a-f0-9]{32}))?\s*$/);
   const target=colon.replace(/\s+(?:phần|phan)\s+\d+(?:\s+(?:bản|ban)\s+[a-f0-9]{32})?\s*$/iu,'').trim();
   if(!target||target.length<3)return {intent:'clarify',answer:'Hãy ghi mã hoặc tên đầy đủ của bài viết, hoặc mã đánh giá, sau dấu hai chấm.'};
   if(cursor&&Number(cursor[1])>1&&!cursor[2])return {intent:'clarify',answer:'Hãy mở lại phần đầu rồi bấm “Đọc phần tiếp” để giữ đúng phiên bản nội dung.'};
   return {intent:/bai viet/.test(q)?'content.read':'review.read',filters:{query:target,...(cursor?{part:cursor[1],...(cursor[2]?{revision:cursor[2]}:{})}:{})}};
  }
  if(/bang gia chi tiet|ma tran gia|muc gia chi tiet/.test(q)){
   if(!query||query.length<3)return {intent:'clarify',answer:'Hãy cung cấp mã hoặc tên đầy đủ của dịch vụ sau dấu hai chấm. Ví dụ: Bảng giá chi tiết Spa 5 kg: mã dịch vụ.'};
   const prefix=q.split(/[:：]/)[0];if(/[-−]\s*\d+(?:[.,]\d+)?\s*(kg|km)|(?:tu |den |toi da |it nhat |tren |duoi ).*\d+(?:[.,]\d+)?\s*(kg|km)/.test(prefix)||(prefix.match(/\d+(?:[.,]\d+)?\s*kg/g)||[]).length>1||(prefix.match(/\d+(?:[.,]\d+)?\s*km/g)||[]).length>1)return {intent:'clarify',answer:'Hãy cung cấp một cân nặng và một cự ly cụ thể để lọc mức giá; chưa hỗ trợ điều kiện khoảng hoặc số âm.'};
   if(period(prefix,now).explicit&&!/hom nay/.test(prefix))return {intent:'clarify',answer:'Công cụ này tra mức giá đang hiệu lực hiện tại. Chưa hỗ trợ mức giá theo ngày khác.'};
   const f={query};if(/spa|grooming|cat tia/.test(prefix))f.category='grooming_spa';else if(/hotel|khach san/.test(prefix))f.category='pet_hotel';else if(/taxi/.test(prefix))f.category='pet_taxi';
   const weight=q.split(':')[0].match(/(\d+(?:[.,]\d+)?)\s*kg\b/),distance=q.split(':')[0].match(/(\d+(?:[.,]\d+)?)\s*km\b/);if(weight)f.weight=weight[1].replace(',','.');if(distance)f.distance=distance[1].replace(',','.');return emit('catalog.price_rows',f);
  }
  if(/(?:khach|chu nuoi).*nay.*(be|pet|thu cung)|(?:be|pet|thu cung).*cua khach nay/.test(q))return need('customer.pets',context.customerQuery);
  if(/pawpoint|paw point|diem (thuong|con lai)|bao nhieu diem|so du diem/.test(q))return need('points.lookup',context.customerQuery);
  if(/be cung|thu cung|pet\b|\bPET-/i.test(q)&&!/hotel|taxi|lich hen|lich spa|dich vu|gia/.test(q))return /khach|chu nuoi/.test(q)?need('customer.pets',context.customerQuery):need('pet.lookup');
  if(/don (?:hang )?(?:huy|da huy)|don.*chua hoan|chua hoan.*don/.test(q))return emit('order.refund_pending',dated().explicit?dated().filters:{});
  if(/thanh toan|da thu.*don|tien.*don/.test(q)&&/don|\b(?:ord|so|dh|pos)-/.test(q))return need('payment.order',context.orderCode);
  if(/lich truc|lich (nhan vien|lam viec)|phan ca|ca truc/.test(q))return emit('staff.schedule',{...dated().filters,...(query?{query}:{})});
  if(/nhan vien|nhan su|ky thuat vien/.test(q)&&!/lich hen|lich spa|hoi thoai|ca chat|danh gia|khieu nai/.test(q)){if(/luong|hoa hong|tai khoan|so ngay nghi/.test(q))return {intent:'clarify',answer:'Tra cứu nhân sự hiện hỗ trợ danh sách, chức danh và trạng thái làm việc. Hãy mở phân hệ Nhân sự để kiểm tra thông tin chuyên sâu theo quyền.'};const status=/da nghi viec|cham dut|nghi viec/.test(q)?'terminated':/tam ngung|tam nghi/.test(q)?'inactive':/dang lam|hoat dong/.test(q)?'active':null;return emit('staff.lookup',{...(query?{query}:{}),...(status?{status}:{})});}
  if(/hoi thoai|ca chat/.test(q))return emit('conversation.list',{...(dated().explicit?dated().filters:{}),...(query?{query}:{}),...(/cho (nhan vien|chuyen vien)|cho xu ly/.test(q)?{status:'waiting_agent'}:/dang (ho tro|xu ly)/.test(q)?{status:'agent_handling'}:/da (dong|ket thuc)/.test(q)?{status:'closed'}:{})});
  if(/khieu nai|ticket|phieu ho tro/.test(q)&&query)return need('ticket.lookup');
  if(/uu dai|voucher|khuyen mai|ma giam/.test(q))return emit('offer.list',query?{query}:{});
  if(/danh gia|review/.test(q)){const word=q.match(/\b([1-5]|mot|hai|ba|bon|nam) sao\b/)?.[1],star=word?({mot:'1',hai:'2',ba:'3',bon:'4',nam:'5'}[word]||word):null;
   const rating=star?(/toi da|tro xuong/.test(q)?{rating_max:star}:/it nhat|tro len/.test(q)?{rating_min:star}:{rating_min:star,rating_max:star}):/thap/.test(q)?{rating_max:'2'}:{};
   return emit('review.list',{...dated().filters,...(query?{query}:{}),...rating});}
  if(/bai viet|noi dung blog/.test(q))return emit('content.list',{...(query?{query}:{}),...(/nhap/.test(q)?{status:'draft'}:/da dang|cong khai/.test(q)?{status:'published'}:{})});
  if(/cau hinh|gio mo cua|hotline|thong tin cua hang/.test(q)){if(/api.?key|mat khau|token|secret|tai khoan ngan hang/.test(q))return {intent:'clarify',answer:'Tôi chỉ tra cứu cấu hình kinh doanh được cho phép; không trả khóa, mật khẩu hoặc thông tin tài khoản thanh toán.'};return emit('settings.read',query?{query}:{});}
  if(/bao cao (van hanh|tong quan)|chi so van hanh/.test(q))return emit('report.operations',dated().filters);
  const specialDate=/tuan|thang|tu(?: ngay)? \d/.test(q);
  if(/lich hen|lich spa/.test(q)&&(specialDate||/chua (phan cong|co ktv)|buoi |\b(sang|chieu|toi)\b/.test(q)))return appointmentPlan(question,now);
  if(specialDate&&/doanh thu|thuc thu|tien thu|tong thu/.test(q))return {intent:'revenue.summary',filters:dated().filters};
  if(specialDate&&/khieu nai|ticket|phieu ho tro/.test(q))return {intent:'ticket.open',filters:dated().filters};
 }catch(error){return {intent:'clarify',answer:error.message};}
 return null;
}
module.exports={period,planStage3};
