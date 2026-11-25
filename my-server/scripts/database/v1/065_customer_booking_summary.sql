BEGIN;
-- Return only owner-scoped totals and review state; no staff or payer details.
CREATE OR REPLACE FUNCTION public.own_service_booking_summary()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; result jsonb;
BEGIN
 SELECT id INTO owner_id FROM public.customer
 WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id);
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN
  RAISE EXCEPTION 'customer_session_required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',a.id,'total',t.total_price,
  'net_paid',coalesce((SELECT sum(p.amount-coalesce((SELECT sum(r.refunded_amount)
   FROM public.refund_transaction r WHERE r.payment_id=p.id AND r.refund_status='succeeded'),0))
   FROM public.payment p WHERE p.appointment_id=a.id AND p.transaction_status='succeeded'),0),
  'reviewed_item_ids',coalesce((SELECT jsonb_agg(DISTINCT i.id) FROM public.appointment_item i
   JOIN public.review r ON r.appointment_item_id=i.id WHERE i.appointment_id=a.id),'[]'::jsonb)
 ) ORDER BY a.id),'[]'::jsonb) INTO result
 FROM public.appointment a JOIN public.appointment_totals t ON t.appointment_id=a.id
 WHERE a.customer_id=owner_id;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.own_service_booking_summary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_service_booking_summary() TO authenticated;
COMMIT;
NOTIFY pgrst,'reload schema';
