const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1366,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/*',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><body></body>'}));await page.goto('http://localhost/');
 await page.setContent(fs.readFileSync('pages/admin/modules/orders/orders.html','utf8'),{waitUntil:'domcontentloaded'});
 for(const file of ['pages/admin/admin.css','pages/admin/modules/orders/orders.css'])await page.addStyleTag({content:fs.readFileSync(file,'utf8')});
 await page.evaluate(()=>{
  window.PAWPAL_SALES_REPLACEMENTS_ENABLED=true;window.calls=[];window.searches=[];window.fail=true;window.hold=false;
  window.order={id:'E2E-ORDER',rawId:'original',address:'E2E address'};
  window.rma={id:'return',updated_at:'2026-10-26T10:00:00Z',return_type:'exchange',request_status:'received',lines:[{id:'detail',quantity:2,line:{product_name_snapshot:'E2E Product',sku_snapshot:'E2E-ORIGINAL',product_variant_id:'original-variant'}}]};
  window.PawpalOrders={helpers:{showToast:()=>{}},ensureOrder:async()=>order,renderSalesReturns:()=>{window.refreshed=true;}};
  window.PawpalOrderV1={searchVariants:async text=>{searches.push(text);return [{variantId:'alternative',name:'E2E Alternative <img src=x>'}];}};
  window.getSupabaseClient=()=>({rpc:async(name,args)=>{calls.push({name,...args});if(hold)await new Promise(r=>window.release=r);return fail?{error:{message:'offline_failure'}}:{data:args.p_request_id};}});
 });await page.addScriptTag({content:fs.readFileSync('pages/admin/modules/orders/subtabs/tab-sales-replacements.js','utf8')});
 await page.evaluate(()=>PawpalOrders.openSalesReplacement(order,rma));await page.locator('#btnSaveSalesReplacement').click();assert.equal(await page.evaluate(()=>calls.length),0);
 const input=page.locator('#salesReplacementLines input');await input.fill('a');await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>searches.length),0);
 await input.fill('E2');await input.fill('E2E');await page.locator('#salesReplacementLines button').waitFor();assert.equal(await page.evaluate(()=>searches.length),1);assert.equal(await page.locator('#salesReplacementLines img').count(),0);
 await page.locator('#salesReplacementLines button').click();await page.locator('#salesReplacementReason').fill('Đổi sang sản phẩm đã thống nhất');await page.locator('#salesReplacementConfirmed').check();
 await page.evaluate(()=>{hold=true;const b=document.querySelector('#btnSaveSalesReplacement');b.click();b.click();});await page.waitForFunction(()=>typeof release==='function');assert.equal(await page.evaluate(()=>calls.length),1);assert.equal(await page.evaluate(()=>calls[0].p_details.lines[0].variant_id),'alternative');assert.equal(await page.evaluate(()=>calls[0].p_details.lines[0].quantity),2);
 await page.evaluate(()=>release());await page.waitForFunction(()=>!document.querySelector('#btnSaveSalesReplacement').disabled);assert.equal(await page.locator('#salesReplacementReason').inputValue(),'Đổi sang sản phẩm đã thống nhất');assert.equal(await page.locator('#modalSalesReplacement').evaluate(e=>e.classList.contains('active')),true);
 await page.screenshot({path:'docs/verification/sync/sales-replacement-admin-offline.png'});
 await page.evaluate(()=>{hold=false;fail=false;});await page.locator('#btnSaveSalesReplacement').click();await page.waitForFunction(()=>window.refreshed);assert.equal(await page.evaluate(()=>calls[0].p_request_id),await page.evaluate(()=>calls[1].p_request_id));assert.equal(await page.locator('#modalSalesReplacement').evaluate(e=>e.classList.contains('active')),false);
 await page.evaluate(()=>{rma.return_type='resend';rma.request_status='pending';PawpalOrders.openSalesReplacement(order,rma);});assert.equal(await input.getAttribute('readonly'),'');assert.equal(await input.inputValue(),'E2E-ORIGINAL');assert.match(await page.locator('#salesReplacementMeta').textContent(),/không thu thêm tiền/);
 const controls=await page.evaluate(()=>{const section=document.createElement('div');PawpalOrders.appendSalesReplacementControls(section,order,{...rma,replacement:{order_id:'replacement',kind:'resend',order:{order_code:'RP-E2E',order_status:'shipped',tracking_code:'TRACK-123'}}});return section.textContent;});assert.match(controls,/TRACK-123/);assert.match(controls,/Đang giao/);assert.deepEqual(errors,[]);
 console.log('PASS Admin replacement modal: required fields, bounded debounce search, escaped names, exact quantities, retry ID, double click, draft retained, resend SKU lock, linked tracking. Offline mock transport.');
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
