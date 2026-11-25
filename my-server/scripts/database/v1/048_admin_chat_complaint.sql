BEGIN;
CREATE OR REPLACE FUNCTION public.create_chat_complaint(p_id uuid,p_conversation_id uuid,p_expected_updated_at timestamptz,p_ref_id uuid,p_category text,p_subject text,p_priority text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.chat_conversation; actor uuid; result uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('chat_conversation.read') OR NOT pawpal_private.has_permission('chat_conversation.write') THEN RAISE EXCEPTION 'chat_forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 SELECT * INTO c FROM public.chat_conversation WHERE id=p_conversation_id FOR UPDATE;
 IF NOT FOUND OR c.customer_id IS NULL THEN RAISE EXCEPTION 'chat_customer_required' USING ERRCODE='22023'; END IF;
 IF c.status<>'agent_handling' OR c.assigned_staff_id IS DISTINCT FROM actor THEN RAISE EXCEPTION 'chat_take_required' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.support_ticket WHERE id=p_id) AND c.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'chat_changed' USING ERRCODE='PT409'; END IF;
 result:=public.create_admin_complaint(p_id,c.customer_id,
 CASE WHEN p_category='order' THEN p_ref_id ELSE NULL END,
 CASE WHEN p_category='service' THEN p_ref_id ELSE NULL END,
 p_category,p_subject,'Hội thoại nguồn: '||c.id::text||E'\n'||p_subject,p_priority);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_chat_complaint(uuid,uuid,timestamptz,uuid,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_chat_complaint(uuid,uuid,timestamptz,uuid,text,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
