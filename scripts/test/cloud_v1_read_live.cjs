// Read-only verification of migrated V1 against the actual new Cloud Auth/REST/Realtime APIs.
const fs=require('node:fs'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const infra='D:/Aboutme/Pawpal-infra/supabase-local';
const config=require('dotenv').parse(fs.readFileSync(infra+'/CLOUD-MIGRATION.private.env'));
const credentials=fs.readFileSync(infra+'/PAWPAL-ADMIN.private.txt','utf8');
(async()=>{
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 const anon=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);
 const privateRows=await anon.from('customer').select('id').limit(1);
 assert.ok(privateRows.error,'Anonymous must not receive customer table access');
 const client=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);
 try{
  const login=await client.auth.signInWithPassword({email:credentials.match(/^Email: (.+)$/m)[1].trim(),password:credentials.match(/^Password: (.+)$/m)[1].trim()});
  assert.equal(login.error,null,'Migrated Admin must sign in with the existing password');
  const context=await client.rpc('get_staff_login_context');assert.equal(context.error,null);assert.equal(context.data.is_active,true);
  const customers=await client.from('customer').select('id');assert.equal(customers.error,null);assert.equal(customers.data.length,35);
  const points=await client.from('customer_point_balance').select('total_paw_points');assert.equal(points.error,null);assert.equal(points.data.reduce((sum,r)=>sum+Number(r.total_paw_points),0),7964);
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(Error('Cloud Realtime did not join')),20000);
   client.channel('cloud-v1-migration-read-check').on('postgres_changes',{event:'*',schema:'public',table:'customer'},()=>{}).subscribe(status=>{
    if(status==='SUBSCRIBED'){clearTimeout(timer);resolve();}else if(['CHANNEL_ERROR','TIMED_OUT'].includes(status)){clearTimeout(timer);reject(Error('Cloud Realtime: '+status));}
   });
  });
  console.log('PASS actual Cloud API: anonymous denied, migrated Admin password works, staff context active, 35 customers, 7964 points, Realtime joined.');
 }finally{await client.removeAllChannels();await client.auth.signOut({scope:'local'});}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
