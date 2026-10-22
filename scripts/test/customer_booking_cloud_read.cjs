const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {settings,infra}=require('../database/v1/cloud_connection.cjs');
const {config}=settings(),options={auth:{persistSession:false,autoRefreshToken:false}};
const service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options);
const ok=async promise=>{const r=await promise;if(r.error)throw Error(r.error.message);return r.data;};
const phone='095'+String(crypto.randomInt(1000000,10000000)),password=crypto.randomBytes(20).toString('hex')+'!';
(async()=>{
 let uid,cid,pet,browser,page,moveService;const ids=[];
 try{
  uid=(await ok(service.auth.admin.createUser({email:'booking-'+crypto.randomUUID()+'@example.invalid',email_confirm:true,phone:'+84'+phone.slice(1),phone_confirm:true,password,app_metadata:{pawpal_test:true,user_type:'CUSTOMER'}}))).user.id;
  cid=await ok(service.rpc('complete_customer_auth',{p_auth_id:uid,p_phone:phone,p_name:'Booking verification'}));
  let svc=(await ok(service.from('service').select('id,service_name').limit(1)))[0];
  let breed=(await ok(service.from('pet_breed').select('id').limit(1)))[0];
  if(process.argv.includes('--move')){
   breed=(await ok(service.from('pet_breed').select('id,species_id').limit(1)))[0];
   const category=await ok(service.from('service_category').select('id').eq('category_code','grooming_spa').single());
   moveService=crypto.randomUUID();svc={id:moveService,service_name:'Move verification service'};
   await ok(service.from('service').insert({...svc,service_code:'TEST-'+moveService,category_id:category.id,estimated_duration:60,status:'active'}));
   await ok(service.from('service_supported_species').insert({service_id:moveService,species_id:breed.species_id}));
   await ok(service.from('service_price_matrix').insert({service_id:moveService,weight_from:0,weight_to:null,unit_price:700,effective_from:new Date(Date.now()-86400000).toISOString(),status:'active'}));
  }
  pet=crypto.randomUUID();await ok(service.from('pet_profile').insert({id:pet,customer_id:cid,pet_code:'TEST-'+pet,pet_name:'Booking pet verification',breed_id:breed.id}));
  if(process.argv.includes('--move'))await ok(service.from('pet_weight_history').insert({pet_id:pet,weight:5}));
  const starts=new Date(Date.now()+86400000).toISOString(),ends=new Date(Date.now()+90000000).toISOString();
  for(let i=0;i<2;i++){
   const id=crypto.randomUUID();ids.push(id);
   await ok(service.from('appointment').insert({id,appointment_code:'TEST-'+id,customer_id:cid,pet_id:pet,scheduled_start_at:starts,scheduled_end_at:ends,appointment_status:process.argv.includes('--move')?'confirmed':'pending'}));
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
  if(process.argv.includes('--move')){
   await page.locator('.btn-change-schedule').first().click();await page.locator('#bookingMoveQuote').click();
   assert.equal(await page.locator('#bookingMoveError').isVisible(),true);
   await page.keyboard.press('Escape');await page.locator('#quickRescheduleBookingModal').waitFor({state:'detached'});
   await page.locator('.btn-change-schedule').first().click();
   const day=new Date(Date.now()+3*86400000).toISOString().slice(0,10);
   await page.locator('#bookingMoveStart').fill(day+'T10:00');
   const [quoted]=await Promise.all([page.waitForResponse(r=>r.url().includes('/rpc/quote_own_booking_move')&&r.request().method()==='POST'),page.locator('#bookingMoveQuote').click()]);
   assert.equal(quoted.status(),200);const quote=await quoted.json();
   await page.locator('#quickConfirmRescheduleBtn').click();assert.equal(await page.locator('#bookingMoveError').isVisible(),true);
   await page.locator('#bookingMoveReason').fill('Customer move browser verification');
   await page.screenshot({path:infra+'/verification/customer-booking-move.private.png'});
   const [moved]=await Promise.all([page.waitForResponse(r=>r.url().includes('/rpc/reschedule_own_service_booking')&&r.request().method()==='POST'),page.locator('#quickConfirmRescheduleBtn').click()]);
   assert.equal(moved.status(),200);const payload=moved.request().postDataJSON();
   await page.locator('#quickRescheduleBookingModal').waitFor({state:'detached'});
   const saved=await ok(service.from('appointment').select('appointment_status,scheduled_start_at,scheduled_end_at,change_count').eq('id',payload.p_id).single());
   assert.equal(saved.appointment_status,'pending');assert.equal(saved.change_count,1);assert.equal(Date.parse(saved.scheduled_start_at),Date.parse(quote.start_at));
   assert.equal(Date.parse(saved.scheduled_end_at)-Date.parse(saved.scheduled_start_at),3600000);
   assert.equal(Number((await ok(service.from('appointment_item').select('unit_price').eq('appointment_id',payload.p_id).single())).unit_price),Number(quote.lines[0].unit_price));
   const replay=await page.evaluate(async args=>{const r=await getSupabaseClient().rpc('reschedule_own_service_booking',args);return {data:r.data,error:r.error?.message};},payload);
   assert.equal(replay.data,payload.p_id);assert.equal(replay.error,undefined);
   assert.equal((await ok(service.from('audit_log').select('id').eq('entity_id',payload.p_id).eq('action','CUSTOMER_RESCHEDULE_APPOINTMENT'))).length,1);
   await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#bookingsList .booking-card').length===2,{timeout:30000});
   assert.equal(await page.locator('.btn-change-schedule').count(),1);
   const remaining=ids.find(id=>id!==payload.p_id);
   await page.evaluate(id=>{location.hash='booking-detail?id='+id;},remaining);
   await page.locator('#btnChangeSchedule').waitFor({state:'visible'});await page.locator('#btnChangeSchedule').click();
   await page.locator('#quickRescheduleBookingModal').waitFor({state:'visible'});
   await page.keyboard.press('Escape');await page.locator('#quickRescheduleBookingModal').waitFor({state:'detached'});
   await page.locator('#btnChangeSchedule').click();await page.locator('#bookingMoveStart').fill(day+'T14:00');
   const [detailQuote]=await Promise.all([page.waitForResponse(r=>r.url().includes('/rpc/quote_own_booking_move')&&r.request().method()==='POST'),page.locator('#bookingMoveQuote').click()]);
   assert.equal(detailQuote.status(),200);await page.locator('#bookingMoveReason').fill('Move from booking detail');
   const [detailMoved]=await Promise.all([page.waitForResponse(r=>r.url().includes('/rpc/reschedule_own_service_booking')&&r.request().method()==='POST'),page.locator('#quickConfirmRescheduleBtn').click()]);
   assert.equal(detailMoved.status(),200);await page.locator('#quickRescheduleBookingModal').waitFor({state:'detached'});
   await page.waitForFunction(()=>document.querySelector('#headerStatusBadge')?.textContent.includes('Chờ xác nhận'),{timeout:30000});
  }
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
  console.log('PASS Cloud booking list/owner totals'+(process.argv.includes('--cancel')?', cancellation required reason/Escape, atomic confirmation/audit and durable reload':'')+(process.argv.includes('--move')?', move quote/reason/Escape, canonical price/duration, idempotency and durable reload':'')+'; no collection created.');
 }catch(error){
  fs.writeFileSync(infra+'/verification/customer-booking-read-error.private.txt',String(error.message).replaceAll(password,'[REDACTED]').replaceAll(phone,'[PHONE]'));
  if(page)await page.screenshot({path:infra+'/verification/customer-booking-read-failure.private.png'}).catch(()=>{});
  throw Error('Booking read verification failed; private evidence saved outside webroot.');
 }finally{
  if(browser)await browser.close();
  for(const id of ids){await ok(service.from('appointment_item').delete().eq('appointment_id',id));await ok(service.from('appointment').delete().eq('id',id));}
  if(moveService){for(const table of ['service_supported_species','service_price_matrix'])await ok(service.from(table).delete().eq('service_id',moveService));await ok(service.from('service').delete().eq('id',moveService));}
  if(pet){await ok(service.from('pet_weight_history').delete().eq('pet_id',pet));await ok(service.from('pet_profile').delete().eq('id',pet));}
  if(cid){for(const table of ['customer_membership','customer_phone','customer_profile'])await ok(service.from(table).delete().eq('customer_id',cid));await ok(service.from('customer').delete().eq('id',cid));}
  if(uid)await ok(service.auth.admin.deleteUser(uid));
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
