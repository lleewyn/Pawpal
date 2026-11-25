// Isolated RPC fixtures. This script cannot access the network or write business data.
const fs = require('node:fs'), assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const root = 'pages/admin/modules/dashboard/';
(async () => {
 const browser = await chromium.launch({ channel: 'chrome', headless: true });
 try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('**/*', route => route.fulfill({ contentType: 'text/html', body: '<!doctype html><body></body>' }));
  await page.goto('http://completion.test/');
  await page.setContent('<body class="admin-body"><main class="admin-main"><div style="height:100vh;overflow:auto;padding:16px"><section class="dashboard-module dash-page business-dash admin-ui-standard admin-ui-customer-reference" data-business-root></section></div></main></body>');
  for (const file of ['my-client/pages/admin/admin.css', root+'dashboard.css', 'my-client/pages/admin/admin-components.css', 'my-client/pages/admin/admin-typography.css', 'my-client/pages/admin/admin-pagination.css']) await page.addStyleTag({ content: fs.readFileSync(file,'utf8') });
  await page.addScriptTag({ content: fs.readFileSync(root+'subtabs/business-metrics.js','utf8') });
  await page.addScriptTag({ content: 'window.dashboardTestAnalysis = ' + require('./dashboard_completion_fixture.cjs').toString() });
  await page.evaluate(() => {
   window.failure = null; window.slowDrill = false; window.drillCalls = [];
   PawpalAdminAccess = { ready: Promise.resolve(), isAdmin: () => true, state: { user: { permissions: ['payment','refund_transaction','sales_order','sales_order_detail','appointment','appointment_item','customer','customer_membership','membership_tier','voucher_redemption','paw_point_transaction'].map(t => t+'.read') } } };
   getSupabaseClient = () => ({ rpc: async (name,args) => {
    const M = PawpalBusinessMetrics;
    if (name === failure) return { error: { code: '42501' } };
    if (name === 'get_admin_dashboard_plan') return { data: null };
    if (name === 'get_admin_dashboard_cashflow') return { data: { undated_receipts: 0, undated_refunds: 0, days: Array.from({ length: M.period(args.p_from,args.p_to).length },(_,i)=>({day:M.shift(args.p_from,i),collected:100,refunded:25})) } };
    if (name === 'admin_dashboard_business_analysis') {
     const data = dashboardTestAnalysis(args);
     data.transactions = [{kind:'order',period:'current',count:12,value:3600},{kind:'order',period:'previous',count:10,value:2000},{kind:'appointment',period:'current',count:3,value:900},{kind:'appointment',period:'previous',count:3,value:600}];
     data.customers = {eligible:10,first_observed:4,returned_from_before:6,repeated_in_period:2};
     return { data };
    }
    if (name === 'admin_dashboard_transaction_page') {
     drillCalls.push(args);
     if (slowDrill) await new Promise(resolve => window.releaseDrill = resolve);
     return { data: {total:12,page:args.p_page,from:args.p_from+'T00:00:00+07:00',to:args.p_to+'T10:00:00+07:00',rows:Array.from({length:args.p_page===1?10:2},(_,i)=>({id:'row-'+args.p_page+'-'+i,code:'DH-'+args.p_page+'-'+i,finished_at:args.p_to+'T09:00:00+07:00',value:300,line_count:1}))} };
    }
    if (name === 'admin_dashboard_cash_page') {
     drillCalls.push(args);
     return { data: {total:2,page:1,from:args.p_from+'T00:00:00+07:00',to:args.p_to+'T10:00:00+07:00',rows:[{id:'linked-order',target_kind:'order',code:'DH-linked',finished_at:args.p_to+'T09:00:00+07:00',value:150},{id:null,target_kind:null,code:'unlinked-payment',finished_at:args.p_to+'T09:00:00+07:00',value:50}]} };
    }
    if (name === 'admin_dashboard_analysis_page') {
     drillCalls.push(args);
     const cohort=['customers','first_observed','returned_from_before','repeated_in_period'].includes(args.p_kind);
     const total=cohort?12:2,page=Math.min(args.p_page,Math.ceil(total/10));
     return {data:{kind:args.p_kind,total,page,from:args.p_from+'T00:00:00+07:00',to:args.p_to+'T10:00:00+07:00',rows:Array.from({length:cohort&&page===1?10:2},(_,i)=>cohort?{id:'customer-'+page+'-'+i,target_kind:'customer',code:'KH-'+page+'-'+i,display_name:'Khách <kiểm thử>',first_at:args.p_from+'T08:00:00+07:00',last_at:args.p_to+'T09:00:00+07:00',transaction_count:2}:{id:'outcome-'+i,target_kind:args.p_kind.startsWith('orders_')?'order':'appointment',code:'HS-'+i,created_at:args.p_from+'T08:00:00+07:00',status:args.p_kind==='appointments_no_show'?'no_show':'cancelled'})}};
    }
    if (name === 'admin_business_metric') return {data:({sources:{products:100,services:0,other:0},products:[],services:[],customers:[],membership:[],vouchers:{count:0,discount:0},points:{credited:0,debited:0},returning:{eligible:0,returning:0,rate:null}})[args.p_key]};
    throw Error('Unexpected RPC');
   } });
  });
  await page.addScriptTag({ content: fs.readFileSync(root+'subtabs/tab-dashboard-business.js','utf8') });
  await page.evaluate(() => PawpalBusinessDashboard.init());
  const analysis = page.locator('[data-biz-analysis]');
  assert.equal(await analysis.locator('.biz-evidence-stats [data-biz-drill="returned_from_before"]').innerText(), '6');
  await analysis.locator('summary').filter({hasText:'Cơ sở đối chiếu'}).click();
  assert.match(await analysis.innerText(), /do số giao dịch 500 đ; do giá trị bình quân 1\.100 đ/);
  assert.match(await analysis.innerText(), /không khẳng định lịch sử trước hệ thống/);
  fs.mkdirSync('artifacts/dashboard-completion', { recursive: true });
  for (const width of [1440, 820, 390, 320]) {
   await page.setViewportSize({ width, height: 1000 });
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No outer overflow in business analysis at '+width);
   if (width <= 640) {
    const sizing = await page.evaluate(() => {
     const table = document.querySelector('[data-biz-analysis] .table-responsive-wrapper');
     const chart = document.querySelector('.biz-chart-scroll');
     return { table: table.scrollWidth <= table.clientWidth, chart: chart.scrollWidth <= chart.clientWidth };
    });
    assert.deepEqual(sizing, { table: true, chart: true }, 'Summary and chart fit at ' + width);
   }
   if ([1440,390].includes(width)) await analysis.screenshot({ path: 'artifacts/dashboard-completion/analysis-'+width+'.png' });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.locator('[data-biz-drill="order"]').click();
  await page.waitForSelector('[data-biz-transactions] tbody tr');
  assert.equal(await page.locator('[data-biz-transactions] tbody tr').count(),10);
  await page.locator('[data-biz-drill-page="2"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-biz-transactions] tbody tr').length===2);
  assert.equal(await page.locator('[data-biz-transactions-pagination]').evaluate(el=>!!el.closest('.admin-card')),false);
  await page.evaluate(()=>{window.PawpalOrders={state:{selectedOrderId:'previous'}};});
  await page.locator('[data-biz-record]').first().click();
  assert.equal(await page.evaluate(()=>PawpalOrders.state.selectedOrderId),'row-2-0');
  assert.match(await page.evaluate(()=>location.hash), /tab-order-detail\?id=row-2-0/);
  await page.locator('[data-biz-drill="receipt"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-biz-transactions]')?.textContent.includes('unlinked-payment'));
  assert.equal(await page.locator('[data-biz-transactions] tbody tr').count(),2);
  assert.equal(await page.locator('[data-biz-transactions] [data-biz-record]').count(),1,'Ambiguous payment cannot open an unrelated record');
  assert.equal(await page.locator('[data-biz-transactions] th').nth(2).innerText(),'Số tiền');
  await page.locator('[data-biz-record]').first().click();
  assert.equal(await page.evaluate(()=>PawpalOrders.state.selectedOrderId),'linked-order');
  await page.locator('[data-biz-drill="refund"]').click();
  await page.waitForFunction(()=>window.drillCalls.at(-1).p_kind==='refund');
  assert.equal(await page.evaluate(()=>Object.hasOwn(drillCalls.at(-1),'p_previous')),false,'Cash pages use their own RPC contract');
  for(const kind of ['customers','first_observed','returned_from_before','repeated_in_period']) {
   await page.locator(`[data-biz-drill="${kind}"]`).click();
   await page.waitForFunction(()=>document.querySelector('[data-biz-transactions] th')?.textContent==='Khách hàng');
   assert.equal(await page.locator('[data-biz-transactions] tbody tr').count(),10);
   assert.match(await page.locator('[data-biz-transactions]').innerText(),/Khách <kiểm thử>/,'Customer names are escaped text');
   assert.equal(await page.locator('[data-biz-transactions] strong').first().innerHTML(),'Khách &lt;kiểm thử&gt;');
  }
  await page.locator('[data-biz-drill-page="2"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('[data-biz-transactions] tbody tr').length===2);
  for(const width of [1440,390,320]) {
   await page.setViewportSize({width,height:1000});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Customer evidence has no outer overflow at '+width);
   assert.equal(await page.locator('[data-biz-transactions] tbody td:nth-child(2)').first().evaluate(el=>getComputedStyle(el).whiteSpace),'nowrap','Evidence dates remain whole inside the scroll area');
   if(width!==320) await page.locator('[data-biz-transactions]').screenshot({path:'artifacts/dashboard-completion/customers-'+width+'.png'});
  }
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>sessionStorage.setItem('pawpal_admin_customer_name','Old selection'));
  await page.locator('[data-biz-record]').first().click();
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('pawpal_admin_customer_id')),'customer-2-0');
  assert.equal(await page.evaluate(()=>sessionStorage.getItem('pawpal_admin_customer_name')),null);
  assert.match(await page.evaluate(()=>location.hash),/tab-profile\?id=customer-2-0/);
  for(const kind of ['orders_created','orders_cancelled','appointments_created','appointments_cancelled','appointments_no_show']) {
   await page.locator(`[data-biz-drill="${kind}"]`).first().click();
   await page.waitForFunction(()=>document.querySelector('[data-biz-transactions] th:nth-child(2)')?.textContent==='Ngày tạo');
   assert.equal(await page.locator('[data-biz-transactions] tbody tr').count(),2);
   assert.match(await page.locator('[data-biz-transactions]').innerText(),/Theo ngày tạo; trạng thái là trạng thái hiện tại/);
  }
  await page.locator('[data-biz-record]').first().click();
  assert.match(await page.evaluate(()=>location.hash),/tab-service-detail\?id=outcome-0/);
  await page.evaluate(()=>{failure='admin_dashboard_analysis_page';});
  await page.locator('[data-biz-drill="customers"]').first().click();
  await page.waitForSelector('[data-biz-transactions] .biz-error');
  assert.equal(await analysis.locator('[role="alert"]').count(),0,'Evidence denial does not erase valid summary totals');
  await page.evaluate(()=>{failure=null;});
  await page.locator('[data-biz-transactions] [data-biz-drill="customers"]').click();
  await page.waitForSelector('[data-biz-transactions] tbody');
  await page.evaluate(()=>{slowDrill=true;});
  await page.locator('[data-biz-drill="appointment"]').click();
  await page.waitForFunction(()=>!!window.releaseDrill);
  await page.locator('[data-biz-preset="7"]').click();
  await page.evaluate(()=>{slowDrill=false;releaseDrill();});
  assert.equal(await page.locator('[data-biz-transactions]').isVisible(),false,'Stale drill response cannot reappear in another period');
  await page.evaluate(async()=>{failure='admin_dashboard_business_analysis';await PawpalBusinessDashboard.refresh();});
  assert.equal(await analysis.locator('[role="alert"]').count(),1);
  assert.equal(await page.locator('.biz-comparison-chart').count(),0,'No stale comparison when analysis fails');
  assert.equal(await page.locator('.biz-chart').count(),1,'Cash chart survives independent analysis failure');
  await page.evaluate(()=>{failure=null;});
  await analysis.locator('[data-biz-retry="analysis"]').click();
  await page.waitForFunction(()=>document.querySelector('[data-biz-analysis] table'));
  assert.match(await analysis.innerText(), /Đơn bán hàng/);
  await page.evaluate(()=>PawpalBusinessDashboard.unmount());
  assert.deepEqual(errors,[]);
  console.log('PASS analysis: decomposition, cohorts, paged evidence, exact record navigation, cross-period race, independent source errors and retry. Isolated fixtures only.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
