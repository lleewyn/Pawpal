BEGIN;
SET LOCAL lock_timeout='5s';
-- Keep staff access checks, ID lookups, result fields and paging intact.
DO $$
DECLARE body text:=pg_get_functiondef('public.get_staff_workspace(text,text,uuid,integer)'::regprocedure);
 old_predicate text:=$old$(p_id IS NULL AND lower(o.order_code)=lower(query_text))$old$;
 new_predicate text:=$new$(p_id IS NULL AND (
    strpos(pawpal_private.fold_search(o.order_code),pawpal_private.fold_search(query_text))>0
    OR strpos(lower(o.id::text),lower(query_text))>0
    OR EXISTS(SELECT 1 FROM public.customer_profile cp WHERE cp.customer_id=o.customer_id
        AND strpos(pawpal_private.fold_search(cp.full_name),pawpal_private.fold_search(query_text))>0)
    OR strpos(pawpal_private.fold_search(coalesce(o.receiver_name_snapshot,'')),pawpal_private.fold_search(query_text))>0
   ))$new$;
BEGIN
 IF strpos(body,new_predicate)>0 THEN RETURN; END IF;
 IF strpos(body,old_predicate)=0 THEN RAISE EXCEPTION 'unexpected_staff_order_search_definition'; END IF;
 EXECUTE replace(body,old_predicate,new_predicate);
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
