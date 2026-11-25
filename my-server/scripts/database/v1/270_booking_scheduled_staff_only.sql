BEGIN;
SET LOCAL lock_timeout='5s';
CREATE OR REPLACE FUNCTION pawpal_private.booking_staff_choices(p_owner uuid,p_details jsonb,p_exclude uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
#variable_conflict use_variable
DECLARE svc public.service;starts timestamptz:=(p_details->>'scheduled_start_at')::timestamptz;ends timestamptz;weight numeric;result jsonb;
BEGIN
 SELECT * INTO svc FROM public.service WHERE id=(p_details->>'service_id')::uuid AND status='active';
 IF svc.id IS NULL THEN RETURN '[]';END IF;
 SELECT w.weight INTO weight FROM public.pet_current_weight w JOIN public.pet_profile p ON p.id=w.pet_id WHERE p.id=(p_details->>'pet_id')::uuid AND p.customer_id=p_owner AND p.status='active';
 ends:=starts+make_interval(mins=>(pawpal_private.catalog_duration(svc.id,weight,starts)+coalesce((SELECT sum(estimated_duration) FROM public.service_addon WHERE id IN(SELECT value::uuid FROM jsonb_array_elements_text(coalesce(p_details->'addon_ids','[]'))) AND service_id=svc.id AND status='active'),0))::integer);
 IF starts IS NULL OR ends IS NULL OR (starts AT TIME ZONE 'Asia/Bangkok')::date<>(ends AT TIME ZONE 'Asia/Bangkok')::date THEN RETURN '[]';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.full_name,'source','scheduled','requires_confirmation',false) ORDER BY s.full_name),'[]') INTO result
 FROM public.staff s WHERE s.employment_status='active' AND NOT s.service_locked AND s.staff_level_id IS NOT NULL AND pawpal_private.staff_skill_allows_assignment(s.id)
 AND (svc.staff_level_required_id IS NULL OR EXISTS(SELECT 1 FROM public.staff_level actual JOIN public.staff_level required ON required.id=svc.staff_level_required_id WHERE actual.id=s.staff_level_id AND actual.rank_order>=required.rank_order))
 AND EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status='available' AND sc.start_at<=starts AND sc.end_at>=ends)
 AND NOT EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.schedule_status='active' AND sc.availability_status<>'available' AND sc.start_at<ends AND sc.end_at>starts)
 AND NOT EXISTS(SELECT 1 FROM public.appointment a WHERE a.id IS DISTINCT FROM p_exclude AND a.appointment_status NOT IN('completed','cancelled','no_show','expired','da_huy','da_hoan_tat','vang_mat') AND a.scheduled_start_at<ends AND a.scheduled_end_at>starts
  AND (a.staff_id=s.id OR a.requested_staff_id=s.id OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=s.id AND i.status<>'cancelled')))
 AND NOT EXISTS(SELECT 1 FROM pawpal_private.member_booking_hold h WHERE h.staff_id=s.id AND h.customer_id<>p_owner AND h.expires_at>clock_timestamp() AND h.starts<ends AND h.ends>starts);
 RETURN result;
END $$;

DO $creation$
DECLARE source text;signature text;marker text;quote_name text;
BEGIN
 FOREACH signature IN ARRAY ARRAY['public.create_own_service_booking(uuid,text,jsonb)','public.guest_booking_create(text,uuid,text,jsonb)'] LOOP
  source:=pg_get_functiondef(signature::regprocedure);
  IF signature LIKE '%create_own%' THEN marker:='quote:=pawpal_private.customer_new_booking_quote(p_details);';quote_name:='quote';
  ELSE marker:='q:=pawpal_private.guest_booking_quote_core(s.customer_id,p_details);';quote_name:='q';END IF;
  IF position('scheduled_staff_hold_required' IN source)=0 THEN
   IF position(marker IN source)=0 THEN RAISE EXCEPTION 'Unexpected booking creation definition';END IF;
   source:=replace(source,marker,marker||E'\n -- scheduled_staff_hold_required\n IF '||quote_name||$check$->>'category'='grooming_spa' THEN
  IF nullif(p_details->>'preferred_staff_id','') IS NULL THEN RAISE EXCEPTION 'booking_staff_required' USING ERRCODE='PT409';END IF;
  IF nullif(p_details->>'hold_id','') IS NULL THEN RAISE EXCEPTION 'booking_hold_required' USING ERRCODE='PT409';END IF;
 END IF;$check$);
   EXECUTE source;
  END IF;
 END LOOP;
