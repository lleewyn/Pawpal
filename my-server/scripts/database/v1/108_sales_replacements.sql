BEGIN;
CREATE TABLE IF NOT EXISTS public.sales_replacement (
 order_id uuid PRIMARY KEY REFERENCES public.sales_order(id),
 return_request_id uuid NOT NULL UNIQUE REFERENCES public.return_request(id),
 kind text NOT NULL CHECK(kind IN ('exchange','resend')),
 created_by uuid NOT NULL REFERENCES public.staff(id),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.sales_replacement ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.sales_replacement FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.sales_replacement TO authenticated;
GRANT ALL ON public.sales_replacement TO service_role;
DROP POLICY IF EXISTS replacement_read ON public.sales_replacement;
CREATE POLICY replacement_read ON public.sales_replacement FOR SELECT TO authenticated USING(
 (pawpal_private.has_permission('return_request.read') AND pawpal_private.has_permission('sales_order.read'))
 OR EXISTS(SELECT 1 FROM public.sales_order o WHERE o.id=order_id AND pawpal_private.owns_customer(o.customer_id)));

CREATE OR REPLACE FUNCTION public.create_admin_sales_replacement(p_request_id uuid,p_return_id uuid,p_expected_updated_at timestamptz,p_details jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; r public.return_request; o public.sales_order; prior public.audit_log; payload text;
 item jsonb; source_line public.return_request_detail; target public.product_variant; seen uuid[]:='{}';
 line_count integer; kind text:=p_details->>'kind'; reason text:=btrim(p_details->>'reason');
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('return_request.write') OR NOT pawpal_private.has_permission('return_request_detail.read')
 OR NOT pawpal_private.has_permission('sales_order.write') OR NOT pawpal_private.has_permission('sales_order_detail.write')
 OR NOT pawpal_private.has_permission('inventory_transaction.write') OR NOT pawpal_private.has_permission('stock_reservation.write')
 OR NOT pawpal_private.has_permission('audit_log.write') THEN RAISE EXCEPTION 'sales_replacement_forbidden' USING ERRCODE='42501'; END IF;
 IF p_request_id IS NULL OR p_return_id IS NULL OR jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR length(p_details::text)>30000
 OR kind IS NULL OR kind NOT IN ('exchange','resend') OR coalesce(length(reason),0) NOT BETWEEN 2 AND 2000
 OR p_details->>'confirmed' IS DISTINCT FROM 'true' OR jsonb_typeof(p_details->'lines') IS DISTINCT FROM 'array'
 OR jsonb_array_length(p_details->'lines') NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_sales_replacement' USING ERRCODE='22023'; END IF;
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid() AND employment_status='active' AND NOT must_change_password;
 IF actor IS NULL THEN RAISE EXCEPTION 'sales_replacement_forbidden' USING ERRCODE='42501'; END IF;
 payload:=jsonb_build_object('return_id',p_return_id,'details',p_details)::text;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request_id::text,108));
 SELECT * INTO prior FROM public.audit_log WHERE entity_id=p_request_id AND action='SALES_REPLACEMENT_CREATE';
 IF FOUND THEN
  IF prior.staff_id IS DISTINCT FROM actor OR prior.description<>payload THEN RAISE EXCEPTION 'sales_request_conflict' USING ERRCODE='PT409'; END IF;
  RETURN p_request_id;
 END IF;
 -- Follow fulfillment's customer -> order -> return -> product -> variant lock order.
 PERFORM 1 FROM public.customer WHERE id IN(SELECT s.customer_id FROM public.sales_order s JOIN public.return_request rr ON rr.sales_order_id=s.id WHERE rr.id=p_return_id) FOR UPDATE;
 SELECT s.* INTO o FROM public.sales_order s JOIN public.return_request rr ON rr.sales_order_id=s.id WHERE rr.id=p_return_id FOR UPDATE OF s;
 IF NOT FOUND THEN RAISE EXCEPTION 'sales_return_not_found' USING ERRCODE='P0002'; END IF;
 SELECT * INTO r FROM public.return_request WHERE id=p_return_id FOR UPDATE;
 IF p_expected_updated_at IS NULL OR r.updated_at<>p_expected_updated_at THEN RAISE EXCEPTION 'sales_return_changed' USING ERRCODE='PT409'; END IF;
 IF EXISTS(SELECT 1 FROM public.sales_replacement WHERE return_request_id=r.id) THEN RAISE EXCEPTION 'sales_replacement_exists' USING ERRCODE='PT409'; END IF;
 IF o.order_status NOT IN ('delivered','completed','returned') OR r.return_type<>kind
 OR (kind='exchange' AND r.request_status<>'received') OR (kind='resend' AND r.request_status NOT IN ('pending','approved','received'))
 OR EXISTS(SELECT 1 FROM public.sales_replacement WHERE order_id=o.id) THEN RAISE EXCEPTION 'sales_replacement_state_invalid' USING ERRCODE='22023'; END IF;
 -- A prior cash refund requires reconciliation; never silently give both money and replacement.
 IF EXISTS(SELECT 1 FROM public.refund_transaction f JOIN public.payment p ON p.id=f.payment_id WHERE p.order_id=o.id AND f.refund_status='succeeded') THEN
  RAISE EXCEPTION 'sales_replacement_refund_review_required' USING ERRCODE='23514'; END IF;
 SELECT count(*) INTO line_count FROM public.return_request_detail WHERE return_request_id=r.id;
 IF line_count<>jsonb_array_length(p_details->'lines') THEN RAISE EXCEPTION 'sales_replacement_lines_invalid' USING ERRCODE='22023'; END IF;
 PERFORM 1 FROM public.product WHERE id IN(SELECT v.product_id FROM public.product_variant v JOIN jsonb_array_elements(p_details->'lines') x ON v.id=(x->>'variant_id')::uuid) ORDER BY id FOR UPDATE;
 PERFORM 1 FROM public.product_variant WHERE id IN(SELECT (x->>'variant_id')::uuid FROM jsonb_array_elements(p_details->'lines') x) ORDER BY id FOR UPDATE;
 FOR item IN SELECT value FROM jsonb_array_elements(p_details->'lines') LOOP
  SELECT * INTO source_line FROM public.return_request_detail WHERE id=(item->>'return_detail_id')::uuid AND return_request_id=r.id;
  IF NOT FOUND OR source_line.id=ANY(seen) OR (item->>'quantity')::numeric IS DISTINCT FROM source_line.quantity::numeric THEN
   RAISE EXCEPTION 'sales_replacement_lines_invalid' USING ERRCODE='22023'; END IF;
  SELECT v.* INTO target FROM public.product_variant v JOIN public.product p ON p.id=v.product_id
   WHERE v.id=(item->>'variant_id')::uuid AND v.status='active' AND p.status='active' AND NOT v.catalog_retired;
  IF NOT FOUND OR (kind='resend' AND target.id IS DISTINCT FROM (SELECT product_variant_id FROM public.sales_order_detail WHERE id=source_line.sales_order_detail_id)) THEN
   RAISE EXCEPTION 'sales_replacement_variant_invalid' USING ERRCODE='22023'; END IF;
  seen:=array_append(seen,source_line.id);
 END LOOP;
 INSERT INTO public.sales_order(id,order_code,customer_id,order_status,note,shipping_fee_snapshot,receiver_name_snapshot,receiver_phone_snapshot,province_snapshot,street_address_snapshot,postal_code_snapshot,delivery_option_id)
 VALUES(p_request_id,'RP-'||replace(p_request_id::text,'-',''),o.customer_id,'pending',
  CASE kind WHEN 'exchange' THEN 'Đổi hàng' ELSE 'Gửi bù' END||' cho đơn '||o.order_code||'. '||reason,0,
  o.receiver_name_snapshot,o.receiver_phone_snapshot,o.province_snapshot,o.street_address_snapshot,o.postal_code_snapshot,o.delivery_option_id);
 INSERT INTO public.sales_order_detail(order_id,product_variant_id,quantity,unit_price,discount_amount,product_name_snapshot,sku_snapshot)
 SELECT p_request_id,v.id,sum(d.quantity)::integer,0,0,p.product_name,v.sku_variant
 FROM jsonb_array_elements(p_details->'lines') x JOIN public.return_request_detail d ON d.id=(x->>'return_detail_id')::uuid
 JOIN public.product_variant v ON v.id=(x->>'variant_id')::uuid JOIN public.product p ON p.id=v.product_id
 GROUP BY v.id,p.product_name,v.sku_variant;
 INSERT INTO public.stock_reservation(product_variant_id,order_id,quantity,expires_at,status)
 SELECT product_variant_id,p_request_id,quantity,'infinity','active' FROM public.sales_order_detail WHERE order_id=p_request_id ORDER BY product_variant_id;
 INSERT INTO public.sales_replacement(order_id,return_request_id,kind,created_by) VALUES(p_request_id,r.id,kind,actor);
 UPDATE public.return_request SET request_status=CASE WHEN request_status='received' THEN request_status ELSE 'approved' END,resolved_by=actor,updated_at=clock_timestamp() WHERE id=r.id;
 UPDATE public.sales_order SET updated_at=clock_timestamp() WHERE id=o.id;
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description) VALUES(actor,'SALES_REPLACEMENT_CREATE','sales_order',p_request_id,payload);
 RETURN p_request_id;
