BEGIN;
SET LOCAL lock_timeout='5s';

ALTER TABLE public.staff_schedule
 ADD COLUMN IF NOT EXISTS recurring_schedule_id uuid REFERENCES public.staff_recurring_schedule(id);
CREATE INDEX IF NOT EXISTS staff_schedule_recurring_idx ON public.staff_schedule(recurring_schedule_id,start_at)
 WHERE recurring_schedule_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS pawpal_private.staff_recurring_override (
 staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
 work_day date NOT NULL,
 PRIMARY KEY (staff_id,work_day)
);
REVOKE ALL ON pawpal_private.staff_recurring_override FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION pawpal_private.keep_staff_shift_override()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.recurring_schedule_id IS NOT NULL
 AND ROW(OLD.staff_id,OLD.start_at,OLD.end_at,OLD.availability_status,OLD.schedule_status,OLD.reason)
 IS DISTINCT FROM ROW(NEW.staff_id,NEW.start_at,NEW.end_at,NEW.availability_status,NEW.schedule_status,NEW.reason) THEN
  INSERT INTO pawpal_private.staff_recurring_override(staff_id,work_day)
  VALUES(OLD.staff_id,(OLD.start_at AT TIME ZONE 'Asia/Bangkok')::date) ON CONFLICT DO NOTHING;
  NEW.recurring_schedule_id:=NULL;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.keep_staff_shift_override() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS keep_staff_shift_override ON public.staff_schedule;
CREATE TRIGGER keep_staff_shift_override BEFORE UPDATE ON public.staff_schedule
 FOR EACH ROW EXECUTE FUNCTION pawpal_private.keep_staff_shift_override();

CREATE OR REPLACE FUNCTION pawpal_private.recurring_shift_candidates(p_staff uuid[],today date)
RETURNS TABLE(id uuid,staff_id uuid,work_day date,starts timestamptz,ends timestamptz)
LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$
  SELECT r.id,r.staff_id,d.work_day,
    (d.work_day+r.start_time) AT TIME ZONE 'Asia/Bangkok' AS starts,
    (d.work_day+r.end_time) AT TIME ZONE 'Asia/Bangkok' AS ends
  FROM public.staff_recurring_schedule r
  JOIN public.staff s ON s.id=r.staff_id AND s.employment_status='active'
  CROSS JOIN LATERAL (
   SELECT today+offsets.n AS work_day FROM generate_series(0,90) offsets(n)
  ) d
  WHERE r.is_active AND (p_staff IS NULL OR r.staff_id=ANY(p_staff))
   AND d.work_day>=r.valid_from AND (r.valid_to IS NULL OR d.work_day<=r.valid_to)
   AND ((d.work_day+r.end_time) AT TIME ZONE 'Asia/Bangkok')>now()
   AND extract(isodow FROM d.work_day)::integer=ANY(r.weekdays)
   AND NOT EXISTS(SELECT 1 FROM pawpal_private.staff_recurring_override o WHERE o.staff_id=r.staff_id AND o.work_day=d.work_day)
   AND NOT EXISTS(
    SELECT 1 FROM public.staff_schedule m
    WHERE m.staff_id=r.staff_id AND m.recurring_schedule_id IS NULL AND m.schedule_status='active'
    AND m.start_at<((d.work_day+1)::timestamp AT TIME ZONE 'Asia/Bangkok')
    AND m.end_at>(d.work_day::timestamp AT TIME ZONE 'Asia/Bangkok')
   )
