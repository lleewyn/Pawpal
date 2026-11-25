BEGIN;
CREATE TABLE IF NOT EXISTS pawpal_private.ai_api_key (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 provider text NOT NULL DEFAULT 'gemini' CHECK(provider='gemini'),
 label text NOT NULL CHECK(length(btrim(label)) BETWEEN 1 AND 100),
 api_key text NOT NULL UNIQUE CHECK(length(btrim(api_key)) BETWEEN 16 AND 512),
 is_active boolean NOT NULL DEFAULT true,
 cooldown_until timestamptz,
 lease_id uuid,
 leased_until timestamptz,
 last_used_at timestamptz,
 last_success_at timestamptz,
 last_outcome text CHECK(last_outcome IN ('success','rate_limited','invalid','unavailable','request_error')),
 failure_count integer NOT NULL DEFAULT 0 CHECK(failure_count>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE pawpal_private.ai_api_key ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON pawpal_private.ai_api_key FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SCHEMA pawpal_private TO service_role;
GRANT ALL ON pawpal_private.ai_api_key TO service_role;
CREATE OR REPLACE FUNCTION public.get_ai_key_pool_state() RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('configured',count(*)>0,'active_count',count(*) FILTER(WHERE is_active)) FROM pawpal_private.ai_api_key WHERE provider='gemini';
$$;
CREATE OR REPLACE FUNCTION public.claim_ai_api_key(p_exclude uuid[] DEFAULT '{}'::uuid[])
RETURNS TABLE(id uuid,api_key text,lease_id uuid) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE candidate uuid; lease uuid:=gen_random_uuid();
BEGIN
 IF p_exclude IS NULL OR cardinality(p_exclude)>20 THEN RAISE EXCEPTION 'invalid_key_claim' USING ERRCODE='22023'; END IF;
 SELECT k.id INTO candidate FROM pawpal_private.ai_api_key k WHERE k.provider='gemini' AND k.is_active AND NOT(k.id=ANY(p_exclude))
 AND (k.cooldown_until IS NULL OR k.cooldown_until<=clock_timestamp()) AND (k.leased_until IS NULL OR k.leased_until<=clock_timestamp())
 ORDER BY k.last_used_at NULLS FIRST,k.id FOR UPDATE SKIP LOCKED LIMIT 1;
 IF candidate IS NULL THEN RETURN; END IF;
 RETURN QUERY UPDATE pawpal_private.ai_api_key k SET lease_id=lease,leased_until=clock_timestamp()+interval '45 seconds',last_used_at=clock_timestamp() WHERE k.id=candidate RETURNING k.id,k.api_key,k.lease_id;
END $$;
CREATE OR REPLACE FUNCTION public.finish_ai_api_key(p_id uuid,p_lease uuid,p_outcome text,p_retry_seconds integer DEFAULT 60)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF p_outcome IS NULL OR p_outcome NOT IN ('success','rate_limited','invalid','unavailable','request_error') OR p_retry_seconds IS NULL OR p_retry_seconds NOT BETWEEN 1 AND 86400 THEN RAISE EXCEPTION 'invalid_key_outcome' USING ERRCODE='22023'; END IF;
 UPDATE pawpal_private.ai_api_key SET
  lease_id=NULL,leased_until=NULL,last_outcome=p_outcome,
  failure_count=CASE WHEN p_outcome='success' THEN 0 ELSE failure_count+1 END,
  last_success_at=CASE WHEN p_outcome='success' THEN clock_timestamp() ELSE last_success_at END,
  is_active=CASE WHEN p_outcome='invalid' THEN false ELSE is_active END,
  cooldown_until=CASE WHEN p_outcome IN ('rate_limited','unavailable') THEN clock_timestamp()+make_interval(secs=>p_retry_seconds) ELSE NULL END
 WHERE id=p_id AND lease_id=p_lease;
 IF NOT FOUND THEN RAISE EXCEPTION 'key_lease_expired' USING ERRCODE='PT409'; END IF;
END $$;
REVOKE ALL ON FUNCTION public.get_ai_key_pool_state(),public.claim_ai_api_key(uuid[]),public.finish_ai_api_key(uuid,uuid,text,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_ai_key_pool_state(),public.claim_ai_api_key(uuid[]),public.finish_ai_api_key(uuid,uuid,text,integer) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
