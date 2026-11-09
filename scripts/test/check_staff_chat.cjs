// Verify STAFF can access Chatbot and view conversations.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

const TARGET_URL = process.env.TEST_BASE_URL || 'https://pawpalgr3.vercel.app';
const STAFF_EMAIL = 'staff.grooming@pawpal.vn';
const STAFF_PASSWORD = 'Staff@Pawpal2026!';

(async () => {
    console.log('--- Kiểm tra hội thoại Chat phía nhân viên STAFF ---');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

    page.on('console', m => {
        if (m.type() === 'error') console.log('CONSOLE ERROR:', m.text());
    });

    try {
        console.log('1. Đăng nhập với tài khoản STAFF...');
        await page.goto(TARGET_URL + '/admin/login', { waitUntil: 'networkidle', timeout: 30000 });
        await page.fill('#inputAdminEmail', STAFF_EMAIL);
        await page.fill('#inputAdminPassword', STAFF_PASSWORD);
        await page.click('#btnSubmitAdminLogin');
        await page.waitForURL(url => !url.pathname.includes('/login'), { timeout: 20000 });
        console.log('Đăng nhập thành công! URL:', page.url());

        // 2. Chuyển sang module Chatbot
        console.log('2. Mở phân hệ Chatbot (#tab-live-support)...');
        await page.evaluate(() => {
            window.location.hash = '#tab-live-support';
        });
        await page.waitForTimeout(4000);

        const chatState = await page.evaluate(async () => {
            const client = window.getSupabaseClient();
            // Đọc danh sách hội thoại từ RPC get_staff_workspace
            const { data: convData, error: convError } = await client.rpc('get_staff_workspace', {
                p_kind: 'conversations',
                p_query: '',
                p_id: null,
                p_page: 1
            });

            // Đọc hàng đợi hỗ trợ từ RPC get_staff_workspace (chat_queue)
            const { data: queueData, error: queueError } = await client.rpc('get_staff_workspace', {
                p_kind: 'chat_queue',
                p_query: '',
                p_id: null,
                p_page: 1
            });

            return {
                conversations: convData?.items || [],
                convError: convError ? { message: convError.message, code: convError.code } : null,
                queue: queueData?.items || [],
                queueError: queueError ? { message: queueError.message, code: queueError.code } : null
            };
        });

        console.log('\n--- KẾT QUẢ DANH SÁCH CHAT CỦA NHÂN VIÊN ---');
        console.log('Lỗi đọc conversations:', chatState.convError);
        console.log('Số hội thoại được giao:', chatState.conversations.length);
        if (chatState.conversations.length > 0) {
            console.log('Chi tiết hội thoại được giao:', JSON.stringify(chatState.conversations, null, 2));
        }

        console.log('Lỗi đọc chat_queue:', chatState.queueError);
        console.log('Số hội thoại trong hàng đợi chờ tiếp nhận:', chatState.queue.length);
        if (chatState.queue.length > 0) {
            console.log('Chi tiết hàng đợi:', JSON.stringify(chatState.queue, null, 2));
        }
        console.log('--------------------------------------------\n');

        await page.screenshot({ path: 'docs/verification/sync/staff-chat-view.png', fullPage: true });

    } catch (err) {
        console.error('LỖI:', err);
        throw err;
    } finally {
        await browser.close();
    }
})();

