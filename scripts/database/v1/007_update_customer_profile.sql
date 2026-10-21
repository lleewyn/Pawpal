BEGIN;
CREATE OR REPLACE FUNCTION public.update_customer_profile(
 p_customer_id uuid, p_expected_updated_at timestamptz, p_full_name text, p_phone text,
 p_email text, p_gender text, p_date_of_birth date, p_tier_id uuid, p_addresses jsonb DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE current_customer public.customer; primary_phone public.customer_phone; entry jsonb;
 required_code text; name_value text := btrim(regexp_replace(p_full_name,'\s+',' ','g'));
 phone_value text := nullif(btrim(p_phone),''); email_value text := nullif(btrim(p_email),'');
 address_ids uuid[] := '{}'; address_id uuid; actor_id uuid;
BEGIN
 FOREACH required_code IN ARRAY ARRAY['customer.read','customer.write','customer_profile.write',
 'customer_phone.read','customer_phone.write','customer_membership.write','audit_log.write'] LOOP
  IF NOT pawpal_private.has_permission(required_code) THEN
   RAISE EXCEPTION 'customer_profile_forbidden' USING ERRCODE='42501'; END IF;
 END LOOP;
 IF phone_value IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended(phone_value,0)); END IF;
 SELECT * INTO current_customer FROM public.customer WHERE id=p_customer_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'customer_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected_updated_at IS NULL OR current_customer.updated_at<>p_expected_updated_at THEN
  RAISE EXCEPTION 'customer_profile_changed' USING ERRCODE='PT409'; END IF;
 SELECT * INTO primary_phone FROM public.customer_phone WHERE customer_id=p_customer_id AND is_primary;
 IF name_value IS NULL OR length(name_value) NOT BETWEEN 2 AND 200
 OR (email_value IS NOT NULL AND (length(email_value)>254 OR email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'))
 OR (p_gender IS NOT NULL AND p_gender NOT IN ('MALE','FEMALE','OTHER'))
 OR p_date_of_birth>(now() AT TIME ZONE 'Asia/Bangkok')::date THEN
  RAISE EXCEPTION 'invalid_customer_details' USING ERRCODE='22023'; END IF;
 IF primary_phone.id IS NOT NULL AND phone_value IS NULL THEN
  RAISE EXCEPTION 'primary_phone_required' USING ERRCODE='22023'; END IF;
 IF phone_value IS DISTINCT FROM primary_phone.phone_number THEN
  IF phone_value IS NOT NULL AND phone_value !~ '^0[0-9]{9}$' THEN
   RAISE EXCEPTION 'invalid_customer_phone' USING ERRCODE='22023'; END IF;
  IF EXISTS(SELECT 1 FROM public.customer_phone WHERE customer_id<>p_customer_id AND phone_number=phone_value) THEN
   RAISE EXCEPTION 'customer_phone_exists' USING ERRCODE='23505'; END IF;
 END IF;
 IF p_tier_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.membership_tier WHERE id=p_tier_id AND is_active)
 AND NOT EXISTS(SELECT 1 FROM public.customer_membership WHERE customer_id=p_customer_id AND membership_tier_id=p_tier_id) THEN
  RAISE EXCEPTION 'invalid_membership_tier' USING ERRCODE='22023'; END IF;
 UPDATE public.customer SET contact_email=email_value WHERE id=p_customer_id;
 INSERT INTO public.customer_profile(customer_id,full_name,gender,date_of_birth)
 VALUES(p_customer_id,name_value,p_gender,p_date_of_birth)
 ON CONFLICT(customer_id) DO UPDATE SET full_name=EXCLUDED.full_name,gender=EXCLUDED.gender,date_of_birth=EXCLUDED.date_of_birth;
 IF phone_value IS DISTINCT FROM primary_phone.phone_number THEN
  IF primary_phone.id IS NOT NULL THEN
   UPDATE public.customer_phone SET phone_number=phone_value,verified_at=NULL WHERE id=primary_phone.id;
  ELSIF phone_value IS NOT NULL THEN
   INSERT INTO public.customer_phone(customer_id,phone_number,is_primary) VALUES(p_customer_id,phone_value,true);
  END IF;
 END IF;
 IF p_tier_id IS NULL THEN DELETE FROM public.customer_membership WHERE customer_id=p_customer_id;
 ELSE
  INSERT INTO public.customer_membership(customer_id,membership_tier_id) VALUES(p_customer_id,p_tier_id)
  ON CONFLICT(customer_id) DO UPDATE SET membership_tier_id=EXCLUDED.membership_tier_id,
   assigned_at=CASE WHEN customer_membership.membership_tier_id<>EXCLUDED.membership_tier_id THEN now() ELSE customer_membership.assigned_at END;
 END IF;
 IF p_addresses IS NOT NULL THEN
  IF NOT pawpal_private.has_permission('customer_address.write') OR NOT pawpal_private.has_permission('customer_address.read') THEN
   RAISE EXCEPTION 'address_write_forbidden' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_addresses)<>'array' OR jsonb_array_length(p_addresses)>50 THEN
   RAISE EXCEPTION 'invalid_customer_addresses' USING ERRCODE='22023'; END IF;
  IF jsonb_array_length(p_addresses)>0 AND (SELECT count(*) FROM jsonb_array_elements(p_addresses) a WHERE a->>'is_default'='true')<>1 THEN
   RAISE EXCEPTION 'one_default_address_required' USING ERRCODE='22023'; END IF;
  -- Clear defaults before switching them; deferred guards check the final state.
  UPDATE public.customer_address SET is_default=false WHERE customer_id=p_customer_id AND is_default;
  FOR entry IN SELECT value FROM jsonb_array_elements(p_addresses) LOOP
   IF nullif(btrim(entry->>'receiver_name'),'') IS NULL OR nullif(btrim(entry->>'receiver_phone'),'') IS NULL
    OR nullif(btrim(entry->>'street_address'),'') IS NULL OR nullif(btrim(entry->>'province'),'') IS NULL THEN
    RAISE EXCEPTION 'incomplete_customer_address' USING ERRCODE='22023'; END IF;
   address_id:=nullif(entry->>'id','')::uuid;
   IF address_id=ANY(address_ids) THEN RAISE EXCEPTION 'duplicate_address_id' USING ERRCODE='22023'; END IF;
   IF address_id IS NOT NULL THEN
    IF NOT EXISTS(SELECT 1 FROM public.customer_address WHERE id=address_id AND customer_id=p_customer_id) THEN
     RAISE EXCEPTION 'address_owner_mismatch' USING ERRCODE='42501'; END IF;
    UPDATE public.customer_address SET receiver_name=btrim(entry->>'receiver_name'),receiver_phone=btrim(entry->>'receiver_phone'),
      street_address=btrim(entry->>'street_address'),province=btrim(entry->>'province'),postal_code=nullif(btrim(entry->>'postal_code'),''),
      is_default=coalesce((entry->>'is_default')::boolean,false) WHERE id=address_id;
   ELSE
    INSERT INTO public.customer_address(customer_id,receiver_name,receiver_phone,street_address,province,postal_code,is_default)
    VALUES(p_customer_id,btrim(entry->>'receiver_name'),btrim(entry->>'receiver_phone'),btrim(entry->>'street_address'),
     btrim(entry->>'province'),nullif(btrim(entry->>'postal_code'),''),coalesce((entry->>'is_default')::boolean,false)) RETURNING id INTO address_id;
   END IF;
   address_ids:=array_append(address_ids,address_id);
  END LOOP;
  DELETE FROM public.customer_address WHERE customer_id=p_customer_id AND NOT(id=ANY(address_ids));
 END IF;
 SELECT id INTO actor_id FROM public.staff WHERE auth_user_id=auth.uid();
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor_id,'UPDATE','customer_profile',p_customer_id,'Cập nhật hồ sơ, liên hệ, hạng và sổ địa chỉ khách hàng.');
 RETURN p_customer_id;
END $$;
REVOKE ALL ON FUNCTION public.update_customer_profile(uuid,timestamptz,text,text,text,text,date,uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_customer_profile(uuid,timestamptz,text,text,text,text,date,uuid,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
