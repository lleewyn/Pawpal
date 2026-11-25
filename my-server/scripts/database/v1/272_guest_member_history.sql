-- A verified member may claim only the guest profile proven by their commerce cookie.
-- Phone matching alone never discovers or merges guest profiles.
BEGIN;
SET LOCAL lock_timeout='3s';

ALTER TABLE public.customer ADD COLUMN merged_into_customer_id uuid REFERENCES public.customer(id);
ALTER TABLE public.customer ADD CONSTRAINT customer_merge_not_self CHECK(merged_into_customer_id IS NULL OR merged_into_customer_id<>id);

CREATE TABLE pawpal_private.guest_customer_history_link(
 guest_customer_id uuid PRIMARY KEY REFERENCES public.customer(id),
 member_customer_id uuid NOT NULL REFERENCES public.customer(id),
 transaction_id bigint NOT NULL,
 linked_at timestamptz NOT NULL DEFAULT now(),
 CHECK(guest_customer_id<>member_customer_id)
);
REVOKE ALL ON pawpal_private.guest_customer_history_link FROM PUBLIC,anon,authenticated,service_role;

-- Preserve posted-money protection. Only this private, same-transaction approval
-- may change the customer FK, with every other payment field untouched.
DO $patch$
DECLARE definition text:=pg_get_functiondef('pawpal_private.validate_payment()'::regprocedure);
 needle text:=$old$IF TG_OP='UPDATE' AND (NEW.customer_id,NEW.order_id,NEW.appointment_id) IS DISTINCT FROM (OLD.customer_id,OLD.order_id,OLD.appointment_id) THEN$old$;
BEGIN
 IF strpos(definition,needle)=0 THEN RAISE EXCEPTION 'unexpected_payment_guard';END IF;
 EXECUTE replace(definition,needle,$new$IF TG_OP='UPDATE' AND (NEW.customer_id,NEW.order_id,NEW.appointment_id) IS DISTINCT FROM (OLD.customer_id,OLD.order_id,OLD.appointment_id)
 AND NOT ((to_jsonb(NEW)-'customer_id'-'updated_at')=(to_jsonb(OLD)-'customer_id'-'updated_at')
  AND EXISTS(SELECT 1 FROM pawpal_private.guest_customer_history_link link
   WHERE link.guest_customer_id=OLD.customer_id AND link.member_customer_id=NEW.customer_id AND link.transaction_id=txid_current())) THEN$new$);
END $patch$;

