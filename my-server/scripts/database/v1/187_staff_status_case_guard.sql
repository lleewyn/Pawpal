-- Cutover prerequisite: case-only normalization is not a phone or employment transition.
BEGIN;
SET LOCAL lock_timeout='2s';
CREATE TABLE pawpal_private.v187_function_backup(definition text NOT NULL);
REVOKE ALL ON pawpal_private.v187_function_backup FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE source text; needle text;
BEGIN
 SELECT pg_get_functiondef('pawpal_private.guard_staff_phone_duplicate()'::regprocedure) INTO source;
 needle:='NEW.employment_status IS NOT DISTINCT FROM OLD.employment_status';
 IF strpos(source,needle)=0 THEN RAISE EXCEPTION 'unexpected_staff_phone_guard'; END IF;
 INSERT INTO pawpal_private.v187_function_backup VALUES(source);
 EXECUTE replace(source,needle,'lower(NEW.employment_status) IS NOT DISTINCT FROM lower(OLD.employment_status)');
END $$;
COMMIT;
