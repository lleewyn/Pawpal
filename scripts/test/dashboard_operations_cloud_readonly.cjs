const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const credentials = fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt', 'utf8');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    page.setDefaultTimeout(30000);
    const failures = [], reads = new Set();
    try {
        await page.route('**/rest/v1/**', route => {
            const request = route.request(), pathname = new URL(request.url()).pathname;
            if (!['GET', 'HEAD'].includes(request.method()) && !pathname.startsWith('/rest/v1/rpc/get_') && !['/rest/v1/rpc/admin_customer_page', '/rest/v1/rpc/own_complaint_reply_notices'].includes(pathname)) {
                failures.push({ blockedWrite: pathname });
                return route.abort();
            }
            reads.add(pathname);
            return route.continue();
        });
        page.on('response', response => {
            if (response.url().includes('/rest/v1/') && response.status() >= 400) {
                failures.push({ path: new URL(response.url()).pathname, status: response.status() });
            }
        });
        page.on('pageerror', error => failures.push({ scriptError: error.message }));
        await page.goto('https://pawpalgr3.vercel.app/admin/login');
        console.log('Login page loaded.');
        await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());
        await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());
        await page.locator('#btnSubmitAdminLogin').click();
        console.log('Login submitted.');
        await page.waitForURL(url => !url.pathname.includes('login'));
        console.log('Admin workspace opened.');
        await page.waitForFunction(() => window.PawpalCustomers?.state.listLoadStatus === 'loaded');
        await page.locator('[data-title="Dashboard"]').click();
        await page.waitForFunction(() => window.PawpalOperationsDashboard);
        await page.getByText('Quản trị vận hành', { exact: true }).first().click();
        await page.waitForFunction(() => window.PawpalOperationsDashboard.getState().lastUpdatedAt, { timeout: 45000 });
        const report = await page.evaluate(() => ({
            state: PawpalOperationsDashboard.getState(),
            kpis: [...document.querySelectorAll('[data-kpi]')].map(node => ({ key: node.dataset.kpi, value: node.querySelector('[data-kpi-value]').textContent })),
            panels: [...document.querySelectorAll('[data-ops-panel]')].map(node => ({ key: node.dataset.opsPanel, text: node.querySelector('[data-ops-body]').innerText.slice(0, 260) })),
            channels: getSupabaseClient().getChannels().map(channel => ({ topic: channel.topic, state: channel.state }))
        }));
        console.log(JSON.stringify({ ...report, failures, reads: [...reads] }, null, 2));
        assert.deepEqual(report.state.errors, {});
        assert.deepEqual(failures, []);
        assert(report.kpis.every(kpi => /^\d/.test(kpi.value)), 'All KPI values must finish loading');
        const direct = await page.evaluate(async () => {
            const period = PawpalOperationsDashboard.getState().period;
            const response = await getSupabaseClient().from('appointment').select('id,appointment_status')
                .gte('scheduled_start_at', period.startIso).lt('scheduled_start_at', period.endIso);
            if (response.error) throw new Error(response.error.message);
            return { total: response.data.length, statuses: response.data.map(row => row.appointment_status) };
        });
        console.log('Independent today appointment read: ' + JSON.stringify(direct));
        assert.equal(direct.total, Number(report.kpis.find(kpi => kpi.key === 'todayAppointments').value));
        await page.locator('[data-ops-range="7d"]').click();
        await page.waitForFunction(() => {
            const state = PawpalOperationsDashboard.getState();
            return state.preset === '7d' && !document.querySelector('[data-ops-root] .ops-skeleton') && Object.keys(state.errors).length === 0;
        });
        console.log('PASS 7-day period loads without resource errors.');
        assert.equal(report.state.realtime, 'live');
        assert(report.channels.some(channel => channel.topic.endsWith('admin-ops-dashboard-live') && channel.state === 'joined'));
        console.log('PASS live operations reads and rendered cards.');
    } catch (error) {
        console.log(JSON.stringify({ path: new URL(page.url()).pathname, failures, reads: [...reads], diagnostics: await page.evaluate(() => ({
            customers: window.PawpalCustomers?.state?.listLoadStatus,
            operations: window.PawpalOperationsDashboard?.getState(),
            alerts: [...document.querySelectorAll('[role="alert"], .error-message, #loginError')].map(el => el.innerText).filter(Boolean)
        })) }, null, 2));
        throw error;
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
