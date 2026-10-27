-- Stop guest booking writers first. Retain all customer/pet/booking/audit data.
BEGIN;
SET LOCAL lock_timeout='3s';
DROP FUNCTION public.guest_booking_receipt(text,uuid);
DROP FUNCTION public.guest_booking_create(text,uuid,text,jsonb);
DROP FUNCTION public.guest_booking_quote(text,jsonb);
DROP FUNCTION pawpal_private.require_guest_booking_session(text);
DROP FUNCTION pawpal_private.guest_booking_quote_core(uuid,jsonb);
DROP FUNCTION pawpal_private.guest_booking_availability(uuid,jsonb);
COMMIT;
