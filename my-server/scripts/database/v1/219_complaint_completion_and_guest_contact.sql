BEGIN;

ALTER TABLE public.support_ticket ADD COLUMN guest_contact_name text, ADD COLUMN guest_contact_phone text;

CREATE FUNCTION public.create_guest_contact_ticket(p_id uuid,p_name text,p_phone text,p_subject text,p_interest text,p_message text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE prior public.support_ticket; code text:='LH-'||p_id; body text;
BEGIN
 IF p_id IS NULL OR coalesce(length(btrim(p_name)),0) NOT BETWEEN 2 AND 120
 OR coalesce(p_phone,'') !~ '^0[35789][0-9]{8}$' OR coalesce(length(btrim(p_subject)),0) NOT BETWEEN 2 AND 250
 OR coalesce(length(btrim(p_message)),0) NOT BETWEEN 2 AND 4000
 OR p_interest IS NULL OR p_interest NOT IN ('','spa','hotel','taxi','other') THEN
  RAISE EXCEPTION 'invalid_guest_contact' USING ERRCODE='22023';
 END IF;
 body:=CASE p_interest WHEN 'spa' THEN 'Dịch vụ quan tâm: Tắm sấy và cắt tỉa' WHEN 'hotel' THEN 'Dịch vụ quan tâm: Khách sạn thú cưng' WHEN 'taxi' THEN 'Dịch vụ quan tâm: Đưa đón thú cưng' WHEN 'other' THEN 'Dịch vụ quan tâm: Khác' END;
 body:=concat_ws(E'\n\n',body,btrim(p_message));
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,219));
 SELECT * INTO prior FROM public.support_ticket WHERE id=p_id;
 IF FOUND THEN
  IF prior.ticket_code IS DISTINCT FROM code OR prior.channel<>'contact' OR prior.customer_id IS NOT NULL
  OR prior.guest_contact_name IS DISTINCT FROM btrim(p_name) OR prior.guest_contact_phone IS DISTINCT FROM p_phone
  OR prior.subject IS DISTINCT FROM btrim(p_subject) OR prior.description IS DISTINCT FROM body THEN
   RAISE EXCEPTION 'guest_contact_conflict' USING ERRCODE='PT409';
  END IF;
  RETURN code;
 END IF;
 INSERT INTO public.support_ticket(id,ticket_code,channel,category,subject,description,priority,type,status,guest_contact_name,guest_contact_phone)
 VALUES(p_id,code,'contact','other',btrim(p_subject),body,'normal','contact','pending',btrim(p_name),p_phone);
 INSERT INTO public.support_ticket_message(ticket_id,sender_type,content,is_internal) VALUES(p_id,'customer',body,false);
 RETURN code;
END $$;
REVOKE ALL ON FUNCTION public.create_guest_contact_ticket(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_guest_contact_ticket(uuid,text,text,text,text,text) TO service_role;

-- Keep approval, audit, idempotency and existing refund and booking checks intact.
DO $$
DECLARE body text:=pg_get_functiondef('public.act_admin_complaint(uuid,uuid,timestamptz,text,jsonb)'::regprocedure);
 old_exchange text:=$old$PERFORM 1 FROM public.return_request WHERE id=evidence AND sales_order_id=ticket.order_id AND request_status='received' FOR SHARE;$old$;
 old_order text:=$old$PERFORM 1 FROM public.sales_order WHERE id=(p_details->>'replacement_order_id')::uuid AND id<>ticket.order_id AND customer_id=ticket.customer_id AND order_status IN ('delivered','completed') FOR SHARE;$old$;
 old_return text:=$old$AND rr.request_status='received' FOR SHARE;$old$;
BEGIN
 IF strpos(body,old_exchange)=0 OR strpos(body,old_order)=0 OR strpos(body,old_return)=0 THEN
  RAISE EXCEPTION 'unexpected_complaint_result_validation';
 END IF;
 body:=replace(body,old_exchange,$new$PERFORM 1 FROM public.return_request WHERE id=evidence AND sales_order_id=ticket.order_id AND request_status IN ('received','completed') FOR SHARE;$new$);
 body:=replace(body,old_order,$new$PERFORM 1 FROM public.sales_order o JOIN public.sales_replacement s ON s.order_id=o.id
   WHERE s.return_request_id=evidence AND s.kind='exchange' AND o.id=(p_details->>'replacement_order_id')::uuid AND o.id<>ticket.order_id
    AND o.customer_id=ticket.customer_id AND o.order_status IN ('delivered','completed') FOR SHARE OF o;$new$);
 body:=replace(body,old_return,$new$AND rr.request_status IN ('received','completed') FOR SHARE;$new$);
 EXECUTE body;
END $$;

CREATE OR REPLACE FUNCTION pawpal_private.notify_customer_support_state()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE invite boolean:=NEW.status='resolved' AND NEW.rating IS NULL;
BEGIN
 IF NEW.customer_id IS NULL OR NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
 IF EXISTS(SELECT 1 FROM public.customer WHERE id=NEW.customer_id AND auth_user_id=auth.uid()) THEN RETURN NEW; END IF;
 INSERT INTO public.notification(customer_id,notification_type,title,content,support_ticket_id,source_event)
 VALUES(NEW.customer_id,'support_status',
  CASE WHEN invite THEN 'Mời đánh giá hỗ trợ' ELSE 'Yêu cầu hỗ trợ đã cập nhật' END,
  CASE WHEN invite THEN 'Phiếu '||NEW.ticket_code||' đã được giải quyết. Mời bạn đánh giá thái độ và tốc độ hỗ trợ từ 1 đến 5 sao.'
   ELSE 'Yêu cầu '||NEW.ticket_code||' đã được cập nhật trạng thái. Mở yêu cầu để xem kết quả.' END,
  NEW.id,'support-status:'||NEW.id||':'||NEW.status||':'||extract(epoch FROM NEW.updated_at)::text)
 ON CONFLICT(source_event) WHERE source_event IS NOT NULL DO NOTHING;
 RETURN NEW;
END $$;

NOTIFY pgrst,'reload schema';
COMMIT;
