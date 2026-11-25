-- Explicit updates to the inspected booking and catalog functions.
CREATE OR REPLACE FUNCTION pawpal_private.create_customer_logistics_core(p_id uuid, p_details jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.appointment; pet public.pet_profile; svc public.service; room public.hotel_room; room_type public.hotel_room_type;
 actor uuid; owner uuid:=(p_details->>'customer_id')::uuid; pet_key uuid:=(p_details->>'pet_id')::uuid; service_key uuid:=(p_details->>'service_id')::uuid;
 staff_key uuid:=nullif(p_details->>'staff_id','')::uuid; room_key uuid:=nullif(p_details->>'room_id','')::uuid;
 starts timestamptz:=(p_details->>'scheduled_start_at')::timestamptz; ends timestamptz; returns timestamptz:=nullif(p_details->>'return_at','')::timestamptz;
 category text; weight_value numeric; distance_value numeric:=nullif(p_details->>'distance_km','')::numeric;
 trip_type_value text:=p_details->>'trip_type'; rule public.taxi_price_rule; back_rule public.taxi_price_rule;
 unit_value numeric; quoted numeric; quantity_value integer:=1; duration_value integer; matching integer; quotes jsonb;
BEGIN
 IF NOT pawpal_private.owns_customer(owner) OR staff_key IS NOT NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'booking_owner_required' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR owner IS NULL OR pet_key IS NULL OR service_key IS NULL OR starts IS NULL OR NOT isfinite(starts) OR p_details IS NULL OR length(p_details::text)>12000 THEN RAISE EXCEPTION 'invalid_booking_details' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.customer WHERE id=owner AND customer_status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'active_customer_required' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,20));
 SELECT * INTO a FROM public.appointment WHERE id=p_id;
 IF FOUND THEN
  IF NOT EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND action='CREATE_LOGISTICS_BOOKING' AND description=p_details::text) THEN RAISE EXCEPTION 'booking_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 IF starts<=now() THEN RAISE EXCEPTION 'future_booking_required' USING ERRCODE='22023'; END IF;
 SELECT * INTO pet FROM public.pet_profile WHERE id=pet_key AND customer_id=owner AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'pet_owner_mismatch' USING ERRCODE='22023'; END IF;
 SELECT * INTO svc FROM public.service WHERE id=service_key AND status='active' FOR SHARE;
 IF NOT FOUND OR pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts)<=0 THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_breed b ON b.species_id=ss.species_id WHERE ss.service_id=svc.id AND b.id=pet.breed_id) THEN RAISE EXCEPTION 'service_species_not_supported' USING ERRCODE='22023'; END IF;
 SELECT category_code INTO category FROM public.service_category WHERE id=svc.category_id;
 IF svc.trip_type IS NOT NULL AND svc.trip_type IS DISTINCT FROM trip_type_value THEN RAISE EXCEPTION 'taxi_service_trip_mismatch' USING ERRCODE='22023'; END IF;
 IF category NOT IN ('pet_hotel','pet_taxi') THEN RAISE EXCEPTION 'invalid_logistics_category' USING ERRCODE='22023'; END IF;
 IF category='pet_hotel' THEN
  
  ends:=nullif(p_details->>'check_out_at','')::timestamptz;
  IF ends IS NULL OR NOT isfinite(ends) OR ends<=starts OR room_key IS NULL OR length(p_details->>'diet_notes')>4000 OR length(p_details->>'care_notes')>4000 THEN RAISE EXCEPTION 'invalid_hotel_stay' USING ERRCODE='22023'; END IF;
  quantity_value:=ceil(extract(epoch FROM (ends-starts))/86400)::integer;
  duration_value:=ceil(extract(epoch FROM (ends-starts))/60)::integer;
 ELSE
  
  IF coalesce(length(btrim(p_details->>'pickup_address')),0) NOT BETWEEN 1 AND 1000 OR coalesce(length(btrim(p_details->>'dropoff_address')),0) NOT BETWEEN 1 AND 1000
   OR distance_value IS NULL OR distance_value::text IN ('NaN','Infinity','-Infinity') OR distance_value<=0 OR trip_type_value IS NULL OR trip_type_value NOT IN ('one_way','round_trip') THEN RAISE EXCEPTION 'invalid_taxi_details' USING ERRCODE='22023'; END IF;
  IF trip_type_value='round_trip' AND (returns IS NULL OR NOT isfinite(returns) OR returns<starts+make_interval(mins=>pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts))) THEN RAISE EXCEPTION 'invalid_taxi_return' USING ERRCODE='22023'; END IF;
  IF trip_type_value='one_way' AND returns IS NOT NULL THEN RAISE EXCEPTION 'invalid_taxi_return' USING ERRCODE='22023'; END IF;
  ends:=coalesce(returns,starts)+make_interval(mins=>pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts));
  duration_value:=ceil(extract(epoch FROM (ends-starts))/60)::integer;
 END IF;
 IF staff_key IS NOT NULL THEN
  PERFORM 1 FROM public.staff s WHERE s.id=staff_key AND s.employment_status='active' AND NOT s.service_locked AND (svc.staff_level_required_id IS NULL OR EXISTS(SELECT 1 FROM public.staff_level actual JOIN public.staff_level required ON required.id=svc.staff_level_required_id WHERE actual.id=s.staff_level_id AND actual.rank_order>=required.rank_order)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment WHERE staff_id=staff_key AND appointment_status NOT IN ('completed','cancelled','no_show') AND scheduled_start_at<ends AND scheduled_end_at>starts) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
 END IF;
 SELECT weight INTO weight_value FROM public.pet_current_weight WHERE pet_id=pet_key;
 IF category='pet_hotel' THEN
  SELECT * INTO room FROM public.hotel_room WHERE id=room_key AND status IN ('active','available') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hotel_room_unavailable' USING ERRCODE='PT409'; END IF;
  SELECT * INTO room_type FROM public.hotel_room_type WHERE id=room.room_type_id AND service_id=svc.id AND status='active'
   AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts)
   AND (SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id)>=weight_from
   AND (weight_to IS NULL OR (SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id)<weight_to OR (weight_to_inclusive AND (SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id)=weight_to)) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hotel_room_unavailable' USING ERRCODE='PT409'; END IF;
  IF EXISTS(SELECT 1 FROM public.hotel_booking WHERE room_id=room_key AND status NOT IN ('cancelled','closed') AND check_in_at<ends AND check_out_at>starts) THEN RAISE EXCEPTION 'hotel_room_conflict' USING ERRCODE='PT409'; END IF;
  quantity_value:=ceil(extract(epoch FROM (ends-starts))/(room_type.billing_minutes*60))::integer;unit_value:=room_type.daily_price;quoted:=unit_value*quantity_value;
  quotes:=jsonb_build_object('room_id',room.id,'room_type_id',room_type.id,'daily_price',unit_value,'days',quantity_value,'check_in_at',starts,'check_out_at',ends);
 ELSE
  IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO matching FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts);
  IF matching<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_price' USING ERRCODE='22023'; END IF;
  SELECT * INTO rule FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts) FOR SHARE;
  quoted:=rule.base_price+rule.surcharge;
  quotes:=jsonb_build_object('outbound_rule_id',rule.id,'outbound_amount',quoted,'outbound_at',starts,'distance_per_leg',distance_value);
  IF trip_type_value='round_trip' AND svc.trip_type IS NULL THEN
   SELECT count(*) INTO matching FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=returns AND (effective_to IS NULL OR effective_to>returns);
   IF matching<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_return_price' USING ERRCODE='22023'; END IF;
   SELECT * INTO back_rule FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=returns AND (effective_to IS NULL OR effective_to>returns) FOR SHARE;
   quoted:=quoted+back_rule.base_price+back_rule.surcharge;
   quotes:=quotes||jsonb_build_object('return_rule_id',back_rule.id,'return_amount',back_rule.base_price+back_rule.surcharge,'return_at',returns);
  END IF;
  unit_value:=quoted;
 END IF;
 IF quoted IS NULL OR quoted<0 OR quoted::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'invalid_service_price'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,staff_id,scheduled_start_at,scheduled_end_at,appointment_status,change_count,note)
 VALUES(p_id,'BKG-'||upper(replace(p_id::text,'-','')),owner,pet_key,staff_key,starts,ends,'pending',0,nullif(btrim(p_details->>'note'),''));
 INSERT INTO public.appointment_item(appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,discount_amount,duration_minutes,weight_snapshot,staff_id,status)
 VALUES(p_id,svc.id,true,svc.service_name,quantity_value,unit_value,0,duration_value,weight_value,staff_key,'pending');
 IF category='pet_hotel' THEN
  INSERT INTO public.hotel_booking(booking_code,room_id,appointment_id,check_in_at,check_out_at,status,special_diet_notes,care_notes,daily_price)
  VALUES('HTL-'||upper(replace(p_id::text,'-','')),room.id,p_id,starts,ends,'reserved',nullif(btrim(p_details->>'diet_notes'),''),nullif(btrim(p_details->>'care_notes'),''),unit_value);
 ELSE
  INSERT INTO public.taxi_trip(appointment_id,driver_staff_id,pickup_address,dropoff_address,distance_km,trip_type,outbound_at,return_at,taxi_price_rule_id,quoted_amount,status)
  VALUES(p_id,staff_key,btrim(p_details->>'pickup_address'),btrim(p_details->>'dropoff_address'),distance_value,trip_type_value,starts,returns,rule.id,quoted,'pending');
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'CREATE_LOGISTICS_BOOKING','appointment',p_id,p_details::text),(actor,'LOGISTICS_QUOTE','appointment',p_id,quotes::text);
 RETURN p_id;
