const fs=require('node:fs'),{connect}=require('../../my-server/scripts/database/v1/service_import_connection.cjs');
(async()=>{const db=await connect();try{
 await db.query("BEGIN;SET LOCAL statement_timeout='25s';SET LOCAL lock_timeout='4s'");
 await db.query(fs.readFileSync(require.resolve('../../my-server/scripts/database/v1/270_booking_scheduled_staff_only.sql'),'utf8').replace(/^BEGIN;$/m,'').replace(/^COMMIT;$/m,''));
 await db.query('SAVEPOINT fixtures');
 const source=fs.readFileSync(require.resolve('./customer_booking_availability.cjs'),'utf8');
 const fixture=source.split('const query=`')[1].split(' -- No shifts:')[0].replace(/^BEGIN;/,'')
 .replace('employment_status,auth_user_id)', 'employment_status,auth_user_id,phone_number)')
 .replace("level_id,'active',worker_auth)","level_id,'active',worker_auth,'099'||lpad(floor(random()*10000000)::text,7,'0'))");
 await db.query(fixture+`
 DECLARE h uuid:=gen_random_uuid();recurring uuid:=gen_random_uuid();admin_uid uuid;legacy public.appointment;line public.appointment_item;legacy_id uuid:=gen_random_uuid();legacy_worker uuid:=gen_random_uuid();legacy_auth uuid:=gen_random_uuid();revision timestamptz;token text:=repeat(replace(gen_random_uuid()::text,'-',''),2);guest_pet uuid:=gen_random_uuid();guest_id uuid:=gen_random_uuid();BEGIN
 DELETE FROM public.staff_schedule WHERE staff_id=worker;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(pawpal_private.booking_staff_choices(cid,payload)) v WHERE v->>'id'=worker::text) THEN RAISE EXCEPTION 'unrostered worker offered';END IF;
 INSERT INTO public.staff_recurring_schedule(id,staff_id,weekdays,start_time,end_time,valid_from) VALUES(recurring,worker,ARRAY[extract(isodow FROM starts AT TIME ZONE 'Asia/Bangkok')::integer],'08:00','18:00',(starts AT TIME ZONE 'Asia/Bangkok')::date);
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(pawpal_private.booking_staff_choices(cid,payload)) v WHERE v->>'id'=worker::text) THEN RAISE EXCEPTION 'recurring-only worker offered';END IF;
 BEGIN PERFORM public.hold_own_service_booking(h,payload);RAISE EXCEPTION 'unrostered hold accepted';EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM NOT IN('preferred_staff_unavailable','no_scheduled_staff') THEN RAISE;END IF;END;
 INSERT INTO public.staff_schedule(staff_id,start_at,end_at) VALUES(worker,starts,starts+interval '30 minutes');
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(pawpal_private.booking_staff_choices(cid,payload)) v WHERE v->>'id'=worker::text) THEN RAISE EXCEPTION 'partial shift offered';END IF;
 DELETE FROM public.staff_schedule WHERE staff_id=worker;
 INSERT INTO public.staff_schedule(staff_id,start_at,end_at) VALUES(worker,starts,starts+interval '3 hours');
 SELECT v INTO result FROM jsonb_array_elements(pawpal_private.booking_staff_choices(cid,payload)) v WHERE v->>'id'=worker::text;
 IF result->>'source'<>'scheduled' OR (result->>'requires_confirmation')::boolean THEN RAISE EXCEPTION 'scheduled choice invalid';END IF;
 -- Skipping the hold cannot create another pending online request.
 q:=public.quote_own_service_booking(payload);
 BEGIN PERFORM public.create_own_service_booking(aid,q->>'version',payload);RAISE EXCEPTION 'holdless creation accepted';EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'booking_hold_required' THEN RAISE;END IF;END;
 PERFORM public.hold_own_service_booking(h,payload);payload:=payload||jsonb_build_object('hold_id',h);q:=public.quote_own_service_booking(payload);
 -- A shift removed after selection is checked again on submission.
 BEGIN
  DELETE FROM public.staff_schedule WHERE staff_id=worker;
  BEGIN PERFORM public.create_own_service_booking(aid,q->>'version',payload);RAISE EXCEPTION 'stale staff accepted';EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM NOT IN('preferred_staff_unavailable','no_scheduled_staff') THEN RAISE;END IF;END;
  RAISE EXCEPTION 'rollback_case' USING ERRCODE='ZX001';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;END;
 PERFORM public.create_own_service_booking(aid,q->>'version',payload);
 IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=aid AND staff_id=worker AND requested_staff_id IS NULL AND appointment_status='confirmed' AND staff_confirmation_status='not_required') THEN RAISE EXCEPTION 'new booking needs staff confirmation';END IF;
 IF EXISTS(SELECT 1 FROM public.appointment_item WHERE appointment_id=aid AND staff_id IS DISTINCT FROM worker) THEN RAISE EXCEPTION 'item staff mismatch';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(pawpal_private.booking_staff_choices(cid,payload)) v WHERE v->>'id'=worker::text) THEN RAISE EXCEPTION 'busy staff offered';END IF;
 -- Existing bookings still protect their concrete shifts from leave/deletion.
 BEGIN DELETE FROM public.staff_schedule WHERE staff_id=worker;RAISE EXCEPTION 'booked shift deleted';EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'staff_has_requested_booking' THEN RAISE;END IF;END;
 SELECT s.auth_user_id INTO admin_uid FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.auth_user_id IS NOT NULL LIMIT 1;
 INSERT INTO auth.users(id) VALUES(legacy_auth);
 INSERT INTO public.staff(id,full_name,job_title,staff_level_id,employment_status,auth_user_id,phone_number) VALUES(legacy_worker,'Legacy unrostered','Care',level_id,'active',legacy_auth,'099'||lpad(floor(random()*10000000)::text,7,'0'));
 SELECT * INTO legacy FROM public.appointment WHERE id=aid;legacy.id:=legacy_id;legacy.appointment_code:='TEST-'||legacy_id;legacy.appointment_status:='pending';legacy.staff_id:=NULL;legacy.requested_staff_id:=legacy_worker;legacy.staff_confirmation_status:='pending';legacy.scheduled_start_at:=starts+interval '1 day';legacy.scheduled_end_at:=starts+interval '1 day 1 hour';
 INSERT INTO public.appointment SELECT (legacy).*;
 SELECT * INTO line FROM public.appointment_item WHERE appointment_id=aid AND is_primary;line.id:=gen_random_uuid();line.appointment_id:=legacy_id;line.staff_id:=NULL;INSERT INTO public.appointment_item SELECT (line).*;
 INSERT INTO public.staff_schedule(staff_id,start_at,end_at) VALUES(worker,legacy.scheduled_start_at,legacy.scheduled_end_at);
 PERFORM set_config('request.jwt.claim.sub',admin_uid::text,true);
 result:=public.admin_service_booking_staff_choices(legacy_id);
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(result) v WHERE v->>'id'=worker::text) OR EXISTS(SELECT 1 FROM jsonb_array_elements(result) v WHERE v->>'id'=legacy_worker::text) THEN RAISE EXCEPTION 'admin choices include unscheduled staff';END IF;
 SELECT updated_at INTO revision FROM public.appointment WHERE id=legacy_id;
 PERFORM public.update_admin_service_booking(legacy_id,revision,'assign',worker::text,'Direct legacy reassignment');
 IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=legacy_worker) OR NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=legacy_id AND staff_id=worker AND proposal_staff_id IS NULL AND staff_confirmation_status='confirmed') THEN RAISE EXCEPTION 'legacy requires original shift or proposal';END IF;
 SELECT updated_at INTO revision FROM public.appointment WHERE id=legacy_id;
 PERFORM public.update_admin_service_booking(legacy_id,revision,'status','confirmed','Confirm legacy booking');
 -- A confirmed booking can be reassigned without revalidating its old worker.
 SELECT updated_at INTO revision FROM public.appointment WHERE id=legacy_id;
 BEGIN
  PERFORM public.update_admin_service_booking(legacy_id,revision,'assign',legacy_worker::text,'Unrostered replacement');
  RAISE EXCEPTION 'unrostered replacement accepted';
 EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'staff_not_available' THEN RAISE;END IF;END;
 INSERT INTO public.staff_schedule(staff_id,start_at,end_at) VALUES(legacy_worker,legacy.scheduled_start_at,legacy.scheduled_end_at);
 UPDATE public.staff SET service_locked=true WHERE id=worker;
 PERFORM public.update_admin_service_booking(legacy_id,revision,'assign',legacy_worker::text,'Replace unavailable original worker');
 IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=legacy_id AND staff_id=legacy_worker AND requested_staff_id=legacy_worker AND appointment_status='confirmed' AND proposal_staff_id IS NULL) THEN RAISE EXCEPTION 'confirmed reassignment needs original worker';END IF;
 IF EXISTS(SELECT 1 FROM public.appointment_item WHERE appointment_id=legacy_id AND status<>'cancelled' AND staff_id IS DISTINCT FROM legacy_worker) THEN RAISE EXCEPTION 'confirmed replacement did not sync items';END IF;
 UPDATE public.staff SET service_locked=false WHERE id=worker;
 -- The guest route uses the same scheduled-only finalizer.
 PERFORM set_config('request.jwt.claim.sub','',true);PERFORM set_config('request.jwt.claim.role','service_role',true);
 PERFORM public.guest_commerce_save_pet(token,now()+interval '1 day',guest_pet,'095'||lpad(floor(random()*10000000)::text,7,'0'),'Scheduled guest',jsonb_build_object('name','Scheduled guest pet','breedId',breed,'weight',5));
 payload:=(payload-'hold_id')||jsonb_build_object('pet_id',guest_pet,'scheduled_start_at',starts+interval '2 days');h:=gen_random_uuid();
 INSERT INTO public.staff_schedule(staff_id,start_at,end_at) VALUES(worker,starts+interval '2 days',starts+interval '2 days 3 hours');
 PERFORM public.guest_booking_hold(token,h,payload);payload:=payload||jsonb_build_object('hold_id',h);q:=public.guest_booking_quote(token,payload);
 PERFORM public.guest_booking_create(token,guest_id,q->>'version',payload);
 IF NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=guest_id AND staff_id=worker AND requested_staff_id IS NULL AND appointment_status='confirmed' AND staff_confirmation_status='not_required') THEN RAISE EXCEPTION 'guest still needs staff confirmation';END IF;
 IF has_function_privilege('authenticated','public.propose_booking_staff(uuid,timestamptz,uuid,timestamptz,text)','EXECUTE') OR has_function_privilege('authenticated','public.confirm_booking_staff_with_schedule(uuid,timestamptz,uuid,timestamptz,timestamptz)','EXECUTE') THEN RAISE EXCEPTION 'retired request workflow still writable';END IF;
 END;END $$;`);
 await db.query('SET CONSTRAINTS ALL IMMEDIATE');await db.query('ROLLBACK TO SAVEPOINT fixtures');await db.query(process.argv.includes('--apply')?'COMMIT':'ROLLBACK');
 console.log('PASS scheduled-only member/guest choices and create, no shift/recurring/partial/busy rejection, hold requirement, stale staff recheck, shift protection and direct legacy reassignment. Fixtures rolled back. '+(process.argv.includes('--apply')?'Migration applied.':'Migration rolled back.'));
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}})().catch(error=>{console.error(error.message,error.where||'');process.exitCode=1;});
