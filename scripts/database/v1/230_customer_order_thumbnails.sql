BEGIN;
CREATE OR REPLACE FUNCTION public.own_order_thumbnails(p_variants uuid[])
RETURNS TABLE(product_variant_id uuid,image_url text,media_asset_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public
SET statement_timeout='5s' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'order_media_forbidden' USING ERRCODE='42501';END IF;
 IF p_variants IS NULL OR cardinality(p_variants)>100 THEN RAISE EXCEPTION 'invalid_order_media_batch' USING ERRCODE='22023';END IF;
 RETURN QUERY
 WITH owned AS MATERIALIZED (
  SELECT DISTINCT d.product_variant_id id FROM public.sales_order_detail d JOIN public.sales_order o ON o.id=d.order_id
  WHERE d.product_variant_id=ANY(p_variants) AND pawpal_private.owns_customer(o.customer_id)
 )
 SELECT v.id,m.image_url,m.media_asset_id FROM owned x JOIN public.product_variant v ON v.id=x.id
 LEFT JOIN LATERAL (
  SELECT images.image_url,images.media_asset_id FROM (
   SELECT a.id,a.image_url,a.media_asset_id,a.is_thumbnail,a.display_order,0 priority FROM public.product_variant_media a WHERE a.product_variant_id=v.id
   UNION ALL
   SELECT a.id,a.image_url,a.media_asset_id,a.is_thumbnail,a.display_order,1 priority FROM public.product_media a WHERE a.product_id=v.product_id
  ) images ORDER BY images.priority,images.is_thumbnail DESC,images.display_order,images.id LIMIT 1
 ) m ON true;
END $$;
REVOKE ALL ON FUNCTION public.own_order_thumbnails(uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_order_thumbnails(uuid[]) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
