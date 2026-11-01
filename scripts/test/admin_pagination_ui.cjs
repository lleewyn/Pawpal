const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
        await page.route('**/*', route => {
            const url = new URL(route.request().url());
            if (url.hostname !== 'localhost') return route.abort();
            if (url.pathname.endsWith('.css')) return route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(process.cwd(), url.pathname), 'utf8') });
            return route.fulfill({ contentType: 'text/html', body: '<html></html>' });
        });
        await page.goto('http://localhost:3000/');
        await page.setContent(fs.readFileSync('pages/admin/index.html', 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ''));
        const cases = [
            ['customers', '.pagination-controls', 'pagination-btn'],
            ['pets', '.pagination-controls', 'pagination-btn'],
            ['services', '.admin-pagination-container', 'btn-pagination'],
            ['orders', '.admin-pagination-container', 'btn-pagination'],
            ['staff', '.admin-pagination-container', 'btn-pagination'],
            ['complaints', '.admin-pagination-container', 'btn-pagination'],
            ['settings', '#auditPaginationControls', 'pagination-btn'],
            ['chatbot', '#faqPaginationWrap', 'rules-page-btn'],
            ['chatbot', '#chatInboxPager', 'rules-page-btn']
        ];
        let baseline;
        for (const [module, selector, buttonClass] of cases) {
            await page.locator('#contentArea').evaluate((el, html) => { el.innerHTML = html; }, fs.readFileSync(`pages/admin/modules/${module}/${module}.html`, 'utf8'));
            const result = await page.locator(selector).first().evaluate((el, cls) => {
                el.innerHTML = `<button class="${cls}" disabled>&lt;</button><button class="${cls} active">1</button><button class="${cls}">2</button><button class="${cls}">&gt;</button>`;
                return [...el.children].map(button => {
                    const s = getComputedStyle(button);
                    return { height: s.height, minWidth: s.minWidth, border: s.borderTopWidth, radius: s.borderRadius, background: s.backgroundColor, color: s.color, opacity: s.opacity, fontSize: s.fontSize };
                });
            }, buttonClass);
            baseline ||= result;
            assert.deepEqual(result, baseline, `${module} ${selector} differs from the shared reference`);
            assert.equal(result[1].background, 'rgb(49, 94, 73)');
            assert.equal(result[1].color, 'rgb(255, 255, 255)');
            assert.equal(result[2].border, '1px');
            assert.equal(result[2].height, '32px');
            assert.equal(result[2].radius, '3px');
            assert.equal(result[2].background, 'rgb(255, 255, 255)');
            assert.equal(await page.locator(selector).first().evaluate(el => getComputedStyle(el).gap), '0px');
            assert.equal(await page.locator(selector).first().evaluate(el => {
                const outer = el.closest('.admin-pagination-bar, .admin-pagination-container, .pagination-container, .rules-pagination-wrap, .staff-calendar-pager');
                return getComputedStyle(outer).paddingBottom;
            }), '18px', 'Pagination must leave breathing room below its buttons');
        }
        console.log('PASS identical bordered pagination across nine module contexts, including chatbot rules, inbox and audit ID overrides. No application scripts or database requests.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
