BEGIN;
CREATE OR REPLACE FUNCTION public.admin_copilot_extended_facts(p_intent text,p_filters jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; query_text text:=btrim(coalesce(p_filters->>'query','')); start_at timestamptz; end_at timestamptz; required text; category text:=coalesce(p_filters->>'category',''); guidance jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('admin_copilot_history.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
 IF p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR length(p_filters::text)>4000 OR length(query_text)>120 THEN RAISE EXCEPTION 'invalid_copilot_filter' USING ERRCODE='22023'; END IF;
 IF p_intent='revenue.summary' THEN
  IF NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('refund_transaction.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  start_at:=nullif(p_filters->>'start_at','')::timestamptz;end_at:=nullif(p_filters->>'end_at','')::timestamptz;
  IF start_at IS NULL OR end_at IS NULL OR NOT isfinite(start_at) OR NOT isfinite(end_at) OR end_at<=start_at OR end_at>start_at+interval '32 days' THEN RAISE EXCEPTION 'invalid_copilot_date_range' USING ERRCODE='22023'; END IF;
  WITH collected AS (SELECT count(*) count,coalesce(sum(amount),0) amount FROM public.payment WHERE transaction_status='succeeded' AND succeeded_at>=start_at AND succeeded_at<end_at),
  refunded AS (SELECT coalesce(sum(refunded_amount),0) amount FROM public.refund_transaction WHERE refund_status='succeeded' AND completed_at>=start_at AND completed_at<end_at)
  SELECT jsonb_build_object('total',c.count,'items','[]'::jsonb,'collected',c.amount,'refunded',r.amount,'net',c.amount-r.amount,'source','payment, refund_transaction') INTO result FROM collected c CROSS JOIN refunded r;
 ELSIF p_intent='knowledge.search' THEN
  IF NOT pawpal_private.has_permission('chatbot_knowledge_faq.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  IF length(query_text)<3 THEN RAISE EXCEPTION 'copilot_query_required' USING ERRCODE='22023'; END IF;
  WITH terms AS (
   SELECT DISTINCT word FROM unnest(regexp_split_to_array(public.admin_sales_search_text(query_text),'[^a-z0-9]+')) word
   WHERE length(word)>=3 AND word NOT IN ('toi','ban','nhung','nhieu','nao','nhu','the','cho','cua','khong','hien','tai','voi','trong','duoc') LIMIT 15
  ), scored AS (
   SELECT f.question,left(f.answer,3000) answer,f.priority,f.id,
    (SELECT coalesce(sum(CASE WHEN strpos(public.admin_sales_search_text(f.question||' '||coalesce(f.keywords::text,'')),word)>0 THEN 3 WHEN strpos(public.admin_sales_search_text(f.answer),word)>0 THEN 1 ELSE 0 END),0) FROM terms) score
   FROM public.chatbot_knowledge_faq f WHERE is_active
  ), matched AS MATERIALIZED (SELECT * FROM scored WHERE score>0)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(jsonb_build_object('question',question,'answer',answer) ORDER BY score DESC,priority DESC,id) FROM (SELECT * FROM matched ORDER BY score DESC,priority DESC,id LIMIT 5) x),'[]'::jsonb),'source','chatbot_knowledge_faq','limitations',CASE WHEN NOT EXISTS(SELECT 1 FROM matched) THEN 'Chưa tìm thấy thông tin phù hợp trong kho tri thức đang bật. Bạn vui lòng nêu cụ thể dịch vụ hoặc vấn đề cần tra cứu.' ELSE '' END) INTO result;
 ELSIF p_intent='catalog.service_price' THEN
  FOREACH required IN ARRAY ARRAY['service.read','service_category.read'] LOOP
   IF NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  END LOOP;
  IF category NOT IN ('','grooming_spa','pet_taxi','pet_hotel') THEN RAISE EXCEPTION 'invalid_copilot_filter' USING ERRCODE='22023'; END IF;
  IF (category IN ('','grooming_spa') AND NOT pawpal_private.has_permission('service_price_matrix.read')) OR (category IN ('','pet_taxi') AND NOT pawpal_private.has_permission('taxi_price_rule.read')) OR (category IN ('','pet_hotel') AND NOT pawpal_private.has_permission('hotel_room_type.read')) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  WITH matched AS MATERIALIZED (
   SELECT s.id,s.service_code code,s.service_name name,c.category_code category FROM public.service s JOIN public.service_category c ON c.id=s.category_id
   WHERE s.status='active' AND (category='' OR c.category_code=category)
    AND (query_text='' OR strpos(public.admin_sales_search_text(s.service_name||' '||s.service_code),public.admin_sales_search_text(query_text))>0)
  ), selected AS (SELECT * FROM matched ORDER BY code LIMIT 20), priced AS (
   SELECT s.code,s.name,CASE s.category
    WHEN 'grooming_spa' THEN coalesce((SELECT jsonb_agg(jsonb_build_object('kind','service','weight_from',p.weight_from,'weight_to',p.weight_to,'price',p.unit_price) ORDER BY p.weight_from,p.id) FROM public.service_price_matrix p WHERE p.service_id=s.id AND p.status='active' AND p.effective_from<=now() AND (p.effective_to IS NULL OR p.effective_to>now())),'[]'::jsonb)
    WHEN 'pet_taxi' THEN coalesce((SELECT jsonb_agg(jsonb_build_object('kind','taxi','distance_from',p.distance_from,'distance_to',p.distance_to,'weight_from',p.weight_from,'weight_to',p.weight_to,'price',p.base_price,'surcharge',p.surcharge) ORDER BY p.distance_from,p.weight_from,p.id) FROM public.taxi_price_rule p WHERE p.status='active' AND p.effective_from<=now() AND (p.effective_to IS NULL OR p.effective_to>now())),'[]'::jsonb)
    WHEN 'pet_hotel' THEN coalesce((SELECT jsonb_agg(jsonb_build_object('kind','hotel','name',p.room_type,'price',p.daily_price) ORDER BY p.room_type,p.id) FROM public.hotel_room_type p WHERE p.status='active'),'[]'::jsonb)
    ELSE '[]'::jsonb END prices FROM selected s
  ) SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY code) FROM priced p),'[]'::jsonb),'source','service, service_price_matrix, taxi_price_rule, hotel_room_type','limitations','Mức giá áp dụng theo điều kiện cân nặng, cự ly hoặc loại phòng đang cấu hình; chưa phải báo giá cho một lịch hẹn cụ thể.') INTO result;
  IF category='pet_taxi' AND pawpal_private.has_permission('chatbot_knowledge_faq.read') THEN
   SELECT jsonb_agg(jsonb_build_object('question',question,'answer',left(answer,1600))) INTO guidance FROM (SELECT question,answer FROM public.chatbot_knowledge_faq WHERE is_active AND public.admin_sales_search_text(question||' '||answer) LIKE '%taxi%' AND public.admin_sales_search_text(question||' '||answer) LIKE '%hai chieu%' ORDER BY priority DESC,id LIMIT 3) f;
   result:=result||jsonb_build_object('guidance',coalesce(guidance,'[]'::jsonb));
  END IF;
 ELSE RAISE EXCEPTION 'unsupported_copilot_intent' USING ERRCODE='22023'; END IF;
 RETURN result||jsonb_build_object('intent',p_intent,'scope',p_filters,'as_of',now(),'time_zone','Asia/Ho_Chi_Minh');
END $$;
REVOKE ALL ON FUNCTION public.admin_copilot_extended_facts(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_copilot_extended_facts(text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
