-- Apply before deploying the new authentication flow. No password is exposed via public.
BEGIN;
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE REFERENCES auth.users(id);
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS activation_token text;
ALTER TABLE public.customer ADD COLUMN IF NOT EXISTS activation_token_expires_at timestamptz;
CREATE SCHEMA IF NOT EXISTS pawpal_private;
REVOKE ALL ON SCHEMA pawpal_private FROM PUBLIC, anon, authenticated;
CREATE TABLE IF NOT EXISTS pawpal_private.customer_legacy_credentials (
    customer_id uuid PRIMARY KEY REFERENCES public.customer(id) ON DELETE CASCADE,
    legacy_password text NOT NULL
);
REVOKE ALL ON pawpal_private.customer_legacy_credentials FROM PUBLIC, anon, authenticated;
INSERT INTO pawpal_private.customer_legacy_credentials
SELECT id, password_hash FROM public.customer WHERE password_hash IS NOT NULL AND password_hash <> ''
ON CONFLICT (customer_id) DO NOTHING;
UPDATE public.customer SET password_hash = NULL;

CREATE OR REPLACE FUNCTION public.pawpal_is_staff() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() AND account_status = 'ACTIVE')
$$;
REVOKE ALL ON FUNCTION public.pawpal_is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pawpal_is_staff() TO anon, authenticated;

ALTER TABLE public.customer ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS customer_identity_boundary ON public.customer;
CREATE POLICY customer_identity_boundary ON public.customer AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (auth_user_id = auth.uid() OR public.pawpal_is_staff())
WITH CHECK (auth_user_id = auth.uid() OR public.pawpal_is_staff());
DROP POLICY IF EXISTS customer_read_self ON public.customer;
CREATE POLICY customer_read_self ON public.customer FOR SELECT TO authenticated USING (auth_user_id = auth.uid());
DROP POLICY IF EXISTS customer_edit_self ON public.customer;
CREATE POLICY customer_edit_self ON public.customer FOR UPDATE TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
DROP POLICY IF EXISTS customer_staff_access ON public.customer;
CREATE POLICY customer_staff_access ON public.customer FOR ALL TO authenticated USING (public.pawpal_is_staff()) WITH CHECK (public.pawpal_is_staff());

CREATE OR REPLACE FUNCTION public.guard_customer_credentials() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    IF NEW.password_hash IS NOT NULL THEN RAISE EXCEPTION 'Mật khẩu phải được quản lý qua Supabase Auth'; END IF;
    IF auth.role() IN ('anon', 'authenticated') AND (TG_OP = 'INSERT' AND NEW.auth_user_id IS NOT NULL OR TG_OP = 'UPDATE' AND NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id)
        THEN RAISE EXCEPTION 'Liên kết xác thực chỉ được thay đổi qua máy chủ'; END IF;
    IF auth.role() IN ('anon', 'authenticated') AND NOT public.pawpal_is_staff() THEN
        IF TG_OP = 'INSERT' OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id
            OR NEW.account_status IS DISTINCT FROM OLD.account_status
            OR NEW.is_temporary IS DISTINCT FROM OLD.is_temporary
            OR NEW.phone_main IS DISTINCT FROM OLD.phone_main
            OR NEW.activation_token IS DISTINCT FROM OLD.activation_token
            OR NEW.activation_token_expires_at IS DISTINCT FROM OLD.activation_token_expires_at
        THEN RAISE EXCEPTION 'Thông tin xác thực chỉ được thay đổi qua máy chủ'; END IF;
    END IF;
    RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_customer_credentials ON public.customer;
CREATE TRIGGER guard_customer_credentials BEFORE INSERT OR UPDATE ON public.customer
FOR EACH ROW EXECUTE FUNCTION public.guard_customer_credentials();

