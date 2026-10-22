BEGIN;
CREATE OR REPLACE FUNCTION public.get_admin_chat_handlers()
RETURNS TABLE(id uuid,full_name text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT pawpal_private.has_permission('chat_conversation.write') OR NOT pawpal_private.has_permission('staff.read') THEN RAISE EXCEPTION 'chat_forbidden' USING ERRCODE='42501'; END IF;
 RETURN QUERY SELECT s.id,s.full_name FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id
 WHERE s.employment_status='active' AND NOT s.must_change_password AND (u.banned_until IS NULL OR u.banned_until<=now()) AND s.auth_user_id<>auth.uid()
 AND (EXISTS(SELECT 1 FROM public.staff_role sr JOIN public.role_permission rp ON rp.role_code=sr.role_code WHERE sr.staff_id=s.id AND rp.permission_code='chat_conversation.write')
 OR EXISTS(SELECT 1 FROM public.staff_permission sp WHERE sp.staff_id=s.id AND sp.permission_code='chat_conversation.write')) ORDER BY s.full_name,s.id;
END $$;
CREATE OR REPLACE FUNCTION public.transfer_admin_chat(p_request_id uuid,p_conversation_id uuid,p_expected_updated_at timestamptz,p_staff_id uuid,p_note text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; c public.chat_conversation; prior public.audit_log; payload text;
BEGIN
 IF NOT pawpal_private.has_permission('chat_conversation.write') OR NOT pawpal_private.has_permission('chat_message.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'chat_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_staff_id IS NULL OR coalesce(length(btrim(p_note)),0) NOT BETWEEN 2 AND 4000 THEN RAISE EXCEPTION 'invalid_chat_transfer' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('conversation',p_conversation_id,'staff',p_staff_id,'note',btrim(p_note))::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,46));
 SELECT * INTO prior FROM public.audit_log WHERE id=p_request_id;
 IF FOUND THEN
  IF prior.action<>'CHAT_ADMIN_TRANSFER' OR prior.staff_id IS DISTINCT FROM actor OR prior.description IS DISTINCT FROM payload THEN RAISE EXCEPTION 'chat_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.get_admin_chat_handlers() h WHERE h.id=p_staff_id) THEN RAISE EXCEPTION 'chat_handler_unavailable' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM public.chat_conversation WHERE id=p_conversation_id FOR UPDATE;
 IF NOT FOUND OR c.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'chat_changed' USING ERRCODE='PT409'; END IF;
 IF c.status<>'agent_handling' OR c.assigned_staff_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'chat_take_required' USING ERRCODE='42501'; END IF;
 UPDATE public.chat_conversation SET assigned_staff_id=p_staff_id,internal_note=concat_ws(E'\n',nullif(internal_note,''),btrim(p_note)),updated_at=clock_timestamp() WHERE id=c.id;
 INSERT INTO public.chat_message(id,conversation_id,sender_type,content,is_toxic,sentiment_score) VALUES(p_request_id,c.id,'system','Hội thoại đã được chuyển cho nhân viên phụ trách.',false,0);
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request_id,actor,'CHAT_ADMIN_TRANSFER','chat_conversation',c.id,payload);
 RETURN p_request_id;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_chat_handlers(),public.transfer_admin_chat(uuid,uuid,timestamptz,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_chat_handlers(),public.transfer_admin_chat(uuid,uuid,timestamptz,uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.guard_chat_audit() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF NEW.action IN ('CHAT_ADMIN_OPERATION','CHAT_ADMIN_RESOLVE','CHAT_ADMIN_TRANSFER','CHAT_RAW_READ') AND current_user IN ('authenticated','anon','authenticator') THEN RAISE EXCEPTION 'chat_audit_server_only' USING ERRCODE='42501'; END IF;RETURN NEW;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
