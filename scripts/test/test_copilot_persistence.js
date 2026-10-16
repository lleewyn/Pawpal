/**
 * test_copilot_persistence.js
 * Kiểm thử tính năng lưu trữ lịch sử trò chuyện AI Copilot vào Database (Supabase)
 * và API GET / DELETE /api/admin/copilot/history
 */

const http = require('http');

function makeRequest(method, path, body = null, headers = {}) {
    return new Promise((resolve, reject) => {
        const payload = body ? JSON.stringify(body) : null;
        const reqHeaders = {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer local:f12d8dcc-aceb-4c80-adb4-c14e1d9afc30', // Staff Lê Hoàng Tiến
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

    // 1. Kiểm tra GET /api/admin/copilot/history
    console.log('1. Kiểm tra API GET /api/admin/copilot/history...');
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
