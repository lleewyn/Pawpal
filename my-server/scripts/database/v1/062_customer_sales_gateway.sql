BEGIN;
-- Customers cannot insert audit rows through RLS. The reviewed owner RPCs may
-- record only the reviewed sales events, with ownership checked again here.
CREATE OR REPLACE FUNCTION pawpal_private.audit_actor() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_order uuid;
BEGIN
 IF auth.role()='authenticated' THEN
  SELECT id INTO NEW.staff_id FROM public.staff WHERE auth_user_id=auth.uid() AND employment_status='active' AND NOT must_change_password;
  IF NEW.staff_id IS NULL THEN
   IF NEW.entity_name='sales_order' AND NEW.action='SALES_ORDER_CREATE' THEN owner_order:=NEW.entity_id;
   ELSIF NEW.entity_name='sales_order' AND NEW.action='SALES_FULFILLMENT'
     AND NEW.description::jsonb->>'action' IN ('cancel','complete') THEN owner_order:=(NEW.description::jsonb->>'order_id')::uuid;
   ELSIF NEW.entity_name='return_request' AND NEW.action='SALES_RETURN'
     AND NEW.description::jsonb->>'action'='create' THEN owner_order:=(NEW.description::jsonb->>'order_id')::uuid;
   ELSIF pg_trigger_depth()>1 AND NEW.action='INSERT' AND NEW.entity_name='payment' THEN
    SELECT order_id INTO owner_order FROM public.payment WHERE id=NEW.entity_id AND transaction_status='pending' AND idempotency_key='customer-order:'||order_id;
   ELSIF pg_trigger_depth()>1 AND NEW.action IN ('INSERT','UPDATE') AND NEW.entity_name='voucher_redemption' THEN
    SELECT order_id INTO owner_order FROM public.voucher_redemption WHERE id=NEW.entity_id;
   ELSIF pg_trigger_depth()>1 AND NEW.action='INSERT' AND NEW.entity_name='paw_point_transaction' THEN
    IF EXISTS(SELECT 1 FROM public.paw_point_transaction p WHERE p.id=NEW.entity_id AND pawpal_private.owns_customer(p.customer_id))
     AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Customer ledger ownership required';
   ELSE RAISE EXCEPTION 'Audit actor requires active staff'; END IF;
   IF EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) OR NOT EXISTS(
    SELECT 1 FROM public.sales_order o WHERE o.id=owner_order AND pawpal_private.owns_customer(o.customer_id)
   ) THEN RAISE EXCEPTION 'Customer audit ownership required'; END IF;
  END IF;
 END IF;
 RETURN NEW;
