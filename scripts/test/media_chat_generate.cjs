'use strict';
const fs=require('fs'),b=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/chat-before.private.json'));
const get=n=>{const rows=b.defs.filter(x=>x.proname===n);if(rows.length!==1)throw Error('DEFINITION_SCOPE');return rows[0].definition;};
const once=(s,a,v)=>{if(s.split(a).length!==2)throw Error('SOURCE_DRIFT '+a);return s.replace(a,()=>v);};
const variants=[];
for(const name of ['claim_media_upload','cancel_media_upload','finish_media_upload','fail_media_upload']){
 let s=get(name),newName=name.replace('media_upload','chat_media_upload');
 s=once(s,'public.'+name+'(',`public.${newName}(p_actor uuid, p_guest_hash text, `);
 if(name==='finish_media_upload'||name==='fail_media_upload')s=once(s,'p_lease uuid, p_actor uuid','p_lease uuid');
 s=s.replaceAll('auth.uid()','p_actor');
 s=s.replaceAll('created_by=p_actor',"created_by IS NOT DISTINCT FROM p_actor AND created_by_guest IS NOT DISTINCT FROM (CASE WHEN p_actor IS NULL THEN pawpal_private.chat_media_guest(p_guest_hash) END)");
 s=s.replaceAll('s.created_by IS DISTINCT FROM p_actor',"(s.created_by IS DISTINCT FROM p_actor OR s.created_by_guest IS DISTINCT FROM (CASE WHEN p_actor IS NULL THEN pawpal_private.chat_media_guest(p_guest_hash) END))");
 s=s.replaceAll('pawpal_private.media_session_manage(p_actor,s.id,true)', 'pawpal_private.chat_media_access(p_actor,p_guest_hash,s.chat_conversation_id,true)');
 s=s.replaceAll('pawpal_private.media_session_manage(p_actor,s.id,false)', 'pawpal_private.chat_media_access(p_actor,p_guest_hash,s.chat_conversation_id,false)');
 if(name==='fail_media_upload')s=once(s,'BEGIN\n',"BEGIN\n IF p_actor IS NULL AND pawpal_private.chat_media_guest(p_guest_hash) IS NULL THEN RAISE EXCEPTION 'chat_media_forbidden' USING ERRCODE='42501';END IF;\n");
 else s=once(s,' IF NOT FOUND OR '," IF NOT FOUND OR s.purpose<>'chat_image' OR ");
 variants.push(s);
}
let manage=once(get('media_session_manage')," IF s.purpose='review_image'", " IF s.purpose='chat_image' THEN RETURN pawpal_private.chat_media_access(p_user,null,s.chat_conversation_id,p_write);END IF;\n IF s.purpose='review_image'");
let cleanup=once(get('claim_media_cleanup'),'OR EXISTS(SELECT 1 FROM public.blog_post WHERE thumbnail_media_asset_id=a.id))','OR EXISTS(SELECT 1 FROM public.blog_post WHERE thumbnail_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.chat_message_media WHERE media_asset_id=a.id))');
let release=once(get('release_media_reference'),' THEN\n  UPDATE public.media_asset',' AND NOT EXISTS(SELECT 1 FROM public.chat_message_media WHERE media_asset_id=OLD.media_asset_id) THEN\n  UPDATE public.media_asset');
const old=b.constraints.find(x=>x.conname==='media_upload_session_check').definition;
const actorFields=['product_id','appointment_id','draft_id','variant_id','service_id','record_id','adjustment_id','pet_id','ticket_id','support_message_id','return_id','sales_order_id','review_id','review_line_id','review_kind','content_id'].map(x=>x+' IS NULL').join(' AND ');
const acl=[['pawpal_private.chat_media_guest(text)',null],['pawpal_private.chat_media_access(uuid,text,uuid,boolean)',null],['pawpal_private.attach_chat_media(uuid,text,uuid,uuid[])',null],['public.prepare_chat_media_upload(uuid,text,uuid,uuid,uuid,bigint,text,text)','service_role'],['public.claim_chat_media_upload(uuid,text,uuid)','service_role'],['public.cancel_chat_media_upload(uuid,text,uuid)','service_role'],['public.finish_chat_media_upload(uuid,text,uuid,uuid,text,integer,integer)','service_role'],['public.fail_chat_media_upload(uuid,text,uuid,uuid)','service_role'],['public.resolve_chat_media(uuid,text,uuid)','service_role'],['public.list_chat_media(uuid,text,uuid,uuid[])','service_role'],['public.post_public_chat_message_media(uuid,uuid,timestamptz,uuid,text,text,text,boolean,integer,text,boolean,boolean,uuid[])','service_role'],['public.act_admin_chat_media(uuid,uuid,timestamptz,text,text,uuid[])','authenticated']];
acl.push(['public.list_own_chat_media(uuid,uuid[])','authenticated']);
const sql=`BEGIN;\nSET LOCAL lock_timeout='3s';\n`+fs.readFileSync('scripts/test/media_chat_core.sql','utf8')+`
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK(purpose IN ('product_image','care_log_image','product_variant_image','service_image','intake_image','handover_image','adjustment_image','pet_avatar','ticket_image','return_image','review_image','banner_image','blog_thumbnail','chat_image'));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK((chat_conversation_id IS NULL AND chat_message_id IS NULL AND (${old.slice(7,-1)})) OR (purpose='chat_image' AND chat_conversation_id IS NOT NULL AND chat_message_id IS NOT NULL AND ${actorFields}));
`+[manage,cleanup,release,...variants].map(s=>s+';').join('\n')+'\n'+acl.map(([sig,role])=>`REVOKE ALL ON FUNCTION ${sig} FROM PUBLIC,anon,authenticated,service_role;${role?`GRANT EXECUTE ON FUNCTION ${sig} TO ${role};`:''}`).join('\n')+'\nCOMMIT;\n';
fs.writeFileSync('scripts/database/v1/203_chat_media.sql',sql);
fs.writeFileSync('scripts/database/v1/203_chat_media.rollback.sql',`BEGIN;
SET LOCAL lock_timeout='3s';
LOCK TABLE public.media_upload_session IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.media_upload_session WHERE purpose='chat_image') THEN RAISE EXCEPTION 'chat_rollback_requires_no_sessions';END IF;END $$;
DROP TABLE public.chat_message_media;
`+['media_session_manage','claim_media_cleanup','release_media_reference'].map(n=>get(n)+';').join('\n')+'\n'+acl.reverse().map(([sig])=>`DROP FUNCTION ${sig};`).join('\n')+`
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_session_actor,DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check,DROP COLUMN created_by_guest,DROP COLUMN chat_conversation_id,DROP COLUMN chat_message_id,ALTER COLUMN created_by SET NOT NULL;
`+b.constraints.filter(x=>['media_upload_session_check','media_upload_session_purpose_check'].includes(x.conname)).map(x=>`ALTER TABLE public.media_upload_session ADD CONSTRAINT ${x.conname} ${x.definition};`).join('\n')+'\nCOMMIT;\n');
console.log('CHAT_MEDIA_GENERATED');
