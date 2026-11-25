-- Chat compensation must bind the selected case, current actor and active policy.
CREATE OR REPLACE FUNCTION public.adjust_admin_chat_points(p_request uuid,p_conversation uuid,p_expected_updated_at timestamptz,p_policy uuid,p_points integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.chat_conversation; policy public.chatbot_compensation_policy; actor uuid; reason text; prior boolean;
BEGIN
 IF NOT pawpal_private.has_permission('chat_conversation.read') OR NOT pawpal_private.has_permission('chat_conversation.write')
 OR NOT pawpal_private.has_permission('chatbot_compensation_policy.read') OR NOT pawpal_private.has_permission('paw_point_transaction.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'chat_points_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_conversation IS NULL OR p_policy IS NULL OR p_expected_updated_at IS NULL OR p_points IS NULL OR p_points<=0 THEN RAISE EXCEPTION 'invalid_chat_points' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 SELECT * INTO c FROM public.chat_conversation WHERE id=p_conversation FOR UPDATE;
 IF NOT FOUND OR c.customer_id IS NULL OR c.assigned_staff_id IS DISTINCT FROM actor OR c.status<>'agent_handling' THEN RAISE EXCEPTION 'chat_take_required' USING ERRCODE='42501'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.paw_point_transaction WHERE idempotency_key='staff-adjust:'||actor::text||':'||p_request::text) INTO prior;
 IF NOT prior AND c.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'chat_changed' USING ERRCODE='PT409'; END IF;
 SELECT * INTO policy FROM public.chatbot_compensation_policy WHERE id=p_policy AND is_active FOR SHARE;
 IF NOT FOUND OR policy.approval_required OR policy.max_points IS NULL OR p_points>policy.max_points THEN RAISE EXCEPTION 'chat_compensation_requires_approval' USING ERRCODE='42501'; END IF;
 reason:=left(policy.issue_type,200)||' | Chat '||c.id||' | Policy '||policy.id;
 RETURN public.adjust_customer_points(c.customer_id,p_points,reason,p_request);
END $$;
REVOKE ALL ON FUNCTION public.adjust_admin_chat_points(uuid,uuid,timestamptz,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.adjust_admin_chat_points(uuid,uuid,timestamptz,uuid,integer) TO authenticated;
