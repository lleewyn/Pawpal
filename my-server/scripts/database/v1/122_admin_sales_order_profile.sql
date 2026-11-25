BEGIN;
-- Separate tracking corrections from stock-issuing handover. Existing business rows are unchanged.
CREATE OR REPLACE FUNCTION public.update_admin_sales_order(p_request_id uuid,p_order_id uuid,p_expected_updated_at timestamptz,p_action text,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; o public.sales_order; prior public.audit_log; line record; payload text; held bigint; issued bigint; points_to_reverse integer; legacy_shipped boolean:=false;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('sales_order.write')
 OR NOT pawpal_private.has_permission('inventory_transaction.write') OR NOT pawpal_private.has_permission('stock_reservation.write')
 OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'sales_order_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_order_id IS NULL OR p_action IS NULL OR p_action NOT IN ('confirm','ship','update_shipping','complete','cancel')
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
 OR (p_action='update_shipping' AND o.order_status NOT IN ('shipped','shipping'))
 OR (p_action='complete' AND o.order_status NOT IN ('confirmed','packing','shipped','shipping'))
 OR (p_action='cancel' AND o.order_status NOT IN ('draft','pending','confirmed','packing')) THEN RAISE EXCEPTION 'invalid_sales_transition' USING ERRCODE='22023'; END IF;
 IF p_action='complete' AND (
  (o.order_status IN ('confirmed','packing') AND (o.delivery_option_id IS NOT NULL OR nullif(btrim(o.street_address_snapshot),'') IS NOT NULL))
  OR (o.order_status IN ('shipped','shipping') AND (o.shipping_provider_id IS NULL OR o.shipped_at IS NULL OR coalesce(o.tracking_code,'') !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$'))
 ) THEN RAISE EXCEPTION 'sales_handover_required' USING ERRCODE='22023'; END IF;
 IF p_action='cancel' THEN
  IF length(btrim(coalesce(p_details->>'note','')))>1000 OR length(btrim(coalesce(p_details->>'reason','')))>1200
   OR (btrim(p_details->>'reason')='Lý do khác' AND coalesce(p_details->>'note','') !~ '[^[:space:]]')
   THEN RAISE EXCEPTION 'sales_cancel_note_invalid' USING ERRCODE='22023'; END IF;
  IF coalesce(length(btrim(p_details->>'reason')),0)<2 OR coalesce(p_details->>'reason','') !~ '[^[:space:]]' THEN RAISE EXCEPTION 'sales_cancel_reason_required' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.payment p WHERE p.order_id=o.id AND p.transaction_status='succeeded' AND p.amount>coalesce((SELECT sum(refunded_amount) FROM public.refund_transaction WHERE payment_id=p.id AND refund_status='succeeded'),0)) THEN RAISE EXCEPTION 'sales_refund_required' USING ERRCODE='22023'; END IF;
  PERFORM 1 FROM public.voucher WHERE id IN (SELECT voucher_id FROM public.voucher_redemption WHERE order_id=o.id AND status='applied') ORDER BY id FOR UPDATE;
  PERFORM 1 FROM public.customer_voucher WHERE id IN (SELECT customer_voucher_id FROM public.voucher_redemption WHERE order_id=o.id AND status='applied') ORDER BY id FOR UPDATE;
 END IF;
 IF p_action IN ('ship','update_shipping') AND (
  nullif(btrim(o.receiver_name_snapshot),'') IS NULL OR nullif(btrim(o.receiver_phone_snapshot),'') IS NULL
  OR nullif(btrim(o.street_address_snapshot),'') IS NULL OR nullif(btrim(o.province_snapshot),'') IS NULL
 ) THEN
  o.receiver_name_snapshot:=coalesce(nullif(btrim(p_details->'receiver'->>'name'),''),o.receiver_name_snapshot);
  o.receiver_phone_snapshot:=coalesce(nullif(btrim(p_details->'receiver'->>'phone'),''),o.receiver_phone_snapshot);
  o.street_address_snapshot:=coalesce(nullif(btrim(p_details->'receiver'->>'street'),''),o.street_address_snapshot);
  o.province_snapshot:=coalesce(nullif(btrim(p_details->'receiver'->>'province'),''),o.province_snapshot);
  IF coalesce(length(btrim(o.receiver_name_snapshot)),0) NOT BETWEEN 1 AND 200
   OR coalesce(o.receiver_phone_snapshot,'') !~ '^0[0-9]{9}$'
   OR coalesce(length(btrim(o.street_address_snapshot)),0) NOT BETWEEN 1 AND 500
   OR coalesce(length(btrim(o.province_snapshot)),0) NOT BETWEEN 1 AND 200
   THEN RAISE EXCEPTION 'sales_shipping_receiver_required' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_action IN ('ship','update_shipping') THEN
  IF coalesce(btrim(p_details->>'tracking_code'),'') !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,199}$' THEN RAISE EXCEPTION 'sales_tracking_invalid' USING ERRCODE='22023'; END IF;
  IF length(btrim(coalesce(p_details->>'note','')))>250 THEN RAISE EXCEPTION 'sales_note_too_long' USING ERRCODE='22023'; END IF;
  IF coalesce(length(btrim(p_details->>'tracking_code')),0) NOT BETWEEN 1 AND 200
  OR NOT EXISTS(SELECT 1 FROM public.shipping_provider WHERE id::text=p_details->>'provider_id' AND status='active')
  OR nullif(o.receiver_name_snapshot,'') IS NULL OR nullif(o.receiver_phone_snapshot,'') IS NULL
  OR nullif(o.street_address_snapshot,'') IS NULL OR nullif(o.province_snapshot,'') IS NULL THEN RAISE EXCEPTION 'sales_shipping_details_required' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_action='update_shipping' THEN
  -- A correction must never consume reservations or create another stock issue.
  UPDATE public.sales_order SET receiver_name_snapshot=o.receiver_name_snapshot,receiver_phone_snapshot=o.receiver_phone_snapshot,street_address_snapshot=o.street_address_snapshot,province_snapshot=o.province_snapshot,shipping_provider_id=(p_details->>'provider_id')::uuid,
   tracking_code=btrim(p_details->>'tracking_code'),shipped_at=coalesce(shipped_at,clock_timestamp()),updated_at=clock_timestamp() WHERE id=o.id;
  INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SALES_FULFILLMENT','sales_order',p_request_id,payload);
  RETURN p_request_id;
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
 UPDATE public.sales_order SET receiver_name_snapshot=o.receiver_name_snapshot,receiver_phone_snapshot=o.receiver_phone_snapshot,street_address_snapshot=o.street_address_snapshot,province_snapshot=o.province_snapshot,order_status=CASE p_action WHEN 'confirm' THEN 'confirmed' WHEN 'ship' THEN 'shipped' WHEN 'complete' THEN 'completed' ELSE 'cancelled' END,
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
-- Order business history only; this never queries Supabase infrastructure Logs.
CREATE INDEX IF NOT EXISTS audit_sales_fulfillment_order_history
 ON public.audit_log ((description::jsonb->>'order_id'),created_at,id)
 WHERE action='SALES_FULFILLMENT' AND entity_name='sales_order';
CREATE OR REPLACE FUNCTION public.get_admin_sales_order_history(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('sales_order.read')
  OR NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('refund_transaction.read')
  THEN RAISE EXCEPTION 'sales_history_forbidden' USING ERRCODE='42501'; END IF;
 IF p_order_id IS NULL OR NOT EXISTS(SELECT 1 FROM public.sales_order WHERE id=p_order_id)
  THEN RAISE EXCEPTION 'sales_order_not_found' USING ERRCODE='P0002'; END IF;
 WITH fulfillment AS (
  SELECT id,created_at,description::jsonb payload FROM public.audit_log
  WHERE action='SALES_FULFILLMENT' AND entity_name='sales_order' AND description::jsonb->>'order_id'=p_order_id::text
 ), events AS (
  SELECT 'create' key,o.created_at time,'Tạo đơn hàng' title,'Đơn được ghi nhận trong hệ thống' description FROM public.sales_order o WHERE o.id=p_order_id
  UNION ALL
  SELECT f.id::text,f.created_at,
   CASE f.payload->>'action' WHEN 'confirm' THEN 'Xác nhận đơn' WHEN 'ship' THEN 'Bàn giao vận chuyển' WHEN 'update_shipping' THEN 'Cập nhật vận đơn' WHEN 'complete' THEN 'Giao hàng thành công' WHEN 'cancel' THEN 'Hủy đơn' END,
   coalesce(nullif(f.payload->'details'->>'reason',''),nullif(f.payload->'details'->>'note',''),nullif(f.payload->'details'->>'tracking_code',''),'')
  FROM fulfillment f WHERE f.payload->>'action' IN ('confirm','ship','update_shipping','complete','cancel')
  UNION ALL
  SELECT p.id::text,coalesce(p.succeeded_at,p.created_at),'Thu tiền',coalesce(m.name,'Chưa ghi nhận phương thức')||' · '||trim(to_char(p.amount,'FM999999999999990'))||' đ'
  FROM public.payment p LEFT JOIN public.payment_method_config m ON m.id=p.payment_method_config_id
  WHERE p.order_id=p_order_id AND p.transaction_status='succeeded'
  UNION ALL
  SELECT r.id::text,coalesce(r.completed_at,r.created_at),'Hoàn tiền',r.refund_method||' · '||trim(to_char(r.refunded_amount,'FM999999999999990'))||' đ'
  FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id
  WHERE p.order_id=p_order_id AND r.refund_status='succeeded'
  UNION ALL
  SELECT 'ship',o.shipped_at,'Bàn giao vận chuyển',coalesce(o.tracking_code,'') FROM public.sales_order o
  WHERE o.id=p_order_id AND o.shipped_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM fulfillment WHERE payload->>'action'='ship')
  UNION ALL
  SELECT 'delivery',o.delivered_at,'Giao hàng thành công','Đã ghi nhận thời điểm giao hàng' FROM public.sales_order o
  WHERE o.id=p_order_id AND o.delivered_at IS NOT NULL AND NOT EXISTS(SELECT 1 FROM fulfillment WHERE payload->>'action'='complete')
 ) SELECT coalesce(jsonb_agg(jsonb_build_object('title',title,'time',time,'desc',description,'done',true) ORDER BY time,key),'[]'::jsonb) INTO result FROM events;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_sales_order_history(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_sales_order_history(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

