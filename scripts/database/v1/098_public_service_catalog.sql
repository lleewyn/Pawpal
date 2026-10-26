CREATE OR REPLACE FUNCTION public.public_service_directory()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.service_code),'[]'::jsonb) FROM (
 SELECT s.id,s.service_code,s.service_name,s.description,s.estimated_duration,s.duration_label,s.package_name,s.trip_type,
 s.benefits,s.amenities,c.category_code,l.level_name AS groomer_level,
 coalesce((SELECT jsonb_agg(i.image_url ORDER BY i.is_thumbnail DESC,i.display_order,i.id) FROM public.service_image i WHERE i.service_id=s.id),'[]'::jsonb) images,
 coalesce((SELECT jsonb_agg(a.action_name ORDER BY sc.display_order,a.id) FROM public.service_care_action sc JOIN public.care_action a ON a.id=sc.care_action_id WHERE sc.service_id=s.id AND a.is_active),'[]'::jsonb) care_actions,
 coalesce((SELECT jsonb_agg(sp.species_name ORDER BY sp.species_name) FROM public.service_supported_species ss JOIN public.pet_species sp ON sp.id=ss.species_id WHERE ss.service_id=s.id AND sp.is_active),'[]'::jsonb) species,
 coalesce((SELECT jsonb_agg(p.data ORDER BY p.sort_weight,p.sort_distance) FROM (
  SELECT jsonb_build_object('variant_code',m.variant_code,'condition',m.variant_condition,'weight_from',m.weight_from,'weight_to',m.weight_to,'weight_to_inclusive',m.weight_to_inclusive,'unit_price',m.unit_price,'duration_minutes',m.duration_minutes,'billing_unit','lượt') data,m.weight_from sort_weight,0::numeric sort_distance
  FROM public.service_price_matrix m WHERE m.service_id=s.id AND m.status='active' AND m.effective_from<=now() AND (m.effective_to IS NULL OR m.effective_to>now()) AND c.category_code='grooming_spa'
  UNION ALL
  SELECT jsonb_build_object('variant_code',h.variant_code,'condition',h.variant_condition,'weight_from',h.weight_from,'weight_to',h.weight_to,'weight_to_inclusive',h.weight_to_inclusive,'unit_price',h.daily_price,'room_type',h.room_type,'capacity',h.capacity,'billing_unit',CASE WHEN h.billing_minutes=60 THEN 'giờ' ELSE 'ngày' END),h.weight_from,0
  FROM public.hotel_room_type h WHERE h.service_id=s.id AND h.status='active' AND h.effective_from<=now() AND (h.effective_to IS NULL OR h.effective_to>now()) AND c.category_code='pet_hotel'
  UNION ALL
  SELECT jsonb_build_object('variant_code',t.variant_code,'condition',t.variant_condition,'weight_from',t.weight_from,'weight_to',t.weight_to,'weight_to_inclusive',t.weight_to_inclusive,'distance_from',t.distance_from,'distance_to',t.distance_to,'distance_to_inclusive',t.distance_to_inclusive,'unit_price',t.base_price+t.surcharge,'billing_unit',CASE WHEN s.trip_type='round_trip' THEN 'chuyến khứ hồi' ELSE 'chuyến một chiều' END),t.weight_from,t.distance_from
  FROM public.taxi_price_rule t WHERE t.service_id=s.id AND t.status='active' AND t.effective_from<=now() AND (t.effective_to IS NULL OR t.effective_to>now()) AND c.category_code='pet_taxi'
 ) p),'[]'::jsonb) prices,
 (SELECT coalesce(avg(r.rating),0) FROM public.review r JOIN public.appointment_item i ON i.id=r.appointment_item_id WHERE i.service_id=s.id AND r.review_status IN ('published','approved','da_duyet')) rating,
 (SELECT count(*) FROM public.review r JOIN public.appointment_item i ON i.id=r.appointment_item_id WHERE i.service_id=s.id AND r.review_status IN ('published','approved','da_duyet')) review_count
 FROM public.service s JOIN public.service_category c ON c.id=s.category_id LEFT JOIN public.staff_level l ON l.id=s.staff_level_required_id WHERE s.status='active'
 ) x
$$;
REVOKE ALL ON FUNCTION public.public_service_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_service_directory() TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.customer_service_catalog()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object('services',coalesce((SELECT jsonb_agg(jsonb_build_object('id',s.id,'code',s.service_code,'name',s.service_name,
 'description',s.description,'duration',s.estimated_duration,'duration_label',s.duration_label,'trip_type',s.trip_type,'category',c.category_code,
 'species_ids',coalesce((SELECT jsonb_agg(species_id ORDER BY species_id) FROM public.service_supported_species WHERE service_id=s.id),'[]'::jsonb),
 'addons',coalesce((SELECT jsonb_agg(jsonb_build_object('id',x.id,'name',x.addon_name,'price',x.price,'duration',x.estimated_duration,'required',x.is_required) ORDER BY x.id) FROM public.service_addon x WHERE x.service_id=s.id AND x.status='active'),'[]'::jsonb)) ORDER BY s.service_name) FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE s.status='active'),'[]'::jsonb),
 'rooms',coalesce((SELECT jsonb_agg(jsonb_build_object('id',r.id,'name',r.room_number,'type',t.room_type,'daily_price',t.daily_price,'service_id',t.service_id,'billing_minutes',t.billing_minutes) ORDER BY r.room_number) FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id WHERE r.status IN ('active','available') AND t.status='active' AND t.effective_from<=now() AND (t.effective_to IS NULL OR t.effective_to>now())),'[]'::jsonb));
$$;
