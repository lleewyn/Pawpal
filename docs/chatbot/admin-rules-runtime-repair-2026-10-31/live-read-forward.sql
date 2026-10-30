BEGIN;
SET LOCAL statement_timeout='8s';SET LOCAL lock_timeout='1s';
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
   IF jsonb_array_length(messages)>0 THEN more:=true;EXIT; END IF;
   message:=message||jsonb_build_object('content',left(message->>'content',1200),'content_partial',length(message->>'content')>1200,
    'content_offset',least(1200,length(message->>'content')),'content_revision',md5(message->>'content'));
   candidate:=jsonb_build_object('messages',jsonb_build_array(message),'hasMore',false);
   IF octet_length(convert_to(candidate::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_history_payload_limit' USING ERRCODE='54000'; END IF;
  END IF;
  messages:=messages||jsonb_build_array(message);
 END LOOP;
 RETURN jsonb_build_object('messages',messages,'hasMore',more);
END $$;
CREATE OR REPLACE FUNCTION public.read_admin_chat_message_part(p_kind text,p_id uuid,p_offset integer,p_revision text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE full_content text; revision text; fragment text; result jsonb; actor uuid;
BEGIN
 IF auth.uid() IS NULL OR p_id IS NULL OR p_offset IS NULL OR p_offset<0 OR p_revision IS NULL OR p_revision !~ '^[0-9a-f]{32}$' THEN RAISE EXCEPTION 'invalid_message_part' USING ERRCODE='22023'; END IF;
 PERFORM pawpal_private.admit_chat_history_read();
 IF p_kind='copilot' THEN
  IF NOT pawpal_private.has_permission('admin_copilot_history.read') THEN RAISE EXCEPTION 'chat_part_forbidden' USING ERRCODE='42501'; END IF;
  actor:=(public.get_staff_login_context()->'staff'->>'id')::uuid;
  SELECT h.content INTO full_content FROM public.admin_copilot_history h WHERE h.id=p_id AND h.staff_id=actor;
 ELSIF p_kind='transcript' THEN
  IF NOT pawpal_private.has_permission('chat_message.read') OR NOT pawpal_private.has_permission('chat_conversation.read') THEN RAISE EXCEPTION 'chat_part_forbidden' USING ERRCODE='42501'; END IF;
  SELECT m.content INTO full_content FROM public.chat_message m WHERE m.id=p_id;
 ELSE RAISE EXCEPTION 'invalid_message_kind' USING ERRCODE='22023';
 END IF;
 IF full_content IS NULL THEN RAISE EXCEPTION 'chat_part_unavailable' USING ERRCODE='42501'; END IF;
 revision:=md5(full_content);
 IF revision<>p_revision THEN RAISE EXCEPTION 'chat_part_changed' USING ERRCODE='PT409'; END IF;
 IF p_offset>length(full_content) THEN RAISE EXCEPTION 'invalid_message_offset' USING ERRCODE='22023'; END IF;
 fragment:=substring(full_content FROM p_offset+1 FOR 2000);
 result:=jsonb_build_object('id',p_id,'content',fragment,'offset',p_offset,'next_offset',p_offset+length(fragment),'hasMore',p_offset+length(fragment)<length(full_content),'revision',revision);
 IF octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_part_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.admit_chat_history_read(),public.get_admin_chat_messages_bounded(uuid,timestamptz,uuid),public.read_admin_chat_message_part(text,uuid,integer,text) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION pawpal_private.admit_chat_history_read(),public.get_admin_chat_messages_bounded(uuid,timestamptz,uuid),public.read_admin_chat_message_part(text,uuid,integer,text) TO authenticated;

CREATE OR REPLACE FUNCTION pawpal_private.admit_chat_aux_read(p_operation text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE slot integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'chat_read_forbidden' USING ERRCODE='42501'; END IF;
 IF p_operation='raw' THEN
  IF NOT pawpal_private.has_permission('chat_message.read') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'chat_read_forbidden' USING ERRCODE='42501'; END IF;
 ELSIF p_operation='handlers' THEN
  IF NOT pawpal_private.has_permission('chat_conversation.write') OR NOT pawpal_private.has_permission('staff.read') THEN RAISE EXCEPTION 'chat_read_forbidden' USING ERRCODE='42501'; END IF;
 ELSIF p_operation='policies' THEN
  IF NOT pawpal_private.has_permission('chatbot_compensation_policy.read') THEN RAISE EXCEPTION 'chat_read_forbidden' USING ERRCODE='42501'; END IF;
 ELSE RAISE EXCEPTION 'invalid_chat_read' USING ERRCODE='22023'; END IF;
 FOR slot IN 1..4 LOOP
  IF pg_try_advisory_xact_lock(hashtext('pawpal_chat_read_source_v1'),slot) THEN RETURN; END IF;
 END LOOP;
 RAISE EXCEPTION 'chat_read_source_busy' USING ERRCODE='PT429';
END $$;

CREATE OR REPLACE FUNCTION public.read_admin_chat_raw_bounded(p_message_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result text;
BEGIN
 PERFORM pawpal_private.admit_chat_aux_read('raw');
 -- Original definer function owns ADMIN/MANAGER checks and the audit write.
 result:=public.read_admin_chat_raw(p_message_id);
 IF octet_length(convert_to(to_jsonb(result)::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_raw_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_admin_chat_handlers_bounded()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb;
BEGIN
 PERFORM pawpal_private.admit_chat_aux_read('handlers');
 SELECT coalesce(jsonb_agg(to_jsonb(h) ORDER BY h.full_name,h.id),'[]'::jsonb) INTO result FROM (SELECT * FROM public.get_admin_chat_handlers() LIMIT 101) h;
 IF jsonb_array_length(result)>100 OR octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_handlers_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_admin_chat_point_policies()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb;
BEGIN
 PERFORM pawpal_private.admit_chat_aux_read('policies');
 SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.issue_type,p.id),'[]'::jsonb) INTO result FROM
 (SELECT id,issue_type,max_points,approval_required FROM public.chatbot_compensation_policy WHERE is_active ORDER BY issue_type,id LIMIT 51) p;
 IF jsonb_array_length(result)>50 OR octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_policies_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.admit_chat_aux_read(text),public.read_admin_chat_raw_bounded(uuid),public.get_admin_chat_handlers_bounded(),public.get_admin_chat_point_policies() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION pawpal_private.admit_chat_aux_read(text),public.read_admin_chat_raw_bounded(uuid),public.get_admin_chat_handlers_bounded(),public.get_admin_chat_point_policies() TO authenticated;
NOTIFY pgrst,'reload schema';

COMMIT;
