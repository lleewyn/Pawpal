BEGIN;
SET LOCAL lock_timeout='5s';

-- A shift and its booking confirmation are one transaction. Existing booking
-- guards still validate qualifications, conflicts, holds and the customer's choice.
CREATE OR REPLACE FUNCTION public.confirm_booking_staff_with_schedule(
 p_id uuid,p_revision timestamptz,p_request uuid,p_shift_start timestamptz,p_shift_end timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment;actor uuid;prior public.audit_log;payload text;shift_id uuid;choice jsonb;overlap_count integer;shift public.staff_schedule;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('appointment.write')
 OR NOT pawpal_private.has_permission('audit_log.write') THEN
  RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501';
 END IF;
 IF p_id IS NULL OR p_revision IS NULL OR p_request IS NULL THEN
  RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409';
 END IF;
 PERFORM pg_advisory_xact_lock(820068);
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('booking_id',p_id,'revision',p_revision,'shift_start',p_shift_start,'shift_end',p_shift_end)::text;
 SELECT * INTO prior FROM public.audit_log WHERE action='BOOKING_STAFF_CONFIRM' AND entity_id=p_request;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description IS DISTINCT FROM payload THEN
   RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409';
  END IF;
  RETURN p_id;
 END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_id FOR UPDATE;
 IF a.id IS NULL THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002';END IF;
 IF a.updated_at<>p_revision THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409';END IF;
 IF a.requested_staff_id IS NULL OR a.appointment_status<>'pending' OR a.staff_confirmation_status<>'pending' THEN
  RAISE EXCEPTION 'invalid_booking_transition' USING ERRCODE='PT409';
 END IF;
 PERFORM 1 FROM public.staff WHERE id=a.requested_staff_id AND employment_status='active' AND NOT service_locked FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='PT409';END IF;
 IF a.scheduled_start_at<=clock_timestamp() THEN RAISE EXCEPTION 'booking_has_started' USING ERRCODE='PT409';END IF;
 SELECT id INTO shift_id FROM public.staff_schedule WHERE staff_id=a.requested_staff_id
  AND schedule_status='active' AND availability_status='available'
  AND start_at<=a.scheduled_start_at AND end_at>=a.scheduled_end_at;
 IF shift_id IS NULL THEN
  IF NOT pawpal_private.has_permission('staff_schedule.write') THEN
   RAISE EXCEPTION 'staff_schedule_forbidden' USING ERRCODE='42501';
  END IF;
  IF p_shift_start IS NULL OR p_shift_end IS NULL OR NOT isfinite(p_shift_start) OR NOT isfinite(p_shift_end)
   OR p_shift_start>a.scheduled_start_at OR p_shift_end<a.scheduled_end_at OR p_shift_end<=p_shift_start
   OR p_shift_end-p_shift_start>interval '24 hours' THEN
   RAISE EXCEPTION 'booking_shift_must_cover' USING ERRCODE='22023';
  END IF;
  IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=a.requested_staff_id AND schedule_status='active'
   AND availability_status<>'available' AND start_at<p_shift_end AND end_at>p_shift_start) THEN
   RAISE EXCEPTION 'staff_not_available' USING ERRCODE='PT409';
  END IF;
  SELECT count(*) INTO overlap_count FROM public.staff_schedule WHERE staff_id=a.requested_staff_id AND schedule_status='active'
   AND start_at<p_shift_end AND end_at>p_shift_start;
  IF overlap_count>1 THEN RAISE EXCEPTION 'booking_shift_overlap' USING ERRCODE='PT409';END IF;
  IF overlap_count=1 THEN
   SELECT * INTO shift FROM public.staff_schedule WHERE staff_id=a.requested_staff_id AND schedule_status='active'
    AND start_at<p_shift_end AND end_at>p_shift_start FOR UPDATE;
   p_shift_start:=least(p_shift_start,shift.start_at);p_shift_end:=greatest(p_shift_end,shift.end_at);
   IF p_shift_end-p_shift_start>interval '24 hours' THEN RAISE EXCEPTION 'booking_shift_must_cover' USING ERRCODE='22023';END IF;
   shift_id:=shift.id;
  ELSE shift_id:=gen_random_uuid();END IF;
  PERFORM public.save_admin_staff_schedule(p_request,shift_id,shift.updated_at,jsonb_build_object(
   'staff_id',a.requested_staff_id,'start_at',p_shift_start,'end_at',p_shift_end,
   'availability_status','available','schedule_status','active','reason',concat_ws(E'\n',nullif(shift.reason,''),'Phân ca từ lịch hẹn '||a.appointment_code)));
 END IF;
 SELECT v INTO choice FROM jsonb_array_elements(pawpal_private.booking_staff_choices(
  a.customer_id,pawpal_private.booking_request_details(a.id,a.scheduled_start_at),a.id)) v
  WHERE v->>'id'=a.requested_staff_id::text;
 IF choice IS NULL OR choice->>'source'<>'scheduled' THEN
  RAISE EXCEPTION 'preferred_staff_unavailable' USING ERRCODE='PT409';
 END IF;
 PERFORM public.update_admin_service_booking(p_id,p_revision,'status','confirmed','Phân công và xác nhận đúng nhân viên khách yêu cầu');
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,'BOOKING_STAFF_CONFIRM','appointment',p_request,payload);
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.confirm_booking_staff_with_schedule(uuid,timestamptz,uuid,timestamptz,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.confirm_booking_staff_with_schedule(uuid,timestamptz,uuid,timestamptz,timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
