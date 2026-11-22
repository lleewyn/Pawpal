BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.booking_staff_choices(p_owner uuid, p_details jsonb, p_exclude uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
#variable_conflict use_variable
DECLARE svc public.service;starts timestamptz:=(p_details->>'scheduled_start_at')::timestamptz;ends timestamptz;weight numeric;local_start timestamp;local_end timestamp;result jsonb;
BEGIN
 SELECT * INTO svc FROM public.service WHERE id=(p_details->>'service_id')::uuid AND status='active';
 IF svc.id IS NULL THEN RETURN '[]';END IF;
 SELECT w.weight INTO weight FROM public.pet_current_weight w JOIN public.pet_profile p ON p.id=w.pet_id WHERE p.id=(p_details->>'pet_id')::uuid AND p.customer_id=p_owner AND p.status='active';
 ends:=starts+make_interval(mins=>(pawpal_private.catalog_duration(svc.id,weight,starts)+coalesce((SELECT sum(estimated_duration) FROM public.service_addon WHERE id IN(SELECT value::uuid FROM jsonb_array_elements_text(coalesce(p_details->'addon_ids','[]'))) AND service_id=svc.id AND status='active'),0))::integer);
 local_start:=starts AT TIME ZONE 'Asia/Bangkok';local_end:=ends AT TIME ZONE 'Asia/Bangkok';
 IF starts IS NULL OR ends IS NULL OR local_start::date<>local_end::date THEN RETURN '[]';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',person.id,'name',person.full_name,'source',person.source,'requires_confirmation',person.source<>'scheduled') ORDER BY person.full_name),'[]') INTO result
 FROM (
  SELECT s.id,s.full_name,CASE WHEN EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status='available' AND sc.start_at<=starts AND sc.end_at>=ends) THEN 'scheduled'
   WHEN EXISTS(SELECT 1 FROM public.staff_recurring_schedule r WHERE r.staff_id=s.id AND r.is_active AND r.valid_from<=local_start::date AND (r.valid_to IS NULL OR r.valid_to>=local_start::date) AND extract(isodow FROM local_start)::integer=ANY(r.weekdays) AND r.start_time<=local_start::time AND r.end_time>=local_end::time) THEN 'recurring' ELSE 'request' END source
  FROM public.staff s WHERE s.employment_status='active' AND NOT s.service_locked AND s.staff_level_id IS NOT NULL AND pawpal_private.staff_skill_allows_assignment(s.id)
  AND (svc.staff_level_required_id IS NULL OR EXISTS(SELECT 1 FROM public.staff_level a JOIN public.staff_level r ON r.id=svc.staff_level_required_id WHERE a.id=s.staff_level_id AND a.rank_order>=r.rank_order))
  AND NOT EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status<>'available' AND sc.start_at<ends AND sc.end_at>starts)
  AND (
   EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status='available' AND sc.start_at<=starts AND sc.end_at>=ends)
   OR (NOT EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.start_at<((local_start::date+1)::timestamp AT TIME ZONE 'Asia/Bangkok') AND sc.end_at>(local_start::date::timestamp AT TIME ZONE 'Asia/Bangkok'))
    AND (EXISTS(SELECT 1 FROM public.staff_recurring_schedule r WHERE r.staff_id=s.id AND r.is_active AND r.valid_from<=local_start::date AND (r.valid_to IS NULL OR r.valid_to>=local_start::date) AND extract(isodow FROM local_start)::integer=ANY(r.weekdays) AND r.start_time<=local_start::time AND r.end_time>=local_end::time)
     OR NOT EXISTS(SELECT 1 FROM public.staff_recurring_schedule r WHERE r.staff_id=s.id AND r.is_active AND r.valid_from<=local_start::date AND (r.valid_to IS NULL OR r.valid_to>=local_start::date))))
  )
  AND NOT EXISTS(SELECT 1 FROM public.appointment a WHERE a.id IS DISTINCT FROM p_exclude AND a.appointment_status NOT IN('completed','cancelled','no_show','expired','da_huy','da_hoan_tat','vang_mat') AND a.scheduled_start_at<ends AND a.scheduled_end_at>starts AND (a.staff_id=s.id OR a.requested_staff_id=s.id OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=s.id AND i.status<>'cancelled')))
  AND NOT EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold h WHERE h.staff_id=s.id AND h.customer_id<>p_owner AND h.expires_at>clock_timestamp() AND h.starts<ends AND h.ends>starts)
 ) person;
 RETURN result;
END $function$

