BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
CREATE OR REPLACE FUNCTION public.admin_finance_page(p_section text,p_from date,p_to date,p_page integer DEFAULT 1,p_query text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='8s' AS $$
DECLARE source_sql text;result jsonb;perms text[]:='{}';
BEGIN
 PERFORM pawpal_private.finance_require();
 IF p_section IS NULL OR p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_to<p_from OR p_to-p_from>91 OR p_page IS NULL OR p_page<1 OR p_page>100000 OR length(coalesce(p_query,''))>200 THEN RAISE EXCEPTION 'finance_filter_invalid' USING ERRCODE='22023';END IF;
 IF p_section='accounts' THEN
  source_sql:=$q$SELECT a.id::text sort_id,a.created_at sort_at,to_jsonb(a)||jsonb_build_object('label',a.name,'balance',a.opening_balance+coalesce((SELECT sum(m.amount) FROM public.finance_cash_movement m WHERE m.account_id=a.id AND m.status='posted' AND m.occurred_at>a.opening_at),0)) row FROM public.finance_account a$q$;
 ELSIF p_section IN('expenses','receivables','payables','service_entries','refund_entries','credit_entries') THEN
  source_sql:=$q$SELECT e.id::text sort_id,e.created_at sort_at,to_jsonb(e)||jsonb_build_object('label',e.description,'remaining',greatest(0,e.amount-coalesce((SELECT sum(abs(m.amount)) FROM public.finance_cash_movement m WHERE m.entry_id=e.id AND m.status='posted'),0))) row
   FROM public.finance_entry e WHERE e.entry_kind=CASE $5 WHEN 'expenses' THEN 'expense' WHEN 'receivables' THEN 'receivable' WHEN 'payables' THEN 'payable' WHEN 'service_entries' THEN 'service_cost' WHEN 'credit_entries' THEN 'revenue_credit' ELSE 'refund_allocation' END
    AND ($5 IN('receivables','payables') OR e.recognized_on BETWEEN $1 AND $2)$q$;
 ELSIF p_section='obligations' THEN
  source_sql:=$q$SELECT e.id::text sort_id,e.created_at sort_at,to_jsonb(e)||jsonb_build_object('label',e.description,'remaining',e.amount-coalesce((SELECT sum(abs(m.amount)) FROM public.finance_cash_movement m WHERE m.entry_id=e.id AND m.status='posted'),0)) row
   FROM public.finance_entry e WHERE e.status='posted' AND e.entry_kind IN('expense','receivable','payable') AND e.amount>coalesce((SELECT sum(abs(m.amount)) FROM public.finance_cash_movement m WHERE m.entry_id=e.id AND m.status='posted'),0)$q$;
 ELSIF p_section='source_documents' THEN
  perms:=ARRAY['sales_order.read','sales_order_detail.read','appointment.read','appointment_item.read','appointment_adjustment.read','voucher_redemption.read','payment.read','refund_transaction.read','return_request.read'];
  source_sql:=$q$SELECT b.record_id::text sort_id,NULL::timestamptz sort_at,jsonb_build_object('id',b.record_id,'label',b.code,'source_kind',b.kind,'customer_id',b.customer_id,'amount',abs(b.balance),'known',b.known,'direction',CASE WHEN b.balance>0 THEN 'receivable' ELSE 'payable' END,'due_on',b.due_on,'updated_at',b.updated_at) row FROM pawpal_private.finance_document_balances() b$q$;
 ELSIF p_section='movements' THEN
  source_sql:=$q$SELECT m.id::text sort_id,m.occurred_at sort_at,to_jsonb(m)||jsonb_build_object('label',m.description,'account_name',a.name) row FROM public.finance_cash_movement m JOIN public.finance_account a ON a.id=m.account_id
   WHERE m.occurred_at>=$1::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND m.occurred_at<($2+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'$q$;
 ELSIF p_section='unallocated_payments' THEN
  perms:=ARRAY['payment.read'];
  source_sql:=$q$SELECT p.id::text sort_id,p.succeeded_at sort_at,jsonb_build_object('id',p.id,'label',p.payment_code,'amount',p.amount,'occurred_at',p.succeeded_at,'order_id',p.order_id,'appointment_id',p.appointment_id) row FROM public.payment p
   WHERE p.transaction_status='succeeded' AND p.succeeded_at>=$1::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND p.succeeded_at<($2+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND NOT EXISTS(SELECT 1 FROM public.finance_cash_movement m WHERE m.payment_id=p.id AND m.status='posted') AND NOT EXISTS(SELECT 1 FROM public.finance_opening_coverage c WHERE c.payment_id=p.id AND c.status='posted')$q$;
 ELSIF p_section='unallocated_refunds' OR p_section='refunds' THEN
  perms:=ARRAY['refund_transaction.read'];
  source_sql:=CASE p_section WHEN 'unallocated_refunds' THEN $q$SELECT r.id::text sort_id,r.completed_at sort_at,jsonb_build_object('id',r.id,'label',r.refund_code,'amount',r.refunded_amount,'occurred_at',r.completed_at) row FROM public.refund_transaction r
   WHERE r.refund_status='succeeded' AND r.completed_at>=$1::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND r.completed_at<($2+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND NOT EXISTS(SELECT 1 FROM public.finance_cash_movement m WHERE m.refund_id=r.id AND m.status='posted') AND NOT EXISTS(SELECT 1 FROM public.finance_opening_coverage c WHERE c.refund_id=r.id AND c.status='posted')$q$
  ELSE $q$SELECT r.id::text sort_id,r.completed_at sort_at,jsonb_build_object('id',r.id,'label',r.refund_code,'amount',r.refunded_amount,'occurred_at',r.completed_at) row FROM public.refund_transaction r
   WHERE r.refund_status='succeeded' AND r.completed_at>=$1::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND r.completed_at<($2+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND NOT EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.refund_id=r.id AND f.status='posted')$q$ END;
 ELSIF p_section='opening_coverage' THEN
  source_sql:=$q$SELECT c.id::text sort_id,c.created_at sort_at,to_jsonb(c)||jsonb_build_object('label',coalesce(p.payment_code,r.refund_code),'amount',coalesce(p.amount,r.refunded_amount),'occurred_at',coalesce(p.succeeded_at,r.completed_at),'account_name',a.name) row FROM public.finance_opening_coverage c JOIN public.finance_account a ON a.id=c.account_id LEFT JOIN public.payment p ON p.id=c.payment_id LEFT JOIN public.refund_transaction r ON r.id=c.refund_id$q$;
 ELSIF p_section='services' THEN
  perms:=ARRAY['appointment.read'];
  source_sql:=$q$SELECT a.id::text sort_id,a.check_out_time sort_at,jsonb_build_object('id',a.id,'label',a.appointment_code,'occurred_at',a.check_out_time) row FROM public.appointment a
   WHERE a.appointment_status='completed' AND a.check_out_time>=$1::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND a.check_out_time<($2+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND NOT EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.appointment_id=a.id AND f.entry_kind='service_cost' AND f.status='posted')$q$;
 ELSIF p_section='stock_costs' THEN
  perms:=ARRAY['inventory.read','product_variant.read','product.read'];
  source_sql:=$q$SELECT v.id::text sort_id,i.last_updated_at sort_at,jsonb_build_object('id',v.id,'label',v.sku_variant||' · '||p.product_name,'quantity',i.quantity_in_stock,'expected_stock_at',i.last_updated_at,'updated_at',c.updated_at,'amount',CASE WHEN i.quantity_in_stock=0 THEN 0 WHEN c.quantity=i.quantity_in_stock THEN c.total_cost END,'known',i.quantity_in_stock=0 OR c.quantity=i.quantity_in_stock AND c.total_cost IS NOT NULL) row
   FROM public.inventory i JOIN public.product_variant v ON v.id=i.product_variant_id JOIN public.product p ON p.id=v.product_id LEFT JOIN public.finance_stock_cost c ON c.product_variant_id=v.id$q$;
 ELSIF p_section='sale_costs' THEN
  perms:=ARRAY['sales_order.read','sales_order_detail.read'];
  source_sql:=$q$SELECT d.id::text sort_id,c.recognized_at sort_at,jsonb_build_object('id',d.id,'label',o.order_code||' · '||d.sku_snapshot||' · '||d.product_name_snapshot,'quantity',d.quantity,'amount',c.amount,'known',coalesce(c.known,false),'occurred_at',c.recognized_at,'order_id',o.id,'updated_at',verified.confirmed_at) row
   FROM pawpal_private.finance_sale_costs() c JOIN public.sales_order_detail d ON d.id=c.line_id JOIN public.sales_order o ON o.id=d.order_id LEFT JOIN public.finance_sale_cost_confirmation verified ON verified.sales_order_detail_id=d.id WHERE c.recognized_at>=$1::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND c.recognized_at<($2+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'$q$;
 ELSIF p_section='returns' THEN
  perms:=ARRAY['sales_order.read','return_request.read','refund_transaction.read','payment.read'];
  source_sql:=$q$SELECT rr.id::text sort_id,rr.updated_at sort_at,jsonb_build_object('id',rr.id,'label',o.order_code||' · '||rr.reason,'order_id',o.id,'approved_on',(SELECT min(occurred_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date FROM public.admin_dashboard_work_event e WHERE e.kind='return' AND e.record_id=rr.id AND e.event_type<>'baseline' AND e.new_status IN('approved','da_duyet','received','completed')),'already_reduced',coalesce((SELECT sum(f.revenue_part) FROM public.finance_entry f JOIN public.refund_transaction r ON r.id=f.refund_id WHERE r.return_request_id=rr.id AND f.status='posted'),0)) row
   FROM public.return_request rr JOIN public.sales_order o ON o.id=rr.sales_order_id WHERE o.delivered_at IS NOT NULL AND rr.request_status IN('approved','da_duyet','received','completed') AND NOT EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.return_request_id=rr.id AND f.entry_kind='revenue_credit' AND f.status='posted')$q$;
 ELSIF p_section='revenues' THEN
  perms:=ARRAY['sales_order.read','sales_order_detail.read','appointment.read','appointment_item.read','appointment_adjustment.read','voucher_redemption.read'];
  source_sql:=$q$SELECT o.id::text sort_id,o.delivered_at sort_at,jsonb_build_object('id',o.id,'source_kind','order','label',o.order_code,'amount',t.total_amount,'occurred_at',o.delivered_at) row FROM public.sales_order o JOIN public.sales_order_totals t ON t.order_id=o.id
   WHERE o.delivered_at>=$1::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND o.delivered_at<($2+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND NOT EXISTS(SELECT 1 FROM public.finance_revenue_source s WHERE s.kind='order' AND s.record_id=o.id)
   UNION ALL SELECT a.id::text,a.check_out_time,jsonb_build_object('id',a.id,'source_kind','appointment','label',a.appointment_code,'amount',t.total_price,'occurred_at',a.check_out_time) FROM public.appointment a JOIN public.appointment_totals t ON t.appointment_id=a.id
   WHERE a.check_out_time>=$1::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND a.check_out_time<($2+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh' AND NOT EXISTS(SELECT 1 FROM public.finance_revenue_source s WHERE s.kind='appointment' AND s.record_id=a.id)$q$;
 ELSIF p_section='purchases' THEN
  perms:=ARRAY['purchase_order.read','purchase_order_detail.read','supplier.read'];
  source_sql:=$q$SELECT p.id::text sort_id,p.created_at sort_at,jsonb_build_object('id',p.id,'label',p.order_number,'counterparty',s.supplier_name,'supplier_id',s.id,'amount',(SELECT sum(quantity*unit_price) FROM public.purchase_order_detail WHERE purchase_order_id=p.id)) row FROM public.purchase_order p JOIN public.supplier s ON s.id=p.supplier_id WHERE p.order_status='received'$q$;
 ELSIF p_section='customers' THEN
  perms:=ARRAY['customer.read','customer_profile.read'];
  source_sql:=$q$SELECT c.id::text sort_id,c.created_at sort_at,jsonb_build_object('id',c.id,'label',coalesce(p.full_name,c.customer_code),'detail',c.customer_code) row FROM public.customer c LEFT JOIN public.customer_profile p ON p.customer_id=c.id$q$;
 ELSIF p_section='suppliers' THEN
  perms:=ARRAY['supplier.read'];
  source_sql:=$q$SELECT s.id::text sort_id,s.created_at sort_at,jsonb_build_object('id',s.id,'label',s.supplier_name,'detail','Nhà cung cấp') row FROM public.supplier s$q$;
 ELSIF p_section='audit' THEN
  perms:=ARRAY['staff.read'];
  source_sql:=$q$SELECT f.request_id::text sort_id,f.created_at sort_at,jsonb_build_object('id',f.request_id,'label',f.action,'entity_id',f.entity_id,'actor_id',f.actor_id,'actor_name',s.full_name,'occurred_at',f.created_at,'reference',f.payload->'data'->>'reference') row FROM public.finance_audit f JOIN public.staff s ON s.id=f.actor_id$q$;
 ELSE RAISE EXCEPTION 'finance_filter_invalid' USING ERRCODE='22023';END IF;
 PERFORM pawpal_private.dashboard_require(perms);
 EXECUTE 'WITH base AS MATERIALIZED('||source_sql||'),filtered AS MATERIALIZED(SELECT * FROM base WHERE $3='''' OR position(lower($3) IN lower(row::text))>0),meta AS(SELECT count(*) total,least($4,greatest(1,ceil(count(*)/10.0)::int)) page FROM filtered)
  SELECT jsonb_build_object(''total'',meta.total,''page'',meta.page,''rows'',coalesce((SELECT jsonb_agg(row ORDER BY sort_at DESC NULLS LAST,sort_id) FROM(SELECT * FROM filtered ORDER BY sort_at DESC NULLS LAST,sort_id LIMIT 10 OFFSET(meta.page-1)*10)x),''[]''::jsonb)) FROM meta'
 INTO result USING p_from,p_to,btrim(coalesce(p_query,'')),p_page,p_section;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.admin_finance_lookup(p_kind text,p_query text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE today_day date:=(statement_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
BEGIN
 IF p_kind IS NULL OR p_kind NOT IN('accounts','obligations','purchases','customers','suppliers') THEN RAISE EXCEPTION 'finance_filter_invalid' USING ERRCODE='22023';END IF;
 RETURN public.admin_finance_page(p_kind,today_day-29,today_day,1,p_query)->'rows';
END $$;
REVOKE ALL ON FUNCTION public.admin_finance_page(text,date,date,integer,text),public.admin_finance_lookup(text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_finance_page(text,date,date,integer,text),public.admin_finance_lookup(text,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
