BEGIN;
SET LOCAL statement_timeout='8s'; SET LOCAL lock_timeout='1s';
DROP FUNCTION IF EXISTS public.read_public_chat_catalog(text,text);
DROP INDEX IF EXISTS public.chat_public_product_name_idx;
DROP INDEX IF EXISTS public.chat_public_variant_sku_idx;
NOTIFY pgrst,'reload schema';

DROP FUNCTION IF EXISTS public.search_public_chat_context(uuid,text);
DROP INDEX IF EXISTS public.chatbot_public_faq_search_idx;
DROP FUNCTION IF EXISTS public.public_chat_faq_document(text,text,text[]);
DROP FUNCTION IF EXISTS public.public_chat_search_text(text);
-- Deploy the previous API together with rollback; old 143 context stays intact.
NOTIFY pgrst,'reload schema';

-- Restore the previous API/widget first. Original public operations are untouched.
BEGIN;
SET LOCAL lock_timeout='1s';
SET LOCAL statement_timeout='5s';
DROP FUNCTION public.read_public_chat_page(uuid,timestamptz,uuid);
DROP FUNCTION public.read_public_chat_part(uuid,uuid,integer,text);
NOTIFY pgrst,'reload schema';

DROP FUNCTION IF EXISTS public.read_public_chat_rules();
DROP FUNCTION IF EXISTS pawpal_private.admit_chat_server_read();
NOTIFY pgrst,'reload schema';
COMMIT;
