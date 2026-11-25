BEGIN;
SET LOCAL lock_timeout='3s';
-- Customer-owned pet images use the existing private media lifecycle, including draft uploads.
ALTER TABLE public.pet_profile ADD COLUMN vaccine_media_asset_id uuid UNIQUE REFERENCES public.media_asset(id);
ALTER TABLE public.pet_profile ADD COLUMN vaccination_recorded boolean NOT NULL DEFAULT false;
DO $$ DECLARE r record; expression text; BEGIN
 FOR r IN SELECT conname,pg_get_expr(conbin,conrelid) expression FROM pg_constraint
  WHERE conrelid='public.media_upload_session'::regclass AND contype='c'
  AND conname IN ('media_upload_session_purpose_check','media_upload_session_check') LOOP
  expression:=CASE WHEN r.conname='media_upload_session_purpose_check' THEN
   '('||r.expression||') OR purpose IN (''customer_pet_avatar'',''customer_pet_vaccine'')'
   ELSE '('||r.expression||') OR (purpose IN (''customer_pet_avatar'',''customer_pet_vaccine'') AND draft_id IS NOT NULL
    AND pet_id IS NULL AND product_id IS NULL AND appointment_id IS NULL AND variant_id IS NULL AND service_id IS NULL
    AND record_id IS NULL AND adjustment_id IS NULL)' END;
  EXECUTE format('ALTER TABLE public.media_upload_session DROP CONSTRAINT %I',r.conname);
  EXECUTE format('ALTER TABLE public.media_upload_session ADD CONSTRAINT %I CHECK(%s)',r.conname,expression);
 END LOOP;
END $$;
CREATE FUNCTION pawpal_private.customer_pet_media_allowed(p_actor uuid,p_pet uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT p_actor IS NOT NULL AND p_pet IS NOT NULL
 AND EXISTS(SELECT 1 FROM public.customer c JOIN auth.users u ON u.id=c.auth_user_id
  WHERE c.auth_user_id=p_actor AND c.customer_status='active' AND u.deleted_at IS NULL
  AND (u.banned_until IS NULL OR u.banned_until<=now())
  AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=p_actor)
  AND NOT EXISTS(SELECT 1 FROM public.pet_profile p WHERE p.id=p_pet AND p.customer_id<>c.id))
