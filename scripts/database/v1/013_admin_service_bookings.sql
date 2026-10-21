BEGIN;
-- Writes use the existing V1 entities and the caller's table permissions/RLS.
CREATE OR REPLACE FUNCTION public.create_admin_service_booking(p_id uuid,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment; pet public.pet_profile; svc public.service; actor uuid;
 owner uuid:=(p_details->>'customer_id')::uuid; pet_key uuid:=(p_details->>'pet_id')::uuid;
 service_key uuid:=(p_details->>'service_id')::uuid; staff_key uuid:=nullif(p_details->>'staff_id','')::uuid;
 starts timestamptz:=(p_details->>'scheduled_start_at')::timestamptz; ends timestamptz;
 weight_value numeric; price_value numeric; category text; rule public.taxi_price_rule;
 matching integer; distance_value numeric:=nullif(p_details->>'distance_km','')::numeric;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('appointment_item.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_details IS NULL OR owner IS NULL OR pet_key IS NULL OR service_key IS NULL OR starts IS NULL OR NOT isfinite(starts)
 OR length(p_details->>'note')>4000 THEN RAISE EXCEPTION 'invalid_booking_details' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.customer WHERE id=owner AND customer_status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'active_customer_required' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,20));
 SELECT * INTO a FROM public.appointment WHERE id=p_id;
 IF FOUND THEN
  IF NOT EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND entity_name='appointment' AND action='CREATE_APPOINTMENT' AND description=p_details::text) THEN RAISE EXCEPTION 'booking_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 IF starts<=now() THEN RAISE EXCEPTION 'future_booking_required' USING ERRCODE='22023'; END IF;
 SELECT * INTO pet FROM public.pet_profile WHERE id=pet_key AND customer_id=owner AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'pet_owner_mismatch' USING ERRCODE='22023'; END IF;
 SELECT * INTO svc FROM public.service WHERE id=service_key AND status='active' FOR SHARE;
 IF NOT FOUND OR svc.estimated_duration<=0 THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_breed b ON b.species_id=ss.species_id WHERE ss.service_id=service_key AND b.id=pet.breed_id) THEN RAISE EXCEPTION 'service_species_not_supported' USING ERRCODE='22023'; END IF;
 SELECT category_code INTO category FROM public.service_category WHERE id=svc.category_id;
 IF category='pet_hotel' THEN RAISE EXCEPTION 'hotel_requires_room_reservation' USING ERRCODE='22023'; END IF;
 ends:=starts+make_interval(mins=>svc.estimated_duration);
 SELECT weight INTO weight_value FROM public.pet_current_weight WHERE pet_id=pet_key;
 IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
 IF category='pet_taxi' THEN
  IF NOT pawpal_private.has_permission('taxi_trip.write') THEN RAISE EXCEPTION 'taxi_write_forbidden' USING ERRCODE='42501'; END IF;
  IF coalesce(length(btrim(p_details->>'pickup_address')),0) NOT BETWEEN 1 AND 1000 OR coalesce(length(btrim(p_details->>'dropoff_address')),0) NOT BETWEEN 1 AND 1000
   OR distance_value IS NULL OR distance_value::text IN ('NaN','Infinity','-Infinity') OR distance_value<=0 OR (p_details->>'trip_type') IS DISTINCT FROM 'one_way' THEN RAISE EXCEPTION 'invalid_taxi_details' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO matching FROM public.taxi_price_rule WHERE status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts);
  IF matching<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_price' USING ERRCODE='22023'; END IF;
  SELECT * INTO rule FROM public.taxi_price_rule WHERE status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts) FOR SHARE;
  price_value:=rule.base_price+rule.surcharge;
 ELSE
  SELECT count(*) INTO matching FROM public.service_price_matrix WHERE service_id=service_key AND status='active' AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts);
  IF matching<>1 THEN RAISE EXCEPTION 'ambiguous_service_price' USING ERRCODE='22023'; END IF;
  SELECT unit_price INTO price_value FROM public.service_price_matrix WHERE service_id=service_key AND status='active' AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts) FOR SHARE;
 END IF;
 IF price_value IS NULL OR price_value<0 OR price_value::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'invalid_service_price'; END IF;
 IF staff_key IS NOT NULL THEN
  PERFORM 1 FROM public.staff s WHERE s.id=staff_key AND s.employment_status='active' AND NOT s.service_locked AND (svc.staff_level_required_id IS NULL OR EXISTS(SELECT 1 FROM public.staff_level actual JOIN public.staff_level required ON required.id=svc.staff_level_required_id WHERE actual.id=s.staff_level_id AND actual.rank_order>=required.rank_order)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment WHERE staff_id=staff_key AND appointment_status NOT IN ('cancelled','no_show','completed') AND scheduled_start_at<ends AND scheduled_end_at>starts) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
 END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,staff_id,scheduled_start_at,scheduled_end_at,appointment_status,change_count,note)
 VALUES(p_id,'BKG-'||upper(replace(p_id::text,'-','')),owner,pet_key,staff_key,starts,ends,'pending',0,nullif(btrim(p_details->>'note'),''));
 INSERT INTO public.appointment_item(appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,discount_amount,duration_minutes,weight_snapshot,staff_id,status)
 VALUES(p_id,service_key,true,svc.service_name,1,price_value,0,svc.estimated_duration,weight_value,staff_key,'pending');
 IF category='pet_taxi' THEN
  INSERT INTO public.taxi_trip(appointment_id,driver_staff_id,pickup_address,dropoff_address,distance_km,trip_type,outbound_at,taxi_price_rule_id,quoted_amount,status)
  VALUES(p_id,staff_key,btrim(p_details->>'pickup_address'),btrim(p_details->>'dropoff_address'),distance_value,'one_way',starts,rule.id,price_value,'pending');
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'CREATE_APPOINTMENT','appointment',p_id,p_details::text);
 RETURN p_id;
