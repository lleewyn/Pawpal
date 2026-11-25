BEGIN;
DROP FUNCTION public.get_staff_sales_receipt(uuid);
NOTIFY pgrst,'reload schema';
COMMIT;
