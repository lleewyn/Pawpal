BEGIN;
DROP FUNCTION IF EXISTS public.search_public_chat_context(uuid,text);
DROP INDEX IF EXISTS public.chatbot_public_faq_search_idx;
DROP FUNCTION IF EXISTS public.public_chat_faq_document(text,text,text[]);
DROP FUNCTION IF EXISTS public.public_chat_search_text(text);
-- Deploy the previous API together with rollback; old 143 context stays intact.
NOTIFY pgrst,'reload schema';
COMMIT;
