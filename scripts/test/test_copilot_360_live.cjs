const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();

    // Set admin user in localStorage before load
    await page.addInitScript(() => {
        localStorage.setItem('pawpal_admin_user', JSON.stringify({
            id: '20000000-0000-0000-0000-000000000001',
            name: 'Quản trị viên Pawpal',
            system_role: 'ADMIN',
            access_roles: ['ADMIN']
        }));
    });

    await page.goto('http://localhost:4000/admin#tab-ai-copilot');
    await page.waitForTimeout(2000);

    const input = page.locator('#copilotInput');
    await input.waitFor({ state: 'visible', timeout: 8000 });

    const q = 'Xem hồ sơ khách hàng 0912345678';
    await input.fill(q);

    const sendBtn = page.locator('#btnSendCopilot, button:has-text("Gửi yêu cầu")');
    await sendBtn.first().click();

    console.log('Sent query, waiting for reply...');
    await page.waitForTimeout(6000);

    const bubbles = page.locator('.copilot-msg.msg-ai .copilot-msg-bubble');
    const count = await bubbles.count();
    console.log('Bubbles count:', count);
    if (count > 0) {
        const text = await bubbles.nth(count - 1).innerText();
        console.log('COPILOT 360 REPLY:\n' + text);
    }

    await page.screenshot({ path: 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/7a76c9d1-504b-4a2d-877e-c42a3920b2f8/test_copilot_360_live.png' });
    await browser.close();
})();
