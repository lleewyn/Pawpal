-- Follow-up to customer_auth_security.sql. Shared state for Vercel Functions.
BEGIN;
CREATE TABLE IF NOT EXISTS pawpal_private.auth_rate_limits (
    key text PRIMARY KEY,
    count integer NOT NULL,
    expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS pawpal_private.auth_challenges (
    id uuid PRIMARY KEY,
    phone text NOT NULL,
    purpose text NOT NULL CHECK (purpose IN ('register', 'reset', 'activate')),
    mode text NOT NULL CHECK (mode IN ('supabase', 'preview', 'console')),
    otp_hash text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'claimed', 'used', 'failed')),
    attempts integer NOT NULL DEFAULT 0,
    expires_at timestamptz NOT NULL,
    claim_id uuid,
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_challenges_phone_idx ON pawpal_private.auth_challenges(phone);
CREATE INDEX IF NOT EXISTS auth_challenges_expiry_idx ON pawpal_private.auth_challenges(expires_at);
CREATE INDEX IF NOT EXISTS auth_rate_limits_expiry_idx ON pawpal_private.auth_rate_limits(expires_at);
REVOKE ALL ON pawpal_private.auth_rate_limits, pawpal_private.auth_challenges FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.customer_auth_rate_limit(p_key text, p_max integer, p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE attempts integer;
BEGIN
    DELETE FROM pawpal_private.auth_rate_limits WHERE expires_at <= now();
    INSERT INTO pawpal_private.auth_rate_limits AS r(key, count, expires_at)
    VALUES (p_key, 1, now() + make_interval(secs => p_window_seconds))
    ON CONFLICT (key) DO UPDATE SET count = r.count + 1
    RETURNING count INTO attempts;
    RETURN attempts <= p_max;
END $$;

CREATE OR REPLACE FUNCTION public.customer_auth_issue_challenge(p_id uuid, p_phone text, p_purpose text, p_mode text, p_hash text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtextextended(p_phone, 1));
    DELETE FROM pawpal_private.auth_challenges WHERE expires_at <= now();
    UPDATE pawpal_private.auth_challenges SET status = 'used', claim_id = NULL WHERE phone = p_phone;
    INSERT INTO pawpal_private.auth_challenges(id, phone, purpose, mode, otp_hash, expires_at)
    VALUES (p_id, p_phone, p_purpose, p_mode, p_hash, now() + interval '5 minutes');
END $$;

CREATE OR REPLACE FUNCTION public.customer_auth_activate_challenge(p_id uuid, p_success boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    UPDATE pawpal_private.auth_challenges SET status = CASE WHEN p_success THEN 'active' ELSE 'failed' END
    WHERE id = p_id AND status = 'pending' AND expires_at > now();
    RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.customer_auth_claim_challenge(p_id uuid, p_mode text, p_hash text, p_claim uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE c pawpal_private.auth_challenges%ROWTYPE;
BEGIN
    SELECT * INTO c FROM pawpal_private.auth_challenges WHERE id = p_id FOR UPDATE;
    IF NOT FOUND OR c.status <> 'active' OR c.expires_at <= now() OR c.attempts >= 5 OR c.mode <> p_mode THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'expired');
    END IF;
    UPDATE pawpal_private.auth_challenges SET attempts = attempts + 1 WHERE id = p_id;
    IF c.mode <> 'supabase' AND (p_hash IS NULL OR c.otp_hash IS DISTINCT FROM p_hash) THEN
        RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
    END IF;
    UPDATE pawpal_private.auth_challenges SET status = 'claimed', claim_id = p_claim WHERE id = p_id;
    RETURN jsonb_build_object('ok', true, 'phone', c.phone, 'purpose', c.purpose);
END $$;

CREATE OR REPLACE FUNCTION public.customer_auth_finish_challenge(p_id uuid, p_claim uuid, p_verified boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    UPDATE pawpal_private.auth_challenges SET status = CASE WHEN p_verified THEN 'used' ELSE 'active' END, claim_id = NULL
    WHERE id = p_id AND status = 'claimed' AND claim_id = p_claim;
    RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.customer_auth_serverless_ready() RETURNS boolean
LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$ SELECT true $$;

REVOKE ALL ON FUNCTION public.customer_auth_rate_limit(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_auth_issue_challenge(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_auth_activate_challenge(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_auth_claim_challenge(uuid, text, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_auth_finish_challenge(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.customer_auth_serverless_ready() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.customer_auth_rate_limit(text, integer, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_auth_issue_challenge(uuid, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_auth_activate_challenge(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_auth_claim_challenge(uuid, text, text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_auth_finish_challenge(uuid, uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.customer_auth_serverless_ready() TO service_role;
COMMIT;
NOTIFY pgrst, 'reload schema';
