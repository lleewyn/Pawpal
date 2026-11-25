BEGIN;
-- A real configuration entry, not a fabricated payment or customer record.
LOCK TABLE public.payment_method_config IN SHARE ROW EXCLUSIVE MODE;
INSERT INTO public.payment_method_config(name,short_name,description,fee,available,requires_info)
SELECT 'Tiền mặt','Cash','Nhân viên xác nhận tiền mặt đã nhận hoặc đã hoàn.',0,true,false
WHERE NOT EXISTS(SELECT 1 FROM public.payment_method_config WHERE name='Tiền mặt');

CREATE OR REPLACE FUNCTION public.get_admin_service_cashier(p_appointment_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment; due numeric; net numeric; entries jsonb; methods jsonb;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.read') OR NOT pawpal_private.has_permission('appointment_item.read')
 OR NOT pawpal_private.has_permission('appointment_adjustment.read') OR NOT pawpal_private.has_permission('voucher_redemption.read')
 OR NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('refund_transaction.read')
 OR NOT pawpal_private.has_permission('payment_method_config.read') THEN RAISE EXCEPTION 'service_cashier_forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 SELECT total_price INTO due FROM public.appointment_totals WHERE appointment_id=a.id;
 SELECT coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('method_name',(SELECT name FROM public.payment_method_config WHERE id=p.payment_method_config_id),'refunds',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.refund_transaction r WHERE r.payment_id=p.id),'[]'::jsonb)) ORDER BY p.id),'[]'::jsonb)
 INTO entries FROM public.payment p WHERE p.appointment_id=a.id;
 SELECT coalesce(sum(p.amount-coalesce((SELECT sum(r.refunded_amount) FROM public.refund_transaction r WHERE r.payment_id=p.id AND r.refund_status='succeeded'),0)),0)
 INTO net FROM public.payment p WHERE p.appointment_id=a.id AND p.transaction_status='succeeded';
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'requires_reference',name<>'Tiền mặt') ORDER BY name),'[]'::jsonb)
 INTO methods FROM public.payment_method_config WHERE available AND fee=0 AND name IN ('Tiền mặt','Chuyển khoản ngân hàng','Quét mã VietQR');
 RETURN jsonb_build_object('appointment_id',a.id,'appointment_code',a.appointment_code,'status',a.appointment_status,'total',coalesce(due,0),'collected',net,'remaining',greatest(coalesce(due,0)-net,0),'payments',entries,'methods',methods,
 'version',md5(jsonb_build_object('updated_at',a.updated_at,'total',due,'payments',entries)::text));
END $$;

