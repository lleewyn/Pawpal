BEGIN;
CREATE OR REPLACE FUNCTION public.get_admin_chat_messages(p_conversation uuid,p_before_at timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF NOT pawpal_private.has_permission('chat_message.read') OR NOT pawpal_private.has_permission('chat_conversation.read') THEN RAISE EXCEPTION 'chat_forbidden' USING ERRCODE='42501'; END IF;
 IF p_conversation IS NULL OR (p_before_at IS NULL)<>(p_before_id IS NULL) THEN RAISE EXCEPTION 'invalid_chat_cursor' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at DESC,r.id DESC),'[]'::jsonb) INTO result FROM (
  SELECT m.id,m.conversation_id,m.sender_type,m.sender_account_id,m.content,m.is_toxic,m.created_at,
  CASE WHEN m.sender_type='staff' THEN (SELECT s.full_name FROM public.staff s WHERE s.auth_user_id=m.sender_account_id) ELSE NULL END AS staff_name
  FROM public.chat_message m WHERE m.conversation_id=p_conversation AND (p_before_at IS NULL OR (m.created_at,m.id)<(p_before_at,p_before_id)) ORDER BY m.created_at DESC,m.id DESC LIMIT 30
 ) r;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_chat_messages(uuid,timestamptz,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_chat_messages(uuid,timestamptz,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.touch_chat_parent() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 UPDATE public.chat_conversation SET updated_at=clock_timestamp() WHERE id=NEW.conversation_id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.touch_chat_parent() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS v1_chat_parent ON public.chat_message;
CREATE TRIGGER v1_chat_parent AFTER INSERT ON public.chat_message FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_chat_parent();
NOTIFY pgrst,'reload schema';
COMMIT;
