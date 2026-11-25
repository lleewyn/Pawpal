BEGIN;

ALTER TABLE pawpal_private.complaint_reply_notice DROP CONSTRAINT complaint_reply_notice_pkey,
 ADD PRIMARY KEY(message_id,staff_id),
 ADD COLUMN kind text NOT NULL DEFAULT 'supplement' CHECK(kind IN ('supplement','resolution_reply'));

CREATE OR REPLACE FUNCTION pawpal_private.record_complaint_reply_notice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE recipients uuid[];
BEGIN
 IF NEW.status<>'processing' OR NEW.customer_followup_message_id IS NULL
 OR NEW.customer_followup_message_id IS NOT DISTINCT FROM OLD.customer_followup_message_id THEN RETURN NULL; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.support_ticket_message WHERE id=NEW.customer_followup_message_id AND ticket_id=NEW.id
  AND sender_type='customer' AND NOT is_internal) THEN RETURN NULL; END IF;

 IF OLD.status='waiting_customer' AND NEW.assigned_staff_id IS NOT NULL THEN
  INSERT INTO pawpal_private.complaint_reply_notice(message_id,staff_id)
  VALUES(NEW.customer_followup_message_id,NEW.assigned_staff_id)
  ON CONFLICT(message_id,staff_id) DO NOTHING;
 ELSIF OLD.status='resolved' THEN
  WITH inserted AS (
   INSERT INTO pawpal_private.complaint_reply_notice(message_id,staff_id,kind)
   SELECT NEW.customer_followup_message_id,s.id,'resolution_reply'
   FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id
   WHERE s.employment_status='active' AND NOT s.must_change_password
    AND coalesce(u.banned_until<=now(),true)
    AND (SELECT count(*) FROM public.staff_role r WHERE r.staff_id=s.id)=1
    AND EXISTS(SELECT 1 FROM public.staff_role r WHERE r.staff_id=s.id AND r.role_code='ADMIN')
   ON CONFLICT(message_id,staff_id) DO NOTHING RETURNING staff_id
  )
  SELECT array_agg(s.auth_user_id) INTO recipients FROM inserted i JOIN public.staff s ON s.id=i.staff_id;
  IF recipients IS NOT NULL THEN PERFORM pawpal_private.emit_workspace_signal(recipients,'support'); END IF;
 END IF;
 RETURN NULL;
END $$;

DO $$
DECLARE body text:=pg_get_functiondef('public.own_complaint_reply_notices()'::regprocedure);
 needle text:='SELECT r.message_id,r.created_at,r.read_at,t.id';
BEGIN
 IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'unexpected_complaint_notice_projection'; END IF;
 EXECUTE replace(body,needle,'SELECT r.message_id,r.created_at,r.read_at,r.kind,t.id');
END $$;

DO $$
DECLARE body text:=pg_get_functiondef('public.reply_own_support_ticket(uuid,uuid,text)'::regprocedure);
 needle text:='closed_at=NULL,auto_close_reason=NULL,customer_reply_due_at=NULL,';
BEGIN
 IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'unexpected_support_reopen_definition'; END IF;
 EXECUTE replace(body,needle,needle||'priority=CASE WHEN t.status=''resolved'' THEN ''urgent'' ELSE priority END,');
END $$;

DO $$
DECLARE body text:=pg_get_functiondef('public.rate_own_support_ticket(uuid,integer,text)'::regprocedure);
 needle text:='UPDATE public.support_ticket SET rating=p_rating,rating_comment=p_comment,updated_at=clock_timestamp() WHERE id=t.id;';
BEGIN
 IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'unexpected_support_rating_definition'; END IF;
 EXECUTE replace(body,needle,$new$UPDATE public.support_ticket SET rating=p_rating,rating_comment=p_comment,
   status=CASE WHEN t.status='resolved' THEN 'closed' ELSE status END,
   closed_at=CASE WHEN t.status='resolved' THEN clock_timestamp() ELSE closed_at END,
   updated_at=clock_timestamp() WHERE id=t.id;
  IF t.status='resolved' THEN
   INSERT INTO public.support_ticket_message(ticket_id,sender_type,content,is_internal)
   VALUES(t.id,'system','Khách đã xác nhận đóng phiếu và gửi đánh giá.',false);
  END IF;$new$);
END $$;

NOTIFY pgrst,'reload schema';
COMMIT;
