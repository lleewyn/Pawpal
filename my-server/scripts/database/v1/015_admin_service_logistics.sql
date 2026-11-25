BEGIN;
CREATE OR REPLACE FUNCTION public.create_admin_logistics_booking(p_id uuid,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
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
 IF NOT FOUND OR svc.estimated_duration<=0 THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_breed b ON b.species_id=ss.species_id WHERE ss.service_id=svc.id AND b.id=pet.breed_id) THEN RAISE EXCEPTION 'service_species_not_supported' USING ERRCODE='22023'; END IF;
 SELECT category_code INTO category FROM public.service_category WHERE id=svc.category_id;
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
  IF trip_type_value='round_trip' AND (returns IS NULL OR NOT isfinite(returns) OR returns<starts+make_interval(mins=>svc.estimated_duration)) THEN RAISE EXCEPTION 'invalid_taxi_return' USING ERRCODE='22023'; END IF;
  IF trip_type_value='one_way' AND returns IS NOT NULL THEN RAISE EXCEPTION 'invalid_taxi_return' USING ERRCODE='22023'; END IF;
  ends:=coalesce(returns,starts)+make_interval(mins=>svc.estimated_duration);
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
  SELECT * INTO room_type FROM public.hotel_room_type WHERE id=room.room_type_id AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'hotel_room_unavailable' USING ERRCODE='PT409'; END IF;
  IF EXISTS(SELECT 1 FROM public.hotel_booking WHERE room_id=room_key AND status NOT IN ('cancelled','closed') AND check_in_at<ends AND check_out_at>starts) THEN RAISE EXCEPTION 'hotel_room_conflict' USING ERRCODE='PT409'; END IF;
  unit_value:=room_type.daily_price;quoted:=unit_value*quantity_value;
  quotes:=jsonb_build_object('room_id',room.id,'room_type_id',room_type.id,'daily_price',unit_value,'days',quantity_value,'check_in_at',starts,'check_out_at',ends);
 ELSE
  IF weight_value IS NULL OR weight_value<=0 THEN RAISE EXCEPTION 'pet_weight_required' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO matching FROM public.taxi_price_rule WHERE status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts);
  IF matching<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_price' USING ERRCODE='22023'; END IF;
  SELECT * INTO rule FROM public.taxi_price_rule WHERE status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to) AND effective_from<=starts AND (effective_to IS NULL OR effective_to>starts) FOR SHARE;
  quoted:=rule.base_price+rule.surcharge;
  quotes:=jsonb_build_object('outbound_rule_id',rule.id,'outbound_amount',quoted,'outbound_at',starts,'distance_per_leg',distance_value);
  IF trip_type_value='round_trip' THEN
   SELECT count(*) INTO matching FROM public.taxi_price_rule WHERE status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to) AND effective_from<=returns AND (effective_to IS NULL OR effective_to>returns);
   IF matching<>1 THEN RAISE EXCEPTION 'ambiguous_taxi_return_price' USING ERRCODE='22023'; END IF;
   SELECT * INTO back_rule FROM public.taxi_price_rule WHERE status='active' AND distance_value>=distance_from AND (distance_to IS NULL OR distance_value<distance_to) AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to) AND effective_from<=returns AND (effective_to IS NULL OR effective_to>returns) FOR SHARE;
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
END $$;

