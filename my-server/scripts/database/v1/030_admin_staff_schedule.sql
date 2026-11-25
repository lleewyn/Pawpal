BEGIN;
CREATE OR REPLACE FUNCTION public.save_admin_staff_schedule(p_request_id uuid,p_schedule_id uuid,p_expected_updated_at timestamptz,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; prior public.audit_log; old public.staff_schedule; target uuid; starts timestamptz; ends timestamptz;
 availability text; status_value text; reason_value text; payload text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff_schedule.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN
  RAISE EXCEPTION 'staff_schedule_forbidden' USING ERRCODE='42501';
 END IF;
 IF p_request_id IS NULL OR p_schedule_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>6000 THEN
  RAISE EXCEPTION 'invalid_staff_schedule' USING ERRCODE='22023';
 END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('schedule_id',p_schedule_id,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,30));
 SELECT * INTO prior FROM public.audit_log WHERE action='STAFF_SCHEDULE_SAVE' AND entity_id=p_request_id;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_schedule_id;
 END IF;
 target:=(p_details->>'staff_id')::uuid; starts:=(p_details->>'start_at')::timestamptz; ends:=(p_details->>'end_at')::timestamptz;
 availability:=p_details->>'availability_status'; status_value:=p_details->>'schedule_status'; reason_value:=nullif(btrim(p_details->>'reason'),'');
 IF target IS NULL OR starts IS NULL OR ends IS NULL OR NOT isfinite(starts) OR NOT isfinite(ends) OR ends<=starts
 OR availability IS NULL OR availability NOT IN ('available','leave','absent','unavailable')
 OR status_value IS NULL OR status_value NOT IN ('active','cancelled') OR coalesce(length(reason_value),0)>4000
 OR ((availability<>'available' OR status_value='cancelled') AND coalesce(length(reason_value),0)<2) THEN
  RAISE EXCEPTION 'invalid_staff_schedule' USING ERRCODE='22023';
 END IF;
 -- Same staff lock used by service assignment, so absence cannot race a booking.
 PERFORM 1 FROM public.staff WHERE id IN (target,(SELECT staff_id FROM public.staff_schedule WHERE id=p_schedule_id)) ORDER BY id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.staff WHERE id=target) THEN RAISE EXCEPTION 'staff_not_found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO old FROM public.staff_schedule WHERE id=p_schedule_id FOR UPDATE;
 IF FOUND THEN
  IF p_expected_updated_at IS NULL OR old.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'staff_schedule_changed' USING ERRCODE='PT409'; END IF;
 ELSE
  IF p_expected_updated_at IS NOT NULL OR status_value='cancelled' THEN RAISE EXCEPTION 'staff_schedule_not_found' USING ERRCODE='P0002'; END IF;
 END IF;
 IF status_value='active' AND availability<>'available' AND EXISTS(
  SELECT 1 FROM public.appointment a WHERE a.appointment_status NOT IN ('completed','cancelled','no_show')
  AND a.scheduled_start_at<ends AND a.scheduled_end_at>starts
  AND (a.staff_id=target OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=target)
   OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=target AND t.status NOT IN ('completed','cancelled')))
 ) THEN RAISE EXCEPTION 'staff_has_service_booking' USING ERRCODE='PT409'; END IF;
 INSERT INTO public.staff_schedule(id,staff_id,start_at,end_at,availability_status,schedule_status,reason)
 VALUES(p_schedule_id,target,starts,ends,availability,status_value,reason_value)
 ON CONFLICT(id) DO UPDATE SET staff_id=excluded.staff_id,start_at=excluded.start_at,end_at=excluded.end_at,
 availability_status=excluded.availability_status,schedule_status=excluded.schedule_status,reason=excluded.reason,updated_at=clock_timestamp();
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'STAFF_SCHEDULE_SAVE','staff_schedule',p_request_id,payload);
 RETURN p_schedule_id;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_staff_schedule(uuid,uuid,timestamptz,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admin_staff_schedule(uuid,uuid,timestamptz,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