END $function$;

CREATE OR REPLACE FUNCTION pawpal_private.create_customer_service_core(p_id uuid, p_details jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.appointment; pet public.pet_profile; svc public.service; actor uuid;
 owner uuid:=(p_details->>'customer_id')::uuid; pet_key uuid:=(p_details->>'pet_id')::uuid;
 service_key uuid:=(p_details->>'service_id')::uuid; staff_key uuid:=nullif(p_details->>'staff_id','')::uuid;
 starts timestamptz:=(p_details->>'scheduled_start_at')::timestamptz; ends timestamptz;
 weight_value numeric; price_value numeric; category text; rule public.taxi_price_rule;
 matching integer; distance_value numeric:=nullif(p_details->>'distance_km','')::numeric;
BEGIN
 IF NOT pawpal_private.owns_customer(owner) OR staff_key IS NOT NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'booking_owner_required' USING ERRCODE='42501'; END IF;
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
 IF NOT FOUND OR pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts)<=0 THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_breed b ON b.species_id=ss.species_id WHERE ss.service_id=service_key AND b.id=pet.breed_id) THEN RAISE EXCEPTION 'service_species_not_supported' USING ERRCODE='22023'; END IF;
 SELECT category_code INTO category FROM public.service_category WHERE id=svc.category_id;
 IF category='pet_hotel' THEN RAISE EXCEPTION 'hotel_requires_room_reservation' USING ERRCODE='22023'; END IF;
 ends:=starts+make_interval(mins=>pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts));
 SELECT weight INTO weight_value FROM public.pet_current_weight WHERE pet_id=pet_key;
 IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
 IF category='pet_taxi' THEN
  IF NOT pawpal_private.has_permission('taxi_trip.write') THEN RAISE EXCEPTION 'taxi_write_forbidden' USING ERRCODE='42501'; END IF;
  IF coalesce(length(btrim(p_details->>'pickup_address')),0) NOT BETWEEN 1 AND 1000 OR coalesce(length(btrim(p_details->>'dropoff_address')),0) NOT BETWEEN 1 AND 1000
   OR distance_value IS NULL OR distance_value::text IN ('NaN','Infinity','-Infinity') OR distance_value<=0 OR (p_details->>'trip_type') IS DISTINCT FROM 'one_way' THEN RAISE EXCEPTION 'invalid_taxi_details' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO matching FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts);
  IF matching<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_price' USING ERRCODE='22023'; END IF;
  SELECT * INTO rule FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts) FOR SHARE;
  price_value:=rule.base_price+rule.surcharge;
 ELSE
  SELECT count(*) INTO matching FROM public.service_price_matrix WHERE service_id=service_key AND status='active' AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts);
  IF matching<>1 THEN RAISE EXCEPTION 'ambiguous_service_price' USING ERRCODE='22023'; END IF;
  SELECT unit_price INTO price_value FROM public.service_price_matrix WHERE service_id=service_key AND status='active' AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts) FOR SHARE;
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
 VALUES(p_id,service_key,true,svc.service_name,1,price_value,0,pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts),weight_value,staff_key,'pending');
 IF category='pet_taxi' THEN
  INSERT INTO public.taxi_trip(appointment_id,driver_staff_id,pickup_address,dropoff_address,distance_km,trip_type,outbound_at,taxi_price_rule_id,quoted_amount,status)
  VALUES(p_id,staff_key,btrim(p_details->>'pickup_address'),btrim(p_details->>'dropoff_address'),distance_value,'one_way',starts,rule.id,price_value,'pending');
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'CREATE_APPOINTMENT','appointment',p_id,p_details::text);
 RETURN p_id;
