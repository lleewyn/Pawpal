BEGIN;

-- Bổ sung thông tin phân loại (Loài thú cưng và Cân nặng) vào hàm public_service_reviews
CREATE OR REPLACE FUNCTION public.public_service_reviews(p_service uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC,x.id),'[]'::jsonb) FROM (
  SELECT r.id,r.rating,r.review_content,r.created_at,
   coalesce(
     (SELECT sp.species_name || CASE WHEN i.weight_snapshot IS NOT NULL THEN ' • ' || i.weight_snapshot::text || 'kg' ELSE '' END
      FROM public.pet pet JOIN public.pet_species sp ON sp.id=pet.species_id
      WHERE pet.id=a.pet_id),
     CASE WHEN i.weight_snapshot IS NOT NULL THEN i.weight_snapshot::text || 'kg' ELSE 'Tiêu chuẩn' END
   ) AS variant_name,
   (SELECT response_content FROM public.review_response WHERE review_id=r.id ORDER BY updated_at DESC,id LIMIT 1) AS shop_reply
  FROM public.review r
  JOIN public.appointment_item i ON i.id=r.appointment_item_id
  JOIN public.appointment a ON a.id=i.appointment_id
  JOIN public.service s ON s.id=i.service_id
  WHERE i.service_id=p_service AND s.status='active' AND r.review_status IN ('published','approved','da_duyet')
  ORDER BY r.created_at DESC,r.id LIMIT 500
 ) x
$$;

REVOKE ALL ON FUNCTION public.public_service_reviews(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_service_reviews(uuid) TO anon,authenticated;

NOTIFY pgrst,'reload schema';
COMMIT;
