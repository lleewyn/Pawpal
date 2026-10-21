-- Run after 001_schema.sql in the SAME deployment transaction.
SET search_path=public,extensions,pg_catalog;

CREATE OR REPLACE FUNCTION pawpal_private.touch_updated_at() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;

CREATE OR REPLACE FUNCTION pawpal_private.has_permission(required_code text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(
  SELECT 1 FROM public.staff s JOIN auth.users u ON u.id=s.auth_user_id
  WHERE s.auth_user_id=auth.uid() AND s.employment_status='active'
    AND NOT s.must_change_password AND (u.banned_until IS NULL OR u.banned_until<=now())
    AND (EXISTS(SELECT 1 FROM public.staff_role sr JOIN public.role_permission rp ON rp.role_code=sr.role_code
                WHERE sr.staff_id=s.id AND rp.permission_code=required_code)
      OR EXISTS(SELECT 1 FROM public.staff_permission sp WHERE sp.staff_id=s.id AND sp.permission_code=required_code))
 );
$$;
CREATE OR REPLACE FUNCTION pawpal_private.owns_customer(target uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public AS $$
 SELECT EXISTS(SELECT 1 FROM public.customer c JOIN auth.users u ON u.id=c.auth_user_id
 WHERE c.id=target AND c.auth_user_id=auth.uid() AND c.customer_status='active'
 AND (u.banned_until IS NULL OR u.banned_until<=now()));
$$;

-- An Auth identity cannot be assigned to both portals, including concurrent writes.
CREATE OR REPLACE FUNCTION pawpal_private.check_portal_identity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF NEW.auth_user_id IS NULL THEN RETURN NEW; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.auth_user_id::text,7351));
 IF TG_TABLE_NAME='customer' AND EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=NEW.auth_user_id)
 OR TG_TABLE_NAME='staff' AND EXISTS(SELECT 1 FROM public.customer WHERE auth_user_id=NEW.auth_user_id) THEN
  RAISE EXCEPTION 'Auth identity already belongs to another portal' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER v1_portal_identity BEFORE INSERT OR UPDATE OF auth_user_id ON public.customer FOR EACH ROW EXECUTE FUNCTION pawpal_private.check_portal_identity();
CREATE TRIGGER v1_portal_identity BEFORE INSERT OR UPDATE OF auth_user_id ON public.staff FOR EACH ROW EXECUTE FUNCTION pawpal_private.check_portal_identity();

-- Lock the parent before contact writes; a deferred constraint enforces exactly one.
CREATE OR REPLACE FUNCTION pawpal_private.lock_contact_parent() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='UPDATE' AND NEW.customer_id<>OLD.customer_id THEN RAISE EXCEPTION 'Contact owner cannot be changed'; END IF;
 PERFORM 1 FROM public.customer WHERE id=CASE WHEN TG_OP='DELETE' THEN OLD.customer_id ELSE NEW.customer_id END FOR UPDATE;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE OR REPLACE FUNCTION pawpal_private.check_contact_default() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; total_count integer; selected_count integer;
BEGIN
 owner_id:=CASE WHEN TG_OP='DELETE' THEN OLD.customer_id ELSE NEW.customer_id END;
 IF TG_TABLE_NAME='customer_phone' THEN
  SELECT count(*),count(*) FILTER(WHERE is_primary) INTO total_count,selected_count FROM public.customer_phone WHERE customer_id=owner_id;
 ELSE
  SELECT count(*),count(*) FILTER(WHERE is_default) INTO total_count,selected_count FROM public.customer_address WHERE customer_id=owner_id;
 END IF;
 IF total_count>0 AND selected_count<>1 THEN RAISE EXCEPTION '% requires exactly one primary/default',TG_TABLE_NAME USING ERRCODE='23514'; END IF;
 RETURN NULL;
END $$;
CREATE TRIGGER v1_lock_contact BEFORE INSERT OR UPDATE OR DELETE ON public.customer_phone FOR EACH ROW EXECUTE FUNCTION pawpal_private.lock_contact_parent();
CREATE TRIGGER v1_lock_contact BEFORE INSERT OR UPDATE OR DELETE ON public.customer_address FOR EACH ROW EXECUTE FUNCTION pawpal_private.lock_contact_parent();
CREATE CONSTRAINT TRIGGER v1_contact_default AFTER INSERT OR UPDATE OR DELETE ON public.customer_phone DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pawpal_private.check_contact_default();
CREATE CONSTRAINT TRIGGER v1_contact_default AFTER INSERT OR UPDATE OR DELETE ON public.customer_address DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pawpal_private.check_contact_default();

