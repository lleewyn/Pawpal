BEGIN;
SET LOCAL lock_timeout='3s';

ALTER TABLE public.media_upload_session ADD COLUMN variant_id uuid;
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_purpose_check, DROP CONSTRAINT media_upload_session_check;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK(purpose IN ('product_image','care_log_image','product_variant_image'));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK(
 (purpose='product_image' AND variant_id IS NULL AND appointment_id IS NULL AND (product_id IS NOT NULL OR draft_id IS NOT NULL))
 OR (purpose='care_log_image' AND variant_id IS NULL AND product_id IS NULL AND draft_id IS NULL AND appointment_id IS NOT NULL)
 OR (purpose='product_variant_image' AND variant_id IS NOT NULL AND appointment_id IS NULL AND (product_id IS NOT NULL OR draft_id IS NOT NULL)));
ALTER TABLE public.product_variant_media ADD COLUMN media_asset_id uuid UNIQUE REFERENCES public.media_asset(id);
ALTER TABLE public.product_variant_media ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.product_variant_media ADD CONSTRAINT variant_media_one_source CHECK((image_url IS NOT NULL)::integer+(media_asset_id IS NOT NULL)::integer=1);

CREATE FUNCTION pawpal_private.guard_variant_media_reference() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.media_asset; s public.media_upload_session; parent uuid;
BEGIN
 IF NEW.media_asset_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO a FROM public.media_asset WHERE id=NEW.media_asset_id;
 SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;
 SELECT * INTO a FROM public.media_asset WHERE id=NEW.media_asset_id FOR UPDATE;
 SELECT product_id INTO parent FROM public.product_variant WHERE id=NEW.product_variant_id;
 IF a.id IS NULL OR s.purpose<>'product_variant_image' OR s.variant_id IS DISTINCT FROM NEW.product_variant_id
 OR coalesce(s.product_id,s.draft_id) IS DISTINCT FROM parent OR parent IS NULL
 OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached')
 OR NOT pawpal_private.media_manage(auth.uid(),s.purpose,s.product_id,null)
 OR (a.status='verified' AND s.created_by IS DISTINCT FROM auth.uid()) THEN RAISE EXCEPTION 'media_variant_forbidden' USING ERRCODE='42501'; END IF;
 IF s.product_id IS NULL THEN UPDATE public.media_upload_session SET product_id=parent WHERE id=s.id; END IF;
 UPDATE public.media_asset SET status='attached' WHERE id=a.id;
 UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_variant_media_reference() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER media_variant_reference_guard BEFORE INSERT OR UPDATE OF media_asset_id,product_variant_id ON public.product_variant_media FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_variant_media_reference();
CREATE TRIGGER media_variant_reference_release AFTER DELETE OR UPDATE OF media_asset_id ON public.product_variant_media FOR EACH ROW EXECUTE FUNCTION pawpal_private.release_media_reference();