END $function$;

CREATE OR REPLACE FUNCTION pawpal_private.customer_booking_move_quote(p_id uuid, p_start timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE owner_id uuid; a public.appointment; line public.appointment_item; svc public.service;
 stay public.hotel_booking; trip public.taxi_trip; room public.hotel_room; kind text; primary_kind text;
 ends timestamptz; back_at timestamptz; delta interval; weight_value numeric; unit_value numeric; qty integer;
 count_value integer; price_key uuid; back_key uuid; staff_key uuid; total numeric:=0; details jsonb:='[]';
 room_rate numeric; logistics jsonb:='{}'; result jsonb;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id) FOR UPDATE;
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'customer_session_required' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_id AND customer_id=owner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_owner_required' USING ERRCODE='42501'; END IF;
 IF p_start IS NULL OR NOT isfinite(p_start) OR p_start<now()+interval '2 hours' OR p_start=a.scheduled_start_at
  OR a.scheduled_start_at<now()+interval '2 hours' OR a.appointment_status<>'confirmed' OR a.change_count>=2 THEN
  RAISE EXCEPTION 'booking_change_window_closed' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.payment WHERE appointment_id=a.id AND transaction_status IN ('pending','succeeded'))
  OR EXISTS(SELECT 1 FROM public.voucher_redemption WHERE appointment_id=a.id AND status='applied')
  OR EXISTS(SELECT 1 FROM public.appointment_adjustment WHERE appointment_id=a.id AND approval_status<>'rejected') THEN
  RAISE EXCEPTION 'booking_requires_staff_reconciliation' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.pet_profile WHERE id=a.pet_id AND customer_id=owner_id AND status='active') THEN RAISE EXCEPTION 'active_pet_required' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM public.appointment_item WHERE appointment_id=a.id AND is_primary AND status<>'cancelled')<>1 THEN RAISE EXCEPTION 'booking_items_require_staff' USING ERRCODE='22023'; END IF;
 delta:=p_start-a.scheduled_start_at; ends:=a.scheduled_end_at+delta;
 SELECT weight INTO weight_value FROM public.pet_current_weight WHERE pet_id=a.pet_id;
 SELECT c.category_code INTO primary_kind FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id
  JOIN public.service_category c ON c.id=s.category_id WHERE i.appointment_id=a.id AND i.is_primary AND i.status<>'cancelled';
 IF primary_kind='pet_hotel' THEN
  SELECT * INTO stay FROM public.hotel_booking WHERE appointment_id=a.id FOR UPDATE;
  IF stay.id IS NULL OR stay.status NOT IN ('pending','reserved','confirmed') OR stay.check_in_at<>a.scheduled_start_at OR stay.check_out_at<>a.scheduled_end_at THEN RAISE EXCEPTION 'hotel_requires_staff' USING ERRCODE='22023'; END IF;
  SELECT * INTO room FROM public.hotel_room WHERE id=stay.room_id AND status IN ('active','available') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hotel_room_unavailable' USING ERRCODE='PT409'; END IF;
  SELECT daily_price INTO room_rate FROM public.hotel_room_type WHERE id=room.room_type_id AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hotel_room_unavailable' USING ERRCODE='PT409'; END IF;
  IF EXISTS(SELECT 1 FROM public.hotel_booking WHERE room_id=room.id AND id<>stay.id AND status NOT IN ('cancelled','closed') AND check_in_at<ends AND check_out_at>p_start) THEN RAISE EXCEPTION 'hotel_room_conflict' USING ERRCODE='PT409'; END IF;
  logistics:=jsonb_build_object('kind',primary_kind,'id',stay.id,'updated_at',stay.updated_at,'room_id',room.id,'daily_price',room_rate,'check_out_at',ends);
 ELSIF primary_kind='pet_taxi' THEN
  SELECT * INTO trip FROM public.taxi_trip WHERE appointment_id=a.id FOR UPDATE;
  IF trip.id IS NULL OR trip.status NOT IN ('pending','confirmed') OR trip.outbound_at IS DISTINCT FROM a.scheduled_start_at
   OR trip.driver_staff_id IS DISTINCT FROM a.staff_id THEN RAISE EXCEPTION 'taxi_requires_staff' USING ERRCODE='22023'; END IF;
  back_at:=trip.return_at+delta;
  logistics:=jsonb_build_object('kind',primary_kind,'id',trip.id,'updated_at',trip.updated_at,'return_at',back_at);
 ELSIF primary_kind IS DISTINCT FROM 'grooming_spa' THEN RAISE EXCEPTION 'booking_items_require_staff' USING ERRCODE='22023'; END IF;
 FOR staff_key IN SELECT a.staff_id WHERE a.staff_id IS NOT NULL UNION SELECT staff_id FROM public.appointment_item WHERE appointment_id=a.id AND status<>'cancelled' AND staff_id IS NOT NULL ORDER BY 1 LOOP
  PERFORM 1 FROM public.staff WHERE id=staff_key AND employment_status='active' AND NOT service_locked FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='PT409'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment other WHERE other.id<>a.id AND other.appointment_status NOT IN ('completed','cancelled','no_show')
   AND other.scheduled_start_at<ends AND other.scheduled_end_at>p_start AND (other.staff_id=staff_key OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=other.id AND i.staff_id=staff_key AND i.status<>'cancelled')))
   OR EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=staff_key AND schedule_status='active' AND availability_status<>'available' AND start_at<ends AND end_at>p_start) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
 END LOOP;
 LOCK TABLE public.taxi_price_rule,public.service_price_matrix IN SHARE MODE;
 FOR line IN SELECT * FROM public.appointment_item WHERE appointment_id=a.id AND status<>'cancelled' ORDER BY id FOR UPDATE LOOP
  qty:=line.quantity;price_key:=NULL;back_key:=NULL;
  IF line.status NOT IN ('pending','confirmed') THEN RAISE EXCEPTION 'booking_items_require_staff' USING ERRCODE='22023'; END IF;
  IF line.service_id IS NOT NULL THEN
   SELECT * INTO svc FROM public.service WHERE id=line.service_id AND status='active' FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023'; END IF;
   SELECT category_code INTO kind FROM public.service_category WHERE id=svc.category_id;
   IF NOT EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_breed b ON b.species_id=ss.species_id
    JOIN public.pet_profile pet ON pet.breed_id=b.id WHERE pet.id=a.pet_id AND ss.service_id=svc.id) THEN RAISE EXCEPTION 'service_species_not_supported' USING ERRCODE='22023'; END IF;
   IF EXISTS(SELECT 1 FROM public.staff st WHERE st.id IN (a.staff_id,line.staff_id) AND svc.staff_level_required_id IS NOT NULL
    AND NOT EXISTS(SELECT 1 FROM public.staff_level actual JOIN public.staff_level required ON required.id=svc.staff_level_required_id WHERE actual.id=st.staff_level_id AND actual.rank_order>=required.rank_order)) THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='PT409'; END IF;
   IF kind='pet_hotel' AND line.is_primary THEN
    SELECT daily_price INTO room_rate FROM public.hotel_room_type WHERE id=room.room_type_id AND service_id=svc.id AND status='active' AND effective_from<=p_start AND (effective_to IS NULL OR effective_to>p_start) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)); IF room_rate IS NULL THEN RAISE EXCEPTION 'hotel_room_unavailable' USING ERRCODE='22023'; END IF;unit_value:=room_rate;qty:=ceil(extract(epoch FROM (ends-p_start))/((SELECT billing_minutes*60 FROM public.hotel_room_type WHERE id=room.room_type_id AND service_id=svc.id AND status='active')))::integer;
   ELSIF kind='pet_taxi' AND line.is_primary THEN
    IF svc.trip_type IS NOT NULL AND svc.trip_type IS DISTINCT FROM trip.trip_type THEN RAISE EXCEPTION 'taxi_service_trip_mismatch' USING ERRCODE='22023'; END IF;
    IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
    SELECT count(*),min(id::text)::uuid INTO count_value,price_key FROM public.taxi_price_rule
     WHERE service_id=svc.id AND status='active' AND trip.distance_km>=distance_from AND (distance_to IS NULL OR trip.distance_km<distance_to OR (distance_to_inclusive AND trip.distance_km=distance_to))
     AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=p_start AND (effective_to IS NULL OR effective_to>p_start);
    IF count_value<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_price' USING ERRCODE='22023'; END IF;
    SELECT base_price+surcharge INTO unit_value FROM public.taxi_price_rule WHERE id=price_key;
    IF trip.trip_type='round_trip' AND svc.trip_type IS NULL THEN
     SELECT count(*),min(id::text)::uuid INTO count_value,back_key FROM public.taxi_price_rule
      WHERE service_id=svc.id AND status='active' AND trip.distance_km>=distance_from AND (distance_to IS NULL OR trip.distance_km<distance_to OR (distance_to_inclusive AND trip.distance_km=distance_to))
      AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=back_at AND (effective_to IS NULL OR effective_to>back_at);
     IF count_value<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_price' USING ERRCODE='22023'; END IF;
     SELECT unit_value+base_price+surcharge INTO unit_value FROM public.taxi_price_rule WHERE id=back_key;
    END IF;
    qty:=1;logistics:=logistics||jsonb_build_object('rule_id',price_key,'return_rule_id',back_key,'quoted_amount',unit_value);
   ELSIF kind='grooming_spa' THEN
    IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
    SELECT count(*),min(id::text)::uuid INTO count_value,price_key FROM public.service_price_matrix WHERE service_id=svc.id AND status='active'
     AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=p_start AND (effective_to IS NULL OR effective_to>p_start);
    IF count_value<>1 THEN RAISE EXCEPTION 'ambiguous_service_price' USING ERRCODE='22023'; END IF;
    SELECT unit_price INTO unit_value FROM public.service_price_matrix WHERE id=price_key;
   ELSE RAISE EXCEPTION 'booking_items_require_staff' USING ERRCODE='22023'; END IF;
  ELSE
   SELECT price INTO unit_value FROM public.service_addon WHERE id=line.service_addon_id AND status='active' FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023'; END IF;
  END IF;
  IF unit_value IS NULL OR unit_value::text IN ('NaN','Infinity','-Infinity') OR unit_value<0 OR line.discount_amount>unit_value*qty THEN RAISE EXCEPTION 'invalid_service_price' USING ERRCODE='22023'; END IF;
  total:=total+unit_value*qty-line.discount_amount;
  details:=details||jsonb_build_array(jsonb_build_object('id',line.id,'name',line.name_snapshot,'quantity',qty,'unit_price',unit_value,
   'discount',line.discount_amount,'weight',weight_value,'price_key',price_key,'updated_at',line.updated_at));
 END LOOP;
 result:=jsonb_build_object('id',a.id,'updated_at',a.updated_at,'change_count',a.change_count,'start_at',p_start,'end_at',ends,'total',total,'lines',details,'logistics',logistics);
 RETURN result||jsonb_build_object('version',md5(result::text));
