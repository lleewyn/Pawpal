BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='5s';
DROP FUNCTION public.read_admin_chat_raw_bounded(uuid);
DROP FUNCTION public.get_admin_chat_handlers_bounded();
DROP FUNCTION public.get_admin_chat_point_policies();
DROP FUNCTION pawpal_private.admit_chat_aux_read(text);
NOTIFY pgrst,'reload schema';
COMMIT;
