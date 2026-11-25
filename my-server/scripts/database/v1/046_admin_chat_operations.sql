BEGIN;
CREATE OR REPLACE FUNCTION public.act_admin_chat(p_request_id uuid,p_conversation_id uuid,p_expected_updated_at timestamptz,p_action text,p_content text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; conversation public.chat_conversation; prior public.audit_log; payload text; note text; result_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('chat_conversation.read') OR NOT pawpal_private.has_permission('chat_conversation.write')
 OR NOT pawpal_private.has_permission('chat_message.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'chat_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_conversation_id IS NULL OR p_action IS NULL OR p_action NOT IN ('take','release','send','note')
 OR p_content IS NULL OR length(p_content)>8000 OR (p_action='send' AND length(btrim(p_content))<1) THEN RAISE EXCEPTION 'invalid_chat_operation' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('conversation_id',p_conversation_id,'action',p_action,'content',p_content)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,46));
 SELECT * INTO prior FROM public.audit_log WHERE id=p_request_id;
 IF FOUND THEN
  IF prior.action<>'CHAT_ADMIN_OPERATION' OR prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'chat_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 END IF;
 SELECT * INTO conversation FROM public.chat_conversation WHERE id=p_conversation_id FOR UPDATE;
 IF NOT FOUND OR conversation.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'chat_changed' USING ERRCODE='PT409'; END IF;
 IF conversation.status IN ('closed','resolved','completed','blocked') THEN RAISE EXCEPTION 'chat_not_open' USING ERRCODE='PT409'; END IF;
 IF conversation.assigned_staff_id IS NOT NULL AND conversation.assigned_staff_id<>actor THEN RAISE EXCEPTION 'chat_assigned_to_other' USING ERRCODE='42501'; END IF;
 IF p_action IN ('release','send') AND (conversation.assigned_staff_id IS DISTINCT FROM actor OR conversation.status<>'agent_handling') THEN RAISE EXCEPTION 'chat_take_required' USING ERRCODE='22023'; END IF;
 IF p_action='take' THEN
  UPDATE public.chat_conversation SET assigned_staff_id=actor,status='agent_handling',updated_at=clock_timestamp() WHERE id=conversation.id;
  note:='Nhân viên đã tiếp nhận hội thoại.';
 ELSIF p_action='release' THEN
  UPDATE public.chat_conversation SET assigned_staff_id=NULL,status='bot_handling',updated_at=clock_timestamp() WHERE id=conversation.id;
  note:='Nhân viên đã trả lại quyền hỗ trợ tự động.';
 ELSIF p_action='note' THEN
  UPDATE public.chat_conversation SET internal_note=p_content,updated_at=clock_timestamp() WHERE id=conversation.id;
 ELSE
  UPDATE public.chat_conversation SET updated_at=clock_timestamp() WHERE id=conversation.id;
  INSERT INTO public.chat_message(id,conversation_id,sender_type,sender_account_id,content,is_toxic,sentiment_score)
  VALUES(p_request_id,conversation.id,'staff',auth.uid(),btrim(p_content),false,0);
 END IF;
 IF note IS NOT NULL THEN
  INSERT INTO public.chat_message(id,conversation_id,sender_type,content,is_toxic,sentiment_score)
  VALUES(p_request_id,conversation.id,'system',note,false,0);
 END IF;
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request_id,actor,'CHAT_ADMIN_OPERATION','chat_conversation',conversation.id,payload);
 RETURN p_request_id;
END $$;
REVOKE ALL ON FUNCTION public.act_admin_chat(uuid,uuid,timestamptz,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.act_admin_chat(uuid,uuid,timestamptz,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.guard_chat_audit() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF NEW.action='CHAT_ADMIN_OPERATION' AND current_user IN ('authenticated','anon','authenticator') THEN RAISE EXCEPTION 'chat_audit_server_only' USING ERRCODE='42501'; END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_chat_audit() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS v1_chat_audit_server ON public.audit_log;
CREATE TRIGGER v1_chat_audit_server BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_chat_audit();
NOTIFY pgrst,'reload schema';
COMMIT;