END $function$;

CREATE OR REPLACE FUNCTION pawpal_private.customer_new_booking_quote(p_details jsonb)
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
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id) FOR UPDATE;
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'customer_session_required' USING ERRCODE='42501'; END IF;
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
 context:=context||jsonb_build_object('availability',public.own_booking_availability(p_details));
 IF NOT coalesce((context->'availability'->>'available')::boolean,false) THEN RAISE EXCEPTION '%',context->'availability'->>'reason' USING ERRCODE='PT409'; END IF;
 IF nullif(p_details->>'preferred_staff_id','') IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(context->'availability'->'staff') v WHERE v->>'id'=p_details->>'preferred_staff_id') THEN RAISE EXCEPTION 'preferred_staff_unavailable' USING ERRCODE='PT409'; END IF;
  core:=core||jsonb_build_object('note',concat_ws(E'\n',core->>'note','Nhân viên ưu tiên: '||(SELECT v->>'name' FROM jsonb_array_elements(context->'availability'->'staff') v WHERE v->>'id'=p_details->>'preferred_staff_id')||' (chờ cửa hàng xác nhận phân công)'));
 END IF;
 result:=jsonb_build_object('core',core,'category',kind,'start_at',starts,'end_at',ends,'unit_price',unit_value,'quantity',qty,'total',total,'weight',weight_value,'addons',addons,
  'context',context||jsonb_build_object('price_rule',rule_key,'return_rule',back_key));
 RETURN result||jsonb_build_object('version',md5(result::text));
