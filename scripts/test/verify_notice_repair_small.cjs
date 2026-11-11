const fs=require('node:fs'),assert=require('node:assert/strict');
const {createClient}=require('@supabase/supabase-js');
const {settings}=require('../database/v1/cloud_connection.cjs');
(async()=>{
 const {config}=settings();const credentials=fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/PAWPAL-ADMIN.private.txt','utf8');
 let calls=0,bytes=0;const minimalFetch=async(...args)=>{calls++;if(calls>8)throw Error('Verification request cap exceeded');const response=await fetch(...args);bytes+=(await response.clone().arrayBuffer()).byteLength;return response;};
 const options={auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:minimalFetch}};
 const client=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);
 try{
  const login=await client.auth.signInWithPassword({email:credentials.match(/^Email: (.+)$/m)[1].trim(),password:credentials.match(/^Password: (.+)$/m)[1].trim()});
  if(login.error)throw Error('Admin authentication failed');
  const notice=await client.rpc('own_complaint_reply_notices');
  assert.equal(notice.error,null);assert.equal(typeof notice.data.unread,'number');assert(Array.isArray(notice.data.items));assert(notice.data.items.length<=10);
  const anonymous=createClient(config.DESTINATION_SUPABASE_URL,config.DESTINATION_SUPABASE_ANON_KEY,options);
  const denied=await anonymous.rpc('own_complaint_reply_notices');assert(denied.error,'Anonymous access must be denied');assert.equal(denied.data,null);
  const source=JSON.parse(fs.readFileSync('artifacts/data-cleanup/2026-11-11T02-51-15-423Z/retained-inspection.private.json','utf8'));
  const states=await client.from('customer').select('id,customer_status').in('id',source.customers.map(row=>row.id));
  assert.equal(states.error,null);assert.equal(states.data.length,6);assert(states.data.every(row=>row.customer_status==='locked'));
  console.log('PASS live notice RPC, anonymous denial, and six locked test profiles.');
 }finally{await client.auth.signOut({scope:'local'});console.log(JSON.stringify({httpRequests:calls,responsePayloadBytes:bytes,imagesDownloaded:0,logsQueried:0}));}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
