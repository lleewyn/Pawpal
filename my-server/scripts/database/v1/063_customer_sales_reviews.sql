BEGIN;
CREATE OR REPLACE FUNCTION public.submit_own_sales_reviews(p_order uuid,p_reviews jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE o public.sales_order; item jsonb; line_id uuid; review_id uuid; stars numeric; content text;
 prior public.review; seen uuid[]:='{}'; result jsonb:='[]';
BEGIN
 SELECT * INTO o FROM public.sales_order WHERE id=p_order FOR UPDATE;
 IF NOT FOUND OR NOT pawpal_private.owns_customer(o.customer_id)
 OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'review_owner_required' USING ERRCODE='42501'; END IF;
 IF o.order_status NOT IN ('completed','delivered') THEN RAISE EXCEPTION 'review_requires_received_order' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_reviews) IS DISTINCT FROM 'array' OR jsonb_array_length(p_reviews) NOT BETWEEN 1 AND 100 OR length(p_reviews::text)>350000 THEN RAISE EXCEPTION 'invalid_reviews' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_reviews) LOOP
  line_id:=(item->>'line_id')::uuid;review_id:=(item->>'id')::uuid;stars:=(item->>'rating')::numeric;content:=btrim(item->>'content');
  IF line_id IS NULL OR review_id IS NULL OR line_id=ANY(seen) OR stars IS NULL OR stars::text IN ('NaN','Infinity','-Infinity')
  OR stars NOT BETWEEN 1 AND 5 OR round(stars)<>stars OR coalesce(length(content),0) NOT BETWEEN 1 AND 3000
  OR NOT EXISTS(SELECT 1 FROM public.sales_order_detail WHERE id=line_id AND order_id=o.id) THEN RAISE EXCEPTION 'invalid_review_line' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,line_id);
  SELECT * INTO prior FROM public.review WHERE sales_order_detail_id=line_id LIMIT 1;
  IF FOUND THEN
   IF prior.id<>review_id OR prior.rating<>stars OR prior.review_content IS DISTINCT FROM content THEN RAISE EXCEPTION 'review_already_submitted' USING ERRCODE='PT409'; END IF;
   result:=result||jsonb_build_array(prior.id);CONTINUE;
  END IF;
  INSERT INTO public.review(id,sales_order_detail_id,rating,review_content,review_status)
  VALUES(review_id,line_id,stars::integer,content,'pending');
  result:=result||jsonb_build_array(review_id);
 END LOOP;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.submit_own_sales_reviews(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_own_sales_reviews(uuid,jsonb) TO authenticated;
DROP POLICY IF EXISTS own_sales_review ON public.review;
CREATE POLICY own_sales_review ON public.review FOR SELECT TO authenticated USING(EXISTS(
 SELECT 1 FROM public.sales_order_detail d JOIN public.sales_order o ON o.id=d.order_id
 WHERE d.id=sales_order_detail_id AND pawpal_private.owns_customer(o.customer_id)));
GRANT SELECT ON public.review TO authenticated;
CREATE OR REPLACE FUNCTION public.customer_product_reviews(p_product uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC,x.id),'[]'::jsonb) FROM (
  SELECT r.id,r.rating,r.review_content,r.created_at,d.sku_snapshot AS variant_name,
   (SELECT response_content FROM public.review_response WHERE review_id=r.id ORDER BY updated_at DESC,id LIMIT 1) AS shop_reply
  FROM public.review r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id
  JOIN public.product_variant v ON v.id=d.product_variant_id
  WHERE v.product_id=p_product AND r.review_status IN ('da_duyet','approved','published')
  ORDER BY r.created_at DESC,r.id LIMIT 500
 ) x
$$;
REVOKE ALL ON FUNCTION public.customer_product_reviews(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.customer_product_reviews(uuid) TO anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
