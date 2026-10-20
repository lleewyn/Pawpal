const test = require('node:test');
const assert = require('node:assert/strict');
require('dotenv').config();
const { dbTools, toolsDeclaration } = require('../api/chat.js');

test('R2 - GĐ-10: get_loyalty_summary_own từ chối khi không có userId', async () => {
    const res = await dbTools.get_loyalty_summary_own(null);
    assert.ok(res.error, 'Từ chối khách vãng lai xem điểm tích lũy');
    assert.ok(res.error.includes('đăng nhập'));
});

test('R2 - GĐ-10: get_loyalty_summary_own tra cứu thành công cho khách hàng thành viên', async () => {
    // ID khách hàng mẫu trong seed database (Lê Lệ Quyên hoặc khách mẫu)
    const testCustomerId = 'd0000000-0000-0000-0000-000000000006';
    const res = await dbTools.get_loyalty_summary_own(testCustomerId);
    assert.ok(res, 'Phải có kết quả trả về');
    assert.equal(typeof res.points, 'number', 'points phải là số');
    assert.ok(res.tier, 'Có thông tin hạng thành viên');
    assert.ok(res.discount, 'Có tỷ lệ giảm giá');
});

test('R2 - GĐ-09: get_user_tickets từ chối khi không có userId', async () => {
    const res = await dbTools.get_user_tickets(null);
    assert.ok(res.error, 'Từ chối khách vãng lai xem phiếu hỗ trợ');
    assert.ok(res.error.includes('đăng nhập'));
});

test('R2 - GĐ-09: get_user_tickets tra cứu danh sách ticket của khách hàng', async () => {
    const testCustomerId = 'd0000000-0000-0000-0000-000000000006';
    const res = await dbTools.get_user_tickets(testCustomerId);
    assert.ok(res, 'Phải có kết quả trả về');
    if (res.tickets) {
        assert.ok(Array.isArray(res.tickets));
        if (res.tickets.length > 0) {
            const first = res.tickets[0];
            assert.ok(first.code, 'Ticket có mã code');
            assert.ok(first.status, 'Ticket có trạng thái');
        }
    } else {
        assert.ok(res.message, 'Có thông báo phản hồi thân thiện khi chưa có phiếu');
    }
});

test('R2 - GĐ-08/GĐ-09: toolsDeclaration đã đăng ký đầy đủ công cụ R2', () => {
    const declarations = toolsDeclaration[0].functionDeclarations;
    const names = declarations.map(d => d.name);
    assert.ok(names.includes('get_loyalty_summary_own'), 'Đã đăng ký get_loyalty_summary_own');
    assert.ok(names.includes('get_user_tickets'), 'Đã đăng ký get_user_tickets');
});
