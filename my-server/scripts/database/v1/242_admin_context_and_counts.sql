BEGIN;
CREATE OR REPLACE FUNCTION public.admin_overview_workload()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() OR NOT pawpal_private.has_permission('sales_order.read') OR NOT pawpal_private.has_permission('support_ticket.read') THEN RAISE EXCEPTION 'overview_forbidden' USING ERRCODE='42501';END IF;
 WITH pending AS MATERIALIZED(SELECT id,ticket_code,status,subject,priority,created_at FROM public.support_ticket WHERE upper(coalesce(status,'')) NOT IN('RESOLVED','COMPLETED','CLOSED','REJECTED','DA_DONG','DA_GIAI_QUYET'))
 SELECT jsonb_build_object('orders',(SELECT count(*) FROM public.sales_order WHERE upper(order_status) IN('PENDING','CONFIRMED','PROCESSING','CHO_XAC_NHAN','DANG_XU_LY')),'tickets',(SELECT count(*) FROM pending),
 'firstTicket',(SELECT to_jsonb(t) FROM pending t ORDER BY (lower(coalesce(priority,'')) IN('khan_cap','critical') OR lower(priority) LIKE '%khẩn%' OR lower(priority) LIKE '%urgent%') DESC NULLS LAST,created_at,id LIMIT 1)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_overview_workload() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_overview_workload() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_complaint_context(p_kind text,p_query text DEFAULT '',p_owner uuid DEFAULT NULL,p_id text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE result jsonb;perm text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501';END IF;
 FOREACH perm IN ARRAY ARRAY['support_ticket.read','customer.read','customer_profile.read','customer_phone.read','pet_profile.read','appointment.read','appointment_item.read','sales_order.read','sales_order_detail.read'] LOOP
  IF NOT pawpal_private.has_permission(perm) THEN RAISE EXCEPTION 'context_forbidden' USING ERRCODE='42501';END IF;
 END LOOP;
 IF p_kind IS NULL OR p_kind NOT IN('customers','order','service') OR length(coalesce(p_query,''))>200 OR length(coalesce(p_id,''))>200 THEN RAISE EXCEPTION 'invalid_filter';END IF;
 WITH refs AS MATERIALIZED(
  (SELECT a.id,a.customer_id,a.appointment_code code,a.scheduled_start_at date,a.pet_id,a.appointment_status status,
    (SELECT string_agg(i.name_snapshot,' và ' ORDER BY i.id) FROM public.appointment_item i WHERE i.appointment_id=a.id) name
   FROM public.appointment a WHERE p_kind='service' AND (p_owner IS NULL OR a.customer_id=p_owner) AND (p_id IS NULL OR p_id IN(a.id::text,a.appointment_code)) AND
    (coalesce(p_query,'')='' OR strpos(pawpal_private.fold_search(a.appointment_code),pawpal_private.fold_search(p_query))>0 OR EXISTS(SELECT 1 FROM public.customer_profile pr WHERE pr.customer_id=a.customer_id AND strpos(pawpal_private.fold_search(pr.full_name),pawpal_private.fold_search(p_query))>0) OR EXISTS(SELECT 1 FROM public.appointment_item i WHERE i.appointment_id=a.id AND strpos(pawpal_private.fold_search(i.name_snapshot),pawpal_private.fold_search(p_query))>0)) ORDER BY a.scheduled_start_at DESC,a.id LIMIT 10)
  UNION ALL
  (SELECT o.id,o.customer_id,o.order_code,o.created_at,NULL::uuid,o.order_status,NULL::text FROM public.sales_order o WHERE p_kind='order' AND (p_owner IS NULL OR o.customer_id=p_owner) AND (p_id IS NULL OR p_id IN(o.id::text,o.order_code)) AND
    (coalesce(p_query,'')='' OR strpos(pawpal_private.fold_search(o.order_code),pawpal_private.fold_search(p_query))>0 OR EXISTS(SELECT 1 FROM public.customer_profile pr WHERE pr.customer_id=o.customer_id AND strpos(pawpal_private.fold_search(pr.full_name),pawpal_private.fold_search(p_query))>0) OR EXISTS(SELECT 1 FROM public.sales_order_detail d WHERE d.order_id=o.id AND strpos(pawpal_private.fold_search(d.product_name_snapshot),pawpal_private.fold_search(p_query))>0)) ORDER BY o.created_at DESC,o.id LIMIT 10)
 ), owners AS MATERIALIZED(
  SELECT c.id,c.contact_email email,pr.full_name name,coalesce(ph.phone_number,c.unverified_contact_phone,'') phone,
    (SELECT count(*) FROM public.pet_profile p WHERE p.customer_id=c.id) "petCount"
  FROM public.customer c LEFT JOIN public.customer_profile pr ON pr.customer_id=c.id
  LEFT JOIN LATERAL(SELECT phone_number FROM public.customer_phone WHERE customer_id=c.id ORDER BY is_primary DESC,id LIMIT 1)ph ON true
  WHERE (p_kind='customers' AND (p_owner IS NULL OR c.id=p_owner) AND (coalesce(p_query,'')='' OR strpos(pawpal_private.fold_search(concat_ws(' ',pr.full_name,ph.phone_number,c.unverified_contact_phone,c.customer_code)),pawpal_private.fold_search(p_query))>0)) OR (p_kind<>'customers' AND c.id IN(SELECT customer_id FROM refs))
  ORDER BY c.created_at DESC,c.id LIMIT 10
 ), decorated AS(
  SELECT r.*,o.name customer_name,o.phone,
   (SELECT ticket_code FROM public.support_ticket t WHERE (CASE WHEN p_kind='order' THEN t.order_id=r.id ELSE t.appointment_id=r.id END) AND t.status NOT IN('resolved','closed','rejected') ORDER BY t.created_at DESC,t.id DESC LIMIT 1) duplicate
  FROM refs r LEFT JOIN owners o ON o.id=r.customer_id
 ) SELECT jsonb_build_object('customers',coalesce((SELECT jsonb_agg(o) FROM owners o),'[]'),'refs',coalesce((SELECT jsonb_agg(r ORDER BY date DESC,id) FROM decorated r),'[]'),
  'pets',coalesce((SELECT jsonb_agg(jsonb_build_object('id',p.id,'customer_id',p.customer_id,'pet_name',p.pet_name)) FROM public.pet_profile p WHERE p.id IN(SELECT pet_id FROM refs)),'[]')) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_complaint_context(text,text,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_complaint_context(text,text,uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
