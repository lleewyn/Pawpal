-- Restore previous browser code before removing its new read RPCs.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='5s';
DROP FUNCTION public.admin_chat_rule_page_bounded(text,jsonb,integer);
DROP FUNCTION public.admin_chat_rule_counts(text[]);
DROP FUNCTION public.admin_chat_canned_page(text,text,integer);
DROP FUNCTION pawpal_private.admit_chat_rule_read(text);
NOTIFY pgrst,'reload schema';
COMMIT;
