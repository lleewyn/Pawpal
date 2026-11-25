BEGIN;
CREATE OR REPLACE FUNCTION public.save_admin_sales_return(p_request_id uuid,p_return_id uuid,p_order_id uuid,p_expected_updated_at timestamptz,p_action text,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; o public.sales_order; r public.return_request; prior public.audit_log; item jsonb; line record; payload text;
 seen uuid[]:='{}'; line_id uuid; qty numeric; received boolean; saleable boolean;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('return_request.write') OR NOT pawpal_private.has_permission('return_request_detail.write')
 OR NOT pawpal_private.has_permission('inventory_transaction.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'sales_return_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_return_id IS NULL OR p_order_id IS NULL OR coalesce(p_action,'') NOT IN ('create','receive','reject')
 OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>30000 THEN RAISE EXCEPTION 'invalid_sales_return' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('return_id',p_return_id,'order_id',p_order_id,'action',p_action,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,23));
 SELECT * INTO prior FROM public.audit_log WHERE entity_id=p_request_id AND action='SALES_RETURN';
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'sales_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_return_id;
 END IF;
 SELECT * INTO o FROM public.sales_order WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'sales_order_not_found' USING ERRCODE='P0002'; END IF;
 IF p_action='create' THEN
  IF p_expected_updated_at IS NULL OR o.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'sales_order_changed' USING ERRCODE='PT409'; END IF;
  IF o.order_status NOT IN ('completed','delivered','returned') OR coalesce(length(btrim(p_details->>'reason')),0) NOT BETWEEN 2 AND 2000
  OR coalesce(p_details->>'type','') NOT IN ('refund','exchange','resend') OR jsonb_typeof(p_details->'lines') IS DISTINCT FROM 'array'
  OR jsonb_array_length(p_details->'lines') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_sales_return' USING ERRCODE='22023'; END IF;
  INSERT INTO public.return_request(id,sales_order_id,reason,return_type,description,request_status)
  VALUES(p_return_id,o.id,btrim(p_details->>'reason'),p_details->>'type',p_details->>'note','pending');
  FOR item IN SELECT value FROM jsonb_array_elements(p_details->'lines') LOOP
   line_id:=(item->>'line_id')::uuid;qty:=(item->>'quantity')::numeric;
   IF line_id IS NULL OR line_id=ANY(seen) OR qty IS NULL OR qty::text IN ('NaN','Infinity','-Infinity') OR qty NOT BETWEEN 1 AND 100000000 OR round(qty)<>qty
   OR NOT EXISTS(SELECT 1 FROM public.sales_order_detail WHERE id=line_id AND order_id=o.id) THEN RAISE EXCEPTION 'invalid_sales_return_line' USING ERRCODE='22023'; END IF;
   INSERT INTO public.return_request_detail(return_request_id,sales_order_detail_id,quantity) VALUES(p_return_id,line_id,qty);
   seen:=array_append(seen,line_id);
  END LOOP;
 ELSE
  SELECT * INTO r FROM public.return_request WHERE id=p_return_id AND sales_order_id=o.id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'sales_return_not_found' USING ERRCODE='P0002'; END IF;
  IF p_expected_updated_at IS NULL OR r.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'sales_return_changed' USING ERRCODE='PT409'; END IF;
  IF r.request_status NOT IN ('pending','approved') THEN RAISE EXCEPTION 'sales_return_already_resolved' USING ERRCODE='22023'; END IF;
 END IF;
 received:=p_details->>'received'='true'; saleable:=p_details->>'saleable'='true';
 IF p_action='receive' AND received IS DISTINCT FROM true THEN RAISE EXCEPTION 'sales_return_receipt_confirmation_required' USING ERRCODE='22023'; END IF;
 IF received AND p_action<>'reject' THEN
  IF p_details->>'inspected' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'sales_return_inspection_required' USING ERRCODE='22023'; END IF;
  IF saleable THEN
   PERFORM 1 FROM public.product WHERE id IN (SELECT v.product_id FROM public.return_request_detail d JOIN public.sales_order_detail l ON l.id=d.sales_order_detail_id JOIN public.product_variant v ON v.id=l.product_variant_id WHERE d.return_request_id=p_return_id) ORDER BY id FOR UPDATE;
   PERFORM 1 FROM public.product_variant WHERE id IN (SELECT l.product_variant_id FROM public.return_request_detail d JOIN public.sales_order_detail l ON l.id=d.sales_order_detail_id WHERE d.return_request_id=p_return_id) ORDER BY id FOR UPDATE;
   FOR line IN SELECT d.*,l.product_variant_id FROM public.return_request_detail d JOIN public.sales_order_detail l ON l.id=d.sales_order_detail_id WHERE d.return_request_id=p_return_id ORDER BY l.product_variant_id,d.id LOOP
    INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,note,staff_id,return_request_detail_id,idempotency_key)
    VALUES(line.product_variant_id,'sale_return',line.quantity,'Đã nhận và kiểm định hàng trả của đơn '||o.order_code,actor,line.id,'sales-return:'||line.id);
   END LOOP;
  END IF;
  UPDATE public.return_request SET request_status='received',resolution_type=CASE WHEN saleable THEN 'received_saleable' ELSE 'received_unsaleable' END,resolved_by=actor,updated_at=clock_timestamp() WHERE id=p_return_id;
 ELSIF p_action='reject' THEN
  IF coalesce(length(btrim(p_details->>'reason')),0)<2 THEN RAISE EXCEPTION 'sales_return_reason_required' USING ERRCODE='22023'; END IF;
  UPDATE public.return_request SET request_status='rejected',resolution_type=btrim(p_details->>'reason'),resolved_by=actor,updated_at=clock_timestamp() WHERE id=p_return_id;
 END IF;
 UPDATE public.sales_order SET updated_at=clock_timestamp() WHERE id=o.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SALES_RETURN','return_request',p_request_id,payload);
 RETURN p_return_id;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_sales_return(uuid,uuid,uuid,timestamptz,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admin_sales_return(uuid,uuid,uuid,timestamptz,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
