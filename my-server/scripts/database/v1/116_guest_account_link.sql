-- Link only a server-verified phone Auth identity plus a valid commerce session.
BEGIN;
SET LOCAL lock_timeout='3s';
CREATE FUNCTION public.complete_guest_customer_auth(p_hash text,p_auth_id uuid,p_phone text,p_name text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;c public.customer;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_auth_id IS NULL OR p_phone IS NULL OR p_phone !~ '^0[0-9]{9}$'
  OR (p_name IS NOT NULL AND length(btrim(p_name)) NOT BETWEEN 1 AND 150) THEN
  RAISE EXCEPTION 'invalid_guest_link' USING ERRCODE='22023';END IF;
 -- Same canonical-phone lock namespaces as existing account/guest creation.
 PERFORM pg_advisory_xact_lock(hashtextextended(p_phone,0));
 PERFORM pg_advisory_xact_lock(hashtextextended(p_phone,2));
 PERFORM 1 FROM auth.users u WHERE u.id=p_auth_id AND u.phone_confirmed_at IS NOT NULL
  AND ltrim(u.phone,'+')='84'||substring(p_phone FROM 2) AND u.deleted_at IS NULL AND (u.banned_until IS NULL OR u.banned_until<=now()) FOR SHARE;
 IF NOT FOUND THEN
  RAISE EXCEPTION 'verified_phone_required' USING ERRCODE='42501';END IF;
 IF EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=p_auth_id OR regexp_replace(phone_number,'[[:space:]().-]','','g') IN(p_phone,'84'||substring(p_phone FROM 2),'+84'||substring(p_phone FROM 2),'0084'||substring(p_phone FROM 2))) THEN
  RAISE EXCEPTION 'customer_identity_required' USING ERRCODE='42501';END IF;
 SELECT * INTO s FROM public.guest_session WHERE token_hash=p_hash;
 IF NOT FOUND OR s.purpose<>'commerce' OR s.expires_at<=now() THEN RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 SELECT * INTO c FROM public.customer WHERE id=s.customer_id FOR UPDATE;
 SELECT * INTO s FROM public.guest_session WHERE token_hash=p_hash FOR UPDATE;
 IF s.id IS NULL OR s.purpose IS DISTINCT FROM 'commerce' OR s.expires_at<=now() OR s.customer_id IS DISTINCT FROM c.id
  OR c.id IS NULL OR c.customer_status<>'active' OR c.unverified_contact_phone IS DISTINCT FROM p_phone THEN
  RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 IF (c.auth_user_id IS NOT NULL AND c.auth_user_id IS DISTINCT FROM p_auth_id)
  OR EXISTS(SELECT 1 FROM public.customer WHERE auth_user_id=p_auth_id AND id<>c.id)
  OR EXISTS(SELECT 1 FROM public.customer_phone WHERE customer_id<>c.id AND regexp_replace(phone_number,'[[:space:]().-]','','g') IN(p_phone,'84'||substring(p_phone FROM 2),'+84'||substring(p_phone FROM 2),'0084'||substring(p_phone FROM 2)))
  OR EXISTS(SELECT 1 FROM public.customer_phone WHERE customer_id=c.id AND phone_number<>p_phone) THEN
  RAISE EXCEPTION 'guest_link_conflict' USING ERRCODE='PT409';END IF;
 IF c.auth_user_id=p_auth_id THEN
  IF NOT EXISTS(SELECT 1 FROM public.customer_phone WHERE customer_id=c.id AND phone_number=p_phone AND is_primary) THEN
   RAISE EXCEPTION 'guest_link_conflict' USING ERRCODE='PT409';END IF;
  RETURN c.id;
 END IF;
 IF s.revoked_at IS NOT NULL THEN RAISE EXCEPTION 'guest_session_invalid' USING ERRCODE='42501';END IF;
 INSERT INTO public.customer_phone(customer_id,phone_number,is_primary) VALUES(c.id,p_phone,true)
  ON CONFLICT(customer_id,phone_number) DO NOTHING;
 UPDATE public.customer SET auth_user_id=p_auth_id WHERE id=c.id;
 IF p_name IS NOT NULL THEN UPDATE public.customer_profile SET full_name=btrim(p_name) WHERE customer_id=c.id;END IF;
 -- The 112 trigger revokes commerce sessions. IDs and all transactions stay put.
 RETURN c.id;
END $$;
REVOKE ALL ON FUNCTION public.complete_guest_customer_auth(text,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.complete_guest_customer_auth(text,uuid,text,text) TO service_role;
COMMIT;
