BEGIN;
CREATE OR REPLACE FUNCTION public.save_admin_setting_record(p_request uuid,p_table text,p_id uuid,p_expected jsonb,p_values jsonb,p_delete boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
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
END $$;
REVOKE ALL ON FUNCTION public.save_admin_setting_record(uuid,text,uuid,jsonb,jsonb,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admin_setting_record(uuid,text,uuid,jsonb,jsonb,boolean) TO authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.banner,public.blog_post,public.voucher,public.pawpal_setting,public.delivery_option_config FROM authenticated,anon;
CREATE OR REPLACE FUNCTION public.save_admin_shipping_settings(p_request uuid,p_options jsonb,p_config_id uuid,p_expected_config jsonb,p_config jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE item jsonb; result jsonb;
BEGIN
 IF p_request IS NULL OR p_options IS NULL OR jsonb_typeof(p_options)<>'array' OR jsonb_array_length(p_options)>100 THEN RAISE EXCEPTION 'invalid_shipping_batch' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_options) ORDER BY value->>'id' LOOP
  PERFORM public.save_admin_setting_record(md5(p_request::text||(item->>'id'))::uuid,'delivery_option_config',(item->>'id')::uuid,item->'expected',item->'values',false);
 END LOOP;
 result:=public.save_admin_setting_record(md5(p_request::text||p_config_id::text)::uuid,'pawpal_setting',p_config_id,p_expected_config,jsonb_build_object('setting_key','system_config','setting_type','json','setting_value',p_config::text),false);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_shipping_settings(uuid,jsonb,uuid,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admin_shipping_settings(uuid,jsonb,uuid,jsonb,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.guard_settings_audit() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF NEW.action IN ('SETTINGS_WRITE','SETTINGS_KNOWLEDGE') AND current_user IN ('authenticated','anon','authenticator') THEN RAISE EXCEPTION 'settings_audit_server_only' USING ERRCODE='42501'; END IF;RETURN NEW;END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_settings_audit() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS v1_settings_audit_server ON public.audit_log;
CREATE TRIGGER v1_settings_audit_server BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_settings_audit();
CREATE OR REPLACE FUNCTION public.sync_admin_article_knowledge(p_request uuid,p_article uuid,p_expected jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE article public.blog_post; actor uuid; prior public.audit_log; answer_text text; payload text;
BEGIN
 IF p_request IS NULL OR p_article IS NULL OR NOT pawpal_private.has_permission('blog_post.read') OR NOT pawpal_private.has_permission('blog_post.write') OR NOT pawpal_private.has_permission('chatbot_knowledge_faq.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'article_knowledge_forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('article',p_article,'expected',p_expected)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,57));
 SELECT * INTO prior FROM public.audit_log WHERE id=p_request;
 IF FOUND THEN
  IF prior.action<>'SETTINGS_KNOWLEDGE' OR prior.staff_id IS DISTINCT FROM actor OR prior.description IS DISTINCT FROM payload THEN RAISE EXCEPTION 'settings_request_conflict' USING ERRCODE='PT409'; END IF;RETURN;
 END IF;
 SELECT * INTO article FROM public.blog_post WHERE id=p_article FOR UPDATE;
 IF NOT FOUND OR to_jsonb(article) IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'article_changed_reload' USING ERRCODE='PT409'; END IF;
 IF article.status NOT IN ('published','da_xuat_ban') OR article.publish_at>now() THEN RAISE EXCEPTION 'article_not_published' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.chatbot_knowledge_faq WHERE id=p_article AND category<>'blog:'||p_article::text) THEN RAISE EXCEPTION 'knowledge_id_conflict' USING ERRCODE='PT409'; END IF;
 answer_text:=left(regexp_replace(regexp_replace(article.content,'<script[^>]*>.*?</script>','','gis'),'<[^>]*>',' ','g'),8000);
 IF length(btrim(answer_text))<1 THEN RAISE EXCEPTION 'article_content_empty' USING ERRCODE='22023'; END IF;
 INSERT INTO public.chatbot_knowledge_faq(id,category,question,answer,keywords,priority,is_active) VALUES(p_article,'blog:'||p_article::text,article.title,answer_text,'{}'::text[],1,true)
 ON CONFLICT(id) DO UPDATE SET question=excluded.question,answer=excluded.answer,is_active=true,updated_at=clock_timestamp();
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description) VALUES(p_request,actor,'SETTINGS_KNOWLEDGE','blog_post',p_article,payload);
END $$;
REVOKE ALL ON FUNCTION public.sync_admin_article_knowledge(uuid,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.sync_admin_article_knowledge(uuid,uuid,jsonb) TO authenticated;
DROP POLICY IF EXISTS anon_read ON public.blog_post;
DROP POLICY IF EXISTS public_read ON public.blog_post;
DROP POLICY IF EXISTS anon_read ON public.banner;
DROP POLICY IF EXISTS public_read ON public.banner;
DROP POLICY IF EXISTS v1_public_published ON public.blog_post;
CREATE POLICY v1_public_published ON public.blog_post FOR SELECT TO anon,authenticated USING(status IN ('published','da_xuat_ban') AND (publish_at IS NULL OR publish_at<=now()));
DROP POLICY IF EXISTS v1_public_active ON public.banner;
CREATE POLICY v1_public_active ON public.banner FOR SELECT TO anon,authenticated USING(status IN ('active','ACTIVE','dang_hien_thi') AND (start_date IS NULL OR start_date<=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AND (end_date IS NULL OR end_date>=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date));
GRANT SELECT ON public.banner,public.blog_post TO anon;
CREATE OR REPLACE FUNCTION public.get_public_site_notices() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',n->>'id','content',n->>'content','type',n->>'type','link',coalesce(n->>'link',''))),'[]'::jsonb)
 FROM public.pawpal_setting s CROSS JOIN LATERAL jsonb_array_elements(coalesce((s.setting_value::jsonb)->'websiteNotices','[]')) n
 WHERE s.setting_key='system_config' AND n->>'isActive'='true';
$$;
REVOKE ALL ON FUNCTION public.get_public_site_notices() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_site_notices() TO anon,authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['banner','blog_post','voucher','pawpal_setting','audit_log','delivery_option_config','payment_method_config'] LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t); END IF;
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
