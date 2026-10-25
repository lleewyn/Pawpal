BEGIN;
DO $$
DECLARE actor uuid;
BEGIN
    SELECT s.auth_user_id INTO actor FROM public.staff s
    JOIN public.staff_role sr ON sr.staff_id = s.id AND sr.role_code = 'ADMIN'
    WHERE s.auth_user_id IS NOT NULL AND s.employment_status = 'active' ORDER BY s.id LIMIT 1;
    IF actor IS NULL THEN RAISE EXCEPTION 'No active test administrator'; END IF;
    PERFORM set_config('request.jwt.claim.sub', actor::text, true);
    PERFORM set_config('request.jwt.claims', jsonb_build_object('sub',actor,'role','authenticated')::text, true);
END $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE summary jsonb; first_page jsonb; second_page jsonb; ids uuid[]; details jsonb; assessment jsonb; candidate record;
BEGIN
    summary := public.admin_staff_directory_summary();
    IF jsonb_array_length(summary) <> (SELECT count(*) FROM public.staff) THEN RAISE EXCEPTION 'Staff count mismatch'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(summary) e WHERE e ? 'permissions' OR e->'staff_record' ? 'address') THEN
        RAISE EXCEPTION 'Directory summary contains detail fields';
    END IF;
    SELECT array_agg(id) INTO ids FROM (SELECT id FROM public.staff ORDER BY created_at, id LIMIT 10) s;
    details := public.admin_staff_directory_page(ids);
    IF jsonb_array_length(details) <> coalesce(cardinality(ids),0) THEN RAISE EXCEPTION 'Staff detail mismatch'; END IF;
    first_page := public.admin_staff_list_page();
    second_page := public.admin_staff_list_page('{}',2);
    IF (first_page->>'total')::bigint <> (SELECT count(*) FROM public.staff) OR jsonb_array_length(first_page->'rows')>10 THEN
        RAISE EXCEPTION 'Staff list page mismatch'; END IF;
    IF (first_page->>'total')::integer>10 AND EXISTS(SELECT 1 FROM jsonb_array_elements(first_page->'rows') a
        JOIN jsonb_array_elements(second_page->'rows') b ON a->'staff_record'->>'id'=b->'staff_record'->>'id') THEN
        RAISE EXCEPTION 'Staff list pages overlap'; END IF;
    first_page := public.admin_staff_list_page('{"query":"__no_matching_staff_20261025__"}',999);
    IF (first_page->>'total')::integer<>0 OR (first_page->>'page')::integer<>1 THEN RAISE EXCEPTION 'Staff list empty search mismatch'; END IF;
    first_page := public.admin_staff_list_page('{"status":"ACTIVE","locked":true}');
    IF (first_page->>'total')::bigint<>(SELECT count(*) FROM public.staff WHERE employment_status='active' AND service_locked) THEN
        RAISE EXCEPTION 'Staff status/lock filter mismatch'; END IF;
    IF ids IS NOT NULL THEN
        BEGIN
            PERFORM public.admin_staff_directory_page(array_fill(ids[1], ARRAY[11]));
            RAISE EXCEPTION 'Unbounded staff page accepted';
        EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
    END IF;
    first_page := public.admin_staff_assessment_page();
    IF (first_page->>'total')::bigint <> (SELECT count(*) FROM public.staff_assessment)
        OR jsonb_array_length(first_page->'rows') > 10 THEN RAISE EXCEPTION 'Assessment page count mismatch'; END IF;
    IF (first_page->>'total')::integer > 10 THEN
        second_page := public.admin_staff_assessment_page('', 'ALL', 'ALL', 2);
        IF EXISTS(SELECT 1 FROM jsonb_array_elements(first_page->'rows') a
            JOIN jsonb_array_elements(second_page->'rows') b ON a->>'id' = b->>'id') THEN RAISE EXCEPTION 'Assessment pages overlap'; END IF;
    END IF;
    assessment := public.admin_staff_assessment_page('__no_matching_staff_20261025__', 'ALL', 'ALL', 999);
    IF (assessment->>'total')::integer <> 0 OR (assessment->>'page')::integer <> 1 THEN RAISE EXCEPTION 'Empty page mismatch'; END IF;
    SELECT a.*, s.full_name INTO candidate FROM public.staff_assessment a JOIN public.staff s ON s.id = a.staff_id ORDER BY a.id LIMIT 1;
    IF FOUND THEN
        assessment := public.admin_staff_assessment_page(right(candidate.id::text, 12));
        IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(assessment->'rows') r WHERE r->>'id' = candidate.id::text) THEN RAISE EXCEPTION 'UUID substring search failed'; END IF;
        assessment := public.admin_staff_assessment_page('', candidate.assessment_type, candidate.result, 1, candidate.staff_id);
        IF (assessment->>'total')::bigint <> (SELECT count(*) FROM public.staff_assessment a WHERE a.staff_id = candidate.staff_id
            AND a.assessment_type = candidate.assessment_type AND a.result = candidate.result) THEN RAISE EXCEPTION 'Filtered count mismatch'; END IF;
        assessment := public.admin_staff_assessment_page(replace(regexp_replace(normalize(lower(candidate.full_name), NFD), U&'[\0300-\036f]', '', 'g'), 'đ', 'd'));
        IF (assessment->>'total')::integer < 1 THEN RAISE EXCEPTION 'Unaccented name search failed'; END IF;
    END IF;
    assessment := public.admin_staff_assessment_summary();
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(assessment) r WHERE r ? 'note') THEN RAISE EXCEPTION 'Summary contains notes'; END IF;
    IF EXISTS(
        WITH expected AS (
            SELECT id FROM public.staff_assessment WHERE assessment_date >= date_trunc('month',now() AT TIME ZONE 'Asia/Bangkok')::date
                AND assessment_date < (date_trunc('month',now() AT TIME ZONE 'Asia/Bangkok') + interval '1 month')::date
            UNION SELECT id FROM (SELECT DISTINCT ON (staff_id) id FROM public.staff_assessment ORDER BY staff_id,assessment_date DESC,created_at DESC,id) latest
        ), actual AS (SELECT (e->>'id')::uuid AS id FROM jsonb_array_elements(assessment) e)
        (SELECT id FROM expected EXCEPT SELECT id FROM actual) UNION ALL (SELECT id FROM actual EXCEPT SELECT id FROM expected)
    ) THEN RAISE EXCEPTION 'Assessment summary changed monthly/latest data'; END IF;
    assessment := public.admin_staff_schedule_summary();
    IF EXISTS(
        WITH bounds AS (SELECT date_trunc('month',now() AT TIME ZONE 'Asia/Bangkok') AT TIME ZONE 'Asia/Bangkok' AS start_at,
            (date_trunc('month',now() AT TIME ZONE 'Asia/Bangkok') + interval '1 month') AT TIME ZONE 'Asia/Bangkok' AS end_at),
        expected AS (
            SELECT sch.id FROM public.staff_schedule sch,bounds b WHERE sch.start_at<b.end_at AND sch.end_at>b.start_at
            UNION SELECT next.id FROM public.staff s CROSS JOIN LATERAL (SELECT id FROM public.staff_schedule sch WHERE sch.staff_id=s.id
                AND schedule_status='active' AND availability_status='available' AND end_at>now() ORDER BY start_at,id LIMIT 1) next
            UNION SELECT previous.id FROM public.staff s CROSS JOIN LATERAL (SELECT id FROM public.staff_schedule sch WHERE sch.staff_id=s.id
                AND schedule_status='active' AND availability_status='available' AND end_at<=now() ORDER BY start_at DESC,id DESC LIMIT 1) previous
        ), actual AS (SELECT (e->>'id')::uuid AS id FROM jsonb_array_elements(assessment) e)
        (SELECT id FROM expected EXCEPT SELECT id FROM actual) UNION ALL (SELECT id FROM actual EXCEPT SELECT id FROM expected)
    ) THEN RAISE EXCEPTION 'Schedule summary changed month/nearest shifts'; END IF;
    IF NOT (SELECT coalesce(bool_and(NOT p.prosecdef),false) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname IN ('admin_staff_directory_summary','admin_staff_directory_page','admin_staff_list_page','admin_staff_assessment_page','admin_staff_assessment_summary','admin_staff_schedule_summary')) THEN
        RAISE EXCEPTION 'Read function bypasses caller RLS'; END IF;
