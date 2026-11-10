BEGIN;
CREATE TABLE pawpal_private.guest_contact_claim (
 ticket_id uuid PRIMARY KEY REFERENCES public.support_ticket(id) ON DELETE CASCADE,
 proof_hash bytea NOT NULL,
 payload_hash bytea NOT NULL
);
REVOKE ALL ON pawpal_private.guest_contact_claim FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.create_claimable_guest_contact_ticket(p_id uuid,p_name text,p_phone text,p_subject text,p_interest text,p_message text,p_proof uuid)
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

CREATE FUNCTION public.claim_own_guest_contact_ticket(p_ticket uuid,p_proof uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE cid uuid:=pawpal_private.customer_support_owner(); t public.support_ticket;
BEGIN
 SELECT * INTO t FROM public.support_ticket WHERE id=p_ticket AND channel='contact' FOR UPDATE;
 IF NOT FOUND OR p_proof IS NULL OR NOT EXISTS(SELECT 1 FROM pawpal_private.guest_contact_claim
  WHERE ticket_id=p_ticket AND proof_hash=sha256(convert_to(p_proof::text,'UTF8'))) THEN
  RAISE EXCEPTION 'guest_contact_claim_invalid' USING ERRCODE='42501';
 END IF;
 IF t.customer_id=cid THEN RETURN t.id; END IF;
 IF t.customer_id IS NOT NULL OR NOT EXISTS(SELECT 1 FROM public.customer_phone
  WHERE customer_id=cid AND is_primary AND verified_at IS NOT NULL AND phone_number=t.guest_contact_phone) THEN
  RAISE EXCEPTION 'guest_contact_claim_phone_mismatch' USING ERRCODE='42501';
 END IF;
 UPDATE public.support_ticket SET customer_id=cid,updated_at=clock_timestamp() WHERE id=t.id;
 RETURN t.id;
END $$;

DO $$
DECLARE body text:=pg_get_functiondef('public.own_support_tickets(integer,text,uuid,integer)'::regprocedure);
 needle text:='a.appointment_code,a.id AS appointment_id,o.order_code,o.id AS order_id,';
BEGIN
 IF strpos(body,needle)=0 THEN RAISE EXCEPTION 'unexpected_support_archive_projection'; END IF;
 EXECUTE replace(body,needle,needle||$new$
   CASE WHEN t.status IN ('resolved','closed','completed') THEN (
    SELECT jsonb_build_object('completed_at',log.created_at,'type',t.resolution_type,'approved_amount',t.approved_amount)
    FROM public.audit_log log WHERE log.entity_id=t.id AND log.action='COMPLAINT_ACTION'
     AND log.description::jsonb->>'action'='complete' ORDER BY log.created_at DESC,log.id DESC LIMIT 1
   ) END AS compensation_summary,$new$);
END $$;

REVOKE ALL ON FUNCTION public.create_claimable_guest_contact_ticket(uuid,text,text,text,text,text,uuid),public.claim_own_guest_contact_ticket(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_claimable_guest_contact_ticket(uuid,text,text,text,text,text,uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_own_guest_contact_ticket(uuid,uuid) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
