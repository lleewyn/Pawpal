BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
CREATE OR REPLACE FUNCTION pawpal_private.finance_sale_costs()
RETURNS TABLE(line_id uuid,order_id uuid,recognized_at timestamptz,amount numeric,known boolean,stamp timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT d.id,d.order_id,o.delivered_at,
  CASE WHEN confirmed.quantity=d.quantity THEN confirmed.amount WHEN issued.n>0 AND issued.all_known AND issued.qty=d.quantity THEN issued.amount END,
  confirmed.quantity=d.quantity OR coalesce(issued.n>0 AND issued.all_known AND issued.qty=d.quantity,false),
  greatest(confirmed.confirmed_at,issued.stamp)
 FROM public.sales_order_detail d JOIN public.sales_order o ON o.id=d.order_id
 LEFT JOIN public.finance_sale_cost_confirmation confirmed ON confirmed.sales_order_detail_id=d.id
 LEFT JOIN LATERAL(
  SELECT count(*) n,bool_and(c.cost_delta IS NOT NULL) all_known,sum(-i.quantity) qty,sum(-c.cost_delta) amount,max(c.recorded_at) stamp
  FROM public.inventory_transaction i JOIN public.finance_stock_cost_event c ON c.inventory_transaction_id=i.id WHERE i.sales_order_detail_id=d.id AND i.quantity<0
 ) issued ON true WHERE o.delivered_at IS NOT NULL
$$;
REVOKE ALL ON FUNCTION pawpal_private.finance_sale_costs() FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION pawpal_private.finance_document_balances()
RETURNS TABLE(kind text,record_id uuid,code text,customer_id uuid,balance numeric,known boolean,due_on date,updated_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 WITH documents AS(
  SELECT 'order'::text kind,o.id record_id,o.order_code code,o.customer_id,t.total_amount total,lower(o.order_status) IN('completed','delivered','returned','da_giao','da_giao_hang','da_tra_hang') valid FROM public.sales_order o JOIN public.sales_order_totals t ON t.order_id=o.id WHERE o.delivered_at IS NOT NULL
  UNION ALL SELECT 'appointment',a.id,a.appointment_code,a.customer_id,t.total_price,a.appointment_status='completed' FROM public.appointment a JOIN public.appointment_totals t ON t.appointment_id=a.id WHERE a.check_out_time IS NOT NULL
 ),facts AS(
  SELECT d.*,
   d.valid AND d.total::text NOT IN('NaN','Infinity','-Infinity') AND NOT EXISTS(SELECT 1 FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE r.refund_status='succeeded' AND (p.order_id=d.record_id AND d.kind='order' OR p.appointment_id=d.record_id AND d.kind='appointment') AND NOT EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.refund_id=r.id AND f.status='posted'))
    AND (d.kind<>'order' OR NOT EXISTS(SELECT 1 FROM public.return_request rr WHERE rr.sales_order_id=d.record_id AND rr.request_status IN('approved','da_duyet','received','completed') AND NOT EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.return_request_id=rr.id AND f.entry_kind='revenue_credit' AND f.status='posted'))) complete,
   d.total-coalesce((SELECT sum(p.amount) FROM public.payment p WHERE p.transaction_status='succeeded' AND (d.kind='order' AND p.order_id=d.record_id OR d.kind='appointment' AND p.appointment_id=d.record_id)),0)
    +coalesce((SELECT sum(r.refunded_amount-f.revenue_part-f.expense_part) FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id JOIN public.finance_entry f ON f.refund_id=r.id AND f.status='posted' WHERE r.refund_status='succeeded' AND (d.kind='order' AND p.order_id=d.record_id OR d.kind='appointment' AND p.appointment_id=d.record_id)),0)
    -coalesce((SELECT sum(f.amount) FROM public.finance_entry f WHERE d.kind='order' AND f.order_id=d.record_id AND f.entry_kind='revenue_credit' AND f.status='posted'),0) amount
  FROM documents d
 ) SELECT f.kind,f.record_id,f.code,f.customer_id,CASE WHEN f.complete THEN f.amount END,f.complete,
  CASE WHEN q.direction=CASE WHEN f.amount>0 THEN 'receivable' ELSE 'payable' END THEN q.due_on END,q.updated_at
 FROM facts f LEFT JOIN public.finance_document_due q ON q.kind=f.kind AND q.record_id=f.record_id WHERE NOT f.complete OR f.amount<>0
