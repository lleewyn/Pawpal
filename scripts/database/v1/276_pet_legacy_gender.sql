BEGIN;
-- Keep older clients and legacy pet gender values compatible with the current form.
DO $$
DECLARE body text:=pg_get_functiondef('public.save_admin_pet(uuid,timestamptz,jsonb,numeric)'::regprocedure);
 needle text:=' IF p_pet_id IS NULL OR target_customer IS NULL OR breed IS NULL';
 addition text:=$new$
 -- Normalize legacy gender after authorization; an old blank select preserves the saved value.
 IF nullif(btrim(gender_value),'') IS NULL THEN
  SELECT p.gender INTO gender_value FROM public.pet_profile p WHERE p.id=p_pet_id;
 END IF;
 gender_value:=CASE lower(btrim(gender_value))
  WHEN 'nam' THEN 'male' WHEN 'đực' THEN 'male' WHEN 'male' THEN 'male'
  WHEN 'nu' THEN 'female' WHEN 'nữ' THEN 'female' WHEN 'cái' THEN 'female' WHEN 'female' THEN 'female'
  WHEN 'chưa rõ' THEN 'unknown' WHEN 'unknown' THEN 'unknown' ELSE gender_value END;
$new$;
BEGIN
 IF strpos(body,'Normalize legacy gender after authorization')>0 THEN RETURN; END IF;
 IF strpos(body,needle)=0 OR strpos(body,'work_guard_rpc')=0 THEN RAISE EXCEPTION 'unexpected_pet_gender_definition'; END IF;
 EXECUTE replace(body,needle,addition||needle);
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
