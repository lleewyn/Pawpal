BEGIN;
DROP FUNCTION public.guest_booking_day_slots(text,jsonb,date);
NOTIFY pgrst,'reload schema';
COMMIT;
