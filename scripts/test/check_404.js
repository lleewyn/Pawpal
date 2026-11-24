const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const responses = [];

    page.on('response', res => {
        responses.push(`${res.status()} ${res.request().method()} ${res.url()}`);
    });

    await page.goto('http://localhost:4000/pages/services/service-detail/service-detail.html?id=SVC-HTL-01', { waitUntil: 'networkidle' });

    console.log('--- ALL 404 / FAILED RESPONSES ---');
    console.log(responses.filter(r => r.startsWith('4') || r.startsWith('5')).join('\n'));

    await browser.close();
})();
