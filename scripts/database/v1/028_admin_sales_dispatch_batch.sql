BEGIN;
CREATE OR REPLACE FUNCTION public.dispatch_admin_sales_batch(p_request_id uuid,p_provider_id uuid,p_orders jsonb,p_note text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; prior public.audit_log; item jsonb; seen uuid[]:='{}'; order_id_value uuid; payload text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('sales_order.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'sales_order_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_provider_id IS NULL OR jsonb_typeof(p_orders) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_orders) NOT BETWEEN 1 AND 100 OR length(p_orders::text)>60000 OR length(p_note)>2000 THEN RAISE EXCEPTION 'invalid_sales_dispatch_batch' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('provider_id',p_provider_id,'orders',p_orders,'note',p_note)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,28));
 SELECT * INTO prior FROM public.audit_log WHERE entity_id=p_request_id AND action='SALES_DISPATCH_BATCH';
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'sales_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 END IF;
 PERFORM 1 FROM public.shipping_provider WHERE id=p_provider_id AND status='active' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'sales_shipping_details_required' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.customer WHERE id IN (SELECT customer_id FROM public.sales_order WHERE id IN (SELECT (x->>'order_id')::uuid FROM jsonb_array_elements(p_orders) x)) ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.sales_order WHERE id IN (SELECT (x->>'order_id')::uuid FROM jsonb_array_elements(p_orders) x) ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.product WHERE id IN (SELECT v.product_id FROM public.sales_order_detail d JOIN public.product_variant v ON v.id=d.product_variant_id WHERE d.order_id IN (SELECT (x->>'order_id')::uuid FROM jsonb_array_elements(p_orders) x)) ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.product_variant WHERE id IN (SELECT product_variant_id FROM public.sales_order_detail WHERE order_id IN (SELECT (x->>'order_id')::uuid FROM jsonb_array_elements(p_orders) x)) ORDER BY id FOR UPDATE;
 FOR item IN SELECT value FROM jsonb_array_elements(p_orders) ORDER BY value->>'order_id' LOOP
  order_id_value:=(item->>'order_id')::uuid;
  IF order_id_value IS NULL OR order_id_value=ANY(seen) THEN RAISE EXCEPTION 'invalid_sales_dispatch_batch' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,order_id_value);
  PERFORM public.update_admin_sales_order(md5(p_request_id::text||':'||order_id_value)::uuid,order_id_value,(item->>'expected_updated_at')::timestamptz,'ship',jsonb_build_object('provider_id',p_provider_id,'tracking_code',item->>'tracking_code','note',p_note));
 END LOOP;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SALES_DISPATCH_BATCH','sales_order',p_request_id,payload);
 RETURN p_request_id;
END $$;
REVOKE ALL ON FUNCTION public.dispatch_admin_sales_batch(uuid,uuid,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.dispatch_admin_sales_batch(uuid,uuid,jsonb,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
