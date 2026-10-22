BEGIN;
CREATE OR REPLACE FUNCTION public.quote_admin_sales_order(p_customer_id uuid,p_details jsonb,p_lines jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE item jsonb; v record; variant_id uuid; qty numeric; seen uuid[]:='{}'; lines jsonb:='[]'; priced jsonb:='[]'; result jsonb;
 subtotal numeric:=0; shipping numeric:=0; tier_percent numeric:=0; line_discount numeric:=0; total_discount numeric:=0; voucher_discount numeric:=0;
 points_requested numeric; points_used integer:=0; point_value numeric; points_balance bigint; remaining_discount numeric; remaining_gross numeric;
 mode text:=p_details->>'discount_mode'; delivery public.delivery_option_config; tier public.membership_tier; voucher public.voucher; owned public.customer_voucher;
 held bigint; stock bigint; warning text; config_value text; usage_count_value bigint; today date:=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('sales_order.write') OR NOT pawpal_private.has_permission('product_variant.read')
 OR NOT pawpal_private.has_permission('inventory_transaction.read') OR NOT pawpal_private.has_permission('stock_reservation.read')
 OR NOT pawpal_private.has_permission('customer.read') OR NOT pawpal_private.has_permission('voucher.read') OR NOT pawpal_private.has_permission('paw_point_transaction.read')
 OR NOT pawpal_private.has_permission('pawpal_setting.read') OR NOT pawpal_private.has_permission('membership_tier.read') OR NOT pawpal_private.has_permission('customer_membership.read')
 OR NOT pawpal_private.has_permission('delivery_option_config.read') OR NOT pawpal_private.has_permission('voucher_redemption.read') OR NOT pawpal_private.has_permission('customer_voucher.read')
 THEN RAISE EXCEPTION 'sales_checkout_forbidden' USING ERRCODE='42501'; END IF;
 IF p_customer_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 OR length(p_lines::text)>30000 OR length(p_details::text)>10000
 OR coalesce(mode,'') NOT IN ('none','tier','voucher','points') OR coalesce(p_details->>'delivery','') NOT IN ('true','false')
 OR NOT EXISTS(SELECT 1 FROM public.customer WHERE id=p_customer_id AND customer_status='active') THEN RAISE EXCEPTION 'invalid_sales_checkout' USING ERRCODE='22023'; END IF;
 IF p_details->>'delivery'='true' THEN
  SELECT * INTO delivery FROM public.delivery_option_config WHERE id=nullif(p_details->>'delivery_option_id','')::uuid AND available;
  IF NOT FOUND OR coalesce(length(btrim(p_details->>'receiver_name')),0) NOT BETWEEN 1 AND 300
  OR coalesce(p_details->>'receiver_phone','') !~ '^\+?[0-9][0-9 .()-]{7,19}$'
  OR coalesce(length(btrim(p_details->>'street_address')),0) NOT BETWEEN 1 AND 1000
  OR coalesce(length(btrim(p_details->>'province')),0) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'sales_delivery_required' USING ERRCODE='22023'; END IF;
  shipping:=delivery.fee;
 END IF;
 SELECT coalesce(sum(points),0) INTO points_balance FROM public.paw_point_transaction WHERE customer_id=p_customer_id;
 IF mode='tier' THEN
  SELECT t.* INTO tier FROM public.customer_membership m JOIN public.membership_tier t ON t.id=m.membership_tier_id WHERE m.customer_id=p_customer_id AND t.is_active;
  IF FOUND THEN tier_percent:=tier.discount_percent; ELSE warning:='sales_tier_not_configured'; END IF;
 ELSIF mode='points' THEN
  points_requested:=nullif(p_details->>'points','')::numeric;
  IF points_requested IS NULL OR points_requested::text IN ('NaN','Infinity','-Infinity') OR points_requested NOT BETWEEN 0 AND 100000000 OR round(points_requested)<>points_requested THEN RAISE EXCEPTION 'invalid_sales_points' USING ERRCODE='22023'; END IF;
  SELECT setting_value INTO config_value FROM public.pawpal_setting WHERE setting_key='sales_point_redemption_value';
  IF config_value IS NULL OR config_value !~ '^[1-9][0-9]{0,8}$' THEN warning:='sales_points_not_configured';
  ELSE point_value:=config_value::numeric;points_used:=points_requested; END IF;
  IF points_used>points_balance THEN RAISE EXCEPTION 'sales_points_insufficient' USING ERRCODE='22023'; END IF;
 END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_lines) ORDER BY value->>'variant_id' LOOP
  variant_id:=(item->>'variant_id')::uuid;qty:=(item->>'quantity')::numeric;
  IF variant_id IS NULL OR variant_id=ANY(seen) OR qty IS NULL OR qty::text IN ('NaN','Infinity','-Infinity') OR qty NOT BETWEEN 1 AND 1000000 OR round(qty)<>qty THEN RAISE EXCEPTION 'invalid_sales_line' USING ERRCODE='22023'; END IF;
  SELECT pv.id,pv.sku_variant,pv.sale_price,pv.updated_at,p.product_name,p.updated_at AS product_updated_at INTO v FROM public.product_variant pv JOIN public.product p ON p.id=pv.product_id WHERE pv.id=variant_id AND pv.status='active' AND p.status='active';
  IF NOT FOUND OR round(v.sale_price)<>v.sale_price THEN RAISE EXCEPTION 'sales_variant_not_sellable' USING ERRCODE='22023'; END IF;
  SELECT coalesce(sum(quantity),0) INTO stock FROM public.inventory_transaction WHERE product_variant_id=variant_id;
  SELECT coalesce(sum(quantity),0) INTO held FROM public.stock_reservation WHERE product_variant_id=variant_id AND status='active' AND expires_at>now();
  IF qty>stock-held THEN RAISE EXCEPTION 'sales_available_stock_insufficient' USING ERRCODE='23514'; END IF;
  subtotal:=subtotal+qty*v.sale_price;
  lines:=lines||jsonb_build_array(jsonb_build_object('variant_id',variant_id,'quantity',qty,'unit_price',v.sale_price,'sku',v.sku_variant,'name',v.product_name,'available',stock-held,'updated_at',v.updated_at,'product_updated_at',v.product_updated_at));
  seen:=array_append(seen,variant_id);
 END LOOP;
 IF points_used*coalesce(point_value,0)>subtotal THEN RAISE EXCEPTION 'sales_points_exceed_total' USING ERRCODE='22023'; END IF;
 remaining_discount:=points_used*coalesce(point_value,0);remaining_gross:=subtotal;
 FOR item IN SELECT value FROM jsonb_array_elements(lines) LOOP
  line_discount:=CASE WHEN mode='tier' THEN floor((item->>'quantity')::numeric*(item->>'unit_price')::numeric*tier_percent/100)
   WHEN mode='points' AND remaining_gross>0 THEN floor(remaining_discount*(item->>'quantity')::numeric*(item->>'unit_price')::numeric/remaining_gross) ELSE 0 END;
  remaining_discount:=remaining_discount-line_discount;remaining_gross:=remaining_gross-(item->>'quantity')::numeric*(item->>'unit_price')::numeric;
  total_discount:=total_discount+line_discount;priced:=priced||jsonb_build_array(item||jsonb_build_object('discount_amount',line_discount));
 END LOOP;
 IF mode='voucher' THEN
  SELECT * INTO voucher FROM public.voucher WHERE voucher_code=btrim(p_details->>'voucher_code');
  IF NOT FOUND OR NOT voucher.is_active OR today NOT BETWEEN voucher.start_date AND voucher.end_date OR voucher.applicable_for NOT IN ('all','shop') OR subtotal<voucher.minimum_order_amount THEN RAISE EXCEPTION 'sales_voucher_not_applicable' USING ERRCODE='22023'; END IF;
  SELECT count(*) INTO usage_count_value FROM public.voucher_redemption WHERE voucher_id=voucher.id AND status='applied';
  IF voucher.max_usage IS NOT NULL AND usage_count_value>=voucher.max_usage THEN RAISE EXCEPTION 'sales_voucher_exhausted' USING ERRCODE='23514'; END IF;
  IF voucher.required_points>0 THEN
   SELECT * INTO owned FROM public.customer_voucher WHERE customer_id=p_customer_id AND voucher_id=voucher.id AND voucher_status='available' AND (expired_at IS NULL OR expired_at>now()) ORDER BY acquired_at,id LIMIT 1;
   IF NOT FOUND THEN RAISE EXCEPTION 'sales_owned_voucher_required' USING ERRCODE='22023'; END IF;
  END IF;
  voucher_discount:=CASE voucher.type WHEN 'percentage' THEN least(subtotal,floor(subtotal*voucher.discount_value/100)) WHEN 'fixed' THEN least(subtotal,voucher.discount_value) WHEN 'shipping' THEN least(shipping,voucher.discount_value) ELSE NULL END;
  IF voucher_discount IS NULL THEN RAISE EXCEPTION 'sales_voucher_not_applicable' USING ERRCODE='22023'; END IF;
 END IF;
 result:=jsonb_build_object('customer_id',p_customer_id,'details',p_details,'lines',priced,'subtotal',subtotal,'tier_percent',tier_percent,'tier_id',tier.id,'line_discount',total_discount,
 'voucher_id',voucher.id,'customer_voucher_id',owned.id,'voucher_updated_at',voucher.updated_at,'voucher_used',usage_count_value,'voucher_discount',voucher_discount,
 'points_balance',points_balance,'points_used',points_used,'point_value',point_value,'shipping_fee',shipping,'delivery_option_id',delivery.id,'delivery_name',delivery.name,
 'total',greatest(0,subtotal-total_discount+shipping-voucher_discount),'warning',warning);
 RETURN result||jsonb_build_object('version',md5(result::text));
