BEGIN;
-- Only the caller's identity; no user-supplied staff/Auth ID and no legacy columns.
CREATE OR REPLACE FUNCTION public.get_staff_login_context() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE person public.staff; active_account boolean; role_codes text[]; effective_codes text[];
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 SELECT * INTO person FROM public.staff WHERE auth_user_id=auth.uid();
 IF NOT FOUND THEN RETURN jsonb_build_object('is_staff',false,'is_active',false,'staff',NULL); END IF;
 SELECT person.employment_status='active' AND (u.banned_until IS NULL OR u.banned_until<=now()) INTO active_account FROM auth.users u WHERE u.id=auth.uid();
 SELECT coalesce(array_agg(role_code ORDER BY role_code),'{}'::text[]) INTO role_codes FROM public.staff_role WHERE staff_id=person.id;
 SELECT coalesce(array_agg(code ORDER BY code),'{}'::text[]) INTO effective_codes FROM (
  SELECT rp.permission_code AS code FROM public.role_permission rp JOIN public.staff_role sr ON sr.role_code=rp.role_code WHERE sr.staff_id=person.id
  UNION SELECT permission_code FROM public.staff_permission WHERE staff_id=person.id
 ) p;
 IF NOT coalesce(active_account,false) OR person.must_change_password THEN effective_codes:='{}'::text[]; END IF;
 RETURN jsonb_build_object('is_staff',true,'is_active',coalesce(active_account,false),
 'staff',jsonb_build_object('id',person.id,'auth_user_id',person.auth_user_id,'full_name',person.full_name,
 'email',person.email,'phone_number',person.phone_number,'job_title',person.job_title,'specialization',person.specialization,
 'employment_status',person.employment_status,'must_change_password',person.must_change_password,
 'access_roles',role_codes,'permission_codes',effective_codes));
END $$;
REVOKE ALL ON FUNCTION public.get_staff_login_context() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_login_context() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
