// Build a reviewable migration from the inspected live function definitions.
const fs=require('node:fs');
const inspected=JSON.parse(fs.readFileSync('artifacts/data-cleanup/chat-member-gate/inspection.private.json','utf8'));
const change=(source,from,to)=>{if(!source.includes(from))throw Error('Function source changed: '+from);return source.replace(from,to);};
const definition=name=>inspected.functions.find(f=>f.name===name).definition.replace(/\r\n/g,'\n');
const reads=JSON.parse(fs.readFileSync('artifacts/data-cleanup/chat-member-gate/reads.private.json','utf8'));
let inbox=reads.functions.find(f=>f.name==='get_admin_chat_inbox_page').definition.replace(/\r\n/g,'\n');
inbox=change(inbox,'SELECT c.id,c.customer_id,c.status,','SELECT pawpal_private.chat_customer_can_handoff(c.customer_id) can_handoff,c.id,c.customer_id,c.status,');
inbox=change(inbox,"p_filter='urgent' AND c.urgent","p_filter='urgent' AND c.can_handoff AND c.urgent");
inbox=change(inbox,"p_filter='active' AND c.handover","p_filter='active' AND c.can_handoff AND c.handover");
inbox=change(inbox,'FROM base WHERE urgent AND status','FROM base WHERE can_handoff AND urgent AND status');
inbox=change(inbox,'FROM base WHERE handover','FROM base WHERE can_handoff AND handover');
let post=definition('post_public_chat_message');
post=change(post,' INSERT INTO public.chat_message(id,conversation_id',` IF needs_handoff AND NOT pawpal_private.chat_customer_can_handoff(c.customer_id) THEN
  needs_handoff:=false;loop_handoff:=false;
  p_reply:='Để trò chuyện với nhân viên, bạn vui lòng đăng nhập hoặc thiết lập mật khẩu để trở thành thành viên tại [Đăng nhập](/login). Nội dung trao đổi vẫn được giữ. Nếu gặp khó khăn khi kích hoạt hoặc cần phản ánh thanh toán, bạn có thể gửi yêu cầu tại [Liên hệ](/contact).';
 END IF;
 INSERT INTO public.chat_message(id,conversation_id`);
let media=definition('chat_media_access');
media=change(media,'IF p_actor IS NULL THEN RETURN coalesce(', 'IF p_actor IS NULL THEN IF p_write THEN RETURN false;END IF;RETURN coalesce(');
media=change(media,'RETURN coalesce(actor_customer=c.customer_id,false);','RETURN coalesce(actor_customer=c.customer_id AND (NOT p_write OR pawpal_private.chat_customer_can_handoff(c.customer_id)),false);');
const sql=`BEGIN;
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

${post};
${media};

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
${inbox};
${change(reads.functions.find(f=>f.name==='get_admin_chat_inbox_view').definition,"jsonb_build_object('full_name'","jsonb_build_object('can_handoff',pawpal_private.chat_customer_can_handoff((r.value->>'customer_id')::uuid),'full_name'")};
NOTIFY pgrst,'reload schema';
COMMIT;
`;
fs.writeFileSync('scripts/database/v1/229_chat_member_handoff.sql',sql);
console.log('Built migration 229');
