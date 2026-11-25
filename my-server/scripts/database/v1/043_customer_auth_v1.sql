-- ====================================================================
-- MIGRATION 043: CUSTOMER AUTHENTICATION & VERIFICATION CONTRACT (V1)
-- Chuẩn hóa xác thực khách hàng theo mô hình 3NF V1:
-- - Liên kết auth.users với public.customer qua customer_phone
-- - Tích hợp bảng lưu OTP và Rate limit serverless trong pawpal_private
-- - Khởi tạo điểm chào mừng vào sổ cái paw_point_transaction
-- ====================================================================

BEGIN;

-- 1. Bảng lưu trữ nội bộ cho Rate limit và Thử thách OTP (pawpal_private)
CREATE SCHEMA IF NOT EXISTS pawpal_private;

CREATE TABLE IF NOT EXISTS pawpal_private.auth_rate_limits (
    key text PRIMARY KEY,
    count integer NOT NULL,
    expires_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS pawpal_private.auth_challenges (
    id uuid PRIMARY KEY,
    phone text NOT NULL,
    purpose text NOT NULL CHECK (purpose IN ('register', 'reset', 'activate')),
    mode text NOT NULL CHECK (mode IN ('supabase', 'preview', 'console', 'demo')),
    otp_hash text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'claimed', 'used', 'failed')),
    attempts integer NOT NULL DEFAULT 0,
    expires_at timestamptz NOT NULL,
    claim_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS auth_challenges_phone_idx ON pawpal_private.auth_challenges(phone);
CREATE INDEX IF NOT EXISTS auth_challenges_expiry_idx ON pawpal_private.auth_challenges(expires_at);
CREATE INDEX IF NOT EXISTS auth_rate_limits_expiry_idx ON pawpal_private.auth_rate_limits(expires_at);

REVOKE ALL ON pawpal_private.auth_rate_limits, pawpal_private.auth_challenges FROM PUBLIC, anon, authenticated;
GRANT ALL ON pawpal_private.auth_rate_limits, pawpal_private.auth_challenges TO service_role;

-- 2. Hàm Rate Limit Serverless
CREATE OR REPLACE FUNCTION public.customer_auth_rate_limit(p_key text, p_max integer, p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attempts integer;
BEGIN
    DELETE FROM pawpal_private.auth_rate_limits WHERE expires_at <= now();
    INSERT INTO pawpal_private.auth_rate_limits AS r(key, count, expires_at)
    VALUES (p_key, 1, now() + make_interval(secs => p_window_seconds))
    ON CONFLICT (key) DO UPDATE SET count = r.count + 1
    RETURNING count INTO attempts;
    RETURN attempts <= p_max;
END $$;

-- 3. Hàm Phát hành OTP Challenge
CREATE OR REPLACE FUNCTION public.customer_auth_issue_challenge(p_id uuid, p_phone text, p_purpose text, p_mode text, p_hash text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_phone, 1));
    DELETE FROM pawpal_private.auth_challenges WHERE expires_at <= now();
    UPDATE pawpal_private.auth_challenges SET status = 'used', claim_id = NULL WHERE phone = p_phone;
    INSERT INTO pawpal_private.auth_challenges(id, phone, purpose, mode, otp_hash, expires_at)
    VALUES (p_id, p_phone, p_purpose, p_mode, p_hash, now() + interval '5 minutes');
END $$;