$$;
REVOKE ALL ON FUNCTION pawpal_private.recurring_shift_candidates(uuid[],date) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION pawpal_private.recurring_shift_has_booking(p_staff uuid,p_start timestamptz,p_end timestamptz)
RETURNS boolean LANGUAGE sql VOLATILE SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.appointment a
  WHERE a.appointment_status NOT IN('completed','cancelled','no_show','expired','da_huy','da_hoan_tat','vang_mat')
  AND a.scheduled_start_at<p_end AND a.scheduled_end_at>p_start
  AND (p_staff IN(a.staff_id,a.requested_staff_id)
   OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=p_staff AND i.status<>'cancelled')
   OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=p_staff AND t.status NOT IN('completed','cancelled')))
 )
 OR EXISTS(
  SELECT 1 FROM pawpal_private.member_booking_hold h
  WHERE h.staff_id=p_staff AND h.expires_at>clock_timestamp() AND h.starts<p_end AND h.ends>p_start
 )
$$;
REVOKE ALL ON FUNCTION pawpal_private.recurring_shift_has_booking(uuid,timestamptz,timestamptz) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION pawpal_private.sync_staff_recurring_shifts(p_staff uuid[] DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE today date:=(now() AT TIME ZONE 'Asia/Bangkok')::date;
 horizon timestamptz:=((today+91)::timestamp AT TIME ZONE 'Asia/Bangkok');
BEGIN
 -- Booking holds, confirmation and schedule refresh share this transaction lock.
 PERFORM pg_advisory_xact_lock(820068);
 PERFORM 1 FROM public.staff s
 WHERE (p_staff IS NULL OR s.id=ANY(p_staff))
 AND (EXISTS(SELECT 1 FROM public.staff_recurring_schedule r WHERE r.staff_id=s.id)
   OR EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=s.id AND sc.recurring_schedule_id IS NOT NULL AND sc.start_at>=now()))
 ORDER BY s.id FOR UPDATE;


 DELETE FROM public.staff_schedule sc
 WHERE sc.recurring_schedule_id IS NOT NULL AND sc.end_at>now() AND sc.start_at<horizon
 AND (p_staff IS NULL OR sc.staff_id=ANY(p_staff))
 AND NOT EXISTS(SELECT 1 FROM pawpal_private.recurring_shift_candidates(p_staff,today) c WHERE c.id=sc.recurring_schedule_id AND c.staff_id=sc.staff_id AND c.starts=sc.start_at AND c.ends=sc.end_at)
 AND NOT pawpal_private.recurring_shift_has_booking(sc.staff_id,sc.start_at,sc.end_at);

 INSERT INTO public.staff_schedule(staff_id,start_at,end_at,recurring_schedule_id)
 SELECT c.staff_id,c.starts,c.ends,c.id
 FROM pawpal_private.recurring_shift_candidates(p_staff,today) c
 WHERE NOT EXISTS(
  SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=c.staff_id AND sc.schedule_status='active'
  AND sc.start_at<c.ends AND sc.end_at>c.starts
 )
 ORDER BY c.staff_id,c.starts,c.ends,c.id
 ON CONFLICT ON CONSTRAINT staff_no_overlap DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.sync_staff_recurring_shifts(uuid[]) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION pawpal_private.refresh_staff_recurring_after_save()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 PERFORM pawpal_private.sync_staff_recurring_shifts(
  CASE WHEN TG_OP='INSERT' THEN ARRAY[NEW.staff_id] ELSE ARRAY[OLD.staff_id,NEW.staff_id] END
 );
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.refresh_staff_recurring_after_save() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS refresh_staff_recurring_after_save ON public.staff_recurring_schedule;
CREATE TRIGGER refresh_staff_recurring_after_save AFTER INSERT OR UPDATE ON public.staff_recurring_schedule
 FOR EACH ROW EXECUTE FUNCTION pawpal_private.refresh_staff_recurring_after_save();

CREATE OR REPLACE FUNCTION public.staff_recurring_shift_coverage(p_ids uuid[])
RETURNS TABLE(recurring_schedule_id uuid,generated_through date)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff_schedule.read') THEN
  RAISE EXCEPTION 'staff_schedule_forbidden' USING ERRCODE='42501';
 END IF;
 IF coalesce(cardinality(p_ids),0)>10 THEN RAISE EXCEPTION 'invalid_recurring_schedule' USING ERRCODE='22023'; END IF;
 RETURN QUERY
 SELECT sc.recurring_schedule_id,max((sc.start_at AT TIME ZONE 'Asia/Bangkok')::date)
 FROM public.staff_schedule sc
 WHERE sc.recurring_schedule_id=ANY(p_ids) AND sc.end_at>now()
 AND sc.schedule_status='active' AND sc.availability_status='available'
 GROUP BY sc.recurring_schedule_id;
