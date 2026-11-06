BEGIN;
DO $$ DECLARE entry record;
BEGIN
 FOR entry IN SELECT definition FROM pawpal_private.v186_function_backup LOOP EXECUTE entry.definition; END LOOP;
END $$;
DROP TABLE pawpal_private.v186_function_backup;
NOTIFY pgrst,'reload schema';
COMMIT;
