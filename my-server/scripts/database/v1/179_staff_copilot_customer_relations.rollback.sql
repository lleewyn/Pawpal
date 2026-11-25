BEGIN;
DROP FUNCTION public.read_staff_copilot_relations(text,jsonb,integer);
NOTIFY pgrst,'reload schema';
COMMIT;
