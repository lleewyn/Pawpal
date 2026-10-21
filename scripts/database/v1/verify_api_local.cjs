// Verify schema exposure without retrieving any business rows or logging keys.
const fs=require('node:fs');
const path=require('node:path');
const {tables}=require('./model.cjs');
const env=require('dotenv').parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/supabase-local/.env'));
if(env.SUPABASE_PUBLIC_URL!=='http://localhost:8000')throw Error('Local-only API verification');
const base='http://127.0.0.1:8000/rest/v1/';
const headers={apikey:env.SERVICE_ROLE_KEY,Authorization:'Bearer '+env.SERVICE_ROLE_KEY};
async function main(){
 for(let attempt=0;attempt<10;attempt++){
  const r=await fetch(base+'customer_phone?select=*&limit=0',{headers});
  if(r.ok)break;
  if(attempt===9)throw Error('PostgREST V1 schema cache not ready');
  await new Promise(r=>setTimeout(r,500));
 }
 for(let i=0;i<tables.length;i+=8){
  await Promise.all(tables.slice(i,i+8).map(async t=>{
   const r=await fetch(base+t.name+'?select=*&limit=0',{headers});
   if(!r.ok)throw Error('API table unavailable: '+t.name+' HTTP '+r.status);
   if(JSON.stringify(await r.json())!=='[]')throw Error('limit=0 returned unexpected content');
  }));
 }
 const removed=await fetch(base+'customer_activation_sms?select=*&limit=0',{headers});
 if(removed.status!==404)throw Error('Legacy SMS queue still exposed');
 const legacy=await fetch(base+'customer?select=phone_main&limit=0',{headers});
 if(legacy.status!==400)throw Error('Legacy physical customer.phone_main still exists');
 console.log('PASS REST exposure: 105 V1 tables; legacy SMS table and phone_main removed; no business rows fetched');
}
main().catch(e=>{console.error(e.message);process.exitCode=1;});
