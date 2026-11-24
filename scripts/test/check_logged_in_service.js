const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Set localStorage as Lê Lệ Quyên
    await page.addInitScript(() => {
        localStorage.setItem('pawpal_current_user', JSON.stringify({
            id: 'c0000000-0000-0000-0000-000000000001',
            name: 'Lê Lệ Quyên',
            full_name: 'Lê Lệ Quyên',
            phone: '0901234567',
            points: 250
        }));
    });

    await page.goto('http://localhost:4000/pages/services/service-detail/service-detail.html?id=SVC-HTL-01', { waitUntil: 'networkidle' });

    const result = await page.evaluate(() => {
        const img = document.getElementById('mainShowcaseImg');
        return {
            imgSrc: img?.src,
            imgComplete: img?.complete,
            naturalWidth: img?.naturalWidth,
            naturalHeight: img?.naturalHeight,
            serviceDataImg: window.serviceData?.image
        };
    });

    console.log('Result with user logged in:', result);

    await page.screenshot({ path: 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4/service_detail_logged_in.png' });
    await browser.close();
})();
