// Integration test against the separate local self-host only. Never loads app .env.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { createClient } = require('@supabase/supabase-js');
const envFile = process.argv[2];
if (!envFile || !path.isAbsolute(envFile)) throw Error('Pass absolute self-host .env path');
const env = require('dotenv').parse(fs.readFileSync(envFile));
if (env.SUPABASE_PUBLIC_URL !== 'http://localhost:8000') throw Error('Local-only integration test');
const url = env.SUPABASE_PUBLIC_URL;
const opts = { auth: { persistSession: false, autoRefreshToken: false } };
const service = createClient(url, env.SERVICE_ROLE_KEY, opts);
const clients = [];
const fresh = () => { const c=createClient(url, env.ANON_KEY, opts); clients.push(c); return c; };
const users = [], customerIds = [], auditIds = [];
let passed = 0;
function check(value, label) { assert.ok(value, label); console.log('PASS ' + label); passed++; }
async function ok(promise) { const r = await promise; if (r.error) throw Error(r.error.code + ': ' + r.error.message); return r.data; }
async function identity() {
 const email = `local-check-${crypto.randomUUID()}@example.test`;
 const password = crypto.randomBytes(24).toString('base64url');
 const { user } = await ok(service.auth.admin.createUser({ email, password, email_confirm: true }));
 users.push(user.id); const client = fresh();
 await ok(client.auth.signInWithPassword({ email, password }));
 return { client, id: user.id };
}
async function run() {
 const admin = await identity(), a = await identity(), b = await identity();
 const staff = await ok(service.from('staff').insert({ auth_user_id: admin.id, full_name: 'Local integration admin', system_role: 'ADMIN' }).select().single());
 check((await ok(admin.client.rpc('check_user_account_type', { check_auth_id: admin.id })))[0].user_type === 'STAFF', 'staff login and role RPC');
 const customer = await ok(admin.client.from('customer').insert({ phone_main: '0900000001', account_status: 'dang_hoat_dong', is_temporary: true }).select().single());
 customerIds.push(customer.id);
 await ok(admin.client.from('customer_profile').insert({ customer_id: customer.id, full_name: 'Local integration customer', gender: 'khac' }));
 await ok(admin.client.from('customer_membership').insert({ customer_id: customer.id, total_paw_points: 0 }));
 await ok(admin.client.from('customer_address').insert({ customer_id: customer.id, street_address: 'Integration address', is_default: true }));
 await ok(admin.client.from('customer_activation_sms').insert({ customer_id: customer.id, phone: '0900000001', activation_url: 'http://localhost:3000/test-only', status: 'pending' }));
 check(true, 'admin creates customer, profile, membership, address and simulated activation outbox');
 const pet = await ok(admin.client.from('pet_profile').insert({ customer_id: customer.id, pet_code: 'TEST-'+crypto.randomUUID(), pet_name: 'Integration pet', species: 'dog', gender: 'nam', weight: 4, status: 'dang_hoat_dong' }).select().single());
 await ok(admin.client.from('pet_weight_history').insert({ pet_id: pet.id, weight: 4 }));
 check((await ok(admin.client.from('pet_profile').select('id,customer:customer_id(id),pet_name,weight').eq('id',pet.id))).length === 1, 'pet creation, weight history and FK embedding');
 for(const [table,select] of [['sales_order','id,order_code,customer_id,order_status,payment_status,total_amount,created_at'],['appointment','id,appointment_code,customer_id,pet_id,appointment_date,appointment_time,appointment_status,total_price,service:service_id(service_name),staff:staff_id(full_name)'],['support_ticket','id,user_id,title,type,status,priority,created_at'],['care_log','id,appointment_id,pet_id,description,health_status,recorded_at,created_at']]) {
  await ok(admin.client.from(table).select(select).limit(1)); check(true,'profile dependency '+table);
 }
 await ok(service.from('customer').update({auth_user_id:a.id,is_temporary:false}).eq('id',customer.id));
 const other = await ok(service.from('customer').insert({auth_user_id:b.id,is_temporary:false}).select().single()); customerIds.push(other.id);
 check((await ok(a.client.from('customer').select('id'))).map(x=>x.id).join()===customer.id,'customer sees only own row');
 check((await ok(a.client.from('pet_profile').select('id'))).map(x=>x.id).join()===pet.id,'customer sees own pet');
 check((await ok(b.client.from('pet_profile').select('id'))).length===0,'other customer cannot see pet');
 check((await ok(a.client.from('staff').select('id'))).length===0,'customer cannot read staff');
 check(Boolean((await a.client.from('pet_profile').insert({customer_id:other.id,pet_code:'FORBIDDEN',pet_name:'No',species:'dog'})).error),'customer cannot write another customer pet');
 check(Boolean((await a.client.from('staff').insert({auth_user_id:a.id,full_name:'Forbidden',system_role:'ADMIN'})).error),'customer cannot provision staff');
 check(Boolean((await admin.client.from('staff').update({system_role:'ADMIN'}).eq('id',staff.id)).error),'browser cannot change staff role');
 const audit=await ok(admin.client.from('audit_log').insert({staff_id:crypto.randomUUID(),action:'LOCAL_TEST'}).select().single());
 auditIds.push(audit.id);
 check(audit.staff_id===staff.id,'audit actor is derived from authenticated staff, ignoring forged actor');
 check(Boolean((await admin.client.from('audit_log').update({action:'FORGED'}).eq('id',audit.id)).error),'browser cannot rewrite audit log');
 check(Boolean((await admin.client.from('audit_log').delete().eq('id',audit.id)).error),'browser cannot delete audit log');
 check(Boolean((await a.client.from('audit_log').insert({action:'FORGED'})).error),'customer cannot create internal audit log');
 await ok(admin.client.from('staff').update({last_login_at:new Date().toISOString()}).eq('id',staff.id)); check(true,'staff can update own login timestamp');
 check(Boolean((await a.client.rpc('check_user_account_type',{check_auth_id:admin.id})).error),'RPC rejects inspection of another identity');
 check(Boolean((await fresh().from('customer').select('id')).error),'anonymous request denied');
 check(Boolean((await service.from('staff').insert({auth_user_id:a.id,full_name:'Dual identity'})).error),'database prevents identity in both portals');
 check(Boolean((await admin.client.from('pet_profile').insert({customer_id:customer.id,pet_code:'INVALID-WEIGHT',pet_name:'Bad weight',species:'dog',weight:0})).error),'database rejects invalid pet weight');
 check(Boolean((await admin.client.from('customer').insert({phone_main:'123'})).error),'database rejects invalid phone');
 check(Boolean((await admin.client.from('customer_address').insert({customer_id:customer.id,street_address:'Duplicate',is_default:true})).error),'database prevents two default addresses');
 await ok(service.from('staff').update({account_status:'LOCKED'}).eq('id',staff.id));
 check((await ok(admin.client.from('customer').select('id'))).length===0,'locked staff loses access even with existing JWT');
 check(Boolean((await admin.client.from('customer').insert({})).error),'locked staff cannot write');
 await ok(service.from('staff').update({account_status:'ACTIVE'}).eq('id',staff.id));
 for(const status of ['bi_khoa','tam_khoa','da_khoa']) {
  await ok(service.from('customer').update({account_status:status}).eq('id',customer.id));
  check((await ok(a.client.from('pet_profile').select('id'))).length===0,'locked customer loses pet access: '+status);
 }
 await ok(service.from('customer').update({account_status:'dang_hoat_dong'}).eq('id',customer.id));
 const reloaded=fresh();
 // Access token is reused as a new client session, simulating reload without bypassing RLS.
 const session=(await ok(admin.client.auth.getSession())).session;
 await ok(reloaded.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token}));
 check((await ok(reloaded.from('pet_profile').select('id').eq('id',pet.id))).length===1,'new client session reads persisted pet');
 let channel;
 try {
  let onEvent;
  const event=new Promise(resolve=>{onEvent=resolve;});
  channel=admin.client.channel('core-test-'+crypto.randomUUID()).on('postgres_changes',{event:'UPDATE',schema:'public',table:'pet_profile',filter:'id=eq.'+pet.id},onEvent);
  // Socket join may finish before CDC initialization on a fresh tenant.
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Realtime CDC initialization timeout')),30000);
   channel.on('system',{},message=>{if(message.extension==='postgres_changes'&&message.status==='ok'){clearTimeout(timer);resolve();}})
    .subscribe(status=>{if(status==='CHANNEL_ERROR'){clearTimeout(timer);reject(Error(status));}});
  });
  await ok(admin.client.from('pet_profile').update({weight:4.5}).eq('id',pet.id));
  let timer; const received=await Promise.race([event,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Realtime event timeout')),15000);})]).finally(()=>clearTimeout(timer));
  check(received.new.id===pet.id,'Realtime delivers persisted pet update');
 } finally { if(channel)await admin.client.removeChannel(channel); }
 console.log('Passed '+passed+' live integration checks');
}
run().catch(e=>{console.error('FAIL '+e.message);process.exitCode=1;}).finally(async()=>{
 // Delete only identities and records created in this run, never pre-existing data.
 for(const id of auditIds)await service.from('audit_log').delete().eq('id',id);
 for(const id of customerIds.reverse()) { await service.from('customer_activation_sms').delete().eq('customer_id',id); await service.from('customer').delete().eq('id',id); }
 for(const id of users) { await service.from('staff').delete().eq('auth_user_id',id); await service.auth.admin.deleteUser(id); }
 for(const client of clients) { await client.removeAllChannels(); await client.realtime.disconnect(); }
 await service.realtime.disconnect();
});