END $function$;

CREATE OR REPLACE FUNCTION public.change_admin_service_charge(p_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.appointment; actor uuid; adjustment public.appointment_adjustment; item public.appointment_item; svc public.service; target_staff uuid;
 amount_value numeric:=nullif(p_details->>'amount','')::numeric; reason_value text:=btrim(p_details->>'reason'); weight_value numeric; quoted numeric; matching integer; ends timestamptz;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('appointment_adjustment.write') OR NOT pawpal_private.has_permission('appointment_item.write') OR NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'service_charge_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_action IS NULL OR p_action NOT IN ('propose','confirm_consent','approve','cancel_adjustment','add_service','cancel_service') OR p_details IS NULL OR length(p_details::text)>8000 THEN RAISE EXCEPTION 'invalid_service_charge' USING ERRCODE='22023'; END IF;
 SELECT staff_id INTO target_staff FROM public.appointment WHERE id=p_appointment_id;
 IF p_action='add_service' AND target_staff IS NOT NULL THEN PERFORM 1 FROM public.staff WHERE id=target_staff FOR UPDATE; END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 IF p_action IN ('propose','add_service') AND EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND action='SERVICE_CHARGE_'||upper(p_action)) THEN
  IF NOT EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND action='SERVICE_CHARGE_'||upper(p_action) AND description=jsonb_build_object('appointment_id',a.id,'details',p_details)::text) THEN RAISE EXCEPTION 'service_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 IF p_expected_updated_at IS NULL OR a.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
 IF a.appointment_status NOT IN ('pending','confirmed','checked_in','in_progress') OR EXISTS(SELECT 1 FROM public.payment WHERE appointment_id=a.id AND transaction_status='succeeded') THEN RAISE EXCEPTION 'service_charges_locked' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF p_action='propose' THEN
  IF amount_value IS NULL OR amount_value::text IN ('NaN','Infinity','-Infinity') OR amount_value<=0 OR amount_value<>trunc(amount_value) OR coalesce(length(reason_value),0) NOT BETWEEN 1 AND 4000 OR coalesce(length(btrim(p_details->>'name')),0) NOT BETWEEN 1 AND 200 OR coalesce(p_details->>'consent','') NOT IN ('pending','confirmed') THEN RAISE EXCEPTION 'invalid_service_charge' USING ERRCODE='22023'; END IF;
  INSERT INTO public.appointment_adjustment(id,appointment_id,adjustment_type,duration_delta_minutes,amount_delta,reason,proposed_by,approval_status,customer_consent_status)
  VALUES(p_id,a.id,'surcharge',0,amount_value,btrim(p_details->>'name')||E'\n'||reason_value,actor,'pending',p_details->>'consent');
 ELSEIF p_action IN ('approve','confirm_consent','cancel_adjustment') THEN
  SELECT * INTO adjustment FROM public.appointment_adjustment WHERE id=p_id AND appointment_id=a.id FOR UPDATE;
  IF NOT FOUND OR adjustment.approval_status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'service_adjustment_not_active' USING ERRCODE='22023'; END IF;
  IF p_action='confirm_consent' THEN
   IF adjustment.approval_status<>'pending' OR p_details->>'confirmed' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'charge_consent_required' USING ERRCODE='22023'; END IF;
   UPDATE public.appointment_adjustment SET customer_consent_status='confirmed' WHERE id=p_id;
  ELSEIF p_action='approve' THEN
   IF adjustment.approval_status<>'pending' OR adjustment.customer_consent_status<>'confirmed' THEN RAISE EXCEPTION 'charge_consent_required' USING ERRCODE='22023'; END IF;
   UPDATE public.appointment_adjustment SET approval_status='approved',approved_by=actor,approved_at=clock_timestamp() WHERE id=p_id;
  ELSE UPDATE public.appointment_adjustment SET approval_status='cancelled' WHERE id=p_id; END IF;
 ELSEIF p_action='add_service' THEN
  IF a.staff_id IS DISTINCT FROM target_staff THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
  IF p_details->>'consent' IS DISTINCT FROM 'confirmed' THEN RAISE EXCEPTION 'charge_consent_required' USING ERRCODE='22023'; END IF;
  SELECT * INTO svc FROM public.service WHERE id=(p_details->>'service_id')::uuid AND status='active' FOR SHARE;
  IF NOT FOUND OR pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=a.pet_id),a.scheduled_start_at)<=0 OR NOT EXISTS(SELECT 1 FROM public.service_category WHERE id=svc.category_id AND category_code='grooming_spa') THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_profile pet ON pet.id=a.pet_id JOIN public.pet_breed b ON b.id=pet.breed_id AND b.species_id=ss.species_id WHERE ss.service_id=svc.id) THEN RAISE EXCEPTION 'service_species_not_supported' USING ERRCODE='22023'; END IF;
  IF a.staff_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff st WHERE st.id=a.staff_id AND st.employment_status='active' AND NOT st.service_locked AND (svc.staff_level_required_id IS NULL OR EXISTS(SELECT 1 FROM public.staff_level actual JOIN public.staff_level required ON required.id=svc.staff_level_required_id WHERE actual.id=st.staff_level_id AND actual.rank_order>=required.rank_order))) THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='22023'; END IF;
  SELECT weight INTO weight_value FROM public.pet_current_weight WHERE pet_id=a.pet_id;
  SELECT count(*),min(unit_price) INTO matching,quoted FROM public.service_price_matrix WHERE service_id=svc.id AND status='active' AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=a.scheduled_start_at AND (effective_to IS NULL OR effective_to>a.scheduled_start_at);
  IF matching<>1 OR quoted IS NULL OR amount_value IS DISTINCT FROM quoted THEN RAISE EXCEPTION 'service_quote_changed' USING ERRCODE='22023'; END IF;
  ends:=a.scheduled_end_at+make_interval(mins=>pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=a.pet_id),a.scheduled_start_at));
  IF a.staff_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.appointment WHERE id<>a.id AND staff_id=a.staff_id AND appointment_status NOT IN ('completed','cancelled','no_show') AND scheduled_start_at<ends AND scheduled_end_at>a.scheduled_start_at) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
  INSERT INTO public.appointment_item(id,appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,discount_amount,duration_minutes,weight_snapshot,staff_id,status)
  VALUES(p_id,a.id,svc.id,false,svc.service_name,1,quoted,0,pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=a.pet_id),a.scheduled_start_at),weight_value,a.staff_id,a.appointment_status);
  UPDATE public.appointment SET scheduled_end_at=ends WHERE id=a.id;
 ELSE
  SELECT * INTO item FROM public.appointment_item WHERE id=p_id AND appointment_id=a.id AND NOT is_primary AND status<>'cancelled' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'service_item_not_active' USING ERRCODE='22023'; END IF;
  UPDATE public.appointment_item SET status='cancelled' WHERE id=p_id;
  UPDATE public.appointment SET scheduled_end_at=greatest(scheduled_start_at+interval '1 minute',scheduled_end_at-make_interval(mins=>item.duration_minutes)) WHERE id=a.id;
 END IF;
 UPDATE public.appointment SET updated_at=clock_timestamp() WHERE id=a.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SERVICE_CHARGE_'||upper(p_action),CASE WHEN p_action IN ('add_service','cancel_service') THEN 'appointment_item' ELSE 'appointment_adjustment' END,p_id,jsonb_build_object('appointment_id',a.id,'details',p_details)::text);
 RETURN p_id;
