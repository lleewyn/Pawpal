const fs=require('node:fs'),{connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='25s';SET LOCAL lock_timeout='4s'");
 await db.query(fs.readFileSync(require.resolve('../../my-server/scripts/database/v1/271_customer_booking_move_slots.sql'),'utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,''));
 await db.query('SAVEPOINT fixtures');
 const source=fs.readFileSync(require.resolve('./customer_booking_availability.cjs'),'utf8');
 const fixture=source.split('const query=`')[1].split(' -- No shifts:')[0].replace(/^BEGIN;/,'')
 .replace('employment_status,auth_user_id)', 'employment_status,auth_user_id,phone_number)')
 .replace("level_id,'active',worker_auth)","level_id,'active',worker_auth,'099'||lpad(floor(random()*10000000)::text,7,'0'))");
 await db.query(fixture+`
 DECLARE upgrade uuid:=gen_random_uuid();hotel uuid:=gen_random_uuid();hotel_cat uuid;h uuid:=gen_random_uuid();slots jsonb;chosen jsonb;next_quote jsonb;other public.appointment;original_revision timestamptz;replacement uuid:=gen_random_uuid();replacement_auth uuid:=gen_random_uuid();BEGIN
 UPDATE public.staff_schedule SET end_at=starts+interval '9 hours' WHERE staff_id=worker;
 INSERT INTO public.service(id,service_code,service_name,estimated_duration,category_id,status,staff_level_required_id) VALUES(upgrade,'TEST-'||upgrade,'Move upgraded spa',90,cat,'active',level_id);
 INSERT INTO public.service_supported_species(service_id,species_id) VALUES(upgrade,species);
 INSERT INTO public.service_price_matrix(service_id,weight_from,weight_to,unit_price,effective_from,status) VALUES(upgrade,0,NULL,170000,now()-interval '1 day','active');
 SELECT id INTO hotel_cat FROM public.service_category WHERE category_code='pet_hotel';
 INSERT INTO public.service(id,service_code,service_name,estimated_duration,category_id,status) VALUES(hotel,'TEST-'||hotel,'Move other category',60,hotel_cat,'active');
 PERFORM public.hold_own_service_booking(h,payload);payload:=payload||jsonb_build_object('hold_id',h);q:=public.quote_own_service_booking(payload);PERFORM public.create_own_service_booking(aid,q->>'version',payload);
 -- Reproduce the real booking: Vietnamese confirmed status, unassigned legacy preference.
 UPDATE public.appointment SET appointment_status='da_xac_nhan',staff_id=NULL,requested_staff_id=worker,staff_confirmation_status='pending' WHERE id=aid;
 SELECT updated_at INTO original_revision FROM public.appointment WHERE id=aid;
 result:=public.own_booking_move_services(aid);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result->'services') s WHERE s->>'id'=upgrade::text) OR EXISTS(SELECT 1 FROM jsonb_array_elements(result->'services') s WHERE s->>'id'=hotel::text) THEN RAISE EXCEPTION 'move service filtering failed';END IF;
 BEGIN PERFORM public.quote_own_booking_service(aid,starts+interval '30 minutes',NULL,hotel);RAISE EXCEPTION 'cross-category move accepted';EXCEPTION WHEN OTHERS THEN IF SQLERRM<>'service_change_not_supported' THEN RAISE;END IF;END;
 -- Reject arbitrary foreign appointment IDs without disclosing their slot data.
 BEGIN
  PERFORM set_config('request.jwt.claim.sub',worker_auth::text,true);
  BEGIN PERFORM public.own_booking_move_day_slots(aid,(starts AT TIME ZONE 'Asia/Bangkok')::date,upgrade);RAISE EXCEPTION 'foreign slot read accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);
 -- A legacy preference with no eligible original worker can quote a concrete
 -- replacement. The user must commit the exact server quote, never a raw edit.
 BEGIN
  INSERT INTO auth.users(id) VALUES(replacement_auth);
  INSERT INTO public.staff(id,full_name,job_title,staff_level_id,employment_status,auth_user_id,phone_number) VALUES(replacement,'Move replacement','Care',level_id,'active',replacement_auth,'099'||lpad(floor(random()*10000000)::text,7,'0'));
  INSERT INTO public.staff_schedule(staff_id,start_at,end_at) VALUES(replacement,starts,starts+interval '9 hours');
  UPDATE public.staff SET service_locked=true WHERE id=worker;
  q:=public.quote_own_booking_service(aid,starts,NULL,upgrade);
  IF q->>'staff_id'<>replacement::text THEN RAISE EXCEPTION 'available replacement not quoted';END IF;
  BEGIN
   UPDATE public.appointment SET staff_id=replacement,requested_staff_id=NULL,appointment_status='pending',change_count=1 WHERE id=aid;
   RAISE EXCEPTION 'unauthorized raw staff replacement accepted';
  EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'requested_staff_customer_consent_required' THEN RAISE;END IF;END;
  BEGIN
   EXECUTE 'SET LOCAL ROLE authenticated';
   INSERT INTO public.audit_log(action,entity_name,entity_id,description) VALUES('CUSTOMER_RESCHEDULE_APPOINTMENT','appointment',aid,jsonb_build_object('quote',q,'transaction_id',txid_current()::text)::text);
   EXECUTE 'RESET ROLE';RAISE EXCEPTION 'customer forged protected audit';
  EXCEPTION WHEN insufficient_privilege THEN EXECUTE 'RESET ROLE';END;
  PERFORM public.reschedule_own_booking_service(gen_random_uuid(),aid,starts,q->>'version','Confirm available replacement',NULL,upgrade);
  IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND staff_id=replacement AND requested_staff_id IS NULL AND change_count=1) THEN RAISE EXCEPTION 'quoted replacement not committed';END IF;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 -- A competing booking removes only overlapping candidate hours.
 SELECT * INTO other FROM public.appointment WHERE id=aid;other.id:=gen_random_uuid();other.appointment_code:='TEST-'||other.id;other.requested_staff_id:=NULL;other.staff_confirmation_status:='not_required';other.staff_id:=worker;other.appointment_status:='confirmed';other.scheduled_start_at:=starts+interval '3 hours';other.scheduled_end_at:=starts+interval '4 hours';INSERT INTO public.appointment SELECT (other).*;
 -- A cancelled row with a legacy status must not block otherwise valid hours.
 BEGIN
  other.id:=gen_random_uuid();other.appointment_code:='TEST-'||other.id;other.appointment_status:='da_huy';other.scheduled_start_at:=starts;other.scheduled_end_at:=starts+interval '90 minutes';INSERT INTO public.appointment SELECT (other).*;
  q:=public.quote_own_booking_service(aid,starts,NULL,upgrade);
  IF q->>'version' IS NULL THEN RAISE EXCEPTION 'cancelled legacy row blocked quote';END IF;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 other.appointment_status:='confirmed';other.scheduled_start_at:=starts+interval '3 hours';other.scheduled_end_at:=starts+interval '4 hours';
 slots:=public.own_booking_move_day_slots(aid,(starts AT TIME ZONE 'Asia/Bangkok')::date,upgrade);
 IF jsonb_array_length(slots->'slots')=0 THEN RAISE EXCEPTION 'valid alias status has no slots';END IF;
 IF (slots->>'previous_total')::numeric<>100000 THEN RAISE EXCEPTION 'old total incorrect';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(slots->'slots') s WHERE (s->>'start_at')::timestamptz<starts OR (s->>'end_at')::timestamptz>starts+interval '9 hours' OR ((s->>'start_at')::timestamptz<other.scheduled_end_at AND (s->>'end_at')::timestamptz>other.scheduled_start_at)) THEN RAISE EXCEPTION 'unavailable hours offered';END IF;
 SELECT s INTO chosen FROM jsonb_array_elements(slots->'slots') s WHERE (s->>'start_at')::timestamptz=starts;
 IF chosen IS NULL OR (chosen->>'total')::numeric<>170000 OR (chosen->>'end_at')::timestamptz<>starts+interval '90 minutes' OR chosen->>'staff_id'<>worker::text THEN RAISE EXCEPTION 'same-category price/duration quote incorrect';END IF;
 result:=public.own_booking_move_day_slots(aid,(starts AT TIME ZONE 'Asia/Bangkok')::date+1,upgrade);
 IF jsonb_array_length(result->'slots')<>0 THEN RAISE EXCEPTION 'unrostered day offered';END IF;
 -- Slot discovery is read-only and cannot consume a move allowance.
 IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND updated_at=original_revision AND change_count=0 AND appointment_status='da_xac_nhan') THEN RAISE EXCEPTION 'listing changed booking';END IF;
 -- A staff collision created after discovery is checked again before saving.
 BEGIN
  other.id:=gen_random_uuid();other.appointment_code:='TEST-'||other.id;other.scheduled_start_at:=starts;other.scheduled_end_at:=starts+interval '90 minutes';INSERT INTO public.appointment SELECT (other).*;
  BEGIN PERFORM public.reschedule_own_booking_service(gen_random_uuid(),aid,starts,chosen->>'version','Collision test',NULL,upgrade);RAISE EXCEPTION 'stale slot accepted';EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM NOT IN('no_scheduled_staff','staff_schedule_conflict') THEN RAISE;END IF;END;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 PERFORM public.reschedule_own_booking_service(gen_random_uuid(),aid,starts,chosen->>'version','Change spa package',NULL,upgrade);
 IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND change_count=1 AND staff_id=worker AND appointment_status='pending' AND scheduled_end_at=starts+interval '90 minutes') THEN RAISE EXCEPTION 'first move failed';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.appointment_item WHERE appointment_id=aid AND is_primary AND service_id=upgrade AND unit_price=170000 AND duration_minutes=90) THEN RAISE EXCEPTION 'new package not saved';END IF;
 -- The pending state after the first move still allows the second move.
 slots:=public.own_booking_move_day_slots(aid,(starts AT TIME ZONE 'Asia/Bangkok')::date,upgrade);
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(slots->'slots') s WHERE (s->>'start_at')::timestamptz=starts) THEN RAISE EXCEPTION 'unchanged time offered';END IF;
 SELECT s INTO next_quote FROM jsonb_array_elements(slots->'slots') s WHERE (s->>'start_at')::timestamptz=starts+interval '30 minutes';
 IF next_quote IS NULL THEN RAISE EXCEPTION 'second move slot missing';END IF;
 PERFORM public.reschedule_own_booking_service(gen_random_uuid(),aid,(next_quote->>'start_at')::timestamptz,next_quote->>'version','Second move',NULL,upgrade);
 BEGIN PERFORM public.own_booking_move_day_slots(aid,(starts AT TIME ZONE 'Asia/Bangkok')::date,upgrade);RAISE EXCEPTION 'third move offered';EXCEPTION WHEN SQLSTATE '22023' THEN IF SQLERRM<>'booking_move_limit_reached' THEN RAISE;END IF;END;
 IF (SELECT change_count FROM public.appointment WHERE id=aid)<>2 THEN RAISE EXCEPTION 'move count incorrect';END IF;
 IF has_function_privilege('anon','public.own_booking_move_day_slots(uuid,date,uuid)','EXECUTE') THEN RAISE EXCEPTION 'unsafe slots grant';END IF;
 END;END $$;`);
 await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query('ROLLBACK TO SAVEPOINT fixtures');await db.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');
 console.log('PASS move day slots: legacy status, Spa package/price/duration, available replacement, raw edit/audit forgery denial, shifts/collisions, empty day, read-only lookup, stale slot rejection, save and two-move limit. Fixtures rolled back. '+(process.argv.includes('--apply')?'Migration applied.':'Migration rolled back.'));
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}})().catch(error=>{console.error(error.message,error.where||'');process.exitCode=1;});