END $$;

CREATE OR REPLACE FUNCTION public.update_admin_service_booking(p_id uuid,p_expected_updated_at timestamptz,p_action text,p_value text,p_reason text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment; actor uuid; staff_key uuid; svc public.service;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('audit_log.write') OR NOT pawpal_private.has_permission('payment.read') THEN RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501'; END IF;
 IF p_action='assign' THEN
  staff_key:=p_value::uuid;
  PERFORM 1 FROM public.staff WHERE id=staff_key AND employment_status='active' AND NOT service_locked FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='22023'; END IF;
 END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected_updated_at IS NULL OR a.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
 IF length(p_reason)>2000 THEN RAISE EXCEPTION 'invalid_reason' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF p_action='status' THEN
  IF NOT ((a.appointment_status='pending' AND p_value IN ('confirmed','cancelled')) OR (a.appointment_status='confirmed' AND p_value IN ('checked_in','cancelled','no_show')) OR (a.appointment_status='checked_in' AND p_value='cancelled') OR (a.appointment_status='no_show' AND p_value='cancelled')) THEN RAISE EXCEPTION 'invalid_booking_transition' USING ERRCODE='22023'; END IF;
  IF p_value='no_show' AND a.scheduled_start_at>now() THEN RAISE EXCEPTION 'booking_has_not_started' USING ERRCODE='22023'; END IF;
  IF p_value='cancelled' AND coalesce(length(btrim(p_reason)),0)=0 THEN RAISE EXCEPTION 'cancellation_reason_required' USING ERRCODE='22023'; END IF;
  IF p_value='cancelled' AND EXISTS(SELECT 1 FROM public.payment WHERE appointment_id=p_id AND transaction_status='succeeded') THEN RAISE EXCEPTION 'paid_booking_requires_refund_workflow' USING ERRCODE='22023'; END IF;
  UPDATE public.appointment SET appointment_status=p_value,check_in_time=CASE WHEN p_value='checked_in' THEN now() ELSE check_in_time END WHERE id=p_id;
 ELSEIF p_action='assign' THEN
  IF a.appointment_status NOT IN ('pending','confirmed','checked_in','in_progress') OR coalesce(length(btrim(p_reason)),0)=0 THEN RAISE EXCEPTION 'invalid_staff_assignment' USING ERRCODE='22023'; END IF;
  SELECT s.* INTO svc FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id WHERE i.appointment_id=p_id AND i.is_primary;
  IF svc.staff_level_required_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff s JOIN public.staff_level actual ON actual.id=s.staff_level_id JOIN public.staff_level required ON required.id=svc.staff_level_required_id WHERE s.id=staff_key AND actual.rank_order>=required.rank_order) THEN RAISE EXCEPTION 'staff_level_required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment WHERE id<>p_id AND staff_id=staff_key AND appointment_status NOT IN ('cancelled','no_show','completed') AND scheduled_start_at<a.scheduled_end_at AND scheduled_end_at>a.scheduled_start_at) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
  UPDATE public.appointment SET staff_id=staff_key WHERE id=p_id;
 ELSE RAISE EXCEPTION 'invalid_booking_action' USING ERRCODE='22023'; END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'UPDATE_APPOINTMENT','appointment',p_id,jsonb_build_object('action',p_action,'value',p_value,'reason',btrim(p_reason))::text);
 RETURN p_id;
