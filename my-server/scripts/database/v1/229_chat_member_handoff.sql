BEGIN;
-- Membership means a completed, active password account, independent of loyalty tier.
CREATE OR REPLACE FUNCTION pawpal_private.chat_customer_can_handoff(p_customer uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.customer c JOIN auth.users u ON u.id=c.auth_user_id
 WHERE c.id=p_customer AND c.customer_status='active' AND length(coalesce(u.encrypted_password,''))>0
 AND NOT coalesce(u.is_anonymous,false) AND coalesce(u.banned_until<=now(),true) AND u.deleted_at IS NULL);
$$;
REVOKE ALL ON FUNCTION pawpal_private.chat_customer_can_handoff(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION pawpal_private.chat_customer_can_handoff(uuid) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.public_chat_membership(p_auth uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.customer c WHERE c.auth_user_id=p_auth AND pawpal_private.chat_customer_can_handoff(c.id));
$$;
REVOKE ALL ON FUNCTION public.public_chat_membership(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.public_chat_membership(uuid) TO service_role;

CREATE OR REPLACE FUNCTION pawpal_private.guard_chat_member_handoff()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.status IN ('waiting_agent','agent_handling') AND NOT pawpal_private.chat_customer_can_handoff(NEW.customer_id) THEN
  RAISE EXCEPTION 'chat_membership_required' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_chat_member_handoff() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS chat_member_handoff_guard ON public.chat_conversation;
CREATE TRIGGER chat_member_handoff_guard BEFORE INSERT OR UPDATE OF status,customer_id,assigned_staff_id ON public.chat_conversation
FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_chat_member_handoff();

CREATE OR REPLACE FUNCTION public.post_public_chat_message(p_id uuid, p_conversation uuid, p_expected_at timestamp with time zone, p_auth uuid, p_guest uuid, p_raw text, p_content text, p_toxic boolean, p_level integer, p_reply text, p_handover boolean DEFAULT false, p_understood boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
 IF needs_handoff AND NOT pawpal_private.chat_customer_can_handoff(c.customer_id) THEN
  needs_handoff:=false;loop_handoff:=false;
  p_reply:='Để trò chuyện với nhân viên, bạn vui lòng đăng nhập hoặc thiết lập mật khẩu để trở thành thành viên tại [Đăng nhập](/login). Nội dung trao đổi vẫn được giữ. Nếu gặp khó khăn khi kích hoạt hoặc cần phản ánh thanh toán, bạn có thể gửi yêu cầu tại [Liên hệ](/contact).';
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
END $function$
;
CREATE OR REPLACE FUNCTION pawpal_private.chat_media_access(p_actor uuid, p_hash text, p_conversation uuid, p_write boolean DEFAULT true)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE c public.chat_conversation;actor_staff uuid;actor_customer uuid;
BEGIN
 SELECT * INTO c FROM public.chat_conversation WHERE id=p_conversation;
 IF NOT FOUND OR (p_write AND (c.status IN ('closed','resolved','completed','blocked') OR c.blocked_until>now())) THEN RETURN false;END IF;
 IF p_actor IS NULL THEN IF p_write THEN RETURN false;END IF;RETURN coalesce(c.customer_id IS NULL AND c.guest_session_id=pawpal_private.chat_media_guest(p_hash),false);END IF;
 IF p_hash IS NOT NULL THEN RETURN false;END IF;
 actor_staff:=pawpal_private.media_staff(p_actor);
 IF actor_staff IS NOT NULL THEN
  RETURN coalesce(EXISTS(SELECT 1 FROM public.staff_role r WHERE r.staff_id=actor_staff AND
   ((r.role_code='ADMIN' AND NOT p_write) OR (c.assigned_staff_id=actor_staff AND (NOT p_write OR c.status='agent_handling') AND
    (r.role_code='ADMIN' OR EXISTS(SELECT 1 FROM public.role_permission WHERE role_code=r.role_code AND permission_code='work.chat.handle'))))),false);
 END IF;
 actor_customer:=pawpal_private.evidence_customer(p_actor);
 RETURN coalesce(actor_customer=c.customer_id AND (NOT p_write OR pawpal_private.chat_customer_can_handoff(c.customer_id)),false);
END $function$
;

-- Auth identity and possession of the original live guest secret are both required.
CREATE OR REPLACE FUNCTION public.claim_public_chat(p_auth uuid,p_guest_hash text,p_conversation uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid;guest_id uuid;c public.chat_conversation;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=p_auth AND pawpal_private.chat_customer_can_handoff(id);
 IF owner_id IS NULL THEN RAISE EXCEPTION 'chat_membership_required' USING ERRCODE='42501';END IF;
 SELECT id INTO guest_id FROM public.guest_session WHERE token_hash=p_guest_hash AND revoked_at IS NULL AND expires_at>now() FOR UPDATE;
 IF guest_id IS NULL THEN RAISE EXCEPTION 'chat_claim_forbidden' USING ERRCODE='42501';END IF;
 SELECT * INTO c FROM public.chat_conversation WHERE id=p_conversation FOR UPDATE;
 IF NOT FOUND OR c.guest_session_id IS DISTINCT FROM guest_id OR (c.customer_id IS NOT NULL AND c.customer_id<>owner_id) THEN
  RAISE EXCEPTION 'chat_claim_forbidden' USING ERRCODE='42501';
 END IF;
 IF c.customer_id=owner_id THEN RETURN c.id;END IF;
 IF c.status NOT IN ('bot_handling','waiting_agent') THEN RAISE EXCEPTION 'chat_claim_changed' USING ERRCODE='PT409';END IF;
 UPDATE public.chat_conversation SET customer_id=owner_id,updated_at=clock_timestamp() WHERE id=c.id;
 RETURN c.id;
END $$;
REVOKE ALL ON FUNCTION public.claim_public_chat(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_public_chat(uuid,text,uuid) TO service_role;

-- Enrich only the existing bounded page, without downloading account details.
CREATE OR REPLACE FUNCTION public.get_admin_chat_inbox_page(p_query text DEFAULT ''::text, p_filter text DEFAULT 'all'::text, p_page integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('chat_conversation.read') OR NOT pawpal_private.has_permission('chat_message.read') OR NOT pawpal_private.has_permission('customer_profile.read') OR NOT pawpal_private.has_permission('customer_phone.read') THEN RAISE EXCEPTION 'chat_inbox_forbidden' USING ERRCODE='42501';END IF;
 IF p_filter NOT IN ('all','urgent','active') OR p_page IS NULL OR p_page<1 OR length(p_query)>200 THEN RAISE EXCEPTION 'invalid_chat_page' USING ERRCODE='22023';END IF;
 WITH base AS MATERIALIZED (
 SELECT pawpal_private.chat_customer_can_handoff(c.customer_id) can_handoff,c.id,c.customer_id,c.status,c.is_urgent,c.sentiment_level,c.sentiment_trend,c.ai_summary,c.internal_note,c.assigned_staff_id,c.sla_deadline,c.created_at,c.updated_at,coalesce(c.is_urgent,false) OR coalesce(c.sentiment_level,2)>=4 urgent,
 (c.assigned_staff_id IS NOT NULL OR c.status='agent_handling') handover
 FROM public.chat_conversation c
 ), matched AS MATERIALIZED (
 SELECT c.* FROM base c WHERE (p_filter='all' OR (p_filter='urgent' AND c.can_handoff AND c.urgent AND c.status NOT IN ('resolved','closed','completed')) OR (p_filter='active' AND c.can_handoff AND c.handover))
 AND (btrim(coalesce(p_query,''))='' OR EXISTS(SELECT 1 FROM public.customer_profile p WHERE p.customer_id=c.customer_id AND lower(p.full_name) LIKE '%'||lower(btrim(p_query))||'%') OR EXISTS(SELECT 1 FROM public.customer_phone p WHERE p.customer_id=c.customer_id AND p.is_primary AND p.phone_number LIKE '%'||btrim(p_query)||'%'))
 ), meta AS (SELECT count(*) total,least(p_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched), selected AS (
 SELECT c.* FROM matched c ORDER BY c.updated_at DESC,c.id DESC OFFSET ((SELECT page FROM meta)-1)*10 LIMIT 10
 )
 SELECT jsonb_build_object('total',(SELECT total FROM meta),'page',(SELECT page FROM meta),'counts',jsonb_build_object('all',(SELECT count(*) FROM base),'urgent',(SELECT count(*) FROM base WHERE can_handoff AND urgent AND status NOT IN ('resolved','closed','completed')),'active',(SELECT count(*) FROM base WHERE can_handoff AND handover)),
 'rows',coalesce((SELECT jsonb_agg(to_jsonb(c)||jsonb_build_object('latest_message',(SELECT jsonb_build_object('id',m.id,'conversation_id',m.conversation_id,'sender_type',m.sender_type,'content',m.content,'created_at',m.created_at,'is_toxic',m.is_toxic) FROM public.chat_message m WHERE m.conversation_id=c.id ORDER BY m.created_at DESC,m.id DESC LIMIT 1)) ORDER BY c.updated_at DESC,c.id DESC) FROM selected c),'[]'::jsonb)) INTO result;
 RETURN result;
END $function$
;
CREATE OR REPLACE FUNCTION public.get_admin_chat_inbox_view(p_query text DEFAULT ''::text, p_filter text DEFAULT 'all'::text, p_page integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
 SET statement_timeout TO '5s'
 SET lock_timeout TO '1s'
AS $function$
DECLARE result jsonb; enriched jsonb;
BEGIN
 IF p_query IS NULL OR length(p_query)>200 OR p_filter IS NULL OR p_filter NOT IN ('all','urgent','active') OR p_page IS NULL OR p_page<1 THEN RAISE EXCEPTION 'invalid_chat_page' USING ERRCODE='22023'; END IF;
 PERFORM pawpal_private.admit_chat_panel_read();
 IF NOT pawpal_private.has_permission('customer.read') THEN RAISE EXCEPTION 'chat_inbox_forbidden' USING ERRCODE='42501'; END IF;
 result:=public.get_admin_chat_inbox_page(p_query,p_filter,p_page);
 SELECT coalesce(jsonb_agg(r.value||jsonb_build_object('customer_profile',
  jsonb_build_object('can_handoff',pawpal_private.chat_customer_can_handoff((r.value->>'customer_id')::uuid),'full_name',(SELECT full_name FROM public.customer_profile WHERE customer_id=(r.value->>'customer_id')::uuid LIMIT 1),
  'email',(SELECT contact_email FROM public.customer WHERE id=(r.value->>'customer_id')::uuid),
  'phone',(SELECT phone_number FROM public.customer_phone WHERE customer_id=(r.value->>'customer_id')::uuid AND is_primary ORDER BY id LIMIT 1))) ORDER BY r.ordinality),'[]'::jsonb)
 INTO enriched FROM jsonb_array_elements(result->'rows') WITH ORDINALITY r;
 result:=jsonb_set(result,'{rows}',enriched);
 IF octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_panel_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $function$
;
NOTIFY pgrst,'reload schema';
COMMIT;
