const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const {state}=require('./customer_completion_helpers.cjs');
const ddl=['062_customer_sales_gateway.sql','066_customer_booking_cancel.sql','067_customer_booking_reschedule.sql'].map(f=>fs.readFileSync('scripts/database/v1/'+f,'utf8').replace(/^BEGIN;|^COMMIT;|^NOTIFY.*$/gm,'')).join('\n');
const q=`BEGIN;${ddl}
DO $$ DECLARE uid uuid:=gen_random_uuid(); cid uuid:=gen_random_uuid(); pet uuid:=gen_random_uuid(); breed uuid; species uuid;
 staff_auth uuid:=gen_random_uuid(); staff_key uuid:=gen_random_uuid(); category text; svc uuid; cat uuid; a uuid; item uuid;
 room_type uuid:=gen_random_uuid(); room uuid:=gen_random_uuid(); block_id uuid; request uuid; quote jsonb; changed jsonb;
 starts timestamptz:=date_trunc('minute',now()+interval '30 days'); proposed timestamptz:=date_trunc('minute',now()+interval '40 days');
 ends timestamptz; rejected boolean; expected numeric; next_quote jsonb; method uuid; foreign_uid uuid:=gen_random_uuid();
BEGIN
 INSERT INTO auth.users(id) VALUES(uid),(staff_auth),(foreign_uid);
 INSERT INTO public.customer(id,auth_user_id,customer_code,customer_status) VALUES(cid,uid,'TEST-'||cid,'active');
 INSERT INTO public.customer(auth_user_id,customer_code,customer_status) VALUES(foreign_uid,'TEST-'||foreign_uid,'active');
 SELECT id,species_id INTO breed,species FROM public.pet_breed LIMIT 1;
 INSERT INTO public.pet_profile(id,customer_id,pet_code,pet_name,breed_id) VALUES(pet,cid,'TEST-'||pet,'Move verification',breed);
 INSERT INTO public.pet_weight_history(pet_id,weight) VALUES(pet,5);
 INSERT INTO public.staff(id,auth_user_id,full_name,job_title) VALUES(staff_key,staff_auth,'Move verification staff','KTV');
 INSERT INTO public.hotel_room_type(id,room_type,capacity,daily_price) VALUES(room_type,'Move test',1,300);
 INSERT INTO public.hotel_room(id,room_number,room_type_id) VALUES(room,'TEST-'||room,room_type);
 UPDATE public.taxi_price_rule SET status='inactive';
 INSERT INTO public.taxi_price_rule(distance_from,distance_to,weight_from,weight_to,base_price,surcharge,effective_from,effective_to,status)
 VALUES(0,NULL,0,NULL,100,0,now()-interval '1 day',proposed+interval '1 hour','active'),
 (0,NULL,0,NULL,200,0,proposed+interval '1 hour',NULL,'active');
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);PERFORM set_config('request.jwt.claim.role','authenticated',true);
 FOREACH category IN ARRAY ARRAY['grooming_spa','pet_hotel','pet_taxi'] LOOP
  svc:=gen_random_uuid();a:=gen_random_uuid();item:=gen_random_uuid();request:=gen_random_uuid();
  SELECT id INTO cat FROM public.service_category WHERE category_code=category;
  INSERT INTO public.service(id,service_code,service_name,estimated_duration,category_id,status) VALUES(svc,'TEST-'||svc,'Move test',60,cat,'active');
  INSERT INTO public.service_supported_species(service_id,species_id) VALUES(svc,species);
  IF category='grooming_spa' THEN
   INSERT INTO public.service_price_matrix(service_id,weight_from,weight_to,unit_price,effective_from,status) VALUES(svc,0,NULL,700,now()-interval '1 day','active');
   ends:=starts+interval '1 hour';expected:=700;
  ELSIF category='pet_hotel' THEN ends:=starts+interval '25 hours';expected:=600;
  ELSE ends:=starts+interval '3 hours';expected:=300;END IF;
  INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,staff_id,scheduled_start_at,scheduled_end_at,appointment_status)
   VALUES(a,'TEST-'||a,cid,pet,staff_key,starts,ends,'confirmed');
  INSERT INTO public.appointment_item(id,appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,duration_minutes,weight_snapshot,staff_id,status)
   VALUES(item,a,svc,true,'Move test',1,500,ceil(extract(epoch FROM (ends-starts))/60)::integer,5,staff_key,'pending');
  IF category='pet_hotel' THEN
   INSERT INTO public.hotel_booking(booking_code,room_id,appointment_id,check_in_at,check_out_at,daily_price,status)
    VALUES('TEST-'||a,room,a,starts,ends,500,'reserved');
  ELSIF category='pet_taxi' THEN
   INSERT INTO public.taxi_trip(appointment_id,driver_staff_id,pickup_address,dropoff_address,distance_km,trip_type,outbound_at,return_at,quoted_amount,status)
    VALUES(a,staff_key,'Pickup','Dropoff',2,'round_trip',starts,starts+interval '2 hours',500,'pending');
  END IF;
  -- No guessed slot: another appointment assigned to the same staff blocks it.
  block_id:=gen_random_uuid();
  INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,staff_id,scheduled_start_at,scheduled_end_at)
   VALUES(block_id,'TEST-'||block_id,cid,pet,staff_key,proposed,proposed+(ends-starts));
  PERFORM set_config('role','authenticated',true);
  rejected:=false;BEGIN PERFORM public.quote_own_booking_move(a,proposed);EXCEPTION WHEN SQLSTATE 'PT409' THEN rejected:=true;END;
  IF NOT rejected THEN RAISE EXCEPTION 'Staff conflict accepted';END IF;
  PERFORM set_config('role','supabase_admin',true);DELETE FROM public.appointment WHERE id=block_id;
  IF category='pet_hotel' THEN
   INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at)
    VALUES(block_id,'TEST-'||block_id,cid,pet,proposed,proposed+interval '25 hours');
   INSERT INTO public.hotel_booking(booking_code,room_id,appointment_id,check_in_at,check_out_at,daily_price,status)
    VALUES('TEST-'||block_id,room,block_id,proposed,proposed+interval '25 hours',300,'reserved');
   PERFORM set_config('role','authenticated',true);
   rejected:=false;BEGIN PERFORM public.quote_own_booking_move(a,proposed);EXCEPTION WHEN SQLSTATE 'PT409' THEN rejected:=true;END;
   IF NOT rejected THEN RAISE EXCEPTION 'Room conflict accepted';END IF;
   PERFORM set_config('role','supabase_admin',true);DELETE FROM public.hotel_booking WHERE appointment_id=block_id;DELETE FROM public.appointment WHERE id=block_id;
  END IF;
  PERFORM set_config('role','authenticated',true);
  quote:=public.quote_own_booking_move(a,proposed);
  IF (quote->>'total')::numeric<>expected OR (quote->>'end_at')::timestamptz<>ends+(proposed-starts) THEN RAISE EXCEPTION 'Wrong price/duration: %',category;END IF;
  IF category='grooming_spa' THEN
   PERFORM set_config('role','supabase_admin',true);
   UPDATE public.service_price_matrix SET unit_price=800 WHERE service_id=svc;
   PERFORM set_config('role','authenticated',true);
   rejected:=false;BEGIN PERFORM public.reschedule_own_service_booking(request,a,proposed,quote->>'version','Stale real price');EXCEPTION WHEN SQLSTATE 'PT409' THEN rejected:=true;END;
   IF NOT rejected OR (SELECT change_count FROM public.appointment WHERE id=a)<>0 THEN RAISE EXCEPTION 'Price change not rolled back';END IF;
   PERFORM set_config('role','supabase_admin',true);UPDATE public.service_price_matrix SET unit_price=700 WHERE service_id=svc;
   PERFORM set_config('request.jwt.claim.role','service_role',true);
   SELECT id INTO method FROM public.payment_method_config LIMIT 1;
   INSERT INTO public.payment(id,payment_code,customer_id,payment_method_config_id,payment_type,amount,transaction_status,idempotency_key,appointment_id)
    VALUES(request,'TEST-'||request,cid,method,'partial',50,'pending','test-move-'||request,a);
   PERFORM set_config('request.jwt.claim.role','authenticated',true);PERFORM set_config('role','authenticated',true);
   rejected:=false;BEGIN PERFORM public.quote_own_booking_move(a,proposed);EXCEPTION WHEN invalid_parameter_value THEN rejected:=true;END;
   IF NOT rejected THEN RAISE EXCEPTION 'Payment booking moved without staff reconciliation';END IF;
   PERFORM set_config('role','supabase_admin',true);PERFORM set_config('request.jwt.claim.role','service_role',true);
   DELETE FROM public.payment WHERE id=request;
   PERFORM set_config('request.jwt.claim.role','authenticated',true);PERFORM set_config('role','authenticated',true);
   quote:=public.quote_own_booking_move(a,proposed);
  END IF;
  rejected:=false;BEGIN PERFORM public.reschedule_own_service_booking(request,a,proposed,'stale','Test');EXCEPTION WHEN SQLSTATE 'PT409' THEN rejected:=true;END;
  IF NOT rejected THEN RAISE EXCEPTION 'Stale quote accepted';END IF;
  PERFORM public.reschedule_own_service_booking(request,a,proposed,quote->>'version','Move verification');
  PERFORM public.reschedule_own_service_booking(request,a,proposed,quote->>'version','Move verification');
  IF (SELECT change_count FROM public.appointment WHERE id=a)<>1 OR (SELECT appointment_status FROM public.appointment WHERE id=a)<>'pending' THEN RAISE EXCEPTION 'Wrong count/status';END IF;
  PERFORM set_config('role','supabase_admin',true);
  IF (SELECT total_price FROM public.appointment_totals WHERE appointment_id=a)<>expected THEN RAISE EXCEPTION 'Saved total differs';END IF;
  IF category='pet_hotel' AND (SELECT check_out_at FROM public.hotel_booking WHERE appointment_id=a)<>proposed+interval '25 hours' THEN RAISE EXCEPTION 'Hotel duration changed';END IF;
  IF category='pet_taxi' AND (SELECT return_at FROM public.taxi_trip WHERE appointment_id=a)<>proposed+interval '2 hours' THEN RAISE EXCEPTION 'Return leg changed';END IF;
  -- Reconfirm before each second change; third move is refused.
  PERFORM set_config('request.jwt.claim.role','service_role',true);
  UPDATE public.appointment SET appointment_status='confirmed' WHERE id=a;
  PERFORM set_config('request.jwt.claim.role','authenticated',true);PERFORM set_config('role','authenticated',true);
  next_quote:=public.quote_own_booking_move(a,proposed+interval '2 days');
  PERFORM public.reschedule_own_service_booking(gen_random_uuid(),a,proposed+interval '2 days',next_quote->>'version','Second move');
  PERFORM set_config('role','supabase_admin',true);PERFORM set_config('request.jwt.claim.role','service_role',true);
  UPDATE public.appointment SET appointment_status='confirmed' WHERE id=a;
  PERFORM set_config('request.jwt.claim.role','authenticated',true);PERFORM set_config('role','authenticated',true);
  rejected:=false;BEGIN PERFORM public.quote_own_booking_move(a,proposed+interval '4 days');EXCEPTION WHEN invalid_parameter_value THEN rejected:=true;END;
  IF NOT rejected THEN RAISE EXCEPTION 'Third change accepted';END IF;
  PERFORM set_config('request.jwt.claim.sub',foreign_uid::text,true);
  rejected:=false;BEGIN PERFORM public.quote_own_booking_move(a,proposed+interval '4 days');EXCEPTION WHEN insufficient_privilege THEN rejected:=true;END;
  IF NOT rejected THEN RAISE EXCEPTION 'Foreign quote allowed';END IF;
  PERFORM set_config('request.jwt.claim.sub',uid::text,true);PERFORM set_config('role','supabase_admin',true);
  -- Move fixtures out of the next category's staff window.
  PERFORM set_config('request.jwt.claim.role','service_role',true);UPDATE public.appointment SET appointment_status='cancelled' WHERE id=a;PERFORM set_config('request.jwt.claim.role','authenticated',true);
 END LOOP;
END $$;ROLLBACK;`;
const result=spawnSync('docker',['exec','-i','supabase-db','psql','-X','-q','-U','supabase_admin','-d',state.stage,'-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true});
if(result.status!==0)throw Error(result.stderr);
console.log('PASS restored grooming/hotel/round-trip move, authoritative price/duration, staff/room conflicts, stale quote, idempotency, count limit and owner isolation; rolled back.');
