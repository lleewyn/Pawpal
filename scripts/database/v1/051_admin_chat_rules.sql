BEGIN;
CREATE OR REPLACE FUNCTION public.save_admin_chat_rule(p_table text,p_id uuid,p_expected jsonb,p_values jsonb,p_delete boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE original jsonb; merged jsonb; columns text; allowed text[]; actor uuid;
BEGIN
 IF p_table IS NULL OR p_table NOT IN ('chatbot_knowledge_faq','chatbot_profanity_filter','chatbot_canned_response') OR p_id IS NULL OR p_values IS NULL OR jsonb_typeof(p_values)<>'object' OR p_delete IS NULL THEN RAISE EXCEPTION 'invalid_chat_rule' USING ERRCODE='22023'; END IF;
 IF NOT pawpal_private.has_permission(p_table||'.write') OR NOT pawpal_private.has_permission(p_table||'.read') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'chat_rule_forbidden' USING ERRCODE='42501'; END IF;
 allowed:=CASE p_table WHEN 'chatbot_knowledge_faq' THEN ARRAY['category','question','answer','keywords','priority','is_active'] WHEN 'chatbot_profanity_filter' THEN ARRAY['keyword','severity','action','replacement_text','is_active'] ELSE ARRAY['shortcut','title','content','category','is_active'] END;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_values) k WHERE NOT k=ANY(allowed)) THEN RAISE EXCEPTION 'invalid_chat_rule_fields' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 PERFORM pg_advisory_xact_lock(hashtextextended(p_table||p_id::text,51));
 EXECUTE format('SELECT to_jsonb(r) FROM public.%I r WHERE id=$1 FOR UPDATE',p_table) INTO original USING p_id;
 IF NOT p_delete AND p_expected IS NULL AND original IS NOT NULL AND original @> p_values THEN RETURN p_id; END IF;
 IF original IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'chat_rule_changed' USING ERRCODE='PT409'; END IF;
 IF p_delete THEN
  IF original IS NULL THEN RAISE EXCEPTION 'chat_rule_missing' USING ERRCODE='P0002'; END IF;
  EXECUTE format('DELETE FROM public.%I WHERE id=$1',p_table) USING p_id;
 ELSE
  merged:=coalesce(original,jsonb_build_object('created_at',now(),'updated_at',now(),'usage_count',0,'priority',1,'keywords','[]'::jsonb,'is_active',true))||p_values||jsonb_build_object('id',p_id);
  IF coalesce(length(btrim(merged->>CASE p_table WHEN 'chatbot_knowledge_faq' THEN 'question' WHEN 'chatbot_profanity_filter' THEN 'keyword' ELSE 'title' END)),0) NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'invalid_chat_rule_title' USING ERRCODE='22023'; END IF;
  IF p_table='chatbot_knowledge_faq' AND (coalesce(length(btrim(merged->>'answer')),0) NOT BETWEEN 1 AND 8000 OR jsonb_typeof(merged->'keywords')<>'array' OR (merged->>'priority')::integer<0) THEN RAISE EXCEPTION 'invalid_chat_faq' USING ERRCODE='22023'; END IF;
  IF p_table='chatbot_profanity_filter' AND ((merged->>'severity') NOT IN ('low','medium','high','critical') OR (merged->>'action') NOT IN ('mask','warn','block')) THEN RAISE EXCEPTION 'invalid_chat_filter' USING ERRCODE='22023'; END IF;
  IF p_table='chatbot_canned_response' AND (coalesce(length(btrim(merged->>'content')),0) NOT BETWEEN 1 AND 8000 OR coalesce(length(btrim(merged->>'shortcut')),0) NOT BETWEEN 1 AND 100) THEN RAISE EXCEPTION 'invalid_chat_canned' USING ERRCODE='22023'; END IF;
  SELECT string_agg(format('%I',column_name),',' ORDER BY ordinal_position) INTO columns FROM information_schema.columns WHERE table_schema='public' AND table_name=p_table;
  IF original IS NULL THEN
   EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I,$1)',p_table,p_table) USING merged;
  ELSE
   EXECUTE format('UPDATE public.%I SET (%s)=(SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1)) WHERE id=$2',p_table,columns,columns,p_table) USING merged,p_id;
  END IF;
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,CASE WHEN p_delete THEN 'DELETE_CHAT_RULE' ELSE 'SAVE_CHAT_RULE' END,p_table,p_id,jsonb_build_object('before',original,'changes',p_values)::text);
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_chat_rule(text,uuid,jsonb,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admin_chat_rule(text,uuid,jsonb,jsonb,boolean) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.chatbot_knowledge_faq,public.chatbot_profanity_filter,public.chatbot_canned_response FROM authenticated,anon;
NOTIFY pgrst,'reload schema';
COMMIT;
