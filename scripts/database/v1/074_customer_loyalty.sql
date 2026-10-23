-- Self-service loyalty: authoritative reads and atomic, idempotent redemption.
BEGIN;
CREATE OR REPLACE FUNCTION public.own_loyalty_snapshot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE profile jsonb; cid uuid; tier jsonb; balance bigint; catalog jsonb; wallet jsonb; history jsonb;
BEGIN
 profile:=public.customer_profile_snapshot();cid:=(profile->>'id')::uuid;
 SELECT jsonb_build_object('name',t.tier_name,'discount_percent',t.discount_percent,'description',t.description)
 INTO tier FROM public.customer_membership m JOIN public.membership_tier t ON t.id=m.membership_tier_id WHERE m.customer_id=cid;
 SELECT coalesce(sum(points),0) INTO balance FROM public.paw_point_transaction WHERE customer_id=cid;
 SELECT coalesce(jsonb_agg(to_jsonb(v)||jsonb_build_object('version',md5(to_jsonb(v)::text)) ORDER BY v.required_points,v.voucher_code),'[]') INTO catalog FROM public.voucher v
 WHERE v.is_active AND v.required_points>0 AND (now() AT TIME ZONE 'Asia/Bangkok')::date BETWEEN v.start_date AND v.end_date;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',cv.id,'voucher',to_jsonb(v),'status',cv.voucher_status,
  'acquired_at',cv.acquired_at,'expired_at',cv.expired_at) ORDER BY cv.acquired_at DESC,cv.id),'[]') INTO wallet
 FROM public.customer_voucher cv JOIN public.voucher v ON v.id=cv.voucher_id WHERE cv.customer_id=cid;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'points',p.points,'description',p.description,
  'created_at',p.created_at,'sequence_no',p.sequence_no) ORDER BY p.sequence_no DESC),'[]') INTO history
 FROM public.paw_point_transaction p WHERE p.customer_id=cid;
 RETURN jsonb_build_object('customer_id',cid,'name',profile->>'name','points',balance,'tier',tier,'catalog',catalog,'wallet',wallet,'history',history);
END $$;

CREATE OR REPLACE FUNCTION public.redeem_own_loyalty_voucher(p_id uuid,p_voucher uuid,p_expected text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cid uuid; v public.voucher; old public.customer_voucher; prior public.paw_point_transaction; balance bigint; seq bigint; today date;
BEGIN
 cid:=(public.customer_profile_snapshot()->>'id')::uuid;
 IF p_id IS NULL OR p_voucher IS NULL OR p_expected IS NULL THEN RAISE EXCEPTION 'Yêu cầu không hợp lệ' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,0));
 PERFORM 1 FROM public.customer WHERE id=cid FOR UPDATE;
 SELECT * INTO old FROM public.customer_voucher WHERE id=p_id;
 IF FOUND THEN
  SELECT * INTO prior FROM public.paw_point_transaction WHERE idempotency_key='loyalty:'||p_id||':'||p_expected;
  IF old.customer_id=cid AND old.voucher_id=p_voucher AND prior.customer_id=cid
   AND prior.customer_voucher_id=p_id THEN RETURN p_id; END IF;
  RAISE EXCEPTION 'Mã gửi lại có nội dung khác' USING ERRCODE='PT409';
 END IF;
 SELECT * INTO v FROM public.voucher WHERE id=p_voucher FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy ưu đãi' USING ERRCODE='22023'; END IF;
 IF md5(to_jsonb(v)::text)<>p_expected THEN RAISE EXCEPTION 'Ưu đãi đã thay đổi. Vui lòng tải lại' USING ERRCODE='PT409'; END IF;
 today:=(now() AT TIME ZONE 'Asia/Bangkok')::date;
 IF NOT v.is_active OR v.required_points<=0 OR today NOT BETWEEN v.start_date AND v.end_date THEN
  RAISE EXCEPTION 'Ưu đãi không còn hiệu lực đổi điểm' USING ERRCODE='22023'; END IF;
 IF v.max_usage IS NOT NULL AND (SELECT count(*) FROM public.voucher_redemption WHERE voucher_id=v.id AND status='applied')>=v.max_usage THEN
  RAISE EXCEPTION 'Ưu đãi đã hết lượt sử dụng' USING ERRCODE='22023'; END IF;
 SELECT coalesce(sum(points),0),coalesce(max(sequence_no),0)+1 INTO balance,seq FROM public.paw_point_transaction WHERE customer_id=cid;
 IF balance<v.required_points THEN RAISE EXCEPTION 'Không đủ điểm để đổi ưu đãi' USING ERRCODE='23514'; END IF;
 INSERT INTO public.customer_voucher(id,customer_id,voucher_id,acquired_method,voucher_status,expired_at)
 VALUES(p_id,cid,v.id,'point_redemption','available',((v.end_date+1)::timestamp AT TIME ZONE 'Asia/Bangkok'));
 INSERT INTO public.paw_point_transaction(customer_id,points,customer_voucher_id,idempotency_key,sequence_no,description)
 VALUES(cid,-v.required_points,p_id,'loyalty:'||p_id||':'||p_expected,seq,'Đổi ưu đãi '||v.voucher_code);
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.own_loyalty_snapshot(),public.redeem_own_loyalty_voucher(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_loyalty_snapshot(),public.redeem_own_loyalty_voucher(uuid,uuid,text) TO authenticated;
DO $$ DECLARE t text;BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime' AND NOT puballtables) THEN
  FOREACH t IN ARRAY ARRAY['paw_point_transaction','customer_voucher','customer_membership'] LOOP
   IF NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
    EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t);
   END IF;
  END LOOP;
 END IF;
END $$;
COMMIT;
