-- Compatible with the existing reply RPC: it inserts the message before updating the ticket.
CREATE TABLE pawpal_private.complaint_reply_notice (
 message_id uuid NOT NULL REFERENCES public.support_ticket_message(id) ON DELETE CASCADE,
 staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), read_at timestamptz,
 kind text NOT NULL DEFAULT 'supplement' CHECK(kind IN ('supplement','resolution_reply')),
 PRIMARY KEY(message_id,staff_id)
);
CREATE INDEX complaint_reply_notice_staff_time ON pawpal_private.complaint_reply_notice(staff_id,created_at DESC,message_id);
REVOKE ALL ON pawpal_private.complaint_reply_notice FROM PUBLIC,anon,authenticated;

CREATE FUNCTION pawpal_private.record_complaint_reply_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE ticket public.support_ticket;
BEGIN
 IF NEW.sender_type<>'customer' OR NEW.is_internal THEN RETURN NULL; END IF;
 SELECT * INTO ticket FROM public.support_ticket WHERE id=NEW.ticket_id;
 IF ticket.status='waiting_customer' AND ticket.assigned_staff_id IS NOT NULL THEN
  INSERT INTO pawpal_private.complaint_reply_notice(message_id,staff_id)
  VALUES(NEW.id,ticket.assigned_staff_id) ON CONFLICT DO NOTHING;
 ELSIF ticket.status='resolved' THEN
  INSERT INTO pawpal_private.complaint_reply_notice(message_id,staff_id,kind)
  SELECT NEW.id,s.id,'resolution_reply' FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id
  WHERE s.employment_status='active' AND NOT s.must_change_password AND coalesce(u.banned_until<=now(),true)
   AND (SELECT count(*) FROM public.staff_role r WHERE r.staff_id=s.id)=1
   AND EXISTS(SELECT 1 FROM public.staff_role r WHERE r.staff_id=s.id AND r.role_code='ADMIN')
  ON CONFLICT DO NOTHING;
 END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.record_complaint_reply_notice() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER complaint_reply_notice AFTER INSERT ON public.support_ticket_message
FOR EACH ROW EXECUTE FUNCTION pawpal_private.record_complaint_reply_notice();

CREATE FUNCTION public.own_complaint_reply_notices()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=pawpal_private.work_actor(); BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'staff_required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object('unread',(SELECT count(*) FROM pawpal_private.complaint_reply_notice WHERE staff_id=actor AND read_at IS NULL),
 'items',coalesce((SELECT jsonb_agg(to_jsonb(n) ORDER BY (n.read_at IS NOT NULL),n.created_at DESC,n.message_id) FROM
  (SELECT r.message_id,r.created_at,r.read_at,r.kind,t.id AS ticket_id,t.ticket_code FROM pawpal_private.complaint_reply_notice r
   JOIN public.support_ticket_message m ON m.id=r.message_id JOIN public.support_ticket t ON t.id=m.ticket_id
   WHERE r.staff_id=actor ORDER BY (r.read_at IS NOT NULL),r.created_at DESC,r.message_id LIMIT 10)n),'[]'::jsonb));
END $$;
CREATE FUNCTION public.read_own_complaint_reply_notice(p_message uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=pawpal_private.work_actor(); BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'staff_required' USING ERRCODE='42501'; END IF;
 UPDATE pawpal_private.complaint_reply_notice SET read_at=clock_timestamp()
 WHERE message_id=p_message AND staff_id=actor AND read_at IS NULL;
END $$;
REVOKE ALL ON FUNCTION public.own_complaint_reply_notices(),public.read_own_complaint_reply_notice(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.own_complaint_reply_notices(),public.read_own_complaint_reply_notice(uuid) TO authenticated;
