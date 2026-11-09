'use strict';
const fs=require('node:fs'),backup=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-pet/before.private.json'));
const get=name=>{const rows=backup.defs.filter(x=>x.proname===name);if(rows.length!==1)throw Error('FUNCTION_SCOPE');return rows[0].definition;};
const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('SOURCE_DRIFT '+a);return s.replace(a,b);};
let prepare=get('prepare_intake_media_upload');
prepare=once(prepare,'public.prepare_intake_media_upload(p_request uuid, p_appointment uuid, p_record uuid, p_size bigint, p_mime text, p_name text)','public.prepare_pet_media_upload(p_request uuid, p_pet uuid, p_size bigint, p_mime text, p_name text)');
prepare=once(prepare,"p_purpose constant text:='intake_image';","p_purpose constant text:='pet_avatar'; p_appointment uuid:=null;");
const start=prepare.indexOf(' IF p_request IS NULL'),end=prepare.indexOf(' PERFORM pg_advisory_xact_lock',start);
prepare=prepare.slice(0,start)+` IF p_request IS NULL OR p_pet IS NULL OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 3145728
 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp') OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200
 OR NOT EXISTS(SELECT 1 FROM public.pet_profile WHERE id=p_pet) THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
`+prepare.slice(end);
prepare=prepare.replaceAll('record_id','pet_id').replaceAll('p_record','p_pet');
let resolve=once(get('resolve_media_asset'),"  IF NOT allowed AND a.status='attached' AND s.purpose='care_log_image'",`  IF NOT allowed AND a.status='attached' AND s.purpose='pet_avatar' THEN
   allowed:=EXISTS(SELECT 1 FROM public.pet_profile p WHERE p.avatar_media_asset_id=a.id AND p.id=s.pet_id AND (
    (NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) AND pawpal_private.owns_customer(p.customer_id))
    OR EXISTS(SELECT 1 FROM public.appointment ap WHERE ap.pet_id=p.id AND pawpal_private.media_manage(auth.uid(),'care_log_image',null,ap.id))));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='care_log_image'`);
