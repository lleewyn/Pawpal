-- Stop commerce writers first. Refuse to discard any newly stored business data.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='12s';
LOCK TABLE public.customer,public.guest_session IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.customer WHERE unverified_contact_phone IS NOT NULL)
  OR EXISTS(SELECT 1 FROM public.guest_session WHERE purpose<>'general' OR customer_id IS NOT NULL) THEN
  RAISE EXCEPTION 'guest_commerce_data_present_preserve_and_reconcile_first' USING ERRCODE='23514';
 END IF;
END $$;
DROP TRIGGER revoke_customer_commerce_sessions ON public.customer;
DROP TRIGGER guard_guest_commerce_session ON public.guest_session;
DROP FUNCTION pawpal_private.revoke_customer_commerce_sessions();
DROP FUNCTION pawpal_private.guard_guest_commerce_session();
DROP INDEX public.guest_session_commerce_customer_idx;
ALTER TABLE public.guest_session
 DROP CONSTRAINT guest_session_commerce_scope_check,
 DROP CONSTRAINT guest_session_purpose_check,
 DROP CONSTRAINT guest_session_commerce_customer_fk,
 DROP COLUMN customer_id,
 DROP COLUMN purpose;
DROP INDEX public.customer_unverified_contact_phone_idx;
ALTER TABLE public.customer DROP CONSTRAINT customer_unverified_contact_phone_format,
 DROP COLUMN unverified_contact_phone;
COMMIT;