CREATE FUNCTION pawpal_private.sync_variant_media(p_product uuid,p_variant uuid,p_sources jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE source jsonb; asset uuid; link text; source_key text; seen text[]:='{}'; position integer:=0; previous uuid;
BEGIN
 IF NOT pawpal_private.media_manage(auth.uid(),'product_variant_image',p_product,null)
 OR NOT EXISTS(SELECT 1 FROM public.product_variant WHERE id=p_variant AND product_id=p_product) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_sources) IS DISTINCT FROM 'array' OR jsonb_array_length(p_sources)>10 THEN RAISE EXCEPTION 'invalid_variant_media' USING ERRCODE='22023'; END IF;
 FOR source IN SELECT value FROM jsonb_array_elements(p_sources) LOOP
  IF jsonb_typeof(source) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(source))<>1 OR NOT(source ? 'url' OR source ? 'asset_id') THEN RAISE EXCEPTION 'invalid_variant_media' USING ERRCODE='22023'; END IF;
  IF source ? 'asset_id' THEN
   asset:=(source->>'asset_id')::uuid;
   IF asset IS NULL OR NOT EXISTS(SELECT 1 FROM public.media_asset a JOIN public.media_upload_session s ON s.id=a.session_id
    WHERE a.id=asset AND s.purpose='product_variant_image' AND s.variant_id=p_variant AND coalesce(s.product_id,s.draft_id)=p_product
    AND a.status IN ('verified','attached') AND s.state IN ('verified','attached') AND (a.status='attached' OR s.created_by=auth.uid())) THEN RAISE EXCEPTION 'media_variant_forbidden' USING ERRCODE='42501'; END IF;
   source_key:='asset:'||asset;
  ELSE
   link:=source->>'url';
   IF link IS NULL OR link !~ '^(https?://|/?assets/)' OR length(link)>2000 OR link ~ '[<>"'']' OR link ~ '[[:space:]]' THEN RAISE EXCEPTION 'invalid_sales_image_url' USING ERRCODE='22023'; END IF;
   source_key:='url:'||link;
  END IF;
  IF source_key=ANY(seen) THEN RAISE EXCEPTION 'duplicate_variant_media' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,source_key);
 END LOOP;
 DELETE FROM public.product_variant_media m WHERE m.product_variant_id=p_variant AND NOT EXISTS(
  SELECT 1 FROM jsonb_array_elements(p_sources) x WHERE (x ? 'asset_id' AND m.media_asset_id=(x->>'asset_id')::uuid) OR (x ? 'url' AND m.image_url=x->>'url'));
 FOR source IN SELECT value FROM jsonb_array_elements(p_sources) LOOP
  asset:=CASE WHEN source ? 'asset_id' THEN (source->>'asset_id')::uuid END; link:=source->>'url';
  SELECT id INTO previous FROM public.product_variant_media WHERE product_variant_id=p_variant AND ((asset IS NOT NULL AND media_asset_id=asset) OR (link IS NOT NULL AND image_url=link)) ORDER BY id LIMIT 1;
  IF FOUND THEN UPDATE public.product_variant_media SET display_order=position,is_thumbnail=(position=0) WHERE id=previous;
  ELSE INSERT INTO public.product_variant_media(product_variant_id,image_url,media_asset_id,display_order,is_thumbnail) VALUES(p_variant,link,asset,position,position=0); END IF;
  position:=position+1;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.sync_variant_media(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.prepare_variant_media_upload(p_request uuid, p_product uuid, p_draft uuid, p_variant uuid, p_size bigint, p_mime text, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE p_purpose constant text:='product_variant_image'; p_appointment uuid:=null; s public.media_upload_session; budget bigint; used bigint;
BEGIN
 IF NOT pawpal_private.media_manage(auth.uid(),p_purpose,p_product,p_appointment) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_variant IS NULL OR (p_product IS NULL AND p_draft IS NULL) OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 3145728
 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp') OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200
 OR EXISTS(SELECT 1 FROM public.product_variant WHERE id=p_variant AND product_id IS DISTINCT FROM coalesce(p_product,p_draft))
 THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pawpal-media-quota',188));
 SELECT * INTO s FROM public.media_upload_session WHERE created_by=auth.uid() AND request_id=p_request FOR UPDATE;
 IF FOUND THEN
  IF s.variant_id IS DISTINCT FROM p_variant OR s.purpose IS DISTINCT FROM p_purpose OR s.product_id IS DISTINCT FROM p_product OR s.appointment_id IS DISTINCT FROM p_appointment OR s.draft_id IS DISTINCT FROM p_draft
  OR s.declared_size<>p_size OR s.mime_type<>p_mime OR s.original_name<>p_name THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409'; END IF;
  IF s.state NOT IN ('pending','verified','attached') OR s.expires_at<=now() AND s.state='pending' THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
  RETURN jsonb_build_object('session_id',s.id,'state',s.state,'asset_id',(SELECT id FROM public.media_asset WHERE session_id=s.id));
 END IF;
 SELECT max_storage_bytes INTO budget FROM pawpal_private.media_settings WHERE singleton AND enabled;
 IF budget IS NULL OR budget=0 THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 SELECT coalesce(sum(declared_size),0) INTO used FROM public.media_upload_session WHERE state<>'deleted';
 IF used+p_size>budget THEN RAISE EXCEPTION 'media_quota_exceeded' USING ERRCODE='54000'; END IF;
 IF (SELECT count(*) FROM public.media_upload_session WHERE created_by=auth.uid() AND state IN ('pending','uploading','verified'))>=10 THEN RAISE EXCEPTION 'media_too_many_pending' USING ERRCODE='54000'; END IF;
 INSERT INTO public.media_upload_session(created_by,request_id,purpose,product_id,appointment_id,draft_id,variant_id,declared_size,mime_type,original_name)
 VALUES(auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,p_variant,p_size,p_mime,p_name) RETURNING * INTO s;
 RETURN jsonb_build_object('session_id',s.id,'state',s.state);
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
 AND NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=OLD.media_asset_id) THEN
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
  IF a.id IS NOT NULL AND (a.legal_hold OR a.retention_until>now() OR EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id)) THEN CONTINUE; END IF;
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
CREATE OR REPLACE FUNCTION public.save_admin_sales_product(p_request_id uuid, p_product_id uuid, p_expected_updated_at timestamp with time zone, p_details jsonb, p_variants jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE actor uuid; old public.product; prior public.audit_log; item jsonb; v public.product_variant; vid uuid; seen uuid[]:='{}';
 cost_value numeric; price_value numeric; compare_value numeric; initial_value numeric; minimum_value numeric; image_value text; payload text;
 attr text; label_value text; attr_id uuid;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('product.write') OR NOT pawpal_private.has_permission('product_variant.write')
 OR NOT pawpal_private.has_permission('product_media.write') OR NOT pawpal_private.has_permission('product_variant_media.write') OR NOT pawpal_private.has_permission('inventory_transaction.write')
 OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'sales_catalog_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_product_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR jsonb_typeof(p_variants) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_variants) NOT BETWEEN 1 AND 100 OR length(p_details::text)>100000 OR length(p_variants::text)>200000
 OR coalesce(length(btrim(p_details->>'product_name')),0) NOT BETWEEN 1 AND 300
 OR coalesce(length(btrim(p_details->>'unit')),0) NOT BETWEEN 1 AND 100
 OR coalesce(length(btrim(p_details->>'slug')),0) NOT BETWEEN 1 AND 300
 OR coalesce(p_details->>'status','') NOT IN ('active','inactive')
 OR NOT EXISTS(SELECT 1 FROM public.product_category WHERE id=(p_details->>'category_id')::uuid)
 THEN RAISE EXCEPTION 'invalid_sales_product' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('product_id',p_product_id,'details',p_details,'variants',p_variants)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,21));
 SELECT * INTO prior FROM public.audit_log WHERE entity_id=p_request_id AND action='SALES_PRODUCT_SAVE';
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'sales_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_product_id;
 END IF;
 -- Attribute names may be shared across products. Serialize catalogue saves
 -- before product locks so opposite attribute orders cannot deadlock.
 PERFORM pg_advisory_xact_lock(hashtextextended('sales-catalog-attributes',21));
 SELECT * INTO old FROM public.product WHERE id=p_product_id FOR UPDATE;
 IF FOUND THEN
  IF p_expected_updated_at IS NULL OR old.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'sales_product_changed' USING ERRCODE='PT409'; END IF;
 ELSE
  IF p_expected_updated_at IS NOT NULL THEN RAISE EXCEPTION 'sales_product_not_found' USING ERRCODE='P0002'; END IF;
  INSERT INTO public.product(id,category_id,product_name,slug,unit) VALUES(p_product_id,(p_details->>'category_id')::uuid,btrim(p_details->>'product_name'),btrim(p_details->>'slug'),btrim(p_details->>'unit'));
 END IF;
 PERFORM 1 FROM public.product_variant WHERE product_id=p_product_id ORDER BY id FOR UPDATE;
 UPDATE public.product SET category_id=(p_details->>'category_id')::uuid,product_name=btrim(p_details->>'product_name'),slug=btrim(p_details->>'slug'),unit=btrim(p_details->>'unit'),
 status=p_details->>'status',brand_name=nullif(btrim(p_details->>'brand_name'),''),origin=nullif(btrim(p_details->>'origin'),''),target_pet=nullif(btrim(p_details->>'target_pet'),''),
 description=p_details->>'description',ingredients=p_details->>'ingredients',benefits=p_details->>'benefits',usage_instructions=p_details->>'usage_instructions',badge=nullif(p_details->>'badge',''),
 specs=p_details->'specs',updated_at=clock_timestamp() WHERE id=p_product_id;
 FOR item IN SELECT value FROM jsonb_array_elements(p_variants) LOOP
  vid:=(item->>'id')::uuid;
  FOREACH attr IN ARRAY ARRAY['color','size','flavor'] LOOP
   IF item ? (attr||'_name') THEN
    IF NOT pawpal_private.has_permission('variant_'||attr||'.write') THEN RAISE EXCEPTION 'sales_attribute_forbidden' USING ERRCODE='42501'; END IF;
    label_value:=nullif(btrim(item->>(attr||'_name')),'');
    attr_id:=NULL;
    IF label_value IS NOT NULL THEN
     IF length(label_value)>100 OR label_value ~ '^[0-9]+$' OR lower(label_value) IN ('unknown','null','undefined') THEN RAISE EXCEPTION 'invalid_sales_attribute' USING ERRCODE='22023'; END IF;
     PERFORM pg_advisory_xact_lock(hashtextextended('sales-attribute:'||attr||':'||lower(label_value),21));
     EXECUTE format('SELECT id FROM public.%I WHERE lower(%I)=lower($1) AND is_active ORDER BY id LIMIT 1','variant_'||attr,attr||'_name') INTO attr_id USING label_value;
     IF attr_id IS NULL THEN
      IF attr='color' THEN
       IF coalesce(item->>'color_hex','') !~ '^#[0-9A-Fa-f]{6}$' THEN RAISE EXCEPTION 'sales_new_color_requires_hex' USING ERRCODE='22023'; END IF;
       INSERT INTO public.variant_color(color_name,hex_code) VALUES(label_value,item->>'color_hex') RETURNING id INTO attr_id;
      ELSE
       EXECUTE format('INSERT INTO public.%I(%I) VALUES($1) RETURNING id','variant_'||attr,attr||'_name') INTO attr_id USING label_value;
      END IF;
     END IF;
    END IF;
    item:=item||jsonb_build_object(attr||'_id',attr_id);
   END IF;
  END LOOP;
  cost_value:=(item->>'cost_price')::numeric; price_value:=(item->>'sale_price')::numeric; compare_value:=nullif(item->>'compare_at_price','')::numeric;
  initial_value:=(item->>'stock')::numeric;minimum_value:=(item->>'minimum_stock')::numeric;
  IF vid IS NULL OR vid=ANY(seen) OR coalesce(length(btrim(item->>'sku')),0) NOT BETWEEN 1 AND 100
  OR cost_value IS NULL OR price_value IS NULL OR initial_value IS NULL OR minimum_value IS NULL
  OR cost_value::text IN ('NaN','Infinity','-Infinity') OR price_value::text IN ('NaN','Infinity','-Infinity')
  OR cost_value NOT BETWEEN 0 AND 100000000000 OR price_value NOT BETWEEN 0 AND 100000000000
  OR (compare_value IS NOT NULL AND (compare_value::text IN ('NaN','Infinity','-Infinity') OR compare_value NOT BETWEEN 0 AND 100000000000))
  OR initial_value::text IN ('NaN','Infinity','-Infinity') OR initial_value NOT BETWEEN 0 AND 100000000 OR round(initial_value)<>initial_value
  OR minimum_value::text IN ('NaN','Infinity','-Infinity') OR minimum_value NOT BETWEEN 0 AND 100000000 OR round(minimum_value)<>minimum_value
  THEN RAISE EXCEPTION 'invalid_sales_variant' USING ERRCODE='22023'; END IF;
  SELECT * INTO v FROM public.product_variant WHERE id=vid;
  IF FOUND THEN
   IF v.product_id<>p_product_id THEN RAISE EXCEPTION 'sales_variant_wrong_product' USING ERRCODE='22023'; END IF;
   IF initial_value<>coalesce((SELECT sum(quantity) FROM public.inventory_transaction WHERE product_variant_id=vid),0) THEN RAISE EXCEPTION 'sales_use_stock_adjustment' USING ERRCODE='PT409'; END IF;
   UPDATE public.product_variant SET sku_variant=btrim(item->>'sku'),cost_price=cost_value,sale_price=price_value,compare_at_price=compare_value,
    color_id=nullif(item->>'color_id','')::uuid,size_id=nullif(item->>'size_id','')::uuid,flavor_id=nullif(item->>'flavor_id','')::uuid,
    status=coalesce(item->>'status','active'),updated_at=clock_timestamp() WHERE id=vid;
  ELSE
   INSERT INTO public.product_variant(id,product_id,sku_variant,cost_price,sale_price,compare_at_price,color_id,size_id,flavor_id,variant_name)
   VALUES(vid,p_product_id,btrim(item->>'sku'),cost_value,price_value,compare_value,nullif(item->>'color_id','')::uuid,nullif(item->>'size_id','')::uuid,nullif(item->>'flavor_id','')::uuid,nullif(btrim(item->>'variant_name'),''));
   IF initial_value>0 THEN
    INSERT INTO public.inventory_transaction(product_variant_id,transaction_type,quantity,note,staff_id,idempotency_key)
    VALUES(vid,'opening',initial_value,'Tồn đầu khi tạo sản phẩm',actor,'sales-product-opening:'||vid);
   END IF;
  END IF;
  INSERT INTO public.inventory(product_variant_id,quantity_in_stock,minimum_stock) VALUES(vid,initial_value,minimum_value)
  ON CONFLICT(product_variant_id) DO UPDATE SET minimum_stock=excluded.minimum_stock;
  IF item ? 'variant_name' AND coalesce(length(btrim(item->>'variant_name')),0) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'invalid_variant_name' USING ERRCODE='22023';END IF;
  UPDATE public.product_variant SET variant_name=coalesce(nullif(btrim(item->>'variant_name'),''),variant_name),packaging=coalesce(item->>'packaging',packaging),features=coalesce(item->>'features',features),gross_weight_text=coalesce(item->>'gross_weight_text',gross_weight_text),description=coalesce(item->>'description',description),ingredients=coalesce(item->>'ingredients',ingredients) WHERE id=vid;
  seen:=array_append(seen,vid);
  IF item ? 'media_sources' OR item ? 'images' THEN
   PERFORM pawpal_private.sync_variant_media(p_product_id,vid,CASE WHEN item ? 'media_sources' THEN item->'media_sources'
    ELSE (SELECT coalesce(jsonb_agg(jsonb_build_object('url',value)),'[]') FROM jsonb_array_elements_text(item->'images')) END);
  END IF;
 END LOOP;
 -- Removed SKUs stay addressable by posted order lines and stock history.
 UPDATE public.product_variant SET status='inactive' WHERE product_id=p_product_id AND NOT(id=ANY(seen));
 -- Preserve retained references: deleting/reinserting an attached asset would queue it for deletion.
 DECLARE sources jsonb; source jsonb; asset uuid; link text; position integer:=0; prior_media uuid; seen_sources text[]:='{}'; source_key text;
 BEGIN
  sources:=CASE WHEN p_details ? 'media_sources' THEN p_details->'media_sources'
   ELSE (SELECT coalesce(jsonb_agg(jsonb_build_object('url',value)),'[]') FROM jsonb_array_elements_text(coalesce(p_details->'images','[]'))) END;
  IF jsonb_typeof(sources) IS DISTINCT FROM 'array' OR jsonb_array_length(sources)>10 THEN RAISE EXCEPTION 'invalid_product_media' USING ERRCODE='22023'; END IF;
  FOR source IN SELECT value FROM jsonb_array_elements(sources) LOOP
   IF jsonb_typeof(source) IS DISTINCT FROM 'object' OR (SELECT count(*) FROM jsonb_object_keys(source))<>1
   OR NOT(source ? 'url' OR source ? 'asset_id') THEN RAISE EXCEPTION 'invalid_product_media' USING ERRCODE='22023'; END IF;
   IF source ? 'asset_id' THEN
    asset:=(source->>'asset_id')::uuid;
    IF asset IS NULL OR NOT EXISTS(SELECT 1 FROM public.media_asset a JOIN public.media_upload_session s ON s.id=a.session_id
     WHERE a.id=asset AND a.status IN ('verified','attached') AND s.state IN ('verified','attached') AND s.purpose='product_image'
     AND coalesce(s.product_id,s.draft_id)=p_product_id AND pawpal_private.media_manage(auth.uid(),s.purpose,s.product_id,s.appointment_id)
     AND (a.status='attached' OR s.created_by=auth.uid())) THEN RAISE EXCEPTION 'media_reference_forbidden' USING ERRCODE='42501'; END IF;
    source_key:='asset:'||asset;
   ELSE
    link:=source->>'url';
    IF link IS NULL OR link !~ '^(https?://|/?assets/)' OR length(link)>2000 OR link ~ '[<>"'']' OR link ~ '[[:space:]]'
     THEN RAISE EXCEPTION 'invalid_sales_image_url' USING ERRCODE='22023'; END IF;
    source_key:='url:'||link;
   END IF;
   IF source_key=ANY(seen_sources) THEN RAISE EXCEPTION 'duplicate_product_media' USING ERRCODE='22023'; END IF;
   seen_sources:=array_append(seen_sources,source_key);
  END LOOP;
  DELETE FROM public.product_media m WHERE m.product_id=p_product_id AND NOT EXISTS(
   SELECT 1 FROM jsonb_array_elements(sources) x WHERE (x ? 'asset_id' AND m.media_asset_id=(x->>'asset_id')::uuid) OR (x ? 'url' AND m.image_url=x->>'url'));
  FOR source IN SELECT value FROM jsonb_array_elements(sources) LOOP
   asset:=CASE WHEN source ? 'asset_id' THEN (source->>'asset_id')::uuid END;
   link:=source->>'url';
   SELECT id INTO prior_media FROM public.product_media WHERE product_id=p_product_id
    AND ((asset IS NOT NULL AND media_asset_id=asset) OR (link IS NOT NULL AND image_url=link)) ORDER BY id LIMIT 1;
   IF FOUND THEN UPDATE public.product_media SET display_order=position,is_thumbnail=(position=0) WHERE id=prior_media;
   ELSE INSERT INTO public.product_media(product_id,image_url,media_asset_id,display_order,is_thumbnail) VALUES(p_product_id,link,asset,position,position=0); END IF;
   position:=position+1;
  END LOOP;
 END;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SALES_PRODUCT_SAVE','product',p_request_id,payload);
 RETURN p_product_id;
