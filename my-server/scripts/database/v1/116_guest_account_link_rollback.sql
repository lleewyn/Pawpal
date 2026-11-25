-- Stop optional guest-link requests first. Retain legitimate linked identities and history.
BEGIN;
SET LOCAL lock_timeout='3s';
DROP FUNCTION public.complete_guest_customer_auth(text,uuid,text,text);
COMMIT;
