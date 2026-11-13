BEGIN;
CREATE OR REPLACE FUNCTION public.own_context_choices(p_kind text,p_query text DEFAULT '',p_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE owner_id uuid; result jsonb;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id);
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'customer_required' USING ERRCODE='42501';END IF;
 IF p_kind NOT IN('orders','bookings','care') OR length(coalesce(p_query,''))>200 THEN RAISE EXCEPTION 'invalid_filter';END IF;
 IF p_kind='orders' THEN
  SELECT coalesce(jsonb_agg(x),'[]') INTO result FROM (
   SELECT o.id "_supabaseId",o.order_code id,(SELECT jsonb_build_array(jsonb_build_object('name',d.product_name_snapshot)) FROM public.sales_order_detail d WHERE d.order_id=o.id ORDER BY d.id LIMIT 1) products
   FROM public.sales_order o WHERE o.customer_id=owner_id AND (p_id IS NULL OR p_id IN(o.id::text,o.order_code)) AND
   (coalesce(p_query,'')='' OR strpos(pawpal_private.fold_search(o.order_code),pawpal_private.fold_search(p_query))>0 OR EXISTS(SELECT 1 FROM public.sales_order_detail d WHERE d.order_id=o.id AND strpos(pawpal_private.fold_search(d.product_name_snapshot),pawpal_private.fold_search(p_query))>0))
   ORDER BY o.created_at DESC,o.id LIMIT 15)x;
 ELSE
  WITH base AS MATERIALIZED (
   SELECT a.id "_supabaseId",a.appointment_code id,a.scheduled_start_at date,a.appointment_status status,a.note notes,p.pet_name "petName",s.full_name staff,
    (SELECT string_agg(i.name_snapshot,' và ' ORDER BY i.id) FROM public.appointment_item i WHERE i.appointment_id=a.id) "serviceName"
   FROM public.appointment a LEFT JOIN public.pet_profile p ON p.id=a.pet_id LEFT JOIN public.staff s ON s.id=a.staff_id
   WHERE a.customer_id=owner_id AND (p_id IS NULL OR p_id IN(a.id::text,a.appointment_code))
  ), matches AS (
   SELECT * FROM base b WHERE (p_kind<>'care' OR status IN('completed','done','da_hoan_tat','in_progress','ready_for_pickup','dang_thuc_hien')) AND
    (coalesce(p_query,'')='' OR strpos(pawpal_private.fold_search(concat_ws(' ',id,"petName","serviceName")),pawpal_private.fold_search(p_query))>0)
  ), chosen AS (
   (SELECT * FROM matches ORDER BY date DESC,"_supabaseId" LIMIT CASE WHEN p_kind='care' THEN 1 ELSE 15 END)
   UNION
   (SELECT * FROM matches WHERE p_kind='care' AND pawpal_private.fold_search("serviceName") ~ '(tam|spa|ve sinh)' ORDER BY date DESC,"_supabaseId" LIMIT 1)
   UNION
   (SELECT * FROM matches WHERE p_kind='care' AND pawpal_private.fold_search("serviceName") ~ '(cat|tia|grooming)' ORDER BY date DESC,"_supabaseId" LIMIT 1)
  ) SELECT coalesce(jsonb_agg(chosen ORDER BY date DESC,"_supabaseId"),'[]') INTO result FROM chosen;
 END IF;
 RETURN jsonb_build_object('owner',owner_id,'rows',result);
