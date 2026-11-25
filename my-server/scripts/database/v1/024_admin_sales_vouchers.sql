BEGIN;
CREATE OR REPLACE FUNCTION public.save_admin_sales_voucher(p_request_id uuid,p_voucher_id uuid,p_expected_updated_at timestamptz,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; v public.voucher; prior public.audit_log; payload text; amount_value numeric; minimum_value numeric; points_value numeric; limit_value numeric; start_value date; end_value date; usage_value integer;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('voucher.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'sales_voucher_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_voucher_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>10000
 OR coalesce(p_details->>'code','') !~ '^[A-Za-z0-9_-]{1,50}$' OR coalesce(length(btrim(p_details->>'name')),0) NOT BETWEEN 1 AND 300
 OR coalesce(p_details->>'type','') NOT IN ('fixed','percentage','shipping') OR coalesce(p_details->>'applicable_for','') NOT IN ('shop','services','care','all')
 OR coalesce(p_details->>'is_active','') NOT IN ('true','false') THEN RAISE EXCEPTION 'invalid_sales_voucher' USING ERRCODE='22023'; END IF;
 amount_value:=(p_details->>'discount_value')::numeric;minimum_value:=(p_details->>'minimum_order_amount')::numeric;points_value:=(p_details->>'required_points')::numeric;limit_value:=nullif(p_details->>'max_usage','')::numeric;
 start_value:=(p_details->>'start_date')::date;end_value:=(p_details->>'end_date')::date;
 IF amount_value IS NULL OR amount_value::text IN ('NaN','Infinity','-Infinity') OR amount_value NOT BETWEEN 0.0001 AND 100000000000
 OR (p_details->>'type'='percentage' AND amount_value>100) OR (p_details->>'type'<>'percentage' AND round(amount_value)<>amount_value)
 OR minimum_value IS NULL OR minimum_value::text IN ('NaN','Infinity','-Infinity') OR minimum_value NOT BETWEEN 0 AND 100000000000
 OR points_value IS NULL OR points_value::text IN ('NaN','Infinity','-Infinity') OR points_value NOT BETWEEN 0 AND 100000000 OR round(points_value)<>points_value
 OR (limit_value IS NOT NULL AND (limit_value::text IN ('NaN','Infinity','-Infinity') OR limit_value NOT BETWEEN 1 AND 100000000 OR round(limit_value)<>limit_value))
 OR start_value IS NULL OR end_value IS NULL OR end_value<start_value OR NOT isfinite(start_value) OR NOT isfinite(end_value)
 THEN RAISE EXCEPTION 'invalid_sales_voucher' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('voucher_id',p_voucher_id,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,24));
 SELECT * INTO prior FROM public.audit_log WHERE entity_id=p_request_id AND action='SALES_VOUCHER_SAVE';
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'sales_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_voucher_id;
 END IF;
 SELECT * INTO v FROM public.voucher WHERE id=p_voucher_id FOR UPDATE;
 IF FOUND THEN
  IF p_expected_updated_at IS NULL OR v.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'sales_voucher_changed' USING ERRCODE='PT409'; END IF;
  SELECT count(*) INTO usage_value FROM public.voucher_redemption WHERE voucher_id=v.id AND status='applied';
  IF limit_value IS NOT NULL AND limit_value<usage_value THEN RAISE EXCEPTION 'sales_voucher_limit_below_usage' USING ERRCODE='22023'; END IF;
  UPDATE public.voucher SET voucher_code=p_details->>'code',voucher_name=btrim(p_details->>'name'),type=p_details->>'type',discount_value=amount_value,minimum_order_amount=minimum_value,
   required_points=points_value,max_usage=limit_value,start_date=start_value,end_date=end_value,is_active=(p_details->>'is_active')::boolean,applicable_for=p_details->>'applicable_for',description=p_details->>'description',updated_at=clock_timestamp() WHERE id=v.id;
 ELSE
  IF p_expected_updated_at IS NOT NULL THEN RAISE EXCEPTION 'sales_voucher_not_found' USING ERRCODE='P0002'; END IF;
  INSERT INTO public.voucher(id,voucher_code,voucher_name,type,discount_value,minimum_order_amount,required_points,max_usage,start_date,end_date,is_active,applicable_for,description)
  VALUES(p_voucher_id,p_details->>'code',btrim(p_details->>'name'),p_details->>'type',amount_value,minimum_value,points_value,limit_value,start_value,end_value,(p_details->>'is_active')::boolean,p_details->>'applicable_for',p_details->>'description');
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SALES_VOUCHER_SAVE','voucher',p_request_id,payload);
 RETURN p_voucher_id;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_sales_voucher(uuid,uuid,timestamptz,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admin_sales_voucher(uuid,uuid,timestamptz,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
