-- Executed within the import transaction. All test fixtures are rolled back.
SAVEPOINT service_catalog_smoke;
CREATE TEMP TABLE service_smoke_context(customer_id uuid,pet_id uuid) ON COMMIT DROP;
GRANT SELECT,INSERT ON service_smoke_context TO authenticated;
DO $$ DECLARE u uuid:=gen_random_uuid(); st uuid:=gen_random_uuid(); BEGIN
 INSERT INTO auth.users(id) VALUES(u);
 INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(st,'Kiểm tra nhập dịch vụ','QA',u,'active',false);
 INSERT INTO public.staff_role(staff_id,role_code) VALUES(st,'ADMIN');
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE c uuid; b uuid; pet uuid:=gen_random_uuid(); svc public.service; room uuid; booking uuid; details jsonb; starts timestamptz:=now()+interval '30 days'; v jsonb; actual numeric;
BEGIN
 c:=public.create_customer_quick('Kiểm tra dịch vụ','09'||lpad(floor(random()*100000000)::text,8,'0'));
 SELECT pb.id INTO b FROM public.pet_breed pb JOIN public.pet_species ps ON ps.id=pb.species_id WHERE ps.species_name='Chó' AND pb.is_active LIMIT 1;
 IF b IS NULL THEN RAISE EXCEPTION 'Dog breed required for rollback verification'; END IF;
 PERFORM public.save_admin_pet(pet,NULL,jsonb_build_object('customer_id',c,'breed_id',b,'pet_name','Kiểm tra biến thể','gender','unknown'),5);
 INSERT INTO service_smoke_context VALUES(c,pet);
 details:=jsonb_build_object('customer_id',c,'pet_id',pet,'scheduled_start_at',starts);
 SELECT * INTO svc FROM public.service WHERE service_code='SVC-SPA-01';booking:=gen_random_uuid();
 PERFORM public.create_admin_service_booking(booking,details||jsonb_build_object('service_id',svc.id));
 IF (SELECT total_price FROM public.appointment_totals WHERE appointment_id=booking)<>170000 OR (SELECT duration_minutes FROM public.appointment_item WHERE appointment_id=booking AND is_primary)<>75 THEN RAISE EXCEPTION '5kg spa boundary/duration mismatch'; END IF;
 FOR svc IN SELECT * FROM public.service WHERE service_code IN ('SVC-TAX-01','SVC-TAX-02') LOOP
  booking:=gen_random_uuid();v:=details||jsonb_build_object('service_id',svc.id,'pickup_address','Điểm đón kiểm tra','dropoff_address','Điểm trả kiểm tra','distance_km',14,'trip_type',svc.trip_type,'return_at',CASE WHEN svc.trip_type='round_trip' THEN starts+interval '3 hours' ELSE NULL END);
  PERFORM public.create_admin_logistics_booking(booking,v);
  actual:=CASE WHEN svc.trip_type='one_way' THEN 150000 ELSE 280000 END;
  IF (SELECT total_price FROM public.appointment_totals WHERE appointment_id=booking)<>actual THEN RAISE EXCEPTION 'Taxi whole-trip quote mismatch'; END IF;
  BEGIN PERFORM public.create_admin_logistics_booking(gen_random_uuid(),v||jsonb_build_object('trip_type',CASE WHEN svc.trip_type='one_way' THEN 'round_trip' ELSE 'one_way' END));RAISE EXCEPTION 'Taxi mismatched trip accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 END LOOP;
 SELECT * INTO svc FROM public.service WHERE service_code='SVC-HTL-07';
 SELECT r.id INTO room FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id WHERE t.service_id=svc.id AND r.status IN ('active','available') LIMIT 1;
 booking:=gen_random_uuid();v:=details||jsonb_build_object('service_id',svc.id,'room_id',room,'check_out_at',starts+interval '3 hours');
 PERFORM public.create_admin_logistics_booking(booking,v);
 IF (SELECT total_price FROM public.appointment_totals WHERE appointment_id=booking)<>300000 THEN RAISE EXCEPTION 'Hourly daycare billing mismatch'; END IF;
 SELECT r.id INTO room FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id WHERE t.service_id<>svc.id AND r.status IN ('active','available') LIMIT 1;
 BEGIN PERFORM public.create_admin_logistics_booking(gen_random_uuid(),v||jsonb_build_object('room_id',room));RAISE EXCEPTION 'Mismatched hotel service accepted';EXCEPTION WHEN SQLSTATE 'PT409' THEN NULL;END;
 -- Save all three categories through the same administrator RPC, with unchanged prices.
 FOR svc IN SELECT * FROM public.service WHERE service_code IN ('SVC-SPA-01','SVC-TAX-02','SVC-HTL-07') LOOP
  SELECT jsonb_agg(to_jsonb(x)) INTO v FROM (
   SELECT id,updated_at,unit_price,duration_minutes FROM public.service_price_matrix WHERE service_id=svc.id AND status='active' AND effective_to IS NULL
   UNION ALL SELECT id,updated_at,base_price+surcharge,NULL FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active' AND effective_to IS NULL
   UNION ALL SELECT id,updated_at,daily_price,NULL FROM public.hotel_room_type WHERE service_id=svc.id AND status='active'
  ) x;
  BEGIN
   actual:=(v->0->>'unit_price')::numeric+1000;
   v:=jsonb_set(v,'{0,unit_price}',to_jsonb(actual));
   IF svc.service_code='SVC-SPA-01' THEN v:=jsonb_set(v,'{0,duration_minutes}',to_jsonb((v->0->>'duration_minutes')::integer+5)); END IF;
   PERFORM public.save_admin_service_catalog(svc.id,svc.updated_at,jsonb_build_object('service_code',svc.service_code,'service_name',svc.service_name,'category_code',(SELECT category_code FROM public.service_category WHERE id=svc.category_id),'duration_minutes',svc.estimated_duration,'status',svc.status,'species_ids',(SELECT jsonb_agg(species_id) FROM public.service_supported_species WHERE service_id=svc.id),'steps','[]'::jsonb,'variant_updates',v),NULL);
   IF svc.service_code='SVC-SPA-01' AND NOT EXISTS(SELECT 1 FROM public.service_price_matrix WHERE service_id=svc.id AND unit_price=actual AND duration_minutes=(v->0->>'duration_minutes')::integer AND effective_to IS NULL AND status='active') THEN RAISE EXCEPTION 'Admin spa variant write failed'; END IF;
   IF svc.service_code='SVC-TAX-02' AND NOT EXISTS(SELECT 1 FROM public.taxi_price_rule WHERE service_id=svc.id AND base_price=actual AND effective_to IS NULL AND status='active') THEN RAISE EXCEPTION 'Admin taxi variant write failed'; END IF;
   IF svc.service_code='SVC-HTL-07' AND NOT EXISTS(SELECT 1 FROM public.hotel_room_type WHERE service_id=svc.id AND daily_price=actual) THEN RAISE EXCEPTION 'Admin hotel variant write failed'; END IF;
   RAISE EXCEPTION 'Roll back successful variant edit before next verification' USING ERRCODE='PZ001';
  EXCEPTION WHEN SQLSTATE 'PZ001' THEN NULL;
  END;
 END LOOP;
