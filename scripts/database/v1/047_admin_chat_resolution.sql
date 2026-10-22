BEGIN;
CREATE OR REPLACE FUNCTION public.resolve_admin_chat(p_request_id uuid,p_conversation_id uuid,p_expected_updated_at timestamptz,p_reason text,p_notes text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; c public.chat_conversation; prior public.audit_log; payload text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('chat_conversation.write') OR NOT pawpal_private.has_permission('chat_conversation.read') OR NOT pawpal_private.has_permission('chat_message.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'chat_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_conversation_id IS NULL OR p_reason IS NULL OR p_reason NOT IN ('resolved_complete','service_consulted','order_tracked','ticket_created','customer_left') OR p_notes IS NULL OR length(p_notes)>8000 THEN RAISE EXCEPTION 'invalid_chat_resolution' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('conversation_id',p_conversation_id,'reason',p_reason,'notes',p_notes)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,46));
 SELECT * INTO prior FROM public.audit_log WHERE id=p_request_id;
 IF FOUND THEN
  IF prior.action<>'CHAT_ADMIN_RESOLVE' OR prior.staff_id IS DISTINCT FROM actor OR prior.description IS DISTINCT FROM payload THEN RAISE EXCEPTION 'chat_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 END IF;
 SELECT * INTO c FROM public.chat_conversation WHERE id=p_conversation_id FOR UPDATE;
 IF NOT FOUND OR c.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'chat_changed' USING ERRCODE='PT409'; END IF;
 IF c.status<>'agent_handling' OR c.assigned_staff_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'chat_take_required' USING ERRCODE='42501'; END IF;
 UPDATE public.chat_conversation SET status='resolved',assigned_staff_id=NULL,is_urgent=false,resolved_at=clock_timestamp(),resolved_by=actor,resolved_reason=p_reason,
 internal_note=concat_ws(E'\n',nullif(internal_note,''),nullif(btrim(p_notes),'')),updated_at=clock_timestamp() WHERE id=c.id;
 INSERT INTO public.chat_message(id,conversation_id,sender_type,content,is_toxic,sentiment_score) VALUES(p_request_id,c.id,'system','Nhân viên đã hoàn tất hội thoại.',false,0);
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request_id,actor,'CHAT_ADMIN_RESOLVE','chat_conversation',c.id,payload);
 RETURN p_request_id;
END $$;
REVOKE ALL ON FUNCTION public.resolve_admin_chat(uuid,uuid,timestamptz,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.resolve_admin_chat(uuid,uuid,timestamptz,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.guard_chat_audit() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF NEW.action IN ('CHAT_ADMIN_OPERATION','CHAT_ADMIN_RESOLVE') AND current_user IN ('authenticated','anon','authenticator') THEN RAISE EXCEPTION 'chat_audit_server_only' USING ERRCODE='42501'; END IF;RETURN NEW;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
