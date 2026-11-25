BEGIN;

-- 1. Set eligible_spend_amount on cashier collection when the service/order is already completed/delivered.
DO $patch$
DECLARE
    kind text;
    prefix text;
    tx_type text;
    idemp text;
    finish_expr text;
    signature text;
    body text;
    old_anchor text;
    new_anchor text;
BEGIN
    FOREACH kind IN ARRAY ARRAY['service', 'sales'] LOOP
        IF kind = 'service' THEN
            prefix := 'SV-PAY-';
            tx_type := 'service_collection';
            idemp := 'service-collect:';
            finish_expr := 'CASE WHEN a.appointment_status=''completed'' THEN amount_value ELSE 0 END';
        ELSE
            prefix := 'SO-PAY-';
            tx_type := 'sale_collection';
            idemp := 'sales-collect:';
            finish_expr := 'CASE WHEN a.order_status IN (''completed'',''delivered'') THEN amount_value ELSE 0 END';
        END IF;

        signature := 'public.post_admin_' || kind || '_money(uuid,uuid,text,text,jsonb)';
        body := pg_get_functiondef(signature::regprocedure);

        old_anchor := 'VALUES(p_request_id,''' || prefix || '''||p_request_id,a.customer_id,method.id,''' || tx_type || ''',amount_value,''succeeded'',clock_timestamp(),receipt,''' || idemp || '''||p_request_id,a.id,0);';
        new_anchor := 'VALUES(p_request_id,''' || prefix || '''||p_request_id,a.customer_id,method.id,''' || tx_type || ''',amount_value,''succeeded'',clock_timestamp(),receipt,''' || idemp || '''||p_request_id,a.id,' || finish_expr || ');';

        IF strpos(body, new_anchor) > 0 THEN
            CONTINUE;
        END IF;
        IF strpos(body, old_anchor) = 0 THEN
            RAISE EXCEPTION 'cashier_collect_eligible_anchor_missing: %', kind;
        END IF;

        body := replace(body, old_anchor, new_anchor);
        EXECUTE body;
    END LOOP;
END $patch$;

-- 2. Promote eligible_spend_amount when an order or appointment finishes after payment was collected.
CREATE OR REPLACE FUNCTION pawpal_private.sync_eligible_spend_on_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    IF TG_TABLE_NAME = 'sales_order' THEN
        IF NEW.order_status IN ('completed', 'delivered') AND OLD.order_status IS DISTINCT FROM NEW.order_status THEN
            UPDATE public.payment p
            SET eligible_spend_amount = p.amount
            WHERE p.order_id = NEW.id
              AND p.transaction_status = 'succeeded'
              AND p.eligible_spend_amount = 0
              AND p.amount > 0
              AND NOT EXISTS (SELECT 1 FROM public.refund_transaction r WHERE r.payment_id = p.id);
        END IF;
    ELSIF TG_TABLE_NAME = 'appointment' THEN
        IF NEW.appointment_status = 'completed' AND OLD.appointment_status IS DISTINCT FROM NEW.appointment_status THEN
            UPDATE public.payment p
            SET eligible_spend_amount = p.amount
            WHERE p.appointment_id = NEW.id
              AND p.transaction_status = 'succeeded'
              AND p.eligible_spend_amount = 0
              AND p.amount > 0
              AND NOT EXISTS (SELECT 1 FROM public.refund_transaction r WHERE r.payment_id = p.id);
        END IF;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS v1_sync_eligible_spend_on_order_complete ON public.sales_order;
CREATE TRIGGER v1_sync_eligible_spend_on_order_complete
    AFTER UPDATE OF order_status ON public.sales_order
    FOR EACH ROW
    EXECUTE FUNCTION pawpal_private.sync_eligible_spend_on_completion();

DROP TRIGGER IF EXISTS v1_sync_eligible_spend_on_appointment_complete ON public.appointment;
CREATE TRIGGER v1_sync_eligible_spend_on_appointment_complete
    AFTER UPDATE OF appointment_status ON public.appointment
    FOR EACH ROW
    EXECUTE FUNCTION pawpal_private.sync_eligible_spend_on_completion();

-- 3. Backfill historical succeeded payments whose order/appointment is already completed/delivered and unrefunded.
UPDATE public.payment p
SET eligible_spend_amount = p.amount
WHERE p.transaction_status = 'succeeded'
  AND p.eligible_spend_amount = 0
  AND p.amount > 0
  AND p.payment_type IN ('service_collection', 'sale_collection', 'full')
  AND NOT EXISTS (
      SELECT 1
      FROM public.refund_transaction r
      WHERE r.payment_id = p.id
  )
  AND (
      EXISTS (
          SELECT 1 FROM public.sales_order o
          WHERE o.id = p.order_id AND o.order_status IN ('completed', 'delivered')
      )
      OR EXISTS (
          SELECT 1 FROM public.appointment a
          WHERE a.id = p.appointment_id AND a.appointment_status = 'completed'
      )
  );

NOTIFY pgrst, 'reload schema';
COMMIT;
