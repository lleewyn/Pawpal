-- STAFF provenance store. Never imports or broadens access to admin_copilot_history.
BEGIN;
SET LOCAL lock_timeout='2s';
CREATE TABLE pawpal_private.staff_copilot_exchange (
 request_id uuid PRIMARY KEY,
 reply_id uuid NOT NULL UNIQUE DEFAULT extensions.gen_random_uuid(),
 session_id uuid NOT NULL,
 staff_id uuid NOT NULL REFERENCES public.staff(id),
 auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 scope_version integer NOT NULL DEFAULT 1 CHECK(scope_version=1),
 role_snapshot text NOT NULL DEFAULT 'STAFF' CHECK(role_snapshot='STAFF'),
 scope_token text NOT NULL CHECK(scope_token~'^[a-f0-9]{32}$'),
 scope_refs jsonb NOT NULL CHECK(jsonb_typeof(scope_refs)='array' AND jsonb_array_length(scope_refs)<=64 AND octet_length(scope_refs::text)<=16384),
 question text NOT NULL CHECK(length(question) BETWEEN 1 AND 2000 AND btrim(question)<>''),
 answer text NOT NULL CHECK(length(answer) BETWEEN 1 AND 16000 AND btrim(answer)<>''),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX ON pawpal_private.staff_copilot_exchange(staff_id,auth_user_id,session_id,created_at DESC,request_id);
ALTER TABLE pawpal_private.staff_copilot_exchange ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE pawpal_private.staff_copilot_exchange FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION pawpal_private.staff_copilot_scope(p_auth uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE person public.staff; codes jsonb; roles text[]; material jsonb;
BEGIN
 BEGIN SELECT * INTO STRICT person FROM public.staff WHERE auth_user_id=p_auth;
 EXCEPTION WHEN no_data_found OR too_many_rows THEN RAISE EXCEPTION 'staff_history_forbidden' USING ERRCODE='42501'; END;
 SELECT array_agg(role_code ORDER BY role_code) INTO roles FROM public.staff_role WHERE staff_id=person.id;
 IF person.employment_status<>'active' OR person.must_change_password IS DISTINCT FROM false OR roles IS DISTINCT FROM ARRAY['STAFF']::text[]
 OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_auth AND (banned_until IS NULL OR banned_until<=now()))
 OR NOT EXISTS(SELECT 1 FROM public.role_permission WHERE role_code='STAFF' AND permission_code='work.copilot.use') THEN
  RAISE EXCEPTION 'staff_history_forbidden' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(permission_code ORDER BY permission_code),'[]') INTO codes FROM public.role_permission WHERE role_code='STAFF';
 WITH owned AS (
  SELECT id FROM public.appointment WHERE staff_id=person.id
  UNION SELECT appointment_id FROM public.appointment_item WHERE staff_id=person.id
  UNION SELECT appointment_id FROM public.taxi_trip WHERE driver_staff_id=person.id
 ) SELECT jsonb_build_object('staff',person.id,'auth',p_auth,'staff_version',extract(epoch FROM person.updated_at),'permissions',codes,
  'appointments',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'lead',a.staff_id,
    'items',coalesce((SELECT jsonb_agg(i.id ORDER BY i.id) FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=person.id),'[]')) ORDER BY a.id)
    FROM public.appointment a JOIN owned o ON o.id=a.id),'[]'),
  'trips',coalesce((SELECT jsonb_agg(id ORDER BY id) FROM public.taxi_trip WHERE driver_staff_id=person.id),'[]'),
  'conversations',coalesce((SELECT jsonb_agg(id ORDER BY id) FROM public.chat_conversation WHERE assigned_staff_id=person.id),'[]'),
  'tickets',coalesce((SELECT jsonb_agg(id ORDER BY id) FROM public.support_ticket WHERE assigned_staff_id=person.id),'[]')) INTO material;
 RETURN jsonb_build_object('staff_id',person.id,'scope_token',md5(material::text),'scope_version',1,'permissions',codes);
