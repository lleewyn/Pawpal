BEGIN;
SET LOCAL lock_timeout='3s';
LOCK TABLE public.media_upload_session IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.media_upload_session WHERE purpose='chat_image') THEN RAISE EXCEPTION 'chat_rollback_requires_no_sessions';END IF;END $$;
DROP TABLE public.chat_message_media;
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
  IF a.id IS NOT NULL AND (a.legal_hold OR a.retention_until>now() OR EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.review_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.banner WHERE image_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.blog_post WHERE thumbnail_media_asset_id=a.id)) THEN CONTINUE; END IF;
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
 AND NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.review_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.banner WHERE image_media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.blog_post WHERE thumbnail_media_asset_id=OLD.media_asset_id) THEN
  UPDATE public.media_asset SET status='pending_delete',retention_until=now()+interval '7 days' WHERE id=OLD.media_asset_id;
  UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '7 days' WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.media_asset_id);
 END IF;
 RETURN NULL;
END $function$
;
DROP FUNCTION public.list_own_chat_media(uuid,uuid[]);
DROP FUNCTION public.act_admin_chat_media(uuid,uuid,timestamptz,text,text,uuid[]);
DROP FUNCTION public.post_public_chat_message_media(uuid,uuid,timestamptz,uuid,text,text,text,boolean,integer,text,boolean,boolean,uuid[]);
DROP FUNCTION public.list_chat_media(uuid,text,uuid,uuid[]);
DROP FUNCTION public.resolve_chat_media(uuid,text,uuid);
DROP FUNCTION public.fail_chat_media_upload(uuid,text,uuid,uuid);
DROP FUNCTION public.finish_chat_media_upload(uuid,text,uuid,uuid,text,integer,integer);
DROP FUNCTION public.cancel_chat_media_upload(uuid,text,uuid);
DROP FUNCTION public.claim_chat_media_upload(uuid,text,uuid);
DROP FUNCTION public.prepare_chat_media_upload(uuid,text,uuid,uuid,uuid,bigint,text,text);
DROP FUNCTION pawpal_private.attach_chat_media(uuid,text,uuid,uuid[]);
DROP FUNCTION pawpal_private.chat_media_access(uuid,text,uuid,boolean);
DROP FUNCTION pawpal_private.chat_media_guest(text);
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_session_actor,DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check,DROP COLUMN created_by_guest,DROP COLUMN chat_conversation_id,DROP COLUMN chat_message_id,ALTER COLUMN created_by SET NOT NULL;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK ((((content_id IS NULL) AND (((review_id IS NULL) AND (review_line_id IS NULL) AND (review_kind IS NULL) AND (((ticket_id IS NULL) AND (support_message_id IS NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL) AND (((pet_id IS NULL) AND (((adjustment_id IS NULL) AND (((record_id IS NULL) AND (((service_id IS NULL) AND (((purpose = 'product_image'::text) AND (variant_id IS NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))) OR ((purpose = 'care_log_image'::text) AND (variant_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (appointment_id IS NOT NULL)) OR ((purpose = 'product_variant_image'::text) AND (variant_id IS NOT NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = 'service_image'::text) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (variant_id IS NULL) AND ((service_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = ANY (ARRAY['intake_image'::text, 'handover_image'::text])) AND (appointment_id IS NOT NULL) AND (record_id IS NOT NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'adjustment_image'::text) AND (appointment_id IS NOT NULL) AND (adjustment_id IS NOT NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'pet_avatar'::text) AND (pet_id IS NOT NULL) AND (appointment_id IS NULL) AND (adjustment_id IS NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((product_id IS NULL) AND (appointment_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL) AND (record_id IS NULL) AND (adjustment_id IS NULL) AND (pet_id IS NULL) AND (((purpose = 'ticket_image'::text) AND (ticket_id IS NOT NULL) AND (support_message_id IS NOT NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL)) OR ((purpose = 'return_image'::text) AND (return_id IS NOT NULL) AND (sales_order_id IS NOT NULL) AND (ticket_id IS NULL) AND (support_message_id IS NULL)))))) OR ((purpose = 'review_image'::text) AND (review_id IS NOT NULL) AND (review_line_id IS NOT NULL) AND (review_kind IS NOT NULL) AND (review_kind = ANY (ARRAY['sales'::text, 'service'::text])) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL) AND (record_id IS NULL) AND (adjustment_id IS NULL) AND (pet_id IS NULL) AND (ticket_id IS NULL) AND (support_message_id IS NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL)))) OR ((purpose = ANY (ARRAY['banner_image'::text, 'blog_thumbnail'::text])) AND (content_id IS NOT NULL) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL) AND (record_id IS NULL) AND (adjustment_id IS NULL) AND (pet_id IS NULL) AND (ticket_id IS NULL) AND (support_message_id IS NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL) AND (review_id IS NULL) AND (review_line_id IS NULL) AND (review_kind IS NULL))));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK ((purpose = ANY (ARRAY['product_image'::text, 'care_log_image'::text, 'product_variant_image'::text, 'service_image'::text, 'intake_image'::text, 'handover_image'::text, 'adjustment_image'::text, 'pet_avatar'::text, 'ticket_image'::text, 'return_image'::text, 'review_image'::text, 'banner_image'::text, 'blog_thumbnail'::text])));
COMMIT;
