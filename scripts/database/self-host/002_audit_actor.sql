-- Local compatibility hardening: resolve audit actor from the authenticated user.
BEGIN;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pawpal_private.bootstrap_version WHERE version='001_local_core') THEN
  RAISE EXCEPTION 'Apply local core baseline first';
 END IF;
END $$;
CREATE OR REPLACE FUNCTION pawpal_private.resolve_audit_actor() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.role()='authenticated' THEN
  SELECT id INTO NEW.staff_id FROM public.staff WHERE auth_user_id=auth.uid() AND account_status='ACTIVE';
  IF NEW.staff_id IS NULL THEN RAISE EXCEPTION 'Active staff identity required' USING ERRCODE='42501'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.resolve_audit_actor() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS resolve_audit_actor ON public.audit_log;
CREATE TRIGGER resolve_audit_actor BEFORE INSERT ON public.audit_log
 FOR EACH ROW EXECUTE FUNCTION pawpal_private.resolve_audit_actor();
REVOKE UPDATE,DELETE ON public.audit_log FROM authenticated;
INSERT INTO pawpal_private.bootstrap_version(version) VALUES('002_audit_actor') ON CONFLICT DO NOTHING;
NOTIFY pgrst,'reload schema';
COMMIT;
