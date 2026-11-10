BEGIN;

CREATE FUNCTION pawpal_private.sales_return_refund_limit(p_return uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 WITH returned AS (
  SELECT r.sales_order_id AS order_id,
   sum(greatest(0,d.unit_price*d.quantity-d.discount_amount)*i.quantity/nullif(d.quantity,0)) AS amount
  FROM public.return_request r JOIN public.return_request_detail i ON i.return_request_id=r.id
  JOIN public.sales_order_detail d ON d.id=i.sales_order_detail_id AND d.order_id=r.sales_order_id
  WHERE r.id=p_return GROUP BY r.sales_order_id
 ), merchandise AS (
  SELECT r.amount, (SELECT sum(greatest(0,d.unit_price*d.quantity-d.discount_amount))
   FROM public.sales_order_detail d WHERE d.order_id=r.order_id) AS goods,
   (SELECT coalesce(sum(x.discount_amount_snapshot),0) FROM public.voucher_redemption x
    JOIN public.voucher v ON v.id=x.voucher_id WHERE x.order_id=r.order_id AND x.status='applied' AND v.type<>'shipping') AS discount
  FROM returned r
 )
 SELECT coalesce((SELECT floor(amount*greatest(0,goods-discount)/nullif(goods,0)) FROM merchandise),0)
$$;

CREATE FUNCTION pawpal_private.sales_return_refund_options(p_order uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.created_at,r.id),'[]'::jsonb)
 FROM (
  SELECT rr.id,rr.reason,rr.request_status,rr.created_at,
   greatest(0,pawpal_private.sales_return_refund_limit(rr.id)-coalesce(
    (SELECT sum(refunded_amount) FROM public.refund_transaction WHERE return_request_id=rr.id AND refund_status='succeeded'),0)) AS remaining
  FROM public.return_request rr WHERE rr.sales_order_id=p_order
  AND rr.return_type='refund' AND rr.request_status IN ('pending','approved','received','completed')
 ) r
$$;

-- Reuse the original cashier authorization, payment lock, receipt and ledger flow.
DO $$
DECLARE body text:=pg_get_functiondef('public.post_admin_sales_money(uuid,uuid,text,text,jsonb)'::regprocedure);
 needle text:='INSERT INTO public.refund_transaction(id,refund_code,payment_id,refund_type,';
