const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const path = require('node:path');
require('dotenv').config();

(async () => {
    console.log('=== BẮT ĐẦU CHỤP ẢNH MINH CHỨNG THỰC TẾ HỒ SƠ 360° TRÊN TRÌNH DUYỆT ===');
    const browser = await chromium.launch({
        channel: 'chrome',
        headless: true
    });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') console.log('Console error:', msg.text());
    });

    try {
        // 1. Đăng nhập Admin
        console.log('1. Mở trang đăng nhập Admin...');
        await page.goto('http://localhost:4000/pages/admin/login.html', { waitUntil: 'networkidle', timeout: 15000 });

        console.log('2. Nhập thông tin đăng nhập admin.local@pawpal.test...');
        await page.fill('#inputAdminEmail', 'admin.local@pawpal.test');
        await page.fill('#inputAdminPassword', 'AdminPassword123!');
        await page.click('#btnSubmitAdminLogin');

        console.log('3. Chờ chuyển hướng vào Admin Dashboard...');
        await page.waitForURL('**/admin**', { timeout: 15000 });

        // 2. Chuyển sang subtab Trợ lý AI (Copilot)
        console.log('4. Điều hướng vào Trợ lý AI (#tab-ai-copilot)...');
        await page.goto('http://localhost:4000/admin#tab-ai-copilot', { waitUntil: 'networkidle' });

        const input = page.locator('#copilotInput');
        await input.waitFor({ state: 'visible', timeout: 10000 });
        console.log('Khung nhập câu hỏi #copilotInput đã sẵn sàng!');

        // 3. Gửi câu lệnh Hồ sơ 360°
        const q = 'Xem hồ sơ khách hàng 0912345678';
        console.log(`5. Điền câu lệnh: "${q}"...`);
        await input.fill(q);

        const sendBtn = page.locator('#btnSendCopilot');
        await sendBtn.click();
        console.log('Đã nhấn nút Gửi yêu cầu, chờ câu trả lời...');

        // 4. Chờ phản hồi từ Copilot
        await page.waitForTimeout(5000);
        await page.waitForFunction(() => {
            const btn = document.getElementById('btnSendCopilot');
            return btn && !btn.disabled;
        }, { timeout: 15000 });

        const bubbles = page.locator('.copilot-msg.msg-ai .copilot-msg-bubble');
        const count = await bubbles.count();
        console.log(`Số bong bóng câu trả lời AI: ${count}`);
        if (count > 0) {
            const replyText = await bubbles.nth(count - 1).innerText();
            console.log('=== NỘI DUNG COPILOT TRẢ LỜI THỰC TẾ TRÊN MÀN HÌNH ===\n' + replyText + '\n======================================================');
        }

        // 5. Chụp ảnh màn hình làm minh chứng
        const outPath = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/minh_chung_ho_so_360_live.png';
        await page.screenshot({ path: outPath, fullPage: false });
        console.log(`Đã lưu ảnh minh chứng tại: ${outPath}`);

    } catch (err) {
        console.error('Lỗi trong quá trình kiểm thử chụp ảnh:', err);
        const errPath = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/error_copilot_360.png';
        await page.screenshot({ path: errPath });
        console.log(`Đã chụp ảnh màn hình lỗi tại: ${errPath}`);
    } finally {
        await browser.close();
    }
})();
