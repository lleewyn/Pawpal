const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fs=require('node:fs');const {admin,service,ok,infra}=require('./customer_completion_helpers.cjs');
(async()=>{
 const raw=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');await ok(admin.auth.signInWithPassword({email:raw.match(/^Email: (.+)$/m)[1],password:raw.match(/^Password: (.+)$/m)[1]}));
 const original=await ok(service.from('pawpal_setting').select('*').eq('setting_key','system_config').maybeSingle()),point=await ok(service.from('pawpal_setting').select('*').eq('setting_key','sales_point_redemption_value').maybeSingle()),methods=await ok(service.from('payment_method_config').select('*'));
 const before=await service.from('paw_point_transaction').select('id',{count:'exact',head:true});
 const deliveryOptions=await ok(service.from('delivery_option_config').select('*'));
 try{
  const config={storeInfo:{brandName:'Verification store'},paymentMethods:{cod:{enabled:false},bank:{enabled:false,bankName:'',accountNumber:'',accountHolder:'',syntax:''}},shippingPolicy:{freeShippingThreshold:0,innerCityFee:0,outerCityFee:0,expressFee:0,isConfigured:false},operatingHours:{weekday:{open:'08:00',close:'20:00'},weekend:{open:'08:00',close:'21:00'}},hotelRules:{},bookingPolicy:{slotCapacityMax:4,freeCancelHours:0,lateCancelFee:0},pawpointsPolicy:{pointValueVnd:123,registerBonus:0,firstOrderPoints:0,firstBookingPoints:0,birthdayPoints:0},websiteNotices:[]};
  const request=randomUUID(),args={p_request:request,p_table:'pawpal_setting',p_id:original?.id||randomUUID(),p_expected:original,p_values:{setting_key:'system_config',setting_type:'json',setting_value:JSON.stringify(config)},p_delete:false};
  const saved=await ok(admin.rpc('save_admin_setting_record',args));assert.equal((await ok(admin.rpc('save_admin_setting_record',args))).replayed,true);
  assert.equal((await ok(service.from('pawpal_setting').select('setting_value').eq('setting_key','sales_point_redemption_value').single())).setting_value,'123');
  assert.equal((await ok(service.from('payment_method_config').select('available').eq('short_name','COD').single())).available,false);
  assert.equal((await admin.rpc('save_admin_setting_record',{...args,p_request:randomUUID()})).error.code,'PT409');
  for(const cfg of [{shippingPolicy:{apiKey:'test-secret'}},{operatingHours:{weekday:{open:'20:00',close:'08:00'}}},{bookingPolicy:{slotCapacityMax:-1}},{websiteNotices:[{content:'unsafe',link:'javascript:alert(1)'}]}])assert.ok((await admin.rpc('save_admin_setting_record',{...args,p_request:randomUUID(),p_expected:saved,p_values:{setting_value:JSON.stringify(cfg)}})).error);
  assert.ok((await admin.from('audit_log').insert({staff_id:(await ok(admin.rpc('get_staff_login_context'))).staff.id,action:'SETTINGS_WRITE',entity_name:'pawpal_setting',description:'Forged'})).error);
  assert.equal((await service.from('paw_point_transaction').select('id',{count:'exact',head:true})).count,before.count);
  if(deliveryOptions.length){
   const first=deliveryOptions[0];
   await ok(admin.rpc('save_admin_shipping_settings',{p_request:randomUUID(),p_options:[{id:first.id,expected:first,values:{fee:77,available:true}}],p_config_id:saved.id,p_expected_config:saved,p_config:config}));
   assert.equal(Number((await ok(service.from('delivery_option_config').select('fee').eq('id',first.id).single())).fee),77);
   if(deliveryOptions.length>1){
    const current=await ok(service.from('delivery_option_config').select('*').eq('id',first.id).single()),cfgRow=await ok(service.from('pawpal_setting').select('*').eq('id',saved.id).single());
    const failed=await admin.rpc('save_admin_shipping_settings',{p_request:randomUUID(),p_options:[{id:first.id,expected:current,values:{fee:88,available:true}},{id:deliveryOptions[1].id,expected:{},values:{fee:88,available:true}}],p_config_id:saved.id,p_expected_config:cfgRow,p_config:config});assert.ok(failed.error);
    assert.equal(Number((await ok(service.from('delivery_option_config').select('fee').eq('id',first.id).single())).fee),77);
   }
  }
  console.log('PASS system setting/audit atomicity, stale/replay, payment availability, sales point value, secret/hour/notice validation and no point awards.');
 }finally{
  if(original)await ok(service.from('pawpal_setting').upsert(original));else await ok(service.from('pawpal_setting').delete().eq('setting_key','system_config'));
  if(point)await ok(service.from('pawpal_setting').upsert(point));else await ok(service.from('pawpal_setting').delete().eq('setting_key','sales_point_redemption_value'));
  await ok(service.from('payment_method_config').upsert(methods));
  if(deliveryOptions.length)await ok(service.from('delivery_option_config').upsert(deliveryOptions));
 }
})().catch(e=>{console.error(e.stack);process.exitCode=1;});