END $$;
REVOKE ALL ON FUNCTION pawpal_private.staff_copilot_scope(uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION pawpal_private.staff_copilot_refs_allowed(p_actor uuid,p_codes jsonb,p_refs jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE ref jsonb; target uuid; kind text; permission text; owns boolean;
BEGIN
 IF p_refs IS NULL OR jsonb_typeof(p_refs)<>'array' OR jsonb_array_length(p_refs)>64 OR octet_length(p_refs::text)>16384 THEN RETURN false; END IF;
 FOR ref IN SELECT value FROM jsonb_array_elements(p_refs) LOOP
  IF jsonb_typeof(ref)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(ref) k WHERE k NOT IN ('kind','id','permission')) THEN RETURN false; END IF;
  kind:=ref->>'kind';permission:=ref->>'permission';
  IF kind IS NULL OR permission IS NULL OR NOT p_codes?permission OR permission NOT IN ('work.copilot.use','work.customer.read','work.pet.read','work.sales.create','work.cashier.collect','work.stock.read','work.service.perform','work.chat.handle','work.complaint.handle','work.self.read') THEN RETURN false; END IF;
  IF kind='permission' THEN
   IF ref?'id' THEN RETURN false; END IF;
   CONTINUE;
  END IF;
  IF coalesce(ref->>'id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN false; END IF;
  target:=(ref->>'id')::uuid;
  CASE kind
  WHEN 'customer' THEN owns:=permission='work.customer.read' AND EXISTS(SELECT 1 FROM public.customer WHERE id=target);
  WHEN 'pet' THEN owns:=permission='work.pet.read' AND EXISTS(SELECT 1 FROM public.pet_profile WHERE id=target);
  WHEN 'order' THEN owns:=permission IN ('work.sales.create','work.cashier.collect') AND EXISTS(SELECT 1 FROM public.sales_order WHERE id=target);
  WHEN 'product' THEN owns:=permission='work.stock.read' AND EXISTS(SELECT 1 FROM public.product_variant WHERE id=target);
  WHEN 'service' THEN owns:=permission='work.service.perform' AND EXISTS(SELECT 1 FROM public.service WHERE id=target);
  WHEN 'staff' THEN owns:=permission='work.self.read' AND target=p_actor;
  WHEN 'schedule' THEN owns:=permission='work.self.read' AND EXISTS(SELECT 1 FROM public.staff_schedule WHERE id=target AND staff_id=p_actor);
  WHEN 'conversation' THEN owns:=permission='work.chat.handle' AND EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=target AND assigned_staff_id=p_actor);
  WHEN 'queue' THEN owns:=permission='work.chat.handle' AND EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=target AND assigned_staff_id IS NULL AND status='waiting_agent');
  WHEN 'ticket' THEN owns:=permission='work.complaint.handle' AND EXISTS(SELECT 1 FROM public.support_ticket WHERE id=target AND assigned_staff_id=p_actor);
  WHEN 'taxi' THEN owns:=permission='work.service.perform' AND EXISTS(SELECT 1 FROM public.taxi_trip WHERE id=target AND driver_staff_id=p_actor);
  WHEN 'appointment' THEN owns:=permission='work.service.perform' AND EXISTS(SELECT 1 FROM public.appointment a WHERE a.id=target AND (a.staff_id=p_actor OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=p_actor) OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=p_actor)));
  WHEN 'hotel' THEN owns:=permission='work.service.perform' AND EXISTS(SELECT 1 FROM public.hotel_booking h JOIN public.appointment a ON a.id=h.appointment_id WHERE h.id=target AND (a.staff_id=p_actor OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=p_actor) OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=p_actor)));
  WHEN 'knowledge' THEN owns:=permission='work.copilot.use' AND EXISTS(SELECT 1 FROM public.chatbot_knowledge_faq WHERE id=target AND is_active);
  WHEN 'offer' THEN owns:=permission='work.sales.create' AND EXISTS(SELECT 1 FROM public.voucher WHERE id=target AND is_active AND (now() AT TIME ZONE 'Asia/Bangkok')::date BETWEEN start_date AND end_date);
  ELSE RETURN false;
  END CASE;
  IF owns IS DISTINCT FROM true THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.staff_copilot_refs_allowed(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION pawpal_private.staff_copilot_reply(p_row pawpal_private.staff_copilot_exchange) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 result:=jsonb_build_object('request_id',p_row.request_id,'reply_id',p_row.reply_id,'session_id',p_row.session_id,'reply',p_row.answer,'scope_version',1,'replayed',true,'created_at',p_row.created_at);
 IF octet_length(result::text)>32768 THEN result:=result||jsonb_build_object('reply',left(p_row.answer,1200),'content_partial',true,'content_offset',least(1200,length(p_row.answer)),'content_revision',md5(p_row.answer)); END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.staff_copilot_reply(pawpal_private.staff_copilot_exchange) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.get_staff_copilot_scope() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT pawpal_private.staff_copilot_scope(auth.uid())-'permissions'
$$;
REVOKE ALL ON FUNCTION public.get_staff_copilot_scope() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_copilot_scope() TO authenticated;

CREATE FUNCTION public.save_staff_copilot_exchange(p_actor uuid,p_request uuid,p_session uuid,p_scope_token text,p_question text,p_answer text,p_scope_refs jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE scope jsonb; previous pawpal_private.staff_copilot_exchange; actor uuid;
BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'staff_history_writer_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_session IS NULL OR coalesce(p_scope_token,'')!~'^[a-f0-9]{32}$' OR coalesce(length(p_question),0) NOT BETWEEN 1 AND 2000 OR btrim(p_question)='' OR coalesce(length(p_answer),0) NOT BETWEEN 1 AND 16000 OR btrim(p_answer)='' THEN RAISE EXCEPTION 'invalid_staff_history' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.staff WHERE auth_user_id=p_actor FOR UPDATE;
 scope:=pawpal_private.staff_copilot_scope(p_actor);actor:=(scope->>'staff_id')::uuid;
 IF scope->>'scope_token' IS DISTINCT FROM p_scope_token THEN RAISE EXCEPTION 'staff_history_scope_changed' USING ERRCODE='PT409'; END IF;
 IF NOT pawpal_private.staff_copilot_refs_allowed(actor,scope->'permissions',p_scope_refs) THEN RAISE EXCEPTION 'staff_history_reference_forbidden' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,178));
 SELECT * INTO previous FROM pawpal_private.staff_copilot_exchange WHERE request_id=p_request;
 IF FOUND THEN
  IF previous.staff_id IS DISTINCT FROM actor OR previous.auth_user_id IS DISTINCT FROM p_actor OR previous.session_id IS DISTINCT FROM p_session OR previous.question IS DISTINCT FROM p_question OR previous.scope_token IS DISTINCT FROM p_scope_token THEN RAISE EXCEPTION 'staff_history_request_conflict' USING ERRCODE='PT409'; END IF;
  IF NOT pawpal_private.staff_copilot_refs_allowed(actor,scope->'permissions',previous.scope_refs) THEN RAISE EXCEPTION 'staff_history_scope_changed' USING ERRCODE='PT409'; END IF;
  RETURN pawpal_private.staff_copilot_reply(previous);
 END IF;
 INSERT INTO pawpal_private.staff_copilot_exchange(request_id,session_id,staff_id,auth_user_id,scope_token,scope_refs,question,answer)
 VALUES(p_request,p_session,actor,p_actor,p_scope_token,p_scope_refs,p_question,p_answer) RETURNING * INTO previous;
 RETURN pawpal_private.staff_copilot_reply(previous)||jsonb_build_object('replayed',false);
