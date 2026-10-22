BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.customer_booking_move_quote(p_id uuid,p_start timestamptz)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
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
    unit_value:=room_rate;qty:=ceil(extract(epoch FROM (ends-p_start))/86400)::integer;
   ELSIF kind='pet_taxi' AND line.is_primary THEN
    IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
    SELECT count(*),min(id::text)::uuid INTO count_value,price_key FROM public.taxi_price_rule
     WHERE status='active' AND trip.distance_km>=distance_from AND (distance_to IS NULL OR trip.distance_km<distance_to)
     AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to) AND effective_from<=p_start AND (effective_to IS NULL OR effective_to>p_start);
    IF count_value<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_price' USING ERRCODE='22023'; END IF;
    SELECT base_price+surcharge INTO unit_value FROM public.taxi_price_rule WHERE id=price_key;
    IF trip.trip_type='round_trip' THEN
     SELECT count(*),min(id::text)::uuid INTO count_value,back_key FROM public.taxi_price_rule
      WHERE status='active' AND trip.distance_km>=distance_from AND (distance_to IS NULL OR trip.distance_km<distance_to)
      AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to) AND effective_from<=back_at AND (effective_to IS NULL OR effective_to>back_at);
     IF count_value<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_price' USING ERRCODE='22023'; END IF;
     SELECT unit_value+base_price+surcharge INTO unit_value FROM public.taxi_price_rule WHERE id=back_key;
    END IF;
    qty:=1;logistics:=logistics||jsonb_build_object('rule_id',price_key,'return_rule_id',back_key,'quoted_amount',unit_value);
   ELSIF kind='grooming_spa' THEN
    IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
    SELECT count(*),min(id::text)::uuid INTO count_value,price_key FROM public.service_price_matrix WHERE service_id=svc.id AND status='active'
     AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to) AND effective_from<=p_start AND (effective_to IS NULL OR effective_to>p_start);
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
END $$;
REVOKE ALL ON FUNCTION pawpal_private.customer_booking_move_quote(uuid,timestamptz) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.quote_own_booking_move(p_id uuid,p_start timestamptz)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$ SELECT pawpal_private.customer_booking_move_quote(p_id,p_start) $$;

