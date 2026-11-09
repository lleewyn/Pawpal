'use strict';
const fs=require('node:fs');
const backup=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-variant/before.private.json'));
const get=name=>{const rows=backup.defs.filter(row=>row.proname===name);if(rows.length!==1)throw Error('FUNCTION_SCOPE');return rows[0].definition;};
function once(source,needle,replacement){if(source.split(needle).length!==2)throw Error('SOURCE_DRIFT');return source.replace(needle,replacement);}
let prepare=get('prepare_media_upload');
prepare=once(prepare,'public.prepare_media_upload(p_request uuid, p_purpose text, p_product uuid, p_appointment uuid, p_draft uuid, p_size bigint, p_mime text, p_name text)', 'public.prepare_variant_media_upload(p_request uuid, p_product uuid, p_draft uuid, p_variant uuid, p_size bigint, p_mime text, p_name text)');
prepare=once(prepare,'DECLARE s public.media_upload_session;',"DECLARE p_purpose constant text:='product_variant_image'; p_appointment uuid:=null; s public.media_upload_session;");
const begin=prepare.indexOf(' IF p_request IS NULL'),end=prepare.indexOf(' PERFORM pg_advisory_xact_lock',begin);
if(begin<0||end<begin)throw Error('PREPARE_DRIFT');
prepare=prepare.slice(0,begin)+` IF p_request IS NULL OR p_variant IS NULL OR (p_product IS NULL AND p_draft IS NULL) OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 3145728
 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp') OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200
 OR EXISTS(SELECT 1 FROM public.product_variant WHERE id=p_variant AND product_id IS DISTINCT FROM coalesce(p_product,p_draft))
 THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
`+prepare.slice(end);
prepare=once(prepare,'IF s.purpose IS DISTINCT FROM p_purpose','IF s.variant_id IS DISTINCT FROM p_variant OR s.purpose IS DISTINCT FROM p_purpose');
prepare=once(prepare,'created_by,request_id,purpose,product_id,appointment_id,draft_id,declared_size','created_by,request_id,purpose,product_id,appointment_id,draft_id,variant_id,declared_size');
prepare=once(prepare,'auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,p_size','auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,p_variant,p_size');
let release=get('release_media_reference');
release=once(release,"AND NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=OLD.media_asset_id) THEN","AND NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=OLD.media_asset_id) THEN");
let cleanup=get('claim_media_cleanup');
cleanup=once(cleanup,"OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id))","OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id))");
let resolve=get('resolve_media_asset');
resolve=once(resolve,' allowed:=public_read;',` public_read:=public_read OR (a.status='attached' AND s.purpose='product_variant_image' AND EXISTS(
 SELECT 1 FROM public.product_variant_media m JOIN public.product_variant v ON v.id=m.product_variant_id JOIN public.product p ON p.id=v.product_id
 WHERE m.media_asset_id=a.id AND v.id=s.variant_id AND p.status='active' AND v.status='active' AND NOT v.catalog_retired));
 allowed:=public_read;`);
let save=get('save_admin_sales_product');
const first=save.indexOf("  IF item ? 'images' THEN"),last=save.indexOf('\n END LOOP;',first);
if(first<0||last<first)throw Error('VARIANT_SAVE_DRIFT');
save=save.slice(0,first)+`  IF item ? 'media_sources' OR item ? 'images' THEN
   PERFORM pawpal_private.sync_variant_media(p_product_id,vid,CASE WHEN item ? 'media_sources' THEN item->'media_sources'
    ELSE (SELECT coalesce(jsonb_agg(jsonb_build_object('url',value)),'[]') FROM jsonb_array_elements_text(item->'images')) END);
  END IF;`+save.slice(last);
const catalog=once(get('customer_shop_catalog'),'jsonb_agg(image_url ORDER BY is_thumbnail DESC,display_order,id)',"jsonb_agg(coalesce(image_url,'/api/media?action=read&id='||media_asset_id::text) ORDER BY is_thumbnail DESC,display_order,id)");
const foundation=`
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
`;
fs.writeFileSync('scripts/database/v1/191_variant_media.sql','BEGIN;\nSET LOCAL lock_timeout=\'3s\';\n'+foundation+'\n'+[prepare,release,cleanup,resolve,save,catalog].map(value=>value+';').join('\n')+`\nREVOKE ALL ON FUNCTION public.prepare_variant_media_upload(uuid,uuid,uuid,uuid,bigint,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_variant_media_upload(uuid,uuid,uuid,uuid,bigint,text,text) TO authenticated;
COMMIT;\n`);
console.log('VARIANT_MEDIA_MIGRATION_GENERATED');
const oldShape=backup.constraints.filter(c=>['media_upload_session_purpose_check','media_upload_session_check'].includes(c.conname));
fs.writeFileSync('scripts/database/v1/191_variant_media.rollback.sql',`BEGIN;
SET LOCAL lock_timeout='3s';
LOCK TABLE public.media_upload_session,public.product_variant_media IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.media_upload_session WHERE variant_id IS NOT NULL) OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id IS NOT NULL) THEN RAISE EXCEPTION 'variant_media_rollback_requires_empty_foundation'; END IF; END $$;
DROP TRIGGER media_variant_reference_guard ON public.product_variant_media;
DROP TRIGGER media_variant_reference_release ON public.product_variant_media;
DROP FUNCTION pawpal_private.guard_variant_media_reference();
`+['save_admin_sales_product','customer_shop_catalog','resolve_media_asset','release_media_reference','claim_media_cleanup'].map(name=>get(name)+';').join('\n')+`
DROP FUNCTION pawpal_private.sync_variant_media(uuid,uuid,jsonb),public.prepare_variant_media_upload(uuid,uuid,uuid,uuid,bigint,text,text);
ALTER TABLE public.product_variant_media DROP CONSTRAINT variant_media_one_source, DROP COLUMN media_asset_id, ALTER COLUMN image_url SET NOT NULL;
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_purpose_check, DROP CONSTRAINT media_upload_session_check, DROP COLUMN variant_id;
`+oldShape.map(c=>'ALTER TABLE public.media_upload_session ADD CONSTRAINT '+c.conname+' '+c.definition+';').join('\n')+'\nCOMMIT;\n');
