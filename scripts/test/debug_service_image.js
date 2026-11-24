const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleLogs = [];
    const failedRequests = [];

    page.on('console', msg => consoleLogs.push(`[${msg.type()}] ${msg.text()}`));
    page.on('requestfailed', req => failedRequests.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`));

    console.log('Navigating to service detail...');
    await page.goto('http://localhost:4000/pages/services/service-detail/service-detail.html?id=SVC-HTL-01', { waitUntil: 'networkidle' });

    await page.waitForTimeout(1000);

    const imgState = await page.evaluate(() => {
        const img = document.getElementById('mainShowcaseImg');
        const wrapper = document.querySelector('.service-main-image-wrapper');
        const layout = document.querySelector('.service-detail-layout');
        const thumbs = document.getElementById('galleryThumbnails');

        if (!img) return { error: 'No mainShowcaseImg found' };
        const cs = window.getComputedStyle(img);
        const rect = img.getBoundingClientRect();
        return {
            src: img.src,
            currentSrc: img.currentSrc,
            complete: img.complete,
            naturalWidth: img.naturalWidth,
            naturalHeight: img.naturalHeight,
            opacity: cs.opacity,
            visibility: cs.visibility,
            display: cs.display,
            width: rect.width,
            height: rect.height,
            wrapperRect: wrapper ? wrapper.getBoundingClientRect() : null,
            layoutClasses: layout ? layout.className : '',
            thumbsInnerHtml: thumbs ? thumbs.innerHTML.trim() : '',
            thumbsChildren: thumbs ? thumbs.children.length : 0
        };
    });

    console.log('Image State:', JSON.stringify(imgState, null, 2));
    console.log('Failed Requests:', failedRequests);
    console.log('Console Logs count:', consoleLogs.length);
    console.log('Relevant Console Logs:', consoleLogs.filter(l => l.includes('error') || l.includes('warn') || l.includes('Service') || l.includes('Image')));

    await page.screenshot({ path: 'C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4/service_detail_test.png', fullPage: false });

    await browser.close();
})();
