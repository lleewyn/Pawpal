BEGIN;
CREATE TABLE IF NOT EXISTS pawpal_private.booking_cancellation_event(
 appointment_id uuid PRIMARY KEY REFERENCES public.appointment(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES public.customer(id),cancelled_at timestamptz NOT NULL);
CREATE TABLE IF NOT EXISTS pawpal_private.booking_unlock_event(
 request_id uuid PRIMARY KEY,customer_id uuid NOT NULL REFERENCES public.customer(id),
 actor_id uuid NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT clock_timestamp());
REVOKE ALL ON pawpal_private.booking_cancellation_event,pawpal_private.booking_unlock_event FROM PUBLIC,anon,authenticated;
INSERT INTO pawpal_private.booking_cancellation_event
 SELECT id,customer_id,coalesce(updated_at,created_at) FROM public.appointment
 WHERE appointment_status IN ('cancelled','da_huy') AND customer_id IS NOT NULL ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION pawpal_private.booking_restriction(p_customer uuid) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pawpal_private AS $$
 WITH tally AS(SELECT count(*) AS n FROM pawpal_private.booking_cancellation_event
 WHERE customer_id=p_customer AND cancelled_at>coalesce((SELECT max(created_at) FROM pawpal_private.booking_unlock_event WHERE customer_id=p_customer),'-infinity'::timestamptz))
 SELECT jsonb_build_object('customer_id',p_customer,'locked',n>3,'cancel_count',n,'limit',3,
 'reason',CASE WHEN n>3 THEN 'Đã hủy '||n||' lịch hẹn, vượt ngưỡng 3 lần cho phép.' ELSE NULL END) FROM tally
$$;
REVOKE ALL ON FUNCTION pawpal_private.booking_restriction(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.own_booking_restriction() RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pawpal_private AS $$
DECLARE cid uuid;BEGIN
 SELECT id INTO cid FROM public.customer WHERE auth_user_id=auth.uid();
 IF cid IS NULL THEN RAISE EXCEPTION 'customer_session_required' USING ERRCODE='42501';END IF;
 RETURN pawpal_private.booking_restriction(cid);END $$;
CREATE OR REPLACE FUNCTION public.admin_booking_restrictions(p_ids uuid[]) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,public,pawpal_private AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('customer.read') THEN RAISE EXCEPTION 'customer_forbidden' USING ERRCODE='42501';END IF;
 IF cardinality(p_ids)>100 THEN RAISE EXCEPTION 'too_many_customers';END IF;
 RETURN coalesce((SELECT jsonb_agg(pawpal_private.booking_restriction(id)) FROM public.customer WHERE id=ANY(p_ids)),'[]'::jsonb);END $$;
CREATE OR REPLACE FUNCTION public.admin_unlock_customer_booking(p_id uuid,p_request uuid,p_reason text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pawpal_private AS $$
BEGIN
 IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('customer.write') THEN RAISE EXCEPTION 'customer_forbidden' USING ERRCODE='42501';END IF;
 IF p_request IS NULL OR length(btrim(p_reason))<5 OR length(p_reason)>1000 THEN RAISE EXCEPTION 'unlock_reason_required';END IF;
 PERFORM 1 FROM public.customer WHERE id=p_id FOR UPDATE;IF NOT FOUND THEN RAISE EXCEPTION 'customer_not_found';END IF;
 IF EXISTS(SELECT 1 FROM pawpal_private.booking_unlock_event WHERE request_id=p_request AND (customer_id<>p_id OR actor_id<>auth.uid() OR reason<>btrim(p_reason))) THEN RAISE EXCEPTION 'unlock_request_conflict';END IF;
 IF NOT EXISTS(SELECT 1 FROM pawpal_private.booking_unlock_event WHERE request_id=p_request) AND NOT (pawpal_private.booking_restriction(p_id)->>'locked')::boolean THEN RETURN pawpal_private.booking_restriction(p_id);END IF;
 INSERT INTO pawpal_private.booking_unlock_event(request_id,customer_id,actor_id,reason) VALUES(p_request,p_id,auth.uid(),btrim(p_reason)) ON CONFLICT DO NOTHING;
 UPDATE public.customer SET updated_at=clock_timestamp() WHERE id=p_id;
 RETURN pawpal_private.booking_restriction(p_id);END $$;
CREATE OR REPLACE FUNCTION pawpal_private.track_booking_cancellation() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pawpal_private AS $$
BEGIN
 IF NEW.customer_id IS NOT NULL AND NEW.appointment_status IN ('cancelled','da_huy') AND (TG_OP='INSERT' OR OLD.appointment_status IS DISTINCT FROM NEW.appointment_status) THEN
 PERFORM 1 FROM public.customer WHERE id=NEW.customer_id FOR UPDATE;
 INSERT INTO pawpal_private.booking_cancellation_event VALUES(NEW.id,NEW.customer_id,clock_timestamp()) ON CONFLICT(appointment_id) DO UPDATE SET customer_id=EXCLUDED.customer_id,cancelled_at=EXCLUDED.cancelled_at;
 END IF;RETURN NEW;END $$;
DROP TRIGGER IF EXISTS track_booking_cancellation ON public.appointment;
CREATE TRIGGER track_booking_cancellation AFTER INSERT OR UPDATE OF appointment_status ON public.appointment FOR EACH ROW EXECUTE FUNCTION pawpal_private.track_booking_cancellation();
CREATE OR REPLACE FUNCTION pawpal_private.guard_member_booking_restriction() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,pawpal_private AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.customer WHERE id=NEW.customer_id AND auth_user_id=auth.uid()) THEN
 PERFORM 1 FROM public.customer WHERE id=NEW.customer_id FOR UPDATE;
 IF (pawpal_private.booking_restriction(NEW.customer_id)->>'locked')::boolean THEN RAISE EXCEPTION 'booking_account_restricted' USING ERRCODE='42501';END IF;
 END IF;RETURN NEW;END $$;
DROP TRIGGER IF EXISTS guard_member_booking_restriction ON public.appointment;
CREATE TRIGGER guard_member_booking_restriction BEFORE INSERT ON public.appointment FOR EACH ROW EXECUTE FUNCTION pawpal_private.guard_member_booking_restriction();
REVOKE ALL ON FUNCTION public.own_booking_restriction(),public.admin_booking_restrictions(uuid[]),public.admin_unlock_customer_booking(uuid,uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.own_booking_restriction(),public.admin_booking_restrictions(uuid[]),public.admin_unlock_customer_booking(uuid,uuid,text) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
