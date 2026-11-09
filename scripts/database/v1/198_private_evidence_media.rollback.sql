BEGIN;
SET LOCAL lock_timeout='3s';
LOCK TABLE public.media_upload_session IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.media_upload_session WHERE purpose IN ('ticket_image','return_image')) THEN RAISE EXCEPTION 'evidence_rollback_requires_no_sessions';END IF;END $$;
CREATE OR REPLACE FUNCTION public.claim_media_upload(p_session uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session; a public.media_asset;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session AND created_by=auth.uid() FOR UPDATE;
 IF NOT FOUND OR NOT pawpal_private.media_manage(auth.uid(),s.purpose,s.product_id,s.appointment_id) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pawpal_private.media_settings WHERE singleton AND enabled) THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 IF s.state IN ('verified','attached') THEN SELECT * INTO a FROM public.media_asset WHERE session_id=s.id;
  RETURN jsonb_build_object('state',s.state,'asset_id',a.id); END IF;
 IF s.state<>'pending' OR s.expires_at<=now() THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
 UPDATE public.media_upload_session SET state='uploading',lease=gen_random_uuid(),lease_until=now()+interval '15 minutes' WHERE id=s.id RETURNING * INTO s;
 RETURN jsonb_build_object('state',s.state,'session_id',s.id,'lease',s.lease,'mongo_file_id',s.mongo_file_id,'size_bytes',s.declared_size,'mime_type',s.mime_type);
END $function$
;
CREATE OR REPLACE FUNCTION public.finish_media_upload(p_session uuid, p_lease uuid, p_actor uuid, p_sha256 text, p_width integer, p_height integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session; result uuid;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM pawpal_private.media_settings WHERE singleton AND enabled) THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 IF NOT FOUND OR s.created_by IS DISTINCT FROM p_actor OR s.lease IS DISTINCT FROM p_lease OR p_lease IS NULL
 OR s.state NOT IN ('uploading','verified') OR s.lease_until<=now() OR NOT pawpal_private.media_manage(p_actor,s.purpose,s.product_id,s.appointment_id)
 THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO result FROM public.media_asset WHERE session_id=s.id;
 IF FOUND THEN
  IF NOT EXISTS(SELECT 1 FROM public.media_asset WHERE id=result AND sha256=p_sha256 AND width=p_width AND height=p_height) THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN result;
 END IF;
 INSERT INTO public.media_asset(session_id,mongo_file_id,mime_type,size_bytes,sha256,width,height)
 VALUES(s.id,s.mongo_file_id,s.mime_type,s.declared_size,p_sha256,p_width,p_height) RETURNING id INTO result;
 UPDATE public.media_upload_session SET state='verified',expires_at=now()+interval '7 days' WHERE id=s.id;
 RETURN result;
