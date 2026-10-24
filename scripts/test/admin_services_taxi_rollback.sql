BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); BEGIN
INSERT INTO auth.users(id) VALUES(u);INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Service rollback verification','QA',u,'active',false);INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');INSERT INTO public.staff_schedule(staff_id,start_at,end_at,availability_status,schedule_status) VALUES(s,date_trunc('day',now()+interval '14 days')+interval '8 hours',date_trunc('day',now()+interval '14 days')+interval '13 hours','available','active');PERFORM set_config('request.jwt.claim.sub',u::text,true);END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE rule public.taxi_price_rule; distance numeric; kg numeric; expected numeric; c uuid; b uuid; species uuid; pet uuid:=gen_random_uuid(); svc uuid:=gen_random_uuid(); booking uuid:=gen_random_uuid(); starts timestamptz:=now()+interval '21 days'; details jsonb; BEGIN
SELECT * INTO rule FROM public.taxi_price_rule WHERE status='active' AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts) ORDER BY id LIMIT 1;IF rule.id IS NULL THEN RAISE EXCEPTION 'no active taxi rule for test';END IF;distance:=greatest(rule.distance_from,0.1);kg:=greatest(rule.weight_from,0.1);expected:=rule.base_price+rule.surcharge;
c:=public.create_customer_quick('Hotel rollback customer','09'||lpad(floor(random()*100000000)::text,8,'0'));
SELECT pb.id,pb.species_id INTO b,species FROM public.pet_breed pb JOIN public.pet_species ps ON ps.id=pb.species_id WHERE pb.is_active AND ps.is_active ORDER BY pb.id LIMIT 1;
PERFORM public.save_admin_pet(pet,NULL,jsonb_build_object('customer_id',c,'breed_id',b,'pet_name','Taxi rollback pet','gender','unknown'),kg);
PERFORM public.save_admin_service_catalog(svc,NULL,jsonb_build_object('service_code','TEST-'||svc,'service_name','Hotel rollback','category_code','pet_taxi','duration_minutes',30,'status','active','commission_rate',0,'species_ids',jsonb_build_array(species),'steps','[]'::jsonb),NULL);
details:=jsonb_build_object('customer_id',c,'pet_id',pet,'service_id',svc,'scheduled_start_at',starts,'pickup_address','Rollback pickup','dropoff_address','Rollback dropoff','distance_km',distance,'trip_type','one_way');
PERFORM public.create_admin_logistics_booking(booking,details);PERFORM public.create_admin_logistics_booking(booking,details);
IF (SELECT total_price FROM public.appointment_totals WHERE appointment_id=booking)<>expected OR (SELECT count(*) FROM public.taxi_trip WHERE appointment_id=booking)<>1 THEN RAISE EXCEPTION 'taxi price or idempotence mismatch';END IF;
BEGIN PERFORM public.create_admin_logistics_booking(gen_random_uuid(),details||jsonb_build_object('trip_type','round_trip'));RAISE EXCEPTION 'missing return accepted';EXCEPTION WHEN SQLSTATE '22023' THEN NULL;END;
BEGIN PERFORM public.create_admin_logistics_booking(gen_random_uuid(),details||jsonb_build_object('distance_km',0));RAISE EXCEPTION 'zero distance accepted';EXCEPTION WHEN SQLSTATE '22023' THEN NULL;END;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
BEGIN PERFORM public.create_admin_logistics_booking(gen_random_uuid(),details);RAISE EXCEPTION 'unauthorized allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
ROLLBACK;SELECT 'PASS taxi current-rule quote, idempotence, invalid return/distance and permission guards; all rolled back';
