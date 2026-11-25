-- Additive media foundation. Existing URLs/data remain unchanged. Both upload gates default OFF.
BEGIN;
SET LOCAL lock_timeout='3s';
CREATE TABLE pawpal_private.media_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), enabled boolean NOT NULL DEFAULT false,
 max_storage_bytes bigint NOT NULL DEFAULT 0 CHECK(max_storage_bytes BETWEEN 0 AND 300000000)
);
INSERT INTO pawpal_private.media_settings DEFAULT VALUES;
REVOKE ALL ON pawpal_private.media_settings FROM PUBLIC,anon,authenticated,service_role;

CREATE TABLE public.media_upload_session (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_by uuid NOT NULL REFERENCES auth.users(id), request_id uuid NOT NULL,
 purpose text NOT NULL CHECK(purpose IN ('product_image','care_log_image')),
 product_id uuid REFERENCES public.product(id), appointment_id uuid REFERENCES public.appointment(id), draft_id uuid,
 declared_size bigint NOT NULL CHECK(declared_size BETWEEN 1 AND 3145728), mime_type text NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')),
 original_name text NOT NULL CHECK(length(original_name) BETWEEN 1 AND 200),
 mongo_file_id text NOT NULL UNIQUE DEFAULT substr(replace(gen_random_uuid()::text,'-',''),1,24) CHECK(mongo_file_id~'^[a-f0-9]{24}$'),
 state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','uploading','verified','attached','pending_delete','cleaning','deleted')),
 lease uuid, lease_until timestamptz, created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 UNIQUE(created_by,request_id),
 CHECK((purpose='product_image' AND appointment_id IS NULL AND (product_id IS NOT NULL OR draft_id IS NOT NULL))
 OR (purpose='care_log_image' AND product_id IS NULL AND draft_id IS NULL AND appointment_id IS NOT NULL))
);
CREATE TABLE public.media_asset (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), session_id uuid NOT NULL UNIQUE REFERENCES public.media_upload_session(id),
 provider text NOT NULL DEFAULT 'mongodb_gridfs' CHECK(provider='mongodb_gridfs'),
 mongo_file_id text NOT NULL UNIQUE CHECK(mongo_file_id~'^[a-f0-9]{24}$'),
 mime_type text NOT NULL CHECK(mime_type IN ('image/jpeg','image/png','image/webp')), size_bytes bigint NOT NULL CHECK(size_bytes BETWEEN 1 AND 3145728),
 sha256 text NOT NULL CHECK(sha256~'^[a-f0-9]{64}$'), width integer NOT NULL CHECK(width BETWEEN 1 AND 8192),
 height integer NOT NULL CHECK(height BETWEEN 1 AND 8192),
 status text NOT NULL DEFAULT 'verified' CHECK(status IN ('verified','attached','pending_delete','cleaning','deleted')),
 legal_hold boolean NOT NULL DEFAULT false, retention_until timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(), verified_at timestamptz NOT NULL DEFAULT now(), CHECK(width::bigint*height<=20000000)
);
CREATE INDEX media_session_actor_state ON public.media_upload_session(created_by,state);
CREATE INDEX media_session_cleanup ON public.media_upload_session(state,expires_at);
ALTER TABLE public.media_upload_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_asset ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.media_upload_session,public.media_asset FROM PUBLIC,anon,authenticated,service_role;

-- Explicit actor checks are also usable by narrowly granted service-only finalization RPCs.
CREATE FUNCTION pawpal_private.media_staff(p_user uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT s.id FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id
 WHERE s.auth_user_id=p_user AND s.employment_status='active' AND NOT s.must_change_password
 AND coalesce(u.banned_until<=now(),true) AND (SELECT count(*) FROM public.staff_role r WHERE r.staff_id=s.id)=1
 AND EXISTS(SELECT 1 FROM public.staff_role r WHERE r.staff_id=s.id AND r.role_code IN ('ADMIN','STAFF'))
$$;
CREATE FUNCTION pawpal_private.media_manage(p_user uuid,p_purpose text,p_product uuid,p_appointment uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(EXISTS(SELECT 1 FROM public.staff_role r WHERE r.staff_id=pawpal_private.media_staff(p_user) AND
 (r.role_code='ADMIN' OR (p_purpose='care_log_image' AND EXISTS(SELECT 1 FROM public.role_permission rp WHERE rp.role_code=r.role_code AND rp.permission_code='work.service.perform')
 AND EXISTS(SELECT 1 FROM public.appointment a WHERE a.id=p_appointment AND (a.staff_id=r.staff_id
 OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=r.staff_id)
 OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=r.staff_id)))))),false)
