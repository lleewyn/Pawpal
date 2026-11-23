BEGIN;
CREATE OR REPLACE FUNCTION public.get_staff_workspace(p_kind text, p_query text DEFAULT ''::text, p_id uuid DEFAULT NULL::uuid, p_page integer DEFAULT 1)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE actor uuid:=pawpal_private.work_actor(); rows jsonb; offset_value integer; query_text text:=btrim(coalesce(p_query,''));
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'work_access_forbidden' USING ERRCODE='42501'; END IF;
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 1000 OR length(query_text)>120 THEN RAISE EXCEPTION 'invalid_work_query' USING ERRCODE='22023'; END IF;
 offset_value:=(p_page-1)*10;
 IF p_kind='self' THEN
  SELECT jsonb_build_array(jsonb_build_object('id',id,'full_name',full_name,'phone_number',phone_number,'email',email,'job_title',job_title,'specialization',specialization,'employment_status',employment_status)) INTO rows FROM public.staff WHERE id=actor;
 ELSIF p_kind='schedule' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,start_at,end_at,availability_status,schedule_status,reason FROM public.staff_schedule WHERE staff_id=actor ORDER BY start_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='assessment' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,assessment_date,assessment_type,score,result,note FROM public.staff_assessment WHERE staff_id=actor ORDER BY assessment_date DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='appointments' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT a.id,a.appointment_code,a.customer_id,a.pet_id,a.scheduled_start_at,a.scheduled_end_at,a.appointment_status,a.updated_at,
 (SELECT p.pet_name FROM public.pet_profile p WHERE p.id=a.pet_id) AS pet_name,
 (SELECT p.allergy FROM public.pet_profile p WHERE p.id=a.pet_id) AS pet_allergy,
 (SELECT p.safety_note FROM public.pet_profile p WHERE p.id=a.pet_id) AS pet_safety_note,
 (SELECT p.routine FROM public.pet_profile p WHERE p.id=a.pet_id) AS pet_routine
 FROM public.appointment a WHERE pawpal_private.work_owns_appointment(a.id) AND (p_id IS NULL OR a.id=p_id) ORDER BY a.scheduled_start_at DESC,a.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='customers' THEN
  IF p_id IS NULL AND length(query_text)<3 THEN RAISE EXCEPTION 'work_search_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT c.id,c.customer_code,c.contact_email,c.updated_at,p.full_name,p.gender,p.date_of_birth,
   (SELECT membership_tier_id FROM public.customer_membership WHERE customer_id=c.id) membership_tier_id,
   (SELECT phone_number FROM public.customer_phone WHERE customer_id=c.id AND is_primary LIMIT 1) phone_number
   FROM public.customer c JOIN public.customer_profile p ON p.customer_id=c.id WHERE (p_id IS NULL OR c.id=p_id)
   AND (p_id IS NOT NULL OR strpos(lower(p.full_name||' '||c.customer_code),lower(query_text))>0 OR EXISTS(SELECT 1 FROM public.customer_phone ph WHERE ph.customer_id=c.id AND strpos(ph.phone_number,query_text)>0))
   ORDER BY p.full_name,c.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='addresses' THEN
  IF p_id IS NULL THEN RAISE EXCEPTION 'work_customer_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,customer_id,receiver_name,receiver_phone,province,street_address,postal_code,is_default
   FROM public.customer_address WHERE customer_id=p_id ORDER BY is_default DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='pets' THEN
  IF p_id IS NULL AND length(query_text)<3 THEN RAISE EXCEPTION 'work_search_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT p.id,p.pet_code,p.customer_id,p.pet_name,p.gender,p.date_of_birth,p.color,p.routine,p.allergy,p.safety_note,p.breed_id,p.updated_at, (SELECT b.breed_name FROM public.pet_breed b WHERE b.id=p.breed_id) AS breed_name,
 (SELECT b.species_id FROM public.pet_breed b WHERE b.id=p.breed_id) AS pet_species_id,
 (SELECT s.species_name FROM public.pet_breed b JOIN public.pet_species s ON s.id=b.species_id WHERE b.id=p.breed_id) AS species_name,
   (SELECT weight FROM public.pet_current_weight WHERE pet_id=p.id) current_weight FROM public.pet_profile p
   WHERE (p_id IS NULL OR p.id=p_id OR p.customer_id=p_id) AND (p_id IS NOT NULL OR strpos(lower(p.pet_name||' '||p.pet_code),lower(query_text))>0) ORDER BY p.pet_name,p.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='stock' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT v.id,v.product_id,p.product_name,v.sku_variant,v.sale_price,coalesce(i.quantity_in_stock,0) quantity_in_stock
   FROM public.product_variant v JOIN public.product p ON p.id=v.product_id LEFT JOIN public.inventory i ON i.product_variant_id=v.id
   WHERE v.status='active' AND p.status='active' AND (query_text='' OR strpos(lower(p.product_name||' '||v.sku_variant),lower(query_text))>0)
   ORDER BY p.product_name,v.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='services' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT s.id,s.service_code,s.service_name,s.estimated_duration,c.category_code,s.staff_level_required_id
   FROM public.service s JOIN public.service_category c ON c.id=s.category_id WHERE s.status='active'
   AND (query_text='' OR strpos(lower(s.service_name||' '||s.service_code),lower(query_text))>0) ORDER BY s.service_name,s.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='service_prices' THEN
  IF p_id IS NULL THEN RAISE EXCEPTION 'work_service_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,service_id,weight_from,weight_to,unit_price,duration_minutes
   FROM public.service_price_matrix WHERE service_id=p_id AND status='active' AND effective_from<=now() AND (effective_to IS NULL OR effective_to>now()) ORDER BY weight_from,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='breeds' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT b.id,b.breed_name,b.species_id,s.species_name
   FROM public.pet_breed b JOIN public.pet_species s ON s.id=b.species_id WHERE b.is_active AND s.is_active AND (query_text='' OR strpos(lower(b.breed_name),lower(query_text))>0) ORDER BY b.breed_name,b.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='points' THEN
  IF p_id IS NULL THEN RAISE EXCEPTION 'work_customer_required' USING ERRCODE='22023'; END IF;
  SELECT jsonb_build_array(jsonb_build_object('customer_id',p_id,'points',coalesce(sum(points),0))) INTO rows FROM public.paw_point_transaction WHERE customer_id=p_id;
 ELSIF p_kind='offers' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,voucher_code,type,discount_value,minimum_order_amount,required_points,start_date,end_date,applicable_for
   FROM public.voucher WHERE is_active AND (now() AT TIME ZONE 'Asia/Bangkok')::date BETWEEN start_date AND end_date ORDER BY end_date,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='payment_methods' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,name FROM public.payment_method_config WHERE available AND fee=0 AND name IN ('Tiền mặt','Chuyển khoản ngân hàng','Quét mã VietQR') ORDER BY name,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='service_items' THEN
  IF NOT pawpal_private.work_owns_appointment(p_id) THEN RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT i.id,i.appointment_id,i.service_id,i.name_snapshot,i.staff_id,i.status,i.updated_at
   FROM public.appointment_item i WHERE i.appointment_id=p_id AND (i.staff_id=actor OR i.staff_id IS NULL AND EXISTS(SELECT 1 FROM public.appointment WHERE id=p_id AND staff_id=actor))
   ORDER BY i.is_primary DESC,i.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='service_records' THEN
  IF NOT pawpal_private.work_owns_appointment(p_id) THEN RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,record_type,revision_no,recorded_at,condition_note,safety_note_snapshot,allergy_note_snapshot,customer_confirmation_status
   FROM public.appointment_record WHERE appointment_id=p_id ORDER BY recorded_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='care_logs' THEN
  IF NOT pawpal_private.work_owns_appointment(p_id) THEN RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,action_name_snapshot,description,observed_condition,recorded_by,recorded_at,updated_at
   FROM public.care_log WHERE appointment_id=p_id ORDER BY recorded_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='hotel_rooms' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT r.id,r.room_number,r.room_type_id,t.room_type,t.daily_price,t.billing_minutes
   FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id WHERE r.status IN ('active','available') AND t.status='active' ORDER BY r.room_number,r.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='hotel_stays' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT h.id,h.appointment_id,h.booking_code,h.room_id,h.check_in_at,h.check_out_at,h.status,h.special_diet_notes,h.care_notes,h.updated_at,h.daily_price,(SELECT room_number FROM public.hotel_room WHERE id=h.room_id) room_number,(SELECT t.room_type FROM public.hotel_room r JOIN public.hotel_room_type t ON t.id=r.room_type_id WHERE r.id=h.room_id) room_type,(SELECT staff_id FROM public.appointment WHERE id=h.appointment_id) lead_staff_id
   FROM public.hotel_booking h WHERE pawpal_private.work_owns_appointment(h.appointment_id) AND (p_id IS NULL OR h.appointment_id=p_id) ORDER BY h.check_in_at DESC,h.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='taxi_prices' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,distance_from,distance_to,weight_from,weight_to,base_price,surcharge FROM public.taxi_price_rule
   WHERE status='active' AND effective_from<=now() AND (effective_to IS NULL OR effective_to>now()) ORDER BY distance_from,weight_from,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='taxi_trips' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,appointment_id,pickup_address,dropoff_address,distance_km,trip_type,outbound_at,return_at,status,updated_at
   FROM public.taxi_trip WHERE driver_staff_id=actor AND (p_id IS NULL OR appointment_id=p_id) ORDER BY outbound_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='order_lines' THEN
  IF p_id IS NULL THEN RAISE EXCEPTION 'work_order_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,order_id,product_name_snapshot,sku_snapshot,quantity,unit_price,discount_amount
   FROM public.sales_order_detail WHERE order_id=p_id ORDER BY id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='orders' THEN
  IF p_id IS NULL AND length(query_text)<3 THEN RAISE EXCEPTION 'work_search_required' USING ERRCODE='22023'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT o.id,o.order_code,o.customer_id,o.order_status,o.updated_at FROM public.sales_order o
   WHERE (p_id IS NOT NULL AND (o.id=p_id OR o.customer_id=p_id)) OR (p_id IS NULL AND lower(o.order_code)=lower(query_text)) ORDER BY o.created_at DESC,o.id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='chat_queue' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,status,created_at,updated_at FROM public.chat_conversation WHERE assigned_staff_id IS NULL AND status='waiting_agent' ORDER BY created_at,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='conversations' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,customer_id,status,ai_summary,internal_note,updated_at FROM public.chat_conversation WHERE assigned_staff_id=actor AND (p_id IS NULL OR id=p_id) ORDER BY updated_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='messages' THEN
  IF NOT EXISTS(SELECT 1 FROM public.chat_conversation WHERE id=p_id AND assigned_staff_id=actor) THEN RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,sender_type,content,created_at FROM public.chat_message WHERE conversation_id=p_id ORDER BY created_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='complaints' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT st.id,st.ticket_code,st.customer_id,st.subject,st.status,st.priority,st.description,st.updated_at,st.order_id,st.appointment_id,st.resolution_type,st.resolution_note,st.approved_amount,st.resolved_by,st.resolution_announced_at,st.resolution_started_at,st.proposal_rejected_at,(SELECT o.order_code FROM public.sales_order o WHERE o.id=st.order_id AND o.customer_id=st.customer_id) linked_order_code,(SELECT a.appointment_code FROM public.appointment a WHERE a.id=st.appointment_id AND a.customer_id=st.customer_id) linked_appointment_code FROM public.support_ticket st WHERE assigned_staff_id=actor AND (p_id IS NULL OR id=p_id) ORDER BY created_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSIF p_kind='complaint_messages' THEN
  IF NOT EXISTS(SELECT 1 FROM public.support_ticket WHERE id=p_id AND assigned_staff_id=actor) THEN RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT id,sender_type,content,is_internal,created_at FROM public.support_ticket_message
   WHERE ticket_id=p_id ORDER BY created_at DESC,id LIMIT 10 OFFSET offset_value) t;
 ELSE RAISE EXCEPTION 'unsupported_work_kind' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('kind',p_kind,'page',p_page,'items',coalesce(rows,'[]'::jsonb));
END $function$
;
NOTIFY pgrst,'reload schema';
COMMIT;
