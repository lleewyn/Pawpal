BEGIN;
ALTER TABLE public.sales_order ADD COLUMN IF NOT EXISTS cancel_reason text;
-- Persist the reason in the same transaction as stock/reward/payment handling.
DO $$ DECLARE signature text; src text; needle text:='UPDATE public.sales_order SET';
BEGIN
 FOREACH signature IN ARRAY ARRAY['public.update_admin_sales_order(uuid,uuid,timestamptz,text,jsonb)',
  'pawpal_private.cancel_own_sales_core(uuid,uuid,timestamptz,text,jsonb)'] LOOP
  src:=pg_get_functiondef(signature::regprocedure);
  IF position('cancel_reason=' IN src)=0 THEN
   IF position(needle IN src)=0 THEN RAISE EXCEPTION 'Unexpected fulfillment definition'; END IF;
   EXECUTE replace(src,needle,needle||' cancel_reason=CASE WHEN p_action=''cancel'' THEN concat_ws(E''\n'',nullif(btrim(p_details->>''reason''),''''),nullif(btrim(p_details->>''note''),'''')) ELSE cancel_reason END,');
  END IF;
 END LOOP;
END $$;
-- Historical business events only; never infrastructure Logs.
UPDATE public.sales_order o SET cancel_reason=x.reason FROM (
 SELECT DISTINCT ON (description::jsonb->>'order_id') (description::jsonb->>'order_id')::uuid id,
 concat_ws(E'\n',nullif(description::jsonb->'details'->>'reason',''),nullif(description::jsonb->'details'->>'note','')) reason
 FROM public.audit_log WHERE entity_name='sales_order' AND action='SALES_FULFILLMENT'
 AND description::jsonb->>'action'='cancel' ORDER BY description::jsonb->>'order_id',created_at DESC,id DESC
) x WHERE o.id=x.id AND o.order_status='cancelled' AND o.cancel_reason IS NULL;

-- Cookie-bound guest cancellation reuses the reviewed fulfillment algorithm.
DO $$ DECLARE src text; first_guard integer; end_guard integer;
BEGIN
 src:=pg_get_functiondef('public.update_admin_sales_order(uuid,uuid,timestamptz,text,jsonb)'::regprocedure);
 first_guard:=strpos(src,'IF auth.uid() IS NULL');
 IF first_guard=0 THEN RAISE EXCEPTION 'Unexpected fulfillment guard';END IF;
 end_guard:=strpos(substring(src FROM first_guard),'END IF;')+first_guard+length('END IF;')-1;
 src:=substring(src FOR first_guard-1)||$guard$
 IF p_action IS DISTINCT FROM 'cancel' THEN RAISE EXCEPTION 'guest_action_forbidden' USING ERRCODE='42501';END IF;
 PERFORM public.guest_sales_receipt(p_hash,p_order_id);
 $guard$||substring(src FROM end_guard);
 src:=replace(src,'FUNCTION public.update_admin_sales_order(','FUNCTION public.cancel_guest_sales_order(p_hash text, ');
 EXECUTE src;
END $$;
REVOKE ALL ON FUNCTION public.cancel_guest_sales_order(text,uuid,uuid,timestamptz,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_guest_sales_order(text,uuid,uuid,timestamptz,text,jsonb) TO service_role;
DO $$ DECLARE src text;
BEGIN
 src:=pg_get_functiondef('public.cancel_guest_sales_order(text,uuid,uuid,timestamptz,text,jsonb)'::regprocedure);
 src:=replace(src,'FUNCTION public.cancel_guest_sales_order(p_hash text,','FUNCTION public.cancel_verified_guest_sales_order(p_phone text,');
 src:=replace(src,'PERFORM public.guest_sales_receipt(p_hash,p_order_id);',$guard$
 IF NOT EXISTS(SELECT 1 FROM public.sales_order so JOIN public.customer c ON c.id=so.customer_id
  WHERE so.id=p_order_id AND c.auth_user_id IS NULL AND c.customer_status='active'
  AND (so.receiver_phone_snapshot=p_phone OR c.unverified_contact_phone=p_phone OR EXISTS(
   SELECT 1 FROM public.customer_phone cp WHERE cp.customer_id=c.id AND cp.phone_number=p_phone)))
 THEN RAISE EXCEPTION 'guest_order_forbidden' USING ERRCODE='42501';END IF;
 $guard$);
 EXECUTE src;
END $$;
REVOKE ALL ON FUNCTION public.cancel_verified_guest_sales_order(text,uuid,uuid,timestamptz,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_verified_guest_sales_order(text,uuid,uuid,timestamptz,text,jsonb) TO service_role;
DO $$ DECLARE signature text; src text; needle text:='''status'',o.order_status,';
BEGIN
 FOREACH signature IN ARRAY ARRAY['public.guest_sales_receipt(text,uuid)','public.guest_sales_recover(uuid)'] LOOP
  src:=pg_get_functiondef(signature::regprocedure);
  IF position('''cancelReason''' IN src)=0 THEN
   IF position(needle IN src)=0 THEN RAISE EXCEPTION 'Unexpected receipt projection';END IF;
   EXECUTE replace(src,needle,needle||'''cancelReason'',o.cancel_reason,''updatedAt'',o.updated_at,');
  END IF;
 END LOOP;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
