const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {settings,infra}=require('../database/v1/cloud_connection.cjs'),{config}=settings();
const service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async p=>{const r=await p;if(r.error)throw Error(r.error.message);return r.data;};
const phone='095'+String(crypto.randomInt(1000000,10000000)),password=crypto.randomBytes(20).toString('hex')+'!';
(async()=>{let uid,cid,pet,aid,browser,page;const lines=[];
 try{
  uid=(await ok(service.auth.admin.createUser({email:'service-review-'+crypto.randomUUID()+'@example.invalid',email_confirm:true,phone:'+84'+phone.slice(1),phone_confirm:true,password,app_metadata:{pawpal_test:true,user_type:'CUSTOMER'}}))).user.id;
  cid=await ok(service.rpc('complete_customer_auth',{p_auth_id:uid,p_phone:phone,p_name:'Service review verification'}));
  const svc=(await ok(service.from('service').select('id,service_name').limit(1)))[0],breed=(await ok(service.from('pet_breed').select('id').limit(1)))[0];
  pet=crypto.randomUUID();await ok(service.from('pet_profile').insert({id:pet,customer_id:cid,pet_code:'TEST-'+pet,pet_name:'Service review pet',breed_id:breed.id}));
  aid=crypto.randomUUID();await ok(service.from('appointment').insert({id:aid,appointment_code:'TEST-'+aid,customer_id:cid,pet_id:pet,scheduled_start_at:new Date(Date.now()-172800000).toISOString(),scheduled_end_at:new Date(Date.now()-169200000).toISOString(),appointment_status:'completed'}));
  for(let n=0;n<2;n++){const id=crypto.randomUUID();lines.push(id);await ok(service.from('appointment_item').insert({id,appointment_id:aid,service_id:svc.id,is_primary:n===0,name_snapshot:'Service review line '+n,quantity:1,unit_price:100,duration_minutes:60,status:'completed'}));}
  browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1440,height:1050}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(!process.argv.includes('--deployed'))for(const path of ['scripts/api/api.js','pages/user/modules/bookings/booking-detail.js','pages/user/modules/bookings/booking-detail.html'])await page.route('**/'+path+'*',r=>r.fulfill({contentType:path.endsWith('.html')?'text/html':'application/javascript',body:fs.readFileSync(path,'utf8')}));
  await page.goto('https://pawpalgr3.vercel.app/login');await page.locator('#loginPhone').fill(phone);await page.locator('#btnLoginContinue').click();await page.locator('#loginPassword').fill(password);await page.locator('#btnLoginSubmit').click();await page.waitForURL(/\/user\/?/,{timeout:45000});
  await page.waitForFunction(()=>Boolean(window.API?.getUserBookings));await page.evaluate(id=>{location.hash='booking-detail?id='+id;},aid);
  await page.locator('#btnSubmitServiceReview').waitFor();assert.equal(await page.locator('[data-service-rating]').count(),2);
  await page.locator('#btnSubmitServiceReview').click();await page.waitForFunction(()=>document.querySelector('#serviceReviewError')?.textContent.length>0);
  for(const id of lines){await page.locator(`[data-service-rating="${id}"]`).selectOption('5');await page.locator(`[data-service-content="${id}"]`).fill('Verified customer service review');}
  await ok(service.from('appointment').update({note:'Realtime while drafting'}).eq('id',aid));
  await page.waitForFunction(()=>document.querySelector('#noteInfo')?.textContent==='Realtime while drafting',{timeout:20000});
  for(const id of lines)assert.equal(await page.locator(`[data-service-content="${id}"]`).inputValue(),'Verified customer service review');
  await page.screenshot({path:infra+'/verification/service-reviews-form.private.png'});
  const response=page.waitForResponse(r=>r.url().includes('/rpc/submit_own_service_reviews'));await page.locator('#btnSubmitServiceReview').click();assert.equal((await response).status(),200);
  await page.waitForFunction(()=>document.querySelector('#serviceReviewStatus')?.textContent==='Đã đánh giá');
  const reviews=await ok(service.from('review').select('id,review_status').in('appointment_item_id',lines));assert.equal(reviews.length,2);assert.ok(reviews.every(r=>r.review_status==='pending'));
  await page.reload();await page.waitForFunction(()=>document.querySelector('#serviceReviewStatus')?.textContent==='Đã đánh giá');assert.equal(await page.locator('#btnSubmitServiceReview').count(),0);
  await ok(service.from('review').update({review_status:'published'}).eq('id',reviews[0].id));
  await page.waitForFunction(()=>document.querySelector('.service-review-body')?.textContent.includes('Đã công bố'),{timeout:20000});
  await ok(service.from('appointment').update({note:'Realtime service verification'}).eq('id',aid));
  await page.waitForFunction(()=>document.querySelector('#noteInfo')?.textContent==='Realtime service verification',{timeout:20000});
  await page.waitForFunction(()=>document.querySelector('.service-review-body')?.textContent.includes('Đã công bố'),{timeout:20000});
  await page.locator('#serviceReviewSection').scrollIntoViewIfNeeded();await page.screenshot({path:infra+'/verification/service-reviews-saved.private.png'});assert.deepEqual(errors,[]);
  console.log('PASS Cloud service review form: completed lines, required input, pending moderation, durable reload and no local-only success.');
 }catch(error){fs.writeFileSync(infra+'/verification/service-reviews-error.private.txt',String(error.message).replaceAll(password,'[REDACTED]').replaceAll(phone,'[PHONE]'));if(page)await page.screenshot({path:infra+'/verification/service-reviews-failure.private.png'}).catch(()=>{});throw Error('Service review verification failed; private evidence saved.');}
 finally{
  if(browser)await browser.close();if(lines.length)await ok(service.from('review').delete().in('appointment_item_id',lines));
  if(aid){await ok(service.from('appointment_item').delete().eq('appointment_id',aid));await ok(service.from('appointment').delete().eq('id',aid));}
  if(pet)await ok(service.from('pet_profile').delete().eq('id',pet));if(cid){for(const t of ['customer_membership','customer_phone','customer_profile'])await ok(service.from(t).delete().eq('customer_id',cid));await ok(service.from('customer').delete().eq('id',cid));}if(uid)await ok(service.auth.admin.deleteUser(uid));
 }
})().catch(e=>{console.error(e.message);process.exitCode=1;});
