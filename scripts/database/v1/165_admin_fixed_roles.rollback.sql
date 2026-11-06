-- Immediate rollback during the deployment window. Refuses to remove assigned STAFF roles.
-- Never unlocks Auth, changes passwords or deletes business records.
BEGIN;
SET LOCAL lock_timeout='5s';
SELECT pg_advisory_xact_lock(hashtextextended('pawpal-fixed-roles-v1',165));
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pawpal_private.access_migration_backup WHERE version=165) THEN RAISE EXCEPTION 'fixed_roles_snapshot_missing'; END IF;
 IF EXISTS(SELECT 1 FROM public.staff_role WHERE role_code='STAFF') THEN RAISE EXCEPTION 'fixed_roles_rollback_review_assigned_staff'; END IF;
 IF EXISTS(SELECT 1 FROM public.staff s JOIN pawpal_private.access_migration_backup b ON b.kind='staff_status' AND b.version=165 AND b.key=s.id::text
  WHERE s.employment_status IS DISTINCT FROM CASE WHEN b.payload->>'status' IN ('ACTIVE','LEAVE','PAUSED','RESIGNED') THEN lower(b.payload->>'status') ELSE b.payload->>'status' END)
 THEN RAISE EXCEPTION 'fixed_roles_rollback_review_changed_status'; END IF;
END $$;
DO $$ DECLARE b record; grant_row jsonb; identity text; BEGIN
 FOR b IN SELECT * FROM pawpal_private.access_migration_backup WHERE version=165 AND kind='function'
 AND (regexp_replace(split_part(key,'(',1),'^.*[.]','') IN ('get_staff_login_context','set_admin_staff_access','create_admin_staff_profile','has_permission')
 OR regexp_replace(split_part(key,'(',1),'^.*[.]','') IN (SELECT name FROM pawpal_private.work_rpc_catalog)) LOOP
  EXECUTE b.payload->>'definition';
  identity:=b.key;
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated,service_role',identity);
  FOR grant_row IN SELECT value FROM jsonb_array_elements(b.payload->'acl') LOOP
   EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO %s%s',identity,
    CASE WHEN grant_row->>'grantee'='PUBLIC' THEN 'PUBLIC' ELSE quote_ident(grant_row->>'grantee') END,
    CASE WHEN (grant_row->>'grantable')::boolean THEN ' WITH GRANT OPTION' ELSE '' END);
  END LOOP;
 END LOOP;
END $$;
DO $$ DECLARE t record; b record; roles_text text; BEGIN
 FOR t IN SELECT tablename FROM pg_policies WHERE schemaname='public' AND policyname='v165_staff_boundary' LOOP
  EXECUTE format('DROP POLICY v165_staff_boundary ON public.%I',t.tablename);
 END LOOP;
 FOR b IN SELECT * FROM pawpal_private.access_migration_backup WHERE version=165 AND kind='schedule_policy' LOOP
  SELECT string_agg(quote_ident(value),',') INTO roles_text FROM jsonb_array_elements_text(b.payload->'roles');
  EXECUTE format('CREATE POLICY %I ON public.staff_schedule FOR %s TO %s USING (%s)',b.key,b.payload->>'cmd',roles_text,b.payload->>'qual');
 END LOOP;
 IF (SELECT (payload->>'schedule_anon_select')::boolean FROM pawpal_private.access_migration_backup WHERE version=165 AND kind='grants') THEN GRANT SELECT ON public.staff_schedule TO anon; END IF;
 IF (SELECT (payload->>'staff_id_update')::boolean FROM pawpal_private.access_migration_backup WHERE version=165 AND kind='grants') THEN GRANT UPDATE(id) ON public.staff TO authenticated; END IF;
END $$;
ALTER TABLE public.staff_permission DROP CONSTRAINT v165_no_personal_permission;
ALTER TABLE public.staff_role DROP CONSTRAINT v165_known_staff_role;
ALTER TABLE public.staff_role DROP CONSTRAINT v165_one_staff_role;
UPDATE public.staff s SET employment_status=b.payload->>'status' FROM pawpal_private.access_migration_backup b
WHERE b.version=165 AND b.kind='staff_status' AND b.key=s.id::text;
DELETE FROM public.role_permission WHERE permission_code LIKE 'work.%'
AND NOT EXISTS(SELECT 1 FROM pawpal_private.access_migration_backup b WHERE b.version=165 AND b.kind='role_permission' AND b.key=role_code||':'||permission_code);
DELETE FROM public.permission p WHERE code LIKE 'work.%' AND NOT EXISTS(SELECT 1 FROM pawpal_private.access_migration_backup b WHERE b.version=165 AND b.kind='permission' AND b.key=p.code);
DELETE FROM public.access_role r WHERE code='STAFF' AND NOT EXISTS(SELECT 1 FROM pawpal_private.access_migration_backup b WHERE b.version=165 AND b.kind='role' AND b.key=r.code);
UPDATE public.access_role r SET role_name=b.payload->>'role_name' FROM pawpal_private.access_migration_backup b WHERE b.version=165 AND b.kind='role' AND b.key=r.code;
DROP FUNCTION public.get_staff_workspace(text,text,uuid,integer);
DROP FUNCTION IF EXISTS public.perform_staff_service_item(uuid,timestamptz,text,text);
DROP FUNCTION pawpal_private.work_guard_rpc(text,jsonb);
DROP FUNCTION pawpal_private.work_rpc_permission(text,text);
DROP FUNCTION pawpal_private.work_owns_appointment(uuid);
DROP FUNCTION pawpal_private.work_is_staff_identity();
DROP FUNCTION pawpal_private.work_is_admin();
DROP FUNCTION pawpal_private.work_actor();
DROP TABLE pawpal_private.work_rpc_catalog;
DO $$ BEGIN
 IF NOT coalesce((SELECT (payload->>'schema_anon_usage')::boolean FROM pawpal_private.access_migration_backup WHERE version=165 AND kind='grants'),true) THEN REVOKE USAGE ON SCHEMA pawpal_private FROM anon; END IF;
 IF NOT coalesce((SELECT (payload->>'schema_authenticated_usage')::boolean FROM pawpal_private.access_migration_backup WHERE version=165 AND kind='grants'),true) THEN REVOKE USAGE ON SCHEMA pawpal_private FROM authenticated; END IF;
END $$;
DELETE FROM pawpal_private.access_migration_backup WHERE version=165;
NOTIFY pgrst,'reload schema';
COMMIT;
