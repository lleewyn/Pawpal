SET search_path=public,extensions,pg_catalog;
CREATE OR REPLACE FUNCTION pawpal_private.validate_voucher_use() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v public.voucher; cv public.customer_voucher; owner_id uuid; used integer;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.voucher_id,NEW.customer_voucher_id,NEW.order_id,NEW.appointment_id) IS DISTINCT FROM (OLD.voucher_id,OLD.customer_voucher_id,OLD.order_id,OLD.appointment_id) THEN RAISE EXCEPTION 'Voucher use source is immutable'; END IF;
 SELECT * INTO v FROM public.voucher WHERE id=NEW.voucher_id FOR UPDATE;
 IF NEW.order_id IS NOT NULL THEN SELECT customer_id INTO owner_id FROM public.sales_order WHERE id=NEW.order_id FOR UPDATE;
 ELSE SELECT customer_id INTO owner_id FROM public.appointment WHERE id=NEW.appointment_id FOR UPDATE; END IF;
 IF NEW.customer_voucher_id IS NOT NULL THEN
  SELECT * INTO cv FROM public.customer_voucher WHERE id=NEW.customer_voucher_id FOR UPDATE;
  IF cv.voucher_id IS DISTINCT FROM v.id OR cv.customer_id IS DISTINCT FROM owner_id THEN RAISE EXCEPTION 'Voucher issue owner or template mismatch'; END IF;
  IF NEW.status='applied' AND (cv.voucher_status<>'available' OR cv.expired_at<=now()) THEN RAISE EXCEPTION 'Issued voucher is not available'; END IF;
 END IF;
 IF NEW.status='applied' THEN
  IF NOT v.is_active OR CURRENT_DATE NOT BETWEEN v.start_date AND v.end_date THEN RAISE EXCEPTION 'Voucher is not effective'; END IF;
  SELECT count(*) INTO used FROM public.voucher_redemption WHERE voucher_id=v.id AND status='applied' AND id<>NEW.id;
  IF v.max_usage IS NOT NULL AND used>=v.max_usage THEN RAISE EXCEPTION 'Voucher usage limit reached' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER v1_voucher_use BEFORE INSERT OR UPDATE ON public.voucher_redemption FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_voucher_use();

CREATE OR REPLACE FUNCTION pawpal_private.validate_return_line() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE source public.sales_order_detail; returned integer;
BEGIN
 SELECT * INTO source FROM public.sales_order_detail WHERE id=NEW.sales_order_detail_id FOR UPDATE;
 IF NOT EXISTS(SELECT 1 FROM public.return_request WHERE id=NEW.return_request_id AND sales_order_id=source.order_id) THEN RAISE EXCEPTION 'Return line does not belong to order'; END IF;
 SELECT coalesce(sum(d.quantity),0) INTO returned FROM public.return_request_detail d JOIN public.return_request r ON r.id=d.return_request_id
 WHERE d.sales_order_detail_id=source.id AND d.id<>NEW.id AND r.request_status NOT IN ('cancelled','rejected');
 IF returned+NEW.quantity>source.quantity THEN RAISE EXCEPTION 'Returned quantity exceeds sold quantity' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER v1_return_line BEFORE INSERT OR UPDATE ON public.return_request_detail FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_return_line();

CREATE OR REPLACE FUNCTION pawpal_private.validate_review() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; completed boolean;
BEGIN
 IF NEW.sales_order_detail_id IS NOT NULL THEN
  SELECT o.customer_id,o.order_status IN ('completed','delivered') INTO owner_id,completed FROM public.sales_order_detail d JOIN public.sales_order o ON o.id=d.order_id WHERE d.id=NEW.sales_order_detail_id;
 ELSE
  SELECT a.customer_id,a.appointment_status='completed' AND i.status='completed' INTO owner_id,completed FROM public.appointment_item i JOIN public.appointment a ON a.id=i.appointment_id WHERE i.id=NEW.appointment_item_id;
 END IF;
 IF NOT coalesce(completed,false) THEN RAISE EXCEPTION 'Review requires completed purchase/service'; END IF;
 IF auth.role()='authenticated' AND NOT pawpal_private.owns_customer(owner_id) AND NOT pawpal_private.has_permission('review.write') THEN RAISE EXCEPTION 'Review customer mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER v1_review BEFORE INSERT OR UPDATE ON public.review FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_review();

