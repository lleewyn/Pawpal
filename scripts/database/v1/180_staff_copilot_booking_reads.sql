-- Work-role pricing and capacity projections. Read-only, never confirms a quote or reserves a room.
BEGIN;
SET LOCAL lock_timeout='2s';
CREATE FUNCTION public.read_staff_copilot_booking(p_tool text,p_filters jsonb DEFAULT '{}'::jsonb,p_max_bytes integer DEFAULT 32768)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=pawpal_private.work_actor(); allowed text[]; q text; category text; selected uuid; matches uuid[];
 starts timestamptz; ends timestamptz; weight_value numeric; distance_value numeric; page_value integer; offset_value integer;
 rows jsonb:='[]'; result jsonb; at_time timestamptz:=statement_timestamp();
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=actor AND role_code='STAFF') OR NOT pawpal_private.has_permission('work.copilot.use') OR NOT pawpal_private.has_permission('work.booking.create') THEN RAISE EXCEPTION 'staff_copilot_forbidden' USING ERRCODE='42501'; END IF;
 CASE p_tool
 WHEN 'catalog.service_price','catalog.price_rows' THEN allowed:=ARRAY['query','category','weight','distance','page'];
 WHEN 'hotel.availability' THEN allowed:=ARRAY['query','start_at','end_at','page'];
 ELSE RAISE EXCEPTION 'staff_copilot_tool_forbidden' USING ERRCODE='42501'; END CASE;
 IF p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR octet_length(p_filters::text)>2048 OR p_max_bytes IS NULL OR p_max_bytes NOT BETWEEN 512 AND 32768 THEN RAISE EXCEPTION 'invalid_staff_copilot_request' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_filters) k WHERE NOT k=ANY(allowed)) THEN RAISE EXCEPTION 'staff_copilot_scope_filter_forbidden' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_filters) e WHERE jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>120 OR (e.value#>>'{}')~'[[:cntrl:]]') THEN RAISE EXCEPTION 'invalid_staff_copilot_filter' USING ERRCODE='22023'; END IF;
 IF coalesce(p_filters->>'page','1')!~'^[1-9][0-9]{0,3}$' THEN RAISE EXCEPTION 'invalid_staff_copilot_page' USING ERRCODE='22023'; END IF;
 page_value:=coalesce(p_filters->>'page','1')::integer;
 IF page_value>1000 THEN RAISE EXCEPTION 'invalid_staff_copilot_page' USING ERRCODE='22023'; END IF;
 offset_value:=(page_value-1)*10;q:=btrim(coalesce(p_filters->>'query',''));
 IF p_tool='hotel.availability' THEN
  BEGIN starts:=(p_filters->>'start_at')::timestamptz;ends:=(p_filters->>'end_at')::timestamptz;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RAISE EXCEPTION 'invalid_staff_copilot_period' USING ERRCODE='22023'; END;
  IF starts IS NULL OR ends IS NULL OR NOT isfinite(starts) OR NOT isfinite(ends) OR ends<=starts OR ends-starts>interval '31 days' THEN RAISE EXCEPTION 'invalid_staff_copilot_period' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (
   SELECT r.id,'room'::text source_kind,r.room_number code,left(t.room_type,200) name,t.capacity,
    EXISTS(SELECT 1 FROM public.hotel_booking h WHERE h.room_id=r.id AND h.status NOT IN ('cancelled','closed') AND h.check_in_at<ends AND h.check_out_at>starts) reserved,
    EXISTS(SELECT 1 FROM public.hotel_booking h WHERE h.room_id=r.id AND h.status='checked_in') occupied
   FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id JOIN public.service s ON s.id=t.service_id
   WHERE r.status IN ('active','available') AND t.status='active' AND s.status='active' AND t.effective_from<=at_time AND (t.effective_to IS NULL OR t.effective_to>at_time)
   AND (q='' OR lower(r.room_number)=lower(q) OR public.admin_sales_search_text(t.room_type)=public.admin_sales_search_text(q)) ORDER BY r.room_number,r.id LIMIT 10 OFFSET offset_value)t;
  SELECT coalesce(jsonb_agg(value||jsonb_build_object('available',NOT (value->>'reserved')::boolean AND NOT (value->>'occupied')::boolean)),'[]') INTO rows FROM jsonb_array_elements(rows);
 ELSE
  IF length(q)<3 THEN RAISE EXCEPTION 'staff_copilot_service_required' USING ERRCODE='22023'; END IF;
  category:=coalesce(p_filters->>'category','');
  IF category NOT IN ('','grooming_spa','pet_hotel','pet_taxi') THEN RAISE EXCEPTION 'invalid_staff_copilot_category' USING ERRCODE='22023'; END IF;
  IF p_filters?'weight' THEN
   IF p_filters->>'weight'!~'^[0-9]{1,5}(\.[0-9]{1,3})?$' THEN RAISE EXCEPTION 'invalid_staff_copilot_weight' USING ERRCODE='22023'; END IF;
   weight_value:=(p_filters->>'weight')::numeric;
   IF weight_value>1000 THEN RAISE EXCEPTION 'invalid_staff_copilot_weight' USING ERRCODE='22023'; END IF;
  END IF;
  IF p_filters?'distance' THEN
   IF p_filters->>'distance'!~'^[0-9]{1,5}(\.[0-9]{1,3})?$' THEN RAISE EXCEPTION 'invalid_staff_copilot_distance' USING ERRCODE='22023'; END IF;
   distance_value:=(p_filters->>'distance')::numeric;
   IF distance_value>10000 THEN RAISE EXCEPTION 'invalid_staff_copilot_distance' USING ERRCODE='22023'; END IF;
  END IF;
  SELECT array_agg(id) INTO matches FROM (SELECT s.id FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE s.status='active'
   AND (category='' OR c.category_code=category) AND (lower(s.id::text)=lower(q) OR lower(s.service_code)=lower(q) OR public.admin_sales_search_text(s.service_name)=public.admin_sales_search_text(q)) ORDER BY s.id LIMIT 2)t;
  IF cardinality(matches)=1 THEN
   selected:=matches[1];SELECT c.category_code INTO category FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE s.id=selected;
   IF category<>'pet_taxi' AND distance_value IS NOT NULL THEN RAISE EXCEPTION 'unsupported_staff_price_condition' USING ERRCODE='22023'; END IF;
   IF category='grooming_spa' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT p.id,'service_price'::text source_kind,p.service_id,s.service_name name,left(p.variant_code,120) variant_code,left(p.variant_condition,400) variant_condition,p.weight_from,p.weight_to,p.weight_to_inclusive,p.unit_price price,p.duration_minutes
     FROM public.service_price_matrix p JOIN public.service s ON s.id=p.service_id WHERE p.service_id=selected AND p.status='active' AND p.effective_from<=at_time AND (p.effective_to IS NULL OR p.effective_to>at_time)
     AND (weight_value IS NULL OR weight_value>=p.weight_from AND (p.weight_to IS NULL OR weight_value<p.weight_to OR p.weight_to_inclusive AND weight_value=p.weight_to)) ORDER BY p.weight_from,p.id LIMIT 10 OFFSET offset_value)t;
   ELSIF category='pet_taxi' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT p.id,'taxi_price'::text source_kind,p.service_id,s.service_name name,left(p.variant_code,120) variant_code,left(p.variant_condition,400) variant_condition,p.weight_from,p.weight_to,p.weight_to_inclusive,p.distance_from,p.distance_to,p.distance_to_inclusive,p.base_price price,p.surcharge
     FROM public.taxi_price_rule p JOIN public.service s ON s.id=p.service_id WHERE p.service_id=selected AND p.status='active' AND p.effective_from<=at_time AND (p.effective_to IS NULL OR p.effective_to>at_time)
     AND (weight_value IS NULL OR weight_value>=p.weight_from AND (p.weight_to IS NULL OR weight_value<p.weight_to OR p.weight_to_inclusive AND weight_value=p.weight_to))
     AND (distance_value IS NULL OR distance_value>=p.distance_from AND (p.distance_to IS NULL OR distance_value<p.distance_to OR p.distance_to_inclusive AND distance_value=p.distance_to)) ORDER BY p.distance_from,p.weight_from,p.id LIMIT 10 OFFSET offset_value)t;
   ELSIF category='pet_hotel' THEN
    SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT p.id,'room_type'::text source_kind,p.service_id,p.room_type name,left(p.variant_code,120) variant_code,left(p.variant_condition,400) variant_condition,p.capacity,p.weight_from,p.weight_to,p.weight_to_inclusive,p.daily_price price,p.billing_minutes
     FROM public.hotel_room_type p WHERE p.service_id=selected AND p.status='active' AND p.effective_from<=at_time AND (p.effective_to IS NULL OR p.effective_to>at_time)
     AND (weight_value IS NULL OR weight_value>=p.weight_from AND (p.weight_to IS NULL OR weight_value<p.weight_to OR p.weight_to_inclusive AND weight_value=p.weight_to)) ORDER BY p.room_type,p.id LIMIT 10 OFFSET offset_value)t;
   ELSE RAISE EXCEPTION 'unsupported_staff_price_category' USING ERRCODE='22023'; END IF;
  END IF;
 END IF;
 result:=jsonb_build_object('intent',p_tool,'audience','staff','items',rows,'total',jsonb_array_length(rows),'total_is_page',true,'page',page_value,'page_size',10,'scope',p_filters||jsonb_build_object('current_staff',true),
  'source','Giá và khả năng nhận phòng trong quyền đặt lịch','as_of',at_time,'limitations',jsonb_build_array('Chỉ gồm một trang dữ liệu hiện tại; không phải báo giá, xác nhận đặt lịch hoặc giữ phòng.'));
 IF p_tool='hotel.availability' THEN
  result:=result||jsonb_build_object('available_is_page',true,'available',(SELECT count(*) FROM jsonb_array_elements(rows) r WHERE (r->>'available')::boolean),'unavailable',(SELECT count(*) FROM jsonb_array_elements(rows) r WHERE NOT (r->>'available')::boolean));
 ELSE result:=result||jsonb_build_object('service_id',selected,'match_limit',2,'match_count',coalesce(cardinality(matches),0),'ambiguous',coalesce(cardinality(matches),0)>1); END IF;
 IF octet_length(result::text)>p_max_bytes THEN RAISE EXCEPTION 'staff_copilot_payload_exceeded' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_staff_copilot_booking(text,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_staff_copilot_booking(text,jsonb,integer) TO authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.staff_copilot_refs_allowed(p_actor uuid,p_codes jsonb,p_refs jsonb) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE ref jsonb; target uuid; kind text; permission text; owns boolean;
BEGIN
 IF p_refs IS NULL OR jsonb_typeof(p_refs)<>'array' OR jsonb_array_length(p_refs)>64 OR octet_length(p_refs::text)>16384 THEN RETURN false; END IF;
 FOR ref IN SELECT value FROM jsonb_array_elements(p_refs) LOOP
  IF jsonb_typeof(ref)<>'object' OR EXISTS(SELECT 1 FROM jsonb_object_keys(ref) k WHERE k NOT IN ('kind','id','permission')) THEN RETURN false; END IF;
  kind:=ref->>'kind';permission:=ref->>'permission';
  IF kind IS NULL OR permission IS NULL OR NOT p_codes?permission OR permission NOT IN ('work.booking.create','work.copilot.use','work.customer.read','work.pet.read','work.sales.create','work.cashier.collect','work.stock.read','work.service.perform','work.chat.handle','work.complaint.handle','work.self.read') THEN RETURN false; END IF;
  IF kind='permission' THEN
   IF ref?'id' THEN RETURN false; END IF;
   CONTINUE;
  END IF;
  IF coalesce(ref->>'id','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RETURN false; END IF;
  target:=(ref->>'id')::uuid;
  CASE kind
  WHEN 'customer' THEN owns:=permission='work.customer.read' AND EXISTS(SELECT 1 FROM public.customer WHERE id=target);
  WHEN 'pet' THEN owns:=permission='work.pet.read' AND EXISTS(SELECT 1 FROM public.pet_profile WHERE id=target);
  WHEN 'order' THEN owns:=permission IN ('work.sales.create','work.cashier.collect') AND EXISTS(SELECT 1 FROM public.sales_order WHERE id=target);
  WHEN 'product' THEN owns:=permission='work.stock.read' AND EXISTS(SELECT 1 FROM public.product_variant WHERE id=target);
  WHEN 'service' THEN owns:=EXISTS(SELECT 1 FROM public.service WHERE id=target AND (permission='work.service.perform' OR permission='work.booking.create' AND status='active'));
  WHEN 'service_price' THEN owns:=permission='work.booking.create' AND EXISTS(SELECT 1 FROM public.service_price_matrix p JOIN public.service s ON s.id=p.service_id WHERE p.id=target AND s.status='active' AND p.status='active' AND p.effective_from<=now() AND (p.effective_to IS NULL OR p.effective_to>now()));
  WHEN 'taxi_price' THEN owns:=permission='work.booking.create' AND EXISTS(SELECT 1 FROM public.taxi_price_rule p JOIN public.service s ON s.id=p.service_id WHERE p.id=target AND s.status='active' AND p.status='active' AND p.effective_from<=now() AND (p.effective_to IS NULL OR p.effective_to>now()));
  WHEN 'room_type' THEN owns:=permission='work.booking.create' AND EXISTS(SELECT 1 FROM public.hotel_room_type p JOIN public.service s ON s.id=p.service_id WHERE p.id=target AND s.status='active' AND p.status='active' AND p.effective_from<=now() AND (p.effective_to IS NULL OR p.effective_to>now()));
  WHEN 'room' THEN owns:=permission='work.booking.create' AND EXISTS(SELECT 1 FROM public.hotel_room r JOIN public.hotel_room_type p ON p.id=r.room_type_id JOIN public.service s ON s.id=p.service_id WHERE r.id=target AND r.status IN ('active','available') AND s.status='active' AND p.status='active' AND p.effective_from<=now() AND (p.effective_to IS NULL OR p.effective_to>now()));
  WHEN 'staff' THEN owns:=permission='work.self.read' AND target=p_actor;
  WHEN 'schedule' THEN owns:=permission='work.self.read' AND EXISTS(SELECT 1 FROM public.staff_schedule WHERE id=target AND staff_id=p_actor);
  WHEN 'conversation' THEN owns:=permission='work.chat.handle' AND EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=target AND assigned_staff_id=p_actor);
  WHEN 'queue' THEN owns:=permission='work.chat.handle' AND EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=target AND assigned_staff_id IS NULL AND status='waiting_agent');
  WHEN 'ticket' THEN owns:=permission='work.complaint.handle' AND EXISTS(SELECT 1 FROM public.support_ticket WHERE id=target AND assigned_staff_id=p_actor);
  WHEN 'taxi' THEN owns:=permission='work.service.perform' AND EXISTS(SELECT 1 FROM public.taxi_trip WHERE id=target AND driver_staff_id=p_actor);
  WHEN 'appointment' THEN owns:=permission='work.service.perform' AND EXISTS(SELECT 1 FROM public.appointment a WHERE a.id=target AND (a.staff_id=p_actor OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=p_actor) OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=p_actor)));
  WHEN 'hotel' THEN owns:=permission='work.service.perform' AND EXISTS(SELECT 1 FROM public.hotel_booking h JOIN public.appointment a ON a.id=h.appointment_id WHERE h.id=target AND (a.staff_id=p_actor OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.staff_id=p_actor) OR EXISTS(SELECT 1 FROM public.taxi_trip t WHERE t.appointment_id=a.id AND t.driver_staff_id=p_actor)));
  WHEN 'knowledge' THEN owns:=permission='work.copilot.use' AND EXISTS(SELECT 1 FROM public.chatbot_knowledge_faq WHERE id=target AND is_active);
  WHEN 'offer' THEN owns:=permission='work.sales.create' AND EXISTS(SELECT 1 FROM public.voucher WHERE id=target AND is_active AND (now() AT TIME ZONE 'Asia/Bangkok')::date BETWEEN start_date AND end_date);
  ELSE RETURN false;
  END CASE;
  IF owns IS DISTINCT FROM true THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.staff_copilot_refs_allowed(uuid,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
