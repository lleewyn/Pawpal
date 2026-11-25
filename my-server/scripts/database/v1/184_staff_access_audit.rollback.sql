BEGIN;
DO $$ DECLARE source text;
BEGIN
 SELECT definition INTO STRICT source FROM pawpal_private.v184_function_backup WHERE signature='public.set_admin_staff_access(uuid,uuid,timestamp with time zone,text[],text[],text)';
 EXECUTE source;
END $$;
DROP TABLE pawpal_private.v184_function_backup;
-- Keep immutable evidence already written while 184 was active.
NOTIFY pgrst,'reload schema';
COMMIT;
