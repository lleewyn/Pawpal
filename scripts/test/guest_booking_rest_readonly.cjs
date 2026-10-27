const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{createClient}=require('@supabase/supabase-js');
if(!process.argv.includes('--cloud-readonly')){console.log('Use --cloud-readonly for two negative booking REST probes.');process.exit(0);}
(async()=>{const {config}=require('../database/v1/cloud_connection.cjs').settings(),options={auth:{persistSession:false,autoRefreshToken:false}};
 const args={p_hash:crypto.randomBytes(32).toString('hex'),p_request:crypto.randomUUID()};
 const service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options);
 const anon=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);
 const scoped=await service.rpc('guest_booking_receipt',args);assert.equal(scoped.error?.code,'42501');assert.equal(scoped.data,null);
 const denied=await anon.rpc('guest_booking_receipt',args);assert.ok(['42501','PGRST202'].includes(denied.error?.code));assert.equal(denied.data,null);
 fs.writeFileSync('docs/verification/sync/guest-booking-rest-readonly.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',requests:2,serviceRejectsUnboundSession:true,anonymousDenied:true,scope:'Real Supabase REST with random unbound hash and random booking UUID; no business writes or real history/phone lookup; not deployed backend/UI or real Auth acceptance'},null,2)+'\n');
 console.log('PASS two real REST probes: unbound service request and anonymous receipt call denied.');
})().catch(e=>{console.error(e.code||e.name);process.exitCode=1;});
