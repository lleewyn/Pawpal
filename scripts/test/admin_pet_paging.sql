-- Run against the installed read-only gateway; all fixtures roll back.
BEGIN;
DO $$
DECLARE
    u uuid := gen_random_uuid();
    s uuid := gen_random_uuid();
    c uuid := gen_random_uuid();
    dog uuid;
    cat uuid;
    bd uuid := gen_random_uuid();
    bc uuid := gen_random_uuid();
    prefix text := 'PET-PAGE-' || gen_random_uuid();
BEGIN
    INSERT INTO auth.users(id) VALUES (u);
    INSERT INTO public.staff(id,full_name,job_title,auth_user_id,employment_status,must_change_password)
        VALUES (s,'Pet directory verification','QA',u,'active',false);
    INSERT INTO public.staff_role(staff_id,role_code) VALUES(s,'ADMIN');
    INSERT INTO public.customer(id,customer_code) VALUES(c,prefix);
    INSERT INTO public.customer_profile(customer_id,full_name) VALUES(c,'Đỗ Thị Kiểm Thử ' || prefix);
    INSERT INTO public.customer_phone(customer_id,phone_number,is_primary)
        VALUES(c,'08' || lpad(floor(random()*100000000)::text,8,'0'),true);
    SELECT id INTO dog FROM public.pet_species WHERE species_name='Chó';
    SELECT id INTO cat FROM public.pet_species WHERE species_name='Mèo';
    IF dog IS NULL OR cat IS NULL THEN RAISE EXCEPTION 'Required dog/cat catalog missing'; END IF;
    INSERT INTO public.pet_breed(id,species_id,breed_name) VALUES
        (bd,dog,'Giống thử chó ' || prefix),(bc,cat,'Giống thử mèo ' || prefix);
    INSERT INTO public.pet_profile(id,customer_id,pet_code,pet_name,breed_id,status,safety_note,allergy,routine,created_at)
        SELECT gen_random_uuid(),c,prefix || '-' || lpad(i::text,3,'0'),'Bé kiểm thử ' || prefix || '-' || i,
            CASE WHEN i%2=0 THEN bd ELSE bc END,
            CASE WHEN i=1 THEN 'archived' ELSE 'active' END,
            CASE WHEN i=2 THEN 'Cảnh báo: cần chú ý' END,
            CASE WHEN i=3 THEN 'Không ghi nhận' WHEN i=6 THEN 'Tôm' END,
            CASE WHEN i=4 THEN 'Tiếp nhận mới tại quầy.' WHEN i=5 THEN 'Cần vuốt ve nhẹ' END,
            now() + i * interval '1 second'
        FROM generate_series(1,123) i;
    INSERT INTO public.pet_weight_history(pet_id,weight,recorded_by)
        SELECT id,(substring(pet_code FROM '([0-9]+)$')::integer % 25)+1,s
        FROM public.pet_profile WHERE customer_id=c;
    PERFORM set_config('request.jwt.claim.sub',u::text,true);
    PERFORM set_config('pawpal.pet_page_test_prefix',prefix,true);
    PERFORM set_config('pawpal.pet_page_test_owner',c::text,true);
END;
$$;

SET LOCAL ROLE authenticated;
DO $$
DECLARE
    prefix text := current_setting('pawpal.pet_page_test_prefix');
    owner_id uuid := current_setting('pawpal.pet_page_test_owner')::uuid;
    r jsonb;
    first_revision text;
    expected integer;
    pet_id uuid;
