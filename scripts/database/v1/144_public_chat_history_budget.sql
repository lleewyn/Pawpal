BEGIN;
-- Service-only: active API must verify member/guest ownership before each call.
CREATE OR REPLACE FUNCTION public.read_public_chat_page(p_conversation uuid,p_before_at timestamptz DEFAULT NULL,p_before_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE messages jsonb:='[]'; message jsonb; candidate jsonb; more boolean:=false; seen integer:=0; feedback_submitted boolean;
BEGIN
 PERFORM pawpal_private.admit_chat_server_read();
 IF p_conversation IS NULL OR (p_before_at IS NULL)<>(p_before_id IS NULL) OR (p_before_at IS NOT NULL AND NOT isfinite(p_before_at)) THEN RAISE EXCEPTION 'invalid_chat_cursor' USING ERRCODE='22023'; END IF;
 SELECT EXISTS(SELECT 1 FROM public.chat_feedback WHERE conversation_id=p_conversation) INTO feedback_submitted;
 FOR message IN SELECT to_jsonb(r) FROM (
  SELECT id,sender_type,content,created_at,
   CASE WHEN metadata->>'type'='csat_invitation' THEN jsonb_build_object('type','csat_invitation','submitted',feedback_submitted) ELSE '{}'::jsonb END metadata
  FROM public.chat_message WHERE conversation_id=p_conversation
  AND (p_before_at IS NULL OR (created_at,id)<(p_before_at,p_before_id)) ORDER BY created_at DESC,id DESC LIMIT 31
 ) r LOOP
  IF seen=30 THEN more:=true;EXIT;END IF;
  candidate:=jsonb_build_object('messages',messages||jsonb_build_array(message),'hasMore',false);
  IF octet_length(convert_to(candidate::text,'UTF8'))>32768 THEN
   IF seen>0 THEN more:=true;EXIT;END IF;
   message:=message||jsonb_build_object('content',left(message->>'content',1200),'content_partial',length(message->>'content')>1200,
    'content_offset',least(1200,length(message->>'content')),'content_revision',md5(message->>'content'));
   candidate:=jsonb_build_object('messages',jsonb_build_array(message),'hasMore',false);
   IF octet_length(convert_to(candidate::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'public_chat_payload_limit' USING ERRCODE='54000'; END IF;
  END IF;
  messages:=messages||jsonb_build_array(message);seen:=seen+1;
 END LOOP;
 RETURN jsonb_build_object('messages',messages,'hasMore',more);
END $$;

CREATE OR REPLACE FUNCTION public.read_public_chat_part(p_conversation uuid,p_message uuid,p_offset integer,p_revision text)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE original text; fragment text; revision text; result jsonb;
BEGIN
 PERFORM pawpal_private.admit_chat_server_read();
 IF p_conversation IS NULL OR p_message IS NULL OR p_offset IS NULL OR p_offset<0 OR p_revision IS NULL OR p_revision !~ '^[0-9a-f]{32}$' THEN RAISE EXCEPTION 'invalid_public_chat_part' USING ERRCODE='22023'; END IF;
 SELECT content INTO original FROM public.chat_message WHERE id=p_message AND conversation_id=p_conversation;
 IF original IS NULL THEN RAISE EXCEPTION 'public_chat_part_forbidden' USING ERRCODE='42501'; END IF;
 revision:=md5(original);
 IF revision<>p_revision THEN RAISE EXCEPTION 'public_chat_part_changed' USING ERRCODE='PT409'; END IF;
 IF p_offset>length(original) THEN RAISE EXCEPTION 'invalid_public_chat_offset' USING ERRCODE='22023'; END IF;
 fragment:=substring(original FROM p_offset+1 FOR 2000);
 result:=jsonb_build_object('id',p_message,'offset',p_offset,'next_offset',p_offset+length(fragment),'content',fragment,'revision',revision,'hasMore',p_offset+length(fragment)<length(original));
 IF octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'public_chat_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_public_chat_page(uuid,timestamptz,uuid),public.read_public_chat_part(uuid,uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_public_chat_page(uuid,timestamptz,uuid),public.read_public_chat_part(uuid,uuid,integer,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
