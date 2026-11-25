-- Guest booking only. Generated price/availability helpers preserve member rules.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='12s';
-- BEGIN GENERATED QUOTE HELPERS
CREATE OR REPLACE FUNCTION pawpal_private.guest_booking_availability(p_owner uuid, p_details jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE cid uuid; svc public.service; starts timestamptz; ends timestamptz; cfg jsonb; hours jsonb; workers jsonb; capacity integer; busy integer; local_start timestamp; local_end timestamp; kind text; duration_value integer;
BEGIN
 cid:=p_owner;
 IF NOT EXISTS(SELECT 1 FROM public.customer WHERE id=cid AND auth_user_id IS NULL AND customer_status='active' AND unverified_contact_phone IS NOT NULL) THEN RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pet_profile WHERE id=(p_details->>'pet_id')::uuid AND customer_id=cid AND status='active') THEN RAISE EXCEPTION 'pet_owner_mismatch' USING ERRCODE='42501'; END IF;
 SELECT * INTO svc FROM public.service WHERE id=(p_details->>'service_id')::uuid AND status='active';
 IF NOT FOUND THEN RAISE EXCEPTION 'active_service_required'; END IF;
 SELECT category_code INTO kind FROM public.service_category WHERE id=svc.category_id;
 starts:=(p_details->>'scheduled_start_at')::timestamptz;
 IF starts IS NULL OR NOT isfinite(starts) OR starts<=now() THEN RETURN jsonb_build_object('available',false,'reason','future_booking_required'); END IF;
 duration_value:=pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=(p_details->>'pet_id')::uuid),starts)+coalesce((SELECT sum(estimated_duration) FROM public.service_addon WHERE service_id=svc.id AND status='active' AND id IN(SELECT (value#>>'{}')::uuid FROM jsonb_array_elements(coalesce(p_details->'addon_ids','[]')))),0);
 ends:=CASE WHEN kind='pet_hotel' THEN nullif(p_details->>'check_out_at','')::timestamptz WHEN kind='pet_taxi' THEN coalesce(nullif(p_details->>'return_at','')::timestamptz,starts)+make_interval(mins=>pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=(p_details->>'pet_id')::uuid),starts)) ELSE starts+make_interval(mins=>duration_value) END;
 SELECT setting_value::jsonb INTO cfg FROM public.pawpal_setting WHERE setting_key='system_config';
 local_start:=starts AT TIME ZONE 'Asia/Bangkok';local_end:=ends AT TIME ZONE 'Asia/Bangkok';
 hours:=cfg->'operatingHours'->CASE WHEN extract(isodow FROM local_start) IN(6,7) THEN 'weekend' ELSE 'weekday' END;
 IF coalesce(hours->>'open','')='' OR coalesce(hours->>'close','')='' THEN RETURN jsonb_build_object('available',false,'reason','booking_hours_unconfigured'); END IF;
 IF local_start::time<(hours->>'open')::time OR local_start::time>=(hours->>'close')::time OR (kind='grooming_spa' AND (local_end::date<>local_start::date OR local_end::time>(hours->>'close')::time)) THEN RETURN jsonb_build_object('available',false,'reason','outside_operating_hours','open',hours->>'open','close',hours->>'close'); END IF;
 IF kind='pet_hotel' THEN
  IF ends IS NULL OR ends<=starts THEN RETURN jsonb_build_object('available',false,'reason','invalid_hotel_stay'); END IF;
  IF NOT EXISTS(SELECT 1 FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id WHERE r.id=(p_details->>'room_id')::uuid AND r.status IN('active','available') AND t.status='active') OR EXISTS(SELECT 1 FROM public.hotel_booking WHERE room_id=(p_details->>'room_id')::uuid AND status NOT IN('cancelled','closed') AND check_in_at<ends AND check_out_at>starts) THEN RETURN jsonb_build_object('available',false,'reason','hotel_room_conflict'); END IF;
  RETURN jsonb_build_object('available',true,'staff','[]'::jsonb,'open',hours->>'open','close',hours->>'close');
 END IF;
 capacity:=nullif(cfg->'bookingPolicy'->>'slotCapacityMax','')::integer;
 IF capacity IS NULL OR capacity<1 THEN RETURN jsonb_build_object('available',false,'reason','booking_capacity_unconfigured'); END IF;
 SELECT count(*) INTO busy FROM public.appointment WHERE appointment_status NOT IN('completed','cancelled','no_show','da_huy','da_hoan_tat','vang_mat','expired') AND scheduled_start_at<ends AND scheduled_end_at>starts;
 IF busy>=capacity THEN RETURN jsonb_build_object('available',false,'reason','booking_slot_full'); END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name) ORDER BY s.full_name),'[]') INTO workers FROM public.staff s
 WHERE s.employment_status='active' AND NOT s.service_locked AND s.staff_level_id IS NOT NULL
 AND (svc.staff_level_required_id IS NULL OR EXISTS(SELECT 1 FROM public.staff_level actual JOIN public.staff_level required ON required.id=svc.staff_level_required_id WHERE actual.id=s.staff_level_id AND actual.rank_order>=required.rank_order))
 AND EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status='available' AND sc.start_at<=starts AND sc.end_at>=ends)
 AND NOT EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status<>'available' AND sc.start_at<ends AND sc.end_at>starts)
 AND NOT EXISTS(SELECT 1 FROM public.appointment a WHERE a.appointment_status NOT IN('completed','cancelled','no_show','da_huy','da_hoan_tat','vang_mat','expired') AND a.scheduled_start_at<ends AND a.scheduled_end_at>starts AND (a.staff_id=s.id OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=s.id AND i.status<>'cancelled')));
 RETURN jsonb_build_object('available',true,'reason',NULL,'staff',CASE WHEN kind='grooming_spa' THEN workers ELSE '[]'::jsonb END,'open',hours->>'open','close',hours->>'close');