END $$;
-- Reuse the deployed, reviewed Admin algorithms without granting staff permissions
-- to customers. Private copies retain every price/stock/discount/lock rule; replace
-- only their entry guard, and restrict the fulfillment copy to cancellation.
DO $$ DECLARE item record; source text; first_guard integer; end_guard integer; replacement text;
BEGIN
 FOR item IN SELECT * FROM (VALUES
  ('quote_admin_sales_order','uuid,jsonb,jsonb','quote_own_sales_core'),
  ('create_admin_sales_order','uuid,uuid,text,jsonb,jsonb','create_own_sales_core'),
  ('update_admin_sales_order','uuid,uuid,timestamptz,text,jsonb','cancel_own_sales_core'),
  ('save_admin_sales_return','uuid,uuid,uuid,timestamptz,text,jsonb','request_own_return_core')) x(original,args,target) LOOP
  source:=pg_get_functiondef(to_regprocedure('public.'||item.original||'('||item.args||')'));
  IF source IS NULL THEN RAISE EXCEPTION 'Missing reviewed sales source'; END IF;
  first_guard:=strpos(source,'IF auth.uid() IS NULL');
  IF first_guard=0 THEN RAISE EXCEPTION 'Unexpected sales guard'; END IF;
  end_guard:=strpos(substring(source FROM first_guard),'END IF;')+first_guard+length('END IF;')-1;
  IF item.original='update_admin_sales_order' THEN
   replacement:=$guard$IF NOT EXISTS(SELECT 1 FROM public.sales_order owned_order WHERE owned_order.id=p_order_id AND pawpal_private.owns_customer(owned_order.customer_id)
    AND (p_action='cancel' OR (p_action='complete' AND owned_order.order_status IN ('shipped','shipping','completed')))) THEN RAISE EXCEPTION 'Không được thao tác đơn hàng này' USING ERRCODE='42501'; END IF;$guard$;
  ELSIF item.original='save_admin_sales_return' THEN
   replacement:=$guard$IF p_action IS DISTINCT FROM 'create' OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) OR NOT EXISTS(
    SELECT 1 FROM public.sales_order owned_order WHERE owned_order.id=p_order_id AND pawpal_private.owns_customer(owned_order.customer_id)
   ) OR coalesce(p_details->>'received','false')<>'false' OR coalesce(p_details->>'saleable','false')<>'false'
   THEN RAISE EXCEPTION 'customer_return_forbidden' USING ERRCODE='42501'; END IF;$guard$;
  ELSE
   replacement:=$guard$IF NOT pawpal_private.owns_customer(p_customer_id) OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'Không được thao tác đơn hàng của khách khác' USING ERRCODE='42501'; END IF;$guard$;
  END IF;
  source:=substring(source FOR first_guard-1)||replacement||substring(source FROM end_guard);
  source:=replace(source,'FUNCTION public.'||item.original||'(','FUNCTION pawpal_private.'||item.target||'(');
  source:=replace(source,'SECURITY INVOKER','SECURITY DEFINER');
  source:=replace(source,'public.quote_admin_sales_order(','pawpal_private.quote_own_sales_core(');
  source:=replace(source,$old$pv.status='active' AND p.status='active'$old$,$new$lower(pv.status)='active' AND lower(p.status)='active'$new$);
  EXECUTE source;
  EXECUTE format('REVOKE ALL ON FUNCTION pawpal_private.%I(%s) FROM PUBLIC,anon,authenticated',item.target,item.args);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.request_own_sales_return(p_request uuid,p_order uuid,p_expected timestamptz,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 RETURN pawpal_private.request_own_return_core(p_request,p_request,p_order,p_expected,'create',p_details);
END $$;
REVOKE ALL ON FUNCTION public.request_own_sales_return(uuid,uuid,timestamptz,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.request_own_sales_return(uuid,uuid,timestamptz,jsonb) TO authenticated;
DROP POLICY IF EXISTS own_sales_return ON public.return_request;
CREATE POLICY own_sales_return ON public.return_request FOR SELECT TO authenticated USING(EXISTS(
 SELECT 1 FROM public.sales_order o WHERE o.id=sales_order_id AND pawpal_private.owns_customer(o.customer_id)));
DROP POLICY IF EXISTS own_sales_return_line ON public.return_request_detail;
CREATE POLICY own_sales_return_line ON public.return_request_detail FOR SELECT TO authenticated USING(EXISTS(
 SELECT 1 FROM public.return_request r JOIN public.sales_order o ON o.id=r.sales_order_id
 WHERE r.id=return_request_id AND pawpal_private.owns_customer(o.customer_id)));
GRANT SELECT ON public.return_request,public.return_request_detail TO authenticated;
CREATE OR REPLACE FUNCTION public.receive_own_sales_order(p_request uuid,p_order uuid,p_expected timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 RETURN pawpal_private.cancel_own_sales_core(p_request,p_order,p_expected,'complete','{}'::jsonb);
END $$;
REVOKE ALL ON FUNCTION public.receive_own_sales_order(uuid,uuid,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.receive_own_sales_order(uuid,uuid,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.quote_own_sales_order(p_details jsonb,p_lines jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id);
 RETURN pawpal_private.quote_own_sales_core(owner_id,p_details,p_lines);
END $$;

CREATE OR REPLACE FUNCTION public.create_own_sales_order(p_id uuid,p_expected_quote text,p_details jsonb,p_lines jsonb,p_payment_method uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; method public.payment_method_config; prior public.payment; due numeric;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id) FOR UPDATE;
 IF owner_id IS NULL THEN RAISE EXCEPTION 'Vui lòng đăng nhập lại' USING ERRCODE='42501'; END IF;
 SELECT * INTO method FROM public.payment_method_config WHERE id=p_payment_method AND available AND fee=0 FOR SHARE;
 IF NOT FOUND OR lower(method.short_name) NOT IN ('cod','cash','bank transfer','vietqr') THEN
  RAISE EXCEPTION 'Phương thức này chưa hỗ trợ xác nhận thủ công' USING ERRCODE='22023'; END IF;
 PERFORM pawpal_private.create_own_sales_core(p_id,owner_id,p_expected_quote,p_details,p_lines);
 SELECT * INTO prior FROM public.payment WHERE idempotency_key='customer-order:'||p_id;
 IF FOUND THEN
  IF prior.payment_method_config_id<>method.id THEN RAISE EXCEPTION 'Yêu cầu đặt hàng đã thay đổi' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 SELECT total_amount INTO due FROM public.sales_order_totals WHERE order_id=p_id;
 IF due>0 THEN
  INSERT INTO public.payment(payment_code,customer_id,payment_method_config_id,payment_type,amount,transaction_status,idempotency_key,order_id)
  VALUES('PAY-'||replace(p_id::text,'-',''),owner_id,method.id,'collection',due,'pending','customer-order:'||p_id,p_id);
 END IF;
 RETURN p_id;
END $$;

CREATE OR REPLACE FUNCTION public.cancel_own_sales_order(p_request uuid,p_order uuid,p_expected timestamptz,p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 RETURN pawpal_private.cancel_own_sales_core(p_request,p_order,p_expected,'cancel',jsonb_build_object('reason',p_reason));
END $$;
REVOKE ALL ON FUNCTION public.quote_own_sales_order(jsonb,jsonb),public.create_own_sales_order(uuid,text,jsonb,jsonb,uuid),public.cancel_own_sales_order(uuid,uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.quote_own_sales_order(jsonb,jsonb),public.create_own_sales_order(uuid,text,jsonb,jsonb,uuid),public.cancel_own_sales_order(uuid,uuid,timestamptz,text) TO authenticated;

DROP POLICY IF EXISTS own_customer_order ON public.sales_order;
CREATE POLICY own_customer_order ON public.sales_order FOR SELECT TO authenticated USING(pawpal_private.owns_customer(customer_id));
DROP POLICY IF EXISTS own_customer_order_detail ON public.sales_order_detail;
CREATE POLICY own_customer_order_detail ON public.sales_order_detail FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.sales_order o WHERE o.id=order_id AND pawpal_private.owns_customer(o.customer_id)));
DROP POLICY IF EXISTS own_customer_order_payment ON public.payment;
CREATE POLICY own_customer_order_payment ON public.payment FOR SELECT TO authenticated USING(pawpal_private.owns_customer(customer_id));
GRANT SELECT ON public.sales_order,public.sales_order_detail,public.payment TO authenticated;
CREATE OR REPLACE FUNCTION public.customer_shop_options()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object(
 'delivery_options',(SELECT coalesce(jsonb_agg(to_jsonb(d) ORDER BY fee,id),'[]') FROM public.delivery_option_config d WHERE available),
 'payment_methods',(SELECT coalesce(jsonb_agg(to_jsonb(m) ORDER BY id),'[]') FROM public.payment_method_config m WHERE available AND fee=0 AND lower(short_name) IN ('cod','cash','bank transfer','vietqr')),
 'point_value',(SELECT CASE WHEN setting_value ~ '^[1-9][0-9]{0,8}$' THEN setting_value::numeric ELSE NULL END FROM public.pawpal_setting WHERE setting_key='sales_point_redemption_value'));
$$;
REVOKE ALL ON FUNCTION public.customer_shop_options() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_shop_options() TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.customer_shop_catalog()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.product_name,r.id),'[]') FROM (
 SELECT p.id,p.product_name,p.brand_name,p.category_id,p.unit,p.target_pet,p.description,p.slug,p.status,p.origin,p.ingredients,p.benefits,p.usage_instructions,p.specs,p.badge,
 jsonb_build_object('category_name',c.category_name) AS product_category,
 (SELECT coalesce(jsonb_agg(image_url ORDER BY is_thumbnail DESC,display_order,id),'[]') FROM public.product_media WHERE product_id=p.id) AS image_urls,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('id',v.id,'sku_variant',v.sku_variant,'sale_price',v.sale_price,'compare_at_price',v.compare_at_price,'status',v.status,
 'available_quantity',greatest(0,coalesce((SELECT sum(quantity) FROM public.inventory_transaction WHERE product_variant_id=v.id),0)-coalesce((SELECT sum(quantity) FROM public.stock_reservation WHERE product_variant_id=v.id AND status='active' AND expires_at>now()),0))) ORDER BY v.sale_price,v.id),'[]')
 FROM public.product_variant v WHERE v.product_id=p.id AND lower(v.status)='active') AS product_variant
 FROM public.product p JOIN public.product_category c ON c.id=p.category_id WHERE lower(p.status)='active'
 ) r;
$$;
REVOKE ALL ON FUNCTION public.customer_shop_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_shop_catalog() TO anon,authenticated;
CREATE OR REPLACE FUNCTION public.own_sales_order_totals()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'total',t.total_amount,'paid',
  coalesce((SELECT sum(amount) FROM public.payment WHERE order_id=o.id AND transaction_status='succeeded'),0)
  -coalesce((SELECT sum(r.refunded_amount) FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE p.order_id=o.id AND r.refund_status='succeeded'),0))),'[]')
 FROM public.sales_order o JOIN public.sales_order_totals t ON t.order_id=o.id WHERE pawpal_private.owns_customer(o.customer_id);
$$;
REVOKE ALL ON FUNCTION public.own_sales_order_totals() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_sales_order_totals() TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
