BEGIN;
DROP FUNCTION IF EXISTS public.run_admin_stage3_read(uuid,text,jsonb,integer);
NOTIFY pgrst,'reload schema';
COMMIT;
