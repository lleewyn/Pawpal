BEGIN;
CREATE OR REPLACE FUNCTION public.admin_copilot_session_page(p_query text DEFAULT '', p_page integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = pg_catalog, public AS $$
DECLARE response jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT pawpal_private.has_permission('admin_copilot_history.read') THEN
        RAISE EXCEPTION 'copilot_history_forbidden' USING ERRCODE='42501';
    END IF;
    WITH owned AS MATERIALIZED (
        SELECT h.* FROM public.admin_copilot_history h JOIN public.staff s ON s.id=h.staff_id WHERE s.auth_user_id=auth.uid()
    ), titles AS (
        SELECT DISTINCT ON (session_id) session_id,coalesce(nullif(metadata->>'session_title',''),left(content,80)) AS title
        FROM owned ORDER BY session_id,created_at,id
    ), sessions AS (
        SELECT h.session_id AS id,t.title,count(*) AS message_count,max(h.created_at) AS updated
        FROM owned h JOIN titles t USING(session_id) GROUP BY h.session_id,t.title
    ), matching AS MATERIALIZED (
        SELECT * FROM sessions WHERE strpos(lower(title),lower(coalesce(p_query,'')))>0
    ), bounds AS (
        SELECT count(*) AS total,least(greatest(coalesce(p_page,1),1),greatest(1,ceil(count(*)/10.0)::integer)) AS page FROM matching
    ), records AS (
        SELECT * FROM matching ORDER BY updated DESC,id LIMIT 10 OFFSET (SELECT (page-1)*10 FROM bounds)
    ) SELECT jsonb_build_object('total',b.total,'page',b.page,'sessions',coalesce((
        SELECT jsonb_agg(to_jsonb(r) ORDER BY updated DESC,id) FROM records r),'[]'::jsonb)) INTO response FROM bounds b;
    RETURN response;
END $$;
REVOKE ALL ON FUNCTION public.admin_copilot_session_page(text,integer) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_copilot_session_page(text,integer) TO authenticated;
NOTIFY pgrst,'reload schema';
COMMIT;
