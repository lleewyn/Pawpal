BEGIN;
CREATE OR REPLACE FUNCTION public.handover_admin_staff_work(p_request_id uuid,p_staff_id uuid,p_expected_updated_at timestamptz,p_reason text,p_handover jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; old public.staff; prior public.audit_log; payload text; item jsonb; a public.appointment; target public.staff; seen uuid[]:='{}'; key uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.write') OR NOT pawpal_private.has_permission('appointment.write')
 OR NOT pawpal_private.has_permission('appointment_item.write') OR NOT pawpal_private.has_permission('taxi_trip.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'staff_handover_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_staff_id IS NULL OR jsonb_typeof(p_handover) IS DISTINCT FROM 'array' OR jsonb_array_length(p_handover)>200
 OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 2 AND 2000 OR length(p_handover::text)>100000 THEN RAISE EXCEPTION 'invalid_staff_handover' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('staff_id',p_staff_id,'reason',p_reason,'handover',p_handover)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,32));
 SELECT * INTO prior FROM public.audit_log WHERE action='STAFF_WORK_HANDOVER' AND entity_id=p_request_id;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_staff_id;
 END IF;
 PERFORM 1 FROM public.staff WHERE id=p_staff_id OR id IN (SELECT (value->>'replacement_staff_id')::uuid FROM jsonb_array_elements(p_handover)) ORDER BY id FOR UPDATE;
 SELECT * INTO old FROM public.staff WHERE id=p_staff_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected_updated_at IS NULL OR old.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'staff_profile_changed' USING ERRCODE='PT409'; END IF;
 PERFORM 1 FROM public.appointment WHERE id IN (SELECT (value->>'appointment_id')::uuid FROM jsonb_array_elements(p_handover)) ORDER BY id FOR UPDATE;
 FOR item IN SELECT value FROM jsonb_array_elements(p_handover) ORDER BY value->>'appointment_id' LOOP
  key:=(item->>'appointment_id')::uuid;
  IF key IS NULL OR key=ANY(seen) THEN RAISE EXCEPTION 'invalid_staff_handover' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,key);
  SELECT * INTO a FROM public.appointment WHERE id=key;
  IF NOT FOUND OR a.appointment_status IN ('completed','cancelled','no_show') THEN RAISE EXCEPTION 'staff_work_changed' USING ERRCODE='PT409'; END IF;
  IF nullif(item->>'expected_updated_at','')::timestamptz IS DISTINCT FROM a.updated_at THEN RAISE EXCEPTION 'staff_work_changed' USING ERRCODE='PT409'; END IF;
  IF a.staff_id IS DISTINCT FROM old.id AND NOT EXISTS(SELECT 1 FROM public.appointment_item WHERE appointment_id=a.id AND staff_id=old.id AND status NOT IN ('completed','cancelled'))
   AND NOT EXISTS(SELECT 1 FROM public.taxi_trip WHERE appointment_id=a.id AND driver_staff_id=old.id AND status NOT IN ('completed','cancelled')) THEN RAISE EXCEPTION 'staff_work_changed' USING ERRCODE='PT409'; END IF;
  SELECT * INTO target FROM public.staff WHERE id=(item->>'replacement_staff_id')::uuid;
  IF NOT FOUND OR target.id=old.id OR lower(target.employment_status)<>'active' OR target.service_locked THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id
    JOIN public.staff_level required ON required.id=s.staff_level_required_id
    WHERE i.appointment_id=a.id AND i.status NOT IN ('completed','cancelled') AND (i.staff_id=old.id OR (a.staff_id=old.id AND i.is_primary))
    AND NOT EXISTS(SELECT 1 FROM public.staff_level actual WHERE actual.id=target.staff_level_id AND actual.rank_order>=required.rank_order)) THEN RAISE EXCEPTION 'staff_level_required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment other WHERE other.id<>a.id AND other.appointment_status NOT IN ('completed','cancelled','no_show')
   AND other.scheduled_start_at<a.scheduled_end_at AND other.scheduled_end_at>a.scheduled_start_at
   AND (other.staff_id=target.id OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=other.id AND i.staff_id=target.id AND i.status NOT IN ('completed','cancelled'))
    OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=other.id AND t.driver_staff_id=target.id AND t.status NOT IN ('completed','cancelled')))) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
  IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=target.id AND schedule_status='active' AND availability_status<>'available' AND start_at<a.scheduled_end_at AND end_at>a.scheduled_start_at) THEN RAISE EXCEPTION 'staff_not_available' USING ERRCODE='PT409'; END IF;
  UPDATE public.appointment SET staff_id=CASE WHEN staff_id=old.id THEN target.id ELSE staff_id END,updated_at=clock_timestamp() WHERE id=a.id;
  UPDATE public.appointment_item SET staff_id=target.id,updated_at=clock_timestamp() WHERE appointment_id=a.id AND staff_id=old.id AND status NOT IN ('completed','cancelled');
  UPDATE public.taxi_trip SET driver_staff_id=target.id,updated_at=clock_timestamp() WHERE appointment_id=a.id AND driver_staff_id=old.id AND status NOT IN ('completed','cancelled');
 END LOOP;
 IF EXISTS(SELECT 1 FROM public.appointment remaining WHERE remaining.appointment_status NOT IN ('completed','cancelled','no_show') AND
  (remaining.staff_id=old.id OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=remaining.id AND i.staff_id=old.id AND i.status NOT IN ('completed','cancelled'))
   OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=remaining.id AND t.driver_staff_id=old.id AND t.status NOT IN ('completed','cancelled')))) THEN RAISE EXCEPTION 'staff_handover_incomplete' USING ERRCODE='PT409'; END IF;
 UPDATE public.staff SET service_locked=true,updated_at=clock_timestamp() WHERE id=old.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'STAFF_WORK_HANDOVER','staff',p_request_id,payload);
 RETURN old.id;
END $$;
REVOKE ALL ON FUNCTION public.handover_admin_staff_work(uuid,uuid,timestamptz,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.handover_admin_staff_work(uuid,uuid,timestamptz,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
