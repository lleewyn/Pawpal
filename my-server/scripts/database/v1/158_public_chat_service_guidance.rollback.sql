BEGIN;
CREATE OR REPLACE FUNCTION public.read_public_chat_catalog(p_kind text,p_query text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb; rows jsonb; q text:=public.public_chat_search_text(btrim(p_query));
BEGIN
 PERFORM pawpal_private.admit_chat_server_read();
 IF p_kind IS NULL OR p_kind NOT IN ('product','grooming_spa','pet_hotel','pet_taxi') OR p_query IS NULL OR length(p_query)>120
 OR (p_kind='product' AND length(q)<3) OR (p_kind<>'product' AND q<>'') THEN RAISE EXCEPTION 'invalid_public_catalog' USING ERRCODE='22023'; END IF;
 IF p_kind='product' THEN
 WITH candidates AS (
 SELECT v.id FROM public.product p JOIN public.product_variant v ON v.product_id=p.id
 WHERE lower(p.status)='active' AND lower(v.status)='active'
 AND to_tsvector('simple',public.public_chat_search_text(p.product_name)) @@ plainto_tsquery('simple',q)
 UNION
 SELECT v.id FROM public.product_variant v JOIN public.product p ON p.id=v.product_id
 WHERE lower(p.status)='active' AND lower(v.status)='active' AND public.public_chat_search_text(v.sku_variant)=q)
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY name,code),'[]') INTO rows FROM (
 SELECT left(p.product_name,200) name,left(v.sku_variant,120) code,v.sale_price price
 FROM public.product p JOIN public.product_variant v ON v.product_id=p.id
 WHERE lower(p.status)='active' AND lower(v.status)='active'
 AND v.id IN (SELECT id FROM candidates)
 ORDER BY p.product_name,v.sku_variant,v.id LIMIT 10) x;
 ELSIF p_kind='grooming_spa' THEN
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY code,weight_from,id),'[]') INTO rows FROM (
 SELECT p.id,left(s.service_name,200) name,left(s.service_code,120) code,p.weight_from,p.weight_to,p.unit_price price
 FROM public.service s JOIN public.service_category c ON c.id=s.category_id JOIN public.service_price_matrix p ON p.service_id=s.id
 WHERE s.status='active' AND c.category_code='grooming_spa' AND p.status='active'
 AND p.effective_from<=now() AND (p.effective_to IS NULL OR p.effective_to>now())
 ORDER BY s.service_code,p.weight_from,p.id LIMIT 10) x;
 ELSIF p_kind='pet_hotel' THEN
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY name,id),'[]') INTO rows FROM (
 SELECT id,left(room_type,200) name,daily_price price FROM public.hotel_room_type WHERE status='active' ORDER BY room_type,id LIMIT 10) x;
 ELSE
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY distance_from,weight_from,id),'[]') INTO rows FROM (
 SELECT id,'Pet Taxi'::text name,distance_from,distance_to,weight_from,weight_to,base_price price,surcharge
 FROM public.taxi_price_rule WHERE status='active' AND effective_from<=now() AND (effective_to IS NULL OR effective_to>now()) ORDER BY distance_from,weight_from,id LIMIT 10) x;
 END IF;
 -- Internal sorting IDs are never needed by the customer or model.
 SELECT coalesce(jsonb_agg(value-'id'),'[]') INTO rows FROM jsonb_array_elements(rows);
 result:=jsonb_build_object('kind',p_kind,'query',p_query,'items',rows,'as_of',clock_timestamp());
 IF octet_length(convert_to(result::text,'UTF8'))>16384 THEN RAISE EXCEPTION 'public_catalog_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_public_chat_catalog(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_public_chat_catalog(text,text) TO service_role;
NOTIFY pgrst,'reload schema';

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
