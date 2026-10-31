BEGIN;
SET LOCAL statement_timeout='5s'; SET LOCAL lock_timeout='1s';
-- Only identity admission is elevated. Business projections below retain caller RLS.
CREATE OR REPLACE FUNCTION pawpal_private.admit_member_chat_read()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE owner_id uuid;
BEGIN
 IF auth.uid() IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'member_session_required' USING ERRCODE='42501'; END IF;
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND customer_status='active' AND pawpal_private.owns_customer(id);
 IF owner_id IS NULL THEN RAISE EXCEPTION 'member_session_required' USING ERRCODE='42501'; END IF;
 PERFORM pawpal_private.admit_chat_server_read();
 RETURN owner_id;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.admit_member_chat_read() FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION pawpal_private.admit_member_chat_read() TO authenticated;

-- Totals views depend on adjustment/redemption tables that are intentionally not
-- broadly readable by members. Project only totals of <=6 owned selected documents.
CREATE OR REPLACE FUNCTION pawpal_private.member_chat_totals(p_kind text,p_ids uuid[])
RETURNS TABLE(document_id uuid,total numeric) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE owner_id uuid;
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN ('appointments','orders') OR p_ids IS NULL OR cardinality(p_ids)>6 THEN RAISE EXCEPTION 'invalid_member_totals' USING ERRCODE='22023'; END IF;
 owner_id:=pawpal_private.admit_member_chat_read();
 IF p_kind='orders' THEN
  RETURN QUERY SELECT o.id,t.total_amount FROM public.sales_order o JOIN public.sales_order_totals t ON t.order_id=o.id WHERE o.customer_id=owner_id AND o.id=ANY(p_ids);
 ELSE
  RETURN QUERY SELECT a.id,t.total_price FROM public.appointment a JOIN public.appointment_totals t ON t.appointment_id=a.id WHERE a.customer_id=owner_id AND a.id=ANY(p_ids);
 END IF;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.member_chat_totals(text,uuid[]) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION pawpal_private.member_chat_totals(text,uuid[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.read_member_chat_context(p_request jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE owner_id uuid; kind text:=p_request->>'kind'; page_no integer:=0; mode text:=coalesce(p_request->>'mode','all');
 code text:=p_request->>'code'; target uuid; pet_filter text:=p_request->>'name'; rows jsonb:='[]'; result jsonb; more boolean;
BEGIN
 IF p_request IS NULL OR jsonb_typeof(p_request)<>'object' OR octet_length(p_request::text)>1000
 OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_request) k WHERE k NOT IN ('kind','page','mode','code','id','name'))
 OR kind IS NULL OR kind NOT IN ('appointments','orders','pets','loyalty') OR jsonb_typeof(p_request->'kind')<>'string'
 THEN RAISE EXCEPTION 'invalid_member_chat_request' USING ERRCODE='22023'; END IF;
 IF p_request ? 'page' THEN
  IF jsonb_typeof(p_request->'page')<>'number' OR (p_request->>'page') !~ '^[0-9]{1,2}$' THEN RAISE EXCEPTION 'invalid_member_page' USING ERRCODE='22023'; END IF;
  page_no:=(p_request->>'page')::integer;
 END IF;
 IF p_request ? 'id' THEN
  IF jsonb_typeof(p_request->'id')<>'string' OR (p_request->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN RAISE EXCEPTION 'invalid_member_id' USING ERRCODE='22023'; END IF;
  target:=(p_request->>'id')::uuid;
 END IF;
 IF p_request ? 'code' AND (jsonb_typeof(p_request->'code')<>'string' OR code !~ '^[A-Z0-9][A-Z0-9-]{2,63}$')
 OR p_request ? 'name' AND (kind<>'pets' OR jsonb_typeof(p_request->'name')<>'string' OR length(btrim(pet_filter)) NOT BETWEEN 1 AND 80)
 OR (target IS NOT NULL AND code IS NOT NULL) OR (pet_filter IS NOT NULL AND (code IS NOT NULL OR target IS NOT NULL))
 OR (p_request ? 'mode' AND (kind<>'appointments' OR jsonb_typeof(p_request->'mode')<>'string' OR mode NOT IN ('all','upcoming','past','today','tomorrow')))
 OR (kind='loyalty' AND p_request-ARRAY['kind','page']<>'{}'::jsonb)
 OR (kind='loyalty' AND page_no<>0) THEN RAISE EXCEPTION 'invalid_member_filter' USING ERRCODE='22023'; END IF;
 owner_id:=pawpal_private.admit_member_chat_read();
 IF kind='loyalty' THEN
  SELECT jsonb_build_array(jsonb_build_object('points',coalesce((SELECT sum(points) FROM public.paw_point_transaction WHERE customer_id=owner_id),0),
   'tier',(SELECT t.tier_name FROM public.customer_membership m JOIN public.membership_tier t ON t.id=m.membership_tier_id WHERE m.customer_id=owner_id))) INTO rows;
 ELSIF kind='pets' THEN
  WITH chosen AS (SELECT p.* FROM public.pet_profile p WHERE p.customer_id=owner_id
   AND (target IS NULL OR p.id=target) AND (code IS NULL OR p.pet_code=code)
   AND (pet_filter IS NULL OR public.public_chat_search_text(p.pet_name)=public.public_chat_search_text(btrim(pet_filter)))
   ORDER BY p.created_at DESC,p.id DESC LIMIT 6 OFFSET page_no*5)
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'code',p.pet_code,'name',left(p.pet_name,150),'status',p.status,
   'species',left(s.species_name,100),'breed',left(b.breed_name,100),'birth_date',p.date_of_birth,'gender',p.gender,
   'weight',w.weight,'measured_at',w.measured_at,'allergy',left(p.allergy,300),'safety_note',left(p.safety_note,300)) ORDER BY p.created_at DESC,p.id DESC),'[]') INTO rows
  FROM chosen p LEFT JOIN public.pet_breed b ON b.id=p.breed_id LEFT JOIN public.pet_species s ON s.id=b.species_id
  LEFT JOIN LATERAL(SELECT weight,measured_at FROM public.pet_weight_history WHERE pet_id=p.id ORDER BY measured_at DESC,id DESC LIMIT 1) w ON true;
 ELSIF kind='appointments' THEN
  WITH chosen AS MATERIALIZED (SELECT a.* FROM public.appointment a WHERE a.customer_id=owner_id
   AND (target IS NULL OR a.id=target) AND (code IS NULL OR a.appointment_code=code)
   AND (mode='all' OR mode='upcoming' AND a.scheduled_start_at>=now() AND a.appointment_status NOT IN ('cancelled','completed')
    OR mode='past' AND a.scheduled_start_at<now()
    OR mode IN ('today','tomorrow') AND a.scheduled_start_at>=(((now() AT TIME ZONE 'Asia/Bangkok')::date+CASE mode WHEN 'tomorrow' THEN 1 ELSE 0 END)::timestamp AT TIME ZONE 'Asia/Bangkok')
     AND a.scheduled_start_at<(((now() AT TIME ZONE 'Asia/Bangkok')::date+CASE mode WHEN 'tomorrow' THEN 2 ELSE 1 END)::timestamp AT TIME ZONE 'Asia/Bangkok'))
   ORDER BY CASE WHEN mode IN ('upcoming','today','tomorrow') THEN a.scheduled_start_at END ASC,
    CASE WHEN mode IN ('all','past') THEN a.scheduled_start_at END DESC,a.id DESC LIMIT 6 OFFSET page_no*5),
  totals AS MATERIALIZED (SELECT * FROM pawpal_private.member_chat_totals('appointments',coalesce((SELECT array_agg(id) FROM chosen),'{}'::uuid[])))
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'code',a.appointment_code,'status',a.appointment_status,
   'start_at',a.scheduled_start_at,'end_at',a.scheduled_end_at,'pet',left(p.pet_name,150),'service',i.name,
   'total',t.total) ORDER BY CASE WHEN mode IN ('upcoming','today','tomorrow') THEN a.scheduled_start_at END ASC,
   CASE WHEN mode IN ('all','past') THEN a.scheduled_start_at END DESC,a.id DESC),'[]') INTO rows
  FROM chosen a LEFT JOIN public.pet_profile p ON p.id=a.pet_id AND p.customer_id=owner_id
  LEFT JOIN totals t ON t.document_id=a.id
  LEFT JOIN LATERAL(SELECT left(name_snapshot,180) AS name FROM public.appointment_item WHERE appointment_id=a.id AND is_primary ORDER BY id LIMIT 1) i ON true;
 ELSE
  WITH chosen AS MATERIALIZED (SELECT o.* FROM public.sales_order o WHERE o.customer_id=owner_id
   AND (target IS NULL OR o.id=target) AND (code IS NULL OR o.order_code=code)
   ORDER BY o.created_at DESC,o.id DESC LIMIT 6 OFFSET page_no*5),
  totals AS MATERIALIZED (SELECT * FROM pawpal_private.member_chat_totals('orders',coalesce((SELECT array_agg(id) FROM chosen),'{}'::uuid[])))
  SELECT coalesce(jsonb_agg(jsonb_build_object('id',o.id,'code',o.order_code,'status',o.order_status,'shipping_status',o.shipping_status,
   'created_at',o.created_at,'total',t.total,
   'paid',coalesce((SELECT sum(amount) FROM public.payment WHERE order_id=o.id AND customer_id=owner_id AND transaction_status='succeeded'),0),
   'refunded',coalesce((SELECT sum(r.refunded_amount) FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE p.order_id=o.id AND p.customer_id=owner_id AND p.transaction_status='succeeded' AND r.refund_status='succeeded'),0)) ORDER BY o.created_at DESC,o.id DESC),'[]') INTO rows
  FROM chosen o LEFT JOIN totals t ON t.document_id=o.id;
 END IF;
 more:=jsonb_array_length(rows)>5;
 SELECT coalesce(jsonb_agg(value ORDER BY ordinality),'[]') INTO rows FROM jsonb_array_elements(rows) WITH ORDINALITY WHERE ordinality<=5;
 result:=jsonb_build_object('customer_id',owner_id,'kind',kind,'page',page_no,'items',rows,'has_more',more,'as_of',clock_timestamp());
 IF octet_length(result::text)>16384 THEN RAISE EXCEPTION 'member_chat_context_too_large' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.read_member_chat_context(jsonb) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION public.read_member_chat_context(jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
