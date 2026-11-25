BEGIN;SET LOCAL lock_timeout='1s';SET LOCAL statement_timeout='5s';
DROP FUNCTION IF EXISTS public.run_admin_chat_logistics(uuid,text,jsonb,integer);
NOTIFY pgrst,'reload schema';COMMIT;
