-- Eight-argument overload preserves the seven-argument caller and the complete complaint body.
BEGIN;
CREATE FUNCTION public.create_chat_complaint(p_id uuid,p_conversation_id uuid,p_expected_updated_at timestamptz,p_ref_id uuid,p_category text,p_subject text,p_priority text,p_content text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.chat_conversation; actor uuid:=pawpal_private.work_actor(); result uuid; origin public.audit_log;
BEGIN
 PERFORM pawpal_private.work_guard_rpc('create_chat_complaint',jsonb_build_object('p_id',p_id,'p_conversation_id',p_conversation_id,'p_ref_id',p_ref_id));
 IF actor IS NULL OR NOT pawpal_private.work_rpc_permission('create_chat_complaint','chat_conversation.read')
  OR NOT pawpal_private.work_rpc_permission('create_chat_complaint','chat_conversation.write') THEN RAISE EXCEPTION 'chat_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR coalesce(length(btrim(p_content)),0) NOT BETWEEN 2 AND 8000 THEN RAISE EXCEPTION 'invalid_complaint_content' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM public.chat_conversation WHERE id=p_conversation_id FOR UPDATE;
 IF NOT FOUND OR c.customer_id IS NULL THEN RAISE EXCEPTION 'chat_customer_required' USING ERRCODE='22023'; END IF;
 IF c.status<>'agent_handling' OR c.assigned_staff_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'chat_take_required' USING ERRCODE='42501'; END IF;
 -- Use the same UUID lock as the nested ticket transaction, including across different conversations.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,39));
 SELECT * INTO origin FROM public.audit_log WHERE entity_id=p_id AND entity_name='support_ticket' AND action='CREATE_CHAT_COMPLAINT' ORDER BY created_at,id LIMIT 1;
 IF EXISTS(SELECT 1 FROM public.support_ticket WHERE id=p_id) THEN
  IF origin.id IS NULL OR origin.staff_id IS DISTINCT FROM actor OR origin.description IS DISTINCT FROM jsonb_build_object('conversation_id',c.id)::text THEN
   RAISE EXCEPTION 'chat_complaint_request_conflict' USING ERRCODE='PT409'; END IF;
 ELSIF p_expected_updated_at IS NULL OR c.updated_at IS DISTINCT FROM p_expected_updated_at THEN
  RAISE EXCEPTION 'chat_changed' USING ERRCODE='PT409';
 END IF;
 result:=public.create_admin_complaint(p_id,c.customer_id,
  CASE WHEN p_category='order' THEN p_ref_id ELSE NULL END,
  CASE WHEN p_category='service' THEN p_ref_id ELSE NULL END,
  p_category,p_subject,p_content,p_priority);
 IF origin.id IS NULL THEN
  INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
  VALUES(actor,'CREATE_CHAT_COMPLAINT','support_ticket',result,jsonb_build_object('conversation_id',c.id)::text);
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_chat_complaint(uuid,uuid,timestamptz,uuid,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_chat_complaint(uuid,uuid,timestamptz,uuid,text,text,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
