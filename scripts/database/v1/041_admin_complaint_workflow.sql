BEGIN;
CREATE OR REPLACE FUNCTION public.act_admin_complaint(p_request_id uuid,p_ticket_id uuid,p_expected_updated_at timestamptz,p_action text,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; prior public.audit_log; ticket public.support_ticket; payload text; note_value text; option_value text; amount_value numeric; evidence uuid; next_status text; internal_value boolean:=true; original_staff uuid; proposal jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('support_ticket.read') OR NOT pawpal_private.has_permission('support_ticket.write')
 OR NOT pawpal_private.has_permission('support_ticket_message.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_ticket_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>12000
 OR p_action IS NULL OR p_action NOT IN ('message','request_info','resolve','propose','approve','reject_proposal','complete','close','reopen','link_source')
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_details) k WHERE k NOT IN ('note','internal','channel','option','amount','evidence_id','replacement_order_id','return_request_id','source_kind')) THEN RAISE EXCEPTION 'invalid_complaint_action' USING ERRCODE='22023'; END IF;
 note_value:=btrim(p_details->>'note');
 IF coalesce(length(note_value),0) NOT BETWEEN 2 AND 8000 THEN RAISE EXCEPTION 'complaint_note_required' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('ticket_id',p_ticket_id,'action',p_action,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,41));
 SELECT * INTO prior FROM public.audit_log WHERE id=p_request_id;
 IF FOUND THEN
  IF prior.action<>'COMPLAINT_ACTION' OR prior.staff_id IS DISTINCT FROM actor OR (prior.description::jsonb-'source_staff_id')::text<>payload THEN RAISE EXCEPTION 'complaint_request_conflict' USING ERRCODE='PT409'; END IF;RETURN p_ticket_id;
 END IF;
 SELECT * INTO ticket FROM public.support_ticket WHERE id=p_ticket_id FOR UPDATE;
 IF NOT FOUND OR ticket.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'complaint_changed' USING ERRCODE='PT409'; END IF;
 next_status:=ticket.status;
 IF ticket.status='waiting_manager_approval' AND p_action NOT IN ('message','approve','reject_proposal') THEN RAISE EXCEPTION 'complaint_approval_pending' USING ERRCODE='PT409'; END IF;
 IF p_action NOT IN ('reopen','close') AND ticket.status IN ('closed','resolved','completed','rejected') THEN RAISE EXCEPTION 'complaint_not_open' USING ERRCODE='PT409'; END IF;
 IF p_action IN ('approve','reject_proposal') AND NOT EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=actor AND role_code='ADMIN') THEN RAISE EXCEPTION 'complaint_approval_forbidden' USING ERRCODE='42501'; END IF;
 IF p_action='link_source' THEN
  evidence:=(p_details->>'evidence_id')::uuid;
  IF ticket.order_id IS NOT NULL OR ticket.appointment_id IS NOT NULL OR ticket.resolution_type IS NOT NULL OR evidence IS NULL THEN RAISE EXCEPTION 'complaint_source_already_set' USING ERRCODE='22023'; END IF;
  IF p_details->>'source_kind'='order' THEN
   IF NOT pawpal_private.has_permission('sales_order.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.sales_order WHERE id=evidence AND customer_id=ticket.customer_id FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_owner_mismatch' USING ERRCODE='22023'; END IF;
   UPDATE public.support_ticket SET order_id=evidence,category='order' WHERE id=ticket.id;
  ELSIF p_details->>'source_kind'='service' THEN
   IF NOT pawpal_private.has_permission('appointment.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.appointment WHERE id=evidence AND customer_id=ticket.customer_id FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_owner_mismatch' USING ERRCODE='22023'; END IF;
   UPDATE public.support_ticket SET appointment_id=evidence,category='service' WHERE id=ticket.id;
  ELSE RAISE EXCEPTION 'invalid_complaint_source' USING ERRCODE='22023'; END IF;
 ELSIF p_action='message' THEN
  internal_value:=coalesce((p_details->>'internal')::boolean,false);
 ELSIF p_action='request_info' THEN
  IF p_details->>'channel' IS NULL OR p_details->>'channel' NOT IN ('record','call','zalo','email','sms') THEN RAISE EXCEPTION 'invalid_complaint_channel' USING ERRCODE='22023'; END IF;
  note_value:='[Ghi nhận yêu cầu bổ sung qua '||(p_details->>'channel')||'] '||note_value; next_status:='waiting_customer';
 ELSIF p_action IN ('resolve','propose') THEN
  option_value:=p_details->>'option'; amount_value:=coalesce((p_details->>'amount')::numeric,0);
  IF option_value IS NULL OR option_value NOT IN ('explain','reject','refund','rma_refund','rma_exchange','redo_service','change_staff')
  OR amount_value<0 OR amount_value>999999999999 OR amount_value<>round(amount_value,4)
  OR (p_action='resolve' AND option_value NOT IN ('explain','reject'))
  OR (p_action='propose' AND option_value IN ('explain','reject'))
  OR (option_value IN ('refund','rma_refund') AND amount_value<=0)
  OR (option_value NOT IN ('refund','rma_refund') AND amount_value<>0)
  OR (option_value LIKE 'rma_%' AND ticket.order_id IS NULL)
  OR (option_value IN ('redo_service','change_staff') AND ticket.appointment_id IS NULL)
  OR (option_value='refund' AND ticket.appointment_id IS NULL AND ticket.order_id IS NULL) THEN RAISE EXCEPTION 'invalid_complaint_resolution' USING ERRCODE='22023'; END IF;
  next_status:=CASE WHEN p_action='propose' THEN 'waiting_manager_approval' ELSE 'resolved' END;
  UPDATE public.support_ticket SET resolution_type=option_value,resolution_note=note_value,approved_amount=CASE WHEN p_action='resolve' THEN 0 ELSE NULL END,
   resolved_by=CASE WHEN p_action='resolve' THEN actor ELSE NULL END,resolved_at=CASE WHEN p_action='resolve' THEN clock_timestamp() ELSE NULL END WHERE id=ticket.id;
 ELSIF p_action IN ('approve','reject_proposal') THEN
  IF ticket.status<>'waiting_manager_approval' THEN RAISE EXCEPTION 'complaint_not_awaiting_approval' USING ERRCODE='PT409'; END IF;
  IF p_action='approve' THEN
   SELECT description::jsonb INTO proposal FROM public.audit_log WHERE action='COMPLAINT_ACTION' AND entity_id=ticket.id AND description::jsonb->>'action'='propose' ORDER BY created_at DESC,id DESC LIMIT 1;
   IF proposal IS NULL OR proposal->'details'->>'option' IS DISTINCT FROM ticket.resolution_type THEN RAISE EXCEPTION 'complaint_proposal_required' USING ERRCODE='22023'; END IF;
   amount_value:=(proposal->'details'->>'amount')::numeric;
  END IF;
  next_status:='processing';
  UPDATE public.support_ticket SET approved_amount=CASE WHEN p_action='approve' THEN amount_value ELSE NULL END,
   resolved_by=CASE WHEN p_action='approve' THEN actor ELSE NULL END,
   resolution_type=CASE WHEN p_action='approve' THEN resolution_type ELSE NULL END,
   resolution_note=CASE WHEN p_action='approve' THEN resolution_note ELSE NULL END WHERE id=ticket.id;
 ELSIF p_action='complete' THEN
  evidence:=(p_details->>'evidence_id')::uuid;
  IF ticket.status<>'processing' OR ticket.resolved_by IS NULL OR evidence IS NULL THEN RAISE EXCEPTION 'complaint_approved_result_required' USING ERRCODE='22023'; END IF;
  IF ticket.resolution_type IN ('refund','rma_refund') THEN
   IF NOT pawpal_private.has_permission('refund_transaction.read') OR NOT pawpal_private.has_permission('payment.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE r.id=evidence AND r.refund_status='succeeded'
    AND r.refunded_amount>=ticket.approved_amount AND p.customer_id=ticket.customer_id
    AND (r.ticket_id IS NULL OR r.ticket_id=ticket.id)
    AND ((ticket.order_id IS NOT NULL AND p.order_id=ticket.order_id) OR (ticket.appointment_id IS NOT NULL AND p.appointment_id=ticket.appointment_id)) FOR SHARE OF r;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_refund_mismatch' USING ERRCODE='22023'; END IF;
   IF EXISTS(SELECT 1 FROM public.audit_log WHERE action='COMPLAINT_ACTION' AND entity_id<>ticket.id AND description::jsonb->>'action'='complete' AND description::jsonb->'details'->>'evidence_id'=evidence::text) THEN RAISE EXCEPTION 'complaint_result_already_linked' USING ERRCODE='PT409'; END IF;
   -- Successful refunds are immutable. The validated association is kept in the audit event.
   IF ticket.resolution_type='rma_refund' THEN
    IF NOT pawpal_private.has_permission('return_request.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
    PERFORM 1 FROM public.return_request rr WHERE rr.id=(p_details->>'return_request_id')::uuid AND rr.sales_order_id=ticket.order_id AND rr.request_status='received' FOR SHARE;
    IF NOT FOUND OR EXISTS(SELECT 1 FROM public.refund_transaction r WHERE r.id=evidence AND r.return_request_id IS NOT NULL AND r.return_request_id IS DISTINCT FROM (p_details->>'return_request_id')::uuid) THEN RAISE EXCEPTION 'complaint_return_mismatch' USING ERRCODE='22023'; END IF;
   END IF;
  ELSIF ticket.resolution_type='rma_exchange' THEN
   IF NOT pawpal_private.has_permission('return_request.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.return_request WHERE id=evidence AND sales_order_id=ticket.order_id AND request_status='received' FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_return_mismatch' USING ERRCODE='22023'; END IF;
   IF NOT pawpal_private.has_permission('sales_order.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.sales_order WHERE id=(p_details->>'replacement_order_id')::uuid AND id<>ticket.order_id AND customer_id=ticket.customer_id AND order_status IN ('delivered','completed') FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_replacement_order_required' USING ERRCODE='22023'; END IF;
  ELSIF ticket.resolution_type IN ('redo_service','change_staff') THEN
   IF NOT pawpal_private.has_permission('appointment.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   IF ticket.resolution_type='change_staff' THEN
    SELECT description::jsonb INTO proposal FROM public.audit_log WHERE action='COMPLAINT_ACTION' AND entity_id=ticket.id AND description::jsonb->>'action'='propose' ORDER BY created_at DESC,id DESC LIMIT 1;
    IF NOT coalesce(proposal?'source_staff_id',false) THEN RAISE EXCEPTION 'complaint_booking_mismatch' USING ERRCODE='22023'; END IF;
    original_staff:=(proposal->>'source_staff_id')::uuid;
   END IF;
   PERFORM 1 FROM public.appointment a JOIN public.appointment old ON old.id=ticket.appointment_id
    WHERE a.id=evidence AND a.customer_id=ticket.customer_id AND a.pet_id=old.pet_id AND a.appointment_status='completed'
    AND ((ticket.resolution_type='redo_service' AND a.id<>old.id AND a.created_at>=ticket.created_at)
      OR (ticket.resolution_type='change_staff' AND a.staff_id IS NOT NULL AND a.staff_id IS DISTINCT FROM original_staff))
    AND EXISTS(SELECT 1 FROM public.appointment_item oi JOIN public.appointment_item ni ON ni.service_id=oi.service_id WHERE oi.appointment_id=old.id AND ni.appointment_id=a.id AND oi.service_id IS NOT NULL)
    FOR SHARE OF a;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_booking_mismatch' USING ERRCODE='22023'; END IF;
  ELSE RAISE EXCEPTION 'invalid_complaint_resolution' USING ERRCODE='22023'; END IF;
  next_status:='resolved';UPDATE public.support_ticket SET resolved_at=clock_timestamp() WHERE id=ticket.id;
 ELSIF p_action='close' THEN
  IF ticket.status NOT IN ('resolved','completed') THEN RAISE EXCEPTION 'complaint_resolve_before_close' USING ERRCODE='22023'; END IF;
  next_status:='closed'; UPDATE public.support_ticket SET closed_at=clock_timestamp() WHERE id=ticket.id;
 ELSIF p_action='reopen' THEN
  IF ticket.status NOT IN ('resolved','closed','completed','rejected') THEN RAISE EXCEPTION 'complaint_not_finished' USING ERRCODE='PT409'; END IF;
  next_status:='reprocessing';UPDATE public.support_ticket SET resolved_at=NULL,closed_at=NULL,resolved_by=NULL,approved_amount=NULL,resolution_type=NULL,resolution_note=NULL WHERE id=ticket.id;
 END IF;
 UPDATE public.support_ticket SET status=next_status,updated_at=clock_timestamp(),first_response_at=CASE WHEN p_action='message' AND NOT internal_value THEN coalesce(first_response_at,clock_timestamp()) ELSE first_response_at END WHERE id=ticket.id;
 INSERT INTO public.support_ticket_message(ticket_id,sender_type,sender_account_id,content,is_internal) VALUES(ticket.id,'staff',auth.uid(),CASE WHEN p_action='message' THEN note_value ELSE '['||CASE p_action WHEN 'link_source' THEN 'Liên kết giao dịch' WHEN 'request_info' THEN 'Yêu cầu bổ sung' WHEN 'resolve' THEN 'Giải quyết' WHEN 'propose' THEN 'Đề xuất' WHEN 'approve' THEN 'Phê duyệt' WHEN 'reject_proposal' THEN 'Từ chối đề xuất' WHEN 'complete' THEN 'Liên kết kết quả' WHEN 'close' THEN 'Đóng phiếu' WHEN 'reopen' THEN 'Mở lại' END||'] '||note_value END,internal_value);
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request_id,actor,'COMPLAINT_ACTION','support_ticket',ticket.id,
 CASE WHEN p_action='propose' THEN (payload::jsonb||jsonb_build_object('source_staff_id',(SELECT staff_id FROM public.appointment WHERE id=ticket.appointment_id)))::text ELSE payload END);
 RETURN ticket.id;
END $$;
REVOKE ALL ON FUNCTION public.act_admin_complaint(uuid,uuid,timestamptz,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.act_admin_complaint(uuid,uuid,timestamptz,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
