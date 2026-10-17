/**
 * test_copilot_persistence.js
 * Kiểm thử tính năng lưu trữ lịch sử trò chuyện AI Copilot vào Database (Supabase)
 * và API GET / DELETE /api/admin/copilot/history
 */

require('dotenv').config();
const http = require('http');
const { createClient } = require('@supabase/supabase-js');
const { signStaffToken } = require('../api/staff_auth.js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
let validStaffToken = '';

function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const reqHeaders = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + validStaffToken,
            ...headers
        };
        if (payload) {
            reqHeaders['Content-Length'] = Buffer.byteLength(payload);
        }

        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: reqHeaders
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, body: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, raw: data });
                }
            });
        });

        req.on('error', reject);
        if (payload) req.write(payload);
        req.end();
    });
}

async function runTest() {
    console.log('=== BẮT ĐẦU KIỂM THỬ LƯU TRỮ LỊCH SỬ CHAT COPILOT ===\n');

    // 0. Lấy nhân sự thật từ CSDL
    const { data: staffList, error: stErr } = await supabase
        .from('staff')
        .select('id, full_name, system_role, account_status')
        .eq('account_status', 'ACTIVE')
        .limit(1);

    if (stErr || !staffList || staffList.length === 0) {
        throw new Error('Không tìm thấy nhân sự ACTIVE trong CSDL.');
    }
    const testStaff = staffList[0];
    validStaffToken = signStaffToken(testStaff);
    console.log(`0. Nhân sự kiểm thử: ${testStaff.full_name} (${testStaff.system_role}, ID: ${testStaff.id})`);

    // 1. Kiểm tra GET /api/admin/copilot/history
    console.log('\n1. Kiểm tra API GET /api/admin/copilot/history...');
    const getRes = await makeRequest('GET', '/api/admin/copilot/history');
    console.log('   Status:', getRes.status);
    console.log('   Body:', getRes.body);
    if (getRes.status === 200 && (Array.isArray(getRes.body.history) || getRes.body.ok)) {
        console.log('   ✅ Đạt chuẩn: API GET /api/admin/copilot/history phản hồi 200 OK với danh sách history.');
    } else {
        throw new Error(`Thất bại: API GET history trả về status ${getRes.status}`);
    }

    // 2. Kiểm tra DELETE /api/admin/copilot/history
    console.log('\n2. Kiểm tra API DELETE /api/admin/copilot/history...');
    const delRes = await makeRequest('DELETE', '/api/admin/copilot/history');
    console.log('   Status:', delRes.status);
    console.log('   Body:', delRes.body);
    if (delRes.status === 200 && delRes.body.cleared === true) {
        console.log('   ✅ Đạt chuẩn: API DELETE /api/admin/copilot/history phản hồi 200 OK cleared=true.');
    } else {
        throw new Error(`Thất bại: API DELETE history trả về status ${delRes.status}`);
    }

    // 3. Kiểm tra POST /api/admin/copilot với action GET_COPILOT_HISTORY
    console.log('\n3. Kiểm tra POST /api/admin/copilot với action GET_COPILOT_HISTORY...');
    const postGetRes = await makeRequest('POST', '/api/admin/copilot', { action: 'GET_COPILOT_HISTORY' });
    console.log('   Status:', postGetRes.status);
    console.log('   Body:', postGetRes.body);
    if (postGetRes.status === 200 && (Array.isArray(postGetRes.body.history) || postGetRes.body.ok)) {
        console.log('   ✅ Đạt chuẩn: POST action GET_COPILOT_HISTORY phản hồi 200 OK.');
    } else {
        throw new Error(`Thất bại: POST action GET_COPILOT_HISTORY trả về status ${postGetRes.status}`);
    }

    console.log('\n=== TẤT CẢ KIỂM THỬ LƯU TRỮ LỊCH SỬ COPILOT ĐÃ ĐẠT 100%! ===');
}

runTest().catch(err => {
    console.error('\n❌ Lỗi kiểm thử:', err.message);
    process.exit(1);
});
