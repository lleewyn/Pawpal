const fs=require('node:fs'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {settings,infra}=require('../database/v1/cloud_connection.cjs'),{config}=settings();
const db=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,{auth:{persistSession:false}});
(async()=>{let browser,page;try{
 const {data:catalog,error}=await db.rpc('public_service_directory');if(error)throw Error(error.message);assert.ok(catalog.length>0);
 const cat=catalog.find(s=>s.service_code==='SPA09'),dog=catalog.find(s=>s.service_code==='SPA03');assert.ok(cat&&dog);
 const reviews=await db.rpc('public_service_reviews',{p_service:cat.id});if(reviews.error)throw Error(reviews.error.message);
 browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[],files=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/data/'))files.push(r.url());});
 if(!process.argv.includes('--deployed'))for(const path of ['scripts/shared/data-loader.js','pages/services/services.js','pages/services/services.css','pages/services/service-detail/service-detail.js','pages/services/service-detail/service-detail.html'])await page.route('**/'+path+'*',r=>r.fulfill({contentType:path.endsWith('.html')?'text/html':path.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(path,'utf8')}));
 await page.goto('https://pawpalgr3.vercel.app/services');await page.waitForFunction(()=>document.querySelectorAll('.service-card').length>0);
 // Pagination shows at most the configured page; all identities come from the live directory.
 const codes=await page.locator('.service-card').evaluateAll(cards=>cards.map(c=>c.dataset.id));assert.ok(codes.every(code=>catalog.some(s=>s.service_code===code)));
 assert.equal(await page.locator('.service-card-member-price-row').count(),0);
 assert.equal(await page.locator('.service-card-price').first().evaluate(el=>getComputedStyle(el).textDecorationLine.includes('line-through')),false);
 const hotelCard=page.locator('.service-card[data-id="HTL01"]');if(await hotelCard.count())assert.ok((await hotelCard.locator('.service-card-price').textContent()).includes('Báo giá khi đặt lịch'));
 await page.waitForFunction(()=>[...document.querySelectorAll('.service-card')].every(c=>Number(getComputedStyle(c).opacity)===1));
 await page.waitForFunction(()=>[...document.querySelectorAll('.service-card img')].every(i=>i.complete&&i.naturalWidth>0));
 await page.screenshot({path:infra+'/verification/public-services-list.private.png'});
 await page.goto('https://pawpalgr3.vercel.app/pages/services/service-detail/service-detail.html?id=SPA09');
 await page.waitForFunction(name=>document.querySelector('#detailServiceTitle')?.textContent===name,cat.service_name);
 await page.waitForFunction(()=>!document.querySelector('.service-reviews-section')?.classList.contains('sd-loading'));
 assert.equal(await page.locator('.member-tier-price-card').count(),0);assert.equal(await page.locator('.review-item').count(),reviews.data.length);
 const species=await page.locator('#detailPetType').textContent();assert.ok(cat.species.every(name=>species.includes(name)));
 for(const review of reviews.data)assert.ok((await page.locator('.service-reviews-section').textContent()).includes(review.review_content));
 await page.waitForFunction(()=>{const i=document.querySelector('#mainShowcaseImg');return i?.complete&&i.naturalWidth>0;});
 await page.locator('#detailServiceTitle').scrollIntoViewIfNeeded();await page.screenshot({path:infra+'/verification/public-service-detail.private.png'});
 await page.route('**/rest/v1/rpc/public_service_directory',r=>r.abort());await page.goto('https://pawpalgr3.vercel.app/services');
 await page.waitForFunction(()=>document.querySelector('#servicesGrid')?.textContent.includes('Không thể tải dữ liệu dịch vụ'));
 assert.deepEqual(files,[]);assert.deepEqual(errors,[]);
 console.log('PASS anonymous live service catalog/detail, configured species, published review counts, no invented member discounts or data-file fallback. No fixtures created.');
 }catch(e){fs.writeFileSync(infra+'/verification/public-services-error.private.txt',e.message);if(page)await page.screenshot({path:infra+'/verification/public-services-failure.private.png'}).catch(()=>{});throw Error('Public service verification failed; private evidence saved.');}finally{if(browser)await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
