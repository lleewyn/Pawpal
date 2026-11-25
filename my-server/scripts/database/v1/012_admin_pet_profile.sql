BEGIN;
CREATE OR REPLACE FUNCTION public.save_admin_pet(p_pet_id uuid,p_expected_updated_at timestamptz,p_details jsonb,p_weight numeric DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE pet public.pet_profile; target_customer uuid:=(p_details->>'customer_id')::uuid;
 breed uuid:=(p_details->>'breed_id')::uuid; actor uuid; prior_owner uuid;
 name_value text:=btrim(p_details->>'pet_name'); gender_value text:=p_details->>'gender';
 birth date:=nullif(p_details->>'date_of_birth','')::date; status_value text:=coalesce(p_details->>'status','active');
BEGIN
 IF NOT pawpal_private.has_permission('pet_profile.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'pet_write_forbidden' USING ERRCODE='42501'; END IF;
 IF p_pet_id IS NULL OR target_customer IS NULL OR breed IS NULL OR name_value IS NULL OR length(name_value) NOT BETWEEN 1 AND 200
 OR coalesce(gender_value,'') NOT IN ('male','female','unknown') OR status_value NOT IN ('active','archived') OR birth>CURRENT_DATE
 OR length(p_details->>'color')>200 OR length(p_details->>'safety_note')>2000 OR length(p_details->>'allergy')>2000 OR length(p_details->>'routine')>2000
 OR (p_weight IS NOT NULL AND (p_weight::text IN ('NaN','Infinity','-Infinity') OR p_weight<=0 OR p_weight>1000))
 THEN RAISE EXCEPTION 'invalid_pet_details' USING ERRCODE='22023'; END IF;
 SELECT customer_id INTO prior_owner FROM public.pet_profile WHERE id=p_pet_id;
 PERFORM 1 FROM public.customer WHERE id IN (target_customer,prior_owner) ORDER BY id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.customer WHERE id=target_customer) THEN RAISE EXCEPTION 'customer_not_found' USING ERRCODE='P0002'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_pet_id::text,19));
 SELECT * INTO pet FROM public.pet_profile WHERE id=p_pet_id FOR UPDATE;
 IF FOUND THEN
  IF p_expected_updated_at IS NULL OR p_expected_updated_at<>pet.updated_at OR pet.customer_id IS DISTINCT FROM prior_owner THEN RAISE EXCEPTION 'pet_profile_changed' USING ERRCODE='PT409'; END IF;
 ELSIF p_expected_updated_at IS NOT NULL THEN RAISE EXCEPTION 'pet_not_found' USING ERRCODE='P0002'; END IF;
 IF breed IS DISTINCT FROM pet.breed_id AND NOT EXISTS(SELECT 1 FROM public.pet_breed b JOIN public.pet_species s ON s.id=b.species_id WHERE b.id=breed AND b.is_active AND s.is_active) THEN RAISE EXCEPTION 'invalid_pet_breed' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM public.pet_profile WHERE customer_id=target_customer AND lower(btrim(pet_name))=lower(name_value) AND id<>p_pet_id AND status='active') THEN RAISE EXCEPTION 'duplicate_pet_name' USING ERRCODE='PT409'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF pet.id IS NULL THEN
  INSERT INTO public.pet_profile(id,customer_id,pet_code,pet_name,breed_id,gender,date_of_birth,color,safety_note,allergy,routine,status)
  VALUES(p_pet_id,target_customer,'PET-'||upper(replace(p_pet_id::text,'-','')),name_value,breed,gender_value,birth,nullif(btrim(p_details->>'color'),''),nullif(btrim(p_details->>'safety_note'),''),nullif(btrim(p_details->>'allergy'),''),nullif(btrim(p_details->>'routine'),''),status_value);
 ELSE
  UPDATE public.pet_profile SET customer_id=target_customer,pet_name=name_value,breed_id=breed,gender=gender_value,date_of_birth=birth,color=nullif(btrim(p_details->>'color'),''),safety_note=nullif(btrim(p_details->>'safety_note'),''),allergy=nullif(btrim(p_details->>'allergy'),''),routine=nullif(btrim(p_details->>'routine'),''),status=status_value WHERE id=p_pet_id;
 END IF;
 IF p_weight IS NOT NULL AND p_weight IS DISTINCT FROM (SELECT weight FROM public.pet_current_weight WHERE pet_id=p_pet_id) THEN
  IF NOT pawpal_private.has_permission('pet_weight_history.write') THEN RAISE EXCEPTION 'pet_weight_forbidden' USING ERRCODE='42501'; END IF;
  INSERT INTO public.pet_weight_history(pet_id,weight,measured_at,recorded_by,note) VALUES(p_pet_id,p_weight,now(),actor,'Ghi nhận khi lưu hồ sơ thú cưng.');
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,CASE WHEN pet.id IS NULL THEN 'INSERT' ELSE 'UPDATE' END,'pet_profile',p_pet_id,'Lưu hồ sơ thú cưng; cân nặng ghi cùng giao dịch.');
 RETURN p_pet_id;