END $$;
REVOKE ALL ON FUNCTION public.create_admin_sales_replacement(uuid,uuid,timestamptz,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_admin_sales_replacement(uuid,uuid,timestamptz,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION pawpal_private.sync_sales_replacement()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE link public.sales_replacement;
BEGIN
 SELECT * INTO link FROM public.sales_replacement WHERE order_id=NEW.id;
 IF FOUND THEN
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id OR NEW.shipping_fee_snapshot<>0 THEN RAISE EXCEPTION 'sales_replacement_immutable' USING ERRCODE='23514'; END IF;
  IF NEW.order_status IS DISTINCT FROM OLD.order_status OR NEW.tracking_code IS DISTINCT FROM OLD.tracking_code THEN
   UPDATE public.return_request SET request_status=CASE WHEN NEW.order_status IN ('completed','delivered') THEN 'completed' WHEN NEW.order_status='cancelled' AND request_status<>'received' THEN 'cancelled' ELSE request_status END,
    updated_at=clock_timestamp() WHERE id=link.return_request_id;
  END IF;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS sync_sales_replacement ON public.sales_order;
CREATE TRIGGER sync_sales_replacement AFTER UPDATE ON public.sales_order FOR EACH ROW EXECUTE FUNCTION pawpal_private.sync_sales_replacement();
CREATE OR REPLACE FUNCTION pawpal_private.protect_sales_replacement_lines()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.sales_replacement WHERE order_id=CASE WHEN TG_OP='DELETE' THEN OLD.order_id ELSE NEW.order_id END)
 OR (TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM public.sales_replacement WHERE order_id=OLD.order_id)) THEN
  RAISE EXCEPTION 'sales_replacement_immutable' USING ERRCODE='23514'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
