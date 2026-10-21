// Writes are confined to the disposable restored database and API on port 8011.
const assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {service,admin,ok,browserPage,customer,state,infra,env,token}=require('./customer_completion_helpers.cjs');
const {createClient}=require('@supabase/supabase-js');
const uuid=()=>crypto.randomUUID();
const sql=q=>execFileSync('docker',['exec','supabase-db','psql','-U','supabase_admin','-d',state.stage,'-v','ON_ERROR_STOP=1','-At','-c',q],{encoding:'utf8',windowsHide:true}).trim();
(async()=>{const {browser,page}=await browserPage();const errors=[],js=[];
 page.on('pageerror',e=>js.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
 try{
  const c=await customer('Pickup '+uuid().slice(0,6)),breed=await ok(service.from('pet_breed').select('id,species_id').eq('is_active',true).limit(1).single());
  const pet=uuid();await ok(admin.rpc('save_admin_pet',{p_pet_id:pet,p_expected_updated_at:null,p_details:{customer_id:c.id,breed_id:breed.id,pet_name:'Pickup verification pet',gender:'unknown'},p_weight:4}));
  const actor=await ok(service.from('staff').select('id').eq('email','admin.local@pawpal.test').single()),svc=uuid();
  await ok(admin.rpc('save_admin_service_catalog',{p_id:svc,p_expected_updated_at:null,p_details:{service_code:'PICKUP-'+uuid(),service_name:'Pickup verification service',category_code:'grooming_spa',duration_minutes:30,status:'active',commission_rate:0,species_ids:[breed.species_id],steps:[]},p_prices:[{weight_from:0,weight_to:null,unit_price:50000}]}));
  const prev=await ok(service.from('appointment').select('scheduled_end_at').eq('staff_id',actor.id).not('appointment_status','in','(completed,cancelled,no_show)').order('scheduled_end_at',{ascending:false}).limit(1));
  const appointment=uuid(),start=Math.max(Date.now()+86400000,Date.parse(prev[0]?.scheduled_end_at||'2000-01-01')+3600000);
  await ok(admin.rpc('create_admin_service_booking',{p_id:appointment,p_details:{customer_id:c.id,pet_id:pet,service_id:svc,scheduled_start_at:new Date(start).toISOString()}}));
  const row=()=>ok(service.from('appointment').select('*').eq('id',appointment).single());let a=await row();
  const params=()=>({p_id:uuid(),p_appointment_id:appointment,p_expected_updated_at:a.updated_at,p_content:'Pickup message',p_ready:true});
  assert.equal((await admin.rpc('save_admin_pickup_notification',params())).error.message,'pickup_notification_not_ready');
  await ok(admin.rpc('update_admin_service_booking',{p_id:appointment,p_expected_updated_at:a.updated_at,p_action:'status',p_value:'confirmed'}));a=await row();
  await ok(admin.rpc('save_admin_service_record',{p_id:uuid(),p_appointment_id:appointment,p_expected_updated_at:a.updated_at,p_type:'intake',p_details:{staffId:actor.id,actualWeight:4,skinCoat:'Observed coat',eyesEars:'Observed eyes',wounds:'No wound',temperament:'Calm',belongings:'Lead',customerConfirmed:true}}));a=await row();
  assert.equal((await admin.rpc('save_admin_pickup_notification',{...params(),p_ready:false})).error.message,'pickup_notification_invalid');
  assert.equal((await admin.rpc('save_admin_pickup_notification',{...params(),p_expected_updated_at:'2000-01-01T00:00:00Z'})).error.code,'PT409');
  const denied=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,{auth:{persistSession:false},global:{headers:{Authorization:'Bearer '+token(uuid())},fetch:(url,init)=>fetch(String(url).includes('/rest/v1/')?'http://localhost:8011'+new URL(url).pathname.replace(/^\/rest\/v1/,'')+new URL(url).search:url,init)}});
  assert.equal((await denied.rpc('save_admin_pickup_notification',params())).error.code,'42501');
  const same=params();await Promise.all([ok(admin.rpc('save_admin_pickup_notification',same)),ok(admin.rpc('save_admin_pickup_notification',same))]);
  await ok(admin.rpc('save_admin_pickup_notification',same));assert.equal((await ok(service.from('notification').select('id').eq('id',same.p_id))).length,1);
  assert.equal((await admin.rpc('save_admin_pickup_notification',{...same,p_content:'Different message'})).error.code,'PT409');
  // Audit failure must roll back the notification in the same transaction.
  sql("CREATE FUNCTION public.pickup_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='SAVE_PICKUP_NOTIFICATION' THEN RAISE EXCEPTION 'pickup_audit_test_failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER pickup_test_fail BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.pickup_test_fail();");
  const fail=params();try{assert.ok((await admin.rpc('save_admin_pickup_notification',fail)).error);}finally{sql('DROP TRIGGER pickup_test_fail ON public.audit_log; DROP FUNCTION public.pickup_test_fail();');}
  assert.equal((await ok(service.from('notification').select('id').eq('id',fail.p_id))).length,0);
  const counts=()=>sql("SELECT json_build_array((SELECT count(*) FROM public.care_log),(SELECT count(*) FROM public.payment),(SELECT count(*) FROM public.refund_transaction))::text");const before=counts();
  await page.evaluate(()=>location.hash='tab-service-bookings');await page.waitForFunction(()=>window.PawpalServices?.state.isLoaded);
  await page.evaluate(async id=>{await PawpalServices.loadServicesData({force:true});const b=PawpalServices.state.bookingsData.find(b=>b.dbId===id);PawpalServices.openBookingDetail(b.id);},appointment);
  await page.locator('#btnNotifyCustomerPickup').click();await page.locator('#btnSendNotifyPickup').click();assert.ok(await page.locator('#notifyPickupError').textContent());
  assert.equal(await page.locator('input[name="pickupChannel"]').count(),0);
  await page.locator('#notifyPickupMessageText').fill('UI pickup notification');await page.locator('#notifyPickupReady').check();
  await page.screenshot({path:infra+'/verification/pickup-modal-stage.png',fullPage:true});
  await page.locator('#btnSendNotifyPickup').click();await page.waitForFunction(()=>document.getElementById('modalNotifyPickup').style.display==='none');
  const notice=await ok(service.from('notification').select('*').eq('appointment_id',appointment).eq('content','UI pickup notification').single());
  assert.equal(notice.customer_id,c.id);assert.equal(notice.notification_type,'service_pickup_ready');assert.equal(notice.read_at,null);
  const audit=await ok(service.from('audit_log').select('staff_id,description').eq('entity_id',notice.id).eq('action','SAVE_PICKUP_NOTIFICATION').single());assert.equal(audit.staff_id,actor.id);assert.equal(JSON.parse(audit.description).external_delivery,false);
  assert.equal(counts(),before);assert.equal((await row()).appointment_status,'in_progress');
  for(const action of ['close','cancel','escape','backdrop']){
   await page.locator('#btnNotifyCustomerPickup').click();
   if(action==='close')await page.locator('#btnCloseNotifyPickup').click();
   if(action==='cancel')await page.locator('#btnCancelNotifyPickup').click();
   if(action==='escape')await page.keyboard.press('Escape');
   if(action==='backdrop')await page.locator('#modalNotifyPickup').click({position:{x:5,y:5}});
   await page.waitForFunction(()=>getComputedStyle(document.getElementById('modalNotifyPickup')).display==='none');
  }
  assert.deepEqual(errors,[]);assert.deepEqual(js,[]);
  console.log('PASS pickup notification: real modal validation/save/four close methods, correct customer/appointment and internal-only audit, concurrent idempotency/conflict, stale/early/unchecked rejection, audit rollback; no fabricated care logs, payment or delivery.');
 }catch(error){await page.screenshot({path:infra+'/verification/pickup-stage-failure.png',fullPage:true});console.error({errors,js});throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
