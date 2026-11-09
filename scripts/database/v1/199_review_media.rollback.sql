BEGIN;
SET LOCAL lock_timeout='3s';
LOCK TABLE public.media_upload_session IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.media_upload_session WHERE purpose='review_image') THEN RAISE EXCEPTION 'review_media_rollback_requires_no_sessions';END IF;END $$;
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
 IF s.purpose IN ('ticket_image','return_image') THEN RETURN coalesce(pawpal_private.evidence_access(p_user,s.purpose,coalesce(s.support_message_id,s.return_id),coalesce(s.ticket_id,s.sales_order_id),p_write),false); END IF;
 RETURN pawpal_private.media_manage(p_user,s.purpose,s.product_id,s.appointment_id);
END $function$
;
CREATE OR REPLACE FUNCTION public.resolve_media_asset(p_asset uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.media_asset; s public.media_upload_session; public_read boolean; allowed boolean; staff_actor uuid;
BEGIN
 SELECT * INTO a FROM public.media_asset WHERE id=p_asset AND status IN ('verified','attached');
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id;
 public_read:=a.status='attached' AND s.purpose='product_image' AND EXISTS(SELECT 1 FROM public.product_media m JOIN public.product p ON p.id=m.product_id WHERE m.media_asset_id=a.id AND p.status='active');
 public_read:=public_read OR (a.status='attached' AND s.purpose='product_variant_image' AND EXISTS(
 SELECT 1 FROM public.product_variant_media m JOIN public.product_variant v ON v.id=m.product_variant_id JOIN public.product p ON p.id=v.product_id
 WHERE m.media_asset_id=a.id AND v.id=s.variant_id AND p.status='active' AND v.status='active' AND NOT v.catalog_retired));
 public_read:=public_read OR (a.status='attached' AND s.purpose='service_image' AND EXISTS(SELECT 1 FROM public.service_image m JOIN public.service v ON v.id=m.service_id WHERE m.media_asset_id=a.id AND v.id=s.service_id AND v.status='active'));
 allowed:=public_read;
 IF NOT allowed AND auth.uid() IS NOT NULL THEN
  allowed:=pawpal_private.media_session_manage(auth.uid(),s.id,false) AND (a.status='attached' OR s.created_by=auth.uid());
  IF NOT allowed AND a.status='attached' AND s.purpose IN ('intake_image','handover_image') AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.appointment_record_media m JOIN public.appointment_record r ON r.id=m.record_id JOIN public.appointment ap ON ap.id=r.appointment_id WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='adjustment_image' AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.appointment_adjustment_media m JOIN public.appointment_adjustment r ON r.id=m.adjustment_id JOIN public.appointment ap ON ap.id=r.appointment_id WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='pet_avatar' THEN
   allowed:=EXISTS(SELECT 1 FROM public.pet_profile p WHERE p.avatar_media_asset_id=a.id AND p.id=s.pet_id AND (
    (NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) AND pawpal_private.owns_customer(p.customer_id))
    OR EXISTS(SELECT 1 FROM public.appointment ap WHERE ap.pet_id=p.id AND pawpal_private.media_manage(auth.uid(),'care_log_image',null,ap.id))));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='care_log_image'
  AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.care_log_media m JOIN public.care_log l ON l.id=m.care_log_id JOIN public.appointment ap ON ap.id=l.appointment_id
    WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
 END IF;
 IF NOT coalesce(allowed,false) THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('id',a.id,'mongo_file_id',a.mongo_file_id,'mime_type',a.mime_type,'size_bytes',a.size_bytes,'sha256',a.sha256,'public',public_read);
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
  IF a.id IS NOT NULL AND (a.legal_hold OR a.retention_until>now() OR EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=a.id)) THEN CONTINUE; END IF;
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
 AND NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=OLD.media_asset_id) THEN
  UPDATE public.media_asset SET status='pending_delete',retention_until=now()+interval '7 days' WHERE id=OLD.media_asset_id;
  UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '7 days' WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.media_asset_id);
 END IF;
 RETURN NULL;
END $function$
;
CREATE OR REPLACE FUNCTION public.submit_own_sales_reviews(p_order uuid, p_reviews jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE o public.sales_order; item jsonb; line_id uuid; review_id uuid; stars numeric; content text;
 prior public.review; seen uuid[]:='{}'; result jsonb:='[]';
BEGIN
 SELECT * INTO o FROM public.sales_order WHERE id=p_order FOR UPDATE;
 IF NOT FOUND OR NOT pawpal_private.owns_customer(o.customer_id)
 OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'review_owner_required' USING ERRCODE='42501'; END IF;
 IF o.order_status NOT IN ('completed','delivered') THEN RAISE EXCEPTION 'review_requires_received_order' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_reviews) IS DISTINCT FROM 'array' OR jsonb_array_length(p_reviews) NOT BETWEEN 1 AND 100 OR length(p_reviews::text)>350000 THEN RAISE EXCEPTION 'invalid_reviews' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_reviews) LOOP
  line_id:=(item->>'line_id')::uuid;review_id:=(item->>'id')::uuid;stars:=(item->>'rating')::numeric;content:=btrim(item->>'content');
  IF line_id IS NULL OR review_id IS NULL OR line_id=ANY(seen) OR stars IS NULL OR stars::text IN ('NaN','Infinity','-Infinity')
  OR stars NOT BETWEEN 1 AND 5 OR round(stars)<>stars OR coalesce(length(content),0) NOT BETWEEN 1 AND 3000
  OR NOT EXISTS(SELECT 1 FROM public.sales_order_detail WHERE id=line_id AND order_id=o.id) THEN RAISE EXCEPTION 'invalid_review_line' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,line_id);
  SELECT * INTO prior FROM public.review WHERE sales_order_detail_id=line_id LIMIT 1;
  IF FOUND THEN
   IF prior.id<>review_id OR prior.rating<>stars OR prior.review_content IS DISTINCT FROM content THEN RAISE EXCEPTION 'review_already_submitted' USING ERRCODE='PT409'; END IF;
   result:=result||jsonb_build_array(prior.id);CONTINUE;
  END IF;
  INSERT INTO public.review(id,sales_order_detail_id,rating,review_content,review_status)
  VALUES(review_id,line_id,stars::integer,content,'pending');
  result:=result||jsonb_build_array(review_id);
 END LOOP;
 RETURN result;
