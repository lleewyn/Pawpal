// Actual form handlers; optional Supabase RPC checks entirely inside ROLLBACK.
const fs=require('node:fs'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const {chromium}=require('D:/Aboutme/Pawpal-infra/browser-check/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});let samples;
 try{
  const p=await browser.newPage();await p.route('**/*',r=>r.abort());await p.setContent(fs.readFileSync('pages/admin/modules/settings/settings.html','utf8'),{waitUntil:'domcontentloaded'});
  await p.evaluate(()=>{
   window.impacts=[];window.writes=[];window.shippingWrites=[];window.notices=[];
   window.PawpalSettings={state:{isLoaded:true,isSafeModeLocked:false,systemConfig:{storeInfo:{},paymentMethods:{},shippingPolicy:{},operatingHours:{},hotelRules:{},bookingPolicy:{}},deliveryOptions:[{id:'11111111-1111-4111-8111-111111111111',name:'QA delivery',fee:25000,available:true}]},subtabs:{},
    showToast:(message,type)=>notices.push({message,type}),getSupabaseClient:()=>({}),openModal(){},closeModal(){},updateSafeModeUI(){},
    openImpactConfirmationModal:opts=>impacts.push(opts),persistSystemConfig:async cfg=>writes.push(structuredClone(cfg)),saveShipping:async(options,cfg)=>shippingWrites.push({options:structuredClone(options),cfg:structuredClone(cfg)}),loadSettingsModuleData:async()=>{}};
  });
  await p.addScriptTag({content:fs.readFileSync('pages/admin/modules/settings/subtabs/tab-settings-system.js','utf8')});
  const values=async data=>p.evaluate(data=>{for(const [id,value] of Object.entries(data))document.getElementById(id).value=value;},data);
  let checks=0;
  const submit=async(id,allowed)=>{await p.evaluate(()=>{impacts.length=0;notices.length=0;});await p.evaluate(id=>document.getElementById(id).click(),id);assert.equal(await p.evaluate(()=>impacts.length),allowed?1:0,id);if(!allowed)assert.ok(await p.evaluate(()=>notices.length)>0);else await p.evaluate(()=>impacts[0].onConfirm());checks++;};
  const store={inputStoreBrandName:'QA brand',inputStoreHotline:'19001234',inputStoreEmail:'qa@example.com',inputStoreAddress:'QA address'};
  for(const id of ['inputStoreBrandName','inputStoreHotline','inputStoreAddress']){await values({...store,[id]:'  '});await submit('btnSaveStoreProfile',false);}
  for(const email of ['qa@@example;abc','abc','qa.example.com']){await values({...store,inputStoreEmail:email});await submit('btnSaveStoreProfile',false);}
  await values({...store,inputStoreHotline:'1900ABCxyz'});await submit('btnSaveStoreProfile',false);
  await values(store);await submit('btnSaveStoreProfile',true);
  await p.evaluate(()=>{document.getElementById('toggleBankEnabled').checked=true;const s=document.getElementById('inputPaymentBank');s.value=[...s.options].find(o=>o.value)?.value||'';});
  const bank={inputPaymentAccNo:'123456789',inputPaymentAccHolder:'QA HOLDER',inputPaymentSyntax:'PAW ORDER'};
  for(const account of ['', '12AB34XYZ',' - ']){await values({...bank,inputPaymentAccNo:account});await submit('btnSavePaymentConfig',false);}
  await values({...bank,inputPaymentSyntax:'  '});await submit('btnSavePaymentConfig',false);
  await values({...bank,inputPaymentAccNo:'123 456-789'});await submit('btnSavePaymentConfig',true);
  await p.evaluate(()=>document.getElementById('btnConfigureShipping').click());assert.equal(await p.locator('#inputShippingApiKey').isDisabled(),true);
  for(const fee of ['-1','-25000','-35000','-45000','']){await p.locator('.shipping-option-fee').fill(fee);await submit('btnSaveShippingConfig',false);}
  await p.locator('.shipping-option-fee').fill('25000.75');await submit('btnSaveShippingConfig',true);assert.equal(await p.evaluate(()=>shippingWrites.at(-1).options[0].fee),25000.75);
  const booking={inputWeekdayOpen:'08:00',inputWeekdayClose:'20:00',inputWeekendOpen:'08:00',inputWeekendClose:'20:00',inputHotelCheckIn:'14:00',inputHotelCheckOut:'12:00',inputHotelLateFee:'25000.75',inputSlotCapacity:'5',inputFreeCancelHours:'24',inputLateCancelFee:'50000.75'};
  for(const change of [{inputWeekdayOpen:'20:00',inputWeekdayClose:'08:00'},{inputWeekdayOpen:'08:00',inputWeekdayClose:'08:00'},{inputHotelCheckIn:'12:00',inputHotelCheckOut:'12:00'},...['0','-1','2.5'].map(inputSlotCapacity=>({inputSlotCapacity})),{inputHotelLateFee:'-100000'},{inputLateCancelFee:'-50000'}]){await values({...booking,...change});await submit('btnSaveBookingPolicy',false);}
  await values(booking);await submit('btnSaveBookingPolicy',true);
  samples=await p.evaluate(()=>({store:writes[0].storeInfo,payment:writes[1].paymentMethods,booking:writes[2],shipping:shippingWrites[0]}));
  assert.equal(samples.booking.hotelRules.lateCheckOutFeePerHalfDay,25000.75);assert.equal(samples.booking.bookingPolicy.lateCancelFee,50000.75);assert.equal(samples.payment.bank.accountNumber,'123456789');
  console.log('PASS '+checks+' real form validation cases; invalid data blocked, decimal fees preserved; partner token control remains disabled. Isolated transport.');
 }finally{await browser.close();}
 if(!process.argv.includes('--cloud'))return;
 const {connect}=require('../database/v1/service_import_connection.cjs');const db=await connect();let checks=0;
 try{
  await db.query("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
  await db.query(fs.readFileSync('scripts/database/v1/123_settings_validation.sql','utf8').replace(/^BEGIN;/,'').replace(/COMMIT;\s*$/,''));
  const user=randomUUID(),staff=randomUUID();await db.query('INSERT INTO auth.users(id) VALUES($1)',[user]);
  await db.query("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,employment_status,must_change_password) VALUES($1,$2,'QA settings rollback','QA','active',false)",[staff,user]);await db.query("INSERT INTO public.staff_role(staff_id,role_code) VALUES($1,'ADMIN')",[staff]);
  await db.query("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role','authenticated',true)",[user]);await db.query('SET LOCAL ROLE authenticated');
  const record=(await db.query("SELECT to_jsonb(s) value FROM public.pawpal_setting s WHERE setting_key='system_config'")).rows[0]?.value;
  const base=record?JSON.parse(record.setting_value):{},id=record?.id||randomUUID();
  // Match the actual settings loader/persist path: legacy shipping API keys are not sent back.
  if(base.shippingPolicy)delete base.shippingPolicy.apiKey;
  const test=async(patch,allowed)=>{
   await db.query('SAVEPOINT validation_case');let error,result;
   try{result=(await db.query("SELECT public.save_admin_setting_record($1,'pawpal_setting',$2,$3::jsonb,$4::jsonb,false) value",[randomUUID(),id,record?JSON.stringify(record):null,JSON.stringify({setting_key:'system_config',setting_type:'json',setting_value:JSON.stringify({...base,...patch})})])).rows[0].value;}catch(e){error=e;}
   await db.query('ROLLBACK TO SAVEPOINT validation_case');await db.query('RELEASE SAVEPOINT validation_case');
   if(allowed){assert.equal(error,undefined,error?.message);assert.ok(result);}else{assert.equal(error?.code,'22023',error?.message||'invalid config accepted');}checks++;
  };
  for(const key of ['brandName','hotline','address'])await test({storeInfo:{...samples.store,[key]:''}},false);
  for(const email of ['qa@@example;abc','abc','qa.example.com'])await test({storeInfo:{...samples.store,email}},false);
  await test({storeInfo:{...samples.store,hotline:'1900ABCxyz'}},false);await test({storeInfo:samples.store},true);
  for(const accountNumber of ['', '12AB34XYZ',' - '])await test({paymentMethods:{...samples.payment,bank:{...samples.payment.bank,accountNumber}}},false);
  await test({paymentMethods:{...samples.payment,bank:{...samples.payment.bank,syntax:''}}},false);await test({paymentMethods:samples.payment},true);
  for(const amount of [-1,-25000,-35000,-45000])await test({shippingPolicy:{...base.shippingPolicy,innerCityFee:amount}},false);
  await test({shippingPolicy:{...base.shippingPolicy,innerCityFee:25000.75}},true);
  for(const hours of [{open:'20:00',close:'08:00'},{open:'08:00',close:'08:00'}])await test({operatingHours:{weekday:hours}},false);
  await test({hotelRules:{...samples.booking.hotelRules,checkInTime:'12:00',checkOutTime:'12:00'}},false);
  for(const slotCapacityMax of [0,-1,2.5])await test({bookingPolicy:{...samples.booking.bookingPolicy,slotCapacityMax}},false);
  await test({hotelRules:{...samples.booking.hotelRules,lateCheckOutFeePerHalfDay:-100000}},false);
  await test({bookingPolicy:{...samples.booking.bookingPolicy,lateCancelFee:-50000}},false);
  await test({operatingHours:samples.booking.operatingHours,hotelRules:samples.booking.hotelRules,bookingPolicy:samples.booking.bookingPolicy},true);
  await db.query('RESET ROLE');const delivery=randomUUID();
  await db.query("INSERT INTO public.delivery_option_config(id,name,fee,available) VALUES($1,'QA validation delivery',25000,true)",[delivery]);
  const expected=(await db.query('SELECT to_jsonb(d) value FROM public.delivery_option_config d WHERE id=$1',[delivery])).rows[0].value;
  await db.query('SET LOCAL ROLE authenticated');
  for(const fee of [-1,-25000,-35000,-45000,25000.75]){
   await db.query('SAVEPOINT delivery_fee');let error;
   try{await db.query('SELECT public.save_admin_shipping_settings($1,$2::jsonb,$3,$4::jsonb,$5::jsonb)',[randomUUID(),JSON.stringify([{id:delivery,expected,values:{fee,available:true}}]),id,record?JSON.stringify(record):null,JSON.stringify(base)]);
    assert.equal(Number((await db.query('SELECT fee FROM public.delivery_option_config WHERE id=$1',[delivery])).rows[0].fee),fee);
   }catch(e){error=e;}
   await db.query('ROLLBACK TO SAVEPOINT delivery_fee');await db.query('RELEASE SAVEPOINT delivery_fee');
   if(fee<0)assert.ok(['22023','23514'].includes(error?.code));else assert.equal(error,undefined,error?.message);checks++;
  }
  await db.query('ROLLBACK');
  fs.writeFileSync('docs/verification/sync/settings-system-validation-rollback.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',checks,scope:'Real save_admin_setting_record; migration and all configuration/auth changes rolled back; no partner connection or Logs'},null,2)+'\n');
  console.log('PASS '+checks+' live configuration RPC validation cases; migration and every configuration/auth change rolled back.');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});throw e;}finally{await db.end();}
})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
