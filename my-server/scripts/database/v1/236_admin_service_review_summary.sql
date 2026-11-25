BEGIN;
CREATE OR REPLACE FUNCTION public.admin_service_review_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path=pg_catalog,public SET statement_timeout='5s' AS $$
DECLARE result jsonb;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() OR NOT pawpal_private.has_permission('review.read')
  OR NOT pawpal_private.has_permission('appointment_item.read') OR NOT pawpal_private.has_permission('service.read') THEN
  RAISE EXCEPTION 'review_summary_forbidden' USING ERRCODE='42501';
 END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY service_id),'[]'::jsonb) INTO result FROM (
  SELECT i.service_id,count(*) review_count,avg(r.rating) average_rating
  FROM public.review r JOIN public.appointment_item i ON i.id=r.appointment_item_id
  WHERE i.service_id IS NOT NULL AND r.rating BETWEEN 1 AND 5 AND r.rating=trunc(r.rating)
  GROUP BY i.service_id
 ) s;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_service_review_summary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_service_review_summary() TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
