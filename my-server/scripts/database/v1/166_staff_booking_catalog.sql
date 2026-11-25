-- Requires migration 165. Catalog only; booking price, ownership and conflicts remain checked by existing write RPCs.
BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.work_guard_booking_staff(details jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NOT pawpal_private.work_is_admin() AND nullif(details->>'staff_id','') IS NOT NULL THEN
  RAISE EXCEPTION 'work_booking_assignment_forbidden' USING ERRCODE='42501'; END IF;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.work_guard_booking_staff(jsonb) FROM PUBLIC,anon,authenticated;
DO $$ DECLARE fn text; source text; needle text; BEGIN
 FOREACH fn IN ARRAY ARRAY['create_admin_service_booking','create_admin_logistics_booking'] LOOP
  SELECT pg_get_functiondef(to_regprocedure('public.'||fn||'(uuid,jsonb)')) INTO source;
  needle:=' PERFORM pawpal_private.work_guard_rpc('''||fn||''',';
  IF source IS NULL OR strpos(source,needle)=0 OR strpos(source,'work_guard_booking_staff')>0 THEN RAISE EXCEPTION 'unexpected_booking_definition'; END IF;
  EXECUTE replace(source,needle,E' PERFORM pawpal_private.work_guard_booking_staff(p_details);\n'||needle);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.get_staff_booking_catalog(p_kind text,p_service_id uuid DEFAULT NULL,p_query text DEFAULT '',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE rows jsonb; offset_value integer;
BEGIN
 IF pawpal_private.work_actor() IS NULL OR NOT pawpal_private.has_permission('work.booking.create') AND NOT pawpal_private.work_is_admin() THEN
  RAISE EXCEPTION 'work_booking_forbidden' USING ERRCODE='42501'; END IF;
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 1000 OR length(coalesce(p_query,''))>120 THEN RAISE EXCEPTION 'invalid_catalog_query' USING ERRCODE='22023'; END IF;
 offset_value:=(p_page-1)*10;
 IF p_kind='services' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (
   SELECT s.id,s.service_name,s.description,s.estimated_duration,s.trip_type,c.category_code,
    ARRAY(SELECT ss.species_id FROM public.service_supported_species ss WHERE ss.service_id=s.id) species_ids
   FROM public.service s JOIN public.service_category c ON c.id=s.category_id
   WHERE s.status='active' AND (p_service_id IS NULL OR s.id=p_service_id)
   AND strpos(lower(s.service_name),lower(coalesce(p_query,'')))>0 ORDER BY s.service_name,s.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='prices' THEN
  IF p_service_id IS NULL THEN RAISE EXCEPTION 'service_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (
   SELECT id,weight_from,weight_to,weight_to_inclusive,unit_price,duration_minutes,effective_from,effective_to FROM public.service_price_matrix
   WHERE service_id=p_service_id AND status='active' AND EXISTS(SELECT 1 FROM public.service WHERE id=p_service_id AND status='active') ORDER BY weight_from,effective_from,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='rooms' THEN
  IF p_service_id IS NULL THEN RAISE EXCEPTION 'service_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (
   SELECT r.id,r.room_number,t.room_type,t.daily_price,t.billing_minutes,t.weight_from,t.weight_to,t.weight_to_inclusive,t.effective_from,t.effective_to
   FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id
   WHERE t.service_id=p_service_id AND t.status='active' AND r.status IN ('active','available') AND EXISTS(SELECT 1 FROM public.service WHERE id=p_service_id AND status='active') ORDER BY r.room_number,r.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='taxi_prices' THEN
  IF p_service_id IS NULL THEN RAISE EXCEPTION 'service_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (
   SELECT id,distance_from,distance_to,distance_to_inclusive,weight_from,weight_to,weight_to_inclusive,base_price,surcharge,effective_from,effective_to
   FROM public.taxi_price_rule WHERE service_id=p_service_id AND status='active' AND EXISTS(SELECT 1 FROM public.service WHERE id=p_service_id AND status='active') ORDER BY distance_from,weight_from,effective_from,id LIMIT 10 OFFSET offset_value) t;
 ELSE RAISE EXCEPTION 'unsupported_booking_catalog' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('items',rows,'page',p_page);
END $$;
REVOKE ALL ON FUNCTION public.get_staff_booking_catalog(text,uuid,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_booking_catalog(text,uuid,text,integer) TO authenticated;
COMMIT;
