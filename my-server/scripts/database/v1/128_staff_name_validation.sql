BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.validate_staff_name()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.full_name IS DISTINCT FROM OLD.full_name THEN
  NEW.full_name:=btrim(regexp_replace(NEW.full_name,'[[:space:]]+',' ','g'));
  IF NEW.full_name IS NULL OR length(normalize(NEW.full_name,NFC)) NOT BETWEEN 2 AND 200
    OR NEW.full_name ~ '[[:digit:]]' THEN
   RAISE EXCEPTION 'invalid_staff_name' USING ERRCODE='22023';
  END IF;
  NEW.full_name:=btrim(NEW.full_name);
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.validate_staff_name() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS validate_staff_name ON public.staff;
CREATE TRIGGER validate_staff_name BEFORE INSERT OR UPDATE OF full_name ON public.staff
FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_staff_name();
NOTIFY pgrst,'reload schema';
COMMIT;
