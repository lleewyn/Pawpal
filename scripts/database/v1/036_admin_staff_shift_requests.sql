BEGIN;
-- shift/target_shift identify the exact existing schedule UUID, rather than invented fixed hours.
COMMENT ON COLUMN public.staff_shift_request.shift IS 'V1: UUID ca staff_schedule đã chọn; thời gian và phiên bản được lưu trong nhật ký tạo đơn.';
COMMENT ON COLUMN public.staff_shift_request.target_shift IS 'V1: UUID ca staff_schedule đối ứng trong đơn đổi ca.';
CREATE OR REPLACE FUNCTION public.save_admin_staff_shift_request(p_request_id uuid,p_details jsonb,p_approve boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; prior public.audit_log; source public.staff_schedule; target public.staff_schedule; payload text; kind text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff_shift_request.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'staff_request_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_approve IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>6000 THEN RAISE EXCEPTION 'invalid_staff_request' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('details',p_details,'approve',p_approve)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,36));
 SELECT * INTO prior FROM public.audit_log WHERE action='STAFF_SHIFT_REQUEST_CREATE' AND entity_id=p_request_id;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description::jsonb->>'payload'<>payload THEN RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 END IF;
 kind:=p_details->>'request_type';
 IF kind IS NULL OR kind NOT IN ('LEAVE','SWAP') OR coalesce(length(btrim(p_details->>'reason')),0) NOT BETWEEN 3 AND 4000
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_details) k WHERE k NOT IN ('request_type','schedule_id','expected_updated_at','target_schedule_id','target_expected_updated_at','reason','leave_type')) THEN RAISE EXCEPTION 'invalid_staff_request' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.staff WHERE id IN (SELECT staff_id FROM public.staff_schedule WHERE id IN ((p_details->>'schedule_id')::uuid,(p_details->>'target_schedule_id')::uuid)) ORDER BY id FOR UPDATE;
 SELECT * INTO source FROM public.staff_schedule WHERE id=(p_details->>'schedule_id')::uuid FOR UPDATE;
 IF NOT FOUND OR source.schedule_status<>'active' OR source.availability_status<>'available' OR source.updated_at IS DISTINCT FROM (p_details->>'expected_updated_at')::timestamptz THEN RAISE EXCEPTION 'staff_schedule_changed' USING ERRCODE='PT409'; END IF;
 IF kind='SWAP' THEN
  SELECT * INTO target FROM public.staff_schedule WHERE id=(p_details->>'target_schedule_id')::uuid FOR UPDATE;
  IF NOT FOUND OR target.staff_id=source.staff_id OR target.schedule_status<>'active' OR target.availability_status<>'available' OR target.updated_at IS DISTINCT FROM (p_details->>'target_expected_updated_at')::timestamptz THEN RAISE EXCEPTION 'staff_schedule_changed' USING ERRCODE='PT409'; END IF;
 END IF;
 INSERT INTO public.staff_shift_request(id,request_type,staff_id,target_staff_id,start_date,end_date,shift,target_date,target_shift,reason,leave_type,status,created_by)
 VALUES(p_request_id,kind,source.staff_id,target.staff_id,(source.start_at AT TIME ZONE 'Asia/Bangkok')::date,(source.end_at AT TIME ZONE 'Asia/Bangkok')::date,source.id::text,(target.start_at AT TIME ZONE 'Asia/Bangkok')::date,target.id::text,btrim(p_details->>'reason'),nullif(btrim(p_details->>'leave_type'),''),'pending',auth.uid());
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'STAFF_SHIFT_REQUEST_CREATE','staff_shift_request',p_request_id,jsonb_build_object('payload',payload,'source',to_jsonb(source),'target',to_jsonb(target))::text);
 IF p_approve THEN PERFORM public.review_admin_staff_shift_request(p_request_id,true); END IF;
 RETURN p_request_id;
