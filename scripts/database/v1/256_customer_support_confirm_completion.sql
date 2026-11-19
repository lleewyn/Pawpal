BEGIN;
CREATE OR REPLACE FUNCTION public.rate_own_support_ticket(p_ticket uuid,p_rating integer,p_comment text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid:=pawpal_private.customer_support_owner(); t public.support_ticket;
BEGIN
 IF p_rating IS NULL OR p_rating NOT BETWEEN 1 AND 5 OR p_comment IS NULL OR length(p_comment)>2000 THEN RAISE EXCEPTION 'invalid_support_rating' USING ERRCODE='22023'; END IF;
 SELECT * INTO t FROM public.support_ticket WHERE id=p_ticket AND customer_id=owner_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'support_owner_required' USING ERRCODE='42501'; END IF;
 IF t.rating IS NOT NULL THEN
  IF t.rating<>p_rating OR t.rating_comment IS DISTINCT FROM p_comment THEN RAISE EXCEPTION 'support_rating_exists' USING ERRCODE='PT409'; END IF;
  RETURN p_ticket;
 END IF;
 IF t.status NOT IN ('resolved','closed','completed') THEN RAISE EXCEPTION 'support_not_resolved' USING ERRCODE='22023'; END IF;
 IF p_rating<3 THEN
  UPDATE public.support_ticket SET rating=p_rating,rating_comment=p_comment,status='reprocessing',priority='urgent',assigned_staff_id=NULL,closed_at=NULL,resolved_at=NULL,resolved_by=NULL,approved_amount=NULL,resolution_type=NULL,resolution_note=NULL,updated_at=clock_timestamp() WHERE id=t.id;
  INSERT INTO public.support_ticket_message(ticket_id,sender_type,content,is_internal) VALUES(t.id,'system','Khách đánh giá dưới 3 sao. Chuyển quản lý tiếp nhận và xử lý lại.',true);
 ELSE
  UPDATE public.support_ticket SET rating=p_rating,rating_comment=p_comment,status='closed',closed_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=t.id;
 END IF;
 RETURN p_ticket;
END $$;
REVOKE ALL ON FUNCTION public.rate_own_support_ticket(uuid,integer,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.rate_own_support_ticket(uuid,integer,text) TO authenticated;
COMMIT;
