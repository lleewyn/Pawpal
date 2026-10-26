-- Apply together with the CSV importer in one transaction.
ALTER TABLE public.product ADD COLUMN IF NOT EXISTS product_code text;
CREATE UNIQUE INDEX IF NOT EXISTS product_code_unique ON public.product(product_code) WHERE product_code IS NOT NULL;
ALTER TABLE public.product_variant ADD COLUMN IF NOT EXISTS variant_name text;
ALTER TABLE public.product_variant ADD COLUMN IF NOT EXISTS packaging text;
ALTER TABLE public.product_variant ADD COLUMN IF NOT EXISTS features text;
ALTER TABLE public.product_variant ADD COLUMN IF NOT EXISTS badge text;
ALTER TABLE public.product_variant ADD COLUMN IF NOT EXISTS gross_weight_text text;
ALTER TABLE public.product_variant ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.product_variant ADD COLUMN IF NOT EXISTS ingredients text;
ALTER TABLE public.product_variant ADD COLUMN IF NOT EXISTS source_url text;
ALTER TABLE public.product_variant ADD COLUMN IF NOT EXISTS source_slug text;
ALTER TABLE public.product_variant ADD COLUMN IF NOT EXISTS catalog_retired boolean NOT NULL DEFAULT false;
-- The source supplies color names but no exact swatch codes; unknown is NULL.
ALTER TABLE public.variant_color ALTER COLUMN hex_code DROP NOT NULL;
-- Package/name is an independent variant dimension (e.g. 400g versus 1kg).
ALTER TABLE public.product_variant DROP CONSTRAINT IF EXISTS product_variant_product_id_color_id_size_id_flavor_id_key;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_constraint WHERE conname='product_variant_configuration_unique' AND conrelid='public.product_variant'::regclass) THEN
  ALTER TABLE public.product_variant ADD CONSTRAINT product_variant_configuration_unique UNIQUE NULLS NOT DISTINCT(product_id,color_id,size_id,flavor_id,variant_name);
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.customer_shop_catalog()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.product_name,p.id),'[]'::jsonb) FROM (
 SELECT p.id,p.product_code,p.product_name,p.brand_name,p.category_id,p.unit,p.target_pet,p.description,p.slug,p.status,p.origin,p.ingredients,p.benefits,p.usage_instructions,p.specs,p.badge,
 (SELECT coalesce(avg(r.rating),0) FROM public.review r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id JOIN public.product_variant v ON v.id=d.product_variant_id WHERE v.product_id=p.id AND r.review_status IN ('da_duyet','approved','published')) rating,
 (SELECT count(*) FROM public.review r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id JOIN public.product_variant v ON v.id=d.product_variant_id WHERE v.product_id=p.id AND r.review_status IN ('da_duyet','approved','published')) review_count,
 jsonb_build_object('category_name',c.category_name) product_category,
 (SELECT coalesce(jsonb_agg(image_url ORDER BY is_thumbnail DESC,display_order,id),'[]'::jsonb) FROM public.product_media WHERE product_id=p.id) image_urls,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('id',v.id,'sku_variant',v.sku_variant,'variant_name',v.variant_name,'sale_price',v.sale_price,'compare_at_price',v.compare_at_price,'status',v.status,
 'packaging',v.packaging,'features',v.features,'badge',v.badge,'gross_weight_text',v.gross_weight_text,'description',v.description,'ingredients',v.ingredients,
 'size_name',s.size_name,'flavor_name',f.flavor_name,'color_name',co.color_name,
 'image_urls',(SELECT coalesce(jsonb_agg(image_url ORDER BY is_thumbnail DESC,display_order,id),'[]'::jsonb) FROM public.product_variant_media WHERE product_variant_id=v.id),
 'available_quantity',greatest(0,coalesce((SELECT sum(quantity) FROM public.inventory_transaction WHERE product_variant_id=v.id),0)-coalesce((SELECT sum(quantity) FROM public.stock_reservation WHERE product_variant_id=v.id AND status='active' AND expires_at>now()),0))) ORDER BY v.sku_variant),'[]'::jsonb)
 FROM public.product_variant v LEFT JOIN public.variant_size s ON s.id=v.size_id LEFT JOIN public.variant_color co ON co.id=v.color_id LEFT JOIN public.variant_flavor f ON f.id=v.flavor_id
 WHERE v.product_id=p.id AND v.status='active' AND NOT v.catalog_retired) product_variant
 FROM public.product p JOIN public.product_category c ON c.id=p.category_id WHERE p.status='active'
 ) p
$$;
REVOKE ALL ON FUNCTION public.customer_shop_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_shop_catalog() TO anon,authenticated;

DO $$ DECLARE t text; BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  FOREACH t IN ARRAY ARRAY['product','product_variant','product_media','product_variant_media','inventory','inventory_transaction','variant_size','variant_color','variant_flavor'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t); END IF;
  END LOOP;
 END IF;
END $$;
