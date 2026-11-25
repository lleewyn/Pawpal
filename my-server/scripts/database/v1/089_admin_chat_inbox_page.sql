BEGIN;
CREATE OR REPLACE FUNCTION public.get_admin_chat_inbox_page(p_query text DEFAULT '',p_filter text DEFAULT 'all',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('chat_conversation.read') OR NOT pawpal_private.has_permission('chat_message.read') OR NOT pawpal_private.has_permission('customer_profile.read') OR NOT pawpal_private.has_permission('customer_phone.read') THEN RAISE EXCEPTION 'chat_inbox_forbidden' USING ERRCODE='42501';END IF;
 IF p_filter NOT IN ('all','urgent','active') OR p_page IS NULL OR p_page<1 OR length(p_query)>200 THEN RAISE EXCEPTION 'invalid_chat_page' USING ERRCODE='22023';END IF;
 WITH base AS MATERIALIZED (
 SELECT c.id,c.customer_id,c.status,c.is_urgent,c.sentiment_level,c.sentiment_trend,c.ai_summary,c.internal_note,c.assigned_staff_id,c.sla_deadline,c.created_at,c.updated_at,coalesce(c.is_urgent,false) OR coalesce(c.sentiment_level,2)>=4 urgent,
 (c.assigned_staff_id IS NOT NULL OR c.status='agent_handling') handover
 FROM public.chat_conversation c
 ), matched AS MATERIALIZED (
 SELECT c.* FROM base c WHERE (p_filter='all' OR (p_filter='urgent' AND c.urgent AND c.status NOT IN ('resolved','closed','completed')) OR (p_filter='active' AND c.handover))
 AND (btrim(coalesce(p_query,''))='' OR EXISTS(SELECT 1 FROM public.customer_profile p WHERE p.customer_id=c.customer_id AND lower(p.full_name) LIKE '%'||lower(btrim(p_query))||'%') OR EXISTS(SELECT 1 FROM public.customer_phone p WHERE p.customer_id=c.customer_id AND p.is_primary AND p.phone_number LIKE '%'||btrim(p_query)||'%'))
 ), meta AS (SELECT count(*) total,least(p_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched), selected AS (
 SELECT c.* FROM matched c ORDER BY c.updated_at DESC,c.id DESC OFFSET ((SELECT page FROM meta)-1)*10 LIMIT 10
 )
 SELECT jsonb_build_object('total',(SELECT total FROM meta),'page',(SELECT page FROM meta),'counts',jsonb_build_object('all',(SELECT count(*) FROM base),'urgent',(SELECT count(*) FROM base WHERE urgent AND status NOT IN ('resolved','closed','completed')),'active',(SELECT count(*) FROM base WHERE handover)),
 'rows',coalesce((SELECT jsonb_agg(to_jsonb(c)||jsonb_build_object('latest_message',(SELECT jsonb_build_object('id',m.id,'conversation_id',m.conversation_id,'sender_type',m.sender_type,'content',m.content,'created_at',m.created_at,'is_toxic',m.is_toxic) FROM public.chat_message m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1)) ORDER BY c.updated_at DESC,c.id DESC) FROM selected c),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_chat_inbox_page(text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_chat_inbox_page(text,text,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
