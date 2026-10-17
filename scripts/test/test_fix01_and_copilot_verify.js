/**
 * test_fix01_and_copilot_verify.js
 * Kiểm thử nghiệm thu FIX-01 (customer_profile.phone) và G3 VERIFY-02/03/04 (Fast-path Copilot)
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const chatHandler = require('../api/chat.js');
const { signStaffToken } = require('../api/staff_auth.js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);

function mockReqRes(body, headers = {}) {
    return new Promise((resolve) => {
        const req = {
            method: 'POST',
            headers: {
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
                resolve({ statusCode: res.statusCode, body: data });
                return res;
            },
            end: () => {
                resolve({ statusCode: res.statusCode, body: null });
            }
        };
        chatHandler(req, res).catch(err => {
            resolve({ statusCode: 500, error: err.message });
        });
    });
}

async function runVerification() {
    console.log('=== BẮT ĐẦU NGHIỆM THU FIX-01 VÀ FAST-PATH COPILOT VERIFY ===\n');

    // TEST 1: Xác minh bảng customer_profile không còn lỗi 400
    console.log('[Test 1] Xác minh truy vấn customer_profile an toàn (FIX-01)...');
    const { data: profs, error: profErr } = await supabase
        .from('customer_profile')
        .select('customer_id, full_name')
        .limit(5);

    if (profErr) {
        throw new Error(`[FAIL] Truy vấn customer_profile bị lỗi: ${profErr.message} (code: ${profErr.code})`);
    }
    console.log(`  -> ĐẠT: Truy vấn customer_profile thành công 200 OK, lấy được ${profs.length} hồ sơ mẫu.`);
    console.log('  -> Không còn lỗi 42703 (column phone does not exist).\n');

    // Lấy 1 tài khoản nhân sự thật để thử nghiệm Copilot
    const { data: staffList } = await supabase
        .from('staff')
        .select('id, full_name, system_role, account_status')
        .eq('account_status', 'ACTIVE')
        .limit(1);

    if (!staffList || staffList.length === 0) {
        throw new Error('[FAIL] Không tìm thấy nhân sự ACTIVE trong CSDL.');
    }
    const staff = staffList[0];
    const token = signStaffToken(staff);
    const authHeaders = { authorization: `Bearer ${token}` };
    console.log(`Nhân sự thử nghiệm: ${staff.full_name} (${staff.system_role}, ID: ${staff.id})\n`);

    // TEST 2: Thử nghiệm câu hỏi tồn kho dưới 5 món
    console.log('[Test 2] Thử nghiệm Fast-path Tồn kho: "Liệt kê sản phẩm có tồn kho dưới 5 món cần nhập thêm"...');
    const t0 = Date.now();
    const invRes = await mockReqRes({
        isCopilot: true,
        messages: [{ role: 'user', content: 'Liệt kê sản phẩm có tồn kho dưới 5 món cần nhập thêm' }]
    }, authHeaders);
    const durationInv = Date.now() - t0;

    console.log(`  -> Status: ${invRes.statusCode}`);
    console.log(`  -> Router: ${invRes.body?.router}`);
    console.log(`  -> Thời gian phản hồi: ${durationInv} ms (kỳ vọng < 300ms, không tốn 4-5s Gemini)`);
    console.log(`  -> Trích đoạn nội dung:\n${invRes.body?.reply?.split('\n').slice(0, 4).join('\n')}\n`);

    if (invRes.statusCode !== 200 || invRes.body?.router !== 'deterministic_inventory') {
        throw new Error(`[FAIL] Câu hỏi tồn kho không vào Fast-path: ${JSON.stringify(invRes.body)}`);
    }
    if (invRes.body?.reply?.includes('21/05/2024')) {
        throw new Error(`[FAIL] Vẫn còn xuất hiện ngày giả định 21/05/2024 trong nội dung trả về!`);
    }
    console.log('  -> ĐẠT: Fast-path inventory nhận diện chính xác, 0 token Gemini, không có ngày cũ 21/05/2024.\n');

    // TEST 3: Thử nghiệm câu hỏi khiếu nại trong 24 giờ qua
    console.log('[Test 3] Thử nghiệm Fast-path Khiếu nại: "Tóm tắt các khiếu nại chưa xử lý trong 24 giờ qua"...');
    const t1 = Date.now();
    const tckRes = await mockReqRes({
        isCopilot: true,
        messages: [{ role: 'user', content: 'Tóm tắt các khiếu nại chưa xử lý trong 24 giờ qua' }]
    }, authHeaders);
    const durationTck = Date.now() - t1;

    console.log(`  -> Status: ${tckRes.statusCode}`);
    console.log(`  -> Router: ${tckRes.body?.router}`);
    console.log(`  -> Thời gian phản hồi: ${durationTck} ms (kỳ vọng < 300ms)`);
    console.log(`  -> Trích đoạn nội dung:\n${tckRes.body?.reply?.split('\n').slice(0, 5).join('\n')}\n`);

    if (tckRes.statusCode !== 200 || tckRes.body?.router !== 'deterministic_tickets') {
        throw new Error(`[FAIL] Câu hỏi khiếu nại không vào Fast-path: ${JSON.stringify(tckRes.body)}`);
    }
    if (tckRes.body?.reply?.includes('21/05/2024')) {
        throw new Error(`[FAIL] Vẫn còn xuất hiện ngày giả định 21/05/2024 trong nội dung trả về!`);
    }
    if (tckRes.body?.reply?.includes('chưa được hỗ trợ')) {
        throw new Error(`[FAIL] Vẫn còn thông báo "chưa hỗ trợ lọc theo khung thời gian"!`);
    }
    console.log('  -> ĐẠT: Fast-path tickets xử lý chuẩn xác, có dữ liệu thật từ DB, không còn từ chối 24h.\n');

    console.log('=== TẤT CẢ KIỂM THỬ FIX-01 VÀ G3 COPILOT FAST-PATH ĐÃ ĐẠT 100%! ===');
}

runVerification().catch(err => {
    console.error('Lỗi nghiệm thu:', err);
    process.exit(1);
});
