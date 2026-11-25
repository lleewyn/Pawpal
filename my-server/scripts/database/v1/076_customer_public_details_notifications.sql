BEGIN;
CREATE OR REPLACE FUNCTION public.own_notifications_snapshot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cid uuid; rows jsonb;
BEGIN
 cid:=(public.customer_profile_snapshot()->>'id')::uuid;
 SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY n.sent_at DESC,n.id),'[]') INTO rows FROM public.notification n WHERE customer_id=cid;
 RETURN jsonb_build_object('customer_id',cid,'snapshot_at',now(),'rows',rows);
END $$;
CREATE OR REPLACE FUNCTION public.mark_own_notifications_read(p_id uuid DEFAULT NULL,p_before timestamptz DEFAULT NULL,p_expected_owner uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cid uuid; affected integer;
BEGIN
 cid:=(public.customer_profile_snapshot()->>'id')::uuid;
 IF p_expected_owner IS NOT NULL AND p_expected_owner<>cid THEN RAISE EXCEPTION 'Phiên tài khoản đã thay đổi' USING ERRCODE='42501'; END IF;
 IF p_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.notification WHERE id=p_id AND customer_id=cid) THEN RAISE EXCEPTION 'Không có quyền đọc thông báo' USING ERRCODE='42501';END IF;
 IF p_id IS NULL AND (p_before IS NULL OR p_before>now()) THEN RAISE EXCEPTION 'Cần mốc thông báo đã tải' USING ERRCODE='22023';END IF;
 UPDATE public.notification SET read_at=now() WHERE customer_id=cid AND read_at IS NULL AND
  ((p_id IS NOT NULL AND id=p_id) OR (p_id IS NULL AND sent_at<=p_before));
 GET DIAGNOSTICS affected=ROW_COUNT;RETURN affected;
END $$;
REVOKE ALL ON FUNCTION public.own_notifications_snapshot(),public.mark_own_notifications_read(uuid,timestamptz,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_notifications_snapshot(),public.mark_own_notifications_read(uuid,timestamptz,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.public_product_delivery_options()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',name,'description',description,'fee',fee,'estimated_days',estimated_days) ORDER BY id),'[]') FROM public.delivery_option_config WHERE available;
$$;
REVOKE ALL ON FUNCTION public.public_product_delivery_options() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_product_delivery_options() TO anon,authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime' AND NOT puballtables)
 AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='notification') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notification;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION public.customer_shop_catalog()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(r) ORDER BY r.product_name,r.id),'[]') FROM (
 SELECT p.id,p.product_name,p.brand_name,p.category_id,p.unit,p.target_pet,p.description,p.slug,p.status,p.origin,p.ingredients,p.benefits,p.usage_instructions,p.specs,p.badge,
 (SELECT coalesce(avg(r.rating),0) FROM public.review r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id JOIN public.product_variant v ON v.id=d.product_variant_id WHERE v.product_id=p.id AND r.review_status IN ('da_duyet','approved','published')) AS rating,
 (SELECT count(*) FROM public.review r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id JOIN public.product_variant v ON v.id=d.product_variant_id WHERE v.product_id=p.id AND r.review_status IN ('da_duyet','approved','published')) AS review_count,
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

COMMIT;
