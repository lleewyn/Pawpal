// Read-only Cloud catalogue and local browser verification. No Cloud Logs or fixtures.
const assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {infra}=require('../database/v1/cloud_connection.cjs');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],files=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/data/'))files.push(r.url());});
  await page.goto('http://localhost:3000/shop',{waitUntil:'networkidle'});
  await page.waitForSelector('.product-card[data-product-id]');
  const catalog=await page.evaluate(async()=>{const r=await getSupabaseClient().rpc('customer_shop_catalog');if(r.error)throw Error(r.error.message);return r.data.map(p=>({id:p.id,name:p.product_name}));});
  const ids=await page.locator('.product-card[data-product-id]').evaluateAll(es=>es.map(e=>e.dataset.productId));
  assert.ok(ids.every(id=>catalog.some(p=>p.id===id)));
  await page.locator('.product-wishlist-btn').first().click();assert.equal(await page.locator('.product-wishlist-btn.active').count(),0);
  await page.locator('.product-quick-add:not([disabled])').first().click();assert.ok(await page.locator('#buyNowQuantityModal').isVisible());
  assert.ok(await page.locator('#buyNowModalVariants').textContent());
  await page.locator('.buy-now-modal__close').click();assert.equal(await page.locator('#buyNowQuantityModal').isVisible(),false);
  await page.locator('#searchInput').fill('zzzz-no-matching-product');await page.waitForFunction(()=>!document.querySelector('#emptyState')?.classList.contains('d-none'));
  await page.locator('#searchInput').fill('');await page.waitForSelector('.product-card[data-product-id]');
  for(const width of [1920,1440,768,390]){
   await page.setViewportSize({width,height:1000});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(width===1440||width===390)await page.screenshot({path:infra+`/verification/shop-editorial-${width}.private.png`});
  }
  await page.locator('#btnMobileFilter').click();assert.ok(await page.locator('#shopSidebar').evaluate(e=>e.classList.contains('show')));await page.locator('#closeShopSidebar').click();
  await page.route('**/rest/v1/rpc/customer_shop_catalog',r=>r.abort());await page.reload({waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelector('#productsGrid')?.textContent.includes('Không thể tải dữ liệu sản phẩm'));
  assert.deepEqual(files,[]);assert.deepEqual(errors,[]);
  console.log('PASS local shop: Cloud-owned product identities, guest wishlist, variant dialog open/close, search empty state, four widths, mobile filters and honest API failure. No fixtures or Cloud Logs.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
