BEGIN;
CREATE OR REPLACE FUNCTION public.reply_admin_sales_review(p_review_id uuid,p_response_id uuid,p_expected_updated_at timestamptz,p_text text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; latest public.review_response; result uuid;
BEGIN
 IF NOT pawpal_private.has_permission('review_response.write') OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'review_reply_forbidden' USING ERRCODE='42501'; END IF;
 IF coalesce(length(btrim(p_text)),0) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'invalid_review_reply' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.review WHERE id=p_review_id AND sales_order_detail_id IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'sales_review_not_found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO latest FROM public.review_response WHERE review_id=p_review_id ORDER BY updated_at DESC,id LIMIT 1 FOR UPDATE;
 IF latest.id IS DISTINCT FROM p_response_id OR latest.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'review_reply_changed' USING ERRCODE='PT409'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF latest.id IS NULL THEN
  INSERT INTO public.review_response(review_id,staff_id,response_content) VALUES(p_review_id,actor,btrim(p_text)) RETURNING id INTO result;
 ELSE
  UPDATE public.review_response SET staff_id=actor,response_content=btrim(p_text) WHERE id=latest.id RETURNING id INTO result;
 END IF;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'REPLY_REVIEW','review_response',result,'Lưu phản hồi đánh giá sản phẩm.');
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.reply_admin_sales_review(uuid,uuid,timestamptz,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.reply_admin_sales_review(uuid,uuid,timestamptz,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
