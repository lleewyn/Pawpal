BEGIN;
-- Append-only reward reversal; cumulative integer rounding for both cashiers.
CREATE OR REPLACE FUNCTION pawpal_private.refund_loyalty_state(p_payment_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SET search_path=pg_catalog,public AS $$
 SELECT jsonb_build_object(
  'reward_points',coalesce((SELECT sum(points) FROM public.paw_point_transaction WHERE payment_id=p.id AND refund_transaction_id IS NULL AND points>0),0),
  'reversed_points',coalesce((SELECT -sum(t.points) FROM public.paw_point_transaction t JOIN public.refund_transaction r ON r.id=t.refund_transaction_id WHERE r.payment_id=p.id AND r.refund_status='succeeded'),0),
  'points_balance',coalesce((SELECT sum(points) FROM public.paw_point_transaction WHERE customer_id=p.customer_id),0),
  'history_conflict',EXISTS(SELECT 1 FROM public.paw_point_transaction t WHERE
    (t.payment_id=p.id AND t.refund_transaction_id IS NULL AND t.points<0)
    OR (t.refund_transaction_id IN(SELECT id FROM public.refund_transaction WHERE payment_id=p.id) AND (t.points>0 OR t.customer_id<>p.customer_id OR t.payment_id IS DISTINCT FROM p.id))))
 FROM public.payment p WHERE p.id=p_payment_id
$$;

CREATE OR REPLACE FUNCTION pawpal_private.plan_refund_loyalty(p_payment_id uuid,p_amount numeric)
RETURNS jsonb LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE p public.payment; s jsonb; previous_money numeric; previous_eligible numeric;
 reward numeric; reversed numeric; point_delta numeric; eligible_delta numeric; balance numeric;
BEGIN
 SELECT * INTO p FROM public.payment WHERE id=p_payment_id FOR UPDATE;
 IF NOT FOUND OR p.transaction_status<>'succeeded' OR p.amount<=0 OR p_amount IS NULL OR p_amount<=0 OR p_amount<>trunc(p_amount) THEN
  RAISE EXCEPTION 'refund_loyalty_source_invalid' USING ERRCODE='22023'; END IF;
 -- Same lock used by the ledger guard and voucher redemption: concurrent spends serialize.
 PERFORM 1 FROM public.customer WHERE id=p.customer_id FOR UPDATE;
 s:=pawpal_private.refund_loyalty_state(p.id);
 reward:=(s->>'reward_points')::numeric; reversed:=(s->>'reversed_points')::numeric; balance:=(s->>'points_balance')::numeric;
 SELECT coalesce(sum(refunded_amount),0),coalesce(sum(eligible_refund_amount),0)
 INTO previous_money,previous_eligible FROM public.refund_transaction WHERE payment_id=p.id AND refund_status='succeeded';
 IF previous_money+p_amount>p.amount THEN RAISE EXCEPTION 'refund_loyalty_exceeds_balance' USING ERRCODE='22023'; END IF;
 IF (s->>'history_conflict')::boolean OR reversed<>floor(reward*previous_money/p.amount)
 OR previous_eligible<>floor(p.eligible_spend_amount*previous_money/p.amount) THEN
  RAISE EXCEPTION 'refund_loyalty_history_conflict' USING ERRCODE='23514'; END IF;
 point_delta:=floor(reward*(previous_money+p_amount)/p.amount)-reversed;
 eligible_delta:=floor(p.eligible_spend_amount*(previous_money+p_amount)/p.amount)-previous_eligible;
 IF point_delta>2147483647 THEN RAISE EXCEPTION 'refund_loyalty_history_conflict' USING ERRCODE='23514'; END IF;
 IF balance<point_delta THEN RAISE EXCEPTION 'refund_reward_points_insufficient' USING ERRCODE='23514'; END IF;
 RETURN jsonb_build_object('points',point_delta,'eligible',eligible_delta);
END $$;

CREATE OR REPLACE FUNCTION pawpal_private.record_refund_loyalty(p_refund_id uuid,p_points integer)
RETURNS void LANGUAGE plpgsql SET search_path=pg_catalog,public AS $$
DECLARE p public.payment;
BEGIN
 SELECT payment.* INTO p FROM public.payment payment JOIN public.refund_transaction r ON r.payment_id=payment.id WHERE r.id=p_refund_id AND r.refund_status='succeeded';
 IF NOT FOUND OR p_points IS NULL OR p_points<0 THEN RAISE EXCEPTION 'refund_loyalty_source_invalid' USING ERRCODE='22023'; END IF;
 IF p_points>0 THEN
  INSERT INTO public.paw_point_transaction(customer_id,payment_id,refund_transaction_id,points,idempotency_key,sequence_no,description)
  SELECT p.customer_id,p.id,p_refund_id,-p_points,'refund-reward-reversal:'||p_refund_id,coalesce(max(sequence_no),0)+1,
   'Thu hồi điểm thưởng theo khoản hoàn tiền '||p_refund_id FROM public.paw_point_transaction WHERE customer_id=p.customer_id;
 END IF;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.refund_loyalty_state(uuid),pawpal_private.plan_refund_loyalty(uuid,numeric),pawpal_private.record_refund_loyalty(uuid,integer) FROM PUBLIC,anon,authenticated;

-- Patch deployed definitions, fail closed if an earlier migration changed these anchors.
DO $patch$
DECLARE kind text; body text; old text; newer text; signature text;
BEGIN
 FOREACH kind IN ARRAY ARRAY['sales','service'] LOOP
  signature:='public.get_admin_'||kind||'_cashier(uuid)';
  body:=pg_get_functiondef(signature::regprocedure);
  old:='to_jsonb(p)||jsonb_build_object(''method_name''';
  newer:='to_jsonb(p)||jsonb_build_object(''loyalty'',pawpal_private.refund_loyalty_state(p.id),''method_name''';
  IF strpos(body,'pawpal_private.refund_loyalty_state(p.id)')=0 THEN
   IF strpos(body,old)=0 OR strpos(body,'SECURITY DEFINER')>0 THEN RAISE EXCEPTION 'cashier_getter_anchor_missing: %',kind; END IF;
   body:=replace(body,old,newer);
   -- Existing explicit permission gates remain; private metadata is not callable by clients.
   body:=replace(body,'LANGUAGE plpgsql','LANGUAGE plpgsql SECURITY DEFINER');
   EXECUTE body;
  END IF;
  signature:='public.post_admin_'||kind||'_money(uuid,uuid,text,text,jsonb)';
  body:=pg_get_functiondef(signature::regprocedure);
  IF strpos(body,'pawpal_private.plan_refund_loyalty(source.id,amount_value)')>0
   AND strpos(body,'pawpal_private.record_refund_loyalty(p_request_id')>0 THEN CONTINUE; END IF;
  old:='prior public.audit_log;';
  IF strpos(body,old)=0 THEN RAISE EXCEPTION 'cashier_declaration_anchor_missing'; END IF;
  body:=replace(body,old,'loyalty_plan jsonb; prior public.audit_log;');
  old:='IF source.eligible_spend_amount>0 OR EXISTS(SELECT 1 FROM public.paw_point_transaction WHERE payment_id=source.id) THEN RAISE EXCEPTION '''||kind||'_refund_ledger_review_required'' USING ERRCODE=''22023''; END IF;';
  newer:='loyalty_plan:=pawpal_private.plan_refund_loyalty(source.id,amount_value);
  IF ((loyalty_plan->>''points'')::numeric>0 OR (loyalty_plan->>''eligible'')::numeric>0) AND p_details->>''loyalty_confirmed'' IS DISTINCT FROM ''true'' THEN RAISE EXCEPTION ''refund_loyalty_confirmation_required'' USING ERRCODE=''22023''; END IF;';
  IF strpos(body,old)=0 THEN RAISE EXCEPTION 'cashier_guard_anchor_missing: %',kind; END IF;
  body:=replace(body,old,newer);
  old:='actor,clock_timestamp(),clock_timestamp(),0);';
  IF strpos(body,old)=0 THEN RAISE EXCEPTION 'cashier_insert_anchor_missing: %',kind; END IF;
  body:=replace(body,old,'actor,clock_timestamp(),clock_timestamp(),(loyalty_plan->>''eligible'')::numeric);
  PERFORM pawpal_private.record_refund_loyalty(p_request_id,(loyalty_plan->>''points'')::integer);');
  EXECUTE body;
 END LOOP;
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
