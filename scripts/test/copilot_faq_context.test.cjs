const {test}=require('node:test');
const assert=require('node:assert/strict');
const {plan,formatFacts}=require('../api/admin_copilot.js');
test('service availability question uses FAQ and retains the actual question',()=>{
    for(const question of ['PawPal có dịch vụ tiêm phòng không?','Có dịch vụ khám thú cưng không?']){
        const route=plan(question);
        assert.equal(route.intent,'knowledge.search');assert.equal(route.filters.query,question);
    }
    assert.equal(plan('Danh sách dịch vụ').intent,'catalog.service');
    assert.equal(plan('Lịch Spa hôm nay').intent,'appointment.list');
});
test('FAQ response follows the latest retrieved answer and keeps its readable paragraphs',()=>{
    const question='PawPal có dịch vụ tiêm phòng không?';
    const make=answer=>({intent:'knowledge.search',total:1,items:[{question,answer}]});
    const first=formatFacts(make('Nội dung trước cập nhật.'));
    const latest=formatFacts(make('Thông tin mới từ FAQ.\n\nVui lòng liên hệ cửa hàng để được hướng dẫn.'));
    assert.match(first,/Nội dung trước cập nhật/);
    assert.match(latest,/Thông tin mới từ FAQ\.\n\nVui lòng/);
    assert.match(latest,/Nguồn FAQ/);assert.doesNotMatch(latest,/Nội dung trước cập nhật|Dịch vụ:|24 kết quả/);
});
test('missing FAQ does not claim service availability',()=>{
    const answer=formatFacts({intent:'knowledge.search',total:0,items:[]});
    assert.match(answer,/Chưa tìm thấy FAQ/);assert.doesNotMatch(answer,/có dịch vụ tiêm phòng/);
});
