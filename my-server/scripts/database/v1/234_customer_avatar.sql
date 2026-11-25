BEGIN;
ALTER TABLE public.customer_profile ADD COLUMN IF NOT EXISTS avatar_media_asset_id uuid UNIQUE REFERENCES public.media_asset(id);
CREATE OR REPLACE FUNCTION pawpal_private.customer_avatar_allowed(p_actor uuid,p_customer uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.customer c JOIN auth.users u ON u.id=c.auth_user_id
 WHERE c.id=p_customer AND c.auth_user_id=p_actor AND c.customer_status='active' AND u.deleted_at IS NULL
 AND coalesce(u.banned_until<=now(),true) AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=p_actor));
$$;
REVOKE ALL ON FUNCTION pawpal_private.customer_avatar_allowed(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
DO $$ DECLARE r record; expression text; src text;
BEGIN
 FOR r IN SELECT conname,pg_get_expr(conbin,conrelid) expression FROM pg_constraint
 WHERE conrelid='public.media_upload_session'::regclass AND conname IN ('media_upload_session_purpose_check','media_upload_session_check') LOOP
  IF position('customer_avatar' IN r.expression)>0 THEN CONTINUE;END IF;
  expression:='('||r.expression||') OR (purpose=''customer_avatar'' AND draft_id IS NOT NULL AND pet_id IS NULL AND product_id IS NULL AND appointment_id IS NULL AND variant_id IS NULL AND service_id IS NULL AND record_id IS NULL AND adjustment_id IS NULL)';
  EXECUTE format('ALTER TABLE public.media_upload_session DROP CONSTRAINT %I',r.conname);
  EXECUTE format('ALTER TABLE public.media_upload_session ADD CONSTRAINT %I CHECK(%s)',r.conname,expression);
 END LOOP;
 src:=pg_get_functiondef('public.prepare_customer_pet_media_upload(uuid,uuid,text,bigint,text,text)'::regprocedure);
 src:=replace(src,'prepare_customer_pet_media_upload','prepare_customer_avatar_upload');
 src:=replace(src,'customer_pet_media_allowed','customer_avatar_allowed');
 src:=replace(src,$s$p_kind NOT IN ('customer_pet_avatar','customer_pet_vaccine')$s$,$s$p_kind <> 'customer_avatar'$s$);
 EXECUTE src;
 src:=pg_get_functiondef('pawpal_private.media_session_manage(uuid,uuid,boolean)'::regprocedure);
 IF position('customer_avatar_allowed' IN src)=0 THEN
  EXECUTE replace(src,'IF NOT FOUND THEN RETURN false; END IF;',$s$IF NOT FOUND THEN RETURN false; END IF;
 IF s.purpose='customer_avatar' THEN RETURN coalesce(s.created_by=p_user AND pawpal_private.customer_avatar_allowed(p_user,s.draft_id),false);END IF;$s$);
 END IF;
 src:=pg_get_functiondef('public.claim_media_cleanup(integer)'::regprocedure);
 IF position('public.customer_profile WHERE avatar_media_asset_id=a.id' IN src)=0 THEN
  EXECUTE replace(src,'a.legal_hold OR','EXISTS(SELECT 1 FROM public.customer_profile WHERE avatar_media_asset_id=a.id) OR a.legal_hold OR');
 END IF;
END $$;
REVOKE ALL ON FUNCTION public.prepare_customer_avatar_upload(uuid,uuid,text,bigint,text,text) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.prepare_customer_avatar_upload(uuid,uuid,text,bigint,text,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.save_own_customer_avatar(p_asset uuid,p_expected uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cid uuid; current_asset uuid; a public.media_asset;s public.media_upload_session;
BEGIN
 cid:=(public.customer_profile_snapshot()->>'id')::uuid;
 IF NOT pawpal_private.customer_avatar_allowed(auth.uid(),cid) THEN RAISE EXCEPTION 'avatar_forbidden' USING ERRCODE='42501';END IF;
 PERFORM 1 FROM public.customer WHERE id=cid FOR UPDATE;
 SELECT avatar_media_asset_id INTO current_asset FROM public.customer_profile WHERE customer_id=cid FOR UPDATE;
 IF current_asset IS NOT DISTINCT FROM p_asset THEN RETURN cid;END IF;
 IF current_asset IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'avatar_changed' USING ERRCODE='PT409';END IF;
 IF p_asset IS NOT NULL THEN
  SELECT * INTO a FROM public.media_asset WHERE id=p_asset FOR UPDATE;
  SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id FOR UPDATE;
  IF a.id IS NULL OR a.status NOT IN ('verified','attached') OR s.state NOT IN ('verified','attached') OR s.purpose<>'customer_avatar'
   OR s.draft_id<>cid OR s.created_by<>auth.uid() THEN RAISE EXCEPTION 'avatar_forbidden' USING ERRCODE='42501';END IF;
  UPDATE public.media_asset SET status='attached' WHERE id=a.id;
  UPDATE public.media_upload_session SET state='attached' WHERE id=s.id;
 END IF;
 UPDATE public.customer_profile SET avatar_media_asset_id=p_asset WHERE customer_id=cid;
 IF NOT FOUND THEN RAISE EXCEPTION 'profile_missing' USING ERRCODE='P0002';END IF;
 RETURN cid;
END $$;
REVOKE ALL ON FUNCTION public.save_own_customer_avatar(uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.save_own_customer_avatar(uuid,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.own_customer_avatar() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cid uuid;
BEGIN
 cid:=(public.customer_profile_snapshot()->>'id')::uuid;
 RETURN jsonb_build_object('customer_id',cid,'asset_id',(SELECT avatar_media_asset_id FROM public.customer_profile WHERE customer_id=cid));
END $$;
REVOKE ALL ON FUNCTION public.own_customer_avatar() FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION public.own_customer_avatar() TO authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.guard_customer_avatar() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.media_upload_session;a public.media_asset;
BEGIN
 IF NEW.avatar_media_asset_id IS NOT DISTINCT FROM OLD.avatar_media_asset_id THEN RETURN NEW;END IF;
 IF NOT pawpal_private.customer_avatar_allowed(auth.uid(),NEW.customer_id) THEN RAISE EXCEPTION 'avatar_forbidden' USING ERRCODE='42501';END IF;
 IF NEW.avatar_media_asset_id IS NOT NULL THEN
  SELECT * INTO a FROM public.media_asset WHERE id=NEW.avatar_media_asset_id;
  SELECT * INTO s FROM public.media_upload_session WHERE id=a.session_id;
  IF a.id IS NULL OR a.status<>'attached' OR s.state<>'attached' OR s.purpose<>'customer_avatar' OR s.draft_id<>NEW.customer_id OR s.created_by<>auth.uid()
  THEN RAISE EXCEPTION 'avatar_forbidden' USING ERRCODE='42501';END IF;
 END IF;RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.guard_customer_avatar() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS guard_customer_avatar ON public.customer_profile;
CREATE TRIGGER guard_customer_avatar BEFORE UPDATE OF avatar_media_asset_id ON public.customer_profile FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_customer_avatar();
NOTIFY pgrst,'reload schema';
COMMIT;