CREATE OR REPLACE FUNCTION pawpal_private.finalize_requested_booking(p_id uuid, p_staff uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.appointment;choice jsonb;concrete boolean;
BEGIN
 SELECT * INTO a FROM public.appointment WHERE id=p_id;
 SELECT v INTO choice FROM jsonb_array_elements(pawpal_private.booking_staff_choices(a.customer_id,pawpal_private.booking_request_details(p_id),p_id)) v WHERE v->>'id'=p_staff::text;
 IF choice IS NULL THEN RAISE EXCEPTION 'preferred_staff_unavailable' USING ERRCODE='PT409';END IF;
 concrete:=choice->>'source'='scheduled';
 UPDATE public.appointment SET requested_staff_id=p_staff,staff_id=CASE WHEN concrete THEN p_staff END,staff_confirmation_status=CASE WHEN concrete THEN 'confirmed' ELSE 'pending' END,appointment_status=CASE WHEN concrete THEN 'confirmed' ELSE 'pending' END WHERE id=p_id;
 UPDATE public.appointment_item SET staff_id=CASE WHEN concrete THEN p_staff END WHERE appointment_id=p_id;
END $function$

CREATE OR REPLACE FUNCTION pawpal_private.guard_requested_booking()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE choice jsonb;consented boolean:=false;admin_reassign boolean:=false;
BEGIN
 IF OLD.requested_staff_id IS NULL AND NEW.requested_staff_id IS NULL THEN RETURN NEW;END IF;
 PERFORM pg_advisory_xact_lock(820068);
 consented:=coalesce(OLD.staff_confirmation_status='awaiting_customer' AND OLD.proposal_staff_id IS NOT NULL
  AND NEW.requested_staff_id=OLD.proposal_staff_id AND NEW.staff_id=OLD.proposal_staff_id
  AND NEW.scheduled_start_at=OLD.proposal_start_at AND NEW.scheduled_end_at=OLD.proposal_end_at
  AND (auth.role()='service_role' OR pawpal_private.owns_customer(OLD.customer_id)),false);
 admin_reassign:=OLD.requested_staff_id IS NOT NULL
  AND NEW.staff_id IS NOT NULL AND NEW.staff_id IS DISTINCT FROM OLD.staff_id
  AND NEW.requested_staff_id=NEW.staff_id AND NEW.staff_confirmation_status='confirmed'
  AND OLD.appointment_status IN('checked_in','in_progress','da_check_in','da_tiep_nhan','dang_thuc_hien','accepted')
  AND pawpal_private.has_permission('appointment.write');
 IF OLD.requested_staff_id IS NOT NULL AND NOT consented AND NOT admin_reassign AND (NEW.requested_staff_id IS DISTINCT FROM OLD.requested_staff_id OR NEW.staff_id IS NOT NULL AND NEW.staff_id IS DISTINCT FROM OLD.requested_staff_id) THEN
  RAISE EXCEPTION 'requested_staff_customer_consent_required' USING ERRCODE='PT409';
 END IF;
 IF OLD.requested_staff_id IS NOT NULL AND (NEW.scheduled_start_at,NEW.scheduled_end_at) IS DISTINCT FROM (OLD.scheduled_start_at,OLD.scheduled_end_at) AND NOT consented AND NOT admin_reassign THEN
  IF NOT pawpal_private.owns_customer(OLD.customer_id) THEN RAISE EXCEPTION 'requested_staff_customer_consent_required' USING ERRCODE='PT409';END IF;
  SELECT v INTO choice FROM jsonb_array_elements(pawpal_private.booking_staff_choices(NEW.customer_id,pawpal_private.booking_request_details(OLD.id,NEW.scheduled_start_at),OLD.id)) v WHERE v->>'id'=NEW.requested_staff_id::text;
  IF choice IS NULL THEN RAISE EXCEPTION 'preferred_staff_unavailable' USING ERRCODE='PT409';END IF;
  IF choice->>'source'<>'scheduled' THEN NEW.staff_id:=NULL;NEW.staff_confirmation_status:='pending';NEW.appointment_status:='pending';END IF;
 END IF;
 IF (NEW.proposal_staff_id,NEW.proposal_start_at,NEW.proposal_end_at) IS DISTINCT FROM (OLD.proposal_staff_id,OLD.proposal_start_at,OLD.proposal_end_at)
 AND NEW.proposal_staff_id IS NOT NULL AND NOT pawpal_private.has_permission('appointment.write') AND auth.role()<>'service_role' THEN RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501';END IF;
 IF NEW.appointment_status IN('cancelled','completed','no_show','expired') THEN RETURN NEW;END IF;
 IF (NEW.appointment_status='confirmed' OR NEW.staff_id IS NOT NULL AND NEW.staff_id IS DISTINCT FROM OLD.staff_id) AND NEW.requested_staff_id IS NOT NULL AND NOT admin_reassign THEN
  SELECT v INTO choice FROM jsonb_array_elements(pawpal_private.booking_staff_choices(NEW.customer_id,pawpal_private.booking_request_details(OLD.id,NEW.scheduled_start_at),OLD.id)) v WHERE v->>'id'=NEW.requested_staff_id::text;
  IF choice IS NULL OR choice->>'source'<>'scheduled' OR NOT EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=NEW.requested_staff_id AND sc.schedule_status='active' AND sc.availability_status='available' AND sc.start_at<=NEW.scheduled_start_at AND sc.end_at>=NEW.scheduled_end_at) THEN RAISE EXCEPTION 'requested_staff_schedule_required' USING ERRCODE='PT409';END IF;
  NEW.staff_id:=NEW.requested_staff_id;NEW.staff_confirmation_status:='confirmed';
 END IF;
 RETURN NEW;
