const fs=require('node:fs'),{spawnSync}=require('node:child_process');
const {state}=require('./customer_completion_helpers.cjs');
const ddl=fs.readFileSync('scripts/database/v1/066_customer_booking_cancel.sql','utf8').replace(/^BEGIN;|^COMMIT;|^NOTIFY.*$/gm,'');
const sales=fs.readFileSync('scripts/database/v1/062_customer_sales_gateway.sql','utf8').replace(/^BEGIN;|^COMMIT;|^NOTIFY.*$/gm,'');
const q=`BEGIN; ${sales} ${ddl}
DO $$ DECLARE uid uuid:=gen_random_uuid(); cid uuid; pet uuid; aid uuid:=gen_random_uuid(); request uuid:=gen_random_uuid();
 stamp timestamptz; rejected boolean; category text; svc uuid; target uuid; room uuid; method uuid; foreign_uid uuid:=gen_random_uuid();
BEGIN
 INSERT INTO auth.users(id) VALUES(uid);
 SELECT customer_id,id INTO cid,pet FROM public.pet_profile LIMIT 1;
 UPDATE public.customer SET auth_user_id=uid,customer_status='active' WHERE id=cid;
 INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at)
 VALUES(aid,'TEST-'||aid,cid,pet,now()+interval '2 days',now()+interval '2 days 1 hour') RETURNING updated_at INTO stamp;
 PERFORM set_config('request.jwt.claim.sub',uid::text,true);PERFORM set_config('request.jwt.claim.role','authenticated',true);
 PERFORM set_config('role','authenticated',true);
 rejected:=false;BEGIN PERFORM public.cancel_own_service_booking(request,aid,stamp,'');EXCEPTION WHEN invalid_parameter_value THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Empty reason accepted';END IF;
 rejected:=false;BEGIN PERFORM public.cancel_own_service_booking(request,aid,stamp-interval '1 second','Test');EXCEPTION WHEN SQLSTATE 'PT409' THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Stale version accepted';END IF;
 PERFORM public.cancel_own_service_booking(request,aid,stamp,'Customer cancellation verification');
 PERFORM public.cancel_own_service_booking(request,aid,stamp,'Customer cancellation verification');
 IF (SELECT appointment_status FROM public.appointment WHERE id=aid)<>'cancelled' THEN RAISE EXCEPTION 'Cancellation not saved';END IF;
 rejected:=false;BEGIN PERFORM public.cancel_own_service_booking(request,aid,stamp,'Changed payload');EXCEPTION WHEN SQLSTATE 'PT409' THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Conflicting replay accepted';END IF;
 PERFORM set_config('role','supabase_admin',true);
 IF (SELECT count(*) FROM public.audit_log WHERE entity_id=aid AND action='CUSTOMER_CANCEL_APPOINTMENT')<>1 THEN RAISE EXCEPTION 'Duplicate audit';END IF;
 -- Same owner but too close, started, or paid: all rejected without mutation.
 FOREACH category IN ARRAY ARRAY['near','in_progress','paid'] LOOP
  target:=gen_random_uuid();
  INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at,appointment_status)
  VALUES(target,'TEST-'||target,cid,pet,now()+CASE WHEN category='near' THEN interval '1 hour' ELSE interval '2 days' END,
   now()+interval '3 days',CASE WHEN category='in_progress' THEN 'in_progress' ELSE 'pending' END) RETURNING updated_at INTO stamp;
  IF category='paid' THEN
   SELECT id INTO method FROM public.payment_method_config LIMIT 1;
   PERFORM set_config('request.jwt.claim.role','service_role',true);
   SELECT id INTO svc FROM public.service LIMIT 1;
   INSERT INTO public.appointment_item(appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,duration_minutes)
   VALUES(target,svc,true,'Test paid item',1,100,60);
   INSERT INTO public.payment(payment_code,customer_id,payment_method_config_id,payment_type,amount,transaction_status,succeeded_at,idempotency_key,appointment_id)
   VALUES('TEST-'||target,cid,method,'partial',50,'succeeded',now(),'test-'||target,target);
   PERFORM set_config('request.jwt.claim.role','authenticated',true);
  END IF;
  PERFORM set_config('role','authenticated',true);
  rejected:=false;BEGIN PERFORM public.cancel_own_service_booking(gen_random_uuid(),target,stamp,'Test');EXCEPTION WHEN invalid_parameter_value THEN rejected:=true;END;
  IF NOT rejected THEN RAISE EXCEPTION 'Protected booking cancelled: %',category;END IF;
  PERFORM set_config('role','supabase_admin',true);
 END LOOP;
 -- Hotel and taxi use the existing sync trigger to release their bookings.
 FOREACH category IN ARRAY ARRAY['pet_hotel','pet_taxi'] LOOP
  SELECT s.id INTO svc FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE c.category_code=category LIMIT 1;
  IF svc IS NULL THEN RAISE EXCEPTION 'Missing restored logistics service';END IF;
  target:=gen_random_uuid();
  INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at)
   VALUES(target,'TEST-'||target,cid,pet,now()+interval '20 days',now()+interval '21 days') RETURNING updated_at INTO stamp;
  INSERT INTO public.appointment_item(appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,duration_minutes)
   VALUES(target,svc,true,'Test logistics',1,100,60);
  IF category='pet_hotel' THEN
   SELECT id INTO room FROM public.hotel_room LIMIT 1;
   INSERT INTO public.hotel_booking(booking_code,room_id,appointment_id,check_in_at,check_out_at,daily_price)
    VALUES('TEST-'||target,room,target,now()+interval '20 days',now()+interval '21 days',100);
  ELSE
   INSERT INTO public.taxi_trip(appointment_id,pickup_address,dropoff_address,distance_km,trip_type,outbound_at,quoted_amount)
    VALUES(target,'Test pickup','Test dropoff',1,'one_way',now()+interval '20 days',100);
  END IF;
  PERFORM set_config('role','authenticated',true);
  PERFORM public.cancel_own_service_booking(gen_random_uuid(),target,stamp,'Test logistics cancellation');
  PERFORM set_config('role','supabase_admin',true);
  IF category='pet_hotel' AND (SELECT status FROM public.hotel_booking WHERE appointment_id=target)<>'cancelled' THEN RAISE EXCEPTION 'Room not released';END IF;
  IF category='pet_taxi' AND (SELECT status FROM public.taxi_trip WHERE appointment_id=target)<>'cancelled' THEN RAISE EXCEPTION 'Trip not cancelled';END IF;
 END LOOP;
 INSERT INTO auth.users(id) VALUES(foreign_uid);
 INSERT INTO public.customer(customer_code,auth_user_id,customer_status) VALUES('TEST-'||foreign_uid,foreign_uid,'active');
 PERFORM set_config('request.jwt.claim.sub',foreign_uid::text,true);PERFORM set_config('role','authenticated',true);
 rejected:=false;BEGIN PERFORM public.cancel_own_service_booking(gen_random_uuid(),aid,stamp,'Foreign');EXCEPTION WHEN insufficient_privilege THEN rejected:=true;END;
 IF NOT rejected THEN RAISE EXCEPTION 'Foreign customer allowed';END IF;
END $$;ROLLBACK;`;
const r=spawnSync('docker',['exec','-i','supabase-db','psql','-X','-q','-U','supabase_admin','-d',state.stage,'-v','ON_ERROR_STOP=1'],{input:q,encoding:'utf8',windowsHide:true});
if(r.status!==0)throw Error(r.stderr);
console.log('PASS owner cancellation, required reason, version, replay, paid/started/near rejection, hotel/taxi release and foreign identity; restored fixtures rolled back.');
