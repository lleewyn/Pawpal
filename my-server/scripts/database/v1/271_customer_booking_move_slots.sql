BEGIN;
SET LOCAL lock_timeout='5s';
CREATE OR REPLACE FUNCTION pawpal_private.assert_booking_move_allowed(p_id uuid)
RETURNS public.appointment LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment;owner_id uuid;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id);
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'customer_session_required' USING ERRCODE='42501';END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_id AND customer_id=owner_id FOR UPDATE;
 IF a.id IS NULL THEN RAISE EXCEPTION 'booking_owner_required' USING ERRCODE='42501';END IF;
 IF NOT (a.appointment_status IN('confirmed','da_xac_nhan') OR (a.appointment_status IN('pending','cho_xac_nhan') AND a.change_count>0)) THEN RAISE EXCEPTION 'booking_move_status_not_allowed' USING ERRCODE='22023';END IF;
 IF a.change_count>=2 THEN RAISE EXCEPTION 'booking_move_limit_reached' USING ERRCODE='22023';END IF;
 IF a.scheduled_start_at<clock_timestamp()+interval '2 hours' THEN RAISE EXCEPTION 'booking_move_original_too_close' USING ERRCODE='22023';END IF;
 RETURN a;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.assert_booking_move_allowed(uuid) FROM PUBLIC,anon,authenticated;

DO $quote_patch$
DECLARE source text;left_at integer;right_at integer;marker text;
BEGIN
 source:=pg_get_functiondef('pawpal_private.booking_move_service_quote(uuid,timestamptz,timestamptz,uuid)'::regprocedure);
 source:=replace(source,E'\r\n',E'\n');
 IF position('move_scheduled_staff' IN source)=0 THEN
  source:=replace(source,'result jsonb;','result jsonb; selected_worker uuid; choices jsonb; move_details jsonb;');
  left_at:=position(' IF p_start IS NULL' IN source);right_at:=position(' IF EXISTS(SELECT 1 FROM public.payment' IN source);
  IF left_at=0 OR right_at<=left_at THEN RAISE EXCEPTION 'Unexpected move eligibility definition';END IF;
  source:=substring(source FROM 1 FOR left_at-1)||$new$
 PERFORM pawpal_private.assert_booking_move_allowed(p_id);
 IF p_start IS NULL OR NOT isfinite(p_start) OR p_start<clock_timestamp()+interval '2 hours' THEN RAISE EXCEPTION 'booking_move_new_time_too_close' USING ERRCODE='22023';END IF;
 IF p_start=a.scheduled_start_at AND (p_service IS NULL OR p_service=(SELECT service_id FROM public.appointment_item WHERE appointment_id=a.id AND is_primary)) THEN RAISE EXCEPTION 'booking_move_unchanged' USING ERRCODE='22023';END IF;
$new$||substring(source FROM right_at);
  marker:=' FOR staff_key IN SELECT a.staff_id';left_at:=position(marker IN source);
  IF left_at=0 THEN RAISE EXCEPTION 'Unexpected move staff validation';END IF;
  source:=substring(source FROM 1 FOR left_at-1)||$new$
 -- move_scheduled_staff: retain the booked worker; never advertise an unrostered hour.
 IF primary_kind='grooming_spa' THEN
  IF EXISTS(SELECT 1 FROM public.appointment_item WHERE appointment_id=a.id AND NOT is_primary AND service_id IS NOT NULL AND status<>'cancelled') THEN RAISE EXCEPTION 'booking_items_require_staff' USING ERRCODE='22023';END IF;
  move_details:=pawpal_private.booking_request_details(p_id,p_start);
  IF p_service IS NOT NULL THEN move_details:=move_details||jsonb_build_object('service_id',p_service);END IF;
  choices:=pawpal_private.booking_staff_choices(a.customer_id,move_details,a.id);
  selected_worker:=coalesce(a.staff_id,a.requested_staff_id);
  IF selected_worker IS NULL THEN SELECT (v->>'id')::uuid INTO selected_worker FROM jsonb_array_elements(choices) v ORDER BY v->>'name',v->>'id' LIMIT 1;END IF;
  IF selected_worker IS NULL OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(choices) v WHERE v->>'id'=selected_worker::text) THEN RAISE EXCEPTION 'no_scheduled_staff' USING ERRCODE='PT409';END IF;
  ends:=p_start+make_interval(mins=>(pawpal_private.catalog_duration((move_details->>'service_id')::uuid,weight_value,p_start)+coalesce((SELECT sum(estimated_duration) FROM public.service_addon WHERE id IN(SELECT value::uuid FROM jsonb_array_elements_text(move_details->'addon_ids')) AND status='active'),0))::integer);
 END IF;
