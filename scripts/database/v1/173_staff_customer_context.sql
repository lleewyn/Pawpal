-- One selected customer only: no expenditure, ledger, Auth or membership controls.
BEGIN;
CREATE FUNCTION public.get_staff_customer_context(p_customer_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE result jsonb;
BEGIN
 IF pawpal_private.work_actor() IS NULL OR NOT pawpal_private.has_permission('work.customer.read') AND NOT pawpal_private.work_is_admin() THEN
  RAISE EXCEPTION 'work_customer_forbidden' USING ERRCODE='42501'; END IF;
 IF p_customer_id IS NULL THEN RAISE EXCEPTION 'work_customer_required' USING ERRCODE='22023'; END IF;
 SELECT jsonb_build_object('id',c.id,'customer_code',c.customer_code,'full_name',p.full_name,'updated_at',c.updated_at,'note',c.note,
  'tier_name',t.tier_name,'points',coalesce((SELECT sum(points) FROM public.paw_point_transaction WHERE customer_id=c.id),0))
 INTO result FROM public.customer c JOIN public.customer_profile p ON p.customer_id=c.id
 LEFT JOIN public.customer_membership m ON m.customer_id=c.id LEFT JOIN public.membership_tier t ON t.id=m.membership_tier_id
 WHERE c.id=p_customer_id;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_staff_customer_context(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_customer_context(uuid) TO authenticated;
COMMIT;