END $function$
;
CREATE OR REPLACE FUNCTION public.customer_shop_catalog()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
 SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.product_name,p.id),'[]'::jsonb) FROM (
 SELECT p.id,p.product_code,p.product_name,p.brand_name,p.category_id,p.unit,p.target_pet,p.description,p.slug,p.status,p.origin,p.ingredients,p.benefits,p.usage_instructions,p.specs,p.badge,
 (SELECT coalesce(avg(r.rating),0) FROM public.review r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id JOIN public.product_variant v ON v.id=d.product_variant_id WHERE v.product_id=p.id AND r.review_status IN ('da_duyet','approved','published')) rating,
 (SELECT count(*) FROM public.review r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id JOIN public.product_variant v ON v.id=d.product_variant_id WHERE v.product_id=p.id AND r.review_status IN ('da_duyet','approved','published')) review_count,
 jsonb_build_object('category_name',c.category_name) product_category,
 (SELECT coalesce(jsonb_agg(coalesce(image_url,'/api/media?action=read&id='||media_asset_id::text) ORDER BY is_thumbnail DESC,display_order,id),'[]'::jsonb) FROM public.product_media WHERE product_id=p.id) image_urls,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('id',v.id,'sku_variant',v.sku_variant,'variant_name',v.variant_name,'sale_price',v.sale_price,'compare_at_price',v.compare_at_price,'status',v.status,
 'packaging',v.packaging,'features',v.features,'badge',v.badge,'gross_weight_text',v.gross_weight_text,'description',v.description,'ingredients',v.ingredients,
 'size_name',s.size_name,'flavor_name',f.flavor_name,'color_name',co.color_name,
 'image_urls',(SELECT coalesce(jsonb_agg(coalesce(image_url,'/api/media?action=read&id='||media_asset_id::text) ORDER BY is_thumbnail DESC,display_order,id),'[]'::jsonb) FROM public.product_variant_media WHERE product_variant_id=v.id),
 'available_quantity',greatest(0,coalesce((SELECT sum(quantity) FROM public.inventory_transaction WHERE product_variant_id=v.id),0)-coalesce((SELECT sum(quantity) FROM public.stock_reservation WHERE product_variant_id=v.id AND status='active' AND expires_at>now()),0))) ORDER BY v.sku_variant),'[]'::jsonb)
 FROM public.product_variant v LEFT JOIN public.variant_size s ON s.id=v.size_id LEFT JOIN public.variant_color co ON co.id=v.color_id LEFT JOIN public.variant_flavor f ON f.id=v.flavor_id
 WHERE v.product_id=p.id AND v.status='active' AND NOT v.catalog_retired) product_variant
 FROM public.product p JOIN public.product_category c ON c.id=p.category_id WHERE p.status='active'
 ) p
$function$
;
REVOKE ALL ON FUNCTION public.prepare_variant_media_upload(uuid,uuid,uuid,uuid,bigint,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_variant_media_upload(uuid,uuid,uuid,uuid,bigint,text,text) TO authenticated;
COMMIT;
