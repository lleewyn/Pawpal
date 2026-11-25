BEGIN;
SET LOCAL lock_timeout='3s';
SET LOCAL statement_timeout='12s';
CREATE TABLE pawpal_private.guest_profile_edit (
 request_id uuid PRIMARY KEY,source_hash text NOT NULL,payload jsonb NOT NULL,result jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON pawpal_private.guest_profile_edit FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.guest_profile_read(p_hash text,p_pet uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;c public.customer;p public.pet_profile;contact jsonb;pet jsonb;weight numeric;
BEGIN
 s:=pawpal_private.require_guest_booking_session(p_hash);
 SELECT * INTO c FROM public.customer WHERE id=s.customer_id;
 contact:=jsonb_build_object('name',(SELECT full_name FROM public.customer_profile WHERE customer_id=c.id),'phone',c.unverified_contact_phone);
 contact:=contact||jsonb_build_object('revision',md5(contact::text||c.updated_at::text));
 IF p_pet IS NOT NULL THEN
  SELECT * INTO p FROM public.pet_profile WHERE id=p_pet AND customer_id=c.id AND status='active';
  IF NOT FOUND THEN RAISE EXCEPTION 'guest_pet_owner_required' USING ERRCODE='42501';END IF;
  SELECT h.weight INTO weight FROM public.pet_current_weight h WHERE h.pet_id=p.id;
  pet:=jsonb_build_object('id',p.id,'name',p.pet_name,'breedId',p.breed_id,'gender',p.gender,'allergy',p.allergy,'safetyNote',p.safety_note,'weight',weight);
  pet:=pet||jsonb_build_object('revision',md5(pet::text||p.updated_at::text));
 END IF;
 RETURN jsonb_build_object('contact',contact,'pet',pet);
END $$;

CREATE FUNCTION public.guest_profile_update(p_hash text,p_new_hash text,p_request uuid,p_revision text,p_contact jsonb DEFAULT NULL,p_pet jsonb DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;previous pawpal_private.guest_profile_edit;current_value jsonb;payload jsonb;result jsonb;
 pet_id uuid;weight numeric;rotated boolean:=false;
BEGIN
 IF p_hash IS NULL OR p_hash !~ '^[a-f0-9]{64}$' OR p_new_hash IS NULL OR p_new_hash !~ '^[a-f0-9]{64}$'
  OR p_request IS NULL OR p_revision IS NULL OR p_revision !~ '^[a-f0-9]{32}$'
  OR (p_contact IS NULL)=(p_pet IS NULL) THEN RAISE EXCEPTION 'invalid_body' USING ERRCODE='22023';END IF;
 payload:=jsonb_build_object('revision',p_revision,'contact',p_contact,'pet',p_pet,'newHash',p_new_hash);
 PERFORM pg_advisory_xact_lock(hashtextextended(p_request::text,120));
 SELECT * INTO previous FROM pawpal_private.guest_profile_edit WHERE request_id=p_request;
 IF FOUND THEN
  IF previous.source_hash<>p_hash OR previous.payload<>payload THEN RAISE EXCEPTION 'guest_edit_conflict' USING ERRCODE='PT409';END IF;
  PERFORM pawpal_private.require_guest_booking_session(CASE WHEN (previous.result->>'rotated')::boolean THEN p_new_hash ELSE p_hash END);
  RETURN previous.result;
 END IF;
 s:=pawpal_private.require_guest_booking_session(p_hash);
 IF p_contact IS NOT NULL THEN
  IF jsonb_typeof(p_contact) IS DISTINCT FROM 'object' OR length(p_contact::text)>1000
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_contact) k WHERE k NOT IN('name','phone'))
   OR jsonb_typeof(p_contact->'name') IS DISTINCT FROM 'string' OR length(btrim(p_contact->>'name')) NOT BETWEEN 1 AND 150
   OR jsonb_typeof(p_contact->'phone') IS DISTINCT FROM 'string' OR (p_contact->>'phone') !~ '^0[0-9]{9}$' THEN
   RAISE EXCEPTION 'invalid_body' USING ERRCODE='22023';END IF;
  current_value:=public.guest_profile_read(p_hash,NULL);
  IF current_value->'contact'->>'revision'<>p_revision THEN RAISE EXCEPTION 'guest_edit_conflict' USING ERRCODE='PT409';END IF;
  rotated:=current_value->'contact'->>'phone' IS DISTINCT FROM p_contact->>'phone';
  UPDATE public.customer_profile SET full_name=btrim(p_contact->>'name') WHERE customer_id=s.customer_id;
  IF rotated THEN
   IF p_new_hash=p_hash THEN RAISE EXCEPTION 'invalid_body' USING ERRCODE='22023';END IF;
   UPDATE public.customer SET unverified_contact_phone=p_contact->>'phone' WHERE id=s.customer_id;
   -- Existing trigger revokes every old commerce session. Never un-revoke one.
   INSERT INTO public.guest_session(token_hash,purpose,customer_id,expires_at) VALUES(p_new_hash,'commerce',s.customer_id,s.expires_at);
  END IF;
 ELSE
  IF jsonb_typeof(p_pet) IS DISTINCT FROM 'object' OR length(p_pet::text)>8000
   OR EXISTS(SELECT 1 FROM jsonb_object_keys(p_pet) k WHERE k NOT IN('id','name','breedId','gender','weight','allergy','safetyNote'))
   OR jsonb_typeof(p_pet->'name') IS DISTINCT FROM 'string' OR length(btrim(p_pet->>'name')) NOT BETWEEN 1 AND 100
   OR (p_pet->>'gender') IS NULL OR p_pet->>'gender' NOT IN('nam','nu','chua_ro')
   OR coalesce(length(p_pet->>'allergy'),0)>1000 OR coalesce(length(p_pet->>'safetyNote'),0)>1000
   OR jsonb_typeof(p_pet->'weight') IS DISTINCT FROM 'number' THEN RAISE EXCEPTION 'invalid_body' USING ERRCODE='22023';END IF;
  pet_id:=(p_pet->>'id')::uuid;weight:=(p_pet->>'weight')::numeric;
  IF pet_id IS NULL OR weight<=0 OR weight>200 OR weight::text IN('NaN','Infinity','-Infinity')
   OR NOT EXISTS(SELECT 1 FROM public.pet_breed b JOIN public.pet_species sp ON sp.id=b.species_id WHERE b.id=(p_pet->>'breedId')::uuid AND b.is_active AND sp.is_active)
   THEN RAISE EXCEPTION 'invalid_body' USING ERRCODE='22023';END IF;
  current_value:=public.guest_profile_read(p_hash,pet_id);
  IF current_value->'pet'->>'revision'<>p_revision THEN RAISE EXCEPTION 'guest_edit_conflict' USING ERRCODE='PT409';END IF;
  UPDATE public.pet_profile SET pet_name=btrim(p_pet->>'name'),breed_id=(p_pet->>'breedId')::uuid,gender=p_pet->>'gender',
   allergy=nullif(btrim(p_pet->>'allergy'),''),safety_note=nullif(btrim(p_pet->>'safetyNote'),'') WHERE id=pet_id AND customer_id=s.customer_id;
  IF (current_value->'pet'->>'weight')::numeric IS DISTINCT FROM weight THEN
   INSERT INTO public.pet_weight_history(pet_id,weight,note) VALUES(pet_id,weight,'guest-edit:'||p_request);
  END IF;
 END IF;
 result:=jsonb_build_object('rotated',rotated,'requestId',p_request);
 INSERT INTO pawpal_private.guest_profile_edit(request_id,source_hash,payload,result) VALUES(p_request,p_hash,payload,result);
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.guest_profile_read(text,uuid),public.guest_profile_update(text,text,uuid,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.guest_profile_read(text,uuid),public.guest_profile_update(text,text,uuid,text,jsonb,jsonb) TO service_role;
CREATE OR REPLACE FUNCTION public.guest_booking_receipt(p_hash text,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;result jsonb;
BEGIN
 s:=pawpal_private.require_guest_booking_session(p_hash);
 SELECT jsonb_build_object('id',a.id,'code',a.appointment_code,'status',a.appointment_status,'start_at',a.scheduled_start_at,
  'end_at',a.scheduled_end_at,'total',(SELECT total_price FROM public.appointment_totals WHERE appointment_id=a.id))
 INTO result FROM public.appointment a WHERE a.id=p_request AND a.customer_id=s.customer_id AND EXISTS(
  SELECT 1 FROM public.audit_log l WHERE l.entity_id=a.id AND l.entity_name='appointment' AND l.action='GUEST_BOOKING_CREATE' AND EXISTS(SELECT 1 FROM public.guest_session origin WHERE origin.id::text=l.description::jsonb->>'session_id' AND origin.customer_id=s.customer_id AND origin.purpose='commerce'));
 IF result IS NULL THEN RAISE EXCEPTION 'guest_booking_not_found' USING ERRCODE='P0002';END IF;
 RETURN result;
END $$;
CREATE OR REPLACE FUNCTION public.guest_sales_receipt(p_hash text,p_request uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE s public.guest_session;result jsonb;
BEGIN
 s:=pawpal_private.require_guest_booking_session(p_hash);
 SELECT jsonb_build_object('id',o.id,'code',o.order_code,'status',o.order_status,'total',t.total_amount,
  'paidAmount',greatest(0,pay.collected-pay.refunded),
  'paymentStatus',CASE WHEN t.total_amount=0 THEN 'not_required' WHEN pay.collected-pay.refunded>=t.total_amount THEN 'paid'
   WHEN pay.collected-pay.refunded>0 THEN 'partial' WHEN pay.refunded>0 THEN 'refunded' ELSE 'pending' END,
  'receiver',jsonb_build_object('name',o.receiver_name_snapshot,'phone',o.receiver_phone_snapshot,'province',o.province_snapshot,'address',o.street_address_snapshot),
  'lines',(SELECT coalesce(jsonb_agg(jsonb_build_object('variantId',product_variant_id,'name',product_name_snapshot,'sku',sku_snapshot,'quantity',quantity,'unitPrice',unit_price,'discount',discount_amount) ORDER BY id),'[]'::jsonb) FROM public.sales_order_detail WHERE order_id=o.id))
 INTO result FROM public.sales_order o JOIN public.sales_order_totals t ON t.order_id=o.id
 CROSS JOIN LATERAL(SELECT coalesce((SELECT sum(amount) FROM public.payment WHERE order_id=o.id AND transaction_status='succeeded'),0) collected,
  coalesce((SELECT sum(r.refunded_amount) FROM public.refund_transaction r JOIN public.payment p ON p.id=r.payment_id WHERE p.order_id=o.id AND r.refund_status='succeeded'),0) refunded) pay
 WHERE o.id=p_request AND o.customer_id=s.customer_id AND EXISTS(
  SELECT 1 FROM public.audit_log l WHERE l.entity_id=o.id AND l.entity_name='sales_order' AND l.action='GUEST_ORDER_CREATE' AND EXISTS(SELECT 1 FROM public.guest_session origin WHERE origin.id::text=l.description::jsonb->>'session_id' AND origin.customer_id=s.customer_id AND origin.purpose='commerce'));
 IF result IS NULL THEN RAISE EXCEPTION 'guest_order_not_found' USING ERRCODE='P0002';END IF;
 RETURN result;
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
