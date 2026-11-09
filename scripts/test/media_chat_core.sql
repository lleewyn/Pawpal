ALTER TABLE public.media_upload_session ALTER COLUMN created_by DROP NOT NULL,
 ADD COLUMN created_by_guest uuid REFERENCES public.guest_session(id),
 ADD COLUMN chat_conversation_id uuid REFERENCES public.chat_conversation(id), ADD COLUMN chat_message_id uuid;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_session_actor CHECK
 ((created_by IS NOT NULL AND created_by_guest IS NULL) OR (created_by IS NULL AND created_by_guest IS NOT NULL AND purpose='chat_image'));
CREATE UNIQUE INDEX media_guest_request ON public.media_upload_session(created_by_guest,request_id) WHERE created_by_guest IS NOT NULL;
CREATE TABLE public.chat_message_media (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), message_id uuid NOT NULL REFERENCES public.chat_message(id) ON DELETE CASCADE,
 media_asset_id uuid NOT NULL UNIQUE REFERENCES public.media_asset(id), sort_order integer NOT NULL CHECK(sort_order BETWEEN 0 AND 2),
 UNIQUE(message_id,sort_order)
);
ALTER TABLE public.chat_message_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.chat_message_media FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION pawpal_private.chat_media_guest(p_hash text) RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT id FROM public.guest_session WHERE token_hash=p_hash AND p_hash~'^[a-f0-9]{64}$' AND revoked_at IS NULL AND expires_at>now()
$$;
CREATE FUNCTION pawpal_private.chat_media_access(p_actor uuid,p_hash text,p_conversation uuid,p_write boolean DEFAULT true)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE c public.chat_conversation;actor_staff uuid;actor_customer uuid;
BEGIN
 SELECT * INTO c FROM public.chat_conversation WHERE id=p_conversation;
 IF NOT FOUND OR (p_write AND (c.status IN ('closed','resolved','completed','blocked') OR c.blocked_until>now())) THEN RETURN false;END IF;
 IF p_actor IS NULL THEN RETURN coalesce(c.customer_id IS NULL AND c.guest_session_id=pawpal_private.chat_media_guest(p_hash),false);END IF;
 IF p_hash IS NOT NULL THEN RETURN false;END IF;
 actor_staff:=pawpal_private.media_staff(p_actor);
 IF actor_staff IS NOT NULL THEN
  RETURN coalesce(EXISTS(SELECT 1 FROM public.staff_role r WHERE r.staff_id=actor_staff AND
   ((r.role_code='ADMIN' AND NOT p_write) OR (c.assigned_staff_id=actor_staff AND (NOT p_write OR c.status='agent_handling') AND
    (r.role_code='ADMIN' OR EXISTS(SELECT 1 FROM public.role_permission WHERE role_code=r.role_code AND permission_code='work.chat.handle'))))),false);
 END IF;
 actor_customer:=pawpal_private.evidence_customer(p_actor);
 RETURN coalesce(actor_customer=c.customer_id,false);
END $$;

CREATE FUNCTION public.prepare_chat_media_upload(p_actor uuid,p_guest_hash text,p_request uuid,p_conversation uuid,p_message uuid,p_size bigint,p_mime text,p_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.media_upload_session;g uuid;budget bigint;used bigint;
BEGIN
 IF NOT pawpal_private.chat_media_access(p_actor,p_guest_hash,p_conversation,true) THEN RAISE EXCEPTION 'chat_media_forbidden' USING ERRCODE='42501';END IF;
 g:=CASE WHEN p_actor IS NULL THEN pawpal_private.chat_media_guest(p_guest_hash) END;
 IF p_request IS NULL OR p_message IS NULL OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 3145728 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp') OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200 OR p_name~'[[:cntrl:]]' THEN RAISE EXCEPTION 'chat_media_invalid' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pawpal-media-quota',188));
 SELECT * INTO s FROM public.media_upload_session WHERE created_by IS NOT DISTINCT FROM p_actor AND created_by_guest IS NOT DISTINCT FROM g AND request_id=p_request FOR UPDATE;
 IF FOUND THEN
  IF s.purpose<>'chat_image' OR s.chat_conversation_id IS DISTINCT FROM p_conversation OR s.chat_message_id IS DISTINCT FROM p_message OR s.declared_size<>p_size OR s.mime_type<>p_mime OR s.original_name<>p_name THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409';END IF;
  IF s.state NOT IN ('pending','verified','attached') OR (s.state='pending' AND s.expires_at<=now()) THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409';END IF;
  RETURN jsonb_build_object('session_id',s.id,'state',s.state,'asset_id',(SELECT id FROM public.media_asset WHERE session_id=s.id));
 END IF;
 IF EXISTS(SELECT 1 FROM public.chat_message WHERE id=p_message) THEN RAISE EXCEPTION 'chat_message_already_sent' USING ERRCODE='PT409';END IF;
 SELECT max_storage_bytes INTO budget FROM pawpal_private.media_settings WHERE singleton AND enabled;
 IF budget IS NULL OR budget=0 THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000';END IF;
 SELECT coalesce(sum(declared_size),0) INTO used FROM public.media_upload_session WHERE state<>'deleted';
 IF used+p_size>budget THEN RAISE EXCEPTION 'media_quota_exceeded' USING ERRCODE='54000';END IF;
 IF (SELECT count(*) FROM public.media_upload_session WHERE created_by IS NOT DISTINCT FROM p_actor AND created_by_guest IS NOT DISTINCT FROM g AND state IN ('pending','uploading','verified'))>=10
 OR (SELECT count(*) FROM public.media_upload_session WHERE created_by IS NOT DISTINCT FROM p_actor AND created_by_guest IS NOT DISTINCT FROM g AND created_at>now()-interval '1 hour')>=30
 OR (SELECT count(*) FROM public.media_upload_session WHERE chat_conversation_id=p_conversation AND chat_message_id=p_message AND state NOT IN ('pending_delete','cleaning','deleted'))>=3 THEN RAISE EXCEPTION 'media_too_many_pending' USING ERRCODE='54000';END IF;
 INSERT INTO public.media_upload_session(created_by,created_by_guest,request_id,purpose,chat_conversation_id,chat_message_id,declared_size,mime_type,original_name)
 VALUES(p_actor,g,p_request,'chat_image',p_conversation,p_message,p_size,p_mime,p_name) RETURNING * INTO s;
 RETURN jsonb_build_object('session_id',s.id,'state',s.state);
