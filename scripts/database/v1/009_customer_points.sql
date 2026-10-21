BEGIN;
-- Narrow server transaction; authenticated callers retain no direct ledger write grants.
CREATE OR REPLACE FUNCTION public.adjust_customer_points(p_customer_id uuid,p_points integer,p_reason text,p_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE existing public.paw_point_transaction; current_balance bigint; next_sequence bigint;
 entry_id uuid; actor uuid; request_key text; reason_value text:=btrim(p_reason);
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('paw_point_transaction.write')
 OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'point_adjustment_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_points IS NULL OR p_points=0 OR abs(p_points::bigint)>10000000
 OR reason_value IS NULL OR length(reason_value) NOT BETWEEN 2 AND 2000 THEN
  RAISE EXCEPTION 'invalid_point_adjustment' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 request_key:='staff-adjust:'||actor::text||':'||p_request_id::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(request_key,18));
 PERFORM 1 FROM public.customer WHERE id=p_customer_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'customer_not_found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO existing FROM public.paw_point_transaction WHERE idempotency_key=request_key;
 IF FOUND THEN
  IF (existing.customer_id,existing.points,existing.description) IS DISTINCT FROM (p_customer_id,p_points,reason_value) THEN
   RAISE EXCEPTION 'point_request_conflict' USING ERRCODE='PT409'; END IF;
  SELECT coalesce(sum(points),0) INTO current_balance FROM public.paw_point_transaction WHERE customer_id=p_customer_id AND sequence_no<=existing.sequence_no;
  RETURN jsonb_build_object('id',existing.id,'balance',current_balance,'replayed',true);
 END IF;
 SELECT coalesce(sum(points),0),coalesce(max(sequence_no),0)+1 INTO current_balance,next_sequence
 FROM public.paw_point_transaction WHERE customer_id=p_customer_id;
 IF current_balance+p_points<0 THEN RAISE EXCEPTION 'insufficient_points' USING ERRCODE='22023'; END IF;
 INSERT INTO public.paw_point_transaction(customer_id,points,description,idempotency_key,sequence_no)
 VALUES(p_customer_id,p_points,reason_value,request_key,next_sequence) RETURNING id INTO entry_id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,'CREATE','paw_point_transaction',entry_id,'Điều chỉnh điểm khách hàng: '||p_points::text||'. '||reason_value);
 RETURN jsonb_build_object('id',entry_id,'balance',current_balance+p_points,'replayed',false);
END $$;
REVOKE ALL ON FUNCTION public.adjust_customer_points(uuid,integer,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.adjust_customer_points(uuid,integer,text,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
