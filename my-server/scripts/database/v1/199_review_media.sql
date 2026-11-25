BEGIN;
SET LOCAL lock_timeout='3s';
ALTER TABLE public.media_upload_session ADD COLUMN review_id uuid,ADD COLUMN review_line_id uuid,ADD COLUMN review_kind text;
ALTER TABLE public.review_media ADD COLUMN media_asset_id uuid UNIQUE REFERENCES public.media_asset(id),ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.review_media ADD CONSTRAINT review_media_one_source CHECK((image_url IS NOT NULL)::integer+(media_asset_id IS NOT NULL)::integer=1);
CREATE FUNCTION pawpal_private.review_media_access(p_user uuid,p_review uuid,p_line uuid,p_kind text,p_write boolean) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; r public.review;
BEGIN
 IF p_user IS NULL OR p_review IS NULL OR p_line IS NULL OR p_kind IS NULL OR p_kind NOT IN ('sales','service') THEN RETURN false;END IF;
 IF p_kind='sales' THEN SELECT o.customer_id INTO owner_id FROM public.sales_order_detail l JOIN public.sales_order o ON o.id=l.order_id WHERE l.id=p_line AND (NOT p_write OR o.order_status IN ('completed','delivered'));
 ELSE SELECT ap.customer_id INTO owner_id FROM public.appointment_item i JOIN public.appointment ap ON ap.id=i.appointment_id WHERE i.id=p_line AND (NOT p_write OR (ap.appointment_status='completed' AND i.status='completed'));END IF;
 IF owner_id IS NULL THEN RETURN false;END IF;
 SELECT * INTO r FROM public.review WHERE id=p_review;
 IF FOUND AND (CASE WHEN p_kind='sales' THEN r.sales_order_detail_id ELSE r.appointment_item_id END) IS DISTINCT FROM p_line THEN RETURN false;END IF;
 IF p_write AND r.id IS NOT NULL THEN RETURN false;END IF;
 IF NOT p_write AND pawpal_private.evidence_admin(p_user) THEN RETURN true;END IF;
 RETURN coalesce(pawpal_private.evidence_customer(p_user)=owner_id,false);
