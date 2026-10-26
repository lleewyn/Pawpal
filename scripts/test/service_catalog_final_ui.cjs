// Read-only UI acceptance against cloud data, with local source overrides.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const root=path.resolve(__dirname,'../..'),out=path.join(root,'docs/verification/services-final');
const overrides=['scripts/shared/data-loader.js','pages/services/services.js','pages/services/service-detail/service-detail.js','pages/services/booking/booking.js','pages/admin/modules/services/services.js','pages/admin/modules/services/services.html','pages/admin/modules/services/services.css','pages/admin/modules/services/subtabs/tab-service-catalog.js','pages/admin/modules/services/subtabs/tab-service-bookings.js'];
(async()=>{
 fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[],dataFiles=[],writes=[];
 try{
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/data/'))dataFiles.push(r.url());});
  for(const file of overrides)await page.route('**/'+file+'*',route=>route.fulfill({contentType:file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(path.join(root,file),'utf8')}));
  await page.route('**/rest/v1/**',route=>{const r=route.request(),p=new URL(r.url()).pathname;if(!['GET','HEAD'].includes(r.method())&&!/\/rpc\/(get_|public_|customer_service_catalog|own_|quote_|admin_customer_page$)/.test(p)){writes.push(p);return route.abort();}return route.continue();});
  await page.goto('https://pawpalgr3.vercel.app/services');await page.waitForFunction(()=>document.querySelectorAll('.service-card').length>0);
  const catalog=await page.evaluate(()=>loadServices());assert.equal(catalog.length,24);
  const spa=catalog.find(s=>s.serviceId==='SVC-SPA-01'),taxi=catalog.find(s=>s.serviceId==='SVC-TAX-02'),day=catalog.find(s=>s.serviceId==='SVC-HTL-07');
  assert.equal(spa.price,120000);assert.equal(taxi.price,280000);assert.equal(day.price,100000);assert.equal(day.priceDisplay,'giờ');assert.ok(spa.benefits);assert.equal(spa.images.length,4);
  await page.screenshot({path:path.join(out,'customer-catalog.png')});
  await page.goto('https://pawpalgr3.vercel.app/pages/services/service-detail/service-detail.html?id=SVC-SPA-01');
  await page.waitForFunction(()=>document.querySelector('#detailServiceTitle')?.textContent.includes('Tắm'));
  await page.locator('#weightClassOptions button').nth(1).click();assert.ok((await page.locator('#detailBasePrice').textContent()).includes('170.000'));assert.equal(await page.locator('#detailDuration').textContent(),'75 phút');
  await page.screenshot({path:path.join(out,'customer-detail.png')});
  const credentials=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8');
  await page.goto('https://pawpalgr3.vercel.app/admin/login');await page.locator('#inputAdminEmail').fill(credentials.match(/^Email: (.+)$/m)[1].trim());await page.locator('#inputAdminPassword').fill(credentials.match(/^Password: (.+)$/m)[1].trim());await page.locator('#btnSubmitAdminLogin').click();await page.waitForURL('**/admin#tab-list');
  await page.evaluate(()=>location.hash='tab-service-catalog');await page.waitForFunction(()=>window.PawpalServices?.state.isLoaded||window.PawpalServices?.state.loadError);
  await page.evaluate(()=>PawpalServices.loadCatalogData({force:true}));
  const services=await page.evaluate(()=>PawpalServices.state.servicesData.map(s=>({code:s.code,price:s.minPrice,variants:s.priceRows.length,group:s.group})));assert.equal(services.length,24);assert.equal(services.reduce((n,s)=>n+s.variants,0),37);assert.equal(services.find(s=>s.code==='SVC-TAX-02').price,280000);
  for(const [code,count]of [['SVC-SPA-01',4],['SVC-TAX-02',4],['SVC-HTL-07',1]]){
   await page.evaluate(code=>PawpalServices.subtabs.catalog.openEditServiceModal(code),code);await page.waitForFunction(()=>getComputedStyle(document.getElementById('modalServiceForm')).display!=='none');
   assert.equal(await page.locator('#serviceVariantEditor [data-variant-price]').count(),count);assert.ok(await page.locator('#formServiceBenefits').inputValue());
   await page.locator('#modalServiceForm .admin-modal-card').screenshot({path:path.join(out,'admin-'+code+'.png')});
   await page.keyboard.press('Escape');await page.waitForFunction(()=>getComputedStyle(document.getElementById('modalServiceForm')).display==='none');
  }
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>PawpalServices.subtabs.catalog.openEditServiceModal('SVC-TAX-02'));
  const bounds=await page.locator('#modalServiceForm .admin-modal-card').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=391);await page.locator('#modalServiceForm .admin-modal-card').screenshot({path:path.join(out,'admin-mobile.png')});
  assert.deepEqual(writes,[]);assert.deepEqual(dataFiles,[]);assert.deepEqual(errors,[]);console.log('PASS cloud catalog: 24 services/37 variants, customer price and duration, admin variant forms, mobile bounds, no data-file fallback or database writes.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
