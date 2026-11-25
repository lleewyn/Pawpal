BEGIN;
CREATE OR REPLACE FUNCTION public.admin_sales_search_text(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog AS $$
 SELECT replace(regexp_replace(normalize(lower(coalesce(p_value,'')),NFD),U&'[\0300-\036f]','','g'),'đ','d');
$$;
REVOKE ALL ON FUNCTION public.admin_sales_search_text(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_sales_search_text(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.get_admin_sales_order_page(p_filters jsonb DEFAULT '{}'::jsonb,p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; q text:=public.admin_sales_search_text(btrim(coalesce(p_filters->>'query','')));
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('sales_order.read') OR NOT pawpal_private.has_permission('sales_order_detail.read') OR NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('refund_transaction.read') OR NOT pawpal_private.has_permission('customer_profile.read') OR NOT pawpal_private.has_permission('customer_phone.read') OR NOT pawpal_private.has_permission('return_request.read') OR NOT pawpal_private.has_permission('voucher_redemption.read') OR NOT pawpal_private.has_permission('payment_method_config.read') THEN RAISE EXCEPTION 'sales_page_forbidden' USING ERRCODE='42501';END IF;
 IF p_page IS NULL OR p_page<1 OR p_page>10000000 OR p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR length(p_filters::text)>4000 OR length(q)>200 THEN RAISE EXCEPTION 'invalid_sales_page' USING ERRCODE='22023';END IF;
 WITH payments AS MATERIALIZED (
 SELECT p.order_id,sum(p.amount) gross,sum(p.amount-coalesce(r.amount,0)) collected
 FROM public.payment p LEFT JOIN LATERAL (SELECT sum(refunded_amount) amount FROM public.refund_transaction WHERE payment_id=p.id AND refund_status='succeeded') r ON true
 WHERE p.order_id IS NOT NULL AND p.transaction_status='succeeded' GROUP BY p.order_id
 ), base AS MATERIALIZED (
 SELECT o.id,o.created_at,
 CASE WHEN o.order_status IN ('draft','pending') THEN 'pending' WHEN o.order_status IN ('packing','confirmed') THEN 'confirmed' WHEN o.order_status IN ('shipped','shipping') THEN 'shipping' WHEN o.order_status IN ('delivered','completed') THEN 'completed' ELSE o.order_status END status,
 coalesce(t.total_amount,0) total,coalesce(p.collected,0) collected,
 CASE WHEN coalesce(p.collected,0)>=t.total_amount AND t.total_amount>0 THEN 'paid' WHEN p.collected>0 THEN 'partial' WHEN p.gross>0 AND p.gross-p.collected>=p.gross THEN 'refunded' ELSE 'unpaid' END pay_status,
 CASE WHEN m.name ~* 'tiền mặt' THEN 'cash' WHEN m.name ~* 'chuyển khoản|VietQR' THEN 'bank_transfer' WHEN m.name ~* 'MoMo' THEN 'momo' WHEN m.name ~* 'VNPay' THEN 'vnpay' ELSE 'unknown' END method,
 EXISTS(SELECT 1 FROM public.return_request r WHERE r.sales_order_id=o.id) has_return,
 EXISTS(SELECT 1 FROM public.return_request r WHERE r.sales_order_id=o.id AND r.request_status IN ('pending','approved')) open_return,
 (q='' OR strpos(public.admin_sales_search_text(coalesce(o.order_code,'')||' '||coalesce(o.tracking_code,'')||' '||coalesce((SELECT full_name FROM public.customer_profile WHERE customer_id=o.customer_id),o.receiver_name_snapshot,'')||' '||coalesce((SELECT phone_number FROM public.customer_phone WHERE customer_id=o.customer_id AND is_primary LIMIT 1),o.receiver_phone_snapshot,'')),q)>0 OR EXISTS(SELECT 1 FROM public.sales_order_detail d WHERE d.order_id=o.id AND strpos(public.admin_sales_search_text(d.product_name_snapshot||' '||d.sku_snapshot),q)>0)) query_match
 FROM public.sales_order o JOIN public.sales_order_totals t ON t.order_id=o.id LEFT JOIN payments p ON p.order_id=o.id
 LEFT JOIN LATERAL (SELECT pm.name FROM public.payment entry JOIN public.payment_method_config pm ON pm.id=entry.payment_method_config_id WHERE entry.order_id=o.id AND entry.transaction_status='succeeded' ORDER BY entry.id LIMIT 1) m ON true
 ), matched AS MATERIALIZED (
 SELECT * FROM base b WHERE query_match
 AND (coalesce(p_filters->>'status','ALL')='ALL' OR status=CASE p_filters->>'status' WHEN 'delivered' THEN 'completed' ELSE p_filters->>'status' END)
 AND (coalesce(p_filters->>'payment','ALL')='ALL' OR method=p_filters->>'payment')
 AND (coalesce(p_filters->>'payStatus','ALL')='ALL' OR pay_status=p_filters->>'payStatus')
 AND (NOT coalesce((p_filters->>'complaint')::boolean,false) OR status='returned' OR has_return)
 AND (NOT coalesce((p_filters->>'overdue')::boolean,false) OR (status='pending' AND created_at<=now()-interval '31 minutes'))
 AND (NOT coalesce((p_filters->>'urgent')::boolean,false) OR (status='pending' AND created_at<=now()-interval '15 minutes') OR (status='confirmed' AND created_at<=now()-interval '4 hours') OR (status<>'pending' AND (status='returned' OR open_return)))
 ), meta AS (SELECT count(*) total,least(p_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched), selected AS (
 SELECT id,created_at FROM matched ORDER BY created_at DESC,id OFFSET ((SELECT page FROM meta)-1)*10 LIMIT 10
 )
 SELECT jsonb_build_object('total',(SELECT total FROM meta),'page',(SELECT page FROM meta),'ids',coalesce((SELECT jsonb_agg(id ORDER BY created_at DESC,id) FROM selected),'[]'::jsonb),
 'counts',jsonb_build_object('statTotalOrders',(SELECT count(*) FROM base WHERE (created_at AT TIME ZONE 'Asia/Bangkok')::date=(now() AT TIME ZONE 'Asia/Bangkok')::date),'statPendingOrders',(SELECT count(*) FROM base WHERE status='pending'),'statPreparingOrders',(SELECT count(*) FROM base WHERE status='confirmed'),'statShippingOrders',(SELECT count(*) FROM base WHERE status='shipping'),'statCompletedOrders',(SELECT count(*) FROM base WHERE status='completed'),'statCancelledOrders',(SELECT count(*) FROM base WHERE status IN ('cancelled','returned')))) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_sales_order_page(jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_sales_order_page(jsonb,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