END $function$;

CREATE OR REPLACE FUNCTION pawpal_private.guest_booking_quote_core(p_owner uuid, p_details jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE owner_id uuid; pet public.pet_profile; svc public.service; kind text; starts timestamptz; ends timestamptz; back_at timestamptz;
 room public.hotel_room; room_type public.hotel_room_type; weight_value numeric; distance_value numeric; qty integer:=1; unit_value numeric;
 rules integer; rule_key uuid; back_key uuid; total numeric; addon public.service_addon; addon_id uuid; addons jsonb:='[]';
 addon_ids jsonb; base_duration integer; extra_duration integer:=0; core jsonb; context jsonb; result jsonb;
BEGIN
 owner_id:=p_owner;
 IF NOT EXISTS(SELECT 1 FROM public.customer WHERE id=owner_id AND auth_user_id IS NULL AND customer_status='active' AND unverified_contact_phone IS NOT NULL) THEN RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 IF p_details IS NULL OR jsonb_typeof(p_details)<>'object' OR length(p_details::text)>16000 OR length(p_details->>'note')>4000 THEN RAISE EXCEPTION 'invalid_booking_details' USING ERRCODE='22023'; END IF;
 starts:=(p_details->>'scheduled_start_at')::timestamptz;
 IF starts IS NULL OR NOT isfinite(starts) OR starts<=now() THEN RAISE EXCEPTION 'future_booking_required' USING ERRCODE='22023'; END IF;
 SELECT * INTO pet FROM public.pet_profile WHERE id=(p_details->>'pet_id')::uuid AND customer_id=owner_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'pet_owner_mismatch' USING ERRCODE='42501'; END IF;
 SELECT * INTO svc FROM public.service WHERE id=(p_details->>'service_id')::uuid AND status='active' FOR SHARE;
 IF NOT FOUND OR pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts)<=0 THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_breed b ON b.species_id=ss.species_id WHERE ss.service_id=svc.id AND b.id=pet.breed_id) THEN RAISE EXCEPTION 'service_species_not_supported' USING ERRCODE='22023'; END IF;
 SELECT category_code INTO kind FROM public.service_category WHERE id=svc.category_id;
 SELECT weight INTO weight_value FROM public.pet_current_weight WHERE pet_id=pet.id;
 base_duration:=pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts);
 core:=jsonb_build_object('customer_id',owner_id,'pet_id',pet.id,'service_id',svc.id,'scheduled_start_at',starts,'note',nullif(btrim(p_details->>'note'),''));
 context:=jsonb_build_object('service_updated_at',svc.updated_at,'weight',weight_value,'species',pet.breed_id);
 LOCK TABLE public.service_price_matrix,public.taxi_price_rule IN SHARE MODE;
 IF kind='grooming_spa' THEN
  IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
  SELECT count(*),min(id::text)::uuid INTO rules,rule_key FROM public.service_price_matrix WHERE service_id=svc.id AND status='active'
   AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts);
  IF rules<>1 THEN RAISE EXCEPTION 'ambiguous_service_price' USING ERRCODE='22023'; END IF;
  SELECT unit_price INTO unit_value FROM public.service_price_matrix WHERE id=rule_key;
  ends:=starts+make_interval(mins=>base_duration);
 ELSIF kind='pet_hotel' THEN
  ends:=(p_details->>'check_out_at')::timestamptz;
  IF ends IS NULL OR NOT isfinite(ends) OR ends<=starts OR length(p_details->>'diet_notes')>4000 OR length(p_details->>'care_notes')>4000 THEN RAISE EXCEPTION 'invalid_hotel_stay' USING ERRCODE='22023'; END IF;
  SELECT * INTO room FROM public.hotel_room WHERE id=(p_details->>'room_id')::uuid AND status IN ('active','available') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hotel_room_unavailable' USING ERRCODE='PT409'; END IF;
  SELECT * INTO room_type FROM public.hotel_room_type WHERE id=room.room_type_id AND service_id=svc.id AND status='active'
   AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts)
   AND (SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id)>=weight_from
   AND (weight_to IS NULL OR (SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id)<weight_to OR (weight_to_inclusive AND (SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id)=weight_to)) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hotel_room_unavailable' USING ERRCODE='PT409'; END IF;
  IF EXISTS(SELECT 1 FROM public.hotel_booking WHERE room_id=room.id AND status NOT IN ('cancelled','closed') AND check_in_at<ends AND check_out_at>starts) THEN RAISE EXCEPTION 'hotel_room_conflict' USING ERRCODE='PT409'; END IF;
  qty:=ceil(extract(epoch FROM (ends-starts))/(room_type.billing_minutes*60))::integer;unit_value:=room_type.daily_price;
  core:=core||jsonb_build_object('room_id',room.id,'check_out_at',ends,'diet_notes',p_details->>'diet_notes','care_notes',p_details->>'care_notes');
  context:=context||jsonb_build_object('room_type_updated_at',room_type.updated_at);
 ELSIF kind='pet_taxi' THEN
  IF svc.trip_type IS NOT NULL AND svc.trip_type IS DISTINCT FROM p_details->>'trip_type' THEN RAISE EXCEPTION 'taxi_service_trip_mismatch' USING ERRCODE='22023'; END IF;
  distance_value:=(p_details->>'distance_km')::numeric;back_at:=nullif(p_details->>'return_at','')::timestamptz;
  IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
  IF coalesce(length(btrim(p_details->>'pickup_address')),0) NOT BETWEEN 1 AND 1000 OR coalesce(length(btrim(p_details->>'dropoff_address')),0) NOT BETWEEN 1 AND 1000
   OR distance_value IS NULL OR distance_value<=0 OR distance_value::text IN ('NaN','Infinity','-Infinity') OR coalesce(p_details->>'trip_type','') NOT IN ('one_way','round_trip') THEN RAISE EXCEPTION 'invalid_taxi_details' USING ERRCODE='22023'; END IF;
  IF (p_details->>'trip_type'='round_trip' AND (back_at IS NULL OR NOT isfinite(back_at) OR back_at<starts+make_interval(mins=>base_duration)))
   OR (p_details->>'trip_type'='one_way' AND back_at IS NOT NULL) THEN RAISE EXCEPTION 'invalid_taxi_return' USING ERRCODE='22023'; END IF;
  SELECT count(*),min(id::text)::uuid INTO rules,rule_key FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active'
   AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to))
   AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts);
  IF rules<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_price' USING ERRCODE='22023'; END IF;
  SELECT base_price+surcharge INTO unit_value FROM public.taxi_price_rule WHERE id=rule_key;
  IF p_details->>'trip_type'='round_trip' AND svc.trip_type IS NULL THEN
   SELECT count(*),min(id::text)::uuid INTO rules,back_key FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active'
    AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to))
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

 PERFORM pg_advisory_xact_lock(820068);
 context:=context||jsonb_build_object('availability',pawpal_private.guest_booking_availability(p_owner,p_details));
 IF NOT coalesce((context->'availability'->>'available')::boolean,false) THEN RAISE EXCEPTION '%',context->'availability'->>'reason' USING ERRCODE='PT409'; END IF;
 IF nullif(p_details->>'preferred_staff_id','') IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(context->'availability'->'staff') v WHERE v->>'id'=p_details->>'preferred_staff_id') THEN RAISE EXCEPTION 'preferred_staff_unavailable' USING ERRCODE='PT409'; END IF;
  core:=core||jsonb_build_object('note',concat_ws(E'\n',core->>'note','Nhân viên ưu tiên: '||(SELECT v->>'name' FROM jsonb_array_elements(context->'availability'->'staff') v WHERE v->>'id'=p_details->>'preferred_staff_id')||' (chờ cửa hàng xác nhận phân công)'));
 END IF;
 result:=jsonb_build_object('core',core,'category',kind,'start_at',starts,'end_at',ends,'unit_price',unit_value,'quantity',qty,'total',total,'weight',weight_value,'addons',addons,
  'context',context||jsonb_build_object('price_rule',rule_key,'return_rule',back_key));
 RETURN result||jsonb_build_object('version',md5(result::text));
