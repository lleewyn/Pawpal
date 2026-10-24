const fs=require('fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await browser.newPage();
 await p.route('http://localhost:3001/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));await p.goto('http://localhost:3001/');
 await p.setContent(fs.readFileSync('pages/admin/modules/orders/orders.html','utf8'),{waitUntil:'domcontentloaded'});
 await p.evaluate(()=>{window.selectedCodes=[];window.vouchers=[{code:"SAVE'\"<test>",title:'<img src=x onerror=alert(1)>',target:'<b>Customers</b>',status:'active',value:10,type:'percent',validDate:'<em>today</em>'}];window.PawpalOrders={state:{vouchersLoaded:true},helpers:{formatVND:String,getSharedVouchersList:()=>vouchers,matchSearch:(a,b)=>String(a||'').includes(b)},controllers:{}};window.PawpalOrdersModule={openVoucherActionModal:code=>selectedCodes.push(code)}});
 let source=fs.readFileSync('pages/admin/modules/orders/subtabs/tab-order-promos.js','utf8');source=source.slice(0,source.indexOf('    let isPromosEventsInitialized'))+'})();';await p.addScriptTag({content:source});
 await p.evaluate(()=>PawpalOrders.controllers.promos.renderVouchersTable());
 assert.equal(await p.locator('#vouchersTableBody img, #vouchersTableBody b, #vouchersTableBody em').count(),0);
 assert.equal(await p.locator('#vouchersTableBody [data-voucher-code]').getAttribute('data-voucher-code'),"SAVE'\"<test>");
 await p.locator('#vouchersTableBody [data-voucher-code]').evaluate(e=>e.click());
 assert.deepEqual(await p.evaluate(()=>selectedCodes),["SAVE'\"<test>"]);
 await p.fill('#promoSearchInput','not found');await p.evaluate(()=>PawpalOrders.controllers.promos.renderVouchersTable());assert.equal(await p.locator('#vouchersTableBody [data-voucher-code]').count(),0);
 await p.evaluate(()=>{PawpalOrders.state.vouchersError='test';PawpalOrders.controllers.promos.renderVouchersTable()});assert.equal(await p.locator('#vouchersTableBody [data-voucher-code]').count(),0);
 console.log('PASS promotion text escaping, action code with quotes, search and error; no database calls.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exit(1)});