CREATE FUNCTION pawpal_private.move_guest_customer_history(p_guest uuid,p_member uuid,p_auth uuid,p_phone text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE guest public.customer;member public.customer;pet_count integer;booking_count integer;order_count integer;
BEGIN
 IF p_guest IS NULL OR p_member IS NULL OR p_guest=p_member OR p_auth IS NULL OR p_phone IS NULL OR p_phone !~ '^0[0-9]{9}$' THEN
  RAISE EXCEPTION 'invalid_guest_link' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_phone,0));
 PERFORM pg_advisory_xact_lock(hashtextextended(p_phone,2));
 PERFORM 1 FROM public.customer WHERE id IN(p_guest,p_member) ORDER BY id FOR UPDATE;
 SELECT * INTO guest FROM public.customer WHERE id=p_guest;
 SELECT * INTO member FROM public.customer WHERE id=p_member;
 IF member.auth_user_id IS DISTINCT FROM p_auth OR member.customer_status<>'active' OR member.merged_into_customer_id IS NOT NULL
 OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=p_auth AND phone_confirmed_at IS NOT NULL
  AND ltrim(phone,'+')='84'||substring(p_phone FROM 2) AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<=now()))
 OR NOT EXISTS(SELECT 1 FROM public.customer_phone WHERE customer_id=p_member AND phone_number=p_phone AND verified_at IS NOT NULL)
 OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=p_auth) THEN
  RAISE EXCEPTION 'verified_member_required' USING ERRCODE='42501';END IF;
 IF guest.merged_into_customer_id=p_member AND guest.auth_user_id IS NULL THEN RETURN p_member;END IF;
 IF guest.id IS NULL OR guest.auth_user_id IS NOT NULL OR guest.customer_status<>'active'
 OR guest.merged_into_customer_id IS NOT NULL OR guest.unverified_contact_phone IS DISTINCT FROM p_phone
 OR EXISTS(SELECT 1 FROM public.customer_phone WHERE customer_id=p_guest)
 OR EXISTS(SELECT 1 FROM public.customer_membership WHERE customer_id=p_guest)
 OR EXISTS(SELECT 1 FROM public.paw_point_transaction WHERE customer_id=p_guest)
 OR EXISTS(SELECT 1 FROM public.customer_voucher WHERE customer_id=p_guest) THEN
  RAISE EXCEPTION 'guest_link_conflict' USING ERRCODE='PT409';END IF;

 INSERT INTO pawpal_private.guest_customer_history_link(guest_customer_id,member_customer_id,transaction_id)
 VALUES(p_guest,p_member,txid_current());
 -- Pet must move first: the appointment owner trigger checks the pet's new owner.
 UPDATE public.pet_profile SET customer_id=p_member WHERE customer_id=p_guest;
 GET DIAGNOSTICS pet_count=ROW_COUNT;
 UPDATE public.appointment SET customer_id=p_member WHERE customer_id=p_guest;
 GET DIAGNOSTICS booking_count=ROW_COUNT;
 UPDATE public.sales_order SET customer_id=p_member WHERE customer_id=p_guest;
 GET DIAGNOSTICS order_count=ROW_COUNT;
 UPDATE public.payment SET customer_id=p_member WHERE customer_id=p_guest;
 UPDATE public.finance_entry SET customer_id=p_member WHERE customer_id=p_guest;
 UPDATE public.support_ticket SET customer_id=p_member WHERE customer_id=p_guest;
 UPDATE public.notification SET customer_id=p_member WHERE customer_id=p_guest;
 UPDATE pawpal_private.booking_cancellation_event SET customer_id=p_member WHERE customer_id=p_guest;
 UPDATE pawpal_private.booking_unlock_event SET customer_id=p_member WHERE customer_id=p_guest;
 UPDATE pawpal_private.member_booking_hold SET customer_id=p_member WHERE customer_id=p_guest;
 -- Keep the member's existing default address.
 UPDATE public.customer_address SET is_default=false WHERE customer_id=p_guest AND is_default
  AND EXISTS(SELECT 1 FROM public.customer_address WHERE customer_id=p_member AND is_default);
 UPDATE public.customer_address SET customer_id=p_member WHERE customer_id=p_guest;

 -- Retain the source profile for traceability and invalidate every copied guest cookie.
 UPDATE public.customer SET merged_into_customer_id=p_member,customer_status='merged',unverified_contact_phone=NULL
 WHERE id=p_guest;
 INSERT INTO public.audit_log(action,entity_name,entity_id,description)
 VALUES('GUEST_CUSTOMER_LINK','customer',p_guest,jsonb_build_object('member_id',p_member,'pets',pet_count,'appointments',booking_count,'orders',order_count)::text);
 RETURN p_member;
