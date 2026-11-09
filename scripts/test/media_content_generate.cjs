'use strict';
const fs=require('node:fs'),b=JSON.parse(fs.readFileSync('D:/Aboutme/Pawpal-infra/media/phase5-remaining/content-before.private.json'));
const get=n=>{const r=b.defs.filter(x=>x.proname===n);if(r.length!==1)throw Error('FUNCTION_SCOPE '+n);return r[0].definition;},once=(s,a,v)=>{if(s.split(a).length!==2)throw Error('SOURCE_DRIFT '+a);return s.replace(a,()=>v);};
let prepare=get('prepare_pet_media_upload');
prepare=once(prepare,'public.prepare_pet_media_upload(p_request uuid, p_pet uuid, p_size bigint, p_mime text, p_name text)','public.prepare_content_media_upload(p_request uuid, p_purpose text, p_content uuid, p_size bigint, p_mime text, p_name text)');
prepare=once(prepare,"p_purpose constant text:='pet_avatar'; ",'');prepare=prepare.replaceAll('p_pet','p_content').replaceAll('pet_id','content_id');
prepare=once(prepare,'OR NOT EXISTS(SELECT 1 FROM public.pet_profile WHERE id=p_content)',"OR p_purpose IS NULL OR p_purpose NOT IN ('banner_image','blog_thumbnail')");
let save=once(get('save_admin_setting_record'),"'title','description','image_url','link'","'title','description','image_url','image_media_asset_id','link'");
save=once(save,"'category_id','thumbnail_url','publish_at'","'category_id','thumbnail_url','thumbnail_media_asset_id','publish_at'");
save=once(save,"OR coalesce(merged->>'image_url','')!~'^(https?://|/[^/])'","OR ((merged->>'image_media_asset_id') IS NULL AND coalesce(merged->>'image_url','')!~'^(https?://|/[^/])')");
let resolve=once(get('resolve_media_asset'),' allowed:=public_read;',` public_read:=public_read OR (a.status='attached' AND s.purpose='banner_image' AND EXISTS(SELECT 1 FROM public.banner b WHERE b.id=s.content_id AND b.image_media_asset_id=a.id AND b.status IN ('active','ACTIVE','dang_hien_thi') AND (b.start_date IS NULL OR b.start_date<=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date) AND (b.end_date IS NULL OR b.end_date>=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)));
 public_read:=public_read OR (a.status='attached' AND s.purpose='blog_thumbnail' AND EXISTS(SELECT 1 FROM public.blog_post b WHERE b.id=s.content_id AND b.thumbnail_media_asset_id=a.id AND b.status IN ('published','da_xuat_ban') AND (b.publish_at IS NULL OR b.publish_at<=now())));
 allowed:=public_read;`);
const cleanup=once(get('claim_media_cleanup'),'OR EXISTS(SELECT 1 FROM public.review_media WHERE media_asset_id=a.id))','OR EXISTS(SELECT 1 FROM public.review_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.banner WHERE image_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.blog_post WHERE thumbnail_media_asset_id=a.id))');
const release=once(get('release_media_reference'),' THEN\n  UPDATE public.media_asset',' AND NOT EXISTS(SELECT 1 FROM public.banner WHERE image_media_asset_id=OLD.media_asset_id) AND NOT EXISTS(SELECT 1 FROM public.blog_post WHERE thumbnail_media_asset_id=OLD.media_asset_id) THEN\n  UPDATE public.media_asset');
const old=b.constraints.find(c=>c.conname==='media_upload_session_check').definition;
fs.writeFileSync('scripts/database/v1/201_content_media.sql',`BEGIN;\nSET LOCAL lock_timeout='3s';\n`+fs.readFileSync('scripts/test/media_content_core.sql','utf8')+`
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK(purpose IN ('product_image','care_log_image','product_variant_image','service_image','intake_image','handover_image','adjustment_image','pet_avatar','ticket_image','return_image','review_image','banner_image','blog_thumbnail'));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK((content_id IS NULL AND (${old.slice(7,-1)})) OR (purpose IN ('banner_image','blog_thumbnail') AND content_id IS NOT NULL AND product_id IS NULL AND appointment_id IS NULL AND draft_id IS NULL AND variant_id IS NULL AND service_id IS NULL AND record_id IS NULL AND adjustment_id IS NULL AND pet_id IS NULL AND ticket_id IS NULL AND support_message_id IS NULL AND return_id IS NULL AND sales_order_id IS NULL AND review_id IS NULL AND review_line_id IS NULL AND review_kind IS NULL));
`+[prepare,save,resolve,cleanup,release].map(s=>s+';').join('\n')+`
REVOKE ALL ON FUNCTION public.prepare_content_media_upload(uuid,text,uuid,bigint,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_content_media_upload(uuid,text,uuid,bigint,text,text) TO authenticated;
COMMIT;
`);
fs.writeFileSync('scripts/database/v1/201_content_media.rollback.sql',`BEGIN;
SET LOCAL lock_timeout='3s';
LOCK TABLE public.media_upload_session IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM public.media_upload_session WHERE purpose IN ('banner_image','blog_thumbnail')) THEN RAISE EXCEPTION 'content_rollback_requires_no_sessions';END IF;END $$;
`+['save_admin_setting_record','resolve_media_asset','claim_media_cleanup','release_media_reference'].map(n=>get(n)+';').join('\n')+`
DROP TRIGGER banner_media_guard ON public.banner;DROP TRIGGER banner_media_release ON public.banner;DROP TRIGGER blog_media_guard ON public.blog_post;DROP TRIGGER blog_media_release ON public.blog_post;
DROP FUNCTION public.prepare_content_media_upload(uuid,text,uuid,bigint,text,text),pawpal_private.guard_content_media(),pawpal_private.release_content_media();
ALTER TABLE public.banner DROP CONSTRAINT banner_image_one_source,DROP COLUMN image_media_asset_id,ALTER COLUMN image_url SET NOT NULL;
ALTER TABLE public.blog_post DROP CONSTRAINT blog_thumbnail_one_source,DROP COLUMN thumbnail_media_asset_id;
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check,DROP COLUMN content_id;
`+b.constraints.map(c=>`ALTER TABLE public.media_upload_session ADD CONSTRAINT ${c.conname} ${c.definition};`).join('\n')+'\nCOMMIT;\n');
console.log('CONTENT_MEDIA_MIGRATION_GENERATED');
