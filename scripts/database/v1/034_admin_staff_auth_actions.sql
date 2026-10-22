BEGIN;
CREATE OR REPLACE FUNCTION public.begin_admin_staff_auth_action(p_actor_auth_id uuid,p_request_id uuid,p_staff_id uuid,p_expected_updated_at timestamptz,p_action text,p_fingerprint text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; old public.staff; prior public.audit_log; payload text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'staff_auth_server_only' USING ERRCODE='42501'; END IF;
 SELECT s.id INTO actor FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id JOIN public.staff_role r ON r.staff_id=s.id AND r.role_code='ADMIN'
 WHERE s.auth_user_id=p_actor_auth_id AND s.employment_status='active' AND NOT s.must_change_password AND coalesce(u.banned_until<=now(),true);
 IF actor IS NULL THEN RAISE EXCEPTION 'staff_access_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_staff_id IS NULL OR p_action IS NULL OR p_action NOT IN ('lock','unlock','reset') OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid_staff_auth_action' USING ERRCODE='22023'; END IF;
 payload:=jsonb_build_object('staff_id',p_staff_id,'action',p_action,'fingerprint',p_fingerprint)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended('staff-access-admin-guard',31));
 SELECT * INTO old FROM public.staff WHERE id=p_staff_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO prior FROM public.audit_log WHERE action='STAFF_AUTH_PENDING' AND entity_id=p_request_id;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409'; END IF;
  IF EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_request_id AND action='STAFF_AUTH_FAILED') THEN RAISE EXCEPTION 'staff_auth_previous_failure' USING ERRCODE='PT409'; END IF;
  RETURN jsonb_build_object('auth_user_id',old.auth_user_id,'done',EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_request_id AND action='STAFF_AUTH_DONE'));
 END IF;
 IF p_expected_updated_at IS NULL OR old.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'staff_profile_changed' USING ERRCODE='PT409'; END IF;
 IF actor=old.id AND p_action IN ('lock','reset') THEN RAISE EXCEPTION 'staff_use_own_password_workflow' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.audit_log pending WHERE pending.action='STAFF_AUTH_PENDING' AND pending.description::jsonb->>'staff_id'=old.id::text
  AND NOT EXISTS(SELECT 1 FROM public.audit_log finished WHERE finished.entity_id=pending.entity_id AND finished.action IN ('STAFF_AUTH_DONE','STAFF_AUTH_FAILED'))) THEN RAISE EXCEPTION 'staff_auth_busy' USING ERRCODE='PT409'; END IF;
 IF p_action IN ('lock','reset') AND EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=old.id AND role_code='ADMIN') AND NOT pawpal_private.other_available_admin(old.id) THEN RAISE EXCEPTION 'staff_last_admin_required' USING ERRCODE='22023'; END IF;
 UPDATE public.staff SET must_change_password=CASE WHEN p_action='reset' THEN true ELSE must_change_password END,
 employment_status=CASE WHEN p_action='unlock' AND lower(employment_status)='active' THEN 'active' ELSE employment_status END,updated_at=clock_timestamp() WHERE id=old.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'STAFF_AUTH_PENDING','staff',p_request_id,payload);
 RETURN jsonb_build_object('auth_user_id',old.auth_user_id,'done',false);
END $$;

CREATE OR REPLACE FUNCTION public.finish_admin_staff_auth_action(p_actor_auth_id uuid,p_request_id uuid,p_success boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; pending public.audit_log; target public.staff; action_value text; event_name text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'staff_auth_server_only' USING ERRCODE='42501'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=p_actor_auth_id;
 PERFORM pg_advisory_xact_lock(hashtextextended('staff-access-admin-guard',31));
 SELECT * INTO pending FROM public.audit_log WHERE action='STAFF_AUTH_PENDING' AND entity_id=p_request_id;
 IF NOT FOUND OR actor IS NULL OR pending.staff_id IS DISTINCT FROM actor OR p_success IS NULL THEN RAISE EXCEPTION 'staff_auth_request_not_found' USING ERRCODE='42501'; END IF;
 event_name:=CASE WHEN p_success THEN 'STAFF_AUTH_DONE' ELSE 'STAFF_AUTH_FAILED' END;
 IF EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_request_id AND action=event_name) THEN RETURN p_request_id; END IF;
 IF EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_request_id AND action IN ('STAFF_AUTH_DONE','STAFF_AUTH_FAILED')) THEN RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409'; END IF;
 SELECT * INTO target FROM public.staff WHERE id=(pending.description::jsonb->>'staff_id')::uuid FOR UPDATE;
 action_value:=pending.description::jsonb->>'action';
 IF p_success AND action_value IN ('lock','unlock') AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target.auth_user_id AND coalesce(banned_until>now(),false)=(action_value='lock')) THEN RAISE EXCEPTION 'staff_auth_state_unconfirmed' USING ERRCODE='PT409'; END IF;
 IF p_success THEN UPDATE public.staff SET must_change_password=CASE WHEN action_value='reset' THEN true ELSE must_change_password END,updated_at=clock_timestamp() WHERE id=target.id; END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,event_name,'staff',p_request_id,jsonb_build_object('staff_id',target.id,'action',action_value)::text);
 RETURN p_request_id;
END $$;
REVOKE ALL ON FUNCTION public.begin_admin_staff_auth_action(uuid,uuid,uuid,timestamptz,text,text),public.finish_admin_staff_auth_action(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.begin_admin_staff_auth_action(uuid,uuid,uuid,timestamptz,text,text),public.finish_admin_staff_auth_action(uuid,uuid,boolean) TO service_role;
CREATE OR REPLACE FUNCTION public.finish_admin_staff_provision(p_actor_auth_id uuid,p_request_id uuid,p_staff_id uuid,p_fingerprint text,p_enable_login boolean)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; creation public.audit_log; prior public.audit_log; payload text;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'staff_auth_server_only' USING ERRCODE='42501'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=p_actor_auth_id;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,334));
 SELECT * INTO creation FROM public.audit_log WHERE action='STAFF_PROFILE_CREATE' AND entity_id=p_request_id;
 IF NOT FOUND OR actor IS NULL OR creation.staff_id IS DISTINCT FROM actor OR creation.description::jsonb->>'staff_id' IS DISTINCT FROM p_staff_id::text
 OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{64}$' OR p_enable_login IS NULL THEN RAISE EXCEPTION 'staff_auth_request_not_found' USING ERRCODE='42501'; END IF;
 payload:=jsonb_build_object('staff_id',p_staff_id,'fingerprint',p_fingerprint,'enable_login',p_enable_login)::text;
 SELECT * INTO prior FROM public.audit_log WHERE action='STAFF_PROVISION_DONE' AND entity_id=p_request_id;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'staff_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_staff_id;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id WHERE s.id=p_staff_id AND coalesce(u.banned_until>now(),false)=NOT p_enable_login) THEN RAISE EXCEPTION 'staff_auth_state_unconfirmed' USING ERRCODE='PT409'; END IF;
 UPDATE public.staff SET updated_at=clock_timestamp() WHERE id=p_staff_id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'STAFF_PROVISION_DONE','staff',p_request_id,payload);
 RETURN p_staff_id;
END $$;
REVOKE ALL ON FUNCTION public.finish_admin_staff_provision(uuid,uuid,uuid,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_admin_staff_provision(uuid,uuid,uuid,text,boolean) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
