BEGIN;
DO $$
DECLARE source text; old_check text:='PERFORM 1 FROM public.return_request WHERE id=evidence AND sales_order_id=ticket.order_id AND request_status=''received'' FOR SHARE;';
old_order text:='PERFORM 1 FROM public.sales_order WHERE id=(p_details->>''replacement_order_id'')::uuid AND id<>ticket.order_id AND customer_id=ticket.customer_id AND order_status IN (''delivered'',''completed'') FOR SHARE;';
BEGIN
 SELECT pg_get_functiondef('public.act_admin_complaint(uuid,uuid,timestamptz,text,jsonb)'::regprocedure) INTO source;
 IF position(old_check IN source)=0 AND position('request_status IN (''received'',''completed'') FOR SHARE;' IN source)=0 THEN RAISE EXCEPTION 'Unexpected complaint return validation'; END IF;
 IF position(old_order IN source)=0 AND position('s.return_request_id=evidence AND s.kind=''exchange''' IN source)=0 THEN RAISE EXCEPTION 'Unexpected complaint replacement validation'; END IF;
 source:=replace(source,old_check,'PERFORM 1 FROM public.return_request WHERE id=evidence AND sales_order_id=ticket.order_id AND request_status IN (''received'',''completed'') FOR SHARE;');
 source:=replace(source,old_order,'PERFORM 1 FROM public.sales_order o JOIN public.sales_replacement s ON s.order_id=o.id WHERE s.return_request_id=evidence AND s.kind=''exchange'' AND o.id=(p_details->>''replacement_order_id'')::uuid AND o.id<>ticket.order_id AND o.customer_id=ticket.customer_id AND o.order_status IN (''delivered'',''completed'') FOR SHARE OF o,s;');
 source:=replace(source,'AND rr.request_status=''received'' FOR SHARE;','AND rr.request_status IN (''received'',''completed'') FOR SHARE;');
 EXECUTE source;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
