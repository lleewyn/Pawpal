-- Award 50 points atomically on initial registration/activation; never on password reset.
BEGIN;
CREATE OR REPLACE FUNCTION public.complete_customer_auth(p_auth_id uuid, p_phone text, p_name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
    v_customer_id uuid;
    v_tier_id uuid;
    v_clean_phone text := btrim(p_phone);
    v_clean_name text := nullif(btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g')), '');
    v_current_status text;
    v_existing_auth_id uuid;
    v_first_activation boolean := false;
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

        v_first_activation := v_existing_auth_id IS NULL;

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

        v_first_activation := true;
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
        -- Điểm chào mừng được ghi chung cho lần kích hoạt đầu bên dưới.
    END IF;

    IF v_first_activation AND NOT EXISTS (
        SELECT 1 FROM public.paw_point_transaction
        WHERE customer_id = v_customer_id AND (
            idempotency_key = 'registration-welcome:' || v_customer_id::text
            OR description = 'Thưởng thành viên mới đăng ký tài khoản'
        )
    ) THEN
        -- Customer row is locked above; use the next ledger sequence, preserving existing points.
        INSERT INTO public.paw_point_transaction (customer_id, points, description, idempotency_key, sequence_no)
        SELECT v_customer_id, 50, 'Thưởng thành viên mới đăng ký tài khoản',
            'registration-welcome:' || v_customer_id::text, coalesce(max(sequence_no), 0) + 1
        FROM public.paw_point_transaction WHERE customer_id = v_customer_id;
    END IF;

    RETURN v_customer_id;
END $$;


REVOKE ALL ON FUNCTION public.complete_customer_auth(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_customer_auth(uuid,text,text) TO service_role;
COMMIT;