END $$;
RESET ROLE;
DO $$ DECLARE u uuid:=gen_random_uuid(); BEGIN
 INSERT INTO auth.users(id) VALUES(u);
 UPDATE public.customer SET auth_user_id=u WHERE id=(SELECT customer_id FROM service_smoke_context);
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE svc public.service; context record; v jsonb; q jsonb; starts timestamptz:=now()+interval '31 days'; room uuid; BEGIN
 SELECT * INTO context FROM service_smoke_context;
 FOR svc IN SELECT * FROM public.service WHERE service_code IN ('SVC-SPA-01','SVC-TAX-02','SVC-HTL-07') LOOP
  v:=jsonb_build_object('pet_id',context.pet_id,'service_id',svc.id,'scheduled_start_at',starts);
  IF svc.trip_type IS NOT NULL THEN v:=v||jsonb_build_object('pickup_address','Điểm đón','dropoff_address','Điểm trả','distance_km',15,'trip_type',svc.trip_type,'return_at',starts+interval '3 hours'); END IF;
  IF svc.service_code='SVC-HTL-07' THEN
   SELECT r.id INTO room FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id WHERE t.service_id=svc.id AND r.status IN ('active','available') LIMIT 1;
   v:=v||jsonb_build_object('room_id',room,'check_out_at',starts+interval '3 hours');
  END IF;
  q:=public.quote_own_service_booking(v);
  IF (q->>'total')::numeric<>(CASE svc.service_code WHEN 'SVC-SPA-01' THEN 170000 WHEN 'SVC-TAX-02' THEN 450000 ELSE 300000 END) THEN RAISE EXCEPTION 'Customer quote mismatch: %',svc.service_code; END IF;
 END LOOP;
END $$;
RESET ROLE;
DO $$ DECLARE count_value integer; svc uuid; BEGIN
 SELECT id INTO svc FROM public.service WHERE service_code='SVC-TAX-02';
 SELECT count(*) INTO count_value FROM public.taxi_price_rule WHERE service_id=svc AND status='active' AND effective_to IS NULL AND 99>=weight_from AND (99<weight_to OR (weight_to_inclusive AND 99=weight_to)) AND 20>=distance_from AND (20<distance_to OR (distance_to_inclusive AND 20=distance_to));
 IF count_value<>1 THEN RAISE EXCEPTION '99kg/20km boundary must match exactly once'; END IF;
 SELECT count(*) INTO count_value FROM public.taxi_price_rule WHERE service_id=svc AND status='active' AND effective_to IS NULL AND 10>=weight_from AND (10<weight_to OR (weight_to_inclusive AND 10=weight_to)) AND 15>=distance_from AND (15<distance_to OR (distance_to_inclusive AND 15=distance_to));
 IF count_value<>1 THEN RAISE EXCEPTION '10kg/15km boundary must match exactly once'; END IF;
END $$;
ROLLBACK TO SAVEPOINT service_catalog_smoke;
RELEASE SAVEPOINT service_catalog_smoke;
