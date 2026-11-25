BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.admit_chat_server_read()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE slot integer;
BEGIN
 FOR slot IN 1..4 LOOP
  IF pg_try_advisory_xact_lock(hashtext('pawpal_chat_read_source_v1'),slot) THEN RETURN; END IF;
 END LOOP;
 RAISE EXCEPTION 'chat_read_source_busy' USING ERRCODE='PT429';
END $$;
REVOKE ALL ON FUNCTION pawpal_private.admit_chat_server_read() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION pawpal_private.admit_chat_server_read() TO service_role;

-- Server-only. The active API verifies customer/guest ownership before these calls.
CREATE OR REPLACE FUNCTION public.read_public_chat_rules()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb;
BEGIN
 PERFORM pawpal_private.admit_chat_server_read();
 SELECT jsonb_build_object(
 'profanity',coalesce((SELECT jsonb_agg(to_jsonb(r)-'id' ORDER BY r.id) FROM (SELECT id,keyword,action,replacement_text FROM public.chatbot_profanity_filter WHERE is_active ORDER BY id LIMIT 501) r),'[]'::jsonb),
 'sentiment',coalesce((SELECT jsonb_agg(to_jsonb(r)-'id' ORDER BY r.id) FROM (SELECT id,tier_level,trigger_pattern FROM public.chatbot_sentiment_trigger WHERE is_active ORDER BY id LIMIT 501) r),'[]'::jsonb)) INTO result;
 IF jsonb_array_length(result->'profanity')>500 OR jsonb_array_length(result->'sentiment')>500 OR octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_rules_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.read_public_chat_context(p_conversation uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb;
BEGIN
 PERFORM pawpal_private.admit_chat_server_read();
 IF p_conversation IS NULL OR NOT EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=p_conversation) THEN RAISE EXCEPTION 'chat_context_unavailable' USING ERRCODE='22023'; END IF;
 SELECT jsonb_build_object(
 'faq',coalesce((SELECT jsonb_agg(to_jsonb(r)-'id' ORDER BY r.id) FROM (SELECT id,question,answer FROM public.chatbot_knowledge_faq WHERE is_active ORDER BY id LIMIT 501) r),'[]'::jsonb),
 'recent',coalesce((SELECT jsonb_agg(to_jsonb(r)-'id'-'created_at' ORDER BY r.created_at DESC,r.id DESC) FROM (SELECT id,sender_type,content,created_at FROM public.chat_message WHERE conversation_id=p_conversation ORDER BY created_at DESC,id DESC LIMIT 8) r),'[]'::jsonb)) INTO result;
 IF jsonb_array_length(result->'faq')>500 OR octet_length(convert_to(result::text,'UTF8'))>65536 THEN RAISE EXCEPTION 'chat_context_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_public_chat_rules(),public.read_public_chat_context(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_public_chat_rules(),public.read_public_chat_context(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.read_admin_chat_benchmark_snapshot()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb; required text; slot integer; admitted boolean:=false;
BEGIN
 FOREACH required IN ARRAY ARRAY['chatbot_scenario_matrix.read','chatbot_scenario_matrix.write','chatbot_profanity_filter.read','chatbot_sentiment_trigger.read','audit_log.write'] LOOP
  IF auth.uid() IS NULL OR NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'benchmark_read_forbidden' USING ERRCODE='42501'; END IF;
 END LOOP;
 FOR slot IN 1..4 LOOP
  IF pg_try_advisory_xact_lock(hashtext('pawpal_chat_read_source_v1'),slot) THEN admitted:=true;EXIT; END IF;
 END LOOP;
 IF NOT admitted THEN RAISE EXCEPTION 'chat_read_source_busy' USING ERRCODE='PT429'; END IF;
 SELECT jsonb_build_object(
 'profanity',coalesce((SELECT jsonb_agg(to_jsonb(r)-'id' ORDER BY r.id) FROM (SELECT id,keyword,action,replacement_text,is_active FROM public.chatbot_profanity_filter ORDER BY id LIMIT 501) r),'[]'::jsonb),
 'sentiment',coalesce((SELECT jsonb_agg(to_jsonb(r)-'id' ORDER BY r.id) FROM (SELECT id,tier_level,trigger_pattern,is_active FROM public.chatbot_sentiment_trigger ORDER BY id LIMIT 501) r),'[]'::jsonb),
 'scenarios',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM (SELECT * FROM public.chatbot_scenario_matrix ORDER BY id LIMIT 501) r),'[]'::jsonb)) INTO result;
 IF jsonb_array_length(result->'profanity')>500 OR jsonb_array_length(result->'sentiment')>500 OR jsonb_array_length(result->'scenarios')>500 OR octet_length(convert_to(result::text,'UTF8'))>65536 THEN RAISE EXCEPTION 'benchmark_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_admin_chat_benchmark_snapshot() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.read_admin_chat_benchmark_snapshot() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