$$;
REVOKE ALL ON FUNCTION pawpal_private.customer_pet_media_allowed(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.prepare_customer_pet_media_upload(p_request uuid,p_pet uuid,p_kind text,p_size bigint,p_mime text,p_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.media_upload_session; budget bigint; used bigint;
BEGIN
 IF NOT pawpal_private.customer_pet_media_allowed(auth.uid(),p_pet) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501';END IF;
 IF p_request IS NULL OR p_kind IS NULL OR p_kind NOT IN ('customer_pet_avatar','customer_pet_vaccine') OR p_size IS NULL
 OR p_size NOT BETWEEN 1 AND 3145728 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp')
 OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200 THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pawpal-media-quota',188));
 SELECT * INTO s FROM public.media_upload_session WHERE created_by=auth.uid() AND request_id=p_request FOR UPDATE;
 IF FOUND THEN
  IF s.draft_id IS DISTINCT FROM p_pet OR s.purpose IS DISTINCT FROM p_kind OR s.declared_size<>p_size OR s.mime_type<>p_mime
   OR s.original_name<>p_name THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409';END IF;
  IF s.state NOT IN ('pending','verified','attached') OR (s.state='pending' AND s.expires_at<=now()) THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409';END IF;
  RETURN jsonb_build_object('session_id',s.id,'state',s.state);
 END IF;
 SELECT max_storage_bytes INTO budget FROM pawpal_private.media_settings WHERE singleton AND enabled;
 IF budget IS NULL THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000';END IF;
 SELECT coalesce(sum(declared_size),0) INTO used FROM public.media_upload_session WHERE state<>'deleted';
 IF used+p_size>budget THEN RAISE EXCEPTION 'media_quota_exceeded' USING ERRCODE='54000';END IF;
 IF (SELECT count(*) FROM public.media_upload_session WHERE created_by=auth.uid() AND created_at>now()-interval '1 hour')>=40
 THEN RAISE EXCEPTION 'media_rate_limit' USING ERRCODE='54000';END IF;
 INSERT INTO public.media_upload_session(created_by,request_id,purpose,draft_id,declared_size,mime_type,original_name)
 VALUES(auth.uid(),p_request,p_kind,p_pet,p_size,p_mime,p_name) RETURNING * INTO s;
 RETURN jsonb_build_object('session_id',s.id,'state',s.state);
END $$;
REVOKE ALL ON FUNCTION public.prepare_customer_pet_media_upload(uuid,uuid,text,bigint,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_customer_pet_media_upload(uuid,uuid,text,bigint,text,text) TO authenticated;

CREATE FUNCTION pawpal_private.attach_customer_pet_image(p_pet uuid,p_asset uuid,p_kind text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.media_asset; s public.media_upload_session;
BEGIN
 SELECT * INTO a FROM public.media_asset WHERE id=p_asset;
 SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;
 SELECT * INTO a FROM public.media_asset WHERE id=p_asset FOR UPDATE;
 IF a.id IS NULL OR s.purpose IS DISTINCT FROM p_kind OR s.draft_id IS DISTINCT FROM p_pet
 OR s.created_by IS DISTINCT FROM auth.uid() OR NOT pawpal_private.customer_pet_media_allowed(auth.uid(),p_pet)
 OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached') THEN
 RAISE EXCEPTION 'pet_image_forbidden' USING ERRCODE='42501';END IF;
 UPDATE public.media_asset SET status='attached' WHERE id=a.id;
 UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.attach_customer_pet_image(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION pawpal_private.guard_customer_vaccine_media() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.vaccine_media_asset_id IS NOT NULL AND NEW.vaccine_media_asset_id IS DISTINCT FROM OLD.vaccine_media_asset_id THEN
  PERFORM pawpal_private.attach_customer_pet_image(NEW.id,NEW.vaccine_media_asset_id,'customer_pet_vaccine');
 END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_customer_vaccine_media() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER customer_vaccine_media_guard BEFORE INSERT OR UPDATE OF vaccine_media_asset_id ON public.pet_profile
 FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_customer_vaccine_media();

CREATE FUNCTION pawpal_private.resolve_customer_pet_breed(p_species text,p_breed text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_species_id uuid; v_breed_id uuid; species_name_value text:=btrim(p_species); breed_name_value text:=btrim(p_breed);
BEGIN
 IF coalesce(length(species_name_value),0) NOT BETWEEN 1 AND 100 OR coalesce(length(breed_name_value),0) NOT BETWEEN 1 AND 160
 OR breed_name_value ~ '^[0-9]+$' OR lower(breed_name_value) IN ('unknown','null','undefined','chưa rõ','chưa cập nhật')
 THEN RAISE EXCEPTION 'Vui lòng nhập loài và giống thú cưng hợp lệ' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(lower(species_name_value)||':'||lower(breed_name_value),205));
 SELECT s.id INTO v_species_id FROM public.pet_species s WHERE lower(s.species_name)=lower(species_name_value) AND s.is_active LIMIT 1;
 IF v_species_id IS NULL THEN RAISE EXCEPTION 'Loài thú cưng chưa có trong danh mục' USING ERRCODE='22023';END IF;
 SELECT b.id INTO v_breed_id FROM public.pet_breed b WHERE b.species_id=v_species_id AND lower(b.breed_name)=lower(breed_name_value) LIMIT 1;
 IF v_breed_id IS NULL THEN INSERT INTO public.pet_breed(species_id,breed_name) VALUES(v_species_id,breed_name_value) RETURNING id INTO v_breed_id;
 ELSIF NOT EXISTS(SELECT 1 FROM public.pet_breed WHERE id=v_breed_id AND is_active) THEN RAISE EXCEPTION 'Giống thú cưng đã ngừng sử dụng' USING ERRCODE='22023';END IF;
 RETURN v_breed_id;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.resolve_customer_pet_breed(text,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.save_own_pet(p_id uuid, p_expected timestamp with time zone, p_values jsonb, p_weight numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE owner_id uuid; existing public.pet_profile; breed uuid; last_weight numeric; born date;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND customer_status='active' AND pawpal_private.owns_customer(id) FOR UPDATE;
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
  RAISE EXCEPTION 'Phiên khách hàng không hợp lệ' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR jsonb_typeof(p_values) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Hồ sơ không hợp lệ'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,59));
 SELECT * INTO existing FROM public.pet_profile WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF existing.customer_id<>owner_id THEN RAISE EXCEPTION 'Hồ sơ không thuộc chủ nuôi' USING ERRCODE='42501'; END IF;
  IF existing.updated_at IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Hồ sơ đã thay đổi. Vui lòng tải lại trước khi lưu' USING ERRCODE='PT409'; END IF;
 ELSIF p_expected IS NOT NULL THEN RAISE EXCEPTION 'Hồ sơ không còn tồn tại' USING ERRCODE='PT409'; END IF;
 breed:=CASE WHEN nullif(btrim(p_values->>'breed_name'),'') IS NOT NULL
    THEN pawpal_private.resolve_customer_pet_breed(p_values->>'species_name',p_values->>'breed_name')
    ELSE (p_values->>'breed_id')::uuid END; born:=nullif(p_values->>'date_of_birth','')::date;
 IF length(btrim(coalesce(p_values->>'pet_name',''))) NOT BETWEEN 1 AND 200
 OR born>CURRENT_DATE OR coalesce(p_values->>'gender','') NOT IN ('nam','nu')
 OR length(coalesce(p_values->>'color',''))>200
 OR length(coalesce(p_values->>'routine',''))>2000 OR length(coalesce(p_values->>'allergy',''))>2000 OR length(coalesce(p_values->>'safety_note',''))>2000
 OR NOT EXISTS(SELECT 1 FROM public.pet_breed b JOIN public.pet_species s ON s.id=b.species_id WHERE b.id=breed AND b.is_active AND s.is_active)
 OR (p_weight IS NOT NULL AND (p_weight::text IN ('NaN','Infinity','-Infinity') OR p_weight<=0 OR p_weight>1000)) THEN
  RAISE EXCEPTION 'Thông tin bé cưng hoặc cân nặng không hợp lệ' USING ERRCODE='22023'; END IF;
 IF existing.id IS NULL THEN
  INSERT INTO public.pet_profile(id,customer_id,pet_code,pet_name,breed_id,gender,date_of_birth,color,routine,allergy,safety_note,status)
  VALUES(p_id,owner_id,'PET-'||upper(replace(p_id::text,'-','')),btrim(p_values->>'pet_name'),breed,p_values->>'gender',born,
   nullif(btrim(p_values->>'color'),''),nullif(btrim(p_values->>'routine'),''),nullif(btrim(p_values->>'allergy'),''),nullif(btrim(p_values->>'safety_note'),''),'active');
 ELSE
  UPDATE public.pet_profile SET pet_name=btrim(p_values->>'pet_name'),breed_id=breed,gender=p_values->>'gender',date_of_birth=born,
   color=nullif(btrim(p_values->>'color'),''),routine=nullif(btrim(p_values->>'routine'),''),allergy=nullif(btrim(p_values->>'allergy'),''),
   safety_note=nullif(btrim(p_values->>'safety_note'),''),updated_at=clock_timestamp() WHERE id=p_id;
 END IF;
 IF p_values ? 'avatar_media_asset_id' THEN
  UPDATE public.pet_profile SET avatar_url=null,avatar_media_asset_id=nullif(p_values->>'avatar_media_asset_id','')::uuid WHERE id=p_id;
 END IF;
 IF p_values ? 'vaccine_media_asset_id' THEN
  UPDATE public.pet_profile SET vaccine_media_asset_id=nullif(p_values->>'vaccine_media_asset_id','')::uuid WHERE id=p_id;
 END IF;
 IF p_values ? 'vaccination_recorded' THEN
  UPDATE public.pet_profile SET vaccination_recorded=(p_values->>'vaccination_recorded')::boolean WHERE id=p_id;
 END IF;
 SELECT weight INTO last_weight FROM public.pet_weight_history WHERE pet_id=p_id ORDER BY measured_at DESC,created_at DESC,id DESC LIMIT 1;
 IF p_weight IS NOT NULL AND last_weight IS DISTINCT FROM p_weight THEN
  INSERT INTO public.pet_weight_history(pet_id,weight,measured_at,note) VALUES(p_id,p_weight,now(),'Chủ nuôi cập nhật hồ sơ');
 END IF;
 RETURN p_id;
END $function$
;

CREATE OR REPLACE FUNCTION pawpal_private.media_session_manage(p_user uuid, p_session uuid, p_write boolean DEFAULT true)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE s public.media_upload_session;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session;
 IF NOT FOUND THEN RETURN false; END IF;
 IF s.purpose IN ('customer_pet_avatar','customer_pet_vaccine') THEN
  RETURN coalesce((s.created_by=p_user AND pawpal_private.customer_pet_media_allowed(p_user,s.draft_id))
   OR (NOT p_write AND pawpal_private.media_manage(p_user,s.purpose,null,null)),false);
 END IF;
 IF s.purpose='chat_image' THEN RETURN pawpal_private.chat_media_access(p_user,null,s.chat_conversation_id,p_write);END IF;
 IF s.purpose='review_image' THEN RETURN pawpal_private.review_media_access(p_user,s.review_id,s.review_line_id,s.review_kind,p_write);END IF;
 IF s.purpose='ticket_image' AND NOT EXISTS(SELECT 1 FROM public.support_ticket WHERE id=s.ticket_id) THEN
  RETURN coalesce(s.created_by=p_user AND (pawpal_private.evidence_admin(p_user) OR pawpal_private.evidence_customer(p_user) IS NOT NULL),false);
 END IF;
 IF s.purpose IN ('ticket_image','return_image') THEN RETURN coalesce(pawpal_private.evidence_access(p_user,s.purpose,coalesce(s.support_message_id,s.return_id),coalesce(s.ticket_id,s.sales_order_id),p_write),false); END IF;
 RETURN pawpal_private.media_manage(p_user,s.purpose,s.product_id,s.appointment_id);
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
  IF a.id IS NOT NULL AND (a.legal_hold OR a.retention_until>now() OR EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.product_variant_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.service_image WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_record_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.appointment_adjustment_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id=a.id OR vaccine_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.support_ticket_message_attachment WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.return_request_evidence WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.review_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.banner WHERE image_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.blog_post WHERE thumbnail_media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.chat_message_media WHERE media_asset_id=a.id)) THEN CONTINUE; END IF;
  token:=gen_random_uuid();
  UPDATE public.media_upload_session SET state='cleaning',lease=token,lease_until=now()+interval '15 minutes' WHERE id=s.id;
  UPDATE public.media_asset SET status='cleaning' WHERE session_id=s.id;
  RETURN NEXT jsonb_build_object('session_id',s.id,'mongo_file_id',s.mongo_file_id,'lease',token);
 END LOOP;
END $function$
;

CREATE OR REPLACE FUNCTION pawpal_private.guard_pet_avatar_media()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.media_asset;s public.media_upload_session;
BEGIN
 IF NEW.avatar_media_asset_id IS NOT NULL AND NEW.avatar_media_asset_id IS DISTINCT FROM OLD.avatar_media_asset_id THEN
  IF EXISTS(SELECT 1 FROM public.media_asset image_asset JOIN public.media_upload_session image_session ON image_session.id=image_asset.session_id
   WHERE image_asset.id=NEW.avatar_media_asset_id AND image_session.purpose='customer_pet_avatar') THEN
   PERFORM pawpal_private.attach_customer_pet_image(NEW.id,NEW.avatar_media_asset_id,'customer_pet_avatar');RETURN NEW;
  END IF;
  SELECT * INTO a FROM public.media_asset WHERE id=NEW.avatar_media_asset_id;
  SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;
  SELECT * INTO a FROM public.media_asset WHERE id=NEW.avatar_media_asset_id FOR UPDATE;
  IF a.id IS NULL OR s.purpose<>'pet_avatar' OR s.pet_id IS DISTINCT FROM NEW.id OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached')
   OR NOT pawpal_private.media_manage(auth.uid(),s.purpose,null,null) OR (a.status='verified' AND s.created_by IS DISTINCT FROM auth.uid()) THEN RAISE EXCEPTION 'pet_avatar_forbidden' USING ERRCODE='42501'; END IF;
  UPDATE public.media_asset SET status='attached' WHERE id=a.id;UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
 END IF;
 RETURN NEW;
END $function$
;

CREATE OR REPLACE FUNCTION pawpal_private.release_pet_avatar_media()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
 IF OLD.avatar_media_asset_id IS NULL OR (TG_OP='UPDATE' AND NEW.avatar_media_asset_id IS NOT DISTINCT FROM OLD.avatar_media_asset_id) THEN RETURN NULL; END IF;
 PERFORM 1 FROM public.media_upload_session WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.avatar_media_asset_id) FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.pet_profile WHERE avatar_media_asset_id=OLD.avatar_media_asset_id) THEN
 UPDATE public.media_asset SET status='pending_delete',retention_until=now()+interval '7 days' WHERE id=OLD.avatar_media_asset_id;
 UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '7 days' WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.avatar_media_asset_id);END IF;
 RETURN NULL;
END $function$
;

CREATE OR REPLACE FUNCTION pawpal_private.release_customer_vaccine_media()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
 IF OLD.vaccine_media_asset_id IS NULL OR (TG_OP='UPDATE' AND NEW.vaccine_media_asset_id IS NOT DISTINCT FROM OLD.vaccine_media_asset_id) THEN RETURN NULL; END IF;
 PERFORM 1 FROM public.media_upload_session WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.vaccine_media_asset_id) FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.pet_profile WHERE vaccine_media_asset_id=OLD.vaccine_media_asset_id) THEN
 UPDATE public.media_asset SET status='pending_delete',retention_until=now()+interval '7 days' WHERE id=OLD.vaccine_media_asset_id;
 UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '7 days' WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.vaccine_media_asset_id);END IF;
 RETURN NULL;
END $function$
;
REVOKE ALL ON FUNCTION pawpal_private.release_customer_vaccine_media() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER customer_vaccine_media_release AFTER DELETE OR UPDATE OF vaccine_media_asset_id ON public.pet_profile FOR EACH ROW EXECUTE FUNCTION pawpal_private.release_customer_vaccine_media();

NOTIFY pgrst,'reload schema';
COMMIT;
