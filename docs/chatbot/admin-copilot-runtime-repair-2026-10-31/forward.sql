BEGIN;
SET LOCAL lock_timeout='1s';SET LOCAL statement_timeout='8s';
-- Two fixed request slots: no message/PII, growing queue, heartbeat or janitor.
CREATE TABLE IF NOT EXISTS pawpal_private.chat_read_slot(
 slot smallint PRIMARY KEY CHECK(slot BETWEEN 1 AND 2),
 actor uuid, token uuid, request_id uuid, expires_at timestamptz
);
INSERT INTO pawpal_private.chat_read_slot(slot) VALUES(1),(2) ON CONFLICT DO NOTHING;
REVOKE ALL ON pawpal_private.chat_read_slot FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.acquire_admin_chat_read(p_request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
SET statement_timeout='1s' AS $$
DECLARE actor_id uuid; selected smallint; lease uuid;
BEGIN
 IF p_request IS NULL OR auth.uid() IS NULL OR NOT pawpal_private.has_permission('admin_copilot_history.read') OR NOT pawpal_private.has_permission('admin_copilot_history.write') THEN RAISE EXCEPTION 'chat_read_forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO actor_id FROM public.staff WHERE auth_user_id=auth.uid();
 IF actor_id IS NULL THEN RAISE EXCEPTION 'chat_read_forbidden' USING ERRCODE='42501'; END IF;
 -- Fail fast rather than waiting for admission or queuing an unbounded workload.
 IF NOT pg_try_advisory_xact_lock(hashtext('pawpal_chat_read_admission_v1'),0) THEN RAISE EXCEPTION 'chat_read_busy' USING ERRCODE='PT429'; END IF;
 IF EXISTS(SELECT 1 FROM pawpal_private.chat_read_slot WHERE actor=actor_id AND expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'chat_read_actor_busy' USING ERRCODE='PT429'; END IF;
 SELECT slot INTO selected FROM pawpal_private.chat_read_slot WHERE expires_at IS NULL OR expires_at<=clock_timestamp() ORDER BY slot LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF selected IS NULL THEN RAISE EXCEPTION 'chat_read_busy' USING ERRCODE='PT429'; END IF;
 lease:=gen_random_uuid();
 UPDATE pawpal_private.chat_read_slot SET actor=actor_id,token=lease,request_id=p_request,expires_at=clock_timestamp()+interval '35 seconds' WHERE slot=selected;
 RETURN lease;
END $$;

CREATE OR REPLACE FUNCTION public.release_admin_chat_read(p_lease uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
SET statement_timeout='1s' AS $$
BEGIN
 UPDATE pawpal_private.chat_read_slot SET actor=NULL,token=NULL,request_id=NULL,expires_at=NULL
 WHERE token=p_lease AND actor=(SELECT id FROM public.staff WHERE auth_user_id=auth.uid());
END $$;

CREATE OR REPLACE FUNCTION pawpal_private.admit_chat_read_source(p_lease uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE source_slot integer;
BEGIN
 IF NOT pawpal_private.has_permission('admin_copilot_history.read') THEN RAISE EXCEPTION 'chat_read_forbidden' USING ERRCODE='42501'; END IF;
 -- Shared row locks let two sources coexist; replacement/release cannot race a running source.
 PERFORM slot FROM pawpal_private.chat_read_slot WHERE token=p_lease AND expires_at>clock_timestamp()
 AND actor=(SELECT id FROM public.staff WHERE auth_user_id=auth.uid()) FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'chat_read_lease_invalid' USING ERRCODE='42501'; END IF;
 FOR source_slot IN 1..4 LOOP
  IF pg_try_advisory_xact_lock(hashtext('pawpal_chat_read_source_v1'),source_slot) THEN RETURN; END IF;
 END LOOP;
 RAISE EXCEPTION 'chat_read_source_busy' USING ERRCODE='PT429';
END $$;

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
REVOKE ALL ON FUNCTION public.acquire_admin_chat_read(uuid),public.release_admin_chat_read(uuid),public.run_admin_chat_read(uuid,text,jsonb,integer),pawpal_private.admit_chat_read_source(uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.acquire_admin_chat_read(uuid),public.release_admin_chat_read(uuid),public.run_admin_chat_read(uuid,text,jsonb,integer),pawpal_private.admit_chat_read_source(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';

CREATE TABLE IF NOT EXISTS pawpal_private.chat_read_rate(
 actor uuid PRIMARY KEY REFERENCES public.staff(id) ON DELETE CASCADE,
 accepted_at timestamptz[] NOT NULL DEFAULT '{}',
 CHECK(cardinality(accepted_at)<=10)
);
REVOKE ALL ON pawpal_private.chat_read_rate FROM PUBLIC,anon,authenticated,service_role;
CREATE OR REPLACE FUNCTION public.acquire_admin_chat_read(p_request uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
SET statement_timeout='1s' AS $$
DECLARE actor_id uuid; selected smallint; lease uuid; recent timestamptz[]; checked_at timestamptz:=clock_timestamp();
BEGIN
 IF p_request IS NULL OR auth.uid() IS NULL OR NOT pawpal_private.has_permission('admin_copilot_history.read') OR NOT pawpal_private.has_permission('admin_copilot_history.write') THEN RAISE EXCEPTION 'chat_read_forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO actor_id FROM public.staff WHERE auth_user_id=auth.uid();
 IF actor_id IS NULL THEN RAISE EXCEPTION 'chat_read_forbidden' USING ERRCODE='42501'; END IF;
 -- Fail fast rather than waiting for admission or queuing an unbounded workload.
 IF NOT pg_try_advisory_xact_lock(hashtext('pawpal_chat_read_admission_v1'),0) THEN RAISE EXCEPTION 'chat_read_busy' USING ERRCODE='PT429'; END IF;
 IF EXISTS(SELECT 1 FROM pawpal_private.chat_read_slot WHERE actor=actor_id AND expires_at>clock_timestamp()) THEN RAISE EXCEPTION 'chat_read_actor_busy' USING ERRCODE='PT429'; END IF;
 SELECT slot INTO selected FROM pawpal_private.chat_read_slot WHERE expires_at IS NULL OR expires_at<=clock_timestamp() ORDER BY slot LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF selected IS NULL THEN RAISE EXCEPTION 'chat_read_busy' USING ERRCODE='PT429'; END IF;
 -- Same RPC and transaction as admission. One bounded row/staff, no per-request log.
 SELECT accepted_at INTO recent FROM pawpal_private.chat_read_rate WHERE actor=actor_id;
 SELECT coalesce(array_agg(t),'{}'::timestamptz[]) INTO recent FROM unnest(recent) t WHERE t>checked_at-interval '60 seconds';
 IF cardinality(recent)>=10 THEN RAISE EXCEPTION 'chat_read_rate_limited' USING ERRCODE='PT429'; END IF;
 INSERT INTO pawpal_private.chat_read_rate(actor,accepted_at) VALUES(actor_id,array_append(recent,checked_at))
 ON CONFLICT(actor) DO UPDATE SET accepted_at=excluded.accepted_at;
 lease:=gen_random_uuid();
 UPDATE pawpal_private.chat_read_slot SET actor=actor_id,token=lease,request_id=p_request,expires_at=clock_timestamp()+interval '35 seconds' WHERE slot=selected;
 RETURN lease;
END $$;

NOTIFY pgrst,'reload schema';

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

-- Closed, caller-scoped read catalog. No question supplies SQL identifiers.
CREATE OR REPLACE FUNCTION public.run_admin_stage3_read(p_lease uuid,p_tool text,p_filters jsonb,p_max_bytes integer DEFAULT 32768)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE allowed text[]; permissions text[]; statuses text[]; stmt text; result jsonb;
 q text; a timestamptz; b timestamptz; pg integer:=1; perm text; notes jsonb:='[]'; selected_staff uuid; staff_count bigint; staff_name text;
BEGIN
 IF p_max_bytes IS NULL OR p_max_bytes NOT BETWEEN 1 AND 32768 OR p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR octet_length(p_filters::text)>2000 THEN RAISE EXCEPTION 'invalid_chat_read' USING ERRCODE='22023'; END IF;
 CASE p_tool
 WHEN 'customer.pets' THEN allowed:=ARRAY['query'];permissions:=ARRAY['customer.read','customer_profile.read','customer_phone.read','pet_profile.read','pet_breed.read','pet_species.read'];
 WHEN 'pet.lookup' THEN allowed:=ARRAY['query'];permissions:=ARRAY['pet_profile.read','pet_breed.read','pet_species.read'];
 WHEN 'payment.order' THEN allowed:=ARRAY['query'];permissions:=ARRAY['sales_order.read','payment.read','refund_transaction.read'];
 WHEN 'order.refund_pending' THEN allowed:=ARRAY['start_at','end_at'];permissions:=ARRAY['sales_order.read','payment.read','refund_transaction.read'];
 WHEN 'appointment.search' THEN allowed:=ARRAY['start_at','end_at','category','status','day_part','unassigned','staff_query'];permissions:=ARRAY['appointment.read','appointment_item.read','service.read','service_category.read'];statuses:=ARRAY['pending','confirmed','checked_in','in_progress','completed','cancelled','no_show'];
 WHEN 'ticket.lookup' THEN allowed:=ARRAY['query'];permissions:=ARRAY['support_ticket.read'];
 WHEN 'conversation.list' THEN allowed:=ARRAY['query','start_at','end_at','status'];permissions:=ARRAY['chat_conversation.read','chat_message.read','customer.read','customer_profile.read'];statuses:=ARRAY['bot_handling','waiting_agent','agent_handling','resolved','closed','completed','blocked'];
 WHEN 'points.lookup' THEN allowed:=ARRAY['query'];permissions:=ARRAY['customer.read','customer_profile.read','customer_phone.read','paw_point_transaction.read'];
 WHEN 'offer.list' THEN allowed:=ARRAY['query'];permissions:=ARRAY['voucher.read','promotion.read'];
 WHEN 'staff.lookup' THEN allowed:=ARRAY['query','status'];permissions:=ARRAY['staff.read'];statuses:=ARRAY['active','inactive','terminated'];
 WHEN 'staff.schedule' THEN allowed:=ARRAY['query','start_at','end_at'];permissions:=ARRAY['staff.read','staff_schedule.read'];
 WHEN 'review.list' THEN allowed:=ARRAY['query','start_at','end_at','rating_min','rating_max'];permissions:=ARRAY['review.read'];
 WHEN 'content.list' THEN allowed:=ARRAY['query','status'];permissions:=ARRAY['blog_post.read'];statuses:=ARRAY['draft','pending','published','archived'];
 WHEN 'report.operations' THEN allowed:=ARRAY['start_at','end_at'];permissions:=ARRAY['sales_order.read','appointment.read','support_ticket.read'];
 WHEN 'settings.read' THEN allowed:=ARRAY['query'];permissions:=ARRAY['pawpal_setting.read'];
 ELSE RAISE EXCEPTION 'unsupported_chat_read' USING ERRCODE='22023';
 END CASE;
 allowed:=allowed||ARRAY['page'];
 IF EXISTS(SELECT 1 FROM jsonb_each(p_filters) e WHERE NOT e.key=ANY(allowed) OR jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>120 OR (e.value#>>'{}') ~ '[[:cntrl:]]') THEN RAISE EXCEPTION 'invalid_chat_filter' USING ERRCODE='22023'; END IF;
 IF p_filters ? 'page' THEN
  IF p_filters->>'page' !~ '^[1-9][0-9]{0,4}$' THEN RAISE EXCEPTION 'invalid_chat_page' USING ERRCODE='22023'; END IF;
  pg:=(p_filters->>'page')::integer;
  IF pg>10000 THEN RAISE EXCEPTION 'invalid_chat_page' USING ERRCODE='22023'; END IF;
 END IF;
 q:=public.admin_sales_search_text(coalesce(p_filters->>'query',''));
 IF p_tool IN ('customer.pets','pet.lookup','payment.order','ticket.lookup','points.lookup') AND length(trim(q))<3 THEN RAISE EXCEPTION 'chat_query_required' USING ERRCODE='22023'; END IF;
 IF (p_filters ? 'status' AND NOT coalesce(p_filters->>'status'=ANY(statuses),false))
 OR (p_filters ? 'category' AND p_filters->>'category' NOT IN ('grooming_spa','pet_hotel','pet_taxi'))
 OR (p_filters ? 'day_part' AND p_filters->>'day_part' NOT IN ('morning','afternoon','evening'))
 OR (p_filters ? 'unassigned' AND p_filters->>'unassigned' NOT IN ('true','false'))
 OR (p_filters ? 'rating_max' AND p_filters->>'rating_max' !~ '^[1-5]$') OR (p_filters ? 'rating_min' AND p_filters->>'rating_min' !~ '^[1-5]$') THEN RAISE EXCEPTION 'invalid_chat_filter' USING ERRCODE='22023'; END IF;
 IF p_filters ? 'rating_min' AND p_filters ? 'rating_max' AND (p_filters->>'rating_min')::integer>(p_filters->>'rating_max')::integer THEN RAISE EXCEPTION 'invalid_review_range' USING ERRCODE='22023'; END IF;
 IF p_filters ? 'start_at' OR p_filters ? 'end_at' OR p_tool IN ('appointment.search','staff.schedule','review.list','report.operations') THEN
  a:=(p_filters->>'start_at')::timestamptz;b:=(p_filters->>'end_at')::timestamptz;
  IF a IS NULL OR b IS NULL OR NOT isfinite(a) OR NOT isfinite(b) OR b<=a OR b>a+interval '31 days' THEN RAISE EXCEPTION 'invalid_chat_period' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_tool='appointment.search' AND p_filters ? 'staff_query' THEN
  IF length(trim(p_filters->>'staff_query'))<2 OR p_filters->>'unassigned'='true' THEN RAISE EXCEPTION 'invalid_staff_filter' USING ERRCODE='22023'; END IF;
  permissions:=permissions||ARRAY['staff.read'];
  IF p_filters ? 'category' THEN permissions:=permissions||ARRAY['service_addon.read']; END IF;
 END IF;
 FOREACH perm IN ARRAY permissions LOOP
  IF NOT pawpal_private.has_permission(perm) THEN RAISE EXCEPTION 'chat_read_forbidden' USING ERRCODE='42501'; END IF;
 END LOOP;
 PERFORM pawpal_private.admit_chat_read_source(p_lease);
 IF p_tool='appointment.search' AND p_filters ? 'staff_query' THEN
  SELECT count(*),min(s.id::text)::uuid,left(min(s.full_name),400) INTO staff_count,selected_staff,staff_name FROM public.staff s
  WHERE s.id::text=lower(trim(p_filters->>'staff_query')) OR (trim(p_filters->>'staff_query') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND public.admin_sales_search_text(s.full_name)=public.admin_sales_search_text(trim(p_filters->>'staff_query')));
  IF staff_count<>1 THEN
   result:=jsonb_build_object('intent',p_tool,'total',0,'items','[]'::jsonb,'staff_match_count',staff_count,'ambiguous',staff_count>1,'scope',p_filters,'source','staff / caller RLS','as_of',clock_timestamp(),'limitations',jsonb_build_array('Ch?a tra c?u l?ch v? ch?a x?c ??nh ???c duy nh?t m?t KTV.'));
   IF octet_length(convert_to(result::text,'UTF8'))>p_max_bytes THEN RAISE EXCEPTION 'chat_read_payload_limit' USING ERRCODE='54000'; END IF;
   RETURN result;
  END IF;
 END IF;
 CASE p_tool
 WHEN 'customer.pets','pet.lookup' THEN
 stmt:=$q$ SELECT p.id::text key,p.pet_code sort_key,jsonb_build_object('code',p.pet_code,'name',p.pet_name,'breed',concat_ws(' / ',s.species_name,b.breed_name),'notes',left(concat_ws('; ',nullif(p.allergy,''),nullif(p.safety_note,'')),600),'truncated',length(concat_ws('; ',p.allergy,p.safety_note))>600) record
 FROM public.pet_profile p LEFT JOIN public.pet_breed b ON b.id=p.breed_id LEFT JOIN public.pet_species s ON s.id=b.species_id
 WHERE $q$ || CASE WHEN p_tool='pet.lookup' THEN $q$ strpos(public.admin_sales_search_text(concat_ws(' ',p.pet_code,p.pet_name)),$1)>0 $q$ ELSE $q$ EXISTS(SELECT 1 FROM public.customer c LEFT JOIN public.customer_profile cp ON cp.customer_id=c.id WHERE c.id=p.customer_id AND (strpos(public.admin_sales_search_text(concat_ws(' ',c.customer_code,cp.full_name)),$1)>0 OR EXISTS(SELECT 1 FROM public.customer_phone ph WHERE ph.customer_id=c.id AND strpos(public.admin_sales_search_text(ph.phone_number),$1)>0))) $q$ END;
 WHEN 'payment.order','order.refund_pending' THEN
 stmt:=$q$ SELECT o.id::text key,o.order_code sort_key,jsonb_build_object('code',o.order_code,'collected',pay.amount,'refunded',ref.amount,'net',pay.amount-ref.amount,'pending_refunds',ref.pending) record
 FROM public.sales_order o
 CROSS JOIN LATERAL(SELECT coalesce(sum(p.amount) FILTER(WHERE p.transaction_status='succeeded'),0) amount FROM public.payment p WHERE p.order_id=o.id) pay
 CROSS JOIN LATERAL(SELECT coalesce(sum(r.refunded_amount) FILTER(WHERE r.refund_status='succeeded'),0) amount,count(*) FILTER(WHERE r.refund_status IN ('pending','approved','processing')) pending FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE p.order_id=o.id) ref
 WHERE $q$||CASE WHEN p_tool='payment.order' THEN $q$ strpos(public.admin_sales_search_text(o.order_code),$1)>0 $q$ ELSE $q$ o.order_status='cancelled' AND pay.amount>ref.amount AND ($2 IS NULL OR o.created_at >= $2 AND o.created_at < $3) $q$ END;
 notes:='["Đã thu: giao dịch succeeded; đã hoàn: yêu cầu succeeded. Chênh lệch là số đã thu trừ số đã hoàn, không phải khoản hoàn đã được phê duyệt.","Khoảng ngày nếu có lọc theo ngày tạo đơn; dữ liệu không có mốc hủy đơn riêng."]';
 WHEN 'appointment.search' THEN
 stmt:=$q$ SELECT a.id::text key,a.scheduled_start_at::text||a.id::text sort_key,jsonb_build_object('code',a.appointment_code,'status',a.appointment_status,'scheduled_at',a.scheduled_start_at,'services',left((SELECT string_agg(ai.name_snapshot,', ' ORDER BY ai.id) FROM public.appointment_item ai WHERE ai.appointment_id=a.id AND ai.status<>'cancelled'),600)) record
 FROM public.appointment a WHERE a.scheduled_start_at >= $2 AND a.scheduled_start_at < $3
 AND (NOT $4 ? 'status' OR a.appointment_status=$4->>'status')
 AND (NOT $4 ? 'category' OR EXISTS(SELECT 1 FROM public.appointment_item ai JOIN public.service s ON s.id=ai.service_id JOIN public.service_category sc ON sc.id=s.category_id WHERE ai.appointment_id=a.id AND ai.status<>'cancelled' AND sc.category_code=$4->>'category'))
 AND (NOT $4 ? 'day_part' OR CASE $4->>'day_part' WHEN 'morning' THEN extract(hour FROM a.scheduled_start_at AT TIME ZONE 'Asia/Ho_Chi_Minh')<12 WHEN 'afternoon' THEN extract(hour FROM a.scheduled_start_at AT TIME ZONE 'Asia/Ho_Chi_Minh')>=12 AND extract(hour FROM a.scheduled_start_at AT TIME ZONE 'Asia/Ho_Chi_Minh')<18 ELSE extract(hour FROM a.scheduled_start_at AT TIME ZONE 'Asia/Ho_Chi_Minh')>=18 END)
 AND ($6 IS NULL OR a.staff_id=$6 OR EXISTS(SELECT 1 FROM public.appointment_item ai WHERE ai.appointment_id=a.id AND ai.status<>'cancelled' AND ai.staff_id=$6
  AND (NOT $4 ? 'category' OR EXISTS(SELECT 1 FROM public.service s JOIN public.service_category sc ON sc.id=s.category_id WHERE s.id=coalesce(ai.service_id,(SELECT ad.service_id FROM public.service_addon ad WHERE ad.id=ai.service_addon_id)) AND sc.category_code=$4->>'category'))))
 AND (NOT $4 ? 'unassigned' OR (a.staff_id IS NULL AND NOT EXISTS(SELECT 1 FROM public.appointment_item ai WHERE ai.appointment_id=a.id AND ai.status<>'cancelled' AND ai.staff_id IS NOT NULL))=($4->>'unassigned')::boolean) $q$;
 notes:='["Buổi sáng 00–12h, chiều 12–18h, tối 18–24h theo giờ Việt Nam; lọc theo giờ bắt đầu lịch.","Chưa có KTV: cả lịch và mọi hạng mục chưa hủy đều chưa được phân công."]';
 WHEN 'ticket.lookup' THEN
 stmt:=$q$ SELECT t.id::text key,t.ticket_code sort_key,jsonb_build_object('code',t.ticket_code,'name',left(t.subject,400),'status',t.status) record FROM public.support_ticket t WHERE strpos(public.admin_sales_search_text(concat_ws(' ',t.ticket_code,t.subject)),$1)>0 $q$;
 WHEN 'conversation.list' THEN
 stmt:=$q$ SELECT c.id::text key,c.updated_at::text||c.id::text sort_key,jsonb_build_object('code',c.id,'name',coalesce(cp.full_name,'Khách vãng lai'),'status',c.status,'detail',left((SELECT m.content FROM public.chat_message m WHERE m.conversation_id=c.id AND m.sender_type IN ('customer','bot','staff') ORDER BY m.created_at DESC,m.id DESC LIMIT 1),160)) record FROM public.chat_conversation c LEFT JOIN public.customer cu ON cu.id=c.customer_id LEFT JOIN public.customer_profile cp ON cp.customer_id=cu.id WHERE ($2 IS NULL OR c.created_at >= $2 AND c.created_at < $3) AND (NOT $4 ? 'status' OR c.status=$4->>'status') AND ($1='' OR strpos(public.admin_sales_search_text(concat_ws(' ',c.id,cu.customer_code,cp.full_name)),$1)>0) $q$;
 WHEN 'points.lookup' THEN
 stmt:=$q$ SELECT c.id::text key,c.customer_code sort_key,jsonb_build_object('code',c.customer_code,'name',cp.full_name,'balance',coalesce((SELECT sum(pt.points) FROM public.paw_point_transaction pt WHERE pt.customer_id=c.id),0)) record FROM public.customer c LEFT JOIN public.customer_profile cp ON cp.customer_id=c.id WHERE strpos(public.admin_sales_search_text(concat_ws(' ',c.customer_code,cp.full_name)),$1)>0 OR EXISTS(SELECT 1 FROM public.customer_phone ph WHERE ph.customer_id=c.id AND strpos(public.admin_sales_search_text(ph.phone_number),$1)>0) $q$;
 WHEN 'offer.list' THEN
 stmt:=$q$ SELECT 'voucher:'||v.id::text key,v.voucher_code sort_key,jsonb_build_object('code',v.voucher_code,'name',left(v.voucher_name,300),'detail',left(v.description,400)) record FROM public.voucher v WHERE v.is_active AND (v.start_date IS NULL OR v.start_date<=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AND (v.end_date IS NULL OR v.end_date>=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AND ($1='' OR strpos(public.admin_sales_search_text(concat_ws(' ',v.voucher_code,v.voucher_name)),$1)>0)
 UNION ALL SELECT 'promotion:'||p.id::text,p.promotion_name,jsonb_build_object('code',p.id,'name',left(p.promotion_name,300),'detail',left(p.description,400)) FROM public.promotion p WHERE p.status='active' AND (p.start_date IS NULL OR p.start_date<=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AND (p.end_date IS NULL OR p.end_date>=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AND ($1='' OR strpos(public.admin_sales_search_text(p.promotion_name),$1)>0) $q$;
 notes:='["Đây là ưu đãi đang hiệu lực; chưa xác nhận điều kiện áp dụng cho khách hoặc đơn cụ thể."]';
 WHEN 'staff.lookup' THEN
 stmt:=$q$ SELECT s.id::text key,s.full_name sort_key,jsonb_build_object('code',s.id,'name',s.full_name,'status',s.employment_status,'detail',s.job_title) record FROM public.staff s WHERE ($1='' OR strpos(public.admin_sales_search_text(s.full_name),$1)>0) AND (NOT $4 ? 'status' OR s.employment_status=$4->>'status') $q$;
 WHEN 'staff.schedule' THEN
 stmt:=$q$ SELECT ss.id::text key,ss.start_at::text||ss.id::text sort_key,jsonb_build_object('code',ss.id,'name',s.full_name,'start_at',ss.start_at,'end_at',ss.end_at,'status',ss.availability_status) record FROM public.staff_schedule ss JOIN public.staff s ON s.id=ss.staff_id WHERE ss.start_at < $3 AND ss.end_at > $2 AND ($1='' OR strpos(public.admin_sales_search_text(s.full_name),$1)>0) $q$;
 notes:='["Lịch trực có thời gian giao với khoảng tra cứu; không hiển thị lý do nghỉ cá nhân."]';
 WHEN 'review.list' THEN
 stmt:=$q$ SELECT r.id::text key,r.created_at::text||r.id::text sort_key,jsonb_build_object('code',r.id,'rating',r.rating,'status',r.review_status,'excerpt',left(r.review_content,400),'truncated',length(r.review_content)>400) record FROM public.review r WHERE r.created_at >= $2 AND r.created_at < $3 AND (NOT $4 ? 'rating_max' OR r.rating<=($4->>'rating_max')::integer) AND (NOT $4 ? 'rating_min' OR r.rating>=($4->>'rating_min')::integer) AND ($1='' OR strpos(public.admin_sales_search_text(r.review_content),$1)>0) $q$;
 WHEN 'content.list' THEN
 stmt:=$q$ SELECT b.id::text key,b.title||b.id::text sort_key,jsonb_build_object('code',b.id,'name',left(b.title,400),'status',b.status,'detail',left(b.summary,400),'truncated',length(b.summary)>400) record FROM public.blog_post b WHERE ($1='' OR strpos(public.admin_sales_search_text(concat_ws(' ',b.title,b.slug)),$1)>0) AND (NOT $4 ? 'status' OR b.status=$4->>'status') $q$;
 WHEN 'report.operations' THEN
 stmt:=$q$ SELECT code key,code sort_key,jsonb_build_object('code',code,'name',name,'count',n) record FROM (SELECT 'orders_created' code,'Đơn được tạo' name,count(*) n FROM public.sales_order WHERE created_at >= $2 AND created_at < $3 UNION ALL SELECT 'appointments_scheduled','Lịch hẹn bắt đầu',count(*) FROM public.appointment WHERE scheduled_start_at >= $2 AND scheduled_start_at < $3 UNION ALL SELECT 'tickets_created','Phiếu hỗ trợ được tạo',count(*) FROM public.support_ticket WHERE created_at >= $2 AND created_at < $3) x $q$;
 notes:='["Ba chỉ số độc lập; không cộng thành một tổng nghiệp vụ. Đơn/phiếu theo ngày tạo, lịch theo giờ bắt đầu."]';
 WHEN 'settings.read' THEN
 stmt:=$q$ SELECT x.code key,x.code sort_key,jsonb_build_object('code',x.code,'value',left(x.value,400),'truncated',length(x.value)>400) record FROM public.pawpal_setting s CROSS JOIN LATERAL(VALUES
 ('store_name',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{storeInfo,brandName}'),('hotline',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{storeInfo,hotline}'),('address',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{storeInfo,address}'),
 ('weekday_open',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{operatingHours,weekday,open}'),('weekday_close',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{operatingHours,weekday,close}'),('weekend_open',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{operatingHours,weekend,open}'),('weekend_close',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{operatingHours,weekend,close}'),('free_cancel_hours',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{bookingPolicy,freeCancelHours}'),('slot_capacity',(CASE WHEN s.setting_key='system_config' THEN s.setting_value::jsonb ELSE '{}'::jsonb END)#>>'{bookingPolicy,slotCapacityMax}')) x(code,value)
 WHERE s.setting_key='system_config' AND x.value IS NOT NULL AND ($1='' OR strpos(x.code,$1)>0) $q$;
 END CASE;
 -- Constant query templates only. Parameters remain parameters even for count/paging.
 EXECUTE 'WITH matched AS NOT MATERIALIZED ('||stmt||'), bounds AS (SELECT count(*) total,least($5,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched), rows AS (SELECT record FROM matched ORDER BY sort_key,key LIMIT 10 OFFSET (SELECT (page-1)*10 FROM bounds)) SELECT jsonb_build_object(''total'',total,''page'',page,''pages'',greatest(1,ceil(total/10.0)::integer),''items'',coalesce((SELECT jsonb_agg(record) FROM rows),''[]''::jsonb)) FROM bounds'
 INTO result USING q,a,b,p_filters,pg,selected_staff;
 result:=result||jsonb_build_object('intent',p_tool,'source','Supabase / caller RLS','as_of',clock_timestamp(),'scope',p_filters||jsonb_strip_nulls(jsonb_build_object('start_at',a,'end_at',b,'time_zone','Asia/Ho_Chi_Minh','staff_id',selected_staff,'staff_name',staff_name)),'limitations',notes);
 IF selected_staff IS NOT NULL THEN result:=result||jsonb_build_object('staff_match_count',1,'limitations',(result->'limitations')||jsonb_build_array('L?c theo KTV ph? tr?ch ca ho?c h?ng m?c ch?a h?y; khi ch?n nh?m d?ch v?, h?ng m?c ph?i thu?c nh?m ??. M?i ca ch? ??m m?t l?n.')); END IF;
 IF octet_length(convert_to(result::text,'UTF8'))>p_max_bytes THEN RAISE EXCEPTION 'chat_read_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.run_admin_stage3_read(uuid,text,jsonb,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.run_admin_stage3_read(uuid,text,jsonb,integer) TO authenticated;
NOTIFY pgrst,'reload schema';

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

SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='1s';
-- Internal FAQ only: never added to the public customer FAQ table.
CREATE TABLE public.admin_chat_knowledge_faq (
 id uuid PRIMARY KEY,
 question text NOT NULL CHECK(length(btrim(question)) BETWEEN 1 AND 1000),
 answer text NOT NULL CHECK(length(btrim(answer)) BETWEEN 1 AND 3000),
 keywords text[] NOT NULL DEFAULT '{}',
 priority integer NOT NULL DEFAULT 0 CHECK(priority>=0),
 is_active boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.admin_chat_knowledge_faq IS 'FAQ hướng dẫn trợ lý Admin; tách biệt hoàn toàn kho FAQ công khai';
ALTER TABLE public.admin_chat_knowledge_faq ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_chat_knowledge_faq FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.admin_chat_knowledge_faq TO authenticated;
GRANT ALL ON public.admin_chat_knowledge_faq TO service_role;
CREATE POLICY admin_chat_faq_read ON public.admin_chat_knowledge_faq FOR SELECT TO authenticated
 USING (auth.uid() IS NOT NULL AND pawpal_private.has_permission('admin_copilot_history.read') AND pawpal_private.has_permission('chatbot_knowledge_faq.read'));

INSERT INTO public.admin_chat_knowledge_faq(id,question,answer,keywords,priority) VALUES
('15100000-0000-4000-8000-000000000001',
 'Trợ lý Admin hỗ trợ tra cứu nhân sự và lịch trực như thế nào?',
 'Bạn có thể hỏi “Nhân viên đang làm việc”, “Nhân viên: họ tên” hoặc “Lịch trực tuần này”. Tra cứu nhân sự hỗ trợ danh sách, chức danh và trạng thái làm việc; lịch trực hỗ trợ khoảng ngày tối đa 31 ngày và tìm theo tên nhân viên. Kết quả chỉ trong quyền được cấp, tối đa 10 dòng mỗi trang; hỏi tiếp “trang 2” để xem thêm. Nếu trùng tên, hãy đối chiếu mã nhân viên để chọn đúng người. Trợ lý không trả lương, tài khoản ngân hàng hoặc ghi chú nghỉ cá nhân và không tự phân ca, chuyển ca hay sửa hồ sơ. Muốn thực hiện nghiệp vụ, mở Nhân sự hoặc Lịch làm việc, kiểm tra thông tin và thao tác theo quyền của bạn.',
 ARRAY['nhân sự','nhân viên','lịch trực','lịch làm việc','phân ca','KTV'],100),
('15100000-0000-4000-8000-000000000002',
 'Trợ lý Admin hỗ trợ tra cứu bài viết và đánh giá như thế nào?',
 'Bạn có thể hỏi “Bài viết đã đăng”, “Bài viết nháp” hoặc “Đánh giá thấp tháng này”. Bài viết hỗ trợ tìm theo tiêu đề hoặc đường dẫn và lọc trạng thái. Đánh giá hỗ trợ khoảng ngày tối đa 31 ngày, từ khóa và số sao; “đánh giá thấp” là tối đa 2 sao. Danh sách tối đa 10 dòng mỗi trang. Khi cần đọc nội dung đầy đủ, cung cấp mã bài viết hoặc mã đánh giá, ví dụ “Nội dung bài viết: mã bài viết”; nội dung dài chia thành từng phần và chỉ đọc tiếp khi bạn yêu cầu. Nếu nội dung đổi phiên bản, hãy tra lại phần đầu. Trợ lý không tự đăng bài, sửa bài hoặc gửi phản hồi đánh giá; bạn cần kiểm tra và thực hiện tại phân hệ tương ứng theo quyền.',
 ARRAY['bài viết','nội dung','đánh giá','số sao','đọc tiếp','đăng bài'],100),
('15100000-0000-4000-8000-000000000003',
 'Trợ lý Admin hỗ trợ tra cứu cấu hình và báo cáo vận hành như thế nào?',
 'Bạn có thể hỏi “Giờ mở cửa”, “Thông tin cửa hàng” hoặc “Báo cáo vận hành tuần này”. Cấu hình được phép tra gồm tên, hotline, địa chỉ cửa hàng, giờ mở và đóng ngày thường/cuối tuần, số giờ hủy miễn phí và sức chứa khung giờ. Không trả khóa, mật khẩu hoặc thông tin tài khoản thanh toán. Báo cáo vận hành trả riêng số đơn được tạo, lịch hẹn bắt đầu và phiếu hỗ trợ được tạo trong khoảng tối đa 31 ngày; không cộng ba số thành một chỉ số chung. Muốn xem thực thu, hỏi “Thực thu tuần này”; số liệu tính từ giao dịch thu và hoàn thành công theo thời điểm tương ứng, không phải giá trị đơn tạo trong kỳ. Trợ lý không sửa cấu hình hoặc thực hiện giao dịch. Kết quả cần được đọc cùng phạm vi, thời điểm và giới hạn hiển thị; thiếu quyền hoặc lỗi nguồn không có nghĩa là số liệu bằng 0.',
 ARRAY['cấu hình','giờ mở cửa','hotline','báo cáo','vận hành','thực thu'],100);

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
   FROM (SELECT id,question,answer,keywords,priority FROM public.chatbot_knowledge_faq WHERE is_active UNION ALL SELECT id,question,answer,keywords,priority FROM public.admin_chat_knowledge_faq WHERE is_active) f
  ), matched AS MATERIALIZED (SELECT * FROM scored WHERE score>0)
  SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(jsonb_build_object('question',question,'answer',answer) ORDER BY score DESC,priority DESC,id) FROM (SELECT * FROM matched ORDER BY score DESC,priority DESC,id LIMIT 5) x),'[]'::jsonb),'source','chatbot_knowledge_faq, admin_chat_knowledge_faq','limitations',CASE WHEN NOT EXISTS(SELECT 1 FROM matched) THEN 'Chưa tìm thấy thông tin phù hợp trong kho tri thức đang bật. Bạn vui lòng nêu cụ thể dịch vụ hoặc vấn đề cần tra cứu.' ELSE '' END) INTO result;
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

SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='1s';
CREATE INDEX IF NOT EXISTS admin_chat_case_customer_name_idx ON public.customer_profile(public.admin_sales_search_text(full_name),customer_id);
CREATE INDEX IF NOT EXISTS admin_chat_case_customer_phone_idx ON public.customer_phone(phone_number,customer_id);
CREATE INDEX IF NOT EXISTS admin_chat_case_appointment_idx ON public.appointment(customer_id,scheduled_start_at,id);
CREATE INDEX IF NOT EXISTS admin_chat_case_ticket_idx ON public.support_ticket(customer_id,created_at DESC,id);
CREATE OR REPLACE FUNCTION public.run_admin_chat_customer_case(p_lease uuid,p_tool text,p_filters jsonb,p_max_bytes integer DEFAULT 32768)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $function$
DECLARE result jsonb; allowed text[]; rights text[]; required text; q text; owner_id uuid; direction text; at_time timestamptz:=now();
BEGIN
 IF p_max_bytes IS NULL OR p_max_bytes NOT BETWEEN 1 AND 32768 OR p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR octet_length(p_filters::text)>2000 THEN RAISE EXCEPTION 'invalid_customer_case' USING ERRCODE='22023'; END IF;
 CASE p_tool
 WHEN 'internal.customer_resolve' THEN allowed:=ARRAY['query'];rights:=ARRAY['customer.read','customer_profile.read','customer_phone.read'];
 WHEN 'internal.customer_appointment' THEN allowed:=ARRAY['customerId','direction'];rights:=ARRAY['customer.read','appointment.read','appointment_item.read'];
 WHEN 'internal.customer_tickets' THEN allowed:=ARRAY['customerId'];rights:=ARRAY['customer.read','support_ticket.read'];
 ELSE RAISE EXCEPTION 'unsupported_customer_case_tool' USING ERRCODE='22023';
 END CASE;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_filters)e WHERE NOT e.key=ANY(allowed) OR jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>120 OR (e.value#>>'{}') ~ '[[:cntrl:]]') THEN RAISE EXCEPTION 'invalid_customer_case_filter' USING ERRCODE='22023'; END IF;
 FOREACH required IN ARRAY rights LOOP
  IF auth.uid() IS NULL OR NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'customer_case_forbidden' USING ERRCODE='42501'; END IF;
 END LOOP;
 IF p_tool='internal.customer_resolve' THEN
  q:=btrim(coalesce(p_filters->>'query',''));IF length(q)<3 THEN RAISE EXCEPTION 'customer_case_query_required' USING ERRCODE='22023'; END IF;
  IF q ~ '^\+?[0-9 .-]{9,30}$' THEN q:=regexp_replace(q,'[ .-]','','g'); END IF;
 ELSE
  IF coalesce(p_filters->>'customerId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'invalid_customer_case_identity' USING ERRCODE='22023'; END IF;
  owner_id:=(p_filters->>'customerId')::uuid;
  IF p_tool='internal.customer_appointment' THEN direction:=p_filters->>'direction';IF direction IS NULL OR direction NOT IN ('upcoming','recent') THEN RAISE EXCEPTION 'invalid_customer_case_direction' USING ERRCODE='22023'; END IF; END IF;
 END IF;
 PERFORM pawpal_private.admit_chat_read_source(p_lease);
 IF p_tool='internal.customer_resolve' THEN
  IF q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
   SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM (SELECT c.id,c.customer_code code,left(coalesce(cp.full_name,c.customer_code),200) name FROM public.customer c LEFT JOIN public.customer_profile cp ON cp.customer_id=c.id WHERE c.id=q::uuid)x;
  ELSIF q ~ '^\+?[0-9]{9,15}$' THEN
   SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM (SELECT DISTINCT c.id,c.customer_code code,left(coalesce(cp.full_name,c.customer_code),200) name FROM public.customer_phone ph JOIN public.customer c ON c.id=ph.customer_id LEFT JOIN public.customer_profile cp ON cp.customer_id=c.id WHERE ph.phone_number=q ORDER BY c.id LIMIT 2)x;
  ELSE
   SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM (SELECT c.id,c.customer_code code,left(coalesce(cp.full_name,c.customer_code),200) name FROM public.customer c LEFT JOIN public.customer_profile cp ON cp.customer_id=c.id WHERE c.customer_code=q OR c.customer_code=upper(q) ORDER BY c.id LIMIT 2)x;
   IF jsonb_array_length(result)=0 THEN
    SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM (SELECT c.id,c.customer_code code,left(cp.full_name,200) name FROM public.customer_profile cp JOIN public.customer c ON c.id=cp.customer_id WHERE public.admin_sales_search_text(cp.full_name)=public.admin_sales_search_text(q) ORDER BY c.id LIMIT 2)x;
   END IF;
  END IF;
  result:=jsonb_build_object('total',jsonb_array_length(result),'items',result,'source','customer, customer_profile, customer_phone','match_limit',2);
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.customer WHERE id=owner_id) THEN RAISE EXCEPTION 'customer_case_unavailable' USING ERRCODE='42501'; END IF;
  IF p_tool='internal.customer_appointment' THEN
   IF direction='upcoming' THEN
    SELECT jsonb_build_object('total',count(*),'items',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) INTO result FROM (SELECT a.appointment_code code,a.appointment_status status,a.scheduled_start_at scheduled_at,left((SELECT string_agg(ai.name_snapshot,', ' ORDER BY ai.id) FROM public.appointment_item ai WHERE ai.appointment_id=a.id AND ai.status<>'cancelled'),600) services FROM public.appointment a WHERE a.customer_id=owner_id AND a.scheduled_start_at>=at_time AND a.appointment_status NOT IN ('cancelled','no_show','completed') ORDER BY a.scheduled_start_at,a.id LIMIT 1)x;
   ELSE
    SELECT jsonb_build_object('total',count(*),'items',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) INTO result FROM (SELECT a.appointment_code code,a.appointment_status status,a.scheduled_start_at scheduled_at,left((SELECT string_agg(ai.name_snapshot,', ' ORDER BY ai.id) FROM public.appointment_item ai WHERE ai.appointment_id=a.id AND ai.status<>'cancelled'),600) services FROM public.appointment a WHERE a.customer_id=owner_id AND a.scheduled_start_at<at_time AND a.appointment_status NOT IN ('cancelled','no_show') ORDER BY a.scheduled_start_at DESC,a.id DESC LIMIT 1)x;
   END IF;
   result:=result||jsonb_build_object('source','appointment, appointment_item');
  ELSE
   WITH matched AS NOT MATERIALIZED (SELECT id,ticket_code code,left(subject,300) subject,status,priority,created_at FROM public.support_ticket WHERE customer_id=owner_id AND status NOT IN ('completed','resolved','closed','rejected','cancelled','da_giai_quyet','da_dong','tu_choi'))
   SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(to_jsonb(x)-'id' ORDER BY created_at DESC,id DESC) FROM (SELECT * FROM matched ORDER BY created_at DESC,id DESC LIMIT 10)x),'[]'::jsonb),'source','support_ticket') INTO result;
  END IF;
 END IF;
 result:=result||jsonb_build_object('intent',p_tool,'scope',p_filters,'as_of',at_time,'limitations','[]'::jsonb);
 IF octet_length(convert_to(result::text,'UTF8'))>p_max_bytes THEN RAISE EXCEPTION 'customer_case_payload_exceeded' USING ERRCODE='54000'; END IF;
 RETURN result;
END $function$;
REVOKE ALL ON FUNCTION public.run_admin_chat_customer_case(uuid,text,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.run_admin_chat_customer_case(uuid,text,jsonb,integer) TO authenticated;
NOTIFY pgrst,'reload schema';

SET LOCAL statement_timeout='5s';
SET LOCAL lock_timeout='1s';
DO $guard$ BEGIN IF to_regprocedure('public.run_admin_chat_customer_case(uuid,text,jsonb,integer)') IS NULL THEN RAISE EXCEPTION 'customer_case_153_required' USING ERRCODE='22023'; END IF; END $guard$;
CREATE INDEX IF NOT EXISTS admin_chat_case_pets_idx ON public.pet_profile(customer_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS admin_chat_case_orders_idx ON public.sales_order(customer_id,created_at DESC,id DESC);
CREATE OR REPLACE FUNCTION public.run_admin_chat_customer_case(p_lease uuid,p_tool text,p_filters jsonb,p_max_bytes integer DEFAULT 32768)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $function$
DECLARE result jsonb; allowed text[]; rights text[]; required text; q text; owner_id uuid; direction text; at_time timestamptz:=now();
BEGIN
 IF p_max_bytes IS NULL OR p_max_bytes NOT BETWEEN 1 AND 32768 OR p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR octet_length(p_filters::text)>2000 THEN RAISE EXCEPTION 'invalid_customer_case' USING ERRCODE='22023'; END IF;
 CASE p_tool
 WHEN 'internal.customer_resolve' THEN allowed:=ARRAY['query'];rights:=ARRAY['customer.read','customer_profile.read','customer_phone.read'];
 WHEN 'internal.customer_appointment' THEN allowed:=ARRAY['customerId','direction'];rights:=ARRAY['customer.read','appointment.read','appointment_item.read'];
 WHEN 'internal.customer_tickets' THEN allowed:=ARRAY['customerId'];rights:=ARRAY['customer.read','support_ticket.read'];
 WHEN 'internal.customer_pets' THEN allowed:=ARRAY['customerId'];rights:=ARRAY['customer.read','pet_profile.read','pet_breed.read','pet_species.read'];
 WHEN 'internal.customer_latest_order' THEN allowed:=ARRAY['customerId'];rights:=ARRAY['customer.read','sales_order.read'];
 ELSE RAISE EXCEPTION 'unsupported_customer_case_tool' USING ERRCODE='22023';
 END CASE;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_filters)e WHERE NOT e.key=ANY(allowed) OR jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>120 OR (e.value#>>'{}') ~ '[[:cntrl:]]') THEN RAISE EXCEPTION 'invalid_customer_case_filter' USING ERRCODE='22023'; END IF;
 FOREACH required IN ARRAY rights LOOP
  IF auth.uid() IS NULL OR NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'customer_case_forbidden' USING ERRCODE='42501'; END IF;
 END LOOP;
 IF p_tool='internal.customer_resolve' THEN
  q:=btrim(coalesce(p_filters->>'query',''));IF length(q)<3 THEN RAISE EXCEPTION 'customer_case_query_required' USING ERRCODE='22023'; END IF;
  IF q ~ '^\+?[0-9 .-]{9,30}$' THEN q:=regexp_replace(q,'[ .-]','','g'); END IF;
 ELSE
  IF coalesce(p_filters->>'customerId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'invalid_customer_case_identity' USING ERRCODE='22023'; END IF;
  owner_id:=(p_filters->>'customerId')::uuid;
  IF p_tool='internal.customer_appointment' THEN direction:=p_filters->>'direction';IF direction IS NULL OR direction NOT IN ('upcoming','recent') THEN RAISE EXCEPTION 'invalid_customer_case_direction' USING ERRCODE='22023'; END IF; END IF;
 END IF;
 PERFORM pawpal_private.admit_chat_read_source(p_lease);
 IF p_tool='internal.customer_resolve' THEN
  IF q ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
   SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM (SELECT c.id,c.customer_code code,left(coalesce(cp.full_name,c.customer_code),200) name FROM public.customer c LEFT JOIN public.customer_profile cp ON cp.customer_id=c.id WHERE c.id=q::uuid)x;
  ELSIF q ~ '^\+?[0-9]{9,15}$' THEN
   SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM (SELECT DISTINCT c.id,c.customer_code code,left(coalesce(cp.full_name,c.customer_code),200) name FROM public.customer_phone ph JOIN public.customer c ON c.id=ph.customer_id LEFT JOIN public.customer_profile cp ON cp.customer_id=c.id WHERE ph.phone_number=q ORDER BY c.id LIMIT 2)x;
  ELSE
   SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM (SELECT c.id,c.customer_code code,left(coalesce(cp.full_name,c.customer_code),200) name FROM public.customer c LEFT JOIN public.customer_profile cp ON cp.customer_id=c.id WHERE c.customer_code=q OR c.customer_code=upper(q) ORDER BY c.id LIMIT 2)x;
   IF jsonb_array_length(result)=0 THEN
    SELECT coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) INTO result FROM (SELECT c.id,c.customer_code code,left(cp.full_name,200) name FROM public.customer_profile cp JOIN public.customer c ON c.id=cp.customer_id WHERE public.admin_sales_search_text(cp.full_name)=public.admin_sales_search_text(q) ORDER BY c.id LIMIT 2)x;
   END IF;
  END IF;
  result:=jsonb_build_object('total',jsonb_array_length(result),'items',result,'source','customer, customer_profile, customer_phone','match_limit',2);
 ELSE
  IF NOT EXISTS(SELECT 1 FROM public.customer WHERE id=owner_id) THEN RAISE EXCEPTION 'customer_case_unavailable' USING ERRCODE='42501'; END IF;
  IF p_tool='internal.customer_appointment' THEN
   IF direction='upcoming' THEN
    SELECT jsonb_build_object('total',count(*),'items',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) INTO result FROM (SELECT a.appointment_code code,a.appointment_status status,a.scheduled_start_at scheduled_at,left((SELECT string_agg(ai.name_snapshot,', ' ORDER BY ai.id) FROM public.appointment_item ai WHERE ai.appointment_id=a.id AND ai.status<>'cancelled'),600) services FROM public.appointment a WHERE a.customer_id=owner_id AND a.scheduled_start_at>=at_time AND a.appointment_status NOT IN ('cancelled','no_show','completed') ORDER BY a.scheduled_start_at,a.id LIMIT 1)x;
   ELSE
    SELECT jsonb_build_object('total',count(*),'items',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb)) INTO result FROM (SELECT a.appointment_code code,a.appointment_status status,a.scheduled_start_at scheduled_at,left((SELECT string_agg(ai.name_snapshot,', ' ORDER BY ai.id) FROM public.appointment_item ai WHERE ai.appointment_id=a.id AND ai.status<>'cancelled'),600) services FROM public.appointment a WHERE a.customer_id=owner_id AND a.scheduled_start_at<at_time AND a.appointment_status NOT IN ('cancelled','no_show') ORDER BY a.scheduled_start_at DESC,a.id DESC LIMIT 1)x;
   END IF;
   result:=result||jsonb_build_object('source','appointment, appointment_item');
  ELSIF p_tool='internal.customer_pets' THEN
   WITH matched AS NOT MATERIALIZED (SELECT p.id,p.customer_id,p.pet_code code,left(p.pet_name,200) name,p.status,left(b.breed_name,160) breed,left(s.species_name,160) species,p.created_at FROM public.pet_profile p LEFT JOIN public.pet_breed b ON b.id=p.breed_id LEFT JOIN public.pet_species s ON s.id=b.species_id WHERE p.customer_id=owner_id)
   SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(to_jsonb(x)-'id' ORDER BY created_at DESC,id DESC) FROM (SELECT * FROM matched ORDER BY created_at DESC,id DESC LIMIT 10)x),'[]'::jsonb),'source','pet_profile, pet_breed, pet_species') INTO result;
  ELSIF p_tool='internal.customer_latest_order' THEN
   SELECT jsonb_build_object('total',count(*),'items',coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb),'source','sales_order') INTO result FROM (SELECT o.customer_id,o.order_code code,o.order_status status,o.created_at FROM public.sales_order o WHERE o.customer_id=owner_id ORDER BY o.created_at DESC,o.id DESC LIMIT 1)x;
  ELSE
   WITH matched AS NOT MATERIALIZED (SELECT id,ticket_code code,left(subject,300) subject,status,priority,created_at FROM public.support_ticket WHERE customer_id=owner_id AND status NOT IN ('completed','resolved','closed','rejected','cancelled','da_giai_quyet','da_dong','tu_choi'))
   SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(to_jsonb(x)-'id' ORDER BY created_at DESC,id DESC) FROM (SELECT * FROM matched ORDER BY created_at DESC,id DESC LIMIT 10)x),'[]'::jsonb),'source','support_ticket') INTO result;
  END IF;
 END IF;
 result:=result||jsonb_build_object('intent',p_tool,'scope',p_filters,'as_of',at_time,'limitations','[]'::jsonb);
 IF octet_length(convert_to(result::text,'UTF8'))>p_max_bytes THEN RAISE EXCEPTION 'customer_case_payload_exceeded' USING ERRCODE='54000'; END IF;
 RETURN result;
END $function$;
REVOKE ALL ON FUNCTION public.run_admin_chat_customer_case(uuid,text,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.run_admin_chat_customer_case(uuid,text,jsonb,integer) TO authenticated;
NOTIFY pgrst,'reload schema';

CREATE OR REPLACE FUNCTION public.admin_copilot_sessions_bounded(p_query text DEFAULT '',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb;
BEGIN
 IF p_query IS NULL OR length(p_query)>2000 OR p_page IS NULL OR p_page<1 THEN RAISE EXCEPTION 'invalid_history_page' USING ERRCODE='22023'; END IF;
 PERFORM pawpal_private.admit_chat_history_read();
 result:=public.admin_copilot_session_page(p_query,p_page);
 IF octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_history_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_copilot_history_page(p_session uuid DEFAULT NULL,p_offset integer DEFAULT 0,p_with_title boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb; actor uuid; title text; message jsonb; messages jsonb:='[]'; candidate jsonb; seen integer:=0; more boolean:=false;
BEGIN
 IF NOT pawpal_private.has_permission('admin_copilot_history.read') THEN RAISE EXCEPTION 'copilot_history_forbidden' USING ERRCODE='42501'; END IF;
 IF p_offset IS NULL OR p_offset<0 OR p_with_title IS NULL THEN RAISE EXCEPTION 'invalid_history_page' USING ERRCODE='22023'; END IF;
 PERFORM pawpal_private.admit_chat_history_read();
 actor:=(public.get_staff_login_context()->'staff'->>'id')::uuid;
 IF actor IS NULL THEN RAISE EXCEPTION 'copilot_history_forbidden' USING ERRCODE='42501'; END IF;
 IF p_with_title AND p_session IS NOT NULL THEN
  SELECT left(coalesce(h.metadata->>'session_title',h.content),80) INTO title FROM public.admin_copilot_history h
  WHERE h.staff_id=actor AND h.session_id=p_session ORDER BY h.created_at,h.id LIMIT 1;
 END IF;
 result:=jsonb_build_object('history','[]'::jsonb,'hasMore',false)||CASE WHEN title IS NOT NULL THEN jsonb_build_object('title',title) ELSE '{}'::jsonb END;
 FOR message IN SELECT to_jsonb(h) FROM (
  SELECT h.id,h.session_id,h.role,h.content,h.metadata,h.created_at FROM public.admin_copilot_history h
  WHERE h.staff_id=actor AND (p_session IS NULL OR h.session_id=p_session)
  ORDER BY h.created_at DESC,h.id DESC OFFSET p_offset LIMIT 31) h LOOP
  IF seen=30 THEN more:=true; EXIT; END IF;
  candidate:=jsonb_set(result,'{history}',messages||jsonb_build_array(message));
  IF octet_length(convert_to(candidate::text,'UTF8'))>32768 THEN
   IF seen>0 THEN more:=true; EXIT; END IF;
   message:=message||jsonb_build_object('content',left(message->>'content',1200),'content_partial',length(message->>'content')>1200,
    'content_offset',least(1200,length(message->>'content')),'content_revision',md5(message->>'content'));
   candidate:=jsonb_set(result,'{history}',jsonb_build_array(message));
   IF octet_length(convert_to(candidate::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_history_payload_limit' USING ERRCODE='54000'; END IF;
  END IF;
  messages:=messages||jsonb_build_array(message);seen:=seen+1;
 END LOOP;
 SELECT coalesce(jsonb_agg(value ORDER BY ordinality DESC),'[]'::jsonb) INTO messages FROM jsonb_array_elements(messages) WITH ORDINALITY;
 RETURN result||jsonb_build_object('history',messages,'hasMore',more);
END $$;
REVOKE ALL ON FUNCTION public.admin_copilot_sessions_bounded(text,integer),public.admin_copilot_history_page(uuid,integer,boolean) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.admin_copilot_sessions_bounded(text,integer),public.admin_copilot_history_page(uuid,integer,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.read_admin_chat_benchmark_snapshot()
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb; required text; slot integer; admitted boolean:=false;
BEGIN
 FOREACH required IN ARRAY ARRAY['chatbot_scenario_matrix.read','chatbot_scenario_matrix.write','chatbot_profanity_filter.read','chatbot_sentiment_trigger.read','audit_log.write'] LOOP
  IF auth.uid() IS NULL OR NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'benchmark_read_forbidden' USING ERRCODE='42501'; END IF;
 END LOOP;
 FOR slot IN 1..4 LOOP
  IF pg_try_advisory_xact_lock(hashtext('pawpal_chat_read_source_v1'),slot) THEN admitted:=true;EXIT; END IF;
 END LOOP;
 IF NOT admitted THEN RAISE EXCEPTION 'chat_read_source_busy' USING ERRCODE='PT429'; END IF;
 SELECT jsonb_build_object(
 'profanity',coalesce((SELECT jsonb_agg(to_jsonb(r)-'id' ORDER BY r.id) FROM (SELECT id,keyword,action,replacement_text,is_active FROM public.chatbot_profanity_filter ORDER BY id LIMIT 501) r),'[]'::jsonb),
 'sentiment',coalesce((SELECT jsonb_agg(to_jsonb(r)-'id' ORDER BY r.id) FROM (SELECT id,tier_level,trigger_pattern,is_active FROM public.chatbot_sentiment_trigger ORDER BY id LIMIT 501) r),'[]'::jsonb),
 'scenarios',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY r.id) FROM (SELECT * FROM public.chatbot_scenario_matrix ORDER BY id LIMIT 501) r),'[]'::jsonb)) INTO result;
 IF jsonb_array_length(result->'profanity')>500 OR jsonb_array_length(result->'sentiment')>500 OR jsonb_array_length(result->'scenarios')>500 OR octet_length(convert_to(result::text,'UTF8'))>65536 THEN RAISE EXCEPTION 'benchmark_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_admin_chat_benchmark_snapshot() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.read_admin_chat_benchmark_snapshot() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
