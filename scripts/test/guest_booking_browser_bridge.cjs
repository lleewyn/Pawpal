// Task-only loopback bridge for browser -> real installed SQL, always rollback.
require('dotenv').config();
const express=require('express'),fs=require('node:fs'),assert=require('node:assert/strict');
const {connect}=require('../database/v1/service_import_connection.cjs');
const {createGuestCommerce,cookieConfiguration}=require('../api/guest_commerce');
if(!process.argv.includes('--bridge')){console.log('Use --bridge for a temporary localhost:4002 rollback bridge.');process.exit(0);}
(async()=>{
 const db=await connect(),app=express(),petIds=new Set(),bookingIds=new Set(),expectedPets=new Map(),calls={};let queue=Promise.resolve(),server,closing=false,queries=0;
 const q=(text,args)=>{queries++;return db.query(text,args);};
 await q("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='2s';SET LOCAL idle_in_transaction_session_timeout='5min';SET LOCAL ROLE service_role");
 const clock=Number((await q('SELECT extract(epoch FROM now())::float8 seconds')).rows[0].seconds)*1000;
 const startLocal=(await q("SELECT to_char((now() AT TIME ZONE 'Asia/Bangkok')::date+14+time '11:00','YYYY-MM-DD\"T\"HH24:MI') value")).rows[0].value;
 const mapping={guest_commerce_context:['p_hash','p_page'],guest_commerce_save_pet:['p_hash','p_expires','p_request','p_phone','p_name','p_pet'],guest_commerce_end:['p_hash'],guest_booking_quote:['p_hash','p_details'],guest_booking_create:['p_hash','p_request','p_expected_quote','p_details'],guest_booking_receipt:['p_hash','p_request'],guest_profile_read:['p_hash','p_pet'],guest_profile_update:['p_hash','p_new_hash','p_request','p_revision','p_contact','p_pet'],guest_booking_day_slots:['p_hash','p_details','p_day'],guest_booking_recover:['p_request']};
 const admin={rpc(name,args){
  const operation=queue.then(async()=>{
   assert.ok(mapping[name],'Unexpected RPC');calls[name]=(calls[name]||0)+1;
   await q('SAVEPOINT browser_call');
   try{
    const keys=mapping[name],values=keys.map(key=>args[key]!=null&&['p_pet','p_details','p_contact'].includes(key)&&!(name==='guest_profile_read'&&key==='p_pet')?JSON.stringify(args[key]):args[key]);
    const data=(await q(`SELECT public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) value`,values)).rows[0].value;
    await q('RELEASE SAVEPOINT browser_call');
    if(name==='guest_commerce_save_pet'){petIds.add(args.p_request);if(process.argv.includes('--profile-run'))await q("UPDATE public.pet_weight_history SET measured_at=now()-interval '1 second' WHERE pet_id=$1 AND note=$2",[args.p_request,'guest-create:'+args.p_request]);}if(name==='guest_booking_create'){bookingIds.add(args.p_request);expectedPets.set(args.p_request,args.p_details.pet_id);}
    return {data};
   }catch(error){await q('ROLLBACK TO SAVEPOINT browser_call');await q('RELEASE SAVEPOINT browser_call');console.log('Probe RPC rejected:',name,error.code,error.message);return {error:{code:error.code,message:error.message}};}
  });queue=operation.catch(()=>{});return operation;
 }};
 const handler=createGuestCommerce({admin,...cookieConfiguration({...process.env,PORT:'4001'}),now:()=>clock,limit:async()=>{}});
 app.use(express.json({limit:'20kb'}));app.all('/api/customer/guest/:action',(req,res)=>handler(req,res,req.params.action));
 async function finish(status){
  if(closing)return;closing=true;await queue;
  const owners=(await q('SELECT DISTINCT customer_id FROM public.pet_profile WHERE id=ANY($1::uuid[])',[[...petIds]])).rows.map(row=>row.customer_id);
  const booked=(await q('SELECT id,pet_id,appointment_status FROM public.appointment WHERE id=ANY($1::uuid[])',[[...bookingIds]])).rows;
  for(const booking of booked){assert.equal(booking.pet_id,expectedPets.get(booking.id));assert.equal(booking.appointment_status,'pending');}
  const logistics=(await q('SELECT (SELECT count(*)::int FROM public.hotel_booking WHERE appointment_id=ANY($1::uuid[])) hotel,(SELECT count(*)::int FROM public.taxi_trip WHERE appointment_id=ANY($1::uuid[])) taxi,(SELECT count(*)::int FROM public.payment WHERE appointment_id=ANY($1::uuid[])) payments',[[...bookingIds]])).rows[0];
  await q('SET CONSTRAINTS ALL IMMEDIATE');await q('ROLLBACK');
  assert.equal((await q('SELECT count(*)::int n FROM public.pet_profile WHERE id=ANY($1::uuid[])',[[...petIds]])).rows[0].n,0);
  assert.equal((await q('SELECT count(*)::int n FROM public.appointment WHERE id=ANY($1::uuid[])',[[...bookingIds]])).rows[0].n,0);
  assert.equal((await q('SELECT count(*)::int n FROM public.customer WHERE id=ANY($1::uuid[])',[owners])).rows[0].n,0);
  const report=process.argv.includes('--profile-run')?'guest-profile-slots-recovery-browser-rollback.txt':process.argv.includes('--hotel-run')?'guest-hotel-browser-rollback.txt':process.argv.includes('--taxi-run')?'guest-taxi-browser-rollback.txt':process.argv.includes('--lookup-run')?'guest-booking-lookup-rollback.txt':'guest-booking-browser-rollback.txt';
  fs.writeFileSync('docs/verification/sync/'+report,JSON.stringify({timestamp:new Date().toISOString(),status,queries,rpcCalls:calls,fixturePets:petIds.size,fixtureBookings:bookingIds.size,fixtureOwners:owners.length,selectedPetMatches:true,logistics,remainingFixtureRows:0,scope:(process.argv.includes('--profile-run')?'Profile run: catalog read as anon and breeds read in the same SQL transaction; create weight timestamp is set one second earlier to represent a prior measurement under fixed now(). ':'')+'Playwright browser requests forwarded to temporary loopback HTTP handler with installed Cloud SQL service_role RPCs. Other runs use public catalog via normal frontend REST; all guest profile/pet/booking/audit writes rollback. Rate limiter bypassed in bridge, no real commit/Realtime/Admin portal/gateway/SMS/Storage acceptance.'},null,2)+'\n');
  await db.end();server?.close();console.log('Rollback complete; no fixture rows retained.');
 }
 app.post('/__finish',async(req,res)=>{try{await finish('PASS');res.json({success:true});}catch(error){await db.query('ROLLBACK').catch(()=>{});res.status(500).json({success:false});console.error(error.code||error.name);await db.end().catch(()=>{});server?.close();}});
 if(process.argv.includes('--profile-run'))app.get('/__fixture',async(req,res)=>{try{await queue;await q('SAVEPOINT fixture_read');await q('SET LOCAL ROLE anon');const catalog=(await q('SELECT public.customer_service_catalog() value')).rows[0].value;await q('SET LOCAL ROLE service_role');const breeds=(await q("SELECT b.id,b.breed_name,b.species_id,jsonb_build_object('id',s.id,'species_name',s.species_name,'is_active',s.is_active) pet_species FROM public.pet_breed b JOIN public.pet_species s ON s.id=b.species_id WHERE b.is_active AND s.is_active ORDER BY b.breed_name")).rows;await q('RELEASE SAVEPOINT fixture_read');res.json({catalog,breeds,startLocal});}catch(e){await q('ROLLBACK TO SAVEPOINT fixture_read');res.status(500).json({error:e.code});}});
 server=app.listen(4002,'127.0.0.1',()=>console.log('Rollback bridge ready on 4002; suggested local start:',startLocal));
 server.on('error',async()=>{await db.query('ROLLBACK').catch(()=>{});await db.end();process.exitCode=1;});
 setTimeout(()=>finish('TIMEOUT').catch(async()=>{await db.query('ROLLBACK').catch(()=>{});await db.end().catch(()=>{});server.close();}),240000).unref();
 process.once('SIGINT',()=>finish('INTERRUPTED').catch(()=>process.exit(1)));
})().catch(error=>{console.error(error.code||error.name,error.message);process.exitCode=1;});
