-- Restore the previous API/widget first. Original public operations are untouched.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='5s';
DROP FUNCTION public.read_public_chat_page(uuid,timestamptz,uuid);
DROP FUNCTION public.read_public_chat_part(uuid,uuid,integer,text);
NOTIFY pgrst,'reload schema';
COMMIT;
