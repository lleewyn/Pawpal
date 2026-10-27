BEGIN;
CREATE OR REPLACE FUNCTION public.guest_profile_update(p_hash text,p_new_hash text,p_request uuid,p_revision text,p_contact jsonb DEFAULT NULL,p_pet jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;previous pawpal_private.guest_profile_edit;current_value jsonb;payload jsonb;result jsonb;
 pet_id uuid;weight numeric;rotated boolean:=false;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_new_hash IS NULL OR p_new_hash !~ '^[a-f0-9]{64}$'
  OR p_request IS NULL OR p_revision IS NULL OR p_revision !~ '^[a-f0-9]{32}$'
  OR (p_contact IS NULL)=(p_pet IS NULL) THEN RAISE EXCEPTION 'invalid_body' USING ERRCODE='22023';END IF;
 payload:=jsonb_build_object('revision',p_revision,'contact',p_contact,'pet',p_pet,'newHash',p_new_hash);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,120));
 SELECT * INTO previous FROM pawpal_private.guest_profile_edit WHERE request_id=p_request;
 IF FOUND THEN
  IF previous.source_hash<>p_hash OR previous.payload<>payload THEN RAISE EXCEPTION 'guest_edit_conflict' USING ERRCODE='PT409';END IF;
  PERFORM pawpal_private.require_guest_booking_session(CASE WHEN (previous.result->>'rotated')::boolean THEN p_new_hash ELSE p_hash END);
  RETURN previous.result;
 END IF;
 s:=pawpal_private.require_guest_booking_session(p_hash);
 IF p_contact IS NOT NULL THEN
  IF jsonb_typeof(p_contact) IS DISTINCT FROM 'object' OR length(p_contact::text)>1000
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_contact) k WHERE k NOT IN('name','phone'))
   OR jsonb_typeof(p_contact->'name') IS DISTINCT FROM 'string' OR length(btrim(p_contact->>'name')) NOT BETWEEN 1 AND 150
   OR jsonb_typeof(p_contact->'phone') IS DISTINCT FROM 'string' OR (p_contact->>'phone') !~ '^0[0-9]{9}$' THEN
   RAISE EXCEPTION 'invalid_body' USING ERRCODE='22023';END IF;
  current_value:=public.guest_profile_read(p_hash,NULL);
  IF current_value->'contact'->>'revision'<>p_revision THEN RAISE EXCEPTION 'guest_edit_conflict' USING ERRCODE='PT409';END IF;
  rotated:=current_value->'contact'->>'phone' IS DISTINCT FROM p_contact->>'phone';
  UPDATE public.customer_profile SET full_name=btrim(p_contact->>'name') WHERE customer_id=s.customer_id;
  IF rotated THEN
   IF p_new_hash=p_hash THEN RAISE EXCEPTION 'invalid_body' USING ERRCODE='22023';END IF;
   UPDATE public.customer SET unverified_contact_phone=p_contact->>'phone' WHERE id=s.customer_id;
   -- Existing trigger revokes every old commerce session. Never un-revoke one.
   INSERT INTO public.guest_session(token_hash,purpose,customer_id,expires_at) VALUES(p_new_hash,'commerce',s.customer_id,s.expires_at);
  END IF;
 ELSE
  IF jsonb_typeof(p_pet) IS DISTINCT FROM 'object' OR length(p_pet::text)>8000
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_pet) k WHERE k NOT IN('id','name','breedId','gender','weight','allergy','safetyNote'))
   OR jsonb_typeof(p_pet->'name') IS DISTINCT FROM 'string' OR length(btrim(p_pet->>'name')) NOT BETWEEN 1 AND 100
   OR (p_pet->>'gender') IS NULL OR p_pet->>'gender' NOT IN('nam','nu','chua_ro')
   OR coalesce(length(p_pet->>'allergy'),0)>1000 OR coalesce(length(p_pet->>'safetyNote'),0)>1000
   OR jsonb_typeof(p_pet->'weight') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'invalid_body' USING ERRCODE='22023';END IF;
  pet_id:=(p_pet->>'id')::uuid;weight:=(p_pet->>'weight')::numeric;
  IF pet_id IS NULL OR weight<=0 OR weight>200 OR weight::text IN('NaN','Infinity','-Infinity')
   OR NOT EXISTS(SELECT 1 FROM public.pet_breed b JOIN public.pet_species sp ON sp.id=b.species_id WHERE b.id=(p_pet->>'breedId')::uuid AND b.is_active AND sp.is_active)
   THEN RAISE EXCEPTION 'invalid_body' USING ERRCODE='22023';END IF;
  current_value:=public.guest_profile_read(p_hash,pet_id);
  IF current_value->'pet'->>'revision'<>p_revision THEN RAISE EXCEPTION 'guest_edit_conflict' USING ERRCODE='PT409';END IF;
  UPDATE public.pet_profile SET pet_name=btrim(p_pet->>'name'),breed_id=(p_pet->>'breedId')::uuid,gender=p_pet->>'gender',
   allergy=nullif(btrim(p_pet->>'allergy'),''),safety_note=nullif(btrim(p_pet->>'safetyNote'),'') WHERE id=pet_id AND customer_id=s.customer_id;
  IF (current_value->'pet'->>'weight')::numeric IS DISTINCT FROM weight THEN
   INSERT INTO public.pet_weight_history(pet_id,weight,note) VALUES(pet_id,weight,'guest-edit:'||p_request);
  END IF;
 END IF;
 result:=jsonb_build_object('rotated',rotated,'requestId',p_request);
 INSERT INTO pawpal_private.guest_profile_edit(request_id,source_hash,payload,result) VALUES(p_request,p_hash,payload,result);
 RETURN result;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
