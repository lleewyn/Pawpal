BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.admit_chat_history_read()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE slot integer;
BEGIN
 IF auth.uid() IS NULL OR NOT (pawpal_private.has_permission('admin_copilot_history.read') OR pawpal_private.has_permission('chat_conversation.read')) THEN RAISE EXCEPTION 'chat_history_forbidden' USING ERRCODE='42501'; END IF;
 FOR slot IN 1..4 LOOP
  IF pg_try_advisory_xact_lock(hashtext('pawpal_chat_read_source_v1'),slot) THEN RETURN; END IF;
 END LOOP;
 RAISE EXCEPTION 'chat_read_source_busy' USING ERRCODE='PT429';
END $$;

CREATE OR REPLACE FUNCTION public.admin_copilot_sessions_bounded(p_query text DEFAULT '',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb;
BEGIN
 IF p_query IS NULL OR length(p_query)>2000 OR p_page IS NULL OR p_page<1 THEN RAISE EXCEPTION 'invalid_history_page' USING ERRCODE='22023'; END IF;
 PERFORM pawpal_private.admit_chat_history_read();
 result:=public.admin_copilot_session_page(p_query,p_page);
 IF octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_history_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_copilot_history_page(p_session uuid DEFAULT NULL,p_offset integer DEFAULT 0,p_with_title boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb; actor uuid; title text; message jsonb; messages jsonb:='[]'; candidate jsonb; seen integer:=0; more boolean:=false;
BEGIN
 IF NOT pawpal_private.has_permission('admin_copilot_history.read') THEN RAISE EXCEPTION 'copilot_history_forbidden' USING ERRCODE='42501'; END IF;
 IF p_offset IS NULL OR p_offset<0 OR p_with_title IS NULL THEN RAISE EXCEPTION 'invalid_history_page' USING ERRCODE='22023'; END IF;
 PERFORM pawpal_private.admit_chat_history_read();
 actor:=(public.get_staff_login_context()->'staff'->>'id')::uuid;
 IF actor IS NULL THEN RAISE EXCEPTION 'copilot_history_forbidden' USING ERRCODE='42501'; END IF;
 IF p_with_title AND p_session IS NOT NULL THEN
  SELECT left(coalesce(h.metadata->>'session_title',h.content),80) INTO title FROM public.admin_copilot_history h
  WHERE h.staff_id=actor AND h.session_id=p_session ORDER BY h.created_at,h.id LIMIT 1;
 END IF;
 result:=jsonb_build_object('history','[]'::jsonb,'hasMore',false)||CASE WHEN title IS NOT NULL THEN jsonb_build_object('title',title) ELSE '{}'::jsonb END;
 FOR message IN SELECT to_jsonb(h) FROM (
  SELECT h.id,h.session_id,h.role,h.content,h.metadata,h.created_at FROM public.admin_copilot_history h
  WHERE h.staff_id=actor AND (p_session IS NULL OR h.session_id=p_session)
  ORDER BY h.created_at DESC,h.id DESC OFFSET p_offset LIMIT 31) h LOOP
  IF seen=30 THEN more:=true; EXIT; END IF;
  candidate:=jsonb_set(result,'{history}',messages||jsonb_build_array(message));
  IF octet_length(convert_to(candidate::text,'UTF8'))>32768 THEN
   IF seen=0 THEN RAISE EXCEPTION 'chat_history_message_too_large' USING ERRCODE='54000'; END IF;
   more:=true; EXIT;
  END IF;
  messages:=messages||jsonb_build_array(message);seen:=seen+1;
 END LOOP;
 SELECT coalesce(jsonb_agg(value ORDER BY ordinality DESC),'[]'::jsonb) INTO messages FROM jsonb_array_elements(messages) WITH ORDINALITY;
 RETURN result||jsonb_build_object('history',messages,'hasMore',more);
END $$;

CREATE OR REPLACE FUNCTION public.get_admin_chat_messages_bounded(p_conversation uuid,p_before_at timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb; message jsonb; messages jsonb:='[]'; candidate jsonb; more boolean;
BEGIN
 PERFORM pawpal_private.admit_chat_history_read();
 result:=public.get_admin_chat_messages(p_conversation,p_before_at,p_before_id);
 more:=jsonb_array_length(result)=30;
 FOR message IN SELECT value FROM jsonb_array_elements(result) LOOP
  candidate:=jsonb_build_object('messages',messages||jsonb_build_array(message),'hasMore',false);
  IF octet_length(convert_to(candidate::text,'UTF8'))>32768 THEN
   IF jsonb_array_length(messages)=0 THEN RAISE EXCEPTION 'chat_history_message_too_large' USING ERRCODE='54000'; END IF;
   more:=true;EXIT;
  END IF;
  messages:=messages||jsonb_build_array(message);
 END LOOP;
 RETURN jsonb_build_object('messages',messages,'hasMore',more);
END $$;
REVOKE ALL ON FUNCTION pawpal_private.admit_chat_history_read(),public.admin_copilot_sessions_bounded(text,integer),public.admin_copilot_history_page(uuid,integer,boolean),public.get_admin_chat_messages_bounded(uuid,timestamptz,uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION pawpal_private.admit_chat_history_read(),public.admin_copilot_sessions_bounded(text,integer),public.admin_copilot_history_page(uuid,integer,boolean),public.get_admin_chat_messages_bounded(uuid,timestamptz,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
