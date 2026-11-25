BEGIN;
CREATE TABLE pawpal_private.guest_return_submission (
 id uuid PRIMARY KEY REFERENCES public.return_request(id) ON DELETE CASCADE,
 payload jsonb NOT NULL
);
REVOKE ALL ON pawpal_private.guest_return_submission FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.create_verified_guest_return(p_id uuid,p_order uuid,p_phone text,p_reason text,p_lines jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.sales_order; item jsonb; line_id uuid; qty numeric; seen uuid[]:='{}';
 payload jsonb:=jsonb_build_object('order',p_order,'phone',p_phone,'reason',btrim(p_reason),'lines',p_lines);
 prior jsonb;
BEGIN
 IF p_id IS NULL OR p_order IS NULL OR p_phone IS NULL OR p_phone !~ '^0[0-9]{9}$'
 OR coalesce(length(btrim(p_reason)),0) NOT BETWEEN 2 AND 2000 OR jsonb_typeof(p_lines) IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_lines) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'guest_return_invalid' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,227));
 SELECT s.payload INTO prior FROM pawpal_private.guest_return_submission s WHERE id=p_id;
 IF FOUND THEN
  IF prior IS DISTINCT FROM payload THEN RAISE EXCEPTION 'guest_return_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_id;
 END IF;
 SELECT * INTO o FROM public.sales_order WHERE id=p_order FOR UPDATE;
 IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.customer c WHERE c.id=o.customer_id AND c.auth_user_id IS NULL
   AND c.customer_status IN ('active','ACTIVE','dang_hoat_dong')) THEN RAISE EXCEPTION 'guest_return_invalid' USING ERRCODE='42501'; END IF;
 IF o.order_status NOT IN ('delivered','completed') OR o.delivered_at IS NULL OR o.delivered_at+interval '168 hours'<=clock_timestamp()
 OR NOT EXISTS(SELECT 1 FROM public.payment p WHERE p.order_id=o.id AND p.transaction_status='succeeded' AND p.amount>0) THEN
  RAISE EXCEPTION 'guest_return_ineligible' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.return_request(id,sales_order_id,reason,return_type,description,request_status)
 VALUES(p_id,o.id,btrim(p_reason),'refund','Khách vãng lai · Số điện thoại đã xác thực '||p_phone,'pending');
 FOR item IN SELECT value FROM jsonb_array_elements(p_lines) LOOP
  line_id:=(item->>'line_id')::uuid;qty:=(item->>'quantity')::numeric;
  IF line_id IS NULL OR line_id=ANY(seen) OR qty IS NULL OR qty NOT BETWEEN 1 AND 100000000 OR qty<>trunc(qty)
  OR NOT EXISTS(SELECT 1 FROM public.sales_order_detail WHERE id=line_id AND order_id=o.id) THEN RAISE EXCEPTION 'guest_return_invalid' USING ERRCODE='22023'; END IF;
  INSERT INTO public.return_request_detail(return_request_id,sales_order_detail_id,quantity) VALUES(p_id,line_id,qty);
  seen:=array_append(seen,line_id);
 END LOOP;
 INSERT INTO pawpal_private.guest_return_submission(id,payload) VALUES(p_id,payload);
 RETURN p_id;
END $$;

REVOKE ALL ON FUNCTION public.create_verified_guest_return(uuid,uuid,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_verified_guest_return(uuid,uuid,text,text,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
