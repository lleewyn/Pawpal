-- Closed customer relationships for work-role reads; does not enable the HTTP assistant.
BEGIN;
SET LOCAL lock_timeout='2s';
CREATE FUNCTION public.read_staff_copilot_relations(p_tool text,p_filters jsonb DEFAULT '{}'::jsonb,p_max_bytes integer DEFAULT 32768)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=pawpal_private.work_actor(); needed text; allowed text[]; owner_id uuid; q text; direction text;
 rows jsonb; result jsonb; page_value integer; offset_value integer; at_time timestamptz:=statement_timestamp();
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=actor AND role_code='STAFF')
 OR NOT pawpal_private.has_permission('work.copilot.use') OR NOT pawpal_private.has_permission('work.customer.read') THEN
  RAISE EXCEPTION 'staff_copilot_forbidden' USING ERRCODE='42501'; END IF;
 CASE p_tool
 WHEN 'internal.customer_resolve' THEN allowed:=ARRAY['query'];needed:='work.customer.read';
 WHEN 'internal.customer_appointment' THEN allowed:=ARRAY['customerId','direction'];needed:='work.service.perform';
 WHEN 'internal.customer_tickets' THEN allowed:=ARRAY['customerId','page'];needed:='work.complaint.handle';
 WHEN 'internal.customer_pets' THEN allowed:=ARRAY['customerId','page'];needed:='work.pet.read';
 WHEN 'internal.customer_latest_order' THEN allowed:=ARRAY['customerId'];needed:='work.sales.create';
 ELSE RAISE EXCEPTION 'staff_copilot_tool_forbidden' USING ERRCODE='42501'; END CASE;
 IF NOT pawpal_private.has_permission(needed) THEN RAISE EXCEPTION 'staff_copilot_tool_forbidden' USING ERRCODE='42501'; END IF;
 IF p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR octet_length(p_filters::text)>2048 OR p_max_bytes IS NULL OR p_max_bytes NOT BETWEEN 512 AND 32768 THEN RAISE EXCEPTION 'invalid_staff_copilot_request' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_filters) k WHERE NOT k=ANY(allowed)) THEN RAISE EXCEPTION 'staff_copilot_scope_filter_forbidden' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_filters) e WHERE jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>120 OR (e.value#>>'{}')~'[[:cntrl:]]') THEN RAISE EXCEPTION 'invalid_staff_copilot_filter' USING ERRCODE='22023'; END IF;
 IF coalesce(p_filters->>'page','1')!~'^[1-9][0-9]{0,3}$' THEN RAISE EXCEPTION 'invalid_staff_copilot_page' USING ERRCODE='22023'; END IF;
 page_value:=coalesce(p_filters->>'page','1')::integer;
 IF page_value>1000 THEN RAISE EXCEPTION 'invalid_staff_copilot_page' USING ERRCODE='22023'; END IF;
 offset_value:=(page_value-1)*10;
 IF p_tool='internal.customer_resolve' THEN
  q:=btrim(coalesce(p_filters->>'query',''));
  IF length(q)<3 THEN RAISE EXCEPTION 'staff_copilot_query_required' USING ERRCODE='22023'; END IF;
  IF q~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
   SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT c.id,c.customer_code code,left(p.full_name,200) name FROM public.customer c JOIN public.customer_profile p ON p.customer_id=c.id WHERE c.id=q::uuid)t;
  ELSIF q~'^\+?[0-9]{9,15}$' THEN
   SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT c.id,c.customer_code code,left(p.full_name,200) name FROM public.customer c JOIN public.customer_profile p ON p.customer_id=c.id WHERE EXISTS(SELECT 1 FROM public.customer_phone ph WHERE ph.customer_id=c.id AND ph.phone_number=q) ORDER BY c.id LIMIT 2)t;
  ELSE
   SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT c.id,c.customer_code code,left(p.full_name,200) name FROM public.customer c JOIN public.customer_profile p ON p.customer_id=c.id WHERE lower(c.customer_code)=lower(q) ORDER BY c.id LIMIT 2)t;
   IF jsonb_array_length(rows)=0 THEN
    SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT c.id,c.customer_code code,left(p.full_name,200) name FROM public.customer c JOIN public.customer_profile p ON p.customer_id=c.id WHERE public.admin_sales_search_text(p.full_name)=public.admin_sales_search_text(q) ORDER BY c.id LIMIT 2)t;
   END IF;
  END IF;
 ELSE
  IF coalesce(p_filters->>'customerId','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'invalid_staff_customer_identity' USING ERRCODE='22023'; END IF;
  owner_id:=(p_filters->>'customerId')::uuid;
  IF NOT EXISTS(SELECT 1 FROM public.customer WHERE id=owner_id) THEN RAISE EXCEPTION 'staff_customer_unavailable' USING ERRCODE='42501'; END IF;
  CASE p_tool
  WHEN 'internal.customer_appointment' THEN
   direction:=p_filters->>'direction';
   IF direction IS NULL OR direction NOT IN ('upcoming','recent') THEN RAISE EXCEPTION 'invalid_customer_case_direction' USING ERRCODE='22023'; END IF;
   SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT a.id,a.customer_id,a.appointment_code code,a.appointment_status status,a.scheduled_start_at scheduled_at
    FROM public.appointment a WHERE a.customer_id=owner_id AND pawpal_private.work_owns_appointment(a.id)
    AND CASE WHEN direction='upcoming' THEN a.scheduled_start_at>=at_time AND a.appointment_status NOT IN ('cancelled','no_show','completed') ELSE a.scheduled_start_at<at_time AND a.appointment_status NOT IN ('cancelled','no_show') END
    ORDER BY CASE WHEN direction='upcoming' THEN a.scheduled_start_at END,CASE WHEN direction='recent' THEN a.scheduled_start_at END DESC,a.id LIMIT 1)t;
  WHEN 'internal.customer_tickets' THEN
   SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT id,customer_id,ticket_code code,left(subject,250) subject,status,priority FROM public.support_ticket WHERE customer_id=owner_id AND assigned_staff_id=actor AND status NOT IN ('resolved','closed','cancelled','rejected') ORDER BY created_at DESC,id LIMIT 10 OFFSET offset_value)t;
  WHEN 'internal.customer_pets' THEN
   SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT id,customer_id,pet_code code,left(pet_name,200) name,status FROM public.pet_profile WHERE customer_id=owner_id ORDER BY pet_name,id LIMIT 10 OFFSET offset_value)t;
  WHEN 'internal.customer_latest_order' THEN
   SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT id,customer_id,order_code code,order_status status,created_at FROM public.sales_order WHERE customer_id=owner_id ORDER BY created_at DESC,id DESC LIMIT 1)t;
  END CASE;
 END IF;
 result:=jsonb_build_object('intent',p_tool,'audience','staff','items',coalesce(rows,'[]'::jsonb),'total',jsonb_array_length(coalesce(rows,'[]'::jsonb)),
  'total_is_page',true,'page',page_value,'page_size',10,'scope',p_filters||jsonb_build_object('current_staff',true),
  'source','Quan hệ khách hàng trong quyền công việc hiện tại','as_of',at_time,'limitations',jsonb_build_array('Chỉ gồm kết quả của trang hiện tại; lịch và phiếu chỉ thuộc công việc được giao.'));
 IF p_tool='internal.customer_resolve' THEN result:=result||jsonb_build_object('match_limit',2); END IF;
 IF octet_length(result::text)>p_max_bytes THEN RAISE EXCEPTION 'staff_copilot_payload_exceeded' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_staff_copilot_relations(text,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_staff_copilot_relations(text,jsonb,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
