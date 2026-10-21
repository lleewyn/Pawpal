// All writes target a disposable restored V1 database on port 8011.
const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {service,admin,ok,browserPage,customer,env,token}=require('./customer_completion_helpers.cjs');
const {createClient}=require('@supabase/supabase-js');
const uuid=()=>crypto.randomUUID();
(async()=>{
 const {browser,page}=await browserPage();const js=[],rest=[],legacy=[];
 page.on('pageerror',e=>js.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)rest.push(new URL(r.url()).pathname+':'+r.status());});
 page.on('request',r=>{const u=new URL(r.url());if(u.hostname.endsWith('.supabase.co')||u.pathname.startsWith('/data/'))legacy.push(u.hostname+u.pathname);});
 try{
  const cust=await customer('Service verification '+uuid().slice(0,6));
  const breed=await ok(service.from('pet_breed').select('id,species_id').eq('is_active',true).limit(1).single());
  const pet=uuid();await ok(admin.rpc('save_admin_pet',{p_pet_id:pet,p_expected_updated_at:null,p_details:{customer_id:cust.id,breed_id:breed.id,pet_name:'Service verification pet',gender:'unknown'},p_weight:5}));
  const catalogId=uuid(),details={service_code:'VERIFY-'+uuid(),service_name:'Service verification '+uuid().slice(0,6),duration_minutes:60,category_code:'grooming_spa',description:'Verification only',status:'active',commission_rate:0,staff_level_id:null,species_ids:[breed.species_id],steps:['Verification care action']};
  const prices=[{weight_from:0,weight_to:5,unit_price:11000},{weight_from:5,weight_to:10,unit_price:22000},{weight_from:10,weight_to:20,unit_price:33000},{weight_from:20,weight_to:null,unit_price:44000}];
  await ok(admin.rpc('save_admin_service_catalog',{p_id:catalogId,p_expected_updated_at:null,p_details:details,p_prices:prices}));
  let svc=await ok(service.from('service').select('*').eq('id',catalogId).single());
  const bad=await admin.rpc('save_admin_service_catalog',{p_id:catalogId,p_expected_updated_at:svc.updated_at,p_details:{...details,service_name:'Must roll back'},p_prices:[{weight_from:1,weight_to:null,unit_price:5}]});assert.ok(bad.error);assert.equal((await ok(service.from('service').select('service_name').eq('id',catalogId).single())).service_name,details.service_name);
  await page.evaluate(()=>location.hash='tab-service-bookings');await page.waitForFunction(()=>window.PawpalServices?.state.isLoaded);
  await page.evaluate(async()=>{await window.PawpalServices.loadServicesData({force:true});await window.PawpalServices.loadCatalogData({force:true});await window.PawpalServices.loadReviewsData({force:true});});
  const source=await page.evaluate(async()=>{
   const m=PawpalServices,db=getSupabaseClient();const {data:rows,error}=await db.from('appointment').select('id,appointment_status');if(error)throw error;
   const {data:totals}=await db.from('appointment_totals').select('*');
   return {count:m.state.bookingsData.length,sourceCount:rows.length,mismatch:m.state.bookingsData.filter(b=>b.status!==rows.find(a=>a.id===b.dbId)?.appointment_status||Number(b.total)!==Number(totals.find(a=>a.appointment_id===b.dbId)?.total_price)).length,loadError:m.state.loadError};
  });assert.equal(source.count,source.sourceCount);assert.equal(source.mismatch,0);assert.equal(source.loadError,null);
  // Update catalog through the actual form, preserving custom/historical prices unless explicitly replaced.
  await page.evaluate(code=>{PawpalServices.switchSubtab('tab-service-catalog');PawpalServices.subtabs.catalog.openEditServiceModal(code);},details.service_code);
  await page.locator('#formServiceDesc').fill('Catalog saved by browser');await page.locator('#btnSubmitServiceForm').click();
  await page.waitForFunction(id=>PawpalServices.state.servicesData.find(s=>s.dbId===id)?.desc==='Catalog saved by browser',catalogId);
  assert.equal((await ok(service.from('service_price_matrix').select('id').eq('service_id',catalogId))).length,4);
  await page.evaluate(()=>PawpalServices.switchSubtab('tab-service-bookings'));await page.locator('#btnOpenCreateBookingModal').click();
  await page.locator('#newBookingCustomer').fill(cust.phone);await page.locator('#bookingCustomerDropdown .customer-autocomplete-item').first().click();
  assert.equal(await page.locator('#newBookingPhone').inputValue(),cust.phone);assert.equal(await page.locator('#newBookingPetName').inputValue(),'Service verification pet');
  await page.locator('#newBookingServiceInput').fill(details.service_name);await page.locator('#bookingServiceDropdown .customer-autocomplete-item').first().click();
  const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);await page.locator('#newBookingDate').fill(tomorrow);await page.locator('#newBookingTime').fill('10:00');
  await page.locator('#btnSubmitCreateBooking').click();
  await page.waitForFunction(id=>PawpalServices.state.bookingsData.some(b=>b.petDbId===id),pet);
  let booking=await ok(service.from('appointment').select('*').eq('pet_id',pet).single());const item=await ok(service.from('appointment_item').select('*').eq('appointment_id',booking.id).single());
  assert.equal(Number(item.unit_price),22000);assert.equal(Number(item.weight_snapshot),5);assert.equal(item.service_id,catalogId);
  // Confirm from the UI; stale requests and invalid transitions cannot overwrite the result.
  assert.equal(await page.evaluate(id=>PawpalServices.subtabs.bookings.updateBookingStatus(id,'confirmed'),booking.id),true);
  const stale=await admin.rpc('update_admin_service_booking',{p_id:booking.id,p_expected_updated_at:booking.updated_at,p_action:'status',p_value:'cancelled',p_reason:'Stale request'});assert.equal(stale.error.code,'PT409');
  booking=await ok(service.from('appointment').select('*').eq('id',booking.id).single());assert.equal(booking.appointment_status,'confirmed');
  const forbidden=await admin.rpc('update_admin_service_booking',{p_id:booking.id,p_expected_updated_at:booking.updated_at,p_action:'status',p_value:'completed',p_reason:''});assert.ok(forbidden.error);
  const requestId=uuid(),request={customer_id:cust.id,pet_id:pet,service_id:catalogId,scheduled_start_at:new Date(Date.now()+172800000).toISOString(),note:'Idempotency verification'};
  await ok(admin.rpc('create_admin_service_booking',{p_id:requestId,p_details:request}));await ok(admin.rpc('create_admin_service_booking',{p_id:requestId,p_details:request}));assert.equal((await ok(service.from('appointment_item').select('id').eq('appointment_id',requestId))).length,1);
  assert.ok((await admin.rpc('create_admin_service_booking',{p_id:requestId,p_details:{...request,note:'Changed request'}})).error);
  // Assignment locks the staff row and rejects overlapping appointments.
  const actor=await ok(service.from('staff').select('id').eq('email','admin.local@pawpal.test').single());
  let current=await ok(service.from('appointment').select('updated_at').eq('id',requestId).single());
  await ok(admin.rpc('update_admin_service_booking',{p_id:requestId,p_expected_updated_at:current.updated_at,p_action:'assign',p_value:actor.id,p_reason:'Verification assignment'}));
  const overlapping=uuid();const conflict=await admin.rpc('create_admin_service_booking',{p_id:overlapping,p_details:{...request,staff_id:actor.id}});assert.equal(conflict.error.code,'PT409');assert.equal((await ok(service.from('appointment').select('id').eq('id',overlapping))).length,0);
  current=await ok(service.from('appointment').select('updated_at').eq('id',requestId).single());
  await ok(admin.rpc('update_admin_service_booking',{p_id:requestId,p_expected_updated_at:current.updated_at,p_action:'status',p_value:'cancelled',p_reason:'Verification cancellation'}));
  assert.equal((await ok(service.from('appointment').select('appointment_status').eq('id',requestId).single())).appointment_status,'cancelled');
  svc=await ok(service.from('service').select('*').eq('id',catalogId).single());
  await ok(admin.rpc('save_admin_service_catalog',{p_id:catalogId,p_expected_updated_at:svc.updated_at,p_details:details,p_prices:prices.map(p=>({...p,unit_price:p.unit_price+1000}))}));
  const history=await ok(service.from('service_price_matrix').select('*').eq('service_id',catalogId));assert.equal(history.length,8);assert.equal(history.filter(p=>p.effective_to===null).length,4);assert.equal(Number((await ok(service.from('appointment_item').select('unit_price').eq('id',item.id).single())).unit_price),22000);
  // Server rejects unsupported species and leaves no appointment or partial item behind.
  await ok(service.from('service_supported_species').delete().eq('service_id',catalogId));const missingId=uuid();assert.ok((await admin.rpc('create_admin_service_booking',{p_id:missingId,p_details:request})).error);assert.equal((await ok(service.from('appointment').select('id').eq('id',missingId))).length,0);
  // A taxi booking is an appointment, item and trip committed together.
  const taxiId=uuid();await ok(admin.rpc('save_admin_service_catalog',{p_id:taxiId,p_expected_updated_at:null,p_details:{...details,service_code:'VERIFY-TAXI-'+uuid(),service_name:'Verification taxi',category_code:'pet_taxi'},p_prices:null}));
  await ok(service.from('taxi_price_rule').update({status:'inactive'}).eq('status','active'));
  await ok(service.from('taxi_price_rule').insert({distance_from:0,distance_to:null,weight_from:0,weight_to:null,base_price:40000,surcharge:5000,effective_from:'2020-01-01',status:'active'}));
  const taxiBookingId=uuid(),taxiRequest={...request,service_id:taxiId,pickup_address:'Verification pickup',dropoff_address:'Verification dropoff',trip_type:'one_way',distance_km:10};
  await ok(admin.rpc('create_admin_service_booking',{p_id:taxiBookingId,p_details:taxiRequest}));await ok(admin.rpc('create_admin_service_booking',{p_id:taxiBookingId,p_details:taxiRequest}));
  const trip=await ok(service.from('taxi_trip').select('*').eq('appointment_id',taxiBookingId).single());assert.equal(Number(trip.quoted_amount),45000);assert.equal(trip.trip_type,'one_way');
  assert.ok((await admin.rpc('create_admin_service_booking',{p_id:uuid(),p_details:{...taxiRequest,trip_type:'round_trip'}})).error);
  // Service review response is a separate V1 entity with optimistic concurrency.
  // Service-role fixture setup models a completed service; the UI cannot skip intake/handover.
  await ok(service.from('appointment').update({appointment_status:'completed'}).eq('id',booking.id));
  await ok(service.from('appointment_item').update({status:'completed'}).eq('id',item.id));
  const reviewId=uuid();await ok(service.from('review').insert({id:reviewId,rating:5,review_content:'Verification review',review_status:'published',appointment_item_id:item.id}));
  await page.evaluate(async()=>{await PawpalServices.loadReviewsData({force:true});PawpalServices.switchSubtab('tab-service-reviews');});
  await page.evaluate(id=>PawpalServices.subtabs.reviews.openReplyReviewModal(id),reviewId);await page.locator('#replyReviewText').fill('Response saved by browser');await page.locator('#btnSubmitReplyReview').click();
  await page.waitForFunction(id=>PawpalServices.state.reviewsData.find(r=>r.id===id)?.replyText==='Response saved by browser',reviewId);
  const reply=await ok(service.from('review_response').select('*').eq('review_id',reviewId).single());assert.ok(reply.staff_id);
  const staleReply=await admin.rpc('reply_admin_service_review',{p_review_id:reviewId,p_response_id:null,p_expected_updated_at:null,p_text:'Must not overwrite'});assert.equal(staleReply.error.code,'PT409');
  const denied=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,{auth:{persistSession:false},global:{headers:{Authorization:'Bearer '+token(uuid())},fetch:(url,init)=>fetch(String(url).includes('/rest/v1/')?'http://localhost:8011'+new URL(url).pathname.replace(/^\/rest\/v1/,'')+new URL(url).search:url,init)}});
  assert.equal((await denied.rpc('reply_admin_service_review',{p_review_id:reviewId,p_response_id:reply.id,p_expected_updated_at:reply.updated_at,p_text:'Unauthorized'})).error.code,'42501');
  for(const tab of ['tab-service-bookings','tab-service-detail','tab-service-catalog','tab-service-reviews'])await page.evaluate(t=>PawpalServices.switchSubtab(t),tab);
  assert.deepEqual(js,[]);assert.deepEqual(rest,[]);assert.deepEqual(legacy,[]);
  console.log('PASS Services V1 stage: source-matched status/totals, live directories, catalog UI and atomic rollback, price history without changing booked prices, booking UI and exact 5kg tariff, confirmation/cancellation/assignment, overlapping staff rejection, stale/invalid transitions, idempotent creation, unsupported species rollback, atomic taxi trip/price, review UI/conflict/authorization, four tabs, no legacy Cloud/JSON or browser/REST errors.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
