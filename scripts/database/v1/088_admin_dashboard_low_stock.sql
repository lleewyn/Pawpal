BEGIN;
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_low_stock()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('inventory.read') OR NOT pawpal_private.has_permission('product.read') OR NOT pawpal_private.has_permission('product_variant.read') THEN
  RAISE EXCEPTION 'dashboard_inventory_forbidden' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.product_id,'product_name',x.product_name,'status',x.status,'product_variant',jsonb_build_array(jsonb_build_object('id',x.id,'status',x.status,'sku_variant',x.sku_variant,'inventory',jsonb_build_object('quantity_in_stock',x.quantity_in_stock,'minimum_stock',x.minimum_stock)))) ORDER BY x.quantity_in_stock,x.ratio,x.sku_variant,x.id),'[]'::jsonb) INTO result
 FROM (
  SELECT v.id,v.product_id,p.product_name,v.status,v.sku_variant,i.quantity_in_stock,i.minimum_stock,
   CASE WHEN i.minimum_stock>0 THEN i.quantity_in_stock::numeric/i.minimum_stock ELSE 0 END ratio
  FROM public.inventory i JOIN public.product_variant v ON v.id=i.product_variant_id JOIN public.product p ON p.id=v.product_id
  WHERE upper(v.status) NOT IN ('INACTIVE','DISCONTINUED','NGUNG_BAN')
   AND (i.quantity_in_stock=0 OR (i.minimum_stock>0 AND i.quantity_in_stock<=i.minimum_stock))
  ORDER BY i.quantity_in_stock,ratio,v.sku_variant,v.id LIMIT 4
 ) x;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_dashboard_low_stock() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_low_stock() TO authenticated;
COMMIT;
