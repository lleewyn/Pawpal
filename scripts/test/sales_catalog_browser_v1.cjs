const assert=require('node:assert/strict');
const {browserPage,infra,service,ok}=require('./customer_completion_helpers.cjs');
(async()=>{const {browser,page}=await browserPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});try{
 await page.locator('[data-title="Bán hàng"]').click();await page.waitForFunction(()=>window.PawpalOrders?.state.productsLoaded);
 const product=await page.evaluate(()=>{const p=window.PawpalOrders.state.products.find(p=>p.variants.length===1&&p.variants[0].stock>0);window.PawpalOrders.switchSubtab('tab-order-products');window.PawpalOrdersModule.openEditProductModal(p.sku);return {id:p.id,variant:p.variants[0].id};});
 await page.locator('#newProdBrand').fill('Browser verification');
 const saved=page.waitForResponse(r=>r.url().includes('/rpc/save_admin_sales_product'));
 await page.locator('#btnSubmitAddProduct').click();const response=await saved;if(response.status()!==200){const d=response.request().postDataJSON();console.log('validation',Object.fromEntries(Object.entries(d.p_details).map(([k,v])=>[k,typeof v==='string'?v.length:v===null?'null':typeof v])));}assert.equal(response.status(),200,await response.text());
 await page.waitForFunction(()=>!document.getElementById('modalAddProduct').classList.contains('active'));
 assert.equal((await ok(service.from('product').select('brand_name').eq('id',product.id).single())).brand_name,'Browser verification');
 assert.ok(await ok(service.from('product_variant').select('id').eq('id',product.variant).single()));
 await page.evaluate(()=>window.PawpalOrdersModule.openAddProductModal());
 await page.screenshot({path:infra+'/sales-catalog-modal.private.png',fullPage:true});
 await page.locator('#modalAddProduct [data-close-modal="modalAddProduct"]').first().click();
 await page.evaluate(()=>window.PawpalOrdersModule.openAddProductModal());
 const category=(await ok(service.from('product_category').select('category_name').limit(1).single())).category_name;
 const newSku='BROWSER-'+require('node:crypto').randomUUID();
 await page.locator('#newProdName').fill('Browser matrix verification');await page.locator('#newProdSku').fill(newSku);
 await page.locator('#newProdCategory').fill(category);await page.locator('#newProdUnit').fill('unit');
 await page.evaluate(()=>{const a=window.PawpalOrdersModule;a.toggleVariantMode(true);a.addTagValue(1,'Verification A');a.addTagValue(1,'Verification B');a.generateVariantMatrix();});
 const matrix=page.locator('#productVariantsTableBody .variant-row-item');assert.equal(await matrix.count(),2);
 for(const row of await matrix.all()){
  assert.equal(await row.locator('.variant-stock-input').inputValue(),'');
  await row.locator('.variant-cost-input').fill('10');await row.locator('.variant-price-input').fill('30');await row.locator('.variant-stock-input').fill('2');
 }
 const created=page.waitForResponse(r=>r.url().includes('/rpc/save_admin_sales_product'));await page.locator('#btnSubmitAddProduct').click();const createResponse=await created;assert.equal(createResponse.status(),200,await createResponse.text());
 await page.waitForFunction(()=>!document.getElementById('modalAddProduct').classList.contains('active'));
 const createdVariants=await ok(service.from('product_variant').select('id,sku_variant').like('sku_variant',newSku+'%'));assert.equal(createdVariants.length,2);
 await page.evaluate(()=>{const p=window.PawpalOrders.state.products.find(p=>p.variants.some(v=>window.PawpalOrders.state.stockLogs.some(l=>l.sku===v.sku)));window.PawpalOrdersModule.openStockLogsModal(p.sku);});
 await page.locator('#modalStockLogs.active').waitFor();
 assert.ok(await page.locator('#stockLogsTableBody tr').count()<=10);
 assert.match(await page.locator('#modalStockLogs thead').textContent(),/SKU/);
 await page.screenshot({path:infra+'/sales-stock-history-modal.private.png',fullPage:true});
 assert.deepEqual(errors,[]);console.log('PASS catalog browser edit persisted with variant ID intact and new modal opens');
 }finally{await browser.close();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
