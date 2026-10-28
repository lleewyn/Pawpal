-- Deploy the previous API first and drain Copilot traffic before rollback.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='5s';
LOCK TABLE pawpal_private.chat_read_slot IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pawpal_private.chat_read_slot WHERE expires_at>clock_timestamp()) THEN
  RAISE EXCEPTION 'active_chat_read_leases: drain traffic and wait for expiry before rollback';
 END IF;
END $$;
DROP FUNCTION public.run_admin_chat_read(uuid,text,jsonb,integer);
DROP FUNCTION pawpal_private.admit_chat_read_source(uuid);
DROP FUNCTION public.acquire_admin_chat_read(uuid);
DROP FUNCTION public.release_admin_chat_read(uuid);
DROP TABLE pawpal_private.chat_read_slot;
NOTIFY pgrst,'reload schema';
COMMIT;