$new$||substring(source FROM left_at);
  source:=replace(source,$old$IF line.status NOT IN ('pending','confirmed')$old$,$new$IF line.status NOT IN ('pending','confirmed','cho_xac_nhan','da_xac_nhan')$new$);
  source:=replace(source,'result:=jsonb_build_object(''id'',a.id,','result:=jsonb_build_object(''staff_id'',selected_worker,''staff_name'',(SELECT full_name FROM public.staff WHERE id=selected_worker),''id'',a.id,');
  EXECUTE source;
 END IF;
 source:=pg_get_functiondef('public.reschedule_own_booking_service(uuid,uuid,timestamptz,text,text,timestamptz,uuid)'::regprocedure);
 source:=replace(source,E'\r\n',E'\n');
 IF position('move_scheduled_staff' IN source)=0 THEN
  source:=regexp_replace(source,E'\nBEGIN\n',E'\nBEGIN\n -- move_scheduled_staff\n PERFORM pg_advisory_xact_lock(820068);\n');
  IF position($marker$staff_id=coalesce((quote->>'staff_id')::uuid,staff_id),status='pending'$marker$ IN source)=0 THEN
   source:=replace(source,$old$status='pending' WHERE id=(entry->>'id')::uuid;$old$,$new$staff_id=coalesce((quote->>'staff_id')::uuid,staff_id),status='pending' WHERE id=(entry->>'id')::uuid;$new$);
  END IF;
  source:=replace(source,$old$appointment_status='pending',change_count=change_count+1$old$,$new$appointment_status='pending',staff_id=coalesce((quote->>'staff_id')::uuid,staff_id),change_count=change_count+1$new$);
  EXECUTE source;
 END IF;
END $quote_patch$;

DO $hours_patch$
DECLARE source text;marker text;
BEGIN
 source:=pg_get_functiondef('pawpal_private.booking_move_service_quote(uuid,timestamptz,timestamptz,uuid)'::regprocedure);
 IF position('move_operating_hours' IN source)=0 THEN
  source:=replace(source,'move_details jsonb;','move_details jsonb; move_cfg jsonb; move_hours jsonb;');
  marker:=' FOR staff_key IN SELECT a.staff_id';
  IF position(marker IN source)=0 THEN RAISE EXCEPTION 'Unexpected move hours definition';END IF;
  source:=replace(source,marker,$new$
 -- move_operating_hours: recheck store hours when committing a displayed slot.
 IF primary_kind='grooming_spa' THEN
  SELECT setting_value::jsonb INTO move_cfg FROM public.pawpal_setting WHERE setting_key='system_config';
  move_hours:=move_cfg->'operatingHours'->CASE WHEN extract(isodow FROM p_start AT TIME ZONE 'Asia/Bangkok') IN(6,7) THEN 'weekend' ELSE 'weekday' END;
  IF move_hours->>'open' IS NULL OR move_hours->>'close' IS NULL THEN RAISE EXCEPTION 'booking_hours_unconfigured' USING ERRCODE='22023';END IF;
  IF (p_start AT TIME ZONE 'Asia/Bangkok')::date<>(ends AT TIME ZONE 'Asia/Bangkok')::date OR (p_start AT TIME ZONE 'Asia/Bangkok')::time<(move_hours->>'open')::time OR (ends AT TIME ZONE 'Asia/Bangkok')::time>(move_hours->>'close')::time THEN RAISE EXCEPTION 'outside_operating_hours' USING ERRCODE='PT409';END IF;
 END IF;
$new$||marker);
  source:=replace(source,$old$other.appointment_status NOT IN ('completed','cancelled','no_show')$old$,$new$other.appointment_status NOT IN ('completed','cancelled','no_show','expired','da_hoan_tat','da_huy','vang_mat')$new$);
  EXECUTE source;
 END IF;