END $$;
REVOKE ALL ON FUNCTION public.save_staff_copilot_exchange(uuid,uuid,uuid,text,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.save_staff_copilot_exchange(uuid,uuid,uuid,text,text,text,jsonb) TO service_role;

CREATE FUNCTION public.replay_staff_copilot_exchange(p_request uuid,p_session uuid,p_question text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE scope jsonb:=pawpal_private.staff_copilot_scope(auth.uid()); previous pawpal_private.staff_copilot_exchange;
BEGIN
 IF p_request IS NULL OR p_session IS NULL OR coalesce(length(p_question),0) NOT BETWEEN 1 AND 2000 THEN RAISE EXCEPTION 'invalid_staff_history' USING ERRCODE='22023'; END IF;
 SELECT * INTO previous FROM pawpal_private.staff_copilot_exchange WHERE request_id=p_request AND staff_id=(scope->>'staff_id')::uuid AND auth_user_id=auth.uid();
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF previous.session_id IS DISTINCT FROM p_session OR previous.question IS DISTINCT FROM p_question THEN RAISE EXCEPTION 'staff_history_request_conflict' USING ERRCODE='PT409'; END IF;
 IF NOT pawpal_private.staff_copilot_refs_allowed(previous.staff_id,scope->'permissions',previous.scope_refs) THEN RAISE EXCEPTION 'staff_history_scope_changed' USING ERRCODE='PT409'; END IF;
 RETURN pawpal_private.staff_copilot_reply(previous)||jsonb_build_object('scope_revalidated',true);
END $$;
REVOKE ALL ON FUNCTION public.replay_staff_copilot_exchange(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.replay_staff_copilot_exchange(uuid,uuid,text) TO authenticated;

CREATE FUNCTION public.staff_copilot_sessions(p_query text DEFAULT '',p_page integer DEFAULT 1) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE scope jsonb:=pawpal_private.staff_copilot_scope(auth.uid()); result jsonb;
BEGIN
 IF p_query IS NULL OR length(p_query)>2000 OR p_query~'[[:cntrl:]]' OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'invalid_staff_history_page' USING ERRCODE='22023'; END IF;
 WITH owned AS MATERIALIZED (
  SELECT * FROM pawpal_private.staff_copilot_exchange WHERE staff_id=(scope->>'staff_id')::uuid AND auth_user_id=auth.uid()
  AND pawpal_private.staff_copilot_refs_allowed(staff_id,scope->'permissions',scope_refs)
 ), titles AS (SELECT DISTINCT ON(session_id) session_id,left(question,100) title FROM owned ORDER BY session_id,created_at,request_id),
 matching AS MATERIALIZED (SELECT o.session_id id,t.title,count(*)*2 message_count,max(o.created_at) updated FROM owned o JOIN titles t USING(session_id) WHERE strpos(lower(t.title),lower(p_query))>0 GROUP BY o.session_id,t.title),
 bounds AS (SELECT count(*) total,least(p_page,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matching)
 SELECT jsonb_build_object('total',b.total,'page',b.page,'scope_version',1,'sessions',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY updated DESC,id) FROM (SELECT * FROM matching ORDER BY updated DESC,id LIMIT 10 OFFSET (b.page-1)*10)t),'[]')) INTO result FROM bounds b;
 IF octet_length(result::text)>32768 THEN RAISE EXCEPTION 'staff_history_payload_exceeded' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.staff_copilot_sessions(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.staff_copilot_sessions(text,integer) TO authenticated;

CREATE FUNCTION public.staff_copilot_history_page(p_session uuid DEFAULT NULL,p_offset integer DEFAULT 0,p_with_title boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE scope jsonb:=pawpal_private.staff_copilot_scope(auth.uid()); message jsonb; messages jsonb:='[]'; result jsonb; candidate jsonb; seen integer:=0; more boolean:=false; title text;
BEGIN
 IF p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 1000000 OR p_with_title IS NULL THEN RAISE EXCEPTION 'invalid_staff_history_page' USING ERRCODE='22023'; END IF;
 WITH owned AS MATERIALIZED (SELECT * FROM pawpal_private.staff_copilot_exchange WHERE staff_id=(scope->>'staff_id')::uuid AND auth_user_id=auth.uid() AND (p_session IS NULL OR session_id=p_session) AND pawpal_private.staff_copilot_refs_allowed(staff_id,scope->'permissions',scope_refs))
 SELECT left(question,100) INTO title FROM owned ORDER BY created_at,request_id LIMIT 1;
 result:=jsonb_build_object('history','[]'::jsonb,'hasMore',false,'next_offset',p_offset,'scope_version',1)||CASE WHEN p_with_title AND title IS NOT NULL THEN jsonb_build_object('title',title) ELSE '{}'::jsonb END;
 FOR message IN WITH owned AS MATERIALIZED (SELECT * FROM pawpal_private.staff_copilot_exchange WHERE staff_id=(scope->>'staff_id')::uuid AND auth_user_id=auth.uid() AND (p_session IS NULL OR session_id=p_session) AND pawpal_private.staff_copilot_refs_allowed(staff_id,scope->'permissions',scope_refs)),
  records AS (SELECT request_id,reply_id,session_id,question,answer,scope_refs,created_at FROM owned)
  SELECT jsonb_build_object('id',CASE WHEN kind=0 THEN request_id ELSE reply_id END,'session_id',session_id,'role',CASE WHEN kind=0 THEN 'user' ELSE 'assistant' END,'content',CASE WHEN kind=0 THEN question ELSE answer END,
   'metadata',jsonb_build_object('request_id',request_id,'session_title',left(question,100),'scope_version',1,'scope_refs',scope_refs),'created_at',created_at)
  FROM records CROSS JOIN generate_series(0,1)kind ORDER BY created_at DESC,request_id DESC,kind DESC OFFSET p_offset LIMIT 11 LOOP
  IF seen=10 THEN more:=true;EXIT; END IF;
  candidate:=result||jsonb_build_object('history',messages||jsonb_build_array(message));
  -- Leave room for the final continuation offset and flags.
  IF octet_length(candidate::text)>32640 THEN
   IF seen>0 THEN more:=true;EXIT; END IF;
   message:=message||jsonb_build_object('content',left(message->>'content',1200),'content_partial',true,'content_offset',least(1200,length(message->>'content')),'content_revision',md5(message->>'content'));
   candidate:=result||jsonb_build_object('history',jsonb_build_array(message));
   IF octet_length(candidate::text)>32640 THEN RAISE EXCEPTION 'staff_history_payload_exceeded' USING ERRCODE='54000'; END IF;
  END IF;
  messages:=messages||jsonb_build_array(message);seen:=seen+1;
 END LOOP;
 SELECT coalesce(jsonb_agg(value ORDER BY ordinality DESC),'[]') INTO messages FROM jsonb_array_elements(messages) WITH ORDINALITY;
 RETURN result||jsonb_build_object('history',messages,'hasMore',more,'next_offset',p_offset+seen);
END $$;
REVOKE ALL ON FUNCTION public.staff_copilot_history_page(uuid,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.staff_copilot_history_page(uuid,integer,boolean) TO authenticated;

CREATE FUNCTION public.staff_copilot_message_part(p_id uuid,p_offset integer,p_revision text) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE scope jsonb:=pawpal_private.staff_copilot_scope(auth.uid()); row pawpal_private.staff_copilot_exchange; body text;
BEGIN
 IF p_id IS NULL OR p_offset IS NULL OR p_offset NOT BETWEEN 0 AND 16000 OR coalesce(p_revision,'')!~'^[a-f0-9]{32}$' THEN RAISE EXCEPTION 'invalid_staff_history_part' USING ERRCODE='22023'; END IF;
 SELECT * INTO row FROM pawpal_private.staff_copilot_exchange WHERE (request_id=p_id OR reply_id=p_id) AND staff_id=(scope->>'staff_id')::uuid AND auth_user_id=auth.uid();
 IF NOT FOUND OR NOT pawpal_private.staff_copilot_refs_allowed(row.staff_id,scope->'permissions',row.scope_refs) THEN RAISE EXCEPTION 'staff_history_forbidden' USING ERRCODE='42501'; END IF;
 body:=CASE WHEN row.request_id=p_id THEN row.question ELSE row.answer END;
 IF md5(body) IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'detail_content_changed' USING ERRCODE='PT409'; END IF;
 IF p_offset>length(body) THEN RAISE EXCEPTION 'invalid_staff_history_part' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('id',p_id,'content',substr(body,p_offset+1,1200),'content_offset',least(length(body),p_offset+1200),'content_revision',p_revision,'content_partial',p_offset+1200<length(body),'scope_version',1);
END $$;
REVOKE ALL ON FUNCTION public.staff_copilot_message_part(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.staff_copilot_message_part(uuid,integer,text) TO authenticated;

CREATE FUNCTION public.staff_copilot_recent_context(p_session uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb; history jsonb;
BEGIN
 IF p_session IS NULL THEN RAISE EXCEPTION 'invalid_staff_history_session' USING ERRCODE='22023'; END IF;
 history:=public.staff_copilot_history_page(p_session,0,false)->'history';
 SELECT coalesce(jsonb_agg(message ORDER BY pos),'[]') INTO result FROM (SELECT ordinality pos,value||jsonb_build_object('content',left(value->>'content',1200),'content_partial',length(value->>'content')>1200 OR coalesce((value->>'content_partial')::boolean,false)) message FROM jsonb_array_elements(history) WITH ORDINALITY ORDER BY ordinality DESC LIMIT 6)t;
 IF octet_length(result::text)>32768 THEN RAISE EXCEPTION 'staff_history_payload_exceeded' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.staff_copilot_recent_context(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.staff_copilot_recent_context(uuid) TO authenticated;

CREATE FUNCTION public.delete_staff_copilot_session(p_session uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE scope jsonb:=pawpal_private.staff_copilot_scope(auth.uid());
BEGIN
 IF p_session IS NULL THEN RAISE EXCEPTION 'invalid_staff_history_session' USING ERRCODE='22023'; END IF;
 DELETE FROM pawpal_private.staff_copilot_exchange WHERE staff_id=(scope->>'staff_id')::uuid AND auth_user_id=auth.uid() AND session_id=p_session;
END $$;
REVOKE ALL ON FUNCTION public.delete_staff_copilot_session(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_staff_copilot_session(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
