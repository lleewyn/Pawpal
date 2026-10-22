BEGIN;
DROP POLICY IF EXISTS anon_conv_access ON public.chat_conversation;
DROP POLICY IF EXISTS anon_msg_access ON public.chat_message;
REVOKE ALL ON public.chat_conversation,public.chat_message FROM anon;
REVOKE INSERT,UPDATE,DELETE ON public.chat_conversation,public.chat_message FROM authenticated;
REVOKE SELECT ON public.chat_conversation FROM authenticated;
GRANT SELECT(id,customer_id,status,sentiment_level,sentiment_trend,is_urgent,assigned_staff_id,ai_summary,internal_note,sla_deadline,resolved_at,resolved_reason,resolved_by,violation_count,blocked_until,channel,created_at,updated_at,guest_session_id) ON public.chat_conversation TO authenticated;
REVOKE SELECT ON public.chat_message FROM authenticated;
GRANT SELECT(id,conversation_id,sender_type,sender_account_id,sender_guest_session_id,content,is_toxic,sentiment_score,metadata,created_at) ON public.chat_message TO authenticated;
DROP POLICY IF EXISTS v1_read ON public.admin_copilot_history;
DROP POLICY IF EXISTS v1_insert ON public.admin_copilot_history;
DROP POLICY IF EXISTS v1_update ON public.admin_copilot_history;
DROP POLICY IF EXISTS v1_delete ON public.admin_copilot_history;
REVOKE INSERT,UPDATE,DELETE ON public.admin_copilot_history FROM authenticated;
DROP POLICY IF EXISTS v1_copilot_owner ON public.admin_copilot_history;
CREATE POLICY v1_copilot_owner ON public.admin_copilot_history FOR SELECT TO authenticated USING(
 pawpal_private.has_permission('admin_copilot_history.read') AND staff_id=(public.get_staff_login_context()->'staff'->>'id')::uuid);
CREATE OR REPLACE FUNCTION public.save_admin_copilot_exchange(p_actor uuid,p_request uuid,p_session uuid,p_question text,p_answer text,p_title text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; existing public.admin_copilot_history; answer text;
BEGIN
 SELECT s.id INTO actor FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id WHERE s.auth_user_id=p_actor AND s.employment_status='active' AND NOT s.must_change_password AND (u.banned_until IS NULL OR u.banned_until<=now())
 AND (EXISTS(SELECT 1 FROM public.staff_role sr JOIN public.role_permission rp ON rp.role_code=sr.role_code WHERE sr.staff_id=s.id AND rp.permission_code='admin_copilot_history.write') OR EXISTS(SELECT 1 FROM public.staff_permission sp WHERE sp.staff_id=s.id AND sp.permission_code='admin_copilot_history.write'));
 IF actor IS NULL THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_session IS NULL OR coalesce(length(btrim(p_question)),0) NOT BETWEEN 1 AND 2000 OR coalesce(length(btrim(p_answer)),0) NOT BETWEEN 1 AND 16000 THEN RAISE EXCEPTION 'invalid_copilot_exchange' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,50));
 SELECT * INTO existing FROM public.admin_copilot_history WHERE id=p_request;
 IF FOUND THEN
  IF existing.staff_id<>actor OR existing.session_id<>p_session OR existing.content<>p_question THEN RAISE EXCEPTION 'copilot_request_conflict' USING ERRCODE='PT409'; END IF;
  SELECT content INTO answer FROM public.admin_copilot_history WHERE staff_id=actor AND metadata->>'request_id'=p_request::text AND role='assistant';
  RETURN answer;
 END IF;
 INSERT INTO public.admin_copilot_history(id,session_id,staff_id,role,content,metadata,created_at) VALUES(p_request,p_session,actor,'user',p_question,jsonb_build_object('session_title',left(p_title,100)),clock_timestamp());
 INSERT INTO public.admin_copilot_history(session_id,staff_id,role,content,metadata,created_at) VALUES(p_session,actor,'assistant',p_answer,jsonb_build_object('session_title',left(p_title,100),'request_id',p_request),clock_timestamp());
 RETURN p_answer;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_copilot_exchange(uuid,uuid,uuid,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_admin_copilot_exchange(uuid,uuid,uuid,text,text,text) TO service_role;
CREATE OR REPLACE FUNCTION public.delete_admin_copilot_session(p_session uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid;
BEGIN
 IF NOT pawpal_private.has_permission('admin_copilot_history.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 DELETE FROM public.admin_copilot_history WHERE session_id=p_session AND staff_id=actor;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'DELETE_COPILOT_SESSION','admin_copilot_history',p_session,'Xóa phiên trợ lý của chính nhân viên');
END $$;
REVOKE ALL ON FUNCTION public.delete_admin_copilot_session(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_admin_copilot_session(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.read_admin_chat_raw(p_message_id uuid) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result text; actor uuid;
BEGIN
 IF NOT pawpal_private.has_permission('chat_message.read') OR NOT pawpal_private.has_permission('audit_log.write') OR NOT EXISTS(SELECT 1 FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE s.auth_user_id=auth.uid() AND r.role_code IN ('ADMIN','MANAGER')) THEN RAISE EXCEPTION 'chat_forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 SELECT coalesce(raw_content,content) INTO result FROM public.chat_message WHERE id=p_message_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'chat_message_missing' USING ERRCODE='P0002'; END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'CHAT_RAW_READ','chat_message',p_message_id,'Xem nguyên văn có kiểm toán');
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_admin_chat_raw(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_admin_chat_raw(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.guard_chat_audit() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF (NEW.action LIKE 'CHAT_%' OR NEW.action IN ('SAVE_CHAT_RULE','DELETE_CHAT_RULE','DELETE_COPILOT_SESSION')) AND current_user IN ('authenticated','anon','authenticator') THEN RAISE EXCEPTION 'chat_audit_server_only' USING ERRCODE='42501'; END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_chat_audit() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS v1_chat_audit_server ON public.audit_log;
CREATE TRIGGER v1_chat_audit_server BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_chat_audit();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime' AND NOT puballtables) THEN
  IF EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_message') THEN ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_message; END IF;
  IF EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='chat_conversation') THEN ALTER PUBLICATION supabase_realtime DROP TABLE public.chat_conversation; END IF;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversation(id,updated_at);
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
