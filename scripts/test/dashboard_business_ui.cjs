// Isolated browser tests: no network and no business writes. Fixtures exist only here.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }));
        await page.goto('http://dashboard.test');
        await page.setContent('<style>body{margin:16px}*{box-sizing:border-box}</style><section data-business-root></section>');
        await page.addStyleTag({ content: fs.readFileSync('pages/admin/modules/dashboard/dashboard.css', 'utf8') });
        await page.addScriptTag({ content: fs.readFileSync('pages/admin/modules/dashboard/subtabs/business-metrics.js', 'utf8') });
        await page.evaluate(() => {
            window.requests = []; window.fixtureFailure = null;
            window.PawpalAdminAccess = { ready: Promise.resolve(), isAdmin: () => true, state: { user: { permissions: ['payment', 'refund_transaction', 'sales_order', 'sales_order_detail', 'appointment', 'appointment_item', 'customer', 'customer_membership', 'membership_tier', 'voucher_redemption', 'paw_point_transaction'].map(t => t + '.read') } } };
            window.getSupabaseClient = () => ({
                rpc: async (name, args) => {
                    window.requests.push({ name, args });
                    const M = window.PawpalBusinessMetrics;
                    return { data: { undated_receipts: 0, undated_refunds: 0, days: Array.from({ length: M.period(args.p_from, args.p_to).length }, (_, i) => ({ day: M.shift(args.p_from, i), collected: 100, refunded: 25 })) } };
                },
                from(table) {
                    window.requests.push({ table });
                    const q = { select() { return q; }, eq() { return q; }, in() { return q; }, gte() { return q; }, lt() { return q; }, order() { return q; }, async range() { return table === window.fixtureFailure ? { error: { code: '42501' } } : { data: [] }; } };
                    return q;
                }
            });
        });
        await page.addScriptTag({ content: fs.readFileSync('pages/admin/modules/dashboard/subtabs/tab-dashboard-business.js', 'utf8') });
        await page.evaluate(() => PawpalDashboardOverview.init());
        assert.equal(await page.locator('.biz-kpi').count(), 8);
        assert.match(await page.locator('.biz-kpi').nth(2).innerText(), /2\.250 đ/);
        assert.equal(await page.locator('.biz-chart').count(), 1);
        assert.equal(await page.locator('.biz-donut-legend li').count(), 3);
        assert.equal(await page.locator('[data-biz-slice]').count(), 0);
        assert.equal(await page.locator('.biz-comparison-chart rect').count(), 2);
        await page.evaluate(async () => {
            const original = PawpalBusinessMetrics.load;
            PawpalBusinessMetrics.load = async (db, key, range) => {
                if (key === 'sources') return { products: 1797000, services: 0, other: 0 };
                const result = await original(db, key, range);
                if (key === 'previous') result.net = 0;
                return result;
            };
            await PawpalDashboardOverview.refresh();
            PawpalBusinessMetrics.load = original;
        });
        assert.equal(await page.locator('[data-biz-slice]').count(), 1);
        assert.match(await page.locator('.biz-donut-center').innerText(), /1\.797\.000 đ/);
        assert.match(await page.locator('.biz-donut-legend li').first().innerText(), /100%/);
        assert.equal(await page.locator('.biz-comparison-badge').count(), 0);
        assert.match(await page.locator('[data-biz-panel="insights"]').innerText(), /kỳ trước bằng 0/);
        await page.locator('[data-biz-preset="90"]').click();
        await page.waitForFunction(() => !document.querySelector('[data-biz-updated]').textContent.includes('Đang'));
        assert.match(await page.locator('.biz-kpi').nth(2).innerText(), /6\.750 đ/);
        const requestsBefore = await page.evaluate(() => requests.length);
        await page.locator('[data-biz-from]').fill('2026-11-11');
        await page.locator('[data-biz-to]').fill('2026-11-01');
        await page.locator('[data-biz-apply]').click();
        assert.equal(await page.locator('[data-biz-error]').isVisible(), true);
        assert.equal(await page.evaluate(() => requests.length), requestsBefore);
        await page.evaluate(() => { window.fixtureFailure = 'voucher_redemption'; return PawpalDashboardOverview.refresh(); });
        assert.match(await page.locator('[data-biz-panel="vouchers"]').innerText(), /chưa có quyền/);
        assert.equal(await page.locator('.biz-chart').count(), 1);
        await page.evaluate(() => window.fixtureFailure = null);
        await page.locator('[data-biz-retry="vouchers"]').click();
        await page.waitForFunction(() => !document.querySelector('[data-biz-panel="vouchers"]').textContent.includes('Đang'));
        assert.match(await page.locator('[data-biz-panel="vouchers"]').innerText(), /0 đ/);
        await page.selectOption('[data-biz-bucket]', 'week');
        assert.equal(await page.locator('.biz-chart').count(), 1);
        for (const width of [1440, 390]) {
            await page.setViewportSize({ width, height: 1000 });
            assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'horizontal overflow at ' + width);
        }
        const saved = await page.evaluate(() => sessionStorage.getItem('pawpal_admin_business_range'));
        await page.evaluate(async () => { PawpalDashboardOverview.unmount(); await PawpalDashboardOverview.init(); });
        assert.equal(await page.evaluate(() => sessionStorage.getItem('pawpal_admin_business_range')), saved);
        await page.evaluate(() => { window._pawpalAdminLoaded = true; window.opsMounts = 0; window.PawpalDashboard.subtabs.operations = { mount: async () => { window.opsMounts++; }, unmount() {} }; });
        await page.addScriptTag({ content: fs.readFileSync('pages/admin/modules/dashboard/dashboard.js', 'utf8') });
        await page.evaluate(() => {
            const root = document.createElement('section'); root.id = 'subtab-tab-dashboard-operations'; document.body.append(root);
            window.dispatchEvent(new CustomEvent('admin:subtab-change', { detail: { module: 'Dashboard', tabId: 'tab-dashboard-operations' } }));
        });
        assert.equal(await page.evaluate(() => window.opsMounts), 1);
        await page.evaluate(() => window.dispatchEvent(new CustomEvent('admin:subtab-change', { detail: { module: 'Dashboard', tabId: 'tab-dashboard' } })));
        await page.waitForFunction(() => !document.querySelector('[data-biz-updated]').textContent.includes('Đang'));
        assert.equal(await page.evaluate(() => PawpalDashboardOverview.getMetrics().length), 8);
        await page.evaluate(() => { PawpalAdminAccess.isAdmin = () => false; return PawpalDashboardOverview.refresh(); });
        assert.match(await page.locator('[data-biz-panel="cash"]').innerText(), /chưa có quyền/);
        assert.equal(await page.locator('.biz-chart').count(), 0);
        assert.deepEqual(errors, []);
        console.log('PASS: filters, 90 days, invalid dates, partial errors, retry, zero data, chart, mobile, restored range and access denial (isolated fixtures).');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
