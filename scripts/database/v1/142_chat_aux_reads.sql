BEGIN;
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