CREATE OR REPLACE FUNCTION pawpal_private.lock_reservation_variant() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE stock integer; held integer;
BEGIN
 IF TG_OP='UPDATE' AND NEW.product_variant_id<>OLD.product_variant_id THEN RAISE EXCEPTION 'Reservation variant cannot change'; END IF;
 PERFORM 1 FROM public.product_variant WHERE id=NEW.product_variant_id FOR UPDATE;
 IF NEW.status='active' AND NEW.expires_at>now() THEN
  SELECT coalesce(sum(quantity),0) INTO stock FROM public.inventory_transaction WHERE product_variant_id=NEW.product_variant_id;
  SELECT coalesce(sum(quantity),0) INTO held FROM public.stock_reservation WHERE product_variant_id=NEW.product_variant_id AND status='active' AND expires_at>now() AND id<>NEW.id;
  IF held+NEW.quantity>stock THEN RAISE EXCEPTION 'Insufficient available stock' USING ERRCODE='23514'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER v1_stock_reservation BEFORE INSERT OR UPDATE ON public.stock_reservation FOR EACH ROW EXECUTE FUNCTION pawpal_private.lock_reservation_variant();

CREATE OR REPLACE FUNCTION pawpal_private.record_inventory() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE balance integer; held integer; source_variant uuid; max_qty integer; received integer;
BEGIN
 PERFORM 1 FROM public.product_variant WHERE id=NEW.product_variant_id FOR UPDATE;
 IF NEW.purchase_order_detail_id IS NOT NULL THEN
  SELECT product_variant_id,quantity INTO source_variant,max_qty FROM public.purchase_order_detail WHERE id=NEW.purchase_order_detail_id;
  IF source_variant IS DISTINCT FROM NEW.product_variant_id THEN RAISE EXCEPTION 'Receipt variant mismatch'; END IF;
  SELECT coalesce(sum(quantity),0) INTO received FROM public.inventory_transaction WHERE purchase_order_detail_id=NEW.purchase_order_detail_id;
  IF received+NEW.quantity>max_qty OR received+NEW.quantity<0 THEN RAISE EXCEPTION 'Receipt quantity exceeds purchase'; END IF;
 END IF;
 IF NEW.sales_order_detail_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sales_order_detail WHERE id=NEW.sales_order_detail_id AND product_variant_id=NEW.product_variant_id) THEN RAISE EXCEPTION 'Issue variant mismatch'; END IF;
 IF NEW.return_request_detail_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.return_request_detail r JOIN public.sales_order_detail d ON d.id=r.sales_order_detail_id WHERE r.id=NEW.return_request_detail_id AND d.product_variant_id=NEW.product_variant_id) THEN RAISE EXCEPTION 'Restock variant mismatch'; END IF;
 SELECT coalesce(sum(quantity),0) INTO balance FROM public.inventory_transaction WHERE product_variant_id=NEW.product_variant_id;
 SELECT coalesce(sum(quantity),0) INTO held FROM public.stock_reservation WHERE product_variant_id=NEW.product_variant_id AND status='active' AND expires_at>now();
 IF balance+NEW.quantity<held THEN RAISE EXCEPTION 'Stock would be negative or below reservations' USING ERRCODE='23514'; END IF;
 INSERT INTO public.inventory(product_variant_id,quantity_in_stock,minimum_stock,last_updated_at) VALUES(NEW.product_variant_id,balance+NEW.quantity,0,now())
 ON CONFLICT(product_variant_id) DO UPDATE SET quantity_in_stock=excluded.quantity_in_stock,last_updated_at=excluded.last_updated_at;
 RETURN NEW;
END $$;
CREATE TRIGGER v1_inventory BEFORE INSERT ON public.inventory_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.record_inventory();

CREATE OR REPLACE FUNCTION pawpal_private.protect_signed_record() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF OLD.customer_confirmation_status='confirmed' THEN RAISE EXCEPTION 'Confirmed record is immutable; create a new revision'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER v1_signed_record BEFORE UPDATE OR DELETE ON public.appointment_record FOR EACH ROW EXECUTE FUNCTION pawpal_private.protect_signed_record();

CREATE OR REPLACE FUNCTION pawpal_private.audit_money() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE actor uuid; obj jsonb;
BEGIN
 SELECT id INTO actor FROM public.staff WHERE auth_user_id=auth.uid() AND employment_status='active';
 obj:=to_jsonb(NEW);
 INSERT INTO public.audit_log(staff_id,action,entity_name,entity_id,description)
 VALUES(actor,TG_OP,TG_TABLE_NAME,(obj->>'id')::uuid,'Financial/ledger event recorded in the same transaction');
 RETURN NEW;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['payment','refund_transaction','paw_point_transaction','inventory_transaction','voucher_redemption'] LOOP
  EXECUTE format('CREATE TRIGGER v1_audit_event AFTER INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION pawpal_private.audit_money()',t);
 END LOOP;
END $$;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pawpal_private FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION pawpal_private.has_permission(text),pawpal_private.owns_customer(uuid) TO authenticated;
