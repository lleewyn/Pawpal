-- Restore the previous API/browser first, then remove only these wrappers.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='5s';
DROP FUNCTION public.admin_copilot_sessions_bounded(text,integer);
DROP FUNCTION public.admin_copilot_history_page(uuid,integer,boolean);
DROP FUNCTION public.get_admin_chat_messages_bounded(uuid,timestamptz,uuid);
DROP FUNCTION pawpal_private.admit_chat_history_read();
NOTIFY pgrst,'reload schema';
COMMIT;
