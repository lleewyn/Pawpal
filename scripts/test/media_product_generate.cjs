'use strict';
// Generate a reviewable migration from the exact Cloud function backup, with bounded replacements.
const fs = require('node:fs');
const original = JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase4/functions.private.json'));
let save = original.save_admin_sales_product;
const start = save.indexOf(' DELETE FROM public.product_media WHERE product_id=p_product_id;');
const end = save.indexOf(' INSERT INTO public.audit_log', start);
if (start < 0 || end < start || save.slice(start, end).split('DELETE FROM public.product_media').length !== 2) throw Error('MEDIA_FUNCTION_DRIFT');
const block = ` -- Preserve retained references: deleting/reinserting an attached asset would queue it for deletion.
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
`;
save = save.slice(0, start) + block + save.slice(end);
let catalog = original.customer_shop_catalog;
const from = 'jsonb_agg(image_url ORDER BY is_thumbnail DESC,display_order,id)';
if (catalog.split(from).length !== 3) throw Error('MEDIA_CATALOG_DRIFT');
catalog = catalog.replace(from, "jsonb_agg(coalesce(image_url,'/api/media?action=read&id='||media_asset_id::text) ORDER BY is_thumbnail DESC,display_order,id)");
fs.writeFileSync('scripts/database/v1/189_product_media.sql', "-- Product editor media sources; exact existing business functions retained outside the image reconciliation block.\nBEGIN;\nSET LOCAL lock_timeout='3s';\n" + save + ';\n' + catalog + ';\nCOMMIT;\n');
fs.writeFileSync('D:/Aboutme/Pawpal-infra/media/phase4/rollback.private.sql', 'BEGIN;\n' + original.save_admin_sales_product + ';\n' + original.customer_shop_catalog + ';\nCOMMIT;\n');
console.log('PRODUCT_MEDIA_MIGRATION_GENERATED');
