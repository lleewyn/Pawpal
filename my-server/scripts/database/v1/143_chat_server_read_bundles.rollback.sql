BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='5s';
DROP FUNCTION public.read_public_chat_rules();
DROP FUNCTION public.read_public_chat_context(uuid);
DROP FUNCTION public.read_admin_chat_benchmark_snapshot();
DROP FUNCTION pawpal_private.admit_chat_server_read();
NOTIFY pgrst,'reload schema';
COMMIT;
