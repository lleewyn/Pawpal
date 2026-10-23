BEGIN;
CREATE OR REPLACE FUNCTION public.admin_pawpoint_page(p_query text DEFAULT '',p_kind text DEFAULT 'ALL',p_page integer DEFAULT 1,p_size integer DEFAULT 10)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='5s' AS $$
DECLARE result jsonb; page_value integer; size_value integer;
BEGIN
 IF NOT pawpal_private.has_permission('paw_point_transaction.read') OR NOT pawpal_private.has_permission('customer.read') OR NOT pawpal_private.has_permission('customer_profile.read') OR NOT pawpal_private.has_permission('customer_phone.read') THEN RAISE EXCEPTION 'permission_denied' USING ERRCODE='42501'; END IF;
 IF p_kind NOT IN('ALL','ADD','SUB') OR length(coalesce(p_query,''))>200 THEN RAISE EXCEPTION 'invalid_filter'; END IF;
 size_value:=least(greatest(coalesce(p_size,10),1),100);page_value:=greatest(coalesce(p_page,1),1);
 WITH ledger AS MATERIALIZED (
  SELECT t.id,t.customer_id,t.points,t.description,t.created_at,t.sequence_no,
   sum(t.points) OVER(PARTITION BY t.customer_id ORDER BY t.sequence_no,t.id ROWS UNBOUNDED PRECEDING) AS balance
  FROM public.paw_point_transaction t
 ), filtered AS MATERIALIZED (
  SELECT l.*,c.customer_code,p.full_name,ph.phone_number FROM ledger l
  JOIN public.customer c ON c.id=l.customer_id LEFT JOIN public.customer_profile p ON p.customer_id=c.id
  LEFT JOIN LATERAL(SELECT phone_number FROM public.customer_phone WHERE customer_id=c.id AND is_primary ORDER BY id LIMIT 1) ph ON true
  WHERE (p_kind='ALL' OR (p_kind='ADD' AND l.points>=0) OR (p_kind='SUB' AND l.points<0))
  AND (coalesce(trim(p_query),'')='' OR strpos(lower(concat_ws(' ',p.full_name,ph.phone_number,l.description)),lower(trim(p_query)))>0)
 ), totals AS (SELECT count(*) AS total FROM filtered), page_rows AS (
  SELECT * FROM filtered ORDER BY created_at DESC,id DESC LIMIT size_value OFFSET (least(page_value,greatest(1,(SELECT ceil(total::numeric/size_value)::integer FROM totals)))-1)*size_value
 ) SELECT jsonb_build_object('total',(SELECT total FROM totals),'page',least(page_value,greatest(1,(SELECT ceil(total::numeric/size_value)::integer FROM totals))),'rows',coalesce((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC,x.id DESC) FROM page_rows x),'[]'::jsonb)) INTO result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.admin_pawpoint_page(text,text,integer,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_pawpoint_page(text,text,integer,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
