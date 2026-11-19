BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.validate_staff_name()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.full_name IS DISTINCT FROM OLD.full_name THEN
  NEW.full_name:=normalize(btrim(regexp_replace(NEW.full_name,'[[:space:]]+',' ','g')),NFC);
  IF NEW.full_name IS NULL OR length(NEW.full_name) NOT BETWEEN 2 AND 200
    OR NEW.full_name !~ '^[[:alpha:] ]+$' THEN
   RAISE EXCEPTION 'invalid_staff_name' USING ERRCODE='22023';
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.validate_staff_name() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