END $creation$;

CREATE OR REPLACE FUNCTION pawpal_private.finalize_requested_booking(p_id uuid,p_staff uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment;
BEGIN
 SELECT * INTO a FROM public.appointment WHERE id=p_id;
 IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(pawpal_private.booking_staff_choices(a.customer_id,pawpal_private.booking_request_details(p_id),p_id)) v WHERE v->>'id'=p_staff::text) THEN RAISE EXCEPTION 'preferred_staff_unavailable' USING ERRCODE='PT409';END IF;
 UPDATE public.appointment SET requested_staff_id=NULL,staff_id=p_staff,staff_confirmation_status='not_required',appointment_status='confirmed' WHERE id=p_id;
 UPDATE public.appointment_item SET staff_id=p_staff WHERE appointment_id=p_id AND status<>'cancelled';
END $$;

-- Legacy pending preferences remain intact until an operator assigns an available
-- worker. The same reassignment boundary now handles them without a proposal loop.
DO $migration$
DECLARE source text;old_statuses text:=$old$IN('checked_in','in_progress','da_check_in','da_tiep_nhan','dang_thuc_hien','accepted')$old$;
 new_statuses text:=$new$IN('pending','confirmed','checked_in','in_progress','da_check_in','da_tiep_nhan','dang_thuc_hien','accepted')$new$;
BEGIN
 source:=pg_get_functiondef('pawpal_private.guard_requested_booking()'::regprocedure);
 IF position('admin_reassign boolean' IN source)=0 THEN RAISE EXCEPTION 'Unexpected requested booking guard';END IF;
 source:=replace(source,'OLD.appointment_status '||old_statuses,'OLD.appointment_status '||new_statuses);EXECUTE source;
 source:=pg_get_functiondef('public.update_admin_service_booking(uuid,timestamptz,text,text,text)'::regprocedure);
 IF position('pg_advisory_xact_lock(820068)' IN source)=0 THEN
  source:=regexp_replace(source,E'\nBEGIN\n',E'\nBEGIN\n PERFORM pg_advisory_xact_lock(820068);\n');
 END IF;
 source:=replace(source,'a.appointment_status '||old_statuses,'a.appointment_status '||new_statuses);
 IF position('scheduled_only_assignment' IN source)=0 THEN
  IF position($marker$ELSEIF p_action='assign' THEN$marker$ IN source)=0 THEN RAISE EXCEPTION 'Unexpected assignment definition';END IF;
  source:=replace(source,$marker$ELSEIF p_action='assign' THEN$marker$,$new$ELSEIF p_action='assign' THEN
  -- scheduled_only_assignment: no pending requests for unrostered staff.
  IF a.appointment_status IN('pending','confirmed') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(pawpal_private.booking_staff_choices(a.customer_id,pawpal_private.booking_request_details(a.id),a.id)) v WHERE v->>'id'=staff_key::text) THEN RAISE EXCEPTION 'staff_not_available' USING ERRCODE='PT409';END IF;$new$);
 END IF;
 EXECUTE source;
 source:=pg_get_functiondef('pawpal_private.guard_requested_staff_shift()'::regprocedure);
 source:=replace(source,'a.requested_staff_id IN(person,','coalesce(a.staff_id,a.requested_staff_id) IN(person,');EXECUTE source;
END $migration$;

CREATE OR REPLACE FUNCTION public.admin_service_booking_staff_choices(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment;result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('appointment.read') OR NOT pawpal_private.has_permission('appointment.write') THEN RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501';END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_id;
 IF a.id IS NULL THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002';END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',v->>'id','full_name',v->>'name','employment_status','active','service_locked',false)),'[]') INTO result
 FROM jsonb_array_elements(pawpal_private.booking_staff_choices(a.customer_id,pawpal_private.booking_request_details(a.id),a.id)) v;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_service_booking_staff_choices(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_service_booking_staff_choices(uuid) TO authenticated;
-- Retain historical proposal data; retire the write entry point.
REVOKE EXECUTE ON FUNCTION public.propose_booking_staff(uuid,timestamptz,uuid,timestamptz,text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_booking_staff_with_schedule(uuid,timestamptz,uuid,timestamptz,timestamptz) FROM authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
