BEGIN;
-- One signed ledger entry, its price/status edits and its audit commit together.
CREATE OR REPLACE FUNCTION public.adjust_admin_sales_stock(p_request_id uuid,p_variant_id uuid,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; v public.product_variant; p public.product; prior public.audit_log;
 current_stock integer; delta integer; qty numeric; price_value numeric; payload text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('inventory_transaction.write')
 OR NOT pawpal_private.has_permission('product_variant.write') OR NOT pawpal_private.has_permission('product.write')
 OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'sales_stock_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_variant_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object'
 OR length(p_details::text)>6000 OR coalesce(length(btrim(p_details->>'reason')),0) NOT BETWEEN 2 AND 2000
 OR coalesce(p_details->>'operation','') NOT IN ('ADD','SUB','SET') THEN RAISE EXCEPTION 'invalid_stock_adjustment' USING ERRCODE='22023'; END IF;
 qty:=(p_details->>'quantity')::numeric;
 IF qty IS NULL OR qty::text IN ('NaN','Infinity','-Infinity') OR qty<0 OR qty>100000000 OR round(qty)<>qty
 OR (qty=0 AND p_details->>'operation'<>'SET') THEN RAISE EXCEPTION 'invalid_stock_quantity' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('variant_id',p_variant_id,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,19));
 SELECT * INTO prior FROM public.audit_log WHERE action='SALES_STOCK_ADJUST' AND entity_id=p_request_id;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'sales_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 END IF;
 -- Product before variant: use this order for all sales catalogue/stock transactions.
 SELECT product_id INTO p.id FROM public.product_variant WHERE id=p_variant_id;
 SELECT * INTO p FROM public.product WHERE id=p.id FOR UPDATE;
 SELECT * INTO v FROM public.product_variant WHERE id=p_variant_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'sales_variant_not_found' USING ERRCODE='P0002'; END IF;
 SELECT coalesce(sum(quantity),0) INTO current_stock FROM public.inventory_transaction WHERE product_variant_id=v.id;
 IF p_details->>'expected_stock' IS NULL OR current_stock<>(p_details->>'expected_stock')::integer
 OR (p_details->>'expected_updated_at')::timestamptz IS DISTINCT FROM p.updated_at
 OR (p_details->>'expected_variant_updated_at')::timestamptz IS DISTINCT FROM v.updated_at THEN RAISE EXCEPTION 'sales_stock_changed' USING ERRCODE='PT409'; END IF;
 delta:=CASE p_details->>'operation' WHEN 'ADD' THEN qty WHEN 'SUB' THEN -qty ELSE qty-current_stock END;
 IF delta<>0 THEN
  INSERT INTO public.inventory_transaction(id,product_variant_id,transaction_type,quantity,note,staff_id,idempotency_key)
  VALUES(p_request_id,v.id,'adjustment',delta,btrim(p_details->>'reason'),actor,'sales-stock:'||p_request_id);
 END IF;
 IF nullif(p_details->>'price','') IS NOT NULL THEN
  price_value:=(p_details->>'price')::numeric;
  IF price_value::text IN ('NaN','Infinity','-Infinity') OR price_value<0 OR price_value>100000000000 OR round(price_value)<>price_value THEN RAISE EXCEPTION 'invalid_sales_price' USING ERRCODE='22023'; END IF;
  UPDATE public.product_variant SET sale_price=price_value WHERE id=v.id;
 END IF;
 IF p_details ? 'status' THEN
  IF coalesce(p_details->>'status','') NOT IN ('active','inactive') THEN RAISE EXCEPTION 'invalid_sales_product_status' USING ERRCODE='22023'; END IF;
  UPDATE public.product SET status=p_details->>'status' WHERE id=p.id;
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,'SALES_STOCK_ADJUST','inventory_transaction',p_request_id,payload);
 RETURN p_request_id;
END $$;
REVOKE ALL ON FUNCTION public.adjust_admin_sales_stock(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.adjust_admin_sales_stock(uuid,uuid,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