END $$;
CREATE FUNCTION pawpal_private.attach_review_media(p_review uuid,p_ids jsonb,p_allow_new boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.review;item jsonb;selected uuid;seen uuid[]:='{}';a public.media_asset;s public.media_upload_session;position integer;kind text;line_id uuid;
BEGIN
 SELECT * INTO r FROM public.review WHERE id=p_review FOR UPDATE;
 kind:=CASE WHEN r.sales_order_detail_id IS NOT NULL THEN 'sales' ELSE 'service' END;line_id:=coalesce(r.sales_order_detail_id,r.appointment_item_id);
 IF r.id IS NULL OR NOT pawpal_private.review_media_access(auth.uid(),p_review,line_id,kind,false) OR pawpal_private.evidence_customer(auth.uid()) IS NULL THEN RAISE EXCEPTION 'review_media_forbidden' USING ERRCODE='42501';END IF;
 IF jsonb_typeof(p_ids) IS DISTINCT FROM 'array' OR jsonb_array_length(p_ids)>5 THEN RAISE EXCEPTION 'invalid_review_media' USING ERRCODE='22023';END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_ids) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_review_media' USING ERRCODE='22023';END IF;
  selected:=(item#>>'{}')::uuid;IF selected IS NULL OR selected=ANY(seen) THEN RAISE EXCEPTION 'invalid_review_media' USING ERRCODE='22023';END IF;seen:=array_append(seen,selected);
  SELECT * INTO a FROM public.media_asset WHERE id=selected;SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;SELECT * INTO a FROM public.media_asset WHERE id=selected FOR UPDATE;
  IF a.id IS NULL OR s.purpose<>'review_image' OR s.review_id IS DISTINCT FROM r.id OR s.review_line_id IS DISTINCT FROM line_id OR s.review_kind IS DISTINCT FROM kind
   OR s.created_by IS DISTINCT FROM auth.uid() OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached') THEN RAISE EXCEPTION 'review_media_forbidden' USING ERRCODE='42501';END IF;
  IF NOT EXISTS(SELECT 1 FROM public.review_media WHERE media_asset_id=a.id AND review_id=r.id) THEN
   IF NOT p_allow_new OR r.review_status<>'pending' THEN RAISE EXCEPTION 'review_media_frozen' USING ERRCODE='42501';END IF;
   SELECT count(*) INTO position FROM public.review_media WHERE review_id=r.id;IF position>=5 THEN RAISE EXCEPTION 'review_media_limit' USING ERRCODE='22023';END IF;
   INSERT INTO public.review_media(review_id,media_asset_id,display_order) VALUES(r.id,a.id,position);
  END IF;
  UPDATE public.media_asset SET status='attached' WHERE id=a.id;UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.review_media_access(uuid,uuid,uuid,text,boolean),pawpal_private.attach_review_media(uuid,jsonb,boolean) FROM PUBLIC,anon,authenticated,service_role;

ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK(purpose IN ('product_image','care_log_image','product_variant_image','service_image','intake_image','handover_image','adjustment_image','pet_avatar','ticket_image','return_image','review_image'));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK((review_id IS NULL AND review_line_id IS NULL AND review_kind IS NULL AND ((((ticket_id IS NULL) AND (support_message_id IS NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL) AND (((pet_id IS NULL) AND (((adjustment_id IS NULL) AND (((record_id IS NULL) AND (((service_id IS NULL) AND (((purpose = 'product_image'::text) AND (variant_id IS NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))) OR ((purpose = 'care_log_image'::text) AND (variant_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (appointment_id IS NOT NULL)) OR ((purpose = 'product_variant_image'::text) AND (variant_id IS NOT NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = 'service_image'::text) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (variant_id IS NULL) AND ((service_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = ANY (ARRAY['intake_image'::text, 'handover_image'::text])) AND (appointment_id IS NOT NULL) AND (record_id IS NOT NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'adjustment_image'::text) AND (appointment_id IS NOT NULL) AND (adjustment_id IS NOT NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'pet_avatar'::text) AND (pet_id IS NOT NULL) AND (appointment_id IS NULL) AND (adjustment_id IS NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((product_id IS NULL) AND (appointment_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL) AND (record_id IS NULL) AND (adjustment_id IS NULL) AND (pet_id IS NULL) AND (((purpose = 'ticket_image'::text) AND (ticket_id IS NOT NULL) AND (support_message_id IS NOT NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL)) OR ((purpose = 'return_image'::text) AND (return_id IS NOT NULL) AND (sales_order_id IS NOT NULL) AND (ticket_id IS NULL) AND (support_message_id IS NULL))))))) OR (purpose='review_image' AND review_id IS NOT NULL AND review_line_id IS NOT NULL AND review_kind IS NOT NULL AND review_kind IN ('sales','service') AND product_id IS NULL AND appointment_id IS NULL AND draft_id IS NULL AND variant_id IS NULL AND service_id IS NULL AND record_id IS NULL AND adjustment_id IS NULL AND pet_id IS NULL AND ticket_id IS NULL AND support_message_id IS NULL AND return_id IS NULL AND sales_order_id IS NULL));
CREATE OR REPLACE FUNCTION public.prepare_review_media_upload(p_request uuid, p_target uuid, p_context uuid, p_kind text, p_size bigint, p_mime text, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE p_purpose constant text:='review_image';p_appointment uuid:=null; p_product uuid:=null; p_draft uuid:=null; s public.media_upload_session; budget bigint; used bigint;
BEGIN
 IF NOT coalesce(pawpal_private.review_media_access(auth.uid(),p_target,p_context,p_kind,true),false) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_target IS NULL OR p_context IS NULL OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 3145728
 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp') OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200
  THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pawpal-media-quota',188));
 SELECT * INTO s FROM public.media_upload_session WHERE created_by=auth.uid() AND request_id=p_request FOR UPDATE;
 IF FOUND THEN
  IF s.review_id IS DISTINCT FROM p_target OR s.review_line_id IS DISTINCT FROM p_context OR s.review_kind IS DISTINCT FROM p_kind OR s.purpose IS DISTINCT FROM p_purpose OR s.product_id IS DISTINCT FROM p_product OR s.appointment_id IS DISTINCT FROM p_appointment OR s.draft_id IS DISTINCT FROM p_draft
  OR s.declared_size<>p_size OR s.mime_type<>p_mime OR s.original_name<>p_name THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409'; END IF;
  IF s.state NOT IN ('pending','verified','attached') OR s.expires_at<=now() AND s.state='pending' THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
  RETURN jsonb_build_object('session_id',s.id,'state',s.state,'asset_id',(SELECT id FROM public.media_asset WHERE session_id=s.id));
 END IF;
 SELECT max_storage_bytes INTO budget FROM pawpal_private.media_settings WHERE singleton AND enabled;
 IF budget IS NULL OR budget=0 THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 SELECT coalesce(sum(declared_size),0) INTO used FROM public.media_upload_session WHERE state<>'deleted';
 IF used+p_size>budget THEN RAISE EXCEPTION 'media_quota_exceeded' USING ERRCODE='54000'; END IF;
 IF (SELECT count(*) FROM public.media_upload_session WHERE created_by=auth.uid() AND state IN ('pending','uploading','verified'))>=10 THEN RAISE EXCEPTION 'media_too_many_pending' USING ERRCODE='54000'; END IF;
 INSERT INTO public.media_upload_session(created_by,request_id,purpose,product_id,appointment_id,draft_id,review_id,review_line_id,review_kind,declared_size,mime_type,original_name)
 VALUES(auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,p_target,p_context,p_kind,p_size,p_mime,p_name) RETURNING * INTO s;
 RETURN jsonb_build_object('session_id',s.id,'state',s.state);
END $function$
;
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
 public_read:=public_read OR (a.status='attached' AND s.purpose='review_image' AND EXISTS(SELECT 1 FROM public.review_media m JOIN public.review r ON r.id=m.review_id WHERE m.media_asset_id=a.id AND r.id=s.review_id AND r.review_status IN ('published','approved','da_duyet')));
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
  IF a.id IS NOT NULL AND (a.legal_hold OR a.retention_until>now() OR EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.review_media WHERE media_asset_id=a.id)) THEN CONTINUE; END IF;
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
 AND NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.review_media WHERE media_asset_id=OLD.media_asset_id) THEN
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
   PERFORM pawpal_private.attach_review_media(prior.id,coalesce(item->'media_asset_ids','[]'::jsonb),false);
   result:=result||jsonb_build_array(prior.id);CONTINUE;
  END IF;
  INSERT INTO public.review(id,sales_order_detail_id,rating,review_content,review_status)
  VALUES(review_id,line_id,stars::integer,content,'pending');
  PERFORM pawpal_private.attach_review_media(review_id,coalesce(item->'media_asset_ids','[]'::jsonb),true);
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
   PERFORM pawpal_private.attach_review_media(prior.id,coalesce(item->'media_asset_ids','[]'::jsonb),false);
   result:=result||jsonb_build_array(prior.id);CONTINUE;
  END IF;
  INSERT INTO public.review(id,appointment_item_id,rating,review_content,review_status)
  VALUES(review_id,line_id,stars::integer,content,'pending');
  PERFORM pawpal_private.attach_review_media(review_id,coalesce(item->'media_asset_ids','[]'::jsonb),true);
  result:=result||jsonb_build_array(review_id);
 END LOOP;
 RETURN result;
END $function$
;
CREATE TRIGGER review_media_release AFTER DELETE ON public.review_media FOR EACH ROW EXECUTE FUNCTION pawpal_private.release_media_reference();
REVOKE ALL ON FUNCTION public.prepare_review_media_upload(uuid,uuid,uuid,text,bigint,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_review_media_upload(uuid,uuid,uuid,text,bigint,text,text) TO authenticated;
COMMIT;
