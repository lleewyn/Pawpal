-- Complete role-change evidence without changing the existing idempotency record.
BEGIN;
SET LOCAL lock_timeout='2s';
CREATE TABLE pawpal_private.v184_function_backup(signature text PRIMARY KEY,definition text NOT NULL);
REVOKE ALL ON pawpal_private.v184_function_backup FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE signature text:='public.set_admin_staff_access(uuid,uuid,timestamp with time zone,text[],text[],text)'; source text; needle text;
BEGIN
 SELECT pg_get_functiondef(to_regprocedure(signature)) INTO source;
 needle:='DELETE FROM public.staff_role WHERE staff_id=old.id;';
 IF source IS NULL OR strpos(source,needle)=0 OR strpos(source,'prior public.audit_log;')=0 OR strpos(source,'STAFF_ACCESS_CHANGE')>0 THEN RAISE EXCEPTION 'unexpected_staff_access_definition'; END IF;
 INSERT INTO pawpal_private.v184_function_backup VALUES(signature,source);
 source:=replace(source,'prior public.audit_log;','prior public.audit_log; previous_roles text[];');
 source:=replace(source,needle,'SELECT coalesce(array_agg(role_code ORDER BY role_code),''{}''::text[]) INTO previous_roles FROM public.staff_role WHERE staff_id=old.id;'||E'\n '||needle);
 needle:='INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,''STAFF_ACCESS_SAVE'',''staff'',p_request_id,payload);';
 IF strpos(source,needle)=0 THEN RAISE EXCEPTION 'unexpected_staff_access_audit_definition'; END IF;
 source:=replace(source,needle,needle||E'\n '||'INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,''STAFF_ACCESS_CHANGE'',''staff'',p_staff_id,jsonb_build_object(''request_id'',p_request_id,''actor_auth_id'',auth.uid(),''target_staff_id'',p_staff_id,''before_roles'',previous_roles,''after_roles'',p_roles,''reason'',p_reason,''changed_at'',clock_timestamp())::text);');
 EXECUTE source;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
