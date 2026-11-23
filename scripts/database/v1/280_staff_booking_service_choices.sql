BEGIN;
CREATE OR REPLACE FUNCTION public.get_staff_booking_services(p_category text,p_pet_id uuid DEFAULT NULL,p_query text DEFAULT '',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE species uuid;rows jsonb;
BEGIN
 IF pawpal_private.work_actor() IS NULL OR (NOT pawpal_private.work_is_admin() AND NOT pawpal_private.has_permission('work.booking.create')) THEN RAISE EXCEPTION 'work_booking_forbidden' USING ERRCODE='42501';END IF;
 IF p_category IS NULL OR p_category NOT IN('grooming_spa','pet_hotel','pet_taxi') OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 1000 OR length(coalesce(p_query,''))>120 THEN RAISE EXCEPTION 'invalid_catalog_query' USING ERRCODE='22023';END IF;
 IF p_pet_id IS NOT NULL THEN
  SELECT b.species_id INTO species FROM public.pet_profile p JOIN public.pet_breed b ON b.id=p.breed_id WHERE p.id=p_pet_id AND p.status='active';
  IF species IS NULL THEN RAISE EXCEPTION 'active_pet_required' USING ERRCODE='22023';END IF;
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (
  SELECT s.id,s.service_name,s.description,s.estimated_duration,s.trip_type,c.category_code,
   ARRAY(SELECT ss.species_id FROM public.service_supported_species ss WHERE ss.service_id=s.id) species_ids
  FROM public.service s JOIN public.service_category c ON c.id=s.category_id
  WHERE s.status='active' AND c.category_code=p_category
  AND (species IS NULL OR EXISTS(SELECT 1 FROM public.service_supported_species ss WHERE ss.service_id=s.id AND ss.species_id=species))
  AND strpos(lower(s.service_name),lower(coalesce(p_query,'')))>0
  ORDER BY s.service_name,s.id LIMIT 10 OFFSET (p_page-1)*10
 )t;
 RETURN jsonb_build_object('items',rows,'page',p_page);
END $$;
REVOKE ALL ON FUNCTION public.get_staff_booking_services(text,uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_booking_services(text,uuid,text,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
