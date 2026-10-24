BEGIN;
DO $$
DECLARE actor uuid;
BEGIN
    SELECT s.auth_user_id INTO actor FROM public.staff s
    JOIN public.staff_role sr ON sr.staff_id=s.id AND sr.role_code='ADMIN'
    WHERE s.auth_user_id IS NOT NULL AND s.employment_status='active' ORDER BY s.id LIMIT 1;
    IF actor IS NULL THEN RAISE EXCEPTION 'No active test administrator'; END IF;
    PERFORM set_config('request.jwt.claim.sub',actor::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE service jsonb; orders jsonb; empty_page jsonb; context_page jsonb; second_page jsonb; context_id text;
BEGIN
    service := public.admin_complaint_page('service','{}',1,10);
    orders := public.admin_complaint_page('order','{}',1,10);
    IF jsonb_array_length(service->'pageIds')>10 OR jsonb_array_length(orders->'pageIds')>10 THEN
        RAISE EXCEPTION 'Page size exceeded';
    END IF;
    IF (service->>'total')::bigint+(orders->>'total')::bigint<>(SELECT count(*) FROM public.support_ticket) THEN
        RAISE EXCEPTION 'Global counts mismatch';
    END IF;
    IF (service->>'total')::integer>10 THEN
        second_page := public.admin_complaint_page('service','{}',2,10);
        IF (second_page->>'page')::integer<>2 OR EXISTS(
            SELECT 1 FROM jsonb_array_elements_text(service->'pageIds') a
            JOIN jsonb_array_elements_text(second_page->'pageIds') b ON a.value=b.value
        ) THEN RAISE EXCEPTION 'Page 2 overlaps page 1'; END IF;
    END IF;
    IF (service->'stats'->>'sNew')::bigint+(orders->'stats'->>'oNew')::bigint<>
        (SELECT count(*) FROM public.support_ticket WHERE lower(status) IN ('new','pending','mo')) THEN
        RAISE EXCEPTION 'New ticket KPI mismatch';
    END IF;
    empty_page := public.admin_complaint_page('service','{"query":"__no_such_complaint_20261025__"}',999,10);
    IF (empty_page->>'total')::integer<>0 OR jsonb_array_length(empty_page->'pageIds')<>0 THEN
        RAISE EXCEPTION 'Empty search mismatch';
    END IF;
    SELECT id::text INTO context_id FROM public.support_ticket
    WHERE NOT (service->'pageIds' @> jsonb_build_array(id)) ORDER BY id LIMIT 1;
    IF context_id IS NOT NULL THEN
        context_page := public.admin_complaint_page('service','{}',1,10,context_id);
        IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(context_page->'tickets') t WHERE t->>'id'=context_id) THEN
            RAISE EXCEPTION 'Off-page context missing';
        END IF;
        IF jsonb_array_length(context_page->'tickets')>11 THEN RAISE EXCEPTION 'Context page not bounded'; END IF;
    END IF;
END $$;
SELECT
    true AS page_and_global_kpi_pass,
    NOT has_function_privilege('anon','public.admin_complaint_page(text,jsonb,integer,integer,text,uuid[])','EXECUTE') AS anon_denied,
    NOT (SELECT prosecdef FROM pg_proc WHERE oid='public.admin_complaint_page(text,jsonb,integer,integer,text,uuid[])'::regprocedure) AS caller_rls_preserved,
    (SELECT relrowsecurity FROM pg_class WHERE oid='public.support_ticket'::regclass) AS ticket_rls_enabled;
ROLLBACK;