END $function$
;
CREATE OR REPLACE FUNCTION public.submit_own_service_reviews(p_booking uuid, p_reviews jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.appointment; item jsonb; line_id uuid; review_id uuid; stars numeric; content text;
 prior public.review; seen uuid[]:='{}'; result jsonb:='[]';
BEGIN
 SELECT * INTO a FROM public.appointment WHERE id=p_booking FOR UPDATE;
 IF NOT FOUND OR NOT pawpal_private.owns_customer(a.customer_id)
 OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'review_owner_required' USING ERRCODE='42501'; END IF;
 IF a.appointment_status<>'completed' THEN RAISE EXCEPTION 'review_requires_completed_service' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_reviews) IS DISTINCT FROM 'array' OR jsonb_array_length(p_reviews) NOT BETWEEN 1 AND 100 OR length(p_reviews::text)>350000 THEN RAISE EXCEPTION 'invalid_reviews' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_reviews) LOOP
  line_id:=(item->>'line_id')::uuid;review_id:=(item->>'id')::uuid;stars:=(item->>'rating')::numeric;content:=btrim(item->>'content');
  IF line_id IS NULL OR review_id IS NULL OR line_id=ANY(seen) OR stars IS NULL OR stars::text IN ('NaN','Infinity','-Infinity')
  OR stars NOT BETWEEN 1 AND 5 OR round(stars)<>stars OR coalesce(length(content),0) NOT BETWEEN 1 AND 3000
  OR NOT EXISTS(SELECT 1 FROM public.appointment_item WHERE id=line_id AND appointment_id=a.id AND status='completed') THEN RAISE EXCEPTION 'invalid_review_line' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,line_id);
  SELECT * INTO prior FROM public.review WHERE appointment_item_id=line_id LIMIT 1;
  IF FOUND THEN
   IF prior.id<>review_id OR prior.rating<>stars OR prior.review_content IS DISTINCT FROM content THEN RAISE EXCEPTION 'review_already_submitted' USING ERRCODE='PT409'; END IF;
   result:=result||jsonb_build_array(prior.id);CONTINUE;
  END IF;
  INSERT INTO public.review(id,appointment_item_id,rating,review_content,review_status)
  VALUES(review_id,line_id,stars::integer,content,'pending');
  result:=result||jsonb_build_array(review_id);
 END LOOP;
 RETURN result;
END $function$
;
DROP TRIGGER review_media_release ON public.review_media;
DROP FUNCTION public.prepare_review_media_upload(uuid,uuid,uuid,text,bigint,text,text),pawpal_private.attach_review_media(uuid,jsonb,boolean),pawpal_private.review_media_access(uuid,uuid,uuid,text,boolean);
ALTER TABLE public.review_media DROP CONSTRAINT review_media_one_source,DROP COLUMN media_asset_id,ALTER COLUMN image_url SET NOT NULL;
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check,DROP COLUMN review_id,DROP COLUMN review_line_id,DROP COLUMN review_kind;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK ((((ticket_id IS NULL) AND (support_message_id IS NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL) AND (((pet_id IS NULL) AND (((adjustment_id IS NULL) AND (((record_id IS NULL) AND (((service_id IS NULL) AND (((purpose = 'product_image'::text) AND (variant_id IS NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))) OR ((purpose = 'care_log_image'::text) AND (variant_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (appointment_id IS NOT NULL)) OR ((purpose = 'product_variant_image'::text) AND (variant_id IS NOT NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = 'service_image'::text) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (variant_id IS NULL) AND ((service_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = ANY (ARRAY['intake_image'::text, 'handover_image'::text])) AND (appointment_id IS NOT NULL) AND (record_id IS NOT NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'adjustment_image'::text) AND (appointment_id IS NOT NULL) AND (adjustment_id IS NOT NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'pet_avatar'::text) AND (pet_id IS NOT NULL) AND (appointment_id IS NULL) AND (adjustment_id IS NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((product_id IS NULL) AND (appointment_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL) AND (record_id IS NULL) AND (adjustment_id IS NULL) AND (pet_id IS NULL) AND (((purpose = 'ticket_image'::text) AND (ticket_id IS NOT NULL) AND (support_message_id IS NOT NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL)) OR ((purpose = 'return_image'::text) AND (return_id IS NOT NULL) AND (sales_order_id IS NOT NULL) AND (ticket_id IS NULL) AND (support_message_id IS NULL))))));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK ((purpose = ANY (ARRAY['product_image'::text, 'care_log_image'::text, 'product_variant_image'::text, 'service_image'::text, 'intake_image'::text, 'handover_image'::text, 'adjustment_image'::text, 'pet_avatar'::text, 'ticket_image'::text, 'return_image'::text])));
COMMIT;
