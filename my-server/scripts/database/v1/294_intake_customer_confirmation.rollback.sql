BEGIN;

DROP TRIGGER require_intake_customer_confirmation ON public.appointment_record;
DROP FUNCTION pawpal_private.require_intake_customer_confirmation();

COMMIT;