END $$;
REVOKE ALL ON FUNCTION pawpal_private.move_guest_customer_history(uuid,uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.complete_guest_customer_auth(p_hash text,p_auth_id uuid,p_phone text,p_name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;c public.customer;target public.customer;linked uuid;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_auth_id IS NULL OR p_phone IS NULL OR p_phone !~ '^0[0-9]{9}$'
 OR (p_name IS NOT NULL AND length(btrim(p_name)) NOT BETWEEN 1 AND 150) THEN
  RAISE EXCEPTION 'invalid_guest_link' USING ERRCODE='22023';END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_phone,0));
 PERFORM pg_advisory_xact_lock(hashtextextended(p_phone,2));
 PERFORM 1 FROM auth.users WHERE id=p_auth_id AND phone_confirmed_at IS NOT NULL
  AND ltrim(phone,'+')='84'||substring(p_phone FROM 2) AND deleted_at IS NULL AND (banned_until IS NULL OR banned_until<=now()) FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'verified_phone_required' USING ERRCODE='42501';END IF;
 IF EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=p_auth_id OR regexp_replace(phone_number,'[[:space:]().-]','','g') IN(p_phone,'84'||substring(p_phone FROM 2),'+84'||substring(p_phone FROM 2),'0084'||substring(p_phone FROM 2))) THEN
  RAISE EXCEPTION 'customer_identity_required' USING ERRCODE='42501';END IF;
 SELECT * INTO s FROM public.guest_session WHERE token_hash=p_hash;
 IF NOT FOUND OR s.purpose<>'commerce' OR s.expires_at<=now() THEN RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 SELECT * INTO target FROM public.customer WHERE auth_user_id=p_auth_id;
 -- Use deterministic parent locks before the session lock, as commerce writers do.
 PERFORM 1 FROM public.customer WHERE id=s.customer_id OR id=target.id ORDER BY id FOR UPDATE;
 SELECT * INTO c FROM public.customer WHERE id=s.customer_id;
 SELECT * INTO s FROM public.guest_session WHERE token_hash=p_hash FOR UPDATE;
 IF s.id IS NULL OR s.purpose IS DISTINCT FROM 'commerce' OR s.expires_at<=now() OR s.customer_id IS DISTINCT FROM c.id OR c.id IS NULL THEN
  RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 IF c.merged_into_customer_id=target.id AND target.auth_user_id=p_auth_id AND target.customer_status='active' THEN
  RETURN target.id;END IF;
 IF c.customer_status<>'active' OR c.unverified_contact_phone IS DISTINCT FROM p_phone THEN
  RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 IF c.auth_user_id=p_auth_id THEN
  IF NOT EXISTS(SELECT 1 FROM public.customer_phone WHERE customer_id=c.id AND phone_number=p_phone AND is_primary) THEN
   RAISE EXCEPTION 'guest_link_conflict' USING ERRCODE='PT409';END IF;
  RETURN c.id;
 END IF;
 IF s.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 IF c.auth_user_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.customer_phone WHERE customer_id=c.id AND phone_number<>p_phone)
 OR EXISTS(SELECT 1 FROM public.customer_phone WHERE customer_id<>c.id AND phone_number=p_phone AND customer_id IS DISTINCT FROM target.id) THEN
  RAISE EXCEPTION 'guest_link_conflict' USING ERRCODE='PT409';END IF;
 IF target.id IS NOT NULL AND target.id<>c.id THEN
  -- The target is fixed by the verified Auth identity; never accept a client customer ID.
  IF target.customer_status<>'active' OR NOT EXISTS(SELECT 1 FROM public.customer_phone WHERE customer_id=target.id AND phone_number=p_phone AND verified_at IS NOT NULL) THEN
   RAISE EXCEPTION 'guest_link_conflict' USING ERRCODE='PT409';END IF;
  RETURN pawpal_private.move_guest_customer_history(c.id,target.id,p_auth_id,p_phone);
 END IF;
 -- First activation keeps the original guest ID, so every existing FK stays intact.
 INSERT INTO public.customer_phone(customer_id,phone_number,is_primary,verified_at) VALUES(c.id,p_phone,true,now())
 ON CONFLICT(customer_id,phone_number) DO NOTHING;
 linked:=public.complete_customer_auth(p_auth_id,p_phone,p_name);
 IF linked<>c.id THEN RAISE EXCEPTION 'guest_link_conflict' USING ERRCODE='PT409';END IF;
 RETURN linked;
END $$;
REVOKE ALL ON FUNCTION public.complete_guest_customer_auth(text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_guest_customer_auth(text,uuid,text,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
