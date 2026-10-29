BEGIN;
-- Independent bounded reads; never fetch a whole price matrix into an API response.
CREATE OR REPLACE FUNCTION public.run_admin_chat_detail(p_lease uuid,p_tool text,p_filters jsonb,p_max_bytes integer DEFAULT 32768)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE allowed text[]; perm text; permissions text[]; q text; result jsonb; n bigint; selected_id uuid;
 body text; title text; state text; rev text; requested integer:=1; parts integer; category text; stmt text; weight numeric; distance numeric;
BEGIN
 IF p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR octet_length(p_filters::text)>2000 OR p_max_bytes IS NULL OR p_max_bytes NOT BETWEEN 1 AND 32768 THEN RAISE EXCEPTION 'invalid_detail_read' USING ERRCODE='22023'; END IF;
 CASE p_tool
 WHEN 'content.read' THEN allowed:=ARRAY['query','part','revision'];permissions:=ARRAY['blog_post.read'];
 WHEN 'review.read' THEN allowed:=ARRAY['query','part','revision'];permissions:=ARRAY['review.read'];
 WHEN 'catalog.price_rows' THEN allowed:=ARRAY['query','category','weight','distance','page'];permissions:=ARRAY['service.read','service_category.read'];
 ELSE RAISE EXCEPTION 'unsupported_detail_read' USING ERRCODE='22023';
 END CASE;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_filters) e WHERE NOT e.key=ANY(allowed) OR jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>120 OR (e.value#>>'{}') ~ '[[:cntrl:]]') THEN RAISE EXCEPTION 'invalid_detail_filter' USING ERRCODE='22023'; END IF;
 q:=trim(p_filters->>'query');
 IF q IS NULL OR length(q)<3 THEN RAISE EXCEPTION 'detail_query_required' USING ERRCODE='22023'; END IF;
 IF p_filters ? 'part' OR p_filters ? 'page' THEN
  IF coalesce(p_filters->>'part',p_filters->>'page') !~ '^[1-9][0-9]{0,4}$' THEN RAISE EXCEPTION 'invalid_detail_page' USING ERRCODE='22023'; END IF;
  requested:=coalesce(p_filters->>'part',p_filters->>'page')::integer;
  IF requested>10000 THEN RAISE EXCEPTION 'invalid_detail_page' USING ERRCODE='22023'; END IF;
 END IF;
 IF (p_filters ? 'revision' AND p_filters->>'revision' !~ '^[a-f0-9]{32}$') OR (p_tool<>'catalog.price_rows' AND requested>1 AND NOT p_filters ? 'revision') THEN RAISE EXCEPTION 'detail_revision_required' USING ERRCODE='22023'; END IF;
 IF p_filters ? 'category' AND p_filters->>'category' NOT IN ('grooming_spa','pet_taxi','pet_hotel') THEN RAISE EXCEPTION 'invalid_detail_category' USING ERRCODE='22023'; END IF;
 FOREACH perm IN ARRAY ARRAY['weight','distance'] LOOP
  IF p_filters ? perm THEN
   IF p_filters->>perm !~ '^[0-9]{1,5}(\.[0-9]{1,3})?$' OR (p_filters->>perm)::numeric>(CASE WHEN perm='weight' THEN 1000 ELSE 10000 END) THEN RAISE EXCEPTION 'invalid_price_range' USING ERRCODE='22023'; END IF;
  END IF;
 END LOOP;
 weight:=(p_filters->>'weight')::numeric;distance:=(p_filters->>'distance')::numeric;
 IF p_tool='catalog.price_rows' THEN
  category:=coalesce(p_filters->>'category','');
  IF category IN ('','grooming_spa') THEN permissions:=permissions||ARRAY['service_price_matrix.read']; END IF;
  IF category IN ('','pet_taxi') THEN permissions:=permissions||ARRAY['taxi_price_rule.read']; END IF;
  IF category IN ('','pet_hotel') THEN permissions:=permissions||ARRAY['hotel_room_type.read']; END IF;
 END IF;
 FOREACH perm IN ARRAY permissions LOOP
  IF NOT pawpal_private.has_permission(perm) THEN RAISE EXCEPTION 'detail_read_forbidden' USING ERRCODE='42501'; END IF;
 END LOOP;
 PERFORM pawpal_private.admit_chat_read_source(p_lease);
 IF p_tool='content.read' THEN
  SELECT count(*),min(b.id::text)::uuid INTO n,selected_id FROM public.blog_post b WHERE b.id::text=q OR b.slug=q OR public.admin_sales_search_text(b.title)=public.admin_sales_search_text(q);
 ELSIF p_tool='review.read' THEN
  SELECT count(*),min(id::text)::uuid INTO n,selected_id FROM public.review WHERE id::text=q;
 ELSE
  SELECT count(*),min(s.id::text)::uuid INTO n,selected_id FROM public.service s JOIN public.service_category c ON c.id=s.category_id
  WHERE s.status='active' AND (s.id::text=q OR s.service_code=q OR public.admin_sales_search_text(s.service_name)=public.admin_sales_search_text(q)) AND (category='' OR c.category_code=category);
 END IF;
 IF n<>1 THEN
  result:=jsonb_build_object('total',n,'items','[]'::jsonb,'ambiguous',n>1);
 ELSIF p_tool IN ('content.read','review.read') THEN
  IF p_tool='content.read' THEN SELECT b.content,b.title,b.status,md5(b.id::text||'/'||b.xmin::text||'/'||b.updated_at::text) INTO body,title,state,rev FROM public.blog_post b WHERE b.id=selected_id;
  ELSE SELECT coalesce(r.review_content,''),'Đánh giá '||r.rating||'/5',r.review_status,md5(r.id::text||'/'||r.xmin::text||'/'||r.updated_at::text) INTO body,title,state,rev FROM public.review r WHERE r.id=selected_id; END IF;
  parts:=greatest(1,ceil(length(body)/2000.0)::integer);
  IF parts>10000 THEN RAISE EXCEPTION 'detail_content_limit' USING ERRCODE='54000'; END IF;
  IF p_filters ? 'revision' AND rev<>p_filters->>'revision' THEN RAISE EXCEPTION 'detail_content_changed' USING ERRCODE='PT409'; END IF;
  IF requested>parts THEN RAISE EXCEPTION 'invalid_detail_part' USING ERRCODE='22023'; END IF;
  result:=jsonb_build_object('total',1,'items',jsonb_build_array(jsonb_build_object('code',selected_id,'name',left(title,400),'status',state,'body',substring(body FROM (requested-1)*2000+1 FOR 2000),'part',requested,'parts',parts,'revision',rev,'has_more',requested<parts)));
 ELSE
  SELECT c.category_code,s.service_name INTO category,title FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE s.id=selected_id;
  IF (category='grooming_spa' AND distance IS NOT NULL) OR (category='pet_hotel' AND (weight IS NOT NULL OR distance IS NOT NULL)) THEN RAISE EXCEPTION 'unsupported_price_condition' USING ERRCODE='22023'; END IF;
  IF category='grooming_spa' THEN
   stmt:=$q$ SELECT p.id::text key,p.weight_from sort1,0::numeric sort2,jsonb_build_object('code',p.id,'kind','service','name',$4,'weight_from',p.weight_from,'weight_to',p.weight_to,'price',p.unit_price) record FROM public.service_price_matrix p WHERE p.service_id=$1 AND p.status='active' AND p.effective_from<=now() AND (p.effective_to IS NULL OR p.effective_to>now()) AND ($2 IS NULL OR $2>=p.weight_from AND (p.weight_to IS NULL OR $2<p.weight_to)) $q$;
  ELSIF category='pet_taxi' THEN
   stmt:=$q$ SELECT p.id::text key,p.distance_from sort1,p.weight_from sort2,jsonb_build_object('code',p.id,'kind','taxi','name',$4,'weight_from',p.weight_from,'weight_to',p.weight_to,'distance_from',p.distance_from,'distance_to',p.distance_to,'price',p.base_price,'surcharge',p.surcharge) record FROM public.taxi_price_rule p WHERE p.status='active' AND p.effective_from<=now() AND (p.effective_to IS NULL OR p.effective_to>now()) AND ($2 IS NULL OR $2>=p.weight_from AND (p.weight_to IS NULL OR $2<p.weight_to)) AND ($3 IS NULL OR $3>=p.distance_from AND (p.distance_to IS NULL OR $3<p.distance_to)) $q$;
  ELSIF category='pet_hotel' THEN
   stmt:=$q$ SELECT p.id::text key,0::numeric sort1,0::numeric sort2,jsonb_build_object('code',p.id,'kind','hotel','name',p.room_type,'price',p.daily_price) record FROM public.hotel_room_type p WHERE p.status='active' $q$;
  ELSE RAISE EXCEPTION 'unsupported_price_category' USING ERRCODE='22023'; END IF;
  EXECUTE 'WITH matched AS NOT MATERIALIZED ('||stmt||'), bounds AS MATERIALIZED (SELECT count(*) total,least($5,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched), rows AS (SELECT record FROM matched ORDER BY sort1,sort2,key LIMIT 10 OFFSET (SELECT (page-1)*10 FROM bounds)) SELECT jsonb_build_object(''total'',total,''page'',page,''pages'',greatest(1,ceil(total/10.0)::integer),''items'',coalesce((SELECT jsonb_agg(record) FROM rows),''[]''::jsonb)) FROM bounds'
  INTO result USING selected_id,weight,distance,title,requested;
 END IF;
 result:=result||jsonb_build_object('intent',p_tool,'scope',p_filters,'source','Supabase / caller RLS','as_of',clock_timestamp(),'limitations',CASE WHEN p_tool='catalog.price_rows' THEN jsonb_build_array('Các khoảng tính từ cận dưới đến trước cận trên; bảng giá đang hiệu lực hiện tại, chưa phải báo giá cho một lịch hẹn cụ thể.','Khách sạn theo loại phòng, taxi theo quy tắc chung; không suy ra phụ phí hoặc điều kiện ngoài dữ liệu trả về.') ELSE jsonb_build_array('Nội dung gốc được đọc từng phần tối đa 2000 ký tự, giữ phiên bản; chỉ là phần đang hiển thị, chưa phải toàn bộ nội dung.') END);
 IF octet_length(convert_to(result::text,'UTF8'))>p_max_bytes THEN RAISE EXCEPTION 'chat_read_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.run_admin_chat_detail(uuid,text,jsonb,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.run_admin_chat_detail(uuid,text,jsonb,integer) TO authenticated;
-- Persist the small, closed continuation token in the existing exchange write.
-- Service only, same ownership/idempotency rules as save_admin_copilot_exchange.
CREATE OR REPLACE FUNCTION public.save_admin_copilot_detail(p_actor uuid,p_request uuid,p_session uuid,p_question text,p_answer text,p_title text,p_next text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE actor uuid; existing public.admin_copilot_history; answer text;
BEGIN
 IF p_next IS NULL OR length(p_next)>240 OR p_next !~ '^(Nội dung bài viết|Nội dung đánh giá): [0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12} phần [1-9][0-9]{0,4} bản [a-f0-9]{32}$' THEN RAISE EXCEPTION 'invalid_detail_continuation' USING ERRCODE='22023'; END IF;
 SELECT s.id INTO actor FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id WHERE s.auth_user_id=p_actor AND s.employment_status='active' AND NOT s.must_change_password AND (u.banned_until IS NULL OR u.banned_until<=now())
 AND (EXISTS(SELECT 1 FROM public.staff_role sr JOIN public.role_permission rp ON rp.role_code=sr.role_code WHERE sr.staff_id=s.id AND rp.permission_code='admin_copilot_history.write') OR EXISTS(SELECT 1 FROM public.staff_permission sp WHERE sp.staff_id=s.id AND sp.permission_code='admin_copilot_history.write'));
 IF actor IS NULL THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_session IS NULL OR coalesce(length(btrim(p_question)),0) NOT BETWEEN 1 AND 2000 OR coalesce(length(btrim(p_answer)),0) NOT BETWEEN 1 AND 16000 THEN RAISE EXCEPTION 'invalid_copilot_exchange' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,50));
 SELECT * INTO existing FROM public.admin_copilot_history WHERE id=p_request;
 IF FOUND THEN
  IF existing.staff_id<>actor OR existing.session_id<>p_session OR existing.content<>p_question THEN RAISE EXCEPTION 'copilot_request_conflict' USING ERRCODE='PT409'; END IF;
  SELECT h.content INTO answer FROM public.admin_copilot_history h WHERE h.staff_id=actor AND h.metadata->>'request_id'=p_request::text AND h.role='assistant';
  RETURN answer;
 END IF;
 INSERT INTO public.admin_copilot_history(id,session_id,staff_id,role,content,metadata,created_at) VALUES(p_request,p_session,actor,'user',p_question,jsonb_build_object('session_title',left(p_title,100)),clock_timestamp());
 INSERT INTO public.admin_copilot_history(session_id,staff_id,role,content,metadata,created_at) VALUES(p_session,actor,'assistant',p_answer,jsonb_build_object('session_title',left(p_title,100),'request_id',p_request,'continuation',jsonb_build_object('type','ask_question','question',p_next)),clock_timestamp());
 RETURN p_answer;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_copilot_detail(uuid,uuid,uuid,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_admin_copilot_detail(uuid,uuid,uuid,text,text,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
