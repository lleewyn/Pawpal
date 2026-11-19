BEGIN;
DO $$
DECLARE source text;
BEGIN
 SELECT pg_get_functiondef('public.admin_service_review_page(jsonb,integer,integer)'::regprocedure) INTO source;
 IF position('SELECT * FROM base WHERE' IN source)=0 THEN RAISE EXCEPTION 'Unexpected review page definition';END IF;
 IF position('p_filters->>''appointmentId''' IN source)=0 THEN
  source:=replace(source,'SELECT * FROM base WHERE','SELECT * FROM base WHERE (coalesce(p_filters->>''appointmentId'','''')='''' OR "appointmentId"::text=p_filters->>''appointmentId'') AND');
 END IF;
 EXECUTE source;
 SELECT pg_get_functiondef('public.own_service_reviews(uuid)'::regprocedure) INTO source;
 IF position('CASE WHEN r.review_status IN' IN source)=0 THEN
  source:=replace(source,'(SELECT response_content FROM public.review_response WHERE review_id=r.id ORDER BY updated_at DESC,id LIMIT 1) AS shop_reply','CASE WHEN r.review_status IN (''published'',''approved'',''da_duyet'') THEN (SELECT response_content FROM public.review_response WHERE review_id=r.id ORDER BY updated_at DESC,id LIMIT 1) END AS shop_reply');
 END IF;
 EXECUTE source;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
