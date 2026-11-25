-- Restore the previous browser module before removing its new RPCs.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='5s';
DROP FUNCTION public.get_admin_chat_inbox_view(text,text,integer);
DROP FUNCTION public.get_admin_chat_customer_panel(uuid);
DROP FUNCTION pawpal_private.admit_chat_panel_read();
NOTIFY pgrst,'reload schema';
COMMIT;
