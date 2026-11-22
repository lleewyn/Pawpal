-- Evidence for customer cohorts and current outcomes of records created in a period.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';

CREATE OR REPLACE FUNCTION public.admin_dashboard_analysis_page(p_from date,p_to date,p_kind text,p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE starts timestamptz;ends timestamptz;result jsonb;can_profile boolean;
BEGIN
 PERFORM pawpal_private.dashboard_require(ARRAY['sales_order.read','sales_order_detail.read','appointment.read','appointment_item.read']);
 IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_to<p_from OR p_to-p_from>91
  OR p_kind IS NULL OR p_kind NOT IN('customers','first_observed','returned_from_before','repeated_in_period','orders_created','orders_cancelled','appointments_created','appointments_cancelled','appointments_no_show')
  OR p_page IS NULL OR p_page<1 OR p_page>100000 THEN RAISE EXCEPTION 'invalid_dashboard_filter' USING ERRCODE='22023';END IF;
 starts:=p_from::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';
 ends:=greatest(starts,least((p_to+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh',statement_timestamp()));
 IF p_kind IN('customers','first_observed','returned_from_before','repeated_in_period') THEN
  PERFORM pawpal_private.dashboard_require(ARRAY['customer.read']);
  can_profile:=pawpal_private.has_permission('customer_profile.read');
  WITH transactions AS MATERIALIZED(SELECT * FROM pawpal_private.dashboard_transactions(starts,ends)),
  eligible AS(
   SELECT customer_id,count(*) transaction_count,min(finished_at) first_at,max(finished_at) last_at
   FROM transactions WHERE customer_id IS NOT NULL GROUP BY customer_id
  ),cohorts AS(
   SELECT e.*,EXISTS(SELECT 1 FROM public.sales_order o WHERE o.customer_id=e.customer_id AND lower(o.order_status) IN('completed','delivered') AND o.delivered_at<starts)
    OR EXISTS(SELECT 1 FROM public.appointment a WHERE a.customer_id=e.customer_id AND a.appointment_status='completed' AND a.check_out_time<starts) had_before
   FROM eligible e
  ),base AS MATERIALIZED(
   SELECT c.customer_id id,'customer'::text target_kind,cust.customer_code code,profile.full_name display_name,c.transaction_count,c.first_at,c.last_at,c.had_before
   FROM cohorts c JOIN public.customer cust ON cust.id=c.customer_id
   LEFT JOIN public.customer_profile profile ON profile.customer_id=c.customer_id AND can_profile
   WHERE p_kind='customers' OR p_kind='first_observed' AND NOT c.had_before OR p_kind='returned_from_before' AND c.had_before OR p_kind='repeated_in_period' AND c.transaction_count>=2
  ),meta AS(SELECT count(*) total,least(p_page,greatest(1,ceil(count(*)/10.0)::int)) page FROM base)
  SELECT jsonb_build_object('kind',p_kind,'from',starts,'to',ends,'total',meta.total,'page',meta.page,'rows',coalesce((SELECT jsonb_agg(r ORDER BY last_at DESC,id) FROM(SELECT * FROM base ORDER BY last_at DESC,id LIMIT 10 OFFSET(meta.page-1)*10)r),'[]'::jsonb)) INTO result FROM meta;
 ELSE
  WITH base AS MATERIALIZED(
   SELECT o.id,'order'::text target_kind,o.order_code code,o.created_at,o.order_status status
   FROM public.sales_order o WHERE p_kind IN('orders_created','orders_cancelled') AND o.created_at>=starts AND o.created_at<ends
    AND (p_kind='orders_created' OR o.order_status IN('cancelled','canceled','da_huy'))
   UNION ALL
   SELECT a.id,'appointment',a.appointment_code,a.created_at,a.appointment_status
   FROM public.appointment a WHERE p_kind IN('appointments_created','appointments_cancelled','appointments_no_show') AND a.created_at>=starts AND a.created_at<ends
    AND (p_kind='appointments_created' OR p_kind='appointments_cancelled' AND a.appointment_status IN('cancelled','canceled','da_huy') OR p_kind='appointments_no_show' AND a.appointment_status IN('no_show','vang_mat'))
  ),meta AS(SELECT count(*) total,least(p_page,greatest(1,ceil(count(*)/10.0)::int)) page FROM base)
  SELECT jsonb_build_object('kind',p_kind,'from',starts,'to',ends,'total',meta.total,'page',meta.page,'rows',coalesce((SELECT jsonb_agg(r ORDER BY created_at DESC,id) FROM(SELECT * FROM base ORDER BY created_at DESC,id LIMIT 10 OFFSET(meta.page-1)*10)r),'[]'::jsonb)) INTO result FROM meta;
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_dashboard_analysis_page(date,date,text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_analysis_page(date,date,text,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
