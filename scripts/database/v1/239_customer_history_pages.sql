BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.customer_order_status(value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT CASE WHEN lower(trim(value)) IN('cho_xac_nhan','pending','placed','pending_payment','cho_thanh_toan') THEN 'pending'
 WHEN lower(trim(value)) IN('cho_lay_hang','dang_chuan_bi','confirmed','da_xac_nhan','packing','dang_dong_goi','in-progress') THEN 'preparing'
 WHEN lower(trim(value)) IN('dang_giao','dang_giao_hang','delivering','shipped','shipping') THEN 'shipping'
 WHEN lower(trim(value)) IN('da_giao','da_giao_hang','delivered') THEN 'delivered'
 WHEN lower(trim(value)) IN('da_hoan_tat','done','completed') THEN 'completed'
 WHEN lower(trim(value)) IN('da_huy','cancelled','canceled','thanh_toan_that_bai') THEN 'cancelled'
 WHEN lower(trim(value)) IN('tra_hang','da_tra_hang','return','return_pending','return_approved','refunded','returned') THEN 'returned'
 ELSE coalesce(nullif(lower(trim(value)),''),'pending') END
$$;
REVOKE ALL ON FUNCTION pawpal_private.customer_order_status(text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.own_history_page(p_kind text,p_status text DEFAULT 'all',p_query text DEFAULT '',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE owner_id uuid;result jsonb;summaries jsonb;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id);
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'customer_required' USING ERRCODE='42501';END IF;
 IF p_kind NOT IN('orders','bookings') OR length(coalesce(p_query,''))>200 OR length(coalesce(p_status,''))>40 THEN RAISE EXCEPTION 'invalid_filter' USING ERRCODE='22023';END IF;
 IF p_kind='orders' THEN
  summaries:=public.own_sales_order_totals();
  WITH totals AS(SELECT (x->>'id')::uuid id,(x->>'total')::numeric total,(x->>'paid')::numeric paid,x payload FROM jsonb_array_elements(summaries)x),
  base AS MATERIALIZED(SELECT o.id,o.created_at,o.order_code,pawpal_private.customer_order_status(o.order_status) status,t.total,t.paid,t.payload
   FROM public.sales_order o JOIN totals t ON t.id=o.id WHERE o.customer_id=owner_id),
  matched AS MATERIALIZED(SELECT * FROM base b WHERE (p_status='all' OR status=pawpal_private.customer_order_status(p_status)) AND
   (coalesce(p_query,'')='' OR strpos(lower(order_code),lower(p_query))>0 OR EXISTS(SELECT 1 FROM public.sales_order_detail d WHERE d.order_id=b.id AND strpos(lower(d.product_name_snapshot),lower(p_query))>0))),
  meta AS(SELECT count(*) total,least(greatest(coalesce(p_page,1),1),greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched),
  page_rows AS(SELECT * FROM matched ORDER BY created_at DESC,id DESC LIMIT 10 OFFSET(SELECT(page-1)*10 FROM meta))
  SELECT jsonb_build_object('owner',owner_id,'total',meta.total,'page',meta.page,'ids',coalesce((SELECT jsonb_agg(id ORDER BY created_at DESC,id DESC) FROM page_rows),'[]'::jsonb),
   'summaries',coalesce((SELECT jsonb_agg(payload) FROM page_rows),'[]'::jsonb),
   'counts',coalesce((SELECT jsonb_object_agg(status,n) FROM(SELECT status,count(*) n FROM base GROUP BY status UNION ALL SELECT 'all',count(*) FROM base)x),'{}'::jsonb),
   'stats',jsonb_build_object('processing',(SELECT count(*) FROM base WHERE status IN('pending','preparing','shipping','delivered')),'completed',(SELECT count(*) FROM base WHERE status='completed'),
     'spent',(SELECT coalesce(sum(total),0) FROM base WHERE paid>=total AND status NOT IN('cancelled','returned')))) INTO result FROM meta;
 ELSE
  summaries:=public.own_service_booking_summary();
  WITH totals AS(SELECT (x->>'id')::uuid id,x payload FROM jsonb_array_elements(summaries)x),
  base AS MATERIALIZED(SELECT a.id,a.scheduled_start_at,t.payload,
   CASE WHEN lower(a.appointment_status) IN('dang_giu_cho','tam_giu','cho_xac_nhan','pending') THEN 'pending'
    WHEN lower(a.appointment_status) IN('da_xac_nhan','confirmed','upcoming') THEN 'confirmed'
    WHEN lower(a.appointment_status) IN('da_check_in','accepted','checked_in') THEN 'accepted'
    WHEN lower(a.appointment_status) IN('dang_thuc_hien','in_progress','in-progress','ready_for_pickup') THEN 'in-progress'
    WHEN lower(a.appointment_status) IN('da_hoan_tat','completed','done') THEN 'completed'
    WHEN lower(a.appointment_status) IN('da_huy','cancelled','da_het_han','expired','vang_mat','no_show') THEN 'cancelled' ELSE 'confirmed' END status
   FROM public.appointment a JOIN totals t ON t.id=a.id WHERE a.customer_id=owner_id),
  ranked AS MATERIALIZED(SELECT *,CASE status WHEN 'in-progress' THEN 1 WHEN 'pending' THEN 2 WHEN 'confirmed' THEN 3 WHEN 'accepted' THEN 4 WHEN 'completed' THEN 5 WHEN 'cancelled' THEN 6 ELSE 99 END rank FROM base),
  matched AS MATERIALIZED(SELECT * FROM ranked WHERE p_status='all' OR status=p_status),
  meta AS(SELECT count(*) total,least(greatest(coalesce(p_page,1),1),greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched),
  page_rows AS(SELECT * FROM matched ORDER BY rank,scheduled_start_at DESC,id DESC LIMIT 10 OFFSET(SELECT(page-1)*10 FROM meta))
  SELECT jsonb_build_object('owner',owner_id,'total',meta.total,'page',meta.page,'ids',coalesce((SELECT jsonb_agg(id ORDER BY rank,scheduled_start_at DESC,id DESC) FROM page_rows),'[]'::jsonb),
   'summaries',coalesce((SELECT jsonb_agg(payload) FROM page_rows),'[]'::jsonb),
   'counts',coalesce((SELECT jsonb_object_agg(status,n) FROM(SELECT status,count(*) n FROM base GROUP BY status UNION ALL SELECT 'all',count(*) FROM base)x),'{}'::jsonb)) INTO result FROM meta;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.own_history_page(text,text,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_history_page(text,text,text,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