CREATE OR REPLACE FUNCTION pawpal_private.validate_appointment_owner() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
BEGIN
 IF TG_OP='INSERT' OR (NEW.pet_id,NEW.customer_id) IS DISTINCT FROM (OLD.pet_id,OLD.customer_id) THEN
  IF NOT EXISTS(SELECT 1 FROM public.pet_profile WHERE id=NEW.pet_id AND customer_id=NEW.customer_id FOR SHARE) THEN
   RAISE EXCEPTION 'Appointment pet does not belong to booking customer' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER v1_appointment_owner BEFORE INSERT OR UPDATE ON public.appointment FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_appointment_owner();

-- Public derived values never duplicate writable core columns.
CREATE VIEW public.pet_current_weight WITH (security_invoker=true) AS
 SELECT DISTINCT ON (pet_id) pet_id,weight,measured_at,id AS measurement_id
 FROM public.pet_weight_history ORDER BY pet_id,measured_at DESC,created_at DESC,id DESC;
CREATE VIEW public.customer_point_balance WITH (security_invoker=true) AS
 SELECT c.id AS customer_id,coalesce(sum(p.points),0)::bigint AS total_paw_points
 FROM public.customer c LEFT JOIN public.paw_point_transaction p ON p.customer_id=c.id GROUP BY c.id;
CREATE VIEW public.customer_eligible_spend WITH (security_invoker=true) AS
 SELECT c.id AS customer_id,
 coalesce((SELECT sum(p.eligible_spend_amount) FROM public.payment p WHERE p.customer_id=c.id AND p.transaction_status='succeeded'),0)
 -coalesce((SELECT sum(r.eligible_refund_amount) FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE p.customer_id=c.id AND r.refund_status='succeeded'),0) AS eligible_spend
 FROM public.customer c;
CREATE VIEW public.sales_order_totals WITH (security_invoker=true) AS
 SELECT o.id AS order_id,greatest(0,coalesce((SELECT sum(d.quantity*d.unit_price-d.discount_amount) FROM public.sales_order_detail d WHERE d.order_id=o.id),0)
 +o.shipping_fee_snapshot-coalesce((SELECT sum(v.discount_amount_snapshot) FROM public.voucher_redemption v WHERE v.order_id=o.id AND v.status='applied'),0)) AS total_amount
 FROM public.sales_order o;
CREATE VIEW public.appointment_totals WITH (security_invoker=true) AS
 SELECT a.id AS appointment_id,greatest(0,
 coalesce((SELECT sum(i.quantity*i.unit_price-i.discount_amount) FROM public.appointment_item i WHERE i.appointment_id=a.id AND i.status<>'cancelled'),0)
 +coalesce((SELECT sum(j.amount_delta) FROM public.appointment_adjustment j WHERE j.appointment_id=a.id AND j.approval_status='approved' AND j.customer_consent_status='confirmed'),0)
 -coalesce((SELECT sum(v.discount_amount_snapshot) FROM public.voucher_redemption v WHERE v.appointment_id=a.id AND v.status='applied'),0)) AS total_price
 FROM public.appointment a;
CREATE VIEW public.staff_public_view WITH (security_invoker=true) AS
 SELECT id,full_name,job_title,specialization,staff_level_id FROM public.staff WHERE employment_status='active';