END $function$

CREATE OR REPLACE FUNCTION pawpal_private.guard_requested_staff_shift()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE person uuid;from_at timestamptz;to_at timestamptz;
BEGIN
 person:=CASE WHEN TG_OP='DELETE' THEN OLD.staff_id ELSE NEW.staff_id END;
 IF TG_OP='INSERT' AND NEW.schedule_status='active' AND NEW.availability_status='available' THEN RETURN NEW;END IF;
 from_at:=CASE WHEN TG_OP='DELETE' THEN OLD.start_at ELSE least(NEW.start_at,OLD.start_at) END;
 to_at:=CASE WHEN TG_OP='DELETE' THEN OLD.end_at ELSE greatest(NEW.end_at,OLD.end_at) END;
 IF EXISTS(SELECT 1 FROM public.appointment a WHERE a.requested_staff_id IN(person,CASE WHEN TG_OP='UPDATE' THEN OLD.staff_id ELSE person END) AND a.appointment_status IN('pending','confirmed') AND a.scheduled_start_at<to_at AND a.scheduled_end_at>from_at
  AND (TG_OP='DELETE' OR NEW.schedule_status<>'active' OR NEW.availability_status<>'available' OR NEW.staff_id IS DISTINCT FROM OLD.staff_id OR NEW.start_at>a.scheduled_start_at OR NEW.end_at<a.scheduled_end_at)) THEN
  RAISE EXCEPTION 'staff_has_requested_booking' USING ERRCODE='PT409';END IF;
 IF TG_OP='DELETE' THEN RETURN OLD;END IF;RETURN NEW;
END $function$

CREATE OR REPLACE FUNCTION public.update_admin_service_booking(p_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_value text, p_reason text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.appointment; actor uuid; staff_key uuid; svc public.service;
BEGIN
 PERFORM pawpal_private.work_guard_rpc('update_admin_service_booking',jsonb_build_object('p_id',to_jsonb(p_id),'p_expected_updated_at',to_jsonb(p_expected_updated_at),'p_action',to_jsonb(p_action),'p_value',to_jsonb(p_value),'p_reason',to_jsonb(p_reason)));
 IF NOT pawpal_private.work_rpc_permission('update_admin_service_booking','appointment.write') OR NOT pawpal_private.work_rpc_permission('update_admin_service_booking','audit_log.write') OR NOT pawpal_private.work_rpc_permission('update_admin_service_booking','payment.read') OR NOT pawpal_private.work_rpc_permission('update_admin_service_booking','refund_transaction.read') THEN RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501'; END IF;
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
  IF p_value='cancelled' AND EXISTS(SELECT 1 FROM public.payment p WHERE p.appointment_id=p_id AND p.transaction_status='succeeded' AND p.amount>coalesce((SELECT sum(r.refunded_amount) FROM public.refund_transaction r WHERE r.payment_id=p.id AND r.refund_status='succeeded'),0)) THEN RAISE EXCEPTION 'paid_booking_requires_refund_workflow' USING ERRCODE='22023'; END IF;
  UPDATE public.appointment SET appointment_status=p_value,check_in_time=CASE WHEN p_value='checked_in' THEN now() ELSE check_in_time END WHERE id=p_id;
 ELSEIF p_action='assign' THEN
  IF a.appointment_status NOT IN ('pending','confirmed','checked_in','in_progress','da_check_in','da_tiep_nhan','dang_thuc_hien','accepted') OR coalesce(length(btrim(p_reason)),0)=0 THEN RAISE EXCEPTION 'invalid_staff_assignment' USING ERRCODE='22023'; END IF;
  SELECT s.* INTO svc FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id WHERE i.appointment_id=p_id AND i.is_primary;
  IF svc.staff_level_required_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff s JOIN public.staff_level actual ON actual.id=s.staff_level_id JOIN public.staff_level required ON required.id=svc.staff_level_required_id WHERE s.id=staff_key AND actual.rank_order>=required.rank_order) THEN RAISE EXCEPTION 'staff_level_required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment WHERE id<>p_id AND staff_id=staff_key AND appointment_status NOT IN ('cancelled','no_show','completed') AND scheduled_start_at<a.scheduled_end_at AND scheduled_end_at>a.scheduled_start_at) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
  IF a.requested_staff_id IS NOT NULL AND a.appointment_status IN('checked_in','in_progress','da_check_in','da_tiep_nhan','dang_thuc_hien','accepted') THEN
   UPDATE public.appointment SET staff_id=staff_key,requested_staff_id=staff_key,staff_confirmation_status='confirmed',
    proposal_staff_id=NULL,proposal_start_at=NULL,proposal_end_at=NULL,proposal_created_at=NULL WHERE id=p_id;
  ELSE
   UPDATE public.appointment SET staff_id=staff_key WHERE id=p_id;
  END IF;
 ELSE RAISE EXCEPTION 'invalid_booking_action' USING ERRCODE='22023'; END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'UPDATE_APPOINTMENT','appointment',p_id,jsonb_build_object('action',p_action,'value',p_value,'reason',btrim(p_reason),
         'previous_staff_id',a.staff_id,'previous_requested_staff_id',a.requested_staff_id)::text);
 RETURN p_id;
