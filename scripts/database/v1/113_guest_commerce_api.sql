-- Service-only API foundation; no browser EXECUTE grants, no phone lookup/merge.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='12s';
CREATE FUNCTION public.guest_commerce_context(p_hash text,p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;c public.customer;result jsonb;page_value integer:=coalesce(p_page,1);
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR page_value NOT BETWEEN 1 AND 1000 THEN
  RAISE EXCEPTION 'invalid_guest_request' USING ERRCODE='22023';END IF;
 SELECT * INTO s FROM public.guest_session WHERE token_hash=p_hash;
 IF NOT FOUND THEN RETURN jsonb_build_object('initialized',false,'pets','[]'::jsonb,'page',page_value,'hasMore',false);END IF;
 SELECT * INTO c FROM public.customer WHERE id=s.customer_id;
 IF s.purpose<>'commerce' OR s.revoked_at IS NOT NULL OR s.expires_at<=now()
  OR c.id IS NULL OR c.auth_user_id IS NOT NULL OR c.customer_status<>'active' THEN
  RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 SELECT jsonb_build_object('initialized',true,
  'contact',jsonb_build_object('name',(SELECT full_name FROM public.customer_profile WHERE customer_id=c.id),'phone',c.unverified_contact_phone),
  'page',page_value,'pets',coalesce(jsonb_agg(p.item ORDER BY p.id),'[]'::jsonb),
  'hasMore',EXISTS(SELECT 1 FROM public.pet_profile WHERE customer_id=c.id AND status='active' ORDER BY id OFFSET page_value*10 LIMIT 1))
 INTO result FROM (
  SELECT id,jsonb_build_object('id',id,'name',pet_name,'breedId',breed_id,'gender',gender) item
  FROM public.pet_profile WHERE customer_id=c.id AND status='active' ORDER BY id LIMIT 10 OFFSET (page_value-1)*10
 ) p;
 RETURN result;
END $$;

CREATE FUNCTION public.guest_commerce_save_pet(p_hash text,p_expires timestamptz,p_request uuid,p_phone text,p_name text,p_pet jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;c public.customer;p public.pet_profile;owner_id uuid;breed uuid;
 pet_name_value text;gender_value text;allergy_value text;safety_value text;weight_value numeric;prior_weight numeric;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_request IS NULL OR p_expires IS NULL
  OR p_expires<=now() OR p_expires>now()+interval '7 days' OR p_phone IS NULL OR p_phone !~ '^0[0-9]{9}$'
  OR p_name IS NULL OR length(btrim(p_name)) NOT BETWEEN 1 AND 150
  OR jsonb_typeof(p_pet) IS DISTINCT FROM 'object' OR length(p_pet::text)>8000 THEN
  RAISE EXCEPTION 'invalid_guest_request' USING ERRCODE='22023';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_pet) k WHERE k NOT IN('name','breedId','gender','weight','allergy','safetyNote')) THEN
  RAISE EXCEPTION 'invalid_pet_fields' USING ERRCODE='22023';END IF;
 pet_name_value:=btrim(p_pet->>'name');breed:=(p_pet->>'breedId')::uuid;
 gender_value:=nullif(btrim(p_pet->>'gender'),'');allergy_value:=nullif(btrim(p_pet->>'allergy'),'');safety_value:=nullif(btrim(p_pet->>'safetyNote'),'');
 weight_value:=nullif(p_pet->>'weight','')::numeric;
 IF pet_name_value IS NULL OR length(pet_name_value) NOT BETWEEN 1 AND 100 OR breed IS NULL
  OR (gender_value IS NOT NULL AND gender_value NOT IN('nam','nu','chua_ro'))
  OR coalesce(length(allergy_value),0)>1000 OR coalesce(length(safety_value),0)>1000
  OR (weight_value IS NOT NULL AND (weight_value<=0 OR weight_value>200 OR weight_value::text IN('NaN','Infinity','-Infinity')))
  OR NOT EXISTS(SELECT 1 FROM public.pet_breed WHERE id=breed AND is_active) THEN
  RAISE EXCEPTION 'invalid_pet_details' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_hash,113));
 SELECT * INTO s FROM public.guest_session WHERE token_hash=p_hash;
 IF FOUND THEN
  -- Lock parent first, then recheck the session after possible account revocation.
  SELECT * INTO c FROM public.customer WHERE id=s.customer_id FOR UPDATE;
  SELECT * INTO s FROM public.guest_session WHERE token_hash=p_hash FOR UPDATE;
  IF s.purpose<>'commerce' OR s.revoked_at IS NOT NULL OR s.expires_at<=now()
   OR c.id IS NULL OR c.auth_user_id IS NOT NULL OR c.customer_status<>'active' THEN
   RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
  IF c.unverified_contact_phone IS DISTINCT FROM p_phone OR NOT EXISTS(
   SELECT 1 FROM public.customer_profile WHERE customer_id=c.id AND full_name=btrim(p_name)) THEN
   RAISE EXCEPTION 'guest_contact_changed' USING ERRCODE='PT409';END IF;
  owner_id:=c.id;
 ELSE
  owner_id:=gen_random_uuid();
  INSERT INTO public.customer(id,customer_code,unverified_contact_phone)
   VALUES(owner_id,'GUEST-'||replace(owner_id::text,'-',''),p_phone);
  INSERT INTO public.customer_profile(customer_id,full_name) VALUES(owner_id,btrim(p_name));
  INSERT INTO public.guest_session(token_hash,expires_at,purpose,customer_id) VALUES(p_hash,p_expires,'commerce',owner_id);
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,114));
 SELECT * INTO p FROM public.pet_profile WHERE id=p_request;
 IF FOUND THEN
  IF p.customer_id<>owner_id THEN RAISE EXCEPTION 'guest_pet_owner_required' USING ERRCODE='42501';END IF;
  SELECT weight INTO prior_weight FROM public.pet_weight_history WHERE pet_id=p.id AND note='guest-create:'||p_request ORDER BY measured_at,id LIMIT 1;
  IF p.pet_name IS DISTINCT FROM pet_name_value OR p.breed_id IS DISTINCT FROM breed OR p.gender IS DISTINCT FROM gender_value
   OR p.allergy IS DISTINCT FROM allergy_value OR p.safety_note IS DISTINCT FROM safety_value OR p.status<>'active'
   OR prior_weight IS DISTINCT FROM weight_value THEN
   RAISE EXCEPTION 'guest_pet_request_conflict' USING ERRCODE='PT409';END IF;
  RETURN jsonb_build_object('petId',p.id,'created',false);
 END IF;
 INSERT INTO public.pet_profile(id,customer_id,pet_code,pet_name,breed_id,gender,allergy,safety_note)
  VALUES(p_request,owner_id,'GUEST-PET-'||replace(p_request::text,'-',''),pet_name_value,breed,gender_value,allergy_value,safety_value);
 IF weight_value IS NOT NULL THEN
  INSERT INTO public.pet_weight_history(pet_id,weight,note) VALUES(p_request,weight_value,'guest-create:'||p_request);
 END IF;
 RETURN jsonb_build_object('petId',p_request,'created',true);
END $$;

CREATE FUNCTION public.guest_commerce_end(p_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'invalid_guest_request' USING ERRCODE='22023';END IF;
 SELECT customer_id INTO owner_id FROM public.guest_session WHERE token_hash=p_hash AND purpose='commerce';
 IF owner_id IS NOT NULL THEN
  PERFORM 1 FROM public.customer WHERE id=owner_id FOR UPDATE;
  UPDATE public.guest_session SET revoked_at=now() WHERE token_hash=p_hash AND purpose='commerce' AND revoked_at IS NULL;
 END IF;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.guest_commerce_context(text,integer),public.guest_commerce_save_pet(text,timestamptz,uuid,text,text,jsonb),public.guest_commerce_end(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guest_commerce_context(text,integer),public.guest_commerce_save_pet(text,timestamptz,uuid,text,text,jsonb),public.guest_commerce_end(text) TO service_role;
COMMIT;
