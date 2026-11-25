-- One assigned service case, using the same ownership boundary as service cashier reads.
BEGIN;
CREATE FUNCTION public.get_staff_service_receipt(p_appointment_id uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE a public.appointment; lines jsonb; subtotal numeric; line_discount numeric; adjustment numeric; voucher_discount numeric;
 total numeric; collected numeric; refunded numeric; customer_name text; phone text; pet_name text;
BEGIN
 IF pawpal_private.work_actor() IS NULL OR NOT pawpal_private.has_permission('work.cashier.collect') AND NOT pawpal_private.work_is_admin() THEN
  RAISE EXCEPTION 'work_receipt_forbidden' USING ERRCODE='42501'; END IF;
 IF p_appointment_id IS NULL THEN RAISE EXCEPTION 'work_appointment_required' USING ERRCODE='22023'; END IF;
 IF NOT pawpal_private.work_is_admin() AND NOT pawpal_private.work_owns_appointment(p_appointment_id) THEN
  RAISE EXCEPTION 'work_assignment_required' USING ERRCODE='42501'; END IF;
 SELECT * INTO a FROM public.appointment WHERE id=p_appointment_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'work_appointment_not_found' USING ERRCODE='P0002'; END IF;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',i.id,'name',i.name_snapshot,'quantity',i.quantity,
  'unit_price',i.unit_price,'discount',i.discount_amount,'total',i.quantity*i.unit_price-i.discount_amount) ORDER BY i.id),'[]'::jsonb),
  coalesce(sum(i.quantity*i.unit_price),0),coalesce(sum(i.discount_amount),0)
 INTO lines,subtotal,line_discount FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.status<>'cancelled';
 SELECT coalesce(sum(amount_delta),0) INTO adjustment FROM public.appointment_adjustment
  WHERE appointment_id=a.id AND approval_status='approved' AND customer_consent_status='confirmed';
 SELECT coalesce(sum(discount_amount_snapshot),0) INTO voucher_discount FROM public.voucher_redemption WHERE appointment_id=a.id AND status='applied';
 SELECT total_price INTO total FROM public.appointment_totals WHERE appointment_id=a.id;
 SELECT coalesce(sum(amount),0) INTO collected FROM public.payment WHERE appointment_id=a.id AND transaction_status='succeeded';
 SELECT coalesce(sum(r.refunded_amount),0) INTO refunded FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id
  WHERE p.appointment_id=a.id AND p.transaction_status='succeeded' AND r.refund_status='succeeded';
 SELECT full_name INTO customer_name FROM public.customer_profile WHERE customer_id=a.customer_id;
 SELECT phone_number INTO phone FROM public.customer_phone WHERE customer_id=a.customer_id AND is_primary LIMIT 1;
 SELECT p.pet_name INTO pet_name FROM public.pet_profile p WHERE p.id=a.pet_id;
 RETURN jsonb_build_object('appointment_id',a.id,'appointment_code',a.appointment_code,'scheduled_start_at',a.scheduled_start_at,'status',a.appointment_status,
  'customer_name',customer_name,'phone',phone,'pet_name',pet_name,'lines',lines,'subtotal',subtotal,'line_discount',line_discount,
  'adjustment',adjustment,'voucher_discount',voucher_discount,'total',coalesce(total,0),
  'collected',collected-refunded,'refunded',refunded,'remaining',greatest(coalesce(total,0)-collected+refunded,0));
END $$;
REVOKE ALL ON FUNCTION public.get_staff_service_receipt(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_staff_service_receipt(uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