DO $$ DECLARE body text; anchor text:=$old$ELSIF NEW.entity_name='appointment' AND NEW.action='CUSTOMER_CANCEL_APPOINTMENT'$old$;
BEGIN
 SELECT pg_get_functiondef('pawpal_private.audit_actor()'::regprocedure) INTO body;
 IF position('CUSTOMER_RESCHEDULE_APPOINTMENT' IN body)=0 THEN
  IF position(anchor IN body)=0 THEN RAISE EXCEPTION 'Unexpected audit actor definition'; END IF;
  EXECUTE replace(body,anchor,$new$ELSIF NEW.entity_name='appointment' AND NEW.action='CUSTOMER_RESCHEDULE_APPOINTMENT'
   AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid())
   AND EXISTS(SELECT 1 FROM public.appointment a WHERE a.id=NEW.entity_id AND a.appointment_status='pending' AND a.change_count>0 AND pawpal_private.owns_customer(a.customer_id)) THEN RETURN NEW;
   ELSIF NEW.entity_name='appointment' AND NEW.action='CUSTOMER_CANCEL_APPOINTMENT'$new$);
 END IF;
 SELECT pg_get_functiondef('pawpal_private.sync_service_logistics()'::regprocedure) INTO body;
 IF position('NEW.change_count=OLD.change_count+1' IN body)=0 THEN
  anchor:=$old$AND (NOT pawpal_private.has_permission('audit_log.write')$old$;
  IF position(anchor IN body)=0 THEN RAISE EXCEPTION 'Unexpected logistics guard'; END IF;
  EXECUTE replace(body,anchor,$new$AND NOT (NEW.appointment_status='pending' AND OLD.appointment_status='confirmed' AND NEW.change_count=OLD.change_count+1
   AND OLD.change_count<2 AND NEW.staff_id IS NOT DISTINCT FROM OLD.staff_id AND NEW.customer_id=OLD.customer_id AND NEW.pet_id=OLD.pet_id
   AND OLD.scheduled_start_at>=now()+interval '2 hours' AND NEW.scheduled_start_at>=now()+interval '2 hours'
   AND pawpal_private.owns_customer(NEW.customer_id) AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid())
   AND NOT EXISTS(SELECT 1 FROM public.payment WHERE appointment_id=NEW.id AND transaction_status IN ('pending','succeeded')))
   AND (NOT pawpal_private.has_permission('audit_log.write')$new$);
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.reschedule_own_service_booking(p_request_id uuid,p_id uuid,p_start timestamptz,p_expected_quote text,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; a public.appointment; previous public.audit_log; quote jsonb; entry jsonb; reason text:=btrim(p_reason);
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id) FOR UPDATE;
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'customer_session_required' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_expected_quote IS NULL OR reason IS NULL OR length(reason) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'change_reason_required' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,67));
 SELECT * INTO a FROM public.appointment WHERE id=p_id AND customer_id=owner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_owner_required' USING ERRCODE='42501'; END IF;
 SELECT * INTO previous FROM public.audit_log WHERE action='CUSTOMER_RESCHEDULE_APPOINTMENT'
  AND (CASE WHEN action='CUSTOMER_RESCHEDULE_APPOINTMENT' THEN description::jsonb END)->>'request_id'=p_request_id::text LIMIT 1;
 IF FOUND THEN
  IF previous.entity_id<>p_id OR previous.description::jsonb->>'reason'<>reason OR (previous.description::jsonb->>'start_at')::timestamptz IS DISTINCT FROM p_start
   OR previous.description::jsonb->>'quote_version'<>p_expected_quote THEN RAISE EXCEPTION 'booking_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN a.id;
 END IF;
 quote:=pawpal_private.customer_booking_move_quote(p_id,p_start);
 IF quote->>'version'<>p_expected_quote THEN RAISE EXCEPTION 'booking_quote_changed_reload_required' USING ERRCODE='PT409'; END IF;
 FOR entry IN SELECT value FROM jsonb_array_elements(quote->'lines') LOOP
  UPDATE public.appointment_item SET quantity=(entry->>'quantity')::integer,unit_price=(entry->>'unit_price')::numeric,weight_snapshot=(entry->>'weight')::numeric,status='pending' WHERE id=(entry->>'id')::uuid;
 END LOOP;
 IF quote->'logistics'->>'kind'='pet_hotel' THEN
  UPDATE public.hotel_booking SET check_in_at=p_start,check_out_at=(quote->>'end_at')::timestamptz,daily_price=(quote->'logistics'->>'daily_price')::numeric,status='reserved' WHERE appointment_id=p_id;
 ELSIF quote->'logistics'->>'kind'='pet_taxi' THEN
  UPDATE public.taxi_trip SET outbound_at=p_start,return_at=(quote->'logistics'->>'return_at')::timestamptz,
   taxi_price_rule_id=(quote->'logistics'->>'rule_id')::uuid,quoted_amount=(quote->'logistics'->>'quoted_amount')::numeric,status='pending' WHERE appointment_id=p_id;
 END IF;
 UPDATE public.appointment SET scheduled_start_at=p_start,scheduled_end_at=(quote->>'end_at')::timestamptz,appointment_status='pending',change_count=change_count+1 WHERE id=p_id;
 INSERT INTO public.audit_log(action,entity_name,entity_id,description) VALUES('CUSTOMER_RESCHEDULE_APPOINTMENT','appointment',p_id,
  jsonb_build_object('request_id',p_request_id,'reason',reason,'start_at',p_start,'quote_version',p_expected_quote,'quote',quote)::text);
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.quote_own_booking_move(uuid,timestamptz),public.reschedule_own_service_booking(uuid,uuid,timestamptz,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.quote_own_booking_move(uuid,timestamptz),public.reschedule_own_service_booking(uuid,uuid,timestamptz,text,text) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