END $function$;

CREATE OR REPLACE FUNCTION public.create_admin_logistics_booking(p_id uuid, p_details jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.appointment; pet public.pet_profile; svc public.service; room public.hotel_room; room_type public.hotel_room_type;
 actor uuid; owner uuid:=(p_details->>'customer_id')::uuid; pet_key uuid:=(p_details->>'pet_id')::uuid; service_key uuid:=(p_details->>'service_id')::uuid;
 staff_key uuid:=nullif(p_details->>'staff_id','')::uuid; room_key uuid:=nullif(p_details->>'room_id','')::uuid;
 starts timestamptz:=(p_details->>'scheduled_start_at')::timestamptz; ends timestamptz; returns timestamptz:=nullif(p_details->>'return_at','')::timestamptz;
 category text; weight_value numeric; distance_value numeric:=nullif(p_details->>'distance_km','')::numeric;
 trip_type_value text:=p_details->>'trip_type'; rule public.taxi_price_rule; back_rule public.taxi_price_rule;
 unit_value numeric; quoted numeric; quantity_value integer:=1; duration_value integer; matching integer; quotes jsonb;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('appointment_item.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR owner IS NULL OR pet_key IS NULL OR service_key IS NULL OR starts IS NULL OR NOT isfinite(starts) OR p_details IS NULL OR length(p_details::text)>12000 THEN RAISE EXCEPTION 'invalid_booking_details' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.customer WHERE id=owner AND customer_status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'active_customer_required' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,20));
 SELECT * INTO a FROM public.appointment WHERE id=p_id;
 IF FOUND THEN
  IF NOT EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND action='CREATE_LOGISTICS_BOOKING' AND description=p_details::text) THEN RAISE EXCEPTION 'booking_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 IF starts<=now() THEN RAISE EXCEPTION 'future_booking_required' USING ERRCODE='22023'; END IF;
 SELECT * INTO pet FROM public.pet_profile WHERE id=pet_key AND customer_id=owner AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'pet_owner_mismatch' USING ERRCODE='22023'; END IF;
 SELECT * INTO svc FROM public.service WHERE id=service_key AND status='active' FOR SHARE;
 IF NOT FOUND OR pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts)<=0 THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_breed b ON b.species_id=ss.species_id WHERE ss.service_id=svc.id AND b.id=pet.breed_id) THEN RAISE EXCEPTION 'service_species_not_supported' USING ERRCODE='22023'; END IF;
 SELECT category_code INTO category FROM public.service_category WHERE id=svc.category_id;
 IF svc.trip_type IS NOT NULL AND svc.trip_type IS DISTINCT FROM trip_type_value THEN RAISE EXCEPTION 'taxi_service_trip_mismatch' USING ERRCODE='22023'; END IF;
 IF category NOT IN ('pet_hotel','pet_taxi') THEN RAISE EXCEPTION 'invalid_logistics_category' USING ERRCODE='22023'; END IF;
 IF category='pet_hotel' THEN
  IF NOT pawpal_private.has_permission('hotel_booking.write') THEN RAISE EXCEPTION 'logistics_write_forbidden' USING ERRCODE='42501'; END IF;
  ends:=nullif(p_details->>'check_out_at','')::timestamptz;
  IF ends IS NULL OR NOT isfinite(ends) OR ends<=starts OR room_key IS NULL OR length(p_details->>'diet_notes')>4000 OR length(p_details->>'care_notes')>4000 THEN RAISE EXCEPTION 'invalid_hotel_stay' USING ERRCODE='22023'; END IF;
  quantity_value:=ceil(extract(epoch FROM (ends-starts))/86400)::integer;
  duration_value:=ceil(extract(epoch FROM (ends-starts))/60)::integer;
 ELSE
  IF NOT pawpal_private.has_permission('taxi_trip.write') THEN RAISE EXCEPTION 'logistics_write_forbidden' USING ERRCODE='42501'; END IF;
  IF coalesce(length(btrim(p_details->>'pickup_address')),0) NOT BETWEEN 1 AND 1000 OR coalesce(length(btrim(p_details->>'dropoff_address')),0) NOT BETWEEN 1 AND 1000
   OR distance_value IS NULL OR distance_value::text IN ('NaN','Infinity','-Infinity') OR distance_value<=0 OR trip_type_value IS NULL OR trip_type_value NOT IN ('one_way','round_trip') THEN RAISE EXCEPTION 'invalid_taxi_details' USING ERRCODE='22023'; END IF;
  IF trip_type_value='round_trip' AND (returns IS NULL OR NOT isfinite(returns) OR returns<starts+make_interval(mins=>pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts))) THEN RAISE EXCEPTION 'invalid_taxi_return' USING ERRCODE='22023'; END IF;
  IF trip_type_value='one_way' AND returns IS NOT NULL THEN RAISE EXCEPTION 'invalid_taxi_return' USING ERRCODE='22023'; END IF;
  ends:=coalesce(returns,starts)+make_interval(mins=>pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts));
  duration_value:=ceil(extract(epoch FROM (ends-starts))/60)::integer;
 END IF;
 IF staff_key IS NOT NULL THEN
  PERFORM 1 FROM public.staff s WHERE s.id=staff_key AND s.employment_status='active' AND NOT s.service_locked AND (svc.staff_level_required_id IS NULL OR EXISTS(SELECT 1 FROM public.staff_level actual JOIN public.staff_level required ON required.id=svc.staff_level_required_id WHERE actual.id=s.staff_level_id AND actual.rank_order>=required.rank_order)) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment WHERE staff_id=staff_key AND appointment_status NOT IN ('completed','cancelled','no_show') AND scheduled_start_at<ends AND scheduled_end_at>starts) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
 END IF;
 SELECT weight INTO weight_value FROM public.pet_current_weight WHERE pet_id=pet_key;
 IF category='pet_hotel' THEN
  SELECT * INTO room FROM public.hotel_room WHERE id=room_key AND status IN ('active','available') FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hotel_room_unavailable' USING ERRCODE='PT409'; END IF;
  SELECT * INTO room_type FROM public.hotel_room_type WHERE id=room.room_type_id AND service_id=svc.id AND status='active'
   AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts)
   AND (SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id)>=weight_from
   AND (weight_to IS NULL OR (SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id)<weight_to OR (weight_to_inclusive AND (SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id)=weight_to)) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hotel_room_unavailable' USING ERRCODE='PT409'; END IF;
  IF EXISTS(SELECT 1 FROM public.hotel_booking WHERE room_id=room_key AND status NOT IN ('cancelled','closed') AND check_in_at<ends AND check_out_at>starts) THEN RAISE EXCEPTION 'hotel_room_conflict' USING ERRCODE='PT409'; END IF;
  quantity_value:=ceil(extract(epoch FROM (ends-starts))/(room_type.billing_minutes*60))::integer;unit_value:=room_type.daily_price;quoted:=unit_value*quantity_value;
  quotes:=jsonb_build_object('room_id',room.id,'room_type_id',room_type.id,'daily_price',unit_value,'days',quantity_value,'check_in_at',starts,'check_out_at',ends);
 ELSE
  IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO matching FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts);
  IF matching<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_price' USING ERRCODE='22023'; END IF;
  SELECT * INTO rule FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts) FOR SHARE;
  quoted:=rule.base_price+rule.surcharge;
  quotes:=jsonb_build_object('outbound_rule_id',rule.id,'outbound_amount',quoted,'outbound_at',starts,'distance_per_leg',distance_value);
  IF trip_type_value='round_trip' AND svc.trip_type IS NULL THEN
   SELECT count(*) INTO matching FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=returns AND (effective_to IS NULL OR effective_to>returns);
   IF matching<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_return_price' USING ERRCODE='22023'; END IF;
   SELECT * INTO back_rule FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=returns AND (effective_to IS NULL OR effective_to>returns) FOR SHARE;
   quoted:=quoted+back_rule.base_price+back_rule.surcharge;
   quotes:=quotes||jsonb_build_object('return_rule_id',back_rule.id,'return_amount',back_rule.base_price+back_rule.surcharge,'return_at',returns);
  END IF;
  unit_value:=quoted;
 END IF;
 IF quoted IS NULL OR quoted<0 OR quoted::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'invalid_service_price'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 INSERT INTO public.appointment(id,appointment_code,customer_id,pet_id,staff_id,scheduled_start_at,scheduled_end_at,appointment_status,change_count,note)
 VALUES(p_id,'BKG-'||upper(replace(p_id::text,'-','')),owner,pet_key,staff_key,starts,ends,'pending',0,nullif(btrim(p_details->>'note'),''));
 INSERT INTO public.appointment_item(appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,discount_amount,duration_minutes,weight_snapshot,staff_id,status)
 VALUES(p_id,svc.id,true,svc.service_name,quantity_value,unit_value,0,duration_value,weight_value,staff_key,'pending');
 IF category='pet_hotel' THEN
  INSERT INTO public.hotel_booking(booking_code,room_id,appointment_id,check_in_at,check_out_at,status,special_diet_notes,care_notes,daily_price)
  VALUES('HTL-'||upper(replace(p_id::text,'-','')),room.id,p_id,starts,ends,'reserved',nullif(btrim(p_details->>'diet_notes'),''),nullif(btrim(p_details->>'care_notes'),''),unit_value);
 ELSE
  INSERT INTO public.taxi_trip(appointment_id,driver_staff_id,pickup_address,dropoff_address,distance_km,trip_type,outbound_at,return_at,taxi_price_rule_id,quoted_amount,status)
  VALUES(p_id,staff_key,btrim(p_details->>'pickup_address'),btrim(p_details->>'dropoff_address'),distance_value,trip_type_value,starts,returns,rule.id,quoted,'pending');
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'CREATE_LOGISTICS_BOOKING','appointment',p_id,p_details::text),(actor,'LOGISTICS_QUOTE','appointment',p_id,quotes::text);
 RETURN p_id;
