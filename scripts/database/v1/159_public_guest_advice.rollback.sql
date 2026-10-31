-- Restore compatible API before removing these additive public-read functions.
BEGIN;
SET LOCAL lock_timeout='1s'; SET LOCAL statement_timeout='5s';
DROP FUNCTION public.read_public_guest_seed(uuid);
DROP FUNCTION public.read_public_guest_advice(jsonb);
NOTIFY pgrst,'reload schema';
COMMIT;
