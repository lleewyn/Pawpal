-- Stop guest checkout writers first. Preserve all orders/holds/payments/audit.
BEGIN;
SET LOCAL lock_timeout='3s';
DROP FUNCTION public.guest_sales_receipt(text,uuid);
DROP FUNCTION public.guest_sales_create(text,timestamptz,uuid,text,jsonb,jsonb,jsonb,uuid);
DROP FUNCTION public.guest_sales_quote(text,jsonb,jsonb);
DROP FUNCTION pawpal_private.validate_guest_sales_input(jsonb,jsonb);
DROP FUNCTION pawpal_private.create_guest_sales_core(uuid,uuid,text,jsonb,jsonb);
DROP FUNCTION pawpal_private.quote_guest_sales_core(uuid,jsonb,jsonb);
COMMIT;
