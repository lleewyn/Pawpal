BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.admit_chat_rule_read(p_table text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE slot integer;
BEGIN
 IF p_table IS NULL OR p_table NOT IN ('chatbot_knowledge_faq','chatbot_profanity_filter','chatbot_canned_response','chatbot_compensation_policy','chatbot_handover_rule','chatbot_scenario_matrix') THEN RAISE EXCEPTION 'invalid_rule_table' USING ERRCODE='22023'; END IF;
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission(p_table||'.read') THEN RAISE EXCEPTION 'chat_rule_forbidden' USING ERRCODE='42501'; END IF;
 FOR slot IN 1..4 LOOP
  IF pg_try_advisory_xact_lock(hashtext('pawpal_chat_read_source_v1'),slot) THEN RETURN; END IF;
 END LOOP;
 RAISE EXCEPTION 'chat_read_source_busy' USING ERRCODE='PT429';
END $$;

CREATE OR REPLACE FUNCTION public.admin_chat_rule_page_bounded(p_table text,p_filters jsonb DEFAULT '{}',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb;
BEGIN
 IF p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR p_page IS NULL OR p_page<1 THEN RAISE EXCEPTION 'invalid_rule_page' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_filters) e WHERE e.key NOT IN ('query','category','severity','action','status') OR jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>200) THEN RAISE EXCEPTION 'invalid_rule_filter' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_filters) k WHERE NOT k=ANY(CASE p_table
 WHEN 'chatbot_knowledge_faq' THEN ARRAY['query','category','status'] WHEN 'chatbot_canned_response' THEN ARRAY['query','category','status']
 WHEN 'chatbot_profanity_filter' THEN ARRAY['query','severity','action','status'] WHEN 'chatbot_scenario_matrix' THEN ARRAY['query','status'] ELSE ARRAY['query'] END)) THEN RAISE EXCEPTION 'invalid_rule_filter' USING ERRCODE='22023'; END IF;
 IF (p_filters ? 'status' AND NOT p_filters->>'status'=ANY(CASE WHEN p_table='chatbot_scenario_matrix' THEN ARRAY['all','pending','passed','failed'] ELSE ARRAY['all','active','inactive'] END))
 OR (p_filters ? 'severity' AND p_filters->>'severity' NOT IN ('all','critical','high','medium','low'))
 OR (p_filters ? 'action' AND p_filters->>'action' NOT IN ('all','mask','warn','block')) THEN RAISE EXCEPTION 'invalid_rule_filter' USING ERRCODE='22023'; END IF;
 PERFORM pawpal_private.admit_chat_rule_read(p_table);
 result:=public.admin_chat_rule_page(p_table,p_filters,p_page);
 IF octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_rule_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_chat_rule_counts(p_tables text[])
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE source text; first_source text; amount bigint; result jsonb:='{}';
BEGIN
 IF p_tables IS NULL OR cardinality(p_tables) NOT BETWEEN 1 AND 6 OR array_ndims(p_tables)<>1 OR EXISTS(SELECT 1 FROM unnest(p_tables) x WHERE x IS NULL OR x NOT IN ('chatbot_knowledge_faq','chatbot_profanity_filter','chatbot_canned_response','chatbot_compensation_policy','chatbot_handover_rule','chatbot_scenario_matrix')) THEN RAISE EXCEPTION 'invalid_rule_tables' USING ERRCODE='22023'; END IF;
 SELECT x INTO first_source FROM unnest(p_tables) x WHERE pawpal_private.has_permission(x||'.read') LIMIT 1;
 IF first_source IS NULL THEN RAISE EXCEPTION 'chat_rule_forbidden' USING ERRCODE='42501'; END IF;
 PERFORM pawpal_private.admit_chat_rule_read(first_source);
 FOR source IN SELECT DISTINCT x FROM unnest(p_tables) x LOOP
  IF pawpal_private.has_permission(source||'.read') THEN
   EXECUTE format('SELECT count(*) FROM public.%I',source) INTO amount;
   result:=result||jsonb_build_object(source,amount);
  END IF;
 END LOOP;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_chat_canned_page(p_query text DEFAULT '',p_category text DEFAULT 'all',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb;
BEGIN
 IF p_query IS NULL OR length(p_query)>200 OR p_category IS NULL OR length(p_category)>200 OR p_page IS NULL OR p_page<1 THEN RAISE EXCEPTION 'invalid_canned_page' USING ERRCODE='22023'; END IF;
 PERFORM pawpal_private.admit_chat_rule_read('chatbot_canned_response');
 WITH source AS MATERIALIZED (SELECT id,shortcut,title,content,category,usage_count FROM public.chatbot_canned_response WHERE is_active),
 matched AS MATERIALIZED (SELECT * FROM source WHERE (p_category='all' OR category=p_category) AND (btrim(p_query)='' OR strpos(lower(coalesce(title,'')||' '||coalesce(shortcut,'')||' '||content),lower(btrim(p_query)))>0)),
 bounds AS (SELECT count(*) total,least(p_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched),
 records AS (SELECT id,shortcut,title,content,category,usage_count FROM matched ORDER BY usage_count DESC,id LIMIT 10 OFFSET (SELECT (page-1)*10 FROM bounds))
 SELECT jsonb_build_object('total',b.total,'page',b.page,'rows',coalesce((SELECT jsonb_agg(to_jsonb(r)-'usage_count' ORDER BY r.usage_count DESC,r.id) FROM records r),'[]'::jsonb),
 'categories',coalesce((SELECT jsonb_agg(category ORDER BY category) FROM (SELECT DISTINCT category FROM source WHERE coalesce(category,'')<>'') c),'[]'::jsonb)) INTO result FROM bounds b;
 IF octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_canned_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.admit_chat_rule_read(text),public.admin_chat_rule_page_bounded(text,jsonb,integer),public.admin_chat_rule_counts(text[]),public.admin_chat_canned_page(text,text,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION pawpal_private.admit_chat_rule_read(text),public.admin_chat_rule_page_bounded(text,jsonb,integer),public.admin_chat_rule_counts(text[]),public.admin_chat_canned_page(text,text,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
