-- Read-only receipt for one visible sales order; no raw payment, cost or account data.
BEGIN;
CREATE FUNCTION public.get_staff_sales_receipt(p_order_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.sales_order; lines jsonb; subtotal numeric; line_discount numeric; voucher_discount numeric;
 total numeric; collected numeric; refunded numeric; customer_name text; phone text;
BEGIN
 IF pawpal_private.work_actor() IS NULL OR NOT pawpal_private.has_permission('work.cashier.collect') AND NOT pawpal_private.work_is_admin() THEN
  RAISE EXCEPTION 'work_receipt_forbidden' USING ERRCODE='42501'; END IF;
 IF p_order_id IS NULL THEN RAISE EXCEPTION 'work_order_required' USING ERRCODE='22023'; END IF;
 SELECT * INTO o FROM public.sales_order WHERE id=p_order_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'work_order_not_found' USING ERRCODE='P0002'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',d.id,'name',d.product_name_snapshot,'sku',d.sku_snapshot,
  'quantity',d.quantity,'unit_price',d.unit_price,'discount',d.discount_amount,'total',d.quantity*d.unit_price-d.discount_amount) ORDER BY d.id),'[]'::jsonb),
  coalesce(sum(d.quantity*d.unit_price),0),coalesce(sum(d.discount_amount),0)
 INTO lines,subtotal,line_discount FROM public.sales_order_detail d WHERE d.order_id=o.id;
 SELECT coalesce(sum(discount_amount_snapshot),0) INTO voucher_discount FROM public.voucher_redemption WHERE order_id=o.id AND status='applied';
 SELECT total_amount INTO total FROM public.sales_order_totals WHERE order_id=o.id;
 SELECT coalesce(sum(amount),0) INTO collected FROM public.payment WHERE order_id=o.id AND transaction_status='succeeded';
 SELECT coalesce(sum(r.refunded_amount),0) INTO refunded FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id
  WHERE p.order_id=o.id AND p.transaction_status='succeeded' AND r.refund_status='succeeded';
 SELECT full_name INTO customer_name FROM public.customer_profile WHERE customer_id=o.customer_id;
 SELECT phone_number INTO phone FROM public.customer_phone WHERE customer_id=o.customer_id AND is_primary LIMIT 1;
 RETURN jsonb_build_object('order_id',o.id,'order_code',o.order_code,'created_at',o.created_at,'status',o.order_status,
  'customer_name',customer_name,'phone',phone,'lines',lines,'subtotal',subtotal,'line_discount',line_discount,
  'voucher_discount',voucher_discount,'shipping',o.shipping_fee_snapshot,'total',coalesce(total,0),
  'collected',collected-refunded,'refunded',refunded,'remaining',greatest(coalesce(total,0)-collected+refunded,0));
END $$;
REVOKE ALL ON FUNCTION public.get_staff_sales_receipt(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_sales_receipt(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
