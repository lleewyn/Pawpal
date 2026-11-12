const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
module.exports=async function evidence(before,after){
 const dir='docs/verification/order-cancellation';fs.mkdirSync(dir,{recursive:true});
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1365,height:1000}});let receipt=before;
 const order=()=>({id:receipt.code,_supabaseId:receipt.id,orderStatus:receipt.status,status:receipt.status,paymentStatus:'pending_payment',createdAt:new Date().toISOString(),updatedAt:receipt.updatedAt,cancelReason:receipt.cancelReason,shipping:{name:receipt.receiver?.name,address:receipt.receiver?.address},pricing:{subtotal:receipt.total,grandTotal:receipt.total},products:receipt.lines.map(l=>({name:l.name,quantity:l.quantity,sku:l.sku,total:l.unitPrice*l.quantity}))});
 await page.route('**/*',async route=>{
  const u=new URL(route.request().url());if(u.hostname!=='localhost')return route.abort();
  if(u.pathname==='/scripts/api/api.js')return route.fulfill({contentType:'text/javascript',body:`export const API={getUserOrders:async()=>(${JSON.stringify([order()])})};`});
  if(/\/(return-handler|review-handler)\.js$/.test(u.pathname))return route.fulfill({contentType:'text/javascript',body:''});
  if(u.pathname==='/scripts/shared/guest-commerce-client.mjs')return route.fulfill({contentType:'text/javascript',body:`export const guestCommerce={request:async()=>({order:${JSON.stringify(receipt)}})};`});
  const file=path.join(process.cwd(),u.pathname);if(!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({body:'<html><body></body></html>',contentType:'text/html'});
  const type=file.endsWith('.css')?'text/css':/\.m?js$/.test(file)?'text/javascript':file.endsWith('.html')?'text/html':'image/webp';return route.fulfill({body:fs.readFileSync(file),contentType:type});
 });
 const baseStyles='<meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/node_modules/bootstrap/dist/css/bootstrap.min.css"><link rel="stylesheet" href="/styles/style.css">';
 async function user(){
  await page.goto('http://localhost/?id='+receipt.id);await page.setContent(baseStyles+'<link rel="stylesheet" href="/pages/user/user.css"><link rel="stylesheet" href="/pages/user/modules/orders/order-detail.css">'+fs.readFileSync('pages/user/modules/orders/order-detail.html','utf8'));
  await page.evaluate(()=>document.body.className='user-portal-body');
  await page.addStyleTag({content:'body{padding:30px;background:#f4f9f6;font-family:Arial,sans-serif}.order-detail-module-container{max-width:1250px;margin:auto}'});
  await page.evaluate(async()=>{localStorage.setItem('pawpal_current_user',JSON.stringify({id:'rollback-verification'}));window.SupabaseClient={channel:()=>({on(){return this;},subscribe(){return this;}}),removeChannel(){}};const m=await import('/pages/user/modules/orders/order-detail.js');await m.init();});
 }
 await user();await page.locator('#detail-cancel-order').click();assert.equal(await page.locator('dialog input[type=radio]').count(),7);
 await page.locator('#detail-action-confirm').click();assert.match(await page.locator('#detail-action-error').textContent(),/Vui lòng/);
 await page.locator('dialog input[type=radio]').last().check();assert.ok(await page.locator('#detail-cancel-reason').isVisible());
 await page.locator('#detail-cancel-reason').fill('Lý do riêng của khách');
 await page.keyboard.press('Escape');assert.equal(await page.locator('dialog').count(),0);await page.locator('#detail-cancel-order').click();
 await page.locator('dialog input[type=radio]').first().check();
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('#detail-action-confirm')).backgroundColor==='rgb(35, 107, 72)');
 assert.equal(await page.locator('#detail-action-confirm').evaluate(e=>getComputedStyle(e).boxShadow),'none');
 await page.screenshot({path:dir+'/user-reasons-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:dir+'/user-reasons-mobile.png'});await page.setViewportSize({width:1365,height:1000});
 receipt=after;await user();assert.equal(await page.locator('[data-cancellation-summary] p').textContent(),after.cancelReason);await page.screenshot({path:dir+'/user-cancelled-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 assert.equal(await page.locator('#order-status-badge').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(247, 220, 220)');
 assert.ok(await page.locator('.product-item-info').evaluate(e=>e.getBoundingClientRect().width>150));
 await page.screenshot({path:dir+'/user-cancelled-mobile.png'});await page.setViewportSize({width:1365,height:1000});
 receipt=before;
 await page.goto('http://localhost/?order='+receipt.id);await page.setContent(baseStyles+'<main style="max-width:1050px;margin:40px auto;padding:24px"><form id="lookup"></form></main>');
 await page.evaluate(()=>document.body.className='lookup-public-page');
 await page.evaluate(async()=>{const {mountGuestOrderLookup}=await import('/pages/public/return-guest/guest-booking-lookup.mjs');mountGuestOrderLookup(document.querySelector('form'));});
 await page.getByRole('button',{name:'Hủy đơn hàng',exact:true}).click();await page.locator('dialog input[type=radio]').first().check();
 await page.waitForFunction(()=>getComputedStyle(document.querySelector('dialog .btn-cta')).backgroundColor==='rgb(35, 107, 72)');
 await page.screenshot({path:dir+'/guest-receipt-reasons.png'});
 await page.getByRole('button',{name:'Đóng',exact:true}).click();receipt=after;
 await page.goto('http://localhost/?order='+receipt.id);await page.setContent(baseStyles+'<main style="max-width:1050px;margin:40px auto;padding:24px"><form id="lookup"></form></main>');
 await page.evaluate(()=>document.body.className='lookup-public-page');
 await page.evaluate(async()=>{const {mountGuestOrderLookup}=await import('/pages/public/return-guest/guest-booking-lookup.mjs');mountGuestOrderLookup(document.querySelector('form'));});
 await page.waitForSelector('[data-cancellation-summary] p');assert.equal(await page.locator('[data-cancellation-summary] p').textContent(),after.cancelReason);await page.screenshot({path:dir+'/guest-receipt-cancelled.png'});
 await page.goto('http://localhost/');await page.setContent(baseStyles+'<link rel="stylesheet" href="/pages/public/return-guest/return-guest.css"><main id="proof" style="max-width:1100px;padding:30px;margin:auto"></main>');
 await page.evaluate(()=>document.body.className='lookup-public-page');
 await page.addScriptTag({content:fs.readFileSync('pages/public/return-guest/return-guest.js','utf8')});
 await page.evaluate(receipt=>{const mapped={id:receipt.code,_supabaseId:receipt.id,status:receipt.status,cancelReason:receipt.cancelReason,pricing:{total:receipt.total},products:receipt.lines.map(l=>({name:l.name,quantity:l.quantity,price:l.unitPrice})),delivery:{name:receipt.receiver?.name}};document.querySelector('#proof').innerHTML=buildOrderCard(mapped);},receipt);
 assert.match(await page.locator('#proof').innerText(),/Tôi muốn thay đổi địa chỉ giao hàng/);await page.screenshot({path:dir+'/lookup-cancelled.png'});
 await page.goto('http://localhost/');await page.setContent('<link rel="stylesheet" href="/pages/admin/admin.css"><link rel="stylesheet" href="/pages/admin/admin-components.css"><link rel="stylesheet" href="/pages/admin/modules/orders/orders.css"><link rel="stylesheet" href="/pages/admin/modules/orders/orders-v8.css">'+fs.readFileSync('pages/admin/modules/orders/orders.html','utf8'));
 const model={id:receipt.code,rawId:receipt.id,status:receipt.status,cancelReason:receipt.cancelReason,customerType:'guest',customerName:'Kiểm chứng hủy đơn (hoàn tác)',phone:'0950000001',createdAt:new Date().toISOString(),products:order().products,timeline:[],total:receipt.total,subtotal:receipt.total};
 await page.addScriptTag({content:fs.readFileSync('scripts/shared/customer-identity.js','utf8')});
 await page.evaluate(model=>{window.PawpalOrdersModule={escapeHtml:v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};window.PawpalOrders={controllers:{},state:{ordersLoaded:true,orders:[model]},helpers:{formatVND:v=>Number(v||0).toLocaleString('vi-VN')+' đ',formatDateTime:v=>String(v),formatTime:String,showToast(){}}};},model);
 let src=fs.readFileSync('pages/admin/modules/orders/subtabs/tab-order-detail.js','utf8');src=src.slice(0,src.indexOf('\n})();')+6);await page.addScriptTag({content:src});
 await page.evaluate(id=>{document.querySelectorAll('.subtab-content').forEach(e=>e.style.display='none');const content=document.getElementById('orderDetailData');for(let p=content;p;p=p.parentElement){p.style.display='block';p.hidden=false;}window.PawpalOrdersModule.renderOrderDetail(id);},receipt.code);
 await page.addStyleTag({content:'body{padding:28px;background:#f4f9f6;font-family:Arial,sans-serif}#orderDetailData{max-width:1280px;margin:auto}'});
 assert.equal(await page.locator('#detailOrderCancellation p').textContent(),after.cancelReason);await page.locator('#orderDetailData').screenshot({path:dir+'/admin-cancelled.png'});
 await page.evaluate(()=>{document.querySelector('#modalCancelOrder').classList.add('active');});
 await page.selectOption('#cancelOrderReasonSelect',{index:1});
 assert.equal(await page.locator('#cancelOrderReasonSelect option').count(),12);await page.screenshot({path:dir+'/admin-cancel-reasons.png'});
 console.log('PASS rendered user desktop/mobile reason picker and cancelled summary, guest receipt, Admin guest order; screenshots use Cloud rollback receipt.');
 }finally{await browser.close();}
};

