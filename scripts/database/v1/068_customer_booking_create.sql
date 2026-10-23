BEGIN;
CREATE OR REPLACE FUNCTION public.customer_service_catalog()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('services',coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'code',s.service_code,'name',s.service_name,
  'description',s.description,'duration',s.estimated_duration,'category',c.category_code,
  'species_ids',coalesce((SELECT jsonb_agg(species_id ORDER BY species_id) FROM public.service_supported_species WHERE service_id=s.id),'[]'::jsonb),
  'addons',coalesce((SELECT jsonb_agg(jsonb_build_object('id',x.id,'name',x.addon_name,'price',x.price,'duration',x.estimated_duration,'required',x.is_required) ORDER BY x.id)
   FROM public.service_addon x WHERE x.service_id=s.id AND x.status='active'),'[]'::jsonb)) ORDER BY s.service_name)
  FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE s.status='active'),'[]'::jsonb),
 'rooms',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'name',r.room_number,'type',t.room_type,'daily_price',t.daily_price) ORDER BY r.room_number)
  FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id WHERE r.status IN ('active','available') AND t.status='active'),'[]'::jsonb));
$$;
CREATE OR REPLACE FUNCTION public.own_booking_pets()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.pet_name,'species_id',b.species_id,'species',s.species_name,'breed',b.breed_name,
  'weight',w.weight,'allergy',p.allergy,'safety_note',p.safety_note) ORDER BY p.pet_name),'[]'::jsonb)
 FROM public.pet_profile p JOIN public.pet_breed b ON b.id=p.breed_id JOIN public.pet_species s ON s.id=b.species_id
 LEFT JOIN public.pet_current_weight w ON w.pet_id=p.id
 WHERE p.status='active' AND pawpal_private.owns_customer(p.customer_id) AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid());
