-- Atomic counter intake. Invoker rights preserve all existing table permissions/RLS.
BEGIN;
CREATE OR REPLACE FUNCTION public.create_customer_quick(
 p_full_name text, p_phone text, p_address text DEFAULT NULL, p_province text DEFAULT NULL,
 p_pet_name text DEFAULT NULL, p_breed_id uuid DEFAULT NULL, p_weight numeric DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE customer_key uuid := gen_random_uuid(); pet_key uuid; tier_key uuid; staff_key uuid;
 full_name text := btrim(regexp_replace(p_full_name,'\s+',' ','g'));
 phone text := btrim(p_phone); pet_name text := nullif(btrim(p_pet_name),'');
 address_text text := nullif(btrim(p_address),''); province_text text := nullif(btrim(p_province),'');
BEGIN
 IF NOT coalesce(pawpal_private.has_permission('customer.write'),false)
    OR NOT coalesce(pawpal_private.has_permission('customer_phone.read'),false)
    OR NOT coalesce(pawpal_private.has_permission('customer_profile.write'),false)
    OR NOT coalesce(pawpal_private.has_permission('customer_phone.write'),false)
    OR NOT coalesce(pawpal_private.has_permission('customer_membership.write'),false) THEN
  RAISE EXCEPTION 'customer_intake_forbidden' USING ERRCODE='42501';
 END IF;
 IF full_name IS NULL OR length(full_name) NOT BETWEEN 2 AND 200 OR phone IS NULL OR phone !~ '^0[0-9]{9}$' THEN
  RAISE EXCEPTION 'invalid_customer_details' USING ERRCODE='22023';
 END IF;
 IF (address_text IS NULL) <> (province_text IS NULL) THEN
  RAISE EXCEPTION 'address_requires_province' USING ERRCODE='22023';
 END IF;
 IF address_text IS NOT NULL AND NOT pawpal_private.has_permission('customer_address.write') THEN
  RAISE EXCEPTION 'address_write_forbidden' USING ERRCODE='42501';
 END IF;
 IF pet_name IS NULL AND (p_breed_id IS NOT NULL OR p_weight IS NOT NULL) THEN
  RAISE EXCEPTION 'pet_name_required' USING ERRCODE='22023';
 END IF;
 IF pet_name IS NOT NULL THEN
  IF length(pet_name)>200 OR p_breed_id IS NULL OR NOT EXISTS(
   SELECT 1 FROM public.pet_breed b JOIN public.pet_species s ON s.id=b.species_id
   WHERE b.id=p_breed_id AND b.is_active AND s.is_active
  ) THEN RAISE EXCEPTION 'valid_pet_breed_required' USING ERRCODE='22023'; END IF;
  IF NOT pawpal_private.has_permission('pet_profile.write') THEN
   RAISE EXCEPTION 'pet_write_forbidden' USING ERRCODE='42501'; END IF;
 END IF;
 IF p_weight IS NOT NULL AND (p_weight::text IN ('NaN','Infinity','-Infinity') OR p_weight<=0 OR p_weight>1000) THEN
  RAISE EXCEPTION 'invalid_pet_weight' USING ERRCODE='22023'; END IF;
 IF p_weight IS NOT NULL AND NOT pawpal_private.has_permission('pet_weight_history.write') THEN
  RAISE EXCEPTION 'weight_write_forbidden' USING ERRCODE='42501'; END IF;
 -- Serialize concurrent intake attempts for the same phone, including separate browsers.
 PERFORM pg_advisory_xact_lock(hashtextextended(phone,0));
 IF EXISTS(SELECT 1 FROM public.customer_phone WHERE phone_number=phone) THEN
  RAISE EXCEPTION 'customer_phone_exists' USING ERRCODE='23505'; END IF;
 SELECT id INTO tier_key FROM public.membership_tier WHERE is_active AND minimum_expenditure=0 ORDER BY id LIMIT 1;
 IF tier_key IS NULL THEN RAISE EXCEPTION 'initial_membership_tier_missing' USING ERRCODE='22023'; END IF;
 INSERT INTO public.customer(id,customer_code,customer_status,contact_email,note)
 VALUES(customer_key,'CUS-'||upper(replace(customer_key::text,'-','')),'active',NULL,'Khách tiếp nhận tại quầy.');
 INSERT INTO public.customer_profile(customer_id,full_name) VALUES(customer_key,full_name);
 INSERT INTO public.customer_phone(customer_id,phone_number,is_primary) VALUES(customer_key,phone,true);
 INSERT INTO public.customer_membership(customer_id,membership_tier_id) VALUES(customer_key,tier_key);
 IF address_text IS NOT NULL THEN
  INSERT INTO public.customer_address(customer_id,receiver_name,receiver_phone,province,street_address,is_default)
  VALUES(customer_key,full_name,phone,province_text,address_text,true);
 END IF;
 IF pet_name IS NOT NULL THEN
  pet_key := gen_random_uuid();
  INSERT INTO public.pet_profile(id,customer_id,pet_code,pet_name,breed_id,status)
  VALUES(pet_key,customer_key,'PET-'||upper(replace(pet_key::text,'-','')),pet_name,p_breed_id,'active');
  IF p_weight IS NOT NULL THEN
   SELECT id INTO staff_key FROM public.staff WHERE auth_user_id=auth.uid();
   INSERT INTO public.pet_weight_history(pet_id,weight,measured_at,recorded_by,note)
   VALUES(pet_key,p_weight,now(),staff_key,'Ghi nhận khi tiếp nhận tại quầy.');
  END IF;
 END IF;
 RETURN customer_key;
END $$;
REVOKE ALL ON FUNCTION public.create_customer_quick(text,text,text,text,text,uuid,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_customer_quick(text,text,text,text,text,uuid,numeric) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
