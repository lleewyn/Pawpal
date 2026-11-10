BEGIN;

CREATE TABLE pawpal_private.complaint_reply_notice (
 message_id uuid PRIMARY KEY REFERENCES public.support_ticket_message(id) ON DELETE CASCADE,
 staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 read_at timestamptz
);
CREATE INDEX complaint_reply_notice_staff_time ON pawpal_private.complaint_reply_notice(staff_id,created_at DESC,message_id);
REVOKE ALL ON pawpal_private.complaint_reply_notice FROM PUBLIC,anon,authenticated;

CREATE FUNCTION pawpal_private.record_complaint_reply_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.status='waiting_customer' AND NEW.status='processing'
 AND NEW.customer_followup_message_id IS DISTINCT FROM OLD.customer_followup_message_id
 AND NEW.assigned_staff_id IS NOT NULL THEN
  INSERT INTO pawpal_private.complaint_reply_notice(message_id,staff_id)
  SELECT m.id,NEW.assigned_staff_id FROM public.support_ticket_message m
  WHERE m.id=NEW.customer_followup_message_id AND m.ticket_id=NEW.id
    AND m.sender_type='customer' AND NOT m.is_internal
  ON CONFLICT(message_id) DO NOTHING;
 END IF;
 RETURN NULL;
END $$;

CREATE TRIGGER complaint_reply_notice AFTER UPDATE OF customer_followup_message_id
ON public.support_ticket FOR EACH ROW EXECUTE FUNCTION pawpal_private.record_complaint_reply_notice();

CREATE FUNCTION public.own_complaint_reply_notices()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=pawpal_private.work_actor();
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'staff_required' USING ERRCODE='42501'; END IF;
 RETURN jsonb_build_object(
  'unread',(SELECT count(*) FROM pawpal_private.complaint_reply_notice WHERE staff_id=actor AND read_at IS NULL),
  'items',coalesce((SELECT jsonb_agg(to_jsonb(n) ORDER BY (n.read_at IS NOT NULL),n.created_at DESC,n.message_id)
   FROM (SELECT r.message_id,r.created_at,r.read_at,t.id AS ticket_id,t.ticket_code
    FROM pawpal_private.complaint_reply_notice r
    JOIN public.support_ticket_message m ON m.id=r.message_id
    JOIN public.support_ticket t ON t.id=m.ticket_id
    WHERE r.staff_id=actor
    ORDER BY (r.read_at IS NOT NULL),r.created_at DESC,r.message_id LIMIT 10) n),'[]'::jsonb));
END $$;

CREATE FUNCTION public.read_own_complaint_reply_notice(p_message uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=pawpal_private.work_actor();
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'staff_required' USING ERRCODE='42501'; END IF;
 UPDATE pawpal_private.complaint_reply_notice SET read_at=clock_timestamp()
 WHERE message_id=p_message AND staff_id=actor AND read_at IS NULL;
END $$;

REVOKE ALL ON FUNCTION pawpal_private.record_complaint_reply_notice() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.own_complaint_reply_notices(),public.read_own_complaint_reply_notice(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.own_complaint_reply_notices(),public.read_own_complaint_reply_notice(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
