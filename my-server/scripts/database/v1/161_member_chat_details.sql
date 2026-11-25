BEGIN;
SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='1s';
-- Closed owner projection, like the existing customer support/logistics gateways.
-- No raw transcript, staff contact, internal notes, or customer_id input.
CREATE OR REPLACE FUNCTION public.read_member_chat_details(p_request jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE owner_id uuid; kind text:=p_request->>'kind'; page_no integer:=0; target uuid; code text:=p_request->>'code';
 rows jsonb:='[]'; result jsonb; more boolean;
BEGIN
 IF p_request IS NULL OR jsonb_typeof(p_request)<>'object' OR octet_length(p_request::text)>1000
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_request) k WHERE k NOT IN ('kind','page','id','code'))
 OR jsonb_typeof(p_request->'kind') IS DISTINCT FROM 'string' OR kind NOT IN ('point_history','wallet','care','hotel','taxi','support')
 THEN RAISE EXCEPTION 'invalid_member_details' USING ERRCODE='22023'; END IF;
 IF p_request ? 'page' THEN
  IF jsonb_typeof(p_request->'page') IS DISTINCT FROM 'number' OR (p_request->>'page') !~ '^[0-9]{1,2}$' THEN RAISE EXCEPTION 'invalid_member_page' USING ERRCODE='22023'; END IF;
  page_no:=(p_request->>'page')::integer;
 END IF;
 IF p_request ? 'id' THEN
  IF jsonb_typeof(p_request->'id') IS DISTINCT FROM 'string' OR (p_request->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'invalid_member_id' USING ERRCODE='22023'; END IF;
  target:=(p_request->>'id')::uuid;
 END IF;
 IF (p_request ? 'code' AND (jsonb_typeof(p_request->'code') IS DISTINCT FROM 'string' OR code !~ '^[A-Z0-9][A-Z0-9-]{2,63}$'))
 OR (target IS NOT NULL AND code IS NOT NULL) OR (kind='point_history' AND (target IS NOT NULL OR code IS NOT NULL)) THEN RAISE EXCEPTION 'invalid_member_filter' USING ERRCODE='22023'; END IF;
 -- Definer role must never make the caller identity optional.
 IF auth.role() IS DISTINCT FROM 'authenticated' THEN RAISE EXCEPTION 'member_session_required' USING ERRCODE='42501'; END IF;
 owner_id:=pawpal_private.admit_member_chat_read();
 IF kind='point_history' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'points',x.points,'description',left(x.description,400),'created_at',x.created_at) ORDER BY x.sequence_no DESC,x.id DESC),'[]') INTO rows
  FROM(SELECT id,points,description,created_at,sequence_no FROM public.paw_point_transaction WHERE customer_id=owner_id ORDER BY sequence_no DESC,id DESC LIMIT 6 OFFSET page_no*5) x;
 ELSIF kind='wallet' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'code',v.voucher_code,'name',left(v.voucher_name,180),'status',x.voucher_status,
   'expired_at',x.expired_at,'start_date',v.start_date,'end_date',v.end_date,'is_active',v.is_active,
   'discount_type',v.type,'discount_value',v.discount_value,'minimum_order_amount',v.minimum_order_amount,
   'applicable_for',left(v.applicable_for,100)) ORDER BY x.acquired_at DESC,x.id DESC),'[]') INTO rows
  FROM(SELECT * FROM public.customer_voucher WHERE customer_id=owner_id AND (target IS NULL OR id=target)
   AND (code IS NULL OR voucher_id IN(SELECT id FROM public.voucher WHERE voucher_code=code))
   ORDER BY acquired_at DESC,id DESC LIMIT 6 OFFSET page_no*5) x JOIN public.voucher v ON v.id=x.voucher_id;
 ELSIF kind='care' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'appointment_id',x.appointment_id,'code',x.appointment_code,
   'pet',left(x.pet_name,150),'action',left(x.action_name_snapshot,180),'description',left(x.description,600),
   'condition',left(x.observed_condition,400),'recorded_at',x.recorded_at) ORDER BY x.recorded_at DESC,x.id DESC),'[]') INTO rows
  FROM(SELECT l.id,l.appointment_id,a.appointment_code,p.pet_name,l.action_name_snapshot,l.description,l.observed_condition,l.recorded_at
   FROM public.care_log l JOIN public.appointment a ON a.id=l.appointment_id AND a.customer_id=owner_id
   LEFT JOIN public.pet_profile p ON p.id=a.pet_id AND p.customer_id=owner_id
   WHERE (target IS NULL OR a.id=target) AND (code IS NULL OR a.appointment_code=code OR p.pet_code=code)
   ORDER BY l.recorded_at DESC,l.id DESC LIMIT 6 OFFSET page_no*5) x;
 ELSIF kind='hotel' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'appointment_id',x.appointment_id,'code',x.appointment_code,
   'booking_code',x.booking_code,'pet',left(x.pet_name,150),'room',left(r.room_number,80),'room_type',left(t.room_type,100),
   'check_in_at',x.check_in_at,'check_out_at',x.check_out_at,'status',x.status,'daily_price',x.daily_price,
   'diet',left(x.special_diet_notes,400),'care',left(x.care_notes,400)) ORDER BY x.check_in_at DESC,x.id DESC),'[]') INTO rows
  FROM(SELECT h.*,a.appointment_code,p.pet_name FROM public.hotel_booking h JOIN public.appointment a ON a.id=h.appointment_id AND a.customer_id=owner_id
   LEFT JOIN public.pet_profile p ON p.id=a.pet_id AND p.customer_id=owner_id
   WHERE (target IS NULL OR a.id=target) AND (code IS NULL OR a.appointment_code=code OR h.booking_code=code)
   ORDER BY h.check_in_at DESC,h.id DESC LIMIT 6 OFFSET page_no*5) x
   LEFT JOIN public.hotel_room r ON r.id=x.room_id LEFT JOIN public.hotel_room_type t ON t.id=r.room_type_id;
 ELSIF kind='taxi' THEN
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'appointment_id',x.appointment_id,'code',x.appointment_code,
   'pet',left(x.pet_name,150),'pickup',left(x.pickup_address,400),'dropoff',left(x.dropoff_address,400),'distance',x.distance_km,
   'trip_type',x.trip_type,'outbound_at',x.outbound_at,'return_at',x.return_at,'price',x.quoted_amount,'status',x.status) ORDER BY x.created_at DESC,x.id DESC),'[]') INTO rows
  FROM(SELECT tr.*,a.appointment_code,p.pet_name FROM public.taxi_trip tr JOIN public.appointment a ON a.id=tr.appointment_id AND a.customer_id=owner_id
   LEFT JOIN public.pet_profile p ON p.id=a.pet_id AND p.customer_id=owner_id
   WHERE (target IS NULL OR a.id=target) AND (code IS NULL OR a.appointment_code=code)
   ORDER BY tr.created_at DESC,tr.id DESC LIMIT 6 OFFSET page_no*5) x;
 ELSE
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',x.id,'code',x.ticket_code,'subject',left(x.subject,180),'status',x.status,
   'description',left(x.description,600),'created_at',x.created_at,'resolution',CASE WHEN x.status IN ('resolved','closed','completed') THEN left(x.resolution_note,600) END,
   'latest_reply',(SELECT left(m.content,600) FROM public.support_ticket_message m WHERE m.ticket_id=x.id AND NOT m.is_internal
    AND m.sender_type NOT IN ('system','internal_note') ORDER BY m.created_at DESC,m.id DESC LIMIT 1)) ORDER BY x.created_at DESC,x.id DESC),'[]') INTO rows
  FROM(SELECT t.* FROM public.support_ticket t WHERE t.customer_id=owner_id AND (target IS NULL OR t.id=target) AND (code IS NULL OR t.ticket_code=code)
   ORDER BY t.created_at DESC,t.id DESC LIMIT 6 OFFSET page_no*5) x;
 END IF;
 more:=jsonb_array_length(rows)>5;
 SELECT coalesce(jsonb_agg(value ORDER BY ordinality),'[]') INTO rows FROM jsonb_array_elements(rows) WITH ORDINALITY WHERE ordinality<=5;
 result:=jsonb_build_object('customer_id',owner_id,'kind',kind,'page',page_no,'items',rows,'has_more',more,'as_of',clock_timestamp());
 IF octet_length(result::text)>16384 THEN RAISE EXCEPTION 'member_details_too_large' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_member_chat_details(jsonb) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.read_member_chat_details(jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
