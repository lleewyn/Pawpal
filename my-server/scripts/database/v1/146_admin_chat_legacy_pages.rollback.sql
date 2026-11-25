BEGIN;
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
DROP FUNCTION IF EXISTS public.run_admin_chat_page(uuid,text,jsonb,integer);
NOTIFY pgrst,'reload schema';
COMMIT;
