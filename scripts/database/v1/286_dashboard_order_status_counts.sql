BEGIN;
SET LOCAL lock_timeout = '3s';

CREATE OR REPLACE FUNCTION public.admin_dashboard_order_status_counts(p_from date, p_to date)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, public
SET statement_timeout = '8s'
AS $$
BEGIN
    PERFORM pawpal_private.dashboard_require(ARRAY['sales_order.read']);
    IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to)
        OR p_to < p_from OR p_to - p_from > 91 THEN
        RAISE EXCEPTION 'invalid_dashboard_period' USING ERRCODE = '22023';
    END IF;

    RETURN (
        SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.order_status), '[]'::jsonb)
        FROM (
            SELECT o.order_status::text AS order_status, count(*) AS count
            FROM public.sales_order o
            WHERE o.created_at >= (p_from::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
              AND o.created_at < ((p_to + 1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')
            GROUP BY o.order_status
        ) t
    );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dashboard_order_status_counts(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_order_status_counts(date, date) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
