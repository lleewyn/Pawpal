BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.customer_support_owner()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id);
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'customer_session_required' USING ERRCODE='42501'; END IF;
 RETURN owner_id;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.customer_support_owner() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.create_own_support_ticket(p_id uuid,p_category text,p_subject text,p_content text,p_appointment uuid DEFAULT NULL,p_order uuid DEFAULT NULL,p_resolution text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid:=pawpal_private.customer_support_owner(); prior public.support_ticket;
BEGIN
 IF p_id IS NULL OR p_category IS NULL OR p_category NOT IN ('service','order','payment','other') OR coalesce(length(btrim(p_subject)),0) NOT BETWEEN 2 AND 200
 OR coalesce(length(btrim(p_content)),0) NOT BETWEEN 2 AND 4000 OR coalesce(length(p_resolution),0)>1000
 OR (p_category='service' AND p_appointment IS NULL) OR (p_category='order' AND p_order IS NULL)
 OR (p_category<>'service' AND p_appointment IS NOT NULL) OR (p_category<>'order' AND p_order IS NOT NULL) THEN RAISE EXCEPTION 'invalid_support_request' USING ERRCODE='22023'; END IF;
 IF p_appointment IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=p_appointment AND customer_id=owner_id) THEN RAISE EXCEPTION 'support_booking_owner_required' USING ERRCODE='42501'; END IF;
 IF p_order IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sales_order WHERE id=p_order AND customer_id=owner_id) THEN RAISE EXCEPTION 'support_order_owner_required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,73));
 SELECT * INTO prior FROM public.support_ticket WHERE id=p_id;
 IF FOUND THEN
  IF prior.customer_id IS DISTINCT FROM owner_id OR prior.created_by_account_id IS DISTINCT FROM auth.uid() OR prior.category IS DISTINCT FROM p_category
   OR prior.subject IS DISTINCT FROM btrim(p_subject) OR prior.description IS DISTINCT FROM btrim(p_content)
   OR prior.appointment_id IS DISTINCT FROM p_appointment OR prior.order_id IS DISTINCT FROM p_order OR prior.requested_resolution IS DISTINCT FROM p_resolution THEN RAISE EXCEPTION 'support_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN prior.id;
 END IF;
 INSERT INTO public.support_ticket(id,ticket_code,customer_id,appointment_id,order_id,channel,category,type,subject,description,priority,status,requested_resolution,created_by_account_id)
 VALUES(p_id,'KH-'||upper(replace(p_id::text,'-','')),owner_id,p_appointment,p_order,'web',p_category,'complaint',btrim(p_subject),btrim(p_content),'normal','pending',p_resolution,auth.uid());
 INSERT INTO public.support_ticket_message(ticket_id,sender_type,content,is_internal,sender_account_id) VALUES(p_id,'customer',btrim(p_content),false,auth.uid());
 RETURN p_id;
