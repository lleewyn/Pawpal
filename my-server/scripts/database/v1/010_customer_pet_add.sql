BEGIN;
CREATE OR REPLACE FUNCTION public.add_customer_pet(p_customer_id uuid,p_pet_id uuid,p_name text,p_breed_id uuid,p_weight numeric,p_safety_note text,p_allergy text,p_routine text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE existing public.pet_profile; actor uuid;
 name_value text:=btrim(p_name); safety_value text:=nullif(btrim(p_safety_note),''); allergy_value text:=nullif(btrim(p_allergy),'');routine_value text:=nullif(btrim(p_routine),'');
BEGIN
 IF NOT pawpal_private.has_permission('pet_profile.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'pet_write_forbidden' USING ERRCODE='42501'; END IF;
 IF p_pet_id IS NULL OR name_value IS NULL OR length(name_value) NOT BETWEEN 1 AND 200
 OR length(safety_value)>2000 OR length(allergy_value)>2000 OR length(routine_value)>2000
 OR NOT EXISTS(SELECT 1 FROM public.pet_breed b JOIN public.pet_species s ON s.id=b.species_id WHERE b.id=p_breed_id AND b.is_active AND s.is_active)
 OR (p_weight IS NOT NULL AND (p_weight::text IN ('NaN','Infinity','-Infinity') OR p_weight<=0 OR p_weight>1000)) THEN RAISE EXCEPTION 'invalid_pet_details' USING ERRCODE='22023'; END IF;
 IF p_weight IS NOT NULL AND NOT pawpal_private.has_permission('pet_weight_history.write') THEN RAISE EXCEPTION 'pet_weight_forbidden' USING ERRCODE='42501'; END IF;
 PERFORM 1 FROM public.customer WHERE id=p_customer_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'customer_not_found' USING ERRCODE='P0002'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_pet_id::text,19));
 SELECT * INTO existing FROM public.pet_profile WHERE id=p_pet_id;
 IF FOUND THEN
  IF (existing.customer_id,existing.pet_name,existing.breed_id,existing.safety_note,existing.allergy,existing.routine)
   IS DISTINCT FROM (p_customer_id,name_value,p_breed_id,safety_value,allergy_value,routine_value)
   OR p_weight IS DISTINCT FROM (SELECT weight FROM public.pet_weight_history WHERE pet_id=p_pet_id AND note='Ghi nhận khi thêm bé cưng.' ORDER BY created_at,id LIMIT 1)
   THEN RAISE EXCEPTION 'pet_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_pet_id;
 END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 INSERT INTO public.pet_profile(id,customer_id,pet_code,pet_name,breed_id,safety_note,allergy,routine,status)
 VALUES(p_pet_id,p_customer_id,'PET-'||upper(replace(p_pet_id::text,'-','')),name_value,p_breed_id,safety_value,allergy_value,routine_value,'active');
 IF p_weight IS NOT NULL THEN
  INSERT INTO public.pet_weight_history(pet_id,weight,measured_at,recorded_by,note) VALUES(p_pet_id,p_weight,now(),actor,'Ghi nhận khi thêm bé cưng.');
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'CREATE','pet_profile',p_pet_id,'Thêm bé cưng vào hồ sơ khách hàng.');
 RETURN p_pet_id;
END $$;
REVOKE ALL ON FUNCTION public.add_customer_pet(uuid,uuid,text,uuid,numeric,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.add_customer_pet(uuid,uuid,text,uuid,numeric,text,text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