$$;
CREATE OR REPLACE FUNCTION pawpal_private.customer_new_booking_quote(p_details jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; pet public.pet_profile; svc public.service; kind text; starts timestamptz; ends timestamptz; back_at timestamptz;
 room public.hotel_room; room_type public.hotel_room_type; weight_value numeric; distance_value numeric; qty integer:=1; unit_value numeric;
 rules integer; rule_key uuid; back_key uuid; total numeric; addon public.service_addon; addon_id uuid; addons jsonb:='[]';
 addon_ids jsonb; base_duration integer; extra_duration integer:=0; core jsonb; context jsonb; result jsonb;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id) FOR UPDATE;
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'customer_session_required' USING ERRCODE='42501'; END IF;
 IF p_details IS NULL OR jsonb_typeof(p_details)<>'object' OR length(p_details::text)>16000 OR length(p_details->>'note')>4000 THEN RAISE EXCEPTION 'invalid_booking_details' USING ERRCODE='22023'; END IF;
 starts:=(p_details->>'scheduled_start_at')::timestamptz;
 IF starts IS NULL OR NOT isfinite(starts) OR starts<=now() THEN RAISE EXCEPTION 'future_booking_required' USING ERRCODE='22023'; END IF;
 SELECT * INTO pet FROM public.pet_profile WHERE id=(p_details->>'pet_id')::uuid AND customer_id=owner_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'pet_owner_mismatch' USING ERRCODE='42501'; END IF;
 SELECT * INTO svc FROM public.service WHERE id=(p_details->>'service_id')::uuid AND status='active' FOR SHARE;
 IF NOT FOUND OR svc.estimated_duration<=0 THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_breed b ON b.species_id=ss.species_id WHERE ss.service_id=svc.id AND b.id=pet.breed_id) THEN RAISE EXCEPTION 'service_species_not_supported' USING ERRCODE='22023'; END IF;
 SELECT category_code INTO kind FROM public.service_category WHERE id=svc.category_id;
 SELECT weight INTO weight_value FROM public.pet_current_weight WHERE pet_id=pet.id;
 base_duration:=svc.estimated_duration;
 core:=jsonb_build_object('customer_id',owner_id,'pet_id',pet.id,'service_id',svc.id,'scheduled_start_at',starts,'note',nullif(btrim(p_details->>'note'),''));
 context:=jsonb_build_object('service_updated_at',svc.updated_at,'weight',weight_value,'species',pet.breed_id);
 LOCK TABLE public.service_price_matrix,public.taxi_price_rule IN SHARE MODE;
 IF kind='grooming_spa' THEN
  IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
  SELECT count(*),min(id::text)::uuid INTO rules,rule_key FROM public.service_price_matrix WHERE service_id=svc.id AND status='active'
   AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts);
  IF rules<>1 THEN RAISE EXCEPTION 'ambiguous_service_price' USING ERRCODE='22023'; END IF;
  SELECT unit_price INTO unit_value FROM public.service_price_matrix WHERE id=rule_key;
  ends:=starts+make_interval(mins=>base_duration);
 ELSIF kind='pet_hotel' THEN
  ends:=(p_details->>'check_out_at')::timestamptz;
  IF ends IS NULL OR NOT isfinite(ends) OR ends<=starts OR length(p_details->>'diet_notes')>4000 OR length(p_details->>'care_notes')>4000 THEN RAISE EXCEPTION 'invalid_hotel_stay' USING ERRCODE='22023'; END IF;
  SELECT * INTO room FROM public.hotel_room WHERE id=(p_details->>'room_id')::uuid AND status IN ('active','available') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hotel_room_unavailable' USING ERRCODE='PT409'; END IF;
  SELECT * INTO room_type FROM public.hotel_room_type WHERE id=room.room_type_id AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hotel_room_unavailable' USING ERRCODE='PT409'; END IF;
  IF EXISTS(SELECT 1 FROM public.hotel_booking WHERE room_id=room.id AND status NOT IN ('cancelled','closed') AND check_in_at<ends AND check_out_at>starts) THEN RAISE EXCEPTION 'hotel_room_conflict' USING ERRCODE='PT409'; END IF;
  qty:=ceil(extract(epoch FROM (ends-starts))/86400)::integer;unit_value:=room_type.daily_price;
  core:=core||jsonb_build_object('room_id',room.id,'check_out_at',ends,'diet_notes',p_details->>'diet_notes','care_notes',p_details->>'care_notes');
  context:=context||jsonb_build_object('room_type_updated_at',room_type.updated_at);
 ELSIF kind='pet_taxi' THEN
  distance_value:=(p_details->>'distance_km')::numeric;back_at:=nullif(p_details->>'return_at','')::timestamptz;
  IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
  IF coalesce(length(btrim(p_details->>'pickup_address')),0) NOT BETWEEN 1 AND 1000 OR coalesce(length(btrim(p_details->>'dropoff_address')),0) NOT BETWEEN 1 AND 1000
   OR distance_value IS NULL OR distance_value<=0 OR distance_value::text IN ('NaN','Infinity','-Infinity') OR coalesce(p_details->>'trip_type','') NOT IN ('one_way','round_trip') THEN RAISE EXCEPTION 'invalid_taxi_details' USING ERRCODE='22023'; END IF;
  IF (p_details->>'trip_type'='round_trip' AND (back_at IS NULL OR NOT isfinite(back_at) OR back_at<starts+make_interval(mins=>base_duration)))
   OR (p_details->>'trip_type'='one_way' AND back_at IS NOT NULL) THEN RAISE EXCEPTION 'invalid_taxi_return' USING ERRCODE='22023'; END IF;
  SELECT count(*),min(id::text)::uuid INTO rules,rule_key FROM public.taxi_price_rule WHERE status='active'
   AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to)
   AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts);
  IF rules<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_price' USING ERRCODE='22023'; END IF;
  SELECT base_price+surcharge INTO unit_value FROM public.taxi_price_rule WHERE id=rule_key;
  IF p_details->>'trip_type'='round_trip' THEN
   SELECT count(*),min(id::text)::uuid INTO rules,back_key FROM public.taxi_price_rule WHERE status='active'
    AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to)
    AND effective_from<=back_at AND (effective_to IS NULL OR effective_to>back_at);
   IF rules<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_price' USING ERRCODE='22023'; END IF;
   SELECT unit_value+base_price+surcharge INTO unit_value FROM public.taxi_price_rule WHERE id=back_key;
  END IF;
  ends:=coalesce(back_at,starts)+make_interval(mins=>base_duration);
  core:=core||jsonb_build_object('pickup_address',btrim(p_details->>'pickup_address'),'dropoff_address',btrim(p_details->>'dropoff_address'),
   'distance_km',distance_value,'trip_type',p_details->>'trip_type','return_at',back_at);
 ELSE RAISE EXCEPTION 'invalid_service_category' USING ERRCODE='22023'; END IF;
 IF unit_value IS NULL OR unit_value<0 OR unit_value::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'invalid_service_price' USING ERRCODE='22023'; END IF;
 total:=unit_value*qty;
 addon_ids:=coalesce(p_details->'addon_ids','[]');
 IF jsonb_typeof(addon_ids)<>'array' OR jsonb_array_length(addon_ids)>50 THEN RAISE EXCEPTION 'invalid_service_addons' USING ERRCODE='22023'; END IF;
 FOR addon_id IN SELECT DISTINCT (value#>>'{}')::uuid FROM jsonb_array_elements(addon_ids) ORDER BY 1 LOOP
  SELECT * INTO addon FROM public.service_addon WHERE id=addon_id AND service_id=svc.id AND status='active' FOR SHARE;
  IF NOT FOUND OR addon.price<0 OR addon.price::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'invalid_service_addons' USING ERRCODE='22023'; END IF;
  addons:=addons||jsonb_build_array(jsonb_build_object('id',addon.id,'name',addon.addon_name,'price',addon.price,'duration',addon.estimated_duration,'updated_at',addon.updated_at));
  total:=total+addon.price;extra_duration:=extra_duration+addon.estimated_duration;
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.service_addon x WHERE x.service_id=svc.id AND x.status='active' AND x.is_required AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(addons) v WHERE v->>'id'=x.id::text)) THEN RAISE EXCEPTION 'required_addon_missing' USING ERRCODE='22023'; END IF;
 IF kind='grooming_spa' THEN ends:=ends+make_interval(mins=>extra_duration); END IF;
 result:=jsonb_build_object('core',core,'category',kind,'start_at',starts,'end_at',ends,'unit_price',unit_value,'quantity',qty,'total',total,'weight',weight_value,'addons',addons,
  'context',context||jsonb_build_object('price_rule',rule_key,'return_rule',back_key));
 RETURN result||jsonb_build_object('version',md5(result::text));
