BEGIN;
CREATE OR REPLACE FUNCTION public.own_customer_cart(p_lines jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; cart_id_value uuid; item jsonb; variant uuid; qty numeric; price numeric; available bigint; seen uuid[]:='{}'; result jsonb;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id) FOR UPDATE;
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
  RAISE EXCEPTION 'Vui lòng đăng nhập bằng tài khoản khách hàng' USING ERRCODE='42501'; END IF;
 SELECT id INTO cart_id_value FROM public.cart WHERE customer_id=owner_id ORDER BY created_at,id LIMIT 1 FOR UPDATE;
 IF p_lines IS NOT NULL THEN
  IF jsonb_typeof(p_lines)<>'array' OR jsonb_array_length(p_lines)>100 OR length(p_lines::text)>30000 THEN
   RAISE EXCEPTION 'Giỏ hàng không hợp lệ' USING ERRCODE='22023'; END IF;
  IF cart_id_value IS NULL THEN INSERT INTO public.cart(customer_id) VALUES(owner_id) RETURNING id INTO cart_id_value; END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(p_lines) ORDER BY value->>'variant_id' LOOP
   variant:=(item->>'variant_id')::uuid; qty:=(item->>'quantity')::numeric;
   IF variant IS NULL OR variant=ANY(seen) OR qty IS NULL OR qty::text IN ('NaN','Infinity','-Infinity') OR qty NOT BETWEEN 1 AND 999 OR qty<>round(qty) THEN
    RAISE EXCEPTION 'Số lượng sản phẩm không hợp lệ' USING ERRCODE='22023'; END IF;
   seen:=array_append(seen,variant);
   SELECT pv.sale_price INTO price FROM public.product_variant pv JOIN public.product p ON p.id=pv.product_id
    WHERE pv.id=variant AND lower(pv.status)='active' AND lower(p.status)='active' FOR SHARE OF pv;
   IF NOT FOUND THEN RAISE EXCEPTION 'Sản phẩm không còn được bán' USING ERRCODE='22023'; END IF;
   SELECT coalesce((SELECT sum(quantity) FROM public.inventory_transaction WHERE product_variant_id=variant),0)
    -coalesce((SELECT sum(quantity) FROM public.stock_reservation WHERE product_variant_id=variant AND status='active' AND expires_at>now()),0) INTO available;
   IF qty>available THEN RAISE EXCEPTION 'Sản phẩm không đủ tồn kho khả dụng' USING ERRCODE='22023'; END IF;
   INSERT INTO public.cart_item(cart_id,product_variant_id,quantity,unit_price) VALUES(cart_id_value,variant,qty,price)
   ON CONFLICT(cart_id,product_variant_id) DO UPDATE SET quantity=EXCLUDED.quantity,unit_price=EXCLUDED.unit_price,updated_at=now();
  END LOOP;
  DELETE FROM public.cart_item WHERE cart_id=cart_id_value AND NOT(product_variant_id=ANY(seen));
  UPDATE public.cart SET updated_at=now() WHERE id=cart_id_value;
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',ci.id,'product_variant_id',ci.product_variant_id,'quantity',ci.quantity,
  'unit_price',pv.sale_price,'product_variant',jsonb_build_object('id',pv.id,'product_id',pv.product_id,'sku_variant',pv.sku_variant,'sale_price',pv.sale_price,
  'product',jsonb_build_object('id',p.id,'product_name',p.product_name,'brand_name',p.brand_name))) ORDER BY ci.created_at,ci.id),'[]'::jsonb)
 INTO result FROM public.cart_item ci JOIN public.product_variant pv ON pv.id=ci.product_variant_id JOIN public.product p ON p.id=pv.product_id WHERE ci.cart_id=cart_id_value;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.own_customer_cart(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_customer_cart(jsonb) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
