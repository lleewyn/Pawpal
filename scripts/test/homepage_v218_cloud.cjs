// Read-only live business data and browser checks; never queries Cloud Logs.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {infra}=require('../database/v1/cloud_connection.cjs');
const base=process.argv.includes('--deployed')?'https://pawpalgr3.vercel.app':'http://localhost:3000';
(async()=>{
 let browser,page;const errors=[],dataFiles=[],queries=[];
 try{
  browser=await chromium.launch({channel:'chrome',headless:true});
  page=await browser.newPage({viewport:{width:1440,height:1000}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/data/'))dataFiles.push(r.url());if(r.url().includes('/rest/v1/'))queries.push(r.url());});
  await page.goto(base,{waitUntil:'networkidle'});
  await page.waitForFunction(()=>document.querySelectorAll('#home-services article').length===5&&document.querySelectorAll('#home-tiers [data-tier-index]').length>0);
  const expected=await page.evaluate(async()=>{
   const db=window.getSupabaseClient();const [catalog,tiers]=await Promise.all([db.rpc('public_service_directory'),db.from('membership_tier').select('id,tier_name,discount_percent').eq('is_active',true)]);
   if(catalog.error||tiers.error)throw Error('Business data unavailable');return {catalog:catalog.data,tiers:tiers.data};
  });
  const shownTiers=expected.tiers.filter(t=>['bac','vang','kimcuong'].includes(t.tier_name.normalize('NFD').replace(/[\u0300-\u036f\s]/g,'').toLowerCase().replace(/^hang/,'')));
  assert.equal(await page.locator('#home-tiers [data-tier-index]').count(),shownTiers.length);
  for(const tier of shownTiers)assert.ok((await page.locator('#home-tiers').textContent()).includes(tier.tier_name));
  for(let i=0;i<shownTiers.length;i++){
   const button=page.locator('[data-tier-index]').nth(i);await button.click();assert.equal(await button.getAttribute('aria-pressed'),'true');
   assert.ok((await page.locator('.home-member-bottom strong').textContent()).includes(String(Number(shownTiers[i].discount_percent))));
  }
  for(const category of ['spa','hotel','taxi','all']){
   await page.locator(`[data-category="${category}"]`).click();
   const ids=await page.locator('#home-services article').evaluateAll(rows=>rows.map(r=>r.dataset.serviceId));
   const code={spa:'grooming_spa',hotel:'pet_hotel',taxi:'pet_taxi'}[category];
   assert.ok(ids.length>0);assert.ok(ids.every(id=>expected.catalog.some(s=>s.id===id&&(!code||s.category_code===code))));
   if(category==='spa'){
    const first=expected.catalog.find(s=>s.id===ids[0]);const price=Math.min(...first.prices.map(p=>Number(p.unit_price)));
    assert.ok((await page.locator('.catalog-price').first().textContent()).includes(price.toLocaleString('vi-VN')));
   }
  }
  await page.locator('[data-entry="2"]').click();assert.equal(await page.locator('[data-entry="2"]').getAttribute('aria-pressed'),'true');
  assert.ok((await page.locator('#pj-photo-caption').textContent()).includes('Chuẩn bị bàn giao'));
  await page.locator('.v4-faq-item summary').first().click();assert.equal(await page.locator('.v4-faq-item').first().getAttribute('open'),'');
  assert.equal(await page.locator('.main-footer').isVisible(),true);
  assert.equal(await page.locator('.footer-map-section iframe').count(),1);
  assert.equal(await page.locator('.v4-footer').count(),0);
  assert.equal(await page.locator('#prevSlide').isVisible(),false); // Existing Cloud records have placeholder images.
  for(const width of [320,390,768,1024,1440,1920]){
   await page.setViewportSize({width,height:1000});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow at ${width}`);
   if([390,1440].includes(width)){
    await page.evaluate(async()=>{document.querySelectorAll('main img[loading]').forEach(i=>i.loading='eager');await Promise.all([...document.querySelectorAll('main img')].map(i=>i.decode().catch(()=>{})));});
    assert.equal(await page.locator('main img').evaluateAll(imgs=>imgs.filter(i=>!i.naturalWidth).length),0);
    await page.screenshot({path:infra+`/verification/home-v218-${width}.private.png`,fullPage:true});
   }
  }
  await page.setViewportSize({width:390,height:900});await page.evaluate(()=>scrollTo(0,0));
  await page.locator('#mobileNavToggle').click();assert.equal(await page.locator('#mobileNavToggle').getAttribute('aria-expanded'),'true');
  await page.locator('.mobile-nav-close').click();
  await page.setViewportSize({width:1440,height:1000});
  await page.locator('.v4-shop-lead a').click();await page.waitForURL('**/shop');
  await page.waitForFunction(()=>!document.body.classList.contains('landing-v218'));
  await page.locator('.navbar-brand').first().click();await page.waitForURL(url=>url.origin===new URL(base).origin&&['/','/pages/public/landing/landing.html'].includes(url.pathname));
  await page.waitForFunction(()=>document.querySelectorAll('#home-services article').length===5);
  const before=queries.filter(q=>q.includes('public_service_directory')).length;
  await page.evaluate(()=>document.dispatchEvent(new Event('DOMContentLoaded')));await page.waitForTimeout(500);
  assert.equal(queries.filter(q=>q.includes('public_service_directory')).length,before,'duplicate page initialization');
  await page.route('**/rest/v1/rpc/public_service_directory',r=>r.abort());
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForSelector('#home-retry');
  assert.equal(await page.locator('#home-services article').count(),0);
  await page.unroute('**/rest/v1/rpc/public_service_directory');await page.locator('#home-retry').click();
  await page.waitForFunction(()=>document.querySelectorAll('#home-services article').length===5);
  assert.deepEqual(errors,[]);assert.deepEqual(dataFiles,[]);
  console.log('PASS homepage V2.18: live catalog/prices/tiers, filters, diary demo, FAQ, mobile navigation, six widths, no broken images, SPA return, deduplicated reads and honest API failure/retry. Read-only; no Cloud Logs.');
 }catch(e){fs.writeFileSync(infra+'/verification/home-v218-error.private.txt',String(e.stack));if(page)await page.screenshot({path:infra+'/verification/home-v218-failure.private.png'}).catch(()=>{});throw Error('Homepage verification failed; private evidence saved.');}
 finally{if(browser)await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