END $$;
CREATE OR REPLACE FUNCTION public.review_admin_staff_shift_request(p_request_id uuid,p_approve boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE req public.staff_shift_request; original public.audit_log; source public.staff_schedule; target public.staff_schedule; actor uuid; desired text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff_shift_request.write') OR NOT pawpal_private.has_permission('staff_schedule.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'staff_request_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_approve IS NULL THEN RAISE EXCEPTION 'invalid_staff_request' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();desired:=CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,36));
 SELECT * INTO req FROM public.staff_shift_request WHERE id=p_request_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'staff_request_not_found' USING ERRCODE='P0002'; END IF;
 IF req.status=desired THEN RETURN req.id; END IF;
 IF req.status<>'pending' THEN RAISE EXCEPTION 'staff_request_already_reviewed' USING ERRCODE='PT409'; END IF;
 IF p_approve THEN
  SELECT * INTO original FROM public.audit_log WHERE action='STAFF_SHIFT_REQUEST_CREATE' AND entity_id=req.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff_request_legacy_recreate' USING ERRCODE='PT409'; END IF;
  PERFORM 1 FROM public.staff WHERE id IN (req.staff_id,req.target_staff_id) ORDER BY id FOR UPDATE;
  IF EXISTS(SELECT 1 FROM public.staff WHERE id IN (req.staff_id,req.target_staff_id) AND (lower(employment_status)<>'active' OR service_locked)) THEN RAISE EXCEPTION 'staff_not_available' USING ERRCODE='PT409'; END IF;
  SELECT * INTO source FROM public.staff_schedule WHERE id=req.shift::uuid FOR UPDATE;
  IF NOT FOUND OR to_jsonb(source) IS DISTINCT FROM original.description::jsonb->'source' THEN RAISE EXCEPTION 'staff_schedule_changed' USING ERRCODE='PT409'; END IF;
  IF req.request_type='SWAP' THEN
   SELECT * INTO target FROM public.staff_schedule WHERE id=req.target_shift::uuid FOR UPDATE;
   IF NOT FOUND OR to_jsonb(target) IS DISTINCT FROM original.description::jsonb->'target' THEN RAISE EXCEPTION 'staff_schedule_changed' USING ERRCODE='PT409'; END IF;
  END IF;
  -- Service responsibilities must be handed over explicitly before either employee leaves a shift.
  IF EXISTS(SELECT 1 FROM public.appointment a WHERE a.appointment_status NOT IN ('completed','cancelled','no_show')
   AND ((a.scheduled_start_at<source.end_at AND a.scheduled_end_at>source.start_at AND (a.staff_id=source.staff_id OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=source.staff_id) OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=source.staff_id)))
    OR (target.id IS NOT NULL AND a.scheduled_start_at<target.end_at AND a.scheduled_end_at>target.start_at AND (a.staff_id=target.staff_id OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=target.staff_id) OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=target.staff_id))))) THEN RAISE EXCEPTION 'staff_has_service_booking' USING ERRCODE='PT409'; END IF;
  IF req.request_type='LEAVE' THEN
   UPDATE public.staff_schedule SET availability_status='leave',reason=req.reason,updated_at=clock_timestamp() WHERE id=source.id;
  ELSE
   -- Release both exclusion keys inside this transaction, then restore both; any conflict rolls back everything.
   UPDATE public.staff_schedule SET schedule_status='cancelled' WHERE id IN (source.id,target.id);
   UPDATE public.staff_schedule SET staff_id=target.staff_id,schedule_status='active',updated_at=clock_timestamp() WHERE id=source.id;
   UPDATE public.staff_schedule SET staff_id=source.staff_id,schedule_status='active',updated_at=clock_timestamp() WHERE id=target.id;
  END IF;
 END IF;
 UPDATE public.staff_shift_request SET status=desired,reviewed_by=auth.uid(),reviewed_at=clock_timestamp() WHERE id=req.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'STAFF_SHIFT_REQUEST_REVIEW','staff_shift_request',req.id,jsonb_build_object('status',desired)::text);
 RETURN req.id;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_staff_shift_request(uuid,jsonb,boolean),public.review_admin_staff_shift_request(uuid,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admin_staff_shift_request(uuid,jsonb,boolean),public.review_admin_staff_shift_request(uuid,boolean) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.staff_shift_request,public.staff_schedule FROM authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
