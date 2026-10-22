BEGIN;
CREATE OR REPLACE FUNCTION public.create_admin_complaint(p_id uuid,p_customer_id uuid,p_order_id uuid,p_appointment_id uuid,p_category text,p_subject text,p_content text,p_priority text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; prior public.support_ticket;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('support_ticket.write')
 OR NOT pawpal_private.has_permission('support_ticket.read') OR NOT pawpal_private.has_permission('support_ticket_message.write')
 OR NOT pawpal_private.has_permission('support_ticket_message.read') OR NOT pawpal_private.has_permission('customer.read')
 OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_customer_id IS NULL OR p_category IS NULL OR p_category NOT IN ('service','order')
 OR coalesce(length(btrim(p_subject)),0) NOT BETWEEN 2 AND 250
 OR coalesce(length(btrim(p_content)),0) NOT BETWEEN 2 AND 8000
 OR p_priority IS NULL OR p_priority NOT IN ('low','normal','high','urgent')
 OR (p_order_id IS NOT NULL AND (p_category<>'order' OR p_appointment_id IS NOT NULL))
 OR (p_appointment_id IS NOT NULL AND p_category<>'service') THEN RAISE EXCEPTION 'invalid_complaint' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF actor IS NULL THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,39));
 IF NOT EXISTS(SELECT 1 FROM public.customer WHERE id=p_customer_id) THEN RAISE EXCEPTION 'customer_not_found' USING ERRCODE='P0002'; END IF;
 IF p_order_id IS NOT NULL THEN
  IF NOT pawpal_private.has_permission('sales_order.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.sales_order WHERE id=p_order_id AND customer_id=p_customer_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'complaint_owner_mismatch' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_appointment_id IS NOT NULL THEN
  IF NOT pawpal_private.has_permission('appointment.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM public.appointment WHERE id=p_appointment_id AND customer_id=p_customer_id FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'complaint_owner_mismatch' USING ERRCODE='22023'; END IF;
 END IF;
 SELECT * INTO prior FROM public.support_ticket WHERE id=p_id;
 IF FOUND THEN
  IF prior.created_by_account_id IS DISTINCT FROM auth.uid() OR prior.customer_id IS DISTINCT FROM p_customer_id
  OR prior.order_id IS DISTINCT FROM p_order_id OR prior.appointment_id IS DISTINCT FROM p_appointment_id
  OR prior.category IS DISTINCT FROM p_category OR prior.subject IS DISTINCT FROM btrim(p_subject)
  OR prior.description IS DISTINCT FROM btrim(p_content) OR prior.priority IS DISTINCT FROM p_priority
  THEN RAISE EXCEPTION 'complaint_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 INSERT INTO public.support_ticket(id,ticket_code,customer_id,order_id,appointment_id,channel,category,subject,description,priority,type,status,created_by_account_id)
 VALUES(p_id,'KN-'||p_id,p_customer_id,p_order_id,p_appointment_id,'admin',p_category,btrim(p_subject),btrim(p_content),p_priority,'complaint','pending',auth.uid());
 INSERT INTO public.support_ticket_message(ticket_id,sender_type,content,is_internal,sender_account_id)
 VALUES(p_id,'staff',btrim(p_content),false,auth.uid());
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,'CREATE_ADMIN_COMPLAINT','support_ticket',p_id,'Tiếp nhận khiếu nại tại quản trị');
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.create_admin_complaint(uuid,uuid,uuid,uuid,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_admin_complaint(uuid,uuid,uuid,uuid,text,text,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
