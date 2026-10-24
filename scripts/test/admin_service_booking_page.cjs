const {sql}=require('../database/v1/cloud_connection.cjs');
console.log(sql(`BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); BEGIN
INSERT INTO auth.users(id) VALUES(u);INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Booking page verification','QA',u,'active',false);INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');PERFORM set_config('request.jwt.claim.sub',u::text,true);END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE r jsonb; expected integer; exported jsonb; code text; BEGIN
r:=public.get_admin_service_booking_page();SELECT count(*) INTO expected FROM public.appointment;
IF (r->>'total')::integer<>expected OR jsonb_array_length(r->'ids')>10 OR r->'exportRows'<>'null'::jsonb THEN RAISE EXCEPTION 'page/count/export mismatch';END IF;
r:=public.get_admin_service_booking_page('{}',1000000);IF (r->>'page')::integer<>greatest(1,ceil(expected/10.0)::integer) THEN RAISE EXCEPTION 'clamp mismatch';END IF;
r:=public.get_admin_service_booking_page('{"status":"pending"}',1,true);SELECT count(*) INTO expected FROM public.appointment WHERE appointment_status='pending';
IF (r->>'total')::integer<>expected OR jsonb_array_length(r->'exportRows')<>expected THEN RAISE EXCEPTION 'filtered export scope mismatch';END IF;
FOR exported IN SELECT value FROM jsonb_array_elements(r->'exportRows') LOOP IF jsonb_array_length(exported)<>11 THEN RAISE EXCEPTION 'invalid export shape';END IF;END LOOP;
r:=public.get_admin_service_booking_page('{"upcoming":true}');SELECT count(*) INTO expected FROM public.appointment WHERE appointment_status IN ('pending','confirmed') AND date_trunc('minute',scheduled_start_at) BETWEEN now() AND now()+interval '1 hour';
IF (r->>'total')::integer<>expected OR (r->'counts'->>'statUpcomingBookings')::integer<>expected OR jsonb_array_length(r->'upcoming')>10 THEN RAISE EXCEPTION 'upcoming mismatch';END IF;
SELECT appointment_code INTO code FROM public.appointment LIMIT 1;
IF code IS NOT NULL THEN r:=public.get_admin_service_booking_page(jsonb_build_object('query',code));IF (r->>'total')::integer<1 THEN RAISE EXCEPTION 'code search mismatch';END IF;END IF;
r:=public.get_admin_service_booking_page(jsonb_build_object('query','missing-'||gen_random_uuid()));IF (r->>'total')::integer<>0 THEN RAISE EXCEPTION 'empty search mismatch';END IF;
BEGIN PERFORM public.get_admin_service_booking_page('{}',0);RAISE EXCEPTION 'invalid page accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
BEGIN PERFORM public.get_admin_service_booking_page();RAISE EXCEPTION 'unauthorized accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;ROLLBACK;
SELECT 'PASS booking server page/count/clamp, filtered full export, upcoming summary/search and authorization; identity rolled back';`));
