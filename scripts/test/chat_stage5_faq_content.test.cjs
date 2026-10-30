const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const changes=JSON.parse(fs.readFileSync('docs/chatbot/stage5-faq-review-2026-10-30/reviewed-changes.txt','utf8'));
const answer=q=>changes.find(r=>r.question===q).answer;
test('guest buying and booking guidance does not reintroduce mandatory member accounts',()=>{
 assert.match(answer('Tôi có được đặt lịch mà chưa có tài khoản không?'),/không bắt buộc tạo tài khoản/);
 assert.match(answer('Tôi có bắt buộc phải có tài khoản mới được mua hàng không?'),/không phải tạo tài khoản/);
 assert.match(answer('Tôi có bắt buộc phải có tài khoản mới được mua hàng không?'),/không đồng nghĩa đã thanh toán/);
});
test('booking guidance distinguishes one pet, primary package and configured add-ons',()=>{
 assert.match(answer('Tôi có thể đặt lịch cho nhiều bé không?'),/một bé/);
 assert.match(answer('Tôi có thể sử dụng nhiều dịch vụ cho bé cùng lúc không?'),/một gói chính và các phần thêm/);
 assert.doesNotMatch(answer('Tôi có thể sử dụng nhiều dịch vụ cho bé cùng lúc không?'),/Mỗi lịch hẹn chỉ gắn với một dịch vụ/);
});
test('OTP and order lookup guidance do not promise delivery or weak ownership verification',()=>{
 assert.match(answer('Tôi không nhận được OTP thì sao?'),/không xác nhận SMS đã được gửi/);
 assert.match(answer('Tôi xem trạng thái đơn hàng ở đâu?'),/Chỉ biết mã đơn hay số điện thoại không tự tạo quyền/);
});
test('unconfirmed public business terms explicitly stay unconfirmed; known QA item is disabled',()=>{
 for(const q of ['PawPal có những chi nhánh nào?','PawPal có mở cửa cuối tuần hoặc ngày lễ không?','Tôi muốn đổi trả hàng thì làm thế nào?'])assert.match(answer(q),/chưa/);
 assert.equal(changes.find(r=>r.question==='QA kiểm thử lưu FAQ 2026-10-15').disable,true);
 assert.equal(new Set(changes.map(c=>c.question)).size,changes.length);
});
