const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto('http://localhost:4000/pages/services/service-detail/service-detail.html?id=SVC-HTL-01', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);

    // Dismiss site popup if any
    await page.evaluate(() => {
        const popup = document.getElementById('pawpal-site-popup');
        if (popup) popup.remove();
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
    });

    // Hover over "Dịch vụ"
    const serviceLink = await page.$('.nav-item.dropdown a[href="/services"]');
    if (serviceLink) {
        console.log('Hovering over "Dịch vụ"...');
        await serviceLink.hover();
        await page.waitForTimeout(300);

        const shot = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4/nav_dropdown_before.png';
        await page.screenshot({ path: shot });
        console.log('Saved nav_dropdown_before.png');
    }

    await browser.close();
})();