END $$;
CREATE OR REPLACE FUNCTION public.own_support_tickets()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid:=pawpal_private.customer_support_owner(); result jsonb; BEGIN
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC,x.id),'[]'::jsonb) INTO result FROM (
  SELECT t.id,t.ticket_code,t.subject,t.description,t.category,t.status,t.priority,t.rating,t.rating_comment,
   CASE WHEN t.status IN ('resolved','closed','completed') THEN t.resolution_note END AS resolution_note,
   CASE WHEN t.status IN ('resolved','closed','completed') THEN t.resolution_type END AS resolution_type,t.created_at,t.updated_at,
   a.appointment_code,a.id AS appointment_id,o.order_code,o.id AS order_id,
   (SELECT name_snapshot FROM public.appointment_item WHERE appointment_id=a.id AND is_primary ORDER BY id LIMIT 1) AS service_name,
   (SELECT pet_name FROM public.pet_profile WHERE id=a.pet_id) AS pet_name,
   coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'sender',CASE WHEN m.sender_type IN ('customer','user','khach_hang') THEN 'user' ELSE 'cskh' END,'text',m.content,'time',m.created_at) ORDER BY m.created_at,m.id)
    FROM public.support_ticket_message m WHERE m.ticket_id=t.id AND NOT m.is_internal AND m.sender_type NOT IN ('system','internal_note')),'[]'::jsonb) AS messages
  FROM public.support_ticket t LEFT JOIN public.appointment a ON a.id=t.appointment_id LEFT JOIN public.sales_order o ON o.id=t.order_id WHERE t.customer_id=owner_id
 ) x; RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.reply_own_support_ticket(p_id uuid,p_ticket uuid,p_content text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid:=pawpal_private.customer_support_owner(); t public.support_ticket; prior public.support_ticket_message;
BEGIN
 IF p_id IS NULL OR coalesce(length(btrim(p_content)),0) NOT BETWEEN 1 AND 4000 THEN RAISE EXCEPTION 'invalid_support_reply' USING ERRCODE='22023'; END IF;
 SELECT * INTO t FROM public.support_ticket WHERE id=p_ticket AND customer_id=owner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'support_owner_required' USING ERRCODE='42501'; END IF;
 SELECT * INTO prior FROM public.support_ticket_message WHERE id=p_id;
 IF FOUND THEN
  IF prior.ticket_id<>p_ticket OR prior.sender_account_id IS DISTINCT FROM auth.uid() OR prior.is_internal OR prior.content IS DISTINCT FROM btrim(p_content) THEN RAISE EXCEPTION 'support_reply_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 IF t.status IN ('closed','completed','resolved') THEN RAISE EXCEPTION 'support_reply_closed' USING ERRCODE='22023'; END IF;
 INSERT INTO public.support_ticket_message(id,ticket_id,sender_type,content,is_internal,sender_account_id) VALUES(p_id,p_ticket,'customer',btrim(p_content),false,auth.uid());
 UPDATE public.support_ticket SET status=CASE WHEN status='waiting_customer' THEN 'processing' ELSE status END,updated_at=now() WHERE id=p_ticket;
 RETURN p_id;
END $$;
CREATE OR REPLACE FUNCTION public.rate_own_support_ticket(p_ticket uuid,p_rating integer,p_comment text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid:=pawpal_private.customer_support_owner(); t public.support_ticket; BEGIN
 IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 OR p_comment IS NULL OR length(p_comment)>2000 THEN RAISE EXCEPTION 'invalid_support_rating' USING ERRCODE='22023'; END IF;
 SELECT * INTO t FROM public.support_ticket WHERE id=p_ticket AND customer_id=owner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'support_owner_required' USING ERRCODE='42501'; END IF;
 IF t.status NOT IN ('resolved','closed','completed') THEN RAISE EXCEPTION 'support_not_resolved' USING ERRCODE='22023'; END IF;
 IF t.rating IS NOT NULL THEN
  IF t.rating<>p_rating OR t.rating_comment IS DISTINCT FROM p_comment THEN RAISE EXCEPTION 'support_rating_exists' USING ERRCODE='PT409'; END IF;
  RETURN p_ticket;
 END IF;
 UPDATE public.support_ticket SET rating=p_rating,rating_comment=p_comment WHERE id=p_ticket; RETURN p_ticket;
END $$;
REVOKE ALL ON FUNCTION public.create_own_support_ticket(uuid,text,text,text,uuid,uuid,text),public.own_support_tickets(),public.reply_own_support_ticket(uuid,uuid,text),public.rate_own_support_ticket(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_own_support_ticket(uuid,text,text,text,uuid,uuid,text),public.own_support_tickets(),public.reply_own_support_ticket(uuid,uuid,text),public.rate_own_support_ticket(uuid,integer,text) TO authenticated;
DROP POLICY IF EXISTS own_customer_support_ticket ON public.support_ticket;
-- Tickets contain investigation notes: customers read only the explicit RPC projection.
CREATE OR REPLACE FUNCTION pawpal_private.owns_support_ticket(p_ticket uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.support_ticket WHERE id=p_ticket AND pawpal_private.owns_customer(customer_id))
$$;
REVOKE ALL ON FUNCTION pawpal_private.owns_support_ticket(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION pawpal_private.owns_support_ticket(uuid) TO authenticated;
DROP POLICY IF EXISTS own_customer_support_message ON public.support_ticket_message;
CREATE POLICY own_customer_support_message ON public.support_ticket_message FOR SELECT TO authenticated USING(NOT is_internal AND sender_type<>'internal_note' AND pawpal_private.owns_support_ticket(ticket_id));
GRANT SELECT ON public.support_ticket_message TO authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.notify_customer_support_status()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$ BEGIN
 IF TG_RELID<>'public.support_ticket'::regclass THEN RAISE EXCEPTION 'invalid_support_event_source' USING ERRCODE='42501';END IF;
 IF NEW.status IS DISTINCT FROM OLD.status OR NEW.resolution_note IS DISTINCT FROM OLD.resolution_note OR NEW.resolution_type IS DISTINCT FROM OLD.resolution_type THEN
  INSERT INTO public.support_ticket_message(ticket_id,sender_type,content,is_internal) VALUES(NEW.id,'system','Trạng thái hoặc phương án xử lý phiếu đã được cập nhật.',false);
 END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.notify_customer_support_status() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS customer_support_status ON public.support_ticket;
CREATE TRIGGER customer_support_status AFTER UPDATE ON public.support_ticket FOR EACH ROW EXECUTE FUNCTION pawpal_private.notify_customer_support_status();
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='support_ticket_message') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.support_ticket_message;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
