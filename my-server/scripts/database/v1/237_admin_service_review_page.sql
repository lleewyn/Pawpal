BEGIN;
CREATE OR REPLACE FUNCTION pawpal_private.fold_search(value text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path=pg_catalog AS $$
 SELECT trim(regexp_replace(translate(regexp_replace(normalize(lower(coalesce(value,'')),NFD),U&'[\0300-\036f]','','g'),'đ','d'),'\s+',' ','g'))
$$;
REVOKE ALL ON FUNCTION pawpal_private.fold_search(text) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.admin_service_review_page(p_filters jsonb DEFAULT '{}',p_page integer DEFAULT 1,p_size integer DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE result jsonb; sz integer:=least(greatest(coalesce(p_size,10),1),100); q text:=pawpal_private.fold_search(p_filters->>'query');permission_name text;
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.work_is_admin() THEN RAISE EXCEPTION 'admin_required' USING ERRCODE='42501';END IF;
 FOREACH permission_name IN ARRAY ARRAY['review.read','review_response.read','appointment_item.read','appointment.read','customer.read','customer_profile.read','customer_phone.read','staff.read','service.read','service_category.read','support_ticket.read'] LOOP
  IF NOT pawpal_private.has_permission(permission_name) THEN RAISE EXCEPTION 'review_read_forbidden' USING ERRCODE='42501';END IF;
 END LOOP;
 IF jsonb_typeof(p_filters)<>'object' OR length(q)>200 THEN RAISE EXCEPTION 'invalid_filter' USING ERRCODE='22023';END IF;
 WITH base AS MATERIALIZED (
  SELECT r.id,r.id "dbId",'ĐG-'||upper(left(r.id::text,8)) "reviewCode",r.rating,coalesce(nullif(r.review_content,''),'—') comment,r.created_at "createdAt",r.updated_at "reviewUpdatedAt",coalesce(nullif(r.review_status,''),'pending') "publicationStatus",
   i.service_id "serviceId",i.service_id "serviceDbId",s.service_code "serviceCode",coalesce(nullif(i.name_snapshot,''),s.service_name,'Chưa có thông tin dịch vụ') "serviceName",
   CASE WHEN upper(c.category_code)='PET_HOTEL' OR i.name_snapshot LIKE '%Hotel%' OR i.name_snapshot LIKE '%Phòng%' THEN 'Hotel'
    WHEN upper(c.category_code)='PET_TAXI' OR i.name_snapshot LIKE '%Taxi%' OR i.name_snapshot LIKE '%Đón%' THEN 'Taxi' ELSE 'Spa' END category,
   a.id "appointmentId",a.appointment_code "bookingId",coalesce(nullif(pr.full_name,''),'Khách hàng PawPal') "customerName",coalesce(nullif(ph.phone_number,''),nullif(cu.unverified_contact_phone,''),'—') phone,coalesce(nullif(st.full_name,''),'Chưa có thông tin') staff,
   rr.id "responseId",rr.updated_at "responseUpdatedAt",coalesce(rr.response_content,'') "replyText",CASE WHEN coalesce(rr.response_content,'')<>'' THEN 'replied' ELSE 'pending' END status,
   EXISTS(SELECT 1 FROM public.support_ticket t WHERE t.appointment_id=a.id) "hasServiceTicket"
  FROM public.review r JOIN public.appointment_item i ON i.id=r.appointment_item_id
  JOIN public.appointment a ON a.id=i.appointment_id LEFT JOIN public.service s ON s.id=i.service_id LEFT JOIN public.service_category c ON c.id=s.category_id
  LEFT JOIN public.customer cu ON cu.id=a.customer_id LEFT JOIN public.customer_profile pr ON pr.customer_id=a.customer_id LEFT JOIN public.staff st ON st.id=a.staff_id
  LEFT JOIN LATERAL(SELECT phone_number FROM public.customer_phone WHERE customer_id=a.customer_id ORDER BY is_primary DESC,id LIMIT 1) ph ON true
  LEFT JOIN LATERAL(SELECT id,updated_at,response_content FROM public.review_response WHERE review_id=r.id ORDER BY updated_at DESC,id DESC LIMIT 1) rr ON true
 ), matched AS MATERIALIZED (
  SELECT * FROM base WHERE (q='' OR strpos(pawpal_private.fold_search("customerName"||' '||coalesce(comment,'')||' '||"bookingId"||' '||"reviewCode"||' '||phone),q)>0)
   AND (coalesce(p_filters->>'star','ALL')='ALL' OR (p_filters->>'star'='LOW' AND rating BETWEEN 1 AND 3) OR rating::text=p_filters->>'star')
   AND (coalesce(p_filters->>'category','ALL')='ALL' OR category=p_filters->>'category')
   AND (coalesce(p_filters->>'staff','ALL')='ALL' OR staff=p_filters->>'staff')
   AND (coalesce(p_filters->>'status','ALL')='ALL' OR status=p_filters->>'status' OR (p_filters->>'status'='escalated' AND "hasServiceTicket"))
   AND (coalesce(p_filters->>'serviceId','')='' OR "serviceId"::text=p_filters->>'serviceId')
 ), meta AS (SELECT count(*) total,least(greatest(coalesce(p_page,1),1),greatest(1,ceil(count(*)/sz::numeric)::integer)) page FROM matched),
 page_rows AS(SELECT * FROM matched ORDER BY "createdAt" DESC,id DESC LIMIT sz OFFSET (SELECT (page-1)*sz FROM meta))
 SELECT jsonb_build_object('rows',coalesce((SELECT jsonb_agg(to_jsonb(r) ORDER BY "createdAt" DESC,id DESC) FROM page_rows r),'[]'::jsonb),'total',meta.total,'page',meta.page,
  'stats',jsonb_build_object('total',(SELECT count(*) FROM base),'average',(SELECT avg(rating) FROM base WHERE rating BETWEEN 1 AND 5),'pending',(SELECT count(*) FROM base WHERE status='pending'),'low',(SELECT count(*) FROM base WHERE rating BETWEEN 1 AND 3))) INTO result FROM meta;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_service_review_page(jsonb,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_service_review_page(jsonb,integer,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
