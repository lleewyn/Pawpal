// Loopback HTTP -> installed-on-transaction guest RPCs. No fixture committed.
const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict'),express=require('express');
const {connect}=require('../database/v1/service_import_connection.cjs');
const {createGuestCommerce}=require('../api/guest_commerce');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const file='scripts/database/v1/114_guest_booking.sql',source=fs.readFileSync(file,'utf8');
const installed=process.argv.includes('--verify-installed');
if(!installed&&!process.argv.includes('--verify-cloud')){console.log('Use --verify-installed for current Cloud RPC checks, or --verify-cloud before migration installation.');process.exit(0);}
const signatures=['pawpal_private.guest_booking_availability(uuid,jsonb)','pawpal_private.guest_booking_quote_core(uuid,jsonb)','pawpal_private.require_guest_booking_session(text)','public.guest_booking_quote(text,jsonb)','public.guest_booking_create(text,uuid,text,jsonb)','public.guest_booking_receipt(text,uuid)'];
(async()=>{const db=await connect();let server;const checks=[];let queries=0,lastError;
 const q=async(s,a)=>{queries++;return db.query(s,a);},pass=name=>checks.push({name,status:'PASS'});
 try{
  await q("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='2s'");
  for(const signature of signatures){const value=(await q('SELECT to_regprocedure($1)::text value',[signature])).rows[0].value;if(installed)assert.ok(value);else assert.equal(value,null);}
  const baseline=JSON.parse(fs.readFileSync('docs/verification/sync/guest-booking-source-baseline.txt'));
  for(const f of baseline.sources)assert.equal(hash((await q('SELECT pg_get_functiondef($1::regprocedure) value',[f.signature])).rows[0].value.replaceAll('\r\n','\n')),f.sha256);
  if(!installed)await q(source.replace(/^BEGIN;\s*$/m,'').replace(/^COMMIT;\s*$/m,''));
  for(const role of ['anon','authenticated']){
   await q('SET LOCAL ROLE '+role);await q('SAVEPOINT role_deny');let code;
   try{await q('SELECT public.guest_booking_quote($1,$2)',['0'.repeat(64),{}]);}catch(e){code=e.code;}
   await q('ROLLBACK TO SAVEPOINT role_deny');await q('RESET ROLE');assert.equal(code,'42501');pass(role+' cannot execute service-only booking RPC');
  }
  const breed=(await q('SELECT id,species_id FROM public.pet_breed WHERE is_active ORDER BY id LIMIT 1')).rows[0];assert.ok(breed);
  const prefix=crypto.randomUUID(),services={};
  for(const kind of ['grooming_spa','pet_hotel','pet_taxi']){
   const id=crypto.randomUUID(),addon=crypto.randomUUID();services[kind]={id,addon};
   await q("INSERT INTO public.service(id,service_code,service_name,estimated_duration,status,category_id) SELECT $1,$2,$3,60,'active',id FROM public.service_category WHERE category_code=$4",[id,'G114-'+id,'Guest booking probe '+prefix,kind]);
   await q('INSERT INTO public.service_supported_species(service_id,species_id) VALUES($1,$2)',[id,breed.species_id]);
   await q("INSERT INTO public.service_addon(id,service_id,addon_name,price,estimated_duration,is_required,status) VALUES($1,$2,'Guest required addon',50,15,true,'active')",[addon,id]);
  }
  await q("INSERT INTO public.service_price_matrix(service_id,weight_from,weight_to,unit_price,duration_minutes,effective_from,status) VALUES($1,0,NULL,700,90,now()-interval '1 day','active')",[services.grooming_spa.id]);
  await q("INSERT INTO public.taxi_price_rule(service_id,distance_from,distance_to,weight_from,weight_to,base_price,surcharge,effective_from,status) VALUES($1,0,99,0,NULL,200,10,now()-interval '1 day','active')",[services.pet_taxi.id]);
  const roomType=crypto.randomUUID(),room=crypto.randomUUID();
  await q("INSERT INTO public.hotel_room_type(id,room_type,capacity,daily_price,status,service_id,weight_from,billing_minutes,effective_from) VALUES($1,'Guest probe room',1,300,'active',$2,0,1440,now()-interval '1 day')",[roomType,services.pet_hotel.id]);
  await q("INSERT INTO public.hotel_room(id,room_number,room_type_id,status) VALUES($1,$2,$3,'active')",[room,'G114-'+room,roomType]);
  const times=(await q(`WITH days AS(SELECT ((now() AT TIME ZONE 'Asia/Bangkok')::date+14+v.n) d FROM (VALUES(0),(2),(4)) v(n)),cfg AS(SELECT setting_value::jsonb value FROM public.pawpal_setting WHERE setting_key='system_config')
   SELECT ((d+((value->'operatingHours'->CASE WHEN extract(isodow FROM d) IN(6,7) THEN 'weekend' ELSE 'weekday' END->>'open')::time)+interval '1 hour') AT TIME ZONE 'Asia/Bangkok') starts,
   ((d+((value->'operatingHours'->CASE WHEN extract(isodow FROM d) IN(6,7) THEN 'weekend' ELSE 'weekday' END->>'close')::time)) AT TIME ZONE 'Asia/Bangkok') closes
   FROM days CROSS JOIN cfg ORDER BY d`)).rows;assert.equal(times.length,3);
  const kinds=['grooming_spa','pet_hotel','pet_taxi'];kinds.forEach((kind,i)=>{services[kind].start=times[i].starts.toISOString();services[kind].close=times[i].closes.toISOString();});
  await q('SET LOCAL ROLE service_role');
  const mappings={customer_auth_rate_limit:['p_key','p_max','p_window_seconds'],guest_commerce_context:['p_hash','p_page'],guest_commerce_save_pet:['p_hash','p_expires','p_request','p_phone','p_name','p_pet'],guest_commerce_end:['p_hash'],guest_booking_quote:['p_hash','p_details'],guest_booking_create:['p_hash','p_request','p_expected_quote','p_details'],guest_booking_receipt:['p_hash','p_request']};
  const admin={rpc:async(name,args)=>{assert.ok(mappings[name]);await q('SAVEPOINT api_call');try{const keys=mappings[name];const data=(await q(`SELECT public.${name}(${keys.map((_,i)=>'$'+(i+1)).join(',')}) value`,keys.map(k=>args[k]))).rows[0].value;await q('RELEASE SAVEPOINT api_call');return {data};}catch(e){lastError={code:e.code,message:e.message};await q('ROLLBACK TO SAVEPOINT api_call');await q('RELEASE SAVEPOINT api_call');return {error:lastError};}}};
  const app=express();app.use(express.json({limit:'20kb'}));server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
  const origin='http://127.0.0.1:'+server.address().port,clock=Number((await q('SELECT extract(epoch FROM now())::float8 seconds')).rows[0].seconds)*1000;
  const handler=createGuestCommerce({admin,secret:crypto.randomBytes(32).toString('hex'),origins:[origin],production:true,now:()=>clock});app.all('/:action',(req,res)=>handler(req,res,req.params.action));
  const send=async(action,data,cookie)=>{const response=await fetch(origin+'/'+action,{method:'POST',headers:{origin,'content-type':'application/json',...(cookie?{cookie}:{})},body:JSON.stringify(data)});return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')};};
  const a=(await send('session',{})).cookie.split(';')[0],b=(await send('session',{})).cookie.split(';')[0],petA=crypto.randomUUID(),petB=crypto.randomUUID();
  for(const [cookie,id,name] of [[a,petA,'Guest A'],[b,petB,'Guest B']]){const r=await send('pets',{requestId:id,contact:{name:name+' '+prefix,phone:'0950000001'},pet:{name,breedId:breed.id,weight:5}},cookie);assert.equal(r.status,200,JSON.stringify({response:r.data,error:lastError}));}
  const detailsFor=kind=>{const svc=services[kind],d={pet_id:petA,service_id:svc.id,scheduled_start_at:svc.start,addon_ids:[svc.addon],note:'Rollback guest booking probe'};
   if(kind==='pet_hotel')Object.assign(d,{room_id:room,check_out_at:new Date(Date.parse(svc.start)+25*3600000).toISOString(),care_notes:'Fixture care'});
   if(kind==='pet_taxi')Object.assign(d,{pickup_address:'Fixture pickup',dropoff_address:'Fixture dropoff',distance_km:16,trip_type:'round_trip',return_at:new Date(Date.parse(svc.start)+2*3600000).toISOString()});return d;};
  const saved=[],expected={grooming_spa:750,pet_hotel:650,pet_taxi:470};
  for(const kind of kinds){const details=detailsFor(kind);let r=await send('booking-quote',{details},a);assert.equal(r.status,200,JSON.stringify({kind,response:r.data,error:lastError}));const quote=r.data.quote;assert.equal(Number(quote.total),expected[kind]);assert.equal(quote.core,undefined);assert.equal(quote.context,undefined);pass(kind+' quote uses authoritative price, required addons and sanitized response');
   const requestId=crypto.randomUUID(),payload={requestId,expectedQuote:quote.version,details};r=await send('booking-create',payload,a);assert.equal(r.status,200,JSON.stringify({kind,response:r.data,error:lastError}));assert.equal(r.data.bookingId,requestId);saved.push(requestId);
   const booking=(await q('SELECT customer_id,pet_id,appointment_status,staff_id,scheduled_end_at FROM public.appointment WHERE id=$1',[requestId])).rows[0];assert.equal(booking.pet_id,petA);assert.equal(booking.appointment_status,'pending');assert.equal(booking.staff_id,null);assert.equal(booking.scheduled_end_at.toISOString(),new Date(quote.end_at).toISOString());assert.equal((await q('SELECT count(*)::int n FROM public.payment WHERE appointment_id=$1',[requestId])).rows[0].n,0);pass(kind+' create saves pending booking/items with correct pet and no false payment');
   r=await send('booking-create',payload,a);assert.equal(r.status,200);assert.equal(r.data.bookingId,requestId);assert.equal((await q('SELECT count(*)::int n FROM public.appointment_item WHERE appointment_id=$1',[requestId])).rows[0].n,2);pass(kind+' exact retry returns same booking without duplicate items');
   r=await send('booking-receipt',{requestId},a);assert.equal(r.status,200);assert.equal(Number(r.data.booking.total),expected[kind]);assert.equal(r.data.booking.status,'pending');pass(kind+' receipt returns server state scoped to creating session');
   r=await send('booking-receipt',{requestId},b);assert.equal(r.status,404);r=await send('booking-create',payload,b);assert.equal(r.status,404);pass(kind+' foreign session cannot read receipt or replay booking');
   r=await send('booking-create',{...payload,details:{...details,note:'Changed request'}},a);assert.equal(r.status,409);pass(kind+' changed payload under same request ID conflicts');
  }
  const taxi=(await q('SELECT trip_type,quoted_amount FROM public.taxi_trip WHERE appointment_id=$1',[saved[2]])).rows[0];assert.equal(taxi.trip_type,'round_trip');assert.equal(Number(taxi.quoted_amount),420);const hotel=(await q('SELECT room_id,daily_price FROM public.hotel_booking WHERE appointment_id=$1',[saved[1]])).rows[0];assert.equal(hotel.room_id,room);assert.equal(Number(hotel.daily_price),300);pass('Hotel reservation and round-trip taxi rows match quoted logistics');
  let r=await send('booking-quote',{details:{...detailsFor('grooming_spa'),pet_id:petB}},a);assert.equal(r.status,403);assert.equal(r.cookie,null);pass('Quote rejects foreign pet even with same self-declared phone');
  r=await send('booking-quote',{details:{...detailsFor('grooming_spa'),customer_id:crypto.randomUUID()}},a);assert.equal(r.status,400);pass('Client cannot provide arbitrary customer owner');
  r=await send('booking-quote',{details:{...detailsFor('grooming_spa'),addon_ids:[]}},a);assert.equal(r.status,400);pass('Missing required addon rejected');
  r=await send('booking-quote',{details:{...detailsFor('grooming_spa'),scheduled_start_at:services.grooming_spa.close}},a);assert.equal(r.status,409);pass('Operating-hour availability is rechecked by quote');
  r=await send('booking-quote',{details:{...detailsFor('grooming_spa'),scheduled_start_at:new Date(Date.parse(services.grooming_spa.close)-80*60000).toISOString()}},a);assert.equal(r.status,409);pass('Variant duration 90 plus addon 15 cannot fit into 80 minutes before closing, despite 60-minute service default');
  r=await send('booking-quote',{details:detailsFor('grooming_spa')},a);assert.equal(r.status,200);const staleQuote=r.data.quote;
  await q('UPDATE public.service_price_matrix SET unit_price=unit_price+1 WHERE service_id=$1',[services.grooming_spa.id]);
  const changedId=crypto.randomUUID();r=await send('booking-create',{requestId:changedId,expectedQuote:staleQuote.version,details:detailsFor('grooming_spa')},a);assert.equal(r.status,409);assert.equal((await q('SELECT count(*)::int n FROM public.appointment WHERE id=$1',[changedId])).rows[0].n,0);pass('Changed server price rejects stale quote without partial booking');
  r=await send('booking-quote',{details:detailsFor('pet_hotel')},b);assert.equal(r.status,403); // own pet is checked before logistics
  const hotelB={...detailsFor('pet_hotel'),pet_id:petB};r=await send('booking-quote',{details:hotelB},b);assert.equal(r.status,409);pass('Reserved room cannot be quoted again by another session');
  const secondPet=crypto.randomUUID();
  r=await send('pets',{requestId:secondPet,contact:{name:'Guest A '+prefix,phone:'0950000001'},pet:{name:'Guest A',breedId:breed.id,weight:5}},a);assert.equal(r.status,200,JSON.stringify(r.data));
  const secondDetails={...detailsFor('grooming_spa'),pet_id:secondPet,scheduled_start_at:services.pet_taxi.start};
  r=await send('booking-quote',{details:secondDetails},a);assert.equal(r.status,200,JSON.stringify(r.data));
  const secondBooking=crypto.randomUUID(),secondPayload={requestId:secondBooking,expectedQuote:r.data.quote.version,details:secondDetails};
  r=await send('booking-create',secondPayload,a);assert.equal(r.status,200,JSON.stringify({response:r.data,error:lastError}));saved.push(secondBooking);
  const owners=(await q('SELECT id,customer_id,pet_id FROM public.appointment WHERE id=ANY($1::uuid[]) ORDER BY id',[[saved[0],secondBooking]])).rows;
  assert.equal(owners.length,2);assert.equal(new Set(owners.map(v=>v.customer_id)).size,1);assert.equal(new Set(owners.map(v=>v.pet_id)).size,2);
  assert.equal(owners.find(v=>v.id===saved[0]).pet_id,petA);assert.equal(owners.find(v=>v.id===secondBooking).pet_id,secondPet);
  pass('Two same-name pets in one session receive separate bookings under the same customer without overwriting the first');
  r=await send('booking-create',secondPayload,a);assert.equal(r.status,200);assert.equal(r.data.bookingId,secondBooking);
  for(const id of [saved[0],secondBooking]){r=await send('booking-receipt',{requestId:id},a);assert.equal(r.status,200);r=await send('booking-receipt',{requestId:id},b);assert.equal(r.status,404);}
  await q('SET CONSTRAINTS ALL IMMEDIATE');pass('Both pet bookings preserve receipt isolation and exact retry, with deferred constraints checked');
  await send('end',{},a);r=await send('booking-receipt',{requestId:saved[0]},a);assert.equal(r.status,401);pass('Revoked session cannot access previously created booking');
  await q('RESET ROLE');for(const f of baseline.sources)assert.equal(hash((await q('SELECT pg_get_functiondef($1::regprocedure) value',[f.signature])).rows[0].value.replaceAll('\r\n','\n')),f.sha256);pass('Original member quote/availability definitions remain unchanged');
  await q('ROLLBACK');assert.equal((await q('SELECT count(*)::int n FROM public.appointment WHERE id=ANY($1::uuid[])',[saved])).rows[0].n,0);for(const signature of signatures){const value=(await q('SELECT to_regprocedure($1)::text value',[signature])).rows[0].value;if(installed)assert.ok(value);else assert.equal(value,null);}pass('All fixture bookings/logistics/audit rolled back; installed RPCs preserved');
  fs.writeFileSync('docs/verification/sync/'+(installed?'guest-booking-installed-rollback.txt':'guest-booking-rollback.txt'),JSON.stringify({timestamp:new Date().toISOString(),status:'PASS',installed,migrationSha256:hash(source),handlerSha256:hash(fs.readFileSync('scripts/api/guest_commerce.js','utf8')),queries,checks,scope:'Actual loopback HTTP -> real Cloud SQL service_role RPC/rate limit in rollback transaction; synthetic services/rooms/prices/guest profiles only; no real customer/config mutations, no commit/Realtime/UI, no full-slot/two-writer concurrency or member Auth quote parity acceptance'},null,2)+'\n');
  console.log('PASS',checks.length,'booking checks;',queries,'SQL; all fixtures and DDL rolled back.');
 }catch(e){await db.query('RESET ROLE').catch(()=>{});await db.query('ROLLBACK').catch(()=>{});throw e;}
 finally{if(server)await new Promise(resolve=>server.close(resolve));await db.end();}
})().catch(e=>{console.error(e.code||e.name,e.message);process.exitCode=1;});
