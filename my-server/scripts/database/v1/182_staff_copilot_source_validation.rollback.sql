BEGIN;
DROP FUNCTION public.validate_staff_copilot_request(uuid,jsonb);
NOTIFY pgrst,'reload schema';
COMMIT;
