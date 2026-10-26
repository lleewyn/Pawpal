-- All fixtures live inside the outer transaction, always rolled back by the runner.
DO $$ DECLARE u uuid:=gen_random_uuid(); s uuid:=gen_random_uuid(); p uuid:=gen_random_uuid(); cat uuid; v uuid; i integer; a uuid:=gen_random_uuid(); pet uuid; customer uuid; svc uuid; session_key uuid:=gen_random_uuid(); other_user uuid:=gen_random_uuid(); other_staff uuid:=gen_random_uuid(); BEGIN
 INSERT INTO auth.users(id) VALUES(u);
 INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(s,'Kiểm tra Copilot','QA',u,'active',false);
 INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');
 PERFORM set_config('request.jwt.claim.sub',u::text,true);
 INSERT INTO auth.users(id) VALUES(other_user);
 INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password) VALUES(other_staff,'Nhân viên khác','QA',other_user,'active',false);
 FOR i IN 1..7 LOOP
  INSERT INTO public.admin_copilot_history(staff_id,session_id,role,content,metadata) VALUES(s,session_key,'user',repeat('x',1500),'{}');
 END LOOP;
 INSERT INTO public.admin_copilot_history(staff_id,session_id,role,content,metadata) VALUES(other_staff,session_key,'assistant','SECRET-OTHER','{}');
 PERFORM set_config('pawpal.test.copilot_session',session_key::text,true);
 SELECT id INTO cat FROM public.product_category ORDER BY id LIMIT 1;
 INSERT INTO public.product(id,category_id,product_name,slug,unit,status) VALUES(p,cat,'Kiểm tra Copilot','copilot-test-'||p,'Cái','active');
 FOR i IN 1..27 LOOP
  v:=gen_random_uuid();
  INSERT INTO public.product_variant(id,product_id,sku_variant,variant_name,cost_price,sale_price,status) VALUES(v,p,'CP-TEST-'||v,i::text,1,2,'active');
  INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,note,idempotency_key) VALUES(v,'opening',CASE WHEN i=27 THEN 4 ELSE 2 END,'Kiểm tra hoàn tác','cp-test:'||v);
  UPDATE public.inventory SET minimum_stock=CASE WHEN i=26 THEN 2 ELSE 3 END WHERE product_variant_id=v;
 END LOOP;
 SELECT p.id,p.customer_id INTO pet,customer FROM public.pet_profile p WHERE p.status='active' ORDER BY p.id LIMIT 1;
 SELECT s.id INTO svc FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE c.category_code='grooming_spa' AND s.status='active' LIMIT 1;
 IF pet IS NULL OR svc IS NULL THEN RAISE EXCEPTION 'Existing pet and spa service needed for bounded fixtures'; END IF;
 INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at,appointment_status) VALUES(a,'CP-TEST-'||a,customer,pet,'2031-04-01T00:00:00+07:00','2031-04-01T02:00:00+07:00','confirmed');
 INSERT INTO public.appointment_item(appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,duration_minutes,status)
 VALUES(a,svc,true,'Kiểm tra một',1,1,30,'confirmed'),(a,svc,false,'Kiểm tra hai',1,1,30,'confirmed');
 a:=gen_random_uuid();
 INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at,appointment_status) VALUES(a,'CP-TEST-'||a,customer,pet,'2031-04-02T00:00:00+07:00','2031-04-02T02:00:00+07:00','confirmed');
 INSERT INTO public.appointment_item(appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,duration_minutes,status) VALUES(a,svc,true,'Ngoài ngày',1,1,30,'confirmed');
END $$;
SET LOCAL ROLE authenticated;
DO $$ DECLARE r jsonb; expected bigint; BEGIN
 r:=public.admin_copilot_recent_context(current_setting('pawpal.test.copilot_session')::uuid);
 IF jsonb_array_length(r)<>6 OR EXISTS(SELECT 1 FROM jsonb_array_elements(r) x WHERE length(x->>'content')>1200 OR x->>'content'='SECRET-OTHER') THEN RAISE EXCEPTION 'Actor context scope/byte cap failed'; END IF;
 r:=public.admin_copilot_facts('inventory.low_stock','{}');
 SELECT count(*) INTO expected FROM public.inventory i JOIN public.product_variant v ON v.id=i.product_variant_id JOIN public.product p ON p.id=v.product_id WHERE i.quantity_in_stock<i.minimum_stock AND v.status='active' AND p.status='active' AND NOT v.catalog_retired;
 IF (r->>'total')::bigint<>expected OR expected<25 OR jsonb_array_length(r->'items')<>20 THEN RAISE EXCEPTION 'Exact SKU total and limited list mismatch'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(r->'items') x WHERE (x->>'stock')::integer>=(x->>'minimum')::integer) THEN RAISE EXCEPTION 'Equality/above threshold incorrectly included'; END IF;
 r:=public.admin_copilot_facts('appointment.list','{"start_at":"2031-04-01T00:00:00+07:00","end_at":"2031-04-02T00:00:00+07:00","category":"grooming_spa","status":"confirmed"}');
 SELECT count(DISTINCT a.id) INTO expected FROM public.appointment a JOIN public.appointment_item i ON i.appointment_id=a.id JOIN public.service s ON s.id=i.service_id JOIN public.service_category c ON c.id=s.category_id WHERE a.scheduled_start_at>='2031-04-01T00:00:00+07:00' AND a.scheduled_start_at<'2031-04-02T00:00:00+07:00' AND a.appointment_status='confirmed' AND c.category_code='grooming_spa' AND i.status<>'cancelled';
 IF (r->>'total')::bigint<>expected OR expected<1 THEN RAISE EXCEPTION 'Distinct appointment/date oracle mismatch'; END IF;
 BEGIN PERFORM public.admin_copilot_facts('arbitrary.sql','{}');RAISE EXCEPTION 'Unsupported intent accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 BEGIN PERFORM public.admin_copilot_facts('appointment.list','{"start_at":"2031-04-01","end_at":"2032-04-01"}');RAISE EXCEPTION 'Unbounded range accepted';EXCEPTION WHEN invalid_parameter_value THEN NULL;END;
 PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 BEGIN PERFORM public.admin_copilot_facts('inventory.low_stock','{}');RAISE EXCEPTION 'Non-staff caller accepted';EXCEPTION WHEN insufficient_privilege THEN NULL;END;
END $$;
RESET ROLE;