$$;
REVOKE ALL ON FUNCTION pawpal_private.finance_document_balances() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_finance_report(p_from date,p_to date,p_future_to date DEFAULT NULL,p_include_receiv boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='10s' AS $$
DECLARE today_day date:=(statement_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;starts timestamptz;ends timestamptz;last_day date;future_day date;report jsonb;fingerprint text;review public.finance_period_review;
BEGIN
 PERFORM pawpal_private.finance_require();
 PERFORM pawpal_private.dashboard_require(ARRAY['sales_order.read','sales_order_detail.read','appointment.read','appointment_item.read','payment.read','refund_transaction.read','voucher_redemption.read','appointment_adjustment.read','return_request.read']);
 IF p_from IS NULL OR p_to IS NULL OR NOT isfinite(p_from) OR NOT isfinite(p_to) OR p_to<p_from OR p_to-p_from>91 OR p_include_receiv IS NULL THEN RAISE EXCEPTION 'finance_date_invalid' USING ERRCODE='22023';END IF;
 future_day:=coalesce(p_future_to,today_day+29);
 IF NOT isfinite(future_day) OR future_day<today_day OR future_day-today_day>91 THEN RAISE EXCEPTION 'finance_date_invalid' USING ERRCODE='22023';END IF;
 starts:=p_from::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';ends:=greatest(starts,least((p_to+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh',statement_timestamp()));last_day:=least(p_to,today_day);
 WITH eligible AS MATERIALIZED(
  SELECT 'order' kind,id,delivered_at at FROM public.sales_order WHERE delivered_at>=starts AND delivered_at<ends
  UNION ALL SELECT 'appointment',id,check_out_time FROM public.appointment WHERE check_out_time>=starts AND check_out_time<ends
 ),revenues AS MATERIALIZED(SELECT * FROM public.finance_revenue_event WHERE recognized_at>=starts AND recognized_at<ends),
 entries AS MATERIALIZED(SELECT * FROM public.finance_entry WHERE recognized_on>=p_from AND recognized_on<=last_day),
 costs AS MATERIALIZED(
  SELECT line_id id,recognized_at,amount,known,stamp FROM pawpal_private.finance_sale_costs() WHERE recognized_at>=starts AND recognized_at<ends
  UNION ALL
  SELECT c.inventory_transaction_id,c.recorded_at,
   -coalesce(CASE WHEN verified.quantity=d.quantity THEN round(verified.amount/verified.quantity*c.quantity_delta,6) END,c.cost_delta),
   c.cost_delta IS NOT NULL OR coalesce(verified.quantity=d.quantity,false),greatest(c.recorded_at,verified.confirmed_at)
  FROM public.finance_stock_cost_event c JOIN public.inventory_transaction i ON i.id=c.inventory_transaction_id JOIN public.sales_order_detail d ON d.id=c.sales_order_detail_id
  JOIN public.sales_order o ON o.id=d.order_id LEFT JOIN public.finance_sale_cost_confirmation verified ON verified.sales_order_detail_id=d.id
  WHERE o.delivered_at IS NOT NULL AND c.recorded_at>=starts AND c.recorded_at<ends AND NOT(i.sales_order_detail_id IS NOT NULL AND i.quantity<0 AND i.return_request_detail_id IS NULL)
 ),facts AS(
  SELECT coalesce((SELECT sum(amount_delta) FROM revenues),0) revenue,
   coalesce((SELECT sum(amount) FROM costs WHERE known),0) product_cost,
   coalesce((SELECT sum(amount) FROM entries WHERE entry_kind='service_cost' AND status='posted'),0) service_cost,
   coalesce((SELECT sum(amount) FROM entries WHERE entry_kind='expense' AND status='posted'),0) expense,
   coalesce((SELECT sum(revenue_part) FROM entries WHERE entry_kind='refund_allocation' AND status='posted'),0)+coalesce((SELECT sum(amount) FROM entries WHERE entry_kind='revenue_credit' AND status='posted'),0) reduction,
   coalesce((SELECT sum(expense_part) FROM entries WHERE entry_kind='refund_allocation' AND status='posted'),0) compensation,
   (SELECT count(*) FROM eligible e WHERE NOT EXISTS(SELECT 1 FROM public.finance_revenue_source s WHERE s.kind=e.kind AND s.record_id=e.id)) missing_revenue,
   (SELECT count(*) FROM costs WHERE NOT coalesce(known,false))+(SELECT count(*) FROM eligible e WHERE e.kind='order' AND NOT EXISTS(SELECT 1 FROM public.sales_order_detail WHERE order_id=e.id)) missing_product_cost,
   (SELECT count(*) FROM eligible e WHERE e.kind='appointment' AND NOT EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.entry_kind='service_cost' AND f.appointment_id=e.id AND f.status='posted')) missing_service_cost,
   (SELECT count(*) FROM public.refund_transaction r WHERE r.refund_status='succeeded' AND r.completed_at>=starts AND r.completed_at<ends AND NOT EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.refund_id=r.id AND f.status='posted')) missing_refunds,
   (SELECT count(*) FROM public.return_request rr JOIN public.sales_order o ON o.id=rr.sales_order_id WHERE o.delivered_at<ends AND rr.request_status IN('approved','da_duyet','received','completed') AND NOT EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.return_request_id=rr.id AND f.entry_kind='revenue_credit' AND f.status='posted')) missing_returns,
   md5(coalesce((SELECT string_agg(jsonb_build_array(id,entry_kind,amount,revenue_part,advance_part,expense_part,document_part,status,updated_at)::text,'|' ORDER BY id) FROM entries),'')) entry_fingerprint,
   md5(coalesce((SELECT string_agg(jsonb_build_array(id,amount,known,stamp)::text,'|' ORDER BY id) FROM costs),'')) cost_fingerprint,
   md5(coalesce((SELECT string_agg(jsonb_build_array(id,amount_delta,recognized_at)::text,'|' ORDER BY id) FROM revenues),'')) revenue_fingerprint
 ),accounts AS MATERIALIZED(
  SELECT a.*,a.opening_balance+coalesce((SELECT sum(amount) FROM public.finance_cash_movement m WHERE m.account_id=a.id AND m.status='posted' AND m.occurred_at>a.opening_at AND m.occurred_at<=statement_timestamp()),0) balance FROM public.finance_account a
 ),dues AS MATERIALIZED(
  SELECT e.entry_kind,e.due_on,greatest(0,e.amount-coalesce((SELECT sum(abs(m.amount)) FROM public.finance_cash_movement m WHERE m.entry_id=e.id AND m.status='posted'),0)) remaining,true known
  FROM public.finance_entry e WHERE e.status='posted' AND e.entry_kind IN('expense','receivable','payable')
  UNION ALL SELECT CASE WHEN balance>0 THEN 'receivable' ELSE 'payable' END,due_on,abs(balance),known FROM pawpal_private.finance_document_balances()
 ),timeline AS(
  SELECT series.moment::date day_key,
   coalesce((SELECT sum(remaining) FROM dues WHERE entry_kind='receivable' AND due_on=series.moment::date AND p_include_receiv AND due_on>=today_day),0) incoming,
   coalesce((SELECT sum(remaining) FROM dues WHERE entry_kind IN('expense','payable') AND greatest(due_on,today_day)=series.moment::date AND due_on IS NOT NULL),0) outgoing
  FROM generate_series(today_day::timestamp,future_day::timestamp,interval '1 day') AS series(moment)
 ),forecast AS(
  SELECT day_key,incoming,outgoing,(SELECT sum(balance) FROM accounts)+sum(incoming-outgoing) OVER(ORDER BY day_key) balance FROM timeline
 )
 SELECT jsonb_build_object('from',starts,'to',ends,'partial',ends<(p_to+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh','tracked_from',(SELECT started_at FROM public.finance_tracking_start),
  'revenue',f.revenue-f.reduction,'product_cost',f.product_cost,'service_cost',f.service_cost,'expense',f.expense+f.compensation,
  'calculated_result',f.revenue-f.reduction-f.product_cost-f.service_cost-f.expense-f.compensation,
  'missing',jsonb_build_object('revenue',f.missing_revenue,'product_cost',f.missing_product_cost,'service_cost',f.missing_service_cost,'refunds',f.missing_refunds,'returns',f.missing_returns),
  'fingerprint',md5(jsonb_build_array(p_from,p_to,f.entry_fingerprint,f.cost_fingerprint,f.revenue_fingerprint,f.missing_revenue,f.missing_product_cost,f.missing_service_cost,f.missing_refunds,f.missing_returns)::text),
  'cash',jsonb_build_object('as_of',statement_timestamp(),'accounts',(SELECT count(*) FROM accounts),'balance',(SELECT sum(balance) FROM accounts),'reconciled_to',(SELECT min(reconciled_at) FROM accounts),
   'unreconciled_accounts',(SELECT count(*) FROM accounts WHERE reconciled_at IS NULL),
   'unallocated_payments',(SELECT count(*) FROM public.payment p WHERE p.transaction_status='succeeded' AND p.succeeded_at>(SELECT min(opening_at) FROM accounts) AND NOT EXISTS(SELECT 1 FROM public.finance_cash_movement m WHERE m.payment_id=p.id AND m.status='posted') AND NOT EXISTS(SELECT 1 FROM public.finance_opening_coverage c WHERE c.payment_id=p.id AND c.status='posted')),
   'unallocated_refunds',(SELECT count(*) FROM public.refund_transaction r WHERE r.refund_status='succeeded' AND r.completed_at>(SELECT min(opening_at) FROM accounts) AND NOT EXISTS(SELECT 1 FROM public.finance_cash_movement m WHERE m.refund_id=r.id AND m.status='posted') AND NOT EXISTS(SELECT 1 FROM public.finance_opening_coverage c WHERE c.refund_id=r.id AND c.status='posted'))),
  'obligations',jsonb_build_object('receivable',coalesce((SELECT sum(remaining) FROM dues WHERE entry_kind='receivable'),0),'payable',coalesce((SELECT sum(remaining) FROM dues WHERE entry_kind IN('expense','payable')),0),
   'undated',(SELECT count(*) FROM dues WHERE remaining>0 AND due_on IS NULL),'overdue',(SELECT count(*) FROM dues WHERE remaining>0 AND due_on<today_day),'unknown_documents',(SELECT count(*) FROM dues WHERE NOT known)),
  'forecast',jsonb_build_object('from',today_day,'to',future_day,'include_receivables',p_include_receiv,'rows',coalesce((SELECT jsonb_agg(jsonb_build_object('day',day_key,'incoming',incoming,'outgoing',outgoing,'balance',balance) ORDER BY day_key) FROM forecast WHERE incoming<>0 OR outgoing<>0 OR day_key=today_day OR day_key=future_day),'[]'::jsonb))
 ) INTO report FROM facts f;
 fingerprint:=report->>'fingerprint';SELECT * INTO review FROM public.finance_period_review WHERE from_day=p_from AND to_day=p_to;
 report:=report||jsonb_build_object('review_current',review.fingerprint=fingerprint,'reviewed_at',review.reviewed_at);
 IF coalesce(review.fingerprint=fingerprint,false) AND NOT EXISTS(SELECT 1 FROM jsonb_each_text(report->'missing') x WHERE x.value::integer>0) THEN
  RETURN report||jsonb_build_object('result',report->'calculated_result','result_ready',true);
 END IF;
 RETURN (report-'calculated_result')||jsonb_build_object('result',NULL,'result_ready',false);
END $$;

CREATE OR REPLACE FUNCTION pawpal_private.finance_review_period(p_data jsonb,p_actor uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE report jsonb;period_from date:=(p_data->>'from')::date;period_to date:=(p_data->>'to')::date;
BEGIN
 IF p_data->>'expenses_complete' IS DISTINCT FROM 'true' OR period_from>(statement_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN RAISE EXCEPTION 'finance_expense_confirmation_required' USING ERRCODE='22023';END IF;
 report:=public.admin_finance_report(period_from,period_to);
 IF report->>'fingerprint' IS DISTINCT FROM p_data->>'fingerprint' THEN RAISE EXCEPTION 'finance_report_changed' USING ERRCODE='PT409';END IF;
 IF EXISTS(SELECT 1 FROM jsonb_each_text(report->'missing') x WHERE x.value::integer>0) THEN RAISE EXCEPTION 'finance_sources_incomplete' USING ERRCODE='22023';END IF;
 INSERT INTO public.finance_period_review(from_day,to_day,fingerprint,reference,reviewed_by) VALUES(period_from,period_to,report->>'fingerprint',btrim(p_data->>'reference'),p_actor)
 ON CONFLICT(from_day,to_day) DO UPDATE SET fingerprint=EXCLUDED.fingerprint,reference=EXCLUDED.reference,reviewed_by=EXCLUDED.reviewed_by,reviewed_at=clock_timestamp();
 RETURN p_actor;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.finance_review_period(jsonb,uuid) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_finance_report(date,date,date,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_finance_report(date,date,date,boolean) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
