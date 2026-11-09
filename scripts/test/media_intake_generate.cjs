'use strict';
const fs=require('node:fs');
const backup=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-intake/before.private.json'));
const get=name=>{const rows=backup.defs.filter(x=>x.proname===name);if(rows.length!==1)throw Error('FUNCTION_SCOPE');return rows[0].definition;};
const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('SOURCE_DRIFT '+a);return s.replace(a,b);};
const manage=once(get('media_manage'),"p_purpose='care_log_image'","p_purpose IN ('care_log_image','intake_image')");
let prepare=get('prepare_media_upload');
prepare=once(prepare,'public.prepare_media_upload(p_request uuid, p_purpose text, p_product uuid, p_appointment uuid, p_draft uuid, p_size bigint, p_mime text, p_name text)','public.prepare_intake_media_upload(p_request uuid, p_appointment uuid, p_record uuid, p_size bigint, p_mime text, p_name text)');
prepare=once(prepare,'DECLARE s public.media_upload_session;',"DECLARE p_purpose constant text:='intake_image'; p_product uuid:=null; p_draft uuid:=null; s public.media_upload_session;");
const start=prepare.indexOf(' IF p_request IS NULL'),end=prepare.indexOf(' PERFORM pg_advisory_xact_lock',start);
if(start<0||end<start)throw Error('PREPARE_DRIFT');
prepare=prepare.slice(0,start)+` IF p_request IS NULL OR p_appointment IS NULL OR p_record IS NULL OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 3145728
 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp') OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200
 OR NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=p_appointment AND appointment_status IN ('confirmed','checked_in','in_progress'))
 OR EXISTS(SELECT 1 FROM public.appointment_record WHERE id=p_record AND (appointment_id<>p_appointment OR record_type<>'intake'))
 THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
`+prepare.slice(end);
prepare=once(prepare,'IF s.purpose IS DISTINCT FROM p_purpose','IF s.record_id IS DISTINCT FROM p_record OR s.purpose IS DISTINCT FROM p_purpose');
prepare=once(prepare,'created_by,request_id,purpose,product_id,appointment_id,draft_id,declared_size','created_by,request_id,purpose,product_id,appointment_id,draft_id,record_id,declared_size');
prepare=once(prepare,'auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,p_size','auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,p_record,p_size');
let resolve=once(get('resolve_media_asset'),'  IF NOT allowed AND a.status=\'attached\' AND s.purpose=\'care_log_image\'',`  IF NOT allowed AND a.status='attached' AND s.purpose='intake_image' AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.appointment_record_media m JOIN public.appointment_record r ON r.id=m.record_id JOIN public.appointment ap ON ap.id=r.appointment_id WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='care_log_image'`);
let cleanup=once(get('claim_media_cleanup'),'OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=a.id))','OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id))');
let release=once(get('release_media_reference'),' THEN\n  UPDATE public.media_asset',' AND NOT EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=OLD.media_asset_id) THEN\n  UPDATE public.media_asset');
let save=once(get('save_admin_service_record')," INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)",` IF p_details ? 'media_asset_ids' THEN
  IF p_type<>'intake' THEN RAISE EXCEPTION 'intake_media_wrong_record_type' USING ERRCODE='22023'; END IF;
  PERFORM pawpal_private.attach_intake_media(p_id,p_details->'media_asset_ids');
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)`);
const shape=backup.constraints.find(x=>x.conname==='media_upload_session_check').definition;
const ddl=`ALTER TABLE public.media_upload_session ADD COLUMN record_id uuid;
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK(purpose IN ('product_image','care_log_image','product_variant_image','service_image','intake_image'));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK((record_id IS NULL AND (${shape.slice(7,-1)})) OR (purpose='intake_image' AND appointment_id IS NOT NULL AND record_id IS NOT NULL AND product_id IS NULL AND draft_id IS NULL AND variant_id IS NULL AND service_id IS NULL));
CREATE TABLE public.appointment_record_media(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),record_id uuid NOT NULL REFERENCES public.appointment_record(id),
 media_asset_id uuid NOT NULL UNIQUE REFERENCES public.media_asset(id),created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX appointment_record_media_parent ON public.appointment_record_media(record_id);
ALTER TABLE public.appointment_record_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointment_record_media FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION pawpal_private.attach_intake_media(p_record uuid,p_ids jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE r public.appointment_record; item jsonb; selected uuid; seen uuid[]:='{}'; a public.media_asset; s public.media_upload_session;
BEGIN
 SELECT * INTO r FROM public.appointment_record WHERE id=p_record AND record_type='intake';
 IF NOT FOUND OR NOT pawpal_private.media_manage(auth.uid(),'intake_image',null,r.appointment_id) THEN RAISE EXCEPTION 'intake_media_forbidden' USING ERRCODE='42501'; END IF;
 IF jsonb_typeof(p_ids) IS DISTINCT FROM 'array' OR jsonb_array_length(p_ids)>10 THEN RAISE EXCEPTION 'invalid_intake_media' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_ids) LOOP
  IF jsonb_typeof(item) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_intake_media' USING ERRCODE='22023'; END IF;
  selected:=(item#>>'{}')::uuid;
  IF selected IS NULL OR selected=ANY(seen) THEN RAISE EXCEPTION 'invalid_intake_media' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,selected);
  SELECT * INTO a FROM public.media_asset WHERE id=selected;
  SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;
  SELECT * INTO a FROM public.media_asset WHERE id=selected FOR UPDATE;
  IF a.id IS NULL OR s.purpose<>'intake_image' OR s.appointment_id IS DISTINCT FROM r.appointment_id OR s.record_id IS DISTINCT FROM p_record
   OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached') OR (a.status='verified' AND s.created_by IS DISTINCT FROM auth.uid())
   OR EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id AND record_id<>p_record) THEN RAISE EXCEPTION 'intake_media_forbidden' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id AND record_id=p_record) THEN
   IF (SELECT count(*) FROM public.appointment_record_media WHERE record_id=p_record)>=10 THEN RAISE EXCEPTION 'intake_media_limit' USING ERRCODE='22023'; END IF;
   INSERT INTO public.appointment_record_media(record_id,media_asset_id) VALUES(p_record,a.id);
   UPDATE public.media_asset SET status='attached',legal_hold=true WHERE id=a.id;
   UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.attach_intake_media(uuid,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.list_intake_media(p_appointment uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE ap public.appointment;
BEGIN
 SELECT * INTO ap FROM public.appointment WHERE id=p_appointment;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT (pawpal_private.media_manage(auth.uid(),'intake_image',null,ap.id)
  OR (NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) AND pawpal_private.owns_customer(ap.customer_id))) THEN RAISE EXCEPTION 'intake_media_forbidden' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'record_id',r.id,'media_asset_id',a.id,'file_name',s.original_name,'file_size',a.size_bytes) ORDER BY r.revision_no,m.created_at,m.id),'[]')
 FROM public.appointment_record_media m JOIN public.appointment_record r ON r.id=m.record_id JOIN public.media_asset a ON a.id=m.media_asset_id JOIN public.media_upload_session s ON s.id=a.session_id WHERE r.appointment_id=ap.id AND r.record_type='intake' AND a.status='attached');
END $$;
REVOKE ALL ON FUNCTION public.list_intake_media(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.list_intake_media(uuid) TO authenticated;
`;
fs.writeFileSync('scripts/database/v1/193_intake_media.sql',"BEGIN;\nSET LOCAL lock_timeout='3s';\n"+ddl+[manage,prepare,resolve,cleanup,release,save].map(x=>x+';').join('\n')+`
REVOKE ALL ON FUNCTION public.prepare_intake_media_upload(uuid,uuid,uuid,bigint,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_intake_media_upload(uuid,uuid,uuid,bigint,text,text) TO authenticated;
COMMIT;\n`);
fs.writeFileSync('scripts/database/v1/193_intake_media.rollback.sql',`BEGIN;
SET LOCAL lock_timeout='3s';
LOCK TABLE public.media_upload_session,public.appointment_record_media IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.media_upload_session WHERE purpose='intake_image') OR EXISTS(SELECT 1 FROM public.appointment_record_media) THEN RAISE EXCEPTION 'intake_media_rollback_requires_empty_foundation'; END IF; END $$;
`+['media_manage','resolve_media_asset','claim_media_cleanup','release_media_reference','save_admin_service_record'].map(n=>get(n)+';').join('\n')+`
DROP FUNCTION public.list_intake_media(uuid),public.prepare_intake_media_upload(uuid,uuid,uuid,bigint,text,text),pawpal_private.attach_intake_media(uuid,jsonb);
DROP TABLE public.appointment_record_media;
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check,DROP COLUMN record_id;
`+backup.constraints.map(c=>`ALTER TABLE public.media_upload_session ADD CONSTRAINT ${c.conname} ${c.definition};`).join('\n')+'\nCOMMIT;\n');
console.log('INTAKE_MIGRATION_GENERATED');
