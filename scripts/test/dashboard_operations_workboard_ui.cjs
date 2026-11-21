// Browser-only fixtures. Network is blocked; no business records are created.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const root = 'pages/admin/modules/dashboard/';
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head></head><body></body></html>' }));
        await page.goto('http://dashboard.test/');
        await page.clock.install({ time: new Date('2026-11-21T03:00:00Z') });
        await page.setContent('<style>*{box-sizing:border-box}body{margin:0;padding:20px;background:#F4F9F6}.subtab-content{display:none}.subtab-content.active{display:block}</style><nav><button class="sidebar-menu-btn" data-title="Dịch vụ">Dịch vụ</button><button class="sidebar-menu-btn" data-title="Bán hàng">Bán hàng</button><button class="sidebar-menu-btn" data-title="Khiếu nại">Khiếu nại</button></nav>' + fs.readFileSync(root + 'dashboard.html', 'utf8'));
        await page.addStyleTag({ content: fs.readFileSync(root + 'dashboard.css', 'utf8') });
        await page.addStyleTag({ content: fs.readFileSync('pages/admin/admin-components.css', 'utf8') });
        await page.addScriptTag({ content: fs.readFileSync(root + 'subtabs/operations-metrics.js', 'utf8') });
        await page.evaluate(() => {
            window.reads = []; window.failedTable = null; window.removedChannels = 0;
            const old = '2026-11-01T01:00:00Z', today = '2026-11-21T02:00:00Z';
            window.fixtures = {
                appointment: Array.from({ length: 14 }, (_, i) => ({ id: 'a' + i, appointment_code: 'LH-' + i, appointment_status: i === 0 ? 'confirmed' : 'pending', scheduled_start_at: i === 0 ? old : today, scheduled_end_at: '2026-11-21T04:00:00Z', created_at: old, staff_id: i === 1 ? 's1' : null, pet: { pet_name: 'Bé kiểm thử ' + i }, items: [{ name_snapshot: 'Tắm vệ sinh', status: 'pending', staff_id: i === 2 ? 's1' : null }] })),
                sales_order: [{ id: 'o1', order_code: 'DH-1', order_status: 'pending', created_at: old }],
                support_ticket: [{ id: 't1', ticket_code: 'HT-1', status: 'pending', priority: 'normal', created_at: old, assigned_staff_id: 's1' }],
                return_request: [{ id: 'r1', sales_order_id: 'o1', request_status: 'pending', created_at: old, so: { order_code: 'DH-1' } }],
                staff: [{ id: 's1', full_name: 'Nhân viên kiểm thử', employment_status: 'active' }]
            };
            const client = {
                from(table) {
                    const filters = []; let columns = '';
                    const q = {
                        select(value) { columns = value; return q; }, order() { return q; },
                        in(key, values) { filters.push(row => values.includes(row[key])); return q; },
                        gte(key, value) { filters.push(row => row[key] >= value); return q; },
                        gt(key, value) { filters.push(row => row[key] > value); return q; },
                        lt(key, value) { filters.push(row => row[key] < value); return q; },
                        not() { return q; },
                        async range(from, to) {
                            reads.push({ table, columns });
                            if (failedTable === table) return { error: { code: '42501', message: 'denied' } };
                            const rows = (fixtures[table] || []).filter(row => filters.every(filter => filter(row)));
                            return { data: rows.slice(from, to + 1) };
                        }
                    }; return q;
                },
                channel() { const c = { on() { return c; }, subscribe(cb) { queueMicrotask(() => cb('SUBSCRIBED')); return c; } }; return c; },
                removeChannel() { removedChannels++; }
            };
            window.getSupabaseClient = () => client;
        });
        await page.addScriptTag({ content: fs.readFileSync(root + 'subtabs/tab-dashboard-operations.js', 'utf8') });
        const mount = async () => {
            await page.evaluate(() => PawpalOperationsDashboard.mount(document.querySelector('[data-ops-root]')));
            await page.waitForFunction(() => PawpalOperationsDashboard.getState().lastUpdatedAt && !document.querySelector('[data-ops-panel="alerts"].is-refreshing'));
        };
        const tasks = page.locator('[data-ops-task-id]');
        await mount();
        await page.waitForFunction(() => document.querySelectorAll('[data-ops-task-id]').length === 10);
        assert.equal(await tasks.count(), 10, 'Tasks shown directly, at most 10 rows');
        assert.equal(await page.locator('[data-ops-task-id="appointment:a0"] .ops-reason').count(), 2, 'Old appointment retains both reasons');
        assert.match(await page.locator('[data-ops-panel="alerts"]').innerText(), /Nhân viên kiểm thử/);
        assert.equal(await page.locator('[data-ops-panel="agenda"] tbody tr').count(), 10);
        assert.equal(await page.locator('.ops-work-table').evaluate(table => !!table.closest('.admin-card')?.querySelector('[data-ops-pagination]')), false);
        await page.locator('[data-ops-pagination]').getByRole('button', { name: '2', exact: true }).click();
        assert.equal(await tasks.count(), 7, '17 distinct records, not 19 alert reasons');
        await page.locator('[data-ops-agenda-pagination]').getByRole('button', { name: '2', exact: true }).click();
        assert.equal(await page.locator('[data-ops-panel="agenda"] tbody tr').count(), 3);
        await page.locator('[data-ops-alert-scope="unassigned"]').click();
        assert.equal(await tasks.count(), 10);
        assert(!(await tasks.allTextContents()).join(' ').includes('Chưa có dữ liệu phân công'));
        await page.locator('[data-ops-task-kind]').selectOption('ticket');
        assert.equal(await tasks.count(), 0, 'Assigned support is excluded from unassigned filter');
        await page.locator('[data-ops-alert-scope="all"]').click();
        assert.equal(await tasks.count(), 1);
        await page.evaluate(() => PawpalOperationsDashboard.unmount());
        await mount();
        await page.waitForFunction(() => document.querySelector('[data-ops-task-kind]').value === 'ticket');
        assert.equal(await tasks.count(), 1, 'Task filters restored on mount');
        await page.locator('[data-ops-task-kind]').selectOption('return');
        await page.evaluate(() => { window.PawpalOrders = { state: { selectedOrderId: 'previous' } }; });
        await page.locator('[data-ops-nav="return"]').click();
        assert.equal(await page.evaluate(() => sessionStorage.getItem('pawpal_admin_order_selected_id')), 'o1');
        assert.equal(await page.evaluate(() => sessionStorage.getItem('pawpal_admin_order_subtab')), 'tab-order-detail');
        assert.equal(await page.evaluate(() => PawpalOrders.state.selectedOrderId), 'o1');
        await page.locator('[data-ops-task-kind]').selectOption('appointment');
        await page.evaluate(() => { window.PawpalServices = { state: { selectedBookingId: 'previous' } }; });
        const appointmentId = await tasks.first().getAttribute('data-ops-task-id');
        await tasks.first().getByRole('button', { name: 'Mở lịch hẹn' }).click();
        assert.equal(await page.evaluate(() => PawpalServices.state.selectedBookingId), appointmentId.split(':')[1]);
        await page.locator('[data-ops-task-kind]').selectOption('ticket');
        const adminSource = fs.readFileSync('pages/admin/admin.js', 'utf8');
        const deepLinkLoader = adminSource.slice(adminSource.indexOf('    function handleEntityDeepLink('), adminSource.indexOf('    function getTargetHashForModule('));
        await page.addScriptTag({ content: `const access = { isAdmin: () => true }; ${deepLinkLoader}
            window.PawpalComplaints = { state: { currentTicketId: 'previous', currentActiveTicket: { id: 'previous' } },
                openTicketDetail: async id => { window.fetchedTicket = id; document.querySelector('nav').dataset.renderedTicket = id; }, switchSubtab() {} };
            window.addEventListener('hashchange', () => { const [base, query] = location.hash.slice(1).split('?'); handleEntityDeepLink('Khiếu nại', base, new URLSearchParams(query)); });` });
        await page.locator('[data-ops-nav="ticket"]').click();
        await page.waitForFunction(() => window.fetchedTicket === 't1');
        assert.equal(await page.locator('nav').first().getAttribute('data-rendered-ticket'), 't1', 'Router invokes target loader even when absent from cached complaint page');
        assert.equal(await page.evaluate(() => PawpalComplaints.state.currentTicketId), 't1');
        await page.locator('[data-ops-task-kind]').selectOption('all');
        await page.evaluate(() => { failedTable = 'inventory'; PawpalOperationsDashboard.refresh(); });
        await page.waitForFunction(() => PawpalOperationsDashboard.getState().errors.inventory);
        assert.equal(await tasks.count(), 10, 'Other tasks survive failed source');
        assert.match(await page.locator('[data-ops-panel="alerts"]').innerText(), /chưa đầy đủ/);
        await page.evaluate(() => { failedTable = null; });
        await page.locator('[data-ops-panel="alerts"] [data-ops-retry="alerts"]').click();
        await page.waitForFunction(() => !PawpalOperationsDashboard.getState().errors.inventory);
        await page.evaluate(() => { failedTable = 'staff'; PawpalOperationsDashboard.refresh(); });
        await page.waitForFunction(() => PawpalOperationsDashboard.getState().errors.staff);
        await page.locator('[data-ops-task-kind]').selectOption('ticket');
        assert.match(await tasks.innerText(), /Đã phân công, chưa tải được tên/);
        await page.evaluate(() => { failedTable = null; PawpalOperationsDashboard.refresh(); });
        await page.waitForFunction(() => !PawpalOperationsDashboard.getState().errors.staff);
        await page.locator('[data-ops-task-kind]').selectOption('all');
        const todayCodes = await page.locator('[data-ops-panel="agenda"] tbody').innerText();
        await page.locator('[data-ops-range="30d"]').click();
        await page.waitForFunction(() => PawpalOperationsDashboard.getState().preset === '30d' && !document.querySelector('.is-refreshing'));
        assert.equal(await page.locator('[data-ops-panel="agenda"] tbody').innerText(), todayCodes, 'Today list does not become historical');
        const out = path.join('artifacts', 'dashboard-workboard'); fs.mkdirSync(out, { recursive: true });
        for (const width of [1440, 820, 390, 320]) {
            await page.setViewportSize({ width, height: 1000 });
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No outer overflow at ' + width);
            if ([1440, 390].includes(width)) await page.screenshot({ path: path.join(out, width + '.png'), fullPage: true });
        }
        // A source error must remove old tasks rather than present stale records as current.
        await page.evaluate(() => { failedTable = 'appointment'; PawpalOperationsDashboard.refresh(); });
        await page.waitForFunction(() => PawpalOperationsDashboard.getState().errors.backlogAppointments);
        assert.equal(await page.locator('[data-ops-task-id^="appointment:"]').count(), 0);
        await page.evaluate(() => { failedTable = null; fixtures = {}; PawpalOperationsDashboard.refresh(); });
        await page.waitForFunction(() => Object.keys(PawpalOperationsDashboard.getState().errors).length === 0 && document.querySelectorAll('[data-ops-task-id]').length === 0);
        assert.match(await page.locator('[data-ops-panel="alerts"]').innerText(), /Không có việc cần xử lý/);
        await page.evaluate(() => {
            fixtures.appointment = [{ id: 'age', appointment_code: 'LH-age', appointment_status: 'pending', created_at: '2026-11-21T02:50:00Z', scheduled_start_at: '2026-11-22T03:00:00Z', items: [] }];
            PawpalOperationsDashboard.refresh();
        });
        await page.waitForFunction(() => !document.querySelector('.is-refreshing'));
        assert.equal(await tasks.count(), 0);
        const ageReads = await page.evaluate(() => reads.length);
        await page.clock.fastForward(6 * 60_000);
        assert.equal(await tasks.count(), 1, 'Pending record crosses threshold without a DB event');
        assert.equal(await page.evaluate(() => reads.length), ageReads);
        await page.evaluate(() => {
            fixtures.appointment = [{ id: 'horizon', appointment_code: 'LH-horizon', appointment_status: 'confirmed', created_at: '2026-11-01T01:00:00Z', scheduled_start_at: new Date(Date.now() + 25 * 3600_000).toISOString(), items: [] }];
            PawpalOperationsDashboard.refresh();
        });
        await page.waitForFunction(() => !document.querySelector('.is-refreshing'));
        assert.equal(await tasks.count(), 0, 'Beyond 24h is cached but not actionable');
        const horizonReads = await page.evaluate(() => reads.length);
        await page.clock.fastForward(60 * 60_000);
        assert.equal(await tasks.count(), 1, 'Record enters 24h horizon without DB mutation or refetch');
        assert.equal(await page.evaluate(() => reads.length), horizonReads);
        // Capped results must not advertise a complete KPI or a healthy work queue.
        await page.evaluate(() => {
            fixtures.appointment = Array.from({ length: 5001 }, (_, i) => ({ id: 'cap' + i, appointment_code: 'LH-cap' + i, appointment_status: 'pending', created_at: '2026-11-01T01:00:00Z', scheduled_start_at: '2026-11-21T02:00:00Z', items: [] }));
            PawpalOperationsDashboard.refresh();
        });
        await page.waitForFunction(() => !document.querySelector('.is-refreshing') && document.querySelectorAll('[data-ops-task-id]').length === 10);
        assert.equal(await page.locator('[data-kpi="todayAppointments"] [data-kpi-value]').innerText(), '—');
        assert.match(await page.locator('[data-ops-panel="alerts"] [data-ops-tag]').innerText(), /Chưa đầy đủ/);
        // Explicit permissions prevent RLS-denied empty responses appearing as healthy zeroes.
        await page.evaluate(() => { window.PawpalAdminAccess = { isAdmin: () => true, state: { user: { permissions: [] } } }; PawpalOperationsDashboard.refresh(); });
        await page.waitForFunction(() => PawpalOperationsDashboard.getState().errors.todayAppointments);
        assert.equal(await page.locator('[data-kpi="todayAppointments"] [data-kpi-value]').innerText(), '—');
        await page.evaluate(() => { delete window.PawpalAdminAccess; PawpalOperationsDashboard.refresh(); });
        await page.waitForFunction(() => Object.keys(PawpalOperationsDashboard.getState().errors).length === 0);
        await page.evaluate(() => { fixtures = {}; PawpalOperationsDashboard.refresh(); });
        await page.waitForFunction(() => document.querySelectorAll('[data-ops-task-id]').length === 0);
        const readsBeforeClock = await page.evaluate(() => reads.length);
        await page.clock.fastForward(60_000);
        assert.equal(await page.evaluate(() => reads.length), readsBeforeClock, 'Live age refresh does not add database queries');
        await page.clock.setSystemTime(new Date('2026-11-21T17:01:00Z'));
        await page.clock.fastForward(60_000);
        await page.waitForFunction(() => PawpalOperationsDashboard.getState().period.today === '2026-11-22');
        assert.match(await page.locator('[data-ops-panel="agenda"] [data-ops-title]').innerText(), /22\/11\/2026/);
        await page.evaluate(() => PawpalOperationsDashboard.unmount());
        assert(await page.evaluate(() => removedChannels >= 2));
        assert.deepEqual(errors, []);
        console.log('PASS workboard: grouping, old backlog, owners, filters/restoration, source failures/retry, today list, pagination, navigation, 1440/820/390/320px. No network or business writes.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
