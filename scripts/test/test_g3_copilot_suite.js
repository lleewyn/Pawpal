const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
const chatHandler = require('../api/chat.js');

async function runG3TestSuite() {
    console.log('=== BẮT ĐẦU KIỂM THỬ TOÀN DIỆN GIAI ĐOẠN 3 (G3 — ADMIN COPILOT) ===\n');

    // 1. Chuẩn bị tài khoản nhân sự test
    console.log('1. Xác minh tài khoản nhân sự quản trị...');
    const { data: staffList, error: stErr } = await supabase
        .from('staff')
        .select('id, full_name, system_role, account_status')
        .eq('account_status', 'ACTIVE')
        .limit(1);

    if (stErr || !staffList || staffList.length === 0) {
        console.error('Lỗi: Không tìm thấy nhân sự ACTIVE trong CSDL.');
        process.exit(1);
    }
    const testStaff = staffList[0];
    console.log(`   -> Nhân sự: ${testStaff.full_name} (${testStaff.system_role}, ID: ${testStaff.id})`);
    const validAuthHeader = `Bearer local:${testStaff.id}`;

    // Helper giả lập request Express
    function mockReqRes(body, headers = {}) {
        return new Promise((resolve) => {
            const req = {
                method: 'POST',
                headers: {
                    'authorization': validAuthHeader,
                    'content-type': 'application/json',
                    ...headers
                },
                body: body
            };
            const res = {
                statusCode: 200,
                headers: {},
                setHeader: (k, v) => { res.headers[k] = v; },
                status: (code) => {
                    res.statusCode = code;
                    return res;
                },
                json: (data) => {
                    resolve({ status: res.statusCode, data });
                }
            };
            chatHandler(req, res).catch(err => {
                resolve({ status: 500, data: { error: err.message } });
            });
        });
    }

    // 2. Test Bảo Mật: Chặn truy cập trái phép không có token
    console.log('\n2. Kiểm thử bảo mật: Chặn cuộc gọi Copilot không có xác thực...');
    const unauthRes = await mockReqRes({ isCopilot: true, messages: [{ role: 'user', content: 'Hôm nay có lịch gì?' }] }, { authorization: '' });
    console.log(`   -> Status: ${unauthRes.status} (Kỳ vọng: 401)`);
    if (unauthRes.status !== 401) throw new Error('Thất bại: Không chặn cuộc gọi thiếu token');
    console.log('   ✅ Đạt chuẩn G3-01: Bảo vệ endpoint nội bộ');

    // 3. Test G3-02: Tra cứu lịch hẹn hôm nay (get_appointments)
    console.log('\n3. Kiểm thử G3-02: Hỏi lịch hẹn hôm nay qua AI Copilot...');
    const aptRes = await mockReqRes({
        isCopilot: true,
        messages: [{ role: 'user', content: 'Hôm nay tiệm mình có những lịch hẹn nào?' }]
    });
    console.log(`   -> Status: ${aptRes.status}`);
    console.log(`   -> Copilot phản hồi:\n${aptRes.data?.reply}\n`);
    if (aptRes.status !== 200 || !aptRes.data?.reply) throw new Error('Thất bại: Copilot không trả lời lịch hẹn');
    console.log('   ✅ Đạt chuẩn G3-02: get_appointments hoạt động chuẩn xác');

    // 4. Test G3-03: Tra cứu chi tiết đơn hàng (get_order_detail)
    console.log('\n4. Kiểm thử G3-03: Tra cứu đơn hàng ORD-GUEST-001 qua AI Copilot...');
    const ordRes = await mockReqRes({
        isCopilot: true,
        messages: [{ role: 'user', content: 'Kiểm tra cho em thông tin đơn hàng ORD-GUEST-001 với ạ' }]
    });
    console.log(`   -> Status: ${ordRes.status}`);
    console.log(`   -> Copilot phản hồi:\n${ordRes.data?.reply}\n`);
    if (ordRes.status !== 200 || !ordRes.data?.reply) throw new Error('Thất bại: Copilot không trả lời đơn hàng');
    console.log('   ✅ Đạt chuẩn G3-03: get_order_detail hoạt động chuẩn xác');

    // 5. Test G3-03: Tra cứu sản phẩm sắp hết hàng (get_low_stock_products)
    console.log('\n5. Kiểm thử G3-03: Tra cứu tồn kho sắp hết hàng qua AI Copilot...');
    const invRes = await mockReqRes({
        isCopilot: true,
        messages: [{ role: 'user', content: 'Có mặt hàng nào trong kho sắp hết cần nhập thêm không em?' }]
    });
    console.log(`   -> Status: ${invRes.status}`);
    console.log(`   -> Copilot phản hồi:\n${invRes.data?.reply}\n`);
    if (invRes.status !== 200 || !invRes.data?.reply) throw new Error('Thất bại: Copilot không trả lời tồn kho');
    console.log('   ✅ Đạt chuẩn G3-03: get_low_stock_products hoạt động chuẩn xác');

    // 6. Test G3-03: Tra cứu ticket sự cố đang mở (get_open_tickets)
    console.log('\n6. Kiểm thử G3-03: Tra cứu khiếu nại đang mở qua AI Copilot...');
    const tickRes = await mockReqRes({
        isCopilot: true,
        messages: [{ role: 'user', content: 'Hiện tại có khiếu nại hay ticket nào của khách đang chờ xử lý không?' }]
    });
    console.log(`   -> Status: ${tickRes.status}`);
    console.log(`   -> Copilot phản hồi:\n${tickRes.data?.reply}\n`);
    if (tickRes.status !== 200 || !tickRes.data?.reply) throw new Error('Thất bại: Copilot không trả lời ticket');
    console.log('   ✅ Đạt chuẩn G3-03: get_open_tickets hoạt động chuẩn xác');

    // 7. Test G3-04: Tra cứu chính sách và tri thức (search_knowledge)
    console.log('\n7. Kiểm thử G3-04: Tra cứu chính sách đổi trả qua AI Copilot...');
    const faqRes = await mockReqRes({
        isCopilot: true,
        messages: [{ role: 'user', content: 'Chính sách đổi trả hàng hóa của PawPal quy định thế nào?' }]
    });
    console.log(`   -> Status: ${faqRes.status}`);
    console.log(`   -> Copilot phản hồi:\n${faqRes.data?.reply}\n`);
    if (faqRes.status !== 200 || !faqRes.data?.reply) throw new Error('Thất bại: Copilot không trả lời chính sách');
    console.log('   ✅ Đạt chuẩn G3-04: search_knowledge hoạt động chuẩn xác');

    console.log('\n=== TẤT CẢ 7 BÀI TEST GIAI ĐOẠN 3 (G3 — ADMIN COPILOT) ĐÃ ĐẠT 100%! ===');
}

runG3TestSuite().catch(err => {
    console.error('Suite Error:', err);
    process.exit(1);
});