-- 4. Hàm Kích hoạt Challenge
CREATE OR REPLACE FUNCTION public.customer_auth_activate_challenge(p_id uuid, p_success boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    UPDATE pawpal_private.auth_challenges SET status = CASE WHEN p_success THEN 'active' ELSE 'failed' END
    WHERE id = p_id AND status = 'pending' AND expires_at > now();
    RETURN FOUND;
END $$;

-- 5. Hàm Xác minh Claim OTP Challenge
CREATE OR REPLACE FUNCTION public.customer_auth_claim_challenge(p_id uuid, p_mode text, p_hash text, p_claim uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c pawpal_private.auth_challenges%ROWTYPE;
BEGIN
    SELECT * INTO c FROM pawpal_private.auth_challenges WHERE id = p_id FOR UPDATE;
    IF NOT FOUND OR c.status <> 'active' OR c.expires_at <= now() OR c.attempts >= 5 OR c.mode <> p_mode THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'expired');
    END IF;
    UPDATE pawpal_private.auth_challenges SET attempts = attempts + 1 WHERE id = p_id;
    IF c.mode <> 'supabase' AND (p_hash IS NULL OR c.otp_hash IS DISTINCT FROM p_hash) THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
    END IF;
    UPDATE pawpal_private.auth_challenges SET status = 'claimed', claim_id = p_claim WHERE id = p_id;
    RETURN jsonb_build_object('ok', true, 'phone', c.phone, 'purpose', c.purpose);
END $$;

-- 6. Hàm Hoàn tất Challenge
CREATE OR REPLACE FUNCTION public.customer_auth_finish_challenge(p_id uuid, p_claim uuid, p_verified boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    UPDATE pawpal_private.auth_challenges SET status = CASE WHEN p_verified THEN 'used' ELSE 'active' END, claim_id = NULL
    WHERE id = p_id AND status = 'claimed' AND claim_id = p_claim;
    RETURN FOUND;
END $$;

-- 7. Hàm Kiểm tra Readiness của Dịch vụ Xác thực
CREATE OR REPLACE FUNCTION public.customer_auth_serverless_ready() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ SELECT true $$;

-- 8. Hàm Tìm ID Auth của Khách theo Số điện thoại
CREATE OR REPLACE FUNCTION public.find_customer_auth_user(p_phone text) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT id FROM auth.users 
    WHERE replace(replace(phone, '+', ''), ' ', '') = '84' || substring(p_phone FROM 2)
       OR phone = p_phone
    LIMIT 1;
$$;

-- 9. Hàm Hoàn tất Đăng ký / Liên kết Khách hàng Chuẩn V1 (complete_customer_auth)
CREATE OR REPLACE FUNCTION public.complete_customer_auth(p_auth_id uuid, p_phone text, p_name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_customer_id uuid;
    v_tier_id uuid;
    v_clean_phone text := btrim(p_phone);
    v_clean_name text := nullif(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), '');
    v_current_status text;
    v_existing_auth_id uuid;
BEGIN
    -- Khóa theo số điện thoại chống tranh chấp ghi đồng thời
    PERFORM pg_advisory_xact_lock(hashtextextended(v_clean_phone, 0));

    -- Kiểm tra Auth ID có tồn tại trong auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_auth_id) THEN
        RAISE EXCEPTION 'Tài khoản đăng nhập không tồn tại.';
    END IF;

    -- Chặn tài khoản nhân sự
    IF EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = p_auth_id OR phone_number = v_clean_phone) THEN
        RAISE EXCEPTION 'Không được kích hoạt tài khoản nhân sự tại cổng khách hàng.';
    END IF;

    -- Tra cứu xem số điện thoại này đã tồn tại trong customer_phone chưa
    SELECT cp.customer_id, c.customer_status, c.auth_user_id 
    INTO v_customer_id, v_current_status, v_existing_auth_id
    FROM public.customer_phone cp
    JOIN public.customer c ON c.id = cp.customer_id
    WHERE cp.phone_number = v_clean_phone
    LIMIT 1
    FOR UPDATE OF c;

    IF FOUND THEN
        -- Khách hàng đã có hồ sơ tại quầy hoặc trước đó
        IF v_current_status = 'locked' OR v_current_status = 'LOCKED' OR v_current_status = 'da_khoa' THEN
            RAISE EXCEPTION 'Tài khoản này đã bị khóa. Vui lòng liên hệ CSKH.';
        END IF;

        IF v_existing_auth_id IS NOT NULL AND v_existing_auth_id <> p_auth_id THEN
            RAISE EXCEPTION 'Số điện thoại này đã được liên kết với một tài khoản khác.';
        END IF;

        -- Cập nhật liên kết auth_user_id vào customer
        UPDATE public.customer 
        SET auth_user_id = p_auth_id,
            customer_status = 'active',
            updated_at = now()
        WHERE id = v_customer_id;

        -- Xác nhận số điện thoại
        UPDATE public.customer_phone 
        SET verified_at = coalesce(verified_at, now()),
            updated_at = now()
        WHERE customer_id = v_customer_id AND phone_number = v_clean_phone;

        -- Cập nhật họ tên nếu có
        IF v_clean_name IS NOT NULL THEN
            UPDATE public.customer_profile 
            SET full_name = v_clean_name, updated_at = now() 
            WHERE customer_id = v_customer_id;

            IF NOT FOUND THEN
                INSERT INTO public.customer_profile (customer_id, full_name)
                VALUES (v_customer_id, v_clean_name);
            END IF;
        END IF;
    ELSE
        -- Khách hàng mới hoàn toàn, đăng ký qua cổng online
        IF v_clean_name IS NULL THEN
            RAISE EXCEPTION 'Vui lòng cung cấp họ và tên để hoàn tất đăng ký.';
        END IF;

        v_customer_id := gen_random_uuid();

        INSERT INTO public.customer (id, customer_code, customer_status, auth_user_id, note)
        VALUES (
            v_customer_id,
            'CUS-' || upper(replace(v_customer_id::text, '-', '')),
            'active',
            p_auth_id,
            'Đăng ký trực tuyến qua Cổng Khách hàng.'
        );

        INSERT INTO public.customer_profile (customer_id, full_name)
        VALUES (v_customer_id, v_clean_name);

        INSERT INTO public.customer_phone (customer_id, phone_number, is_primary, verified_at)
        VALUES (v_customer_id, v_clean_phone, true, now());

        -- Gán hạng thành viên Đồng ban đầu
        SELECT id INTO v_tier_id 
        FROM public.membership_tier 
        WHERE is_active AND minimum_expenditure = 0 
        ORDER BY id LIMIT 1;

        IF v_tier_id IS NOT NULL THEN
            INSERT INTO public.customer_membership (customer_id, membership_tier_id)
            VALUES (v_customer_id, v_tier_id);
        END IF;

        -- Tặng 50 điểm chào mừng vào sổ cái paw_point_transaction
        INSERT INTO public.paw_point_transaction (customer_id, points, balance_after, description)
        VALUES (v_customer_id, 50, 50, 'Thưởng thành viên mới đăng ký tài khoản');
    END IF;

    RETURN v_customer_id;
