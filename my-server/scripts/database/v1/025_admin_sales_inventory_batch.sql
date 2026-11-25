BEGIN;
CREATE OR REPLACE FUNCTION public.post_admin_sales_inventory_batch(p_request_id uuid,p_mode text,p_details jsonb,p_lines jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; prior public.audit_log; item jsonb; payload text; variant_id uuid; line_id uuid; qty numeric; price_value numeric; balance_value integer; delta integer; inventory_time timestamptz; seen uuid[]:='{}';
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('inventory_transaction.write') OR NOT pawpal_private.has_permission('audit_log.write')
 OR (p_mode='receipt' AND (NOT pawpal_private.has_permission('purchase_order.write') OR NOT pawpal_private.has_permission('purchase_order_detail.write'))) THEN RAISE EXCEPTION 'sales_inventory_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR coalesce(p_mode,'') NOT IN ('receipt','stocktake') OR jsonb_typeof(p_details) IS DISTINCT FROM 'object'
 OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 500 OR length(p_lines::text)>200000 OR length(p_details::text)>6000
 OR coalesce(length(btrim(p_details->>'reason')),0) NOT BETWEEN 2 AND 2000 OR p_details->>'confirmed' IS DISTINCT FROM 'true'
 THEN RAISE EXCEPTION 'invalid_sales_inventory_batch' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('mode',p_mode,'details',p_details,'lines',p_lines)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,25));
 SELECT * INTO prior FROM public.audit_log WHERE entity_id=p_request_id AND action='SALES_INVENTORY_BATCH';
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'sales_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 END IF;
 IF p_mode='receipt' THEN
  IF NOT EXISTS(SELECT 1 FROM public.supplier WHERE id=(p_details->>'supplier_id')::uuid AND status='active') THEN RAISE EXCEPTION 'sales_supplier_required' USING ERRCODE='22023'; END IF;
  IF nullif(btrim(p_details->>'invoice'),'') IS NOT NULL THEN
   PERFORM pg_advisory_xact_lock(hashtextextended('sales-invoice:'||(p_details->>'supplier_id')||':'||lower(btrim(p_details->>'invoice')),25));
   IF EXISTS(SELECT 1 FROM public.audit_log WHERE action='SALES_INVENTORY_BATCH' AND description::jsonb->>'mode'='receipt'
    AND description::jsonb->'details'->>'supplier_id'=p_details->>'supplier_id'
    AND lower(btrim(description::jsonb->'details'->>'invoice'))=lower(btrim(p_details->>'invoice'))) THEN RAISE EXCEPTION 'sales_supplier_invoice_duplicate' USING ERRCODE='PT409'; END IF;
  END IF;
  INSERT INTO public.purchase_order(id,supplier_id,order_number,order_date,order_status,note)
  VALUES(p_request_id,(p_details->>'supplier_id')::uuid,'PO-'||p_request_id,(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,'received',concat_ws(' · ',nullif(btrim(p_details->>'invoice'),''),btrim(p_details->>'reason')));
 END IF;
 PERFORM 1 FROM public.product WHERE id IN (SELECT v.product_id FROM public.product_variant v JOIN jsonb_array_elements(p_lines) x ON v.id=(x->>'variant_id')::uuid) ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.product_variant WHERE id IN (SELECT (x->>'variant_id')::uuid FROM jsonb_array_elements(p_lines) x) ORDER BY id FOR UPDATE;
 FOR item IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  variant_id:=(item->>'variant_id')::uuid;qty:=(item->>'quantity')::numeric;
  IF variant_id IS NULL OR variant_id=ANY(seen) OR NOT EXISTS(SELECT 1 FROM public.product_variant WHERE id=variant_id)
  OR qty IS NULL OR qty::text IN ('NaN','Infinity','-Infinity') OR qty NOT BETWEEN 0 AND 100000000 OR round(qty)<>qty THEN RAISE EXCEPTION 'invalid_sales_inventory_line' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,variant_id);
  IF p_mode='receipt' THEN
   price_value:=(item->>'price')::numeric;
   IF qty=0 OR price_value IS NULL OR price_value::text IN ('NaN','Infinity','-Infinity') OR price_value NOT BETWEEN 0 AND 100000000000 THEN RAISE EXCEPTION 'invalid_sales_inventory_line' USING ERRCODE='22023'; END IF;
   INSERT INTO public.purchase_order_detail(purchase_order_id,product_variant_id,quantity,unit_price) VALUES(p_request_id,variant_id,qty,price_value) RETURNING id INTO line_id;
   INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,note,staff_id,purchase_order_detail_id,idempotency_key)
   VALUES(variant_id,'purchase_receipt',qty,btrim(p_details->>'reason'),actor,line_id,'sales-receipt:'||p_request_id||':'||variant_id);
  ELSE
   SELECT coalesce(sum(quantity),0) INTO balance_value FROM public.inventory_transaction WHERE product_variant_id=variant_id;
   SELECT last_updated_at INTO inventory_time FROM public.inventory WHERE product_variant_id=variant_id;
   IF item->>'expected_stock' IS NULL OR balance_value<>(item->>'expected_stock')::integer
   OR inventory_time IS DISTINCT FROM nullif(item->>'expected_last_updated_at','')::timestamptz THEN RAISE EXCEPTION 'sales_stock_changed' USING ERRCODE='PT409'; END IF;
   delta:=qty-balance_value;
   IF delta<>0 THEN
    INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,note,staff_id,idempotency_key)
    VALUES(variant_id,'stocktake',delta,concat_ws(' · ',btrim(p_details->>'reason'),nullif(btrim(item->>'reason'),'')),actor,'sales-stocktake:'||p_request_id||':'||variant_id);
   END IF;
  END IF;
 END LOOP;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SALES_INVENTORY_BATCH',CASE WHEN p_mode='receipt' THEN 'purchase_order' ELSE 'inventory_transaction' END,p_request_id,payload);
 RETURN p_request_id;
END $$;
REVOKE ALL ON FUNCTION public.post_admin_sales_inventory_batch(uuid,text,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.post_admin_sales_inventory_batch(uuid,text,jsonb,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