END $function$

CREATE OR REPLACE FUNCTION public.create_own_service_booking(p_id uuid, p_expected_quote text, p_details jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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

 PERFORM pg_advisory_xact_lock(820068);
 IF p_details ? 'hold_id' AND NOT EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold h
 WHERE h.customer_id=owner_id AND h.id=(p_details->>'hold_id')::uuid AND h.details-'note'=p_details-'hold_id'-'note' AND h.expires_at>clock_timestamp()) THEN
  RAISE EXCEPTION 'booking_hold_expired' USING ERRCODE='PT409';
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
 UPDATE public.appointment SET scheduled_end_at=(quote->>'end_at')::timestamptz,
   booking_contact_phone=coalesce(nullif(btrim(p_details->>'contact_phone'),''),nullif(public.customer_profile_snapshot()->>'phone','')) WHERE id=p_id;
 INSERT INTO public.audit_log(action,entity_name,entity_id,description) VALUES('CUSTOMER_BOOKING_CREATE','appointment',p_id,
  jsonb_build_object('details',p_details,'quote_version',p_expected_quote,'quote',quote)::text);
 IF p_details ? 'hold_id' AND quote->>'category'='grooming_spa' THEN
  PERFORM pawpal_private.finalize_requested_booking(p_id,(p_details->>'preferred_staff_id')::uuid);
  DELETE FROM pawpal_private.member_booking_hold WHERE customer_id=owner_id;
 END IF;

 RETURN p_id;
END $function$

CREATE OR REPLACE FUNCTION public.guest_booking_create(p_hash text, p_request uuid, p_expected_quote text, p_details jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.guest_session;q jsonb;a public.appointment;previous public.audit_log;addon jsonb;svc public.service;
 base_duration integer;item_total numeric;kind text;core jsonb;
BEGIN
 s:=pawpal_private.require_guest_booking_session(p_hash);
 IF p_request IS NULL OR p_expected_quote IS NULL OR p_expected_quote !~ '^[a-f0-9]{32}$' OR
  jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>12000 THEN
  RAISE EXCEPTION 'invalid_booking_details' USING ERRCODE='22023';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_details) k WHERE k NOT IN('hold_id','pet_id','service_id','scheduled_start_at','note','addon_ids','preferred_staff_id','check_out_at','room_id','diet_notes','care_notes','pickup_address','dropoff_address','distance_km','trip_type','return_at')) THEN
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

 PERFORM 1 FROM public.customer WHERE id=s.customer_id FOR UPDATE;
 PERFORM pg_advisory_xact_lock(820068);
 IF p_details ? 'hold_id' AND NOT EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold h WHERE h.customer_id=s.customer_id AND h.id=(p_details->>'hold_id')::uuid AND h.details-'note'=p_details-'hold_id'-'note' AND h.expires_at>clock_timestamp()) THEN
  RAISE EXCEPTION 'booking_hold_expired' USING ERRCODE='PT409';
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
 IF p_details ? 'hold_id' AND kind='grooming_spa' THEN
  PERFORM pawpal_private.finalize_requested_booking(p_request,(p_details->>'preferred_staff_id')::uuid);
  DELETE FROM pawpal_private.member_booking_hold WHERE customer_id=s.customer_id;
 END IF;

 RETURN p_request;
END $function$

DROP FUNCTION IF EXISTS public.admin_service_booking_staff_choices(uuid);
GRANT EXECUTE ON FUNCTION public.propose_booking_staff(uuid,timestamptz,uuid,timestamptz,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_booking_staff_with_schedule(uuid,timestamptz,uuid,timestamptz,timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