END $function$;
REVOKE ALL ON FUNCTION pawpal_private.guest_booking_quote_core(uuid,jsonb),pawpal_private.guest_booking_availability(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
-- END GENERATED QUOTE HELPERS

CREATE FUNCTION pawpal_private.require_guest_booking_session(p_hash text)
RETURNS public.guest_session LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;c public.customer;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 SELECT * INTO s FROM public.guest_session WHERE token_hash=p_hash;
 IF NOT FOUND THEN RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 SELECT * INTO c FROM public.customer WHERE id=s.customer_id FOR UPDATE;
 SELECT * INTO s FROM public.guest_session WHERE token_hash=p_hash FOR UPDATE;
 IF s.purpose<>'commerce' OR s.revoked_at IS NOT NULL OR s.expires_at<=now()
  OR c.id IS NULL OR c.auth_user_id IS NOT NULL OR c.customer_status<>'active' OR c.unverified_contact_phone IS NULL THEN
  RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 RETURN s;
END $$;

CREATE FUNCTION public.guest_booking_quote(p_hash text,p_details jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;q jsonb;
BEGIN
 s:=pawpal_private.require_guest_booking_session(p_hash);
 IF jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>12000 THEN
  RAISE EXCEPTION 'invalid_booking_details' USING ERRCODE='22023';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_details) k WHERE k NOT IN('pet_id','service_id','scheduled_start_at','note','addon_ids','preferred_staff_id','check_out_at','room_id','diet_notes','care_notes','pickup_address','dropoff_address','distance_km','trip_type','return_at')) THEN
  RAISE EXCEPTION 'invalid_booking_fields' USING ERRCODE='22023';END IF;
 q:=pawpal_private.guest_booking_quote_core(s.customer_id,p_details);
 RETURN jsonb_build_object('version',q->'version','category',q->'category','start_at',q->'start_at','end_at',q->'end_at',
  'unit_price',q->'unit_price','quantity',q->'quantity','total',q->'total','weight',q->'weight',
  'addons',(SELECT coalesce(jsonb_agg(v-'updated_at'),'[]'::jsonb) FROM jsonb_array_elements(q->'addons') v),
  'availability',q->'context'->'availability');
