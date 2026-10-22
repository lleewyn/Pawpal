BEGIN;
CREATE OR REPLACE FUNCTION public.get_admin_chat_inbox(p_limit integer DEFAULT 50,p_offset integer DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('chat_conversation.read') OR NOT pawpal_private.has_permission('chat_message.read') THEN RAISE EXCEPTION 'chat_inbox_forbidden' USING ERRCODE='42501'; END IF;
 IF p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 100 OR p_offset IS NULL OR p_offset<0 THEN RAISE EXCEPTION 'invalid_chat_page' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(row) ORDER BY row.updated_at DESC,row.id DESC),'[]'::jsonb) INTO result FROM (
  SELECT c.id,c.customer_id,c.status,c.is_urgent,c.sentiment_level,c.sentiment_trend,c.ai_summary,c.internal_note,c.assigned_staff_id,c.sla_deadline,c.created_at,c.updated_at,
   (SELECT jsonb_build_object('id',m.id,'conversation_id',m.conversation_id,'sender_type',m.sender_type,'sender_account_id',m.sender_account_id,'content',m.content,'created_at',m.created_at,'is_toxic',m.is_toxic)
    FROM public.chat_message m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1) latest_message
  FROM public.chat_conversation c ORDER BY c.updated_at DESC,c.id DESC OFFSET p_offset LIMIT p_limit
 ) row;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_chat_inbox(integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_chat_inbox(integer,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
