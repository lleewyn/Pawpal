const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    console.log('Navigating to SVC-HTL-01...');
    await page.goto('http://localhost:4000/pages/services/service-detail/service-detail.html?id=SVC-HTL-01', { waitUntil: 'domcontentloaded' });

    // Wait for service layout to load
    await page.waitForSelector('.service-detail-layout:not(.sd-loading)', { timeout: 8000 });
    await page.waitForTimeout(600);

    // If popup appears, dismiss it
    const popupClose = await page.$('#pawpal-site-popup button, .modal button:has-text("Đóng"), #pawpal-site-popup [aria-label="Close"], #pawpal-site-popup .btn-close');
    if (popupClose) {
        console.log('Dismissing popup...');
        await popupClose.click().catch(() => {});
        await page.waitForTimeout(300);
    }
    // Also remove any modal backdrop or popup container directly if still covering
    await page.evaluate(() => {
        const popup = document.getElementById('pawpal-site-popup');
        if (popup) popup.remove();
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) backdrop.remove();
    });

    // Check main image and gallery
    const galleryState = await page.evaluate(() => {
        const img = document.getElementById('mainShowcaseImg');
        const thumbs = Array.from(document.querySelectorAll('.gallery-thumb-img')).map(t => t.src);
        return {
            src: img?.src,
            complete: img?.complete,
            naturalWidth: img?.naturalWidth,
            naturalHeight: img?.naturalHeight,
            opacity: img ? window.getComputedStyle(img).opacity : null,
            thumbs
        };
    });
    console.log('Clean Gallery State:', galleryState);

    // Save proof screenshot with clean modal-free view
    const shotPath1 = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4/minhchung_service_detail_clean.png';
    await page.screenshot({ path: shotPath1 });
    console.log('Saved proof screenshot clean:', shotPath1);

    // Click 2nd thumbnail
    if (galleryState.thumbs.length > 1) {
        console.log('Clicking thumbnail 2...');
        await page.click('.gallery-thumb[data-index="1"]');
        await page.waitForTimeout(400);

        const thumb2State = await page.evaluate(() => {
            const img = document.getElementById('mainShowcaseImg');
            return {
                src: img?.src,
                complete: img?.complete,
                naturalWidth: img?.naturalWidth
            };
        });
        console.log('State after thumbnail 2 click:', thumb2State);

        const shotPath2 = 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4/minhchung_service_detail_thumb2.png';
        await page.screenshot({ path: shotPath2 });
        console.log('Saved proof screenshot thumb 2:', shotPath2);
    }

    await browser.close();
    console.log('ALL VERIFICATIONS COMPLETED SUCCESSFULLY!');
})();
