-- Minimal, customer-bound sources for complaint creation. Existing create RPC still validates ownership.
BEGIN;
CREATE FUNCTION public.get_staff_complaint_sources(p_customer_id uuid,p_kind text,p_query text DEFAULT '',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE rows jsonb;
BEGIN
 IF pawpal_private.work_actor() IS NULL OR NOT pawpal_private.has_permission('work.complaint.handle') AND NOT pawpal_private.work_is_admin() THEN RAISE EXCEPTION 'work_complaint_forbidden' USING ERRCODE='42501'; END IF;
 IF p_customer_id IS NULL OR p_page IS NULL OR p_page NOT BETWEEN 1 AND 1000 OR length(coalesce(p_query,''))>120 THEN RAISE EXCEPTION 'invalid_complaint_source_query' USING ERRCODE='22023'; END IF;
 IF p_kind='service' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT a.id,a.customer_id,a.appointment_code code,a.appointment_status status,a.scheduled_start_at
   FROM public.appointment a WHERE a.customer_id=p_customer_id AND pawpal_private.work_owns_appointment(a.id) AND strpos(lower(a.appointment_code),lower(coalesce(p_query,'')))>0 ORDER BY a.scheduled_start_at DESC,a.id LIMIT 10 OFFSET (p_page-1)*10) t;
 ELSIF p_kind='order' THEN
  SELECT coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) INTO rows FROM (SELECT o.id,o.customer_id,o.order_code code,o.order_status status,o.created_at
   FROM public.sales_order o WHERE o.customer_id=p_customer_id AND strpos(lower(o.order_code),lower(coalesce(p_query,'')))>0 ORDER BY o.created_at DESC,o.id LIMIT 10 OFFSET (p_page-1)*10) t;
 ELSE RAISE EXCEPTION 'invalid_complaint_source_kind' USING ERRCODE='22023'; END IF;
 RETURN jsonb_build_object('items',rows,'page',p_page);
END $$;
REVOKE ALL ON FUNCTION public.get_staff_complaint_sources(uuid,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_complaint_sources(uuid,text,text,integer) TO authenticated;
COMMIT;
