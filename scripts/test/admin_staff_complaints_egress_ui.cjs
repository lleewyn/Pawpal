const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

// Isolated transport fixture. No credentials, live requests or business writes.
(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        for (const module of ['staff', 'complaints']) {
            const page = await browser.newPage();
            const errors = [];
            page.on('pageerror', error => errors.push(error.message));
            await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<body></body>' }));
            await page.goto('http://localhost:3001/');
            await page.setContent(fs.readFileSync(`pages/admin/modules/${module}/${module}.html`, 'utf8'));
            await page.evaluate(() => {
                window.reads = [];
                window.handlers = {};
                window.readFilters = [];
                sessionStorage.setItem('pawpal_admin_user', JSON.stringify({ id: 'test-actor' }));
                window.getSupabaseClient = () => ({
                    auth: { getUser: async () => ({ data: { user: { id: 'test-actor' } } }) },
                    rpc: async (name, args) => {
                        reads.push(name);
                        if (name === 'admin_complaint_page') return { data: {
                            tickets: [{ id: 'ticket-uuid', customer_id: 'customer-a', category: 'service', status: 'new', subject: 'Test' }],
                            pageIds: ['ticket-uuid'], total: 1, page: 1, kind: args.p_kind, stats: { sNew: 1 }
                        } };
                        return { data: name === 'get_admin_staff_directory' ? window.staffDirectory || [] : [] };
                    },
                    from(table) {
                        const filters = [];
                        const query = {
                            select() { return query; }, order() { return query; },
                            eq(...args) { filters.push(['eq', ...args]); return query; },
                            in(...args) { filters.push(['in', ...args]); return query; },
                            lt(...args) { filters.push(['lt', ...args]); return query; },
                            gt(...args) { filters.push(['gt', ...args]); return query; },
                            gte(...args) { filters.push(['gte', ...args]); return query; },
                            lte(...args) { filters.push(['lte', ...args]); return query; },
                            then(resolve) {
                                reads.push(table); readFilters.push({ table, filters });
                                const rows = table === 'staff_shift_request' ? window.shiftFixture || [] : [];
                                resolve({ data: [], count: rows.filter(row => filters.every(([op, column, value]) => op !== 'eq' || row[column] === value)).length });
                            },
                            limit: async limit => { reads.push(table); readFilters.push({ table, filters, limit }); return { data: [] }; },
                            range: async (start = 0, end = 499) => {
                                reads.push(table);
                                readFilters.push({ table, filters });
                                const tables = {
                                    support_ticket: [{ id: 'ticket-uuid', customer_id: 'customer-a', category: 'service', status: 'new', subject: 'Test' }],
                                    customer: [{ id: 'customer-a' }, { id: 'customer-b' }],
                                    customer_profile: [{ customer_id: 'customer-a', full_name: 'Customer A' }, { customer_id: 'customer-b', full_name: 'Customer B' }]
                                };
                                tables.staff_shift_request = window.shiftFixture || [];
                                const data = (tables[table] || []).filter(row => filters.every(([op, column, value]) => {
                                    if (op === 'eq') return row[column] === value;
                                    if (op === 'in') return value.includes(row[column]);
                                    if (op === 'lt') return row[column] < value;
                                    if (op === 'gt') return row[column] > value;
                                    if (op === 'gte') return row[column] >= value;
                                    if (op === 'lte') return row[column] <= value;
                                    return true;
                                }));
                                return { data: data.slice(start, end + 1), count: data.length };
                            }
                        };
                        return query;
                    },
                    channel() {
                        const channel = {
                            on(event, filter, callback) { handlers[filter.table] = callback; return channel; },
                            subscribe() { return channel; }
                        };
                        return channel;
                    },
                    removeChannel() {}
                });
            });
            await page.addScriptTag({ content: fs.readFileSync('pages/admin/admin-data-store.js', 'utf8') });
            let source = fs.readFileSync(`pages/admin/modules/${module}/${module}.js`, 'utf8');
            source = source.slice(0, source.lastIndexOf("    if (document.readyState === 'loading')"));
            source += module === 'staff'
                ? 'window.qaSetup = setupStaffRealtimeSync;})();'
                : 'window.qaSetup = setupComplaintsRealtimeChannel;})();';
            await page.addScriptTag({ content: source });
            const load = module === 'staff' ? 'PawpalStaff.loadStaffModuleData' : 'PawpalComplaints.loadComplaintsModuleData';
            await page.evaluate(async load => { await eval(load)({ force: true }); }, load);
            const initial = await page.evaluate(() => reads.slice());
            assert.equal(initial.length, module === 'staff' ? 4 : 8, JSON.stringify(initial));
            if (module === 'staff') {
                const schedule = await page.evaluate(() => readFilters.find(q => q.table === 'staff_schedule'));
                assert.ok(schedule.filters.some(f => f[0] === 'lt' && f[1] === 'start_at'));
                assert.ok(schedule.filters.some(f => f[0] === 'gt' && f[1] === 'end_at'));
                const assessment = await page.evaluate(() => readFilters.find(q => q.table === 'staff_assessment'));
                assert.ok(assessment.filters.some(f => f[0] === 'gte' && f[1] === 'assessment_date'));
            } else {
                const scoped = await page.evaluate(() => readFilters.filter(q => ['customer', 'customer_phone', 'customer_profile', 'pet_profile', 'appointment', 'sales_order'].includes(q.table)));
                assert.equal(scoped.length, 6);
                assert.ok(scoped.every(q => q.filters.some(f => f[0] === 'in' && f[2].includes('customer-a'))));
                assert.ok(!initial.includes('product'));
                assert.equal(await page.evaluate(() => PawpalComplaints.state.cachedCustomers.length), 1);
                assert.equal(await page.evaluate(() => PawpalComplaints.state.serviceComplaints[0].customerName), 'Customer A');
            }
            await page.evaluate(async load => { reads.length = 0; await eval(load)(); }, load);
            assert.deepEqual(await page.evaluate(() => reads), [], 'fresh resources must be reused');
            if (module === 'staff') {
                await page.evaluate(async () => {
                    readFilters.length = 0;
                    await Promise.all([
                        PawpalStaff.ensureScheduleRange('2020-01-01T17:00:00.000Z', '2020-01-08T17:00:00.000Z'),
                        PawpalStaff.ensureScheduleRange('2020-01-01T17:00:00.000Z', '2020-01-08T17:00:00.000Z')
                    ]);
                });
                assert.deepEqual(await page.evaluate(() => reads), ['staff_schedule'], 'range navigation must coalesce');
                await page.evaluate(async () => {
                    reads.length = 0;
                    await PawpalStaff.ensureScheduleRange('2020-01-01T17:00:00.000Z', '2020-01-08T17:00:00.000Z');
                    await PawpalStaff.ensureAssessmentHistory('person-a');
                });
                assert.deepEqual(await page.evaluate(() => reads), ['staff_assessment']);
                const history = await page.evaluate(() => readFilters.find(q => q.table === 'staff_assessment'));
                assert.ok(history.filters.some(f => f[0] === 'eq' && f[1] === 'staff_id' && f[2] === 'person-a'));
                await page.evaluate(() => { reads.length = 0; });
            }
            const resource = module === 'staff' ? 'schedules' : 'support_ticket';
            await page.evaluate(async ({ load, resource }) => {
                await eval(load)({ force: true, resources: [resource] });
            }, { load, resource });
            assert.deepEqual(await page.evaluate(() => reads), [module === 'staff' ? 'staff_schedule' : 'admin_complaint_page']);
            await page.evaluate(module => {
                reads.length = 0;
                sessionStorage.setItem('pawpal_admin_active_module', module === 'staff' ? 'Nhân sự' : 'Khiếu nại');
                qaSetup();
            }, module);
            if (module === 'complaints') {
                await page.evaluate(() => handlers.support_ticket_message({ new: { ticket_id: 'other-ticket' } }));
                await page.waitForTimeout(450);
                assert.deepEqual(await page.evaluate(() => reads), [], 'a message must not reload directories');
                await page.evaluate(() => {
                    handlers.support_ticket({ new: {} });
                    handlers.customer_profile({ new: {} });
                    handlers.support_ticket_message({ new: { ticket_id: 'other-ticket' } });
                });
                await page.waitForTimeout(450);
                assert.deepEqual((await page.evaluate(() => reads)).sort(), ['admin_complaint_page', 'customer_profile']);
                await page.addScriptTag({ content: fs.readFileSync('pages/admin/modules/complaints/subtabs/tab-complaint-detail.js', 'utf8') });
                await page.evaluate(async () => {
                    reads.length = 0;
                    PawpalComplaints.state.serviceComplaints = [{ id: 'TICKET-code', rawId: 'ticket-uuid', status: 'new', title: 'Test', customerName: 'Test', priority: 'low' }];
                    PawpalComplaints.state.currentTicketId = 'TICKET-code';
                    await PawpalComplaints.subtabs.detail.renderTicketDetail('TICKET-code');
                });
                assert.deepEqual((await page.evaluate(() => reads)).sort(), ['audit_log', 'support_ticket_message']);
                await page.evaluate(async () => {
                    reads.length = 0;
                    await PawpalComplaints.subtabs.detail.renderTicketDetail('TICKET-code');
                });
                assert.deepEqual(await page.evaluate(() => reads), [], 'reopening a fresh ticket must reuse history');
                await page.evaluate(() => handlers.support_ticket_message({ new: { ticket_id: 'ticket-uuid' } }));
                await page.waitForTimeout(450);
                assert.deepEqual((await page.evaluate(() => reads)).sort(), ['audit_log', 'support_ticket_message'], 'raw ticket IDs must refresh the open coded ticket without directory reads');
                await page.evaluate(async load => {
                    reads.length = 0;
                    readFilters.length = 0;
                    await eval(load)({ directoryFull: true });
                }, load);
                assert.equal(await page.evaluate(() => PawpalComplaints.state.fullDirectoryLoaded), true);
                assert.equal(await page.evaluate(() => PawpalComplaints.state.cachedCustomers.length), 2, 'new complaints can select customers without prior tickets');
                const directory = await page.evaluate(() => readFilters.filter(q => ['customer', 'appointment', 'sales_order'].includes(q.table)));
                assert.equal(directory.length, 3);
                assert.ok(directory.every(q => q.filters.length === 0), 'create form must retain access to people and sources without existing complaints');
            } else {
                await page.evaluate(() => {
                    handlers.staff_schedule({ new: {} });
                    handlers.staff_assessment({ new: {} });
                });
                await page.waitForTimeout(450);
                assert.deepEqual((await page.evaluate(() => reads)).sort(), ['staff_assessment', 'staff_schedule']);
                await page.evaluate(async () => {
                    reads.length = 0;
                    readFilters.length = 0;
                    window.staffDirectory = [{ staff_record: { id: 'person-a', full_name: 'Person A', employment_status: 'active' }, roles: [] }];
                    await PawpalStaff.loadStaffModuleData({ force: true });
                });
                const bounded = await page.evaluate(() => readFilters.filter(q => q.limit));
                assert.equal(bounded.length, 3, 'one person needs only next/last shift and latest assessment summaries');
                assert.ok(bounded.every(q => q.limit === 1 && q.filters.some(f => f[0] === 'eq' && f[1] === 'staff_id' && f[2] === 'person-a')));
                for (const name of ['profile', 'schedule', 'assessment']) {
                    await page.addScriptTag({ content: fs.readFileSync(`pages/admin/modules/staff/subtabs/tab-staff-${name}.js`, 'utf8') });
                }
                await page.evaluate(() => {
                    sessionStorage.setItem('pawpal_admin_active_module', 'Nhân sự');
                    document.querySelector('#subtab-tab-staff-profile').classList.add('active');
                    PawpalStaff.state.selectedStaffId = 'person-a';
                    PawpalStaff.subtabs.profile.renderStaffProfile('person-a');
                });
                await page.waitForFunction(() => PawpalStaff.hasAssessmentHistory('person-a'));
                await page.evaluate(() => {
                    document.querySelector('#subtab-tab-staff-assessment').classList.add('active');
                    PawpalStaff.subtabs.assessment.renderAssessmentList();
                });
                await page.waitForFunction(() => PawpalStaff.hasAssessmentHistory());
                await page.evaluate(() => {
                    document.querySelector('#subtab-tab-staff-schedule').classList.add('active');
                    document.querySelector('#scheduleDatePicker').value = '2020-02-10';
                    document.querySelector('#scheduleDatePicker').dispatchEvent(new Event('change'));
                });
                await page.waitForFunction(() => !document.getElementById('scheduleTableBody').textContent.includes('Đang tải'));
                await page.evaluate(async () => {
                    window.shiftFixture = Array.from({ length: 23 }, (_, i) => ({ id: 'request-' + i, staff_id: 'person-a',
                        request_type: 'LEAVE', start_date: '2026-10-25', end_date: '2026-10-25', shift: 'ALL',
                        status: i % 2 ? 'approved' : 'pending', reason: 'Fixture request', created_at: '2026-10-25' }));
                    await PawpalStaff.loadStaffModuleData({ force: true });
                    PawpalStaff.subtabs.schedule.openLeaveRequestsTrayModal();
                });
                await page.waitForFunction(() => document.querySelectorAll('#leaveRequestsListContainer .leave-request-card').length === 10);
                const pending = await page.evaluate(() => PawpalStaff.state.pendingShiftRequestCount);
                assert.equal(pending, 12, 'pending count must describe all pages');
                await page.locator('#staffRequestPager button', { hasText: '3' }).click();
                await page.waitForFunction(() => document.querySelectorAll('#leaveRequestsListContainer .leave-request-card').length === 3);
                await page.evaluate(() => PawpalStaff.subtabs.schedule.renderLeaveRequestsList('PENDING'));
                await page.waitForFunction(() => document.querySelectorAll('#leaveRequestsListContainer .leave-request-card').length === 10);
                assert.equal(await page.locator('#leaveRequestsListContainer .badge-success').count(), 0);
            }
            await page.evaluate(module => {
                reads.length = 0;
                sessionStorage.setItem('pawpal_admin_active_module', 'another-module');
                handlers[module === 'staff' ? 'staff_schedule' : 'support_ticket']({ new: {} });
            }, module);
            await page.waitForTimeout(450);
            assert.deepEqual(await page.evaluate(() => reads), [], 'inactive modules must not fetch');
            assert.deepEqual(errors, []);
            console.log('PASS', module, 'resource cache, targeted refresh, mixed Realtime burst and inactive deferral.');
            await page.close();
        }
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
