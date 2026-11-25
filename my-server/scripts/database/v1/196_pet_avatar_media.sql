BEGIN;
SET LOCAL lock_timeout='3s';
ALTER TABLE public.media_upload_session ADD COLUMN pet_id uuid REFERENCES public.pet_profile(id);
ALTER TABLE public.media_upload_session DROP CONSTRAINT media_upload_session_check,DROP CONSTRAINT media_upload_session_purpose_check;
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_purpose_check CHECK(purpose IN ('product_image','care_log_image','product_variant_image','service_image','intake_image','handover_image','adjustment_image','pet_avatar'));
ALTER TABLE public.media_upload_session ADD CONSTRAINT media_upload_session_check CHECK((pet_id IS NULL AND ((((adjustment_id IS NULL) AND (((record_id IS NULL) AND (((service_id IS NULL) AND (((purpose = 'product_image'::text) AND (variant_id IS NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))) OR ((purpose = 'care_log_image'::text) AND (variant_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (appointment_id IS NOT NULL)) OR ((purpose = 'product_variant_image'::text) AND (variant_id IS NOT NULL) AND (appointment_id IS NULL) AND ((product_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = 'service_image'::text) AND (product_id IS NULL) AND (appointment_id IS NULL) AND (variant_id IS NULL) AND ((service_id IS NOT NULL) OR (draft_id IS NOT NULL))))) OR ((purpose = ANY (ARRAY['intake_image'::text, 'handover_image'::text])) AND (appointment_id IS NOT NULL) AND (record_id IS NOT NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL)))) OR ((purpose = 'adjustment_image'::text) AND (appointment_id IS NOT NULL) AND (adjustment_id IS NOT NULL) AND (record_id IS NULL) AND (product_id IS NULL) AND (draft_id IS NULL) AND (variant_id IS NULL) AND (service_id IS NULL))))) OR (purpose='pet_avatar' AND pet_id IS NOT NULL AND appointment_id IS NULL AND adjustment_id IS NULL AND record_id IS NULL AND product_id IS NULL AND draft_id IS NULL AND variant_id IS NULL AND service_id IS NULL));
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
CREATE OR REPLACE FUNCTION public.prepare_pet_media_upload(p_request uuid, p_pet uuid, p_size bigint, p_mime text, p_name text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE p_purpose constant text:='pet_avatar'; p_appointment uuid:=null; p_product uuid:=null; p_draft uuid:=null; s public.media_upload_session; budget bigint; used bigint;
BEGIN
 IF NOT pawpal_private.media_manage(auth.uid(),p_purpose,p_product,p_appointment) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_pet IS NULL OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 3145728
 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp') OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200
 OR NOT EXISTS(SELECT 1 FROM public.pet_profile WHERE id=p_pet) THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pawpal-media-quota',188));
 SELECT * INTO s FROM public.media_upload_session WHERE created_by=auth.uid() AND request_id=p_request FOR UPDATE;
 IF FOUND THEN
  IF s.pet_id IS DISTINCT FROM p_pet OR s.purpose IS DISTINCT FROM p_purpose OR s.product_id IS DISTINCT FROM p_product OR s.appointment_id IS DISTINCT FROM p_appointment OR s.draft_id IS DISTINCT FROM p_draft
  OR s.declared_size<>p_size OR s.mime_type<>p_mime OR s.original_name<>p_name THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409'; END IF;
  IF s.state NOT IN ('pending','verified','attached') OR s.expires_at<=now() AND s.state='pending' THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
  RETURN jsonb_build_object('session_id',s.id,'state',s.state,'asset_id',(SELECT id FROM public.media_asset WHERE session_id=s.id));
 END IF;
 SELECT max_storage_bytes INTO budget FROM pawpal_private.media_settings WHERE singleton AND enabled;
 IF budget IS NULL OR budget=0 THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 SELECT coalesce(sum(declared_size),0) INTO used FROM public.media_upload_session WHERE state<>'deleted';
 IF used+p_size>budget THEN RAISE EXCEPTION 'media_quota_exceeded' USING ERRCODE='54000'; END IF;
 IF (SELECT count(*) FROM public.media_upload_session WHERE created_by=auth.uid() AND state IN ('pending','uploading','verified'))>=10 THEN RAISE EXCEPTION 'media_too_many_pending' USING ERRCODE='54000'; END IF;
 INSERT INTO public.media_upload_session(created_by,request_id,purpose,product_id,appointment_id,draft_id,pet_id,declared_size,mime_type,original_name)
 VALUES(auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,p_pet,p_size,p_mime,p_name) RETURNING * INTO s;
 RETURN jsonb_build_object('session_id',s.id,'state',s.state);
END $function$
;
CREATE OR REPLACE FUNCTION public.resolve_media_asset(p_asset uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.media_asset; s public.media_upload_session; public_read boolean; allowed boolean; staff_actor uuid;
BEGIN
 SELECT * INTO a FROM public.media_asset WHERE id=p_asset AND status IN ('verified','attached');
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id;
 public_read:=a.status='attached' AND s.purpose='product_image' AND EXISTS(SELECT 1 FROM public.product_media m JOIN public.product p ON p.id=m.product_id WHERE m.media_asset_id=a.id AND p.status='active');
 public_read:=public_read OR (a.status='attached' AND s.purpose='product_variant_image' AND EXISTS(
 SELECT 1 FROM public.product_variant_media m JOIN public.product_variant v ON v.id=m.product_variant_id JOIN public.product p ON p.id=v.product_id
 WHERE m.media_asset_id=a.id AND v.id=s.variant_id AND p.status='active' AND v.status='active' AND NOT v.catalog_retired));
 public_read:=public_read OR (a.status='attached' AND s.purpose='service_image' AND EXISTS(SELECT 1 FROM public.service_image m JOIN public.service v ON v.id=m.service_id WHERE m.media_asset_id=a.id AND v.id=s.service_id AND v.status='active'));
 allowed:=public_read;
 IF NOT allowed AND auth.uid() IS NOT NULL THEN
  allowed:=pawpal_private.media_manage(auth.uid(),s.purpose,s.product_id,s.appointment_id) AND (a.status='attached' OR s.created_by=auth.uid());
  IF NOT allowed AND a.status='attached' AND s.purpose IN ('intake_image','handover_image') AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.appointment_record_media m JOIN public.appointment_record r ON r.id=m.record_id JOIN public.appointment ap ON ap.id=r.appointment_id WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='adjustment_image' AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.appointment_adjustment_media m JOIN public.appointment_adjustment r ON r.id=m.adjustment_id JOIN public.appointment ap ON ap.id=r.appointment_id WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='pet_avatar' THEN
   allowed:=EXISTS(SELECT 1 FROM public.pet_profile p WHERE p.avatar_media_asset_id=a.id AND p.id=s.pet_id AND (
    (NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) AND pawpal_private.owns_customer(p.customer_id))
    OR EXISTS(SELECT 1 FROM public.appointment ap WHERE ap.pet_id=p.id AND pawpal_private.media_manage(auth.uid(),'care_log_image',null,ap.id))));
  END IF;
  IF NOT allowed AND a.status='attached' AND s.purpose='care_log_image'
  AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.care_log_media m JOIN public.care_log l ON l.id=m.care_log_id JOIN public.appointment ap ON ap.id=l.appointment_id
    WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
 END IF;
 IF NOT coalesce(allowed,false) THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('id',a.id,'mongo_file_id',a.mongo_file_id,'mime_type',a.mime_type,'size_bytes',a.size_bytes,'sha256',a.sha256,'public',public_read);
END $function$
;
CREATE OR REPLACE FUNCTION public.claim_media_cleanup(p_limit integer DEFAULT 10)
 RETURNS SETOF jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session; a public.media_asset; token uuid;
BEGIN
 IF p_limit NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
 FOR s IN SELECT * FROM public.media_upload_session WHERE
 (state IN ('pending','uploading','verified','pending_delete') AND expires_at<now() AND coalesce(lease_until,now()-interval '1 second')<now())
 OR (state='cleaning' AND lease_until<now()) ORDER BY created_at LIMIT p_limit FOR UPDATE SKIP LOCKED LOOP
  SELECT * INTO a FROM public.media_asset WHERE session_id=s.id FOR UPDATE;
  IF a.id IS NOT NULL AND (a.legal_hold OR a.retention_until>now() OR EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id=a.id)) THEN CONTINUE; END IF;
  token:=gen_random_uuid();
  UPDATE public.media_upload_session SET state='cleaning',lease=token,lease_until=now()+interval '15 minutes' WHERE id=s.id;
  UPDATE public.media_asset SET status='cleaning' WHERE session_id=s.id;
  RETURN NEXT jsonb_build_object('session_id',s.id,'mongo_file_id',s.mongo_file_id,'lease',token);
 END LOOP;
END $function$
;
REVOKE ALL ON FUNCTION public.prepare_pet_media_upload(uuid,uuid,bigint,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_pet_media_upload(uuid,uuid,bigint,text,text) TO authenticated;
COMMIT;