END $$;

CREATE FUNCTION public.guest_booking_create(p_hash text,p_request uuid,p_expected_quote text,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;q jsonb;a public.appointment;previous public.audit_log;addon jsonb;svc public.service;
 base_duration integer;item_total numeric;kind text;core jsonb;
BEGIN
 s:=pawpal_private.require_guest_booking_session(p_hash);
 IF p_request IS NULL OR p_expected_quote IS NULL OR p_expected_quote !~ '^[a-f0-9]{32}$' OR
  jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>12000 THEN
  RAISE EXCEPTION 'invalid_booking_details' USING ERRCODE='22023';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_details) k WHERE k NOT IN('pet_id','service_id','scheduled_start_at','note','addon_ids','preferred_staff_id','check_out_at','room_id','diet_notes','care_notes','pickup_address','dropoff_address','distance_km','trip_type','return_at')) THEN
  RAISE EXCEPTION 'invalid_booking_fields' USING ERRCODE='22023';END IF;
 -- Same request lock namespace as the member booking endpoint.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,68));
 SELECT * INTO a FROM public.appointment WHERE id=p_request FOR UPDATE;
 IF FOUND THEN
  SELECT * INTO previous FROM public.audit_log WHERE entity_id=p_request AND entity_name='appointment' AND action='GUEST_BOOKING_CREATE' ORDER BY id LIMIT 1;
  IF a.customer_id<>s.customer_id OR previous.id IS NULL OR previous.description::jsonb->>'session_id'<>s.id::text THEN
   RAISE EXCEPTION 'guest_booking_not_found' USING ERRCODE='P0002';END IF;
  IF previous.description::jsonb->'details' IS DISTINCT FROM p_details OR previous.description::jsonb->>'quote_version' IS DISTINCT FROM p_expected_quote THEN
   RAISE EXCEPTION 'booking_request_conflict' USING ERRCODE='PT409';END IF;
  RETURN p_request;
 END IF;
 q:=pawpal_private.guest_booking_quote_core(s.customer_id,p_details);
 IF q->>'version' IS DISTINCT FROM p_expected_quote THEN RAISE EXCEPTION 'booking_quote_changed_reload_required' USING ERRCODE='PT409';END IF;
 kind:=q->>'category';core:=q->'core';
 SELECT * INTO svc FROM public.service WHERE id=(core->>'service_id')::uuid;
 base_duration:=CASE WHEN kind='grooming_spa' THEN pawpal_private.catalog_duration(svc.id,(q->>'weight')::numeric,(q->>'start_at')::timestamptz)
  ELSE ceil(extract(epoch FROM ((q->>'end_at')::timestamptz-(q->>'start_at')::timestamptz))/60)::integer END;
 INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,scheduled_start_at,scheduled_end_at,appointment_status,note)
  VALUES(p_request,'BKG-'||upper(replace(p_request::text,'-','')),s.customer_id,(core->>'pet_id')::uuid,
   (q->>'start_at')::timestamptz,(q->>'end_at')::timestamptz,'pending',nullif(btrim(core->>'note'),''));
 INSERT INTO public.appointment_item(appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,discount_amount,duration_minutes,weight_snapshot,status)
  VALUES(p_request,svc.id,true,svc.service_name,(q->>'quantity')::integer,(q->>'unit_price')::numeric,0,base_duration,(q->>'weight')::numeric,'pending');
 FOR addon IN SELECT value FROM jsonb_array_elements(q->'addons') LOOP
  INSERT INTO public.appointment_item(appointment_id,service_addon_id,name_snapshot,quantity,unit_price,duration_minutes,status)
   VALUES(p_request,(addon->>'id')::uuid,addon->>'name',1,(addon->>'price')::numeric,(addon->>'duration')::integer,'pending');
 END LOOP;
 IF kind='pet_hotel' THEN
  INSERT INTO public.hotel_booking(booking_code,room_id,appointment_id,check_in_at,check_out_at,status,special_diet_notes,care_notes,daily_price)
   VALUES('HTL-'||upper(replace(p_request::text,'-','')),(core->>'room_id')::uuid,p_request,(q->>'start_at')::timestamptz,
    (q->>'end_at')::timestamptz,'reserved',nullif(btrim(core->>'diet_notes'),''),nullif(btrim(core->>'care_notes'),''),(q->>'unit_price')::numeric);
 ELSIF kind='pet_taxi' THEN
  INSERT INTO public.taxi_trip(appointment_id,pickup_address,dropoff_address,distance_km,trip_type,outbound_at,return_at,taxi_price_rule_id,quoted_amount,status)
   VALUES(p_request,core->>'pickup_address',core->>'dropoff_address',(core->>'distance_km')::numeric,core->>'trip_type',
    (q->>'start_at')::timestamptz,nullif(core->>'return_at','')::timestamptz,(q->'context'->>'price_rule')::uuid,(q->>'unit_price')::numeric,'pending');
 END IF;
 SELECT sum(quantity*unit_price-discount_amount) INTO item_total FROM public.appointment_item WHERE appointment_id=p_request AND status<>'cancelled';
 IF item_total IS DISTINCT FROM (q->>'total')::numeric THEN RAISE EXCEPTION 'booking_total_mismatch' USING ERRCODE='PT409';END IF;
 INSERT INTO public.audit_log(action,entity_name,entity_id,description) VALUES('GUEST_BOOKING_CREATE','appointment',p_request,
  jsonb_build_object('session_id',s.id,'details',p_details,'quote_version',p_expected_quote,'quote',q)::text);
 RETURN p_request;
