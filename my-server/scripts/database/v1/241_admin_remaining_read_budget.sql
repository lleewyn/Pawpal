BEGIN;
CREATE OR REPLACE FUNCTION public.admin_business_metric(p_key text,p_from date,p_to date)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE result jsonb; perms text[]; perm text; start_at timestamptz;end_at timestamptz;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501';END IF;
 IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_to<p_from OR p_to-p_from>91 THEN RAISE EXCEPTION 'invalid_dashboard_period';END IF;
 perms:=CASE p_key WHEN 'sources' THEN ARRAY['payment.read'] WHEN 'customers' THEN ARRAY['customer.read'] WHEN 'returning' THEN ARRAY['sales_order.read','appointment.read'] WHEN 'membership' THEN ARRAY['customer_membership.read','membership_tier.read'] WHEN 'vouchers' THEN ARRAY['voucher_redemption.read'] WHEN 'points' THEN ARRAY['paw_point_transaction.read'] WHEN 'products' THEN ARRAY['sales_order.read','sales_order_detail.read'] WHEN 'services' THEN ARRAY['appointment.read','appointment_item.read'] ELSE NULL END;
 IF perms IS NULL THEN RAISE EXCEPTION 'unknown_metric';END IF;
 FOREACH perm IN ARRAY perms LOOP IF NOT pawpal_private.has_permission(perm) THEN RAISE EXCEPTION 'metric_forbidden' USING ERRCODE='42501';END IF;END LOOP;
 start_at:=p_from::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';end_at:=(p_to+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';
 CASE p_key
 WHEN 'sources' THEN SELECT jsonb_build_object('products',coalesce(sum(amount) FILTER(WHERE order_id IS NOT NULL AND appointment_id IS NULL),0),'services',coalesce(sum(amount) FILTER(WHERE appointment_id IS NOT NULL AND order_id IS NULL),0),'other',coalesce(sum(amount) FILTER(WHERE (appointment_id IS NULL)=(order_id IS NULL)),0)) INTO result FROM public.payment WHERE transaction_status='succeeded' AND succeeded_at>=start_at AND succeeded_at<end_at;
 WHEN 'customers' THEN SELECT coalesce(jsonb_agg(x ORDER BY x.registered_at),'[]') INTO result FROM(SELECT (registered_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date registered_at,count(*) count FROM public.customer WHERE registered_at>=start_at AND registered_at<end_at GROUP BY 1)x;
 WHEN 'returning' THEN WITH transactions AS(SELECT customer_id FROM public.sales_order WHERE order_status IN('completed','delivered') AND delivered_at>=start_at AND delivered_at<end_at UNION ALL SELECT customer_id FROM public.appointment WHERE appointment_status='completed' AND check_out_time>=start_at AND check_out_time<end_at),counts AS(SELECT customer_id,count(*) n FROM transactions WHERE customer_id IS NOT NULL GROUP BY customer_id) SELECT jsonb_build_object('eligible',count(*),'returning',count(*) FILTER(WHERE n>=2),'rate',CASE WHEN count(*)>0 THEN 100.0*count(*) FILTER(WHERE n>=2)/count(*) END) INTO result FROM counts;
 WHEN 'membership' THEN SELECT coalesce(jsonb_agg(x),'[]') INTO result FROM(SELECT t.tier_name name,count(m.customer_id) value FROM public.membership_tier t LEFT JOIN public.customer_membership m ON m.membership_tier_id=t.id GROUP BY t.id,t.tier_name ORDER BY t.id)x;
 WHEN 'vouchers' THEN SELECT jsonb_build_object('count',count(*),'discount',coalesce(sum(discount_amount_snapshot),0)) INTO result FROM public.voucher_redemption WHERE status='applied' AND redeemed_at>=start_at AND redeemed_at<end_at;
 WHEN 'points' THEN SELECT jsonb_build_object('credited',coalesce(sum(points) FILTER(WHERE points>=0),0),'debited',coalesce(sum(-points) FILTER(WHERE points<0),0)) INTO result FROM public.paw_point_transaction WHERE created_at>=start_at AND created_at<end_at;
 ELSE
  WITH lines AS(
   SELECT d.id,d.product_variant_id entity,d.product_name_snapshot name,d.quantity,d.unit_price,d.discount_amount FROM public.sales_order_detail d JOIN public.sales_order o ON o.id=d.order_id WHERE p_key='products' AND o.order_status IN('completed','delivered') AND o.created_at>=start_at AND o.created_at<end_at
   UNION ALL SELECT i.id,coalesce(i.service_id,i.service_addon_id),i.name_snapshot,i.quantity,i.unit_price,i.discount_amount FROM public.appointment_item i JOIN public.appointment a ON a.id=i.appointment_id WHERE p_key='services' AND a.appointment_status='completed' AND i.status='completed' AND a.scheduled_start_at>=start_at AND a.scheduled_start_at<end_at
  ), grouped AS(SELECT entity id,(array_agg(name ORDER BY id))[1] name,sum(quantity) quantity,sum(quantity*unit_price-discount_amount) value FROM lines WHERE entity IS NOT NULL GROUP BY entity), ranked AS(
   (SELECT * FROM grouped ORDER BY value DESC,id LIMIT 10) UNION (SELECT * FROM grouped ORDER BY quantity DESC,id LIMIT 10)
  ) SELECT coalesce(jsonb_agg(to_jsonb(r)||jsonb_build_object('aggregate',true)),'[]') INTO result FROM ranked r;
 END CASE;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_business_metric(text,date,date) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_business_metric(text,date,date) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_complaint_action_summary(p_ticket uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() OR NOT pawpal_private.has_permission('audit_log.read') OR NOT pawpal_private.has_permission('support_ticket.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501';END IF;
 RETURN coalesce((WITH parsed AS(SELECT id,description,created_at,CASE WHEN pg_input_is_valid(description,'jsonb') THEN description::jsonb ELSE '{}'::jsonb END d FROM public.audit_log WHERE entity_id=p_ticket AND action='COMPLAINT_ACTION'),selected AS(
 (SELECT * FROM parsed WHERE d->>'action'='propose' ORDER BY created_at DESC,id DESC LIMIT 1)
 UNION (SELECT * FROM parsed WHERE d->>'action'='complete' ORDER BY created_at DESC,id DESC LIMIT 10)
 ) SELECT jsonb_agg(jsonb_build_object('id',id,'description',description,'created_at',created_at) ORDER BY created_at DESC,id DESC) FROM selected),'[]');
END $$;
REVOKE ALL ON FUNCTION public.admin_complaint_action_summary(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_complaint_action_summary(uuid) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_service_catalog_summary()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE perm text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501';END IF;
 FOREACH perm IN ARRAY ARRAY['service.read','service_image.read','service_category.read','staff_level.read','service_supported_species.read','pet_species.read','service_care_action.read'] LOOP
  IF NOT pawpal_private.has_permission(perm) THEN RAISE EXCEPTION 'catalog_forbidden' USING ERRCODE='42501';END IF;
 END LOOP;
 RETURN coalesce((SELECT jsonb_agg((to_jsonb(s)-'description'-'benefits'-'amenities')||jsonb_build_object(
 'description',left(s.description,160),'summary',true,
 'category',(SELECT to_jsonb(c) FROM public.service_category c WHERE c.id=s.category_id),
 'level',(SELECT jsonb_build_object('id',l.id,'level_name',l.level_name) FROM public.staff_level l WHERE l.id=s.staff_level_required_id),
 'supported',coalesce((SELECT jsonb_agg(jsonb_build_object('species',jsonb_build_object('id',sp.id,'species_name',sp.species_name))) FROM public.service_supported_species ss JOIN public.pet_species sp ON sp.id=ss.species_id WHERE ss.service_id=s.id),'[]'),
 'actions','[]'::jsonb,'step_count',(SELECT count(*) FROM public.service_care_action a WHERE a.service_id=s.id),
 'images',coalesce((SELECT jsonb_agg(i) FROM(SELECT image_url,media_asset_id,display_order,is_thumbnail FROM public.service_image WHERE service_id=s.id ORDER BY is_thumbnail DESC,display_order,id LIMIT 1)i),'[]')) ORDER BY s.id) FROM public.service s),'[]');
END $$;
REVOKE ALL ON FUNCTION public.admin_service_catalog_summary() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_service_catalog_summary() TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_sales_voucher_page(p_query text DEFAULT '',p_page integer DEFAULT 1,p_pos boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE result jsonb;today date:=(now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
 IF length(coalesce(p_query,''))>200 THEN RAISE EXCEPTION 'invalid_filter';END IF;
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() OR NOT pawpal_private.has_permission('voucher.read') OR NOT pawpal_private.has_permission('voucher_redemption.read') THEN RAISE EXCEPTION 'voucher_forbidden' USING ERRCODE='42501';END IF;
 WITH base AS MATERIALIZED(SELECT x,coalesce((x->>'is_active')::boolean,false) AND ((x->>'start_date') IS NULL OR (x->>'start_date')::date<=today) AND ((x->>'end_date') IS NULL OR (x->>'end_date')::date>=today) running FROM (SELECT to_jsonb(v) x FROM public.voucher v)v),
 matched AS(SELECT * FROM base WHERE (NOT p_pos OR (running AND x->>'applicable_for' IN('all','shop'))) AND (coalesce(p_query,'')='' OR strpos(pawpal_private.fold_search(concat_ws(' ',x->>'voucher_code',x->>'voucher_name',x->>'description')),pawpal_private.fold_search(p_query))>0)),
 meta AS(SELECT count(*) total,least(greatest(coalesce(p_page,1),1),greatest(1,ceil(count(*)/10.0)::integer)) page FROM matched)
 SELECT jsonb_build_object('total',meta.total,'page',meta.page,'rows',coalesce((SELECT jsonb_agg(x||jsonb_build_object('used',(SELECT count(*) FROM public.voucher_redemption WHERE voucher_id=(x->>'id')::uuid AND status='applied')) ORDER BY x->>'id') FROM(SELECT x FROM matched ORDER BY x->>'id' LIMIT 10 OFFSET (meta.page-1)*10)r),'[]'),
 'stats',jsonb_build_object('active',(SELECT count(*) FROM base WHERE running),'expiring',(SELECT count(*) FROM base WHERE running AND x->>'end_date' IS NOT NULL AND (x->>'end_date')::date<=today+7),
 'usedToday',(SELECT count(*) FROM public.voucher_redemption WHERE status='applied' AND redeemed_at>=today::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND redeemed_at<(today+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'))) INTO result FROM meta;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_sales_voucher_page(text,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_sales_voucher_page(text,integer,boolean) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_complaint_completed_page(p_ticket uuid,p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() OR NOT pawpal_private.has_permission('audit_log.read') OR NOT pawpal_private.has_permission('support_ticket.read') THEN RAISE EXCEPTION 'complaint_forbidden' USING ERRCODE='42501';END IF;
 IF p_page IS NULL OR p_page<1 OR p_page>1000 THEN RAISE EXCEPTION 'invalid_page';END IF;
 RETURN coalesce((SELECT jsonb_agg(r ORDER BY created_at DESC,id DESC) FROM(SELECT id,description,created_at FROM public.audit_log WHERE entity_id=p_ticket AND action='COMPLAINT_ACTION' AND CASE WHEN pg_input_is_valid(description,'jsonb') THEN description::jsonb->>'action'='complete' ELSE false END ORDER BY created_at DESC,id DESC LIMIT 11 OFFSET (p_page-1)*10)r),'[]');
END $$;
REVOKE ALL ON FUNCTION public.admin_complaint_completed_page(uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_complaint_completed_page(uuid,integer) TO authenticated;
DROP FUNCTION IF EXISTS pawpal_private.sales_voucher_summary();
NOTIFY pgrst,'reload schema';
COMMIT;
