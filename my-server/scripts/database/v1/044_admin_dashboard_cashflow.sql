BEGIN;
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_cashflow(p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE days jsonb; missing_receipts bigint; missing_refunds bigint;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('refund_transaction.read')
 OR NOT EXISTS(SELECT 1 FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE s.auth_user_id=auth.uid() AND r.role_code IN ('ADMIN','MANAGER','ACCOUNTANT'))
 THEN RAISE EXCEPTION 'dashboard_financial_forbidden' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR p_to<p_from OR p_to-p_from>30 OR NOT isfinite(p_from) OR NOT isfinite(p_to) THEN
  RAISE EXCEPTION 'invalid_dashboard_period' USING ERRCODE='22023'; END IF;
 WITH receipts AS (
  SELECT (succeeded_at AT TIME ZONE 'Asia/Bangkok')::date AS date_key,sum(amount) collected
  FROM public.payment WHERE transaction_status='succeeded' AND succeeded_at>=p_from::timestamp AT TIME ZONE 'Asia/Bangkok'
  AND succeeded_at<(p_to+1)::timestamp AT TIME ZONE 'Asia/Bangkok' GROUP BY 1
 ), refunds AS (
  SELECT (completed_at AT TIME ZONE 'Asia/Bangkok')::date AS date_key,sum(refunded_amount) refunded
  FROM public.refund_transaction WHERE refund_status='succeeded' AND completed_at>=p_from::timestamp AT TIME ZONE 'Asia/Bangkok'
  AND completed_at<(p_to+1)::timestamp AT TIME ZONE 'Asia/Bangkok' GROUP BY 1
 ), calendar AS (SELECT p_from+i AS date_key FROM generate_series(0,p_to-p_from) i)
 SELECT jsonb_agg(jsonb_build_object('day',c.date_key,'collected',coalesce(r.collected,0),'refunded',coalesce(f.refunded,0),'net',coalesce(r.collected,0)-coalesce(f.refunded,0)) ORDER BY c.date_key)
 INTO days FROM calendar c LEFT JOIN receipts r ON r.date_key=c.date_key LEFT JOIN refunds f ON f.date_key=c.date_key;
 SELECT count(*) INTO missing_receipts FROM public.payment WHERE transaction_status='succeeded' AND succeeded_at IS NULL;
 SELECT count(*) INTO missing_refunds FROM public.refund_transaction WHERE refund_status='succeeded' AND completed_at IS NULL;
 RETURN jsonb_build_object('timezone','Asia/Bangkok','from',p_from,'to',p_to,'days',days,'undated_receipts',missing_receipts,'undated_refunds',missing_refunds);
END $$;
REVOKE ALL ON FUNCTION public.get_admin_dashboard_cashflow(date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_cashflow(date,date) TO authenticated;
DO $$ DECLARE t text; BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
  FOREACH t IN ARRAY ARRAY['payment','refund_transaction','appointment_item'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t); END IF;
  END LOOP;
 END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
