const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const a='12345678-1234-4123-8123-123456789012',b='22345678-1234-4123-8123-123456789012',c='32345678-1234-4123-8123-123456789012';
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!=='http://localhost')return route.abort();
  if(u.pathname==='/')return route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/pages/shop/cart/cart.css"><style>.d-none{display:none}*{box-sizing:border-box}body{margin:16px;font:14px Arial}</style><body class="cart-public-page"><div id="cart-content-row"><div id="cart-items-list"></div></div><div id="cart-empty-state"></div><span id="cart-count-header"></span><span id="cart-select-count"></span><span id="cart-subtotal"></span><div class="grand-total"><span></span><span id="cart-grand-total"></span></div><input type="checkbox" id="select-all-items"><button id="btn-clear-cart">Clear</button><a href="/checkout" id="btn-proceed-checkout">Checkout</a>`});
  if(u.pathname.endsWith('.mjs')||u.pathname.endsWith('.css'))return route.fulfill({contentType:u.pathname.endsWith('.mjs')?'text/javascript':'text/css',body:fs.readFileSync(path.join(process.cwd(),u.pathname),'utf8')});
  return route.fulfill({contentType:'image/svg+xml',body:'<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50"><rect width="50" height="50" fill="green"/></svg>'});
 });
 async function init(lines){await page.goto('http://localhost/');await page.evaluate(async({a,b,c,lines})=>{
  if(lines)localStorage.setItem('pawpal_guest_cart_v1',JSON.stringify(lines));window.catalogLoads=0;
  window.DataLoader={loadProducts:async()=>{catalogLoads++;return [{id:'product',name:'Test product',variants:[{id:a,name:'Pink',price:10000,stock:10,images:['/pink.svg']},{id:b,name:'Green',price:20000,stock:6,images:['/green.svg']},{id:c,name:'Unavailable',price:30000,stock:0,images:[]}]}];}};
  await (await import('/pages/shop/cart/guest-cart-page.mjs')).initGuestCartPage();
 },{a,b,c,lines});}
 const row=id=>page.locator('.cart-item-row[data-variant-id="'+id+'"]');
 async function choose(from,to){await row(from).locator('.btn-variant-toggle').click();await row(from).locator('.guest-variant-option[data-variant-id="'+to+'"]').click();await row(from).waitFor({state:'detached'});await row(to).waitFor();}
 await init([{variant_id:a,quantity:2}]);await choose(a,b);
 assert.equal(await row(b).locator('.cart-item-qty-value').textContent(),'2');assert.match(await row(b).locator('img').getAttribute('src'),/green/);assert.match(await row(b).locator('.cart-item-price-unit').textContent(),/20.000/);assert.match(await page.locator('#cart-grand-total').textContent(),/40.000/);
 assert.equal(await row(b).locator('.item-checkbox').isChecked(),true);assert.equal(await page.locator('#btn-proceed-checkout').getAttribute('aria-disabled'),'false');assert.equal(await page.evaluate(()=>catalogLoads),1);
 await init();assert.equal(await row(b).count(),1);
 await init([{variant_id:a,quantity:2},{variant_id:b,quantity:3}]);await choose(a,b);assert.equal(await page.locator('.cart-item-row').count(),1);assert.equal(await row(b).locator('.cart-item-qty-value').textContent(),'5');
 await row(b).locator('.btn-variant-toggle').click();assert.equal(await row(b).locator('[data-variant-id="'+c+'"]').isDisabled(),true);await page.keyboard.press('Escape');assert.equal(await row(b).locator('.btn-variant-toggle').getAttribute('aria-expanded'),'false');assert.equal(await row(b).locator('.btn-variant-toggle').evaluate(n=>n===document.activeElement),true);
 await init([{variant_id:a,quantity:4},{variant_id:b,quantity:3}]);await row(a).locator('.btn-variant-toggle').click();assert.equal(await row(a).locator('[data-variant-id="'+b+'"]').isDisabled(),true);await page.locator('#cart-count-header').click();assert.equal(await row(a).locator('.btn-variant-toggle').getAttribute('aria-expanded'),'false');
 await init([{variant_id:a,quantity:2}]);await row(a).locator('.item-checkbox').uncheck();await choose(a,b);assert.equal(await row(b).locator('.item-checkbox').isChecked(),false);assert.equal(await page.locator('#btn-proceed-checkout').getAttribute('aria-disabled'),'true');
 await page.setViewportSize({width:390,height:844});await row(b).locator('.btn-variant-toggle').click();const rect=await row(b).locator('.guest-variant-menu').boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=390,JSON.stringify(rect));await page.screenshot({path:'docs/verification/sync/guest-cart-variant-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS real Chrome / actual cart module: variant image/price/total, quantity, persisted reload, merge, stock rejection, selection, Escape/focus/outside close, mobile bounds. Fixture catalog only; no Cloud writes or external requests.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