END $function$
;
CREATE OR REPLACE FUNCTION public.cancel_media_upload(p_session uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session AND created_by=auth.uid() FOR UPDATE;
 IF NOT FOUND OR NOT pawpal_private.media_manage(auth.uid(),s.purpose,s.product_id,s.appointment_id) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF s.state='pending_delete' OR s.state='deleted' THEN RETURN; END IF;
 IF s.state NOT IN ('pending','verified') THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
 UPDATE public.media_upload_session SET state='pending_delete',expires_at=greatest(expires_at,now()+interval '1 hour') WHERE id=s.id;
 UPDATE public.media_asset SET status='pending_delete' WHERE session_id=s.id;
END $function$
;
CREATE OR REPLACE FUNCTION public.resolve_media_asset(p_asset uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.media_asset; s public.media_upload_session; public_read boolean; allowed boolean; staff_actor uuid;
BEGIN
 SELECT * INTO a FROM public.media_asset WHERE id=p_asset AND status IN ('verified','attached');
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id;
 public_read:=a.status='attached' AND s.purpose='product_image' AND EXISTS(SELECT 1 FROM public.product_media m JOIN public.product p ON p.id=m.product_id WHERE m.media_asset_id=a.id AND p.status='active');
 public_read:=public_read OR (a.status='attached' AND s.purpose='product_variant_image' AND EXISTS(
 SELECT 1 FROM public.product_variant_media m JOIN public.product_variant v ON v.id=m.product_variant_id JOIN public.product p ON p.id=v.product_id
 WHERE m.media_asset_id=a.id AND v.id=s.variant_id AND p.status='active' AND v.status='active' AND NOT v.catalog_retired));
 public_read:=public_read OR (a.status='attached' AND s.purpose='service_image' AND EXISTS(SELECT 1 FROM public.service_image m JOIN public.service v ON v.id=m.service_id WHERE m.media_asset_id=a.id AND v.id=s.service_id AND v.status='active'));
 allowed:=public_read;
 IF NOT allowed AND auth.uid() IS NOT NULL THEN
  allowed:=pawpal_private.media_manage(auth.uid(),s.purpose,s.product_id,s.appointment_id) AND (a.status='attached' OR s.created_by=auth.uid());
  IF NOT allowed AND a.status='attached' AND s.purpose IN ('intake_image','handover_image') AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.appointment_record_media m JOIN public.appointment_record r ON r.id=m.record_id JOIN public.appointment ap ON ap.id=r.appointment_id WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='adjustment_image' AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.appointment_adjustment_media m JOIN public.appointment_adjustment r ON r.id=m.adjustment_id JOIN public.appointment ap ON ap.id=r.appointment_id WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='pet_avatar' THEN
   allowed:=EXISTS(SELECT 1 FROM public.pet_profile p WHERE p.avatar_media_asset_id=a.id AND p.id=s.pet_id AND (
    (NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) AND pawpal_private.owns_customer(p.customer_id))
    OR EXISTS(SELECT 1 FROM public.appointment ap WHERE ap.pet_id=p.id AND pawpal_private.media_manage(auth.uid(),'care_log_image',null,ap.id))));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='care_log_image'
  AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.care_log_media m JOIN public.care_log l ON l.id=m.care_log_id JOIN public.appointment ap ON ap.id=l.appointment_id
    WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
 END IF;
 IF NOT coalesce(allowed,false) THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('id',a.id,'mongo_file_id',a.mongo_file_id,'mime_type',a.mime_type,'size_bytes',a.size_bytes,'sha256',a.sha256,'public',public_read);
END $function$
;
CREATE OR REPLACE FUNCTION public.claim_media_cleanup(p_limit integer DEFAULT 10)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session; a public.media_asset; token uuid;
BEGIN
 IF p_limit NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
 FOR s IN SELECT * FROM public.media_upload_session WHERE
 (state IN ('pending','uploading','verified','pending_delete') AND expires_at<now() AND coalesce(lease_until,now()-interval '1 second')<now())
 OR (state='cleaning' AND lease_until<now()) ORDER BY created_at LIMIT p_limit FOR UPDATE SKIP LOCKED LOOP
  SELECT * INTO a FROM public.media_asset WHERE session_id=s.id FOR UPDATE;
  IF a.id IS NOT NULL AND (a.legal_hold OR a.retention_until>now() OR EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id=a.id)) THEN CONTINUE; END IF;
  token:=gen_random_uuid();
  UPDATE public.media_upload_session SET state='cleaning',lease=token,lease_until=now()+interval '15 minutes' WHERE id=s.id;
  UPDATE public.media_asset SET status='cleaning' WHERE session_id=s.id;
  RETURN NEXT jsonb_build_object('session_id',s.id,'mongo_file_id',s.mongo_file_id,'lease',token);
 END LOOP;
END $function$
;
CREATE OR REPLACE FUNCTION pawpal_private.release_media_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
 IF OLD.media_asset_id IS NULL OR (TG_OP='UPDATE' AND NEW.media_asset_id IS NOT DISTINCT FROM OLD.media_asset_id) THEN RETURN NULL; END IF;
 PERFORM 1 FROM public.media_upload_session WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.media_asset_id) FOR UPDATE;
 PERFORM 1 FROM public.media_asset WHERE id=OLD.media_asset_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=OLD.media_asset_id)
 AND NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=OLD.media_asset_id) THEN
  UPDATE public.media_asset SET status='pending_delete',retention_until=now()+interval '7 days' WHERE id=OLD.media_asset_id;
  UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '7 days' WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.media_asset_id);
 END IF;
 RETURN NULL;
