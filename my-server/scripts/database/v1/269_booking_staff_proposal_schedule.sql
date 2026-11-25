BEGIN;
SET LOCAL lock_timeout='5s';
-- Only the proposed worker needs a shift. Never roster or confirm the original
-- requested worker as a prerequisite for offering an alternative.
CREATE OR REPLACE FUNCTION public.propose_booking_staff(p_id uuid,p_revision timestamptz,p_staff uuid,p_start timestamptz,p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment;ends timestamptz;shift public.staff_schedule;shift_id uuid;overlap_count integer;
 starts timestamptz;shift_ends timestamptz;request_id uuid:=gen_random_uuid();
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501';END IF;
 PERFORM pg_advisory_xact_lock(820068);
 SELECT * INTO a FROM public.appointment WHERE id=p_id FOR UPDATE;
 IF a.id IS NULL OR a.requested_staff_id IS NULL OR p_revision IS NULL OR a.updated_at<>p_revision THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409';END IF;
 IF a.appointment_status NOT IN('pending','confirmed') OR p_staff IS NULL OR p_start IS NULL OR NOT isfinite(p_start)
  OR p_start<=clock_timestamp()+interval '2 hours' OR p_start>now()+interval '90 days' THEN RAISE EXCEPTION 'invalid_staff_proposal' USING ERRCODE='PT409';END IF;
 IF coalesce(length(btrim(p_note)),0) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'invalid_reason';END IF;
 PERFORM 1 FROM public.staff WHERE id=p_staff AND employment_status='active' AND NOT service_locked FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='PT409';END IF;
 starts:=p_start;shift_ends:=p_start+(a.scheduled_end_at-a.scheduled_start_at);
 SELECT id INTO shift_id FROM public.staff_schedule WHERE staff_id=p_staff AND schedule_status='active' AND availability_status='available'
  AND start_at<=starts AND end_at>=shift_ends;
 IF shift_id IS NULL THEN
  IF NOT pawpal_private.has_permission('staff_schedule.write') THEN RAISE EXCEPTION 'staff_schedule_forbidden' USING ERRCODE='42501';END IF;
  IF shift_ends IS NULL OR shift_ends<=starts OR shift_ends-starts>interval '24 hours' THEN RAISE EXCEPTION 'booking_shift_must_cover' USING ERRCODE='22023';END IF;
  IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=p_staff AND schedule_status='active' AND availability_status<>'available' AND start_at<shift_ends AND end_at>starts) THEN
   RAISE EXCEPTION 'staff_not_available' USING ERRCODE='PT409';END IF;
  SELECT count(*) INTO overlap_count FROM public.staff_schedule WHERE staff_id=p_staff AND schedule_status='active' AND start_at<shift_ends AND end_at>starts;
  IF overlap_count>1 THEN RAISE EXCEPTION 'booking_shift_overlap' USING ERRCODE='PT409';END IF;
  IF overlap_count=1 THEN
   SELECT * INTO shift FROM public.staff_schedule WHERE staff_id=p_staff AND schedule_status='active' AND start_at<shift_ends AND end_at>starts FOR UPDATE;
   starts:=least(starts,shift.start_at);shift_ends:=greatest(shift_ends,shift.end_at);shift_id:=shift.id;
   IF shift_ends-starts>interval '24 hours' THEN RAISE EXCEPTION 'booking_shift_must_cover' USING ERRCODE='22023';END IF;
  ELSE shift_id:=gen_random_uuid();END IF;
  PERFORM public.save_admin_staff_schedule(request_id,shift_id,shift.updated_at,jsonb_build_object('staff_id',p_staff,'start_at',starts,'end_at',shift_ends,
   'availability_status','available','schedule_status','active','reason',concat_ws(E'\n',nullif(shift.reason,''),'Phân ca cho đề xuất lịch hẹn '||a.appointment_code)));
 END IF;
 -- Existing validation still checks qualifications, collisions, price and hours.
 -- A failure rolls back the new/extended shift and its audit in this transaction.
 BEGIN
  ends:=pawpal_private.validate_staff_proposal(p_id,p_staff,p_start);
 EXCEPTION WHEN SQLSTATE 'PT409' THEN
  IF SQLERRM='requested_staff_schedule_required' THEN RAISE EXCEPTION 'proposal_staff_unavailable' USING ERRCODE='PT409';END IF;
  RAISE;
 END;
 UPDATE public.appointment SET proposal_staff_id=p_staff,proposal_start_at=p_start,proposal_end_at=ends,proposal_created_at=clock_timestamp(),staff_confirmation_status='awaiting_customer' WHERE id=p_id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) SELECT id,'BOOKING_STAFF_PROPOSE','appointment',p_id,jsonb_build_object('staff_id',p_staff,'start_at',p_start,'note',p_note,'schedule_id',shift_id)::text FROM public.staff WHERE auth_user_id=auth.uid();
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.propose_booking_staff(uuid,timestamptz,uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.propose_booking_staff(uuid,timestamptz,uuid,timestamptz,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
