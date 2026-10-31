BEGIN;
SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='1s';
DROP FUNCTION IF EXISTS public.read_member_chat_details(jsonb);
NOTIFY pgrst,'reload schema';
COMMIT;