END $$;
WITH ids AS (SELECT array_agg(id) AS ids FROM (SELECT id FROM public.staff ORDER BY created_at,id LIMIT 10) s),
sizes AS (
    SELECT octet_length(coalesce((SELECT jsonb_agg(to_jsonb(d)) FROM public.get_admin_staff_directory() d),'[]'::jsonb)::text) AS directory_before,
        octet_length(public.admin_staff_directory_summary()::text) AS directory_summary,
        octet_length(public.admin_staff_list_page()::text) AS directory_page,
        octet_length(coalesce((SELECT jsonb_agg(to_jsonb(a)) FROM public.staff_assessment a),'[]'::jsonb)::text) AS history_before,
        octet_length(public.admin_staff_assessment_page()::text) AS history_page FROM ids
), metrics AS (
SELECT true AS contract_pass,
    NOT has_function_privilege('anon','public.admin_staff_directory_summary()','EXECUTE')
    AND NOT has_function_privilege('anon','public.admin_staff_directory_page(uuid[])','EXECUTE')
    AND NOT has_function_privilege('anon','public.admin_staff_assessment_page(text,text,text,integer,uuid)','EXECUTE')
    AND NOT has_function_privilege('anon','public.admin_staff_assessment_summary()','EXECUTE') AS anon_denied,
    NOT has_function_privilege('anon','public.admin_staff_schedule_summary()','EXECUTE') AS schedule_anon_denied,
    NOT has_function_privilege('anon','public.admin_staff_list_page(jsonb,integer)','EXECUTE') AS list_anon_denied,
    (SELECT count(*) FROM public.staff) AS staff_count,
    directory_before, directory_summary, directory_page,
    (SELECT count(*) FROM public.staff_assessment) AS assessment_count, history_before, history_page
FROM sizes
)
SELECT e.key AS check_or_metric, e.value AS result FROM metrics m, LATERAL jsonb_each_text(to_jsonb(m)) e;
ROLLBACK;
