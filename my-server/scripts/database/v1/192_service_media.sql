BEGIN;
SET LOCAL lock_timeout='3s';
ALTER TABLE public.media_upload_session ADD COLUMN service_id uuid REFERENCES public.service(id);
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK ((service_id IS NULL AND (((purpose = 'product_image'::text) AND (variant_id IS NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))) OR ((purpose = 'care_log_image'::text) AND (variant_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (appointment_id IS NOT NULL)) OR ((purpose = 'product_variant_image'::text) AND (variant_id IS NOT NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR (purpose='service_image' AND product_id IS NULL AND appointment_id IS NULL AND variant_id IS NULL AND (service_id IS NOT NULL OR draft_id IS NOT NULL)));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK(purpose IN ('product_image','care_log_image','product_variant_image','service_image'));
ALTER TABLE public.service_image ADD COLUMN media_asset_id uuid UNIQUE REFERENCES public.media_asset(id);
ALTER TABLE public.service_image ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.service_image ADD CONSTRAINT service_media_one_source CHECK((image_url IS NOT NULL)::integer+(media_asset_id IS NOT NULL)::integer=1);
CREATE FUNCTION pawpal_private.guard_service_media_reference() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.media_asset; s public.media_upload_session;
BEGIN
 IF NEW.media_asset_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO a FROM public.media_asset WHERE id=NEW.media_asset_id;
 SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;
 SELECT * INTO a FROM public.media_asset WHERE id=NEW.media_asset_id FOR UPDATE;
 IF a.id IS NULL OR s.purpose<>'service_image' OR coalesce(s.service_id,s.draft_id) IS DISTINCT FROM NEW.service_id
 OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached')
 OR NOT pawpal_private.media_manage(auth.uid(),s.purpose,null,null)
 OR (a.status='verified' AND s.created_by IS DISTINCT FROM auth.uid()) THEN RAISE EXCEPTION 'media_service_forbidden' USING ERRCODE='42501'; END IF;
 IF s.service_id IS NULL THEN UPDATE public.media_upload_session SET service_id=NEW.service_id WHERE id=s.id; END IF;
 UPDATE public.media_asset SET status='attached' WHERE id=a.id;
 UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_service_media_reference() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER media_service_reference_guard BEFORE INSERT OR UPDATE OF media_asset_id,service_id ON public.service_image FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_service_media_reference();
CREATE TRIGGER media_service_reference_release AFTER DELETE OR UPDATE OF media_asset_id ON public.service_image FOR EACH ROW EXECUTE FUNCTION pawpal_private.release_media_reference();
CREATE OR REPLACE FUNCTION public.prepare_service_media_upload(p_request uuid, p_service uuid, p_draft uuid, p_size bigint, p_mime text, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE p_purpose constant text:='service_image'; p_product uuid:=null; p_appointment uuid:=null; s public.media_upload_session; budget bigint; used bigint;
BEGIN
 IF NOT pawpal_private.media_manage(auth.uid(),p_purpose,p_product,p_appointment) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR (p_service IS NULL)=(p_draft IS NULL) OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 3145728
 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp') OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200
 OR (p_service IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service WHERE id=p_service))
 OR (p_draft IS NOT NULL AND EXISTS(SELECT 1 FROM public.service WHERE id=p_draft))
 THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pawpal-media-quota',188));
 SELECT * INTO s FROM public.media_upload_session WHERE created_by=auth.uid() AND request_id=p_request FOR UPDATE;
 IF FOUND THEN
  IF s.service_id IS DISTINCT FROM p_service OR s.purpose IS DISTINCT FROM p_purpose OR s.product_id IS DISTINCT FROM p_product OR s.appointment_id IS DISTINCT FROM p_appointment OR s.draft_id IS DISTINCT FROM p_draft
  OR s.declared_size<>p_size OR s.mime_type<>p_mime OR s.original_name<>p_name THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409'; END IF;
  IF s.state NOT IN ('pending','verified','attached') OR s.expires_at<=now() AND s.state='pending' THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
  RETURN jsonb_build_object('session_id',s.id,'state',s.state,'asset_id',(SELECT id FROM public.media_asset WHERE session_id=s.id));
 END IF;
 SELECT max_storage_bytes INTO budget FROM pawpal_private.media_settings WHERE singleton AND enabled;
 IF budget IS NULL OR budget=0 THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 SELECT coalesce(sum(declared_size),0) INTO used FROM public.media_upload_session WHERE state<>'deleted';
 IF used+p_size>budget THEN RAISE EXCEPTION 'media_quota_exceeded' USING ERRCODE='54000'; END IF;
 IF (SELECT count(*) FROM public.media_upload_session WHERE created_by=auth.uid() AND state IN ('pending','uploading','verified'))>=10 THEN RAISE EXCEPTION 'media_too_many_pending' USING ERRCODE='54000'; END IF;
 INSERT INTO public.media_upload_session(created_by,request_id,purpose,product_id,appointment_id,draft_id,service_id,declared_size,mime_type,original_name)
 VALUES(auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,p_service,p_size,p_mime,p_name) RETURNING * INTO s;
 RETURN jsonb_build_object('session_id',s.id,'state',s.state);
END $function$
;
CREATE OR REPLACE FUNCTION pawpal_private.sync_service_media(p_service uuid, p_sources jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE source jsonb; asset uuid; link text; source_key text; seen text[]:='{}'; position integer:=0; previous uuid;
BEGIN
 IF NOT pawpal_private.media_manage(auth.uid(),'service_image',null,null)
 OR NOT EXISTS(SELECT 1 FROM public.service WHERE id=p_service) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_sources) IS DISTINCT FROM 'array' OR jsonb_array_length(p_sources)>10 THEN RAISE EXCEPTION 'invalid_service_media' USING ERRCODE='22023'; END IF;
 FOR source IN SELECT value FROM jsonb_array_elements(p_sources) LOOP
  IF jsonb_typeof(source) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(source))<>1 OR NOT(source ? 'url' OR source ? 'asset_id') THEN RAISE EXCEPTION 'invalid_service_media' USING ERRCODE='22023'; END IF;
  IF source ? 'asset_id' THEN
   asset:=(source->>'asset_id')::uuid;
   IF asset IS NULL OR NOT EXISTS(SELECT 1 FROM public.media_asset a JOIN public.media_upload_session s ON s.id=a.session_id
    WHERE a.id=asset AND s.purpose='service_image' AND coalesce(s.service_id,s.draft_id)=p_service
    AND a.status IN ('verified','attached') AND s.state IN ('verified','attached') AND (a.status='attached' OR s.created_by=auth.uid())) THEN RAISE EXCEPTION 'media_service_forbidden' USING ERRCODE='42501'; END IF;
   source_key:='asset:'||asset;
  ELSE
   link:=source->>'url';
   IF link IS NULL OR link !~ '^(https?://|/?assets/)' OR length(link)>2000 OR link ~ '[<>"'']' OR link ~ '[[:space:]]' THEN RAISE EXCEPTION 'invalid_sales_image_url' USING ERRCODE='22023'; END IF;
   source_key:='url:'||link;
  END IF;
  IF source_key=ANY(seen) THEN RAISE EXCEPTION 'duplicate_service_media' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,source_key);
 END LOOP;
 DELETE FROM public.service_image m WHERE m.service_id=p_service AND NOT EXISTS(
  SELECT 1 FROM jsonb_array_elements(p_sources) x WHERE (x ? 'asset_id' AND m.media_asset_id=(x->>'asset_id')::uuid) OR (x ? 'url' AND m.image_url=x->>'url'));
 UPDATE public.service_image SET is_thumbnail=false WHERE service_id=p_service AND is_thumbnail;
 FOR source IN SELECT value FROM jsonb_array_elements(p_sources) LOOP
  asset:=CASE WHEN source ? 'asset_id' THEN (source->>'asset_id')::uuid END; link:=source->>'url';
  SELECT id INTO previous FROM public.service_image WHERE service_id=p_service AND ((asset IS NOT NULL AND media_asset_id=asset) OR (link IS NOT NULL AND image_url=link)) ORDER BY id LIMIT 1;
  IF FOUND THEN UPDATE public.service_image SET display_order=position,is_thumbnail=(position=0) WHERE id=previous;
  ELSE INSERT INTO public.service_image(service_id,image_url,media_asset_id,display_order,is_thumbnail) VALUES(p_service,link,asset,position,position=0); END IF;
  position:=position+1;
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
 AND NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=OLD.media_asset_id) THEN
  UPDATE public.media_asset SET status='pending_delete',retention_until=now()+interval '7 days' WHERE id=OLD.media_asset_id;
  UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '7 days' WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.media_asset_id);
 END IF;
 RETURN NULL;
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
  IF a.id IS NOT NULL AND (a.legal_hold OR a.retention_until>now() OR EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=a.id)) THEN CONTINUE; END IF;
  token:=gen_random_uuid();
  UPDATE public.media_upload_session SET state='cleaning',lease=token,lease_until=now()+interval '15 minutes' WHERE id=s.id;
  UPDATE public.media_asset SET status='cleaning' WHERE session_id=s.id;
  RETURN NEXT jsonb_build_object('session_id',s.id,'mongo_file_id',s.mongo_file_id,'lease',token);
 END LOOP;
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
  allowed:=pawpal_private.media_manage(auth.uid(),s.purpose,s.product_id,s.appointment_id) AND (a.status='attached' OR s.created_by=auth.uid());
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
CREATE OR REPLACE FUNCTION public.save_admin_service_catalog(p_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb, p_prices jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE old public.service; actor uuid; category_key uuid; level_key uuid:=nullif(p_details->>'staff_level_id','')::uuid;
 duration_value integer:=(p_details->>'duration_minutes')::integer; commission_value numeric:=nullif(p_details->>'commission_rate','')::numeric;
 code_value text:=btrim(p_details->>'service_code'); name_value text:=btrim(p_details->>'service_name');
 species jsonb; step jsonb; action_key uuid; sequence integer:=0; price jsonb; price_count integer; previous_to numeric:=0;
 now_at timestamptz:=clock_timestamp();
BEGIN
 IF NOT pawpal_private.has_permission('service.write') OR NOT pawpal_private.has_permission('service_supported_species.write') OR NOT pawpal_private.has_permission('service_care_action.write') OR NOT pawpal_private.has_permission('care_action.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'service_catalog_forbidden' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR p_details IS NULL OR coalesce(length(code_value),0) NOT BETWEEN 1 AND 80 OR coalesce(length(name_value),0) NOT BETWEEN 1 AND 200 OR duration_value IS NULL OR duration_value NOT BETWEEN 1 AND 10080
 OR coalesce(p_details->>'status','') NOT IN ('active','inactive') OR (commission_value IS NOT NULL AND (commission_value::text IN ('NaN','Infinity','-Infinity') OR commission_value<0 OR commission_value>100))
 OR jsonb_typeof(p_details->'species_ids') IS DISTINCT FROM 'array' OR jsonb_array_length(p_details->'species_ids')=0
 OR jsonb_typeof(p_details->'steps') IS DISTINCT FROM 'array' OR jsonb_array_length(p_details->'steps')>100
 OR length(p_details->>'description')>8000 THEN RAISE EXCEPTION 'invalid_service_catalog' USING ERRCODE='22023'; END IF;
 SELECT id INTO category_key FROM public.service_category WHERE category_code=p_details->>'category_code';
 IF category_key IS NULL OR (level_key IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff_level WHERE id=level_key AND is_active)) THEN RAISE EXCEPTION 'invalid_service_catalog_reference' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,21));
 SELECT * INTO old FROM public.service WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF p_expected_updated_at IS NULL OR old.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'service_catalog_changed' USING ERRCODE='PT409'; END IF;
 ELSIF p_expected_updated_at IS NOT NULL THEN RAISE EXCEPTION 'service_not_found' USING ERRCODE='P0002'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF old.id IS NULL THEN
  INSERT INTO public.service(id,service_code,service_name,description,estimated_duration,status,commission_rate,category_id,staff_level_required_id)
  VALUES(p_id,code_value,name_value,nullif(btrim(p_details->>'description'),''),duration_value,p_details->>'status',commission_value,category_key,level_key);
 ELSE
  UPDATE public.service SET service_code=code_value,service_name=name_value,description=nullif(btrim(p_details->>'description'),''),estimated_duration=duration_value,status=p_details->>'status',commission_rate=commission_value,category_id=category_key,staff_level_required_id=level_key WHERE id=p_id;
 END IF;
 DELETE FROM public.service_supported_species WHERE service_id=p_id;
 FOR species IN SELECT DISTINCT value FROM jsonb_array_elements(p_details->'species_ids') LOOP
  IF NOT EXISTS(SELECT 1 FROM public.pet_species WHERE id=(species#>>'{}')::uuid AND is_active) THEN RAISE EXCEPTION 'invalid_service_species' USING ERRCODE='22023'; END IF;
  INSERT INTO public.service_supported_species(service_id,species_id) VALUES(p_id,(species#>>'{}')::uuid);
 END LOOP;
 DELETE FROM public.service_care_action WHERE service_id=p_id;
 FOR step IN SELECT value FROM jsonb_array_elements(p_details->'steps') LOOP
  IF coalesce(length(btrim(step#>>'{}')),0) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'invalid_service_step' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(lower(btrim(step#>>'{}')),22));
  SELECT id INTO action_key FROM public.care_action WHERE lower(btrim(action_name))=lower(btrim(step#>>'{}')) AND is_active ORDER BY id LIMIT 1;
  IF action_key IS NULL THEN INSERT INTO public.care_action(action_name,is_active) VALUES(btrim(step#>>'{}'),true) RETURNING id INTO action_key; END IF;
  INSERT INTO public.service_care_action(service_id,care_action_id,display_order,estimated_duration) VALUES(p_id,action_key,sequence,0);
  sequence:=sequence+1;
 END LOOP;
 IF p_prices IS NOT NULL THEN
  IF NOT pawpal_private.has_permission('service_price_matrix.write') THEN RAISE EXCEPTION 'service_price_forbidden' USING ERRCODE='42501'; END IF;
  IF p_details->>'category_code'<>'grooming_spa' OR jsonb_typeof(p_prices)<>'array' OR jsonb_array_length(p_prices) NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'invalid_service_prices' USING ERRCODE='22023'; END IF;
  price_count:=jsonb_array_length(p_prices);sequence:=0;
  FOR price IN SELECT value FROM jsonb_array_elements(p_prices) LOOP
   sequence:=sequence+1;
   IF ((price->>'weight_from')::numeric < previous_to OR (price->>'weight_from')::numeric < 0) OR (price->>'unit_price') IS NULL OR (price->>'unit_price')::numeric::text IN ('NaN','Infinity','-Infinity') OR (price->>'unit_price')::numeric<0
    OR (sequence<price_count AND ((price->>'weight_to') IS NULL OR (price->>'weight_to')::numeric::text IN ('NaN','Infinity','-Infinity') OR (price->>'weight_to')::numeric<=previous_to))
    OR ((price->>'weight_to')::numeric <= (price->>'weight_from')::numeric) THEN RAISE EXCEPTION 'invalid_service_price_ranges' USING ERRCODE='22023'; END IF;
   previous_to:=coalesce((price->>'weight_to')::numeric,1e100);
  END LOOP;
  IF EXISTS(SELECT 1 FROM public.service_price_matrix WHERE service_id=p_id AND status='active' AND effective_from>=now_at) THEN RAISE EXCEPTION 'scheduled_service_price_requires_review' USING ERRCODE='PT409'; END IF;
  UPDATE public.service_price_matrix SET effective_to=now_at WHERE service_id=p_id AND status='active' AND effective_from<now_at AND (effective_to IS NULL OR effective_to>now_at);
  FOR price IN SELECT value FROM jsonb_array_elements(p_prices) LOOP
   INSERT INTO public.service_price_matrix(service_id,weight_from,weight_to,unit_price,effective_from,status,duration_minutes)
   VALUES(p_id,(price->>'weight_from')::numeric,(price->>'weight_to')::numeric,(price->>'unit_price')::numeric,now_at,'active',coalesce((SELECT duration_minutes FROM public.service_price_matrix WHERE service_id=p_id AND weight_from=(price->>'weight_from')::numeric ORDER BY effective_from DESC LIMIT 1),duration_value));
  END LOOP;
 END IF;
 UPDATE public.service SET benefits=coalesce(p_details->>'benefits',benefits),amenities=coalesce(p_details->>'amenities',amenities),package_name=coalesce(p_details->>'package_name',package_name) WHERE id=p_id;
 IF p_details ? 'variant_updates' THEN PERFORM pawpal_private.save_catalog_variant_values(p_id,p_details->'variant_updates'); END IF;
 IF p_details ? 'media_sources' THEN PERFORM pawpal_private.sync_service_media(p_id,p_details->'media_sources'); END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SAVE_SERVICE_CATALOG','service',p_id,'Lưu danh mục, loài hỗ trợ, quy trình và bảng giá trong cùng giao dịch.');
 RETURN p_id;
END $function$
;
REVOKE ALL ON FUNCTION public.prepare_service_media_upload(uuid,uuid,uuid,bigint,text,text),pawpal_private.sync_service_media(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_service_media_upload(uuid,uuid,uuid,bigint,text,text),pawpal_private.sync_service_media(uuid,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.public_service_directory()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.service_code),'[]'::jsonb) FROM (
 SELECT s.id,s.service_code,s.service_name,s.description,s.estimated_duration,s.duration_label,s.package_name,s.trip_type,
 s.benefits,s.amenities,c.category_code,l.level_name AS groomer_level,
 coalesce((SELECT jsonb_agg(COALESCE(i.image_url, '/api/media?action=read&id='::text || i.media_asset_id::text) ORDER BY i.is_thumbnail DESC,i.display_order,i.id) FROM public.service_image i WHERE i.service_id=s.id),'[]'::jsonb) images,
 coalesce((SELECT jsonb_agg(a.action_name ORDER BY sc.display_order,a.id) FROM public.service_care_action sc JOIN public.care_action a ON a.id=sc.care_action_id WHERE sc.service_id=s.id AND a.is_active),'[]'::jsonb) care_actions,
 coalesce((SELECT jsonb_agg(sp.species_name ORDER BY sp.species_name) FROM public.service_supported_species ss JOIN public.pet_species sp ON sp.id=ss.species_id WHERE ss.service_id=s.id AND sp.is_active),'[]'::jsonb) species,
 coalesce((SELECT jsonb_agg(p.data ORDER BY p.sort_weight,p.sort_distance) FROM (
  SELECT jsonb_build_object('variant_code',m.variant_code,'condition',m.variant_condition,'weight_from',m.weight_from,'weight_to',m.weight_to,'weight_to_inclusive',m.weight_to_inclusive,'unit_price',m.unit_price,'duration_minutes',m.duration_minutes,'billing_unit','lượt') data,m.weight_from sort_weight,0::numeric sort_distance
  FROM public.service_price_matrix m WHERE m.service_id=s.id AND m.status='active' AND m.effective_from<=now() AND (m.effective_to IS NULL OR m.effective_to>now()) AND c.category_code='grooming_spa'
  UNION ALL
  SELECT jsonb_build_object('variant_code',h.variant_code,'condition',h.variant_condition,'weight_from',h.weight_from,'weight_to',h.weight_to,'weight_to_inclusive',h.weight_to_inclusive,'unit_price',h.daily_price,'room_type',h.room_type,'capacity',h.capacity,'billing_unit',CASE WHEN h.billing_minutes=60 THEN 'giờ' ELSE 'ngày' END),h.weight_from,0
  FROM public.hotel_room_type h WHERE h.service_id=s.id AND h.status='active' AND h.effective_from<=now() AND (h.effective_to IS NULL OR h.effective_to>now()) AND c.category_code='pet_hotel'
  UNION ALL
  SELECT jsonb_build_object('variant_code',t.variant_code,'condition',t.variant_condition,'weight_from',t.weight_from,'weight_to',t.weight_to,'weight_to_inclusive',t.weight_to_inclusive,'distance_from',t.distance_from,'distance_to',t.distance_to,'distance_to_inclusive',t.distance_to_inclusive,'unit_price',t.base_price+t.surcharge,'billing_unit',CASE WHEN s.trip_type='round_trip' THEN 'chuyến khứ hồi' ELSE 'chuyến một chiều' END),t.weight_from,t.distance_from
  FROM public.taxi_price_rule t WHERE t.service_id=s.id AND t.status='active' AND t.effective_from<=now() AND (t.effective_to IS NULL OR t.effective_to>now()) AND c.category_code='pet_taxi'
 ) p),'[]'::jsonb) prices,
 (SELECT coalesce(avg(r.rating),0) FROM public.review r JOIN public.appointment_item i ON i.id=r.appointment_item_id WHERE i.service_id=s.id AND r.review_status IN ('published','approved','da_duyet')) rating,
 (SELECT count(*) FROM public.review r JOIN public.appointment_item i ON i.id=r.appointment_item_id WHERE i.service_id=s.id AND r.review_status IN ('published','approved','da_duyet')) review_count
 FROM public.service s JOIN public.service_category c ON c.id=s.category_id LEFT JOIN public.staff_level l ON l.id=s.staff_level_required_id WHERE s.status='active'
 ) x
$function$
;
COMMIT;
