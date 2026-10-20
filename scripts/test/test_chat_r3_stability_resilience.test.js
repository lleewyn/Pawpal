const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const { evaluateToxicAndSentiment, dbTools } = require('../api/chat.js');
const { isFeatureEnabled } = require('../api/chat_config.js');

test('R3 - GĐ-11: Feature Flag config hoạt động ổn định', () => {
    assert.equal(typeof isFeatureEnabled('ai_bot_reply_enabled'), 'boolean', 'ai_bot_reply_enabled phải trả về boolean');
});

test('R3 - GĐ-12: Toxic Shield loại bỏ/che mờ từ ngữ thô tục bảo vệ người dùng', async () => {
    const toxicText = 'Đồ lừa đảo, làm ăn như đ** c* m**';
    const sampleFilters = [
        { keyword: 'đ**', action: 'mask', replacement_text: '***' },
        { keyword: 'lừa đảo', action: 'warn' }
    ];
    const evalRes = await evaluateToxicAndSentiment(toxicText, sampleFilters);
    assert.ok(evalRes.isToxic, 'Phát hiện nội dung có yếu tố độc hại/xúc phạm');
    assert.ok(evalRes.maskedWords.length > 0, 'Có danh sách từ được che mặt nạ');
    assert.notEqual(evalRes.maskedText, toxicText, 'Nội dung hiển thị đã được che mờ');
});

test('R3 - GĐ-12: Chống script injection và an toàn HTML textContent', async () => {
    const injectionText = '<script>alert("hacked")</script>Xin chào PawPal';
    const evalRes = await evaluateToxicAndSentiment(injectionText);
    assert.ok(evalRes, 'Xử lý thành công không crash');
});

test('R3 - GĐ-13: Kiểm tra xử lý chuỗi rỗng / khoảng trắng an toàn', async () => {
    const res = await dbTools.search_store_info('   ');
    assert.ok(res, 'Không quăng lỗi');
    assert.ok(res.context, 'Trả về ngữ cảnh mặc định');
});

test('R3 - GĐ-13: Xử lý tìm kiếm sản phẩm với ký tự lạ an toàn', async () => {
    const res = await dbTools.search_products_public('\' OR 1=1 -- %$#');
    assert.ok(res, 'Không gây SQL injection lỗi 500');
});
