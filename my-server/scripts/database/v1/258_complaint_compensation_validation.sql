BEGIN;
-- Preserve the existing authorization, approval, award and idempotency flow.
DO $$
DECLARE body text:=pg_get_functiondef('public.act_admin_complaint(uuid,uuid,timestamptz,text,jsonb)'::regprocedure);
 anchor text:=$old$  IF option_value='voucher' AND p_action='propose' THEN$old$;
BEGIN
 IF strpos(body,'complaint_compensation_customer_required')>0 THEN RETURN; END IF;
 IF strpos(body,anchor)=0 OR strpos(body,'INSERT INTO public.paw_point_transaction')=0 THEN
  RAISE EXCEPTION 'unexpected_complaint_compensation_definition';
 END IF;
 body:=replace(body,anchor,$new$  IF option_value IN ('points','voucher') AND ticket.customer_id IS NULL THEN
   RAISE EXCEPTION 'complaint_compensation_customer_required' USING ERRCODE='22023';
  END IF;
  IF option_value='points' AND (amount_value NOT BETWEEN 1 AND 2147483647 OR amount_value<>trunc(amount_value)) THEN
   RAISE EXCEPTION 'complaint_points_invalid' USING ERRCODE='22023';
  END IF;
  IF option_value='voucher' AND nullif(btrim(p_details->>'voucher_code'),'') IS NULL THEN
   RAISE EXCEPTION 'complaint_voucher_code_required' USING ERRCODE='22023';
  END IF;
$new$||anchor);
 EXECUTE body;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
