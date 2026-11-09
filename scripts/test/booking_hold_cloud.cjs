const {connect}=require('../database/v1/service_import_connection.cjs');
const fs=require('node:fs'),assert=require('node:assert/strict');
(async()=>{const db=await connect();try{
 if(process.argv.includes('--inspect')){
  const r=await db.query("SELECT pg_get_functiondef('public.create_own_service_booking(uuid,text,jsonb)'::regprocedure) body");console.log(r.rows[0].body);return;
 }
 await db.query('BEGIN');
 const migration=fs.readFileSync(require.resolve('../database/v1/209_member_booking_hold.sql'),'utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,'');
 await db.query(migration);
 await db.query('SAVEPOINT fixtures');
 const source=fs.readFileSync(require.resolve('./customer_booking_availability.cjs'),'utf8');
 const fixture=source.split('const query=`')[1].split(' -- No shifts:')[0].replace(/^BEGIN;/,'')
 .replace('employment_status,auth_user_id)', 'employment_status,auth_user_id,phone_number)')
 .replace("level_id,'active',worker_auth)","level_id,'active',worker_auth,'099'||lpad(floor(random()*10000000)::text,7,'0'))");
 await db.query(fixture+`
 DECLARE h jsonb; expiry timestamptz; uid2 uuid:=gen_random_uuid(); cid2 uuid:=gen_random_uuid(); pid2 uuid:=gen_random_uuid(); hold_id uuid:=gen_random_uuid();
 BEGIN
 h:=public.hold_own_service_booking(hold_id,payload);
 expiry:=(h->>'expires_at')::timestamptz;
 IF expiry<clock_timestamp()+interval '14 minutes 59 seconds' OR expiry>clock_timestamp()+interval '15 minutes 1 second' THEN RAISE EXCEPTION 'invalid lease'; END IF;
 h:=public.hold_own_service_booking(hold_id,payload);
 IF (h->>'expires_at')::timestamptz<>expiry THEN RAISE EXCEPTION 'lease extended'; END IF;
 INSERT INTO auth.users(id) VALUES(uid2);
 INSERT INTO public.customer(id,auth_user_id,customer_code,customer_status) VALUES(cid2,uid2,'TEST-'||cid2,'active');
 INSERT INTO public.pet_profile(id,customer_id,pet_code,pet_name,breed_id) VALUES(pid2,cid2,'TEST-'||pid2,'Hold verification',breed);
 INSERT INTO public.pet_weight_history(pet_id,weight) VALUES(pid2,5);
 PERFORM set_config('request.jwt.claim.sub',uid2::text,true);
 result:=public.own_booking_availability(payload||jsonb_build_object('pet_id',pid2));
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result->'staff') s WHERE s->>'id'=worker::text) THEN RAISE EXCEPTION 'held staff exposed to another member'; END IF;
 BEGIN
  PERFORM public.hold_own_service_booking(gen_random_uuid(),payload||jsonb_build_object('pet_id',pid2));
  RAISE EXCEPTION 'double hold allowed';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL; END;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 UPDATE pawpal_private.member_booking_hold SET expires_at=clock_timestamp()-interval '1 second' WHERE customer_id=cid;
 payload:=payload||jsonb_build_object('hold_id',hold_id);
 q:=public.quote_own_service_booking(payload);
 BEGIN
  PERFORM public.create_own_service_booking(aid,q->>'version',payload);
  RAISE EXCEPTION 'expired hold accepted';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'booking_hold_expired' THEN RAISE; END IF; END;
 h:=public.hold_own_service_booking(hold_id,payload-'hold_id');
 q:=public.quote_own_service_booking(payload);
 PERFORM public.create_own_service_booking(aid,q->>'version',payload);
 IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND pet_id=pid AND staff_id=worker AND appointment_status='confirmed') THEN RAISE EXCEPTION 'confirmed appointment mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold WHERE customer_id=cid) THEN RAISE EXCEPTION 'hold not consumed'; END IF;
 PERFORM public.create_own_service_booking(aid,q->>'version',payload);
 IF (SELECT count(*) FROM public.appointment WHERE id=aid)<>1 THEN RAISE EXCEPTION 'duplicate appointment'; END IF;
 PERFORM set_config('request.jwt.claim.sub',uid2::text,true);
 result:=public.own_booking_availability(payload||jsonb_build_object('pet_id',pid2));
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result->'staff') s WHERE s->>'id'=worker::text) THEN RAISE EXCEPTION 'booked staff exposed'; END IF;
 END;
 END $$;`);
 await db.query('SET CONSTRAINTS ALL IMMEDIATE');
 await db.query('ROLLBACK TO SAVEPOINT fixtures');
 await db.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');
 console.log('PASS 15-minute lease, no extension, cross-member staff conflict, expiry rejection, confirmed staff/pet, idempotency and consumed hold. Fixtures rolled back. '+(process.argv.includes('--apply')?'Migration applied.':'Migration rolled back.'));
}catch(error){await db.query('ROLLBACK');throw error;
}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1;});
