-- Serialize refund classification with return credits on the original invoice.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
DO $migration$
DECLARE definition text:=pg_get_functiondef('public.admin_finance_post(uuid,text,jsonb,timestamptz)'::regprocedure);
 old_fragment text:=$old$   SELECT * INTO r FROM public.refund_transaction WHERE id=source_id AND refund_status='succeeded';$old$;
 new_fragment text:=$new$   PERFORM pawpal_private.dashboard_require(ARRAY['payment.read','sales_order.read','sales_order_detail.read','voucher_redemption.read','return_request.read']);
   SELECT * INTO r FROM public.refund_transaction WHERE id=source_id AND refund_status='succeeded' FOR UPDATE;
   PERFORM 1 FROM public.return_request WHERE id=r.return_request_id FOR UPDATE;
   SELECT order_id INTO other_id FROM public.payment WHERE id=r.payment_id;
   PERFORM 1 FROM public.sales_order WHERE id=other_id FOR UPDATE;$new$;
 old_guard text:=$old$   IF parts[1]>0 AND EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.return_request_id=r.return_request_id AND f.entry_kind='revenue_credit' AND f.status='posted' AND f.amount>0) THEN RAISE EXCEPTION 'finance_refund_credit_already_recorded' USING ERRCODE='22023';END IF;$old$;
 new_guard text:=$new$   IF parts[1]>0 AND EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.return_request_id=r.return_request_id AND f.entry_kind='revenue_credit' AND f.status='posted' AND f.amount>0) THEN RAISE EXCEPTION 'finance_refund_credit_already_recorded' USING ERRCODE='22023';END IF;
   IF parts[1]>0 AND other_id IS NOT NULL THEN
    SELECT total_amount INTO book FROM public.sales_order_totals WHERE order_id=other_id;
    SELECT coalesce(sum(f.revenue_part),0) INTO paid FROM public.finance_entry f JOIN public.refund_transaction refund_source ON refund_source.id=f.refund_id JOIN public.payment receipt ON receipt.id=refund_source.payment_id WHERE receipt.order_id=other_id AND f.status='posted' AND f.entry_kind='refund_allocation';
    paid:=paid+coalesce((SELECT sum(amount) FROM public.finance_entry WHERE order_id=other_id AND entry_kind='revenue_credit' AND status='posted'),0);
    IF book IS NULL OR book::text IN('NaN','Infinity','-Infinity') OR parts[1]+paid>book THEN RAISE EXCEPTION 'finance_credit_exceeds_invoice' USING ERRCODE='22023';END IF;
   END IF;$new$;
BEGIN
 IF position(new_fragment IN definition)>0 THEN
  IF position(new_guard IN definition)=0 THEN RAISE EXCEPTION 'finance_refund_patch_incomplete';END IF;
  RETURN;
 END IF;
 IF position(old_fragment IN definition)=0 OR position(old_guard IN definition)=0 THEN RAISE EXCEPTION 'finance_refund_patch_source_changed';END IF;
 definition:=replace(definition,old_fragment,new_fragment);
 definition:=replace(definition,old_guard,new_guard);
 EXECUTE definition;
END $migration$;
NOTIFY pgrst,'reload schema';
COMMIT;
