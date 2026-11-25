BEGIN;
SET LOCAL lock_timeout='3s';
CREATE FUNCTION public.guest_booking_recover(p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN

 SELECT jsonb_build_object('id',a.id,'code',a.appointment_code,'status',a.appointment_status,'start_at',a.scheduled_start_at,
  'end_at',a.scheduled_end_at,'total',(SELECT total_price FROM public.appointment_totals WHERE appointment_id=a.id))
 INTO result FROM public.appointment a WHERE a.id=p_request AND EXISTS(
  SELECT 1 FROM public.audit_log l WHERE l.entity_id=a.id AND l.entity_name='appointment' AND l.action='GUEST_BOOKING_CREATE');
 IF result IS NULL THEN RAISE EXCEPTION 'guest_booking_not_found' USING ERRCODE='P0002';END IF;
 RETURN result;
END $$;
CREATE FUNCTION public.guest_sales_recover(p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN

 SELECT jsonb_build_object('id',o.id,'code',o.order_code,'status',o.order_status,'total',t.total_amount,
  'paidAmount',greatest(0,pay.collected-pay.refunded),
  'paymentStatus',CASE WHEN t.total_amount=0 THEN 'not_required' WHEN pay.collected-pay.refunded>=t.total_amount THEN 'paid'
   WHEN pay.collected-pay.refunded>0 THEN 'partial' WHEN pay.refunded>0 THEN 'refunded' ELSE 'pending' END,
  'receiver',jsonb_build_object('name',o.receiver_name_snapshot,'phone',o.receiver_phone_snapshot,'province',o.province_snapshot,'address',o.street_address_snapshot),
  'lines',(SELECT coalesce(jsonb_agg(jsonb_build_object('variantId',product_variant_id,'name',product_name_snapshot,'sku',sku_snapshot,'quantity',quantity,'unitPrice',unit_price,'discount',discount_amount) ORDER BY id),'[]'::jsonb) FROM public.sales_order_detail WHERE order_id=o.id))
 INTO result FROM public.sales_order o JOIN public.sales_order_totals t ON t.order_id=o.id
 CROSS JOIN LATERAL(SELECT coalesce((SELECT sum(amount) FROM public.payment WHERE order_id=o.id AND transaction_status='succeeded'),0) collected,
  coalesce((SELECT sum(r.refunded_amount) FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE p.order_id=o.id AND r.refund_status='succeeded'),0) refunded) pay
 WHERE o.id=p_request AND EXISTS(
  SELECT 1 FROM public.audit_log l WHERE l.entity_id=o.id AND l.entity_name='sales_order' AND l.action='GUEST_ORDER_CREATE');
 IF result IS NULL THEN RAISE EXCEPTION 'guest_order_not_found' USING ERRCODE='P0002';END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.guest_booking_recover(uuid),public.guest_sales_recover(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guest_booking_recover(uuid),public.guest_sales_recover(uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