END $$;

-- 10. Hàm Tạo hoặc Lấy Hồ Sơ Khách Vãng Lai (ensure_guest_customer)
CREATE OR REPLACE FUNCTION public.ensure_guest_customer(p_phone text, p_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_customer_id uuid;
    v_clean_phone text := btrim(p_phone);
    v_clean_name text := nullif(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), '');
    v_tier_id uuid;
BEGIN
    IF v_clean_phone !~ '^0[0-9]{9}$' THEN
        RAISE EXCEPTION 'Số điện thoại không hợp lệ.';
    END IF;
    IF v_clean_name IS NULL THEN
        RAISE EXCEPTION 'Họ và tên không hợp lệ.';
    END IF;

    -- Khóa chống tranh chấp
    PERFORM pg_advisory_xact_lock(hashtextextended(v_clean_phone, 2));

    -- Kiểm tra nếu đã có khách với số này
    SELECT customer_id INTO v_customer_id
    FROM public.customer_phone
    WHERE phone_number = v_clean_phone
    LIMIT 1;

    IF FOUND THEN
        RETURN v_customer_id;
    END IF;

    -- Tạo hồ sơ khách vãng lai (auth_user_id IS NULL)
    v_customer_id := gen_random_uuid();
    INSERT INTO public.customer (id, customer_code, customer_status, note)
    VALUES (
        v_customer_id,
        'GUEST-' || upper(replace(v_customer_id::text, '-', '')),
        'active',
        'Khách vãng lai đặt dịch vụ/mua hàng.'
    );

    INSERT INTO public.customer_profile (customer_id, full_name)
    VALUES (v_customer_id, v_clean_name);

    INSERT INTO public.customer_phone (customer_id, phone_number, is_primary)
    VALUES (v_customer_id, v_clean_phone, true);

    SELECT id INTO v_tier_id 
    FROM public.membership_tier 
    WHERE is_active AND minimum_expenditure = 0 
    ORDER BY id LIMIT 1;

    IF v_tier_id IS NOT NULL THEN
        INSERT INTO public.customer_membership (customer_id, membership_tier_id)
        VALUES (v_customer_id, v_tier_id);
    END IF;

    RETURN v_customer_id;
END $$;

-- 11. Cấp Quyền Bảo Mật Thực Thi (Chỉ service_role được thực thi)
REVOKE ALL ON FUNCTION public.customer_auth_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_auth_issue_challenge(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_auth_activate_challenge(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_auth_claim_challenge(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_auth_finish_challenge(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_auth_serverless_ready() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.find_customer_auth_user(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_customer_auth(uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_guest_customer(text, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.customer_auth_rate_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_auth_issue_challenge(uuid, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_auth_activate_challenge(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_auth_claim_challenge(uuid, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_auth_finish_challenge(uuid, uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_auth_serverless_ready() TO service_role;
GRANT EXECUTE ON FUNCTION public.find_customer_auth_user(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_customer_auth(uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ensure_guest_customer(text, text) TO service_role;

COMMIT;

NOTIFY pgrst, 'reload schema';
