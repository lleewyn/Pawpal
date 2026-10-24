const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
 const page=await browser.newPage();
 await page.route('http://localhost:3001/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
 await page.goto('http://localhost:3001/');
 await page.setContent(fs.readFileSync('pages/admin/modules/orders/orders.html','utf8'),{waitUntil:'domcontentloaded'});
 const source=fs.readFileSync('pages/admin/modules/orders/subtabs/tab-order-list.js','utf8');
 const start=source.indexOf('    const ORDERS_PER_PAGE');
 const end=source.indexOf('    let activePosCustomer',start);
 const selectionStart=source.indexOf("        document.getElementById('checkSelectAllOrders')?.addEventListener");
 const selectionEnd=source.indexOf("        document.getElementById('btnBatchDeselectAll')",selectionStart);
 await page.evaluate(()=>{
  window.state={ordersLoaded:true,ordersError:null,selectedBatchOrderIds:[],orders:Array.from({length:64},(_,i)=>({id:'ORD-'+i,customerName:'Customer '+i,phone:'0901234567',createdAt:'2026-10-24T08:00:00+07:00',status:i%2?'confirmed':'pending',paymentStatus:'unpaid',paymentMethod:'cash',paymentMethodName:'Cash',total:100000,products:[]}))};
  window.PawpalOrdersModule={};
 });
 await page.addScriptTag({content:`(()=>{const state=window.state,formatVND=n=>String(n),getOrderSlaInfo=()=>({level:'normal'}),matchSearch=(a,b)=>String(a||'').toLowerCase().includes(b.toLowerCase());${source.slice(start,end)}${source.slice(selectionStart,selectionEnd)}window.testOrders={render:renderOrdersTable,clear:clearAllOrderFilters,filter:value=>{currentFilterStatus=value;ordersCurrentPage=1;renderOrdersTable()}};})();`});
 await page.evaluate(()=>testOrders.render());
 assert.equal(await page.locator('#ordersTableBody .order-row-checkbox').count(),10);
 assert.equal(await page.locator('#ordersPagination button').count(),7);
 assert.equal(await page.locator('#ordersPagination [data-page=prev]').isDisabled(),true);
 await page.click('#ordersPagination [data-page="5"]');
 assert.equal(await page.locator('#ordersTableBody .order-row-checkbox').first().getAttribute('data-id'),'ORD-40');
 await page.check('#checkSelectAllOrders');
 assert.equal(await page.evaluate(()=>state.selectedBatchOrderIds.length),10);
 await page.evaluate(()=>testOrders.filter('pending'));
 await page.check('#checkSelectAllOrders');
 assert.equal(await page.evaluate(()=>state.selectedBatchOrderIds.length),20);
 assert.equal(await page.evaluate(()=>state.selectedBatchOrderIds.includes('ORD-22')),false);
 await page.uncheck('#checkSelectAllOrders');
 assert.equal(await page.evaluate(()=>state.selectedBatchOrderIds.length),10);
 await page.fill('#orderSearchInput','Customer 62');
 await page.evaluate(()=>testOrders.render());
 assert.equal(await page.locator('#ordersTableBody .order-row-checkbox').count(),1);
 await page.fill('#orderSearchInput','no matching order');await page.evaluate(()=>testOrders.render());
 assert.equal(await page.locator('#ordersPagination').isVisible(),false);
 await page.evaluate(()=>{testOrders.clear();state.ordersError='test';testOrders.render()});
 assert.equal(await page.locator('#ordersPagination').isVisible(),false);
 assert.equal(await page.locator('#batchActionToolbar').isVisible(),false);
 assert.equal(await page.locator('#ordersTableBody .order-row-checkbox').count(),0);
 console.log('PASS order paging/search/status filter, page-only bulk selection, empty/error states; no database calls.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