-- Lock the document and check net collected against its amount due.
CREATE OR REPLACE FUNCTION pawpal_private.check_document_money(order_key uuid,appointment_key uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE due numeric; collected numeric; eligible numeric;
BEGIN
 IF order_key IS NOT NULL THEN
  PERFORM 1 FROM public.sales_order WHERE id=order_key FOR UPDATE;
  SELECT total_amount INTO due FROM public.sales_order_totals WHERE order_id=order_key;
 ELSE
  PERFORM 1 FROM public.appointment WHERE id=appointment_key FOR UPDATE;
  SELECT total_price INTO due FROM public.appointment_totals WHERE appointment_id=appointment_key;
 END IF;
 SELECT coalesce(sum(p.amount-coalesce((SELECT sum(r.refunded_amount) FROM public.refund_transaction r WHERE r.payment_id=p.id AND r.refund_status='succeeded'),0)),0),
 coalesce(sum(p.eligible_spend_amount-coalesce((SELECT sum(r.eligible_refund_amount) FROM public.refund_transaction r WHERE r.payment_id=p.id AND r.refund_status='succeeded'),0)),0)
 INTO collected,eligible FROM public.payment p WHERE p.transaction_status='succeeded'
 AND (p.order_id=order_key OR p.appointment_id=appointment_key);
 IF collected>coalesce(due,0) OR collected<0 OR eligible<0 THEN RAISE EXCEPTION 'Collected or eligible amount exceeds document balance' USING ERRCODE='23514'; END IF;
END $$;

CREATE OR REPLACE FUNCTION pawpal_private.validate_payment() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE source_customer uuid; finished boolean;
BEGIN
 IF TG_OP='UPDATE' AND (NEW.customer_id,NEW.order_id,NEW.appointment_id) IS DISTINCT FROM (OLD.customer_id,OLD.order_id,OLD.appointment_id) THEN RAISE EXCEPTION 'Payment source is immutable'; END IF;
 IF NEW.order_id IS NOT NULL THEN
  SELECT customer_id,order_status IN ('completed','delivered') INTO source_customer,finished FROM public.sales_order WHERE id=NEW.order_id FOR UPDATE;
 ELSE
  SELECT customer_id,appointment_status='completed' INTO source_customer,finished FROM public.appointment WHERE id=NEW.appointment_id FOR UPDATE;
 END IF;
 IF source_customer IS DISTINCT FROM NEW.customer_id THEN RAISE EXCEPTION 'Payment customer mismatch' USING ERRCODE='23514'; END IF;
 IF NEW.eligible_spend_amount>0 AND NOT coalesce(finished,false) THEN RAISE EXCEPTION 'Eligible spend requires completed delivery/service'; END IF;
 IF TG_OP='UPDATE' AND OLD.transaction_status='succeeded' AND
 (NEW.amount,NEW.transaction_status,NEW.succeeded_at,NEW.gateway_transaction_id,NEW.idempotency_key) IS DISTINCT FROM
 (OLD.amount,OLD.transaction_status,OLD.succeeded_at,OLD.gateway_transaction_id,OLD.idempotency_key) THEN
 RAISE EXCEPTION 'Posted payment cannot be overwritten'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER v1_validate_payment BEFORE INSERT OR UPDATE ON public.payment FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_payment();
CREATE OR REPLACE FUNCTION pawpal_private.validate_refund() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE p public.payment; refunded numeric; eligible numeric;
BEGIN
 SELECT * INTO p FROM public.payment WHERE id=NEW.payment_id FOR UPDATE;
 IF p.transaction_status<>'succeeded' THEN RAISE EXCEPTION 'Refund requires successful payment'; END IF;
 IF NEW.return_request_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.return_request WHERE id=NEW.return_request_id AND sales_order_id=p.order_id) THEN RAISE EXCEPTION 'Return does not belong to payment order'; END IF;
 IF NEW.ticket_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.support_ticket WHERE id=NEW.ticket_id AND customer_id=p.customer_id) THEN RAISE EXCEPTION 'Refund ticket customer mismatch'; END IF;
 IF TG_OP='UPDATE' AND OLD.refund_status='succeeded' THEN RAISE EXCEPTION 'Posted refund is immutable'; END IF;
 SELECT coalesce(sum(refunded_amount),0),coalesce(sum(eligible_refund_amount),0) INTO refunded,eligible FROM public.refund_transaction WHERE payment_id=p.id AND refund_status='succeeded' AND id<>NEW.id;
 IF NEW.refund_status='succeeded' AND (refunded+NEW.refunded_amount>p.amount OR eligible+NEW.eligible_refund_amount>p.eligible_spend_amount) THEN RAISE EXCEPTION 'Refund exceeds payment or eligible spend' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER v1_validate_refund BEFORE INSERT OR UPDATE ON public.refund_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_refund();

CREATE OR REPLACE FUNCTION pawpal_private.deferred_money_check() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE obj jsonb; order_key uuid; appointment_key uuid;
BEGIN
 obj:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF TG_TABLE_NAME='sales_order' THEN order_key:=(obj->>'id')::uuid;
 ELSIF TG_TABLE_NAME='appointment' THEN appointment_key:=(obj->>'id')::uuid;
 ELSIF TG_TABLE_NAME='refund_transaction' THEN SELECT order_id,appointment_id INTO order_key,appointment_key FROM public.payment WHERE id=(obj->>'payment_id')::uuid;
 ELSE order_key:=(obj->>'order_id')::uuid;appointment_key:=(obj->>'appointment_id')::uuid;
 END IF;
 PERFORM pawpal_private.check_document_money(order_key,appointment_key);
 RETURN NULL;
