BEGIN;
SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='1s';
DROP FUNCTION IF EXISTS public.read_member_chat_context(jsonb);
DROP FUNCTION IF EXISTS pawpal_private.member_chat_totals(text,uuid[]);
DROP FUNCTION IF EXISTS pawpal_private.admit_member_chat_read();
NOTIFY pgrst,'reload schema';
COMMIT;
