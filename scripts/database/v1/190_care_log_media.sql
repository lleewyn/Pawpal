BEGIN;
SET LOCAL lock_timeout='3s';
CREATE OR REPLACE FUNCTION public.save_admin_service_care_log(p_id uuid, p_appointment_id uuid, p_expected_updated_at timestamp with time zone, p_expected_log_updated_at timestamp with time zone, p_action text, p_details jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.appointment; old public.care_log; actor uuid; performer uuid:=nullif(p_details->>'staff_id','')::uuid;
 title_value text:=btrim(p_details->>'title'); at_time timestamptz:=coalesce(nullif(p_details->>'recorded_at','')::timestamptz,clock_timestamp()); action_key uuid;
BEGIN
 PERFORM pawpal_private.work_guard_rpc('save_admin_service_care_log',jsonb_build_object('p_id',to_jsonb(p_id),'p_appointment_id',to_jsonb(p_appointment_id),'p_expected_updated_at',to_jsonb(p_expected_updated_at),'p_expected_log_updated_at',to_jsonb(p_expected_log_updated_at),'p_action',to_jsonb(p_action),'p_details',to_jsonb(p_details)));
 IF NOT pawpal_private.work_rpc_permission('save_admin_service_care_log','appointment.write') OR NOT pawpal_private.work_rpc_permission('save_admin_service_care_log','care_log.write') OR NOT pawpal_private.work_rpc_permission('save_admin_service_care_log','audit_log.write') THEN RAISE EXCEPTION 'service_log_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_action IS NULL OR p_action NOT IN ('save','delete') THEN RAISE EXCEPTION 'invalid_service_log' USING ERRCODE='22023'; END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO old FROM public.care_log WHERE id=p_id;
 IF p_action='save' AND p_expected_log_updated_at IS NULL AND old.id IS NOT NULL THEN
  IF old.appointment_id<>a.id OR NOT EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND action='SAVE_CARE_LOG' AND description=p_details::text) THEN RAISE EXCEPTION 'service_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 IF p_expected_updated_at IS NULL OR a.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
 IF a.appointment_status<>'in_progress' THEN RAISE EXCEPTION 'care_log_requires_active_service' USING ERRCODE='22023'; END IF;
 IF old.id IS NOT NULL AND (old.appointment_id<>a.id OR p_expected_log_updated_at IS NULL OR old.updated_at<>p_expected_log_updated_at) THEN RAISE EXCEPTION 'care_log_changed' USING ERRCODE='PT409'; END IF;
 IF old.id IS NULL AND (p_expected_log_updated_at IS NOT NULL OR p_action='delete') THEN RAISE EXCEPTION 'care_log_not_found' USING ERRCODE='P0002'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF p_action='delete' THEN
  IF EXISTS(SELECT 1 FROM public.care_log_media WHERE care_log_id=p_id) THEN RAISE EXCEPTION 'care_log_has_media' USING ERRCODE='22023'; END IF;
  DELETE FROM public.care_log WHERE id=p_id;
 ELSE
  IF coalesce(length(title_value),0) NOT BETWEEN 1 AND 200 OR length(p_details->>'note')>4000 OR performer IS NULL OR NOT isfinite(at_time) OR at_time>clock_timestamp()+interval '1 minute' OR at_time<date_trunc('minute',coalesce(a.check_in_time,a.created_at))
   OR NOT EXISTS(SELECT 1 FROM public.staff WHERE id=performer AND employment_status='active' AND NOT service_locked) THEN RAISE EXCEPTION 'invalid_service_log' USING ERRCODE='22023'; END IF;
  SELECT ca.id INTO action_key FROM public.care_action ca JOIN public.service_care_action sc ON sc.care_action_id=ca.id JOIN public.appointment_item i ON i.service_id=sc.service_id WHERE i.appointment_id=a.id AND i.status<>'cancelled' AND ca.is_active AND lower(btrim(ca.action_name))=lower(title_value) ORDER BY ca.id LIMIT 1;
  IF old.id IS NULL THEN
   INSERT INTO public.care_log(id,appointment_id,care_action_id,action_name_snapshot,description,recorded_at,recorded_by) VALUES(p_id,a.id,action_key,title_value,nullif(btrim(p_details->>'note'),''),at_time,performer);
  ELSE
   UPDATE public.care_log SET care_action_id=action_key,action_name_snapshot=title_value,description=nullif(btrim(p_details->>'note'),''),recorded_at=at_time,recorded_by=performer WHERE id=p_id;
  END IF;
 END IF;
 -- Existing evidence is immutable here. Only append verified files in the same log-save transaction.
 IF p_action='save' AND p_details ? 'media_asset_ids' THEN
  DECLARE ids jsonb:=p_details->'media_asset_ids'; item jsonb; asset public.media_asset; session public.media_upload_session; selected uuid; seen uuid[]:='{}';
  BEGIN
   IF jsonb_typeof(ids) IS DISTINCT FROM 'array' OR jsonb_array_length(ids)>10 THEN RAISE EXCEPTION 'invalid_care_media' USING ERRCODE='22023'; END IF;
   FOR item IN SELECT value FROM jsonb_array_elements(ids) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_care_media' USING ERRCODE='22023'; END IF;
    selected:=(item#>>'{}')::uuid;
    IF selected IS NULL OR selected=ANY(seen) THEN RAISE EXCEPTION 'invalid_care_media' USING ERRCODE='22023'; END IF;
    seen:=array_append(seen,selected);
    SELECT * INTO asset FROM public.media_asset WHERE id=selected;
    SELECT * INTO session FROM public.media_upload_session WHERE id=asset.session_id FOR UPDATE;
    SELECT * INTO asset FROM public.media_asset WHERE id=selected FOR UPDATE;
    IF asset.id IS NULL OR session.purpose<>'care_log_image' OR session.appointment_id IS DISTINCT FROM a.id
     OR asset.status NOT IN ('verified','attached') OR session.state NOT IN ('verified','attached')
     OR NOT pawpal_private.media_manage(auth.uid(),session.purpose,session.product_id,session.appointment_id)
     OR (asset.status='verified' AND session.created_by IS DISTINCT FROM auth.uid())
     OR EXISTS(SELECT 1 FROM public.care_log_media m WHERE m.media_asset_id=asset.id AND m.care_log_id<>p_id)
     THEN RAISE EXCEPTION 'care_media_forbidden' USING ERRCODE='42501'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=asset.id AND care_log_id=p_id) THEN
     IF (SELECT count(*) FROM public.care_log_media WHERE care_log_id=p_id)>=10 THEN RAISE EXCEPTION 'care_media_limit' USING ERRCODE='22023'; END IF;
     INSERT INTO public.care_log_media(care_log_id,media_type,media_asset_id,file_name,file_size,staff_id)
      VALUES(p_id,'image',asset.id,session.original_name,asset.size_bytes,actor);
    END IF;
   END LOOP;
  END;
 END IF;
 UPDATE public.appointment SET updated_at=clock_timestamp() WHERE id=a.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,CASE WHEN p_action='delete' THEN 'DELETE_CARE_LOG' ELSE 'SAVE_CARE_LOG' END,'care_log',p_id,CASE WHEN p_action='delete' THEN to_jsonb(old)::text ELSE p_details::text END);
 RETURN p_id;
END $function$
;

CREATE OR REPLACE FUNCTION public.list_care_log_media(p_log uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE appointment public.appointment;
BEGIN
 SELECT a.* INTO appointment FROM public.appointment a JOIN public.care_log l ON l.appointment_id=a.id WHERE l.id=p_log;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT (
  pawpal_private.media_manage(auth.uid(),'care_log_image',null,appointment.id)
  OR (NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) AND pawpal_private.owns_customer(appointment.customer_id)))
 THEN RAISE EXCEPTION 'care_media_forbidden' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'media_asset_id',m.media_asset_id,'media_url',m.media_url,'file_name',m.file_name,'file_size',m.file_size) ORDER BY m.created_at,m.id),'[]')
  FROM public.care_log_media m LEFT JOIN public.media_asset a ON a.id=m.media_asset_id WHERE m.care_log_id=p_log AND (m.media_asset_id IS NULL OR a.status='attached'));
END $$;
REVOKE ALL ON FUNCTION public.list_care_log_media(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.list_care_log_media(uuid) TO authenticated;

COMMIT;
