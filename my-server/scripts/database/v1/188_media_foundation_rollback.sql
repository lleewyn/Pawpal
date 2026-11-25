-- Only before real uploads. Once files exist, disable uploads and keep the reader/metadata instead.
BEGIN;
SET LOCAL lock_timeout='3s';
LOCK TABLE public.media_upload_session,public.media_asset,public.product_media,public.care_log_media IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pawpal_private.media_settings WHERE enabled)
 OR EXISTS(SELECT 1 FROM public.media_upload_session) OR EXISTS(SELECT 1 FROM public.media_asset)
 OR EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id IS NOT NULL)
 OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id IS NOT NULL)
 THEN RAISE EXCEPTION 'media_rollback_requires_empty_disabled_foundation'; END IF;
END $$;
DROP TRIGGER media_reference_guard ON public.product_media;
DROP TRIGGER media_reference_guard ON public.care_log_media;
DROP TRIGGER media_reference_release ON public.product_media;
DROP TRIGGER media_reference_release ON public.care_log_media;
DROP FUNCTION pawpal_private.guard_media_reference(),pawpal_private.release_media_reference();
DROP FUNCTION public.prepare_media_upload(uuid,text,uuid,uuid,uuid,bigint,text,text),public.claim_media_upload(uuid),public.cancel_media_upload(uuid),public.resolve_media_asset(uuid),
 public.finish_media_upload(uuid,uuid,uuid,text,integer,integer),public.fail_media_upload(uuid,uuid,uuid),public.claim_media_cleanup(integer),public.finish_media_cleanup(uuid,uuid);
ALTER TABLE public.product_media DROP CONSTRAINT product_media_one_source, DROP COLUMN media_asset_id, ALTER COLUMN image_url SET NOT NULL;
ALTER TABLE public.care_log_media DROP CONSTRAINT care_media_one_source, DROP COLUMN media_asset_id, ALTER COLUMN media_url SET NOT NULL;
DROP TABLE public.media_asset,public.media_upload_session,pawpal_private.media_settings;
DROP FUNCTION pawpal_private.media_manage(uuid,text,uuid,uuid),pawpal_private.media_staff(uuid);
COMMIT;
