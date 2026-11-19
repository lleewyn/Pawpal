const {test}=require('node:test');
const assert=require('node:assert/strict');
const {plan}=require('../api/admin_copilot.js');
test('financial forecasts never silently become today cashflow queries',()=>{
    for(const question of ['trong 5 năm có thể đạt doanh thu 7 tỷ không?','Dự báo doanh thu năm sau','Mục tiêu doanh số 7 tỷ có thể đạt không?','Lợi nhuận năm tới sẽ đạt bao nhiêu?']){
        const result=plan(question);assert.equal(result.intent,'clarify',question);
        assert.match(result.answer,/Chưa đủ cơ sở/);assert.match(result.answer,/dự báo/);
    }
});
test('unsupported year-long history does not silently use today',()=>{
    assert.equal(plan('Thực thu trong 5 năm qua').intent,'clarify');
    assert.equal(plan('Doanh thu cả năm').intent,'clarify');
});
test('supported historical cashflow and comparisons still use real data routes',()=>{
    assert.equal(plan('Thực thu hôm nay').intent,'revenue.summary');
    assert.equal(plan('Thực thu tuần này so tuần trước').intent,'revenue.compare');
});
