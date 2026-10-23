-- Owner-scoped eligible spending, net of successful eligible refunds.
BEGIN;
CREATE OR REPLACE FUNCTION public.own_loyalty_snapshot()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE profile jsonb; cid uuid; tier jsonb; balance bigint; catalog jsonb; wallet jsonb; history jsonb; eligible_spend numeric; tiers jsonb;
BEGIN
 profile:=public.customer_profile_snapshot();cid:=(profile->>'id')::uuid;
 SELECT jsonb_build_object('minimum_expenditure',t.minimum_expenditure,'name',t.tier_name,'discount_percent',t.discount_percent,'description',t.description)
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
 SELECT greatest(0,coalesce(sum(p.eligible_spend_amount-coalesce((SELECT sum(r.eligible_refund_amount) FROM public.refund_transaction r WHERE r.payment_id=p.id AND r.refund_status='succeeded'),0)),0)) INTO eligible_spend FROM public.payment p WHERE p.customer_id=cid AND p.transaction_status='succeeded';
 SELECT coalesce(jsonb_agg(jsonb_build_object('name',tier_name,'minimum_expenditure',minimum_expenditure,'discount_percent',discount_percent) ORDER BY minimum_expenditure,id),'[]') INTO tiers FROM public.membership_tier WHERE is_active;
 RETURN jsonb_build_object('eligible_spend',eligible_spend,'tiers',tiers,'customer_id',cid,'name',profile->>'name','points',balance,'tier',tier,'catalog',catalog,'wallet',wallet,'history',history);
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
