// Actual cashier HTML and scripts, mocked transport only; no network or Cloud writes.
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 for(const kind of ['service','sales']){
  const page=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>r.fulfill(r.request().url().endsWith('/scripts/shared/refund-loyalty.mjs')?{contentType:'text/javascript',body:fs.readFileSync('scripts/shared/refund-loyalty.mjs','utf8')}:{contentType:'text/html',body:'<!doctype html><body></body>'}));
  await page.goto('http://localhost/');
  const base=kind==='sales'?'orders':'services',prefix=kind==='sales'?'salesCashier':'cashier',save=kind==='sales'?'btnSaveSalesMoney':'btnSaveServiceMoney';
  await page.setContent(fs.readFileSync(`pages/admin/modules/${base}/${base}.html`,'utf8'),{waitUntil:'domcontentloaded'});
  for(const file of ['pages/admin/admin.css',`pages/admin/modules/${base}/${base}.css`])if(fs.existsSync(file))await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
  await page.evaluate(kind=>{
   window.calls=[];window.reads=0;window.fail=true;window.hold=false;
   window.fixture={version:'v1',total:100,collected:100,remaining:0,methods:[{id:'cash',name:'Tiền mặt',requires_reference:false}],payments:[{id:'payment',payment_code:'E2E-PAY',amount:100,eligible_spend_amount:90,transaction_status:'succeeded',refunds:[],loyalty:{reward_points:7,reversed_points:0,points_balance:7,history_conflict:false}}]};
   window.getSupabaseClient=()=>({rpc:async(name,args)=>{
    if(name.startsWith('get_admin_')){reads++;return {data:structuredClone(fixture)};}
    calls.push(args);if(hold)await new Promise(r=>window.release=r);
    return fail?{error:{message:'offline_failure'}}:{data:args.p_request_id};
   }});
   const m={escapeHtml:s=>String(s??'').replaceAll('<','&lt;'),formatCurrency:n=>n+' đ',errorMessage:e=>e.message,enhanceEntitySelects:()=>{},showToast:()=>{},state:{bookingsData:[],orders:[]},helpers:{formatVND:n=>n+' đ',showToast:()=>{}},fetchOrdersData:async()=>{}};
   if(kind==='sales'){window.PawpalOrders=m;window.PawpalOrdersModule={escapeHtml:m.escapeHtml};}
   else{window.PawpalServices=m;m.saveServiceMoney=async(b,c,action,details)=>{const {error}=await getSupabaseClient().rpc('post_admin_service_money',{p_request_id:'request',p_appointment_id:b.dbId,p_expected_state:c.version,p_action:action,p_details:details});if(error)throw error;};}
  },kind);
  let source=fs.readFileSync(`pages/admin/modules/${base}/subtabs/tab-${kind==='sales'?'order-list':'service-cashier'}.js`,'utf8');
  if(kind==='sales'){const anchor=source.indexOf('    const m=window.PawpalOrders,el=id=>document.getElementById(id),esc=window.PawpalOrdersModule.escapeHtml;');assert.ok(anchor>0);source=source.slice(source.lastIndexOf('(function(){',anchor),source.indexOf('})();',anchor)+5);}
  await page.addScriptTag({content:source});
  const open=()=>page.evaluate(kind=>(kind==='sales'?PawpalOrders:PawpalServices).openCashier({id:'E2E',rawId:'order',dbId:'booking',petName:'Pet'}),kind);
  const choosePayment=async()=>{if(kind==='sales'){await page.locator('#salesCashierPaymentSearch').fill('E2E-PAY');await page.locator('.customer-autocomplete-popover button').filter({hasText:'E2E-PAY'}).click();}else await page.locator('#cashierPayment').selectOption('payment');};
  await open();await page.locator('#'+prefix+'Action').selectOption('refund');await choosePayment();
  assert.match(await page.locator('#'+prefix+'LoyaltyPreview').textContent(),/7 điểm/);
  await page.locator('#'+prefix+'Confirmed').check();await page.locator('#'+prefix+'Amount').fill('33');assert.equal(await page.locator('#'+prefix+'Confirmed').isChecked(),false);
  assert.match(await page.locator('#'+prefix+'LoyaltyPreview').textContent(),/2 điểm/);assert.equal(await page.evaluate(()=>reads),1,'Preview adds no RPC');
  await page.locator('#'+prefix+'Reason').fill('Đối soát hoàn tiền');await page.locator('#'+prefix+'Confirmed').check();await page.evaluate(save=>{hold=true;document.getElementById(save).click();document.getElementById(save).click();},save);
  await page.waitForFunction(()=>typeof release==='function');assert.equal(await page.evaluate(()=>calls.length),1);assert.equal(await page.evaluate(()=>calls[0].p_details.loyalty_confirmed),true);
  await page.evaluate(()=>release());await page.waitForFunction(save=>!document.getElementById(save).disabled,save);assert.equal(await page.locator('#'+prefix+'Amount').inputValue(),'33');assert.equal(await page.locator('#'+prefix+'Reason').inputValue(),'Đối soát hoàn tiền');
  await page.evaluate(()=>{hold=false;fail=false;});await page.locator('#'+save).click();await page.waitForFunction(()=>reads===2);assert.equal(await page.evaluate(()=>calls.length),2);
  if(kind==='sales')assert.equal(await page.evaluate(()=>calls[0].p_request_id),await page.evaluate(()=>calls[1].p_request_id));
  await page.evaluate(()=>{fixture.payments[0].loyalty.points_balance=1;});await open();await page.locator('#'+prefix+'Action').selectOption('refund');await choosePayment();
  assert.match(await page.locator('#'+prefix+'LoyaltyPreview').textContent(),/không đủ điểm/);assert.equal(await page.locator('#'+save).isDisabled(),true);
  await page.screenshot({path:`docs/verification/sync/refund-rewards-${kind}-offline.png`});assert.deepEqual(errors,[]);await page.close();
  console.log('PASS',kind,'cashier: local preview, no extra RPC, confirmation reset, double click, retry draft, insufficient-point block. Mock transport only.');
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
