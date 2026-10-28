BEGIN;
DROP TRIGGER IF EXISTS reset_unhandled_chat_on_resume ON public.chat_conversation;
DROP FUNCTION IF EXISTS pawpal_private.reset_unhandled_chat_on_resume();
DROP FUNCTION IF EXISTS public.post_public_chat_message(uuid,uuid,timestamptz,uuid,uuid,text,text,boolean,integer,text,boolean,boolean);
CREATE OR REPLACE FUNCTION public.post_public_chat_message(p_id uuid, p_conversation uuid, p_expected_at timestamp with time zone, p_auth uuid, p_guest uuid, p_raw text, p_content text, p_toxic boolean, p_level integer, p_reply text, p_handover boolean DEFAULT false)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE c public.chat_conversation; prior public.chat_message;
BEGIN
 IF p_id IS NULL OR coalesce(length(btrim(p_raw)),0) NOT BETWEEN 1 AND 2000 OR p_content IS NULL OR p_level NOT BETWEEN 1 AND 6 OR p_toxic IS NULL OR p_handover IS NULL OR coalesce(length(p_reply),0)>16000 THEN RAISE EXCEPTION 'invalid_chat_message' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,55));
 SELECT * INTO prior FROM public.chat_message WHERE id=p_id;
 IF FOUND THEN
  IF (prior.conversation_id,prior.sender_account_id,prior.sender_guest_session_id,prior.raw_content) IS DISTINCT FROM (p_conversation,p_auth,p_guest,p_raw) THEN RAISE EXCEPTION 'chat_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 SELECT * INTO c FROM public.chat_conversation WHERE id=p_conversation FOR UPDATE;
 IF NOT FOUND OR c.updated_at IS DISTINCT FROM p_expected_at THEN RAISE EXCEPTION 'chat_changed' USING ERRCODE='PT409'; END IF;
 IF c.status IN ('closed','resolved','completed','blocked') OR c.blocked_until>now() THEN RAISE EXCEPTION 'chat_not_open' USING ERRCODE='22023'; END IF;
 IF NOT ((p_auth IS NOT NULL AND p_guest IS NULL AND EXISTS(SELECT 1 FROM public.customer WHERE id=c.customer_id AND auth_user_id=p_auth AND customer_status='active')) OR (p_auth IS NULL AND p_guest IS NOT NULL AND c.customer_id IS NULL AND c.guest_session_id=p_guest)) THEN RAISE EXCEPTION 'chat_forbidden' USING ERRCODE='42501'; END IF;
 INSERT INTO public.chat_message(id,conversation_id,sender_type,sender_account_id,sender_guest_session_id,raw_content,content,is_toxic,sentiment_score,created_at)
 VALUES(p_id,c.id,CASE WHEN p_auth IS NULL THEN 'guest' ELSE 'customer' END,p_auth,p_guest,p_raw,p_content,p_toxic,p_level,clock_timestamp());
 IF p_reply IS NOT NULL THEN
  IF c.status IN ('waiting_agent','agent_handling') THEN RAISE EXCEPTION 'chat_changed' USING ERRCODE='PT409'; END IF;
  INSERT INTO public.chat_message(conversation_id,sender_type,content,is_toxic,sentiment_score,metadata,created_at) VALUES(c.id,'bot',p_reply,false,2,jsonb_build_object('request_id',p_id),clock_timestamp());
 END IF;
 UPDATE public.chat_conversation SET status=CASE WHEN (p_handover OR p_level>=4) AND status NOT IN ('waiting_agent','agent_handling') THEN 'waiting_agent' ELSE status END,assigned_staff_id=CASE WHEN (p_handover OR p_level>=4) AND status NOT IN ('waiting_agent','agent_handling') THEN NULL ELSE assigned_staff_id END,sentiment_level=p_level,is_urgent=is_urgent OR p_level>=4,violation_count=violation_count+CASE WHEN p_toxic THEN 1 ELSE 0 END,updated_at=clock_timestamp() WHERE id=c.id;
 IF p_toxic THEN INSERT INTO public.chat_moderation_log(conversation_id,customer_id,violation_count,action_taken,notes) VALUES(c.id,c.customer_id,c.violation_count+1,'mask','Nội dung được lọc trước khi lưu'); END IF;
 RETURN p_id;
END $function$
;
REVOKE ALL ON FUNCTION public.post_public_chat_message(uuid,uuid,timestamptz,uuid,uuid,text,text,boolean,integer,text,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.post_public_chat_message(uuid,uuid,timestamptz,uuid,uuid,text,text,boolean,integer,text,boolean) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
