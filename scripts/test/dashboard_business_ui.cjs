// Isolated browser tests: no network and no business writes. Fixtures exist only here.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
    const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHANNEL ? { channel: process.env.PLAYWRIGHT_CHANNEL } : {}) });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }));
        await page.goto('http://dashboard.test');
        await page.setContent('<style>body{margin:16px}*{box-sizing:border-box}</style><section class="dashboard-module dash-page business-dash" data-business-root></section>');
        await page.addStyleTag({ content: fs.readFileSync('pages/admin/modules/dashboard/dashboard.css', 'utf8') });
        await page.addScriptTag({ content: fs.readFileSync('pages/admin/modules/dashboard/subtabs/business-metrics.js', 'utf8') });
        await page.evaluate(() => {
            window.requests = []; window.fixtureFailure = null;
            window.PawpalAdminAccess = { ready: Promise.resolve(), isAdmin: () => true, state: { user: { permissions: ['payment', 'refund_transaction', 'sales_order', 'sales_order_detail', 'appointment', 'appointment_item', 'customer', 'customer_membership', 'membership_tier', 'voucher_redemption', 'paw_point_transaction'].map(t => t + '.read') } } };
            window.getSupabaseClient = () => ({
                rpc: async (name, args) => {
                    window.requests.push({ name, args });
                    const M = window.PawpalBusinessMetrics;
                    if(name==='admin_business_metric'){
                        if(args.p_key==='vouchers'&&window.fixtureFailure==='voucher_redemption')return {error:{code:'42501'}};
                        const values={sources:{products:0,services:0,other:0},products:[],services:[],customers:[],membership:[],vouchers:{count:0,discount:0},points:{credited:0,debited:0},returning:{eligible:0,returning:0,rate:null}};
                        return {data:values[args.p_key]};
                    }

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
        await page.evaluate(() => {
            window.originalMetricLoad = PawpalBusinessMetrics.load;
            const gate = new Promise(resolve => {window.releaseInitialLoad = resolve;});
            PawpalBusinessMetrics.load = async (...args) => {await gate;return window.originalMetricLoad(...args);};
            window.initialLoad = PawpalDashboardOverview.init();
        });
        assert.equal(await page.locator('.biz-kpi[aria-busy="true"]').count(), 8);
        assert.equal(await page.locator('.biz-kpi-skeleton').count(), 8);
        assert.equal(await page.locator('[data-biz-panel="customers"] .biz-skeleton').count(), 1);
        assert.equal(await page.locator('[data-biz-panel="membership"] .biz-skeleton').count(), 1);
        assert.equal(await page.locator('[data-biz-panel="insights"] .biz-skeleton').count(), 1);
        await page.evaluate(async () => {releaseInitialLoad();await initialLoad;PawpalBusinessMetrics.load = originalMetricLoad;});
        assert.equal(await page.locator('.biz-skeleton,.biz-kpi-skeleton').count(), 0);
        await page.evaluate(() => {
            const gate = new Promise(resolve => {window.releaseCustomerLoad = resolve;});
            PawpalBusinessMetrics.load = async (db, key, range) => {if(key === 'customers')await gate;return originalMetricLoad(db, key, range);};
            window.partialLoad = PawpalDashboardOverview.refresh();
        });
        await page.waitForFunction(() => document.querySelector('[data-biz-panel="membership"]').getAttribute('aria-busy') === 'false');
        assert.equal(await page.locator('[data-biz-panel="customers"]').getAttribute('aria-busy'), 'true');
        assert.equal(await page.locator('[data-biz-panel="membership"] .biz-empty').count(), 1);
        const groupSurface = await page.locator('[data-biz-panel="membership"]').evaluate(n => {const s=getComputedStyle(n.closest('.biz-group'));return {background:s.backgroundColor,blur:s.backdropFilter};});
        assert.deepEqual(groupSurface, {background:'rgb(255, 255, 255)',blur:'none'});
        await page.evaluate(async () => {releaseCustomerLoad();await partialLoad;PawpalBusinessMetrics.load = originalMetricLoad;});
        await page.evaluate(async () => {PawpalBusinessMetrics.load = async (db,key,range) => {if(key==='cash')throw {code:'42501'};return originalMetricLoad(db,key,range);};await PawpalDashboardOverview.refresh();});
        assert.equal(await page.locator('[data-biz-panel="cash"] [role="alert"]').count(), 1);
        assert.equal(await page.locator('[data-biz-panel="insights"] [role="alert"]').count(), 1);
        assert.equal(await page.locator('.biz-kpi-error').count(), 4);
        await page.evaluate(async () => {PawpalBusinessMetrics.load = originalMetricLoad;await PawpalDashboardOverview.refresh();});
        assert.equal(await page.locator('.biz-kpi').count(), 8);
        const styleDifferences = await page.evaluate(() => {
            const reference = document.createElement('section');
            reference.className = 'dashboard-module dash-page ops-dash';
            reference.style.cssText = 'position:fixed;left:-10000px;width:1200px;visibility:hidden';
            reference.innerHTML = '<div class="ops-kpis"><div class="ops-kpi"><span class="kpi-label">Chỉ số</span><strong class="kpi-val">123</strong></div></div><section class="ops-panel"><header class="ops-panel-head"><h3 class="admin-card-title">Tiêu đề</h3></header></section>';
            document.body.append(reference);
            const pairs = [['.ops-kpis', '.biz-kpis', ['backgroundColor', 'borderRadius', 'borderColor']], ['.ops-kpi .kpi-label', '.biz-kpi .kpi-label', ['fontSize', 'fontWeight', 'color']], ['.ops-kpi .kpi-val', '.biz-kpi .kpi-val', ['fontSize', 'fontWeight', 'color', 'lineHeight', 'letterSpacing']], ['.ops-panel-head .admin-card-title', '.biz-panel-head .admin-card-title', ['fontSize', 'fontWeight', 'color']]];
            const differences = pairs.flatMap(([a, b, props]) => {const x = getComputedStyle(reference.querySelector(a)), y = getComputedStyle(document.querySelector(b));return props.filter(p => x[p] !== y[p]).map(p => `${b}: ${p} ${y[p]} != ${x[p]}`);});
            reference.remove();return differences;
        });
        assert.deepEqual(styleDifferences, [], 'Business must match Operations workspace styles');
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
        await page.locator('[data-biz-preset="custom"]').click();
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
            if (process.argv.includes('--preview')) { fs.mkdirSync('artifacts/dashboard-business-style', { recursive: true }); await page.screenshot({ path: `artifacts/dashboard-business-style/${width}.png`, fullPage: true }); }
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
