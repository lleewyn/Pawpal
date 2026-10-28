BEGIN;
-- Same four transaction slots as migration136; no polling or growing queue.
CREATE OR REPLACE FUNCTION pawpal_private.admit_chat_panel_read()
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE slot integer;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('chat_conversation.read') THEN RAISE EXCEPTION 'chat_panel_forbidden' USING ERRCODE='42501'; END IF;
 FOR slot IN 1..4 LOOP
  IF pg_try_advisory_xact_lock(hashtext('pawpal_chat_read_source_v1'),slot) THEN RETURN; END IF;
 END LOOP;
 RAISE EXCEPTION 'chat_read_source_busy' USING ERRCODE='PT429';
END $$;

CREATE OR REPLACE FUNCTION public.get_admin_chat_inbox_view(p_query text DEFAULT '',p_filter text DEFAULT 'all',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb; enriched jsonb;
BEGIN
 IF p_query IS NULL OR length(p_query)>200 OR p_filter IS NULL OR p_filter NOT IN ('all','urgent','active') OR p_page IS NULL OR p_page<1 THEN RAISE EXCEPTION 'invalid_chat_page' USING ERRCODE='22023'; END IF;
 PERFORM pawpal_private.admit_chat_panel_read();
 IF NOT pawpal_private.has_permission('customer.read') THEN RAISE EXCEPTION 'chat_inbox_forbidden' USING ERRCODE='42501'; END IF;
 result:=public.get_admin_chat_inbox_page(p_query,p_filter,p_page);
 SELECT coalesce(jsonb_agg(r.value||jsonb_build_object('customer_profile',
  jsonb_build_object('full_name',(SELECT full_name FROM public.customer_profile WHERE customer_id=(r.value->>'customer_id')::uuid LIMIT 1),
  'email',(SELECT contact_email FROM public.customer WHERE id=(r.value->>'customer_id')::uuid),
  'phone',(SELECT phone_number FROM public.customer_phone WHERE customer_id=(r.value->>'customer_id')::uuid AND is_primary ORDER BY id LIMIT 1))) ORDER BY r.ordinality),'[]'::jsonb)
 INTO enriched FROM jsonb_array_elements(result->'rows') WITH ORDINALITY r;
 result:=jsonb_set(result,'{rows}',enriched);
 IF octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_panel_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.get_admin_chat_customer_panel(p_customer uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public
SET statement_timeout='5s' SET lock_timeout='1s' AS $$
DECLARE result jsonb; required text;
BEGIN
 PERFORM pawpal_private.admit_chat_panel_read();
 FOREACH required IN ARRAY ARRAY['customer.read','pet_profile.read','pet_breed.read','pet_species.read','sales_order.read','appointment.read','support_ticket.read','paw_point_transaction.read','customer_membership.read','membership_tier.read'] LOOP
  IF NOT pawpal_private.has_permission(required) THEN RAISE EXCEPTION 'chat_customer_panel_forbidden' USING ERRCODE='42501'; END IF;
 END LOOP;
 IF p_customer IS NULL OR NOT EXISTS(SELECT 1 FROM public.customer WHERE id=p_customer) THEN RAISE EXCEPTION 'chat_customer_panel_unavailable' USING ERRCODE='42501'; END IF;
 WITH pets AS MATERIALIZED (
  SELECT p.id,p.pet_name name,coalesce(b.breed_name,s.species_name,'—') breed,coalesce(nullif(p.allergy,''),p.routine,'') notes
  FROM public.pet_profile p LEFT JOIN public.pet_breed b ON b.id=p.breed_id LEFT JOIN public.pet_species s ON s.id=b.species_id
  WHERE p.customer_id=p_customer ORDER BY p.id LIMIT 11
 ), tickets AS MATERIALIZED (
  SELECT id,subject title,status,category,created_at FROM public.support_ticket WHERE customer_id=p_customer
  AND status NOT IN ('completed','resolved','closed','rejected','cancelled') ORDER BY created_at DESC,id DESC LIMIT 6
 ) SELECT jsonb_build_object(
 'pets',coalesce((SELECT jsonb_agg(to_jsonb(p) ORDER BY p.id) FROM (SELECT * FROM pets ORDER BY id LIMIT 10) p),'[]'::jsonb),
 'petsHasMore',(SELECT count(*)>10 FROM pets),
 'recentOrder',(SELECT jsonb_build_object('id',id,'code',order_code,'status',order_status) FROM public.sales_order WHERE customer_id=p_customer ORDER BY created_at DESC,id DESC LIMIT 1),
 'recentBooking',(SELECT jsonb_build_object('id',id,'code',appointment_code,'status',appointment_status) FROM public.appointment WHERE customer_id=p_customer ORDER BY created_at DESC,id DESC LIMIT 1),
 'openTickets',coalesce((SELECT jsonb_agg(to_jsonb(t) ORDER BY t.created_at DESC,t.id DESC) FROM (SELECT * FROM tickets ORDER BY created_at DESC,id DESC LIMIT 5) t),'[]'::jsonb),
 'ticketsHasMore',(SELECT count(*)>5 FROM tickets),
 'pawpoints',coalesce((SELECT total_paw_points FROM public.customer_point_balance WHERE customer_id=p_customer),0),
 'tier',coalesce((SELECT t.tier_name FROM public.customer_membership m JOIN public.membership_tier t ON t.id=m.membership_tier_id WHERE m.customer_id=p_customer),'Chưa gán hạng')) INTO result;
 IF octet_length(convert_to(result::text,'UTF8'))>32768 THEN RAISE EXCEPTION 'chat_panel_payload_limit' USING ERRCODE='54000'; END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.admit_chat_panel_read(),public.get_admin_chat_inbox_view(text,text,integer),public.get_admin_chat_customer_panel(uuid) FROM PUBLIC,anon,service_role;
GRANT EXECUTE ON FUNCTION pawpal_private.admit_chat_panel_read(),public.get_admin_chat_inbox_view(text,text,integer),public.get_admin_chat_customer_panel(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
