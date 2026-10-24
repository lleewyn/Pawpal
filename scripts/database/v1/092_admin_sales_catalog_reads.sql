BEGIN;
CREATE OR REPLACE FUNCTION public.search_admin_sales_customers(p_query text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('customer.read') OR NOT pawpal_private.has_permission('customer_profile.read') OR NOT pawpal_private.has_permission('customer_phone.read') OR NOT pawpal_private.has_permission('customer_membership.read') OR NOT pawpal_private.has_permission('membership_tier.read') THEN RAISE EXCEPTION 'sales_customer_search_forbidden' USING ERRCODE='42501';END IF;
 IF p_query IS NULL OR length(p_query)>200 THEN RAISE EXCEPTION 'invalid_search' USING ERRCODE='22023';END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) FROM (
 SELECT c.id,p.full_name name,coalesce(phone.phone_number,'') phone,t.tier_name rank
 FROM public.customer c LEFT JOIN public.customer_profile p ON p.customer_id=c.id
 LEFT JOIN public.customer_phone phone ON phone.customer_id=c.id AND phone.is_primary
 LEFT JOIN public.customer_membership m ON m.customer_id=c.id LEFT JOIN public.membership_tier t ON t.id=m.membership_tier_id
 WHERE c.customer_status='active' AND (btrim(p_query)='' OR strpos(public.admin_sales_search_text(coalesce(p.full_name,'')||' '||coalesce(phone.phone_number,'')||' '||c.customer_code),public.admin_sales_search_text(btrim(p_query)))>0)
 ORDER BY c.created_at DESC,c.id LIMIT 10) c);
END $$;
CREATE OR REPLACE FUNCTION public.search_admin_sales_variants(p_query text DEFAULT '') RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('product.read') OR NOT pawpal_private.has_permission('product_variant.read') THEN RAISE EXCEPTION 'sales_variant_search_forbidden' USING ERRCODE='42501';END IF;
 IF p_query IS NULL OR length(p_query)>200 THEN RAISE EXCEPTION 'invalid_search' USING ERRCODE='22023';END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) FROM (
 SELECT v.id "variantId",v.sku_variant sku,p.product_name||' - '||v.sku_variant name,v.sale_price price
 FROM public.product_variant v JOIN public.product p ON p.id=v.product_id
 WHERE p.status='active' AND v.status='active' AND (btrim(p_query)='' OR strpos(public.admin_sales_search_text(p.product_name||' '||v.sku_variant),public.admin_sales_search_text(btrim(p_query)))>0)
 ORDER BY p.product_name,v.id LIMIT 10) v);
