BEGIN;
DROP FUNCTION public.read_staff_copilot(text,jsonb,integer);
NOTIFY pgrst,'reload schema';
COMMIT;
