BEGIN;
CREATE OR REPLACE FUNCTION public.save_chat_feedback(p_conversation uuid,p_score integer,p_comment text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE existing public.chat_feedback; result uuid;
BEGIN
 IF p_score IS NULL OR p_score NOT BETWEEN 1 AND 5 OR p_comment IS NULL OR length(p_comment)>2000 THEN RAISE EXCEPTION 'invalid_feedback' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.chat_conversation WHERE id=p_conversation AND status IN ('resolved','closed','completed') FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.chat_message WHERE conversation_id=p_conversation AND metadata->>'type'='csat_invitation') THEN RAISE EXCEPTION 'feedback_not_available' USING ERRCODE='22023'; END IF;
 SELECT * INTO existing FROM public.chat_feedback WHERE conversation_id=p_conversation;
 IF FOUND THEN
  IF existing.score<>p_score OR existing.comment IS DISTINCT FROM p_comment THEN RAISE EXCEPTION 'feedback_already_submitted' USING ERRCODE='PT409'; END IF;
  RETURN existing.id;
 END IF;
 INSERT INTO public.chat_feedback(conversation_id,score,comment) VALUES(p_conversation,p_score,p_comment) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_chat_feedback(uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_chat_feedback(uuid,integer,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