END $$;
REVOKE ALL ON FUNCTION public.own_context_choices(text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_context_choices(text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_booking_directory(p_kind text DEFAULT 'customers',p_query text DEFAULT '',p_owner uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE result jsonb; perm text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501';END IF;
 FOREACH perm IN ARRAY ARRAY['customer.read','customer_profile.read','customer_phone.read','pet_profile.read','pet_breed.read','pet_species.read','pet_weight_history.read'] LOOP
  IF NOT pawpal_private.has_permission(perm) THEN RAISE EXCEPTION 'directory_read_forbidden' USING ERRCODE='42501';END IF;
 END LOOP;
 IF p_kind NOT IN('customers','pets') OR length(coalesce(p_query,''))>200 THEN RAISE EXCEPTION 'invalid_filter';END IF;
 WITH owners AS MATERIALIZED (
  SELECT c.id,c.customer_status,c.unverified_contact_phone,
   (SELECT to_jsonb(pr) FROM(SELECT full_name FROM public.customer_profile WHERE customer_id=c.id LIMIT 1)pr) customer_profile,
   (SELECT jsonb_agg(ph) FROM(SELECT phone_number,is_primary FROM public.customer_phone WHERE customer_id=c.id)ph) customer_phone
  FROM public.customer c WHERE c.customer_status='active' AND (p_owner IS NULL OR c.id=p_owner)
 ), found AS MATERIALIZED (
  SELECT c.* FROM owners c WHERE p_kind='customers' AND (coalesce(p_query,'')='' OR strpos(pawpal_private.fold_search(concat_ws(' ',c.customer_profile->>'full_name',c.customer_phone::text,c.unverified_contact_phone)),pawpal_private.fold_search(p_query))>0 OR EXISTS(SELECT 1 FROM public.pet_profile p WHERE p.customer_id=c.id AND strpos(pawpal_private.fold_search(p.pet_name),pawpal_private.fold_search(p_query))>0))
  ORDER BY c.customer_profile->>'full_name',c.id LIMIT 15
 ), pets AS MATERIALIZED (
  SELECT p.id,p.customer_id,p.pet_name,p.updated_at,p.safety_note,p.allergy,p.status,b.breed_name breed,sp.species_name species,w.weight,
   jsonb_build_object('id',c.id,'customer_profile',c.customer_profile,'phone_main',coalesce((SELECT x->>'phone_number' FROM jsonb_array_elements(coalesce(c.customer_phone,'[]'))x ORDER BY (x->>'is_primary')::boolean DESC LIMIT 1),c.unverified_contact_phone)) customer
  FROM public.pet_profile p JOIN owners c ON c.id=p.customer_id LEFT JOIN public.pet_breed b ON b.id=p.breed_id LEFT JOIN public.pet_species sp ON sp.id=b.species_id LEFT JOIN public.pet_current_weight w ON w.pet_id=p.id
  WHERE p.status='active' AND ((p_kind='customers' AND p.customer_id IN(SELECT id FROM found)) OR (p_kind='pets' AND (coalesce(p_query,'')='' OR strpos(pawpal_private.fold_search(concat_ws(' ',p.pet_name,b.breed_name,sp.species_name)),pawpal_private.fold_search(p_query))>0)))
  ORDER BY p.pet_name,p.id LIMIT 100
 ), selected_pets AS(SELECT * FROM pets LIMIT CASE WHEN p_kind='pets' THEN 15 ELSE 100 END), selected_owners AS(
  SELECT * FROM found UNION SELECT * FROM owners WHERE p_kind='pets' AND id IN(SELECT customer_id FROM selected_pets)
 ) SELECT jsonb_build_object('customers',coalesce((SELECT jsonb_agg(c) FROM selected_owners c),'[]'),'pets',coalesce((SELECT jsonb_agg(p) FROM selected_pets p),'[]')) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_booking_directory(text,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_booking_directory(text,text,uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.own_context_financials(p_kind text,p_ids uuid[])
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE result jsonb; source_rows jsonb;
BEGIN
 IF p_kind NOT IN('orders','bookings') OR cardinality(p_ids)>100 OR p_ids IS NULL THEN RAISE EXCEPTION 'invalid_filter';END IF;
 IF p_kind='orders' THEN source_rows:=public.own_sales_order_totals();ELSE source_rows:=public.own_service_booking_summary();END IF;
 SELECT coalesce(jsonb_agg(x),'[]') INTO result FROM jsonb_array_elements(source_rows)x WHERE (x->>'id')::uuid=ANY(p_ids);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.own_context_financials(text,uuid[]) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_context_financials(text,uuid[]) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
