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
            window.reads = []; window.failedTable = null; window.removedChannels = 0; window.realtimeHandlers = {};
            const old = '2026-11-01T01:00:00Z', today = '2026-11-21T02:00:00Z';
            window.fixtures = {
                appointment: Array.from({ length: 14 }, (_, i) => ({ id: 'a' + i, appointment_code: 'LH-' + i, appointment_status: i === 0 ? 'confirmed' : 'pending', scheduled_start_at: i === 0 ? old : today, scheduled_end_at: '2026-11-21T04:00:00Z', created_at: old, staff_id: i === 1 ? 's1' : null, pet: { pet_name: 'Bé kiểm thử ' + i }, items: [{ name_snapshot: 'Tắm vệ sinh', status: 'pending', staff_id: i === 2 ? 's1' : null }] })),
                sales_order: [{ id: 'o1', order_code: 'DH-1', order_status: 'pending', created_at: old }],
                support_ticket: [{ id: 't1', ticket_code: 'HT-1', status: 'pending', priority: 'normal', created_at: old, assigned_staff_id: 's1' }],
                return_request: [{ id: 'r1', sales_order_id: 'o1', request_status: 'pending', created_at: old, so: { order_code: 'DH-1' } }],
                staff: [{ id: 's1', full_name: 'Nhân viên kiểm thử', employment_status: 'active' }]
            };
            const client = {
                async rpc(name, args) {
                    if (name === 'admin_dashboard_operation_totals') {
                        if(window.failKpis)return {error:{code:'42501'}};
                        const M=PawpalOpsMetrics,now=new Date(),period=M.resolvePeriod('custom',now,{from:args.p_from,to:args.p_to});
                        const allowed=(...tables)=>tables.every(table=>failedTable!==table&&(!window.PawpalAdminAccess||PawpalAdminAccess.state.user.permissions.includes(table+'.read')));
                        const all=table=>fixtures[table]||[],today=M.vnDateKey(now),count=M.countPendingAppointments(all('appointment'),now);
                        const staff=M.staffAllocation({appointments:[],staff:all('staff'),schedules:all('staff_schedule'),period,now});
                        const open=all('support_ticket').filter(row=>M.isTicketOpen(row.status));
                        const reserved=new Map(),sold=new Map();
                        all('stock_reservation').filter(row=>M.norm(row.status)==='active'&&Date.parse(row.expires_at)>+now).forEach(row=>reserved.set(row.product_variant_id,(reserved.get(row.product_variant_id)||0)+row.quantity));
                        all('sales_order_detail').forEach(row=>sold.set(row.product_variant_id,(sold.get(row.product_variant_id)||0)+row.quantity));
                        const risks=M.inventoryRisks(all('inventory').filter(row=>!M.STATUS_GROUPS.productInactive.includes(M.norm(row.variant_status))&&!M.STATUS_GROUPS.productInactive.includes(M.norm(row.product_status))),{reservedByVariant:reserved,soldByVariant:sold});
                        const metric=(can,value,extra={})=>can?{available:true,value,...extra}:{available:false};
                        return {data:{as_of:now.toISOString(),metrics:{
                            todayAppointments:metric(allowed('appointment'),all('appointment').filter(row=>M.vnDateKey(row.scheduled_start_at)===today&&M.isValidAppointment(row)).length),
                            pendingAppointments:metric(allowed('appointment','appointment_item'),count.total,{pending:count.pending,unassigned:count.unassigned}),
                            pendingOrders:metric(allowed('sales_order'),M.countActionOrders(all('sales_order'))),
                            staffOnShift:metric(allowed('staff','staff_schedule'),staff.staffWithShift,{on_shift_now:staff.onShiftNow}),
                            lowStock:metric(allowed('inventory','product','product_variant','stock_reservation','sales_order','sales_order_detail'),risks.filter(row=>row.level!=='watch').length,{out:risks.filter(row=>row.level==='out').length,high:risks.filter(row=>row.level==='high').length}),
                            openTickets:metric(allowed('support_ticket'),open.length,{waiting:open.filter(row=>!row.first_response_at).length})
                        }}};
                    }
                    if (name === 'admin_dashboard_work_page') {
                        const M = PawpalOpsMetrics;
                        const safe = table => failedTable === table ? [] : fixtures[table] || [];
                        const all = M.taskBoard(M.buildAlerts({ pendingAppointments: safe('appointment'), activeOrders: safe('sales_order'), openReturns: safe('return_request'), openTickets: safe('support_ticket'), now: new Date() }), { appointments: safe('appointment'), tickets: safe('support_ticket'), staff: safe('staff'), staffAvailable: failedTable !== 'staff' });
                        all.forEach(row=>{if(row.kind==='return')row.parentId=window.serverReturnParent||safe('return_request').find(source=>source.id===row.recordId)?.sales_order_id;});
                        const byKind = args.p_kind === 'all' ? all : all.filter(row => row.kind === args.p_kind);
                        const match = (row, scope) => scope === 'urgent' ? row.severity === 'urgent' : scope === 'unassigned' ? row.unassigned : scope === 'older' ? row.waitingHours > 168 : scope === 'recent' ? row.waitingHours === null || row.waitingHours <= 168 : true;
                        const filtered = byKind.filter(row => match(row, args.p_scope)), page = Math.min(args.p_page, Math.max(1, Math.ceil(filtered.length / 10)));
                        return { data: { total: filtered.length, page, counts: Object.fromEntries(['all','urgent','unassigned','older','recent'].map(scope => [scope, byKind.filter(row => match(row, scope)).length])), rows: filtered.slice((page - 1) * 10, page * 10), missing_sources: failedTable && failedTable !== 'staff' ? [failedTable] : [] } };
                    }
                    if (name === 'admin_dashboard_order_clocks') return { data: [] };
                    if (name === 'admin_dashboard_work_history') return { data: window.historyFixture || { available: false, tracked_from: '2026-11-21T03:00:00Z', rows: [] } };
                    if (name === 'admin_dashboard_logistics_page') {
                        const all = window.logisticsFixture || [];
                        return { data: { total: all.length, page: args.p_page, rows: all.slice((args.p_page-1)*10,args.p_page*10), unassigned: all.filter(row=>!row.owner_id).length, rooms_in_use: 2 } };
                    }
                    throw Error('Unexpected fixture RPC');
                },
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
                channel() { const c = { on(_type, filter, handler) { realtimeHandlers[filter.table] = handler; return c; }, subscribe(cb) { queueMicrotask(() => cb('SUBSCRIBED')); return c; } }; return c; },
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
        await page.evaluate(()=>{serverReturnParent='outside-direct-read';PawpalOperationsDashboard.refresh();});
        await page.waitForSelector('[data-ops-nav="return"][data-ops-parent="outside-direct-read"]');
        await page.locator('[data-ops-nav="return"]').click();
        assert.equal(await page.evaluate(()=>PawpalOrders.state.selectedOrderId),'outside-direct-read','Server parent link works outside the bounded browser snapshot');
        await page.evaluate(()=>{delete window.serverReturnParent;});
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
            logisticsFixture = Array.from({length:12},(_,i)=>({kind:i%2?'taxi_return':'hotel_checkout',id:'log'+i,appointment_id:'a'+i,code:'LH-'+i,pet_name:'Bé kiểm thử',at:'2026-11-21T05:00:00Z',detail:i%2?'Chặng về':'101',owner_id:null}));
            historyFixture = {available:true,tracked_from:'2026-11-21T03:00:00Z',from:'2026-11-21T03:00:00Z',to:'2026-11-21T04:00:00Z',rows:[{kind:'order',opening:10,opened:3,reopened:1,closed:4,removed:1,closing:9}]};
            PawpalOperationsDashboard.refresh();
        });
        await page.waitForFunction(()=>document.querySelectorAll('[data-ops-panel="logistics"] tbody tr').length===10);
        assert.match(await page.locator('[data-ops-panel="logistics"]').innerText(),/Trả phòng/);
        assert.match(await page.locator('[data-ops-panel="logistics"]').innerText(),/Chặng về/);
        assert.equal(await page.locator('[data-ops-panel="history"] tbody tr').count(),1);
        for(const width of [1440,390]) {
            await page.setViewportSize({width,height:1000});
            for(const panel of ['logistics','history']) await page.locator(`[data-ops-panel="${panel}"]`).screenshot({path:path.join(out,`${panel}-${width}.png`)});
        }
        await page.locator('[data-ops-logistics-pagination]').getByRole('button',{name:'2',exact:true}).click();
        await page.waitForFunction(()=>document.querySelectorAll('[data-ops-panel="logistics"] tbody tr').length===2);
        await page.evaluate(()=>{logisticsFixture=logisticsFixture.slice(0,3);realtimeHandlers.hotel_booking();});
        await page.clock.runFor(1000);
        await page.waitForFunction(()=>document.querySelectorAll('[data-ops-panel="logistics"] tbody tr').length===3);
        assert.equal(await page.locator('[data-ops-logistics-pagination]').isVisible(),false,'A shrinking queue returns to its last valid page');
        await page.evaluate(()=>{logisticsFixture[0].pet_name='Tên bé đã cập nhật';realtimeHandlers.pet_profile();});
        await page.clock.runFor(1000);
        await page.waitForFunction(()=>document.querySelector('[data-ops-panel="logistics"]').textContent.includes('Tên bé đã cập nhật'));
        await page.evaluate(()=>{logisticsFixture[0].owner_id='s1';logisticsFixture[0].owner_name='Nhân viên đã cập nhật';realtimeHandlers.staff();});
        await page.clock.runFor(1000);
        await page.waitForFunction(()=>document.querySelector('[data-ops-panel="logistics"]').textContent.includes('Nhân viên đã cập nhật'));
        await page.evaluate(()=>{historyFixture.rows[0].closing=99;PawpalOperationsDashboard.refresh();});
        await page.waitForFunction(()=>document.querySelector('[data-ops-panel="history"] [data-ops-retry="history"]'));
        assert.equal(await page.locator('[data-ops-panel="history"] tbody').count(),0,'Invalid workflow equation cannot be displayed as a valid total');
        await page.evaluate(()=>{delete window.historyFixture;delete window.logisticsFixture;PawpalOperationsDashboard.refresh();});
        await page.waitForFunction(()=>document.querySelectorAll('[data-ops-panel="logistics"] tbody tr').length===0);
        await page.evaluate(() => {
            fixtures.appointment = [{ id: 'age', appointment_code: 'LH-age', appointment_status: 'pending', created_at: '2026-11-21T02:50:00Z', scheduled_start_at: '2026-11-22T03:00:00Z', items: [] }];
            PawpalOperationsDashboard.refresh();
        });
        await page.waitForFunction(() => !document.querySelector('.is-refreshing'));
        assert.equal(await tasks.count(), 0);
        const ageReads = await page.evaluate(() => reads.length);
        await page.clock.fastForward(6 * 60_000);
        await page.clock.runFor(1000);
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
        await page.clock.runFor(1000);
        assert.equal(await tasks.count(), 1, 'Record enters 24h horizon without DB mutation or refetch');
        assert.equal(await page.evaluate(() => reads.length), horizonReads);
        // Bounded detail reads cannot truncate independently aggregated server KPI totals.
        await page.evaluate(() => {
            fixtures.appointment = Array.from({ length: 5001 }, (_, i) => ({ id: 'cap' + i, appointment_code: 'LH-cap' + i, appointment_status: 'pending', created_at: '2026-11-01T01:00:00Z', scheduled_start_at: '2026-11-21T02:00:00Z', items: [] }));
            PawpalOperationsDashboard.refresh();
        });
        await page.waitForFunction(() => !document.querySelector('.is-refreshing') && document.querySelectorAll('[data-ops-task-id]').length === 10);
        assert.equal(await page.locator('[data-kpi="todayAppointments"] [data-kpi-value]').innerText(), (5001).toLocaleString('vi-VN'));
        assert.match(await page.locator('[data-ops-panel="alerts"] [data-ops-tag]').innerText(), /Hiện tại/);
        await page.evaluate(()=>{failKpis=true;PawpalOperationsDashboard.refresh();});
        await page.waitForFunction(()=>PawpalOperationsDashboard.getState().errors.kpis);
        assert.equal(await page.locator('[data-kpi="todayAppointments"] [data-kpi-value]').innerText(),'—','KPI failure cannot reuse old totals or become zero');
        assert.equal(await tasks.count(),10,'Independent work feed survives KPI failure');
        await page.evaluate(()=>{failKpis=false;});
        await page.locator('[data-ops-retry="kpis"]').click();
        await page.waitForFunction(()=>!PawpalOperationsDashboard.getState().errors.kpis);
        assert.equal(await page.locator('[data-kpi="todayAppointments"] [data-kpi-value]').innerText(),(5001).toLocaleString('vi-VN'));
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
