BEGIN;
CREATE OR REPLACE FUNCTION public.admin_article_page(p_filters jsonb DEFAULT '{}',p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE result jsonb;permission_name text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501';END IF;
 FOREACH permission_name IN ARRAY ARRAY['blog_post.read','blog_category.read','chatbot_knowledge_faq.read'] LOOP
  IF NOT pawpal_private.has_permission(permission_name) THEN RAISE EXCEPTION 'article_read_forbidden' USING ERRCODE='42501';END IF;
 END LOOP;
 IF jsonb_typeof(p_filters)<>'object' OR length(coalesce(p_filters->>'query',''))>200 THEN RAISE EXCEPTION 'invalid_filter' USING ERRCODE='22023';END IF;
 WITH base AS MATERIALIZED(
  SELECT b.id,b.updated_at,b.created_at,b.view_count,to_jsonb(b)-'content' payload,coalesce(c.description,c.category_name,'Chưa phân loại') category,
   CASE WHEN upper(b.status) IN ('PUBLISHED','DA_DANG','DA_XUAT_BAN','ACTIVE') THEN 'published' WHEN upper(b.status) IN ('ARCHIVED','HIDDEN','DA_AN') THEN 'hidden' WHEN upper(b.status) IN ('PENDING_REVIEW','CHO_DUYET') THEN 'pending_review' ELSE 'draft' END status
  FROM public.blog_post b LEFT JOIN public.blog_category c ON c.id=b.category_id
 ), matched AS MATERIALIZED(
  SELECT * FROM base WHERE (coalesce(p_filters->>'category','all')='all' OR category=p_filters->>'category')
  AND (coalesce(p_filters->>'status','all')='all' OR status=p_filters->>'status')
  AND strpos(lower(payload->>'title'),lower(coalesce(p_filters->>'query','')))>0
 ), meta AS(SELECT count(*) total,least(greatest(coalesce(p_page,1),1),greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched),
 page_rows AS(SELECT * FROM matched ORDER BY coalesce(updated_at,created_at) DESC,id DESC LIMIT 10 OFFSET(SELECT (page-1)*10 FROM meta))
 SELECT jsonb_build_object('blogs',coalesce((SELECT jsonb_agg(payload ORDER BY coalesce(updated_at,created_at) DESC,id DESC) FROM page_rows),'[]'::jsonb),
 'total',meta.total,'page',meta.page,'categories',coalesce((SELECT jsonb_agg(jsonb_build_object('id',id,'category_name',category_name,'description',description) ORDER BY display_order,id) FROM public.blog_category),'[]'::jsonb),
 'knowledge',coalesce((SELECT jsonb_agg(jsonb_build_object('id',k.id,'category',k.category,'is_active',k.is_active)) FROM public.chatbot_knowledge_faq k WHERE k.id IN(SELECT id FROM page_rows) AND k.category='blog:'||k.id::text),'[]'::jsonb),
 'stats',jsonb_build_object('total',(SELECT count(*) FROM base),'published',(SELECT count(*) FROM base WHERE status='published'),'draft',(SELECT count(*) FROM base WHERE status='draft'),'hidden',(SELECT count(*) FROM base WHERE status='hidden'),'views',(SELECT coalesce(sum(view_count),0) FROM base))) INTO result FROM meta;
 RETURN result;
END $$;

CREATE OR REPLACE FUNCTION public.admin_promos_page(p_banner_page integer DEFAULT 1,p_voucher_page integer DEFAULT 1,p_filters jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE result jsonb;permission_name text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501';END IF;
 FOREACH permission_name IN ARRAY ARRAY['banner.read','voucher.read','voucher_redemption.read'] LOOP
  IF NOT pawpal_private.has_permission(permission_name) THEN RAISE EXCEPTION 'promos_read_forbidden' USING ERRCODE='42501';END IF;
 END LOOP;
 IF jsonb_typeof(p_filters)<>'object' OR length(coalesce(p_filters->>'query',''))>200 THEN RAISE EXCEPTION 'invalid_filter' USING ERRCODE='22023';END IF;
 WITH usage AS MATERIALIZED(SELECT voucher_id,count(*) used FROM public.voucher_redemption WHERE status='applied' GROUP BY voucher_id),
 vouchers AS MATERIALIZED(
  SELECT v.id,to_jsonb(v) payload,coalesce(u.used,0) used,v.max_usage limit_value,
   CASE WHEN (v.end_date IS NOT NULL AND v.end_date<now()) OR (v.max_usage IS NOT NULL AND coalesce(u.used,0)>=v.max_usage) THEN 'expired' WHEN v.is_active=false THEN 'paused' ELSE 'active' END status,
   CASE WHEN lower(to_jsonb(v)->>'applicable_for')~'spa|care' THEN 'Spa' WHEN lower(to_jsonb(v)->>'applicable_for')~'hotel' THEN 'Hotel' WHEN lower(to_jsonb(v)->>'applicable_for')~'taxi' THEN 'Taxi' WHEN lower(to_jsonb(v)->>'applicable_for')~'all|system' THEN 'System' ELSE 'Shop' END target
  FROM public.voucher v LEFT JOIN usage u ON u.voucher_id=v.id
 ), matched AS MATERIALIZED(
  SELECT * FROM vouchers WHERE (coalesce(p_filters->>'target','all')='all' OR target=p_filters->>'target')
  AND (coalesce(p_filters->>'status','all')='all' OR status=p_filters->>'status' OR (p_filters->>'status'='zero-miss' AND limit_value IS NOT NULL AND (used>=limit_value OR(status='active' AND limit_value-used<=10))))
  AND (strpos(lower(coalesce(payload->>'voucher_code','')),lower(coalesce(p_filters->>'query','')))>0 OR strpos(lower(coalesce(payload->>'voucher_name','')),lower(coalesce(p_filters->>'query','')))>0)
 ), vm AS(SELECT count(*) total,least(greatest(coalesce(p_voucher_page,1),1),greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched),
 bm AS(SELECT count(*) total,least(greatest(coalesce(p_banner_page,1),1),greatest(1,ceil(count(*)/10.0)::integer)) page FROM public.banner),
 vp AS(SELECT * FROM matched ORDER BY id LIMIT 10 OFFSET(SELECT (page-1)*10 FROM vm)),
 bp AS(SELECT * FROM public.banner ORDER BY id LIMIT 10 OFFSET(SELECT (page-1)*10 FROM bm))
 SELECT jsonb_build_object('banners',coalesce((SELECT jsonb_agg(to_jsonb(b) ORDER BY id) FROM bp b),'[]'::jsonb),'vouchers',coalesce((SELECT jsonb_agg(payload ORDER BY id) FROM vp),'[]'::jsonb),
  'usageCounts',coalesce((SELECT jsonb_object_agg(id,used) FROM vp),'{}'::jsonb),'bannerTotal',bm.total,'bannerPage',bm.page,'voucherTotal',vm.total,'voucherPage',vm.page,
  'stats',jsonb_build_object('totalVouchers',(SELECT count(*) FROM vouchers),'activeVouchers',(SELECT count(*) FROM vouchers WHERE status='active'),
    'activeBanners',(SELECT count(*) FROM public.banner WHERE status IN('active','dang_hien_thi','ACTIVE')),
    'expiringBanners',(SELECT count(*) FROM public.banner WHERE status IN('active','dang_hien_thi','ACTIVE') AND ((end_date::date+time '23:59:59') AT TIME ZONE 'Asia/Ho_Chi_Minh')>=now() AND ((end_date::date+time '23:59:59') AT TIME ZONE 'Asia/Ho_Chi_Minh')<=now()+interval '24 hours'),
    'exhaustedVouchers',(SELECT count(*) FROM vouchers WHERE limit_value IS NOT NULL AND used>=limit_value),
    'lowStockVouchers',(SELECT count(*) FROM vouchers WHERE status='active' AND limit_value IS NOT NULL AND limit_value-used<=10 AND used<limit_value))) INTO result FROM vm CROSS JOIN bm;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_article_page(jsonb,integer),public.admin_promos_page(integer,integer,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_article_page(jsonb,integer),public.admin_promos_page(integer,integer,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
