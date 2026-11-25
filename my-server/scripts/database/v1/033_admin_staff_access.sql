BEGIN;
-- Reserved personnel audit events can only be emitted by server transactions.
CREATE OR REPLACE FUNCTION pawpal_private.guard_staff_audit() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF NEW.action IN ('STAFF_AUTH_PENDING','STAFF_AUTH_DONE','STAFF_AUTH_FAILED','STAFF_ACCESS_SAVE','STAFF_PROFILE_CREATE','STAFF_PROVISION_DONE')
 AND current_user IN ('authenticated','anon','authenticator') THEN RAISE EXCEPTION 'staff_audit_server_only' USING ERRCODE='42501'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS v1_staff_audit_server ON public.audit_log;
CREATE TRIGGER v1_staff_audit_server BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_staff_audit();
REVOKE ALL ON FUNCTION pawpal_private.guard_staff_audit() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION pawpal_private.other_available_admin(excluded uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.staff s JOIN public.staff_role sr ON sr.staff_id=s.id JOIN auth.users u ON u.id=s.auth_user_id
 WHERE s.id<>excluded AND sr.role_code='ADMIN' AND s.employment_status='active' AND NOT s.must_change_password AND coalesce(u.banned_until<=now(),true)
 AND NOT EXISTS(SELECT 1 FROM public.audit_log pending WHERE pending.action='STAFF_AUTH_PENDING' AND pending.description::jsonb->>'staff_id'=s.id::text
  AND pending.description::jsonb->>'action' IN ('lock','reset') AND NOT EXISTS(SELECT 1 FROM public.audit_log finished WHERE finished.entity_id=pending.entity_id AND finished.action IN ('STAFF_AUTH_DONE','STAFF_AUTH_FAILED'))));
$$;
REVOKE ALL ON FUNCTION pawpal_private.other_available_admin(uuid) FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.set_admin_staff_access(p_request_id uuid,p_staff_id uuid,p_expected_updated_at timestamptz,p_roles text[],p_permissions text[],p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; old public.staff; prior public.audit_log; payload text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff_role.write') OR NOT pawpal_private.has_permission('staff_permission.write')
 OR NOT pawpal_private.has_permission('audit_log.write') OR NOT EXISTS(SELECT 1 FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE s.auth_user_id=auth.uid() AND r.role_code='ADMIN') THEN RAISE EXCEPTION 'staff_access_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_staff_id IS NULL OR p_roles IS NULL OR p_permissions IS NULL OR cardinality(p_roles)>30 OR cardinality(p_permissions)>250
 OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 2 AND 2000
 OR EXISTS(SELECT 1 FROM unnest(p_roles) x WHERE x IS NULL OR NOT EXISTS(SELECT 1 FROM public.access_role WHERE code=x))
 OR EXISTS(SELECT 1 FROM unnest(p_permissions) x WHERE x IS NULL OR NOT EXISTS(SELECT 1 FROM public.permission WHERE code=x)) THEN RAISE EXCEPTION 'invalid_staff_access' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('staff_id',p_staff_id,'roles',p_roles,'permissions',p_permissions,'reason',p_reason)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,33));
 SELECT * INTO prior FROM public.audit_log WHERE action='STAFF_ACCESS_SAVE' AND entity_id=p_request_id;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_staff_id;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('staff-access-admin-guard',31));
 SELECT * INTO old FROM public.staff WHERE id=p_staff_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected_updated_at IS NULL OR old.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'staff_profile_changed' USING ERRCODE='PT409'; END IF;
 IF NOT ('ADMIN'=ANY(p_roles)) AND EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=old.id AND role_code='ADMIN') AND NOT pawpal_private.other_available_admin(old.id) THEN RAISE EXCEPTION 'staff_last_admin_required' USING ERRCODE='22023'; END IF;
 DELETE FROM public.staff_role WHERE staff_id=old.id;
 INSERT INTO public.staff_role(staff_id,role_code) SELECT old.id,x FROM (SELECT DISTINCT unnest(p_roles) x) roles;
 DELETE FROM public.staff_permission WHERE staff_id=old.id;
 INSERT INTO public.staff_permission(staff_id,permission_code) SELECT old.id,x FROM (SELECT DISTINCT unnest(p_permissions) x) permissions;
 UPDATE public.staff SET updated_at=clock_timestamp() WHERE id=old.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'STAFF_ACCESS_SAVE','staff',p_request_id,payload);
 RETURN old.id;
END $$;

CREATE OR REPLACE FUNCTION public.create_admin_staff_profile(p_request_id uuid,p_staff_id uuid,p_auth_user_id uuid,p_details jsonb,p_roles text[],p_permissions text[])
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; prior public.audit_log; payload text; version timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('staff.write') OR NOT pawpal_private.has_permission('staff_role.write')
 OR NOT EXISTS(SELECT 1 FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE s.auth_user_id=auth.uid() AND r.role_code='ADMIN') THEN RAISE EXCEPTION 'staff_access_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_staff_id IS NULL OR p_auth_user_id IS NULL THEN RAISE EXCEPTION 'invalid_staff_profile' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('staff_id',p_staff_id,'auth_user_id',p_auth_user_id,'details',p_details,'roles',p_roles,'permissions',p_permissions)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,331));
 SELECT * INTO prior FROM public.audit_log WHERE action='STAFF_PROFILE_CREATE' AND entity_id=p_request_id;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_staff_id;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_auth_user_id AND raw_app_meta_data->>'pawpal_staff_request'=p_request_id::text
  AND raw_app_meta_data->>'pawpal_staff_id'=p_staff_id::text AND banned_until>now()) THEN RAISE EXCEPTION 'staff_provisioned_identity_required' USING ERRCODE='42501'; END IF;
 INSERT INTO public.staff(id,auth_user_id,full_name,job_title,must_change_password)
 VALUES(p_staff_id,p_auth_user_id,p_details->>'full_name',p_details->>'job_title',true) RETURNING updated_at INTO version;
 PERFORM public.save_admin_staff_profile(md5(p_request_id::text||':profile')::uuid,p_staff_id,version,p_details);
 SELECT updated_at INTO version FROM public.staff WHERE id=p_staff_id;
 PERFORM public.set_admin_staff_access(md5(p_request_id::text||':access')::uuid,p_staff_id,version,p_roles,p_permissions,'Initial explicitly selected access');
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'STAFF_PROFILE_CREATE','staff',p_request_id,payload);
 RETURN p_staff_id;
END $$;
REVOKE ALL ON FUNCTION public.set_admin_staff_access(uuid,uuid,timestamptz,text[],text[],text),public.create_admin_staff_profile(uuid,uuid,uuid,jsonb,text[],text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_admin_staff_access(uuid,uuid,timestamptz,text[],text[],text),public.create_admin_staff_profile(uuid,uuid,uuid,jsonb,text[],text[]) TO authenticated;
-- Auth identity and roles may only be changed through the guarded workflows.
REVOKE INSERT,UPDATE,DELETE ON public.staff,public.staff_role,public.staff_permission,public.access_role,public.role_permission FROM authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
