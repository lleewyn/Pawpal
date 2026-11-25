BEGIN;
CREATE OR REPLACE FUNCTION public.submit_own_service_reviews(p_booking uuid,p_reviews jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
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
   result:=result||jsonb_build_array(prior.id);CONTINUE;
  END IF;
  INSERT INTO public.review(id,appointment_item_id,rating,review_content,review_status)
  VALUES(review_id,line_id,stars::integer,content,'pending');
  result:=result||jsonb_build_array(review_id);
 END LOOP;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.submit_own_service_reviews(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.submit_own_service_reviews(uuid,jsonb) TO authenticated;
CREATE OR REPLACE FUNCTION public.own_service_reviews(p_booking uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; result jsonb;
BEGIN
 SELECT customer_id INTO owner_id FROM public.appointment WHERE id=p_booking;
 IF NOT FOUND OR NOT pawpal_private.owns_customer(owner_id)
 OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'review_owner_required' USING ERRCODE='42501'; END IF;
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at,x.id),'[]'::jsonb) INTO result FROM (
  SELECT r.id,r.appointment_item_id,r.rating,r.review_content,r.review_status,r.created_at,
   (SELECT response_content FROM public.review_response WHERE review_id=r.id ORDER BY updated_at DESC,id LIMIT 1) AS shop_reply
  FROM public.review r JOIN public.appointment_item i ON i.id=r.appointment_item_id WHERE i.appointment_id=p_booking
 ) x;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.own_service_reviews(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_service_reviews(uuid) TO authenticated;
DROP POLICY IF EXISTS own_service_review ON public.review;
CREATE POLICY own_service_review ON public.review FOR SELECT TO authenticated USING(EXISTS(
 SELECT 1 FROM public.appointment_item i JOIN public.appointment a ON a.id=i.appointment_id
 WHERE i.id=appointment_item_id AND pawpal_private.owns_customer(a.customer_id)));
NOTIFY pgrst,'reload schema';
COMMIT;
