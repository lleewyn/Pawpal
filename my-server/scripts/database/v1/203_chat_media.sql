BEGIN;
SET LOCAL lock_timeout='3s';
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

ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK(purpose IN ('product_image','care_log_image','product_variant_image','service_image','intake_image','handover_image','adjustment_image','pet_avatar','ticket_image','return_image','review_image','banner_image','blog_thumbnail','chat_image'));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK((chat_conversation_id IS NULL AND chat_message_id IS NULL AND ((((content_id IS NULL) AND (((review_id IS NULL) AND (review_line_id IS NULL) AND (review_kind IS NULL) AND (((ticket_id IS NULL) AND (support_message_id IS NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL) AND (((pet_id IS NULL) AND (((adjustment_id IS NULL) AND (((record_id IS NULL) AND (((service_id IS NULL) AND (((purpose = 'product_image'::text) AND (variant_id IS NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))) OR ((purpose = 'care_log_image'::text) AND (variant_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (appointment_id IS NOT NULL)) OR ((purpose = 'product_variant_image'::text) AND (variant_id IS NOT NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = 'service_image'::text) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (variant_id IS NULL) AND ((service_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = ANY (ARRAY['intake_image'::text, 'handover_image'::text])) AND (appointment_id IS NOT NULL) AND (record_id IS NOT NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'adjustment_image'::text) AND (appointment_id IS NOT NULL) AND (adjustment_id IS NOT NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'pet_avatar'::text) AND (pet_id IS NOT NULL) AND (appointment_id IS NULL) AND (adjustment_id IS NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((product_id IS NULL) AND (appointment_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL) AND (record_id IS NULL) AND (adjustment_id IS NULL) AND (pet_id IS NULL) AND (((purpose = 'ticket_image'::text) AND (ticket_id IS NOT NULL) AND (support_message_id IS NOT NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL)) OR ((purpose = 'return_image'::text) AND (return_id IS NOT NULL) AND (sales_order_id IS NOT NULL) AND (ticket_id IS NULL) AND (support_message_id IS NULL)))))) OR ((purpose = 'review_image'::text) AND (review_id IS NOT NULL) AND (review_line_id IS NOT NULL) AND (review_kind IS NOT NULL) AND (review_kind = ANY (ARRAY['sales'::text, 'service'::text])) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL) AND (record_id IS NULL) AND (adjustment_id IS NULL) AND (pet_id IS NULL) AND (ticket_id IS NULL) AND (support_message_id IS NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL)))) OR ((purpose = ANY (ARRAY['banner_image'::text, 'blog_thumbnail'::text])) AND (content_id IS NOT NULL) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL) AND (record_id IS NULL) AND (adjustment_id IS NULL) AND (pet_id IS NULL) AND (ticket_id IS NULL) AND (support_message_id IS NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL) AND (review_id IS NULL) AND (review_line_id IS NULL) AND (review_kind IS NULL))))) OR (purpose='chat_image' AND chat_conversation_id IS NOT NULL AND chat_message_id IS NOT NULL AND product_id IS NULL AND appointment_id IS NULL AND draft_id IS NULL AND variant_id IS NULL AND service_id IS NULL AND record_id IS NULL AND adjustment_id IS NULL AND pet_id IS NULL AND ticket_id IS NULL AND support_message_id IS NULL AND return_id IS NULL AND sales_order_id IS NULL AND review_id IS NULL AND review_line_id IS NULL AND review_kind IS NULL AND content_id IS NULL));
CREATE OR REPLACE FUNCTION pawpal_private.media_session_manage(p_user uuid, p_session uuid, p_write boolean DEFAULT true)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session;
 IF NOT FOUND THEN RETURN false; END IF;
 IF s.purpose='chat_image' THEN RETURN pawpal_private.chat_media_access(p_user,null,s.chat_conversation_id,p_write);END IF;
 IF s.purpose='review_image' THEN RETURN pawpal_private.review_media_access(p_user,s.review_id,s.review_line_id,s.review_kind,p_write);END IF;
 IF s.purpose='ticket_image' AND NOT EXISTS(SELECT 1 FROM public.support_ticket WHERE id=s.ticket_id) THEN
  RETURN coalesce(s.created_by=p_user AND (pawpal_private.evidence_admin(p_user) OR pawpal_private.evidence_customer(p_user) IS NOT NULL),false);
 END IF;
 IF s.purpose IN ('ticket_image','return_image') THEN RETURN coalesce(pawpal_private.evidence_access(p_user,s.purpose,coalesce(s.support_message_id,s.return_id),coalesce(s.ticket_id,s.sales_order_id),p_write),false); END IF;
 RETURN pawpal_private.media_manage(p_user,s.purpose,s.product_id,s.appointment_id);
END $function$
;
CREATE OR REPLACE FUNCTION public.claim_media_cleanup(p_limit integer DEFAULT 10)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session; a public.media_asset; token uuid;
BEGIN
 IF p_limit NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
 FOR s IN SELECT * FROM public.media_upload_session WHERE
 (state IN ('pending','uploading','verified','pending_delete') AND expires_at<now() AND coalesce(lease_until,now()-interval '1 second')<now())
 OR (state='cleaning' AND lease_until<now()) ORDER BY created_at LIMIT p_limit FOR UPDATE SKIP LOCKED LOOP
  SELECT * INTO a FROM public.media_asset WHERE session_id=s.id FOR UPDATE;
  IF a.id IS NOT NULL AND (a.legal_hold OR a.retention_until>now() OR EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.review_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.banner WHERE image_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.blog_post WHERE thumbnail_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.chat_message_media WHERE media_asset_id=a.id)) THEN CONTINUE; END IF;
  token:=gen_random_uuid();
  UPDATE public.media_upload_session SET state='cleaning',lease=token,lease_until=now()+interval '15 minutes' WHERE id=s.id;
  UPDATE public.media_asset SET status='cleaning' WHERE session_id=s.id;
  RETURN NEXT jsonb_build_object('session_id',s.id,'mongo_file_id',s.mongo_file_id,'lease',token);
 END LOOP;
END $function$
;
CREATE OR REPLACE FUNCTION pawpal_private.release_media_reference()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
 IF OLD.media_asset_id IS NULL OR (TG_OP='UPDATE' AND NEW.media_asset_id IS NOT DISTINCT FROM OLD.media_asset_id) THEN RETURN NULL; END IF;
 PERFORM 1 FROM public.media_upload_session WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.media_asset_id) FOR UPDATE;
 PERFORM 1 FROM public.media_asset WHERE id=OLD.media_asset_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=OLD.media_asset_id)
 AND NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.review_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.banner WHERE image_media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.blog_post WHERE thumbnail_media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.chat_message_media WHERE media_asset_id=OLD.media_asset_id) THEN
  UPDATE public.media_asset SET status='pending_delete',retention_until=now()+interval '7 days' WHERE id=OLD.media_asset_id;
  UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '7 days' WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.media_asset_id);
 END IF;
 RETURN NULL;
END $function$
;
CREATE OR REPLACE FUNCTION public.claim_chat_media_upload(p_actor uuid, p_guest_hash text, p_session uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session; a public.media_asset;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session AND created_by IS NOT DISTINCT FROM p_actor AND created_by_guest IS NOT DISTINCT FROM (CASE WHEN p_actor IS NULL THEN pawpal_private.chat_media_guest(p_guest_hash) END) FOR UPDATE;
 IF NOT FOUND OR s.purpose<>'chat_image' OR NOT pawpal_private.chat_media_access(p_actor,p_guest_hash,s.chat_conversation_id,true) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pawpal_private.media_settings WHERE singleton AND enabled) THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 IF s.state IN ('verified','attached') THEN SELECT * INTO a FROM public.media_asset WHERE session_id=s.id;
  RETURN jsonb_build_object('state',s.state,'asset_id',a.id); END IF;
 IF s.state<>'pending' OR s.expires_at<=now() THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
 UPDATE public.media_upload_session SET state='uploading',lease=gen_random_uuid(),lease_until=now()+interval '15 minutes' WHERE id=s.id RETURNING * INTO s;
 RETURN jsonb_build_object('state',s.state,'session_id',s.id,'lease',s.lease,'mongo_file_id',s.mongo_file_id,'size_bytes',s.declared_size,'mime_type',s.mime_type);
END $function$
;
CREATE OR REPLACE FUNCTION public.cancel_chat_media_upload(p_actor uuid, p_guest_hash text, p_session uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session AND created_by IS NOT DISTINCT FROM p_actor AND created_by_guest IS NOT DISTINCT FROM (CASE WHEN p_actor IS NULL THEN pawpal_private.chat_media_guest(p_guest_hash) END) FOR UPDATE;
 IF NOT FOUND OR s.purpose<>'chat_image' OR NOT pawpal_private.chat_media_access(p_actor,p_guest_hash,s.chat_conversation_id,false) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF s.state='pending_delete' OR s.state='deleted' THEN RETURN; END IF;
 IF s.state NOT IN ('pending','verified') THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
 UPDATE public.media_upload_session SET state='pending_delete',expires_at=greatest(expires_at,now()+interval '1 hour') WHERE id=s.id;
 UPDATE public.media_asset SET status='pending_delete' WHERE session_id=s.id;
END $function$
;
CREATE OR REPLACE FUNCTION public.finish_chat_media_upload(p_actor uuid, p_guest_hash text, p_session uuid, p_lease uuid, p_sha256 text, p_width integer, p_height integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session; result uuid;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM pawpal_private.media_settings WHERE singleton AND enabled) THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 IF NOT FOUND OR s.purpose<>'chat_image' OR (s.created_by IS DISTINCT FROM p_actor OR s.created_by_guest IS DISTINCT FROM (CASE WHEN p_actor IS NULL THEN pawpal_private.chat_media_guest(p_guest_hash) END)) OR s.lease IS DISTINCT FROM p_lease OR p_lease IS NULL
 OR s.state NOT IN ('uploading','verified') OR s.lease_until<=now() OR NOT pawpal_private.chat_media_access(p_actor,p_guest_hash,s.chat_conversation_id,true)
 THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO result FROM public.media_asset WHERE session_id=s.id;
 IF FOUND THEN
  IF NOT EXISTS(SELECT 1 FROM public.media_asset WHERE id=result AND sha256=p_sha256 AND width=p_width AND height=p_height) THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN result;
 END IF;
 INSERT INTO public.media_asset(session_id,mongo_file_id,mime_type,size_bytes,sha256,width,height)
 VALUES(s.id,s.mongo_file_id,s.mime_type,s.declared_size,p_sha256,p_width,p_height) RETURNING id INTO result;
 UPDATE public.media_upload_session SET state='verified',expires_at=now()+interval '7 days' WHERE id=s.id;
 RETURN result;
END $function$
;
CREATE OR REPLACE FUNCTION public.fail_chat_media_upload(p_actor uuid, p_guest_hash text, p_session uuid, p_lease uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
 IF p_actor IS NULL AND pawpal_private.chat_media_guest(p_guest_hash) IS NULL THEN RAISE EXCEPTION 'chat_media_forbidden' USING ERRCODE='42501';END IF;
 UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '1 hour'
 WHERE id=p_session AND created_by IS NOT DISTINCT FROM p_actor AND created_by_guest IS NOT DISTINCT FROM (CASE WHEN p_actor IS NULL THEN pawpal_private.chat_media_guest(p_guest_hash) END) AND lease=p_lease AND p_lease IS NOT NULL AND state='uploading';
END $function$
;
REVOKE ALL ON FUNCTION pawpal_private.chat_media_guest(text) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION pawpal_private.chat_media_access(uuid,text,uuid,boolean) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION pawpal_private.attach_chat_media(uuid,text,uuid,uuid[]) FROM PUBLIC,anon,authenticated,service_role;
REVOKE ALL ON FUNCTION public.prepare_chat_media_upload(uuid,text,uuid,uuid,uuid,bigint,text,text) FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION public.prepare_chat_media_upload(uuid,text,uuid,uuid,uuid,bigint,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.claim_chat_media_upload(uuid,text,uuid) FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION public.claim_chat_media_upload(uuid,text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.cancel_chat_media_upload(uuid,text,uuid) FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION public.cancel_chat_media_upload(uuid,text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.finish_chat_media_upload(uuid,text,uuid,uuid,text,integer,integer) FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION public.finish_chat_media_upload(uuid,text,uuid,uuid,text,integer,integer) TO service_role;
REVOKE ALL ON FUNCTION public.fail_chat_media_upload(uuid,text,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION public.fail_chat_media_upload(uuid,text,uuid,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.resolve_chat_media(uuid,text,uuid) FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION public.resolve_chat_media(uuid,text,uuid) TO service_role;
REVOKE ALL ON FUNCTION public.list_chat_media(uuid,text,uuid,uuid[]) FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION public.list_chat_media(uuid,text,uuid,uuid[]) TO service_role;
REVOKE ALL ON FUNCTION public.post_public_chat_message_media(uuid,uuid,timestamptz,uuid,text,text,text,boolean,integer,text,boolean,boolean,uuid[]) FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION public.post_public_chat_message_media(uuid,uuid,timestamptz,uuid,text,text,text,boolean,integer,text,boolean,boolean,uuid[]) TO service_role;
REVOKE ALL ON FUNCTION public.act_admin_chat_media(uuid,uuid,timestamptz,text,text,uuid[]) FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION public.act_admin_chat_media(uuid,uuid,timestamptz,text,text,uuid[]) TO authenticated;
REVOKE ALL ON FUNCTION public.list_own_chat_media(uuid,uuid[]) FROM PUBLIC,anon,authenticated,service_role;GRANT EXECUTE ON FUNCTION public.list_own_chat_media(uuid,uuid[]) TO authenticated;
COMMIT;