END $$;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['sales_order','appointment','sales_order_detail','appointment_item','appointment_adjustment','voucher_redemption','payment','refund_transaction'] LOOP
 EXECUTE format('CREATE CONSTRAINT TRIGGER v1_money_check AFTER INSERT OR UPDATE OR DELETE ON public.%I DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION pawpal_private.deferred_money_check()',t);
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION pawpal_private.immutable_event() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'Posted ledger/audit rows are immutable; append a correction'; END $$;
CREATE TRIGGER v1_immutable BEFORE UPDATE OR DELETE ON public.paw_point_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.immutable_event();
CREATE TRIGGER v1_immutable BEFORE UPDATE OR DELETE ON public.inventory_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.immutable_event();
CREATE TRIGGER v1_immutable BEFORE UPDATE OR DELETE ON public.audit_log FOR EACH ROW EXECUTE FUNCTION pawpal_private.immutable_event();
CREATE OR REPLACE FUNCTION pawpal_private.protect_payment_delete() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF (TG_TABLE_NAME='payment' AND to_jsonb(OLD)->>'transaction_status'='succeeded') OR (TG_TABLE_NAME='refund_transaction' AND to_jsonb(OLD)->>'refund_status'='succeeded') THEN RAISE EXCEPTION 'Cannot delete posted money'; END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER v1_posted_delete BEFORE DELETE ON public.payment FOR EACH ROW EXECUTE FUNCTION pawpal_private.protect_payment_delete();
CREATE TRIGGER v1_posted_delete BEFORE DELETE ON public.refund_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.protect_payment_delete();

CREATE OR REPLACE FUNCTION pawpal_private.validate_points() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE balance bigint; expected_seq bigint; source_customer uuid;
BEGIN
 PERFORM 1 FROM public.customer WHERE id=NEW.customer_id FOR UPDATE;
 SELECT coalesce(sum(points),0),coalesce(max(sequence_no),0)+1 INTO balance,expected_seq FROM public.paw_point_transaction WHERE customer_id=NEW.customer_id;
 IF NEW.points=0 OR balance+NEW.points<0 OR NEW.sequence_no<>expected_seq THEN RAISE EXCEPTION 'Invalid point sequence or insufficient balance' USING ERRCODE='23514'; END IF;
 IF NEW.payment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.payment WHERE id=NEW.payment_id AND customer_id=NEW.customer_id AND transaction_status='succeeded') THEN RAISE EXCEPTION 'Points payment source mismatch'; END IF;
 IF NEW.refund_transaction_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE r.id=NEW.refund_transaction_id AND p.customer_id=NEW.customer_id AND r.refund_status='succeeded') THEN RAISE EXCEPTION 'Points refund source mismatch'; END IF;
 IF NEW.customer_voucher_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.customer_voucher WHERE id=NEW.customer_voucher_id AND customer_id=NEW.customer_id) THEN RAISE EXCEPTION 'Points voucher owner mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER v1_points BEFORE INSERT ON public.paw_point_transaction FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_points();

CREATE OR REPLACE FUNCTION pawpal_private.validate_ticket() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$ BEGIN
 IF NEW.order_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.sales_order WHERE id=NEW.order_id AND customer_id=NEW.customer_id) THEN RAISE EXCEPTION 'Ticket order customer mismatch'; END IF;
 IF NEW.appointment_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.appointment WHERE id=NEW.appointment_id AND customer_id=NEW.customer_id) THEN RAISE EXCEPTION 'Ticket appointment customer mismatch'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER v1_ticket BEFORE INSERT OR UPDATE ON public.support_ticket FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_ticket();

CREATE OR REPLACE FUNCTION pawpal_private.validate_message_sender() RETURNS trigger
LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF NEW.sender_type IN ('system','bot') THEN
  IF num_nonnulls(NEW.sender_account_id,NEW.sender_guest_session_id)<>0 THEN RAISE EXCEPTION 'Bot/system cannot impersonate sender'; END IF;
 ELSIF NEW.sender_type IN ('customer','staff','guest') THEN
  IF num_nonnulls(NEW.sender_account_id,NEW.sender_guest_session_id)<>1 OR (NEW.sender_type='guest')<>(NEW.sender_guest_session_id IS NOT NULL) THEN RAISE EXCEPTION 'Sender identity mismatch'; END IF;
 ELSE RAISE EXCEPTION 'Unknown sender type'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER v1_sender BEFORE INSERT OR UPDATE ON public.chat_message FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_message_sender();
CREATE TRIGGER v1_sender BEFORE INSERT OR UPDATE ON public.support_ticket_message FOR EACH ROW EXECUTE FUNCTION pawpal_private.validate_message_sender();