$$;
REVOKE ALL ON FUNCTION pawpal_private.media_staff(uuid),pawpal_private.media_manage(uuid,text,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.prepare_media_upload(p_request uuid,p_purpose text,p_product uuid,p_appointment uuid,p_draft uuid,p_size bigint,p_mime text,p_name text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.media_upload_session; budget bigint; used bigint;
BEGIN
 IF NOT pawpal_private.media_manage(auth.uid(),p_purpose,p_product,p_appointment) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_purpose IS NULL OR p_purpose NOT IN ('product_image','care_log_image') OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 3145728
 OR p_mime IS NULL OR p_mime NOT IN ('image/jpeg','image/png','image/webp') OR coalesce(length(p_name),0) NOT BETWEEN 1 AND 200
 OR (p_purpose='product_image' AND (p_appointment IS NOT NULL OR (p_product IS NULL AND p_draft IS NULL)))
 OR (p_purpose='care_log_image' AND (p_appointment IS NULL OR p_product IS NOT NULL OR p_draft IS NOT NULL)) THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('pawpal-media-quota',188));
 SELECT * INTO s FROM public.media_upload_session WHERE created_by=auth.uid() AND request_id=p_request FOR UPDATE;
 IF FOUND THEN
  IF s.purpose IS DISTINCT FROM p_purpose OR s.product_id IS DISTINCT FROM p_product OR s.appointment_id IS DISTINCT FROM p_appointment OR s.draft_id IS DISTINCT FROM p_draft
  OR s.declared_size<>p_size OR s.mime_type<>p_mime OR s.original_name<>p_name THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409'; END IF;
  IF s.state NOT IN ('pending','verified','attached') OR s.expires_at<=now() AND s.state='pending' THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
  RETURN jsonb_build_object('session_id',s.id,'state',s.state,'asset_id',(SELECT id FROM public.media_asset WHERE session_id=s.id));
 END IF;
 SELECT max_storage_bytes INTO budget FROM pawpal_private.media_settings WHERE singleton AND enabled;
 IF budget IS NULL OR budget=0 THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 SELECT coalesce(sum(declared_size),0) INTO used FROM public.media_upload_session WHERE state<>'deleted';
 IF used+p_size>budget THEN RAISE EXCEPTION 'media_quota_exceeded' USING ERRCODE='54000'; END IF;
 IF (SELECT count(*) FROM public.media_upload_session WHERE created_by=auth.uid() AND state IN ('pending','uploading','verified'))>=10 THEN RAISE EXCEPTION 'media_too_many_pending' USING ERRCODE='54000'; END IF;
 INSERT INTO public.media_upload_session(created_by,request_id,purpose,product_id,appointment_id,draft_id,declared_size,mime_type,original_name)
 VALUES(auth.uid(),p_request,p_purpose,p_product,p_appointment,p_draft,p_size,p_mime,p_name) RETURNING * INTO s;
 RETURN jsonb_build_object('session_id',s.id,'state',s.state);
END $$;

CREATE FUNCTION public.claim_media_upload(p_session uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.media_upload_session; a public.media_asset;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session AND created_by=auth.uid() FOR UPDATE;
 IF NOT FOUND OR NOT pawpal_private.media_manage(auth.uid(),s.purpose,s.product_id,s.appointment_id) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF NOT EXISTS(SELECT 1 FROM pawpal_private.media_settings WHERE singleton AND enabled) THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 IF s.state IN ('verified','attached') THEN SELECT * INTO a FROM public.media_asset WHERE session_id=s.id;
  RETURN jsonb_build_object('state',s.state,'asset_id',a.id); END IF;
 IF s.state<>'pending' OR s.expires_at<=now() THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
 UPDATE public.media_upload_session SET state='uploading',lease=gen_random_uuid(),lease_until=now()+interval '15 minutes' WHERE id=s.id RETURNING * INTO s;
 RETURN jsonb_build_object('state',s.state,'session_id',s.id,'lease',s.lease,'mongo_file_id',s.mongo_file_id,'size_bytes',s.declared_size,'mime_type',s.mime_type);
END $$;

CREATE FUNCTION public.finish_media_upload(p_session uuid,p_lease uuid,p_actor uuid,p_sha256 text,p_width integer,p_height integer) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.media_upload_session; result uuid;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM pawpal_private.media_settings WHERE singleton AND enabled) THEN RAISE EXCEPTION 'media_disabled' USING ERRCODE='55000'; END IF;
 IF NOT FOUND OR s.created_by IS DISTINCT FROM p_actor OR s.lease IS DISTINCT FROM p_lease OR p_lease IS NULL
 OR s.state NOT IN ('uploading','verified') OR s.lease_until<=now() OR NOT pawpal_private.media_manage(p_actor,s.purpose,s.product_id,s.appointment_id)
 THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 SELECT id INTO result FROM public.media_asset WHERE session_id=s.id;
 IF FOUND THEN
  IF NOT EXISTS(SELECT 1 FROM public.media_asset WHERE id=result AND sha256=p_sha256 AND width=p_width AND height=p_height) THEN RAISE EXCEPTION 'media_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN result;
 END IF;
 INSERT INTO public.media_asset(session_id,mongo_file_id,mime_type,size_bytes,sha256,width,height)
 VALUES(s.id,s.mongo_file_id,s.mime_type,s.declared_size,p_sha256,p_width,p_height) RETURNING id INTO result;
 UPDATE public.media_upload_session SET state='verified',expires_at=now()+interval '7 days' WHERE id=s.id;
 RETURN result;
END $$;

CREATE FUNCTION public.fail_media_upload(p_session uuid,p_lease uuid,p_actor uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '1 hour'
 WHERE id=p_session AND created_by=p_actor AND lease=p_lease AND p_lease IS NOT NULL AND state='uploading';
END $$;
CREATE FUNCTION public.cancel_media_upload(p_session uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.media_upload_session;
BEGIN
 SELECT * INTO s FROM public.media_upload_session WHERE id=p_session AND created_by=auth.uid() FOR UPDATE;
 IF NOT FOUND OR NOT pawpal_private.media_manage(auth.uid(),s.purpose,s.product_id,s.appointment_id) THEN RAISE EXCEPTION 'media_forbidden' USING ERRCODE='42501'; END IF;
 IF s.state='pending_delete' OR s.state='deleted' THEN RETURN; END IF;
 IF s.state NOT IN ('pending','verified') THEN RAISE EXCEPTION 'media_session_closed' USING ERRCODE='PT409'; END IF;
 UPDATE public.media_upload_session SET state='pending_delete',expires_at=greatest(expires_at,now()+interval '1 hour') WHERE id=s.id;
 UPDATE public.media_asset SET status='pending_delete' WHERE session_id=s.id;
END $$;

ALTER TABLE public.product_media ADD COLUMN media_asset_id uuid UNIQUE REFERENCES public.media_asset(id);
ALTER TABLE public.product_media ALTER COLUMN image_url DROP NOT NULL;
ALTER TABLE public.product_media ADD CONSTRAINT product_media_one_source CHECK((image_url IS NOT NULL)::integer+(media_asset_id IS NOT NULL)::integer=1);
ALTER TABLE public.care_log_media ADD COLUMN media_asset_id uuid UNIQUE REFERENCES public.media_asset(id);
ALTER TABLE public.care_log_media ALTER COLUMN media_url DROP NOT NULL;
ALTER TABLE public.care_log_media ADD CONSTRAINT care_media_one_source CHECK((media_url IS NOT NULL)::integer+(media_asset_id IS NOT NULL)::integer=1);

CREATE FUNCTION pawpal_private.guard_media_reference() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.media_asset; s public.media_upload_session; target uuid;
BEGIN
 IF NEW.media_asset_id IS NULL THEN RETURN NEW; END IF;
 SELECT * INTO a FROM public.media_asset WHERE id=NEW.media_asset_id;
 SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;
 SELECT * INTO a FROM public.media_asset WHERE id=NEW.media_asset_id FOR UPDATE;
 IF a.id IS NULL OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached')
 OR NOT pawpal_private.media_manage(auth.uid(),s.purpose,s.product_id,s.appointment_id)
 OR (a.status='verified' AND s.created_by IS DISTINCT FROM auth.uid()) THEN RAISE EXCEPTION 'media_reference_forbidden' USING ERRCODE='42501'; END IF;
 IF TG_TABLE_NAME='product_media' THEN
  IF s.purpose<>'product_image' OR coalesce(s.product_id,s.draft_id) IS DISTINCT FROM NEW.product_id THEN RAISE EXCEPTION 'media_target_mismatch' USING ERRCODE='42501'; END IF;
  IF s.product_id IS NULL THEN UPDATE public.media_upload_session SET product_id=NEW.product_id WHERE id=s.id; END IF;
 ELSE
  SELECT appointment_id INTO target FROM public.care_log WHERE id=NEW.care_log_id;
  IF s.purpose<>'care_log_image' OR s.appointment_id IS DISTINCT FROM target OR NEW.file_size<>a.size_bytes
  OR (NOT EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=pawpal_private.media_staff(auth.uid()) AND role_code='ADMIN')
      AND NOT EXISTS(SELECT 1 FROM public.care_log WHERE id=NEW.care_log_id AND recorded_by=pawpal_private.media_staff(auth.uid())))
  THEN RAISE EXCEPTION 'media_target_mismatch' USING ERRCODE='42501'; END IF;
 END IF;
 UPDATE public.media_asset SET status='attached',legal_hold=(s.purpose='care_log_image') WHERE id=a.id;
 UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
 RETURN NEW;
END $$;
CREATE TRIGGER media_reference_guard BEFORE INSERT OR UPDATE OF media_asset_id,product_id ON public.product_media FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_media_reference();
CREATE TRIGGER media_reference_guard BEFORE INSERT OR UPDATE OF media_asset_id,care_log_id,file_size ON public.care_log_media FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_media_reference();

CREATE FUNCTION pawpal_private.release_media_reference() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF OLD.media_asset_id IS NULL OR (TG_OP='UPDATE' AND NEW.media_asset_id IS NOT DISTINCT FROM OLD.media_asset_id) THEN RETURN NULL; END IF;
 PERFORM 1 FROM public.media_upload_session WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.media_asset_id) FOR UPDATE;
 PERFORM 1 FROM public.media_asset WHERE id=OLD.media_asset_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=OLD.media_asset_id)
 AND NOT EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=OLD.media_asset_id) THEN
  UPDATE public.media_asset SET status='pending_delete',retention_until=now()+interval '7 days' WHERE id=OLD.media_asset_id;
  UPDATE public.media_upload_session SET state='pending_delete',expires_at=now()+interval '7 days' WHERE id=(SELECT session_id FROM public.media_asset WHERE id=OLD.media_asset_id);
 END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER media_reference_release AFTER DELETE OR UPDATE OF media_asset_id ON public.product_media FOR EACH ROW EXECUTE FUNCTION pawpal_private.release_media_reference();
