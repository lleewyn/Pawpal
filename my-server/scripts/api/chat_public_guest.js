'use strict';
const catalog=require('./chat_public_catalog.js');
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/\bhotle\b|\bhottel\b/g,'hotel').replace(/\bdatlich\b/g,'dat lich').replace(/\bpawpoints?\b/g,'paw points').replace(/\bbao nhiu\b|\bbn\b/g,'bao nhieu').replace(/\s+/g,' ').trim();
const group=q=>{
 if(/sau khi (?:tam|cat tia|lam)|sau (?:tam|cat tia)|met moi|bieng an|bo an|ue oai|nam li bi|ngu nhieu|lo qua|non |sot |chay mau|vet thuong|gay chan|co giat|bi dau/.test(q))return null;
 if(/(?:nhut nhat|be nhat|stress|so tieng|may say|khong hop tac|hung du|hoang|lan dau (?:di |den )?(?:spa|tam|cat tia|hotel))/.test(q)&&!/\bgia\b|bao nhieu|bang gia|cac goi|goi nao|so sanh|\bkg\b/.test(q))return null;
 const cleaned=q.replace(/\b(?:tam su|tam trang|quan tam|tam thoi|tam biet|yen tam|an tam|luong tam|trung tam)\b/g,' ');
 return /hotel|khach san|luu tru|gui be|qua dem/.test(cleaned)?'hotel':/taxi|dua don|dua ruoc/.test(cleaned)?'taxi':/\btam\b|cat tia|grooming|\bspa\b/.test(cleaned)?'grooming':null;
};
const faq=(question,topic,notice)=>({faq:question,topic,...(notice?{notice}:{})});
const link=(label,path)=>`[${label}](${path})`;
const booking=link('Chọn dịch vụ và thời gian','/booking');
const shop=link('Xem sản phẩm','/shop');
const lookup=link('Tra cứu đơn và lịch guest','/return-guest');
const advice=(kind,extra={})=>({request:{kind,...extra},topic:kind});
function isFollowup(text){const q=fold(text),words=q?q.split(' ').length:0;return q.length<180&&!/ho so|doanh thu|mat khau|tai khoan ngan hang/.test(q)&&((/\bkg\b|\bkm\b|\d+\s*(?:kg|km)/.test(q)&&words<=10)||(words<=6&&/^(?:(?:be|cho|meo|cun|nang|khoang|tam|con|loai|gia|vay|the|dat|mua)(?: |$)|[0-9])/.test(q)));}
function measure(text,unit,max){const m=fold(text).match(new RegExp('(\\d+(?:[.,]\\d+)?)\\s*'+unit+'\\b'));if(!m)return null;const n=Number(m[1].replace(',','.'));return n>0&&n<=max?n:null;}
function petOf(value){const q=fold(value),cat=/\bmeo\b/.test(q)||/\bcat\b/i.test(String(value||'')),dog=/chó|cún/iu.test(value||'')||/\b(?:dog|cun)\b|cho con|cho truong thanh|cho nho|cho lon|cho$/.test(q);return cat===dog?null:cat?'cat':'dog';}
function plan(question,recent=[]){
 const q=fold(question),old=catalog.plan(question);
 const productQuestion=/\bsan pham\b|\bsku\b|\bsua tam\b/.test(q);
 const serviceText=q.replace(/\bsua tam\b/g,'');
 const focused=/\bgia\b|bao nhieu|con hang|het hang|co hang|con size/.test(q)&&!/so sanh|khac nhau|gom gi|bao gom|mo ta/.test(q);
 // Public explanations still go through; concrete private records never become public tools.
 const policy=/can.*diem.*(?:len hang|doi)|dieu kien|chinh sach|quy dinh|huong dan/.test(q);
 if(old?.reply&&/hồ sơ riêng|câu chat này chưa tạo/.test(old.reply)&&!policy)return {...old,topic:'private'};
 if(/mat khau|ma otp|api key|service.role|secret/.test(q)&&!/quen mat khau|(?:khong|chua).*nhan.*(?:otp|ma)/.test(q))return {reply:'Không gửi mật khẩu, OTP hoặc khóa truy cập vào chat. Mình chỉ hỗ trợ thông tin công khai; bạn dùng màn hình xác thực chính thức để xử lý tài khoản.',understood:false,topic:'private'};
 const questions=Array.isArray(recent)?recent.filter(x=>typeof x==='string').slice(0,4):[];
 const mentioned=[/hotel|khach san|luu tru/.test(serviceText),/taxi|dua don|dua ruoc/.test(serviceText),/\btam\b|cat tia|grooming|\bspa\b/.test(serviceText)].filter(Boolean).length;
 if(mentioned>1)return {reply:'Bạn đang nhắc nhiều nhóm dịch vụ. Bạn muốn so sánh nhu cầu giữa tắm/cắt tỉa, Hotel và Taxi, hay xem hai gói cụ thể? Cho mình tên hai lựa chọn để đối chiếu đúng mô tả và giá, không ghép nhầm các gói. '+booking,understood:false,topic:'clarify'};
 let kind=group(serviceText),previous=null;const trail=[];
 if(!kind&&isFollowup(question))for(const text of questions){trail.push(text);const oldQ=fold(text),k=group(oldQ);
  if(/san pham|\bsku\b|sua tam|\bhat\b|thuc an|pate|snack/.test(oldQ)||catalog.plan(text)?.kind==='product'){previous=text;break;}
  if(k){if(/con hang|con size|het hang/.test(q)){trail.length=0;break;}kind=k;previous=text;break;}
  if(!isFollowup(text)){trail.length=0;break;}}
 const w=measure(question,'kg',200)||trail.map(t=>measure(t,'kg',200)).find(Boolean),distance=measure(question,'km',1000)||trail.map(t=>measure(t,'km',1000)).find(Boolean);
 const pet=petOf(question)||trail.map(petOf).find(Boolean);
 if(/dia chi.*khach|so dien thoai.*(?:nhan vien|admin)/.test(q)&&!policy)return {reply:'Mình không cung cấp địa chỉ hoặc số điện thoại cá nhân của khách/nhân viên. Bạn có thể hỏi thông tin liên hệ chung của cửa hàng hoặc chọn Gặp chuyên viên.',understood:false,topic:'private'};
 const storeContact=/dia chi|hotline|so dien thoai cua hang|lien he|mo cua|dong cua|gio lam viec|gio phuc vu|hoat dong.*gio|(?:pawpal|cua hang|tiem) (?:nam )?o dau/.test(q);
 if((storeContact||/^(?:o dau|may gio)[?!.]*$/.test(q))&&!/thoi luong|mat.*gio|bao nhieu phut/.test(q)&&(!kind||/cua hang|mo cua|dong cua|gio lam viec/.test(q)))return advice('store');
 if(!kind&&/mat bao lau|thoi luong|bao nhieu phut/.test(q))return faq('Dịch vụ mất bao lâu?','booking');
 if(/chi nhanh/.test(q))return faq('PawPal có những chi nhánh nào?','store');
 if(/ngay le|\btet\b/.test(q))return kind==='hotel'?faq('Gửi Hotel ngày lễ, Tết có phụ thu không?','hotel'):advice('store');
 if(/(?:khong|chua).*nhan.*(?:otp|ma xac thuc|ma sms|ma dang nhap|ma dang ky)/.test(q))return faq('Tôi không nhận được OTP thì sao?','account');
 if(/(?:khong|chua).*nhan.*ma/.test(q)&&!/ma (?:don|lich|dat|khoi phuc)/.test(q))return {reply:'Bạn chưa nhận mã OTP/xác thực, hay mã đơn/lịch và mã khôi phục? Bạn chỉ cần nói loại mã, không gửi mã bí mật vào chat. Với giao dịch guest, bạn có thể mở '+lookup+'.',understood:false,topic:'clarify'};
 if(/quen mat khau/.test(q))return faq('Tôi quên mật khẩu thì làm sao?','account');
 if(/paw points|tich diem|doi diem|diem thuong|hang thanh vien/.test(q)||(policy&&/diem|hang/.test(q)))return faq('Paw Points là gì?','points',/bao nhieu diem|can.*diem|nguong.*diem/.test(q)?'Hướng dẫn này chưa có bảng ngưỡng điểm hoặc tỷ lệ đổi thưởng cụ thể đã xác nhận. Bạn có thể chọn Gặp chuyên viên để kiểm tra điều kiện công khai, không cần gửi số dư hay hồ sơ cá nhân.':null);
 if(/khuyen mai|voucher|uu dai|ma giam/.test(q))return faq('PawPal có khuyến mãi dịch vụ không?','offers');
 if(/doi tra|tra hang|hang loi/.test(q))return faq('Tôi muốn đổi trả hàng thì làm thế nào?','returns');
 if(/hoan tien/.test(q))return faq('Tôi muốn hoàn tiền thì làm sao?','returns');
 if(/giao hang|phi ship|ship |van chuyen|giao den/.test(q))return faq('Phí giao hàng và phạm vi giao nhận được xác nhận ở đâu?','delivery',/bao lau|may ngay|khi nao/.test(q)?'Hướng dẫn này chưa xác nhận thời gian giao đến địa chỉ của bạn; không mặc định giao trong một số ngày cố định.':null);
 if(/\bhuy\b|doi ngay|doi gio/.test(q))return faq(/don|hang/.test(q)?'Tôi muốn sửa hoặc hủy đơn hàng thì sao?':'Tôi có thể hủy lịch không?','cancel');
 if(/tra cuu|theo doi|xem.*(?:don|lich)|(?:khong|chua).*(?:nhan|thay).*(?:bien nhan|ma (?:don|lich|dat))|mat ma khoi phuc/.test(q))return faq('Tôi xem trạng thái đơn hàng ở đâu?','lookup');
 if((/\b(?:chuan bi|mang theo|di ung|tiem phong)\b|vac.?xin/.test(q)||(/\b(?:nhut nhat|be nhat)\b/.test(q)&&!/may say|stress|lan dau|lam the nao|xu ly/.test(q))))return faq('Tôi cần chuẩn bị gì trước khi đưa bé đến?','prepare','Nếu bé có vấn đề sức khỏe hoặc tập tính cần lưu ý, hãy báo nhân viên trước khi đặt.');
 const multiplePets=/nhieu be|hai be|2 be/.test(q);
 if(/chua.*tai khoan|khong.*tai khoan|khong.*dang nhap|vang lai/.test(q)){
  const buying=/mua|hang|thanh toan/.test(q);
  const route=faq(buying?'Tôi có bắt buộc phải có tài khoản mới được mua hàng không?':'Tôi có được đặt lịch mà chưa có tài khoản không?',buying?'buy':'booking');
  if(!buying&&multiplePets)return {...route,relatedFaq:'Tôi có thể đặt lịch cho nhiều bé không?'};
  return route;
 }
 if(multiplePets)return faq('Tôi có thể đặt lịch cho nhiều bé không?','booking');
 if(/goi chinh|dich vu.*kem|nhieu dich vu/.test(q))return faq('Tôi có thể sử dụng nhiều dịch vụ cho bé cùng lúc không?','booking');
 if(/dat lich|dat phong|dat o dau|cach dat|dat nhu the nao/.test(q)&&!/gia|bao nhieu|so sanh/.test(q))return faq('Đặt lịch PawPal như thế nào?','booking');
 if(/cach mua|mua o dau|mua nhu the nao|thanh toan/.test(q)&&!productQuestion)return faq('Khách vãng lai mua hàng như thế nào?','buy');
 if(/con phong|phong trong|lich trong|khung gio|con lich|gio trong|gio nao|con gio|\bslot\b/.test(q)||(()=>{const rawLower=String(question||'').normalize('NFC').toLowerCase();return /(?<![\p{L}\p{N}_])còn\s+chỗ(?![\p{L}\p{N}_])/u.test(rawLower)||(!/[à-ỹđ]/iu.test(rawLower)&&/\bcon\s+cho\b/u.test(rawLower)&&!/\bcon\s+cho\s+(?:cua|nha|con|nho|lon|toi|minh|em|nay|kia|bi|met|om|dau|ngoan)\b/u.test(q));})()||(kind==='taxi'&&/may gio|gio don|chon gio/.test(q)))return {reply:'Bạn chọn dịch vụ, thông tin bé và ngày/giờ ở bước đặt để xem lựa chọn hiện còn khả dụng. Mình chưa xác nhận phòng hoặc khung giờ trống trong chat; lựa chọn có thể thay đổi trước khi gửi yêu cầu. '+booking,understood:true,topic:'availability'};
 if(/dieu tri|ke thuoc|lieu thuoc|chan doan/.test(q))return {reply:'Mình không chẩn đoán hoặc kê thuốc. Bạn nên trao đổi với bác sĩ thú y; nếu muốn dùng dịch vụ chăm sóc, hãy báo tình trạng sức khỏe và dị ứng của bé để nhân viên kiểm tra việc tiếp nhận. '+booking,understood:true,topic:'safety'};
 let queries=null;
 const product=String(question).match(/(?:sản phẩm|san pham|SKU)\s*:?\s+(.+)/iu);
 if(product){queries=product[1].replace(/[?!.]+$/,'').replace(/\s*(?:,\s*)?(?:\s+(?:còn hàng(?: không)?|con hang(?: khong)?|có hàng không|co hang khong|giá bao nhiêu|gia bao nhieu|bao nhiêu(?: tiền)?|bao nhieu(?: tien)?))+$/iu,'').split(/\s+(?:và|va|với|voi|hay|so với|so voi)\s+/iu).map(x=>x.trim());}
 else if(!kind&&/^so sanh /.test(q)){const m=String(question).match(/(?:so sánh|so sanh)\s+(.+?)\s+(?:và|va|với|voi|hay|so với|so voi)\s+(.+?)[?!.]*$/iu);if(m)queries=[m[1].trim(),m[2].trim()];}
 else if(old?.kind==='product')queries=[old.query];
 else if(previous&&!kind){const p=plan(previous,[]);if(p?.request?.kind==='product')queries=p.request.queries;}
 const family=q.match(/\bhat\b|thuc an|pate|snack|sua tam|do choi|balo|\bao\b/)?.[0];
 if(family&&!queries&&!/dich vu|goi tam/.test(q))queries=[family];
 if(queries){if(queries.length>2||queries.some(x=>x.length<2||x.length>120))return {reply:'Bạn gửi tên hoặc SKU của tối đa hai sản phẩm cần xem/so sánh nhé. '+shop,understood:false,topic:'product'};
  return {...advice('product',{queries,...(pet?{pet}:{})}),focused};}
 if((/san pham|thuc an|hat cho|hat meo|hat cho meo|con hang|con size/.test(q)||(()=>{const rawLower=String(question||'').normalize('NFC').toLowerCase();return /(?<![\p{L}\p{N}_])bán(?![\p{L}\p{N}_]).*(?<![\p{L}\p{N}_])(?:gì|những\s+gì)(?![\p{L}\p{N}_])/iu.test(rawLower)||(!/[à-ỹđ]/iu.test(rawLower)&&/\bban\b.*(?:\bgi\b|nhung gi)/.test(q));})())&&!kind)return {reply:'Bạn cần thức ăn, đồ chăm sóc, đồ chơi hay phụ kiện? Gửi tên/nhu cầu hoặc mã SKU, hoặc viết “So sánh sản phẩm A và B”. Mình có thể đối chiếu mô tả, giá và tình trạng hàng công khai; không tự suy công dụng điều trị. '+shop,understood:false,topic:'product'};
 if(kind){const request={};if(w)request.weight=w;if(distance)request.distance=distance;if(pet)request.pet=pet;
  if(kind==='hotel'){const labels=(q+' '+fold(previous)).match(/standard plus|standard|daycare|cat condo|deluxe|luxury|presidential|small pet|\bvip\b|thuong/g)||[];const terms=[...new Set(labels.map(t=>t==='thuong'?'standard':t))];if(terms.length>2)return {reply:'Bạn chọn tối đa hai tên loại phòng cần đối chiếu trước nhé. '+booking,understood:false,topic:'clarify'};if(terms.length)request.query=terms.join('|');}
  if(kind==='grooming'&&!/so sanh|khac nhau|cac goi/.test(q)){const source=q+' '+fold(previous),cut=/cat tia/.test(source),bath=/\btam\b/.test(source);if(cut&&!bath)request.query='cắt tỉa';else if(bath&&!cut)request.query='tắm';}
  return {...advice(kind,request),focused};
 }
 if((isFollowup(question)&&(/\b(?:kg|km)\b/.test(q)||/^(?:be|cho|meo|cun|gia|bao nhieu|dat o dau|mua o dau|con hang|con size|loai nao)\b/.test(q)))||/\b(?:kg|km)\b/.test(q)||/^(?:bao nhieu|dat o dau)[?!.\s]*$/.test(q))return {reply:'Bạn đang hỏi tắm/cắt tỉa, Hotel, Taxi hay sản phẩm nào? Mình cần biết nhu cầu trước để chọn đúng thông tin; bạn không cần gửi hồ sơ cá nhân. '+booking+' · '+shop,understood:false,topic:'clarify'};
 return old;
}
function faqReply(route,rows){
 const r=rows.find(r=>r.complete===true&&fold(r.question)===fold(route.faq));if(!r)return null;
 let reply=r.answer.trim().replace(/\n?\(Quy định:[\s\S]*?\)\s*$/u,'').trim();
 if(route.notice)reply+=' '+route.notice;
 const destination=['booking','prepare','guest'].includes(route.topic)?booking:['buy','delivery','returns','cancel','lookup'].includes(route.topic)?lookup:route.topic==='store'?link('Thông tin liên hệ','/contact'):null;
 if(route.topic==='buy')reply+=' '+shop;
 if(destination)reply+=' '+destination;
 return {reply:friendly(reply),understood:true};
}
function friendly(value){
 return String(value||'')
  .replace(/(^|[.!?;]\s+)(?:Mình|mình)(?=\s)/gu,'$1PawPal')
  .replace(/cho mình(?=[\s,.!?])/gu,'cho PawPal')
  .replace('Có luồng đặt lịch dành cho khách vãng lai mà không bắt buộc tạo tài khoản thành viên.','Được bạn nhé, bạn có thể đặt lịch cho bé mà không cần tạo tài khoản.')
  .replace('Bạn có thể mua bằng luồng khách vãng lai mà không phải tạo tài khoản thành viên.','Bạn có thể mua hàng mà không cần tạo tài khoản nhé.')
  .replace(/Mỗi yêu cầu đặt lịch hiện chọn một bé\.(?: Nếu có nhiều bé, bạn thực hiện yêu cầu riêng cho từng bé\.)?/gu,'Bạn đặt riêng cho từng bé nhé, vì mỗi yêu cầu hiện chọn một bé.')
  .replace(/FAQ này chưa (?:xác nhận|cung cấp)/gu,'PawPal chưa có thông tin xác nhận')
  .replace(/Hướng dẫn này chưa xác nhận/gu,'PawPal chưa có thông tin xác nhận');
}
const text=(value,max=600)=>typeof value==='string'?value.slice(0,max).trim():'';
function clip(value,max=240){const s=typeof value==='string'?value.trim():'';if(s.length<=max)return s;const cut=s.slice(0,max);const space=cut.lastIndexOf(' ');return (space>max*0.6?cut.slice(0,space):cut).trim().replace(/[.,;:]+$/,'')+'…';}
const num=v=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw Error('invalid_guest_number');return v;};
const money=v=>num(v).toLocaleString('vi-VN',{maximumFractionDigits:2})+' đ';
const span=(a,b,inclusive,unit)=>`${num(a)}${b==null?` ${unit} trở lên`:`–${num(b)} ${unit} (${inclusive?'gồm':'không gồm'} cận trên)`}`;
function format(data,route){
 const kind=route.request.kind;if(!data||data.kind!==kind||!Array.isArray(data.items)||data.items.length>5||typeof data.has_more!=='boolean'||!Number.isFinite(Date.parse(data.as_of))||Buffer.byteLength(JSON.stringify(data))>16384)throw Error('invalid_guest_advice');
 if(kind==='store'){const r=data.items[0]||{};const lines=[];if(text(r.address))lines.push('Địa chỉ: '+text(r.address));if(text(r.phone))lines.push('Hotline: '+text(r.phone));for(const [key,label]of [['weekday','Ngày thường'],['weekend','Cuối tuần']])if(/^\d{2}:\d{2}$/.test(r[key+'_open']||'')&&/^\d{2}:\d{2}$/.test(r[key+'_close']||''))lines.push(label+': '+r[key+'_open']+'–'+r[key+'_close']);if(text(r.holiday_notice))lines.push('Lưu ý ngày lễ: '+text(r.holiday_notice,400));return {reply:(lines.join('\n')||'Mình chưa có đủ thông tin liên hệ đã xác nhận.')+'\nKhả năng nhận lịch cần kiểm tra cho ngày cụ thể. '+link('Liên hệ PawPal','/contact'),understood:lines.length>0};}
 if(!data.items.length)return {reply:'Chưa tìm thấy lựa chọn đang cung cấp khớp yêu cầu. Bạn kiểm tra lại tên/SKU hoặc xem lựa chọn khác; mình chưa xác nhận hết hàng, hết phòng hay ngừng dịch vụ. '+(kind==='product'?shop:booking),understood:false};
 const lines=data.items.map(r=>{if(!text(r.name))throw Error('invalid_guest_item');let line='• '+text(r.name,180);
  if(kind==='product'){if(!text(r.code)||typeof r.available!=='boolean'||!/^[0-9a-f-]{36}$/i.test(r.product_id))throw Error('invalid_guest_product');line+=' — '+text(r.variant||r.code,150)+' ('+text(r.code,120)+'): '+money(r.price)+'. '+(r.available?'Còn hàng':'Tạm hết hàng')+' tại lúc kiểm tra. ';if(text(r.target_pet))line+='Đối tượng theo mô tả: '+text(r.target_pet,100)+'. ';line+=link('Xem sản phẩm','/product-detail?id='+r.product_id);}
  else if(kind==='grooming'){line+=' — '+span(r.weight_from,r.weight_to,r.weight_to_inclusive,'kg')+': '+money(r.price)+'.';if(Number.isSafeInteger(r.duration)&&r.duration>0)line+=' Thời lượng dự kiến '+r.duration+' phút.';}
  else if(kind==='hotel'){if(!Number.isSafeInteger(r.billing_minutes)||r.billing_minutes<=0)throw Error('invalid_hotel_unit');line+=': '+money(r.price)+'/'+(r.billing_minutes===1440?'24 giờ':r.billing_minutes+' phút')+'.';if(r.capacity!=null)line+=' Sức chứa theo danh mục: '+num(r.capacity)+'.';}
  else{line+=' — '+span(r.distance_from,r.distance_to,r.distance_to_inclusive,'km')+', '+span(r.weight_from,r.weight_to,r.weight_to_inclusive,'kg')+': giá cơ bản '+money(r.price)+', phụ phí hiện công bố '+money(r.surcharge)+'.';}
  for(const field of route.focused?['condition']:['description','features','condition'])if(text(r[field])){const part=clip(r[field],240);line+=(/[.!?…;)]$/.test(line)?' ':'. ')+part;}
  if(kind!=='product'&&/^[0-9a-f-]{36}$/i.test(r.service_id))line+=' '+link('Chọn gói này','/booking?service='+r.service_id);
  return line;
 });
 let follow=kind==='product'?'Bạn bấm vào từng sản phẩm để xem chi tiết, hoặc gửi tên/mã SKU nếu muốn PawPal đối chiếu hai món với nhau nhé (tình trạng hàng được kiểm tra lại tại bước mua).':kind==='grooming'?(route.request.weight?'Các mức trên đã lọc theo cân nặng của bé. Bạn chọn gói phù hợp để xem điều kiện nhận loài và đặt lịch nhé (giá hiện hành, chưa gồm phụ phí phát sinh nếu có).':(route.request.pet?'Bé nặng bao nhiêu kg, cần tắm hay cắt tỉa?':'Bé là chó hay mèo, nặng bao nhiêu kg, cần tắm hay cắt tỉa?')+' Mình sẽ lọc mức phù hợp.'):kind==='hotel'?'Bạn chọn ngày/giờ gửi và đón bé ở bước đặt để xem báo giá theo lịch và phòng còn trống nhé (giá theo mô tả công bố, chưa phải xác nhận phòng trống hay phụ phí phát sinh).':(route.request.weight&&route.request.distance?'Các mức trên đã lọc theo cân nặng và quãng đường bạn gửi. ':'Bạn cho biết '+(!route.request.weight?'cân nặng của bé':'')+(!route.request.weight&&!route.request.distance?' và ':'')+(!route.request.distance?'khoảng cách km dự kiến':'')+'. ')+'Chọn một chiều hoặc khứ hồi và khung giờ đón ở bước đặt để xác nhận chuyến và tổng cước nhé.';
 if(kind!=='product')follow+=' '+booking;
 if(kind==='hotel'&&route.request.query?.includes('vip')&&!data.items.some(r=>/\bvip\b/.test(fold(r.name))))follow+=' Chưa có mục tên VIP khớp trong kết quả; không tự coi Luxury hoặc Deluxe là VIP để so sánh.';
 const intro=kind==='product'?'PawPal tìm được những lựa chọn này, bạn xem thử nhé:':kind==='hotel'?'PawPal gửi bạn các lựa chọn lưu trú cho bé nhé:':kind==='taxi'?'PawPal gửi bạn các lựa chọn đưa đón để tham khảo nhé:':route.request.weight?`Mức giá gói chăm sóc cho bé ${route.request.weight} kg:`:'PawPal gửi bạn một số gói chăm sóc để tham khảo nhé:';
 return {reply:friendly(intro+'\n\n'+lines.join('\n\n')+'\n\n'+follow+(data.has_more?'\nBạn cho PawPal tên gói hoặc sản phẩm cụ thể để tìm sát nhu cầu hơn nhé.':'')),understood:true};
}
module.exports={plan,isFollowup,faqReply,format,fold,friendly};
