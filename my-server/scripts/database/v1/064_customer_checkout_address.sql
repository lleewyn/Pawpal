BEGIN;
CREATE OR REPLACE FUNCTION public.save_own_checkout_address(p_id uuid,p_revision text,p_action text,p_values jsonb DEFAULT '{}')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE owner_id uuid; existing public.customer_address; address_name text; phone text; street text; district text; province text; make_default boolean;
BEGIN
 SELECT id INTO owner_id FROM public.customer WHERE auth_user_id=auth.uid() AND pawpal_private.owns_customer(id) FOR UPDATE;
 IF owner_id IS NULL OR EXISTS(SELECT 1 FROM public.staff WHERE auth_user_id=auth.uid()) THEN RAISE EXCEPTION 'address_owner_required' USING ERRCODE='42501'; END IF;
 IF p_revision IS DISTINCT FROM public.customer_profile_snapshot()->>'revision' THEN RAISE EXCEPTION 'address_changed' USING ERRCODE='PT409'; END IF;
 IF p_id IS NULL OR p_action NOT IN ('save','delete','default') OR p_action IS NULL THEN RAISE EXCEPTION 'invalid_address_action' USING ERRCODE='22023'; END IF;
 SELECT * INTO existing FROM public.customer_address WHERE id=p_id;
 IF FOUND AND existing.customer_id<>owner_id THEN RAISE EXCEPTION 'foreign_address' USING ERRCODE='42501'; END IF;
 IF p_action<>'save' AND existing.id IS NULL THEN RAISE EXCEPTION 'address_missing' USING ERRCODE='PT409'; END IF;
 IF p_action='delete' THEN DELETE FROM public.customer_address WHERE id=p_id AND customer_id=owner_id;
 ELSIF p_action='default' THEN
  UPDATE public.customer_address SET is_default=false WHERE customer_id=owner_id AND is_default;
  UPDATE public.customer_address SET is_default=true WHERE id=p_id AND customer_id=owner_id;
 ELSE
  IF jsonb_typeof(p_values) IS DISTINCT FROM 'object' OR length(p_values::text)>6000 THEN RAISE EXCEPTION 'invalid_address' USING ERRCODE='22023'; END IF;
  address_name:=btrim(p_values->>'name');phone:=btrim(p_values->>'phone');street:=btrim(p_values->>'street');district:=btrim(p_values->>'district');province:=btrim(p_values->>'city');
  IF coalesce(length(address_name),0) NOT BETWEEN 2 AND 150 OR phone IS NULL OR phone !~ '^0[0-9]{9}$'
   OR coalesce(length(street),0) NOT BETWEEN 1 AND 1000 OR coalesce(length(district),0) NOT BETWEEN 1 AND 100
   OR coalesce(length(province),0) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'invalid_address' USING ERRCODE='22023'; END IF;
  IF existing.id IS NULL AND (SELECT count(*) FROM public.customer_address WHERE customer_id=owner_id)>=20 THEN RAISE EXCEPTION 'address_limit' USING ERRCODE='22023'; END IF;
  make_default:=coalesce((p_values->>'isDefault')::boolean,false) OR coalesce(existing.is_default,false) OR NOT EXISTS(SELECT 1 FROM public.customer_address WHERE customer_id=owner_id);
  IF make_default THEN UPDATE public.customer_address SET is_default=false WHERE customer_id=owner_id AND is_default; END IF;
  INSERT INTO public.customer_address(id,customer_id,receiver_name,receiver_phone,street_address,province,is_default)
  VALUES(p_id,owner_id,address_name,phone,street||', '||district,province,make_default)
  ON CONFLICT(id) DO UPDATE SET receiver_name=EXCLUDED.receiver_name,receiver_phone=EXCLUDED.receiver_phone,street_address=EXCLUDED.street_address,province=EXCLUDED.province,is_default=EXCLUDED.is_default,updated_at=clock_timestamp()
  WHERE public.customer_address.customer_id=owner_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'foreign_address' USING ERRCODE='42501'; END IF;
 END IF;
 IF NOT EXISTS(SELECT 1 FROM public.customer_address WHERE customer_id=owner_id AND is_default) THEN
  UPDATE public.customer_address SET is_default=true WHERE id=(SELECT id FROM public.customer_address WHERE customer_id=owner_id ORDER BY created_at,id LIMIT 1);
 END IF;
 RETURN public.customer_profile_snapshot();
END $$;
REVOKE ALL ON FUNCTION public.save_own_checkout_address(uuid,text,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_own_checkout_address(uuid,text,text,jsonb) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
