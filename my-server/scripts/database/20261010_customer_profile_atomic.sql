BEGIN;
ALTER TABLE public.customer_address ADD COLUMN IF NOT EXISTS district text NOT NULL DEFAULT '';
ALTER TABLE public.customer_address ADD COLUMN IF NOT EXISTS ward text NOT NULL DEFAULT '';

CREATE OR REPLACE FUNCTION public.customer_profile_snapshot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c public.customer%ROWTYPE; p jsonb; a jsonb; result jsonb;
BEGIN
    SELECT * INTO c FROM public.customer WHERE auth_user_id = auth.uid()
        AND account_status = 'ACTIVE' AND NOT is_temporary;
    IF NOT FOUND THEN RAISE EXCEPTION 'Phiên khách hàng không hợp lệ'; END IF;
    IF EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid() OR phone_number = c.phone_main) THEN
        RAISE EXCEPTION 'Tài khoản nhân sự không thuộc cổng khách hàng';
    END IF;
    SELECT to_jsonb(cp) INTO p FROM public.customer_profile cp WHERE customer_id = c.id;
    SELECT coalesce(jsonb_agg(to_jsonb(ca) ORDER BY ca.id), '[]'::jsonb) INTO a
        FROM public.customer_address ca WHERE customer_id = c.id;
    result := jsonb_build_object('id', c.id, 'phone', c.phone_main, 'email', c.email,
        'name', p->>'full_name', 'addresses', a);
    RETURN result || jsonb_build_object('revision', md5(result::text));
END $$;

CREATE OR REPLACE FUNCTION public.customer_profile_save(p_name text, p_email text, p_addresses jsonb, p_revision text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE c public.customer%ROWTYPE; a jsonb; aid uuid; kept uuid[] := ARRAY[]::uuid[];
BEGIN
    SELECT * INTO c FROM public.customer WHERE auth_user_id = auth.uid()
        AND account_status = 'ACTIVE' AND NOT is_temporary FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Phiên khách hàng không hợp lệ'; END IF;
    IF public.customer_profile_snapshot()->>'revision' IS DISTINCT FROM p_revision THEN
        RAISE EXCEPTION 'Hồ sơ đã thay đổi. Vui lòng tải lại trước khi lưu';
    END IF;
    IF length(trim(coalesce(p_name, ''))) NOT BETWEEN 1 AND 150 OR length(coalesce(p_email, '')) > 254 THEN
        RAISE EXCEPTION 'Thông tin cá nhân không hợp lệ';
    END IF;
    IF p_addresses IS NULL OR jsonb_typeof(p_addresses) <> 'array' THEN RAISE EXCEPTION 'Sổ địa chỉ không hợp lệ'; END IF;
    IF jsonb_array_length(p_addresses) > 20 THEN RAISE EXCEPTION 'Chỉ lưu tối đa 20 địa chỉ'; END IF;
    IF jsonb_array_length(p_addresses) > 0 AND
        (SELECT count(*) FROM jsonb_array_elements(p_addresses) x WHERE x->>'is_default' = 'true') <> 1 THEN
        RAISE EXCEPTION 'Cần chọn đúng một địa chỉ mặc định';
    END IF;
    UPDATE public.customer SET email = nullif(trim(p_email), '') WHERE id = c.id;
    UPDATE public.customer_profile SET full_name = trim(p_name) WHERE customer_id = c.id;
    IF NOT FOUND THEN INSERT INTO public.customer_profile(customer_id, full_name) VALUES(c.id, trim(p_name)); END IF;
    UPDATE public.customer_address SET is_default = false WHERE customer_id = c.id AND is_default;
    FOR a IN SELECT * FROM jsonb_array_elements(p_addresses) LOOP
        IF length(trim(coalesce(a->>'street_address', ''))) NOT BETWEEN 1 AND 1000 THEN
            RAISE EXCEPTION 'Địa chỉ không hợp lệ';
        END IF;
        aid := nullif(a->>'id', '')::uuid;
        IF aid IS NOT NULL THEN
            IF aid = ANY(kept) THEN RAISE EXCEPTION 'Địa chỉ bị trùng'; END IF;
            PERFORM 1 FROM public.customer_address WHERE id = aid AND customer_id = c.id FOR UPDATE;
            IF NOT FOUND THEN RAISE EXCEPTION 'Địa chỉ không thuộc tài khoản'; END IF;
            UPDATE public.customer_address SET street_address = trim(a->>'street_address'),
                province = coalesce(a->>'province', ''), district = coalesce(a->>'district', ''),
                ward = coalesce(a->>'ward', ''), is_default = (a->>'is_default')::boolean
                WHERE id = aid AND customer_id = c.id;
        ELSE
            INSERT INTO public.customer_address(customer_id, receiver_name, receiver_phone, street_address, province, district, ward, is_default)
            VALUES(c.id, trim(p_name), c.phone_main, trim(a->>'street_address'), coalesce(a->>'province', ''),
                coalesce(a->>'district', ''), coalesce(a->>'ward', ''), (a->>'is_default')::boolean) RETURNING id INTO aid;
        END IF;
        kept := array_append(kept, aid);
    END LOOP;
    DELETE FROM public.customer_address WHERE customer_id = c.id AND NOT (id = ANY(kept));
    RETURN public.customer_profile_snapshot();
END $$;
REVOKE ALL ON FUNCTION public.customer_profile_snapshot() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.customer_profile_save(text, text, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_profile_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.customer_profile_save(text, text, jsonb, text) TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';