END $hours_patch$;

DO $move_consent$
DECLARE source text;left_at integer;right_at integer;audit_statement text;marker text;
BEGIN
 source:=pg_get_functiondef('pawpal_private.booking_move_service_quote(uuid,timestamptz,timestamptz,uuid)'::regprocedure);
 IF position('move_available_worker' IN source)=0 THEN
  source:=replace(source,$old$selected_worker:=coalesce(a.staff_id,a.requested_staff_id);$old$,$new$-- move_available_worker: prefer the original worker, otherwise quote an available replacement.
  selected_worker:=coalesce(a.staff_id,a.requested_staff_id);
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(choices) v WHERE v->>'id'=selected_worker::text) THEN selected_worker:=NULL;END IF;$new$);
  left_at:=position(' FOR staff_key IN SELECT a.staff_id' IN source);right_at:=left_at+position(E' LOOP\n' IN substring(source FROM left_at))-1;
  IF left_at=0 OR right_at<left_at THEN RAISE EXCEPTION 'Unexpected move worker loop';END IF;
  source:=substring(source FROM 1 FOR left_at-1)||$new$ FOR staff_key IN
   SELECT selected_worker WHERE primary_kind='grooming_spa' AND selected_worker IS NOT NULL
   UNION SELECT a.staff_id WHERE primary_kind<>'grooming_spa' AND a.staff_id IS NOT NULL
   UNION SELECT staff_id FROM public.appointment_item WHERE primary_kind<>'grooming_spa' AND appointment_id=a.id AND status<>'cancelled' AND staff_id IS NOT NULL ORDER BY 1$new$||substring(source FROM right_at);
  source:=replace(source,'st.id IN (a.staff_id,line.staff_id)','st.id IN (CASE WHEN primary_kind=''grooming_spa'' THEN selected_worker ELSE a.staff_id END,CASE WHEN primary_kind=''grooming_spa'' THEN selected_worker ELSE line.staff_id END)');
  source:=replace(source,$old$result:=jsonb_build_object('staff_id',selected_worker,$old$,$new$result:=jsonb_build_object('previous_staff_id',a.staff_id,'previous_requested_staff_id',a.requested_staff_id,'staff_id',selected_worker,$new$);
  EXECUTE source;
 END IF;
 source:=pg_get_functiondef('public.reschedule_own_booking_service(uuid,uuid,timestamptz,text,text,timestamptz,uuid)'::regprocedure);
 source:=replace(source,E'\r\n',E'\n');
 IF position('move_quote_consent' IN source)=0 THEN
  left_at:=position(' INSERT INTO public.audit_log(action,entity_name,entity_id,description)' IN source);right_at:=position(' RETURN p_id;' IN source);
  IF left_at=0 OR right_at<=left_at THEN RAISE EXCEPTION 'Unexpected move audit definition';END IF;
  audit_statement:=substring(source FROM left_at FOR right_at-left_at);
  source:=substring(source FROM 1 FOR left_at-1)||substring(source FROM right_at);
  audit_statement:=replace(audit_statement,$old$'quote',quote)$old$,$new$'quote',quote,'transaction_id',txid_current()::text)$new$);
  marker:=' UPDATE public.appointment SET scheduled_start_at=p_start';
  IF position(marker IN source)=0 THEN RAISE EXCEPTION 'Unexpected move commit definition';END IF;
  source:=replace(source,marker,E' -- move_quote_consent: protected audit authorizes only this exact transaction.\n'||audit_statement||marker);
  source:=replace(source,$old$appointment_status='pending',staff_id=coalesce((quote->>'staff_id')::uuid,staff_id),$old$,$new$appointment_status='pending',staff_id=coalesce((quote->>'staff_id')::uuid,staff_id),requested_staff_id=CASE WHEN quote->>'staff_id' IS NOT NULL THEN NULL ELSE requested_staff_id END,staff_confirmation_status=CASE WHEN quote->>'staff_id' IS NOT NULL THEN 'not_required' ELSE staff_confirmation_status END,$new$);
  EXECUTE source;
 END IF;
 source:=pg_get_functiondef('pawpal_private.guard_requested_booking()'::regprocedure);
 source:=replace(source,E'\r\n',E'\n');
 IF position('move_quote_consent' IN source)=0 THEN
  marker:=' admin_reassign:=';
  IF position(marker IN source)=0 THEN RAISE EXCEPTION 'Unexpected requested booking guard';END IF;
  source:=replace(source,marker,$new$
 -- move_quote_consent: customers cannot insert audit_log records; a quote is
 -- authorized only inside the reschedule RPC that validated and recorded it.
 consented:=consented OR (pawpal_private.owns_customer(OLD.customer_id)
  AND NEW.appointment_status='pending' AND NEW.change_count=OLD.change_count+1 AND OLD.change_count<2
  AND NEW.requested_staff_id IS NULL AND NEW.staff_id IS NOT NULL
  AND EXISTS(SELECT 1 FROM public.audit_log log WHERE log.action='CUSTOMER_RESCHEDULE_APPOINTMENT' AND log.entity_id=OLD.id
   AND log.description::jsonb->>'transaction_id'=txid_current()::text
   AND (log.description::jsonb->'quote'->>'updated_at')::timestamptz=OLD.updated_at
   AND (log.description::jsonb->'quote'->>'staff_id')::uuid=NEW.staff_id
   AND (log.description::jsonb->'quote'->>'start_at')::timestamptz=NEW.scheduled_start_at
   AND (log.description::jsonb->'quote'->>'end_at')::timestamptz=NEW.scheduled_end_at));
$new$||marker);
  EXECUTE source;
 END IF;
 source:=pg_get_functiondef('pawpal_private.audit_actor()'::regprocedure);
 source:=replace(source,E'\r\n',E'\n');
 IF position('move_quote_consent' IN source)=0 THEN
  source:=regexp_replace(source,E'\nBEGIN\n',E'\nBEGIN\n'||$new$
 -- move_quote_consent: allow the reschedule RPC to record its validated quote
 -- before the booking trigger applies it. Customer INSERT remains denied by RLS.
 IF auth.role()='authenticated' AND NEW.entity_name='appointment' AND NEW.action='CUSTOMER_RESCHEDULE_APPOINTMENT'
 AND NEW.description::jsonb->>'transaction_id'=txid_current()::text
 AND EXISTS(SELECT 1 FROM public.appointment a WHERE a.id=NEW.entity_id AND pawpal_private.owns_customer(a.customer_id)
  AND a.appointment_status IN('confirmed','da_xac_nhan','pending','cho_xac_nhan') AND a.change_count<2
  AND (NEW.description::jsonb->'quote'->>'id')::uuid=a.id
  AND (NEW.description::jsonb->'quote'->>'updated_at')::timestamptz=a.updated_at
  AND (NEW.description::jsonb->'quote'->>'change_count')::integer=a.change_count
  AND NEW.description::jsonb->'quote'->>'staff_id' IS NOT NULL) THEN RETURN NEW;END IF;
$new$);
  EXECUTE source;
 END IF;