END $function$;

CREATE OR REPLACE FUNCTION public.create_admin_service_booking(p_id uuid, p_details jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
 IF NOT FOUND OR pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts)<=0 THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_breed b ON b.species_id=ss.species_id WHERE ss.service_id=service_key AND b.id=pet.breed_id) THEN RAISE EXCEPTION 'service_species_not_supported' USING ERRCODE='22023'; END IF;
 SELECT category_code INTO category FROM public.service_category WHERE id=svc.category_id;
 IF category='pet_hotel' THEN RAISE EXCEPTION 'hotel_requires_room_reservation' USING ERRCODE='22023'; END IF;
 ends:=starts+make_interval(mins=>pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts));
 SELECT weight INTO weight_value FROM public.pet_current_weight WHERE pet_id=pet_key;
 IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
 IF category='pet_taxi' THEN
  IF NOT pawpal_private.has_permission('taxi_trip.write') THEN RAISE EXCEPTION 'taxi_write_forbidden' USING ERRCODE='42501'; END IF;
  IF coalesce(length(btrim(p_details->>'pickup_address')),0) NOT BETWEEN 1 AND 1000 OR coalesce(length(btrim(p_details->>'dropoff_address')),0) NOT BETWEEN 1 AND 1000
   OR distance_value IS NULL OR distance_value::text IN ('NaN','Infinity','-Infinity') OR distance_value<=0 OR (p_details->>'trip_type') IS DISTINCT FROM 'one_way' THEN RAISE EXCEPTION 'invalid_taxi_details' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO matching FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts);
  IF matching<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_price' USING ERRCODE='22023'; END IF;
  SELECT * INTO rule FROM public.taxi_price_rule WHERE service_id=svc.id AND status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to OR (distance_to_inclusive AND distance_value=distance_to)) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts) FOR SHARE;
  price_value:=rule.base_price+rule.surcharge;
 ELSE
  SELECT count(*) INTO matching FROM public.service_price_matrix WHERE service_id=service_key AND status='active' AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts);
  IF matching<>1 THEN RAISE EXCEPTION 'ambiguous_service_price' USING ERRCODE='22023'; END IF;
  SELECT unit_price INTO price_value FROM public.service_price_matrix WHERE service_id=service_key AND status='active' AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to OR (weight_to_inclusive AND weight_value=weight_to)) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts) FOR SHARE;
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
 VALUES(p_id,service_key,true,svc.service_name,1,price_value,0,pawpal_private.catalog_duration(svc.id,(SELECT weight FROM public.pet_current_weight WHERE pet_id=pet.id),starts),weight_value,staff_key,'pending');
 IF category='pet_taxi' THEN
  INSERT INTO public.taxi_trip(appointment_id,driver_staff_id,pickup_address,dropoff_address,distance_km,trip_type,outbound_at,taxi_price_rule_id,quoted_amount,status)
  VALUES(p_id,staff_key,btrim(p_details->>'pickup_address'),btrim(p_details->>'dropoff_address'),distance_value,'one_way',starts,rule.id,price_value,'pending');
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'CREATE_APPOINTMENT','appointment',p_id,p_details::text);
 RETURN p_id;