END $$;

CREATE OR REPLACE FUNCTION public.record_admin_pet_weight(p_pet_id uuid,p_expected_updated_at timestamptz,p_measurement_id uuid,p_weight numeric,p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE pet public.pet_profile; actor uuid; owner_id uuid; prior public.pet_weight_history;
BEGIN
 IF NOT pawpal_private.has_permission('pet_profile.write') OR NOT pawpal_private.has_permission('pet_weight_history.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'pet_weight_forbidden' USING ERRCODE='42501'; END IF;
 IF p_measurement_id IS NULL OR p_weight IS NULL OR p_weight::text IN ('NaN','Infinity','-Infinity') OR p_weight<=0 OR p_weight>1000 OR length(p_note)>2000 THEN RAISE EXCEPTION 'invalid_pet_weight' USING ERRCODE='22023'; END IF;
 SELECT customer_id INTO owner_id FROM public.pet_profile WHERE id=p_pet_id;
 PERFORM 1 FROM public.customer WHERE id=owner_id FOR UPDATE;
 SELECT * INTO pet FROM public.pet_profile WHERE id=p_pet_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'pet_not_found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO prior FROM public.pet_weight_history WHERE id=p_measurement_id;
 IF FOUND THEN
  IF prior.pet_id<>p_pet_id OR prior.weight<>p_weight OR prior.note IS DISTINCT FROM nullif(btrim(p_note),'') THEN RAISE EXCEPTION 'weight_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN prior.id;
 END IF;
 IF p_expected_updated_at IS NULL OR p_expected_updated_at<>pet.updated_at THEN RAISE EXCEPTION 'pet_profile_changed' USING ERRCODE='PT409'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 INSERT INTO public.pet_weight_history(id,pet_id,weight,measured_at,recorded_by,note) VALUES(p_measurement_id,p_pet_id,p_weight,now(),actor,nullif(btrim(p_note),''));
 UPDATE public.pet_profile SET updated_at=now() WHERE id=p_pet_id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'INSERT','pet_weight_history',p_measurement_id,'Ghi nhận cân nặng từ phân hệ thú cưng.');
 RETURN p_measurement_id;
END $$;
REVOKE ALL ON FUNCTION public.save_admin_pet(uuid,timestamptz,jsonb,numeric),public.record_admin_pet_weight(uuid,timestamptz,uuid,numeric,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_admin_pet(uuid,timestamptz,jsonb,numeric),public.record_admin_pet_weight(uuid,timestamptz,uuid,numeric,text) TO authenticated;
NOTIFY pgrst,'reload schema';
CREATE OR REPLACE FUNCTION public.record_pet_contact(p_pet_id uuid,p_appointment_id uuid,p_type text,p_channel text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; result uuid;
BEGIN
 IF NOT pawpal_private.has_permission('audit_log.write') OR NOT pawpal_private.has_permission('pet_profile.read') THEN RAISE EXCEPTION 'pet_contact_forbidden' USING ERRCODE='42501'; END IF;
 IF p_type NOT IN ('BATH','GROOM','HOTEL') OR p_channel NOT IN ('ZALO','PHONE') OR NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=p_appointment_id AND pet_id=p_pet_id AND appointment_status='completed') THEN RAISE EXCEPTION 'invalid_pet_contact' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'PET_CONTACT','pet_profile',p_pet_id,jsonb_build_object('appointment_id',p_appointment_id,'type',p_type,'channel',p_channel)::text) RETURNING id INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.record_pet_contact(uuid,uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.record_pet_contact(uuid,uuid,text,text) TO authenticated;
COMMIT;
