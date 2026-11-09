'use strict';
const fs=require('node:fs');
const original=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase4-care/functions.private.json'));
if(original.length!==1||original[0].nspname!=='public')throw Error('CARE_FUNCTION_SCOPE');
let definition=original[0].definition;
const needle=' END IF;\n UPDATE public.appointment SET updated_at=clock_timestamp() WHERE id=a.id;';
if(definition.split(needle).length!==2)throw Error('CARE_FUNCTION_DRIFT');
const block=` END IF;
 -- Existing evidence is immutable here. Only append verified files in the same log-save transaction.
 IF p_action='save' AND p_details ? 'media_asset_ids' THEN
  DECLARE ids jsonb:=p_details->'media_asset_ids'; item jsonb; asset public.media_asset; session public.media_upload_session; selected uuid; seen uuid[]:='{}';
  BEGIN
   IF jsonb_typeof(ids) IS DISTINCT FROM 'array' OR jsonb_array_length(ids)>10 THEN RAISE EXCEPTION 'invalid_care_media' USING ERRCODE='22023'; END IF;
   FOR item IN SELECT value FROM jsonb_array_elements(ids) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_care_media' USING ERRCODE='22023'; END IF;
    selected:=(item#>>'{}')::uuid;
    IF selected IS NULL OR selected=ANY(seen) THEN RAISE EXCEPTION 'invalid_care_media' USING ERRCODE='22023'; END IF;
    seen:=array_append(seen,selected);
    SELECT * INTO asset FROM public.media_asset WHERE id=selected;
    SELECT * INTO session FROM public.media_upload_session WHERE id=asset.session_id FOR UPDATE;
    SELECT * INTO asset FROM public.media_asset WHERE id=selected FOR UPDATE;
    IF asset.id IS NULL OR session.purpose<>'care_log_image' OR session.appointment_id IS DISTINCT FROM a.id
     OR asset.status NOT IN ('verified','attached') OR session.state NOT IN ('verified','attached')
     OR NOT pawpal_private.media_manage(auth.uid(),session.purpose,session.product_id,session.appointment_id)
     OR (asset.status='verified' AND session.created_by IS DISTINCT FROM auth.uid())
     OR EXISTS(SELECT 1 FROM public.care_log_media m WHERE m.media_asset_id=asset.id AND m.care_log_id<>p_id)
     THEN RAISE EXCEPTION 'care_media_forbidden' USING ERRCODE='42501'; END IF;
    IF NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=asset.id AND care_log_id=p_id) THEN
     IF (SELECT count(*) FROM public.care_log_media WHERE care_log_id=p_id)>=10 THEN RAISE EXCEPTION 'care_media_limit' USING ERRCODE='22023'; END IF;
     INSERT INTO public.care_log_media(care_log_id,media_type,media_asset_id,file_name,file_size,staff_id)
      VALUES(p_id,'image',asset.id,session.original_name,asset.size_bytes,actor);
    END IF;
   END LOOP;
  END;
 END IF;
 UPDATE public.appointment SET updated_at=clock_timestamp() WHERE id=a.id;`;
definition=definition.replace(needle,block);
const reader=`
CREATE OR REPLACE FUNCTION public.list_care_log_media(p_log uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE appointment public.appointment;
BEGIN
 SELECT a.* INTO appointment FROM public.appointment a JOIN public.care_log l ON l.appointment_id=a.id WHERE l.id=p_log;
 IF NOT FOUND OR auth.uid() IS NULL OR NOT (
  pawpal_private.media_manage(auth.uid(),'care_log_image',null,appointment.id)
  OR (NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) AND pawpal_private.owns_customer(appointment.customer_id)))
 THEN RAISE EXCEPTION 'care_media_forbidden' USING ERRCODE='42501'; END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.id,'media_asset_id',m.media_asset_id,'media_url',m.media_url,'file_name',m.file_name,'file_size',m.file_size) ORDER BY m.created_at,m.id),'[]')
  FROM public.care_log_media m LEFT JOIN public.media_asset a ON a.id=m.media_asset_id WHERE m.care_log_id=p_log AND (m.media_asset_id IS NULL OR a.status='attached'));
END $$;
REVOKE ALL ON FUNCTION public.list_care_log_media(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.list_care_log_media(uuid) TO authenticated;
`;
fs.writeFileSync('scripts/database/v1/190_care_log_media.sql','BEGIN;\nSET LOCAL lock_timeout=\'3s\';\n'+definition+';\n'+reader+'\nCOMMIT;\n');
console.log('CARE_MEDIA_MIGRATION_GENERATED');
