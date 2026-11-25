BEGIN;
CREATE OR REPLACE FUNCTION public.save_admin_staff_assessment(p_request_id uuid,p_staff_id uuid,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; prior public.audit_log; payload text; date_value date; score_value numeric; result_value text; type_value text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff_assessment.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN
  RAISE EXCEPTION 'staff_assessment_forbidden' USING ERRCODE='42501';
 END IF;
 IF p_request_id IS NULL OR p_staff_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>10000
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_details) k WHERE k NOT IN ('assessment_date','assessment_type','score','result','note')) THEN
  RAISE EXCEPTION 'invalid_staff_assessment' USING ERRCODE='22023';
 END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('staff_id',p_staff_id,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,35));
 SELECT * INTO prior FROM public.audit_log WHERE action='STAFF_ASSESSMENT_SAVE' AND entity_id=p_request_id;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 END IF;
 date_value:=(p_details->>'assessment_date')::date;score_value:=(p_details->>'score')::numeric;
 type_value:=nullif(btrim(p_details->>'assessment_type'),'');result_value:=p_details->>'result';
 IF date_value IS NULL OR NOT isfinite(date_value) OR date_value>(now() AT TIME ZONE 'Asia/Bangkok')::date
 OR score_value IS NULL OR score_value::text IN ('NaN','Infinity','-Infinity') OR score_value<0 OR score_value>100 OR score_value<>round(score_value,2)
 OR type_value IS NULL OR length(type_value)>200 OR result_value IS NULL OR result_value NOT IN ('PASS','RETRAIN','FAIL') OR coalesce(length(p_details->>'note'),0)>4000 THEN
  RAISE EXCEPTION 'invalid_staff_assessment' USING ERRCODE='22023';
 END IF;
 PERFORM 1 FROM public.staff WHERE id=p_staff_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_found' USING ERRCODE='P0002'; END IF;
 INSERT INTO public.staff_assessment(id,staff_id,assessment_date,assessment_type,score,result,note,assessed_by)
 VALUES(p_request_id,p_staff_id,date_value,type_value,score_value,result_value,nullif(btrim(p_details->>'note'),''),actor);
 -- A recorded assessment never changes professional level, assignment locks or Auth.
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,'STAFF_ASSESSMENT_SAVE','staff_assessment',p_request_id,payload);
 RETURN p_request_id;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_staff_assessment(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admin_staff_assessment(uuid,uuid,jsonb) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.staff_assessment FROM authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
