const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
if(!process.argv.includes('--cloud-readonly')){console.log('Use --cloud-readonly for two context-only REST probes.');process.exit(0);}
(async()=>{
 const {config}=require('../database/v1/cloud_connection.cjs').settings(),options={auth:{persistSession:false,autoRefreshToken:false}};
 const service=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_SERVICE_ROLE_KEY,options);
 const anon=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);
 const args={p_hash:crypto.randomBytes(32).toString('hex'),p_page:1};
 const allowed=await service.rpc('guest_commerce_context',args);assert.equal(allowed.error,null);assert.equal(allowed.data.initialized,false);assert.deepEqual(allowed.data.pets,[]);assert.equal(allowed.data.contact,undefined);
 const denied=await anon.rpc('guest_commerce_context',args);assert.ok(denied.error);assert.ok(['42501','PGRST202'].includes(denied.error.code));assert.equal(denied.data,null);
 fs.writeFileSync('docs/verification/sync/guest-commerce-rest-readonly.txt',JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',serviceContextUnboundEmpty:true,anonymousDenied:true,anonymousCode:denied.error.code,requests:2,scope:'Real Supabase REST service/anon context calls with random unknown hash; no business writes or customer lookup, no Auth user login/HTTP backend deployment acceptance'},null,2)+'\n');
 console.log('PASS two real REST probes: service gets empty unbound context, anonymous denied; no business writes.');
})().catch(e=>{console.error(e.code||e.name);process.exitCode=1;});