END $$;
REVOKE ALL ON FUNCTION public.staff_recurring_shift_coverage(uuid[]) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.staff_recurring_shift_coverage(uuid[]) TO authenticated;

DO $migration$
DECLARE definition text;signature text;
 marker text:=' RETURN jsonb_build_object(''available'',true,''reason'',NULL,''staff'',CASE WHEN kind';
BEGIN
 definition:=pg_get_functiondef('public.save_staff_recurring_schedule(uuid,timestamptz,jsonb)'::regprocedure);
 IF position('pg_advisory_xact_lock(820068)' IN definition)=0 THEN
  IF position(' PERFORM 1 FROM public.staff WHERE id=target' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected recurring save definition'; END IF;
  EXECUTE replace(definition,' PERFORM 1 FROM public.staff WHERE id=target',
   E' PERFORM pg_advisory_xact_lock(820068);\n PERFORM 1 FROM public.staff WHERE id=target');
 END IF;
 definition:=pg_get_functiondef('public.save_admin_staff_schedule(uuid,uuid,timestamptz,jsonb)'::regprocedure);
 IF position('recurring_shift_has_booking' IN definition)=0 THEN
  marker:=' INSERT INTO public.staff_schedule(id,staff_id,start_at,end_at,availability_status,schedule_status,reason)';
  IF position(marker IN definition)=0 OR position(' -- Same staff lock used by service assignment' IN definition)=0 THEN
   RAISE EXCEPTION 'Unexpected manual shift save definition';
  END IF;
  definition:=replace(definition,' -- Same staff lock used by service assignment',
   E' PERFORM pg_advisory_xact_lock(820068);\n -- Same staff lock used by service assignment');
  definition:=replace(definition,marker,$manual$
 IF status_value='active' THEN
  DELETE FROM public.staff_schedule sc
  WHERE sc.staff_id=target AND sc.id<>p_schedule_id AND sc.recurring_schedule_id IS NOT NULL
  AND sc.start_at<ends AND sc.end_at>starts
  AND NOT pawpal_private.recurring_shift_has_booking(sc.staff_id,sc.start_at,sc.end_at);
 END IF;
$manual$||marker);
  EXECUTE definition;
 END IF;
 marker:=' RETURN jsonb_build_object(''available'',true,''reason'',NULL,''staff'',CASE WHEN kind';
 FOREACH signature IN ARRAY ARRAY[
  'public.own_booking_availability(jsonb)',
  'pawpal_private.guest_booking_availability(uuid,jsonb)',
  'pawpal_private.staff_booking_availability(uuid,jsonb)'
 ] LOOP
  definition:=pg_get_functiondef(signature::regprocedure);
  IF position('no_scheduled_staff' IN definition)>0 THEN CONTINUE; END IF;
  IF position(marker IN definition)=0 THEN RAISE EXCEPTION 'Unexpected availability definition for %',signature; END IF;
  EXECUTE replace(definition,marker,
   E' IF kind=''grooming_spa'' AND jsonb_array_length(workers)=0 THEN\n  RETURN jsonb_build_object(''available'',false,''reason'',''no_scheduled_staff'',''staff'',workers,''open'',hours->>''open'',''close'',hours->>''close'');\n END IF;\n'||marker);
 END LOOP;
END $migration$;

SELECT pawpal_private.sync_staff_recurring_shifts();
SELECT cron.schedule('pawpal-sync-staff-recurring-shifts','5 17 * * *','SELECT pawpal_private.sync_staff_recurring_shifts()');
NOTIFY pgrst,'reload schema';
COMMIT;
