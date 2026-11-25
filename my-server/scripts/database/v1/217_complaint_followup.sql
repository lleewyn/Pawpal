BEGIN;
ALTER TABLE public.support_ticket
 ADD COLUMN customer_reply_due_at timestamptz,
 ADD COLUMN customer_followup_message_id uuid REFERENCES public.support_ticket_message(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.act_admin_complaint(p_request_id uuid, p_ticket_id uuid, p_expected_updated_at timestamp with time zone, p_action text, p_details jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE actor uuid; prior public.audit_log; ticket public.support_ticket; payload text; note_value text; option_value text; amount_value numeric; evidence uuid; next_status text; internal_value boolean:=true; original_staff uuid; proposal jsonb;
BEGIN
 PERFORM pawpal_private.work_guard_rpc('act_admin_complaint',jsonb_build_object('p_request_id',to_jsonb(p_request_id),'p_ticket_id',to_jsonb(p_ticket_id),'p_expected_updated_at',to_jsonb(p_expected_updated_at),'p_action',to_jsonb(p_action),'p_details',to_jsonb(p_details)));
 IF auth.uid() IS NULL OR NOT pawpal_private.work_rpc_permission('act_admin_complaint','support_ticket.read') OR NOT pawpal_private.work_rpc_permission('act_admin_complaint','support_ticket.write')
 OR NOT pawpal_private.work_rpc_permission('act_admin_complaint','support_ticket_message.write') OR NOT pawpal_private.work_rpc_permission('act_admin_complaint','audit_log.write') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_ticket_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>12000
 OR p_action IS NULL OR p_action NOT IN ('message','request_info','resolve','propose','approve','reject_proposal','complete','close','reopen','link_source')
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_details) k WHERE k NOT IN ('note','internal','channel','option','amount','evidence_id','replacement_order_id','return_request_id','source_kind','media_asset_ids')) THEN RAISE EXCEPTION 'invalid_complaint_action' USING ERRCODE='22023'; END IF;
 IF p_details ? 'media_asset_ids' AND p_action<>'message' THEN RAISE EXCEPTION 'invalid_evidence_action' USING ERRCODE='22023'; END IF;
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
   IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','sales_order.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.sales_order WHERE id=evidence AND customer_id=ticket.customer_id FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_owner_mismatch' USING ERRCODE='22023'; END IF;
   UPDATE public.support_ticket SET order_id=evidence,category='order' WHERE id=ticket.id;
  ELSIF p_details->>'source_kind'='service' THEN
   IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','appointment.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.appointment WHERE id=evidence AND customer_id=ticket.customer_id FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_owner_mismatch' USING ERRCODE='22023'; END IF;
   UPDATE public.support_ticket SET appointment_id=evidence,category='service' WHERE id=ticket.id;
  ELSE RAISE EXCEPTION 'invalid_complaint_source' USING ERRCODE='22023'; END IF;
 ELSIF p_action='message' THEN
  internal_value:=coalesce((p_details->>'internal')::boolean,false);
 ELSIF p_action='request_info' THEN
  IF p_details->>'channel' IS NULL OR p_details->>'channel' NOT IN ('portal','record','call','zalo','email','sms') THEN RAISE EXCEPTION 'invalid_complaint_channel' USING ERRCODE='22023'; END IF;
  internal_value:=false; next_status:='waiting_customer';
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
   IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','refund_transaction.read') OR NOT pawpal_private.work_rpc_permission('act_admin_complaint','payment.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE r.id=evidence AND r.refund_status='succeeded'
    AND r.refunded_amount>=ticket.approved_amount AND p.customer_id=ticket.customer_id
    AND (r.ticket_id IS NULL OR r.ticket_id=ticket.id)
    AND ((ticket.order_id IS NOT NULL AND p.order_id=ticket.order_id) OR (ticket.appointment_id IS NOT NULL AND p.appointment_id=ticket.appointment_id)) FOR SHARE OF r;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_refund_mismatch' USING ERRCODE='22023'; END IF;
   IF EXISTS(SELECT 1 FROM public.audit_log WHERE action='COMPLAINT_ACTION' AND entity_id<>ticket.id AND description::jsonb->>'action'='complete' AND description::jsonb->'details'->>'evidence_id'=evidence::text) THEN RAISE EXCEPTION 'complaint_result_already_linked' USING ERRCODE='PT409'; END IF;
   -- Successful refunds are immutable. The validated association is kept in the audit event.
   IF ticket.resolution_type='rma_refund' THEN
    IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','return_request.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
    PERFORM 1 FROM public.return_request rr WHERE rr.id=(p_details->>'return_request_id')::uuid AND rr.sales_order_id=ticket.order_id AND rr.request_status='received' FOR SHARE;
    IF NOT FOUND OR EXISTS(SELECT 1 FROM public.refund_transaction r WHERE r.id=evidence AND r.return_request_id IS NOT NULL AND r.return_request_id IS DISTINCT FROM (p_details->>'return_request_id')::uuid) THEN RAISE EXCEPTION 'complaint_return_mismatch' USING ERRCODE='22023'; END IF;
   END IF;
  ELSIF ticket.resolution_type='rma_exchange' THEN
   IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','return_request.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.return_request WHERE id=evidence AND sales_order_id=ticket.order_id AND request_status='received' FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_return_mismatch' USING ERRCODE='22023'; END IF;
   IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','sales_order.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   PERFORM 1 FROM public.sales_order WHERE id=(p_details->>'replacement_order_id')::uuid AND id<>ticket.order_id AND customer_id=ticket.customer_id AND order_status IN ('delivered','completed') FOR SHARE;
   IF NOT FOUND THEN RAISE EXCEPTION 'complaint_replacement_order_required' USING ERRCODE='22023'; END IF;
  ELSIF ticket.resolution_type IN ('redo_service','change_staff') THEN
   IF NOT pawpal_private.work_rpc_permission('act_admin_complaint','appointment.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
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
 UPDATE public.support_ticket SET status=next_status,updated_at=clock_timestamp(),
  customer_reply_due_at=CASE WHEN p_action='request_info' THEN clock_timestamp()+interval '72 hours' WHEN next_status='waiting_customer' THEN customer_reply_due_at END,
  customer_followup_message_id=CASE WHEN p_action IN ('request_info','resolve','close','reopen') THEN NULL ELSE customer_followup_message_id END,
  first_response_at=CASE WHEN p_action IN ('message','request_info') AND NOT internal_value THEN coalesce(first_response_at,clock_timestamp()) ELSE first_response_at END WHERE id=ticket.id;
 INSERT INTO public.support_ticket_message(id,ticket_id,sender_type,sender_account_id,content,is_internal) VALUES(CASE WHEN p_action='message' THEN p_request_id ELSE gen_random_uuid() END,ticket.id,'staff',auth.uid(),CASE WHEN p_action='message' THEN note_value ELSE '['||CASE p_action WHEN 'link_source' THEN 'Liên kết giao dịch' WHEN 'request_info' THEN 'Yêu cầu bổ sung' WHEN 'resolve' THEN 'Giải quyết' WHEN 'propose' THEN 'Đề xuất' WHEN 'approve' THEN 'Phê duyệt' WHEN 'reject_proposal' THEN 'Từ chối đề xuất' WHEN 'complete' THEN 'Liên kết kết quả' WHEN 'close' THEN 'Đóng phiếu' WHEN 'reopen' THEN 'Mở lại' END||'] '||note_value END,internal_value);
 IF p_action='message' AND p_details ? 'media_asset_ids' THEN PERFORM pawpal_private.attach_private_evidence('ticket_image',p_request_id,p_details->'media_asset_ids'); END IF;
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request_id,actor,'COMPLAINT_ACTION','support_ticket',ticket.id,
 CASE WHEN p_action='propose' THEN (payload::jsonb||jsonb_build_object('source_staff_id',(SELECT staff_id FROM public.appointment WHERE id=ticket.appointment_id)))::text ELSE payload END);
 RETURN ticket.id;
