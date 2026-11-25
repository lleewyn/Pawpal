BEGIN;
CREATE OR REPLACE FUNCTION public.own_wishlist_snapshot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cid uuid; wid uuid; products jsonb; services jsonb;
BEGIN
 cid:=(public.customer_profile_snapshot()->>'id')::uuid;
 SELECT id INTO wid FROM public.wishlist WHERE customer_id=cid;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.product_name,'status',p.status,'addedAt',w.added_at) ORDER BY w.added_at,p.id),'[]') INTO products
 FROM public.wishlist_product w JOIN public.product p ON p.id=w.product_id WHERE w.wishlist_id=wid;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'name',s.service_name,'status',s.status,'addedAt',w.added_at) ORDER BY w.added_at,s.id),'[]') INTO services
 FROM public.wishlist_service w JOIN public.service s ON s.id=w.service_id WHERE w.wishlist_id=wid;
 RETURN jsonb_build_object('id',wid,'customer_id',cid,'products',products,'services',services,
  'productIds',(SELECT coalesce(jsonb_agg(x->>'id'),'[]') FROM jsonb_array_elements(products) x),
  'serviceIds',(SELECT coalesce(jsonb_agg(x->>'id'),'[]') FROM jsonb_array_elements(services) x));
END $$;
CREATE OR REPLACE FUNCTION public.set_own_wishlist_item(p_kind text,p_item uuid,p_saved boolean,p_expected_owner uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cid uuid; wid uuid;
BEGIN
 cid:=(public.customer_profile_snapshot()->>'id')::uuid;
 IF p_expected_owner IS NOT NULL AND cid<>p_expected_owner THEN RAISE EXCEPTION 'Phiên tài khoản đã thay đổi' USING ERRCODE='42501';END IF;
 IF p_kind NOT IN ('product','service') OR p_kind IS NULL OR p_item IS NULL OR p_saved IS NULL THEN RAISE EXCEPTION 'Yêu cầu yêu thích không hợp lệ' USING ERRCODE='22023';END IF;
 PERFORM 1 FROM public.customer WHERE id=cid FOR UPDATE;
 IF p_saved AND ((p_kind='product' AND NOT EXISTS(SELECT 1 FROM public.product WHERE id=p_item AND status='active'))
 OR (p_kind='service' AND NOT EXISTS(SELECT 1 FROM public.service WHERE id=p_item AND status='active'))) THEN
  RAISE EXCEPTION 'Sản phẩm hoặc dịch vụ không còn hoạt động' USING ERRCODE='22023';END IF;
 SELECT id INTO wid FROM public.wishlist WHERE customer_id=cid;
 IF wid IS NULL AND NOT p_saved THEN RETURN false;END IF;
 IF wid IS NULL THEN INSERT INTO public.wishlist(customer_id) VALUES(cid) RETURNING id INTO wid;END IF;
 IF p_kind='product' THEN
  IF p_saved THEN INSERT INTO public.wishlist_product(wishlist_id,product_id) VALUES(wid,p_item) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.wishlist_product WHERE wishlist_id=wid AND product_id=p_item;END IF;
 ELSE
  IF p_saved THEN INSERT INTO public.wishlist_service(wishlist_id,service_id) VALUES(wid,p_item) ON CONFLICT DO NOTHING;
  ELSE DELETE FROM public.wishlist_service WHERE wishlist_id=wid AND service_id=p_item;END IF;
 END IF;
 RETURN p_saved;
END $$;
REVOKE ALL ON FUNCTION public.own_wishlist_snapshot(),public.set_own_wishlist_item(text,uuid,boolean,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_wishlist_snapshot(),public.set_own_wishlist_item(text,uuid,boolean,uuid) TO authenticated;
-- Read-only ownership policies support Realtime; writes remain RPC-only for customers.
GRANT SELECT ON public.wishlist_product,public.wishlist_service TO authenticated;
DROP POLICY IF EXISTS own_wishlist_products ON public.wishlist_product;
CREATE POLICY own_wishlist_products ON public.wishlist_product FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.wishlist w WHERE w.id=wishlist_id AND pawpal_private.owns_customer(w.customer_id)));
DROP POLICY IF EXISTS own_wishlist_services ON public.wishlist_service;
CREATE POLICY own_wishlist_services ON public.wishlist_service FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.wishlist w WHERE w.id=wishlist_id AND pawpal_private.owns_customer(w.customer_id)));
DO $$ DECLARE t text;BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime' AND NOT puballtables) THEN
  FOREACH t IN ARRAY ARRAY['wishlist','wishlist_product','wishlist_service'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);END IF;
  END LOOP;
 END IF;
END $$;
COMMIT;
