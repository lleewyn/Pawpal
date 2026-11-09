'use strict';
const fs=require('node:fs');
const backup=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-service/before.private.json'));
const get=name=>{const rows=backup.defs.filter(x=>x.proname===name);if(rows.length!==1)throw Error('FUNCTION_SCOPE');return rows[0].definition;};
const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('SOURCE_DRIFT '+a);return s.replace(a,b);};
let prepare=get('prepare_media_upload');
prepare=once(prepare,'public.prepare_media_upload(p_request uuid, p_purpose text, p_product uuid, p_appointment uuid, p_draft uuid, p_size bigint, p_mime text, p_name text)','public.prepare_service_media_upload(p_request uuid, p_service uuid, p_draft uuid, p_size bigint, p_mime text, p_name text)');
prepare=once(prepare,'DECLARE s public.media_upload_session;',"DECLARE p_purpose constant text:='service_image'; p_product uuid:=null; p_appointment uuid:=null; s public.media_upload_session;");
const start=prepare.indexOf(' IF p_request IS NULL'),end=prepare.indexOf(' PERFORM pg_advisory_xact_lock',start);
if(start<0||end<start)throw Error('PREPARE_DRIFT');
prepare=prepare.slice(0,start)+` IF p_request IS NULL OR (p_service IS NULL)=(p_draft IS NULL) OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 3145728
 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp') OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200
 OR (p_service IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.service WHERE id=p_service))
 OR (p_draft IS NOT NULL AND EXISTS(SELECT 1 FROM public.service WHERE id=p_draft))
 THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
`+prepare.slice(end);
prepare=once(prepare,'IF s.purpose IS DISTINCT FROM p_purpose','IF s.service_id IS DISTINCT FROM p_service OR s.purpose IS DISTINCT FROM p_purpose');
prepare=once(prepare,'created_by,request_id,purpose,product_id,appointment_id,draft_id,declared_size','created_by,request_id,purpose,product_id,appointment_id,draft_id,service_id,declared_size');
prepare=once(prepare,'auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,p_size','auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,p_service,p_size');
let sync=get('sync_variant_media').replaceAll('sync_variant_media','sync_service_media').replaceAll('p_product uuid, p_variant uuid','p_service uuid').replaceAll('product_variant_image','service_image').replaceAll('product_variant_media','service_image').replaceAll('m.product_variant_id=p_variant','m.service_id=p_service').replaceAll('product_variant_id=p_variant','service_id=p_service').replaceAll('product_variant_id,image_url','service_id,image_url').replaceAll('VALUES(p_variant,','VALUES(p_service,');
sync=once(sync,"p_product,null)\n OR NOT EXISTS(SELECT 1 FROM public.product_variant WHERE id=p_variant AND product_id=p_product)","null,null)\n OR NOT EXISTS(SELECT 1 FROM public.service WHERE id=p_service)");
sync=once(sync,'s.variant_id=p_variant AND coalesce(s.product_id,s.draft_id)=p_product','coalesce(s.service_id,s.draft_id)=p_service');
sync=sync.replaceAll('variant_media','service_media').replaceAll('media_variant_forbidden','media_service_forbidden');
sync=once(sync,' FOR source IN SELECT value FROM jsonb_array_elements(p_sources) LOOP\n  asset:=',' UPDATE public.service_image SET is_thumbnail=false WHERE service_id=p_service AND is_thumbnail;\n FOR source IN SELECT value FROM jsonb_array_elements(p_sources) LOOP\n  asset:=');
let release=once(get('release_media_reference'),' THEN\n  UPDATE public.media_asset', ' AND NOT EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=OLD.media_asset_id) THEN\n  UPDATE public.media_asset');
let cleanup=once(get('claim_media_cleanup'),'OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id))','OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=a.id))');
let resolve=once(get('resolve_media_asset'),' allowed:=public_read;',` public_read:=public_read OR (a.status='attached' AND s.purpose='service_image' AND EXISTS(SELECT 1 FROM public.service_image m JOIN public.service v ON v.id=m.service_id WHERE m.media_asset_id=a.id AND v.id=s.service_id AND v.status='active'));
 allowed:=public_read;`);
let save=once(get('save_admin_service_catalog')," INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)"," IF p_details ? 'media_sources' THEN PERFORM pawpal_private.sync_service_media(p_id,p_details->'media_sources'); END IF;\n INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)");
const check=backup.constraints.filter(c=>['media_upload_session_check','media_upload_session_purpose_check'].includes(c.conname));
if(check.length!==2)throw Error('CONSTRAINT_SCOPE');
const expanded=check.map(c=>`ALTER TABLE public.media_upload_session ADD CONSTRAINT ${c.conname} `+(c.conname.endsWith('purpose_check')?"CHECK(purpose IN ('product_image','care_log_image','product_variant_image','service_image'));":`CHECK ((service_id IS NULL AND ${c.definition.slice(7,-1)}) OR (purpose='service_image' AND product_id IS NULL AND appointment_id IS NULL AND variant_id IS NULL AND (service_id IS NOT NULL OR draft_id IS NOT NULL)));`)).join('\n');
const ddl=`ALTER TABLE public.media_upload_session ADD COLUMN service_id uuid REFERENCES public.service(id);
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check;
${expanded}
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
`;
const view=get('public_service_directory');
const catalog=once(view,'jsonb_agg(i.image_url ORDER BY',"jsonb_agg(COALESCE(i.image_url, '/api/media?action=read&id='::text || i.media_asset_id::text) ORDER BY");
fs.writeFileSync('scripts/database/v1/192_service_media.sql',"BEGIN;\nSET LOCAL lock_timeout='3s';\n"+ddl+[prepare,sync,release,cleanup,resolve,save].map(x=>x+';').join('\n')+`\nREVOKE ALL ON FUNCTION public.prepare_service_media_upload(uuid,uuid,uuid,bigint,text,text),pawpal_private.sync_service_media(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_service_media_upload(uuid,uuid,uuid,bigint,text,text),pawpal_private.sync_service_media(uuid,jsonb) TO authenticated;
${catalog};
COMMIT;\n`);
fs.writeFileSync('scripts/database/v1/192_service_media.rollback.sql',`BEGIN;
SET LOCAL lock_timeout='3s';
LOCK TABLE public.media_upload_session,public.service_image IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.media_upload_session WHERE purpose='service_image') OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id IS NOT NULL) THEN RAISE EXCEPTION 'service_media_rollback_requires_empty_foundation'; END IF; END $$;
DROP TRIGGER media_service_reference_guard ON public.service_image;
DROP TRIGGER media_service_reference_release ON public.service_image;
DROP FUNCTION pawpal_private.guard_service_media_reference();
`+['save_admin_service_catalog','resolve_media_asset','release_media_reference','claim_media_cleanup'].map(n=>get(n)+';').join('\n')+`
${view};
DROP FUNCTION pawpal_private.sync_service_media(uuid,jsonb),public.prepare_service_media_upload(uuid,uuid,uuid,bigint,text,text);
ALTER TABLE public.service_image DROP CONSTRAINT service_media_one_source,DROP COLUMN media_asset_id,ALTER COLUMN image_url SET NOT NULL;
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check,DROP COLUMN service_id;
`+check.map(c=>`ALTER TABLE public.media_upload_session ADD CONSTRAINT ${c.conname} ${c.definition};`).join('\n')+'\nCOMMIT;\n');
console.log('SERVICE_MEDIA_MIGRATION_GENERATED');
