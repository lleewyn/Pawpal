BEGIN;

-- Chuyển mặc định review_status sang 'published' (Tự động công bố đánh giá sau khi hoàn thành đơn/ca dịch vụ)
CREATE OR REPLACE FUNCTION public.submit_own_sales_reviews(p_order uuid, p_reviews jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
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
   PERFORM pawpal_private.attach_review_media(prior.id,coalesce(item->'media_asset_ids','[]'::jsonb),false);
   result:=result||jsonb_build_array(prior.id);CONTINUE;
  END IF;
  INSERT INTO public.review(id,sales_order_detail_id,rating,review_content,review_status)
  VALUES(review_id,line_id,stars::integer,content,'published');
  PERFORM pawpal_private.attach_review_media(review_id,coalesce(item->'media_asset_ids','[]'::jsonb),true);
  result:=result||jsonb_build_array(review_id);
 END LOOP;
 RETURN result;
END $function$;

CREATE OR REPLACE FUNCTION public.submit_own_service_reviews(p_booking uuid, p_reviews jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE a public.appointment; item jsonb; line_id uuid; review_id uuid; stars numeric; content text;
 prior public.review; seen uuid[]:='{}'; result jsonb:='[]';
BEGIN
 SELECT * INTO a FROM public.appointment WHERE id=p_booking FOR UPDATE;
 IF NOT FOUND OR NOT pawpal_private.owns_customer(a.customer_id)
 OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'review_owner_required' USING ERRCODE='42501'; END IF;
 IF a.appointment_status<>'completed' THEN RAISE EXCEPTION 'review_requires_completed_service' USING ERRCODE='22023'; END IF;
 IF jsonb_typeof(p_reviews) IS DISTINCT FROM 'array' OR jsonb_array_length(p_reviews) NOT BETWEEN 1 AND 100 OR length(p_reviews::text)>350000 THEN RAISE EXCEPTION 'invalid_reviews' USING ERRCODE='22023'; END IF;
 FOR item IN SELECT value FROM jsonb_array_elements(p_reviews) LOOP
  line_id:=(item->>'line_id')::uuid;review_id:=(item->>'id')::uuid;stars:=(item->>'rating')::numeric;content:=btrim(item->>'content');
  IF line_id IS NULL OR review_id IS NULL OR line_id=ANY(seen) OR stars IS NULL OR stars::text IN ('NaN','Infinity','-Infinity')
  OR stars NOT BETWEEN 1 AND 5 OR round(stars)<>stars OR coalesce(length(content),0) NOT BETWEEN 1 AND 3000
  OR NOT EXISTS(SELECT 1 FROM public.appointment_item WHERE id=line_id AND appointment_id=a.id AND status='completed') THEN RAISE EXCEPTION 'invalid_review_line' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,line_id);
  SELECT * INTO prior FROM public.review WHERE appointment_item_id=line_id LIMIT 1;
  IF FOUND THEN
   IF prior.id<>review_id OR prior.rating<>stars OR prior.review_content IS DISTINCT FROM content THEN RAISE EXCEPTION 'review_already_submitted' USING ERRCODE='PT409'; END IF;
   PERFORM pawpal_private.attach_review_media(prior.id,coalesce(item->'media_asset_ids','[]'::jsonb),false);
   result:=result||jsonb_build_array(prior.id);CONTINUE;
  END IF;
  INSERT INTO public.review(id,appointment_item_id,rating,review_content,review_status)
  VALUES(review_id,line_id,stars::integer,content,'published');
  PERFORM pawpal_private.attach_review_media(review_id,coalesce(item->'media_asset_ids','[]'::jsonb),true);
  result:=result||jsonb_build_array(review_id);
 END LOOP;
 RETURN result;
END $function$;

-- Tự động công bố các đánh giá hợp lệ đang ở trạng thái pending trước đó
UPDATE public.review SET review_status='published' WHERE review_status='pending';

NOTIFY pgrst,'reload schema';
COMMIT;
