BEGIN;
-- Personnel may inspect account availability, never password hashes or sessions.
CREATE OR REPLACE FUNCTION public.get_admin_staff_directory()
RETURNS TABLE(staff_record jsonb,roles jsonb,permissions text[],auth_linked boolean,login_blocked boolean,last_sign_in_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.read') THEN
  RAISE EXCEPTION 'staff_directory_forbidden' USING ERRCODE='42501';
 END IF;
 RETURN QUERY
 SELECT to_jsonb(s)||jsonb_build_object('login_email',u.email),
  CASE WHEN pawpal_private.has_permission('staff_role.read') THEN coalesce((
   SELECT jsonb_agg(jsonb_build_object('code',r.code,'name',r.role_name) ORDER BY r.code)
   FROM public.staff_role sr JOIN public.access_role r ON r.code=sr.role_code WHERE sr.staff_id=s.id
  ),'[]'::jsonb) ELSE '[]'::jsonb END,
  CASE WHEN pawpal_private.has_permission('staff_permission.read') THEN ARRAY(
   SELECT sp.permission_code FROM public.staff_permission sp WHERE sp.staff_id=s.id ORDER BY sp.permission_code
  ) ELSE '{}'::text[] END,
  u.id IS NOT NULL,
  CASE WHEN u.id IS NULL THEN NULL ELSE coalesce(u.banned_until>now(),false) END,
  u.last_sign_in_at
 FROM public.staff s LEFT JOIN auth.users u ON u.id=s.auth_user_id ORDER BY s.created_at,s.id;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_staff_directory() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_staff_directory() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
