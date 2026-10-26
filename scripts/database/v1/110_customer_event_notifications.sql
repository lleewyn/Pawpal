BEGIN;
-- No backfill: only future public replies and service-review status transitions.
ALTER TABLE public.notification ADD COLUMN IF NOT EXISTS source_event text;
CREATE UNIQUE INDEX IF NOT EXISTS notification_source_event_unique ON public.notification(source_event) WHERE source_event IS NOT NULL;
CREATE OR REPLACE FUNCTION pawpal_private.notify_customer_support_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE ticket public.support_ticket;
BEGIN
 IF NEW.sender_type<>'staff' OR NEW.is_internal IS DISTINCT FROM false THEN RETURN NEW; END IF;
 SELECT * INTO ticket FROM public.support_ticket WHERE id=NEW.ticket_id;
 IF ticket.customer_id IS NOT NULL THEN
  INSERT INTO public.notification(customer_id,notification_type,title,content,support_ticket_id,source_event)
  VALUES(ticket.customer_id,'support_reply','Phản hồi yêu cầu hỗ trợ',ticket.ticket_code||': '||left(NEW.content,500),ticket.id,'support-reply:'||NEW.id)
  ON CONFLICT(source_event) WHERE source_event IS NOT NULL DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS customer_support_reply_notification ON public.support_ticket_message;
CREATE TRIGGER customer_support_reply_notification AFTER INSERT ON public.support_ticket_message FOR EACH ROW EXECUTE FUNCTION pawpal_private.notify_customer_support_reply();

CREATE OR REPLACE FUNCTION pawpal_private.notify_customer_support_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.customer_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 -- A customer follow-up can reopen waiting_customer; do not notify the sender about themselves.
 IF EXISTS(SELECT 1 FROM public.customer WHERE id=NEW.customer_id AND auth_user_id=auth.uid()) THEN RETURN NEW; END IF;
 INSERT INTO public.notification(customer_id,notification_type,title,content,support_ticket_id,source_event)
 VALUES(NEW.customer_id,'support_status','Yêu cầu hỗ trợ đã cập nhật','Yêu cầu '||NEW.ticket_code||' đã được cập nhật trạng thái. Mở yêu cầu để xem kết quả.',NEW.id,
  'support-status:'||NEW.id||':'||NEW.status||':'||extract(epoch FROM NEW.updated_at)::text)
 ON CONFLICT(source_event) WHERE source_event IS NOT NULL DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS customer_support_state_notification ON public.support_ticket;
CREATE TRIGGER customer_support_state_notification AFTER UPDATE OF status ON public.support_ticket FOR EACH ROW EXECUTE FUNCTION pawpal_private.notify_customer_support_state();

CREATE OR REPLACE FUNCTION pawpal_private.notify_customer_service_review()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; booking uuid; service_name text; label text;
BEGIN
 IF NEW.appointment_item_id IS NULL OR NEW.review_status IS NOT DISTINCT FROM OLD.review_status THEN RETURN NEW; END IF;
 label:=CASE NEW.review_status WHEN 'published' THEN 'đã được công bố' WHEN 'hidden' THEN 'đã được ẩn' WHEN 'rejected' THEN 'chưa được duyệt' WHEN 'pending' THEN 'đang chờ duyệt' END;
 IF label IS NULL THEN RETURN NEW; END IF;
 SELECT a.customer_id,a.id,i.name_snapshot INTO owner_id,booking,service_name
 FROM public.appointment_item i JOIN public.appointment a ON a.id=i.appointment_id WHERE i.id=NEW.appointment_item_id;
 IF owner_id IS NOT NULL THEN
  INSERT INTO public.notification(customer_id,notification_type,title,content,appointment_id,source_event)
  VALUES(owner_id,'service_review_status','Đánh giá dịch vụ đã cập nhật','Đánh giá cho '||service_name||' '||label||'.',booking,
   'service-review:'||NEW.id||':'||NEW.review_status||':'||extract(epoch FROM NEW.updated_at)::text)
  ON CONFLICT(source_event) WHERE source_event IS NOT NULL DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS customer_service_review_notification ON public.review;
CREATE TRIGGER customer_service_review_notification AFTER UPDATE OF review_status ON public.review FOR EACH ROW EXECUTE FUNCTION pawpal_private.notify_customer_service_review();
REVOKE ALL ON FUNCTION pawpal_private.notify_customer_support_reply(),pawpal_private.notify_customer_support_state(),pawpal_private.notify_customer_service_review() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
