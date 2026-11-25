BEGIN;
DO $$
DECLARE body text:=pg_get_functiondef('pawpal_private.quote_own_sales_core(uuid,jsonb,jsonb)'::regprocedure);
 needle text:=$old$IF NOT FOUND OR NOT voucher.is_active OR today NOT BETWEEN voucher.start_date AND voucher.end_date OR voucher.applicable_for NOT IN ('all','shop') OR subtotal<voucher.minimum_order_amount THEN RAISE EXCEPTION 'sales_voucher_not_applicable' USING ERRCODE='22023'; END IF;$old$;
BEGIN
 IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'unexpected_checkout_voucher_validation'; END IF;
 body:=replace(body,needle,$new$IF NOT FOUND THEN RAISE EXCEPTION 'sales_voucher_unknown' USING ERRCODE='22023'; END IF;
  IF NOT voucher.is_active OR today NOT BETWEEN voucher.start_date AND voucher.end_date THEN RAISE EXCEPTION 'sales_voucher_inactive' USING ERRCODE='22023'; END IF;
  IF voucher.applicable_for NOT IN ('all','shop') THEN RAISE EXCEPTION 'sales_voucher_scope' USING ERRCODE='22023'; END IF;
  IF subtotal<voucher.minimum_order_amount THEN RAISE EXCEPTION 'sales_voucher_minimum' USING ERRCODE='22023'; END IF;$new$);
 body:=replace(body,$old$WHEN 'percentage' THEN least(subtotal,floor(subtotal*voucher.discount_value/100))$old$,
  $new$WHEN 'percentage' THEN least(subtotal,floor(subtotal*voucher.discount_value/100))
  WHEN 'percent' THEN least(subtotal,floor(subtotal*voucher.discount_value/100))$new$);
 EXECUTE body;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
