-- Finance facts entered and approved by Admin. No sample accounts, balances or transactions.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
INSERT INTO public.permission(code,description) VALUES('finance.read','Xem sổ tài chính quản trị'),('finance.write','Ghi nhận và đối soát tài chính quản trị') ON CONFLICT(code) DO NOTHING;
INSERT INTO public.role_permission(role_code,permission_code) VALUES('ADMIN','finance.read'),('ADMIN','finance.write') ON CONFLICT DO NOTHING;

CREATE TABLE public.finance_account(
 id uuid PRIMARY KEY,name text NOT NULL CHECK(length(btrim(name)) BETWEEN 2 AND 160),account_type text NOT NULL CHECK(account_type IN('cash','bank')),
 opening_balance numeric(20,4) NOT NULL CHECK(opening_balance BETWEEN -1000000000000 AND 1000000000000),opening_at timestamptz NOT NULL,
 reference text NOT NULL CHECK(length(btrim(reference)) BETWEEN 2 AND 200),reconciled_at timestamptz,
 created_by uuid NOT NULL REFERENCES public.staff(id),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE UNIQUE INDEX finance_account_name_idx ON public.finance_account(lower(btrim(name)));
CREATE TABLE public.finance_entry(
 id uuid PRIMARY KEY,entry_kind text NOT NULL CHECK(entry_kind IN('expense','receivable','payable','service_cost','refund_allocation','revenue_credit')),
 description text NOT NULL CHECK(length(btrim(description)) BETWEEN 3 AND 2000),category text NOT NULL DEFAULT '' CHECK(length(category)<=120),counterparty text NOT NULL DEFAULT '' CHECK(length(counterparty)<=200),
 amount numeric(20,4) NOT NULL CHECK(amount BETWEEN 0 AND 1000000000000),recognized_on date NOT NULL,due_on date,
 reference text NOT NULL CHECK(length(btrim(reference)) BETWEEN 2 AND 200),status text NOT NULL DEFAULT 'posted' CHECK(status IN('posted','void')),
 order_id uuid REFERENCES public.sales_order(id),appointment_id uuid REFERENCES public.appointment(id),purchase_order_id uuid REFERENCES public.purchase_order(id),refund_id uuid REFERENCES public.refund_transaction(id),
 customer_id uuid REFERENCES public.customer(id),supplier_id uuid REFERENCES public.supplier(id),
 return_request_id uuid REFERENCES public.return_request(id),
 revenue_part numeric(20,4) NOT NULL DEFAULT 0 CHECK(revenue_part>=0),advance_part numeric(20,4) NOT NULL DEFAULT 0 CHECK(advance_part>=0),expense_part numeric(20,4) NOT NULL DEFAULT 0 CHECK(expense_part>=0),document_part numeric(20,4) NOT NULL DEFAULT 0 CHECK(document_part>=0),
 created_by uuid NOT NULL REFERENCES public.staff(id),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),void_reason text,
 CHECK(amount>0 OR entry_kind IN('service_cost','revenue_credit')),CHECK(num_nonnulls(order_id,appointment_id,purchase_order_id,refund_id)<=1),
 CHECK(num_nonnulls(customer_id,supplier_id)<=1),
 CHECK((entry_kind='service_cost')=(appointment_id IS NOT NULL)),CHECK((entry_kind='refund_allocation')=(refund_id IS NOT NULL)),
 CHECK((entry_kind='revenue_credit')=(return_request_id IS NOT NULL)),
 CHECK(entry_kind<>'refund_allocation' OR revenue_part+advance_part+expense_part+document_part=amount)
);
CREATE INDEX finance_entry_period_idx ON public.finance_entry(recognized_on,entry_kind) WHERE status='posted';
CREATE UNIQUE INDEX finance_entry_document_idx ON public.finance_entry((CASE WHEN entry_kind IN('expense','payable') THEN 'payable_document' ELSE entry_kind END),lower(btrim(counterparty)),lower(btrim(reference))) WHERE status='posted';
CREATE UNIQUE INDEX finance_purchase_payable_idx ON public.finance_entry(purchase_order_id) WHERE status='posted' AND purchase_order_id IS NOT NULL;
CREATE UNIQUE INDEX finance_service_cost_idx ON public.finance_entry(appointment_id) WHERE entry_kind='service_cost' AND status='posted';
CREATE UNIQUE INDEX finance_refund_allocation_idx ON public.finance_entry(refund_id) WHERE entry_kind='refund_allocation' AND status='posted';
CREATE UNIQUE INDEX finance_return_credit_idx ON public.finance_entry(return_request_id) WHERE entry_kind='revenue_credit' AND status='posted';
CREATE TABLE public.finance_cash_movement(
 id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES public.finance_account(id),occurred_at timestamptz NOT NULL,amount numeric(20,4) NOT NULL CHECK(amount<>0 AND amount BETWEEN -1000000000000 AND 1000000000000),
 description text NOT NULL CHECK(length(btrim(description)) BETWEEN 3 AND 2000),reference text NOT NULL CHECK(length(btrim(reference)) BETWEEN 2 AND 200),
 entry_id uuid REFERENCES public.finance_entry(id),payment_id uuid REFERENCES public.payment(id),refund_id uuid REFERENCES public.refund_transaction(id),transfer_id uuid,
 status text NOT NULL DEFAULT 'posted' CHECK(status IN('posted','void')),created_by uuid NOT NULL REFERENCES public.staff(id),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),void_reason text,
 CHECK(num_nonnulls(entry_id,payment_id,refund_id,transfer_id)<=1)
);
CREATE INDEX finance_cash_account_idx ON public.finance_cash_movement(account_id,occurred_at) WHERE status='posted';
CREATE INDEX finance_cash_entry_idx ON public.finance_cash_movement(entry_id) WHERE status='posted';
CREATE UNIQUE INDEX finance_cash_document_idx ON public.finance_cash_movement(account_id,lower(btrim(reference))) WHERE status='posted';
CREATE UNIQUE INDEX finance_cash_payment_idx ON public.finance_cash_movement(payment_id) WHERE status='posted';
CREATE UNIQUE INDEX finance_cash_refund_idx ON public.finance_cash_movement(refund_id) WHERE status='posted';
CREATE TABLE public.finance_opening_coverage(
 id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES public.finance_account(id),payment_id uuid REFERENCES public.payment(id),refund_id uuid REFERENCES public.refund_transaction(id),
 reference text NOT NULL,status text NOT NULL DEFAULT 'posted' CHECK(status IN('posted','void')),created_by uuid NOT NULL REFERENCES public.staff(id),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),void_reason text,
 CHECK(num_nonnulls(payment_id,refund_id)=1)
);
CREATE UNIQUE INDEX finance_coverage_payment_idx ON public.finance_opening_coverage(payment_id) WHERE status='posted';
CREATE UNIQUE INDEX finance_coverage_refund_idx ON public.finance_opening_coverage(refund_id) WHERE status='posted';
CREATE TABLE public.finance_reconciliation(
 id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES public.finance_account(id),as_of timestamptz NOT NULL,balance numeric(20,4) NOT NULL,reference text NOT NULL,
 created_by uuid NOT NULL REFERENCES public.staff(id),created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.finance_period_review(
 from_day date NOT NULL,to_day date NOT NULL,fingerprint text NOT NULL,reference text NOT NULL,reviewed_by uuid NOT NULL REFERENCES public.staff(id),reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(from_day,to_day),CHECK(to_day>=from_day AND to_day-from_day<=91)
);
CREATE TABLE public.finance_document_due(
 kind text NOT NULL CHECK(kind IN('order','appointment')),record_id uuid NOT NULL,due_on date,direction text NOT NULL CHECK(direction IN('receivable','payable')),reference text NOT NULL,updated_by uuid NOT NULL REFERENCES public.staff(id),updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(kind,record_id)
);
CREATE TABLE public.finance_audit(
 request_id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES public.staff(id),action text NOT NULL,entity_id uuid NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE OR REPLACE FUNCTION pawpal_private.finance_require(p_write boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid;
BEGIN
 PERFORM pawpal_private.dashboard_require(ARRAY[CASE WHEN p_write THEN 'finance.write' ELSE 'finance.read' END]);
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid();
 IF actor IS NULL THEN RAISE EXCEPTION 'finance_forbidden' USING ERRCODE='42501';END IF;
 RETURN actor;
END $$;
CREATE OR REPLACE FUNCTION pawpal_private.finance_number(p_data jsonb,p_key text,p_min numeric DEFAULT 0)
RETURNS numeric LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE n numeric;
BEGIN
 IF jsonb_typeof(p_data->p_key) NOT IN('number','string') OR nullif(btrim(p_data->>p_key),'') IS NULL THEN RAISE EXCEPTION 'finance_amount_required' USING ERRCODE='22023';END IF;
 n:=(p_data->>p_key)::numeric;
 IF n IS NULL OR n::text IN('NaN','Infinity','-Infinity') OR n<p_min OR n>1000000000000 OR round(n,4)<>n THEN RAISE EXCEPTION 'finance_amount_invalid' USING ERRCODE='22023';END IF;
 RETURN n;
END $$;
CREATE OR REPLACE FUNCTION pawpal_private.finance_signal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 PERFORM pawpal_private.emit_workspace_signal((SELECT coalesce(array_agg(s.auth_user_id),'{}') FROM public.staff s JOIN public.staff_role r ON r.staff_id=s.id WHERE r.role_code='ADMIN' AND s.auth_user_id IS NOT NULL),'refresh');
 RETURN NULL;
END $$;
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['finance_account','finance_entry','finance_cash_movement','finance_opening_coverage','finance_reconciliation','finance_period_review','finance_document_due','finance_audit'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('CREATE TRIGGER finance_signal AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION pawpal_private.finance_signal()',t);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.finance_require(boolean),pawpal_private.finance_number(jsonb,text,numeric),pawpal_private.finance_signal() FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.admin_finance_post(p_request_id uuid,p_action text,p_data jsonb,p_expected_updated_at timestamptz DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public SET statement_timeout='10s' AS $$
DECLARE actor uuid;prior public.finance_audit;payload jsonb;entity uuid;amount_value numeric;ref text;descr text;at_value timestamptz;day_value date;
 a public.finance_account;e public.finance_entry;m public.finance_cash_movement;p public.payment;r public.refund_transaction;coverage public.finance_opening_coverage;source_id uuid;other_id uuid;customer_key uuid;supplier_key uuid;party_name text;paid numeric;book numeric;parts numeric[];due_record public.finance_document_due;return_row public.return_request;parent_key uuid;
BEGIN
 actor:=pawpal_private.finance_require(true);
 IF p_request_id IS NULL OR p_action IS NULL OR jsonb_typeof(p_data) IS DISTINCT FROM 'object' OR length(p_data::text)>12000 THEN RAISE EXCEPTION 'finance_invalid_request' USING ERRCODE='22023';END IF;
 IF p_action IN('payment','payment_covered') THEN PERFORM pawpal_private.dashboard_require(ARRAY['payment.read']);
 ELSIF p_action IN('refund','refund_covered','refund_allocation') THEN PERFORM pawpal_private.dashboard_require(ARRAY['refund_transaction.read']);
 ELSIF p_action='service_cost' THEN PERFORM pawpal_private.dashboard_require(ARRAY['appointment.read']);
 ELSIF p_action='revenue_credit' THEN PERFORM pawpal_private.dashboard_require(ARRAY['sales_order.read','sales_order_detail.read','return_request.read','refund_transaction.read','voucher_redemption.read']);
 ELSIF p_action='document_due' THEN PERFORM pawpal_private.dashboard_require(ARRAY['sales_order.read','sales_order_detail.read','appointment.read','appointment_item.read','appointment_adjustment.read','voucher_redemption.read','payment.read','refund_transaction.read','return_request.read']);
 ELSIF p_action='sale_cost' THEN PERFORM pawpal_private.dashboard_require(ARRAY['sales_order.read','sales_order_detail.read']);
 ELSIF p_action='stock_opening' THEN PERFORM pawpal_private.dashboard_require(ARRAY['inventory.read','product_variant.read']);
 ELSIF p_action='revenue_confirm' THEN PERFORM pawpal_private.dashboard_require(ARRAY['sales_order.read','sales_order_detail.read','appointment.read','appointment_item.read','appointment_adjustment.read','voucher_redemption.read']);
 ELSIF p_action='payable' AND nullif(p_data->>'source_id','') IS NOT NULL THEN PERFORM pawpal_private.dashboard_require(ARRAY['purchase_order.read','supplier.read']);END IF;
 payload:=jsonb_build_object('data',p_data,'expected_updated_at',p_expected_updated_at);
 PERFORM pg_advisory_xact_lock(hashtextextended('finance:'||p_request_id,263));
 SELECT * INTO prior FROM public.finance_audit WHERE request_id=p_request_id;
 IF FOUND THEN
  IF prior.actor_id<>actor OR prior.action<>p_action OR prior.payload<>payload THEN RAISE EXCEPTION 'finance_request_conflict' USING ERRCODE='PT409';END IF;
  RETURN prior.entity_id;
 END IF;
 ref:=btrim(coalesce(p_data->>'reference',''));descr:=btrim(coalesce(p_data->>'description',''));
 IF length(ref) NOT BETWEEN 2 AND 200 THEN RAISE EXCEPTION 'finance_reference_required' USING ERRCODE='22023';END IF;
 entity:=p_request_id;
 IF p_action='account' THEN
  at_value:=(p_data->>'opening_at')::timestamptz;
  IF length(btrim(coalesce(p_data->>'name',''))) NOT BETWEEN 2 AND 160 OR p_data->>'account_type' NOT IN('cash','bank') OR at_value IS NULL OR NOT isfinite(at_value) OR at_value>statement_timestamp() THEN RAISE EXCEPTION 'finance_account_invalid' USING ERRCODE='22023';END IF;
  amount_value:=pawpal_private.finance_number(p_data,'opening_balance',-1000000000000);
  INSERT INTO public.finance_account(id,name,account_type,opening_balance,opening_at,reference,created_by) VALUES(entity,btrim(p_data->>'name'),p_data->>'account_type',amount_value,at_value,ref,actor);
 ELSIF p_action IN('expense','receivable','payable','service_cost','refund_allocation','revenue_credit') THEN
  IF length(descr) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'finance_description_required' USING ERRCODE='22023';END IF;
  day_value:=(p_data->>'recognized_on')::date;
  IF day_value IS NULL OR NOT isfinite(day_value) OR day_value>(statement_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date OR length(coalesce(p_data->>'counterparty',''))>200 OR length(coalesce(p_data->>'category',''))>120
   OR nullif(p_data->>'due_on','') IS NOT NULL AND NOT isfinite((p_data->>'due_on')::date) THEN RAISE EXCEPTION 'finance_date_invalid' USING ERRCODE='22023';END IF;
  amount_value:=pawpal_private.finance_number(p_data,'amount');
  customer_key:=nullif(p_data->>'customer_id','')::uuid;supplier_key:=nullif(p_data->>'supplier_id','')::uuid;party_name:=btrim(coalesce(p_data->>'counterparty',''));
  IF customer_key IS NOT NULL THEN
   PERFORM pawpal_private.dashboard_require(ARRAY['customer.read','customer_profile.read']);
   IF p_action<>'receivable' OR supplier_key IS NOT NULL THEN RAISE EXCEPTION 'finance_counterparty_required' USING ERRCODE='22023';END IF;
   SELECT coalesce(profile.full_name,c.customer_code) INTO party_name FROM public.customer c LEFT JOIN public.customer_profile profile ON profile.customer_id=c.id WHERE c.id=customer_key;
   IF NOT FOUND THEN RAISE EXCEPTION 'finance_counterparty_required' USING ERRCODE='22023';END IF;
  END IF;
  IF supplier_key IS NOT NULL THEN
   PERFORM pawpal_private.dashboard_require(ARRAY['supplier.read']);
   IF p_action NOT IN('expense','payable') THEN RAISE EXCEPTION 'finance_counterparty_required' USING ERRCODE='22023';END IF;
   SELECT supplier_name INTO party_name FROM public.supplier WHERE id=supplier_key;
   IF NOT FOUND THEN RAISE EXCEPTION 'finance_counterparty_required' USING ERRCODE='22023';END IF;
  END IF;
  IF p_action NOT IN('service_cost','revenue_credit') AND amount_value=0 THEN RAISE EXCEPTION 'finance_amount_invalid' USING ERRCODE='22023';END IF;
  IF p_action IN('receivable','payable') AND (EXISTS(SELECT 1 FROM public.sales_order WHERE lower(order_code)=lower(ref)) OR EXISTS(SELECT 1 FROM public.appointment WHERE lower(appointment_code)=lower(ref))) THEN RAISE EXCEPTION 'finance_use_document_receivable' USING ERRCODE='22023';END IF;
  IF p_action='expense' AND length(btrim(coalesce(p_data->>'category','')))<2 THEN RAISE EXCEPTION 'finance_category_required' USING ERRCODE='22023';END IF;
  source_id:=nullif(p_data->>'source_id','')::uuid;
  IF p_action='service_cost' THEN
   SELECT (check_out_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::date INTO day_value FROM public.appointment WHERE id=source_id AND appointment_status='completed' AND check_out_time IS NOT NULL;
   IF NOT FOUND THEN RAISE EXCEPTION 'finance_completed_service_required' USING ERRCODE='22023';END IF;
  ELSIF p_action='refund_allocation' THEN
   SELECT * INTO r FROM public.refund_transaction WHERE id=source_id AND refund_status='succeeded';
   IF NOT FOUND OR amount_value<>r.refunded_amount THEN RAISE EXCEPTION 'finance_refund_changed' USING ERRCODE='PT409';END IF;
   parts:=ARRAY[pawpal_private.finance_number(p_data,'revenue_part'),pawpal_private.finance_number(p_data,'advance_part'),pawpal_private.finance_number(p_data,'expense_part'),pawpal_private.finance_number(p_data,'document_part')];
   IF parts[1]+parts[2]+parts[3]+parts[4]<>r.refunded_amount THEN RAISE EXCEPTION 'finance_refund_split_invalid' USING ERRCODE='22023';END IF;
   IF parts[1]>0 AND EXISTS(SELECT 1 FROM public.finance_entry f WHERE f.return_request_id=r.return_request_id AND f.entry_kind='revenue_credit' AND f.status='posted' AND f.amount>0) THEN RAISE EXCEPTION 'finance_refund_credit_already_recorded' USING ERRCODE='22023';END IF;
  ELSIF p_action='revenue_credit' THEN
   SELECT * INTO return_row FROM public.return_request WHERE id=source_id AND request_status IN('approved','da_duyet','received','completed') FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'finance_source_invalid' USING ERRCODE='22023';END IF;parent_key:=return_row.sales_order_id;
   PERFORM 1 FROM public.sales_order WHERE id=parent_key AND delivered_at IS NOT NULL FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'finance_source_invalid' USING ERRCODE='22023';END IF;
   SELECT total_amount INTO book FROM public.sales_order_totals WHERE order_id=parent_key;
   SELECT coalesce(sum(f.revenue_part),0) INTO paid FROM public.finance_entry f JOIN public.refund_transaction rr ON rr.id=f.refund_id JOIN public.payment receipt ON receipt.id=rr.payment_id WHERE receipt.order_id=parent_key AND f.status='posted' AND f.entry_kind='refund_allocation';
   IF book IS NULL OR book::text IN('NaN','Infinity','-Infinity') OR amount_value+paid+coalesce((SELECT sum(amount) FROM public.finance_entry WHERE order_id=parent_key AND entry_kind='revenue_credit' AND status='posted'),0)>book THEN RAISE EXCEPTION 'finance_credit_exceeds_invoice' USING ERRCODE='22023';END IF;
  ELSIF source_id IS NOT NULL THEN
   IF p_action<>'payable' OR NOT EXISTS(SELECT 1 FROM public.purchase_order WHERE id=source_id AND order_status='received') THEN RAISE EXCEPTION 'finance_source_invalid' USING ERRCODE='22023';END IF;
   IF supplier_key IS NOT NULL AND supplier_key<>(SELECT supplier_id FROM public.purchase_order WHERE id=source_id) THEN RAISE EXCEPTION 'finance_counterparty_required' USING ERRCODE='22023';END IF;
   SELECT purchase.supplier_id,s.supplier_name INTO supplier_key,party_name FROM public.purchase_order purchase JOIN public.supplier s ON s.id=purchase.supplier_id WHERE purchase.id=source_id;
  END IF;
  IF p_action IN('expense','receivable','payable') AND length(coalesce(party_name,''))<1 THEN RAISE EXCEPTION 'finance_counterparty_required' USING ERRCODE='22023';END IF;
  IF NOT isfinite(day_value) THEN RAISE EXCEPTION 'finance_date_invalid' USING ERRCODE='22023';END IF;
  INSERT INTO public.finance_entry(id,entry_kind,description,category,counterparty,amount,recognized_on,due_on,reference,appointment_id,purchase_order_id,refund_id,revenue_part,advance_part,expense_part,document_part,customer_id,supplier_id,return_request_id,order_id,created_by)
  VALUES(entity,p_action,descr,btrim(coalesce(p_data->>'category','')),party_name,amount_value,day_value,nullif(p_data->>'due_on','')::date,ref,
   CASE WHEN p_action='service_cost' THEN source_id END,CASE WHEN p_action='payable' THEN source_id END,CASE WHEN p_action='refund_allocation' THEN source_id END,coalesce(parts[1],0),coalesce(parts[2],0),coalesce(parts[3],0),coalesce(parts[4],0),customer_key,supplier_key,CASE WHEN p_action='revenue_credit' THEN source_id END,parent_key,actor);
 ELSIF p_action IN('payment_covered','refund_covered') THEN
  SELECT * INTO a FROM public.finance_account WHERE id=nullif(p_data->>'account_id','')::uuid FOR UPDATE;
  source_id:=nullif(p_data->>'source_id','')::uuid;
  IF a.id IS NULL THEN RAISE EXCEPTION 'finance_account_required' USING ERRCODE='22023';END IF;
  IF p_action='payment_covered' THEN
   SELECT * INTO p FROM public.payment WHERE id=source_id AND transaction_status='succeeded' FOR UPDATE;
   at_value:=p.succeeded_at;
   IF EXISTS(SELECT 1 FROM public.finance_cash_movement WHERE payment_id=source_id AND status='posted') THEN RAISE EXCEPTION 'finance_source_already_recorded' USING ERRCODE='PT409';END IF;
  ELSE
   SELECT * INTO r FROM public.refund_transaction WHERE id=source_id AND refund_status='succeeded' FOR UPDATE;
   at_value:=r.completed_at;
   IF EXISTS(SELECT 1 FROM public.finance_cash_movement WHERE refund_id=source_id AND status='posted') THEN RAISE EXCEPTION 'finance_source_already_recorded' USING ERRCODE='PT409';END IF;
  END IF;
  IF at_value IS NULL OR at_value>a.opening_at THEN RAISE EXCEPTION 'finance_opening_coverage_invalid' USING ERRCODE='22023';END IF;
  INSERT INTO public.finance_opening_coverage(id,account_id,payment_id,refund_id,reference,created_by) VALUES(entity,a.id,CASE WHEN p_action='payment_covered' THEN p.id END,CASE WHEN p_action='refund_covered' THEN r.id END,ref,actor);
 ELSIF p_action IN('movement','transfer','settle','payment','refund') THEN
  source_id:=nullif(p_data->>'source_id','')::uuid;other_id:=nullif(p_data->>'other_account_id','')::uuid;
  IF p_action='settle' THEN
   SELECT * INTO e FROM public.finance_entry WHERE id=source_id FOR UPDATE;
   IF NOT FOUND OR e.status<>'posted' OR e.entry_kind NOT IN('expense','receivable','payable') THEN RAISE EXCEPTION 'finance_obligation_invalid' USING ERRCODE='22023';END IF;
  END IF;
  PERFORM 1 FROM public.finance_account WHERE id IN(nullif(p_data->>'account_id','')::uuid,other_id) ORDER BY id FOR UPDATE;
  SELECT * INTO a FROM public.finance_account WHERE id=nullif(p_data->>'account_id','')::uuid;
  IF NOT FOUND THEN RAISE EXCEPTION 'finance_account_required' USING ERRCODE='22023';END IF;
  at_value:=nullif(p_data->>'occurred_at','')::timestamptz;
  IF p_action='payment' THEN
   SELECT * INTO p FROM public.payment WHERE id=source_id AND transaction_status='succeeded' FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'finance_payment_invalid' USING ERRCODE='22023';END IF;
   amount_value:=p.amount;at_value:=p.succeeded_at;descr:='Thu tiền '||p.payment_code;ref:=p.payment_code;
   IF EXISTS(SELECT 1 FROM public.finance_opening_coverage WHERE payment_id=p.id AND status='posted') THEN RAISE EXCEPTION 'finance_source_already_recorded' USING ERRCODE='PT409';END IF;
  ELSIF p_action='refund' THEN
   SELECT * INTO r FROM public.refund_transaction WHERE id=source_id AND refund_status='succeeded' FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'finance_refund_invalid' USING ERRCODE='22023';END IF;
   amount_value:=-r.refunded_amount;at_value:=r.completed_at;descr:='Hoàn tiền '||r.refund_code;ref:=r.refund_code;
   IF EXISTS(SELECT 1 FROM public.finance_opening_coverage WHERE refund_id=r.id AND status='posted') THEN RAISE EXCEPTION 'finance_source_already_recorded' USING ERRCODE='PT409';END IF;
  ELSE
   amount_value:=pawpal_private.finance_number(p_data,'amount');
   IF amount_value=0 OR length(descr) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'finance_amount_invalid' USING ERRCODE='22023';END IF;
   IF p_action='movement' THEN
    IF p_data->>'direction' IS NULL OR p_data->>'direction' NOT IN('in','out') THEN RAISE EXCEPTION 'finance_direction_required' USING ERRCODE='22023';END IF;
    IF p_data->>'direction'='out' THEN amount_value:=-amount_value;END IF;
   ELSIF p_action='settle' THEN
    SELECT coalesce(sum(abs(amount)),0) INTO paid FROM public.finance_cash_movement WHERE entry_id=e.id AND status='posted';
    IF amount_value>e.amount-paid OR p_expected_updated_at IS DISTINCT FROM e.updated_at THEN RAISE EXCEPTION 'finance_obligation_changed' USING ERRCODE='PT409';END IF;
    IF e.entry_kind<>'receivable' THEN amount_value:=-amount_value;END IF;
    UPDATE public.finance_entry SET updated_at=clock_timestamp() WHERE id=e.id;
   ELSIF p_action='transfer' THEN
    IF other_id IS NULL OR other_id=a.id OR NOT EXISTS(SELECT 1 FROM public.finance_account WHERE id=other_id) THEN RAISE EXCEPTION 'finance_transfer_invalid' USING ERRCODE='22023';END IF;
    amount_value:=-amount_value;
   END IF;
  END IF;
  IF at_value IS NULL OR NOT isfinite(at_value) OR at_value<=a.opening_at OR at_value>statement_timestamp() OR at_value<=a.reconciled_at THEN RAISE EXCEPTION 'finance_cash_period_closed' USING ERRCODE='22023';END IF;
  INSERT INTO public.finance_cash_movement(id,account_id,occurred_at,amount,description,reference,entry_id,payment_id,refund_id,transfer_id,created_by)
  VALUES(entity,a.id,at_value,amount_value,descr,ref,CASE WHEN p_action='settle' THEN e.id END,CASE WHEN p_action='payment' THEN p.id END,CASE WHEN p_action='refund' THEN r.id END,CASE WHEN p_action='transfer' THEN entity END,actor);
  IF p_action='transfer' THEN
   SELECT * INTO a FROM public.finance_account WHERE id=other_id;
   IF at_value<=a.opening_at OR at_value<=a.reconciled_at THEN RAISE EXCEPTION 'finance_cash_period_closed' USING ERRCODE='22023';END IF;
   INSERT INTO public.finance_cash_movement(id,account_id,occurred_at,amount,description,reference,transfer_id,created_by) VALUES(extensions.gen_random_uuid(),other_id,at_value,-amount_value,descr,ref,entity,actor);
  END IF;
 ELSIF p_action='reconcile' THEN
  SELECT * INTO a FROM public.finance_account WHERE id=nullif(p_data->>'account_id','')::uuid FOR UPDATE;
  at_value:=(p_data->>'as_of')::timestamptz;amount_value:=pawpal_private.finance_number(p_data,'balance',-1000000000000);
  IF a.id IS NULL OR at_value IS NULL OR NOT isfinite(at_value) OR at_value<a.opening_at OR at_value>statement_timestamp() OR at_value<a.reconciled_at THEN RAISE EXCEPTION 'finance_date_invalid' USING ERRCODE='22023';END IF;
  SELECT a.opening_balance+coalesce(sum(amount),0) INTO book FROM public.finance_cash_movement WHERE account_id=a.id AND status='posted' AND occurred_at>a.opening_at AND occurred_at<=at_value;
  IF amount_value<>book THEN RAISE EXCEPTION 'finance_balance_mismatch' USING ERRCODE='22023';END IF;
  INSERT INTO public.finance_reconciliation(id,account_id,as_of,balance,reference,created_by) VALUES(entity,a.id,at_value,book,ref,actor);
  UPDATE public.finance_account SET reconciled_at=at_value,updated_at=clock_timestamp() WHERE id=a.id;
 ELSIF p_action='void_entry' THEN
  SELECT * INTO e FROM public.finance_entry WHERE id=nullif(p_data->>'id','')::uuid FOR UPDATE;
  IF e.id IS NULL OR e.status<>'posted' OR e.updated_at IS DISTINCT FROM p_expected_updated_at OR EXISTS(SELECT 1 FROM public.finance_cash_movement WHERE entry_id=e.id AND status='posted') THEN RAISE EXCEPTION 'finance_entry_changed' USING ERRCODE='PT409';END IF;
  IF length(descr) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'finance_description_required' USING ERRCODE='22023';END IF;
  UPDATE public.finance_entry SET status='void',void_reason=descr,updated_at=clock_timestamp() WHERE id=e.id;entity:=e.id;
 ELSIF p_action='void_movement' THEN
  SELECT * INTO m FROM public.finance_cash_movement WHERE id=nullif(p_data->>'id','')::uuid;
  IF m.id IS NULL OR m.status<>'posted' OR m.updated_at IS DISTINCT FROM p_expected_updated_at OR length(descr) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'finance_entry_changed' USING ERRCODE='PT409';END IF;
  IF m.entry_id IS NOT NULL THEN PERFORM 1 FROM public.finance_entry WHERE id=m.entry_id FOR UPDATE;END IF;
  PERFORM 1 FROM public.finance_account WHERE id IN(SELECT account_id FROM public.finance_cash_movement WHERE id=m.id OR transfer_id=m.transfer_id) ORDER BY id FOR UPDATE;
  SELECT * INTO m FROM public.finance_cash_movement WHERE id=m.id FOR UPDATE;
  IF m.status<>'posted' OR m.updated_at IS DISTINCT FROM p_expected_updated_at THEN RAISE EXCEPTION 'finance_entry_changed' USING ERRCODE='PT409';END IF;
  IF EXISTS(SELECT 1 FROM public.finance_cash_movement x JOIN public.finance_account cash_account ON cash_account.id=x.account_id WHERE (x.id=m.id OR x.transfer_id=m.transfer_id) AND x.occurred_at<=cash_account.reconciled_at) THEN RAISE EXCEPTION 'finance_cash_period_closed' USING ERRCODE='22023';END IF;
  UPDATE public.finance_cash_movement SET status='void',void_reason=descr,updated_at=clock_timestamp() WHERE status='posted' AND (id=m.id OR transfer_id=m.transfer_id);
  IF m.entry_id IS NOT NULL THEN UPDATE public.finance_entry SET updated_at=clock_timestamp() WHERE id=m.entry_id;END IF;entity:=m.id;
 ELSIF p_action='void_coverage' THEN
  SELECT * INTO coverage FROM public.finance_opening_coverage WHERE id=nullif(p_data->>'id','')::uuid;
  IF coverage.id IS NULL THEN RAISE EXCEPTION 'finance_entry_changed' USING ERRCODE='PT409';END IF;
  PERFORM 1 FROM public.finance_account WHERE id=coverage.account_id FOR UPDATE;
  IF coverage.payment_id IS NOT NULL THEN PERFORM 1 FROM public.payment WHERE id=coverage.payment_id FOR UPDATE;ELSE PERFORM 1 FROM public.refund_transaction WHERE id=coverage.refund_id FOR UPDATE;END IF;
  SELECT * INTO coverage FROM public.finance_opening_coverage WHERE id=coverage.id FOR UPDATE;
  IF coverage.status<>'posted' OR coverage.updated_at IS DISTINCT FROM p_expected_updated_at OR length(descr) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'finance_entry_changed' USING ERRCODE='PT409';END IF;
  UPDATE public.finance_opening_coverage SET status='void',void_reason=descr,updated_at=clock_timestamp() WHERE id=coverage.id;entity:=coverage.id;
 ELSIF p_action='document_due' THEN
  source_id:=nullif(p_data->>'source_id','')::uuid;
  IF p_data->>'source_kind' IS NULL OR p_data->>'direction' NOT IN('receivable','payable') OR NOT EXISTS(SELECT 1 FROM pawpal_private.finance_document_balances() x WHERE x.kind=p_data->>'source_kind' AND x.record_id=source_id AND x.known AND x.balance<>0 AND CASE WHEN x.balance>0 THEN 'receivable' ELSE 'payable' END=p_data->>'direction') THEN RAISE EXCEPTION 'finance_source_invalid' USING ERRCODE='22023';END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('finance-due:'||(p_data->>'source_kind')||source_id,263));
  SELECT * INTO due_record FROM public.finance_document_due WHERE kind=p_data->>'source_kind' AND record_id=source_id FOR UPDATE;
  IF due_record.updated_at IS DISTINCT FROM p_expected_updated_at OR nullif(p_data->>'due_on','') IS NOT NULL AND NOT isfinite((p_data->>'due_on')::date) THEN RAISE EXCEPTION 'finance_entry_changed' USING ERRCODE='PT409';END IF;
  INSERT INTO public.finance_document_due(kind,record_id,due_on,direction,reference,updated_by) VALUES(p_data->>'source_kind',source_id,nullif(p_data->>'due_on','')::date,p_data->>'direction',ref,actor)
  ON CONFLICT(kind,record_id) DO UPDATE SET due_on=EXCLUDED.due_on,direction=EXCLUDED.direction,reference=EXCLUDED.reference,updated_by=EXCLUDED.updated_by,updated_at=clock_timestamp();entity:=source_id;
 ELSIF p_action='stock_opening' THEN
  entity:=pawpal_private.finance_stock_opening(p_data,actor,p_expected_updated_at);
 ELSIF p_action='sale_cost' THEN
  entity:=pawpal_private.finance_confirm_sale_cost(p_data,actor,p_expected_updated_at);
 ELSIF p_action='revenue_confirm' THEN
  source_id:=nullif(p_data->>'source_id','')::uuid;
  IF p_data->>'source_kind' IS NULL OR p_data->>'source_kind' NOT IN('order','appointment') OR source_id IS NULL THEN RAISE EXCEPTION 'finance_source_invalid' USING ERRCODE='22023';END IF;
  IF EXISTS(SELECT 1 FROM public.finance_revenue_source WHERE kind=p_data->>'source_kind' AND record_id=source_id) THEN RAISE EXCEPTION 'finance_entry_changed' USING ERRCODE='PT409';END IF;
  PERFORM pawpal_private.finance_capture_revenue(p_data->>'source_kind',source_id,true,ref);
  IF NOT EXISTS(SELECT 1 FROM public.finance_revenue_source WHERE kind=p_data->>'source_kind' AND record_id=source_id) THEN RAISE EXCEPTION 'finance_source_invalid' USING ERRCODE='22023';END IF;
  IF (SELECT total FROM public.finance_revenue_source WHERE kind=p_data->>'source_kind' AND record_id=source_id) IS DISTINCT FROM pawpal_private.finance_number(p_data,'expected_amount') THEN RAISE EXCEPTION 'finance_source_changed' USING ERRCODE='PT409';END IF;
  entity:=source_id;
 ELSIF p_action='period_review' THEN
  entity:=pawpal_private.finance_review_period(p_data,actor);
 ELSE RAISE EXCEPTION 'finance_action_invalid' USING ERRCODE='22023';
 END IF;
 INSERT INTO public.finance_audit(request_id,actor_id,action,entity_id,payload) VALUES(p_request_id,actor,p_action,entity,payload);
 RETURN entity;
END $$;
REVOKE ALL ON FUNCTION public.admin_finance_post(uuid,text,jsonb,timestamptz) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_finance_post(uuid,text,jsonb,timestamptz) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
