const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{createClient}=require('@supabase/supabase-js');
if(!process.argv.includes('--cloud-readonly')){console.log('Use --cloud-readonly for two negative account-link REST probes.');process.exit(0);}
(async()=>{const {config}=require('../database/v1/cloud_connection.cjs').settings(),options={auth:{persistSession:false,autoRefreshToken:false}};
 const args={p_hash:crypto.randomBytes(32).toString('hex'),p_auth_id:crypto.randomUUID(),p_phone:'0950000001',p_name:null};
 const service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options),anon=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);
 const unverified=await service.rpc('complete_guest_customer_auth',args);assert.equal(unverified.error?.code,'42501');assert.equal(unverified.data,null);
 const denied=await anon.rpc('complete_guest_customer_auth',args);assert.ok(['42501','PGRST202'].includes(denied.error?.code));assert.equal(denied.data,null);
 fs.writeFileSync('docs/verification/sync/guest-account-link-rest-readonly.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',requests:2,unverifiedIdentityDenied:true,anonymousDenied:true,scope:'Real Supabase REST with random unknown Auth UUID/hash, no identity/profile/transaction writes or history read, no SMS/Auth login acceptance'},null,2)+'\n');console.log('PASS two REST probes: unknown Auth identity and anonymous link request denied; no identity data written.');
})().catch(e=>{console.error(e.code||e.name);process.exitCode=1;});
