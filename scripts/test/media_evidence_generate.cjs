'use strict';
const fs=require('node:fs');
const backup=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/domain-before.private.json'));
const get=name=>{const r=backup.defs.filter(x=>x.proname===name);if(r.length!==1)throw Error('FUNCTION_SCOPE '+name);return r[0].definition;};
const once=(s,a,b)=>{if(s.split(a).length!==2)throw Error('SOURCE_DRIFT '+a);return s.replace(a,b);};
let prepare=fs.readFileSync('scripts/database/v1/196_pet_avatar_media.sql','utf8').match(/CREATE OR REPLACE FUNCTION public.prepare_pet_media_upload[\s\S]*?END \$function\$/)[0];
prepare=once(prepare,'public.prepare_pet_media_upload(p_request uuid, p_pet uuid, p_size bigint, p_mime text, p_name text)','public.prepare_evidence_media_upload(p_request uuid, p_purpose text, p_target uuid, p_context uuid, p_size bigint, p_mime text, p_name text)');
prepare=once(prepare,"p_purpose constant text:='pet_avatar'; p_appointment uuid:=null;",'p_appointment uuid:=null;');
prepare=once(prepare,'pawpal_private.media_manage(auth.uid(),p_purpose,p_product,p_appointment)','coalesce(pawpal_private.evidence_access(auth.uid(),p_purpose,p_target,p_context,true),false)');
prepare=once(prepare,'p_pet IS NULL','p_target IS NULL OR p_context IS NULL OR p_purpose IS NULL OR p_purpose NOT IN (\'ticket_image\',\'return_image\')');
prepare=once(prepare,'OR NOT EXISTS(SELECT 1 FROM public.pet_profile WHERE id=p_pet)','');
prepare=once(prepare,'s.pet_id IS DISTINCT FROM p_pet','coalesce(s.support_message_id,s.return_id) IS DISTINCT FROM p_target OR coalesce(s.ticket_id,s.sales_order_id) IS DISTINCT FROM p_context');
prepare=once(prepare,'draft_id,pet_id,declared_size','draft_id,ticket_id,support_message_id,return_id,sales_order_id,declared_size');
prepare=once(prepare,'p_draft,p_pet,p_size',"p_draft,CASE WHEN p_purpose='ticket_image' THEN p_context END,CASE WHEN p_purpose='ticket_image' THEN p_target END,CASE WHEN p_purpose='return_image' THEN p_target END,CASE WHEN p_purpose='return_image' THEN p_context END,p_size");
const functions=['claim_media_upload','finish_media_upload','cancel_media_upload','resolve_media_asset'].map(n=>{
 const actor=n==='finish_media_upload'?'p_actor':'auth.uid()';
 return once(get(n),`pawpal_private.media_manage(${actor},s.purpose,s.product_id,s.appointment_id)`,`pawpal_private.media_session_manage(${actor},s.id,${!['cancel_media_upload','resolve_media_asset'].includes(n)})`);
});
functions.push(once(get('claim_media_cleanup'),'OR EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id=a.id))','OR EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=a.id))'));
functions.push(once(get('release_media_reference'),' THEN\n  UPDATE public.media_asset',' AND NOT EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=OLD.media_asset_id) THEN\n  UPDATE public.media_asset'));
functions.push(once(get('create_own_support_ticket'),'INSERT INTO public.support_ticket_message(ticket_id,','INSERT INTO public.support_ticket_message(id,ticket_id,').replace('VALUES(p_id,\'customer\'','VALUES(p_id,p_id,\'customer\''));
let act=once(get('act_admin_complaint'),"'return_request_id','source_kind'","'return_request_id','source_kind','media_asset_ids'");
act=once(act,' note_value:=btrim'," IF p_details ? 'media_asset_ids' AND p_action<>'message' THEN RAISE EXCEPTION 'invalid_evidence_action' USING ERRCODE='22023'; END IF;\n note_value:=btrim");
act=once(act,'INSERT INTO public.support_ticket_message(ticket_id,','INSERT INTO public.support_ticket_message(id,ticket_id,');
act=once(act,"VALUES(ticket.id,'staff'","VALUES(CASE WHEN p_action='message' THEN p_request_id ELSE gen_random_uuid() END,ticket.id,'staff'");
act=once(act,' INSERT INTO public.audit_log(id,staff_id'," IF p_action='message' AND p_details ? 'media_asset_ids' THEN PERFORM pawpal_private.attach_private_evidence('ticket_image',p_request_id,p_details->'media_asset_ids'); END IF;\n INSERT INTO public.audit_log(id,staff_id");functions.push(act);
const wrappers=`
CREATE FUNCTION public.create_own_support_ticket_media(p_id uuid,p_category text,p_subject text,p_content text,p_appointment uuid,p_order uuid,p_resolution text,p_assets jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN PERFORM public.create_own_support_ticket(p_id,p_category,p_subject,p_content,p_appointment,p_order,p_resolution);PERFORM pawpal_private.attach_private_evidence('ticket_image',p_id,p_assets);RETURN p_id;END $$;
CREATE FUNCTION public.reply_own_support_ticket_media(p_id uuid,p_ticket uuid,p_content text,p_assets jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN PERFORM public.reply_own_support_ticket(p_id,p_ticket,p_content);PERFORM pawpal_private.attach_private_evidence('ticket_image',p_id,p_assets);RETURN p_id;END $$;
CREATE FUNCTION public.request_own_sales_return_media(p_request uuid,p_order uuid,p_expected timestamptz,p_details jsonb,p_assets jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN PERFORM public.request_own_sales_return(p_request,p_order,p_expected,p_details);PERFORM pawpal_private.attach_private_evidence('return_image',p_request,p_assets);RETURN p_request;END $$;
REVOKE ALL ON FUNCTION public.prepare_evidence_media_upload(uuid,text,uuid,uuid,bigint,text,text),public.create_own_support_ticket_media(uuid,text,text,text,uuid,uuid,text,jsonb),public.reply_own_support_ticket_media(uuid,uuid,text,jsonb),public.request_own_sales_return_media(uuid,uuid,timestamptz,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_evidence_media_upload(uuid,text,uuid,uuid,bigint,text,text),public.create_own_support_ticket_media(uuid,text,text,text,uuid,uuid,text,jsonb),public.reply_own_support_ticket_media(uuid,uuid,text,jsonb),public.request_own_sales_return_media(uuid,uuid,timestamptz,jsonb,jsonb) TO authenticated;
`;
const old=backup.constraints.find(x=>x.conname==='media_upload_session_check').definition;
const scope=`product_id IS NULL AND appointment_id IS NULL AND draft_id IS NULL AND variant_id IS NULL AND service_id IS NULL AND record_id IS NULL AND adjustment_id IS NULL AND pet_id IS NULL`;
fs.writeFileSync('scripts/database/v1/198_private_evidence_media.sql',`BEGIN;\nSET LOCAL lock_timeout='3s';\n`+fs.readFileSync('scripts/test/media_evidence_core.sql','utf8')+`
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK(purpose IN ('product_image','care_log_image','product_variant_image','service_image','intake_image','handover_image','adjustment_image','pet_avatar','ticket_image','return_image'));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK((ticket_id IS NULL AND support_message_id IS NULL AND return_id IS NULL AND sales_order_id IS NULL AND (${old.slice(7,-1)})) OR (${scope} AND ((purpose='ticket_image' AND ticket_id IS NOT NULL AND support_message_id IS NOT NULL AND return_id IS NULL AND sales_order_id IS NULL) OR (purpose='return_image' AND return_id IS NOT NULL AND sales_order_id IS NOT NULL AND ticket_id IS NULL AND support_message_id IS NULL))));
`+[prepare,...functions].map(x=>x+';').join('\n')+wrappers+'\nCOMMIT;\n');
console.log('PRIVATE_EVIDENCE_MIGRATION_GENERATED');
fs.writeFileSync('scripts/database/v1/198_private_evidence_media.rollback.sql',`BEGIN;
SET LOCAL lock_timeout='3s';
LOCK TABLE public.media_upload_session IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.media_upload_session WHERE purpose IN ('ticket_image','return_image')) THEN RAISE EXCEPTION 'evidence_rollback_requires_no_sessions';END IF;END $$;
`+['claim_media_upload','finish_media_upload','cancel_media_upload','resolve_media_asset','claim_media_cleanup','release_media_reference','create_own_support_ticket','act_admin_complaint'].map(n=>get(n)+';').join('\n')+`
DROP FUNCTION public.prepare_evidence_media_upload(uuid,text,uuid,uuid,bigint,text,text),public.create_own_support_ticket_media(uuid,text,text,text,uuid,uuid,text,jsonb),public.reply_own_support_ticket_media(uuid,uuid,text,jsonb),public.request_own_sales_return_media(uuid,uuid,timestamptz,jsonb,jsonb),public.list_ticket_media(uuid),public.list_return_media(uuid);
DROP POLICY evidence_ticket_boundary ON public.support_ticket_message_attachment;
DROP POLICY evidence_return_boundary ON public.return_request_evidence;
DROP FUNCTION pawpal_private.can_read_ticket_attachment(uuid),pawpal_private.can_read_return_evidence(uuid);
DROP FUNCTION pawpal_private.attach_private_evidence(text,uuid,jsonb),pawpal_private.media_session_manage(uuid,uuid,boolean),pawpal_private.evidence_access(uuid,text,uuid,uuid,boolean),pawpal_private.evidence_customer(uuid),pawpal_private.evidence_admin(uuid);
ALTER TABLE public.support_ticket_message_attachment DROP CONSTRAINT ticket_attachment_one_source,DROP COLUMN media_asset_id,ALTER COLUMN file_url SET NOT NULL;
ALTER TABLE public.return_request_evidence DROP CONSTRAINT return_evidence_one_source,DROP COLUMN media_asset_id,ALTER COLUMN image_url SET NOT NULL;
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check,DROP COLUMN ticket_id,DROP COLUMN support_message_id,DROP COLUMN return_id,DROP COLUMN sales_order_id;
`+backup.constraints.map(c=>`ALTER TABLE public.media_upload_session ADD CONSTRAINT ${c.conname} ${c.definition};`).join('\n')+'\n'+JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/evidence-before.private.json')).grants.map(g=>`GRANT ${g.privilege_type} ON public.${g.table_name} TO ${g.grantee};`).join('\n')+'\nCOMMIT;\n');
