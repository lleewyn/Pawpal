BEGIN;

-- Keep the detail projection identical to the public catalog while applying
-- the product filter before stock, reviews and media are gathered.
DO $migration$
DECLARE
    definition text := pg_get_functiondef('public.customer_shop_catalog()'::regprocedure);
    original_name constant text := 'FUNCTION public.customer_shop_catalog()';
    original_filter constant text := 'WHERE p.status=''active''';
BEGIN
    IF position(original_name in definition) = 0
       OR (length(definition) - length(replace(definition, original_filter, ''))) <> length(original_filter) THEN
        RAISE EXCEPTION 'Unexpected customer_shop_catalog definition';
    END IF;
    EXECUTE replace(replace(definition, original_name,
        'FUNCTION public.customer_shop_product(p_product uuid)'),
        original_filter, original_filter || ' AND p.id = p_product');
    EXECUTE replace(replace(definition, original_name,
        'FUNCTION public.customer_shop_cart_products(p_variants uuid[])'),
        original_filter, original_filter || '
          AND cardinality(p_variants) BETWEEN 1 AND 100
          AND p.id IN (
              SELECT v.product_id FROM public.product_variant v
              WHERE v.id = ANY(p_variants) AND v.status = ''active'' AND NOT v.catalog_retired
          )');
END;
$migration$;

REVOKE ALL ON FUNCTION public.customer_shop_product(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_shop_product(uuid) TO anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_shop_cart_products(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_shop_cart_products(uuid[]) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';

COMMIT;
