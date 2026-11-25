BEGIN;

-- Explicit plans for an exact reporting period. No seeded costs or targets.
CREATE TABLE IF NOT EXISTS public.admin_dashboard_plan (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 period_from date NOT NULL,
 period_to date NOT NULL,
 target_net_receipts numeric(18,2) NOT NULL CHECK (target_net_receipts > 0 AND target_net_receipts <= 1000000000000),
 operating_expenses numeric(18,2) NOT NULL CHECK (operating_expenses >= 0 AND operating_expenses <= 1000000000000),
 product_cost_percent numeric(7,4) NOT NULL CHECK (product_cost_percent BETWEEN 0 AND 100),
 service_cost_percent numeric(7,4) NOT NULL CHECK (service_cost_percent BETWEEN 0 AND 100),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (isfinite(period_from) AND isfinite(period_to) AND period_to >= period_from AND period_to - period_from <= 91),
 UNIQUE (period_from, period_to)
);
ALTER TABLE public.admin_dashboard_plan ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_dashboard_plan FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.admin_dashboard_plan TO authenticated;
DROP POLICY IF EXISTS dashboard_finance_read ON public.admin_dashboard_plan;
CREATE POLICY dashboard_finance_read ON public.admin_dashboard_plan FOR SELECT TO authenticated USING (
 pawpal_private.work_is_admin() AND pawpal_private.has_permission('payment.read') AND pawpal_private.has_permission('refund_transaction.read')
);

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_plan(p_from date, p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin()
 OR NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('refund_transaction.read')
 THEN RAISE EXCEPTION 'dashboard_financial_forbidden' USING ERRCODE='42501'; END IF;
 IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_to < p_from OR p_to-p_from > 91
 THEN RAISE EXCEPTION 'invalid_dashboard_period' USING ERRCODE='22023'; END IF;
 SELECT to_jsonb(p) INTO result FROM public.admin_dashboard_plan p WHERE period_from=p_from AND period_to=p_to;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.save_admin_dashboard_plan(p_request uuid, p_from date, p_to date, p_expected jsonb, p_values jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; original jsonb; result jsonb; prior public.audit_log; payload text; v_target numeric; v_expenses numeric; v_product numeric; v_service numeric;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin()
 OR NOT pawpal_private.has_permission('payment.read') OR NOT pawpal_private.has_permission('refund_transaction.read')
 OR NOT pawpal_private.has_permission('pawpal_setting.write') OR NOT pawpal_private.has_permission('audit_log.write')
 THEN RAISE EXCEPTION 'dashboard_plan_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request IS NULL OR p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to)
 OR p_to < p_from OR p_to-p_from > 91 OR jsonb_typeof(p_values) IS DISTINCT FROM 'object'
 THEN RAISE EXCEPTION 'invalid_dashboard_plan' USING ERRCODE='22023'; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_values)) <> 4
 OR EXISTS(SELECT 1 FROM jsonb_each(p_values) x WHERE x.key NOT IN ('target_net_receipts','operating_expenses','product_cost_percent','service_cost_percent') OR jsonb_typeof(x.value) <> 'number')
 THEN RAISE EXCEPTION 'invalid_dashboard_plan_fields' USING ERRCODE='22023'; END IF;
 v_target:=(p_values->>'target_net_receipts')::numeric; v_expenses:=(p_values->>'operating_expenses')::numeric;
 v_product:=(p_values->>'product_cost_percent')::numeric; v_service:=(p_values->>'service_cost_percent')::numeric;
 IF v_target IS NULL OR v_target NOT BETWEEN 0.01 AND 1000000000000 OR v_expenses IS NULL OR v_expenses NOT BETWEEN 0 AND 1000000000000
 OR v_product IS NULL OR v_product NOT BETWEEN 0 AND 100 OR v_service IS NULL OR v_service NOT BETWEEN 0 AND 100
 THEN RAISE EXCEPTION 'invalid_dashboard_plan_values' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 payload:=jsonb_build_object('from',p_from,'to',p_to,'values',p_values)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,246));
 SELECT * INTO prior FROM public.audit_log WHERE id=p_request;
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.action IS DISTINCT FROM 'DASHBOARD_PLAN_WRITE' OR prior.description IS DISTINCT FROM payload
  THEN RAISE EXCEPTION 'dashboard_plan_request_conflict' USING ERRCODE='PT409'; END IF;
  SELECT to_jsonb(p) INTO result FROM public.admin_dashboard_plan p WHERE period_from=p_from AND period_to=p_to;
  RETURN result;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('dashboard-plan:'||p_from::text||':'||p_to::text,246));
 SELECT to_jsonb(p) INTO original FROM public.admin_dashboard_plan p WHERE period_from=p_from AND period_to=p_to FOR UPDATE;
 IF original IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'dashboard_plan_changed_reload' USING ERRCODE='PT409'; END IF;
 INSERT INTO public.admin_dashboard_plan(period_from,period_to,target_net_receipts,operating_expenses,product_cost_percent,service_cost_percent)
 VALUES(p_from,p_to,v_target,v_expenses,v_product,v_service)
 ON CONFLICT(period_from,period_to) DO UPDATE SET target_net_receipts=excluded.target_net_receipts,operating_expenses=excluded.operating_expenses,
 product_cost_percent=excluded.product_cost_percent,service_cost_percent=excluded.service_cost_percent,updated_at=clock_timestamp()
 RETURNING to_jsonb(admin_dashboard_plan.*) INTO result;
 INSERT INTO public.audit_log(id,staff_id,action,entity_name,entity_id,description)
 VALUES(p_request,actor,'DASHBOARD_PLAN_WRITE','admin_dashboard_plan',(result->>'id')::uuid,payload);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_admin_dashboard_plan(date,date) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.save_admin_dashboard_plan(uuid,date,date,jsonb,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_plan(date,date), public.save_admin_dashboard_plan(uuid,date,date,jsonb,jsonb) TO authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(
 SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='admin_dashboard_plan')
 THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_dashboard_plan; END IF;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
