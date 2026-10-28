BEGIN;
-- Consecutive unhandled turns are persisted under the existing conversation lock.
ALTER TABLE public.chat_conversation ADD COLUMN IF NOT EXISTS bot_unhandled_count integer NOT NULL DEFAULT 0 CHECK(bot_unhandled_count>=0);
DROP FUNCTION IF EXISTS public.post_public_chat_message(uuid,uuid,timestamptz,uuid,uuid,text,text,boolean,integer,text,boolean);
CREATE OR REPLACE FUNCTION public.post_public_chat_message(p_id uuid,p_conversation uuid,p_expected_at timestamptz,p_auth uuid,p_guest uuid,p_raw text,p_content text,p_toxic boolean,p_level integer,p_reply text,p_handover boolean DEFAULT false,p_understood boolean DEFAULT true)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.chat_conversation; prior public.chat_message; missed integer; threshold integer; loop_sla integer; needs_handoff boolean; loop_handoff boolean:=false;
BEGIN
 IF p_id IS NULL OR coalesce(length(btrim(p_raw)),0) NOT BETWEEN 1 AND 2000 OR p_content IS NULL OR p_level NOT BETWEEN 1 AND 6 OR p_toxic IS NULL OR p_handover IS NULL OR p_understood IS NULL OR coalesce(length(p_reply),0)>16000 THEN RAISE EXCEPTION 'invalid_chat_message' USING ERRCODE='22023'; END IF;
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
 missed:=c.bot_unhandled_count;needs_handoff:=p_handover OR p_level>=4;
 IF c.status NOT IN ('waiting_agent','agent_handling') AND p_reply IS NOT NULL AND NOT needs_handoff THEN
  IF p_understood THEN missed:=0;ELSE missed:=least(missed::bigint+1,1000000)::integer;END IF;
  SELECT least(1000000,ceil(threshold_value))::integer,sla_seconds INTO threshold,loop_sla FROM public.chatbot_handover_rule WHERE is_active AND trigger_type='bot_loop' AND threshold_value>0 ORDER BY threshold_value,sla_seconds,id LIMIT 1;
  IF missed>=coalesce(threshold,3) THEN
   needs_handoff:=true;loop_handoff:=true;
   p_reply:='PawPal vẫn chưa hiểu rõ vấn đề sau nhiều lần trao đổi. Hội thoại được chuyển cho nhân viên hỗ trợ để tránh hỏi lại bạn.';
  END IF;
 END IF;
 INSERT INTO public.chat_message(id,conversation_id,sender_type,sender_account_id,sender_guest_session_id,raw_content,content,is_toxic,sentiment_score,created_at)
 VALUES(p_id,c.id,CASE WHEN p_auth IS NULL THEN 'guest' ELSE 'customer' END,p_auth,p_guest,p_raw,p_content,p_toxic,p_level,clock_timestamp());
 IF p_reply IS NOT NULL THEN
  IF c.status IN ('waiting_agent','agent_handling') THEN RAISE EXCEPTION 'chat_changed' USING ERRCODE='PT409'; END IF;
  INSERT INTO public.chat_message(conversation_id,sender_type,content,is_toxic,sentiment_score,metadata,created_at) VALUES(c.id,'bot',p_reply,false,2,jsonb_build_object('request_id',p_id,'understood',p_understood,'handover_reason',CASE WHEN loop_handoff THEN 'bot_loop' ELSE NULL END),clock_timestamp());
 END IF;
 UPDATE public.chat_conversation SET status=CASE WHEN needs_handoff AND status NOT IN ('waiting_agent','agent_handling') THEN 'waiting_agent' ELSE status END,assigned_staff_id=CASE WHEN needs_handoff AND status NOT IN ('waiting_agent','agent_handling') THEN NULL ELSE assigned_staff_id END,bot_unhandled_count=missed,sentiment_level=p_level,is_urgent=is_urgent OR p_level>=4 OR loop_handoff,violation_count=violation_count+CASE WHEN p_toxic THEN 1 ELSE 0 END,updated_at=clock_timestamp() WHERE id=c.id;
 IF loop_handoff AND loop_sla IS NOT NULL THEN UPDATE public.chat_conversation SET sla_deadline=clock_timestamp()+loop_sla*interval '1 second' WHERE id=c.id; END IF;
 IF p_toxic THEN INSERT INTO public.chat_moderation_log(conversation_id,customer_id,violation_count,action_taken,notes) VALUES(c.id,c.customer_id,c.violation_count+1,'mask','Nội dung được lọc trước khi lưu'); END IF;
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.post_public_chat_message(uuid,uuid,timestamptz,uuid,uuid,text,text,boolean,integer,text,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.post_public_chat_message(uuid,uuid,timestamptz,uuid,uuid,text,text,boolean,integer,text,boolean,boolean) TO service_role;
CREATE OR REPLACE FUNCTION pawpal_private.reset_unhandled_chat_on_resume()
RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.status='bot_handling' AND OLD.status IS DISTINCT FROM NEW.status THEN NEW.bot_unhandled_count:=0; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.reset_unhandled_chat_on_resume() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS reset_unhandled_chat_on_resume ON public.chat_conversation;
CREATE TRIGGER reset_unhandled_chat_on_resume BEFORE UPDATE OF status ON public.chat_conversation
 FOR EACH ROW EXECUTE FUNCTION pawpal_private.reset_unhandled_chat_on_resume();
NOTIFY pgrst,'reload schema';
COMMIT;