BEGIN
 IF strpos(body,needle)=0 OR strpos(body,'source.id,''sales_refund'',amount_value')=0 THEN RAISE EXCEPTION 'unexpected_sales_refund_definition'; END IF;
 body:=replace(body,'prior public.audit_log;','prior public.audit_log; selected_return uuid; rma public.return_request; rma_limit numeric; rma_previous numeric;');
 body:=replace(body,needle,$new$selected_return:=nullif(p_details->>'return_request_id','')::uuid;
  IF selected_return IS NULL THEN
   IF EXISTS(SELECT 1 FROM public.return_request WHERE sales_order_id=a.id AND return_type='refund'
    AND request_status IN ('pending','approved','received','completed')) THEN
    RAISE EXCEPTION 'sales_refund_return_required' USING ERRCODE='22023';
   END IF;
  ELSE
   SELECT * INTO rma FROM public.return_request WHERE id=selected_return AND sales_order_id=a.id FOR UPDATE;
   IF NOT FOUND OR rma.return_type<>'refund' OR rma.request_status<>'received' THEN
    RAISE EXCEPTION 'sales_refund_return_not_received' USING ERRCODE='22023';
   END IF;
   rma_limit:=pawpal_private.sales_return_refund_limit(rma.id);
   SELECT coalesce(sum(refunded_amount),0) INTO rma_previous FROM public.refund_transaction
    WHERE return_request_id=rma.id AND refund_status='succeeded';
   IF amount_value>rma_limit-rma_previous THEN RAISE EXCEPTION 'sales_refund_return_limit' USING ERRCODE='22023'; END IF;
   -- Legacy unallocated refunds require reconciliation before another refund is recorded.
   IF EXISTS(SELECT 1 FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id
     WHERE p.order_id=a.id AND r.refund_status='succeeded' AND r.return_request_id IS NULL) THEN
    RAISE EXCEPTION 'sales_refund_return_reconcile' USING ERRCODE='22023';
   END IF;
  END IF;
  INSERT INTO public.refund_transaction(id,refund_code,payment_id,return_request_id,refund_type,$new$);
 body:=replace(body,'source.id,''sales_refund'',amount_value','source.id,selected_return,''sales_refund'',amount_value');
 EXECUTE body;
END $$;

CREATE FUNCTION public.get_admin_sales_return_refunds(p_order uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT pawpal_private.work_is_admin() OR NOT pawpal_private.has_permission('refund_transaction.read')
 OR NOT pawpal_private.has_permission('return_request.read') THEN
  RAISE EXCEPTION 'sales_cashier_forbidden' USING ERRCODE='42501';
 END IF;
 RETURN pawpal_private.sales_return_refund_options(p_order);
END $$;

CREATE FUNCTION pawpal_private.record_completed_sales_refund()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p public.payment; amount numeric;
BEGIN
 IF NEW.refund_status<>'succeeded' OR (TG_OP='UPDATE' AND OLD.refund_status='succeeded') THEN RETURN NULL; END IF;
 SELECT * INTO p FROM public.payment WHERE id=NEW.payment_id;
 IF p.order_id IS NULL THEN RETURN NULL; END IF;
 IF NEW.return_request_id IS NOT NULL THEN
  SELECT coalesce(sum(refunded_amount),0) INTO amount FROM public.refund_transaction
  WHERE return_request_id=NEW.return_request_id AND refund_status='succeeded';
  IF amount>=pawpal_private.sales_return_refund_limit(NEW.return_request_id) THEN
   UPDATE public.return_request SET request_status='completed',updated_at=clock_timestamp()
   WHERE id=NEW.return_request_id AND sales_order_id=p.order_id AND request_status='received';
  END IF;
 END IF;
 INSERT INTO public.notification(customer_id,notification_type,title,content,sales_order_id,refund_transaction_id,source_event)
 VALUES(p.customer_id,'refund_completed','Đã ghi nhận hoàn tiền',
  'PawPal đã ghi nhận hoàn '||trunc(NEW.refunded_amount)::text||' đ cho đơn hàng. '||
  CASE WHEN NEW.refund_method IN ('Chuyển khoản ngân hàng','Quét mã VietQR') THEN 'Vui lòng kiểm tra tài khoản ngân hàng.' ELSE 'Mở đơn hàng để xem chi tiết.' END,
  p.order_id,NEW.id,'sales-refund:'||NEW.id)
 ON CONFLICT(source_event) WHERE source_event IS NOT NULL DO NOTHING;
 RETURN NULL;
END $$;

CREATE TRIGGER record_completed_sales_refund AFTER INSERT OR UPDATE OF refund_status ON public.refund_transaction
FOR EACH ROW EXECUTE FUNCTION pawpal_private.record_completed_sales_refund();

REVOKE ALL ON FUNCTION pawpal_private.sales_return_refund_limit(uuid),pawpal_private.sales_return_refund_options(uuid),pawpal_private.record_completed_sales_refund() FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.get_admin_sales_return_refunds(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_sales_return_refunds(uuid) TO authenticated;

DO $$
DECLARE body text:=pg_get_functiondef('public.own_notifications_snapshot(integer,integer,boolean)'::regprocedure);
 needle text:='support_ticket_id,refund_transaction_id';
BEGIN
 IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'unexpected_refund_notification_projection'; END IF;
 EXECUTE replace(body,needle,needle||',
  (SELECT r.return_request_id FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id
   WHERE r.id=notification.refund_transaction_id AND p.customer_id=cid AND p.order_id=notification.sales_order_id
    AND r.refund_status=''succeeded'') AS return_request_id');
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
