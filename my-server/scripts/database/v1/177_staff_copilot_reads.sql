-- Scoped read foundation only. Does not enable the HTTP assistant or grant table reads.
BEGIN;
SET LOCAL lock_timeout='2s';
CREATE FUNCTION public.read_staff_copilot(p_tool text,p_filters jsonb DEFAULT '{}'::jsonb,p_max_bytes integer DEFAULT 32768)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid:=pawpal_private.work_actor(); allowed text[]; needed text; kind text;
 query_text text; page_value integer; offset_value integer; start_value timestamptz; end_value timestamptz;
 person_name text; rows jsonb; result jsonb; source_rows jsonb;
BEGIN
 IF actor IS NULL OR NOT pawpal_private.has_permission('work.copilot.use')
 OR NOT EXISTS(SELECT 1 FROM public.staff_role WHERE staff_id=actor AND role_code='STAFF') THEN
  RAISE EXCEPTION 'staff_copilot_forbidden' USING ERRCODE='42501'; END IF;
 CASE p_tool
 WHEN 'customer.lookup' THEN allowed:=ARRAY['query','page'];needed:='work.customer.read';kind:='customers';
 WHEN 'pet.lookup' THEN allowed:=ARRAY['query','page'];needed:='work.pet.read';kind:='pets';
 WHEN 'order.lookup' THEN allowed:=ARRAY['query','page'];needed:='work.sales.create';kind:='orders';
 WHEN 'payment.order' THEN allowed:=ARRAY['query','page'];needed:='work.cashier.collect';
 WHEN 'points.lookup' THEN allowed:=ARRAY['query','page'];needed:='work.customer.read';kind:='customers';
 WHEN 'catalog.product' THEN allowed:=ARRAY['query','page'];needed:='work.stock.read';kind:='stock';
 WHEN 'inventory.low_stock' THEN allowed:=ARRAY['query','page'];needed:='work.stock.read';
 WHEN 'catalog.service' THEN allowed:=ARRAY['query','page'];needed:='work.service.perform';kind:='services';
 WHEN 'appointment.list' THEN allowed:=ARRAY['start_at','end_at','category','status','page'];needed:='work.service.perform';
 WHEN 'appointment.search' THEN allowed:=ARRAY['start_at','end_at','category','status','day_part','page'];needed:='work.service.perform';
 WHEN 'ticket.open' THEN allowed:=ARRAY['start_at','end_at','page'];needed:='work.complaint.handle';
 WHEN 'ticket.lookup' THEN allowed:=ARRAY['query','page'];needed:='work.complaint.handle';
 WHEN 'conversation.list' THEN allowed:=ARRAY['query','start_at','end_at','status','page'];needed:='work.chat.handle';
 WHEN 'conversation.context' THEN allowed:=ARRAY['conversationId','page'];needed:='work.chat.handle';kind:='messages';
 WHEN 'staff.lookup' THEN allowed:=ARRAY['query','page'];needed:='work.self.read';kind:='self';
 WHEN 'staff.schedule' THEN allowed:=ARRAY['query','start_at','end_at','page'];needed:='work.self.read';
 WHEN 'hotel.stays' THEN allowed:=ARRAY['query','start_at','end_at','page'];needed:='work.service.perform';
 WHEN 'taxi.trips' THEN allowed:=ARRAY['query','start_at','end_at','page'];needed:='work.service.perform';
 WHEN 'knowledge.search' THEN allowed:=ARRAY['query','page'];needed:='work.copilot.use';
 WHEN 'offer.list' THEN allowed:=ARRAY['query','page'];needed:='work.sales.create';
 ELSE RAISE EXCEPTION 'staff_copilot_tool_forbidden' USING ERRCODE='42501';
 END CASE;
 IF NOT pawpal_private.has_permission(needed) THEN RAISE EXCEPTION 'staff_copilot_tool_forbidden' USING ERRCODE='42501'; END IF;
 IF p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR octet_length(p_filters::text)>2048
 OR p_max_bytes IS NULL OR p_max_bytes NOT BETWEEN 512 AND 32768 THEN RAISE EXCEPTION 'invalid_staff_copilot_request' USING ERRCODE='22023'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_object_keys(p_filters) k WHERE NOT k=ANY(allowed)) THEN
  RAISE EXCEPTION 'staff_copilot_scope_filter_forbidden' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each(p_filters) e WHERE jsonb_typeof(e.value)<>'string'
  OR length(e.value#>>'{}')>120 OR (e.value#>>'{}')~'[[:cntrl:]]') THEN RAISE EXCEPTION 'invalid_staff_copilot_filter' USING ERRCODE='22023'; END IF;
 IF coalesce(p_filters->>'page','1')!~'^[1-9][0-9]{0,3}$' THEN RAISE EXCEPTION 'invalid_staff_copilot_page' USING ERRCODE='22023'; END IF;
 page_value:=coalesce(p_filters->>'page','1')::integer;
 IF page_value>1000 THEN RAISE EXCEPTION 'invalid_staff_copilot_page' USING ERRCODE='22023'; END IF;
 offset_value:=(page_value-1)*10; query_text:=btrim(coalesce(p_filters->>'query',''));
 IF p_tool IN ('customer.lookup','pet.lookup','order.lookup','payment.order','points.lookup','ticket.lookup','knowledge.search') AND length(query_text)<3 THEN
  RAISE EXCEPTION 'staff_copilot_query_required' USING ERRCODE='22023'; END IF;
 IF (p_filters?'start_at')<>(p_filters?'end_at') THEN RAISE EXCEPTION 'invalid_staff_copilot_period' USING ERRCODE='22023'; END IF;
 IF p_filters?'start_at' THEN
  BEGIN start_value:=(p_filters->>'start_at')::timestamptz;end_value:=(p_filters->>'end_at')::timestamptz;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RAISE EXCEPTION 'invalid_staff_copilot_period' USING ERRCODE='22023'; END;
  IF NOT isfinite(start_value) OR NOT isfinite(end_value) OR end_value<=start_value OR end_value-start_value>interval '31 days' THEN
   RAISE EXCEPTION 'invalid_staff_copilot_period' USING ERRCODE='22023'; END IF;
 END IF;
 IF p_filters?'category' AND p_filters->>'category' NOT IN ('grooming_spa','pet_hotel','pet_taxi')
 OR p_filters?'day_part' AND p_filters->>'day_part' NOT IN ('morning','afternoon','evening') THEN RAISE EXCEPTION 'invalid_staff_copilot_category' USING ERRCODE='22023'; END IF;
 IF p_filters?'status' AND (p_tool='conversation.list' AND p_filters->>'status' NOT IN ('bot_handling','waiting_agent','agent_handling','resolved','closed','completed','blocked')
 OR p_tool IN ('appointment.list','appointment.search') AND p_filters->>'status' NOT IN ('pending','confirmed','checked_in','in_progress','completed','cancelled','no_show')) THEN
  RAISE EXCEPTION 'invalid_staff_copilot_status' USING ERRCODE='22023'; END IF;
 SELECT full_name INTO person_name FROM public.staff WHERE id=actor;
 IF p_tool IN ('staff.lookup','staff.schedule') AND query_text<>'' AND lower(query_text) NOT IN ('tôi','toi',lower(person_name),actor::text) THEN
  RAISE EXCEPTION 'staff_copilot_self_only' USING ERRCODE='42501'; END IF;
 IF p_tool='conversation.context' THEN
  IF coalesce(p_filters->>'conversationId','')!~*'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
   RAISE EXCEPTION 'invalid_staff_copilot_identity' USING ERRCODE='22023'; END IF;
  source_rows:=public.get_staff_workspace(kind,'',(p_filters->>'conversationId')::uuid,page_value)->'items';
 ELSIF kind IS NOT NULL THEN source_rows:=public.get_staff_workspace(kind,query_text,NULL,page_value)->'items'; END IF;
 IF p_tool='customer.lookup' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r->>'id','code',r->>'customer_code','name',r->>'full_name','phone',r->>'phone_number')),'[]') INTO rows FROM jsonb_array_elements(source_rows) r;
 ELSIF p_tool='pet.lookup' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r->>'id','code',r->>'pet_code','name',r->>'pet_name','customer_id',r->>'customer_id','breed_id',r->>'breed_id',
   'allergy',left(r->>'allergy',300),'safety_note',left(r->>'safety_note',300))),'[]') INTO rows FROM jsonb_array_elements(source_rows) r;
 ELSIF p_tool='order.lookup' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r->>'id','code',r->>'order_code','status',r->>'order_status')),'[]') INTO rows FROM jsonb_array_elements(source_rows) r;
 ELSIF p_tool='points.lookup' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r->>'id','code',r->>'customer_code','name',r->>'full_name',
   'balance',coalesce((SELECT sum(points) FROM public.paw_point_transaction WHERE customer_id=(r->>'id')::uuid),0))),'[]') INTO rows FROM jsonb_array_elements(source_rows) r;
 ELSIF p_tool='catalog.product' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r->>'id','name',r->>'product_name','sku',r->>'sku_variant','price',r->'sale_price','stock',r->'quantity_in_stock')),'[]') INTO rows FROM jsonb_array_elements(source_rows) r;
 ELSIF p_tool='catalog.service' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r->>'id','code',r->>'service_code','name',r->>'service_name','duration_minutes',r->'estimated_duration','category',r->>'category_code')),'[]') INTO rows FROM jsonb_array_elements(source_rows) r;
 ELSIF p_tool='conversation.context' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',r->>'id','sender_type',r->>'sender_type','content',left(r->>'content',800),
   'truncated',length(r->>'content')>800,'created_at',r->>'created_at')),'[]') INTO rows FROM jsonb_array_elements(source_rows) r;
 ELSIF p_tool='staff.lookup' THEN
  IF page_value=1 THEN SELECT coalesce(jsonb_agg(jsonb_build_object('id',r->>'id','name',r->>'full_name','job_title',r->>'job_title','status',r->>'employment_status')),'[]') INTO rows FROM jsonb_array_elements(source_rows) r;
  ELSE rows:='[]'; END IF;
 ELSIF p_tool='staff.schedule' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT id,person_name name,start_at,end_at,schedule_status status,availability_status FROM public.staff_schedule
   WHERE staff_id=actor AND (start_value IS NULL OR start_at<end_value AND end_at>start_value) ORDER BY start_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_tool IN ('appointment.list','appointment.search') THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT a.id,a.appointment_code code,a.appointment_status status,a.scheduled_start_at scheduled_at,a.scheduled_end_at ends_at
   FROM public.appointment a WHERE pawpal_private.work_owns_appointment(a.id) AND (start_value IS NULL OR a.scheduled_start_at>=start_value AND a.scheduled_start_at<end_value)
   AND (NOT p_filters?'status' OR a.appointment_status=p_filters->>'status')
   AND (NOT p_filters?'category' OR EXISTS(SELECT 1 FROM public.appointment_item i JOIN public.service s ON s.id=i.service_id JOIN public.service_category c ON c.id=s.category_id WHERE i.appointment_id=a.id AND c.category_code=p_filters->>'category'))
   AND (NOT p_filters?'day_part' OR CASE WHEN extract(hour FROM a.scheduled_start_at AT TIME ZONE 'Asia/Bangkok')<12 THEN 'morning' WHEN extract(hour FROM a.scheduled_start_at AT TIME ZONE 'Asia/Bangkok')<18 THEN 'afternoon' ELSE 'evening' END=p_filters->>'day_part')
   ORDER BY a.scheduled_start_at DESC,a.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_tool IN ('ticket.open','ticket.lookup') THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT id,ticket_code code,left(subject,250) subject,status,priority FROM public.support_ticket
   WHERE assigned_staff_id=actor AND (start_value IS NULL OR created_at>=start_value AND created_at<end_value)
   AND (p_tool<>'ticket.open' OR status NOT IN ('resolved','closed','cancelled','rejected'))
   AND (p_tool<>'ticket.lookup' OR lower(ticket_code)=lower(query_text) OR id::text=query_text OR strpos(lower(subject),lower(query_text))>0)
   ORDER BY created_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_tool='conversation.list' THEN
  IF p_filters->>'status'='waiting_agent' THEN
   IF query_text<>'' THEN RAISE EXCEPTION 'staff_copilot_queue_filter_forbidden' USING ERRCODE='42501'; END IF;
   SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT id,status,created_at FROM public.chat_conversation WHERE assigned_staff_id IS NULL AND status='waiting_agent'
    AND (start_value IS NULL OR created_at>=start_value AND created_at<end_value) ORDER BY created_at,id LIMIT 10 OFFSET offset_value) t;
  ELSE
   SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT id,status,left(ai_summary,600) summary,updated_at FROM public.chat_conversation WHERE assigned_staff_id=actor
    AND (start_value IS NULL OR updated_at>=start_value AND updated_at<end_value) AND (NOT p_filters?'status' OR status=p_filters->>'status')
    AND (query_text='' OR strpos(lower(coalesce(ai_summary,'')),lower(query_text))>0) ORDER BY updated_at DESC,id LIMIT 10 OFFSET offset_value) t;
  END IF;
 ELSIF p_tool='payment.order' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'code',t.order_code,'total',t.total_amount,'collected',t.collected,'refunded',t.refunded,'net',t.collected-t.refunded,
   'remaining',greatest(t.total_amount-t.collected+t.refunded,0))),'[]') INTO rows FROM (SELECT o.id,o.order_code,coalesce(st.total_amount,0) total_amount,
   coalesce((SELECT sum(amount) FROM public.payment WHERE order_id=o.id AND transaction_status='succeeded'),0) collected,
   coalesce((SELECT sum(r.refunded_amount) FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE p.order_id=o.id AND p.transaction_status='succeeded' AND r.refund_status='succeeded'),0) refunded
   FROM public.sales_order o LEFT JOIN public.sales_order_totals st ON st.order_id=o.id WHERE lower(o.order_code)=lower(query_text) ORDER BY o.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_tool='inventory.low_stock' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT v.id,p.product_name name,v.sku_variant sku,i.quantity_in_stock stock,i.minimum_stock minimum
   FROM public.product_variant v JOIN public.product p ON p.id=v.product_id JOIN public.inventory i ON i.product_variant_id=v.id
   WHERE v.status='active' AND p.status='active' AND i.quantity_in_stock<i.minimum_stock AND (query_text='' OR strpos(lower(p.product_name||' '||v.sku_variant),lower(query_text))>0)
   ORDER BY p.product_name,v.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_tool='hotel.stays' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT h.id,h.booking_code code,h.appointment_id,h.status,h.check_in_at,h.check_out_at,r.room_number
   FROM public.hotel_booking h JOIN public.hotel_room r ON r.id=h.room_id WHERE pawpal_private.work_owns_appointment(h.appointment_id)
   AND (start_value IS NULL OR h.check_in_at<end_value AND h.check_out_at>start_value) AND (query_text='' OR strpos(lower(h.booking_code),lower(query_text))>0)
   ORDER BY h.check_in_at DESC,h.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_tool='taxi.trips' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT id,appointment_id,status,trip_type,outbound_at,return_at,pickup_address,dropoff_address,distance_km
   FROM public.taxi_trip WHERE driver_staff_id=actor AND (start_value IS NULL OR outbound_at>=start_value AND outbound_at<end_value)
   AND (query_text='' OR strpos(lower(pickup_address||' '||dropoff_address),lower(query_text))>0) ORDER BY outbound_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_tool='knowledge.search' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT id,left(question,250) question,left(answer,1200) answer,length(answer)>1200 truncated
   FROM public.chatbot_knowledge_faq WHERE is_active AND strpos(lower(question||' '||answer),lower(query_text))>0 ORDER BY priority DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_tool='offer.list' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]') INTO rows FROM (SELECT id,voucher_code code,type,discount_value,minimum_order_amount,required_points,start_date,end_date,applicable_for
   FROM public.voucher WHERE is_active AND (now() AT TIME ZONE 'Asia/Bangkok')::date BETWEEN start_date AND end_date
   AND (query_text='' OR strpos(lower(voucher_code),lower(query_text))>0) ORDER BY end_date,id LIMIT 10 OFFSET offset_value) t;
 END IF;
 result:=jsonb_build_object('intent',p_tool,'audience','staff','items',coalesce(rows,'[]'::jsonb),'total',jsonb_array_length(coalesce(rows,'[]'::jsonb)),
  'total_is_page',true,'page',page_value,'page_size',10,'scope',p_filters||jsonb_build_object('current_staff',true),
  'source','Dữ liệu phục vụ công việc trong quyền hiện tại','as_of',statement_timestamp(),
  'limitations',jsonb_build_array('Kết quả chỉ gồm một trang tối đa 10 dòng; không phải số liệu tổng hợp toàn cửa hàng.'));
 IF octet_length(result::text)>p_max_bytes THEN RAISE EXCEPTION 'staff_copilot_payload_exceeded' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_staff_copilot(text,jsonb,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.read_staff_copilot(text,jsonb,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
