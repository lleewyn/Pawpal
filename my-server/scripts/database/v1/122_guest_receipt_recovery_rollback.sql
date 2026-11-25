BEGIN;
DROP FUNCTION public.guest_booking_recover(uuid);
DROP FUNCTION public.guest_sales_recover(uuid);
NOTIFY pgrst,'reload schema';
COMMIT;
