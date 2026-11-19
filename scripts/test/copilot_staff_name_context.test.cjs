const {test}=require('node:test');
const assert=require('node:assert/strict');
const {plan,formatFacts}=require('../api/admin_copilot.js');
test('natural staff-existence questions preserve the requested name',()=>{
    for(const [question,name] of [
        ['công ty có ai tên Thi không?','Thi'],
        ['Cửa hàng có ai tên Nguyễn Thị Thi không?','Nguyễn Thị Thi'],
        ['cong ty co ai ten Thi khong?','Thi'],
        ['Có nhân viên tên Thi không?','Thi'],
        ['Tìm nhân viên tên An','An']
    ]){
        const route=plan(question);assert.equal(route.intent,'staff.lookup',question);assert.equal(route.filters.query,name);
    }
});
test('empty staff search reports no matching data rather than unrelated FAQs',()=>{
    const reply=formatFacts({intent:'staff.lookup',total:0,items:[],scope:{query:'Thi'}});
    assert.match(reply,/Không tìm thấy nhân viên phù hợp/);
    assert.match(reply,/phạm vi dữ liệu được phép xem/);
    assert.doesNotMatch(reply,/Thanh toán|OTP|FAQ|45/);
});
