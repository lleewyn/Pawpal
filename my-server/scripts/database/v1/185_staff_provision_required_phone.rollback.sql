BEGIN;
DO $$ DECLARE source text;
BEGIN
 SELECT definition INTO STRICT source FROM pawpal_private.v185_function_backup;
 EXECUTE source;
END $$;
DROP TABLE pawpal_private.v185_function_backup;
NOTIFY pgrst,'reload schema';
COMMIT;
