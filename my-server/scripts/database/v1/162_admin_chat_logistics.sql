BEGIN;
SET LOCAL statement_timeout='5s';SET LOCAL lock_timeout='1s';
CREATE OR REPLACE FUNCTION public.run_admin_chat_logistics(p_lease uuid,p_tool text,p_filters jsonb,p_max_bytes integer DEFAULT 32768)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE rights text[];permission text;requested integer:=1;starts timestamptz;ends timestamptz;q text;result jsonb;
BEGIN
 IF p_max_bytes IS NULL OR p_max_bytes NOT BETWEEN 1 AND 32768 OR p_filters IS NULL OR jsonb_typeof(p_filters)<>'object' OR octet_length(p_filters::text)>2000
 OR EXISTS(SELECT 1 FROM jsonb_each(p_filters)e WHERE e.key NOT IN ('start_at','end_at','query','page') OR jsonb_typeof(e.value)<>'string' OR length(e.value#>>'{}')>120 OR (e.value#>>'{}')~'[[:cntrl:]]') THEN RAISE EXCEPTION 'invalid_logistics_filters' USING ERRCODE='22023'; END IF;
 CASE p_tool
 WHEN 'hotel.availability' THEN rights:=ARRAY['hotel_room.read','hotel_room_type.read','hotel_booking.read'];
 WHEN 'hotel.stays' THEN rights:=ARRAY['hotel_booking.read','hotel_room.read','hotel_room_type.read','appointment.read','pet_profile.read'];
 WHEN 'taxi.trips' THEN rights:=ARRAY['taxi_trip.read','appointment.read','pet_profile.read'];
 ELSE RAISE EXCEPTION 'unsupported_logistics_read' USING ERRCODE='22023'; END CASE;
 FOREACH permission IN ARRAY rights LOOP IF auth.uid() IS NULL OR NOT pawpal_private.has_permission(permission) THEN RAISE EXCEPTION 'logistics_forbidden' USING ERRCODE='42501';END IF;END LOOP;
 starts:=(p_filters->>'start_at')::timestamptz;ends:=(p_filters->>'end_at')::timestamptz;
 IF starts IS NULL OR ends IS NULL OR NOT isfinite(starts) OR NOT isfinite(ends) OR ends<=starts OR ends-starts>interval '31 days' THEN RAISE EXCEPTION 'invalid_logistics_period' USING ERRCODE='22023'; END IF;
 IF p_filters ? 'page' THEN IF p_filters->>'page' !~ '^[1-9][0-9]{0,3}$' THEN RAISE EXCEPTION 'invalid_logistics_page' USING ERRCODE='22023';END IF;requested:=(p_filters->>'page')::integer;END IF;
 q:=btrim(coalesce(p_filters->>'query',''));PERFORM pawpal_private.admit_chat_read_source(p_lease);
 IF p_tool='hotel.availability' THEN
  WITH matched AS MATERIALIZED (
   SELECT r.id,r.room_number code,t.room_type name,t.capacity,
    EXISTS(SELECT 1 FROM public.hotel_booking h WHERE h.room_id=r.id AND h.status NOT IN ('cancelled','closed') AND h.check_in_at<ends AND h.check_out_at>starts) reserved,
    EXISTS(SELECT 1 FROM public.hotel_booking h WHERE h.room_id=r.id AND h.status='checked_in') occupied
   FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id
   WHERE r.status IN ('active','available') AND t.status='active'
   AND (q='' OR r.room_number=q OR public.admin_sales_search_text(t.room_type)=public.admin_sales_search_text(q))
  ),bounds AS (SELECT count(*) total,count(*) FILTER(WHERE NOT reserved AND NOT occupied) available,least(requested,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched),
  rows AS(SELECT code,name,capacity,reserved,occupied,NOT reserved AND NOT occupied AS available FROM matched ORDER BY code,id LIMIT 10 OFFSET (SELECT (page-1)*10 FROM bounds))
  SELECT jsonb_build_object('total',total,'available',available,'unavailable',total-available,'page',page,'pages',greatest(1,ceil(total/10.0)::integer),'items',coalesce((SELECT jsonb_agg(to_jsonb(rows)) FROM rows),'[]')) INTO result FROM bounds;
 ELSIF p_tool='hotel.stays' THEN
  WITH matched AS MATERIALIZED (
   SELECT h.id,h.booking_code code,a.appointment_code appointment_code,left(p.pet_name,150) name,r.room_number room,t.room_type room_type,h.status,h.check_in_at,h.check_out_at,h.daily_price price,t.billing_minutes
   FROM public.hotel_booking h JOIN public.appointment a ON a.id=h.appointment_id LEFT JOIN public.pet_profile p ON p.id=a.pet_id
   JOIN public.hotel_room r ON r.id=h.room_id JOIN public.hotel_room_type t ON t.id=r.room_type_id
   WHERE h.check_in_at<ends AND h.check_out_at>starts AND (q='' OR h.booking_code=q OR a.appointment_code=q OR r.room_number=q)
  ),bounds AS(SELECT count(*) total,least(requested,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched),
  rows AS(SELECT code,appointment_code,name,room,room_type,status,check_in_at,check_out_at,price,billing_minutes FROM matched ORDER BY check_in_at,id LIMIT 10 OFFSET(SELECT (page-1)*10 FROM bounds))
  SELECT jsonb_build_object('total',total,'page',page,'pages',greatest(1,ceil(total/10.0)::integer),'items',coalesce((SELECT jsonb_agg(to_jsonb(rows)) FROM rows),'[]')) INTO result FROM bounds;
 ELSE
  WITH matched AS MATERIALIZED (
   SELECT tr.id,a.appointment_code code,left(p.pet_name,150) name,tr.status,tr.trip_type,tr.distance_km distance,tr.quoted_amount price,
    coalesce(tr.outbound_at,a.scheduled_start_at) outbound_at,tr.return_at,left(tr.pickup_address,300) pickup,left(tr.dropoff_address,300) dropoff
   FROM public.taxi_trip tr JOIN public.appointment a ON a.id=tr.appointment_id LEFT JOIN public.pet_profile p ON p.id=a.pet_id
   WHERE coalesce(tr.outbound_at,a.scheduled_start_at)>=starts AND coalesce(tr.outbound_at,a.scheduled_start_at)<ends AND (q='' OR a.appointment_code=q)
  ),bounds AS(SELECT count(*) total,least(requested,greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched),
  rows AS(SELECT code,name,status,trip_type,distance,price,outbound_at,return_at,pickup,dropoff FROM matched ORDER BY outbound_at,id LIMIT 10 OFFSET(SELECT (page-1)*10 FROM bounds))
  SELECT jsonb_build_object('total',total,'page',page,'pages',greatest(1,ceil(total/10.0)::integer),'items',coalesce((SELECT jsonb_agg(to_jsonb(rows)) FROM rows),'[]')) INTO result FROM bounds;
 END IF;
 result:=result||jsonb_build_object('intent',p_tool,'scope',p_filters,'source','Supabase / caller RLS','as_of',clock_timestamp(),'limitations',jsonb_build_array(
  CASE p_tool WHEN 'hotel.availability' THEN 'Số phòng vật lý đang hoạt động có thể nhận trọn khoảng đã hỏi theo giữ phòng và trạng thái đang ở; không phải số bé tối đa hoặc xác nhận đặt phòng. Kiểm tra lại khi lưu.'
  WHEN 'hotel.stays' THEN 'Lượt lưu trú giao khoảng thời gian đã hỏi, gồm mọi trạng thái; giá cấu hình ghi trên phiếu, không tự tính tổng hoặc thay thế báo giá.'
  ELSE 'Chuyến có giờ đi nằm trong kỳ; nếu chưa có giờ đi thì dùng giờ lịch dự kiến. Không suy khả dụng của tài xế hoặc tự điều phối.' END));
 IF octet_length(result::text)>p_max_bytes THEN RAISE EXCEPTION 'logistics_payload_limit' USING ERRCODE='54000';END IF;RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.run_admin_chat_logistics(uuid,text,jsonb,integer) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.run_admin_chat_logistics(uuid,text,jsonb,integer) TO authenticated;
NOTIFY pgrst,'reload schema';COMMIT;