END $$;

CREATE FUNCTION public.resolve_chat_media(p_actor uuid,p_guest_hash text,p_asset uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.media_asset;s public.media_upload_session;g uuid;
BEGIN
 SELECT * INTO a FROM public.media_asset WHERE id=p_asset AND status IN ('verified','attached');IF NOT FOUND THEN RETURN NULL;END IF;
 SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id AND purpose='chat_image';
 IF NOT FOUND OR NOT pawpal_private.chat_media_access(p_actor,p_guest_hash,s.chat_conversation_id,false) THEN RETURN NULL;END IF;
 g:=CASE WHEN p_actor IS NULL THEN pawpal_private.chat_media_guest(p_guest_hash) END;
 IF a.status='attached' THEN
  IF NOT EXISTS(SELECT 1 FROM public.chat_message_media m JOIN public.chat_message cm ON cm.id=m.message_id WHERE m.media_asset_id=a.id AND cm.id=s.chat_message_id AND cm.conversation_id=s.chat_conversation_id AND cm.sender_type IN ('customer','guest','staff')) THEN RETURN NULL;END IF;
 ELSIF s.created_by IS DISTINCT FROM p_actor OR s.created_by_guest IS DISTINCT FROM g THEN RETURN NULL;END IF;
 RETURN jsonb_build_object('id',a.id,'mongo_file_id',a.mongo_file_id,'mime_type',a.mime_type,'size_bytes',a.size_bytes,'sha256',a.sha256,'public',false,'cache_public',false);
END $$;

CREATE FUNCTION public.list_chat_media(p_actor uuid,p_guest_hash text,p_conversation uuid,p_messages uuid[]) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF coalesce(cardinality(p_messages),0)>30 OR NOT pawpal_private.chat_media_access(p_actor,p_guest_hash,p_conversation,false) THEN RAISE EXCEPTION 'chat_media_forbidden' USING ERRCODE='42501';END IF;
 RETURN coalesce((SELECT jsonb_agg(jsonb_build_object('message_id',m.message_id,'asset_id',m.media_asset_id,'sort_order',m.sort_order) ORDER BY m.message_id,m.sort_order) FROM public.chat_message_media m JOIN public.chat_message cm ON cm.id=m.message_id WHERE cm.conversation_id=p_conversation AND cm.id=ANY(p_messages) AND cm.sender_type IN ('customer','guest','staff')),'[]'::jsonb);
END $$;

CREATE FUNCTION pawpal_private.attach_chat_media(p_actor uuid,p_guest_hash text,p_message uuid,p_assets uuid[]) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE m public.chat_message;g uuid;s public.media_upload_session;a public.media_asset;asset uuid;i integer:=0;prior uuid[];
BEGIN
 IF p_assets IS NULL OR cardinality(p_assets)>3 OR EXISTS(SELECT 1 FROM unnest(p_assets) x GROUP BY x HAVING x IS NULL OR count(*)>1) THEN RAISE EXCEPTION 'chat_media_invalid' USING ERRCODE='22023';END IF;
 SELECT * INTO m FROM public.chat_message WHERE id=p_message FOR UPDATE;
 g:=CASE WHEN p_actor IS NULL THEN pawpal_private.chat_media_guest(p_guest_hash) END;
 IF NOT FOUND OR m.sender_account_id IS DISTINCT FROM p_actor OR m.sender_guest_session_id IS DISTINCT FROM g OR m.sender_type NOT IN ('customer','guest','staff') OR NOT pawpal_private.chat_media_access(p_actor,p_guest_hash,m.conversation_id,false) THEN RAISE EXCEPTION 'chat_media_forbidden' USING ERRCODE='42501';END IF;
 SELECT coalesce(array_agg(media_asset_id ORDER BY sort_order),'{}'::uuid[]) INTO prior FROM public.chat_message_media WHERE message_id=p_message;
 IF cardinality(prior)>0 THEN IF prior IS DISTINCT FROM p_assets THEN RAISE EXCEPTION 'chat_media_request_conflict' USING ERRCODE='PT409';END IF;RETURN;END IF;
 IF cardinality(p_assets)=0 THEN RETURN;END IF;
 IF NOT pawpal_private.chat_media_access(p_actor,p_guest_hash,m.conversation_id,true) THEN RAISE EXCEPTION 'chat_media_forbidden' USING ERRCODE='42501';END IF;
 FOREACH asset IN ARRAY p_assets LOOP
  SELECT * INTO s FROM public.media_upload_session WHERE id=(SELECT session_id FROM public.media_asset WHERE id=asset) FOR UPDATE;
  SELECT * INTO a FROM public.media_asset WHERE id=asset FOR UPDATE;
  IF a.id IS NULL OR s.purpose<>'chat_image' OR s.chat_conversation_id IS DISTINCT FROM m.conversation_id OR s.chat_message_id IS DISTINCT FROM m.id OR s.created_by IS DISTINCT FROM p_actor OR s.created_by_guest IS DISTINCT FROM g OR s.state<>'verified' OR a.status<>'verified' THEN RAISE EXCEPTION 'chat_media_target_mismatch' USING ERRCODE='42501';END IF;
  INSERT INTO public.chat_message_media(message_id,media_asset_id,sort_order) VALUES(m.id,a.id,i);i:=i+1;
  UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
  UPDATE public.media_asset SET status='attached' WHERE id=a.id;
 END LOOP;
END $$;

CREATE FUNCTION public.list_own_chat_media(p_conversation uuid,p_messages uuid[]) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT public.list_chat_media(auth.uid(),null,p_conversation,p_messages)
$$;

CREATE FUNCTION public.post_public_chat_message_media(p_id uuid,p_conversation uuid,p_expected_at timestamptz,p_auth uuid,p_guest_hash text,p_raw text,p_content text,p_toxic boolean,p_level integer,p_reply text,p_handover boolean,p_understood boolean,p_assets uuid[]) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result uuid;g uuid;prior boolean;
BEGIN
 IF NOT pawpal_private.chat_media_access(p_auth,p_guest_hash,p_conversation,false) THEN RAISE EXCEPTION 'chat_media_forbidden' USING ERRCODE='42501';END IF;
 g:=CASE WHEN p_auth IS NULL THEN pawpal_private.chat_media_guest(p_guest_hash) END;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,55));
 SELECT EXISTS(SELECT 1 FROM public.chat_message WHERE id=p_id) INTO prior;
 IF prior AND (SELECT coalesce(array_agg(media_asset_id ORDER BY sort_order),'{}'::uuid[]) FROM public.chat_message_media WHERE message_id=p_id) IS DISTINCT FROM p_assets THEN RAISE EXCEPTION 'chat_media_request_conflict' USING ERRCODE='PT409';END IF;
 result:=public.post_public_chat_message(p_id,p_conversation,p_expected_at,p_auth,g,p_raw,p_content,p_toxic,p_level,p_reply,p_handover OR cardinality(p_assets)>0,p_understood);
 PERFORM pawpal_private.attach_chat_media(p_auth,p_guest_hash,p_id,p_assets);RETURN result;
END $$;
CREATE FUNCTION public.act_admin_chat_media(p_request_id uuid,p_conversation_id uuid,p_expected_updated_at timestamptz,p_action text,p_content text,p_assets uuid[]) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result uuid;prior boolean;
BEGIN
 IF p_action<>'send' THEN RAISE EXCEPTION 'chat_media_invalid' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,46));
 SELECT EXISTS(SELECT 1 FROM public.chat_message WHERE id=p_request_id) INTO prior;
 IF prior AND (SELECT coalesce(array_agg(media_asset_id ORDER BY sort_order),'{}'::uuid[]) FROM public.chat_message_media WHERE message_id=p_request_id) IS DISTINCT FROM p_assets THEN RAISE EXCEPTION 'chat_media_request_conflict' USING ERRCODE='PT409';END IF;
 result:=public.act_admin_chat(p_request_id,p_conversation_id,p_expected_updated_at,p_action,p_content);
 PERFORM pawpal_private.attach_chat_media(auth.uid(),null,p_request_id,p_assets);RETURN result;
END $$;
CREATE TRIGGER chat_media_release AFTER DELETE ON public.chat_message_media FOR EACH ROW EXECUTE FUNCTION pawpal_private.release_media_reference();