CREATE TRIGGER media_reference_release AFTER DELETE OR UPDATE OF media_asset_id ON public.care_log_media FOR EACH ROW EXECUTE FUNCTION pawpal_private.release_media_reference();
REVOKE ALL ON FUNCTION pawpal_private.guard_media_reference(),pawpal_private.release_media_reference() FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.resolve_media_asset(p_asset uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.media_asset; s public.media_upload_session; public_read boolean; allowed boolean; staff_actor uuid;
BEGIN
 SELECT * INTO a FROM public.media_asset WHERE id=p_asset AND status IN ('verified','attached');
 IF NOT FOUND THEN RETURN NULL; END IF;
 SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id;
 public_read:=a.status='attached' AND s.purpose='product_image' AND EXISTS(SELECT 1 FROM public.product_media m JOIN public.product p ON p.id=m.product_id WHERE m.media_asset_id=a.id AND p.status='active');
 allowed:=public_read;
 IF NOT allowed AND auth.uid() IS NOT NULL THEN
  allowed:=pawpal_private.media_manage(auth.uid(),s.purpose,s.product_id,s.appointment_id) AND (a.status='attached' OR s.created_by=auth.uid());
  IF NOT allowed AND a.status='attached' AND s.purpose='care_log_image'
  AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
   allowed:=EXISTS(SELECT 1 FROM public.care_log_media m JOIN public.care_log l ON l.id=m.care_log_id JOIN public.appointment ap ON ap.id=l.appointment_id
    WHERE m.media_asset_id=a.id AND pawpal_private.owns_customer(ap.customer_id));
  END IF;
 END IF;
 IF NOT coalesce(allowed,false) THEN RETURN NULL; END IF;
 RETURN jsonb_build_object('id',a.id,'mongo_file_id',a.mongo_file_id,'mime_type',a.mime_type,'size_bytes',a.size_bytes,'sha256',a.sha256,'public',public_read);
END $$;

CREATE FUNCTION public.claim_media_cleanup(p_limit integer DEFAULT 10) RETURNS SETOF jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.media_upload_session; a public.media_asset; token uuid;
BEGIN
 IF p_limit NOT BETWEEN 1 AND 20 THEN RAISE EXCEPTION 'media_invalid' USING ERRCODE='22023'; END IF;
 FOR s IN SELECT * FROM public.media_upload_session WHERE
 (state IN ('pending','uploading','verified','pending_delete') AND expires_at<now() AND coalesce(lease_until,now()-interval '1 second')<now())
 OR (state='cleaning' AND lease_until<now()) ORDER BY created_at LIMIT p_limit FOR UPDATE SKIP LOCKED LOOP
  SELECT * INTO a FROM public.media_asset WHERE session_id=s.id FOR UPDATE;
  IF a.id IS NOT NULL AND (a.legal_hold OR a.retention_until>now() OR EXISTS(SELECT 1 FROM public.product_media WHERE media_asset_id=a.id) OR EXISTS(SELECT 1 FROM public.care_log_media WHERE media_asset_id=a.id)) THEN CONTINUE; END IF;
  token:=gen_random_uuid();
  UPDATE public.media_upload_session SET state='cleaning',lease=token,lease_until=now()+interval '15 minutes' WHERE id=s.id;
  UPDATE public.media_asset SET status='cleaning' WHERE session_id=s.id;
  RETURN NEXT jsonb_build_object('session_id',s.id,'mongo_file_id',s.mongo_file_id,'lease',token);
 END LOOP;
END $$;
CREATE FUNCTION public.finish_media_cleanup(p_session uuid,p_lease uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended('pawpal-media-quota',188));
 UPDATE public.media_upload_session SET state='deleted' WHERE id=p_session AND state='cleaning' AND lease=p_lease AND p_lease IS NOT NULL AND lease_until>now();
 IF NOT FOUND THEN RAISE EXCEPTION 'media_cleanup_conflict' USING ERRCODE='PT409'; END IF;
 UPDATE public.media_asset SET status='deleted' WHERE session_id=p_session;
END $$;

REVOKE ALL ON FUNCTION public.prepare_media_upload(uuid,text,uuid,uuid,uuid,bigint,text,text),public.claim_media_upload(uuid),public.cancel_media_upload(uuid),public.resolve_media_asset(uuid),
 public.finish_media_upload(uuid,uuid,uuid,text,integer,integer),public.fail_media_upload(uuid,uuid,uuid),public.claim_media_cleanup(integer),public.finish_media_cleanup(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_media_upload(uuid,text,uuid,uuid,uuid,bigint,text,text),public.claim_media_upload(uuid),public.cancel_media_upload(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_media_asset(uuid) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_media_upload(uuid,uuid,uuid,text,integer,integer),public.fail_media_upload(uuid,uuid,uuid),public.claim_media_cleanup(integer),public.finish_media_cleanup(uuid,uuid) TO service_role;
COMMIT;
