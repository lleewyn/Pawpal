BEGIN;
-- Pure text folding; no table access or Admin privileges.
CREATE OR REPLACE FUNCTION public.public_chat_search_text(p_value text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog AS $$
 SELECT replace(regexp_replace(normalize(lower(coalesce(p_value,'')),NFD),U&'[\0300-\036f]','','g'),U&'\0111','d');
$$;
REVOKE ALL ON FUNCTION public.public_chat_search_text(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.public_chat_search_text(text) TO authenticated,service_role;
CREATE OR REPLACE FUNCTION public.public_chat_faq_document(p_question text,p_answer text,p_keywords text[])
RETURNS tsvector LANGUAGE plpgsql IMMUTABLE PARALLEL SAFE SET search_path=pg_catalog,public AS $$
DECLARE document text:=coalesce(p_question,'')||' '||coalesce(p_answer,''); word text;
BEGIN
 FOREACH word IN ARRAY coalesce(p_keywords,'{}'::text[]) LOOP document:=document||' '||coalesce(word,''); END LOOP;
 RETURN to_tsvector('simple',public.public_chat_search_text(document));
END $$;
REVOKE ALL ON FUNCTION public.public_chat_faq_document(text,text,text[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.public_chat_faq_document(text,text,text[]) TO authenticated,service_role;
CREATE INDEX IF NOT EXISTS chatbot_public_faq_search_idx ON public.chatbot_knowledge_faq
USING gin (public.public_chat_faq_document(question,answer,keywords)) WHERE is_active;
CREATE OR REPLACE FUNCTION public.search_public_chat_context(p_conversation uuid,p_question text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb; terms text; search tsquery; faq jsonb; recent jsonb; incomplete boolean;
BEGIN
 PERFORM pawpal_private.admit_chat_server_read();
 IF p_conversation IS NULL OR NOT EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=p_conversation)
 OR p_question IS NULL OR length(btrim(p_question)) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'invalid_public_search' USING ERRCODE='22023'; END IF;
 SELECT string_agg(word,' | ' ORDER BY word) INTO terms FROM (
 SELECT DISTINCT word FROM unnest(regexp_split_to_array(public.public_chat_search_text(p_question),'[^a-z0-9]+')) word
 WHERE length(word) BETWEEN 3 AND 40 AND word NOT IN ('toi','ban','minh','cho','cua','nao','nhu','the','voi','duoc','khong','pawpal','hoi','muon','biet','thong','tin') ORDER BY word LIMIT 12) t;
 search:=to_tsquery('simple',coalesce(terms,''));
 SELECT coalesce(jsonb_agg(jsonb_build_object('question',left(question,300),'answer',left(answer,1600)) ORDER BY exact_match DESC,score DESC,priority DESC,id),'[]'),coalesce(bool_or(length(question)>300 OR length(answer)>1600),false) INTO faq,incomplete FROM (
 SELECT id,question,answer,priority,public.public_chat_search_text(question)=public.public_chat_search_text(p_question) exact_match,ts_rank_cd(public.public_chat_faq_document(question,answer,keywords),search) score
 FROM public.chatbot_knowledge_faq WHERE is_active AND btrim(coalesce(answer,''))<>''
 AND public.public_chat_faq_document(question,answer,keywords) @@ search
 ORDER BY exact_match DESC,score DESC,priority DESC,id LIMIT 5) f;
 -- Never let multibyte FAQ content consume the entire history/model budget.
 WHILE octet_length(convert_to(faq::text,'UTF8'))>16000 LOOP incomplete:=true;faq:=faq-(jsonb_array_length(faq)-1); END LOOP;
 SELECT coalesce(jsonb_agg(jsonb_build_object('sender_type',sender_type,'content',left(content,1000)) ORDER BY created_at DESC,id DESC),'[]') INTO recent FROM (
 SELECT id,sender_type,content,created_at FROM public.chat_message WHERE conversation_id=p_conversation ORDER BY created_at DESC,id DESC LIMIT 8) m;
 result:=jsonb_build_object('faq',faq,'recent',recent,'incomplete',incomplete);
 WHILE octet_length(convert_to(result::text,'UTF8'))>32768 AND jsonb_array_length(recent)>0 LOOP
 recent:=recent-(jsonb_array_length(recent)-1);result:=jsonb_build_object('faq',faq,'recent',recent,'incomplete',incomplete);
 END LOOP;
 IF octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'public_search_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.search_public_chat_context(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.search_public_chat_context(uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