END $function$;

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
 IF t.status='waiting_customer' AND clock_timestamp()>=t.customer_reply_due_at THEN
  RAISE EXCEPTION 'support_reply_expired' USING ERRCODE='PT409';
 END IF;
 INSERT INTO public.support_ticket_message(id,ticket_id,sender_type,content,is_internal,sender_account_id) VALUES(p_id,p_ticket,'customer',btrim(p_content),false,auth.uid());
 UPDATE public.support_ticket SET status=CASE WHEN status='waiting_customer' THEN 'processing' ELSE status END,customer_reply_due_at=NULL,
  customer_followup_message_id=CASE WHEN t.status='waiting_customer' THEN p_id ELSE t.customer_followup_message_id END,updated_at=clock_timestamp() WHERE id=p_ticket;
 RETURN p_id;
END $$;

CREATE OR REPLACE FUNCTION public.own_support_tickets(p_page integer,p_filter text,p_ticket uuid,p_message_page integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid:=pawpal_private.customer_support_owner(); result jsonb; total bigint; counts jsonb; page_no integer;
BEGIN
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 OR p_message_page IS NULL OR p_message_page NOT BETWEEN 1 AND 100000 OR p_filter IS NULL OR p_filter NOT IN ('all','pending','processing','completed') THEN RAISE EXCEPTION 'invalid_support_page' USING ERRCODE='22023'; END IF;
 SELECT jsonb_build_object('all',count(*),'pending',count(*) FILTER(WHERE status='pending'),'processing',count(*) FILTER(WHERE status IN ('processing','waiting_customer','waiting_manager_approval','reprocessing')),'completed',count(*) FILTER(WHERE status IN ('completed','resolved','closed'))) INTO counts FROM public.support_ticket WHERE customer_id=owner_id;
 total:=(counts->>p_filter)::bigint;
 page_no:=least(p_page,greatest(1,ceil(total::numeric/10)::integer));
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC,x.id),'[]'::jsonb) INTO result FROM (
  SELECT (SELECT count(*) FROM public.support_ticket_message z WHERE z.ticket_id=t.id AND NOT z.is_internal AND z.sender_type NOT IN ('system','internal_note')) AS message_total,p_message_page AS message_page,t.id,t.ticket_code,t.subject,t.description,t.category,t.status,t.priority,t.rating,t.rating_comment,t.customer_reply_due_at,
   CASE WHEN t.status='waiting_customer' THEN (SELECT m.content FROM public.support_ticket_message m WHERE m.ticket_id=t.id AND NOT m.is_internal AND m.sender_type='staff' AND m.content LIKE '[Yêu cầu bổ sung] %' ORDER BY m.created_at DESC,m.id DESC LIMIT 1) END AS customer_reply_request,
   CASE WHEN t.status IN ('resolved','closed','completed') THEN t.resolution_note END AS resolution_note,
   CASE WHEN t.status IN ('resolved','closed','completed') THEN t.resolution_type END AS resolution_type,t.created_at,t.updated_at,
   a.appointment_code,a.id AS appointment_id,o.order_code,o.id AS order_id,
   (SELECT name_snapshot FROM public.appointment_item WHERE appointment_id=a.id AND is_primary ORDER BY id LIMIT 1) AS service_name,
   (SELECT pet_name FROM public.pet_profile WHERE id=a.pet_id) AS pet_name,
   coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'sender',CASE WHEN m.sender_type IN ('customer','user','khach_hang') THEN 'user' ELSE 'cskh' END,'text',m.content,'time',m.created_at) ORDER BY m.created_at,m.id)
    FROM (SELECT * FROM public.support_ticket_message z WHERE z.ticket_id=t.id AND NOT z.is_internal AND z.sender_type NOT IN ('system','internal_note') ORDER BY z.created_at DESC,z.id DESC LIMIT 20 OFFSET (p_message_page-1)*20) m),'[]'::jsonb) AS messages
  FROM (SELECT * FROM public.support_ticket WHERE customer_id=owner_id AND (p_ticket IS NULL OR id=p_ticket) AND (p_ticket IS NOT NULL OR p_filter='all' OR (p_filter='pending' AND status='pending') OR (p_filter='processing' AND status IN ('processing','waiting_customer','waiting_manager_approval','reprocessing')) OR (p_filter='completed' AND status IN ('completed','resolved','closed'))) ORDER BY created_at DESC,id LIMIT CASE WHEN p_ticket IS NULL THEN 10 ELSE 1 END OFFSET CASE WHEN p_ticket IS NULL THEN (page_no-1)*10 ELSE 0 END) t LEFT JOIN public.appointment a ON a.id=t.appointment_id LEFT JOIN public.sales_order o ON o.id=t.order_id WHERE t.customer_id=owner_id
 ) x; RETURN jsonb_build_object('rows',result,'total',total,'page',page_no,'counts',counts);
END $$;
REVOKE ALL ON FUNCTION public.own_support_tickets(integer,text,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_support_tickets(integer,text,uuid,integer) TO authenticated;
-- Keep the staff projection scoped to assigned tickets.
DO $$
DECLARE source text:=pg_get_functiondef('public.get_staff_workspace(text,text,uuid,integer)'::regprocedure);
 needle text:='st.updated_at,st.order_id,st.appointment_id,st.resolution_type';
BEGIN
 IF strpos(source,needle)=0 THEN RAISE EXCEPTION 'unexpected_complaint_projection_definition'; END IF;
 EXECUTE replace(source,needle,'st.updated_at,st.customer_reply_due_at,st.customer_followup_message_id,st.order_id,st.appointment_id,st.resolution_type');
END $$;

NOTIFY pgrst,'reload schema';
COMMIT;
