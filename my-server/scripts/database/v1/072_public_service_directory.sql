BEGIN;
CREATE OR REPLACE FUNCTION public.public_service_directory()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.service_code),'[]'::jsonb) FROM (
  SELECT s.id,s.service_code,s.service_name,s.description,s.estimated_duration,c.category_code,
   coalesce((SELECT jsonb_agg(ca.action_name ORDER BY sc.display_order,ca.id) FROM public.service_care_action sc JOIN public.care_action ca ON ca.id=sc.care_action_id WHERE sc.service_id=s.id AND ca.is_active),'[]'::jsonb) AS care_actions,
   coalesce((SELECT jsonb_agg(sp.species_name ORDER BY sp.species_name) FROM public.service_supported_species ss JOIN public.pet_species sp ON sp.id=ss.species_id WHERE ss.service_id=s.id AND sp.is_active),'[]'::jsonb) AS species,
   coalesce((SELECT jsonb_agg(jsonb_build_object('weight_from',p.weight_from,'weight_to',p.weight_to,'unit_price',p.unit_price) ORDER BY p.weight_from,p.id) FROM public.service_price_matrix p WHERE p.service_id=s.id AND p.status='active' AND p.effective_from<=now() AND (p.effective_to IS NULL OR p.effective_to>now())),'[]'::jsonb) AS prices,
   (SELECT coalesce(avg(r.rating),0) FROM public.review r JOIN public.appointment_item i ON i.id=r.appointment_item_id WHERE i.service_id=s.id AND r.review_status IN ('published','approved','da_duyet')) AS rating,
   (SELECT count(*) FROM public.review r JOIN public.appointment_item i ON i.id=r.appointment_item_id WHERE i.service_id=s.id AND r.review_status IN ('published','approved','da_duyet')) AS review_count
  FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE s.status='active'
 ) x
$$;
CREATE OR REPLACE FUNCTION public.public_service_reviews(p_service uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC,x.id),'[]'::jsonb) FROM (
  SELECT r.id,r.rating,r.review_content,r.created_at,
   (SELECT response_content FROM public.review_response WHERE review_id=r.id ORDER BY updated_at DESC,id LIMIT 1) AS shop_reply
  FROM public.review r JOIN public.appointment_item i ON i.id=r.appointment_item_id JOIN public.service s ON s.id=i.service_id
  WHERE i.service_id=p_service AND s.status='active' AND r.review_status IN ('published','approved','da_duyet')
  ORDER BY r.created_at DESC,r.id LIMIT 500
 ) x
$$;
REVOKE ALL ON FUNCTION public.public_service_directory(),public.public_service_reviews(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_service_directory(),public.public_service_reviews(uuid) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
