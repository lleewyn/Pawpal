// Isolated committed guest->account link probe. Not a real SMS/OTP acceptance test.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{createClient}=require('@supabase/supabase-js');
const mode=process.argv[2],privatePath='D:/Aboutme/Pawpal-infra/browser-check/guest-activation.private.json';
if(!['setup','link','cleanup'].includes(mode)){console.log('No connection. Specify setup, link or cleanup.');process.exit(0);}
const {config}=require('../database/v1/cloud_connection.cjs').settings(),db=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}}),ok=async p=>{const r=await p;if(r.error)throw r.error;return r.data;};
(async()=>{
 if(mode==='setup'){
  assert.ok(!fs.existsSync(privatePath),'Clean earlier fixture first');const phone='095'+crypto.randomInt(1000000,10000000);
  assert.equal((await ok(db.from('customer_phone').select('id').in('phone_number',[phone,'+84'+phone.slice(1)]).limit(1))).length,0);
  const f={started:Date.now(),phone,name:'E2E Guest Activation '+crypto.randomUUID().slice(0,8),password:crypto.randomBytes(24).toString('hex')+'!',email:'activate-'+crypto.randomUUID()+'@example.invalid',pet:crypto.randomUUID(),booking:crypto.randomUUID(),item:crypto.randomUUID()};
  const save=()=>fs.writeFileSync(privatePath,JSON.stringify(f,null,2));save();
  f.cid=await ok(db.rpc('ensure_guest_customer',{p_phone:phone,p_name:f.name}));save();const c=await ok(db.from('customer').select('auth_user_id,created_at').eq('id',f.cid).single());assert.equal(c.auth_user_id,null);assert.ok(Date.parse(c.created_at)>=f.started-2000);
  f.uid=(await ok(db.auth.admin.createUser({email:f.email,password:f.password,phone:'+84'+phone.slice(1),email_confirm:true,phone_confirm:true,app_metadata:{pawpal_test:true,user_type:'CUSTOMER'}}))).user.id;save();
  const breed=(await ok(db.from('pet_breed').select('id').eq('is_active',true).order('id').limit(1)))[0],service=(await ok(db.from('service').select('id').eq('status','active').order('id').limit(1)))[0];
  await ok(db.from('pet_profile').insert({id:f.pet,customer_id:f.cid,pet_code:'E2E-'+f.pet,pet_name:'E2E Activation Pet',breed_id:breed.id,gender:'nam'}));
  await ok(db.from('appointment').insert({id:f.booking,appointment_code:'E2E-ACT-'+f.booking.slice(0,8),customer_id:f.cid,pet_id:f.pet,scheduled_start_at:new Date(Date.now()+86400000).toISOString(),scheduled_end_at:new Date(Date.now()+90000000).toISOString(),appointment_status:'pending'}));
  await ok(db.from('appointment_item').insert({id:f.item,appointment_id:f.booking,service_id:service.id,is_primary:true,name_snapshot:'E2E Activation Service',quantity:1,unit_price:100,duration_minutes:60,status:'pending'}));
  console.log('SETUP PASS: isolated guest with pet/booking and separate unlinked test Auth; no SMS or money.');
 }else{
  const f=JSON.parse(fs.readFileSync(privatePath,'utf8'));
  const c=await ok(db.from('customer').select('id,auth_user_id,created_at').eq('id',f.cid).single());assert.ok(Date.parse(c.created_at)>=f.started-2000);assert.ok(c.auth_user_id===null||c.auth_user_id===f.uid);
  if(mode==='link'){
   assert.equal(await ok(db.rpc('complete_customer_auth',{p_auth_id:f.uid,p_phone:f.phone,p_name:null})),f.cid);assert.equal(await ok(db.rpc('complete_customer_auth',{p_auth_id:f.uid,p_phone:f.phone,p_name:null})),f.cid);
   const pet=await ok(db.from('pet_profile').select('id,customer_id').eq('id',f.pet).single()),booking=await ok(db.from('appointment').select('id,customer_id,pet_id').eq('id',f.booking).single());assert.equal(pet.customer_id,f.cid);assert.equal(booking.customer_id,f.cid);assert.equal(booking.pet_id,f.pet);assert.equal((await ok(db.from('customer').select('id').eq('auth_user_id',f.uid))).length,1);
   console.log('LINK PASS: same Customer ID, same pet and booking links; retry no duplicate. Service RPC used; not SMS/OTP UI verification.');
  }else{
   const ledger=await ok(db.from('paw_point_transaction').select('id').eq('customer_id',f.cid));assert.equal(ledger.length,0,'Stop cleanup if immutable financial ledger exists');
   await ok(db.from('notification').delete().eq('customer_id',f.cid));await ok(db.from('appointment_item').delete().eq('id',f.item));await ok(db.from('appointment').delete().eq('id',f.booking));await ok(db.from('pet_profile').delete().eq('id',f.pet));
   for(const table of ['customer_membership','customer_address','customer_phone','customer_profile'])await ok(db.from(table).delete().eq('customer_id',f.cid));await ok(db.from('customer').delete().eq('id',f.cid));await ok(db.auth.admin.deleteUser(f.uid));
   assert.equal((await ok(db.from('customer').select('id').eq('id',f.cid))).length,0);assert.equal((await db.auth.admin.getUserById(f.uid)).error?.status,404);fs.unlinkSync(privatePath);console.log('CLEANUP PASS: synthetic Auth/customer/pet/booking removed; no audit or ledger deletion.');
  }
 }
})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
