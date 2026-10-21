-- Existing Admin lock/unlock actions write da_khoa/tam_khoa.
BEGIN;
ALTER TABLE public.customer DROP CONSTRAINT IF EXISTS customer_account_status_check;
ALTER TABLE public.customer ADD CONSTRAINT customer_account_status_check CHECK (
 account_status IN ('ACTIVE','LOCKED','INACTIVE','dang_hoat_dong','bi_khoa','ngung_hoat_dong','tam_khoa','da_khoa')
);
INSERT INTO pawpal_private.bootstrap_version(version) VALUES('003_customer_status_compatibility') ON CONFLICT DO NOTHING;
NOTIFY pgrst,'reload schema';
COMMIT;