END $function$
;
CREATE OR REPLACE FUNCTION public.create_own_support_ticket(p_id uuid, p_category text, p_subject text, p_content text, p_appointment uuid DEFAULT NULL::uuid, p_order uuid DEFAULT NULL::uuid, p_resolution text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
END $function$
;
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
 UPDATE public.support_ticket SET status=next_status,updated_at=clock_timestamp(),first_response_at=CASE WHEN p_action='message' AND NOT internal_value THEN coalesce(first_response_at,clock_timestamp()) ELSE first_response_at END WHERE id=ticket.id;
 INSERT INTO public.support_ticket_message(ticket_id,sender_type,sender_account_id,content,is_internal) VALUES(ticket.id,'staff',auth.uid(),CASE WHEN p_action='message' THEN note_value ELSE '['||CASE p_action WHEN 'link_source' THEN 'Liên kết giao dịch' WHEN 'request_info' THEN 'Yêu cầu bổ sung' WHEN 'resolve' THEN 'Giải quyết' WHEN 'propose' THEN 'Đề xuất' WHEN 'approve' THEN 'Phê duyệt' WHEN 'reject_proposal' THEN 'Từ chối đề xuất' WHEN 'complete' THEN 'Liên kết kết quả' WHEN 'close' THEN 'Đóng phiếu' WHEN 'reopen' THEN 'Mở lại' END||'] '||note_value END,internal_value);
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request_id,actor,'COMPLAINT_ACTION','support_ticket',ticket.id,
 CASE WHEN p_action='propose' THEN (payload::jsonb||jsonb_build_object('source_staff_id',(SELECT staff_id FROM public.appointment WHERE id=ticket.appointment_id)))::text ELSE payload END);
 RETURN ticket.id;
END $function$
;
DROP FUNCTION public.prepare_evidence_media_upload(uuid,text,uuid,uuid,bigint,text,text),public.create_own_support_ticket_media(uuid,text,text,text,uuid,uuid,text,jsonb),public.reply_own_support_ticket_media(uuid,uuid,text,jsonb),public.request_own_sales_return_media(uuid,uuid,timestamptz,jsonb,jsonb),public.list_ticket_media(uuid),public.list_return_media(uuid);
DROP POLICY evidence_ticket_boundary ON public.support_ticket_message_attachment;
DROP POLICY evidence_return_boundary ON public.return_request_evidence;
DROP FUNCTION pawpal_private.can_read_ticket_attachment(uuid),pawpal_private.can_read_return_evidence(uuid);
DROP FUNCTION pawpal_private.attach_private_evidence(text,uuid,jsonb),pawpal_private.media_session_manage(uuid,uuid,boolean),pawpal_private.evidence_access(uuid,text,uuid,uuid,boolean),pawpal_private.evidence_customer(uuid),pawpal_private.evidence_admin(uuid);
ALTER TABLE public.support_ticket_message_attachment DROP CONSTRAINT ticket_attachment_one_source,DROP COLUMN media_asset_id,ALTER COLUMN file_url SET NOT NULL;
ALTER TABLE public.return_request_evidence DROP CONSTRAINT return_evidence_one_source,DROP COLUMN media_asset_id,ALTER COLUMN image_url SET NOT NULL;
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check,DROP COLUMN ticket_id,DROP COLUMN support_message_id,DROP COLUMN return_id,DROP COLUMN sales_order_id;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK ((((pet_id IS NULL) AND (((adjustment_id IS NULL) AND (((record_id IS NULL) AND (((service_id IS NULL) AND (((purpose = 'product_image'::text) AND (variant_id IS NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))) OR ((purpose = 'care_log_image'::text) AND (variant_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (appointment_id IS NOT NULL)) OR ((purpose = 'product_variant_image'::text) AND (variant_id IS NOT NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = 'service_image'::text) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (variant_id IS NULL) AND ((service_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = ANY (ARRAY['intake_image'::text, 'handover_image'::text])) AND (appointment_id IS NOT NULL) AND (record_id IS NOT NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'adjustment_image'::text) AND (appointment_id IS NOT NULL) AND (adjustment_id IS NOT NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'pet_avatar'::text) AND (pet_id IS NOT NULL) AND (appointment_id IS NULL) AND (adjustment_id IS NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL))));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK ((purpose = ANY (ARRAY['product_image'::text, 'care_log_image'::text, 'product_variant_image'::text, 'service_image'::text, 'intake_image'::text, 'handover_image'::text, 'adjustment_image'::text, 'pet_avatar'::text])));
GRANT INSERT ON public.return_request_evidence TO authenticated;
GRANT SELECT ON public.return_request_evidence TO authenticated;
GRANT UPDATE ON public.return_request_evidence TO authenticated;
GRANT DELETE ON public.return_request_evidence TO authenticated;
GRANT INSERT ON public.support_ticket_message_attachment TO authenticated;
GRANT SELECT ON public.support_ticket_message_attachment TO authenticated;
GRANT UPDATE ON public.support_ticket_message_attachment TO authenticated;
GRANT DELETE ON public.support_ticket_message_attachment TO authenticated;
COMMIT;
