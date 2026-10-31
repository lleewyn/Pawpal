'use strict';
const fold=value=>String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').replace(/\s+/g,' ').trim();
function rewrite(question){
 const raw=String(question).trim(),q=fold(raw);
 if(/^lich (?:hom nay|hom qua|ngay mai|tuan nay|tuan truoc|thang nay|thang truoc|\d)/.test(q))return raw.replace(/^lịch\s+|^lich\s+/iu,'Lịch hẹn ');
 if(/^(?:hotel|taxi|khach san) (?:hom nay|hom qua|ngay mai|tuan nay|thang nay)/.test(q))return 'Lịch hẹn '+raw;
 if(/^so sanh (?:thuc thu|doanh thu) (hom nay|tuan nay|thang nay) va (hom qua|tuan truoc|thang truoc)[?.!]*$/.test(q))return raw.replace(/^so sánh\s+|^so sanh\s+/iu,'').replace(/\s+và\s+|\s+va\s+/iu,' so ');
 return raw;
}
function route(question,context={},now=new Date()){
 const raw=String(question).trim(),q=fold(raw);
 const rooms=/(?:hotel|khach san|phong).*(?:con phong|con trong|phong trong|con cho|con bao nhieu|con khong)|(?:con|co|bao nhieu) phong|cong suat hotel/.test(q),stays=/luot luu tru|lich luu tru|khach dang luu tru|hotel da dat/.test(q),trips=/chuyen taxi|chuyen dua don/.test(q);
 if(rooms||stays||trips){try{const p=require('./chat_stage3_planner.js').period(raw,now);if(!p.explicit)return {intent:'clarify',answer:'Bạn cho biết ngày hoặc khoảng nhận/trả cần kiểm tra, tối đa31 ngày. Số phòng trả về tính cho toàn khoảng đó, chưa phải xác nhận giữ phòng.'};const code=raw.match(/\b(?:BKG|HTL|APT)-[\w-]+/i)?.[0],query=raw.split(/[:：]/).slice(1).join(':').trim()||code;return {intent:rooms?'hotel.availability':stays?'hotel.stays':'taxi.trips',filters:{...p.filters,...(query?{query}:{})}};}catch(e){return {intent:'clarify',answer:e.message};}}
 if(/^gia\b/.test(q)&&/\d+(?:[.,]\d+)?\s*(?:kg|km)\b/.test(q)&&!raw.includes(':')&&!raw.includes('：'))return {intent:'clarify',answer:'Bạn cho biết mã hoặc tên đầy đủ của gói để lọc đúng cân nặng/cự ly. Ví dụ: “Bảng giá chi tiết Spa 7kg: tên gói”. Giá tìm được là mức cấu hình, chưa phải báo giá xác nhận.'};
 if(/diem (?:cua )?(?:khach|chu nuoi)|hang cua khach/.test(q)){
  const query=raw.match(/\bCUS-[\w-]+|\b0\d{8,10}\b/i)?.[0]||raw.match(/(?:khách hàng|khach hang|khách|khach|chủ nuôi|chu nuoi)\s*:?\s+(.+?)[?.!]*$/iu)?.[1]?.trim()||context.customerQuery;
  if(query?.length>=3)return {intent:'points.lookup',filters:{query}};
 }
 if(raw.includes(':')||raw.includes('：'))return null;
 const rules=[[/^(?:tìm |tim |tra cứu |tra cuu |thông tin |thong tin )?(?:khách hàng|khach hang|chủ nuôi|chu nuoi)\s+(.+?)[?!.]*$/iu,'customer.lookup'],[/^(?:tìm |tim |tra cứu |tra cuu |thông tin |thong tin )?(?:thú cưng|thu cung|bé cưng|be cung)\s+(.+?)[?!.]*$/iu,'pet.lookup'],[/^(?:tìm |tim |tra cứu |tra cuu )?(?:sản phẩm|san pham|hàng hóa|hang hoa)\s+(.+?)[?!.]*$/iu,'catalog.product']];
 for(const [pattern,intent]of rules){const m=raw.match(pattern);if(!m)continue;const query=m[1].replace(/^(?:tên|ten|là|la)\s+/iu,'').trim(),f=fold(query);if(query.length<3||query.length>120||/hom nay|ngay mai|tuan|thang|tat ca|danh sach|sap het|ton kho|con lai|bao nhieu|^nay\b|^cua\b|^co\b|^nao\b|\b(?:hoat dong|bi khoa|da huy)\b/.test(f))return null;return {intent,filters:{query}};}
 return null;
}
module.exports={rewrite,route};