END $$;

CREATE FUNCTION public.guest_booking_receipt(p_hash text,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;result jsonb;
BEGIN
 s:=pawpal_private.require_guest_booking_session(p_hash);
 SELECT jsonb_build_object('id',a.id,'code',a.appointment_code,'status',a.appointment_status,'start_at',a.scheduled_start_at,
  'end_at',a.scheduled_end_at,'total',(SELECT total_price FROM public.appointment_totals WHERE appointment_id=a.id))
 INTO result FROM public.appointment a WHERE a.id=p_request AND a.customer_id=s.customer_id AND EXISTS(
  SELECT 1 FROM public.audit_log l WHERE l.entity_id=a.id AND l.entity_name='appointment' AND l.action='GUEST_BOOKING_CREATE' AND l.description::jsonb->>'session_id'=s.id::text);
 IF result IS NULL THEN RAISE EXCEPTION 'guest_booking_not_found' USING ERRCODE='P0002';END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.require_guest_booking_session(text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.guest_booking_quote(text,jsonb),public.guest_booking_create(text,uuid,text,jsonb),public.guest_booking_receipt(text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guest_booking_quote(text,jsonb),public.guest_booking_create(text,uuid,text,jsonb),public.guest_booking_receipt(text,uuid) TO service_role;
COMMIT;
