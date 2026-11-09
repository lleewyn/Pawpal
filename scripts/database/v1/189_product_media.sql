-- Product editor media sources; exact existing business functions retained outside the image reconciliation block.
BEGIN;
SET LOCAL lock_timeout='3s';
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
  IF item ? 'images' THEN
   DELETE FROM public.product_variant_media WHERE product_variant_id=vid;
   FOR image_value IN SELECT jsonb_array_elements_text(item->'images') LOOP
    IF image_value !~ '^(https?://|/?assets/)' OR length(image_value)>2000 OR image_value ~ '[<>"'']' THEN RAISE EXCEPTION 'invalid_sales_image_url' USING ERRCODE='22023'; END IF;
    INSERT INTO public.product_variant_media(product_variant_id,image_url,display_order,is_thumbnail) VALUES(vid,image_value,(SELECT count(*) FROM public.product_variant_media WHERE product_variant_id=vid),(SELECT count(*)=0 FROM public.product_variant_media WHERE product_variant_id=vid));
   END LOOP;
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
 'image_urls',(SELECT coalesce(jsonb_agg(image_url ORDER BY is_thumbnail DESC,display_order,id),'[]'::jsonb) FROM public.product_variant_media WHERE product_variant_id=v.id),
 'available_quantity',greatest(0,coalesce((SELECT sum(quantity) FROM public.inventory_transaction WHERE product_variant_id=v.id),0)-coalesce((SELECT sum(quantity) FROM public.stock_reservation WHERE product_variant_id=v.id AND status='active' AND expires_at>now()),0))) ORDER BY v.sku_variant),'[]'::jsonb)
 FROM public.product_variant v LEFT JOIN public.variant_size s ON s.id=v.size_id LEFT JOIN public.variant_color co ON co.id=v.color_id LEFT JOIN public.variant_flavor f ON f.id=v.flavor_id
 WHERE v.product_id=p.id AND v.status='active' AND NOT v.catalog_retired) product_variant
 FROM public.product p JOIN public.product_category c ON c.id=p.category_id WHERE p.status='active'
 ) p
$function$
;
COMMIT;