DROP TRIGGER IF EXISTS protect_sales_replacement_lines ON public.sales_order_detail;
CREATE TRIGGER protect_sales_replacement_lines BEFORE INSERT OR UPDATE OR DELETE ON public.sales_order_detail FOR EACH ROW EXECUTE FUNCTION pawpal_private.protect_sales_replacement_lines();
REVOKE ALL ON FUNCTION pawpal_private.sync_sales_replacement(),pawpal_private.protect_sales_replacement_lines() FROM PUBLIC,anon,authenticated;

-- Once a replacement exists, receipt/rejection cannot independently restock or close its RMA.
DO $patch$
DECLARE body text; anchor text:='IF r.request_status NOT IN (''pending'',''approved'') THEN';
BEGIN
 body:=pg_get_functiondef('public.save_admin_sales_return(uuid,uuid,uuid,timestamptz,text,jsonb)'::regprocedure);
 IF strpos(body,'sales_replacement_return_locked')=0 THEN
  IF strpos(body,anchor)=0 THEN RAISE EXCEPTION 'sales_return_anchor_missing'; END IF;
  body:=replace(body,anchor,'IF EXISTS(SELECT 1 FROM public.sales_replacement WHERE return_request_id=r.id) THEN RAISE EXCEPTION ''sales_replacement_return_locked'' USING ERRCODE=''22023''; END IF;
  '||anchor);EXECUTE body;
 END IF;
END $patch$;
-- Money and goods cannot both be compensated through independent screens.
DO $patch$
DECLARE body text; anchor text:='loyalty_plan:=pawpal_private.plan_refund_loyalty(source.id,amount_value);';
BEGIN
 body:=pg_get_functiondef('public.post_admin_sales_money(uuid,uuid,text,text,jsonb)'::regprocedure);
 IF strpos(body,'sales_replacement_refund_review_required')=0 THEN
  IF strpos(body,anchor)=0 THEN RAISE EXCEPTION 'sales_refund_anchor_missing'; END IF;
  body:=replace(body,anchor,'IF EXISTS(SELECT 1 FROM public.sales_replacement s JOIN public.return_request r ON r.id=s.return_request_id JOIN public.sales_order replacement ON replacement.id=s.order_id WHERE r.sales_order_id=source.order_id AND replacement.order_status<>''cancelled'') THEN RAISE EXCEPTION ''sales_replacement_refund_review_required'' USING ERRCODE=''23514''; END IF;
  '||anchor);EXECUTE body;
 END IF;
END $patch$;
NOTIFY pgrst,'reload schema';
COMMIT;
