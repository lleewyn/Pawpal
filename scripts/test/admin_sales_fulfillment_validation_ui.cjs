// Isolated browser regression: no network or business writes.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.route('**/*',r=>r.abort());
  await page.route('http://localhost:3001/',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><html><body></body></html>'}));
  await page.goto('http://localhost:3001/');
  await page.setContent(fs.readFileSync('pages/admin/modules/orders/orders.html','utf8'),{waitUntil:'domcontentloaded'});
  // Mirror the complete Admin stylesheet cascade and body scope for visual evidence.
  const shell=fs.readFileSync('pages/admin/index.html','utf8');
  for(const match of shell.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="(\/[^"?]+)[^"]*"[^>]*>/g))await page.addStyleTag({content:fs.readFileSync(match[1].slice(1),'utf8')});
  await page.evaluate(()=>{document.body.className='admin-body';document.documentElement.lang='vi';});
  await page.evaluate(()=>{
   window.calls=[];window.notices=[];
   window.PawpalOrders={state:{orders:[{id:'ORD-QA',rawId:'qa-id',rawStatus:'shipped',status:'shipping',updatedAt:'v1',shippingReceiver:{name:'Receiver',phone:'0901234567',province:'Province',street:'Street'},trackingNumber:'JT8839201923',providerId:'provider',shippedAt:'2026-10-27',collected:0,products:[],createdAt:'2026-10-27'}]},helpers:{showToast:m=>notices.push(m),formatVND:String},fetchOrdersData:async()=>{},fetchProductsData:async()=>{}};
   window.PawpalOrdersModule={escapeHtml:v=>String(v).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))};window.PawpalSalesCheckout={message:e=>e.message};window.PawpalCustomerIdentity={label:()=>''};
   window.PawpalOrderV1={rows:async()=>[{id:'provider',provider_name:'J&T Express'}]};
   window.getSupabaseClient=()=>({from:()=>{const q={};for(const k of ['select','eq','order'])q[k]=()=>q;return q;},rpc:async(name,args)=>{calls.push({name,args});return {error:null};}});
  });
  const source=fs.readFileSync('pages/admin/modules/orders/subtabs/tab-order-list.js','utf8').replace(/\r\n/g,'\n');
  await page.addScriptTag({content:source.slice(0,source.indexOf('})();')+5)});
  const enhanceStart=source.indexOf('    m.enhanceEntitySelects = function()');
  await page.addScriptTag({content:'const m=window.PawpalOrders;'+source.slice(enhanceStart,source.indexOf('\n    };',enhanceStart)+7)});
  const start=source.indexOf("(function(){\n 'use strict';\n const m=window.PawpalOrders,api=window.PawpalOrdersModule,el=id=>");
  assert.ok(start>=0);await page.addScriptTag({content:source.slice(start,source.indexOf('})();',start)+5)});
  const openShip=()=>page.evaluate(()=>PawpalOrdersModule.openShipModal('ORD-QA'));
  const ship=()=>page.evaluate(()=>document.getElementById('btnSubmitShipOrder').onclick());
  await openShip();assert.equal(await page.locator('#shipCarrierSelect').inputValue(),'provider');
  assert.equal(await page.locator('#btnSubmitShipOrder').textContent(),'Lưu vận đơn');
  for(const value of ['', '   ', 'JT 8839201923', 'A'.repeat(201)]){
   await page.locator('#shipTrackingInput').evaluate((e,v)=>e.value=v,value);await ship();
   assert.ok(await page.locator('#shipTrackingError').textContent());assert.equal(await page.evaluate(()=>calls.length),0);
  }
  await page.locator('#shipTrackingInput').fill(' JT8839201923 ');
  await page.locator('#shipCarrierNote').evaluate(e=>e.value='N'.repeat(251));await ship();assert.equal(await page.evaluate(()=>calls.length),0);
  await page.locator('#shipCarrierNote').fill('  Giao nhanh  ');await ship();
  assert.deepEqual(await page.evaluate(()=>calls[0].args.p_details),{provider_id:'provider',tracking_code:'JT8839201923',note:'Giao nhanh'});
  assert.equal(await page.evaluate(()=>calls[0].args.p_action),'update_shipping');
  await page.evaluate(()=>{PawpalOrders.state.orders[0].rawStatus='confirmed';calls.length=0;});await openShip();await ship();assert.equal(await page.evaluate(()=>calls[0].args.p_action),'ship');
  await page.evaluate(()=>{calls.length=0;PawpalOrders.state.orders[0].shippingReceiver={name:'Receiver',phone:'0901234567',province:'',street:''};});
  await openShip();await ship();assert.equal(await page.evaluate(()=>calls.length),0);
  assert.equal(await page.locator('#shipReceiverFields').evaluate(e=>e.style.display),'flex');
  await page.locator('#shipReceiverProvince').fill('Province');await page.locator('#shipReceiverStreet').fill('Street');await ship();
  assert.deepEqual(await page.evaluate(()=>calls[0].args.p_details.receiver),{name:'Receiver',phone:'0901234567',province:'Province',street:'Street'});
  await page.evaluate(()=>{calls.length=0;PawpalOrdersModule.openCancelModal('ORD-QA');document.getElementById('cancelOrderReasonSelect').value='Lý do khác';document.getElementById('cancelOrderReasonDetail').value='   ';});
  const cancel=()=>page.evaluate(()=>document.getElementById('btnSubmitCancelOrder').onclick());
  await cancel();assert.equal(await page.evaluate(()=>calls.length),0);assert.equal(await page.locator('#salesCancelError').textContent(),'Nhập ghi chú khi chọn lý do khác, tối đa 1000 ký tự.');
  await page.locator('#cancelOrderReasonDetail').evaluate(e=>e.value='N'.repeat(1001));await cancel();assert.equal(await page.evaluate(()=>calls.length),0);
  await page.locator('#cancelOrderReasonDetail').fill('  Khách đổi kế hoạch  ');await cancel();assert.equal(await page.evaluate(()=>calls[0].args.p_details.note),'Khách đổi kế hoạch');
  await page.evaluate(()=>{calls.length=0;PawpalOrders.state.orders[0].rawStatus='completed';document.getElementById('modalCancelOrder').classList.remove('active');PawpalOrdersModule.openCancelModal('ORD-QA');});
  assert.equal(await page.locator('#modalCancelOrder').evaluate(e=>e.classList.contains('active')),false);
  // Verify actual detail actions on incomplete and valid shipped orders.
  await page.evaluate(()=>{const m=PawpalOrders;m.controllers={};m.state.ordersLoaded=true;m.state.selectedOrderId='ORD-QA';m.state.orders[0].status='shipping';m.state.orders[0].providerId=null;m.renderSalesReturns=()=>{};m.helpers.formatDateTime=String;});
  await page.addScriptTag({content:fs.readFileSync('pages/admin/modules/orders/subtabs/tab-order-detail.js','utf8')});
  await page.evaluate(()=>PawpalOrders.controllers.detail.renderOrderDetail('ORD-QA'));
  assert.ok(!(await page.locator('#detailOrderActionButtons').textContent()).includes('Đã giao hàng thành công'));
  await page.evaluate(()=>{PawpalOrders.state.orders[0].providerId='provider';PawpalOrders.controllers.detail.renderOrderDetail('ORD-QA');});
  assert.ok((await page.locator('#detailOrderActionButtons').textContent()).includes('Đã giao hàng thành công'));
  await page.evaluate(()=>{Object.assign(PawpalOrders.state.orders[0],{paymentStatus:'paid',paymentMethodName:'Tiền mặt',total:493500,collected:493500,refunded:0,remaining:0,timeline:[{title:'Thu tiền',time:'2026-10-27T08:00:00Z',desc:'Tiền mặt',done:true}]});PawpalOrders.controllers.detail.renderOrderDetail('ORD-QA');});
  assert.equal(await page.locator('#detailPaymentMethod').textContent(),'Tiền mặt');assert.equal(await page.locator('#detailPaymentBadge').textContent(),'Đã thanh toán');assert.equal(await page.locator('#detailPaymentCollected').textContent(),'493500');assert.equal(await page.locator('#detailPaymentRemaining').textContent(),'0');assert.ok((await page.locator('#detailOrderTimeline').textContent()).includes('Thu tiền'));
  const folder='docs/verification/admin-orders-fulfillment';fs.mkdirSync(folder,{recursive:true});
  await page.evaluate(()=>{PawpalOrders.state.orders[0].rawStatus='shipped';});await openShip();
  await page.locator('#shipTrackingInput').fill('JT 8839201923');await ship();
  await page.screenshot({path:folder+'/tracking-validation.png'});
  await page.evaluate(()=>{document.getElementById('modalShipOrder').classList.remove('active');PawpalOrders.state.orders[0].rawStatus='confirmed';PawpalOrdersModule.openCancelModal('ORD-QA');document.getElementById('cancelOrderReasonSelect').value='Lý do khác';});
  await cancel();await page.setViewportSize({width:390,height:844});await page.screenshot({path:folder+'/cancel-validation-mobile.png'});
  console.log('PASS shipping/update action, carrier selection, invalid tracking/notes blocked before RPC, trimmed notes, cancellation eligibility, completion requires handover. No business writes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
