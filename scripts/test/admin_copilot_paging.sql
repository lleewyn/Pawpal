BEGIN;
DO $$
DECLARE actor uuid;
BEGIN
    SELECT s.auth_user_id INTO actor FROM public.staff s JOIN public.staff_role sr ON sr.staff_id=s.id AND sr.role_code='ADMIN'
    WHERE s.auth_user_id IS NOT NULL AND s.employment_status='active' ORDER BY s.id LIMIT 1;
    IF actor IS NULL THEN RAISE EXCEPTION 'No active test administrator'; END IF;
    PERFORM set_config('request.jwt.claim.sub',actor::text,true);
    PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
END $$;
SET LOCAL ROLE authenticated;
DO $$
DECLARE first_page jsonb; second_page jsonb; expected bigint; empty_page jsonb;
BEGIN
    SELECT count(DISTINCT h.session_id) INTO expected FROM public.admin_copilot_history h
    JOIN public.staff s ON s.id=h.staff_id WHERE s.auth_user_id=auth.uid();
    first_page:=public.admin_copilot_session_page();
    IF (first_page->>'total')::bigint<>expected OR jsonb_array_length(first_page->'sessions')>10 THEN
        RAISE EXCEPTION 'Copilot page/count mismatch'; END IF;
    IF EXISTS(SELECT 1 FROM jsonb_array_elements(first_page->'sessions') row
        WHERE NOT EXISTS(SELECT 1 FROM public.admin_copilot_history h JOIN public.staff s ON s.id=h.staff_id
            WHERE s.auth_user_id=auth.uid() AND h.session_id=(row->>'id')::uuid)) THEN
        RAISE EXCEPTION 'Copilot exposed another actor session'; END IF;
    IF expected>10 THEN
        second_page:=public.admin_copilot_session_page('',2);
        IF EXISTS(SELECT 1 FROM jsonb_array_elements(first_page->'sessions') a
            JOIN jsonb_array_elements(second_page->'sessions') b ON a->>'id'=b->>'id') THEN RAISE EXCEPTION 'Copilot pages overlap'; END IF;
    END IF;
    empty_page:=public.admin_copilot_session_page('__no_such_copilot_session_20261025__',999);
    IF (empty_page->>'total')::integer<>0 OR (empty_page->>'page')::integer<>1 THEN RAISE EXCEPTION 'Copilot empty search mismatch'; END IF;
END $$;
SELECT true AS contract_pass,
    NOT has_function_privilege('anon','public.admin_copilot_session_page(text,integer)','EXECUTE') AS anon_denied,
    NOT (SELECT p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname='admin_copilot_session_page') AS caller_rls,
    (public.admin_copilot_session_page()->>'total')::integer AS own_session_count;
ROLLBACK;
