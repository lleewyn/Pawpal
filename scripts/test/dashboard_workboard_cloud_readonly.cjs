// Smoke test local Dashboard assets against the existing Admin session/RLS.
// All business mutations are blocked. Never print credentials or record contents.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async () => {
    const credentialPath = process.env.PAWPAL_ADMIN_TEST_CREDENTIALS || 'D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt';
    const secret = fs.readFileSync(credentialPath, 'utf8');
    const email = secret.match(/^Email: (.+)$/m)?.[1].trim(), password = secret.match(/^Password: (.+)$/m)?.[1].trim();
    assert(email && password, 'Admin test credential format unavailable');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        page.setDefaultTimeout(25000);
        const errors = [], writes = [], reads = new Set();
        page.on('pageerror', error => errors.push(error.name));
        const readRpcs = new Set(['get_staff_login_context', 'admin_customer_page', 'get_admin_dashboard_cashflow', 'admin_business_metric', 'get_admin_dashboard_plan', 'own_complaint_reply_notices', 'admin_booking_restrictions']);
        await page.route('**/rest/v1/**', route => {
            const request = route.request(), url = new URL(request.url());
            const rpc = url.pathname.split('/rpc/')[1];
            if (!['GET', 'HEAD'].includes(request.method()) && !readRpcs.has(rpc)) {
                writes.push(url.pathname); return route.abort();
            }
            reads.add(url.pathname); return route.continue();
        });
        await page.route('**/pages/admin/**', route => {
            const pathname = new URL(route.request().url()).pathname;
            if (pathname !== '/pages/admin/admin.js' && !pathname.startsWith('/pages/admin/modules/dashboard/') && !pathname.endsWith('.css')) return route.continue();
            const local = path.resolve('.' + pathname);
            if (!fs.existsSync(local) || !fs.statSync(local).isFile()) return route.continue();
            return route.fulfill({ contentType: pathname.endsWith('.js') ? 'application/javascript' : pathname.endsWith('.css') ? 'text/css' : 'text/html', body: fs.readFileSync(local) });
        });
        await page.goto('https://pawpalgr3.vercel.app/admin/login');
        await page.locator('#inputAdminEmail').fill(email);
        await page.locator('#inputAdminPassword').fill(password);
        await page.locator('#btnSubmitAdminLogin').click();
        await page.waitForFunction(() => window.PawpalAdminAccess?.isAdmin());
        await page.waitForSelector('.customers-module .customer-master-card');
        const reference = await page.evaluate(() => {
            const snapshot = selector => {
                const css = getComputedStyle(document.querySelector(selector));
                return ['backgroundColor','borderTopColor','borderRadius','backdropFilter'].map(key => css[key]);
            };
            return { card: snapshot('.customers-module .customer-master-card'), kpis: snapshot('.customers-module .customers-kpi-grid'), header: snapshot('.admin-header') };
        });
        await page.locator('[data-title="Dashboard"]').click();
        await page.waitForFunction(() => window.PawpalOperationsDashboard?.getState().lastUpdatedAt);
        const result = await page.evaluate(async () => {
            const state = PawpalOperationsDashboard.getState();
            const { data, error } = await getSupabaseClient().from('appointment').select('id,appointment_status')
                .gte('scheduled_start_at', state.period.startIso).lt('scheduled_start_at', state.period.endIso);
            if (error) throw Error('Independent appointment read failed');
            return { errors: Object.keys(state.errors), expected: data.filter(PawpalOpsMetrics.isValidAppointment).length,
                actual: document.querySelector('[data-kpi="todayAppointments"] [data-kpi-value]').textContent,
                agenda: !!document.querySelector('[data-ops-panel="agenda"]'),
                taskCount: document.querySelectorAll('[data-ops-task-id]').length,
                active: document.querySelector('#subtab-tab-dashboard-operations').classList.contains('active') };
        });
        assert.deepEqual(result.errors, [], 'All operations resources must load under current Cloud permissions');
        assert.equal(result.actual, result.expected.toLocaleString('vi-VN'));
        assert(result.agenda && result.active);
        assert(result.taskCount <= 10);
        const actual = await page.evaluate(() => {
            const snapshot = selector => {
                const css = getComputedStyle(document.querySelector(selector));
                return ['backgroundColor','borderTopColor','borderRadius','backdropFilter'].map(key => css[key]);
            };
            return { card: snapshot('.ops-panel'), kpis: snapshot('.ops-kpis'), header: snapshot('.admin-header') };
        });
        assert.deepEqual(actual, reference, 'Local Dashboard uses the Customer surface and unchanged Admin header');
        assert.deepEqual(writes, [], 'No business mutation attempted');
        assert.deepEqual(errors, []);
        console.log('PASS local Dashboard / current Cloud: all resource reads, pet relation, assignment columns, independent today count, first-visit operations pane; no business mutations. Read endpoints: ' + reads.size);
    } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
