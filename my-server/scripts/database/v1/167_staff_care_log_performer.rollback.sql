BEGIN;
DO $$ DECLARE source text;
 addition text:=E' IF fn=''save_admin_service_care_log'' AND nullif(args->''p_details''->>''staff_id'','''')::uuid IS DISTINCT FROM actor THEN\n  RAISE EXCEPTION ''work_log_performer_mismatch'' USING ERRCODE=''42501''; END IF;\n';
BEGIN
 SELECT pg_get_functiondef(to_regprocedure('pawpal_private.work_guard_rpc(text,jsonb)')) INTO source;
 IF source IS NULL OR strpos(source,addition)=0 THEN RAISE EXCEPTION 'unexpected_work_guard_definition'; END IF;
 EXECUTE replace(source,addition,'');
END $$;
COMMIT;
