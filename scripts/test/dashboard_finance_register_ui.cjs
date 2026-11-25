// Isolated browser fixtures only. All network is blocked; no real financial records are written.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('**/*',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));await page.goto('https://finance-register.test');
  await page.setContent('<body class="admin-body"><main class="admin-main"><div class="admin-preview-content business-dash admin-ui-standard admin-ui-customer-reference" style="height:100vh;overflow:auto;padding:16px"><div class="biz-grid"><section class="admin-card admin-workspace-card biz-panel biz-wide" data-finance-root></section></div></div></main></body>');
  for(const file of ['my-client/pages/admin/admin.css','my-client/pages/admin/modules/dashboard/dashboard.css','my-client/pages/admin/admin-components.css','my-client/pages/admin/admin-typography.css','my-client/pages/admin/admin-pagination.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
  await page.addScriptTag({content:fs.readFileSync('my-client/pages/admin/modules/dashboard/subtabs/business-metrics.js','utf8')});
  await page.evaluate(()=>{
   window.PawpalAdminAccess={isAdmin:()=>true,state:{user:{permissions:['finance.read','finance.write']}}};
   window.finFixture={accounts:[],entries:[],movements:[],posts:[],requests:new Map(),fail:null,uncertain:false,reportCalls:[],serviceRecorded:false};
   const f=finFixture,version='2026-11-22T01:00:00.123456+00:00';
   const rowEntry=e=>({...e,label:e.description,remaining:e.amount-f.movements.filter(m=>m.entry_id===e.id).reduce((sum,m)=>sum+Math.abs(m.amount),0)});
   const rows=section=>f.extra?.[section] || (section==='accounts'?f.accounts.map(a=>({...a,balance:a.opening_balance+f.movements.filter(m=>m.account_id===a.id).reduce((sum,m)=>sum+m.amount,0)})):section==='expenses'?f.entries.filter(e=>e.entry_kind==='expense').map(rowEntry):section==='obligations'?f.entries.filter(e=>['expense','receivable','payable'].includes(e.entry_kind)).map(rowEntry).filter(e=>e.remaining>0):section==='movements'?f.movements:section==='services'&&!f.serviceRecorded?[{id:'service-id',label:'LH-TEST',occurred_at:'2026-11-21T03:00:00Z'}]:[]);
   getSupabaseClient=()=>({rpc:async(name,args)=>{
    if(name===f.fail)return {error:{code:'42501'}};
    if(name==='admin_finance_report'){
     f.reportCalls.push(args);
     const balance=f.accounts.reduce((sum,a)=>sum+a.opening_balance,0)+f.movements.reduce((sum,m)=>sum+m.amount,0),expense=f.entries.filter(e=>e.entry_kind==='expense').reduce((sum,e)=>sum+e.amount,0);
     const data={from:args.p_from+'T00:00:00+07:00',to:args.p_to+'T10:00:00+07:00',partial:true,tracked_from:'2026-11-22T01:00:00Z',revenue:0,product_cost:0,service_cost:0,expense,result:null,result_ready:false,review_current:false,fingerprint:'snapshot',missing:{revenue:0,product_cost:0,service_cost:f.serviceRecorded?0:1,refunds:0},cash:{accounts:f.accounts.length,balance:f.accounts.length?balance:null,reconciled_to:null,unreconciled_accounts:f.accounts.length,unallocated_payments:0,unallocated_refunds:0},obligations:{receivable:0,payable:expense,undated:0,overdue:0},forecast:{rows:Array.from({length:12},(_,i)=>({day:PawpalBusinessMetrics.shift(args.p_from,i),incoming:0,outgoing:i===1?2000:0,balance:i>0?balance-2000:balance}))}};
     return {data};
    }
    if(name==='admin_finance_page') {const all=rows(args.p_section).filter(row=>JSON.stringify(row).toLowerCase().includes(args.p_query.toLowerCase())),page=Math.min(args.p_page,Math.max(1,Math.ceil(all.length/10)));return {data:{total:all.length,page,rows:all.slice((page-1)*10,page*10)}};}
    if(name==='admin_finance_lookup')return {data:rows(args.p_kind).filter(row=>row.label.toLowerCase().includes(args.p_query.toLowerCase())).slice(0,10)};
    if(name==='admin_finance_post'){
     f.posts.push(structuredClone(args));
     if(f.requests.has(args.p_request_id))return {data:f.requests.get(args.p_request_id)};
     const d=args.p_data,id=args.p_request_id;
     if(args.p_action==='account')f.accounts.push({id,...d,label:d.name,created_at:version,updated_at:version,reconciled_at:null});
     if(args.p_action==='expense')f.entries.push({id,...d,entry_kind:'expense',status:'posted',created_at:version,updated_at:version});
     if(args.p_action==='settle'){const e=f.entries.find(e=>e.id===d.source_id);f.movements.push({...d,id,entry_id:e.id,account_id:d.account_id,amount:-d.amount,label:d.description});}
     if(args.p_action==='service_cost')f.serviceRecorded=true;
     f.requests.set(id,id);
     if(f.uncertain){f.uncertain=false;return {error:{message:'Network response lost'}};}
     return {data:id};
    }
    throw Error('Unexpected finance fixture RPC');
   }});
  });
  await page.addScriptTag({content:fs.readFileSync('my-client/pages/admin/modules/dashboard/subtabs/dashboard-finance.js','utf8')});
  await page.evaluate(()=>PawpalDashboardFinance.mount(document.querySelector('[data-finance-root]'),{from:'2026-11-01',to:'2026-11-22'}));
  await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  assert.match(await page.locator('[data-fin-summary]').innerText(),/Chưa đủ dữ liệu/);
  await page.locator('[data-fin-view="accounts"]').click();await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  await page.locator('[data-fin-tools] [data-fin-action="account"]').click();
  assert.equal(await page.locator('[name="opening_balance"]').inputValue(),'','Opening amount is never fabricated');
  fs.mkdirSync('artifacts/dashboard-finance-register',{recursive:true});
  for(const width of [1440,390,320]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Inline form stays within viewport at '+width);if(width===390)await page.screenshot({path:'artifacts/dashboard-finance-register/account-editor-390.png',fullPage:true});}
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('[data-fin-save]').click();assert.equal(await page.evaluate(()=>finFixture.posts.length),0,'Required amount blocks an empty financial write');
  await page.locator('[name="name"]').fill('Quỹ <kiểm thử>');await page.locator('[name="opening_balance"]').fill('1000');await page.locator('[name="reference"]').fill('BANK-TEST');
  await page.locator('[data-fin-save]').click();await page.waitForFunction(()=>finFixture.accounts.length===1&&!PawpalDashboardFinance.getState().loading);
  assert.match(await page.locator('[data-fin-table]').innerText(),/Quỹ <kiểm thử>/);
  await page.locator('[data-fin-view="expenses"]').click();await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  await page.locator('[data-fin-action="expense"]').click();
  await page.locator('[name="description"]').fill('Chi phí điện kiểm thử');await page.locator('[name="counterparty"]').fill('Bên nhận kiểm thử');await page.locator('[name="category"]').selectOption('Điện nước');await page.locator('[name="amount"]').fill('100');await page.locator('[name="reference"]').fill('EXP-TEST');
  await page.evaluate(()=>finFixture.uncertain=true);await page.locator('[data-fin-save]').click();
  await page.waitForSelector('[data-fin-retry-write]');assert(await page.locator('[name="amount"]').isDisabled());
  await page.locator('[data-fin-retry-write]').click();await page.waitForFunction(()=>!PawpalDashboardFinance.getState().pendingWrite&&!PawpalDashboardFinance.getState().loading);
  const attempts=await page.evaluate(()=>finFixture.posts.filter(p=>p.p_action==='expense').map(p=>p.p_request_id));assert.equal(attempts.length,2);assert.equal(attempts[0],attempts[1]);assert.equal(await page.evaluate(()=>finFixture.entries.length),1,'Lost response retry cannot duplicate expense');
  await page.locator('[data-fin-table] [data-fin-action="settle"]').click();
  await page.locator('[data-fin-lookup="accounts"]').focus();await page.waitForSelector('[data-fin-pick="0"]');
  assert.equal(await page.locator('.finance-option strong').first().innerHTML(),'Quỹ &lt;kiểm thử&gt;');
  await page.locator('[data-fin-lookup="accounts"]').press('ArrowDown');await page.keyboard.press('Enter');
  assert(await page.locator('[data-fin-selected]').isVisible());await page.locator('[name="amount"]').fill('40');await page.locator('[name="description"]').fill('Thanh toán một phần');await page.locator('[name="reference"]').fill('PAY-TEST');
  await page.locator('[data-fin-save]').click();await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading&&finFixture.movements.length===1);
  assert.match(await page.locator('[data-fin-table]').innerText(),/60 đ/);
  const settled=await page.evaluate(()=>finFixture.posts.find(p=>p.p_action==='settle'));assert.equal(settled.p_data.amount,40);assert.match(settled.p_expected_updated_at,/123456/,'Optimistic version precision is retained');assert.match(settled.p_data.occurred_at,/Z$/);
  assert.equal(await page.locator('[data-fin-evidence]').evaluate(el=>el.open),false,'Missing-source details start compact while the incomplete result stays visible');
  await page.locator('[data-fin-evidence] summary').click();
  await page.locator('[data-fin-section="services"]').click();await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  await page.locator('[data-fin-action="service_cost"]').click();await page.locator('[name="amount"]').fill('0');await page.locator('[name="description"]').fill('Đã kiểm tra không có khoản riêng');await page.locator('[name="reference"]').fill('COST-TEST');await page.locator('[data-fin-save]').click();await page.waitForFunction(()=>finFixture.serviceRecorded&&!PawpalDashboardFinance.getState().loading);
  assert.equal(await page.evaluate(()=>finFixture.posts.find(p=>p.p_action==='service_cost').p_data.amount),0);
  await page.evaluate(()=>{finFixture.extra={customers:[{id:'customer-id',label:'Khách trong hệ thống'}],source_documents:[{id:'order-id',label:'DH-TEST',source_kind:'order',known:true,amount:80,direction:'receivable',updated_at:'2026-11-22T01:00:00.123456Z'}],returns:[{id:'return-id',label:'Phiếu đổi trả kiểm thử',already_reduced:20}],refunds:[{id:'refund-id',label:'Hoàn kiểm thử',amount:100}],sale_costs:[{id:'line-id',label:'Dòng bán đã ghi vốn',quantity:2,known:true,amount:60,updated_at:'2026-11-22T01:00:00.123456Z'}]};});
  await page.locator('[data-fin-view="obligations"]').click();await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  await page.locator('[data-fin-action="receivable"]').click();await page.locator('[data-fin-lookup="customers"]').focus();await page.waitForSelector('[data-fin-pick="0"]');await page.locator('[data-fin-pick="0"]').click();
  assert.equal(await page.locator('[name="customer_id"]').inputValue(),'customer-id');assert.equal(await page.locator('[name="counterparty"]').isVisible(),false);
  await page.locator('[data-fin-clear]').click();assert(await page.locator('[name="counterparty"]').isVisible());assert.equal(await page.locator('[name="customer_id"]').inputValue(),'');
  await page.locator('[data-fin-close]').click();await page.locator('[data-fin-list]').selectOption('source_documents');await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  await page.locator('[data-fin-action="document_due"]').click();await page.locator('[name="due_on"]').fill('2026-11-25');await page.locator('[name="reference"]').fill('DUE-TEST');await page.locator('[data-fin-save]').click();await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  const due=await page.evaluate(()=>finFixture.posts.find(p=>p.p_action==='document_due'));assert.equal(due.p_data.source_id,'order-id');assert.equal(due.p_data.direction,'receivable');assert.match(due.p_expected_updated_at,/123456/);
  await page.locator('[data-fin-view="stock_costs"]').click();await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  await page.locator('[data-fin-list]').selectOption('returns');await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  await page.locator('[data-fin-action="revenue_credit"]').click();assert.equal(await page.locator('[name="recognized_on"]').inputValue(),'','No historical approval date is fabricated');await page.locator('[name="amount"]').fill('0');await page.locator('[name="recognized_on"]').fill('2026-11-20');await page.locator('[name="description"]').fill('Đã đối soát không giảm thêm');await page.locator('[name="reference"]').fill('CREDIT-TEST');await page.locator('[data-fin-save]').click();await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  assert.equal(await page.evaluate(()=>finFixture.posts.find(p=>p.p_action==='revenue_credit').p_data.amount),0);
  await page.locator('[data-fin-list]').selectOption('refunds');await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  await page.locator('[data-fin-action="refund_allocation"]').click();for(const [key,value] of Object.entries({description:'Căn cứ hoàn đã kiểm tra',revenue_part:'20',document_part:'30',advance_part:'40',expense_part:'10',reference:'REFUND-TEST'}))await page.locator(`[name="${key}"]`).fill(value);
  await page.locator('[data-fin-save]').click();await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);const allocation=await page.evaluate(()=>finFixture.posts.find(p=>p.p_action==='refund_allocation').p_data);assert.equal(allocation.amount,100);assert.equal(allocation.revenue_part+allocation.document_part+allocation.advance_part+allocation.expense_part,100);
  await page.locator('[data-fin-list]').selectOption('sale_costs');await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  await page.locator('[data-fin-action="sale_cost"]').click();await page.locator('[name="amount"]').fill('70');await page.locator('[name="description"]').fill('Điều chỉnh theo hóa đơn gốc');await page.locator('[name="reference"]').fill('COST-CORRECTION');await page.locator('[data-fin-save]').click();await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);const correction=await page.evaluate(()=>finFixture.posts.find(p=>p.p_action==='sale_cost'));assert.equal(correction.p_data.correcting,true);assert.equal(correction.p_data.expected_quantity,2);assert.match(correction.p_expected_updated_at,/123456/);
  await page.locator('[data-fin-action="forecast"]').click();assert.equal(await page.locator('[data-fin-forecast] tbody tr').count(),10);
  const forecastNav=page.locator('nav[aria-label="Phân trang lịch thu chi"]');assert.equal(await forecastNav.evaluate(el=>!!el.closest('.admin-card')),false);
  await forecastNav.locator('[data-fin-forecast-page="2"]').click();assert.equal(await page.locator('[data-fin-forecast] tbody tr').count(),2);
  await page.locator('[data-fin-horizon]').selectOption('7');await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);assert.equal(await page.evaluate(()=>finFixture.reportCalls.at(-1).p_include_receiv),false);
  await page.evaluate(()=>{finFixture.entries=Array.from({length:12},(_,i)=>({id:'e'+i,description:'Khoản kiểm thử '+i,entry_kind:'expense',counterparty:'Bên kiểm thử',amount:100,reference:'EX-'+i,status:'posted',recognized_on:'2026-11-22',updated_at:'2026-11-22T01:00:00.123456Z'}));});
  await page.locator('[data-fin-view="expenses"]').click();await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);assert.equal(await page.locator('[data-fin-table] tbody tr').count(),10);
  const bookNav=page.locator('nav[aria-label="Phân trang tài chính"]');assert.equal(await bookNav.evaluate(el=>!!el.closest('.admin-card')),false);
  await bookNav.locator('[data-fin-page="2"]').click();await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);assert.equal(await page.locator('[data-fin-table] tbody tr').count(),2);
  const reportCount=await page.evaluate(()=>finFixture.reportCalls.length);
  await page.locator('[data-fin-search]').fill('EX-11');await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading&&document.querySelectorAll('[data-fin-table] tbody tr').length===1);
  assert.match(await page.locator('[data-fin-table]').innerText(),/EX-11/);assert.equal(await page.evaluate(()=>finFixture.reportCalls.length),reportCount,'Searching a register does not refetch the financial report');
  await page.evaluate(()=>PawpalDashboardFinance.mount(document.querySelector('[data-finance-root]'),{from:'2026-11-01',to:'2026-11-22'}));await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  assert.equal(await page.locator('[data-fin-search]').inputValue(),'EX-11');assert.equal(await page.locator('[data-fin-table] tbody tr').count(),1,'Work position survives a remount');
  await page.locator('[data-fin-search]').fill('');await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading&&document.querySelectorAll('[data-fin-table] tbody tr').length===10);
  fs.mkdirSync('artifacts/dashboard-finance-register',{recursive:true});
  for(const width of [1440,820,390,320]){await page.setViewportSize({width,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No outer financial overflow at '+width);if([1440,390].includes(width))await page.screenshot({path:'artifacts/dashboard-finance-register/register-'+width+'.png',fullPage:true});}
  await page.setViewportSize({width:1440,height:1000});
  await page.evaluate(()=>{const original=URL.createObjectURL.bind(URL);URL.createObjectURL=blob=>{window.financeCsv=blob.text();return original(blob);};});
  await page.locator('[data-fin-action="export"]').click();const csv=await page.evaluate(()=>financeCsv);assert.match(csv,/Chưa đủ dữ liệu để kết luận/);assert.match(csv,/"Kết quả hoạt động",""/);
  await page.evaluate(()=>{finFixture.fail='admin_finance_report';});await page.locator('[data-fin-action="refresh"]').first().click();await page.waitForFunction(()=>PawpalDashboardFinance.getState().error);
  assert.equal(await page.locator('[data-fin-summary] .finance-summary').count(),0,'Failed source clears old figures');assert.equal(await page.locator('[data-fin-forecast] table').count(),0,'Failed source clears old forecast');
  await page.evaluate(()=>{finFixture.fail=null;PawpalAdminAccess.state.user.permissions=['finance.read'];PawpalDashboardFinance.refresh();});await page.waitForFunction(()=>!PawpalDashboardFinance.getState().loading);
  assert.equal(await page.locator('[data-fin-action="expense"]').count(),0,'Read-only role cannot open financial writes');
  await page.evaluate(()=>PawpalDashboardFinance.unmount());assert.equal(await page.locator('nav[aria-label="Phân trang tài chính"]').count(),0);assert.deepEqual(errors,[]);
  console.log('PASS finance register UI: real-form payloads, no defaults, expense vs payment, exact retry identity, version precision, text-only entity lookup, explicit zero cost, outside pagination, forecasts, safe export, errors, read-only access and 1440/820/390/320px. Isolated fixtures only.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