END $$;

CREATE OR REPLACE FUNCTION public.reply_admin_service_review(p_review_id uuid,p_response_id uuid,p_expected_updated_at timestamptz,p_text text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; latest public.review_response; result uuid;
BEGIN
 IF NOT pawpal_private.has_permission('review_response.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'review_reply_forbidden' USING ERRCODE='42501'; END IF;
 IF coalesce(length(btrim(p_text)),0) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'invalid_review_reply' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.review WHERE id=p_review_id AND appointment_item_id IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'service_review_not_found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO latest FROM public.review_response WHERE review_id=p_review_id ORDER BY updated_at DESC,id LIMIT 1 FOR UPDATE;
 IF latest.id IS DISTINCT FROM p_response_id OR latest.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'review_reply_changed' USING ERRCODE='PT409'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF latest.id IS NULL THEN
  INSERT INTO public.review_response(review_id,staff_id,response_content) VALUES(p_review_id,actor,btrim(p_text)) RETURNING id INTO result;
 ELSE
  UPDATE public.review_response SET staff_id=actor,response_content=btrim(p_text) WHERE id=latest.id RETURNING id INTO result;
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'REPLY_REVIEW','review_response',result,'Lưu phản hồi đánh giá dịch vụ.');
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.save_admin_service_catalog(p_id uuid,p_expected_updated_at timestamptz,p_details jsonb,p_prices jsonb DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE old public.service; actor uuid; category_key uuid; level_key uuid:=nullif(p_details->>'staff_level_id','')::uuid;
 duration_value integer:=(p_details->>'duration_minutes')::integer; commission_value numeric:=nullif(p_details->>'commission_rate','')::numeric;
 code_value text:=btrim(p_details->>'service_code'); name_value text:=btrim(p_details->>'service_name');
 species jsonb; step jsonb; action_key uuid; sequence integer:=0; price jsonb; price_count integer; previous_to numeric:=0;
 now_at timestamptz:=clock_timestamp();
BEGIN
 IF NOT pawpal_private.has_permission('service.write') OR NOT pawpal_private.has_permission('service_supported_species.write') OR NOT pawpal_private.has_permission('service_care_action.write') OR NOT pawpal_private.has_permission('care_action.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'service_catalog_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_details IS NULL OR coalesce(length(code_value),0) NOT BETWEEN 1 AND 80 OR coalesce(length(name_value),0) NOT BETWEEN 1 AND 200 OR duration_value IS NULL OR duration_value NOT BETWEEN 1 AND 10080
 OR coalesce(p_details->>'status','') NOT IN ('active','inactive') OR (commission_value IS NOT NULL AND (commission_value::text IN ('NaN','Infinity','-Infinity') OR commission_value<0 OR commission_value>100))
 OR jsonb_typeof(p_details->'species_ids') IS DISTINCT FROM 'array' OR jsonb_array_length(p_details->'species_ids')=0
 OR jsonb_typeof(p_details->'steps') IS DISTINCT FROM 'array' OR jsonb_array_length(p_details->'steps')>100
 OR length(p_details->>'description')>8000 THEN RAISE EXCEPTION 'invalid_service_catalog' USING ERRCODE='22023'; END IF;
 SELECT id INTO category_key FROM public.service_category WHERE category_code=p_details->>'category_code';
 IF category_key IS NULL OR (level_key IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff_level WHERE id=level_key AND is_active)) THEN RAISE EXCEPTION 'invalid_service_catalog_reference' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,21));
 SELECT * INTO old FROM public.service WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF p_expected_updated_at IS NULL OR old.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'service_catalog_changed' USING ERRCODE='PT409'; END IF;
 ELSIF p_expected_updated_at IS NOT NULL THEN RAISE EXCEPTION 'service_not_found' USING ERRCODE='P0002'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF old.id IS NULL THEN
  INSERT INTO public.service(id,service_code,service_name,description,estimated_duration,status,commission_rate,category_id,staff_level_required_id)
  VALUES(p_id,code_value,name_value,nullif(btrim(p_details->>'description'),''),duration_value,p_details->>'status',commission_value,category_key,level_key);
 ELSE
  UPDATE public.service SET service_code=code_value,service_name=name_value,description=nullif(btrim(p_details->>'description'),''),estimated_duration=duration_value,status=p_details->>'status',commission_rate=commission_value,category_id=category_key,staff_level_required_id=level_key WHERE id=p_id;
 END IF;
 DELETE FROM public.service_supported_species WHERE service_id=p_id;
 FOR species IN SELECT DISTINCT value FROM jsonb_array_elements(p_details->'species_ids') LOOP
  IF NOT EXISTS(SELECT 1 FROM public.pet_species WHERE id=(species#>>'{}')::uuid AND is_active) THEN RAISE EXCEPTION 'invalid_service_species' USING ERRCODE='22023'; END IF;
  INSERT INTO public.service_supported_species(service_id,species_id) VALUES(p_id,(species#>>'{}')::uuid);
 END LOOP;
 DELETE FROM public.service_care_action WHERE service_id=p_id;
 FOR step IN SELECT value FROM jsonb_array_elements(p_details->'steps') LOOP
  IF coalesce(length(btrim(step#>>'{}')),0) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'invalid_service_step' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(lower(btrim(step#>>'{}')),22));
  SELECT id INTO action_key FROM public.care_action WHERE lower(btrim(action_name))=lower(btrim(step#>>'{}')) AND is_active ORDER BY id LIMIT 1;
  IF action_key IS NULL THEN INSERT INTO public.care_action(action_name,is_active) VALUES(btrim(step#>>'{}'),true) RETURNING id INTO action_key; END IF;
  INSERT INTO public.service_care_action(service_id,care_action_id,display_order,estimated_duration) VALUES(p_id,action_key,sequence,0);
  sequence:=sequence+1;
 END LOOP;
 IF p_prices IS NOT NULL THEN
  IF NOT pawpal_private.has_permission('service_price_matrix.write') THEN RAISE EXCEPTION 'service_price_forbidden' USING ERRCODE='42501'; END IF;
  IF p_details->>'category_code'<>'grooming_spa' OR jsonb_typeof(p_prices)<>'array' OR jsonb_array_length(p_prices) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'invalid_service_prices' USING ERRCODE='22023'; END IF;
  price_count:=jsonb_array_length(p_prices);sequence:=0;
  FOR price IN SELECT value FROM jsonb_array_elements(p_prices) LOOP
   sequence:=sequence+1;
   IF (price->>'weight_from')::numeric IS DISTINCT FROM previous_to OR (price->>'unit_price') IS NULL OR (price->>'unit_price')::numeric::text IN ('NaN','Infinity','-Infinity') OR (price->>'unit_price')::numeric<0
    OR (sequence<price_count AND ((price->>'weight_to') IS NULL OR (price->>'weight_to')::numeric::text IN ('NaN','Infinity','-Infinity') OR (price->>'weight_to')::numeric<=previous_to))
    OR (sequence=price_count AND price->>'weight_to' IS NOT NULL) THEN RAISE EXCEPTION 'invalid_service_price_ranges' USING ERRCODE='22023'; END IF;
   previous_to:=(price->>'weight_to')::numeric;
  END LOOP;
  IF EXISTS(SELECT 1 FROM public.service_price_matrix WHERE service_id=p_id AND status='active' AND effective_from>=now_at) THEN RAISE EXCEPTION 'scheduled_service_price_requires_review' USING ERRCODE='PT409'; END IF;
  UPDATE public.service_price_matrix SET effective_to=now_at WHERE service_id=p_id AND status='active' AND effective_from<now_at AND (effective_to IS NULL OR effective_to>now_at);
  FOR price IN SELECT value FROM jsonb_array_elements(p_prices) LOOP
   INSERT INTO public.service_price_matrix(service_id,weight_from,weight_to,unit_price,effective_from,status)
   VALUES(p_id,(price->>'weight_from')::numeric,(price->>'weight_to')::numeric,(price->>'unit_price')::numeric,now_at,'active');
  END LOOP;
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SAVE_SERVICE_CATALOG','service',p_id,'Lưu danh mục, loài hỗ trợ, quy trình và bảng giá trong cùng giao dịch.');
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.create_admin_service_booking(uuid,jsonb),public.update_admin_service_booking(uuid,timestamptz,text,text,text),public.reply_admin_service_review(uuid,uuid,timestamptz,text),public.save_admin_service_catalog(uuid,timestamptz,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_admin_service_booking(uuid,jsonb),public.update_admin_service_booking(uuid,timestamptz,text,text,text),public.reply_admin_service_review(uuid,uuid,timestamptz,text),public.save_admin_service_catalog(uuid,timestamptz,jsonb,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
