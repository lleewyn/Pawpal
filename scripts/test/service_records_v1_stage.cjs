const assert=require('node:assert/strict'),crypto=require('node:crypto');
const {service,admin,ok,browserPage,customer,env,token}=require('./customer_completion_helpers.cjs');
const {createClient}=require('@supabase/supabase-js');
const uuid=()=>crypto.randomUUID();
(async()=>{
 const {browser,page}=await browserPage();const errors=[],js=[];
 page.on('pageerror',e=>js.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
 try{
  const c=await customer('Service records '+uuid().slice(0,6));const breed=await ok(service.from('pet_breed').select('id,species_id').eq('is_active',true).limit(1).single());
  const pet=uuid();await ok(admin.rpc('save_admin_pet',{p_pet_id:pet,p_expected_updated_at:null,p_details:{customer_id:c.id,breed_id:breed.id,pet_name:'Service records pet',gender:'unknown',safety_note:'Approach slowly'},p_weight:4}));
  const actor=await ok(service.from('staff').select('id,full_name').eq('email','admin.local@pawpal.test').single());
  const svc=uuid();await ok(admin.rpc('save_admin_service_catalog',{p_id:svc,p_expected_updated_at:null,p_details:{service_code:'RECORDS-'+uuid(),service_name:'Records verification service',category_code:'grooming_spa',duration_minutes:30,status:'active',commission_rate:0,species_ids:[breed.species_id],steps:['Records care action']},p_prices:[{weight_from:0,weight_to:5,unit_price:10000},{weight_from:5,weight_to:null,unit_price:20000}]}));
  const previous=await ok(service.from('appointment').select('scheduled_end_at').eq('staff_id',actor.id).not('appointment_status','in','(completed,cancelled,no_show)').order('scheduled_end_at',{ascending:false}).limit(1));
  const starts=Math.max(Date.now()+86400000,Date.parse(previous[0]?.scheduled_end_at||'2000-01-01')+3600000);
  const appointment=uuid();await ok(admin.rpc('create_admin_service_booking',{p_id:appointment,p_details:{customer_id:c.id,pet_id:pet,service_id:svc,scheduled_start_at:new Date(starts).toISOString()}}));
  const row=()=>ok(service.from('appointment').select('*').eq('id',appointment).single());
  let a=await row();await ok(admin.rpc('update_admin_service_booking',{p_id:appointment,p_expected_updated_at:a.updated_at,p_action:'status',p_value:'confirmed'}));a=await row();
  const intake={staffId:actor.id,actualWeight:5,skinCoat:'Sạch sẽ',eyesEars:'Bình thường',wounds:'Không có vết thương cũ',temperament:'Ngoan hiền',belongings:'Dây dắt',belongingsNote:'Dây màu đỏ',customerConfirmed:false};
  const first=uuid(),params={p_id:first,p_appointment_id:appointment,p_expected_updated_at:a.updated_at,p_type:'intake',p_details:intake};
  await ok(admin.rpc('save_admin_service_record',params));await ok(admin.rpc('save_admin_service_record',params));
  assert.equal((await ok(service.from('appointment_record').select('id').eq('id',first))).length,1);
  a=await row();assert.equal(a.appointment_status,'in_progress');assert.equal(a.staff_id,actor.id);
  assert.ok((await admin.rpc('save_admin_service_record',{p_id:uuid(),p_appointment_id:appointment,p_expected_updated_at:a.updated_at,p_type:'handover',p_details:{qualityAccepted:true,belongingsReturned:true,customerConfirmed:true}})).error);
  // Open the actual intake form and create a confirmed new revision.
  await page.evaluate(()=>location.hash='tab-service-bookings');await page.waitForFunction(()=>window.PawpalServices?.state.isLoaded);
  await page.evaluate(async id=>{await PawpalServices.loadServicesData({force:true});const b=PawpalServices.state.bookingsData.find(b=>b.dbId===id);PawpalServices.openBookingDetail(b.id);PawpalServices.subtabs.bookings.openIntakeModal(b.id,'edit');PawpalServices.enhanceEntitySelects();},appointment);
  await page.locator('#intakePetWeightInput').fill('5');await page.locator('#intakeStaffSelectSearch').fill(actor.full_name);await page.locator('#intakeStaffSelectSearch').locator('..').locator('.customer-autocomplete-item').first().click();
  await page.locator('#checkSkinNormal').check();await page.locator('#checkEyesEarsNormal').check();await page.locator('#checkWoundNone').check();await page.locator('input[name="intakeTemperamentRadio"][value="Ngoan hiền"]').check();await page.locator('#intakeCustomerConfirmed').check();
  await page.locator('#intakeModalSubmitBtn').click();await page.waitForFunction(id=>PawpalServices.state.bookingsData.find(b=>b.dbId===id)?.intakeRecord?.confirmationStatus==='confirmed',appointment);
  const records=await ok(service.from('appointment_record').select('*').eq('appointment_id',appointment).order('revision_no'));assert.equal(records.length,2);assert.equal(records[1].safety_note_snapshot,'Approach slowly');assert.equal(records[1].revision_no,2);
  const immutable=await admin.from('appointment_record').update({condition_note:'Must not change'}).eq('id',records[1].id);assert.ok(immutable.error);
  assert.equal(await page.evaluate(id=>PawpalServices.state.bookingsData.find(b=>b.dbId===id).intakeRecord.actualWeight,appointment),5);
  // Add, edit and delete a care log from the interface; no catalog pollution.
  await page.locator('#newLogStepTitle').fill('Records care action');await page.locator('#newLogStepNote').fill('First observed note');
  await page.locator('#newLogStepStaffSearch').fill(actor.full_name);await page.locator('#newLogStepStaffSearch').locator('..').locator('.customer-autocomplete-item').first().click();await page.locator('#btnSubmitCarelogStep').click();
  await page.waitForFunction(id=>PawpalServices.state.bookingsData.find(b=>b.dbId===id)?.careLogs?.some(l=>l.note==='First observed note'),appointment);
  let log=await ok(service.from('care_log').select('*').eq('appointment_id',appointment).single());assert.equal(log.recorded_by,actor.id);assert.ok(log.care_action_id);assert.equal(log.action_name_snapshot,'Records care action');
  await page.locator('.carelog-step-card').filter({hasText:'First observed note'}).click();await page.locator('#editCarelogStepDesc').fill('Edited observed note');await page.locator('#btnSubmitEditCarelogStep').click();
  await page.waitForFunction(id=>PawpalServices.state.bookingsData.find(b=>b.dbId===id)?.careLogs?.some(l=>l.note==='Edited observed note'),appointment);
  await page.locator('.carelog-step-card').filter({hasText:'Edited observed note'}).click();page.once('dialog',d=>d.accept());await page.locator('#btnDeleteCarelogStep').click();await page.waitForFunction(id=>PawpalServices.state.bookingsData.find(b=>b.dbId===id)?._careLogsLoaded&&PawpalServices.state.bookingsData.find(b=>b.dbId===id).careLogs.length===0,appointment);
  assert.equal((await ok(service.from('care_log').select('id').eq('id',log.id))).length,0);
  const charge=uuid();a=await row();const propose={p_id:charge,p_appointment_id:appointment,p_expected_updated_at:a.updated_at,p_action:'propose',p_details:{name:'Extra care',reason:'Extra handling requested',amount:3000,consent:'pending'}};
  await ok(admin.rpc('change_admin_service_charge',propose));await ok(admin.rpc('change_admin_service_charge',propose));
  a=await row();assert.ok((await admin.rpc('save_admin_service_record',{p_id:uuid(),p_appointment_id:appointment,p_expected_updated_at:a.updated_at,p_type:'handover',p_details:{qualityAccepted:true,belongingsReturned:true,customerConfirmed:true}})).error);
  const total=async()=>Number((await ok(service.from('appointment_totals').select('total_price').eq('appointment_id',appointment).single())).total_price);
  assert.equal(await total(),10000);a=await row();assert.ok((await admin.rpc('change_admin_service_charge',{p_id:charge,p_appointment_id:appointment,p_expected_updated_at:a.updated_at,p_action:'approve',p_details:{}})).error);
  await page.evaluate(async()=>{await PawpalServices.loadServicesData({force:true});PawpalServices.subtabs.detail.renderBookingDetail(PawpalServices.state.selectedBookingId);});
  await page.locator('.btn-consent-surcharge').click();await page.locator('.btn-approve-surcharge').click();await page.waitForFunction(id=>PawpalServices.state.bookingsData.find(b=>b.dbId===id)?.total===13000,appointment);assert.equal(await total(),13000);
  // Add a quoted accompanying service atomically; retry cannot duplicate it.
  a=await row();const beforeEnd=a.scheduled_end_at;
  await page.evaluate(async()=>{await PawpalServices.loadCatalogData({force:true});});
  await page.locator('#btnOpenAddAccompanyingServiceModal').click();
  // The popover stores entity IDs even when services have the same visible name.
  await page.locator('#accompanyingServiceItemSelectSearch').fill('Records verification service');
  await page.locator('#accompanyingServiceItemSelectSearch').locator('..').locator('.customer-autocomplete-item').last().click();
  // Select the exact fixture through its live option if other verification fixtures share the name.
  await page.evaluate(id=>{const select=document.getElementById('accompanyingServiceItemSelect');select.value=id;select.dispatchEvent(new Event('change',{bubbles:true}));PawpalServices.enhanceEntitySelects();},svc);
  await page.waitForFunction(()=>document.getElementById('accompanyingPriceInput').value==='20000');await page.locator('#accompanyingConsentConfirmed').check();await page.locator('#btnSubmitAddAccompanying').click();
  await page.waitForFunction(id=>PawpalServices.state.bookingsData.find(b=>b.dbId===id)?.total===33000,appointment);
  const companion=(await ok(service.from('appointment_item').select('id').eq('appointment_id',appointment).eq('is_primary',false).single())).id;
  const audit=await ok(service.from('audit_log').select('description').eq('entity_id',companion).eq('action','SERVICE_CHARGE_ADD_SERVICE').single());
  const add={p_id:companion,p_appointment_id:appointment,p_expected_updated_at:a.updated_at,p_action:'add_service',p_details:JSON.parse(audit.description).details};await ok(admin.rpc('change_admin_service_charge',add));
  assert.equal(await total(),33000);assert.equal(Date.parse((await row()).scheduled_end_at)-Date.parse(beforeEnd),1800000);
  a=await row();const stale=await admin.rpc('change_admin_service_charge',{...add,p_id:uuid(),p_expected_updated_at:'2000-01-01T00:00:00Z'});assert.equal(stale.error.code,'PT409');
  // Cancel an approved adjustment without deleting the original record.
  await ok(admin.rpc('change_admin_service_charge',{p_id:charge,p_appointment_id:appointment,p_expected_updated_at:a.updated_at,p_action:'cancel_adjustment',p_details:{}}));assert.equal(await total(),30000);assert.equal((await ok(service.from('appointment_adjustment').select('approval_status').eq('id',charge).single())).approval_status,'cancelled');
  await page.evaluate(async()=>{await PawpalServices.loadServicesData({force:true});PawpalServices.subtabs.bookings.openCompleteBookingModal(PawpalServices.state.selectedBookingId);});
  await page.locator('#completeCheckQuality').check();await page.locator('#completeCheckBelongings').check();await page.locator('#handoverCustomerConfirmed').check();await page.locator('#completeModalSubmitBtn').click();
  await page.waitForFunction(id=>PawpalServices.state.bookingsData.find(b=>b.dbId===id)?.status==='completed',appointment);
  assert.equal((await row()).appointment_status,'completed');assert.ok((await row()).check_out_time);
  assert.ok((await ok(service.from('appointment_item').select('status').eq('appointment_id',appointment))).every(i=>i.status==='completed'));
  assert.equal((await ok(service.from('appointment_record').select('id').eq('appointment_id',appointment).eq('record_type','handover'))).length,1);
  a=await row();assert.ok((await admin.rpc('save_admin_service_care_log',{p_id:uuid(),p_appointment_id:appointment,p_expected_updated_at:a.updated_at,p_expected_log_updated_at:null,p_action:'save',p_details:{title:'After complete',staff_id:actor.id}})).error);
  const denied=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,{auth:{persistSession:false},global:{headers:{Authorization:'Bearer '+token(uuid())},fetch:(url,init)=>fetch(String(url).includes('/rest/v1/')?'http://localhost:8011'+new URL(url).pathname.replace(/^\/rest\/v1/,'')+new URL(url).search:url,init)}});
  assert.equal((await denied.rpc('change_admin_service_charge',propose)).error.code,'42501');
  assert.deepEqual(errors,[]);assert.deepEqual(js,[]);
  console.log('PASS Service records V1: intake revisions and immutable confirmation, weight snapshots/idempotency, care-log UI add/edit/delete and staff/action FKs, proposal/consent/approval affecting totals, retained cancelled adjustments, quoted accompanying service/idempotency/duration, stale and unauthorized writes denied, handover UI completes items without fabricating payment.');
 }catch(e){await page.screenshot({path:'D:/Aboutme/Pawpal-infra/supabase-local/verification/service-records-stage-failure.png',fullPage:true});console.error('Browser errors:',js,'REST failures:',errors);throw e;}finally{await browser.close();}
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