CREATE OR REPLACE FUNCTION public.complete_customer_auth(p_auth_id uuid, p_phone text, p_name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c public.customer%ROWTYPE; tier_id uuid;
BEGIN
    -- Serialize registration/activation for the same verified phone.
    PERFORM pg_advisory_xact_lock(hashtextextended(p_phone, 0));
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_auth_id AND replace(phone, '+', '') = '84' || substring(p_phone FROM 2) AND phone_confirmed_at IS NOT NULL)
        THEN RAISE EXCEPTION 'Số điện thoại chưa được xác thực'; END IF;
    IF EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = p_auth_id OR phone_number = p_phone)
        THEN RAISE EXCEPTION 'Không được kích hoạt tài khoản nhân sự tại cổng khách hàng'; END IF;
    SELECT * INTO c FROM public.customer WHERE phone_main = p_phone FOR UPDATE;
    IF FOUND THEN
        IF c.account_status = 'LOCKED' OR (c.auth_user_id IS NOT NULL AND c.auth_user_id <> p_auth_id)
            THEN RAISE EXCEPTION 'Không thể liên kết tài khoản'; END IF;
        UPDATE public.customer SET auth_user_id = p_auth_id, is_temporary = false, account_status = 'ACTIVE', password_hash = NULL,
            activation_token = NULL, activation_token_expires_at = NULL WHERE id = c.id;
        IF c.is_temporary AND p_name IS NOT NULL THEN
            UPDATE public.customer_profile SET full_name = p_name WHERE customer_id = c.id;
            IF NOT FOUND THEN INSERT INTO public.customer_profile(customer_id, full_name) VALUES (c.id, p_name); END IF;
        END IF;
    ELSE
        IF p_name IS NULL OR length(trim(p_name)) = 0 THEN RAISE EXCEPTION 'Cần đăng ký hồ sơ trước khi kích hoạt'; END IF;
        INSERT INTO public.customer(phone_main, auth_user_id, account_status, is_temporary, registered_at)
        VALUES (p_phone, p_auth_id, 'ACTIVE', false, now()) RETURNING * INTO c;
        INSERT INTO public.customer_profile(customer_id, full_name) VALUES (c.id, p_name);
    END IF;
    SELECT id INTO tier_id FROM public.membership_tier WHERE tier_name = 'Đồng' LIMIT 1;
    IF tier_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.customer_membership WHERE customer_id = c.id) THEN
        INSERT INTO public.customer_membership(customer_id, membership_tier_id, total_paw_points) VALUES (c.id, tier_id, 50);
    END IF;
    DELETE FROM pawpal_private.customer_legacy_credentials WHERE customer_id = c.id;
    RETURN c.id;
END $$;
REVOKE ALL ON FUNCTION public.complete_customer_auth(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_customer_auth(uuid, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.find_customer_auth_user(p_phone text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT id FROM auth.users WHERE replace(phone, '+', '') = '84' || substring(p_phone FROM 2) LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.find_customer_auth_user(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_customer_auth_user(text) TO service_role;

CREATE OR REPLACE FUNCTION public.customer_legacy_credentials_batch() RETURNS TABLE(customer_id uuid, phone text, legacy_password text, auth_user_id uuid)
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
    SELECT c.id, c.phone_main::text, l.legacy_password, c.auth_user_id
    FROM pawpal_private.customer_legacy_credentials l JOIN public.customer c ON c.id = l.customer_id
    WHERE NOT c.is_temporary AND c.account_status = 'ACTIVE'
$$;
REVOKE ALL ON FUNCTION public.customer_legacy_credentials_batch() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_legacy_credentials_batch() TO service_role;

CREATE OR REPLACE FUNCTION public.finish_customer_credential_migration(p_customer_id uuid, p_auth_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.customer c JOIN auth.users u ON u.id = p_auth_id
        WHERE c.id = p_customer_id AND replace(u.phone, '+', '') = '84' || substring(c.phone_main FROM 2))
        OR EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = p_auth_id)
        THEN RAISE EXCEPTION 'Không thể liên kết tài khoản'; END IF;
    UPDATE public.customer SET auth_user_id = p_auth_id WHERE id = p_customer_id AND (auth_user_id IS NULL OR auth_user_id = p_auth_id);
    IF NOT FOUND THEN RAISE EXCEPTION 'Danh tính đã được liên kết với tài khoản khác'; END IF;
    DELETE FROM pawpal_private.customer_legacy_credentials WHERE customer_id = p_customer_id;
END $$;
REVOKE ALL ON FUNCTION public.finish_customer_credential_migration(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_customer_credential_migration(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.customer_auth_ready() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ SELECT true $$;
REVOKE ALL ON FUNCTION public.customer_auth_ready() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_auth_ready() TO service_role;

CREATE OR REPLACE FUNCTION public.ensure_guest_customer(p_phone text, p_name text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE customer_id uuid;
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_phone, 0));
    SELECT id INTO customer_id FROM public.customer WHERE phone_main = p_phone;
    IF customer_id IS NOT NULL THEN RETURN customer_id; END IF;
    INSERT INTO public.customer(phone_main, account_status, is_temporary, registered_at)
    VALUES (p_phone, 'ACTIVE', true, now()) RETURNING id INTO customer_id;
    INSERT INTO public.customer_profile(customer_id, full_name) VALUES (customer_id, p_name);
    RETURN customer_id;
END $$;
REVOKE ALL ON FUNCTION public.ensure_guest_customer(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_guest_customer(text, text) TO service_role;
COMMIT;
