BEGIN;
CREATE OR REPLACE FUNCTION public.save_admin_chat_benchmark(p_results jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE item jsonb; actor uuid; original jsonb;
BEGIN
 IF NOT pawpal_private.has_permission('chatbot_scenario_matrix.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'chat_forbidden' USING ERRCODE='42501'; END IF;
 IF p_results IS NULL OR jsonb_typeof(p_results)<>'array' OR jsonb_array_length(p_results)>500 THEN RAISE EXCEPTION 'invalid_benchmark' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 FOR item IN SELECT value FROM jsonb_array_elements(p_results) LOOP
  IF item->>'status' NOT IN ('passed','failed','pending') THEN RAISE EXCEPTION 'invalid_benchmark_status' USING ERRCODE='22023'; END IF;
  SELECT to_jsonb(r) INTO original FROM public.chatbot_scenario_matrix r WHERE id=(item->>'id')::uuid FOR UPDATE;
  IF original IS DISTINCT FROM item->'expected' THEN RAISE EXCEPTION 'chat_rule_changed' USING ERRCODE='PT409'; END IF;
  UPDATE public.chatbot_scenario_matrix SET benchmark_status=item->>'status' WHERE id=(item->>'id')::uuid;
 END LOOP;
 INSERT INTO public.audit_log(staff_id,action,entity_name,description) VALUES(actor,'CHAT_RULE_BENCHMARK','chatbot_scenario_matrix',p_results::text);
END $$;
REVOKE ALL ON FUNCTION public.save_admin_chat_benchmark(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admin_chat_benchmark(jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