CREATE OR REPLACE FUNCTION pawpal_private.audit_actor() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$ BEGIN
 IF auth.role()='authenticated' THEN
  SELECT id INTO NEW.staff_id FROM public.staff WHERE auth_user_id=auth.uid() AND employment_status='active' AND NOT must_change_password;
  IF NEW.staff_id IS NULL THEN RAISE EXCEPTION 'Audit actor requires active staff'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER v1_actor BEFORE INSERT ON public.audit_log FOR EACH ROW EXECUTE FUNCTION pawpal_private.audit_actor();

-- Fine-grained permissions default to deny. Only ADMIN is initially assigned.
INSERT INTO public.access_role(code,role_name) VALUES('ADMIN','Quản trị viên');
DO $$ DECLARE t record; action_name text; BEGIN
 FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
  FOREACH action_name IN ARRAY ARRAY['read','write'] LOOP
   INSERT INTO public.permission(code,description) VALUES(t.tablename||'.'||action_name,t.tablename||': '||action_name);
   INSERT INTO public.role_permission(role_code,permission_code) VALUES('ADMIN',t.tablename||'.'||action_name);
  END LOOP;
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t.tablename);
  EXECUTE format('CREATE POLICY v1_read ON public.%I FOR SELECT TO authenticated USING(pawpal_private.has_permission(%L))',t.tablename,t.tablename||'.read');
  -- Ledgers/money/inventory are server transactions, not independent client writes.
  IF t.tablename NOT IN ('payment','refund_transaction','paw_point_transaction','inventory','inventory_transaction','stock_reservation','voucher_redemption') THEN
   EXECUTE format('GRANT INSERT,UPDATE,DELETE ON public.%I TO authenticated',t.tablename);
   EXECUTE format('CREATE POLICY v1_insert ON public.%I FOR INSERT TO authenticated WITH CHECK(pawpal_private.has_permission(%L))',t.tablename,t.tablename||'.write');
   IF t.tablename<>'audit_log' THEN
    EXECUTE format('CREATE POLICY v1_update ON public.%I FOR UPDATE TO authenticated USING(pawpal_private.has_permission(%L)) WITH CHECK(pawpal_private.has_permission(%L))',t.tablename,t.tablename||'.write',t.tablename||'.write');
    EXECUTE format('CREATE POLICY v1_delete ON public.%I FOR DELETE TO authenticated USING(pawpal_private.has_permission(%L))',t.tablename,t.tablename||'.write');
   ELSE EXECUTE 'REVOKE UPDATE,DELETE ON public.audit_log FROM authenticated'; END IF;
  END IF;
  IF EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t.tablename AND column_name='updated_at') THEN
   EXECUTE format('CREATE TRIGGER v1_updated BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION pawpal_private.touch_updated_at()',t.tablename);
  END IF;
  -- Publication filtering uses the same RLS policies at delivery.
  IF t.tablename NOT IN ('guest_session','permission','access_role','role_permission','staff_role','staff_permission','document_embeddings','chat_message','chat_moderation_log','admin_copilot_history') THEN
   EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I',t.tablename);
  END IF;
 END LOOP;
END $$;
CREATE POLICY own_customer ON public.customer FOR SELECT TO authenticated USING(pawpal_private.owns_customer(id));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['customer_profile','customer_phone','customer_address','customer_membership','paw_point_transaction','sales_order','payment','pet_profile','notification','wishlist','cart','customer_voucher'] LOOP
  EXECUTE format('CREATE POLICY own_customer ON public.%I FOR SELECT TO authenticated USING(pawpal_private.owns_customer(customer_id))',t);
 END LOOP;
END $$;
CREATE POLICY own_weight ON public.pet_weight_history FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.pet_profile p WHERE p.id=pet_id AND pawpal_private.owns_customer(p.customer_id)));
CREATE POLICY own_refund ON public.refund_transaction FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.payment p WHERE p.id=payment_id AND pawpal_private.owns_customer(p.customer_id)));
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pawpal_private FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA pawpal_private TO authenticated;
GRANT EXECUTE ON FUNCTION pawpal_private.has_permission(text),pawpal_private.owns_customer(uuid) TO authenticated;
GRANT SELECT ON public.pet_current_weight,public.customer_point_balance,public.customer_eligible_spend,public.sales_order_totals,public.appointment_totals,public.staff_public_view TO authenticated,service_role;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
-- PostgREST reloads only after COMMIT of the surrounding deployment transaction.
NOTIFY pgrst,'reload schema';
