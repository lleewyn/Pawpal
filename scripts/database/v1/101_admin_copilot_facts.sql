-- Caller-scoped, bounded, read-only business queries. No model-generated SQL.
CREATE OR REPLACE FUNCTION public.admin_copilot_facts(p_intent text,p_filters jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; start_at timestamptz; end_at timestamptz; query_text text:=btrim(coalesce(p_filters->>'query','')); required text;
BEGIN
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
  WITH matched AS MATERIALIZED (
   SELECT a.id,a.appointment_code code,a.appointment_status status,a.scheduled_start_at scheduled_at,
    coalesce((SELECT string_agg(DISTINCT s.service_name,', ' ORDER BY s.service_name) FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id WHERE i.appointment_id=a.id AND i.status<>'cancelled'),'') services
   FROM public.appointment a WHERE a.scheduled_start_at>=start_at AND a.scheduled_start_at<end_at
    AND (p_filters->>'status' IS NULL OR a.appointment_status=p_filters->>'status')
    AND (p_filters->>'category' IS NULL OR EXISTS(SELECT 1 FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id JOIN public.service_category c ON c.id=s.category_id WHERE i.appointment_id=a.id AND i.status<>'cancelled' AND c.category_code=p_filters->>'category'))
  ) SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(to_jsonb(x)-'id' ORDER BY x.scheduled_at,x.code) FROM (SELECT * FROM matched ORDER BY scheduled_at,code LIMIT 20) x),'[]'::jsonb),'source','appointment, appointment_item, service, service_category') INTO result;
 ELSIF p_intent='inventory.low_stock' THEN
  FOREACH required IN ARRAY ARRAY['inventory.read','product_variant.read','product.read'] LOOP
   IF NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  END LOOP;
  WITH matched AS MATERIALIZED (
   SELECT v.sku_variant sku,p.product_name name,i.quantity_in_stock stock,i.minimum_stock minimum
   FROM public.inventory i JOIN public.product_variant v ON v.id=i.product_variant_id JOIN public.product p ON p.id=v.product_id
   WHERE p.status='active' AND v.status='active' AND NOT v.catalog_retired AND i.quantity_in_stock<i.minimum_stock
    AND (query_text='' OR strpos(lower(v.sku_variant||' '||p.product_name),lower(query_text))>0)
  ) SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.stock,x.sku) FROM (SELECT * FROM matched ORDER BY stock,sku LIMIT 20) x),'[]'::jsonb),'source','inventory, product_variant, product','condition','quantity_in_stock < minimum_stock; chỉ SKU đang bán') INTO result;
 ELSIF p_intent='ticket.open' THEN
  IF NOT pawpal_private.has_permission('support_ticket.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  WITH matched AS MATERIALIZED (
   SELECT ticket_code code,subject,status,priority,created_at FROM public.support_ticket
   WHERE status NOT IN ('completed','resolved','closed','rejected','cancelled') AND (start_at IS NULL OR created_at>=start_at AND created_at<end_at)
  ) SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.code) FROM (SELECT * FROM matched ORDER BY created_at,code LIMIT 20) x),'[]'::jsonb),'source','support_ticket','condition','Phiếu chưa kết thúc; giới hạn ngày tạo nếu được yêu cầu') INTO result;
 ELSIF p_intent='customer.lookup' THEN
  FOREACH required IN ARRAY ARRAY['customer.read','customer_profile.read','customer_phone.read'] LOOP
   IF NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  END LOOP;
  IF length(query_text)<3 THEN RAISE EXCEPTION 'copilot_query_required' USING ERRCODE='22023'; END IF;
  WITH matched AS MATERIALIZED (
   SELECT c.customer_code code,p.full_name name,c.customer_status status,
    (SELECT phone_number FROM public.customer_phone WHERE customer_id=c.id AND is_primary LIMIT 1) phone
   FROM public.customer c LEFT JOIN public.customer_profile p ON p.customer_id=c.id
   WHERE strpos(lower(c.customer_code||' '||coalesce(p.full_name,'')),lower(query_text))>0
    OR EXISTS(SELECT 1 FROM public.customer_phone cp WHERE cp.customer_id=c.id AND strpos(cp.phone_number,query_text)>0)
  ) SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.code) FROM (SELECT * FROM matched ORDER BY code LIMIT 10) x),'[]'::jsonb),'source','customer, customer_profile, customer_phone') INTO result;
 ELSIF p_intent='order.lookup' THEN
  IF NOT pawpal_private.has_permission('sales_order.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  IF length(query_text)<3 THEN RAISE EXCEPTION 'copilot_query_required' USING ERRCODE='22023'; END IF;
  WITH matched AS MATERIALIZED (
   SELECT order_code code,order_status status,shipping_status,tracking_code,created_at FROM public.sales_order WHERE strpos(lower(order_code),lower(query_text))>0
  ) SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC,x.code) FROM (SELECT * FROM matched ORDER BY created_at DESC,code LIMIT 10) x),'[]'::jsonb),'source','sales_order') INTO result;
 ELSIF p_intent='catalog.service' THEN
  IF NOT pawpal_private.has_permission('service.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  WITH matched AS MATERIALIZED (SELECT service_code code,service_name name,left(description,600) description,status FROM public.service WHERE status='active' AND (query_text='' OR strpos(lower(service_code||' '||service_name),lower(query_text))>0))
  SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.code) FROM (SELECT * FROM matched ORDER BY code LIMIT 20) x),'[]'::jsonb),'source','service','limitations','Không báo giá từ mô tả; cần chọn đúng biến thể khi đặt lịch.') INTO result;
 ELSIF p_intent='catalog.product' THEN
  IF NOT pawpal_private.has_permission('product.read') OR NOT pawpal_private.has_permission('product_variant.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
  WITH matched AS MATERIALIZED (
   SELECT p.product_code code,p.product_name name,v.sku_variant sku,v.variant_name variant,v.sale_price price
   FROM public.product p JOIN public.product_variant v ON v.product_id=p.id WHERE p.status='active' AND v.status='active' AND NOT v.catalog_retired
    AND (query_text='' OR strpos(lower(p.product_name||' '||v.sku_variant),lower(query_text))>0)
  ) SELECT jsonb_build_object('total',(SELECT count(*) FROM matched),'items',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.sku) FROM (SELECT * FROM matched ORDER BY sku LIMIT 20) x),'[]'::jsonb),'source','product, product_variant','unit','SKU') INTO result;
 ELSE RAISE EXCEPTION 'unsupported_copilot_intent' USING ERRCODE='22023';
 END IF;
 RETURN result||jsonb_build_object('intent',p_intent,'scope',p_filters,'as_of',now(),'time_zone','Asia/Ho_Chi_Minh','limit',CASE WHEN p_intent IN ('customer.lookup','order.lookup') THEN 10 ELSE 20 END);
END $$;
REVOKE ALL ON FUNCTION public.admin_copilot_facts(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_copilot_facts(text,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_copilot_recent_context(p_session uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF p_session IS NULL OR auth.uid() IS NULL OR NOT pawpal_private.has_permission('admin_copilot_history.read') THEN RAISE EXCEPTION 'copilot_forbidden' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('role',h.role,'content',left(h.content,1200)) ORDER BY h.created_at,h.id),'[]'::jsonb) INTO result
 FROM (SELECT id,role,content,created_at FROM public.admin_copilot_history WHERE session_id=p_session AND staff_id=(public.get_staff_login_context()->'staff'->>'id')::uuid ORDER BY created_at DESC,id DESC LIMIT 6) h;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_copilot_recent_context(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_copilot_recent_context(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_copilot_chat_context(p_conversation uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('sender_type',m->>'sender_type','content',left(m->>'content',800)) ORDER BY ord),'[]'::jsonb)
 FROM jsonb_array_elements(public.get_admin_chat_messages(p_conversation,NULL,NULL)) WITH ORDINALITY t(m,ord) WHERE ord<=12
$$;
REVOKE ALL ON FUNCTION public.admin_copilot_chat_context(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_copilot_chat_context(uuid) TO authenticated;
