const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage();
    await page.setContent(`
        <style>
            .header {
                height: 60px;
                background: #eee;
                contain: layout paint;
                position: relative;
            }
            .dropdown {
                position: absolute;
                top: 70px;
                right: 10px;
                width: 200px;
                height: 150px;
                background: red;
            }
        </style>
        <div class="header">
            <div class="dropdown">I am dropdown</div>
        </div>
    `);
    await page.screenshot({ path: 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4/contain_paint_test.png' });
    await browser.close();
})();
