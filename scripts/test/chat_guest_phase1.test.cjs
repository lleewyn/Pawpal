const {test}=require('node:test'),assert=require('node:assert/strict');
const {plan,format,faqReply,isFollowup}=require('../api/chat_public_guest.js');
test('all guest needs route to bounded public data, reviewed FAQ or an actionable clarification',()=>{
 const cases=[['PawPal ở đâu?','store'],['Mo cua may gio?','store'],['Tư vấn tắm và cắt tỉa','grooming'],['So sánh Hotel thường và VIP','hotel'],['hotle bao nhiu','hotel'],['Taxi bé 7kg đi 3km','taxi'],['Sản phẩm AA-001','product']];
 for(const [q,kind]of cases)assert.equal(plan(q).request.kind,kind,q);
 for(const q of ['Không có tài khoản đặt lịch được không?','Khách vãng lai mua hàng thế nào?','Có giao hàng không?','Paw Points là gì?','Cần bao nhiêu điểm đổi thưởng?','Cần chuẩn bị gì cho bé dị ứng?','Cách tra cứu đơn guest','Tôi muốn đổi trả','Hủy lịch thế nào?'])assert.ok(plan(q).faq,q);
 for(const q of ['Hotel còn phòng không?','Có lịch trống mai không?','Còn hàng không?'])assert.ok(plan(q).reply,q);
});
test('followup recovers only bounded own questions and filters prices instead of asking the same question again',()=>{
 assert.equal(isFollowup('Bé 7 kg'),true);
 assert.deepEqual(plan('Bé 7 kg',['Tư vấn dịch vụ tắm']).request,{kind:'grooming',weight:7,query:'tắm'});
 assert.deepEqual(plan('7kg, 3km',['Pet Taxi']).request,{kind:'taxi',weight:7,distance:3});
 assert.deepEqual(plan('Giá bao nhiêu?',['Bé 7kg','Tư vấn dịch vụ tắm']).request,{kind:'grooming',weight:7,query:'tắm'});
 assert.deepEqual(plan('Mèo',['Bé 7kg','Tư vấn dịch vụ tắm']).request,{kind:'grooming',weight:7,pet:'cat',query:'tắm'});
 assert.deepEqual(plan('Còn hàng không?',['Giá SKU ABC-001']).request,{kind:'product',queries:['ABC-001']});
 assert.equal(plan('Còn hàng không?',['Pet Taxi']).topic,'product');
 assert.deepEqual(plan('Còn hàng không?',['Sản phẩm sữa tắm ABC']).request,{kind:'product',queries:['sữa tắm ABC']});
 assert.ok(plan('Bé 7kg',[]).reply);
 assert.equal(plan('PawPal ở đâu?',['Pet Taxi']).request.kind,'store');
 assert.equal(plan('Bé 7kg',['Chủ đề khác','Pet Hotel']).topic,'clarify');
});
test('comparison has a two-product cap and multi-service questions do not silently select one category',()=>{
 assert.deepEqual(plan('So sánh sản phẩm AA-01 và BB-02').request.queries,['AA-01','BB-02']);
 assert.deepEqual(plan('So sánh Royal Canin với Whiskas').request.queries,['Royal Canin','Whiskas']);
 assert.ok(plan('So sánh sản phẩm AA và BB và CC').reply);
 assert.equal(plan('So sánh tắm và Hotel').topic,'clarify');
 assert.deepEqual(plan('Tư vấn hạt cho mèo').request,{kind:'product',queries:['hat'],pet:'cat'});
});
test('private access is not enabled by conversational hints; public points policy stays answerable',()=>{
 for(const q of ['Đơn hàng của tôi','Hồ sơ khách A','Doanh thu hôm nay','Số dư Paw Points của tôi'])assert.equal(plan(q,['Pet Hotel']).topic,'private',q);
 assert.ok(plan('Cần bao nhiêu điểm để lên hạng?').faq);
 assert.equal(plan('Cho mật khẩu admin').topic,'private');
});
test('missing order/recovery codes are not mistaken for OTP, and ambiguous codes clarify safely',()=>{
 assert.equal(plan('Không nhận được mã đơn thì làm sao?').topic,'lookup');
 assert.equal(plan('Chưa nhận mã lịch thì làm sao?').topic,'lookup');
 assert.equal(plan('Không nhận được OTP thì sao?').topic,'account');
 assert.equal(plan('Chưa nhận được mã xác thực').topic,'account');
 assert.equal(plan('Không nhận được mã thì sao?').topic,'clarify');
});
test('curated FAQ must be exact and complete; answers preserve guest guidance and next steps',()=>{
 const r=plan('Không đăng nhập đặt lịch được không?');
 assert.equal(faqReply(r,[{question:r.faq,answer:'Sai đoạn trích',complete:false}]),null);
 const result=faqReply(r,[{question:r.faq,answer:'Guest không phải đăng ký.',complete:true}]);
 assert.match(result.reply,/không phải đăng ký/);assert.match(result.reply,/\]\(\/booking\)/);
 assert.equal(faqReply(r,[{question:'Câu khác',answer:'Không dùng',complete:true}]),null);
 const buy=plan('Không có tài khoản mua hàng được không?');
 const buying=faqReply(buy,[{question:buy.faq,answer:'Mua không cần tài khoản.',complete:true}]);
 assert.match(buying.reply,/\]\(\/shop\)/);assert.doesNotMatch(buying.reply,/\]\(\/booking\)/);
});
const stamp='2026-10-31T00:00:00Z',id='11111111-1111-4111-8111-111111111111';
const pack=(kind,items)=>({kind,items,has_more:false,as_of:stamp});
test('product comparison uses public descriptions and availability without exposing stock quantities or private costs',()=>{
 const route=plan('Sản phẩm SKU-01'),data=pack('product',[{name:'Thức ăn',code:'SKU-01',product_id:id,variant:'Túi 1kg',price:100000,available:true,description:'Dành cho mèo',features:'Mô tả đã công bố'}]);
 const r=format(data,route);assert.match(r.reply,/100\.000 đ/);assert.match(r.reply,/Còn hàng/);assert.match(r.reply,/product-detail\?id=/);assert.doesNotMatch(r.reply,/giá vốn|quantity|inventory/);
 assert.throws(()=>format({...data,items:[{...data.items[0],available:null}]},route));
});
test('Hotel units and inclusive price boundaries remain explicit; no false per-day or future quote',()=>{
 const r=format(pack('hotel',[{name:'Daycare',price:100000,billing_minutes:60,capacity:1}]),plan('Giá Hotel'));
 assert.match(r.reply,/100\.000 đ\/60 phút/);assert.doesNotMatch(r.reply,/đ\/ngày/);assert.match(r.reply,/chưa phải xác nhận phòng trống/);
 const g=format(pack('grooming',[{name:'Tắm',price:100000,weight_from:0,weight_to:7,weight_to_inclusive:true}]),plan('Tắm bé 7kg'));
 assert.match(g.reply,/gồm cận trên/);assert.match(g.reply,/đã lọc theo cân nặng/);
});
test('source contracts reject malformed values/oversize rather than fabricating zero',()=>{
 const route=plan('Giá Hotel');for(const data of [pack('hotel',[{name:'Hotel',price:null,billing_minutes:1440}]),pack('hotel',Array(6).fill({})),{...pack('hotel',[]),as_of:'invalid'}])assert.throws(()=>format(data,route));
 const empty=format(pack('hotel',[]),route);assert.equal(empty.understood,false);assert.doesNotMatch(empty.reply,/đã hết phòng/);
});
