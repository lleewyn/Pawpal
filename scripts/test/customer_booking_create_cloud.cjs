const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js'),{chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
const {settings,infra,sql}=require('../database/v1/cloud_connection.cjs');const{config}=settings();
const service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const ok=async task=>{const r=await task;if(r.error)throw Error(r.error.message);return r.data;};
const phone='095'+String(crypto.randomInt(1000000,10000000)),password=crypto.randomBytes(20).toString('hex')+'!';
(async()=>{let uid,cid,pet,room,roomType,browser,page;const services=[];
 try{
  uid=(await ok(service.auth.admin.createUser({email:'booking-create-'+crypto.randomUUID()+'@example.invalid',email_confirm:true,phone:'+84'+phone.slice(1),phone_confirm:true,password,app_metadata:{pawpal_test:true,user_type:'CUSTOMER'}}))).user.id;
  cid=await ok(service.rpc('complete_customer_auth',{p_auth_id:uid,p_phone:phone,p_name:'Booking create verification'}));
  const catSpecies=await ok(service.from('pet_species').select('id').eq('species_name','Mèo').single());
  const breed=(await ok(service.from('pet_breed').select('id,species_id').eq('species_id',catSpecies.id).limit(1)))[0];pet=crypto.randomUUID();
  await ok(service.from('pet_profile').insert({id:pet,customer_id:cid,pet_code:'TEST-'+pet,pet_name:'Booking form pet',breed_id:breed.id}));
  await ok(service.from('pet_weight_history').insert({pet_id:pet,weight:5}));
  roomType=crypto.randomUUID();room=crypto.randomUUID();
  await ok(service.from('hotel_room_type').insert({id:roomType,room_type:'Booking form verification',capacity:1,daily_price:300,status:'active'}));
  await ok(service.from('hotel_room').insert({id:room,room_number:'TEST-'+room,room_type_id:roomType,status:'active'}));
  for(const category of ['grooming_spa','pet_hotel','pet_taxi']){
   const cat=await ok(service.from('service_category').select('id').eq('category_code',category).single());
   const id=crypto.randomUUID(),name='Booking form verify '+category;services.push({id,name,category});
   await ok(service.from('service').insert({id,service_code:'TEST-'+id,service_name:name,estimated_duration:60,status:'active',category_id:cat.id}));
   await ok(service.from('service_supported_species').insert({service_id:id,species_id:breed.species_id}));
   await ok(service.from('service_addon').insert({service_id:id,addon_name:'Booking required addon',price:50,estimated_duration:15,is_required:true,status:'active'}));
   if(category==='grooming_spa')await ok(service.from('service_price_matrix').insert({service_id:id,weight_from:0,weight_to:null,unit_price:700,effective_from:new Date(Date.now()-86400000).toISOString(),status:'active'}));
  }
  browser=await chromium.launch({channel:'chrome',headless:true});page=await browser.newPage({viewport:{width:1440,height:1100},locale:'vi-VN'});
  const errors=[],legacy=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/data/'))legacy.push(r.url());});
  if(!process.argv.includes('--deployed'))for(const path of ['pages/services/booking/booking.js','pages/services/booking/booking.css','pages/services/booking-success/booking-success.html','pages/services/booking-success/booking-success.js','pages/user/modules/bookings/booking-detail.js','pages/user/modules/bookings/booking-detail.html','scripts/shared/customer-realtime.mjs'])await page.route('**/'+path+'*',route=>route.fulfill({contentType:path.endsWith('.html')?'text/html':path.endsWith('.css')?'text/css':'application/javascript',body:fs.readFileSync(path,'utf8')}));
  await page.goto('https://pawpalgr3.vercel.app/login');await page.locator('#loginPhone').fill(phone);await page.locator('#btnLoginContinue').click();await page.locator('#loginPassword').fill(password);await page.locator('#btnLoginSubmit').click();
  await page.waitForURL(/\/user\/?/,{timeout:45000});await page.waitForFunction(()=>Boolean(window.API?.getUserBookings));
  const day=new Date(Date.now()+3*86400000).toISOString().slice(0,10),nextDay=new Date(Date.now()+4*86400000).toISOString().slice(0,10);
  const publicClient=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const realCatalog=await ok(publicClient.rpc('customer_service_catalog'));
  const catGroom=realCatalog.services.find(s=>s.code==='SPA09'),dogOnly=realCatalog.services.find(s=>s.code==='SPA03');
  assert.ok(catGroom.species_ids.includes(catSpecies.id));assert.equal(dogOnly.species_ids.includes(catSpecies.id),false);
  await page.goto('https://pawpalgr3.vercel.app/booking?service='+catGroom.id);await page.locator('#bookingPet').waitFor({timeout:30000});
  await page.locator('#bookingPet').fill('Booking form pet');await page.locator('#bookingPetOptions button').first().click();await page.locator('#step1Next').click();
  assert.equal(await page.locator('#bookingService').inputValue(),catGroom.name);
  await page.locator('#bookingService').fill(dogOnly.name);assert.equal(await page.locator('#bookingServiceOptions button').count(),0);
  const actual=await page.evaluate(async details=>{const r=await getSupabaseClient().rpc('quote_own_service_booking',{p_details:details});return {data:r.data,error:r.error?.message};},
   {pet_id:pet,service_id:catGroom.id,scheduled_start_at:day+'T10:00:00+07:00',addon_ids:catGroom.addons.filter(a=>a.required).map(a=>a.id)});
  assert.equal(actual.error,undefined);assert.ok(Number.isFinite(Number(actual.data.total)));
  for(const svc of services){
   await page.goto('https://pawpalgr3.vercel.app/services?search='+encodeURIComponent(svc.name));
   await page.locator(`.service-card[data-id="TEST-${svc.id}"] .service-card-link`).click();
   await page.waitForFunction(name=>document.querySelector('#detailServiceTitle')?.textContent===name,svc.name);
   await page.locator('#btnPanelBook').click();await page.waitForURL(/booking/);
   assert.equal(new URL(page.url()).searchParams.has('price'),false);
   await page.locator('#bookingPet').waitFor({timeout:30000});
   await page.locator('#bookingPet').fill('Booking form pet');await page.locator('#bookingPetOptions button').first().click();await page.locator('#step1Next').click();
   assert.equal(await page.locator('#bookingService').inputValue(),svc.name);
   assert.equal(await page.locator('.booking-addon:checked').count(),1);await page.locator('#step2Next').click();
   await page.locator('#step3Next').click();assert.ok((await page.locator('#bookingStartError').textContent()).length>0);
   await page.locator('#bookingStart').fill(day+'T10:00');
   if(svc.category==='pet_hotel'){
    assert.equal(await page.locator('#bookingPickup').count(),0);await page.locator('#bookingEnd').fill(nextDay+'T11:00');
    await page.locator('#bookingRoom').fill('TEST-'+room);await page.locator('#bookingRoomOptions button').first().click();
   }else if(svc.category==='pet_taxi'){
    assert.equal(await page.locator('#bookingEnd').count(),0);await page.locator('#bookingPickup').fill('Verification pickup');await page.locator('#bookingDropoff').fill('Verification dropoff');
    await page.locator('#bookingDistance').fill('16');await page.locator('#bookingTrip').selectOption('round_trip');await page.locator('#bookingReturn').fill(day+'T12:00');
   }else{assert.equal(await page.locator('#bookingEnd').count(),0);assert.equal(await page.locator('#bookingPickup').count(),0);}
   await page.locator('#bookingNote').fill('Customer form creation verification');
   const [quoted]=await Promise.all([page.waitForResponse(r=>r.url().includes('/rpc/quote_own_service_booking')&&r.request().method()==='POST'),page.locator('#step3Next').click()]);
   assert.equal(quoted.status(),200);const quote=await quoted.json();
   await page.locator('#policyCheck').waitFor();await page.locator('#policyCheck').check();
   await page.screenshot({path:infra+'/verification/customer-booking-create-'+svc.category+'.private.png'});
   const [created]=await Promise.all([page.waitForResponse(r=>r.url().includes('/rpc/create_own_service_booking')&&r.request().method()==='POST'),page.locator('#confirmBookingBtn').click()]);
   assert.equal(created.status(),200);const args=created.request().postDataJSON();await page.waitForURL(/booking-detail/,{timeout:30000});
   await page.locator('#btnCancelBooking').waitFor();
   const saved=await ok(service.from('appointment').select('appointment_code,appointment_status,staff_id,scheduled_end_at').eq('id',args.p_id).single());
   await page.waitForFunction(code=>document.querySelector('#bookingCode')?.textContent===code,saved.appointment_code);
   assert.ok((await page.locator('#netPaidInfo').textContent()).includes('0'));assert.equal((await page.locator('#netPaidInfo').textContent()).includes('Giá theo'),false);
   assert.equal(saved.appointment_status,'pending');assert.equal(saved.staff_id,null);assert.equal(Date.parse(saved.scheduled_end_at),Date.parse(quote.end_at));
   assert.equal((await ok(service.from('appointment_item').select('id').eq('appointment_id',args.p_id))).length,2);
   assert.equal((await ok(service.from('payment').select('id').eq('appointment_id',args.p_id))).length,0);
   const replay=await page.evaluate(async args=>{const r=await getSupabaseClient().rpc('create_own_service_booking',args);return {data:r.data,error:r.error?.message};},args);assert.equal(replay.data,args.p_id);assert.equal(replay.error,undefined);
   if(svc.category==='grooming_spa')assert.equal(Number(quote.total),750);
   if(svc.category==='grooming_spa'&&process.argv.includes('--integrated')){
    const account=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
    const adminPage=await browser.newPage({viewport:{width:1440,height:1050}});adminPage.on('pageerror',e=>errors.push(e.message));
    await adminPage.goto('https://pawpalgr3.vercel.app/admin/login');await adminPage.locator('#inputAdminEmail').fill(account.match(/^Email: (.+)$/m)[1].trim());await adminPage.locator('#inputAdminPassword').fill(account.match(/^Password: (.+)$/m)[1].trim());await adminPage.locator('#btnSubmitAdminLogin').click();await adminPage.waitForURL('**/admin#tab-list');
    await adminPage.evaluate(()=>location.hash='tab-service-bookings');await adminPage.waitForFunction(id=>window.PawpalServices?.state.isLoaded&&PawpalServices.state.bookingsData.some(b=>b.dbId===id),args.p_id);
    const confirmed=await adminPage.evaluate(async id=>{const b=PawpalServices.state.bookingsData.find(b=>b.dbId===id);return PawpalServices.subtabs.bookings.updateBookingStatus(b.id,'confirmed');},args.p_id);assert.equal(confirmed,true);
    assert.equal((await ok(service.from('appointment').select('appointment_status').eq('id',args.p_id).single())).appointment_status,'confirmed');
    await page.waitForFunction(()=>document.querySelector('#bookingStatus')?.textContent.includes('Đã xác nhận')||document.querySelector('#bookingStatusBadge')?.textContent.includes('Đã xác nhận')||document.body.textContent.includes('Đã xác nhận'));
    await page.reload();await page.waitForFunction(code=>document.querySelector('#bookingCode')?.textContent===code,saved.appointment_code);assert.ok((await page.locator('body').textContent()).includes('Đã xác nhận'));
    await page.waitForFunction(()=>document.querySelector('.booking-detail-module-container')?.getAttribute('aria-busy')==='false');
    await page.screenshot({path:infra+'/verification/integrated-service-customer.private.png'});await adminPage.close();
   }
   if(svc.category==='pet_hotel')assert.equal(Number(quote.total),650);
   if(svc.category==='pet_taxi')assert.equal(Number(quote.total),500050);
   if(svc.category==='grooming_spa')assert.equal(await page.locator('#bookingLogisticsSection').isVisible(),false);
   if(svc.category==='pet_hotel'){
    await page.locator('#bookingLogisticsSection').waitFor();assert.ok((await page.locator('#bookingLogisticsInfo').textContent()).includes('TEST-'+room));
    await ok(service.from('hotel_booking').update({care_notes:'Live hotel care note'}).eq('appointment_id',args.p_id));
    await page.waitForFunction(()=>document.querySelector('#bookingLogisticsInfo')?.textContent.includes('Live hotel care note'),{timeout:20000});
   }
   if(svc.category==='pet_taxi'){
    await page.locator('#bookingLogisticsSection').waitFor();assert.ok((await page.locator('#bookingLogisticsInfo').textContent()).includes('Verification pickup'));assert.ok((await page.locator('#bookingLogisticsInfo').textContent()).includes('Khứ hồi'));
    await ok(service.from('taxi_trip').update({pickup_address:'Live taxi pickup <b>text</b>'}).eq('appointment_id',args.p_id));
    await page.waitForFunction(()=>document.querySelector('#bookingLogisticsInfo')?.textContent.includes('Live taxi pickup <b>text</b>'),{timeout:20000});assert.equal(await page.locator('#bookingLogisticsInfo b').count(),0);
   }
   const assigned=(await ok(service.from('staff').select('id,full_name').eq('employment_status','active').eq('service_locked',false).limit(1)))[0];assert.ok(assigned);
   for(const id of [assigned.id,args.p_id,cid])assert.match(id,/^[0-9a-f-]{36}$/i);
   // Fixture-only setup through the private database connection: no grants changed for service_role.
   sql(`UPDATE public.appointment SET staff_id='${assigned.id}' WHERE id='${args.p_id}' AND customer_id='${cid}'`);
   await page.waitForFunction(name=>document.querySelector('#staffInfo')?.textContent===name,assigned.full_name,{timeout:20000});
   await ok(service.from('appointment_item').update({staff_id:assigned.id}).eq('appointment_id',args.p_id));
   await page.waitForFunction(name=>document.querySelector('#bookingServiceLines')?.textContent.includes(name),assigned.full_name,{timeout:20000});
   const shown=await page.evaluate(async id=>(await getSupabaseClient().rpc('own_service_booking_logistics',{p_booking:id})).data,args.p_id);
   if(svc.category==='pet_hotel')assert.equal(shown.hotel.status,'reserved');
   if(svc.category==='pet_taxi')assert.equal(shown.taxi.status,'pending');
   assert.equal((await page.locator('#bookingLogisticsInfo').textContent()).includes('Chưa xác định'),false);
   await page.locator('#bookingLogisticsSection').isVisible().then(async visible=>{if(visible)await page.locator('#bookingLogisticsSection').scrollIntoViewIfNeeded();});
   await page.screenshot({path:infra+'/verification/customer-booking-detail-'+svc.category+'.private.png'});
   if(svc.category==='grooming_spa'){
    await page.evaluate(({uid,id})=>sessionStorage.setItem('pawpal_booking_request:'+uid,id),{uid,id:args.p_id});
    await page.goto('https://pawpalgr3.vercel.app/booking');await page.locator('#bookingRecovered').waitFor();await page.locator('#bookingRecovered').click();
    await page.waitForFunction(code=>document.querySelector('#bookingCode')?.textContent===code,saved.appointment_code);
    await page.goto('https://pawpalgr3.vercel.app/pages/services/booking-success/booking-success.html?code='+encodeURIComponent(saved.appointment_code));
    await page.waitForFunction(code=>document.querySelector('#bookingCode')?.textContent===code,saved.appointment_code);
    assert.equal((await ok(service.from('appointment').select('id').eq('customer_id',cid))).length,1);
   }
  }
  assert.equal((await ok(service.from('paw_point_transaction').select('id').eq('customer_id',cid))).length,0);
  assert.deepEqual(errors,[]);assert.deepEqual(legacy,[]);
  console.log('PASS Cloud booking forms for grooming/hotel/round-trip, conditional fields, required addons, server quote, atomic pending create/replay, no money/points or data-file fallback.');
 }catch(error){fs.writeFileSync(infra+'/verification/customer-booking-create-error.private.txt',String(error.message).replaceAll(password,'[REDACTED]').replaceAll(phone,'[PHONE]'));if(page)await page.screenshot({path:infra+'/verification/customer-booking-create-failure.private.png'}).catch(()=>{});throw Error('Customer booking creation verification failed; private evidence saved.');}
 finally{
  if(browser)await browser.close();
  if(cid){const appointments=await ok(service.from('appointment').select('id').eq('customer_id',cid));for(const a of appointments){for(const t of ['hotel_booking','taxi_trip','appointment_item'])await ok(service.from(t).delete().eq('appointment_id',a.id));await ok(service.from('appointment').delete().eq('id',a.id));}}
  for(const svc of services){for(const t of ['service_addon','service_price_matrix','service_supported_species'])await ok(service.from(t).delete().eq('service_id',svc.id));await ok(service.from('service').delete().eq('id',svc.id));}
  if(room)await ok(service.from('hotel_room').delete().eq('id',room));if(roomType)await ok(service.from('hotel_room_type').delete().eq('id',roomType));
  if(pet){await ok(service.from('pet_weight_history').delete().eq('pet_id',pet));await ok(service.from('pet_profile').delete().eq('id',pet));}
  if(cid){for(const t of ['customer_membership','customer_phone','customer_profile'])await ok(service.from(t).delete().eq('customer_id',cid));await ok(service.from('customer').delete().eq('id',cid));}
  if(uid)await ok(service.auth.admin.deleteUser(uid));
 }
})().catch(error=>{console.error(error.message);process.exitCode=1;});
