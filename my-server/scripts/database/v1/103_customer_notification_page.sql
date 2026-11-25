BEGIN;
-- Additive overload: legacy zero-argument callers keep their existing contract.
CREATE OR REPLACE FUNCTION public.own_notifications_snapshot(p_page integer,p_size integer,p_unread boolean)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cid uuid; rows jsonb; total bigint; unread bigint; page_no integer; page_size integer;
BEGIN
 cid:=(public.customer_profile_snapshot()->>'id')::uuid;
 IF p_page IS NULL OR p_page<1 OR p_page>100000 OR p_size IS NULL OR p_size NOT BETWEEN 1 AND 50 OR p_unread IS NULL THEN
  RAISE EXCEPTION 'invalid_notification_page' USING ERRCODE='22023';
 END IF;
 page_size:=p_size;
 SELECT count(*),count(*) FILTER(WHERE read_at IS NULL) INTO total,unread FROM public.notification WHERE customer_id=cid;
 page_no:=least(p_page,greatest(1,ceil((CASE WHEN p_unread THEN unread ELSE total END)::numeric/page_size)::integer));
 SELECT coalesce(jsonb_agg(to_jsonb(n) ORDER BY n.sent_at DESC,n.id DESC),'[]'::jsonb) INTO rows FROM (
  SELECT id,notification_type,title,content,sent_at,read_at,sales_order_id,appointment_id,support_ticket_id,refund_transaction_id
  FROM public.notification WHERE customer_id=cid AND (NOT p_unread OR read_at IS NULL)
  ORDER BY sent_at DESC,id DESC LIMIT page_size OFFSET (page_no-1)*page_size
 ) n;
 RETURN jsonb_build_object('customer_id',cid,'snapshot_at',now(),'rows',rows,'page',page_no,'size',page_size,'total',CASE WHEN p_unread THEN unread ELSE total END,'unread_count',unread);
END $$;
REVOKE ALL ON FUNCTION public.own_notifications_snapshot(integer,integer,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_notifications_snapshot(integer,integer,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
