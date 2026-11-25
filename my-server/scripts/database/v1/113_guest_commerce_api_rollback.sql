-- Stop guest API writers first. Remove only API functions; retain all business data.
BEGIN;
SET LOCAL lock_timeout='3s';
DROP FUNCTION public.guest_commerce_context(text,integer);
DROP FUNCTION public.guest_commerce_save_pet(text,timestamptz,uuid,text,text,jsonb);
DROP FUNCTION public.guest_commerce_end(text);
COMMIT;
