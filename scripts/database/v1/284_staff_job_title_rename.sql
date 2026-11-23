BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE public.staff_job_title ADD COLUMN IF NOT EXISTS aliases text[] NOT NULL DEFAULT '{}';
GRANT SELECT ON public.staff_job_title TO authenticated;
DROP POLICY IF EXISTS staff_job_title_admin_read ON public.staff_job_title;
CREATE POLICY staff_job_title_admin_read ON public.staff_job_title FOR SELECT TO authenticated USING(pawpal_private.has_permission('staff.read'));
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='staff_job_title') THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_job_title;END IF;
END $$;
UPDATE public.staff_job_title SET aliases=ARRAY(SELECT DISTINCT value FROM unnest(aliases||ARRAY[title,code]||CASE code
 WHEN 'quan_ly' THEN ARRAY['ADMIN'] WHEN 'cham_soc_thu_cung' THEN ARRAY['cham_soc_thu_cung']
 WHEN 'ky_thuat_vien_cat_tia' THEN ARRAY['Groomer','Kỹ thuật viên grooming'] WHEN 'tai_xe_dua_don' THEN ARRAY['Driver']
 WHEN 'cham_soc_luu_tru' THEN ARRAY['Caregiver'] WHEN 'le_tan' THEN ARRAY['Receptionist']
 WHEN 'cham_soc_khach_hang' THEN ARRAY['CSKH'] ELSE ARRAY[]::text[] END) value);
CREATE OR REPLACE FUNCTION public.admin_staff_job_title_catalog() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() OR NOT pawpal_private.has_permission('staff.read') THEN RAISE EXCEPTION 'staff_directory_forbidden' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(j) ORDER BY sort_order,title,code),'[]') FROM public.staff_job_title j WHERE is_active);
END $$;
CREATE OR REPLACE FUNCTION public.rename_admin_staff_job_title(p_request_id uuid,p_code text,p_expected_title text,p_title text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE item public.staff_job_title;prior public.audit_log;actor uuid:=pawpal_private.work_actor();name text:=regexp_replace(btrim(p_title),'[[:space:]]+',' ','g');payload text;
BEGIN
 IF NOT pawpal_private.work_is_admin() OR NOT pawpal_private.has_permission('staff.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'staff_job_title_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR coalesce(length(name),0) NOT BETWEEN 2 AND 200 OR name!~'[[:alpha:]]' THEN RAISE EXCEPTION 'invalid_staff_job_title' USING ERRCODE='22023'; END IF;
 payload:=jsonb_build_object('code',p_code,'before',jsonb_build_object('job_title',p_expected_title),'after',jsonb_build_object('job_title',name))::text;
 PERFORM pg_advisory_xact_lock(820284);
 SELECT * INTO prior FROM public.audit_log WHERE id=p_request_id;
 IF FOUND THEN
  IF prior.action<>'STAFF_JOB_TITLE_RENAME' OR prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'staff_job_title_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_code;
 END IF;
 SELECT * INTO item FROM public.staff_job_title WHERE code=p_code AND is_active FOR UPDATE;
 IF NOT FOUND OR item.title IS DISTINCT FROM p_expected_title THEN RAISE EXCEPTION 'staff_job_title_changed' USING ERRCODE='PT409'; END IF;
 IF EXISTS(SELECT 1 FROM public.staff_job_title j WHERE j.code<>p_code AND (pawpal_private.fold_search(j.title)=pawpal_private.fold_search(name) OR EXISTS(SELECT 1 FROM unnest(j.aliases) a WHERE pawpal_private.fold_search(a)=pawpal_private.fold_search(name)))) THEN RAISE EXCEPTION 'staff_job_title_exists' USING ERRCODE='PT409'; END IF;
 IF item.title=name THEN RETURN p_code; END IF;
 UPDATE public.staff_job_title SET title=name,aliases=ARRAY(SELECT DISTINCT value FROM unnest(item.aliases||ARRAY[item.title]) value) WHERE code=p_code;
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request_id,actor,'STAFF_JOB_TITLE_RENAME','staff_job_title',p_request_id,payload);
 RETURN p_code;
END $$;
REVOKE ALL ON FUNCTION public.admin_staff_job_title_catalog(),public.rename_admin_staff_job_title(uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_staff_job_title_catalog(),public.rename_admin_staff_job_title(uuid,text,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