END $$;

CREATE OR REPLACE FUNCTION public.create_admin_sales_order(p_order_id uuid,p_customer_id uuid,p_expected_quote text,p_details jsonb,p_lines jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; prior public.audit_log; quote jsonb; item jsonb; redemption_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('sales_order.write') OR NOT pawpal_private.has_permission('sales_order_detail.write')
 OR NOT pawpal_private.has_permission('stock_reservation.write') OR NOT pawpal_private.has_permission('voucher_redemption.write')
 OR NOT pawpal_private.has_permission('paw_point_transaction.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'sales_checkout_forbidden' USING ERRCODE='42501'; END IF;
 IF p_order_id IS NULL OR p_customer_id IS NULL OR p_expected_quote IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object'
 OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array' OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 OR length(p_lines::text)>30000 OR length(p_details::text)>10000 THEN RAISE EXCEPTION 'invalid_sales_checkout' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 PERFORM pg_advisory_xact_lock(hashtextextended(p_order_id::text,27));
 SELECT * INTO prior FROM public.audit_log WHERE entity_id=p_order_id AND action='SALES_ORDER_CREATE';
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description::jsonb->>'customer_id'<>p_customer_id::text
  OR prior.description::jsonb->'details' IS DISTINCT FROM p_details OR prior.description::jsonb->'requested_lines' IS DISTINCT FROM p_lines THEN RAISE EXCEPTION 'sales_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_order_id;
 END IF;
 PERFORM 1 FROM public.customer WHERE id=p_customer_id FOR UPDATE;
 PERFORM 1 FROM public.customer_membership WHERE customer_id=p_customer_id FOR SHARE;
 PERFORM 1 FROM public.membership_tier WHERE id IN (SELECT membership_tier_id FROM public.customer_membership WHERE customer_id=p_customer_id) FOR SHARE;
 PERFORM 1 FROM public.delivery_option_config WHERE id=nullif(p_details->>'delivery_option_id','')::uuid FOR SHARE;
 PERFORM 1 FROM public.pawpal_setting WHERE setting_key='sales_point_redemption_value' FOR SHARE;
 IF p_details->>'discount_mode'='voucher' THEN
  PERFORM 1 FROM public.voucher WHERE voucher_code=btrim(p_details->>'voucher_code') FOR UPDATE;
  PERFORM 1 FROM public.customer_voucher WHERE customer_id=p_customer_id AND voucher_id IN (SELECT id FROM public.voucher WHERE voucher_code=btrim(p_details->>'voucher_code')) ORDER BY id FOR UPDATE;
 END IF;
 PERFORM 1 FROM public.product WHERE id IN (SELECT pv.product_id FROM public.product_variant pv JOIN jsonb_array_elements(p_lines) x ON pv.id=(x->>'variant_id')::uuid) ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.product_variant WHERE id IN (SELECT (x->>'variant_id')::uuid FROM jsonb_array_elements(p_lines) x) ORDER BY id FOR UPDATE;
 quote:=public.quote_admin_sales_order(p_customer_id,p_details,p_lines);
 IF quote->>'version'<>p_expected_quote THEN RAISE EXCEPTION 'sales_quote_changed' USING ERRCODE='PT409'; END IF;
 INSERT INTO public.sales_order(id,order_code,customer_id,order_status,note,shipping_fee_snapshot,receiver_name_snapshot,receiver_phone_snapshot,province_snapshot,street_address_snapshot,delivery_option_id)
 VALUES(p_order_id,'SO-'||replace(p_order_id::text,'-',''),p_customer_id,'pending',nullif(btrim(p_details->>'note'),''),(quote->>'shipping_fee')::numeric,
 nullif(btrim(p_details->>'receiver_name'),''),nullif(btrim(p_details->>'receiver_phone'),''),CASE WHEN p_details->>'delivery'='true' THEN btrim(p_details->>'province') END,
 CASE WHEN p_details->>'delivery'='true' THEN btrim(p_details->>'street_address') END,nullif(quote->>'delivery_option_id','')::uuid);
 FOR item IN SELECT value FROM jsonb_array_elements(quote->'lines') LOOP
  INSERT INTO public.sales_order_detail(order_id,product_variant_id,quantity,unit_price,discount_amount,product_name_snapshot,sku_snapshot)
  VALUES(p_order_id,(item->>'variant_id')::uuid,(item->>'quantity')::integer,(item->>'unit_price')::numeric,(item->>'discount_amount')::numeric,item->>'name',item->>'sku');
  INSERT INTO public.stock_reservation(product_variant_id,order_id,quantity,expires_at,status) VALUES((item->>'variant_id')::uuid,p_order_id,(item->>'quantity')::integer,'infinity','active');
 END LOOP;
 IF nullif(quote->>'voucher_id','') IS NOT NULL THEN
  INSERT INTO public.voucher_redemption(voucher_id,customer_voucher_id,order_id,discount_amount_snapshot,idempotency_key)
  VALUES((quote->>'voucher_id')::uuid,nullif(quote->>'customer_voucher_id','')::uuid,p_order_id,(quote->>'voucher_discount')::numeric,'sales-voucher:'||p_order_id) RETURNING id INTO redemption_id;
  UPDATE public.customer_voucher SET voucher_status='used' WHERE id=nullif(quote->>'customer_voucher_id','')::uuid;
 END IF;
 IF (quote->>'points_used')::integer>0 THEN
  INSERT INTO public.paw_point_transaction(customer_id,points,description,idempotency_key,sequence_no)
  SELECT p_customer_id,-(quote->>'points_used')::integer,'Quy đổi điểm theo cấu hình cho đơn '||p_order_id,'sales-order-points:'||p_order_id,coalesce(max(sequence_no),0)+1 FROM public.paw_point_transaction WHERE customer_id=p_customer_id;
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,'SALES_ORDER_CREATE','sales_order',p_order_id,jsonb_build_object('customer_id',p_customer_id,'details',p_details,'requested_lines',p_lines,'quote',quote)::text);
 RETURN p_order_id;
END $$;
REVOKE ALL ON FUNCTION public.quote_admin_sales_order(uuid,jsonb,jsonb),public.create_admin_sales_order(uuid,uuid,text,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.quote_admin_sales_order(uuid,jsonb,jsonb),public.create_admin_sales_order(uuid,uuid,text,jsonb,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.validate_voucher_use() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v public.voucher; cv public.customer_voucher; owner_id uuid; used integer;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.voucher_id,NEW.customer_voucher_id,NEW.order_id,NEW.appointment_id) IS DISTINCT FROM (OLD.voucher_id,OLD.customer_voucher_id,OLD.order_id,OLD.appointment_id) THEN RAISE EXCEPTION 'Voucher use source is immutable'; END IF;
 SELECT * INTO v FROM public.voucher WHERE id=NEW.voucher_id FOR UPDATE;
 IF NEW.order_id IS NOT NULL THEN SELECT customer_id INTO owner_id FROM public.sales_order WHERE id=NEW.order_id FOR UPDATE;
 ELSE SELECT customer_id INTO owner_id FROM public.appointment WHERE id=NEW.appointment_id FOR UPDATE; END IF;
 IF NEW.customer_voucher_id IS NOT NULL THEN
  SELECT * INTO cv FROM public.customer_voucher WHERE id=NEW.customer_voucher_id FOR UPDATE;
  IF cv.voucher_id IS DISTINCT FROM v.id OR cv.customer_id IS DISTINCT FROM owner_id THEN RAISE EXCEPTION 'Voucher issue owner or template mismatch'; END IF;
  IF NEW.status='applied' AND (cv.voucher_status<>'available' OR cv.expired_at<=now()) THEN RAISE EXCEPTION 'Issued voucher is not available'; END IF;
 END IF;
 IF NEW.status='applied' THEN
  IF NOT v.is_active OR (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date NOT BETWEEN v.start_date AND v.end_date THEN RAISE EXCEPTION 'Voucher is not effective'; END IF;
  SELECT count(*) INTO used FROM public.voucher_redemption WHERE voucher_id=v.id AND status='applied' AND id<>NEW.id;
  IF v.max_usage IS NOT NULL AND used>=v.max_usage THEN RAISE EXCEPTION 'Voucher usage limit reached' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION pawpal_private.validate_voucher_use() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
