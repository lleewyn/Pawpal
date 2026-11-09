ALTER TABLE public.media_upload_session ADD COLUMN content_id uuid;
ALTER TABLE public.banner ADD COLUMN image_media_asset_id uuid UNIQUE REFERENCES public.media_asset(id),ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.banner ADD CONSTRAINT banner_image_one_source CHECK((image_url IS NOT NULL)::integer+(image_media_asset_id IS NOT NULL)::integer=1);
ALTER TABLE public.blog_post ADD COLUMN thumbnail_media_asset_id uuid UNIQUE REFERENCES public.media_asset(id);
ALTER TABLE public.blog_post ADD CONSTRAINT blog_thumbnail_one_source CHECK(thumbnail_url IS NULL OR thumbnail_media_asset_id IS NULL);
CREATE FUNCTION pawpal_private.guard_content_media() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE selected uuid:=(to_jsonb(NEW)->>TG_ARGV[1])::uuid;prior uuid:=(to_jsonb(OLD)->>TG_ARGV[1])::uuid;a public.media_asset;s public.media_upload_session;
BEGIN
 IF selected IS NULL OR selected IS NOT DISTINCT FROM prior THEN RETURN NEW;END IF;
 SELECT * INTO a FROM public.media_asset WHERE id=selected;SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;SELECT * INTO a FROM public.media_asset WHERE id=selected FOR UPDATE;
 IF a.id IS NULL OR s.purpose<>TG_ARGV[0] OR s.content_id IS DISTINCT FROM NEW.id OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached') OR NOT pawpal_private.media_manage(auth.uid(),s.purpose,null,null) OR (a.status='verified' AND s.created_by IS DISTINCT FROM auth.uid()) THEN RAISE EXCEPTION 'content_media_forbidden' USING ERRCODE='42501';END IF;
 UPDATE public.media_asset SET status='attached' WHERE id=a.id;UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;RETURN NEW;
END $$;
CREATE FUNCTION pawpal_private.release_content_media() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE prior uuid:=(to_jsonb(OLD)->>TG_ARGV[0])::uuid;
BEGIN
 IF prior IS NULL OR (TG_OP='UPDATE' AND prior IS NOT DISTINCT FROM (to_jsonb(NEW)->>TG_ARGV[0])::uuid) THEN RETURN NULL;END IF;
 PERFORM 1 FROM public.media_upload_session WHERE id=(SELECT session_id FROM public.media_asset WHERE id=prior) FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.banner WHERE image_media_asset_id=prior) AND NOT EXISTS(SELECT 1 FROM public.blog_post WHERE thumbnail_media_asset_id=prior) THEN
  UPDATE public.media_asset SET status='pending_delete',retention_until=now()+interval '7 days' WHERE id=prior;
  UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '7 days' WHERE id=(SELECT session_id FROM public.media_asset WHERE id=prior);
 END IF;RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_content_media(),pawpal_private.release_content_media() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER banner_media_guard BEFORE INSERT OR UPDATE OF image_media_asset_id ON public.banner FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_content_media('banner_image','image_media_asset_id');
CREATE TRIGGER banner_media_release AFTER DELETE OR UPDATE OF image_media_asset_id ON public.banner FOR EACH ROW EXECUTE FUNCTION pawpal_private.release_content_media('image_media_asset_id');
CREATE TRIGGER blog_media_guard BEFORE INSERT OR UPDATE OF thumbnail_media_asset_id ON public.blog_post FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_content_media('blog_thumbnail','thumbnail_media_asset_id');
CREATE TRIGGER blog_media_release AFTER DELETE OR UPDATE OF thumbnail_media_asset_id ON public.blog_post FOR EACH ROW EXECUTE FUNCTION pawpal_private.release_content_media('thumbnail_media_asset_id');
