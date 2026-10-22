BEGIN;
CREATE OR REPLACE FUNCTION public.open_public_chat(p_id uuid,p_customer uuid,p_guest_hash text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE guest uuid; prior public.chat_conversation;
BEGIN
 IF p_id IS NULL OR (p_customer IS NULL AND coalesce(length(p_guest_hash),0)<>64) THEN RAISE EXCEPTION 'invalid_chat_identity' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,55));
 IF p_customer IS NULL THEN
  SELECT id INTO guest FROM public.guest_session WHERE token_hash=p_guest_hash AND revoked_at IS NULL AND expires_at>now() FOR UPDATE;
  IF guest IS NULL THEN INSERT INTO public.guest_session(token_hash,expires_at) VALUES(p_guest_hash,now()+interval '7 days') RETURNING id INTO guest; END IF;
 END IF;
 SELECT * INTO prior FROM public.chat_conversation WHERE id=p_id;
 IF FOUND THEN
  IF (prior.customer_id,prior.guest_session_id) IS DISTINCT FROM (p_customer,guest) THEN RAISE EXCEPTION 'chat_owner_conflict' USING ERRCODE='42501'; END IF;
  RETURN p_id;
 END IF;
 INSERT INTO public.chat_conversation(id,customer_id,guest_session_id,status,sentiment_level,sentiment_trend,channel) VALUES(p_id,p_customer,guest,'bot_handling',2,'stable','web');
 RETURN p_id;
END $$;
CREATE OR REPLACE FUNCTION public.post_public_chat_message(p_id uuid,p_conversation uuid,p_expected_at timestamptz,p_auth uuid,p_guest uuid,p_raw text,p_content text,p_toxic boolean,p_level integer,p_reply text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.chat_conversation; prior public.chat_message;
BEGIN
 IF p_id IS NULL OR coalesce(length(btrim(p_raw)),0) NOT BETWEEN 1 AND 2000 OR p_content IS NULL OR p_level NOT BETWEEN 1 AND 6 OR p_toxic IS NULL OR coalesce(length(p_reply),0)>16000 THEN RAISE EXCEPTION 'invalid_chat_message' USING ERRCODE='22023'; END IF;
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
 UPDATE public.chat_conversation SET sentiment_level=p_level,is_urgent=is_urgent OR p_level>=4,violation_count=violation_count+CASE WHEN p_toxic THEN 1 ELSE 0 END,updated_at=clock_timestamp() WHERE id=c.id;
 IF p_toxic THEN INSERT INTO public.chat_moderation_log(conversation_id,customer_id,violation_count,action_taken,notes) VALUES(c.id,c.customer_id,c.violation_count+1,'mask','Nội dung được lọc trước khi lưu'); END IF;
 RETURN p_id;
END $$;
CREATE OR REPLACE FUNCTION public.set_public_chat_mode(p_conversation uuid,p_mode text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.chat_conversation;
BEGIN
 IF p_mode IS NULL OR p_mode NOT IN ('waiting_agent','bot_handling') THEN RAISE EXCEPTION 'invalid_chat_mode' USING ERRCODE='22023'; END IF;
 SELECT * INTO c FROM public.chat_conversation WHERE id=p_conversation FOR UPDATE;
 IF NOT FOUND OR c.status IN ('agent_handling','resolved','closed','completed','blocked') THEN RAISE EXCEPTION 'chat_mode_conflict' USING ERRCODE='PT409'; END IF;
 IF c.status=p_mode THEN RETURN; END IF;
 UPDATE public.chat_conversation SET status=p_mode,assigned_staff_id=NULL,updated_at=clock_timestamp() WHERE id=c.id;
 INSERT INTO public.chat_message(conversation_id,sender_type,content,is_toxic,sentiment_score) VALUES(c.id,'system',CASE WHEN p_mode='waiting_agent' THEN 'Khách yêu cầu nhân viên hỗ trợ.' ELSE 'Khách quay lại hỗ trợ tự động.' END,false,2);
END $$;
REVOKE ALL ON FUNCTION public.open_public_chat(uuid,uuid,text),public.post_public_chat_message(uuid,uuid,timestamptz,uuid,uuid,text,text,boolean,integer,text),public.set_public_chat_mode(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.open_public_chat(uuid,uuid,text),public.post_public_chat_message(uuid,uuid,timestamptz,uuid,uuid,text,text,boolean,integer,text),public.set_public_chat_mode(uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
