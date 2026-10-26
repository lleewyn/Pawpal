// Read-only browser checks with cloud data and local UI resource overrides.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {load}=require('../database/v1/import_product_catalog_final.cjs');
const {connect}=require('../database/v1/service_import_connection.cjs');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'docs/verification/products-final');
const overrides=['scripts/shared/data-loader.js','pages/shop/shop.js','pages/shop/shop.css','pages/shop/product-detail/product-detail.js','pages/admin/modules/orders/orders.js','pages/admin/modules/orders/orders.html','pages/admin/modules/orders/orders.css','pages/admin/modules/orders/subtabs/tab-order-products.js'];
(async()=>{fs.mkdirSync(out,{recursive:true});const source=load();const db=await connect();let held;
 try{held=(await db.query("SELECT v.sku_variant,sum(r.quantity)::integer quantity FROM public.stock_reservation r JOIN public.product_variant v ON v.id=r.product_variant_id WHERE r.status='active' AND r.expires_at>now() AND NOT v.catalog_retired GROUP BY v.sku_variant")).rows;}finally{await db.end();}
 const heldBySku=new Map(held.map(r=>[r.sku_variant,r.quantity]));
 const browser=await chromium.launch({channel:'chrome',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[],files=[],writes=[];
 try{
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/data/'))files.push(r.url());});
  for(const file of overrides)await page.route('**/'+file+'*',route=>route.fulfill({contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(path.join(root,file),'utf8')}));
  await page.route('**/rest/v1/**',route=>{const r=route.request(),p=new URL(r.url()).pathname;if(!['GET','HEAD'].includes(r.method())&&!/\/rpc\/(get_|public_|customer_|own_|quote_|admin_customer_page$)/.test(p)){writes.push(p);return route.abort();}return route.continue();});
  await page.goto('https://pawpalgr3.vercel.app/shop');await page.waitForSelector('.product-card[data-product-id]');
  const products=await page.evaluate(()=>loadProducts());assert.equal(products.length,38);assert.equal(products.reduce((n,p)=>n+p.variants.length,0),65);assert.equal(products.reduce((n,p)=>n+p.stock,0),4028-held.reduce((n,r)=>n+r.quantity,0));
  for(const r of source.rows){const v=products.flatMap(p=>p.variants).find(v=>v.sku===r[14]);assert.ok(v,r[14]);assert.equal(v.name,r[15]);assert.equal(v.price,Number(r[25]));assert.equal(v.stock,Number(r[35])-(heldBySku.get(r[14])||0));}
  await page.screenshot({path:path.join(out,'customer-shop.png')});
  const royal=products.find(p=>p.productCode==='TP-HAT-01');
  await page.goto('https://pawpalgr3.vercel.app/pages/shop/product-detail/product-detail.html?id='+royal.id);
  await page.waitForSelector('.pd-variant-chip');assert.equal(await page.locator('.pd-variant-chip').count(),2);
  await page.locator('.pd-variant-chip').filter({hasText:/^1kg$/}).click();assert.ok((await page.locator('#productPrice').textContent()).includes('295.000'));assert.ok((await page.locator('#productPriceOld').textContent()).includes('310.000'));assert.equal(await page.locator('#productSKU').textContent(),'TP-HAT-01-V2');assert.ok((await page.locator('#productStockQty').textContent()).includes('29'));assert.equal(await page.locator('#quantity').getAttribute('max'),'29');
  assert.equal(await page.locator('.pd-variant-chip.active').textContent(),'1kg');await page.waitForTimeout(200);await page.screenshot({path:path.join(out,'customer-product-detail.png')});
  const ciao=products.find(p=>p.productCode==='TP-SUP-03');await page.goto('https://pawpalgr3.vercel.app/pages/shop/product-detail/product-detail.html?id='+ciao.id);await page.waitForSelector('.pd-variant-chip');
  await page.locator('.pd-variant-chip').filter({hasText:/^hải sản$/}).click();const ciaoSource=source.rows.find(r=>r[14]==='TP-SUP-03-V2');assert.equal(await page.locator('#dynamicProductDetails .pd-desc-text').textContent(),ciaoSource[3]);assert.ok((await page.locator('#dynamicProductDetails').textContent()).includes(ciaoSource[8]));
  const credentials=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8');await page.goto('https://pawpalgr3.vercel.app/admin/login');await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());await page.locator('#btnSubmitAdminLogin').click();await page.waitForURL('**/admin#tab-list');
  await page.evaluate(()=>location.hash='tab-order-products');await page.waitForFunction(()=>window.PawpalOrders?.state.productsLoaded||window.PawpalOrders?.state.productsError);
  const result=await page.evaluate(async()=>{await PawpalOrders.fetchProductsData({force:true});const p=await PawpalOrderV1.products({detail:true});return {count:p.products.length,variants:p.products.reduce((n,p)=>n+p.variants.length,0),stock:p.products.reduce((n,p)=>n+p.stock,0),royal:p.products.find(p=>p.raw.product_code==='TP-HAT-01'),pate:p.products.find(p=>p.raw.product_code==='TP-PATE-08')};});
  assert.equal(result.count,38);assert.equal(result.variants,65);assert.equal(result.stock,4028);assert.equal(result.royal.attr1Name,'Phân loại');
  for(const p of [result.royal,result.pate]){
   await page.evaluate(sku=>PawpalOrdersModule.openEditProductModal(sku),p.sku);await page.waitForSelector('#modalAddProduct.active');assert.equal(await page.locator('#productVariantsTableBody .variant-row-item').count(),p.variants.length);assert.equal(await page.locator('#attr1Name').inputValue(),'Phân loại');assert.equal(await page.locator('#productVariantsTableBody .variant-color-hex').count(),0);
   const first=page.locator('#productVariantsTableBody .variant-row-item').first();assert.equal(await first.locator('.variant-sku-input').inputValue(),p.variants[0].sku);assert.equal(Number(await first.locator('.variant-stock-input').inputValue()),p.variants[0].stock);
   await page.locator('#variantMatrixTable').scrollIntoViewIfNeeded();await page.locator('#variantMatrixTable').screenshot({path:path.join(out,'variant-table-'+p.raw.product_code+'.png')});
   await page.locator('#modalAddProduct .admin-modal-card').screenshot({path:path.join(out,'admin-'+p.raw.product_code+'.png')});
   await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.getElementById('modalAddProduct').classList.contains('active'));
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(sku=>PawpalOrdersModule.openEditProductModal(sku),result.royal.sku);await page.waitForSelector('#modalAddProduct.active');const box=await page.locator('#modalAddProduct .admin-modal-card').boundingBox();assert.ok(box.x>=0&&box.x+box.width<=391);await page.locator('#modalAddProduct .admin-modal-card').screenshot({path:path.join(out,'admin-mobile.png')});
  assert.deepEqual(writes,[]);assert.deepEqual(files,[]);assert.deepEqual(errors,[]);console.log('PASS 38 products / 65 variants / 4028 stock; customer variant names, price/compare price, SKU, stock and variant description/ingredients; admin tuples preserved, mobile bounds, no writes or data-file fallback.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
