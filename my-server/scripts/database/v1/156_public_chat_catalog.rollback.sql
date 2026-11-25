BEGIN;
DROP FUNCTION IF EXISTS public.read_public_chat_catalog(text,text);
DROP INDEX IF EXISTS public.chat_public_product_name_idx;
DROP INDEX IF EXISTS public.chat_public_variant_sku_idx;
NOTIFY pgrst,'reload schema';
COMMIT;
