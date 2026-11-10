const fs=require('node:fs'),{connect}=require('../database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 if(process.argv.includes('--inspect')){
  console.log((await db.query("SELECT name,default_version,installed_version FROM pg_available_extensions WHERE name='pg_cron'")).rows);return;
 }
 await db.query("BEGIN;SET LOCAL statement_timeout='25s';SET LOCAL lock_timeout='4s'");
 await db.query(fs.readFileSync(require.resolve('../database/v1/215_booking_hold_expiry.sql'),'utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,''));
 await db.query('SAVEPOINT fixtures');
 const source=fs.readFileSync(require.resolve('./customer_booking_availability.cjs'),'utf8');
 const fixture=source.split('const query=`')[1].split(' -- No shifts:')[0].replace(/^BEGIN;/,'')
 .replace('employment_status,auth_user_id)', 'employment_status,auth_user_id,phone_number)')
 .replace("level_id,'active',worker_auth)","level_id,'active',worker_auth,'099'||lpad(floor(random()*10000000)::text,7,'0'))");
 await db.query(fixture+`
 DECLARE held uuid:=gen_random_uuid();other_uid uuid:=gen_random_uuid();other_customer uuid:=gen_random_uuid();other_pet uuid:=gen_random_uuid();response jsonb;original_expiry timestamptz;admin_uid uuid;
 BEGIN
 response:=public.hold_own_service_booking(held,payload);original_expiry:=(response->>'expires_at')::timestamptz;
 IF original_expiry<clock_timestamp()+interval '14 minutes 59 seconds' THEN RAISE EXCEPTION 'hold duration is not fifteen minutes';END IF;
 BEGIN
  PERFORM public.admin_active_booking_holds(starts,starts+interval '1 day');RAISE EXCEPTION 'customer may read Admin holds';
 EXCEPTION WHEN insufficient_privilege THEN NULL;END;
 SELECT st.auth_user_id INTO admin_uid FROM public.staff st JOIN public.staff_role role ON role.staff_id=st.id WHERE role.role_code='ADMIN' AND st.auth_user_id IS NOT NULL LIMIT 1;
 IF admin_uid IS NULL THEN RAISE EXCEPTION 'missing admin fixture';END IF;
 PERFORM set_config('request.jwt.claim.sub',admin_uid::text,true);
 response:=public.admin_active_booking_holds(starts,starts+interval '1 day');
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(response->'holds') h WHERE h->>'id'=held::text AND NOT h?'customer_id' AND NOT h?'details') THEN RAISE EXCEPTION 'active hold missing from safe Admin projection';END IF;
 INSERT INTO auth.users(id) VALUES(other_uid);
 INSERT INTO public.customer(id,auth_user_id,customer_code,customer_status) VALUES(other_customer,other_uid,'QA-'||other_customer,'active');
 INSERT INTO public.pet_profile(id,customer_id,pet_code,pet_name,breed_id) VALUES(other_pet,other_customer,'QA-'||other_pet,'QA expiry pet',breed);
 INSERT INTO public.pet_weight_history(pet_id,weight) VALUES(other_pet,5);
 PERFORM set_config('request.jwt.claim.sub',other_uid::text,true);
 result:=public.own_booking_availability(payload||jsonb_build_object('pet_id',other_pet));
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(result->'staff') s WHERE s->>'id'=worker::text) THEN RAISE EXCEPTION 'active hold leaked as free';END IF;
 PERFORM pawpal_private.expire_booking_holds();
 IF NOT EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold WHERE id=held AND expires_at=original_expiry) THEN RAISE EXCEPTION 'cleanup deleted or extended a live lease';END IF;
 UPDATE pawpal_private.member_booking_hold SET expires_at=clock_timestamp()-interval '1 second' WHERE id=held;
 result:=public.own_booking_availability(payload||jsonb_build_object('pet_id',other_pet));
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result->'staff') s WHERE s->>'id'=worker::text) THEN RAISE EXCEPTION 'expired lease still blocks availability before cleanup';END IF;
 PERFORM set_config('request.jwt.claim.sub',admin_uid::text,true);
 response:=public.admin_active_booking_holds(starts,starts+interval '1 day');
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(response->'holds') h WHERE h->>'id'=held::text) THEN RAISE EXCEPTION 'Admin still sees expired hold';END IF;
 PERFORM set_config('request.jwt.claim.sub',other_uid::text,true);
 PERFORM pawpal_private.expire_booking_holds();
 IF EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold WHERE id=held) THEN RAISE EXCEPTION 'expired row was not deleted';END IF;
 PERFORM public.hold_own_service_booking(gen_random_uuid(),payload||jsonb_build_object('pet_id',other_pet));
 IF NOT EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold WHERE customer_id=other_customer) THEN RAISE EXCEPTION 'another customer cannot acquire released slot';END IF;
 END;END $$;`);
 await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query('ROLLBACK TO SAVEPOINT fixtures');
 const cron=await db.query("SELECT schedule,active FROM cron.job WHERE jobname='pawpal-expire-booking-holds'");
 if(cron.rows.length!==1||!cron.rows[0].active)throw Error('expiry cron is not active');
 const privileges=await db.query("SELECT has_function_privilege('authenticated','pawpal_private.expire_booking_holds()','EXECUTE') allowed");
 if(privileges.rows[0].allowed)throw Error('customer may execute global cleanup');
 await db.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');
 console.log('PASS fifteen-minute lease, live lease retained, immediate logical expiry, physical cleanup, slot acquired by another customer, active cron. Fixtures rolled back. '+(process.argv.includes('--apply')?'Migration applied.':'Migration rolled back.'));
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message,e.where||'');process.exitCode=1;});
