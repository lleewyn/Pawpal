const {test}=require('node:test');
const assert=require('node:assert/strict');
const {plan,formatFacts}=require('../../my-server/scripts/api/admin_copilot.js');
test('inventory questions mentioning configuration keep the inventory context',()=>{
    for(const question of [
        'Kiểm tra tồn kho theo ngưỡng tối thiểu đã cấu hình, nêu rõ phạm vi dữ liệu được xem',
        'Liệt kê sản phẩm sắp hết hàng theo tồn kho tối thiểu',
        'Sản phẩm sắp hết hàng',
        'Sản phẩm nào tồn kho dưới ngưỡng đã cấu hình?'
    ]) assert.equal(plan(question).intent,'inventory.low_stock',question);
    assert.equal(plan('Cấu hình kinh doanh của cửa hàng').intent,'settings.read');
});
test('inventory answer states actual stock and threshold without business settings',()=>{
    const answer=formatFacts({intent:'inventory.low_stock',total:1,items:[{name:'Hạt cho mèo',sku:'CAT-01',stock:2,minimum:5}],scope:{},as_of:new Date().toISOString()});
    assert.match(answer,/Hạt cho mèo/);assert.match(answer,/tồn 2, tối thiểu 5/);
    assert.doesNotMatch(answer,/Địa chỉ|Giờ mở cửa|Cấu hình kinh doanh/);
});
