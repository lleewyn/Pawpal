BEGIN;
CREATE OR REPLACE FUNCTION public.get_admin_sales_cashier(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE a public.sales_order; due numeric; net numeric; entries jsonb; methods jsonb;
BEGIN
 IF NOT pawpal_private.has_permission('sales_order.read') OR NOT pawpal_private.has_permission('sales_order_detail.read') OR NOT pawpal_private.has_permission('voucher_redemption.read') OR NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('refund_transaction.read') OR NOT pawpal_private.has_permission('payment_method_config.read') THEN RAISE EXCEPTION 'sales_cashier_forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.sales_order WHERE id=p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 SELECT total_amount INTO due FROM public.sales_order_totals WHERE order_id=a.id;
 SELECT coalesce(jsonb_agg(to_jsonb(p)||jsonb_build_object('method_name',(SELECT name FROM public.payment_method_config WHERE id=p.payment_method_config_id),'refunds',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM public.refund_transaction r WHERE r.payment_id=p.id),'[]'::jsonb)) ORDER BY p.id),'[]'::jsonb)
 INTO entries FROM public.payment p WHERE p.order_id=a.id;
 SELECT coalesce(sum(p.amount-coalesce((SELECT sum(r.refunded_amount) FROM public.refund_transaction r WHERE r.payment_id=p.id AND r.refund_status='succeeded'),0)),0)
 INTO net FROM public.payment p WHERE p.order_id=a.id AND p.transaction_status='succeeded';
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',id,'name',name,'requires_reference',name<>'Tiền mặt') ORDER BY name),'[]'::jsonb)
 INTO methods FROM public.payment_method_config WHERE available AND fee=0 AND name IN ('Tiền mặt','Chuyển khoản ngân hàng','Quét mã VietQR');
 RETURN jsonb_build_object('order_id',a.id,'order_code',a.order_code,'status',a.order_status,'total',coalesce(due,0),'collected',net,'remaining',greatest(coalesce(due,0)-net,0),'payments',entries,'methods',methods,
 'version',md5(jsonb_build_object('updated_at',a.updated_at,'total',due,'payments',entries)::text));
END $$;

