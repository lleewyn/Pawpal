-- Prospective moving weighted cost and immutable recognition events. No historical price backfill.
BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='20s';
CREATE TABLE public.finance_tracking_start(id boolean PRIMARY KEY DEFAULT true CHECK(id),started_at timestamptz NOT NULL DEFAULT clock_timestamp());
INSERT INTO public.finance_tracking_start(id) VALUES(true);
CREATE TABLE public.finance_stock_cost(
 product_variant_id uuid PRIMARY KEY REFERENCES public.product_variant(id),quantity integer NOT NULL CHECK(quantity>=0),total_cost numeric(26,6) CHECK(total_cost>=0),
 verified_at timestamptz,reference text,updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.finance_stock_cost_event(
 inventory_transaction_id uuid PRIMARY KEY REFERENCES public.inventory_transaction(id),product_variant_id uuid NOT NULL REFERENCES public.product_variant(id),sales_order_detail_id uuid REFERENCES public.sales_order_detail(id),
 quantity_delta integer NOT NULL,cost_delta numeric(26,6),recorded_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX finance_cost_sales_line_idx ON public.finance_stock_cost_event(sales_order_detail_id);
CREATE TABLE public.finance_sale_cost_confirmation(
 sales_order_detail_id uuid PRIMARY KEY REFERENCES public.sales_order_detail(id),quantity integer NOT NULL CHECK(quantity>0),amount numeric(22,6) NOT NULL CHECK(amount>=0),
 reference text NOT NULL,confirmed_by uuid NOT NULL REFERENCES public.staff(id),confirmed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.finance_revenue_source(
 kind text NOT NULL CHECK(kind IN('order','appointment')),record_id uuid NOT NULL,total numeric(22,4) NOT NULL CHECK(total>=0),reference text,
 first_at timestamptz NOT NULL,updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),PRIMARY KEY(kind,record_id)
);
CREATE TABLE public.finance_revenue_event(
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,kind text NOT NULL,record_id uuid NOT NULL,amount_delta numeric(22,4) NOT NULL,recognized_at timestamptz NOT NULL,recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(kind,record_id) REFERENCES public.finance_revenue_source(kind,record_id)
);
CREATE INDEX finance_revenue_period_idx ON public.finance_revenue_event(recognized_at,kind);
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['finance_tracking_start','finance_stock_cost','finance_stock_cost_event','finance_sale_cost_confirmation','finance_revenue_source','finance_revenue_event'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
  EXECUTE format('CREATE TRIGGER finance_signal AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION pawpal_private.finance_signal()',t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION pawpal_private.finance_cost_step(p_quantity integer,p_cost numeric,p_delta integer,p_fixed_cost numeric DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path=pg_catalog AS $$
DECLARE change_cost numeric;next_cost numeric;
BEGIN
 IF p_quantity<0 OR p_quantity+p_delta<0 OR p_cost<0 OR p_cost::text IN('NaN','Infinity','-Infinity') OR p_fixed_cost::text IN('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'finance_cost_quantity_invalid' USING ERRCODE='22023';END IF;
 change_cost:=p_fixed_cost;
 IF change_cost IS NULL AND p_delta<0 AND p_quantity>0 AND p_cost IS NOT NULL THEN change_cost:=CASE WHEN p_quantity+p_delta=0 THEN -p_cost ELSE round(p_cost*p_delta/p_quantity,6) END;END IF;
 next_cost:=CASE WHEN p_quantity+p_delta=0 THEN 0 WHEN p_cost IS NOT NULL AND change_cost IS NOT NULL THEN p_cost+change_cost END;
 IF next_cost<0 THEN next_cost:=NULL;END IF;
 RETURN jsonb_build_object('quantity',p_quantity+p_delta,'total_cost',next_cost,'cost_delta',change_cost);
END $$;
CREATE OR REPLACE FUNCTION pawpal_private.finance_capture_stock()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE state public.finance_stock_cost;before_qty integer;fixed_cost numeric;unit_cost numeric;line_id uuid;step jsonb;
BEGIN
 -- The existing inventory BEFORE trigger already holds this same variant lock.
 PERFORM 1 FROM public.product_variant WHERE id=NEW.product_variant_id FOR UPDATE;
 SELECT * INTO state FROM public.finance_stock_cost WHERE product_variant_id=NEW.product_variant_id FOR UPDATE;
 IF NOT FOUND THEN
  SELECT coalesce(sum(quantity),0) INTO before_qty FROM public.inventory_transaction WHERE product_variant_id=NEW.product_variant_id AND id<>NEW.id;
  INSERT INTO public.finance_stock_cost(product_variant_id,quantity,total_cost) VALUES(NEW.product_variant_id,before_qty,CASE WHEN before_qty=0 THEN 0 END) RETURNING * INTO state;
 END IF;
 line_id:=NEW.sales_order_detail_id;
 IF NEW.return_request_detail_id IS NOT NULL THEN SELECT sales_order_detail_id INTO line_id FROM public.return_request_detail WHERE id=NEW.return_request_detail_id;END IF;
 IF NEW.purchase_order_detail_id IS NOT NULL THEN
  SELECT unit_price*NEW.quantity INTO fixed_cost FROM public.purchase_order_detail WHERE id=NEW.purchase_order_detail_id;
 ELSIF line_id IS NOT NULL AND (NEW.quantity>0 OR NEW.return_request_detail_id IS NOT NULL) THEN
  SELECT c.amount/c.quantity INTO unit_cost FROM public.finance_sale_cost_confirmation c JOIN public.sales_order_detail d ON d.id=c.sales_order_detail_id AND d.quantity=c.quantity WHERE c.sales_order_detail_id=line_id;
  IF unit_cost IS NULL THEN
   SELECT CASE WHEN bool_and(cost_delta IS NOT NULL) AND sum(-quantity_delta)>0 THEN sum(-cost_delta)/sum(-quantity_delta) END INTO unit_cost
   FROM public.finance_stock_cost_event WHERE sales_order_detail_id=line_id AND quantity_delta<0 AND inventory_transaction_id IN(SELECT id FROM public.inventory_transaction WHERE sales_order_detail_id=line_id AND quantity<0);
  END IF;
  fixed_cost:=round(unit_cost*NEW.quantity,6);
  IF fixed_cost IS NULL THEN SELECT round(amount/quantity*NEW.quantity,6) INTO fixed_cost FROM public.finance_sale_cost_confirmation WHERE sales_order_detail_id=line_id;END IF;
 END IF;
 -- A return whose original cost is unknown must not inherit today's average.
 IF NEW.return_request_detail_id IS NOT NULL AND fixed_cost IS NULL THEN
  step:=jsonb_build_object('quantity',state.quantity+NEW.quantity,'total_cost',CASE WHEN state.quantity+NEW.quantity=0 THEN 0 END,'cost_delta',NULL);
 ELSE step:=pawpal_private.finance_cost_step(state.quantity,state.total_cost,NEW.quantity,fixed_cost);END IF;
 INSERT INTO public.finance_stock_cost_event(inventory_transaction_id,product_variant_id,sales_order_detail_id,quantity_delta,cost_delta)
 VALUES(NEW.id,NEW.product_variant_id,line_id,NEW.quantity,(step->>'cost_delta')::numeric);
 UPDATE public.finance_stock_cost SET quantity=(step->>'quantity')::integer,total_cost=(step->>'total_cost')::numeric,updated_at=clock_timestamp() WHERE product_variant_id=NEW.product_variant_id;
 RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION pawpal_private.finance_confirm_sale_cost(p_data jsonb,p_actor uuid,p_expected timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE line public.sales_order_detail;amount_value numeric;prior public.finance_sale_cost_confirmation;correcting boolean:=p_data->>'correcting'='true';
BEGIN
 SELECT * INTO line FROM public.sales_order_detail WHERE id=nullif(p_data->>'source_id','')::uuid;
 IF line.id IS NULL THEN RAISE EXCEPTION 'finance_source_invalid' USING ERRCODE='22023';END IF;
 PERFORM 1 FROM public.sales_order WHERE id=line.order_id AND delivered_at IS NOT NULL FOR UPDATE;
 IF NOT FOUND OR (p_data->>'expected_quantity')::integer IS DISTINCT FROM line.quantity THEN RAISE EXCEPTION 'finance_source_changed' USING ERRCODE='PT409';END IF;
 SELECT * INTO prior FROM public.finance_sale_cost_confirmation WHERE sales_order_detail_id=line.id FOR UPDATE;
 IF prior.confirmed_at IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'finance_source_changed' USING ERRCODE='PT409';END IF;
 IF NOT coalesce(correcting,false) AND (prior.sales_order_detail_id IS NOT NULL
  OR EXISTS(SELECT 1 FROM public.finance_stock_cost_event c JOIN public.inventory_transaction i ON i.id=c.inventory_transaction_id WHERE i.sales_order_detail_id=line.id AND i.quantity<0 GROUP BY c.sales_order_detail_id HAVING bool_and(c.cost_delta IS NOT NULL))) THEN RAISE EXCEPTION 'finance_cost_already_known' USING ERRCODE='PT409';END IF;
 IF correcting AND length(btrim(coalesce(p_data->>'description','')))<3 THEN RAISE EXCEPTION 'finance_description_required' USING ERRCODE='22023';END IF;
 amount_value:=pawpal_private.finance_number(p_data,'amount');
 INSERT INTO public.finance_sale_cost_confirmation(sales_order_detail_id,quantity,amount,reference,confirmed_by) VALUES(line.id,line.quantity,amount_value,btrim(p_data->>'reference'),p_actor)
 ON CONFLICT(sales_order_detail_id) DO UPDATE SET quantity=EXCLUDED.quantity,amount=EXCLUDED.amount,reference=EXCLUDED.reference,confirmed_by=EXCLUDED.confirmed_by,confirmed_at=clock_timestamp();
 IF correcting THEN UPDATE public.finance_stock_cost SET total_cost=CASE WHEN quantity=0 THEN 0 END,updated_at=clock_timestamp() WHERE product_variant_id=line.product_variant_id;END IF;
 RETURN line.id;
END $$;
CREATE TRIGGER finance_capture_stock AFTER INSERT ON public.inventory_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.finance_capture_stock();

CREATE OR REPLACE FUNCTION pawpal_private.finance_stock_opening(p_data jsonb,p_actor uuid,p_expected timestamptz)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE variant uuid:=nullif(p_data->>'source_id','')::uuid;qty integer;stock_at timestamptz;amount_value numeric;state public.finance_stock_cost;
BEGIN
 PERFORM 1 FROM public.product_variant WHERE id=variant FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'finance_source_invalid' USING ERRCODE='22023';END IF;
 SELECT quantity_in_stock,last_updated_at INTO qty,stock_at FROM public.inventory WHERE product_variant_id=variant;
 SELECT * INTO state FROM public.finance_stock_cost WHERE product_variant_id=variant FOR UPDATE;
 IF qty IS NULL OR qty IS DISTINCT FROM (p_data->>'expected_quantity')::integer OR stock_at IS DISTINCT FROM (p_data->>'expected_stock_at')::timestamptz OR state.updated_at IS DISTINCT FROM p_expected THEN RAISE EXCEPTION 'finance_stock_changed' USING ERRCODE='PT409';END IF;
 amount_value:=pawpal_private.finance_number(p_data,'amount');
 IF qty=0 AND amount_value<>0 THEN RAISE EXCEPTION 'finance_cost_quantity_invalid' USING ERRCODE='22023';END IF;
 INSERT INTO public.finance_stock_cost(product_variant_id,quantity,total_cost,verified_at,reference) VALUES(variant,qty,amount_value,clock_timestamp(),btrim(p_data->>'reference'))
 ON CONFLICT(product_variant_id) DO UPDATE SET quantity=EXCLUDED.quantity,total_cost=EXCLUDED.total_cost,verified_at=EXCLUDED.verified_at,reference=EXCLUDED.reference,updated_at=clock_timestamp();
 RETURN variant;
END $$;

CREATE OR REPLACE FUNCTION pawpal_private.finance_capture_revenue(p_kind text,p_id uuid,p_initial boolean DEFAULT false,p_reference text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE amount_value numeric;finished timestamptz;state public.finance_revenue_source;
BEGIN
 IF p_kind='order' THEN
  PERFORM 1 FROM public.sales_order WHERE id=p_id FOR UPDATE;
  SELECT o.delivered_at,t.total_amount INTO finished,amount_value FROM public.sales_order o JOIN public.sales_order_totals t ON t.order_id=o.id WHERE o.id=p_id AND o.delivered_at IS NOT NULL;
 ELSE
  PERFORM 1 FROM public.appointment WHERE id=p_id FOR UPDATE;
  SELECT a.check_out_time,t.total_price INTO finished,amount_value FROM public.appointment a JOIN public.appointment_totals t ON t.appointment_id=a.id WHERE a.id=p_id AND a.check_out_time IS NOT NULL;
 END IF;
 IF finished IS NULL OR NOT isfinite(finished) OR amount_value IS NULL OR amount_value::text IN('NaN','Infinity','-Infinity') THEN RETURN;END IF;
 SELECT * INTO state FROM public.finance_revenue_source WHERE kind=p_kind AND record_id=p_id FOR UPDATE;
 IF NOT FOUND THEN
  IF NOT p_initial THEN RETURN;END IF;
  INSERT INTO public.finance_revenue_source(kind,record_id,total,first_at,reference) VALUES(p_kind,p_id,amount_value,finished,p_reference);
  INSERT INTO public.finance_revenue_event(kind,record_id,amount_delta,recognized_at) VALUES(p_kind,p_id,amount_value,finished);
 ELSIF state.total<>amount_value THEN
  INSERT INTO public.finance_revenue_event(kind,record_id,amount_delta,recognized_at) VALUES(p_kind,p_id,amount_value-state.total,clock_timestamp());
  UPDATE public.finance_revenue_source SET total=amount_value,updated_at=clock_timestamp() WHERE kind=p_kind AND record_id=p_id;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION pawpal_private.finance_revenue_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE new_row jsonb:=CASE WHEN TG_OP='DELETE' THEN '{}'::jsonb ELSE to_jsonb(NEW) END;old_row jsonb:=CASE WHEN TG_OP='INSERT' THEN '{}'::jsonb ELSE to_jsonb(OLD) END;record_id uuid;initial boolean:=false;
BEGIN
 IF TG_TABLE_NAME='sales_order' THEN
  record_id:=(new_row->>'id')::uuid;initial:=new_row->>'delivered_at' IS NOT NULL AND old_row->>'delivered_at' IS NULL;
  PERFORM pawpal_private.finance_capture_revenue('order',record_id,initial);
 ELSIF TG_TABLE_NAME='appointment' THEN
  record_id:=(new_row->>'id')::uuid;initial:=new_row->>'check_out_time' IS NOT NULL AND old_row->>'check_out_time' IS NULL;
  PERFORM pawpal_private.finance_capture_revenue('appointment',record_id,initial);
 ELSE
  FOR record_id IN SELECT DISTINCT value::uuid FROM (VALUES(new_row->>'order_id'),(old_row->>'order_id')) x(value) WHERE value IS NOT NULL LOOP PERFORM pawpal_private.finance_capture_revenue('order',record_id);END LOOP;
  FOR record_id IN SELECT DISTINCT value::uuid FROM (VALUES(new_row->>'appointment_id'),(old_row->>'appointment_id')) x(value) WHERE value IS NOT NULL LOOP PERFORM pawpal_private.finance_capture_revenue('appointment',record_id);END LOOP;
 END IF;
 RETURN NULL;
END $$;
DO $$ DECLARE t text;BEGIN
 FOREACH t IN ARRAY ARRAY['sales_order','appointment','sales_order_detail','appointment_item','appointment_adjustment','voucher_redemption'] LOOP
  EXECUTE format('CREATE TRIGGER finance_revenue_capture AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION pawpal_private.finance_revenue_trigger()',t);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.finance_cost_step(integer,numeric,integer,numeric),pawpal_private.finance_capture_stock(),pawpal_private.finance_stock_opening(jsonb,uuid,timestamptz),pawpal_private.finance_confirm_sale_cost(jsonb,uuid,timestamptz),pawpal_private.finance_capture_revenue(text,uuid,boolean,text),pawpal_private.finance_revenue_trigger() FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
