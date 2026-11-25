BEGIN;

CREATE FUNCTION pawpal_private.booking_voucher_quote(
    p_quote jsonb, p_details jsonb, p_customer uuid, p_lock boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE
    code text := btrim(p_details->>'voucher_code');
    voucher public.voucher;
    owned_id uuid;
    subtotal numeric := (p_quote->>'total')::numeric;
    discount numeric;
    scope text := CASE p_quote->>'category'
        WHEN 'grooming_spa' THEN 'care' WHEN 'pet_hotel' THEN 'hotel' WHEN 'pet_taxi' THEN 'taxi' END;
    today date := (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
    IF NOT p_details ? 'voucher_code' THEN RETURN p_quote; END IF;
    IF p_customer IS NULL OR jsonb_typeof(p_details->'voucher_code') IS DISTINCT FROM 'string'
        OR coalesce(length(code), 0) NOT BETWEEN 1 AND 100 THEN
        RAISE EXCEPTION 'booking_voucher_not_applicable' USING ERRCODE = '22023';
    END IF;

    IF p_lock THEN
        SELECT * INTO voucher FROM public.voucher WHERE voucher_code = code FOR UPDATE;
    ELSE
        SELECT * INTO voucher FROM public.voucher WHERE voucher_code = code;
    END IF;
    IF voucher.id IS NULL OR NOT voucher.is_active OR today NOT BETWEEN voucher.start_date AND voucher.end_date
        OR scope IS NULL OR voucher.applicable_for NOT IN ('all', 'services', scope)
        OR subtotal < voucher.minimum_order_amount
        OR NOT pawpal_private.voucher_membership_allows(voucher.id, p_customer) THEN
        RAISE EXCEPTION 'booking_voucher_not_applicable' USING ERRCODE = '22023';
    END IF;
    IF voucher.max_usage IS NOT NULL AND voucher.max_usage <= (
        SELECT count(*) FROM public.voucher_redemption WHERE voucher_id = voucher.id AND status = 'applied'
    ) THEN
        RAISE EXCEPTION 'booking_voucher_exhausted' USING ERRCODE = '22023';
    END IF;
    IF p_lock THEN
        PERFORM 1 FROM public.customer_voucher
        WHERE customer_id = p_customer AND voucher_id = voucher.id ORDER BY id FOR UPDATE;
    END IF;
    SELECT id INTO owned_id FROM public.customer_voucher
    WHERE customer_id = p_customer AND voucher_id = voucher.id
        AND voucher_status = 'available' AND (expired_at IS NULL OR expired_at > now())
    ORDER BY acquired_at, id LIMIT 1;
    IF voucher.required_points > 0 AND owned_id IS NULL THEN
        RAISE EXCEPTION 'booking_owned_voucher_required' USING ERRCODE = '22023';
    END IF;

    discount := CASE voucher.type
        WHEN 'percentage' THEN least(subtotal, floor(subtotal * voucher.discount_value / 100))
        WHEN 'fixed' THEN least(subtotal, voucher.discount_value)
    END;
    IF discount IS NULL OR discount <= 0 THEN
        RAISE EXCEPTION 'booking_voucher_not_applicable' USING ERRCODE = '22023';
    END IF;
    RETURN p_quote || jsonb_build_object(
        'version', md5(jsonb_build_array(p_quote->>'version', voucher.id, voucher.updated_at, owned_id, discount)::text),
        'subtotal', subtotal, 'total', subtotal - discount, 'voucher_code', code,
        'voucher_discount', discount, 'voucher_id', voucher.id, 'customer_voucher_id', owned_id
    );
END;
$$;

CREATE FUNCTION pawpal_private.redeem_booking_voucher(p_appointment uuid, p_quote jsonb)
RETURNS void LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
    IF NOT p_quote ? 'voucher_id' THEN RETURN; END IF;
    INSERT INTO public.voucher_redemption(voucher_id, customer_voucher_id, appointment_id, discount_amount_snapshot, idempotency_key)
    VALUES ((p_quote->>'voucher_id')::uuid, (p_quote->>'customer_voucher_id')::uuid, p_appointment,
        (p_quote->>'voucher_discount')::numeric, 'booking-voucher:' || p_appointment);
    UPDATE public.customer_voucher SET voucher_status = 'used' WHERE id = (p_quote->>'customer_voucher_id')::uuid;
END;
$$;

REVOKE ALL ON FUNCTION pawpal_private.booking_voucher_quote(jsonb,jsonb,uuid,boolean),
    pawpal_private.redeem_booking_voucher(uuid,jsonb) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.quote_own_service_booking(p_details jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE quote jsonb; owner_id uuid;
BEGIN
    quote := pawpal_private.customer_new_booking_quote(p_details - 'voucher_code');
    IF NOT p_details ? 'voucher_code' THEN RETURN quote; END IF;
    SELECT id INTO owner_id FROM public.customer WHERE auth_user_id = auth.uid() AND pawpal_private.owns_customer(id);
    RETURN pawpal_private.booking_voucher_quote(quote, p_details, owner_id)
        - 'voucher_id' - 'customer_voucher_id';
END;
$$;

CREATE FUNCTION public.list_own_booking_vouchers(p_details jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
    owner_id uuid;
    base_quote jsonb;
    offer record;
    priced jsonb;
    offers jsonb := '[]'::jsonb;
BEGIN
    SELECT id INTO owner_id FROM public.customer WHERE auth_user_id = auth.uid() AND pawpal_private.owns_customer(id);
    IF owner_id IS NULL OR EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid()) THEN
        RAISE EXCEPTION 'customer_session_required' USING ERRCODE = '42501';
    END IF;
    base_quote := pawpal_private.customer_new_booking_quote(p_details - 'voucher_code');
    FOR offer IN
        SELECT v.voucher_code, v.voucher_name
        FROM public.voucher v
        WHERE EXISTS (
            SELECT 1 FROM public.customer_voucher cv
            WHERE cv.customer_id = owner_id AND cv.voucher_id = v.id
                AND cv.voucher_status = 'available' AND (cv.expired_at IS NULL OR cv.expired_at > now())
        )
        ORDER BY v.end_date, v.voucher_code
    LOOP
        BEGIN
            priced := pawpal_private.booking_voucher_quote(base_quote, jsonb_build_object('voucher_code', offer.voucher_code), owner_id);
            offers := offers || jsonb_build_array(jsonb_build_object(
                'code', offer.voucher_code, 'name', offer.voucher_name, 'discount', priced->'voucher_discount'
            ));
        EXCEPTION WHEN SQLSTATE '22023' THEN
            IF SQLERRM NOT IN ('booking_voucher_not_applicable', 'booking_voucher_exhausted', 'booking_owned_voucher_required') THEN RAISE; END IF;
        END;
    END LOOP;
    RETURN offers;
END;
$$;

REVOKE ALL ON FUNCTION public.list_own_booking_vouchers(jsonb) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.list_own_booking_vouchers(jsonb) TO authenticated;

-- Preserve the active booking engines, including their hold, request replay and staff checks.
DO $$
DECLARE source text; signature text; marker text; price_call text; target text; owner text; audit_marker text;
BEGIN
    FOREACH signature IN ARRAY ARRAY[
        'public.guest_booking_quote(text,jsonb)',
        'public.guest_booking_create(text,uuid,text,jsonb)',
        'public.create_own_service_booking(uuid,text,jsonb)'
    ] LOOP
        source := pg_get_functiondef(signature::regprocedure);
        IF signature LIKE '%create_own%' THEN
            price_call := 'pawpal_private.customer_new_booking_quote(p_details)';
            target := 'quote'; owner := 'owner_id';
        ELSE
            price_call := 'pawpal_private.guest_booking_quote_core(s.customer_id,p_details)';
            target := 'q'; owner := 's.customer_id';
            marker := '''trip_type'',''return_at''';
            IF strpos(source, marker) = 0 THEN RAISE EXCEPTION 'Unexpected guest booking field validation'; END IF;
            source := replace(source, marker, marker || ',''voucher_code''');
        END IF;
        IF strpos(source, price_call) = 0 THEN RAISE EXCEPTION 'Unexpected quote engine for %', signature; END IF;
        source := replace(source, price_call,
            'pawpal_private.booking_voucher_quote(' || replace(price_call, 'p_details)', 'p_details-''voucher_code'')')
            || ',p_details,' || owner || ',' || CASE WHEN signature LIKE '%booking_quote(%' THEN 'false' ELSE 'true' END || ')');

        IF signature LIKE '%booking_quote(%' THEN
            marker := '''total'',q->''total''';
            IF strpos(source, marker) = 0 THEN RAISE EXCEPTION 'Unexpected guest quote response'; END IF;
            source := replace(source, marker, marker || ',''subtotal'',q->''subtotal'',''voucher_code'',q->''voucher_code'',''voucher_discount'',q->''voucher_discount''');
        ELSE
            marker := 'h.details-''note''=p_details-''hold_id''-''note''';
            IF strpos(source, marker) = 0 THEN RAISE EXCEPTION 'Unexpected hold comparison for %', signature; END IF;
            source := replace(source, marker, marker || '-''voucher_code''');
            audit_marker := 'INSERT INTO public.audit_log(action,entity_name,entity_id,description)';
            IF strpos(source, audit_marker) = 0 THEN RAISE EXCEPTION 'Unexpected booking audit for %', signature; END IF;
            source := replace(source, audit_marker, format('PERFORM pawpal_private.redeem_booking_voucher(%s,%s);%s %s',
                CASE WHEN target = 'q' THEN 'p_request' ELSE 'p_id' END, target, E'\n', audit_marker));
            IF target = 'q' THEN
                marker := 'item_total IS DISTINCT FROM (q->>''total'')::numeric';
                IF strpos(source, marker) = 0 THEN RAISE EXCEPTION 'Unexpected guest booking total check'; END IF;
                source := replace(source, marker, 'item_total IS DISTINCT FROM coalesce((q->>''subtotal'')::numeric,(q->>''total'')::numeric)');
            END IF;
        END IF;
        EXECUTE source;
    END LOOP;
END $$;

DO $$
DECLARE source text := pg_get_functiondef('pawpal_private.audit_actor()'::regprocedure);
    marker constant text := 'SELECT order_id INTO owner_order FROM public.voucher_redemption WHERE id=NEW.entity_id;';
BEGIN
    IF strpos(source, marker) = 0 THEN RAISE EXCEPTION 'Unexpected voucher audit policy'; END IF;
    EXECUTE replace(source, marker, $body$
    IF NEW.action = 'INSERT' AND EXISTS (
        SELECT 1 FROM public.voucher_redemption v
        JOIN public.appointment a ON a.id = v.appointment_id
        WHERE v.id = NEW.entity_id AND v.idempotency_key = 'booking-voucher:' || a.id
          AND pawpal_private.owns_customer(a.customer_id)
    ) AND NOT EXISTS (SELECT 1 FROM public.staff WHERE auth_user_id = auth.uid()) THEN RETURN NEW; END IF;
    $body$ || marker);
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
