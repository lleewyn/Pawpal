BEGIN;
CREATE OR REPLACE FUNCTION public.own_support_tickets(p_page integer,p_filter text,p_ticket uuid,p_message_page integer)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid:=pawpal_private.customer_support_owner(); result jsonb; total bigint; counts jsonb; page_no integer;
BEGIN
 IF p_page IS NULL OR p_page NOT BETWEEN 1 AND 100000 OR p_message_page IS NULL OR p_message_page NOT BETWEEN 1 AND 100000 OR p_filter IS NULL OR p_filter NOT IN ('all','pending','processing','completed') THEN RAISE EXCEPTION 'invalid_support_page' USING ERRCODE='22023'; END IF;
 SELECT jsonb_build_object('all',count(*),'pending',count(*) FILTER(WHERE status='pending'),'processing',count(*) FILTER(WHERE status IN ('processing','waiting_customer','waiting_manager_approval','reprocessing')),'completed',count(*) FILTER(WHERE status IN ('completed','resolved','closed'))) INTO counts FROM public.support_ticket WHERE customer_id=owner_id;
 total:=(counts->>p_filter)::bigint;
 page_no:=least(p_page,greatest(1,ceil(total::numeric/10)::integer));
 SELECT coalesce(jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC,x.id),'[]'::jsonb) INTO result FROM (
  SELECT (SELECT count(*) FROM public.support_ticket_message z WHERE z.ticket_id=t.id AND NOT z.is_internal AND z.sender_type NOT IN ('system','internal_note')) AS message_total,p_message_page AS message_page,t.id,t.ticket_code,t.subject,t.description,t.category,t.status,t.priority,t.rating,t.rating_comment,
   CASE WHEN t.status IN ('resolved','closed','completed') THEN t.resolution_note END AS resolution_note,
   CASE WHEN t.status IN ('resolved','closed','completed') THEN t.resolution_type END AS resolution_type,t.created_at,t.updated_at,
   a.appointment_code,a.id AS appointment_id,o.order_code,o.id AS order_id,
   (SELECT name_snapshot FROM public.appointment_item WHERE appointment_id=a.id AND is_primary ORDER BY id LIMIT 1) AS service_name,
   (SELECT pet_name FROM public.pet_profile WHERE id=a.pet_id) AS pet_name,
   coalesce((SELECT jsonb_agg(jsonb_build_object('id',m.id,'sender',CASE WHEN m.sender_type IN ('customer','user','khach_hang') THEN 'user' ELSE 'cskh' END,'text',m.content,'time',m.created_at) ORDER BY m.created_at,m.id)
    FROM (SELECT * FROM public.support_ticket_message z WHERE z.ticket_id=t.id AND NOT z.is_internal AND z.sender_type NOT IN ('system','internal_note') ORDER BY z.created_at DESC,z.id DESC LIMIT 20 OFFSET (p_message_page-1)*20) m),'[]'::jsonb) AS messages
  FROM (SELECT * FROM public.support_ticket WHERE customer_id=owner_id AND (p_ticket IS NULL OR id=p_ticket) AND (p_ticket IS NOT NULL OR p_filter='all' OR (p_filter='pending' AND status='pending') OR (p_filter='processing' AND status IN ('processing','waiting_customer','waiting_manager_approval','reprocessing')) OR (p_filter='completed' AND status IN ('completed','resolved','closed'))) ORDER BY created_at DESC,id LIMIT CASE WHEN p_ticket IS NULL THEN 10 ELSE 1 END OFFSET CASE WHEN p_ticket IS NULL THEN (page_no-1)*10 ELSE 0 END) t LEFT JOIN public.appointment a ON a.id=t.appointment_id LEFT JOIN public.sales_order o ON o.id=t.order_id WHERE t.customer_id=owner_id
 ) x; RETURN jsonb_build_object('rows',result,'total',total,'page',page_no,'counts',counts);
END $$;
REVOKE ALL ON FUNCTION public.own_support_tickets(integer,text,uuid,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_support_tickets(integer,text,uuid,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