CREATE OR REPLACE FUNCTION public.save_admin_service_record(p_id uuid,p_appointment_id uuid,p_expected_updated_at timestamptz,p_type text,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment; pet public.pet_profile; actor uuid; performer uuid:=nullif(p_details->>'staffId','')::uuid;
 prior public.appointment_record; rev integer; at_time timestamptz:=now(); weight_value numeric:=nullif(p_details->>'actualWeight','')::numeric;
 condition_text text; confirmation text:=CASE WHEN p_details->>'customerConfirmed'='true' THEN 'confirmed' ELSE 'pending' END;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('appointment_item.write') OR NOT pawpal_private.has_permission('appointment_record.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'service_record_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_appointment_id IS NULL OR p_type IS NULL OR p_type NOT IN ('intake','handover') OR p_details IS NULL OR jsonb_typeof(p_details)<>'object' OR length(p_details::text)>12000 THEN RAISE EXCEPTION 'invalid_service_record' USING ERRCODE='22023'; END IF;
 -- Match the staff-before-appointment lock order used by assignment and booking.
 IF p_type='intake' THEN
  IF performer IS NULL OR NOT pawpal_private.has_permission('pet_weight_history.write') THEN RAISE EXCEPTION 'service_record_forbidden' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.staff WHERE id=performer AND employment_status='active' AND NOT service_locked FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='22023'; END IF;
 END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO prior FROM public.appointment_record WHERE id=p_id;
 IF FOUND THEN
  IF prior.appointment_id<>p_appointment_id OR prior.record_type<>p_type OR NOT EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND action='SAVE_SERVICE_RECORD' AND description=p_details::text) THEN RAISE EXCEPTION 'service_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 IF p_expected_updated_at IS NULL OR a.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 SELECT * INTO pet FROM public.pet_profile WHERE id=a.pet_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'pet_not_found' USING ERRCODE='P0002'; END IF;
 IF p_type='intake' THEN
  IF a.appointment_status NOT IN ('confirmed','checked_in','in_progress') OR weight_value IS NULL OR weight_value::text IN ('NaN','Infinity','-Infinity') OR weight_value<=0 OR weight_value>1000
   OR coalesce(length(btrim(p_details->>'skinCoat')),0)=0 OR coalesce(length(btrim(p_details->>'eyesEars')),0)=0 OR coalesce(length(btrim(p_details->>'wounds')),0)=0 OR coalesce(length(btrim(p_details->>'temperament')),0)=0 THEN RAISE EXCEPTION 'intake_observations_required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id JOIN public.staff_level required ON required.id=s.staff_level_required_id WHERE i.appointment_id=a.id AND i.status<>'cancelled' AND NOT EXISTS(SELECT 1 FROM public.staff st JOIN public.staff_level actual ON actual.id=st.staff_level_id WHERE st.id=performer AND actual.rank_order>=required.rank_order)) THEN RAISE EXCEPTION 'staff_level_required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment WHERE id<>a.id AND staff_id=performer AND appointment_status NOT IN ('completed','cancelled','no_show') AND scheduled_start_at<a.scheduled_end_at AND scheduled_end_at>a.scheduled_start_at) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
  condition_text:=concat_ws(E'\n','Da và lông: '||btrim(p_details->>'skinCoat'),'Mắt và tai: '||btrim(p_details->>'eyesEars'),'Vết thương: '||btrim(p_details->>'wounds'),'Tập tính: '||btrim(p_details->>'temperament'),'Tư trang: '||coalesce(p_details->>'belongings',''));
  INSERT INTO public.pet_weight_history(pet_id,weight,measured_at,recorded_by,note) VALUES(a.pet_id,weight_value,at_time,actor,'Cân khi lập biên bản tiếp nhận dịch vụ.');
  UPDATE public.appointment SET appointment_status='in_progress',staff_id=performer,check_in_time=coalesce(check_in_time,at_time) WHERE id=a.id;
  UPDATE public.appointment_item SET staff_id=performer,status='in_progress' WHERE appointment_id=a.id AND is_primary AND status<>'cancelled';
 ELSE
  IF a.appointment_status<>'in_progress' OR p_details->>'qualityAccepted' IS DISTINCT FROM 'true' OR p_details->>'belongingsReturned' IS DISTINCT FROM 'true' OR confirmation<>'confirmed' THEN RAISE EXCEPTION 'handover_confirmation_required' USING ERRCODE='22023'; END IF;
  SELECT * INTO prior FROM public.appointment_record WHERE appointment_id=a.id AND record_type='intake' ORDER BY revision_no DESC LIMIT 1;
  IF prior.id IS NULL OR prior.customer_confirmation_status<>'confirmed' THEN RAISE EXCEPTION 'confirmed_intake_required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment_adjustment WHERE appointment_id=a.id AND (approval_status='pending' OR (approval_status='approved' AND customer_consent_status<>'confirmed'))) THEN RAISE EXCEPTION 'pending_service_adjustments' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.hotel_booking WHERE appointment_id=a.id AND status NOT IN ('completed','cancelled','checked_out','closed')) THEN RAISE EXCEPTION 'hotel_checkout_required' USING ERRCODE='22023'; END IF;
  condition_text:='Đã kiểm tra chất lượng dịch vụ, trả đủ tư trang và ghi nhận khách xác nhận bàn giao.';
  UPDATE public.appointment SET appointment_status='completed',check_out_time=at_time WHERE id=a.id;
  UPDATE public.appointment_item SET status='completed' WHERE appointment_id=a.id AND status<>'cancelled';
 END IF;
 SELECT coalesce(max(revision_no),0)+1 INTO rev FROM public.appointment_record WHERE appointment_id=a.id AND record_type=p_type;
 INSERT INTO public.appointment_record(id,appointment_id,record_type,schema_version,revision_no,recorded_by,recorded_at,condition_note,safety_note_snapshot,allergy_note_snapshot,customer_confirmation_status,confirmed_at,note)
 VALUES(p_id,a.id,p_type,2,rev,actor,at_time,condition_text,pet.safety_note,pet.allergy,confirmation,CASE WHEN confirmation='confirmed' THEN at_time END,nullif(btrim(p_details->>'belongingsNote'),''));
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SAVE_SERVICE_RECORD','appointment_record',p_id,p_details::text);
 RETURN p_id;
END $$;


