BEGIN;

-- Read-only directory gateway. SECURITY INVOKER keeps table RLS in force.
CREATE OR REPLACE FUNCTION public.admin_pet_page(
    p_query text DEFAULT '',
    p_species text DEFAULT 'ALL',
    p_breed text DEFAULT 'ALL',
    p_weight text DEFAULT 'ALL',
    p_hotel boolean DEFAULT false,
    p_alert boolean DEFAULT false,
    p_page integer DEFAULT 1,
    p_size integer DEFAULT 10,
    p_lookup text DEFAULT '',
    p_ids text[] DEFAULT NULL,
    p_catalog boolean DEFAULT false,
    p_owner_query text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public
SET statement_timeout = '5s'
AS $$
DECLARE
    result jsonb;
    permission_name text;
    size_value integer := least(greatest(coalesce(p_size, 10), 1), 100);
    page_value integer := greatest(coalesce(p_page, 1), 1);
    search_value text;
    breed_value text;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'pet_page_forbidden' USING ERRCODE = '42501';
    END IF;
    FOREACH permission_name IN ARRAY ARRAY[
        'pet_profile', 'pet_breed', 'pet_species', 'pet_weight_history',
        'customer', 'customer_profile', 'customer_phone'
    ] LOOP
        IF NOT pawpal_private.has_permission(permission_name || '.read') THEN
            RAISE EXCEPTION 'pet_page_forbidden' USING ERRCODE = '42501';
        END IF;
    END LOOP;
    IF length(coalesce(p_query, '')) > 200
       OR length(coalesce(p_breed, '')) > 200
       OR length(coalesce(p_species, '')) > 200
       OR length(coalesce(p_lookup, '')) > 200
       OR length(coalesce(p_owner_query, '')) > 200
       OR cardinality(p_ids) > 100
       OR EXISTS (SELECT 1 FROM unnest(p_ids) value WHERE length(value) > 200)
       OR p_weight NOT IN ('ALL', 'under5', '5to10', '10to20', 'over20') THEN
        RAISE EXCEPTION 'invalid_pet_filter' USING ERRCODE = '22023';
    END IF;

    search_value := lower(translate(regexp_replace(
        normalize(btrim(coalesce(p_owner_query, p_query, '')), NFD),
        U&'[\0300-\036f]', '', 'g'), U&'\0111\0110', 'dD'));
    breed_value := lower(translate(regexp_replace(
        normalize(coalesce(p_breed, 'ALL'), NFD),
        U&'[\0300-\036f]', '', 'g'), U&'\0111\0110', 'dD'));

    -- Autocomplete searches the entire authorized owner directory, not cached pet pages.
    IF p_owner_query IS NOT NULL THEN
        WITH owners AS MATERIALIZED (
            SELECT c.id, pr.full_name AS name, ph.phone_number AS phone,
                   c.contact_email AS email
            FROM public.customer c
            LEFT JOIN public.customer_profile pr ON pr.customer_id = c.id
            LEFT JOIN LATERAL (
                SELECT phone_number FROM public.customer_phone
                WHERE customer_id = c.id AND is_primary ORDER BY id LIMIT 1
            ) ph ON true
            WHERE search_value = '' OR strpos(lower(translate(regexp_replace(
                normalize(concat_ws(' ', pr.full_name, ph.phone_number), NFD),
                U&'[\0300-\036f]', '', 'g'), U&'\0111\0110', 'dD')), search_value) > 0
        ), selected AS (
            SELECT * FROM owners ORDER BY name NULLS LAST, id
            LIMIT size_value OFFSET (page_value - 1) * size_value
        )
        SELECT jsonb_build_object(
            'ownerTotal', (SELECT count(*) FROM owners),
            'owners', coalesce((SELECT jsonb_agg(to_jsonb(o) || jsonb_build_object(
                'petCount', (SELECT count(*) FROM public.pet_profile WHERE customer_id = o.id)
            ) ORDER BY o.name NULLS LAST, o.id) FROM selected o), '[]'::jsonb)
        ) INTO result;
        RETURN result;
    END IF;

    WITH raw AS MATERIALIZED (
        SELECT p.*, br.breed_name, sp.species_name,
               CASE sp.species_name WHEN 'Chó' THEN 'dog' WHEN 'Mèo' THEN 'cat'
                    WHEN 'Thỏ' THEN 'rabbit' WHEN 'Hamster' THEN 'hamster'
                    ELSE coalesce(nullif(sp.species_name, ''), 'other') END AS species_code,
               pr.full_name AS owner_name, ph.phone_number AS owner_phone, w.weight,
               concat_ws(' • ', nullif(p.safety_note, ''),
                   CASE WHEN btrim(coalesce(p.routine, '')) <> '' AND btrim(p.routine) !~*
                       '^(Tiếp nhận mới tại quầy\.|Hồ sơ tạo mới\.|Chưa có ghi chú đặc biệt\.|Không ghi nhận)$'
                       THEN CASE WHEN btrim(p.routine) ~* '^(lưu ý|cảnh báo|tập tính)\s*:'
                           THEN btrim(p.routine) ELSE 'Lưu ý: ' || btrim(p.routine) END END,
                   CASE WHEN coalesce(p.allergy, '') <> '' AND btrim(p.allergy) !~*
                       '^(không|không có|không ghi nhận|chưa ghi nhận|none|no)$'
                       THEN 'Dị ứng: ' || p.allergy END
               ) AS alert_text
        FROM public.pet_profile p
        LEFT JOIN public.pet_breed br ON br.id = p.breed_id
        LEFT JOIN public.pet_species sp ON sp.id = br.species_id
        LEFT JOIN public.customer_profile pr ON pr.customer_id = p.customer_id
        LEFT JOIN LATERAL (
            SELECT phone_number FROM public.customer_phone
            WHERE customer_id = p.customer_id AND is_primary ORDER BY id LIMIT 1
        ) ph ON true
        LEFT JOIN public.pet_current_weight w ON w.pet_id = p.id
        WHERE (p_lookup = '' OR p.id::text = p_lookup OR p.pet_code = p_lookup)
          AND (p_ids IS NULL OR p.id::text = ANY(p_ids) OR p.pet_code = ANY(p_ids))
    ), base AS MATERIALIZED (
        SELECT r.*,
            lower(translate(regexp_replace(normalize(concat_ws(' ',
                pet_code, pet_name, species_name, breed_name, owner_name,
                owner_phone, routine, alert_text), NFD),
                U&'[\0300-\036f]', '', 'g'), U&'\0111\0110', 'dD')) AS search_text,
            lower(translate(regexp_replace(normalize(concat_ws(' ', species_name, breed_name), NFD),
                U&'[\0300-\036f]', '', 'g'), U&'\0111\0110', 'dD')) AS breed_text
        FROM raw r
    ), matched AS MATERIALIZED (
        SELECT * FROM base
        WHERE (search_value = '' OR strpos(search_text, search_value) > 0)
          AND (p_species = 'ALL' OR species_code = p_species
               OR (p_species = 'other' AND species_code NOT IN ('dog', 'cat', 'rabbit')))
          AND (p_breed = 'ALL' OR strpos(breed_text, breed_value) > 0)
          AND (p_weight = 'ALL' OR (weight > 0 AND (
              (p_weight = 'under5' AND weight < 5) OR
              (p_weight = '5to10' AND weight >= 5 AND weight < 10) OR
              (p_weight = '10to20' AND weight >= 10 AND weight < 20) OR
              (p_weight = 'over20' AND weight >= 20))))
          AND (NOT p_hotel OR status = 'HOTEL')
          AND (NOT p_alert OR alert_text <> '')
    ), totals AS (
        SELECT count(*) AS total FROM matched
    ), paging AS (
        SELECT total, least(page_value, greatest(1, ceil(total::numeric / size_value)::integer)) AS page FROM totals
    ), selected AS MATERIALIZED (
        SELECT * FROM matched ORDER BY created_at DESC, id
        LIMIT size_value OFFSET ((SELECT page FROM paging) - 1) * size_value
    ), owner_ids AS MATERIALIZED (
        SELECT DISTINCT customer_id FROM selected
    )
    SELECT jsonb_build_object(
        'total', (SELECT total FROM paging),
        'page', (SELECT page FROM paging),
        'pageIds', coalesce((SELECT jsonb_agg(id ORDER BY created_at DESC, id) FROM selected), '[]'::jsonb),
        'revision', (SELECT md5(coalesce(string_agg(concat_ws(':', id, updated_at, owner_name,
            owner_phone, weight, breed_name, species_name), '|' ORDER BY id), '')) FROM matched),
        'stats', CASE WHEN p_ids IS NULL AND p_lookup = '' THEN
            (SELECT jsonb_build_object(
                'total', count(*) FILTER (WHERE status <> 'archived'),
                'dog', count(*) FILTER (WHERE status <> 'archived' AND species_code = 'dog'),
                'cat', count(*) FILTER (WHERE status <> 'archived' AND species_code = 'cat'),
                'other', count(*) FILTER (WHERE status <> 'archived' AND species_code NOT IN ('dog', 'cat')),
                'alert', count(*) FILTER (WHERE status <> 'archived' AND alert_text <> '')
            ) FROM base) ELSE NULL END,
        'pets', coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.created_at DESC, p.id)
            FROM public.pet_profile p WHERE id IN (SELECT id FROM selected)), '[]'::jsonb),
        'weights', coalesce((SELECT jsonb_agg(jsonb_build_object('pet_id', id, 'weight', weight)) FROM selected), '[]'::jsonb),
        'breeds', coalesce((SELECT jsonb_agg(to_jsonb(br) || jsonb_build_object('species', to_jsonb(sp)) ORDER BY br.id)
            FROM public.pet_breed br LEFT JOIN public.pet_species sp ON sp.id = br.species_id
            WHERE p_catalog OR br.id IN (SELECT breed_id FROM selected)), '[]'::jsonb),
        'custAcc', coalesce((SELECT jsonb_agg(jsonb_build_object('id', id, 'contact_email', contact_email, 'customer_status', customer_status))
            FROM public.customer WHERE id IN (SELECT customer_id FROM owner_ids)), '[]'::jsonb),
        'custProf', coalesce((SELECT jsonb_agg(jsonb_build_object('customer_id', customer_id, 'full_name', full_name))
            FROM public.customer_profile WHERE customer_id IN (SELECT customer_id FROM owner_ids)), '[]'::jsonb),
        'phones', coalesce((SELECT jsonb_agg(jsonb_build_object('customer_id', customer_id, 'phone_number', phone_number))
            FROM public.customer_phone WHERE is_primary AND customer_id IN (SELECT customer_id FROM owner_ids)), '[]'::jsonb)
    ) INTO result;
    RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_pet_page(text,text,text,text,boolean,boolean,integer,integer,text,text[],boolean,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_pet_page(text,text,text,text,boolean,boolean,integer,integer,text,text[],boolean,text) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