END $$;
REVOKE ALL ON FUNCTION pawpal_private.customer_new_booking_quote(jsonb) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.quote_own_service_booking(p_details jsonb)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$ SELECT pawpal_private.customer_new_booking_quote(p_details) $$;
-- Reuse the existing reviewed creation engines, with a narrower owner entry
-- guard and no client-specified staff. Private copies cannot be called by clients.
DO $$ DECLARE body text; fn text; target text; guard text:=$old$IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('appointment_item.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501'; END IF;$old$;
BEGIN
 FOREACH fn IN ARRAY ARRAY['create_admin_service_booking','create_admin_logistics_booking'] LOOP
  SELECT pg_get_functiondef(format('public.%I(uuid,jsonb)',fn)::regprocedure) INTO body;
  IF position(guard IN body)=0 THEN RAISE EXCEPTION 'Unexpected booking engine guard'; END IF;
  target:=CASE WHEN fn='create_admin_service_booking' THEN 'create_customer_service_core' ELSE 'create_customer_logistics_core' END;
  body:=replace(body,'FUNCTION public.'||fn,'FUNCTION pawpal_private.'||target);
  body:=replace(body,guard,$new$IF NOT pawpal_private.owns_customer(owner) OR staff_key IS NOT NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'booking_owner_required' USING ERRCODE='42501'; END IF;$new$);
  body:=replace(body,$old$IF NOT pawpal_private.has_permission('hotel_booking.write') THEN RAISE EXCEPTION 'logistics_write_forbidden' USING ERRCODE='42501'; END IF;$old$,'');
  body:=replace(body,$old$IF NOT pawpal_private.has_permission('taxi_trip.write') THEN RAISE EXCEPTION 'logistics_write_forbidden' USING ERRCODE='42501'; END IF;$old$,'');
  EXECUTE body;EXECUTE format('REVOKE ALL ON FUNCTION pawpal_private.%I(uuid,jsonb) FROM PUBLIC,anon,authenticated',target);
 END LOOP;
 SELECT pg_get_functiondef('pawpal_private.audit_actor()'::regprocedure) INTO body;
 IF position('CUSTOMER_BOOKING_CREATE' IN body)=0 THEN
  guard:=$old$ELSIF NEW.entity_name='appointment' AND NEW.action='CUSTOMER_RESCHEDULE_APPOINTMENT'$old$;
  IF position(guard IN body)=0 THEN RAISE EXCEPTION 'Unexpected audit actor definition'; END IF;
  EXECUTE replace(body,guard,$new$ELSIF NEW.entity_name='appointment' AND NEW.action IN ('CUSTOMER_BOOKING_CREATE','CREATE_APPOINTMENT','CREATE_LOGISTICS_BOOKING','LOGISTICS_QUOTE')
   AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid())
   AND EXISTS(SELECT 1 FROM public.appointment a WHERE a.id=NEW.entity_id AND a.appointment_status='pending' AND a.staff_id IS NULL AND pawpal_private.owns_customer(a.customer_id)) THEN RETURN NEW;
   ELSIF NEW.entity_name='appointment' AND NEW.action='CUSTOMER_RESCHEDULE_APPOINTMENT'$new$);
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.create_own_service_booking(p_id uuid,p_expected_quote text,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; a public.appointment; previous public.audit_log; quote jsonb; addon jsonb; base_total numeric;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id) FOR UPDATE;
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'customer_session_required' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_expected_quote IS NULL OR p_details IS NULL OR length(p_details::text)>16000 THEN RAISE EXCEPTION 'invalid_booking_details' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,68));
 SELECT * INTO a FROM public.appointment WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF a.customer_id<>owner_id THEN RAISE EXCEPTION 'booking_owner_required' USING ERRCODE='42501'; END IF;
  SELECT * INTO previous FROM public.audit_log WHERE entity_id=p_id AND action='CUSTOMER_BOOKING_CREATE' LIMIT 1;
  IF previous.id IS NULL OR previous.description::jsonb->'details' IS DISTINCT FROM p_details OR previous.description::jsonb->>'quote_version' IS DISTINCT FROM p_expected_quote THEN RAISE EXCEPTION 'booking_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 quote:=pawpal_private.customer_new_booking_quote(p_details);
 IF quote->>'version'<>p_expected_quote THEN RAISE EXCEPTION 'booking_quote_changed_reload_required' USING ERRCODE='PT409'; END IF;
 IF quote->>'category'='grooming_spa' THEN PERFORM pawpal_private.create_customer_service_core(p_id,quote->'core');
 ELSE PERFORM pawpal_private.create_customer_logistics_core(p_id,quote->'core'); END IF;
 SELECT quantity*unit_price INTO base_total FROM public.appointment_item WHERE appointment_id=p_id AND is_primary;
 IF base_total IS DISTINCT FROM (quote->>'quantity')::integer*(quote->>'unit_price')::numeric THEN RAISE EXCEPTION 'booking_quote_changed_reload_required' USING ERRCODE='PT409'; END IF;
 FOR addon IN SELECT value FROM jsonb_array_elements(quote->'addons') LOOP
  INSERT INTO public.appointment_item(appointment_id,service_addon_id,name_snapshot,quantity,unit_price,duration_minutes,status)
   VALUES(p_id,(addon->>'id')::uuid,addon->>'name',1,(addon->>'price')::numeric,(addon->>'duration')::integer,'pending');
 END LOOP;
 UPDATE public.appointment SET scheduled_end_at=(quote->>'end_at')::timestamptz WHERE id=p_id;
 INSERT INTO public.audit_log(action,entity_name,entity_id,description) VALUES('CUSTOMER_BOOKING_CREATE','appointment',p_id,
  jsonb_build_object('details',p_details,'quote_version',p_expected_quote,'quote',quote)::text);
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.customer_service_catalog(),public.own_booking_pets(),public.quote_own_service_booking(jsonb),public.create_own_service_booking(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.customer_service_catalog() TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.own_booking_pets(),public.quote_own_service_booking(jsonb),public.create_own_service_booking(uuid,text,jsonb) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
