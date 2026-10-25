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
DECLARE table_name text; first_page jsonb; second_page jsonb; searched jsonb; expected bigint; category text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY['chatbot_knowledge_faq','chatbot_profanity_filter','chatbot_canned_response',
        'chatbot_compensation_policy','chatbot_handover_rule','chatbot_scenario_matrix'] LOOP
        EXECUTE format('SELECT count(*) FROM public.%I',table_name) INTO expected;
        first_page:=public.admin_chat_rule_page(table_name);
        IF (first_page->>'total')::bigint<>expected OR (first_page->>'count')::bigint<>expected
            OR jsonb_array_length(first_page->'rows')<>least(expected,10) THEN RAISE EXCEPTION 'Page/count mismatch: %',table_name; END IF;
        IF expected>10 THEN
            second_page:=public.admin_chat_rule_page(table_name,'{}',2);
            IF EXISTS(SELECT 1 FROM jsonb_array_elements(first_page->'rows') a JOIN jsonb_array_elements(second_page->'rows') b ON a->>'id'=b->>'id') THEN
                RAISE EXCEPTION 'Pages overlap: %',table_name; END IF;
        END IF;
        searched:=public.admin_chat_rule_page(table_name,'{"query":"__no_such_chat_rule_20261025__"}',999);
        IF (searched->>'total')::integer<>0 OR (searched->>'page')::integer<>1 THEN RAISE EXCEPTION 'Empty page mismatch: %',table_name; END IF;
        IF table_name IN ('chatbot_knowledge_faq','chatbot_canned_response') THEN
            EXECUTE format('SELECT category FROM public.%I WHERE coalesce(category,'''')<>'''' ORDER BY category DESC LIMIT 1',table_name) INTO category;
            IF category IS NOT NULL THEN
                EXECUTE format('SELECT count(*) FROM public.%I WHERE category=$1',table_name) INTO expected USING category;
                searched:=public.admin_chat_rule_page(table_name,jsonb_build_object('category',category));
                IF (searched->>'total')::bigint<>expected OR NOT (first_page->'categories' @> jsonb_build_array(category)) THEN
                    RAISE EXCEPTION 'Category filter/catalog mismatch: %',table_name; END IF;
            END IF;
        END IF;
        IF table_name IN ('chatbot_knowledge_faq','chatbot_profanity_filter','chatbot_canned_response') THEN
            EXECUTE format('SELECT count(*) FROM public.%I WHERE NOT coalesce(is_active,false)',table_name) INTO expected;
            searched:=public.admin_chat_rule_page(table_name,'{"status":"inactive"}');
            IF (searched->>'total')::bigint<>expected THEN RAISE EXCEPTION 'Status filter mismatch: %',table_name; END IF;
        END IF;
    END LOOP;
    BEGIN
        PERFORM public.admin_chat_rule_page('staff');
        RAISE EXCEPTION 'Table whitelist bypassed';
    EXCEPTION WHEN SQLSTATE '22023' THEN NULL; END;
END $$;
WITH sources AS (
    SELECT 'chatbot_knowledge_faq' AS table_name,coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) AS records FROM public.chatbot_knowledge_faq t
    UNION ALL SELECT 'chatbot_profanity_filter',coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.chatbot_profanity_filter t
    UNION ALL SELECT 'chatbot_canned_response',coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.chatbot_canned_response t
    UNION ALL SELECT 'chatbot_compensation_policy',coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.chatbot_compensation_policy t
    UNION ALL SELECT 'chatbot_handover_rule',coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.chatbot_handover_rule t
    UNION ALL SELECT 'chatbot_scenario_matrix',coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) FROM public.chatbot_scenario_matrix t
) SELECT table_name,true AS contract_pass,
    NOT has_function_privilege('anon','public.admin_chat_rule_page(text,jsonb,integer)','EXECUTE') AS anon_denied,
    jsonb_array_length(records) AS total,octet_length(records::text) AS full_json_bytes,
    octet_length(public.admin_chat_rule_page(table_name)::text) AS page_json_bytes FROM sources;
ROLLBACK;
