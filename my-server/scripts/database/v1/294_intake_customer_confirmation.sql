BEGIN;

CREATE FUNCTION pawpal_private.require_intake_customer_confirmation() RETURNS trigger
LANGUAGE plpgsql
SET search_path TO pg_catalog
AS $function$
BEGIN
 IF NEW.record_type = 'intake' AND NEW.customer_confirmation_status IS DISTINCT FROM 'confirmed' THEN
  RAISE EXCEPTION 'intake_customer_confirmation_required' USING ERRCODE = '22023';
 END IF;
 RETURN NEW;
END;
$function$;

CREATE TRIGGER require_intake_customer_confirmation
BEFORE INSERT OR UPDATE OF record_type, customer_confirmation_status ON public.appointment_record
FOR EACH ROW EXECUTE FUNCTION pawpal_private.require_intake_customer_confirmation();

COMMIT;
