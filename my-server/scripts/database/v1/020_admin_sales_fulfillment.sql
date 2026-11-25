BEGIN;
-- Imported shipped orders are already reflected in the opening stock balance.
-- Capture this boundary once; do not invent a second historical stock issue.
LOCK TABLE public.audit_log IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.audit_log WHERE action='SALES_OPENING_STOCK_BASELINE' AND entity_id='02000000-0000-4000-8000-000000000001') THEN
  INSERT INTO public.audit_log(action,entity_name,entity_id,description)
  SELECT 'SALES_LEGACY_SHIPPED','sales_order',o.id,jsonb_build_object('captured_status',o.order_status,'lines_hash',
   (SELECT md5(coalesce(jsonb_agg(jsonb_build_object('id',d.id,'variant_id',d.product_variant_id,'quantity',d.quantity) ORDER BY d.id),'[]')::text) FROM public.sales_order_detail d WHERE d.order_id=o.id),
   'basis','Existing shipped order at V1 activation; current stock is carried by the opening balance. Completion must not create a second issue.')::text
  FROM public.sales_order o WHERE o.order_status IN ('shipped','shipping')
  AND NOT EXISTS(SELECT 1 FROM public.audit_log WHERE action='SALES_ORDER_CREATE' AND entity_id=o.id)
  AND NOT EXISTS(SELECT 1 FROM public.inventory_transaction t JOIN public.sales_order_detail d ON d.id=t.sales_order_detail_id WHERE d.order_id=o.id)
  AND NOT EXISTS(SELECT 1 FROM public.stock_reservation WHERE order_id=o.id AND status='active');
  INSERT INTO public.audit_log(action,entity_name,entity_id,description) VALUES('SALES_OPENING_STOCK_BASELINE','migration','02000000-0000-4000-8000-000000000001','Captured the existing shipped-order boundary before enabling V1 sales writes.');
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.update_admin_sales_order(p_request_id uuid,p_order_id uuid,p_expected_updated_at timestamptz,p_action text,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; o public.sales_order; prior public.audit_log; line record; payload text; held bigint; issued bigint; points_to_reverse integer; legacy_shipped boolean:=false;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('sales_order.write')
 OR NOT pawpal_private.has_permission('inventory_transaction.write') OR NOT pawpal_private.has_permission('stock_reservation.write')
 OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'sales_order_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_order_id IS NULL OR p_action IS NULL OR p_action NOT IN ('confirm','ship','complete','cancel')
 OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>6000 THEN RAISE EXCEPTION 'invalid_sales_action' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('order_id',p_order_id,'action',p_action,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,20));
 SELECT * INTO prior FROM public.audit_log WHERE action='SALES_FULFILLMENT' AND entity_id=p_request_id;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'sales_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 END IF;
 PERFORM 1 FROM public.customer WHERE id IN (SELECT customer_id FROM public.sales_order WHERE id=p_order_id) FOR UPDATE;
 SELECT * INTO o FROM public.sales_order WHERE id=p_order_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'sales_order_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected_updated_at IS NULL OR o.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'sales_order_changed' USING ERRCODE='PT409'; END IF;
 IF (p_action='confirm' AND o.order_status NOT IN ('draft','pending'))
 OR (p_action='ship' AND o.order_status NOT IN ('confirmed','packing'))
 OR (p_action='complete' AND o.order_status NOT IN ('confirmed','packing','shipped','shipping'))
 OR (p_action='cancel' AND o.order_status NOT IN ('draft','pending','confirmed','packing')) THEN RAISE EXCEPTION 'invalid_sales_transition' USING ERRCODE='22023'; END IF;
 IF p_action='cancel' THEN
  IF coalesce(length(btrim(p_details->>'reason')),0)<2 THEN RAISE EXCEPTION 'sales_cancel_reason_required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.payment p WHERE p.order_id=o.id AND p.transaction_status='succeeded' AND p.amount>coalesce((SELECT sum(refunded_amount) FROM public.refund_transaction WHERE payment_id=p.id AND refund_status='succeeded'),0)) THEN RAISE EXCEPTION 'sales_refund_required' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.voucher WHERE id IN (SELECT voucher_id FROM public.voucher_redemption WHERE order_id=o.id AND status='applied') ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.customer_voucher WHERE id IN (SELECT customer_voucher_id FROM public.voucher_redemption WHERE order_id=o.id AND status='applied') ORDER BY id FOR UPDATE;
 END IF;
 IF p_action='ship' THEN
  IF coalesce(length(btrim(p_details->>'tracking_code')),0) NOT BETWEEN 1 AND 200
  OR NOT EXISTS(SELECT 1 FROM public.shipping_provider WHERE id=(p_details->>'provider_id')::uuid AND status='active')
  OR nullif(o.receiver_name_snapshot,'') IS NULL OR nullif(o.receiver_phone_snapshot,'') IS NULL
  OR nullif(o.street_address_snapshot,'') IS NULL OR nullif(o.province_snapshot,'') IS NULL THEN RAISE EXCEPTION 'sales_shipping_details_required' USING ERRCODE='22023'; END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.sales_order_detail WHERE order_id=o.id) THEN RAISE EXCEPTION 'sales_order_empty' USING ERRCODE='22023'; END IF;
 IF p_action='complete' AND o.order_status IN ('shipped','shipping') THEN
  SELECT EXISTS(SELECT 1 FROM public.audit_log WHERE action='SALES_LEGACY_SHIPPED' AND entity_id=o.id
   AND description::jsonb->>'lines_hash'=(SELECT md5(coalesce(jsonb_agg(jsonb_build_object('id',d.id,'variant_id',d.product_variant_id,'quantity',d.quantity) ORDER BY d.id),'[]')::text) FROM public.sales_order_detail d WHERE d.order_id=o.id)) INTO legacy_shipped;
 END IF;
 -- Match catalogue/stock locking order and lock all SKUs deterministically.
 PERFORM 1 FROM public.product WHERE id IN (SELECT v.product_id FROM public.sales_order_detail d JOIN public.product_variant v ON v.id=d.product_variant_id WHERE d.order_id=o.id) ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.product_variant WHERE id IN (SELECT product_variant_id FROM public.sales_order_detail WHERE order_id=o.id) ORDER BY id FOR UPDATE;
 IF p_action='cancel' THEN
  IF EXISTS(SELECT 1 FROM public.inventory_transaction t JOIN public.sales_order_detail d ON d.id=t.sales_order_detail_id WHERE d.order_id=o.id) THEN RAISE EXCEPTION 'sales_issued_order_requires_return' USING ERRCODE='22023'; END IF;
  UPDATE public.stock_reservation SET status='cancelled' WHERE order_id=o.id AND status='active';
  UPDATE public.customer_voucher SET voucher_status='available' WHERE id IN (SELECT customer_voucher_id FROM public.voucher_redemption WHERE order_id=o.id AND status='applied');
  UPDATE public.voucher_redemption SET status='reversed',reversed_at=clock_timestamp() WHERE order_id=o.id AND status='applied';
  SELECT -points INTO points_to_reverse FROM public.paw_point_transaction WHERE customer_id=o.customer_id AND idempotency_key='sales-order-points:'||o.id AND points<0;
  IF points_to_reverse>0 THEN
   INSERT INTO public.paw_point_transaction(customer_id,points,description,idempotency_key,sequence_no)
   SELECT o.customer_id,points_to_reverse,'Hoàn lại điểm đã quy đổi do hủy đơn '||o.order_code,'sales-order-points-reverse:'||o.id,coalesce(max(sequence_no),0)+1 FROM public.paw_point_transaction WHERE customer_id=o.customer_id;
  END IF;
 ELSE
  FOR line IN SELECT product_variant_id,sum(quantity)::integer quantity FROM public.sales_order_detail WHERE order_id=o.id GROUP BY product_variant_id ORDER BY product_variant_id LOOP
   SELECT -coalesce(sum(t.quantity),0) INTO issued FROM public.inventory_transaction t JOIN public.sales_order_detail d ON d.id=t.sales_order_detail_id WHERE d.order_id=o.id AND t.product_variant_id=line.product_variant_id;
   IF p_action='complete' AND o.order_status IN ('shipped','shipping') AND issued<>line.quantity AND NOT(issued=0 AND legacy_shipped) THEN RAISE EXCEPTION 'sales_stock_history_requires_review' USING ERRCODE='22023'; END IF;
   IF issued<>0 AND NOT (p_action='complete' AND o.order_status IN ('shipped','shipping') AND issued=line.quantity) THEN RAISE EXCEPTION 'sales_stock_history_requires_review' USING ERRCODE='22023'; END IF;
   IF issued=0 AND NOT legacy_shipped THEN
    SELECT coalesce(sum(quantity),0) INTO held FROM public.stock_reservation WHERE order_id=o.id AND product_variant_id=line.product_variant_id AND status='active' AND expires_at>now();
    IF held NOT IN (0,line.quantity) THEN RAISE EXCEPTION 'sales_reservation_requires_review' USING ERRCODE='22023'; END IF;
    IF held=0 THEN INSERT INTO public.stock_reservation(product_variant_id,order_id,quantity,expires_at,status) VALUES(line.product_variant_id,o.id,line.quantity,'infinity','active'); END IF;
   END IF;
  END LOOP;
  IF p_action='ship' OR (p_action='complete' AND o.order_status IN ('confirmed','packing')) THEN
   UPDATE public.stock_reservation SET status='consumed' WHERE order_id=o.id AND status='active';
   FOR line IN SELECT * FROM public.sales_order_detail WHERE order_id=o.id ORDER BY product_variant_id,id LOOP
    INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,note,staff_id,sales_order_detail_id,idempotency_key)
    VALUES(line.product_variant_id,'sale_issue',-line.quantity,'Xuất hàng theo đơn '||o.order_code,actor,line.id,'sales-issue:'||line.id);
   END LOOP;
  END IF;
 END IF;
 UPDATE public.sales_order SET order_status=CASE p_action WHEN 'confirm' THEN 'confirmed' WHEN 'ship' THEN 'shipped' WHEN 'complete' THEN 'completed' ELSE 'cancelled' END,
 shipping_provider_id=CASE WHEN p_action='ship' THEN (p_details->>'provider_id')::uuid ELSE shipping_provider_id END,
 tracking_code=CASE WHEN p_action='ship' THEN btrim(p_details->>'tracking_code') ELSE tracking_code END,
 shipped_at=CASE WHEN p_action='ship' THEN clock_timestamp() ELSE shipped_at END,
 delivered_at=CASE WHEN p_action='complete' THEN clock_timestamp() ELSE delivered_at END,
 shipping_status=CASE WHEN p_action='ship' THEN 'shipped' WHEN p_action='complete' THEN 'delivered' WHEN p_action='cancel' THEN 'cancelled' ELSE shipping_status END,
 updated_at=clock_timestamp() WHERE id=o.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SALES_FULFILLMENT','sales_order',p_request_id,payload);
 RETURN p_request_id;
END $$;
REVOKE ALL ON FUNCTION public.update_admin_sales_order(uuid,uuid,timestamptz,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_admin_sales_order(uuid,uuid,timestamptz,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