END $$;
CREATE OR REPLACE FUNCTION public.get_admin_sales_product_page(p_query text DEFAULT '',p_category text DEFAULT 'ALL',p_stock text DEFAULT 'ALL',p_page integer DEFAULT 1) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('product.read') OR NOT pawpal_private.has_permission('product_variant.read') OR NOT pawpal_private.has_permission('inventory.read') OR NOT pawpal_private.has_permission('product_category.read') OR NOT pawpal_private.has_permission('review.read') OR NOT pawpal_private.has_permission('sales_order_detail.read') THEN RAISE EXCEPTION 'sales_catalog_forbidden' USING ERRCODE='42501';END IF;
 IF p_query IS NULL OR length(p_query)>200 OR p_category IS NULL OR length(p_category)>200 OR p_stock IS NULL OR p_stock NOT IN ('ALL','in_stock','low_stock','out_of_stock','suspended') OR p_page IS NULL OR p_page<1 OR p_page>10000000 THEN RAISE EXCEPTION 'invalid_catalog_page' USING ERRCODE='22023';END IF;
 WITH stock AS MATERIALIZED (
 SELECT p.id,p.product_name,p.brand_name,p.status,c.category_name,
 CASE WHEN count(v.id)=0 OR count(v.id)<>count(i.quantity_in_stock) THEN NULL ELSE sum(i.quantity_in_stock) END quantity,
 sum(i.minimum_stock) minimum,count(v.id)<>count(i.quantity_in_stock) incomplete,sum(i.quantity_in_stock*v.cost_price) value
 FROM public.product p LEFT JOIN public.product_category c ON c.id=p.category_id LEFT JOIN public.product_variant v ON v.product_id=p.id LEFT JOIN public.inventory i ON i.product_variant_id=v.id GROUP BY p.id,p.product_name,p.brand_name,p.status,c.category_name
 ), matched AS MATERIALIZED (
 SELECT * FROM stock s WHERE (p_category='ALL' OR coalesce(category_name,'Chưa phân loại')=p_category)
 AND (btrim(p_query)='' OR strpos(public.admin_sales_search_text(product_name||' '||coalesce(brand_name,'')),public.admin_sales_search_text(btrim(p_query)))>0 OR EXISTS(SELECT 1 FROM public.product_variant v WHERE v.product_id=s.id AND strpos(public.admin_sales_search_text(v.sku_variant),public.admin_sales_search_text(btrim(p_query)))>0))
 AND (p_stock='ALL' OR (p_stock='suspended' AND status<>'active') OR (status='active' AND ((p_stock='in_stock' AND quantity>minimum) OR (p_stock='low_stock' AND quantity>0 AND quantity<=minimum) OR (p_stock='out_of_stock' AND quantity=0))))
 ), meta AS (SELECT count(*) total,least(p_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched), selected AS (
 SELECT id FROM matched ORDER BY id OFFSET ((SELECT page FROM meta)-1)*10 LIMIT 10
 ), ratings AS (
 SELECT v.product_id id,count(*) count,avg(r.rating) rating FROM public.review r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id JOIN public.product_variant v ON v.id=d.product_variant_id WHERE v.product_id IN (SELECT id FROM selected) AND r.rating BETWEEN 1 AND 5 GROUP BY v.product_id
 )
 SELECT jsonb_build_object('total',(SELECT total FROM meta),'page',(SELECT page FROM meta),'ids',coalesce((SELECT jsonb_agg(id ORDER BY id) FROM selected),'[]'::jsonb),'ratings',coalesce((SELECT jsonb_agg(to_jsonb(r)) FROM ratings r),'[]'::jsonb),
 'counts',jsonb_build_object('statTotalProducts',(SELECT count(*) FROM stock),'statInStockProducts',(SELECT count(*) FROM stock WHERE quantity>0),'statLowStockProducts',(SELECT count(*) FROM stock WHERE quantity>0 AND quantity<=minimum),'statOutStockProducts',(SELECT count(*) FROM stock WHERE quantity=0),'statTotalStockValue',(SELECT CASE WHEN bool_or(incomplete) THEN NULL ELSE coalesce(sum(value),0) END FROM stock))) INTO result;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.get_admin_sales_inventory_choices() RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('product.read') OR NOT pawpal_private.has_permission('product_variant.read') OR NOT pawpal_private.has_permission('inventory.read') THEN RAISE EXCEPTION 'sales_inventory_forbidden' USING ERRCODE='42501';END IF;
 RETURN (SELECT coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) FROM (
 SELECT v.id,v.sku_variant sku,p.product_name||' - '||v.sku_variant name,i.quantity_in_stock stock,i.minimum_stock "minStock",v.cost_price "costPrice",i.last_updated_at "lastUpdatedAt",v.status
 FROM public.product_variant v JOIN public.product p ON p.id=v.product_id LEFT JOIN public.inventory i ON i.product_variant_id=v.id ORDER BY p.product_name,v.id) v);
END $$;
REVOKE ALL ON FUNCTION public.search_admin_sales_customers(text),public.search_admin_sales_variants(text),public.get_admin_sales_product_page(text,text,text,integer),public.get_admin_sales_inventory_choices() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.search_admin_sales_customers(text),public.search_admin_sales_variants(text),public.get_admin_sales_product_page(text,text,text,integer),public.get_admin_sales_inventory_choices() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
