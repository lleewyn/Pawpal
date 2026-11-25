BEGIN;
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
COMMIT;
