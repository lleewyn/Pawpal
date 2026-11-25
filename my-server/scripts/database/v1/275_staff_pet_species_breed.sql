BEGIN;
CREATE OR REPLACE FUNCTION public.get_staff_pet_species()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF pawpal_private.work_actor() IS NULL OR (NOT pawpal_private.work_is_admin() AND NOT pawpal_private.has_permission('work.pet.write')) THEN
  RAISE EXCEPTION 'pet_write_forbidden' USING ERRCODE='42501';
 END IF;
 RETURN (SELECT coalesce(jsonb_agg(jsonb_build_object('id',s.id,'species_name',s.species_name) ORDER BY s.species_name,s.id),'[]'::jsonb)
 FROM public.pet_species s WHERE s.is_active AND btrim(s.species_name)<>'' AND s.species_name!~'^[0-9]+$'
 AND lower(btrim(s.species_name)) NOT IN ('unknown','null','undefined','chưa rõ','chưa cập nhật'));
END $$;
REVOKE ALL ON FUNCTION public.get_staff_pet_species() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_pet_species() TO authenticated;

DO $$
DECLARE body text:=pg_get_functiondef('public.save_admin_pet(uuid,timestamptz,jsonb,numeric)'::regprocedure);
 needle text:=' IF p_pet_id IS NULL OR target_customer IS NULL OR breed IS NULL';
 addition text:=$new$
 IF p_details ? 'species_id' OR p_details ? 'breed_name' THEN
  SELECT s.species_name INTO species_value FROM public.pet_species s
  WHERE s.id=nullif(p_details->>'species_id','')::uuid AND s.is_active;
  IF species_value IS NULL THEN RAISE EXCEPTION 'invalid_pet_species' USING ERRCODE='22023'; END IF;
  breed:=pawpal_private.resolve_customer_pet_breed(species_value,p_details->>'breed_name');
 END IF;
$new$;
BEGIN
 IF strpos(body,'species_value')>0 THEN RETURN; END IF;
 IF strpos(body,needle)=0 OR strpos(body,'work_guard_rpc')=0 THEN RAISE EXCEPTION 'unexpected_staff_pet_definition'; END IF;
 body:=replace(body,'DECLARE pet public.pet_profile;','DECLARE species_value text; pet public.pet_profile;');
 body:=replace(body,needle,addition||needle);
 EXECUTE body;
END $$;
-- Return the saved species and breed on both the customer pet list and pet profile.
DO $$
DECLARE body text:=pg_get_functiondef('public.get_staff_workspace(text,text,uuid,integer)'::regprocedure);
 needle text:='p.breed_id,p.updated_at,';
BEGIN
 IF strpos(body,'AS pet_species_id')>0 THEN RETURN; END IF;
 IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'unexpected_staff_pet_read_definition'; END IF;
 EXECUTE replace(body,needle,needle||
 ' (SELECT b.breed_name FROM public.pet_breed b WHERE b.id=p.breed_id) AS breed_name,
 (SELECT b.species_id FROM public.pet_breed b WHERE b.id=p.breed_id) AS pet_species_id,
 (SELECT s.species_name FROM public.pet_breed b JOIN public.pet_species s ON s.id=b.species_id WHERE b.id=p.breed_id) AS species_name,');
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
