BEGIN;
CREATE OR REPLACE FUNCTION public.update_customer_pet(p_customer_id uuid,p_pet_id uuid,p_expected_updated_at timestamptz,p_name text,p_breed_id uuid,p_weight numeric,p_safety_note text,p_allergy text,p_routine text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE pet public.pet_profile; actor uuid; old_weight numeric; name_value text:=btrim(p_name);
BEGIN
 IF NOT pawpal_private.has_permission('pet_profile.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'pet_write_forbidden' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.customer WHERE id=p_customer_id FOR UPDATE;
 SELECT * INTO pet FROM public.pet_profile WHERE id=p_pet_id AND customer_id=p_customer_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'pet_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected_updated_at IS NULL OR pet.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'pet_profile_changed' USING ERRCODE='PT409'; END IF;
 IF name_value IS NULL OR length(name_value) NOT BETWEEN 1 AND 200 OR length(p_safety_note)>2000 OR length(p_allergy)>2000 OR length(p_routine)>2000
 OR (p_weight IS NOT NULL AND (p_weight::text IN ('NaN','Infinity','-Infinity') OR p_weight<=0 OR p_weight>1000)) THEN RAISE EXCEPTION 'invalid_pet_details' USING ERRCODE='22023'; END IF;
 IF p_breed_id IS NULL OR (p_breed_id<>pet.breed_id AND NOT EXISTS(SELECT 1 FROM public.pet_breed b JOIN public.pet_species s ON s.id=b.species_id WHERE b.id=p_breed_id AND b.is_active AND s.is_active)) THEN RAISE EXCEPTION 'invalid_pet_breed' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 UPDATE public.pet_profile SET pet_name=name_value,breed_id=p_breed_id,safety_note=nullif(btrim(p_safety_note),''),allergy=nullif(btrim(p_allergy),''),routine=nullif(btrim(p_routine),'') WHERE id=pet.id;
 IF p_weight IS NOT NULL THEN
  IF NOT pawpal_private.has_permission('pet_weight_history.write') THEN RAISE EXCEPTION 'pet_weight_forbidden' USING ERRCODE='42501'; END IF;
  SELECT weight INTO old_weight FROM public.pet_current_weight WHERE pet_id=pet.id;
  IF old_weight IS DISTINCT FROM p_weight THEN
   INSERT INTO public.pet_weight_history(pet_id,weight,measured_at,recorded_by,note) VALUES(pet.id,p_weight,now(),actor,'Ghi nhận khi cập nhật hồ sơ bé cưng.');
  END IF;
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'UPDATE','pet_profile',pet.id,'Cập nhật bé cưng trong hồ sơ khách hàng.');
 RETURN pet.id;
END $$;
CREATE OR REPLACE FUNCTION public.remove_customer_pet(p_customer_id uuid,p_pet_id uuid,p_expected_updated_at timestamptz,p_restore boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE pet public.pet_profile; actor uuid; result text;
BEGIN
 IF NOT pawpal_private.has_permission('pet_profile.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'pet_write_forbidden' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.customer WHERE id=p_customer_id FOR UPDATE;
 SELECT * INTO pet FROM public.pet_profile WHERE id=p_pet_id AND customer_id=p_customer_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'pet_not_found' USING ERRCODE='P0002'; END IF;
 IF p_expected_updated_at IS NULL OR pet.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'pet_profile_changed' USING ERRCODE='PT409'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF p_restore THEN UPDATE public.pet_profile SET status='active' WHERE id=pet.id; result:='restored';
 ELSE
  BEGIN DELETE FROM public.pet_profile WHERE id=pet.id; result:='deleted';
  EXCEPTION WHEN foreign_key_violation THEN UPDATE public.pet_profile SET status='inactive' WHERE id=pet.id; result:='archived'; END;
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'UPDATE','pet_profile',pet.id,'Thao tác hồ sơ bé cưng: '||result);
 RETURN jsonb_build_object('id',pet.id,'result',result);
END $$;
REVOKE ALL ON FUNCTION public.update_customer_pet(uuid,uuid,timestamptz,text,uuid,numeric,text,text,text),public.remove_customer_pet(uuid,uuid,timestamptz,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_customer_pet(uuid,uuid,timestamptz,text,uuid,numeric,text,text,text),public.remove_customer_pet(uuid,uuid,timestamptz,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
