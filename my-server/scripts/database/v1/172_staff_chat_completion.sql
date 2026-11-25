-- Keep queue content minimal; expose only the actor's own committed operation receipt for lost-response recovery.
BEGIN;
DO $$ DECLARE source text; needle text:='SELECT id,status,created_at FROM public.chat_conversation WHERE assigned_staff_id IS NULL AND status=''waiting_agent'''; BEGIN
 SELECT pg_get_functiondef('public.get_staff_workspace(text,text,uuid,integer)'::regprocedure) INTO source;
 IF strpos(source,needle)=0 THEN RAISE EXCEPTION 'unexpected_chat_queue_projection'; END IF;
 EXECUTE replace(source,needle,'SELECT id,status,created_at,updated_at FROM public.chat_conversation WHERE assigned_staff_id IS NULL AND status=''waiting_agent''');
END $$;
CREATE FUNCTION public.get_staff_chat_receipt(p_request_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=pawpal_private.work_actor(); receipt jsonb;
BEGIN
 IF actor IS NULL OR NOT pawpal_private.has_permission('work.chat.handle') AND NOT pawpal_private.work_is_admin() THEN RAISE EXCEPTION 'work_chat_forbidden' USING ERRCODE='42501'; END IF;
 SELECT jsonb_build_object('request_id',id,'conversation_id',entity_id,'operation',CASE WHEN action='CHAT_ADMIN_RESOLVE' THEN 'resolve' ELSE description::jsonb->>'action' END)
 INTO receipt FROM public.audit_log WHERE id=p_request_id AND staff_id=actor AND entity_name='chat_conversation' AND action IN ('CHAT_ADMIN_OPERATION','CHAT_ADMIN_RESOLVE');
 RETURN receipt;
END $$;
REVOKE ALL ON FUNCTION public.get_staff_chat_receipt(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_chat_receipt(uuid) TO authenticated;
COMMIT;
