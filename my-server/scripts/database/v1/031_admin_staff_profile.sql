BEGIN;
CREATE OR REPLACE FUNCTION public.save_admin_staff_profile(p_request_id uuid,p_staff_id uuid,p_expected_updated_at timestamptz,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; old public.staff; prior public.audit_log; payload text; employment text; locked boolean; level_key uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'staff_profile_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_staff_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>12000
 OR coalesce(length(btrim(p_details->>'full_name')),0) NOT BETWEEN 1 AND 200 OR coalesce(length(btrim(p_details->>'job_title')),0) NOT BETWEEN 1 AND 200
 OR length(coalesce(p_details->>'phone_number',''))>40 OR length(coalesce(p_details->>'email',''))>254
 OR length(coalesce(p_details->>'address',''))>2000 OR length(coalesce(p_details->>'specialization',''))>2000
 OR length(coalesce(p_details->>'reason',''))>2000 THEN RAISE EXCEPTION 'invalid_staff_profile' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_details) AS keys(name) WHERE name NOT IN ('full_name','phone_number','job_title','specialization','hire_date','email','address','dob','service_locked','staff_level_id','employment_status','reason')) THEN RAISE EXCEPTION 'invalid_staff_profile' USING ERRCODE='22023'; END IF;
 IF nullif(btrim(p_details->>'email'),'') IS NOT NULL AND btrim(p_details->>'email') !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN RAISE EXCEPTION 'invalid_staff_email' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('staff_id',p_staff_id,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,31));
 SELECT * INTO prior FROM public.audit_log WHERE action='STAFF_PROFILE_SAVE' AND entity_id=p_request_id;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_staff_id;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('staff-access-admin-guard',31));
 SELECT * INTO old FROM public.staff WHERE id=p_staff_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected_updated_at IS NULL OR old.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'staff_profile_changed' USING ERRCODE='PT409'; END IF;
 employment:=lower(p_details->>'employment_status');locked:=(p_details->>'service_locked')::boolean;level_key:=nullif(p_details->>'staff_level_id','')::uuid;
 IF employment IS NULL OR employment NOT IN ('active','leave','paused','resigned') OR locked IS NULL THEN RAISE EXCEPTION 'invalid_staff_profile' USING ERRCODE='22023'; END IF;
 IF level_key IS DISTINCT FROM old.staff_level_id THEN RAISE EXCEPTION 'staff_level_separate_workflow' USING ERRCODE='22023'; END IF;
 IF employment IS DISTINCT FROM lower(old.employment_status) OR locked IS DISTINCT FROM old.service_locked THEN
  IF coalesce(length(btrim(p_details->>'reason')),0)<2 THEN RAISE EXCEPTION 'staff_change_reason_required' USING ERRCODE='22023'; END IF;
 END IF;
 IF employment<>'active' AND lower(old.employment_status)='active' AND EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=old.id AND role_code='ADMIN')
 AND NOT pawpal_private.other_available_admin(old.id) THEN
  RAISE EXCEPTION 'staff_last_admin_required' USING ERRCODE='22023';
 END IF;
 IF (employment<>'active' OR locked) AND EXISTS(
  SELECT 1 FROM public.appointment a WHERE a.appointment_status NOT IN ('completed','cancelled','no_show') AND
  (a.staff_id=old.id OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=old.id AND i.status NOT IN ('completed','cancelled'))
   OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=old.id AND t.status NOT IN ('completed','cancelled')))
 ) THEN RAISE EXCEPTION 'staff_handover_required' USING ERRCODE='PT409'; END IF;
 IF nullif(p_details->>'dob','')::date>(now() AT TIME ZONE 'Asia/Bangkok')::date THEN RAISE EXCEPTION 'invalid_staff_birth_date' USING ERRCODE='22023'; END IF;
 UPDATE public.staff SET full_name=btrim(p_details->>'full_name'),job_title=btrim(p_details->>'job_title'),
 phone_number=nullif(btrim(p_details->>'phone_number'),''),email=nullif(btrim(p_details->>'email'),''),address=nullif(btrim(p_details->>'address'),''),
 specialization=nullif(btrim(p_details->>'specialization'),''),hire_date=nullif(p_details->>'hire_date','')::date,dob=nullif(p_details->>'dob','')::date,
 employment_status=employment,service_locked=locked,updated_at=clock_timestamp() WHERE id=old.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'STAFF_PROFILE_SAVE','staff',p_request_id,payload);
 RETURN old.id;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_staff_profile(uuid,uuid,timestamptz,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admin_staff_profile(uuid,uuid,timestamptz,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