-- Narrow server transaction: callers still have no direct INSERT/UPDATE on money tables.
CREATE OR REPLACE FUNCTION public.post_admin_service_money(p_request_id uuid,p_appointment_id uuid,p_expected_state text,p_action text,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; a public.appointment; method public.payment_method_config; source public.payment; context jsonb;
 amount_value numeric; reason_value text:=btrim(p_details->>'reason'); reference_value text:=nullif(btrim(p_details->>'reference'),'');
 prior public.audit_log; remaining_value numeric; receipt text; action_name text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('payment.write') OR NOT pawpal_private.has_permission('audit_log.write')
 OR (p_action='refund' AND NOT pawpal_private.has_permission('refund_transaction.write')) THEN RAISE EXCEPTION 'service_cashier_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_appointment_id IS NULL OR p_action IS NULL OR p_action NOT IN ('collect','refund')
 OR p_details IS NULL OR jsonb_typeof(p_details)<>'object' OR length(p_details::text)>6000 OR p_details->>'confirmed' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'invalid_service_money' USING ERRCODE='22023'; END IF;
 amount_value:=nullif(p_details->>'amount','')::numeric;
 IF amount_value IS NULL OR amount_value::text IN ('NaN','Infinity','-Infinity') OR amount_value<=0 OR amount_value>100000000000 OR round(amount_value,0)<>amount_value
 OR coalesce(length(reason_value),0) NOT BETWEEN 2 AND 2000 OR coalesce(length(reference_value),0)>200 THEN RAISE EXCEPTION 'invalid_service_money' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,17));
 action_name:=CASE WHEN p_action='collect' THEN 'SERVICE_COLLECT' ELSE 'SERVICE_REFUND' END;
 SELECT * INTO prior FROM public.audit_log WHERE entity_id=p_request_id AND action IN ('SERVICE_COLLECT','SERVICE_REFUND') LIMIT 1;
 IF FOUND THEN
  IF prior.action<>action_name OR prior.staff_id IS DISTINCT FROM actor OR prior.description<>jsonb_build_object('appointment_id',p_appointment_id,'details',p_details)::text THEN RAISE EXCEPTION 'service_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 END IF;
 SELECT * INTO method FROM public.payment_method_config WHERE id=nullif(p_details->>'method_id','')::uuid;
 IF NOT FOUND OR NOT method.available OR method.fee<>0 OR method.name NOT IN ('Tiền mặt','Chuyển khoản ngân hàng','Quét mã VietQR') THEN RAISE EXCEPTION 'service_money_method_invalid' USING ERRCODE='22023'; END IF;
 IF method.name<>'Tiền mặt' THEN
  IF reference_value IS NULL THEN RAISE EXCEPTION 'service_money_reference_required' USING ERRCODE='22023'; END IF;
  receipt:='manual-bank:'||reference_value;
  PERFORM pg_advisory_xact_lock(hashtextextended(receipt,17));
  IF EXISTS(SELECT 1 FROM public.payment WHERE gateway_transaction_id=receipt) OR EXISTS(SELECT 1 FROM public.refund_transaction WHERE gateway_transaction_id=receipt) THEN RAISE EXCEPTION 'service_money_reference_duplicate' USING ERRCODE='PT409'; END IF;
 END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 context:=public.get_admin_service_cashier(a.id);
 IF p_expected_state IS NULL OR context->>'version'<>p_expected_state THEN RAISE EXCEPTION 'service_cashier_changed' USING ERRCODE='PT409'; END IF;
 IF p_action='collect' THEN
  IF a.appointment_status IN ('cancelled','no_show') THEN RAISE EXCEPTION 'service_money_booking_closed' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment_adjustment WHERE appointment_id=a.id AND (approval_status='pending' OR (approval_status='approved' AND customer_consent_status<>'confirmed'))) THEN RAISE EXCEPTION 'pending_service_adjustments' USING ERRCODE='22023'; END IF;
  IF amount_value>(context->>'remaining')::numeric THEN RAISE EXCEPTION 'service_money_exceeds_balance' USING ERRCODE='22023'; END IF;
  INSERT INTO public.payment(id,payment_code,customer_id,payment_method_config_id,payment_type,amount,transaction_status,succeeded_at,gateway_transaction_id,idempotency_key,appointment_id,eligible_spend_amount)
  VALUES(p_request_id,'SV-PAY-'||p_request_id,a.customer_id,method.id,'service_collection',amount_value,'succeeded',clock_timestamp(),receipt,'service-collect:'||p_request_id,a.id,0);
 ELSE
  SELECT * INTO source FROM public.payment WHERE id=nullif(p_details->>'payment_id','')::uuid AND appointment_id=a.id FOR UPDATE;
  IF NOT FOUND OR source.transaction_status<>'succeeded' THEN RAISE EXCEPTION 'service_refund_source_invalid' USING ERRCODE='22023'; END IF;
  IF source.eligible_spend_amount>0 OR EXISTS(SELECT 1 FROM public.paw_point_transaction WHERE payment_id=source.id) THEN RAISE EXCEPTION 'service_refund_ledger_review_required' USING ERRCODE='22023'; END IF;
  SELECT source.amount-coalesce(sum(refunded_amount),0) INTO remaining_value FROM public.refund_transaction WHERE payment_id=source.id AND refund_status='succeeded';
  IF amount_value>remaining_value THEN RAISE EXCEPTION 'service_money_exceeds_balance' USING ERRCODE='22023'; END IF;
  INSERT INTO public.refund_transaction(id,refund_code,payment_id,refund_type,requested_amount,approved_amount,refunded_amount,refund_method,refund_status,gateway_transaction_id,note,processed_by,processed_at,completed_at,eligible_refund_amount)
  VALUES(p_request_id,'SV-REF-'||p_request_id,source.id,'service_refund',amount_value,amount_value,amount_value,method.name,'succeeded',receipt,reason_value,actor,clock_timestamp(),clock_timestamp(),0);
 END IF;
 UPDATE public.appointment SET updated_at=clock_timestamp() WHERE id=a.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,action_name,CASE WHEN p_action='collect' THEN 'payment' ELSE 'refund_transaction' END,p_request_id,jsonb_build_object('appointment_id',a.id,'details',p_details)::text);
 RETURN p_request_id;
