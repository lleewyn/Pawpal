// Isolated browser regressions only. No production writes and no fixture data in the app.
const fs = require('node:fs'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        const errors = [];
        page.on('pageerror', e => errors.push(e.message));
        await page.route('**/*', r => r.fulfill({ contentType: 'text/html', body: '<!doctype html><body class="admin-body dashboard-active"></body>' }));
        await page.goto('http://localhost:3000/dashboard-finance-test');
        await page.setContent('<body class="admin-body dashboard-active"><div style="height:100vh;overflow:auto"><section class="dashboard-module dash-page business-dash" data-business-root></section></div></body>');
        for (const file of ['pages/admin/admin.css', 'pages/admin/modules/dashboard/dashboard.css', 'pages/admin/admin-shell-v7.css', 'pages/admin/admin-components.css', 'pages/admin/admin-typography.css']) await page.addStyleTag({ content: fs.readFileSync(file, 'utf8') });
        await page.addScriptTag({ content: fs.readFileSync('pages/admin/modules/dashboard/subtabs/business-metrics.js', 'utf8') });
        await page.evaluate(() => {
            window.fixturePlan = null; window.fixtureError = null; window.fixtureNegative = false; window.saves = [];
            localStorage.setItem('pawpal_admin_opex_config', JSON.stringify({ rent: 20000000, utilities: 5000000, payroll: 20000000, cogsRate: 55 }));
            window.PawpalAdminAccess = { ready: Promise.resolve(), isAdmin: () => true, state: { user: { permissions: ['payment','refund_transaction','sales_order','sales_order_detail','appointment','appointment_item','customer','customer_membership','membership_tier','voucher_redemption','paw_point_transaction'].map(t => t + '.read').concat(['pawpal_setting.write','audit_log.write']) } } };
            window.getSupabaseClient = () => ({ rpc: async (name, args) => {
                const M = PawpalBusinessMetrics;
                if (name === 'save_admin_dashboard_plan') { saves.push(args); fixturePlan = { ...args.p_values, period_from: args.p_from, period_to: args.p_to }; return {data: fixturePlan}; }
                if (name === 'get_admin_dashboard_plan') return {data: fixturePlan};
                if (name === 'get_admin_dashboard_cashflow') {
                    if (fixtureError === 'cash') return {error:{code:'42501'}};
                    return {data:{undated_receipts:0,undated_refunds:0,days:Array.from({length:M.period(args.p_from,args.p_to).length},(_,i)=>({day:M.shift(args.p_from,i),collected:100,refunded:fixtureNegative?200:25}))}};
                }
                if (args.p_key === fixtureError) return {error:{code:'42501'}};
                const values = { sources: {products:M.period(args.p_from,args.p_to).length*100,services:0,other:0}, products:[],services:[],customers:[],membership:[],vouchers:{count:0,discount:0},points:{credited:0,debited:0},returning:{eligible:2,returning:1,rate:50} };
                return {data:values[args.p_key]};
            } });
        });
        await page.addScriptTag({ content: fs.readFileSync('pages/admin/modules/dashboard/subtabs/tab-dashboard-business.js', 'utf8') });
        await page.evaluate(() => PawpalBusinessDashboard.init());
        assert.equal(await page.locator('.biz-finance-values').count(), 0, 'no fabricated costs from old localStorage');
        assert.match(await page.locator('[data-biz-panel="profit"]').innerText(), /Chưa có kế hoạch/);
        assert.equal(await page.locator('#btnExportProfitReport').isDisabled(), true);
        await page.locator('#btnEditPlan').click();
        assert.deepEqual(await page.locator('#bizPlanModal input').evaluateAll(inputs => inputs.map(e => e.value)), ['', '', '', '']);
        await page.locator('#plan-target_net_receipts').fill('1000');
        await page.locator('[data-plan-save]').click();
        await page.waitForFunction(() => !document.querySelector('#bizPlanModal'));
        assert.equal(await page.locator('.biz-finance-values').count(), 0);
        assert.match(await page.locator('#bizTargetBody').innerText(), /1\.000/);
        await page.locator('#btnEditPlan').click();
        await page.locator('#plan-operating_expenses').fill('-1');
        await page.locator('#plan-product_cost_percent').fill('0');
        await page.locator('#plan-service_cost_percent').fill('0');
        await page.locator('[data-plan-save]').click();
        assert.equal(await page.evaluate(() => saves.length), 1, 'reject negative expenses');
        await page.locator('#plan-operating_expenses').fill('0');
        await page.locator('[data-plan-save]').click();
        await page.waitForSelector('.biz-finance-values');
        assert.equal(await page.evaluate(() => saves.length), 2);
        assert.equal(await page.evaluate(() => saves[1].p_values.operating_expenses), 0);
        assert.equal(await page.locator('#bizProfitStatusBadge').innerText(), 'Ước tính thặng dư');
        assert.equal(await page.locator('#btnExportProfitReport').isDisabled(), false);
        for (const key of ['sources', 'cash']) {
            await page.evaluate(async key => {fixtureError = key; await PawpalBusinessDashboard.refresh();}, key);
            assert.equal(await page.locator('.biz-finance-values').count(), 0, key + ' failure must clear estimate');
            assert.equal(await page.locator('#btnExportProfitReport').isDisabled(), true, 'never export a stale estimate');
            assert.equal(await page.locator('#bizProfitStatusBadge').innerText(), 'Chưa đủ dữ liệu');
        }
        await page.evaluate(async () => {fixtureError=null;fixtureNegative=true;await PawpalBusinessDashboard.refresh();});
        assert.match(await page.locator('.biz-finance-values').innerText(), /-3\.000 đ/);
        assert.match(await page.locator('#bizTargetBody').innerText(), /-300%/);
        assert.equal(await page.locator('#bizProfitStatusBadge').innerText(), 'Ước tính thiếu hụt');
        const style = await page.locator('.biz-panel').first().evaluate(e => {const s=getComputedStyle(e);return [s.borderRadius,s.backgroundColor,s.backdropFilter,s.borderTopColor];});
        assert.deepEqual(style, ['9px','rgba(255, 255, 255, 0.7)','blur(10px)','rgb(236, 242, 238)']);
        await page.locator('[data-biz-preset="7"]').click();
        await page.waitForFunction(() => !document.querySelector('[data-biz-updated]').textContent.includes('Đang'));
        assert.equal(await page.locator('.biz-finance-values').count(), 0, 'a different period must not reuse the old plan');
        assert.equal(await page.locator('#bizTargetBody').innerText(), '', 'a different period must not reuse the old target');
        assert.deepEqual(errors, []);
        console.log('PASS finance UI: no defaults, validated shared save, zero costs, source/cash failure, stale export, negative net, exact period and final CSS cascade.');
    } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode=1; });
