BEGIN;
DROP FUNCTION IF EXISTS public.confirm_booking_staff_with_schedule(uuid,timestamptz,uuid,timestamptz,timestamptz);
NOTIFY pgrst,'reload schema';
COMMIT;
