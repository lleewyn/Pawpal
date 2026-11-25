-- Additive commerce identity foundation. No profile/phone/session backfill.
-- No anonymous grants, no new public RPC, no customer_phone index changes.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='12s';

ALTER TABLE public.customer
 ADD COLUMN unverified_contact_phone text,
 ADD CONSTRAINT customer_unverified_contact_phone_format
 CHECK (unverified_contact_phone IS NULL OR unverified_contact_phone ~ '^0[0-9]{9}$');
COMMENT ON COLUMN public.customer.unverified_contact_phone IS
 'Liên hệ tự khai chưa chứng minh sở hữu; không dùng để cấp quyền, hợp nhất hoặc thay số chính.';
CREATE INDEX customer_unverified_contact_phone_idx ON public.customer(unverified_contact_phone)
 WHERE unverified_contact_phone IS NOT NULL;

ALTER TABLE public.guest_session
 ADD COLUMN purpose text NOT NULL DEFAULT 'general',
 ADD COLUMN customer_id uuid,
 ADD CONSTRAINT guest_session_commerce_customer_fk FOREIGN KEY(customer_id)
 REFERENCES public.customer(id) DEFERRABLE INITIALLY IMMEDIATE,
 ADD CONSTRAINT guest_session_purpose_check CHECK(purpose IN ('general','commerce')),
 ADD CONSTRAINT guest_session_commerce_scope_check CHECK(
  (purpose='general' AND customer_id IS NULL) OR
  (purpose='commerce' AND customer_id IS NOT NULL AND expires_at<=created_at+interval '7 days'));
CREATE INDEX guest_session_commerce_customer_idx ON public.guest_session(customer_id)
 WHERE purpose='commerce';
COMMENT ON COLUMN public.guest_session.purpose IS
 'general giữ nguyên phiên chat/support; commerce dành riêng giao dịch guest, không nâng quyền token chat.';
COMMENT ON COLUMN public.guest_session.customer_id IS
 'Hồ sơ nghiệp vụ do phiên commerce tạo hợp lệ; không phân giải quyền chỉ bằng số điện thoại.';

CREATE FUNCTION pawpal_private.guard_guest_commerce_session()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.customer;
BEGIN
 IF TG_OP='UPDATE' THEN
  IF NEW.purpose IS DISTINCT FROM OLD.purpose THEN
   RAISE EXCEPTION 'guest_session_scope_immutable' USING ERRCODE='23514';
  END IF;
  IF OLD.purpose='commerce' AND (
   NEW.customer_id IS DISTINCT FROM OLD.customer_id OR
   NEW.token_hash IS DISTINCT FROM OLD.token_hash OR
   NEW.created_at IS DISTINCT FROM OLD.created_at OR
   NEW.expires_at>OLD.expires_at OR
   (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at)) THEN
   RAISE EXCEPTION 'guest_session_identity_immutable' USING ERRCODE='23514';
  END IF;
 END IF;
 IF NEW.purpose='commerce' AND
  (TG_OP='INSERT' OR (NEW.revoked_at IS NULL AND NEW.expires_at>now())) THEN
  -- Commerce APIs must lock the customer before updating an existing session.
  SELECT * INTO c FROM public.customer WHERE id=NEW.customer_id FOR UPDATE;
  IF NOT FOUND OR c.auth_user_id IS NOT NULL OR c.customer_status<>'active'
   OR c.unverified_contact_phone IS NULL THEN
   RAISE EXCEPTION 'guest_commerce_customer_required' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_guest_commerce_session() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_guest_commerce_session BEFORE INSERT OR UPDATE ON public.guest_session
 FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_guest_commerce_session();

CREATE FUNCTION pawpal_private.revoke_customer_commerce_sessions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id OR
  NEW.customer_status IS DISTINCT FROM OLD.customer_status OR
  NEW.unverified_contact_phone IS DISTINCT FROM OLD.unverified_contact_phone THEN
  UPDATE public.guest_session SET revoked_at=now()
   WHERE customer_id=NEW.id AND purpose='commerce' AND revoked_at IS NULL;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.revoke_customer_commerce_sessions() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER revoke_customer_commerce_sessions
 AFTER UPDATE OF auth_user_id,customer_status,unverified_contact_phone ON public.customer
 FOR EACH ROW EXECUTE FUNCTION pawpal_private.revoke_customer_commerce_sessions();
COMMIT;
