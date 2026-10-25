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
                        if (name === 'admin_staff_schedule_summary') return { data: window.scheduleFixture || [] };
                        if (name === 'admin_staff_directory_summary') return { data: (window.staffDirectory || []).map(entry => {
                            const s = entry.staff_record;
                            return { staff_record: { id: s.id, full_name: s.full_name, job_title: s.job_title,
                                employment_status: s.employment_status, service_locked: s.service_locked } };
                        }) };
                        if (name === 'admin_staff_list_page') {
                            readFilters.push({ table: name, args });
                            const filters = args.p_filters || {};
                            const query = (filters.query || '').toLowerCase();
                            const rows = (window.staffDirectory || []).filter(entry => {
                                const s = entry.staff_record;
                                const status = ({ active: 'ACTIVE', leave: 'LEAVE', paused: 'PAUSE', resigned: 'RESIGNED' })[s.employment_status];
                                return (!query || [s.id,s.full_name,s.phone_number,s.email,s.job_title].some(value => String(value || '').toLowerCase().includes(query)))
                                    && (!filters.status || filters.status === 'ALL' || filters.status === status)
                                    && (!filters.locked || s.service_locked);
                            });
                            const page = Math.min(Math.max(1, args.p_page), Math.max(1, Math.ceil(rows.length / 10)));
                            return { data: { rows: rows.slice((page - 1) * 10, page * 10).map(entry => ({ auth_linked: false, ...entry })), total: rows.length, page } };
                        }
                        if (name === 'admin_staff_directory_page') {
                            readFilters.push({ table: name, args });
                            return { data: (window.staffDirectory || []).filter(entry => args.p_ids.includes(entry.staff_record.id)).map(entry => ({ auth_linked: false, ...entry })) };
                        }
                        if (name === 'admin_staff_assessment_summary') {
                            const seen = new Set();
                            return { data: (window.assessmentFixture || []).filter(row => {
                                if (seen.has(row.staff_id)) return false;
                                seen.add(row.staff_id); return true;
                            }) };
                        }
                        if (name === 'admin_staff_assessment_page') {
                            readFilters.push({ table: name, args });
                            const normalize = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd');
                            const query = normalize(args.p_query || '');
                            const rows = (window.assessmentFixture || []).filter(row => {
                                const person = (window.staffDirectory || []).find(entry => entry.staff_record.id === row.staff_id);
                                return (!args.p_staff_id || row.staff_id === args.p_staff_id)
                                    && (args.p_type === 'ALL' || row.assessment_type === args.p_type)
                                    && (args.p_result === 'ALL' || row.result === args.p_result)
                                    && (!query || normalize(person?.staff_record.full_name || '').includes(query) || row.id.includes(query) || row.staff_id.includes(query));
                            });
                            const page = Math.min(Math.max(1, args.p_page), Math.max(1, Math.ceil(rows.length / 10)));
                            return { data: { rows: rows.slice((page - 1) * 10, page * 10), total: rows.length, page } };
                        }
                        if (name === 'admin_complaint_page') return { data: {
                            tickets: [{ id: 'ticket-uuid', customer_id: 'customer-a', category: 'service', status: 'new', subject: 'Test' }],
                            pageIds: ['ticket-uuid'], total: 1, page: 1, kind: args.p_kind, stats: { sNew: 1 }
                        } };
                        return { data: name === 'get_admin_staff_directory' ? window.staffDirectory || [] : [] };
                    },
                    from(table) {
                        const filters = [];
                        let embeddedLimit = null;
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
                            limit(limit, options) {
                                if (options?.foreignTable) { embeddedLimit = limit; return query; }
                                reads.push(table); readFilters.push({ table, filters, limit });
                                return Promise.resolve({ data: [] });
                            },
                            range: async (start = 0, end = 499) => {
                                reads.push(table);
                                readFilters.push({ table, filters, embeddedLimit });
                                const tables = {
                                    support_ticket: [{ id: 'ticket-uuid', customer_id: 'customer-a', category: 'service', status: 'new', subject: 'Test' }],
                                    customer: [{ id: 'customer-a' }, { id: 'customer-b' }],
                                    customer_profile: [{ customer_id: 'customer-a', full_name: 'Customer A' }, { customer_id: 'customer-b', full_name: 'Customer B' }]
                                };
                                tables.staff_shift_request = window.shiftFixture || [];
                                tables.staff_schedule = window.scheduleFixture || [];
                                tables.staff_assessment = window.assessmentFixture || [];
                                tables.staff = (window.staffDirectory || []).map(entry => ({ id: entry.staff_record.id,
                                    latest: (window.assessmentFixture || []).filter(row => row.staff_id === entry.staff_record.id).slice(0, embeddedLimit || 1) }));
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
                assert.ok(initial.includes('admin_staff_schedule_summary'));
                assert.ok(initial.includes('admin_staff_assessment_summary'));
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
            assert.deepEqual(await page.evaluate(() => reads), [module === 'staff' ? 'admin_staff_schedule_summary' : 'admin_complaint_page']);
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
                assert.deepEqual((await page.evaluate(() => reads)).sort(), ['admin_staff_assessment_summary', 'admin_staff_schedule_summary']);
                await page.evaluate(async () => {
                    reads.length = 0;
                    readFilters.length = 0;
                    window.staffDirectory = [{ staff_record: { id: 'person-a', full_name: 'Person A', employment_status: 'active' }, roles: [] }];
                    await PawpalStaff.loadStaffModuleData({ force: true });
                });
                const bounded = await page.evaluate(() => readFilters.filter(q => q.limit));
                assert.equal(bounded.length, 0, 'summaries must not issue per-person HTTP reads');
                assert.equal(await page.evaluate(() => reads.filter(name => name === 'admin_staff_assessment_summary').length), 1,
                    'latest assessments and monthly KPI share one summary request');
                await page.evaluate(async () => {
                    const now = Date.now();
                    window.scheduleFixture = [
                        { id: 'completed', start_at: new Date(now - 3600000).toISOString(), end_at: new Date(now - 1800000).toISOString() },
                        { id: 'upcoming', start_at: new Date(now + 1800000).toISOString(), end_at: new Date(now + 3600000).toISOString() }
                    ].map(row => ({ ...row, staff_id: 'person-a', schedule_status: 'active', availability_status: 'available' }));
                    readFilters.length = 0;
                    await PawpalStaff.loadStaffModuleData({ force: true });
                });
                assert.equal(await page.evaluate(() => readFilters.filter(q => q.table === 'staff_schedule' && q.limit).length), 0,
                    'month shifts must satisfy nearest/last summaries without extra requests');
                await page.evaluate(async () => {
                    window.scheduleFixture = [];
                    await PawpalStaff.loadStaffModuleData({ force: true });
                });
                for (const name of ['profile', 'schedule', 'assessment']) {
                    await page.addScriptTag({ content: fs.readFileSync(`pages/admin/modules/staff/subtabs/tab-staff-${name}.js`, 'utf8') });
                }
                await page.evaluate(() => {
                    sessionStorage.setItem('pawpal_admin_active_module', 'Nhân sự');
                    document.querySelector('#subtab-tab-staff-profile').classList.add('active');
                    PawpalStaff.state.selectedStaffId = 'person-a';
                    PawpalStaff.subtabs.profile.renderStaffProfile('person-a');
                });
                await page.waitForFunction(() => document.querySelector('#viewStaffAssessmentHistory')?.textContent.includes('Chưa có'));
                await page.evaluate(async () => {
                    window.assessmentFixture = Array.from({ length: 23 }, (_, i) => ({ id: 'assessment-' + String(i).padStart(2, '0'),
                        staff_id: 'person-a', assessment_date: '2020-01-01', created_at: '2020-01-01',
                        assessment_type: i % 2 ? 'OTHER' : 'SKILL', score: 80, result: i % 2 ? 'FAIL' : 'PASS' }));
                    await PawpalStaff.loadStaffModuleData({ force: true });
                    document.querySelector('#subtab-tab-staff-assessment').classList.add('active');
                    await PawpalStaff.subtabs.assessment.renderAssessmentList();
                });
                assert.equal(await page.locator('#assessmentListTableBody tr').count(), 10);
                await page.locator('#assessmentPagination button[data-page="3"]').click();
                await page.waitForFunction(() => document.querySelectorAll('#assessmentListTableBody tr').length === 3);
                const assessmentPage = await page.evaluate(() => PawpalStaff.getAssessmentPage({ type: 'SKILL', result: 'PASS', page: 2 }));
                assert.equal(assessmentPage.total, 12);
                assert.equal(assessmentPage.rows.length, 2);
                const searched = await page.evaluate(() => PawpalStaff.getAssessmentPage({ query: 'assessment-22' }));
                assert.equal(searched.total, 1);
                assert.equal(searched.rows[0].id, 'assessment-22');
                const byName = await page.evaluate(() => PawpalStaff.getAssessmentPage({ query: 'Person A', page: 3 }));
                assert.equal(byName.total, 23);
                assert.equal(byName.rows.length, 3);
                await page.evaluate(async () => PawpalStaff.subtabs.profile.renderStaffProfile('person-a'));
                assert.equal(await page.locator('#viewStaffAssessmentHistory .staff-profile-assessment').count(), 10);
                const beforeCachedPage = await page.evaluate(() => reads.length);
                await page.evaluate(() => PawpalStaff.getAssessmentPage({ type: 'SKILL', result: 'PASS', page: 2 }));
                assert.equal(await page.evaluate(() => reads.length), beforeCachedPage, 'reopening a fresh filtered page must reuse cache');
                await page.evaluate(() => {
                    document.querySelector('#subtab-tab-staff-schedule').classList.add('active');
                    document.querySelector('#scheduleDatePicker').value = '2020-02-10';
                    document.querySelector('#scheduleDatePicker').dispatchEvent(new Event('change'));
                });
                await page.waitForFunction(() => !document.getElementById('scheduleTableBody').textContent.includes('Đang tải'));
                await page.locator('#btnScheduleViewWeek').click();
                await page.waitForFunction(() => document.querySelector('#scheduleWeekViewWrapper .staff-calendar-day')?.dataset.date === '2020-02-10');
                assert.match(await page.locator('#scheduleWeekViewWrapper .staff-calendar-day-title').first().textContent(), /10[\/\-]02/,
                    'week dates must use Bangkok time even when the browser runs in UTC');
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
                await page.addScriptTag({ content: fs.readFileSync('pages/admin/modules/staff/subtabs/tab-staff-list.js', 'utf8') });
                await page.evaluate(async () => {
                    window.staffDirectory.push(...Array.from({ length: 22 }, (_, i) => ({ staff_record: {
                        id: 'person-' + i, full_name: 'Person ' + i, employment_status: 'active'
                    }, roles: [] })));
                    await PawpalStaff.loadStaffModuleData({ force: true });
                    await PawpalStaff.subtabs.list.renderStaffList();
                });
                assert.equal(await page.locator('#staffListTableBody tr').count(), 10);
                await page.locator('#staffPagination button[data-page="3"]').click();
                await page.waitForFunction(() => document.querySelectorAll('#staffListTableBody tr').length === 3);
                const beforeVisibleDetails = await page.evaluate(() => reads.length);
                await page.evaluate(() => PawpalStaff.ensureStaffDetails(['person-21']));
                assert.equal(await page.evaluate(() => reads.length), beforeVisibleDetails,
                    'opening a freshly displayed employee must reuse its full details');
                assert.ok(await page.evaluate(() => readFilters.filter(q => q.table === 'admin_staff_directory_page')
                    .every(q => q.args.p_ids.length <= 10)), 'detail requests must never exceed one page');
                assert.equal(await page.evaluate(() => reads.includes('get_admin_staff_directory')), false,
                    'the browser must not download the full account directory');
                const nameFiltered = await page.evaluate(() => PawpalStaff.getStaffPage({ query: 'Person A' }, 99));
                assert.equal(nameFiltered.total, 1);
                assert.equal(nameFiltered.page, 1);
                const noStaff = await page.evaluate(() => PawpalStaff.getStaffPage({ query: '__missing_person__' }, 99));
                assert.equal(noStaff.total, 0);
                assert.equal(noStaff.page, 1);
                await page.evaluate(() => {
                    window.exportedCsv = null;
                    URL.createObjectURL = blob => { blob.text().then(text => window.exportedCsv = text); return 'blob:test-export'; };
                    URL.revokeObjectURL = () => {};
                    HTMLAnchorElement.prototype.click = function() {};
                });
                await page.locator('#btnExportStaff').click();
                await page.waitForFunction(() => exportedCsv !== null);
                assert.equal(await page.evaluate(() => exportedCsv.trim().split('\n').length), 24,
                    'CSV must contain all 23 staff plus its header, regardless of visible page');
                assert.equal(await page.evaluate(() => reads.includes('staff_assessment') && readFilters.some(q => q.table === 'staff_assessment' && !q.filters.length)), false,
                    'assessment search must never download an unfiltered identifier index');
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
