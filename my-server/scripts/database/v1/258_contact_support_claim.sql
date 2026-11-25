BEGIN;

ALTER TABLE public.support_ticket ADD COLUMN IF NOT EXISTS guest_contact_name text, ADD COLUMN IF NOT EXISTS guest_contact_phone text;

CREATE OR REPLACE FUNCTION public.create_guest_contact_ticket(p_id uuid,p_name text,p_phone text,p_subject text,p_interest text,p_message text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE prior public.support_ticket; code text:='LH-'||p_id; body text;
BEGIN
 IF p_id IS NULL OR coalesce(length(btrim(p_name)),0) NOT BETWEEN 2 AND 120
 OR coalesce(p_phone,'') !~ '^0[35789][0-9]{8}$' OR coalesce(length(btrim(p_subject)),0) NOT BETWEEN 2 AND 250
 OR coalesce(length(btrim(p_message)),0) NOT BETWEEN 2 AND 4000
 OR p_interest IS NULL OR p_interest NOT IN ('','spa','hotel','taxi','other') THEN
  RAISE EXCEPTION 'invalid_guest_contact' USING ERRCODE='22023';
 END IF;
 body:=CASE p_interest WHEN 'spa' THEN 'Dịch vụ quan tâm: Tắm sấy và cắt tỉa' WHEN 'hotel' THEN 'Dịch vụ quan tâm: Khách sạn thú cưng' WHEN 'taxi' THEN 'Dịch vụ quan tâm: Đưa đón thú cưng' WHEN 'other' THEN 'Dịch vụ quan tâm: Khác' END;
 body:=concat_ws(E'\n\n',body,btrim(p_message));
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,219));
 SELECT * INTO prior FROM public.support_ticket WHERE id=p_id;
 IF FOUND THEN
  IF prior.ticket_code IS DISTINCT FROM code OR prior.channel<>'contact' OR prior.customer_id IS NOT NULL
  OR prior.guest_contact_name IS DISTINCT FROM btrim(p_name) OR prior.guest_contact_phone IS DISTINCT FROM p_phone
  OR prior.subject IS DISTINCT FROM btrim(p_subject) OR prior.description IS DISTINCT FROM body THEN
   RAISE EXCEPTION 'guest_contact_conflict' USING ERRCODE='PT409';
  END IF;
  RETURN code;
 END IF;
 INSERT INTO public.support_ticket(id,ticket_code,channel,category,subject,description,priority,type,status,guest_contact_name,guest_contact_phone)
 VALUES(p_id,code,'contact','other',btrim(p_subject),body,'normal','contact','pending',btrim(p_name),p_phone);
 INSERT INTO public.support_ticket_message(ticket_id,sender_type,content,is_internal) VALUES(p_id,'system',body,false);
 RETURN code;
END $$;
REVOKE ALL ON FUNCTION public.create_guest_contact_ticket(uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_guest_contact_ticket(uuid,text,text,text,text,text) TO service_role;

CREATE TABLE IF NOT EXISTS pawpal_private.guest_contact_claim (
 ticket_id uuid PRIMARY KEY REFERENCES public.support_ticket(id) ON DELETE CASCADE,
 proof_hash bytea NOT NULL,
 payload_hash bytea NOT NULL
);
REVOKE ALL ON pawpal_private.guest_contact_claim FROM PUBLIC,anon,authenticated;

CREATE OR REPLACE FUNCTION public.create_claimable_guest_contact_ticket(p_id uuid,p_name text,p_phone text,p_subject text,p_interest text,p_message text,p_proof uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE code text; stored pawpal_private.guest_contact_claim;
 expected_hash bytea:=sha256(convert_to(p_proof::text,'UTF8'));
 expected_payload bytea:=sha256(convert_to(jsonb_build_array(btrim(p_name),p_phone,btrim(p_subject),p_interest,btrim(p_message))::text,'UTF8'));
BEGIN
 IF p_id IS NULL OR p_proof IS NULL THEN RAISE EXCEPTION 'invalid_guest_contact' USING ERRCODE='22023'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text,219));
 IF EXISTS(SELECT 1 FROM public.support_ticket WHERE id=p_id) THEN
  SELECT * INTO stored FROM pawpal_private.guest_contact_claim WHERE ticket_id=p_id;
  IF stored.proof_hash IS DISTINCT FROM expected_hash OR stored.payload_hash IS DISTINCT FROM expected_payload THEN
   RAISE EXCEPTION 'guest_contact_conflict' USING ERRCODE='PT409';
  END IF;
  IF EXISTS(SELECT 1 FROM public.support_ticket WHERE id=p_id AND customer_id IS NOT NULL) THEN
   RETURN (SELECT ticket_code FROM public.support_ticket WHERE id=p_id);
  END IF;
 END IF;
 code:=public.create_guest_contact_ticket(p_id,p_name,p_phone,p_subject,p_interest,p_message);
 INSERT INTO pawpal_private.guest_contact_claim(ticket_id,proof_hash,payload_hash) VALUES(p_id,expected_hash,expected_payload)
 ON CONFLICT(ticket_id) DO NOTHING;
 RETURN code;
END $$;

-- Recover only the structured contact headers written by the old API fallback.
UPDATE public.support_ticket t SET guest_contact_name=coalesce(t.guest_contact_name,m.parts[1]),guest_contact_phone=coalesce(t.guest_contact_phone,m.parts[2])
FROM (SELECT id,regexp_match(description,E'^Họ và tên: ([^\\n]+)\\nSố điện thoại: (0[35789][0-9]{8})\\n') parts FROM public.support_ticket WHERE channel='contact') m
WHERE t.id=m.id AND m.parts IS NOT NULL AND (t.guest_contact_name IS NULL OR t.guest_contact_phone IS NULL);

CREATE OR REPLACE FUNCTION public.claim_own_guest_contact_ticket(p_ticket uuid,p_proof uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cid uuid:=pawpal_private.customer_support_owner(); t public.support_ticket; stored pawpal_private.guest_contact_claim;
BEGIN
 SELECT * INTO t FROM public.support_ticket WHERE id=p_ticket AND channel='contact' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'guest_contact_claim_invalid' USING ERRCODE='42501'; END IF;
 IF t.customer_id=cid THEN RETURN t.id; END IF;
 IF t.customer_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM public.customer_phone WHERE customer_id=cid AND is_primary AND verified_at IS NOT NULL AND phone_number=t.guest_contact_phone) THEN
  RAISE EXCEPTION 'guest_contact_claim_phone_mismatch' USING ERRCODE='42501';
 END IF;
 SELECT * INTO stored FROM pawpal_private.guest_contact_claim WHERE ticket_id=p_ticket;
 IF FOUND AND (p_proof IS NULL OR stored.proof_hash IS DISTINCT FROM sha256(convert_to(p_proof::text,'UTF8'))) THEN
  RAISE EXCEPTION 'guest_contact_claim_invalid' USING ERRCODE='42501';
 END IF;
 -- Legacy tickets have no stored receipt, so verified phone ownership is mandatory.
 UPDATE public.support_ticket SET customer_id=cid,updated_at=clock_timestamp() WHERE id=t.id;
 RETURN t.id;
END $$;
REVOKE ALL ON FUNCTION public.create_claimable_guest_contact_ticket(uuid,text,text,text,text,text,uuid),public.claim_own_guest_contact_ticket(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_claimable_guest_contact_ticket(uuid,text,text,text,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_own_guest_contact_ticket(uuid,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;

