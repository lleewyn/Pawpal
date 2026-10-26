// Actual checkout orchestration with offline transport. No Cloud or payment calls.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{
  const u=new URL(route.request().url());if(u.origin!=='http://localhost')return route.abort();
  if(u.pathname==='/payment-success')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><p>Offline verified-order destination</p>'});
  if(u.pathname==='/checkout')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><button id="btn-checkout">Đặt hàng</button>'});
  let body=fs.readFileSync(path.join(process.cwd(),decodeURIComponent(u.pathname)),'utf8');
  if(u.pathname.endsWith('/checkout/checkout.js'))body+='\nexport {checkoutState,handleCheckout,recoverCheckoutOrder};';
  return route.fulfill({contentType:'text/javascript',body});
 });
 async function setup(mode,reset=false){
  await page.goto('http://localhost/checkout');
  await page.evaluate(async({mode,reset})=>{
   if(reset)sessionStorage.clear();
   const owner={id:'20000000-0000-4000-8000-000000000001',name:'E2E Owner'};localStorage.clear();localStorage.setItem('pawpal_current_user',JSON.stringify(owner));
   window.mode=mode;window.reads=[];
   window.bump=k=>{const n=Number(sessionStorage.getItem('metric:'+k)||0)+1;sessionStorage.setItem('metric:'+k,String(n));};
   window.getSupabaseClient=()=>({from(table){const filters=[];const q={select(){return q;},eq(k,v){filters.push([k,v]);return q;},async maybeSingle(){reads.push({table,filters});return {data:sessionStorage.getItem('committed')?{id:sessionStorage.getItem('committed')}:null};}};return q;}});
   window.API={
    async prepareOwnOrder(){bump('quote');if(mode==='actor-switch')await new Promise(r=>{window.releaseQuote=r;});return {quote:{version:'quote',total:105000},details:{},lines:[]};},
    async submitOrder(data){bump('create');sessionStorage.setItem('attempt',data.requestId);if(mode==='wrong-ack')return {success:true,orderId:null};sessionStorage.setItem('committed',data.requestId);if(mode==='lost-response')return {success:false,error:Error('Offline lost response')};return {success:true,orderId:data.requestId};},
    async removePurchasedCartItems(){bump('cleanup');if(mode==='cart-error')throw Error('Offline lost cart response');}
   };
   window.mod=await import('/pages/shop/checkout/checkout.js');
   Object.assign(mod.checkoutState,{user:owner,cart:[{id:'product',variantId:'variant',quantity:2,price:50000}],products:[],selectedAddress:{name:'E2E Receiver',phone:'0000000000',street:'E2E Street',city:'E2E City'},selectedPayment:'cod',selectedDelivery:'delivery',paymentMethods:[{id:'cod',configId:'method'}],totals:{subtotal:100000,shippingFee:5000,grandTotal:105000}});
   document.getElementById('btn-checkout').addEventListener('click',mod.handleCheckout);
  },{mode,reset});
 }
 await setup('lost-response',true);
 await page.evaluate(()=>{document.getElementById('btn-checkout').click();document.getElementById('btn-checkout').click();});
 await page.waitForFunction(()=>!mod.checkoutState.processing);
 const attempt=await page.evaluate(()=>sessionStorage.getItem('attempt'));
 assert.equal(await page.evaluate(()=>Number(sessionStorage.getItem('metric:create'))),1);
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('metric:cleanup')),null,'No cleanup without acknowledgement');
 assert.equal(await page.evaluate(()=>mod.checkoutState.cart.length),1);
 await setup('lost-response');
 const freshId=await page.evaluate(()=>mod.checkoutState.requestId);assert.notEqual(freshId,attempt,'Simulate module reload generating a new unused UUID');
 await page.evaluate(()=>mod.recoverCheckoutOrder());await page.waitForURL('**/payment-success?**');
 assert.equal(new URL(page.url()).searchParams.get('orderId'),attempt);
 assert.equal(new URL(page.url()).searchParams.get('cartReview'),'1');
 assert.equal(await page.evaluate(()=>Number(sessionStorage.getItem('metric:create'))),1,'Recovery must not create another order');
 assert.equal(await page.evaluate(()=>Number(sessionStorage.getItem('metric:quote'))),1,'Recovery precedes re-quoting stock');
 await setup('cart-error',true);await page.locator('#btn-checkout').click();await page.waitForURL('**/payment-success?**');
 assert.equal(new URL(page.url()).searchParams.get('cartReview'),'1');
 assert.equal(await page.evaluate(()=>Number(sessionStorage.getItem('metric:cleanup'))),1);
 await setup('cart-error');await page.evaluate(()=>mod.recoverCheckoutOrder());await page.waitForURL('**/payment-success?**');
 assert.equal(await page.evaluate(()=>Number(sessionStorage.getItem('metric:create'))),1);
 assert.equal(await page.evaluate(()=>Number(sessionStorage.getItem('metric:cleanup'))),1,'Ambiguous cart mutation must not be subtracted again');
 await setup('wrong-ack',true);await page.locator('#btn-checkout').click();await page.waitForFunction(()=>!mod.checkoutState.processing);
 assert.equal(new URL(page.url()).pathname,'/checkout');assert.equal(await page.evaluate(()=>sessionStorage.getItem('metric:cleanup')),null);
 await setup('actor-switch',true);await page.locator('#btn-checkout').click();await page.waitForFunction(()=>!!window.releaseQuote);
 await page.evaluate(()=>{localStorage.setItem('pawpal_current_user',JSON.stringify({id:'other-owner'}));releaseQuote();});
 await page.waitForFunction(()=>!mod.checkoutState.processing);
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('metric:create')),null,'Actor switch after quote must not create order');
 assert.deepEqual(errors,[]);
 console.log('PASS offline checkout: double click, lost response + reload, same-ID order recovery before quote, no ambiguous cart cleanup replay, wrong acknowledgement, actor switch. No Cloud calls.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
