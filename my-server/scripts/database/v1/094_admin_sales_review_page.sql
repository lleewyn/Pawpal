BEGIN;
CREATE OR REPLACE FUNCTION public.get_admin_sales_review_page(p_product_id uuid,p_filter text DEFAULT 'ALL',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('review.read') OR NOT pawpal_private.has_permission('review_media.read') OR NOT pawpal_private.has_permission('sales_order_detail.read') OR NOT pawpal_private.has_permission('product_variant.read') THEN RAISE EXCEPTION 'sales_review_page_forbidden' USING ERRCODE='42501';END IF;
 IF p_product_id IS NULL OR p_filter IS NULL OR p_filter NOT IN ('ALL','5','4','MEDIA') OR p_page IS NULL OR p_page<1 OR p_page>10000000 THEN RAISE EXCEPTION 'invalid_review_page' USING ERRCODE='22023';END IF;
 WITH base AS MATERIALIZED (
 SELECT r.id,r.rating,r.created_at,EXISTS(SELECT 1 FROM public.review_media m WHERE m.review_id=r.id) has_media
 FROM public.review r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id JOIN public.product_variant v ON v.id=d.product_variant_id WHERE v.product_id=p_product_id
 ), matched AS MATERIALIZED (
 SELECT * FROM base WHERE p_filter='ALL' OR (p_filter='MEDIA' AND has_media) OR rating::text=p_filter
 ), meta AS (SELECT count(*) total,least(p_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched), selected AS (
 SELECT id,created_at FROM matched ORDER BY created_at DESC,id OFFSET ((SELECT page FROM meta)-1)*10 LIMIT 10
 )
 SELECT jsonb_build_object('total',(SELECT total FROM meta),'page',(SELECT page FROM meta),'count',(SELECT count(*) FROM base),'average',(SELECT avg(rating) FROM base),'ids',coalesce((SELECT jsonb_agg(id ORDER BY created_at DESC,id) FROM selected),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_sales_review_page(uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_sales_review_page(uuid,text,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