const cleanup=once(get('claim_media_cleanup'),'OR EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=a.id))','OR EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id=a.id))');
const shape=backup.constraints.find(c=>c.conname==='media_upload_session_check').definition;
fs.writeFileSync('scripts/database/v1/196_pet_avatar_media.sql',`BEGIN;
SET LOCAL lock_timeout='3s';
ALTER TABLE public.media_upload_session ADD COLUMN pet_id uuid REFERENCES public.pet_profile(id);
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK(purpose IN ('product_image','care_log_image','product_variant_image','service_image','intake_image','handover_image','adjustment_image','pet_avatar'));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK((pet_id IS NULL AND (${shape.slice(7,-1)})) OR (purpose='pet_avatar' AND pet_id IS NOT NULL AND appointment_id IS NULL AND adjustment_id IS NULL AND record_id IS NULL AND product_id IS NULL AND draft_id IS NULL AND variant_id IS NULL AND service_id IS NULL));
ALTER TABLE public.pet_profile ADD COLUMN avatar_media_asset_id uuid UNIQUE REFERENCES public.media_asset(id);
ALTER TABLE public.pet_profile ADD CONSTRAINT pet_avatar_one_source CHECK(avatar_url IS NULL OR avatar_media_asset_id IS NULL);
CREATE FUNCTION pawpal_private.guard_pet_avatar_media() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.media_asset;s public.media_upload_session;
BEGIN
 IF NEW.avatar_media_asset_id IS NOT NULL AND NEW.avatar_media_asset_id IS DISTINCT FROM OLD.avatar_media_asset_id THEN
  SELECT * INTO a FROM public.media_asset WHERE id=NEW.avatar_media_asset_id;
  SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;
  SELECT * INTO a FROM public.media_asset WHERE id=NEW.avatar_media_asset_id FOR UPDATE;
  IF a.id IS NULL OR s.purpose<>'pet_avatar' OR s.pet_id IS DISTINCT FROM NEW.id OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached')
   OR NOT pawpal_private.media_manage(auth.uid(),s.purpose,null,null) OR (a.status='verified' AND s.created_by IS DISTINCT FROM auth.uid()) THEN RAISE EXCEPTION 'pet_avatar_forbidden' USING ERRCODE='42501'; END IF;
  UPDATE public.media_asset SET status='attached' WHERE id=a.id;UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
 END IF;
 RETURN NEW;
END $$;
CREATE FUNCTION pawpal_private.release_pet_avatar_media() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.avatar_media_asset_id IS NULL OR (TG_OP='UPDATE' AND NEW.avatar_media_asset_id IS NOT DISTINCT FROM OLD.avatar_media_asset_id) THEN RETURN NULL; END IF;
 PERFORM 1 FROM public.media_upload_session WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.avatar_media_asset_id) FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id=OLD.avatar_media_asset_id) THEN
 UPDATE public.media_asset SET status='pending_delete',retention_until=now()+interval '7 days' WHERE id=OLD.avatar_media_asset_id;
 UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '7 days' WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.avatar_media_asset_id);END IF;
 RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_pet_avatar_media(),pawpal_private.release_pet_avatar_media() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER pet_avatar_guard BEFORE INSERT OR UPDATE OF avatar_media_asset_id ON public.pet_profile FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_pet_avatar_media();
CREATE TRIGGER pet_avatar_release AFTER DELETE OR UPDATE OF avatar_media_asset_id ON public.pet_profile FOR EACH ROW EXECUTE FUNCTION pawpal_private.release_pet_avatar_media();
CREATE FUNCTION public.save_admin_pet_avatar(p_pet uuid,p_expected timestamptz,p_asset uuid) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p public.pet_profile;
BEGIN
 IF NOT pawpal_private.media_manage(auth.uid(),'pet_avatar',null,null) OR NOT pawpal_private.has_permission('pet_profile.write') THEN RAISE EXCEPTION 'pet_avatar_forbidden' USING ERRCODE='42501'; END IF;
 SELECT * INTO p FROM public.pet_profile WHERE id=p_pet FOR UPDATE;
 IF NOT FOUND OR p_expected IS NULL OR p.updated_at<>p_expected THEN RAISE EXCEPTION 'pet_avatar_changed' USING ERRCODE='PT409'; END IF;
 UPDATE public.pet_profile SET avatar_url=null,avatar_media_asset_id=p_asset WHERE id=p_pet;
 RETURN p_pet;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_pet_avatar(uuid,timestamptz,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_admin_pet_avatar(uuid,timestamptz,uuid) TO authenticated;
`+[prepare,resolve,cleanup].map(x=>x+';').join('\n')+`
REVOKE ALL ON FUNCTION public.prepare_pet_media_upload(uuid,uuid,bigint,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_pet_media_upload(uuid,uuid,bigint,text,text) TO authenticated;
COMMIT;\n`);
console.log('PET_AVATAR_MIGRATION_GENERATED');
fs.writeFileSync('scripts/database/v1/196_pet_avatar_media.rollback.sql',`BEGIN;
LOCK TABLE public.media_upload_session,public.pet_profile IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.media_upload_session WHERE purpose='pet_avatar') OR EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id IS NOT NULL) THEN RAISE EXCEPTION 'pet_avatar_rollback_requires_no_sessions'; END IF; END $$;
`+['resolve_media_asset','claim_media_cleanup'].map(n=>get(n)+';').join('\n')+`
DROP TRIGGER pet_avatar_guard ON public.pet_profile;
DROP TRIGGER pet_avatar_release ON public.pet_profile;
DROP FUNCTION public.save_admin_pet_avatar(uuid,timestamptz,uuid),public.prepare_pet_media_upload(uuid,uuid,bigint,text,text),pawpal_private.guard_pet_avatar_media(),pawpal_private.release_pet_avatar_media();
ALTER TABLE public.pet_profile DROP CONSTRAINT pet_avatar_one_source,DROP COLUMN avatar_media_asset_id;
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check,DROP COLUMN pet_id;
`+backup.constraints.map(c=>`ALTER TABLE public.media_upload_session ADD CONSTRAINT ${c.conname} ${c.definition};`).join('\n')+'\nCOMMIT;\n');
