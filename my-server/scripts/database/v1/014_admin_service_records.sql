BEGIN;
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
  IF EXISTS(SELECT 1 FROM public.hotel_booking WHERE appointment_id=a.id AND status NOT IN ('completed','cancelled','checked_out')) THEN RAISE EXCEPTION 'hotel_checkout_required' USING ERRCODE='22023'; END IF;
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

CREATE OR REPLACE FUNCTION public.save_admin_service_care_log(p_id uuid,p_appointment_id uuid,p_expected_updated_at timestamptz,p_expected_log_updated_at timestamptz,p_action text,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment; old public.care_log; actor uuid; performer uuid:=nullif(p_details->>'staff_id','')::uuid;
 title_value text:=btrim(p_details->>'title'); at_time timestamptz:=coalesce(nullif(p_details->>'recorded_at','')::timestamptz,clock_timestamp()); action_key uuid;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('care_log.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'service_log_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_action IS NULL OR p_action NOT IN ('save','delete') THEN RAISE EXCEPTION 'invalid_service_log' USING ERRCODE='22023'; END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO old FROM public.care_log WHERE id=p_id;
 IF p_action='save' AND p_expected_log_updated_at IS NULL AND old.id IS NOT NULL THEN
  IF old.appointment_id<>a.id OR NOT EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND action='SAVE_CARE_LOG' AND description=p_details::text) THEN RAISE EXCEPTION 'service_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 IF p_expected_updated_at IS NULL OR a.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
 IF a.appointment_status<>'in_progress' THEN RAISE EXCEPTION 'care_log_requires_active_service' USING ERRCODE='22023'; END IF;
 IF old.id IS NOT NULL AND (old.appointment_id<>a.id OR p_expected_log_updated_at IS NULL OR old.updated_at<>p_expected_log_updated_at) THEN RAISE EXCEPTION 'care_log_changed' USING ERRCODE='PT409'; END IF;
 IF old.id IS NULL AND (p_expected_log_updated_at IS NOT NULL OR p_action='delete') THEN RAISE EXCEPTION 'care_log_not_found' USING ERRCODE='P0002'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF p_action='delete' THEN
  IF EXISTS(SELECT 1 FROM public.care_log_media WHERE care_log_id=p_id) THEN RAISE EXCEPTION 'care_log_has_media' USING ERRCODE='22023'; END IF;
  DELETE FROM public.care_log WHERE id=p_id;
 ELSE
  IF coalesce(length(title_value),0) NOT BETWEEN 1 AND 200 OR length(p_details->>'note')>4000 OR performer IS NULL OR NOT isfinite(at_time) OR at_time>clock_timestamp()+interval '1 minute' OR at_time<date_trunc('minute',coalesce(a.check_in_time,a.created_at))
   OR NOT EXISTS(SELECT 1 FROM public.staff WHERE id=performer AND employment_status='active' AND NOT service_locked) THEN RAISE EXCEPTION 'invalid_service_log' USING ERRCODE='22023'; END IF;
  SELECT ca.id INTO action_key FROM public.care_action ca JOIN public.service_care_action sc ON sc.care_action_id=ca.id JOIN public.appointment_item i ON i.service_id=sc.service_id WHERE i.appointment_id=a.id AND i.status<>'cancelled' AND ca.is_active AND lower(btrim(ca.action_name))=lower(title_value) ORDER BY ca.id LIMIT 1;
  IF old.id IS NULL THEN
   INSERT INTO public.care_log(id,appointment_id,care_action_id,action_name_snapshot,description,recorded_at,recorded_by) VALUES(p_id,a.id,action_key,title_value,nullif(btrim(p_details->>'note'),''),at_time,performer);
  ELSE
   UPDATE public.care_log SET care_action_id=action_key,action_name_snapshot=title_value,description=nullif(btrim(p_details->>'note'),''),recorded_at=at_time,recorded_by=performer WHERE id=p_id;
  END IF;
 END IF;
 UPDATE public.appointment SET updated_at=clock_timestamp() WHERE id=a.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,CASE WHEN p_action='delete' THEN 'DELETE_CARE_LOG' ELSE 'SAVE_CARE_LOG' END,'care_log',p_id,CASE WHEN p_action='delete' THEN to_jsonb(old)::text ELSE p_details::text END);
 RETURN p_id;
END $$;

CREATE OR REPLACE FUNCTION public.change_admin_service_charge(p_id uuid,p_appointment_id uuid,p_expected_updated_at timestamptz,p_action text,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
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
  IF NOT FOUND OR svc.estimated_duration<=0 OR NOT EXISTS(SELECT 1 FROM public.service_category WHERE id=svc.category_id AND category_code='grooming_spa') THEN RAISE EXCEPTION 'active_service_required' USING ERRCODE='22023'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_profile pet ON pet.id=a.pet_id JOIN public.pet_breed b ON b.id=pet.breed_id AND b.species_id=ss.species_id WHERE ss.service_id=svc.id) THEN RAISE EXCEPTION 'service_species_not_supported' USING ERRCODE='22023'; END IF;
  IF a.staff_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff st WHERE st.id=a.staff_id AND st.employment_status='active' AND NOT st.service_locked AND (svc.staff_level_required_id IS NULL OR EXISTS(SELECT 1 FROM public.staff_level actual JOIN public.staff_level required ON required.id=svc.staff_level_required_id WHERE actual.id=st.staff_level_id AND actual.rank_order>=required.rank_order))) THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='22023'; END IF;
  SELECT weight INTO weight_value FROM public.pet_current_weight WHERE pet_id=a.pet_id;
  SELECT count(*),min(unit_price) INTO matching,quoted FROM public.service_price_matrix WHERE service_id=svc.id AND status='active' AND weight_value>=weight_from AND (weight_to IS NULL OR weight_value<weight_to) AND effective_from<=a.scheduled_start_at AND (effective_to IS NULL OR effective_to>a.scheduled_start_at);
  IF matching<>1 OR quoted IS NULL OR amount_value IS DISTINCT FROM quoted THEN RAISE EXCEPTION 'service_quote_changed' USING ERRCODE='22023'; END IF;
  ends:=a.scheduled_end_at+make_interval(mins=>svc.estimated_duration);
  IF a.staff_id IS NOT NULL AND EXISTS(SELECT 1 FROM public.appointment WHERE id<>a.id AND staff_id=a.staff_id AND appointment_status NOT IN ('completed','cancelled','no_show') AND scheduled_start_at<ends AND scheduled_end_at>a.scheduled_start_at) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
  INSERT INTO public.appointment_item(id,appointment_id,service_id,is_primary,name_snapshot,quantity,unit_price,discount_amount,duration_minutes,weight_snapshot,staff_id,status)
  VALUES(p_id,a.id,svc.id,false,svc.service_name,1,quoted,0,svc.estimated_duration,weight_value,a.staff_id,a.appointment_status);
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
END $$;
REVOKE ALL ON FUNCTION public.save_admin_service_record(uuid,uuid,timestamptz,text,jsonb),public.save_admin_service_care_log(uuid,uuid,timestamptz,timestamptz,text,jsonb),public.change_admin_service_charge(uuid,uuid,timestamptz,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admin_service_record(uuid,uuid,timestamptz,text,jsonb),public.save_admin_service_care_log(uuid,uuid,timestamptz,timestamptz,text,jsonb),public.change_admin_service_charge(uuid,uuid,timestamptz,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
