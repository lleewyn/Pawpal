const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = path.resolve('C:/Users/QUYEN/.gemini/antigravity-cli/brain/ee2858d7-6580-48fe-81a1-d967318c4ca4');

async function testPublicPages() {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 }
    });

    const pagesToTest = [
        { name: 'landing', url: 'http://127.0.0.1:4000/' },
        { name: 'shop', url: 'http://127.0.0.1:4000/shop' },
        { name: 'services', url: 'http://127.0.0.1:4000/services' },
        { name: 'about', url: 'http://127.0.0.1:4000/about' },
        { name: 'blog', url: 'http://127.0.0.1:4000/blog' }
    ];

    const results = [];

    for (const item of pagesToTest) {
        console.log(`Testing page: ${item.name} (${item.url})...`);
        const page = await context.newPage();

        // Strip promo popups automatically
        await page.addInitScript(() => {
            const observer = new MutationObserver(() => {
                const popup = document.getElementById('pawpal-site-popup');
                if (popup) {
                    popup.remove();
                    document.body.style.overflow = '';
                }
            });
            observer.observe(document.documentElement, { childList: true, subtree: true });
        });

        await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);

        // Check CSS metrics for smooth scrolling & hardware acceleration
        const metrics = await page.evaluate(() => {
            const htmlStyle = window.getComputedStyle(document.documentElement);
            const header = document.querySelector('.main-header');
            const headerStyle = header ? window.getComputedStyle(header) : null;
            const contentVisEl = document.querySelector('.services-editorial, .catalog-grid, .blog-list-container, .about-story-section, .shop-grid, .site-footer');
            const contentVisStyle = contentVisEl ? window.getComputedStyle(contentVisEl) : null;

            return {
                scrollBehavior: htmlStyle.scrollBehavior,
                headerTransform: headerStyle ? headerStyle.transform : null,
                headerWillChange: headerStyle ? headerStyle.willChange : null,
                contentVisibility: contentVisStyle ? contentVisStyle.contentVisibility : null
            };
        });

        // Test smooth scrolling simulation
        const scrollStart = Date.now();
        await page.evaluate(async () => {
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 300;
                const timer = setInterval(() => {
                    const scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if (totalHeight >= scrollHeight || totalHeight > 5000) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 50);
            });
        });
        const scrollDuration = Date.now() - scrollStart;

        // Dismiss any popup and remove backdrops cleanly
        await page.evaluate(() => {
            sessionStorage.setItem('pawpal_notice_dismissed_promo', '1');
            document.querySelectorAll('.modal, #pawpal-site-popup, [id*="popup"], .modal-backdrop').forEach(el => el.remove());
            if (document.body) {
                document.body.classList.remove('modal-open');
                document.body.style.overflow = '';
                document.body.style.filter = '';
            }
            const style = document.createElement('style');
            style.innerHTML = '#pawpal-site-popup, .modal-backdrop { display: none !important; }';
            document.head.appendChild(style);
        });

        // Scroll back to top smoothly
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(500);

        // One more cleanup right before screenshot
        await page.evaluate(() => {
            document.querySelectorAll('.modal, #pawpal-site-popup, [id*="popup"], .modal-backdrop').forEach(el => el.remove());
            if (document.body) {
                document.body.style.overflow = '';
                document.body.style.filter = '';
            }
        });

        const screenshotPath = path.join(ARTIFACT_DIR, `smooth_scroll_${item.name}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        results.push({
            page: item.name,
            metrics,
            scrollDuration,
            screenshot: screenshotPath
        });

        await page.close();
    }

    await browser.close();

    const reportPath = path.join(ARTIFACT_DIR, 'smooth_scroll_report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf-8');
    console.log('Test completed successfully. Report saved to:', reportPath);
}

testPublicPages().catch(err => {
    console.error('Test error:', err);
    process.exit(1);
});
