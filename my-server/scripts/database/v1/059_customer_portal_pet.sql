BEGIN;
CREATE OR REPLACE FUNCTION public.save_own_pet(p_id uuid,p_expected timestamptz,p_values jsonb,p_weight numeric)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; existing public.pet_profile; breed uuid; last_weight numeric; born date;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND customer_status='active' FOR UPDATE;
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
  RAISE EXCEPTION 'Phiên khách hàng không hợp lệ' USING ERRCODE='42501'; END IF;
 IF p_id IS NULL OR jsonb_typeof(p_values) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Hồ sơ không hợp lệ'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,59));
 SELECT * INTO existing FROM public.pet_profile WHERE id=p_id FOR UPDATE;
 IF FOUND THEN
  IF existing.customer_id<>owner_id THEN RAISE EXCEPTION 'Hồ sơ không thuộc chủ nuôi' USING ERRCODE='42501'; END IF;
  IF existing.updated_at IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'Hồ sơ đã thay đổi. Vui lòng tải lại trước khi lưu' USING ERRCODE='PT409'; END IF;
 ELSIF p_expected IS NOT NULL THEN RAISE EXCEPTION 'Hồ sơ không còn tồn tại' USING ERRCODE='PT409'; END IF;
 breed:=(p_values->>'breed_id')::uuid; born:=nullif(p_values->>'date_of_birth','')::date;
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
 SELECT weight INTO last_weight FROM public.pet_weight_history WHERE pet_id=p_id ORDER BY measured_at DESC,created_at DESC,id DESC LIMIT 1;
 IF p_weight IS NOT NULL AND last_weight IS DISTINCT FROM p_weight THEN
  INSERT INTO public.pet_weight_history(pet_id,weight,measured_at,note) VALUES(p_id,p_weight,now(),'Chủ nuôi cập nhật hồ sơ');
 END IF;
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.save_own_pet(uuid,timestamptz,jsonb,numeric) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_own_pet(uuid,timestamptz,jsonb,numeric) TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
