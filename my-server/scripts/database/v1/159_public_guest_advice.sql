BEGIN;
SET LOCAL lock_timeout='1s'; SET LOCAL statement_timeout='5s';
-- Closed public projection. No customer, staff, order or payment sources.
CREATE OR REPLACE FUNCTION public.read_public_guest_advice(p_request jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE kind text:=p_request->>'kind'; q text:=coalesce(p_request->>'query',''); pet text:=p_request->>'pet'; w numeric; d numeric;
 term text; rows jsonb:='[]'; part jsonb; cfg jsonb; more boolean:=false;
BEGIN
 PERFORM pawpal_private.admit_chat_server_read();
 IF p_request IS NULL OR jsonb_typeof(p_request)<>'object' OR octet_length(p_request::text)>2000
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_request) k WHERE k NOT IN ('kind','query','queries','weight','distance','pet'))
 OR kind IS NULL OR kind NOT IN ('store','product','grooming','hotel','taxi')
 OR jsonb_typeof(p_request->'kind')<>'string'
 OR (p_request ? 'query' AND jsonb_typeof(p_request->'query')<>'string') OR length(q)>120 THEN RAISE EXCEPTION 'invalid_guest_advice' USING ERRCODE='22023'; END IF;
 IF p_request ? 'weight' THEN
  IF jsonb_typeof(p_request->'weight')<>'number' THEN RAISE EXCEPTION 'invalid_weight' USING ERRCODE='22023'; END IF;
  w:=(p_request->>'weight')::numeric;
  IF w NOT BETWEEN 0.01 AND 200 THEN RAISE EXCEPTION 'invalid_weight' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_request ? 'distance' THEN
  IF jsonb_typeof(p_request->'distance')<>'number' THEN RAISE EXCEPTION 'invalid_distance' USING ERRCODE='22023'; END IF;
  d:=(p_request->>'distance')::numeric;
  IF d NOT BETWEEN 0.01 AND 1000 THEN RAISE EXCEPTION 'invalid_distance' USING ERRCODE='22023'; END IF;
 END IF;
 IF kind<>'product' AND p_request ? 'queries' THEN RAISE EXCEPTION 'invalid_queries' USING ERRCODE='22023'; END IF;
 IF kind='hotel' AND q<>'' AND cardinality(string_to_array(q,'|'))>2 THEN RAISE EXCEPTION 'invalid_room_query' USING ERRCODE='22023'; END IF;
 IF p_request ? 'pet' AND (kind='store' OR jsonb_typeof(p_request->'pet')<>'string' OR pet NOT IN ('cat','dog')) THEN RAISE EXCEPTION 'invalid_pet' USING ERRCODE='22023'; END IF;
 IF kind='store' THEN
  SELECT setting_value::jsonb INTO cfg FROM public.pawpal_setting WHERE setting_key='system_config' LIMIT 1;
  rows:=jsonb_build_array(jsonb_build_object('address',cfg#>>'{storeInfo,address}','phone',cfg#>>'{storeInfo,hotline}',
   'weekday_open',cfg#>>'{operatingHours,weekday,open}','weekday_close',cfg#>>'{operatingHours,weekday,close}',
   'weekend_open',cfg#>>'{operatingHours,weekend,open}','weekend_close',cfg#>>'{operatingHours,weekend,close}',
   'holiday_notice',left(cfg#>>'{operatingHours,holidayNotice}',400)));
 ELSIF kind='product' THEN
  IF jsonb_typeof(p_request->'queries') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'invalid_queries' USING ERRCODE='22023'; END IF;
  IF jsonb_array_length(p_request->'queries') NOT BETWEEN 1 AND 2 OR EXISTS(SELECT 1 FROM jsonb_array_elements(p_request->'queries') x WHERE jsonb_typeof(x)<>'string' OR length(btrim(x#>>'{}')) NOT BETWEEN 2 AND 120) THEN RAISE EXCEPTION 'invalid_queries' USING ERRCODE='22023'; END IF;
  FOR term IN SELECT value FROM jsonb_array_elements_text(p_request->'queries') LOOP
   WITH candidates AS (
    SELECT v.id FROM public.product p JOIN public.product_variant v ON v.product_id=p.id
    WHERE p.status='active' AND lower(p.status)='active' AND v.status='active' AND lower(v.status)='active' AND NOT v.catalog_retired
    AND (pet IS NULL OR public.public_chat_search_text(p.target_pet) ~ CASE pet WHEN 'cat' THEN 'meo|cat' ELSE 'cho|dog' END)
    AND to_tsvector('simple',public.public_chat_search_text(p.product_name)) @@ plainto_tsquery('simple',public.public_chat_search_text(term))
    UNION
    SELECT v.id FROM public.product_variant v JOIN public.product p ON p.id=v.product_id
    WHERE p.status='active' AND lower(p.status)='active' AND v.status='active' AND lower(v.status)='active' AND NOT v.catalog_retired AND public.public_chat_search_text(v.sku_variant)=public.public_chat_search_text(term)
    AND (pet IS NULL OR public.public_chat_search_text(p.target_pet) ~ CASE pet WHEN 'cat' THEN 'meo|cat' ELSE 'cho|dog' END)
   ), chosen AS MATERIALIZED (
    SELECT p.id product_id,left(p.product_name,180) name,left(v.sku_variant,120) code,left(v.variant_name,150) variant,
     v.id,left(coalesce(v.description,p.description,''),350) description,left(coalesce(v.features,p.benefits,''),300) features,
     left(p.target_pet::text,100) target_pet,v.sale_price price
    FROM candidates x JOIN public.product_variant v ON v.id=x.id JOIN public.product p ON p.id=v.product_id
    ORDER BY p.product_name,v.sku_variant,v.id LIMIT 3
   ) SELECT jsonb_build_object('more',(SELECT count(*)>2 FROM chosen),'items',coalesce((
    SELECT jsonb_agg(to_jsonb(x)-'id' ORDER BY name,code) FROM (
     SELECT c.*,term matched_query,
      greatest(0,coalesce((SELECT sum(quantity) FROM public.inventory_transaction WHERE product_variant_id=c.id),0)
      -coalesce((SELECT sum(quantity) FROM public.stock_reservation WHERE product_variant_id=c.id AND status='active' AND expires_at>now()),0))>0 available
     FROM chosen c ORDER BY name,code LIMIT 2) x),'[]')) INTO part;
   rows:=rows||(part->'items'); more:=more OR (part->>'more')::boolean;
  END LOOP;
 ELSIF kind='grooming' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x)-'sort_id' ORDER BY code,weight_from,sort_id),'[]') INTO rows FROM (
   SELECT m.id sort_id,s.id service_id,left(s.service_name,180) name,left(s.service_code,120) code,
    left(coalesce(s.description,''),350) description,left(coalesce(s.benefits,''),300) features,
    m.weight_from,m.weight_to,m.weight_to_inclusive,m.unit_price price,m.duration_minutes duration,left(m.variant_condition,200) condition
   FROM public.service s JOIN public.service_category c ON c.id=s.category_id JOIN public.service_price_matrix m ON m.service_id=s.id
   WHERE s.status='active' AND c.category_code='grooming_spa' AND m.status='active' AND m.effective_from<=now() AND (m.effective_to IS NULL OR m.effective_to>now())
   AND (pet IS NULL OR EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_species ps ON ps.id=ss.species_id WHERE ss.service_id=s.id AND public.public_chat_search_text(ps.species_name)=CASE pet WHEN 'cat' THEN 'meo' ELSE 'cho' END))
   AND (q='' OR strpos(public.public_chat_search_text(s.service_name),public.public_chat_search_text(q))>0
    OR (public.public_chat_search_text(q)='cat tia' AND public.public_chat_search_text(s.service_name) ~ 'grooming|cat tia|tao kieu'))
   AND (w IS NULL OR (w>=m.weight_from AND (m.weight_to IS NULL OR w<m.weight_to OR (m.weight_to_inclusive AND w=m.weight_to))))
   ORDER BY s.service_code,m.weight_from,m.id LIMIT 6) x;
 ELSIF kind='hotel' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(x)-'sort_id' ORDER BY name,sort_id),'[]') INTO rows FROM (
   SELECT h.id sort_id,h.service_id,left(h.room_type,180) name,h.daily_price price,h.billing_minutes,
    left(coalesce(h.description,''),350) description,left(coalesce(h.amenities,''),300) features,h.capacity,
    h.weight_from,h.weight_to,h.weight_to_inclusive,left(h.variant_condition,200) condition
   FROM public.hotel_room_type h JOIN public.service s ON s.id=h.service_id
   WHERE h.status='active' AND s.status='active' AND h.effective_from<=now() AND (h.effective_to IS NULL OR h.effective_to>now())
   AND (q='' OR EXISTS(SELECT 1 FROM unnest(string_to_array(public.public_chat_search_text(q),'|')) names(value) WHERE names.value<>'' AND strpos(public.public_chat_search_text(h.room_type),names.value)>0))
   AND (pet IS NULL OR EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_species ps ON ps.id=ss.species_id WHERE ss.service_id=s.id AND public.public_chat_search_text(ps.species_name)=CASE pet WHEN 'cat' THEN 'meo' ELSE 'cho' END))
   AND (w IS NULL OR (w>=h.weight_from AND (h.weight_to IS NULL OR w<h.weight_to OR (h.weight_to_inclusive AND w=h.weight_to))))
   ORDER BY h.room_type,h.id LIMIT 6) x;
 ELSE
  SELECT coalesce(jsonb_agg(to_jsonb(x)-'sort_id' ORDER BY name,weight_from,sort_id),'[]') INTO rows FROM (
   SELECT t.id sort_id,t.service_id,left(s.service_name,180) name,t.base_price price,t.surcharge,
    t.weight_from,t.weight_to,t.weight_to_inclusive,t.distance_from,t.distance_to,t.distance_to_inclusive,left(t.variant_condition,200) condition
   FROM public.taxi_price_rule t JOIN public.service s ON s.id=t.service_id
   WHERE t.status='active' AND s.status='active' AND t.effective_from<=now() AND (t.effective_to IS NULL OR t.effective_to>now())
   AND (pet IS NULL OR EXISTS(SELECT 1 FROM public.service_supported_species ss JOIN public.pet_species ps ON ps.id=ss.species_id WHERE ss.service_id=s.id AND public.public_chat_search_text(ps.species_name)=CASE pet WHEN 'cat' THEN 'meo' ELSE 'cho' END))
   AND (w IS NULL OR (w>=t.weight_from AND (t.weight_to IS NULL OR w<t.weight_to OR (t.weight_to_inclusive AND w=t.weight_to))))
   AND (d IS NULL OR (d>=t.distance_from AND (t.distance_to IS NULL OR d<t.distance_to OR (t.distance_to_inclusive AND d=t.distance_to))))
   ORDER BY s.service_name,t.weight_from,t.id LIMIT 6) x;
 END IF;
 IF jsonb_array_length(rows)>5 THEN more:=true;rows:=rows-5; END IF;
 part:=jsonb_build_object('kind',kind,'items',rows,'has_more',more,'as_of',clock_timestamp());
 IF octet_length(convert_to(part::text,'UTF8'))>16384 THEN RAISE EXCEPTION 'guest_advice_limit' USING ERRCODE='54000'; END IF;
 RETURN part;
END $$;

CREATE OR REPLACE FUNCTION public.read_public_guest_seed(p_conversation uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb; recent jsonb;
BEGIN
 result:=public.read_public_chat_rules();
 IF p_conversation IS NULL OR NOT EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=p_conversation) THEN RAISE EXCEPTION 'invalid_guest_context' USING ERRCODE='22023'; END IF;
 SELECT coalesce(jsonb_agg(content ORDER BY created_at DESC,id DESC),'[]') INTO recent FROM (
  SELECT id,created_at,left(content,600) content FROM public.chat_message WHERE conversation_id=p_conversation AND sender_type IN ('guest','customer') ORDER BY created_at DESC,id DESC LIMIT 4) x;
 result:=result||jsonb_build_object('recent_questions',recent);
 IF octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'guest_seed_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_public_guest_advice(jsonb),public.read_public_guest_seed(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.read_public_guest_advice(jsonb),public.read_public_guest_seed(uuid) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