-- Parent transitions synchronize logistics in the same transaction as intake/handover.
CREATE OR REPLACE FUNCTION pawpal_private.sync_service_logistics() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE stay public.hotel_booking; trip public.taxi_trip; category text;
BEGIN
 IF (NEW.appointment_status,NEW.staff_id) IS NOT DISTINCT FROM (OLD.appointment_status,OLD.staff_id) THEN RETURN NEW; END IF;
 SELECT c.category_code INTO category FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id JOIN public.service_category c ON c.id=s.category_id WHERE i.appointment_id=NEW.id AND i.is_primary;
 IF category IS NULL OR category NOT IN ('pet_hotel','pet_taxi') THEN RETURN NEW; END IF;
 IF auth.role()='authenticated' AND (NOT pawpal_private.has_permission('audit_log.write') OR (category='pet_hotel' AND NOT pawpal_private.has_permission('hotel_booking.write')) OR (category='pet_taxi' AND NOT pawpal_private.has_permission('taxi_trip.write'))) THEN RAISE EXCEPTION 'logistics_write_forbidden' USING ERRCODE='42501'; END IF;
 IF category='pet_hotel' THEN
  SELECT * INTO stay FROM public.hotel_booking WHERE appointment_id=NEW.id FOR UPDATE;
  IF stay.id IS NULL THEN
   IF NEW.appointment_status IN ('in_progress','completed') THEN RAISE EXCEPTION 'legacy_logistics_missing' USING ERRCODE='22023'; END IF;
   RETURN NEW;
  END IF;
  PERFORM 1 FROM public.hotel_room WHERE id=stay.room_id FOR UPDATE;
  IF NEW.appointment_status='cancelled' THEN UPDATE public.hotel_booking SET status='cancelled' WHERE id=stay.id;
  ELSEIF NEW.appointment_status='in_progress' AND OLD.appointment_status<>'in_progress' THEN
   IF now()<stay.check_in_at OR now()>=stay.check_out_at OR NOT EXISTS(SELECT 1 FROM public.hotel_room WHERE id=stay.room_id AND status IN ('available','active')) THEN RAISE EXCEPTION 'hotel_checkin_time_or_room_invalid' USING ERRCODE='22023'; END IF;
   IF EXISTS(SELECT 1 FROM public.hotel_booking WHERE room_id=stay.room_id AND id<>stay.id AND status='checked_in') THEN RAISE EXCEPTION 'hotel_room_occupied' USING ERRCODE='PT409'; END IF;
   UPDATE public.hotel_booking SET status='checked_in' WHERE id=stay.id;
  ELSEIF NEW.appointment_status='completed' AND stay.status<>'closed' THEN RAISE EXCEPTION 'hotel_checkout_required' USING ERRCODE='22023'; END IF;
 ELSE
  SELECT * INTO trip FROM public.taxi_trip WHERE appointment_id=NEW.id FOR UPDATE;
  IF trip.id IS NULL THEN
   IF NEW.appointment_status IN ('in_progress','completed') THEN RAISE EXCEPTION 'legacy_logistics_missing' USING ERRCODE='22023'; END IF;
   RETURN NEW;
  END IF;
  IF NEW.appointment_status='in_progress' AND now()<trip.outbound_at THEN RAISE EXCEPTION 'taxi_trip_not_due' USING ERRCODE='22023'; END IF;
  IF NEW.appointment_status='completed' AND trip.trip_type='round_trip' AND now()<trip.return_at THEN RAISE EXCEPTION 'taxi_return_not_due' USING ERRCODE='22023'; END IF;
  UPDATE public.taxi_trip SET driver_staff_id=NEW.staff_id,status=CASE WHEN NEW.appointment_status IN ('cancelled','completed','in_progress') THEN NEW.appointment_status ELSE status END WHERE id=trip.id;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS v1_sync_service_logistics ON public.appointment;
CREATE TRIGGER v1_sync_service_logistics AFTER UPDATE OF appointment_status,staff_id ON public.appointment FOR EACH ROW EXECUTE FUNCTION pawpal_private.sync_service_logistics();

CREATE OR REPLACE FUNCTION public.close_admin_hotel_stay(p_appointment_id uuid,p_expected_updated_at timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment; stay public.hotel_booking; actor uuid;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('hotel_booking.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'logistics_write_forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND OR a.appointment_status<>'in_progress' THEN RAISE EXCEPTION 'hotel_not_checked_in' USING ERRCODE='22023'; END IF;
 IF p_expected_updated_at IS NULL OR a.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
 SELECT * INTO stay FROM public.hotel_booking WHERE appointment_id=a.id FOR UPDATE;
 IF NOT FOUND OR stay.status<>'checked_in' THEN RAISE EXCEPTION 'hotel_not_checked_in' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.hotel_room WHERE id=stay.room_id FOR UPDATE;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 UPDATE public.hotel_booking SET status='closed' WHERE id=stay.id;
 UPDATE public.appointment SET updated_at=clock_timestamp() WHERE id=a.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'HOTEL_CHECKOUT','hotel_booking',stay.id,jsonb_build_object('room_id',stay.room_id,'released_at',now(),'planned_check_in',stay.check_in_at,'planned_check_out',stay.check_out_at,'daily_price',stay.daily_price,'note','Trả phòng không tự thay giá đã chốt hoặc ghi thanh toán.')::text);
 RETURN stay.id;
END $$;
REVOKE ALL ON FUNCTION public.create_admin_logistics_booking(uuid,jsonb),public.close_admin_hotel_stay(uuid,timestamptz),pawpal_private.sync_service_logistics() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_admin_logistics_booking(uuid,jsonb),public.close_admin_hotel_stay(uuid,timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
