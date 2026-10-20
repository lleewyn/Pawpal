const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { 
    handleChatSession, 
    handleGetConversations, 
    handleGetConversationMessages, 
    handleHandover, 
    handleBackToAi, 
    handleCsat,
    dbTools,
    toolsDeclaration
} = require('../api/chat.js');
const { getJwtSigningSecret } = require('../api/staff_auth.js');

test('R5 - Endpoint /api/chat/session: Cấp phát signed session token cho khách vãng lai', async () => {
    let statusCode = null;
    let jsonResult = null;
    const req = { headers: {} };
    const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonResult = data; return res; }
    };

    await handleChatSession(req, res);
    assert.equal(statusCode, 200);
    assert.equal(jsonResult.ok, true);
    assert.equal(jsonResult.isGuest, true);
    assert.ok(jsonResult.sessionToken, 'Phải có sessionToken');

    // Xác thực chữ ký token bằng server signing secret
    const decoded = jwt.verify(jsonResult.sessionToken, getJwtSigningSecret());
    assert.equal(decoded.role, 'guest');
    assert.ok(decoded.sessionId, 'Phải chứa sessionId an toàn');
});

test('R5 - Database Tools: get_service_availability trả về khung giờ và chính sách dịch vụ', async () => {
    const avail = await dbTools.get_service_availability({ service_name: 'Pet Spa' });
    assert.ok(avail.operating_hours.includes('08:00 - 20:00'));
    assert.ok(avail.booking_link === '#booking');
    assert.ok(avail.policy.includes('2 giờ'));
});

test('R5 - Database Tools: check_product_stock kiểm tra tồn kho sản phẩm', async () => {
    const emptyCheck = await dbTools.check_product_stock({ product_name: '' });
    assert.ok(emptyCheck.message.includes('Vui lòng cung cấp tên sản phẩm'));

    const stockCheck = await dbTools.check_product_stock({ product_name: 'Pate' });
    assert.ok(stockCheck.products || stockCheck.message, 'Phải trả về danh sách sản phẩm hoặc thông báo không tìm thấy');
});

test('R5 - Database Tools: create_customer_support_ticket từ chối khi không có userId', async () => {
    const errResult = await dbTools.create_customer_support_ticket(null, { title: 'Test', content: 'Nội dung' });
    assert.ok(errResult.error.includes('Yêu cầu đăng nhập'));
});

test('R5 - Endpoint /api/chat/conversations: Từ chối khi không có token hay session', async () => {
    let statusCode = null;
    let jsonResult = null;
    const req = { headers: {}, query: {} };
    const res = {
        status: (code) => { statusCode = code; return res; },
        json: (data) => { jsonResult = data; return res; }
    };

    await handleGetConversations(req, res);
    assert.equal(statusCode, 401);
    assert.equal(jsonResult.ok, false);
});

test('R5 - Endpoint /api/chat/handover & /api/chat/csat: Kiểm tra thiếu tham số bắt buộc', async () => {
    let statusCodeHandover = null;
    let jsonHandover = null;
    const resHandover = {
        status: (code) => { statusCodeHandover = code; return resHandover; },
        json: (data) => { jsonHandover = data; return resHandover; }
    };
    await handleHandover({ headers: {}, body: {} }, resHandover);
    assert.equal(statusCodeHandover, 400);
    assert.ok(jsonHandover.error.includes('Thiếu conversationId'));

    let statusCodeCsat = null;
    let jsonCsat = null;
    const resCsat = {
        status: (code) => { statusCodeCsat = code; return resCsat; },
        json: (data) => { jsonCsat = data; return resCsat; }
    };
    await handleCsat({ headers: {}, body: {} }, resCsat);
    assert.equal(statusCodeCsat, 400);
    assert.ok(jsonCsat.error.includes('Thiếu conversationId'));
});

test('R5 - toolsDeclaration: Đăng ký đầy đủ 12 công cụ Chatbot V2', () => {
    const decls = toolsDeclaration[0].functionDeclarations;
    const names = decls.map(d => d.name);
    assert.ok(names.includes('get_user_orders'));
    assert.ok(names.includes('get_user_bookings'));
    assert.ok(names.includes('get_services_price'));
    assert.ok(names.includes('search_products_public'));
    assert.ok(names.includes('get_public_vouchers'));
    assert.ok(names.includes('get_loyalty_summary_own'));
    assert.ok(names.includes('get_user_tickets'));
    assert.ok(names.includes('get_pet_profile'));
    assert.ok(names.includes('search_store_info'));
    assert.ok(names.includes('create_customer_support_ticket'));
    assert.ok(names.includes('get_service_availability'));
    assert.ok(names.includes('check_product_stock'));
    assert.equal(decls.length, 12, 'Phải có đúng 12 công cụ');
});
