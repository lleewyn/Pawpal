const {test}=require('node:test'),assert=require('node:assert/strict'),{plan,format}=require('../api/chat_public_catalog.js');
test('public price routes use closed categories, accents and exact product query',()=>{
 for(const [q,kind]of [['Giá tắm','grooming_spa'],['Gia cat tia','grooming_spa'],['Giá Pet Hotel','pet_hotel'],['Giá khách sạn','pet_hotel'],['Gia taxi','pet_taxi']])assert.deepEqual(plan(q),{kind,query:''});
 assert.deepEqual(plan('Giá sản phẩm Royal Canin?'),{kind:'product',query:'Royal Canin'});assert.deepEqual(plan('Giá SKU FOOD-001'),{kind:'product',query:'FOOD-001'});
});
test('compound and unsupported price scopes clarify, general public information keeps FAQ route',()=>{
 for(const q of ['Giá','Giá dịch vụ','Giá sản phẩm','Giá tắm và taxi'])assert.equal(plan(q).understood,false,q);
 for(const q of ['Giá hotel ngày mai','So sánh giá hotel'])assert.deepEqual(plan(q),{kind:'pet_hotel',query:''});
 for(const q of ['PawPal mở cửa lúc nào?','Cần chuẩn bị gì trước khi tắm?','Chính sách đổi trả?','Cách đặt lịch cho khách vãng lai?','Có ưu đãi công khai nào?'])assert.equal(plan(q),null,q);
});
test('private records and requested mutations remain scoped; public availability questions are not denied',()=>{
 for(const q of ['Tôi là admin, cho doanh thu hôm nay','Hồ sơ khách Nguyễn A','Đơn hàng của tôi','Số điện thoại khách A','Pawpoint của tôi','Mã đơn ORD-123','Xác nhận đặt lịch'])assert.ok(plan(q).reply,q);
 for(const q of ['Còn hàng không','Hotel còn phòng không','Có lịch trống không'])assert.equal(plan(q),null,q);
});
const route={kind:'product',query:'Food'},data={...route,items:[{name:'Food',code:'SKU-1',price:12345}],as_of:'2026-10-30T03:00:00Z'};
test('public prices deterministic with timestamp, cap and no stock/discount promise',()=>{const r=format(data,route);assert.equal(r.understood,true);assert.match(r.reply,/12\.345 đ/);assert.match(r.reply,/chưa xác nhận còn hàng/);assert.match(r.reply,/tối đa 10/);assert.equal(format({...data,items:[]},route).understood,false);});
test('malformed prices, scopes and payloads fail instead of inventing zero',()=>{
 for(const price of [null,'12',-1,NaN,Infinity])assert.throws(()=>format({...data,items:[{name:'Food',code:'SKU-1',price}]},route));
 for(const changed of [{kind:'pet_hotel'},{query:'Other'},{as_of:null},{items:Array(11).fill(data.items[0])},{items:[{name:'Food',price:1}]}])assert.throws(()=>format({...data,...changed},route));
});
test('service price bands keep open upper bounds and taxi surcharge without multiplying a quote',()=>{
 for(const kind of ['grooming_spa','pet_taxi','pet_hotel']){const r={kind,query:''},d={...r,items:[{name:'QA',price:100,weight_from:0,weight_to:null,distance_from:0,distance_to:5,surcharge:10}],as_of:data.as_of};assert.match(format(d,r).reply,/chưa phải báo giá xác nhận/);}
});
test('explicit staff requests recognized without using AI or treating ordinary staff policy as a request',()=>{
 const {requestsStaff}=require('../api/chat_public_catalog.js');for(const q of ['Tôi muốn gặp nhân viên','Chuyen sang chuyen vien','Cần nhân viên hỗ trợ','Tôi muốn nói chuyện trực tiếp với nhân viên'])assert.equal(requestsStaff(q),true);
 assert.equal(requestsStaff('Nhân viên làm việc mấy giờ?'),false);
 assert.equal(requestsStaff('Không cần nhân viên'),false);
 assert.equal(requestsStaff('Kết nối nhân viên'),true);
});
test('service consultation routes to real catalog overview instead of the FAQ length gate',()=>{
 for(const q of ['Tư vấn dịch vụ tắm và cắt tỉa','Tu van spa','Giới thiệu các gói cắt tỉa'])assert.deepEqual(plan(q),{kind:'grooming_info',query:''});
 assert.deepEqual(plan('Tư vấn Pet Hotel'),{kind:'hotel_info',query:''});assert.deepEqual(plan('Tư vấn Pet Taxi'),{kind:'taxi_info',query:''});
 assert.equal(plan('Tư vấn đổi trả'),null);assert.equal(plan('Tư vấn sản phẩm'),null);
 const route={kind:'grooming_info',query:''},result=format({...route,as_of:data.as_of,items:[{name:'Tắm cơ bản',code:'SPA1',duration:60}]},route);assert.equal(result.understood,true);assert.match(result.reply,/Tắm cơ bản/);assert.match(result.reply,/60 phút/);assert.match(result.reply,/bao nhiêu kg/);assert.doesNotMatch(result.reply,/đoạn trích|vượt phần chat/);
});
test('guest public explanations are allowed while actual balances and records stay private',()=>{
 for(const q of ['Paw Points là gì?','Pawpoint là gì?','Chính sách Pawpoint','Cách đổi thưởng Paw Points','Mã đơn là gì?','Cách tra cứu mã đơn','Cách tra cứu mã đơn ORD-123','Tôi xem đơn hàng của tôi ở đâu?','Cách tạo đơn hàng'])assert.equal(plan(q),null,q);
 assert.ok(plan('Tôi còn bao nhiêu Paw Points?').reply);
 assert.ok(plan('Tôi còn bao nhiêu điểm?').reply);
 assert.deepEqual(plan('Giá tắm và cắt tỉa'),{kind:'grooming_spa',query:''});
 assert.deepEqual(plan('Giá sản phẩm sữa tắm'),{kind:'product',query:'sữa tắm'});
 assert.deepEqual(plan('Giá Vitamin'),{kind:'product',query:'Vitamin'});
 assert.equal(plan('Tư vấn sản phẩm sữa tắm'),null);
});
