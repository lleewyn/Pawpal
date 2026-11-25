-- Keep intake options consistent with qualification and committed employee assignments.
BEGIN;
CREATE OR REPLACE FUNCTION public.admin_intake_staff_candidates(p_appointment uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE directory jsonb; a public.appointment; result jsonb; required jsonb;
BEGIN
 -- Reuse the existing authenticated staff directory gate; no new broad table access.
 directory:=public.admin_service_staff_candidates();
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment;
 IF a.id IS NULL THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002';END IF;
 IF NOT pawpal_private.work_is_admin() AND NOT pawpal_private.work_owns_appointment(a.id) THEN
  RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501';END IF;
 SELECT coalesce(jsonb_agg(level_name ORDER BY rank_order),'[]'::jsonb) INTO required FROM (
  SELECT DISTINCT l.level_name,l.rank_order FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id
  JOIN public.staff_level l ON l.id=s.staff_level_required_id WHERE i.appointment_id=a.id AND i.status<>'cancelled'
 ) levels;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',st.id,'full_name',st.full_name,'level_name',actual.level_name) ORDER BY st.full_name,st.id),'[]'::jsonb)
 INTO result FROM jsonb_to_recordset(directory) d(id uuid) JOIN public.staff st ON st.id=d.id
 LEFT JOIN public.staff_level actual ON actual.id=st.staff_level_id
 WHERE (pawpal_private.work_is_admin() OR st.id=pawpal_private.work_actor())
 AND NOT EXISTS(SELECT 1 FROM public.appointment_item i JOIN public.service svc ON svc.id=i.service_id
  JOIN public.staff_level required_level ON required_level.id=svc.staff_level_required_id
  WHERE i.appointment_id=a.id AND i.status<>'cancelled' AND (actual.rank_order IS NULL OR actual.rank_order<required_level.rank_order))
 AND (a.requested_staff_id IS NULL OR st.id=a.requested_staff_id)
 AND NOT EXISTS(SELECT 1 FROM public.staff_schedule sc WHERE sc.staff_id=st.id AND sc.schedule_status='active' AND sc.availability_status<>'available' AND sc.start_at<a.scheduled_end_at AND sc.end_at>a.scheduled_start_at)
 AND NOT EXISTS(SELECT 1 FROM public.appointment other WHERE other.id<>a.id
  AND (other.staff_id=st.id OR other.requested_staff_id=st.id OR EXISTS(SELECT 1 FROM public.appointment_item item WHERE item.appointment_id=other.id AND item.staff_id=st.id AND item.status<>'cancelled'))
  AND other.appointment_status NOT IN ('cancelled','no_show','completed','expired')
  AND other.scheduled_start_at<a.scheduled_end_at AND other.scheduled_end_at>a.scheduled_start_at);
 RETURN jsonb_build_object('staff',result,'required_levels',required,'assigned_staff_id',a.staff_id);
END $$;
REVOKE ALL ON FUNCTION public.admin_intake_staff_candidates(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.admin_intake_staff_candidates(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
