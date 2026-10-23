-- Customer-visible service execution details; no internal audit or staff identifiers.
BEGIN;
CREATE OR REPLACE FUNCTION public.own_service_booking_execution(p_booking uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment; records jsonb; updates jsonb; adjustments jsonb;
BEGIN
 SELECT * INTO a FROM public.appointment WHERE id=p_booking;
 IF NOT FOUND OR NOT pawpal_private.owns_customer(a.customer_id) OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
  RAISE EXCEPTION 'booking_owner_required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.recorded_at),'[]') INTO records FROM (
  SELECT DISTINCT ON(r.record_type) r.record_type,r.recorded_at,r.condition_note,r.safety_note_snapshot,r.allergy_note_snapshot,r.customer_confirmation_status,r.confirmed_at
  FROM public.appointment_record r WHERE r.appointment_id=a.id ORDER BY r.record_type,r.revision_no DESC
 ) x;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.recorded_at DESC),'[]') INTO updates FROM (
  SELECT l.action_name_snapshot,l.description,l.observed_condition,l.recorded_at FROM public.care_log l WHERE l.appointment_id=a.id ORDER BY l.recorded_at DESC,l.id LIMIT 5
 ) x;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.approved_at),'[]') INTO adjustments FROM (
  SELECT j.amount_delta,j.duration_delta_minutes,j.reason,j.approved_at FROM public.appointment_adjustment j WHERE j.appointment_id=a.id AND j.approval_status='approved'
 ) x;
 RETURN jsonb_build_object('check_in_at',a.check_in_time,'check_out_at',a.check_out_time,'records',records,'updates',updates,'adjustments',adjustments);
END $$;
REVOKE ALL ON FUNCTION public.own_service_booking_execution(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_service_booking_execution(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
