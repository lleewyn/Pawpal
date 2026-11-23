// Smoke test Dashboard against the existing Admin session/RLS.
// All business mutations are blocked. Never print credentials or record contents.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async () => {
    const useProductionAssets = process.argv.includes('--production');
    const credentialPath = process.env.PAWPAL_ADMIN_TEST_CREDENTIALS || 'D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt';
    const secret = fs.readFileSync(credentialPath, 'utf8');
    const email = secret.match(/^Email: (.+)$/m)?.[1].trim(), password = secret.match(/^Password: (.+)$/m)?.[1].trim();
    assert(email && password, 'Admin test credential format unavailable');
    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
        page.setDefaultTimeout(25000);
        const captureAudit = async stage => {
            if (!process.env.DASHBOARD_VISUAL_AUDIT) return;
            const folder = path.resolve('artifacts/dashboard-live-design', process.env.DASHBOARD_VISUAL_AUDIT);
            fs.mkdirSync(folder, { recursive: true });
            for (const width of [1440, 1138, 390]) {
                await page.setViewportSize({ width, height: 1000 });
                await page.evaluate(()=>{document.querySelector('.admin-preview-content').scrollTop=0;});
                await page.screenshot({path:path.join(folder,`${stage}-${width}-top.png`)});
                if(stage!=='customers'&&width!==1138) {
                    const cards=await page.evaluate(stage=>{
                        const selector=stage==='operations'?'.ops-kpis,[data-ops-panel]':'.biz-kpis,.biz-grid > .admin-card';
                        return [...document.querySelectorAll(selector)].filter(node=>node.getClientRects().length).map((node,index)=>{
                            const key=`${stage}-card-${String(index+1).padStart(2,'0')}`;node.dataset.visualAuditId=key;
                            return {key,title:node.querySelector('h3')?.textContent||node.getAttribute('aria-label')||'KPI'};
                        });
                    },stage);
                    fs.writeFileSync(path.join(folder,`${stage}-cards.txt`),cards.map(card=>`${card.key}: ${card.title}`).join('\n'));
                    for(const card of cards) {
                        const dimensions=await page.evaluate(key=>{
                            const scroller=document.querySelector('.admin-preview-content'),node=document.querySelector(`[data-visual-audit-id="${key}"]`);
                            const offset=scroller.scrollTop+node.getBoundingClientRect().top-scroller.getBoundingClientRect().top-12;
                            return {offset,height:node.getBoundingClientRect().height,step:scroller.clientHeight-36};
                        },card.key);
                        for(let part=0;part<Math.ceil(dimensions.height/dimensions.step);part++) {
                            await page.evaluate(y=>{document.querySelector('.admin-preview-content').scrollTop=y;},dimensions.offset+part*dimensions.step);
                            const clip=await page.evaluate(key=>{
                                const node=document.querySelector(`[data-visual-audit-id="${key}"]`).getBoundingClientRect(),scroller=document.querySelector('.admin-preview-content').getBoundingClientRect();
                                const x=Math.max(0,node.left),y=Math.max(scroller.top,node.top);
                                return {x,y,width:Math.min(innerWidth,node.right)-x,height:Math.min(innerHeight,scroller.bottom,node.bottom)-y};
                            },card.key);
                            await page.screenshot({path:path.join(folder,`${card.key}-${width}-${part+1}.png`),clip});
                        }
                    }
                }
                if(width<=640) {
                    const contained=await page.evaluate(()=>{const header=document.querySelector('.admin-header').getBoundingClientRect();return ['.admin-header-left','.admin-header-right'].every(selector=>{const child=document.querySelector(selector).getBoundingClientRect();return child.top>=header.top&&child.bottom<=header.bottom;});});
                    assert(contained,'Shared mobile header must contain both navigation and actions');
                }
                if(stage==='business') {
                    await page.evaluate(()=>{const scroller=document.querySelector('.admin-preview-content'),card=document.querySelector('[data-finance-root]');scroller.scrollTop+=card.getBoundingClientRect().top-scroller.getBoundingClientRect().top-12;});
                    await page.screenshot({path:path.join(folder,`${stage}-${width}-finance.png`)});
                }
                if(stage!=='customers'&&width!==1138) {
                    const size=await page.evaluate(()=>{const scroller=document.querySelector('.admin-preview-content');return {height:scroller.clientHeight,total:scroller.scrollHeight};});
                    let index=0;
                    for(let offset=0;offset<size.total;offset+=Math.max(200,size.height-100)) {
                        await page.evaluate(y=>{document.querySelector('.admin-preview-content').scrollTop=y;},offset);
                        await page.screenshot({path:path.join(folder,`${stage}-${width}-section-${++index}.png`)});
                    }
                }
                const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
                assert.equal(overflow,false,`No viewport overflow: ${stage}/${width}`);
                if(stage==='business'&&width===390) {
                    const readable=await page.evaluate(()=>({
                        comparison:document.querySelector('.biz-comparison-chart').getBoundingClientRect().width,
                        centerFits:[...document.querySelectorAll('.biz-donut-center')].every(node=>node.scrollWidth<=node.clientWidth+1),
                        rankingFits:[...document.querySelectorAll('.biz-table-wrap .admin-table')].every(node=>node.scrollWidth<=node.parentElement.clientWidth+1)
                    }));
                    assert(readable.comparison>=280&&readable.centerFits&&readable.rankingFits,'Mobile charts and ranking values must remain readable: '+JSON.stringify(readable));
                }
            }
            await page.setViewportSize({width:1440,height:1000});
        };
        const errors = [], writes = [], reads = new Set();
        page.on('pageerror', error => errors.push((error.stack || error.message).split('\n').slice(0, 4).join('\n')));
        const readRpcs = new Set(['get_staff_login_context', 'admin_customer_page', 'get_admin_dashboard_cashflow', 'admin_business_metric', 'get_admin_dashboard_plan', 'own_complaint_reply_notices', 'admin_booking_restrictions', 'admin_dashboard_business_analysis', 'admin_dashboard_transaction_page', 'admin_dashboard_work_history', 'admin_dashboard_logistics_page', 'admin_dashboard_order_clocks', 'admin_dashboard_work_page', 'admin_dashboard_cash_page']);
        readRpcs.add('admin_dashboard_analysis_page');
        readRpcs.add('admin_dashboard_operation_totals');
        readRpcs.add('admin_dashboard_order_status_counts');
        ['admin_finance_report','admin_finance_page','admin_finance_lookup'].forEach(name=>readRpcs.add(name));
        ['get_admin_sales_order_page','get_admin_sales_product_page','get_admin_sales_order_history','get_admin_service_booking_page','admin_service_catalog_summary','admin_service_review_page','admin_service_review_summary','get_staff_workspace','admin_booking_directory','admin_service_staff_candidates','get_staff_booking_catalog','list_intake_media','list_handover_media'].forEach(name=>readRpcs.add(name));
        await page.route('**/rest/v1/**', route => {
            const request = route.request(), url = new URL(request.url());
            const rpc = url.pathname.split('/rpc/')[1];
            if (!['GET', 'HEAD'].includes(request.method()) && !readRpcs.has(rpc)) {
                writes.push(url.pathname); return route.abort();
            }
            reads.add(url.pathname); return route.continue();
        });
        if (!useProductionAssets) await page.route('**/pages/admin/**', route => {
            const pathname = new URL(route.request().url()).pathname;
            if (pathname !== '/pages/admin/admin.js' && !pathname.startsWith('/pages/admin/modules/dashboard/') && !pathname.startsWith('/pages/admin/modules/services/') && !pathname.startsWith('/pages/admin/modules/orders/') && !pathname.endsWith('.css')) return route.continue();
            const local = path.resolve('.' + pathname);
            if (!fs.existsSync(local) || !fs.statSync(local).isFile()) return route.continue();
            return route.fulfill({ contentType: /\.m?js$/.test(pathname) ? 'application/javascript' : pathname.endsWith('.css') ? 'text/css' : 'text/html', body: fs.readFileSync(local) });
        });
        await page.goto('https://pawpalgr3.vercel.app/admin/login');
        await page.locator('#inputAdminEmail').fill(email);
        await page.locator('#inputAdminPassword').fill(password);
        await page.locator('#btnSubmitAdminLogin').click();
        await page.waitForFunction(() => window.PawpalAdminAccess?.isAdmin());
        await page.waitForSelector('.customers-module .customer-master-card');
        if(process.env.DASHBOARD_VISUAL_AUDIT)await page.waitForFunction(()=>{const grid=document.querySelector('.customers-kpi-grid');return grid&&!grid.querySelector('[class*="skeleton"]')&&/\d/.test(grid.textContent);});
        const reference = await page.evaluate(() => {
            const snapshot = selector => {
                const css = getComputedStyle(document.querySelector(selector));
                return ['backgroundColor','borderTopColor','borderRadius','backdropFilter'].map(key => css[key]);
            };
            return { card: snapshot('.customers-module .customer-master-card'), kpis: snapshot('.customers-module .customers-kpi-grid'), header: snapshot('.admin-header') };
        });
        await captureAudit('customers');
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
        assert.equal(await page.locator('[data-ops-kpi-warning]').isVisible(),false,'A hidden KPI warning must stay hidden when all sources are available');
        const actual = await page.evaluate(() => {
            const snapshot = selector => {
                const css = getComputedStyle(document.querySelector(selector));
                return ['backgroundColor','borderTopColor','borderRadius','backdropFilter'].map(key => css[key]);
            };
            return { card: snapshot('.ops-panel'), kpis: snapshot('.ops-kpis'), header: snapshot('.admin-header') };
        });
        assert.deepEqual(actual, reference, 'Dashboard uses the Customer surface and unchanged Admin header');
        await captureAudit('operations');
        await page.locator('[data-subtab="tab-dashboard-business"]').click();
        await page.waitForFunction(() => {
            const node = document.querySelector('[data-biz-analysis]');
            return node && !node.querySelector('.biz-skeleton') && node.querySelector('table');
        });
        assert.equal(await page.locator('[data-biz-analysis] [role="alert"]').count(), 0);
        await page.locator('.biz-comparison-chart').waitFor();
        const financeBook = page.locator('[data-biz-finance]');
        assert.equal(await financeBook.evaluate(node => node.open), false);
        assert.equal(await page.locator('[data-fin-summary]').count(), 0);
        await captureAudit('business');
        await financeBook.locator('summary').click();
        await page.waitForFunction(() => document.querySelector('[data-fin-summary]') && !PawpalDashboardFinance.getState().loading);
        assert.equal(await page.evaluate(()=>PawpalDashboardFinance.getState().error),null,'Finance read RPCs load under the real Admin session');
        assert.equal(await page.locator('[data-fin-summary] .finance-summary').count(),1);
        const financeSurface=await financeBook.evaluate(node=>{const css=getComputedStyle(node);return ['backgroundColor','borderTopColor','borderRadius','backdropFilter'].map(key=>css[key]);});
        assert.deepEqual(financeSurface,reference.card,'Finance shares the actual Customer card surface');
        await page.locator('[data-fin-action="expense"]').click();
        assert.equal(await page.locator('[data-fin-editor] [name="amount"]').inputValue(),'');
        await page.locator('[data-fin-lookup="suppliers"]').focus();
        await page.waitForFunction(()=>{const list=document.querySelector('[data-fin-options]');return list&&!list.hidden&&!list.textContent.includes('Đang tìm');});
        assert.equal(await page.locator('[data-fin-options] .biz-error').count(),0,'Real entity lookup loads without writing');
        await page.locator('[data-fin-close]').click();
        for(const section of ['accounts','source_documents','stock_costs','returns','audit']) {
            if(section==='source_documents')await page.locator('[data-fin-view="obligations"]').click();
            else if(['accounts','stock_costs'].includes(section))await page.locator(`[data-fin-view="${section}"]`).click();
            if(['source_documents','returns','audit'].includes(section))await page.locator('[data-fin-list]').selectOption(section);
            await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
            assert.equal(await page.evaluate(()=>PawpalDashboardFinance.getState().error),null,'Finance section '+section);
            assert((await page.locator('[data-fin-table] tbody tr').count())<=10);
            if(process.env.DASHBOARD_VISUAL_AUDIT&&section==='accounts') {
                for(const width of [1440,390]) {
                    await page.setViewportSize({width,height:1000});
                    await page.evaluate(()=>{const scroller=document.querySelector('.admin-preview-content'),card=document.querySelector('[data-finance-root]');scroller.scrollTop+=card.getBoundingClientRect().top-scroller.getBoundingClientRect().top-12;});
                    await page.screenshot({path:path.resolve('artifacts/dashboard-live-design',process.env.DASHBOARD_VISUAL_AUDIT,`finance-accounts-${width}.png`)});
                    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
                }
                await page.setViewportSize({width:1440,height:1000});
            }
        }
        await page.locator('[data-biz-drill="order"]').click();
        await page.waitForFunction(() => {
            const node = document.querySelector('[data-biz-transactions]');
            return node && !node.hidden && node.querySelector('[data-biz-close-drill]');
        });
        assert((await page.locator('[data-biz-transactions] tbody tr').count()) <= 10);
        assert.equal(await page.locator('[data-biz-transactions] .biz-error').count(), 0);
        for (const kind of ['receipt','refund']) {
            await page.locator(`[data-biz-drill="${kind}"]`).click();
            await page.waitForFunction(() => document.querySelector('[data-biz-transactions] [data-biz-close-drill]'));
            assert((await page.locator('[data-biz-transactions] tbody tr').count()) <= 10);
            assert.equal(await page.locator('[data-biz-transactions] .biz-error').count(), 0);
        }
        let opened = 0;
        for (const kind of ['orders_cancelled','appointments_no_show']) {
            await page.locator(`[data-biz-drill="${kind}"]`).first().click();
            await page.waitForSelector('[data-biz-transactions] [data-biz-close-drill]');
            assert((await page.locator('[data-biz-transactions] tbody tr').count()) <= 10);
            assert.equal(await page.locator('[data-biz-transactions] .biz-error').count(),0);
        }
        for (const kind of ['order','appointment','customers']) {
            await page.locator(`[data-biz-drill="${kind}"]`).click();
            await page.waitForSelector('[data-biz-transactions] [data-biz-close-drill]');
            const ids = await page.locator('[data-biz-transactions] [data-biz-record]').evaluateAll(nodes=>nodes.slice(0,2).map(node=>node.dataset.bizRecord));
            for (const id of ids) {
                await page.locator(`[data-biz-transactions] [data-biz-record="${id}"]`).click();
                try { await page.waitForFunction(({kind,id})=>{
                    if(kind==='customers') {
                        const record=window.PawpalCustomers?.getCustomer?.(id);
                        return record&&document.querySelector('#drawerCustomerName')?.textContent===record.name&&!document.querySelector('#customerProfileData')?.hidden&&document.querySelector('#customerProfileData')?.getClientRects().length;
                    }
                    if(kind==='order') {
                        const state=window.PawpalOrders?.state,record=state?.orders?.find(row=>row.rawId===id||row.id===id);
                        return record&&state.selectedOrderId===record.id&&document.querySelector('#detailOrderCode')?.textContent===record.id&&document.querySelector('#orderDetailData')?.getClientRects().length;
                    }
                    const state=window.PawpalServices?.state,record=state?.bookingsData?.find(row=>row.dbId===id||row.id===id);
                    return record&&!state.detailLoadingId&&!state.detailError&&state.selectedBookingId===record.id&&document.querySelector('#detailBookingCode')?.textContent===record.id&&document.querySelector('.service-detail-card')?.getClientRects().length;
                },{kind,id}); } catch(error) {
                    const diagnostic=await page.evaluate(({kind,id})=>{
                        const state=kind==='order'?window.PawpalOrders?.state:kind==='customers'?window.PawpalCustomers?.state:window.PawpalServices?.state;
                        const record=kind==='customers'?window.PawpalCustomers?.getCustomer?.(id):(state?.orders||state?.bookingsData||[]).find(row=>row.rawId===id||row.dbId===id||row.id===id);
                        const node=document.querySelector(kind==='order'?'#detailOrderCode':kind==='customers'?'#drawerCustomerName':'#detailBookingCode');
                        return {module:sessionStorage.getItem('pawpal_admin_active_module'),recordLoaded:!!record,selectedMatches:state?.selectedOrderId===record?.id||state?.selectedBookingId===record?.id,titleMatches:node?.textContent===record?.id,sourceError:!!(state?.ordersError||state?.detailError),sourceLoading:!!state?.detailLoadingId,recordCount:(state?.orders||state?.bookingsData||[]).length};
                    },{kind,id});
                    throw Error(kind+' source did not render: '+JSON.stringify(diagnostic)+'; blocked writes: '+JSON.stringify(writes)+'; page errors: '+JSON.stringify(errors));
                }
                opened++;
                await page.locator('[data-title="Dashboard"]').click();
                await page.waitForSelector('[data-biz-analysis] table');
                await page.locator(`[data-biz-drill="${kind}"]`).click();
                await page.waitForSelector('[data-biz-transactions] [data-biz-close-drill]');
            }
        }
        assert.deepEqual(writes, [], 'No business mutation attempted');
        assert.deepEqual(errors, []);
        console.log('PASS ' + (useProductionAssets ? 'Vercel' : 'local') + ' Dashboard / current Cloud: operations, logistics/history/work pages, analysis/comparison, financial report/registers/entity lookup, cohort/outcome/receipt/refund evidence, independent today count, Customer style; rendered source records: '+opened+'; no business mutations. Read endpoints: ' + reads.size);
    } finally { await browser.close(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