END $$;
CREATE OR REPLACE FUNCTION public.update_admin_service_booking(p_id uuid,p_expected_updated_at timestamptz,p_action text,p_value text,p_reason text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment; actor uuid; staff_key uuid; svc public.service;
BEGIN
 IF NOT pawpal_private.has_permission('appointment.write') OR NOT pawpal_private.has_permission('audit_log.write') OR NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('refund_transaction.read') THEN RAISE EXCEPTION 'booking_write_forbidden' USING ERRCODE='42501'; END IF;
 IF p_action='assign' THEN
  staff_key:=p_value::uuid;
  PERFORM 1 FROM public.staff WHERE id=staff_key AND employment_status='active' AND NOT service_locked FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'staff_not_eligible' USING ERRCODE='22023'; END IF;
 END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected_updated_at IS NULL OR a.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'booking_changed_reload_required' USING ERRCODE='PT409'; END IF;
 IF length(p_reason)>2000 THEN RAISE EXCEPTION 'invalid_reason' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF p_action='status' THEN
  IF NOT ((a.appointment_status='pending' AND p_value IN ('confirmed','cancelled')) OR (a.appointment_status='confirmed' AND p_value IN ('checked_in','cancelled','no_show')) OR (a.appointment_status='checked_in' AND p_value='cancelled') OR (a.appointment_status='no_show' AND p_value='cancelled')) THEN RAISE EXCEPTION 'invalid_booking_transition' USING ERRCODE='22023'; END IF;
  IF p_value='no_show' AND a.scheduled_start_at>now() THEN RAISE EXCEPTION 'booking_has_not_started' USING ERRCODE='22023'; END IF;
  IF p_value='cancelled' AND coalesce(length(btrim(p_reason)),0)=0 THEN RAISE EXCEPTION 'cancellation_reason_required' USING ERRCODE='22023'; END IF;
  IF p_value='cancelled' AND EXISTS(SELECT 1 FROM public.payment p WHERE p.appointment_id=p_id AND p.transaction_status='succeeded' AND p.amount>coalesce((SELECT sum(r.refunded_amount) FROM public.refund_transaction r WHERE r.payment_id=p.id AND r.refund_status='succeeded'),0)) THEN RAISE EXCEPTION 'paid_booking_requires_refund_workflow' USING ERRCODE='22023'; END IF;
  UPDATE public.appointment SET appointment_status=p_value,check_in_time=CASE WHEN p_value='checked_in' THEN now() ELSE check_in_time END WHERE id=p_id;
 ELSEIF p_action='assign' THEN
  IF a.appointment_status NOT IN ('pending','confirmed','checked_in','in_progress') OR coalesce(length(btrim(p_reason)),0)=0 THEN RAISE EXCEPTION 'invalid_staff_assignment' USING ERRCODE='22023'; END IF;
  SELECT s.* INTO svc FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id WHERE i.appointment_id=p_id AND i.is_primary;
  IF svc.staff_level_required_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff s JOIN public.staff_level actual ON actual.id=s.staff_level_id JOIN public.staff_level required ON required.id=svc.staff_level_required_id WHERE s.id=staff_key AND actual.rank_order>=required.rank_order) THEN RAISE EXCEPTION 'staff_level_required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.appointment WHERE id<>p_id AND staff_id=staff_key AND appointment_status NOT IN ('cancelled','no_show','completed') AND scheduled_start_at<a.scheduled_end_at AND scheduled_end_at>a.scheduled_start_at) THEN RAISE EXCEPTION 'staff_schedule_conflict' USING ERRCODE='PT409'; END IF;
  UPDATE public.appointment SET staff_id=staff_key WHERE id=p_id;
 ELSE RAISE EXCEPTION 'invalid_booking_action' USING ERRCODE='22023'; END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'UPDATE_APPOINTMENT','appointment',p_id,jsonb_build_object('action',p_action,'value',p_value,'reason',btrim(p_reason))::text);
 RETURN p_id;
END $$;

CREATE OR REPLACE FUNCTION pawpal_private.guard_service_staff_availability()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.staff_id IS NULL OR NEW.appointment_status IN ('completed','cancelled','no_show') THEN RETURN NEW; END IF;
 PERFORM 1 FROM public.staff WHERE id=NEW.staff_id FOR UPDATE;
 IF EXISTS(SELECT 1 FROM public.staff_schedule WHERE staff_id=NEW.staff_id AND schedule_status='active' AND availability_status<>'available'
 AND start_at<NEW.scheduled_end_at AND end_at>NEW.scheduled_start_at) THEN RAISE EXCEPTION 'staff_not_available' USING ERRCODE='PT409'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS v1_service_staff_availability ON public.appointment;
CREATE TRIGGER v1_service_staff_availability BEFORE INSERT OR UPDATE OF staff_id,scheduled_start_at,scheduled_end_at,appointment_status ON public.appointment FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_service_staff_availability();
REVOKE ALL ON FUNCTION pawpal_private.guard_service_staff_availability() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_admin_service_cashier(uuid),public.post_admin_service_money(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_service_cashier(uuid),public.post_admin_service_money(uuid,uuid,text,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
