BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.guard_staff_phone_duplicate()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE phone text;
BEGIN
 IF TG_OP='UPDATE' AND NEW.phone_number IS NOT DISTINCT FROM OLD.phone_number AND NEW.employment_status IS NOT DISTINCT FROM OLD.employment_status THEN RETURN NEW; END IF;
 IF lower(NEW.employment_status) NOT IN ('active','leave','paused') THEN RETURN NEW; END IF;
 phone:=regexp_replace(btrim(NEW.phone_number),'^\+84([0-9]{9})$','0\1');
 IF phone IS NULL THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('staff-phone:'||phone,130));
 IF EXISTS(SELECT 1 FROM public.staff s WHERE s.id<>NEW.id AND lower(s.employment_status) IN ('active','leave','paused')
  AND regexp_replace(btrim(s.phone_number),'^\+84([0-9]{9})$','0\1')=phone) THEN
  RAISE EXCEPTION 'duplicate_staff_phone' USING ERRCODE='PT409';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_staff_phone_duplicate() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS staff_phone_duplicate ON public.staff;
CREATE TRIGGER staff_phone_duplicate BEFORE INSERT OR UPDATE OF phone_number,employment_status ON public.staff
FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_staff_phone_duplicate();
NOTIFY pgrst,'reload schema';
COMMIT;
