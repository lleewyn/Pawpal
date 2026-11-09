BEGIN;
SET LOCAL lock_timeout='3s';
LOCK TABLE public.media_upload_session IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.media_upload_session WHERE purpose IN ('banner_image','blog_thumbnail')) THEN RAISE EXCEPTION 'content_rollback_requires_no_sessions';END IF;END $$;
CREATE OR REPLACE FUNCTION public.save_admin_setting_record(p_request uuid, p_table text, p_id uuid, p_expected jsonb, p_values jsonb, p_delete boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE actor uuid; original jsonb; merged jsonb; allowed text[]; columns text; prior public.audit_log; payload text; result jsonb; config jsonb; k text; value jsonb; old_config jsonb;
BEGIN
 IF p_request IS NULL OR p_id IS NULL OR p_table IS NULL OR p_table NOT IN ('banner','voucher','blog_post','pawpal_setting','delivery_option_config') OR p_values IS NULL OR jsonb_typeof(p_values)<>'object' OR p_delete IS NULL THEN RAISE EXCEPTION 'invalid_settings_request' USING ERRCODE='22023'; END IF;
 IF NOT pawpal_private.has_permission(p_table||'.read') OR NOT pawpal_private.has_permission(p_table||'.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'settings_forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('table',p_table,'id',p_id,'values',p_values,'delete',p_delete)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,57));
 SELECT * INTO prior FROM public.audit_log WHERE id=p_request;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.action<>'SETTINGS_WRITE' OR prior.description IS DISTINCT FROM payload THEN RAISE EXCEPTION 'settings_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN jsonb_build_object('id',p_id,'replayed',true);
 END IF;
 allowed:=CASE p_table WHEN 'banner' THEN ARRAY['title','description','image_url','link','button_text','display_order','start_date','end_date','status']
 WHEN 'voucher' THEN ARRAY['voucher_code','voucher_name','description','discount_value','minimum_order_amount','required_points','start_date','end_date','is_active','type','applicable_for','max_usage']
 WHEN 'blog_post' THEN ARRAY['title','slug','summary','content','category_id','thumbnail_url','publish_at','status']
 WHEN 'delivery_option_config' THEN ARRAY['fee','available']
 ELSE ARRAY['setting_key','setting_value','setting_type','description'] END;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_values) v WHERE NOT v=ANY(allowed)) THEN RAISE EXCEPTION 'invalid_settings_field' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_table||p_id::text,57));
 EXECUTE format('SELECT to_jsonb(r) FROM public.%I r WHERE id=$1 FOR UPDATE',p_table) INTO original USING p_id;
 IF original IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'settings_changed_reload' USING ERRCODE='PT409'; END IF;
 IF p_delete THEN
  IF original IS NULL OR p_table IN ('pawpal_setting','delivery_option_config') THEN RAISE EXCEPTION 'settings_delete_forbidden' USING ERRCODE='22023'; END IF;
  IF p_table='voucher' AND (EXISTS(SELECT 1 FROM public.customer_voucher WHERE voucher_id=p_id) OR EXISTS(SELECT 1 FROM public.voucher_redemption WHERE voucher_id=p_id)) THEN RAISE EXCEPTION 'voucher_in_use_disable_instead' USING ERRCODE='22023'; END IF;
  EXECUTE format('DELETE FROM public.%I WHERE id=$1',p_table) USING p_id;
  result:=jsonb_build_object('id',p_id);
 ELSE
  merged:=coalesce(original,jsonb_build_object('id',p_id,'created_at',now(),'display_order',0,'view_count',0,'author_id',actor,'minimum_order_amount',0,'required_points',0,'is_active',true))||p_values||jsonb_build_object('updated_at',clock_timestamp());
  IF p_table='banner' THEN
   IF coalesce(length(btrim(merged->>'title')),0) NOT BETWEEN 1 AND 300 OR coalesce(merged->>'image_url','')!~'^(https?://|/[^/])' OR coalesce(merged->>'status','') NOT IN ('active','inactive','pending','scheduled','expired','paused','dang_hien_thi','tam_an','ACTIVE','INACTIVE') OR coalesce(merged->>'link','')!~'^(https?://|/[^/]|#|$)' OR (merged->>'end_date')::date<(merged->>'start_date')::date THEN RAISE EXCEPTION 'invalid_banner' USING ERRCODE='22023'; END IF;
  ELSIF p_table='voucher' THEN
   IF ((original IS NULL OR p_values?'type') AND coalesce(merged->>'type','') NOT IN ('percentage','fixed','shipping')) OR ((original IS NULL OR p_values?'applicable_for') AND coalesce(merged->>'applicable_for','') NOT IN ('all','shop','care','hotel','taxi','services')) OR (merged->>'type' IN ('percent','percentage') AND (merged->>'discount_value')::numeric>100) THEN RAISE EXCEPTION 'invalid_voucher' USING ERRCODE='22023'; END IF;
  ELSIF p_table='blog_post' THEN
   IF coalesce(length(btrim(merged->>'title')),0) NOT BETWEEN 1 AND 300 OR coalesce(length(btrim(merged->>'content')),0) NOT BETWEEN 1 AND 200000 OR coalesce(merged->>'slug','')!~'^[a-z0-9]+(-[a-z0-9]+)*$' OR coalesce(merged->>'status','') NOT IN ('published','draft','hidden','pending','da_xuat_ban','nhap','da_an') THEN RAISE EXCEPTION 'invalid_article' USING ERRCODE='22023'; END IF;
   IF coalesce(merged->>'thumbnail_url','')!~'^(https://|/[^/]|$)' THEN RAISE EXCEPTION 'invalid_article_image' USING ERRCODE='22023'; END IF;
   IF merged->>'content'~*'<\s*(script|iframe|object|embed|svg|math|link|style)|\son[a-z]+\s*=|javascript\s*:' THEN RAISE EXCEPTION 'unsafe_article_markup' USING ERRCODE='22023'; END IF;
  ELSIF p_table='delivery_option_config' THEN
   IF original IS NULL OR (merged->>'fee')::numeric NOT BETWEEN 0 AND 1000000000 OR jsonb_typeof(merged->'fee')<>'number' OR jsonb_typeof(merged->'available')<>'boolean' THEN RAISE EXCEPTION 'invalid_delivery_option' USING ERRCODE='22023'; END IF;
  ELSE
   IF merged->>'setting_key'<>'system_config' OR merged->>'setting_type'<>'json' THEN RAISE EXCEPTION 'unsupported_settings_key' USING ERRCODE='22023'; END IF;
   config:=(merged->>'setting_value')::jsonb;
   old_config:=coalesce((original->>'setting_value')::jsonb,'{}');
   IF jsonb_typeof(config)<>'object' OR length(config::text)>200000 OR config::text~*'"(api.?key|password|secret|[^"]*token[^"]*|private.?key)"\s*:' THEN RAISE EXCEPTION 'invalid_or_sensitive_configuration' USING ERRCODE='22023'; END IF;
   IF EXISTS(SELECT 1 FROM jsonb_object_keys(config) v WHERE v NOT IN ('storeInfo','paymentMethods','shippingPolicy','operatingHours','hotelRules','bookingPolicy','pawpointsPolicy','websiteNotices','ragSyncedArticleIds')) THEN RAISE EXCEPTION 'invalid_configuration_section' USING ERRCODE='22023'; END IF;
   FOR k,value IN SELECT * FROM jsonb_each(config) WHERE key NOT IN ('websiteNotices','ragSyncedArticleIds') LOOP
    IF jsonb_typeof(value)<>'object' THEN RAISE EXCEPTION 'invalid_configuration_object' USING ERRCODE='22023'; END IF;
   END LOOP;
   IF config?'paymentMethods' AND config->'paymentMethods' IS DISTINCT FROM old_config->'paymentMethods' THEN
    IF NOT pawpal_private.has_permission('payment_method_config.write') THEN RAISE EXCEPTION 'payment_configuration_forbidden' USING ERRCODE='42501'; END IF;
    FOR k,value IN SELECT * FROM jsonb_each(config->'paymentMethods') LOOP
     IF k NOT IN ('cod','bank','momo','vnpay') OR jsonb_typeof(value)<>'object' OR jsonb_typeof(value->'enabled')<>'boolean' THEN RAISE EXCEPTION 'invalid_payment_configuration' USING ERRCODE='22023'; END IF;
     IF k='bank' AND (value->>'enabled')::boolean AND (coalesce(value->>'accountNumber','')!~'^[0-9 -]+$' OR coalesce(length(btrim(value->>'accountHolder')),0)=0 OR coalesce(length(btrim(value->>'bankName')),0)=0 OR coalesce(length(btrim(value->>'syntax')),0)=0) THEN RAISE EXCEPTION 'invalid_bank_configuration' USING ERRCODE='22023'; END IF;
     UPDATE public.payment_method_config SET available=(value->>'enabled')::boolean,
      bank_info=CASE WHEN k='bank' THEN coalesce(bank_info,'{}')||jsonb_build_object('bankName',value->>'bankName','accountNumber',value->>'accountNumber','accountHolder',value->>'accountHolder','syntax',value->>'syntax') ELSE bank_info END
      WHERE lower(short_name)=ANY(CASE k WHEN 'bank' THEN ARRAY['bank transfer','vietqr'] ELSE ARRAY[k] END);
    END LOOP;
   END IF;
   FOR k,value IN SELECT * FROM jsonb_each(coalesce(config->'operatingHours','{}')) WHERE key IN ('weekday','weekend') LOOP
    IF value<>'{}'::jsonb AND (coalesce(value->>'open','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' OR coalesce(value->>'close','')!~'^([01][0-9]|2[0-3]):[0-5][0-9]$' OR value->>'open'>=value->>'close') THEN RAISE EXCEPTION 'invalid_operating_hours' USING ERRCODE='22023'; END IF;
   END LOOP;
   FOR k,value IN SELECT * FROM jsonb_each(coalesce(config->'bookingPolicy','{}')) WHERE key IN ('slotCapacityMax','freeCancelHours','lateCancelFee') LOOP
    IF jsonb_typeof(value)<>'number' OR value::text::numeric<0 OR value::text::numeric>1000000000 OR (k='slotCapacityMax' AND (value::text::numeric<1 OR trunc(value::text::numeric)<>value::text::numeric)) THEN RAISE EXCEPTION 'invalid_booking_policy' USING ERRCODE='22023'; END IF;
   END LOOP;
   IF config?'websiteNotices' THEN
    IF jsonb_typeof(config->'websiteNotices')<>'array' OR jsonb_array_length(config->'websiteNotices')>1000 THEN RAISE EXCEPTION 'invalid_notices' USING ERRCODE='22023'; END IF;
    FOR value IN SELECT * FROM jsonb_array_elements(config->'websiteNotices') LOOP
     IF coalesce(length(btrim(value->>'content')),0) NOT BETWEEN 1 AND 2000 OR coalesce(value->>'link','')!~'^(https?://|/[^/]|#|$)' THEN RAISE EXCEPTION 'invalid_notice' USING ERRCODE='22023'; END IF;
    END LOOP;
   END IF;
   FOR k,value IN SELECT * FROM jsonb_each(coalesce(config->'pawpointsPolicy','{}')) LOOP
    IF k NOT IN ('pointValueVnd','registerBonus','firstOrderPoints','firstBookingPoints','birthdayPoints') OR jsonb_typeof(value)<>'number' OR value::text::numeric<0 OR value::text::numeric>1000000000 OR (k='pointValueVnd' AND value::text::numeric<=0) THEN RAISE EXCEPTION 'invalid_points_policy' USING ERRCODE='22023'; END IF;
   END LOOP;
   FOR k,value IN SELECT * FROM jsonb_each(coalesce(config->'shippingPolicy','{}')) WHERE key IN ('freeShippingThreshold','innerCityFee','outerCityFee','expressFee') LOOP
    IF jsonb_typeof(value)<>'number' OR value::text::numeric<0 OR value::text::numeric>1000000000 THEN RAISE EXCEPTION 'invalid_shipping_fee' USING ERRCODE='22023'; END IF;
   END LOOP;
   IF config#>>'{pawpointsPolicy,pointValueVnd}' IS DISTINCT FROM (original->>'setting_value')::jsonb#>>'{pawpointsPolicy,pointValueVnd}' AND config#>>'{pawpointsPolicy,pointValueVnd}' IS NOT NULL THEN
    INSERT INTO public.pawpal_setting(setting_key,setting_value,setting_type,description) VALUES('sales_point_redemption_value',config#>>'{pawpointsPolicy,pointValueVnd}','number','Point redemption configured by administration') ON CONFLICT(setting_key) DO UPDATE SET setting_value=excluded.setting_value,updated_at=clock_timestamp();
   END IF;
  END IF;
  SELECT string_agg(format('%I',column_name),',' ORDER BY ordinal_position) INTO columns FROM information_schema.columns WHERE table_schema='public' AND table_name=p_table;
  IF original IS NULL THEN EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_record(NULL::public.%I,$1) RETURNING to_jsonb(%I.*)',p_table,p_table,p_table) INTO result USING merged;
  ELSE EXECUTE format('UPDATE public.%I SET (%s)=(SELECT %s FROM jsonb_populate_record(NULL::public.%I,$1)) WHERE id=$2 RETURNING to_jsonb(%I.*)',p_table,columns,columns,p_table,p_table) INTO result USING merged,p_id; END IF;
 END IF;
 IF p_table='blog_post' THEN
  UPDATE public.chatbot_knowledge_faq SET is_active=false,updated_at=clock_timestamp() WHERE id=p_id AND category='blog:'||p_id::text;
 END IF;
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request,actor,'SETTINGS_WRITE',p_table,p_id,payload);
 RETURN result;
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
 RETURN jsonb_build_object('id',a.id,'mongo_file_id',a.mongo_file_id,'mime_type',a.mime_type,'size_bytes',a.size_bytes,'sha256',a.sha256,'public',public_read,'cache_public',public_read AND s.purpose<>'review_image');
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
DROP TRIGGER banner_media_guard ON public.banner;DROP TRIGGER banner_media_release ON public.banner;DROP TRIGGER blog_media_guard ON public.blog_post;DROP TRIGGER blog_media_release ON public.blog_post;
DROP FUNCTION public.prepare_content_media_upload(uuid,text,uuid,bigint,text,text),pawpal_private.guard_content_media(),pawpal_private.release_content_media();
ALTER TABLE public.banner DROP CONSTRAINT banner_image_one_source,DROP COLUMN image_media_asset_id,ALTER COLUMN image_url SET NOT NULL;
ALTER TABLE public.blog_post DROP CONSTRAINT blog_thumbnail_one_source,DROP COLUMN thumbnail_media_asset_id;
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check,DROP COLUMN content_id;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK ((((review_id IS NULL) AND (review_line_id IS NULL) AND (review_kind IS NULL) AND (((ticket_id IS NULL) AND (support_message_id IS NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL) AND (((pet_id IS NULL) AND (((adjustment_id IS NULL) AND (((record_id IS NULL) AND (((service_id IS NULL) AND (((purpose = 'product_image'::text) AND (variant_id IS NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))) OR ((purpose = 'care_log_image'::text) AND (variant_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (appointment_id IS NOT NULL)) OR ((purpose = 'product_variant_image'::text) AND (variant_id IS NOT NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = 'service_image'::text) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (variant_id IS NULL) AND ((service_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = ANY (ARRAY['intake_image'::text, 'handover_image'::text])) AND (appointment_id IS NOT NULL) AND (record_id IS NOT NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'adjustment_image'::text) AND (appointment_id IS NOT NULL) AND (adjustment_id IS NOT NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'pet_avatar'::text) AND (pet_id IS NOT NULL) AND (appointment_id IS NULL) AND (adjustment_id IS NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((product_id IS NULL) AND (appointment_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL) AND (record_id IS NULL) AND (adjustment_id IS NULL) AND (pet_id IS NULL) AND (((purpose = 'ticket_image'::text) AND (ticket_id IS NOT NULL) AND (support_message_id IS NOT NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL)) OR ((purpose = 'return_image'::text) AND (return_id IS NOT NULL) AND (sales_order_id IS NOT NULL) AND (ticket_id IS NULL) AND (support_message_id IS NULL)))))) OR ((purpose = 'review_image'::text) AND (review_id IS NOT NULL) AND (review_line_id IS NOT NULL) AND (review_kind IS NOT NULL) AND (review_kind = ANY (ARRAY['sales'::text, 'service'::text])) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL) AND (record_id IS NULL) AND (adjustment_id IS NULL) AND (pet_id IS NULL) AND (ticket_id IS NULL) AND (support_message_id IS NULL) AND (return_id IS NULL) AND (sales_order_id IS NULL))));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK ((purpose = ANY (ARRAY['product_image'::text, 'care_log_image'::text, 'product_variant_image'::text, 'service_image'::text, 'intake_image'::text, 'handover_image'::text, 'adjustment_image'::text, 'pet_avatar'::text, 'ticket_image'::text, 'return_image'::text, 'review_image'::text])));
COMMIT;
