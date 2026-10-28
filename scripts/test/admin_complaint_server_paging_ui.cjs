const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');

(async () => {
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<body></body>' }));
        await page.goto('http://localhost:3001/');
        await page.setContent('<div class="admin-module-wrapper">' + fs.readFileSync('pages/admin/modules/complaints/complaints.html', 'utf8') + '</div>');
        await page.evaluate(() => {
            sessionStorage.clear();
            sessionStorage.setItem('pawpal_admin_user', JSON.stringify({ id: 'actor' }));
            sessionStorage.setItem('pawpal_admin_active_module', 'Khiếu nại');
            window.calls = [];
            window.rows = Array.from({ length: 35 }, (_, i) => ({
                id: '00000000-0000-0000-0000-' + String(i).padStart(12, '0'), ticket_code: 'TICKET-' + i,
                category: i < 23 ? 'service' : 'order', type: i < 23 ? 'service' : 'order', status: 'new', priority: 'medium',
                customer_id: 'customer-a', subject: 'Issue ' + i, description: 'Content ' + i,
                created_at: '2026-10-25T00:00:00Z', updated_at: 'v1',
                _export: { customerName: 'Customer A', phone: '0901234567', serviceName: 'Bath', staffAssigned: 'Chưa phân công' }
            }));
            window.getSupabaseClient = () => ({
                auth: { getUser: async () => ({ data: { user: { id: 'actor' } } }) },
                rpc: async (name, args) => {
                    calls.push({ name, args });
                    if (window.failPage) return { error: { message: 'fixture failure' } };
                    const filters = args.p_filters || {};
                    if (window.delayPage) await new Promise(resolve => setTimeout(resolve, filters.query === 'Issue 1' ? 100 : 5));
                    const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase().trim().replace(/\s+/g,' ');
                    const matching = rows.filter(row => row.category === args.p_kind && (!filters.query || normalize(row.subject+' '+row._export.customerName).includes(normalize(filters.query)))
                        && (!filters.status || filters.status === 'ALL' || row.status === filters.status) && (!filters.priority || filters.priority === 'ALL' || row.priority === filters.priority));
                    const number = Math.min(args.p_page, Math.max(1, Math.ceil(matching.length / args.p_size)));
                    const tickets = matching.slice((number - 1) * args.p_size, number * args.p_size);
                    const context = rows.find(row => row.id === args.p_context || row.ticket_code === args.p_context);
                    return { data: { kind: args.p_kind, total: matching.length, page: number,
                        pageIds: tickets.map(row => row.id), tickets: context && !tickets.some(row => row.id === context.id) ? [...tickets, context] : window.reverseTickets?[...tickets].reverse():tickets,
                        stats: { sNew: 23, sProc: 0, sWait: 0, sHigh: 0, oNew: 12, oProc: 0, oRma: 0, oWait: 0, oRef: 0 }
                    } };
                },
                from(table) {
                    const query = {
                        select() { return query; }, order() { return query; }, eq() { return query; }, in() { return query; },
                        range: async () => ({ data: ({ customer: [{ id: 'customer-a' }],
                            customer_profile: [{ customer_id: 'customer-a', full_name: 'Customer A' }],
                            customer_phone: [{ customer_id: 'customer-a', phone_number: '0901234567', is_primary: true }],
                            staff: [{ id: 'staff-a', auth_user_id: 'actor', full_name: 'Staff A' }]
                        })[table] || [] })
                    };
                    return query;
                },
                channel() { const channel = { on() { return channel; }, subscribe() { return channel; } }; return channel; },
                removeChannel() {}
            });
        });
        await page.addScriptTag({ content: fs.readFileSync('pages/admin/admin-data-store.js', 'utf8') });
        let core = fs.readFileSync('pages/admin/modules/complaints/complaints.js', 'utf8');
        core = core.slice(0, core.lastIndexOf("    if (document.readyState === 'loading')")) + '})();';
        await page.addScriptTag({ content: core });
        await page.evaluate(() => PawpalComplaints.loadComplaintsModuleData({ force: true }));
        for (const name of ['services', 'orders']) await page.addScriptTag({ content: fs.readFileSync(`pages/admin/modules/complaints/subtabs/tab-complaint-${name}.js`, 'utf8') });
        await page.waitForFunction(() => document.querySelectorAll('#serviceComplaintsTableBody tr[data-ticket-id]').length === 10);
        assert.equal(await page.locator('#statServiceNew').textContent(), '23');
        assert.equal(await page.evaluate(() => calls.length), 1);
        await page.click('#servicePagination [data-page="2"]');
        await page.waitForFunction(() => document.querySelector('#serviceComplaintsTableBody tr')?.dataset.ticketId === 'TICKET-10');
        assert.equal(await page.evaluate(() => calls.length), 2);
        await page.click('#servicePagination [data-page="1"]');
        await page.waitForFunction(() => document.querySelector('#serviceComplaintsTableBody tr')?.dataset.ticketId === 'TICKET-0');
        assert.equal(await page.evaluate(() => calls.length), 2, 'returning to a cached page must not call the RPC');
        await page.fill('#serviceSearchInput', 'Issue 22');
        await page.waitForFunction(() => document.querySelectorAll('#serviceComplaintsTableBody tr[data-ticket-id]').length === 1);
        assert.equal(await page.locator('#serviceComplaintsTableBody tr').getAttribute('data-ticket-id'), 'TICKET-22');
        assert.equal(await page.locator('#statServiceNew').textContent(), '23', 'search must not change global KPIs');
        await page.fill('#serviceSearchInput', '');
        await page.waitForFunction(() => document.querySelectorAll('#serviceComplaintsTableBody tr[data-ticket-id]').length === 10);
        const downloadPromise = page.waitForEvent('download');
        await page.click('#btnExportServiceComplaints');
        const download = await downloadPromise;
        const csv = fs.readFileSync(await download.path(), 'utf8');
        assert.equal(csv.trim().split('\n').length, 24, 'export must contain every filtered result, not only the page');
        await page.evaluate(() => PawpalComplaints.openTicketDetail('TICKET-22'));
        assert.ok(await page.evaluate(() => PawpalComplaints.state.serviceComplaints.some(row => row.id === 'TICKET-22')));
        await page.evaluate(() => {
            document.querySelectorAll('.subtab-content').forEach(el => el.classList.toggle('active', el.id === 'subtab-tab-complaint-orders'));
            PawpalComplaints.subtabs.orders.renderOrderComplaintsTable();
        });
        await page.waitForFunction(() => document.querySelectorAll('#orderComplaintsTableBody tr[data-ticket-id]').length === 10);
        assert.equal(await page.locator('#statOrderNew').textContent(), '12');
        await page.click('#orderPagination [data-page="2"]');
        await page.waitForFunction(() => document.querySelectorAll('#orderComplaintsTableBody tr[data-ticket-id]').length === 2);
        await page.evaluate(async () => {
            window.delayPage = true;
            const search = document.querySelector('#orderSearchInput');
            search.value = 'Issue 1';
            const slow = PawpalComplaints.subtabs.orders.renderOrderComplaintsTable();
            search.value = 'Issue 30';
            const fast = PawpalComplaints.subtabs.orders.renderOrderComplaintsTable();
            await Promise.all([slow, fast]);
        });
        await page.waitForFunction(() => document.querySelector('#orderComplaintsTableBody tr')?.dataset.ticketId === 'TICKET-30');
        await page.evaluate(async () => {
            window.failPage = true;
            await PawpalComplaints.loadComplaintsModuleData({ force: true });
        });
        assert.equal(await page.locator('#orderPagination button').count(), 0, 'failure must clear old pagination');
        await page.evaluate(async () => {
            window.failPage = false;
            await PawpalComplaints.loadComplaintsModuleData({ force: true });
        });
        await page.waitForFunction(() => document.querySelector('#orderComplaintsTableBody tr')?.dataset.ticketId === 'TICKET-30');
        await page.evaluate(async()=>{
            window.delayPage=false;window.reverseTickets=true;rows.forEach((row,i)=>{if(row.category==='service'){row.status=i<12?'processing':'new';row._export.customerName='Nguyễn Lê Thị';}});
            document.querySelectorAll('.subtab-content').forEach(el=>el.classList.toggle('active',el.id==='subtab-tab-complaint-services'));
            await PawpalComplaints.loadComplaintsModuleData({force:true});
        });
        await page.click('[data-service-kpi="processing"]');await page.waitForFunction(()=>document.querySelectorAll('#serviceComplaintsTableBody tr[data-ticket-id]').length===10);
        assert.equal(await page.locator('#serviceFilterStatus').inputValue(),'processing');assert.equal(await page.locator('#serviceQuickChips [data-filter="ALL"]').evaluate(node=>node.classList.contains('active')),false);
        assert.equal(await page.locator('#serviceComplaintsTableBody tr[data-ticket-id]').first().getAttribute('data-ticket-id'),'TICKET-0','server pageIds order must survive reversed ticket payload');
        await page.fill('#serviceSearchInput',' nguyen  le thi ');await page.waitForFunction(()=>calls.at(-1).args.p_filters.query==='nguyen le thi');await page.waitForFunction(()=>document.querySelectorAll('#serviceComplaintsTableBody tr[data-ticket-id]').length===10);
        await page.click('#servicePagination [data-page="2"]');await page.waitForFunction(()=>document.querySelectorAll('#serviceComplaintsTableBody tr[data-ticket-id]').length===2);assert.equal(await page.locator('#serviceFilterStatus').inputValue(),'processing');assert.equal(await page.evaluate(()=>calls.at(-1).args.p_filters.status),'processing');assert.equal(await page.evaluate(()=>calls.at(-1).args.p_filters.query),'nguyen le thi');
        await page.selectOption('#serviceFilterStatus','new');await page.waitForFunction(()=>document.querySelectorAll('#serviceComplaintsTableBody tr[data-ticket-id]').length===10);assert.equal(await page.locator('[data-service-kpi="new"]').evaluate(node=>node.classList.contains('active')),true);assert.equal(await page.locator('[data-service-kpi="processing"]').evaluate(node=>node.classList.contains('active')),false);
        await page.click('#serviceQuickChips [data-filter="WAITING_MANAGER"]');assert.equal(await page.locator('#serviceFilterStatus').inputValue(),'waiting_manager_approval');assert.equal(await page.locator('#serviceQuickChips [data-filter="WAITING_MANAGER"]').evaluate(node=>node.classList.contains('active')),true);
        assert.deepEqual(errors, []);
        console.log('PASS complaints server pages, page cache, global KPIs, search, full export, off-page context and order page 2; mock RPC only.');
    } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
