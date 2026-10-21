const assert=require('node:assert/strict'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {service,admin,ok,browserPage,customer,state,infra,env,token}=require('./customer_completion_helpers.cjs');
const {createClient}=require('@supabase/supabase-js'),uuid=()=>crypto.randomUUID();
const sql=q=>execFileSync('docker',['exec','supabase-db','psql','-U','supabase_admin','-d',state.stage,'-v','ON_ERROR_STOP=1','-At','-c',q],{encoding:'utf8',windowsHide:true}).trim();
(async()=>{const {browser,page}=await browserPage();const errors=[],js=[];page.on('pageerror',e=>js.push(e.message));page.on('response',r=>{if(r.url().includes('/rest/v1/')&&r.status()>=400)errors.push(new URL(r.url()).pathname+':'+r.status());});
 try{
  const c=await customer('Cashier '+uuid().slice(0,6)),breed=await ok(service.from('pet_breed').select('id,species_id').eq('is_active',true).limit(1).single()),pet=uuid(),svc=uuid(),appointment=uuid();
  await ok(admin.rpc('save_admin_pet',{p_pet_id:pet,p_expected_updated_at:null,p_details:{customer_id:c.id,breed_id:breed.id,pet_name:'Cashier pet',gender:'unknown'},p_weight:4}));
  await ok(admin.rpc('save_admin_service_catalog',{p_id:svc,p_expected_updated_at:null,p_details:{service_code:'CASH-'+uuid(),service_name:'Cashier verification',category_code:'grooming_spa',duration_minutes:30,status:'active',commission_rate:0,species_ids:[breed.species_id],steps:[]},p_prices:[{weight_from:0,weight_to:null,unit_price:10000}]}));
  await ok(admin.rpc('create_admin_service_booking',{p_id:appointment,p_details:{customer_id:c.id,pet_id:pet,service_id:svc,scheduled_start_at:new Date(Date.now()+86400000).toISOString()}}));
  const context=()=>ok(admin.rpc('get_admin_service_cashier',{p_appointment_id:appointment}));let ctx=await context();const cash=ctx.methods.find(m=>m.name==='Tiền mặt').id;
  const unchanged=()=>sql("SELECT json_build_array((SELECT count(*) FROM public.paw_point_transaction),(SELECT count(*) FROM public.inventory_transaction),(SELECT sum(points) FROM public.paw_point_transaction),(SELECT sum(quantity) FROM public.inventory_transaction))::text");const before=unchanged();
  await page.evaluate(()=>location.hash='tab-service-bookings');await page.waitForFunction(()=>window.PawpalServices?.state.isLoaded);
  await page.evaluate(async id=>{await PawpalServices.loadServicesData({force:true});PawpalServices.openBookingDetail(PawpalServices.state.bookingsData.find(b=>b.dbId===id).id);},appointment);
  await page.locator('#btnSettleToPos').click();await page.waitForFunction(()=>!document.getElementById('btnSaveServiceMoney').disabled);
  await page.locator('#btnSaveServiceMoney').click();assert.ok(await page.locator('#cashierError').textContent());
  await page.locator('#cashierAmount').fill('4000');await page.locator('#cashierReason').fill('Partial collection');await page.locator('#cashierConfirmed').check();await page.locator('#btnSaveServiceMoney').click();
  await page.waitForFunction(()=>document.getElementById('cashierCollected').textContent.includes('4.000'));ctx=await context();assert.equal(Number(ctx.remaining),6000);assert.equal(Number(ctx.payments[0].eligible_spend_amount),0);
  const params=(action,details,stateVersion=ctx.version)=>({p_request_id:uuid(),p_appointment_id:appointment,p_expected_state:stateVersion,p_action:action,p_details:{method_id:cash,reason:'Verified cash transaction',confirmed:true,...details}});
  const full=params('collect',{amount:6000});await ok(admin.rpc('post_admin_service_money',full));await ok(admin.rpc('post_admin_service_money',full));assert.equal((await context()).payments.length,2);
  assert.equal((await admin.rpc('post_admin_service_money',{...full,p_details:{...full.p_details,amount:5000}})).error.code,'PT409');
  ctx=await context();const source=ctx.payments.find(p=>p.id===full.p_request_id);
  assert.equal((await admin.rpc('post_admin_service_money',params('refund',{amount:6001,payment_id:source.id}))).error.message,'service_money_exceeds_balance');
  // Refresh the real form before refunding against the chosen original receipt.
  await page.locator('#modalServiceCashier [data-close-modal]').first().click();await page.locator('#btnSettleToPos').click();await page.waitForFunction(()=>!document.getElementById('btnSaveServiceMoney').disabled);
  await page.locator('#cashierAction').selectOption('refund');await page.evaluate(id=>{const e=document.getElementById('cashierPayment');e.value=id;e.dispatchEvent(new Event('change',{bubbles:true}));},source.id);
  await page.locator('#cashierAmount').fill('2000');await page.locator('#cashierReason').fill('Customer requested partial refund');await page.locator('#cashierConfirmed').check();await page.screenshot({path:infra+'/verification/service-cashier-stage.png',fullPage:true});await page.locator('#btnSaveServiceMoney').click();
  await page.waitForFunction(()=>document.getElementById('cashierCollected').textContent.includes('8.000'));ctx=await context();assert.equal(Number(ctx.remaining),2000);
  const bank=ctx.methods.find(m=>m.requires_reference).id,reference='VERIFY-'+uuid();
  assert.equal((await admin.rpc('post_admin_service_money',params('collect',{amount:2000,method_id:bank,reference:''}))).error.message,'service_money_reference_required');
  const receipt=params('collect',{amount:2000,method_id:bank,reference});await ok(admin.rpc('post_admin_service_money',receipt));await ok(admin.rpc('post_admin_service_money',receipt));ctx=await context();assert.equal(Number(ctx.collected),10000);
  assert.equal((await admin.rpc('post_admin_service_money',params('collect',{amount:1,method_id:bank,reference}))).error.message,'service_money_reference_duplicate');
  // A fresh refund unlocks a balance. Competing cashiers share one document lock/version.
  await ok(admin.rpc('post_admin_service_money',params('refund',{amount:1000,payment_id:source.id})));ctx=await context();
  const race=await Promise.all([admin.rpc('post_admin_service_money',params('collect',{amount:1000})),admin.rpc('post_admin_service_money',params('collect',{amount:1000}))]);assert.equal(race.filter(r=>!r.error).length,1);assert.equal(race.find(r=>r.error).error.code,'PT409');
  ctx=await context();sql("CREATE FUNCTION public.cashier_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.action='SERVICE_REFUND' THEN RAISE EXCEPTION 'cashier_audit_failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER cashier_test_fail BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION public.cashier_test_fail();");
  const failed=params('refund',{amount:500,payment_id:source.id});try{assert.ok((await admin.rpc('post_admin_service_money',failed)).error);}finally{sql('DROP TRIGGER cashier_test_fail ON public.audit_log; DROP FUNCTION public.cashier_test_fail();');}
  assert.equal((await ok(service.from('refund_transaction').select('id').eq('id',failed.p_request_id))).length,0);assert.equal((await context()).version,ctx.version);
  const denied=createClient(env.SUPABASE_PUBLIC_URL,env.ANON_KEY,{auth:{persistSession:false},global:{headers:{Authorization:'Bearer '+token(uuid())},fetch:(url,init)=>fetch(String(url).includes('/rest/v1/')?'http://localhost:8011'+new URL(url).pathname.replace(/^\/rest\/v1/,'')+new URL(url).search:url,init)}});assert.equal((await denied.rpc('post_admin_service_money',params('collect',{amount:1}))).error.code,'42501');
  assert.equal((await admin.from('payment').insert({})).error.code,'42501');assert.equal(unchanged(),before);assert.equal((await ok(service.from('appointment').select('appointment_status').eq('id',appointment).single())).appointment_status,'pending');
  let a=await ok(service.from('appointment').select('updated_at').eq('id',appointment).single());
  assert.equal((await admin.rpc('update_admin_service_booking',{p_id:appointment,p_expected_updated_at:a.updated_at,p_action:'status',p_value:'cancelled',p_reason:'Cancellation after refund'})).error.message,'paid_booking_requires_refund_workflow');
  ctx=await context();for(const payment of ctx.payments){const remaining=Number(payment.amount)-(payment.refunds||[]).filter(r=>r.refund_status==='succeeded').reduce((sum,r)=>sum+Number(r.refunded_amount),0);if(remaining>0){ctx=await context();await ok(admin.rpc('post_admin_service_money',params('refund',{amount:remaining,payment_id:payment.id})));}}
  assert.equal(Number((await context()).collected),0);a=await ok(service.from('appointment').select('updated_at').eq('id',appointment).single());
  await ok(admin.rpc('update_admin_service_booking',{p_id:appointment,p_expected_updated_at:a.updated_at,p_action:'status',p_value:'cancelled',p_reason:'All payments refunded'}));
  assert.deepEqual(errors,[]);assert.deepEqual(js,[]);console.log('PASS service cashier: actual UI partial collection/refund, full collection, source receipts/net balance, bank-reference evidence/duplicate rejection, idempotency/conflict/concurrent balance guard, audit rollback, denied direct/unauthorized ledger writes; no points, stock, tier spend or automatic completion.');
 }catch(error){await page.screenshot({path:infra+'/verification/service-cashier-failure.png',fullPage:true});console.error({errors,js});throw error;}finally{await browser.close();}
})().catch(error=>{console.error(error.stack);process.exitCode=1;});
