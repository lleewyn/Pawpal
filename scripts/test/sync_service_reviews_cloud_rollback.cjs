// Single booking fixture; synthetic service/actors; always rollback. Not HTTP/UI E2E.
const assert=require('node:assert/strict'),{randomUUID}=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {connect}=require('../database/v1/service_import_connection.cjs');
if(!process.argv.includes('--cloud')){console.log('Use --cloud for bounded service review RPC checks; otherwise no network.');process.exit(0);}
(async()=>{const db=await connect();let queries=0;
 const report={environment:'Supabase Cloud cpzuvaplseielhgcnqrn',timestamp:new Date().toISOString(),scope:'Single Spa booking; RPC/RLS only; synthetic actors; rollback; no Logs',checks:[]};
 const q=async(sql,args)=>{queries++;return db.query(sql,args);};
 const actor=async(id,role='authenticated')=>{await q('RESET ROLE');await q("SELECT set_config('request.jwt.claim.sub',$1,true),set_config('request.jwt.claim.role',$2,true)",[id,role]);await q(role==='anon'?'SET LOCAL ROLE anon':'SET LOCAL ROLE authenticated');};
 const denied=async(fn,codes)=>{await q('SAVEPOINT expected_denial');let error;try{await fn();}catch(e){error=e;}await q('ROLLBACK TO SAVEPOINT expected_denial');await q('RELEASE SAVEPOINT expected_denial');assert.ok(error,'Expected denial');assert.ok(codes.includes(error.code),'Unexpected SQLSTATE '+error.code);};
 const pass=name=>report.checks.push({name,status:'PASS'});
 const read=async id=>(await q('SELECT id,customer_id,pet_id,appointment_status,scheduled_start_at::text,updated_at::text,change_count FROM public.appointment WHERE id=$1',[id])).rows[0];
 try{
  await q("BEGIN;SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='3s'");
  const a=randomUUID(),b=randomUUID(),sa=randomUUID(),staff=randomUUID(),ca=randomUUID(),cb=randomUUID(),pet=randomUUID(),svc=randomUUID(),booking=randomUUID();
  report.fixtureIds={customerA:ca,customerB:cb,pet,service:svc,booking};
  const breed=(await q('SELECT b.id,b.species_id FROM public.pet_breed b JOIN public.pet_species s ON s.id=b.species_id WHERE b.is_active AND s.is_active ORDER BY b.id LIMIT 1')).rows[0];
  const cat=(await q("SELECT id FROM public.service_category WHERE category_code='grooming_spa'")).rows[0]?.id;
  const level=(await q('SELECT id FROM public.staff_level WHERE is_active ORDER BY rank_order DESC LIMIT 1')).rows[0]?.id;
  assert.ok(breed&&cat&&level,'Active breed/category/level required');
  const time=(await q("WITH d AS(SELECT (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date+30 AS booking_day), c AS(SELECT booking_day,setting_value::jsonb->'operatingHours'->CASE WHEN extract(isodow FROM booking_day) IN(6,7) THEN 'weekend' ELSE 'weekday' END hours FROM d CROSS JOIN public.pawpal_setting WHERE setting_key='system_config') SELECT ((booking_day+(hours->>'open')::time+interval '1 hour') AT TIME ZONE 'Asia/Ho_Chi_Minh')::text starts FROM c")).rows[0];
  assert.ok(time?.starts,'Configured operating hours required');
  await q('INSERT INTO auth.users(id) VALUES($1),($2),($3)',[a,b,sa]);
  await q('INSERT INTO public.customer(id,auth_user_id,customer_code) VALUES($1,$2,$3),($4,$5,$6)',[ca,a,'E2E-BKG-A-'+ca,cb,b,'E2E-BKG-B-'+cb]);
  await q("INSERT INTO public.customer_profile(customer_id,full_name) VALUES($1,'E2E Booking A'),($2,'E2E Booking B') ON CONFLICT(customer_id) DO UPDATE SET full_name=excluded.full_name",[ca,cb]);
  await q("INSERT INTO public.staff(id,auth_user_id,full_name,job_title,staff_level_id,employment_status,must_change_password) VALUES($1,$2,'E2E Booking Admin','QA',$3,'active',false)",[staff,sa,level]);
  await q("INSERT INTO public.staff_role(staff_id,role_code) VALUES($1,'ADMIN')",[staff]);
  await q("INSERT INTO public.staff_schedule(staff_id,start_at,end_at) VALUES($1,$2::timestamptz-interval '1 hour',$2::timestamptz+interval '3 days')",[staff,time.starts]);
  await q("INSERT INTO public.pet_profile(id,customer_id,pet_code,pet_name,breed_id,gender) VALUES($1,$2,$3,'E2E Booking Pet',$4,'nam')",[pet,ca,'E2E-'+pet,breed.id]);
  await q('INSERT INTO public.pet_weight_history(pet_id,weight) VALUES($1,5)',[pet]);
  await q("INSERT INTO public.service(id,service_code,service_name,estimated_duration,category_id,status,staff_level_required_id) VALUES($1,$2,'E2E Booking Service',30,$3,'active',$4)",[svc,'E2E-'+svc,cat,level]);
  await q('INSERT INTO public.service_supported_species(service_id,species_id) VALUES($1,$2)',[svc,breed.species_id]);
  await q("INSERT INTO public.service_price_matrix(service_id,weight_from,weight_to,unit_price,effective_from,status) VALUES($1,0,NULL,50000,now()-interval '1 day','active')",[svc]);
  const details={pet_id:pet,service_id:svc,scheduled_start_at:time.starts,addon_ids:[],preferred_staff_id:staff,note:'E2E rollback only'};
  await actor(a);const quote=(await q('SELECT public.quote_own_service_booking($1::jsonb) value',[JSON.stringify(details)])).rows[0].value;
  await q('SELECT public.create_own_service_booking($1,$2,$3::jsonb)',[booking,quote.version,JSON.stringify(details)]);
  const item=(await q('SELECT id FROM public.appointment_item WHERE appointment_id=$1 AND is_primary',[booking])).rows[0].id,review=randomUUID();
  const payload=[{id:review,line_id:item,rating:5,content:'E2E service review'}];
  const submit=async value=>(await q('SELECT public.submit_own_service_reviews($1,$2::jsonb) value',[booking,JSON.stringify(value)])).rows[0].value;
  const own=async()=>(await q('SELECT public.own_service_reviews($1) value',[booking])).rows[0].value;
  const published=async()=>(await q('SELECT public.public_service_reviews($1) value',[svc])).rows[0].value;
  await denied(()=>submit(payload),['22023']);pass('Pending service cannot receive a review');
  // Fixture setup only: this is not an acceptance test of service execution UI.
  await q('RESET ROLE');await q("UPDATE public.appointment SET appointment_status='completed' WHERE id=$1",[booking]);await q("UPDATE public.appointment_item SET status='completed' WHERE appointment_id=$1",[booking]);
  await actor(a);await denied(()=>submit([{...payload[0],rating:6}]),['22023']);for(let i=0;i<2;i++)assert.deepEqual(await submit(payload),[review]);
  let rows=await own();assert.equal(rows.length,1);assert.equal(rows[0].review_status,'pending');await denied(()=>submit([{...payload[0],content:'E2E changed replay'}]),['PT409']);pass('Review retry creates one pending review; invalid rating and changed replay rejected');
  await actor('','anon');assert.equal((await published()).length,0);await denied(()=>own(),['42501']);pass('Guest sees no pending review and cannot read owner review projection');
  await actor(b);await denied(()=>own(),['42501']);await denied(()=>submit(payload),['42501']);pass('B cannot read or submit review for A service');
  await actor(sa);const dbReview=(await q('SELECT id,review_status,review_content FROM public.review WHERE id=$1',[review])).rows[0];assert.equal(dbReview.review_status,'pending');assert.equal(dbReview.review_content,payload[0].content);
  const reply=(await q("SELECT public.reply_admin_service_review($1,NULL,NULL,'E2E Shop response') value",[review])).rows[0].value;assert.ok(reply);pass('Admin reads exact review and stores shop response through reviewed RPC');
  await actor(a);rows=await own();assert.equal(rows[0].shop_reply,'E2E Shop response');
  await denied(()=>q("SELECT public.reply_admin_service_review($1,NULL,NULL,'E2E unauthorized')",[review]),['42501']);pass('User sees shop response but cannot invoke Admin reply');
  await actor(sa);await denied(()=>q("SELECT public.reply_admin_service_review($1,NULL,NULL,'E2E stale reply')",[review]),['PT409']);pass('Stale Admin reply snapshot cannot overwrite existing response');
  // Publication/hidden states prepared as fixtures; not a moderation UI claim.
  await q('RESET ROLE');await q("UPDATE public.review SET review_status='published' WHERE id=$1",[review]);await actor('','anon');rows=await published();assert.equal(rows.length,1);assert.equal(rows[0].id,review);assert.equal(rows[0].shop_reply,'E2E Shop response');pass('Published fixture appears publicly with correct review and shop response');
  await q('RESET ROLE');await q("UPDATE public.review SET review_status='hidden' WHERE id=$1",[review]);await actor('','anon');assert.equal((await published()).length,0);pass('Hidden fixture disappears from public service reviews');
  await q('RESET ROLE');await q('ROLLBACK');const remains=(await q('SELECT EXISTS(SELECT 1 FROM public.appointment WHERE id=$1) OR EXISTS(SELECT 1 FROM public.review WHERE id=$2) OR EXISTS(SELECT 1 FROM public.review_response WHERE id=$3) OR EXISTS(SELECT 1 FROM public.customer WHERE id=ANY($4::uuid[])) OR EXISTS(SELECT 1 FROM auth.users WHERE id=ANY($5::uuid[])) OR EXISTS(SELECT 1 FROM public.service WHERE id=$6) OR EXISTS(SELECT 1 FROM public.pet_profile WHERE id=$7) OR EXISTS(SELECT 1 FROM public.staff WHERE id=$8) remains',[booking,review,reply,[ca,cb],[a,b,sa],svc,pet,staff])).rows[0].remains;assert.equal(remains,false);pass('Rollback removes review/reply and all synthetic service/booking/actor fixtures');
  report.scope='One synthetic completed booking/review/reply; RPC/RLS and publication read projection only; rollback; no Logs';report.status='PASS';report.queries=queries;
  fs.writeFileSync('docs/verification/sync/service-reviews-cloud-rollback.txt',JSON.stringify(report,null,2)+'\n');console.log('PASS',report.checks.length,'service review checks;',queries,'SQL statements; rollback verified. Not moderation UI E2E.');
 }catch(e){await db.query('ROLLBACK').catch(()=>{});console.error('Review check failed after',report.checks.length,'checks:',e.code||'',e.message);process.exitCode=1;}finally{await db.end();}
})().catch(e=>{console.error(e.code||'connection_failed');process.exitCode=1;});