BEGIN
    r := public.admin_pet_page(p_query=>prefix);
    IF (r->>'total')::integer<>123 OR jsonb_array_length(r->'pets')<>10 THEN
        RAISE EXCEPTION 'Ten-row server paging failed';
    END IF;
    IF r->'pets'->0->>'pet_code'<>prefix || '-123' THEN RAISE EXCEPTION 'Stable sort failed'; END IF;
    first_revision := r->>'revision';
    r := public.admin_pet_page(p_query=>prefix,p_page=>999);
    IF (r->>'page')::integer<>13 OR jsonb_array_length(r->'pets')<>3 THEN RAISE EXCEPTION 'Last-page clamping failed'; END IF;
    r := public.admin_pet_page(p_query=>prefix,p_size=>10000);
    IF jsonb_array_length(r->'pets')<>100 THEN RAISE EXCEPTION 'Page size upper bound failed'; END IF;
    r := public.admin_pet_page(p_query=>prefix,p_size=>0);
    IF jsonb_array_length(r->'pets')<>1 THEN RAISE EXCEPTION 'Page size lower bound failed'; END IF;
    r := public.admin_pet_page(p_query=>prefix,p_species=>'dog',p_weight=>'under5');
    SELECT count(*) INTO expected FROM public.pet_profile p JOIN public.pet_current_weight w ON w.pet_id=p.id
        JOIN public.pet_breed b ON b.id=p.breed_id JOIN public.pet_species sp ON sp.id=b.species_id
        WHERE p.customer_id=owner_id AND sp.species_name='Chó' AND w.weight<5;
    IF (r->>'total')::integer<>expected THEN RAISE EXCEPTION 'Combined species/weight filter failed'; END IF;
    r := public.admin_pet_page(p_query=>'be kiem thu ' || lower(prefix) || '-123');
    IF (r->>'total')::integer<>1 THEN RAISE EXCEPTION 'Accent-insensitive search failed'; END IF;
    r := public.admin_pet_page(p_query=>prefix,p_alert=>true);
    IF (r->>'total')::integer<>3 THEN RAISE EXCEPTION 'Alert sanitization failed'; END IF;
    SELECT id INTO pet_id FROM public.pet_profile WHERE pet_code=prefix || '-123';
    r := public.admin_pet_page(p_lookup=>pet_id::text);
    IF (r->>'total')::integer<>1 OR r->'pets'->0->>'id'<>pet_id::text THEN RAISE EXCEPTION 'Profile lookup failed'; END IF;
    r := public.admin_pet_page(p_ids=>ARRAY[pet_id::text,prefix || '-122'],p_size=>100);
    IF jsonb_array_length(r->'pets')<>2 THEN RAISE EXCEPTION 'Auxiliary tab context failed'; END IF;
    r := public.admin_pet_page(p_owner_query=>'do thi kiem thu ' || lower(prefix),p_size=>15);
    IF jsonb_array_length(r->'owners')<>1 OR (r->'owners'->0->>'petCount')::integer<>123 THEN
        RAISE EXCEPTION 'Global owner autocomplete/count failed';
    END IF;
    -- KPI is global (not the ten rows), but can be compared to the authorized tables.
    r := public.admin_pet_page(p_query=>prefix,p_page=>2);
    SELECT count(*) INTO expected FROM public.pet_profile WHERE status<>'archived';
    IF (r->'stats'->>'total')::integer<>expected THEN RAISE EXCEPTION 'Global KPI failed'; END IF;
    IF r->>'revision'<>first_revision THEN RAISE EXCEPTION 'Export revision changes between pages'; END IF;
    BEGIN
        PERFORM public.admin_pet_page(p_query=>repeat('x',201));
        RAISE EXCEPTION 'Oversized search accepted';
    EXCEPTION WHEN invalid_parameter_value THEN NULL;
    END;
    PERFORM set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
    BEGIN
        PERFORM public.admin_pet_page();
        RAISE EXCEPTION 'Unauthorized caller accepted';
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
END;
$$;
RESET ROLE;
DO $$
BEGIN
    IF (SELECT prosecdef FROM pg_proc WHERE oid='public.admin_pet_page(text,text,text,text,boolean,boolean,integer,integer,text,text[],boolean,text)'::regprocedure) THEN
        RAISE EXCEPTION 'SECURITY INVOKER was lost';
    END IF;
    IF has_function_privilege('anon','public.admin_pet_page(text,text,text,text,boolean,boolean,integer,integer,text,text[],boolean,text)','EXECUTE') THEN
        RAISE EXCEPTION 'Anonymous execution granted';
    END IF;
END;
$$;
SELECT 'PASS pet paging, filters, Vietnamese search, KPI, owner autocomplete, context lookup and permissions; fixtures rolled back';
ROLLBACK;