-- Narrow server transaction: callers still have no direct INSERT/UPDATE on money tables.
CREATE OR REPLACE FUNCTION public.post_admin_sales_money(p_request_id uuid,p_order_id uuid,p_expected_state text,p_action text,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; a public.sales_order; method public.payment_method_config; source public.payment; context jsonb;
 amount_value numeric; reason_value text:=btrim(p_details->>'reason'); reference_value text:=nullif(btrim(p_details->>'reference'),'');
 prior public.audit_log; remaining_value numeric; receipt text; action_name text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('payment.write') OR NOT pawpal_private.has_permission('audit_log.write')
 OR (p_action='refund' AND NOT pawpal_private.has_permission('refund_transaction.write')) THEN RAISE EXCEPTION 'sales_cashier_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_order_id IS NULL OR p_action IS NULL OR p_action NOT IN ('collect','refund')
 OR p_details IS NULL OR jsonb_typeof(p_details)<>'object' OR length(p_details::text)>6000 OR p_details->>'confirmed' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'invalid_sales_money' USING ERRCODE='22023'; END IF;
 amount_value:=nullif(p_details->>'amount','')::numeric;
 IF amount_value IS NULL OR amount_value::text IN ('NaN','Infinity','-Infinity') OR amount_value<=0 OR amount_value>100000000000 OR round(amount_value,0)<>amount_value
 OR coalesce(length(reason_value),0) NOT BETWEEN 2 AND 2000 OR coalesce(length(reference_value),0)>200 THEN RAISE EXCEPTION 'invalid_sales_money' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,17));
 action_name:=CASE WHEN p_action='collect' THEN 'SALES_COLLECT' ELSE 'SALES_REFUND' END;
 SELECT * INTO prior FROM public.audit_log WHERE entity_id=p_request_id AND action IN ('SALES_COLLECT','SALES_REFUND') LIMIT 1;
 IF FOUND THEN
  IF prior.action<>action_name OR prior.staff_id IS DISTINCT FROM actor OR prior.description<>jsonb_build_object('order_id',p_order_id,'details',p_details)::text THEN RAISE EXCEPTION 'sales_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 END IF;
 SELECT * INTO method FROM public.payment_method_config WHERE id=nullif(p_details->>'method_id','')::uuid;
 IF NOT FOUND OR NOT method.available OR method.fee<>0 OR method.name NOT IN ('Tiền mặt','Chuyển khoản ngân hàng','Quét mã VietQR') THEN RAISE EXCEPTION 'sales_money_method_invalid' USING ERRCODE='22023'; END IF;
 IF method.name<>'Tiền mặt' THEN
  IF reference_value IS NULL THEN RAISE EXCEPTION 'sales_money_reference_required' USING ERRCODE='22023'; END IF;
  receipt:='manual-bank:'||reference_value;
  PERFORM pg_advisory_xact_lock(hashtextextended(receipt,17));
  IF EXISTS(SELECT 1 FROM public.payment WHERE gateway_transaction_id=receipt) OR EXISTS(SELECT 1 FROM public.refund_transaction WHERE gateway_transaction_id=receipt) THEN RAISE EXCEPTION 'sales_money_reference_duplicate' USING ERRCODE='PT409'; END IF;
 END IF;
 SELECT * INTO a FROM public.sales_order WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found' USING ERRCODE='P0002'; END IF;
 context:=public.get_admin_sales_cashier(a.id);
 IF p_expected_state IS NULL OR context->>'version'<>p_expected_state THEN RAISE EXCEPTION 'sales_cashier_changed' USING ERRCODE='PT409'; END IF;
 IF p_action='collect' THEN
  IF a.order_status IN ('cancelled','returned') THEN RAISE EXCEPTION 'sales_money_booking_closed' USING ERRCODE='22023'; END IF;
  IF amount_value>(context->>'remaining')::numeric THEN RAISE EXCEPTION 'sales_money_exceeds_balance' USING ERRCODE='22023'; END IF;
  INSERT INTO public.payment(id,payment_code,customer_id,payment_method_config_id,payment_type,amount,transaction_status,succeeded_at,gateway_transaction_id,idempotency_key,order_id,eligible_spend_amount)
  VALUES(p_request_id,'SO-PAY-'||p_request_id,a.customer_id,method.id,'sale_collection',amount_value,'succeeded',clock_timestamp(),receipt,'sales-collect:'||p_request_id,a.id,0);
 ELSE
  SELECT * INTO source FROM public.payment WHERE id=nullif(p_details->>'payment_id','')::uuid AND order_id=a.id FOR UPDATE;
  IF NOT FOUND OR source.transaction_status<>'succeeded' THEN RAISE EXCEPTION 'sales_refund_source_invalid' USING ERRCODE='22023'; END IF;
  IF source.eligible_spend_amount>0 OR EXISTS(SELECT 1 FROM public.paw_point_transaction WHERE payment_id=source.id) THEN RAISE EXCEPTION 'sales_refund_ledger_review_required' USING ERRCODE='22023'; END IF;
  SELECT source.amount-coalesce(sum(refunded_amount),0) INTO remaining_value FROM public.refund_transaction WHERE payment_id=source.id AND refund_status='succeeded';
  IF amount_value>remaining_value THEN RAISE EXCEPTION 'sales_money_exceeds_balance' USING ERRCODE='22023'; END IF;
  INSERT INTO public.refund_transaction(id,refund_code,payment_id,refund_type,requested_amount,approved_amount,refunded_amount,refund_method,refund_status,gateway_transaction_id,note,processed_by,processed_at,completed_at,eligible_refund_amount)
  VALUES(p_request_id,'SO-REF-'||p_request_id,source.id,'sales_refund',amount_value,amount_value,amount_value,method.name,'succeeded',receipt,reason_value,actor,clock_timestamp(),clock_timestamp(),0);
 END IF;
 UPDATE public.sales_order SET updated_at=clock_timestamp() WHERE id=a.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,action_name,CASE WHEN p_action='collect' THEN 'payment' ELSE 'refund_transaction' END,p_request_id,jsonb_build_object('order_id',a.id,'details',p_details)::text);
 RETURN p_request_id;
END $$;

REVOKE ALL ON FUNCTION public.get_admin_sales_cashier(uuid),public.post_admin_sales_money(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_sales_cashier(uuid),public.post_admin_sales_money(uuid,uuid,text,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
