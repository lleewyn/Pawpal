-- Shared STAFF request admission and inherited context. Does not enable POST/model/UI.
BEGIN;
SET LOCAL lock_timeout='2s';
CREATE TABLE pawpal_private.staff_copilot_rate (
 auth_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 window_start timestamptz NOT NULL,
 requests integer NOT NULL CHECK(requests BETWEEN 1 AND 10)
);
CREATE TABLE pawpal_private.staff_copilot_slot (
 slot smallint PRIMARY KEY CHECK(slot BETWEEN 1 AND 2),
 auth_user_id uuid,staff_id uuid,lease uuid UNIQUE,request_id uuid,session_id uuid,
 question_hash text,scope_token text,expires_at timestamptz,
 source_calls integer NOT NULL DEFAULT 0 CHECK(source_calls BETWEEN 0 AND 3),
 source_bytes integer NOT NULL DEFAULT 0 CHECK(source_bytes BETWEEN 0 AND 65536),
 context_loaded boolean NOT NULL DEFAULT false,completed boolean NOT NULL DEFAULT false,
 context_refs jsonb NOT NULL DEFAULT '[]' CHECK(jsonb_typeof(context_refs)='array' AND jsonb_array_length(context_refs)<=64 AND octet_length(context_refs::text)<=16384)
);
INSERT INTO pawpal_private.staff_copilot_slot(slot) VALUES(1),(2);
ALTER TABLE pawpal_private.staff_copilot_slot ENABLE ROW LEVEL SECURITY;
ALTER TABLE pawpal_private.staff_copilot_rate ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pawpal_private.staff_copilot_slot,pawpal_private.staff_copilot_rate FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.acquire_staff_copilot_request(p_request uuid,p_session uuid,p_question text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET lock_timeout='1s' SET statement_timeout='2s' AS $$
DECLARE scope jsonb:=pawpal_private.staff_copilot_scope(auth.uid()); chosen smallint; token uuid; rate pawpal_private.staff_copilot_rate; at_time timestamptz:=clock_timestamp();
BEGIN
 IF p_request IS NULL OR p_session IS NULL OR coalesce(length(btrim(p_question)),0) NOT BETWEEN 1 AND 2000 OR length(p_question)>2000 THEN RAISE EXCEPTION 'invalid_staff_request' USING ERRCODE='22023'; END IF;
 IF NOT pg_try_advisory_xact_lock(hashtext('pawpal_staff_copilot_admission_v1'),0) THEN RAISE EXCEPTION 'staff_request_busy' USING ERRCODE='PT429'; END IF;
 IF EXISTS(SELECT 1 FROM pawpal_private.staff_copilot_slot WHERE expires_at>at_time AND (auth_user_id=auth.uid() OR request_id=p_request)) THEN RAISE EXCEPTION 'staff_request_busy' USING ERRCODE='PT429'; END IF;
 SELECT slot INTO chosen FROM pawpal_private.staff_copilot_slot WHERE expires_at IS NULL OR expires_at<=at_time ORDER BY slot LIMIT 1 FOR UPDATE SKIP LOCKED;
 IF chosen IS NULL THEN RAISE EXCEPTION 'staff_request_busy' USING ERRCODE='PT429'; END IF;
 SELECT * INTO rate FROM pawpal_private.staff_copilot_rate WHERE auth_user_id=auth.uid() FOR UPDATE;
 IF FOUND AND rate.window_start>at_time-interval '60 seconds' AND rate.requests>=10 THEN RAISE EXCEPTION 'staff_request_rate_limited' USING ERRCODE='PT429'; END IF;
 INSERT INTO pawpal_private.staff_copilot_rate(auth_user_id,window_start,requests) VALUES(auth.uid(),at_time,1)
 ON CONFLICT(auth_user_id) DO UPDATE SET window_start=CASE WHEN staff_copilot_rate.window_start<=at_time-interval '60 seconds' THEN at_time ELSE staff_copilot_rate.window_start END,
 requests=CASE WHEN staff_copilot_rate.window_start<=at_time-interval '60 seconds' THEN 1 ELSE staff_copilot_rate.requests+1 END;
 token:=extensions.gen_random_uuid();
 UPDATE pawpal_private.staff_copilot_slot SET auth_user_id=auth.uid(),staff_id=(scope->>'staff_id')::uuid,lease=token,request_id=p_request,session_id=p_session,
  question_hash=md5(p_question),scope_token=scope->>'scope_token',expires_at=at_time+interval '45 seconds',source_calls=0,source_bytes=0,context_loaded=false,context_refs='[]',completed=false WHERE slot=chosen;
 RETURN jsonb_build_object('lease',token,'scope_token',scope->>'scope_token','scope_version',1,'expires_at',at_time+interval '45 seconds');
END $$;
REVOKE ALL ON FUNCTION public.acquire_staff_copilot_request(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.acquire_staff_copilot_request(uuid,uuid,text) TO authenticated;

CREATE FUNCTION public.release_staff_copilot_request(p_lease uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET lock_timeout='1s' AS $$
BEGIN
 -- Identity-only release still works after a role/permission has been revoked.
 UPDATE pawpal_private.staff_copilot_slot SET auth_user_id=NULL,staff_id=NULL,lease=NULL,request_id=NULL,session_id=NULL,question_hash=NULL,scope_token=NULL,expires_at=NULL,
 source_calls=0,source_bytes=0,context_loaded=false,context_refs='[]',completed=false WHERE lease=p_lease AND auth_user_id=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.release_staff_copilot_request(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.release_staff_copilot_request(uuid) TO authenticated;

CREATE FUNCTION pawpal_private.staff_copilot_request(p_lease uuid,p_auth uuid) RETURNS pawpal_private.staff_copilot_slot
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE item pawpal_private.staff_copilot_slot; scope jsonb;
BEGIN
 SELECT * INTO item FROM pawpal_private.staff_copilot_slot WHERE lease=p_lease AND auth_user_id=p_auth FOR UPDATE;
 IF NOT FOUND OR item.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'staff_request_expired' USING ERRCODE='42501'; END IF;
 scope:=pawpal_private.staff_copilot_scope(p_auth);
 IF item.staff_id IS DISTINCT FROM (scope->>'staff_id')::uuid OR item.scope_token IS DISTINCT FROM scope->>'scope_token' THEN RAISE EXCEPTION 'staff_request_scope_changed' USING ERRCODE='PT409'; END IF;
 RETURN item;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.staff_copilot_request(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.run_staff_copilot_read(p_lease uuid,p_tool text,p_filters jsonb,p_max_bytes integer DEFAULT 32768) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET lock_timeout='1s' SET statement_timeout='6s' AS $$
DECLARE item pawpal_private.staff_copilot_slot; result jsonb; allocation integer; size integer;
BEGIN
 item:=pawpal_private.staff_copilot_request(p_lease,auth.uid());
 IF item.completed OR item.source_calls>=3 THEN RAISE EXCEPTION 'staff_source_budget_exhausted' USING ERRCODE='54000'; END IF;
 IF p_max_bytes IS NULL OR p_max_bytes NOT BETWEEN 512 AND 32768 THEN RAISE EXCEPTION 'invalid_staff_read_budget' USING ERRCODE='22023'; END IF;
 allocation:=least(p_max_bytes,65536-item.source_bytes);
 IF allocation<512 THEN RAISE EXCEPTION 'staff_source_budget_exhausted' USING ERRCODE='54000'; END IF;
 CASE
 WHEN p_tool IN ('internal.customer_resolve','internal.customer_appointment','internal.customer_tickets','internal.customer_pets','internal.customer_latest_order') THEN result:=public.read_staff_copilot_relations(p_tool,p_filters,allocation);
 WHEN p_tool IN ('catalog.service_price','catalog.price_rows','hotel.availability') THEN result:=public.read_staff_copilot_booking(p_tool,p_filters,allocation);
 ELSE result:=public.read_staff_copilot(p_tool,p_filters,allocation);
 END CASE;
 size:=octet_length(result::text);
 IF size>allocation THEN RAISE EXCEPTION 'staff_source_payload_exceeded' USING ERRCODE='54000'; END IF;
 UPDATE pawpal_private.staff_copilot_slot SET source_calls=source_calls+1,source_bytes=source_bytes+size WHERE slot=item.slot;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.run_staff_copilot_read(uuid,text,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.run_staff_copilot_read(uuid,text,jsonb,integer) TO authenticated;

CREATE FUNCTION public.read_staff_copilot_request_context(p_lease uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET lock_timeout='1s' SET statement_timeout='6s' AS $$
DECLARE item pawpal_private.staff_copilot_slot; messages jsonb; refs jsonb; size integer;
BEGIN
 item:=pawpal_private.staff_copilot_request(p_lease,auth.uid());
 IF item.completed OR item.context_loaded THEN RAISE EXCEPTION 'staff_context_already_loaded' USING ERRCODE='PT409'; END IF;
 messages:=public.staff_copilot_recent_context(item.session_id);
 SELECT coalesce(jsonb_agg(ref ORDER BY ref::text),'[]') INTO refs FROM (SELECT DISTINCT r.value ref FROM jsonb_array_elements(messages) m CROSS JOIN LATERAL jsonb_array_elements(m->'metadata'->'scope_refs') r)t;
 IF jsonb_array_length(refs)>64 OR octet_length(refs::text)>16384 THEN RAISE EXCEPTION 'staff_context_scope_exceeded' USING ERRCODE='54000'; END IF;
 size:=octet_length(messages::text);
 IF size>32768 OR size+item.source_bytes>65536 THEN RAISE EXCEPTION 'staff_context_payload_exceeded' USING ERRCODE='54000'; END IF;
 UPDATE pawpal_private.staff_copilot_slot SET context_loaded=true,context_refs=refs,source_bytes=source_bytes+size WHERE slot=item.slot;
 RETURN messages;
END $$;
REVOKE ALL ON FUNCTION public.read_staff_copilot_request_context(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_staff_copilot_request_context(uuid) TO authenticated;

CREATE FUNCTION public.complete_staff_copilot_request(p_actor uuid,p_lease uuid,p_question text,p_answer text,p_scope_refs jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET lock_timeout='1s' SET statement_timeout='6s' AS $$
DECLARE item pawpal_private.staff_copilot_slot; refs jsonb; scope jsonb; result jsonb;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'staff_request_writer_forbidden' USING ERRCODE='42501'; END IF;
 item:=pawpal_private.staff_copilot_request(p_lease,p_actor);
 IF md5(p_question) IS DISTINCT FROM item.question_hash THEN RAISE EXCEPTION 'staff_request_question_conflict' USING ERRCODE='PT409'; END IF;
 IF p_scope_refs IS NULL OR jsonb_typeof(p_scope_refs)<>'array' THEN RAISE EXCEPTION 'invalid_staff_source_refs' USING ERRCODE='22023'; END IF;
 IF jsonb_array_length(p_scope_refs)>64 OR octet_length(p_scope_refs::text)>16384 THEN RAISE EXCEPTION 'staff_scope_refs_exceeded' USING ERRCODE='54000'; END IF;
 -- Include inherited references here, even if the server formatter forgot to send them back.
 SELECT coalesce(jsonb_agg(ref ORDER BY ref::text),'[]') INTO refs FROM (SELECT DISTINCT value ref FROM jsonb_array_elements(item.context_refs||p_scope_refs))t;
 IF jsonb_array_length(refs)>64 OR octet_length(refs::text)>16384 THEN RAISE EXCEPTION 'staff_scope_refs_exceeded' USING ERRCODE='54000'; END IF;
 result:=public.save_staff_copilot_exchange(p_actor,item.request_id,item.session_id,item.scope_token,p_question,p_answer,refs);
 UPDATE pawpal_private.staff_copilot_slot SET completed=true WHERE slot=item.slot;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.complete_staff_copilot_request(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_staff_copilot_request(uuid,uuid,text,text,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
