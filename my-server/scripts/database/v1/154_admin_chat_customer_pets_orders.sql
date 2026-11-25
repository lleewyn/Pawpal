BEGIN;
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
COMMIT;
