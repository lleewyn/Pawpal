-- Owner-scoped eligible spending, net of successful eligible refunds.
BEGIN;
CREATE OR REPLACE FUNCTION public.own_loyalty_snapshot(p_history_page integer,p_wallet_page integer,p_catalog_page integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE profile jsonb; cid uuid; tier jsonb; balance bigint; catalog jsonb; wallet jsonb; history jsonb; eligible_spend numeric; tiers jsonb; hc bigint; wc bigint; cc bigint; hp integer; wp integer; cp integer;
BEGIN
 IF p_history_page IS NULL OR p_wallet_page IS NULL OR p_catalog_page IS NULL OR least(p_history_page,p_wallet_page,p_catalog_page)<1 OR greatest(p_history_page,p_wallet_page,p_catalog_page)>100000 THEN RAISE EXCEPTION 'invalid_loyalty_page' USING ERRCODE='22023'; END IF;
 profile:=public.customer_profile_snapshot();cid:=(profile->>'id')::uuid;
 SELECT count(*) INTO hc FROM public.paw_point_transaction WHERE customer_id=cid;
 SELECT count(*) INTO wc FROM public.customer_voucher WHERE customer_id=cid;
 SELECT count(*) INTO cc FROM public.voucher WHERE is_active AND required_points>0 AND (now() AT TIME ZONE 'Asia/Bangkok')::date BETWEEN start_date AND end_date;
 hp:=least(p_history_page,greatest(1,ceil(hc::numeric/10)::integer));wp:=least(p_wallet_page,greatest(1,ceil(wc::numeric/6)::integer));cp:=least(p_catalog_page,greatest(1,ceil(cc::numeric/6)::integer));
 SELECT jsonb_build_object('minimum_expenditure',t.minimum_expenditure,'name',t.tier_name,'discount_percent',t.discount_percent,'description',t.description)
 INTO tier FROM public.customer_membership m JOIN public.membership_tier t ON t.id=m.membership_tier_id WHERE m.customer_id=cid;
 SELECT coalesce(sum(points),0) INTO balance FROM public.paw_point_transaction WHERE customer_id=cid;
 SELECT coalesce(jsonb_agg(to_jsonb(v)||jsonb_build_object('version',md5(to_jsonb(v)::text)) ORDER BY v.required_points,v.voucher_code),'[]') INTO catalog FROM (SELECT * FROM public.voucher WHERE is_active AND required_points>0 AND (now() AT TIME ZONE 'Asia/Bangkok')::date BETWEEN start_date AND end_date ORDER BY required_points,voucher_code,id LIMIT 6 OFFSET (cp-1)*6) v;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',cv.id,'voucher',to_jsonb(v),'status',cv.voucher_status,
  'acquired_at',cv.acquired_at,'expired_at',cv.expired_at) ORDER BY cv.acquired_at DESC,cv.id),'[]') INTO wallet
 FROM (SELECT * FROM public.customer_voucher WHERE customer_id=cid ORDER BY acquired_at DESC,id LIMIT 6 OFFSET (wp-1)*6) cv JOIN public.voucher v ON v.id=cv.voucher_id;
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',p.id,'points',p.points,'description',p.description,
  'created_at',p.created_at,'sequence_no',p.sequence_no) ORDER BY p.sequence_no DESC),'[]') INTO history
 FROM (SELECT * FROM public.paw_point_transaction WHERE customer_id=cid ORDER BY sequence_no DESC,id LIMIT 10 OFFSET (hp-1)*10) p;
 SELECT greatest(0,coalesce(sum(p.eligible_spend_amount-coalesce((SELECT sum(r.eligible_refund_amount) FROM public.refund_transaction r WHERE r.payment_id=p.id AND r.refund_status='succeeded'),0)),0)) INTO eligible_spend FROM public.payment p WHERE p.customer_id=cid AND p.transaction_status='succeeded';
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',tier_name,'minimum_expenditure',minimum_expenditure,'discount_percent',discount_percent) ORDER BY minimum_expenditure,id),'[]') INTO tiers FROM public.membership_tier WHERE is_active;
 RETURN jsonb_build_object('history_total',hc,'wallet_total',wc,'catalog_total',cc,'history_page',hp,'wallet_page',wp,'catalog_page',cp,'eligible_spend',eligible_spend,'tiers',tiers,'customer_id',cid,'name',profile->>'name','points',balance,'tier',tier,'catalog',catalog,'wallet',wallet,'history',history);
END $$;

REVOKE ALL ON FUNCTION public.own_loyalty_snapshot(integer,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_loyalty_snapshot(integer,integer,integer) TO authenticated;
NOTIFY pgrst, 'reload schema';
COMMIT;
