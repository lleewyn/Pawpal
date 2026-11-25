BEGIN;
CREATE OR REPLACE FUNCTION public.get_admin_sales_stock_history_page(p_product_id uuid,p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('product.read') OR NOT pawpal_private.has_permission('product_variant.read') OR NOT pawpal_private.has_permission('inventory_transaction.read') OR NOT pawpal_private.has_permission('staff.read') THEN RAISE EXCEPTION 'sales_stock_history_forbidden' USING ERRCODE='42501';END IF;
 IF p_product_id IS NULL OR p_page IS NULL OR p_page<1 OR p_page>10000000 THEN RAISE EXCEPTION 'invalid_stock_history_page' USING ERRCODE='22023';END IF;
 WITH ledger AS MATERIALIZED (
 SELECT t.id,t.product_variant_id,t.quantity,t.transaction_type,t.note,t.staff_id,t.created_at,t.recorded_at,t.idempotency_key,v.sku_variant,
 sum(t.quantity) OVER(PARTITION BY t.product_variant_id ORDER BY t.created_at,t.id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) after_stock
 FROM public.inventory_transaction t JOIN public.product_variant v ON v.id=t.product_variant_id WHERE v.product_id=p_product_id
 ), meta AS (SELECT count(*) total,least(p_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM ledger), selected AS (
 SELECT * FROM ledger ORDER BY created_at DESC,id DESC OFFSET ((SELECT page FROM meta)-1)*10 LIMIT 10
 )
 SELECT jsonb_build_object('total',(SELECT total FROM meta),'page',(SELECT page FROM meta),'rows',coalesce((SELECT jsonb_agg(jsonb_build_object(
 'id',t.id,'sku',t.sku_variant,'date',coalesce(t.recorded_at,t.created_at),'typeLabel',t.transaction_type,'change',CASE WHEN t.quantity>0 THEN '+' ELSE '' END||t.quantity::text,
 'beforeStock',t.after_stock-t.quantity,'afterStock',t.after_stock,'reason',coalesce(t.note,''),'refCode',t.idempotency_key,'staff',coalesce((SELECT full_name FROM public.staff WHERE id=t.staff_id),'Chưa ghi nhận')) ORDER BY t.created_at DESC,t.id DESC) FROM selected t),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_sales_stock_history_page(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_sales_stock_history_page(uuid,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
