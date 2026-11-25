BEGIN;
CREATE OR REPLACE FUNCTION public.create_admin_service_ticket(p_id uuid,p_appointment_id uuid,p_review_id uuid,p_description text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment; actor uuid; prior public.support_ticket; payload text;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.read') OR NOT pawpal_private.has_permission('review.read') OR NOT pawpal_private.has_permission('appointment_item.read')
 OR NOT pawpal_private.has_permission('support_ticket.read') OR NOT pawpal_private.has_permission('support_ticket.write') OR NOT pawpal_private.has_permission('audit_log.read') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'service_ticket_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_appointment_id IS NULL OR coalesce(length(btrim(p_description)),0) NOT BETWEEN 2 AND 4000 THEN RAISE EXCEPTION 'invalid_service_ticket' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,18));
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 IF p_review_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.review r JOIN public.appointment_item i ON i.id=r.appointment_item_id WHERE r.id=p_review_id AND i.appointment_id=a.id) THEN RAISE EXCEPTION 'service_ticket_review_mismatch' USING ERRCODE='22023'; END IF;
 payload:=jsonb_build_object('appointment_id',a.id,'review_id',p_review_id,'description',btrim(p_description))::text;
 SELECT * INTO prior FROM public.support_ticket WHERE id=p_id;
 IF FOUND THEN
  IF prior.appointment_id IS DISTINCT FROM a.id OR NOT EXISTS(SELECT 1 FROM public.audit_log WHERE entity_id=p_id AND staff_id=actor AND action='CREATE_SERVICE_TICKET' AND description=payload) THEN RAISE EXCEPTION 'service_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 INSERT INTO public.support_ticket(id,ticket_code,customer_id,appointment_id,channel,category,subject,description,priority,type,status,created_by_account_id)
 VALUES(p_id,'SV-CSKH-'||p_id,a.customer_id,a.id,'admin','service','Phản ánh ca '||a.appointment_code,btrim(p_description),'normal','complaint','pending',auth.uid());
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'CREATE_SERVICE_TICKET','support_ticket',p_id,payload);
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.create_admin_service_ticket(uuid,uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_admin_service_ticket(uuid,uuid,uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
