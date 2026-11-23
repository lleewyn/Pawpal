BEGIN;
SET LOCAL lock_timeout='5s';
-- Match the recipient permissions already used by get_admin_complaint_handlers (186).
-- The caller must still satisfy every management permission in the original RPC.
DO $$
DECLARE body text:=pg_get_functiondef('public.assign_admin_complaint(uuid,uuid,timestamptz,uuid,text)'::regprocedure);
 needle text:=$old$rp.permission_code='support_ticket.write'$old$;
 replacement text:=$new$rp.permission_code IN ('support_ticket.write','work.complaint.handle')$new$;
BEGIN
 IF strpos(body,replacement)>0 THEN RETURN; END IF;
 IF strpos(body,needle)=0 OR strpos(body,'complaint_handler_unavailable')=0 THEN RAISE EXCEPTION 'unexpected_complaint_assignment_definition'; END IF;
 EXECUTE replace(body,needle,replacement);
END $$;
NOTIFY pgrst,'reload schema';
COMMIT;
