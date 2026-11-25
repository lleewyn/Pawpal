BEGIN;
SET LOCAL lock_timeout='3s';
CREATE FUNCTION pawpal_private.can_read_review_media(p_review uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.review r WHERE r.id=p_review AND (
  r.review_status IN ('published','approved','da_duyet')
  OR (auth.uid() IS NOT NULL AND pawpal_private.media_staff(auth.uid()) IS NOT NULL AND EXISTS(SELECT 1 FROM public.staff_role sr WHERE sr.staff_id=pawpal_private.media_staff(auth.uid()) AND sr.role_code='ADMIN'))
  OR (auth.uid() IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) AND (
   EXISTS(SELECT 1 FROM public.sales_order_detail d JOIN public.sales_order o ON o.id=d.order_id WHERE d.id=r.sales_order_detail_id AND pawpal_private.owns_customer(o.customer_id))
   OR EXISTS(SELECT 1 FROM public.appointment_item i JOIN public.appointment ap ON ap.id=i.appointment_id WHERE i.id=r.appointment_item_id AND pawpal_private.owns_customer(ap.customer_id))))));
$$;
REVOKE ALL ON FUNCTION pawpal_private.can_read_review_media(uuid) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION pawpal_private.can_read_review_media(uuid) TO anon,authenticated,service_role;
DROP POLICY IF EXISTS anon_read ON public.review_media;
DROP POLICY IF EXISTS public_read ON public.review_media;
DROP POLICY IF EXISTS v1_read ON public.review_media;
CREATE POLICY review_media_authorized_read ON public.review_media FOR SELECT TO anon,authenticated USING(pawpal_private.can_read_review_media(review_id));
REVOKE INSERT,UPDATE,DELETE ON public.review_media FROM anon,authenticated;
GRANT SELECT ON public.review_media TO anon,authenticated;
COMMIT;