END $move_consent$;

CREATE OR REPLACE FUNCTION public.own_booking_move_services(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment;current_service uuid;kind text;species uuid;services jsonb;
BEGIN
 a:=pawpal_private.assert_booking_move_allowed(p_id);
 SELECT i.service_id,c.category_code INTO current_service,kind FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id JOIN public.service_category c ON c.id=s.category_id WHERE i.appointment_id=a.id AND i.is_primary;
 IF kind<>'grooming_spa' THEN RAISE EXCEPTION 'service_change_not_supported' USING ERRCODE='22023';END IF;
 SELECT b.species_id INTO species FROM public.pet_profile p JOIN public.pet_breed b ON b.id=p.breed_id WHERE p.id=a.pet_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.service_name) ORDER BY s.service_name),'[]') INTO services
 FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE s.status='active' AND c.category_code=kind
 AND EXISTS(SELECT 1 FROM public.service_supported_species ss WHERE ss.service_id=s.id AND ss.species_id=species);
 RETURN jsonb_build_object('current_service_id',current_service,'services',services);
END $$;

CREATE OR REPLACE FUNCTION public.own_booking_move_day_slots(p_id uuid,p_day date,p_service uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment;cfg jsonb;hours jsonb;opens timestamptz;closes timestamptz;candidate timestamptz;q jsonb;slots jsonb:='[]';previous_total numeric;
BEGIN
 PERFORM pg_advisory_xact_lock(820068);
 a:=pawpal_private.assert_booking_move_allowed(p_id);
 IF p_day IS NULL OR p_day<(now() AT TIME ZONE 'Asia/Bangkok')::date OR p_day>(now() AT TIME ZONE 'Asia/Bangkok')::date+90 THEN RAISE EXCEPTION 'invalid_slot_day' USING ERRCODE='22023';END IF;
 IF EXISTS(SELECT 1 FROM public.payment WHERE appointment_id=a.id AND transaction_status IN('pending','succeeded')) OR EXISTS(SELECT 1 FROM public.voucher_redemption WHERE appointment_id=a.id AND status='applied') OR EXISTS(SELECT 1 FROM public.appointment_adjustment WHERE appointment_id=a.id AND approval_status<>'rejected') THEN RAISE EXCEPTION 'booking_requires_staff_reconciliation' USING ERRCODE='22023';END IF;
 SELECT setting_value::jsonb INTO cfg FROM public.pawpal_setting WHERE setting_key='system_config';
 hours:=cfg->'operatingHours'->CASE WHEN extract(isodow FROM p_day) IN(6,7) THEN 'weekend' ELSE 'weekday' END;
 IF hours->>'open' IS NULL OR hours->>'close' IS NULL THEN RAISE EXCEPTION 'booking_hours_unconfigured' USING ERRCODE='22023';END IF;
 opens:=(p_day+(hours->>'open')::time) AT TIME ZONE 'Asia/Bangkok';closes:=(p_day+(hours->>'close')::time) AT TIME ZONE 'Asia/Bangkok';
 SELECT sum(quantity*unit_price-discount_amount) INTO previous_total FROM public.appointment_item WHERE appointment_id=a.id AND status<>'cancelled';
 FOR candidate IN SELECT generate_series(opens,closes-interval '1 minute',interval '30 minutes') LIMIT 48 LOOP
  IF candidate<clock_timestamp()+interval '2 hours' THEN CONTINUE;END IF;
  BEGIN
   q:=pawpal_private.booking_move_service_quote(p_id,candidate,NULL,p_service);
   IF (q->>'end_at')::timestamptz>closes THEN CONTINUE;END IF;
   slots:=slots||jsonb_build_array(q);
  EXCEPTION WHEN SQLSTATE 'PT409' OR SQLSTATE '22023' THEN
   IF SQLERRM NOT IN('no_scheduled_staff','staff_schedule_conflict','staff_not_available','hotel_room_conflict','outside_operating_hours','booking_move_new_time_too_close','booking_move_unchanged') THEN RAISE;END IF;
  END;
 END LOOP;
 RETURN jsonb_build_object('open',hours->>'open','close',hours->>'close','previous_total',previous_total,'slots',slots);
END $$;
REVOKE ALL ON FUNCTION public.own_booking_move_services(uuid),public.own_booking_move_day_slots(uuid,date,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_booking_move_services(uuid),public.own_booking_move_day_slots(uuid,date,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
