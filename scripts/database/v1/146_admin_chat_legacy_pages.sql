BEGIN;
-- Bounded paging of existing reads. Same caller permissions, source slots and formulas.
CREATE OR REPLACE FUNCTION public.run_admin_chat_page(p_lease uuid,p_tool text,p_filters jsonb,p_max_bytes integer DEFAULT 32768)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb; start_at timestamptz; end_at timestamptz; query_text text:=btrim(coalesce(p_filters->>'query','')); required text; category text:=coalesce(p_filters->>'category',''); guidance jsonb;
 p_intent text:=p_tool; allowed text[]; row_limit integer; requested_page integer:=1;
BEGIN
 IF p_max_bytes IS NULL OR p_max_bytes NOT BETWEEN 1 AND 32768 OR p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR octet_length(p_filters::text)>2000 THEN RAISE EXCEPTION 'invalid_chat_read' USING ERRCODE='22023'; END IF;
 CASE p_tool
 WHEN 'appointment.list' THEN allowed:=ARRAY['start_at','end_at','status','category'];row_limit:=20;
 WHEN 'inventory.low_stock' THEN allowed:=ARRAY['query'];row_limit:=20;
 WHEN 'ticket.open' THEN allowed:=ARRAY['start_at','end_at'];row_limit:=20;
 WHEN 'customer.lookup','order.lookup' THEN allowed:=ARRAY['query'];row_limit:=10;
 WHEN 'catalog.product','catalog.service' THEN allowed:=ARRAY['query'];row_limit:=20;
 WHEN 'catalog.service_price' THEN allowed:=ARRAY['query','category'];row_limit:=20;
 WHEN 'revenue.summary' THEN allowed:=ARRAY['start_at','end_at'];row_limit:=0;
 WHEN 'knowledge.search' THEN allowed:=ARRAY['query'];row_limit:=5;
 WHEN 'conversation.context' THEN allowed:=ARRAY['conversationId'];row_limit:=12;
 WHEN 'history.context' THEN allowed:=ARRAY['sessionId'];row_limit:=6;
 ELSE RAISE EXCEPTION 'unsupported_chat_read' USING ERRCODE='22023';
 END CASE;
 IF p_tool NOT IN ('appointment.list','inventory.low_stock','ticket.open','customer.lookup','order.lookup','catalog.product','catalog.service','catalog.service_price') THEN RAISE EXCEPTION 'unsupported_chat_page' USING ERRCODE='22023'; END IF;
 allowed:=allowed||ARRAY['page'];
 IF p_filters ? 'page' THEN
  IF p_filters->>'page' !~ '^[1-9][0-9]{0,4}$' THEN RAISE EXCEPTION 'invalid_chat_page' USING ERRCODE='22023'; END IF;
  requested_page:=(p_filters->>'page')::integer;
  IF requested_page>10000 THEN RAISE EXCEPTION 'invalid_chat_page' USING ERRCODE='22023'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_filters) e WHERE NOT e.key=ANY(allowed) OR jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>120) THEN RAISE EXCEPTION 'invalid_chat_read_filter' USING ERRCODE='22023'; END IF;
 IF (p_filters ? 'category' AND p_filters->>'category' NOT IN ('grooming_spa','pet_hotel','pet_taxi'))
 OR (p_filters ? 'status' AND p_filters->>'status' NOT IN ('pending','confirmed','checked_in','in_progress','completed','cancelled','no_show'))
 OR (p_tool IN ('customer.lookup','order.lookup','knowledge.search') AND coalesce(length(trim(p_filters->>'query')),0)<3)
 OR (p_tool IN ('appointment.list','revenue.summary') AND NOT (p_filters ? 'start_at' AND p_filters ? 'end_at'))
 OR (p_tool='conversation.context' AND coalesce(p_filters->>'conversationId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
 OR (p_tool='history.context' AND coalesce(p_filters->>'sessionId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN RAISE EXCEPTION 'invalid_chat_read_filter' USING ERRCODE='22023'; END IF;
 IF p_filters ? 'start_at' OR p_filters ? 'end_at' THEN
  IF p_filters->>'start_at' IS NULL OR p_filters->>'end_at' IS NULL OR NOT isfinite((p_filters->>'start_at')::timestamptz) OR NOT isfinite((p_filters->>'end_at')::timestamptz)
  OR (p_filters->>'end_at')::timestamptz<=(p_filters->>'start_at')::timestamptz OR (p_filters->>'end_at')::timestamptz>(p_filters->>'start_at')::timestamptz+interval '31 days' THEN RAISE EXCEPTION 'invalid_chat_read_period' USING ERRCODE='22023'; END IF;
 END IF;
 PERFORM pawpal_private.admit_chat_read_source(p_lease);
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('admin_copilot_history.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
 IF p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR length(p_filters::text)>4000 OR length(query_text)>120 THEN RAISE EXCEPTION 'invalid_copilot_filter' USING ERRCODE='22023'; END IF;
 IF p_intent IN ('appointment.list','ticket.open') THEN
  start_at:=nullif(p_filters->>'start_at','')::timestamptz;end_at:=nullif(p_filters->>'end_at','')::timestamptz;
  IF start_at IS NOT NULL AND (end_at IS NULL OR NOT isfinite(start_at) OR NOT isfinite(end_at) OR end_at<=start_at OR end_at>start_at+interval '32 days') THEN RAISE EXCEPTION 'invalid_copilot_date_range' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_intent='appointment.list' THEN
  FOREACH required IN ARRAY ARRAY['appointment.read','appointment_item.read','service.read','service_category.read'] LOOP
   IF NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  END LOOP;
  IF start_at IS NULL OR (p_filters->>'status' IS NOT NULL AND p_filters->>'status' NOT IN ('pending','confirmed','checked_in','in_progress','completed','cancelled','no_show'))
   OR (p_filters->>'category' IS NOT NULL AND p_filters->>'category' NOT IN ('grooming_spa','pet_hotel','pet_taxi')) THEN RAISE EXCEPTION 'invalid_copilot_filter' USING ERRCODE='22023'; END IF;
  WITH matched AS NOT MATERIALIZED (
   SELECT a.id,a.appointment_code code,a.appointment_status status,a.scheduled_start_at scheduled_at,
    coalesce((SELECT string_agg(DISTINCT s.service_name,', ' ORDER BY s.service_name) FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id WHERE i.appointment_id=a.id AND i.status<>'cancelled'),'') services
   FROM public.appointment a WHERE a.scheduled_start_at>=start_at AND a.scheduled_start_at<end_at
    AND (p_filters->>'status' IS NULL OR a.appointment_status=p_filters->>'status')
    AND (p_filters->>'category' IS NULL OR EXISTS(SELECT 1 FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id JOIN public.service_category c ON c.id=s.category_id WHERE i.appointment_id=a.id AND i.status<>'cancelled' AND c.category_code=p_filters->>'category'))
  ), page_bounds AS MATERIALIZED (SELECT count(*) total,least(requested_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched) SELECT jsonb_build_object('total',(SELECT total FROM page_bounds),'items',coalesce((SELECT jsonb_agg(to_jsonb(x)-'id' ORDER BY x.scheduled_at,x.code) FROM (SELECT * FROM matched ORDER BY scheduled_at,code LIMIT 10 OFFSET (SELECT (page-1)*10 FROM page_bounds)) x),'[]'::jsonb),'source','appointment, appointment_item, service, service_category') INTO result;
 ELSIF p_intent='inventory.low_stock' THEN
  FOREACH required IN ARRAY ARRAY['inventory.read','product_variant.read','product.read'] LOOP
   IF NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  END LOOP;
  WITH matched AS NOT MATERIALIZED (
   SELECT v.sku_variant sku,p.product_name name,i.quantity_in_stock stock,i.minimum_stock minimum
   FROM public.inventory i JOIN public.product_variant v ON v.id=i.product_variant_id JOIN public.product p ON p.id=v.product_id
   WHERE p.status='active' AND v.status='active' AND NOT v.catalog_retired AND i.quantity_in_stock<i.minimum_stock
    AND (query_text='' OR strpos(lower(v.sku_variant||' '||p.product_name),lower(query_text))>0)
  ), page_bounds AS MATERIALIZED (SELECT count(*) total,least(requested_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched) SELECT jsonb_build_object('total',(SELECT total FROM page_bounds),'items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.stock,x.sku) FROM (SELECT * FROM matched ORDER BY stock,sku LIMIT 10 OFFSET (SELECT (page-1)*10 FROM page_bounds)) x),'[]'::jsonb),'source','inventory, product_variant, product','condition','quantity_in_stock < minimum_stock; chỉ SKU đang bán') INTO result;
 ELSIF p_intent='ticket.open' THEN
  IF NOT pawpal_private.has_permission('support_ticket.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  WITH matched AS NOT MATERIALIZED (
   SELECT ticket_code code,subject,status,priority,created_at FROM public.support_ticket
   WHERE status NOT IN ('completed','resolved','closed','rejected','cancelled') AND (start_at IS NULL OR created_at>=start_at AND created_at<end_at)
  ), page_bounds AS MATERIALIZED (SELECT count(*) total,least(requested_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched) SELECT jsonb_build_object('total',(SELECT total FROM page_bounds),'items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.code) FROM (SELECT * FROM matched ORDER BY created_at,code LIMIT 10 OFFSET (SELECT (page-1)*10 FROM page_bounds)) x),'[]'::jsonb),'source','support_ticket','condition','Phiếu chưa kết thúc; giới hạn ngày tạo nếu được yêu cầu') INTO result;
 ELSIF p_intent='customer.lookup' THEN
  FOREACH required IN ARRAY ARRAY['customer.read','customer_profile.read','customer_phone.read'] LOOP
   IF NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  END LOOP;
  IF length(query_text)<3 THEN RAISE EXCEPTION 'copilot_query_required' USING ERRCODE='22023'; END IF;
  WITH matched AS NOT MATERIALIZED (
   SELECT c.customer_code code,p.full_name name,c.customer_status status,
    (SELECT phone_number FROM public.customer_phone WHERE customer_id=c.id AND is_primary LIMIT 1) phone
   FROM public.customer c LEFT JOIN public.customer_profile p ON p.customer_id=c.id
   WHERE strpos(lower(c.customer_code||' '||coalesce(p.full_name,'')),lower(query_text))>0
    OR EXISTS(SELECT 1 FROM public.customer_phone cp WHERE cp.customer_id=c.id AND strpos(cp.phone_number,query_text)>0)
  ), page_bounds AS MATERIALIZED (SELECT count(*) total,least(requested_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched) SELECT jsonb_build_object('total',(SELECT total FROM page_bounds),'items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.code) FROM (SELECT * FROM matched ORDER BY code LIMIT 10 OFFSET (SELECT (page-1)*10 FROM page_bounds)) x),'[]'::jsonb),'source','customer, customer_profile, customer_phone') INTO result;
 ELSIF p_intent='order.lookup' THEN
  IF NOT pawpal_private.has_permission('sales_order.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  IF length(query_text)<3 THEN RAISE EXCEPTION 'copilot_query_required' USING ERRCODE='22023'; END IF;
  WITH matched AS NOT MATERIALIZED (
   SELECT order_code code,order_status status,shipping_status,tracking_code,created_at FROM public.sales_order WHERE strpos(lower(order_code),lower(query_text))>0
  ), page_bounds AS MATERIALIZED (SELECT count(*) total,least(requested_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched) SELECT jsonb_build_object('total',(SELECT total FROM page_bounds),'items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC,x.code) FROM (SELECT * FROM matched ORDER BY created_at DESC,code LIMIT 10 OFFSET (SELECT (page-1)*10 FROM page_bounds)) x),'[]'::jsonb),'source','sales_order') INTO result;
 ELSIF p_intent='catalog.service' THEN
  IF NOT pawpal_private.has_permission('service.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  WITH matched AS NOT MATERIALIZED (SELECT service_code code,service_name name,left(description,600) description,status FROM public.service WHERE status='active' AND (query_text='' OR strpos(lower(service_code||' '||service_name),lower(query_text))>0)), page_bounds AS MATERIALIZED (SELECT count(*) total,least(requested_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched) SELECT jsonb_build_object('total',(SELECT total FROM page_bounds),'items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.code) FROM (SELECT * FROM matched ORDER BY code LIMIT 10 OFFSET (SELECT (page-1)*10 FROM page_bounds)) x),'[]'::jsonb),'source','service','limitations','Không báo giá từ mô tả; cần chọn đúng biến thể khi đặt lịch.') INTO result;
 ELSIF p_intent='catalog.product' THEN
  IF NOT pawpal_private.has_permission('product.read') OR NOT pawpal_private.has_permission('product_variant.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  WITH matched AS NOT MATERIALIZED (
   SELECT p.product_code code,p.product_name name,v.sku_variant sku,v.variant_name variant,v.sale_price price
   FROM public.product p JOIN public.product_variant v ON v.product_id=p.id WHERE p.status='active' AND v.status='active' AND NOT v.catalog_retired
    AND (query_text='' OR strpos(lower(p.product_name||' '||v.sku_variant),lower(query_text))>0)
  ), page_bounds AS MATERIALIZED (SELECT count(*) total,least(requested_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched) SELECT jsonb_build_object('total',(SELECT total FROM page_bounds),'items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.sku) FROM (SELECT * FROM matched ORDER BY sku LIMIT 10 OFFSET (SELECT (page-1)*10 FROM page_bounds)) x),'[]'::jsonb),'source','product, product_variant','unit','SKU') INTO result;
 ELSIF p_intent='catalog.service_price' THEN
  FOREACH required IN ARRAY ARRAY['service.read','service_category.read'] LOOP
   IF NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  END LOOP;
  IF category NOT IN ('','grooming_spa','pet_taxi','pet_hotel') THEN RAISE EXCEPTION 'invalid_copilot_filter' USING ERRCODE='22023'; END IF;
  IF (category IN ('','grooming_spa') AND NOT pawpal_private.has_permission('service_price_matrix.read')) OR (category IN ('','pet_taxi') AND NOT pawpal_private.has_permission('taxi_price_rule.read')) OR (category IN ('','pet_hotel') AND NOT pawpal_private.has_permission('hotel_room_type.read')) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  WITH matched AS NOT MATERIALIZED (
   SELECT s.id,s.service_code code,s.service_name name,c.category_code category FROM public.service s JOIN public.service_category c ON c.id=s.category_id
   WHERE s.status='active' AND (category='' OR c.category_code=category)
    AND (query_text='' OR strpos(public.admin_sales_search_text(s.service_name||' '||s.service_code),public.admin_sales_search_text(query_text))>0)
  ), page_bounds AS MATERIALIZED (SELECT count(*) total,least(requested_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched), selected AS (SELECT * FROM matched ORDER BY code LIMIT 10 OFFSET (SELECT (page-1)*10 FROM page_bounds)), priced AS (
   SELECT s.code,s.name,CASE s.category
    WHEN 'grooming_spa' THEN coalesce((SELECT jsonb_agg(jsonb_build_object('kind','service','weight_from',p.weight_from,'weight_to',p.weight_to,'price',p.unit_price) ORDER BY p.weight_from,p.id) FROM public.service_price_matrix p WHERE p.service_id=s.id AND p.status='active' AND p.effective_from<=now() AND (p.effective_to IS NULL OR p.effective_to>now())),'[]'::jsonb)
    WHEN 'pet_taxi' THEN coalesce((SELECT jsonb_agg(jsonb_build_object('kind','taxi','distance_from',p.distance_from,'distance_to',p.distance_to,'weight_from',p.weight_from,'weight_to',p.weight_to,'price',p.base_price,'surcharge',p.surcharge) ORDER BY p.distance_from,p.weight_from,p.id) FROM public.taxi_price_rule p WHERE p.status='active' AND p.effective_from<=now() AND (p.effective_to IS NULL OR p.effective_to>now())),'[]'::jsonb)
    WHEN 'pet_hotel' THEN coalesce((SELECT jsonb_agg(jsonb_build_object('kind','hotel','name',p.room_type,'price',p.daily_price) ORDER BY p.room_type,p.id) FROM public.hotel_room_type p WHERE p.status='active'),'[]'::jsonb)
    ELSE '[]'::jsonb END prices FROM selected s
  ) SELECT jsonb_build_object('total',(SELECT total FROM page_bounds),'items',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY code) FROM priced p),'[]'::jsonb),'source','service, service_price_matrix, taxi_price_rule, hotel_room_type','limitations','Mức giá áp dụng theo điều kiện cân nặng, cự ly hoặc loại phòng đang cấu hình; chưa phải báo giá cho một lịch hẹn cụ thể.') INTO result;
  IF category='pet_taxi' AND pawpal_private.has_permission('chatbot_knowledge_faq.read') THEN
   SELECT jsonb_agg(jsonb_build_object('question',question,'answer',left(answer,1600))) INTO guidance FROM (SELECT question,answer FROM public.chatbot_knowledge_faq WHERE is_active AND public.admin_sales_search_text(question||' '||answer) LIKE '%taxi%' AND public.admin_sales_search_text(question||' '||answer) LIKE '%hai chieu%' ORDER BY priority DESC,id LIMIT 3) f;
   result:=result||jsonb_build_object('guidance',coalesce(guidance,'[]'::jsonb));
  END IF;
 ELSE RAISE EXCEPTION 'unsupported_copilot_intent' USING ERRCODE='22023';
 END IF;
 result:=result||jsonb_build_object('intent',p_tool,'scope',p_filters,'as_of',clock_timestamp(),'time_zone','Asia/Ho_Chi_Minh','limit',10,'page',least(requested_page,greatest(1,ceil((result->>'total')::numeric/10)::integer)),'pages',greatest(1,ceil((result->>'total')::numeric/10)::integer));
 IF octet_length(convert_to(result::text,'UTF8'))>p_max_bytes THEN RAISE EXCEPTION 'chat_read_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.run_admin_chat_page(uuid,text,jsonb,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.run_admin_chat_page(uuid,text,jsonb,integer) TO authenticated;
CREATE OR REPLACE FUNCTION public.run_admin_chat_read(p_lease uuid,p_tool text,p_filters jsonb,p_max_bytes integer DEFAULT 32768)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb; allowed text[]; row_limit integer; text_value text;
BEGIN
 IF p_max_bytes IS NULL OR p_max_bytes NOT BETWEEN 1 AND 32768 OR p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR octet_length(p_filters::text)>2000 THEN RAISE EXCEPTION 'invalid_chat_read' USING ERRCODE='22023'; END IF;
 CASE p_tool
 WHEN 'appointment.list' THEN allowed:=ARRAY['start_at','end_at','status','category'];row_limit:=20;
 WHEN 'inventory.low_stock' THEN allowed:=ARRAY['query'];row_limit:=20;
 WHEN 'ticket.open' THEN allowed:=ARRAY['start_at','end_at'];row_limit:=20;
 WHEN 'customer.lookup','order.lookup' THEN allowed:=ARRAY['query'];row_limit:=10;
 WHEN 'catalog.product','catalog.service' THEN allowed:=ARRAY['query'];row_limit:=20;
 WHEN 'catalog.service_price' THEN allowed:=ARRAY['query','category'];row_limit:=20;
 WHEN 'revenue.summary' THEN allowed:=ARRAY['start_at','end_at'];row_limit:=0;
 WHEN 'knowledge.search' THEN allowed:=ARRAY['query'];row_limit:=5;
 WHEN 'conversation.context' THEN allowed:=ARRAY['conversationId'];row_limit:=12;
 WHEN 'history.context' THEN allowed:=ARRAY['sessionId'];row_limit:=6;
 ELSE RAISE EXCEPTION 'unsupported_chat_read' USING ERRCODE='22023';
 END CASE;
 IF p_tool IN ('appointment.list','inventory.low_stock','ticket.open','customer.lookup','order.lookup','catalog.product','catalog.service','catalog.service_price') THEN allowed:=allowed||ARRAY['page']; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_filters) e WHERE NOT e.key=ANY(allowed) OR jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>120) THEN RAISE EXCEPTION 'invalid_chat_read_filter' USING ERRCODE='22023'; END IF;
 IF (p_filters ? 'category' AND p_filters->>'category' NOT IN ('grooming_spa','pet_hotel','pet_taxi'))
 OR (p_filters ? 'status' AND p_filters->>'status' NOT IN ('pending','confirmed','checked_in','in_progress','completed','cancelled','no_show'))
 OR (p_tool IN ('customer.lookup','order.lookup','knowledge.search') AND coalesce(length(trim(p_filters->>'query')),0)<3)
 OR (p_tool IN ('appointment.list','revenue.summary') AND NOT (p_filters ? 'start_at' AND p_filters ? 'end_at'))
 OR (p_tool='conversation.context' AND coalesce(p_filters->>'conversationId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')
 OR (p_tool='history.context' AND coalesce(p_filters->>'sessionId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') THEN RAISE EXCEPTION 'invalid_chat_read_filter' USING ERRCODE='22023'; END IF;
 IF p_filters ? 'start_at' OR p_filters ? 'end_at' THEN
  IF p_filters->>'start_at' IS NULL OR p_filters->>'end_at' IS NULL OR NOT isfinite((p_filters->>'start_at')::timestamptz) OR NOT isfinite((p_filters->>'end_at')::timestamptz)
  OR (p_filters->>'end_at')::timestamptz<=(p_filters->>'start_at')::timestamptz OR (p_filters->>'end_at')::timestamptz>(p_filters->>'start_at')::timestamptz+interval '31 days' THEN RAISE EXCEPTION 'invalid_chat_read_period' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_tool IN ('appointment.list','inventory.low_stock','ticket.open','customer.lookup','order.lookup','catalog.product','catalog.service','catalog.service_price') THEN RETURN public.run_admin_chat_page(p_lease,p_tool,p_filters,p_max_bytes); END IF;
 PERFORM pawpal_private.admit_chat_read_source(p_lease);
 -- Invoker is essential: original RPC grants, RLS and business permissions remain in force.
 CASE p_tool
 WHEN 'conversation.context' THEN result:=public.admin_copilot_chat_context((p_filters->>'conversationId')::uuid);
 WHEN 'history.context' THEN result:=public.admin_copilot_recent_context((p_filters->>'sessionId')::uuid);
 WHEN 'catalog.service_price','revenue.summary','knowledge.search' THEN result:=public.admin_copilot_extended_facts(p_tool,p_filters);
 ELSE result:=public.admin_copilot_facts(p_tool,p_filters);
 END CASE;
 IF result IS NULL OR result='null'::jsonb THEN RAISE EXCEPTION 'invalid_chat_read_result' USING ERRCODE='XX000'; END IF;
 IF octet_length(convert_to(result::text,'UTF8'))>p_max_bytes THEN RAISE EXCEPTION 'chat_read_payload_limit' USING ERRCODE='54000'; END IF;
 IF p_tool IN ('conversation.context','history.context') THEN
  IF jsonb_typeof(result)<>'array' OR jsonb_array_length(result)>row_limit THEN RAISE EXCEPTION 'chat_read_row_limit' USING ERRCODE='54000'; END IF;
 ELSE
  IF result->>'intent' IS DISTINCT FROM p_tool OR jsonb_typeof(result->'items') IS DISTINCT FROM 'array' OR jsonb_array_length(result->'items')>row_limit THEN RAISE EXCEPTION 'chat_read_row_limit' USING ERRCODE='54000'; END IF;
 END IF;
 RETURN result;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
