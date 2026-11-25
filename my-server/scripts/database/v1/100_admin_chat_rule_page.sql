BEGIN;
CREATE OR REPLACE FUNCTION public.admin_chat_rule_page(p_table text,p_filters jsonb DEFAULT '{}'::jsonb,p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; ordering text;
BEGIN
    IF p_table NOT IN ('chatbot_knowledge_faq','chatbot_profanity_filter','chatbot_canned_response','chatbot_compensation_policy','chatbot_handover_rule','chatbot_scenario_matrix') THEN
        RAISE EXCEPTION 'invalid_rule_table' USING ERRCODE='22023'; END IF;
    IF auth.uid() IS NULL OR NOT pawpal_private.has_permission(p_table||'.read') THEN
        RAISE EXCEPTION 'chat_rule_forbidden' USING ERRCODE='42501'; END IF;
    ordering := CASE p_table
        WHEN 'chatbot_knowledge_faq' THEN 'priority ASC,id ASC'
        WHEN 'chatbot_profanity_filter' THEN 'created_at DESC,id ASC'
        WHEN 'chatbot_canned_response' THEN 'usage_count DESC,id ASC'
        WHEN 'chatbot_compensation_policy' THEN 'max_points DESC,id ASC'
        WHEN 'chatbot_handover_rule' THEN 'sla_seconds ASC,id ASC'
        ELSE 'created_at ASC,id ASC' END;
    EXECUTE format($sql$
        WITH source AS MATERIALIZED (SELECT t.*,to_jsonb(t) AS record FROM public.%I t),
        matching AS MATERIALIZED (
            SELECT * FROM source WHERE
            (coalesce($1->>'query','')='' OR EXISTS(
                SELECT 1 FROM jsonb_each_text(record) field
                WHERE field.key=ANY(CASE $2
                    WHEN 'chatbot_knowledge_faq' THEN ARRAY['question','answer']
                    WHEN 'chatbot_profanity_filter' THEN ARRAY['keyword']
                    WHEN 'chatbot_canned_response' THEN ARRAY['title','shortcut','content']
                    WHEN 'chatbot_compensation_policy' THEN ARRAY['issue_type','description']
                    WHEN 'chatbot_handover_rule' THEN ARRAY['condition_name','threshold_value','auto_assign_role']
                    ELSE ARRAY['scenario_name','sample_user_input'] END)
                    AND strpos(lower(field.value),lower($1->>'query'))>0
            ) OR ($2='chatbot_knowledge_faq' AND EXISTS(
                SELECT 1 FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(record->'keywords')='array' THEN record->'keywords' ELSE '[]'::jsonb END) keyword
                WHERE strpos(lower(keyword),lower($1->>'query'))>0)))
            AND (coalesce($1->>'category','all')='all' OR record->>'category'=$1->>'category')
            AND (coalesce($1->>'severity','all')='all' OR record->>'severity'=$1->>'severity')
            AND (coalesce($1->>'action','all')='all' OR record->>'action'=$1->>'action')
            AND (coalesce($1->>'status','all')='all' OR CASE WHEN $2='chatbot_scenario_matrix' THEN record->>'benchmark_status'=$1->>'status'
                ELSE coalesce((record->>'is_active')::boolean,false)=($1->>'status'='active') END)
        ), bounds AS (
            SELECT count(*) AS total,least(greatest(coalesce($3,1),1),greatest(1,ceil(count(*)/10.0)::integer)) AS page FROM matching
        ), records AS (
            SELECT record,row_number() OVER(ORDER BY %s) AS ordinal FROM matching ORDER BY %s LIMIT 10 OFFSET (SELECT (page-1)*10 FROM bounds)
        ) SELECT jsonb_build_object('total',b.total,'page',b.page,'count',(SELECT count(*) FROM source),
            'rows',coalesce((SELECT jsonb_agg(record ORDER BY ordinal) FROM records),'[]'::jsonb),
            'categories',coalesce((SELECT jsonb_agg(category ORDER BY category) FROM (
                SELECT DISTINCT record->>'category' AS category FROM source WHERE coalesce(record->>'category','')<>''
            ) c),'[]'::jsonb)) FROM bounds b
    $sql$,p_table,ordering,ordering) INTO result USING p_filters,p_table,p_page;
    RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_chat_rule_page(text,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_chat_rule_page(text,jsonb,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
