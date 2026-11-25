BEGIN;
DROP FUNCTION public.get_staff_service_receipt(uuid);
NOTIFY pgrst,'reload schema';
COMMIT;