END $function$;

CREATE OR REPLACE FUNCTION public.save_admin_service_catalog(p_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb, p_prices jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
   IF ((price->>'weight_from')::numeric < previous_to OR (price->>'weight_from')::numeric < 0) OR (price->>'unit_price') IS NULL OR (price->>'unit_price')::numeric::text IN ('NaN','Infinity','-Infinity') OR (price->>'unit_price')::numeric<0
    OR (sequence<price_count AND ((price->>'weight_to') IS NULL OR (price->>'weight_to')::numeric::text IN ('NaN','Infinity','-Infinity') OR (price->>'weight_to')::numeric<=previous_to))
    OR ((price->>'weight_to')::numeric <= (price->>'weight_from')::numeric) THEN RAISE EXCEPTION 'invalid_service_price_ranges' USING ERRCODE='22023'; END IF;
   previous_to:=coalesce((price->>'weight_to')::numeric,1e100);
  END LOOP;
  IF EXISTS(SELECT 1 FROM public.service_price_matrix WHERE service_id=p_id AND status='active' AND effective_from>=now_at) THEN RAISE EXCEPTION 'scheduled_service_price_requires_review' USING ERRCODE='PT409'; END IF;
  UPDATE public.service_price_matrix SET effective_to=now_at WHERE service_id=p_id AND status='active' AND effective_from<now_at AND (effective_to IS NULL OR effective_to>now_at);
  FOR price IN SELECT value FROM jsonb_array_elements(p_prices) LOOP
   INSERT INTO public.service_price_matrix(service_id,weight_from,weight_to,unit_price,effective_from,status,duration_minutes)
   VALUES(p_id,(price->>'weight_from')::numeric,(price->>'weight_to')::numeric,(price->>'unit_price')::numeric,now_at,'active',coalesce((SELECT duration_minutes FROM public.service_price_matrix WHERE service_id=p_id AND weight_from=(price->>'weight_from')::numeric ORDER BY effective_from DESC LIMIT 1),duration_value));
  END LOOP;
 END IF;
 UPDATE public.service SET benefits=coalesce(p_details->>'benefits',benefits),amenities=coalesce(p_details->>'amenities',amenities),package_name=coalesce(p_details->>'package_name',package_name) WHERE id=p_id;
 IF p_details ? 'variant_updates' THEN PERFORM pawpal_private.save_catalog_variant_values(p_id,p_details->'variant_updates'); END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SAVE_SERVICE_CATALOG','service',p_id,'Lưu danh mục, loài hỗ trợ, quy trình và bảng giá trong cùng giao dịch.');
 RETURN p_id;
END $function$;
