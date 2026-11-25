BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.require_staff_phone()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='INSERT' OR NEW.phone_number IS DISTINCT FROM OLD.phone_number THEN
  NEW.phone_number:=regexp_replace(btrim(NEW.phone_number),'^\+84([0-9]{9})$','0\1');
  IF NEW.phone_number IS NULL OR NEW.phone_number !~ '^0[0-9]{9}$' THEN
   RAISE EXCEPTION 'invalid_staff_phone' USING ERRCODE='22023';
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.require_staff_phone() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS require_staff_phone ON public.staff;
CREATE TRIGGER require_staff_phone BEFORE INSERT OR UPDATE OF phone_number ON public.staff
FOR EACH ROW EXECUTE FUNCTION pawpal_private.require_staff_phone();
NOTIFY pgrst,'reload schema';
COMMIT;
