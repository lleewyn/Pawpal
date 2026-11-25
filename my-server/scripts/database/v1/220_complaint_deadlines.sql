BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
ALTER TABLE public.support_ticket ADD COLUMN auto_close_reason text,
 ADD COLUMN customer_reminder_due_at timestamptz;

CREATE FUNCTION pawpal_private.complaint_reopen_until(t public.support_ticket)
RETURNS timestamptz LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$
 SELECT CASE
  WHEN t.status='resolved' THEN t.resolved_at+interval '72 hours'
  WHEN t.status='closed' AND t.auto_close_reason='no_customer_reply' THEN t.closed_at+interval '168 hours'
 END
$$;

CREATE FUNCTION pawpal_private.run_complaint_deadlines()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE t public.support_ticket; at_time timestamptz:=clock_timestamp(); reason text; note text;
BEGIN
 FOR t IN
  SELECT * FROM public.support_ticket
  WHERE (status='waiting_customer' AND customer_reply_due_at IS NOT NULL AND
    (customer_reply_due_at<=at_time OR (customer_id IS NOT NULL AND customer_reply_due_at-interval '24 hours'<=at_time
      AND customer_reminder_due_at IS DISTINCT FROM customer_reply_due_at)))
   OR (status='resolved' AND resolved_at+interval '72 hours'<=at_time AND (rating IS NULL OR rating>=3))
  ORDER BY coalesce(customer_reply_due_at,resolved_at+interval '72 hours'),id
  LIMIT 200 FOR UPDATE SKIP LOCKED
 LOOP
  IF t.status='waiting_customer' AND t.customer_reply_due_at>at_time THEN
   INSERT INTO public.notification(customer_id,notification_type,title,content,support_ticket_id,source_event)
   VALUES(t.customer_id,'support_status','Nhắc bổ sung thông tin','Vui lòng bổ sung thông tin cho phiếu '||t.ticket_code||' trước '||
    to_char(t.customer_reply_due_at AT TIME ZONE 'Asia/Bangkok','DD/MM/YYYY HH24:MI')||'.',t.id,
    'support-reminder:'||t.id||':'||extract(epoch FROM t.customer_reply_due_at)::text)
   ON CONFLICT(source_event) WHERE source_event IS NOT NULL DO NOTHING;
   UPDATE public.support_ticket SET customer_reminder_due_at=t.customer_reply_due_at WHERE id=t.id;
   CONTINUE;
  END IF;
  reason:=CASE WHEN t.status='waiting_customer' THEN 'no_customer_reply' ELSE 'resolved_expired' END;
  note:=CASE WHEN reason='no_customer_reply' THEN 'Khách hàng không bổ sung thông tin trong 72 giờ.' ELSE 'Phiếu đã được giải quyết 3 ngày và không có phản hồi thêm.' END;
  UPDATE public.support_ticket SET status='closed',auto_close_reason=reason,closed_at=at_time,
   updated_at=at_time,customer_reply_due_at=NULL WHERE id=t.id;
  INSERT INTO public.support_ticket_message(ticket_id,sender_type,content,is_internal)
  VALUES(t.id,'system','[Tự động đóng phiếu] '||note,false);
 END LOOP;
END $$;

-- Preserve idempotent replies and update the existing ticket under its row lock.
DO $$
DECLARE source text:=pg_get_functiondef('public.reply_own_support_ticket(uuid,uuid,text)'::regprocedure);
 old_guard text:=$old$IF t.status IN ('closed','completed','resolved') THEN RAISE EXCEPTION 'support_reply_closed' USING ERRCODE='22023'; END IF;$old$;
 old_status text:=$old$SET status=CASE WHEN status='waiting_customer' THEN 'processing' ELSE status END,customer_reply_due_at=NULL,$old$;
BEGIN
 IF strpos(source,old_guard)=0 OR strpos(source,old_status)=0 THEN RAISE EXCEPTION 'unexpected_support_reply_definition'; END IF;
 source:=replace(source,old_guard,$new$IF t.status IN ('closed','completed','resolved') AND
  NOT coalesce(clock_timestamp()<pawpal_private.complaint_reopen_until(t),false) THEN
  RAISE EXCEPTION 'support_reply_closed' USING ERRCODE='22023';
 END IF;$new$);
 source:=replace(source,old_status,$new$SET status=CASE WHEN status IN ('waiting_customer','resolved','closed') THEN 'processing' ELSE status END,
  closed_at=NULL,auto_close_reason=NULL,customer_reply_due_at=NULL,
  resolved_at=CASE WHEN t.status IN ('resolved','closed') THEN NULL ELSE resolved_at END,
  resolved_by=CASE WHEN t.status IN ('resolved','closed') THEN NULL ELSE resolved_by END,
  approved_amount=CASE WHEN t.status IN ('resolved','closed') THEN NULL ELSE approved_amount END,
  resolution_type=CASE WHEN t.status IN ('resolved','closed') THEN NULL ELSE resolution_type END,
  resolution_note=CASE WHEN t.status IN ('resolved','closed') THEN NULL ELSE resolution_note END,$new$);
 source:=replace(source,$old$WHEN t.status='waiting_customer' THEN p_id$old$,$new$WHEN t.status IN ('waiting_customer','resolved','closed') THEN p_id$new$);
 EXECUTE source;
END $$;

-- A customer must be able to prepare image evidence before sending an eligible reopening reply.
DO $$
DECLARE source text:=pg_get_functiondef('pawpal_private.evidence_access(uuid,text,uuid,uuid,boolean)'::regprocedure);
 needle text:=$old$IF p_write AND t.status IN ('closed','resolved','completed','rejected') THEN RETURN false; END IF;$old$;
