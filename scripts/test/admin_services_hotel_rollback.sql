BEGIN;
DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); BEGIN
INSERT INTO auth.users(id) VALUES(u);INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Service rollback verification','QA',u,'active',false);INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');INSERT INTO public.staff_schedule(staff_id,start_at,end_at,availability_status,schedule_status) VALUES(s,date_trunc('day',now()+interval '14 days')+interval '8 hours',date_trunc('day',now()+interval '14 days')+interval '13 hours','available','active');PERFORM set_config('request.jwt.claim.sub',u::text,true);END $$;
DO $$ DECLARE t uuid:=gen_random_uuid(); r uuid:=gen_random_uuid(); BEGIN
INSERT INTO public.hotel_room_type(id,room_type,capacity,daily_price,status) VALUES(t,'Rollback test',1,120000,'active');
INSERT INTO public.hotel_room(id,room_number,room_type_id,status) VALUES(r,'TEST-'||r,t,'active');PERFORM set_config('test.room',r::text,true);END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE c uuid; b uuid; species uuid; pet uuid:=gen_random_uuid(); svc uuid:=gen_random_uuid(); booking uuid:=gen_random_uuid(); starts timestamptz:=now()+interval '21 days'; details jsonb; BEGIN
c:=public.create_customer_quick('Hotel rollback customer','09'||lpad(floor(random()*100000000)::text,8,'0'));
SELECT pb.id,pb.species_id INTO b,species FROM public.pet_breed pb JOIN public.pet_species ps ON ps.id=pb.species_id WHERE pb.is_active AND ps.is_active ORDER BY pb.id LIMIT 1;
PERFORM public.save_admin_pet(pet,NULL,jsonb_build_object('customer_id',c,'breed_id',b,'pet_name','Hotel rollback pet','gender','unknown'),4);
PERFORM public.save_admin_service_catalog(svc,NULL,jsonb_build_object('service_code','TEST-'||svc,'service_name','Hotel rollback','category_code','pet_hotel','duration_minutes',30,'status','active','commission_rate',0,'species_ids',jsonb_build_array(species),'steps','[]'::jsonb),NULL);
details:=jsonb_build_object('customer_id',c,'pet_id',pet,'service_id',svc,'scheduled_start_at',starts,'check_out_at',starts+interval '25 hours','room_id',current_setting('test.room'),'diet_notes','Rollback diet','care_notes','Rollback care');
PERFORM public.create_admin_logistics_booking(booking,details);PERFORM public.create_admin_logistics_booking(booking,details);
IF (SELECT total_price FROM public.appointment_totals WHERE appointment_id=booking)<>240000 OR (SELECT count(*) FROM public.hotel_booking WHERE appointment_id=booking)<>1 THEN RAISE EXCEPTION 'hotel billing or idempotence mismatch';END IF;
BEGIN PERFORM public.create_admin_logistics_booking(gen_random_uuid(),details);RAISE EXCEPTION 'room conflict accepted';EXCEPTION WHEN SQLSTATE 'PT409' THEN IF SQLERRM<>'hotel_room_conflict' THEN RAISE;END IF;END;
BEGIN PERFORM public.create_admin_logistics_booking(gen_random_uuid(),details||jsonb_build_object('check_out_at',starts));RAISE EXCEPTION 'invalid stay accepted';EXCEPTION WHEN SQLSTATE '22023' THEN NULL;END;
PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
BEGIN PERFORM public.create_admin_logistics_booking(gen_random_uuid(),details);RAISE EXCEPTION 'unauthorized allowed';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
ROLLBACK;SELECT 'PASS hotel 25h=2 days billing, idempotence, room overlap/invalid stay/permission guards; all rolled back';
