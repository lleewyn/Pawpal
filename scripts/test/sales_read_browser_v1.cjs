const assert=require('node:assert/strict');
const {browserPage,infra}=require('./customer_completion_helpers.cjs');
(async()=>{const {browser,page}=await browserPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});try{
 await page.locator('[data-title="Bán hàng"]').click();
 await page.waitForFunction(()=>window.PawpalOrders?.state.productsLoaded&&window.PawpalOrders?.state.ordersLoaded&&window.PawpalOrders?.state.vouchersLoaded);
 const counts=await page.evaluate(()=>{const s=window.PawpalOrders.state;return {products:s.products.length,orders:s.orders.length,errors:[s.productsError,s.ordersError,s.vouchersError]};});
 assert.ok(counts.products>0);assert.ok(counts.orders>0);assert.deepEqual(counts.errors,[false,false,false]);
 await page.evaluate(()=>{window.PawpalOrders.switchSubtab('tab-order-products');window.PawpalOrdersModule.openAdjustStockModal(window.PawpalOrders.state.products[0].sku);});
 await page.locator('#adjustVariantSearch').focus();await page.locator('#adjustVariantOptions button').first().click();
 assert.ok(await page.evaluate(()=>window.PawpalOrders.state.adjustVariantId));
 await page.screenshot({path:infra+'/sales-stock-modal.private.png',fullPage:true});
 await page.locator('#modalAdjustStock [data-close-modal="modalAdjustStock"]').first().click();
 assert.ok(!await page.locator('#modalAdjustStock').evaluate(e=>e.classList.contains('active')));
 assert.deepEqual(errors,[]);console.log('PASS V1 sales lists and variant stock modal on restored database',counts);
 }finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