BEGIN
 IF strpos(source,needle)=0 THEN RAISE EXCEPTION 'unexpected_support_media_definition'; END IF;
 EXECUTE replace(source,needle,$new$IF p_write AND t.status IN ('closed','resolved','completed','rejected') AND NOT (
  coalesce(pawpal_private.evidence_customer(p_user)=t.customer_id,false)
  AND coalesce(clock_timestamp()<pawpal_private.complaint_reopen_until(t),false)
 ) THEN RETURN false; END IF;$new$);
END $$;

DO $$
DECLARE source text:=pg_get_functiondef('public.own_support_tickets(integer,text,uuid,integer)'::regprocedure);
 needle text:='t.rating_comment,t.customer_reply_due_at,';
BEGIN
 IF strpos(source,needle)=0 THEN RAISE EXCEPTION 'unexpected_support_list_definition'; END IF;
 EXECUTE replace(source,needle,needle||'t.auto_close_reason,pawpal_private.complaint_reopen_until(t) AS reopen_until,');
END $$;

CREATE OR REPLACE FUNCTION public.rate_own_support_ticket(p_ticket uuid,p_rating integer,p_comment text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid:=pawpal_private.customer_support_owner(); t public.support_ticket;
BEGIN
 IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 OR p_comment IS NULL OR length(p_comment)>2000 THEN RAISE EXCEPTION 'invalid_support_rating' USING ERRCODE='22023'; END IF;
 SELECT * INTO t FROM public.support_ticket WHERE id=p_ticket AND customer_id=owner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'support_owner_required' USING ERRCODE='42501'; END IF;
 IF t.rating IS NOT NULL THEN
  IF t.rating<>p_rating OR t.rating_comment IS DISTINCT FROM p_comment THEN RAISE EXCEPTION 'support_rating_exists' USING ERRCODE='PT409'; END IF;
  RETURN p_ticket;
 END IF;
 IF t.status NOT IN ('resolved','closed','completed') OR t.auto_close_reason='no_customer_reply' THEN
  RAISE EXCEPTION 'support_not_resolved' USING ERRCODE='22023';
 END IF;
 IF p_rating<3 THEN
  UPDATE public.support_ticket SET rating=p_rating,rating_comment=p_comment,status='reprocessing',priority='urgent',
   assigned_staff_id=NULL,closed_at=NULL,auto_close_reason=NULL,resolved_at=NULL,resolved_by=NULL,approved_amount=NULL,
   resolution_type=NULL,resolution_note=NULL,updated_at=clock_timestamp() WHERE id=t.id;
  INSERT INTO public.support_ticket_message(ticket_id,sender_type,content,is_internal)
  VALUES(t.id,'system','Khách đánh giá dưới 3 sao. Chuyển quản lý tiếp nhận và xử lý lại.',true);
 ELSE
  UPDATE public.support_ticket SET rating=p_rating,rating_comment=p_comment,updated_at=clock_timestamp() WHERE id=t.id;
 END IF;
 RETURN p_ticket;
END $$;

-- Manual reopening retains the same limit for tickets closed for missing information.
DO $$
DECLARE source text:=pg_get_functiondef('public.act_admin_complaint(uuid,uuid,timestamptz,text,jsonb)'::regprocedure);
 needle text:=$old$next_status:='reprocessing';UPDATE public.support_ticket SET resolved_at=NULL$old$;
BEGIN
 IF strpos(source,needle)=0 THEN RAISE EXCEPTION 'unexpected_complaint_reopen_definition'; END IF;
 EXECUTE replace(source,needle,$new$IF (ticket.auto_close_reason IN ('no_customer_reply','resolved_expired') OR ticket.status='resolved') AND NOT coalesce(clock_timestamp()<pawpal_private.complaint_reopen_until(ticket),false) THEN
   RAISE EXCEPTION 'complaint_reopen_expired' USING ERRCODE='22023';
  END IF;
  next_status:='reprocessing';UPDATE public.support_ticket SET auto_close_reason=NULL,resolved_at=NULL$new$);
END $$;

-- Assigned support staff may reject an order complaint before a plan is approved.
DO $$
DECLARE source text:=pg_get_functiondef('pawpal_private.work_guard_rpc(text,jsonb)'::regprocedure);
 needle text:=$old$IF args->>'p_action' NOT IN ('message','request_info','propose') OR args->>'p_action' IS NULL$old$;
BEGIN
 IF strpos(source,needle)=0 THEN RAISE EXCEPTION 'unexpected_staff_complaint_guard'; END IF;
 EXECUTE replace(source,needle,$new$IF (args->>'p_action' NOT IN ('message','request_info','propose') AND NOT (
    args->>'p_action'='resolve' AND coalesce(args->'p_details'->>'option','')='reject'
    AND EXISTS(SELECT 1 FROM public.support_ticket WHERE id=target AND (category='order' OR order_id IS NOT NULL) AND resolved_by IS NULL)
   )) OR args->>'p_action' IS NULL$new$);
END $$;

REVOKE ALL ON FUNCTION pawpal_private.run_complaint_deadlines(),pawpal_private.complaint_reopen_until(public.support_ticket) FROM PUBLIC,anon,authenticated,service_role;
SELECT cron.schedule('pawpal-complaint-deadlines','* * * * *','SELECT pawpal_private.run_complaint_deadlines()');
NOTIFY pgrst,'reload schema';
COMMIT;
