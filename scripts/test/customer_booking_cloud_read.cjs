const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {settings,infra}=require('../database/v1/cloud_connection.cjs');
const {config}=settings(),options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options);
const ok=async promise=>{const r=await promise;if(r.error)throw Error(r.error.message);return r.data;};
const phone='095'+String(crypto.randomInt(1000000,10000000)),password=crypto.randomBytes(20).toString('hex')+'!';
(async()=>{
 let uid,cid,pet,browser,page;const ids=[];
 try{
  uid=(await ok(service.auth.admin.createUser({email:'booking-'+crypto.randomUUID()+'@example.invalid',email_confirm:true,phone:'+84'+phone.slice(1),phone_confirm:true,password,app_metadata:{pawpal_test:true,user_type:'CUSTOMER'}}))).user.id;
  cid=await ok(service.rpc('complete_customer_auth',{p_auth_id:uid,p_phone:phone,p_name:'Booking verification'}));
  const breed=(await ok(service.from('pet_breed').select('id').limit(1)))[0];
  pet=crypto.randomUUID();await ok(service.from('pet_profile').insert({id:pet,customer_id:cid,pet_code:'TEST-'+pet,pet_name:'Booking pet verification',breed_id:breed.id}));
  const svc=(await ok(service.from('service').select('id,service_name').limit(1)))[0];
  const starts=new Date(Date.now()+86400000).toISOString(),ends=new Date(Date.now()+90000000).toISOString();
  for(let i=0;i<2;i++){
   const id=crypto.randomUUID();ids.push(id);
   await ok(service.from('appointment').insert({id,appointment_code:'TEST-'+id,customer_id:cid,pet_id:pet,scheduled_start_at:starts,scheduled_end_at:ends,appointment_status:'pending'}));
   await ok(service.from('appointment_item').insert({appointment_id:id,service_id:svc.id,is_primary:true,name_snapshot:svc.service_name,quantity:1,unit_price:100,duration_minutes:60}));
  }
  browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1440,height:1050}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  if(!process.argv.includes('--deployed'))for(const path of ['scripts/api/api.js','scripts/shared/customer-identity.mjs','scripts/shared/customer-realtime.mjs','scripts/shared/customer-booking.mjs','pages/user/modules/bookings/bookings.js','pages/user/modules/bookings/booking-detail.js']){
   await page.route('**/'+path+'*',route=>route.fulfill({contentType:'application/javascript',body:fs.readFileSync(path,'utf8')}));
  }
  await page.goto('https://pawpalgr3.vercel.app/login');await page.locator('#loginPhone').fill(phone);await page.locator('#btnLoginContinue').click();
  await page.locator('#loginPassword').fill(password);await page.locator('#btnLoginSubmit').click();await page.waitForURL(/\/user\/?/,{timeout:45000});
  await page.waitForFunction(()=>Boolean(window.API?.getUserBookings),{timeout:30000});
  await page.evaluate(()=>{location.hash='bookings';});
  await page.waitForFunction(()=>document.querySelectorAll('#bookingsList .booking-card').length===2,{timeout:30000});
  const rows=await page.evaluate(async()=>window.API.getUserBookings(JSON.parse(localStorage.getItem('pawpal_current_user'))));
  assert.equal(rows.length,2);assert.ok(rows.every(b=>b.price===100&&b.paymentStatus==='pending'));
  await page.screenshot({path:infra+'/verification/customer-booking-list.private.png',fullPage:true});
  if(process.argv.includes('--cancel')){
   await page.locator('.btn-cancel-booking').first().click();
   await page.locator('#quickConfirmCancelBtn').click();
   assert.equal(await page.locator('#bookingCancelError').isVisible(),true);
   await page.keyboard.press('Escape');await page.locator('#quickCancelBookingModal').waitFor({state:'detached'});
   await page.locator('.btn-cancel-booking').first().click();
   await page.locator('#bookingCancelReason').fill('Customer cancellation browser verification');
   await page.screenshot({path:infra+'/verification/customer-booking-cancel.private.png'});
   const [response]=await Promise.all([page.waitForResponse(r=>r.url().includes('/rpc/cancel_own_service_booking')&&r.request().method()==='POST'),page.locator('#quickConfirmCancelBtn').click()]);
   assert.equal(response.status(),200);
   const payload=response.request().postDataJSON();
   await page.locator('#quickCancelBookingModal').waitFor({state:'detached'});
   const cancelled=await ok(service.from('appointment').select('appointment_status').eq('id',payload.p_id).single());
   assert.equal(cancelled.appointment_status,'cancelled');
   const audit=await ok(service.from('audit_log').select('description').eq('entity_id',payload.p_id).eq('action','CUSTOMER_CANCEL_APPOINTMENT'));
   assert.equal(audit.length,1);assert.equal(JSON.parse(audit[0].description).reason,'Customer cancellation browser verification');
   await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#bookingsList .booking-card').length===2,{timeout:30000});
   assert.equal(await page.locator('.btn-cancel-booking').count(),1);
   const remaining=ids.find(id=>id!==payload.p_id);
   await page.evaluate(id=>{location.hash='booking-detail?id='+id;},remaining);
   await page.locator('#btnCancelBooking').waitFor({state:'visible'});
   await page.locator('#btnCancelBooking').click();
   await page.locator('#quickCancelBookingModal').waitFor({state:'visible'});
   await page.keyboard.press('Escape');await page.locator('#quickCancelBookingModal').waitFor({state:'detached'});
   await page.locator('#btnCancelBooking').click();await page.locator('#bookingCancelReason').fill('Cancellation from booking detail');
   const [detailResponse]=await Promise.all([page.waitForResponse(r=>r.url().includes('/rpc/cancel_own_service_booking')&&r.request().method()==='POST'),page.locator('#quickConfirmCancelBtn').click()]);
   assert.equal(detailResponse.status(),200);await page.locator('#quickCancelBookingModal').waitFor({state:'detached'});
   await page.waitForFunction(()=>document.querySelector('#headerStatusBadge')?.textContent.includes('Đã hủy'),{timeout:30000});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS Cloud booking list/owner totals'+(process.argv.includes('--cancel')?', cancellation required reason/Escape, atomic confirmation/audit and durable reload':'')+'; no collection created.');
 }catch(error){
  fs.writeFileSync(infra+'/verification/customer-booking-read-error.private.txt',String(error.message).replaceAll(password,'[REDACTED]').replaceAll(phone,'[PHONE]'));
  if(page)await page.screenshot({path:infra+'/verification/customer-booking-read-failure.private.png'}).catch(()=>{});
  throw Error('Booking read verification failed; private evidence saved outside webroot.');
 }finally{
  if(browser)await browser.close();
  for(const id of ids){await ok(service.from('appointment_item').delete().eq('appointment_id',id));await ok(service.from('appointment').delete().eq('id',id));}
  if(pet)await ok(service.from('pet_profile').delete().eq('id',pet));
  if(cid){for(const table of ['customer_membership','customer_phone','customer_profile'])await ok(service.from(table).delete().eq('customer_id',cid));await ok(service.from('customer').delete().eq('id',cid));}
  if(uid)await ok(service.auth.admin.deleteUser(uid));
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
