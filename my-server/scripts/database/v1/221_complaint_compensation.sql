BEGIN;
-- Reuse the complaint proposal, manager decision and completion transaction.
DO $$
DECLARE body text:=pg_get_functiondef('public.act_admin_complaint(uuid,uuid,timestamptz,text,jsonb)'::regprocedure);
 anchor text:=$old$option_value:=p_details->>'option'; amount_value:=coalesce((p_details->>'amount')::numeric,0);$old$;
 completion text:=$old$IF ticket.status<>'processing' OR ticket.resolved_by IS NULL OR evidence IS NULL THEN RAISE EXCEPTION 'complaint_approved_result_required' USING ERRCODE='22023'; END IF;
  IF ticket.resolution_type IN ('refund','rma_refund') THEN$old$;
BEGIN
 IF strpos(body,anchor)=0 OR strpos(replace(body,E'\r',''),completion)=0 THEN RAISE EXCEPTION 'unexpected_complaint_compensation_definition'; END IF;
 body:=replace(body,E'\r','');
 body:=replace(body,'original_staff uuid; proposal jsonb;', 'original_staff uuid; proposal jsonb; award public.voucher; award_id uuid; award_sequence bigint;');
 body:=replace(body,'''source_kind'',''media_asset_ids''','''source_kind'',''media_asset_ids'',''voucher_code''');
 body:=replace(body,$old$(prior.description::jsonb-'source_staff_id')$old$,$new$(prior.description::jsonb-'source_staff_id'-'result_id')$new$);
 body:=replace(body,anchor,anchor||$new$
  IF option_value='voucher' AND p_action='propose' THEN
   SELECT * INTO award FROM public.voucher WHERE upper(voucher_code)=upper(btrim(p_details->>'voucher_code')) AND is_active AND type='fixed'
    AND (now() AT TIME ZONE 'Asia/Bangkok')::date BETWEEN start_date AND end_date FOR SHARE;
   IF NOT FOUND OR award.discount_value<=0 THEN RAISE EXCEPTION 'complaint_voucher_unavailable' USING ERRCODE='22023'; END IF;
  END IF;$new$);
 body:=replace(body,$old$'redo_service','change_staff')
  OR amount_value<0$old$,$new$'redo_service','change_staff','points','voucher')
  OR (option_value IN ('points','voucher') AND ticket.customer_id IS NULL)
  OR (option_value='points' AND (amount_value NOT BETWEEN 1 AND 2147483647 OR amount_value<>trunc(amount_value)))
  OR amount_value<0$new$);
 body:=replace(body,$old$(option_value NOT IN ('refund','rma_refund') AND amount_value<>0)$old$,$new$(option_value NOT IN ('refund','rma_refund','points') AND amount_value<>0)$new$);
 body:=replace(body,$old$amount_value:=(proposal->'details'->>'amount')::numeric;$old$,$new$amount_value:=(proposal->'details'->>'amount')::numeric;
   IF ticket.resolution_type='voucher' THEN
    SELECT * INTO award FROM public.voucher WHERE id=(proposal->>'voucher_id')::uuid AND is_active AND type='fixed'
     AND (now() AT TIME ZONE 'Asia/Bangkok')::date BETWEEN start_date AND end_date FOR SHARE;
    IF NOT FOUND OR md5(to_jsonb(award)::text) IS DISTINCT FROM proposal->>'voucher_revision' THEN
     RAISE EXCEPTION 'complaint_voucher_unavailable' USING ERRCODE='22023';
    END IF;
    amount_value:=award.discount_value;
   END IF;$new$);
 body:=replace(body,completion,$new$IF ticket.status<>'processing' OR ticket.resolved_by IS NULL OR
   (evidence IS NULL AND ticket.resolution_type NOT IN ('points','voucher')) THEN
   RAISE EXCEPTION 'complaint_approved_result_required' USING ERRCODE='22023';
  END IF;
  IF ticket.resolution_type IN ('points','voucher') THEN
   IF NOT pawpal_private.work_is_admin() THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501'; END IF;
   IF ticket.customer_id IS NULL OR coalesce(ticket.approved_amount,0)<=0 THEN RAISE EXCEPTION 'complaint_approved_result_required' USING ERRCODE='22023'; END IF;
   PERFORM 1 FROM public.customer WHERE id=ticket.customer_id FOR UPDATE;
   IF ticket.resolution_type='points' THEN
    SELECT coalesce(max(sequence_no),0)+1 INTO award_sequence FROM public.paw_point_transaction WHERE customer_id=ticket.customer_id;
    INSERT INTO public.paw_point_transaction(customer_id,points,description,idempotency_key,sequence_no)
    VALUES(ticket.customer_id,ticket.approved_amount::integer,'Bồi hoàn phiếu '||ticket.ticket_code||' · '||left(note_value,1500),
     'complaint-award:'||p_request_id,award_sequence) RETURNING id INTO award_id;
   ELSE
    SELECT description::jsonb INTO proposal FROM public.audit_log WHERE action='COMPLAINT_ACTION' AND entity_id=ticket.id
     AND description::jsonb->>'action'='propose' ORDER BY created_at DESC,id DESC LIMIT 1;
    SELECT * INTO award FROM public.voucher WHERE id=(proposal->>'voucher_id')::uuid AND is_active AND type='fixed'
     AND discount_value=ticket.approved_amount AND (now() AT TIME ZONE 'Asia/Bangkok')::date BETWEEN start_date AND end_date FOR UPDATE;
    IF NOT FOUND OR md5(to_jsonb(award)::text) IS DISTINCT FROM proposal->>'voucher_revision' OR (award.max_usage IS NOT NULL AND
     (SELECT count(*) FROM public.voucher_redemption WHERE voucher_id=award.id AND status='applied')>=award.max_usage) THEN
     RAISE EXCEPTION 'complaint_voucher_unavailable' USING ERRCODE='22023';
    END IF;
    INSERT INTO public.customer_voucher(customer_id,voucher_id,acquired_method,voucher_status,expired_at)
    VALUES(ticket.customer_id,award.id,'complaint_compensation','available',((award.end_date+1)::timestamp AT TIME ZONE 'Asia/Bangkok'))
    RETURNING id INTO award_id;
   END IF;
  ELSIF ticket.resolution_type IN ('refund','rma_refund') THEN$new$);
 body:=replace(body,'r.refunded_amount>=ticket.approved_amount','r.refunded_amount=ticket.approved_amount');
 body:=replace(body,$old$(prior.description::jsonb-'source_staff_id'-'result_id')$old$,$new$(prior.description::jsonb-'source_staff_id'-'result_id'-'voucher_id'-'voucher_amount'-'voucher_revision')$new$);
 body:=replace(body,$old$'source_staff_id',(SELECT staff_id FROM public.appointment WHERE id=ticket.appointment_id)))::text ELSE payload END);$old$,
 $new$'source_staff_id',(SELECT staff_id FROM public.appointment WHERE id=ticket.appointment_id))||
  CASE WHEN award.id IS NOT NULL THEN jsonb_build_object('voucher_id',award.id,'voucher_amount',award.discount_value,'voucher_revision',md5(to_jsonb(award)::text)) ELSE '{}'::jsonb END)::text
 WHEN award_id IS NOT NULL THEN (payload::jsonb||jsonb_build_object('result_id',award_id))::text ELSE payload END);$new$);
 IF strpos(body,'award.id IS NOT NULL')=0 OR strpos(body,'INSERT INTO public.customer_voucher')=0 OR strpos(body,'''change_staff'',''points'',''voucher''')=0
  OR strpos(body,'''media_asset_ids'',''voucher_code''')=0 THEN RAISE EXCEPTION 'incomplete_complaint_compensation_patch'; END IF;
 EXECUTE body;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
